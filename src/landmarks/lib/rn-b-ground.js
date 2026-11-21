// rn-b (refine-north, houses & Holy Hill): finish the ground floor of simple block buildings built with any classic-Kit K.
// - rectRuns(): exterior face runs of axis-aligned blocks in the building frame, with the stretches hidden by neighbours
// - finishGround(): doors + landings + steps where the packet's footpaths arrive (rn-kit entry), foundation planting or clipped
//   hedges along the exposed walls (skipping doors), bike racks / benches / bins near the main door, wall-mounted downlights.
// Only wraps rn-kit (read-only use); nothing here changes another kit.
import * as THREE from 'three';
import { pathEntrances, entry, planting, bikes, furniture, rnMats, gRun } from './rn-kit.js';

// blocks: [{u0,u1,v0,v1, floor (abs y of the ground floor), faces?: {S:false,...}}]  ->  [{R, f, b, floor, skip:[[s0,s1]]}]
export function rectRuns(K, blocks, { tol = 0.35 } = {}) {
  const out = [];
  for (const b of blocks) {
    const F = { S: [[b.u0, b.v1], [b.u1, b.v1]], E: [[b.u1, b.v1], [b.u1, b.v0]], N: [[b.u1, b.v0], [b.u0, b.v0]], W: [[b.u0, b.v0], [b.u0, b.v1]] };
    for (const f of ['S', 'E', 'N', 'W']) {
      if (b.faces && b.faces[f] === false) continue;
      const R = K.run(F[f][0], F[f][1]); const skip = [];
      for (const o of blocks) {
        if (o === b) continue;
        // does block o touch/overlap this face line from outside or along it?
        let lo, hi, touch = false;
        if (f === 'S' || f === 'N') { const line = f === 'S' ? b.v1 : b.v0; touch = o.v0 <= line + tol && o.v1 >= line - tol; lo = Math.max(b.u0, o.u0); hi = Math.min(b.u1, o.u1); if (touch && hi > lo) skip.push(f === 'S' ? [lo - b.u0, hi - b.u0] : [b.u1 - hi, b.u1 - lo]); }
        else { const line = f === 'E' ? b.u1 : b.u0; touch = o.u0 <= line + tol && o.u1 >= line - tol; lo = Math.max(b.v0, o.v0); hi = Math.min(b.v1, o.v1); if (touch && hi > lo) skip.push(f === 'E' ? [b.v1 - hi, b.v1 - lo] : [lo - b.v0, hi - b.v0]); }
      }
      const extraSkip = [];
      const dl = b.faces && b.faces[f] && b.faces[f].doors; if (Array.isArray(dl)) for (const d of dl) { const ds = typeof d === 'number' ? d : d.s; const dw = (typeof d === 'number' ? 1.2 : (d.w ?? 1.2)); if (ds != null) { extraSkip.push([ds - dw / 2 - 1.0, ds + dw / 2 + 1.0]); (b._doorS ||= {})[f] = [...((b._doorS || {})[f] || []), ds]; } }
      out.push({ R, f, b, floor: b.floor, skip, extraSkip, doorS: (b._doorS || {})[f] || [] });
    }
  }
  return out;
}
const free = (L, skip, s0, s1) => skip.every(([a, b]) => s1 <= a || s0 >= b) && s0 >= 0 && s1 <= L;
const level = (K, R, s0, s1, d, tol = 0.3) => { let lo = Infinity, hi = -Infinity; for (let k = 0; k <= 4; k++) { const g = gRun(K, R, s0 + (s1 - s0) * k / 4, d); lo = Math.min(lo, g); hi = Math.max(hi, g); } return hi - lo < tol; };

