/* Live Girivalam map-only GPS experience.
 * Route shape: public OpenStreetMap foot-routing service.
 * Live GPS progress is local. The current coordinate is sent to the public
 * foot-routing endpoint only when requesting the walking connector to start.
 */
(() => {
  "use strict";

  const MAP_CENTRE = [12.2388, 79.0525];
  const MAP_MAX_ZOOM = 21;
  const MAP_NATIVE_MAX_ZOOM = 19;
  const ESRI_IMAGERY_NATIVE_ZOOM = 18;
  const ADI_APPROACH_METRES = 600;
  const ADI_ARRIVAL_METRES = 90;
  const EXPECTED_CIRCUIT_KM = 14;
  const ROUTING_BASE = "https://routing.openstreetmap.de/routed-foot/route/v1/driving";
  const GPS_MAX_ACCURACY_METRES = 65;
  const OFF_ROUTE_METRES = 85;
  const START_RADIUS_METRES = 42;
  const START_RADIUS_MAX_METRES = 73;
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

  const SPIRITUAL_PLACES = [
    {
      id: "ramanasramam", code: "R", name: "Sri Ramanasramam", kind: "ashram",
      lat: 12.22369, lon: 79.05672, approximate: false,
      description: "The ashram associated with Sri Ramana Maharshi. Visit quietly and follow the ashram's visitor guidance."
    },
    {
      id: "seshadri-ashram", code: "S", name: "Sri Seshadri Swamigal Ashram", kind: "ashram",
      lat: 12.22455, lon: 79.05890, approximate: true,
      description: "A spiritual stop close to Sri Ramanasramam on Chengam Road. The pin is approximate; confirm the entrance locally."
    },
    {
      id: "yogi-ashram", code: "Y", name: "Yogi Ramsuratkumar Ashram", kind: "ashram",
      lat: 12.21841, lon: 79.05390, approximate: false,
      description: "An ashram associated with Yogi Ramsuratkumar. Check current visitor access before stopping."
    },
    {
      id: "virupaksha-cave", code: "V", name: "Virupaksha Cave", kind: "cave",
      lat: 12.23386, lon: 79.06167, approximate: false,
      description: "A historic meditation cave on Arunachala Hill. The approach is uphill; check access and conditions before climbing."
    },
    {
      id: "skandashramam", code: "K", name: "Skandashramam", kind: "cave",
      lat: 12.23452, lon: 79.06068, approximate: false,
      description: "A hillside ashram associated with Sri Ramana Maharshi. The route is uphill from the Ramanasramam side; check access before setting out."
    }
  ];

  const MAIN_TEMPLE = { lat: 12.23184, lon: 79.06683 };

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
    connectorBusy: false,
    adiAlong: null,
    adiCueStage: 0,
    lingamAlong: [],
    lingamCueId: null,
    lingamCueStage: 0,
    nearbyCueIds: new Set(),
    templeGuideDismissed: false,
    voiceEnabled: false
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

  function startDistanceToleranceMetres() {
    const accuracy = Number.isFinite(state.locationAccuracy)
      ? Math.max(0, state.locationAccuracy)
      : GPS_MAX_ACCURACY_METRES;
    return Math.min(START_RADIUS_MAX_METRES, Math.max(START_RADIUS_METRES, accuracy + 8));
  }

  function tileOptions(options = {}) {
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

  function makeBaseLayers() {
    const street = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      tileOptions({
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      })
    );
    const imagery = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      tileOptions({
        // Do not request higher local zoom tiles that Esri fills with a
        // "Map data not yet available" graphic. Leaflet upscales level 18 instead.
        maxNativeZoom: ESRI_IMAGERY_NATIVE_ZOOM,
        attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
      })
    );
    const labels = L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      tileOptions({ maxNativeZoom: 19, attribution: "Labels &copy; Esri" })
    );
    const satelliteWithLabels = L.layerGroup([imagery, labels]);
    satelliteWithLabels.addTo(state.map);

    // Zooms beyond a provider's native tile level are served from its last
    // native zoom and scaled by Leaflet, rather than requesting missing tiles.
    // If the imagery endpoint itself fails repeatedly, switch to a street map.
    let imageryErrors = 0;
    imagery.on("tileload", () => {
      imageryErrors = Math.max(0, imageryErrors - 1);
    });
    imagery.on("tileerror", () => {
      imageryErrors += 1;
      if (imageryErrors < 7 || !state.map.hasLayer(satelliteWithLabels)) return;
      state.map.removeLayer(satelliteWithLabels);
      street.addTo(state.map);
      setStatus("Satellite imagery is temporarily unavailable. Street map is shown instead; choose Satellite in map layers to retry.");
    });

    L.control.layers(
      { "Satellite (default)": satelliteWithLabels, "Street": street },
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
      const isAdi = stop.id === "adi";
      const isMainTemple = stop.id === "main-temple";
      const marker = L.marker([stop.lat, stop.lon], {
        icon: markerIcon(isAdi ? "A" : stop.number, isAdi ? "adi" : isMainTemple ? "temple" : "lingam"),
        title: stop.name,
        keyboard: true,
        riseOnHover: true
      }).addTo(state.map);

      const apple = makeNavigationUrl(stop, "apple");
      const google = makeNavigationUrl(stop, "google");
      if (isAdi) {
        marker.bindPopup(
          `<div class="adi-map-popup"><span class="adi-popup-kicker">IMPORTANT GIRIVALAM STOP · PLEASE DO NOT MISS</span><strong>ஆதி அண்ணாமலையார் திருக்கோயில்<br>Adi Annamalaiyar Temple</strong><p>A major temple on the Girivalam path at Adi Annamalai. Please plan a stop here for darshan before continuing your walk.</p><div class="adi-popup-links"><a href="${apple}" target="_blank" rel="noopener noreferrer">Apple Maps ↗</a><a href="${google}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a></div></div>`
        );
      } else if (isMainTemple) {
        marker.bindPopup(
          `<div class="temple-marker-popup"><strong>Arunachaleswarar Temple · Main entrance</strong><p>Allow time for darshan at Annamalaiyar and Unnamulai Amman. Look for Pathala Lingam, Kambathu Ilayanar, Periya Nandi, Sivaganga Theertham and Vinayagar, Sambandha Vinayagar, Gopura Ilayanar, Kalyana Sundareswarar, the Thousand-Pillared Hall and the historic gopurams.</p><p>Indoor GPS cannot pinpoint individual shrines. Ask temple staff for directions and follow access notices.</p><p><a href="${apple}" target="_blank" rel="noopener noreferrer">Apple Maps ↗</a> · <a href="${google}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a></p></div>`
        );
      } else {
        marker.bindPopup(
          `<div><strong>${stop.name}</strong><br><small>${stop.direction}</small><p><a href="${apple}" target="_blank" rel="noopener noreferrer">Apple Maps ↗</a> · <a href="${google}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a></p></div>`
        );
      }
      state.stopMarkers.push(marker);
    });

    SPIRITUAL_PLACES.forEach((place) => {
      const marker = L.marker([place.lat, place.lon], {
        icon: markerIcon(place.code, place.kind),
        title: place.name,
        keyboard: true,
        riseOnHover: true
      }).addTo(state.map);
      const apple = makeNavigationUrl(place, "apple");
      const google = makeNavigationUrl(place, "google");
      const pinNote = place.approximate
        ? "<p><em>Approximate map point — confirm the entrance locally.</em></p>"
        : "";
      marker.bindPopup(
        `<div class="spiritual-place-popup"><strong>${place.name}</strong><p>${place.description}</p>${pinNote}<p><a href="${apple}" target="_blank" rel="noopener noreferrer">Apple Maps ↗</a> · <a href="${google}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a></p></div>`
      );
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
    SPIRITUAL_PLACES.forEach((place) => bounds.extend([place.lat, place.lon]));
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
    const adiStop = ROUTE_STOPS.find((stop) => stop.id === "adi");
    const adiProjection = adiStop ? projectToCircuit(adiStop) : null;
    state.adiAlong = adiProjection ? adiProjection.along : null;
    state.adiCueStage = 0;
    state.lingamAlong = ROUTE_STOPS
      .filter((stop) => ["indra", "agni", "yama", "niruthi", "varuna", "vayu", "kubera", "esanya"].includes(stop.id))
      .map((stop) => {
        const projection = projectToCircuit(stop);
        return projection ? { ...stop, along: projection.along } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.along - b.along);
    state.lingamCueId = null;
    state.lingamCueStage = 0;

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

  function makeNavigationUrl(destination, provider = "apple") {
    const origin = state.location
      ? `${state.location.lat},${state.location.lon}`
      : "";
    if (provider === "apple") {
      const url = new URL("https://maps.apple.com/");
      url.searchParams.set("daddr", `${destination.lat},${destination.lon}`);
      url.searchParams.set("dirflg", "w");
      if (origin) url.searchParams.set("saddr", origin);
      return url.toString();
    }
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
    // Keep the control tappable once a start point is selected. The click handler
    // explains what is missing (GPS accuracy / distance) instead of silently
    // presenting a disabled button that appears broken.
    const canRespond = state.tracking || (
      state.routeReady && Boolean(state.startPoint) && Boolean(state.location)
    );
    button.disabled = !canRespond || state.completed;
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
    const appleStartUrl = makeNavigationUrl(state.startPoint, "apple");
    const googleStartUrl = makeNavigationUrl(state.startPoint, "google");
    state.startMarker.bindPopup(
      `<div><strong>Your Girivalam start / finish</strong><p><a href="${appleStartUrl}" target="_blank" rel="noopener noreferrer">Apple Maps ↗</a> · <a href="${googleStartUrl}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a></p></div>`
    );
    el.goToStart?.classList.remove("is-hidden");
    updateStartNavigationUrl();
    updateProgressUi();
  }

  async function drawWalkingConnector() {
    if (!state.location || !state.startPoint || state.connectorBusy) return;
    const airDistance = distanceMetres(state.location, state.startPoint);
    if (airDistance <= startDistanceToleranceMetres()) {
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
    if (gap <= startDistanceToleranceMetres()) {
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

  function speakGuidance(message) {
    if (!state.voiceEnabled || !window.speechSynthesis ||
        typeof window.SpeechSynthesisUtterance !== "function") return;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(message);
    utterance.lang = "en-IN";
    utterance.rate = 0.96;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function updateAdiGuidance(projection) {
    if (state.adiAlong == null || !state.routeLength || !projection) return;
    const metresAhead = (state.adiAlong - projection.along + state.routeLength) % state.routeLength;

    // Once the pilgrim has received the approach / arrival cue and moved past
    // the shrine, replace the arrival message with a clear "passed" reminder.
    if (state.adiCueStage >= 1 && state.adiCueStage < 3 &&
        metresAhead >= state.routeLength - ADI_ARRIVAL_METRES) {
      state.adiCueStage = 3;
      const passedMessage = "Adi Annamalaiyar Temple is now behind you. If you have not visited, consider returning safely before continuing the Girivalam walk.";
      setStatus(passedMessage);
      speakGuidance("You have passed Adi Annamalaiyar Temple. If you have not visited, please consider returning safely before continuing.");
      return;
    }

    let stage = 0;
    if (metresAhead <= ADI_ARRIVAL_METRES) stage = 2;
    else if (metresAhead <= ADI_APPROACH_METRES) stage = 1;
    if (stage === 0 || stage <= state.adiCueStage) return;

    state.adiCueStage = stage;
    const message = stage === 2
      ? "You are near Adi Annamalaiyar Temple, ஆதி அண்ணாமலையார் திருக்கோயில். Please stop and visit this important Girivalam temple before continuing."
      : `Important Girivalam stop ahead: Adi Annamalaiyar Temple in about ${Math.max(50, Math.round(metresAhead / 50) * 50)} metres. Please plan to stop and visit before continuing clockwise.`;
    setStatus(message);
    speakGuidance(stage === 2
      ? "You are approaching Adi Annamalaiyar Temple. Please stop and visit this important temple before continuing the Girivalam walk."
      : `Adi Annamalaiyar Temple is coming up in approximately ${Math.round(metresAhead)} metres. Please make time to visit this important temple.`);
  }

  function updateNextLingamGuidance(projection) {
    if (!state.routeLength || !projection || !state.lingamAlong.length) return;

    if (state.lingamCueId) {
      const previous = state.lingamAlong.find((stop) => stop.id === state.lingamCueId);
      if (previous) {
        const metresAheadOfPrevious = (previous.along - projection.along + state.routeLength) % state.routeLength;
        if (metresAheadOfPrevious >= state.routeLength - 120) {
          state.lingamCueId = null;
          state.lingamCueStage = 0;
        }
      }
    }

    const upcoming = state.lingamAlong
      .map((stop) => ({
        ...stop,
        metresAhead: (stop.along - projection.along + state.routeLength) % state.routeLength
      }))
      .sort((a, b) => a.metresAhead - b.metresAhead)[0];
    if (!upcoming || upcoming.metresAhead > 550) return;

    if (state.lingamCueId !== upcoming.id) {
      state.lingamCueId = upcoming.id;
      state.lingamCueStage = 0;
    }

    const stage = upcoming.metresAhead <= 90 ? 2 : 1;
    if (stage <= state.lingamCueStage) return;
    state.lingamCueStage = stage;

    const message = stage === 2
      ? `You are near ${upcoming.name}. This is Ashta Lingam stop ${upcoming.number}, in the ${upcoming.direction} direction. Please stop for darshan before continuing clockwise.`
      : `Next Ashta Lingam: ${upcoming.name}, approximately ${Math.round(upcoming.metresAhead / 25) * 25} metres ahead. Please plan a short stop for darshan.`;
    setStatus(message);
    speakGuidance(stage === 2
      ? `You are near ${upcoming.name}. Please stop for darshan.`
      : `The next Lingam is ${upcoming.name}, about ${Math.round(upcoming.metresAhead)} metres ahead.`);
  }

  function updateNearbyPlaceGuidance(location) {
    if (!location) return;

    const mainDistance = distanceMetres(location, MAIN_TEMPLE);
    if (mainDistance <= 450) {
      if (el.templeGuide && !state.templeGuideDismissed) el.templeGuide.hidden = false;
      if (!state.nearbyCueIds.has("main-temple")) {
        state.nearbyCueIds.add("main-temple");
        setStatus("You are near Arunachaleswarar Temple. Allow time for the main darshan and the important temple highlights shown on the map.");
        speakGuidance("You are approaching Arunachaleswarar Temple. Please allow time for the main darshan and the important shrines and halls inside.");
      }
    } else if (mainDistance > 900) {
      state.nearbyCueIds.delete("main-temple");
      state.templeGuideDismissed = false;
      if (el.templeGuide) el.templeGuide.hidden = true;
    }

    const nearby = SPIRITUAL_PLACES
      .map((place) => ({ ...place, distance: distanceMetres(location, place) }))
      .sort((a, b) => a.distance - b.distance);
    const closest = nearby[0];
    SPIRITUAL_PLACES.forEach((place) => {
      const distance = distanceMetres(location, place);
      if (distance > 800) state.nearbyCueIds.delete(place.id);
    });
    if (closest && closest.distance <= 380 && !state.nearbyCueIds.has(closest.id)) {
      state.nearbyCueIds.add(closest.id);
      const message = closest.kind === "cave"
        ? `You are near ${closest.name}. This is an uphill hill-path visit. Check the current access and conditions before climbing.`
        : `You are near ${closest.name}. Consider stopping for a quiet visit if it is open.`;
      setStatus(message);
      speakGuidance(message);
    }
  }

  function toggleVoiceGuidance() {
    const speechAvailable = window.speechSynthesis &&
      typeof window.SpeechSynthesisUtterance === "function";
    if (!speechAvailable) {
      setStatus("Voice guidance is unavailable in this browser. Temple approach messages will still appear on the map.");
      return;
    }

    state.voiceEnabled = !state.voiceEnabled;
    if (el.voiceButton) {
      el.voiceButton.classList.toggle("is-active", state.voiceEnabled);
      el.voiceButton.setAttribute("aria-pressed", String(state.voiceEnabled));
      el.voiceButton.setAttribute("aria-label", state.voiceEnabled ? "Turn off voice guidance" : "Turn on voice guidance");
      el.voiceButton.title = state.voiceEnabled ? "Voice guidance on" : "Voice guidance off";
    }
    if (state.voiceEnabled) {
      const message = "Voice guidance is on. You will hear reminders for the next Lingam, Adi Annamalaiyar Temple and nearby spiritual places.";
      setStatus(message);
      speakGuidance(message);
    } else {
      window.speechSynthesis.cancel();
      setStatus("Voice guidance is off. Visual reminders for Lingams, ashrams and temple visits will still appear on the map.");
    }
  }

  function beginWalk() {
    if (!state.routeReady) {
      setStatus("The Girivalam route is still loading");
      return;
    }
    if (!state.startPoint || !state.location) {
      setStatus("Waiting for your GPS location");
      requestCurrentLocation();
      return;
    }
    if (!Number.isFinite(state.locationAccuracy) || state.locationAccuracy > GPS_MAX_ACCURACY_METRES) {
      const accuracy = Number.isFinite(state.locationAccuracy)
        ? Math.round(state.locationAccuracy)
        : null;
      setStatus(accuracy === null
        ? "Waiting for a reliable GPS signal"
        : `GPS accuracy is about ±${accuracy} m — move to an open area and try again`);
      return;
    }

    const projection = projectToCircuit(state.location);
    if (!projection) {
      setStatus("Your position could not be matched to the walking route");
      return;
    }

    if (!state.walkStarted) {
      const gap = distanceMetres(state.location, state.startPoint);
      const allowedDistance = startDistanceToleranceMetres();
      if (gap > allowedDistance || projection.distance > allowedDistance) {
        setStatus(`You are about ${Math.round(gap)} m from the S marker. Move within ${Math.round(allowedDistance)} m to start`);
        return;
      }
      state.walkedMetres = 0;
      state.lastAlong = state.startAlong;
      state.walkStarted = true;
    } else {
      if (projection.distance > OFF_ROUTE_METRES) {
        setStatus("Return to the marked Girivalam path before resuming");
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
    updateAdiGuidance(projection);
    updateNextLingamGuidance(projection);
    maybeCompleteWalk(location, projection);
    updateProgressUi();
  }

  function onPosition(position) {
    const coords = position.coords;
    const location = { lat: coords.latitude, lon: coords.longitude };
    state.location = location;
    state.locationAccuracy = Number.isFinite(coords.accuracy) ? coords.accuracy : 9999;
    drawUserPosition(location);
    updateNearbyPlaceGuidance(location);

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
      if (!state.walkStarted && gap <= startDistanceToleranceMetres()) {
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
      3: "GPS timed out — waiting for another location update"
    };
    if (error.code === 1 && state.watchId !== null) {
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
    }
    setStatus(messages[error.code] || "Unable to read GPS location");
    setError(error.code === 1 ? "Allow location access in your browser settings, then tap the location button." : "");
  }

  function updateStartNavigationUrl() {
    if (!el.goToStart || !state.startPoint) return;
    const needsDirections = state.location &&
      distanceMetres(state.location, state.startPoint) > startDistanceToleranceMetres();
    el.goToStart.setAttribute(
      "aria-label",
      needsDirections ? "Open walking directions to your start point" : "Show your Girivalam start point"
    );
    el.goToStart.title = needsDirections ? "Navigate to start" : "Show start point";
  }

  function requestCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus("GPS is not available in this browser");
      setError("Open this map over HTTPS and use a browser with location support.");
      return;
    }
    setStatus("Waiting for your GPS location");
    setError("");
    if (state.watchId !== null) return;

    try {
      // Start the continuous watch immediately. Unlike a one-shot position
      // request, a timeout does not leave the page without future GPS updates.
      state.watchId = navigator.geolocation.watchPosition(
        onPosition,
        onPositionError,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 }
      );
    } catch (error) {
      state.watchId = null;
      setStatus("Unable to start GPS tracking");
      setError("Check the browser's location permission and try again.");
    }
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
      if (state.location) {
        setInitialStart(state.location);
      } else {
        setStatus("Circuit ready — waiting for location");
      }
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
    const target = document.querySelector(".map-app");
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
    el.voiceButton = byId("voiceGuidance");
    el.templeGuide = byId("templeGuideCard");
    byId("closeTempleGuide")?.addEventListener("click", () => {
      state.templeGuideDismissed = true;
      if (el.templeGuide) el.templeGuide.hidden = true;
    });

    el.startButton?.addEventListener("click", () => {
      if (state.tracking) {
        stopWalk();
      } else {
        beginWalk();
      }
    });
    el.goToStart?.addEventListener("click", () => {
      if (!state.startPoint) return;
      const needsDirections = state.location &&
        distanceMetres(state.location, state.startPoint) > startDistanceToleranceMetres();
      if (needsDirections) {
        const opened = window.open(makeNavigationUrl(state.startPoint, "apple"), "_blank", "noopener");
        if (!opened) setStatus("Allow pop-ups to open walking directions");
        return;
      }
      state.map.setView([state.startPoint.lat, state.startPoint.lon], 17, { animate: true });
      state.startMarker?.openPopup();
    });
    el.voiceButton?.addEventListener("click", toggleVoiceGuidance);
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
      maxZoom: MAP_MAX_ZOOM,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      preferCanvas: true
    }).setView(MAP_CENTRE, 13);

    makeBaseLayers();
    showStopMarkers();
    wireControls();

    const allPoints = [
      ...ROUTE_STOPS.map((stop) => [stop.lat, stop.lon]),
      ...SPIRITUAL_PLACES.map((place) => [place.lat, place.lon])
    ];
    state.map.fitBounds(L.latLngBounds(allPoints).pad(0.1));
    window.setTimeout(() => state.map.invalidateSize(), 150);

    requestCurrentLocation();
    loadCircuit();
  }

  document.addEventListener("DOMContentLoaded", initialise);
})();