// Campus water (r4-campanile): Strawberry Creek rebuilt as a real shallow creek, the Mining Circle reflecting pool with
// Bruce Beasley's "Rondo II", and soft water sounds up close.
//  - Creek: the OSM centreline is snapped to the LiDAR channel bottom (thalweg), the surface is level across the channel at
//    bed + ~18 cm and steps down the canyon; the shader reads the terrain height under each pixel for depth (clear over the
//    gravel, darker in pools, fading out at the shoreline), runs ripples downstream (faster and foamy where the bed drops),
//    and wet stones line the banks. Replaces the flat draped ribbon from streetscape.js (that mesh is hidden).
//  - Mining Circle pool: John Galen Howard's round reflecting pool in front of Hearst Mining (restored by PGAdesign);
//    ~13.6 m across (orthophoto), pale cast-stone coping you can sit on, dark mirror water, Rondo II's polished stainless
//    loops "dancing on the surface" (Berkeley News, 2013), and a low bubbler under the sculpture. You can wade in.
//  - Sound: a looping babbling-brook buffer near the creek and a splashing loop near fountains, both distance-faded.
// Quality: low = no stones and coarser sculpture; medium = half the stones. ?nowater=1 disables the module.
import * as THREE from 'three';
import { U } from '../materials.js';
import { noiseTexture } from './noiseTex.js';

const POOL = { x: 74.5, z: -180.0, r: 6.8, rim: 0.42 };      // Mining Circle pool (orthophoto fit)

