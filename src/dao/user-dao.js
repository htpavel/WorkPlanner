// Simulovaná databáze uživatelů
let users = [
    { id: "u1", username: "disp_tomas", passwordHash: "secret123", role: "DISPATCHER", name: "Tomáš Dispečer" },
    { id: "u2", username: "driver_jan", passwordHash: "secret123", role: "DRIVER", name: "Jan Řidič" },
    { id: "u3", username: "katka_zakaznik", passwordHash: "secret123", role: "CUSTOMER", name: "Kateřina Z." }
];

const UserDao = {
    getByUsername(username) {
        return users.find(u => u.username === username);
    },

    getById(id) {
        return users.find(u => u.id === id);
    },

    create(user) {
        const newUser = { id: `u_${Date.now()}`, ...user };
        users.push(newUser);
        return newUser;
    }
};

module.exports = UserDao;