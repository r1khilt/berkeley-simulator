// Instanced grass blades around the camera on lawns (from the ground SDF grass channel), with wind and distance fade.
import * as THREE from 'three';
import { U } from '../materials.js';
function bladeClump() {
  const pos = [], col = [];
  // r4-ground: mown campus lawn -> short (4-10 cm) blades spread over the whole cell instead of tall 10-20 cm tufts,
  // which read as an unmown field and piled up into a 'hedge band' along the far edge of the blade radius
  const blades = 14;
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + Math.random() * 0.6, r = Math.sqrt(Math.random()) * 0.2;
    const x0 = Math.cos(a) * r, z0 = Math.sin(a) * r, h = 0.045 + Math.random() * 0.06, w = 0.006 + Math.random() * 0.004;
    const lean = (Math.random() - 0.5) * 0.12, dir = Math.random() * Math.PI * 2; const dx = Math.cos(dir), dz = Math.sin(dir);
    const nx = -dz * w, nz = dx * w;
    const tipx = x0 + Math.cos(a) * lean, tipz = z0 + Math.sin(a) * lean;
    // tapered blade: two triangles
    pos.push(x0 - nx, 0, z0 - nz, x0 + nx, 0, z0 + nz, tipx + nx * 0.15, h, tipz + nz * 0.15);
    pos.push(x0 - nx, 0, z0 - nz, tipx + nx * 0.15, h, tipz + nz * 0.15, tipx - nx * 0.15, h * 0.98, tipz - nz * 0.15);
    for (const yy of [0, 0, 1, 0, 1, 1]) col.push(yy);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aTip', new THREE.Float32BufferAttribute(col, 1));
  const n = new Float32Array(pos.length); for (let i = 0; i < n.length; i += 3) { n[i] = 0; n[i + 1] = 1; n[i + 2] = 0; } g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}
export class Grass {
  constructor({ sdf, gt, core, heightAt, count = 22000, radius = 15 }) { // r4-ground: 26 -> 15 m (short blades are sub-pixel beyond)
    this.sdf = sdf; this.gt = gt; this.core = core; this.heightAt = heightAt; this.radius = radius; this.count = count; this.last = new THREE.Vector3(1e9, 0, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind; sh.uniforms.uR = { value: radius };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTip; uniform float uTime, uWind, uR; varying float vTip;')
        .replace('#include <begin_vertex>', `vec3 transformed = position; vTip = aTip;
 vec4 wpI = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
 float d = distance(wpI.xz, cameraPosition.xz); float fade = 1.0 - smoothstep(uR*0.45, uR, d);
 transformed.y *= fade;
 float w = sin(uTime*1.8 + wpI.x*0.35 + wpI.z*0.27) * 0.5 + sin(uTime*3.1 + wpI.x*1.3) * 0.25;
 transformed.x += aTip * w * 0.05 * (0.4 + uWind); transformed.z += aTip * w * 0.03 * (0.4 + uWind);`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTip;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a = -1.0 - gl_FragColor.a; // r4-ground: lawn = terrain for the post AO pass').replace('#include <color_fragment>', `#include <color_fragment>
 diffuseColor.rgb *= mix(0.55, 1.3, vTip);`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
 normal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);`);
    };
    mat.customProgramCacheKey = () => 'grass5';
    this.mesh = new THREE.InstancedMesh(bladeClump(), mat, count); this.mesh.frustumCulled = false; this.mesh.receiveShadow = true; this.mesh.castShadow = false; this.mesh.name = 'grass';
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3); this.mesh.count = 0;
  }
  isGrass(x, z) {
    // r4-ground: bilinear SDF lookup (was nearest 1.6 m texel, so blades spilled up to ~1 m onto paths) and no blades in
    // beds; blade cells stay >= ~0.35 m off paving so tufts (r 0.2 m) don't overhang the path edge
    const gt = this.gt, c = this.core; const fx = (x - c.x0) / gt.step - 0.5, fz = (z - c.z0) / gt.step - 0.5;
    const j = Math.floor(fx), i = Math.floor(fz); if (i < 0 || j < 0 || i >= gt.nz - 1 || j >= gt.nx - 1) return 0;
    const tx = fx - j, tz = fz - i, s = this.sdf, k = (i * gt.nx + j) * 4, kx = k + 4, kz = k + gt.nx * 4, kxz = kz + 4;
    const v = (o) => (s[k + o] * (1 - tx) + s[kx + o] * tx) * (1 - tz) + (s[kz + o] * (1 - tx) + s[kxz + o] * tx) * tz;
    if (v(0) > 112 || v(1) > 112 || v(3) > 120) return 0; return v(2) > 140 ? 1 : 0;
  }
  update(cam) {
    if (cam.y - this.heightAt(cam.x, cam.z) > 40) { this.mesh.count = 0; return; }
    if (cam.distanceToSquared(this.last) < 9) return; this.last.copy(cam);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3();
    const R = this.radius, step = 0.3; let k = 0; const arr = this.mesh.instanceMatrix.array; const col = this.mesh.instanceColor.array;
    const x0 = Math.floor((cam.x - R) / step), x1 = Math.ceil((cam.x + R) / step), z0 = Math.floor((cam.z - R) / step), z1 = Math.ceil((cam.z + R) / step);
    for (let gi = x0; gi <= x1 && k < this.count; gi++) for (let gj = z0; gj <= z1 && k < this.count; gj++) {
      const h = Math.sin(gi * 127.1 + gj * 311.7) * 43758.5453; const r1 = h - Math.floor(h); const h2 = Math.sin(gi * 269.5 + gj * 183.3) * 43758.5453; const r2 = h2 - Math.floor(h2);
      const x = (gi + r1) * step, z = (gj + r2) * step; const dx = x - cam.x, dz = z - cam.z; if (dx * dx + dz * dz > R * R) continue;
      if (!this.isGrass(x, z)) continue;
      p.set(x, this.heightAt(x, z), z); q.setFromAxisAngle(up, r1 * 6.283); const s = 0.75 + r2 * 0.6; sc.set(s, s * (0.8 + r1 * 0.5), s);
      m.compose(p, q, sc); m.toArray(arr, k * 16);
      const t = 0.85 + r2 * 0.3; const dry = r1 > 0.8 ? 1.2 : 1.0; col[k * 3] = 0.085 * t * dry; col[k * 3 + 1] = 0.13 * t; col[k * 3 + 2] = 0.045 * t; // r4-ground: ~lawn texture albedo
      k++;
    }
    this.mesh.count = k; this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
  }
}
