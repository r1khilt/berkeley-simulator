# Berkeley Simulator: building-batch worker guide

You hand-build real UC Berkeley buildings as landmark modules for Berkeley Simulator, a walkable 3D UC Berkeley campus in the browser.
It's built on three.js r187 and Vite, in the spirit of stanfordsimulator.com.

## The quality bar
The user looked at the current builds and said `src/landmarks/sproul-hall.js` is "perfectly good — that's the quality we aim for", and "more realistic".
- Every building you deliver must read instantly as the real building to a Berkeley student: right massing, proportions, roof, materials, colours, window rhythm, entrances and signature details.
- It does NOT need to be an exact 1:1 replica. Aim for Sproul-level recognisability and realism.
- Study `src/landmarks/sproul-hall.js` and `src/landmarks/lib/classic-kit.js` first. `doe-library.js` with `lib/beaux-kit.js`, and `memorial-stadium.js` with `lib/venue-util.js`, are further examples.
- Reuse and extend kits. If several of your buildings share a style (identical dorm towers, a Craftsman house, a 1960s concrete lab), build one parametric helper in `src/landmarks/lib/<batchprefix>-*.js` and reuse it.

## Contract
`LANDMARKS.md` defines coordinates, materials and the module API: `info` and `build(ctx) -> {object3d, colliders, walkables, interactions}`.
- Data packets live in `public/dev-data/landmarks/<id>.json`. Each has the OSM footprint, terrain grid, LiDAR top-surface grid (the ground truth for massing and roof heights) and nearby OSM ways.
- Your batch list is in `public/dev-data/landmarks/_batches.json`, keyed by your batch name.
- `info.replaces` must list the packet's footprint `osm` id(s) exactly, e.g. `['w/24025028']`.

## Tools
These are already installed by `/work/setup.sh`. Vite runs on :5173.
- `node /work/qa/landmark_check.mjs <id>`: stats, console errors and the LiDAR difference map (mean abs error; aim ≤ ~1.5 m except under trees).
- `node /work/qa/render_landmark.mjs <id>`: renders 8 eye-level views plus 1 aerial into `/work/qa/cmp/<id>/` (`r-<az>-<el>.jpg`). The az number is the compass direction the camera stands at.
- `python3 /work/qa/refs.py <id> "<query>" 4`: polite Wikimedia Commons reference photos into `/work/qa/ref/<id>/`, plus credits.
  - For things Commons lacks (frats, dorms, small buildings), use Google image search through the org's shared `serper` credential. Read the `yc-serper` skill with the skills tool and use its proxy pattern.
  - Download at most 2–3 photos per building, slowly.
- `python3 /work/qa/vision.py "<prompt>" a.jpg [b.jpg c.jpg]`: lets you see images through a vision model on the model gateway. Use up to 3 images per call.
- `/work/qa/critique.sh "<building name>" <photo.jpg> <render1.jpg> [<render2.jpg>]`: an art-director diff that ends with a 1–10 recognisability score.

## Workflow per building
1. Get 2–3 reference photos. Ask vision.py to describe the architecture precisely: storeys, bays, materials and colours (hex), roof, windows, entrances, details.
2. Model it. Match massing to the LiDAR (lidarTop), and take façades and details from the photos. Put doors and steps where the packet's paths arrive. Use colliders along the walls.
3. Gate: run `render_landmark.mjs`, then `critique.sh` against the best-matching photo. Iterate until recognisability is ≥ 7/10, there are no console errors, and triangles are ≤ ~80k (≤ 150k for big halls). Merge by material: < 25 draw calls.
4. Keep the best render next to the photo: `cp` both into `/work/qa/deliver/<id>/`, with photo credits.

Order: do the most recognisable or largest buildings first. Report honestly what you couldn't finish.

## Delivery
1. Package your module files, lib files and the deliver folder:
   `cd /work && tar czf /tmp/<batch>.tgz ucb/app/src/landmarks/<your ids>.js ucb/app/src/landmarks/lib/<yourprefix>-*.js qa/deliver`
2. Upload it:
   `curl -fsS -H "x-agent-capability: $AGENT_API_TOKEN" "$AGENT_API_URL/v1/files/upload-client" -o /tmp/up.py && python3 /tmp/up.py /tmp/<batch>.tgz`
   The response includes the file id.
3. Reply with:
   - the file id;
   - per building: id, triangles, LiDAR error and recognisability score;
   - what's missing.