// o: { n (auto entries, 2), entries: [{run (index or object), s, ...entryOpts}], door ('wood'|'glass'), entry: {...entry opts},
//      plant: {hedge, h, depth, d0, mats} | false, bikes: n racks | 0, bench: bool, maxRise (2.6), minRun (4), fallback: {run, s} }
export function finishGround(K, ctx, runs, o = {}) {
  const M = K.M; const X = rnMats(M); const colliders = [], walkables = []; const used = new Map(); // R -> [[s0,s1]]
  const mark = (R, a, b) => { if (!used.has(R)) used.set(R, []); used.get(R).push([a, b]); };
  const pick = []; const okRuns = runs.filter((r) => r.R.L >= (o.minRun ?? 4));
  if (o.entries) for (const e of o.entries) { const r = typeof e.run === 'number' ? runs[e.run] : (e.run || runs.find((q) => q.f === e.f && (!e.b || q.b === e.b))); if (r) pick.push({ r, s: e.s ?? r.R.L / 2, opts: e }); }
  else {
    const st = pathEntrances(K, ctx, okRuns.map((r) => r.R), { maxDist: o.maxDist ?? 4.5, merge: 8 });
    for (const p of st) { if (pick.length >= (o.n ?? 2)) break; const r = okRuns.find((q) => q.R === p.R); const w = (o.entry?.w ?? 1.8) / 2 + 0.8; if (!free(r.R.L, r.skip, p.s - w, p.s + w)) continue; if (pick.some((q) => q.r === r && Math.abs(q.s - p.s) < 6)) continue; pick.push({ r, s: p.s, opts: {} }); }
    if (!pick.length) { const fb = o.fallback; const r = fb ? (typeof fb.run === 'number' ? runs[fb.run] : runs.find((q) => q.f === fb.f)) : okRuns.slice().sort((a, b) => b.R.L - a.R.L)[0]; if (r) pick.push({ r, s: fb?.s ?? r.R.L / 2, opts: {} }); }
  }
  const doors = [];
  for (const [i, p] of pick.entries()) {
    const R = p.r.R; const eo = { door: o.door ?? 'wood', w: 1.8, h: 2.7, lamps: true, ...((o.door ?? 'wood') === 'wood' ? { frame: o.entry?.doorMat || M.woodDark } : {}), ...(o.entry || {}), ...(i > 0 ? (o.entry2 || {}) : {}), ...p.opts };
    const grade = gRun(K, R, p.s, 1.6); let floor = eo.floor ?? p.r.floor ?? grade;
    if (floor < grade - 0.05) floor = grade + 0.05;                           // uphill face: door at grade
    if (floor - grade > (o.maxRise ?? 2.6)) floor = grade + 0.15;            // big drop: lower-level door at grade
    const res = entry(K, R, p.s, { ...eo, floor, grade });
    walkables.push(...res.walkables); colliders.push(...res.colliders); mark(R, res.span[0] - 0.4, res.span[1] + 0.4);
    doors.push({ R, s: p.s, floor, grade, run: p.r });
  }
  // street furniture by the main door
  if (doors.length) {
    const d0 = doors[0]; const R = d0.R; const nb = o.bikes ?? 3; const side = (d0.s > R.L / 2) ? -1 : 1;
    const sb = d0.s + side * ((o.entry?.w ?? 1.8) / 2 + 2.6 + nb * 0.48);
    if (nb > 0 && free(R.L, d0.run.skip, sb - nb * 0.5 - 0.4, sb + nb * 0.5 + 0.4) && level(K, R, sb - nb * 0.5, sb + nb * 0.5, o.bikeD ?? 2.3)) { colliders.push(...bikes(K, R, sb, o.bikeD ?? 2.3, nb, Math.min(o.parked ?? 1, nb))); mark(R, sb - nb * 0.5 - 0.6, sb + nb * 0.5 + 0.6); }
    if (o.bench) { const sc = d0.s - side * ((o.entry?.w ?? 1.8) / 2 + 2.4); if (free(R.L, d0.run.skip, sc - 1.2, sc + 1.2)) { colliders.push(furniture(K, R, 'bench', sc, 2.2, Math.PI)); mark(R, sc - 1.3, sc + 1.3); } }
  }
  // no new doors: put the bike racks beside the first existing door that has room
  if (!doors.length && (o.bikes ?? 0) > 0) {
    const nb = o.bikes; let done = false;
    for (const r of runs) { if (done) break; for (const ds of (r.doorS || [])) { for (const side of [1, -1]) { const sb = ds + side * (2.4 + nb * 0.48); if (free(r.R.L, [...r.skip, ...(used.get(r.R) || [])], sb - nb * 0.5 - 0.4, sb + nb * 0.5 + 0.4) && level(K, r.R, sb - nb * 0.5, sb + nb * 0.5, o.bikeD ?? 2.2)) { colliders.push(...bikes(K, r.R, sb, o.bikeD ?? 2.2, nb, Math.min(o.parked ?? 1, nb))); mark(r.R, sb - nb * 0.5 - 0.6, sb + nb * 0.5 + 0.6); done = true; break; } } if (done) break; } }
  }
  // explicit extra bike racks / benches: [{run|f, b?, s, d, n, kind:'bikes'|'bench'|'trashCan'}]
  for (const e of (o.props || [])) {
    const r = typeof e.run === 'number' ? runs[e.run] : runs.find((q) => q.f === e.f && (!e.b || q.b === e.b)); if (!r) continue; const R = r.R;
    if ((e.kind || 'bikes') === 'bikes') { const n = e.n ?? 3; colliders.push(...bikes(K, R, e.s, e.d ?? 2.2, n, Math.min(e.parked ?? 1, n))); mark(R, e.s - n * 0.5 - 0.6, e.s + n * 0.5 + 0.6); }
    else { const c = furniture(K, R, e.kind, e.s, e.d ?? 2.0, e.turn ?? (e.kind === 'bench' ? Math.PI : 0)); if (c) colliders.push(c); mark(R, e.s - 1.2, e.s + 1.2); }
  }
  // foundation planting along exposed walls
  if (o.plant !== false) {
    const P = o.plant || {}; let seed = 3;
    for (const r of runs) {
      if (r.R.L < 2.5 || r.noPlant) continue;
      const skip = [...r.skip.map(([a, b]) => [a - 0.3, b + 0.3]), ...(used.get(r.R) || []), ...(r.extraSkip || [])];
      const dm = (P.d0 ?? 0.3) + (P.depth ?? 1.3) / 2; let prev = gRun(K, r.R, 0, dm);
      for (let t = 1; t <= Math.ceil(r.R.L); t++) { const ss = Math.min(r.R.L, t); const gg = gRun(K, r.R, ss, dm); if (Math.abs(gg - prev) > (P.maxSlope ?? 0.08) * (ss - (t - 1))) skip.push([t - 1.6, ss + 0.6]); prev = gg; }
      if (r.floor != null) for (let t = 0; t <= Math.ceil(r.R.L); t += 1) { const ss = Math.min(r.R.L, t); if (gRun(K, r.R, ss, dm) > r.floor + (P.maxAbove ?? 1.4)) skip.push([ss - 0.6, ss + 0.6]); } // buried wall: no bed
      planting(K, r.R, 0.9, r.R.L - 0.9, { d0: P.d0 ?? 0.3, depth: P.depth ?? 1.3, h: P.h ?? 0.85, w: P.w ?? 0.9, hedge: P.hedge ?? false, skip, seed: seed++, mats: P.mats || [X.leafA, X.leafC] });
    }
  }
  return { colliders, walkables, doors };
}

