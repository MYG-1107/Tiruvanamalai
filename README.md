# Tiruvannamalai — A Pilgrim's Map

A lightweight, static website hosted on GitHub Pages to help visitors explore the important temples of Tiruvannamalai and understand the Girivalam pilgrimage around Arunachala.

## Pages

- **Discover (index.html)** — interactive temple map, browser geolocation, temple cards and straight-line distance estimates for the first set of important temples.
- **Girivalam (girivalam.html)** — interactive street / satellite map with numbered Ashta Lingam markers, a road-following route preview, clockwise-walking guidance and the shrine sequence.
- **Stay guide (accommodation.html)** — accommodation categories with map searches to help visitors compare nearby options.

## Location and distance behaviour

The home page asks the visitor's browser for location permission when it opens. The visitor can decline and still use the map. Location is held only in page memory; this site does not save it or send it to an application server.

The home page calculates straight-line distance estimates from the browser location and labels them clearly; these are not walking or road distances. Visitors who share a location close to Tiruvannamalai see their blue position marker with the temple pins in one view. Visitors farther away keep the map centred on Tiruvannamalai so the temple markers remain readable; the map's My location control can centre on the visitor. Google Maps and Apple Maps links open external walking navigation.

## Temple data

The first two map points are:

| Temple | Coordinates | Notes |
| --- | --- | --- |
| Arulmigu Adhi Annamalaiyar Temple | 12.2518, 79.0402 | Approximate map point; the HR&CE listing confirms the temple address on Kirivalapathai. Confirm the entrance locally. |
| Arulmigu Arunachaleswarar Temple | 12.23184, 79.06683 | Map point based on OpenStreetMap-derived place data. |

**Sivanagar Temple** is included as the third requested temple. Its exact identity and coordinates could not be verified from public map references during development. The page makes a place-name lookup and only adds a pin if a nearby result's place name specifically matches Sivanagar. Otherwise it offers map-search links and explicitly withholds the distance instead of inventing a location. Once verified, add the correct latitude and longitude to the Sivanagar entry in script.js.

To add more temples later, add an object to TEMPLE_PLACES in script.js with a unique id, a display name, a search query, and verified latitude / longitude coordinates. To add further Girivalam stops, add a stop to GIRIVALAM_STOPS in the required clockwise order and update the route order used by loadGirivalamRoadRoute().

## Girivalam map and route preview

The Tiruvannamalai District Administration describes the road encircling Arunachala as approximately 14 km and lists the eight Lingams in traditional sequence. The Girivalam map plots numbered markers for the eight Ashta Lingam shrines and a distinct marker for Adhi Annamalaiyar Temple. Selecting a shrine card below the map focuses the matching marker.

The visitor requests the route line by selecting **Load road route**; it is not requested automatically on every page visit. The line is calculated from the public OpenStreetMap foot-routing service through its OSRM-compatible route endpoint. It is a road-following planning preview joining the mapped shrine pins, not an official survey or guaranteed live route. The FOSSGIS public routing service asks clients to keep usage light and limits requests to one per second, so the website makes only an explicit user-initiated request. For sustained production traffic, move routing to a dedicated provider or self-hosted service. If the public routing service is unavailable, the map retains its markers and provides external Google Maps / Apple Maps navigation links instead of drawing a guessed line. Follow local signs, police directions and any festival diversions.

## Map data, layers and services

- Street map and shrine pin data: [OpenStreetMap](https://www.openstreetmap.org/copyright)
- Map rendering: [Leaflet](https://leafletjs.com/)
- Alternative street and satellite imagery: [Esri World Street Map / World Imagery](https://www.arcgis.com/)
- Road route preview: [OpenStreetMap foot-routing service](https://routing.openstreetmap.de/)
- Third-place name lookup: [Photon geocoder](https://photon.komoot.io/)
- External navigation: Google Maps and Apple Maps

The site uses public map services with their own usage policies and availability limits. It does not require a Google Maps API key or store visitor location.

## Run locally

Open index.html through a local web server (recommended) or deploy the repository with GitHub Pages. Browser geolocation requires a secure context such as HTTPS or localhost.

## Sources used for initial facts and map pins

- [Tiruvannamalai District Administration — Girivalam](https://tiruvannamalai.nic.in/girivalam/) — approximately 14 km distance and traditional Ashta Lingam sequence.
- [Tamil Nadu HR&CE — Arulmigu Adhi Annamalaiyar Temple](https://hrce.tn.gov.in/hrcehome/index_temple.php?tid=20350)
- [Tiruvannamalai District Administration — Annamalaiyar Temple](https://tiruvannamalai.nic.in/tourist-place/temple/)
- [OpenStreetMap-derived temple locations — VoiceOfVillage](https://www.voiceofvillage.com/temples/tamil-nadu/tiruvannamalai) — public map coordinates for several lingam shrines.
- [OpenStreetMap](https://www.openstreetmap.org/)

Shrine coordinates are public map pins, not survey-grade entrance coordinates. Please check the exact point and current access on site.

This is an independent visitor guide, not an official temple or government website. Confirm timings, availability, access and route conditions with official sources or locally before travel.


## Map-only Girivalam tracker

The dedicated URL is `https://myg-1107.github.io/Tiruvanamalai/girivalam/`. The page is intentionally map-only: the map occupies the viewport and uses compact controls rather than article content.

1. The page requests location permission and loads the closed circuit from the public foot-routing network, following the clockwise waypoint order: Arunachaleswarar Temple / East Rajagopuram, Indra, Agni, Yama, Niruthi, Varuna, Adi Annamalai, Vayu, Kubera, Esanya, and back to the temple.
2. The visitor's GPS position is projected onto the route geometry. The nearest point on the route becomes that visitor's personal start and finish marker.
3. A walking connector is requested from the current location to that point. When the visitor is farther away than the public routing service should be asked to handle, the start button opens Google Maps walking directions instead.
4. The visitor must reach the selected start point and tap the start control. GPS progress is then projected onto the clockwise route line. The walk can be paused and resumed.
5. Completion is recognised only when the tracked progress is close to one full circuit and the GPS position returns to the same start marker.

The progress counter uses the distance of the returned route geometry, which should be close to the traditional approximately 14 km circuit. The map deliberately does not claim a fixed exactly-14.00-km GPS route. Tracking needs a secure HTTPS page, browser location permission and a usable GPS signal. A phone's browser may suspend GPS when the page is backgrounded or the device enters battery-saving mode; keep the map open during the walk. Visitors should still follow local police, traffic and festival-diversion instructions.

The route waypoints include public map positions; some are approximate and should be checked on the ground. The foot-routing service may return no route or a route that changes as map data changes. The page reports failure rather than substituting an invented route. For a high-traffic public launch, use a dedicated, monitored routing provider or a self-hosted routing engine.

## Search engine crawling and SEO

- `robots.txt` allows crawling and references the root sitemap.
- `sitemap.xml` lists the homepage, dedicated `/girivalam/` URL and accommodation page using absolute canonical URLs.
- The homepage and map page specify unique titles, descriptions, canonical URLs, index/follow directives and social metadata. The map page includes WebApplication structured data.
- The homepage links directly to `/girivalam/`; the old `girivalam.html` address redirects to the new page and is marked noindex to avoid duplicate URLs.

These are crawlability and indexing preparations, not a promise of Google indexing or ranking. Google Search Console ownership verification and sitemap submission must be completed by the site owner. URL Inspection should then be used to request indexing and check Google's rendered version. Search position is determined by Google's systems and cannot be guaranteed.
