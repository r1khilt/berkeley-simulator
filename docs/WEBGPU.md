# WebGPU renderer path (`?renderer=webgpu`)

Branch `gfx-webgpu`. Status: **opt-in and working**. The scene boots on three.js `WebGPURenderer` (r187, `three/webgpu` + TSL) with no console errors. With no WebGPU it falls back to the unchanged WebGL path.

## How to try it
- `http://localhost:5173/?renderer=webgpu` (any other params still apply, e.g. `&t=2026-11-19T14:00:00-08:00`, `&q=ultra`, `&bloom=1`).
- Without the param nothing changes: `src/gpu/*` is loaded by a dynamic `import()` only when asked for, so the WebGL bundle and code path are untouched.
- Fallback: no `navigator.gpu`, no adapter, init failure, or WebGPURenderer silently choosing its WebGL2 backend all fall back to the normal `WebGLRenderer` (`BSIM.rendererFallback` says why). If the canvas already holds a `webgpu` context, it is swapped for a fresh one first.
- Debug: `BSIM.gpu.conv.stats` lists every material translated and how. `BSIM.gpu.adapterInfo` shows the adapter.

## Architecture (how the port works)
WebGPURenderer cannot run GLSL `ShaderMaterial` or `onBeforeCompile` patches. Rather than fork every world module, the port hooks the renderer's material library:

| File | Role |
|---|---|
| `src/gpu/webgpu.js` | Renderer creation and fallback, the custom tone-mapping curve registered as `CustomToneMapping`, fog node, the CSM wrapper and bloom post |
| `src/gpu/convert.js` | Hooks `renderer.library.fromMaterial`. At first use, each material is translated to a TSL NodeMaterial (cached per material + version). Each `onBeforeCompile` hook is run once on a dummy shader to harvest its uniforms and textures. The handler is chosen by `customProgramCacheKey` (`coreTerrain-v7`, `facade-v4`, `tree-leaf-5`, …). Program cache keys are scoped per source material so materials that share a GLSL key but differ in captured textures (species bark, the 3 terrain rings) don't share a pipeline. `positionNode` is mirrored onto the source material so the shadow pass sways and displaces too |
| `src/gpu/tsl-terrain.js` | Core LiDAR terrain: GPU displacement via `textureLoad` bilinear, the full ground shader (lawns, mowing stripes, scored concrete, brick/granite pavers, asphalt and cracks, curbs, track/courts/sand, leaf litter, far ortho blend), height-derived normals plus micro-bump, AO, and lamp pools at night. Also orthophoto rings with the autumn regrade, Bay water normals and the creek |
| `src/gpu/tsl-buildings.js` | Procedural facade: 12 style table, brick/stone courses, cornices, window grid with arched tops, frames, mullions, interior-mapped rooms, blinds, Fresnel sky/street reflection and night lights. Also roof tiles/shingles/seams, the SF skyline and mid-city |
| `src/gpu/tsl-sky.js` | `Sky` → `SkyMesh` (with the same `material.uniforms` API that `sky.js` writes). Cloud layer, night skyglow and twilight, the env dome and node `PMREMGenerator`, and the custom linear-exponential aerial fog as `scene.fogNode` |
| `src/gpu/tsl-trees.js` | Instanced trees: per-instance wind sway and leaf flutter, leaf-card de-stretch, card edge fade, aerial-tint leaf ramp (instanceColor as a relative tint, not a multiply), translucency and wrap lighting as a custom `PhysicalLightingModel`, leaf specular scale, bark UV rescale and sub-pixel twig cull, and far-LOD blob colour |
| `src/gpu/tsl-extra.js` | Grass (distance fade, tip wind, up normals), pedestrians (limb swing, skin/hair/clothes palette), Bay Lights points, and a safe fallback for unknown `ShaderMaterial`s (hidden, warned once) |

Shared files touched: `src/main.js` only, with 7 small commented `[gfx-webgpu]` edits: renderer branch, `patchSky`, CSM branch, skipping the WebGL CSM shader hook, bloom branch, and `let canvas`.

## What's ported / not ported

