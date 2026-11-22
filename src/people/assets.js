// People assets: Quaternius "Universal Base Characters" bodies + hairstyles and "Universal Animation Library" clips
// (both CC0, see public/assets/CREDITS.md), repacked by tools/people_build.mjs into public/assets/people/.
// Here the bodies are prepared once for clothing: every vertex gets a cloth region + limb coordinate so one shader
// can dress any body (tops with sleeve length, shorts/trousers, shoes) per character with plain colour uniforms.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BASE = (import.meta.env && import.meta.env.BASE_URL || '/') + 'assets/people/';
export const REG = { HEAD: 0, TRUNK: 1, ARM: 2, HAND: 3, LEG: 4 };
const UAL_LEG = 0.4003 + 0.4295; // UAL mannequin thigh + shin length (pelvis tracks scale by leg length)

let _promise = null;
export function loadPeopleAssets() { return _promise || (_promise = _load()); }

async function _load() {
  const loader = new GLTFLoader();
  const [fem, male, hair, abuf] = await Promise.all([loader.loadAsync(BASE + 'female.glb'), loader.loadAsync(BASE + 'male.glb'), loader.loadAsync(BASE + 'hair.glb'), fetch(BASE + 'anims.bin').then((r) => { if (!r.ok) throw new Error('anims.bin ' + r.status); return r.arrayBuffer(); })]);
  const raw = parseClips(abuf);
  const bodies = { f: prepBody(fem, 'f'), m: prepBody(male, 'm') };
  // UAL's idle/walk/jog clench the fists; use the relaxed hand of the sitting clip for those instead
  const FINGER = /^(index|middle|ring|pinky|thumb)_/; const fist = {};
  for (const t of raw.Idle_Loop.tracks) { const bn = t.name.split('.')[0]; if (FINGER.test(bn) && t.name.endsWith('.quaternion')) fist[bn] = new THREE.Quaternion().fromArray(t.values, 0); }
  for (const n of ['Idle_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Crouch_Idle_Loop']) if (raw[n]) raw[n] = new THREE.AnimationClip(n, raw[n].duration, raw[n].tracks.filter((t) => !FINGER.test(t.name.split('.')[0])));
  for (const k of ['f', 'm']) {
    bodies[k].clips = retargetClips(raw, bodies[k].legLen / UAL_LEG);
    // relaxed hand = a third of the way from the flat rest hand to UAL's fist: fingers together, gently curled
    const relaxed = {}; bodies[k].scene.traverse((o) => { if (o.isBone && fist[o.name]) relaxed[o.name] = o.quaternion.clone().slerp(fist[o.name], /^thumb/.test(o.name) ? 0.3 : 0.5).toArray(); }); // r4-people2: more curl (claw hands read as mannequins)
    bodies[k].relaxed = relaxed;
    // rest + fist per finger bone, for per-person hand curl (and riders' grip)
    const restQ = {}, fistQ = {}; bodies[k].scene.traverse((o) => { if (o.isBone && fist[o.name]) { restQ[o.name] = o.quaternion.clone(); fistQ[o.name] = fist[o.name].clone(); } }); bodies[k].restQ = restQ; bodies[k].fistQ = fistQ;
  }
  return { bodies, hair: prepHair(hair, bodies) };
}

