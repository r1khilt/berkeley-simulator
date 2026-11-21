import * as THREE from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { loadJSON, loadBin, loadImage, decodePlanar, onProgress } from './data.js';
import { Grid, HeightField } from './world/heightfield.js';
import { CoreTerrain, ringMesh, makeWater } from './world/terrain.js';
import { SkySystem, fetchWeather } from './world/sky.js';
import { buildBuildings, initSkeleton } from './world/buildings.js';
import { decodeTrees, TreeSystem } from './world/vegetation.js';
import { LandmarkManager, loadManifest, normId } from './world/landmarks.js';
import { Physics } from './player/physics.js';
import { Player } from './player/player.js';
import { installModes } from './player/modes/index.js';
import { UI, buildMapCanvas } from './ui/ui.js';
import { Audio } from './audio.js';
import { PLACES } from './places.js';
import { buildStreetscape } from './world/streetscape.js';
import { buildSkyline, buildBridges } from './world/far.js';
import { buildSigns } from './world/signs.js';
import { Pedestrians } from './world/npcs.js';
import { buildMidCity } from './world/midcity.js';
import { Grass } from './world/grass.js';
import { U, materials } from './materials.js';
import { pacificParts, pacificHour, dateAtPacificHour, clockString } from './time.js';
import { installGrading, contactAO, GRADE } from './world/grading.js';
import { initPBR, PBR, pbrWeather } from './world/pbr.js'; // gfx-materials: PBR surface textures
installGrading();

