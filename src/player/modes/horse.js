// Rideable horse movement mode. Press Y (or E at the hitching rail at Faculty Glade) to ride; Y again or E to dismount.
// W/A/S/D steer (camera-relative), W canters, Shift gallops, C/Ctrl walks, S brakes and backs up, Space jumps.
// The horse follows slopes, collides with buildings (three circles along the body), plays phase-locked hoof sounds that
// change between stone/asphalt, grass and dirt, and comes to you at a gallop when summoned from afar.
import * as THREE from 'three';
import { loadHorseRig, GAITS } from './horse-rig.js';

const KEY = 'KeyY';
// monochrome line icon for the HUD (inherits currentColor)
const ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 20.5c-.4-3.8.6-7 2.6-9.3L6.3 10.6c-1-.2-1.4-1.2-.8-2l3.3-4C9.8 3.4 11.4 2.8 13 3l.9-1.5.9 1.9c2.9 1.1 4.6 4 4.4 7.4-.2 3.5-1.4 6.5-1.9 9.7"/><path d="M12.6 6.6h.01"/><path d="M14.6 3.6c-1 1.6-1.4 3.4-1.1 5.3"/></svg>';
const HITCH = { x: 141.9, z: 81.5, len: 2.8 };                // rail along the Faculty Glade loop path (runs north-south)
const SPEED = { walk: 1.6, trot: 3.6, canter: 7.0, gallop: 14.5, back: -1.1 };
const RIDE_LIFT = 0.8;                                        // player.pos sits this far above the horse's hooves while riding (eye height)
const GRAV = 16, JUMP_V = 5.9;                                // jump apex ~1.1 m; clears obstacles up to ~1.4 m
const BODY = [[0.95, 0.42], [0, 0.55], [-0.85, 0.45]];        // collision circles: [offset along heading (m), radius]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// gait weights by speed (m/s): idle<->walk<->trot<->canter<->gallop
function gaitWeights(v, out) {
  const a = Math.abs(v); out.walk = out.trot = out.canter = out.gallop = 0;
  const mv = ss(0.08, 0.7, a);
  if (a < 2.3) out.walk = 1; else if (a < 2.9) { const t = ss(2.3, 2.9, a); out.walk = 1 - t; out.trot = t; }
  else if (a < 4.7) out.trot = 1; else if (a < 5.4) { const t = ss(4.7, 5.4, a); out.trot = 1 - t; out.canter = t; }
  else if (a < 9.5) out.canter = 1; else if (a < 11.5) { const t = ss(9.5, 11.5, a); out.canter = 1 - t; out.gallop = t; }
  else out.gallop = 1;
  for (const k of ['walk', 'trot', 'canter', 'gallop']) out[k] *= mv;
  return out;
}
// stride frequency (Hz) per gait at speed v; some hoof slip is accepted at the fast end
const CAD = { walk: (v) => clamp(0.35 + v * 0.5, 0.55, 1.3), trot: (v) => clamp(1.2 + v * 0.22, 1.6, 2.4), canter: (v) => clamp(1.45 + v * 0.08, 1.8, 2.3), gallop: (v) => clamp(1.7 + v * 0.06, 2.2, 2.75) };

