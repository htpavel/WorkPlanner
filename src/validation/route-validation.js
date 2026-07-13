const RouteValidation = {
    validateBookingCreate(data) {
        const errors = [];

        // 🛡️ Pojistka: Pokud klient neposlal vůbec žádná data (req.body je undefined)
        if (!data) {
            return { isValid: false, errors: ["Nebyly zaslány žádné údaje."] };
        }

        if (!data.name || typeof data.name !== 'string') errors.push("Jméno klienta je povinné a musí být text.");
        if (!data.address || typeof data.address !== 'string') errors.push("Adresa je povinná.");
        if (data.lat === undefined || typeof data.lat !== 'number') errors.push("Zeměpisná šířka (lat) musí být číslo.");
        if (data.lng === undefined || typeof data.lng !== 'number') errors.push("Zeměpisná délka (lng) musí být číslo.");
        if (!data.routeId) errors.push("Identifikátor trasy (routeId) je povinný.");
        
        return { isValid: errors.length === 0, errors };
    },

    validateConfigUpdate(data) {
        const errors = [];
        if (data.isAutomatic === undefined || typeof data.isAutomatic !== 'boolean') {
            errors.push("Parametr isAutomatic musí být boolean (true/false).");
        }
        return { isValid: errors.length === 0, errors };
    }
};

module.exports = RouteValidation;