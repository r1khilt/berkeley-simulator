// r5-avatar: the player's skinned body. A near-LOD person from src/people (the same skinned body, clothes and hair the NPCs
// wear) driven by mocap clips instead of the old procedural cycle:
//   - ground: idle / walk / jog / sprint in a 1-D blend space keyed by real ground speed. The loops share one gait phase,
//     aligned on the left-foot strike, and the phase advances by distance / blended stride, so feet don't slide;
//   - air: jump take-off -> tuck -> fall loop, an additive landing dip scaled by impact speed;
//   - fly: tread-water hover when slow, a Superman glide when fast; bike: seated pedalling with IK onto the cranks/bars;
//   - plugin modes (scooter, hoverboard, horse, grapple) keep posing the old procedural rig (av.p) as an invisible proxy and
//     this file retargets it: pelvis + spine copied, hands and feet IK'd onto the proxy's wrists / ankles;
//   - layers: turn bank, accel lean, head looks where the camera looks, foot IK onto steps and slopes.
import * as THREE from 'three';

const BASE = (import.meta.env && import.meta.env.BASE_URL || '/') + 'assets/people/';
const UAL_LEG = 0.4003 + 0.4295; // UAL mannequin thigh + shin (clip strides scale with leg length)
const FINGER = /^(index|middle|ring|pinky|thumb)_/;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (k, dt) => 1 - Math.exp(-k * dt);
// Natural ground speed of the UAL loops at mannequin scale (stance-foot speed measured by forward kinematics) and the phase
// of the left-foot strike in each loop, so the loops can share one gait phase.
const GAIT = { Walk_Loop: 0.98, Jog_Fwd_Loop: 5.5, Sprint_Loop: 8.4 };
const STRIKE = { Walk_Loop: 0.079, Jog_Fwd_Loop: 0.046, Sprint_Loop: 0.062 };
const DBG = typeof location !== 'undefined' ? (new URLSearchParams(location.search).get('avdbg') || '') : ''; // e.g. ?avdbg=nolean,nolook,nofoot
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), v5 = new THREE.Vector3();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion(), qI = new THREE.Quaternion();
const m1 = new THREE.Matrix4();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const QFLIP = new THREE.Quaternion().setFromAxisAngle(Y, Math.PI); // people characters: bind space faces +z, the game faces -z

