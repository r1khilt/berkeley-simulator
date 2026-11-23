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
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
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
    // hands: also match the twist (palm orientation) using the knuckle line index -> pinky, or the palms come out rotated
    const m = /^hand_([lr])$/.exec(ue); if (m) { const i = 'index_01_' + m[1], k = 'pinky_01_' + m[1];
      if (sb[i] && sb[k] && tb[i] && tb[k]) { const aS = wp(sb[i]).sub(wp(sb[k])), aT = wp(tb[i]).sub(wp(tb[k])); aS.addScaledVector(dT, -aS.dot(dT)).normalize(); aT.addScaledVector(dT, -aT.dot(dT)).normalize();
        const W2 = new THREE.Quaternion().setFromUnitVectors(aS, aT).multiply(wq(sb[ue])); sb[ue].quaternion.copy(wq(sb[ue].parent).invert().multiply(W2)); sb[ue].updateMatrixWorld(true); } }
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

// ---------------------------------------------------------------- Rocketbox's own mocap (tools/people_rb_anims.mjs)
// Walk, formal walk, jog, idle and talking come from Rocketbox's motion-captured takes on the same Biped rig (natural
// arm swing, weight shift, relaxed hands); sitting and the bump reaction stay retargeted UAL clips.
let _anims = null;
export function loadRBAnims() {
  return _anims || (_anims = fetch(BASE + 'anims.bin').then((r) => { if (!r.ok) throw new Error('rb anims ' + r.status); return r.arrayBuffer(); }).then((buf) => {
    const dv = new DataView(buf); const jl = dv.getUint32(0, true); const J = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, jl)));
    let off = 4 + jl; const T = new Float32Array(buf, off, J.nt); off += J.nt * 4; const V = new Float32Array(buf, off, J.nv); off += J.nv * 4; const Q = new Int16Array(buf, off, J.nq);
    const out = {};
    for (const c of J.clips) {
      const tracks = c.tracks.map((t) => { const times = T.slice(t.t, t.t + t.n);
        if (t.p === 'q') { const v = new Float32Array(t.n * 4); for (let i = 0; i < t.n * 4; i += 4) { const x = Q[t.o + i] / 32767, y = Q[t.o + i + 1] / 32767, z = Q[t.o + i + 2] / 32767, w = Q[t.o + i + 3] / 32767; const l = Math.hypot(x, y, z, w) || 1; v[i] = x / l; v[i + 1] = y / l; v[i + 2] = z / l; v[i + 3] = w / l; } return new THREE.QuaternionKeyframeTrack(t.b + '.quaternion', times, v); }
        return new THREE.VectorKeyframeTrack(t.b + '.position', times, V.slice(t.o, t.o + t.n * 3)); });
      const clip = new THREE.AnimationClip(c.name, c.duration, tracks); clip.userData = { leg: c.leg }; out[c.name] = clip;
    }
    return out;
  }).catch((e) => { console.warn('rocketbox mocap unavailable', e); return null; }));
}
// a Biped take -> this avatar: clavicles / thighs were re-parented (see prepAvatar), so their local rotations get the
// old parent's rotation folded in (L_new = L_neck * L_clavicle, L_new = L_spine * L_thigh); hips scaled by leg length
function nativeClip(clip, name, scene, by, k) {
  const tr = {}; for (const t of clip.tracks) tr[t.name] = t;
  const fold = { Bip01_L_Clavicle: 'Bip01_Neck', Bip01_R_Clavicle: 'Bip01_Neck', Bip01_L_Thigh: 'Bip01_Spine', Bip01_R_Thigh: 'Bip01_Spine' };
  const tracks = []; const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  for (const t of clip.tracks) {
    const bn = t.name.split('.')[0]; if (!by[bn]) continue;
    if (t.name.endsWith('.position')) { if (bn !== 'Bip01') continue; const v = t.values.slice(); for (let i = 0; i < v.length; i++) v[i] *= k; tracks.push(new THREE.VectorKeyframeTrack(t.name, t.times, v)); continue; }
    const par = fold[bn]; if (!par) { tracks.push(t.clone()); continue; }
    // resample at 30 fps: L_new(t) = L_parentOld(t) * L_old(t)
    const pt = tr[par + '.quaternion']; const pi = pt && pt.createInterpolant(), ci = t.createInterpolant(); const rest = by[par].quaternion;
    const n = Math.max(2, Math.round(clip.duration * 30) + 1); const times = new Float32Array(n), vals = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const tt = Math.min(clip.duration, i / 30); times[i] = tt; if (pi) qa.fromArray(pi.evaluate(tt)); else qa.copy(rest); qb.fromArray(ci.evaluate(tt)); qa.multiply(qb).normalize();
      if (i && qa.x * vals[i * 4 - 4] + qa.y * vals[i * 4 - 3] + qa.z * vals[i * 4 - 2] + qa.w * vals[i * 4 - 1] < 0) { qa.x = -qa.x; qa.y = -qa.y; qa.z = -qa.z; qa.w = -qa.w; } qa.toArray(vals, i * 4); }
    tracks.push(new THREE.QuaternionKeyframeTrack(t.name, times, vals));
  }
  return new THREE.AnimationClip(name, clip.duration, tracks);
}

