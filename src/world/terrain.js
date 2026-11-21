// Terrain: core (1 m LiDAR) GPU-displaced chunked LOD + mid/far rings textured with orthophotos + bay water.
import * as THREE from 'three';
import { noiseTexture } from './noiseTex.js';
import { U } from '../materials.js';

export const CHUNK = 64;
const LODS = [64, 32, 16, 8, 4];
const LOD_DIST = [130, 320, 760, 1600, 1e9];

function chunkGeometry(n, size) {
  // (n+1)^2 grid + skirt ring; attribute aSkirt marks skirt verts
  const verts = [], skirt = [], idx = [];
  const s = size / n;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { verts.push(j * s, 0, i * s); skirt.push(0); }
  const id = (i, j) => i * (n + 1) + j;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const a = id(i, j), b = id(i, j + 1), c = id(i + 1, j), d = id(i + 1, j + 1);
    // alternate diagonal for nicer shading
    if ((i + j) % 2 === 0) idx.push(a, c, b, b, c, d); else idx.push(a, c, d, a, d, b);
  }
  // skirt: duplicate border verts
  const border = [];
  for (let j = 0; j <= n; j++) border.push([0, j]);
  for (let i = 1; i <= n; i++) border.push([i, n]);
  for (let j = n - 1; j >= 0; j--) border.push([n, j]);
  for (let i = n - 1; i >= 1; i--) border.push([i, 0]);
  const base = verts.length / 3;
  for (const [i, j] of border) { verts.push(j * s, 0, i * s); skirt.push(1); }
  for (let k = 0; k < border.length; k++) {
    const k2 = (k + 1) % border.length;
    const a = id(border[k][0], border[k][1]), b = id(border[k2][0], border[k2][1]);
    const c = base + k, d = base + k2;
    idx.push(a, c, b, b, c, d, a, b, c, b, d, c); // both windings (cheap, avoids culling issues)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('aSkirt', new THREE.Float32BufferAttribute(skirt, 1));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(verts.length).map((_, k) => (k % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(idx);
  return g;
}

