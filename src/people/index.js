// People plugin for the campus-life manager (src/life/life.js loads this file through import.meta.glob).
// Campus life decides WHERE and WHEN people are (spawns, schedules, density, seats, tabling, vehicles) and draws everyone
// with its cheap instanced 13-bone crowd. This plugin decides how the people closest to the camera LOOK, MOVE and BEHAVE:
//   - the K nearest visible agents are swapped (agent.hidden) for full skinned characters (character.js) wearing the
//     same look, synced to the same walk phase / seat / pose so the hand-off is invisible; K and range follow quality;
//   - steer(): pedestrians sidestep the player and each other (keep-right, passing), stop to check their phone, glance at
//     walking buddies, flinch and stop when bumped, and look back when stared at;
//   - pickEdge(): walkers have a real destination (a building door or a busy spot) and route toward it at each node.
// r4-people2: the skinned people wear modelled clothes (garments.js: skinned cloth shells, straps) and one accessory mesh
// (kit.js: shoes, bags, hats, glasses, headphones, hair), riders get skinned people posed on campus life's bikes and
// scooters (IK), each near person casts a soft contact shadow, and steering adds yielding to crossing traffic, a hard
// push-out from the player, and 'stop and face the player' when stared at or bumped. Walkers in campus life steer
// forward-only (life.js, ?walkfix=0 for the old lane following). BSIM.people.stats: active, ms (CPU), tris, draws.
import * as THREE from 'three';
import { loadPeopleAssets } from './assets.js';
import { Character } from './character.js';
import { prebuildParts } from './garments.js'; // r4-people2
import { SKIN, HAIR, SHOE } from '../life/people.js';

const TAU = Math.PI * 2;
const QK = { low: { k: 4, d: 14 }, medium: { k: 8, d: 20 }, high: { k: 14, d: 28 }, ultra: { k: 24, d: 38 } }; // skinned people near the camera (?npcK= ?npcD= override, ?people=0 off)
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function install(life, ctx) {
  const P = new People(life, ctx);
  if (typeof window !== 'undefined') { window.BSIM = window.BSIM || {}; window.BSIM.people = P; }
  return { update: (dt, o) => P.update(dt, o), steer: (a, nb, pl, dt) => P.steer(a, nb, pl, dt), steerRadius: 40, pickEdge: (a, n, c) => P.pickEdge(a, n, c), setEnabled: (on) => P.setEnabled(on) };
}

