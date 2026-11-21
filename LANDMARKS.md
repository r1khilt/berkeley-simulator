# Berkeley Simulator — landmark module contract

Berkeley Simulator is a 1:1 walkable UC Berkeley campus in the browser (three.js r187, Vite), in the spirit of stanfordsimulator.com.
The engine builds the terrain (USGS 2021 LiDAR, 1 m), every other building procedurally from OpenStreetMap + LiDAR heights,
~28k LiDAR-detected trees, roads/paths, sky, player, UI. Hand-modelled landmark modules replace the procedural version of
the most recognisable buildings, so these need to be architecturally faithful and beautiful up close (the player walks right up to them
and reads them from the top of the Campanile).

## Coordinates
- metres; +y up; +x east; +z SOUTH (north is -z). A façade "facing north" has outward normal (0,0,-1).
- Your module builds in LOCAL coordinates around the landmark's anchor (from the packet): (0,0,0) = anchor x/z, and y = 0 is the
  lowest ground elevation along the footprint. The engine adds your object at the anchor's world position. Do not rotate the whole
  object; build it already oriented to match the OSM footprint in the packet.
- Terrain is not flat: use `ctx.groundAt(x, z)` (local, returns ground height relative to y=0) to seat foundations/steps/plinths.
  Extend foundations ~1 m below ground so nothing floats on the slope.

## Data packet: `public/dev-data/landmarks/<id>.json` (+ `<id>.ascii.txt` coarse height map)
- `anchor` {x,z,y}: world position of local origin.
- `footprints[]`: OSM outlines (local coords, `outer` ring + `holes`), with OSM tags (name, levels, architect, start_date…).
- `ground`: 1 m grid of terrain height (relative to y=0) around the site. (`ctx.groundAt` samples it.)
- `lidarTop`: 0.5 m grid of the LiDAR first-return surface (roofs, trees, ground) relative to y=0 — the ground truth for massing:
  roof heights, wings, towers, domes, light wells. Trees overhanging the building show up too (ignore those).
- `context[]`: nearby OSM ways (footpaths, steps, roads, walls, water, other buildings) in local coords — use them to place
  entrances/steps where the paths actually arrive.

## Module file: `src/landmarks/<id>.js`
```js
import * as THREE from 'three';
export const info = {
  id: 'sather-tower',
  name: 'Sather Tower',
  subtitle: '307 feet · 1914',          // short, shown under the name when the player arrives
  blurb: 'One or two accurate sentences.', // verified facts only
  replaces: ['w/24024507'],              // OSM footprint ids (packet `footprints[].osm`) whose procedural building is suppressed
};
// ctx: { THREE, M (shared materials), U (shared uniforms), boxUV, groundAt(x,z), footprints, anchor, packet }
export async function build(ctx) {
  return {
    object3d,          // THREE.Object3D in local coords. Merge geometry per material (BufferGeometryUtils.mergeGeometries)
                       // so the whole landmark is ideally < 40 draw calls. Put tiny detail (railings, mullions, ornaments)
                       // in child objects with `userData.detail = true` so the engine can hide them beyond ~350 m.
    colliders: [],     // walls the player can't walk through, local coords:
                       //  {type:'poly', pts:[[x,z],...], y0, y1}  vertical prism (building walls; use the real outline)
                       //  {type:'box', min:[x,y,z], max:[x,y,z]} | {type:'cyl', x, z, r, y0, y1}
    walkables: [],     // surfaces the player can stand on above terrain (decks, stairs, seating, bridges):
                       //  {type:'poly', pts:[[x,z],...], y} flat, or {type:'fn', bounds:[x0,z0,x1,z1], heightAt:(x,z)=>y|null}
    interactions: [],  // optional: {id, pos:[x,y,z], radius, label:'Ride the elevator to the observation deck', teleport:[x,y,z]}
    update(dt, env) {} // optional per-frame animation; env = {time: Date (real Pacific time), night: 0..1, camera}
  };
}
```
## Materials & helpers (`src/materials.js`, already written — import or use ctx.M)
`M.granite, graniteDark, ashlar (jointed granite blocks), marble, concrete, concreteDark, stucco, stuccoWhite, brick, redTile
(barrel tile; u along the eave, v up-slope), shingle, slate, copper (verdigris), bronze, darkBronze, gold, iron, lampGreen, glass,
glassLight, windowNight (dark glass that glows warm at night), lampGlow (emissive at night), wood, woodDark, paving, asphalt,
whitePaint, blackPaint, turf, calBlue (#003262 Berkeley Blue), calGold (#FDB515 California Gold), seatBlue, water, soil`.
Textures are tileable and expect UVs in metres/2 — run `boxUV(geometry)` on geometry before merging (it box-projects UVs so
vertical faces get level courses). For roofs, make the tile courses run parallel to the eaves (boxUV does this for hip faces).
You may create additional local materials for unique things (clock dials, signage, glass domes), but prefer the shared ones so the
campus stays visually coherent. Keep everything procedural (no external image/model downloads).
`U.uTime`, `U.uNight` (0 day → 1 night) are global uniforms; `M.windowNight`/`M.lampGlow` already glow at night.

## Quality bar
- Real proportions and the features people recognise (consult Wikipedia/NRHP descriptions/photos descriptions via web search).
- Massing must match the LiDAR: check with the harness (`lidarCompare` mean abs error inside the footprint ideally ≤ 1.5 m,
  and no large '#'/'=' regions except where trees overhang). Doors/steps where the real paths meet the building.
- Façade depth: real buildings read through relief — cornices, pilasters, deep window reveals, rustication, arches, balustrades.
  Model that relief in geometry (it's what makes them look real in raking sunlight), but keep triangle counts sane:
  large landmarks ≤ ~250k triangles, small ones ≤ ~60k. Prefer InstancedMesh for many identical pieces (windows, columns, seats).
- Windows: recessed dark glass (M.windowNight) with frames/mullions; never flat painted rectangles.
- No floating or z-fighting faces; close the bottoms; nothing pokes through the terrain where it shouldn't.

## Testing (you cannot view images; verify numerically)
- Vite dev server runs at http://localhost:5173 (already running; if not: `cd /work/ucb/app && npx vite &`).
- Harness: `/dev/landmark.html?id=<id>` (`&lidar=1` overlays LiDAR points).
- Check: `cd /work/qa && node landmark_check.mjs <id> [--shots]` → prints build time, triangles, meshes, materials, bbox,
  console errors, and a LiDAR difference map with mean abs error. Fix every console error. Screenshots land in /work/qa/shots.
- Only write your own files (`src/landmarks/<id>.js`, and helpers under `src/landmarks/lib/<yourprefix>-*.js` if needed).
  Do not edit materials.js, the harness, or other agents' files.
