// Photographic post pipeline for high/ultra (gfx-post).
// scene -> HDR MSAA target (+depth) -> [GTAO half-res + depth-aware blur] -> [bloom mip chain]
//       -> final pass: AO on ambient light only, physically based aerial perspective, bloom, exposure, AgX + look,
//          vignette, grain, dither -> screen (or LDR target -> SMAA on ultra).
// Cost on high: 1 HDR resolve + 3 half-res passes + 7 tiny bloom passes + 1 full-res composite.
import * as THREE from 'three';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { toneGLSL, LOOK, AOU } from '../world/grading.js';
import { ATMO_GLSL } from './atmosphere.js';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const PRESETS = {
  medium: { msaa: 2, ao: false, bloom: false, smaa: false, grain: 0.0, aoSlices: 2, aoSteps: 4 },
  high: { msaa: 4, ao: true, bloom: true, bloomLevels: 4, smaa: false, grain: 0.006, aoSlices: 2, aoSteps: 5 },
  ultra: { msaa: 4, ao: true, bloom: true, bloomLevels: 5, smaa: true, grain: 0.008, aoSlices: 3, aoSteps: 7 },
};
const DEPTH_GLSL = (reversed, logd) => /* glsl */`
uniform sampler2D tDepth; uniform mat4 uProj, uProjInv; uniform float uFar;
float bsViewZ(float d){
#if ${logd ? 1 : 0}
  return -(exp2(d * log2(uFar + 1.0)) - 1.0);
#else
  float z = ${reversed ? 'd' : 'd * 2.0 - 1.0'};
  return (uProjInv[2][2] * z + uProjInv[3][2]) / (uProjInv[2][3] * z + uProjInv[3][3]);
#endif
}
bool bsIsSky(float d){ return ${reversed && !logd ? 'd <= 0.0' : 'd >= 1.0'}; }
vec3 bsViewPos(vec2 uv, float z){ return vec3((uv * 2.0 - 1.0) * (-z) / vec2(uProj[0][0], uProj[1][1]), z); }
`;
const FS_AO = (reversed, logd, slices, steps) => /* glsl */`varying vec2 vUv;
${DEPTH_GLSL(reversed, logd)}
uniform vec2 uRes; uniform float uRadius;
#define PI 3.14159265
vec3 vp(vec2 uv){ float d = texture2D(tDepth, uv).r; return bsViewPos(uv, bsIsSky(d) ? -6.0e4 : bsViewZ(d)); }
float bayer4(vec2 p){ vec2 q = mod(floor(p), 4.0); float b[16]; b[0]=0.;b[1]=8.;b[2]=2.;b[3]=10.;b[4]=12.;b[5]=4.;b[6]=14.;b[7]=6.;b[8]=3.;b[9]=11.;b[10]=1.;b[11]=9.;b[12]=15.;b[13]=7.;b[14]=13.;b[15]=5.; return b[int(q.y * 4.0 + q.x)] / 16.0; }
void main(){
  float d0 = texture2D(tDepth, vUv).r;
  if (bsIsSky(d0)) { gl_FragColor = vec4(1.0, 6.0e4, 0.0, 1.0); return; }
  vec2 px = 1.0 / uRes;
  vec3 p = bsViewPos(vUv, bsViewZ(d0));
  vec3 pr = vp(vUv + vec2(px.x, 0.0)), pl = vp(vUv - vec2(px.x, 0.0)), pu = vp(vUv + vec2(0.0, px.y)), pd = vp(vUv - vec2(0.0, px.y));
  vec3 dx = abs(pr.z - p.z) < abs(p.z - pl.z) ? pr - p : p - pl;
  vec3 dy = abs(pu.z - p.z) < abs(p.z - pd.z) ? pu - p : p - pd;
  vec3 n = normalize(cross(dx, dy));
  vec3 V = normalize(-p);
  float dist = -p.z;
  float rad = uRadius * (1.0 + smoothstep(30.0, 300.0, dist) * 3.0);          // widen with distance so far buildings still ground
  float rpx = rad * uProj[1][1] * 0.5 * uRes.y / dist;
  if (rpx < 1.5) { gl_FragColor = vec4(1.0, dist, 0.0, 1.0); return; }
  rpx = min(rpx, uRes.y * 0.12);
  float jit = bayer4(gl_FragCoord.xy), jit2 = bayer4(gl_FragCoord.xy + vec2(2.0, 1.0));
  float falloffRange = 0.615 * rad, falloffFrom = rad * (1.0 - 0.615);
  float fMul = -1.0 / falloffRange, fAdd = falloffFrom / falloffRange + 1.0;
  float vis = 0.0;
  for (int s = 0; s < ${slices}; s++) {
    float phi = (float(s) + jit) * PI / ${slices}.0;
    vec2 om = vec2(cos(phi), sin(phi));
    vec3 dirV = vec3(om, 0.0);
    vec3 orthoD = dirV - dot(dirV, V) * V;
    vec3 axis = normalize(cross(orthoD, V));
    vec3 pn = n - axis * dot(n, axis); float pnl = length(pn);
    float sgn = sign(dot(orthoD, pn)); float cn = clamp(dot(pn, V) / max(pnl, 1e-4), 0.0, 1.0);
    float na = sgn * acos(cn);
    float lo0 = cos(na + PI * 0.5), lo1 = cos(na - PI * 0.5);
    float h0 = lo0, h1 = lo1;
    for (int k = 0; k < ${steps}; k++) {
      float t = (float(k) + jit2) / ${steps}.0; t = t * t;
      vec2 off = om * max(t * rpx, float(k) + 1.0) * px;
      vec3 s0 = vp(vUv + off) - p, s1 = vp(vUv - off) - p;
      float l0 = length(s0), l1 = length(s1);
      float c0 = dot(s0, V) / max(l0, 1e-4), c1 = dot(s1, V) / max(l1, 1e-4);
      c0 = mix(lo0, c0, clamp(l0 * fMul + fAdd, 0.0, 1.0)); c1 = mix(lo1, c1, clamp(l1 * fMul + fAdd, 0.0, 1.0));
      h0 = max(h0, c0); h1 = max(h1, c1);
    }
    float a1 = -acos(clamp(h1, -1.0, 1.0)), a0 = acos(clamp(h0, -1.0, 1.0));   // h1: -dir side, h0: +dir side
    a1 = na + clamp(a1 - na, -PI * 0.5, PI * 0.5); a0 = na + clamp(a0 - na, -PI * 0.5, PI * 0.5);
    float i1 = (cn + 2.0 * a1 * sin(na) - cos(2.0 * a1 - na)) * 0.25;
    float i0 = (cn + 2.0 * a0 * sin(na) - cos(2.0 * a0 - na)) * 0.25;
    vis += pnl * (i0 + i1);
  }
  vis = clamp(vis / ${slices}.0, 0.0, 1.0); if (isnan(vis)) vis = 1.0;
  // r4-ground: fade GTAO out on surfaces seen at grazing angles (lawns/plazas beyond ~10 m at eye height): their LiDAR
  // micro-relief self-occludes in screen space and showed up as barcode/streak bands. The terrain has its own baked AO.
  // the fade uses a wide-stencil normal (+-4 px) so 1 m terrain facets don't re-introduce the bands
  { vec3 r4 = vp(vUv + vec2(4.0 * px.x, 0.0)), l4 = vp(vUv - vec2(4.0 * px.x, 0.0)), u4 = vp(vUv + vec2(0.0, 4.0 * px.y)), d4 = vp(vUv - vec2(0.0, 4.0 * px.y));
    vec3 nW = normalize(cross(abs(r4.z - p.z) < abs(p.z - l4.z) ? r4 - p : p - l4, abs(u4.z - p.z) < abs(p.z - d4.z) ? u4 - p : p - d4));
    vis = mix(1.0, vis, smoothstep(0.1, 0.35, abs(dot(nW, V)))); }
  gl_FragColor = vec4(vis, min(dist, 6.0e4), 0.0, 1.0);
}`;
const FS_AOBLUR = /* glsl */`varying vec2 vUv; uniform sampler2D tAO; uniform vec2 uRes;
void main(){ vec2 c = texture2D(tAO, vUv).rg; if (c.g > 5.9e4) { gl_FragColor = vec4(1.0, c.g, 0.0, 1.0); return; } float sum = 0.0, wsum = 0.0;
  for (int y = -2; y <= 1; y++) for (int x = -2; x <= 1; x++) { vec2 s = texture2D(tAO, vUv + (vec2(x, y) + 0.5) / uRes).rg;
    float w = exp(-min(abs(s.g - c.g) / (0.06 * c.g + 0.1), 40.0)); sum += s.r * w; wsum += w; }
  float r = sum / max(wsum, 1e-6); gl_FragColor = vec4(isnan(r) ? 1.0 : r, c.g, 0.0, 1.0); }`;
