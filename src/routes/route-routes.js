const express = require('express');
const router = express.Router();
const RouteAbl = require('../abl/route-abl');
const RouteValidation = require('../validation/route-validation');
const UserDao = require('../dao/user-dao');

function authorize(allowedRoles = []) {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            if (allowedRoles.includes("GUEST")) {
                req.user = { id: "guest_anon", role: "GUEST", name: "Host" };
                return next();
            }
            return res.status(401).json({ error: "Přístup odepřen. Chybí token." });
        }

        const token = authHeader.split(' ')[1];

        if (token && token.startsWith('mock-jwt-token-for-u')) {
            const userId = token.replace('mock-jwt-token-for-', '');
            const user = UserDao.getById(userId);
            if (user) req.user = user;
        } else if (token && token.startsWith('mock-jwt-token-for-guest-')) {
            req.user = { id: "guest_anon", role: "GUEST", name: "Host" };
        }

        if (!req.user) {
            return res.status(401).json({ error: "Neplatný token." });
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: `Nedostatečná práva.` });
        }

        next();
    };
}

// Kalendář tras
router.get('/calendar', authorize(["DISPATCHER"]), (req, res) => {
    const result = RouteAbl.getCalendar();
    res.json(result);
});

// Detail trasy
router.get('/:id', authorize(["DISPATCHER", "DRIVER", "CUSTOMER"]), (req, res) => {
    try {
        const result = RouteAbl.getRouteDetail(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Vytvoření rezervace
router.post('/booking', authorize(["DISPATCHER", "CUSTOMER", "GUEST"]), async (req, res) => {
    const validation = RouteValidation.validateBookingCreate(req.body);
    if (!validation.isValid) return res.status(400).json({ errors: validation.errors });

    try {
        const result = await RouteAbl.createBooking(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Smazání rezervace
router.delete('/booking/:id', authorize(["DISPATCHER", "CUSTOMER"]), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await RouteAbl.deleteBooking(id);
        res.json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Změna konfigurace trasy
router.patch('/:id/config', authorize(["DISPATCHER"]), async (req, res) => {
    const validation = RouteValidation.validateConfigUpdate(req.body);
    if (!validation.isValid) return res.status(400).json({ errors: validation.errors });

    try {
        const result = await RouteAbl.updateConfig(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;