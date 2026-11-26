/* Tiruvannamalai Pilgrim Guide — map and location interactions */
const TIRUVANNAMALAI_CENTER = [12.2388, 79.0525];
const MAX_LOCAL_FIT_DISTANCE_KM = 35;
const MAP_MAX_ZOOM = 21;
const MAP_NATIVE_MAX_ZOOM = 19;

const TEMPLE_PLACES = [
  {
    id: "adi-annamalai",
    number: "01",
    name: "Arulmigu Adhi Annamalaiyar Temple",
    shortName: "Adi Annamalaiyar Temple",
    description: "An important Shiva temple on the Girivalam road at Adi Annamalai. Please make time to visit this easily overlooked shrine during your pilgrimage.",
    query: "Arulmigu Adhi Annamalaiyar Temple, Kirivalapathai, Tiruvannamalai, Tamil Nadu 606604, India",
    lat: 12.2518,
    lon: 79.0402,
    pinNote: "Important Girivalam stop. The map pin is approximate; follow local temple signs to the correct entrance.",
    featured: true
  },
  {
    id: "arunachaleswarar",
    number: "02",
    name: "Arulmigu Arunachaleswarar Temple",
    shortName: "Arunachaleswarar Temple",
    description: "The great Annamalaiyar temple at the foot of Arunachala hill.",
    query: "Arulmigu Arunachaleswarar Temple, East Gopuram Street, Tiruvannamalai, Tamil Nadu 606601, India",
    lat: 12.23184,
    lon: 79.06683,
    pinNote: "Map position based on OpenStreetMap-derived place data."
  },
  {
    id: "sivanagar",
    number: "03",
    name: "Sivanagar Temple",
    shortName: "Sivanagar Temple",
    description: "Added to the first set of important temples as requested.",
    query: "Sivanagar Temple, Tiruvannamalai, Tamil Nadu, India",
    lat: null,
    lon: null,
    pinNote: "Exact identity and map pin need confirmation."
  }
];

// Shrine positions are based on public OpenStreetMap-derived place listings.
// They are map pins for orientation; visitors should confirm entrances locally.
const GIRIVALAM_STOPS = [
  { id: "indra-lingam", number: "1", name: "Indira Lingam", direction: "East", lat: 12.22925, lon: 79.07039, note: "Traditionally the first of the eight Lingams." },
  { id: "agni-lingam", number: "2", name: "Agni Lingam", direction: "South-East", lat: 12.2242, lon: 79.0590, note: "The south-eastern shrine, near Chengam Road." },
  { id: "yama-lingam", number: "3", name: "Yama Lingam", direction: "South", lat: 12.22644, lon: 79.04440, note: "The southern shrine on the Girivalam circuit." },
  { id: "niruthi-lingam", number: "4", name: "Niruthi Lingam", direction: "South-West", lat: 12.23466, lon: 79.03231, note: "The south-western shrine." },
  { id: "varuna-lingam", number: "5", name: "Varuna Lingam", direction: "West", lat: 12.2494, lon: 79.0347, note: "The western shrine." },
  { id: "vayu-lingam", number: "6", name: "Vayu Lingam", direction: "North-West", lat: 12.25764, lon: 79.04737, note: "The north-western shrine." },
  { id: "kubera-lingam", number: "7", name: "Kubera Lingam", direction: "North", lat: 12.2552, lon: 79.06097, note: "The northern shrine." },
  { id: "esanya-lingam", number: "8", name: "Esanya Lingam", direction: "North-East", lat: 12.245113, lon: 79.074095, note: "The north-eastern shrine and final Ashta Lingam stop." }
];

const ADI_ANNAMALAI_STOP = {
  id: "adi-annamalai-stop",
  name: "Adi Annamalaiyar Temple",
  lat: 12.2518,
  lon: 79.0402,
  note: "A major temple on the Girivalam road."
};

let visitMap = null;
let girivalamMap = null;
let userCoordinates = null;
let userMarker = null;
let userAccuracyCircle = null;
let girivalamRouteLayer = null;
const templeMarkers = new Map();
const girivalamMarkers = new Map();

const toRadians = (value) => (value * Math.PI) / 180;