const FS_DOWN = /* glsl */`varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uFirst; uniform float uExposure;
vec3 s(vec2 o){ vec3 c = texture2D(tSrc, vUv + o * uTexel).rgb; if (uFirst > 0.5) { c = any(isnan(c)) ? vec3(0.0) : clamp(c * uExposure, 0.0, 24.0); } return c; }
void main(){ // 13-tap (CoD: AW) downsample, Karis-weighted on the first level to kill fireflies (sun glints)
  vec3 a = s(vec2(-2,2)), b = s(vec2(0,2)), c = s(vec2(2,2)), d = s(vec2(-2,0)), e = s(vec2(0,0)), f = s(vec2(2,0)), g = s(vec2(-2,-2)), h = s(vec2(0,-2)), i = s(vec2(2,-2)), j = s(vec2(-1,1)), k = s(vec2(1,1)), l = s(vec2(-1,-1)), m = s(vec2(1,-1));
  vec3 r;
  if (uFirst > 0.5) {
    vec3 g0 = (a+b+d+e)*0.25, g1 = (b+c+e+f)*0.25, g2 = (d+e+g+h)*0.25, g3 = (e+f+h+i)*0.25, g4 = (j+k+l+m)*0.25;
    float w0 = 1.0/(1.0+dot(g0,vec3(0.2126,0.7152,0.0722))), w1 = 1.0/(1.0+dot(g1,vec3(0.2126,0.7152,0.0722))), w2 = 1.0/(1.0+dot(g2,vec3(0.2126,0.7152,0.0722))), w3 = 1.0/(1.0+dot(g3,vec3(0.2126,0.7152,0.0722))), w4 = 1.0/(1.0+dot(g4,vec3(0.2126,0.7152,0.0722)));
    r = (g0*w0*0.125 + g1*w1*0.125 + g2*w2*0.125 + g3*w3*0.125 + g4*w4*0.5) / (w0*0.125 + w1*0.125 + w2*0.125 + w3*0.125 + w4*0.5);
  } else r = e*0.125 + (a+c+g+i)*0.03125 + (b+d+f+h)*0.0625 + (j+k+l+m)*0.125;
  gl_FragColor = vec4(r, 1.0); }`;
