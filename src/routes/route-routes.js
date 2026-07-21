const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const RouteAbl = require('../abl/route-abl');
const RouteValidation = require('../validation/route-validation');
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
        console.error("Nepodařilo se načíst config.json v route-routes:", error.message);
    }
}

// Úplný fallback pro případ, že klíč není nikde definován
if (!JWT_SECRET) {
    JWT_SECRET = "fallback_super_tajny_klic_123456";
}

/**
 * Middleware pro autorizaci uživatelů pomocí reálných JWT tokenů
 */
function authorize(allowedRoles = []) {
    return async (req, res, next) => {
        const authHeader = req.headers.authorization;
        
        // 1. Pokud chybí autorizační hlavička
        if (!authHeader) {
            if (allowedRoles.includes("GUEST")) {
                req.user = { id: "guest_anon", role: "GUEST", name: "Host" };
                return next();
            }
            return res.status(401).json({ error: "Přístup odepřen. Chybí token." });
        }

        const token = authHeader.split(' ')[1];

        try {
            // 2. Ověření platnosti a podpisu reálného JWT tokenu
            const decoded = jwt.verify(token, JWT_SECRET);
            
            if (!decoded || !decoded.id) {
                return res.status(401).json({ error: "Neplatný formát tokenu." });
            }

            // 3. Načtení aktuálního stavu uživatele z PostgreSQL databáze
            const user = await UserDao.getById(decoded.id);
            if (user) {
                req.user = user;
            } else {
                return res.status(401).json({ error: "Uživatel z tokenu již neexistuje." });
            }
        } catch (err) {
            // Jakákoliv chyba validace podpisu nebo expirace ihled končí chybou 401
            return res.status(401).json({ error: "Neplatný nebo expirovaný token." });
        }

        // 4. Kontrola oprávnění (rolí)
        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Nedostatečná práva." });
        }

        next();
    };
}

// 📅 Kalendář všech tras (přístupný pouze pro DISPATCHER)
router.get('/calendar', authorize(["DISPATCHER"]), async (req, res) => {
    try {
        const result = await RouteAbl.getCalendar();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔍 Detail jedné konkrétní trasy (DISPATCHER, DRIVER, CUSTOMER)
router.get('/:id', authorize(["DISPATCHER", "DRIVER", "CUSTOMER"]), async (req, res) => {
    try {
        const result = await RouteAbl.getRouteDetail(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// 📝 Vytvoření rezervace (přidání klienta na trasu)
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

// ❌ Smazání rezervace (odhlášení klienta a přepočet trasy)
router.delete('/booking/:id', authorize(["DISPATCHER", "CUSTOMER"]), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await RouteAbl.deleteBooking(id);
        res.json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// ⚙️ Změna konfigurace trasy (kapacita, režim apod.)
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