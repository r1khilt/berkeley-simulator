// Grappling hook (Spider-Man / Just Cause style), as a movement plugin.
//  Aim with the crosshair, hold Q or the right mouse button to fire, let go of it to release.
//  While attached: pendulum swing; hold Space or Shift to reel in, C to let rope out, W A S D to steer and pump.
//  Momentum carries after release. Usable while walking, falling, on the bike and in other plugin modes (a plugin can
//  opt out with `grapple: false`); not in drone flight.
//  Cost when idle: one coarse ray cast per frame for the crosshair (tens of microseconds); meshes are only ray cast on fire.
import * as THREE from 'three';
import { GrappleWorld } from './grapple-world.js';
import { U } from '../../materials.js';

const RANGE = 120;        // max hook distance (m)
const MIN_HOOK = 2.5;     // ignore targets closer than this
const HOOK_SPEED = 260;   // hook flight speed (m/s)
const GRAV = 21;          // swing gravity (walk mode uses 22)
const REEL = 17;          // reel-in speed (m/s)
const TUG = 24;           // automatic take-up right after attaching (m/s)
const PAYOUT = 9;         // let-out speed (m/s)
const MIN_LEN = 1.6;      // shortest rope
const SWING_ACC = 9;      // steer / pump while attached (m/s²)
const FLY_ACC = 4;        // steer while flying free
const MAX_SPEED = 44;
const AIM_Y = 0.17;        // reticle height above screen centre in third person (NDC)
const R = 0.32, H = 1.7, BODY = 1.05; // collision radius, body height, rope attachment height above the feet
const UP = new THREE.Vector3(0, 1, 0);
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();

const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v9"/><path d="M12 12c0 4-3 6-6 5"/><path d="M12 12c0 4 3 6 6 5"/><path d="M12 12v4"/><circle cx="12" cy="3" r="1"/><path d="M4 21c4-2 12-2 16 0" opacity=".5"/></svg>';

export function install(player, ctx) {
  const g = new Grapple(player, ctx);
  player.registerMode('grapple', g.plugin);
  if (window.BSIM) window.BSIM.grapple = g; // QA / debugging handle
  return g;
}

