// r4-people3: realistic near-LOD people from Microsoft Rocketbox (MIT licence, github.com/microsoft/Microsoft-Rocketbox).
// Each avatar is a hand-modelled, rigged person with real clothing, hair cards and a textured face (~7-9k tris, one
// skinned mesh with body / head / hair materials), packed by tools/people_rb_build.mjs into public/assets/people/rb/.
// They replace the procedural Quaternius bodies as the near LOD (index.js) behind the same Character interface:
//   - the Rocketbox rig is a 3ds Max Biped; the clavicles and thighs are re-parented (world transform kept) so the
//     hierarchy matches the UE-style skeleton that character.js's procedural layers (IK, gaze, phone, riders) expect;
//   - the Quaternius UAL clips are retargeted onto every avatar at load (world-space rotation deltas from a
//     direction-matched rest pose, hips scaled by leg length, feet re-grounded), so walking, idle, talking, sitting,
//     cycling and scooter poses all keep working, and the walk stays phase-locked with the far crowd;
//   - RBCharacter borrows Character's per-frame motion code (update, IK, gaze, props) unchanged.
// Avatars load lazily after the world is up; until they arrive, the Quaternius people are used.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Character } from './character.js';

const BASE = (import.meta.env && import.meta.env.BASE_URL || '/') + 'assets/people/rb/';
export const NPC_CLIPS = ['Idle_Loop', 'Idle_Talking_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Hit_Chest'];
const FL = { SLEEVE: 1, PANTS: 2, BACKPACK: 4, SKIRT: 8, BAG: 16, PHONE: 32, BOOK: 64, CUP: 128 };

// UE-style bone names (character.js / the UAL clips) -> Rocketbox Biped names as GLTFLoader sanitizes them
export const RB_MAP = (() => {
  const m = { pelvis: 'Bip01_Pelvis', spine_01: 'Bip01_Spine', spine_02: 'Bip01_Spine1', spine_03: 'Bip01_Spine2', neck_01: 'Bip01_Neck', Head: 'Bip01_Head' };
  for (const [s, S] of [['l', 'L'], ['r', 'R']]) {
    Object.assign(m, { ['clavicle_' + s]: `Bip01_${S}_Clavicle`, ['upperarm_' + s]: `Bip01_${S}_UpperArm`, ['lowerarm_' + s]: `Bip01_${S}_Forearm`, ['hand_' + s]: `Bip01_${S}_Hand`,
      ['thigh_' + s]: `Bip01_${S}_Thigh`, ['calf_' + s]: `Bip01_${S}_Calf`, ['foot_' + s]: `Bip01_${S}_Foot`, ['ball_' + s]: `Bip01_${S}_Toe0` });
    ['thumb', 'index', 'middle', 'ring', 'pinky'].forEach((f, i) => { m[`${f}_01_${s}`] = `Bip01_${S}_Finger${i}`; m[`${f}_02_${s}`] = `Bip01_${S}_Finger${i}1`; m[`${f}_03_${s}`] = `Bip01_${S}_Finger${i}2`; });
  }
  return m;
})();
// the child each bone points at (for the direction-matched rest pose)
const CHILD = { pelvis: 'spine_01', spine_01: 'spine_02', spine_02: 'spine_03', spine_03: 'neck_01', neck_01: 'Head' };
for (const s of ['l', 'r']) {
  Object.assign(CHILD, { ['clavicle_' + s]: 'upperarm_' + s, ['upperarm_' + s]: 'lowerarm_' + s, ['lowerarm_' + s]: 'hand_' + s, ['hand_' + s]: 'middle_01_' + s, ['thigh_' + s]: 'calf_' + s, ['calf_' + s]: 'foot_' + s, ['foot_' + s]: 'ball_' + s });
  for (const f of ['thumb', 'index', 'middle', 'ring', 'pinky']) { CHILD[`${f}_01_${s}`] = `${f}_02_${s}`; CHILD[`${f}_02_${s}`] = `${f}_03_${s}`; }
}
const UE_PARENT = (ue) => { const m = /^(thumb|index|middle|ring|pinky)_0(\d)_([lr])$/.exec(ue); if (!m) return null; return m[2] === '1' ? 'hand_' + m[3] : `${m[1]}_0${+m[2] - 1}_${m[3]}`; };

