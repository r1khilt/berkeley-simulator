// Horse rig for the rideable-horse mode (see horse.js).
// Loads the CC0 Quaternius horse (rigged, 50 bones), recolours it as a bay with black points and smooth shading,
// drapes procedural tack over it (Cal-blue saddle pad with gold piping, English saddle, girth, bridle, bit), skins the
// tack to the same skeleton, and synthesizes trot + canter clips from the walk/gallop clips by phase-shifting each leg's
// tracks, so walk (4-beat), trot (2-beat diagonal), canter (3-beat) and gallop (4-beat) can be blended by speed.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const HORSE_URL = (import.meta.env.BASE_URL || '/') + 'assets/horse/horse.glb';
export const S = 0.45; // model units -> metres (withers ~1.65 m, back ~1.55 m)

// bones that belong to each leg (sanitized glTF node names)
const LEGS = {
  FL: ['FrontShoulderL', 'FrontUpperLegL', 'FrontLowerLegL', 'IKFrontLegL', 'FFL', 'PoleTargetL'],
  FR: ['FrontShoulderR', 'FrontUpperLegR', 'FrontLowerLegR', 'IKFrontLegR', 'FFR', 'PoleTargetR'],
  HL: ['BackShoulderL', 'BackLegL', 'BackUpperLegL', 'BackLowerLegL', 'IKBackLegL', 'FFBL', 'PoleTargetBackL'],
  HR: ['BackShoulderR', 'BackLegR', 'BackUpperLegR', 'BackLowerLegR', 'IKBackLegR', 'FFBR', 'PoleTargetBackR'],
};
const LEG_OF = {}; for (const [k, list] of Object.entries(LEGS)) for (const b of list) LEG_OF[b] = k;
// touchdown phase of each hoof in the source clips (measured from hoof heights)
const SRC_TD = { Walk: { FL: 0.421, FR: 0.983, HL: 0.242, HR: 0.758 }, Gallop: { FL: 0.0, FR: 0.829, HL: 0.567, HR: 0.412 } };
// Gait synthesis: new(p) = src(p - shift). Shifts chosen so trot pairs the diagonals, canter is a 3-beat left lead
// (RH, then LH+RF together, then LF), and neighbouring gaits share a phase reference so cross-fades stay coherent.
export const GAITS = {
  walk: { src: 'Walk', legs: { FL: -0.1, FR: -0.1, HL: -0.1, HR: -0.1 }, body: -0.1 },
  trot: { src: 'Walk', legs: { FL: 0.079, FR: 0.017, HL: -0.242, HR: -0.258 }, body: -0.15 },
  canter: { src: 'Gallop', legs: { FL: 0.21, FR: 0.161, HL: 0.403, HR: 0.338 }, body: 0.338 },
  gallop: { src: 'Gallop', legs: { FL: 0.338, FR: 0.338, HL: 0.338, HR: 0.338 }, body: 0.338 },
};
for (const g of Object.values(GAITS)) { g.td = {}; for (const l in g.legs) { const v = SRC_TD[g.src][l] + g.legs[l]; g.td[l] = v - Math.floor(v); } }

function synthClip(src, name, g) {
  const D = src.duration, K = Math.max(28, Math.round(D * 48)); const tracks = [];
  for (const tr of src.tracks) {
    const bone = tr.name.split('.')[0]; const shift = LEG_OF[bone] ? g.legs[LEG_OF[bone]] : g.body;
    const it = tr.createInterpolant(); const n = tr.getValueSize();
    const times = new Float32Array(K + 1), vals = new Float32Array((K + 1) * n);
    for (let i = 0; i <= K; i++) { let sp = (i === K ? 0 : i / K) - shift; sp -= Math.floor(sp); vals.set(it.evaluate(Math.min(sp * D, D - 1e-4)), i * n); times[i] = (i / K) * D; }
    tracks.push(new tr.constructor(tr.name, times, vals));
  }
  return new THREE.AnimationClip(name, D, tracks);
}

