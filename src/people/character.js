// One near-LOD person: a skinned Quaternius body (shared geometry, own skeleton), dressed by a clothing shader from the
// campus-life look (top/bottom colours, sleeves, trousers vs shorts, shoes, skin tone, hair style/colour), with
// backpack / bag / phone / cup / book props, UAL motion clips (walk synced to the crowd's phase so the hand-off from
// the instanced far LOD is seamless) and small procedural layers on top: head gaze, phone-in-hand arm, ground sitting,
// lying on the lawn, bump reactions.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { REG } from './assets.js';

const TAU = Math.PI * 2;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion(), m1 = new THREE.Matrix4();
const lin = (a) => new THREE.Color(a[0], a[1], a[2]);
const FL = { SLEEVE: 1, PANTS: 2, BACKPACK: 4, SKIRT: 8, BAG: 16, PHONE: 32, BOOK: 64, CUP: 128 };

// ---------------------------------------------------------------- materials
function bodyMaterial(base, B) {
  const m = base.clone(); m.name = 'people:body'; m.roughness = 0.62; m.metalness = 0;
  const u = { uTop: { value: new THREE.Color(0.1, 0.15, 0.3) }, uBot: { value: new THREE.Color(0.1, 0.1, 0.12) }, uShoe: { value: new THREE.Color(0.8, 0.8, 0.8) }, uSkin: { value: new THREE.Color(0.7, 0.5, 0.4) },
    uSkinRef: { value: new THREE.Vector3(B.skinRef.r, B.skinRef.g, B.skinRef.b) }, uCut: { value: new THREE.Vector4(0.45, 1, B.shoeY, B.waistY) }, uCollar: { value: B.collarY }, uNeck: { value: new THREE.Vector3(B.J.neck_01.x, B.J.neck_01.z, B.neckR) }, uAnkL: { value: B.J.foot_l.clone() }, uAnkR: { value: B.J.foot_r.clone() } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec2 aCloth; flat varying float vReg; varying float vLimbT; varying vec3 vBind; uniform vec4 uCut; uniform float uCollar; uniform vec3 uNeck, uAnkL, uAnkR;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
 vReg = aCloth.x; vLimbT = aCloth.y; vBind = position;
 { float inf = 0.0; // clothes stand a little off the skin
   if (aCloth.x > 0.5 && aCloth.x < 1.5) inf = position.y < uCut.w ? 0.011 : ((position.y < uCollar || length(position.xz - uNeck.xy) > uNeck.z) ? 0.012 : 0.0);
   else if (aCloth.x > 1.5 && aCloth.x < 2.5) inf = aCloth.y < uCut.x ? 0.009 : 0.0;
   else if (aCloth.x > 3.5) inf = position.y < uCut.z ? 0.017 : (aCloth.y < uCut.y ? 0.008 : 0.0);
   transformed += normal * inf;
   if (aCloth.x > 3.5 && position.y < uCut.z + 0.01) { vec3 an = position.x > 0.0 ? uAnkL : uAnkR; transformed = an + (position - an) * vec3(0.72, 0.8, 0.82); } } // bare foot tucked inside the sneaker`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uTop, uBot, uShoe, uSkin, uSkinRef, uNeck; uniform vec4 uCut; uniform float uCollar;
flat varying float vReg; varying float vLimbT; varying vec3 vBind;
float pHash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
 float clothK = 0.0; vec3 cc = vec3(0.0); float shoeK = 0.0;
 if (vReg > 0.5 && vReg < 1.5) { if (vBind.y < uCut.w) { cc = uBot; clothK = 1.0; } else if (vBind.y < uCollar - max(0.0, vBind.z - uNeck.y) * 0.5 || length(vBind.xz - uNeck.xy) > uNeck.z) { cc = uTop; clothK = 1.0; } }
 else if (vReg > 1.5 && vReg < 2.5) { if (vLimbT < uCut.x) { cc = uTop; clothK = 1.0; } }
 else if (vReg > 3.5) { if (vBind.y < uCut.z) { cc = uShoe * 0.5; clothK = 1.0; shoeK = 1.0; } else if (vLimbT < uCut.y) { cc = uBot; clothK = 1.0; } }
 // fabric: faint weave noise + darker seams at hems so the clothes don't read as paint
 float hem = (vReg > 1.5 && vReg < 2.5) ? smoothstep(0.03, 0.0, uCut.x - vLimbT) : (vReg > 3.5 ? smoothstep(0.03, 0.0, uCut.y - vLimbT) : 0.0);
 cc *= 1.0 - 0.25 * hem * (1.0 - shoeK);
 float sl = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)) / max(dot(uSkinRef, vec3(0.299, 0.587, 0.114)), 0.04);
 vec3 skinC = uSkin * mix(1.0, clamp(sl, 0.4, 1.4), 0.55);
 diffuseColor.rgb = mix(skinC, cc, clothK);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
 roughnessFactor = mix(roughnessFactor, mix(0.88, 0.55, shoeK), clothK);`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
 vec3 geoN = normal;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
 normal = normalize(mix(normal, geoN, clothK));`);
  };
  m.customProgramCacheKey = () => 'people-body';
  return m;
}
const _propMats = {};
function propMat(hex, rough = 0.8, metal = 0, emissive = 0) { const k = hex + rough + metal + emissive; return _propMats[k] || (_propMats[k] = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal, emissive: emissive ? hex : 0x000000, emissiveIntensity: emissive, name: 'people:prop' })); }