const wq = (o) => o.getWorldQuaternion(new THREE.Quaternion());
const wp = (o) => o.getWorldPosition(new THREE.Vector3());
const depth = (o) => { let d = 0; while (o.parent) { d++; o = o.parent; } return d; };
function bonesOf(scene) { const by = {}; scene.traverse((o) => { if (o.isBone) by[o.name] = o; }); return by; }
function ueBones(by, map) { const b = {}; for (const [ue, n] of Object.entries(map)) if (by[n]) b[ue] = by[n]; return b; }
// rotate the rig about y so that its feet point along +z (both rigs are compared in this frame)
function canonicalize(scene, b) {
  scene.updateMatrixWorld(true); const f = new THREE.Vector3();
  for (const s of ['l', 'r']) f.add(wp(b['ball_' + s]).sub(wp(b['foot_' + s])));
  scene.rotation.y -= Math.atan2(f.x, f.z); scene.updateMatrixWorld(true); return scene.rotation.y;
}
const legLen = (b) => wp(b.thigh_l).distanceTo(wp(b.calf_l)) + wp(b.calf_l).distanceTo(wp(b.foot_l));

// ---------------------------------------------------------------- retargeting
// src: a clone of the Quaternius body the UAL clips were made for; tgt: the Rocketbox avatar scene. Both at rest.
export function makeRetarget(srcScene, tgtScene) { // (exported for the player avatar)
  const sb = ueBones(bonesOf(srcScene), Object.fromEntries(Object.keys(RB_MAP).map((k) => [k, k])));
  const tb = ueBones(bonesOf(tgtScene), RB_MAP);
  canonicalize(srcScene, sb); canonicalize(tgtScene, tb);
  const order = Object.keys(sb).filter((k) => tb[k]).sort((a, b) => depth(sb[a]) - depth(sb[b]));
  const srcRest = new Map(); srcScene.traverse((o) => { if (o.isBone) srcRest.set(o, o.quaternion.clone()); });
  // direction-matched rest: swing every source bone so it points where the avatar's bone points
  for (const ue of order) {
    const c = CHILD[ue]; if (!c || !sb[c] || !tb[c]) continue;
    const dS = wp(sb[c]).sub(wp(sb[ue])).normalize(), dT = wp(tb[c]).sub(wp(tb[ue])).normalize();
    const W = new THREE.Quaternion().setFromUnitVectors(dS, dT).multiply(wq(sb[ue]));
    sb[ue].quaternion.copy(wq(sb[ue].parent).invert().multiply(W)); sb[ue].updateMatrixWorld(true);
  }
  const off = {}; for (const ue of order) off[ue] = wq(sb[ue]).invert().multiply(wq(tb[ue]));
  for (const [o, q] of srcRest) o.quaternion.copy(q); srcScene.updateMatrixWorld(true);
  const rev = {}; for (const ue of order) rev[tb[ue].name] = ue;
  const tOrder = []; tgtScene.traverse((o) => { if (!o.isBone) return; tOrder.push({ bone: o, parent: o.parent && o.parent.isBone ? o.parent : null, ue: rev[o.name] || null, restL: o.quaternion.clone(), rootW: o.parent && !o.parent.isBone ? wq(o.parent) : null }); });
  const hip = tgtScene.getObjectByName('Bip01') || tb.pelvis.parent;
  return { sb, tb, off, order, tOrder, hip, hipP0: hip.position.clone(), hipParentInv: new THREE.Matrix4().copy(hip.parent.matrixWorld).invert(), k: legLen(tb) / legLen(sb), srcScene };
}
export function retargetClip(clip, R, yFix = 0) {
  const { sb, off, tOrder, hip, hipParentInv, k, srcScene } = R;
  const mixer = new THREE.AnimationMixer(srcScene); const act = mixer.clipAction(clip); act.play();
  const has = new Set(clip.tracks.map((t) => t.name));
  const fps = 30, n = Math.max(2, Math.round(clip.duration * fps) + 1); const times = new Float32Array(n);
  const anim = tOrder.filter((o) => o.ue && has.has(o.ue + '.quaternion')); const animSet = new Set(anim);
  const vals = new Map(anim.map((o) => [o, new Float32Array(n * 4)])); const pos = has.has('pelvis.position') ? new Float32Array(n * 3) : null;
  const W = new Map(); const L = new THREE.Quaternion(), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const t = Math.min(clip.duration, i / fps); times[i] = t; act.time = Math.min(t, clip.duration - 1e-4); mixer.update(0); srcScene.updateMatrixWorld(true);
    for (const o of tOrder) {
      const pW = o.parent ? W.get(o.parent) : o.rootW;
      if (animSet.has(o)) { const w = wq(sb[o.ue]).multiply(off[o.ue]); L.copy(pW).invert().multiply(w); const a = vals.get(o);
        if (i > 0 && (a[i * 4 - 4] * L.x + a[i * 4 - 3] * L.y + a[i * 4 - 2] * L.z + a[i * 4 - 1] * L.w) < 0) { L.x = -L.x; L.y = -L.y; L.z = -L.z; L.w = -L.w; }
        a[i * 4] = L.x; a[i * 4 + 1] = L.y; a[i * 4 + 2] = L.z; a[i * 4 + 3] = L.w; W.set(o.bone, w); }
      else W.set(o.bone, pW.clone().multiply(o.restL));
    }
    if (pos) { p.copy(wp(sb.pelvis)).multiplyScalar(k); p.y += yFix; p.applyMatrix4(hipParentInv); pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; }
  }
  mixer.stopAllAction(); mixer.uncacheRoot(srcScene);
  srcScene.traverse((o) => { if (o.isBone && o.userData.restQ) { o.quaternion.copy(o.userData.restQ); o.position.copy(o.userData.restP); } });
  srcScene.updateMatrixWorld(true);
  const tracks = []; for (const [o, a] of vals) tracks.push(new THREE.QuaternionKeyframeTrack(o.bone.name + '.quaternion', times, a));
  if (pos) tracks.push(new THREE.VectorKeyframeTrack(hip.name + '.position', times, pos));
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

