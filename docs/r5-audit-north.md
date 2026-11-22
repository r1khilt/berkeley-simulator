# r5-audit-north: NE engineering quad photo audit (Nov 22, 2026)

Branch `r5-audit-north`, built on round-4 main (`r5main`).

## Changes
- **Grimes Engineering Center** (`src/landmarks/grimes-engineering-center.js`)
  - Removed the "east sloped walk". It was a 3 m concrete wedge that climbed 5.3 m along the east wall and ended at a blank wall. The graded ground along Bechtel Drive is flat (102.0 to 102.4 m), so from the plaza it read as a bridge to nowhere heading toward Cory. A low planted strip now runs along the blank part of the wall.
  - Disabled the SW-corner brick stair and ramp (`SW_BRICK_STAIR = false`). They were built on top of OSM's short concrete flight (w/262173805), which groundworks builds.
- **Groundworks** (`src/world/groundworks.js`)
  - `STAIR_STYLE` matches individual OSM flights to photos: width, tread material, flights separated by landings, a centre handrail and tall stepped side walls (`cheekH`). `stairSpans`, `stairTop` and `stairNose` drive the treads, the bed grading, the cheek walls and the rails.
    - w/262173804 (Glade to McLaughlin East Patio, below Grimes): 5 m wide, 3 flights and 2 landings, muted pavers, centre rail.
    - w/1377317325 (Hearst to the Cory/SDH courtyard): 3.4 m wide.
  - `OWNED_STEPS` is a skip list for OSM flights that a landmark module builds itself. It is currently empty.
  - `?gwdebug=1` exposes `globalThis.__gw` (the accepted stair and wall plans) for QA maps.
- **Sutardja Dai Hall**: rebuilt the A. Richard Newton footbridge to Cory from C. Sequin's 2009 photos. It now has an underslung fish-belly Warren truss in bronze-grey steel, champagne posts, perforated guard panels with a glass screen and a stainless rail. It lands on the 18.3 m podium terrace (it used to sit 1 m below it) and at a Cory doorway.
- **Hearst Memorial Mining Building**
  - The entrance floor is raised to about 1.5 m above the Mining Circle forecourt, up roughly 10 steps. The cheek walls step down with the flight.
  - A dull-red brick apron, centred on the entrance, follows the grade.
- **Evans Hall**: the concrete albedo is biased cool. It rendered sand/olive (#A3A280) and is now grey-green (#9A9F84).
- **McCone Hall**: the classical dentil course and the 1.5 m stone-joint grid are replaced by a plain slab edge and smooth painted cream concrete.

## Open items (audited, not changed)
- Physics N/S: its header says clay-tile roofs, but the roof material is green-grey metal. Verify against aerial imagery.
- North Gate Hall may be too big or too closed a quad compared with the real informal wings.
- The Mining Circle oval drive and lawn don't read from above (ground paint).
- The two parallel OSM stairs west of HMMB (w/430890040 and w/1365669048) are both in OSM, so they were kept.
