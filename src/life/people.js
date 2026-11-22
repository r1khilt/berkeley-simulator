// Campus life: instanced people with a 13-bone skeleton evaluated in the vertex shader.
// One uber-mesh per LOD carries every optional part (hair styles, backpack, skirt, bag, phone, book, cup); parts an
// instance doesn't use collapse to a point. Per instance: instanceMatrix (position, heading, height/width scale) and
//   aAnim  = (phase rad, pose id, variant, aux)        aux: walk 0..1 jog | sit seat height | cycle crank angle
//   aCol0  = (top rgb, skin index)   aCol1 = (bottom rgb, hair index)
//   aStyle = (hair style, flag bits, build 0 masc..1 fem, shoe index)
// Model space: metres, feet on y=0, facing -z (like the player avatar), right hand on +x.
import * as THREE from 'three';
import { U } from '../materials.js';

export const POSE = { WALK: 0, STAND: 1, SIT: 2, GROUND: 3, LIE: 4, CYCLE: 5, SCOOTER: 6 };
export const FLAG = { SLEEVE: 1, PANTS: 2, BACKPACK: 4, SKIRT: 8, BAG: 16, PHONE: 32, BOOK: 64, CUP: 128 };
const BONE = { pelvis: 0, torso: 1, head: 2, thighL: 3, shinL: 4, footL: 5, thighR: 6, shinR: 7, footR: 8, uarmL: 9, farmL: 10, uarmR: 11, farmR: 12 };
const SLOT = { skin: 0, hair: 1, top: 2, bottom: 3, shoe: 4, sleeve: 5, shin: 6, bag: 7, accent: 8, sole: 9, dark: 10, paper: 11 };
const TAG = { always: 0, hairCap: 1, hairLong: 2, pony: 3, bun: 4, beanie: 5, cap: 6, backpack: 7, skirt: 8, bag: 9, phone: 10, book: 11, cup: 12 };

