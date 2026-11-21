// Physically based sky + aerial perspective for Berkeley Simulator (gfx-post).
// Hillaire 2020 ("A Scalable and Production Ready Sky and Atmosphere Rendering Technique"):
//   transmittance LUT (once), multiple-scattering LUT (once), sky-view LUT (when the sun / haze / camera altitude change).
// The same sky radiance feeds: the visible sky dome, the PMREM environment (ambient + reflections),
// the sun colour (JS transmittance), the low/medium fog colour, and the high/ultra aerial-perspective post pass.
// Units: distances in km inside the shaders; radiance in scene units where the top-of-atmosphere sun = SUN_TOA.
import * as THREE from 'three';

export const SUN_TOA = 8.0;            // scene-unit solar illuminance at the top of the atmosphere (direct sun ~6 at mid altitudes)
const RG = 6360.0, RT = 6460.0;         // planet / atmosphere radius (km)
const RAY = [5.802e-3, 13.558e-3, 33.1e-3], RAY_H = 8.0;   // Rayleigh scattering per km, scale height km
const MIE_S = 3.996e-3, MIE_E = 4.40e-3, MIE_H = 1.2;       // Mie scattering / extinction per km (scaled by haze)
const OZO = [0.650e-3, 1.881e-3, 0.085e-3];                  // ozone absorption per km

