// b06 kit: helpers for contemporary campus buildings (curtain walls, fins, punched-window panel façades, slabs).
// Works on top of classic-kit's Kit (building frame u,v; façade runs; merge per material).
import * as THREE from 'three';

// Outward-facing runs around a polygon given in building frame (u,v). Returns [{R, a, b}] (counter-clockwise safe).
export function polyRuns(K, poly) {
  let area = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1]; }
  // Kit.run outward normal = (-tz, tx): for a polygon with positive signed area in (u,v) (counter-clockwise when v points down... ) walk
  // in the order that puts the building on the LEFT, i.e. reverse when area > 0.
  const pts = area > 0 ? poly.slice().reverse() : poly.slice();
  const out = [];
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.3) continue; out.push({ R: K.run(a, b), a, b }); }
  return out;
}

// Vertical prism (floor plates / core / roof slab) of a building-frame polygon.
export function slab(K, mat, poly, y0, y1, opts) { return K.prism(mat, poly, y0, y1, opts); }

// Inset a convex-ish polygon by d (miter), building frame.
export function inset(poly, d) {
  let area = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1]; }
  const sgn = area > 0 ? 1 : -1; const n = poly.length;
  const N = poly.map((p, i) => { const q = poly[(i + 1) % n]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; const tx = (q[0] - p[0]) / L, tz = (q[1] - p[1]) / L; return sgn > 0 ? [tz, -tx] : [-tz, tx]; });
  return poly.map((p, i) => { const n1 = N[(i - 1 + n) % n], n2 = N[i]; const dd = 1 + n1[0] * n2[0] + n1[1] * n2[1]; return [p[0] - d * (n1[0] + n2[0]) / dd, p[1] - d * (n1[1] + n2[1]) / dd]; });
}

// Curtain wall on run R between s0..s1, y0..y1. floors: array of floor-line heights (spandrel bands drawn at each).
// opts: glass, mull (spacing), mullMat, mullD (projection), band (height), bandMat, bandD, fins {pitch, depth, w, mat, skipBands}, recess (glass set back)
export function curtain(K, R, s0, s1, y0, y1, floors = [], o = {}) {
  const M = K.M; const glass = o.glass || M.windowNight; const rec = o.recess ?? 0.12;
  K.rbox(R, glass, s0, y0, -rec - 0.04, s1, y1, -rec);
  const mull = o.mull ?? 1.5; const mm = o.mullMat || M.iron; const md = o.mullD ?? 0.1;
  if (mull > 0) { const n = Math.max(1, Math.round((s1 - s0) / mull)); for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, mm, s - 0.03, y0, -rec, s + 0.03, y1, -rec + md, i === 0 || i === n ? undefined : { detail: !!o.mullDetail }); } }
  const bh = o.band ?? 0.7; const bm = o.bandMat || M.iron; const bd = o.bandD ?? 0.04;
  if (bh > 0) for (const f of floors) if (f > y0 + 0.1 && f < y1 - 0.1) K.rbox(R, bm, s0, f - bh / 2, -rec, s1, f + bh / 2, -rec + bd);
  if (o.fins) {
    const F = o.fins; const n = Math.max(1, Math.round((s1 - s0) / F.pitch)); const lines = [y0, ...floors.filter((f) => f > y0 + 0.1 && f < y1 - 0.1), y1];
    for (let k = 0; k < lines.length - 1; k++) {
      const ya = lines[k] + (F.skipBands ? bh / 2 : 0), yb = lines[k + 1] - (F.skipBands ? bh / 2 : 0); if (yb - ya < 0.5) continue;
      for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; const dep = typeof F.depth === 'function' ? F.depth(i, k) : F.depth; K.rbox(R, F.mat || M.whitePaint, s - (F.w ?? 0.06) / 2, ya, -rec, s + (F.w ?? 0.06) / 2, yb, -rec + dep, { detail: F.detail ?? false }); }
    }
  }
}

// Punched windows in a solid panel wall: storeys [{y0,y1}], bays of width bw with window width ww, sill/head offsets.
export function punched(K, R, s0, s1, stories, o = {}) {
  const M = K.M; const nb = o.nb ?? Math.max(1, Math.round((s1 - s0) / (o.bay ?? 3)));
  for (const st of stories) {
    const ops = []; const bw = (s1 - s0) / nb;
    if (!st.solid) for (let i = 0; i < nb; i++) { if ((o.skip || []).includes(i)) continue; const c = s0 + bw * (i + 0.5); const ww = o.ww ?? bw * 0.6; ops.push({ s0: c - ww / 2, s1: c + ww / 2, y0: st.y0 + (o.sill ?? 0.9), y1: Math.min(st.y1 - 0.2, st.y0 + (o.sill ?? 0.9) + (o.wh ?? 1.8)) }); }
    K.wall(R, st.mat || o.mat || M.concrete, s0, s1, st.y0, st.y1, ops, o.depth ?? 0.35);
    for (const op of ops) K.fill(R, op, { mull: o.mullN ?? 1, rev: (o.depth ?? 0.35) - 0.1, frame: o.frame || M.iron, glass: o.glass });
  }
}

// Flat roof with parapet along every run of the polygon; returns nothing.
export function flatRoof(K, poly, y, { mat, parapet = 1.0, capMat, t = 0.3 } = {}) {
  const M = K.M; K.prism(mat || M.concreteDark, inset(poly, 0.05), y - 0.35, y);
  if (parapet > 0) for (const { R } of polyRuns(K, poly)) K.rbox(R, capMat || M.concrete, -0.02, y - 0.35, -t, R.L + 0.02, y + parapet, 0.02);
}

// Rooftop mechanical penthouse: louvred box.
export function penthouse(K, poly, y0, h, { mat, louvreMat } = {}) {
  const M = K.M; K.prism(mat || M.concreteDark, poly, y0, y0 + h);
  for (const { R } of polyRuns(K, poly)) { const n = Math.max(2, Math.round(R.L / 0.35)); for (let i = 0; i < n; i++) K.rbox(R, louvreMat || M.iron, 0, y0 + h * 0.25 + (h * 0.6) * i / n, 0, R.L, y0 + h * 0.25 + (h * 0.6) * i / n + 0.06, 0.08, { detail: true }); }
}

// Local material helper (clone a shared material with a tint, keeping its textures).
export function tint(base, hex, name, extra = {}) { const m = base.clone(); m.color.set(hex); m.name = name; Object.assign(m, extra); return m; }
export function std(hex, name, { rough = 0.7, metal = 0.0, ...rest } = {}) { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal, ...rest }); m.name = name; return m; }
