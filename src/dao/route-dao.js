// Simulované datové úložiště v paměti
const DEPO_COORDS = { lat: 49.9928, lng: 15.9926 };

let routeConfig = {
    isAutomatic: true,
    maxClients: 5,
};

let currentStops = [
    { id: 1, name: "Jan Novák", address: "Pardubice", lat: 50.0343, lng: 15.7742, sequenceNumber: 1 },
    { id: 2, name: "Petr Svoboda", address: "Chrudim", lat: 49.9514, lng: 15.7956, sequenceNumber: 2 },
];

const RouteDao = {
    getDepot() {
        return DEPO_COORDS;
    },

    getConfig() {
        return routeConfig;
    },

    updateConfig(newConfig) {
        routeConfig = { ...routeConfig, ...newConfig };
        return routeConfig;
    },

    getStops() {
        return currentStops;
    },

    updateStops(newStops) {
        currentStops = newStops;
        return currentStops;
    },

    addStop(stop) {
        currentStops.push(stop);
        return stop;
    },

    deleteStop(id) {
        const initialLength = currentStops.length;
        currentStops = currentStops.filter(stop => stop.id !== id);
        return currentStops.length !== initialLength; // vrací true, pokud byl smazán
    }
};

module.exports = RouteDao;