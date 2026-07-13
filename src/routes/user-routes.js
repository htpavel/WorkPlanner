const express = require('express');
const router = express.Router();
const UserAbl = require('../abl/user-abl');
const UserValidation = require('../validation/user-validation');

// Registrace uživatele
router.post('/register', (req, res) => {
    const validation = UserValidation.validateRegister(req.body);
    if (!validation.isValid) return res.status(400).json({ errors: validation.errors });

    try {
        const result = UserAbl.register(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Přihlášení uživatele
router.post('/login', (req, res) => {
    const validation = UserValidation.validateLogin(req.body);
    if (!validation.isValid) return res.status(400).json({ errors: validation.errors });

    try {
        const result = UserAbl.login(req.body);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// Přihlášení hosta
router.post('/guest', (req, res) => {
    const result = UserAbl.createGuestSession();
    res.json(result);
});

module.exports = router;