| Area | Status |
|---|---|
| Terrain (core displacement + ground shader, rings, water, creek) | Ported 1:1 |
| Buildings (facade, roofs), skyline, mid-city | Ported 1:1 |
| Landmarks (MeshStandardMaterial + kits) | Auto-converted. `nightGlow` windows/lamps → emissive × uNight. Contact AO against the heightfield is ported (`grading.js` contactAO) |
| Sky, clouds, skyglow, env/PMREM, fog, tone mapping + grade | Ported. The sky uses upstream `SkyMesh` (see differences) |
| Sun shadows | `CSMShadowNode`: same cascades, maxFar, practical split, light margin, fade, per-cascade bias/normalBias |
| Trees (leaf/bark/blob), grass, pedestrians | Ported |
| Post | TSL `bloom()` in a `RenderPipeline` on ultra or `?bloom=1`; same strength/threshold driven by night |
| `hedge`, `dash` (streetscape), `flagWave`, `signalLens` (props), ludwigs-fountain water, `ez-*` (ezlib trees, unused at runtime today) | **Not ported**: render with their base material (plain hedge colour, no road-dash UV trick, static flags, unlit signal lenses). Small follow-ups |
| `customDepthMaterial` (tree shadow materials) | Not needed: the shadow pass reuses the source material's `positionNode` and map alpha |
| Stars / Bay Lights | Points are always 1 px in WebGPU (WebGL used 1.6–3 px) |

## Visual differences (same views, same time; screenshots in the delivery)
A vision-model diff of WebGL vs WebGPU at spawn, aerial, Memorial Glade and wide hills found terrain, buildings, landmarks, shadows, fog, haze, water and exposure **match**. Mean frame colour differs by ≤ 3/255 in most views. Remaining differences:
1. **Twilight/night sky is brighter** in WebGPU. r187's `SkyMesh` is not a literal port of `Sky.js`: its cloud shading differs (beer/powder + aerial composite), so dusk skies read lavender instead of near-black. Fix: port `Sky.js`'s fragment to TSL verbatim, or set `cloudCoverage = 0` on both.
2. **Clouds differ** between runs because `uTime` depends on how long the title loop ran. This is not a renderer difference.
3. **Night lamp light on foliage** was missing before the translucency lighting model was added (fixed in this branch). Re-check after any lighting changes.
4. Leaf alpha-test edges can look slightly harder. MSAA plus alpha-to-coverage behaves differently from WebGL.
5. Items in "Not ported" above (hedges, road dashes, flags, signal lenses).

## Performance
This was measured in headless Chromium on **SwiftShader** (software Vulkan / software GL), 960×540, high quality, spawn view, with the paused loop driven via `BSIM.renderOnce()`. SwiftShader is CPU-rasterised, so absolute GPU times are meaningless; use these numbers for relative CPU cost and compile behaviour only. Real-GPU numbers need a headed run on a laptop (`dev/` has no GPU).

| Spawn view (Sproul → Sather Gate) | WebGL | WebGPU |
|---|---|---|
| Boot to `BSIM.ready` | 30.9 s | 37.7 s |
| First frame (includes shader/pipeline compile) | 26.7 s | **17.6 s** |
| CPU per frame: JS + command encoding (median of 6) | **11 ms** | 63 ms |
| Frame incl. GPU completion (SwiftShader, median) | 7.1 s | 8.2 s |
| Aerial view: CPU / total | 10 ms / 5.8 s | 67 ms / 6.4 s |
| JS heap after boot | 694 MB | 902 MB |
| Draw calls (main + 3 shadow cascades) | ~860 | similar (same scene graph) |

Read-out:
- **CPU cost is the real regression: about 60 ms vs 11 ms per frame.** three.js r187's WebGPU backend spends much more main-thread time per draw than WebGLRenderer: render-object bookkeeping, bind groups, and per-object uniform writes, across ~860 draws plus 3 shadow cascades. It is main-thread JavaScript, so a real GPU won't fix it. A fast laptop CPU will run it faster than this sandbox, but the ~5× ratio should hold (unmeasured on real hardware). **WebGPU must not become the default until the draw count drops.** Levers, in order: `BatchedMesh` / merging static landmark meshes per material; GPU-driven tree and grass instancing; fewer per-object uniforms (fewer `onRenderUpdate` callbacks, which are cheap but numerous); and moving to later three releases, which keep cutting WebGPU CPU overhead.
- First-frame compile is faster under WebGPU: 17.6 s vs 26.7 s on SwiftShader, even though it compiles more pipelines (the hand-written graphs are scoped per material, ≈14 species × leaf/bark/blob plus ~40 others). `renderer.compileAsync(scene, camera)` behind the loading screen would hide it either way.
- GPU-side time can't be judged on a software rasteriser. It was within ~15% of WebGL here.
- Memory: about +200 MB JS heap (node graphs, builder states, WGSL sources, a second material object per source material).

