// Campus life manager (WHERE and WHEN people are): students walking the real footpath network between classes
// (spilling out of building doors at ten past the hour, Berkeley time), people on benches, picnic tables, lawns and
// the Savio Steps, small groups chatting, cyclists and e-scooter riders on the streets, and student-org tabling on
// Sproul Plaza. Density follows Berkeley time of day (busy midday, quiet late at night; lighter on weekends).
// Rendering: two instanced crowd meshes (near/far LOD, src/life/people.js), bike + scooter meshes, lawn blankets
// and the static tabling meshes. Settings toggle: settings.life (default on); ?life=0 disables.
//
// Plugin seam for the people/AI worker (src/people/index.js, loaded only if present):
//   export function install(life, ctx) -> { update(dt, {camera, player, date, agents}), steer?(agent, neighbours, player, dt), steerRadius? }
//   life.agents: active agents within draw distance, rebuilt each frame (persistent objects, stable id). Fields:
//     id, kind ('walker'|'rider'|'spot'), x, y, z, heading (model faces -z: heading = atan2(-dx,-dz)), speed, state,
//     seed, groupId, pose, vari, aux, phase, look, extra (FLAG bits).  agent.hidden = true -> not drawn instanced.
//   steer() may set agent.sx/sz (extra displacement, metres), agent.speedMul (0 = stopped), agent.state + agent.stateT, agent.gaze.
//   pickEdge?(agent, node, candidateEdgeIds) -> index into candidates (or -1 for the default hotspot-weighted choice).
//   life.graph (read-only walk graph): nodes [[x,z]], adj[node] = [edgeIds], edges[{a, b, len, w, hw}]. Walkers: e, dir, t.
//   Riders with hidden = true keep their bike/scooter drawn; only the person is skipped. Spot aux = seat height (sit poses).
import * as THREE from 'three';
import { personGeometry, personMaterials, CrowdMesh, randomLook, POSE, FLAG } from './people.js';
import { bikeGeometry, scooterGeometry, vehicleMaterial, VehicleMesh } from './vehicles.js';
import { buildTabling } from './tabling.js';
import { pacificParts } from '../time.js';

const PEOPLE_PLUGIN = import.meta.glob('../people/index.js'); // optional (r4-people); empty object when absent
const TAU = Math.PI * 2;
const QL = { // per quality level: walkers, riders, static-spot share, draw distance, near-LOD distance, instance caps
  low: { walk: 55, ride: 10, spots: 0.45, far: 95, lod: 26, nearMax: 70, farMax: 160, shadow: false },
  medium: { walk: 120, ride: 24, spots: 0.75, far: 140, lod: 36, nearMax: 130, farMax: 300, shadow: true },
  high: { walk: 210, ride: 40, spots: 1, far: 185, lod: 40, nearMax: 190, farMax: 460, shadow: true },
  ultra: { walk: 300, ride: 56, spots: 1, far: 230, lod: 60, nearMax: 260, farMax: 620, shadow: true },
};
// hotspots: [x, z, sigma, weight]
const HOT = [[-135, 255, 55, 3.2], [-147, 206, 28, 2.0], [-140, -118, 65, 1.6], [0, -25, 55, 1.6], [-185, -25, 55, 1.2], [-180, 110, 70, 1.6], [-378, 67, 55, 1.0],
  [-85, 520, 80, 1.0], [-40, -330, 85, 1.1], [-250, 320, 45, 1.2], [270, 220, 60, 0.8], [420, 60, 60, 0.7], [80, 270, 50, 0.7], [-300, 150, 60, 0.9]];
