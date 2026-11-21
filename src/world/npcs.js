// Pedestrians walking the campus footpath network: instanced, vertex-shader animated, coloured per instance.
import * as THREE from 'three';
import { U } from '../materials.js';
function personGeometry() {
  // parts: 0 torso, 1 head, 2 hair, 3 legL, 4 legR, 5 armL, 6 armR, 7 backpack, 8 shoes
  const parts = [];
  const add = (g, part, tx, ty, tz) => { g = g.toNonIndexed(); g.translate(tx, ty, tz); const n = g.attributes.position.count; g.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(n).fill(part), 1)); parts.push(g); };
  add(new THREE.CapsuleGeometry(0.17, 0.32, 3, 8).scale(1.05, 1, 0.65), 0, 0, 1.22, 0);
  add(new THREE.SphereGeometry(0.11, 10, 8).scale(0.92, 1.05, 1), 1, 0, 1.62, 0);
  add(new THREE.SphereGeometry(0.118, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), 2, 0, 1.635, 0.01);
  for (const s of [-1, 1]) {
    const leg = new THREE.CapsuleGeometry(0.065, 0.74, 3, 6); add(leg, s < 0 ? 3 : 4, 0.095 * s, 0.5, 0);
    const arm = new THREE.CapsuleGeometry(0.045, 0.5, 3, 6); add(arm, s < 0 ? 5 : 6, 0.225 * s, 1.15, 0);
    const shoe = new THREE.BoxGeometry(0.1, 0.07, 0.24); add(shoe, 8 + (s < 0 ? 0 : 0.5), 0.095 * s, 0.035, -0.05);
  }
  add(new THREE.BoxGeometry(0.28, 0.36, 0.13), 7, 0, 1.22, 0.16);
  // merge
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), part = new Float32Array(n); let o = 0;
  for (const g of parts) { g.computeVertexNormals(); const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); part.set(g.attributes.aPart.array, o); o += c; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
  return geo;
}
export class Pedestrians {
  constructor({ paths, heightAt, max = 140 }) {
    this.heightAt = heightAt; this.max = max;
    // graph
    const key = (p) => Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2);
    const nodes = new Map(); const adj = [];
    const nid = (p) => { const k = key(p); let i = nodes.get(k); if (i == null) { i = adj.length; nodes.set(k, i); adj.push({ p, e: [] }); } return i; };
    for (const L of paths) {
      if (L.tunnel || !(L.hw === 'footway' || L.hw === 'pedestrian' || L.hw === 'path' || L.hw === 'steps' || L.hw === 'cycleway')) continue;
      for (let k = 0; k < L.pts.length - 1; k++) { const a = nid(L.pts[k]), b = nid(L.pts[k + 1]); if (a === b) continue; adj[a].e.push(b); adj[b].e.push(a); }
    }
    this.adj = adj;
    this.cellIdx = new Map(); adj.forEach((n, i) => { const c = Math.floor(n.p[0] / 60) + ',' + Math.floor(n.p[1] / 60); let l = this.cellIdx.get(c); if (!l) this.cellIdx.set(c, (l = [])); if (n.e.length) l.push(i); });
    const geo = personGeometry();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.uTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float aPart; attribute vec3 aAnim; uniform float uTime; varying float vPart; varying vec3 vSeed;
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c); }`)
        .replace('#include <begin_vertex>', `vec3 transformed = position; vPart = aPart; vSeed = aAnim;
 float ph = uTime * aAnim.y * 6.2831 + aAnim.x * 6.2831; float sw = sin(ph) * aAnim.z;
 if (aPart > 2.5 && aPart < 4.5) { float sgn = aPart < 3.5 ? 1.0 : -1.0; vec3 piv = vec3(0.0, 0.92, 0.0); transformed = piv + rotX(sw * 0.55 * sgn) * (transformed - piv); }
 if (aPart > 7.9) { float sgn = aPart < 8.25 ? 1.0 : -1.0; vec3 piv = vec3(0.0, 0.92, 0.0); transformed = piv + rotX(sw * 0.55 * sgn) * (transformed - piv); }
 if (aPart > 4.5 && aPart < 6.5) { float sgn = aPart < 5.5 ? -1.0 : 1.0; vec3 piv = vec3(0.0, 1.42, 0.0); transformed = piv + rotX(sw * 0.45 * sgn) * (transformed - piv); }
 transformed.y += abs(cos(ph)) * 0.03 * aAnim.z;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vPart; varying vec3 vSeed;
