/* Tiruvannamalai Pilgrim Guide
 * Browser-only location support. Coordinates and the visitor's location are
 * kept in memory for this page; there is no account or location database.
 */
const TIRUVANNAMALAI_CENTER = [12.2388, 79.0525];

const TEMPLE_PLACES = [
  {
    id: "adi-annamalai",
    number: "01",
    name: "Arulmigu Adhi Annamalaiyar Temple",
    shortName: "Adi Annamalaiyar Temple",
    description: "A revered Shiva temple on the Girivalam road at Adi Annamalai.",
    query: "Arulmigu Adhi Annamalaiyar Temple, Kirivalapathai, Tiruvannamalai, Tamil Nadu 606604, India",
    lat: 12.2518,
    lon: 79.0402,
    pinNote: "Approximate public map pin; confirm the entrance locally."
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
    pinNote: "Temple map position from OpenStreetMap-based place data."
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
    pinNote: "The exact temple identity and map pin could not be verified from available public map references."
  }
];

let visitMap = null;
let userCoordinates = null;
let userMarker = null;
const templeMarkers = new Map();

const toRadians = (value) => (value * Math.PI) / 180;

function haversineKm(origin, destination) {
  const earthRadiusKm = 6371;
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const latDiff = toRadians(destination.lat - origin.lat);
  const lonDiff = toRadians(destination.lon - origin.lon);
  const a = Math.sin(latDiff / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDiff / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKm(distance) {
  if (!Number.isFinite(distance)) return "Distance unavailable";
  return distance < 10 ? `${distance.toFixed(1)} km` : `${Math.round(distance)} km`;
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
        ? "Calculating distance estimate…"
        : "Allow location access to calculate your distance.";
    const pinText = place.pinNote ? `<p class="pin-note">${place.pinNote}</p>` : "";
    const focusButton = isPinned
      ? `<button class="text-action" type="button" data-focus-place="${place.id}">Show on map</button>`
      : "";
    return `
      <article class="temple-card ${isPinned ? "" : "temple-card-pending"}" data-temple-card="${place.id}">
        <span class="temple-index">${place.number}</span>
        <div>
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
    button.addEventListener("click", () => focusPlace(button.dataset.focusPlace));
  });
}

function addTempleMarker(place) {
  if (!visitMap || !window.L || place.lat == null || place.lon == null) return;
  const marker = L.circleMarker([place.lat, place.lon], {
    radius: 8,
    color: "#fffefa",
    weight: 2,
    fillColor: "#c27b3d",
    fillOpacity: 1
  }).addTo(visitMap);
  marker.bindPopup(`<strong>${place.name}</strong><br><span>${place.shortName}</span>`);
  marker.on("click", () => highlightTempleCard(place.id));
  templeMarkers.set(place.id, marker);
}

function highlightTempleCard(placeId) {
  document.querySelectorAll("[data-temple-card]").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.templeCard === placeId);
  });
}

function focusPlace(placeId) {
  const place = TEMPLE_PLACES.find((item) => item.id === placeId);
  if (!place || place.lat == null || place.lon == null || !visitMap) return;
  highlightTempleCard(placeId);
  visitMap.setView([place.lat, place.lon], 16, { animate: true });
  const marker = templeMarkers.get(placeId);
  if (marker) marker.openPopup();
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
    const directDistance = haversineKm(userCoordinates, { lat: place.lat, lon: place.lon });
    element.textContent = `${formatKm(directDistance)} · straight-line estimate`;
  });
}

function setLocationStatus(message) {
  const status = document.getElementById("locationStatus");
  if (status) status.textContent = message;
}

function locateUser() {
  if (!navigator.geolocation) {
    setLocationStatus("Location is not supported by this browser. You can still explore the temple map.");
    return;
  }
  setLocationStatus("Requesting your location. Please allow access in your browser.");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userCoordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      const accuracy = Number.isFinite(position.coords.accuracy)
        ? Math.round(position.coords.accuracy)
        : null;
      setLocationStatus(accuracy && accuracy > 1000
        ? "Location found, but accuracy is broad. Distances are straight-line estimates."
        : "Your location is on the map. Distances are straight-line estimates; open a map app for walking directions.");
      if (visitMap && window.L) {
        if (userMarker) visitMap.removeLayer(userMarker);
        userMarker = L.circleMarker([userCoordinates.lat, userCoordinates.lon], {
          radius: 9, color: "#fff", weight: 3, fillColor: "#2678b6", fillOpacity: 1
        }).addTo(visitMap).bindPopup("Your current location");
        const bounds = L.latLngBounds([[userCoordinates.lat, userCoordinates.lon]]);
        TEMPLE_PLACES.forEach((place) => {
          if (place.lat != null && place.lon != null) bounds.extend([place.lat, place.lon]);
        });
        visitMap.fitBounds(bounds.pad(.18), { maxZoom: 14 });
      }
      renderTempleCards();
      updateTempleDistances();
    },
    (error) => {
      const messages = {
        1: "Location permission was not granted. Use the button to try again, or browse the map without location.",
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
      const label = Object.values(properties).join(" ").toLowerCase();
      if (!Array.isArray(coordinates) || coordinates.length < 2) return false;
      const [lon, lat] = coordinates;
      const inTown = lat > 12.18 && lat < 12.30 && lon > 79.00 && lon < 79.13;
      const placeName = String(properties.name || "").toLowerCase().replace(/[^a-z]/g, "");
      const matchesName = placeName.includes("sivanagar");
      return inTown && matchesName;
    });
    if (!candidate) return;
    const [lon, lat] = candidate.geometry.coordinates;
    place.lat = lat;
    place.lon = lon;
    place.pinNote = "Candidate map pin found by place-name search. Please confirm this is the temple you intended.";
    addTempleMarker(place);
    renderTempleCards();
    if (userCoordinates) updateTempleDistances();
  } catch (error) {
    // Keep the location unpinned rather than guessing.
  }
}

function initialiseHomeMap() {
  const mapElement = document.getElementById("visitMap");
  if (!mapElement) return;
  if (!window.L) {
    mapElement.innerHTML = '<div class="map-placeholder">The interactive map could not load. Check your connection and reload the page.</div>';
    return;
  }
  visitMap = L.map(mapElement, { scrollWheelZoom: false }).setView(TIRUVANNAMALAI_CENTER, 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
  }).addTo(visitMap);

  TEMPLE_PLACES.forEach(addTempleMarker);
  renderTempleCards();
  setTimeout(() => visitMap.invalidateSize(), 120);

  const locateButton = document.getElementById("locateButton");
  if (locateButton) locateButton.addEventListener("click", locateUser);
  // Ask once on entry because the home page is designed around nearby places.
  // Visitors can decline and continue using the map without sharing location.
  locateUser();
  findSivanagarPin();
}

function initialiseGirivalamMap() {
  const mapElement = document.getElementById("girivalamMap");
  if (!mapElement) return;
  if (!window.L) {
    mapElement.innerHTML = '<div class="map-placeholder">The interactive map could not load. Open the walking directions link above.</div>';
    return;
  }
  const map = L.map(mapElement, { scrollWheelZoom: false }).setView([12.238, 79.046], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
  }).addTo(map);

  // This hand-drawn corridor is intentionally labelled as illustrative. It is
  // not used for turn-by-turn directions or for calculating the 14 km distance.
  const indicativeLoop = [
    [12.23184, 79.06683],
    [12.2220, 79.0625],
    [12.2135, 79.0520],
    [12.2120, 79.0390],
    [12.2180, 79.0275],
    [12.2290, 79.0220],
    [12.2410, 79.0230],
    [12.2518, 79.0402],
    [12.2550, 79.0510],
    [12.2500, 79.0615],
    [12.2415, 79.0685],
    [12.23184, 79.06683]
  ];
  L.polyline(indicativeLoop, {
    color: "#c27b3d", weight: 5, opacity: .9, dashArray: "9 9", lineJoin: "round"
  }).addTo(map).bindPopup("Indicative Girivalam circuit — use live walking directions for the road route.");

  L.circle([12.2395, 79.0450], {
    radius: 1150, color: "#69836d", weight: 1, fillColor: "#8ca68b", fillOpacity: .13, dashArray: "4 6"
  }).addTo(map).bindPopup("Arunachala hill · orientation marker");

  L.circleMarker([12.23184, 79.06683], {
    radius: 9, color: "#fffefa", weight: 2, fillColor: "#355b49", fillOpacity: 1
  }).addTo(map).bindPopup("<strong>Arunachaleswarar Temple</strong><br>Traditional start near the East Rajagopuram.");

  L.circleMarker([12.2518, 79.0402], {
    radius: 8, color: "#fffefa", weight: 2, fillColor: "#c27b3d", fillOpacity: 1
  }).addTo(map).bindPopup("<strong>Adi Annamalaiyar Temple</strong><br>Temple on the Girivalam path.");

  map.fitBounds(L.latLngBounds(indicativeLoop).pad(.12));
  setTimeout(() => map.invalidateSize(), 120);
}

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());
  if (document.body.dataset.page === "home") initialiseHomeMap();
  if (document.body.dataset.page === "girivalam") initialiseGirivalamMap();
});