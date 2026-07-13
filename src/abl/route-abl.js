const RouteDao = require('../dao/route-dao');

// --- Pomocné funkce pro práci s časem ---
function timeToMins(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function minsToTime(totalMins) {
    const hours = Math.floor(totalMins / 60) % 24;
    const minutes = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Nouzový matematický výpočet vzdušnou čarou, pokud by OSRM selhalo
function getDistanceFallback(p1, p2) {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Pomocný asynchronní fetch pro manuální režim (spojnice bodů A -> B)
async function getRealRouteSpecs(p1, p2) {
    const url = `http://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=false`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("OSRM API offline.");
        const data = await response.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            return {
                distanceKm: data.routes[0].distance / 1000,
                durationMins: Math.round(data.routes[0].duration / 60)
            };
        }
    } catch (e) {
        console.error("OSRM Route Error, fallback...", e);
    }
    const dist = getDistanceFallback(p1, p2);
    return { distanceKm: dist, durationMins: Math.round((dist / 50) * 60) };
}

// --- HLAVNÍ VÝPOČET TRASY S OPTIMALIZACÍ A SLOUČENÍM ADRES ---
async function _recalculateRoute(routeId) {
    const route = RouteDao.getRouteById(routeId);
    if (!route) return;

    const stops = RouteDao.getStopsByRouteId(routeId);
    if (stops.length === 0) {
        RouteDao.updateRoute(routeId, { totalDistance_km: 0, totalDuration_mins: 0, endTime: route.startTime });
        return;
    }

    // ==========================================
    // 🔍 1. KROK: Sloučení klientů se stejnými GPS do fyzických zastávek
    // ==========================================
    const aggregatedStopsMap = {};
    
    stops.forEach(client => {
        // Vytvoříme unikátní klíč na základě GPS zaokrouhlených na 5 desetinných míst
        const geoKey = `${client.lat.toFixed(5)}_${client.lng.toFixed(5)}`;
        
        if (!aggregatedStopsMap[geoKey]) {
            aggregatedStopsMap[geoKey] = {
                lat: client.lat,
                lng: client.lng,
                address: client.address,
                clients: [], // Seznam klientů na této adrese
                serviceDurationMins: 0, // Celkový servisní čas (bude se sčítat)
                arrivalTime: "",
                sequenceNumber: 0
            };
        }
        
        // Přidáme klienta do této zastávky
        aggregatedStopsMap[geoKey].clients.push({
            id: client.id,
            name: client.name
        });
        
        // ⏳ Přičteme servisní čas za každého klienta na této adrese
        aggregatedStopsMap[geoKey].serviceDurationMins += route.serviceDurationMins;
    });

    // Převedeme mapu zpět na pole unikátních fyzických zastávek
    let physicalStops = Object.values(aggregatedStopsMap);

    let totalDistance = 0;
    let currentTimeMins = timeToMins(route.startTime); 
    const startMins = currentTimeMins;

    // ==========================================
    // 🗺️ 2. KROK: Výpočet trasy a časů
    // ==========================================
    if (route.isAutomatic) {
        console.log(`OSRM /trip optimalizace pro ${physicalStops.length} unikátních zastávek (Trasa: ${routeId})`);

        // Body pro OSRM: Start -> Unikátní zastávky -> Cíl
        const points = [route.startCoords, ...physicalStops, route.endCoords];
        const coordsString = points.map(p => `${p.lng},${p.lat}`).join(';');
        const url = `http://router.project-osrm.org/trip/v1/driving/${coordsString}?source=first&destination=last&overview=false`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("OSRM Trip API nedostupné.");
            const data = await response.json();

            if (data.code === 'Ok' && data.trips && data.trips.length > 0) {
                const trip = data.trips[0];
                const waypoints = data.waypoints;

                let orderedStops = [];

                for (let i = 1; i < waypoints.length - 1; i++) {
                    const waypoint = waypoints[i];
                    const originalStopIndex = waypoint.waypoint_index - 1;
                    const stop = physicalStops[originalStopIndex];

                    const segmentDuration = Math.round(trip.legs[i - 1].duration / 60);
                    currentTimeMins += segmentDuration;

                    stop.arrivalTime = minsToTime(currentTimeMins);
                    stop.sequenceNumber = i;

                    // 🕒 Kurýr stráví na místě čas podle POČTU klientů na této adrese
                    currentTimeMins += stop.serviceDurationMins;
                    
                    orderedStops.push(stop);
                }

                // Cesta do finálního cíle
                const finalLegDuration = Math.round(trip.legs[trip.legs.length - 1].duration / 60);
                currentTimeMins += finalLegDuration;

                // ==========================================
                // 💾 3. KROK: Rozepsání výsledků zpět jednotlivým klientům do DAO
                // ==========================================
                const finalClientStops = [];
                orderedStops.forEach(pStop => {
                    pStop.clients.forEach(clientInfo => {
                        const originalClient = stops.find(c => c.id === clientInfo.id);
                        if (originalClient) {
                            originalClient.sequenceNumber = pStop.sequenceNumber;
                            originalClient.arrivalTime = pStop.arrivalTime;
                            // Každý klient na této zastávce vidí celkový čas zdržení na adrese
                            originalClient.serviceDurationMins = pStop.serviceDurationMins; 
                            originalClient.clientsOnStopCount = pStop.clients.length;
                            finalClientStops.push(originalClient);
                        }
                    });
                });

                RouteDao.updateStopsForRoute(routeId, finalClientStops);
                RouteDao.updateRoute(routeId, {
                    totalDistance_km: parseFloat((trip.distance / 1000).toFixed(2)),
                    totalDuration_mins: currentTimeMins - startMins,
                    endTime: minsToTime(currentTimeMins)
                });
                return;
            }
        } catch (error) {
            console.error("Optimalizace OSRM selhala, fallback na manuální výpočet...", error);
        }
    }

    // ==========================================
    // 🛠️ MANUÁLNÍ REŽIM / FALLBACK S AGREGACÍ ADRES
    // ==========================================
    console.log(`Počítám manuální trasu ${routeId} s reálnými časy a sloučenými adresami...`);
    let currentPoint = route.startCoords;
    
    // U manuálního řazení musíme seřadit fyzické zastávky podle nejnižšího sequenceNumber jejich klientů
    physicalStops.forEach(pStop => {
        const originalClients = stops.filter(c => pStop.clients.some(pc => pc.id === c.id));
        pStop.sequenceNumber = Math.min(...originalClients.map(c => c.sequenceNumber));
    });
    
    const orderedPhysicalStops = physicalStops.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    let orderedStopsResult = [];

    for (let i = 0; i < orderedPhysicalStops.length; i++) {
        const pStop = orderedPhysicalStops[i];
        const specs = await getRealRouteSpecs(currentPoint, pStop);
        
        totalDistance += specs.distanceKm;
        currentTimeMins += specs.durationMins;

        pStop.arrivalTime = minsToTime(currentTimeMins);
        pStop.sequenceNumber = i + 1;

        currentTimeMins += pStop.serviceDurationMins;
        currentPoint = { lat: pStop.lat, lng: pStop.lng };
        orderedStopsResult.push(pStop);
    }

    const finalSpecs = await getRealRouteSpecs(currentPoint, route.endCoords);
    totalDistance += finalSpecs.distanceKm;
    currentTimeMins += finalSpecs.durationMins;

    // Rozepsání výsledků manuálního režimu zpět jednotlivým klientům
    const finalClientStops = [];
    orderedStopsResult.forEach(pStop => {
        pStop.clients.forEach(clientInfo => {
            const originalClient = stops.find(c => c.id === clientInfo.id);
            if (originalClient) {
                originalClient.sequenceNumber = pStop.sequenceNumber;
                originalClient.arrivalTime = pStop.arrivalTime;
                originalClient.serviceDurationMins = pStop.serviceDurationMins;
                originalClient.clientsOnStopCount = pStop.clients.length;
                finalClientStops.push(originalClient);
            }
        });
    });

    RouteDao.updateStopsForRoute(routeId, finalClientStops);
    RouteDao.updateRoute(routeId, {
        totalDistance_km: parseFloat(totalDistance.toFixed(2)),
        totalDuration_mins: currentTimeMins - startMins,
        endTime: minsToTime(currentTimeMins)
    });
}

