const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ==========================================
// 🔌 NASTAVENÍ PŘIPOJENÍ K DATABÁZI
// ==========================================

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    try {
        const configPath = path.join(__dirname, '../../config.json');
        if (fs.existsSync(configPath)) {
            const configFile = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configFile);
            connectionString = config.databaseUrl;
            console.log("🔌 Připojeno k databázi pomocí konfigurace z config.json");
        }
    } catch (error) {
        console.error("Nepodařilo se načíst config.json:", error.message);
    }
} else {
    console.log("🚀 Připojeno k databázi pomocí systémové proměnné DATABASE_URL");
}

if (!connectionString) {
    console.error("❌ CHYBA: Nebyl nalezen žádný connection string pro databázi! Nastav DATABASE_URL v .env nebo vytvoř config.json.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// ==========================================
// 📦 IMPLEMENTACE DAO METOD
// ==========================================

const RouteDao = {
    _mapRoute(dbRow) {
        if (!dbRow) return null;
        return {
            id: dbRow.id,
            date: dbRow.date ? new Date(dbRow.date).toISOString().split('T')[0] : null,
            name: dbRow.name,
            location: dbRow.location,
            isAutomatic: dbRow.is_automatic,
            maxClients: dbRow.max_clients,
            currentClients: dbRow.current_clients,
            startTime: dbRow.start_time,
            endTime: dbRow.end_time,
            startCoords: { lat: dbRow.start_lat, lng: dbRow.start_lng },
            endCoords: { lat: dbRow.end_lat, lng: dbRow.end_lng },
            serviceDurationMins: dbRow.service_duration_mins,
            totalDistance_km: parseFloat(dbRow.total_distance_km || 0),
            totalDuration_mins: dbRow.total_duration_mins || 0
        };
    },

    _mapStop(dbRow) {
        if (!dbRow) return null;
        return {
            id: parseInt(dbRow.id),
            routeId: dbRow.route_id,
            name: dbRow.name,
            address: dbRow.address,
            lat: dbRow.lat,
            lng: dbRow.lng,
            sequenceNumber: dbRow.sequence_number,
            arrivalTime: dbRow.arrival_time
        };
    },

    async getDepot() {
        return { lat: 49.9928, lng: 15.9926 }; // Hrochův Týnec
    },

    async getAllRoutes() {
        const query = `
            SELECT id, date, name, location, is_automatic, max_clients, current_clients, start_time, end_time,
                   ST_Y(start_coords) as start_lat, ST_X(start_coords) as start_lng,
                   ST_Y(end_coords) as end_lat, ST_X(end_coords) as end_lng,
                   service_duration_mins, total_distance_km, total_duration_mins
            FROM routes
            ORDER BY date ASC;
        `;
        const { rows } = await pool.query(query);
        return rows.map(this._mapRoute);
    },

    async getRouteById(id) {
        const query = `
            SELECT id, date, name, location, is_automatic, max_clients, current_clients, start_time, end_time,
                   ST_Y(start_coords) as start_lat, ST_X(start_coords) as start_lng,
                   ST_Y(end_coords) as end_lat, ST_X(end_coords) as end_lng,
                   service_duration_mins, total_distance_km, total_duration_mins
            FROM routes
            WHERE id = $1;
        `;
        const { rows } = await pool.query(query, [id]);
        return this._mapRoute(rows[0]);
    },

    /**
     * 🆕 Uložení nové trasy do databáze (PostgreSQL + PostGIS)
     */
   async createRoute(route) {
        const query = `
            INSERT INTO routes (
                id, date, name, location, is_automatic, max_clients, current_clients, 
                start_time, end_time, start_coords, end_coords, 
                service_duration_mins, total_distance_km, total_duration_mins
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, 
                ST_SetSRID(ST_MakePoint($10, $11), 4326), 
                ST_SetSRID(ST_MakePoint($12, $13), 4326), 
                $14, $15, $16
            )
            RETURNING id, date, name, location, is_automatic, max_clients, current_clients, start_time, end_time,
                      ST_Y(start_coords) as start_lat, ST_X(start_coords) as start_lng,
                      ST_Y(end_coords) as end_lat, ST_X(end_coords) as end_lng,
                      service_duration_mins, total_distance_km, total_duration_mins;
        `;

        const values = [
            route.id,
            route.date,
            route.name,
            route.location || route.startName || route.name || 'Pardubický kraj', // 👈 Přidáno location s fallbackem
            route.isAutomatic !== undefined ? route.isAutomatic : true,
            route.maxClients || 5,
            route.currentClients || 0,
            route.startTime || '08:00',
            route.endTime || '16:00',
            route.startCoords ? route.startCoords.lng : 15.9926,
            route.startCoords ? route.startCoords.lat : 49.9928,
            route.endCoords ? route.endCoords.lng : 15.9926,
            route.endCoords ? route.endCoords.lat : 49.9928,
            route.serviceDurationMins || 10,
            route.totalDistance_km || 0,
            route.totalDuration_mins || 0
        ];

        const { rows } = await pool.query(query, values);
        return this._mapRoute(rows[0]);
    },

    async updateRoute(id, fields) {
        const setClauses = [];
        const values = [];
        let index = 1;

        const dbMapping = {
            isAutomatic: 'is_automatic',
            maxClients: 'max_clients',
            currentClients: 'current_clients',
            startTime: 'start_time',
            endTime: 'end_time',
            serviceDurationMins: 'service_duration_mins',
            totalDistance_km: 'total_distance_km',
            totalDuration_mins: 'total_duration_mins'
        };

        for (const [key, value] of Object.entries(fields)) {
            if (dbMapping[key] !== undefined) {
                setClauses.push(`${dbMapping[key]} = $${index}`);
                values.push(value);
                index++;
            }
        }

        if (setClauses.length === 0) return null;

        values.push(id);
        const query = `
            UPDATE routes 
            SET ${setClauses.join(', ')} 
            WHERE id = $${index}
            RETURNING *;
        `;

        const { rows } = await pool.query(query, values);
        return rows[0];
    },

    async getStopsByRouteId(routeId) {
        const query = `
            SELECT id, route_id, name, address, sequence_number, arrival_time,
                   ST_Y(coords) as lat, ST_X(coords) as lng
            FROM bookings
            WHERE route_id = $1
            ORDER BY sequence_number ASC;
        `;
        const { rows } = await pool.query(query, [routeId]);
        return rows.map(this._mapStop);
    },

    async updateStopsForRoute(routeId, newStops) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            await client.query('DELETE FROM bookings WHERE route_id = $1', [routeId]);
            
            for (const stop of newStops) {
                await client.query(`
                    INSERT INTO bookings (id, route_id, name, address, coords, sequence_number, arrival_time)
                    VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8)
                `, [stop.id, routeId, stop.name, stop.address, stop.lng, stop.lat, stop.sequenceNumber, stop.arrivalTime || '']);
            }
            
            await client.query('COMMIT');
            return newStops;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async addStop(stop) {
        const query = `
            INSERT INTO bookings (id, route_id, name, address, coords, sequence_number, arrival_time)
            VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8)
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [
            stop.id, stop.routeId, stop.name, stop.address, stop.lng, stop.lat, stop.sequenceNumber, stop.arrivalTime || ''
        ]);
        return rows[0];
    },

    async deleteStop(id) {
        const selectQuery = `SELECT id, route_id FROM bookings WHERE id = $1;`;
        const { rows: selectRows } = await pool.query(selectQuery, [id]);
        const stopToDelete = selectRows[0];

        if (!stopToDelete) return null;

        const deleteQuery = `DELETE FROM bookings WHERE id = $1;`;
        await pool.query(deleteQuery, [id]);

        return {
            id: parseInt(stopToDelete.id),
            routeId: stopToDelete.route_id
        };
    }
};

module.exports = RouteDao;