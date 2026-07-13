const DEPO_COORDS = { lat: 49.9928, lng: 15.9926 }; // Hrochův Týnec

// Simulovaná databáze VÍCE tras (Kalendář)
let routes = [
    { 
        id: "r1", 
        date: "2026-07-14", 
        name: "Svoz směr Pardubice", 
        location: "Pardubicko", 
        isAutomatic: true,
        maxClients: 5,
        currentClients: 2
    },
    { 
        id: "r2", 
        date: "2026-07-14", 
        name: "Rozvoz Chrudim a okolí", 
        location: "Chrudimsko", 
        isAutomatic: true,
        maxClients: 3,
        currentClients: 0
    }
];

// Zastávky jsou nyní navázané na routeId
let currentStops = [
    { id: 1, routeId: "r1", name: "Jan Novák", address: "Pardubice", lat: 50.0343, lng: 15.7742, sequenceNumber: 1 },
    { id: 2, routeId: "r1", name: "Petr Svoboda", address: "Chrudim", lat: 49.9514, lng: 15.7956, sequenceNumber: 2 },
];

const RouteDao = {
    getDepot() {
        return DEPO_COORDS;
    },

    // Získat seznam všech tras (pro kalendář)
    getAllRoutes() {
        return routes;
    },

    getRouteById(id) {
        return routes.find(r => r.id === id);
    },

    // Aktualizace konkrétní trasy (např. její konfigurace nebo počtu klientů)
    updateRoute(id, updatedFields) {
        const routeIndex = routes.findIndex(r => r.id === id);
        if (routeIndex !== -1) {
            routes[routeIndex] = { ...routes[routeIndex], ...updatedFields };
            return routes[routeIndex];
        }
        return null;
    },

    // Získat zastávky pouze pro jednu konkrétní trasu
    getStopsByRouteId(routeId) {
        return currentStops.filter(stop => stop.routeId === routeId);
    },

    updateStopsForRoute(routeId, newStops) {
        // Vymažeme staré zastávky pro danou trasu a vložíme nové
        currentStops = currentStops.filter(stop => stop.routeId !== routeId);
        currentStops.push(...newStops);
        return newStops;
    },

    addStop(stop) {
        currentStops.push(stop);
        return stop;
    },

    deleteStop(id) {
        const stopToDelete = currentStops.find(stop => stop.id === id);
        if (!stopToDelete) return null;

        currentStops = currentStops.filter(stop => stop.id !== id);
        return stopToDelete; // Vracíme smazanou zastávku, abychom věděli její routeId
    }
};

module.exports = RouteDao;