// Shared e-scooters: Lime Gen4 + Veo Astro stand-ups and Veo Cosmo seated scooters, parked in small clusters around
// the campus edge (rental scooters are geofenced off campus, so they collect on Bancroft, Telegraph, Northside,
// downtown at BART and outside the dorms). Walk up and press E (or U) to ride; E again to park. A parked scooter stays
// where you left it (also across reloads, via localStorage).
// Physics: kinematic bicycle model with a power-limited hub motor (~25 km/h), hand brake, rolling + air drag, gravity
// on slopes, speed-limited steering that leans into turns, wall bounces/scrapes, and kerb bumps where road meets sidewalk.
// Performance: parked scooters are one InstancedMesh per vehicle type per cluster (one shared material), culled by
// distance; only the ridden scooter is a separate rig.
import * as THREE from 'three';
import { SPECS, buildRig, parkedGeometry, rideMaterial, rideLightMaterial } from './ride-models.js';
const _qi = new THREE.Quaternion();
import { solveLimb, setWorldQuat, RideSound, groundSampler, clamp, angDiff, damp } from './ride-common.js';
import { U } from '../../materials.js';

const KEY = 'KeyU'; // "unlock": ride the nearest parked scooter (E works too)
const REACH = 1.9; // m, how close you must be to unlock
const SHOW_DIST = 260; // m, parked clusters beyond this are hidden
// Parking clusters. ang = row direction (deg, atan2(dz,dx)); st = unit vector toward the street (scooters face it).
// mix: l = Lime, v = Veo Astro, c = Veo Cosmo (seated). down = indices lying knocked over (a Berkeley classic).
const CLUSTERS = [
  { name: 'Bancroft & Telegraph', x: -108.8, z: 388.5, ang: -99.2, st: [-1, 0], gap: 0.72, mix: 'lvllcvl', down: [5] },
  { name: 'Sproul Plaza', x: -133.0, z: 369.4, ang: 170.9, st: [0, 1], gap: 0.7, mix: 'lvlvl' },
  { name: 'Lower Sproul', x: -176.0, z: 376.5, ang: 170.9, st: [0, 1], gap: 0.7, mix: 'vlvlll', down: [2] },
  { name: 'Downtown Berkeley BART', x: -904.6, z: 210.0, ang: 78.6, st: [1, 0], gap: 0.72, mix: 'lvlcvllv' },
  { name: 'Northside', x: -199.4, z: -350.5, ang: 82.0, st: [-1, 0], gap: 0.7, mix: 'lvlvl' },
  { name: 'Unit 1', x: 247.0, z: 422.4, ang: -7.0, st: [0, -1], gap: 0.72, mix: 'lcvl' },
  { name: 'Crossroads', x: 120.8, z: 557.0, ang: 80.5, st: [-1, 0], gap: 0.72, mix: 'vlvl' },
  { name: 'Unit 3', x: -230.0, z: 501.3, ang: -9.1, st: [0, -1], gap: 0.72, mix: 'lvcl' },
  { name: 'Blackwell Hall', x: -305.2, z: 444.0, ang: 80.2, st: [-1, 0], gap: 0.72, mix: 'lvl' },
  { name: 'Foothill', x: 145.0, z: -386.0, ang: -9.2, st: [0, -1], gap: 0.72, mix: 'vlv' },
  { name: 'Telegraph & Durant', x: -94.3, z: 483.5, ang: -99.0, st: [-1, 0], gap: 0.72, mix: 'lvll' },
];
const TILT = 0.15; // parked lean onto the kickstand (left)

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _m = new THREE.Matrix4(), _s1 = new THREE.Vector3(1, 1, 1);
const store = { get(k, d) { try { const v = localStorage.getItem('bsim.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('bsim.' + k, JSON.stringify(v)); } catch (e) {} } };
const NAMES = { lime: 'Lime scooter', veo: 'Veo scooter', cosmo: 'Veo Cosmo' };

class Fleet {
  constructor(scene, ph, setupMaterials) {
    this.scene = scene; this.ph = ph; this.items = []; this.groups = []; this.mat = rideMaterial();
    const saved = store.get('fleet.v1', {});
    CLUSTERS.forEach((c, ci) => {
      const r = rng(ci * 7919 + 13), a = c.ang * Math.PI / 180, rx = Math.cos(a), rz = Math.sin(a), n = c.mix.length;
      for (let i = 0; i < n; i++) {
        const t = (i - (n - 1) / 2) * 0.86 + (r() - 0.5) * 0.16;
        const x = c.x + rx * t + c.st[0] * (r() - 0.5) * 0.3, z = c.z + rz * t + c.st[1] * (r() - 0.5) * 0.3;
        const face = Math.atan2(-c.st[0], -c.st[1]) + (r() - 0.5) * 0.34 + (r() < 0.15 ? Math.PI : 0); // mostly facing the street
        const type = { l: 'lime', v: 'veo', c: 'cosmo' }[c.mix[i]];
        const id = `${ci}:${i}`; const it = { id, type, x, z, yaw: face, y: 0, down: (c.down || []).includes(i), home: ci, group: null, idx: -1, circles: [] };
        const sv = saved[id]; if (sv && Number.isFinite(sv[0]) && Number.isFinite(sv[1])) { it.x = sv[0]; it.z = sv[1]; it.yaw = sv[2] || 0; it.down = false; }
        this.items.push(it);
      }
    });
    // groups: one per cluster (+ a loose group for scooters parked far from any cluster), each with one InstancedMesh per type
    const mk = (cx, cz, cap, loose) => { const g = { cx, cz, loose, meshes: {}, members: {}, cap, r: 30, dirty: true }; for (const type of Object.keys(SPECS)) { const im = new THREE.InstancedMesh(parkedGeometry(type), this.mat, cap); im.count = 0; im.castShadow = true; im.receiveShadow = true; im.name = 'fleet:' + type; im.frustumCulled = !loose; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); g.meshes[type] = im; g.members[type] = []; } this.groups.push(g); return g; };
    CLUSTERS.forEach((c) => mk(c.x, c.z, c.mix.length + 3, false));
    this.loose = mk(0, 0, 10, true);
    setupMaterials && setupMaterials(this.groups[0].meshes.lime);
    for (const it of this.items) this.park(it);
    this.refreshT = 0;
  }
  nearestGroup(x, z, type) { let best = null, bd = 90 * 90; for (const g of this.groups) { if (g.loose || g.members[type].length >= g.cap) continue; const d = (g.cx - x) ** 2 + (g.cz - z) ** 2; if (d < bd) { bd = d; best = g; } } return best || (this.loose.members[type].length < this.loose.cap ? this.loose : null); }
  // place a scooter into instancing + physics at its (x, z, yaw)
  park(it) {
    const g = this.nearestGroup(it.x, it.z, it.type) || this.groups[it.home];
    return this.parkIn(g, it);
  }
  parkIn(g, it) {
    const list = g.members[it.type]; const im = g.meshes[it.type]; if (list.length >= im.instanceMatrix.count) { console.warn('fleet: no capacity for', it.id); return; } // never happens with the spare capacity
    it.group = g; it.idx = list.length; list.push(it); im.count = list.length;
    this.ground(it); this.writeMatrix(it); g.dirty = true;
    // colliders: two small circles (deck + stem) so you can't walk through parked scooters
    const S = SPECS[it.type], fx = -Math.sin(it.yaw), fz = -Math.cos(it.yaw);
    if (!it.down) for (const k of [0.12, -0.3]) { this.ph.addCircle(it.x + fx * k * (S.wb / 0.9), it.z + fz * k * (S.wb / 0.9), 0.2, it.y, it.y + 1.1, 'fleet'); it.circles.push(this.ph.circles[this.ph.circles.length - 1]); }
  }
  unpark(it) {
    const g = it.group; if (!g) return; const list = g.members[it.type], im = g.meshes[it.type];
    const last = list.pop(); if (last !== it) { list[it.idx] = last; last.idx = it.idx; this.writeMatrix(last); }
    im.count = list.length; im.instanceMatrix.needsUpdate = true; it.group = null; it.idx = -1; g.dirty = true;
    for (const c of it.circles) { c.y0 = Infinity; c.y1 = -Infinity; } it.circles.length = 0;
  }
  ground(it) { it.y = this.ph.groundAt(it.x, it.z, (it.y || this.ph.heightAt(it.x, it.z)) + 1.2).y; }
  writeMatrix(it) {
    const g = it.group; if (!g) return; const im = g.meshes[it.type];
    if (it.down) { _e.set(0, it.yaw, 1.36); _q.setFromEuler(_e); _v.set(it.x, it.y + 0.09, it.z); }
    else { _e.set(0, it.yaw, TILT); _q.setFromEuler(_e); _v.set(it.x, it.y + 0.004, it.z); }
    _m.compose(_v, _q, _s1); im.setMatrixAt(it.idx, _m); im.instanceMatrix.needsUpdate = true;
  }
  // per frame: distance culling + lazy re-grounding (landmark walkables stream in after start-up)
  update(dt, cam) {
    this.refreshT -= dt;
    for (const g of this.groups) {
      if (g.dirty) { g.dirty = false; let n = 0, sx = 0, sz = 0; for (const list of Object.values(g.members)) for (const it of list) { sx += it.x; sz += it.z; n++; } if (n && !g.loose) { g.cx = sx / n; g.cz = sz / n; let r = 4; for (const list of Object.values(g.members)) for (const it of list) r = Math.max(r, Math.hypot(it.x - g.cx, it.z - g.cz) + 2); g.r = r; } for (const im of Object.values(g.meshes)) { im.computeBoundingSphere(); } }
      const d = g.loose ? 0 : Math.hypot(g.cx - cam.x, g.cz - cam.z) - g.r; const vis = g.loose || d < SHOW_DIST;
      for (const im of Object.values(g.meshes)) im.visible = vis && im.count > 0;
      if (vis && d < 140 && this.refreshT <= 0) for (const list of Object.values(g.members)) for (const it of list) { const y0 = it.y; this.ground(it); if (Math.abs(it.y - y0) > 0.01) { this.writeMatrix(it); for (const c of it.circles) { c.y0 = it.y; c.y1 = it.y + 1.1; } } }
    }
    if (this.refreshT <= 0) this.refreshT = 2.5;
  }
  nearest(x, z, maxD, y) { let best = null, bd = maxD * maxD; for (const it of this.items) { if (!it.group) continue; const d = (it.x - x) ** 2 + (it.z - z) ** 2; if (d < bd && (y == null || Math.abs(it.y - y) < 2.5)) { bd = d; best = it; } } return best; }
  save() { const o = {}; for (const it of this.items) if (it.moved) o[it.id] = [+it.x.toFixed(2), +it.z.toFixed(2), +it.yaw.toFixed(3)]; store.set('fleet.v1', o); }
}

export function install(player, ctx) {
  const { scene, audio, ui, setupMaterials } = ctx;
  const ph = ctx.physics || player.ph;
  const fleet = new Fleet(scene, ph, setupMaterials);
  const sound = new RideSound(audio);
  const rigs = {};
  const getRig = (type) => { if (rigs[type]) return rigs[type]; const r = buildRig(type); r.root.visible = false; scene.add(r.root); setupMaterials && setupMaterials(r.root); return (rigs[type] = r); };
  const gs = { s: null }; const ground = () => gs.s || (gs.s = groundSampler());
  // E-to-ride: one interaction entry that follows the nearest parked scooter
  const entry = { pos: [1e9, -1e9, 1e9], radius: REACH, label: 'Ride scooter', fleet: true, it: null };
  player.interactions.push(entry);
  const prevInteract = player.onInteract;
  player.onInteract = (it) => { if (it && it.fleet) { if (it.it && player.mode !== 'scooter') { plugin.pending = it.it; player.setMode('scooter'); } return; } return prevInteract && prevInteract(it); };
  const ride = { it: null }; let lastPos = new THREE.Vector3(), justMounted = false, frame = 0, toastT = 0;

  const plugin = {
    key: KEY, icon: '🛴', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M5 18h9l3-12h3M15 6h-2"/></svg>',
    get label() { return ride.it ? NAMES[ride.it.type] : 'E-scooter'; },
    hint: 'W throttle · S brake · A/D steer · E park',
    fleet, pending: null,
    canEnter(p) {
      if (p.keys.has('ShiftLeft') || p.keys.has('ShiftRight')) return false; // Shift+U is reserved
      const it = this.pending || fleet.nearest(p.pos.x, p.pos.z, REACH + 0.3, p.pos.y);
      if (it) { this.pending = it; return true; }
      const far = fleet.nearest(p.pos.x, p.pos.z, 5000);
      if (far && ui && ui.toast && performance.now() > toastT) { toastT = performance.now() + 2500; const d = Math.hypot(far.x - p.pos.x, far.z - p.pos.z); const b = ((Math.atan2(far.x - p.pos.x, -(far.z - p.pos.z)) * 180 / Math.PI) + 360) % 360; const dir = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(b / 45) % 8];
        const cl = CLUSTERS[far.home]; ui.toast({ kind: 'Scooters', name: `Nearest ${NAMES[far.type]}: ${d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1) + ' km'} ${dir}`, sub: cl && Math.hypot(cl.x - far.x, cl.z - far.z) < 40 ? cl.name : 'Walk up and press E to ride' }, 2600); }
      return false;
    },
    enter(p) {
      const it = this.pending || fleet.nearest(p.pos.x, p.pos.z, REACH + 0.3, p.pos.y); this.pending = null; if (!it) return;
      fleet.unpark(it); const rig = getRig(it.type); const S = SPECS[it.type];
      // face the scooter's own heading; flip if the player approaches from behind and it's more natural to turn it
      Object.assign(ride, { it, rig, S, x: it.x, z: it.z, y: it.y, yaw: it.yaw, speed: 0, steer: 0, lean: 0, tilt: it.down ? 1.36 : TILT, tiltV: 0, pitch: 0, vy: 0, air: false, dist: 0, bumpY: 0, bumpV: 0, pOff: 0, pOffV: 0, kerb: [null, null], kerbCool: [0, 0], kerbAt: [[0, 0], [0, 0]], wasDown: it.down, t: 0, odo: 0, stand: 1, brake: 0, throttle: 0, accel: 0, camIdle: 0, lastCam: p.camYaw, load: 0 });
      it.down = false; rig.root.visible = true; p.yaw = it.yaw; p.vel.set(0, 0, 0); p.onGround = true;
      this._place(p); lastPos.copy(p.pos); justMounted = true;
      entry.pos[0] = 1e9; sound.unlock(); sound.start('motor');
    },
    exit(p, next) {
      const r = ride; if (!r.it) return; const it = r.it; ride.it = null;
      const teleported = p.pos.distanceTo(_v.set(r.x, r.y + r.S.deckTop, r.z)) > 3;
      it.x = r.x; it.z = r.z; it.yaw = r.yaw; it.y = r.y; it.moved = true; it.down = false; r.rig.root.visible = false;
      fleet.park(it); fleet.save();
      if (!teleported) { // step off to the right (the kickstand side is the left)
        const fx = -Math.sin(r.yaw), fz = -Math.cos(r.yaw); let best = null;
        for (const [sx, sf] of [[0.68, 0.1], [-0.68, 0.1], [0, 1.0], [0, -1.0]]) { const tx = r.x + fz * -sx + fx * sf, tz = r.z - fx * -sx + fz * sf; const res = ph.resolve(tx, tz, 0.32, r.y, 1.7); if (!res[2]) { best = [tx, tz]; break; } if (!best) best = [res[0], res[1]]; }
        p.pos.set(best[0], ph.groundAt(best[0], best[1], r.y + 0.7).y, best[1]); p.vel.set(-Math.sin(r.yaw) * r.speed * 0.3, 0, -Math.cos(r.yaw) * r.speed * 0.3); p.onGround = true;
      }
      sound.lock(); sound.stop();
      if (p.avatar && p.avatar.root) { p.avatar.root.rotation.order = 'XYZ'; resetPose(p.avatar); }
      if (r.t > 20 && ui && ui.toast) { const km = r.odo / 1000; ui.toast({ kind: 'Ride ended', name: `${NAMES[it.type]} · ${km < 1 ? Math.round(r.odo) + ' m' : km.toFixed(1) + ' km'} · ${Math.max(1, Math.round(r.t / 60))} min`, sub: 'Parked. It will stay here.' }, 3200); }
    },
    _place(p) { // sync player position + rig transform from ride state
      const r = ride, S = r.S; const y = r.y + r.bumpY;
      r.rig.root.position.set(r.x, y, r.z); r.rig.root.rotation.set(r.pitch + r.pOff, r.yaw, r.lean + r.tilt, 'YXZ');
      r.rig.steer.quaternion.setFromAxisAngle(r.rig.axis, r.steer);
      const sp = r.dist / S.R; r.rig.wheelF.rotation.x = -sp; r.rig.wheelR.rotation.x = -sp;
      r.rig.stand.quaternion.slerpQuaternions(_qi, r.rig.standStow, 1 - r.stand);
      r.rig.root.updateMatrixWorld(true);
      // player stands on the deck (or sits): camera + interactions follow
      _v.set(0, S.seated ? S.seatY - 0.86 : S.deckTop, S.seated ? S.seatZ + 0.04 : (S.feet[0] + S.feet[1]) / 2 + 0.01).applyMatrix4(r.rig.root.matrixWorld);
      p.pos.copy(_v); p.yaw = r.yaw;
    },
    update(p, dt, inp) {
      const r = ride; if (!r.it) { p.setMode('walk'); return 0; }
      if (p.pos.distanceToSquared(lastPos) > 9) { p.setMode('walk'); return 0; } // teleported (map travel, respawn): leave the scooter parked
      justMounted = false; p.jumpReq = false; r.t += dt; const S = r.S;
      // ---- inputs
      const throttle = Math.max(0, inp.f), brake = clamp(Math.max(0, -inp.f) + (inp.up ? 1 : 0), 0, 1), steerIn = -inp.s;
      r.throttle += (throttle - r.throttle) * damp(10, dt); r.brake = brake;
      // ---- longitudinal dynamics (power-limited motor, governor at vmax, brakes, drag, gravity along the slope)
      const v = r.speed; let a = 0; const fx = -Math.sin(r.yaw), fz = -Math.cos(r.yaw);
      const slope = r.air ? 0 : Math.sin(r.pitch);
      if (r.throttle > 0.02 && v > -0.3) { const motor = Math.min(1.75, 4.6 / Math.max(0.9, v)) * r.throttle; const gov = clamp((S.vmax * Math.max(0.35, r.throttle) - v) / 0.7, 0, 1); a += motor * gov; }
      if (brake > 0) { if (v > 0.05) a -= 4.2 * brake; else if (inp.f < -0.1 && v > -0.85) a -= 1.1; else if (v < 0 && inp.f >= -0.1) a += 3; }
      a -= (Math.abs(v) > 0.02 ? Math.sign(v) * 0.22 : 0) + 0.0045 * v * Math.abs(v);
      if (!r.air) a -= 9.81 * slope * 0.92;
      let nv = v + a * dt; if (Math.sign(nv) !== Math.sign(v) && v !== 0 && brake > 0 && inp.f >= -0.1) nv = 0; if (Math.abs(nv) < 0.03 && throttle === 0 && Math.abs(slope) < 0.04) nv = 0;
      r.accel = (nv - v) / Math.max(1e-4, dt); r.speed = nv;
      // ---- steering: speed-limited bar angle; yaw from the bicycle model; lean from lateral acceleration
      const va = Math.abs(r.speed); const dMax = Math.min(0.62, Math.atan(4.2 * S.wb / Math.max(0.01, va * va)));
      r.steer += clamp(steerIn * dMax - r.steer, -3.2 * dt, 3.2 * dt);
      let yawRate = r.air ? 0 : r.speed * Math.tan(r.steer) / S.wb;
      if (!r.air && va < 0.6 && Math.abs(steerIn) > 0.1) yawRate += steerIn * 1.1 * (1 - va / 0.6); // at a standstill the rider walks the scooter around
      r.yaw += yawRate * dt;
      const leanT = clamp(Math.atan(r.speed * yawRate / 9.81), -0.42, 0.42);
      r.lean += (leanT - r.lean) * damp(7, dt);
      r.tilt += (0 - r.tilt) * damp(r.wasDown ? 4 : 9, dt); if (Math.abs(r.tilt) < 0.002) { r.tilt = 0; r.wasDown = false; }
      r.stand += (0 - r.stand) * damp(9, dt);
      // ---- move + walls
      const step = r.speed * dt; let nx = r.x + fx * step, nz = r.z + fz * step;
      const res = ph.resolve(nx, nz, 0.3, r.y + 0.15, 1.6);
      if (res[2]) {
        const px = res[0] - nx, pz = res[1] - nz, pl = Math.hypot(px, pz);
        if (pl > 1e-6) { const into = -(fx * px + fz * pz) / pl * Math.sign(r.speed || 1); // 1 = head-on
          if (into > 0.55 && va > 2.2) { r.speed = -r.speed * 0.22; r.pOffV += 2.2 * Math.min(1, va / 6); r.bumpV += 0.6; sound.thud(Math.min(1, va / 6)); }
          else { r.speed *= 1 - clamp(into, 0, 1) * Math.min(1, 9 * dt + into * 0.6); if (into > 0.2 && va > 1.5 && Math.random() < dt * 8) sound.kerb(0.25); } }
        nx = res[0]; nz = res[1];
      }
      // ---- ground: sample under both wheels; steps > 22 cm are walls, smaller ones are kerb-like bumps; drops go airborne
      const half = S.wb / 2; const yF0 = r.y + Math.sin(r.pitch) * half, yR0 = r.y - Math.sin(r.pitch) * half;
      let gF = ph.groundAt(nx + fx * half, nz + fz * half, yF0 + 0.3).y, gR = ph.groundAt(nx - fx * half, nz - fz * half, yR0 + 0.3).y;
      const riseF = gF - yF0, riseR = gR - yR0;
      if ((riseF > 0.22 && r.speed > 0) || (riseR > 0.22 && r.speed < 0)) { // too tall: treat as a wall (stairs riser, planter)
        if (va > 2) { sound.thud(Math.min(1, va / 6)); r.pOffV += 1.6; } r.speed = -r.speed * 0.18; nx = r.x; nz = r.z;
        gF = ph.groundAt(nx + fx * half, nz + fz * half, yF0 + 0.3).y; gR = ph.groundAt(nx - fx * half, nz - fz * half, yR0 + 0.3).y;
      } else {
        for (const [k, rise] of [[0, riseF], [1, riseR]]) if (rise > 0.035 && !r.air) { const s = clamp(rise / 0.15, 0.2, 1) * clamp(va / 4, 0.3, 1); r.speed *= 1 - 0.25 * s; r.bumpV += 0.9 * s; r.pOffV += (k ? -1.3 : 1.8) * s; sound.kerb(s); }
      }
      const gMid = (gF + gR) / 2; const pitchT = Math.atan2(gF - gR, S.wb);
      r.vy -= 9.81 * dt; let ny = r.y + r.vy * dt;
      if (ny <= gMid + 0.005 || (!r.air && ny - gMid < 0.04 + va * dt * 0.5 && r.vy <= 0)) { if (r.air && r.vy < -1.6) { const s = clamp(-r.vy / 5, 0.2, 1); r.bumpV -= 0.8 * s; sound.land(s); } ny = gMid; r.vy = 0; r.air = false; r.pitch += (pitchT - r.pitch) * damp(18, dt); }
      else { r.air = true; r.pitch += (pitchT * 0.3 - r.pitch) * damp(2, dt); }
      // ---- synthetic kerbs where asphalt meets sidewalk (the terrain has no kerb geometry, only the painted kerb band)
      const G = ground(); const dirS = Math.sign(r.speed) || 1;
      if (G && !r.air && va > 0.5) for (let k = 0; k < 2; k++) {
        const sgn = k ? -1 : 1, wx = nx + fx * half * sgn, wz = nz + fz * half * sgn; r.kerbCool[k] -= dt;
        const road = G.asphalt(wx, wz) > 0; const prev = r.kerb[k]; r.kerb[k] = road; const at = r.kerbAt[k];
        if (prev == null) { at[0] = wx; at[1] = wz; continue; }
        if (prev !== road && r.kerbCool[k] <= 0 && Math.hypot(wx - at[0], wz - at[1]) > 0.35) {
          const up = !road; const pav = up ? G.paved(wx, wz) > -0.4 : G.paved(wx - fx * 0.5 * dirS, wz - fz * 0.5 * dirS) > -0.4;
          if (pav) { const s = clamp(va / 6, 0.25, 1); const lead = (k === 0) === (dirS > 0); r.kerbCool[k] = 0.25; at[0] = wx; at[1] = wz;
            if (up) { r.speed *= 1 - (lead ? 0.16 : 0.07) * s; r.bumpV += (lead ? 0.75 : 0.5) * s; r.pOffV += (k === 0 ? 1.7 : -1.2) * s; sound.kerb(s); }
            else { r.bumpV -= 0.35 * s; r.pOffV += (k === 0 ? -0.9 : 0.7) * s; sound.kerb(s * 0.55); } }
        }
      }
      // ---- springs for the visual bump / pitch kick (suspension feel)
      r.bumpV += (-170 * r.bumpY - 14 * r.bumpV) * dt; r.bumpY += r.bumpV * dt; r.bumpY = clamp(r.bumpY, -0.06, 0.09);
      r.pOffV += (-140 * r.pOff - 12 * r.pOffV) * dt; r.pOff += r.pOffV * dt; r.pOff = clamp(r.pOff, -0.2, 0.2);
      const moved = Math.hypot(nx - r.x, nz - r.z); r.odo += moved; r.dist += r.speed >= 0 ? moved : -moved;
      r.x = nx; r.z = nz; r.y = ny;
      this._place(p); lastPos.copy(p.pos);
      p.vel.set(fx * r.speed, r.vy, fz * r.speed); p.onGround = !r.air;
      // ---- lights + sound
      const night = U.uNight ? U.uNight.value : 0; rideLightMaterial('lightF').emissiveIntensity = 0.25 + night * 2.4; rideLightMaterial('lightR').emissiveIntensity = 0.35 + night * 1.6 + (brake > 0.1 ? 1.4 : 0); rideLightMaterial('lightU').emissiveIntensity = 0.3 + night * 1.8;
      const load = clamp(r.throttle * (0.4 + Math.max(0, r.accel) / 1.5) + Math.max(0, slope) * 2, 0, 1); r.load += (load - r.load) * damp(6, dt);
      sound.update(clamp(va / S.vmax, 0, 1.3), r.load, { braking: brake > 0.1 && va > 0.5, surface: G && G.asphalt(r.x, r.z) > 0 ? 'road' : G && G.paved(r.x, r.z) > 0 ? 'pave' : 'rough' });
      // ---- chase camera: swing in behind the scooter when the mouse has been idle a moment
      if (Math.abs(angDiff(r.lastCam, p.camYaw)) > 1e-5) r.camIdle = 0; else r.camIdle += dt;
      if (r.camIdle > 0.9 && va > 1.2) p.camYaw += angDiff(p.camYaw, r.yaw) * damp(0.5 + va * 0.18, dt);
      r.lastCam = p.camYaw;
      return va;
    },
    always(p, dt) {
      frame++;
      fleet.update(dt, p.camera ? p.camera.position : p.pos);
      if (p.mode === 'scooter') { entry.pos[0] = 1e9; return; }
      if (frame % 30 === 0 && !p.interactions.includes(entry)) p.interactions.push(entry);
      const it = (p.mode === 'walk') ? fleet.nearest(p.pos.x, p.pos.z, REACH, p.pos.y) : null;
      if (it) { entry.it = it; entry.pos[0] = it.x; entry.pos[1] = it.y; entry.pos[2] = it.z; entry.label = (it.down ? 'Pick up ' : 'Ride ') + NAMES[it.type]; }
      else { entry.it = null; entry.pos[0] = 1e9; }
    },
    onKey(e, p) {
      if (e.code === 'KeyE' && !e.repeat && p.mode === 'scooter' && !justMounted) p.setMode('walk');
      if (e.code === 'KeyE' && justMounted) justMounted = false;
    },
    pose(p, av, dt) {
      if (p.mode !== 'scooter' || !ride.it) return;
      poseRider(av, ride, dt);
    },
  };
  player.registerMode('scooter', plugin);
  if (ui && ui.addTouchButton) ui.addTouchButton('RIDE', () => player.setMode(player.mode === 'scooter' ? 'walk' : 'scooter'));
  if (typeof window !== 'undefined' && window.BSIM) window.BSIM.scooters = { fleet, plugin, ride, clusters: CLUSTERS };
  return plugin;
}

// ---------------------------------------------------------------- rider pose (IK onto the deck / seat and the grips)
export function resetPose(av) { const P = av.p; if (!P) return; for (const k of ['hips', 'spine', 'head', 'neck']) P[k] && P[k].rotation.set(0, 0, 0); for (const s of [-1, 1]) for (const k of ['hip', 'kn', 'ft', 'sh', 'el']) P[k + s] && P[k + s].rotation.set(0, 0, 0); }
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _pole = new THREE.Vector3(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _ea = new THREE.Euler();
function poseRider(av, r, dt) {
  const P = av.p, S = r.S, root = r.rig.root, M = root.matrixWorld;
  root.getWorldQuaternion(_qa);
  // avatar root: vehicle heading + lean (no pitch: riders stay upright on slopes)
  _ea.set(0, r.yaw, r.lean + r.tilt * 0.5, 'YXZ'); av.root.rotation.copy(_ea);
  const crouch = clamp(-r.bumpY * 2.2, -0.05, 0.1) + (S.seated ? 0 : 0.04 + Math.min(0.05, Math.abs(r.lean) * 0.12));
  if (S.seated) {
    P.hips.position.set(0, 0.94, 0); P.hips.rotation.set(0, 0, 0);
    P.spine.rotation.set(-0.16 - clamp(r.accel * 0.02, -0.06, 0.06), 0, 0); P.neck && (P.neck.rotation.x = 0); P.head.rotation.set(0.12, 0, 0);
  } else {
    P.hips.position.set(0, 0.94 - crouch, 0); P.hips.rotation.set(0, -0.32, 0);
    P.spine.rotation.set(-0.2 - clamp(r.accel * 0.025, -0.08, 0.1), 0.26, 0); P.head.rotation.set(0.16, 0.06, 0);
  }
  av.root.updateMatrixWorld(true);
  // feet
  const fwdW = _b.set(0, 0, -1).applyQuaternion(_qa);
  for (const s of [-1, 1]) {
    const hip = P['hip' + s], kn = P['kn' + s], ft = P['ft' + s];
    let fl;
    if (S.seated) fl = _a.set(s * 0.1, S.deckTop + 0.012, S.feet[0] + 0.02);
    else fl = _a.set(s === -1 ? -0.035 : 0.04, S.deckTop, s === -1 ? S.feet[0] : S.feet[1]);
    const footYaw = S.seated ? s * -0.12 : (s === -1 ? 0.12 : -0.75);
    // ankle sits ~7 cm above the sole, ~5 cm behind the foot centre
    _qb.setFromAxisAngle(_v2.set(0, 1, 0), footYaw); const back = _v.set(0, 0.072, 0.05).applyQuaternion(_qb);
    fl.add(back).applyMatrix4(M);
    _pole.copy(fwdW).multiplyScalar(1).add(_v.set(s * 0.25, 0.15, 0).applyQuaternion(_qa));
    solveLimb(hip, kn, 0.45, 0.44, fl, _pole);
    _qb.setFromAxisAngle(_v2.set(0, 1, 0), footYaw); setWorldQuat(ft, _qa.clone().multiply(_qb));
  }
  // hands on the grips (grips turn with the bars)
  for (const s of [-1, 1]) {
    const g = r.rig.grips[s < 0 ? 0 : 1]; _a.copy(g); r.rig.steer.localToWorld(_a);
    _pole.set(s * 0.7, -0.5, 1).applyQuaternion(_qa);
    solveLimb(P['sh' + s], P['el' + s], 0.3, 0.3, _a, _pole);
  }
}
