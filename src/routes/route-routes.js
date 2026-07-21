const express = require('express');
const router = express.Router();
const RouteAbl = require('../abl/route-abl');
const { authenticateToken, authorizeRoles } = require('../middleware/auth-middleware');

// 🟢 GET /api/route/calendar - Přístupné všem přihlášeným (včetně GUEST)
router.get('/calendar', authenticateToken, async (req, res) => {
    try {
        const routes = await RouteAbl.getCalendar();
        res.json(routes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🟢 POST /api/route/booking - Přidání zastávky (přístupné pro CUSTOMER i DISPATCHER)
router.post('/booking', authenticateToken, async (req, res) => {
    try {
        const result = await RouteAbl.createBooking(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 🔒 PATCH /api/route/config/:id - Změna nastavení trasy (POUZE DISPATCHER!)
router.patch('/config/:id', authenticateToken, authorizeRoles('DISPATCHER'), async (req, res) => {
    try {
        const result = await RouteAbl.updateConfig(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;