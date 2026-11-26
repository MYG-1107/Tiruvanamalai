# Tiruvannamalai — A Pilgrim's Map

A lightweight, static website hosted on GitHub Pages to help visitors explore the important temples of Tiruvannamalai and understand the Girivalam pilgrimage around Arunachala.

## Pages

- **Discover (index.html)** — interactive OpenStreetMap, browser geolocation, temple cards and walking-distance estimates for the first set of important temples.
- **Girivalam (girivalam.html)** — an orientation map for the approximately 14 km circuit, clockwise-walking guidance and the Ashta Lingam sequence.
- **Stay guide (accommodation.html)** — accommodation categories with map searches to help visitors compare nearby options.

## Location and distance behaviour

The home page asks the visitor's browser for location permission when it opens. The visitor can decline and still use the map. Location is held only in page memory; this site does not save it or send it to an application server.

Walking distances are requested from the OpenStreetMap-based public foot-routing service. If that service is unavailable, the page displays a straight-line estimate and labels it as such. Distances are approximate and can vary with access points, diversions and routing data. Google Maps and Apple Maps links are provided for live navigation.

## Temple data

The first two map points are:

| Temple | Coordinates | Notes |
| --- | --- | --- |
| Arulmigu Adhi Annamalaiyar Temple | 12.2518, 79.0402 | Approximate map point; the HR&CE listing confirms the temple address on Kirivalapathai. Confirm the entrance locally. |
| Arulmigu Arunachaleswarar Temple | 12.23184, 79.06683 | Map point based on OpenStreetMap-derived place data. |

**Sivanagar Temple** is included as the third requested temple. Its exact identity and coordinates could not be verified from public map references during development. The page makes a place-name lookup and only adds a pin if a nearby result clearly matches the Siva/Sivanagar name. Otherwise it offers map-search links and explicitly withholds the distance instead of inventing a location. Once verified, add the correct latitude and longitude to the Sivanagar entry in script.js.

To add more temples later, add an object to TEMPLE_PLACES in script.js with a unique id, a display name, a search query, and verified latitude / longitude coordinates.

## Girivalam map note

The Tiruvannamalai District Administration describes the road encircling Arunachala as approximately 14 km. The map overlay on the Girivalam page is an **illustrative orientation line**, not a surveyed GPS track, and is not used to calculate turn-by-turn distances. The walking-directions link opens Google Maps so visitors can check the current road route. Follow local signs, police directions and diversions.

## Map and routing services

- Map tiles and map data: [OpenStreetMap](https://www.openstreetmap.org/copyright)
- Map rendering: [Leaflet](https://leafletjs.com/)
- Walking route estimates: [OpenStreetMap routing service](https://routing.openstreetmap.de/)
- Third-place name lookup: [Photon geocoder](https://photon.komoot.io/)
- External navigation: Google Maps and Apple Maps

The public map and routing services have their own usage policies and availability limits. This static site has no API key or private backend.

## Run locally

Open index.html through a local web server (recommended) or deploy the repository with GitHub Pages. Browser geolocation requires a secure context such as HTTPS or localhost.

## Sources used for initial facts

- [Tiruvannamalai District Administration — Girivalam](https://tiruvannamalai.nic.in/girivalam/)
- [Tamil Nadu HR&CE — Arulmigu Adhi Annamalaiyar Temple](https://hrce.tn.gov.in/hrcehome/index_temple.php?tid=20350)
- [Tiruvannamalai District Administration — Annamalaiyar Temple](https://tiruvannamalai.nic.in/tourist-place/temple/)
- [OpenStreetMap](https://www.openstreetmap.org/)

This is an independent visitor guide, not an official temple or government website. Confirm timings, availability, access and route conditions with official sources or locally before travel.