export const ATMO_GLSL = /* glsl */`
#define A_PI 3.14159265359
const float A_RG = ${RG.toFixed(1)}; const float A_RT = ${RT.toFixed(1)};
uniform vec3 uRayScat; uniform float uMieScat; uniform float uMieExt; uniform vec3 uOzone; uniform float uMieG;
float aSafeAcos(float x){ return acos(clamp(x, -1.0, 1.0)); }
float aRaySphere(vec3 ro, vec3 rd, float rad){ float b = dot(ro, rd); float c = dot(ro, ro) - rad*rad; if (c > 0.0 && b > 0.0) return -1.0; float d = b*b - c; if (d < 0.0) return -1.0; if (d > b*b) return -b + sqrt(d); return -b - sqrt(d); }
void aScatter(vec3 p, out vec3 ray, out float mie, out vec3 ext){
  float h = max(length(p) - A_RG, 0.0);
  float rd = exp(-h / ${RAY_H.toFixed(1)}), md = exp(-h / ${MIE_H.toFixed(2)}), od = max(0.0, 1.0 - abs(h - 25.0) / 15.0);
  ray = uRayScat * rd; mie = uMieScat * md; ext = ray + vec3(uMieExt * md) + uOzone * od;
}
float aMiePhase(float c){ float g = uMieG; float k = 3.0 / (8.0*A_PI) * (1.0 - g*g) / (2.0 + g*g); return k * (1.0 + c*c) / pow(max(1.0 + g*g - 2.0*g*c, 1e-4), 1.5); }
float aRayPhase(float c){ return 3.0 * (1.0 + c*c) / (16.0*A_PI); }
vec3 aTLUT(sampler2D t, vec3 p, vec3 s){ float h = length(p); float mu = dot(s, p / h); return texture2D(t, vec2(clamp(0.5 + 0.5*mu, 0.0, 1.0), clamp((h - A_RG) / (A_RT - A_RG), 0.0, 1.0))).rgb; }
vec3 aMSLUT(sampler2D t, vec3 p, vec3 s){ float h = length(p); float mu = dot(s, p / h); return texture2D(t, vec2(clamp(0.5 + 0.5*mu, 0.0, 1.0), clamp((h - A_RG) / (A_RT - A_RG), 0.0, 1.0))).rgb; }
// sky-view LUT lookup: dir in world space (y up), sun dir in world space, camera height above planet centre (km)
vec3 aSkyLUTx(sampler2D t, vec3 dir, vec3 sun, float camR, float minAlt){
  float horizon = aSafeAcos(sqrt(max(camR*camR - A_RG*A_RG, 0.0)) / camR);
  float alt = max(horizon - aSafeAcos(dir.y), minAlt);
  vec3 sh = vec3(sun.x, 0.0, sun.z); float sl = length(sh); sh = sl > 1e-4 ? sh / sl : vec3(0.0, 0.0, -1.0);
  vec3 right = cross(sh, vec3(0.0, 1.0, 0.0));
  vec3 pd = vec3(dir.x, 0.0, dir.z); float pl = length(pd); pd = pl > 1e-5 ? pd / pl : sh;
  float az = atan(dot(pd, right), dot(pd, sh)) + A_PI;
  float v = 0.5 + 0.5 * sign(alt) * sqrt(min(abs(alt) * 2.0 / A_PI, 1.0));
  return texture2D(t, vec2(az / (2.0*A_PI), v)).rgb;
}
vec3 aSkyLUT(sampler2D t, vec3 dir, vec3 sun, float camR){ return aSkyLUTx(t, dir, sun, camR, -2.0); }
`;

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FS_TRANS = /* glsl */`varying vec2 vUv;
${ATMO_GLSL}
void main(){
  float mu = vUv.x * 2.0 - 1.0; float h = mix(A_RG, A_RT, vUv.y);
  vec3 p = vec3(0.0, h, 0.0); vec3 s = normalize(vec3(0.0, mu, -sqrt(max(1.0 - mu*mu, 0.0))));
  if (aRaySphere(p, s, A_RG) > 0.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float d = aRaySphere(p, s, A_RT); float t = 0.0; vec3 tr = vec3(1.0);
  for (int i = 0; i < 40; i++) { float nt = (float(i) + 0.3) / 40.0 * d; float dt = nt - t; t = nt; vec3 r, e; float m; aScatter(p + t*s, r, m, e); tr *= exp(-dt * e); }
  gl_FragColor = vec4(tr, 1.0);
}`;
const FS_MS = /* glsl */`varying vec2 vUv; uniform sampler2D uTrans; uniform vec3 uGroundAlbedo;
${ATMO_GLSL}
void main(){
  float mu = vUv.x * 2.0 - 1.0; float h = mix(A_RG + 0.0005, A_RT - 0.0005, vUv.y);
  vec3 p = vec3(0.0, h, 0.0); vec3 s = normalize(vec3(0.0, mu, -sqrt(max(1.0 - mu*mu, 0.0))));
  vec3 lumT = vec3(0.0), fms = vec3(0.0);
  const int SQ = 8; const float STEPS = 20.0;
  for (int i = 0; i < SQ; i++) for (int j = 0; j < SQ; j++) {
    float th = A_PI * (float(i) + 0.5) / float(SQ); float ph = aSafeAcos(1.0 - 2.0 * (float(j) + 0.5) / float(SQ));
    vec3 rd = vec3(cos(th) * sin(ph), sin(th) * sin(ph), cos(ph));
    float da = aRaySphere(p, rd, A_RT), dg = aRaySphere(p, rd, A_RG); float tMax = dg > 0.0 ? dg : da;
    float c = dot(rd, s); float mp = aMiePhase(c), rp = aRayPhase(-c);
    vec3 lum = vec3(0.0), lf = vec3(0.0), tr = vec3(1.0); float t = 0.0;
    for (float k = 0.0; k < STEPS; k += 1.0) {
      float nt = (k + 0.3) / STEPS * tMax; float dt = nt - t; t = nt; vec3 q = p + t * rd;
      vec3 r, e; float m; aScatter(q, r, m, e); vec3 st = exp(-dt * e);
      vec3 sn = r + m; lf += tr * (sn - sn * st) / e;
      vec3 ins = (r * rp + m * mp) * aTLUT(uTrans, q, s); lum += tr * (ins - ins * st) / e; tr *= st;
    }
    if (dg > 0.0) { vec3 hp = p + dg * rd; if (dot(p, s) > 0.0) { hp = normalize(hp) * A_RG; lum += tr * uGroundAlbedo * aTLUT(uTrans, hp, s); } }
    fms += lf / float(SQ * SQ); lumT += lum / float(SQ * SQ);
  }
  gl_FragColor = vec4(lumT / (1.0 - fms), 1.0);
}`;
const FS_SKY = /* glsl */`varying vec2 vUv; uniform sampler2D uTrans, uMS; uniform float uCamR; uniform float uSunAlt;
${ATMO_GLSL}
void main(){
  float az = (vUv.x - 0.5) * 2.0 * A_PI;
  float v = vUv.y < 0.5 ? -(1.0 - 2.0*vUv.y)*(1.0 - 2.0*vUv.y) : (vUv.y*2.0 - 1.0)*(vUv.y*2.0 - 1.0);
  vec3 p = vec3(0.0, uCamR, 0.0);
  float horizon = aSafeAcos(sqrt(max(uCamR*uCamR - A_RG*A_RG, 0.0)) / uCamR) - 0.5 * A_PI;
  float alt = v * 0.5 * A_PI - horizon; float ca = cos(alt);
  vec3 rd = vec3(ca * sin(az), sin(alt), -ca * cos(az));
  vec3 s = vec3(0.0, sin(uSunAlt), -cos(uSunAlt));
  float da = aRaySphere(p, rd, A_RT), dg = aRaySphere(p, rd, A_RG); float tMax = dg < 0.0 ? da : dg;
  float c = dot(rd, s); float mp = aMiePhase(c), rp = aRayPhase(-c);
  vec3 lum = vec3(0.0), tr = vec3(1.0); float t = 0.0; const float N = 32.0;
  for (float k = 0.0; k < N; k += 1.0) {
    float nt = tMax * pow((k + 0.3) / N, 1.6); float dt = nt - t; t = nt; vec3 q = p + t * rd;   // denser steps near the camera
    vec3 r, e; float m; aScatter(q, r, m, e); vec3 st = exp(-dt * e);
    vec3 sT = aTLUT(uTrans, q, s), ms = aMSLUT(uMS, q, s);
    vec3 ins = r * (rp * sT + ms) + m * (mp * sT + ms);
    lum += tr * (ins - ins * st) / e; tr *= st;
  }
  gl_FragColor = vec4(lum, 1.0);
}`;

