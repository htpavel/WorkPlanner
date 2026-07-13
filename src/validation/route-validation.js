const RouteValidation = {
    validateBookingCreate(data) {
        const errors = [];

        if (!data) {
            return { isValid: false, errors: ["Nebyly zaslány žádné údaje."] };
        }

        if (!data.name || typeof data.name !== 'string') errors.push("Jméno klienta je povinné.");
        if (!data.address || typeof data.address !== 'string') errors.push("Adresa je povinná.");
        if (data.lat === undefined || typeof data.lat !== 'number') errors.push("Souřadnice lat musí být číslo.");
        if (data.lng === undefined || typeof data.lng !== 'number') errors.push("Souřadnice lng musí být číslo.");
        if (!data.routeId) errors.push("Identifikátor trasy (routeId) je povinný.");
        
        return { isValid: errors.length === 0, errors };
    },

    validateConfigUpdate(data) {
        const errors = [];
        
        if (data.isAutomatic !== undefined && typeof data.isAutomatic !== 'boolean') {
            errors.push("Parametr isAutomatic musí být boolean.");
        }
        
        if (data.maxClients !== undefined) {
            if (typeof data.maxClients !== 'number' || data.maxClients <= 0) {
                errors.push("Parametr maxClients musí být kladné číslo.");
            }
        }
        
        if (data.isAutomatic === undefined && data.maxClients === undefined && data.startTime === undefined) {
            errors.push("Musíš zaslat alespoň jeden konfigurační údaj k úpravě.");
        }

        return { isValid: errors.length === 0, errors };
    }
};

module.exports = RouteValidation;