// ---------------------------------------------------------------- geometry
class Builder {
  constructor() { this.pos = []; this.nor = []; this.info = []; this.fem = []; this.idx = []; }
  // g: BufferGeometry already in rest-pose model space. femFn(x,y,z) -> [dx,dy,dz] (feminine build offset)
  add(g, bone, slot, tag = 0, femFn = null) {
    if (!g.index) g = mergeVerts(g);
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal, base = this.pos.length / 3;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      this.pos.push(x, y, z); this.nor.push(n.getX(i), n.getY(i), n.getZ(i)); this.info.push(bone, slot, tag);
      const f = femFn ? femFn(x, y, z) : null; this.fem.push(f ? f[0] : 0, f ? f[1] : 0, f ? f[2] : 0);
    }
    const ix = g.index.array; for (let i = 0; i < ix.length; i++) this.idx.push(ix[i] + base);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('aInfo', new THREE.Float32BufferAttribute(this.info, 3));
    g.setAttribute('aFem', new THREE.Float32BufferAttribute(this.fem, 3));
    g.setIndex(this.idx.length > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 2.2);
    return g;
  }
}
function mergeVerts(g) { const idx = []; for (let i = 0; i < g.attributes.position.count; i++) idx.push(i); g.setIndex(idx); return g; }
// tapered limb hanging from (x, yTop, z) down to yBot; elliptical section (sx, sz scale)
function limb(rTop, rBot, x, yTop, yBot, z, seg, sx = 1, sz = 1) {
  const g = new THREE.CylinderGeometry(rTop, rBot, yTop - yBot, seg, 1, true); g.scale(sx, 1, sz); g.translate(x, (yTop + yBot) / 2, z); return g;
}
function ball(r, x, y, z, ws, hs, sx = 1, sy = 1, sz = 1) { const g = new THREE.SphereGeometry(r, ws, hs); g.scale(sx, sy, sz); g.translate(x, y, z); return g; }
// lofted torso through elliptical rings [y, halfWidth, halfDepth, zOffset]; rounded-box-ish section (superellipse)
function loft(rings, seg, capTop = true, capBot = true) {
  const pos = [], idx = [];
  for (const [y, hw, hd, zo] of rings) for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const e = 0.8; // superellipse exponent factor (<1 = boxier)
    const cx = Math.sign(c) * Math.pow(Math.abs(c), e), sz = Math.sign(s) * Math.pow(Math.abs(s), e);
    pos.push(cx * hw, y, sz * hd + (zo || 0));
  }
  const R = rings.length;
  for (let r = 0; r < R - 1; r++) for (let i = 0; i < seg; i++) { const a = r * seg + i, b = r * seg + (i + 1) % seg, c = a + seg, d = b + seg; idx.push(a, c, b, b, c, d); }
  if (capBot) { const ci = pos.length / 3; pos.push(0, rings[0][0] - 0.01, rings[0][3] || 0); for (let i = 0; i < seg; i++) idx.push(ci, i, (i + 1) % seg); }
  if (capTop) { const ci = pos.length / 3; const L = rings[R - 1]; pos.push(0, L[0] + 0.01, L[3] || 0); const o = (R - 1) * seg; for (let i = 0; i < seg; i++) idx.push(ci, o + (i + 1) % seg, o + i); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function box(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }

// detail: 1 = near LOD, 0 = far LOD
export function personGeometry(detail = 1) {
  const B = new Builder(); const hi = detail > 0;
  const L = hi ? 8 : 5, TS = hi ? 14 : 8;
  // feminine build: narrower shoulders/waist, wider hips, slight bust; arms move in with the shoulders
  const femTorso = (x, y, z) => {
    let k = 1;
    if (y > 1.33) k = 0.9; else if (y > 1.2) k = 0.93; else if (y > 1.0) k = 0.91; else k = 1.06;
    const bust = (y > 1.18 && y < 1.36 && z < 0) ? -0.025 * Math.sin((y - 1.18) / 0.18 * Math.PI) * Math.min(1, -z / 0.08) : 0;
    return [x * (k - 1), 0, bust];
  };
  // ---- pelvis + torso (one loft so the waist bends smoothly)
  const rings = [[0.84, 0.138, 0.095], [0.9, 0.158, 0.106], [0.97, 0.16, 0.104], [1.04, 0.15, 0.098], [1.12, 0.156, 0.1], [1.22, 0.172, 0.112, -0.004], [1.31, 0.182, 0.112, -0.004], [1.38, 0.19, 0.1], [1.43, 0.165, 0.085], [1.465, 0.07, 0.058]];
  const torso = loft(hi ? rings : rings.filter((r, i) => i % 2 === 0 || i === rings.length - 1), TS);
  // split by height into pelvis (bone 0, bottom colour) and torso (bone 1, top colour)
  splitAdd(B, torso, (y) => (y < 1.0 ? [BONE.pelvis, SLOT.bottom] : [BONE.torso, SLOT.top]), femTorso);
  // neck + head
  B.add(limb(0.048, 0.054, 0, 1.58, 1.44, 0.004, L), BONE.torso, SLOT.skin);
  B.add(ball(0.1, 0, 1.64, -0.004, hi ? 14 : 8, hi ? 10 : 6, 0.84, 1.1, 0.97), BONE.head, SLOT.skin);
  if (hi) {
    const nose = new THREE.ConeGeometry(0.017, 0.045, 5); nose.rotateX(-Math.PI / 2 - 0.25); nose.translate(0, 1.625, -0.105); B.add(nose, BONE.head, SLOT.skin);
    for (const s of [-1, 1]) B.add(ball(0.022, s * 0.083, 1.635, 0.005, 6, 5, 0.5, 1.2, 0.9), BONE.head, SLOT.skin);
  }
  // ---- hair styles (head bone)
  const hairCap = new THREE.SphereGeometry(0.1065, hi ? 14 : 8, hi ? 8 : 5, 0, Math.PI * 2, 0, Math.PI * 0.56); hairCap.scale(0.86, 1.1, 0.99); hairCap.rotateX(-0.42); hairCap.translate(0, 1.655, 0.012);
  B.add(hairCap, BONE.head, SLOT.hair, TAG.hairCap);
  const longH = new THREE.CylinderGeometry(0.098, 0.115, 0.3, hi ? 12 : 6, 1, true, Math.PI * 0.5 - 1.35, 2.7 + Math.PI * 0.0); longH.rotateY(Math.PI); longH.scale(0.95, 1, 0.9); longH.translate(0, 1.53, 0.02);
  B.add(longH, BONE.head, SLOT.hair, TAG.hairLong);
  const pony = new THREE.CapsuleGeometry(0.03, 0.15, 3, hi ? 6 : 4); pony.rotateX(-0.22); pony.translate(0, 1.575, 0.118); B.add(pony, BONE.head, SLOT.hair, TAG.pony);
  B.add(ball(0.05, 0, 1.75, 0.07, hi ? 8 : 5, hi ? 6 : 4), BONE.head, SLOT.hair, TAG.bun);
  const beanie = new THREE.SphereGeometry(0.112, hi ? 14 : 8, hi ? 7 : 5, 0, Math.PI * 2, 0, Math.PI * 0.52); beanie.scale(0.88, 1.12, 1.0); beanie.rotateX(-0.12); beanie.translate(0, 1.668, 0.004);
  B.add(beanie, BONE.head, SLOT.accent, TAG.beanie);
  const capTop = new THREE.SphereGeometry(0.109, hi ? 14 : 8, hi ? 6 : 4, 0, Math.PI * 2, 0, Math.PI * 0.5); capTop.scale(0.87, 0.9, 1.0); capTop.translate(0, 1.672, 0.004);
  B.add(capTop, BONE.head, SLOT.accent, TAG.cap);
  const brim = new THREE.CylinderGeometry(0.085, 0.085, 0.012, hi ? 12 : 6, 1, false, Math.PI * 0.5, Math.PI); brim.scale(1, 1, 0.95); brim.rotateX(0.12); brim.translate(0, 1.68, -0.075);
  B.add(brim, BONE.head, SLOT.accent, TAG.cap);
  // ---- legs (thigh, knee ball + shin, shoe)
  const femLeg = (x, y, z) => [x * 0.04 * (y > 0.7 ? 1 : 0.3), 0, 0];
  for (const s of [-1, 1]) {
    const th = s < 0 ? BONE.thighL : BONE.thighR, sh = s < 0 ? BONE.shinL : BONE.shinR, ft = s < 0 ? BONE.footL : BONE.footR;
    B.add(limb(0.082, 0.056, s * 0.092, 0.97, 0.5, 0.002, L, 1, 1.02), th, SLOT.bottom, 0, femLeg);
    B.add(ball(0.056, s * 0.092, 0.5, 0.004, L, hi ? 5 : 4), sh, SLOT.shin, 0, femLeg);
    B.add(limb(0.055, 0.04, s * 0.092, 0.5, 0.1, 0.008, L, 1, 1.05), sh, SLOT.shin, 0, femLeg);
    const shoe = new THREE.CapsuleGeometry(0.047, 0.16, 3, hi ? 7 : 5); shoe.rotateX(Math.PI / 2); shoe.scale(1, 0.95, 1); shoe.translate(s * 0.094, 0.055, -0.06);
    B.add(shoe, ft, SLOT.shoe);
    if (hi) B.add(box(0.098, 0.022, 0.255, s * 0.094, 0.011, -0.06), ft, SLOT.sole);
  }
  // ---- arms (shoulder ball + upper arm, elbow ball + forearm + hand)
  const femArm = (x) => [-Math.sign(x) * 0.016, 0, 0];
  for (const s of [-1, 1]) {
    const ua = s < 0 ? BONE.uarmL : BONE.uarmR, fa = s < 0 ? BONE.farmL : BONE.farmR;
    B.add(ball(0.051, s * 0.186, 1.4, 0.0, L, hi ? 6 : 4, 1, 1, 0.95), ua, SLOT.top, 0, femArm);
    B.add(limb(0.052, 0.042, s * 0.19, 1.41, 1.12, 0.0, L), ua, SLOT.top, 0, femArm);
    B.add(ball(0.041, s * 0.19, 1.12, 0.0, L, hi ? 5 : 4), fa, SLOT.sleeve, 0, femArm);
    B.add(limb(0.04, 0.031, s * 0.19, 1.12, 0.865, 0.0, L), fa, SLOT.sleeve, 0, femArm);
    B.add(ball(0.05, s * 0.19, 0.81, -0.004, hi ? 7 : 5, hi ? 5 : 4, 0.62, 1.15, 0.5), fa, SLOT.skin, 0, femArm);
    if (s > 0) { // right hand props
      if (hi) { B.add(box(0.075, 0.15, 0.012, s * 0.19, 0.795, -0.035), fa, SLOT.dark, TAG.phone, femArm);
        const cup = new THREE.CylinderGeometry(0.043, 0.036, 0.14, 8); cup.translate(s * 0.19, 0.81, -0.04); B.add(cup, fa, SLOT.paper, TAG.cup, femArm); }
    } else B.add(box(0.2, 0.26, 0.028, s * 0.15, 0.80, -0.06), fa, SLOT.paper, TAG.book, femArm); // book held in the left hand
  }
  // ---- accessories on the torso / pelvis
  const bp = new THREE.CapsuleGeometry(0.1, 0.17, 3, hi ? 8 : 5); bp.scale(1.35, 1, 0.68); bp.translate(0, 1.21, 0.175); B.add(bp, BONE.torso, SLOT.bag, TAG.backpack);
  if (hi) for (const s of [-1, 1]) B.add(box(0.04, 0.26, 0.02, s * 0.1, 1.3, -0.108), BONE.torso, SLOT.bag, TAG.backpack, femTorso);
  const sk = loft([[0.56, 0.235, 0.2], [0.75, 0.2, 0.16], [0.95, 0.172, 0.112]], hi ? 14 : 8, false, false); B.add(sk, BONE.pelvis, SLOT.bottom, TAG.skirt, femTorso);
  B.add(box(0.07, 0.24, 0.22, 0.215, 0.93, 0.0), BONE.pelvis, SLOT.bag, TAG.bag);
  if (hi) { const strap = box(0.035, 0.62, 0.012, 0, 1.2, -0.11); strap.rotateZ(0); const m = new THREE.Matrix4().makeRotationZ(0.55); strap.translate(0, -1.2, 0); strap.applyMatrix4(m); strap.translate(0.0, 1.2, 0); B.add(strap, BONE.torso, SLOT.bag, TAG.bag, femTorso); }
  return B.build();
}
function splitAdd(B, g, fn, femFn) {
  // assigns bone/slot per vertex by height; keeps one shared index buffer
  const p = g.attributes.position, n = g.attributes.normal, base = B.pos.length / 3;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const [bone, slot] = fn(y);
    B.pos.push(x, y, z); B.nor.push(n.getX(i), n.getY(i), n.getZ(i)); B.info.push(bone, slot, 0);
    const f = femFn ? femFn(x, y, z) : [0, 0, 0]; B.fem.push(f[0], f[1], f[2]);
  }
  const ix = g.index.array; for (let i = 0; i < ix.length; i++) B.idx.push(ix[i] + base);
}