function haversineKm(origin, destination) {
  const radius = 6371;
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const latDiff = toRadians(destination.lat - origin.lat);
  const lonDiff = toRadians(destination.lon - origin.lon);
  const a = Math.sin(latDiff / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDiff / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKm(distance) {
  if (!Number.isFinite(distance)) return "Distance unavailable";
  return distance < 10 ? `${distance.toFixed(1)} km` : `${distance.toFixed(1)} km`;
}

function makeNumberedIcon(number, kind = "lingam") {
  const label = String(number);
  return L.divIcon({
    className: "pilgrim-marker-shell",
    html: `<span class="pilgrim-marker pilgrim-marker--${kind}"><span>${label}</span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 39],
    popupAnchor: [0, -36]
  });
}

function mapTileOptions(options = {}) {
  return {
    minZoom: 2,
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: MAP_NATIVE_MAX_ZOOM,
    keepBuffer: 3,
    updateWhenIdle: true,
    updateWhenZooming: false,
    ...options
  };
}

function makeBaseLayers(map) {
  const osmStreet = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    mapTileOptions({
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
    })
  );

  const esriStreet = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    mapTileOptions({
      attribution: "Tiles &copy; Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), (c) OpenStreetMap contributors, and the GIS User Community"
    })
  );

  const imagery = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    mapTileOptions({
      attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
    })
  );

  const imageryLabels = L.tileLayer(
    "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    mapTileOptions({ attribution: "Labels &copy; Esri" })
  );

  const satellite = L.layerGroup([imagery, imageryLabels]);
  satellite.addTo(map);

  // If the satellite service has a real outage, fall back to a street layer
  // instead of leaving the map covered with failed tile placeholders.
  let imageryErrors = 0;
  imagery.on("tileload", () => {
    imageryErrors = Math.max(0, imageryErrors - 1);
  });
  imagery.on("tileerror", () => {
    imageryErrors += 1;
    if (imageryErrors < 7 || !map.hasLayer(satellite)) return;
    map.removeLayer(satellite);
    osmStreet.addTo(map);
    const status = document.getElementById("homeMapStatus");
    if (status) status.textContent = "Satellite imagery is temporarily unavailable. Street map is shown instead; choose Satellite in map layers to retry.";
  });

  L.control.layers(
    {
      "Satellite (default)": satellite,
      "OpenStreetMap": osmStreet,
      "Esri street map": esriStreet
    },
    null,
    { position: "topright", collapsed: true }
  ).addTo(map);

  L.control.scale({ imperial: false, position: "bottomleft", maxWidth: 120 }).addTo(map);
}
function bindFullscreen(buttonId, mapElementId, map) {
  const button = document.getElementById(buttonId);
  const mapElement = document.getElementById(mapElementId);
  if (!button || !mapElement) return;

  button.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await mapElement.requestFullscreen();
        button.textContent = "Exit full screen";
      } else {
        await document.exitFullscreen();
        button.textContent = "Full screen";
      }
      window.setTimeout(() => map.invalidateSize(), 250);
    } catch (error) {
      const status = document.getElementById("homeMapStatus") || document.getElementById("routeMapStatus");
      if (status) status.textContent = "Full-screen mode is not available in this browser.";
    }
  });

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) button.textContent = "Full screen";
    window.setTimeout(() => map.invalidateSize(), 200);
  });
}

function placeDestination(place) {
  return place.lat != null && place.lon != null
    ? `${place.lat},${place.lon}`
    : place.query;
}

function directionUrls(place) {
  const destination = placeDestination(place);
  const origin = userCoordinates ? `${userCoordinates.lat},${userCoordinates.lon}` : "";
  const google = new URL("https://www.google.com/maps/dir/");
  google.searchParams.set("api", "1");
  google.searchParams.set("destination", destination);
  google.searchParams.set("travelmode", "walking");
  if (origin) google.searchParams.set("origin", origin);

  const apple = new URL("https://maps.apple.com/");
  apple.searchParams.set("daddr", destination);
  apple.searchParams.set("dirflg", "w");
  if (origin) apple.searchParams.set("saddr", origin);
  return { google: google.toString(), apple: apple.toString() };
}

function renderTempleCards() {
  const container = document.getElementById("templeCards");
  if (!container) return;

  container.innerHTML = TEMPLE_PLACES.map((place) => {
    const isPinned = place.lat != null && place.lon != null;
    const links = directionUrls(place);
    const distanceText = !isPinned
      ? "Exact map pin not verified yet."
      : userCoordinates
        ? "Updating distance…"
        : "Allow location access to calculate your distance.";
    const pinText = place.pinNote ? `<p class="pin-note">${place.pinNote}</p>` : "";
    const focusButton = isPinned
      ? `<button class="text-action" type="button" data-focus-place="${place.id}">Show on map</button>`
      : "";
    return `
      <article class="temple-card ${isPinned ? "" : "temple-card-pending"} ${place.featured ? "temple-card-featured" : ""}" data-temple-card="${place.id}">
        <span class="temple-index">${place.number}</span>
        <div>
          ${place.featured ? '<span class="temple-featured-tag">IMPORTANT GIRIVALAM STOP · PLEASE DO NOT MISS</span>' : ""}
          <h3>${place.name}</h3>
          <p>${place.description}</p>
          <p class="temple-distance" data-distance-for="${place.id}">${distanceText}</p>
          ${pinText}
          <div class="temple-actions">
            ${focusButton}
            <a class="text-action" href="${links.google}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>
            <a class="text-action" href="${links.apple}" target="_blank" rel="noopener noreferrer">Apple Maps ↗</a>
          </div>
        </div>
      </article>`;
  }).join("");

  container.querySelectorAll("[data-focus-place]").forEach((button) => {
    button.addEventListener("click", () => focusTemple(button.dataset.focusPlace));
  });

  updateTempleDistances();
}

function addTempleMarker(place) {
  if (!visitMap || !window.L || place.lat == null || place.lon == null) return;
  if (templeMarkers.has(place.id)) return;

  const kind = place.id === "arunachaleswarar" ? "main" : place.id === "adi-annamalai" ? "adi" : "temple";
  const markerLabel = place.id === "adi-annamalai" ? "A" : place.number;
  const marker = L.marker([place.lat, place.lon], {
    icon: makeNumberedIcon(markerLabel, kind),
    title: place.name,
    riseOnHover: true
  }).addTo(visitMap);

  const links = directionUrls(place);
  const featuredHeading = place.featured
    ? "<span class=\"map-popup-kicker\">IMPORTANT GIRIVALAM STOP</span><strong>ஆதி அண்ணாமலையார் திருக்கோயில்<br>Adi Annamalaiyar Temple</strong>"
    : `<strong>${place.name}</strong>`;
  marker.bindPopup(
    `<div class="map-popup">${featuredHeading}<p>${place.description}</p><div class="map-popup-actions"><a href="${links.apple}" target="_blank" rel="noopener noreferrer">Apple Maps ↗</a><a href="${links.google}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a></div></div>`
  );
  marker.on("click", () => highlightTempleCard(place.id));
  templeMarkers.set(place.id, marker);
}

function highlightTempleCard(placeId) {
  document.querySelectorAll("[data-temple-card]").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.templeCard === placeId);
  });
}