const FS_REDUCE = /* glsl */`varying vec2 vUv; uniform sampler2D uSkyLUT; uniform vec3 uSunDirW; uniform float uCamR;
${ATMO_GLSL}
void main(){
  float px = floor(vUv.x * 4.0); vec3 acc = vec3(0.0);
  if (px < 0.5) { // cosine-weighted horizontal irradiance from the sky (scene units / SUN_TOA)
    for (int i = 0; i < 16; i++) for (int j = 0; j < 8; j++) { float ph = (float(i) + 0.5) / 16.0 * 2.0 * A_PI; float ct = sqrt((float(j) + 0.5) / 8.0); float st = sqrt(1.0 - ct*ct);
      acc += aSkyLUT(uSkyLUT, vec3(st * cos(ph), ct, st * sin(ph)), uSunDirW, uCamR); }
    acc *= A_PI / 128.0;
  } else if (px < 1.5) { // mean radiance just above the horizon
    for (int i = 0; i < 32; i++) { float ph = (float(i) + 0.5) / 32.0 * 2.0 * A_PI; acc += aSkyLUT(uSkyLUT, normalize(vec3(cos(ph), 0.03, sin(ph))), uSunDirW, uCamR); } acc /= 32.0;
  } else if (px < 2.5) { // zenith radiance
    acc = aSkyLUT(uSkyLUT, vec3(0.0, 1.0, 0.0), uSunDirW, uCamR);
  } else { // mean radiance 5-25 deg up (cloud ambient)
    for (int i = 0; i < 32; i++) { float ph = (float(i) + 0.5) / 32.0 * 2.0 * A_PI; acc += aSkyLUT(uSkyLUT, normalize(vec3(cos(ph), 0.25, sin(ph))), uSunDirW, uCamR); } acc /= 32.0;
  }
  gl_FragColor = vec4(acc, 1.0);
}`;
function quadPass(fs, uniforms) {
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); mesh.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(mesh);
  return { scene, mat };
}
const _cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

