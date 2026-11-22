// Player controller: walk/run/jump, bike, drone flight; third/first-person camera; collisions; interactions.
// r5-controls: rewritten for feel and frame-rate independence (see notes below). Public API is unchanged:
//   registerMode / setMode / teleport / input / update / _groundMove (plugins) / lookDelta, fields pos vel yaw camYaw camPitch
//   camDistT view mode keys enabled sens invertY avatar bike interactions onInteract onModeChange onStep onLand plugins.
// What changed and why (measured with scripted input traces, /work/qa/r5):
// - Built-in modes (walk, bike, fly) integrate in fixed small substeps (<= 1/120 s), so jump height, stopping distance and
//   collisions no longer depend on the frame rate (a jittery 20-50 fps MacBook frame used to change the camera lag every
//   frame, which read as judder).
// - Walking uses vector acceleration with separate start / stop / turn grip (it was a per-axis clamp: slidey stops, 0.6 s
//   reversals). The body turns toward the input direction, not the lagging velocity.
// - Hitting a wall removes the into-wall part of the velocity (no more running on the spot against walls).
// - Jump buffer + coyote time, snappier fall, exact ballistic integration.
// - Step-ups / step-downs (stairs, kerbs, terraces) still snap the physics position, but the avatar and camera ease over
//   the step (player.visDy), so stairs read as a smooth climb instead of 15 cm pops.
// - Camera: orientation comes straight from the mouse (no lag); the pivot is rigid horizontally and spring-damped
//   vertically; wall pull-in is instant and the ease-back is smooth; optional gentle follow when moving with the mouse idle.
// - Adjustable speeds: speedScale (walk/run multiplier) and flySpeed (m/s), +/- keys, mouse wheel in fly mode,
//   persisted by main.js through onSpeedChange. Fly mode collides with walls.
import * as THREE from 'three';
import { Avatar, Bike } from './avatar.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const damp = (k, dt) => 1 - Math.exp(-k * dt); // frame-rate independent smoothing factor
// critically damped follow (Game Programming Gems 4 'SmoothDamp'); st.vy holds the velocity; stable at any dt
function smoothDamp(cur, target, st, smoothTime, dt) {
  const om = 2 / smoothTime, x = om * dt, ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x), ch = cur - target, tmp = (st.vy + om * ch) * dt;
  st.vy = (st.vy - om * tmp) * ex; return target + (ch + tmp) * ex;
}
// ---- tuning (metres, seconds)
export const MOVE = {
  // m/s at speedScale 1 (Settings > Walk speed scales all three, 0.5x-2x). The default walk reads as a real walk on the
  // mocap avatar (its walk loop is ~1.4 m/s, jog ~2.3); Shift runs, and keeping Shift held breaks into a sprint.
  walk: 2.0, run: 4.6, sprint: 7.6, sprintAfter: 1.1, sprintAccel: 6,
  accel: 26, decel: 30, turnGrip: 22,   // m/s^2: speeding up, stopping with no input, extra grip when reversing
  airAccel: 7, turnRate: 15,            // m/s^2 in the air; max body turn rate (rad/s)
  jumpV: 6.8, gUp: 22, gDown: 31, coyote: 0.12, jumpBuffer: 0.15,
  stepUp: 0.6, stepDown: 0.6, radius: 0.32, height: 1.7,
  substep: 1 / 120,
  fly: { levels: [3, 5, 8, 12, 18, 25, 35, 50, 70, 100, 150], def: 25, boost: 3, resp: 3.6, radius: 0.5 },
  walkLevels: [0.5, 0.65, 0.8, 1, 1.25, 1.5, 1.75, 2],
};
const _v = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _look = new THREE.Vector3(), _want = new THREE.Vector3(), _dir = new THREE.Vector3(), _tgt = new THREE.Vector3(), _p = new THREE.Vector3();
export class Player {
  constructor({ scene, camera, physics, dom, look }) {
    this.scene = scene; this.camera = camera; this.ph = physics; this.dom = dom;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.yaw = 0; this.camYaw = 0; this.camPitch = -0.12; this.camDist = 4.2; this.camDistT = 4.2;
    this.mode = 'walk'; this.view = 'third'; this.onGround = true; this.keys = new Set(); this.enabled = false; this.sens = 1; this.invertY = false;
    this.avatar = new Avatar(look); scene.add(this.avatar.root);
    this.bike = new Bike(); this.bike.root.visible = false; scene.add(this.bike.root);
    this.bikeDist = 0; this.pedal = 0; this.lean = 0; this.bikeSpeed = 0;
    this.touch = { mx: 0, my: 0, run: false };
    this.interactions = []; this.activeInteraction = null; this.onInteract = null; this.onModeChange = null;
    this.camPos = new THREE.Vector3(); this.headBob = 0; this.airTime = 0; this.stepDist = 0; this.onStep = null;
    this.plugins = {}; // movement-mode plugins: see src/player/modes/README.md
    // r5-controls state (readable by the avatar / HUD): see MOVE for units
    this.speedScale = 1; this.flySpeed = MOVE.fly.def; this.camFollow = true; this.onSpeedChange = null;
    this.running = false; this.sprinting = false; this.moveSpeed = 0; this.groundSlope = 0; this._runT = 0; this.visDy = 0; this.flyClip = /[?&]flyclip\b/.test(typeof location !== 'undefined' ? location.search : '');
    this._coyote = 0; this._jumpBuf = 0; this._jumping = false; this._mouseIdle = 9; this._wheelAcc = 0; this._wheelT = 0;
    this._cam = { init: false, y: 0, vy: 0, col: 99, last: new THREE.Vector3() };
    this._bindInput();
  }
  registerMode(name, plugin) { this.plugins[name] = plugin; plugin.init && plugin.init(this); return plugin; }
  _bindInput() {
    const dom = this.dom;
    addEventListener('keydown', (e) => { if (e.target && e.target.tagName === 'INPUT') return; this.keys.add(e.code); if (!this.enabled) return;
      if (e.code === 'Space' && this.mode !== 'fly') { this.jumpReq = true; e.preventDefault(); }
      if (e.code === 'KeyB' && !e.repeat) this.setMode(this.mode === 'bike' ? 'walk' : 'bike');
      if (e.code === 'KeyF' && !e.repeat) this.setMode(this.mode === 'fly' ? 'walk' : 'fly');
      if (e.code === 'KeyV' && !e.repeat) this.view = this.view === 'third' ? 'first' : 'third';
      if (e.code === 'KeyE' && !e.repeat && this.activeInteraction) this.onInteract && this.onInteract(this.activeInteraction);
      // r5-controls: +/- change the speed of the current mode (walk/run or fly); digits pick a mode from the HUD mode bar
      if (!e.metaKey && !e.ctrlKey && (e.code === 'Equal' || e.code === 'NumpadAdd' || e.code === 'Minus' || e.code === 'NumpadSubtract')) { this.stepSpeed(e.code === 'Equal' || e.code === 'NumpadAdd' ? 1 : -1); e.preventDefault(); }
      if (!e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey && /^Digit[1-9]$/.test(e.code) && this.modeOrder) { const id = this.modeOrder()[+e.code.slice(5) - 1]; if (id) this.pickMode ? this.pickMode(id) : this.setMode(this.mode === id ? 'walk' : id); }
      for (const [name, pl] of Object.entries(this.plugins)) { if (pl.key && e.code === pl.key && !e.repeat) this.setMode(this.mode === name ? 'walk' : name); pl.onKey && pl.onKey(e, this); }
    });
    addEventListener('mousedown', (e) => { if (!this.enabled) return; for (const pl of Object.values(this.plugins)) pl.onMouse && pl.onMouse(e, this, true); });
    addEventListener('mouseup', (e) => { if (!this.enabled) return; for (const pl of Object.values(this.plugins)) pl.onMouse && pl.onMouse(e, this, false); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      const locked = document.pointerLockElement === dom;
      if (!locked && !(e.buttons & 1)) return;
      const k = 0.0022 * this.sens;
      this.camYaw -= e.movementX * k; this.camPitch = clamp(this.camPitch - e.movementY * k * (this.invertY ? -1 : 1), -1.45, 1.2);
      if (e.movementX || e.movementY) this._mouseIdle = 0;
    });
    // r5-controls: wheel = camera distance, scaled by the scroll amount (a MacBook trackpad sends dozens of small events,
    // which used to zoom 12% per event); in fly mode the wheel changes the fly speed instead
    dom.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      const px = (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1) * (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX);
      if (this.mode === 'fly' && !e.altKey) {
        const now = performance.now(); if (now - this._wheelT > 400) this._wheelAcc = 0;
        this._wheelAcc += px; this._wheelT = now;
        if (Math.abs(this._wheelAcc) >= 60 && now - (this._wheelStep || 0) > 110) { this.stepSpeed(this._wheelAcc < 0 ? 1 : -1); this._wheelAcc = 0; this._wheelStep = now; }
        return;
      }
      this.camDistT = clamp(this.camDistT * Math.exp(clamp(px, -240, 240) * 0.0014), 1.6, 14);
    }, { passive: true });
  }
  lookDelta(dx, dy) { this.camYaw -= dx * 0.005 * this.sens; this.camPitch = clamp(this.camPitch - dy * 0.005 * this.sens, -1.45, 1.2); this._mouseIdle = 0; }
  // r5-controls: speed controls. stepSpeed(+1|-1) moves the current mode's speed one notch; setSpeed sets it directly.
  speedKind() { return this.mode === 'fly' ? 'fly' : this.mode === 'walk' ? 'walk' : null; }
  stepSpeed(dir) {
    const kind = this.speedKind(); if (!kind) return false;
    const L = kind === 'fly' ? MOVE.fly.levels : MOVE.walkLevels, cur = kind === 'fly' ? this.flySpeed : this.speedScale;
    let i = 0; for (let k = 0; k < L.length; k++) if (Math.abs(L[k] - cur) < Math.abs(L[i] - cur)) i = k;
    if (dir > 0 && L[i] <= cur * 1.001) i++; else if (dir < 0 && L[i] >= cur * 0.999) i--;
    i = clamp(i, 0, L.length - 1); this.setSpeed(kind, L[i], true); return true;
  }
  setSpeed(kind, v, fromGame = false) {
    if (kind === 'fly') this.flySpeed = clamp(+v || MOVE.fly.def, 1, 400); else this.speedScale = clamp(+v || 1, 0.3, 3);
    this.onSpeedChange && this.onSpeedChange(kind, kind === 'fly' ? this.flySpeed : this.speedScale, fromGame);
  }
  // target ground speeds (m/s) after the Settings multiplier
  get walkSpeed() { return MOVE.walk * this.speedScale; }
  get runSpeed() { return MOVE.run * this.speedScale; }
  get sprintSpeed() { return MOVE.sprint * this.speedScale; }
  setMode(m) {
    if (m === this.mode) return;
    const nextPl = this.plugins[m]; if (nextPl && nextPl.canEnter && !nextPl.canEnter(this)) return false;
    const prevPl = this.plugins[this.mode]; if (prevPl && prevPl.exit) prevPl.exit(this, m);
    if (m === 'bike') { this.bikeSpeed = Math.hypot(this.vel.x, this.vel.z); }
    const prev = this.mode;
    this.mode = m; this.bike.root.visible = m === 'bike'; this.avatar.root.visible = true;
    if (m === 'fly') { this.vel.y = Math.max(0, this.vel.y); this.onGround = false; this._flyP = this._flyB = 0; } // keep horizontal momentum
    if (prev === 'fly') { this.avatar.root.rotation.set(0, this.yaw, 0, 'XYZ'); this._jumping = false; this.airTime = 0; const hs = Math.hypot(this.vel.x, this.vel.z), cap = this.sprintSpeed; if (hs > cap) { this.vel.x *= cap / hs; this.vel.z *= cap / hs; } this.vel.y = Math.min(this.vel.y, 0); }
    if (nextPl && nextPl.enter) nextPl.enter(this);
    this.onModeChange && this.onModeChange(m);
  }
  teleport(x, y, z, yaw) {
    this.pos.set(x, y ?? this.ph.groundAt(x, z).y, z); this.vel.set(0, 0, 0); if (yaw != null) { this.yaw = yaw; this.camYaw = yaw; }
    if (y == null) this.pos.y = this.ph.groundAt(x, z).y; this.onGround = true; this.visDy = 0; this._cam.init = false; this.bikeSpeed = 0;
  }
  input() {
    const k = this.keys; let f = 0, s = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1; if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1; if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    f += -this.touch.my; s += this.touch.mx;
    const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
    return { f, s, sprint: k.has('ShiftLeft') || k.has('ShiftRight') || this.touch.run, up: k.has('Space'), down: k.has('KeyC') || k.has('ControlLeft') };
  }
  update(dt) {
    dt = Math.min(dt, 0.1);
    const inp = this.enabled ? this.input() : { f: 0, s: 0, sprint: false, up: false, down: false };
    const fwd = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)), right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    let speedNow = 0; this._mouseIdle += dt;
    for (const pl of Object.values(this.plugins)) if (pl.always) pl.always(this, dt, inp, fwd, right);
    const plugin = this.plugins[this.mode];
    if (plugin) {
      speedNow = plugin.update(this, Math.min(dt, 0.05), inp, fwd, right) || 0;
      this.sprinting = false; this.moveSpeed = speedNow;
    } else {
      // built-in modes: fixed-size substeps (the last one covers the remainder) so the result is the same at any frame rate
      let n = Math.max(1, Math.ceil(dt / MOVE.substep - 1e-6));
      if (this.mode === 'fly') n = Math.min(64, Math.max(n, Math.ceil((this.vel.length() + 1) * dt / 0.4))); // no tunnelling through walls at speed
      const h = dt / n;
      this._hitThisFrame = false;
      for (let i = 0; i < n; i++) {
        if (this.mode === 'fly') this._flyStep(h, inp, right);
        else if (this.mode === 'bike') this._bikeStep(h, inp, fwd, right);
        else this._walkStep(h, inp, fwd, right);
      }
      speedNow = this.mode === 'fly' ? this.vel.length() : this.mode === 'bike' ? Math.abs(this.bikeSpeed) : Math.hypot(this.vel.x, this.vel.z);
    }
    // visual step smoothing decays toward 0 (critically damped feel without overshoot)
    this.visDy *= Math.exp(-dt / 0.055); if (Math.abs(this.visDy) < 1e-4) this.visDy = 0;
    if (plugin || this.mode === 'fly') this.visDy = 0;
    // avatar & bike transforms
    const av = this.avatar; av.root.position.copy(this.pos); av.root.position.y += this.visDy;
    if (this.mode === 'fly') this._flyPose(av, dt); else av.root.rotation.set(0, this.yaw, 0);
    av.pedal = this.pedal; av.animate(dt, speedNow, this.onGround, this.mode);
    if (this.mode === 'bike') { this.bike.root.position.copy(av.root.position); this.bike.root.rotation.set(0, this.yaw, this.lean); av.root.rotation.z = this.lean; av.root.position.y += 0.38; av.root.position.addScaledVector(_v.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), -0.12); this.bike.animate(this.bikeDist, this.pedal); }
    av.root.visible = this.view === 'third' || this.mode === 'fly';
    if (plugin && plugin.pose) plugin.pose(this, av, dt);
    av.finalize && av.finalize(dt, this); // r5-avatar: retarget proxy pose to the skinned body
    this.speed = speedNow;
    this._autoFollow(dt, inp, plugin);
    this._camera(dt);
    // interactions
    let best = null, bd = 1e9;
    for (const it of this.interactions) { const d = Math.hypot(it.pos[0] - this.pos.x, it.pos[2] - this.pos.z); const dy = Math.abs(it.pos[1] - this.pos.y); if (d < (it.radius || 2.5) && dy < 4 && d < bd) { best = it; bd = d; } }
    this.activeInteraction = best;
  }
  // ---- walking / running / jumping (one substep of length h)
  _walkStep(h, inp, fwd, right) {
    const M = MOVE, first = this.view === 'first';
    const wx = fwd.x * inp.f + right.x * inp.s, wz = fwd.z * inp.f + right.z * inp.s, wl = Math.hypot(wx, wz);
    const run = !!inp.sprint && wl > 0.1;
    this._runT = run && this.onGround ? (this._runT || 0) + h : run ? (this._runT || 0) : 0; // hold Shift a moment to sprint
    const sprint = run && this._runT > M.sprintAfter;
    const top = (sprint ? M.sprint : run ? M.run : M.walk) * this.speedScale * Math.min(1, wl);
    this.running = run; this.sprinting = sprint; this.moveSpeed = top;
    const tx = wl > 1e-3 ? wx / wl * top : 0, tz = wl > 1e-3 ? wz / wl * top : 0;
    let vx = this.vel.x, vz = this.vel.z; const sp = Math.hypot(vx, vz), grip = Math.max(1, this.speedScale);
    let rate;
    if (this.onGround) {
      if (top < 0.01) rate = M.decel * grip;
      else { const dot = sp > 0.2 ? (vx * tx + vz * tz) / (sp * top) : 1; rate = (M.accel + (1 - dot) * M.turnGrip) * grip; if (sp > top + 0.05 && dot > 0.7) rate = M.decel * grip; else if (sprint && dot > 0.7 && sp > M.run * this.speedScale * 0.9) rate = M.sprintAccel * grip; /* ease up into the sprint */ }
    } else rate = top < 0.01 ? 0.6 : M.airAccel * grip;
    const dx = tx - vx, dz = tz - vz, dl = Math.hypot(dx, dz), mx = rate * h;
    if (dl <= mx) { vx = tx; vz = tz; } else { vx += dx / dl * mx; vz += dz / dl * mx; }
    // body facing: toward the input direction (responsive), first person follows the camera
    if (first) this.yaw = this.camYaw;
    else if (wl > 0.05) { const ty = Math.atan2(-wx, -wz), d = angDiff(this.yaw, ty), mr = M.turnRate * (this.onGround ? 1 : 0.5) * h; this.yaw += clamp(d * damp(18, h), -mr, mr); }
    this.vel.x = vx; this.vel.z = vz;
    // jump: buffered press + coyote time after leaving a ledge
    if (this.jumpReq) { this._jumpBuf = M.jumpBuffer; this.jumpReq = false; }
    this._jumpBuf -= h; this._coyote = this.onGround ? M.coyote : this._coyote - h;
    if (this._jumpBuf > 0 && this._coyote > 0) { this.vel.y = M.jumpV; this.onGround = false; this._coyote = 0; this._jumpBuf = 0; this._jumping = true; }
    this._move(h, M.radius, false, inp);
  }
  // ---- bicycle (one substep)
  _bikeStep(h, inp, fwd, right) {
    const maxS = (inp.sprint ? 15 : 9.5);
    const target = inp.f > 0 ? maxS * inp.f : inp.f < 0 ? -2.5 : 0;
    const acc = inp.f < 0 && this.bikeSpeed > 0 ? 9 : target > this.bikeSpeed ? 3.5 : 2.2;
    this.bikeSpeed += clamp(target - this.bikeSpeed, -acc * h, acc * h);
    let steer = 0;
    if (Math.abs(inp.f) + Math.abs(inp.s) > 0.1) { const wantYaw = Math.atan2(-(fwd.x * inp.f + right.x * inp.s), -(fwd.z * inp.f + right.z * inp.s)); if (inp.f >= -0.1) steer = clamp(angDiff(this.yaw, wantYaw), -1, 1); }
    const turnRate = 1.9 / (1 + this.bikeSpeed * 0.08);
    this.yaw += steer * turnRate * h * Math.min(1, Math.abs(this.bikeSpeed) / 1.5 + 0.2);
    this.lean += (-steer * Math.min(1, this.bikeSpeed / 8) * 0.35 - this.lean) * damp(5, h);
    this.vel.x = -Math.sin(this.yaw) * this.bikeSpeed; this.vel.z = -Math.cos(this.yaw) * this.bikeSpeed;
    this.jumpReq = false; this.sprinting = false; this.moveSpeed = Math.abs(target);
    this._move(h, 0.45, true, inp);
    this.bikeDist += this.bikeSpeed * h; this.pedal += (this.bikeSpeed / 0.34) * h * 0.45;
  }
  // kept for plugins (README API): one ground-following move with wall collision over dt
  _groundMove(dt, inp, bike) {
    if (this.jumpReq) { if ((this.onGround || this._coyote > 0) && !bike) { this.vel.y = MOVE.jumpV; this.onGround = false; this._coyote = 0; } this.jumpReq = false; }
    const n = Math.max(1, Math.ceil(dt / MOVE.substep - 1e-6)), h = dt / n;
    for (let i = 0; i < n; i++) this._move(h, bike ? 0.45 : MOVE.radius, bike, inp || {});
  }
  // shared ground move: gravity, wall slide, step up/down with visual smoothing, landing
  _move(h, R, bike, inp) {
    const M = MOVE, ph = this.ph, wasGround = this.onGround, y = this.pos.y;
    // gravity: lighter on the way up, heavier falling (a snappier, less floaty arc)
    const g = this.vel.y > 0 ? M.gUp : M.gDown;
    let ny = y + this.vel.y * h - 0.5 * g * h * h; this.vel.y -= g * h;
    let nx = this.pos.x + this.vel.x * h, nz = this.pos.z + this.vel.z * h;
    const res = ph.resolve(nx, nz, R, y, M.height);
    if (res[2]) {
      let px = res[0] - nx, pz = res[1] - nz; const pl = Math.hypot(px, pz);
      if (pl > 1e-7) { px /= pl; pz /= pl; const vn = this.vel.x * px + this.vel.z * pz;
        if (vn < 0) { if (bike) { const sp = Math.hypot(this.vel.x, this.vel.z) || 1; const into = -vn / sp; if (!this._hitThisFrame) this.bikeSpeed *= 1 - clamp(into, 0, 1) * 0.85; } this.vel.x -= px * vn; this.vel.z -= pz * vn; } }
      this._hitThisFrame = true;
      nx = res[0]; nz = res[1];
    }
    const gq = ph.groundAt(nx, nz, y + M.stepUp);
    const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    if (wasGround && this.vel.y <= 0 && y - gq.y <= M.stepDown) {
      // grounded: follow the surface (step up to stepUp, down to stepDown); ease the avatar/camera over discontinuities
      const dy = gq.y - y, allow = 0.75 * moved + 0.006;
      if (Math.abs(dy) > allow) this.visDy = clamp(this.visDy - (dy - Math.sign(dy) * allow), -0.7, 0.7);
      this.groundSlope = moved > 1e-4 ? clamp(dy / moved, -3, 3) : this.groundSlope;
      ny = gq.y; this.vel.y = 0; this.onGround = true; this._jumping = false;
    } else if (ny <= gq.y) {
      if (!wasGround && this.airTime > 0.35 && this.onLand) this.onLand(this.airTime);
      ny = gq.y; this.vel.y = 0; this.onGround = true; this.airTime = 0; this._jumping = false;
    } else { this.onGround = false; }
    if (this.onGround) this.airTime = 0; else this.airTime += h;
    // step sounds
    if (this.onGround && !bike) { this.stepDist += moved; const stride = 0.75 + Math.min(1, Math.hypot(this.vel.x, this.vel.z) / 8) * 0.6; if (this.stepDist > stride) { this.stepDist = 0; this.onStep && this.onStep(gq.on ? 'stone' : 'ground'); } }
    if (ny < -50) { ny = ph.groundAt(nx, nz).y; this.vel.y = 0; }
    this.pos.set(nx, ny, nz); this.surface = gq.on;
  }
  // ---- drone flight (one substep): move where you look, Space/C up/down, Shift boost; walls stop you
  _flyStep(h, inp, right) {
    const F = MOVE.fly, sp = this.flySpeed * (inp.sprint ? F.boost : 1);
    _look.set(-Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), -Math.cos(this.camYaw) * Math.cos(this.camPitch));
    _want.set(0, 0, 0).addScaledVector(_look, inp.f).addScaledVector(right, inp.s); _want.y += (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
    if (_want.lengthSq() > 1) _want.normalize();
    this.moveSpeed = sp; this.sprinting = !!inp.sprint;
    // ease toward the target velocity (quicker to brake than to build speed)
    const k = _want.lengthSq() < 1e-4 ? F.resp * 1.4 : F.resp;
    this.vel.lerp(_want.multiplyScalar(sp), damp(k, h));
    let nx = this.pos.x + this.vel.x * h, nz = this.pos.z + this.vel.z * h, ny = this.pos.y + this.vel.y * h;
    if (!this.flyClip) {
      const res = this.ph.resolve(nx, nz, F.radius, ny - 0.2, 1.6);
      if (res[2]) { let px = res[0] - nx, pz = res[1] - nz; const pl = Math.hypot(px, pz); if (pl > 1e-7) { px /= pl; pz /= pl; const vn = this.vel.x * px + this.vel.z * pz; if (vn < 0) { this.vel.x -= px * vn; this.vel.z -= pz * vn; } } nx = res[0]; nz = res[1]; }
    }
    const g = this.ph.groundAt(nx, nz, ny + 1.0).y; if (ny < g + 0.3) { ny = g + 0.3; if (this.vel.y < 0) this.vel.y = 0; }
    ny = Math.min(ny, 2500);
    this.pos.set(nx, ny, nz);
    // facing: along the flight path when moving forward, otherwise keep looking where the camera looks
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const fwdDot = -Math.sin(this.camYaw) * this.vel.x - Math.cos(this.camYaw) * this.vel.z;
    const ty = hs > 1 && fwdDot > -0.2 * hs ? Math.atan2(-this.vel.x, -this.vel.z) : this.camYaw;
    const d = angDiff(this.yaw, ty); this._flyTurn = d; this.yaw += d * damp(6, h);
    this.onGround = false;
  }
  _flyPose(av, dt) {
    const hs = Math.hypot(this.vel.x, this.vel.z), f = clamp(hs / Math.max(8, this.flySpeed), 0, 1.4);
    const pitch = -0.55 * Math.min(1, f) - clamp(this.vel.y / 40, -0.2, 0.2), bank = clamp(-(this._flyTurn || 0) * 0.9, -0.5, 0.5) * Math.min(1, f);
    this._flyP = (this._flyP || 0) + (pitch - (this._flyP || 0)) * damp(5, dt); this._flyB = (this._flyB || 0) + (bank - (this._flyB || 0)) * damp(4, dt);
    av.root.rotation.set(this._flyP, this.yaw, this._flyB, 'YXZ');
  }
  // gentle third-person camera follow: when you move sideways with the mouse idle, the view swings round behind you
  _autoFollow(dt, inp, plugin) {
    if (!this.camFollow || plugin || this.view !== 'third' || this._mouseIdle < 1.1 || !this.enabled) return;
    if (this.mode === 'walk') {
      const hs = Math.hypot(this.vel.x, this.vel.z); if (hs < 1.5 || inp.f < -0.1 || (!inp.s && !inp.f)) return;
      const d = angDiff(this.camYaw, Math.atan2(-this.vel.x, -this.vel.z)); if (Math.abs(d) < 0.15 || Math.abs(d) > 2.5) return;
      this.camYaw += d * damp(0.55 * Math.min(1, hs / 4), dt);
    } else if (this.mode === 'bike') {
      const hs = Math.abs(this.bikeSpeed); if (hs < 1.5) return;
      this.camYaw += angDiff(this.camYaw, this.yaw) * damp(0.5 + hs * 0.1, dt);
    }
  }
  _camera(dt) {
    const cam = this.camera, C = this._cam, fly = this.mode === 'fly';
    this.camDist += (this.camDistT - this.camDist) * damp(10, dt);
    const headH = this.mode === 'bike' ? 1.75 : 1.6;
    const bodyY = this.pos.y + this.visDy;
    // teleports / mode warps: snap the smoothing state
    if (!C.init || C.last.distanceToSquared(this.pos) > 36) { C.init = true; C.y = bodyY; C.vy = 0; C.col = 99; C.prevBody = bodyY; C.st = 0.1; }
    C.last.copy(this.pos);
    // vertical pivot: critically damped (tight on the ground, softer in the air so jumps don't yank the view); the
    // smoothing time eases between the two so landings don't jolt. It runs in fixed 1/240 s steps against the target
    // interpolated across the frame, so the lag is identical at any frame rate (a per-frame filter jitters when dt varies).
    // The horizontal pivot is rigid on purpose for the same reason.
    C.st += ((fly ? 0.06 : this.onGround || this.plugins[this.mode] ? 0.1 : 0.2) - C.st) * damp(6, dt);
    { const n = Math.min(48, Math.max(1, Math.ceil(dt * 240 - 1e-6))), hh = dt / n, y0 = C.prevBody ?? bodyY; for (let i = 1; i <= n; i++) C.y = smoothDamp(C.y, y0 + (bodyY - y0) * (i / n), C, C.st, hh); C.prevBody = bodyY; }
    if (Math.abs(bodyY - C.y) > 2.5) { C.y = bodyY - Math.sign(bodyY - C.y) * 2.5; }
    if (this.view === 'first' && !fly) {
      const sp = this.speed || 0; this.headBob += dt * (sp > 0.3 && this.onGround ? (5 + sp) : 0);
      const bob = this.mode === 'walk' ? Math.sin(this.headBob * 2) * 0.03 * Math.min(1, sp / 4) : 0;
      const plugin = this.plugins[this.mode], hy = plugin ? this.pos.y + headH : bodyY + headH;
      cam.position.set(this.pos.x, hy + 0.05 + bob, this.pos.z);
      cam.rotation.set(this.camPitch, this.camYaw, 0, 'YXZ');
      this.camPos.copy(cam.position);
      return;
    }
    const plugin = this.plugins[this.mode];
    const pivotY = (plugin ? this.pos.y + (C.y - bodyY) * 0.5 : C.y) + headH + 0.25; // plugin modes: follow their own smoothing closely
    _tgt.set(this.pos.x, pivotY, this.pos.z);
    const dist = fly ? Math.max(this.camDist, 6) : this.camDist;
    _dir.set(Math.sin(this.camYaw) * Math.cos(this.camPitch), -Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch));
    // wall collision: pull in at once, ease back out
    let d = dist; const hl = Math.hypot(_dir.x, _dir.z);
    if (hl > 0.01) { const wd = this.ph.rayWall(_tgt.x, _tgt.z, _tgt.y + _dir.y * d * 0.5, _dir.x / hl, _dir.z / hl, d * hl + 0.4); d = Math.min(d, Math.max(0.6, wd / hl - 0.35)); }
    if (d < C.col) C.col = d; else C.col += (d - C.col) * damp(3.5, dt);
    d = Math.min(dist, C.col);
    _p.copy(_tgt).addScaledVector(_dir, d);
    const gy = this.ph.groundAt(_p.x, _p.z, _p.y + 0.5).y; if (_p.y < gy + 0.4) _p.y = gy + 0.4;
    this.camPos.copy(_p);
    cam.position.copy(_p);
    cam.lookAt(_tgt);
  }
}
