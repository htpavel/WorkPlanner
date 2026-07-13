const RouteValidation = {
    validateBookingCreate(data) {
        const errors = [];
        if (!data.name || typeof data.name !== 'string') errors.push("Jméno klienta je povinné a musí být text.");
        if (!data.address || typeof data.address !== 'string') errors.push("Adresa je povinná.");
        if (data.lat === undefined || typeof data.lat !== 'number') errors.push("Zeměpisná šířka (lat) musí být číslo.");
        if (data.lng === undefined || typeof data.lng !== 'number') errors.push("Zeměpisná délka (lng) must být číslo.");
        
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