// Stepped plinth skirt along a block's perimeter that follows the terrain (hides voids where walls meet a slope).
export function skirtRect(K, mat, u0, v0, u1, v1, yTop, { step = 3, out = 0.06, depth = 1.6 } = {}) {
  const F = [[[u0, v1], [u1, v1]], [[u1, v1], [u1, v0]], [[u1, v0], [u0, v0]], [[u0, v0], [u0, v1]]];
  for (const [a, b] of F) {
    const R = K.run(a, b); const n = Math.max(1, Math.round(R.L / step));
    for (let k = 0; k < n; k++) { const s0 = R.L * k / n, s1 = R.L * (k + 1) / n; const g = Math.min(gRun(K, R, s0, 0.2), gRun(K, R, s1, 0.2)); if (g > yTop - 0.05) continue; K.rbox(R, mat, s0 - (k === 0 ? out : 0), g - depth, -0.25, s1 + (k === n - 1 ? out : 0), yTop, out); }
  }
}

// CoopKit (coop-kit.js) blocks -> runs (after K.buildBlocks()); existing coop doors are kept clear of planting
export function coopRuns(K, filter = () => true) {
  return rectRuns(K, K.blocks.filter((b) => b.floors && b.u0 != null && filter(b)).map((b) => ({ u0: b.u0, u1: b.u1, v0: b.v0, v1: b.v1, floor: b.floors[0], faces: b.faces, src: b })));
}

