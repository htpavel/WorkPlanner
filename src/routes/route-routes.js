const express = require('express');
const router = express.Router();
const RouteAbl = require('../abl/route-abl');
const { authenticateToken, authorizeRoles } = require('../middleware/auth-middleware');

/**
 * 🟢 GET /api/route/calendar
 */
router.get('/calendar', authenticateToken, async (req, res) => {
    try {
        const routes = await RouteAbl.getCalendar();
        res.json(routes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 🟢 GET /api/route/detail/:id
 */
router.get('/detail/:id', authenticateToken, async (req, res) => {
    try {
        const route = await RouteAbl.getRouteDetail(req.params.id);
        res.json(route);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

/**
 * 🟢 POST /api/route/booking
 */
router.post('/booking', authenticateToken, async (req, res) => {
    try {
        const result = await RouteAbl.createBooking(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * 🔒 PATCH /api/route/config/:id
 */
router.patch('/config/:id', authenticateToken, authorizeRoles('DISPATCHER'), async (req, res) => {
    try {
        const result = await RouteAbl.updateConfig(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * 🔒 DELETE /api/route/stop/:id
 */
router.delete('/stop/:id', authenticateToken, async (req, res) => {
    try {
        const result = await RouteAbl.deleteBooking(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;