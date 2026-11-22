// One near-LOD person: a skinned Quaternius body (shared geometry, own skeleton), dressed by a clothing shader from the
// campus-life look (top/bottom colours, sleeves, trousers vs shorts, shoes, skin tone, hair style/colour), with
// backpack / bag / phone / cup / book props, UAL motion clips (walk synced to the crowd's phase so the hand-off from
// the instanced far LOD is seamless) and small procedural layers on top: head gaze, phone-in-hand arm, ground sitting,
// lying on the lawn, bump reactions.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { REG } from './assets.js';
import { garmentPart, bodyFor, outfitMaterial, TOP, BOT, SLEEVE, LEG } from './garments.js'; // r4-people2: modelled clothes
import { kitFor, kitMaterial, kitGeometry, headFrame, KP, KS } from './kit.js';
const STRAPS = typeof location !== 'undefined' && new URLSearchParams(location.search).get('straps') === '1';
const faceFrame = (B) => { const H = headFrame(B); return { eyeY: H.eyeY, front: H.front, eyeX: Math.abs(H.eyes.l.x - H.eyes.r.x) / 2 }; }; // r4-people2: shoes, bags, hats, glasses, hair in one skinned mesh

const TAU = Math.PI * 2;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion(), m1 = new THREE.Matrix4();
const lin = (a) => new THREE.Color(a[0], a[1], a[2]);
const FL = { SLEEVE: 1, PANTS: 2, BACKPACK: 4, SKIRT: 8, BAG: 16, PHONE: 32, BOOK: 64, CUP: 128 };

