// ez-tree species viewer: every species at LOD0 | LOD1 | LOD2, instanced exactly like TreeSystem
// (T · Ry · S(crownR / normRadius, height, crownR / normRadius), instanceColor ~1.0 relative tint),
// under the landmark harness lighting (dev/harness.js: Sky + gradient-sky PMREM, sun azimuth -25 deg).
// URL: /dev/eztrees.html?sp=oak&layout=lods|single|grove|grid[&lod=0][&h=..&r=..]   window.__ez for scripted views.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { U } from '../src/materials.js';
import { createTreeLibrary as createEzLibrary, TREE_SPECIES } from '../src/vegetation/ezlib.js';
import { createTreeLibrary as createOldLibrary } from '../src/vegetation/trees.js';
const createTreeLibrary = new URLSearchParams(location.search).get('lib') === 'old'
  ? (o) => { const l = createOldLibrary({ season: o.season, leafTexSize: o.leafTexSize, only: o.only }); l.ready = Promise.resolve(); for (const sp of Object.values(l.species)) { if (sp.uniforms?.uRefTint) sp.uniforms.uRefTint.value = new THREE.Color(1, 1, 1); } return l; }
  : createEzLibrary;
import { installGrading } from '../src/world/grading.js';

const qs = new URLSearchParams(location.search);
const info = document.getElementById('info');
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push('unhandled: ' + String(e.reason && e.reason.stack || e.reason)));
window.__ez = { ready: false, errors };

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(+(qs.get('fov') || 50), innerWidth / innerHeight, 0.2, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
// ---- lighting: copied from dev/harness.js (matches src/world/sky.js: ~1 PM in November, sun from the SSW)
const sky = new Sky(); sky.scale.setScalar(4000); scene.add(sky);
const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(58), THREE.MathUtils.degToRad(-25));
sky.material.uniforms.sunPosition.value.copy(sun);
sky.material.uniforms.turbidity.value = 3.2; sky.material.uniforms.rayleigh.value = 1.4;
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { uSun: { value: sun } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 uSun; varying vec3 vD; void main(){ vec3 d=normalize(vD); float y=d.y; vec3 zen=vec3(0.16,0.30,0.62)*0.95, hor=vec3(0.62,0.70,0.80)*0.95, gnd=vec3(0.22,0.20,0.16)*0.9; vec3 c = y>0.0 ? mix(hor, zen, pow(y,0.6)) : mix(hor*0.6+gnd*0.4, gnd, smoothstep(0.0,0.25,-y)); c += vec3(1.0,0.94,0.86)*0.8*pow(max(dot(d,uSun),0.0),8.0); gl_FragColor=vec4(c,1.0);} ' })));
scene.environment = pmrem.fromScene(envScene, 0, 0.1, 1000).texture;
if (qs.get('env')) scene.environmentIntensity = +qs.get('env');
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x8a7a62, 0.0); scene.add(hemi);
const dl = new THREE.DirectionalLight(0xfff1e0, 3.2); dl.position.copy(sun).multiplyScalar(300);
dl.castShadow = true; dl.shadow.mapSize.set(4096, 4096);
const sc = dl.shadow.camera; sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160; sc.near = 1; sc.far = 1200;
dl.shadow.bias = -0.0004; dl.shadow.normalBias = 0.04;
scene.add(dl); scene.add(dl.target);
U.uSunDir.value.copy(sun);
// ?light=game approximates src/world/sky.js at midday instead (sun 6.0, environmentIntensity 0.68, graded tone mapping)
function gameLight(on) {
  if (on) { installGrading(); renderer.toneMapping = THREE.CustomToneMapping; renderer.toneMappingExposure = 0.85; dl.intensity = 6.0; dl.color.setRGB(1.0, 0.94, 0.86); scene.environmentIntensity = 0.68; }
  else { renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0; dl.intensity = 3.2; dl.color.set(0xfff1e0); scene.environmentIntensity = 1; }
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
}
if (qs.get('light') === 'game') gameLight(true);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7d8f62, roughness: 1 }));
ground.receiveShadow = true; ground.name = '__ground'; scene.add(ground);
function keyBg(on) { sky.visible = !on; ground.visible = !on; scene.background = on ? new THREE.Color(0, 0, 1) : null; } // solid blue backdrop for colour measurements
if (qs.get('bg') === 'key') keyBg(true);