const FS_UP = /* glsl */`varying vec2 vUv; uniform sampler2D tSrc, tBase; uniform vec2 uTexel; uniform float uRadius;
void main(){ vec2 t = uTexel * uRadius; // 9-tap tent upsample + current level
  vec3 c = texture2D(tSrc, vUv + vec2(-t.x, t.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, t.y)).rgb * 2.0 + texture2D(tSrc, vUv + t).rgb
         + texture2D(tSrc, vUv + vec2(-t.x, 0.0)).rgb * 2.0 + texture2D(tSrc, vUv).rgb * 4.0 + texture2D(tSrc, vUv + vec2(t.x, 0.0)).rgb * 2.0
         + texture2D(tSrc, vUv - t).rgb + texture2D(tSrc, vUv + vec2(0.0, -t.y)).rgb * 2.0 + texture2D(tSrc, vUv + vec2(t.x, -t.y)).rgb;
  gl_FragColor = vec4(c / 16.0 + texture2D(tBase, vUv).rgb, 1.0); }`;
const FS_FINAL = (reversed, logd) => /* glsl */`varying vec2 vUv;
uniform sampler2D tColor, tAO, tBloom, uSkyLUT, uTrans;
uniform vec3 uSunDirW, uNightFog; uniform float uCamR, uSunTOA, uCamAltKm, uSkyBoost;
uniform mat4 uViewInv; uniform vec2 uRes, uAORes;
uniform float uExposure, uBloom, uAOStrength, uAPMul, uVignette, uGrain, uTime, uUseAO, uUseBloom, uUseAP, uUnknownAmb;
${DEPTH_GLSL(reversed, logd)}
${ATMO_GLSL}
${toneGLSL(true)}
float bsHash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
float aoUp(vec2 uv, float dist){ // depth-aware 2x2 upsample of the half-res AO
  vec2 t = uv * uAORes - 0.5; vec2 f = fract(t); vec2 b = (floor(t) + 0.5) / uAORes; vec2 o = 1.0 / uAORes;
  vec2 a00 = texture2D(tAO, b).rg, a10 = texture2D(tAO, b + vec2(o.x, 0.0)).rg, a01 = texture2D(tAO, b + vec2(0.0, o.y)).rg, a11 = texture2D(tAO, b + o).rg;
  vec4 w = vec4((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y);
  vec4 dz = abs(vec4(a00.g, a10.g, a01.g, a11.g) - dist) / (0.03 * dist + 0.05);
  w *= exp(-min(dz * dz, 60.0)) + 1e-4;
  float r = dot(w, vec4(a00.r, a10.r, a01.r, a11.r)) / (w.x + w.y + w.z + w.w);
  return isnan(r) ? 1.0 : clamp(r, 0.0, 1.0);
}
vec3 aerial(vec3 col, vec3 dir, float distM){
  float d = distM * 0.001, mu = dir.y, h0 = uCamAltKm;
  d = d - 0.6 * (1.0 - exp(-d / 0.6));   // soft onset: near field stays crisp (quadratic below ~600 m), far field unchanged
  float xr = d * mu / 8.0, xm = d * mu / 1.2;
  float fr = abs(xr) > 1e-3 ? (1.0 - exp(-xr)) / xr : 1.0 - 0.5 * xr;
  float fm = abs(xm) > 1e-3 ? (1.0 - exp(-xm)) / xm : 1.0 - 0.5 * xm;
  vec3 tau = uRayScat * exp(-h0 / 8.0) * d * fr + vec3(uMieExt * exp(-h0 / 1.2) * d * fm);
  vec3 T = exp(-tau);
  vec3 dc = normalize(vec3(dir.x, max(dir.y, 0.0), dir.z));
  vec3 Ls = aSkyLUT(uSkyLUT, dc, uSunDirW, uCamR) * uSunTOA * uSkyBoost;
  vec3 Tf = mu > 0.0 ? aTLUT(uTrans, vec3(0.0, uCamR, 0.0), dc) : vec3(0.0);
  vec3 F = min((1.0 - T) / max(1.0 - Tf, vec3(1e-3)), vec3(1.0));
  return col * T + (Ls * uAPMul * F) + uNightFog * (1.0 - T);
}
void main(){
  vec4 src = texture2D(tColor, vUv); vec3 col = any(isnan(src.rgb)) ? vec3(0.0) : clamp(src.rgb, 0.0, 6.0e4);
  float d = texture2D(tDepth, vUv).r;
  if (!bsIsSky(d)) {
    float z = bsViewZ(d); vec3 p = bsViewPos(vUv, z);
    if (uUseAO > 0.5) { float ao = aoUp(vUv, -z); float amb = src.a > 0.495 ? uUnknownAmb : src.a / 0.49; amb = 0.25 + 0.75 * amb;   // mostly ambient-only, plus a little contact darkening of direct light
      col *= 1.0 - clamp(amb * 1.1, 0.0, 1.0) * (1.0 - ao) * uAOStrength; }
    if (uUseAP > 0.5) { vec3 wd = normalize((uViewInv * vec4(p, 0.0)).xyz); col = aerial(col, wd, length(p)); }
  }
  if (uUseBloom > 0.5) col = mix(col * uExposure, texture2D(tBloom, vUv).rgb, uBloom); else col *= uExposure;
  col = bsimTonemap(col);
  vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y; col *= 1.0 - uVignette * dot(q, q) * 1.6;
  float n = bsHash(gl_FragCoord.xy + fract(uTime) * 517.0) - 0.5;
  col += n * uGrain * (0.35 + sqrt(max(col, 0.0)) * 0.65) ;
  col = clamp(col, 0.0, 1.0);
  col = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));   // sRGB OETF
  col += (bsHash(gl_FragCoord.yx * 1.37 + 3.1) - 0.5) / 255.0;                                      // dither (no sky banding)
  gl_FragColor = vec4(col, 1.0);
}`;