float hs(float n){ return fract(sin(n*91.345)*47453.1); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
 { float id = vSeed.x * 1000.0; vec3 skinA[4]; skinA[0]=vec3(0.86,0.66,0.52); skinA[1]=vec3(0.70,0.50,0.36); skinA[2]=vec3(0.48,0.32,0.22); skinA[3]=vec3(0.95,0.78,0.64);
   vec3 skin = skinA[int(hs(id)*3.99)];
   vec3 pal[6]; pal[0]=vec3(0.09,0.13,0.24); pal[1]=vec3(0.05,0.05,0.06); pal[2]=vec3(0.42,0.37,0.27); pal[3]=vec3(0.22,0.25,0.17); pal[4]=vec3(0.28,0.28,0.30); pal[5]=vec3(0.16,0.22,0.36);
   vec3 pants = pal[int(hs(id+3.0)*5.99)];
   vec3 hair = mix(vec3(0.05,0.04,0.03), vec3(0.35,0.22,0.12), hs(id+5.0));
   vec3 c = diffuseColor.rgb; // instance colour = top
   if (vPart > 0.5 && vPart < 1.5) c = skin; else if (vPart > 1.5 && vPart < 2.5) c = hair; else if (vPart > 2.5 && vPart < 4.5) c = pants; else if (vPart > 6.5 && vPart < 7.5) c = hs(id+7.0) > 0.45 ? mix(vec3(0.08,0.1,0.14), vec3(0.3,0.08,0.06), hs(id+8.0)) : c; else if (vPart > 7.9) c = vec3(0.85,0.85,0.82)*hs(id+11.0)+0.08;
   if (vPart > 4.5 && vPart < 6.5) c = mix(c, skin, step(0.75, hs(id+13.0)));
   diffuseColor.rgb = c; }`);
    };
    mat.customProgramCacheKey = () => 'peds';
    this.mesh = new THREE.InstancedMesh(geo, mat, max); this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.name = 'pedestrians';
    this.anim = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3); geo.setAttribute('aAnim', this.anim);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.peds = []; this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.up = new THREE.Vector3(0, 1, 0);
    const tops = ['#003262', '#fdb515', '#2b2b2b', '#e8e4da', '#7a1f2b', '#2d5a3d', '#5f6b7a', '#c4482e', '#1f3d73', '#d9d2c3', '#3a3f45', '#8a6d4b'];
    this.tops = tops.map((h) => new THREE.Color(h));
    this.mesh.count = 0;
  }
  spawnNear(cx, cz, far = false) {
    const keys = []; const R = far ? 3 : 2;
    for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) { const l = this.cellIdx.get((Math.floor(cx / 60) + i) + ',' + (Math.floor(cz / 60) + j)); if (l) keys.push(l); }
    if (!keys.length) return null; const l = keys[Math.floor(Math.random() * keys.length)]; const a = l[Math.floor(Math.random() * l.length)];
    const n = this.adj[a]; const b = n.e[Math.floor(Math.random() * n.e.length)];
    return { a, b, t: Math.random(), speed: 1.15 + Math.random() * 0.5, off: (Math.random() - 0.5) * 1.2, seed: Math.random(), top: this.tops[Math.floor(Math.random() * this.tops.length)] };
  }
  update(dt, cam, density = 1) {
    const want = Math.round(this.max * density);
    while (this.peds.length < want) { const p = this.spawnNear(cam.x, cam.z); if (!p) break; this.peds.push(p); }
    if (this.peds.length > want) this.peds.length = want;
    let k = 0; const arr = this.mesh.instanceMatrix.array;
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i]; const A = this.adj[p.a].p, B = this.adj[p.b].p;
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1; p.t += (p.speed * dt) / L;
      if (p.t >= 1) { const nb = this.adj[p.b].e; let nx = nb[Math.floor(Math.random() * nb.length)]; if (nb.length > 1 && nx === p.a) nx = nb[(nb.indexOf(nx) + 1) % nb.length]; p.a = p.b; p.b = nx; p.t = 0; continue; }
      const dx = (B[0] - A[0]) / L, dz = (B[1] - A[1]) / L;
      const x = A[0] + (B[0] - A[0]) * p.t - dz * p.off, z = A[1] + (B[1] - A[1]) * p.t + dx * p.off;
      if ((x - cam.x) ** 2 + (z - cam.z) ** 2 > 230 * 230) { const np = this.spawnNear(cam.x, cam.z, true); if (np) this.peds[i] = np; continue; }
      const y = this.heightAt(x, z);
      this.q.setFromAxisAngle(this.up, Math.atan2(-dx, -dz));
      this.m4.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(1, 0.94 + p.seed * 0.12, 1)); this.m4.toArray(arr, k * 16);
      this.anim.array[k * 3] = p.seed; this.anim.array[k * 3 + 1] = p.speed * 0.9; this.anim.array[k * 3 + 2] = 1.0;
      this.mesh.instanceColor.setXYZ(k, p.top.r, p.top.g, p.top.b);
      k++;
    }
    this.mesh.count = k; this.mesh.instanceMatrix.needsUpdate = true; this.anim.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
  }
}
