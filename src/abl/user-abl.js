const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const UserDao = require('../dao/user-dao');

// --- Načtení nastavení z .env ---
let JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_GUEST_EXPIRES_IN = process.env.JWT_GUEST_EXPIRES_IN || '2h';

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

if (!JWT_SECRET) {
    JWT_SECRET = "fallback_super_tajny_klic_123456";
}

const UserAbl = {
    /**
     * Registrace nového uživatele (s zašifrovaným heslem)
     */
    async register(userData) {
        const { username, password, role, name } = userData;

        if (!password || password.length < 4) {
            throw new Error("Heslo musí mít alespoň 4 znaky.");
        }

        const existingUser = await UserDao.getByUsername(username);
        if (existingUser) {
            throw new Error("Uživatelské jméno je již obsazené.");
        }

        // 🔒 Zašifrování hesla pomocí bcryptjs (10 solících kol)
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await UserDao.create({
            username,
            password: hashedPassword, 
            role,
            name
        });

        // Vracíme uživatele bez hesla
        return {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role,
            name: newUser.name
        };
    },

    /**
     * Přihlášení uživatele (porovnání hashů)
     */
    async login(loginData) {
        const { username, password } = loginData;

        const user = await UserDao.getByUsername(username);
        if (!user) {
            throw new Error("Neplatné uživatelské jméno nebo heslo.");
        }

        // 🔒 Bezpečné porovnání zadaného hesla s uloženým hashem v databázi
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
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
            { expiresIn: JWT_EXPIRES_IN }
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
     * Aktualizace údajů uživatele (pokud se mění heslo, zahašuje se)
     */
    async update(userId, updateData) {
        const existingUser = await UserDao.getById(userId);
        if (!existingUser) {
            throw new Error("Uživatel s tímto ID neexistuje.");
        }

        const dataToUpdate = { ...updateData };

        // 🔒 Pokud uživatel posílá nové heslo, zašifrujeme ho
        if (dataToUpdate.password) {
            if (dataToUpdate.password.length < 4) {
                throw new Error("Nové heslo musí mít alespoň 4 znaky.");
            }
            dataToUpdate.password = await bcrypt.hash(dataToUpdate.password, 10);
        }

        const updatedUser = await UserDao.update(userId, dataToUpdate);
        return updatedUser;
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
            { expiresIn: JWT_GUEST_EXPIRES_IN }
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
    },

    async delete(userId) {
        const existingUser = await UserDao.getById(userId);
        if (!existingUser) {
            throw new Error("Uživatel s tímto ID neexistuje.");
        }

        const deletedId = await UserDao.delete(userId);
        return { message: "Uživatel byl úspěšně smazán.", id: deletedId };
    }
};

module.exports = UserAbl;