export class CoreTerrain {
  constructor({ heights, meta, sdf, special, aux, ortho, lampMap }) {
    const c = meta.core, gt = meta.groundTex, ax = meta.aux;
    this.meta = meta;
    this.x0 = c.x0; this.z0 = c.z0; this.nx = c.nx; this.nz = c.nz; this.step = c.step;
    const hTex = new THREE.DataTexture(heights, c.nx, c.nz, THREE.RedFormat, THREE.FloatType);
    hTex.magFilter = hTex.minFilter = THREE.NearestFilter; hTex.needsUpdate = true;
    const sTex = new THREE.DataTexture(sdf, gt.nx, gt.nz, THREE.RGBAFormat);
    sTex.magFilter = THREE.LinearFilter; sTex.minFilter = THREE.LinearMipmapLinearFilter; sTex.generateMipmaps = true; sTex.anisotropy = 8; sTex.needsUpdate = true;
    const spTex = new THREE.DataTexture(special, gt.snx || gt.nx, gt.snz || gt.nz, THREE.RedFormat);
    spTex.magFilter = spTex.minFilter = THREE.NearestFilter; spTex.needsUpdate = true;
    const aTex = new THREE.DataTexture(aux, ax.nx, ax.nz, THREE.RGFormat);
    aTex.magFilter = THREE.LinearFilter; aTex.minFilter = THREE.LinearMipmapLinearFilter; aTex.generateMipmaps = true; aTex.needsUpdate = true;
    let oTex = null;
    if (ortho) { oTex = new THREE.Texture(ortho); oTex.colorSpace = THREE.SRGBColorSpace; oTex.flipY = false; oTex.generateMipmaps = true; oTex.minFilter = THREE.LinearMipmapLinearFilter; oTex.needsUpdate = true; }
    this.uniforms = {
      uHeight: { value: hTex }, uSdf: { value: sTex }, uSpecial: { value: spTex }, uAux: { value: aTex }, uNoise: { value: noiseTexture() },
      uOrtho: { value: oTex }, uLamp: { value: lampMap || null }, uLeaf: { value: null },
      uLampRect: { value: new THREE.Vector4(c.x0, c.z0, c.nx * c.step, c.nz * c.step) },
      uCore: { value: new THREE.Vector4(c.x0 + 0.5 * c.step, c.z0 + 0.5 * c.step, c.step, 0) },
      uCoreSize: { value: new THREE.Vector2(c.nx, c.nz) },
      uGround: { value: new THREE.Vector4(meta.core.x0, meta.core.z0, gt.nx * gt.step, gt.nz * gt.step) },
      uAuxRect: { value: new THREE.Vector4(meta.core.x0, meta.core.z0, ax.nx * ax.step, ax.nz * ax.step) },
      uNight: U.uNight, uTime: U.uTime,
    };
    this.material = this.makeMaterial();
    // per-chunk min/max for culling
    const ncx = Math.ceil((c.nx * c.step) / CHUNK), ncz = Math.ceil((c.nz * c.step) / CHUNK);
    this.ncx = ncx; this.ncz = ncz;
    this.chunks = [];
    for (let ci = 0; ci < ncz; ci++) for (let cj = 0; cj < ncx; cj++) {
      let mn = 1e9, mx = -1e9;
      const j0 = Math.floor(cj * CHUNK / c.step), j1 = Math.min(c.nx - 1, Math.ceil((cj + 1) * CHUNK / c.step));
      const i0 = Math.floor(ci * CHUNK / c.step), i1 = Math.min(c.nz - 1, Math.ceil((ci + 1) * CHUNK / c.step));
      for (let i = i0; i <= i1; i += 4) for (let j = j0; j <= j1; j += 4) { const h = heights[i * c.nx + j]; if (h < mn) mn = h; if (h > mx) mx = h; }
      const x = c.x0 + cj * CHUNK, z = c.z0 + ci * CHUNK;
      this.chunks.push({ x, z, box: new THREE.Box3(new THREE.Vector3(x, mn - 4, z), new THREE.Vector3(x + CHUNK, mx + 1, z + CHUNK)) });
    }
    this.group = new THREE.Group(); this.group.name = 'coreTerrain';
    this.meshes = LODS.map((n) => {
      const m = new THREE.InstancedMesh(chunkGeometry(n, CHUNK), this.material, this.chunks.length);
      m.frustumCulled = false; m.receiveShadow = true; m.castShadow = false; m.count = 0;
      this.group.add(m); return m;
    });
    this._frustum = new THREE.Frustum(); this._m = new THREE.Matrix4(); this._v = new THREE.Vector3();
  }
  makeMaterial() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
    const un = this.uniforms;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, un);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
