// [r5-audit-central] Site furniture shared by the round-5 central-core photo audit (Dwinelle Plaza, Wheeler Plaza, the
// Doe north terrace). Everything is authored in a Kit's building frame (u, v, y) with EXPLICIT base heights, so pieces
// can stand on terraces and landings that the terrain under them does not know about.
import * as THREE from 'three';
import { tint, solid } from './b02-kit.js';

const _m = new Map();
const local = (k, f) => { if (!_m.has(k)) _m.set(k, f()); return _m.get(k); };
export const castIron = () => local('iron', () => { const m = solid(0x1d1e1f, 0.55, 0.35); m.name = 'r5-castIron'; return m; });
export const steelTube = () => local('tube', () => { const m = solid(0xc9cdd0, 0.35, 0.8); m.name = 'r5-steelTube'; return m; });
export const timber = (M) => local('timber', () => tint(M.wood, 0x9c968c)); // weathered silver-grey slats
export const brickBand = (M) => local('brickBand', () => { const m = solid(0xb8735c, 0.85, 0); m.name = 'r5-brickBand'; return m; }); // flat salmon brick inlay (no bumpy brick normal map)
export const creamWall = (M) => local('creamWall', () => tint(M.stuccoWhite, 0xece6d8));
export const boardConcrete = (M) => local('boardConc', () => tint(M.concrete, 0xb4afa6));

// Black cast-iron campus lantern (fluted shaft, flared base, glass lantern with cap + finial), base at y.
export function lantern(K, u, y, v, { h = 4.3, mat = null } = {}) {
  const M = K.M; const m = mat || castIron();
  K.cyl(m, u, y, v, 0.2, 0.17, 0.55, 10, { detail: true });
  K.cyl(m, u, y + 0.55, v, 0.1, 0.075, h - 0.85, 10, { detail: true });
  K.cyl(m, u, y + h - 0.3, v, 0.09, 0.16, 0.12, 10, { detail: true });
  K.cyl(M.lampGlow, u, y + h - 0.18, v, 0.15, 0.2, 0.55, 8, { detail: true });
  K.cyl(m, u, y + h + 0.37, v, 0.27, 0.05, 0.22, 8, { detail: true });
  K.cyl(m, u, y + h + 0.59, v, 0.03, 0.01, 0.2, 6, { detail: true });
}
// Timber slat bench (3 slats, steel legs) centred at (u, v), long axis along u (rot=0) or v (rot=PI/2), seat at y + 0.45.
export function bench(K, u, y, v, { len = 2.4, rot = 0, back = false } = {}) {
  const M = K.M; const w = timber(M); const ca = Math.cos(rot), sa = Math.sin(rot);
  for (let i = 0; i < 3; i++) { const o = -0.17 + i * 0.17; K.obox(w, u - sa * o, y + 0.44, v + ca * o, len, 0.05, 0.13, rot, { detail: true }); }
  for (const k of [-0.42, 0.42]) K.obox(castIron(), u + ca * k * len, y + 0.21, v + sa * k * len, 0.06, 0.42, 0.5, rot, { detail: true });
  if (back) K.obox(w, u + sa * 0.27, y + 0.75, v - ca * 0.27, len, 0.12, 0.05, rot, { detail: true });
}
// Straight tube handrail between plan points a -> b at heights ya -> yb (rail 0.9 m above), posts every ~1.4 m.
export function tubeRail(K, a, ya, b, yb, { h = 0.9, mat = null, r = 0.025 } = {}) {
  const m = mat || steelTube(); const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.max(1, Math.round(L / 1.4));
  for (let i = 0; i <= n; i++) { const t = i / n; K.cyl(m, a[0] + (b[0] - a[0]) * t, ya + (yb - ya) * t, a[1] + (b[1] - a[1]) * t, r, r, h, 6, { detail: true }); }
  for (const hh of [h, h * 0.5]) {
    const len = Math.hypot(L, yb - ya); const g = new THREE.CylinderGeometry(r * 1.1, r * 1.1, len, 6); g.rotateZ(Math.PI / 2);
    g.rotateZ(Math.atan2(yb - ya, L)); g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0]));
    g.translate((a[0] + b[0]) / 2, (ya + yb) / 2 + hh, (a[1] + b[1]) / 2); K.add(m, g, { detail: true });
  }
}
// Thin inlaid band (brick, granite...) from a to b, width w, lying at y (5 mm proud so it never z-fights the slab).
export function band(K, mat, a, b, y, w = 0.32) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) return;
  const g = new THREE.BoxGeometry(L, 0.012, w); g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0])); g.translate((a[0] + b[0]) / 2, y + 0.002, (a[1] + b[1]) / 2);
  K.add(mat, g, { detail: true });
}
// Band draped on the terrain (plazas): split into ~1 m pieces each seated on K.g.
export function bandOnGround(K, mat, a, b, w = 0.32, lift = 0.015) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.max(1, Math.ceil(L / 1.0));
  for (let i = 0; i < n; i++) { const p = [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n], q = [a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] + (b[1] - a[1]) * (i + 1) / n];
    const y = Math.max(K.g(p[0], p[1]), K.g(q[0], q[1]), K.g((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)); band(K, mat, p, q, y + lift - 0.012, w); }
}

// Flat basketweave brick paving (Doe north terrace photos: modules of three bricks alternating direction, muted
// salmon-brown, light mortar). One texture tile = TEX_M (2 m) of box-projected UVs = 4 x 4 modules of 0.5 m.
export function basketweave() {
  return local('basketweave', () => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#c4b6a3'; g.fillRect(0, 0, 512, 512);
    const cols = ['#b56e62', '#ab665b', '#bd7768', '#a35f55', '#b87363', '#c27d6b']; // sunlit salmon-red (photo)
    let k = 0; const m = 128, b = m / 3, j = 3;
    for (let i = 0; i < 4; i++) for (let jj = 0; jj < 4; jj++) for (let r = 0; r < 3; r++) {
      g.fillStyle = cols[(k++ * 7 + i * 3 + jj) % cols.length];
      if ((i + jj) % 2 === 0) g.fillRect(i * m + j / 2, jj * m + r * b + j / 2, m - j, b - j); else g.fillRect(i * m + r * b + j / 2, jj * m + j / 2, b - j, m - j);
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 }); mat.name = 'r5-basketweave'; return mat;
  });
}
