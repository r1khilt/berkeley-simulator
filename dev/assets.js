// Asset library viewer: every tree species (LOD0 | LOD1 | LOD2, instanced exactly like the engine) and every prop.
// URL: /dev/assets.html[?season=late-autumn][&only=trees|props]   window.__assets.stats() for numbers.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { materials, U } from '../src/materials.js';
import { createTreeLibrary, applyTreePart, TREE_REF_TINT } from '../src/vegetation/trees.js';
import * as PROPS from '../src/props/props.js';

const qs = new URLSearchParams(location.search);
const season = qs.get('season') || 'late-autumn';
const only = qs.get('only');
const info = document.getElementById('info');
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push('unhandled: ' + String(e.reason && e.reason.stack || e.reason)));
window.__assets = { ready: false, errors };

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.2, 6000);
const controls = new OrbitControls(camera, renderer.domElement);

const sky = new Sky(); sky.scale.setScalar(5000); scene.add(sky);
const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(55), THREE.MathUtils.degToRad(200));
sky.material.uniforms.sunPosition.value.copy(sun);
sky.material.uniforms.turbidity.value = 4; sky.material.uniforms.rayleigh.value = 1.2;
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene(); envScene.add(sky.clone());
scene.environment = pmrem.fromScene(envScene).texture;
// Lighting: the landmark harness uses the raw Sky PMREM as environment (very strong: sun shadows only ~5% darker).
// Default here is a balanced sky (environmentIntensity 0.35); ?harness=1 reproduces the harness exactly.
const harnessLight = qs.get('harness') === '1';
scene.environmentIntensity = harnessLight ? 1 : +(qs.get('env') ?? 0.25);
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x8a7a62, harnessLight ? 0.6 : 0.3); scene.add(hemi);
const dl = new THREE.DirectionalLight(0xfff1dd, 2.6); dl.position.copy(sun).multiplyScalar(400);
dl.castShadow = true; dl.shadow.mapSize.set(4096, 4096);
const sc = dl.shadow.camera; sc.left = -170; sc.right = 170; sc.top = 170; sc.bottom = -170; sc.near = 1; sc.far = 1500;
dl.shadow.bias = -0.0004; dl.shadow.normalBias = 0.04;
scene.add(dl); scene.add(dl.target);
U.uSunDir.value.copy(sun);
const M = materials();
for (const [k, m] of Object.entries(M)) if (!m.name) m.name = 'M.' + k;

const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6f8a4f, roughness: 1 }));
ground.receiveShadow = true; scene.add(ground);

const t0 = performance.now();
const treeStats = {}, propStats = {};
const bbox = (g) => { g.computeBoundingBox(); const b = g.boundingBox; return { min: b.min.toArray().map((v) => +v.toFixed(3)), max: b.max.toArray().map((v) => +v.toFixed(3)) }; };
const tri = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
// fraction of triangles whose winding agrees with their vertex normals (front faces must face outward)
function windingOK(g, centre = null) { // centre: judge closed blobs by facing away from an interior point
  const p = g.attributes.position, n = g.attributes.normal, idx = g.index; const cnt = idx ? idx.count : p.count;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), f = new THREE.Vector3(), vn = new THREE.Vector3(), t = new THREE.Vector3();
  let ok = 0, tot = 0;
  for (let i = 0; i < cnt; i += 3) {
    const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(p, i0); b.fromBufferAttribute(p, i1); c.fromBufferAttribute(p, i2);
    f.subVectors(b, a).cross(t.subVectors(c, a)); if (f.lengthSq() < 1e-14) continue;
    if (centre) vn.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(centre); else vn.fromBufferAttribute(n, i0).add(t.fromBufferAttribute(n, i1)).add(t.fromBufferAttribute(n, i2));
    if (centre && Math.abs(f.y) < 0.2 * Math.hypot(f.x, f.z)) vn.y = 0;
    tot++; if (f.dot(vn) > 0) ok++;
  }
  return tot ? +(ok / tot).toFixed(3) : 1;
}
const unionBox = (parts) => { const b = new THREE.Box3(); for (const p of parts) { p.geometry.computeBoundingBox(); b.union(p.geometry.boundingBox); } return { min: b.min.toArray().map((v) => +v.toFixed(3)), max: b.max.toArray().map((v) => +v.toFixed(3)) }; };

