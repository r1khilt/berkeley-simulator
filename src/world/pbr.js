// PBR surface library (gfx-materials).
// CC0 texture sets (Poly Haven, ambientCG; see public/assets/CREDITS.md) baked by tools/bake_pbr.py into
// public/assets/pbr/NAME_a.webp (RGB albedo, A roughness) and NAME_n.webp (RGB OpenGL normal, A height in [0.5,1]).
// They are packed into two DataArrayTextures shared by the ground shader (terrain.js), the procedural façade and
// roof shaders (buildings.js), and exposed as plain 2D maps for the shared landmark materials (materials.js).
// Disable with ?pbr=0 (falls back to the old procedural surfaces).
import * as THREE from 'three';

// Layer order == array index. size = real-world metres covered by one texture repeat.
// mean = linear albedo average of the baked set (manifest.json), used for the far-distance LOD
export const LAYERS = [
  ['asphalt', 3.0, [0.1344, 0.1298, 0.1186]], ['sidewalk', 4.04, [0.3966, 0.3784, 0.3473]], ['granite', 0.45, [0.4109, 0.3993, 0.3752]],
  ['brick', 3.0, [0.3903, 0.1774, 0.0981]], ['lawn', 2.0, [0.0743, 0.1139, 0.0376]], ['drygrass', 2.0, [0.2171, 0.1509, 0.0823]],
  ['litter', 3.0, [0.1086, 0.0813, 0.0521]], ['dirt', 3.0, [0.1829, 0.1455, 0.0972]], ['stucco', 1.2, [0.5817, 0.5468, 0.4886]],
  ['boardconc', 1.8, [0.2781, 0.2688, 0.2576]], ['concrete', 2.0, [0.307, 0.3003, 0.2759]], ['siding', 1.0, [0.3371, 0.2913, 0.2773]],
  ['rooftile', 4.0, [0.2539, 0.1274, 0.0681]],
];
export const L = Object.fromEntries(LAYERS.map(([n], i) => [n, i]));
export const SIZE_M = Object.fromEntries(LAYERS.map(([n, m]) => [n, m]));

export const PBR = {
  uA: { value: null }, uN: { value: null }, uOn: { value: 0 }, uHQ: { value: 0 }, // uHQ: ultra-only extras (anti-tiling 2nd tap)
  // ground height lookup so any material can find "height above ground" (grime at wall bases); set by CoreTerrain
  uGH: { value: null }, uGHRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uGHSize: { value: new THREE.Vector2(1, 1) },
  ready: null, res: 0, maps: {},
};
const qs = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const PBR_ENABLED = qs.get('pbr') !== '0';

