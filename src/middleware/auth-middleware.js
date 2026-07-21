const jwt = require('jsonwebtoken');

// Načtení stejného secretu
const JWT_SECRET = process.env.JWT_SECRET || "fallback_super_tajny_klic_123456";

/**
 * Middleware pro ověření JWT Tokenu z hlavičky Authorization: Bearer <token>
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    // Hlavička má tvar "Bearer TOKEN_STRING"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Přístup odepřen. Chybí autorizační token." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Neplatný nebo vypršený token." });
        }
        // Uložíme dekódovaná data uživatele (id, username, role) přímo do požadavku
        req.user = user;
        next(); // Pustíme požadavek dále do routeru
    });
}

/**
 * Middleware pro kontrolu oprávnění na základě rolí
 * Použití: authorizeRoles('DISPATCHER', 'DRIVER')
 */
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Uživatel není autentizován." });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Nemáš dostatečná oprávnění. Vyžadována role: ${allowedRoles.join(' nebo ')}` 
            });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    authorizeRoles
};