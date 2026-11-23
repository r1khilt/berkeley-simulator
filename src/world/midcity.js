// Surrounding Berkeley/Oakland buildings (outside the LiDAR core): simple extrusions coloured from the aerial photo.
import * as THREE from 'three';
import { U } from '../materials.js';
import { LOD } from '../render/lod.js'; // [r7-lod]
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
    const top = base + 0.5 + h; const tt = T(cx, cz);
    const w = WALLS[Math.floor(rnd() * WALLS.length)]; const r = [rc[0] / 255 * 0.8, rc[1] / 255 * 0.8, rc[2] / 255 * 0.8].map((v) => Math.pow(v, 2.2) * 1.15);
    const emitB = (t, pts, a, cx, cz) => { // [r7-lod] one building into a tile buffer (full or far set)
    const push = (A, B, C, col, nrm) => { t.p.push(...A, ...B, ...C); for (let k = 0; k < 3; k++) { t.c.push(...col); t.n.push(...nrm); } };
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length]; const ex = q[0] - p[0], ez = q[1] - p[1], L = Math.hypot(ex, ez) || 1; const nrm = [ez / L, 0, -ex / L];
      const A = [p[0], base, p[1]], B = [q[0], base, q[1]], C = [q[0], top, q[1]], D = [p[0], top, p[1]];
      push(A, C, B, w, nrm); push(A, D, C, w, nrm);
    }
    const pyr = kind === 1 && pts.length <= 8;
    if (pyr) { const apex = [cx, top + Math.min(3.0, Math.sqrt(Math.abs(a / 2)) * 0.28), cz]; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; const A = [p[0], top, p[1]], B = [q[0], top, q[1]]; const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = apex[0] - A[0], vy = apex[1] - A[1], vz = apex[2] - A[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; if (ny < 0) { push(A, B, apex, r, [-nx / nl, -ny / nl, -nz / nl]); } else push(A, apex, B, r, [nx / nl, ny / nl, nz / nl]); } }
    else { const tri = THREE.ShapeUtils.triangulateShape(pts.map((p) => new THREE.Vector2(p[0], p[1])), []); for (const [i0, i1, i2] of tri) { const A = [pts[i0][0], top, pts[i0][1]], B = [pts[i1][0], top, pts[i1][1]], C = [pts[i2][0], top, pts[i2][1]]; const ar = (B[0] - A[0]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[0] - A[0]); if (ar > 0) push(A, C, B, r, [0, 1, 0]); else push(A, B, C, r, [0, 1, 0]); } }
    };
    emitB(tt, pts, a, cx, cz);
    (tt.jobs || (tt.jobs = [])).push(() => { const sp = simplifyFootprint(pts, Math.abs(a / 2)); emitB(tt.far || (tt.far = { p: [], c: [], n: [] }), sp, sp.a2 ?? a, cx, cz); }); // [r7-lod] far set, built after start-up in ~3 ms slices
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
  const lodTiles = []; // [r7-lod] per tile: full mesh + simplified far mesh, picked by projected footprint error
  const mk = (t) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(t.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(t.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(t.c, 3)); g.computeBoundingSphere(); g.computeBoundingBox();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = false; group.add(m); return m; };
  for (const t of tiles.values()) {
    if (!t.p.length) continue;
    const full = mk(t); t.p = t.c = t.n = null; lodTiles.push({ full, far: null, box: full.geometry.boundingBox, t, j: 0 }); // [r7-lod] (source arrays freed: only the far-set jobs stay)
  }
  // [r7-lod] simplified footprints are within ~2 m of the real ones: switch when that error is under ~1.5 px (x LOD.bias).
  // The far sets are built lazily (a few ms per frame, nearest-first is not needed: every tile is far from campus), so
  // loading pays nothing; until a tile's far set exists it keeps drawing the full one.
  const _v = new THREE.Vector3(); let todo = LOD.on ? lodTiles.slice() : [];
  group.userData.updateLod = (cp) => {
    if (todo.length) { const t0 = performance.now(); while (todo.length && performance.now() - t0 < 3) { const L = todo[0], jobs = L.t.jobs || [];
      while (L.j < jobs.length && performance.now() - t0 < 3) jobs[L.j++]();
      if (L.j >= jobs.length) { todo.shift(); L.t.jobs = null; if (L.t.far && L.t.far.p.length) { L.far = mk(L.t.far); L.far.visible = false; } L.t.far = null; } } }
    const dFar = LOD.on ? LOD.distFor(2.0, 1.5) : Infinity;
    for (const L of lodTiles) { if (!L.far) continue; const d = L.box.distanceToPoint(_v.copy(cp)); const f = d > dFar; L.full.visible = !f; L.far.visible = f; } };
  group.userData.buildAllLod = () => { while (todo.length) group.userData.updateLod(new THREE.Vector3(0, 0, 0)); }; // QA: finish the far sets now
  return group;
}

// [r7-lod] far footprint: small buildings become their area-preserving oriented box (PCA axes), larger ones are
// Douglas-Peucker simplified (1.5 m). Returns the new ring (CCW like the input) with its signed double area in .a2.
function simplifyFootprint(pts, area) {
  const n = pts.length; if (n <= 4) return pts;
  let out;
  if (area < 320) {
    let cx = 0, cz = 0; for (const p of pts) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
    let sxx = 0, szz = 0, sxz = 0; for (const p of pts) { const dx = p[0] - cx, dz = p[1] - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
    const th = 0.5 * Math.atan2(2 * sxz, sxx - szz), ux = Math.cos(th), uz = Math.sin(th);
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9; for (const p of pts) { const dx = p[0] - cx, dz = p[1] - cz, a = dx * ux + dz * uz, b = -dx * uz + dz * ux; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
    const k = Math.sqrt(Math.min(1, area / Math.max(1e-3, (a1 - a0) * (b1 - b0)))), am = (a0 + a1) / 2, bm = (b0 + b1) / 2, ha = (a1 - a0) / 2 * k, hb = (b1 - b0) / 2 * k;
    out = [[-ha, -hb], [ha, -hb], [ha, hb], [-ha, hb]].map(([a, b]) => [cx + (am + a) * ux - (bm + b) * uz, cz + (am + a) * uz + (bm + b) * ux]);
  } else {
    const keep = new Uint8Array(n); keep[0] = 1; let far = 0, fd = -1; for (let i = 1; i < n; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } } keep[far] = 1;
    const dp = (i, j) => { if (j <= i + 1) return; const A = pts[i], B = pts[j % n]; const ex = B[0] - A[0], ez = B[1] - A[1], L = Math.hypot(ex, ez) || 1e-6; let m = -1, mi = -1;
      for (let k = i + 1; k < j; k++) { const d = Math.abs((pts[k][0] - A[0]) * ez - (pts[k][1] - A[1]) * ex) / L; if (d > m) { m = d; mi = k; } } if (m > 1.5) { keep[mi] = 1; dp(i, mi); dp(mi, j); } };
    dp(0, far); dp(far, n);
    out = pts.filter((_, i) => keep[i]); if (out.length < 3) return pts;
  }
  let a2 = 0; for (let i = 0; i < out.length; i++) { const p = out[i], q = out[(i + 1) % out.length]; a2 += p[0] * q[1] - q[0] * p[1]; }
  if (a2 < 0) { out.reverse(); a2 = -a2; }
  out.a2 = a2; return out;
}
