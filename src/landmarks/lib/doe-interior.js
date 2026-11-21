// Doe Library interiors: the north entrance vestibule and lobby, the imperial stair under its laylight, the
// North Reading Room (coffered barrel vault with laylight wells, 11 north windows, the clock aedicule, wall-to-wall
// bookcases, oak tables with two-armed bronze lamps) and the Morrison Library (dark oak panelling, strapwork
// ceiling, fireplace, Persian rugs, club chairs). Layout after the UC Berkeley Library floor plans (2026) and photos.
// Geometry is authored in the beaux-kit "frame" (u east, v south, y up; landmark-local metres) and lives in a group
// rotated into landmark-local axes. Lighting is cheap: a baked per-vertex light term (aBake), emissive laylights,
// globes and lamp shades, and additive light-pool decals. No real lights: adding lights would recompile every
// material in the scene. The whole interior is hidden unless the camera is at or inside the building.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as TX from './doe-int-tex.js';
import { pacificParts } from '../../time.js';

// ---------- interior lighting uniforms (shared by every interior material) ----------
export const IU = {
  uInAmb: { value: new THREE.Color(0.25, 0.25, 0.25) },   // how much of the outdoor sky IBL reaches indoor surfaces
  uInSky: { value: new THREE.Color(0.78, 0.75, 0.68) },   // indoor light from above (laylights, windows, ceiling bounce)
  uInGnd: { value: new THREE.Color(0.36, 0.3, 0.24) },    // indoor light from below (warm floor bounce)
  uInSpec: { value: 0.35 },                               // scales sky reflections indoors
};
function patch(mat, key, specK = 1, specTint = [1, 1, 1]) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uInAmb = IU.uInAmb; sh.uniforms.uInSky = IU.uInSky; sh.uniforms.uInGnd = IU.uInGnd; sh.uniforms.uInSpec = IU.uInSpec;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aBake;\nvarying float vBake;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vBake = aBake;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vBake;
uniform vec3 uInAmb; uniform vec3 uInSky; uniform vec3 uInGnd; uniform float uInSpec;
#if defined( TONE_MAPPING )
vec3 doeTone( vec3 color ) { // Khronos PBR Neutral with a much gentler toe (keeps dim warm interiors from going pure red)
  color *= toneMappingExposure;
  float x = min( color.r, min( color.g, color.b ) );
  color -= ( x < 0.08 ? x - 6.25 * x * x : 0.04 ) * 0.3;
  float peak = max( color.r, max( color.g, color.b ) ); const float SC = 0.76;
  if ( peak >= SC ) { float d = 1. - SC; float np = 1. - d * d / ( peak + d - SC ); color *= np / peak; float g = 1. - 1. / ( 0.15 * ( peak - np ) + 1. ); color = mix( color, vec3( np ), g ); }
  return color;
}
#endif`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
 { float bk = vBake;
   vec3 nwI = inverseTransformDirection( normal, viewMatrix );
   vec3 hemiI = mix( uInGnd, uInSky, nwI.y * 0.5 + 0.5 );
   reflectedLight.indirectDiffuse = reflectedLight.indirectDiffuse * uInAmb * bk + hemiI * material.diffuseColor * bk;
   reflectedLight.indirectSpecular *= uInSpec * ${specK.toFixed(2)} * min(bk, 1.0) * vec3(${specTint.map((v) => v.toFixed(2)).join(', ')});
   reflectedLight.directDiffuse *= mix(1.0, min(bk, 1.0), 0.3); }`)
      // interiors are dim: the global grade's contrast step (c-0.5)*1.05+0.5 crushes dark linear values to 0 and turns
      // warm darks pure red, so interior surfaces use the same neutral curve and saturation without that toe crush
      .replace('#include <tonemapping_fragment>', `#if defined( TONE_MAPPING )
 { vec3 cI = doeTone( gl_FragColor.rgb ); float lI = dot( cI, vec3( 0.2126, 0.7152, 0.0722 ) );
   cI = mix( vec3( lI ), cI, 1.04 ); cI = mix( cI, ( cI - 0.5 ) * 1.05 + 0.5, smoothstep( 0.18, 0.5, lI ) ); gl_FragColor.rgb = clamp( cI, 0.0, 1.0 ); }
