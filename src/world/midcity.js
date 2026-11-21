// Surrounding Berkeley/Oakland buildings (outside the LiDAR core): simple extrusions coloured from the aerial photo.
import * as THREE from 'three';
import { U } from '../materials.js';
const WALLS = [[0.86, 0.84, 0.78], [0.80, 0.76, 0.68], [0.72, 0.74, 0.70], [0.88, 0.86, 0.82], [0.70, 0.64, 0.56], [0.62, 0.66, 0.70], [0.82, 0.74, 0.62], [0.76, 0.70, 0.66]];
export function buildMidCity(list, heightAt) {
  const tiles = new Map();
  const T = (x, z) => { const k = Math.floor(x / 1200) + ',' + Math.floor(z / 1200); let t = tiles.get(k); if (!t) tiles.set(k, (t = { p: [], c: [], n: [] })); return t; };
  let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const [h, kind, rc, flat] of list) {
    const pts = []; for (let i = 0; i < flat.length; i += 2) pts.push([flat[i] / 2, flat[i + 1] / 2]);
    let cx = 0, cz = 0; for (const p of pts) { cx += p[0]; cz += p[1]; } cx /= pts.length; cz /= pts.length;
    let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    if (a < 0) pts.reverse();
    let base = Infinity; for (const p of pts) base = Math.min(base, heightAt(p[0], p[1])); base -= 0.5;
    const top = base + 0.5 + h; const t = T(cx, cz);
    const w = WALLS[Math.floor(rnd() * WALLS.length)]; const r = [rc[0] / 255 * 0.8, rc[1] / 255 * 0.8, rc[2] / 255 * 0.8].map((v) => Math.pow(v, 2.2) * 1.15);
    const push = (A, B, C, col, nrm) => { t.p.push(...A, ...B, ...C); for (let k = 0; k < 3; k++) { t.c.push(...col); t.n.push(...nrm); } };
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length]; const ex = q[0] - p[0], ez = q[1] - p[1], L = Math.hypot(ex, ez) || 1; const nrm = [ez / L, 0, -ex / L];
      const A = [p[0], base, p[1]], B = [q[0], base, q[1]], C = [q[0], top, q[1]], D = [p[0], top, p[1]];
      push(A, C, B, w, nrm); push(A, D, C, w, nrm);
    }
    const pyr = kind === 1 && pts.length <= 8;
    if (pyr) { const apex = [cx, top + Math.min(3.0, Math.sqrt(Math.abs(a / 2)) * 0.28), cz]; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; const A = [p[0], top, p[1]], B = [q[0], top, q[1]]; const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = apex[0] - A[0], vy = apex[1] - A[1], vz = apex[2] - A[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; if (ny < 0) { push(A, B, apex, r, [-nx / nl, -ny / nl, -nz / nl]); } else push(A, apex, B, r, [nx / nl, ny / nl, nz / nl]); } }
    else { const tri = THREE.ShapeUtils.triangulateShape(pts.map((p) => new THREE.Vector2(p[0], p[1])), []); for (const [i0, i1, i2] of tri) { const A = [pts[i0][0], top, pts[i0][1]], B = [pts[i1][0], top, pts[i1][1]], C = [pts[i2][0], top, pts[i2][1]]; const ar = (B[0] - A[0]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[0] - A[0]); if (ar > 0) push(A, C, B, r, [0, 1, 0]); else push(A, B, C, r, [0, 1, 0]); } }
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = U.uNight;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWM; varying vec3 vNM;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWM = transformed; vNM = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight; varying vec3 vWM; varying vec3 vNM;\nfloat hm(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }')
      .replace('#include <color_fragment>', `#include <color_fragment>
 float side = step(abs(vNM.y), 0.5); float fl = fract(vWM.y / 3.2); float along = fract((vWM.x + vWM.z) / 3.0);
 float win = side * step(0.35, fl) * step(fl, 0.8) * step(0.25, along) * step(along, 0.75);
 diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08, 0.09, 0.1), win * 0.7);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 float fl2 = floor(vWM.y / 3.2); float cell = floor((vWM.x + vWM.z) / 3.0);
 float lit = step(0.7, hm(vec2(cell, fl2))) * step(abs(vNM.y), 0.5) * step(0.35, fract(vWM.y/3.2)) * step(fract(vWM.y/3.2), 0.8) * step(0.25, fract((vWM.x + vWM.z) / 3.0)) * step(fract((vWM.x + vWM.z) / 3.0), 0.75);
 totalEmissiveRadiance += vec3(1.0, 0.8, 0.55) * lit * uNight * 1.6;`);
  };
  mat.customProgramCacheKey = () => 'midcity';
  const group = new THREE.Group(); group.name = 'midcity';
  for (const t of tiles.values()) {
    if (!t.p.length) continue;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(t.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(t.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(t.c, 3)); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = false; group.add(m);
  }
  return group;
}
