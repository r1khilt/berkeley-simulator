# refine-north: what changed (Berkeley Simulator)

Branch `refine-north`. Base: `baseline`. The work covers the 48 modules of batch `refine-north`: 22 by the lead worker, 18 by helper B (`rn-houses`, merged), and 8 by helper A (`rn-foothill`, merged if delivered).

## Shared helpers (new files only; no existing shared kit was edited)
- `src/landmarks/lib/rn-kit.js` has the refine-north ground-floor and finishing kit. It works with any classic-Kit module in building-frame u, v, y.
  - `pathEntrances(K, ctx, runs)` finds the stations where the packet's footways and steps meet a wall, so doors go where people actually arrive.
  - `entry(K, R, s, o)` builds a portal proud of the wall face with no wall cut needed. It includes:
    - glazed or wood double doors in the shared `M.windowNight` glass, with sidelights, transom and push bars;
    - a landing, plus steps to grade with stainless handrails and a walkable surface;
    - optional canopy with downlights, wall sconces and a sign.
  - `planting(K, R, s0, s1, o)` lays mulch beds (optionally curbed) with lumpy shrub clumps or a clipped hedge. It skips doors and follows the slope; `d0` offsets the bed from the wall.
  - Other placement helpers:
    - `planter(...)`: a concrete planter box with shrubs or a small tree.
    - `bikes(...)`: inverted-U racks with at most 2 parked bikes per row, to stay within the triangle budget.
    - `furniture(...)` and `propAt(...)`: any `src/props` item. Prop materials are folded into shared ones to save draw calls.
  - `bakeMat`, `panelMat`, `ashlarMat` and `flatTileMat` generate procedural canvas materials (colour, normal and roughness), baked once per key.
  - All small dressing is flagged `detail`, so the engine hides it beyond about 350 m.
- `src/landmarks/lib/rn-b-ground.js` (helper B) builds on rn-kit. It adds:
  - a stoop builder;
  - a filter that drops windows on sloped sites;
  - a gabled door hood;
  - a split-redwood shingle texture.

## Bugs fixed
- **Hearst Memorial Mining Building.** `beaux-kit` `Side.wall()` cannot take openings stacked in the same column: the later opening's filler box swaps into a solid block. As a result, every upper storey rendered blind. The pavilion's core box also sat in front of the arch glazing and doors. The fix is local to the module (`bandWall`) and does not touch beaux-kit, which `doe-library` still uses.
- **Giannini Hall.** The entrance front was modelled on the wrong (east) side. The packet's central steps arrive on the concave west side, so it was moved there.
- **Haviland Hall.** Flat grey decks over the end wings were replaced with low tile hips, which match the LiDAR.

## QA notes for integrators
- Render QA should load the no-HMR server on `:5174`. The kit's `render_landmark.mjs` and `landmark_check.mjs` loaded `:5173`, and every file edit reloaded those pages mid-render.
- The art-director critic sometimes asks for massing changes from a single photo, for example "Evans is a thin slab" or "Hesse has a hip roof". The LiDAR contradicts these, so they were not applied.