// ---------------------------------------------------------------- per-sex prop geometry (built once, in bind space)
const _props = {};
function propsFor(B) {
  if (_props[B.sex]) return _props[B.sex];
  const J = B.J; const P = {};
  // head box from the head-region vertices (cap / beanie placement)
  const g = B.body.geometry, pos = g.attributes.position, cl = g.attributes.aCloth; const hb = new THREE.Box3(); const tb = new THREE.Box3();
  for (let i = 0; i < pos.count; i++) { v1.fromBufferAttribute(pos, i); if (cl.getX(i) === REG.HEAD) hb.expandByPoint(v1); else if (cl.getX(i) === REG.TRUNK && v1.y > J.spine_02.y && v1.y < J.spine_03.y + 0.1) tb.expandByPoint(v1); }
  P.headBox = hb; P.trunkBox = tb;
  // backpack + straps (spine_03 space); the body faces +z in bind space, so the back is -z
  const back = tb.min.z, front = tb.max.z, shY = J.spine_03.y + 0.13, w = (tb.max.x - tb.min.x);
  const bp = new RoundedBoxGeometry(0.3, 0.4, 0.15, 3, 0.045); bp.translate(0, J.spine_02.y + 0.06, back - 0.07);
  const pocket = new RoundedBoxGeometry(0.22, 0.16, 0.05, 2, 0.02); pocket.translate(0, J.spine_02.y - 0.04, back - 0.155);
  const straps = [];
  for (const s of [-1, 1]) {
    const x = s * Math.min(0.1, w * 0.28);
    for (const [a, b] of [[[x, shY - 0.06, back - 0.03], [x, shY + 0.035, (back + front) * 0.5 - 0.02]], [[x, shY + 0.035, (back + front) * 0.5 - 0.02], [x * 1.05, shY - 0.2, front + 0.012]], [[x * 1.05, shY - 0.2, front + 0.012], [x * 1.12, J.spine_01.y + 0.06, front - 0.01]]]) {
      const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b); const L = A.distanceTo(Bv); const st = new THREE.BoxGeometry(0.045, L, 0.012);
      st.applyQuaternion(q1.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v1.subVectors(Bv, A).normalize())); st.translate((A.x + Bv.x) / 2, (A.y + Bv.y) / 2, (A.z + Bv.z) / 2); straps.push(st);
    }
  }
  P.backpack = { body: [bp, pocket], straps };
  // shoulder bag hanging at the left hip (pelvis space) with a strap across the chest
  const bag = new RoundedBoxGeometry(0.3, 0.24, 0.09, 2, 0.03); bag.translate(0.2, J.pelvis.y - 0.02, -0.01);
  P.bag = bag;
  // cap and beanie (Head space)
  const hc = hb.getCenter(new THREE.Vector3()), hs = hb.getSize(new THREE.Vector3());
  const crown = new THREE.SphereGeometry(hs.x * 0.56, 16, 8, 0, TAU, 0, Math.PI * 0.5); crown.scale(1, 0.72, (hs.z / hs.x) * 1.04); crown.translate(hc.x, hb.max.y - hs.y * 0.3, hc.z - hs.z * 0.02);
  const brim = new THREE.CylinderGeometry(hs.x * 0.42, hs.x * 0.42, 0.012, 16, 1, false, -Math.PI / 2, Math.PI); brim.scale(1, 1, 1.55); brim.translate(hc.x, hb.max.y - hs.y * 0.29, hc.z + hs.z * 0.38);
  P.cap = [crown, brim];
  const beanie = new THREE.SphereGeometry(hs.x * 0.585, 16, 10, 0, TAU, 0, Math.PI * 0.56); beanie.scale(1, 0.95, (hs.z / hs.x) * 1.02); beanie.translate(hc.x, hb.max.y - hs.y * 0.36, hc.z - hs.z * 0.03);
  const cuff = new THREE.TorusGeometry(hs.x * 0.57, 0.018, 6, 20); cuff.rotateX(Math.PI / 2); cuff.scale(1, 1, (hs.z / hs.x) * 1.02); cuff.translate(hc.x, hb.max.y - hs.y * 0.36, hc.z - hs.z * 0.03);
  P.beanie = [beanie, cuff];
  // sneakers (foot space): upper + white midsole, toe box tapered; the body foot shrinks inside (shader)
  P.shoe = {};
  for (const sd of ['l', 'r']) {
    const A = J['foot_' + sd], Bl = J['ball_' + sd]; const len = 0.27, back = 0.075; const up = new RoundedBoxGeometry(0.1, 0.085, len, 3, 0.035);
    const pa = up.attributes.position; for (let i = 0; i < pa.count; i++) { const z = pa.getZ(i) / len + 0.5; const k = 1 - Math.max(0, z - 0.6) * 0.55; pa.setX(i, pa.getX(i) * k); if (pa.getY(i) > 0) pa.setY(i, pa.getY(i) * (1 - Math.max(0, z - 0.55) * 0.9)); }
    up.computeVertexNormals(); up.translate(A.x + (sd === 'l' ? 0.006 : -0.006), 0.05, A.z - back + len / 2);
    const sole = new RoundedBoxGeometry(0.106, 0.026, len + 0.008, 2, 0.011); sole.translate(A.x + (sd === 'l' ? 0.006 : -0.006), 0.013, A.z - back + len / 2);
    P.shoe[sd] = [up, sole];
  }
  // hand props (character-root space, placed per frame)
  const phone = new RoundedBoxGeometry(0.072, 0.148, 0.009, 2, 0.006); P.phone = phone; const screen = new THREE.PlaneGeometry(0.064, 0.136); screen.translate(0, 0, 0.0052); P.screen = screen;
  const cup = new THREE.CylinderGeometry(0.043, 0.034, 0.13, 12); const lid = new THREE.CylinderGeometry(0.046, 0.046, 0.016, 12); lid.translate(0, 0.072, 0); P.cup = [cup, lid];
  const book = new RoundedBoxGeometry(0.17, 0.24, 0.035, 1, 0.004); P.book = book;
  return (_props[B.sex] = P);
}
function boneSpace(geo, B, boneName) { const g = geo.clone(); const sk = B.body.skeleton; const i = sk.bones.findIndex((b) => b.name === boneName); g.applyMatrix4(sk.boneInverses[i]); return g; }

