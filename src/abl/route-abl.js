const RouteDao = require('../dao/route-dao');

function getDistance(p1, p2) {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Přepočet upraven na konkrétní routeId
function _recalculateRoute(routeId) {
    const route = RouteDao.getRouteById(routeId);
    if (!route || !route.isAutomatic) return;

    const stops = RouteDao.getStopsByRouteId(routeId);
    let unvisited = [...stops];
    let sortedStops = [];
    let currentPoint = RouteDao.getDepot();

    while (unvisited.length > 0) {
        let closestIndex = 0;
        let minDistance = getDistance(currentPoint, unvisited[0]);

        for (let i = 1; i < unvisited.length; i++) {
            let dist = getDistance(currentPoint, unvisited[i]);
            if (dist < minDistance) {
                minDistance = dist;
                closestIndex = i;
            }
        }

        let nextStop = unvisited.splice(closestIndex, 1)[0];
        currentPoint = { lat: nextStop.lat, lng: nextStop.lng };
        sortedStops.push(nextStop);
    }

    sortedStops.forEach((stop, index) => {
        stop.sequenceNumber = index + 1;
    });

    RouteDao.updateStopsForRoute(routeId, sortedStops);
}

const RouteAbl = {
    // Získání seznamu VŠECH tras pro kalendář
    getCalendar() {
        return RouteDao.getAllRoutes();
    },

    // Detail jedné konkrétní trasy i s jejími zastávkami
    getRouteDetail(routeId) {
        const route = RouteDao.getRouteById(routeId);
        if (!route) throw new Error("Trasa nenalezena.");

        const stops = RouteDao.getStopsByRouteId(routeId);
        return {
            ...route,
            depot: RouteDao.getDepot(),
            stops: stops.sort((a, b) => a.sequenceNumber - b.sequenceNumber)
        };
    },

    createBooking(bookingData) {
        const routeId = bookingData.routeId;
        const route = RouteDao.getRouteById(routeId);
        
        if (!route) throw new Error("Cílová trasa neexistuje.");

        if (route.currentClients >= route.maxClients) {
            throw new Error("Kapacita této trasy na daný den je již plná!");
        }

        const newStop = {
            id: Date.now(),
            routeId: routeId,
            name: bookingData.name,
            address: bookingData.address,
            lat: bookingData.lat,
            lng: bookingData.lng,
            sequenceNumber: route.currentClients + 1
        };

        RouteDao.addStop(newStop);
        
        // Aktualizujeme stav naplnění v trase
        RouteDao.updateRoute(routeId, { currentClients: route.currentClients + 1 });
        
        _recalculateRoute(routeId);
        return newStop;
    },

    deleteBooking(id) {
        const deletedStop = RouteDao.deleteStop(id);
        if (!deletedStop) throw new Error("Klient nenalezen.");

        const routeId = deletedStop.routeId;
        const route = RouteDao.getRouteById(routeId);
        
        if (route) {
            RouteDao.updateRoute(routeId, { currentClients: Math.max(0, route.currentClients - 1) });
            _recalculateRoute(routeId);
        }

        return { message: "Klient odhlášen, trasa přepočítána." };
    },

    updateConfig(routeId, configData) {
        const updatedRoute = RouteDao.updateRoute(routeId, configData);
        if (!updatedRoute) throw new Error("Trasa nenalezena.");

        if (updatedRoute.isAutomatic) {
            _recalculateRoute(routeId);
        }
        return updatedRoute;
    }
};

module.exports = RouteAbl;