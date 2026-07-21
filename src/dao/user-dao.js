const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Načtení connection stringu (stejně jako v route-dao)
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    try {
        const configPath = path.join(__dirname, '../../config.json');
        if (fs.existsSync(configPath)) {
            const configFile = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configFile);
            connectionString = config.databaseUrl;
        }
    } catch (error) {
        console.error("Nepodařilo se načíst config.json v user-dao:", error.message);
    }
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

const UserDao = {
    // Pomocná metoda pro mapování z DB do JS objektu
    _mapUser(dbRow) {
        if (!dbRow) return null;
        return {
            id: dbRow.id,
            username: dbRow.username,
            password: dbRow.password, // V reálné aplikaci by zde byl hash hesla
            role: dbRow.role,
            name: dbRow.name
        };
    },

    // Najde uživatele podle ID (asynchronně!)
    async getById(id) {
        const query = 'SELECT id, username, password, role, name FROM users WHERE id = $1;';
        const { rows } = await pool.query(query, [id]);
        return this._mapUser(rows[0]);
    },

    // Pomocná metoda pro budoucí přihlašování
    async getByUsername(username) {
        const query = 'SELECT id, username, password, role, name FROM users WHERE username = $1;';
        const { rows } = await pool.query(query, [username]);
        return this._mapUser(rows[0]);
    },
    async create(user) {
        const query = `
            INSERT INTO users (id, username, password, role, name)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, password, role, name;
        `;
        // Vytvoříme unikátní ID typu 'u4', 'u5' atd. na základě času, pokud ID nebylo dodáno
        const userId = user.id || 'u_' + Date.now();

        const { rows } = await pool.query(query, [
            userId,
            user.username,
            user.password, // V produkci doporučuji hashovat pomocí bcrypt
            user.role,
            user.name
        ]);

        return this._mapUser(rows[0]);
    },
    async update(userId, userData) {
        const query = `
            UPDATE users
            SET name = COALESCE($1, name),
                role = COALESCE($2, role),
                password = COALESCE($3, password)
            WHERE id = $4
            RETURNING id, username, role, name;
        `;
        const { rows } = await pool.query(query, [
            userData.name,
            userData.role,
            userData.password,
            userId
        ]);
        return rows[0] || null;
    },

    /**
     * Načtení uživatele podle ID
     */
    async getById(userId) {
        const query = `SELECT id, username, role, name FROM users WHERE id = $1;`;
        const { rows } = await pool.query(query, [userId]);
        return rows[0] || null;
    },
    
    async delete(userId) {
        const query = `DELETE FROM users WHERE id = $1 RETURNING id;`;
        const { rows } = await pool.query(query, [userId]);
        return rows[0] ? rows[0].id : null;
    }
};

module.exports = UserDao;