// ---------------------------------------------------------------- clips
function parseClips(buf) {
  const dv = new DataView(buf); const jl = dv.getUint32(0, true);
  const J = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, jl)));
  let off = 4 + jl; const T = new Float32Array(buf, off, J.nt); off += J.nt * 4; const V = new Float32Array(buf, off, J.nv); off += J.nv * 4; const Q = new Int16Array(buf, off, J.nq);
  const out = {};
  for (const c of J.clips) {
    const tracks = [];
    for (const t of c.tracks) {
      const times = T.slice(t.t, t.t + t.n);
      if (t.p === 'q') { const v = new Float32Array(t.n * 4); for (let i = 0; i < t.n; i++) { let x = Q[t.o + i * 4] / 32767, y = Q[t.o + i * 4 + 1] / 32767, z = Q[t.o + i * 4 + 2] / 32767, w = Q[t.o + i * 4 + 3] / 32767; const l = Math.hypot(x, y, z, w) || 1; v[i * 4] = x / l; v[i * 4 + 1] = y / l; v[i * 4 + 2] = z / l; v[i * 4 + 3] = w / l; } tracks.push(new THREE.QuaternionKeyframeTrack(t.b + '.quaternion', times, v)); }
      else tracks.push(new THREE.VectorKeyframeTrack(t.b + '.position', times, V.slice(t.o, t.o + t.n * 3)));
    }
    out[c.name] = new THREE.AnimationClip(c.name, c.duration, tracks);
  }
  return out;
}
// the UAL mannequin and the UBC bodies share one skeleton (names and rest rotations); only the pelvis height differs
function retargetClips(raw, k) {
  const out = {};
  for (const [n, c] of Object.entries(raw)) {
    const tracks = c.tracks.map((t) => { if (!t.name.endsWith('.position')) return t; const v = t.values.slice(); for (let i = 0; i < v.length; i++) v[i] *= k; return new THREE.VectorKeyframeTrack(t.name, t.times, v); });
    out[n] = new THREE.AnimationClip(n, c.duration, tracks);
  }
  return out;
}

