const express = require('express');
const router = express.Router();
const UserAbl = require('../abl/user-abl');

/**
 * POST /api/user/register
 * Registrace nového uživatele
 */
router.post('/register', async (req, res) => {
    try {
        const result = await UserAbl.register(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/user/login
 * Přihlášení registrovaného uživatele
 */
router.post('/login', async (req, res) => {
    try {
        const result = await UserAbl.login(req.body);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

/**
 * POST /api/user/anonym
 * Přihlášení jako anonymní host (vygeneruje platný JWT s rolí GUEST)
 */
router.post('/anonym', async (req, res) => {
    try {
        const result = await UserAbl.createGuestSession();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;