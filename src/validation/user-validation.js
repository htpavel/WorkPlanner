const UserValidation = {
    validateRegister(data) {
        const errors = [];
        if (!data.username || data.username.length < 3) errors.push("Uživatelské jméno musí mít aspoň 3 znaky.");
        if (!data.password || data.password.length < 6) errors.push("Heslo musí mít aspoň 6 znaků.");
        
        // Povolíme jen známé role, pokud není zadána, default bude CUSTOMER
        const validRoles = ["CUSTOMER", "DRIVER", "DISPATCHER"];
        if (data.role && !validRoles.includes(data.role)) {
            errors.push("Neplatná uživatelská role.");
        }

        return { isValid: errors.length === 0, errors };
    },

    validateLogin(data) {
        const errors = [];
        if (!data.username) errors.push("Uživatelské jméno je povinné.");
        if (!data.password) errors.push("Heslo je povinné.");
        return { isValid: errors.length === 0, errors };
    }
};

module.exports = UserValidation;