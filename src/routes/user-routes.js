const express = require('express');
const router = express.Router();
const UserAbl = require('../abl/user-abl');
const { authenticateToken, authorizeRoles } = require('../middleware/auth-middleware');

/**
 * POST /api/user/register
 * Registrace nového uživatele (heslo se v ABL automaticky zašifruje pomocí bcrypt)
 */
router.post('/register', async (req, res) => {
    try {
        const newUser = await UserAbl.register(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/user/login
 * Přihlášení uživatele (porovná bcrypt hash a vrátí JWT token)
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
 * Vytvoření dočasného sezení pro anonymního hosta (role GUEST)
 */
router.post('/anonym', async (req, res) => {
    try {
        const result = await UserAbl.createGuestSession();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/user/:id
 * Úprava profilu uživatele (jméno, role, heslo)
 * Přístupné pro přihlášeného uživatele (nebo dispečera)
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const updatedUser = await UserAbl.update(req.params.id, req.body);
        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/user/:id
 * Smazání uživatele z databáze podle jeho ID
 * Přístupné pouze pro roli DISPATCHER
 */
router.delete('/:id', authenticateToken, authorizeRoles('DISPATCHER'), async (req, res) => {
    try {
        const result = await UserAbl.delete(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;