class People {
  constructor(life, ctx) {
    this.life = life; this.ctx = ctx; this.enabled = true; this.ready = false; this.pool = []; this.byAgent = new Map();
    const qs = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
    const q = QK[ctx.quality] || QK.high; this.K = qs.has('npcK') ? +qs.get('npcK') : q.k; this.maxD = qs.has('npcD') ? +qs.get('npcD') : q.d;
    this.group = new THREE.Group(); this.group.name = 'people'; ctx.scene.add(this.group);
    this.fr = new THREE.Frustum(); this.pm = new THREE.Matrix4(); this.sph = new THREE.Sphere(new THREE.Vector3(), 1.2);
    this.rand = mulberry(777); this.stats = {};
    // r4-people2: soft contact shadow under every near person (one instanced draw): grounds them on any lighting
    { const c = typeof document !== 'undefined' ? document.createElement('canvas') : null; let tex = null;
      if (c) { c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); tex = new THREE.CanvasTexture(c); }
      const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, color: 0xffffff, name: 'people:blob' });
      this.blobs = new THREE.InstancedMesh(g, m, Math.max(1, this.K)); this.blobs.count = 0; this.blobs.frustumCulled = false; this.blobs.renderOrder = 1; this.blobs.name = 'people:blobs'; this.group.add(this.blobs); this._bm = new THREE.Matrix4(); this._bq = new THREE.Quaternion(); this._bs = new THREE.Vector3(); this._bp = new THREE.Vector3(); }
    if (this.K > 0 && qs.get('people') !== '0') loadPeopleAssets().then((A) => this._build(A)).catch((e) => console.warn('people assets failed', e));
  }
  _build(A) {
    A.palette = { SKIN, HAIR, SHOE }; this.assets = A;
    const shadow = this.ctx.quality !== 'low';
    for (let i = 0; i < this.K; i++) { const c = new Character(A, i % 2 ? 'm' : 'f', shadow); this.pool.push(c); this.group.add(c.root); }
    for (const sex of ['f', 'm']) calibrate(this.pool.find((c) => c.sex === sex));
    for (const sex of ['f', 'm']) prebuildParts(A.bodies[sex]); // garments for the common outfits, in idle slices
    const setup = this.ctx.setupMaterials; if (setup) for (const c of this.pool) setup(c.root);
    // compile the character programs up front so the first person to walk up doesn't hitch the frame
    try { const r = window.BSIM && window.BSIM.composer && window.BSIM.composer.renderer; const c0 = this.pool[0];
      if (r && r.compileAsync && c0) { c0.root.visible = true; for (const h of Object.values(c0.hair)) h.mesh.visible = true; for (const o of [c0.phone, c0.cup, c0.book]) o.visible = true;
        r.compileAsync(c0.root, this.ctx.camera, this.ctx.scene).catch(() => {}).finally(() => { c0.root.visible = false; for (const h of Object.values(c0.hair)) h.mesh.visible = false; }); } } catch (e) { /* optional */ }
    this.ready = true; if (this.life.enabled === false) this.setEnabled(false);
  }
  setEnabled(on) { this.enabled = !!on; if (!on) this._releaseAll(); this.group.visible = this.enabled; }
  _releaseAll() { for (const c of this.pool) { if (c.agent) c.agent.hidden = false; c.agent = null; c.root.visible = false; } this.byAgent.clear(); }
  _inView(a) { this.sph.center.set(a.x, a.y + 0.9, a.z); return this.fr.intersectsSphere(this.sph); }
  // ---------------------------------------------------------------- per frame (after campus life has moved everyone)
  update(dt, { camera, player, agents }) {
    if (!this.ready || !this.enabled) return;
    const tStart = performance.now(); // r4-people2: CPU cost of the near-LOD layer (stats.ms, smoothed)
    const cam = camera.position; this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); this.fr.setFromProjectionMatrix(this.pm);
    for (const c of this.pool) if (c.hideNext) { c.hideNext = false; if (!c.agent) c.root.visible = false; }
    // pick the K nearest people in view (riders included: campus life keeps drawing their bike when the person is hidden)
    const maxD2 = this.maxD * this.maxD, cand = this._cand || (this._cand = []); cand.length = 0;
    for (const a of agents) { const d2 = (a.x - cam.x) ** 2 + (a.z - cam.z) ** 2 + (a.y - cam.y) ** 2 * 0.3; const keep = this.byAgent.has(a); if (a.kind === 'rider' && d2 > 22 * 22 * (keep ? 1.25 : 1)) continue; // r4-people2: riders get skinned people too (on campus life's bikes)
      if (d2 > maxD2 * (keep ? 1.25 : 1)) continue; if (d2 > 25 && !this._inView(a)) continue; cand.push([d2 * (keep ? 0.8 : 1), a]); }
    cand.sort((p, q) => p[0] - q[0]);
    const want = this._want || (this._want = new Set()); want.clear(); let nf = 0, nm = 0; const half = this.K / 2;
    for (const [, a] of cand) { const f = a.look && a.look.fem; if (f ? nf >= half : nm >= half) continue; want.add(a); if (f) nf++; else nm++; if (want.size >= this.K) break; }
    for (const c of this.pool) if (c.agent && !want.has(c.agent)) { c.agent.hidden = false; this.byAgent.delete(c.agent); c.agent = null; c.hideNext = true; }
    for (const a of want) { if (this.byAgent.has(a)) continue; const sex = a.look && a.look.fem ? 'f' : 'm'; const c = this.pool.find((p) => !p.agent && !p.hideNext && p.sex === sex); if (!c) continue;
      c.agent = a; this.byAgent.set(a, c); c.setLook(a.look, a.extra, a.seed || 0.5); a.hidden = true; c.root.visible = true; c.react = 0; c.gazeYaw = a.gaze || 0; c.phoneK = a.state === 'phone' ? 1 : 0; c.w0 = true; }
    // spots (seated / standing people) notice the player too: they aren't steered by campus life, so do it here
    const pp = player && player.pos;
    let n = 0; const shadowN = this.ctx.quality === 'ultra' ? 12 : this.ctx.quality === 'high' ? 8 : this.ctx.quality === 'medium' ? 4 : 0; let rank = 0;
    for (const [, a] of cand) { const c = this.byAgent.get(a); if (!c) continue; c.setShadow(rank++ < shadowN); }
    for (const c of this.pool) {
      const a = c.agent; if (!a) continue; n++;
      if (pp && a.kind !== 'walker') this._spotNotice(a, player, dt);
      if (a._s && a._s.react) { c.react = 0.55; a._s.react = 0; }
      if (c.w0) { for (const k in c.w) c.w[k] = 0; c.w0 = false; c.update(0.001, a, camera); for (const k in c.w) c.w[k] = c.wt[k]; }
      c.update(dt, a, camera);
    }
    if (this.blobs) { let bi = 0; const up = new THREE.Vector3(0, 1, 0);
      for (const c of this.pool) { const a = c.agent; if (!a || bi >= this.blobs.instanceMatrix.count) continue; const m = c.mode; if (m === 'lie') continue;
        const sc = m === 'cycle' ? [0.55, 1.5] : m === 'scoot' ? [0.45, 1.1] : m === 'sit' || m === 'ground' ? [0.9, 0.9] : m === 'walk' || m === 'jog' ? [0.62, 0.95] : [0.62, 0.62];
        this._bq.setFromAxisAngle(up, a.heading); this._bp.set(a.x, a.y + 0.012, a.z); this._bs.set(sc[0], 1, sc[1]); this._bm.compose(this._bp, this._bq, this._bs); this.blobs.setMatrixAt(bi++, this._bm); }
      this.blobs.count = bi; this.blobs.instanceMatrix.needsUpdate = true; }
    const ms = performance.now() - tStart; this._ms = this._ms == null ? ms : this._ms + (ms - this._ms) * 0.05;
    let tris = 0, draws = 0; if ((this._sf = (this._sf || 0) + 1) % 30 === 1) { for (const c of this.pool) if (c.agent) c.root.traverse((o) => { if (o.isMesh && o.visible && o.parent.visible) { const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; draws++; } }); this._tris = tris; this._draws = draws; }
    this.stats = { active: n, pool: this.pool.length, cand: cand.length, ms: +this._ms.toFixed(2), tris: this._tris, draws: this._draws };
  }
  _spotNotice(a, player, dt) {
    const S = a._s || (a._s = { stare: 0, react: 0, near: 0 }); const dx = player.pos.x - a.x, dz = player.pos.z - a.z; const d = Math.hypot(dx, dz);
    const yawTo = Math.atan2(-dx, -dz); let rel = wrap(yawTo - a.heading);
    const look = player.camYaw != null ? player.camYaw : player.yaw; const toA = Math.atan2(-(a.x - player.pos.x), -(a.z - player.pos.z)); const staring = d < 9 && Math.abs(wrap(look - toA)) < 0.12;
    S.stare = staring ? S.stare + dt : Math.max(0, S.stare - dt * 2);
    if (d < 0.55 && S.near <= 0 && a.state !== 'lie') { S.react = 1; S.near = 3; }
    S.near -= dt;
    const notice = (S.stare > 1.0 || d < 2.2) && Math.abs(rel) < 2.2;
    a.gaze = notice ? Math.max(-1.25, Math.min(1.25, rel)) : 0;
  }
  // ---------------------------------------------------------------- steering (walkers within steerRadius of the player)
  steer(w, nb, player, dt) {
    const S = w._s || (w._s = { off: 0, stare: 0, react: 0, phoneCd: 8 + this.rand() * 40, chat: this.rand() * 6, glance: 0, bumpCd: 0 });
    const px = player.pos.x, pz = player.pos.z; const fx = -Math.sin(w.hd), fz = -Math.cos(w.hd), rx = -fz, rz = fx;
    const sp = w.speed * (w.speedMul ?? 1);
    let want = 0; // lateral shift wanted (metres, + = right of travel)
    // -- the player: predict closest approach and sidestep early, like people do
    const dx = px - w.vx, dz = pz - w.vz, d = Math.hypot(dx, dz);
    const pvx = player.vel ? player.vel.x : 0, pvz = player.vel ? player.vel.z : 0; const vx = pvx - fx * sp, vz = pvz - fz * sp; const vv = vx * vx + vz * vz;
    let tca = vv > 1e-4 ? -(dx * vx + dz * vz) / vv : 0; tca = Math.max(0, Math.min(3, tca));
    const cx = dx + vx * tca, cz = dz + vz * tca, dmin = Math.hypot(cx, cz);
    const along = dx * fx + dz * fz, lat = dx * rx + dz * rz;
    if (dmin < 1.7 && (tca < 3.2 || (along > -0.5 && along < 5)) && d < 12) { const latC = cx * rx + cz * rz;
      // pick a side once and stick to it (no dithering), preferring the side away from the player's predicted path
      if (!S.side || S.sideT <= 0) S.side = latC > 0.05 ? -1 : latC < -0.05 ? 1 : (lat >= 0 ? -1 : 1); S.sideT = 1.2;
      want += S.side * (1.75 - dmin) * (d < 4 ? 1.15 : 1); // personal space: pass the player with ~1 m between shoulders
      if (along > 0 && along < 2.2 && Math.abs(lat) < 0.75 && w.stateT <= 0) w.speedMul = Math.min(w.speedMul, 0.35 + 0.25 * along); } // boxed in: slow down too
    S.sideT = (S.sideT || 0) - dt;
    // -- bumped: flinch, stop, look at the player, then carry on
    S.bumpCd -= dt;
    if (d < 0.6 && S.bumpCd <= 0) { S.react = 1; S.bumpCd = 4; w.speedMul = 0; w.state = 'idle'; w.stateT = 1.6 + this.rand() * 0.8; S.glance = 3.5; w.sx = (w.sx || 0) - dx / Math.max(d, 0.1) * 0.35; w.sz = (w.sz || 0) - dz / Math.max(d, 0.1) * 0.35; }
    // -- never stand inside the player: push straight out (the player has physics, walkers don't block them)
    if (d < 0.72 && d > 1e-3) { const push = 0.72 - d; w.vx -= dx / d * push; w.vz -= dz / d * push; w.sx = (w.sx || 0) - dx / d * push; w.sz = (w.sz || 0) - dz / d * push; }
    // -- crossing traffic: predict the closest approach with each neighbour; the one with the higher id yields briefly
    S.yieldT = (S.yieldT || 0) - dt;
    for (const o of nb) {
      if (o === w.buddy || o.buddy === w || o.id < w.id) continue; const ox = o.vx - w.vx, oz = o.vz - w.vz; const od2 = ox * ox + oz * oz; if (od2 > 16) continue;
      const osp = o.speed * (o.sm ?? o.speedMul ?? 1); const ovx = -Math.sin(o.hd) * osp - fx * sp, ovz = -Math.cos(o.hd) * osp - fz * sp; const vv2 = ovx * ovx + ovz * ovz; if (vv2 < 0.05) continue;
      const tc = -(ox * ovx + oz * ovz) / vv2; if (tc < 0 || tc > 1.6) continue; const mx = ox + ovx * tc, mz = oz + ovz * tc;
      if (mx * mx + mz * mz < 0.36 && Math.abs((fx * -Math.sin(o.hd) + fz * -Math.cos(o.hd))) < 0.7) { S.yieldT = 0.7; break; }
    }
    if (S.yieldT > 0 && w.stateT <= 0) w.speedMul = Math.min(w.speedMul, 0.4);
    else if (w.stateT <= 0 && w.speedMul < 1 && w.state !== 'phone') w.speedMul = Math.min(1, w.speedMul + dt * 0.8);
    // -- other walkers: keep right when meeting, pass slower people
    for (const o of nb) {
      if (o === w.buddy || o.buddy === w) continue; const ox = o.vx - w.vx, oz = o.vz - w.vz; const al = ox * fx + oz * fz; if (al < 0 || al > 4.5) continue; const la = ox * rx + oz * rz; if (Math.abs(la) > 0.9) continue;
      const ofx = -Math.sin(o.hd), ofz = -Math.cos(o.hd); const head = fx * ofx + fz * ofz;
      if (head < -0.3) want += 0.35 * (1 - al / 4.5); // oncoming: drift right
      else if (head > 0.5 && o.speed * (o.speedMul ?? 1) < sp - 0.1) want += (la > 0 ? -0.5 : 0.5) * (1 - al / 4.5); // overtake on the clear side
    }
    if (w.buddy) want += 0.14; // walking pairs: a little more elbow room than the rail spacing
    want = Math.max(-1.7, Math.min(1.7, want));
    S.off += (want - S.off) * Math.min(1, dt * (Math.abs(want) > Math.abs(S.off) ? 2.4 : 0.9));
    w.sx = (w.sx || 0) * Math.max(0, 1 - dt * 2) + rx * S.off * Math.min(1, dt * 2); w.sz = (w.sz || 0) * Math.max(0, 1 - dt * 2) + rz * S.off * Math.min(1, dt * 2);
    // -- stared at: the walker notices, looks back, slows down
    const look = player.camYaw != null ? player.camYaw : player.yaw; const toW = Math.atan2(-(w.vx - px), -(w.vz - pz));
    const staring = d < 10 && d > 0.8 && Math.abs(wrap(look - toW)) < 0.1; S.stare = staring ? S.stare + dt : Math.max(0, S.stare - dt * 1.5);
    let gaze = 0; const relP = wrap(Math.atan2(-dx, -dz) - w.hd);
    S.stareCd = (S.stareCd || 0) - dt;
    if ((S.stare > 0.9 || S.glance > 0) && Math.abs(relP) < 2.3) { gaze = relP; if (S.stare > 2.0 && w.stateT <= 0 && !w.jog && S.stareCd <= 0) { w.speedMul = 0; w.state = 'idle'; w.stateT = 1.6 + this.rand() * 1.4; S.stareCd = 9; S.faceT = w.stateT; } }
    else if (d < 2.4 && Math.abs(relP) < 1.4 && ((w.id * 7) % 3 === 0)) gaze = relP * 0.8; // some glance at whoever passes close
    S.glance -= dt;
    // -- walking with a friend: turn to them now and then while talking
    const friend = w.buddy || (nb.find((o) => o.buddy === w));
    if (!gaze && friend && w.speedMul > 0.05) { S.chat -= dt; if (S.chat < 0) S.chat = 4 + this.rand() * 6; if (S.chat < 2.2) { const fy = Math.atan2(-(friend.vx - w.vx), -(friend.vz - w.vz)); gaze = wrap(fy - w.hd) * 0.85; } }
    S.faceT = (S.faceT || 0) - dt; if (S.react) S.faceT = Math.max(S.faceT, 1.2);
    w.faceHd = S.faceT > 0 && w.speedMul < 0.05 ? Math.atan2(-dx, -dz) : null; if (w.faceHd != null) gaze = gaze * 0.4; // body turns, head follows less
    w.gaze = gaze;
    // -- phone checks: now and then someone stops dead to read a text
    S.phoneCd -= dt;
    if (S.phoneCd < 0) { S.phoneCd = 25 + this.rand() * 50; if (!w.jog && !w.buddy && !friend && w.stateT <= 0 && d > 3) { w.speedMul = 0; w.state = 'phone'; w.stateT = 3 + this.rand() * 5; } }
    if (w.state === 'phone' && w.speedMul > 0.05 && w.stateT <= 0) w.speedMul = 0.78; // texting while walking is slow
  }
  // ---------------------------------------------------------------- routing (every walker, at every node)
  pickEdge(w, node, cand) {
    const G = this.life.graph; if (!G || !cand.length) return -1;
    if (!this.doors) { this.doors = []; G.adj.forEach((l, i) => { if (l.length === 1) this.doors.push(i); }); }
    const P = G.nodes[node];
    if (w._dest == null || w._hops > 70) {
      // a real destination: a building door (dead end) or a far point on the network, 60..400 m away
      let best = null, bw = -1; const R = this.rand;
      for (let k = 0; k < 10; k++) { const n = this.doors[Math.floor(R() * this.doors.length)]; const Q = G.nodes[n]; const dd = Math.hypot(Q[0] - P[0], Q[1] - P[1]); if (dd < 60 || dd > 420) continue; const s = R() * (dd < 250 ? 1.4 : 1); if (s > bw) { bw = s; best = n; } }
      w._dest = best; w._hops = 0; w._seen = [];
      if (best == null) return -1;
    }
    const D = G.nodes[w._dest]; w._hops++;
    let pick = -1, bs = 1e9;
    for (let i = 0; i < cand.length; i++) {
      const E = G.edges[cand[i]]; const o = E.a === node ? E.b : E.a; const Q = G.nodes[o];
      let s = Math.hypot(D[0] - Q[0], D[1] - Q[1]) + E.len * 0.15;
      if (G.adj[o].length <= 1 && o !== w._dest) s += 1e4; // other doors are not where we're going
      if (w._seen.includes(o)) s += 40; // don't pace back and forth
      s += this.rand() * 6;
      if (s < bs) { bs = s; pick = i; }
    }
    w._seen.push(node); if (w._seen.length > 14) w._seen.shift();
    return pick;
  }
}
// phase offsets (left foot forwardmost) and seat geometry, measured on the actual clips
export function calibrate(c) {
  if (!c) return; const B = c.B; B.phaseOff = {}; const v = new THREE.Vector3();
  const solo = (n, t) => { for (const k in c.actions) { const a = c.actions[k]; a.setEffectiveWeight(k === n ? 1 : 0); a.enabled = k === n; } const a = c.actions[n]; a.timeScale = 0; a.time = t; c.mixer.update(0); c.root.updateMatrixWorld(true); };
  c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0);
  for (const n of ['Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop']) { const d = c.actions[n].getClip().duration; let best = 1e9, bt = 0;
    for (let i = 0; i < 48; i++) { const t = (i / 48) * d; solo(n, t); c.bones.foot_l.getWorldPosition(v); const z = v.z - c.bones.pelvis.getWorldPosition(new THREE.Vector3()).z; if (z < best) { best = z; bt = t; } }
    B.phaseOff[n] = bt / d; }
  solo('Sitting_Idle_Loop', 0); c.bones.pelvis.getWorldPosition(v); B.sitOffset = { seat: v.y - 0.1, back: v.z };
  for (const k in c.actions) { c.actions[k].setEffectiveWeight(0); c.actions[k].timeScale = 1; }
}
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