// ---------------------------------------------------------------- loading
let _promise = null;
// the NPC pool's full load is cached; filtered loads ({only:[ids]}, e.g. the player or the dev harness) are not
export function loadRocketbox(peopleAssets, opts = {}) { if (opts.only) return _load(peopleAssets, opts); return _promise || (_promise = _load(peopleAssets, opts)); }
// a GLTFLoader set up for these files (meshopt geometry, KTX2 / ETC1S colour textures; one KTX2 transcoder per renderer)
let _ktx2 = null, _ktxR = null;
export function getLoader(renderer) {
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  if (renderer) { if (!_ktx2 || _ktxR !== renderer) { _ktx2 = new KTX2Loader().setTranscoderPath((import.meta.env && import.meta.env.BASE_URL || '/') + 'assets/basis/').detectSupport(renderer); _ktxR = renderer; } loader.setKTX2Loader(_ktx2); }
  return loader;
}
// [r6-load] one manifest fetch and one load + prep per avatar id for the whole page. The player's avatar ({only:[id]})
// and the NPC pool used to download, parse and KTX2-transcode the same GLB twice and keep two GPU copies. A prepared
// avatar is a read-only template (RBCharacter clones it with SkeletonUtils), so sharing it is safe.
let _man = null; const _avs = new Map();
export function loadRBManifest() { return _man || (_man = fetch(BASE + 'manifest.json').then((r) => { if (!r.ok) throw new Error('rb manifest ' + r.status); return r.json(); }).catch((e) => { _man = null; throw e; })); }
async function _load(A, opts) {
  const man = await loadRBManifest();
  let list = man.avatars; if (opts.only) list = list.filter((a) => opts.only.includes(a.id));
  const loader = getLoader(opts.renderer); // colour textures are KTX2 / ETC1S (GPU-compressed); transcoder in public/assets/basis/
  if (opts.mocap !== false) prepAvatar.natives = await loadRBAnims();
  const out = []; let i = 0;
  const one = (e) => { let p = _avs.get(e.id); if (!p) { p = (async () => { const g = await loader.loadAsync(BASE + e.file); await idle(); return prepAvatar(e, g, A); })(); _avs.set(e.id, p); p.catch(() => _avs.delete(e.id)); } return p; };
  const worker = async () => { while (i < list.length) { const e = list[i++]; try { const av = await one(e); out.push(av); if (opts.onAvatar) opts.onAvatar(av); } catch (err) { console.warn('rocketbox avatar failed', e.id, err); } await idle(); } };
  await Promise.all([worker(), worker()]);
  out.sort((a, b) => list.indexOf(a.e) - list.indexOf(b.e));
  return out;
}
const idle = () => new Promise((r) => (typeof requestIdleCallback !== 'undefined' ? requestIdleCallback(() => r(), { timeout: 400 }) : setTimeout(r, 16)));