export function installWater({ scene, heightAt, vectors, terrain, physics, audio, quality = 'high', lm }) {
  const group = new THREE.Group(); group.name = 'r4-water'; scene.add(group);
  const lowQ = quality === 'low';
  const uni = { uTime: U.uTime, uNight: U.uNight, uNoise: { value: noiseTexture() }, uH: terrain.uniforms.uHeight, uCore: terrain.uniforms.uCore, uCoreSize: terrain.uniforms.uCoreSize };
  // ---------------------------------------------------------------- Strawberry Creek
  const core = { x0: -1240, x1: 2040, z0: -1030, z1: 1350 };
  const streams = (vectors.water || []).filter((w) => (w.type === 'stream' || w.type === 'river') && w.pts.length > 1 && w.pts.some(([x, z]) => x > core.x0 && x < core.x1 && z > core.z0 && z < core.z1));
  const pos = [], uv = [], flow = [], vis = [], idx = [], rocks = [], samplesAll = [];
  // paths, roads and plazas cross the creek on culverts and bridges: no open water (or stones) where the ground is paved
  const gm = (typeof window !== 'undefined' && window.BSIM && window.BSIM.groundMask) || null;
  const paved = (x, z) => { if (!gm) return false; const i = Math.floor((x - gm.x0) / gm.step), j = Math.floor((z - gm.z0) / gm.step); if (i < 0 || j < 0 || i >= gm.nx || j >= gm.nz) return false; const o = (j * gm.nx + i) * 4; return gm.sdf[o] > 110 || gm.sdf[o + 1] > 110; };   // SDF bytes: ~127 = edge; >110 = on or within ~0.4 m of paving
  for (const w of streams) {
    // resample at 1 m
    const P = []; for (let k = 0; k < w.pts.length - 1; k++) { const [x0, z0] = w.pts[k], [x1, z1] = w.pts[k + 1]; const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L)); for (let i = 0; i < n; i++) P.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); }
    P.push(w.pts[w.pts.length - 1]); if (P.length < 4) continue;
    if (heightAt(P[0][0], P[0][1]) < heightAt(P[P.length - 1][0], P[P.length - 1][1])) P.reverse();   // run downstream
    const N = P.length, nrm = [], off = new Float32Array(N), bed = new Float32Array(N);
    for (let i = 0; i < N; i++) { const a = P[Math.max(0, i - 2)], b = P[Math.min(N - 1, i + 2)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; nrm.push([-dz / l, dx / l]); }
    // thalweg: lowest ground within ±2.5 m of the mapped line
    for (let i = 0; i < N; i++) { let best = 0, bh = Infinity; for (let o = -2.5; o <= 2.5; o += 0.25) { const h = heightAt(P[i][0] + nrm[i][0] * o, P[i][1] + nrm[i][1] * o) + Math.abs(o) * 0.02; if (h < bh) { bh = h; best = o; } } off[i] = best; }
    const sm = (arr, r) => { const out = new Float32Array(arr.length); for (let i = 0; i < arr.length; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - r); j <= Math.min(arr.length - 1, i + r); j++) { s += arr[j]; c++; } out[i] = s / c; } return out; };
    const offS = sm(off, 3);
    const C = P.map(([x, z], i) => [x + nrm[i][0] * offS[i], z + nrm[i][1] * offS[i]]);
    for (let i = 0; i < N; i++) bed[i] = heightAt(C[i][0], C[i][1]);
    let lev = sm(bed, 2).map((h) => h + 0.18);
    for (let i = 1; i < N; i++) lev[i] = Math.min(lev[i], lev[i - 1] + 0.01);                       // never flows uphill
    lev = sm(lev, 1);
    // half-widths: walk out until the bank rises above the water
    const hw = [[], []];
    for (let i = 0; i < N; i++) for (const sd of [0, 1]) { const sg = sd ? 1 : -1; let d = 0.5; for (; d < 2.3; d += 0.15) { if (heightAt(C[i][0] + nrm[i][0] * d * sg, C[i][1] + nrm[i][1] * d * sg) > lev[i] + 0.02) break; } hw[sd].push(Math.max(0.6, Math.min(2.2, d))); }
    const hwL = sm(Float32Array.from(hw[0]), 2), hwR = sm(Float32Array.from(hw[1]), 2);
    const slope = new Float32Array(N); for (let i = 0; i < N; i++) { const a = Math.max(0, i - 6), b = Math.min(N - 1, i + 6); slope[i] = Math.max(0, (lev[a] - lev[b]) / Math.max(1, b - a)); }
    const slopeS = sm(slope, 2);
    const base = pos.length / 3, ACR = [-1, -0.55, 0, 0.55, 1];
    const open = C.map(([x, z]) => (paved(x, z) ? 0 : 1)); for (let i = 1; i < N - 1; i++) if (!open[i - 1] && !open[i + 1]) open[i] = 0;
    let s = 0;
    for (let i = 0; i < N; i++) {
      if (i) s += Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]);
      for (const a of ACR) {
        const d = a < 0 ? a * hwL[i] : a * hwR[i]; const x = C[i][0] + nrm[i][0] * d, z = C[i][1] + nrm[i][1] * d;
        let y = lev[i]; if (Math.abs(a) > 0.9) y = Math.min(lev[i], heightAt(x, z) - 0.03);        // edges tuck under the bank
        pos.push(x, y, z); uv.push(s, a); flow.push(Math.min(1, slopeS[i] * 4.5)); vis.push(open[i]);
      }
      samplesAll.push([C[i][0], C[i][1], lev[i]]);
      // stones: along both banks, a few in the riffles
      if (!lowQ && open[i] && i % (quality === 'medium' ? 6 : 3) === 0) {
        const h = ((i * 2654435761) >>> 0) / 4294967296;
        const sg = h < 0.5 ? -1 : 1, bw = sg < 0 ? hwL[i] : hwR[i];
        const d = sg * (bw - 0.05 + h * 0.3); if (!paved(C[i][0] + nrm[i][0] * d, C[i][1] + nrm[i][1] * d)) rocks.push([C[i][0] + nrm[i][0] * d, lev[i] - 0.08 - h * 0.06, C[i][1] + nrm[i][1] * d, 0.18 + h * 0.32, h * 6.28]);
        if (slopeS[i] > 0.03 && h > 0.6) { const d2 = (h - 0.8) * 2.0; rocks.push([C[i][0] + nrm[i][0] * d2, lev[i] - 0.14, C[i][1] + nrm[i][1] * d2, 0.16 + h * 0.18, h * 9]); }
      }
    }
    for (let i = 0; i < N - 1; i++) for (let k = 0; k < ACR.length - 1; k++) { const a = base + i * 5 + k, b = a + 1, c = a + 5, d = c + 1; idx.push(a, b, c, b, d, c); } // faces up
  }
  let creekMesh = null;
  if (pos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 1)); g.setAttribute('aVis', new THREE.Float32BufferAttribute(vis, 1));
    g.setIndex(idx); g.computeVertexNormals(); for (let i = 0; i < g.attributes.normal.count; i++) g.attributes.normal.setXYZ(i, 0, 1, 0);
    const m = new THREE.MeshStandardMaterial({ color: 0x2c3a2c, roughness: 0.09, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 0.5 }); // the sky-only env map would turn a canopy-shaded creek white
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFlow, aVis; varying vec2 vUvC; varying float vFlow, vVis; varying vec3 vWPC;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvUvC = uv; vFlow = aFlow; vVis = aVis;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPC = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime, uNight; uniform sampler2D uNoise; uniform sampler2D uH; uniform vec4 uCore; uniform vec2 uCoreSize; varying vec2 vUvC; varying float vFlow, vVis; varying vec3 vWPC;
float bedH(vec2 w){ vec2 f=(w-uCore.xy)/uCore.z; f=clamp(f,vec2(0.0),uCoreSize-1.001); ivec2 i=ivec2(floor(f)); vec2 t=f-vec2(i);
  float a=texelFetch(uH,i,0).r, b=texelFetch(uH,i+ivec2(1,0),0).r, c=texelFetch(uH,i+ivec2(0,1),0).r, d=texelFetch(uH,i+ivec2(1,1),0).r; return mix(mix(a,b,t.x),mix(c,d,t.x),t.y); }
