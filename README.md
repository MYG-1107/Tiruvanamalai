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

To add more temple cards later, add an object to TEMPLE_PLACES in script.js with a unique id, a display name, a search query, and verified latitude / longitude coordinates. To add or correct a Girivalam waypoint, edit ROUTE_STOPS in girivalam/girivalam-map.js and retain the clockwise circuit order.

## Map-only Girivalam tracker

The dedicated URL is `https://myg-1107.github.io/Tiruvanamalai/girivalam/`. The page is intentionally map-only: the interactive map occupies the viewport with compact controls and no article layout.

The closed clockwise route is requested from the OpenStreetMap foot-routing network through the FOSSGIS OSRM-compatible endpoint. Waypoints are passed in this order: Arunachaleswarar Temple / East Rajagopuram, Indra, Agni, Yama, Niruthi, Varuna, Adi Annamalai, Vayu, Kubera, Esanya, then back to the temple. The route is checked for a plausible circuit length before it is drawn. If the public route service fails or returns an implausible loop, the page does not draw a guessed circle and offers a retry.

The visitor's GPS position is projected onto the returned route geometry. The nearest point becomes that visitor's personal start / finish marker. A road-following connector is requested from the public foot-routing service when the visitor is within 45 km; for longer approaches the map opens Apple Maps walking directions by default. The selected start marker and temple markers also provide both Apple Maps and Google Maps links. After the nearest start point is marked, the Start control remains tappable and explains whether the pilgrim needs to move closer or wait for a more accurate GPS fix. The distance tolerance adapts to the reported GPS accuracy (42–73 m), while starting and active progress still require GPS accuracy of 65 m or better. Once started, progress is tracked along the clockwise path; the walk can be paused and resumed. Completion is recognised only when tracked progress is close to a full route and the GPS position returns to the same start marker.

The route distance shown is calculated from the returned walking-road geometry. It should be close to the traditional approximately 14 km, but it is not hard-coded to exactly 14.00 km. Some shrine coordinates are approximate public map positions and must be checked on the ground. The path is a planning aid, not an official surveyed track, emergency navigation or a guarantee that all roads are currently open. Follow local police, traffic and festival-diversion instructions.

Tracking requires HTTPS, browser location permission and a usable GPS signal. The page starts a continuous GPS watch so later position fixes can still arrive after an initial timeout; a denied location permission can be retried from the location control after permission is changed. Browsers may suspend GPS when a page is backgrounded or the device enters power-saving mode. Progress is kept only in page memory, so a reload or closed tab resets the active walk.

## Map data, layers and services