// ---------------------------------------------------------------- bodies
function prepBody(gltf, sex) {
  const scene = gltf.scene; let body = null, eyes = null, brows = null;
  scene.traverse((o) => { if (!o.isSkinnedMesh) return; const n = o.geometry.attributes.position.count; if (/eye/i.test(o.name) && !/brow/i.test(o.name) && n < 1000) eyes = o; else if (!body || n > body.geometry.attributes.position.count) { if (body) brows = body; body = o; } else brows = o; });
  // the male file names its parts Face / Face.001: tell eyes from brows by material
  scene.traverse((o) => { if (!o.isSkinnedMesh || o === body) return; const mn = o.material && o.material.name || ''; if (/eye/i.test(mn)) eyes = o; else if (/hair/i.test(mn)) brows = o; });
  scene.updateMatrixWorld(true);
  const sk = body.skeleton; const bones = sk.bones; const bi = {}; bones.forEach((b, i) => { bi[b.name] = i; });
  // bind-pose joint positions in mesh space
  const jp = (name) => { const m = new THREE.Matrix4().copy(sk.boneInverses[bi[name]]).invert(); return new THREE.Vector3().setFromMatrixPosition(m).applyMatrix4(new THREE.Matrix4().copy(body.bindMatrixInverse)); };
  const J = {}; for (const n of ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r', 'clavicle_l', 'clavicle_r']) J[n] = jp(n);
  const g = body.geometry; const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, N = P.count;
  const cloth = new Float32Array(N * 2); const v = new THREE.Vector3(), a = new THREE.Vector3(), ab = new THREE.Vector3();
  const segT = (p, A, B) => { ab.subVectors(B, A); const L2 = ab.lengthSq(); return Math.max(0, Math.min(1, a.subVectors(p, A).dot(ab) / L2)); };
  const distSeg = (p, A, B) => { const t = segT(p, A, B); return a.copy(A).addScaledVector(ab.subVectors(B, A), t).distanceTo(p); };
  const chainT = (p, A, B, C) => { const l1 = A.distanceTo(B), l2 = B.distanceTo(C); const d1 = distSeg(p, A, B), d2 = distSeg(p, B, C); return d1 <= d2 ? segT(p, A, B) * l1 / (l1 + l2) : (l1 + segT(p, B, C) * l2) / (l1 + l2); };
  // 1) region + limb coordinate per vertex (dominant bone)
  const dom = new Int32Array(N); const regs = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let best = -1, bw = -1; for (let k = 0; k < 4; k++) { const w = SW.getComponent(i, k); if (w > bw) { bw = w; best = SI.getComponent(i, k); } }
    dom[i] = best; const bn = bones[best].name; v.fromBufferAttribute(P, i); const side = /_l$/.test(bn) ? 'l' : 'r';
    let reg = REG.TRUNK, t = 0;
    if (bn === 'Head') reg = REG.HEAD;
    else if (/^(hand|index|middle|ring|pinky|thumb)/.test(bn)) reg = REG.HAND;
    else if (/^(upperarm|lowerarm)/.test(bn)) { reg = REG.ARM; t = chainT(v, J['upperarm_' + side], J['lowerarm_' + side], J['hand_' + side]); }
    else if (/^(thigh|calf|foot|ball)/.test(bn)) { reg = REG.LEG; t = chainT(v, J['thigh_' + side], J['calf_' + side], J['foot_' + side]); }
    cloth[i * 2] = reg; cloth[i * 2 + 1] = t; regs[i] = reg;
  }
  // 2) Taubin smoothing over welded vertices: melts the sculpted superhero muscles (abs, pecs, delts) that would
  //    otherwise show through every shirt, while keeping volume; the face, hands and feet are left alone
  {
    const key = (i) => Math.round(P.getX(i) * 2e4) + ',' + Math.round(P.getY(i) * 2e4) + ',' + Math.round(P.getZ(i) * 2e4);
    const canon = new Int32Array(N); const map = new Map(); for (let i = 0; i < N; i++) { const k = key(i); let c = map.get(k); if (c == null) { c = i; map.set(k, c); } canon[i] = c; }
    const nb = new Map(); const add = (a, b) => { if (a === b) return; let l = nb.get(a); if (!l) nb.set(a, (l = new Set())); l.add(b); };
    const ix = g.index.array; for (let f = 0; f < ix.length; f += 3) { const a = canon[ix[f]], b = canon[ix[f + 1]], c = canon[ix[f + 2]]; add(a, b); add(b, a); add(b, c); add(c, b); add(a, c); add(c, a); }
    const amt = (i) => { const r = regs[i]; if (r === REG.TRUNK) { const y = P.getY(i); return y > J.neck_01.y + 0.02 ? 0.2 : 1; } if (r === REG.ARM) return 0.85; if (r === REG.LEG) return P.getY(i) < J.calf_l.y - 0.12 ? 0.25 : 0.8; return 0; };
    const ids = [...nb.keys()]; const X = new Float32Array(N * 3); for (const i of ids) { X[i * 3] = P.getX(i); X[i * 3 + 1] = P.getY(i); X[i * 3 + 2] = P.getZ(i); }
    const A = new Float32Array(N); for (const i of ids) A[i] = amt(i) * (sex === 'm' ? 1 : 0.7);
    const T = new Float32Array(N * 3);
    for (let it = 0; it < 9; it++) for (const lam of [0.5, -0.53]) {
      for (const i of ids) { const l = nb.get(i); let sx = 0, sy = 0, sz = 0; for (const j of l) { sx += X[j * 3]; sy += X[j * 3 + 1]; sz += X[j * 3 + 2]; } const n = l.size, f = lam * A[i]; T[i * 3] = X[i * 3] + f * (sx / n - X[i * 3]); T[i * 3 + 1] = X[i * 3 + 1] + f * (sy / n - X[i * 3 + 1]); T[i * 3 + 2] = X[i * 3 + 2] + f * (sz / n - X[i * 3 + 2]); }
      for (const i of ids) { X[i * 3] = T[i * 3]; X[i * 3 + 1] = T[i * 3 + 1]; X[i * 3 + 2] = T[i * 3 + 2]; }
    }
    for (let i = 0; i < N; i++) { const c = canon[i]; P.setXYZ(i, X[c * 3], X[c * 3 + 1], X[c * 3 + 2]); }
    g.userData.canon = canon;
  }
  // 3) slim toward an everyday student, blended by skin weights so neighbouring regions can't crack apart:
  //    each influencing bone proposes a pulled position (limbs toward their bone axis, chest narrower, traps lower,
  //    hips/glutes smaller) and the proposals are mixed with the vertex's skin weights
  const slim = sex === 'm' ? { uarm: 0.74, farm: 0.84, thigh: 0.9, calf: 0.93, neck: 0.9, chest: 0.86, chestZ: 0.9, trap: 0.72, hipX: 1.04, hipZ: 0.95 } : { uarm: 0.88, farm: 0.92, thigh: 0.93, calf: 0.97, neck: 0.96, chest: 0.95, chestZ: 0.88, trap: 0.88, hipX: 0.94, hipZ: 0.88 };
  const pullTo = (p, A, B, k, out) => { const t = segT(p, A, B); const c = a.copy(A).addScaledVector(ab.subVectors(B, A), t); return out.copy(p).sub(c).multiplyScalar(k).add(c); };
  const prop = new THREE.Vector3(), acc = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    v.fromBufferAttribute(P, i); acc.set(0, 0, 0); let wsum = 0;
    for (let k = 0; k < 4; k++) {
      const w = SW.getComponent(i, k); if (w <= 0) continue; const bn = bones[SI.getComponent(i, k)].name; const side = /_l$/.test(bn) ? 'l' : 'r';
      if (bn.startsWith('upperarm')) pullTo(v, J['upperarm_' + side], J['lowerarm_' + side], slim.uarm, prop);
      else if (bn.startsWith('lowerarm')) pullTo(v, J['lowerarm_' + side], J['hand_' + side], slim.farm, prop);
      else if (bn.startsWith('thigh')) pullTo(v, J['thigh_' + side], J['calf_' + side], slim.thigh, prop);
      else if (bn.startsWith('calf')) pullTo(v, J['calf_' + side], J['foot_' + side], slim.calf, prop);
      else if (bn === 'neck_01') pullTo(v, J.neck_01, J.Head, slim.neck, prop);
      else if (/^(spine_0[23]|clavicle)/.test(bn)) { prop.copy(v); prop.x *= slim.chest; const zc = J.spine_03.z; prop.z = zc + (prop.z - zc) * slim.chestZ; const ty = J.spine_03.y + 0.06; if (prop.y > ty) prop.y = ty + (prop.y - ty) * slim.trap; }
      else if (bn === 'pelvis' || bn === 'spine_01') { prop.copy(v); prop.x *= slim.hipX; const zc = J.pelvis.z; if (prop.z < zc) prop.z = zc + (prop.z - zc) * slim.hipZ; }
      else prop.copy(v);
      acc.addScaledVector(prop, w); wsum += w;
    }
    if (wsum > 0) { acc.multiplyScalar(1 / wsum); P.setXYZ(i, acc.x, acc.y, acc.z); }
  }
  // normals from the new shape, averaged across UV seams (welded), so seams don't light up
  {
    const canon = g.userData.canon; const ix = g.index.array; const nrm = new Float32Array(N * 3); const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    for (let f = 0; f < ix.length; f += 3) { const ia = ix[f], ib = ix[f + 1], ic = ix[f + 2]; pa.fromBufferAttribute(P, ia); pb.fromBufferAttribute(P, ib); pc.fromBufferAttribute(P, ic); e1.subVectors(pb, pa); e2.subVectors(pc, pa); e1.cross(e2); for (const q of [canon[ia], canon[ib], canon[ic]]) { nrm[q * 3] += e1.x; nrm[q * 3 + 1] += e1.y; nrm[q * 3 + 2] += e1.z; } }
    const NA = g.attributes.normal; for (let i = 0; i < N; i++) { const c = canon[i]; e1.set(nrm[c * 3], nrm[c * 3 + 1], nrm[c * 3 + 2]).normalize(); NA.setXYZ(i, e1.x, e1.y, e1.z); } NA.needsUpdate = true;
  }
  P.needsUpdate = true; g.computeBoundingSphere(); g.computeBoundingBox();
  let nr = 0, nn = 0; for (let i = 0; i < N; i++) { let best = -1, bw = -1; for (let k = 0; k < 4; k++) { const w = SW.getComponent(i, k); if (w > bw) { bw = w; best = SI.getComponent(i, k); } } if (bones[best].name !== 'neck_01') continue; v.fromBufferAttribute(P, i); nr += Math.hypot(v.x - J.neck_01.x, v.z - J.neck_01.z); nn++; }
  const neckR = nn ? (nr / nn) * 1.22 : 0.08;
  g.setAttribute('aCloth', new THREE.BufferAttribute(cloth, 2));
  // reference skin colour of the texture (to re-tone skin per character while keeping its painted detail)
  const skinRef = textureMean(body.material.map, 0.5, 0.5, 0.5) || new THREE.Color(0.72, 0.5, 0.4);
  const hairRef = brows && brows.material.map ? textureMean(brows.material.map, 0.5, 0.5, 0.45) : null;
  const legLen = (() => { const c = scene.getObjectByName('calf_l'), f = scene.getObjectByName('foot_l'); return c && f ? c.position.length() + f.position.length() : UAL_LEG; })();
  return { scene, body, eyes, brows, J, sex, legLen, neckR, skinRef, hairRef, headInv: sk.boneInverses[bi.Head].clone(), shoeY: Math.max(J.foot_l.y, J.foot_r.y) + 0.035, waistY: J.spine_01.y - 0.02, collarY: J.neck_01.y - 0.035 };
}
// mean colour of a texture patch (u, v centre, half size) via a small canvas; null if unavailable
function textureMean(tex, u, vv, hs) {
  try {
    const img = tex.image; if (!img) return null; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, 64, 64); const d = x.getImageData(Math.floor((u - hs) * 64), Math.floor((vv - hs) * 64), Math.max(1, Math.floor(hs * 128)), Math.max(1, Math.floor(hs * 128))).data;
    let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const l = d[i] + d[i + 1] + d[i + 2]; if (l < 60) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    if (!n) return null; return new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
  } catch (e) { return null; }
}