export class Atmosphere {
  constructor(renderer, { skyW = 192, skyH = 108 } = {}) {
    this.renderer = renderer;
    this.haze = 1.0; this.groundAlbedo = new THREE.Color(0.12, 0.12, 0.10);
    const rt = (w, h) => { const t = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false }); t.texture.wrapS = THREE.ClampToEdgeWrapping; t.texture.wrapT = THREE.ClampToEdgeWrapping; return t; };
    this.transRT = rt(256, 64); this.msRT = rt(32, 32); this.skyRT = rt(skyW, skyH);
    this.skyRT.texture.wrapS = THREE.RepeatWrapping;   // azimuth wraps
    // shared atmosphere constants (one object so every shader sees the same haze)
    this.U = {
      uRayScat: { value: new THREE.Vector3(...RAY) }, uMieScat: { value: MIE_S }, uMieExt: { value: MIE_E }, uOzone: { value: new THREE.Vector3(...OZO) }, uMieG: { value: 0.8 },
      uTrans: { value: this.transRT.texture }, uMS: { value: this.msRT.texture }, uSkyLUT: { value: this.skyRT.texture },
      uCamR: { value: RG + 0.1 }, uSunAlt: { value: 0.5 }, uGroundAlbedo: { value: this.groundAlbedo },
      uSunDirW: { value: new THREE.Vector3(0, 1, 0) }, uSunTOA: { value: SUN_TOA }, uSkyBoost: { value: 1.55 },
    };
    this.passT = quadPass(FS_TRANS, this.U); this.passMS = quadPass(FS_MS, this.U); this.passSky = quadPass(FS_SKY, this.U);
    // GPU reduction -> 4x1 float target read back when the sky changes (irradiance, horizon, zenith, low sky)
    this.canRead = !!(renderer.extensions && renderer.extensions.has('EXT_color_buffer_float'));
    if (this.canRead) { this.redRT = new THREE.WebGLRenderTarget(4, 1, { type: THREE.FloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false }); this.passRed = quadPass(FS_REDUCE, this.U); this.redBuf = new Float32Array(16); }
    this.skyIrr = new THREE.Color(0.08, 0.1, 0.13); this.horizon = new THREE.Color(0.1, 0.12, 0.14); this.zenith = new THREE.Color(0.03, 0.06, 0.12); this.lowSky = new THREE.Color(0.07, 0.09, 0.12);
    this.dirtyStatic = true; this.lastKey = '';
    this.sunTrans = new THREE.Color(1, 1, 1);
  }
  setHaze(h) { h = Math.max(0.3, Math.min(30, h)); if (Math.abs(h - this.haze) < 1e-3) return; this.haze = h; this.dirtyStatic = true; }
  _apply() { this.U.uMieScat.value = MIE_S * this.haze; this.U.uMieExt.value = MIE_E * this.haze; this.U.uMieG.value = 0.8 - 0.06 * Math.min(1, (this.haze - 1) / 6); }
  _run(pass, target) { const r = this.renderer; const prev = r.getRenderTarget(); const xr = r.xr.enabled; r.xr.enabled = false; r.setRenderTarget(target); r.render(pass.scene, _cam); r.setRenderTarget(prev); r.xr.enabled = xr; }
  // call every frame; cheap unless something changed
  update(sunDir, camY) {
    const altKm = Math.max(0.005, Math.min(20, camY / 1000));
    if (this.dirtyStatic) { this._apply(); this._run(this.passT, this.transRT); this._run(this.passMS, this.msRT); this.dirtyStatic = false; this.lastKey = ''; }
    const sunAlt = Math.asin(Math.max(-1, Math.min(1, sunDir.y)));
    const key = `${(sunAlt * 2000) | 0}|${(altKm * 20) | 0}|${this.haze.toFixed(3)}`;
    this.U.uSunDirW.value.copy(sunDir);
    if (key !== this.lastKey) { this.lastKey = key; this.U.uCamR.value = RG + altKm; this.U.uSunAlt.value = sunAlt; this._run(this.passSky, this.skyRT); this.changed = true;
      if (this.canRead) { try { this._run(this.passRed, this.redRT); this.renderer.readRenderTargetPixels(this.redRT, 0, 0, 4, 1, this.redBuf); const b = this.redBuf;
        if (Number.isFinite(b[0])) { this.skyIrr.setRGB(b[0], b[1], b[2]); this.horizon.setRGB(b[4], b[5], b[6]); this.zenith.setRGB(b[8], b[9], b[10]); this.lowSky.setRGB(b[12], b[13], b[14]); } } catch (e) { this.canRead = false; } }
    } else this.changed = false;
    this.sunTrans.copy(this.transmittance(altKm, sunAlt));
    return this.changed;
  }
  // JS mirror of the transmittance integral: direct-sun colour at a given altitude (km) and sun altitude (rad)
  transmittance(hKm, sunAlt, out = new THREE.Color()) {
    const mu = Math.sin(sunAlt), r0 = RG + hKm; const sx = 0, sy = mu, sz = -Math.sqrt(Math.max(0, 1 - mu * mu));
    const b = r0 * sy, cG = r0 * r0 - RG * RG, dG = b * b - cG; if (b < 0 && dG > 0) return out.setRGB(0, 0, 0);   // below the horizon
    const cT = r0 * r0 - RT * RT, d = -b + Math.sqrt(b * b - cT);
    let t = 0, tr = [0, 0, 0]; const N = 40;
    for (let i = 0; i < N; i++) { const nt = (i + 0.3) / N * d, dt = nt - t; t = nt; const y = r0 + t * sy, z = t * sz; const h = Math.max(0, Math.hypot(y, z, sx) - RG);
      const rd = Math.exp(-h / RAY_H), md = Math.exp(-h / MIE_H), od = Math.max(0, 1 - Math.abs(h - 25) / 15);
      for (let c = 0; c < 3; c++) tr[c] += dt * (RAY[c] * rd + MIE_E * this.haze * md + OZO[c] * od); }
    return out.setRGB(Math.exp(-tr[0]), Math.exp(-tr[1]), Math.exp(-tr[2]));
  }
  // closed-form-ish horizontal extinction at sea level (per metre), used by the cheap fog path
  extinctionPerM() { return ((RAY[0] + RAY[1] + RAY[2]) / 3 + MIE_E * this.haze) / 1000; }
}

