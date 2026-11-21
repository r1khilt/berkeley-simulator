# Berkeley Simulator team guide (parallel workers)

Berkeley Simulator is a walkable 3D UC Berkeley campus in the browser (three.js r187 + Vite), in the spirit of stanfordsimulator.com.
The owner is Rikhil, a Berkeley student. His direction:
- Make it look much closer to real life.
- Keep the UI professional, not game-y.
- Make it fun to move around.
- Recognisable and realistic beats exact 1:1. `src/landmarks/sproul-hall.js` is the minimum quality bar. Don't rebuild Sproul.
- Never default to night ("we can't see anything").

## Setup (your own sandbox)
```
cd / && curl -fsS -H "x-agent-capability: $AGENT_API_TOKEN" "$AGENT_API_URL/v1/files/<KIT_ID>/content" -o /tmp/kit.tgz && tar xzf /tmp/kit.tgz -C / && bash /work/setup.sh
cd /work/ucb/app && (nohup npx vite --config vite.nohmr.config.js > /tmp/vite2.log 2>&1 &)
git checkout -b <your-branch>
```
- Vite runs on :5173 (HMR; the building harness is at /dev/landmark.html). The no-HMR copy runs on :5174 and is what the QA scripts load.
- The game exposes `window.BSIM` once `BSIM.ready` is set: `pause()`, `setView(x,y,z,tx,ty,tz)`, `renderOnce()`, `snapshot()`, `sim(sec)`, `player`, `lm`, `scene`. See `src/main.js`.
- World coordinates are metres: x is east, z is south, y is up. Spawn is at Sproul Plaza (-156, 246). The Campanile is at about (0, -40).

## QA tools (/work/qa)
- `node snap.mjs "<query>" <name> "@x,y,z,tx,ty,tz" ...` takes in-game screenshots into /work/qa/shots/. Example query: `?t=2026-11-19T14:00:00-08:00`.
- `node uitest.mjs ""` runs the UI flow: title, play, map, travel, panels.
- `python3 vision.py "<prompt>" a.jpg [b.jpg c.jpg]` asks a vision model to look at images.
- `critique.sh "<name>" photo.jpg render.jpg` gives an art-director 1–10 score. Our Sproul scores about 3–4, so treat 5+ as good.
- Building tools are described in WORKER.md: `render_landmark.mjs`, `landmark_check.mjs`, `refs.py`.
- Reference photos:
  - Wikimedia Commons via refs.py: use `iiurlwidth` 960 and go slowly.
  - Google image or web search through the org's shared `serper` credential: read the `yc-serper` skill.
  - Exa through the shared `exa` credential.
- Headless Chromium uses SwiftShader, which is slow and memory-hungry. Keep the viewport ≤ 1280×720, call `BSIM.pause()` before scripted renders, and close browsers.

## Rules
- Stay inside your own area. If you must touch a shared file (`main.js`, `player.js`, `ui.js`, `style.css`, `terrain.js`, `buildings.js`), keep the edits small and clearly commented so merges stay easy.
- Movement modes plug in through `src/player/modes/` (see its README). Don't fork `player.js`.
- No console errors. Performance budget: at most about 10% frame-time regression at spawn on high quality. Gate anything heavy behind the Settings quality levels (low/medium/high/ultra).
- Assets must be CC0 or permissively licensed (Poly Haven, ambientCG and similar). Record sources in `public/assets/CREDITS.md`. Keep added assets small (compressed webp/ktx2/glb; under 15 MB total per worker unless essential).
- Be polite to external sites: no bulk scraping.

## Delivery (git bundle)
Commit as you go. Send a checkpoint at about 60 minutes and a final at about 2.5 hours at most. Deliver earlier if you're done.
```
cd /work/ucb/app && git add -A && git commit -qm "<what>" ; git bundle create /tmp/<branch>.bundle baseline..HEAD
curl -fsS -H "x-agent-capability: $AGENT_API_TOKEN" "$AGENT_API_URL/v1/files/upload-client" -o /tmp/up.py && python3 /tmp/up.py /tmp/<branch>.bundle
```
For a checkpoint, send the file id to your parent with a one-line summary. For the final, reply with:
- the file id;
- what changed (files);
- how to try it (keys/URL params);
- before and after screenshots, uploaded the same way (list their file ids);
- known issues.
The org has a daily model budget, so work efficiently. If you get cut off, your last checkpoint is what survives.