float wFoam = 0.0, wDepth = 0.3;`)
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
 { float sp = 0.45 + 1.6 * vFlow; vec2 p = vec2(vUvC.x, vUvC.y * 1.6);
   vec2 q1 = vec2(p.x * 0.55 - uTime * sp, p.y * 0.8), q2 = vec2(p.x * 1.3 - uTime * sp * 1.35, p.y * 1.7 + 0.37);
   float a = texture(uNoise, q1 * 0.19).g - 0.5, b = texture(uNoise, q2 * 0.23).b - 0.5, c = texture(uNoise, q2 * 0.61 + 0.2).r - 0.5;
   float k = 0.35 + 0.9 * vFlow;
   vec3 wn = normalize(vec3((a * 0.6 + b * 0.4 + c * 0.25 * vFlow) * k, 1.0, (b * 0.5 - a * 0.3 + c * 0.2) * k * 0.7));
   normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
   wDepth = max(0.0, vWPC.y - bedH(vWPC.xz));
   float f1 = texture(uNoise, vec2(p.x * 0.9 - uTime * sp * 1.1, p.y * 2.2) * 0.31).g;
   float rif = smoothstep(0.35, 1.0, vFlow), shallow = 1.0 - smoothstep(0.02, 0.08, wDepth);
   wFoam = smoothstep(0.76, 0.97, f1 + 0.2 * rif) * rif * 0.7 + smoothstep(0.84, 0.97, f1) * shallow * 0.14;   // white water only in real riffles
   wFoam *= 1.0 - smoothstep(0.85, 1.0, abs(vUvC.y)) * 0.5; }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
 { float d = max(0.0, vWPC.y - bedH(vWPC.xz));
   vec3 shallowC = vec3(0.12, 0.11, 0.075), deepC = vec3(0.02, 0.035, 0.03);
   diffuseColor.rgb = mix(shallowC, deepC, smoothstep(0.02, 0.45, d));
   diffuseColor.a = mix(0.62, 0.96, smoothstep(0.0, 0.3, d)) * smoothstep(0.0, 0.03, d) * (1.0 - smoothstep(0.92, 1.0, abs(vUvC.y))) * smoothstep(0.3, 0.9, vVis); }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.6, wFoam);')
        .replace('#include <opaque_fragment>', `outgoingLight -= reflectedLight.indirectSpecular * 0.45;   // banks and canopy hide most of the sky the env map would mirror
 outgoingLight = mix(outgoingLight, vec3(0.6, 0.62, 0.6) * mix(1.0, 0.12, uNight), wFoam * 0.8);   // white water
 diffuseColor.a = max(diffuseColor.a, wFoam * 0.9 * smoothstep(0.3, 0.9, vVis) * smoothstep(0.0, 0.02, wDepth));
