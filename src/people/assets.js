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
  const FINGER = /^(index|middle|ring|pinky|thumb)_/; const relaxed = {};
  for (const t of raw.Sitting_Idle_Loop.tracks) { const bn = t.name.split('.')[0]; if (FINGER.test(bn) && t.name.endsWith('.quaternion')) relaxed[bn] = t.values.slice(0, 4); }
  for (const n of ['Idle_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Crouch_Idle_Loop']) if (raw[n]) raw[n] = new THREE.AnimationClip(n, raw[n].duration, raw[n].tracks.filter((t) => !FINGER.test(t.name.split('.')[0])));
  for (const k of ['f', 'm']) { bodies[k].clips = retargetClips(raw, bodies[k].legLen / UAL_LEG); bodies[k].relaxed = relaxed; }
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
  // slim the "superhero" build towards an everyday student: arms, thighs and neck pulled toward their bone axis,
  // shoulders/chest narrowed (bind-space edit, so skinning is untouched)
  const slim = sex === 'm' ? { uarm: 0.74, farm: 0.82, thigh: 0.88, calf: 0.92, neck: 0.8, chest: 0.87, chestZ: 0.9, trap: 0.72, hipX: 0.97, hipZ: 0.95 } : { uarm: 0.86, farm: 0.9, thigh: 0.93, calf: 0.96, neck: 0.93, chest: 0.95, chestZ: 0.96, trap: 0.85, hipX: 0.93, hipZ: 0.88 };
  const pull = (p, A, B, k) => { const t = segT(p, A, B); const c = a.copy(A).addScaledVector(ab.subVectors(B, A), t); p.sub(c).multiplyScalar(k).add(c); };
  for (let i = 0; i < N; i++) {
    let best = -1, bw = -1; for (let k = 0; k < 4; k++) { const w = SW.getComponent(i, k); if (w > bw) { bw = w; best = SI.getComponent(i, k); } }
    const bn = bones[best].name; v.fromBufferAttribute(P, i);
    let reg = REG.TRUNK, t = 0; const side = /_l$/.test(bn) ? 'l' : 'r';
    if (bn === 'Head') reg = REG.HEAD;
    else if (/^(hand|index|middle|ring|pinky|thumb)/.test(bn)) reg = REG.HAND;
    else if (/^(upperarm|lowerarm)/.test(bn)) { reg = REG.ARM; t = chainT(v, J['upperarm_' + side], J['lowerarm_' + side], J['hand_' + side]);
      if (bn.startsWith('upperarm')) pull(v, J['upperarm_' + side], J['lowerarm_' + side], slim.uarm); else pull(v, J['lowerarm_' + side], J['hand_' + side], slim.farm); }
    else if (/^(thigh|calf|foot|ball)/.test(bn)) { reg = REG.LEG; t = chainT(v, J['thigh_' + side], J['calf_' + side], J['foot_' + side]);
      if (bn.startsWith('thigh')) pull(v, J['thigh_' + side], J['calf_' + side], slim.thigh); else if (bn.startsWith('calf')) pull(v, J['calf_' + side], J['foot_' + side], slim.calf); }
    else if (bn === 'neck_01') pull(v, J.neck_01, J.Head, slim.neck);
    else if (/^(spine_0[23]|clavicle)/.test(bn)) { v.x *= slim.chest; const zc = J.spine_03.z; v.z = zc + (v.z - zc) * slim.chestZ; const ty = J.spine_03.y + 0.06; if (v.y > ty) v.y = ty + (v.y - ty) * slim.trap; }
    else if (bn === 'pelvis' || bn === 'spine_01') { v.x *= slim.hipX; const zc = J.pelvis.z; if (v.z < zc) v.z = zc + (v.z - zc) * slim.hipZ; }
    P.setXYZ(i, v.x, v.y, v.z); cloth[i * 2] = reg; cloth[i * 2 + 1] = t;
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
    const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); const B = bodies[src[n]];
    g.applyMatrix4(B.headInv); // bind-pose world -> Head bone space
    g.computeBoundingSphere();
    out[n] = { geometry: g, material: o.material, src: src[n], ref: o.material.map ? textureMean(o.material.map, 0.5, 0.5, 0.45) : null };
  });
  return out;
}