#endif`);
  };
  mat.customProgramCacheKey = () => 'doeInt:' + key;
  return mat;
}
let MATS = null;
function mats() {
  if (MATS) return MATS;
  const S = (key, o, texM = 1, t = null, specK = 1, specTint) => { const m = new THREE.MeshStandardMaterial(o); if (t) { m.map = t.map || t; if (t.normalMap) { m.normalMap = t.normalMap; m.normalScale = new THREE.Vector2(0.5, 0.5); } } m.userData.texM = texM; m.name = 'doeInt_' + key; return patch(m, key, specK, specTint); };
  const B = (key, o) => { const m = new THREE.MeshBasicMaterial(o); m.name = 'doeInt_' + key; return m; };
  const marble = TX.marbleTex(5), marbleG = TX.marbleTex(8, [176, 172, 164]), marbleW = TX.marbleTex(13, [242, 240, 234]);
  MATS = {
    plaster: S('plaster', { color: 0xcabfa6, roughness: 0.92 }),
    plasterLt: S('plasterLt', { color: 0xe6dcc6, roughness: 0.9 }),
    trim: S('trim', { color: 0x8c7a60, roughness: 0.8 }),
    vault: S('vault', { color: 0xffffff, roughness: 0.92 }, 1, TX.cofferTex2()),
    frieze: S('frieze', { color: 0x5e4a3a, roughness: 0.7 }),
    fret: S('fret', { color: 0xffffff, roughness: 0.85 }, 1, TX.fretTex()),
    painting: S('painting', { color: 0xffffff, roughness: 0.7 }, 1, TX.paintingTex(1)),
    lobbyCeil: S('lobbyCeil', { color: 0xf2ece0, roughness: 0.92 }, 1.6, TX.cofferTex()),
    lino: S('lino', { color: 0xa89482, roughness: 0.1 }, 3, TX.linoTex(), 1.6, [1.0, 0.82, 0.62]),
    inlay: S('inlay', { color: 0x9a8a72, roughness: 0.25 }),
    darkOak: S('darkOak', { color: 0xb09078, roughness: 0.55 }, 1.2, TX.oakTex()),
    oakFloor: S('oakFloor', { color: 0xc8a47c, roughness: 0.38 }, 1.0, TX.oakTex()),
    books: S('books', { color: 0xffffff, roughness: 0.85 }, 1),
    oak: S('oak', { color: 0xa89888, roughness: 0.48 }, 1.4, TX.oakTex()),
    bronze: S('bronze', { color: 0x5a4632, roughness: 0.42, metalness: 0.4 }),
    shade: S('shade', { color: 0x4a3c2a, roughness: 0.4, metalness: 0.4 }),
    brass: S('brass', { color: 0xb08a40, roughness: 0.35, metalness: 0.55 }),
    leather: S('leather', { color: 0x4a3a2c, roughness: 0.6 }),
    marble: S('marble', { color: 0xffffff, roughness: 0.25 }, 2.2, marble, 1.6, [1.0, 0.9, 0.8]),
    marbleG: S('marbleG', { color: 0xffffff, roughness: 0.3 }, 2.0, marbleG, 1.4, [1.0, 0.9, 0.8]),
    marbleW: S('marbleW', { color: 0xffffff, roughness: 0.4 }, 2.0, marbleW),
    verde: S('verde', { color: 0x2f3a33, roughness: 0.25 }),
    granite: S('granite', { color: 0x222222, roughness: 0.2 }),
    panel: S('panel', { color: 0xffffff, roughness: 0.55 }, 1.8, TX.panelTex()),
    strap: S('strap', { color: 0xd8ccb8, roughness: 0.9 }, 2.4, TX.strapTex()),
    rug0: S('rug0', { color: 0xffffff, roughness: 1 }, 1, TX.rugTex(0)),
    rug1: S('rug1', { color: 0xffffff, roughness: 1 }, 1, TX.rugTex(1)),
    uph: S('uph', { color: 0xffffff, roughness: 0.75 }),
    gilt: S('gilt', { color: 0xc49a48, roughness: 0.35, metalness: 0.55 }),
    canvas: S('canvas', { color: 0x5b4a32, roughness: 0.8 }),
    soot: S('soot', { color: 0x121010, roughness: 1 }),
    glow: B('glow', { color: new THREE.Color(2.4, 1.85, 1.15) }),
    globe: B('globe', { color: new THREE.Color(1.25, 1.15, 0.95) }),
    frosted: B('frosted', { color: new THREE.Color(0.8, 0.8, 0.76) }),
    doorLight: B('doorLight', { color: new THREE.Color(0.7, 0.6, 0.45) }),
    shadeGlow: B('shadeGlow', { color: new THREE.Color(1.7, 1.35, 0.95), side: THREE.DoubleSide }),
    laylight: B('laylight', { color: new THREE.Color(1.0, 0.9, 0.72), map: TX.laylightTex() }),
    globes: B('globes', { map: TX.globesTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }),
    pool2: B('pool2', { map: TX.poolTex(), color: new THREE.Color(0.2, 0.16, 0.11), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    pool: B('pool', { map: TX.poolTex(), color: new THREE.Color(0.3, 0.24, 0.16), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    ember: B('ember', { color: new THREE.Color(2.2, 0.9, 0.3) }),
    blob: B('blob', { map: TX.poolTex(), color: new THREE.Color(0.38, 0.38, 0.38), transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcColorFactor }),
    streak: B('streak', { map: TX.streakTex(), color: new THREE.Color(0.22, 0.23, 0.23), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    sheen: B('sheen', { color: new THREE.Color(0.2, 0.21, 0.21), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
  MATS.books.map = TX.booksTex();
  return MATS;
}

// ---------- geometry builder (frame coords; buckets merged per material) ----------
function boxUVm(g, texM, off = 0) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v; if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = n.getX(i) > 0 ? -z : z; v = y; } else { u = n.getZ(i) > 0 ? x : -x; v = y; }
    uv[i * 2] = (u + off) / texM; uv[i * 2 + 1] = v / texM;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
class Bld {
  constructor() { this.b = new Map(); this.zone = 1; }
  add(mat, g, o = {}) {
    g = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.clearGroups(); if (!g.attributes.normal) g.computeVertexNormals();
    if (o.uv !== 'keep' || !g.attributes.uv) boxUVm(g, mat.userData.texM || 1, o.uvOff || 0);
    const p = g.attributes.position, nr = g.attributes.normal, cnt = p.count, bk = new Float32Array(cnt);
    const f = o.bake !== undefined ? o.bake : this.zone;
    for (let i = 0; i < cnt; i++) bk[i] = typeof f === 'number' ? f : f(p.getX(i), p.getY(i), p.getZ(i), nr.getX(i), nr.getY(i), nr.getZ(i));
    g.setAttribute('aBake', new THREE.BufferAttribute(bk, 1));
    const key = mat.uuid + (o.cast ? ':c' : '') + (o.detail ? ':d' : '');
    if (!this.b.has(key)) this.b.set(key, { mat, cast: !!o.cast, detail: !!o.detail, list: [] });
    this.b.get(key).list.push(g); return g;
  }
  box(mat, u0, u1, y0, y1, v0, v1, o) {
    if (u0 > u1) [u0, u1] = [u1, u0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (v0 > v1) [v0, v1] = [v1, v0];
    if (u1 - u0 < 1e-3 || y1 - y0 < 1e-3 || v1 - v0 < 1e-3) return;
    return this.add(mat, new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0).translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2), o);
  }
  // subdivided parallelogram o + s*a + t*b, facing a x b
  grid(mat, o, a, b, na, nb, opt) {
    const P = [], push = (s, t) => P.push(o[0] + a[0] * s + b[0] * t, o[1] + a[1] * s + b[1] * t, o[2] + a[2] * s + b[2] * t);
    for (let j = 0; j < nb; j++) for (let i = 0; i < na; i++) { const s0 = i / na, s1 = (i + 1) / na, t0 = j / nb, t1 = (j + 1) / nb; push(s0, t0); push(s1, t0); push(s1, t1); push(s0, t0); push(s1, t1); push(s0, t1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
    return this.add(mat, g, opt);
  }
  floor(mat, u0, u1, v0, v1, y, step = 1.2, opt) { return this.grid(mat, [u0, y, v0], [0, 0, v1 - v0], [u1 - u0, 0, 0], Math.max(1, Math.round((v1 - v0) / step)), Math.max(1, Math.round((u1 - u0) / step)), opt); }
  ceil(mat, u0, u1, v0, v1, y, step = 1.2, opt) { return this.grid(mat, [u0, y, v0], [u1 - u0, 0, 0], [0, 0, v1 - v0], Math.max(1, Math.round((u1 - u0) / step)), Math.max(1, Math.round((v1 - v0) / step)), opt); }
  // wall in the u-y plane at v; faceS: normal +v (faces south)
  wallU(mat, u0, u1, y0, y1, v, faceS, step = 1.5, opt) { const nu = Math.max(1, Math.round((u1 - u0) / step)), ny = Math.max(1, Math.round((y1 - y0) / step)); return faceS ? this.grid(mat, [u0, y0, v], [u1 - u0, 0, 0], [0, y1 - y0, 0], nu, ny, opt) : this.grid(mat, [u0, y0, v], [0, y1 - y0, 0], [u1 - u0, 0, 0], ny, nu, opt); }
  // wall in the v-y plane at u; faceE: normal +u
  wallV(mat, v0, v1, y0, y1, u, faceE, step = 1.5, opt) { const nv = Math.max(1, Math.round((v1 - v0) / step)), ny = Math.max(1, Math.round((y1 - y0) / step)); return faceE ? this.grid(mat, [u, y0, v0], [0, y1 - y0, 0], [0, 0, v1 - v0], ny, nv, opt) : this.grid(mat, [u, y0, v0], [0, 0, v1 - v0], [0, y1 - y0, 0], nv, ny, opt); }
  finish(group) {
    const det = new THREE.Group(); det.userData.detail = true; det.name = 'doeInteriorDetail';
    for (const { mat, cast, detail, list } of this.b.values()) {
      const g = mergeGeometries(list, false); g.computeBoundingBox(); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.castShadow = cast || (!detail && !mat.isMeshBasicMaterial); m.receiveShadow = true; (detail ? det : group).add(m);
    }
    if (det.children.length) group.add(det);
  }
}
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- furniture prototypes (local coords: x across, z along, y up from the floor) ----------
function geomOf(parts) { const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false); return g; }
function bx(w, h, d, x, y, z) { return new THREE.BoxGeometry(w, h, d).translate(x, y, z); }
function bakeAttr(g, f) { const p = g.attributes.position, a = new Float32Array(p.count); for (let i = 0; i < p.count; i++) a[i] = f(p.getX(i), p.getY(i), p.getZ(i)); g.setAttribute('aBake', new THREE.BufferAttribute(a, 1)); return g; }
function uvs(g, texM = 1) { if (!g.attributes.normal) g.computeVertexNormals(); boxUVm(g, texM); return g; }
function protoTable(L = 4.6, W = 1.2) {
  const P = [bx(W, 0.06, L, 0, 0.73, 0), bx(W - 0.2, 0.12, L - 0.3, 0, 0.64, 0), bx(0.07, 0.07, L - 0.5, 0, 0.16, 0)];

  for (const z of [-L / 2 + 0.25, 0, L / 2 - 0.25]) for (const x of [-W / 2 + 0.12, W / 2 - 0.12]) P.push(bx(0.1, 0.58, 0.1, x, 0.29, z));
  for (const z of [-L / 2 + 0.25, L / 2 - 0.25]) P.push(bx(W - 0.3, 0.07, 0.07, 0, 0.16, z));
  return bakeAttr(uvs(geomOf(P), 1.4), (x, y) => 0.55 + 0.45 * sstep(0.1, 0.75, y));
}
function protoChair() {
  const P = [bx(0.46, 0.05, 0.46, 0, 0.455, 0)];
  for (const x of [-0.2, 0.2]) for (const z of [-0.2, 0.2]) P.push(bx(0.045, 0.43, 0.045, x, 0.215, z));
  for (const z of [-0.205, 0.205]) P.push(bx(0.05, 0.42, 0.05, -0.21, 0.69, z));                       // back posts
  for (let k = -1; k <= 1; k++) { const a = k * 0.42; P.push(new THREE.BoxGeometry(0.05, 0.13, 0.19).rotateY(a).translate(-0.22 - Math.abs(k) * 0.035, 0.82, k * 0.15)); } // curved crest rail
  for (const z of [-0.245, 0.245]) P.push(bx(0.4, 0.035, 0.05, -0.02, 0.665, z)); // arms
  return bakeAttr(uvs(geomOf(P), 1.4), (x, y) => 0.5 + 0.5 * sstep(0.0, 0.7, y));
}
function protoLamp() { // two-armed bronze reading lamp; arms along x; origin at table top
  const P = [new THREE.CylinderGeometry(0.1, 0.105, 0.045, 8).translate(0, 0.0225, 0), new THREE.CylinderGeometry(0.07, 0.08, 0.05, 6, 1, true).translate(0, 0.07, 0),
    bx(0.055, 0.36, 0.055, 0, 0.275, 0), new THREE.CylinderGeometry(0.07, 0.04, 0.07, 6, 1, true).translate(0, 0.49, 0), bx(0.68, 0.028, 0.028, 0, 0.535, 0),
    new THREE.SphereGeometry(0.035, 6, 4).translate(0, 0.6, 0)];
  const prof = [[0.012, 0.53], [0.08, 0.51], [0.122, 0.45], [0.142, 0.39], [0.13, 0.39]].map(([r, y]) => new THREE.Vector2(r, y));
  for (const x of [-0.33, 0.33]) P.push(new THREE.LatheGeometry(prof, 8).translate(x, 0, 0));
  return bakeAttr(uvs(geomOf(P)), () => 1);
}
function protoLampGlow() { const P = []; for (const x of [-0.33, 0.33]) P.push(new THREE.CircleGeometry(0.128, 14).rotateX(Math.PI / 2).translate(x, 0.392, 0)); return geomOf(P); }
function protoClubChair() { // rolled-arm club chair facing +x
  const P = [bx(0.78, 0.36, 0.82, 0, 0.26, 0), bx(0.2, 0.5, 0.82, -0.29, 0.62, 0)];
  for (const z of [-0.36, 0.36]) { P.push(bx(0.78, 0.24, 0.16, 0, 0.56, z)); P.push(new THREE.CylinderGeometry(0.09, 0.09, 0.78, 10).rotateZ(Math.PI / 2).translate(0, 0.68, z)); }
  P.push(bx(0.5, 0.12, 0.56, 0.06, 0.49, 0));
  for (const x of [-0.32, 0.32]) for (const z of [-0.34, 0.34]) P.push(bx(0.05, 0.08, 0.05, x, 0.04, z));
  return bakeAttr(uvs(geomOf(P)), (x, y) => 0.55 + 0.45 * sstep(0.0, 0.8, y));
}
function protoSofa() { const P = [bx(0.9, 0.38, 2.2, 0, 0.27, 0), bx(0.22, 0.5, 2.2, -0.34, 0.66, 0)]; for (const z of [-1.0, 1.0]) P.push(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10).rotateZ(Math.PI / 2).translate(0, 0.62, z), bx(0.9, 0.3, 0.2, 0, 0.5, z)); return bakeAttr(uvs(geomOf(P)), (x, y) => 0.55 + 0.45 * sstep(0, 0.8, y)); }
function protoFloorLamp() { const P = [new THREE.CylinderGeometry(0.16, 0.18, 0.04, 10).translate(0, 0.02, 0), new THREE.CylinderGeometry(0.015, 0.015, 1.45, 6).translate(0, 0.75, 0)]; return bakeAttr(uvs(geomOf(P)), () => 1); }
function protoShade(h = 0.32, r0 = 0.16, r1 = 0.26, y = 1.38) { return new THREE.CylinderGeometry(r0, r1, h, 8, 1, true).translate(0, y, 0); }

function inst(geom, mat, mats4, opt = {}) {
  const m = new THREE.InstancedMesh(geom, mat, mats4.length);
  mats4.forEach((M, i) => m.setMatrixAt(i, M)); m.instanceMatrix.needsUpdate = true;
  if (opt.colors) { opt.colors.forEach((c, i) => m.setColorAt(i, c)); m.instanceColor.needsUpdate = true; }
  m.castShadow = false; m.receiveShadow = true; m.computeBoundingSphere(); m.computeBoundingBox && m.computeBoundingBox();
  return m;
}
const TRS = (x, y, z, ry = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(s, s, s));

// flat coffered ceiling (recessed coffers, real relief) over u0..u1 x v0..v1 at height y, facing down
function cofferCeiling(B, mat, u0, u1, v0, v1, y, pitch = 1.2, dep = 0.16, opt) {
  const nu = Math.max(1, Math.round((u1 - u0) / pitch)), nv = Math.max(1, Math.round((v1 - v0) / pitch)), du = (u1 - u0) / nu, dv = (v1 - v0) / nv, pos = [], uv = [];
  const quad = (a, b, c, d, ta, tb, tc, td, up) => { const n = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a))); if ((n.y < 0) === up) { pos.push(...a, ...b, ...c, ...a, ...c, ...d); uv.push(...ta, ...tb, ...tc, ...ta, ...tc, ...td); } else { pos.push(...a, ...c, ...b, ...a, ...d, ...c); uv.push(...ta, ...tc, ...tb, ...ta, ...td, ...tc); } };
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a0 = u0 + i * du, b0 = v0 + j * dv, ring = (e, h) => [[a0 + e * du, h, b0 + e * dv], [a0 + (1 - e) * du, h, b0 + e * dv], [a0 + (1 - e) * du, h, b0 + (1 - e) * dv], [a0 + e * du, h, b0 + (1 - e) * dv]], tr = (e) => [[e, e], [1 - e, e], [1 - e, 1 - e], [e, 1 - e]];
    const O = ring(0, y), Mr = ring(0.17, y), Bt = ring(0.3, y + dep), TO = tr(0), TM = tr(0.17), TB = tr(0.3);
    for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4; quad(O[k], O[k1], Mr[k1], Mr[k], TO[k], TO[k1], TM[k1], TM[k], true); }
    const cx = a0 + du / 2, cz = b0 + dv / 2;
    for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4, A = Mr[k], Bq = Mr[k1], C = Bt[k1], D = Bt[k]; const n = new THREE.Vector3().subVectors(new THREE.Vector3(...Bq), new THREE.Vector3(...A)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...C), new THREE.Vector3(...A))); const toC = new THREE.Vector3(cx - (A[0] + Bq[0]) / 2, -0.3, cz - (A[2] + Bq[2]) / 2); if (n.dot(toC) >= 0) { pos.push(...A, ...Bq, ...C, ...A, ...C, ...D); uv.push(...TM[k], ...TM[k1], ...TB[k1], ...TM[k], ...TB[k1], ...TB[k]); } else { pos.push(...A, ...C, ...Bq, ...A, ...D, ...C); uv.push(...TM[k], ...TB[k1], ...TM[k1], ...TM[k], ...TB[k], ...TB[k1]); } }
    quad(Bt[0], Bt[1], Bt[2], Bt[3], TB[0], TB[1], TB[2], TB[3], true);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  B.add(mat, g, { uv: 'keep', ...opt });
}
// =====================================================================================================
// P: { F1, F2, wins: [[uA,uB],...] (north reading-room windows, frame u), cs (portal axis u), endWin: {vc, hw, y0, ys} }
export function buildDoeInterior(P) {
  const Mt = mats(), B = new Bld(), group = new THREE.Group(); group.name = 'doeInterior';
  const colliders = [], walkables = [], segs = (pts, y0, y1) => colliders.push({ pts, y0, y1 });
  const extra = []; // instanced meshes etc. (frame coords)
  const { F1, F2, cs } = P;
  // ---------------- North Reading Room ----------------
  const U0 = -50.7, U1 = 16.7, vN = -41.4, vS = -23.6, vc = (vN + vS) / 2, half = (vS - vN) / 2;
  const yWs = 9.7, yWh = 15.4, yA = 15.62, yFr = 15.92, yCo = 16.5, ySp = 16.95, yCr = 22.65;
  const rise = yCr - ySp, R = (half * half + rise * rise) / (2 * rise), yc0 = yCr - R, TH = Math.asin(half / R);
  const BK = 0.42, BKH = 2.05; // bookcase depth / height
  const doorU0 = cs - 1.1, doorU1 = cs + 1.1, doorH = 3.0;
  // table layout (perpendicular to the room axis, two banks either side of the central aisle)
  const tables = [];
  for (let i = -11; i <= 11; i++) { const u = cs + i * 3.05; if (u < U0 + 2.2 || u > U1 - 2.2) continue; tables.push([u, vc - 1.1 - 2.3]); if (i !== 0) tables.push([u, vc + 1.1 + 2.3]); }
  const TL = 4.6, TW = 1.2;
  const underTable = (u, v) => { let a = 1; for (const [tu, tv] of tables) { const du = Math.max(0, Math.abs(u - tu) - TW / 2), dv = Math.max(0, Math.abs(v - tv) - TL / 2); const d = Math.hypot(du, dv); if (d < 1.0) a = Math.min(a, 0.45 + 0.55 * sstep(0, 1.0, d)); } return a; };
  const wells = [-37.0, cs, 2.9], EWd = P.endWin;
  const nrrBake = (u, y, v, nu, ny, nv) => {
    const dW = Math.min(v - vN, vS - v, u - U0, U1 - u);
    if (ny > 0.6 && y < F2 + 0.05) return (1 - 0.45 * Math.exp(-Math.max(0, dW - BK) / 1.0)) * underTable(u, v) * (1.0 + 0.15 * sstep(4, 0, Math.abs(v - vc)));
    if (y > ySp + 0.05) { // vault: dim, brighter near the laylight wells and the crown
      let w = 0; for (const c of wells) w = Math.max(w, Math.exp(-Math.pow(Math.max(0, Math.abs(u - c) - 6.5) / 4, 2)));
      const crown = sstep(ySp, yCr, y); const ends = 1 - 0.35 * Math.exp(-Math.min(u - U0, U1 - u) / 2.5);
      const rr = Math.hypot(y - yc0, v - vc), rec = rr > R + 0.03 ? 0.72 : rr > R + 0.005 ? 0.85 : 1;
      return (0.85 + 0.25 * crown + 0.35 * w * crown) * ends * (0.78 + 0.22 * sstep(vN, vS, v)) * rec;
    }
    let k = 1.05 - 0.4 * Math.exp(-(y - F2) / 1.2) - 0.18 * Math.exp(-(ySp - y) / 0.6);
    if (nv > 0.6) k *= 0.82;              // north (window) wall: back-lit
    if (nv < -0.6) k *= 1.08;             // south wall faces the windows
    k *= 1 - 0.25 * Math.exp(-Math.min(u - U0, U1 - u) / 1.5);
    return k;
  };
  B.zone = nrrBake;
  B.floor(Mt.lino, U0, U1, vN, vS, F2, 1.2);
  B.box(Mt.plaster, U0 - 0.5, U1 + 0.5, F2 - 0.43, F2 - 0.012, -42.0, vS + 0.6, { cast: true, bake: 0.8 }); // floor slab (blocks sun to the floor below)
  // inlaid border stripes and aisle lines
  // north wall lining: piers, spandrels, heads, reveals (windows from the exterior façade)
  const wins = P.wins.slice().sort((a, b) => a[0] - b[0]);
  let cur = U0; const piers = [];
  for (const [a, b] of wins) {
    piers.push([cur, a]); cur = b;
    B.box(Mt.plaster, a, b, F2, yWs - 0.06, vN, vN + 0.05); B.box(Mt.plaster, a, b, yWh, yA, vN, vN + 0.05);
    B.box(Mt.plasterLt, a, a + 0.03, yWs, yWh, -41.76, vN + 0.05); B.box(Mt.plasterLt, b - 0.03, b, yWs, yWh, -41.76, vN + 0.05);
    B.box(Mt.plasterLt, a, b, yWh - 0.03, yWh, -41.76, vN + 0.05); B.box(Mt.marbleW, a - 0.05, b + 0.05, yWs - 0.07, yWs, -41.76, vN + 0.16);
  }
  piers.push([cur, U1]);
  for (const [a, b] of piers) {
    B.wallU(Mt.plaster, a, b, F2, yA, vN + 0.05, true, 1.6);
    if (b - a > 1.0 && a > U0 + 0.5 && b < U1 - 0.5) { // tall narrow recessed panel with a dark border and a rosette
      const c = (a + b) / 2, w = Math.min(0.62, (b - a) * 0.4), d = { detail: true };
      B.box(Mt.trim, c - w / 2 - 0.05, c - w / 2, yWs + 0.2, yWh - 0.3, vN + 0.05, vN + 0.09, d); B.box(Mt.trim, c + w / 2, c + w / 2 + 0.05, yWs + 0.2, yWh - 0.3, vN + 0.05, vN + 0.09, d);
      B.box(Mt.trim, c - w / 2, c + w / 2, yWs + 0.2, yWs + 0.25, vN + 0.05, vN + 0.09, d); B.box(Mt.trim, c - w / 2, c + w / 2, yWh - 0.35, yWh - 0.3, vN + 0.05, vN + 0.09, d);
      B.add(Mt.trim, new THREE.CylinderGeometry(0.17, 0.17, 0.05, 14).rotateX(Math.PI / 2).translate(c, yWh - 0.75, vN + 0.08), d);
    }
  }
  // south wall (blind): same bay rhythm with framed blind panels, doorway with the clock aedicule
  for (const [a, b, y0] of [[U0, doorU0, F2 - 0.4], [doorU1, U1, F2 - 0.4], [doorU0, doorU1, F2 + doorH]]) B.box(Mt.plaster, a, b, y0, ySp, vS, vS + 0.6, { bake: 0.9, cast: true });
  B.wallU(Mt.plaster, U0, doorU0, F2, ySp, vS - 0.01, false, 1.6); B.wallU(Mt.plaster, doorU1, U1, F2, ySp, vS - 0.01, false, 1.6); B.wallU(Mt.plaster, doorU0, doorU1, F2 + doorH, ySp, vS - 0.01, false, 1.6);
  for (const [a, b] of wins) {
    if (b > doorU0 - 0.6 && a < doorU1 + 0.6) continue;
    const d = { detail: true }, t0 = vS - 0.05, t1 = vS - 0.01, c = (a + b) / 2, w = 0.4;
    B.box(Mt.trim, c - w / 2 - 0.06, c - w / 2, yWs, yWh, t0, t1, d); B.box(Mt.trim, c + w / 2, c + w / 2 + 0.06, yWs, yWh, t0, t1, d); B.box(Mt.trim, c - w / 2, c + w / 2, yWs, yWs + 0.06, t0, t1, d); B.box(Mt.trim, c - w / 2, c + w / 2, yWh - 0.06, yWh, t0, t1, d);

  }
  for (const [a, b] of piers) if (b - a > 1.0 && a > U0 + 0.5 && b < U1 - 0.5 && !(b > doorU0 - 1 && a < doorU1 + 1)) {
    const c = (a + b) / 2, w = Math.min(0.62, (b - a) * 0.4), d = { detail: true }, t0 = vS - 0.05, t1 = vS - 0.01;
    B.box(Mt.trim, c - w / 2 - 0.05, c - w / 2, yWs + 0.2, yWh - 0.3, t0, t1, d); B.box(Mt.trim, c + w / 2, c + w / 2 + 0.05, yWs + 0.2, yWh - 0.3, t0, t1, d);
    B.box(Mt.trim, c - w / 2, c + w / 2, yWs + 0.2, yWs + 0.25, t0, t1, d); B.box(Mt.trim, c - w / 2, c + w / 2, yWh - 0.35, yWh - 0.3, t0, t1, d);
  }
  // entablature around the room (architrave, dark frieze, dentilled cornice) on the long walls
  const entab = (u0, u1, v, s) => { // s = +1 wall faces south (north wall), -1 faces north
    const f = (t) => v + s * t;
    B.box(Mt.plasterLt, u0, u1, yA, yA + 0.14, f(0), f(0.1)); B.box(Mt.plasterLt, u0, u1, yA + 0.14, yFr, f(0), f(0.14)); B.box(Mt.frieze, u0, u1, yFr, yCo, f(0), f(0.1));
    B.box(Mt.plasterLt, u0, u1, yCo, yCo + 0.1, f(0), f(0.24)); B.box(Mt.plasterLt, u0, u1, yCo + 0.22, ySp - 0.14, f(0), f(0.62)); B.box(Mt.plasterLt, u0, u1, ySp - 0.14, ySp, f(0), f(0.85));
    B.box(Mt.frieze, u0, u1, yCo + 0.1, yCo + 0.22, f(0), f(0.3));
    for (let u = u0 + 0.15; u < u1 - 0.1; u += 0.3) B.box(Mt.plasterLt, u - 0.07, u + 0.07, yCo + 0.1, yCo + 0.22, f(0.24), f(0.36), { detail: true });

  };
  entab(U0, U1, vN + 0.05, 1); entab(U0, U1, vS - 0.01, -1);
  // end walls: plaster lunette plates with the great arched window, framed rosette panels, entablature returns
  const EW = P.endWin; // {vc, hw, y0, ys}  (arched window: centre v, half width, sill, arch springing)
  const endPlate = (u, east) => {
    const sh = new THREE.Shape(); const sg = east ? 1 : -1; // shape x = sg*v
    const X = (v) => sg * v;
    sh.moveTo(X(vN), F2); sh.lineTo(X(vS), F2); sh.lineTo(X(vS), ySp);
    for (let i = 1; i < 32; i++) { const th = TH - (i / 32) * 2 * TH; sh.lineTo(X(vc + R * Math.sin(th)), yc0 + R * Math.cos(th)); }
    sh.lineTo(X(vN), ySp); sh.lineTo(X(vN), F2);
    const hole = new THREE.Path(); hole.moveTo(X(EW.vc - EW.hw), EW.y0); hole.lineTo(X(EW.vc + EW.hw), EW.y0); hole.lineTo(X(EW.vc + EW.hw), EW.ys);
    for (let i = 1; i < 24; i++) { const a = (i / 24) * Math.PI; hole.lineTo(X(EW.vc + EW.hw * Math.cos(a)), EW.ys + EW.hw * Math.sin(a)); }
    hole.lineTo(X(EW.vc - EW.hw), EW.y0); sh.holes.push(hole);
    const g = new THREE.ShapeGeometry(sh, 4); g.rotateY(east ? -Math.PI / 2 : Math.PI / 2); g.translate(u, 0, 0);
    B.add(Mt.plaster, g, { bake: (x, y) => 0.7 + 0.2 * sstep(F2, ySp, y) });
    // arch reveal lining (towards the glass)
    const sgn = east ? 1 : -1, t0 = u, t1 = u + sgn * 0.32;
    B.box(Mt.plasterLt, Math.min(t0, t1), Math.max(t0, t1), EW.y0, EW.ys, EW.vc - EW.hw, EW.vc - EW.hw + 0.03, { bake: 0.85 });
    B.box(Mt.plasterLt, Math.min(t0, t1), Math.max(t0, t1), EW.y0, EW.ys, EW.vc + EW.hw - 0.03, EW.vc + EW.hw, { bake: 0.85 });
    for (let i = 0; i < 24; i++) { const a0 = (i / 24) * Math.PI, a1 = ((i + 1) / 24) * Math.PI; const ga = new THREE.Shape(); ga.absarc(0, 0, EW.hw, a0, a1, false); ga.absarc(0, 0, EW.hw - 0.03, a1, a0, true); const gg = new THREE.ExtrudeGeometry(ga, { depth: 0.32, bevelEnabled: false, curveSegments: 2 }); gg.rotateY(east ? Math.PI / 2 : -Math.PI / 2); gg.translate(u + (east ? 0 : 0), EW.ys, EW.vc); B.add(Mt.plasterLt, gg, { bake: 0.85 }); }
    // framed panels with rosette borders flanking the window
    const inward = east ? -1 : 1, d = { detail: true };
    for (const [pa, pb] of [[vN + 1.6, EW.vc - EW.hw - 1.2], [EW.vc + EW.hw + 1.2, vS - 1.6]]) {
      if (pb - pa < 1.5) continue;
      const y0 = F2 + 4.3, y1 = F2 + 8.6, t = u + inward * 0.05;
      for (const [v0, v1, z0, z1] of [[pa, pb, y0, y0 + 0.16], [pa, pb, y1 - 0.16, y1], [pa, pa + 0.16, y0, y1], [pb - 0.16, pb, y0, y1]]) B.box(Mt.trim, Math.min(u, t), Math.max(u, t), z0, z1, v0, v1, d);
      for (let v = pa + 0.4; v < pb - 0.2; v += 0.5) for (const yy of [y0 + 0.3, y1 - 0.3]) B.add(Mt.trim, new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10).rotateZ(Math.PI / 2).translate(u + inward * 0.03, yy, v), d);
    }
    // entablature returns, broken by the arched window
    for (const [va, vb] of [[vN, EW.vc - EW.hw - 0.25], [EW.vc + EW.hw + 0.25, vS]]) {
      const lo = Math.min(u, u + inward * 0.42);
      B.box(Mt.plasterLt, Math.min(u, u + inward * 0.14), Math.max(u, u + inward * 0.14), yA, yFr, va, vb); B.box(Mt.frieze, Math.min(u, u + inward * 0.1), Math.max(u, u + inward * 0.1), yFr, yCo, va, vb);
      const lo2 = Math.min(u, u + inward * 0.62); B.box(Mt.plasterLt, lo2, lo2 + 0.62, yCo + 0.1, ySp, va, vb);
    }
  };
  endPlate(U0 + 0.01, false); endPlate(U1 - 0.01, true);
  // ---- coffered barrel vault with three laylight wells ----
  const nA = 24, nL = 71, du = (U1 - U0) / nL, dth = (2 * TH) / nA;
  const P3 = (th, u) => [u, yc0 + R * Math.cos(th), vc + R * Math.sin(th)];
  const wellJ = wells.map((c) => { const j0 = Math.round((c - U0) / du - 7); return [j0, j0 + 14]; });
  const inWell = (i, j) => i >= 9 && i < 15 && wellJ.some(([a, b]) => j >= a && j < b);
  { // each coffer: flat rib ring, sloped stepped sides, recessed field (0.11 m deep) with the rosette (texture)
    const pos = [], uv = [], e1 = 0.17, e2 = 0.3, dep = 0.2;
    const PR = (th, u, rr) => [u, yc0 + rr * Math.cos(th), vc + rr * Math.sin(th)];
    const quad = (a, b, c, d, ta, tb, tc, td, ref) => { // a..d corners, t* uvs; orient so the normal faces ref
      const n = new THREE.Vector3().subVectors(new THREE.Vector3(...d), new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a)));
      if (n.dot(ref) >= 0) { pos.push(...a, ...d, ...c, ...a, ...c, ...b); uv.push(...ta, ...td, ...tc, ...ta, ...tc, ...tb); }
      else { pos.push(...a, ...c, ...d, ...a, ...b, ...c); uv.push(...ta, ...tc, ...td, ...ta, ...tb, ...tc); }
    };
    for (let j = 0; j < nL; j++) for (let i = 0; i < nA; i++) {
      if (inWell(i, j)) continue;
      const t0 = -TH + i * dth, u0 = U0 + j * du, thm = t0 + dth / 2, um = u0 + du / 2;
      const inward = new THREE.Vector3(0, -Math.cos(thm), -Math.sin(thm));
      const ring = (e, rr) => [PR(t0 + e * dth, u0 + e * du, rr), PR(t0 + (1 - e) * dth, u0 + e * du, rr), PR(t0 + (1 - e) * dth, u0 + (1 - e) * du, rr), PR(t0 + e * dth, u0 + (1 - e) * du, rr)];
      const tr = (e) => [[e, e], [1 - e, e], [1 - e, 1 - e], [e, 1 - e]];
      const O = ring(0, R), Mr = ring(e1, R), Bt = ring(e2, R + dep), TO = tr(0), TM = tr(e1), TB = tr(e2);
      for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4; quad(O[k], O[k1], Mr[k1], Mr[k], TO[k], TO[k1], TM[k1], TM[k], inward); }
      const cen = new THREE.Vector3(...PR(thm, um, R + dep));
      for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4; const fc = new THREE.Vector3(...Mr[k]).add(new THREE.Vector3(...Mr[k1])).multiplyScalar(0.5); const ref = cen.clone().sub(fc).normalize().add(inward.clone().multiplyScalar(0.3)); quad(Mr[k], Mr[k1], Bt[k1], Bt[k], TM[k], TM[k1], TB[k1], TB[k], ref); }
      quad(Bt[0], Bt[1], Bt[2], Bt[3], TB[0], TB[1], TB[2], TB[3], inward);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    B.add(Mt.vault, g, { uv: 'keep' });
  }
  const yL = yCr + 0.15; // laylight plane (kept under the roof)
  const globeM = [];
  for (const [j0, j1] of wellJ) {
    const ua = U0 + j0 * du, ub = U0 + j1 * du, tha = -TH + 9 * dth, thb = -TH + 15 * dth;
    const pa = P3(tha, 0), pb = P3(thb, 0);
    B.wallU(Mt.fret, ua, ub, pa[1], yL, pa[2], true, 1.2, { bake: 0.9 }); B.wallU(Mt.fret, ua, ub, pb[1], yL, pb[2], false, 1.2, { bake: 0.9 });
    for (let i = 9; i < 15; i++) { // well end faces following the vault arc
      const q0 = P3(-TH + i * dth, 0), q1 = P3(-TH + (i + 1) * dth, 0);
      for (const [u, e] of [[ua, true], [ub, false]]) {
        const pts = e ? [[u, q0[1], q0[2]], [u, yL, q0[2]], [u, yL, q1[2]], [u, q0[1], q0[2]], [u, yL, q1[2]], [u, q1[1], q1[2]]] : [[u, q0[1], q0[2]], [u, yL, q1[2]], [u, yL, q0[2]], [u, q0[1], q0[2]], [u, q1[1], q1[2]], [u, yL, q1[2]]];
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); g.computeVertexNormals(); B.add(Mt.plasterLt, g, { bake: 0.95 });
      }
    }
    // laylight ceiling: plaster frame + three glazed panels with globe fixtures
    const va = pa[2], vb = pb[2], bw = 0.5, band = 0.62, pl = (ub - ua - 2 * bw - 2 * band) / 3;
    B.ceil(Mt.plasterLt, ua, ub, va, vb, yL, 1.5, { bake: 1.05 });
    for (const [o, h] of [[0.0, 0.1], [0.16, 0.18]]) for (const [x0, x1, z0, z1] of [[ua + o, ub - o, va + o, va + o + 0.14], [ua + o, ub - o, vb - o - 0.14, vb - o], [ua + o, ua + o + 0.14, va + o, vb - o], [ub - o - 0.14, ub - o, va + o, vb - o]]) B.box(Mt.plasterLt, x0, x1, yL - h, yL, z0, z1, { bake: 0.95 }); // stepped frame
    for (let k = 0; k < 3; k++) {
      const u0 = ua + bw + k * (pl + band), u1 = u0 + pl;
      const g = new THREE.PlaneGeometry(u1 - u0, vb - va - 2 * bw).rotateX(Math.PI / 2).translate((u0 + u1) / 2, yL - 0.02, (va + vb) / 2);
      extra.push(new THREE.Mesh(g, Mt.laylight));
      const g2 = g.clone().translate(0, -0.03, 0); const gm = new THREE.Mesh(g2, Mt.globes); gm.renderOrder = 2; extra.push(gm);
      for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) globeM.push(TRS(u0 + ((a + 0.5) / 4) * (u1 - u0), yL - 0.34, va + bw + ((b + 0.5) / 3) * (vb - va - 2 * bw), 0));
      for (const [x0, x1] of [[u0 - band, u0], [u1, u1 + band]]) if (x0 > ua + 0.1 && x1 < ub - 0.1) B.box(Mt.plasterLt, x0, x1, yL - 0.16, yL, va + bw, vb - bw, { bake: 0.95 }); // plaster bands between bays
      for (const [x0, x1, z0, z1] of [[u0 - 0.06, u1 + 0.06, va + bw - 0.06, va + bw], [u0 - 0.06, u1 + 0.06, vb - bw, vb - bw + 0.06], [u0 - 0.06, u0, va + bw, vb - bw], [u1, u1 + 0.06, va + bw, vb - bw]]) B.box(Mt.trim, x0, x1, yL - 0.12, yL, z0, z1, { bake: 1 });
    }

  }
  { const gg = new THREE.SphereGeometry(0.11, 8, 5); const gl = inst(gg, Mt.globe, globeM); extra.push(gl);
    const st = bakeAttr(uvs(geomOf([new THREE.CylinderGeometry(0.014, 0.014, 0.3, 4).translate(0, 0.22, 0), new THREE.CylinderGeometry(0.06, 0.1, 0.06, 8).translate(0, 0.08, 0)])), () => 1); extra.push(inst(st, Mt.bronze, globeM));
    // transverse ribs across the vault at the bay divisions (well ends and midway)
    const ribs = new Set([1, nL - 1]); for (const [a, b] of wellJ) { ribs.add(a); ribs.add(b); } const wj = wellJ.map(([a, b]) => (a + b) / 2); for (let k = 0; k < wj.length - 1; k++) ribs.add(Math.round((wj[k] + wj[k + 1]) / 2)); ribs.add(Math.max(1, wellJ[0][0] - 5)); ribs.add(Math.min(nL - 1, wellJ[wellJ.length - 1][1] + 5));
    for (const j of ribs) { const u = U0 + j * du; for (let i = 0; i < nA; i++) { if (inWell(i, j) && inWell(i, j - 1)) continue; const ta = -TH + i * dth, tb = ta + dth; const a1 = [u - 0.22, yc0 + (R - 0.05) * Math.cos(ta), vc + (R - 0.05) * Math.sin(ta)], a2 = [u + 0.22, a1[1], a1[2]], b1 = [u - 0.22, yc0 + (R - 0.05) * Math.cos(tb), vc + (R - 0.05) * Math.sin(tb)], b2 = [u + 0.22, b1[1], b1[2]]; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a1, ...a2, ...b2, ...a1, ...b2, ...b1], 3)); g.computeVertexNormals(); B.add(Mt.plasterLt, g); } }
  }
  // ---- bookcases on all four walls ----
  const bookcase = (axis, a, b, at, dir) => { // axis 'u': run along u at v=at, front toward v+dir*BK ; axis 'v': along v at u=at
    const d = BK, y0 = F2, y1 = F2 + BKH;
    const R2 = (p0, p1, q0, q1, z0, z1, m, o) => axis === 'u' ? B.box(m, p0, p1, z0, z1, q0, q1, o) : B.box(m, q0, q1, z0, z1, p0, p1, o);
    const q = (t) => at + dir * t;
    R2(a, b, Math.min(q(0), q(d - 0.04)), Math.max(q(0), q(d - 0.04)), y0, y1, Mt.darkOak);
    // books face (texture plane) just proud of the carcass, between plinth and cornice
    const L = b - a, plane = new THREE.PlaneGeometry(L, y1 - 0.2 - (y0 + 0.12));
    const uvA = plane.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, (uvA.getX(i) * L) / 1.6 + (a * 0.37) % 1, uvA.getY(i));
    if (axis === 'u') { if (dir < 0) plane.rotateY(Math.PI); plane.translate((a + b) / 2, (y0 + 0.12 + y1 - 0.2) / 2, q(d - 0.035)); }
    else { plane.rotateY(dir > 0 ? Math.PI / 2 : -Math.PI / 2); if (dir > 0) { /* faces +u */ } plane.translate(q(d - 0.035), (y0 + 0.12 + y1 - 0.2) / 2, (a + b) / 2); }
    B.add(Mt.books, plane, { uv: 'keep' });
    R2(a, b, Math.min(q(0), q(d)), Math.max(q(0), q(d)), y0, y0 + 0.12, Mt.darkOak);
    R2(a - 0.03, b + 0.03, Math.min(q(0), q(d + 0.05)), Math.max(q(0), q(d + 0.05)), y1 - 0.2, y1, Mt.darkOak);
    for (let p = a; p <= b + 1e-6; p += Math.max(0.6, L / Math.max(1, Math.round(L / 0.95)))) R2(p - 0.025, p + 0.025, Math.min(q(0), q(d + 0.01)), Math.max(q(0), q(d + 0.01)), y0, y1 - 0.2, Mt.darkOak, { detail: true });
  };
  bookcase('u', U0 + BK, U1 - BK, vN + 0.05, 1);
  bookcase('u', U0 + BK, doorU0 - 0.8, vS - 0.01, -1); bookcase('u', doorU1 + 0.8, U1 - BK, vS - 0.01, -1);
  for (const [u, dir] of [[U0 + 0.01, 1], [U1 - 0.01, -1]]) {
    const dv0 = EWd.vc - 0.75, dv1 = EWd.vc + 0.75; bookcase('v', vN + 0.05, dv0 - 0.12, u, dir); bookcase('v', dv1 + 0.12, vS - 0.01, u, dir);
    const t = (x) => [Math.min(u, u + dir * x), Math.max(u, u + dir * x)];
 B.box(Mt.darkOak, ...t(0.2), F2, F2 + 2.75, dv0 - 0.12, dv0); B.box(Mt.darkOak, ...t(0.2), F2, F2 + 2.75, dv1, dv1 + 0.12); B.box(Mt.darkOak, ...t(0.24), F2 + 2.6, F2 + 2.75, dv0 - 0.15, dv1 + 0.15);
    { const g = new THREE.PlaneGeometry(1.5, 2.55).rotateY(dir > 0 ? Math.PI / 2 : -Math.PI / 2).translate(u + dir * 0.09, F2 + 1.28, EWd.vc); extra.push(new THREE.Mesh(g, Mt.doorLight)); }
  }
  // ---- the doorway from the stair landing: aedicule, clock in an arched hood, open leather doors ----
  { const t = vS - 0.01, d = { detail: true };
    B.box(Mt.darkOak, doorU0 - 0.08, doorU0, F2, F2 + doorH, vS - 0.06, vS + 0.6); B.box(Mt.darkOak, doorU1, doorU1 + 0.08, F2, F2 + doorH, vS - 0.06, vS + 0.6); B.box(Mt.darkOak, doorU0 - 0.08, doorU1 + 0.08, F2 + doorH, F2 + doorH + 0.1, vS - 0.06, vS + 0.6);
    for (const u of [doorU0 - 0.5, doorU1 + 0.5]) { B.box(Mt.plasterLt, u - 0.22, u + 0.22, F2, F2 + 4.6, t - 0.18, t); B.box(Mt.plasterLt, u - 0.28, u + 0.28, F2 + 4.6, F2 + 4.85, t - 0.24, t); B.box(Mt.plasterLt, u - 0.28, u + 0.28, F2, F2 + 0.3, t - 0.24, t); }
    B.box(Mt.plasterLt, doorU0 - 0.85, doorU1 + 0.85, F2 + 4.85, F2 + 5.15, t - 0.22, t); B.box(Mt.trim, doorU0 - 0.75, doorU1 + 0.75, F2 + 5.15, F2 + 5.55, t - 0.12, t);
    B.box(Mt.plasterLt, doorU0 - 0.95, doorU1 + 0.95, F2 + 5.55, F2 + 5.8, t - 0.36, t);
    for (let u = doorU0 - 0.6; u < doorU1 + 0.65; u += 0.45) B.add(Mt.plasterLt, new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10).rotateX(Math.PI / 2).translate(u, F2 + 5.35, t - 0.13), d);
    // arched hood with the clock
    const hood = new THREE.Shape(); hood.absarc(0, 0, 1.15, 0, Math.PI, false); hood.lineTo(-0.95, 0); hood.absarc(0, 0, 0.95, Math.PI, 0, true); hood.lineTo(1.15, 0);
    const hg = new THREE.ExtrudeGeometry(hood, { depth: 0.3, bevelEnabled: false, curveSegments: 16 }); hg.translate(cs, F2 + 5.8, t - 0.3); B.add(Mt.plasterLt, hg, { bake: 0.95 });
    B.add(Mt.plaster, new THREE.CircleGeometry(0.95, 24, 0, Math.PI).translate(cs, F2 + 5.8, t - 0.02).rotateY(0), { bake: 0.9 });
    B.box(Mt.plasterLt, cs - 0.2, cs + 0.2, F2 + 6.95, F2 + 7.35, t - 0.25, t); B.add(Mt.plasterLt, new THREE.SphereGeometry(0.18, 10, 8).translate(cs, F2 + 7.5, t - 0.15), d);
    // leather doors swung open into the reading room, oval portholes
    for (const [u, s] of [[doorU0, 1], [doorU1, -1]]) {
      B.box(Mt.leather, u + s * 0.02, u + s * 0.08, F2 + 0.02, F2 + 2.95, t - 1.08, t - 0.02);
      B.add(Mt.brass, new THREE.TorusGeometry(0.2, 0.025, 6, 16).scale(1, 1.6, 1).rotateY(Math.PI / 2).translate(u + s * 0.05, F2 + 1.75, t - 0.55), d);
      B.box(Mt.brass, u + s * 0.01, u + s * 0.09, F2 + 0.02, F2 + 0.25, t - 1.08, t - 0.02);
    }
  }
  // clock (face texture + animated hands)
  const clockC = [cs, F2 + 6.0, vS - 0.06];
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32).rotateY(Math.PI).translate(clockC[0], clockC[1], clockC[2]), new THREE.MeshBasicMaterial({ map: TX.clockTex(), color: new THREE.Color(0.85, 0.82, 0.76) }));
  extra.push(clockFace);
  const handMat = new THREE.MeshBasicMaterial({ color: 0x1a1612 });
  const mkHand = (len, w) => { const g = new THREE.BoxGeometry(w, len, 0.015).translate(0, len / 2 - 0.06, 0); const m = new THREE.Mesh(g, handMat); m.position.set(clockC[0], clockC[1], clockC[2] - 0.02); return m; };
  const hourHand = mkHand(0.36, 0.05), minHand = mkHand(0.52, 0.03); extra.push(hourHand, minHand);
  // ---- reading tables, chairs, lamps (instanced) ----
  { const rnd = (() => { let s = 1234; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    const tM = [], cM = [], lM = [], pM = [];
    for (const [u, v] of tables) {
      tM.push(TRS(u, F2, v, 0));
      for (const dv of [-1.15, 1.15]) { lM.push(TRS(u, F2 + 0.76, v + dv, 0, 0.88)); pM.push(TRS(u, F2 + 0.766, v + dv, 0)); }
      for (const side of [-1, 1]) for (const dv of [-1.72, -0.58, 0.58, 1.72]) {
        const out = rnd() < 0.25 ? 0.22 + rnd() * 0.25 : rnd() * 0.06, rot = (rnd() - 0.5) * 0.3;
        cM.push(TRS(u + side * (0.86 + out), F2, v + dv + (rnd() - 0.5) * 0.12, (side < 0 ? 0 : Math.PI) + rot));
      }
    }
    extra.push(inst(protoTable(TL, TW), Mt.oak, tM), inst(protoChair(), Mt.oak, cM), inst(protoLamp(), Mt.bronze, lM), inst(protoLampGlow(), Mt.shadeGlow, lM));
    const poolG = new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2); const pools = inst(poolG, Mt.pool, pM); pools.renderOrder = 2; extra.push(pools);
    const blobG = new THREE.PlaneGeometry(3.2, 6.0).rotateX(-Math.PI / 2); const blobs = inst(blobG, Mt.blob, tables.map(([u, v]) => TRS(u, F2 + 0.003, v, 0))); blobs.renderOrder = 1; extra.push(blobs);
    for (const [u, v] of tables) colliders.push({ pts: [[u - TW / 2 - 0.05, v - TL / 2 - 0.05], [u + TW / 2 + 0.05, v - TL / 2 - 0.05], [u + TW / 2 + 0.05, v + TL / 2 + 0.05], [u - TW / 2 - 0.05, v + TL / 2 + 0.05]], y0: F2 - 0.4, y1: F2 + 0.8 });
  }
  { const L = 24, w = 3.0;
    const sp = [];
    for (const [a, b] of P.wins) sp.push(new THREE.PlaneGeometry(b - a, yWh - yWs).translate((a + b) / 2, (yWs + yWh) / 2, -41.72));
    for (const [u, sg] of [[U0 - 0.28, 1], [U1 + 0.28, -1]]) { const sh = new THREE.Shape(); sh.moveTo(-EW.hw, EW.y0); sh.lineTo(EW.hw, EW.y0); sh.lineTo(EW.hw, EW.ys); sh.absarc(0, EW.ys, EW.hw, 0, Math.PI, false); sh.lineTo(-EW.hw, EW.y0); const g = new THREE.ShapeGeometry(sh, 24); g.rotateY(sg > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(u, 0, EW.vc); sp.push(g); }
    const sm = new THREE.Mesh(mergeGeometries(sp.map((g) => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; })), Mt.sheen); sm.renderOrder = 1; extra.push(sm);
  }
  // NRR physics
  walkables.push({ type: 'poly', pts: [[U0, vN], [U1, vN], [U1, vS], [doorU1, vS], [doorU1, vS + 0.62], [doorU0, vS + 0.62], [doorU0, vS], [U0, vS]], y: F2 });
  const yN0 = F2 - 0.6, yN1 = F2 + 10;
  segs([[U0 + BK, vN + BK + 0.05], [U1 - BK, vN + BK + 0.05]], yN0, yN1);
  segs([[U0 + BK, vN + BK + 0.05], [U0 + BK, vS - BK]], yN0, yN1); segs([[U1 - BK, vN + BK + 0.05], [U1 - BK, vS - BK]], yN0, yN1);
  segs([[U0 + BK, vS - BK], [doorU0 - 0.8, vS - BK]], yN0, yN1); segs([[doorU1 + 0.8, vS - BK], [U1 - BK, vS - BK]], yN0, yN1);
  segs([[doorU0 - 0.8, vS - BK], [doorU0, vS]], yN0, yN1); segs([[doorU1 + 0.8, vS - BK], [doorU1, vS]], yN0, yN1);
  segs([[doorU0, vS], [doorU0, vS + 0.6]], yN0, yN1); segs([[doorU1, vS], [doorU1, vS + 0.6]], yN0, yN1);

  // ---------------- landing, imperial stair and stair hall ----------------
  const SU0 = -21.6, SU1 = -12.5, sU0 = SU0 + 0.05, sU1 = SU1 - 0.05, vL2 = vS + 0.6, vTop = -21.5, vLand = -17.6, vSW = -14.55, yHall = 14.2;
  const nR = 28, r = (F2 - F1) / nR, HL = F1 + 14 * r, tread = (vLand - vTop) / 13;
  const cU0 = cs - 2.0, cU1 = cs + 2.0, wU1 = cU0 - 0.24, eU0 = cU1 + 0.24;
  const hallBake = (u, y, v, nu, ny, nv) => { if (y > yHall - 0.1) return 1.0; let k = 0.78 + 0.27 * sstep(F1, yHall, y); if (ny > 0.6) k *= 0.95; return k * (1 - 0.2 * Math.exp(-Math.min(u - SU0, SU1 - u) / 0.6)); };
  B.zone = hallBake;
  // upper landing floor + slab, stair hall walls
  B.floor(Mt.marble, sU0, sU1, vL2, vTop, F2, 1.0); B.box(Mt.plaster, SU0, SU1, F2 - 0.43, F2 - 0.01, vL2, vTop, { cast: true, bake: 0.8 });
  B.box(Mt.marbleG, sU0, sU1, F2, F2 + 0.004, vL2 + 0.05, vL2 + 0.2, { bake: 1 });
  B.wallV(Mt.marble, vL2, vSW, F1 - 0.1, yHall, sU0, true, 1.6); B.wallV(Mt.marble, vL2, vSW, F1 - 0.1, yHall, sU1, false, 1.6);
  B.box(Mt.plaster, SU0 - 0.4, SU0, F1 - 0.3, yHall + 0.4, vL2, vSW + 0.3, { cast: true, bake: 0.7 }); B.box(Mt.plaster, SU1, SU1 + 0.4, F1 - 0.3, yHall + 0.4, vL2, vSW + 0.3, { cast: true, bake: 0.7 });
  B.wallU(Mt.marble, sU0, sU1, HL, yHall, vSW, false, 1.6); B.box(Mt.plaster, SU0, SU1, F1 - 0.3, yHall + 0.4, vSW, vSW + 0.3, { cast: true, bake: 0.7 });
  // north wall of the hall above the landing (back of the reading-room wall) with the inscribed doorway
  B.wallU(Mt.marble, sU0, doorU0, F2, yHall, vL2 + 0.005, true, 1.6); B.wallU(Mt.marble, doorU1, sU1, F2, yHall, vL2 + 0.005, true, 1.6); B.wallU(Mt.marble, doorU0, doorU1, F2 + doorH, yHall, vL2 + 0.005, true, 1.6);
  { const ins = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.32).translate(cs, F2 + doorH + 0.32, vL2 + 0.03), new THREE.MeshStandardMaterial({ map: TX.textTex('NORTH READING ROOM', { w: 1024, h: 102, bg: '#ddd3bf', fg: '#2f2a24' }), roughness: 0.6 }));
    extra.push(ins);
    B.box(Mt.marbleW, doorU0 - 0.35, doorU1 + 0.35, F2 + doorH + 0.08, F2 + doorH + 0.12, vL2, vL2 + 0.06); B.box(Mt.marbleW, doorU0 - 0.45, doorU1 + 0.45, F2 + doorH + 0.56, F2 + doorH + 0.7, vL2, vL2 + 0.16);
    for (const u of [doorU0 - 0.2, doorU1 + 0.2]) B.box(Mt.marbleW, u - 0.17, u + 0.17, F2, F2 + doorH + 0.08, vL2, vL2 + 0.07);
    // lunette over the doorway and a frieze across the hall
    const lr = new THREE.Shape(); lr.absarc(0, 0, 1.75, 0, Math.PI, false); lr.lineTo(-1.5, 0); lr.absarc(0, 0, 1.5, Math.PI, 0, true); lr.lineTo(1.75, 0);
    const lg = new THREE.ExtrudeGeometry(lr, { depth: 0.14, bevelEnabled: false, curveSegments: 18 }); lg.translate(cs, F2 + doorH + 0.7, vL2); B.add(Mt.marbleW, lg, { bake: 0.95 });
    B.add(Mt.marbleG, new THREE.CircleGeometry(1.5, 24, 0, Math.PI).translate(cs, F2 + doorH + 0.7, vL2 + 0.01), { bake: 0.8 });
    B.add(Mt.gilt, new THREE.CircleGeometry(0.45, 20).translate(cs, F2 + doorH + 1.35, vL2 + 0.02), { bake: 1 });
    B.box(Mt.marbleW, sU0, sU1, F2 + 6.0, F2 + 6.35, vL2, vL2 + 0.18); B.box(Mt.marbleW, sU0, sU1, F2 + 6.35, F2 + 6.5, vL2, vL2 + 0.3); }
  // marble cornice and blind arcade on the hall walls above the landing level
  for (const [u, s] of [[sU0, 1], [sU1, -1]]) {
    const lo = Math.min(u, u + s * 0.35), lo2 = Math.min(u, u + s * 0.2);
    B.box(Mt.marbleW, lo, lo + 0.35, yHall - 0.6, yHall - 0.3, vL2, vSW); B.box(Mt.marbleW, lo2, lo2 + 0.2, F2 + 7.0, F2 + 7.25, vL2, vSW);
    for (const vm of [(vL2 + vSW) / 2]) { // big blind arch
      const ar = new THREE.Shape(); ar.absarc(0, 0, 2.6, 0, Math.PI, false); ar.lineTo(-2.35, 0); ar.absarc(0, 0, 2.35, Math.PI, 0, true); ar.lineTo(2.6, 0);
      const g = new THREE.ExtrudeGeometry(ar, { depth: 0.12, bevelEnabled: false, curveSegments: 16 }); g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(u, F2 + 3.2, vm); B.add(Mt.marbleW, g, { bake: 0.95 });
      for (const dv of [-2.475, 2.475]) B.box(Mt.marbleW, Math.min(u, u + s * 0.12), Math.max(u, u + s * 0.12), F2 + 0.2, F2 + 3.2, vm + dv - 0.125, vm + dv + 0.125);
      const nf = new THREE.Shape(); nf.moveTo(-2.35, 0); nf.lineTo(2.35, 0); nf.lineTo(2.35, 0.01); nf.absarc(0, 0, 2.35, 0, Math.PI, false); nf.lineTo(-2.35, 0); // darker niche field
      const ng = new THREE.ShapeGeometry(nf, 16); ng.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2); ng.translate(u + s * 0.01, F2 + 3.2, vm); B.add(Mt.plaster, ng, { bake: 0.75 });
      B.box(Mt.plaster, Math.min(u, u + s * 0.01), Math.max(u, u + s * 0.01), F2 + 0.2, F2 + 3.2, vm - 2.35, vm + 2.35, { bake: 0.75 });
    }
  }
  // south wall: a great arched window of frosted glass towards the light court
  { const vm = vSW - 0.04, w = 2.6;
    const g = new THREE.Shape(); g.moveTo(-w, 0); g.lineTo(w, 0); g.lineTo(w, 3.2); g.absarc(0, 3.2, w, 0, Math.PI, false); g.lineTo(-w, 0);
    const gg = new THREE.ShapeGeometry(g, 16).rotateY(Math.PI).translate(cs, HL + 2.0, vm); const lm = new THREE.Mesh(gg, Mt.frosted); extra.push(lm);
    const fr = new THREE.Shape(); fr.moveTo(-w - 0.3, 0); fr.lineTo(w + 0.3, 0); fr.lineTo(w + 0.3, 3.2); fr.absarc(0, 3.2, w + 0.3, 0, Math.PI, false); fr.lineTo(-w - 0.3, 0);
    const hole = new THREE.Path(); hole.moveTo(-w, 0); hole.lineTo(w, 0); hole.lineTo(w, 3.2); hole.absarc(0, 3.2, w, 0, Math.PI, false); hole.lineTo(-w, 0); fr.holes.push(hole);
    const fg = new THREE.ExtrudeGeometry(fr, { depth: 0.15, bevelEnabled: false, curveSegments: 16 }); fg.rotateY(Math.PI); fg.translate(cs, HL + 2.0, vm); B.add(Mt.marbleW, fg, { bake: 1 });
    for (let k = -2; k <= 2; k++) B.box(Mt.bronze, cs + k * 1.04 - 0.03, cs + k * 1.04 + 0.03, HL + 2.0, HL + 2.0 + 3.2 + Math.sqrt(Math.max(0, w * w - (k * 1.04) ** 2)), vm - 0.06, vm - 0.02, { detail: true });
    for (const yy of [1.1, 2.2, 3.2]) B.box(Mt.bronze, cs - w, cs + w, HL + 2.0 + yy - 0.03, HL + 2.0 + yy + 0.03, vm - 0.06, vm - 0.02, { detail: true });
  }
  // landing wall below the window: marble dado panels; cornices on the hall's end walls
  for (let k = -1; k <= 1; k++) { const c = cs + k * 2.9, d = { detail: true }; for (const [a, b2, y0, y1] of [[c - 1.2, c + 1.2, HL + 0.25, HL + 0.33], [c - 1.2, c + 1.2, HL + 1.55, HL + 1.63], [c - 1.2, c - 1.12, HL + 0.25, HL + 1.63], [c + 1.12, c + 1.2, HL + 0.25, HL + 1.63]]) B.box(Mt.marbleG, a, b2, y0, y1, vSW - 0.04, vSW, d); }
  B.box(Mt.marbleG, sU0, sU1, HL, HL + 0.15, vSW - 0.05, vSW); B.box(Mt.marbleW, sU0, sU1, HL + 1.75, HL + 1.85, vSW - 0.1, vSW);
  for (const [v, s] of [[vL2, 1], [vSW, -1]]) { B.box(Mt.marbleW, sU0, sU1, yHall - 0.6, yHall - 0.3, Math.min(v, v + s * 0.35), Math.max(v, v + s * 0.35)); }
  // laylight ceiling over the stair hall
  { const lu0 = sU0 + 1.2, lu1 = sU1 - 1.2, lv0 = vL2 + 1.2, lv1 = vSW - 1.2;
    for (const [a, b, c, d] of [[sU0, sU1, vL2, lv0], [sU0, sU1, lv1, vSW], [sU0, lu0, lv0, lv1], [lu1, sU1, lv0, lv1]]) B.ceil(Mt.lobbyCeil, a, b, c, d, yHall, 1.2, { bake: 0.9 });
    const g = new THREE.PlaneGeometry(lu1 - lu0, lv1 - lv0).rotateX(Math.PI / 2).translate((lu0 + lu1) / 2, yHall - 0.01, (lv0 + lv1) / 2); extra.push(new THREE.Mesh(g, Mt.laylight));
    const gm = new THREE.Mesh(g.clone().translate(0, -0.02, 0), Mt.globes); gm.renderOrder = 2; extra.push(gm);
    for (const [x0, x1, z0, z1] of [[lu0 - 0.15, lu1 + 0.15, lv0 - 0.15, lv0], [lu0 - 0.15, lu1 + 0.15, lv1, lv1 + 0.15], [lu0 - 0.15, lu0, lv0, lv1], [lu1, lu1 + 0.15, lv0, lv1]]) B.box(Mt.trim, x0, x1, yHall - 0.18, yHall, z0, z1, { bake: 1 });
  }
  // the stair: central flight to the half landing, two return flights to the reading-room level (solid marble)
  B.zone = (u, y, v, nu, ny) => (ny > 0.6 ? 1.0 : 0.6) * (0.85 + 0.15 * sstep(F1, F2, y));
  for (let k = 1; k <= 13; k++) {
    const v0 = vTop + (k - 1) * tread, v1 = vTop + k * tread, y = F1 + k * r;
    B.box(Mt.marbleW, cU0, cU1, F1 - 0.2, y, v0, v1); B.box(Mt.marbleW, cU0, cU1, y - 0.045, y, v0 - 0.035, v0 + 0.02, { bake: 1.1 });
    const ys = HL + k * r, w0 = vLand - k * tread, w1 = vLand - (k - 1) * tread;
    B.box(Mt.marbleW, sU0, wU1, F1 - 0.2, ys, w0, w1); B.box(Mt.marbleW, eU0, sU1, F1 - 0.2, ys, w0, w1);
    B.box(Mt.marbleW, sU0, wU1, ys - 0.045, ys, w1 - 0.02, w1 + 0.035, { bake: 1.1 }); B.box(Mt.marbleW, eU0, sU1, ys - 0.045, ys, w1 - 0.02, w1 + 0.035, { bake: 1.1 });
  }
  B.box(Mt.marbleW, sU0, sU1, F1 - 0.2, HL, vLand, vSW);
  B.box(Mt.marbleG, cU0 + 0.3, cU1 - 0.3, HL, HL + 0.004, vLand + 0.3, vSW - 0.3, { bake: 1 });
  // parapets on the inner edges of the return flights (sloped tops), newel posts with bronze lamp standards
  for (const [a, b] of [[wU1, cU0], [cU1, eU0]]) {
    const sh = new THREE.Shape(); sh.moveTo(vTop, F1 - 0.2); sh.lineTo(vLand, F1 - 0.2); sh.lineTo(vLand, HL + 1.0); sh.lineTo(vTop, F2 + 1.0); sh.lineTo(vTop, F1 - 0.2);
    const g = new THREE.ExtrudeGeometry(sh, { depth: b - a, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(b, 0, 0); // shape x -> -z? fix below
    B.add(Mt.marbleW, g, { bake: 0.9 });
    const lsh = new THREE.Shape(); lsh.moveTo(vTop, F2 + 0.92); lsh.lineTo(vLand, HL + 0.92); lsh.lineTo(vLand, HL + 1.12); lsh.lineTo(vTop, F2 + 1.12); lsh.lineTo(vTop, F2 + 0.92);
    const lg = new THREE.ExtrudeGeometry(lsh, { depth: b - a + 0.16, bevelEnabled: false }); lg.rotateY(-Math.PI / 2); lg.translate(b + 0.08, 0, 0); 
    B.add(Mt.marbleG, lg, { bake: 1 });
  }
  for (const u of [(wU1 + cU0) / 2, (cU1 + eU0) / 2]) {
    B.box(Mt.marbleG, u - 0.3, u + 0.3, F1 - 0.2, F1 + 1.2, vTop - 0.62, vTop - 0.02); // newels at the foot
    B.add(Mt.bronze, new THREE.CylinderGeometry(0.05, 0.08, 1.6, 8).translate(u, F1 + 2.0, vTop - 0.32));
    B.add(Mt.glow, new THREE.SphereGeometry(0.2, 12, 8).translate(u, F1 + 2.95, vTop - 0.32), { bake: 1 });
    colliders.push({ pts: [[u - 0.3, vTop - 0.62], [u + 0.3, vTop - 0.62], [u + 0.3, vTop], [u - 0.3, vTop]], y0: F1 - 1, y1: F1 + 1.3 });
  }
  // balustrade at the upper landing over the stairwell
  { const y0 = F2, u0 = wU1, u1 = eU0, v = vTop - 0.12;
    B.box(Mt.marbleW, u0, u1, y0, y0 + 0.16, v - 0.12, v + 0.12); B.box(Mt.marbleW, u0 - 0.05, u1 + 0.05, y0 + 0.92, y0 + 1.06, v - 0.16, v + 0.16);
    const prof = [[0, 0], [0.06, 0], [0.06, 0.05], [0.09, 0.22], [0.045, 0.52], [0.05, 0.72], [0, 0.76]].map(([a, b]) => new THREE.Vector2(a, b));
    for (let u = u0 + 0.18; u < u1 - 0.1; u += 0.3) B.add(Mt.marbleW, new THREE.LatheGeometry(prof, 8).translate(u, y0 + 0.16, v), { detail: true, bake: 0.95 });
  }
  // stair physics
  walkables.push({ type: 'poly', pts: [[sU0, vL2], [sU1, vL2], [sU1, vTop], [sU0, vTop]], y: F2 });
  walkables.push({ type: 'fn', rect: [cU0, vTop, cU1, vLand], f: (u, v) => F1 + r * Math.max(1, Math.min(14, Math.floor((v - vTop) / tread) + 1)) });
  walkables.push({ type: 'poly', pts: [[sU0, vLand], [sU1, vLand], [sU1, vSW], [sU0, vSW]], y: HL });
  for (const [a, b] of [[sU0, wU1], [eU0, sU1]]) walkables.push({ type: 'fn', rect: [a, vTop, b, vLand], f: (u, v) => HL + r * Math.max(1, Math.min(14, Math.floor((vLand - v) / tread) + 1)) });
  segs([[wU1, vTop], [wU1, vLand]], F1 - 1, F2 + 1.3); segs([[cU0, vTop], [cU0, vLand]], F1 - 1, F2 + 1.3); segs([[cU1, vTop], [cU1, vLand]], F1 - 1, F2 + 1.3); segs([[eU0, vTop], [eU0, vLand]], F1 - 1, F2 + 1.3);
  segs([[wU1, vTop - 0.12], [eU0, vTop - 0.12]], F2 - 0.6, F2 + 1.2);
  segs([[sU0, vTop], [wU1, vTop]], F1 - 1, F2 - 0.5); segs([[eU0, vTop], [sU1, vTop]], F1 - 1, F2 - 0.5);
  segs([[sU0, vL2], [sU0, vSW]], F1 - 1, yHall); segs([[sU1, vL2], [sU1, vSW]], F1 - 1, yHall); segs([[sU0, vSW], [sU1, vSW]], F1 - 1, yHall);
  segs([[sU0, vL2], [doorU0, vL2]], F2 - 0.6, yHall); segs([[doorU1, vL2], [sU1, vL2]], F2 - 0.6, yHall);

  // ---------------- vestibule and lobby (floor 1) ----------------
  const yC1 = F2 - 0.45, LU0 = -21.6, LU1 = -12.5, vVes = -37.3, vNW = -41.5, VU0 = -19.6, VU1 = -14.5, pU0 = cs - 1.55, pU1 = cs + 1.55;
  const mDoor = [-34.0, -31.8];
  const lobBake = (u, y, v, nu, ny, nv) => { if (y > yC1 - 0.05) return 0.85 - 0.15 * Math.exp(-Math.min(u - LU0, LU1 - u) / 1.2); let k = 0.92 - 0.3 * Math.exp(-(y - F1) / 0.6) - 0.12 * Math.exp(-(yC1 - y) / 0.5); if (ny > 0.6) k = 1 - 0.3 * Math.exp(-Math.min(u - LU0, LU1 - u) / 0.8); return k; };
  B.zone = lobBake;
  B.floor(Mt.marble, VU0, VU1, vNW, vVes, F1, 1.0); B.floor(Mt.marble, LU0, LU1, vVes, vTop, F1, 1.0);
  B.box(Mt.marble, pU0, pU1, F1 - 0.4, F1, -42.32, vNW, { bake: 0.9 });
  // checkered border and central field (grey marble inlay)
  for (const [a, b, c, d] of [[LU0 + 0.3, LU0 + 0.6, vVes + 0.3, vTop - 0.1], [LU1 - 0.6, LU1 - 0.3, vVes + 0.3, vTop - 0.1], [LU0 + 0.6, LU1 - 0.6, vVes + 0.3, vVes + 0.6]]) B.box(Mt.marbleG, a, b, F1, F1 + 0.004, c, d, { bake: 1 });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 12; j++) if ((i + j) % 2 === 0) { const u = LU0 + 1.6 + i * 1.0, v = vVes + 1.6 + j * 1.0; if (u + 1 > LU1 - 1.4) continue; B.box(Mt.marbleG, u, u + 1.0, F1, F1 + 0.003, v, v + 1.0, { bake: 1 }); }
  cofferCeiling(B, Mt.vault, VU0, VU1, vNW, vVes, yC1, 1.25, 0.14, { bake: 0.85 }); cofferCeiling(B, Mt.vault, LU0, LU1, vVes, vTop, yC1, 1.3, 0.16, { bake: 0.85 });
  for (let v = vVes + 3.2; v < vTop - 1; v += 3.25) B.box(Mt.plasterLt, LU0, LU1, yC1 - 0.38, yC1, v - 0.22, v + 0.22, { bake: 0.85 }); // transverse beams
  // walls
  B.wallV(Mt.marble, vVes, mDoor[0], F1, yC1, LU0, true, 1.5); B.wallV(Mt.marble, mDoor[1], vTop, F1, yC1, LU0, true, 1.5); B.wallV(Mt.marble, mDoor[0], mDoor[1], F1 + 3.3, yC1, LU0, true, 1.5);
  B.wallV(Mt.marble, vVes, vTop, F1, yC1, LU1, false, 1.5);
  B.wallV(Mt.marble, vNW, vVes, F1, yC1, VU0, true, 1.5); B.wallV(Mt.marble, vNW, vVes, F1, yC1, VU1, false, 1.5);
  B.wallU(Mt.marble, VU0, pU0, F1, yC1, vNW, true, 1.5); B.wallU(Mt.marble, pU1, VU1, F1, yC1, vNW, true, 1.5); B.wallU(Mt.marble, pU0, pU1, 6.25, yC1, vNW, true, 1.5);
  B.wallU(Mt.marble, LU0, VU0, F1, yC1, vVes, true, 1.5); B.wallU(Mt.marble, VU1, LU1, F1, yC1, vVes, true, 1.5);
  // portal reveals
  B.box(Mt.marble, pU0, pU0 + 0.04, F1, 6.25, -42.31, vNW, { bake: 0.9 }); B.box(Mt.marble, pU1 - 0.04, pU1, F1, 6.25, -42.31, vNW, { bake: 0.9 }); B.box(Mt.marble, pU0, pU1, 6.2, 6.25, -42.31, vNW, { bake: 0.85 });
  // dado, base and cornice mouldings
  const runs = [[[LU0, vVes, LU0, mDoor[0]], 1], [[LU0, mDoor[1], LU0, vTop], 1], [[LU1, vVes, LU1, vTop], -1], [[VU0, vNW, VU0, vVes], 1], [[VU1, vNW, VU1, vVes], -1]];
  for (const [[ua, va, , vb], s] of runs) { const t = (d) => [Math.min(ua, ua + s * d), Math.max(ua, ua + s * d)]; B.box(Mt.marbleG, ...t(0.05), F1, F1 + 0.25, va, vb); B.box(Mt.marbleG, ...t(0.04), F1 + 1.05, F1 + 1.13, va, vb); B.box(Mt.marbleW, ...t(0.2), yC1 - 0.32, yC1 - 0.12, va, vb); B.box(Mt.marbleW, ...t(0.32), yC1 - 0.12, yC1, va, vb); }
  // pilasters along the lobby walls
  for (let v = vVes + 1.2; v < vTop - 0.5; v += 3.25) for (const [u, s] of [[LU0, 1], [LU1, -1]]) { if (s > 0 && v > mDoor[0] - 0.6 && v < mDoor[1] + 0.6) continue; const t0 = Math.min(u, u + s * 0.14), t1 = Math.max(u, u + s * 0.14); B.box(Mt.marbleW, t0, t1, F1, yC1 - 0.32, v - 0.32, v + 0.32); B.box(Mt.marbleW, Math.min(u, u + s * 0.22), Math.max(u, u + s * 0.22), yC1 - 0.75, yC1 - 0.32, v - 0.4, v + 0.4); }
  // inner screen: bronze transom and grille over the open doors
  { const v = vVes, d = { detail: true };
    B.box(Mt.bronze, VU0, VU1, F1 + 3.0, F1 + 3.15, v - 0.08, v + 0.08); B.box(Mt.bronze, VU0, VU1, yC1 - 0.1, yC1, v - 0.08, v + 0.08);
    for (let u = VU0 + 0.25; u < VU1; u += 0.25) B.box(Mt.bronze, u - 0.012, u + 0.012, F1 + 3.15, yC1 - 0.1, v - 0.02, v + 0.02, d);
    for (const [u, s] of [[VU0, 1], [VU1, -1]]) { B.box(Mt.bronze, u, u + s * 0.08, F1, F1 + 3.0, v - 0.08, v + 0.08); B.box(Mt.bronze, u + s * 0.1, u + s * 0.14, F1 + 0.01, F1 + 2.98, v + 0.02, v + 1.25); B.box(Mt.bronze, u + s * 0.09, u + s * 0.15, F1 + 0.01, F1 + 0.35, v + 0.02, v + 1.25); }
  }
  // dedication tablet in the vestibule
  { const ins = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6).rotateY(Math.PI / 2).translate(VU0 + 0.035, F1 + 2.0, -39.4), new THREE.MeshStandardMaterial({ map: TX.textTex('ded', { w: 768, h: 512, bg: '#e8e5dd', fg: '#8a6a32', font: 'bold 44px Georgia, serif', lines: ['THIS BUILDING', 'IS A MEMORIAL TO', 'CHARLES FRANKLIN DOE', 'MCMX'] }), roughness: 0.4 }));
    extra.push(ins); B.box(Mt.verde, VU0, VU0 + 0.08, F1 + 1.05, F1 + 1.2, -40.7, -38.1); B.box(Mt.marbleW, VU0, VU0 + 0.06, F1 + 2.8, F1 + 2.92, -40.7, -38.1); }
  // the Morrison doorway and the closed door to room 190
  { const d0 = mDoor[0], d1 = mDoor[1];
    B.box(Mt.darkOak, LU0 - 0.5, LU0 + 0.06, F1, F1 + 3.3, d0 - 0.12, d0); B.box(Mt.darkOak, LU0 - 0.5, LU0 + 0.06, F1, F1 + 3.3, d1, d1 + 0.12); B.box(Mt.darkOak, LU0 - 0.5, LU0 + 0.06, F1 + 3.3, F1 + 3.45, d0 - 0.12, d1 + 0.12);
    const ins = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.3).rotateY(Math.PI / 2).translate(LU0 + 0.035, F1 + 3.75, (d0 + d1) / 2), new THREE.MeshStandardMaterial({ map: TX.textTex('MORRISON LIBRARY', { w: 1024, h: 128, bg: '#e2dccd', fg: '#3b3328' }), roughness: 0.5 }));
    extra.push(ins);
    B.box(Mt.darkOak, LU1 - 0.08, LU1, F1, F1 + 2.9, -30.6, -28.8); B.box(Mt.brass, LU1 - 0.12, LU1 - 0.08, F1 + 1.0, F1 + 1.1, -29.0, -28.92);
  }
  // welcome desk and exhibit vitrines
  { B.box(Mt.oak, LU1 - 1.25, LU1 - 0.45, F1, F1 + 1.05, -31.6, -28.2, { bake: (u, y) => 0.6 + 0.4 * sstep(F1, F1 + 1, y) }); B.box(Mt.granite, LU1 - 1.32, LU1 - 0.4, F1 + 1.05, F1 + 1.1, -31.7, -28.1);
    for (const v of [-33.5, -27.0]) { B.box(Mt.darkOak, LU0 + 0.9, LU0 + 2.1, F1, F1 + 0.9, v - 1.1, v + 1.1); B.box(Mt.brass, LU0 + 0.88, LU0 + 2.12, F1 + 0.9, F1 + 0.93, v - 1.12, v + 1.12); }
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fb4bc, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.25, depthWrite: false });
    for (const v of [-33.5, -27.0]) extra.push(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 2.2).translate(LU0 + 1.5, F1 + 1.1, v), glassMat));
  }
  // pendant lanterns down the axis
  for (const v of [-39.4, -33.0, -27.0]) {
    B.add(Mt.bronze, new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4).translate(cs, yC1 - 0.5, v), { detail: true });
    B.add(Mt.bronze, new THREE.CylinderGeometry(0.28, 0.12, 0.12, 8).translate(cs, yC1 - 1.06, v));
    B.add(Mt.glow, new THREE.SphereGeometry(0.26, 14, 10).scale(1, 1.15, 1).translate(cs, yC1 - 1.38, v), { bake: 1 });
  }
  { const pm = [-39.4, -33.0, -27.0].map((v) => TRS(cs, F1 + 0.006, v, 0, 1)); const pg = new THREE.PlaneGeometry(4.0, 4.0).rotateX(-Math.PI / 2); const pools = inst(pg, Mt.pool2, pm); pools.renderOrder = 2; extra.push(pools);
    const bm = [TRS(LU1 - 0.85, F1 + 0.003, -29.9, 0, 1), TRS(LU0 + 1.5, F1 + 0.003, -33.5, 0, 1), TRS(LU0 + 1.5, F1 + 0.003, -27.0, 0, 1), TRS((wU1 + cU0) / 2, F1 + 0.003, vTop - 0.32, 0, 0.5), TRS((cU1 + eU0) / 2, F1 + 0.003, vTop - 0.32, 0, 0.5)];
    const bl = inst(new THREE.PlaneGeometry(2.0, 4.0).rotateX(-Math.PI / 2), Mt.blob, bm); bl.renderOrder = 1; extra.push(bl); }
  // lobby physics
  walkables.push({ type: 'poly', pts: [[pU0, -42.35], [pU1, -42.35], [pU1, vNW], [VU1, vNW], [VU1, vVes], [LU1, vVes], [LU1, vTop], [LU0, vTop], [LU0, vVes], [VU0, vVes], [VU0, vNW], [pU0, vNW]], y: F1 });
  const yL0 = F1 - 1, yL1 = F2 - 0.5;
  segs([[pU0, -42.35], [pU0, vNW]], yL0, yL1); segs([[pU1, -42.35], [pU1, vNW]], yL0, yL1);
  segs([[VU0, vNW], [pU0, vNW]], yL0, yL1); segs([[pU1, vNW], [VU1, vNW]], yL0, yL1);
  segs([[VU0, vNW], [VU0, vVes]], yL0, yL1); segs([[VU1, vNW], [VU1, vVes]], yL0, yL1);
  segs([[LU0, vVes], [VU0, vVes]], yL0, yL1); segs([[VU1, vVes], [LU1, vVes]], yL0, yL1);
  segs([[LU0, vVes], [LU0, mDoor[0]]], yL0, yL1); segs([[LU0, mDoor[1]], [LU0, vTop]], yL0, yL1); segs([[LU1, vVes], [LU1, vTop]], yL0, yL1);
  segs([[LU1 - 1.3, -31.7], [LU1 - 1.3, -28.1]], yL0, F1 + 1.1); segs([[LU1 - 1.3, -31.7], [LU1, -31.7]], yL0, F1 + 1.1); segs([[LU1 - 1.3, -28.1], [LU1, -28.1]], yL0, F1 + 1.1);
  for (const v of [-33.5, -27.0]) colliders.push({ pts: [[LU0 + 0.85, v - 1.15], [LU0 + 2.15, v - 1.15], [LU0 + 2.15, v + 1.15], [LU0 + 0.85, v + 1.15]], y0: yL0, y1: F1 + 1.3 });

  // ---------------- Morrison Library (floor 1, northwest) ----------------
  const MU0 = -50.75, MU1 = LU0 - 0.4, MV0 = vNW, MV1 = vS, yMC = yC1;
  const morBake = (u, y, v, nu, ny, nv) => { const dW = Math.min(u - MU0, MU1 - u, v - MV0, MV1 - v); if (y > yMC - 0.05) return 0.8 - 0.2 * Math.exp(-dW / 1.5); if (ny > 0.6) return 1 - 0.35 * Math.exp(-dW / 1.0); return 0.95 - 0.3 * Math.exp(-(y - F1) / 0.5) - 0.15 * Math.exp(-(yMC - y) / 0.4); };
  B.zone = morBake;
  B.floor(Mt.oakFloor, MU0, MU1, MV0, MV1, F1, 1.2); B.ceil(Mt.strap, MU0, MU1, MV0, MV1, yMC, 1.2);
  B.box(Mt.plaster, MU0 - 0.3, LU1 + 0.4, F1 - 0.5, F1 - 0.01, -42.0, vTop, { cast: true, bake: 0.8 });
  for (const [a, b, y0] of [[vNW, mDoor[0], F1 - 0.3], [mDoor[1], vS + 0.6, F1 - 0.3], [mDoor[0], mDoor[1], F1 + 3.3]]) B.box(Mt.plaster, LU0 - 0.4, LU0, y0, yC1, a, b, { bake: 0.8 }); B.box(Mt.plaster, LU1, LU1 + 0.4, F1 - 0.3, yC1, vNW, vTop, { bake: 0.8 }); // party walls
  // panelled walls (with the north and west windows from the façade)
  const morWinN = (P.morWinN || []).filter(([a, b]) => b < MU1 && a > MU0), morWinW = P.morWinW || [];
  const yMw0 = 3.3, yMw1 = 5.9;
  { let c0 = MU0; for (const [a, b] of morWinN.sort((x, y) => x[0] - y[0])) { B.wallU(Mt.panel, c0, a, F1, yMC, MV0 + 0.02, true, 1.8); B.wallU(Mt.panel, a, b, F1, yMw0, MV0 + 0.02, true, 1.8); B.wallU(Mt.panel, a, b, yMw1, yMC, MV0 + 0.02, true, 1.8); for (const [x0, x1] of [[a, a + 0.04], [b - 0.04, b]]) B.box(Mt.darkOak, x0, x1, yMw0, yMw1, -41.95, MV0 + 0.04); B.box(Mt.darkOak, a, b, yMw0 - 0.06, yMw0, -41.95, MV0 + 0.12); B.box(Mt.darkOak, a, b, yMw1, yMw1 + 0.04, -41.95, MV0 + 0.04); c0 = b; } B.wallU(Mt.panel, c0, MU1, F1, yMC, MV0 + 0.02, true, 1.8); }
  B.wallU(Mt.panel, MU0, MU1, F1, yMC, MV1 - 0.02, false, 1.8);
  B.wallV(Mt.panel, MV0, mDoor[0], F1, yMC, MU1 - 0.02, false, 1.8); B.wallV(Mt.panel, mDoor[1], MV1, F1, yMC, MU1 - 0.02, false, 1.8); B.wallV(Mt.panel, mDoor[0], mDoor[1], F1 + 3.3, yMC, MU1 - 0.02, false, 1.8);
  { let c0 = MV0; for (const [a, b] of morWinW.sort((x, y) => x[0] - y[0])) { B.wallV(Mt.panel, c0, a, F1, yMC, MU0 + 0.02, true, 1.8); B.wallV(Mt.panel, a, b, F1, 3.55, MU0 + 0.02, true, 1.8); B.wallV(Mt.panel, a, b, 5.65, yMC, MU0 + 0.02, true, 1.8); c0 = b; } B.wallV(Mt.panel, c0, MV1, F1, yMC, MU0 + 0.02, true, 1.8); }
  // fluted oak piers with carved capitals, frieze under the ceiling
  for (let u = MU0 + 4.0; u < MU1 - 2; u += 6.2) for (const [v, s] of [[MV1 - 0.02, -1]]) { const t0 = Math.min(v, v + s * 0.25), t1 = Math.max(v, v + s * 0.25); B.box(Mt.darkOak, u - 0.55, u + 0.55, F1, yMC - 0.65, t0, t1); for (let k = -2; k <= 2; k++) B.box(Mt.soot, u + k * 0.18 - 0.03, u + k * 0.18 + 0.03, F1 + 0.5, yMC - 1.0, t1 - 0.01, t1 + 0.005, { detail: true }); B.box(Mt.darkOak, u - 0.68, u + 0.68, yMC - 0.65, yMC - 0.35, t0, t1 + 0.08); }
  for (const [a, b, c, d] of [[MU0, MU1, MV0 + 0.02, MV0 + 0.4], [MU0, MU1, MV1 - 0.4, MV1 - 0.02], [MU0 + 0.02, MU0 + 0.4, MV0, MV1], [MU1 - 0.4, MU1 - 0.02, MV0, MV1]]) B.box(Mt.plasterLt, a, b, yMC - 0.35, yMC, c, d, { bake: 0.85 });
  // bookcases with busts along the south wall, between the piers
  for (let u = MU0 + 4.9; u < MU1 - 3; u += 6.2) { B.box(Mt.darkOak, u, u + 4.4, F1, F1 + 1.75, MV1 - 0.45, MV1 - 0.02); const pl = new THREE.PlaneGeometry(4.2, 1.5); const ua = pl.attributes.uv; for (let i = 0; i < ua.count; i++) ua.setXY(i, ua.getX(i) * 4.2 / 1.6 + u * 0.3, ua.getY(i) * 0.75 + 0.25); pl.rotateY(Math.PI).translate(u + 2.2, F1 + 0.85, MV1 - 0.455); B.add(Mt.books, pl, { uv: 'keep' }); B.add(Mt.marbleW, new THREE.SphereGeometry(0.17, 10, 8).scale(1, 1.25, 1).translate(u + 2.2, F1 + 2.17, MV1 - 0.25), { detail: true }); B.box(Mt.marbleW, u + 2.05, u + 2.35, F1 + 1.75, F1 + 1.97, MV1 - 0.35, MV1 - 0.12); }
  // paintings in gilt frames on the east wall
  for (const v of [-38.0, -27.6]) { B.box(Mt.gilt, MU1 - 0.08, MU1 - 0.02, F1 + 1.5, F1 + 3.2, v - 0.75, v + 0.75); B.add(Mt.painting, new THREE.PlaneGeometry(1.26, 1.46).rotateY(-Math.PI / 2).translate(MU1 - 0.085, F1 + 2.35, v), { uv: 'keep' }); }
  // fireplace on the west wall (between its two windows)
  { const fv = (morWinW.length ? (morWinW[0][1] + morWinW[morWinW.length - 1][0]) / 2 : -32.0), u = MU0 + 0.02;
    B.box(Mt.marbleW, u, u + 0.45, F1, F1 + 1.35, fv - 0.92, fv + 0.92); B.box(Mt.soot, u, u + 0.46, F1, F1 + 0.95, fv - 0.6, fv + 0.6, { bake: 0.4 });
    B.box(Mt.marbleW, u, u + 0.6, F1 + 1.35, F1 + 1.47, fv - 1.0, fv + 1.0); B.box(Mt.darkOak, u, u + 0.2, F1 + 1.47, F1 + 3.4, fv - 0.9, fv + 0.9);
    B.box(Mt.gilt, u + 0.2, u + 0.24, F1 + 1.8, F1 + 3.1, fv - 0.6, fv + 0.6); B.add(Mt.painting, new THREE.PlaneGeometry(1.0, 1.1).rotateY(Math.PI / 2).translate(u + 0.245, F1 + 2.45, fv), { uv: 'keep' });
    B.box(Mt.marbleG, u + 0.45, u + 1.15, F1, F1 + 0.04, fv - 1.2, fv + 1.2);
    B.add(Mt.ember, new THREE.BoxGeometry(0.25, 0.12, 0.7).translate(u + 0.22, F1 + 0.1, fv), { bake: 1 });
    segs([[u, fv - 1.25], [u + 1.15, fv - 1.25], [u + 1.15, fv + 1.25], [u, fv + 1.25]], F1 - 1, F1 + 1.5); }
  // rugs, long book table, club chairs, sofas, floor lamps, chandeliers
  const mcU = (MU0 + MU1) / 2, mcV = (MV0 + MV1) / 2;
  { const rugs = [[mcU - 8.5, Mt.rug0], [mcU, Mt.rug1], [mcU + 8.5, Mt.rug1]];
    for (const [u, m] of rugs) { const g = new THREE.PlaneGeometry(4.6, 7.4).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).translate(u, F1 + 0.008, mcV); B.add(m, g, { uv: 'keep', bake: (x, y, z) => 1 - 0.2 * sstep(1.5, 3.7, Math.abs(z - mcV)) }); }
    const tblG = protoTable(3.6, 1.1); extra.push(inst(tblG, Mt.darkOak, [TRS(mcU - 8.5, F1, mcV - 0.2, Math.PI / 2)]));
    for (let k = 0; k < 7; k++) B.box(Mt.canvas, mcU - 9.9 + k * 0.42, mcU - 9.62 + k * 0.42, F1 + 0.76, F1 + 0.8, mcV - 0.45, mcV + 0.1 - (k % 2) * 0.2, { bake: 1 });
    const club = protoClubChair(), cols = [0x6a3440, 0x2e5652, 0x8a5440, 0x8c3238, 0x2a2624, 0x2e3448, 0x2f5e5c, 0x7c3036].map((h) => new THREE.Color(h));
    const cm = [], cc = [];
    const seat = (u, v, ry, ci) => { cm.push(TRS(u, F1, v, ry)); cc.push(cols[ci % cols.length]); };
    seat(mcU - 6.0, mcV - 2.4, -Math.PI * 0.75, 0); seat(mcU - 6.0, mcV + 2.2, Math.PI * 0.8, 1); seat(mcU - 11.5, mcV - 2.0, -Math.PI * 0.2, 2); seat(mcU - 11.4, mcV + 2.3, Math.PI * 0.25, 3);
    for (let k = 0; k < 5; k++) seat(mcU - 6 + k * 3.0, MV0 + 1.6, -Math.PI / 2, k % 2 ? 7 : 3);
    seat(mcU + 1.6, mcV - 1.8, Math.PI, 4); seat(mcU + 1.6, mcV + 1.8, Math.PI, 5); seat(mcU - 1.6, mcV - 1.8, 0, 4); seat(mcU - 1.6, mcV + 1.8, 0, 6);
    seat(mcU + 8.5, mcV - 3.0, -Math.PI / 2, 6); seat(mcU + 10.5, mcV + 2.6, Math.PI * 0.75, 0);
    extra.push(inst(club, Mt.uph, cm, { colors: cc }));
    { const bl = inst(new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2), Mt.blob, cm.map((M) => { const p = new THREE.Vector3().setFromMatrixPosition(M); return TRS(p.x, F1 + 0.012, p.z, 0); })); bl.renderOrder = 3; extra.push(bl); }
    const sofa = protoSofa(); extra.push(inst(sofa, Mt.uph, [TRS(mcU + 7.6, F1, mcV, Math.PI), TRS(mcU + 9.4, F1, mcV, 0)], { colors: [new THREE.Color(0x7b1d2e), new THREE.Color(0x7b1d2e)] }));
    for (const [u, v] of [[mcU - 1.6, mcV], [mcU + 1.6, mcV]]) { B.box(Mt.darkOak, u - 0.3, u + 0.3, F1, F1 + 0.55, v - 0.3, v + 0.3, { bake: 0.8 }); }
    const fl = [[mcU - 7.4, mcV - 2.6], [mcU - 12.4, mcV + 1.4], [mcU + 6.2, mcV + 1.9], [mcU + 11.0, mcV - 2.2], [mcU - 4.5, MV0 + 1.3], [mcU + 1.5, MV0 + 1.3], [mcU, mcV]];
    extra.push(inst(protoFloorLamp(), Mt.brass, fl.map(([u, v]) => TRS(u, F1, v, 0))));
    const shadeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.15, 0.5), side: THREE.DoubleSide });
    extra.push(inst(protoShade(), shadeMat, fl.map(([u, v]) => TRS(u, F1, v, 0))));
    const pm = fl.map(([u, v]) => TRS(u, F1 + 0.012, v, 0)); const pg = new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2); const pools = inst(pg, Mt.pool, pm); pools.renderOrder = 2; extra.push(pools);
    for (const u of [mcU - 8.5, mcU, mcU + 8.5]) { // brass chandeliers with candle bulbs
      B.add(Mt.brass, new THREE.CylinderGeometry(0.015, 0.015, 0.9, 4).translate(u, yMC - 0.45, mcV), { detail: true });
      B.add(Mt.brass, new THREE.TorusGeometry(0.75, 0.03, 5, 20).rotateX(Math.PI / 2).translate(u, yMC - 1.15, mcV));
      B.add(Mt.brass, new THREE.TorusGeometry(0.42, 0.025, 5, 16).rotateX(Math.PI / 2).translate(u, yMC - 0.85, mcV));
      B.add(Mt.brass, new THREE.SphereGeometry(0.16, 10, 8).scale(1, 1.4, 1).translate(u, yMC - 1.1, mcV));
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; B.add(Mt.brass, new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6).translate(u + Math.cos(a) * 0.75, yMC - 1.08, mcV + Math.sin(a) * 0.75)); B.add(Mt.glow, new THREE.SphereGeometry(0.05, 6, 4).scale(1, 1.6, 1).translate(u + Math.cos(a) * 0.75, yMC - 0.97, mcV + Math.sin(a) * 0.75), { bake: 1 }); }
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; B.add(Mt.glow, new THREE.SphereGeometry(0.045, 6, 4).scale(1, 1.6, 1).translate(u + Math.cos(a) * 0.42, yMC - 0.7, mcV + Math.sin(a) * 0.42), { bake: 1 }); }
    }
    colliders.push({ pts: [[mcU - 9.15, mcV - 2.0], [mcU - 7.85, mcV - 2.0], [mcU - 7.85, mcV + 1.6], [mcU - 9.15, mcV + 1.6]], y0: F1 - 1, y1: F1 + 0.8 });
    for (const [u, v] of [[mcU + 7.6, mcV], [mcU + 9.4, mcV]]) colliders.push({ pts: [[u - 0.45, v - 1.15], [u + 0.45, v - 1.15], [u + 0.45, v + 1.15], [u - 0.45, v + 1.15]], y0: F1 - 1, y1: F1 + 0.9 });
  }
  walkables.push({ type: 'poly', pts: [[MU0, MV0], [MU1, MV0], [MU1, mDoor[0]], [LU0 + 0.01, mDoor[0]], [LU0 + 0.01, mDoor[1]], [MU1, mDoor[1]], [MU1, MV1], [MU0, MV1]], y: F1 });
  segs([[MU0 + 0.3, MV0 + 0.3], [MU1 - 0.1, MV0 + 0.3]], yL0, yL1); segs([[MU0 + 0.3, MV1 - 0.5], [MU1 - 0.1, MV1 - 0.5]], yL0, yL1);
  segs([[MU0 + 0.3, MV0 + 0.3], [MU0 + 0.3, MV1 - 0.5]], yL0, yL1); segs([[MU1 - 0.1, MV0 + 0.3], [MU1 - 0.1, mDoor[0]]], yL0, yL1); segs([[MU1 - 0.1, mDoor[1]], [MU1 - 0.1, MV1 - 0.5]], yL0, yL1);
  segs([[MU1 - 0.1, mDoor[0]], [LU0, mDoor[0]]], yL0, yL1); segs([[MU1 - 0.1, mDoor[1]], [LU0, mDoor[1]]], yL0, yL1);

  // ---------------- finish ----------------
  B.finish(group);
  for (const m of extra) { m.castShadow = false; m.receiveShadow = !m.material.isMeshBasicMaterial; group.add(m); }
  const hands = { hourHand, minHand };
  return { group, colliders, walkables, hands,
    info: { F1, F2, HL, nrr: { U0, U1, vN, vS }, cs, landing: [cs, F2, vS + 1.2], lobby: [cs, F1, -30.0], morrison: [mcU, F1, mcV] } };
}