// ---------------------------------------------------------------- shader
const GLSL_HEAD = /* glsl */`
attribute vec3 aInfo; attribute vec3 aFem; attribute vec4 aAnim; attribute vec4 aCol0; attribute vec4 aCol1; attribute vec4 aStyle;
uniform float uTime;
varying vec3 vPCol;
mat3 rX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
mat3 rY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 rZ(float a){ float c=cos(a), s=sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }

bool bsimVisible(float tag){
  int t = int(tag + 0.5); if (t == 0) return true;
  int hs = int(aStyle.x + 0.5); int fl = int(aStyle.y + 0.5);
  if (t == 1) return hs == 1 || hs == 2 || hs == 3 || hs == 4 || hs == 6;
  if (t == 2) return hs == 2; if (t == 3) return hs == 3; if (t == 4) return hs == 4; if (t == 5) return hs == 5; if (t == 6) return hs == 6;
  if (t == 7) return (fl & 4) != 0; if (t == 8) return (fl & 8) != 0; if (t == 9) return (fl & 16) != 0;
  if (t == 10) return (fl & 32) != 0; if (t == 11) return (fl & 64) != 0; if (t == 12) return (fl & 128) != 0;
  return true;
}
// two-bone leg IK in the y-z plane: hip pivot h, target f (foot pivot); returns (hipFlex, kneeFlex)
vec2 legIK(vec2 h, vec2 f, float l1, float l2){
  vec2 d = f - h; float L = clamp(length(d), 0.05, l1 + l2 - 0.001);
  float aD = atan(-d.y, -d.x); // d.x = y component, d.y = z component (vec2(y,z))
  float cosA = clamp((l1*l1 + L*L - l2*l2) / (2.0*l1*L), -1.0, 1.0);
  float cosK = clamp((l1*l1 + l2*l2 - L*L) / (2.0*l1*l2), -1.0, 1.0);
  return vec2(aD + acos(cosA), -(PI - acos(cosK)));
}
vec3 bsimPose(vec3 p, inout vec3 n){
  float bone = aInfo.x;
  if (!bsimVisible(aInfo.z)) { n = vec3(0.,1.,0.); return vec3(0.); }
  p += aFem * aStyle.z;
  float fem = aStyle.z;
  float ph = aAnim.x, pose = aAnim.y, vari = aAnim.z, aux = aAnim.w;
  float seed = fract(aCol0.w * 0.1731 + aCol1.w * 0.0713 + aStyle.w * 0.311 + aCol0.r * 3.7 + aCol1.g * 5.3);
  float t = uTime + seed * 40.0;
  // joint angles: x = left (-x side), y = right (+x side)
  vec2 hip = vec2(0.02), knee = vec2(-0.04), ank = vec2(0.0), hin = vec2(0.0), habd = vec2(0.035), htw = vec2(0.0); // htw: thigh external rotation
  vec2 sh = vec2(0.04), sabd = vec2(0.09), syaw = vec2(0.0), el = vec2(0.18);
  vec3 spine = vec3(0.0); vec2 head = vec2(0.0); vec3 pel = vec3(0.0); // pel: y offset, yaw, roll
  float autoPel = 1.0; vec3 pelOff = vec3(0.0); float rootPitch = 0.0; vec3 rootOff = vec3(0.0);
  int iv = int(vari + 0.5);
  if (pose < 0.5) { // ---- walk / jog
    float jog = aux; float sL = sin(ph), sR = -sL;
    float A = mix(0.4, 0.58, jog);
    hip = vec2(sL, sR) * A + 0.05 + 0.1 * jog;
    float w0 = pow(max(0., cos(ph + 0.35)), 2.0), w1 = pow(max(0., cos(ph + PI + 0.35)), 2.0);
    float K = mix(1.0, 1.75, jog);
    knee = -vec2(0.07 + K * w0 + 0.12 * max(0., sin(ph - 0.3)), 0.07 + K * w1 + 0.12 * max(0., sin(ph + PI - 0.3)));
    vec2 sw = vec2(smoothstep(0.0, 0.25, w0), smoothstep(0.0, 0.25, w1));
    ank = mix(-(hip + knee), vec2(0.18) - 0.2 * vec2(w0, w1), sw);
    sh = vec2(-sL, sL) * mix(0.3, 0.55, jog) + 0.06;
    el = vec2(0.2) + jog * 1.25 + 0.22 * max(vec2(0.0), vec2(-sL, sL));
    sabd = vec2(0.1 + 0.08 * jog);
    spine = vec3(-0.04 - 0.16 * jog, 0.09 * sL, 0.025 * sL);
    pel = vec3(0.0, -0.07 * sL, 0.035 * sL);
    head = vec2(0.03 + 0.12 * jog, -0.07 * sL);
    if (iv == 1) { sh.y = 0.4; el.y = 1.7; syaw.y = 0.42; head.x = -0.6; } // texting while walking
    if (iv == 2) { sh.y = 0.12; el.y = 1.35; syaw.y = 0.15; }                 // carrying a coffee
    if (iv == 3) { sh = vec2(-0.18 - 0.05 * sL, -0.18 + 0.05 * sL); el = vec2(0.55); sabd = vec2(0.3); syaw = vec2(0.25); } // hands in pockets
  } else if (pose < 1.5) { // ---- standing idle
    float sway = sin(t * 0.45);
    pel = vec3(0.0, 0.04 * sin(t * 0.21), 0.035 * sway);
    knee = vec2(-0.04 - 0.14 * max(0.0, sway), -0.04 - 0.14 * max(0.0, -sway)); hip = vec2(0.03) - knee * 0.4; ank = -(hip + knee);
    habd = vec2(0.05) + vec2(-0.03, 0.03) * sway;
    head = vec2(-0.04 + 0.05 * sin(t * 0.37), 0.35 * sin(t * 0.13 + seed * 6.0) * smoothstep(0.2, 0.8, sin(t * 0.07 + seed * 3.0) * 0.5 + 0.5));
    sh = vec2(0.05); el = vec2(0.22); sabd = vec2(0.11);
    if (iv == 1) { sh = vec2(0.22, 0.26); sabd = vec2(0.16); syaw = vec2(1.25, 1.15); el = vec2(1.62, 1.8); }       // arms crossed
    else if (iv == 2) { sh = vec2(0.3, 0.34); el = vec2(1.5, 1.62); syaw = vec2(0.62, 0.42); head.x = -0.62; head.y *= 0.2; spine.x = -0.06; } // phone
    else if (iv == 3) { sh = vec2(-0.2); el = vec2(0.55); sabd = vec2(0.3); syaw = vec2(0.25); }                    // hands in pockets
    else if (iv == 4) { float g1 = sin(t * 1.7), g2 = sin(t * 2.3 + 1.0); sh.y = 0.35 + 0.22 * g1; el.y = 0.95 + 0.45 * g2; syaw.y = 0.3; sh.x = 0.1 + 0.12 * max(0.0, sin(t * 1.1)); el.x = 0.4 + 0.6 * max(0.0, sin(t * 1.1)); head.x += 0.05 * sin(t * 3.1); } // talking
    else if (iv == 5) { sh.y = 0.28; el.y = 1.5; syaw.y = 0.28; }                                                  // coffee
    else if (iv == 6) { sh = vec2(0.25); el = vec2(1.0); syaw = vec2(0.7); sabd = vec2(0.15); }                   // hands clasped in front (tabler)
  } else if (pose < 2.5) { // ---- sitting on a bench / ledge / step (aux = seat height above the feet)
    autoPel = 0.0; float hs = aux > 0.05 ? aux : 0.46;
    pelOff = vec3(0.0, hs + 0.09 - 0.92, 0.05);
    float hf = 1.42; hip = vec2(hf);
    float kneeY = hs + 0.09 - 0.42 * cos(hf); float drop = clamp(kneeY / 0.5, -1.0, 1.0); float th = acos(drop);
    knee = vec2(th - hf - 0.0) - 0.04; ank = -(hip + knee) * 0.7; habd = vec2(0.09); hin = vec2(-0.08);
    spine = vec3(-0.06 + 0.012 * sin(t * 0.9), 0.0, 0.0); head = vec2(-0.08 + 0.05 * sin(t * 0.31), 0.3 * sin(t * 0.11 + seed * 5.0));
    sh = vec2(0.2); el = vec2(0.92); sabd = vec2(0.1); syaw = vec2(0.12);
    if (iv == 1) { spine.x = -0.5; sh = vec2(0.95, 1.0); el = vec2(1.35, 1.5); syaw = vec2(0.45, 0.35); head.x = -0.5; head.y *= 0.2; } // elbows on knees, phone
    else if (iv == 2) { spine.x = 0.36; sh = vec2(-0.72); el = vec2(0.05); sabd = vec2(0.2); syaw = vec2(-0.15); head.x = -0.2; } // leaning back on hands
    else if (iv == 3) { hip.y = 1.75; hin.y = 0.38; habd.y = 0.0; knee.y = -1.75; ank.y = 0.2; htw.y = 0.25; sh = vec2(0.25); el = vec2(1.0); syaw = vec2(0.2); } // legs crossed (right over left)
    else if (iv == 4) { sh = vec2(0.6, 0.5); el = vec2(1.45, 1.3); syaw = vec2(0.38, 0.5); head.x = -0.62; head.y *= 0.15; }  // reading
    else if (iv == 5) { spine.x = -0.1; sh = vec2(0.35); el = vec2(1.35); syaw = vec2(0.15); sabd = vec2(0.18); }               // at a table, forearms on it
  } else if (pose < 3.5) { // ---- sitting on the ground (lawn)
    autoPel = 0.0; pelOff = vec3(0.0, 0.11 - 0.92, 0.0);
    head = vec2(-0.1 + 0.06 * sin(t * 0.29), 0.3 * sin(t * 0.09 + seed * 4.0));
    if (iv == 0 || iv == 4) { hip = vec2(1.45, 1.5); hin = vec2(-0.6, -0.48); htw = vec2(1.4, 1.35); knee = vec2(-2.4, -2.5); ank = vec2(-0.3); habd = vec2(0.0); spine.x = -0.12; sh = vec2(0.42); sabd = vec2(0.28); el = vec2(0.55); syaw = vec2(0.1);
      if (iv == 4) { sh = vec2(0.85, 0.75); el = vec2(1.4, 1.25); syaw = vec2(0.45, 0.55); head.x = -0.6; spine.x = -0.25; } }          // cross-legged (+ book)
    else if (iv == 1) { hip = vec2(2.45); knee = vec2(-1.98); ank = vec2(-0.45); spine.x = -0.32; sh = vec2(1.0); el = vec2(1.0); syaw = vec2(0.5); sabd = vec2(0.12); habd = vec2(0.08); } // hugging knees
    else if (iv == 2) { hip = vec2(1.52, 1.38); knee = vec2(-0.12, -0.55); ank = vec2(0.1); spine.x = 0.42; sh = vec2(-0.78); el = vec2(0.02); sabd = vec2(0.3); habd = vec2(0.08); } // legs out, leaning back
    else { hip = vec2(1.45, 1.4); hin = vec2(0.9, -0.2); htw = vec2(-1.2, 1.3); knee = vec2(-2.3, -2.5); ank = vec2(-0.4); habd = vec2(0.0); spine = vec3(-0.05, 0.3, 0.12); sh = vec2(0.35, -0.1); sabd = vec2(0.15, 0.55); el = vec2(0.6, 0.05); } // side-sit, legs swept left, propped on the right hand
  } else if (pose < 4.5) { // ---- lying on the lawn
    autoPel = 0.0;
    if (iv == 1) { // on the stomach, propped on elbows, feet up, reading
      rootPitch = -PI * 0.5; rootOff = vec3(0.0, 0.135, 0.0);
      spine.x = 0.55; head = vec2(-0.25 + 0.05 * sin(t * 0.4), 0.15 * sin(t * 0.13)); sh = vec2(2.25); el = vec2(1.75); syaw = vec2(0.22); sabd = vec2(0.18);
      knee = vec2(-1.65 - 0.3 * sin(t * 1.4), -1.65 + 0.3 * sin(t * 1.4)); hip = vec2(0.04); habd = vec2(0.08); hin = vec2(0.12, -0.12); ank = vec2(-0.5);
    } else { // on the back
      rootPitch = PI * 0.5; rootOff = vec3(0.0, 0.11, 0.0); head = vec2(0.12, 0.25 * sin(t * 0.07 + seed * 3.0));
      hip = vec2(0.62, 0.03); knee = vec2(-1.25, -0.06); ank = vec2(0.2, -0.45); habd = vec2(0.06, 0.12);
      if (iv == 2) { sh = vec2(0.1, 2.5); el = vec2(0.2, 2.2); sabd = vec2(0.12, 0.2); syaw = vec2(0.0, 0.6); }   // arm over the eyes
      else { sh = vec2(2.85); el = vec2(2.25); sabd = vec2(0.55); }                                            // hands behind the head
    }
  } else if (pose < 5.5) { // ---- cycling (bike frame: saddle (0,.93,.24), bars (+-.24,1.04,-.4), crank centre (0,.3,0))
    autoPel = 0.0; pelOff = vec3(0.0, 0.985 - 0.92, 0.25);
    spine = vec3(-0.62, 0.0, 0.0); head = vec2(0.55, 0.12 * sin(t * 0.21));
    sh = vec2(1.42); el = vec2(0.3); sabd = vec2(0.13); syaw = vec2(0.06);
    float cr = aux; habd = vec2(0.05); hin = vec2(0.03);
    for (int k = 0; k < 2; k++) {
      float a = cr + (k == 0 ? PI : 0.0);
      vec2 pedal = vec2(0.30 + 0.17 * cos(a), -0.17 * sin(a)); // (y, z)
      vec2 hipP = vec2(0.985, 0.25);
      vec2 ik = legIK(hipP, pedal + vec2(0.07, 0.03), 0.42, 0.42);
      if (k == 0) { hip.x = ik.x; knee.x = ik.y; } else { hip.y = ik.x; knee.y = ik.y; }
    }
    ank = -(hip + knee) * 0.6;
  } else { // ---- e-scooter (deck top 0.13 m)
    autoPel = 1.0; rootOff = vec3(0.0, 0.13, 0.0);
    hip = vec2(0.16, -0.16); knee = vec2(-0.12, -0.2); ank = vec2(-0.04, 0.3); habd = vec2(0.03);
    spine = vec3(-0.14, -0.1, 0.0); pel.y = 0.12; head = vec2(0.12, 0.1 * sin(t * 0.3));
    sh = vec2(0.82, 0.78); el = vec2(0.5); sabd = vec2(0.12); syaw = vec2(0.1);
  }
  // ---- evaluate the skeleton
  float sgn = 1.0; vec3 q = p; mat3 R = mat3(1.0);
  vec3 HIP0 = vec3(0.0, 0.92, 0.0);
  float shX = 0.19 - 0.016 * fem;
  if (bone > 2.5 && bone < 8.5) { // legs (in the pelvis frame)
    bool left = bone < 5.5; sgn = left ? -1.0 : 1.0; float lb = left ? bone - 3.0 : bone - 6.0;
    float fh = left ? hip.x : hip.y, fk = left ? knee.x : knee.y, fa = left ? ank.x : ank.y, fi = left ? hin.x : hin.y, fb = left ? habd.x : habd.y, ft = left ? htw.x : htw.y;
    vec3 hp = vec3(sgn * 0.092, 0.92, 0.0), kp = vec3(sgn * 0.092, 0.5, 0.0), ap = vec3(sgn * 0.094, 0.085, 0.0);
    mat3 Rt = rY(sgn * fi) * rZ(sgn * fb) * rX(fh) * rY(-sgn * ft);
    mat3 Rs = Rt * rX(fk); mat3 Rf = Rs * rX(fa);
    if (lb < 0.5) { q = hp + Rt * (p - hp); R = Rt; }
    else if (lb < 1.5) { q = hp + Rt * (kp - hp) + Rs * (p - kp); R = Rs; }
    else { q = hp + Rt * (kp - hp) + Rs * (ap - kp) + Rf * (p - ap); R = Rf; }
  } else if (bone > 0.5) { // torso, head, arms (in the torso frame)
    vec3 W = vec3(0.0, 1.0, 0.0);
    if (bone > 1.5 && bone < 2.5) { vec3 N = vec3(0.0, 1.52, 0.0); mat3 Rh = rY(head.y) * rX(head.x); q = N + Rh * (p - N); R = Rh; }
    else if (bone > 8.5) {
      bool left = bone < 10.5; sgn = left ? -1.0 : 1.0; bool fore = left ? bone > 9.5 : bone > 11.5;
      float fs = left ? sh.x : sh.y, fb = left ? sabd.x : sabd.y, fy = left ? syaw.x : syaw.y, fe = left ? el.x : el.y;
      vec3 sp = vec3(sgn * shX, 1.405, 0.0), ep = vec3(sgn * shX, 1.12, 0.0);
      mat3 Ru = rY(sgn * fy) * rZ(sgn * fb) * rX(fs); mat3 Rl = Ru * rX(fe);
      if (!fore) { q = sp + Ru * (p - sp); R = Ru; } else { q = sp + Ru * (ep - sp) + Rl * (p - ep); R = Rl; }
    }
    mat3 Rsp = rY(spine.y) * rZ(spine.z) * rX(spine.x);
    q = W + Rsp * (q - W); R = Rsp * R;
  }
  // pelvis frame (everything): yaw/roll about the hip centre, then height
  mat3 Rp = rY(pel.y) * rZ(pel.z);
  q = HIP0 + Rp * (q - HIP0); R = Rp * R;
  if (autoPel > 0.5) {
    float eL = 0.42 * cos(hip.x) + 0.415 * cos(hip.x + knee.x), eR = 0.42 * cos(hip.y) + 0.415 * cos(hip.y + knee.y);
    q.y += max(eL, eR) + 0.085 - 0.92;
  }
  q += pelOff;
  if (abs(rootPitch) > 0.01) { mat3 Rr = rX(rootPitch); q = Rr * (q - HIP0); R = Rr * R; }
  q += rootOff;
  n = R * n;
  return q;
}
const vec3 SKIN[6] = vec3[6](vec3(0.92,0.74,0.62), vec3(0.83,0.62,0.47), vec3(0.70,0.50,0.36), vec3(0.55,0.37,0.25), vec3(0.40,0.26,0.17), vec3(0.27,0.17,0.11));
const vec3 HAIR[7] = vec3[7](vec3(0.035,0.03,0.028), vec3(0.09,0.06,0.04), vec3(0.2,0.13,0.07), vec3(0.36,0.24,0.13), vec3(0.62,0.48,0.28), vec3(0.45,0.44,0.43), vec3(0.42,0.1,0.07));
const vec3 SHOE[6] = vec3[6](vec3(0.86,0.86,0.84), vec3(0.06,0.06,0.065), vec3(0.42,0.42,0.43), vec3(0.12,0.16,0.3), vec3(0.45,0.33,0.2), vec3(0.62,0.12,0.1));
vec3 bsimColor(){
  int slot = int(aInfo.y + 0.5); int fl = int(aStyle.y + 0.5);
  vec3 skin = SKIN[int(clamp(aCol0.w, 0.0, 5.0) + 0.5)];
  vec3 top = aCol0.rgb, bot = aCol1.rgb;
  if (slot == 0) return skin;
  if (slot == 1) return HAIR[int(clamp(aCol1.w, 0.0, 6.0) + 0.5)];
  if (slot == 2) return top;
  if (slot == 3) return bot;
  if (slot == 4) return SHOE[int(clamp(aStyle.w, 0.0, 5.0) + 0.5)];
  if (slot == 5) return (fl & 1) != 0 ? top : skin;
  if (slot == 6) return (fl & 2) != 0 ? bot : skin * 0.97;
  if (slot == 7) { float h = fract(aCol1.r * 7.13 + aCol0.g * 3.1); return h < 0.45 ? vec3(0.06, 0.065, 0.075) : h < 0.6 ? vec3(0.02, 0.12, 0.28) : h < 0.75 ? vec3(0.35, 0.1, 0.08) : h < 0.88 ? vec3(0.18, 0.22, 0.16) : vec3(0.5, 0.42, 0.3); }
  if (slot == 8) { float h = fract(aCol0.b * 5.7 + aCol1.g * 2.3); return h < 0.4 ? vec3(0.0, 0.11, 0.25) : h < 0.6 ? vec3(0.85, 0.62, 0.08) : h < 0.8 ? vec3(0.05) : vec3(0.55, 0.53, 0.5); }
  if (slot == 9) return vec3(0.8, 0.79, 0.76);
  if (slot == 10) return vec3(0.03, 0.03, 0.035);
  return vec3(0.88, 0.86, 0.8);
}
`;
function patchVertex(src, withNormal) {
  src = src.replace('#include <common>', '#include <common>\n' + GLSL_HEAD);
  if (withNormal) {
    src = src.replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3( normal ); vec3 bsimP = bsimPose(position, objectNormal); vPCol = bsimColor();\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif')
      .replace('#include <begin_vertex>', 'vec3 transformed = bsimP;');
  } else {
    src = src.replace('#include <begin_vertex>', 'vec3 bsimN = vec3(0.0, 1.0, 0.0); vec3 transformed = bsimPose(position, bsimN); vPCol = vec3(0.0);');
  }
  return src;
}
export function personMaterials() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.0 });
  mat.name = 'life:people';
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = patchVertex(sh.vertexShader, true);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPCol;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = vPCol;');
  };
  mat.customProgramCacheKey = () => 'life-people-v1';
  const depth = new THREE.MeshDepthMaterial();
  depth.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = patchVertex(sh.vertexShader, false);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPCol;');
  };
  depth.customProgramCacheKey = () => 'life-people-depth-v1';
  return { mat, depth };
}