// ---- library
const t0 = performance.now();
const debugCanvas = {};
const lib = createTreeLibrary({ season: 'late-autumn', leafTexSize: +(qs.get('tex') || 1024), debugCanvas, debugSkeleton: true, only: qs.get('only') ? qs.get('only').split(',') : null });
const buildMs = performance.now() - t0;
const ids = TREE_SPECIES.filter((k) => lib.species[k]);
const spSel = document.getElementById('sp'); for (const k of ['all', ...ids]) { const o = document.createElement('option'); o.textContent = k; spSel.appendChild(o); }

// ---- instancing exactly like TreeSystem
const holder = new THREE.Group(); scene.add(holder);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function addTrees(spId, lod, list) { // list: [{x, z, h, r, rot, tint:[r,g,b]}]
  const spc = lib.species[spId]; const parts = spc.lods[lod].parts; const out = [];
  for (const p of parts) {
    const m = new THREE.InstancedMesh(p.geometry, p.material, list.length);
    if (p.depthMaterial) m.customDepthMaterial = p.depthMaterial; if (p.distanceMaterial) m.customDistanceMaterial = p.distanceMaterial;
    m.castShadow = qs.get('allshadow') ? true : lod === 0; m.receiveShadow = true; m.frustumCulled = false;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);
    list.forEach((t, i) => {
      let rr = t.r; if (t.h / (2 * t.r) > 6) rr = t.h / 12;
      const sx = rr / spc.normRadius;
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot ?? 0); _p.set(t.x, -0.15, t.z); _s.set(sx, t.h, sx);
      _m.compose(_p, _q, _s); m.setMatrixAt(i, _m);
      const c = t.tint || [1, 1, 1]; m.instanceColor.setXYZ(i, c[0], c[1], c[2]);
    });
    m.name = `trees:${spId}:lod${lod}`; holder.add(m); out.push(m);
  }
  return out;
}
let layoutInfo = {};
function clear() { for (const c of [...holder.children]) { holder.remove(c); c.dispose?.(); } }
function rnd(i) { const x = Math.sin(i * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); }
function show(spId, layout = 'lods', o = {}) {
  clear();
  const list = spId === 'all' ? ids : [spId];
  let x = 0; const placed = [];
  if (layout === 'grid') {
    let cx = 0;
    for (const k of list) { const t = lib.species[k].typical; const w = Math.max(6, t.crownR * 2.6);
      for (let l = 0; l < 3; l++) addTrees(k, l, [{ x: cx, z: -l * 34, h: t.height, r: t.crownR, rot: 0.6 }]);
      placed.push({ id: k, x: cx, h: t.height, r: t.crownR }); cx += w; }
    layoutInfo = { layout, placed, width: cx };
    return layoutInfo;
  }
  const k = list[0], t = lib.species[k].typical; const h = o.h || t.height, r = o.r || t.crownR;
  if (layout === 'single') { addTrees(k, o.lod ?? 0, [{ x: 0, z: 0, h, r, rot: o.rot ?? 0.6, tint: o.tint }]); placed.push({ id: k, x: 0, h, r }); }
  else if (layout === 'lods') { const w = o.gap || Math.max(r * 2.5, 4); for (let l = 0; l < 3; l++) { addTrees(k, l, [{ x: (l - 1) * w, z: 0, h, r, rot: o.rot ?? 0.6, tint: o.tint }]); placed.push({ id: k, lod: l, x: (l - 1) * w, h, r }); } }
  else if (layout === 'grove') { // natural variety: sizes from the LiDAR spread, aerial tints, random yaw
    const n = o.n || 7, list2 = [];
    for (let i = 0; i < n; i++) { const s = 0.7 + rnd(i) * 0.6; const a = i * 2.39996, d = i === 0 ? 0 : r * 2.2 * Math.sqrt(i);
      const tint = [0.85 + rnd(i + 7) * 0.3, 0.85 + rnd(i + 9) * 0.3, 0.85 + rnd(i + 11) * 0.3];
      list2.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, h: h * s, r: r * (0.8 + rnd(i + 3) * 0.4) * s, rot: rnd(i + 5) * 6.28, tint }); }
    addTrees(k, o.lod ?? 0, list2); placed.push(...list2.map((p) => ({ id: k, ...p })));
  }
  layoutInfo = { layout, placed, h, r };
  return layoutInfo;
}
// camera helpers: az = compass direction the camera stands at (deg, 0 = north/-z), el deg, dist m, target
function setView(az, el, dist, tx = 0, ty, tz = 0) {
  const t = new THREE.Vector3(tx, ty ?? (layoutInfo.h ? layoutInfo.h * 0.45 : 5), tz);
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  camera.position.set(t.x + dist * Math.cos(e) * Math.sin(a), t.y + dist * Math.sin(e), t.z - dist * Math.cos(e) * Math.cos(a));
  controls.target.copy(t); camera.lookAt(t); controls.update();
  dl.target.position.copy(t); dl.position.copy(t).addScaledVector(sun, 300); dl.target.updateMatrixWorld();
  render();
}
function eye(dist, az = 180, h = 1.7, ty) { // eye-level view from `dist` m (camera at 1.7 m), looking at the crown
  const T = layoutInfo.h || 10; const tyy = ty ?? T * 0.42;
  const a = THREE.MathUtils.degToRad(az);
  camera.position.set(Math.sin(a) * dist, h, -Math.cos(a) * dist); controls.target.set(0, tyy, 0); camera.lookAt(controls.target); controls.update();
  dl.target.position.set(0, 0, 0); dl.position.copy(sun).multiplyScalar(300); dl.target.updateMatrixWorld();
  render();
}
let partFilter = null; // 'bark' | 'leaves' | null
function parts(k) { partFilter = k; holder.traverse((o) => { if (o.isInstancedMesh) { const isBark = /bark/.test(o.material.name); o.visible = !k || (k === 'bark' ? isBark : !isBark); } }); render(); }
function render() { renderer.render(scene, camera); }
function stats() {
  const s = {}; for (const k of ids) { const sp = lib.species[k]; s[k] = { lod0: sp.lods[0].triangles, lod1: sp.lods[1].triangles, lod2: sp.lods[2].triangles, normRadius: +sp.normRadius.toFixed(3), crownBase: +sp.crownBase.toFixed(3), ...(sp.stats ? { leaves: sp.stats.leaves, cards0: sp.stats.cards0, cards1: sp.stats.cards1, buildMs: Math.round(sp.buildMs) } : {}) }; }
  return { buildMs: Math.round(buildMs), readyMs: Math.round(lib.readyMs || -1), timing: lib.timing, species: s };
}
let paused = !!qs.get('pause');
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!paused) { U.uTime.value += dt; lib.update(dt); }
  controls.update(); render();
});
document.getElementById('wind').oninput = (e) => { U.uWind.value = +e.target.value; };
spSel.onchange = () => { show(spSel.value, document.getElementById('layout').value); eye(Math.max(20, (layoutInfo.h || 10) * 2.4)); };
document.getElementById('layout').onchange = spSel.onchange;
const sp0 = qs.get('sp') || 'all', lay0 = qs.get('layout') || (sp0 === 'all' ? 'grid' : 'lods');
spSel.value = sp0; document.getElementById('layout').value = lay0;
show(sp0, lay0, { lod: +(qs.get('lod') || 0), h: +qs.get('h') || 0, r: +qs.get('r') || 0, gap: +qs.get('gap') || 0 });
if (lay0 === 'grid') setView(200, 18, (layoutInfo.width || 100) * 0.8, (layoutInfo.width || 100) / 2, 6, -34); else eye(Math.max(20, (layoutInfo.h || 10) * 2.4));
await lib.ready;
render();
Object.assign(window.__ez, { ready: true, lib, show, setView, eye, render, stats, scene, camera, renderer, THREE, debugCanvas, keyBg, parts, gameLight, pause: (v = true) => { paused = v; }, U });
info.textContent = JSON.stringify(stats(), null, 0).replace(/},"/g, '},\n"');
