const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const UserDao = require('../dao/user-dao');

// --- Načtení JWT_SECRET z .env nebo z config.json ---
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    try {
        const configPath = path.join(__dirname, '../../config.json');
        if (fs.existsSync(configPath)) {
            const configFile = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configFile);
            JWT_SECRET = config.jwtSecret;
        }
    } catch (error) {
        console.error("Nepodařilo se načíst config.json v user-abl:", error.message);
    }
}

// Úplný fallback pro lokální vývoj
if (!JWT_SECRET) {
    JWT_SECRET = "fallback_super_tajny_klic_123456";
}

const UserAbl = {
    /**
     * Registrace nového uživatele
     */
    async register(userData) {
        const { username, password, role, name } = userData;

        const existingUser = await UserDao.getByUsername(username);
        if (existingUser) {
            throw new Error("Uživatelské jméno je již obsazené.");
        }

        const newUser = await UserDao.create({
            username,
            password, 
            role,
            name
        });

        return newUser;
    },

    /**
     * Přihlášení uživatele
     */
    async login(loginData) {
        const { username, password } = loginData;

        const user = await UserDao.getByUsername(username);
        if (!user) {
            throw new Error("Neplatné uživatelské jméno nebo heslo.");
        }

        if (user.password !== password) {
            throw new Error("Neplatné uživatelské jméno nebo heslo.");
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                name: user.name 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        return {
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name
            },
            token: token
        };
    },

    /**
     * Vytvoření sezení pro anonymního hosta
     */
    async createGuestSession() {
        const token = jwt.sign(
            { 
                id: "guest_anon", 
                username: "guest_" + Date.now(), 
                role: "GUEST", 
                name: "Anonymní host" 
            }, 
            JWT_SECRET, 
            { expiresIn: '2h' }
        );

        return {
            user: {
                id: "guest_anon",
                username: "guest",
                role: "GUEST",
                name: "Host"
            },
            token: token
        };
    }
};

module.exports = UserAbl;