// ---- colours (sRGB) ----
const C = (h) => new THREE.Color(h);
const COAT = { body: C('#7a4022'), dorsal: C('#5a2e18'), belly: C('#8a5232'), points: C('#1b1612'), muzzle: C('#2e221c'), hoof: C('#34302b'), eye: C('#0b0a09'), eyeW: C('#2a1d16'), blaze: C('#e9e4da') };
const SPINE = new Set(['Body', 'Back', 'Torso', 'Torso2', 'Torso3']);
const HEADB = new Set(['Head', 'Neck3']);

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// average normals of coincident vertices (smooth shading across colour seams)
function weldNormals(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal; const map = new Map(); const key = (i) => `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
  for (let i = 0; i < p.count; i++) { const k = key(i); const a = map.get(k); if (a) { a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); } else map.set(k, [n.getX(i), n.getY(i), n.getZ(i)]); }
  for (let i = 0; i < p.count; i++) { const a = map.get(key(i)); const l = Math.hypot(a[0], a[1], a[2]) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
}

export async function loadHorseRig(url = HORSE_URL) {
  const gltf = await new GLTFLoader().loadAsync(url);
  return new HorseRig(gltf);
}

export class HorseRig {
  constructor(gltf) {
    const src = gltf.scene; src.updateMatrixWorld(true);
    const skinned = []; src.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
    const skeleton = skinned[0].skeleton; this.skeleton = skeleton;
    const toModel = skinned[0].matrixWorld.clone(); const toLocal = toModel.clone().invert();
    // ---- merge primitives into one coloured, smooth-shaded geometry
    const geos = []; const v = new THREE.Vector3();
    for (const m of skinned) {
      const g = m.geometry.clone(); for (const k of Object.keys(g.attributes)) if (!['position', 'skinIndex', 'skinWeight'].includes(k)) g.deleteAttribute(k);
      const mn = m.material.name; const p = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight; const col = new Float32Array(p.count * 3); const c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(toModel);
        let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; bi = si.getComponent(i, k); } }
        const bn = skeleton.bones[bi].name;
        if (mn === 'Hair') c.copy(COAT.points);
        else if (mn === 'Hooves') c.copy(COAT.hoof);
        else if (mn === 'Eye_Black') c.copy(COAT.eye);
        else if (mn === 'Eye_White') c.copy(COAT.eyeW);
        else if (mn === 'Muzzle') c.copy(COAT.muzzle);
        else {
          c.copy(COAT.body);
          // countershading: darker topline, lighter belly
          c.lerp(COAT.dorsal, smoothstep(3.2, 3.6, v.y) * 0.6 * (SPINE.has(bn) ? 1 : 0.4));
          if (SPINE.has(bn)) c.lerp(COAT.belly, smoothstep(2.6, 2.1, v.y) * 0.5);
          // bay points: black lower legs
          if (/Leg|FF|IK/.test(bn)) c.lerp(COAT.points, smoothstep(1.55, 1.05, v.y));
          // dark muzzle fade and ear rims
          if (bn === 'Head') c.lerp(COAT.muzzle, smoothstep(3.05, 3.35, v.z) * 0.85);
          if (/Ear/.test(bn)) c.lerp(COAT.points, smoothstep(4.45, 4.75, v.y) * 0.9);
          // small white star on the forehead
          if (bn === 'Head' && Math.abs(v.x) < 0.07 && v.z > 2.72 && v.z < 3.15 && v.y > 3.95 - (v.z - 2.72) * 0.9) c.lerp(COAT.blaze, smoothstep(0.07, 0.035, Math.abs(v.x)) * smoothstep(3.15, 2.95, v.z));
        }
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      // de-interleave / de-normalize skin attributes so every primitive merges with the same layout
      const SI = new Uint16Array(p.count * 4), SW = new Float32Array(p.count * 4), P = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { let tot = 0; for (let k = 0; k < 4; k++) { SI[i * 4 + k] = si.getComponent(i, k); tot += (SW[i * 4 + k] = sw.getComponent(i, k)); } if (tot > 0) for (let k = 0; k < 4; k++) SW[i * 4 + k] /= tot; P[i * 3] = p.getX(i); P[i * 3 + 1] = p.getY(i); P[i * 3 + 2] = p.getZ(i); }
      g.setAttribute('position', new THREE.BufferAttribute(P, 3));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
      geos.push(g);
    }
    let geo = mergeGeometries(geos, false); geo = mergeVertices(geo, 1e-5); geo.computeVertexNormals(); weldNormals(geo);
    this.coatMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0, name: 'horseCoat' });
    const coat = new THREE.SkinnedMesh(geo, this.coatMat); coat.name = 'horseCoat';
    const parent = skinned[0].parent; parent.add(coat); coat.bind(skeleton, skinned[0].bindMatrix);
    for (const m of skinned) parent.remove(m);
    // ---- tack (built in model space, skinned by copying the nearest coat vertex's weights)
    const bindModel = geo.clone().applyMatrix4(toModel);
    this.tackMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0.05, side: THREE.DoubleSide, name: 'horseTack' });
    const tackGeo = buildTack(bindModel, skeleton, this);
    tackGeo.applyMatrix4(toLocal); tackGeo.computeVertexNormals();
    const tack = new THREE.SkinnedMesh(tackGeo, this.tackMat); tack.name = 'horseTack'; parent.add(tack); tack.bind(skeleton, skinned[0].bindMatrix);
    this.meshes = [coat, tack];
    for (const m of this.meshes) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; }
    // ---- container: metres, facing -z, hooves at y = 0, legs centred on the origin
    this.root = new THREE.Group(); this.root.name = 'horse';
    this.tilt = new THREE.Group(); this.tilt.position.y = 1.1; this.root.add(this.tilt);   // slope pitch / turn lean about the body centre
    this.model = new THREE.Group(); this.model.position.y = -1.1; this.tilt.add(this.model);
    src.rotation.y = Math.PI; src.scale.setScalar(S); src.position.set(0, 0, 0.05 * S); this.model.add(src); this.src = src;
    this.bones = {}; for (const b of skeleton.bones) this.bones[b.name] = b;
    // ---- animation
    this.mixer = new THREE.AnimationMixer(src);
    const clip = (n) => gltf.animations.find((a) => a.name === n);
    this.actions = {};
    const add = (k, c) => { const a = this.mixer.clipAction(c); a.setLoop(THREE.LoopRepeat, Infinity); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.actions[k] = a; return a; };
    for (const [k, g] of Object.entries(GAITS)) { const a = add(k, synthClip(clip(g.src), 'horse_' + k, g)); a.timeScale = 0; }
    add('idle', clip('Idle')); add('idle2', clip('Idle_2')); add('headlow', clip('Idle_Headlow')); add('eat', clip('Eating'));
    this.jumpClip = clip('Gallop_Jump'); const j = add('jump', this.jumpClip); j.timeScale = 0;
    // body-rise curve of the jump clip (metres), used to cancel its vertical motion so physics drives the arc
    this.jumpRise = this._sampleRise(this.jumpClip, 64);
    this.phase = 0;
    for (const k of ['idle', 'idle2', 'headlow', 'eat']) this.actions[k]._bw = k === 'idle' ? 1 : 0;
    this.actions.idle.setEffectiveWeight(1);
    this.mixer.update(0);
    this._anchors();
  }
  _sampleRise(clip, n) {
    const m = new THREE.AnimationMixer(this.src); const a = m.clipAction(clip); a.play(); const body = this.bones.Body; const out = new Float32Array(n + 1); const p = new THREE.Vector3();
    let base = null;
    for (let i = 0; i <= n; i++) { a.time = (i / n) * clip.duration; m.update(0); this.root.updateMatrixWorld(true); body.getWorldPosition(p); if (base === null) base = p.y; out[i] = p.y - base; }
    a.stop(); m.uncacheRoot(this.src); this.skeleton.pose(); this.root.updateMatrixWorld(true);
    return out;
  }
  riseAt(t) { const r = this.jumpRise, n = r.length - 1; const f = Math.min(n, Math.max(0, (t / this.jumpClip.duration) * n)); const i = Math.floor(f), k = Math.min(n, i + 1); return r[i] + (r[k] - r[i]) * (f - i); }
  _anchors() {
    this.skeleton.pose(); this.root.updateMatrixWorld(true);
    // model-space point (model units, x across, y up, z toward the head) -> bone-local point
    const local = (boneName, xyz) => { const wp = this.src.localToWorld(new THREE.Vector3(...xyz)); return this.bones[boneName].worldToLocal(wp); };
    this.seat = local('Torso2', [0, this.seatY, this.seatZ]);
    this.bit = [local('Head', this.bitPts[0]), local('Head', this.bitPts[1])];
    this.stirrupTop = [local('Torso2', [this.stirrupX, this.stirrupY, this.stirrupZ]), local('Torso2', [-this.stirrupX, this.stirrupY, this.stirrupZ])];
    this.withers = local('Torso3', [0, this.withersY + 0.05, this.withersZ]);
    // bone-local axes equal to the horse's vertical, for turning the neck/head into turns
    this.lookAxes = ['Neck2', 'Neck3', 'Head'].map((n) => { const q = this.bones[n].getWorldQuaternion(new THREE.Quaternion()).invert(); return [this.bones[n], new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize()]; });
    this.mixer.update(0);
  }
  boneWorld(name, localP, out) { return out.copy(localP).applyMatrix4(this.bones[name].matrixWorld); }
  // gaitW: weights per gait; cadence Hz; dir -1 walks backwards; idleKind: idle|idle2|headlow|eat; jumpT: clip time
  animate(dt, { gaitW, cadence, dir = 1, idleKind = 'idle', jumpT = -1, jumpW = 0, look = 0 }) {
    this.phase += cadence * dt * dir; this.phase -= Math.floor(this.phase);
    let moving = 0; for (const k of ['walk', 'trot', 'canter', 'gallop']) moving += gaitW[k] || 0;
    const loco = 1 - jumpW;
    for (const k of ['walk', 'trot', 'canter', 'gallop']) { const a = this.actions[k]; a.setEffectiveWeight((gaitW[k] || 0) * loco); a.time = this.phase * a.getClip().duration; }
    const idleW = Math.max(0, 1 - moving) * loco;
    for (const k of ['idle', 'idle2', 'headlow', 'eat']) { const a = this.actions[k]; const target = k === idleKind ? 1 : 0; a._bw += (target - a._bw) * Math.min(1, dt * 2.5); const w = a._bw * idleW; a.setEffectiveWeight(w < 0.002 ? 0 : w); }
    const ja = this.actions.jump; ja.setEffectiveWeight(jumpW); if (jumpT >= 0) ja.time = jumpT;
    this.mixer.update(dt);
    // head and neck look into turns
    if (Math.abs(look) > 1e-3) for (const [b, ax] of this.lookAxes) { this._q.setFromAxisAngle(ax, look * 0.28); b.quaternion.multiply(this._q); }
  }
}
HorseRig.prototype._q = new THREE.Quaternion(); HorseRig.prototype._ax = new THREE.Vector3();

// ---------------------------------------------------------------------------------------------------------------
// Tack: drape surfaces over the bind-pose body with rays cast toward an axis, then skin to the nearest body vertex.
function buildTack(bind, skeleton, rig) {
  const pos = bind.attributes.position, si = bind.attributes.skinIndex, sw = bind.attributes.skinWeight, idx = bind.index.array;
  const domBone = new Int32Array(pos.count); for (let i = 0; i < pos.count; i++) { let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; bi = si.getComponent(i, k); } } domBone[i] = bi; }
  const nameOf = (i) => skeleton.bones[domBone[i]].name;
  // raycast targets restricted to body parts (so straps skip ears, mane and legs)
  const target = (filter) => { const tri = []; for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (filter(nameOf(a)) && filter(nameOf(b)) && filter(nameOf(c))) tri.push(a, b, c); } const g = new THREE.BufferGeometry(); g.setAttribute('position', pos); g.setIndex(tri); g.computeBoundingSphere(); return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); };
  const body = target((n) => SPINE.has(n) || n === 'Neck1');
  const head = target((n) => HEADB.has(n) || n === 'Neck2');
  const rc = new THREE.Raycaster(); const up = new THREE.Vector3(0, 1, 0);
  const frame = (a, b) => { const u = new THREE.Vector3().subVectors(b, a).normalize(); const vup = up.clone().addScaledVector(u, -up.dot(u)).normalize(); const side = new THREE.Vector3().crossVectors(vup, u).normalize(); return { u, vup, side }; };
  // surface point at axis parameter t and angle th (0 = top), ray cast inward toward the axis
  const surf = (mesh, a, b, F, t, th, out) => {
    const c = new THREE.Vector3().lerpVectors(a, b, t); const d = new THREE.Vector3().copy(F.vup).multiplyScalar(Math.cos(th)).addScaledVector(F.side, Math.sin(th));
    rc.set(c.clone().addScaledVector(d, 3), d.clone().negate()); rc.far = 3.2; const h = rc.intersectObject(mesh, false)[0];
    out.p = h ? h.point.clone() : c.clone().addScaledVector(d, 0.5); out.d = d; out.hit = !!h; return out;
  };
  const parts = [];
  const add = (geo, color, bones) => { parts.push({ geo, color: new THREE.Color(color), bones }); };
  // slab over a (t, th) grid: offset(t, th) above the surface, thickness thick
  const slab = (mesh, a, b, t0, t1, thFn, nT, nTh, offFn, thick) => {
    const F = frame(a, b); const top = [], bot = []; const o = {};
    for (let j = 0; j <= nT; j++) { const t = t0 + (t1 - t0) * (j / nT); const [ta, tb] = thFn(t); for (let i = 0; i <= nTh; i++) { const th = ta + (tb - ta) * (i / nTh); surf(mesh, a, b, F, t, th, o); const off = offFn(t, th); bot.push(o.p.clone().addScaledVector(o.d, off)); top.push(o.p.clone().addScaledVector(o.d, off + thick)); } }
    return gridSlab(top, bot, nT, nTh);
  };
  // ---- body axis (model units): through the barrel, from the withers back toward the croup
  const A = new THREE.Vector3(0, 2.86, 1.25), B = new THREE.Vector3(0, 2.86, -0.75);
  const tOfZ = (z) => (1.25 - z) / 2.0;
  const SPINEB = SPINE;
  // saddle pad: gold piping slab underneath, Cal-blue slab on top
  const padTh = (t) => { const e = Math.min(1, Math.min(t - tOfZ(1.1), tOfZ(-0.3) - t) / 0.08); const w = 1.55 - 0.25 * (1 - Math.max(0, e)); return [-w, w]; };
  add(slab(body, A, B, tOfZ(1.1), tOfZ(-0.3), padTh, 12, 18, () => 0.012, 0.03), '#e0a516', SPINEB);
  const padIn = (t) => { const [a2, b2] = padTh(t); return [a2 + 0.07, b2 - 0.07]; };
  add(slab(body, A, B, tOfZ(1.06), tOfZ(-0.26), padIn, 12, 18, () => 0.03, 0.035), '#0b2f57', SPINEB);
  // saddle seat: dished between a raised pommel and cantle
  const sT0 = tOfZ(0.9), sT1 = tOfZ(0.06);
  const seatOff = (t, th) => { const u = (t - sT0) / (sT1 - sT0); const pom = Math.exp(-((u - 0.02) ** 2) / 0.006) * 0.2 * Math.max(0, 1 - Math.abs(th) / 0.55); const can = Math.exp(-((u - 0.97) ** 2) / 0.008) * 0.16 * Math.max(0, 1 - Math.abs(th) / 0.75); return 0.07 + pom + can + 0.03 * Math.cos(th); };
  add(slab(body, A, B, sT0, sT1, (t) => { const u = (t - sT0) / (sT1 - sT0); const w = 0.8 - 0.9 * (u - 0.45) ** 2; return [-w, w]; }, 14, 16, seatOff, 0.07), '#3d2414', SPINEB);
  // flaps (English): leather panels down each side, angled forward, with knee rolls
  for (const s of [-1, 1]) {
    const fl = (t) => { const u = (t - tOfZ(0.86)) / (tOfZ(0.22) - tOfZ(0.86)); const a0 = 0.62, a1 = 1.36 - 0.12 * u; return s > 0 ? [a0, a1] : [-a1, -a0]; };
    add(slab(body, A, B, tOfZ(0.86), tOfZ(0.22), fl, 8, 8, () => 0.075, 0.03), '#4a2c18', SPINEB);
    add(slab(body, A, B, tOfZ(0.88), tOfZ(0.74), () => (s > 0 ? [0.75, 1.3] : [-1.3, -0.75]), 3, 6, () => 0.1, 0.035), '#3a2213', SPINEB);
  }
  // girth: band around the barrel just behind the elbows
  { const gT = tOfZ(0.62); add(slab(body, A, B, gT - 0.035, gT + 0.035, () => [0.7, Math.PI * 2 - 0.7], 1, 30, () => 0.012, 0.025), '#2c1a10', SPINEB); }
  // ---- head axis: poll -> muzzle
  const HA = new THREE.Vector3(0, 4.14, 2.5), HB = new THREE.Vector3(0, 3.58, 3.47);
  const HEADS = new Set(['Head', 'Neck3', 'Neck2']);
  const strap = '#2a180d', th = 0.016, off = 0.006;
  add(slab(head, HA, HB, 0.03, 0.075, () => [-1.75, 1.75], 1, 16, () => off, th), strap, HEADS);                    // crownpiece
  add(slab(head, HA, HB, 0.06, 0.1, () => [1.75, Math.PI * 2 - 1.75], 1, 10, () => off, th), strap, HEADS);          // throatlatch
  add(slab(head, HA, HB, 0.16, 0.2, () => [-1.15, 1.15], 1, 12, () => off, th), '#0b2f57', HEADS);                    // browband
  add(slab(head, HA, HB, 0.6, 0.66, () => [0, Math.PI * 2], 1, 26, () => off, th * 1.2), strap, HEADS);              // noseband
  for (const s of [-1, 1]) add(slab(head, HA, HB, 0.05, 0.76, (t) => { const k = (t - 0.05) / 0.71; const a0 = 1.5 + 0.35 * k, a1 = a0 + 0.16; return s > 0 ? [a0, a1] : [-a1, -a0]; }, 12, 1, () => off * 1.5, th), strap, HEADS); // cheekpieces
  // bit rings at the corners of the mouth
  const F = frame(HA, HB); const o = {}; rig.bitPts = [];
  for (const s of [1, -1]) {
    surf(head, HA, HB, F, 0.77, s * 1.95, o); const c = o.p.clone().addScaledVector(o.d, 0.035); rig.bitPts.push([c.x, c.y, c.z]);
    const ring = new THREE.TorusGeometry(0.06, 0.013, 6, 14); ring.rotateY(Math.PI / 2); ring.translate(c.x, c.y, c.z);
    add(ring, '#c8ccd2', HEADS);
  }
  // ---- anchors for the rider (model units)
  const so = {}; surf(body, A, B, frame(A, B), (sT0 + sT1) * 0.55, 0, so); rig.seatY = so.p.y + 0.1; rig.seatZ = so.p.z;
  const st = {}; surf(body, A, B, frame(A, B), tOfZ(0.72), 1.05, st); rig.stirrupX = st.p.x + 0.12; rig.stirrupY = st.p.y; rig.stirrupZ = st.p.z;
  const wi = {}; surf(body, A, B, frame(A, B), tOfZ(1.2), 0, wi); rig.withersY = wi.p.y; rig.withersZ = wi.p.z;
  // ---- skin: copy weights of the nearest allowed body vertex
  const geos = [];
  for (const part of parts) {
    let g = part.geo; if (g.index) g = g.toNonIndexed(); const p = g.attributes.position; const n = p.count;
    const sidx = new Uint16Array(n * 4), swt = new Float32Array(n * 4), col = new Float32Array(n * 3);
    const allowed = []; for (let i = 0; i < pos.count; i++) if (part.bones.has(nameOf(i))) allowed.push(i);
    const q = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      q.fromBufferAttribute(p, i); let best = allowed[0], bd = 1e9;
      for (const k of allowed) { const dx = pos.getX(k) - q.x, dy = pos.getY(k) - q.y, dz = pos.getZ(k) - q.z; const d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = k; } }
      for (let k = 0; k < 4; k++) { sidx[i * 4 + k] = si.getComponent(best, k); swt[i * 4 + k] = sw.getComponent(best, k); }
      col[i * 3] = part.color.r; col[i * 3 + 1] = part.color.g; col[i * 3 + 2] = part.color.b;
    }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', p.clone()); out.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sidx, 4)); out.setAttribute('skinWeight', new THREE.Float32BufferAttribute(swt, 4)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(out);
  }
  return mergeGeometries(geos, false);
}

// closed slab from two (nT+1)x(nTh+1) grids (top and bottom surfaces)
function gridSlab(top, bot, nT, nTh) {
  const P = [], push = (a, b, c) => P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  const id = (j, i) => j * (nTh + 1) + i;
  for (let j = 0; j < nT; j++) for (let i = 0; i < nTh; i++) {
    const a = id(j, i), b = id(j, i + 1), c = id(j + 1, i + 1), d = id(j + 1, i);
    push(top[a], top[c], top[b]); push(top[a], top[d], top[c]);
    push(bot[a], bot[b], bot[c]); push(bot[a], bot[c], bot[d]);
  }
  for (let i = 0; i < nTh; i++) for (const j of [0, nT]) { const a = id(j, i), b = id(j, i + 1); if (j === 0) { push(top[a], top[b], bot[b]); push(top[a], bot[b], bot[a]); } else { push(top[a], bot[b], top[b]); push(top[a], bot[a], bot[b]); } }
  for (let j = 0; j < nT; j++) for (const i of [0, nTh]) { const a = id(j, i), d = id(j + 1, i); if (i === 0) { push(top[a], bot[d], top[d]); push(top[a], bot[a], bot[d]); } else { push(top[a], top[d], bot[d]); push(top[a], bot[d], bot[a]); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); return g;
}
