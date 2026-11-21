// Residential kit for Berkeley's fraternity and sorority houses (batch b09-greek).
// Early-1900s Craftsman brown-shingle, Tudor, Colonial and Mediterranean houses plus 1950s-60s stucco chapter houses.
// A house is a set of rectangular blocks in a building frame (u along the main axis, v across, y up) — each with its own
// eave and roof (gable / hip / flat / jerkin) — plus porch or portico, entry, bays, dormers, chimneys and Greek letters.
// Built on classic-kit's Kit (walls with real openings, recessed glazing, roofs), merged per material.
import * as THREE from 'three';
import { Kit, polysGeo } from './classic-kit.js';
import { nightGlow } from '../../materials.js';

// ---------- local procedural materials (cached so houses share them) ----------
const _tex = {}; const _mat = new Map();
function cnv(n = 256) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function mkTex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true; return t; }
// each texture tile covers 2 m (UVs are metres/2)
function shingleTex() { // wood shingle siding: 0.2 m courses, random-width shingles; grey-white albedo, tinted by colour
  if (_tex.sh) return _tex.sh; const N = 512, c = cnv(N), b = cnv(N), g = c.getContext('2d'), h = b.getContext('2d'); const r = rnd(7);
  const rows = 10, rh = N / rows;
  for (let i = 0; i < rows; i++) {
    let x = -r() * 40; const y = i * rh;
    while (x < N) {
      const w = 22 + r() * 46; const t = 0.78 + r() * 0.3;
      const col = (k) => Math.round(Math.min(255, k * t)); g.fillStyle = `rgb(${col(236)},${col(230)},${col(222)})`; g.fillRect(x, y, w, rh);
      const gr = h.createLinearGradient(0, y, 0, y + rh); gr.addColorStop(0, '#606060'); gr.addColorStop(1, '#d8d8d8'); h.fillStyle = gr; h.fillRect(x, y, w, rh);
      g.fillStyle = 'rgba(40,30,20,0.55)'; g.fillRect(x, y, 2, rh); h.fillStyle = '#202020'; h.fillRect(x, y, 2, rh);
      for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(60,45,30,${0.06 + r() * 0.08})`; g.fillRect(x + r() * w, y, 1, rh); }
      x += w;
    }
    g.fillStyle = 'rgba(30,22,15,0.6)'; g.fillRect(0, y + rh - 3, N, 3); h.fillStyle = '#101010'; h.fillRect(0, y + rh - 3, N, 3);
  }
  // wrap seam: shingles drawn beyond N are clipped; fine for a tiling course pattern
  return (_tex.sh = { map: mkTex(c), bump: mkTex(b, false) });
}
function clapTex() { // lap siding: 0.167 m boards (12 per 2 m)
  if (_tex.cl) return _tex.cl; const N = 512, c = cnv(N), b = cnv(N), g = c.getContext('2d'), h = b.getContext('2d'); const rows = 12, rh = N / rows; const r = rnd(3);
  for (let i = 0; i < rows; i++) {
    const y = i * rh; const gr = g.createLinearGradient(0, y, 0, y + rh); gr.addColorStop(0, '#d9d9d6'); gr.addColorStop(0.85, '#f6f6f3'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(0, y, N, rh);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + rh - 2, N, 2);
    const hg = h.createLinearGradient(0, y, 0, y + rh); hg.addColorStop(0, '#404040'); hg.addColorStop(1, '#e0e0e0'); h.fillStyle = hg; h.fillRect(0, y, N, rh);
    if (r() < 0.5) { const x = r() * N; g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y, 1.5, rh); }
  }
  return (_tex.cl = { map: mkTex(c), bump: mkTex(b, false) });
}
function halfTex() { // smooth render with faint trowel noise (for stucco variants)
  if (_tex.st) return _tex.st; const N = 256, c = cnv(N), g = c.getContext('2d'); const r = rnd(11); g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, N, N);
  for (let k = 0; k < 2500; k++) { const v = 225 + r() * 30; g.fillStyle = `rgba(${v},${v - 2},${v - 6},0.35)`; g.fillRect(r() * N, r() * N, 2 + r() * 5, 1 + r() * 3); }
  return (_tex.st = { map: mkTex(c), bump: null });
}
export function hmat(ctx, kind, hex) {
  const key = kind + ':' + hex; if (_mat.has(key)) return _mat.get(key);
  const M = ctx.M; let m;
  const col = new THREE.Color(hex);
  if (kind === 'shingle') { const t = shingleTex(); m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.92, map: t.map, bumpMap: t.bump, bumpScale: 1.2 }); }
  else if (kind === 'clap') { const t = clapTex(); m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.75, map: t.map, bumpMap: t.bump, bumpScale: 1.0 }); }
  else if (kind === 'stucco') { const t = halfTex(); m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, map: t.map, normalMap: M.stucco.normalMap, normalScale: new THREE.Vector2(0.5, 0.5) }); }
  else if (kind === 'render') { const t = halfTex(); m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, map: t.map }); }
  else if (kind === 'brick') { m = M.brick.clone(); m.color = col; }
  else if (kind === 'roof') { m = M.shingle.clone(); m.color = col; }
  else if (kind === 'tile') { m = M.redTile.clone(); m.color = col; }
  else if (kind === 'slate') { m = M.slate.clone(); m.color = col; }
  else if (kind === 'wood') { m = M.wood.clone(); m.color = col; }
  else if (kind === 'stone') { m = M.granite.clone(); m.color = col; }
  else if (kind === 'metal') { m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.8 }); }
  else if (kind === 'ivy') { m = M.shingle.clone(); m.color = col; m.roughness = 1.0; m.normalScale = new THREE.Vector2(2.5, 2.5); }
  else { m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }); } // 'paint'
  m.name = 'greek-' + key; _mat.set(key, m); return m;
}
function M_(ctx, spec, fallback) { if (!spec) return fallback; if (spec.isMaterial) return spec; return hmat(ctx, spec[0], spec[1]); }

// ---------- Greek letter stroke font (unit height; strokes as polylines) ----------
const ell = (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 14) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
const GLYPH = {
  'Α': [0.72, [[[0, 0], [0.36, 1], [0.72, 0]], [[0.17, 0.36], [0.55, 0.36]]]],
  'Β': [0.6, [[[0, 0], [0, 1], [0.38, 1], [0.5, 0.92], [0.52, 0.76], [0.44, 0.58], [0.32, 0.53], [0, 0.53]], [[0.32, 0.53], [0.5, 0.47], [0.58, 0.3], [0.54, 0.1], [0.42, 0], [0, 0]]]],
  'Γ': [0.55, [[[0, 0], [0, 1], [0.55, 1]]]],
  'Δ': [0.74, [[[0, 0], [0.37, 1], [0.74, 0], [0, 0]]]],
  'Ε': [0.56, [[[0.56, 1], [0, 1], [0, 0], [0.56, 0]], [[0, 0.52], [0.44, 0.52]]]],
  'Ζ': [0.6, [[[0, 1], [0.6, 1], [0, 0], [0.6, 0]]]],
  'Η': [0.62, [[[0, 0], [0, 1]], [[0.62, 0], [0.62, 1]], [[0, 0.52], [0.62, 0.52]]]],
  'Θ': [0.74, [ell(0.37, 0.5, 0.37, 0.5), [[0.2, 0.5], [0.54, 0.5]]]],
  'Ι': [0.0, [[[0, 0], [0, 1]]]],
  'Κ': [0.6, [[[0, 0], [0, 1]], [[0.6, 1], [0.02, 0.42]], [[0.2, 0.6], [0.62, 0]]]],
  'Λ': [0.72, [[[0, 0], [0.36, 1], [0.72, 0]]]],
  'Μ': [0.8, [[[0, 0], [0, 1], [0.4, 0.28], [0.8, 1], [0.8, 0]]]],
  'Ν': [0.64, [[[0, 0], [0, 1], [0.64, 0], [0.64, 1]]]],
  'Ξ': [0.6, [[[0, 1], [0.6, 1]], [[0.1, 0.52], [0.5, 0.52]], [[0, 0], [0.6, 0]]]],
  'Ο': [0.74, [ell(0.37, 0.5, 0.37, 0.5)]],
  'Π': [0.64, [[[0, 0], [0, 1]], [[0.64, 0], [0.64, 1]], [[-0.12, 1], [0.76, 1]]]],
  'Ρ': [0.56, [[[0, 0], [0, 1], [0.38, 1], [0.52, 0.9], [0.56, 0.74], [0.5, 0.58], [0.36, 0.5], [0, 0.5]]]],
  'Σ': [0.6, [[[0.62, 1], [0, 1], [0.34, 0.5], [0, 0], [0.62, 0]]]],
  'Τ': [0.66, [[[0, 1], [0.66, 1]], [[0.33, 1], [0.33, 0]]]],
  'Υ': [0.66, [[[0, 1], [0.33, 0.5], [0.66, 1]], [[0.33, 0.5], [0.33, 0]]]],
  'Φ': [0.76, [[[0.38, 0], [0.38, 1]], ell(0.38, 0.52, 0.38, 0.3)]],
  'Χ': [0.66, [[[0, 0], [0.66, 1]], [[0, 1], [0.66, 0]]]],
  'Ψ': [0.76, [[[0.38, 0], [0.38, 1]], [[0, 1], [0, 0.66], [0.1, 0.46], [0.38, 0.38], [0.66, 0.46], [0.76, 0.66], [0.76, 1]]]],
  'Ω': [0.76, [[[0, 0], [0.24, 0]], ell(0.38, 0.55, 0.36, 0.45, -Math.PI * 0.62, Math.PI * 1.62, 18), [[0.52, 0], [0.76, 0]]]],
};
// Mount Greek letters on run R, centred at s, baseline y, letter height h, thickness dep (outward from d0)
export function greekLetters(K, R, mat, text, s, y, h, { dep = 0.06, d0 = 0, stroke = 0.15, gap = 0.3, serif = true } = {}) {
  const chars = [...text].filter((c) => GLYPH[c]);
  const widths = chars.map((c) => GLYPH[c][0] * h + stroke * h);
  const total = widths.reduce((a, b) => a + b, 0) + gap * h * (chars.length - 1);
  let x = s - total / 2; const t = stroke * h;
  for (let k = 0; k < chars.length; k++) {
    const [w, strokes] = GLYPH[chars[k]];
    for (const pl of strokes) for (let i = 0; i < pl.length - 1; i++) {
      const a = [x + t / 2 + pl[i][0] * h, y + t / 2 + pl[i][1] * (h - t)], b = [x + t / 2 + pl[i + 1][0] * h, y + t / 2 + pl[i + 1][1] * (h - t)];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-4) continue;
      const g = new THREE.BoxGeometry(L + t * 0.9, t, dep); g.rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0])); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d0 + dep / 2);
      K.addRun(R, mat, g);
      if (serif && Math.abs(b[0] - a[0]) < 1e-3) for (const q of [a, b]) { const yy = (q[1] - y - t / 2) / (h - t); if (yy < 0.02 || yy > 0.98) { const sg = new THREE.BoxGeometry(t * 2.4, t * 0.55, dep); sg.translate(q[0], yy < 0.5 ? y + t * 0.28 : y + h - t * 0.28, d0 + dep / 2); K.addRun(R, mat, sg); } }
    }
    x += widths[k] + gap * h;
  }
  return total;
}

// ---------- helpers ----------
// box between two 3D points (building frame) with cross-section w (horizontal) x h
function beam(K, mat, p0, p1, w, h, opts) {
  const d = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]); const L = d.length(); d.normalize();
  let side = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)); if (side.lengthSq() < 1e-6) side.set(0, 0, 1); side.normalize();
  const up = new THREE.Vector3().crossVectors(side, d).normalize();
  const g = new THREE.BoxGeometry(L, h, w); g.applyMatrix4(new THREE.Matrix4().makeBasis(d, up, side)); g.translate((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2);
  return K.add(mat, g, opts);
}
export function tuscan(K, mat, u, y0, v, D, H, { seg = 14, base = true } = {}) {
  const r = D / 2;
  if (base) K.box(mat, u - r * 1.25, y0, v - r * 1.25, u + r * 1.25, y0 + D * 0.22, v + r * 1.25);
  K.lathe(mat, [[r * 1.1, 0], [r * 1.1, D * 0.12], [r, D * 0.2], [r, H * 0.33], [r * 0.86, H - D * 0.32], [r * 0.95, H - D * 0.28], [r * 0.86, H - D * 0.24], [r * 1.12, H - D * 0.12], [r * 1.12, H - D * 0.1], [0.001, H - D * 0.1]], u, y0 + (base ? D * 0.22 : 0), v, seg);
  K.box(mat, u - r * 1.3, y0 + H - D * 0.1 + (base ? D * 0.22 : 0) - 0.001, v - r * 1.3, u + r * 1.3, y0 + H + (base ? D * 0.22 : 0), v + r * 1.3);
}

// ---------- the house ----------
// S: see per-house modules. Faces of a block: S (+v), N (-v), E (+u), W (-u).
export function greekHouse(ctx, S) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(S.ang || 0)); const M = ctx.M;
  const colliders = [], walkables = [];
  const wallM = M_(ctx, S.wall, M.stucco), trimM = M_(ctx, S.trim, M.whitePaint), roofM = M_(ctx, S.roof, M.shingle);
  const baseM = M_(ctx, S.base, M.concreteDark), frameM = M_(ctx, S.frame, trimM), doorM = M_(ctx, S.door, M.woodDark);
  // residential glazing: a little lighter and more reflective than M.windowNight by day, same warm glow at night
  const glass = S.glass ? M_(ctx, S.glass) : (_mat.get('glass:house') || (_mat.set('glass:house', nightGlow(new THREE.MeshStandardMaterial({ color: 0x34404c, roughness: 0.06, metalness: 0.35, envMapIntensity: 1.7, emissive: 0xffc77a, emissiveIntensity: 1.6 }), 1.0)), _mat.get('glass:house')));
  const H = S.storeyH || 3.1; let F0 = S.floor ?? 0.8; // first-floor level
  const W = Object.assign({ w: 0.95, h: 1.6, bay: 2.8, sill: 0.85, mull: 0, tran: 0.5, muntins: 0, casing: 0.11, pair: false }, S.win || {});
  const blocks = S.blocks.map((b, i) => Object.assign({ i, y0: -1.2, roof: { type: 'gable', axis: (b.u1 - b.u0) >= (b.v1 - b.v0) ? 'u' : 'v' } }, b));
  if (S.front) { const b = blocks[S.front.block ?? 0]; const R0 = (f => f === 'S' ? K.run([b.u0, b.v1], [b.u1, b.v1]) : f === 'E' ? K.run([b.u1, b.v1], [b.u1, b.v0]) : f === 'N' ? K.run([b.u1, b.v0], [b.u0, b.v0]) : K.run([b.u0, b.v0], [b.u0, b.v1]))(S.front.face);
    let gm = -Infinity; for (let k = 0; k <= 8; k++) { const q = R0.at(R0.L * k / 8, 1.0); gm = Math.max(gm, K.g(q[0], q[1])); } if (S.floor == null) F0 = gm + (S.front.above ?? 0.8); }
  for (const b of blocks) { b.gmin = K.gMin(b.u0, b.v0, b.u1, b.v1, 5); b.y0 = Math.min(b.y0, b.gmin - 1.0); b.f0 = b.floor ?? (b.floorAdd != null ? F0 + b.floorAdd : F0); }
  const faceRun = (b, f) => f === 'S' ? K.run([b.u0, b.v1], [b.u1, b.v1]) : f === 'E' ? K.run([b.u1, b.v1], [b.u1, b.v0]) : f === 'N' ? K.run([b.u1, b.v0], [b.u0, b.v0]) : K.run([b.u0, b.v0], [b.u0, b.v1]);
  const sOf = (b, f, u, v) => f === 'S' ? u - b.u0 : f === 'E' ? b.v1 - v : f === 'N' ? b.u1 - u : v - b.v0;
  // intervals of a block face covered by neighbouring blocks: [s0, s1, coverTop]
  function covered(b, f) {
    const out = []; const e = 0.2;
    for (const c of blocks) {
      if (c === b) continue;
      let lo, hi, hit = false;
      if (f === 'S' || f === 'N') { const vl = f === 'S' ? b.v1 : b.v0; if (c.v0 - e < vl && c.v1 + e > vl && (f === 'S' ? c.v1 > vl + 0.3 : c.v0 < vl - 0.3)) { lo = Math.max(b.u0, c.u0); hi = Math.min(b.u1, c.u1); hit = hi > lo; if (hit && f === 'N') [lo, hi] = [b.u1 - hi, b.u1 - lo]; else if (hit) [lo, hi] = [lo - b.u0, hi - b.u0]; } }
      else { const ul = f === 'E' ? b.u1 : b.u0; if (c.u0 - e < ul && c.u1 + e > ul && (f === 'E' ? c.u1 > ul + 0.3 : c.u0 < ul - 0.3)) { lo = Math.max(b.v0, c.v0); hi = Math.min(b.v1, c.v1); hit = hi > lo; if (hit && f === 'E') [lo, hi] = [b.v1 - hi, b.v1 - lo]; else if (hit) [lo, hi] = [lo - b.v0, hi - b.v0]; } }
      if (hit) out.push([lo, hi, c.coverTop ?? c.eave]);
    }
    return out;
  }
  const storeysOf = (b) => { const n = b.storeys ?? Math.max(1, Math.round((b.eave - b.f0) / H)); const h = (b.eave - b.f0) / n; return Array.from({ length: n }, (_, k) => b.f0 + k * h).map((y) => ({ y, h })); };
  const openings = []; // for later fills
  function addWindowsAndWall(b, f, R, s0, s1, ybot, ytop, extra = []) {
    if (s1 - s0 < 0.3) return;
    const st = storeysOf(b); const ops = [...extra.filter((o) => o.s0 >= s0 - 0.01 && o.s1 <= s1 + 0.01)];
    const fw = (b.win && b.win[f]) || (S.faceWin && S.faceWin[f]) || {};
    const wA = Object.assign({}, W, b.winAll || {}, fw);
    const len = s1 - s0; const nbA = wA.nb ?? Math.max(0, Math.round(len / wA.bay));
    if (!wA.none) for (let k = 0; k < st.length; k++) {
      const { y, h } = st[k]; if (y < ybot - 0.01 || y + h > ytop + 0.4) continue;
      const w = Object.assign({}, wA, (wA.st && wA.st[k]) || {}); if (w.none) continue; const nb = w.nb ?? nbA; const bw = nb ? len / nb : 0;
      const wh = Math.min(w.h * (k === 0 && w.h0 ? w.h0 / w.h : 1), h - w.sill - 0.3);
      for (let i = 0; i < nb; i++) {
        if (w.skip && w.skip.includes(i)) continue;
        const c = s0 + bw * (i + 0.5); const bwid = (k === 0 && w.w0) ? w.w0 : w.w; const ww = (w.pair ? bwid * 2 + 0.16 : bwid) * (w.wide && w.wide.includes(i) ? 1.6 : 1);
        if (b.noWin && b.noWin[f] && b.noWin[f].some(([a, z]) => c > a && c < z)) continue;
        if (ww > bw - 0.4) continue;
        const o = { s0: c - ww / 2, s1: c + ww / 2, y0: y + w.sill, y1: y + w.sill + wh, arch: (k === 0 && w.arch0) ? true : w.arch, w };
        if (ops.some((q) => q.s0 < o.s1 + 0.25 && q.s1 > o.s0 - 0.25 && q.y0 < o.y1 && q.y1 > o.y0)) continue;
        const p = R.at((o.s0 + o.s1) / 2, 0.5); if (K.g(p[0], p[1]) > o.y0 - 0.15) continue; // buried by the slope
        ops.push(o);
      }
    }
    const w0m = b.wall0 ? M_(ctx, b.wall0) : (S.wall0 ? M_(ctx, S.wall0) : null);
    const ysplit = b.f0 + (b.split ?? S.split ?? H) - 0.05;
    if (w0m && ybot < ysplit && ytop > ysplit + 0.2) {
      K.wall(R, w0m, s0, s1, ybot, ysplit, ops.filter((o) => o.y1 <= ysplit), S.wallD ?? 0.3);
      K.wall(R, b.wallM || wallM, s0, s1, ysplit, ytop, ops.filter((o) => o.y0 >= ysplit), S.wallD ?? 0.3);
      K.rbox(R, trimM, s0 - 0.03, ysplit - 0.08, 0, s1 + 0.03, ysplit + 0.08, 0.07);
    } else K.wall(R, (w0m && ytop <= ysplit + 0.2) ? w0m : (b.wallM || wallM), s0, s1, ybot, ytop, ops, S.wallD ?? 0.3);
    for (const o of ops) openings.push([R, o, b]);
  }
  // ---- walls ----
  for (const b of blocks) {
    if (b.noWalls) continue;
    for (const f of ['S', 'E', 'N', 'W']) {
      const R = faceRun(b, f); const cov = covered(b, f).sort((a, c) => a[0] - c[0]);
      const extra = (S.doors || []).filter((d) => d.block === b.i && d.face === f).map((d) => ({ s0: d.s - d.w / 2, s1: d.s + d.w / 2, y0: d.y ?? b.f0, y1: (d.y ?? b.f0) + (d.h || 2.35) + (d.fan ? 0.5 : 0) + (d.arch ? d.w / 2 : 0), door: d, arch: d.arch }));
      // split [0,L] into exposed spans and covered spans
      let x = 0; const spans = [];
      for (const [lo, hi, top] of cov) { if (lo > x + 0.05) spans.push([x, lo, null]); spans.push([Math.max(x, lo), hi, top]); x = Math.max(x, hi); }
      if (x < R.L - 0.05) spans.push([x, R.L, null]);
      for (const [a, c, top] of spans) {
        if (top == null) addWindowsAndWall(b, f, R, a, c, b.y0, b.eave, extra);
        else if (top < b.eave - 0.4) addWindowsAndWall(b, f, R, a, c, top - 0.3, b.eave, []);
      }
      // foundation band (proud plinth) below the first floor on exposed spans
      for (const [a, c, top] of spans) if (top == null && c - a > 0.2) K.rbox(R, baseM, a - 0.04, b.y0, -0.1, c + 0.04, b.f0 - 0.1, 0.06);
    }
    // core and floor slab (keeps glazing from showing daylight; closes the volume)
    K.box(M.concreteDark, b.u0 + 0.35, b.y0, b.v0 + 0.35, b.u1 - 0.35, b.eave - 0.05, b.v1 - 0.35);
    colliders.push(K.colPoly([[b.u0, b.v0], [b.u1, b.v0], [b.u1, b.v1], [b.u0, b.v1]], b.y0, b.ridgeY ?? b.eave + 2));
    // belt course trim between storeys (shingle/clap houses get a water-table + frieze board)
    if (S.belt !== false) for (const f of ['S', 'E', 'N', 'W']) {
      const R = faceRun(b, f); const cov = covered(b, f); const st = storeysOf(b);
      const segs = [[0, R.L]]; for (const [lo, hi] of cov) { for (let k = segs.length - 1; k >= 0; k--) { const [p, q] = segs[k]; if (hi <= p || lo >= q) continue; segs.splice(k, 1); if (lo > p + 0.1) segs.push([p, lo]); if (hi < q - 0.1) segs.push([hi, q]); } }
      for (const [p, q] of segs) {
        K.rbox(R, trimM, p - 0.05, b.f0 - 0.14, 0, q + 0.05, b.f0 + 0.06, 0.05); // water table
        if (S.frieze !== false) K.rbox(R, trimM, p - 0.04, b.eave - 0.32, 0, q + 0.04, b.eave, 0.04); // frieze board under eave
        if (S.belts) for (let k = 1; k < st.length; k++) K.rbox(R, trimM, p - 0.04, st[k].y - 0.1, 0, q + 0.04, st[k].y + 0.06, 0.05);
      }
    }
  }
  // ---- window & door fills, casings, shutters ----
  for (const [R, o, b] of openings) {
    if (o.door) {
      const d = o.door;
      K.fill(R, { ...o, doorTop: o.y0 + (d.h || 2.35), sill: false }, { kind: 'door', rev: 0.18, door: d.mat ? M_(ctx, d.mat) : doorM, frame: trimM, glass });
      K.rbox(R, trimM, o.s0 - 0.16, o.y0, 0, o.s0, o.y1 + 0.16, 0.06); K.rbox(R, trimM, o.s1, o.y0, 0, o.s1 + 0.16, o.y1 + 0.16, 0.06);
      if (!o.arch) K.rbox(R, trimM, o.s0 - 0.26, o.y1, 0, o.s1 + 0.26, o.y1 + 0.22, 0.12);
      continue;
    }
    const w = o.w;
    K.fill(R, { ...o, sill: false, muntins: w.muntins }, { rev: (S.wallD ?? 0.3) - 0.08, mull: w.pair ? 1 + (w.mull || 0) * 2 : w.mull, tran: w.tran ? [o.y0 + (o.y1 - o.y0) * w.tran] : [], frame: frameM, glass });
    if (w.cols) for (let k = 1; k < w.cols; k++) { const s = o.s0 + (o.s1 - o.s0) * k / w.cols; K.rbox(R, frameM, s - 0.02, o.y0, -(S.wallD ?? 0.3) + 0.08, s + 0.02, o.y1, -(S.wallD ?? 0.3) + 0.12, { detail: true }); }
    const cw = w.casing; if (cw > 0 && !o.arch) {
      K.rbox(R, trimM, o.s0 - cw, o.y0 - 0.02, 0, o.s0, o.y1 + 0.02, 0.035); K.rbox(R, trimM, o.s1, o.y0 - 0.02, 0, o.s1 + cw, o.y1 + 0.02, 0.035);
      K.rbox(R, trimM, o.s0 - cw - 0.05, o.y1 + 0.02, 0, o.s1 + cw + 0.05, o.y1 + 0.02 + cw * 1.3, 0.06);
    }
    K.rbox(R, w.sillMat ? M_(ctx, w.sillMat) : trimM, o.s0 - 0.08 - (cw > 0 ? cw : 0), o.y0 - 0.07, -0.1, o.s1 + 0.08 + (cw > 0 ? cw : 0), o.y0 + 0.01, 0.08);
    if (S.shutters) { const sm = M_(ctx, S.shutters); const sw = Math.min(0.5, (o.s1 - o.s0) / 2); K.rbox(R, sm, o.s0 - cw - sw - 0.02, o.y0, 0.01, o.s0 - cw - 0.02, o.y1, 0.05); K.rbox(R, sm, o.s1 + cw + 0.02, o.y0, 0.01, o.s1 + cw + sw + 0.02, o.y1, 0.05); }
    if (w.box) K.rbox(R, M_(ctx, w.box), o.s0, o.y0 - 0.32, 0.02, o.s1, o.y0 - 0.07, 0.26, { detail: true }); // flower box
  }
  // ---- roofs ----
  for (const b of blocks) {
    const r = b.roof; const rm = r.mat ? M_(ctx, r.mat) : roofM; const ov = r.ov ?? S.ov ?? 0.5; const yE = b.eave;
    const wd = r.axis === 'u' ? b.v1 - b.v0 : b.u1 - b.u0; const hw = wd / 2;
    const rise = r.ridge != null ? r.ridge - yE : (r.pitch ?? 0.75) * hw;
    if (r.type === 'gable' || r.type === 'jerkin') {
      K.gable(rm, b.u0, b.v0, b.u1, b.v1, yE, rise, r.axis, { overhang: ov, wallMat: r.gableWall ? M_(ctx, r.gableWall) : (b.wallM || wallM), thick: 0.18 });
      // fascia + barge boards
      const s = ov * rise / hw; const yF = yE - s;
      if (r.axis === 'u') {
        for (const vv of [b.v0 - ov, b.v1 + ov]) K.box(trimM, b.u0 - ov, yF - 0.22, vv - 0.03, b.u1 + ov, yF + 0.02, vv + 0.03);
        for (const uu of [b.u0 - ov - 0.02, b.u1 + ov + 0.02]) for (const vv of [b.v0 - ov, b.v1 + ov]) beam(K, trimM, [uu, yF - 0.05, vv], [uu, yE + rise - 0.05, (b.v0 + b.v1) / 2], 0.06, 0.3);
      } else {
        for (const uu of [b.u0 - ov, b.u1 + ov]) K.box(trimM, uu - 0.03, yF - 0.22, b.v0 - ov, uu + 0.03, yF + 0.02, b.v1 + ov);
        for (const vv of [b.v0 - ov - 0.02, b.v1 + ov + 0.02]) for (const uu of [b.u0 - ov, b.u1 + ov]) beam(K, trimM, [uu, yF - 0.05, vv], [(b.u0 + b.u1) / 2, yE + rise - 0.05, vv], 0.06, 0.3);
      }
      b.ridgeY = yE + rise;
      // gable-end attic windows + optional half-timbering / shingle-in-gable
      const ends = r.axis === 'u' ? ['W', 'E'] : ['N', 'S'];
      for (const f of ends) {
        if (r.noGableWin && r.noGableWin.includes(f)) continue;
        const R = faceRun(b, f); const L = R.L; const cov = covered(b, f); if (cov.some(([lo, hi, top]) => lo < L / 2 && hi > L / 2 && top > yE + rise * 0.5)) continue;
        if (r.half) { // half-timber gable: dark boards following the rake
          const hm = M_(ctx, r.half.mat || ['paint', '#3b2a1e']); const n = Math.max(3, Math.round(L / 0.75));
          K.rbox(R, hm, 0, yE - 0.02, 0.0, L, yE + 0.2, 0.05);
          for (let k = 1; k < n; k++) { const s2 = L * k / n; const top = yE + rise * (1 - Math.abs(s2 - L / 2) / (L / 2)) - 0.12; if (top - yE > 0.5) K.rbox(R, hm, s2 - 0.09, yE + 0.2, 0, s2 + 0.09, top, 0.05); }
          const yb = yE + rise * 0.42; K.rbox(R, hm, L * 0.21 + 0.1, yb - 0.09, 0, L * 0.79 - 0.1, yb + 0.09, 0.05);
        }
        const gw = r.gableWin ?? { w: Math.min(1.6, L * 0.2), h: Math.min(1.3, rise * 0.45) };
        if (gw && rise > 1.8) {
          const y0 = yE + (gw.dy ?? Math.max(0.5, rise * 0.18)), s0 = L / 2 - gw.w / 2, s1 = L / 2 + gw.w / 2;
          K.rbox(R, glass, s0, y0, 0.01, s1, y0 + gw.h, 0.03); K.rbox(R, frameM, s0 - 0.09, y0 - 0.1, 0.02, s1 + 0.09, y0, 0.1);
          for (const s2 of [s0 - 0.09, s1]) K.rbox(R, frameM, s2, y0, 0.02, s2 + 0.09, y0 + gw.h, 0.07);
          K.rbox(R, frameM, s0 - 0.12, y0 + gw.h, 0.02, s1 + 0.12, y0 + gw.h + 0.12, 0.09); K.rbox(R, frameM, L / 2 - 0.03, y0, 0.03, L / 2 + 0.03, y0 + gw.h, 0.06, { detail: true });
        }
        if (r.brackets) for (const s2 of [0.25, L - 0.25]) { const p = [R.at(s2, 0), R.at(s2, ov)]; beam(K, trimM, [p[0][0], yE - 0.9, p[0][1]], [p[1][0], yE - 0.1, p[1][1]], 0.12, 0.12); }
      }
      if (r.type === 'jerkin') { /* clipped gable tips */ }
    } else if (r.type === 'hip') {
      const slope = rise / (hw + ov);
      K.hip(rm, b.u0 - ov, b.v0 - ov, b.u1 + ov, b.v1 + ov, yE, slope, { yTop: r.flatTop ?? Infinity });
      // soffit + fascia
      K.box(trimM, b.u0 - ov, yE - 0.18, b.v0 - ov, b.u1 + ov, yE + 0.0, b.v1 + ov);
      b.ridgeY = yE + rise;
    } else if (r.type === 'flat') {
      const pm = r.parapetMat ? M_(ctx, r.parapetMat) : (b.wallM || wallM); const pp = r.parapet ?? 0.6;
      K.box(r.deck ? M_(ctx, r.deck) : M.concreteDark, b.u0 + 0.05, yE - 0.1, b.v0 + 0.05, b.u1 - 0.05, yE + 0.05, b.v1 - 0.05);
      if (pp > 0) { K.loop(pm, [[b.u0, b.v1], [b.u1, b.v1], [b.u1, b.v0], [b.u0, b.v0]], [[0, yE], [0.02, yE], [0.02, yE + pp], [-0.25, yE + pp], [-0.25, yE]]); K.loop(r.capMat ? M_(ctx, r.capMat) : pm, [[b.u0, b.v1], [b.u1, b.v1], [b.u1, b.v0], [b.u0, b.v0]], [[0.08, yE + pp], [0.08, yE + pp + 0.1], [-0.33, yE + pp + 0.1], [-0.33, yE + pp]]); }
      if (r.ov) { K.box(r.eaveMat ? M_(ctx, r.eaveMat) : trimM, b.u0 - r.ov, yE - 0.25, b.v0 - r.ov, b.u1 + r.ov, yE + 0.05, b.v1 + r.ov); }
      b.ridgeY = yE + pp;
    }
  }
  // ---- dormers ----
  for (const d of S.dormers || []) {
    const b = blocks[d.block]; const r = b.roof; const hw = (r.axis === 'u' ? b.v1 - b.v0 : b.u1 - b.u0) / 2; const rise = b.ridgeY - b.eave;
    const w = d.w ?? 2.2, hgt = d.h ?? 1.5, inset = d.inset ?? 0.6; const dm = d.mat ? M_(ctx, d.mat) : (b.wallM || wallM); const dr = d.roofMat ? M_(ctx, d.roofMat) : (r.mat ? M_(ctx, r.mat) : roofM);
    // dormer frame: front face at distance `inset` inside the eave line on the given side
    const side = d.side; // 'S','N','E','W' roof slope facing that way
    const along = side === 'S' || side === 'N';
    const yAt = (dist) => b.eave + rise * Math.min(1, dist / hw); // roof height at horizontal distance from the eave line
    const yb = yAt(inset); const yt = yb + hgt; const depth = Math.max(0.8, Math.min(hw - inset, (yt + 0.3 - b.eave) / rise * hw - inset));
    let u0, u1, v0, v1, fr;
    if (side === 'S') { u0 = b.u0 + d.s - w / 2; u1 = u0 + w; v1 = b.v1 - inset; v0 = v1 - depth; fr = K.run([u0, v1], [u1, v1]); }
    else if (side === 'N') { u0 = b.u0 + d.s - w / 2; u1 = u0 + w; v0 = b.v0 + inset; v1 = v0 + depth; fr = K.run([u1, v0], [u0, v0]); }
    else if (side === 'E') { v0 = b.v0 + d.s - w / 2; v1 = v0 + w; u1 = b.u1 - inset; u0 = u1 - depth; fr = K.run([u1, v1], [u1, v0]); }
    else { v0 = b.v0 + d.s - w / 2; v1 = v0 + w; u0 = b.u0 + inset; u1 = u0 + depth; fr = K.run([u0, v0], [u0, v1]); }
    K.box(dm, u0, yb - 1.0, v0, u1, yt, v1);
    const nw = d.nwin ?? 1; const ww = Math.min(w - 0.5, d.winW ?? w * (nw > 1 ? 0.8 : 0.6)); const each = ww / nw;
    for (let k = 0; k < nw; k++) {
      const o = { s0: fr.L / 2 - ww / 2 + each * k + 0.05, s1: fr.L / 2 - ww / 2 + each * (k + 1) - 0.05, y0: yb + 0.25, y1: yt - 0.25 };
      K.rbox(fr, glass, o.s0, o.y0, 0.005, o.s1, o.y1, 0.02); K.rbox(fr, frameM, o.s0 - 0.08, o.y0 - 0.09, 0.0, o.s1 + 0.08, o.y0, 0.08);
      for (const s2 of [o.s0 - 0.08, o.s1]) K.rbox(fr, frameM, s2, o.y0, 0, s2 + 0.08, o.y1, 0.05);
      K.rbox(fr, frameM, o.s0 - 0.08, o.y1, 0, o.s1 + 0.08, o.y1 + 0.1, 0.06); K.rbox(fr, frameM, o.s0, o.y0 + (o.y1 - o.y0) * 0.6, 0.01, o.s1, o.y0 + (o.y1 - o.y0) * 0.6 + 0.05, 0.05, { detail: true });
    }
    if (d.type === 'shed') { const T = [u0 - 0.2, v0 - 0.2, u1 + 0.2, v1 + 0.2]; const lo = yt + 0.05, hi = yt + 0.45; let P;
      if (side === 'S') P = [[T[0], lo, T[3]], [T[2], lo, T[3]], [T[2], hi, T[1]], [T[0], hi, T[1]]]; else if (side === 'N') P = [[T[2], lo, T[1]], [T[0], lo, T[1]], [T[0], hi, T[3]], [T[2], hi, T[3]]]; else if (side === 'E') P = [[T[2], lo, T[3]], [T[2], lo, T[1]], [T[0], hi, T[1]], [T[0], hi, T[3]]]; else P = [[T[0], lo, T[1]], [T[0], lo, T[3]], [T[2], hi, T[3]], [T[2], hi, T[1]]];
      K.add(dr, polysGeo([P.slice().reverse(), P.map(([a, y, c]) => [a, y - 0.12, c])]), { uvMode: 'roof' }); K.box(dm, u0, yt - 0.01, v0, u1, yt + 0.06, v1); }
    else K.gable(dr, u0, v0, u1, v1, yt, d.rise ?? w * 0.42, along ? 'v' : 'u', { overhang: 0.18, wallMat: dm, thick: 0.1 });
  }
  // ---- bay windows (box or canted), on a block face at s, width w, depth d ----
  for (const by of S.bays || []) {
    const b = blocks[by.block]; const R = faceRun(b, by.face); const c = by.s, w = by.w ?? 2.8, d = by.d ?? 0.8, ch = by.canted ? Math.min(d, w * 0.3) : 0;
    const yb = by.y0 ?? (b.f0 - 0.5), yt = by.y1 ?? (b.f0 + H * (by.storeys ?? 1) - 0.1); const bm = by.mat ? M_(ctx, by.mat) : (b.wallM || wallM);
    const P = [[c - w / 2, 0], [c - w / 2 + ch, d], [c + w / 2 - ch, d], [c + w / 2, 0]].map(([s, dd]) => R.at(s, dd));
    K.prism(bm, [P[0], P[1], P[2], P[3]], Math.min(yb, b.gmin - 0.5), yt);
    for (let k = 0; k < 3; k++) {
      const RR = K.run(P[k], P[k + 1], 0.0); const L = RR.L; if (L < 0.5) continue;
      for (let st = 0; st < (by.storeys ?? 1); st++) {
        const y0 = (by.y0 ?? b.f0) + st * H + (st === 0 ? 0.6 : 0.8), y1 = Math.min(yt - 0.35, y0 + (by.h ?? 1.75));
        const s0 = 0.18, s1 = L - 0.18; K.rbox(RR, glass, s0, y0, 0.005, s1, y1, 0.02);
        const n = Math.max(1, Math.round((s1 - s0) / 0.8));
        for (let i = 0; i <= n; i++) { const s2 = s0 + (s1 - s0) * i / n; K.rbox(RR, frameM, s2 - 0.05, y0, 0, s2 + 0.05, y1, 0.06); }
        K.rbox(RR, frameM, s0 - 0.05, y0 - 0.1, 0, s1 + 0.05, y0, 0.1); K.rbox(RR, frameM, s0 - 0.05, y1, 0, s1 + 0.05, y1 + 0.1, 0.06);
        if (by.tran) K.rbox(RR, frameM, s0, y0 + (y1 - y0) * 0.72, 0, s1, y0 + (y1 - y0) * 0.72 + 0.06, 0.05, { detail: true });
      }
    }
    // little roof over the bay
    const top = [P[0], P[1], P[2], P[3]]; const R2 = K.run(P[0], P[3]);
    if (by.roof === 'flat' || by.storeys >= (storeysOf(b).length)) { K.prism(trimM, [R.at(c - w / 2 - 0.1, 0), R.at(c - w / 2 + ch - 0.05, d + 0.15), R.at(c + w / 2 - ch + 0.05, d + 0.15), R.at(c + w / 2 + 0.1, 0)], yt, yt + 0.25); }
    else { const hip = [R.at(c - w / 2 - 0.15, 0), R.at(c - w / 2 + ch - 0.1, d + 0.25), R.at(c + w / 2 - ch + 0.1, d + 0.25), R.at(c + w / 2 + 0.15, 0)]; const apex = [R.at(c - w / 2 + 0.3, 0), R.at(c + w / 2 - 0.3, 0)];
      const yr = yt + 0.7; const rp = by.roofMat ? M_(ctx, by.roofMat) : roofM;
      K.add(rp, polysGeo([[[hip[0][0], yt, hip[0][1]], [hip[1][0], yt, hip[1][1]], [apex[0][0], yr, apex[0][1]]].reverse(), [[hip[1][0], yt, hip[1][1]], [hip[2][0], yt, hip[2][1]], [apex[1][0], yr, apex[1][1]], [apex[0][0], yr, apex[0][1]]].reverse(), [[hip[2][0], yt, hip[2][1]], [hip[3][0], yt, hip[3][1]], [apex[1][0], yr, apex[1][1]]].reverse()]), { uvMode: 'roof' });
      K.prism(trimM, hip, yt - 0.18, yt);
    }
  }
  // ---- chimneys ----
  for (const c of S.chimneys || []) {
    const cm = c.mat ? M_(ctx, c.mat) : M.brick; const g0 = K.g(c.u, c.v) - 0.5;
    K.box(cm, c.u - c.w / 2, Math.min(g0, c.y0 ?? g0), c.v - c.d / 2, c.u + c.w / 2, c.top, c.v + c.d / 2);
    K.box(cm, c.u - c.w / 2 - 0.08, c.top - 0.25, c.v - c.d / 2 - 0.08, c.u + c.w / 2 + 0.08, c.top - 0.05, c.v + c.d / 2 + 0.08);
    K.box(M.concreteDark, c.u - 0.15, c.top - 0.05, c.v - 0.15, c.u + 0.15, c.top + 0.3, c.v + 0.15, { detail: true });
  }
  // ---- porches / porticos ----
  for (const p of S.porches || []) {
    const b = blocks[p.block]; const R = faceRun(b, p.face); const s0 = p.s0, s1 = p.s1, dp = p.depth ?? 2.4;
    const deck = p.deck ?? b.f0 - 0.05; const top = p.top ?? (deck + 2.9);
    const pm = p.colMat ? M_(ctx, p.colMat) : trimM;
    const g0 = (() => { let m = Infinity; for (let k = 0; k <= 4; k++) { const q = R.at(s0 + (s1 - s0) * k / 4, dp + 0.5); m = Math.min(m, K.g(q[0], q[1])); } return m; })();
    // deck + skirt
    if (p.deckH !== false) { K.rbox(R, p.skirt ? M_(ctx, p.skirt) : baseM, s0, g0 - 0.8, 0, s1, deck - 0.1, dp); K.rbox(R, p.floorMat ? M_(ctx, p.floorMat) : M.woodDark, s0 - 0.02, deck - 0.1, 0, s1 + 0.02, deck, dp + 0.04); }
    const P4 = [R.at(s0, 0), R.at(s1, 0), R.at(s1, dp), R.at(s0, dp)]; walkables.push(K.walkPoly(P4, deck));
    // columns
    const n = p.cols ?? Math.max(2, Math.round((s1 - s0) / 2.6) + 1); const cs = [];
    for (let k = 0; k < n; k++) cs.push(s0 + 0.3 + (s1 - s0 - 0.6) * k / (n - 1));
    const D = p.colD ?? (p.giant ? 0.55 : 0.32);
    for (const s of cs) {
      const q = R.at(s, dp - 0.3);
      if (p.colStyle === 'square') { K.box(pm, q[0] - D / 2, deck, q[1] - D / 2, q[0] + D / 2, top - 0.35, q[1] + D / 2); K.box(pm, q[0] - D / 2 - 0.06, top - 0.45, q[1] - D / 2 - 0.06, q[0] + D / 2 + 0.06, top - 0.3, q[1] + D / 2 + 0.06); }
      else if (p.colStyle === 'pier') { // craftsman: tapered post on a masonry pedestal
        const pmat = p.pedMat ? M_(ctx, p.pedMat) : baseM; K.box(pmat, q[0] - D * 0.8, deck, q[1] - D * 0.8, q[0] + D * 0.8, deck + 1.0, q[1] + D * 0.8);
        K.add(pm, (() => { const g = new THREE.CylinderGeometry(D * 0.38, D * 0.55, top - deck - 1.35, 4, 1); g.rotateY(Math.PI / 4); g.translate(q[0], deck + 1.0 + (top - deck - 1.35) / 2, q[1]); return g; })());
      } else tuscan(K, pm, q[0], deck, q[1], D, top - deck - 0.35 - D * 0.22);
      colliders.push(K.colCyl(q[0], q[1], D * 0.6, deck - 1, top));
    }
    // beam / entablature + roof
    if (p.roofType === 'gable' || p.giant) {
      K.rbox(R, trimM, s0 - 0.1, top - 0.45, 0, s1 + 0.1, top, dp + 0.1);
      const P = [R.at(s0 - 0.2, 0), R.at(s1 + 0.2, dp + 0.25)]; const uu = [P[0][0], P[1][0]].sort((a, c) => a - c), vv = [P[0][1], P[1][1]].sort((a, c) => a - c);
      const axisAway = (p.face === 'S' || p.face === 'N') ? 'v' : 'u';
      K.gable(p.roofMat ? M_(ctx, p.roofMat) : roofM, uu[0], vv[0], uu[1], vv[1], top, p.rise ?? (s1 - s0) * 0.22, axisAway, { overhang: 0.12, wallMat: p.pedWall ? M_(ctx, p.pedWall) : trimM, thick: 0.15 });
      if (p.letters) greekLetters(K, K.run(R.at(s0, dp + 0.15), R.at(s1, dp + 0.15)), M_(ctx, p.letters.mat || ['paint', '#d4af37']), p.letters.text, (s1 - s0) / 2, top + 0.15, p.letters.h ?? 0.55, { dep: 0.05 });
    } else {
      K.rbox(R, p.fascia ? M_(ctx, p.fascia) : trimM, s0 - 0.12, top - 0.45, 0, s1 + 0.12, top, dp + 0.12); // fascia beam
      K.rbox(R, p.roofMat ? M_(ctx, p.roofMat) : roofM, s0 - 0.2, top, 0, s1 + 0.2, top + 0.08 + (p.shed ? 0.0 : 0.0), dp + 0.25);
      if (p.balcony) { // balustrade on the porch roof (second-floor balcony)
        const RR = K.run(R.at(s0, dp + 0.05), R.at(s1, dp + 0.05)); const bh = 0.95, ym = top + 0.08;
        K.rbox(RR, trimM, -0.05, ym + bh - 0.1, -0.12, RR.L + 0.05, ym + bh, 0.06);
        const nb = Math.floor(RR.L / 0.16); for (let k = 0; k < nb; k++) { const s = (k + 0.5) * RR.L / nb; K.rbox(RR, trimM, s - 0.025, ym, -0.06, s + 0.025, ym + bh - 0.1, 0.0, { detail: true }); }
        for (const ss of [[0, s0], [1, s1]]) { const a = R.at(ss[1], dp + 0.05), c2 = R.at(ss[1], 0.1); const RS = K.run(ss[0] ? a : c2, ss[0] ? c2 : a); K.rbox(RS, trimM, 0, ym + bh - 0.1, -0.06, RS.L, ym + bh, 0.06); }
      }
      if (p.parapet) { const pm2 = M_(ctx, p.parapet.mat || ['paint', '#f2f2ee']); const ph = p.parapet.h ?? 0.9; const RR = K.run(R.at(s0 - 0.1, dp + 0.12), R.at(s1 + 0.1, dp + 0.12));
        K.rbox(RR, pm2, 0, top, -0.25, RR.L, top + ph, 0); K.rbox(RR, trimM, -0.05, top + ph, -0.3, RR.L + 0.05, top + ph + 0.1, 0.05);
        for (const ss of [s0 - 0.1, s1 + 0.1]) { const RS = K.run(R.at(ss, 0.05), R.at(ss, dp + 0.12)); K.rbox(RS, pm2, 0, top, -0.12, RS.L, top + ph, 0.12); }
        if (p.letters) greekLetters(K, RR, M_(ctx, p.letters.mat || ['paint', '#2b2b2b']), p.letters.text, RR.L / 2 + (p.letters.ds ?? 0), top + (ph - (p.letters.h ?? 0.55)) / 2, p.letters.h ?? 0.55, { dep: 0.05 });
      } else if (p.letters) greekLetters(K, K.run(R.at(s0, dp + 0.12), R.at(s1, dp + 0.12)), M_(ctx, p.letters.mat || ['paint', '#d4af37']), p.letters.text, (s1 - s0) / 2 + (p.letters.ds ?? 0), top - 0.42, p.letters.h ?? 0.36, { dep: 0.04 });
    }
    // railing between columns (except at the steps)
    const stepS = p.stepS ?? (s0 + s1) / 2, stepW = p.stepW ?? 1.8;
    if (p.rail !== false && deck - g0 > 0.5) {
      for (let k = 0; k < cs.length - 1; k++) { const a = cs[k] + D / 2, c2 = cs[k + 1] - D / 2; if (stepS > a && stepS < c2 && p.stepFace !== 'side') continue;
        const RR = K.run(R.at(a, dp - 0.3), R.at(c2, dp - 0.3)); K.rbox(RR, pm, 0, deck + 0.85, -0.06, RR.L, deck + 0.95, 0.06); K.rbox(RR, pm, 0, deck + 0.05, -0.05, RR.L, deck + 0.13, 0.05);
        const nb = Math.floor(RR.L / 0.15); for (let i = 0; i < nb; i++) { const s = (i + 0.5) * RR.L / nb; K.rbox(RR, pm, s - 0.022, deck + 0.13, -0.022, s + 0.022, deck + 0.85, 0.022, { detail: true }); }
      }
    }
    // steps down to grade
    if (deck - g0 > 0.12) {
      const nst = Math.max(1, Math.round((deck - g0) / 0.17)); const run = nst * 0.3; const smat = p.stepMat ? M_(ctx, p.stepMat) : M.concrete;
      const A = R.at(stepS - stepW / 2, dp), B = R.at(stepS + stepW / 2, dp + run);
      const uu = [A[0], B[0]].sort((a, c) => a - c), vv = [A[1], B[1]].sort((a, c) => a - c);
      const dir = p.face === 'S' ? '-v' : p.face === 'N' ? '+v' : p.face === 'E' ? '-u' : '+u';
      walkables.push(K.stairs(smat, uu[0], vv[0], uu[1], vv[1], g0, deck, dir, nst));
      for (const sx of [-1, 1]) { const q0 = R.at(stepS + sx * (stepW / 2 + 0.15), dp), q1 = R.at(stepS + sx * (stepW / 2 + 0.15), dp + run); const RS = K.run(q0, q1); K.rbox(RS, p.cheek ? M_(ctx, p.cheek) : baseM, 0, g0 - 0.5, -0.15, RS.L, deck + 0.35, 0.15); }
    }
  }
  // ---- free-standing letters on a wall (above the door etc.) ----
  for (const L of S.letters || []) {
    const b = blocks[L.block]; const R = faceRun(b, L.face); const lm = M_(ctx, L.mat || ['paint', '#f2efe6']);
    if (L.board) { const wdt = [...L.text].length * L.h * 1.0 + L.h * 0.6; K.rbox(R, M_(ctx, L.board), L.s - wdt / 2, L.y - L.h * 0.3, 0, L.s + wdt / 2, L.y + L.h * 1.3, 0.05); }
    greekLetters(K, R, lm, L.text, L.s, L.y, L.h, { dep: L.dep ?? 0.06, d0: (L.d0 ?? 0) + (L.board ? 0.05 : 0) });
  }
  for (const iv of S.ivy || []) { const b = blocks[iv.block]; const R = faceRun(b, iv.face); const im = hmat(ctx, 'ivy', iv.color || '#4b5a2e');
    const n = Math.max(2, Math.round((iv.s1 - iv.s0) / 0.9)); for (let k = 0; k < n; k++) { const a = iv.s0 + (iv.s1 - iv.s0) * k / n, z = a + (iv.s1 - iv.s0) / n; const top = iv.y1 - ((k * 7919) % 5) * 0.35; K.rbox(R, im, a - 0.05, iv.y0, 0.0, z + 0.05, top, 0.06 + ((k * 31) % 3) * 0.03); } }
  // ---- custom extras (callback gets the kit and helpers) ----
  if (S.extra) S.extra({ K, M, ctx, blocks, faceRun, colliders, walkables, mat: (s) => M_(ctx, s), trimM, wallM, roofM, glass, beam: (...a) => beam(K, ...a), tuscan: (...a) => tuscan(K, ...a), letters: (...a) => greekLetters(K, ...a) });
  const object3d = K.finish();
  return { object3d, colliders, walkables };
}
