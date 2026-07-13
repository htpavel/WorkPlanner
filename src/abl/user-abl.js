const UserDao = require('../dao/user-dao');

const UserAbl = {
    register(userData) {
        const existing = UserDao.getByUsername(userData.username);
        if (existing) {
            throw new Error("Uživatelské jméno je již obsazené.");
        }

        const newUser = {
            username: userData.username,
            passwordHash: userData.password, // V produkci: bcrypt.hashSync(userData.password)
            role: userData.role || "CUSTOMER",
            name: userData.name || userData.username
        };

        const createdUser = UserDao.create(newUser);
        
        // Vrátíme data bez hesla
        return { id: createdUser.id, username: createdUser.username, role: createdUser.role, name: createdUser.name };
    },

    login(credentials) {
        const user = UserDao.getByUsername(credentials.username);
        if (!user || user.passwordHash !== credentials.password) {
            throw new Error("Nesprávné jméno nebo heslo.");
        }

        // V produkci by se zde vygeneroval a vrátil JWT Token
        return {
            message: "Přihlášení úspěšné",
            token: `mock-jwt-token-for-${user.id}`,
            user: { id: user.id, username: user.username, role: user.role, name: user.name }
        };
    },

    // Speciální metoda pro vytvoření hosta
    createGuestSession() {
        return {
            message: "Přihlášen jako host",
            token: `mock-jwt-token-for-guest-${Date.now()}`,
            user: { id: `guest_${Date.now()}`, username: "host", role: "GUEST", name: "Anonymní host" }
        };
    }
};

module.exports = UserAbl;