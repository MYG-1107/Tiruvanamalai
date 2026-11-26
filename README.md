# Tiruvannamalai — A Pilgrim's Map

A lightweight, static website hosted on GitHub Pages to help visitors explore the important temples of Tiruvannamalai and understand the Girivalam pilgrimage around Arunachala.

## Pages

- **Discover (index.html)** — interactive temple map, browser geolocation, temple cards and straight-line distance estimates for the first set of important temples.
- **Live Girivalam map (/girivalam/)** — dedicated, map-only full-screen GPS experience. It finds the nearest point on the closed walking circuit, guides the pilgrim to that start, tracks clockwise progress, supports pause/resume and recognises completion after returning to the same point.
- **Legacy Girivalam URL (girivalam.html)** — redirects to the new map-only page.
- **Stay guide (accommodation.html)** — accommodation categories with map searches to help visitors compare nearby options.

## Location and distance behaviour

The homepage asks the visitor's browser for location permission when it opens. The visitor can decline and still use the temple map. Location is held only in page memory; this site does not save it to a database or account. The dedicated Girivalam tracker also uses browser GPS in page memory. To calculate the blue walking connector to the selected start point, the current GPS coordinate and the start coordinate are sent to the public OpenStreetMap foot-routing service. The tracker itself calculates progress in the browser and does not upload a GPS trace.

The home page calculates straight-line distance estimates from the browser location and labels them clearly; these are not walking or road distances. Visitors who share a location close to Tiruvannamalai see their blue position marker with the temple pins in one view. Visitors farther away keep the map centred on Tiruvannamalai so the temple markers remain readable; the map's My location control can centre on the visitor. Google Maps and Apple Maps links open external walking navigation.

## Temple data

The first two map points are:

| Temple | Coordinates | Notes |
| --- | --- | --- |
| Arulmigu Adhi Annamalaiyar Temple | 12.2518, 79.0402 | Approximate map point; the HR&CE listing confirms the temple address on Kirivalapathai. Confirm the entrance locally. |
| Arulmigu Arunachaleswarar Temple | 12.23184, 79.06683 | Map point based on OpenStreetMap-derived place data. |

**Sivanagar Temple** is included as the third requested temple. Its exact identity and coordinates could not be verified from public map references during development. The page makes a place-name lookup and only adds a pin if a nearby result's place name specifically matches Sivanagar. Otherwise it offers map-search links and explicitly withholds the distance instead of inventing a location. Once verified, add the correct latitude and longitude to the Sivanagar entry in script.js.

To add more temples later, add an object to TEMPLE_PLACES in script.js with a unique id, a display name, a search query, and verified latitude / longitude coordinates. To add further Girivalam stops, add a stop to GIRIVALAM_STOPS in the required clockwise order and update the route order used by loadGirivalamRoadRoute().

## Map-only Girivalam tracker

The dedicated URL is `https://myg-1107.github.io/Tiruvanamalai/girivalam/`. The page is intentionally map-only: the interactive map occupies the viewport with compact controls and no article layout.

The closed clockwise route is requested from the OpenStreetMap foot-routing network through the FOSSGIS OSRM-compatible endpoint. Waypoints are passed in this order: Arunachaleswarar Temple / East Rajagopuram, Indra, Agni, Yama, Niruthi, Varuna, Adi Annamalai, Vayu, Kubera, Esanya, then back to the temple. The route is checked for a plausible circuit length before it is drawn. If the public route service fails or returns an implausible loop, the page does not draw a guessed circle and offers a retry.

The visitor's GPS position is projected onto the returned route geometry. The nearest point becomes that visitor's personal start / finish marker. A road-following connector is requested from the public foot-routing service when the visitor is within 45 km; for longer approaches the map opens Google Maps walking directions. The visitor must reach the marked start and press Start. Progress is then tracked along the clockwise path; the walk can be paused and resumed. Completion is recognised only when tracked progress is close to a full route and the GPS position returns to the same start marker.

The route distance shown is calculated from the returned walking-road geometry. It should be close to the traditional approximately 14 km, but it is not hard-coded to exactly 14.00 km. Some shrine coordinates are approximate public map positions and must be checked on the ground. The path is a planning aid, not an official surveyed track, emergency navigation or a guarantee that all roads are currently open. Follow local police, traffic and festival-diversion instructions.

Tracking requires HTTPS, browser location permission and a usable GPS signal. Browsers may suspend GPS when a page is backgrounded or the device enters power-saving mode. Progress is kept only in page memory, so a reload or closed tab resets the active walk.

## Map data, layers and services

- Street map and shrine pin data: [OpenStreetMap](https://www.openstreetmap.org/copyright)
- Map rendering: [Leaflet](https://leafletjs.com/)
- Alternative street and satellite imagery: [Esri World Street Map / World Imagery](https://www.arcgis.com/)
- Road route preview: [OpenStreetMap foot-routing service](https://routing.openstreetmap.de/)
- Third-place name lookup: [Photon geocoder](https://photon.komoot.io/)
- External navigation: Google Maps and Apple Maps

The site uses public map services with their own usage policies and availability limits. It does not require a Google Maps API key. The website does not store visitor location, but the GPS connector coordinates are sent to the public foot-routing service when a connector is requested.

## Search engine crawling and SEO

- `sitemap.xml` lists the homepage, dedicated `/girivalam/` URL and accommodation page using absolute canonical URLs.
- The homepage and map page specify unique titles, descriptions, canonical URLs, index/follow directives and social metadata. The map page includes WebApplication structured data and a screen-reader heading.
- The homepage links directly to `/girivalam/`; the old `girivalam.html` address redirects to the new page and is marked noindex to avoid duplicate URLs.

The GitHub Pages project URL is hosted under a subpath of the shared `myg-1107.github.io` host, so a `robots.txt` stored in this repository would not be the host-level `/robots.txt`. The page metadata does not request `noindex`; the sitemap should be submitted directly in Search Console. These are crawlability and indexing preparations, not a promise of Google indexing or ranking. Google Search Console ownership verification and sitemap submission must be completed by the site owner. URL Inspection should then be used to test the live URL and request indexing. Search position is determined by Google's systems and cannot be guaranteed.

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