let lib = null; const treeMeshes = [];
const sampleTints = [new THREE.Color(0.24, 0.30, 0.18), new THREE.Color(0.30, 0.33, 0.22), new THREE.Color(0.36, 0.38, 0.27)];
if (only !== 'props') {
  lib = createTreeLibrary({ season, lod0Budget: +(qs.get('lod0') ?? 3000), only: qs.get('species') ? qs.get('species').split(',') : null, puffs: qs.get('puffs') !== '0', leafTexSize: +(qs.get('tex') ?? 2048) });
  let z = 0;
  for (const [id, sp] of Object.entries(lib.species)) {
    const H = sp.typical.height, R = sp.typical.crownR;
    const pitch = Math.max(2 * R + 6, 10);
    z += pitch / 2;
    sp.lods.forEach((lod, li) => {
      lod.parts.forEach((p) => {
        const m = new THREE.InstancedMesh(p.geometry, p.material, 1);
        applyTreePart(m, p);
        const mat = new THREE.Matrix4().compose(new THREE.Vector3(li * pitch, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.7 * li + z * 0.1), new THREE.Vector3(R / sp.normRadius, H, R / sp.normRadius));
        m.setMatrixAt(0, mat); m.setColorAt(0, sampleTints[(li + Math.round(z)) % 3]);
        m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
        m.computeBoundingSphere(); m.userData = { species: id, lod: li };
        scene.add(m); treeMeshes.push(m);
      });
    });
    treeStats[id] = {
      name: sp.name, normRadius: +sp.normRadius.toFixed(3), crownBase: +sp.crownBase.toFixed(3), trunkRadius: +sp.trunkRadius.toFixed(4), typical: sp.typical, leafDensity: sp.leafDensity,
      lods: sp.lods.map((l) => ({ triangles: l.triangles, parts: l.parts.map((p) => ({ kind: p.kind, triangles: tri(p.geometry), material: p.material.name, depth: !!p.depthMaterial, winding: p.kind === 'leaves' ? null : p.kind === 'far' ? windingOK(p.geometry, new THREE.Vector3(0, (sp.crownBase + 1) / 2, 0)) : windingOK(p.geometry) })), bbox: unionBox(l.parts) })),
      pos: [0, z],
    };
    z += pitch / 2;
  }
}
const propObjs = {};
if (only !== 'trees') {
  const names = PROPS.PROP_NAMES;
  const cols = 5, pitch = 9;
  names.forEach((name, i) => {
    const res = PROPS[name]();
    const g = new THREE.Group();
    for (const p of res.parts) {
      const m = new THREE.Mesh(p.geometry, p.material); m.castShadow = true; m.receiveShadow = true;
      if (p.depthMaterial) m.customDepthMaterial = p.depthMaterial;
      if (p.distanceMaterial) m.customDistanceMaterial = p.distanceMaterial;
      g.add(m);
    }
    g.position.set(-30 - (i % cols) * pitch, 0, 6 + Math.floor(i / cols) * pitch);
    g.userData = { prop: name };
    scene.add(g); propObjs[name] = g;
    propStats[name] = { triangles: res.parts.reduce((s, p) => s + tri(p.geometry), 0), parts: res.parts.length, winding: res.parts.map((p) => p.material.side === THREE.DoubleSide ? 1 : windingOK(p.geometry)), materials: res.parts.map((p) => p.material.name || p.material.type), bbox: unionBox(res.parts), collider: res.collider || null };
  });
}
const buildMs = Math.round(performance.now() - t0);