export function prepAvatar(e, gltf, A) { // (exported: the player avatar loads its own one avatar with getLoader())
  const scene = gltf.scene; scene.updateMatrixWorld(true);
  const by = bonesOf(scene);
  // UE-like hierarchy: clavicles under the upper spine (Biped hangs them off the neck, so head turns would swing the
  // arms), thighs under the pelvis (Biped hangs them off the spine, so leaning would swing the legs)
  for (const s of ['L', 'R']) { by.Bip01_Spine2.attach(by[`Bip01_${s}_Clavicle`]); by.Bip01_Pelvis.attach(by[`Bip01_${s}_Thigh`]); }
  scene.updateMatrixWorld(true);
  const meshes = []; scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  for (const me of meshes) for (const m of [].concat(me.material)) {
    m.metalness = 0; m.envMapIntensity = 1.0; if (m.name !== 'rb:hair') m.color.setScalar(1.1); // Rocketbox albedo carries baked shading: lift it a touch so people don't read a stop darker than the sunlit plaza
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
  // Rocketbox mocap for walking / jogging / standing / talking (when loaded), re-grounded on the idle
  let native = false; const natives = prepAvatar.natives;
  if (natives) { const by2 = bonesOf(scene); const legA = legLen(R.tb);
    for (const role of ['Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Idle_Loop', 'Idle_Talking_Loop']) { const c = natives[e.sex + ':' + role]; if (c) { clips[role] = nativeClip(c, role, scene, by2, legA / (c.userData.leg || legA)); native = true; } }
    if (native && clips.Idle_Loop) { const mx3 = new THREE.AnimationMixer(scene); const a3 = mx3.clipAction(clips.Idle_Loop); a3.play(); a3.time = 0; mx3.update(0); scene.updateMatrixWorld(true);
      const y3 = Math.min(wp(R.tb.foot_l).y, wp(R.tb.foot_r).y); mx3.stopAllAction(); mx3.uncacheRoot(scene); for (const o of R.tOrder) o.bone.quaternion.copy(o.restL); R.hip.position.copy(R.hipP0); scene.updateMatrixWorld(true);
      const dy = restAnkle - y3; if (Math.abs(dy) > 0.004 && Math.abs(dy) < 0.2) for (const role of ['Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Idle_Loop', 'Idle_Talking_Loop']) { const c = clips[role]; const t = c && c.tracks.find((x) => x.name === 'Bip01.position'); if (t) for (let i = 1; i < t.values.length; i += 3) t.values[i] += dy; } } }
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
  const B = { sex: e.sex, clips, restQ, fistQ, id: e.id, e, yaw: scene.rotation.y, native };
  const av = { id: e.id, sex: e.sex, e, scene, meshes, B, backDepth, R, yFix };
  try { av.look = e.look ? { ...e.look } : measureLook(av); } catch (err) { console.warn('rocketbox look', e.id, err); av.look = null; } // measured offline by the build (KTX2 can't be read back)
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
// Realistic proportions: the Quaternius 'arms in' fix (superhero lats) would push these hands into the hips, so only
// trim wide arms a little; and stand the UAL walk up a bit (its torso leans ~12 deg forward, the head ~20 deg: hunched)
const _dW = new THREE.Vector3(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _ax = new THREE.Vector3();
RBCharacter.prototype._armsIn = function (mode) {
  if (this.B.native) { // mocap arms: only give the hands a little clearance from the hips (realistic hips + bulky clothes)
    if (mode === 'walk' || mode === 'stand') for (const s of ['l', 'r']) { if (s === 'r' && this.phoneK > 0.05) continue; const b = this.bones; const sx = s === 'l' ? -1 : 1;
      const d = wp(b['lowerarm_' + s]).sub(wp(b['upperarm_' + s])).normalize(); const rq = this.root.getWorldQuaternion(new THREE.Quaternion()); const dl = d.clone().applyQuaternion(rq.clone().invert());
      if (dl.x * sx < 0.12) { dl.x = sx * (0.12 * 0.6 + Math.max(0, dl.x * sx) * 0.4); dl.normalize().applyQuaternion(rq); this.aim(b['upperarm_' + s], b['lowerarm_' + s], dl, 1); } }
    return; }
  const b = this.bones; const rq = this.root.getWorldQuaternion(new THREE.Quaternion()); const inv = rq.clone().invert();
  for (const s of ['l', 'r']) { if (s === 'r' && this.phoneK > 0.05) continue;
    const d = wp(b['lowerarm_' + s]).sub(wp(b['upperarm_' + s])).normalize().applyQuaternion(inv); const sx = s === 'l' ? -1 : 1;
    const lim = mode === 'jog' ? 0.2 : 0.13; if (d.x * sx > lim) { d.x = sx * (lim + (d.x * sx - lim) * 0.5); d.normalize().applyQuaternion(rq); this.aim(b['upperarm_' + s], b['lowerarm_' + s], d, 1); } }
};
RBCharacter.prototype._upright = function (k) { // rotate spine_02 and neck back about the character's right axis
  const b = this.bones; this.root.getWorldQuaternion(_qa); _ax.set(1, 0, 0).applyQuaternion(_qa);
  for (const [bn, ang] of [['spine_02', 0.09 * k], ['neck_01', 0.12 * k]]) { const bone = b[bn]; _qb.setFromAxisAngle(_ax, ang); bone.getWorldQuaternion(_qa); _qb.multiply(_qa); bone.parent.getWorldQuaternion(_qa); _qa.invert().multiply(_qb); bone.quaternion.copy(_qa); bone.updateMatrixWorld(true); }
};
// after the shared update has posed the skeleton: hang the backpack on the upper back
const _upd = Character.prototype.update;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _inv = new THREE.Matrix4();
RBCharacter.prototype.update = function (dt, a, cam) {
  _upd.call(this, dt, a, cam);
  if (!this.B.native) { if (this.mode === 'walk' && this.phoneK < 0.5) this._upright(1); else if (this.mode === 'jog') this._upright(0.5); }
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

// with mocap the UAL-specific fixes (straightened idle legs, widened walking thighs) would fight the captured motion
const _sf = Character.prototype._standFix, _wd = Character.prototype._widen;
RBCharacter.prototype._standFix = function () { if (!this.B.native) _sf.call(this); };
RBCharacter.prototype._widen = function () { if (!this.B.native) _wd.call(this); };
