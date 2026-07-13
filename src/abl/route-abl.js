const RouteDao = require('../dao/route-dao');

// Pomocná matematická funkce (přesunuta z hlavního serveru)
function getDistance(p1, p2) {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Interní funkce pro přepočet trasy (Greedy algoritmus)
function _recalculateRoute() {
    const config = RouteDao.getConfig();
    if (!config.isAutomatic) return;

    const stops = RouteDao.getStops();
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

    RouteDao.updateStops(sortedStops);
}

const RouteAbl = {
    getOverview() {
        const config = RouteDao.getConfig();
        const depot = RouteDao.getDepot();
        const stops = RouteDao.getStops();

        return {
            config,
            depot,
            stops: stops.sort((a, b) => a.sequenceNumber - b.sequenceNumber)
        };
    },

    createBooking(bookingData) {
        const config = RouteDao.getConfig();
        const stops = RouteDao.getStops();

        if (stops.length >= config.maxClients) {
            throw new Error("Kapacita na tento den je již plná!");
        }

        const newStop = {
            id: Date.now(),
            ...bookingData,
            sequenceNumber: stops.length + 1
        };

        RouteDao.addStop(newStop);
        _recalculateRoute();
        
        return newStop;
    },

    deleteBooking(id) {
        const wasDeleted = RouteDao.deleteStop(id);
        if (!wasDeleted) {
            throw new Error("Klient nenalezen.");
        }

        _recalculateRoute();
        return { message: "Klient odhlášen, trasa přepočítána." };
    },

    updateConfig(configData) {
        const updatedConfig = RouteDao.updateConfig(configData);
        if (updatedConfig.isAutomatic) {
            _recalculateRoute();
        }
        return updatedConfig;
    }
};

module.exports = RouteAbl;