// ---------------------------------------------------------------- instanced crowd mesh (one per LOD)
export class CrowdMesh {
  constructor(geo, mats, max, name) {
    this.max = max; this.geo = geo;
    this.aAnim = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aAnim.setUsage(THREE.DynamicDrawUsage);
    this.aCol0 = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aCol0.setUsage(THREE.DynamicDrawUsage);
    this.aCol1 = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aCol1.setUsage(THREE.DynamicDrawUsage);
    this.aStyle = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aStyle.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aAnim', this.aAnim); geo.setAttribute('aCol0', this.aCol0); geo.setAttribute('aCol1', this.aCol1); geo.setAttribute('aStyle', this.aStyle);
    this.mesh = new THREE.InstancedMesh(geo, mats.mat, max); this.mesh.name = name; this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.customDepthMaterial = mats.depth; this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.n = 0;
  }
  begin() { this.n = 0; }
  // m: Float32Array(16) world matrix; look: person look record; anim: [phase, pose, variant, aux]
  push(m, look, a0, a1, a2, a3, flagsExtra = 0) {
    if (this.n >= this.max) return; const i = this.n++;
    this.mesh.instanceMatrix.array.set(m, i * 16);
    const A = this.aAnim.array; A[i * 4] = a0; A[i * 4 + 1] = a1; A[i * 4 + 2] = a2; A[i * 4 + 3] = a3;
    const C0 = this.aCol0.array, C1 = this.aCol1.array, S = this.aStyle.array;
    C0[i * 4] = look.top[0]; C0[i * 4 + 1] = look.top[1]; C0[i * 4 + 2] = look.top[2]; C0[i * 4 + 3] = look.skin;
    C1[i * 4] = look.bot[0]; C1[i * 4 + 1] = look.bot[1]; C1[i * 4 + 2] = look.bot[2]; C1[i * 4 + 3] = look.hairC;
    S[i * 4] = look.hair; S[i * 4 + 1] = look.flags | flagsExtra; S[i * 4 + 2] = look.fem; S[i * 4 + 3] = look.shoe;
  }
  end() {
    const n = this.n; this.mesh.count = n;
    for (const a of [this.mesh.instanceMatrix, this.aAnim, this.aCol0, this.aCol1, this.aStyle]) { a.clearUpdateRanges(); a.addUpdateRange(0, n * a.itemSize); a.needsUpdate = true; }
  }
}