// per-frame: interior uniforms for time of day, clock hands
export function updateDoeInterior(st, env) {
  const night = env.night ?? 0, day = 1 - night;
  IU.uInAmb.value.setScalar(0.25);
  IU.uInSky.value.setRGB(0.27, 0.265, 0.25).multiplyScalar(day).add(new THREE.Color(0.3, 0.24, 0.16).multiplyScalar(night));
  IU.uInGnd.value.setRGB(0.21, 0.19, 0.16).multiplyScalar(day).add(new THREE.Color(0.15, 0.115, 0.075).multiplyScalar(night));
  IU.uInSpec.value = 0.35;
  const M = MATS;
  if (M) {
    const k = 0.12 + 0.85 * day; M.laylight.color.setRGB(1.0 * k, 0.9 * k, 0.72 * k);
    M.globes.opacity = 0.25 + 0.75 * night;
    M.pool.color.setRGB(0.3, 0.24, 0.16).multiplyScalar(0.25 + 1.1 * night);
    M.shadeGlow.color.setRGB(1.6, 1.25, 0.85).multiplyScalar(0.16 + 0.84 * night);
    M.sheen.color.setRGB(0.28, 0.29, 0.29).multiplyScalar(day);
    M.frosted.color.setRGB(0.78, 0.78, 0.74).multiplyScalar(0.15 + 0.85 * day);
    M.doorLight.color.setRGB(0.3, 0.25, 0.18).multiplyScalar(0.7 + 0.6 * night);
    M.streak.color.setRGB(0.22, 0.23, 0.23).multiplyScalar(0.08 + 0.92 * day);
  }
  if (st.hands && env.time) {
    const p = pacificParts(env.time); const mins = (p.hour % 12) * 60 + p.minute + p.second / 60;
    st.hands.minHand.rotation.z = ((p.minute + p.second / 60) / 60) * Math.PI * 2;
    st.hands.hourHand.rotation.z = (mins / 720) * Math.PI * 2;
  }
}
