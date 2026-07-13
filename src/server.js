const express = require('express');
const RouteAbl = require('./abl/route-abl');
const RouteValidation = require('./validation/route-validation');

const app = express();
app.use(express.json());
const PORT = 3000;

// GET - Přehled trasy
app.get('/api/route', (req, res) => {
    try {
        const result = RouteAbl.getOverview();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST - Nová objednávka / přihlášení klienta
app.post('/api/booking', (req, res) => {
    // 1. Validace dat
    const validation = RouteValidation.validateBookingCreate(req.body);
    if (!validation.isValid) {
        return res.status(400).json({ errors: validation.errors });
    }

    // 2. Business logika
    try {
        const result = RouteAbl.createBooking(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE - Odhlášení klienta
app.delete('/api/booking/:id', (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = RouteAbl.deleteBooking(id);
        res.json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// PATCH - Změna konfigurace (Automatika vs Manuál)
app.patch('/api/route/config', (req, res) => {
    const validation = RouteValidation.validateConfigUpdate(req.body);
    if (!validation.isValid) {
        return res.status(400).json({ errors: validation.errors });
    }

    try {
        const result = RouteAbl.updateConfig(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Čistý ABL/DAO backend běží na http://localhost:${PORT}`);
});