class Grapple {
  constructor(player, ctx) {
    this.p = player; this.ctx = ctx; this.ph = ctx.physics; this.world = null;
    this.state = 'idle';     // idle | flying (hook in the air) | attached | retract
    this.sub = null;         // swing state while player.mode === 'grapple': 'swing' | 'fly'
    this.anchor = new THREE.Vector3(); this.anchorN = new THREE.Vector3(0, 1, 0); this.anchorTag = null;
    this.target = null;      // where the flying hook is going {p, n, tag} or null (miss)
    this.tip = new THREE.Vector3(); this.tipFrom = new THREE.Vector3(); this.hookDist = 0; this.hookTravel = 0;
    this.len = 0; this.lenTarget = 0; this.reelRate = 0; this.taut = false; this.grounded = false;
    this.qHeld = false; this.mHeld = false; this.allowEnter = false; this.prevMode = 'walk';
    this.aim = { ok: false, hit: null }; this.camK = 0; this.userDist = null; this.lastSetDist = null; this.frustFov = 0; this.fovActive = false;
    this.perch = null; this.perchOff = 0; this.safeT = 0; this.slideT = 0; this.wallN = new THREE.Vector3(); this.wallT = 9; this.lastPos = new THREE.Vector3(); this.speed = 0; this.wave = 0; this.retractT = 0;
    this.stats = { coarseMs: 0, refineMs: 0, fires: 0, attaches: 0, rescues: 0, slides: 0 };
    this._o = new THREE.Vector3(); this._d = new THREE.Vector3();
    this._buildVisuals();
    this._bindInput();
    const self = this;
    this.plugin = {
      label: 'Grappling hook', icon: ICON, hint: 'Hold Q or right mouse to swing · Space reel in · C let out',
      tool: true, // r5-controls: an always-on ability, so the HUD lists it under Controls instead of as a mode (keeps number keys 1-6 for modes)
      // player.js toggles a plugin's mode when its key is pressed. The hook fires from onKey instead: the toggle into
      // 'grapple' is refused by canEnter, and while swinging the key reads as undefined for the length of that one key
      // event, so Q re-fires mid-air instead of dropping you into walk mode. Everyone else always sees 'KeyQ'.
      get key() { return self._suppressKey ? undefined : 'KeyQ'; },
      canEnter: () => self.allowEnter,
      enter: (p) => self._enter(p),
      exit: (p, next) => self._exit(p, next),
      update: (p, dt, inp, fwd, right) => self._update(p, dt, inp, fwd, right),
      always: (p, dt, inp, fwd, right) => self._always(p, dt, inp, fwd, right),
      pose: (p, av, dt) => self._pose(p, av, dt),
      onKey: (e, p) => {
        if (e.code !== 'KeyQ') return;
        self._suppressKey = false;
        // fallback for key events aimed straight at window (the capture listener can't run first): undo the toggle
        if (self._exitEvt === e && p.mode === 'walk' && self._exitSub) { const prev = self.prevMode, sub = self._exitSub; self.allowEnter = true; p.setMode('grapple'); self.allowEnter = false; self.prevMode = prev; self.sub = sub; }
        if (!e.repeat) { self.qHeld = true; self.fire(); }
      },
      onMouse: (e, p, down) => {
        if (e.button !== 2) return;
        if (down) { if (document.pointerLockElement !== p.dom && e.target !== p.dom) return; self.mHeld = true; self.fire(); }
        else { self.mHeld = false; self._checkRelease(); }
      },
    };
  }
  // ------------------------------------------------------------------ input
  _bindInput() {
    addEventListener('keydown', (e) => { this._suppressKey = e.code === 'KeyQ' && this.p.mode === 'grapple'; if (this._suppressKey) setTimeout(() => { this._suppressKey = false; }, 0); }, { capture: true });
    addEventListener('keyup', (e) => { if (e.code === 'KeyQ') { this.qHeld = false; this._checkRelease(); } });
    addEventListener('blur', () => { this.qHeld = this.mHeld = false; this._checkRelease(); });
    this.p.dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  get held() { return this.qHeld || this.mHeld; }
  _checkRelease() { if (!this.held) this.release(); }
  usable() {
    const p = this.p; if (!p.enabled || p.mode === 'fly') return false;
    const pl = p.plugins[p.mode]; if (pl && pl !== this.plugin && pl.grapple === false) return false;
    return true;
  }
  // ------------------------------------------------------------------ aiming
  _initWorld() { if (!this.world) this.world = new GrappleWorld({ physics: this.ph, scene: this.ctx.scene, lm: window.BSIM && window.BSIM.lm }); }
  // camera-centre ray, starting level with the player so nothing between the camera and the player is hit
  _aimRay(o, d) {
    // third person: the camera looks at the player's head, so the reticle sits a little above it (AIM_Y in NDC)
    const cam = this.ctx.camera, k = this.p.view === 'first' ? 0 : AIM_Y * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    o.copy(cam.position); d.set(0, k, -1).applyQuaternion(cam.quaternion).normalize();
    const p = this.p; v1.set(p.pos.x, p.pos.y + 1.4, p.pos.z).sub(o);
    return Math.max(0, v1.dot(d) - 0.3);
  }
  _handGuess(out) { // where the rope leaves the player (exact hand after pose; this is the cheap estimate)
    const p = this.p; if (p.view === 'first') return out.copy(this.ctx.camera.position).addScaledVector(v3.set(0, -1, 0), 0.35);
    return out.set(p.pos.x, p.pos.y + 1.45, p.pos.z);
  }
  // coarse target under the crosshair (collision data + terrain), or null. With assist, a few nearby directions are tried
  // too (building edges just above the crosshair). Leaves the ray actually used in this._o / this._d.
  coarseTarget(assist) {
    this._initWorld(); this.world.sync();
    const o = this._o, d = this._d; const t0 = this._aimRay(o, d), t1 = t0 + RANGE + 4; this._t0 = t0; this._t1 = t1;
    const ts = performance.now();
    let hit = this.world.castCoarse(o, d, t0, t1);
    if (hit && !this._inRange(hit.p)) hit = null;
    if (!hit && assist) {
      const base = d.clone(), side = v3.crossVectors(base, UP).normalize();
      for (const [a, b] of [[0.035, 0], [0.07, 0], [0.035, 0.045], [0.035, -0.045], [0.11, 0]]) {
        d.copy(base).addScaledVector(UP, a).addScaledVector(side, b).normalize();
        hit = this.world.castCoarse(o, d, t0, t1); if (hit && this._inRange(hit.p)) break; hit = null;
      }
      if (!hit) d.copy(base);
    }
    this.stats.coarseMs = performance.now() - ts;
    return hit;
  }
  _inRange(p) { const f = this._handGuess(v2); const dd = Math.hypot(p[0] - f.x, p[1] - f.y, p[2] - f.z); return dd >= MIN_HOOK && dd <= RANGE; }
  // ------------------------------------------------------------------ fire / attach / release
  fire() {
    if (!this.usable()) return false;
    const hit = this.coarseTarget(true); this.stats.fires++;
    const o = this._o, d = this._d, from = this._handGuess(v2);
    this.tipFrom.copy(from); this.tip.copy(from);
    this.coarse = hit;
    this.missEnd = o.clone().addScaledVector(d, this._t0 + RANGE * 0.85);
    this.target = hit ? { p: new THREE.Vector3(...hit.p), n: new THREE.Vector3(...hit.n), tag: hit.tag, kind: hit.kind } : null;
    // exact surface: refined over the next few frames while the hook flies (nearest meshes first)
    this.job = this.world.startRefine(o, d, this._t0, hit ? Math.min(this._t1, hit.t + 12) : this._t1);
    this._retarget();
    this.hookTravel = 0; this.wave = 1;
    if (this.state === 'attached' && this.p.mode === 'grapple') this.sub = 'fly'; // re-fire mid-swing: let go of the old anchor
    this.state = 'flying';
    this._sfx('fire');
    return !!hit;
  }
  _retarget() { this.hookDist = Math.max(0.01, (this.target ? this.target.p : this.missEnd).distanceTo(this.tipFrom)); }
  _finishRefine() {
    const job = this.job, fine = this.world.result(job), hit = this.coarse; this.stats.refineMs += job.ms; this.job = null;
    // the visible surface wins when it is in front of (or within 12 m behind) the collider we hit
    if (fine && this._inRange(fine.p) && (!hit || job.magnet || fine.t < hit.t + 12)) {
      this.target = { p: new THREE.Vector3(...fine.p), n: new THREE.Vector3(...fine.n), tag: hit && (job.magnet || fine.t > hit.t - 1) ? hit.tag : 'mesh', kind: 'mesh' };
      this._retarget(); return;
    }
    // a landmark's collision box is often bigger than its visible shape (spires, towers): look sideways for the surface
    if (!job.magnet && hit && typeof hit.tag === 'string' && hit.tag.startsWith('lm:')) {
      const l = this.world.lm && this.world.lm.byId.get(hit.tag.slice(3)); if (!l || !l.obj) return;
      const o = new THREE.Vector3(...hit.p), d = new THREE.Vector3(l.anchor.x - o.x, 0, l.anchor.z - o.z); if (d.lengthSq() < 0.01) return;
      d.normalize(); o.addScaledVector(d, -0.3);
      this.job = this.world.startRefine(o, d, 0, 9); this.job.magnet = true;
    }
  }
  _attach() {
    const p = this.p, t = this.target;
    this.anchor.copy(t.p); this.anchorN.copy(t.n); this.anchorTag = t.tag; this.tip.copy(t.p);
    this.state = 'attached'; this.stats.attaches++;
    const body = v1.set(p.pos.x, p.pos.y + BODY, p.pos.z), dist = body.distanceTo(this.anchor);
    this.len = Math.max(MIN_LEN, dist);
    // automatic take-up so the arc clears the ground below the anchor (no dragging along the street)
    const gBelow = Math.max(this.ph.groundAt(this.anchor.x, this.anchor.z, this.anchor.y - 0.3).y, this.ph.heightAt(this.anchor.x, this.anchor.z));
    const clear = this.anchor.y - gBelow - BODY - 0.9;
    this.lenTarget = this.anchor.y > body.y ? Math.max(MIN_LEN, Math.min(this.len, clear)) : this.len;
    if (p.mode !== 'grapple') {
      this.prevMode = p.mode;
      if (p.onGround && this.anchor.y > p.pos.y + 1.5) p.vel.y = Math.max(p.vel.y, 5.5); // hop off the ground
      this.allowEnter = true; const ok = p.setMode('grapple'); this.allowEnter = false;
      if (ok === false || p.mode !== 'grapple') { this.state = 'retract'; this.retractT = 0; return; }
    }
    this.sub = 'swing'; this.grounded = false; this.slideT = 0;
    this._sfx('attach');
  }
  release() {
    if (this.state === 'flying') { this.state = 'retract'; this.retractT = 0; this.job = null; return; }
    if (this.state !== 'attached') return;
    const p = this.p; this.state = 'retract'; this.retractT = 0; this.wave = 1;
    if (p.mode === 'grapple') {
      this.sub = 'fly';
      // let go while against a wall: kick off it (keeps chains going instead of sliding down the facade)
      if (this.wallT < 0.25 && !this.grounded) { p.vel.x += this.wallN.x * 6.5; p.vel.z += this.wallN.z * 6.5; p.vel.y = Math.max(p.vel.y, 0) + 5; }
      // a little lift on release makes chaining swings easier; momentum is otherwise kept as-is
      else if (!this.grounded && p.vel.y > -6 && p.vel.length() > 6) p.vel.y += 2.2;
    }
    this._sfx('release');
  }
  // ------------------------------------------------------------------ mode hooks
  _enter(p) { this.sub = 'swing'; this.lastPos.copy(p.pos); if (this.userDist == null) { this.userDist = p.camDistT; this.lastSetDist = null; } }
  _exit(p, next) {
    if (next === 'grapple') return;
    const ev = window.event; this._exitEvt = ev && ev.type === 'keydown' && ev.code === 'KeyQ' ? ev : null; this._exitSub = this.sub;
    if (this.state === 'attached' || this.state === 'flying') { this.state = 'retract'; this.retractT = 0; this.job = null; }
    this.sub = null; this.grounded = false; this.safeT = 4; p.bike.root.visible = next === 'bike';
    if (this.avTilt) { p.avatar.root.quaternion.identity(); this.avTilt = false; }
  }
  _land(onRoof) {
    const p = this.p; let next = this.prevMode || 'walk';
    if (onRoof) { this._perchOn(onRoof); if (next !== 'walk' && next !== 'bike') next = 'walk'; }
    if (next === 'grapple' || next === 'fly') next = 'walk';
    const ok = p.setMode(next); if (ok === false || p.mode === 'grapple') p.setMode('walk');
    p.onGround = true;
  }
  // a roof we landed on becomes a temporary walkable so the normal walk / bike modes can use it. Neighbouring roofs at a
  // similar height (row houses, wings of the same landmark) join in, so you can walk across them.
  _perchOn(pr) {
    if (this.perch && this.perch.members.includes(pr)) return;
    this._unperch();
    const world = this.world, members = [pr], b = [pr.b[0] - 30, pr.b[1] - 30, pr.b[2] + 30, pr.b[3] + 30], seen = new Set([pr]);
    for (let i = Math.floor(b[0] / 16); i <= Math.floor(b[2] / 16); i++) for (let j = Math.floor(b[1] / 16); j <= Math.floor(b[3] / 16); j++) {
      const l = world.pgrid.get(i * 73856093 ^ j * 19349663); if (!l) continue;
      for (const id of l) { const q = world.prisms[id]; if (seen.has(q)) continue; seen.add(q);
        if (!q.solid || !world.alive(q) || Math.abs(q.y1 - pr.y1) > 4 || (q.lm && q.tag !== pr.tag)) continue;
        if (q.b[2] < b[0] || q.b[0] > b[2] || q.b[3] < b[1] || q.b[1] > b[3]) continue; members.push(q); }
    }
    const bb = [1e9, 1e9, -1e9, -1e9]; for (const m of members) { bb[0] = Math.min(bb[0], m.b[0]); bb[1] = Math.min(bb[1], m.b[1]); bb[2] = Math.max(bb[2], m.b[2]); bb[3] = Math.max(bb[3], m.b[3]); }
    const w = { type: 'fn', tag: 'grapple-perch', bounds: bb, heightAt: (x, z) => { let y = null; for (const m of members) if (world.alive(m) && (y === null || m.y1 > y) && world.inside(m, x, z)) y = m.y1; return y; } };
    this.ph.addWalkable(w); this.perch = { pr, w, members }; this.perchOff = 0;
  }
  _unperch() { if (this.perch) { this.perch.w.dead = true; this.perch = null; } }
  // ------------------------------------------------------------------ per-frame (every mode)
  _always(p, dt, inp) {
    this._initWorld();
    const usable = this.usable();
    // crosshair: a cheap coarse cast every other frame while the hook is usable and not already out
    this._frame = (this._frame || 0) + 1;
    if (usable && this.state !== 'attached' && this.state !== 'flying') { if (this._frame % 2 === 0) { const h = this.coarseTarget(false); this.aim.ok = !!h; this.aim.hit = h; } }
    else if (!usable) this.aim.ok = false;
    this._reticle(usable);
    if (!this.world.warmDone && this.state === 'idle') this.world.warm();
    // exact target refine, a couple of milliseconds per frame
    if (this.job) { this.world.stepRefine(this.job, 2); if (this.job.done) this._finishRefine(); }
    // the hook in flight
    if (this.state === 'flying') {
      this.hookTravel += HOOK_SPEED * dt;
      const end = this.target ? this.target.p : this.missEnd;
      const k = Math.min(1, this.hookTravel / this.hookDist);
      this.tip.copy(this.tipFrom).lerp(end, k);
      if (k >= 1 && !this.job) {
        if (this.target && this.held && this.usable()) this._attach();
        else { this.state = 'retract'; this.retractT = 0; }
      }
    }
    if (this.state === 'retract') { this.retractT += dt; if (this.retractT > 0.22) this.state = 'idle'; }
    this.wave = Math.max(0, this.wave - dt * 3);
    // camera feel: pull back and widen a touch with speed while swinging
    const sw = p.mode === 'grapple';
    this.camK += ((sw ? 1 : 0) - this.camK) * Math.min(1, dt * (sw ? 3 : 2));
    this._cameraFeel(p, dt);
    // perch bookkeeping + safety net after swinging
    if (this.perch) {
      const pr = this.perch.pr, on = this.perch.members.some((m) => this.world.inside(m, p.pos.x, p.pos.z) && p.pos.y > m.y1 - 1.5);
      this.perchOff = on ? 0 : this.perchOff + dt;
      if (on) this.safeT = Math.max(this.safeT, 1);
      if (!this.world.alive(pr)) { // the roof's building was swapped for its landmark model: stand on whatever is there now
        this._unperch(); const top = on && this.world.topIn(p.pos.x, p.pos.z, p.pos.y - 25, p.pos.y + 1.5);
        if (top) { p.pos.y = Math.max(p.pos.y, top.y1); this._perchOn(top); } this.safeT = 4;
      } else if (this.perchOff > 0.6) this._unperch();
    }
    if (this.safeT > 0) { this.safeT -= dt; if (p.mode !== 'fly' && p.mode !== 'grapple') this._unstick(p); }
    if (this.state === 'idle' && p.mode !== 'grapple') { this.rope.visible = false; this.hookMesh.visible = false; if (this.windG) this._wind(0); }
    else if (p.mode !== 'grapple') this._drawRope(p, null);
  }
  // ------------------------------------------------------------------ swing state
  _update(p, dt, inp, fwd, right) {
    const v = p.vel, pos = p.pos;
    p.jumpReq = false; // Space reels in while swinging
    if (pos.distanceToSquared(this.lastPos) > 900) { if (this.state === 'attached') { this.state = 'retract'; this.retractT = 0; } this.sub = 'fly'; } // teleported
    const attached = this.state === 'attached' && this.sub === 'swing';
    if (!attached && this.sub === 'swing') this.sub = 'fly';
    // steering / pumping
    const acc = attached ? SWING_ACC : FLY_ACC;
    v.x += (fwd.x * inp.f + right.x * inp.s) * acc * dt; v.z += (fwd.z * inp.f + right.z * inp.s) * acc * dt;
    v.y -= GRAV * dt * (attached && this.taut && this.reelRate > 0 ? 0.35 : 1);
    if (this.grounded) { const f = Math.max(0, 1 - dt * (attached && this.taut ? 1.5 : 7)); v.x *= f; v.z *= f; }
    const sp0 = v.length(); if (sp0 > 1) v.multiplyScalar(Math.max(0.5, 1 - (0.0011 * sp0 + Math.max(0, sp0 - 32) * 0.03) * dt)); // air drag, firmer past ~32 m/s
    const sp1 = v.length(); if (sp1 > MAX_SPEED) v.multiplyScalar(MAX_SPEED / sp1);
    // rope length (reelRate = how fast it actually shortens; the constraint turns that into inward speed)
    this.reelRate = 0;
    if (attached) {
      const reel = inp.up || inp.sprint, len0 = this.len;
      if (reel) { this.len = Math.max(MIN_LEN, this.len - REEL * dt); this.lenTarget = Math.min(this.lenTarget, this.len); }
      else if (inp.down) { this.len = Math.min(RANGE, this.len + PAYOUT * dt); this.lenTarget = Math.max(this.lenTarget, this.len); }
      if (this.lenTarget < this.len - 0.01) this.len = Math.max(this.lenTarget, this.len - TUG * dt);
      const dist = v1.set(pos.x, pos.y + BODY, pos.z).distanceTo(this.anchor);
      if (this.blocked && this.len < dist - 0.05) this.len = dist - 0.05; // pinned against a wall: don't keep hauling into it
      this.reelRate = Math.max(0, (len0 - this.len) / dt); // active pull only (not the slack take-up below)
      if (dist + 1.2 < this.len) this.len = dist + 1.2; // take up slack
      // vault: reeled right up to a ledge -> pop over onto the roof
      if (reel && dist < 2.4) { const roof = this.world.topIn(this.anchor.x - this.anchorN.x * 0.6, this.anchor.z - this.anchorN.z * 0.6, this.anchor.y - 0.8, this.anchor.y + 2.6); if (roof) { v.y = Math.max(v.y, 7.5); v.x = -this.anchorN.x * 3.5; v.z = -this.anchorN.z * 3.5; this.release(); } }
    }
    // integrate in short sub-steps (no tunnelling through walls at swing speeds)
    const steps = Math.min(16, Math.max(1, Math.ceil(v.length() * dt / 0.22)));
    const h = dt / steps; let landedRoof = null, landed = false; this.taut = false; this.blocked = false; this.wallT += dt;
    for (let s = 0; s < steps; s++) { const r = this._step(h, this.state === 'attached' && this.sub === 'swing'); if (r) { landed = true; if (r !== true) landedRoof = r; } }
    this.grounded = landed;
    p.onGround = landed;
    // facing
    const hs = Math.hypot(v.x, v.z);
    if (p.view === 'first') p.yaw = p.camYaw;
    else if (hs > 1) { const ty = Math.atan2(-v.x, -v.z); let d = ty - p.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); p.yaw += d * Math.min(1, dt * 6); }
    this.lastPos.copy(pos); this.speed = v.length();
    // landing after letting go ends the swing state
    if (landed && this.sub === 'fly') this._land(landedRoof);
    this._wind(this.speed);
    return this.speed;
  }
  // one sub-step: integrate, rope constraint, walls, floors/roofs, un-stick. Returns roof prism / true when on a surface.
  _step(h, attached) {
    const p = this.p, pos = p.pos, v = p.vel, ph = this.ph, world = this.world, A = this.anchor;
    const oy = pos.y; let nx = pos.x + v.x * h, ny = pos.y + v.y * h, nz = pos.z + v.z * h;
    if (attached) {
      const bx = nx - A.x, by = ny + BODY - A.y, bz = nz - A.z, d = Math.hypot(bx, by, bz);
      if (d > this.len && d > 1e-6) {
        const k = this.len / d; nx = A.x + bx * k; ny = A.y + by * k - BODY; nz = A.z + bz * k;
        const ux = bx / d, uy = by / d, uz = bz / d, vr = v.x * ux + v.y * uy + v.z * uz, want = -this.reelRate;
        if (vr > want) { const dv = vr - want; v.x -= ux * dv; v.y -= uy * dv; v.z -= uz * dv; }
        this.taut = true;
      }
    }
    // walls and posts
    const res = ph.resolve(nx, nz, R, ny, H);
    if (res[2]) {
      const px = res[0] - nx, pz = res[1] - nz, pl = Math.hypot(px, pz);
      if (pl > 1e-6) { const qx = px / pl, qz = pz / pl, vn = v.x * qx + v.z * qz; if (vn < 0) { v.x -= qx * vn * 1.05; v.z -= qz * vn * 1.05; } this.wallN.set(qx, 0, qz); this.wallT = 0; }
      nx = res[0]; nz = res[1]; this.blocked = true;
    }
    // floors (terrain, decks) and solid roofs crossed from above
    let on = null, gy = ph.groundAt(nx, nz, Math.max(oy, ny) + 0.5).y;
    const roof = world.topIn(nx, nz, ny - 0.02, Math.max(oy, ny) + 0.5);
    let slide = null;
    if (roof && roof.y1 >= gy) { gy = roof.y1; on = roof; if (roof.lm && !this._roofOk(roof, nx, nz)) slide = roof; }
    let landed = false;
    if (ny <= gy + 0.001) { ny = gy; if (v.y < 0) v.y = 0; landed = true; }
    if (landed && slide && this.slideT < 2.5) { // no visible roof up here (spire, steep roof): slide off outward instead of standing
      this.slideT += h; let qx, qz;
      const l = slide.tag && world.lm && world.lm.byId.get(slide.tag.slice(3));
      if (l) { qx = nx - l.anchor.x; qz = nz - l.anchor.z; } else { const e = world.exitPoint(slide, nx, nz, R + 0.4); qx = e[0] - nx; qz = e[1] - nz; }
      const ql = Math.hypot(qx, qz) || 1, along = (v.x * qx + v.z * qz) / ql, push = Math.max(5, along + 14 * h);
      v.x += (qx / ql) * (push - along); v.z += (qz / ql) * (push - along); landed = false; on = null; this.stats.slides++;
    } else if (!slide) this.slideT = 0;
    // never stay inside a solid volume: climb onto it if we are near its top, else step out sideways
    const bur = world.buriedIn(nx, nz, ny + 0.05, ny + H);
    if (bur) {
      if ((bur.y1 - ny < 1.2 || oy >= bur.y1 - 0.4) && (!bur.lm || this._roofOk(bur, nx, nz))) { ny = bur.y1; if (v.y < 0) v.y = 0; landed = true; on = bur; }
      else { const e = world.freePoint(bur, nx, nz, ny + 0.05, ny + H, R); const qx = e[0] - nx, qz = e[1] - nz, ql = Math.hypot(qx, qz) || 1; const vn = (v.x * qx + v.z * qz) / ql; if (vn < 0) { v.x -= qx / ql * vn; v.z -= qz / ql * vn; } nx = e[0]; nz = e[1]; ny = Math.max(ny, ph.groundAt(nx, nz, ny + 0.5).y); this.blocked = true; this.stats.rescues++; (this.stats.log || (this.stats.log = [])).push([bur.tag, Math.round(nx), Math.round(ny), Math.round(nz)]); if (this.stats.log.length > 20) this.stats.log.shift(); }
    }
    pos.set(nx, ny, nz);
    return landed ? (on || true) : false;
  }
  // is there a visible roof within ~1.3 m below this landmark collider top? (cached per 2 m cell)
  _roofOk(pr, x, z) {
    const k = Math.floor(x / 2) + ',' + Math.floor(z / 2), c = pr.roofOk || (pr.roofOk = new Map());
    if (c.has(k)) return c.get(k);
    const o = new THREE.Vector3(x, pr.y1 + 0.6, z), hit = this.world.refine(o, new THREE.Vector3(0, -1, 0), 0, 1.9);
    const ok = !!hit; c.set(k, ok); return ok;
  }
  // safety net for a few seconds after leaving the swing (other modes don't know about roofs)
  _unstick(p) {
    const w = this.world, bur = w.buriedIn(p.pos.x, p.pos.z, p.pos.y + 0.05, p.pos.y + H);
    if (bur) {
      if (bur.y1 - p.pos.y < 1.6 && (!bur.lm || this._roofOk(bur, p.pos.x, p.pos.z))) { p.pos.y = bur.y1; this._perchOn(bur); }
      else { const e = w.freePoint(bur, p.pos.x, p.pos.z, p.pos.y + 0.05, p.pos.y + H, R); p.pos.x = e[0]; p.pos.z = e[1]; p.pos.y = this.ph.groundAt(e[0], e[1], p.pos.y + 0.5).y; }
      p.vel.set(0, Math.min(0, p.vel.y), 0); this.stats.rescues++;
    }
    const g = this.ph.heightAt(p.pos.x, p.pos.z);
    if (p.pos.y < g - 1.5 && !this.ph.inHole(p.pos.x, p.pos.z)) { p.pos.y = this.ph.groundAt(p.pos.x, p.pos.z).y; p.vel.y = 0; this.stats.rescues++; }
  }
  // ------------------------------------------------------------------ camera
  _cameraFeel(p, dt) {
    const k = this.camK, sp = Math.min(1, (this.speed || 0) / 40);
    // gentle auto-follow: when the mouse has been still for a moment, ease the view round to the direction of travel
    const touched = this._yawSet != null && (Math.abs(p.camYaw - this._yawSet) > 1e-5 || Math.abs(p.camPitch - this._pitchSet) > 1e-5);
    this.lookIdle = touched ? 0 : (this.lookIdle || 0) + dt;
    const hs = Math.hypot(p.vel.x, p.vel.z);
    if (p.mode === 'grapple' && p.view === 'third' && this.lookIdle > 0.8 && hs > 9) {
      let d = Math.atan2(-p.vel.x, -p.vel.z) - p.camYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      p.camYaw += d * Math.min(1, dt * 1.1 * k * Math.min(1, (hs - 9) / 12));
    }
    this._yawSet = p.camYaw; this._pitchSet = p.camPitch;
    if (k > 0.002 || this.userDist != null) {
      if (this.userDist == null) this.userDist = p.camDistT;
      if (this.lastSetDist != null && Math.abs(p.camDistT - this.lastSetDist) > 1e-3) this.userDist = Math.max(1.6, p.camDistT - (this.lastSetDist - this.userDist)); // user zoomed
      const d = this.userDist + k * (0.8 + 2.0 * sp);
      p.camDistT = d; this.lastSetDist = d;
      if (k < 0.002) { p.camDistT = this.userDist; this.userDist = null; this.lastSetDist = null; }
    }
    const cam = this.ctx.camera, base = (window.BSIM && window.BSIM.settings && window.BSIM.settings.fov) || 62;
    // a few degrees wider with speed; only touches the FOV while the effect is active, then restores it once
    if (k > 0.002 || this.fovActive) {
      const fov = k > 0.002 ? base + 7 * k * sp : base; this.fovActive = k > 0.002;
      if (Math.abs(cam.fov - fov) > 0.01) {
        cam.fov = fov; cam.updateProjectionMatrix();
        if (Math.abs(fov - this.frustFov) > 0.75 || !this.fovActive) { this.frustFov = fov; const csm = window.BSIM && window.BSIM.csm; if (csm && csm.updateFrustums) csm.updateFrustums(); }
      }
    }
  }
  // ------------------------------------------------------------------ visuals
  _buildVisuals() {
    const scene = this.ctx.scene;
    // rope: a camera-facing ribbon (dark edges, light core) so it reads against sky and stone alike and stays ~3 px wide
    this.N = 28;
    const g = new THREE.BufferGeometry(), nv = this.N * 3; const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = [];
    for (let i = 0; i < this.N; i++) { const e = 0.22, c = 1.0; col.set([e, e, e, c, c, c, e, e, e], i * 9); }
    for (let i = 0; i < this.N - 1; i++) { const a = i * 3, b2 = a + 3; idx.push(a, a + 1, b2, a + 1, b2 + 1, b2, a + 1, a + 2, b2 + 1, a + 2, b2 + 2, b2 + 1); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({ color: 0xf3c254, vertexColors: true, side: THREE.DoubleSide }); // Cal-gold cord, dark edges
    this.rope = new THREE.Mesh(g, m); this.rope.frustumCulled = false; this.rope.castShadow = false; this.rope.receiveShadow = false; this.rope.visible = false; this.rope.name = 'grapple-rope';
    scene.add(this.rope);
    // grapnel head: shaft + three curved prongs
    const hk = new THREE.Group(); hk.name = 'grapple-hook';
    const steel = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.35, metalness: 0.85 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.26, 8), steel); shaft.position.y = -0.13; hk.add(shaft);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 12), steel); ring.position.y = -0.28; hk.add(ring);
    for (let i = 0; i < 3; i++) {
      const prong = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 5, 10, Math.PI * 0.62), steel);
      const a = (i / 3) * Math.PI * 2; const pv = new THREE.Group(); pv.rotation.y = a; prong.rotation.set(0, 0, Math.PI * 0.42); prong.position.set(0.075, 0.0, 0); pv.add(prong); hk.add(pv);
    }
    hk.visible = false; this.hookMesh = hk; scene.add(hk); if (this.ctx.setupMaterials) this.ctx.setupMaterials(hk); // CSM-aware lighting
    // crosshair (inside the HUD so photo mode / title screen hide it)
    const st = document.createElement('style');
    st.textContent = `.gh-ret{position:absolute;left:50%;top:calc(50% - 8.5vh);width:26px;height:26px;margin:-13px 0 0 -13px;pointer-events:none;opacity:0;transition:opacity .18s}
.gh-ret.fp{top:50%}.gh-ret.on{opacity:1}.gh-ret i{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:rgb(255 255 255 / .55);box-shadow:0 0 3px rgb(0 0 0 / .45);transition:background .15s}
.gh-ret b{position:absolute;inset:3px;border-radius:50%;border:1.5px solid rgb(255 255 255 / .9);box-shadow:0 0 3px rgb(0 0 0 / .35),inset 0 0 2px rgb(0 0 0 / .25);transform:scale(.55);opacity:0;transition:transform .16s,opacity .16s,border-color .16s}
.gh-ret.lock i{background:rgb(255 255 255 / .95)}.gh-ret.lock b{transform:scale(1);opacity:.85}.gh-ret.live b{transform:scale(.8);opacity:1;border-color:rgb(253 181 21 / .95)}`;
    document.head.appendChild(st);
    this.ret = document.createElement('div'); this.ret.className = 'gh-ret'; this.ret.innerHTML = '<b></b><i></i>';
    (this.ctx.ui && this.ctx.ui.hud ? this.ctx.ui.hud : document.body).appendChild(this.ret);
    this._retCls = '';
  }
  _reticle(usable) {
    const live = this.state === 'attached' || this.state === 'flying';
    const cls = 'gh-ret' + (this.p.view === 'first' ? ' fp' : '') + (usable ? ' on' : '') + (usable && this.aim.ok && !live ? ' lock' : '') + (live ? ' live' : '');
    if (cls !== this._retCls) { this.ret.className = cls; this._retCls = cls; }
  }
  // the hand the rope leaves from (exact once the avatar is posed)
  _handPos(p, out) {
    if (p.view === 'first' || !p.avatar.root.visible) return this._handGuess(out);
    const el = p.avatar.p && p.avatar.p.el1; if (!el) return this._handGuess(out);
    p.avatar.root.updateMatrixWorld(true); return el.localToWorld(out.set(0, -0.31, 0));
  }
  _drawRope(p, hand) {
    if (!hand) { hand = this._handPos(p, v2); if (p.mode !== 'grapple') hand.addScaledVector(p.vel, 1 / 60); }
    let end = this.tip;
    if (this.state === 'attached') end = this.anchor;
    if (this.state === 'retract') { const k = Math.min(1, this.retractT / 0.22); end = v3.copy(this.tip).lerp(hand, k * k); if (k >= 1) { this.rope.visible = false; this.hookMesh.visible = false; return; } }
    const cam = this.ctx.camera.position, N = this.N, P = this.rope.geometry.attributes.position.array;
    const dx = end.x - hand.x, dy = end.y - hand.y, dz = end.z - hand.z, L = Math.hypot(dx, dy, dz) || 1e-3;
    // slack sag (rope longer than the gap) and a decaying wave after firing / releasing
    // slack is measured on the constraint itself (body point), so a loaded rope draws dead straight
    let slack = 0;
    if (this.state === 'attached' && !this.taut && this.reelRate === 0) slack = Math.max(0, this.len - v3.set(p.pos.x, p.pos.y + BODY, p.pos.z).distanceTo(this.anchor) - 0.25);
    const sag = Math.min(4, Math.sqrt(slack * L) * 0.35) + (this.state === 'retract' ? L * 0.04 : 0);
    const wave = this.wave * Math.min(1.2, L * 0.03);
    const side = v1.set(dz, 0, -dx).normalize();
    let px = 0, py = 0, pz = 0;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), s = Math.sin(Math.PI * t);
      const w = Math.sin(t * Math.PI * 5 - this.wave * 12) * wave * s;
      const x = hand.x + dx * t + side.x * w, y = hand.y + dy * t - sag * 4 * t * (1 - t), z = hand.z + dz * t + side.z * w;
      // ribbon edge: perpendicular to the rope and the view direction
      const tx = i ? x - px : dx, ty = i ? y - py : dy, tz = i ? z - pz : dz;
      const vx = cam.x - x, vy = cam.y - y, vz = cam.z - z, dc = Math.hypot(vx, vy, vz) || 1;
      let ex = ty * vz - tz * vy, ey = tz * vx - tx * vz, ez = tx * vy - ty * vx; const el = Math.hypot(ex, ey, ez) || 1;
      const hw = Math.max(0.02, dc * 0.0026); ex = ex / el * hw; ey = ey / el * hw; ez = ez / el * hw;
      const o = i * 9; P[o] = x - ex; P[o + 1] = y - ey; P[o + 2] = z - ez; P[o + 3] = x; P[o + 4] = y; P[o + 5] = z; P[o + 6] = x + ex; P[o + 7] = y + ey; P[o + 8] = z + ez;
      px = x; py = y; pz = z;
    }
    this.rope.geometry.attributes.position.needsUpdate = true;
    const night = U.uNight ? U.uNight.value : 0; this.rope.material.color.setHex(0xf3c254).multiplyScalar(1 - 0.72 * night); // unlit, so dim it after dark
    this.rope.visible = true;
    // grapnel at the rope end, pointing along the rope (prongs dug into the surface once attached)
    const hk = this.hookMesh; hk.visible = true; hk.position.copy(end);
    v1.set(dx, dy, dz).divideScalar(L); hk.quaternion.setFromUnitVectors(UP, v1);
    hk.scale.setScalar(Math.max(1, end.distanceTo(cam) / 28)); // stays a few pixels big far away
  }
  // ------------------------------------------------------------------ pose (swing state only)
  _pose(p, av, dt) {
    const P = av.p; if (!P) return;
    const bike = this.prevMode === 'bike';
    // base pose from the avatar's own animation, driven to the airborne (or riding) blend
    av.blend.walk = 0; av.blend.run = 0; av.blend.air = bike ? 0 : 1; av.blend.bike = bike ? 1 : 0; av.animate(0, 0, !bike ? false : true, bike ? 'bike' : 'walk');
    const attached = this.state === 'attached';
    // lean the whole body into the rope
    const body = v1.set(p.pos.x, p.pos.y + BODY, p.pos.z);
    const ropeDir = v2.copy(this.anchor).sub(body).normalize();
    const up = v3.copy(UP);
    if (attached && !this.grounded) up.lerp(ropeDir, this.taut ? 0.85 : 0.4).normalize();
    else if (!this.grounded) { const hv = Math.hypot(p.vel.x, p.vel.z); up.set(p.vel.x * 0.012, 1, p.vel.z * 0.012).normalize(); if (hv < 0.1) up.copy(UP); }
    q1.setFromUnitVectors(UP, up); q2.setFromAxisAngle(UP, p.yaw);
    av.root.quaternion.copy(q1).multiply(q2); this.avTilt = true;
    // pivot around the body centre, not the feet
    const c = v1.set(0, BODY, 0).applyQuaternion(q1); av.root.position.set(p.pos.x, p.pos.y + BODY, p.pos.z).sub(c);
    if (bike) {
      const b = p.bike.root; b.visible = true; b.position.copy(av.root.position); b.quaternion.copy(av.root.quaternion);
      av.root.position.addScaledVector(UP.clone().applyQuaternion(q1), 0.38).addScaledVector(v3.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw)), -0.12);
      p.bike.animate(p.bikeDist, p.pedal);
    } else {
      // legs: relaxed tuck while swinging, trailing when flying free
      const fwdV = -(p.vel.x * Math.sin(p.yaw) + p.vel.z * Math.cos(p.yaw)), trail = Math.max(-0.5, Math.min(0.7, fwdV * 0.025));
      this.legT = (this.legT || 0) + dt * (1.5 + Math.min(3, this.speed * 0.08));
      for (const s of [-1, 1]) {
        const sc = Math.sin(this.legT + (s > 0 ? 0 : Math.PI)) * 0.12;
        P['hip' + s].rotation.x = attached ? -0.35 + trail + sc : -0.2 + trail * 0.6 + s * 0.22; P['kn' + s].rotation.x = attached ? 0.55 + Math.max(0, sc) * 1.5 : 0.5;
        P['hip' + s].rotation.z = s * 0.06;
      }
      P.spine.rotation.x = attached ? -0.1 : -0.25;
    }
    // right arm reaches up the rope; left arm out for balance
    av.root.updateMatrixWorld(true);
    if (attached || this.state === 'flying') {
      const sh = P.sh1; const target = this.state === 'attached' ? this.anchor : this.tip;
      const wp = sh.getWorldPosition(v1); const dir = v2.copy(target).sub(wp).normalize();
      const pq = sh.parent.getWorldQuaternion(q1).invert(); dir.applyQuaternion(pq);
      sh.quaternion.setFromUnitVectors(v3.set(0, -1, 0), dir); P.el1.rotation.set(0, 0, 0);
      if (attached) { // second hand grips the rope a little below the first
        av.root.updateMatrixWorld(true); const grip = P.el1.localToWorld(v1.set(0, -0.31, 0)), rd = v3.copy(target).sub(grip).normalize();
        const t2 = grip.addScaledVector(rd, -0.32), s2 = P['sh-1'], d2 = t2.sub(s2.getWorldPosition(v2)); const reach = d2.length();
        d2.normalize().applyQuaternion(s2.parent.getWorldQuaternion(q1).invert());
        s2.quaternion.setFromUnitVectors(v3.set(0, -1, 0), d2); P['el-1'].rotation.set(reach < 0.55 ? -Math.min(1.4, (0.6 - reach) * 4) : 0, 0, 0);
      } else { P['sh-1'].rotation.set(-0.9, 0, -0.85); P['el-1'].rotation.set(-0.6, 0, 0); }
    } else { P.sh1.rotation.set(-0.6, 0, 0.9); P['sh-1'].rotation.set(-0.6, 0, -0.9); P.el1.rotation.set(-0.3, 0, 0); P['el-1'].rotation.set(-0.3, 0, 0); }
    av.root.updateMatrixWorld(true);
    if (this.state !== 'idle') this._drawRope(p, this._handPos(p, v2)); else { this.rope.visible = false; this.hookMesh.visible = false; }
  }
  // ------------------------------------------------------------------ sound (synthesised, tiny)
  _sfx(kind) {
    const a = this.ctx.audio; if (!a || !a.ctx || !a.master) return;
    const c = a.ctx, t = c.currentTime;
    try {
      if (kind === 'fire' || kind === 'release') {
        const s = c.createBufferSource(); s.buffer = a.white; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
        const g = c.createGain(); const fire = kind === 'fire';
        f.frequency.setValueAtTime(fire ? 3200 : 900, t); f.frequency.exponentialRampToValueAtTime(fire ? 700 : 2600, t + (fire ? 0.13 : 0.1));
        g.gain.setValueAtTime(fire ? 0.16 : 0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (fire ? 0.16 : 0.12));
        s.connect(f).connect(g).connect(a.master); s.start(t, Math.random(), 0.2);
      } else if (kind === 'attach') {
        const o = c.createOscillator(); o.type = 'triangle'; const g = c.createGain();
        o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.09);
        g.gain.setValueAtTime(0.13, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        o.connect(g).connect(a.master); o.start(t); o.stop(t + 0.14);
      }
    } catch (e) { /* audio is optional */ }
  }
  _wind(speed) {
    const a = this.ctx.audio; if (!a || !a.ctx || !a.master) return;
    if (!this.windG) {
      if (speed < 8) return;
      const c = a.ctx, s = c.createBufferSource(); s.buffer = a.white; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.7; f.frequency.value = 500;
      const g = c.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(a.master); s.start(); this.windG = g; this.windF = f;
    }
    const t = a.ctx.currentTime, k = Math.max(0, Math.min(1, (speed - 8) / 40));
    this.windG.gain.setTargetAtTime(k * 0.14, t, 0.25); this.windF.frequency.setTargetAtTime(380 + k * 900, t, 0.25);
  }
}
