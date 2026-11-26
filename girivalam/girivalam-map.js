/* Live Girivalam map-only GPS experience.
 * Route shape: public OpenStreetMap foot-routing service.
 * Live GPS progress is local. The current coordinate is sent to the public
 * foot-routing endpoint only when requesting the walking connector to start.
 */
(() => {
  "use strict";

  const MAP_CENTRE = [12.2388, 79.0525];
  const EXPECTED_CIRCUIT_KM = 14;
  const ROUTING_BASE = "https://routing.openstreetmap.de/routed-foot/route/v1/driving";
  const GPS_MAX_ACCURACY_METRES = 65;
  const OFF_ROUTE_METRES = 85;
  const START_RADIUS_METRES = 42;
  const FINISH_RADIUS_METRES = 48;
  const MAX_PROGRESS_JUMP_METRES = 110;
  const ROUTE_STOPS = [
    { id: "main-temple", number: "T", name: "Arunachaleswarar Temple · East Rajagopuram", direction: "Start / finish", lat: 12.23184, lon: 79.06683 },
    { id: "indra", number: "1", name: "Indra Lingam", direction: "East", lat: 12.22925, lon: 79.07039 },
    { id: "agni", number: "2", name: "Agni Lingam", direction: "South-East", lat: 12.2242, lon: 79.0590 },
    { id: "yama", number: "3", name: "Yama Lingam", direction: "South", lat: 12.22644, lon: 79.04440 },
    { id: "niruthi", number: "4", name: "Niruthi Lingam", direction: "South-West", lat: 12.23466, lon: 79.03231 },
    { id: "varuna", number: "5", name: "Varuna Lingam", direction: "West", lat: 12.2494, lon: 79.0347 },
    { id: "adi", number: "A", name: "Adi Annamalaiyar Temple", direction: "Girivalam path", lat: 12.2518, lon: 79.0402 },
    { id: "vayu", number: "6", name: "Vayu Lingam", direction: "North-West", lat: 12.25764, lon: 79.04737 },
    { id: "kubera", number: "7", name: "Kubera Lingam", direction: "North", lat: 12.2552, lon: 79.06097 },
    { id: "esanya", number: "8", name: "Esanya Lingam", direction: "North-East", lat: 12.245113, lon: 79.074095 }
  ];

  const state = {
    map: null,
    routeLayer: null,
    routeGlow: null,
    connectorLayer: null,
    userMarker: null,
    accuracyCircle: null,
    startMarker: null,
    stopMarkers: [],
    routePoints: [],
    cumulative: [],
    routeLength: 0,
    routeReady: false,
    location: null,
    locationAccuracy: null,
    watchId: null,
    startPoint: null,
    startAlong: 0,
    lastAlong: null,
    walkedMetres: 0,
    tracking: false,
    walkStarted: false,
    completed: false,
    lastUiUpdate: 0,
    lastRouteRequest: 0,
    connectorBusy: false
  };

  const el = {};
  const byId = (id) => document.getElementById(id);
  const radians = (degrees) => degrees * Math.PI / 180;

  function setStatus(message) {
    if (el.status) el.status.textContent = message;
  }

  function setError(message) {
    if (!el.error) return;
    if (!message) {
      el.error.hidden = true;
      el.error.textContent = "";
      return;
    }
    el.error.hidden = false;
    el.error.textContent = message;
  }

  function distanceMetres(a, b) {
    const radius = 6371000;
    const dLat = radians(b.lat - a.lat);
    const dLon = radians(b.lon - a.lon);
    const lat1 = radians(a.lat);
    const lat2 = radians(b.lat);
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function formatKm(metres) {
    return (Math.max(0, metres) / 1000).toFixed(1);
  }

  function makeBaseLayers() {
    const osm = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    );
    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
      }
    );
    const labels = L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Labels &copy; Esri" }
    );
    const satelliteWithLabels = L.layerGroup([satellite, labels]);
    osm.addTo(state.map);
    L.control.layers(
      { "Street": osm, "Satellite": satelliteWithLabels },
      null,
      { position: "topright", collapsed: true }
    ).addTo(state.map);
    L.control.scale({ imperial: false, position: "bottomleft", maxWidth: 100 }).addTo(state.map);
  }

  function markerIcon(label, kind) {
    return L.divIcon({
      className: "girivalam-marker-shell",
      html: `<span class="girivalam-marker girivalam-marker--${kind}"><b>${label}</b></span>`,
      iconSize: [34, 42],
      iconAnchor: [17, 39],
      popupAnchor: [0, -35]
    });
  }

  function showStopMarkers() {
    ROUTE_STOPS.forEach((stop) => {
      const marker = L.marker([stop.lat, stop.lon], {
        icon: markerIcon(stop.number, stop.id === "adi" ? "temple" : "lingam"),
        title: stop.name,
        keyboard: true
      }).addTo(state.map);
      marker.bindPopup(`<strong>${stop.name}</strong><br><small>${stop.direction}</small>`);
      state.stopMarkers.push(marker);
    });
  }

  function routeUrl(points, options = {}) {
    const coords = points.map((point) => `${point.lon.toFixed(6)},${point.lat.toFixed(6)}`).join(";");
    const query = new URLSearchParams({
      overview: "full",
      geometries: "geojson",
      steps: "false",
      alternatives: "false",
      continue_straight: "false",
      ...options
    });
    return `${ROUTING_BASE}/${coords}?${query.toString()}`;
  }

  async function requestRoute(points, options = {}) {
    const now = Date.now();
    const wait = Math.max(0, 1150 - (now - state.lastRouteRequest));
    if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
    state.lastRouteRequest = Date.now();

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(routeUrl(points, options), {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`Route service ${response.status}`);
      const data = await response.json();
      if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates?.length) {
        throw new Error(data.message || "No walking route returned");
      }
      return data.routes[0];
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function calculateCumulative(points) {
    const cumulative = [0];
    for (let index = 1; index < points.length; index += 1) {
      cumulative.push(cumulative[index - 1] + distanceMetres(points[index - 1], points[index]));
    }
    return cumulative;
  }

  function fitCircuit() {
    if (!state.routePoints.length) {
      state.map.setView(MAP_CENTRE, 13);
      return;
    }
    const bounds = L.latLngBounds(state.routePoints.map((point) => [point.lat, point.lon]));
    state.map.fitBounds(bounds.pad(0.07), { maxZoom: 15 });
  }

  function drawCircuit(route) {
    const coordinates = route.geometry.coordinates;
    let points = coordinates.map(([lon, lat]) => ({ lat, lon }));
    if (points.length < 10) throw new Error("The route geometry is too short to track safely.");

    const first = points[0];
    const last = points[points.length - 1];
    if (distanceMetres(first, last) > 8) {
      points.push({ lat: first.lat, lon: first.lon });
    } else {
      points[points.length - 1] = { lat: first.lat, lon: first.lon };
    }

    state.routePoints = points;
    state.cumulative = calculateCumulative(points);
    state.routeLength = state.cumulative[state.cumulative.length - 1];
    if (!Number.isFinite(state.routeLength) || state.routeLength < 9500 || state.routeLength > 18500) {
      throw new Error("The mapped loop did not return a plausible Girivalam circuit length.");
    }

    const line = points.map((point) => [point.lat, point.lon]);
    state.routeGlow = L.polyline(line, {
      color: "#fffefa", weight: 10, opacity: 0.96, lineCap: "round", lineJoin: "round"
    }).addTo(state.map);
    state.routeLayer = L.polyline(line, {
      color: "#c17a37", weight: 5, opacity: 1, lineCap: "round", lineJoin: "round"
    }).addTo(state.map);
    state.routeReady = true;

    if (el.totalDistance) el.totalDistance.textContent = `${formatKm(state.routeLength)} km`;
    fitCircuit();
  }

  function localProjection(point, originLatitude) {
    const scaleX = Math.cos(radians(originLatitude));
    return { x: point.lon * scaleX, y: point.lat };
  }

  function projectToCircuit(location) {
    if (!state.routePoints.length) return null;
    const latitude = location.lat;
    const target = localProjection(location, latitude);
    let closest = null;

    for (let index = 0; index < state.routePoints.length - 1; index += 1) {
      const start = state.routePoints[index];
      const end = state.routePoints[index + 1];
      const a = localProjection(start, latitude);
      const b = localProjection(end, latitude);
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const lengthSquared = vx * vx + vy * vy;
      if (!lengthSquared) continue;
      const t = Math.max(0, Math.min(1,
        ((target.x - a.x) * vx + (target.y - a.y) * vy) / lengthSquared
      ));
      const projected = {
        lat: start.lat + (end.lat - start.lat) * t,
        lon: start.lon + (end.lon - start.lon) * t
      };
      const distance = distanceMetres(location, projected);
      if (!closest || distance < closest.distance) {
        const segmentMetres = state.cumulative[index + 1] - state.cumulative[index];
        closest = {
          lat: projected.lat,
          lon: projected.lon,
          distance,
          segment: index,
          along: state.cumulative[index] + segmentMetres * t
        };
      }
    }
    return closest;
  }

  function makeNavigationUrl(destination) {
    const origin = state.location
      ? `${state.location.lat},${state.location.lon}`
      : "";
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("destination", `${destination.lat},${destination.lon}`);
    url.searchParams.set("travelmode", "walking");
    if (origin) url.searchParams.set("origin", origin);
    return url.toString();
  }

  function updateProgressUi() {
    if (el.walked) el.walked.textContent = formatKm(state.walkedMetres);
    if (el.total) el.total.textContent = `${formatKm(state.routeLength || EXPECTED_CIRCUIT_KM * 1000)} km`;
    const button = el.startButton;
    if (!button) return;
    const currentProjection = state.location && state.routeReady
      ? projectToCircuit(state.location)
      : null;
    const canStart = state.routeReady && state.startPoint &&
      !state.tracking && !state.completed &&
      state.location &&
      (state.locationAccuracy || 0) <= GPS_MAX_ACCURACY_METRES &&
      (state.walkStarted
        ? currentProjection && currentProjection.distance <= OFF_ROUTE_METRES
        : distanceMetres(state.location, state.startPoint) <= START_RADIUS_METRES);

    button.disabled = !state.tracking && !state.completed && !canStart;
    if (state.tracking) {
      button.setAttribute("aria-label", "Pause Girivalam walk");
      button.title = "Pause walk";
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
    } else if (state.completed) {
      button.setAttribute("aria-label", "Girivalam completed");
      button.title = "Completed";
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
      button.disabled = true;
    } else {
      button.setAttribute("aria-label", state.walkStarted ? "Resume Girivalam walk" : "Start Girivalam");
      button.title = state.walkStarted ? "Resume walk" : "Start Girivalam";
      button.innerHTML = state.walkStarted
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14m8-14v14"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>';
    }
  }

  function drawUserPosition(location) {
    if (!state.userMarker) {
      state.userMarker = L.circleMarker([location.lat, location.lon], {
        radius: 8,
        color: "#fffefa",
        weight: 3,
        fillColor: "#287db8",
        fillOpacity: 1,
        bubblingMouseEvents: false
      }).addTo(state.map);
      state.userMarker.bindPopup("Your location");
    } else {
      state.userMarker.setLatLng([location.lat, location.lon]);
    }

    const radius = Math.min(Math.max(state.locationAccuracy || 20, 10), 150);
    if (!state.accuracyCircle) {
      state.accuracyCircle = L.circle([location.lat, location.lon], {
        radius,
        color: "#287db8",
        weight: 1,
        opacity: 0.45,
        fillColor: "#57a2d2",
        fillOpacity: 0.1,
        interactive: false
      }).addTo(state.map);
    } else {
      state.accuracyCircle.setLatLng([location.lat, location.lon]);
      state.accuracyCircle.setRadius(radius);
    }
  }

  function setStartPoint(point) {
    state.startPoint = { lat: point.lat, lon: point.lon };
    state.startAlong = point.along;
    if (state.startMarker) state.map.removeLayer(state.startMarker);
    state.startMarker = L.marker([point.lat, point.lon], {
      icon: markerIcon("S", "start"),
      title: "Your Girivalam start and finish point",
      zIndexOffset: 900
    }).addTo(state.map);
    state.startMarker.bindPopup("<strong>Your Girivalam start / finish</strong>");
    el.goToStart?.classList.remove("is-hidden");
    updateStartNavigationUrl();
    updateProgressUi();
  }

  async function drawWalkingConnector() {
    if (!state.location || !state.startPoint || state.connectorBusy) return;
    const airDistance = distanceMetres(state.location, state.startPoint);
    if (airDistance < START_RADIUS_METRES) {
      clearConnector();
      return;
    }

    if (state.connectorLayer) state.map.removeLayer(state.connectorLayer);
    state.connectorLayer = null;

    if (airDistance > 45000) {
      setStatus("Start point found");
      return;
    }

    state.connectorBusy = true;
    try {
      const route = await requestRoute(
        [
          { lat: state.location.lat, lon: state.location.lon },
          state.startPoint
        ],
        {}
      );
      const line = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      const halo = L.polyline(line, {
        color: "#ffffff", weight: 8, opacity: 0.95, lineCap: "round"
      });
      const colouredLine = L.polyline(line, {
        color: "#287db8", weight: 4, opacity: 1, dashArray: "7 8", lineCap: "round"
      });
      state.connectorLayer = L.layerGroup([halo, colouredLine]).addTo(state.map);
      const connectorBounds = L.latLngBounds(line);
      state.routePoints.forEach((point) => connectorBounds.extend([point.lat, point.lon]));
      state.map.fitBounds(connectorBounds.pad(0.1), { maxZoom: 14 });
      setStatus("Follow the blue line to your start point");
    } catch (error) {
      setStatus("Start point ready — open walking directions");
      const button = el.goToStart;
      if (button) button.setAttribute("aria-label", "Open walking directions to start point");
    } finally {
      state.connectorBusy = false;
    }
  }

  function clearConnector() {
    if (state.connectorLayer) {
      state.map.removeLayer(state.connectorLayer);
      state.connectorLayer = null;
    }
  }

  function setInitialStart(location) {
    const closest = projectToCircuit(location);
    if (!closest) return;
    setStartPoint(closest);

    const gap = closest.distance;
    if (gap <= START_RADIUS_METRES) {
      setStatus("You are at your start point");
    } else if (gap <= 45000) {
      setStatus("Follow the blue route to your start point");
      drawWalkingConnector();
    } else {
      setStatus("Start point selected — navigate to Tiruvannamalai");
    }
  }

  function routeProgressAt(location) {
    return projectToCircuit(location);
  }

  function beginWalk() {
    if (!state.startPoint || !state.location || !state.routeReady) return;
    if (state.locationAccuracy > GPS_MAX_ACCURACY_METRES) {
      setStatus("Waiting for a better GPS signal");
      return;
    }

    const projection = projectToCircuit(state.location);
    if (!projection) return;

    if (!state.walkStarted) {
      const gap = distanceMetres(state.location, state.startPoint);
      if (gap > START_RADIUS_METRES) {
        setStatus("Move closer to your marked start point");
        return;
      }
      state.walkedMetres = 0;
      state.lastAlong = state.startAlong;
      state.walkStarted = true;
    } else {
      if (projection.distance > OFF_ROUTE_METRES) {
        setStatus("Return to the marked Girivalam path");
        return;
      }
      state.lastAlong = projection.along;
    }

    state.tracking = true;
    state.completed = false;
    clearConnector();
    setStatus("Girivalam in progress");
    updateProgressUi();
  }

  function stopWalk() {
    state.tracking = false;
    setStatus("Walk paused");
    updateProgressUi();
  }

  function maybeCompleteWalk(location, projection) {
    if (!state.tracking || state.completed || !projection) return;
    const fromStart = distanceMetres(location, state.startPoint);
    if (state.walkedMetres >= state.routeLength - 65 && fromStart <= FINISH_RADIUS_METRES) {
      state.tracking = false;
      state.completed = true;
      state.walkedMetres = state.routeLength;
      setStatus("Girivalam complete");
      updateProgressUi();
    }
  }

  function updateWalkProgress(location) {
    if (!state.tracking) return;
    const projection = routeProgressAt(location);
    if (!projection) return;

    if (projection.distance > OFF_ROUTE_METRES) {
      setStatus("Return to the marked Girivalam path");
      return;
    }

    if (state.lastAlong == null) {
      state.lastAlong = projection.along;
      return;
    }

    let delta = projection.along - state.lastAlong;
    if (delta < -state.routeLength / 2) delta += state.routeLength;
    if (delta > state.routeLength / 2) delta -= state.routeLength;

    if (delta < -7) {
      setStatus("Continue clockwise around Arunachala");
      return;
    }
    if (delta > MAX_PROGRESS_JUMP_METRES) {
      state.lastAlong = projection.along;
      setStatus("GPS signal updated");
      return;
    }

    if (delta > 0) state.walkedMetres = Math.min(state.routeLength, state.walkedMetres + delta);
    state.lastAlong = projection.along;
    maybeCompleteWalk(location, projection);
    updateProgressUi();
  }

  function onPosition(position) {
    const coords = position.coords;
    const location = { lat: coords.latitude, lon: coords.longitude };
    state.location = location;
    state.locationAccuracy = Number.isFinite(coords.accuracy) ? coords.accuracy : 9999;
    drawUserPosition(location);

    if (state.tracking) {
      if (state.locationAccuracy <= GPS_MAX_ACCURACY_METRES) {
        updateWalkProgress(location);
      } else {
        setStatus("Waiting for a better GPS signal");
      }
    } else if (state.routeReady && !state.startPoint) {
      setInitialStart(location);
    } else if (state.routeReady && state.startPoint) {
      const gap = distanceMetres(location, state.startPoint);
      if (!state.walkStarted && gap <= START_RADIUS_METRES) {
        clearConnector();
        setStatus("You are at your start point");
      }
      updateProgressUi();
    }

    const now = Date.now();
    if (!state.tracking && now - state.lastUiUpdate > 5000) {
      state.lastUiUpdate = now;
      if (state.startPoint && distanceMetres(location, state.startPoint) > START_RADIUS_METRES) {
        updateStartNavigationUrl();
      }
    }
  }

  function onPositionError(error) {
    const messages = {
      1: "Location permission is needed to find your start point",
      2: "Your location is temporarily unavailable",
      3: "GPS timed out — move to an open area and retry"
    };
    setStatus(messages[error.code] || "Unable to read GPS location");
    setError(error.code === 1 ? "Allow location access in your browser settings, then tap the location button." : "");
  }

  function updateStartNavigationUrl() {
    if (!el.goToStart || !state.startPoint) return;
    el.goToStart.onclick = () => {
      if (state.location && distanceMetres(state.location, state.startPoint) > START_RADIUS_METRES) {
        window.open(makeNavigationUrl(state.startPoint), "_blank", "noopener");
      } else {
        state.map.setView([state.startPoint.lat, state.startPoint.lon], 17, { animate: true });
        state.startMarker?.openPopup();
      }
    };
  }

  function requestCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus("GPS is not available in this browser");
      setError("Open this map over HTTPS and use a browser with location support.");
      return;
    }
    setStatus("Waiting for your location");
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onPosition(position);
        if (state.watchId == null) {
          state.watchId = navigator.geolocation.watchPosition(
            onPosition,
            onPositionError,
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
          );
        }
      },
      onPositionError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  }

  async function loadCircuit() {
    setStatus("Loading the walking circuit");
    try {
      const closedLoopStops = [...ROUTE_STOPS, ROUTE_STOPS[0]];
      const radiuses = closedLoopStops.map(() => "180").join(";");
      const route = await requestRoute(closedLoopStops, { radiuses });
      drawCircuit(route);
      if (el.retryButton) el.retryButton.hidden = true;
      setError("");
      if (state.location) setInitialStart(state.location);
      setStatus(state.location ? "Nearest start point selected" : "Circuit ready — waiting for location");
      updateProgressUi();
    } catch (error) {
      setStatus("The walking route could not be loaded");
      setError("Map route data is temporarily unavailable. Please try again.");
      if (el.retryButton) el.retryButton.hidden = false;
    }
  }

  function centreOnUser() {
    if (!state.location) {
      requestCurrentLocation();
      return;
    }
    state.map.setView([state.location.lat, state.location.lon], 17, { animate: true });
    state.userMarker?.openPopup();
  }

  function toggleFullscreen() {
    const target = byId("liveGirivalamMap");
    if (!target) return;
    if (!document.fullscreenElement) {
      target.requestFullscreen?.().then(() => state.map.invalidateSize()).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => state.map.invalidateSize()).catch(() => {});
    }
  }

  function wireControls() {
    el.status = byId("mapStatus");
    el.error = byId("mapError");
    el.walked = byId("walkedDistance");
    el.total = byId("totalDistance");
    el.startButton = byId("startOrFinishWalk");
    el.goToStart = byId("goToStart");
    el.retryButton = byId("retryCircuit");

    el.startButton?.addEventListener("click", () => {
      if (state.tracking) {
        stopWalk();
      } else {
        beginWalk();
      }
    });
    el.goToStart?.addEventListener("click", () => {
      if (state.startPoint) {
        state.map.setView([state.startPoint.lat, state.startPoint.lon], 17, { animate: true });
      }
    });
    byId("centreMap")?.addEventListener("click", centreOnUser);
    byId("fullscreenMap")?.addEventListener("click", toggleFullscreen);
    el.retryButton?.addEventListener("click", loadCircuit);

    document.addEventListener("fullscreenchange", () => {
      window.setTimeout(() => state.map?.invalidateSize(), 250);
    });
  }

  function initialise() {
    const container = byId("liveGirivalamMap");
    if (!container || !window.L) {
      setStatus("Map could not load");
      return;
    }

    state.map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: true,
      preferCanvas: true
    }).setView(MAP_CENTRE, 13);

    makeBaseLayers();
    showStopMarkers();
    wireControls();

    const allPoints = ROUTE_STOPS.map((stop) => [stop.lat, stop.lon]);
    state.map.fitBounds(L.latLngBounds(allPoints).pad(0.1));
    window.setTimeout(() => state.map.invalidateSize(), 150);

    requestCurrentLocation();
    loadCircuit();
  }

  document.addEventListener("DOMContentLoaded", initialise);
})();