// GLSL #defines for layer ids + shared helpers. Include once per shader (after <common>).
export const PBR_GLSL = /* glsl */`
${LAYERS.map(([n], i) => `#define L_${n.toUpperCase()} ${i}.0`).join('\n')}
uniform highp sampler2DArray uPbrA, uPbrN; uniform float uPbrOn, uPbrHQ;
const vec3 PBR_MEAN[${LAYERS.length}] = vec3[](${LAYERS.map(([, , m]) => `vec3(${m.map((v) => v.toFixed(4)).join(',')})`).join(',')});
struct PS { vec3 c; float r; vec2 g; float h; };
// one tap: c albedo (linear), r roughness, g surface slope along +u/+v of the uv used (image-up = -v), h height 0..1
PS pbrTap(vec2 uv, float Lr) {
  vec4 a = texture(uPbrA, vec3(uv, Lr)); vec4 n = texture(uPbrN, vec3(uv, Lr));
  PS s; s.c = a.rgb; s.r = a.a; s.g = vec2(n.r * 2.0 - 1.0, 1.0 - n.g * 2.0); s.h = n.a * 2.0 - 1.0; return s;
}
PS pbrMix(PS a, PS b, float w) { a.c = mix(a.c, b.c, w); a.r = mix(a.r, b.r, w); a.g = mix(a.g, b.g, w); a.h = mix(a.h, b.h, w); return a; }
// isotropic surfaces: blend with a rotated + offset copy where k (low-frequency noise 0..1) says so -> no visible repeat
PS pbrIso(vec2 p, float size, float Lr, float k) {
  if (uPbrHQ < 0.5) return pbrTap(p / size, Lr);   // perf gate: single tap below ultra
  float w0 = smoothstep(0.32, 0.68, k);
  vec2 q = vec2(0.766 * p.x - 0.643 * p.y, 0.643 * p.x + 0.766 * p.y) / size + vec2(0.31, 0.57);
  if (w0 <= 0.0) return pbrTap(p / size, Lr);
  PS b = pbrTap(q, Lr); b.g = vec2(0.766 * b.g.x + 0.643 * b.g.y, -0.643 * b.g.x + 0.766 * b.g.y);
  if (w0 >= 1.0) return b;
  PS a = pbrTap(p / size, Lr);
  return pbrMix(a, b, smoothstep(0.25, 0.75, w0 + (b.h - a.h) * 0.6));
}
// perturb world normal N with slope g given in the (u,v) parameterisation uv (cotangent frame from derivatives)
vec3 pbrPerturb(vec3 N, vec3 wpos, vec2 uv, vec2 g, float k) {
  vec3 dp1 = dFdx(wpos), dp2 = dFdy(wpos); vec2 duv1 = dFdx(uv), duv2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, N), dp1perp = cross(N, dp1);
  vec3 T = dp2perp * duv1.x + dp1perp * duv2.x, B = dp2perp * duv1.y + dp1perp * duv2.y;
  float im = inversesqrt(max(max(dot(T, T), dot(B, B)), 1e-20));
  return normalize(N + (T * g.x + B * g.y) * im * k);
}
`;
// Ground-height helpers (needs uniforms uGH, uGHRect, uGHSize)
export const GH_GLSL = /* glsl */`
uniform highp sampler2D uGH; uniform vec4 uGHRect; uniform vec2 uGHSize;
float groundAt(vec2 w) { vec2 f = (w - uGHRect.xy) / uGHRect.z; f = clamp(f, vec2(0.0), uGHSize - 1.001); ivec2 i = ivec2(floor(f)); vec2 t = f - vec2(i);
  float a = texelFetch(uGH, i, 0).r, b = texelFetch(uGH, i + ivec2(1, 0), 0).r, c = texelFetch(uGH, i + ivec2(0, 1), 0).r, d = texelFetch(uGH, i + ivec2(1, 1), 0).r;
  return mix(mix(a, b, t.x), mix(c, d, t.x), t.y); }
