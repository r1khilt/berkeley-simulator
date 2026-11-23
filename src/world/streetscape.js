// Streetscape: props scattered from OSM + procedural lamps/poles, road markings & crosswalks, Strawberry Creek water,
// walls/fences/hedges, and a night-time lamp light map for the ground.
import * as THREE from 'three';
import { U, materials, boxUV } from '../materials.js';
import { noiseTexture } from './noiseTex.js';

// ---------- distance-limited instancing for many props
// [r6-perf] view-frustum selection for scattered props: the frustum is widened (FOV +36 deg) so a turn between refreshes
// (every 4 m or ~8 deg) never shows a prop popping in at the screen edge
const SCATTER_NEAR_KEEP = 45; const _sp = new THREE.Sphere(); const _fr = new THREE.Frustum(); const _wc = new THREE.PerspectiveCamera(); const _pm = new THREE.Matrix4();
function wideFrustum(cam) { _wc.fov = Math.min(170, cam.fov + 36); _wc.aspect = cam.aspect; _wc.near = 0.1; _wc.far = 5000; _wc.updateProjectionMatrix(); _pm.multiplyMatrices(_wc.projectionMatrix, cam.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm); return _fr; }
export class Scatter {
  constructor(name, build, maxDist, castShadow = false) {
    this.name = name; this.maxDist = maxDist; this.items = []; this.parts = build ? build().parts : []; this.castShadow = castShadow; this.meshes = [];
  }
  add(x, y, z, rotY = 0, s = 1) { this.items.push([x, y, z, rotY, s]); }
  finalize(group) {
    const n = this.items.length; if (!n || !this.parts.length) return;
    this.mat = new Float32Array(n * 16); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    this.items.forEach(([x, y, z, r, s], i) => { m4.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, r), new THREE.Vector3(s, s, s)); m4.toArray(this.mat, i * 16); });
    const cap = Math.min(n, 4000);
    for (const p of this.parts) {
      const im = new THREE.InstancedMesh(p.geometry, p.material, cap); im.count = 0; im.frustumCulled = false; im.castShadow = this.castShadow; im.receiveShadow = true;
      if (p.depthMaterial) im.customDepthMaterial = p.depthMaterial; if (p.distanceMaterial) im.customDistanceMaterial = p.distanceMaterial;
      im.name = 'prop:' + this.name; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(im); this.meshes.push(im);
    }
    this.cap = cap;
  }
  update(cp, fr = null) {
    if (!this.meshes.length) return; const d2 = this.maxDist * this.maxDist; let k = 0; const it = this.items;
    // [r6-perf] beyond NEAR_KEEP m only props inside a widened view frustum are drawn (props behind the camera cost
    // vertices in the main pass and in every shadow cascade); near props stay so their shadows still fall into view
    const nk2 = SCATTER_NEAR_KEEP * SCATTER_NEAR_KEEP;
    for (let i = 0; i < it.length && k < this.cap; i++) { const dx = it[i][0] - cp.x, dz = it[i][2] - cp.z, dd = dx * dx + dz * dz; if (dd > d2) continue;
      if (fr && dd > nk2) { _sp.center.set(it[i][0], it[i][1] + 2, it[i][2]); _sp.radius = 6 * (it[i][4] || 1); if (!fr.intersectsSphere(_sp)) continue; }
      for (const m of this.meshes) m.instanceMatrix.array.set(this.mat.subarray(i * 16, i * 16 + 16), k * 16); k++; }
    for (const m of this.meshes) { m.count = k; m.instanceMatrix.needsUpdate = true; }
  }
}
// nearest segment helper over a set of polylines (spatial hash)
class SegIndex {
  constructor(lines, cell = 24) { this.cell = cell; this.g = new Map(); this.segs = [];
    for (const L of lines) { const P = L.pts; for (let k = 0; k < P.length - 1; k++) { const s = { a: P[k], b: P[k + 1], L }; const id = this.segs.length; this.segs.push(s);
      const x0 = Math.min(s.a[0], s.b[0]), x1 = Math.max(s.a[0], s.b[0]), z0 = Math.min(s.a[1], s.b[1]), z1 = Math.max(s.a[1], s.b[1]);
      for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) { const key = i + ',' + j; let l = this.g.get(key); if (!l) this.g.set(key, (l = [])); l.push(id); } } } }
  nearest(x, z, maxD = 30) {
    let best = null, bd = maxD * maxD; const r = Math.ceil(maxD / this.cell); const ci = Math.floor(x / this.cell), cj = Math.floor(z / this.cell); const seen = new Set();
    for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) { const l = this.g.get(i + ',' + j); if (!l) continue; for (const id of l) { if (seen.has(id)) continue; seen.add(id); const s = this.segs[id];
      const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz; let t = L2 ? ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2 : 0; t = Math.max(0, Math.min(1, t));
      const px = s.a[0] + t * dx, pz = s.a[1] + t * dz, d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = { px, pz, dx, dz, d: Math.sqrt(d), L: s.L }; } } }
    return best;
  }
}
// ribbon along a polyline, following terrain, with uv (u along, v across)
function ribbon(pts, width, yOf, step = 2, lift = 0.04, offset = 0) {
  const P = []; // resample
  for (let k = 0; k < pts.length - 1; k++) { const [x0, z0] = pts[k], [x1, z1] = pts[k + 1]; const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.ceil(L / step)); for (let i = 0; i < n; i++) P.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); }
  P.push(pts[pts.length - 1]);
  if (P.length < 2) return null;
  const pos = [], uv = [], idx = []; let u = 0;
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz, nz = dx; if (i > 0) u += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    for (const s of [-1, 1]) { const x = P[i][0] + nx * (offset + s * width / 2), z = P[i][1] + nz * (offset + s * width / 2); pos.push(x, yOf(x, z, P[i]) + lift, z); uv.push(u, s < 0 ? 0 : 1); }
    if (i > 0) { const o = (i - 1) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
  }
  return { pos, uv, idx };
}
function mergeRibbons(list) {
  const pos = [], uv = [], idx = []; let base = 0;
  for (const r of list) { if (!r) continue; pos.push(...r.pos); uv.push(...r.uv); for (const i of r.idx) idx.push(i + base); base += r.pos.length / 3; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  // force up normals for flat decals
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) { if (n.getY(i) < 0) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); }
  g.computeBoundingSphere(); return g;
}
export async function buildStreetscape({ scene, vectors, pois, heightAt, physics, camPos, rect, landmarks, skipWalls }) {
  const group = new THREE.Group(); group.name = 'streetscape'; scene.add(group);
  const M = materials();
  let PR = null; try { PR = await import('../props/props.js'); } catch (e) { console.warn('props unavailable', e); }
  const P = pois.p || {};
  const paths = vectors.paths.filter((p) => !p.tunnel), roads = vectors.roads.filter((r) => !r.tunnel);
  const pathIdx = new SegIndex(paths), roadIdx = new SegIndex(roads.filter((r) => r.hw !== 'service'));
  const allRoadIdx = new SegIndex(roads);
  const campus = (x, z) => x > -720 && x < 470 && z > -520 && z < 400;
  // [r4-sweep-outer] landmark modules load after this runs, so the procedural lamps / street lights / utility poles below
  // could land inside a landmark's footprint (lamp posts poking through buildings). Skip spots inside (or within 0.6 m of) a
  // hand-built landmark footprint. Open-air or roof-plaza landmarks (fields, courts, parks, Main Stacks, garages) keep theirs;
  // OSM-mapped props are left alone (they are real positions).
  const inLm = (landmarks && landmarks.length) ? landmarkTester(landmarks.filter((l) => !/field|courts|schoolyard|diamond|park|main-stacks|garage|parking|structure/.test(l.id)).flatMap((l) => [...(l.footprints || []), ...(l.clearProps ? l.clear || [] : [])]), 0.6) : () => false; // [r5-audit-central] + `clear` site polygons of landmarks flagged clearProps (Dwinelle Plaza terrace)
  const scatters = [];
  const S = (name, maxD, cast = false) => { const f = PR && PR[name]; const s = new Scatter(name, f ? () => f() : null, maxD, cast); scatters.push(s); return s; };
  const lamps = S('campusLamp', 420, true), street = S('streetLight', 520, true), bench = S('bench', 220), trash = S('trashCan', 160), recyc = S('recyclingBin', 140), rack = S('bikeRack', 160), bike = S('parkedBike', 140),
    bollard = S('bollard', 140), hydrant = S('fireHydrant', 160), shelter = S('busShelter', 300), picnic = S('picnicTable', 200), fountain = S('drinkingFountain', 140), pole = S('utilityPole', 600, true), signal = S('trafficSignal', 400, true),
    stop = S('stopSign', 220), news = S('newsRack', 120), kiosk = S('infoKiosk', 200), flag = S('flagpole', 600, true), scoot = S('scooter', 150);
  const lampPts = [];
  const y = (x, z) => heightAt(x, z);
  const faceToward = (x, z, tx, tz) => Math.atan2(tx - x, tz - z); // rotation so local +z points at target
  for (const [x, z] of P.lamp || []) { lamps.add(x, y(x, z), z, Math.random() * 6); lampPts.push([x, z, 1]); }
  for (const [x, z, dir] of P.bench || []) { const n = pathIdx.nearest(x, z, 12); const r = n ? faceToward(x, z, n.px, n.pz) : (dir != null ? -dir * Math.PI / 180 : 0); bench.add(x, y(x, z), z, r); if (Math.random() < 0.35) trash.add(x + Math.cos(r) * 1.4, y(x, z), z - Math.sin(r) * 1.4, Math.random() * 6); }
  for (const [x, z, seg] of P.benchline || []) { const [x0, z0, x1, z1] = seg; const r = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2; const n = pathIdx.nearest(x, z, 10); const rr = n ? faceToward(x, z, n.px, n.pz) : r; bench.add(x, y(x, z), z, rr); }
  for (const [x, z] of P.trash || []) trash.add(x, y(x, z), z, Math.random() * 6);
  for (const [x, z] of P.recycling || []) recyc.add(x, y(x, z), z, Math.random() * 6);
  for (const [x, z, cap] of P.bikerack || []) { const n = pathIdx.nearest(x, z, 15) || allRoadIdx.nearest(x, z, 20); const ang = n ? Math.atan2(n.dx, n.dz) : 0; const k = Math.min(6, Math.max(1, Math.round((cap || 4) / 2))); for (let i = 0; i < k; i++) { const ox = Math.sin(ang) * (i - (k - 1) / 2) * 0.9, oz = Math.cos(ang) * (i - (k - 1) / 2) * 0.9; rack.add(x + ox, y(x + ox, z + oz), z + oz, ang); /* r4-props2: each U stands across the row (was along it, so bikes ran through the tubes) */ if (Math.random() < 0.45) { const bx = x + ox + Math.sin(ang) * 0.3, bz = z + oz + Math.cos(ang) * 0.3; bike.add(bx, y(bx, bz), bz, ang + Math.PI / 2 + (Math.random() < 0.5 ? 0 : Math.PI)); } } }
  for (const [x, z] of P.bollard || []) bollard.add(x, y(x, z), z, 0);
  for (const [x, z] of P.hydrant || []) hydrant.add(x, y(x, z), z, Math.random() * 6);
  for (const [x, z, sh] of P.busstop || []) { const n = roadIdx.nearest(x, z, 25); if (sh && n) { const r = faceToward(x, z, n.px, n.pz); shelter.add(x, y(x, z), z, r); } else if (PR) stop.add(x, y(x, z), z, n ? faceToward(x, z, n.px, n.pz) : 0); }
  for (const [x, z] of P.picnic || []) picnic.add(x, y(x, z), z, Math.random() * 6);
  for (const [x, z] of P.fountain || []) fountain.add(x, y(x, z), z, Math.random() * 6);
  for (const [x, z] of P.pole || []) { const n = roadIdx.nearest(x, z, 20); pole.add(x, y(x, z), z, n ? Math.atan2(n.dx, n.dz) : 0); }
  for (const [x, z] of P.flagpole || []) flag.add(x, y(x, z), z, 0);
  for (const [x, z] of P.info || []) kiosk.add(x, y(x, z), z, Math.random() * 6);
  for (const [x, z] of P.stop || []) { const n = roadIdx.nearest(x, z, 20); if (!n) continue; const nx = -n.dz, nz = n.dx, l = Math.hypot(nx, nz) || 1; const w = (n.L.w || 8) / 2 + 1.2; const sx = n.px + nx / l * w * Math.sign((x - n.px) * nx + (z - n.pz) * nz || 1), sz = n.pz + nz / l * w * Math.sign((x - n.px) * nx + (z - n.pz) * nz || 1); stop.add(sx, y(sx, sz), sz, Math.atan2(n.dx, n.dz) + Math.PI); }
  for (const [x, z] of P.signal || []) { const n = roadIdx.nearest(x, z, 20); if (!n) continue; const nx = -n.dz, nz = n.dx, l = Math.hypot(nx, nz) || 1; const w = (n.L.w || 10) / 2 + 1.5; const sx = n.px + nx / l * w, sz = n.pz + nz / l * w; signal.add(sx, y(sx, sz), sz, Math.atan2(-nx, -nz)); }
  // procedural campus lamps along wider footpaths, street lights along named streets, utility poles in the neighbourhoods
  const near = (x, z, arr, r) => arr.some((p) => (p[0] - x) ** 2 + (p[1] - z) ** 2 < r * r);
  for (const p of paths) {
    if (!(p.w >= 2.2) || p.steps) continue; const pts = p.pts; let acc = 13;
    for (let k = 0; k < pts.length - 1; k++) { const [x0, z0] = pts[k], [x1, z1] = pts[k + 1]; const L = Math.hypot(x1 - x0, z1 - z0); const dx = (x1 - x0) / (L || 1), dz = (z1 - z0) / (L || 1);
      for (let t = 0; t < L; t += 1) { acc += 1; if (acc < 30) continue; const x = x0 + dx * t + dz * (p.w / 2 + 0.6), z = z0 + dz * t - dx * (p.w / 2 + 0.6); if (!campus(x, z)) continue; if (near(x, z, lampPts, 14) || physicsInside(physics, x, z) || inLm(x, z)) continue; acc = 0; lamps.add(x, y(x, z), z, 0); lampPts.push([x, z, 1]); } }
  }
  let side = 1;
  for (const r of roads) {
    if (!['secondary', 'tertiary', 'residential', 'primary', 'unclassified'].includes(r.hw)) continue; const pts = r.pts; let acc = 20, accP = 0;
    for (let k = 0; k < pts.length - 1; k++) { const [x0, z0] = pts[k], [x1, z1] = pts[k + 1]; const L = Math.hypot(x1 - x0, z1 - z0); const dx = (x1 - x0) / (L || 1), dz = (z1 - z0) / (L || 1);
      for (let t = 0; t < L; t += 1) { acc += 1; accP += 1;
        const off = (r.w || 8) / 2 + 1.1;
        if (acc >= 36) { side = -side; const x = x0 + dx * t + dz * off * side, z = z0 + dz * t - dx * off * side; if (!near(x, z, lampPts, 18) && !physicsInside(physics, x, z) && !inLm(x, z)) { acc = 0; street.add(x, y(x, z), z, Math.atan2(-dz * side, dx * side)); lampPts.push([x, z, 1.4]); } }
        if (!campus(x0, z0) && r.hw === 'residential' && accP >= 42) { const x = x0 + dx * t - dz * (off + 0.4), z = z0 + dz * t + dx * (off + 0.4); if (!physicsInside(physics, x, z) && !inLm(x, z)) { accP = 0; pole.add(x, y(x, z), z, Math.atan2(dx, dz)); } }
      } }
  }
  // scooters & news racks near Telegraph/Bancroft
  for (const p of (pois.named || [])) { if (Math.random() < 0.12 && (p.k === 'cafe' || p.k === 'restaurant' || p.k === 'fast_food')) { const n = allRoadIdx.nearest(p.p[0], p.p[1], 25); if (n) { const nx = -n.dz, nz = n.dx, l = Math.hypot(nx, nz) || 1; const s = Math.sign((p.p[0] - n.px) * nx + (p.p[1] - n.pz) * nz) || 1; const w = (n.L.w || 8) / 2 + 1.0; const x = n.px + nx / l * w * s, z = n.pz + nz / l * w * s; (Math.random() < 0.6 ? scoot : news).add(x, y(x, z), z, Math.random() * 6); } } }
  for (const s of scatters) s.finalize(group);
  // ---------- road markings
  const markY = (x, z) => heightAt(x, z);
  const yellow = [], white = [], cross = [];
  for (const r of roads) {
    if (['secondary', 'tertiary', 'primary', 'secondary_link', 'tertiary_link'].includes(r.hw) && !r.bridge) {
      if (r.oneway) { const lanes = +r.lanes || 2; for (let l = 1; l < lanes; l++) { const off = -r.w / 2 + (r.w * l) / lanes; white.push(ribbon(r.pts, 0.12, markY, 2, 0.035, off)); } }
      else { yellow.push(ribbon(r.pts, 0.1, markY, 2, 0.035, 0.11)); yellow.push(ribbon(r.pts, 0.1, markY, 2, 0.035, -0.11)); }
    }
  }
  const lineMat = (c) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); return m; };
  const dashMat = lineMat(0xe8e6df); dashMat.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUvD;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvUvD = uv;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vUvD;').replace('#include <clipping_planes_fragment>', 'if (fract(vUvD.x/9.0) > 0.36) discard;\n#include <clipping_planes_fragment>'); }; dashMat.customProgramCacheKey = () => 'dash';
  if (yellow.length) { const m = new THREE.Mesh(mergeRibbons(yellow), lineMat(0xd9a521)); m.receiveShadow = true; group.add(m); }
  if (white.length) { const m = new THREE.Mesh(mergeRibbons(white), dashMat); m.receiveShadow = true; group.add(m); }
  // crosswalks at mapped crossings (continental stripes)
  for (const [x, z, kind] of P.crossing || []) {
    if (kind === 'unmarked' || kind === 'no') continue;
    const n = allRoadIdx.nearest(x, z, 6); if (!n || n.L.hw === 'service' && Math.random() < 0.6) continue;
    const l = Math.hypot(n.dx, n.dz) || 1; const ux = n.dx / l, uz = n.dz / l; // road direction
    const w = (n.L.w || 8) + (skipWalls ? -0.5 : 0.5); const len = 3.0; // [r4-ground] stop stripes short of the (now real) kerb
    for (let s = -w / 2; s < w / 2; s += 1.2) {
      const cx = n.px - uz * s, cz = n.pz + ux * s; // stripe centre across the road
      const a = [cx - ux * 0.3, cz - uz * 0.3], b = [cx + ux * 0.3, cz + uz * 0.3];
      cross.push(ribbonQuad(cx, cz, ux, uz, 0.3, len / 2, markY));
    }
  }
  if (cross.length) { const m = new THREE.Mesh(mergeRibbons(cross), lineMat(0xeceae4)); m.receiveShadow = true; group.add(m); }
  // ---------- Strawberry Creek
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x31443a, roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.92, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  waterMat.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.uTime; sh.uniforms.uNoise = { value: noiseTexture() };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUvW;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvUvW = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform sampler2D uNoise; varying vec2 vUvW;').replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
     { vec2 p = vec2(vUvW.x*0.35 - uTime*0.6, vUvW.y*1.3); float a = texture(uNoise, p*0.21).g - 0.5, b = texture(uNoise, p*0.53 + 0.3).b - 0.5;
       vec3 wn = normalize(vec3(a*0.5, 1.0, b*0.5)); normal = normalize((viewMatrix*vec4(wn,0.0)).xyz); }`); };
  waterMat.customProgramCacheKey = () => 'creek';
  const creeks = [];
  for (const w of vectors.water) {
    if (w.type !== 'stream' && w.type !== 'river') continue;
    const width = Math.min(4, Math.max(1.6, w.w || 2.5));
    creeks.push(ribbon(w.pts, width, (x, z, c) => { const h0 = heightAt(c[0], c[1]); return Math.min(h0, heightAt(x, z)) + 0.06; }, 1.5, 0.08));
  }
  if (creeks.length) { const m = new THREE.Mesh(mergeRibbons(creeks), waterMat); m.receiveShadow = true; m.name = 'creek'; group.add(m); }
  // ---------- walls, fences, hedges
  const wallBuf = [], fenceBuf = [], hedgeBuf = [];
  for (const b of vectors.barriers) {
    const pts = b.pts; if (pts.length < 2) continue;
    if (b.type === 'wall' || b.type === 'retaining_wall' || b.type === 'city_wall') { if (!skipWalls) wallBuf.push(extrudeLine(pts, 0.32, Math.min(2.5, b.h || 1.2), heightAt, b.type === 'retaining_wall' ? -1.5 : -0.3)); } // [r4-ground] groundworks.js builds walls with coping + terrain terraces
    else if (b.type === 'hedge') { if (!skipWalls) hedgeBuf.push(extrudeLine(pts, 0.9, Math.min(2.2, b.h || 1.3), heightAt, -0.2)); } // [r4-ground] groundworks sweeps hedges with a clipped profile
    else if (b.type === 'fence' || b.type === 'railing' || b.type === 'guard_rail') fenceBuf.push(...fenceLine(pts, Math.min(2.2, b.h || 1.2), heightAt));
  }
  const addMerged = (arr, mat, name, cast = true) => { if (!arr.length) return; const g = mergeGeoms(arr); if (!g) return; const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = true; m.name = name; group.add(m); };
  addMerged(wallBuf, M.concrete, 'walls');
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2f4a22, roughness: 1 }); hedgeMat.onBeforeCompile = (sh) => { sh.uniforms.uNoise = { value: noiseTexture() }; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWH=(modelMatrix*vec4(transformed,1.0)).xyz;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uNoise; varying vec3 vWH;').replace('#include <map_fragment>', 'float hn = texture(uNoise, vWH.xz*0.9+vWH.y*0.7).b*0.6 + texture(uNoise, vec2(vWH.x+vWH.z, vWH.y)*0.6).g*0.4; diffuseColor.rgb *= 0.65 + 0.7*hn;'); }; hedgeMat.customProgramCacheKey = () => 'hedge';
  addMerged(hedgeBuf, hedgeMat, 'hedges');
  addMerged(fenceBuf, M.iron, 'fences', false);
  // ---------- night lamp light map (2 m texels) for the ground shader
  const lampTex = makeLampMap(lampPts, rect);
  return {
    group, scatters, lampTex, lampPts,
    update(cp, cam) { // [r6-perf] cam (optional): frustum-aware refresh on a 4 m move or a ~8 deg turn
      if (this._lp && cp.distanceToSquared(this._lp) < 16 && (!cam || !this._lq || cam.quaternion.angleTo(this._lq) < 0.14)) return; this._lp = cp.clone(); if (cam) this._lq = cam.quaternion.clone();
      const fr = cam && !/[?&]noscatcull/.test(location.search) ? wideFrustum(cam) : null; for (const s of scatters) s.update(cp, fr); },
  };
}
// [r4-sweep-outer] point-in-footprint test over landmark polygons (spatial hash, 32 m cells); true also within `pad` m of an edge
function landmarkTester(polys, pad = 0) {
  const C = 32, g = new Map(); const key = (i, j) => i * 100003 + j;
  polys.forEach((fp, k) => { if (!fp || fp.length < 3) return; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of fp) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    for (let i = Math.floor((x0 - pad) / C); i <= Math.floor((x1 + pad) / C); i++) for (let j = Math.floor((z0 - pad) / C); j <= Math.floor((z1 + pad) / C); j++) { const kk = key(i, j); if (!g.has(kk)) g.set(kk, []); g.get(kk).push(k); } });
  return (x, z) => { const list = g.get(key(Math.floor(x / C), Math.floor(z / C))); if (!list) return false;
    for (const k of list) { const r = polys[k]; let c = false; let dmin = Infinity;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j];
        if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
        if (pad > 0) { const ex = b[0] - a[0], ez = b[1] - a[1], L2 = ex * ex + ez * ez || 1; const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / L2)); dmin = Math.min(dmin, Math.hypot(a[0] + ex * t - x, a[1] + ez * t - z)); } }
      if (c || dmin < pad) return true; }
    return false; };
}
function physicsInside(ph, x, z) { // crude: is (x,z) within 0.6 m of a wall segment
  const r = ph.resolve(x, z, 0.6, ph.heightAt(x, z), 2); return r[2];
}
function ribbonQuad(cx, cz, ux, uz, hw, hl, yOf) {
  // stripe: half-width hw along road direction (u), half-length hl across the road
  const vx = -uz, vz = ux; const P = [[cx - ux * hw - vx * hl, cz - uz * hw - vz * hl], [cx + ux * hw - vx * hl, cz + uz * hw - vz * hl], [cx + ux * hw + vx * hl, cz + uz * hw + vz * hl], [cx - ux * hw + vx * hl, cz - uz * hw + vz * hl]];
  const pos = []; for (const [x, z] of P) pos.push(x, yOf(x, z) + 0.035, z);
  // ensure upward winding
  const a = P[0], b = P[1], c = P[2]; const ar = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return { pos, uv: [0, 0, 1, 0, 1, 1, 0, 1], idx: ar < 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2] };
}
function extrudeLine(pts, thick, h, heightAt, base) {
  const pos = []; const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const R = []; for (let k = 0; k < pts.length - 1; k++) { const [x0, z0] = pts[k], [x1, z1] = pts[k + 1]; const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.ceil(L / 2)); for (let i = 0; i < n; i++) R.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); } R.push(pts[pts.length - 1]);
  for (let i = 0; i < R.length - 1; i++) {
    const [x0, z0] = R[i], [x1, z1] = R[i + 1]; let dx = x1 - x0, dz = z1 - z0; const l = Math.hypot(dx, dz) || 1; const nx = -dz / l * thick / 2, nz = dx / l * thick / 2;
    const g0 = heightAt(x0, z0), g1 = heightAt(x1, z1); const t0 = g0 + h, t1 = g1 + h, b0 = g0 + base, b1 = g1 + base;
    const A = [x0 + nx, b0, z0 + nz], B = [x1 + nx, b1, z1 + nz], C = [x1 + nx, t1, z1 + nz], D = [x0 + nx, t0, z0 + nz];
    const A2 = [x0 - nx, b0, z0 - nz], B2 = [x1 - nx, b1, z1 - nz], C2 = [x1 - nx, t1, z1 - nz], D2 = [x0 - nx, t0, z0 - nz];
    quad(A, B, C, D); quad(B2, A2, D2, C2); quad(D, C, C2, D2);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return boxUV(g);
}
function fenceLine(pts, h, heightAt) {
  const out = [];
  const post = new THREE.CylinderGeometry(0.03, 0.03, 1, 5);
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, z0] = pts[k], [x1, z1] = pts[k + 1]; const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.round(L / 2.4));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; const g = post.clone(); g.scale(1, h, 1); g.translate(x, heightAt(x, z) + h / 2, z); out.push(g); }
    for (const fy of [h - 0.05, 0.25]) { const a = new THREE.Vector3(x0, heightAt(x0, z0) + fy, z0), b = new THREE.Vector3(x1, heightAt(x1, z1) + fy, z1); const d = b.clone().sub(a); const rail = new THREE.CylinderGeometry(0.02, 0.02, d.length(), 4); rail.translate(0, d.length() / 2, 0); rail.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); rail.translate(a.x, a.y, a.z); out.push(rail); }
  }
  return out.map((g) => g.toNonIndexed());
}
function mergeGeoms(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  if (!n) return null; const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (let g of list) { if (g.index) g = g.toNonIndexed(); if (!g.attributes.normal) g.computeVertexNormals(); const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array.subarray(0, c * 2), o * 2); o += c; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeBoundingSphere(); return g;
}
export function makeLampMap(lampPts, rect = { x0: -1248, z0: -1040, w: 2864, h: 2112 }, res = 2) {
  const W = Math.round(rect.w / res), H = Math.round(rect.h / res);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
  for (const [x, z, k] of lampPts) {
    const px = (x - rect.x0) / res, pz = (z - rect.z0) / res, r = (k > 1 ? 19 : 14) / res;
    const g = c.createRadialGradient(px, pz, 0, px, pz, r);
    g.addColorStop(0, 'rgba(255,222,180,0.75)'); g.addColorStop(0.15, 'rgba(255,214,170,0.55)'); g.addColorStop(0.4, 'rgba(255,205,160,0.22)'); g.addColorStop(0.7, 'rgba(255,200,150,0.06)'); g.addColorStop(1, 'rgba(255,200,150,0)');
    c.fillStyle = g; c.beginPath(); c.arc(px, pz, r, 0, 7); c.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  t.userData.rect = rect; return t;
}