camera.position.set(-60, 45, -40); controls.target.set(0, 6, 60); controls.update();
function setView(px, py, pz, tx, ty, tz) { camera.position.set(px, py, pz); controls.target.set(tx, ty, tz); camera.lookAt(tx, ty, tz); controls.update(); renderer.render(scene, camera); }
function focus(kind, name, lod = 0, dist = null) {
  if (kind === 'tree') {
    const s = treeStats[name]; const sp = lib.species[name]; const H = sp.typical.height, R = sp.typical.crownR;
    const pitch = Math.max(2 * R + 6, 10); const x = lod * pitch, z = s.pos[1]; const d = dist ?? Math.max(H, 2 * R) * 1.6;
    setView(x + d * 0.75, H * 0.55 + d * 0.15, z + d * 0.65, x, H * 0.5, z);
  } else {
    const g = propObjs[name]; const b = new THREE.Box3().setFromObject(g); const c = b.getCenter(new THREE.Vector3()); const s = b.getSize(new THREE.Vector3()).length();
    const d = dist ?? Math.max(3, s * 1.6);
    setView(c.x + d * 0.6, c.y + d * 0.35, c.z + d * 0.75, c.x, c.y, c.z);
  }
}
const hemi0 = hemi.intensity, env0 = scene.environmentIntensity;
function setNight(n) { U.uNight.value = n; hemi.intensity = hemi0 * (1 - n) + 0.03; scene.environmentIntensity = env0 * (1 - n * 0.95); dl.intensity = 2.6 * (1 - n); renderer.render(scene, camera); }
// mean colour of non-sky pixels in a screen rectangle (for LOD colour matching)
function sampleColor() {
  const gl = renderer.getContext(); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  renderer.render(scene, camera);
  const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return px;
}
// ---- numeric QA helpers (no image viewing needed) ----
const MAGENTA = new THREE.Color(1, 0, 1);
function isolate(filter, fn) {
  const saved = []; scene.traverse((o) => { if (o.isMesh || o.isInstancedMesh || o === sky) { saved.push([o, o.visible]); o.visible = false; } });
  const bg = scene.background; scene.background = MAGENTA;
  scene.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && filter(o)) o.visible = true; });
  try { return fn(); } finally { for (const [o, v] of saved) o.visible = v; scene.background = bg; }
}
function readRGBA() {
  renderer.render(scene, camera);
  const gl = renderer.getContext(); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return { px, w, h };
}
const BLACK = new THREE.Color(0, 0, 0), WHITE = new THREE.Color(1, 1, 1);
function meanFg() { // mean sRGB of fully-covered pixels (identical over black and white backgrounds) + coverage
  scene.background = BLACK; const A = readRGBA().px; scene.background = WHITE; const B = readRGBA().px;
  let r = 0, g = 0, b = 0, n = 0, part = 0, tot = A.length / 4;
  for (let i = 0; i < A.length; i += 4) {
    const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
    if (d < 9) { r += A[i]; g += A[i + 1]; b += A[i + 2]; n++; } else if (d < 700) part++;
  }
  return { rgb: n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : null, coverage: +((n + part * 0.5) / tot).toFixed(4) };
}
// render each LOD of a species from the same relative viewpoint; returns mean colour + screen coverage per LOD
function lodColors(id, view = 'side') {
  const sp = lib.species[id], H = sp.typical.height, R = sp.typical.crownR, pitch = Math.max(2 * R + 6, 10), z = treeStats[id].pos[1];
  const out = [];
  for (let li = 0; li < 3; li++) {
    const x = li * pitch, d = Math.max(H, 2 * R) * 2.2;
    if (view === 'top') setView(x + 0.01, H + d, z, x, H * 0.5, z); else setView(x + d * 0.8, H * 0.5 + d * 0.1, z + d * 0.6, x, H * 0.5, z);
    out.push(isolate((o) => o.userData.species === id && o.userData.lod === li, () => meanFg()));
  }
  return out;
}
// shadow test: camera sees only the ground (layer 1); trees still render into the shadow map. Returns the fraction of
// ground pixels inside the crown's footprint that are shadowed (alpha-tested crowns give < 1, solid blobs ~1).
function shadowCoverage(id, li = 0) {
  const sp = lib.species[id], R = sp.typical.crownR, pitch = Math.max(2 * R + 6, 10), z = treeStats[id].pos[1], x = li * pitch;
  const saveP = dl.position.clone(), saveT = dl.target.position.clone();
  dl.position.set(x + 24, 400, z + 12); dl.target.position.set(x, 0, z); dl.target.updateMatrixWorld(); // not exactly vertical (degenerate lookAt)
  const camD = R * 3.2; setView(x + 0.001, camD, z, x, 0, z);
  const vis = []; scene.traverse((o) => { if (o.isInstancedMesh || (o.isMesh && o !== ground)) { vis.push([o, o.visible]); o.visible = o.userData.species === id && o.userData.lod === li; } });
  const mats = new Set(); scene.traverse((o) => { if (o.isInstancedMesh && o.visible) mats.add(o.material); });
  for (const m of mats) { m.colorWrite = false; m.depthWrite = false; }
  const sh = readRGBA();
  for (const [o] of vis) o.visible = false;
  const lit = readRGBA();
  for (const m of mats) { m.colorWrite = true; m.depthWrite = true; }
  for (const [o, v] of vis) o.visible = v;
  dl.position.copy(saveP); dl.target.position.copy(saveT); dl.target.updateMatrixWorld();
  const { w, h } = sh; const cx = w / 2, cy = h / 2;
  const rpx = R / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camD) * h / 2;
  let n = 0, dark = 0;
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const dx = xx - cx, dy = y - cy; if (dx * dx + dy * dy > rpx * rpx * 0.6) continue;
    const i = (y * w + xx) * 4; const a = lit.px[i] + lit.px[i + 1] + lit.px[i + 2], b = sh.px[i] + sh.px[i + 1] + sh.px[i + 2];
    n++; if (b < a * 0.93) dark++;
  }
  return +(dark / Math.max(1, n)).toFixed(3);
}
// wind test: fraction of tree pixels that change between two times (and whether the trunk base moves)
function windTest(id, li = 0) {
  const sp = lib.species[id], H = sp.typical.height, R = sp.typical.crownR, pitch = Math.max(2 * R + 6, 10), z = treeStats[id].pos[1], x = li * pitch;
  const d = Math.max(H, 2 * R) * 1.4; setView(x + d, H * 0.5, z, x, H * 0.5, z);
  const t0 = U.uTime.value, w0 = U.uWind.value; U.uWind.value = 0.8;
  const run = () => isolate((o) => o.userData.species === id && o.userData.lod === li, () => readRGBA());
  U.uTime.value = 10; const a = run(); U.uTime.value = 11.3; const b = run();
  U.uTime.value = t0; U.uWind.value = w0;
  let fg = 0, ch = 0, baseCh = 0, baseN = 0; const { w, h } = a;
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const i = (y * w + xx) * 4; const bgA = a.px[i] > 240 && a.px[i + 1] < 15 && a.px[i + 2] > 240, bgB = b.px[i] > 240 && b.px[i + 1] < 15 && b.px[i + 2] > 240;
    if (bgA && bgB) continue; fg++; const diff = Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2]);
    if (diff > 30) ch++;
    if (y < h * 0.1) { baseN++; if (diff > 30) baseCh++; } // bottom rows (gl y up): trunk base
  }
  return { changed: +(ch / Math.max(1, fg)).toFixed(3), baseChanged: +(baseCh / Math.max(1, baseN)).toFixed(3) };
}
// silhouette profile: width of the tree (fraction of its max width) in 12 height bands, bottom -> top, side view
function profile(id, li = 0) {
  const sp = lib.species[id], H = sp.typical.height, R = sp.typical.crownR, pitch = Math.max(2 * R + 6, 10), z = treeStats[id].pos[1], x = li * pitch;
  const d = Math.max(H, 2 * R) * 2.4; setView(x, H * 0.5, z + d, x, H * 0.5, z);
  return isolate((o) => o.userData.species === id && o.userData.lod === li, () => {
    scene.background = BLACK; const A = readRGBA(); scene.background = WHITE; const B = readRGBA();
    const { w, h } = A; let y0 = h, y1 = -1; const rows = [];
    for (let y = 0; y < h; y++) {
      let xmin = w, xmax = -1;
      for (let xx = 0; xx < w; xx++) { const i = (y * w + xx) * 4; const dd = Math.abs(A.px[i] - B.px[i]) + Math.abs(A.px[i + 1] - B.px[i + 1]) + Math.abs(A.px[i + 2] - B.px[i + 2]); if (dd < 300) { if (xx < xmin) xmin = xx; xmax = xx; } }
      rows.push(xmax >= xmin ? xmax - xmin + 1 : 0); if (xmax >= xmin) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    const bands = 12, out = []; let maxW = 1;
    for (let b = 0; b < bands; b++) { let m = 0; const ya = y0 + Math.floor((y1 - y0 + 1) * b / bands), yb = y0 + Math.floor((y1 - y0 + 1) * (b + 1) / bands); for (let y = ya; y < yb; y++) m = Math.max(m, rows[y]); out.push(m); maxW = Math.max(maxW, m); }
    return { aspect: +(maxW / Math.max(1, y1 - y0 + 1)).toFixed(2), bands: out.map((v) => +(v / maxW).toFixed(2)) };
  });
}
// presentation views of one species (only that species' chosen LOD visible, with ground + sky)
function viewTree(id, mode = 'mid', li = 0) {
  const sp = lib.species[id], H = sp.typical.height, R = sp.typical.crownR, pitch = Math.max(2 * R + 6, 10), z = treeStats[id].pos[1], x = li * pitch;
  scene.traverse((o) => { if (o.isInstancedMesh) o.visible = o.userData.species === id && o.userData.lod === li; else if (o.isGroup && o.userData.prop) o.visible = false; });
  const cb = sp.crownBase * H;
  if (mode === 'close') setView(x + R * 0.95, 1.7, z + R * 0.55, x, Math.max(cb * 0.9, 2.5), z);          // standing at the drip line, looking up
  else if (mode === 'under') setView(x + R * 0.35, 1.7, z + R * 0.2, x - R * 0.5, cb + (H - cb) * 0.45, z - R * 0.3); // under the canopy
  else if (mode === 'far') setView(x + 120, 1.7, z + 60, x, H * 0.5, z);
  else setView(x + Math.max(H, 2 * R) * 1.25, 1.7, z + Math.max(H, 2 * R) * 0.7, x, H * 0.45, z);       // mid: whole tree at eye level
}
function showAll() { scene.traverse((o) => { if (o.isInstancedMesh || (o.isGroup && o.userData.prop)) o.visible = true; }); }
function leafCoverage() { const out = {}; for (const [id, sp] of Object.entries(lib.species)) { const m = sp.lods[0].parts.find((p) => p.kind === 'leaves'); if (m) out[id] = +(m.material.map.userData.coverage).toFixed(2); } return out; }
function stats() {
  renderer.render(scene, camera);
  return { buildMs, season, renderInfo: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, programs: renderer.info.programs.length, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries }, trees: treeStats, props: propStats };
}
document.getElementById('season').value = season;
document.getElementById('season').onchange = (e) => { qs.set('season', e.target.value); location.search = qs.toString(); };
document.getElementById('night').oninput = (e) => setNight(+e.target.value);
document.getElementById('wind').oninput = (e) => { U.uWind.value = +e.target.value; };

let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now; U.uTime.value += dt;
  lib?.update(dt);
  controls.update(); renderer.render(scene, camera);
});
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
Object.assign(window.__assets, { ready: true, stats, setView, focus, setNight, sampleColor, lodColors, shadowCoverage, windTest, profile, leafCoverage, viewTree, showAll, scene, camera, renderer, lib, propObjs, THREE, U });
info.textContent = `assets: ${Object.keys(treeStats).length} species, ${Object.keys(propStats).length} props, build ${buildMs} ms`;