uniform sampler2D uHeight; uniform vec4 uCore; uniform vec2 uCoreSize;
attribute float aSkirt; varying vec3 vWPos;
float coreH(vec2 w){ vec2 f=(w-uCore.xy)/uCore.z; f=clamp(f,vec2(0.0),uCoreSize-1.001); ivec2 i=ivec2(floor(f)); vec2 t=f-vec2(i);
 float a=texelFetch(uHeight,i,0).r, b=texelFetch(uHeight,i+ivec2(1,0),0).r, c=texelFetch(uHeight,i+ivec2(0,1),0).r, d=texelFetch(uHeight,i+ivec2(1,1),0).r;
 return mix(mix(a,b,t.x),mix(c,d,t.x),t.y); }`)
        .replace('#include <begin_vertex>', `vec4 wp0 = instanceMatrix * vec4(position,1.0);
 vec3 transformed = vec3(position.x, coreH(wp0.xz) - aSkirt*4.0, position.z);
 vWPos = vec3(wp0.x, transformed.y, wp0.z);`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
uniform sampler2D uHeight, uSdf, uSpecial, uAux, uNoise, uOrtho, uLamp, uLeaf; uniform vec4 uCore, uGround, uAuxRect, uLampRect; uniform vec2 uCoreSize; uniform float uNight, uTime;
varying vec3 vWPos;
float coreHf(vec2 w){ vec2 f=(w-uCore.xy)/uCore.z; f=clamp(f,vec2(0.0),uCoreSize-1.001); ivec2 i=ivec2(floor(f)); vec2 t=f-vec2(i);
 float a=texelFetch(uHeight,i,0).r, b=texelFetch(uHeight,i+ivec2(1,0),0).r, c=texelFetch(uHeight,i+ivec2(0,1),0).r, d=texelFetch(uHeight,i+ivec2(1,1),0).r;
 return mix(mix(a,b,t.x),mix(c,d,t.x),t.y); }
float aaStep(float d){ float fw=max(fwidth(d),1e-4); return smoothstep(-fw,fw,d); }
vec3 gCol; float gRough; vec3 gBumpN; float gAO; vec3 gEmis;
void groundShade(vec2 w, float dist){
  vec4 s = texture(uSdf, (w - uGround.xy)/uGround.zw);
  vec2 ax = texture(uAux, (w - uAuxRect.xy)/uAuxRect.zw).rg;
  float sp = floor(texture(uSpecial, (w - uGround.xy)/uGround.zw).r*255.0+0.5);
  vec4 n0 = texture(uNoise, w*0.013); vec4 n1 = texture(uNoise, w*0.071); vec4 n2 = texture(uNoise, w*0.37); vec4 n3 = texture(uNoise, w*1.9);
  float fade = clamp(dist/120.0, 0.0, 1.0);
  float edgeN = (n1.g-0.5)*0.9 + (n2.b-0.5)*0.35;
  float dA=(s.r-0.5)*6.0, dP=(s.g-0.5)*6.0, dG=(s.b-0.5)*6.0, dD=(s.a-0.5)*6.0;
  float mA = aaStep(dA+0.05), mP = aaStep(dP+0.05+(n2.b-0.5)*0.06), mG = aaStep(dG+edgeN*0.7), mD = aaStep(dD+edgeN);
  float lush = ax.r, ao = ax.g;
  // natural ground: November = mostly dry golden grass except irrigated lawns
  vec3 dry = mix(vec3(0.44,0.37,0.22), vec3(0.58,0.50,0.31), n1.r) * (0.85+0.3*n2.g);
  vec3 lushC = mix(vec3(0.16,0.25,0.08), vec3(0.24,0.33,0.11), n1.g) * (0.85+0.3*n2.r);
  vec3 col = mix(dry, lushC, smoothstep(0.25,0.85,lush));
  float rough = 0.97;
  // lawn
  vec3 lawn = mix(vec3(0.12,0.19,0.06), vec3(0.20,0.28,0.09), n1.r*0.6+n2.g*0.4);
  lawn *= 0.82 + 0.3*n0.g;                                   // macro variation
  lawn = mix(lawn, lawn*vec3(1.12,1.04,0.82), smoothstep(0.55,0.8,n0.r)*0.6); // dry patches
  float mow = step(0.5, fract(dot(w, vec2(0.7071,0.7071))/5.0)); lawn *= mix(1.0, 0.94 + 0.12*mow, (1.0-fade)*0.8); // mowing stripes
  lawn *= 0.82 + 0.36*n3.b*(1.0-fade*0.7);
  lawn = mix(lawn, vec3(0.36,0.33,0.17), smoothstep(0.55,0.95,1.0-lush)*0.5);
  col = mix(col, lawn, mG);
  // forest floor / dirt paths
  vec3 litter = mix(vec3(0.11,0.085,0.06), vec3(0.19,0.15,0.10), n2.r) * (0.8 + 0.4*n1.b);
  litter = mix(litter, vec3(0.13,0.16,0.08), smoothstep(0.6,0.85,n1.g)*0.5);   // patches of groundcover
  litter = mix(litter, vec3(0.45,0.36,0.18), step(0.82, n3.a+n2.b*0.3)*0.6);
  litter *= 0.8+0.4*n3.b*(1.0-fade*0.7);
  col = mix(col, litter, mD); rough = mix(rough, 1.0, mD);
  // pavement (concrete slabs with scored joints)
  vec3 conc = vec3(0.43,0.42,0.40) * (0.86+0.2*n1.r+0.1*n0.g+0.06*(n3.b-0.5)*(1.0-fade));
  vec2 jw = abs(fract(w/1.52)-0.5);
  float jl = max(fwidth(w.x/1.52), 1e-3);
  float joint = (1.0-smoothstep(0.0, jl*1.5, 0.5-max(jw.x,jw.y))) * (1.0-smoothstep(0.08, 0.3, jl*6.0)) * (1.0-fade);
  conc *= 1.0 - 0.25*joint;
  vec3 pav = conc;
  if (sp > 3.5 && sp < 4.5) { // brick pavers
    vec2 b = w*vec2(4.5,9.0); float row=floor(b.y); b.x += mod(row,2.0)*0.5; vec2 fb=fract(b);
    float lodB = 1.0 - smoothstep(0.05, 0.25, max(fwidth(b.x), fwidth(b.y)));
    float m = mix(1.0, step(0.06,fb.x)*step(0.1,fb.y), lodB);
    pav = mix(vec3(0.34,0.27,0.24), vec3(0.50,0.30,0.24)*(0.85+0.3*texture(uNoise, floor(b)*0.13).b*lodB), m);
  } else if (sp > 4.5 && sp < 5.5) { // granite pavers
    vec2 b=fract(w/0.9); float m=step(0.03,b.x)*step(0.03,b.y); pav = mix(vec3(0.42), vec3(0.66,0.64,0.60)*(0.9+0.2*n2.r), m);
  }
  col = mix(col, pav, mP); rough = mix(rough, 0.86, mP);
  // asphalt
  vec3 asph = vec3(0.11,0.11,0.115) * (0.82+0.36*n1.g) * (0.95+0.1*n3.b*(1.0-fade));
  asph = mix(asph, vec3(0.16,0.16,0.165), smoothstep(0.62,0.8,n0.r)*0.6); // patches
  float crack = (1.0-smoothstep(0.0,0.035,abs(n2.g-0.5))) * (1.0-fade) * 0.5;
  asph *= 1.0-crack;
  // curb band just outside asphalt where there is pavement
  float curb = (1.0-aaStep(dA)) * aaStep(dA+0.28) * mP;
  col = mix(col, asph, mA); rough = mix(rough, 0.92, mA);
  col = mix(col, vec3(0.66,0.65,0.62), curb);
  // special surfaces
  if (sp > 0.5 && sp < 1.5) { col = mix(vec3(0.42,0.17,0.12), vec3(0.50,0.22,0.15), n2.b); rough=0.9; }          // running track
  else if (sp > 1.5 && sp < 2.5) { col = mix(vec3(0.20,0.34,0.30), vec3(0.24,0.38,0.33), n1.g); rough=0.8; }       // courts
  else if (sp > 2.5 && sp < 3.5) { col = mix(vec3(0.66,0.58,0.44), vec3(0.74,0.66,0.50), n3.b); rough=1.0; }       // sand
  else if (sp > 5.5 && sp < 6.5) { float stripe=step(0.5,fract(w.x/6.0)); col = mix(vec3(0.16,0.30,0.09), vec3(0.19,0.34,0.11), stripe)*(0.92+0.15*n2.r); rough=0.95; }
  // late-autumn leaf litter under deciduous trees (planes, ginkgos, maples)
  vec4 lf = texture(uLeaf, (w - uLampRect.xy)/uLampRect.zw);
  if (lf.a > 0.01) {
    float dens = clamp(lf.a * 3.0, 0.0, 0.9) * (1.0 - mA*0.9);
    vec2 lc = w * 8.0; vec2 li = floor(lc); vec2 lr = fract(lc) - 0.5;
    float hh = fract(sin(dot(li, vec2(12.9898, 78.233))) * 43758.5453);
    float ang = hh * 6.283; vec2 rr = vec2(cos(ang)*lr.x - sin(ang)*lr.y, sin(ang)*lr.x + cos(ang)*lr.y);
    float shape = 1.0 - smoothstep(0.18, 0.3, length(rr * vec2(1.0, 1.9)));
    float leaf = step(1.0 - dens, fract(hh * 7.13)) * shape;
    float lodL = smoothstep(0.03, 0.12, max(fwidth(lc.x), fwidth(lc.y)));
    leaf = mix(leaf, dens * 0.3, lodL);
    vec3 leafC = mix(mix(vec3(0.70,0.50,0.14), vec3(0.52,0.28,0.09), fract(hh * 3.7)), vec3(0.78,0.66,0.20), step(0.8, fract(hh * 5.3)));
    col = mix(col, leafC, leaf); rough = mix(rough, 0.95, leaf);
  }
  // far: blend toward the real aerial photo colour
  float farK = smoothstep(500.0, 1400.0, dist);
  if (farK > 0.0) {
    vec3 o = texture(uOrtho, (w - uAuxRect.xy)/uAuxRect.zw).rgb;
    o = mix(o, vec3(dot(o, vec3(0.3,0.59,0.11)))*vec3(1.05,0.98,0.82), 0.25);
    col = mix(col, o*0.95, farK*0.65);
  }
  gCol = col; gRough = rough; gAO = mix(1.0, ao, 0.9);
  // micro bump from noise (fades with distance)
  float k = (1.0-fade) * (0.35*mG + 0.25*mD + 0.12*mA + 0.06*mP + 0.2*(1.0-max(max(mA,mP),max(mG,mD))));
  gBumpN = vec3((n3.b-0.5)*k, 0.0, (n3.a-0.5)*k);
  gEmis = texture(uLamp, (w - uLampRect.xy)/uLampRect.zw).rgb * uNight * (col * 2.6 + vec3(0.02, 0.016, 0.01));
}`)
        .replace('#include <map_fragment>', `float gDist = length(vWPos - cameraPosition);
 groundShade(vWPos.xz, gDist);
 diffuseColor.rgb = gCol;`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
 roughnessFactor = gRough;`)
        .replace('#include <normal_fragment_begin>', `
 float e = 1.0;
 float hL = coreHf(vWPos.xz - vec2(e,0.0)), hR = coreHf(vWPos.xz + vec2(e,0.0)), hD = coreHf(vWPos.xz - vec2(0.0,e)), hU = coreHf(vWPos.xz + vec2(0.0,e));
 vec3 wN = normalize(vec3(hL-hR, 2.0*e, hD-hU) + gBumpN);
 vec3 normal = normalize((viewMatrix * vec4(wN,0.0)).xyz);
 vec3 nonPerturbedNormal = normal;
 float faceDirection = 1.0;`)
        .replace('#include <normal_fragment_maps>', '')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 totalEmissiveRadiance += gEmis;`)
        .replace('#include <aomap_fragment>', `#include <aomap_fragment>
 reflectedLight.indirectDiffuse *= gAO; reflectedLight.indirectSpecular *= gAO; reflectedLight.directDiffuse *= mix(1.0, gAO, 0.35);`);
    };
    mat.customProgramCacheKey = () => 'coreTerrain-v7';
    return mat;
  }
  update(camera) {
    camera.updateMatrixWorld();
    this._m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._m);
    const counts = [0, 0, 0, 0, 0];
    const cp = camera.position; const m = new THREE.Matrix4();
    for (const ch of this.chunks) {
      if (!this._frustum.intersectsBox(ch.box)) continue;
      const dx = Math.max(ch.box.min.x - cp.x, 0, cp.x - ch.box.max.x), dz = Math.max(ch.box.min.z - cp.z, 0, cp.z - ch.box.max.z), dy = Math.max(ch.box.min.y - cp.y, 0, cp.y - ch.box.max.y);
      const d = Math.hypot(dx, dz, dy * 0.5);
      let l = 0; while (d > LOD_DIST[l]) l++;
      m.makeTranslation(ch.x, 0, ch.z);
      this.meshes[l].setMatrixAt(counts[l]++, m);
    }
    this.meshes.forEach((me, i) => { me.count = counts[i]; me.instanceMatrix.needsUpdate = true; });
    this.stats = counts;
  }
}

