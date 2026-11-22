// Player controller: walk/run/jump, bike, drone flight; third/first-person camera; collisions; interactions.
import * as THREE from 'three';
import { Avatar, Bike } from './avatar.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
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
    });
    dom.addEventListener('wheel', (e) => { if (!this.enabled) return; this.camDistT = clamp(this.camDistT * (1 + Math.sign(e.deltaY) * 0.12), 1.6, 14); }, { passive: true });
  }
  lookDelta(dx, dy) { this.camYaw -= dx * 0.005 * this.sens; this.camPitch = clamp(this.camPitch - dy * 0.005 * this.sens, -1.45, 1.2); }
  setMode(m) {
    if (m === this.mode) return;
    const nextPl = this.plugins[m]; if (nextPl && nextPl.canEnter && !nextPl.canEnter(this)) return false;
    const prevPl = this.plugins[this.mode]; if (prevPl && prevPl.exit) prevPl.exit(this, m);
    if (m === 'bike') { this.bikeSpeed = Math.hypot(this.vel.x, this.vel.z); this.yaw = this.yaw; }
    this.mode = m; this.bike.root.visible = m === 'bike'; this.avatar.root.visible = true;
    if (m === 'fly') { this.vel.set(0, 0, 0); }
    if (nextPl && nextPl.enter) nextPl.enter(this);
    this.onModeChange && this.onModeChange(m);
  }
  teleport(x, y, z, yaw) {
    this.pos.set(x, y ?? this.ph.groundAt(x, z).y, z); this.vel.set(0, 0, 0); if (yaw != null) { this.yaw = yaw; this.camYaw = yaw; }
    if (y == null) this.pos.y = this.ph.groundAt(x, z).y; this.onGround = true;
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
    dt = Math.min(dt, 0.05);
    const inp = this.enabled ? this.input() : { f: 0, s: 0, sprint: false, up: false, down: false };
    const fwd = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)), right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    let speedNow = 0;
    for (const pl of Object.values(this.plugins)) if (pl.always) pl.always(this, dt, inp, fwd, right);
    const plugin = this.plugins[this.mode];
    if (plugin) {
      speedNow = plugin.update(this, dt, inp, fwd, right) || 0;
    } else if (this.mode === 'fly') {
      const sp = inp.sprint ? 140 : 32;
      const look = new THREE.Vector3(-Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), -Math.cos(this.camYaw) * Math.cos(this.camPitch));
      const want = new THREE.Vector3().addScaledVector(look, inp.f).addScaledVector(right, inp.s); want.y += (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
      if (want.lengthSq() > 1) want.normalize();
      this.vel.lerp(want.multiplyScalar(sp), Math.min(1, dt * 4));
      this.pos.addScaledVector(this.vel, dt);
      const g = this.ph.groundAt(this.pos.x, this.pos.z).y; if (this.pos.y < g + 0.3) this.pos.y = g + 0.3;
      this.pos.y = Math.min(this.pos.y, 2500);
      if (Math.hypot(this.vel.x, this.vel.z) > 0.5) this.yaw = Math.atan2(-this.vel.x, -this.vel.z);
      speedNow = this.vel.length(); this.onGround = false;
    } else if (this.mode === 'bike') {
      const maxS = inp.sprint ? 15 : 9.5;
      const target = inp.f > 0 ? maxS * inp.f : inp.f < 0 ? -2.5 : 0;
      const acc = inp.f < 0 && this.bikeSpeed > 0 ? 9 : target > this.bikeSpeed ? 3.5 : 2.2;
      this.bikeSpeed += clamp(target - this.bikeSpeed, -acc * dt, acc * dt);
      // steering toward camera-relative input direction, or A/D steer
      let steer = 0;
      if (Math.abs(inp.f) + Math.abs(inp.s) > 0.1) { const wantYaw = Math.atan2(-(fwd.x * inp.f + right.x * inp.s), -(fwd.z * inp.f + right.z * inp.s)); if (inp.f >= -0.1) steer = clamp(angDiff(this.yaw, wantYaw), -1, 1); }
      const turnRate = 1.9 / (1 + this.bikeSpeed * 0.08);
      this.yaw += steer * turnRate * dt * Math.min(1, Math.abs(this.bikeSpeed) / 1.5 + 0.2);
      this.lean += (-steer * Math.min(1, this.bikeSpeed / 8) * 0.35 - this.lean) * Math.min(1, dt * 5);
      this.vel.x = -Math.sin(this.yaw) * this.bikeSpeed; this.vel.z = -Math.cos(this.yaw) * this.bikeSpeed;
      this._groundMove(dt, inp, true);
      speedNow = Math.abs(this.bikeSpeed);
      this.bikeDist += this.bikeSpeed * dt; this.pedal += (this.bikeSpeed / 0.34) * dt * 0.45;
    } else {
      const sp = inp.sprint ? 8.0 : 4.2;
      const want = new THREE.Vector3().addScaledVector(fwd, inp.f).addScaledVector(right, inp.s).multiplyScalar(sp);
      const a = this.onGround ? 14 : 3;
      this.vel.x += clamp(want.x - this.vel.x, -a * dt, a * dt); this.vel.z += clamp(want.z - this.vel.z, -a * dt, a * dt);
      const hs = Math.hypot(this.vel.x, this.vel.z);
      if (hs > 0.3) { const ty = this.view === 'first' ? this.camYaw : Math.atan2(-this.vel.x, -this.vel.z); this.yaw += angDiff(this.yaw, ty) * Math.min(1, dt * 10); }
      if (this.view === 'first') this.yaw = this.camYaw;
      this._groundMove(dt, inp, false);
      speedNow = Math.hypot(this.vel.x, this.vel.z);
    }
    // avatar & bike transforms
    const av = this.avatar; av.root.position.copy(this.pos); av.root.rotation.set(0, this.yaw, 0);
    av.pedal = this.pedal; av.animate(dt, this.mode === 'bike' ? speedNow : speedNow, this.onGround, this.mode);
    if (this.mode === 'bike') { this.bike.root.position.copy(this.pos); this.bike.root.rotation.set(0, this.yaw, this.lean); av.root.rotation.z = this.lean; av.root.position.y += 0.38; av.root.position.addScaledVector(new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), -0.12); this.bike.animate(this.bikeDist, this.pedal); }
    av.root.visible = this.view === 'third' || this.mode === 'fly';
    if (plugin && plugin.pose) plugin.pose(this, av, dt);
    av.finalize && av.finalize(dt, this); // r5-avatar: retarget proxy pose to the skinned body
    this.speed = speedNow;
    this._camera(dt);
    // interactions
    let best = null, bd = 1e9;
    for (const it of this.interactions) { const d = Math.hypot(it.pos[0] - this.pos.x, it.pos[2] - this.pos.z); const dy = Math.abs(it.pos[1] - this.pos.y); if (d < (it.radius || 2.5) && dy < 4 && d < bd) { best = it; bd = d; } }
    this.activeInteraction = best;
  }
  _groundMove(dt, inp, bike) {
    if (this.jumpReq) { if (this.onGround && !bike) { this.vel.y = 6.6; this.onGround = false; } this.jumpReq = false; }
    this.vel.y -= 22 * dt;
    let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt; let ny = this.pos.y + this.vel.y * dt;
    const res = this.ph.resolve(nx, nz, bike ? 0.45 : 0.32, this.pos.y, 1.7);
    if (res[2] && bike) this.bikeSpeed *= 0.6;
    nx = res[0]; nz = res[1];
    const g = this.ph.groundAt(nx, nz, this.pos.y + 0.65);
    if (ny <= g.y + 0.02 || (this.onGround && this.vel.y <= 0 && ny - g.y < 0.7)) {
      // landing or walking: follow ground (step up to 0.65 m)
      if (!this.onGround && this.airTime > 0.35 && this.onLand) this.onLand(this.airTime);
      ny = g.y; this.vel.y = 0; this.onGround = true; this.airTime = 0;
    } else { this.onGround = false; this.airTime += dt; }
    // step sounds
    const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    if (this.onGround && !bike) { this.stepDist += moved; const stride = 0.75 + Math.min(1, Math.hypot(this.vel.x, this.vel.z) / 8) * 0.6; if (this.stepDist > stride) { this.stepDist = 0; this.onStep && this.onStep(g.on ? 'stone' : 'ground'); } }
    if (ny < -50) { ny = this.ph.groundAt(nx, nz).y; this.vel.y = 0; }
    this.pos.set(nx, ny, nz); this.surface = g.on;
  }
  _camera(dt) {
    const cam = this.camera;
    this.camDist += (this.camDistT - this.camDist) * Math.min(1, dt * 6);
    const head = new THREE.Vector3(this.pos.x, this.pos.y + (this.mode === 'bike' ? 1.75 : 1.6), this.pos.z);
    if (this.view === 'first' && this.mode !== 'fly') {
      const sp = this.speed || 0; this.headBob += dt * (sp > 0.3 && this.onGround ? (5 + sp) : 0);
      const bob = this.mode === 'walk' ? Math.sin(this.headBob * 2) * 0.035 * Math.min(1, sp / 4) : 0;
      cam.position.set(head.x, head.y + 0.05 + bob, head.z);
      cam.rotation.set(this.camPitch, this.camYaw, 0, 'YXZ');
      return;
    }
    const dist = this.mode === 'fly' ? Math.max(this.camDist, 6) : this.camDist;
    const dir = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch), -Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch));
    const target = head.clone().add(new THREE.Vector3(0, 0.25, 0));
    let d = dist;
    // horizontal wall collision
    const hl = Math.hypot(dir.x, dir.z);
    if (hl > 0.01) { const wd = this.ph.rayWall(target.x, target.z, target.y + dir.y * d * 0.5, dir.x / hl, dir.z / hl, d * hl); d = Math.min(d, Math.max(0.6, wd / hl - 0.3)); }
    const p = target.clone().addScaledVector(dir, d);
    const gy = this.ph.groundAt(p.x, p.z, p.y + 0.5).y; if (p.y < gy + 0.4) p.y = gy + 0.4;
    this.camPos.lerp(p, Math.min(1, dt * 18)); if (this.camPos.distanceToSquared(p) > 100) this.camPos.copy(p);
    cam.position.copy(this.camPos);
    cam.lookAt(target);
  }
}
