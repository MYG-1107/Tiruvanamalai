/* Visitor companion for the Tiruvannamalai home map.
 * Adds the Ashta Lingams, nearby ashrams/caves, location-aware advice and
 * Wikimedia Commons sample photographs with source/licence attribution.
 */
(() => {
  "use strict";

  if (document.body.dataset.page !== "home") return;

  const ASHTA_LINGAMS = GIRIVALAM_STOPS.map((stop) => ({
    ...stop,
    name: stop.id === "indra-lingam" ? "Indra Lingam" : stop.name,
    category: "Ashta Lingam"
  }));

  // Public map-derived orientation points. Verify the exact entrance locally.
  const SPIRITUAL_PLACES = [
    {
      id: "ramanasramam",
      code: "R",
      name: "Sri Ramanasramam",
      tamil: "ஸ்ரீ ரமணாசிரமம்",
      kind: "ashram",
      lat: 12.22369,
      lon: 79.05672,
      approximate: false,
      description: "Visit the ashram associated with Sri Ramana Maharshi. Keep silence where requested and follow the ashram's visitor guidance.",
      advice: "You are near Sri Ramanasramam. Consider setting aside time for a quiet visit; please follow the ashram's visitor guidance."
    },
    {
      id: "seshadri-ashram",
      code: "S",
      name: "Sri Seshadri Swamigal Ashram",
      tamil: "ஸ்ரீ சேஷாத்ரி சுவாமிகள் ஆசிரமம்",
      kind: "ashram",
      lat: 12.22455,
      lon: 79.05890,
      approximate: true,
      description: "A nearby spiritual stop on Chengam Road, close to Sri Ramanasramam. The pin is approximate; confirm the entrance with local signboards.",
      advice: "Sri Seshadri Swamigal Ashram is nearby. Look for the entrance sign and check visitor access locally."
    },
    {
      id: "yogi-ramsuratkumar-ashram",
      code: "Y",
      name: "Yogi Ramsuratkumar Ashram",
      tamil: "யோகி ராம்சுரத்குமார் ஆசிரமம்",
      kind: "ashram",
      lat: 12.21841,
      lon: 79.05390,
      approximate: false,
      description: "An ashram on the Chengam Road side of Tiruvannamalai, associated with Yogi Ramsuratkumar.",
      advice: "You are approaching Yogi Ramsuratkumar Ashram. Consider stopping for a visit if it is open."
    },
    {
      id: "virupaksha-cave",
      code: "V",
      name: "Virupaksha Cave",
      tamil: "விருப்பாக்ஷ குகை",
      kind: "cave",
      lat: 12.23386,
      lon: 79.06167,
      approximate: false,
      description: "A historic meditation cave on Arunachala Hill associated with Sri Ramana Maharshi. The approach is a hill path; check access and conditions before climbing.",
      advice: "Virupaksha Cave is close by on the hill. This is a climb, so check the path, opening access and your fitness before proceeding."
    },
    {
      id: "skandashramam",
      code: "K",
      name: "Skandashramam",
      tamil: "ஸ்கந்தாசிரமம்",
      kind: "cave",
      lat: 12.23452,
      lon: 79.06068,
      approximate: false,
      description: "A quiet hillside ashram associated with Sri Ramana Maharshi. Reach it by the marked hill path from the Ramanasramam side; the walk is uphill.",
      advice: "Skandashramam is nearby on Arunachala Hill. It requires an uphill walk; check current access and allow enough time."
    }
  ];

  const MAIN_TEMPLE = {
    id: "arunachaleswarar",
    name: "Arulmigu Arunachaleswarar Temple",
    lat: 12.23184,
    lon: 79.06683
  };

  const TEMPLE_HIGHLIGHTS = [
    ["Arunachaleswarar (Annamalaiyar)", "The main Shiva sanctum."],
    ["Unnamulai Amman Shrine", "The Goddess shrine; allow time for darshan."],
    ["Pathala Lingam", "The underground shrine associated with Ramana Maharshi's early days in Tiruvannamalai."],
    ["Kambathu Ilayanar", "The Murugan shrine associated with the pillar legend."],
    ["Periya Nandi", "The great Nandi facing the main sanctum."],
    ["Sivaganga Theertham and Vinayagar", "The sacred tank and nearby Vinayagar shrine."],
    ["Sambandha Vinayagar", "A Vinayagar shrine in the outer courtyard."],
    ["Gopura Ilayanar", "A Murugan shrine near one of the temple gopurams."],
    ["Kalyana Sundareswarar", "A shrine of Shiva in the wedding form."],
    ["Thousand-Pillared Hall", "Look at the stone pillars and the historic mandapa."],
    ["Historic gopurams", "Notice the Raja Gopuram, Vallala Maharaja, Kili and Ammani Amman towers."]
  ];

  const IMAGE_REQUESTS = [
    { title: "Sri Ramanasramam", search: "Sri Ramanasramam Tiruvannamalai" },
    { title: "Skandashramam", search: "Skandashramam Tiruvannamalai" },
    { title: "Virupaksha Cave", search: "Virupaksha Cave Tiruvannamalai" },
    { title: "Arunachaleswarar Temple", search: "Arunachaleswarar Temple Tiruvannamalai" }
  ];

  const visitorMarkers = new Map();
  let latestLocation = userCoordinates || null;
  let locationWatchId = null;
  let lastAdviceId = "";

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  function directionsFor(point) {
    const destination = `${point.lat},${point.lon}`;
    const apple = new URL("https://maps.apple.com/");
    apple.searchParams.set("daddr", destination);
    apple.searchParams.set("dirflg", "w");
    const google = new URL("https://www.google.com/maps/dir/");
    google.searchParams.set("api", "1");
    google.searchParams.set("destination", destination);
    google.searchParams.set("travelmode", "walking");
    return { apple: apple.toString(), google: google.toString() };
  }

  function distanceMetres(pointA, pointB) {
    const radians = (value) => value * Math.PI / 180;
    const dLat = radians(pointB.lat - pointA.lat);
    const dLon = radians(pointB.lon - pointA.lon);
    const lat1 = radians(pointA.lat);
    const lat2 = radians(pointB.lat);
    const value = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function distanceLabel(point) {
    if (!latestLocation) return "Allow location access to see your distance.";
    const distance = distanceMetres(latestLocation, point);
    return distance < 1000
      ? `${Math.round(distance)} m away · direct estimate`
      : `${(distance / 1000).toFixed(1)} km away · direct estimate`;
  }

  function makeMarker(point, number, kind) {
    const marker = L.marker([point.lat, point.lon], {
      icon: makeNumberedIcon(number, kind),
      title: point.name,
      riseOnHover: true
    }).addTo(visitMap);
    const links = directionsFor(point);
    const subtitle = point.direction ? `${point.direction} · ` : "";
    const caution = point.approximate
      ? "<p class=\"pin-note\">Approximate map position — confirm the entrance locally.</p>"
      : "";
    marker.bindPopup(
      `<div class="map-popup visitor-map-popup"><strong>${escapeHtml(point.name)}</strong>` +
      `<p>${escapeHtml(subtitle + (point.description || point.note || ""))}</p>${caution}` +
      `<div class="map-popup-actions"><a href="${links.apple}" target="_blank" rel="noopener noreferrer">Apple Maps ↗</a>` +
      `<a href="${links.google}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a></div></div>`
    );
    visitorMarkers.set(point.id, marker);
    return marker;
  }

  function allMapPoints() {
    return [
      ...TEMPLE_PLACES.filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon)),
      ...ASHTA_LINGAMS,
      ...SPIRITUAL_PLACES
    ];
  }

  function fitAllVisitorPlaces() {
    if (!visitMap) return;
    const points = allMapPoints().map((place) => [place.lat, place.lon]);
    const current = latestLocation || userCoordinates;
    if (current && haversineKm(current, {
      lat: TIRUVANNAMALAI_CENTER[0],
      lon: TIRUVANNAMALAI_CENTER[1]
    }) <= MAX_LOCAL_FIT_DISTANCE_KM) {
      points.push([current.lat, current.lon]);
    }
    if (points.length) {
      visitMap.fitBounds(L.latLngBounds(points).pad(0.12), { maxZoom: 14 });
    }
  }

  function renderPlaceCard(point, number, category) {
    const links = directionsFor(point);
    const approximate = point.approximate
      ? '<p class="visitor-point-note">Approximate pin — confirm the entrance locally.</p>'
      : "";
    return `<article class="visitor-point-card">
      <span class="visitor-point-number">${escapeHtml(number)}</span>
      <div class="visitor-point-copy">
        <span class="visitor-point-category">${escapeHtml(category)}</span>
        <h4>${escapeHtml(point.name)}</h4>
        ${point.tamil ? `<p class="visitor-point-tamil">${escapeHtml(point.tamil)}</p>` : ""}
        <p>${escapeHtml(point.note || point.description || "")}</p>
        <p class="visitor-point-distance" data-visitor-distance="${escapeHtml(point.id)}">${distanceLabel(point)}</p>
        ${approximate}
        <div class="visitor-point-actions">
          <button type="button" data-visitor-focus="${escapeHtml(point.id)}">Show on map</button>
          <a href="${links.google}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>
          <a href="${links.apple}" target="_blank" rel="noopener noreferrer">Apple Maps ↗</a>
        </div>
      </div>
    </article>`;
  }

  function renderVisitorCards() {
    const lingamContainer = document.getElementById("lingamCards");
    const spiritualContainer = document.getElementById("spiritualPlaceCards");
    if (lingamContainer) {
      lingamContainer.innerHTML = ASHTA_LINGAMS.map((stop) =>
        renderPlaceCard(stop, stop.number, `ASHTA LINGAM · ${stop.direction.toUpperCase()}`)
      ).join("");
    }
    if (spiritualContainer) {
      spiritualContainer.innerHTML = SPIRITUAL_PLACES.map((place) =>
        renderPlaceCard(place, place.code, place.kind === "cave" ? "HILL CAVE / ASHRAM" : "ASHRAM")
      ).join("");
    }
    document.querySelectorAll("[data-visitor-focus]").forEach((button) => {
      button.addEventListener("click", () => focusVisitorPlace(button.dataset.visitorFocus));
    });
    updateVisitorDistances();
  }

  function focusVisitorPlace(id) {
    const marker = visitorMarkers.get(id);
    if (!marker || !visitMap) return;
    visitMap.setView(marker.getLatLng(), 16, { animate: true });
    marker.openPopup();
  }

  function updateVisitorDistances() {
    document.querySelectorAll("[data-visitor-distance]").forEach((element) => {
      const point = [...ASHTA_LINGAMS, ...SPIRITUAL_PLACES].find(
        (item) => item.id === element.dataset.visitorDistance
      );
      if (point) element.textContent = distanceLabel(point);
    });
  }

  function updateNearbyAdvice() {
    const panel = document.getElementById("nearbyAdvice");
    if (!panel || !latestLocation) return;

    const mainDistance = distanceMetres(latestLocation, MAIN_TEMPLE);
    const allPoints = [
      ...ASHTA_LINGAMS.map((point) => ({ ...point, type: "lingam" })),
      ...SPIRITUAL_PLACES.map((point) => ({ ...point, type: point.kind }))
    ];
    const closest = allPoints
      .map((point) => ({ ...point, distance: distanceMetres(latestLocation, point) }))
      .sort((a, b) => a.distance - b.distance)[0];

    let heading = "Your nearby pilgrimage guide";
    let message = "The map shows all eight Ashta Lingams and nearby spiritual places. Select any marker for directions.";

    if (mainDistance <= 550) {
      heading = "You are near Arunachaleswarar Temple";
      message = "Please allow time for darshan and the important places inside the temple. Use the temple visit checklist below; phone GPS cannot identify individual shrines indoors.";
    } else if (closest && closest.distance <= 650 && closest.type === "lingam") {
      heading = `You are near ${closest.name}`;
      message = `This is Lingam ${closest.number} of the traditional eight. Consider stopping for darshan before continuing clockwise. The next in sequence is ${ASHTA_LINGAMS[(ASHTA_LINGAMS.findIndex((item) => item.id === closest.id) + 1) % ASHTA_LINGAMS.length].name}.`;
    } else if (closest && closest.distance <= 650) {
      const place = SPIRITUAL_PLACES.find((item) => item.id === closest.id);
      heading = `You are near ${closest.name}`;
      message = place?.advice || "Consider visiting this spiritual place if it is open.";
    } else if (closest) {
      const distance = closest.distance < 1000
        ? `${Math.round(closest.distance)} metres`
        : `${(closest.distance / 1000).toFixed(1)} km`;
      heading = `Nearest recommended stop: ${closest.name}`;
      message = `About ${distance} away in a straight line. This is not a walking distance; open the map directions before setting out.`;
    }

    const identity = `${heading}|${message}`;
    if (identity !== lastAdviceId) {
      panel.querySelector("strong").textContent = heading;
      panel.querySelector("p").textContent = message;
      lastAdviceId = identity;
    }
  }

  function updateTempleGuideDistances() {
    if (typeof updateTempleDistances === "function") updateTempleDistances();
    updateVisitorDistances();
    updateNearbyAdvice();
  }

  function startLocationWatch() {
    if (!navigator.geolocation || locationWatchId !== null) return;
    locationWatchId = navigator.geolocation.watchPosition((position) => {
      latestLocation = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      userCoordinates = latestLocation;

      if (visitMap) {
        if (userMarker) {
          userMarker.setLatLng([latestLocation.lat, latestLocation.lon]);
        } else {
          userMarker = L.circleMarker([latestLocation.lat, latestLocation.lon], {
            radius: 8, color: "#fff", weight: 3, fillColor: "#2678b6", fillOpacity: 1
          }).addTo(visitMap).bindPopup("<strong>Your current location</strong>");
        }
        const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : 50;
        if (userAccuracyCircle) {
          userAccuracyCircle.setLatLng([latestLocation.lat, latestLocation.lon]);
          userAccuracyCircle.setRadius(Math.min(accuracy, 1500));
        } else {
          userAccuracyCircle = L.circle([latestLocation.lat, latestLocation.lon], {
            radius: Math.min(accuracy, 1500),
            color: "#2678b6", weight: 1, opacity: 0.55,
            fillColor: "#4d9bd3", fillOpacity: 0.1
          }).addTo(visitMap);
        }
      }
      updateTempleGuideDistances();
    }, () => {
      // The map and place cards remain useful when location is unavailable.
    }, { enableHighAccuracy: true, maximumAge: 12000, timeout: 25000 });
  }

  function renderTempleHighlights() {
    const list = document.getElementById("templeHighlightList");
    if (!list) return;
    list.innerHTML = TEMPLE_HIGHLIGHTS.map(([name, note], index) =>
      `<li><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(name)}</strong><p>${escapeHtml(note)}</p></div></li>`
    ).join("");
  }

  function plainMetadata(value) {
    return String(value || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function findCommonsImage(request) {
    const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
    endpoint.search = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `${request.search} filetype:bitmap`,
      gsrnamespace: "6",
      gsrlimit: "5",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "720",
      iiextmetadatafilter: "Artist|Credit|LicenseShortName",
      format: "json",
      origin: "*"
    }).toString();

    const response = await fetch(endpoint.toString(), {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`Wikimedia Commons returned ${response.status}`);
    const data = await response.json();
    const pages = Object.values(data.query?.pages || {})
      .filter((page) => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url);
    if (!pages.length) return null;

    const terms = request.search.toLowerCase().split(/\s+/).filter((term) => term.length > 3);
    pages.sort((a, b) => {
      const score = (page) => {
        const title = String(page.title || "").toLowerCase();
        return terms.reduce((total, term) => total + (title.includes(term) ? 1 : 0), 0);
      };
      return score(b) - score(a);
    });
    const page = pages[0];
    const info = page.imageinfo[0];
    const metadata = info.extmetadata || {};
    return {
      imageUrl: info.thumburl || info.url,
      sourceUrl: info.descriptionurl,
      alt: String(page.title || request.title).replace(/^File:/, "").replace(/_/g, " "),
      creator: plainMetadata(metadata.Artist?.value || metadata.Credit?.value) || "Wikimedia Commons contributor",
      license: plainMetadata(metadata.LicenseShortName?.value) || "See the file page for licence details"
    };
  }

  function appendGalleryCard(container, request, result) {
    const card = document.createElement("article");
    card.className = "place-image-card";
    if (result) {
      const link = document.createElement("a");
      link.href = result.sourceUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "place-image-link";
      const image = document.createElement("img");
      image.src = result.imageUrl;
      image.alt = result.alt;
      image.loading = "lazy";
      image.decoding = "async";
      image.onerror = () => {
        image.remove();
        const fallback = document.createElement("div");
        fallback.className = "place-image-fallback";
        fallback.textContent = "Image unavailable — open the Commons file page";
        link.prepend(fallback);
      };
      link.append(image);
      card.append(link);
      const title = document.createElement("h3");
      title.textContent = request.title;
      const credit = document.createElement("p");
      credit.textContent = `Photo: ${result.creator} · ${result.license}`;
      const source = document.createElement("a");
      source.href = result.sourceUrl;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "Original image and licence ↗";
      card.append(title, credit, source);
    } else {
      card.classList.add("place-image-card-empty");
      const title = document.createElement("h3");
      title.textContent = request.title;
      const message = document.createElement("p");
      message.textContent = "No suitable Wikimedia Commons image was found for this search.";
      card.append(title, message);
    }
    container.append(card);
  }

  async function loadPlaceGallery() {
    const container = document.getElementById("placeImageGallery");
    const status = document.getElementById("placeGalleryStatus");
    if (!container) return;

    for (const request of IMAGE_REQUESTS) {
      try {
        const result = await findCommonsImage(request);
        appendGalleryCard(container, request, result);
      } catch (error) {
        appendGalleryCard(container, request, null);
      }
    }
    if (status) {
      status.textContent = "Sample photographs load from Wikimedia Commons. Open each source link to see the photographer credit and reuse licence.";
    }
  }

  function initialiseVisitorGuide() {
    renderVisitorCards();
    renderTempleHighlights();
    loadPlaceGallery();
    if (!visitMap || !window.L) return;

    ASHTA_LINGAMS.forEach((stop) => makeMarker(stop, stop.number, "lingam"));
    SPIRITUAL_PLACES.forEach((place) => makeMarker(place, place.code, place.kind));
    window.fitAllVisitorPlaces = fitAllVisitorPlaces;
    fitAllVisitorPlaces();

    document.getElementById("homeMapFit")?.addEventListener("click", fitAllVisitorPlaces);
    document.getElementById("homeMapCurrent")?.addEventListener("click", () => {
      if (latestLocation) visitMap.setView([latestLocation.lat, latestLocation.lon], 16, { animate: true });
    });

    startLocationWatch();
    if (latestLocation) updateTempleGuideDistances();
  }

  document.addEventListener("DOMContentLoaded", initialiseVisitorGuide);
})();