#include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'creek-r4' + (lowQ ? 'L' : '');
    creekMesh = new THREE.Mesh(g, m); creekMesh.name = 'creek-r4'; creekMesh.renderOrder = 1; creekMesh.receiveShadow = true; creekMesh.frustumCulled = true;
    g.computeBoundingSphere(); group.add(creekMesh);
  }
  // hide the old draped ribbon (streetscape.js) now that the rebuilt creek exists
  if (creekMesh) scene.traverse((o) => { if (o.name === 'creek' && o !== creekMesh) o.visible = false; });
  // wet stones
  if (rocks.length) {
    const rg = new THREE.IcosahedronGeometry(1, 0); const p = rg.attributes.position;   // 20 faces: stones are small
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = 0.78 + 0.22 * Math.sin(x * 5.1 + z * 3.3) * Math.cos(y * 4.2 + x * 1.7); p.setXYZ(i, x * n * 1.15, y * n * 0.55, z * n); }
    rg.computeVertexNormals();
    const rm = new THREE.MeshStandardMaterial({ color: 0x5d5a50, roughness: 0.55, metalness: 0 }); rm.name = 'creekStone';
    const im = new THREE.InstancedMesh(rg, rm, rocks.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    rocks.forEach(([x, y, z, s, r], i) => { q.setFromEuler(new THREE.Euler(0.2 * Math.sin(r * 3), r, 0.15 * Math.cos(r * 2))); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m4); const t = 0.75 + 0.35 * ((i * 7919) % 11) / 11; col.setRGB(t * 0.95, t * 0.93, t * 0.85); im.setColorAt(i, col); });
    im.castShadow = true; im.receiveShadow = true; im.name = 'creek-stones'; im.computeBoundingSphere(); group.add(im);
  }
  // spatial index of creek samples for the sound
  const cell = 32, grid = new Map();
  for (const sm of samplesAll) { const key = Math.floor(sm[0] / cell) + ',' + Math.floor(sm[1] / cell); let l = grid.get(key); if (!l) grid.set(key, (l = [])); l.push(sm); }
  const nearestCreek = (x, z) => { let best = null, bd = 1e9; const ci = Math.floor(x / cell), cj = Math.floor(z / cell); for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) { const l = grid.get(i + ',' + j); if (!l) continue; for (const s of l) { const d = (s[0] - x) ** 2 + (s[1] - z) ** 2; if (d < bd) { bd = d; best = s; } } } return best ? { s: best, d: Math.sqrt(bd) } : null; };

  // ---------------------------------------------------------------- Mining Circle pool + Rondo II
  const pool = new THREE.Group(); pool.name = 'mining-circle-pool'; group.add(pool);
  let gRim = 0; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; gRim += heightAt(POOL.x + (POOL.r + POOL.rim + 0.6) * Math.cos(a), POOL.z + (POOL.r + POOL.rim + 0.6) * Math.sin(a)); } gRim /= 24;
  let gMin = Infinity; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; gMin = Math.min(gMin, heightAt(POOL.x + (POOL.r + POOL.rim) * Math.cos(a), POOL.z + (POOL.r + POOL.rim) * Math.sin(a))); }
  let gIn = -Infinity; for (let r = 0; r < POOL.r; r += 1.2) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; gIn = Math.max(gIn, heightAt(POOL.x + r * Math.cos(a), POOL.z + r * Math.sin(a))); }
  const RIM_TOP = Math.max(gRim + 0.32, gIn + 0.3), WATER_Y = RIM_TOP - 0.06, FLOOR_Y = WATER_Y - 0.42;
  const stone = new THREE.MeshStandardMaterial({ color: 0xd3d0c8, roughness: 0.85 }); stone.name = 'miningPoolCoping';
  const ri = POOL.r, ro = POOL.r + POOL.rim, e = 0.04;
  const rimGeo = new THREE.LatheGeometry([[ro, gMin - 0.6], [ro, RIM_TOP - e], [ro - e * 0.3, RIM_TOP - e * 0.3], [ro - e, RIM_TOP], [ri + e, RIM_TOP], [ri + e * 0.3, RIM_TOP - e * 0.3], [ri, RIM_TOP - e], [ri, FLOOR_Y]].map(([r, y]) => new THREE.Vector2(r, y)), 128);
  const rim = new THREE.Mesh(rimGeo, stone); rim.position.set(POOL.x, 0, POOL.z); rim.castShadow = true; rim.receiveShadow = true; pool.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(ri, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a2e2c, roughness: 0.9 })); floor.position.set(POOL.x, FLOOR_Y, POOL.z); pool.add(floor);
  const pm = new THREE.MeshStandardMaterial({ color: 0x141c1e, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.95, depthWrite: false, envMapIntensity: 1.7 });
  pm.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: U.uTime, uNoise: uni.uNoise });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vPP;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvPP = position.xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform sampler2D uNoise; varying vec2 vPP;')
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
 { float r = length(vPP); vec2 dir = vPP / max(r, 1e-3);
   float ring = sin(r * 7.0 - uTime * 2.6) * exp(-r * 0.32) * 0.07;                 // bubbler under the sculpture
   float a = texture(uNoise, vPP * 0.11 + vec2(uTime * 0.012, uTime * 0.008)).g - 0.5, b = texture(uNoise, vPP * 0.27 - vec2(uTime * 0.02, -uTime * 0.015)).b - 0.5;
   vec3 wn = normalize(vec3(dir.x * ring + a * 0.05 + b * 0.03, 1.0, dir.y * ring + b * 0.05 - a * 0.02));
   normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz); }`);
  };
  pm.customProgramCacheKey = () => 'miningPool-r4';
  const water = new THREE.Mesh(new THREE.CircleGeometry(ri + 0.01, 96).rotateX(-Math.PI / 2), pm); water.position.set(POOL.x, WATER_Y, POOL.z); water.renderOrder = 1; water.receiveShadow = true; water.name = 'mining-pool-water'; pool.add(water);
  // Rondo II (Bruce Beasley, stainless steel): interlaced loops resting on the surface
  const steel = new THREE.MeshStandardMaterial({ color: 0xd8dde0, metalness: 1.0, roughness: 0.14, envMapIntensity: 1.3 }); steel.name = 'rondoSteel';
  // [radius, yaw, tilt, roll, dx, dz]: tall tilted loops, offset so they interlace rather than share one centre
  const loops = [[2.15, 0.0, 0.25, 0.0, 0.3, 0.0], [1.9, 1.1, -0.35, 0.3, -0.25, 0.3], [2.05, 2.2, 0.4, -0.2, 0.1, -0.35], [1.8, 3.3, -0.2, 0.45, -0.35, -0.1], [2.1, 4.4, 0.1, -0.4, 0.2, 0.35], [1.85, 5.5, 0.5, 0.15, 0.0, -0.2]];
  const rondo = new THREE.Group(); rondo.position.set(POOL.x, WATER_Y, POOL.z); rondo.name = 'rondo-ii';
  for (const [R, yaw, tx, tz, dx, dz] of loops) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(R, 0.075, 10, lowQ ? 40 : 80), steel); t.castShadow = true;
    const g = new THREE.Group(); g.position.set(dx, 0, dz); g.rotation.set(0.42 + tx * 0.6, yaw, tz, 'YXZ'); g.add(t); rondo.add(g);
  }
  rondo.updateMatrixWorld(true); { const bb = new THREE.Box3().setFromObject(rondo); rondo.position.y += WATER_Y - 0.03 - bb.min.y; }
  pool.add(rondo);
  // low bubbler under the sculpture: a churned, softly pulsing foam boil
  const foamM = new THREE.MeshStandardMaterial({ color: 0xeef2f0, roughness: 0.7, transparent: true, opacity: 0.55, depthWrite: false }); foamM.name = 'miningFoam';
  const boils = [0, 2.1, 4.2].map((a) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 1), foamM); m.position.set(POOL.x + Math.cos(a) * 0.45, WATER_Y, POOL.z + Math.sin(a) * 0.45); m.renderOrder = 2; pool.add(m); return m; });
  // wading floor + sit-on coping; the sculpture is solid
  if (physics) {
    physics.addWalkable({ type: 'fn', tag: 'r4-pool', bounds: [POOL.x - ro, POOL.z - ro, POOL.x + ro, POOL.z + ro], heightAt: (x, z) => { const r = Math.hypot(x - POOL.x, z - POOL.z); return r > ro ? null : r >= ri ? RIM_TOP : FLOOR_Y; } });
    physics.addCircle(POOL.x, POOL.z, 2.1, FLOOR_Y - 1, WATER_Y + 4.5, 'r4-pool');
  }

  // ---------------------------------------------------------------- sound
  const fountains = [{ x: POOL.x, z: POOL.z, r: 26, g: 0.5 }];
  const snd = { ok: false };
  const brook = (c) => {                                         // 7 s loop: brownish noise bed + many tiny rising bubbles
    const SR = c.sampleRate, n = Math.floor(7 * SR), b = c.createBuffer(2, n, SR);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0, hp = 0;
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; lp += 0.08 * (w - lp); hp = 0.985 * hp + (w - lp) * 0.06; d[i] = lp * 0.9 + hp * 0.5; }
      for (let k = 0; k < 900; k++) { const t0 = Math.floor(Math.random() * (n - SR * 0.06)), f0 = 350 + Math.random() * Math.random() * 1600, dur = 0.012 + Math.random() * 0.03, amp = 0.05 + Math.random() * 0.12; let ph = 0;
        for (let i = 0; i < dur * SR; i++) { const tt = i / SR; ph += (2 * Math.PI * f0 * (1 + 2.2 * tt / dur)) / SR; d[(t0 + i) % n] += Math.sin(ph) * amp * Math.exp(-tt / (dur * 0.35)); } }
      for (let i = 0; i < 2000; i++) { const k = i / 2000; d[i] *= k; d[n - 1 - i] = d[n - 1 - i] * k + d[i] * (1 - k) * 0; }
    }
    return b;
  };
  const splash = (c) => { const SR = c.sampleRate, n = Math.floor(5 * SR), b = c.createBuffer(2, n, SR); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0, env = 0.5; for (let i = 0; i < n; i++) { if (i % 64 === 0) env += (Math.random() - 0.5) * 0.3; env = Math.max(0.2, Math.min(1, env)); const w = Math.random() * 2 - 1; lp += 0.35 * (w - lp); d[i] = (w - lp) * 0.6 * env; } } return b; };
  const mkLoop = (c, buf, f, q) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const g = c.createGain(); g.gain.value = 0; const p = c.createStereoPanner ? c.createStereoPanner() : null; s.connect(bp).connect(g); if (p) g.connect(p).connect(audio.master); else g.connect(audio.master); s.start(0, Math.random() * 3); return { g, p }; };
  let frameN = 0;
  return {
    group, nearestCreek, pool: { ...POOL, WATER_Y, RIM_TOP },
    update(dt, cam, player) {
      frameN++;
      for (let i = 0; i < boils.length; i++) { const s = 1 + 0.18 * Math.sin(U.uTime.value * 3.1 + i * 2.1); boils[i].scale.set(s, 0.8 + 0.3 * Math.sin(U.uTime.value * 4.3 + i), s); }
      if (!audio || !audio.started || !audio.ctx || frameN % 4) return;
      const c = audio.ctx, t = c.currentTime;
      if (!snd.ok) { snd.ok = true; snd.creek = mkLoop(c, brook(c), 900, 0.5); snd.fount = mkLoop(c, splash(c), 2600, 0.6); }
      const p = player || cam.position; const rgt = _r.set(1, 0, 0).applyQuaternion(cam.quaternion);
      const panTo = (x, z) => { const dx = x - cam.position.x, dz = z - cam.position.z, l = Math.hypot(dx, dz) || 1; return Math.max(-0.7, Math.min(0.7, (dx * rgt.x + dz * rgt.z) / l)); };
      const nc = nearestCreek(p.x, p.z); let gc = 0, panC = 0;
      if (nc) { const dy = Math.abs((cam.position.y - nc.s[2])); const d = Math.hypot(nc.d, Math.max(0, dy - 2)); gc = Math.pow(Math.max(0, 1 - d / 34), 2) * 0.42; panC = panTo(nc.s[0], nc.s[1]); }
      snd.creek.g.gain.setTargetAtTime(gc, t, 0.4); if (snd.creek.p) snd.creek.p.pan.setTargetAtTime(panC, t, 0.3);
      let gf = 0, panF = 0;
      for (const f of fountains) { const d = Math.hypot(f.x - p.x, f.z - p.z); const g = Math.pow(Math.max(0, 1 - d / f.r), 2) * f.g; if (g > gf) { gf = g; panF = panTo(f.x, f.z); } }
      const lud = lm && lm.byId.get('ludwigs-fountain'); if (lud && lud.anchors && lud.anchors.water) { const w = lud.anchors.water, d = Math.hypot(w[0] - p.x, w[2] - p.z); const g = Math.pow(Math.max(0, 1 - d / 24), 2) * 0.55; if (g > gf) { gf = g; panF = panTo(w[0], w[2]); } }
      snd.fount.g.gain.setTargetAtTime(gf, t, 0.4); if (snd.fount.p) snd.fount.p.pan.setTargetAtTime(panF, t, 0.3);
    },
  };
}
const _r = new THREE.Vector3();
