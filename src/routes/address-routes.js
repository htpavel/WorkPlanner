const express = require('express');
const router = express.Router();
const AddressDao = require('../dao/address-dao');

/**
 * GET /api/address/user/:userId - Načtení všech adres daného uživatele
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const addresses = await AddressDao.getByUserId(req.params.userId);
        res.json(addresses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 *  GET /api/address/:id - Načtení detailu jedné konkrétní adresy podle jejího ID
 */
router.get('/:id', async (req, res) => {
    try {
        const address = await AddressDao.getById(req.params.id);
        if (!address) {
            return res.status(404).json({ error: "Adresa neexistuje." });
        }
        res.json(address);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/address - Vytvoření nové adresy
 */
router.post('/', async (req, res) => {
    try {
        const { userId, label, address, lat, lng, isDefault } = req.body;
        if (!userId || !address || !lat || !lng) {
            return res.status(400).json({ error: "Chybí povinné údaje (userId, address, lat, lng)." });
        }

        const newAddress = await AddressDao.create({ userId, label, address, lat, lng, isDefault });
        res.status(201).json(newAddress);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/address/:id - Úprava adresy podle ID
 */
router.put('/:id', async (req, res) => {
    try {
        const updatedAddress = await AddressDao.update(req.params.id, req.body);
        if (!updatedAddress) {
            return res.status(404).json({ error: "Adresa s tímto ID neexistuje." });
        }
        res.json(updatedAddress);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/address/:id - Smazání adresy podle ID
 */
router.delete('/:id', async (req, res) => {
    try {
        const deletedId = await AddressDao.delete(req.params.id);
        if (!deletedId) {
            return res.status(404).json({ error: "Adresa neexistuje." });
        }
        res.json({ message: "Adresa byla úspěšně smazána.", id: deletedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;