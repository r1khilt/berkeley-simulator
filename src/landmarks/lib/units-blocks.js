// Berkeley Simulator — b07 Units: LiDAR-tiered block massing with storeyed façades.
// For the modern Southside halls (2000s Unit infill, RSSB/Crossroads, Martinez Commons, Beverly Cleary, Channing-Bowditch…):
// a 1 m raster of roof levels (fitted offline to the 2021 LiDAR inside the OSM footprint) is turned into flat-roofed volumes.
// Every outer edge between a higher and a lower (or no) volume becomes a façade run with recessed punched windows on a
// shared storey grid, a parapet coping, and per-run cladding picked from a palette (colour blocking).
import * as THREE from 'three';
import { Kit } from './classic-kit.js';
import { paintTint, glassMat, curtainMat, plainMat, rng } from './units-kit.js';

// S: {ang, u0, v0, res, nu, nv, lev:[top y...], grid:"string of base36 level idx or '.' per cell, rows by v"}
// style: {F0, sh (storey h), win:{w,h,sill,gap}, palette:[hex...], pickRun(run,idx)->palette idx, ground:{glaze:true}, coping, roofHex, parapet}
export function blocks(ctx, S, style = {}) {
  const M = ctx.M; const K = new Kit(ctx, THREE.MathUtils.degToRad(S.ang));
  const res = S.res, nu = S.nu, nv = S.nv; const rnd = rng(style.seed || 'blocks');
  const L = []; for (let j = 0; j < nv; j++) { L.push([]); for (let i = 0; i < nu; i++) { const ch = S.grid[j * nu + i]; L[j].push(ch === '.' ? -1 : parseInt(ch, 36)); } }
  const lev = S.lev; const at = (i, j) => (i < 0 || j < 0 || i >= nu || j >= nv ? -1 : L[j][i]);
  const U = (i) => S.u0 + i * res, V = (j) => S.v0 + j * res;
  const pal = (style.palette || [0xd8d0bc]).map((h) => (typeof h === 'number' ? paintTint(M, h) : h));
  const mGlass = glassMat(M, style.glassHex ?? 0x56626b), mCurt = curtainMat(M), mFrame = plainMat(M, 'blk-frame:' + (style.frameHex ?? 0x9a9c9c), { color: style.frameHex ?? 0x9a9c9c, roughness: 0.5, metalness: 0.4 });
  const mCope = style.coping ? paintTint(M, style.coping) : plainMat(M, 'blk-cope', { color: 0xb8b8b2, roughness: 0.6, metalness: 0.3 });
  const mRoof = style.roofMat || M.concreteDark; const mBase = style.baseHex ? paintTint(M, style.baseHex) : M.concreteDark;
  // ground reference
  let gMin = Infinity; for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) if (L[j][i] >= 0) gMin = Math.min(gMin, K.g(U(i) + res / 2, V(j) + res / 2));
  const F0 = style.F0 ?? gMin + 0.1; const sh = style.sh ?? 3.0; const yLow = gMin - 1.5;
  const win = style.win || { w: 1.2, h: 1.5, sill: 0.95, gap: 3.0 };
  // ---- roofs: per level, greedy rectangles of cells at exactly that level ----
  const seen = L.map((r) => r.map(() => false));
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const k = L[j][i]; if (k < 0 || seen[j][i]) continue;
    let i2 = i; while (i2 + 1 < nu && L[j][i2 + 1] === k && !seen[j][i2 + 1]) i2++;
    let j2 = j; outer: while (j2 + 1 < nv) { for (let q = i; q <= i2; q++) if (L[j2 + 1][q] !== k || seen[j2 + 1][q]) break outer; j2++; }
    for (let jj = j; jj <= j2; jj++) for (let q = i; q <= i2; q++) seen[jj][q] = true;
    K.box(mRoof, U(i), lev[k] - 0.35, V(j), U(i2 + 1), lev[k], V(j2 + 1));
    // fill the volume (core) so nothing is see-through
    K.box(M.concreteDark, U(i) + 0.3, yLow, V(j) + 0.3, U(i2 + 1) - 0.3, lev[k] - 0.3, V(j2 + 1) - 0.3);
  }
  // ---- façade edges ----
  // dir: 0 = -v (N face), 1 = +u (E), 2 = +v (S), 3 = -u (W)
  const edges = new Map();
  const push = (key, s0, s1, meta) => { if (!edges.has(key)) edges.set(key, []); edges.get(key).push([s0, s1, meta]); };
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const k = L[j][i]; if (k < 0) continue;
    const nb = [at(i, j - 1), at(i + 1, j), at(i, j + 1), at(i - 1, j)];
    for (let d = 0; d < 4; d++) {
      if (nb[d] >= k) continue; const bot = nb[d];
      const line = d === 0 ? V(j) : d === 1 ? U(i + 1) : d === 2 ? V(j + 1) : U(i);
      const s0 = d === 0 || d === 2 ? U(i) : V(j);
      push(`${d}|${line.toFixed(2)}|${k}|${bot}`, s0, s0 + res, { d, line, k, bot });
    }
  }
  const runs = [];
  for (const [key, list] of edges) {
    list.sort((a, b) => a[0] - b[0]);
    let cur = null;
    for (const [s0, s1, meta] of list) { if (cur && Math.abs(cur[1] - s0) < 1e-3) cur[1] = s1; else { if (cur) runs.push(cur); cur = [s0, s1, meta]; } }
    if (cur) runs.push(cur);
  }
  let idx = 0;
  for (const [s0, s1, m] of runs) {
    const { d, line, k, bot } = m; const top = lev[k]; const yb = bot < 0 ? yLow : lev[bot];
    let a, b; // run endpoints so the outward normal points away from the volume
    if (d === 0) { a = [s1, line]; b = [s0, line]; } else if (d === 2) { a = [s0, line]; b = [s1, line]; } else if (d === 1) { a = [line, s1]; b = [line, s0]; } else { a = [line, s0]; b = [line, s1]; }
    const R = K.run(a, b); const len = R.L;
    const pi = style.pick ? style.pick({ d, line, k, bot, len, idx, s0, s1 }) : idx % pal.length; const mat = pal[pi % pal.length] || pal[0];
    const parapet = style.parapet ?? 0.6;
    // openings on the storey grid
    const ops = [];
    const glazed = style.glazedRun && style.glazedRun({ d, line, k, bot, len, idx });
    if (len >= 2.2 && !glazed) {
      const nwin = Math.max(1, Math.floor((len - 0.6) / win.gap)); const pitch = len / nwin;
      for (let f = 0; ; f++) {
        const y = F0 + f * sh; if (y + win.sill + win.h > top - 0.4) break;
        if (y < yb + 0.3) continue;
        if (f === 0 && style.ground) continue;
        for (let q = 0; q < nwin; q++) {
          const c = pitch * (q + 0.5); const pair = win.pair && pitch > 2 * win.w + 0.9;
          if (pair) { ops.push({ s0: c - win.w - 0.18, s1: c - 0.18, y0: y + win.sill, y1: y + win.sill + win.h }); ops.push({ s0: c + 0.18, s1: c + win.w + 0.18, y0: y + win.sill, y1: y + win.sill + win.h }); }
          else ops.push({ s0: c - win.w / 2, s1: c + win.w / 2, y0: y + win.sill, y1: y + win.sill + win.h });
        }
      }
    }
    const wallBot = bot < 0 && style.ground ? F0 + sh : yb;
    if (glazed) {
      // curtain-wall run (stair / lounge stack): glass with mullion grid between solid edges
      K.rbox(R, mat, 0, yb, -0.3, len, top + parapet, 0.0);
      K.rbox(R, mGlass, 0.3, Math.max(yb, F0) + 0.2, 0.0, len - 0.3, top - 0.5, 0.05);
      const nm = Math.max(1, Math.round(len / 1.5)); for (let q = 0; q <= nm; q++) K.rbox(R, mFrame, 0.3 + (len - 0.6) * q / nm - 0.04, Math.max(yb, F0) + 0.2, 0.05, 0.3 + (len - 0.6) * q / nm + 0.04, top - 0.5, 0.12, { detail: true });
      for (let y = F0 + sh; y < top - 0.6; y += sh) K.rbox(R, mFrame, 0.3, y - 0.05, 0.05, len - 0.3, y + 0.05, 0.12, { detail: true });
    } else {
      K.wall(R, mat, 0, len, wallBot, top + parapet, ops.filter((o) => o.y0 >= wallBot + 0.1), 0.3);
      for (const o of ops) {
        if (o.y0 < wallBot + 0.1) continue;
        K.fill(R, o, { rev: 0.2, glass: mGlass, frame: mFrame, mull: o.s1 - o.s0 > 1.4 ? 1 : 0, sill: false });
        if (rnd() < 0.5) { const cw = (o.s1 - o.s0) * (0.35 + 0.6 * rnd()); const left = rnd() < 0.5; K.rbox(R, mCurt, left ? o.s0 + 0.03 : o.s1 - 0.03 - cw, o.y0 + 0.04, -0.215, left ? o.s0 + 0.03 + cw : o.s1 - 0.03, o.y1 - 0.05, -0.208); }
        if (style.sill !== false) K.rbox(R, mCope, o.s0 - 0.05, o.y0 - 0.06, -0.02, o.s1 + 0.05, o.y0, 0.07, { detail: true });
      }
      // ground storey: storefront glazing / base
      if (bot < 0 && style.ground) {
        K.rbox(R, mBase, 0, yb, -0.32, len, F0 + 0.4, 0.02);
        if (len > 2) { K.rbox(R, mGlass, 0.25, F0 + 0.4, -0.28, len - 0.25, F0 + sh - 0.45, -0.22); const nm = Math.max(1, Math.round(len / 1.6)); for (let q = 1; q < nm; q++) K.rbox(R, mFrame, len * q / nm - 0.04, F0 + 0.4, -0.22, len * q / nm + 0.04, F0 + sh - 0.45, -0.16, { detail: true }); }
        K.rbox(R, mat, 0, F0 + sh - 0.45, -0.32, len, F0 + sh, 0.0);
      }
    }
    K.rbox(R, mCope, -0.02, top + parapet, -0.36, len + 0.02, top + parapet + 0.08, 0.06);
    idx++;
  }
  if (style.extra) style.extra(K, { F0, sh, lev, U, V, L, nu, nv, res });
  const colliders = [];
  // colliders: one box per merged footprint row-run (coarse)
  for (let j = 0; j < nv; j++) { let i = 0; while (i < nu) { if (L[j][i] < 0) { i++; continue; } let i2 = i; while (i2 + 1 < nu && L[j][i2 + 1] >= 0) i2++; colliders.push(K.colPoly([[U(i), V(j)], [U(i2 + 1), V(j)], [U(i2 + 1), V(j + 1)], [U(i), V(j + 1)]], yLow, Math.max(...L[j].slice(i, i2 + 1).map((k) => lev[k])) + 1)); i = i2 + 1; } }
  return { object3d: K.finish(), colliders, walkables: [], K, F0 };
}