// ---------------------------------------------------------------- loading
let _promise = null;
export function loadRocketbox(peopleAssets, opts = {}) { return _promise || (_promise = _load(peopleAssets, opts)); }
async function _load(A, opts) {
  const man = await fetch(BASE + 'manifest.json').then((r) => { if (!r.ok) throw new Error('rb manifest ' + r.status); return r.json(); });
  let list = man.avatars; if (opts.only) list = list.filter((a) => opts.only.includes(a.id));
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const out = []; let i = 0;
  const worker = async () => { while (i < list.length) { const e = list[i++]; try { const g = await loader.loadAsync(BASE + e.file); await idle(); const av = prepAvatar(e, g, A); out.push(av); if (opts.onAvatar) opts.onAvatar(av); } catch (err) { console.warn('rocketbox avatar failed', e.id, err); } await idle(); } };
  await Promise.all([worker(), worker()]);
  out.sort((a, b) => list.indexOf(a.e) - list.indexOf(b.e));
  return out;
}
const idle = () => new Promise((r) => (typeof requestIdleCallback !== 'undefined' ? requestIdleCallback(() => r(), { timeout: 400 }) : setTimeout(r, 16)));

function prepAvatar(e, gltf, A) {
  const scene = gltf.scene; scene.updateMatrixWorld(true);
  const by = bonesOf(scene);
  // UE-like hierarchy: clavicles under the upper spine (Biped hangs them off the neck, so head turns would swing the
  // arms), thighs under the pelvis (Biped hangs them off the spine, so leaning would swing the legs)
  for (const s of ['L', 'R']) { by.Bip01_Spine2.attach(by[`Bip01_${s}_Clavicle`]); by.Bip01_Pelvis.attach(by[`Bip01_${s}_Thigh`]); }
  scene.updateMatrixWorld(true);
  const meshes = []; scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  for (const me of meshes) for (const m of [].concat(me.material)) {
    m.metalness = 0; m.envMapIntensity = 0.8;
    if (m.name === 'rb:head') { m.roughness = 0.6; }
    else if (m.name === 'rb:hair') { m.roughness = 0.7; m.alphaTest = 0.5; m.transparent = false; m.side = THREE.DoubleSide; m.alphaToCoverage = false; }
    else { m.roughness = 0.82; if (m.normalMap) m.normalScale.set(0.9, 0.9); }
  }
  // retarget the UAL clips (made for the Quaternius body of the same sex) onto this avatar
  const src = A.bodies[e.sex]; const srcScene = SkeletonUtils.clone(src.scene);
  srcScene.traverse((o) => { if (o.isBone) { o.userData.restQ = o.quaternion.clone(); o.userData.restP = o.position.clone(); } });
  const R = makeRetarget(srcScene, scene);
  const clips0 = { Idle_Loop: retargetClip(src.clips.Idle_Loop, R) };
  // feet on the ground: compare the idle ankle height with the rest (standing) ankle height
  const restAnkle = Math.min(wp(R.tb.foot_l).y, wp(R.tb.foot_r).y);
  const mx = new THREE.AnimationMixer(scene); const ia = mx.clipAction(clips0.Idle_Loop); ia.play(); ia.time = 0; mx.update(0); scene.updateMatrixWorld(true);
  const idleAnkle = Math.min(wp(R.tb.foot_l).y, wp(R.tb.foot_r).y); mx.stopAllAction(); mx.uncacheRoot(scene);
  for (const o of R.tOrder) o.bone.quaternion.copy(o.restL); R.hip.position.copy(R.hipP0); scene.updateMatrixWorld(true);
  const yFix = restAnkle - idleAnkle;
  const clips = {}; for (const n of NPC_CLIPS) if (src.clips[n]) clips[n] = retargetClip(src.clips[n], R, yFix); // only what character.js plays (extra UAL clips stay player-side)
  // finger rest / fist in avatar space (for character.js setHands: relaxed hands and riders' grip)
  const restQ = {}, fistQ = {};
  for (const ue of R.order) { const pu = UE_PARENT(ue); if (!pu || !R.off[pu] || !src.restQ || !src.restQ[ue]) continue;
    const inv = R.off[pu].clone().invert(); restQ[ue] = inv.clone().multiply(src.restQ[ue]).multiply(R.off[ue]); fistQ[ue] = inv.clone().multiply(src.fistQ[ue]).multiply(R.off[ue]); }
  // how far the back of the torso sits behind spine_03 (for the rigid backpack)
  let backDepth = 0.12; { const sp = wp(R.tb.spine_03); const v = new THREE.Vector3(); let mx2 = 0;
    for (const me of meshes) { const g = me.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight; if (!SI) continue; const bones = me.skeleton.bones;
      for (let i = 0; i < P.count; i += 2) { let bi = -1, bw = 0; for (let c = 0; c < 4; c++) { const w = SW.getComponent(i, c); if (w > bw) { bw = w; bi = SI.getComponent(i, c); } }
        const bn = bones[bi] && bones[bi].name; if (bn !== 'Bip01_Spine2' && bn !== 'Bip01_Spine1') continue; v.fromBufferAttribute(P, i).applyMatrix4(me.matrixWorld);
        if (Math.abs(v.x - sp.x) < 0.08 && Math.abs(v.y - sp.y) < 0.12) mx2 = Math.max(mx2, sp.z - v.z); } }
    if (mx2 > 0.05 && mx2 < 0.3) backDepth = mx2; }
  const B = { sex: e.sex, clips, restQ, fistQ, id: e.id, e, yaw: scene.rotation.y };
  const av = { id: e.id, sex: e.sex, e, scene, meshes, B, backDepth };
  try { av.look = measureLook(av); } catch (err) { console.warn('rocketbox look', e.id, err); av.look = null; }
  return av;
}