// Visible sky dome: sky-view LUT + limb-darkened sun disk. Renders first, never writes depth.
export function makeSkyDome(atmo) {
  const u = Object.assign({ uSunRad: { value: 0.0048 }, uSunScale: { value: 1 }, uFade: { value: 1 } }, atmo.U);
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: /* glsl */`varying vec3 vW; uniform sampler2D uSkyLUT, uTrans; uniform vec3 uSunDirW; uniform float uCamR, uSunRad, uSunTOA, uSunScale, uFade, uSkyBoost;
${ATMO_GLSL}
      void main(){
        vec3 d = normalize(vW - cameraPosition);
        vec3 L = aSkyLUTx(uSkyLUT, d, uSunDirW, uCamR, 0.0015) * uSunTOA * uSkyBoost;   // photographic sky brightness (camera skies read ~0.5 EV brighter than the physical ratio)
        float c = dot(d, uSunDirW);
        if (c > cos(uSunRad * 1.2)) {
          float r = sqrt(max(0.0, 1.0 - c*c)) / sin(uSunRad); float limb = r < 1.0 ? pow(max(0.0, 1.0 - r*r), 0.25) * 0.6 + 0.4 : 0.0;
          vec3 T = aTLUT(uTrans, vec3(0.0, uCamR, 0.0), uSunDirW);
          L += T * uSunTOA * limb * smoothstep(1.0, 0.92, r) * 1800.0 * uSunScale;   // clamped (real disk would overflow fp16)
        }
        gl_FragColor = vec4(L * uFade, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(100000, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -10; m.name = 'atmoSky';
  return m;
}
// Environment dome for PMREM: sky radiance above the horizon, sunlit ground below (no sun disk: the directional light owns it)
export function makeEnvDome(atmo) {
  const u = Object.assign({ uSkyMul: { value: 1 }, uGround: { value: new THREE.Color(0.1, 0.1, 0.09) }, uExtra: { value: new THREE.Color(0, 0, 0) }, uNightZen: { value: new THREE.Color() }, uNightHor: { value: new THREE.Color() }, uNightGnd: { value: new THREE.Color() }, uNightK: { value: 0 } }, atmo.U);
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: /* glsl */`varying vec3 vD; uniform sampler2D uSkyLUT; uniform vec3 uSunDirW, uGround, uExtra, uNightZen, uNightHor, uNightGnd; uniform float uCamR, uSunTOA, uNightK, uSkyMul;
${ATMO_GLSL}
      void main(){ vec3 d = normalize(vD);
        vec3 sky = aSkyLUT(uSkyLUT, vec3(d.x, max(d.y, 0.002), d.z), uSunDirW, uCamR) * uSunTOA * uSkyMul;
        vec3 hz = aSkyLUT(uSkyLUT, normalize(vec3(d.x, 0.002, d.z)), uSunDirW, uCamR) * uSunTOA * uSkyMul;
        vec3 c = d.y > 0.0 ? sky : mix(hz, uGround, smoothstep(0.0, 0.12, -d.y));
        vec3 nc = d.y > 0.0 ? mix(uNightHor, uNightZen, pow(d.y, 0.6)) : mix(uNightHor*0.6+uNightGnd*0.4, uNightGnd, smoothstep(0.0, 0.25, -d.y));
        gl_FragColor = vec4(c + nc * uNightK + uExtra, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), mat); m.name = 'atmoEnv';
  return m;
}