function focusTemple(placeId) {
  const place = TEMPLE_PLACES.find((item) => item.id === placeId);
  if (!place || place.lat == null || place.lon == null || !visitMap) return;
  highlightTempleCard(placeId);
  visitMap.setView([place.lat, place.lon], 16, { animate: true });
  templeMarkers.get(placeId)?.openPopup();
}

function updateTempleDistances() {
  TEMPLE_PLACES.forEach((place) => {
    const element = document.querySelector(`[data-distance-for="${place.id}"]`);
    if (!element) return;
    if (place.lat == null || place.lon == null) {
      element.textContent = "Distance unavailable until the correct temple pin is confirmed.";
      return;
    }
    if (!userCoordinates) {
      element.textContent = "Allow location access to calculate your distance.";
      return;
    }
    const distance = haversineKm(userCoordinates, { lat: place.lat, lon: place.lon });
    element.textContent = `${formatKm(distance)} · straight-line estimate`;
  });
}

function setLocationStatus(message) {
  const status = document.getElementById("locationStatus");
  if (status) status.textContent = message;
  const mapStatus = document.getElementById("homeMapStatus");
  if (mapStatus) mapStatus.textContent = message;
}

function focusUserOnMap() {
  if (!userCoordinates || !visitMap) {
    locateUser();
    return;
  }
  visitMap.setView([userCoordinates.lat, userCoordinates.lon], 15, { animate: true });
  userMarker?.openPopup();
}