// ---------------------------------------------------------------- props (rigid, placed per frame like character.js)
const _pm = {};
const propMat = (hex, rough = 0.8, metal = 0, emi = 0) => _pm[hex + rough + metal + emi] || (_pm[hex + rough + metal + emi] = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal, emissive: emi ? hex : 0x000000, emissiveIntensity: emi, name: 'people:prop' }));
let _pg = null;
function propGeo() {
  if (_pg) return _pg;
  const phone = new RoundedBoxGeometry(0.078, 0.16, 0.01, 2, 0.0045); const screen = new THREE.PlaneGeometry(0.07, 0.148); screen.translate(0, 0, 0.0056);
  const cup = new THREE.CylinderGeometry(0.043, 0.034, 0.13, 12); const lid = new THREE.CylinderGeometry(0.046, 0.046, 0.016, 12); lid.translate(0, 0.072, 0);
  const book = new RoundedBoxGeometry(0.17, 0.24, 0.035, 1, 0.004);
  const pack = new RoundedBoxGeometry(0.29, 0.38, 0.13, 3, 0.045); const pocket = new RoundedBoxGeometry(0.21, 0.15, 0.05, 2, 0.02); pocket.translate(0, -0.08, 0.075);
  const strap = new RoundedBoxGeometry(0.045, 0.3, 0.018, 1, 0.006);
  return (_pg = { phone, screen, cup, lid, book, pack, pocket, strap });
}

