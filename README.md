# Berkeley Simulator

A walkable 1:1 UC Berkeley campus in the browser (three.js r187 + Vite), in the spirit of stanfordsimulator.com.

## What's in it
- **Terrain:** USGS 2021 Alameda County LiDAR (1 m DTM) for a 3.3 × 2.4 km core (campus, Southside, Northside, Clark Kerr, the hills, Downtown BART), USGS/AWS terrain tiles out to ~60 km, NAIP / USGS orthophotos for the region, and the Bay as water.
- **Ground:** exact vector distance fields from OpenStreetMap (roads, sidewalks, paths, lawns, plazas), NDVI-based fill, curbs, scored concrete, brick/granite pavers, mowing stripes, instanced grass near the camera, and night lamp pools.
- **Buildings:**
  - Every OSM building in the core is extruded to LiDAR-measured heights, with terraces, penthouses, and hip/gable roofs from straight skeletons (pre-baked).
  - A procedural façade shader draws window grids, interior-mapped rooms, fake reflections and night lights.
  - Roof colours come from NAIP.
  - About 40k more buildings out to ~7 km come from OSM.
  - The SF skyline, Golden Gate and Bay Bridge (with the Bay Lights) are on the horizon.
- **Hand-modelled landmarks** (`src/landmarks/*.js`):
  - Sather Tower with a working clock, elevator and bells, plus Sather Gate, Doe/Bancroft, Hearst Mining, Wheeler, California Hall, South Hall, Sproul Hall, Stephens, Memorial Stadium, the Greek Theatre and the Big C.
  - Golden Bear Café, MLK Union, Eshleman, Zellerbach, VLSB, Moffitt, Dwinelle, the agriculture quad, LeConte and the chemistry group, the Unit 1/2/3 towers, Foothill, Bowles, I-House and Clark Kerr.
  - Fraternity and sorority houses, the co-ops, Downtown Berkeley BART, Edwards Stadium, Evans Diamond and more.
  - Landmarks stream in by distance; procedural stand-ins show until they load.
- **Trees:** about 37k trees detected from the LiDAR canopy, with species assigned by location and shape, tinted per tree from the aerial photo, in late-autumn colours.
- **Life:** animated pedestrians on the footpath network, storefront signs and awnings from OSM shop names, lamps, benches, bike racks, hydrants, poles, signals and crosswalks.
- **Sky:**
  - Real sun and moon position for Berkeley time.
  - Live weather from Open-Meteo, cascaded shadows, aerial haze, night skyglow, lamp lights and bloom.
- **Play:**
  - Walk, run, jump, bike (B) or fly (F).
  - Ride the Campanile elevator (E).
  - Campus map with fast travel (M), time and weather (T), photo mode (P).
  - Discovery cards for 60+ places, a minimap and compass, procedural audio (bells on the hour, the noon carillon, footsteps, birds), touch controls, and dynamic resolution.

## Develop
```
npm install
npx vite            # http://localhost:5173 (game), /dev/landmark.html?id=<id> (landmark harness)
npx vite build      # -> dist/ ; deploy with server.js (see ~/workspace/berkeley-sim)
```
Data pipeline: Python scripts in `/work/ucb/tools` (LiDAR → rasters → buildings/trees/ground; OSM → vectors/POIs/signs).
Landmark contract: `LANDMARKS.md`. Worker guide: `WORKER.md`.

Data: © OpenStreetMap contributors (ODbL); USGS 3DEP LiDAR, USGS/USDA NAIP & The National Map imagery (public domain); AWS Terrain Tiles; Open-Meteo.
