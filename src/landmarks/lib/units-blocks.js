// Berkeley Simulator — b07 Units: LiDAR-tiered block massing with storeyed façades.
// For the modern Southside halls (2000s Unit infill, RSSB/Crossroads, Martinez Commons, Beverly Cleary, Channing-Bowditch…):
// a 1 m raster of roof levels (fitted offline to the 2021 LiDAR inside the OSM footprint) is turned into flat-roofed volumes.
// Every outer edge between a higher and a lower (or no) volume becomes a façade run with recessed punched windows on a
// shared storey grid, a parapet coping, and per-run cladding picked from a palette (colour blocking).
import * as THREE from 'three';
import { Kit } from './classic-kit.js';
import { paintTint, glassMat, curtainMat, plainMat, rng } from './units-kit.js';
import { signMat, runSign, shrubRow, bikeRack, bench, bins, lampPost, charcoalMat } from './rsw-site.js';

// S: {ang, u0, v0, res, nu, nv, lev:[top y...], grid:"string of base36 level idx or '.' per cell, rows by v"}
// style: {F0, sh (storey h), win:{w,h,sill,gap}, palette:[hex...], pickRun(run,idx)->palette idx, ground:{glaze:true}, coping, roofHex, parapet}
export function blocks(ctx, S, style = {}) {
  const M = ctx.M; const K = new Kit(ctx, THREE.MathUtils.degToRad(S.ang));
  const res = S.res, nu = S.nu, nv = S.nv; const rnd = rng(style.seed || 'blocks');
  const L = []; for (let j = 0; j < nv; j++) { L.push([]); for (let i = 0; i < nu; i++) { const ch = S.grid[j * nu + i]; L[j].push(ch === '.' ? -1 : parseInt(ch, 36)); } }
  const lev = S.lev; const at = (i, j) => (i < 0 || j < 0 || i >= nu || j >= nv ? -1 : L[j][i]);
  const U = (i) => S.u0 + i * res, V = (j) => S.v0 + j * res;
  const pal = (style.palette || [0xd8d0bc]).map((h) => (typeof h === 'number' ? paintTint(M, h) : h));
  const mGlass = glassMat(M, style.glassHex ?? 0x56626b), mWin = style.winMat === 'shared' ? M.windowNight : (style.winMat || mGlass), mCurt = curtainMat(M), mFrame = plainMat(M, 'blk-frame:' + (style.frameHex ?? 0x9a9c9c), { color: style.frameHex ?? 0x9a9c9c, roughness: 0.5, metalness: 0.4 });
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
  // refine-south-west (opt-in style.site): pick the entrance run = the longest ground-touching run (optionally on a given face)
  let entRun = -1; const site = style.site;
  if (site) { let best = -1; runs.forEach(([s0, s1, m], i) => { if (m.bot >= 0) return; const L0 = s1 - s0; if (site.face != null && m.d !== site.face) return; if (L0 > best) { best = L0; entRun = i; } });
    if (entRun < 0 && site.face != null) runs.forEach(([s0, s1, m], i) => { if (m.bot < 0 && (entRun < 0 || s1 - s0 > runs[entRun][1] - runs[entRun][0])) entRun = i; }); }
  const groundRuns = [];
  let idx = 0; let ri = -1;
  for (const [s0, s1, m] of runs) { ri++;
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
    const isEnt = ri === entRun; const sc = isEnt ? (site.s != null ? Math.min(len - 2, Math.max(2, site.s * len)) : len / 2) : 0;
    if (isEnt) for (let q = ops.length - 1; q >= 0; q--) { const o = ops[q]; if (o.y0 < F0 + sh && o.s1 > sc - 2.2 && o.s0 < sc + 2.2) ops.splice(q, 1); }
    if (bot < 0 && site) groundRuns.push({ R, len, isEnt, sc, d, k });
    const wallBot = bot < 0 && style.ground ? F0 + sh : yb;
    if (glazed) {
      // curtain-wall run (stair / lounge stack): glass with mullion grid between solid edges
      K.rbox(R, mat, 0, yb, -0.3, len, top + parapet, 0.0);
      K.rbox(R, mGlass, 0.3, Math.max(yb, F0) + 0.2, 0.0, len - 0.3, top - 0.5, 0.05);
      const nm = Math.max(1, Math.round(len / 1.5)); for (let q = 0; q <= nm; q++) K.rbox(R, mFrame, 0.3 + (len - 0.6) * q / nm - 0.04, Math.max(yb, F0) + 0.2, 0.05, 0.3 + (len - 0.6) * q / nm + 0.04, top - 0.5, 0.12, { detail: true });
      for (let y = F0 + sh; y < top - 0.6; y += sh) K.rbox(R, mFrame, 0.3, y - 0.05, 0.05, len - 0.3, y + 0.05, 0.12, { detail: true });
    } else {
      // r4-sweep-outer2 (opt-in style.base2 = {mat, h}): a different cladding for the ground storey (stucco under shingle),
      // split at F0 + h with a trim belt; style.trim = hex adds flat window casings (Craftsman trim). Others unchanged.
      const b2 = style.base2 && bot < 0 && top > F0 + style.base2.h + 0.5 ? F0 + style.base2.h : null;
      if (b2 != null) {
        K.wall(R, style.base2.mat, 0, len, wallBot, b2, ops.filter((o) => o.y0 >= wallBot + 0.1 && o.y1 <= b2), 0.3);
        K.wall(R, mat, 0, len, b2, top + parapet, ops.filter((o) => o.y0 >= b2), 0.3);
        K.rbox(R, mCope, -0.02, b2 - 0.07, -0.02, len + 0.02, b2 + 0.07, 0.09);
      } else K.wall(R, mat, 0, len, wallBot, top + parapet, ops.filter((o) => o.y0 >= wallBot + 0.1), 0.3);
      const mTrim = style.trim != null ? paintTint(M, style.trim) : null;
      for (const o of ops) {
        if (o.y0 < wallBot + 0.1) continue;
        K.fill(R, o, { rev: 0.2, glass: mWin, frame: mFrame, mull: o.s1 - o.s0 > 1.4 ? 1 : 0, sill: false });
        if (mTrim) { const t = 0.11; K.rbox(R, mTrim, o.s0 - t, o.y1, -0.02, o.s1 + t, o.y1 + 0.14, 0.06); K.rbox(R, mTrim, o.s0 - t - 0.04, o.y0 - 0.1, -0.02, o.s1 + t + 0.04, o.y0, 0.08);
          for (const x of [o.s0 - t, o.s1]) K.rbox(R, mTrim, x, o.y0, -0.02, x + t, o.y1, 0.05, { detail: true }); }
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
  if (site) {
    const mFas = charcoalMat(M); K.siteMats = { galv: mFrame, dark: mFas }; const walk = [];
    for (const gr of groundRuns) {
      const { R, len } = gr; const gS = (ss, dd) => K.g(...R.at(ss, dd));
      if (gr.isEnt && site.entrance !== false) {
        const sc = gr.sc, cw = site.canopyW ?? 2.6, cy = F0 + Math.min(sh, 3.1) - 0.05, cd = site.canopyD ?? 2.6;
        // glass double doors with sidelights in an aluminium frame (in front of any storefront glazing)
        K.rbox(R, mWin, sc - 1.5, F0, -0.2, sc + 1.5, cy - 0.15, -0.16);
        for (const x of [sc - 1.5, sc - 0.9, sc, sc + 0.9, sc + 1.5]) K.rbox(R, mFrame, x - 0.05, F0, -0.17, x + 0.05, cy - 0.15, -0.08);
        for (const y of [F0 + 0.02, F0 + 2.3, cy - 0.2]) K.rbox(R, mFrame, sc - 1.5, y - 0.05, -0.17, sc + 1.5, y + 0.05, -0.08);
        for (const sg of [-1, 1]) K.rbox(R, mFas, sc + sg * 0.12 - 0.25, F0 + 0.98, -0.08, sc + sg * 0.12 + 0.25, F0 + 1.03, -0.03, { detail: true });
        // canopy with a dark fascia name band and downlights
        K.rbox(R, mCope, sc - cw, cy, -0.3, sc + cw, cy + 0.25, cd);
        K.rbox(R, mFas, sc - cw - 0.03, cy - 0.05, cd - 0.02, sc + cw + 0.03, cy + 0.4, cd + 0.05);
        if (site.name) runSign(K, R, signMat(M, site.name.toUpperCase(), { bg: '#2c2f32', fg: '#efe8d8', size: 0.6, track: 0.1 }), sc, cy + 0.0, Math.min(2 * cw - 0.3, 0.3 * site.name.length + 0.5), 0.34, cd + 0.055);
        for (const ds of [-1.2, 0, 1.2]) K.rbox(R, M.lampGlow, sc + ds - 0.12, cy - 0.02, cd * 0.5 - 0.12, sc + ds + 0.12, cy, cd * 0.5 + 0.12, { detail: true });
        const gE = gS(sc, cd + 1.0); K.rbox(R, M.concrete, sc - cw, Math.min(gE, F0) - 0.8, -0.3, sc + cw, F0, cd);
        walk.push([[R.at(sc - cw, -0.3), R.at(sc + cw, -0.3), R.at(sc + cw, cd), R.at(sc - cw, cd)], F0]);
        if (F0 - gE > 0.2) { const n = Math.max(2, Math.round((F0 - gE) / 0.16)); for (let i = 0; i < n; i++) K.rbox(R, M.concrete, sc - 1.8, gE - 0.8, cd + (n - 1 - i) * 0.3, sc + 1.8, gE + (F0 - gE) * (i + 1) / n, cd + (n - i) * 0.3); }
        if (site.details !== false) {
          if (sc + cw + 3.5 < len) bikeRack(K, R, sc + cw + 2.2, cd + 0.3, gS(sc + cw + 2.2, cd + 0.3), 5, { pitch: 0.85 });
          if (sc - cw - 2.2 > 1) bench(K, R, sc - cw - 1.6, cd - 0.4, gS(sc - cw - 1.6, cd - 0.4), 1.9);
          bins(K, R, sc - cw - 0.2 - 1.6, 0.8, gS(sc - cw - 1.8, 0.8));
          for (const sg of [-1, 1]) { const [lu, lv] = R.at(sc + sg * (cw + 0.8), cd + 1.4); lampPost(K, lu, lv, K.g(lu, lv), 4.2); }
        }
      } else if (site.plant !== false && len > 4 && !(gr.isEnt && site.entrance !== false)) {
        // foundation planting on part of the other ground runs (near-grade only)
        const gm = gS(len / 2, 0.8); if (Math.abs(gm - F0) < 0.8 && (gr.d + Math.round(len)) % 3 !== 0) shrubRow(K, R, 0.6, len - 0.6, 0.75, gS, { r: 0.5, gap: 1.0, seed: Math.round(len * 7) + gr.d, hexes: [0x4f6b3a, 0x5d7a40, 0x46613a, 0x6a7d48] });
      }
    }
    style._walk = walk;
  }
  if (style.extra) style.extra(K, { F0, sh, lev, U, V, L, nu, nv, res });
  const colliders = [];
  // colliders: one box per merged footprint row-run (coarse)
  for (let j = 0; j < nv; j++) { let i = 0; while (i < nu) { if (L[j][i] < 0) { i++; continue; } let i2 = i; while (i2 + 1 < nu && L[j][i2 + 1] >= 0) i2++; colliders.push(K.colPoly([[U(i), V(j)], [U(i2 + 1), V(j)], [U(i2 + 1), V(j + 1)], [U(i), V(j + 1)]], yLow, Math.max(...L[j].slice(i, i2 + 1).map((k) => lev[k])) + 1)); i = i2 + 1; } }
  const walkables = (style._walk || []).map(([poly, y]) => K.walkPoly(poly, y));
  return { object3d: K.finish(), colliders, walkables, K, F0 };
}