// ---------------------------------------------------------------- character
export class Character {
  constructor(assets, sex, castShadow = true) {
    const B = this.B = assets.bodies[sex]; this.sex = sex; this.assets = assets;
    this.root = new THREE.Group(); this.root.name = 'people:char'; this.root.visible = false;
    this.inner = new THREE.Group(); this.root.add(this.inner); this.inner.rotation.y = Math.PI; // bind space faces +z, the game faces -z
    const clone = SkeletonUtils.clone(B.scene); this.inner.add(clone); this.model = clone;
    clone.traverse((o) => { if (!o.isSkinnedMesh) return; o.frustumCulled = false; o.castShadow = castShadow; o.receiveShadow = true;
      if (o.geometry === B.body.geometry) this.body = o; else if (B.eyes && o.geometry === B.eyes.geometry) this.eyes = o; else if (B.brows && o.geometry === B.brows.geometry) this.brows = o; });
    if (this.eyes) this.eyes.castShadow = false;
    this.mat = bodyMaterial(B.body.material, B); this.body.material = this.mat; this.u = this.mat.userData.u;
    if (this.brows) { this.browMat = this.brows.material.clone(); this.brows.material = this.browMat; this.brows.castShadow = false; }
    this.bones = {}; for (const b of this.body.skeleton.bones) this.bones[b.name] = b;
    // hair: one mesh per style hung on the Head bone, only the chosen one visible
    this.hairMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, name: 'people:hair' });
    this.hair = {};
    for (const [n, h] of Object.entries(assets.hair)) {
      if (/^Eyebrows/.test(n)) continue;
      const mat = this.hairMat.clone(); mat.map = h.material.map || null; mat.normalMap = h.material.normalMap || null; mat.side = THREE.DoubleSide;
      const me = new THREE.Mesh(h.geometry, mat); me.visible = false; me.castShadow = castShadow; me.name = 'people:' + n;
      if (h.src !== sex) { me.scale.setScalar(sex === 'f' ? 0.96 : 1.04); }
      this.bones.Head.add(me); this.hair[n] = { mesh: me, ref: h.ref };
    }
    // props
    const P = propsFor(B);
    this.bpMat = propMat('#2a3440', 0.8).clone();
    const bpGeo = P.backpack.body.map((g) => boneSpace(g, B, 'spine_03')); const stGeo = P.backpack.straps.map((g) => boneSpace(g, B, 'spine_03'));
    this.backpack = new THREE.Group(); for (const g of bpGeo) this.backpack.add(new THREE.Mesh(g, this.bpMat)); for (const g of stGeo) this.backpack.add(new THREE.Mesh(g, propMat('#15181c', 0.9)));
    this.bones.spine_03.add(this.backpack);
    this.bag = new THREE.Mesh(boneSpace(P.bag, B, 'pelvis'), this.bpMat); this.bones.pelvis.add(this.bag);
    this.capMat = propMat('#003262', 0.75).clone();
    this.cap = new THREE.Group(); for (const g of P.cap) this.cap.add(new THREE.Mesh(boneSpace(g, B, 'Head'), this.capMat)); this.bones.Head.add(this.cap);
    this.beanie = new THREE.Group(); for (const g of P.beanie) this.beanie.add(new THREE.Mesh(boneSpace(g, B, 'Head'), this.capMat)); this.bones.Head.add(this.beanie);
    this.shoeMat = propMat('#dddddd', 0.6).clone();
    for (const sd of ['l', 'r']) { const [up, sole] = P.shoe[sd]; const g2 = new THREE.Group(); g2.add(new THREE.Mesh(boneSpace(up, B, 'foot_' + sd), this.shoeMat)); g2.add(new THREE.Mesh(boneSpace(sole, B, 'foot_' + sd), propMat('#f2f0ea', 0.7))); g2.traverse((m) => { if (m.isMesh) { m.castShadow = castShadow; m.receiveShadow = true; } }); this.bones['foot_' + sd].add(g2); }
    // relaxed hands (idle/walk clips leave the fingers to this pose)
    for (const [bn, q] of Object.entries(B.relaxed || {})) if (this.bones[bn]) this.bones[bn].quaternion.fromArray(q);
    // everyday shoulders: the superhero rig's shoulder joints sit wide; pull them in a little (bone rest offsets)
    if (sex === 'm') for (const sd of ['l', 'r']) { this.bones['upperarm_' + sd].position.multiplyScalar(0.8); this.bones['clavicle_' + sd].position.multiplyScalar(0.92); }
    this.phone = new THREE.Group(); this.phone.add(new THREE.Mesh(P.phone, propMat('#141518', 0.35, 0.3))); const scr = new THREE.Mesh(P.screen, propMat('#9fc4ff', 0.3, 0, 0.9)); this.phone.add(scr); this.phoneScreen = scr;
    this.cup = new THREE.Group(); this.cup.add(new THREE.Mesh(P.cup[0], propMat('#e9e2d4', 0.7))); this.cup.add(new THREE.Mesh(P.cup[1], propMat('#2b2523', 0.6)));
    this.book = new THREE.Mesh(P.book, propMat('#7a1f2b', 0.8).clone());
    for (const o of [this.phone, this.cup, this.book]) { o.visible = false; this.root.add(o); }
    for (const o of [this.backpack, this.bag, this.cap, this.beanie]) o.traverse((m) => { if (m.isMesh) { m.castShadow = castShadow; m.receiveShadow = true; } });
    // animation
    this.mixer = new THREE.AnimationMixer(clone); this.actions = {}; this.w = {}; this.wt = {};
    for (const [n, c] of Object.entries(B.clips)) { const a = this.mixer.clipAction(c); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.actions[n] = a; this.w[n] = 0; this.wt[n] = 0; }
    this.agent = null; this.gazeYaw = 0; this.gazePitch = 0; this.phoneK = 0; this.react = 0; this.reactKind = ''; this.t = 0; this.nod = 0;
  }
  // ---------------------------------------------------------------- look
  setLook(look, extra, seed) {
    const L = look || {}; const f = L.flags | 0; const u = this.u; const S = this.assets.palette;
    u.uTop.value.setRGB(...(L.top || [0.1, 0.15, 0.3])); u.uBot.value.setRGB(...(L.bot || [0.1, 0.1, 0.12]));
    u.uShoe.value.setRGB(...(S.SHOE[L.shoe | 0] || S.SHOE[0])); this.shoeMat.color.setRGB(...(S.SHOE[L.shoe | 0] || S.SHOE[0])); u.uSkin.value.setRGB(...(S.SKIN[L.skin | 0] || S.SKIN[2]));
    const sleeve = f & FL.SLEEVE ? 0.97 : 0.42 + (seed % 0.1); const legs = f & FL.PANTS ? 1.02 : (f & FL.SKIRT ? 0.44 : 0.38 + (seed * 7 % 0.08));
    u.uCut.value.x = sleeve; u.uCut.value.y = legs;
    // hair style -> mesh (UBC has 6 styles; ponytail / cap / beanie reuse the closest)
    const st = L.hair | 0; const fem = this.sex === 'f';
    const pick = fem ? ['Hair_BuzzedFemale', 'Hair_BuzzedFemale', 'Hair_Long', 'Hair_Buns', 'Hair_Buns', 'Hair_Long', 'Hair_Long'][st] : ['Hair_Buzzed', 'Hair_SimpleParted', 'Hair_SimpleParted', 'Hair_SimpleParted', 'Hair_SimpleParted', 'Hair_Buzzed', 'Hair_Buzzed'][st];
    const hc = S.HAIR[L.hairC | 0] || S.HAIR[1];
    for (const [n, h] of Object.entries(this.hair)) {
      const on = n === pick || (n === 'Hair_Beard' && !fem && seed > 0.72 && st !== 6);
      h.mesh.visible = on; if (on) { const r = h.ref || { r: 0.3, g: 0.2, b: 0.12 }; h.mesh.material.color.setRGB(hc[0] / Math.max(0.03, r.r), hc[1] / Math.max(0.03, r.g), hc[2] / Math.max(0.03, r.b)); }
    }
    if (this.browMat) { const r = this.B.hairRef || { r: 0.3, g: 0.2, b: 0.12 }; this.browMat.color.setRGB(hc[0] / Math.max(0.03, r.r), hc[1] / Math.max(0.03, r.g), hc[2] / Math.max(0.03, r.b)); }
    this.cap.visible = st === 6; this.beanie.visible = st === 5;
    if (st === 5 || st === 6) { const c = [[0.0, 0.03, 0.12], [0.6, 0.42, 0.02], [0.05, 0.05, 0.06], [0.35, 0.05, 0.04], [0.55, 0.52, 0.48]][Math.floor(seed * 5) % 5]; this.capMat.color.setRGB(...c); }
    this.backpack.visible = !!(f & FL.BACKPACK); this.bag.visible = !!(f & FL.BAG) && !(f & FL.BACKPACK);
    const bc = [[0.03, 0.035, 0.045], [0.02, 0.06, 0.16], [0.25, 0.04, 0.03], [0.12, 0.13, 0.1], [0.4, 0.33, 0.22], [0.05, 0.16, 0.12]][Math.floor(seed * 13) % 6]; this.bpMat.color.setRGB(...bc);
    this.extra = (extra | 0) | (f & (FL.PHONE | FL.CUP | FL.BOOK));
    const s = (L.h || 1); this.inner.scale.set(L.w ? 0.94 + (L.w - 1) * 0.6 : 1, s, L.w ? 0.94 + (L.w - 1) * 0.6 : 1);
    this.walkClip = seed > 0.8 ? 'Walk_Formal_Loop' : 'Walk_Loop';
    this.idleOff = seed * 10;
  }
  // ---------------------------------------------------------------- per frame
  fade(name, k) { this.wt[name] = k; }
  update(dt, a, cam) {
    this.t += dt; const B = this.B; const A = this.actions;
    for (const n in this.wt) this.wt[n] = 0;
    const st = a.state; const moving = (a.kind === 'walker') && a.speed_ > 0.05;
    let yOff = 0, mode = 'stand';
    if (a.kind === 'spot' && (st === 'sit')) mode = 'sit';
    else if (st === 'lawn') mode = 'ground'; else if (st === 'lie') mode = 'lie';
    if (moving) { mode = a.aux > 0.5 || st === 'jog' ? 'jog' : 'walk'; }
    this.mode = mode;
    // base clip weights
    if (mode === 'walk') { this.fade(this.walkClip, 1); }
    else if (mode === 'jog') this.fade('Jog_Fwd_Loop', 1);
    else if (mode === 'sit' || mode === 'ground') this.fade(st === 'talk' || a.vari === 4 || a.vari === 5 ? 'Sitting_Talking_Loop' : 'Sitting_Idle_Loop', 1);
    else if (mode === 'lie') this.fade('Idle_Loop', 1);
    else this.fade(st === 'talk' || st === 'table' && a.vari >= 4 ? 'Idle_Talking_Loop' : 'Idle_Loop', 1);
    if (this.react > 0) { this.react -= dt; this.fade('Hit_Chest', Math.min(1, this.react * 3)); }
    // blend weights toward targets
    const k = 1 - Math.exp(-dt * 7);
    let tot = 0; for (const n in this.w) { this.w[n] += (this.wt[n] - this.w[n]) * k; if (this.w[n] < 0.002 && this.wt[n] === 0) this.w[n] = 0; tot += this.w[n]; }
    for (const n in this.w) { const act = A[n]; const w = tot > 0 ? this.w[n] / Math.max(1, tot) : 0; act.setEffectiveWeight(w); act.enabled = w > 0; }
    // walk / jog follow the crowd phase (left thigh forward at sin(phase) = 1)
    for (const n of ['Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop']) { const act = A[n]; if (!act.enabled) continue; act.timeScale = 0; const d = act.getClip().duration; const off = B.phaseOff[n] || 0; act.time = ((off + (a.phase - Math.PI / 2) / TAU) % 1 + 1) % 1 * d; }
    for (const n in A) { const act = A[n]; if (n.startsWith('Walk') || n.startsWith('Jog')) continue; act.timeScale = 1; }
    this.mixer.update(dt);
    // ---- root placement
    const r = this.root; r.position.set(a.x, a.y, a.z); r.rotation.set(0, a.heading, 0); this.inner.position.set(0, 0, 0); this.inner.rotation.set(0, Math.PI, 0);
    if (mode === 'sit') { const so = B.sitOffset; this.inner.position.set(0, (a.aux || 0.46) - so.seat, 0.05 - so.back); }
    else if (mode === 'ground') { const so = B.sitOffset; this.inner.position.set(0, -so.seat + 0.03, 0.05 - so.back); }
    else if (mode === 'lie') { this.inner.rotation.set(-Math.PI / 2, Math.PI, 0); this.inner.position.set(0, 0.12, -0.85); }
    this.model.updateMatrixWorld(true);
    // ---- procedural layers
    if (mode === 'stand') this._standFix();
    if (mode === 'ground') this._groundPose(a);
    if (mode === 'lie') this._liePose(a);
    const wantPhone = (st === 'phone' || a.vari === 2 && (mode === 'sit' || mode === 'ground')) && mode !== 'jog' && mode !== 'lie';
    this.phoneK += ((wantPhone ? 1 : 0) - this.phoneK) * Math.min(1, dt * 4);
    if (this.phoneK > 0.01) this._phonePose(this.phoneK, mode);
    this._gaze(dt, a, cam);
    this._props(a, mode);
  }
  // rotate `bone` so the direction to `child` points along world `dir` (blend k)
  aim(bone, child, dir, k) {
    bone.getWorldPosition(v1); child.getWorldPosition(v2); v2.sub(v1).normalize();
    q1.setFromUnitVectors(v2, dir); bone.getWorldQuaternion(q2); q1.multiply(q2); bone.parent.getWorldQuaternion(q3); q3.invert().multiply(q1);
    bone.quaternion.slerp(q3, k); bone.updateMatrixWorld(true);
  }
  // directions in character space (x right, y up, z back) -> world
  dirW(x, y, z, out) { return out.set(x, y, z).normalize().applyQuaternion(this.root.quaternion); }
  _phonePose(k, mode) {
    const b = this.bones; const d = new THREE.Vector3();
    this.aim(b.upperarm_r, b.lowerarm_r, this.dirW(0.2, -0.92, -0.18, d), k);
    this.aim(b.lowerarm_r, b.hand_r, this.dirW(-0.42, 0.42, -0.8, d), k);
    if (mode === 'walk' || mode === 'stand') { this.aim(b.upperarm_l, b.lowerarm_l, this.dirW(-0.16, -0.95, -0.12, d), k * 0.5); }
    // look down at the screen
    this.root.getWorldQuaternion(q2); v3.set(1, 0, 0).applyQuaternion(q2);
    q1.setFromAxisAngle(v3, -0.42 * k); b.neck_01.getWorldQuaternion(q2); q1.multiply(q2); b.neck_01.parent.getWorldQuaternion(q3); q3.invert().multiply(q1); b.neck_01.quaternion.copy(q3); b.neck_01.updateMatrixWorld(true);
  }
  _standFix() {
    const b = this.bones; const d = new THREE.Vector3(); const k = 0.6;
    for (const s of ['l', 'r']) { const sx = s === 'l' ? -1 : 1; this.aim(b['thigh_' + s], b['calf_' + s], this.dirW(sx * 0.06, -1, 0.03, d), k); this.aim(b['calf_' + s], b['foot_' + s], this.dirW(sx * 0.03, -1, 0.06, d), k); this.aim(b['foot_' + s], b['ball_' + s], this.dirW(sx * 0.12, -0.42, -1, d), k); }
    this.inner.position.y += 0.022; this.inner.updateMatrixWorld(true);
  }
  _groundPose(a) {
    const b = this.bones; const d = new THREE.Vector3(); const lean = a.vari === 3;
    for (const s of ['l', 'r']) { const sx = s === 'l' ? -1 : 1;
      if (lean) { this.aim(b['thigh_' + s], b['calf_' + s], this.dirW(sx * 0.12, 0.05, -1, d), 1); this.aim(b['calf_' + s], b['foot_' + s], this.dirW(sx * 0.05, -0.12, -1, d), 1); }
      else { this.aim(b['thigh_' + s], b['calf_' + s], this.dirW(sx * 0.2, 0.62, -0.75, d), 1); this.aim(b['calf_' + s], b['foot_' + s], this.dirW(sx * 0.05, -0.8, -0.55, d), 1); }
      if (lean) { this.aim(b['upperarm_' + s], b['lowerarm_' + s], this.dirW(sx * 0.35, -0.75, 0.55, d), 1); this.aim(b['lowerarm_' + s], b['hand_' + s], this.dirW(sx * 0.2, -0.8, 0.4, d), 1); }
      else if (a.vari !== 2) { this.aim(b['upperarm_' + s], b['lowerarm_' + s], this.dirW(sx * 0.15, -0.6, -0.75, d), 0.85); this.aim(b['lowerarm_' + s], b['hand_' + s], this.dirW(-sx * 0.25, 0.1, -1, d), 0.85); }
    }
    if (lean) { this.root.getWorldQuaternion(q2); v3.set(1, 0, 0).applyQuaternion(q2); q1.setFromAxisAngle(v3, 0.3); b.spine_01.getWorldQuaternion(q2); q1.multiply(q2); b.spine_01.parent.getWorldQuaternion(q3); q3.invert().multiply(q1); b.spine_01.quaternion.copy(q3); b.spine_01.updateMatrixWorld(true); }
  }
  _liePose(a) {
    const b = this.bones; const d = new THREE.Vector3(); const k = a.vari === 1;
    // arms: behind the head or relaxed at the sides; one knee up
    for (const s of ['l', 'r']) { const sx = s === 'l' ? -1 : 1;
      if (a.vari === 0) { this.aim(b['upperarm_' + s], b['lowerarm_' + s], this.dirW(sx * 0.7, 0.0, 0.7, d), 1); this.aim(b['lowerarm_' + s], b['hand_' + s], this.dirW(-sx * 0.9, 0.2, 0.3, d), 1); }
    }
    if (a.vari !== 1) { this.aim(b.thigh_r, b.calf_r, this.dirW(0.1, 0.75, -0.66, d), 1); this.aim(b.calf_r, b.foot_r, this.dirW(0.05, -0.7, -0.7, d), 1); }
  }
  _gaze(dt, a, cam) {
    // head turns toward agent.gaze (yaw offset from the body) or toward the camera when it's close and looking at us
    let want = a.gaze || 0; if (Math.abs(want) > 1.25) want = Math.sign(want) * 1.25;
    this.gazeYaw += (want - this.gazeYaw) * Math.min(1, dt * 3);
    if (Math.abs(this.gazeYaw) < 0.01 || this.mode === 'lie') return;
    const b = this.bones; this.root.getWorldQuaternion(q2); v3.set(0, 1, 0);
    for (const [bn, f] of [['neck_01', 0.45], ['Head', 0.55]]) { const bone = b[bn]; q1.setFromAxisAngle(v3, this.gazeYaw * f); bone.getWorldQuaternion(q2); q1.multiply(q2); bone.parent.getWorldQuaternion(q3); q3.invert().multiply(q1); bone.quaternion.copy(q3); bone.updateMatrixWorld(true); }
  }
  _props(a, mode) {
    const b = this.bones; const ex = this.extra; const toLocal = (wv) => this.root.worldToLocal(wv);
    // phone in the right hand while texting
    const ph = this.phoneK > 0.3 || (ex & FL.PHONE && mode !== 'jog' && mode !== 'lie' && this.phoneK > 0.3);
    this.phone.visible = ph;
    if (ph) { b.hand_r.getWorldPosition(v1); b.middle_01_r.getWorldPosition(v2); v2.sub(v1); const fd = v2.clone().normalize(); v1.addScaledVector(fd, 0.05);
      b.Head.getWorldPosition(v3); const head = v3.clone(); this.phone.position.copy(toLocal(v1.clone())); this.phone.lookAt(head); }
    // coffee cup in the left hand (upright)
    const cup = !!(ex & FL.CUP) && mode !== 'lie' && mode !== 'jog'; this.cup.visible = cup;
    if (cup) { b.hand_l.getWorldPosition(v1); b.middle_01_l.getWorldPosition(v2); v1.lerp(v2, 0.8); this.cup.position.copy(toLocal(v1)); this.cup.position.y -= 0.03; this.cup.rotation.set(0, 0, 0); }
    // book under the left arm when walking, open in the hands when sitting on the lawn
    const book = !!(ex & FL.BOOK) && !cup; this.book.visible = book;
    if (book) { if (mode === 'ground' || mode === 'lie') { this.book.position.set(0, mode === 'lie' ? 0.3 : 0.22, mode === 'lie' ? 0.7 : -0.32); this.book.rotation.set(mode === 'lie' ? -1.2 : -1.1, 0, 0); }
      else { b.hand_l.getWorldPosition(v1); b.lowerarm_l.getWorldPosition(v2); v1.lerp(v2, 0.35); this.book.position.copy(toLocal(v1)); this.book.position.x -= 0.03; this.book.rotation.set(0.05, 0, 0.12); } }
  }
}