export class Horse {
  constructor(player, ctx) {
    this.player = player; this.ctx = ctx; this.ph = ctx.physics; this.scene = ctx.scene;
    this.rig = null; this.loading = null; this.state = 'parked'; // parked | coming | ridden
    this.pos = new THREE.Vector3(HITCH.x - 1.75, 0, HITCH.z); this.yaw = -Math.PI / 2; // facing east, nose over the rail
    this.speed = 0; this.vy = 0; this.air = false; this.pitch = 0; this.roll = 0; this.look = 0; this.turnRate = 0;
    this.jumpT = -1; this.jumpW = 0; this.mountT = 0; this.idleKind = 'eat'; this.idleTimer = 6; this.stuckT = 0; this.comeT = 0;
    this.gw = { walk: 0, trot: 0, canter: 0, gallop: 0 }; this.lastPhase = 0; this.autoMount = false;
    this.inter = { pos: [this.pos.x, 0, this.pos.z], radius: 2.8, label: 'Ride horse', horse: true };
    this.tmp = new THREE.Vector3(); this.tmp2 = new THREE.Vector3(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(0, 0, 0, 'YXZ');
    this.surfaceCache = null;
  }
  ensure() {
    if (this.rig || this.loading) return this.loading;
    this.loading = loadHorseRig().then((rig) => {
      this.rig = rig; this.scene.add(rig.root); this.ctx.setupMaterials && this.ctx.setupMaterials(rig.root);
      this._buildExtras();
      this.pos.y = this.ph.groundAt(this.pos.x, this.pos.z, 1e9).y; this._place(0);
      this.setInteraction(true);
      console.log('HORSE ready');
    }).catch((e) => { console.warn('horse failed to load', e); this.loading = null; });
    return this.loading;
  }
  // ---------- scene extras: hitching rail + trough at Faculty Glade, reins, stirrups, lead rope
  _buildExtras() {
    const THREE_ = THREE; const wood = new THREE_.MeshStandardMaterial({ color: '#6b4f36', roughness: 0.85 }); const dark = new THREE_.MeshStandardMaterial({ color: '#3f3328', roughness: 0.9 });
    const g = new THREE_.Group(); g.name = 'hitchingRail';
    const hx = HITCH.x, hz = HITCH.z; const y0 = this.ph.groundAt(hx, hz - HITCH.len / 2, 1e9).y, y1 = this.ph.groundAt(hx, hz + HITCH.len / 2, 1e9).y;
    for (const [z, y] of [[hz - HITCH.len / 2, y0], [hz + HITCH.len / 2, y1]]) { const p = new THREE_.Mesh(new THREE_.BoxGeometry(0.14, 1.25, 0.14), wood); p.position.set(hx, y + 0.5, z); g.add(p); const cap = new THREE_.Mesh(new THREE_.BoxGeometry(0.17, 0.04, 0.17), dark); cap.position.set(hx, y + 1.14, z); g.add(cap); }
    const rail = new THREE_.Mesh(new THREE_.CylinderGeometry(0.055, 0.055, HITCH.len + 0.2, 10), wood); rail.rotation.x = Math.PI / 2; rail.position.set(hx, (y0 + y1) / 2 + 1.04, hz); rail.rotation.z = Math.atan2(y1 - y0, HITCH.len) * 0; g.add(rail);
    // galvanised water trough beside the rail
    const ty = this.ph.groundAt(hx + 0.2, hz + 2.6, 1e9).y; const tr = new THREE_.Mesh(new THREE_.CylinderGeometry(0.42, 0.38, 0.5, 18, 1, true), new THREE_.MeshStandardMaterial({ color: '#9aa2a8', roughness: 0.45, metalness: 0.7, side: THREE_.DoubleSide }));
    tr.scale.set(1.6, 1, 0.8); tr.position.set(hx + 0.1, ty + 0.25, hz + 2.65); g.add(tr);
    const water = new THREE_.Mesh(new THREE_.CircleGeometry(0.4, 18), new THREE_.MeshStandardMaterial({ color: '#33505a', roughness: 0.08, metalness: 0.2 })); water.rotation.x = -Math.PI / 2; water.scale.set(1.6, 0.8, 1); water.position.set(hx + 0.1, ty + 0.42, hz + 2.65); g.add(water);
    // hay bale
    const hy = this.ph.groundAt(hx - 0.6, hz - 2.4, 1e9).y; const hay = new THREE_.Mesh(new THREE_.BoxGeometry(0.9, 0.42, 0.5), new THREE_.MeshStandardMaterial({ color: '#c9a95c', roughness: 1 })); hay.position.set(hx - 0.5, hy + 0.21, hz - 2.45); hay.rotation.y = 0.3; g.add(hay);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(g); this.ctx.setupMaterials && this.ctx.setupMaterials(g); this.hitch = g;
    // collision: posts, rail (low enough to jump), trough
    for (const [z, y] of [[hz - HITCH.len / 2, y0], [hz + HITCH.len / 2, y1]]) this.ph.addCircle(hx, z, 0.1, y - 1, y + 1.2, 'horse-hitch');
    this.ph.addSeg(hx, hz - HITCH.len / 2, hx, hz + HITCH.len / 2, Math.min(y0, y1) + 0.98, Math.max(y0, y1) + 1.1, 'horse-hitch');
    this.ph.addCircle(hx + 0.1, hz + 2.65, 0.62, ty - 1, ty + 0.5, 'horse-hitch');
    this.railY = (y0 + y1) / 2 + 1.04;
    // reins (dynamic tube), lead rope, stirrups
    const leather = new THREE_.MeshStandardMaterial({ color: '#3d2615', roughness: 0.55 });
    this.reins = new THREE_.Mesh(new THREE_.BufferGeometry(), leather); this.reins.frustumCulled = false; this.reins.castShadow = true; this.scene.add(this.reins);
    this.reinPts = Array.from({ length: 17 }, () => new THREE_.Vector3()); this._tube(this.reins, this.reinPts, 0.012, true);
    this.rope = new THREE_.Mesh(new THREE_.BufferGeometry(), new THREE_.MeshStandardMaterial({ color: '#b9a37a', roughness: 0.9 })); this.rope.frustumCulled = false; this.scene.add(this.rope);
    this.ropePts = Array.from({ length: 9 }, () => new THREE_.Vector3()); this._tube(this.rope, this.ropePts, 0.014, true);
    const steel = new THREE_.MeshStandardMaterial({ color: '#c3c7cc', roughness: 0.3, metalness: 0.85 });
    // stirrup irons: an arch over a flat tread; group origin = top of the arch, tread 0.135 m below
    this.stirrups = [0, 1].map(() => { const s = new THREE_.Group(); const ring = new THREE_.Mesh(new THREE_.TorusGeometry(0.075, 0.011, 6, 16, Math.PI * 1.5), steel); ring.rotation.z = -Math.PI * 0.25; ring.position.y = -0.08; s.add(ring); const tread = new THREE_.Mesh(new THREE_.BoxGeometry(0.125, 0.014, 0.075), steel); tread.position.y = -0.135; s.add(tread); s.traverse((o) => { if (o.isMesh) o.castShadow = true; }); this.scene.add(s); return s; });
    this.leathers = new THREE_.Mesh(new THREE_.BufferGeometry(), new THREE_.MeshStandardMaterial({ color: '#2a180d', roughness: 0.6, side: THREE_.DoubleSide })); this.leathers.frustumCulled = false; this.leathers.castShadow = true; this.scene.add(this.leathers);
    this.leatherPts = [new THREE_.Vector3(), new THREE_.Vector3(), new THREE_.Vector3(), new THREE_.Vector3()]; this._strips(this.leathers, this.leatherPts, true);
    for (const m of [this.reins, this.rope, this.leathers]) this.ctx.setupMaterials && this.ctx.setupMaterials(m);
    for (const s of this.stirrups) this.ctx.setupMaterials && this.ctx.setupMaterials(s);
  }
  // simple tube along points (4 sides); init=true builds index/attributes
  _tube(mesh, pts, r, init) {
    const n = pts.length, SIDES = 4; let g = mesh.geometry;
    if (init) { g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * SIDES * 3), 3)); const idx = []; for (let i = 0; i < n - 1; i++) for (let s = 0; s < SIDES; s++) { const a = i * SIDES + s, b = i * SIDES + ((s + 1) % SIDES), c = a + SIDES, d = b + SIDES; idx.push(a, c, b, b, c, d); } g.setIndex(idx); mesh.userData.r = r; }
    const P = g.attributes.position.array; const t = this.tmp, nrm = this.tmp2, bin = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      t.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]); if (t.lengthSq() < 1e-10) t.set(0, 0, 1); t.normalize();
      nrm.crossVectors(t, up); if (nrm.lengthSq() < 1e-6) nrm.set(1, 0, 0); nrm.normalize(); bin.crossVectors(nrm, t).normalize();
      for (let s = 0; s < SIDES; s++) { const a = (s / SIDES) * Math.PI * 2; const k = (i * SIDES + s) * 3; P[k] = pts[i].x + (nrm.x * Math.cos(a) + bin.x * Math.sin(a)) * r; P[k + 1] = pts[i].y + (nrm.y * Math.cos(a) + bin.y * Math.sin(a)) * r; P[k + 2] = pts[i].z + (nrm.z * Math.cos(a) + bin.z * Math.sin(a)) * r; }
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  }
  // two flat leather strips (stirrup leathers): pts = [topL, botL, topR, botR]
  _strips(mesh, pts, init) {
    const g = mesh.geometry; if (init) { g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3)); g.setIndex([0, 2, 1, 1, 2, 3, 4, 6, 5, 5, 6, 7]); }
    const P = g.attributes.position.array; const w = 0.02; const fx = -Math.sin(this.yaw) * w, fz = -Math.cos(this.yaw) * w; let k = 0;
    for (let s = 0; s < 2; s++) for (const p of [pts[s * 2], pts[s * 2 + 1]]) for (const e of [-1, 1]) { P[k++] = p.x + fx * e; P[k++] = p.y; P[k++] = p.z + fz * e; }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  }
  // ---------- surfaces
  surface(x, z) {
    const g = this.ph.groundAt(x, z, this.pos.y + 0.7); if (g.on) return 'stone';
    const T = window.BSIM && window.BSIM.terrain; const tex = T && T.uniforms && T.uniforms.uSdf && T.uniforms.uSdf.value; if (!tex || !tex.image) return 'dirt';
    const d = tex.image.data, W = tex.image.width, H = tex.image.height, R = T.uniforms.uGround.value;
    const j = Math.floor(((x - R.x) / R.z) * W), i = Math.floor(((z - R.y) / R.w) * H); if (i < 0 || j < 0 || i >= H || j >= W) return 'dirt';
    const k = (i * W + j) * 4; if (d[k] > 122) return 'road'; if (d[k + 1] > 122) return 'stone'; if (d[k + 2] > 128) return 'grass'; return 'dirt';
  }
  // ---------- movement core: integrate pos with yaw/speed, ground following, wall collision. Returns hit info.
  _move(dt, wantVX, wantVZ) {
    const ph = this.ph; const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    let x = this.pos.x + wantVX * dt, z = this.pos.z + wantVZ * dt; let hitFront = false, hit = false;
    // while jumping (and just after landing) the legs are tucked: low obstacles under the body don't snag the hind end
    const tuck = this.air || this.landT > 0 ? 0.8 : 0; if (this.landT > 0) this.landT -= dt;
    for (let it = 0; it < 2; it++) for (let c = 0; c < BODY.length; c++) {
      const [o, r] = BODY[c]; const px = x + fx * o, pz = z + fz * o;
      const res = ph.resolve(px, pz, r, this.pos.y + 0.1 + tuck, 2.5 - tuck);
      if (res[2]) { hit = true; if (c === 0) hitFront = true; x += res[0] - px; z += res[1] - pz; }
    }
    // ground: sample under front & hind hooves for pitch, centre for height (step up to 0.6 m)
    const stepY = this.pos.y + 0.6;
    const gC = ph.groundAt(x, z, stepY), gF = ph.groundAt(x + fx * 0.8, z + fz * 0.8, stepY + 0.4), gB = ph.groundAt(x - fx * 0.8, z - fz * 0.8, stepY + 0.4);
    // refuse cliffs / walls of terrain steeper than ~38 degrees uphill
    const rise = gC.y - this.pos.y;
    if (!this.air && rise > 0.6) { x = this.pos.x; z = this.pos.z; hit = hitFront = true; }
    const gy = Math.max(gC.y, (gF.y + gB.y) * 0.5);
    this.tPitch = Math.atan2(gF.y - gB.y, 1.6);
    if (this.air) {
      this.vy -= GRAV * dt; let ny = this.pos.y + this.vy * dt;
      if (ny <= gy && this.vy <= 0) { ny = gy; this.air = false; this.vy = 0; this.onLand(); }
      this.pos.set(x, ny, z);
    } else {
      if (gy < this.pos.y - 0.9) { this.air = true; this.vy = 0; this.pos.set(x, this.pos.y, z); }   // ran off a ledge
      else this.pos.set(x, gy, z);
    }
    return { hit, hitFront };
  }
  onLand() {
    this.landT = 0.45;
    if (this.jumpT >= 0 && this.rig) this.jumpT = Math.max(this.jumpT, 1.17);
    this.hoofAll(0.9);
  }
  startJump() {
    if (this.air || this.jumpT >= 0 || this.state !== 'ridden' || this.mountT > 0) return;
    this.jumpT = 0.3; this.jumpLaunch = true;                 // gather (crouch) frames first, launch at clip t=0.44 s
  }
  // ---------- ridden update
  ride(dt, inp, fwd, right) {
    const p = this.player;
    if (this.mountT > 0) { this.mountT = Math.max(0, this.mountT - dt); this.speed *= Math.max(0, 1 - dt * 4); this._move(dt, 0, 0); return; }
    if (p.jumpReq) { p.jumpReq = false; this.startJump(); }
    const mag = Math.hypot(inp.f, inp.s); let wantYaw = this.yaw, target = 0, turnIn = 0;
    if (mag > 0.1) {
      const dx = fwd.x * inp.f + right.x * inp.s, dz = fwd.z * inp.f + right.z * inp.s;
      const back = inp.f < -0.5 && Math.abs(inp.s) < 0.5;     // S alone: brake, then rein back
      if (back) { target = this.speed > 0.4 ? 0 : SPEED.back; }
      else {
        wantYaw = Math.atan2(-dx, -dz); turnIn = angDiff(this.yaw, wantYaw);
        target = inp.sprint ? SPEED.gallop : inp.down ? SPEED.walk : SPEED.canter;
        target *= mag;
        // horses slow to turn sharply
        const sharp = Math.abs(turnIn); if (sharp > 1.2) target = Math.min(target, SPEED.walk + 0.4); else if (sharp > 0.6) target = Math.min(target, SPEED.trot + 1.5);
      }
    }
    // uphill slows, downhill a little faster
    target *= clamp(1 - Math.max(0, this.pitch) * 1.2, 0.55, 1.05);
    const acc = target > this.speed ? (this.speed < SPEED.trot ? 3.2 : 2.6) : (mag < 0.1 ? 4.5 : 7);
    if (!this.air) this.speed += clamp(target - this.speed, -acc * dt, acc * dt);
    // steering: rate falls with speed; a gentle turn-in-place at a standstill
    const maxRate = this.speed < 0.3 ? 1.5 : clamp(2.2 / (1 + Math.abs(this.speed) * 0.16), 0.85, 2.0);
    const wantRate = clamp(turnIn * 3.0, -maxRate, maxRate) * (this.air ? 0.2 : 1);
    this.turnRate += (wantRate - this.turnRate) * Math.min(1, dt * 6);
    this.yaw += this.turnRate * dt;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const h = this._move(dt, fx * this.speed, fz * this.speed);
    if (h.hitFront && this.speed > 4.5 && !this.bumped) { this.bumped = 0.6; this.speed *= 0.25; this.snort(0.7); } else if (h.hit) this.speed *= Math.max(0, 1 - dt * 3);
    if (this.bumped) this.bumped = Math.max(0, this.bumped - dt) || 0;
  }
  // ---------- unridden: graze/idle, or come when called
  idle(dt) {
    const p = this.player;
    if (this.state === 'coming') {
      this.comeT += dt; const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z; const d = Math.hypot(dx, dz);
      const wantYaw = Math.atan2(-dx, -dz); const tr = angDiff(this.yaw, wantYaw);
      this.yaw += clamp(tr * 3, -2, 2) * dt;
      const target = Math.min(SPEED.gallop * 0.85, Math.sqrt(Math.max(0, 2 * 4.5 * (d - 2.3)))) * (Math.abs(tr) > 1.3 ? 0.3 : 1);
      this.speed += clamp(target - this.speed, -6 * dt, 4 * dt);
      const before = this.tmp.copy(this.pos);
      this._move(dt, -Math.sin(this.yaw) * this.speed, -Math.cos(this.yaw) * this.speed);
      const prog = before.distanceTo(this.pos); this.stuckT = prog < this.speed * dt * 0.3 && this.speed > 1 ? this.stuckT + dt : Math.max(0, this.stuckT - dt);
      if (this.stuckT > 1.2 || this.comeT > 12) { this._spawnNear(5); this.stuckT = 0; }
      if (d < 2.8 && this.speed < 1.0) { this.state = 'parked'; this.speed = 0; this.snort(0.5); if (this.autoMount && p.mode === 'walk') { this.autoMount = false; p.setMode('horse'); } }
      return;
    }
    // parked: settle, graze, shift weight; idles change every few seconds
    this.speed += (0 - this.speed) * Math.min(1, dt * 3); if (Math.abs(this.speed) > 0.05) this._move(dt, -Math.sin(this.yaw) * this.speed, -Math.cos(this.yaw) * this.speed); else this._move(dt, 0, 0);
    this.idleTimer -= dt; if (this.idleTimer < 0) { const r = Math.random(); this.idleKind = r < 0.45 ? 'eat' : r < 0.7 ? 'idle' : r < 0.88 ? 'idle2' : 'headlow'; this.idleTimer = 5 + Math.random() * 7; if (Math.random() < 0.25) this.snort(0.35); }
    // keep the walking player from passing through the horse
    if (p.mode !== 'horse') { const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw); for (const [o, r] of BODY) { const cx = this.pos.x + fx * o, cz = this.pos.z + fz * o; const ex = p.pos.x - cx, ez = p.pos.z - cz; const dd = Math.hypot(ex, ez), R = r + 0.3; if (dd < R && dd > 1e-4 && Math.abs(p.pos.y - this.pos.y) < 1.8) { p.pos.x = cx + (ex / dd) * R; p.pos.z = cz + (ez / dd) * R; } } }
  }
  // place the horse at a free spot near the player (out of the camera's view when possible)
  _spawnNear(minD = 12) {
    const p = this.player; const camBack = Math.atan2(Math.sin(p.camYaw), Math.cos(p.camYaw));
    const tries = [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, Math.PI]; for (const dist of [minD + 6, minD, Math.max(3.5, minD * 0.5), 3.5]) for (const a0 of tries) {
      const a = camBack + a0; const x = p.pos.x + Math.sin(a) * dist, z = p.pos.z + Math.cos(a) * dist; const gy = this.ph.groundAt(x, z, p.pos.y + 3).y;
      if (Math.abs(gy - p.pos.y) > 3) continue; const r = this.ph.resolve(x, z, 1.0, gy + 0.1, 2.4); if (r[2]) continue;
      const wd = this.ph.rayWall(x, z, gy + 1.2, (p.pos.x - x) / dist, (p.pos.z - z) / dist, dist); if (wd < dist - 0.5) continue;
      this.pos.set(x, gy, z); this.yaw = Math.atan2(-(p.pos.x - x), -(p.pos.z - z)); this.speed = dist > 8 ? SPEED.canter : 0; this.air = false; this.vy = 0; return true;
    }
    const a = p.yaw + Math.PI / 2; this.pos.set(p.pos.x + Math.sin(a) * 2, p.pos.y, p.pos.z + Math.cos(a) * 2); this.yaw = p.yaw; this.speed = 0; return false;
  }
  summon() {
    const p = this.player; this.whistle();
    const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    if (d > 70 || Math.abs(p.pos.y - this.pos.y) > 12 || !this._clearPath()) this._spawnNear(16);
    this.state = 'coming'; this.comeT = 0; this.autoMount = true; this.untie();
  }
  _clearPath() { const p = this.player; const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz); if (d < 1) return true; return this.ph.rayWall(this.pos.x, this.pos.z, this.pos.y + 1.2, dx / d, dz / d, d) >= d - 0.5; }
  untie() { this.tied = false; }
  // keep the 'E  Ride horse' prompt registered only while the horse is waiting to be ridden
  setInteraction(on) {
    const p = this.player; const has = p.interactions.includes(this.inter);
    if (on && !has) p.interactions.push(this.inter); else if (!on && has) p.interactions = p.interactions.filter((x) => x !== this.inter);
  }
  canMount() { const p = this.player; if (!this.rig) return false; return Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 3.2 && Math.abs(p.pos.y - this.pos.y) < 2 && this.state !== 'coming'; }
  // ---------- per-frame visuals
  _place(dt) {
    const r = this.rig; if (!r) return;
    const k = Math.min(1, dt * 6); this.pitch += ((this.air ? this.pitch : this.tPitch || 0) - this.pitch) * k;
    const tRoll = clamp(-this.turnRate * Math.abs(this.speed) * 0.018, -0.16, 0.16); this.roll += (tRoll - this.roll) * Math.min(1, dt * 4);
    let rise = 0; if (this.jumpT >= 0) rise = r.riseAt(this.jumpT) * this.jumpW;   // cancel the clip's own vertical motion
    r.root.position.set(this.pos.x, this.pos.y - rise, this.pos.z); r.root.rotation.set(0, this.yaw, 0);
    r.tilt.rotation.set(this.pitch, 0, this.roll, 'YXZ');
  }
  animate(dt, near) {
    const r = this.rig; if (!r) return;
    // jump clip timeline
    if (this.jumpT >= 0) {
      const prev = this.jumpT; this.jumpT += dt;
      if (this.jumpLaunch && this.jumpT >= 0.44) { this.jumpLaunch = false; this.air = true; this.vy = JUMP_V; this.speed = Math.max(this.speed, 2.5); this.hoofAll(0.6); }
      if (this.air && this.jumpT > 1.12) this.jumpT = 1.12;                // hold the descending pose until we land
      if (!this.air && !this.jumpLaunch && prev < 1.17 && this.jumpT > 1.0 && this.jumpT < 1.17) this.jumpT = 1.17;
      this.jumpW = Math.min(1, this.jumpW + dt * 10);
      if (this.jumpT > 1.4) { this.jumpT = -1; }
    } else this.jumpW = Math.max(0, this.jumpW - dt * 6);
    if (!near) return;
    const v = this.speed; gaitWeights(v, this.gw);
    // turning on the spot uses a slow walk
    if (Math.abs(v) < 0.3 && Math.abs(this.turnRate) > 0.25) { this.gw.walk = Math.max(this.gw.walk, 0.8); }
    let cad = 0, wsum = 0; for (const k of ['walk', 'trot', 'canter', 'gallop']) { cad += this.gw[k] * CAD[k](Math.abs(v)); wsum += this.gw[k]; }
    cad = wsum > 0 ? cad / wsum : 0;
    if (Math.abs(v) < 0.3 && Math.abs(this.turnRate) > 0.25) cad = Math.max(cad, 0.7);
    this.lookT = clamp(this.turnRate * 0.5, -0.6, 0.6); this.look += (this.lookT - this.look) * Math.min(1, dt * 4);
    const phase0 = r.phase;
    r.animate(dt, { gaitW: this.gw, cadence: cad, dir: v < -0.05 ? -1 : 1, idleKind: this.state === 'ridden' ? 'idle' : this.idleKind, jumpT: this.jumpT, jumpW: this.jumpW, look: this.look });
    // hoof falls from the dominant gait
    if (!this.air && this.jumpT < 0 && wsum > 0.2) {
      let gk = 'walk', gbest = 0; for (const k of ['walk', 'trot', 'canter', 'gallop']) if (this.gw[k] > gbest) { gbest = this.gw[k]; gk = k; }
      const td = GAITS[gk].td; const a = phase0, b = r.phase;
      for (const leg in td) { const t = td[leg]; const crossed = v >= 0 ? (a <= b ? a < t && t <= b : t > a || t <= b) : (b <= a ? b < t && t <= a : t > b || t <= a); if (crossed) this.hoof(leg, wsum); }
    }
  }
  // ---------- rider
  pose(av, dt) {
    const r = this.rig; if (!r) return; const P = av.p;
    r.root.updateMatrixWorld(true);
    const seat = r.boneWorld('Torso2', r.seat, this.tmp);
    // horse body orientation for the rider (yaw + slope pitch + lean)
    this.e.set(this.pitch * 0.85, this.yaw, this.roll * 0.6, 'YXZ'); av.root.quaternion.setFromEuler(this.e);
    const m = this.mountT > 0 ? 1 - this.mountT / 0.65 : 1; const e = m * m * (3 - 2 * m);
    const g = this.gw; const gal = g.gallop + g.canter * 0.35, trot = g.trot;
    // two-point seat at the gallop, rising trot, otherwise sit deep
    const post = trot * Math.max(0, Math.sin(r.phase * Math.PI * 4)) * 0.07;
    const lift = gal * 0.07 + post;
    const hipOff = this.tmp2.set(0, 0.94, 0.05 * gal).applyQuaternion(av.root.quaternion);
    const seated = seat.clone().sub(hipOff); seated.y += lift;
    if (m < 1) { // mounting: rise from where the rider stood into the saddle with a little hop
      const start = this.mountFrom || seated; av.root.position.lerpVectors(start, seated, e); av.root.position.y += Math.sin(m * Math.PI) * 0.35;
    } else av.root.position.copy(seated);
    P.hips.position.set(0, 0.94, 0.05 * gal);
    const lean = 0.08 + 0.42 * gal + 0.1 * trot - this.pitch * 0.6;
    P.hips.rotation.set(0, 0, 0);
    P.spine.rotation.set((-lean) * e, 0, -this.roll * 0.5);
    P.neck.rotation.set(0, 0, 0); P.head.rotation.set((lean * 0.8 + 0.05) * e, this.look * 0.5, 0);
    // (avatar faces -z: +x rotation swings a limb forward)
    for (const sd of [-1, 1]) {
      // legs straddle the barrel, knees bent, heels down in the stirrups
      const hip = (1.05 + 0.3 * gal) * e, knee = -(1.4 + 0.35 * gal) * e;
      P['hip' + sd].rotation.set(hip, 0, sd * 0.56 * e);           // thighs wrap the barrel (knees clear the flaps)
      P['kn' + sd].rotation.set(knee, 0, -sd * 0.42 * e);          // lower legs hang close to the horse's sides
      P['ft' + sd].rotation.set(-(hip + knee) + 0.12 * e, 0, 0);
      // hands forward and low over the withers, holding the reins
      P['sh' + sd].rotation.set((0.42 + 0.75 * gal) * e, 0, -sd * 0.16 * e);
      P['el' + sd].rotation.set((0.95 - 0.35 * gal) * e, 0, 0);
    }
    av.root.updateMatrixWorld(true);
  }
  _hand(av, sd, out) { const el = av.p['el' + sd]; return out.set(0, -0.3, 0).applyMatrix4(el.matrixWorld); }
  _foot(av, sd, out) { const ft = av.p['ft' + sd]; return out.set(0, -0.05, -0.02).applyMatrix4(ft.matrixWorld); }
  // reins: bit -> hands (ridden) or bit -> withers (loose); stirrups hang from the saddle or carry the rider's feet
  tack(av, ridden, dt) {
    const r = this.rig; if (!r || !this.reins) return;
    r.root.updateMatrixWorld(true);
    const bL = r.boneWorld('Head', r.bit[0], new THREE.Vector3()), bR = r.boneWorld('Head', r.bit[1], new THREE.Vector3());
    let hL, hR; if (ridden && this.mountT <= 0) { hL = this._hand(av, -1, new THREE.Vector3()); hR = this._hand(av, 1, new THREE.Vector3()); } else { const w = r.boneWorld('Torso3', r.withers, new THREE.Vector3()); hL = w.clone(); hR = w.clone(); }
    // each rein runs from its bit ring along the side of the neck to the hand (quadratic curve bowed outward and down)
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw); const P = this.reinPts; const half = (P.length - 1) / 2; const c = new THREE.Vector3();
    for (const [b, h, sd, i0] of [[bL, hL, -1, 0], [bR, hR, 1, half]]) {
      c.lerpVectors(b, h, 0.5); c.x += rx * sd * 0.15; c.z += rz * sd * 0.15; c.y -= ridden ? 0.05 : 0.1;
      for (let i = 0; i <= half; i++) { const t = sd < 0 ? i / half : 1 - i / half; const u = 1 - t; const q = P[i0 + i]; q.set(u * u * b.x + 2 * u * t * c.x + t * t * h.x, u * u * b.y + 2 * u * t * c.y + t * t * h.y, u * u * b.z + 2 * u * t * c.z + t * t * h.z); }
    }
    this._tube(this.reins, P, 0.016);
    // lead rope to the rail while tied at the hitch
    const tied = this.state === 'parked' && Math.hypot(this.pos.x - (HITCH.x - 1.75), this.pos.z - HITCH.z) < 0.6;
    this.rope.visible = tied;
    if (tied) { const a = new THREE.Vector3().lerpVectors(bL, bR, 0.5); a.y -= 0.05; const b = new THREE.Vector3(HITCH.x, this.railY, HITCH.z + 0.1); for (let i = 0; i < this.ropePts.length; i++) { const t = i / (this.ropePts.length - 1); this.ropePts[i].lerpVectors(a, b, t); this.ropePts[i].y -= Math.sin(t * Math.PI) * 0.25; } this._tube(this.rope, this.ropePts, 0.012); }
    // stirrups
    for (let i = 0; i < 2; i++) {
      const top = r.boneWorld('Torso2', r.stirrupTop[i], new THREE.Vector3()); let bot;
      if (ridden && this.mountT <= 0) { bot = this._foot(av, i === 0 ? 1 : -1, new THREE.Vector3()); bot.y += 0.13; } else bot = top.clone().add(new THREE.Vector3(0, -0.5, 0));
      const lp = this.leatherPts; lp[i * 2].copy(top); lp[i * 2 + 1].copy(bot);
      const st = this.stirrups[i]; st.position.copy(bot); st.rotation.set(0, this.yaw, 0);
    }
    this._strips(this.leathers, this.leatherPts);
  }
  setVisible(v) { if (!this.rig) return; this.rig.root.visible = v; for (const o of [this.reins, this.leathers, ...this.stirrups]) o.visible = v; if (!v) this.rope.visible = false; }
  // ---------- sounds (procedural, via the game's AudioContext)
  _ac() { const a = this.ctx.audio; return a && a.ctx && a.started ? a : null; }
  _gainAt(x, z) { const c = this.player.camera.position; const d = Math.hypot(x - c.x, z - c.z); return Math.min(1, 12 / Math.max(6, d)); }
  hoof(leg, w = 1) {
    const a = this._ac(); if (!a) return; const r = this.rig;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw); const front = leg[0] === 'F' ? 0.75 : -0.75;
    const x = this.pos.x + fx * front, z = this.pos.z + fz * front; const kind = this.surface(x, z);
    const vol = (0.35 + Math.min(1, Math.abs(this.speed) / 9) * 0.65) * w * this._gainAt(x, z);
    const c = a.ctx, t = c.currentTime + Math.random() * 0.006; const out = c.createGain(); out.gain.value = vol; out.connect(a.master);
    const pan = c.createStereoPanner ? c.createStereoPanner() : null; if (pan) { pan.pan.value = leg[1] === 'L' ? -0.18 : 0.18; out.disconnect(); out.connect(pan).connect(a.master); }
    if (kind === 'stone' || kind === 'road') {
      // clip-clop: bright click + hollow resonant knock
      const s = c.createBufferSource(); s.buffer = a.white; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = kind === 'road' ? 2600 : 3400; bp.Q.value = 1.2;
      const g = c.createGain(); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03); s.connect(bp).connect(g).connect(out); s.start(t, Math.random() * 1.5, 0.05);
      const s2 = c.createBufferSource(); s2.buffer = a.white; const r2 = c.createBiquadFilter(); r2.type = 'bandpass'; r2.frequency.value = (kind === 'road' ? 620 : 820) * (0.9 + Math.random() * 0.25) * (leg[0] === 'F' ? 1.08 : 1); r2.Q.value = 9;
      const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(1.4, t + 0.003); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.11); s2.connect(r2).connect(g2).connect(out); s2.start(t, Math.random() * 1.5, 0.14);
    } else {
      // turf / dirt: dull low thud plus a little rustle
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(kind === 'grass' ? 95 : 120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'grass' ? 0.5 : 0.55, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13); o.connect(g).connect(out); o.start(t); o.stop(t + 0.15);
      const s = c.createBufferSource(); s.buffer = a.brown; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'grass' ? 380 : 700;
      const g2 = c.createGain(); g2.gain.setValueAtTime(0.5, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); s.connect(lp).connect(g2).connect(out); s.start(t, Math.random() * 1.5, 0.14);
      const s3 = c.createBufferSource(); s3.buffer = a.white; const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = kind === 'grass' ? 2400 : 1500; hp.Q.value = 0.8;
      const g3 = c.createGain(); g3.gain.setValueAtTime(kind === 'grass' ? 0.035 : 0.06, t + 0.005); g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); s3.connect(hp).connect(g3).connect(out); s3.start(t, Math.random() * 1.5, 0.1);
    }
    this.lastSurface = kind;
  }
  hoofAll(w) { for (const l of ['HL', 'HR', 'FL', 'FR']) this.hoof(l, w); }
  snort(vol = 0.5) {
    const a = this._ac(); if (!a) return; const c = a.ctx, t = c.currentTime; const g0 = this._gainAt(this.pos.x, this.pos.z);
    const s = c.createBufferSource(); s.buffer = a.white; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5; bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(1300, t + 0.12); bp.frequency.exponentialRampToValueAtTime(700, t + 0.45);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * vol * g0, t + 0.04); g.gain.setValueAtTime(0.3 * vol * g0, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    const lfo = c.createOscillator(); lfo.frequency.value = 28; const lg = c.createGain(); lg.gain.value = 0.12 * vol * g0; lfo.connect(lg).connect(g.gain); lfo.start(t); lfo.stop(t + 0.5);
    s.connect(bp).connect(g).connect(a.master); s.start(t, Math.random(), 0.55);
  }
  whistle() {
    const a = this._ac(); if (!a) return; const c = a.ctx, t = c.currentTime; const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(2500, t + 0.16); o.frequency.setValueAtTime(2500, t + 0.24); o.frequency.exponentialRampToValueAtTime(1700, t + 0.5);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.03); g.gain.setValueAtTime(0.08, t + 0.16); g.gain.linearRampToValueAtTime(0.02, t + 0.22); g.gain.linearRampToValueAtTime(0.08, t + 0.27); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g).connect(a.master); o.start(t); o.stop(t + 0.6);
  }
}