## Recommendation
**Keep WebGPU opt-in (beta) and don't make it the default yet.** The port is visually faithful for the core scene, and WebGPU plus TSL is the right base for "shaders, webgpu, etc.": compute culling, storage buffers, TSL post like GTAO/SSR/TRAA, and one shader source for both backends. But with today's scene structure (~860 draws) three r187's WebGPU backend costs about 5× the CPU per frame of the WebGL path. Flip the default only after the draw-count work in phase 2 and a real-GPU check.

### Phased plan
1. **Now (this branch):** ship `?renderer=webgpu` as an opt-in plus a Settings toggle ("Renderer: WebGL / WebGPU (beta)"). Collect `BSIM.timing` and FPS from real machines (Mac Safari 26 / Chrome, Windows Chrome).
2. **Parity + CPU (≈2–4 days):** cut draws first: merge static landmark meshes by material, `BatchedMesh` for props and signs, and one instanced draw per tree species/LOD (already true) with compute culling. Target WebGPU CPU ≤ WebGL CPU at spawn. Port the 6 remaining small patches (hedge, dash, flag, signal lens, fountain, ezlib). Port `Sky.js` verbatim to TSL. Add `compileAsync` during loading. Add a visual regression check: `tools-qa/webgpu-snap.mjs` WebGL vs WebGPU per view, failing above a mean-colour delta.
3. **Default on capable browsers:** `renderer=auto` picks WebGPU when an adapter exists and isn't a fallback adapter, and keeps WebGL elsewhere (mobile Safari < 26, Firefox ESR). The WebGL code stays the fallback for at least one release.
4. **WebGPU-only wins (ultra tier):** GPU-driven tree/grass instancing with compute culling and indirect draws (removes the per-frame CPU instance repack and ~800 draws), TSL GTAO + SSR on glass and water, TRAA instead of MSAA, and storage-buffer instance data (also removes the 8-vertex-buffer pressure the leaves hit).
5. **Retire GLSL:** once WebGPU is the default and stable, move the world modules to author TSL directly (TSL also compiles to GLSL for the WebGL2 backend) and delete the `onBeforeCompile` patches and the translation layer.

## Testing setup (headless)
- **WebGPU needs a secure context:** `http://localhost` works and `about:blank` does not.
- With Playwright's default headless shell plus `--use-webgpu-adapter=swiftshader`, an adapter and device are available, but presenting to a canvas destroys the device. Chromium logs `Could not find SharedImageBackingFactory … WebgpuSwapChainTexture`. Offscreen render plus buffer readback works.
- **Working flags (canvas presentation and `toDataURL` OK):** `--enable-unsafe-webgpu --use-webgpu-adapter=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --enable-features=Vulkan --use-vulkan=swiftshader --use-gl=angle --use-angle=swiftshader --ozone-platform=headless`. They work with either `channel: 'chromium'` or the headless shell. WebGL keeps working under the same flags, so both renderers can be captured in one browser config.
- Scripts are in `tools-qa/` (copy to `/work/qa/gpu/`):
  - `webgpu-probe.mjs` prints adapter info.
  - `webgpu-snap.mjs "<query>" <name> [T<hour>] [@x,y,z,tx,ty,tz …]` takes screenshots. `T17.35` switches the time of day mid-run.
  - `webgpu-perf.mjs` measures frame timings.
- **Vite dev:** the first visit after adding `three/webgpu` triggers a dep re-optimisation and page reload. During that window two copies of the TSL module can load, giving "No stack defined for assign". Reload once. Adding `optimizeDeps.include: ['three/webgpu', 'three/tsl']` would avoid it; left out to keep `vite.config.js` untouched.