// Landing + steps (+ walkables) in front of an existing door at run station s: floor = door sill (abs y).
export function stoop(K, R, s, w, floor, { depth = 1.5, mat, tread = 0.32, cheek = null } = {}) {
  const M = K.M; const SM = mat || M.concrete; const walk = []; let gy = gRun(K, R, s, depth + 0.8);
  { const n0 = Math.max(1, Math.round((floor - gy) / 0.16)); gy = Math.min(gy, gRun(K, R, s, depth + tread * n0 + 0.3)); } const rise = floor - gy;
  K.rbox(R, SM, s - w / 2, Math.min(gy, floor) - 0.8, 0, s + w / 2, floor, depth);
  const P = (a, b) => R.at(a, b);
  walk.push(K.walkPoly([P(s - w / 2, 0), P(s + w / 2, 0), P(s + w / 2, depth), P(s - w / 2, depth)], floor));
  if (rise > 0.12) {
    const n = Math.max(1, Math.round(rise / 0.16)); const rr = rise / n; const sw = w - 0.2;
    for (let i = 0; i < n; i++) { const gi = Math.min(gy, gRun(K, R, s, depth + tread * (i + 1))); K.rbox(R, SM, s - sw / 2, gi - 0.8, depth + tread * i, s + sw / 2, floor - rr * (i + 1), depth + tread * (i + 1)); }
    if (cheek) for (const sx of [s - w / 2, s + w / 2 - 0.25]) { const g2 = gRun(K, R, sx, depth + tread * n / 2); K.rbox(R, cheek, sx, Math.min(g2, gy) - 0.5, 0, sx + 0.25, floor + 0.2, depth + tread * n); }
    const d1 = depth + tread * n; const cs = [P(s - sw / 2, depth), P(s + sw / 2, depth), P(s + sw / 2, d1), P(s - sw / 2, d1)].map(([u, v]) => K.xz(u, v));
    const xs = cs.map((c) => c[0]), zs = cs.map((c) => c[1]);
    walk.push({ type: 'fn', bounds: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], heightAt: (x, z) => { const [u, v] = K.uv(x, z); const du = u - R.a[0], dv = v - R.a[1]; const ss = du * R.t[0] + dv * R.t[1], dd = du * R.n[0] + dv * R.n[1]; if (Math.abs(ss - s) > sw / 2 + 0.05 || dd < depth - 0.05 || dd > d1 + 0.05) return null; const i = Math.min(n - 1, Math.max(0, Math.floor((dd - depth) / tread))); return floor - rr * (i + 1); } });
  }
  return { walkables: walk, grade: gy, rise };
}

// Window/door openings for b08a-kit house() faces (same layout as its default) that leave out openings buried by the slope:
// returns (R) => ops. fl: floor levels, fh: floor height, o: {nb, bay, ww, wh, sill, mull, doors:[bay idx], tran}
export function gradedOps(K, fl, fh, o = {}, { clear = 0.3, doorArch } = {}) {
  return (R) => {
    const nb = o.nb ?? Math.max(1, Math.round(R.L / (o.bay ?? 3.0))); const bw = R.L / nb; const ops = [];
    const ww = o.ww ?? 1.0, wh = Math.min(o.wh ?? 1.45, fh - 1.1);
    for (let i = 0; i < nb; i++) {
      const c = bw * (i + 0.5); const g = Math.max(gRun(K, R, c - ww / 2, 0.5), gRun(K, R, c + ww / 2, 0.5));
      fl.forEach((y, k) => {
        if (k === 0 && o.doors?.includes(i)) { if (Math.abs(g - y) < 1.2) ops.push({ s0: c - 0.55, s1: c + 0.55, y0: y, y1: y + 2.4, kind: 'door', doorTop: y + 1.9, sill: false, arch: doorArch }); return; }
        const y0 = y + (o.sill ?? 0.85); if (y0 < g + clear) return;
        ops.push({ s0: c - ww / 2, s1: c + ww / 2, y0, y1: y0 + wh, mull: o.mull ?? 1, muntins: o.muntins ?? 0, tran: o.tran });
      });
    }
    return ops;
  };
}

