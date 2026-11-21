// Sky, sun/moon, lighting, fog, clouds and environment map for real Berkeley time.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { U } from '../materials.js';
import { noiseTexture } from './noiseTex.js';

export const LAT = 37.8721, LON = -122.2578;
const RAD = Math.PI / 180;
// NOAA-style solar position. Returns azimuth (from north, clockwise) and altitude in radians.
export function sunPosition(date, lat = LAT, lon = LON) {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0; // days since J2000
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const lst = (gmst * 15 + lon) * RAD;
  const ha = lst - ra;
  const phi = lat * RAD;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(ha));
  return { azimuth: (az + 2 * Math.PI) % (2 * Math.PI), altitude: alt };
}
export function moonPosition(date, lat = LAT, lon = LON) {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const Lm = (218.316 + 13.176396 * d) * RAD, M = (134.963 + 13.064993 * d) * RAD, F = (93.272 + 13.229350 * d) * RAD;
  const l = Lm + 6.289 * RAD * Math.sin(M), b = 5.128 * RAD * Math.sin(F);
  const e = 23.4397 * RAD;
  const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const ha = (gmst * 15 + lon) * RAD - ra, phi = lat * RAD;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(ha));
  // phase: elongation from sun
  const sunL = (280.459 + 0.98564736 * d + 1.915 * Math.sin((357.529 + 0.98560028 * d) * RAD)) * RAD;
  const phase = (1 - Math.cos(l - sunL)) / 2;
  return { azimuth: (az + 2 * Math.PI) % (2 * Math.PI), altitude: alt, phase };
}
export function dirFromAzAlt(az, alt, out = new THREE.Vector3()) {
  return out.set(Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt));
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class SkySystem {
  constructor({ renderer, scene, camera, quality }) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.quality = quality;
    this.sky = new Sky(); this.sky.scale.setScalar(400000); this.sky.frustumCulled = false; this.sky.renderOrder = -10;
    const u = this.sky.material.uniforms;
    u.turbidity.value = 2.6; u.rayleigh.value = 1.25; u.mieCoefficient.value = 0.0028; u.mieDirectionalG.value = 0.78;
    this.sky.material.depthWrite = false;
    scene.add(this.sky);
    // stars
    const N = 2600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    let s = 1;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < N; i++) {
      const z = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      const v = new THREE.Vector3(r * Math.cos(t), Math.abs(z) * 0.98 + 0.02, r * Math.sin(t)).normalize().multiplyScalar(120000);
      pos.set([v.x, v.y, v.z], i * 3);
      const m = Math.pow(rnd(), 3); const tint = rnd();
      col.set([0.6 + 0.4 * m + (tint > 0.8 ? 0.1 : 0), 0.6 + 0.4 * m, 0.6 + 0.4 * m + (tint < 0.2 ? 0.15 : 0)], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.starMat = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.stars = new THREE.Points(sg, this.starMat); this.stars.frustumCulled = false; this.stars.renderOrder = -9; scene.add(this.stars);
    // moon
    const mc = document.createElement('canvas'); mc.width = mc.height = 128; const g2 = mc.getContext('2d');
    const grd = g2.createRadialGradient(64, 64, 10, 64, 64, 64); grd.addColorStop(0, 'rgba(255,255,245,1)'); grd.addColorStop(0.45, 'rgba(240,240,230,1)'); grd.addColorStop(0.5, 'rgba(220,225,235,0.35)'); grd.addColorStop(1, 'rgba(200,210,230,0)');
    g2.fillStyle = grd; g2.fillRect(0, 0, 128, 128);
    g2.fillStyle = 'rgba(160,160,160,0.25)'; [[50, 52, 9], [74, 70, 7], [60, 80, 5], [80, 48, 6]].forEach(([x, y, r]) => { g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); });
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mc), transparent: true, depthWrite: false, fog: false }));
    this.moon.scale.setScalar(3600); this.moon.renderOrder = -8; scene.add(this.moon);
    // clouds: big flat layer with procedural shader
    this.cloudCover = 0.35; this.cloudUniforms = { uTime: U.uTime, uNoise: { value: noiseTexture() }, uCover: { value: 0.35 }, uSun: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uAmb: { value: new THREE.Color() }, uNight: U.uNight };
    const cg = new THREE.PlaneGeometry(160000, 160000, 1, 1); cg.rotateX(Math.PI / 2);
    const cm = new THREE.ShaderMaterial({
      uniforms: this.cloudUniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uTime, uCover, uNight; uniform sampler2D uNoise; uniform vec3 uSun, uSunCol, uAmb; varying vec3 vW;
        void main(){
          vec2 p = vW.xz*0.00011 + vec2(uTime*0.0007, uTime*0.0002);
          float n = texture2D(uNoise, p).r*0.55 + texture2D(uNoise, p*2.7+0.3).g*0.3 + texture2D(uNoise, p*7.1+0.7).b*0.15;
          float c = smoothstep(1.0-uCover*0.9-0.15, 1.0-uCover*0.9+0.25, n);
          float d = length(vW.xz - cameraPosition.xz);
          c *= 1.0 - smoothstep(30000.0, 75000.0, d);
          vec3 v = normalize(vW - cameraPosition);
          float sunF = pow(max(dot(v, uSun),0.0), 6.0);
          float thick = smoothstep(0.4, 1.0, c);
          vec3 col = mix(uSunCol*0.9 + uAmb*0.6, uAmb*0.75, thick*0.6) + uSunCol*sunF*0.6*(1.0-thick);
          gl_FragColor = vec4(col, c*0.92);
        }`,
    });
    this.clouds = new THREE.Mesh(cg, cm); this.clouds.position.y = 2400; this.clouds.frustumCulled = false; this.clouds.renderOrder = -7; scene.add(this.clouds);

    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6b5b45, 0.6); scene.add(this.hemi);
    // night skyglow (urban light pollution) + twilight residue, additive over the physical sky
    this.glowU = { uNight: { value: 0 }, uTwi: { value: 0 }, uSun: { value: new THREE.Vector3() } };
    this.glow = new THREE.Mesh(new THREE.SphereGeometry(110000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: true, transparent: false, blending: THREE.AdditiveBlending, fog: false, uniforms: this.glowU,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float uNight, uTwi; uniform vec3 uSun; varying vec3 vD;
        void main(){ float y = max(vD.y, 0.0);
          vec3 glow = mix(vec3(0.16,0.11,0.075), vec3(0.016,0.02,0.04), pow(y, 0.35)) * uNight;
          vec3 twi = mix(vec3(0.20,0.12,0.10), vec3(0.03,0.05,0.12), pow(y, 0.5)) * uTwi * (0.6 + 0.6*pow(max(dot(vD, normalize(vec3(uSun.x, 0.0, uSun.z))),0.0), 3.0));
          gl_FragColor = vec4(glow + twi, 1.0); }` }));
    this.glow.frustumCulled = false; this.glow.renderOrder = -9.5; scene.add(this.glow);
    this.sunDir = new THREE.Vector3(0, 1, 0); this.lightDir = new THREE.Vector3(0, 1, 0);
    this.sunColor = new THREE.Color(); this.sunIntensity = 3;
    this.fog = new THREE.FogExp2(0xbfd0e0, 0.00009); scene.fog = this.fog;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envU = { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGnd: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3() }, uSunGlow: { value: new THREE.Color() } };
    const dome = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: this.envU,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uZen, uHor, uGnd, uSunGlow; uniform vec3 uSun; varying vec3 vD;
        void main(){ vec3 d = normalize(vD); float y = d.y;
          vec3 c = y > 0.0 ? mix(uHor, uZen, pow(y, 0.6)) : mix(uHor*0.6+uGnd*0.4, uGnd, smoothstep(0.0, 0.25, -y));
          c += uSunGlow * pow(max(dot(d, uSun), 0.0), 8.0) * step(-0.05, y);
          gl_FragColor = vec4(c, 1.0); }`,
    }));
    this.envScene.add(dome);
    this.envRT = null; this.lastEnvAlt = -999; this.lastEnvAz = -999;
    this.night = 0;
  }
  setCloudCover(c) { this.cloudCover = c; this.cloudUniforms.uCover.value = c; }
  update(date, dt) {
    const sp = sunPosition(date); const mp = moonPosition(date);
    dirFromAzAlt(sp.azimuth, sp.altitude, this.sunDir);
    const alt = sp.altitude / RAD;
    const u = this.sky.material.uniforms;
    u.sunPosition.value.copy(this.sunDir);
    const night = 1 - smooth(-9, 2, alt); this.night = night; U.uNight.value = Math.max(0, Math.min(1, (1 - smooth(-4, 6, alt)) * 1.0));
    // sun light colour: warm near horizon
    const warm = 1 - smooth(2, 28, alt);
    this.sunColor.setRGB(1.0, 0.94 - 0.30 * warm, 0.86 - 0.52 * warm);
    const dayI = smooth(-2, 12, alt);
    const moonDir = dirFromAzAlt(mp.azimuth, mp.altitude, new THREE.Vector3());
    const moonUp = mp.altitude > 0.02;
    if (alt > -3) { this.lightDir.copy(this.sunDir); if (this.lightDir.y < 0.05) this.lightDir.y = 0.05; this.lightDir.normalize(); this.sunIntensity = 6.0 * dayI; }
    else { this.lightDir.copy(moonUp ? moonDir : new THREE.Vector3(0.3, 0.8, 0.2).normalize()); this.sunColor.setRGB(0.55, 0.65, 0.95); this.sunIntensity = 0.14 * (moonUp ? (0.3 + 0.7 * mp.phase) : 0.4); }
    U.uSunDir.value.copy(this.lightDir);
    // ambient
    const skyC = new THREE.Color().setRGB(0.55, 0.68, 0.92).lerp(new THREE.Color(0.9, 0.62, 0.45), warm * 0.55 * dayI).lerp(new THREE.Color(0.06, 0.08, 0.16), night);
    const gndC = new THREE.Color().setRGB(0.36, 0.32, 0.25).lerp(new THREE.Color(0.03, 0.03, 0.04), night);
    this.hemi.color.copy(skyC); this.hemi.groundColor.copy(gndC); this.hemi.intensity = 0.32 * (1 - night) + 0.25 * night;
    // fog colour follows horizon
    const fogC = new THREE.Color(0.70, 0.78, 0.88).lerp(new THREE.Color(0.95, 0.72, 0.58), warm * dayI * 0.8).lerp(new THREE.Color(0.030, 0.030, 0.040), night);
    this.fog.color.copy(fogC);
    this.fog.density = (0.000038 + 0.00002 * warm) * this.fogMul();
    // stars & moon
    this.starMat.opacity = 0.28 * smooth(0.35, 0.9, night) * (1 - this.cloudCover * 0.8);
    this.moon.visible = moonUp; this.moon.position.copy(moonDir).multiplyScalar(100000).add(this.camera.position);
    this.moon.material.opacity = night; this.moon.visible = moonUp && night > 0.05;
    this.stars.position.copy(this.camera.position); this.glow.position.copy(this.camera.position);
    this.glowU.uNight.value = smooth(-14, -4, -alt) ; this.glowU.uTwi.value = smooth(-14, -6, alt) * (1 - smooth(-1, 6, alt)); this.glowU.uSun.value.copy(this.sunDir);
    this.sky.position.copy(this.camera.position);
    this.clouds.position.x = this.camera.position.x; this.clouds.position.z = this.camera.position.z;
    this.cloudUniforms.uSun.value.copy(this.sunDir);
    this.cloudUniforms.uSunCol.value.copy(this.sunColor).multiplyScalar(dayI * 1.1 + 0.05);
    this.cloudUniforms.uAmb.value.copy(skyC).multiplyScalar(0.9);
    // exposure
    this.renderer.toneMappingExposure = (0.82 + 0.3 * warm * dayI + 1.7 * night) * (this.exposureMul || 1);
    // environment (ambient) dome colours, linear HDR radiance
    const zen = new THREE.Color(0.22, 0.32, 0.52).multiplyScalar(0.95 * dayI + 0.01).lerp(new THREE.Color(0.20, 0.18, 0.30).multiplyScalar(dayI), warm * 0.4);
    const hor = new THREE.Color(0.66, 0.70, 0.74).multiplyScalar(dayI * 0.95 + 0.006).lerp(new THREE.Color(0.95, 0.62, 0.42).multiplyScalar(dayI * 0.9 + 0.01), warm * 0.7);
    const gnd = new THREE.Color(0.22, 0.20, 0.16).multiplyScalar(dayI * 0.9 + 0.004);
    if (night > 0.5) { zen.lerp(new THREE.Color(0.030, 0.034, 0.050), night); hor.lerp(new THREE.Color(0.070, 0.058, 0.052), night); gnd.lerp(new THREE.Color(0.026, 0.023, 0.022), night); }
    this.envU.uZen.value.copy(zen); this.envU.uHor.value.copy(hor); this.envU.uGnd.value.copy(gnd);
    U.uSkyZen.value.copy(zen); U.uSkyHor.value.copy(hor);
    this.envU.uSun.value.copy(this.sunDir); this.envU.uSunGlow.value.copy(this.sunColor).multiplyScalar(0.35 * dayI);
    this.hemi.intensity = 0.0;
    if (Math.abs(alt - this.lastEnvAlt) > 0.8 || Math.abs(sp.azimuth - this.lastEnvAz) > 0.02) {
      this.lastEnvAlt = alt; this.lastEnvAz = sp.azimuth;
      if (this.envRT) this.envRT.dispose();
      this.envRT = this.pmrem.fromScene(this.envScene, 0, 0.1, 1000);
      this.scene.environment = this.envRT.texture;
      this.scene.environmentIntensity = this.envIntensity ?? 0.68;
    }
    return { alt, night, warm, dayI };
  }
  fogMul() { return this.weatherFog || 1; }
}

// live Berkeley weather (Open-Meteo, no key)
export async function fetchWeather() {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,cloud_cover,weather_code,wind_speed_10m,precipitation,is_day,visibility&timezone=America%2FLos_Angeles`);
    if (!r.ok) return null; const j = await r.json(); return j.current;
  } catch (e) { return null; }
}
