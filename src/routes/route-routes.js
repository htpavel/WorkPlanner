const RouteDao = require('../dao/route-dao');
const AddressDao = require('../dao/address-dao');

const RouteAbl = {
    /**
     * Načtení kalendáře/seznamu všech tras
     */
    async getCalendar() {
        const routes = await RouteDao.getAll();
        return routes;
    },

    /**
     * Načtení detailu konkrétní trasy podle ID
     */
    async getDetail(routeId) {
        const route = await RouteDao.getById(routeId);
        if (!route) {
            return null;
        }
        return route;
    },

    /**
     * Přidání nové rezervace / zastávky na trasu
     */
    async createBooking(bookingData) {
        const { routeId, name, addressId, address, lat, lng } = bookingData;

        if (!routeId) {
            throw new Error("Chybí povinné pole: routeId.");
        }

        let targetAddress = address;
        let targetLat = lat;
        let targetLng = lng;

        // Pokud je předáno addressId, načteme GPS a adresu z DB
        if (addressId) {
            const dbAddress = await AddressDao.getById(addressId);
            if (!dbAddress) {
                throw new Error(`Adresa s ID ${addressId} nebyla nalezena.`);
            }
            targetAddress = dbAddress.address;
            targetLat = dbAddress.lat;
            targetLng = dbAddress.lng;
        }

        if (!targetAddress || targetLat == null || targetLng == null) {
            throw new Error("Je nutné zadat platné addressId nebo kompletní adresu s GPS (address, lat, lng).");
        }

        const newStop = await RouteDao.addStop({
            routeId,
            name: name || 'Zákazník',
            address: targetAddress,
            lat: parseFloat(targetLat),
            lng: parseFloat(targetLng),
            status: 'PENDING'
        });

        return newStop;
    },

    /**
     * Změna konfigurace trasy (kapacita, čas okna atd.)
     */
    async updateConfig(routeId, configData) {
        const existingRoute = await RouteDao.getById(routeId);
        if (!existingRoute) {
            throw new Error("Trasa s tímto ID neexistuje.");
        }

        const updatedRoute = await RouteDao.updateConfig(routeId, configData);
        return updatedRoute;
    },

    /**
     * Změna stavu konkrétní zastávky (např. DELIVERED, CANCELLED)
     */
    async updateStopStatus(stopId, status) {
        if (!status) {
            throw new Error("Chybí nový status zastávky.");
        }

        const updatedStop = await RouteDao.updateStopStatus(stopId, status);
        if (!updatedStop) {
            throw new Error("Zastávka s tímto ID nebyla nalezena.");
        }

        return updatedStop;
    },

    /**
     * Zrušení / smazání zastávky
     */
    async cancelStop(stopId) {
        const deletedId = await RouteDao.deleteStop(stopId);
        if (!deletedId) {
            throw new Error("Zastávka s tímto ID nebyla nalezena.");
        }

        return { message: "Zastávka byla úspěšně zrušena.", id: deletedId };
    }
};

module.exports = RouteAbl;