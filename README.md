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

The route line is requested from the public OpenStreetMap foot-routing service through its OSRM-compatible route endpoint. It is a road-following planning preview joining the mapped shrine pins, not an official survey or guaranteed live route. If the routing service is unavailable, the map retains its markers and provides external Google Maps / Apple Maps navigation links instead of drawing a guessed line. Follow local signs, police directions and any festival diversions.

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