const canvas = document.getElementById('c');
const qs = new URLSearchParams(location.search);
const BS = (window.BSIM = { qs });
const isTouch = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
const store = { get(k, d) { try { const v = localStorage.getItem('bsim.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('bsim.' + k, JSON.stringify(v)); } catch (e) {} } };
const settings = Object.assign({ quality: isTouch ? 'low' : 'high', sens: 1, invertY: false, fov: 62, volume: 0.7, north: false }, store.get('settings', {}));
if (qs.get('q')) settings.quality = qs.get('q');
const Q = { low: { dpr: 1, shadow: 1024, cascades: 1, far: 260, trees: [55, 300], treeMax: 1600 }, medium: { dpr: 1.25, shadow: 2048, cascades: 2, far: 700, trees: [85, 420], treeMax: 2600 }, high: { dpr: 1.6, shadow: 2048, cascades: 3, far: 1100, trees: [115, 560], treeMax: 4000 }, ultra: { dpr: 2, shadow: 4096, cascades: 3, far: 1800, trees: [160, 800], treeMax: 6000 } }[settings.quality] || {};
const ui = new UI(document.getElementById('ui'));
onProgress((f) => ui.progress(f * 0.75));

async function boot() {
  let renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', reversedDepthBuffer: !qs.get('nordb') });
  if (!renderer.capabilities.reversedDepthBuffer) { renderer.dispose(); renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true }); }
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr)); renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.CustomToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.2, 160000);
  Object.assign(BS, { renderer, scene, camera, settings });
  const t0 = performance.now();
  const pbrP = initPBR(settings.quality); // gfx-materials: load PBR surface textures in parallel with the world data
  ui.note('Loading terrain, buildings and trees…');
  const [metaCore, metaFar] = await Promise.all([loadJSON('meta_core.json'), loadJSON('meta_far.json')]);
  const manifestP = loadManifest();
  const [terrRes, sdfRes, specRes, auxRes, midRes, farRes, bjson, treeBin, vectors, orthoCore, orthoMid, orthoFar, pois, skylineData, signsData, midData] = await Promise.all([
    loadBin('terrain_core.bin.gz'), loadBin('ground_sdf.bin.gz'), loadBin('ground_special.bin.gz'), loadBin('ground_aux.bin.gz'),
    loadBin('terrain_mid.bin.gz'), loadBin('terrain_far.bin.gz'), loadJSON('buildings.json.gz'), loadBin('trees.bin.gz'), loadJSON('vectors.json.gz'),
    loadImage('ortho_core.webp'), loadImage('ortho_mid.webp'), loadImage('ortho_far.webp'), loadJSON('pois.json.gz'), loadJSON('skyline.json.gz'), loadJSON('signs.json.gz').catch(() => []), loadJSON('mid_buildings.json.gz').catch(() => [])]);
  const roofsRaw = await loadJSON('roofs.json.gz');
  const manifest = await manifestP;
  ui.note('Building the campus…'); ui.progress(0.78); await tick();
  const tLoad = performance.now();
  const PH = {}; let _pt = performance.now(); const phase = (n) => { const t = performance.now(); PH[n] = Math.round(t - _pt); _pt = t; };
  // ---- terrain data
  const c = metaCore.core;
  const heights = decodePlanar(new Int16Array(terrRes.buffer, terrRes.byteOffset, c.nx * c.nz), c.nx, c.nz, new Float32Array(c.nx * c.nz), 0.01);
  const gt = metaCore.groundTex, N = gt.nx * gt.nz;
  const sdfI8 = new Int8Array(sdfRes.buffer, sdfRes.byteOffset, N * 4), sdf = new Uint8Array(N * 4);
  if (gt.enc === 'rowdelta64') { for (let ch = 0; ch < 4; ch++) { const o = ch * N; for (let i = 0; i < gt.nz; i++) { let acc = 0; const r = i * gt.nx; for (let j = 0; j < gt.nx; j++) { acc += sdfI8[o + r + j]; sdf[(r + j) * 4 + ch] = Math.min(255, Math.round(acc * 4.0476)); } } } }
  else { const plane = new Float32Array(N); for (let ch = 0; ch < 4; ch++) { decodePlanar(sdfI8.subarray(ch * N, (ch + 1) * N), gt.nx, gt.nz, plane, 1); for (let k = 0; k < N; k++) sdf[k * 4 + ch] = plane[k]; } }
  const ax = metaCore.aux, NA = ax.nx * ax.nz; const auxI8 = new Int8Array(auxRes.buffer, auxRes.byteOffset, NA * 2), aux = new Uint8Array(NA * 2);
  { const plane = new Float32Array(NA); for (let ch = 0; ch < 2; ch++) { decodePlanar(auxI8.subarray(ch * NA, (ch + 1) * NA), ax.nx, ax.nz, plane, 1); for (let k = 0; k < NA; k++) aux[k * 2 + ch] = Math.min(255, plane[k] * 4.05); } }
  const mm = metaFar.mid, ff = metaFar.far;
  const midH = decodePlanar(new Int16Array(midRes.buffer, midRes.byteOffset, mm.nx * mm.nz), mm.nx, mm.nz, new Float32Array(mm.nx * mm.nz), 0.1);
  const farH = decodePlanar(new Int16Array(farRes.buffer, farRes.byteOffset, ff.nx * ff.nz), ff.nx, ff.nz, new Float32Array(ff.nx * ff.nz), 0.1);
  const core = new Grid(heights, c.x0 + 0.5, c.z0 + 0.5, c.step, c.nx, c.nz), mid = new Grid(midH, mm.x0, mm.z0, mm.step, mm.nx, mm.nz), far = new Grid(farH, ff.x0, ff.z0, ff.step, ff.nx, ff.nz);
  const hf = new HeightField(core, mid, far); BS.hf = hf;
  const heightAt = (x, z) => hf.heightAt(x, z);
  const terrain = new CoreTerrain({ heights, meta: metaCore, sdf, special: specRes, aux, ortho: orthoCore });
  scene.add(terrain.group); phase('terrainDecode');
  const coreRect = { x0: c.x0, x1: c.x0 + c.nx * c.step, z0: c.z0, z1: c.z0 + c.nz * c.step };
  const tex = (img) => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const texMid = tex(orthoMid), texFar = tex(orthoFar);
  scene.add(ringMesh({ sample: (x, z) => (core.contains(x, z) ? core.sample(x, z) : mid.sample(x, z)), x0: -2400, x1: 2400, z0: -2400, z1: 2400, hole: coreRect, step: 16, texture: texMid, texRect: metaFar.midImg, tile: 800, name: 'ringA' }));
  scene.add(ringMesh({ sample: (x, z) => mid.sample(x, z), x0: -8000, x1: 8000, z0: -8000, z1: 8000, hole: { x0: -2400, x1: 2400, z0: -2400, z1: 2400 }, step: 64, texture: texMid, texRect: metaFar.midImg, tile: 2000, name: 'ringB' }));
  scene.add(ringMesh({ sample: (x, z) => far.sample(x, z), x0: -60000, x1: 60000, z0: -60000, z1: 60000, hole: { x0: -8000, x1: 8000, z0: -8000, z1: 8000 }, step: 400, texture: texFar, texRect: metaFar.farImg, tile: 12000, skirt: 30, name: 'ringC' }));
  scene.add(makeWater()); phase('rings');
  await tick(); ui.progress(0.82);
  // ---- physics, landmarks, buildings
  const physics = new Physics(heightAt); BS.physics = physics;
  const standinIds = new Set(); for (const l of manifest.landmarks) for (const r of l.replaces || []) standinIds.add(normId(r));
  // also stand in (hide when the landmark loads) any OSM building whose centroid lies inside a landmark footprint
  { const inR = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; };
    const lmBoxes = manifest.landmarks.map((l) => { const fps = l.footprints || []; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const fp of fps) for (const [x, z] of fp) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); } return { l, fps, b: [x0, z0, x1, z1] }; });
    let added = 0;
    for (const b of bjson.b) { const f = b[7][0][5]; let cx = 0, cz = 0; for (let i = 0; i < f.length; i += 2) { cx += f[i]; cz += f[i + 1]; } cx /= f.length / 2 * 10; cz /= f.length / 2 * 10;
      for (const L of lmBoxes) { if (cx < L.b[0] || cx > L.b[2] || cz < L.b[1] || cz > L.b[3]) continue; if (L.fps.some((fp) => inR(cx, cz, fp))) { if (!standinIds.has(b[0])) { standinIds.add(b[0]); (L.l.replaces = L.l.replaces || []).push(b[0]); added++; } break; } } }
    console.log('extra standins', added); }
  const skel = { __complete: true }; for (const [k, [o, fv, polys]] of Object.entries(roofsRaw)) { const v = []; for (let i = 0; i < fv.length; i += 3) v.push([fv[i], fv[i + 1], fv[i + 2]]); skel[k] = { o, s: { vertices: v, polygons: polys } }; }
  phase('skelInit'); const bres = buildBuildings(bjson, { standinIds, skel }); phase('buildings');
  scene.add(bres.group);
  for (const col of bres.colliders) { physics.addRing(col.outer, col.y0, col.y1, col.id); for (const h of col.holes) physics.addRing(h, col.y0, col.y1, col.id); }
  await tick(); ui.progress(0.86);
  const lmFootprints = manifest.landmarks.flatMap((l) => l.footprints || []);
  await tick(); ui.progress(0.9);
  // ---- trees
  const trees = decodeTrees(treeBin);
  let treeSys = null;
  try {
    const { createTreeLibrary, TREE_REF_TINT } = await import('./vegetation/trees.js');
    const lib = createTreeLibrary({ season: 'late-autumn', leafTexSize: settings.quality === 'low' ? 512 : 1024 }); phase('treeLib');
    treeSys = new TreeSystem({ lib, trees, refTint: TREE_REF_TINT, lodDistances: Q.trees, maxDist: Q.treeMax });
    BS.treeLib = lib;
    // hide trees inside landmark footprints
    const pts = []; for (const fp of lmFootprints) { let x = 0, z = 0; fp.forEach((p) => { x += p[0]; z += p[1]; }); x /= fp.length; z /= fp.length; let r = 0; fp.forEach((p) => { r = Math.max(r, Math.hypot(p[0] - x, p[1] - z)); }); if (r < 60) pts.push([x, z, r * 0.8]); }
    treeSys.hideInPolys(lmFootprints.filter((fp) => fp.length >= 3));
    scene.add(treeSys.group);
    for (let i = 0; i < trees.n; i++) { const h = trees.h[i] / 100; if (h > 4.5 && trees.sp[i] !== 13) physics.addCircle(trees.x[i] / 10, trees.z[i] / 10, Math.min(0.9, 0.18 + h * 0.012), trees.y[i] / 100 - 2, trees.y[i] / 100 + 3, 'tree'); }
  } catch (e) { console.warn('trees unavailable', e); }
  BS.trees = treeSys; phase('treeSys');
  { // leaf-litter map from deciduous trees (2 m texels)
    const res = 2, W = Math.round(c.nx * c.step / res), H = Math.round(c.nz * c.step / res); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx2 = cv.getContext('2d');
    const DEC = { 1: [255, 190, 90], 2: [230, 170, 90], 8: [240, 150, 60], 9: [255, 225, 70] };
    for (let i = 0; i < trees.n; i++) { const col = DEC[trees.sp[i]]; if (!col) continue; const x = (trees.x[i] / 10 - c.x0) / res, z = (trees.z[i] / 10 - c.z0) / res, r = Math.max(2, trees.r[i] / 10 * 1.15) / res;
      const g = cx2.createRadialGradient(x, z, 0, x, z, r); g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.55)`); g.addColorStop(0.7, `rgba(${col[0]},${col[1]},${col[2]},0.25)`); g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`); cx2.fillStyle = g; cx2.beginPath(); cx2.arc(x, z, r, 0, 7); cx2.fill(); }
    const lt = new THREE.CanvasTexture(cv); lt.flipY = false; lt.minFilter = THREE.LinearFilter; lt.generateMipmaps = false; lt.colorSpace = THREE.NoColorSpace; lt.needsUpdate = true; terrain.uniforms.uLeaf.value = lt; }
  let streets = null;
  try { streets = await buildStreetscape({ scene, vectors, pois, heightAt, physics, rect: { x0: c.x0, z0: c.z0, w: c.nx * c.step, h: c.nz * c.step } }); terrain.uniforms.uLamp.value = streets.lampTex; } catch (e) { console.warn('streetscape failed', e); }
  BS.streets = streets; phase('streetscape');
  // a few real point lights follow the player through the nearest lamps at night
  const lampLights = []; for (let i = 0; i < (qs.get('nolamps') ? 0 : 6); i++) { const L = new THREE.PointLight(0xffd6a0, 0, 26, 2); L.castShadow = false; scene.add(L); lampLights.push(L); }
  const lampPts = streets ? streets.lampPts : [];
  let lampTick = 0;
  const updateLampLights = (cp, night) => {
    if (++lampTick % 10 && lampLights[0].userData.ok) { for (const L of lampLights) L.intensity = L.userData.k * night; return; }
    const near = []; for (const p of lampPts) { const d = (p[0] - cp.x) ** 2 + (p[1] - cp.z) ** 2; if (d < 90 * 90) near.push([d, p]); }
    near.sort((a, b) => a[0] - b[0]);
    lampLights.forEach((L, i) => { const q = near[i]; if (!q) { L.userData.k = 0; L.intensity = 0; return; } const [x, z, k] = q[1]; const hh = k > 1 ? 7.5 : 3.8; L.position.set(x, heightAt(x, z) + hh, z); L.userData.k = k > 1 ? 60 : 32; L.intensity = L.userData.k * night; L.userData.ok = true; });
  };
  scene.add(buildSigns(signsData).group);
  if (midData.length) scene.add(buildMidCity(midData, heightAt));
  scene.add(buildSkyline(skylineData, heightAt));
  const bridges = buildBridges(); scene.add(bridges.group); phase('far');
  const grass = (settings.quality === 'low' || qs.get('nograss')) ? null : new Grass({ sdf, gt, core: { x0: c.x0, z0: c.z0 }, heightAt, count: settings.quality === 'ultra' ? 32000 : 22000 }); if (grass) scene.add(grass.mesh);
  const peds = new Pedestrians({ paths: vectors.paths, heightAt, max: { low: 50, medium: 110, high: 180, ultra: 260 }[settings.quality] || 180 }); scene.add(peds.mesh); BS.peds = peds;
  await tick(); ui.progress(0.94);
  // ---- sky + CSM shadows
  const sky = new SkySystem({ renderer, scene, camera }); BS.sky = sky;
  const useCSM = qs.get('csm') !== '0';
  class SimpleSun { // fallback: one shadowed directional light following the camera
    constructor() { this.lights = [new THREE.DirectionalLight(0xffffff, 3)]; const l = this.lights[0]; l.castShadow = true; l.shadow.mapSize.set(Q.shadow || 2048, Q.shadow || 2048); const c = l.shadow.camera; c.left = -180; c.right = 180; c.top = 180; c.bottom = -180; c.near = 1; c.far = 3000; l.shadow.bias = -0.0004; l.shadow.normalBias = 0.05; scene.add(l, l.target); this.lightDirection = new THREE.Vector3(0, -1, 0); this.fade = false; }
    setupMaterial() {} updateFrustums() {}
    update() { const l = this.lights[0]; const t = camera.position; l.target.position.copy(t); l.position.copy(t).addScaledVector(this.lightDirection, -1500); l.target.updateMatrixWorld(); }
  }
  const csm = !useCSM ? new SimpleSun() : new CSM({ maxFar: Q.far, cascades: Q.cascades, mode: 'practical', parent: scene, shadowMapSize: Q.shadow, lightDirection: new THREE.Vector3(-0.5, -0.8, -0.3).normalize(), camera, lightIntensity: 3, lightNear: 1, lightFar: 6000, shadowBias: -0.00025, lightMargin: 400 });
  csm.fade = true;
  if (qs.get('bias')) for (const l of csm.lights) l.shadow.bias = parseFloat(qs.get('bias'));
  if (qs.get('noshadow')) { for (const l of csm.lights) l.castShadow = false; }
  BS.drawStats = () => { const sm = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false; renderer.info.autoReset = false; renderer.info.reset(); renderer.render(scene, camera); const main = { ...renderer.info.render }; renderer.shadowMap.enabled = sm; renderer.info.autoReset = true; return main; };
  csm.lights.forEach((l, i) => { l.shadow.normalBias = [0.07, 0.22, 0.5, 0.9][i] ?? 0.9; l.shadow.bias = [-0.0003, -0.0006, -0.001, -0.0015][i] ?? -0.0015; });
  const csmDone = new WeakSet();
  const aoCore = { v4: terrain.uniforms.uCore.value, size: terrain.uniforms.uCoreSize.value };
  const setupMaterials = (root) => root.traverse((o) => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { if (!m || csmDone.has(m) || !(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) continue; csmDone.add(m); pbrWeather(m); /* gfx-materials: base grime on PBR masonry */ if (o.parent !== terrain.group && !m.transparent && o.name !== 'bay' && !(m.customProgramCacheKey && /coreTerrain|ring|bayWater|creek/.test(m.customProgramCacheKey()))) contactAO(m, terrain.uniforms.uHeight.value, aoCore); const prev = m.onBeforeCompile; if (!useCSM) continue; const k1 = String(m.customProgramCacheKey()); csm.setupMaterial(m); const hook = m.onBeforeCompile; m.onBeforeCompile = function (sh, r) { if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev.call(this, sh, r); hook.call(this, sh, r); }; m.customProgramCacheKey = () => k1 + '|csm'; m.needsUpdate = true; } });
  BS.csm = csm;
  // ---- player
  const physicsPlayer = new Player({ scene, camera, physics, dom: canvas, look: store.get('look', {}) });
  const player = physicsPlayer; BS.player = player;
  player.sens = settings.sens; player.invertY = settings.invertY;
  setupMaterials(scene);
  const lm = new LandmarkManager({ scene, physics, heightAt, manifest, standins: bres.standinMgr, setupMaterials,
    onLoaded: (l) => { player.interactions.push(...(l.inter || [])); },
    onUnloaded: (l) => { player.interactions = player.interactions.filter((it) => it.landmark !== l.id); } });
  BS.lm = lm;
  ui.note('Raising the Campanile…');
  await lm.loadNow(manifest.landmarks.filter((l) => l.always).map((l) => l.id));
  const landmarks = lm.placed; BS.landmarks = landmarks; phase('landmarks');
  const audio = new Audio(); audio.setVolume(settings.volume); BS.audio = audio;
  player.onStep = (k) => audio.step(k, player.speed);
  // ---- map + places
  const places = PLACES.map((p) => ({ ...p }));
  for (const l of manifest.landmarks) {
    const fp = (l.footprints || [])[0];
    places.unshift({ id: l.id, name: l.name, sub: l.subtitle, blurb: l.blurb, p: [l.anchor.x, l.anchor.z], r: Math.max(18, fp ? Math.min(70, Math.sqrt(Math.abs(area(fp))) * 0.9) : 20), landmark: true });
  }
  const found = new Set(store.get('found', []));
  for (const p of places) p.found = found.has(p.id);
  phase('misc'); const map = buildMapCanvas({ sdf, nx: gt.nx, nz: gt.nz, step: gt.step, x0: c.x0, z0: c.z0, buildings: bjson, trees, water: vectors.water, landmarkFootprints: lmFootprints, replaced: standinIds });
  map.places = places; ui.setMap(map); BS.places = places; phase('map');
  ui.count(found.size, places.length);
  // named buildings & roads for location labels
  const namedB = bres.named; const roads = vectors.roads.filter((r) => r.name);
  // ---- time & weather
  const timeSt = { live: !qs.get('t'), hour: 12, weather: 'live', wx: null };
  if (qs.get('t')) timeSt.hour = pacificHour(new Date(qs.get('t')));
  const now = () => (timeSt.live ? new Date() : dateAtPacificHour(timeSt.hour));
  const applyWeather = () => {
    const w = timeSt.weather === 'live' ? timeSt.wx : null; let cover = 0.3, fogMul = 1, label = '';
    if (timeSt.weather === 'clear') cover = 0.05; else if (timeSt.weather === 'cloudy') cover = 0.45; else if (timeSt.weather === 'overcast') cover = 0.9; else if (timeSt.weather === 'fog') { cover = 0.8; fogMul = 9; }
    else if (w) { cover = (w.cloud_cover ?? 30) / 100; if (w.weather_code === 45 || w.weather_code === 48 || (w.visibility && w.visibility < 4000)) fogMul = 7; label = `${Math.round(w.temperature_2m * 9 / 5 + 32)}°F · ${wxName(w.weather_code)}`; }
    sky.setCloudCover(cover); sky.weatherFog = fogMul; U.uWind.value = w ? Math.min(1, (w.wind_speed_10m || 8) / 30) : 0.35; timeSt.label = label || ({ clear: 'Clear', cloudy: 'Partly cloudy', overcast: 'Overcast', fog: 'Foggy' }[timeSt.weather] || '');
  };
  fetchWeather().then((w) => { timeSt.wx = w; applyWeather(); });
  applyWeather();
  // ---- spawn
  const spawn = () => { const x = -156, z = 246; const yaw = Math.atan2(-(-147 - x), -(204 - z)); player.teleport(x, null, z, yaw); player.camYaw = yaw; player.camPitch = 0.04; }; // Sproul Plaza, framing Sather Gate
  spawn();
  // ---- UI wiring
  const startPlay = () => { ui.showTitle(false); state = 'play'; player.enabled = true; audio.start(); if (!isTouch) canvas.requestPointerLock?.(); if (!store.get('helped', false)) { store.set('helped', true); } BS.flyover = false; };
  let state = 'title';
  ui.on('play', startPlay);
  ui.on('look', () => ui.customize(player.avatar.look, (k, v) => { player.avatar.setLook({ [k]: v }); setupMaterials(player.avatar.root); store.set('look', player.avatar.look); }));
  ui.on('settings', () => ui.settings(settings, onSetting));
  ui.on('map', () => openMap()); ui.on('time', () => openTime());
  ui.on('panelClosed', () => { if (state === 'play' && !isTouch) canvas.requestPointerLock?.(); });
  ui.on('mapClosed', () => { if (state === 'play' && !isTouch) canvas.requestPointerLock?.(); });
  const onSetting = (k, v) => {
    settings[k] = v; store.set('settings', settings);
    if (k === 'sens') player.sens = v; if (k === 'invertY') player.invertY = v; if (k === 'volume') audio.setVolume(v);
    if (k === 'fov') { camera.fov = v; camera.updateProjectionMatrix(); csm.updateFrustums(); }
    if (k === 'quality') { ui.toast({ kind: 'Graphics', name: 'Reloading…', sub: v }, 1500); setTimeout(() => location.reload(), 600); }
  };
  const openMap = () => ui.openMap({ px: player.pos.x, pz: player.pos.z, heading: -player.camYaw, places, onTravel: (x, z, p) => ui.fade(() => { const g = physics.groundAt(x, z); player.teleport(x, g.y, z); player.setMode(player.mode === 'fly' ? 'fly' : player.mode); }) });
  const openTime = () => ui.timePanel(timeSt, (k, v) => {
    if (k === 'hour') { timeSt.hour = v; timeSt.live = false; }
    if (k === 'live') { timeSt.live = v; if (!v) timeSt.hour = pacificHour(new Date()); }
    if (k === 'weather') { timeSt.weather = v; applyWeather(); }
    if (k === 'preset') { timeSt.live = false; timeSt.hour = v === 'sunset' ? sunsetHour() - 0.35 : 21.5; }
  });
  const sunsetHour = () => { const base = new Date(); for (let h = 15; h < 21; h += 0.05) { const d = dateAtPacificHour(h, base); if (sky && sunAlt(d) < 0) return h; } return 17; };
  canvas.addEventListener('click', () => { if (state === 'play' && !isTouch && !document.pointerLockElement && !ui.panelEl && !ui.bigmap) canvas.requestPointerLock?.(); });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && state === 'play' && !ui.panelEl && !ui.bigmap && !isTouch) ui.settings(settings, onSetting); });
  addEventListener('keydown', (e) => {
    if (state !== 'play' || (e.target && e.target.tagName === 'INPUT')) return;
    if (e.code === 'KeyM' && !e.repeat) { if (ui.bigmap) ui.closeMap(); else openMap(); }
    if (e.code === 'KeyT' && !e.repeat) { if (ui.panelEl) ui.closePanel(); else openTime(); }
    if (e.code === 'KeyH' && !e.repeat) ui.help();
    if (e.code === 'KeyP' && !e.repeat) { BS.photo = !BS.photo; ui.hudOn(!BS.photo); }
    if (e.code === 'KeyR' && !e.repeat && e.shiftKey) ui.fade(spawn);
  });
  if (isTouch) ui.touchControls(player, { jump: () => { player.jumpReq = true; }, run: (b) => { player.touch.run = !player.touch.run; b.style.background = player.touch.run ? 'rgba(253,181,21,.5)' : ''; }, bike: () => player.setMode(player.mode === 'bike' ? 'walk' : 'bike'), use: () => { if (player.activeInteraction) player.onInteract(player.activeInteraction); }, map: () => openMap() });
  player.onInteract = (it) => { if (it.teleport) ui.fade(() => { player.teleport(it.teleport[0], it.teleport[1] + 0.02, it.teleport[2]); player.setMode('walk'); }); };
  player.onModeChange = (m) => { ui.reticleOn(false); setupMaterials(player.bike.root); };
  installModes(player, { scene, physics, audio, ui, THREE, camera, setupMaterials });
  // ---- title flyover shots
  const shots = [
    { t: [0, 60, 0], r: 150, h: 70, sp: 0.05, name: 'Sather Tower' },
    { t: [-147, 88, 204], r: 40, h: 12, sp: 0.07, name: 'Sather Gate' },
    { t: [-140, 92, -110], r: 120, h: 45, sp: -0.04, name: 'Memorial Glade' },
    { t: [624, 130, 120], r: 260, h: 110, sp: 0.04, name: 'California Memorial Stadium' },
    { t: [-100, 110, 0], r: 700, h: 260, sp: 0.025, name: 'UC Berkeley' },
  ];
  let shotI = 0, shotT = 0; BS.flyover = true;
  const flyover = (dt) => {
    shotT += dt; const s = shots[shotI];
    if (shotT > 11) { shotT = 0; shotI = (shotI + 1) % shots.length; ui.fade(null, 200); }
    const a = shotT * s.sp + shotI * 1.7; const ty = s.t[1];
    camera.position.set(s.t[0] + Math.sin(a) * s.r, ty + s.h, s.t[2] + Math.cos(a) * s.r);
    const gy = heightAt(camera.position.x, camera.position.z); if (camera.position.y < gy + 8) camera.position.y = gy + 8;
    camera.lookAt(s.t[0], ty, s.t[2]);
    ui.titlePlace(s.name);
  };
  // ---- main loop
  let last = performance.now(), acc = 0, lastHour = -1, lastQuarter = -1, frameN = 0, recitalDone = new Set();
  const tmpV = new THREE.Vector3();
  function frame(dt) {
    frameN++;
    U.uTime.value += dt;
    const date = now(); BS.date = date;
    const st = sky.update(date, dt);
    // CSM light
    csm.lightDirection.copy(sky.lightDir).negate();
    for (const l of csm.lights) { l.color.copy(sky.sunColor); l.intensity = sky.sunIntensity; }
    if (state === 'play') { player.update(dt); } else if (BS.flyover) flyover(dt);
    camera.updateMatrixWorld();
    csm.update();
    terrain.update(camera);
    if (treeSys) { treeSys.update(camera); BS.treeLib?.update?.(dt); }
    if (streets) streets.update(camera.position);
    updateLampLights(state === 'play' ? player.pos : camera.position, U.uNight.value);
    if (grass) grass.update(camera.position);
    bridges.update(U.uNight.value);
    { const hr = pacificHour(date); const busy = hr < 6 ? 0.08 : hr < 8 ? 0.3 : hr < 18 ? 1.0 : hr < 22 ? 0.6 : 0.25; peds.update(dt, (state === 'play' ? player.pos : camera.position), busy); }
    lm.update(camera.position); lm.frame(dt, { time: date, night: U.uNight.value, camera });
    // HUD (throttled)
    if (state === 'play' && frameN % 3 === 0) hud(date);
    if (state === 'play') { ui.compass(((-player.camYaw * 180 / Math.PI) % 360 + 360) % 360); ui.minimap(player.pos.x, player.pos.z, player.camYaw, settings.north); ui.prompt(player.activeInteraction ? player.activeInteraction.label : null); }
    audio.update(dt, { night: U.uNight.value, wind: U.uWind.value, bikeSpeed: player.mode === 'bike' ? player.speed : 0 });
    // bells
    const pp = pacificParts(date);
    if (timeSt.live && audio.started) {
      const tower = lm.byId.get('sather-tower');
      const bp = tower?.anchors?.bells || [0, 160, 0];
      const d = Math.hypot(bp[0] - camera.position.x, bp[1] - camera.position.y, bp[2] - camera.position.z);
      const pan = Math.sin(Math.atan2(bp[0] - camera.position.x, -(bp[2] - camera.position.z)) + player.camYaw);
      if (pp.minute === 0 && lastHour !== pp.hour && pp.second < 5) { lastHour = pp.hour; audio.strikeHour(pp.hour, d, pan); }
      const rk = `${pp.month}-${pp.day}-${pp.hour}`;
      if (((pp.hour === 7 && pp.minute === 50) || (pp.hour === 12 && pp.minute === 0 && pp.second > 40) || (pp.hour === 18 && pp.minute === 0 && pp.second > 40)) && !recitalDone.has(rk)) { recitalDone.add(rk); audio.carillon(d, pan, 50); }
    }
    if (composer) { bloom.strength = 0.03 + 0.35 * U.uNight.value; bloom.threshold = 0.99 - 0.14 * U.uNight.value; composer.render(dt); } else renderer.render(scene, camera);
  }
  function hud(date) {
    ui.clock(clockString(date), timeSt.label);
    // discovery
    for (const p of places) {
      const d = Math.hypot(p.p[0] - player.pos.x, p.p[1] - player.pos.z);
      p.d = d;
      if (!p.found && d < p.r) { p.found = true; found.add(p.id); store.set('found', [...found]); ui.toast({ kind: 'Discovered', name: p.name, sub: p.sub, blurb: p.blurb }); audio.chime(); ui.count(found.size, places.length); }
    }
    // location label
    let best = null, bs = 1; for (const p of places) { const s = p.d / p.r; if (s < bs) { bs = s; best = p; } }
    if (best) return ui.location(best.name, best.sub);
    let bn = null, bd = 30; for (const b of namedB) { const d = Math.hypot(b.c[0] - player.pos.x, b.c[1] - player.pos.z); if (d < bd) { bd = d; bn = b; } }
    if (bn) return ui.location(bn.name, '');
    let rn = null, rd = 14; for (const r of roads) { const P = r.pts; for (let k = 0; k < P.length - 1; k++) { const d = segDist(player.pos.x, player.pos.z, P[k][0], P[k][1], P[k + 1][0], P[k + 1][1]); if (d < rd) { rd = d; rn = r; } } }
    if (rn) return ui.location(rn.name, '');
    const { x, z } = player.pos; ui.location(x > 380 && z < 300 ? 'Berkeley Hills' : z > 420 ? 'Southside' : z < -480 ? 'Northside' : x < -800 ? 'Downtown Berkeley' : 'UC Berkeley campus', 'Berkeley, California');
  }
  // post: bloom for emissives (lamps, windows, sun glints)
  let composer = null, bloom = null;
  if ((settings.quality === 'ultra' || qs.get('bloom')) && !qs.get('nobloom')) {
    const rt = new THREE.WebGLRenderTarget(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.2, 0.18, 0.95); composer.addPass(bloom);
    composer.addPass(new OutputPass());
    addEventListener('resize', () => { composer.setSize(innerWidth, innerHeight); });
  }
  BS.composer = composer;
  // dynamic resolution: keep frame time near 16-20 ms by scaling the pixel ratio
  let ftAvg = 16, dprNow = renderer.getPixelRatio(), dprMax = Math.min(devicePixelRatio, Q.dpr), dprCheck = 0;
  renderer.setAnimationLoop(() => {
    const nowT = performance.now(); const raw = nowT - last; const dt = Math.min(0.1, raw / 1000); last = nowT; frame(dt);
    ftAvg += (Math.min(raw, 100) - ftAvg) * 0.05; dprCheck += raw;
    if (dprCheck > 1500 && !BS.fixedDpr) { dprCheck = 0;
      if (ftAvg > 24 && dprNow > 0.6) { dprNow = Math.max(0.6, dprNow - 0.15); renderer.setPixelRatio(dprNow); composer && composer.setPixelRatio(dprNow); }
      else if (ftAvg < 13 && dprNow < dprMax) { dprNow = Math.min(dprMax, dprNow + 0.1); renderer.setPixelRatio(dprNow); composer && composer.setPixelRatio(dprNow); } }
  });
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); csm.updateFrustums(); });
  // debug hooks for automated checks
  BS.pause = () => renderer.setAnimationLoop(null);
  BS.renderOnce = () => frame(0.016);
  BS.setView = (px, py, pz, tx, ty, tz, rel) => { BS.flyover = false; if (rel) { py += heightAt(px, pz); ty += heightAt(tx, tz); } camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); camera.updateMatrixWorld(); };
  BS.snapshot = (w = 64, h = 36) => { frame(0.016); const url = renderer.domElement.toDataURL('image/jpeg', 0.85); const g = document.createElement('canvas'); g.width = w; g.height = h; const x = g.getContext('2d'); x.drawImage(renderer.domElement, 0, 0, w, h); return { url, px: Array.from(x.getImageData(0, 0, w, h).data) }; };
  BS.sim = (sec, dt = 1 / 30) => { for (let t = 0; t < sec; t += dt) { U.uTime.value += dt; player.update(dt); } };
  BS.play = startPlay; BS.ui = ui; BS.timeSt = timeSt;
  BS.setTime = (h) => { timeSt.live = false; timeSt.hour = h; };
  BS.debug = () => ({ terrain: terrain.stats, trees: treeSys && treeSys.counts, landmarks: lm.placed.map((l) => l.id), player: player.pos.toArray().map((v) => +v.toFixed(1)), mode: player.mode, render: renderer.info.render });
  phase('rest'); BS.timing = { phases: PH, load: Math.round(tLoad - t0), build: Math.round(performance.now() - tLoad), buildings: bres.stats, reversed: renderer.capabilities.reversedDepthBuffer, landmarks: lm.placed.length + '/' + lm.items.length, trees: trees.n };
  console.log('BSIM timing', JSON.stringify(BS.timing));
  await Promise.race([pbrP, new Promise((r) => setTimeout(r, 8000))]); BS.pbr = PBR; // gfx-materials
  ui.progress(1); ui.ready(); BS.ready = true;
  if (qs.get('play')) startPlay();
}
function sunAlt(d) { const { sunPosition } = SKYFN; return sunPosition(d).altitude; }
import * as SKYFN from './world/sky.js';
function tick() { return new Promise((r) => requestAnimationFrame(() => r())); }
function area(r) { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az; const l = dx * dx + dz * dz; let t = l ? ((px - ax) * dx + (pz - az) * dz) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(ax + t * dx - px, az + t * dz - pz); }
function wxName(c) { if (c == null) return ''; if (c === 0) return 'Clear'; if (c <= 2) return 'Partly cloudy'; if (c === 3) return 'Overcast'; if (c === 45 || c === 48) return 'Fog'; if (c >= 51 && c <= 57) return 'Drizzle'; if (c >= 61 && c <= 67) return 'Rain'; if (c >= 71 && c <= 77) return 'Snow'; if (c >= 80 && c <= 82) return 'Showers'; if (c >= 95) return 'Thunderstorm'; return ''; }
boot().catch((e) => { console.error(e); BS.error = String((e && e.stack) || e); ui.note('Could not start: ' + String(e && e.message || e).slice(0, 160)); });