// ---------------------------------------------------------------- random looks (November in Berkeley: layers, hoodies, Cal colours)
const TOPS = [ // weighted palette of tops (linear-ish sRGB values, converted below)
  ['#1d2a44', 4], ['#003262', 4], ['#fdb515', 1.4], ['#2b2b2d', 5], ['#e9e6df', 3], ['#7d8590', 3], ['#5a6b4f', 2], ['#8a2f2a', 1.5], ['#c9b79c', 2],
  ['#3b4f6b', 2], ['#6b4e3a', 1.5], ['#b84a39', 1], ['#2f5f5a', 1], ['#d8d2c4', 2], ['#4a3f5c', 1], ['#9fb3c8', 1.5], ['#e7c9a0', 1], ['#111214', 3],
];
const BOTS = [['#1f2b40', 6], ['#2b3a55', 4], ['#121214', 6], ['#5d6067', 3], ['#8c7b5c', 1.6], ['#3e4a3c', 1.2], ['#5a4636', 1.2], ['#6d7d94', 2], ['#3a3d44', 2]];
const srgbToLin = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; }; // THREE.Color parses hex as sRGB -> linear working space
const wpick = (arr, r) => { let tot = 0; for (const a of arr) tot += a[1]; let x = r * tot; for (const a of arr) { x -= a[1]; if (x <= 0) return a[0]; } return arr[0][0]; };
export function randomLook(rand = Math.random, opts = {}) {
  const fem = rand() < 0.5 ? 1 : 0;
  const top = srgbToLin(opts.top || wpick(TOPS, rand())); const bot = srgbToLin(opts.bot || wpick(BOTS, rand()));
  // tint jitter so no two people match
  const j = () => 0.88 + rand() * 0.24; top[0] *= j(); top[1] *= j(); top[2] *= j(); bot[0] *= j(); bot[1] *= j(); bot[2] *= j();
  const skinR = rand(); const skin = skinR < 0.22 ? 0 : skinR < 0.46 ? 1 : skinR < 0.7 ? 2 : skinR < 0.84 ? 3 : skinR < 0.94 ? 4 : 5;
  const hr = rand(); const hairC = hr < 0.42 ? 0 : hr < 0.68 ? 1 : hr < 0.82 ? 2 : hr < 0.9 ? 3 : hr < 0.96 ? 4 : hr < 0.985 ? 5 : 6;
  let hair; const h2 = rand();
  if (fem) hair = h2 < 0.42 ? 2 : h2 < 0.62 ? 3 : h2 < 0.74 ? 4 : h2 < 0.86 ? 1 : h2 < 0.93 ? 5 : 6;
  else hair = h2 < 0.66 ? 1 : h2 < 0.76 ? 0 : h2 < 0.86 ? 6 : h2 < 0.93 ? 5 : 2;
  let flags = 0;
  if (rand() < 0.85) flags |= FLAG.SLEEVE;            // November: mostly long sleeves
  if (rand() < 0.86) flags |= FLAG.PANTS;
  if (fem && !(flags & FLAG.PANTS) && rand() < 0.6) flags |= FLAG.SKIRT;
  if (opts.backpack ?? rand() < 0.55) flags |= FLAG.BACKPACK; else if (rand() < 0.3) flags |= FLAG.BAG;
  const shoe = Math.floor(rand() * 6 * 0.999) === 5 && rand() < 0.6 ? 0 : Math.floor(rand() * 5.999);
  return { fem, top, bot, skin, hairC, hair, flags, shoe, h: (fem ? 0.95 : 1.0) * (0.95 + rand() * 0.1), w: 0.94 + rand() * 0.14 };
}