// ---------------------------------------------------------------- character
export class RBCharacter {
  constructor(av, castShadow = true) {
    this.av = av; this.rbId = av.id; const B = this.B = av.B; this.sex = av.sex; this.isRB = true;
    this.root = new THREE.Group(); this.root.name = 'people:rb:' + av.id; this.root.visible = false;
    this.inner = new THREE.Group(); this.root.add(this.inner); this.inner.rotation.y = Math.PI;
    const clone = SkeletonUtils.clone(av.scene); clone.rotation.y = B.yaw; this.inner.add(clone); this.model = clone;
    this.meshes = []; clone.traverse((o) => { if (o.isSkinnedMesh) { o.frustumCulled = false; o.castShadow = castShadow; o.receiveShadow = true; this.meshes.push(o); } });
    const by = bonesOf(clone); this.rbBones = by; this.bones = ueBones(by, RB_MAP);
    const G = propGeo();
    this.phone = new THREE.Group(); this.phone.add(new THREE.Mesh(G.phone, propMat('#141518', 0.35, 0.3))); this.phoneScreen = new THREE.Mesh(G.screen, propMat('#9fc4ff', 0.3, 0, 0.9)); this.phone.add(this.phoneScreen);
    this.cup = new THREE.Group(); this.cup.add(new THREE.Mesh(G.cup, propMat('#e9e2d4', 0.7))); this.cup.add(new THREE.Mesh(G.lid, propMat('#2b2523', 0.6)));
    this.book = new THREE.Mesh(G.book, propMat('#7a1f2b', 0.8));
    for (const o of [this.phone, this.cup, this.book]) { o.visible = false; this.root.add(o); }
    // backpack: rigid, rides on spine_03 (placed every frame after the pose, see update below)
    this.packMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.85, name: 'people:pack' });
    this.pack = new THREE.Group(); this.pack.name = 'people:pack'; this.pack.visible = false; this.root.add(this.pack);
    for (const g of [G.pack, G.pocket]) { const m = new THREE.Mesh(g, this.packMat); m.castShadow = castShadow; m.receiveShadow = true; this.pack.add(m); }
    this.straps = []; for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(G.strap, this.packMat); m.castShadow = false; this.root.add(m); m.visible = false; this.straps.push(m); }
    this.mixer = new THREE.AnimationMixer(clone); this.actions = {}; this.w = {}; this.wt = {};
    for (const [n, c] of Object.entries(B.clips)) { const a = this.mixer.clipAction(c); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.actions[n] = a; this.w[n] = 0; this.wt[n] = 0; }
    this.agent = null; this.gazeYaw = 0; this.gazePitch = 0; this.phoneK = 0; this.react = 0; this.t = 0; this.curl = 0.4; this.handK = 0;
    this.lookT = 0; this.lookYaw = 0; this.lookPitch = 0; this.idleOff = 0; this.walkClip = 'Walk_Loop'; this.extra = 0; this.packOn = false;
  }
  setLook(look, extra, seed) {
    const L = look || {}; const f = L.flags | 0;
    const fr = (k) => { const x = Math.sin((seed + 0.123) * 9301 * k) * 43758.5453; return x - Math.floor(x); };
    this.extra = (extra | 0) | (f & (FL.PHONE | FL.CUP | FL.BOOK));
    this.walkClip = seed > 0.8 ? 'Walk_Formal_Loop' : 'Walk_Loop';
    this.idleOff = seed * 10;
    for (const [n, act] of Object.entries(this.actions)) { if (n.startsWith('Walk') || n.startsWith('Jog')) continue; act.time = fr(30 + n.length) * act.getClip().duration; }
    this.lookT = fr(31.7) * 3; this.lookYaw = 0; this.lookPitch = 0;
    this.curl = 0.3 + fr(33.1) * 0.25; this.setHands(this.curl);
    const s = 0.985 + fr(34.3) * 0.03; this.inner.scale.set(s, s, s);
    this.packOn = !!(f & FL.BACKPACK);
    if (this.packOn) { const c = [[0.03, 0.035, 0.045], [0.02, 0.06, 0.16], [0.25, 0.04, 0.03], [0.12, 0.13, 0.1], [0.4, 0.33, 0.22], [0.05, 0.16, 0.12], [0.5, 0.5, 0.52]][Math.floor(fr(16.3) * 7)]; this.packMat.color.setRGB(c[0], c[1], c[2]); }
  }
}
// the motion code is shared with the Quaternius characters (it only talks to UE-named bones in world space)
for (const k of ['update', 'fade', 'aim', 'dirW', 'ik2', 'cw', '_lean', '_cyclePose', '_scootPose', '_phonePose', '_armsIn', '_widen', '_standFix', '_groundPose', '_liePose', '_gaze', '_props', 'setHands', 'setShadow']) RBCharacter.prototype[k] = Character.prototype[k];
// after the shared update has posed the skeleton: hang the backpack on the upper back
const _upd = Character.prototype.update;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _inv = new THREE.Matrix4();
RBCharacter.prototype.update = function (dt, a, cam) {
  _upd.call(this, dt, a, cam);
  const on = this.packOn && this.mode !== 'lie' && this.mode !== 'ground' && this.mode !== 'sit';
  this.pack.visible = on; for (const s of this.straps) s.visible = on; if (!on) return;
  const sp = this.bones.spine_03, ne = this.bones.neck_01;
  const S = wp(sp), N = wp(ne); const up = N.clone().sub(S).normalize();
  this.root.getWorldQuaternion(_q); const back = new THREE.Vector3(0, 0, 1).applyQuaternion(_q); back.addScaledVector(up, -back.dot(up)).normalize();
  const right = new THREE.Vector3().crossVectors(up, back).normalize();
  const P = S.clone().addScaledVector(back, this.av.backDepth + 0.07).addScaledVector(up, -0.1);
  _m.makeBasis(right, up, back); const q = new THREE.Quaternion().setFromRotationMatrix(_m);
  this.root.updateMatrixWorld(true); _inv.copy(this.root.matrixWorld).invert(); const rq = _q.clone().invert();
  this.pack.position.copy(P).applyMatrix4(_inv); this.pack.quaternion.copy(rq).multiply(q);
  // straps: from the top of the pack over each shoulder (clavicle -> upper arm joint), down the front a little
  for (let i = 0; i < 2; i++) { const s = i ? 'r' : 'l'; const cl = wp(this.bones['upperarm_' + s]).lerp(wp(this.bones['clavicle_' + s]), 0.45);
    const top = cl.clone().addScaledVector(up, 0.035); const st = this.straps[i]; const mid = top.clone().addScaledVector(back, -0.03).addScaledVector(up, -0.12);
    st.position.copy(mid).applyMatrix4(_inv); const dir = top.clone().sub(mid).normalize(); const sq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); st.quaternion.copy(rq).multiply(sq); st.scale.set(1, 1, 1); }
};

