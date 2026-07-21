const { Pool } = require('pg');

let connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

const AddressDao = {
    // Pomocná metoda pro převedení DB dat do čitelného JS objektu
    _mapAddress(dbRow) {
        if (!dbRow) return null;
        return {
            id: dbRow.id,
            userId: dbRow.user_id,
            label: dbRow.label,
            address: dbRow.address,
            lat: parseFloat(dbRow.lat),
            lng: parseFloat(dbRow.lng),
            isDefault: dbRow.is_default
        };
    },

    // Načte všechny adresy jednoho uživatele
    async getByUserId(userId) {
        const query = `
            SELECT id, user_id, label, address, lat, lng, is_default 
            FROM user_addresses 
            WHERE user_id = $1 
            ORDER BY is_default DESC, id ASC;
        `;
        const { rows } = await pool.query(query, [userId]);
        return rows.map(row => this._mapAddress(row));
    },

    // Načte detail konkrétní adresy podle jejího ID
    async getById(addressId) {
        const query = `
            SELECT id, user_id, label, address, lat, lng, is_default 
            FROM user_addresses 
            WHERE id = $1;
        `;
        const { rows } = await pool.query(query, [addressId]);
        return this._mapAddress(rows[0]);
    },

    // Vytvoření nové adresy
    async create(addressData) {
        const query = `
            INSERT INTO user_addresses (user_id, label, address, lat, lng, is_default)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, user_id, label, address, lat, lng, is_default;
        `;
        const { rows } = await pool.query(query, [
            addressData.userId,
            addressData.label || 'Adresa',
            addressData.address,
            addressData.lat,
            addressData.lng,
            addressData.isDefault || false
        ]);
        return this._mapAddress(rows[0]);
    },

    // Úprava existující adresy
    async update(addressId, addressData) {
        const query = `
            UPDATE user_addresses
            SET label = COALESCE($1, label),
                address = COALESCE($2, address),
                lat = COALESCE($3, lat),
                lng = COALESCE($4, lng),
                is_default = COALESCE($5, is_default)
            WHERE id = $6
            RETURNING id, user_id, label, address, lat, lng, is_default;
        `;
        const { rows } = await pool.query(query, [
            addressData.label,
            addressData.address,
            addressData.lat,
            addressData.lng,
            addressData.isDefault,
            addressId
        ]);
        return this._mapAddress(rows[0]);
    },

    // Smazání adresy podle ID
    async delete(addressId) {
        const query = `DELETE FROM user_addresses WHERE id = $1 RETURNING id;`;
        const { rows } = await pool.query(query, [addressId]);
        return rows[0] ? rows[0].id : null;
    }
};

module.exports = AddressDao;