// ---------------------------------------------------------------- extra clips (public/assets/people/anims-player.bin)
let _clips = null;
export function loadPlayerClips() {
  return _clips || (_clips = fetch(BASE + 'anims-player.bin').then((r) => { if (!r.ok) throw new Error('anims-player.bin ' + r.status); return r.arrayBuffer(); }).then(parseClips));
}
function parseClips(buf) { // same layout as anims.bin (tools/player_anims.mjs)
  const dv = new DataView(buf); const jl = dv.getUint32(0, true);
  const J = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, jl)));
  let off = 4 + jl; const T = new Float32Array(buf, off, J.nt); off += J.nt * 4; const V = new Float32Array(buf, off, J.nv); off += J.nv * 4; const Q = new Int16Array(buf, off, J.nq);
  const out = {};
  for (const c of J.clips) {
    const tracks = [];
    for (const t of c.tracks) {
      if (FINGER.test(t.b)) continue; // hands keep the character's relaxed / grip curl
      const times = T.slice(t.t, t.t + t.n);
      if (t.p === 'q') { const v = new Float32Array(t.n * 4); for (let i = 0; i < t.n; i++) { const x = Q[t.o + i * 4] / 32767, y = Q[t.o + i * 4 + 1] / 32767, z = Q[t.o + i * 4 + 2] / 32767, w = Q[t.o + i * 4 + 3] / 32767; const l = Math.hypot(x, y, z, w) || 1; v[i * 4] = x / l; v[i * 4 + 1] = y / l; v[i * 4 + 2] = z / l; v[i * 4 + 3] = w / l; } tracks.push(new THREE.QuaternionKeyframeTrack(t.b + '.quaternion', times, v)); }
      else tracks.push(new THREE.VectorKeyframeTrack(t.b + '.position', times, V.slice(t.o, t.o + t.n * 3)));
    }
    out[c.name] = new THREE.AnimationClip(c.name, c.duration, tracks);
  }
  return out;
}
// UAL clip onto a UBC body (same skeleton): only the pelvis height scales with leg length (as src/people/assets.js does)
export function scalePelvis(clip, k) {
  const tracks = clip.tracks.map((t) => { if (!t.name.endsWith('.position')) return t; const v = t.values.slice(); for (let i = 0; i < v.length; i++) v[i] *= k; return new THREE.VectorKeyframeTrack(t.name, t.times, v); });
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

// ---------------------------------------------------------------- body
export class PlayerBody {
  // char: a src/people Character (or anything shaped like it: root, inner, model, bones by UE name, mixer, actions,
  // aim(), ik2(), setHands()); extra: clips keyed by UAL name, already fitted to this body
  constructor(char, extra = {}) {
    this.c = char; this.b = char.bones; this.mixer = char.mixer;
    this.root = new THREE.Group(); this.root.name = 'avatar:body'; this.root.add(char.root); char.root.visible = true;
    char.root.position.set(0, 0, 0); char.root.rotation.set(0, 0, 0);
    this.A = Object.assign({}, char.actions);
    for (const [n, clip] of Object.entries(extra)) { if (this.A[n]) continue; const a = this.mixer.clipAction(clip); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.A[n] = a; }
    if (extra.Jump_Land) { // additive landing dip (relative to the touch-down frame) layered over whatever the legs are doing
      const add = THREE.AnimationUtils.makeClipAdditive(extra.Jump_Land.clone(), 0); add.name = 'Land_Add';
      const a = this.mixer.clipAction(add); a.blendMode = THREE.AdditiveAnimationBlendMode; a.enabled = true; a.setEffectiveWeight(0); a.play(); this.A.Land_Add = a; }
    for (const a of Object.values(this.A)) { a.timeScale = 0; a.time = 0; a.setEffectiveWeight(0); }
    this.w = {}; this.wt = {}; for (const n in this.A) { this.w[n] = 0; this.wt[n] = 0; }
    // rest measurements in character space (feet at y = 0, facing -z)
    char.root.updateMatrixWorld(true); const inv = m1.copy(char.root.matrixWorld).invert();
    const P = (n) => this.b[n].getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
    const legL = P('thigh_l').distanceTo(P('calf_l')) + P('calf_l').distanceTo(P('foot_l'));
    this.legLen = legL; this.k = legL / UAL_LEG; this.ankleH = Math.max(0.05, P('foot_l').y - Math.min(P('ball_l').y, 0) * 0); this.footLen = P('foot_l').distanceTo(P('ball_l'));
    this.armLen = P('upperarm_l').distanceTo(P('lowerarm_l')) + P('lowerarm_l').distanceTo(P('hand_l'));
    this.hipW = P('thigh_l').distanceTo(P('thigh_r')); this.pelvisRestY = P('pelvis').y;
    this.restQ = {}; char.root.getWorldQuaternion(q2).invert();
    for (const n of ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'foot_l', 'foot_r']) this.restQ[n] = this.b[n].getWorldQuaternion(new THREE.Quaternion()).premultiply(q2);
    this._calibrate(inv);
    this.boneList = Object.values(this.b); this.saved = this.boneList.map((bn) => ({ q: bn.quaternion.clone(), p: bn.position.clone(), s: bn.scale.clone() }));
    this.phase = 0; this.t = 0; this.air = 0; this.airK = 0; this.jumpT = -1; this.fallT = 0; this.landT = -1; this.landW = 0; this.prevGround = true; this.vyPrev = 0;
    this.lean = 0; this.pitch = 0; this.headYaw = 0; this.headPitch = 0; this.prevYaw = null; this.prevPos = new THREE.Vector3(); this.hasPrev = false; this.spd = 0; this.acc = 0;
    this.footOff = { l: 0, r: 0 }; this.pelvisOff = 0; this.flyK = 0; this.flyFast = 0; this.bikeK = 0; this.proxyK = 0; this.mode = 'walk';
    this.gripK = -1; this.setGrip(0);
  }
  // gait loops: phase of the left foot's furthest-forward point (so walk / jog / sprint blend in step); seated pelvis offset
  _calibrate(inv) {
    const c = this.c, A = this.A, b = this.b; const solo = (n, t) => { for (const k in A) { const a = A[k]; a.setEffectiveWeight(k === n ? 1 : 0); a.enabled = k === n; } A[n].time = t; this.mixer.update(0); c.root.updateMatrixWorld(true); };
    this.strike = {};
    for (const n of ['Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop']) { if (!A[n]) continue; const d = A[n].getClip().duration; let best = 1e9, bt = 0;
      for (let i = 0; i < 64; i++) { const t = (i / 64) * d; solo(n, t); const z = v1.copy(b.foot_l.getWorldPosition(v1)).applyMatrix4(inv).z - b.pelvis.getWorldPosition(v2).applyMatrix4(inv).z; if (z < best) { best = z; bt = t; } }
      this.strike[n] = bt / d; }
    if (A.Sitting_Idle_Loop) { solo('Sitting_Idle_Loop', 0); b.pelvis.getWorldPosition(v1).applyMatrix4(inv); this.sitOff = { seat: v1.y - 0.1, back: v1.z }; } else this.sitOff = { seat: 0.5, back: 0.1 };
    for (const k in A) { A[k].setEffectiveWeight(0); A[k].enabled = true; }
  }
  setGrip(k) { if (Math.abs(k - this.gripK) < 0.02) return; this.gripK = k; const c = this.c; if (c.setHands) c.setHands(c.curl != null ? c.curl + (0.85 - c.curl) * k : 0.3 + 0.55 * k); }
  fade(n, k) { if (n in this.wt) this.wt[n] += k; }
  // st: { mode, onGround, airTime, proxy (av.p), avRoot, player, view } -- called once per frame after the controller and any
  // mode plugin have placed avatar.root (and posed the proxy)
  update(dt, st) {
    dt = Math.min(dt, 0.1); this.t += dt; const A = this.A, b = this.b;
    const mode = st.mode || 'walk'; this.mode = mode;
    const pl = st.player || null;
    // ---- motion from the avatar root (works with any controller): horizontal speed, vertical speed, yaw rate
    const avRoot = st.avRoot; avRoot.updateMatrixWorld(true); avRoot.getWorldPosition(v1);
    let hs = 0, vy = 0, yawRate = 0;
    if (pl && pl.vel) { hs = Math.hypot(pl.vel.x, pl.vel.z); vy = pl.vel.y; }
    else if (this.hasPrev && dt > 0) { hs = Math.hypot(v1.x - this.prevPos.x, v1.z - this.prevPos.z) / dt; vy = (v1.y - this.prevPos.y) / dt; }
    if (mode === 'bike' && pl) hs = Math.abs(pl.bikeSpeed || hs);
    const yaw = pl ? pl.yaw : avRoot.rotation.y;
    if (this.prevYaw != null && dt > 0) { let d = yaw - this.prevYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yawRate = d / dt; }
    this.prevYaw = yaw; this.prevPos.copy(v1); this.hasPrev = true;
    const spdPrev = this.spd; this.spd += (hs - this.spd) * damp(12, dt); this.acc += ((this.spd - spdPrev) / Math.max(dt, 1e-3) - this.acc) * damp(6, dt);
    const ground = !!st.onGround, onFoot = mode === 'walk';
    for (const n in this.wt) this.wt[n] = 0;
    // ---- which layer drives the body
    const proxyMode = !(mode === 'walk' || mode === 'fly' || mode === 'bike');
    this.proxyK += ((proxyMode ? 1 : 0) - this.proxyK) * damp(14, dt); if (!proxyMode && this.proxyK < 0.02) this.proxyK = 0; if (proxyMode) this.proxyK = 1;
    this.flyK += ((mode === 'fly' ? 1 : 0) - this.flyK) * damp(6, dt);
    this.bikeK = mode === 'bike' ? 1 : 0;
    // ---- air state (on foot only)
    if (onFoot) {
      if (this.prevGround && !ground && vy > 2) { this.jumpT = 0; this.jumpRun = sstep(2.5, 5.5, this.spd); this.jumpPhase = this.phase; }
      if (!ground) { if (this.jumpT >= 0) this.jumpT += dt; else this.fallT += dt; }
      if (ground && !this.prevGround) { // touch-down: dip harder the faster we come down
        const impact = Math.max(0, -this.vyPrev); const big = (st.airTime || 0) > 0.25 || this.jumpT >= 0;
        if (big) { this.landT = 0; this.landW = clamp((impact - 2.5) / 9, 0.18, 1) * (this.spd > 2 ? 0.55 : 1); }
        this.jumpT = -1; this.fallT = 0; }
      const wantAir = !ground && (this.jumpT >= 0 || this.fallT > 0.16);
      this.airK += ((wantAir ? 1 : 0) - this.airK) * damp(wantAir ? (this.jumpT >= 0 ? 22 : 9) : 18, dt);
    } else { this.airK = 0; this.jumpT = -1; this.fallT = 0; this.landT = -1; }
    this.prevGround = ground; this.vyPrev = vy;
    const groundK = 1 - this.airK;
    // ---- locomotion blend space (also the base under plugin modes / landing)
    const k = this.k, vW = GAIT.Walk_Loop * k, vJ = GAIT.Jog_Fwd_Loop * k, vS = GAIT.Sprint_Loop * k;
    const v = onFoot ? this.spd : 0;
    let wI = 0, wW = 0, wJ = 0, wS = 0;
    if (v < vW) { wW = sstep(0.04, 0.55, v); wI = 1 - wW; } // idle -> walk: the walk takes over by ~0.5 m/s (played slower)
    else if (v < vJ) { wJ = (v - vW) / (vJ - vW); wW = 1 - wJ; }
    else if (v < vS) { wS = (v - vJ) / (vS - vJ); wJ = 1 - wS; }
    else wS = 1;
    const dW = A.Walk_Loop.getClip().duration, dJ = A.Jog_Fwd_Loop.getClip().duration, dS = A.Sprint_Loop ? A.Sprint_Loop.getClip().duration : dJ;
    if (!A.Sprint_Loop) { wJ += wS; wS = 0; }
    const L = (wW * vW * dW + wJ * vJ * dJ + wS * vS * dS) / Math.max(1e-3, wW + wJ + wS); // blended stride per cycle (m)
    let f = v > 0.02 ? v / Math.max(0.3, L * (wW + wJ + wS > 0 ? 1 : 1)) : 0;
    if (v < vW) f = Math.max(f, wW > 0 ? 0.55 / dW : 0); // slow shuffles still step at >= 55% of the walk cadence
    f = Math.min(f, 1.55 / dS); // superhuman speeds: cap the cadence, let the feet slip
    const freezeLegs = this.airK > 0.5 && this.jumpT >= 0; // running jump keeps the stride it left the ground with
    if (!freezeLegs) this.phase = (this.phase + f * dt) % 1;
    // weights: locomotion scaled by groundK (air) and by how much on-foot movement is in charge
    const footK = groundK * (1 - this.flyK) * (1 - this.bikeK) * (1 - this.proxyK);
    const runAir = this.jumpT >= 0 ? (this.jumpRun || 0) * 0.6 : 0; // stride kept under a running jump (a leap, not a tuck)
    this.fade('Idle_Loop', wI * footK + (this.proxyK) * (1 - this.flyK));
    this.fade('Walk_Loop', wW * (footK + this.airK * runAir));
    this.fade('Jog_Fwd_Loop', wJ * (footK + this.airK * runAir));
    if (A.Sprint_Loop) this.fade('Sprint_Loop', wS * (footK + this.airK * runAir));
    // air: take-off (skipping the crouch the game has no time for) -> tuck -> fall loop
    const airK = this.airK * (1 - this.flyK) * (1 - this.bikeK) * (1 - this.proxyK) * (1 - runAir);
    if (airK > 0.001 && A.Jump_Start && A.Jump_Loop) {
      let s = 0; if (this.jumpT >= 0) { const jt = 0.07 + this.jumpT * 1.35; s = sstep(0.95, 1.25, jt); A.Jump_Start.time = Math.min(jt, A.Jump_Start.getClip().duration - 0.01); } else s = 1;
      this.fade('Jump_Start', airK * (1 - s)); this.fade('Jump_Loop', airK * s);
      A.Jump_Loop.time = (this.t * 0.8) % A.Jump_Loop.getClip().duration;
    } else if (airK > 0.001) this.fade('Idle_Loop', airK);
    // fly: hover (tread water) when slow, glide when fast
    if (this.flyK > 0.001) {
      const fs = sstep(4, 14, hs); this.flyFast += (fs - this.flyFast) * damp(4, dt);
      // hover: a calm float (idle upper body, the fall loop's loose legs); the treading-water clip read as a T-pose
      const hov = this.flyK * (1 - this.flyFast);
      this.fade('Idle_Loop', hov);
      if (A.Swim_Fwd_Loop) { this.fade('Swim_Fwd_Loop', this.flyK * this.flyFast); A.Swim_Fwd_Loop.time = (this.t * 0.45) % A.Swim_Fwd_Loop.getClip().duration; } else this.fade('Jump_Loop', this.flyK * this.flyFast);
    }
    // bike: seated base clip, legs and arms by IK below
    if (this.bikeK > 0) this.fade('Sitting_Idle_Loop', this.bikeK);
    // landing: additive dip, ~0.6 s
    let landK = 0;
    if (this.landT >= 0) { this.landT += dt; const lt = this.landT * (this.spd > 2 ? 1.6 : 1.15); landK = this.landW * sstep(0, 0.05, lt) * (1 - sstep(0.45, 0.95, lt)); if (A.Land_Add) A.Land_Add.time = Math.min(lt, 1.2); if (lt > 1) this.landT = -1; }
    // ---- apply weights (normalised to 1 over the override clips so nothing blends toward the bind pose)
    let tot = 0; for (const n in this.wt) if (n !== 'Land_Add') tot += this.wt[n];
    if (tot < 1e-4) { this.wt.Idle_Loop = 1; tot = 1; }
    for (const n in A) { const a = A[n]; const w = n === 'Land_Add' ? landK * groundK * (1 - this.proxyK) * (1 - this.flyK) : this.wt[n] / tot; a.enabled = w > 0.0005; a.setEffectiveWeight(a.enabled ? w : 0); }
    // loop times: gait loops follow the shared phase; idles and seats run on the clock
    const gt = (n) => { const a = A[n]; if (!a) return; const d = a.getClip().duration; a.time = (((this.phase + (this.strike[n] ?? STRIKE[n] ?? 0)) % 1) + 1) % 1 * d; };
    gt('Walk_Loop'); gt('Jog_Fwd_Loop'); gt('Sprint_Loop');
    for (const n of ['Idle_Loop', 'Sitting_Idle_Loop']) if (A[n]) A[n].time = (this.t + 0.37) % A[n].getClip().duration;
    // three's PropertyMixer only writes a bone when its blended value changed since the last evaluation, so restore the
    // pure animated pose first: otherwise this frame's procedural layers would stack on top of last frame's
    for (let i = 0; i < this.boneList.length; i++) { const bn = this.boneList[i], s0 = this.saved[i]; bn.quaternion.copy(s0.q); bn.position.copy(s0.p); bn.scale.copy(s0.s); }
    this.mixer.update(0); // times are set explicitly (timeScale 0): evaluate the pose
    for (let i = 0; i < this.boneList.length; i++) { const bn = this.boneList[i], s0 = this.saved[i]; s0.q.copy(bn.quaternion); s0.p.copy(bn.position); s0.s.copy(bn.scale); }
    // ---- body frame: identity on foot; the bike's frame when riding (the controller lifts avatar.root for the old rig)
    const c = this.c, frame = this.root; frame.position.set(0, 0, 0); frame.quaternion.identity(); c.inner.position.set(0, 0, 0); c.inner.quaternion.copy(QFLIP);
    if (mode === 'bike' && pl && pl.bike) { pl.bike.root.updateMatrixWorld(true); m1.copy(avRoot.matrixWorld).invert().multiply(pl.bike.root.matrixWorld); m1.decompose(frame.position, frame.quaternion, v2); }
    // fly: the swim clips assume a water line at y = 0 -- lift the pelvis to standing height and pitch the body about its
    // middle toward the flight path (Swim_Fwd is already horizontal; the controller also pitches avatar.root)
    if (this.flyK > 0.001) {
      const rootPitch = avRoot.rotation.x || 0, fk = this.flyK, ff = this.flyFast;
      // glide at ~65 deg from upright (the chase camera sits above and behind: it should see the back, not just soles)
      const want = -0.12 * (1 - ff) - 1.05 * ff, clipPitch = -Math.PI / 2 * ff;
      const pivot = (1.0 + 0.45 * ff) * fk; frame.position.y += pivot; frame.quaternion.setFromAxisAngle(X, (want - clipPitch - rootPitch) * fk);
      c.inner.position.y += -pivot + (0.25 * (1 - ff) + (1.08 * this.k) * ff) * fk + Math.sin(this.t * 1.7) * 0.035 * fk * (1 - ff); // feet hang ~25 cm above the root when hovering
    }    c.root.updateMatrixWorld(true);
    // ---- procedural layers
    if (footK > 0.5 && this.c._armsIn) this._armsIn(this.spd > 3 ? 'jog' : 'walk'); // people code: pull hanging arms in toward the body
    if ((footK > 0.01 || this.airK > 0.01) && !DBG.includes('nolean')) this._lean(dt, yawRate, footK + this.airK * 0.5);
    if (this.flyK > 0.5 && this.flyFast > 0.3) this._superman(this.flyFast * this.flyK);
    if (this.flyK > 0.05 && this.flyFast < 0.7) this._hover(this.flyK * (1 - this.flyFast));
    if (this.bikeK > 0 && pl) this._bike(pl);
    if (this.proxyK > 0.5 && st.proxy) this._retarget(st.proxy);
    if (onFoot && ground && pl && pl.ph && footK > 0.3 && !DBG.includes('nofoot')) this._footIK(dt, pl, footK); else { this.footOff.l = this.footOff.r = this.pelvisOff = 0; }
    if (!DBG.includes('nolook')) this._look(dt, st, mode);
    this.dbg = { v, wI, wW, wJ, wS, f, phase: this.phase, lean: this.lean, pitch: this.pitch, air: this.airK, land: landK, headYaw: this.headYaw };
    this.setGrip(mode === 'bike' || mode === 'scooter' || mode === 'horse' ? 1 : 0);
    if (this.c.pack) this._pack(); // Rocketbox characters carry a rigid backpack placed after the pose
  }
  _armsIn(mode) { const c = this.c; if (c.phoneK == null) c.phoneK = 0; c._armsIn(mode); }
  // RBCharacter's backpack (same placement as rocketbox.js, which only runs inside the NPC update)
  _pack() {
    const c = this.c, b = this.b; const on = !!this.packOn; c.pack.visible = on; for (const s of c.straps) s.visible = on; if (!on) return;
    const S = b.spine_03.getWorldPosition(new THREE.Vector3()), N = b.neck_01.getWorldPosition(new THREE.Vector3()); const up = N.clone().sub(S).normalize();
    c.root.getWorldQuaternion(q1); const back = new THREE.Vector3(0, 0, 1).applyQuaternion(q1); back.addScaledVector(up, -back.dot(up)).normalize();
    const right = new THREE.Vector3().crossVectors(up, back).normalize();
    const P = S.clone().addScaledVector(back, ((c.av && c.av.backDepth) || 0.12) + 0.07).addScaledVector(up, -0.1);
    m1.makeBasis(right, up, back); const q = new THREE.Quaternion().setFromRotationMatrix(m1);
    c.root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(c.root.matrixWorld).invert(); const rq = q1.clone().invert();
    c.pack.position.copy(P).applyMatrix4(inv); c.pack.quaternion.copy(rq).multiply(q);
    for (let i = 0; i < 2; i++) { const s = i ? 'r' : 'l'; const cl = b['upperarm_' + s].getWorldPosition(new THREE.Vector3()).lerp(b['clavicle_' + s].getWorldPosition(new THREE.Vector3()), 0.45);
      const top = cl.clone().addScaledVector(up, 0.035); const st = c.straps[i]; const mid = top.clone().addScaledVector(back, -0.03).addScaledVector(up, -0.12);
      st.position.copy(mid).applyMatrix4(inv); const dir = top.clone().sub(mid).normalize(); st.quaternion.copy(rq).multiply(q2.setFromUnitVectors(Y, dir)); st.scale.set(1, 1, 1); }
  }
  // ---------------------------------------------------------------- helpers
  setWorldQ(bone, qWorld) { bone.parent.getWorldQuaternion(q3).invert(); bone.quaternion.copy(q3.multiply(qWorld)); bone.updateMatrixWorld(true); }
  rotWorld(bone, axisW, ang) { q1.setFromAxisAngle(axisW, ang); bone.getWorldQuaternion(q2); this.setWorldQ(bone, q1.multiply(q2)); }
  cw(x, y, z, out = new THREE.Vector3()) { return out.set(x, y, z).applyMatrix4(this.root.matrixWorld); } // body frame -> world
  dw(x, y, z, out = new THREE.Vector3()) { this.root.getWorldQuaternion(q2); return out.set(x, y, z).normalize().applyQuaternion(q2); }
  // turn bank (into the curve), forward lean when accelerating / sprinting, back when braking
  _lean(dt, yawRate, k) {
    const v = this.spd; const bank = clamp(Math.atan2(v * yawRate, 9.81) * 0.8, -0.32, 0.32);
    this.lean += (bank - this.lean) * damp(6, dt);
    const pit = clamp(this.acc * 0.025, -0.12, 0.14) + 0.06 * sstep(5, 9, v);
    this.pitch += (pit - this.pitch) * damp(5, dt);
    if (Math.abs(this.lean) > 1e-3) { this.c.inner.quaternion.premultiply(q1.setFromAxisAngle(Z, this.lean * k)); this.c.inner.updateMatrixWorld(true); }
    if (Math.abs(this.pitch) > 1e-3) this.rotWorld(this.b.spine_01, this.dw(1, 0, 0, v4), -this.pitch * k);
  }
  // head (and a little of the upper spine) turns toward where the camera looks
  _look(dt, st, mode) {
    const pl = st.player; let yawT = 0, pitT = 0;
    if (pl && pl.camYaw != null && st.view !== 'first') {
      let d = pl.camYaw - pl.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      const behind = Math.abs(d) > 2.2; // camera in front of the face: look at it instead of away
      yawT = behind ? 0 : clamp(d, -1.1, 1.1) * (mode === 'walk' ? (this.spd > 3 ? 0.5 : 0.85) : 0.5);
      pitT = clamp((pl.camPitch || 0) + 0.12, -0.5, 0.45) * 0.55;
    }
    if (this.flyK > 0.5 || this.proxyK > 0.5) { yawT *= 0.4; pitT *= 0.3; }
    this.headYaw += (yawT - this.headYaw) * damp(4, dt); this.headPitch += (pitT - this.headPitch) * damp(4, dt);
    const b = this.b; const up = this.dw(0, 1, 0, v3);
    if (Math.abs(this.headYaw) > 0.005) { this.rotWorld(b.spine_03, up, this.headYaw * 0.18); this.rotWorld(b.neck_01, up, this.headYaw * 0.35); this.rotWorld(b.Head, up, this.headYaw * 0.47); }
    if (Math.abs(this.headPitch) > 0.005) { const right = this.dw(1, 0, 0, v4); this.rotWorld(b.neck_01, right, this.headPitch * 0.4); this.rotWorld(b.Head, right, this.headPitch * 0.6); }
  }
  // feet onto steps and slopes: each foot's animated lift is kept above the local ground under it (the higher of heel and
  // toe), targets are smoothed in WORLD space (the root snaps down a step at a time), and the pelvis drops for the lower foot
  _footIK(dt, pl, k) {
    const b = this.b; const ph = pl.ph; this.root.updateMatrixWorld(true); const base = this.root.getWorldPosition(v5).y;
    const fy = this.footY || (this.footY = { l: null, r: null }); const need = {}; const T = {};
    for (const s of ['l', 'r']) {
      const A0 = b['foot_' + s].getWorldPosition(new THREE.Vector3()), B0 = b['ball_' + s].getWorldPosition(new THREE.Vector3());
      const heelX = A0.x + (A0.x - B0.x) * 0.25, heelZ = A0.z + (A0.z - B0.z) * 0.25;
      const g = Math.max(ph.groundAt(heelX, heelZ, base + 0.55).y, ph.groundAt(B0.x, B0.z, base + 0.55).y);
      const lift = A0.y - base; // the clip's ankle height above the floor plane
      let ty = clamp(g - base, -0.5, 0.5) + base + lift;
      if (fy[s] == null || Math.abs(fy[s] - ty) > 0.6) fy[s] = ty; else fy[s] += (ty - fy[s]) * damp(lift < this.ankleH + 0.04 ? 30 : 16, dt);
      T[s] = A0; need[s] = fy[s] - A0.y; }
    const drop = Math.min(0, need.l, need.r); this.pelvisOff += (drop - this.pelvisOff) * damp(12, dt);
    this.footOff.l = need.l; this.footOff.r = need.r;
    if (Math.abs(need.l) + Math.abs(need.r) + Math.abs(this.pelvisOff) < 0.004) return;
    const up = this.dw(0, 1, 0, v3);
    this.c.inner.position.y += this.pelvisOff * k; this.c.inner.updateMatrixWorld(true); // pelvis down: the whole skeleton follows
    for (const s of ['l', 'r']) {
      const Tw = b['foot_' + s].getWorldPosition(new THREE.Vector3()); Tw.y = Tw.y + (fy[s] - (T[s].y + this.pelvisOff * k)) * k; // lowered ankle -> its target
      const knee = b['calf_' + s].getWorldPosition(new THREE.Vector3()), hip = b['thigh_' + s].getWorldPosition(new THREE.Vector3());
      const pole = knee.sub(hip.lerp(Tw, 0.5)); if (pole.lengthSq() < 1e-6) pole.copy(this.dw(0, 0, -1, v4)); pole.normalize();
      const fq = b['foot_' + s].getWorldQuaternion(new THREE.Quaternion());
      this.c.ik2(b['thigh_' + s], b['calf_' + s], b['foot_' + s], Tw, pole, 1);
      this.setWorldQ(b['foot_' + s], fq); // keep the animated foot angle
    }
  }
  // Superman glide: right fist forward past the head, left arm back along the side, legs long -- in the BODY's axes (the
  // swim clip lies the body down inside the frame, so frame axes would point the fist at the sky)
  _superman(k) {
    const c = this.c, b = this.b; const d = new THREE.Vector3();
    const P0 = b.pelvis.getWorldPosition(new THREE.Vector3()), N0 = b.neck_01.getWorldPosition(new THREE.Vector3());
    const head = N0.sub(P0).normalize(); const right = this.dw(1, 0, 0, new THREE.Vector3()); right.addScaledVector(head, -right.dot(head)).normalize();
    const back = new THREE.Vector3().crossVectors(right, head).normalize(); // dorsal side (toward the sky in a glide)
    const B = (x, y, z) => d.set(0, 0, 0).addScaledVector(right, x).addScaledVector(head, y).addScaledVector(back, z).normalize();
    c.aim(b.upperarm_r, b.lowerarm_r, B(0.1, 1, -0.12), k); c.aim(b.lowerarm_r, b.hand_r, B(0.02, 1, -0.05), k);
    c.aim(b.upperarm_l, b.lowerarm_l, B(-0.25, -1, 0.15), k); c.aim(b.lowerarm_l, b.hand_l, B(-0.15, -1, 0.2), k);
    for (const s of ['l', 'r']) { const sx = s === 'l' ? -1 : 1; c.aim(b['thigh_' + s], b['calf_' + s], B(sx * 0.05, -1, 0.04), k * 0.7); c.aim(b['calf_' + s], b['foot_' + s], B(sx * 0.03, -1, 0.15), k * 0.7); c.aim(b['foot_' + s], b['ball_' + s], B(0, -1, -0.25), k * 0.6); }
    c.aim(b.neck_01, b.Head, B(0, 0.75, 0.66), k * 0.8); // look ahead, not at the ground
  }
  // hover: upright float, legs together and a little bent, toes down, arms loose off the sides
  _hover(k) {
    const c = this.c, b = this.b; const d = new THREE.Vector3(); const D = (x, y, z) => this.dw(x, y, z, d);
    const sw = Math.sin(this.t * 1.3) * 0.06;
    for (const s of ['l', 'r']) { const sx = s === 'l' ? -1 : 1;
      c.aim(b['thigh_' + s], b['calf_' + s], D(sx * 0.07, -1, -0.22 - (s === 'l' ? 0.16 : 0) + sw), k); c.aim(b['calf_' + s], b['foot_' + s], D(sx * 0.03, -1, 0.3 + (s === 'l' ? 0.22 : 0)), k); c.aim(b['foot_' + s], b['ball_' + s], D(0, -0.8, -0.6), k);
      c.aim(b['upperarm_' + s], b['lowerarm_' + s], D(sx * 0.38, -0.92, 0.12), k * 0.8); c.aim(b['lowerarm_' + s], b['hand_' + s], D(sx * 0.25, -0.75, -0.6), k * 0.8); }
  }
  // bike (src/player/avatar.js Bike): saddle top (0, 0.905, 0.24); grips (+-0.2, 0.94, -0.36); cranks r 0.17 about (0, 0.3, 0.05)
  _bike(pl) {
    const c = this.c, b = this.b; const pedal = pl.pedal || 0;
    // seat the pelvis on the saddle (the sitting clip's pelvis sits at sitOffset.seat above its feet)
    const seat = this.sitOff.seat, back = this.sitOff.back;
    c.inner.position.set(0, 0.905 + 0.02 - seat, 0.26 - back); c.root.updateMatrixWorld(true);
    // lean over the bars
    this.rotWorld(b.spine_01, this.dw(1, 0, 0, v4), -0.38); this.rotWorld(b.spine_03, this.dw(1, 0, 0, v4), -0.08); this.rotWorld(b.neck_01, this.dw(1, 0, 0, v4), 0.32);
    const fwd = this.dw(0, 0, -1, new THREE.Vector3()), up = this.dw(0, 1, 0, new THREE.Vector3()), down = up.clone().negate();
    for (const [s, sx, ph] of [['l', -1, Math.PI], ['r', 1, 0]]) {
      const a = pedal + ph; // the crank turns by -pedal about x; pedal s at (0.1s, 0.17s, 0) in crank space
      const py = 0.3 + 0.17 * Math.cos(a), pz = 0.05 - 0.17 * Math.sin(a);
      const T = this.cw(sx * 0.105, py + 0.07, pz + 0.075);
      c.ik2(b['thigh_' + s], b['calf_' + s], b['foot_' + s], T, fwd.clone().addScaledVector(up, 0.25).addScaledVector(this.dw(sx, 0, 0, v4), 0.08));
      c.aim(b['foot_' + s], b['ball_' + s], this.dw(0, -0.32 + 0.12 * Math.sin(a), -1, v4), 0.85);
      c.ik2(b['upperarm_' + s], b['lowerarm_' + s], b['hand_' + s], this.cw(sx * 0.2, 0.955, -0.33), down.clone().addScaledVector(fwd, -0.5).add(this.dw(sx, 0, 0, v4).multiplyScalar(0.6)));
    }
  }
  // plugin modes: copy the proxy rig's pelvis + spine, IK hands and feet onto its wrists / ankles
  _retarget(P) {
    const c = this.c, b = this.b; if (!P.hips) return;
    const avRoot = P.hips.parent; avRoot.updateMatrixWorld(true);
    const qRoot = avRoot.getWorldQuaternion(new THREE.Quaternion());
    const w = (o, x, y, z) => o.localToWorld(new THREE.Vector3(x, y, z));
    const ankL = w(P['ft-1'], 0, 0, 0), ankR = w(P.ft1, 0, 0, 0), hipL = w(P['hip-1'], 0, 0, 0), hipR = w(P.hip1, 0, 0, 0);
    // pelvis height: keep the proxy's hip-to-ankle geometry, scaled to this body's leg length (proxy legs 0.45 + 0.44)
    const r = this.legLen / 0.89; const am = ankL.clone().add(ankR).multiplyScalar(0.5), hm = hipL.clone().add(hipR).multiplyScalar(0.5);
    const want = am.clone().add(hm.sub(am).multiplyScalar(r));
    // orientation: proxy hips / spine / neck / head (rest = upright facing -z, same as this body's rest)
    const qH = P.hips.getWorldQuaternion(new THREE.Quaternion()), qS = P.spine.getWorldQuaternion(new THREE.Quaternion()), qN = P.neck ? P.neck.getWorldQuaternion(new THREE.Quaternion()) : qS.clone(), qHd = P.head.getWorldQuaternion(new THREE.Quaternion());
    // a proxy part's world rotation R = qRoot * local; the bone's rest is restQ (character space), so bone = R * restQ
    const setRel = (bone, qProxy, n) => this.setWorldQ(bone, new THREE.Quaternion().copy(qProxy).multiply(this.restQ[n]));
    setRel(b.pelvis, qH, 'pelvis');
    // place the pelvis: shift the inner group so the pelvis bone lands at `want` (+ the body's own hip-joint offset)
    b.thigh_l.getWorldPosition(v1); b.thigh_r.getWorldPosition(v2); const hipMid = v1.add(v2).multiplyScalar(0.5);
    const delta = want.sub(hipMid); c.inner.parent.updateMatrixWorld(true); const pinv = new THREE.Matrix4().copy(c.inner.parent.matrixWorld).invert();
    const p0 = c.inner.getWorldPosition(new THREE.Vector3()).add(delta).applyMatrix4(pinv); c.inner.position.copy(p0); c.inner.updateMatrixWorld(true);
    setRel(b.spine_01, new THREE.Quaternion().copy(qH).slerp(qS, 0.45), 'spine_01');
    setRel(b.spine_02, new THREE.Quaternion().copy(qH).slerp(qS, 0.75), 'spine_02');
    setRel(b.spine_03, qS, 'spine_03');
    setRel(b.neck_01, new THREE.Quaternion().copy(qS).slerp(qN, 0.6), 'neck_01');
    setRel(b.Head, qHd, 'Head');
    // limbs
    for (const [s, ps] of [['l', '-1'], ['r', '1']]) {
      const hip = P['hip' + ps], kn = P['kn' + ps], ft = P['ft' + ps], sh = P['sh' + ps], el = P['el' + ps];
      const A0 = w(hip, 0, 0, 0), K0 = w(kn, 0, 0, 0), F0 = w(ft, 0, 0, 0);
      const pole = K0.clone().sub(A0.clone().lerp(F0, 0.5)); if (pole.lengthSq() < 1e-6) pole.set(0, 0, -1).applyQuaternion(qRoot); pole.normalize();
      c.ik2(b['thigh_' + s], b['calf_' + s], b['foot_' + s], F0, pole);
      const fq = ft.getWorldQuaternion(new THREE.Quaternion()); const fwd = new THREE.Vector3(0, -0.28, -1).normalize().applyQuaternion(fq);
      c.aim(b['foot_' + s], b['ball_' + s], fwd, 1);
      const S0 = w(sh, 0, 0, 0), E0 = w(el, 0, 0, 0), H0 = w(el, 0, -0.3, 0);
      const apole = E0.clone().sub(S0.clone().lerp(H0, 0.5)); if (apole.lengthSq() < 1e-6) apole.set(0, -0.3, 1).applyQuaternion(qRoot); apole.normalize();
      c.ik2(b['upperarm_' + s], b['lowerarm_' + s], b['hand_' + s], H0, apole);
    }
  }
}