// ---------------------------------------------------------------- materials
function bodyMaterial(base, B) {
  const m = base.clone(); m.name = 'people:body'; m.roughness = 0.62; m.metalness = 0; m.normalMap = null; // the superhero muscle-striation normal map reads as scaly skin at game scale
  const u = { uTop: { value: new THREE.Color(0.1, 0.15, 0.3) }, uBot: { value: new THREE.Color(0.1, 0.1, 0.12) }, uShoe: { value: new THREE.Color(0.8, 0.8, 0.8) }, uSkin: { value: new THREE.Color(0.7, 0.5, 0.4) },
    uSkinRef: { value: new THREE.Vector3(B.skinRef.r, B.skinRef.g, B.skinRef.b) }, uCut: { value: new THREE.Vector4(0.45, 1, B.shoeY, B.waistY) }, uCollar: { value: B.collarY }, uNeck: { value: new THREE.Vector3(B.J.neck_01.x, B.J.neck_01.z, B.neckR) }, uAnkL: { value: B.J.foot_l.clone() }, uAnkR: { value: B.J.foot_r.clone() }, uSock: { value: new THREE.Vector4(1, 1, 1, 0) }, uTights: { value: 0 }, uFace: { value: new THREE.Vector4(1.65, 0.07, 0, 0) }, uFaceCol: { value: new THREE.Color(0.05, 0.04, 0.03) }, uEyeX: { value: 0.034 } }; // r4-people2: socks / tights, face detail
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec2 aCloth; flat varying float vReg; varying float vLimbT; varying vec3 vBind; uniform vec4 uCut; uniform float uCollar; uniform vec3 uNeck, uAnkL, uAnkR;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
 vReg = aCloth.x; vLimbT = aCloth.y; vBind = position;
 { float inf = 0.0; // clothes stand a little off the skin
   if (aCloth.x > 0.5 && aCloth.x < 1.5) inf = position.y < uCut.w ? 0.011 : ((position.y < uCollar || length(position.xz - uNeck.xy) > uNeck.z) ? 0.013 + 0.014 * smoothstep(0.07, 0.0, position.y - uCut.w) : 0.0);
   else if (aCloth.x > 1.5 && aCloth.x < 2.5) inf = aCloth.y < uCut.x ? 0.009 : 0.0;
   else if (aCloth.x > 3.5) inf = position.y < uCut.z ? 0.017 : (aCloth.y < uCut.y ? 0.009 + (uCut.y > 1.0 ? 0.012 * smoothstep(0.75, 1.0, aCloth.y) : 0.006 * smoothstep(uCut.y - 0.1, uCut.y, aCloth.y)) : 0.0);
   transformed += normal * inf * 0.3; // r4-people2: real garment shells carry the cloth volume now
   if (aCloth.x > 3.5 && position.y < uCut.z + 0.01) { vec3 an = position.x > 0.0 ? uAnkL : uAnkR; transformed = an + (position - an) * vec3(0.72, 0.8, 0.82); } } // bare foot tucked inside the sneaker`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uTop, uBot, uShoe, uSkin, uSkinRef, uNeck, uFaceCol; uniform vec4 uCut, uSock, uFace; uniform float uCollar, uTights, uEyeX;
flat varying float vReg; varying float vLimbT; varying vec3 vBind;
float pHash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
 float clothK = 0.0; vec3 cc = vec3(0.0); float shoeK = 0.0;
 if (vReg > 0.5 && vReg < 1.5) { if (vBind.y < uCut.w) { cc = uBot; clothK = 1.0; } else if (vBind.y < uCollar - max(0.0, vBind.z - uNeck.y) * 0.5 || length(vBind.xz - uNeck.xy) > uNeck.z) { cc = uTop; clothK = 1.0; } }
 else if (vReg > 1.5 && vReg < 2.5) { if (vLimbT < uCut.x) { cc = uTop; clothK = 1.0; } }
 else if (vReg > 3.5) { if (vBind.y < uCut.z) { cc = uShoe * 0.5; clothK = 1.0; shoeK = 1.0; } else if (vLimbT < uCut.y) { cc = uBot; clothK = 1.0; } else if (vBind.y < uCut.z + uSock.w) { cc = uSock.rgb * (0.9 + 0.1 * sin(vBind.y * 900.0)); clothK = 1.0; } else if (uTights > 0.0) { cc = mix(uSkin * 0.8, vec3(0.012), uTights); clothK = 1.0; shoeK = 0.4; } }
 // fabric: faint weave noise + darker seams at hems so the clothes don't read as paint
 float hem = (vReg > 1.5 && vReg < 2.5) ? smoothstep(0.03, 0.0, uCut.x - vLimbT) : (vReg > 3.5 ? smoothstep(0.03, 0.0, uCut.y - vLimbT) : 0.0);
 cc *= 1.0 - 0.25 * hem * (1.0 - shoeK);
 float sl = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)) / max(dot(uSkinRef, vec3(0.299, 0.587, 0.114)), 0.04);
 vec3 skinC = uSkin * 0.9 * mix(1.0, clamp(sl, 0.6, 1.2), 0.45); // the face keeps its painted lips/brows/eye shading
 if (vReg > 2.5 && vReg < 3.5) skinC *= 0.86; // r4-people2: hands read chalky next to the face
 // r4-people2 face detail (bind space; uFace = eye height, face front z, stubble, makeup): lash line, lip tint, cheek warmth, stubble shadow
 if (vReg < 0.5 && vBind.z > uFace.y - 0.07) {
   float fy = vBind.y - uFace.x; float ax = abs(vBind.x);
   float lash = smoothstep(0.016, 0.0, length(vec2((ax - uEyeX) * 0.75, (fy - 0.008) * 2.2))) * step(0.0, vBind.z - uFace.y + 0.02);
   skinC *= 1.0 - (0.35 + 0.35 * uFace.w) * lash;
   float lip = smoothstep(0.011, 0.0, length(vec2(vBind.x * 0.42, (fy + 0.066) * 1.3))) * step(uFace.y - 0.005, vBind.z);
   skinC = mix(skinC, skinC * vec3(1.05, 0.62, 0.62), lip * (0.45 + 0.35 * uFace.w));
   float sock = smoothstep(0.026, 0.006, length(vec2((ax - uEyeX) * 0.8, (fy + 0.002) * 1.4))) * (1.0 - lash);
   float nose = smoothstep(0.012, 0.0, length(vec2(vBind.x * 0.8, fy + 0.047))) * 0.6;
   float chin = smoothstep(-0.105, -0.13, fy);
   skinC *= 1.0 - 0.22 * sock - 0.18 * nose - 0.25 * chin;
   float cheek = smoothstep(0.024, 0.0, length(vec2(ax - 0.042, fy + 0.03)));
   skinC = mix(skinC, skinC * vec3(1.08, 0.86, 0.84), cheek * (0.25 + 0.3 * uFace.w));
   float jaw = smoothstep(-0.045, -0.06, fy) * smoothstep(-0.13, -0.095, fy) * smoothstep(0.065, 0.03, ax) * (1.0 - lip) + smoothstep(0.006, 0.0, abs(fy + 0.052)) * smoothstep(0.022, 0.008, ax);
   skinC = mix(skinC, uFaceCol, clamp(jaw, 0.0, 1.0) * uFace.z * (0.75 + 0.25 * sin(vBind.x * 900.0) * sin(vBind.y * 800.0)));
 }
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
    for (const [a, b] of [[[x, shY - 0.06, back - 0.045], [x, shY + 0.05, (back + front) * 0.5 - 0.02]], [[x, shY + 0.05, (back + front) * 0.5 - 0.02], [x * 1.04, shY - 0.09, front + 0.03]]]) {
      const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b); const L = A.distanceTo(Bv); const st = new THREE.BoxGeometry(0.05, L, 0.022);
      st.applyQuaternion(q1.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v1.subVectors(Bv, A).normalize())); st.translate((A.x + Bv.x) / 2, (A.y + Bv.y) / 2, (A.z + Bv.z) / 2); straps.push(st);
    }
  }
  P.backpack = { body: [bp, pocket], straps };
  // shoulder bag hanging at the left hip (pelvis space) with a strap across the chest
  const bag = new RoundedBoxGeometry(0.3, 0.24, 0.09, 2, 0.03); bag.translate(0.2, J.pelvis.y - 0.02, -0.01);
  P.bag = bag;
  // cap and beanie (Head space)
  const hc = hb.getCenter(new THREE.Vector3()), hs = hb.getSize(new THREE.Vector3());
  const R0 = hs.z * 0.5; const crown = new THREE.SphereGeometry(R0 * 1.04, 16, 8, 0, TAU, 0, Math.PI * 0.5); crown.scale(0.92, 0.72, 1.02); crown.translate(hc.x, hb.max.y - hs.y * 0.3, hc.z - hs.z * 0.02);
  const brim = new THREE.CylinderGeometry(R0 * 0.8, R0 * 0.8, 0.012, 16, 1, false, -Math.PI / 2, Math.PI); brim.scale(1, 1, 1.55); brim.translate(hc.x, hb.max.y - hs.y * 0.29, hc.z + hs.z * 0.36);
  P.cap = [crown, brim];
  const beanie = new THREE.SphereGeometry(R0 * 1.08, 16, 10, 0, TAU, 0, Math.PI * 0.56); beanie.scale(0.94, 1.0, 1.02); beanie.translate(hc.x, hb.max.y - hs.y * 0.38, hc.z - hs.z * 0.04);
  const cuff = new THREE.TorusGeometry(R0 * 1.06, 0.018, 6, 20); cuff.rotateX(Math.PI / 2); cuff.scale(0.94, 1, 1.02); cuff.translate(hc.x, hb.max.y - hs.y * 0.38, hc.z - hs.z * 0.04);
  P.beanie = [beanie, cuff];
  // sneakers (foot space): upper + white midsole, toe box tapered; the body foot shrinks inside (shader)
  P.shoe = {};
  for (const sd of ['l', 'r']) {
    const A = J['foot_' + sd]; const len = 0.275, back = 0.07, xo = A.x + (sd === 'l' ? 0.006 : -0.006);
    const up = new THREE.SphereGeometry(0.5, 20, 12); const pa = up.attributes.position;
    for (let i = 0; i < pa.count; i++) { let x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); const fz = z + 0.5; // 0 heel .. 1 toe
      x *= 0.104 * (1 - Math.max(0, fz - 0.7) * 0.5); y = y < 0 ? y * 0.03 : y * 0.13 * (1 - Math.max(0, fz - 0.45) * 0.75); z *= len; pa.setXYZ(i, x, y, z); }
    up.computeVertexNormals(); up.translate(xo, 0.026, A.z - back + len / 2);
    const sole = new RoundedBoxGeometry(0.108, 0.026, len + 0.01, 2, 0.011); const ps = sole.attributes.position; for (let i = 0; i < ps.count; i++) { const fz = ps.getZ(i) / (len + 0.01) + 0.5; ps.setX(i, ps.getX(i) * (1 - Math.max(0, fz - 0.72) * 0.6)); }
    sole.computeVertexNormals(); sole.translate(xo, 0.013, A.z - back + len / 2);
    // midsole: a thin oval just proud of the upper's footprint
    const mid = new THREE.SphereGeometry(0.5, 20, 6); const pm = mid.attributes.position;
    for (let i = 0; i < pm.count; i++) { const fz = pm.getZ(i) + 0.5; pm.setXYZ(i, pm.getX(i) * 0.108 * (1 - Math.max(0, fz - 0.7) * 0.5), pm.getY(i) * 0.03, pm.getZ(i) * len * 1.015); }
    mid.computeVertexNormals(); mid.translate(xo, 0.012, A.z - back + len / 2); P.shoeMid = P.shoeMid || {}; P.shoeMid[sd] = mid;
    P.shoe[sd] = [up, sole];
  }
  // hand props (character-root space, placed per frame)
  const phone = new RoundedBoxGeometry(0.078, 0.16, 0.01, 2, 0.0045); P.phone = phone; const screen = new THREE.PlaneGeometry(0.07, 0.148); screen.translate(0, 0, 0.0056); P.screen = screen;
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
    if (this.eyes) { this.eyes.castShadow = false; this.eyes.material = this.eyes.material.clone(); this.eyes.material.roughness = 0.12; this.eyes.material.metalness = 0; } // r4-people2: catchlights
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
    // r4-people2: clothes are a real skinned shell (garments.js) and every accessory is one skinned kit mesh (kit.js),
    // both bound to this character's skeleton: 2 draw calls instead of ~14 prop meshes
    const bindTo = (m) => { m.frustumCulled = false; m.castShadow = castShadow; m.receiveShadow = true; this.body.parent.add(m); m.position.copy(this.body.position); m.quaternion.copy(this.body.quaternion); m.scale.copy(this.body.scale); m.bind(this.body.skeleton, this.body.bindMatrix); return m; };
    this.outMat = outfitMaterial(B); this.ou = this.outMat.userData.u;
    this.top = bindTo(new THREE.SkinnedMesh(garmentPart(B, 'top', TOP.tee, SLEEVE.tee[0]), this.outMat)); this.top.name = 'people:top';
    this.bot = bindTo(new THREE.SkinnedMesh(garmentPart(B, 'bot', BOT.jeans, LEG.jeans), this.outMat)); this.bot.name = 'people:bottom';
    this.strap = bindTo(new THREE.SkinnedMesh(garmentPart(B, 'strap', TOP.tee, SLEEVE.tee[0]), this.outMat)); this.strap.name = 'people:straps';
    this.kitMat = kitMaterial(); this.ku = this.kitMat.userData.u;
    this.kitBase = kitFor(B); this.kit = bindTo(new THREE.SkinnedMesh(this.kitBase, this.kitMat)); this.kit.name = 'people:kit';
    this.baseBodyGeo = this.body.geometry;
    // relaxed hands (idle/walk clips leave the fingers to this pose)
    for (const [bn, q] of Object.entries(B.relaxed || {})) if (this.bones[bn]) this.bones[bn].quaternion.fromArray(q);
    // everyday shoulders: the superhero rig's shoulder joints sit wide; pull them in a little (bone rest offsets)
    this.headS = sex === 'm' ? 1.045 : 1.03; this.bones.Head.scale.setScalar(this.headS); // r4-people2: heads read small next to real (bulkier) clothes
    for (const sd of ['l', 'r']) this.bones['hand_' + sd].scale.setScalar(0.9); // the superhero rig's hands are oversized
    if (sex === 'm') for (const sd of ['l', 'r']) { this.bones['upperarm_' + sd].position.multiplyScalar(0.8); this.bones['clavicle_' + sd].position.multiplyScalar(0.92); }
    this.phone = new THREE.Group(); this.phone.add(new THREE.Mesh(P.phone, propMat('#141518', 0.35, 0.3))); const scr = new THREE.Mesh(P.screen, propMat('#9fc4ff', 0.3, 0, 0.9)); this.phone.add(scr); this.phoneScreen = scr;
    this.cup = new THREE.Group(); this.cup.add(new THREE.Mesh(P.cup[0], propMat('#e9e2d4', 0.7))); this.cup.add(new THREE.Mesh(P.cup[1], propMat('#2b2523', 0.6)));
    this.book = new THREE.Mesh(P.book, propMat('#7a1f2b', 0.8).clone());
    for (const o of [this.phone, this.cup, this.book]) { o.visible = false; this.root.add(o); }
    // animation
    this.mixer = new THREE.AnimationMixer(clone); this.actions = {}; this.w = {}; this.wt = {};
    for (const [n, c] of Object.entries(B.clips)) { const a = this.mixer.clipAction(c); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.actions[n] = a; this.w[n] = 0; this.wt[n] = 0; }
    this.agent = null; this.gazeYaw = 0; this.gazePitch = 0; this.phoneK = 0; this.react = 0; this.reactKind = ''; this.t = 0; this.nod = 0;
  }
  // ---------------------------------------------------------------- look
  setLook(look, extra, seed) {
    // r4-people2: the crowd look (colours + flags, shared with the far LOD so the hand-off is seamless) is expanded into
    // a full outfit: garment types picked from the colours (blue bottoms -> jeans, khaki -> chinos, ...), shoes, socks,
    // bags, headwear, glasses, headphones and a hairstyle, all deterministic per person (seed)
    const L = look || {}; const f = L.flags | 0; const u = this.u; const S = this.assets.palette; const fem = this.sex === 'f';
    const fr = (k) => { const x = Math.sin((seed + 0.123) * 9301 * k) * 43758.5453; return x - Math.floor(x); };
    const top = L.top || [0.1, 0.15, 0.3], bot = L.bot || [0.1, 0.1, 0.12];
    // ---- garments
    let tk, sleeve; const r1 = fr(1.7);
    if (f & FL.SLEEVE) { tk = r1 < 0.29 ? TOP.hoodie : r1 < 0.45 ? TOP.crew : r1 < 0.6 ? TOP.jacket : r1 < 0.72 ? TOP.puffer : r1 < 0.81 ? TOP.flannel : TOP.long; sleeve = tk === TOP.jacket || tk === TOP.puffer ? SLEEVE.outer : SLEEVE.long; }
    else { tk = TOP.tee; sleeve = SLEEVE.tee[fr(2.3) < 0.5 ? 0 : 1]; }
    const blue = bot[2] > bot[0] * 1.35 && bot[2] > bot[1] * 1.1, warm = bot[0] > bot[2] * 1.15; const r2 = fr(3.1);
    let bk, leg;
    if (f & FL.PANTS) { bk = blue ? (r2 < 0.88 ? BOT.jeans : BOT.chinos) : warm ? BOT.chinos : (r2 < 0.36 ? BOT.jeans : r2 < 0.68 ? BOT.joggers : fem ? BOT.leggings : BOT.chinos); leg = bk === BOT.jeans ? LEG.jeans : bk === BOT.joggers ? LEG.joggers : LEG.chinos; }
    else if (f & FL.SKIRT) { bk = BOT.skirt; leg = LEG.skirt[Math.floor(fr(4.3) * 3)]; }
    else { bk = BOT.shorts; leg = LEG.shorts[fr(5.1) < 0.5 ? 0 : 1]; }
    const gT = garmentPart(this.B, 'top', tk, sleeve), gB = bk === BOT.leggings ? null : garmentPart(this.B, 'bot', bk, leg);
    const st0 = !STRAPS ? null : f & FL.BACKPACK ? 'strap' : f & FL.BAG ? 'sash' : null; const gS = st0 ? garmentPart(this.B, st0, tk, sleeve) : null; // cloth straps still break up on the chest: off unless ?straps=1
    this.top.geometry = gT; this.bot.visible = !!gB; if (gB) this.bot.geometry = gB; this.strap.visible = !!gS; if (gS) this.strap.geometry = gS;
    this.body.geometry = bodyFor(this.B, gT, gB); this.outfitInfo = { tk, bk };
    const ou = this.ou; ou.uTopA.value.setRGB(...top); ou.uBotA.value.setRGB(...bot);
    const inner = [[0.85, 0.85, 0.82], [0.03, 0.03, 0.035], [0.35, 0.36, 0.38], [0.6, 0.52, 0.4]][Math.floor(fr(6.7) * 4)];
    if (tk === TOP.flannel) { const k = fr(7.9); ou.uTopB.value.setRGB(...(k < 0.5 ? [0.02, 0.02, 0.025] : k < 0.75 ? [top[0] * 0.35, top[1] * 0.35, top[2] * 0.35] : [0.5, 0.48, 0.42])); }
    const print = (tk === TOP.hoodie || tk === TOP.crew || tk === TOP.tee) && fr(8.3) < 0.36 ? Math.floor(fr(9.1) * 4) : -1;
    const lum = top[0] * 0.3 + top[1] * 0.59 + top[2] * 0.11; ou.uPrintCol.value.setRGB(...(top[2] > top[0] * 1.4 && fr(9.7) < 0.7 ? [0.98, 0.46, 0.008] : lum > 0.45 ? [0.0, 0.03, 0.14] : [0.92, 0.92, 0.9]));
    ou.uKind.value.set(tk, bk, print, seed);
    // ---- body paint under / between the clothes (inner shirt of open jackets, leggings, socks or tights)
    u.uTop.value.setRGB(...top); u.uBot.value.setRGB(...(bk === BOT.leggings ? [bot[0] * 0.5, bot[1] * 0.5, bot[2] * 0.5] : bot));
    u.uSkin.value.setRGB(...(S.SKIN[L.skin | 0] || S.SKIN[2]));
    { const H = this.faceRef || (this.faceRef = faceFrame(this.B)); const hcF = S.HAIR[L.hairC | 0] || S.HAIR[1]; const beardUBC = !fem && seed > 0.72 && (L.hair | 0) !== 6;
      u.uFace.value.set(H.eyeY, H.front, !fem && !beardUBC && fr(25.3) < 0.45 ? 0.35 + fr(25.9) * 0.4 : 0, fem ? fr(26.3) * 0.9 : 0); u.uFaceCol.value.setRGB(hcF[0] * 0.8, hcF[1] * 0.8, hcF[2] * 0.8); u.uEyeX.value = H.eyeX; }
    u.uCut.value.x = tk === TOP.tee ? sleeve - 0.03 : 0.95; u.uCut.value.y = bk === BOT.leggings ? 1.02 : (bk === BOT.skirt ? 0 : bk === BOT.shorts ? leg - 0.03 : 0.95);
    const bare = bk === BOT.shorts || bk === BOT.skirt; const tights = bk === BOT.skirt && fr(10.3) < 0.55;
    if (u.uSock) { const sc = fr(11.1) < 0.7 ? [0.86, 0.86, 0.84] : [0.03, 0.03, 0.035]; u.uSock.value.set(sc[0], sc[1], sc[2], bare ? 0.07 + fr(11.9) * 0.05 : 0.0); u.uTights.value = tights ? 0.82 : 0; }
    // ---- kit: shoes, bag, headwear, glasses, headphones, hood, hair
    let mask = 0; const on = (p) => { mask |= 1 << p; };
    const cols = this.ku.uCols.value; const set = (slot, c) => cols[slot].setRGB(c[0], c[1], c[2]);
    const r3 = fr(12.7); let shoe = r3 < 0.42 ? KP.sneaker : r3 < 0.64 ? KP.runner : r3 < 0.8 ? KP.skate : KP.boot; if (shoe === KP.boot && (bk === BOT.shorts)) shoe = KP.sneaker; on(shoe);
    const sh = S.SHOE[L.shoe | 0] || S.SHOE[0];
    if (shoe === KP.boot) { const bc = fr(13.3) < 0.55 ? [0.03, 0.025, 0.022] : [0.22, 0.12, 0.06]; set(KS.upper, bc); set(KS.dark, [0.02, 0.02, 0.02]); }
    else { set(KS.upper, shoe === KP.skate && fr(13.9) < 0.6 ? [0.02, 0.02, 0.025] : sh); set(KS.sole, shoe === KP.runner && fr(14.3) < 0.3 ? [0.04, 0.04, 0.04] : [0.88, 0.87, 0.84]);
      set(KS.accent, shoe === KP.skate ? [0.9, 0.9, 0.88] : [[0.9, 0.9, 0.9], [0.04, 0.04, 0.05], [0.55, 0.06, 0.05], [0.05, 0.12, 0.35], [0.85, 0.45, 0.05]][Math.floor(fr(15.1) * 5)]); set(KS.dark, [0.02, 0.02, 0.02]); }
    const bagC = [[0.03, 0.035, 0.045], [0.02, 0.06, 0.16], [0.25, 0.04, 0.03], [0.12, 0.13, 0.1], [0.4, 0.33, 0.22], [0.05, 0.16, 0.12], [0.5, 0.5, 0.52]][Math.floor(fr(16.3) * 7)];
    set(KS.bag, bagC); set(KS.strap, [bagC[0] * 0.6, bagC[1] * 0.6, bagC[2] * 0.6]); ou.uStrap.value.setRGB(bagC[0] * 0.6 + 0.07, bagC[1] * 0.6 + 0.07, bagC[2] * 0.6 + 0.075); // webbing: mid-tone so it never reads as a hole
    if (f & FL.BACKPACK) on(KP.backpack); else if (f & FL.BAG) on(KP.bag);
    this.ku.uPackOff.value = { [TOP.tee]: 0.004, [TOP.long]: 0.004, [TOP.crew]: 0.012, [TOP.flannel]: 0.012, [TOP.hoodie]: 0.02, [TOP.jacket]: 0.024, [TOP.puffer]: 0.045 }[tk] || 0.01; // pack rests on the top
    if (tk === TOP.hoodie) { on(KP.hood); on(KP.strings); set(KS.hood, top); set(KS.string, fr(17.1) < 0.6 ? [0.85, 0.85, 0.82] : top); }
    const hc = S.HAIR[L.hairC | 0] || S.HAIR[1]; set(KS.hair, hc);
    const st = L.hair | 0; let ubc = null; const r4 = fr(18.7), dark = (L.skin | 0) >= 3;
    const hijab = fem && fr(19.3) < 0.06;
    if (hijab) { on(KP.hijab); set(KS.scarf, [[0.02, 0.02, 0.03], [0.35, 0.3, 0.26], [0.05, 0.1, 0.25], [0.45, 0.12, 0.15], [0.6, 0.58, 0.55], [0.12, 0.25, 0.2]][Math.floor(fr(19.9) * 6)]); }
    else if (fem) {
      if (st === 0) ubc = r4 < 0.6 ? 'Hair_BuzzedFemale' : (on(KP.curls), null);
      else if (st === 1) { if (dark && r4 < 0.35) on(KP.afro); else if (r4 < 0.65) on(KP.bob); else on(KP.curls); }
      else if (st === 2) { if (dark && r4 < 0.2) on(KP.afro); else ubc = 'Hair_Long'; }
      else if (st === 3) { on(KP.slick); on(KP.pony); }
      else if (st === 4) { if (r4 < 0.5) ubc = 'Hair_Buns'; else { on(KP.slick); on(KP.bun); } }
      else if (st === 5) { on(KP.beanie); ubc = r4 < 0.6 ? 'Hair_Long' : null; if (!ubc) on(KP.bob); }
      else { on(KP.cap); on(KP.slick); on(KP.pony); }
    } else {
      if (st === 0) ubc = 'Hair_Buzzed';
      else if (st === 1) { if (dark && r4 < 0.3) on(KP.afro); else if (r4 < 0.55) ubc = 'Hair_SimpleParted'; else if (r4 < 0.85) on(KP.curls); else on(KP.slick); }
      else if (st === 2) { if (r4 < 0.5) { on(KP.slick); on(KP.manbun); } else ubc = 'Hair_SimpleParted'; }
      else if (st === 3 || st === 4) ubc = 'Hair_SimpleParted';
      else if (st === 5) { on(KP.beanie); ubc = 'Hair_Buzzed'; }
      else { on(KP.cap); ubc = 'Hair_Buzzed'; }
    }
    if (st === 5 || st === 6) set(KS.hat, [[0.0, 0.03, 0.12], [0.6, 0.42, 0.02], [0.05, 0.05, 0.06], [0.35, 0.05, 0.04], [0.55, 0.52, 0.48], [0.2, 0.24, 0.16]][Math.floor(fr(20.3) * 6)]);
    if (!hijab && st !== 6 && fr(21.1) < 0.3) { on(KP.glasses); on(KP.lens); set(KS.frame, [[0.02, 0.02, 0.02], [0.16, 0.08, 0.04], [0.55, 0.45, 0.25], [0.3, 0.3, 0.32]][Math.floor(fr(21.7) * 4)]); set(KS.lens, [0.6, 0.7, 0.75]); }
    if (!hijab && st !== 5 && st !== 6 && fr(22.3) < 0.08) { on(KP.phones); set(KS.phones, fr(22.9) < 0.6 ? [0.02, 0.02, 0.025] : [0.8, 0.78, 0.74]); }
    this.ku.uMask.value = mask; this.kitMask = mask; this.kit.geometry = kitGeometry(this.kitBase, mask);
    for (const [n, h] of Object.entries(this.hair)) {
      const vis = n === ubc || (n === 'Hair_Beard' && !fem && seed > 0.72 && st !== 6);
      h.mesh.visible = vis; if (vis) { const r = h.ref || { r: 0.3, g: 0.2, b: 0.12 }; h.mesh.material.color.setRGB(hc[0] / Math.max(0.03, r.r), hc[1] / Math.max(0.03, r.g), hc[2] / Math.max(0.03, r.b)); }
    }
    if (this.browMat) { const r = this.B.hairRef || { r: 0.3, g: 0.2, b: 0.12 }; const sk = S.SKIN[L.skin | 0] || S.SKIN[2]; const bc = [0, 1, 2].map((i) => hc[i] * 0.72 + sk[i] * 0.28 + 0.01); // r4-people2: softer brows
      this.browMat.color.setRGB(bc[0] / Math.max(0.03, r.r), bc[1] / Math.max(0.03, r.g), bc[2] / Math.max(0.03, r.b)); }
    this.bones.Head.scale.set(this.headS * (0.96 + fr(23.3) * 0.08), this.headS * (0.97 + fr(23.9) * 0.06), this.headS * (0.97 + fr(24.7) * 0.06)); // face shape variety
    this.extra = (extra | 0) | (f & (FL.PHONE | FL.CUP | FL.BOOK));
    const s = (L.h || 1); this.inner.scale.set(L.w ? 0.94 + (L.w - 1) * 0.6 : 1, s, L.w ? 0.94 + (L.w - 1) * 0.6 : 1);
    this.walkClip = seed > 0.8 ? 'Walk_Formal_Loop' : 'Walk_Loop';
    this.idleOff = seed * 10;
    // r4-people2: desync the looping idles (the pool was created at once, so everyone breathed and swayed in unison)
    for (const [n, act] of Object.entries(this.actions)) { if (n.startsWith('Walk') || n.startsWith('Jog')) continue; act.time = fr(30 + n.length) * act.getClip().duration; }
    this.lookT = fr(31.7) * 3; this.lookYaw = 0; this.lookPitch = 0;
    this.curl = 0.28 + fr(33.1) * 0.3; this.setHands(this.curl);
  }
  setHands(k) { // finger curl: 0 flat .. 1 fist (thumb curls less so it never closes into an OK sign)
    const R = this.B.restQ, F = this.B.fistQ; if (!R) return; for (const n in R) { const b = this.bones[n]; if (b) b.quaternion.copy(R[n]).slerp(F[n], /^thumb/.test(n) ? k * 0.45 : k); } this.handK = k; }
  setShadow(on) { if (this._sh === on) return; this._sh = on; this.root.traverse((o) => { if (o.isMesh && o !== this.eyes && o !== this.brows) o.castShadow = on; }); }
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
    if (a.kind === 'rider') mode = a.scooter ? 'scoot' : 'cycle'; // r4-people2: skinned riders on campus-life's bikes/scooters
    this.mode = mode;
    // r4-people2: people in a conversation take turns (talk / listen + nod) instead of all gesturing at once
    const talkK = Math.sin(this.t * 0.7 + this.idleOff * 4) + Math.sin(this.t * 0.31 + this.idleOff * 1.7);
    this.speaking = (st === 'talk' || (st === 'table' && a.vari >= 4) || a.vari === 4 || a.vari === 5) && talkK > 0.45;
    // base clip weights
    if (mode === 'walk') { this.fade(this.walkClip, 1); }
    else if (mode === 'jog') this.fade('Jog_Fwd_Loop', 1);
    else if (mode === 'sit' || mode === 'ground' || mode === 'cycle') this.fade(this.speaking ? 'Sitting_Talking_Loop' : 'Sitting_Idle_Loop', 1);
    else if (mode === 'lie' || mode === 'scoot') this.fade('Idle_Loop', 1);
    else this.fade(this.speaking ? 'Idle_Talking_Loop' : 'Idle_Loop', 1);
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
    else if (mode === 'cycle') { const so = B.sitOffset; this.inner.position.set(0, 0.93 - so.seat, 0.24 - so.back); }
    else if (mode === 'scoot') this.inner.position.set(0, 0.07, 0.03);
    if (mode === 'cycle' || mode === 'scoot') this.setHands(0.85); else if (mode !== 'sit' && mode !== 'ground' && Math.abs((this.handK ?? 0) - this.curl) > 0.01) this.setHands(this.curl); // riders grip the bars (every frame: the sitting clip keys the fingers)
    if (mode === 'stand' && !this.speaking) { // weight shift: slow hip sway (each person on their own rhythm)
      const ws = Math.sin(this.t * 0.45 + this.idleOff * 3.1); this.inner.position.x += ws * 0.018; this.inner.rotation.z = -ws * 0.012; }
    this.model.updateMatrixWorld(true);
    // ---- procedural layers
    if (mode === 'stand' || mode === 'walk' || mode === 'jog') this._armsIn(mode);
    if (mode === 'walk') this._widen();
    if (mode === 'stand') this._standFix();
    if (mode === 'ground') this._groundPose(a);
    if (mode === 'lie') this._liePose(a);
    if (mode === 'cycle') this._cyclePose(a);
    if (mode === 'scoot') this._scootPose(a);
    const wantPhone = (st === 'phone' || a.vari === 2 && (mode === 'sit' || mode === 'ground')) && mode !== 'jog' && mode !== 'lie' && mode !== 'cycle' && mode !== 'scoot';
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
  // r4-people2: two-bone IK. Puts `end` (child of `mid`, child of `top`) at world point T, bending toward world `pole`
  ik2(top, mid, end, T, pole, k = 1) {
    const A = top.getWorldPosition(new THREE.Vector3()), M = mid.getWorldPosition(new THREE.Vector3()), E = end.getWorldPosition(new THREE.Vector3());
    const l1 = A.distanceTo(M), l2 = M.distanceTo(E); const D = T.clone().sub(A); let d = D.length(); d = Math.min(Math.max(d, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3); const dir = D.normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const pp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize(); const knee = A.clone().addScaledVector(dir, a).addScaledVector(pp, h);
    this.aim(top, mid, knee.clone().sub(A).normalize(), k); this.aim(mid, end, A.clone().addScaledVector(dir, d).sub(mid.getWorldPosition(new THREE.Vector3())).normalize(), k);
  }
  // character space (x right, y up, z back; feet at 0) -> world
  cw(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(this.root.matrixWorld); }
  _lean(rad) { const b = this.bones; this.root.getWorldQuaternion(q2); v3.set(1, 0, 0).applyQuaternion(q2); q1.setFromAxisAngle(v3, -rad); b.spine_01.getWorldQuaternion(q2); q1.multiply(q2); b.spine_01.parent.getWorldQuaternion(q3); q3.invert().multiply(q1); b.spine_01.quaternion.copy(q3); b.spine_01.updateMatrixWorld(true); }
  _cyclePose(a) { // bike (src/life/vehicles.js): saddle top y 0.97 z +0.25, grips (+-0.26, 1.03, -0.4), cranks r 0.17 round (0, 0.3, 0)
    const b = this.bones; this.root.updateMatrixWorld(true); this._lean(0.42);
    const fwd = this.dirW(0, 0, -1, new THREE.Vector3()), up = this.dirW(0, 1, 0, new THREE.Vector3()), down = up.clone().negate();
    const cr = a.aux || 0;
    for (const [s, sx, ph] of [['l', -1, 0], ['r', 1, Math.PI]]) {
      const c = cr + ph; this.ik2(b['thigh_' + s], b['calf_' + s], b['foot_' + s], this.cw(sx * 0.11, 0.3 + 0.17 * Math.sin(c) + 0.085, -0.17 * Math.cos(c) + 0.02), fwd.clone().addScaledVector(up, 0.3));
      this.aim(b['foot_' + s], b['ball_' + s], this.dirW(0, -0.25, -1, new THREE.Vector3()), 0.8);
      this.ik2(b['upperarm_' + s], b['lowerarm_' + s], b['hand_' + s], this.cw(sx * 0.23, 1.04, -0.37), down.clone().addScaledVector(fwd, -0.4).add(this.dirW(sx, 0, 0, new THREE.Vector3()).multiplyScalar(0.5)));
    }
  }
  _scootPose(a) { // scooter deck top y 0.135; bar grips (+-0.25, 1.08, -0.47); one foot ahead of the other
    const b = this.bones; this.root.updateMatrixWorld(true); this._lean(0.14);
    const fwd = this.dirW(0, 0, -1, new THREE.Vector3()), down = this.dirW(0, -1, 0, new THREE.Vector3());
    const feet = { l: [-0.05, 0.215, -0.17], r: [0.05, 0.215, 0.16] };
    for (const [s, sx] of [['l', -1], ['r', 1]]) { const F = feet[s]; this.ik2(b['thigh_' + s], b['calf_' + s], b['foot_' + s], this.cw(F[0], F[1], F[2]), fwd); this.aim(b['foot_' + s], b['ball_' + s], this.dirW(sx * 0.2, -0.35, -1, new THREE.Vector3()), 0.8);
      this.ik2(b['upperarm_' + s], b['lowerarm_' + s], b['hand_' + s], this.cw(sx * 0.22, 1.09, -0.44), down.clone().addScaledVector(fwd, -0.5).add(this.dirW(sx, 0, 0, new THREE.Vector3()).multiplyScalar(0.6))); }
  }
  _phonePose(k, mode) {
    const b = this.bones; const d = new THREE.Vector3();
    this.aim(b.upperarm_r, b.lowerarm_r, this.dirW(0.2, -0.92, -0.18, d), k);
    this.aim(b.lowerarm_r, b.hand_r, this.dirW(-0.42, 0.42, -0.8, d), k);
    if (mode === 'walk' || mode === 'stand') { this.aim(b.upperarm_l, b.lowerarm_l, this.dirW(-0.16, -0.95, -0.12, d), k * 0.5); }
    // look down at the screen
    this.root.getWorldQuaternion(q2); v3.set(1, 0, 0).applyQuaternion(q2);
    q1.setFromAxisAngle(v3, -0.42 * k); b.neck_01.getWorldQuaternion(q2); q1.multiply(q2); b.neck_01.parent.getWorldQuaternion(q3); q3.invert().multiply(q1); b.neck_01.quaternion.copy(q3); b.neck_01.updateMatrixWorld(true);
  }
  _armsIn(mode) {
    const b = this.bones; const rq = this.root.getWorldQuaternion(new THREE.Quaternion()); const inv = rq.clone().invert(); const d = new THREE.Vector3();
    for (const s of ['l', 'r']) { if (s === 'r' && this.phoneK > 0.05) continue;
      b['upperarm_' + s].getWorldPosition(v1); b['lowerarm_' + s].getWorldPosition(v2); d.subVectors(v2, v1).normalize().applyQuaternion(inv);
      const sx = s === 'l' ? -1 : 1; if (d.x * sx > 0.03) { d.x = sx * (0.03 + (d.x * sx - 0.03) * (mode === 'jog' ? 0.55 : 0.32)); d.normalize().applyQuaternion(rq); this.aim(b['upperarm_' + s], b['lowerarm_' + s], d, 1); } }
  }
  _widen() {
    const b = this.bones; const rq = this.root.getWorldQuaternion(new THREE.Quaternion()); const inv = rq.clone().invert(); const d = new THREE.Vector3();
    for (const s of ['l', 'r']) { const sx = s === 'l' ? -1 : 1; b['thigh_' + s].getWorldPosition(v1); b['calf_' + s].getWorldPosition(v2); d.subVectors(v2, v1).normalize().applyQuaternion(inv); d.x += sx * 0.045; d.normalize().applyQuaternion(rq); this.aim(b['thigh_' + s], b['calf_' + s], d, 1); }
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
    // r4-people2: idle people look around now and then (glance aside, back to their friends, down, up) instead of staring ahead
    this.lookT -= dt; if (this.lookT <= 0) { const r = Math.random(); const m = this.mode; const idle = m === 'stand' || m === 'sit' || m === 'ground';
      this.lookYaw = idle ? (r < 0.45 ? 0 : (Math.random() - 0.5) * (this.speaking ? 0.8 : 1.6)) : (r < 0.8 ? 0 : (Math.random() - 0.5) * 0.9); this.lookT = idle ? 1.5 + Math.random() * 3.5 : 3 + Math.random() * 6; }
    if (!a.gaze) want = this.lookYaw;
    this.gazeYaw += (want - this.gazeYaw) * Math.min(1, dt * 3);
    if (Math.abs(this.gazeYaw) < 0.01 || this.mode === 'lie') return;
    const b = this.bones; this.root.getWorldQuaternion(q2); v3.set(0, 1, 0);
    for (const [bn, f] of [['neck_01', 0.45], ['Head', 0.55]]) { const bone = b[bn]; q1.setFromAxisAngle(v3, this.gazeYaw * f); bone.getWorldQuaternion(q2); q1.multiply(q2); bone.parent.getWorldQuaternion(q3); q3.invert().multiply(q1); bone.quaternion.copy(q3); bone.updateMatrixWorld(true); }
  }
  _props(a, mode) {
    const b = this.bones; const ex = this.extra; const toLocal = (wv) => this.root.worldToLocal(wv);
    // phone in the right hand while texting
    const ph = this.phoneK > 0.3; // (three only skips objects whose visible === false, so keep these strictly boolean)
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
