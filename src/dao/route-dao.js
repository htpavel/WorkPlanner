// Simulovaná databáze tras (Kalendář)
let routes = [
    { 
        id: "r1", 
        date: "2026-07-14", 
        name: "Svoz směr Pardubice", 
        location: "Pardubicko", 
        isAutomatic: true,
        maxClients: 5,
        currentClients: 2,
        startTime: "08:00", 
        endTime: "08:00",
        startCoords: { lat: 49.9928, lng: 15.9926 }, // Hrochův Týnec
        endCoords: { lat: 50.0343, lng: 15.7742 },   // Pardubice
        serviceDurationMins: 20,
        totalDistance_km: 0,
        totalDuration_mins: 0
    },
    { 
        id: "r2", 
        date: "2026-07-14", 
        name: "Rozvoz Chrudim a okolí", 
        location: "Chrudimsko", 
        isAutomatic: true,
        maxClients: 3,
        currentClients: 0,
        startTime: "07:30", 
        endTime: "07:30",
        startCoords: { lat: 49.9514, lng: 15.7956 }, // Chrudim
        endCoords: { lat: 49.9514, lng: 15.7956 },   // Chrudim
        serviceDurationMins: 15,
        totalDistance_km: 0,
        totalDuration_mins: 0
    }
];

// Zastávky propojené pomocí routeId
let currentStops = [
    { id: 1, routeId: "r1", name: "Jan Novák", address: "Pardubice", lat: 50.0343, lng: 15.7742, sequenceNumber: 1, arrivalTime: "" },
    { id: 2, routeId: "r1", name: "Petr Svoboda", address: "Chrudim", lat: 49.9514, lng: 15.7956, sequenceNumber: 2, arrivalTime: "" },
];

const RouteDao = {
    getDepot() {
        return { lat: 49.9928, lng: 15.9926 };
    },

    getAllRoutes() {
        return routes;
    },

    getRouteById(id) {
        return routes.find(r => r.id === id);
    },

    updateRoute(id, updatedFields) {
        const routeIndex = routes.findIndex(r => r.id === id);
        if (routeIndex !== -1) {
            routes[routeIndex] = { ...routes[routeIndex], ...updatedFields };
            return routes[routeIndex];
        }
        return null;
    },

    getStopsByRouteId(routeId) {
        return currentStops.filter(stop => stop.routeId === routeId);
    },

    updateStopsForRoute(routeId, newStops) {
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
        return stopToDelete;
    }
};

module.exports = RouteDao;