// Split-redwood / cedar shingle wall material (random widths, staggered courses, strong butt shadow). One 2 m tile.
import { bakeMat } from './rn-kit.js';
import { hash2 } from '../../lib/noise.js';
export function shingleMat(key, { base = 0x574739, vary = 0.1, rows = 10, rough = 0.92 } = {}) {
  const B = [(base >> 16) & 255, (base >> 8) & 255, base & 255];
  const cuts = []; // per row: shingle edges in [0,1); narrow units (0.08-0.22 m) so each shingle is taller than wide
  for (let r = 0; r < rows; r++) { const e = [0]; let x = 0; while (true) { x += 0.04 + 0.07 * hash2(r, e.length, 41); if (x > 0.975) break; e.push(x); } cuts.push(e); }
  return bakeMat('shingle:' + key, (u, v) => {
    const rv = v * rows; const row = Math.floor(rv) % rows; const fv = rv - Math.floor(rv);
    const e = cuts[row]; let k = 0; while (k + 1 < e.length && e[k + 1] <= u) k++;
    const left = u - e[k], right = (k + 1 < e.length ? e[k + 1] : 1) - u; const gap = Math.min(left, right) < 0.0022;
    const tone = 1 + (hash2(row, k, 7) - 0.5) * 2 * vary;
    const grain = 0.86 + 0.2 * (0.5 + 0.5 * Math.sin(u * 1400 + 9 * hash2(row, k, 5) + fv * 3)) * (0.5 + 0.5 * hash2(Math.floor(u * 700), row, 3));
    const butt = fv < 0.16 ? 0.3 + fv * 3.2 : 1 - (fv - 0.16) * 0.18; const sh = gap ? 0.35 : 1; const kk = tone * grain * butt * sh;
    return [Math.min(255, B[0] * kk), Math.min(255, B[1] * kk), Math.min(255, B[2] * kk), gap ? 0.05 : (fv < 0.16 ? 0.1 + fv : 0.3 + (1 - fv) * 0.6), rough];
  }, { span: 2, rough, normal: 6 });
}

// Small gabled porch hood over a door at run station s (ridge running out from the wall): two roof slopes + boarded soffit,
// a filled gable triangle, timber or stone brackets/posts. y = underside at the wall, d = projection, w = width.
export function gabledHood(K, R, s, w, y, d, { roofMat, gableMat, postMat, rise = 0.8, posts = false, floor = null, ov = 0.25 } = {}) {
  const M = K.M; const RM = roofMat || M.slate, GM = gableMat || M.stucco, PM = postMat || M.woodDark;
  const s0 = s - w / 2, s1 = s + w / 2;
  const g = new THREE.BufferGeometry();
  const P = [[s0 - ov, y, 0], [s0 - ov, y, d + ov], [s, y + rise, d + ov], [s, y + rise, 0], [s1 + ov, y, 0], [s1 + ov, y, d + ov]];
  const pos = []; for (const i of [0, 1, 2, 0, 2, 3, 3, 2, 5, 3, 5, 4]) pos.push(...P[i]); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  K.addRun(R, RM, g, { uvMode: 'box' });
  K.rbox(R, PM, s0 - ov, y - 0.05, 0, s1 + ov, y + 0.02, d + ov);                              // soffit board
  const gt = new THREE.BufferGeometry(); gt.setAttribute('position', new THREE.Float32BufferAttribute([s0, y, d, s1, y, d, s, y + rise * 0.92, d], 3)); gt.computeVertexNormals(); K.addRun(R, GM, gt);
  K.rbox(R, PM, s0 - 0.05, y - 0.22, d - 0.12, s1 + 0.05, y, d + 0.02);                        // tie beam
  if (posts && floor != null) for (const ss of [s0 + 0.1, s1 - 0.1]) K.rbox(R, PM, ss - 0.1, floor, d - 0.2, ss + 0.1, y, d);
  else for (const ss of [s0 + 0.1, s1 - 0.1]) K.rbox(R, PM, ss - 0.09, y - 0.7, 0, ss + 0.09, y - 0.05, d * 0.8); // brackets
}