// ---------------------------------------------------------------- hair (rigid, re-expressed in head-bone space)
function prepHair(gltf, bodies) {
  const out = {}; gltf.scene.updateMatrixWorld(true);
  const src = { Hair_Buns: 'f', Hair_BuzzedFemale: 'f', Hair_Long: 'f', Eyebrows_Female: 'f', Hair_Buzzed: 'm', Hair_SimpleParted: 'm', Hair_Beard: 'm', Eyebrows_Regular: 'm' };
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return; let n = o.name; let p = o; while (p && !src[n]) { p = p.parent; n = p && p.name; } if (!src[n]) return;
    let g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); const B = bodies[src[n]];
    if (n === 'Hair_Long' && g.index) { // r4-people2: drop the front strands hanging over the chest (they cut through real clothes)
      const P = g.attributes.position, ix = g.index.array, keep = []; const y0 = B.J.neck_01.y + 0.01, z0 = B.J.neck_01.z + 0.035;
      const bad = (i) => P.getY(i) < y0 && P.getZ(i) > z0; for (let f = 0; f < ix.length; f += 3) if (!(bad(ix[f]) || bad(ix[f + 1]) || bad(ix[f + 2]))) keep.push(ix[f], ix[f + 1], ix[f + 2]); g.setIndex(keep); }
    g.applyMatrix4(B.headInv); // bind-pose world -> Head bone space
    g.computeBoundingSphere();
    out[n] = { geometry: g, material: o.material, src: src[n], ref: o.material.map ? textureMean(o.material.map, 0.5, 0.5, 0.45) : null };
  });
  return out;
}