function pass(fs, uniforms) {
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); mesh.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(mesh); return { scene, mat, mesh };
}
const CAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

export class PostPipeline {
  constructor({ renderer, scene, camera, sky, quality = 'high' }) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.sky = sky;
    const qs = new URLSearchParams(location.search);
    this.cfg = Object.assign({}, PRESETS[quality] || PRESETS.high);
    if (qs.get('noao')) this.cfg.ao = false; if (qs.get('nobloom')) this.cfg.bloom = false; if (qs.get('smaa')) this.cfg.smaa = qs.get('smaa') !== '0';
    if (qs.get('ao') === '1') this.cfg.ao = true;
    const caps = renderer.capabilities;
    this.reversed = !!(renderer.state && renderer.state.buffers.depth.getReversed && renderer.state.buffers.depth.getReversed());
    this.logd = !this.reversed && !!caps.logarithmicDepthBuffer;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2()); this.w = size.x; this.h = size.y;
    const dt = new THREE.DepthTexture(this.w, this.h); dt.type = THREE.FloatType; dt.minFilter = dt.magFilter = THREE.NearestFilter; this.depthTex = dt;
    this.sceneRT = new THREE.WebGLRenderTarget(this.w, this.h, { type: THREE.HalfFloatType, samples: Math.min(this.cfg.msaa, caps.maxSamples || 4), depthTexture: dt, depthBuffer: true, stencilBuffer: false });
    const half = () => new THREE.WebGLRenderTarget(Math.max(1, this.w >> 1), Math.max(1, this.h >> 1), { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    const common = { tDepth: { value: dt }, uProj: { value: camera.projectionMatrix }, uProjInv: { value: camera.projectionMatrixInverse }, uFar: { value: camera.far } };
    if (this.cfg.ao) {
      this.aoRT = half(); this.aoRT2 = half(); this.aoRT.texture.minFilter = this.aoRT.texture.magFilter = THREE.NearestFilter; this.aoRT2.texture.minFilter = this.aoRT2.texture.magFilter = THREE.NearestFilter;
      this.aoPass = pass(FS_AO(this.reversed, this.logd, this.cfg.aoSlices, this.cfg.aoSteps), Object.assign({ uRes: { value: new THREE.Vector2(this.w, this.h) }, uRadius: { value: 2.0 } }, common));
      this.aoBlur = pass(FS_AOBLUR, { tAO: { value: this.aoRT.texture }, uRes: { value: new THREE.Vector2(this.w >> 1, this.h >> 1) } });
      AOU.uCAOMin.value = 0.72;   // let GTAO do the contact darkening; keep a softer height-based term for big-scale sky occlusion
    }
    if (this.cfg.bloom) {
      this.bloomRTs = []; let w = this.w, h = this.h;
      for (let i = 0; i < this.cfg.bloomLevels; i++) { w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); this.bloomRTs.push(new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter })); }
      this.upRTs = this.bloomRTs.slice(0, -1).map((r) => r.clone());
      this.down = pass(FS_DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uFirst: { value: 1 }, uExposure: { value: 1 } });
      this.up = pass(FS_UP, { tSrc: { value: null }, tBase: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1.0 } });
    }
    const A = sky.atmo ? sky.atmo.U : null;
    this.U = Object.assign({
      tColor: { value: this.sceneRT.texture }, tAO: { value: this.cfg.ao ? this.aoRT2.texture : null }, tBloom: { value: this.cfg.bloom ? this.bloomRTs[0].texture : null },
      uViewInv: { value: camera.matrixWorld }, uRes: { value: new THREE.Vector2(this.w, this.h) }, uAORes: { value: new THREE.Vector2(this.w >> 1, this.h >> 1) },
      uExposure: { value: 1 }, uBloom: { value: 0.012 }, uAOStrength: { value: 1.4 }, uAPMul: { value: 0.85 }, uVignette: { value: 0.16 }, uGrain: { value: this.cfg.grain }, uTime: { value: 0 },
      uUseAO: { value: this.cfg.ao ? 1 : 0 }, uUseBloom: { value: this.cfg.bloom ? 1 : 0 }, uUseAP: { value: A ? 1 : 0 }, uUnknownAmb: { value: 0.65 },
      uNightFog: { value: new THREE.Color(0, 0, 0) }, uCamAltKm: { value: 0.1 },
    }, common, A || { uSkyLUT: { value: null }, uTrans: { value: null }, uSunDirW: { value: new THREE.Vector3() }, uCamR: { value: 6360.1 }, uSunTOA: { value: 1 }, uSkyBoost: { value: 1 }, uRayScat: { value: new THREE.Vector3() }, uMieScat: { value: 0 }, uMieExt: { value: 0 }, uOzone: { value: new THREE.Vector3() }, uMieG: { value: 0.8 } });
    for (const k of Object.keys(LOOK)) this.U['uLook_' + k] = { value: LOOK[k] };
    this.final = pass(FS_FINAL(this.reversed, this.logd), this.U); this.bloomDay = this.U.uBloom.value;
    if (this.cfg.smaa) { this.ldrRT = new THREE.WebGLRenderTarget(this.w, this.h, { type: THREE.UnsignedByteType, depthBuffer: false }); this.smaa = new SMAAPass(); this.smaa.renderToScreen = true; this.smaa.setSize(this.w, this.h); }
    sky.postAP = !!A;   // material fog off: aerial perspective happens here, per pixel, with the real sky radiance
    this.enabled = true;
  }
  setSize(w, h) {
    this.w = w; this.h = h; this.sceneRT.setSize(w, h);
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    if (this.cfg.ao) { this.aoRT.setSize(hw, hh); this.aoRT2.setSize(hw, hh); this.aoPass.mat.uniforms.uRes.value.set(w, h); this.aoBlur.mat.uniforms.uRes.value.set(hw, hh); }
    if (this.cfg.bloom) { let bw = w, bh = h; this.bloomRTs.forEach((r, i) => { bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1); r.setSize(bw, bh); if (this.upRTs[i]) this.upRTs[i].setSize(bw, bh); }); }
    this.U.uRes.value.set(w, h); this.U.uAORes.value.set(hw, hh);
    if (this.smaa) { this.ldrRT.setSize(w, h); this.smaa.setSize(w, h); }
  }
  _q(p, target) { const r = this.renderer; r.setRenderTarget(target); r.render(p.scene, CAM); }
  render(dt = 0.016) {
    const r = this.renderer, cam = this.camera;
    const size = r.getDrawingBufferSize(_v2); if (size.x !== this.w || size.y !== this.h) this.setSize(size.x, size.y);
    const prevTarget = r.getRenderTarget(), prevAuto = r.autoClear;
    r.setRenderTarget(this.sceneRT); r.clear(true, true, false); r.render(this.scene, cam);
    r.autoClear = true;
    if (this.cfg.ao) { this._q(this.aoPass, this.aoRT); this._q(this.aoBlur, this.aoRT2); }
    const exposure = r.toneMappingExposure;
    if (this.cfg.bloom) {
      const D = this.down.mat.uniforms; let src = this.sceneRT.texture, sw = this.w, sh = this.h;
      for (let i = 0; i < this.bloomRTs.length; i++) { D.tSrc.value = src; D.uTexel.value.set(1 / sw, 1 / sh); D.uFirst.value = i === 0 ? 1 : 0; D.uExposure.value = exposure; this._q(this.down, this.bloomRTs[i]); src = this.bloomRTs[i].texture; sw = this.bloomRTs[i].width; sh = this.bloomRTs[i].height; }
      const Up = this.up.mat.uniforms; let low = this.bloomRTs[this.bloomRTs.length - 1];
      for (let i = this.bloomRTs.length - 2; i >= 0; i--) { Up.tSrc.value = low.texture; Up.tBase.value = this.bloomRTs[i].texture; Up.uTexel.value.set(1 / low.width, 1 / low.height); this._q(this.up, this.upRTs[i]); low = this.upRTs[i]; }
      this.U.tBloom.value = low.texture;
    }
    const U = this.U; U.uExposure.value = exposure; U.uTime.value += dt; U.uFar.value = cam.far; U.uCamAltKm.value = Math.max(0, cam.position.y) / 1000;
    const night = this.sky.night || 0; U.uNightFog.value.setRGB(0.030, 0.030, 0.040).multiplyScalar(night * 0.6);
    U.uLook_contrast.value = LOOK.contrast + (1.12 - LOOK.contrast) * Math.min(1, night * 1.4);   // softer curve after dark
    U.uBloom.value = this.bloomDay + (0.06 - this.bloomDay) * Math.min(1, night * 1.2);           // lamps/windows glow at night
    if (this.smaa) { this._q(this.final, this.ldrRT); this.smaa.render(r, null, this.ldrRT); }
    else this._q(this.final, null);
    r.setRenderTarget(prevTarget); r.autoClear = prevAuto;
  }
  dispose() { [this.sceneRT, this.aoRT, this.aoRT2, this.ldrRT, ...(this.bloomRTs || []), ...(this.upRTs || [])].forEach((t) => t && t.dispose()); this.depthTex.dispose(); this.sky.postAP = false; AOU.uCAOMin.value = 0.5; }
}
const _v2 = new THREE.Vector2();