- **Default satellite imagery:** [Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer), with an Esri place-label overlay. Although the global cache advertises levels through 23, high-detail coverage varies by location. To prevent Esri's own “Map data not yet available” placeholder tiles around Tiruvannamalai, the map requests native satellite imagery only through level 18 and lets Leaflet enlarge those tiles up to map zoom 21. This keeps the view zoomable but can look softer at the closest zoom levels because the source imagery does not contain additional local detail.
- **Street fallback and reference layer:** [OpenStreetMap](https://www.openstreetmap.org/copyright); Esri street map is also available in the homepage layer selector. If satellite tiles repeatedly fail, the map falls back to a street layer and displays a message rather than leaving the visitor with a broken map.
- Map rendering: [Leaflet](https://leafletjs.com/)
- Road route preview: [OpenStreetMap foot-routing service](https://routing.openstreetmap.de/)
- Third-place name lookup: [Photon geocoder](https://photon.komoot.io/)
- External walking navigation: [Apple Maps](https://maps.apple.com/) and [Google Maps](https://maps.google.com/)

The embedded satellite base layer is Esri World Imagery, not Apple-owned imagery. Apple Maps is offered for external walking directions. To embed Apple's own satellite or hybrid basemap inside the website, enable [MapKit JS](https://developer.apple.com/documentation/mapkitjs) with a domain-restricted Maps token from the Apple Developer account; the site currently has no such token. The implementation does not use undocumented Apple tile URLs.

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

## Latest map and temple guidance updates

- Satellite imagery is the default view on the homepage and the live Girivalam map. The Esri satellite layer uses a conservative local native zoom cap of 18 and overzooms the last reliable tiles up to map zoom 21. This avoids requesting deeper local tiles that Esri may fill with “Map data not yet available” imagery. Genuine network tile failures still trigger a street-map fallback.
- Adi Annamalaiyar Temple is featured as the first important temple card, with a highlighted map marker, Tamil and English popup text, and direct Apple Maps / Google Maps links.
- During the clockwise GPS walk, the tracker calculates the Adi Annamalaiyar waypoint along the returned route and shows an approach alert before arrival. The Voice Guidance control can speak the prompt; the visual message remains available when voice guidance is off or unsupported.
- The newest Apple Maps India release (November 2026) is used as a design reference for bilingual place information and clearer landmark-led guidance. The website does not pretend to embed Apple's imagery; that needs a valid MapKit JS token.

## Latest tracker interaction fixes

- The central Start / Pause / Resume control provides an on-screen reason when a walk cannot start instead of silently disabling the control after a start point has been selected.
- The walk-start distance check accounts for the GPS accuracy reported by the device, with a maximum approach tolerance of 73 m. A start still requires a usable fix of 65 m accuracy or better.
- GPS position is watched continuously, and the start-navigation control performs one action per tap: external walking directions when the pilgrim is away, or map focus when nearby.
- The route and GPS workflow should still be verified on a real phone outdoors. Browser GPS, public routing availability, map tiles, and actual walking progress are not fully reproducible in static code checks.


## Handling deep satellite zoom

Esri's World Imagery cache advertises global levels through 23, but actual imagery coverage varies from place to place. In areas without newer high-resolution imagery, the server can return a normal image tile containing the text “Map data not yet available”; this is not an HTTP tile error, so a regular Leaflet `tileerror` handler cannot detect it. The two Tiruvannamalai maps therefore cap satellite requests at native level 18 and allow visual overzoom through level 21. Leaflet requests the level-18 tile and scales it for closer views instead of requesting missing local detail. This trades sharpness at extreme zoom for a continuous map without the Esri no-data graphic. A genuine network failure still switches to a street map.

Leaflet documents `maxNativeZoom` as the maximum source-tile zoom, with tiles above that level scaled for display: [Leaflet 1.9.4 TileLayer reference](https://leafletjs.com/reference-1.9.4.html). Esri documents the location-dependent imagery coverage and no-data tile behaviour: [Esri World Imagery coverage](https://www.arcgis.com/home/item.html?id=50c23e4987a44de4ab163e1baeab4a46), [Esri Community explanation](https://community.esri.com/cs/discussion/81070/map-data-not-yet-available).


## Expanded landmark-aware pilgrimage guidance

The homepage map now includes the complete Ashta Lingam sequence, Adi Annamalaiyar Temple, Arunachaleswarar Temple, Sri Ramanasramam, Sri Seshadri Swamigal Ashram, Yogi Ramsuratkumar Ashram, Virupaksha Cave and Skandashramam. The list is grouped so a visitor can browse the eight Lingams separately from the ashrams and hill caves. Each pinned place has a popup, a map-focus action and Apple Maps / Google Maps walking-direction links.

The dedicated GPS tracker gives an approach message for the next Lingam while a Girivalam walk is active. It announces the next shrine at approximately 550 m and a near-arrival prompt within approximately 90 m. The existing Adi Annamalaiyar approach and arrival reminders remain in place. When GPS shows that the visitor is close to Sri Ramanasramam, Seshadri Swamigal Ashram, Yogi Ramsuratkumar Ashram, Virupaksha Cave or Skandashramam, the tracker shows a contextual stop suggestion; hill caves are identified as uphill visits that require a local access check.

When the visitor comes within approximately 450 m of the main Arunachaleswarar Temple map point, the live tracker opens a compact visit checklist. It calls attention to the Annamalaiyar and Unnamulai Amman shrines, Pathala Lingam, Kambathu Ilayanar, Periya Nandi, Sivaganga Theertham and Vinayagar, the Thousand-Pillared Hall and historic gopurams. This is a practical checklist, not indoor navigation: a phone's outdoor GPS cannot reliably locate an individual sannidhi inside a large temple complex. Visitors should ask temple staff for directions and follow current access notices. The district administration's visitor information describes the temple's many sannidhis, sculptures, inscriptions, sacred tanks, mandapas and gopurams: [Tiruvannamalai District Administration — Places of Interest](https://tiruvannamalai.nic.in/places-of-interest/). The named shrine checklist is also cross-checked against this [supplementary shrine reference](https://www.arunachalamtemple.org/temple/shrines/); confirm on-site access locally.

### Place coordinates and accuracy

The eight Lingam map points retain the existing public map-derived coordinate set in the clockwise route. The additional map points currently used are:

| Place | Map coordinates | Accuracy note |
| --- | --- | --- |
| Sri Ramanasramam | 12.22369, 79.05672 | Public map point; confirm the entrance locally |
| Sri Seshadri Swamigal Ashram | 12.22455, 79.05890 | Approximate orientation point; check the signboard and entrance |
| Yogi Ramsuratkumar Ashram | 12.21841, 79.05390 | Public map point; confirm the entrance locally |
| Virupaksha Cave | 12.23386, 79.06167 | Hill-side map point; approach and access may vary |
| Skandashramam | 12.23452, 79.06068 | Hill-side map point; approach and access may vary |

The ashram and cave pins are useful orientation points, not surveyed door or entrance coordinates. The Sri Ramanasramam visitor information describes Skandashramam and Virupaksha Cave as hillside places reached from the ashram side; check the official [Sri Ramanasramam visitor information](https://www.sriramanamaharshi.org/visit-us/) for its current guidance. The Seshadri Ashram pin is explicitly labelled approximate in the interface. Do not rely on any map pin instead of local signage, temple staff, police or current route notices.

### Sample photographs and attribution

The homepage sample-photo gallery queries the public Wikimedia Commons MediaWiki API when the page loads. It requests a small set of matching image files and thumbnails, then displays the photographer / credit text, the reported licence and a link to each original Commons file page. No API key is required for these public queries; the request includes the Commons cross-origin parameter so a browser can read the response. The gallery loads the four searches one after another and keeps the map usable if the image API is unavailable.

- [Wikimedia Commons — MediaWiki API Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo)
- [MediaWiki API — Cross-site requests](https://www.mediawiki.org/wiki/API:Cross-site_requests)

Images remain hosted by Wikimedia Commons; this site does not copy them into the repository. Always open the original file page and check its individual licence and attribution requirements before reusing an image elsewhere.

The GPS proximity alerts use browser location only in page memory. The homepage uses a location watch to update approximate direct distances and the nearby suggestion; the dedicated tracker continues to keep the walking trace local. GPS may drift, map points may be offset from entrances, and browsers can pause location updates in the background. Treat the prompts as visit reminders, not proof that a pilgrim has entered a shrine or that a place is currently open.