export function install(player, ctx) {
  if (new URLSearchParams(location.search).has('nohorse')) return null;   // A/B and perf comparisons
  const H = new Horse(player, ctx);
  if (window.BSIM) window.BSIM.horse = H; // debug / QA hook
  let savedDist = null;
  // lazy-load the model shortly after start (or immediately when first called)
  setTimeout(() => H.ensure(), 2500);
  // E at the horse mounts it
  const prevInteract = player.onInteract;
  player.onInteract = (it) => { if (it && it.horse) { if (player.mode !== 'horse') player.setMode('horse'); return; } prevInteract && prevInteract(it); };
  player.registerMode('horse', {
    key: KEY, label: 'Horse', icon: ICON, hint: 'W ride · Shift gallop · C walk · Space jump · Y dismount',
    canEnter(p) {
      if (!H.rig) { H.ensure(); H.pendingSummon = true; return false; }
      if (H.canMount()) return true;
      if (H.state !== 'coming') H.summon();                     // whistle: the horse comes to you, then you mount automatically
      return false;
    },
    enter(p) {
      H.state = 'ridden'; H.untie(); H.mountT = 0.65; H.mountFrom = p.pos.clone(); H.speed = 0; H.turnRate = 0;
      p.vel.set(0, 0, 0); p.onGround = true; savedDist = p.camDistT; p.camDistT = Math.max(p.camDistT, 6.2);
      H.setInteraction(false); H.snort(0.4);
    },
    exit(p, next) {
      H.state = 'parked'; H.idleKind = 'idle'; H.idleTimer = 4; H.jumpT = -1; H.jumpW = 0; H.air = false; H.vy = 0;
      // slide off on the near (left) side; fall back to the right side or straight behind if blocked
      const lx = -Math.cos(H.yaw), lz = Math.sin(H.yaw);
      let spot = null; for (const s of [1, -1]) { const x = H.pos.x + lx * s * 1.1, z = H.pos.z + lz * s * 1.1; const gy = H.ph.groundAt(x, z, H.pos.y + 1).y; if (!H.ph.resolve(x, z, 0.35, gy, 1.7)[2] && Math.abs(gy - H.pos.y) < 1.2) { spot = [x, gy, z]; break; } }
      if (!spot) spot = [H.pos.x + Math.sin(H.yaw) * 1.8, H.pos.y, H.pos.z + Math.cos(H.yaw) * 1.8];
      p.pos.set(spot[0], spot[1] + 0.9, spot[2]); p.vel.set(0, 0, 0); p.onGround = false; p.yaw = H.yaw;
      if (savedDist != null) p.camDistT = savedDist;
      H.speed = Math.min(H.speed, 3);
    },
    update(p, dt, inp, fwd, right) {
      H.ride(dt, inp, fwd, right); H.setVisible(true); H.animate(dt, true); H._place(dt);
      p.pos.set(H.pos.x, H.pos.y + RIDE_LIFT, H.pos.z); p.vel.set(-Math.sin(H.yaw) * H.speed, H.vy, -Math.cos(H.yaw) * H.speed); p.yaw = H.yaw; p.onGround = !H.air;
      p.surface = null;
      return Math.abs(H.speed);
    },
    always(p, dt) {
      if (!H.rig) { if (H.pendingSummon && H.loading) { H.loading.then(() => { if (H.pendingSummon) { H.pendingSummon = false; if (H.canMount()) p.setMode('horse'); else H.summon(); } }); H.pendingSummon = 'wait'; } return; }
      const c = p.camera.position; const d = Math.hypot(H.pos.x - c.x, H.pos.z - c.z);
      if (p.mode === 'horse') return;                          // ridden: driven from update() so the rider never lags
      H.idle(dt);
      const near = d < 140; H.setVisible(near);
      H.animate(dt, near); H._place(dt);
      if (near) H.tack(p.avatar, false, dt);
      H.inter.pos[0] = H.pos.x; H.inter.pos[1] = H.pos.y; H.inter.pos[2] = H.pos.z;
      H.setInteraction(H.state === 'parked');
    },
    pose(p, av, dt) { H.pose(av, dt); H.tack(av, true, dt); av.root.visible = p.view === 'third'; },
    onKey(e, p) { if (e.code === 'KeyE' && !e.repeat && p.mode === 'horse' && !p.activeInteraction && H.mountT <= 0) p.setMode('walk'); },
  });
  return H;
}
