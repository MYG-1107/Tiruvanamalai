const TIRUVANNAMALAI = {
  name: "Tiruvannamalai",
  lat: 12.2253,
  lon: 79.0747,
};

const toRadians = (value) => (value * Math.PI) / 180;

const haversineDistanceKm = (origin, destination) => {
  const earthRadiusKm = 6371;
  const latDiff = toRadians(destination.lat - origin.lat);
  const lonDiff = toRadians(destination.lon - origin.lon);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDiff / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const formatDistance = (distanceKm) =>
  `${Math.round(distanceKm)} km (straight-line)`;

const updateResult = (resultEl, message) => {
  if (resultEl) {
    resultEl.textContent = message;
  }
};

const setupDistanceFinder = () => {
  const originSelect = document.getElementById("originSelect");
  const geoButton = document.getElementById("geoButton");
  const resultEl = document.getElementById("distanceResult");

  if (!originSelect || !resultEl) {
    return;
  }

  originSelect.addEventListener("change", () => {
    const selectedOption = originSelect.selectedOptions[0];
    const lat = parseFloat(selectedOption?.dataset.lat);
    const lon = parseFloat(selectedOption?.dataset.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      updateResult(resultEl, "Select a location to see the distance.");
      return;
    }

    const distance = haversineDistanceKm(
      { lat, lon },
      { lat: TIRUVANNAMALAI.lat, lon: TIRUVANNAMALAI.lon }
    );

    updateResult(
      resultEl,
      `From ${selectedOption.textContent} to ${TIRUVANNAMALAI.name}: ${formatDistance(
        distance
      )}.`
    );
  });

  if (geoButton) {
    geoButton.addEventListener("click", () => {
      if (!navigator.geolocation) {
        updateResult(
          resultEl,
          "Geolocation is not supported in this browser. Please choose a city."
        );
        return;
      }

      updateResult(resultEl, "Calculating distance from your location...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const distance = haversineDistanceKm(
            { lat: latitude, lon: longitude },
            { lat: TIRUVANNAMALAI.lat, lon: TIRUVANNAMALAI.lon }
          );
          updateResult(
            resultEl,
            `From your location to ${TIRUVANNAMALAI.name}: ${formatDistance(
              distance
            )}.`
          );
        },
        () => {
          updateResult(
            resultEl,
            "Unable to access your location. Please allow permission or choose a city."
          );
        }
      );
    });
  }
};

document.addEventListener("DOMContentLoaded", setupDistanceFinder);