// Mid/far rings: CPU meshes built from a sampler, textured by orthophoto in world space
export function ringMesh({ sample, x0, x1, z0, z1, hole, step, texture, texRect, tile = 2000, skirt = 8, seasonal = true, name }) {
  const group = new THREE.Group(); group.name = name || 'ring';
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const tr = texRect;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTex = { value: texture }; sh.uniforms.uTexRect = { value: new THREE.Vector4(tr.x0, tr.z0, tr.x1 - tr.x0, tr.z1 - tr.z0) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D uTex; uniform vec4 uTexRect; varying vec3 vWP;`).replace('#include <map_fragment>', `
 vec3 o = texture(uTex, (vWP.xz - uTexRect.xy)/uTexRect.zw).rgb;
 ${seasonal ? `float lum = dot(o, vec3(0.3,0.59,0.11));
 float green = o.g - max(o.r, o.b);
 // late-autumn regrade: bright green grassland -> golden, keep dark tree canopy
 vec3 golden = vec3(lum*1.25, lum*1.08, lum*0.62);
 o = mix(o, golden, smoothstep(0.02, 0.10, green) * smoothstep(0.18, 0.32, lum) * 0.75);
 o *= 0.92;` : ''}
 diffuseColor.rgb = o;`);
  };
  mat.customProgramCacheKey = () => 'ring' + (seasonal ? 's' : '');
  // build tiles
  for (let tz = z0; tz < z1; tz += tile) for (let tx = x0; tx < x1; tx += tile) {
    const ex = Math.min(x1, tx + tile), ez = Math.min(z1, tz + tile);
    if (hole && tx >= hole.x0 && ex <= hole.x1 && tz >= hole.z0 && ez <= hole.z1) continue;
    const nx = Math.round((ex - tx) / step), nz = Math.round((ez - tz) / step);
    const pos = [], idx = [], vid = new Int32Array((nx + 1) * (nz + 1)).fill(-1);
    const inHole = (x, z) => hole && x > hole.x0 + 1e-6 && x < hole.x1 - 1e-6 && z > hole.z0 + 1e-6 && z < hole.z1 - 1e-6;
    for (let i = 0; i <= nz; i++) for (let j = 0; j <= nx; j++) {
      const x = tx + j * step, z = tz + i * step;
      vid[i * (nx + 1) + j] = pos.length / 3; pos.push(x, sample(x, z), z);
    }
    for (let i = 0; i < nz; i++) for (let j = 0; j < nx; j++) {
      const xa = tx + j * step, za = tz + i * step, xb = xa + step, zb = za + step;
      const cx = (xa + xb) / 2, cz = (za + zb) / 2;
      if (inHole(cx, cz)) continue;
      const a = vid[i * (nx + 1) + j], b = vid[i * (nx + 1) + j + 1], c = vid[(i + 1) * (nx + 1) + j], d = vid[(i + 1) * (nx + 1) + j + 1];
      idx.push(a, c, b, b, c, d);
    }
    if (!idx.length) continue;
    // skirts along hole boundary (drop down) to hide cracks against the finer terrain inside
    if (hole) {
      const addSkirt = (xa, za, xb, zb) => {
        const ia = pos.length / 3; pos.push(xa, sample(xa, za), za, xb, sample(xb, zb), zb, xa, sample(xa, za) - skirt, za, xb, sample(xb, zb) - skirt, zb);
        idx.push(ia, ia + 2, ia + 1, ia + 1, ia + 2, ia + 3, ia, ia + 1, ia + 2, ia + 1, ia + 3, ia + 2);
      };
      for (let j = 0; j < nx; j++) {
        const xa = tx + j * step, xb = xa + step;
        for (const z of [hole.z0, hole.z1]) if (z >= tz && z <= ez && xa >= hole.x0 - 1e-6 && xb <= hole.x1 + 1e-6) addSkirt(xa, z, xb, z);
      }
      for (let i = 0; i < nz; i++) {
        const za = tz + i * step, zb = za + step;
        for (const x of [hole.x0, hole.x1]) if (x >= tx && x <= ex && za >= hole.z0 - 1e-6 && zb <= hole.z1 + 1e-6) addSkirt(x, za, x, zb);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; group.add(m);
  }
  return group;
}

export function makeWater(size = 140000, level = 0.7) {
  const g = new THREE.PlaneGeometry(size, size, 1, 1); g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1f3a46, roughness: 0.12, metalness: 0.0, envMapIntensity: 1.0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uNoise = { value: noiseTexture() };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime; uniform sampler2D uNoise; varying vec3 vWP;`).replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
 { float d = length(vWP - cameraPosition); float k = 1.0/(1.0 + d*0.0015);
   vec2 p = vWP.xz; float t = uTime;
   float a = texture(uNoise, p*0.004 + vec2(t*0.004, t*0.002)).g - texture(uNoise, p*0.0043 - vec2(t*0.003, -t*0.0045)).g;
   float b = texture(uNoise, p*0.017 + vec2(-t*0.01, t*0.007)).b - texture(uNoise, p*0.019 + vec2(t*0.012, t*0.006)).b;
   vec3 wn = normalize(vec3(a*0.35*k + b*0.18*k, 1.0, b*0.35*k - a*0.18*k));
   normal = normalize((viewMatrix*vec4(wn,0.0)).xyz); }`);
  };
  mat.customProgramCacheKey = () => 'bayWater';
  const m = new THREE.Mesh(g, mat); m.position.y = level; m.receiveShadow = true; m.name = 'bay';
  return m;
}