// ---------------------------------------------------------------- crowd look from the avatar's own textures
// The far crowd (campus life's instanced people) is coloured from agent.look. Each person who wears this avatar gets
// its measured clothes / skin / hair colours and sleeve / trouser flags, so walking into near range swaps in more
// detail but never different clothes. Colours are linear RGB like randomLook(); skin / hair are palette indices.
const SKIN_P = [[0.92, 0.74, 0.62], [0.83, 0.62, 0.47], [0.70, 0.50, 0.36], [0.55, 0.37, 0.25], [0.40, 0.26, 0.17], [0.27, 0.17, 0.11]];
const HAIR_P = [[0.035, 0.03, 0.028], [0.09, 0.06, 0.04], [0.2, 0.13, 0.07], [0.36, 0.24, 0.13], [0.62, 0.48, 0.28], [0.45, 0.44, 0.43], [0.42, 0.1, 0.07]];
const SHOE_P = [[0.86, 0.86, 0.84], [0.06, 0.06, 0.065], [0.42, 0.42, 0.43], [0.12, 0.16, 0.3], [0.45, 0.33, 0.2], [0.62, 0.12, 0.1]];
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const nearest = (pal, c) => { let bi = 0, bd = 1e9; pal.forEach((p, i) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
function texels(tex, N = 96) {
  const img = tex && tex.image; if (!img || typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, N, N); return { d: x.getImageData(0, 0, N, N).data, N };
}
function measureLook(av) {
  const acc = {}; const add = (k, r, g, b, w = 1) => { const a = acc[k] || (acc[k] = [0, 0, 0, 0]); a[0] += r * w; a[1] += g * w; a[2] += b * w; a[3] += w; };
  const avg = (k) => { const a = acc[k]; return a && a[3] > 0 ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : null; };
  let top = -1e9, bot = 1e9;
  for (const me of av.meshes) {
    const mat = me.material; const g = me.geometry; const P = g.attributes.position; me.updateWorldMatrix(true, false); const box = new THREE.Box3().copy(g.boundingBox || (g.computeBoundingBox(), g.boundingBox)).applyMatrix4(me.matrixWorld); top = Math.max(top, box.max.y); bot = Math.min(bot, box.min.y); const wv = new THREE.Vector3();
    const T = texels(mat.map); if (!T) continue; const UV = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight; const bones = me.skeleton.bones;
    for (let i = 0; i < P.count; i++) {
      const u = UV.getX(i), v = UV.getY(i); const px = Math.min(T.N - 1, Math.max(0, Math.floor((u - Math.floor(u)) * T.N))), py = Math.min(T.N - 1, Math.max(0, Math.floor((v - Math.floor(v)) * T.N)));
      const o = (py * T.N + px) * 4; const r = s2l(T.d[o] / 255), gg = s2l(T.d[o + 1] / 255), b = s2l(T.d[o + 2] / 255), al = T.d[o + 3] / 255;
      if (mat.name === 'rb:hair') { if (al > 0.6) add('hair', r, gg, b); continue; }
      let bi = -1, bw = 0; for (let c = 0; c < 4; c++) { const w = SW.getComponent(i, c); if (w > bw) { bw = w; bi = SI.getComponent(i, c); } }
      const bn = (bones[bi] && bones[bi].name) || '';
      if (mat.name === 'rb:head') { if (bn === 'Bip01_Head') add('scalp', r, gg, b, Math.max(0, wv.fromBufferAttribute(P, i).applyMatrix4(me.matrixWorld).y - (box.max.y - 0.06))); continue; }
      const k = /Spine|Clavicle|UpperArm/.test(bn) ? 'top' : /Forearm/.test(bn) ? 'farm' : /Hand|Finger/.test(bn) ? 'hand' : /Thigh|Pelvis/.test(bn) ? 'thigh' : /Calf/.test(bn) ? 'calf' : /Foot|Toe/.test(bn) ? 'foot' : null;
      if (k) add(k, r, gg, b);
    }
  }
  const skin = avg('hand') || [0.55, 0.37, 0.25]; const tc = avg('top') || [0.1, 0.1, 0.1], bc = avg('thigh') || [0.1, 0.1, 0.1];
  const far = avg('farm') || tc, calf = avg('calf') || bc; const dS = (c) => Math.hypot(c[0] - skin[0], c[1] - skin[1], c[2] - skin[2]);
  let flags = 0; if (dS(far) > 0.06) flags |= FL.SLEEVE; if (dS(calf) > 0.06) flags |= FL.PANTS;
  const hc = avg('hair') || avg('scalp') || HAIR_P[1];
  const H = top - bot;
  return { fem: av.sex === 'f' ? 1 : 0, top: tc, bot: bc, skin: nearest(SKIN_P, skin), hairC: nearest(HAIR_P, hc), hair: av.e.hair ?? (av.sex === 'f' ? 2 : 1), flags, shoe: nearest(SHOE_P, avg('foot') || SHOE_P[1]), h: H > 1.3 && H < 2.1 ? H / 1.75 : 1, w: 1 };
}