`;
export function pbrUniforms(target) { target.uPbrA = PBR.uA; target.uPbrN = PBR.uN; target.uPbrOn = PBR.uOn; target.uPbrHQ = PBR.uHQ; return target; }
export function ghUniforms(target) { target.uGH = PBR.uGH; target.uGHRect = PBR.uGHRect; target.uGHSize = PBR.uGHSize; return target; }

// ---- 2D maps for the shared landmark materials. materials.js hands over its existing (procedural) Texture objects;
// when the real set loads we swap their image source in place, so every material and every .clone() upgrades.
// target = mean colour (sRGB 0-255) the real map is normalised to, so colours authored against the old procedural
// textures keep working; tile = metres per uv unit the material uses (TEX_M).
export function adoptPBR(name, tex, target, tile = 2.0, src = name) {
  if (!PBR_ENABLED || PBR.maps[name]) return;
  const m = { map: tex.map, normalMap: tex.normalMap, roughnessMap: tex.roughnessMap, tile, src, target };
  PBR.maps[name] = m;
  if (!PBR.ready) initPBR(qs.get('q') || 'high');
  PBR.ready.then((ok) => { if (ok) fill2D(name, m); });
}
function swapImage(tex, canvas, repeat) { if (!tex) return; tex.source = new (THREE.TextureSource || THREE.Source)(canvas); if (repeat) tex.repeat.set(repeat, repeat); tex.needsUpdate = true; }
async function fill2D(name, m) {
  try {
    const S = PBR.res, S2 = PBR.res2;
    const base = (import.meta.env && import.meta.env.BASE_URL || '/') + 'assets/pbr/';
    const [ba, bn] = await Promise.all([loadBitmap(base + m.src + '_a.webp'), loadBitmap(base + m.src + '_n.webp')]);
    const pa = pixels(ba, S), pn = pixels(bn, S);
    if (name === 'ashlar') {
      const ga = canvasFrom(pa, S, 'rgb', S, m.target).getContext('2d').getImageData(0, 0, S, S).data;
      const ash = bakeAshlar(ga, pn, S, S >= 1024 ? 1024 : 512);
      swapImage(m.map, ash.a, 1); swapImage(m.normalMap, ash.n, 1); swapImage(m.roughnessMap, canvasFrom(pa, S, 'a', 256), m.tile / SIZE_M[m.src]);
      return;
    }
    const rep = m.tile / SIZE_M[m.src];
    swapImage(m.map, canvasFrom(pa, S, 'rgb', Math.min(S, S2), m.target), rep);
    swapImage(m.normalMap, canvasFrom(pn, S, 'rgb', Math.min(S, S2)), rep);
    swapImage(m.roughnessMap, canvasFrom(pa, S, 'a', Math.min(S, S2) / 2), rep);
  } catch (e) { console.warn('PBR 2D set', name, e.message); }
}

async function loadBitmap(url) {
  const r = await fetch(url); if (!r.ok) throw new Error('pbr: ' + url + ' ' + r.status);
  const b = await r.blob(); return createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
}
function pixels(bmp, S) {
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, S, S); return x.getImageData(0, 0, S, S).data;
}
function arrayTex(data, S, n, srgb) {
  const t = new THREE.DataArrayTexture(data, S, S, n);
  t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true;
  t.onUpdate = () => { t.image.data = null; }; // free the JS copy once it is on the GPU
  return t;
}
const S2L = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
const L2S = new Uint8Array(4096).map((_, i) => { const c = i / 4095; return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); });
// RGB from px (alpha forced opaque; optional per-channel gain so the mean hits target sRGB) or alpha replicated -> canvas
function canvasFrom(px, S, mode, outS = S, target = null) {
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); const id = x.createImageData(S, S); const d = id.data;
  let gain = null;
  if (mode === 'rgb' && target) {
    const m = [0, 0, 0]; for (let i = 0; i < px.length; i += 4 * 7) { m[0] += S2L[px[i]]; m[1] += S2L[px[i + 1]]; m[2] += S2L[px[i + 2]]; }
    const cnt = Math.ceil(px.length / 28); gain = m.map((v, k) => S2L[target[k]] / Math.max(1e-4, v / cnt));
  }
  for (let i = 0; i < d.length; i += 4) {
    if (mode === 'rgb' && gain) { for (let k = 0; k < 3; k++) d[i + k] = L2S[Math.min(4095, (S2L[px[i + k]] * gain[k] * 4095) | 0)]; }
    else if (mode === 'rgb') { d[i] = px[i]; d[i + 1] = px[i + 1]; d[i + 2] = px[i + 2]; }
    else { const v = px[i + 3]; d[i] = v; d[i + 1] = v; d[i + 2] = v; } // alpha channel -> grey (roughness)
    d[i + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  if (outS === S) return c;
  const o = document.createElement('canvas'); o.width = o.height = outS; const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(c, 0, 0, outS, outS); return o;
}

// Ashlar: Sierra White granite in 1.0 x 0.5 m staggered blocks with recessed joints, 2 m tile (matches materials.js TEX_M)
function bakeAshlar(ga, gn, S, outS) {
  // ga/gn: granite albedo/normal pixels at S covering 1 m -> tile 2x2 into outS covering 2 m
  const N = outS, a = new Uint8ClampedArray(N * N * 4), n = new Uint8ClampedArray(N * N * 4);
  const h = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const jw = 0.006 * N / 2; // joint half-width in px (~6 mm)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const um = x / N * 2, vm = (N - 1 - y) / N * 2; // metres in the tile (v up; canvas row 0 = top)
    const CH = 1.0, BL = 2.0; const row = Math.floor(vm / CH), off = (row % 2) * 0.5; const ub = um / BL + off, col = Math.floor(ub); // large ashlar: 2.0 x 1.0 m
    const fu = ub - col, fv = vm / CH - row;
    const dx = Math.min(fu, 1 - fu) * BL, dy = Math.min(fv, 1 - fv) * CH; const d = Math.min(dx, dy) * N / 2; // px to nearest joint
    // per-block texture offset so neighbouring blocks never show the same grain
    const ox = Math.floor(h(col, row) * S), oy = Math.floor(h(row, col + 7) * S);
    const sx = (Math.floor(x * S * 4 / N) + ox) % S, sy = (Math.floor(y * S * 4 / N) + oy) % S; /* granite set = 0.45 m -> ~0.5 m grain period */ const si = (sy * S + sx) * 4, i = (y * N + x) * 4;
    const tone = 1.0;
    const j = Math.max(0, Math.min(1, (jw + 1.2 - d) / 2.4)); // 1 in the joint
    const bev = Math.max(0, Math.min(1, (d - jw) / (jw * 2.5)));
    const k = (1 - j) * tone * (0.96 + 0.04 * bev) + j * 0.9; // tight, nearly invisible joints
    a[i] = ga[si] * k; a[i + 1] = ga[si + 1] * k; a[i + 2] = ga[si + 2] * (k * 0.99); a[i + 3] = 255;
    // normal: granite detail, plus bevel slopes facing out of the joint
    let nx = (gn[si] / 127.5 - 1) * 0.8, ny = (gn[si + 1] / 127.5 - 1) * 0.8;
    if (bev < 1 && j < 1) { const s = 0.55 * (1 - bev); if (dx < dy) nx += (fu < 0.5 ? -1 : 1) * s; else ny += (fv < 0.5 ? -1 : 1) * s; } // bevels face out of the joint (+y = up)
    const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny)); const l = Math.hypot(nx, ny, nz);
    n[i] = (nx / l * 0.5 + 0.5) * 255; n[i + 1] = (ny / l * 0.5 + 0.5) * 255; n[i + 2] = (nz / l * 0.5 + 0.5) * 255; n[i + 3] = 255;
  }
  const toC = (arr) => { const c = document.createElement('canvas'); c.width = c.height = N; c.getContext('2d').putImageData(new ImageData(arr, N, N), 0, 0); return c; };
  return { a: toC(a), n: toC(n) };
}

export function initPBR(quality = 'high') {
  if (PBR.ready) return PBR.ready;
  if (!PBR_ENABLED) { PBR.ready = Promise.resolve(false); return PBR.ready; }
  const S = (quality === 'low' || quality === 'medium') ? 512 : 1024; PBR.res = S;
  PBR.uHQ.value = (quality === 'ultra' || qs.get('pbrhq') === '1') ? 1 : 0;
  PBR.res2 = quality === 'ultra' ? 1024 : 512; // 2D landmark maps (ashlar always at the array resolution)
  const base = (import.meta.env && import.meta.env.BASE_URL || '/') + 'assets/pbr/';
  const t0 = performance.now();
  PBR.ready = (async () => {
    const n = LAYERS.length;
    const bmps = await Promise.all(LAYERS.flatMap(([nm]) => [loadBitmap(base + nm + '_a.webp'), loadBitmap(base + nm + '_n.webp')]));
    const A = new Uint8Array(S * S * 4 * n), Nn = new Uint8Array(S * S * 4 * n);
    for (let i = 0; i < n; i++) {
      const nm = LAYERS[i][0];
      const pa = pixels(bmps[2 * i], S), pn = pixels(bmps[2 * i + 1], S);
      A.set(pa, i * S * S * 4); Nn.set(pn, i * S * S * 4);
      bmps[2 * i].close && bmps[2 * i].close(); bmps[2 * i + 1].close && bmps[2 * i + 1].close();
      if (i % 3 === 2) await new Promise((r) => setTimeout(r, 0));
    }
    PBR.uA.value = arrayTex(A, S, n, true); PBR.uN.value = arrayTex(Nn, S, n, false);
    PBR.uOn.value = 1;
    PBR.loadMs = Math.round(performance.now() - t0);
    return true;
  })().catch((e) => { console.warn('PBR textures unavailable, using procedural surfaces:', e.message); return false; });
  return PBR.ready;
}

// ---- weathering for the shared landmark materials that use a PBR set (granite, ashlar, concrete, stucco, brick, ...):
// splash-zone grime at the foot of walls (true height above local ground) and large-scale tone drift.
// Installed per material by main.js setupMaterials (works for clones; idempotent).
import { noiseTexture } from './noiseTex.js';
export function isPBRMat(m) { if (!PBR_ENABLED || !m || !m.map) return false; for (const k in PBR.maps) if (PBR.maps[k].map === m.map) return true; return false; }
export function pbrWeather(mat) {
  if (mat && mat.userData && mat.userData.groundTurf) { turfWorld(mat); return; } // r4-ground: shared turf -> real lawn texture
  if (!isPBRMat(mat) || mat.userData.pbrWeather) return;
  mat.userData.pbrWeather = 1;
  const k0 = mat.customProgramCacheKey ? String(mat.customProgramCacheKey()) : '';
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = function (sh, r) {
    if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev.call(this, sh, r);
    if (sh.vertexShader.includes('varying vec3 vWPW')) return;
    ghUniforms(sh.uniforms); sh.uniforms.uNoiseW = { value: noiseTexture() }; sh.uniforms.uPbrOn = PBR.uOn;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPW;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
 { vec4 wpw = vec4(transformed, 1.0);
   #ifdef USE_INSTANCING
   wpw = instanceMatrix * wpw;
   #endif
   vWPW = (modelMatrix * wpw).xyz; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPW; uniform sampler2D uNoiseW; uniform float uPbrOn;\n' + GH_GLSL)
      .replace('#include <map_fragment>', `#include <map_fragment>
 if (uPbrOn > 0.5 && distance(vWPW, cameraPosition) < 120.0) {
   float hgW = vWPW.y - groundAt(vWPW.xz);
   float nW = texture(uNoiseW, vec2(vWPW.x + vWPW.z, vWPW.y * 0.2) * 0.35).r;
   float grW = (1.0 - smoothstep(0.05, 0.4 + 0.7 * nW, hgW)) * step(-1.5, hgW);
   diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.64, 0.6, 0.54) + vec3(0.01, 0.008, 0.006), grW * 0.6);
   diffuseColor.rgb *= 0.95 + 0.1 * texture(uNoiseW, vWPW.xz * 0.011 + vWPW.y * 0.004).r;
   #ifdef PBR_ASHLAR
   { vec2 bu = vMapUv * vec2(1.0, 2.0); float rw = floor(bu.y); vec2 cell = vec2(floor(bu.x + mod(rw, 2.0) * 0.5), rw);
     vec3 p3 = fract(vec3(cell.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); float hb = fract((p3.x + p3.y) * p3.z);
     diffuseColor.rgb *= 0.965 + 0.06 * hb; }
   #endif
 }`);
  };
  if (PBR.maps.ashlar && mat.map === PBR.maps.ashlar.map) { mat.defines = Object.assign({}, mat.defines, { PBR_ASHLAR: '' }); }
  mat.customProgramCacheKey = () => k0 + '|pbrw' + (PBR.maps.ashlar && mat.map === PBR.maps.ashlar.map ? 'a' : '');
  mat.needsUpdate = true;
}

// r4-ground: the shared 'turf' material (planter lawns, grassy berms, hedges cloned from it) was a flat untextured green
// that read as a neon patch next to the textured terrain lawn. This samples the same CC0 lawn set as the terrain in
// world space (triplanar, so custom geometry without UVs works) and keeps the authored colour as the mean.
export function turfWorld(mat) {
  if (!PBR_ENABLED || mat.userData.turfWorld) return;
  mat.userData.turfWorld = 1;
  const k0 = mat.customProgramCacheKey ? String(mat.customProgramCacheKey()) : '';
  const prev = mat.onBeforeCompile;
  const mean = LAYERS[L.lawn][2].map((v) => v.toFixed(4)).join(',');
  mat.onBeforeCompile = function (sh, r) {
    if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev.call(this, sh, r);
    if (sh.vertexShader.includes('varying vec3 vWPT')) return;
    sh.uniforms.uPbrA = PBR.uA; sh.uniforms.uPbrOn = PBR.uOn;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPT; varying vec3 vWNT;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
 { vec4 wpt = vec4(transformed, 1.0); vec3 nt = objectNormal;
   #ifdef USE_INSTANCING
   wpt = instanceMatrix * wpt; nt = mat3(instanceMatrix) * nt;
   #endif
   vWPT = (modelMatrix * wpt).xyz; vWNT = normalize(mat3(modelMatrix) * nt); }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPT; varying vec3 vWNT; uniform highp sampler2DArray uPbrA; uniform float uPbrOn;')
      .replace('#include <map_fragment>', `#include <map_fragment>
 if (uPbrOn > 0.5) {
   vec3 an = abs(vWNT) + 1e-3; an = an * an * an; an /= an.x + an.y + an.z;
   vec3 tt = texture(uPbrA, vec3(vWPT.xz * 0.5, ${L.lawn}.0)).rgb * an.y + texture(uPbrA, vec3(vWPT.zy * 0.5, ${L.lawn}.0)).rgb * an.x + texture(uPbrA, vec3(vWPT.xy * 0.5, ${L.lawn}.0)).rgb * an.z;
   diffuseColor.rgb *= clamp(tt / vec3(${mean}), 0.0, 3.0);
 }`);
  };
  mat.customProgramCacheKey = () => k0 + '|turfw';
  mat.needsUpdate = true;
}