const hot = (x, z) => { let w = (x > -720 && x < 470 && z > -520 && z < 420) ? 0.3 : 0.12; for (const [hx, hz, s, k] of HOT) { const d2 = (x - hx) ** 2 + (z - hz) ** 2; w += k * Math.exp(-d2 / (2 * s * s)); } return w; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// time-of-day curves (h = Pacific hour 0..24)
const CURVE = {
  walk: (h) => { const k = [0.05, 0.04, 0.03, 0.03, 0.03, 0.05, 0.12, 0.3, 0.62, 0.9, 0.95, 0.95, 1.0, 1.0, 0.92, 0.9, 0.85, 0.75, 0.6, 0.48, 0.42, 0.3, 0.18, 0.1]; const i = Math.floor(h) % 24, f = h - Math.floor(h); return k[i] + (k[(i + 1) % 24] - k[i]) * f; },
  lawn: (h) => smooth(9, 11.5, h) * (1 - smooth(16.5, 18.3, h)),
  bench: (h) => 0.06 + 0.94 * smooth(7, 10.5, h) * (1 - smooth(18.5, 22, h)),
  steps: (h) => smooth(8.5, 11, h) * (1 - smooth(18, 20.5, h)),
  chat: (h) => 0.05 + 0.95 * smooth(8, 10, h) * (1 - smooth(19, 22.5, h)),
  ride: (h) => 0.12 + 0.88 * smooth(6.5, 8.5, h) * (1 - smooth(20, 23.5, h)),
};
const SPOT_STATE = (s) => (s.cat === 'table' ? 'table' : s.pose === POSE.SIT ? 'sit' : s.pose === POSE.GROUND ? 'lawn' : s.pose === POSE.LIE ? 'lie' : s.vari === 4 ? 'talk' : s.vari === 2 ? 'phone' : 'idle');
const STAND_VARI = { phone: 2, talk: 4, idle: 0 };

export class CampusLife {
  constructor({ scene, camera = null, vectors, pois, heightAt, physics, quality = 'high', streets = null, groundMask = null, trees = null, manifest = null, lmReady = () => false, enabled = true }) {
    this.scene = scene; this.camera = camera; this.heightAt = heightAt; this.physics = physics; this.quality = quality; this.Q = QL[quality] || QL.high; this.lmReady = lmReady;
    this.mask = groundMask; this.enabled = enabled; this.rand = mulberry(20261121); this.nextId = 1;
    const t0 = performance.now();
    this.group = new THREE.Group(); this.group.name = 'campus-life'; scene.add(this.group);
    // ---- trees (trunk clearance) and landmark footprints (site tests)
    this.trunks = new Map(); if (trees) for (let i = 0; i < trees.n; i++) { if (trees.h[i] < 250) continue; const x = trees.x[i] / 10, z = trees.z[i] / 10; const k = cellKey(x, z, 8); let l = this.trunks.get(k); if (!l) this.trunks.set(k, (l = [])); l.push([x, z, Math.min(1.1, 0.25 + trees.h[i] / 100 * 0.015)]); }
    this.fps = []; if (manifest) for (const l of manifest.landmarks) for (const fp of l.footprints || []) if (fp.length > 2) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of fp) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); } this.fps.push({ fp, b: [x0, z0, x1, z1] }); }
    // ---- graphs
    this.graph = this.walkG = buildGraph(vectors.paths.filter((L) => !L.tunnel && (L.hw === 'footway' || L.hw === 'pedestrian' || L.hw === 'path' || L.hw === 'steps')), (L) => ({ pedestrian: 2.6, footway: 1, path: 0.7, steps: 0.45 }[L.hw] || 1), (L) => (L.hw === 'pedestrian' ? 2.7 : Math.max(0.35, (L.w || 2) / 2 - 0.25)), 40);
    const campus = (x, z) => x > -720 && x < 470 && z > -520 && z < 420;
    const rideRoads = vectors.roads.filter((r) => !r.tunnel && r.hw !== 'construction' && (r.hw !== 'service' || campus(r.pts[0][0], r.pts[0][1])));
    const BUSY = new Set(['Bancroft Way', 'Telegraph Avenue', 'Durant Avenue', 'College Avenue', 'Hearst Avenue', 'Oxford Street', 'Piedmont Avenue', 'Channing Way', 'Dana Street', 'Bowditch Street', 'Shattuck Avenue', 'Fulton Street']); // student bike routes around campus
    this.rideG = buildGraph([...rideRoads, ...vectors.paths.filter((L) => L.hw === 'cycleway' && !L.tunnel)], (L) => ({ secondary: 2.2, tertiary: 1.8, primary: 2, residential: 1, unclassified: 0.8, service: 0.35, cycleway: 1.6 }[L.hw] || 1) * (BUSY.has(L.name) ? 3 : 1), (L) => L.w || 8, 60, true);
    // ---- render resources
    const mats = personMaterials();
    this.near = new CrowdMesh(personGeometry(1), mats, this.Q.nearMax, 'life:people-near');
    this.far = new CrowdMesh(personGeometry(0), mats, this.Q.farMax, 'life:people-far');
    const vmat = vehicleMaterial();
    this.bikes = new VehicleMesh(bikeGeometry(), vmat, 64, 'life:bikes'); this.scooters = new VehicleMesh(scooterGeometry(), vmat, 64, 'life:scooters');
    this.blankets = new VehicleMesh(blanketGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, name: 'life:blanket' }), 64, 'life:blankets'); this.blankets.mesh.castShadow = false;
    for (const m of [this.near.mesh, this.far.mesh, this.bikes.mesh, this.scooters.mesh]) { m.castShadow = this.Q.shadow; this.group.add(m); }
    this.far.mesh.castShadow = quality === 'ultra'; // perf: distant people skip the shadow cascades (contact AO still grounds them)
    this.group.add(this.blankets.mesh);
    // ---- agents + static spots
    this.walkers = []; this.riders = []; this.spots = []; this.groups = []; this.agents = [];
    this.tabling = null;
    try { this._buildTabling(vectors); } catch (e) { console.warn('tabling failed', e); }
    this._buildSpots(pois, streets, vectors);
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v3 = new THREE.Vector3(); this.s3 = new THREE.Vector3(); this.up = new THREE.Vector3(0, 1, 0);
    this.frustum = new THREE.Frustum(); this.pm = new THREE.Matrix4(); this.sph = new THREE.Sphere(new THREE.Vector3(), 1.3);
    this.first = true; this.stats = {}; this.buildMs = Math.round(performance.now() - t0);
    this.setEnabled(enabled);
    // ---- optional people/AI plugin
    this.plugin = null;
    const load = PEOPLE_PLUGIN['../people/index.js'];
    if (load) load().then((m) => { if (m && m.install) this.plugin = m.install(this, { scene, camera, heightAt, physics, quality, get setupMaterials() { return window.BSIM?.lm?.setupMaterials; } }) || null; }).catch((e) => console.warn('people plugin failed', e));
  }
  setEnabled(on) { this.enabled = !!on; this.group.visible = this.enabled; if (!on) { this.walkers.length = 0; this.riders.length = 0; this.agents.length = 0; this.first = true; } this.plugin?.setEnabled?.(this.enabled); }
  // ---------------------------------------------------------------- site tests
  maskAt(x, z, ch) { const M = this.mask; if (!M) return -9; const j = Math.floor((x - M.x0) / M.step), i = Math.floor((z - M.z0) / M.step); if (i < 0 || j < 0 || i >= M.nz || j >= M.nx) return -9; return (M.sdf[(i * M.nx + j) * 4 + ch] / 255 - 0.5) * 6; }
  treeClear(x, z, r) { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = this.trunks.get((Math.floor(x / 8) + i) + ',' + (Math.floor(z / 8) + j)); if (!l) continue; for (const [tx, tz, tr] of l) if ((tx - x) ** 2 + (tz - z) ** 2 < (r + tr) ** 2) return false; } return true; }
  inFootprint(x, z, m = 0) { for (const f of this.fps) { if (x < f.b[0] - m || x > f.b[2] + m || z < f.b[1] - m || z > f.b[3] + m) continue; if (inRing(x, z, f.fp)) return true; if (m > 0) for (const [dx, dz] of [[m, 0], [-m, 0], [0, m], [0, -m]]) if (inRing(x + dx, z + dz, f.fp)) return true; } return false; }
  wallFree(x, z, r) { if (!this.physics) return true; const y = this.heightAt(x, z); const [px, pz] = this.physics.resolve(x, z, r, y, 1.6); return Math.abs(px - x) + Math.abs(pz - z) < 1e-3; }
  // ---------------------------------------------------------------- static spots
  _spot(o) { o.id = this.nextId++; o.kind = 'spot'; o.seed = this.rand(); o.look = o.look || randomLook(this.rand); o.on = false; o.epoch = -1; o.extra = o.extra || 0; o.groupId = o.groupId ?? 0; o.heading = o.yaw; o.speed = 0; o.phase = 0; this.spots.push(o); return o; }
  _group(o) { o.id = this.groups.length + 1; o.seed = this.rand(); this.groups.push(o); return o; }
  _buildSpots(pois, streets, vectors) {
    const R = this.rand;
    // benches (from the streetscape scatter so seats line up with the drawn benches)
    const sc = streets?.scatters || [];
    const benches = sc.find((s) => s.name === 'bench')?.items || [];
    for (const [x, y, z, r] of benches) {
      if (!(x > -800 && x < 600 && z > -600 && z < 700)) continue;
      const fx = Math.sin(r), fz = Math.cos(r); // bench front (+z local) in world
      const g = this._group({ cat: 'bench' });
      for (const lx of [-0.45, 0.42]) {
        const ox = lx * Math.cos(r), oz = -lx * Math.sin(r);
        this._spot({ cat: 'bench', x: x + ox + fx * 0.07, z: z + oz + fz * 0.07, y, yaw: Math.atan2(-fx, -fz), pose: POSE.SIT, vari: [0, 1, 1, 2, 3, 4, 4][Math.floor(R() * 7)], aux: 0.47, p: 0.42, groupId: g.id });
      }
    }
    const picnic = sc.find((s) => s.name === 'picnicTable')?.items || [];
    for (const [x, y, z, r] of picnic) { const g = this._group({ cat: 'bench' }); for (const side of [-1, 1]) for (const lx of [-0.45, 0.45]) {
      const lz = side * 0.62; const ox = lx * Math.cos(r) + lz * Math.sin(r), oz = -lx * Math.sin(r) + lz * Math.cos(r);
      const fx = -Math.sin(r) * side, fz = -Math.cos(r) * side; // facing the table
      this._spot({ cat: 'bench', x: x + ox, z: z + oz, y, yaw: Math.atan2(-fx, -fz), pose: POSE.SIT, vari: [5, 5, 0, 1, 4][Math.floor(R() * 5)], aux: 0.46, p: 0.32, groupId: g.id });
    } }
    // lawns: groups sitting / lying on the grass, some on picnic blankets
    const LAWNS = [[-142, -122, 44, 26], [118, 84, 30, 9], [-640, 30, 40, 9], [-48, -45, 14, 4], [-610, 120, 22, 4], [-105, 222, 12, 4], [210, 120, 22, 4]];
    const BLANKET = [[0.55, 0.06, 0.05], [0.04, 0.12, 0.32], [0.8, 0.55, 0.1], [0.1, 0.3, 0.14], [0.35, 0.08, 0.22], [0.06, 0.24, 0.3], [0.62, 0.35, 0.18]];
    for (const [lx, lz, lr, n] of LAWNS) {
      let made = 0;
      for (let tries = 0; tries < n * 30 && made < n; tries++) {
        const a = R() * TAU, d = Math.sqrt(R()) * lr; const x = lx + Math.cos(a) * d, z = lz + Math.sin(a) * d;
        if (this.maskAt(x, z, 2) < 1.6 || this.maskAt(x, z, 1) > -0.5 || this.maskAt(x, z, 0) > -1) continue;
        if (!this.treeClear(x, z, 1.8) || this.inFootprint(x, z, 2)) continue;
        const k = R(); const size = k < 0.38 ? 1 : k < 0.7 ? 2 : k < 0.9 ? 3 : 4; const face = R() * TAU;
        const g = this._group({ cat: 'lawn', x, z, yaw: face, blanket: size >= 2 ? R() < 0.5 : R() < 0.25, col: BLANKET[Math.floor(R() * BLANKET.length)], size });
        for (let m = 0; m < size; m++) {
          let px = x, pz = z, yaw = face, pose = POSE.GROUND, vari = Math.floor(R() * 5);
          if (size === 1) { if (R() < 0.45) { pose = POSE.LIE; vari = Math.floor(R() * 3); } }
          else { const aa = face + (m / size) * TAU; const rr = 0.46 + size * 0.05; px = x + Math.cos(aa) * rr; pz = z + Math.sin(aa) * rr; yaw = Math.atan2(Math.cos(aa), Math.sin(aa)); /* face the centre */ if (R() < 0.15) { pose = POSE.LIE; vari = 1; } }
          const look = randomLook(R, { backpack: false }); look.flags &= ~(FLAG.SKIRT | FLAG.BAG);
          const extra = (pose === POSE.GROUND && vari === 4) || (pose === POSE.LIE && vari === 1) ? FLAG.BOOK : 0;
          this._spot({ cat: 'lawn', x: px, z: pz, y: null, yaw, pose, vari, aux: 0, p: 0.7, look, extra, groupId: g.id });
        }
        made++;
      }
    }
    // the Mario Savio Steps (Sproul Hall's west stair): heights come from the landmark's walkable once it's loaded
    { const ANG = -8.975 * Math.PI / 180, ca = Math.cos(ANG), sa = Math.sin(ANG), A = [-83.28, 275.23];
      const w = (u, v) => [A[0] + u * ca - v * sa, A[1] + u * sa + v * ca]; const face = Math.atan2(ca, sa); // facing -u (down the steps)
      for (let k = 0; k < 34; k++) {
        const u = -27.7 + 1.6 + R() * 5.6, v = -12.6 + R() * 27.2; const [x, z] = w(u, v); const [fx, fz] = w(u - 1.2, v);
        const pose = R() < 0.8 ? POSE.SIT : POSE.STAND; const g = this._group({ cat: 'steps' });
        this._spot({ cat: 'steps', x, z, y: null, yaw: face + (R() - 0.5) * 0.5, pose, vari: pose === POSE.SIT ? [0, 1, 1, 2, 3, 4][Math.floor(R() * 6)] : [0, 2, 3, 4][Math.floor(R() * 4)], aux: 0.45, p: 0.55, steps: true, foot: [fx, fz], groupId: g.id });
      }
    }
    // Ludwig's Fountain: people sitting on the rim (crest r~3.4 m, ~0.42 m above the plaza), facing out
    { const F = [-144.87, 278.76];
      for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU + (R() - 0.5) * 0.25, fx = Math.cos(a), fz = Math.sin(a); const sx = F[0] + fx * 3.42, sz = F[1] + fz * 3.42; const g = this._group({ cat: 'rim' });
        this._spot({ cat: 'rim', x: sx + fx * 0.05, z: sz + fz * 0.05, y: null, yaw: Math.atan2(-fx, -fz) + (R() - 0.5) * 0.3, pose: POSE.SIT, vari: [0, 1, 1, 2, 3, 4][Math.floor(R() * 6)], aux: 0.43, p: 0.5, lm: 'ludwigs-fountain', foot: [sx + fx * 0.45, sz + fz * 0.45], groupId: g.id }); } }
    // small standing groups chatting on paved ground near the busy spots
    const CHAT = [[-140, 214, 10, 3], [-130, 250, 16, 4], [-125, 300, 14, 3], [-126, 340, 10, 2], [-6, -38, 18, 5], [-128, -36, 16, 3], [-170, 60, 20, 3], [-235, 125, 18, 2], [-370, 95, 20, 2],
      [-60, -300, 22, 3], [-190, 330, 20, 3], [-85, 470, 30, 3], [260, 260, 20, 2], [-270, -20, 20, 2], [-147, 190, 8, 2], [-140, 280, 14, 3], [-225, 320, 18, 3]];
    for (const [cx, cz, cr, n] of CHAT) {
      let made = 0;
      for (let tries = 0; tries < n * 40 && made < n; tries++) {
        const a = R() * TAU, d = Math.sqrt(R()) * cr; const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (this.maskAt(x, z, 1) < 1.0 || !this.treeClear(x, z, 1.4) || this.inFootprint(x, z, 1.5) || !this.wallFree(x, z, 1.4)) continue;
        if (this.tabling && this.tabling.tables.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < (t.canopy ? 4.2 : 3.0) ** 2)) continue;
        const size = 2 + Math.floor(R() * 2.4); const face = R() * TAU; const g = this._group({ cat: 'chat', x, z });
        for (let m = 0; m < size; m++) { const aa = face + (m / size) * TAU + (R() - 0.5) * 0.5, rr = 0.55 + size * 0.1; const px = x + Math.cos(aa) * rr, pz = z + Math.sin(aa) * rr;
          const v = [0, 0, 1, 2, 3, 4, 4, 4, 5][Math.floor(R() * 9)];
          this._spot({ cat: 'chat', x: px, z: pz, y: null, yaw: Math.atan2(Math.cos(aa), Math.sin(aa)) + (R() - 0.5) * 0.4, pose: POSE.STAND, vari: v, aux: 0, p: 0.65, extra: v === 2 ? FLAG.PHONE : v === 5 ? FLAG.CUP : 0, groupId: g.id }); }
        made++;
      }
    }
  }
  _buildTabling(vectors) {
    const sp = vectors.paths.find((L) => L.name === 'Sproul Plaza' && L.pts.length > 6); if (!sp) return;
    const F = [-144.87, 278.76];
    const G = this.walkG; const sproulEdge = new Set(); // keep side footways that cross the table rows clear
    const offPath = (x, z, r) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const c = G.cells.get((Math.floor(x / G.cell) + i) + ',' + (Math.floor(z / G.cell) + j)); if (!c) continue; for (const e of c.list) { const E = G.edges[e]; if (E.w > 2) continue; const A = G.nodes[E.a], B = G.nodes[E.b]; if (segDist(x, z, A[0], A[1], B[0], B[1]) < r + 1.2) return false; } } return true; };
    const ok = (x, z, r) => this.maskAt(x, z, 1) > 0.4 && this.maskAt(x, z, 2) < 0.2 && this.treeClear(x, z, r) && !this.inFootprint(x, z, 1.0) && (x - F[0]) ** 2 + (z - F[1]) ** 2 > 7.5 * 7.5 && !(z > 261 && z < 298) && offPath(x, z, r) && this.wallFree(x, z, 0.9);
    const T = buildTabling({ line: sp.pts, heightAt: this.heightAt, ok, rand: this.rand });
    this.tabling = T; this.group.add(T.group);
    const R = this.rand;
    for (const t of T.tables) {
      const g = this._group({ cat: 'table', table: t });
      const fx = -Math.sin(t.yaw), fz = -Math.cos(t.yaw); // table front (walkway side)
      const rx = Math.cos(t.yaw), rz = -Math.sin(t.yaw);    // table local +x
      const nT = R() < 0.7 ? 1 : 2;
      for (let k = 0; k < nT; k++) { const lx = nT === 1 ? (R() - 0.5) * 0.6 : (k ? 0.45 : -0.45); this._spot({ cat: 'table', table: t, x: t.x + rx * lx - fx * 0.75, z: t.z + rz * lx - fz * 0.75, y: t.y, yaw: t.yaw, pose: POSE.STAND, vari: [6, 6, 4, 4, 1, 0, 5][Math.floor(R() * 7)], aux: 0, p: 0.92, groupId: g.id }); }
      if (R() < 0.6) { const lx = (R() - 0.5) * 1.2; this._spot({ cat: 'table', table: t, x: t.x + rx * lx + fx * (0.95 + R() * 0.3), z: t.z + rz * lx + fz * (0.95 + R() * 0.3), y: t.y, yaw: t.yaw + Math.PI + (R() - 0.5) * 0.5, pose: POSE.STAND, vari: [0, 2, 3, 5][Math.floor(R() * 4)], aux: 0, p: 0.6, groupId: g.id }); }
    }
  }
  // ---------------------------------------------------------------- time
  _time(date) {
    const p = pacificParts(date); const h = p.hour + p.minute / 60 + (p.second || 0) / 3600;
    const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); const weekend = dow === 0 || dow === 6;
    const classBump = (p.minute < 11 && p.hour >= 8 && p.hour <= 17 && !weekend) ? 0.22 * (1 - p.minute / 11) : 0; // Berkeley time: classes start at :10
    return { h, weekend, classBump, epoch: Math.floor((p.hour * 60 + p.minute) / 20) + p.day * 100,
      walk: Math.min(1.15, CURVE.walk(h) * (weekend ? 0.62 : 1) + classBump), lawn: CURVE.lawn(h) * (weekend ? 1.1 : 1), bench: CURVE.bench(h), steps: CURVE.steps(h) * (weekend ? 0.6 : 1),
      chat: CURVE.chat(h) * (weekend ? 0.7 : 1), ride: CURVE.ride(h) * (weekend ? 0.7 : 1),
      table: weekend ? (h >= 11 && h < 15 ? 0.45 : 0) : (h >= 10 && h < 15.5 ? 1 : 0) };
  }
  // ---------------------------------------------------------------- walkers
  _newWalker(e, dir, t, jog) {
    const R = this.rand;
    const w = { id: this.nextId++, kind: 'walker', e, dir, t, speed: jog ? 2.7 + R() * 0.6 : 1.12 + R() * 0.42, jog: jog ? 1 : 0, offN: R(), off: 0, look: randomLook(R, jog ? { backpack: false } : {}), phase: R() * TAU, vari: 0,
      vx: 0, vz: 0, hd: 0, buddy: null, seed: R(), groupId: 0, speedMul: 1, sx: 0, sz: 0, state: 'walk', stateT: 0, x: 0, y: 0, z: 0, heading: 0, pose: POSE.WALK, aux: 0 };
    if (jog) { w.look.flags &= ~(FLAG.BACKPACK | FLAG.BAG | FLAG.SKIRT | FLAG.PANTS); w.state = 'jog'; }
    else { const k = R(); w.vari = k < 0.12 ? 1 : k < 0.18 ? 2 : k < 0.26 ? 3 : 0; if (w.vari === 1) w.state = 'phone'; }
    w.extra = w.vari === 1 ? FLAG.PHONE : w.vari === 2 ? FLAG.CUP : 0;
    w.off = this._offFor(w, this.walkG.edges[e]); const p = this._walkPos(w); w.vx = p[0]; w.vz = p[1]; w.hd = p[2];
    return w;
  }
  _spawnWalker(cx, cz, avoidView, door = 0.25) {
    const G = this.walkG; const R = this.rand; const far = this.Q.far;
    for (let tries = 0; tries < 6; tries++) {
      // some walk out of a building door (a dead-end footway node), the rest appear somewhere on the network
      if (R() < door) {
        const n = G.pickDeadEnd(cx, cz, far * 0.9, R);
        if (n != null) { const P = G.nodes[n]; const d2 = (P[0] - cx) ** 2 + (P[1] - cz) ** 2;
          if (d2 < far * far && !(avoidView && d2 < 25 * 25 && this._inView(P[0], this.heightAt(P[0], P[1]), P[1]))) { const e = G.adj[n][0]; const E = G.edges[e]; return this._newWalker(e, E.a === n, E.a === n ? 0.001 : 0.999, false); } }
      }
      const e = G.pickEdge(cx, cz, far * 0.95, R); if (e == null) return null;
      const E = G.edges[e]; const t = R(); const A = G.nodes[E.a], B = G.nodes[E.b];
      const x = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t;
      const d2 = (x - cx) ** 2 + (z - cz) ** 2; if (d2 > far * far) continue;
      if (avoidView && d2 < 70 * 70 && this._inView(x, this.heightAt(x, z), z)) continue;
      return this._newWalker(e, R() < 0.5, t, R() < 0.05);
    }
    return null;
  }
  _offFor(w, E) { const hw = E.hw; if (w.buddy) return w.buddy.off + 0.62; return hw > 2 ? -0.9 + w.offN * (hw + 0.9) : 0.25 + w.offN * Math.max(0.1, hw - 0.25); } // wide plazas: use both halves
  _walkPos(w) {
    const G = this.walkG, E = G.edges[w.e]; const A = G.nodes[w.dir ? E.a : E.b], B = G.nodes[w.dir ? E.b : E.a];
    const dx = (B[0] - A[0]) / E.len, dz = (B[1] - A[1]) / E.len; const s = w.dir ? w.t : 1 - w.t; // fraction along travel
    const u = s * E.len; const rx = -dz, rz = dx; // right of travel
    return [A[0] + dx * u + rx * w.off, A[1] + dz * u + rz * w.off, Math.atan2(-dx, -dz)];
  }
  _stepWalker(w, dt) {
    const G = this.walkG; const E = G.edges[w.e];
    const ds = (w.speed * w.speedMul * dt) / E.len; w.t += w.dir ? ds : -ds;
    if (w.t > 1 || w.t < 0) {
      const node = w.dir ? E.b : E.a; const nb = G.adj[node];
      if (nb.length <= 1) return false; // dead end: walked into a building
      const prev = w.e; const P = G.nodes[node]; const Pa = G.nodes[w.dir ? E.a : E.b]; const inDx = (P[0] - Pa[0]) / E.len, inDz = (P[1] - Pa[1]) / E.len;
      let tot = 0; const cand = [];
      for (const ne of nb) { if (ne === prev) continue; const N = G.edges[ne]; const o = N.a === node ? N.b : N.a; const Q = G.nodes[o]; const ox = (Q[0] - P[0]) / N.len, oz = (Q[1] - P[1]) / N.len;
        const turn = inDx * ox + inDz * oz; const wgt = N.w * (0.25 + hot(Q[0], Q[1])) * (0.18 + Math.max(0, turn) ** 1.5 + 0.05) * (G.adj[o].length <= 1 ? 0.35 : 1); tot += wgt; cand.push([ne, wgt]); }
      if (!cand.length) return false;
      let x = this.rand() * tot, pick = cand[0][0]; for (const [ne, wg] of cand) { x -= wg; if (x <= 0) { pick = ne; break; } }
      if (this.plugin?.pickEdge) { try { const ix = this.plugin.pickEdge(w, node, cand.map((c) => c[0])); if (ix != null && ix >= 0 && ix < cand.length) pick = cand[ix][0]; } catch (e) { console.warn('pickEdge failed', e); } }
      const N = G.edges[pick]; w.e = pick; w.dir = N.a === node; w.t = w.dir ? 0 : 1; w.off = this._offFor(w, N);
    }
    return true;
  }
  // ---------------------------------------------------------------- riders
  _spawnRider(cx, cz, avoidView) {
    const G = this.rideG; const R = this.rand;
    for (let tries = 0; tries < 6; tries++) {
      const e = G.pickEdge(cx, cz, this.Q.far, R); if (e == null) return null; const E = G.edges[e];
      let dir = R() < 0.5; if (E.oneway) dir = true;
      const scooter = R() < 0.4;
      const r = { id: this.nextId++, kind: 'rider', e, dir, t: R(), scooter, speed: scooter ? 4.6 + R() * 1.6 : 4.0 + R() * 2.6, crank: R() * TAU, look: randomLook(R, { backpack: R() < 0.5 }), col: null, vx: 0, vz: 0, hd: 0,
        seed: R(), groupId: 0, state: scooter ? 'scoot' : 'ride', pose: scooter ? POSE.SCOOTER : POSE.CYCLE, vari: 0, aux: 0, phase: 0, extra: 0, x: 0, y: 0, z: 0, heading: 0 };
      r.look.flags &= ~FLAG.SKIRT;
      r.col = scooter ? (R() < 0.75 ? [0.13, 0.62, 0.12] : [0.05, 0.42, 0.62]) : [[0.02, 0.02, 0.025], [0.0, 0.09, 0.22], [0.5, 0.05, 0.04], [0.75, 0.75, 0.73], [0.04, 0.3, 0.3], [0.3, 0.32, 0.34], [0.8, 0.55, 0.05]][Math.floor(R() * 7)];
      const p = this._ridePos(r); r.vx = p[0]; r.vz = p[1]; r.hd = p[2];
      const d2 = (p[0] - cx) ** 2 + (p[1] - cz) ** 2; if (d2 > this.Q.far * this.Q.far) continue;
      if (avoidView && d2 < 90 * 90 && this._inView(p[0], this.heightAt(p[0], p[1]), p[1])) continue;
      return r;
    }
    return null;
  }
  _ridePos(r) {
    const G = this.rideG, E = G.edges[r.e]; const A = G.nodes[r.dir ? E.a : E.b], B = G.nodes[r.dir ? E.b : E.a];
    const dx = (B[0] - A[0]) / E.len, dz = (B[1] - A[1]) / E.len; const s = r.dir ? r.t : 1 - r.t; const u = s * E.len;
    const rx = -dz, rz = dx;
    if (E.lane == null) { // ride ~1.3 m inside the drawn asphalt edge (OSM widths overstate some streets)
      const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2; let d = 0; if (this.mask) while (d < E.hw / 2 + 2 && this.maskAt(mx + rx * (d + 0.5), mz + rz * (d + 0.5), 0) > 0.2) d += 0.5; else d = E.hw / 2;
      E.lane = E.cyc ? 0.5 : Math.max(0.7, Math.min(E.hw / 2 - 1.2, d - 1.3)); }
    const off = E.lane;
    return [A[0] + dx * u + rx * off, A[1] + dz * u + rz * off, Math.atan2(-dx, -dz)];
  }
  _stepRider(r, dt) {
    const G = this.rideG; const E = G.edges[r.e];
    const ds = (r.speed * dt) / E.len; r.t += r.dir ? ds : -ds; r.crank += dt * r.speed * 1.35;
    if (r.t > 1 || r.t < 0) {
      const node = r.dir ? E.b : E.a; const nb = G.adj[node]; const prev = r.e; const P = G.nodes[node]; const Pa = G.nodes[r.dir ? E.a : E.b];
      const inDx = (P[0] - Pa[0]) / E.len, inDz = (P[1] - Pa[1]) / E.len; let tot = 0; const cand = [];
      for (const ne of nb) { if (ne === prev) continue; const N = G.edges[ne]; const fwd = N.a === node; if (N.oneway && !fwd) continue; const o = fwd ? N.b : N.a; const Q = G.nodes[o];
        const turn = inDx * (Q[0] - P[0]) / N.len + inDz * (Q[1] - P[1]) / N.len; const wgt = N.w * (0.15 + Math.max(0, turn) ** 2 + 0.03); tot += wgt; cand.push([ne, wgt, fwd]); }
      if (!cand.length) return false;
      let x = this.rand() * tot, pick = cand[0]; for (const c of cand) { x -= c[1]; if (x <= 0) { pick = c; break; } }
      r.e = pick[0]; r.dir = pick[2]; r.t = r.dir ? 0 : 1;
    }
    return true;
  }
  // ---------------------------------------------------------------- frame
  _inView(x, y, z) { this.sph.center.set(x, y + 0.9, z); return this.frustum.intersectsSphere(this.sph); }
  _groundY(x, z) { const h = this.heightAt(x, z); if (!this.physics) return h; return this.physics.groundAt(x, z, h + 1.2).y; }
  update(dt, { camera, focus, date, player = null }) {
    if (!this.enabled) return;
    dt = Math.min(dt, 0.1);
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); this.frustum.setFromProjectionMatrix(this.pm);
    const T = this._time(date); this.T = T;
    const cx = focus.x, cz = focus.z, cam = camera.position; const far = this.Q.far, far2 = far * far, lod2 = this.Q.lod * this.Q.lod;
    const plugin = this.plugin;
    // ---- walkers: population follows the hour; more come out of doors right after the hour
    const wantW = Math.round(this.Q.walk * T.walk);
    let spawnBudget = this.first ? 1e9 : 6;
    while (this.walkers.length < wantW && spawnBudget-- > 0) {
      const w = this._spawnWalker(cx, cz, !this.first, this.first ? 0.15 : 0.25 + T.classBump * 2); if (!w) break; this.walkers.push(w);
      if (!w.jog && this.rand() < 0.16 && this.walkers.length < wantW) { // a friend walking alongside
        const b = this._newWalker(w.e, w.dir, w.t, false); b.buddy = w; b.speed = w.speed; b.phase = w.phase + 1.3; b.groupId = w.groupId = w.id; b.off = this._offFor(b, this.walkG.edges[w.e]); const p = this._walkPos(b); b.vx = p[0]; b.vz = p[1]; this.walkers.push(b); }
    }
    if (this.walkers.length > wantW + 4) { // thin out from the far end
      this.walkers.sort((a, b) => ((b.vx - cx) ** 2 + (b.vz - cz) ** 2) - ((a.vx - cx) ** 2 + (a.vz - cz) ** 2)); this.walkers.splice(0, Math.min(4, this.walkers.length - wantW));
    }
    // steering neighbourhood (plugin): walkers near the player get steer() before they move
    const steerR = plugin?.steer && player ? (plugin.steerRadius || 40) : 0; let hash = null;
    if (steerR) { hash = new Map(); for (const w of this.walkers) { if ((w.vx - player.pos.x) ** 2 + (w.vz - player.pos.z) ** 2 > (steerR + 8) ** 2) continue; const k = cellKey(w.vx, w.vz, 6); let l = hash.get(k); if (!l) hash.set(k, (l = [])); l.push(w); } }
    const live = new Set(this.walkers);
    const k = 1 - Math.exp(-dt * 4.5);
    for (let i = this.walkers.length - 1; i >= 0; i--) {
      const w = this.walkers[i];
      if (w.stateT > 0) { w.stateT -= dt; if (w.stateT <= 0) { w.stateT = 0; w.speedMul = 1; w.state = w.jog ? 'jog' : w.vari === 1 ? 'phone' : 'walk'; } }
      if (steerR && (w.vx - player.pos.x) ** 2 + (w.vz - player.pos.z) ** 2 < steerR * steerR) {
        const nb = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = hash.get((Math.floor(w.vx / 6) + a) + ',' + (Math.floor(w.vz / 6) + b)); if (l) for (const o of l) if (o !== w) nb.push(o); }
        try { plugin.steer(w, nb, player, dt); } catch (e) { console.warn('steer failed', e); this.plugin = null; }
      } else if (w.sx || w.sz) { w.sx *= 0.9; w.sz *= 0.9; if (Math.abs(w.sx) + Math.abs(w.sz) < 0.01) w.sx = w.sz = 0; }
      if (w.buddy) { const L = w.buddy; if (!live.has(L)) { w.buddy = null; w.groupId = 0; } else { w.e = L.e; w.dir = L.dir; w.t = L.t; w.speed = L.speed; w.speedMul = L.speedMul; w.off = L.off + 0.62 * (this.walkG.edges[L.e].hw > 1.2 ? 1 : 0.9); } }
      const alive = w.buddy ? true : this._stepWalker(w, dt);
      const p = alive ? this._walkPos(w) : null;
      if (!alive || (p[0] - cx) ** 2 + (p[1] - cz) ** 2 > far2 * 1.15) { const n = this._spawnWalker(cx, cz, true); if (n) { this.walkers[i] = n; live.add(n); } else this.walkers.splice(i, 1); continue; }
      w.vx += (p[0] + (w.sx || 0) - w.vx) * k; w.vz += (p[1] + (w.sz || 0) - w.vz) * k;
      let dh = p[2] - w.hd; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); w.hd += dh * Math.min(1, dt * 6);
      const v = w.speed * w.speedMul; w.phase = (w.phase + dt * TAU * v / (w.jog ? 2.2 : 1.26)) % TAU;
    }
    // ---- riders
    const wantR = Math.round(this.Q.ride * T.ride);
    let rb = this.first ? 1e9 : 2;
    while (this.riders.length < wantR && rb-- > 0) { const r = this._spawnRider(cx, cz, !this.first); if (!r) break; this.riders.push(r); }
    if (this.riders.length > wantR + 2) this.riders.length = wantR;
    for (let i = this.riders.length - 1; i >= 0; i--) {
      const r = this.riders[i]; const alive = this._stepRider(r, dt); const p = alive ? this._ridePos(r) : null;
      if (!alive || (p[0] - cx) ** 2 + (p[1] - cz) ** 2 > far2 * 1.3) { const n = this._spawnRider(cx, cz, true); if (n) this.riders[i] = n; else this.riders.splice(i, 1); continue; }
      r.vx += (p[0] - r.vx) * k; r.vz += (p[1] - r.vz) * k; let dh = p[2] - r.hd; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); r.hd += dh * Math.min(1, dt * 5);
    }
    this.first = false;
    // ---- tabling visibility
    if (this.tabling) { const tb = this.tabling, t0 = tb.tables[0], near = t0 ? (t0.x - cam.x) ** 2 + (t0.z - cam.z) ** 2 < 420 * 420 : false; tb.core.visible = near && T.table > 0; tb.extra.visible = near && T.table > 0.5; }
    // ---- active agents + instance buffers
    const agents = this.agents; agents.length = 0;
    const near = this.near, farM = this.far; near.begin(); farM.begin(); this.bikes.begin(); this.scooters.begin(); this.blankets.begin();
    const m = this.m4, q = this.q, s3 = this.s3, v3 = this.v3, up = this.up;
    const draw = (a) => {
      if (a.hidden) return; const x = a.x, y = a.y, z = a.z;
      const d2 = (x - cam.x) ** 2 + (z - cam.z) ** 2 + (y - cam.y) ** 2 * 0.5; if (d2 > far2 || !this._inView(x, y, z)) return;
      q.setFromAxisAngle(up, a.heading); m.compose(v3.set(x, y, z), q, s3.set(a.look.w, a.look.h, a.look.w));
      (d2 < lod2 ? near : farM).push(m.elements, a.look, a.phase, a.pose, a.vari, a.aux, a.extra);
    };
    for (const w of this.walkers) {
      if ((w.vx - cam.x) ** 2 + (w.vz - cam.z) ** 2 > far2) continue;
      w.x = w.vx; w.z = w.vz; w.y = this._groundY(w.vx, w.vz); w.heading = w.hd + (w.gaze ? 0 : 0); w.speed_ = w.speed * w.speedMul;
      const stopped = w.speedMul < 0.05;
      if (stopped) { w.pose = POSE.STAND; w.vari = STAND_VARI[w.state] ?? 0; } else { w.pose = POSE.WALK; w.vari = w.state === 'phone' ? 1 : w._vari0 ?? (w._vari0 = w.vari); }
      w.aux = w.jog; agents.push(w); draw(w);
    }
    for (const r of this.riders) {
      if ((r.vx - cam.x) ** 2 + (r.vz - cam.z) ** 2 > far2) continue;
      r.x = r.vx; r.z = r.vz; r.y = this.heightAt(r.vx, r.vz); r.heading = r.hd; r.aux = r.crank % TAU; agents.push(r);
      if (!this._inView(r.x, r.y, r.z)) continue;
      q.setFromAxisAngle(up, r.hd); m.compose(v3.set(r.x, r.y, r.z), q, s3.set(1, 1, 1)); (r.scooter ? this.scooters : this.bikes).push(m.elements, r.col); // vehicle stays even when the rider is hidden
      draw(r);
    }
    // static spots: occupancy is rolled per group (whole bench / circle / lawn group / table), re-rolled only out of sight
    const share = this.Q.spots; let nOn = 0;
    for (const g of this.groups) g._vis = false;
    for (const s of this.spots) {
      const dd = (s.x - cam.x) ** 2 + (s.z - cam.z) ** 2; if (dd > far2) { s.epoch = -1; continue; }
      const dens = s.cat === 'lawn' ? T.lawn : s.cat === 'bench' ? T.bench : s.cat === 'steps' || s.cat === 'rim' ? T.steps : s.cat === 'chat' ? T.chat : s.cat === 'table' ? (s.table.core ? (T.table > 0 ? 1 : 0) : (T.table > 0.5 ? 1 : 0)) : 1;
      if (s.epoch !== T.epoch) {
        const vis = s.y != null && dd < 80 * 80 && this._inView(s.x, s.y, s.z);
        if (!vis || s.epoch === -1) { const g = this.groups[s.groupId - 1]; const gs = g ? g.seed : s.seed; const roll = fract(Math.sin(gs * 9871.3 + (s.cat === 'table' ? 0 : T.epoch) * 0.137) * 43758.55); const indiv = fract(Math.sin(s.seed * 3733.1 + T.epoch * 0.71) * 24634.6);
          s.on = roll < s.p * dens * share && (s.cat === 'chat' || s.cat === 'table' || s.cat === 'lawn' ? true : indiv < 0.85); s.epoch = T.epoch; }
      }
      if (s.cat === 'table' && dens <= 0) s.on = false;
      if (!s.on) continue;
      if (s.y == null || s.steps || (s.lm && !this.lmReady(s.lm))) {
        if (s.steps) { if (!this.lmReady('sproul-hall')) continue; const g = this.physics.groundAt(s.x, s.z, this.heightAt(s.x, s.z) + 4); if (!g.on) continue; const gf = this.physics.groundAt(s.foot[0], s.foot[1], g.y - 0.2); s.y = s.pose === POSE.SIT ? Math.max(gf.y, g.y - 0.45) : g.y; s.aux = s.pose === POSE.SIT ? g.y - s.y : 0; }
        else if (s.lm) { if (!this.lmReady(s.lm)) continue; s.y = this.heightAt(s.foot[0], s.foot[1]); }
        else s.y = this._groundY(s.x, s.z);
      }
      s.state = SPOT_STATE(s); agents.push(s); draw(s); nOn++;
      const g = this.groups[s.groupId - 1]; if (g) g._vis = true;
    }
    for (const g of this.groups) { if (!g._vis || !g.blanket) continue; const y = this.heightAt(g.x, g.z); if (!this._inView(g.x, y, g.z)) continue; q.setFromAxisAngle(up, g.yaw); m.compose(v3.set(g.x, y + 0.012, g.z), q, s3.set(g.size > 2 ? 1.25 : 1, 1, g.size > 2 ? 1.2 : 1)); this.blankets.push(m.elements, g.col); }
    near.end(); farM.end(); this.bikes.end(); this.scooters.end(); this.blankets.end();
    if (this.plugin?.update) { try { this.plugin.update(dt, { camera, player, date, agents }); } catch (e) { console.warn('people plugin update failed', e); this.plugin = null; } }
    this.stats = { walkers: this.walkers.length, riders: this.riders.length, spotsOn: nOn, near: near.n, far: farM.n, tables: this.tabling ? this.tabling.tables.length : 0, hour: +T.h.toFixed(2), walk: +T.walk.toFixed(2), agents: agents.length };
  }
}
function blanketGeometry() {
  const g = new THREE.BoxGeometry(1.9, 0.012, 1.75, 1, 1, 1).toNonIndexed(); const n = g.attributes.position.count;
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3)); g.setAttribute('aPaint', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1)); g.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(n), 1));
  return g;
}
// ---------------------------------------------------------------- graph over polylines
function buildGraph(lines, weightOf, halfWidthOf, cell, ride = false) {
  const key = (p) => Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2);
  const nodes = [], adj = [], ids = new Map(), edges = [];
  const nid = (p) => { const k = key(p); let i = ids.get(k); if (i == null) { i = nodes.length; ids.set(k, i); nodes.push([p[0], p[1]]); adj.push([]); } return i; };
  for (const L of lines) {
    const w = weightOf(L), hw = halfWidthOf(L), one = ride && L.oneway === true, cyc = L.hw === 'cycleway';
    for (let k = 0; k < L.pts.length - 1; k++) { const a = nid(L.pts[k]), b = nid(L.pts[k + 1]); if (a === b) continue; const len = Math.hypot(nodes[b][0] - nodes[a][0], nodes[b][1] - nodes[a][1]); if (len < 0.05) continue;
      const e = edges.length; edges.push({ a, b, len, w, hw, oneway: one, cyc }); adj[a].push(e); adj[b].push(e); }
  }
  // spatial cells of edges with cumulative weights (length x type x hotspot), and dead-end nodes (building doors)
  const cells = new Map(), doors = new Map();
  edges.forEach((E, i) => { const A = nodes[E.a], B = nodes[E.b]; const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2; const k = cellKey(mx, mz, cell); let c = cells.get(k); if (!c) cells.set(k, (c = { list: [], cum: [], tot: 0, x: (Math.floor(mx / cell) + 0.5) * cell, z: (Math.floor(mz / cell) + 0.5) * cell })); c.tot += E.len * E.w * (ride ? 0.4 + hot(mx, mz) : hot(mx, mz)); c.list.push(i); c.cum.push(c.tot); });
  if (!ride) adj.forEach((l, n) => { if (l.length !== 1) return; const P = nodes[n]; const k = cellKey(P[0], P[1], cell); let d = doors.get(k); if (!d) doors.set(k, (d = [])); d.push(n); });
  return { nodes, adj, edges, cells, cell,
    pickEdge(cx, cz, r, rand) {
      const n = Math.ceil(r / cell); const cand = []; let tot = 0;
      for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const c = cells.get((Math.floor(cx / cell) + i) + ',' + (Math.floor(cz / cell) + j)); if (!c) continue; if ((c.x - cx) ** 2 + (c.z - cz) ** 2 > (r + cell) ** 2) continue; tot += c.tot; cand.push([c, tot]); }
      if (!cand.length) return null; let x = rand() * tot; let c = cand[cand.length - 1][0]; for (const [cc, t] of cand) if (x <= t) { c = cc; break; }
      const y = rand() * c.tot; let lo = 0, hi = c.cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (c.cum[mid] < y) lo = mid + 1; else hi = mid; } return c.list[lo];
    },
    pickDeadEnd(cx, cz, r, rand) { // weighted by hotspot so doors on the busy quads open more often
      const n = Math.ceil(r / cell); let best = null, bw = 0;
      for (let tries = 0; tries < 8; tries++) { const i = Math.floor((rand() * 2 - 1) * n), j = Math.floor((rand() * 2 - 1) * n); const d = doors.get((Math.floor(cx / cell) + i) + ',' + (Math.floor(cz / cell) + j)); if (!d) continue; const nn = d[Math.floor(rand() * d.length)]; const P = nodes[nn]; const w = hot(P[0], P[1]) * rand(); if (w > bw) { bw = w; best = nn; } }
      return best;
    } };
}
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az; const l = dx * dx + dz * dz; let t = l ? ((px - ax) * dx + (pz - az) * dz) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(ax + t * dx - px, az + t * dz - pz); }
function cellKey(x, z, c) { return Math.floor(x / c) + ',' + Math.floor(z / c); }
function inRing(x, z, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; }
function fract(x) { return x - Math.floor(x); }
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