const RouteAbl = {
    getCalendar() {
        return RouteDao.getAllRoutes();
    },

    getRouteDetail(routeId) {
        const route = RouteDao.getRouteById(routeId);
        if (!route) throw new Error("Trasa nenalezena.");

        const stops = RouteDao.getStopsByRouteId(routeId);
        return {
            ...route,
            stops: stops.sort((a, b) => a.sequenceNumber - b.sequenceNumber)
        };
    },

    async createBooking(bookingData) {
        const routeId = bookingData.routeId;
        const route = RouteDao.getRouteById(routeId);
        
        if (!route) throw new Error("Cílová trasa neexistuje.");
        if (route.currentClients >= route.maxClients) throw new Error("Kapacita trasy je plná!");

        const newStop = {
            id: Date.now(),
            routeId: routeId,
            name: bookingData.name,
            address: bookingData.address,
            lat: bookingData.lat,
            lng: bookingData.lng,
            sequenceNumber: route.currentClients + 1,
            arrivalTime: ""
        };

        RouteDao.addStop(newStop);
        RouteDao.updateRoute(routeId, { currentClients: route.currentClients + 1 });
        
        await _recalculateRoute(routeId);
        return newStop;
    },

    async deleteBooking(id) {
        const deletedStop = RouteDao.deleteStop(id);
        if (!deletedStop) throw new Error("Klient nenalezen.");

        const routeId = deletedStop.routeId;
        const route = RouteDao.getRouteById(routeId);
        
        if (route) {
            RouteDao.updateRoute(routeId, { currentClients: Math.max(0, route.currentClients - 1) });
            await _recalculateRoute(routeId);
        }
        return { message: "Klient odhlášen, trasa přepočítána." };
    },

    async updateConfig(routeId, configData) {
        const updatedRoute = RouteDao.updateRoute(routeId, configData);
        if (!updatedRoute) throw new Error("Trasa nenalezena.");

        await _recalculateRoute(routeId);
        return updatedRoute;
    }
};

// Spuštění prvotní optimalizace po startu serveru pro obě výchozí trasy
setTimeout(async () => {
    await _recalculateRoute("r1");
    await _recalculateRoute("r2");
}, 1000);

module.exports = RouteAbl;