function fitTempleArea() {
  if (!visitMap) return;
  const points = TEMPLE_PLACES
    .filter((place) => place.lat != null && place.lon != null)
    .map((place) => [place.lat, place.lon]);
  if (points.length) visitMap.fitBounds(L.latLngBounds(points).pad(0.28), { maxZoom: 14 });
}

function locateUser() {
  if (!navigator.geolocation) {
    setLocationStatus("Location is not supported by this browser. You can still explore the temple map.");
    return;
  }

  setLocationStatus("Requesting your location. Please allow access in your browser.");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userCoordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      const accuracy = Number.isFinite(position.coords.accuracy)
        ? Math.max(10, position.coords.accuracy)
        : 50;

      if (visitMap && window.L) {
        if (userMarker) visitMap.removeLayer(userMarker);
        if (userAccuracyCircle) visitMap.removeLayer(userAccuracyCircle);

        userAccuracyCircle = L.circle([userCoordinates.lat, userCoordinates.lon], {
          radius: Math.min(accuracy, 1500),
          color: "#2678b6",
          weight: 1,
          opacity: 0.55,
          fillColor: "#4d9bd3",
          fillOpacity: 0.1
        }).addTo(visitMap);

        userMarker = L.circleMarker([userCoordinates.lat, userCoordinates.lon], {
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#2678b6",
          fillOpacity: 1
        }).addTo(visitMap).bindPopup("<strong>Your current location</strong>");
      }

      renderTempleCards();
      const distanceToTown = haversineKm(userCoordinates, {
        lat: TIRUVANNAMALAI_CENTER[0],
        lon: TIRUVANNAMALAI_CENTER[1]
      });

      if (distanceToTown <= MAX_LOCAL_FIT_DISTANCE_KM) {
        if (visitMap && userMarker) {
          const bounds = L.latLngBounds([[userCoordinates.lat, userCoordinates.lon]]);
          TEMPLE_PLACES.forEach((place) => {
            if (place.lat != null && place.lon != null) bounds.extend([place.lat, place.lon]);
          });
          visitMap.fitBounds(bounds.pad(0.18), { maxZoom: 15 });
        }
        setLocationStatus("Your location is shown with a blue dot. Temple distances are approximate direct distances.");
      } else {
        fitTempleArea();
        setLocationStatus("Location found. The map stays focused on Tiruvannamalai; your temple distances are calculated from your current location.");
      }
    },
    (error) => {
      const messages = {
        1: "Location permission was not granted. You can still explore the map or try again.",
        2: "Your location could not be determined. Please try again in a place with a clearer GPS signal.",
        3: "The location request timed out. Please try again."
      };
      setLocationStatus(messages[error.code] || "Unable to get your location. Please try again.");
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

async function findSivanagarPin() {
  const place = TEMPLE_PLACES.find((item) => item.id === "sivanagar");
  if (!place) return;

  try {
    const endpoint = new URL("https://photon.komoot.io/api/");
    endpoint.searchParams.set("q", "Sivanagar Temple, Tiruvannamalai, Tamil Nadu");
    endpoint.searchParams.set("limit", "8");
    endpoint.searchParams.set("lat", String(TIRUVANNAMALAI_CENTER[0]));
    endpoint.searchParams.set("lon", String(TIRUVANNAMALAI_CENTER[1]));

    const response = await fetch(endpoint.toString(), { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const data = await response.json();

    const candidate = (data.features || []).find((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const properties = feature.properties || {};
      if (!Array.isArray(coordinates) || coordinates.length < 2) return false;
      const [lon, lat] = coordinates;
      const inTown = lat > 12.18 && lat < 12.30 && lon > 79.00 && lon < 79.13;
      const placeName = String(properties.name || "").toLowerCase().replace(/[^a-z]/g, "");
      return inTown && placeName.includes("sivanagar");
    });

    if (!candidate) return;
    const [lon, lat] = candidate.geometry.coordinates;
    place.lat = lat;
    place.lon = lon;
    place.pinNote = "Map-name match found. Please confirm this is the temple you intended.";
    addTempleMarker(place);
    renderTempleCards();
  } catch (error) {
    // Leave the temple unpinned instead of guessing its location.
  }
}

function addHomeMapControls() {
  document.getElementById("homeMapFit")?.addEventListener("click", fitTempleArea);
  document.getElementById("homeMapCurrent")?.addEventListener("click", focusUserOnMap);
}

function initialiseHomeMap() {
  const mapElement = document.getElementById("visitMap");
  if (!mapElement) return;

  if (!window.L) {
    mapElement.innerHTML = '<div class="map-placeholder">The interactive map could not load. Check your connection and reload the page.</div>';
    return;
  }

  visitMap = L.map(mapElement, {
    scrollWheelZoom: false,
    zoomControl: true,
    maxZoom: MAP_MAX_ZOOM,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    preferCanvas: true
  }).setView(TIRUVANNAMALAI_CENTER, 14);

  makeBaseLayers(visitMap);
  TEMPLE_PLACES.forEach(addTempleMarker);
  fitTempleArea();
  addHomeMapControls();
  renderTempleCards();
  bindFullscreen("homeMapFullscreen", "visitMap", visitMap);

  const locateButton = document.getElementById("locateButton");
  if (locateButton) locateButton.addEventListener("click", locateUser);

  window.setTimeout(() => visitMap.invalidateSize(), 150);
  locateUser();
  findSivanagarPin();
}

function setRouteStatus(message, state = "info") {
  const status = document.getElementById("routeMapStatus");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function makeGirivalamDirectionsUrl() {
  const start = GIRIVALAM_STOPS[0];
  const orderedWaypoints = [
    GIRIVALAM_STOPS[1],
    GIRIVALAM_STOPS[2],
    GIRIVALAM_STOPS[3],
    GIRIVALAM_STOPS[4],
    ADI_ANNAMALAI_STOP,
    GIRIVALAM_STOPS[5],
    GIRIVALAM_STOPS[6],
    GIRIVALAM_STOPS[7]
  ];

  const google = new URL("https://www.google.com/maps/dir/");
  google.searchParams.set("api", "1");
  google.searchParams.set("origin", `${start.lat},${start.lon}`);
  google.searchParams.set("destination", `${start.lat},${start.lon}`);
  google.searchParams.set("waypoints", orderedWaypoints.map((stop) => `${stop.lat},${stop.lon}`).join("|"));
  google.searchParams.set("travelmode", "walking");
  return google.toString();
}

function addGirivalamMarkers() {
  GIRIVALAM_STOPS.forEach((stop) => {
    const marker = L.marker([stop.lat, stop.lon], {
      icon: makeNumberedIcon(stop.number, "lingam"),
      title: stop.name,
      riseOnHover: true
    }).addTo(girivalamMap);

    marker.bindPopup(
      `<div class="map-popup"><strong>${stop.name}</strong><p>${stop.direction} · ${stop.note}</p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name + ", Tiruvannamalai, Tamil Nadu, India")}" target="_blank" rel="noopener noreferrer">Open place in Google Maps ↗</a></div>`
    );
    girivalamMarkers.set(stop.id, marker);
  });

  const adiMarker = L.marker([ADI_ANNAMALAI_STOP.lat, ADI_ANNAMALAI_STOP.lon], {
    icon: makeNumberedIcon("A", "temple"),
    title: ADI_ANNAMALAI_STOP.name,
    riseOnHover: true
  }).addTo(girivalamMap);
  adiMarker.bindPopup(`<div class="map-popup"><strong>${ADI_ANNAMALAI_STOP.name}</strong><p>${ADI_ANNAMALAI_STOP.note}</p></div>`);
  girivalamMarkers.set(ADI_ANNAMALAI_STOP.id, adiMarker);

  const mainTemple = TEMPLE_PLACES.find((place) => place.id === "arunachaleswarar");
  if (mainTemple) {
    const mainMarker = L.marker([mainTemple.lat, mainTemple.lon], {
      icon: makeNumberedIcon("T", "main"),
      title: mainTemple.name,
      riseOnHover: true
    }).addTo(girivalamMap);
    mainMarker.bindPopup(`<div class="map-popup"><strong>${mainTemple.name}</strong><p>Temple at the foot of Arunachala.</p></div>`);
    girivalamMarkers.set(mainTemple.id, mainMarker);
  }
}

function fitGirivalamRoute() {
  if (!girivalamMap) return;
  const points = [
    ...GIRIVALAM_STOPS.map((stop) => [stop.lat, stop.lon]),
    [ADI_ANNAMALAI_STOP.lat, ADI_ANNAMALAI_STOP.lon],
    [12.23184, 79.06683]
  ];
  girivalamMap.fitBounds(L.latLngBounds(points).pad(0.16));
}

function focusGirivalamStop(stopId) {
  if (!girivalamMap) return;
  const marker = girivalamMarkers.get(stopId);
  if (!marker) return;
  girivalamMap.setView(marker.getLatLng(), 16, { animate: true });
  marker.openPopup();
}

async function loadGirivalamRoadRoute() {
  if (!girivalamMap) return;

  const button = document.getElementById("loadGirivalamRoute");
  if (button) {
    button.disabled = true;
    button.textContent = "Loading road route…";
  }
  setRouteStatus("Requesting the road-following walking route from OpenStreetMap data…", "loading");

  const orderedStops = [
    GIRIVALAM_STOPS[0],
    GIRIVALAM_STOPS[1],
    GIRIVALAM_STOPS[2],
    GIRIVALAM_STOPS[3],
    GIRIVALAM_STOPS[4],
    ADI_ANNAMALAI_STOP,
    GIRIVALAM_STOPS[5],
    GIRIVALAM_STOPS[6],
    GIRIVALAM_STOPS[7],
    GIRIVALAM_STOPS[0]
  ];

  const coordinates = orderedStops.map((stop) => `${stop.lon},${stop.lat}`).join(";");
  const endpoint = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false&alternatives=false`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 22000);

  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`Routing service returned ${response.status}`);

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates?.length) {
      throw new Error(data.message || "No road route was returned");
    }

    if (girivalamRouteLayer) girivalamMap.removeLayer(girivalamRouteLayer);
    const latLngs = data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    const roadDistanceKm = data.routes[0].distance / 1000;

    girivalamRouteLayer = L.layerGroup([
      L.polyline(latLngs, {
        color: "#fffefa",
        weight: 10,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round"
      }),
      L.polyline(latLngs, {
        color: "#c27b3d",
        weight: 5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round"
      })
    ]).addTo(girivalamMap);

    setRouteStatus(
      `Road-following route preview loaded · ${formatKm(roadDistanceKm)} · Public OpenStreetMap walking network. Check the live navigation before setting out.`,
      "success"
    );
    fitGirivalamRoute();
  } catch (error) {
    const reason = error.name === "AbortError" ? "The route request timed out." : "The public route service is temporarily unavailable.";
    setRouteStatus(
      `${reason} The shrine pins remain available. Use Google Maps or Apple Maps for live walking directions.`,
      "warning"
    );
  } finally {
    window.clearTimeout(timeout);
    if (button) {
      button.disabled = false;
      button.textContent = "Reload road route";
    }
  }
}

function initialiseGirivalamMap() {
  const mapElement = document.getElementById("girivalamMap");
  if (!mapElement) return;

  if (!window.L) {
    mapElement.innerHTML = '<div class="map-placeholder">The interactive map could not load. Open the walking directions link above.</div>';
    return;
  }

  girivalamMap = L.map(mapElement, {
    scrollWheelZoom: false,
    zoomControl: true,
    maxZoom: MAP_MAX_ZOOM,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    preferCanvas: true
  }).setView(TIRUVANNAMALAI_CENTER, 13);

  makeBaseLayers(girivalamMap);
  addGirivalamMarkers();
  fitGirivalamRoute();
  document.getElementById("loadGirivalamRoute")?.addEventListener("click", loadGirivalamRoadRoute);
  document.getElementById("fitGirivalamRoute")?.addEventListener("click", fitGirivalamRoute);

  document.querySelectorAll("[data-route-focus]").forEach((button) => {
    button.addEventListener("click", () => focusGirivalamStop(button.dataset.routeFocus));
  });

  const googleLink = document.getElementById("googleGirivalamDirections");
  if (googleLink) googleLink.href = makeGirivalamDirectionsUrl();

  bindFullscreen("girivalamMapFullscreen", "girivalamMap", girivalamMap);
  setRouteStatus("Map ready. Select Load road route to request the walking-path preview.", "info");
  window.setTimeout(() => girivalamMap.invalidateSize(), 150);
}

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());

  if (document.body.dataset.page === "home") initialiseHomeMap();
  if (document.body.dataset.page === "girivalam") initialiseGirivalamMap();
});