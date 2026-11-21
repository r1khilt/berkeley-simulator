// b06a kit: helpers for the batch-b06a buildings (modern campus blocks, the Haas village, Clark Kerr Spanish
// Colonial Revival, Arts-and-Crafts apartments). Built on classic-kit's Kit (building frame u,v; merged per material).
import * as THREE from 'three';
import { Kit, polysGeo } from './classic-kit.js';
export { Kit, polysGeo };

// ---------- local materials (cached clones of shared ones with a new colour) ----------
const _cache = new Map();
export function tint(M, base, hex, extra) {
  const key = `${base}|${hex}|${extra ? JSON.stringify(extra) : ''}`;
  let m = _cache.get(key);
  if (!m) { m = M[base].clone(); m.color = new THREE.Color(hex); if (extra) Object.assign(m, extra); _cache.set(key, m); }
  return m;
}

// Brightening tint for textured materials (linear multipliers may exceed 1, e.g. light glulam from the wood texture)
export function tintMul(M, base, r, g, b, extra) {
  const key = `${base}|mul${r},${g},${b}|${extra ? JSON.stringify(extra) : ''}`;
  let m = _cache.get(key);
  if (!m) { m = M[base].clone(); m.color = new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace); if (extra) Object.assign(m, extra); _cache.set(key, m); }
  return m;
}

// ---------- polygon helpers (building frame [u,v]) ----------
export function area(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
// orientation for which K.run(a,b) normals face OUTWARD (negative shoelace area in u,v)
export function cw(P) { return area(P) > 0 ? P.slice().reverse() : P.slice(); }
export function offset(P, d) { // d > 0 grows the polygon
  P = cw(P); const n = P.length;
  const N = P.map((p, i) => { const q = P[(i + 1) % n]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]); return [-(q[1] - p[1]) / L, (q[0] - p[0]) / L]; });
  return P.map((p, i) => { const a = N[(i - 1 + n) % n], b = N[i]; const k = 1 + a[0] * b[0] + a[1] * b[1]; return [p[0] + d * (a[0] + b[0]) / k, p[1] + d * (a[1] + b[1]) / k]; });
}
export function runs(K, P) { P = cw(P); return P.map((a, i) => K.run(a, P[(i + 1) % P.length])); }
export const rect = (u0, v0, u1, v1) => [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
// runs of a rectangle keyed by facing: S (+v), E (+u), N (-v), W (-u)
export function rectRuns(K, u0, v0, u1, v1) {
  return { S: K.run([u0, v1], [u1, v1]), E: K.run([u1, v1], [u1, v0]), N: K.run([u1, v0], [u0, v0]), W: K.run([u0, v0], [u0, v1]) };
}

// ---------- façade pieces (all on a run R: s along, y up, d outward) ----------
// Curtain wall: glass plane recessed `recess`, vertical mullions every `pitch`, transoms at `trans` heights.
export function curtain(K, R, s0, s1, y0, y1, o = {}) {
  const M = K.M; const glass = o.glass || M.windowNight; const fm = o.frame || M.blackPaint;
  const d = -(o.recess ?? 0.12); const mw = o.mw ?? 0.07, md = o.md ?? 0.14;
  K.rbox(R, glass, s0, y0, d - 0.05, s1, y1, d);
  const n = Math.max(1, Math.round((s1 - s0) / (o.pitch ?? 1.5)));
  for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, fm, Math.max(s0, s - mw / 2), y0, d, Math.min(s1, s + mw / 2), y1, d + md, { detail: i > 0 && i < n }); }
  for (const t of (o.trans || [])) { const th = (typeof t === 'object' ? t.h : o.th) ?? 0.08; const y = typeof t === 'object' ? t.y : t; K.rbox(R, (typeof t === 'object' && t.mat) || o.spandrel || fm, s0, y - th, d, s1, y + th, d + md + 0.01); }
}
// Wall slab with rectangular openings and recessed glazing; ops: [{s0,s1,y0,y1,mull,tran,door}]
export function punched(K, R, mat, s0, s1, y0, y1, ops, o = {}) {
  const M = K.M; const depth = o.depth ?? 0.3; const rev = o.rev ?? depth - 0.08;
  K.wall(R, mat, s0, s1, y0, y1, ops, depth);
  for (const op of ops) {
    if (op.door) { K.fill(R, { ...op, sill: false, doorTop: op.doorTop ?? Math.min(op.y1, op.y0 + 2.4) }, { kind: 'door', rev, frame: o.frame || M.blackPaint, door: op.doorMat || o.doorMat || M.windowNight, glass: o.glass }); continue; }
    K.fill(R, { ...op, sill: o.sill ? undefined : false, sillMat: o.sillMat }, { rev, frame: o.frame || M.blackPaint, glass: o.glass, mull: op.mull ?? o.mull ?? 0, tran: op.tran ?? [] });
  }
}
// Regular grid of openings over storeys: storeys [{y0,y1,h,sill,w}] ; columns: array of centres (s) or {pitch}
export function gridOps(cols, storeys, o = {}) {
  const ops = [];
  for (const st of storeys) { if (st.none) continue; for (const c of cols) { const w = st.w ?? o.w ?? 1.2; const y0 = st.y0 + (st.sill ?? o.sill ?? 0.9); ops.push({ s0: c - w / 2, s1: c + w / 2, y0, y1: Math.min(st.y1 - (o.head ?? 0.35), y0 + (st.h ?? o.h ?? 2.0)), mull: st.mull ?? o.mull, tran: st.tran ? [y0 + st.tran] : [] }); } }
  return ops;
}
export function centres(s0, s1, pitch, { n, margin = 0 } = {}) { const a = s0 + margin, b = s1 - margin; const k = n ?? Math.max(1, Math.round((b - a) / pitch)); const out = []; for (let i = 0; i < k; i++) out.push(a + (b - a) * (i + 0.5) / k); return out; }
// Vertical fins on a run at positions ss
export function fins(K, R, mat, ss, y0, y1, { w = 0.12, d = 0.45, d0 = 0, detail = false } = {}) { for (const s of ss) K.rbox(R, mat, s - w / 2, y0, d0, s + w / 2, y1, d0 + d, { detail }); }
// Horizontal sunshade ledges / canopies
export function ledges(K, R, mat, s0, s1, ys, { t = 0.12, d = 0.7, d0 = 0 } = {}) { for (const y of ys) K.rbox(R, mat, s0, y - t, d0, s1, y, d0 + d); }
// Railing along a run: posts + top rail + infill (glass/mesh panel)
export function railing(K, R, s0, s1, y, { h = 1.1, d = 0.05, post, panel, pitch = 1.6, rail } = {}) {
  const M = K.M; post = post || M.iron; rail = rail || post;
  K.rbox(R, rail, s0, y + h - 0.05, d - 0.03, s1, y + h, d + 0.03, { detail: true });
  const n = Math.max(1, Math.round((s1 - s0) / pitch)); for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, post, s - 0.03, y, d - 0.03, s + 0.03, y + h, d + 0.03, { detail: true }); }
  if (panel) K.rbox(R, panel, s0, y + 0.08, d - 0.01, s1, y + h - 0.08, d + 0.01, { detail: true });
}
// Parapet ring around polygon P from y0 to y1 with thickness t, optional coping
export function parapet(K, mat, P, y0, y1, { t = 0.3, coping, cOut = 0.05 } = {}) {
  K.prism(mat, cw(P), y0, y1, {}, [offset(P, -t)]);
  if (coping) K.prism(coping, offset(P, cOut), y1, y1 + 0.08, {}, [offset(P, -t - cOut)]);
}
// Roof deck (flat) polygon
export function deck(K, mat, P, y, t = 0.25) { K.prism(mat, cw(P), y - t, y); }
// Diagonal strut (round) between two points in building frame [u,y,v]
export function strut(K, mat, a, b, r = 0.22, seg = 10, opts) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const L = A.distanceTo(B);
  const g = seg === 4 ? new THREE.BoxGeometry(r * 2, L, r * 2) : new THREE.CylinderGeometry(r, r, L, seg); g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.applyQuaternion(q); g.translate(A.x, A.y, A.z); return K.add(mat, g, opts);
}
// Text sign on a canvas (letters), placed on run R at (s centre, y centre), height h. Returns nothing; uses its own material.
export function sign(K, R, text, s, y, h, { color = '#2b2b2b', bg = null, font = 'bold 76px Arial', d = 0.03, width } = {}) {
  const c = document.createElement('canvas'); const ctx = c.getContext('2d'); ctx.font = font;
  const tw = ctx.measureText(text).width; c.width = Math.ceil(tw + 40); c.height = 110;
  const x = c.getContext('2d'); if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); } x.font = font; x.fillStyle = color; x.textBaseline = 'middle'; x.fillText(text, 20, 58);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: !bg, roughness: 0.6, metalness: 0.2 });
  const w = width ?? h * c.width / c.height;
  const g = new THREE.PlaneGeometry(w, h); g.translate(s, y, d); g.applyMatrix4(R.m);
  const mesh = new THREE.Mesh(g, m); mesh.userData.detail = true; K.extra.push(mesh);
}

// ---------- pitched roofs ----------
// Gable roof as a closed solid: ridge along u (axis 'u') or v. Includes gable-end wall triangles (wallMat) and an eave soffit.
export function gableRoof(K, mat, u0, v0, u1, v1, yE, rise, axis, { ov = 0.5, gov = 0.3, wallMat, t = 0.22 } = {}) {
  K.gable(mat, u0 + (axis === 'u' ? 0 : 0), v0, u1, v1, yE, rise, axis, { overhang: ov, wallMat, thick: t });
}
// Hip roof (solid look): K.hip + soffit board under the overhang
export function hipRoof(K, mat, u0, v0, u1, v1, yE, slope, { ov = 0.5, yTop = Infinity, soffit, fascia } = {}) {
  const yT = K.hip(mat, u0 - ov, v0 - ov, u1 + ov, v1 + ov, yE, slope, { yTop });
  if (soffit) K.prism(soffit, rect(u0 - ov, v0 - ov, u1 + ov, v1 + ov), yE - 0.12, yE - 0.02, {}, [rect(u0 + 0.05, v0 + 0.05, u1 - 0.05, v1 - 0.05)]);
  if (fascia) K.loop(fascia, rect(u0 - ov, v0 - ov, u1 + ov, v1 + ov), [[0, yE - 0.2], [0, yE]]);
  return yT;
}

// ---------- banded façade (tripartite base / middle / top with grouped multi-pane windows) ----------
// bands: [{y0,y1,mat}] bottom→top; storeys: [{y0,y1,h,sill}] for windows; windows grouped `group` per bay at `pitch`.
// Openings whose sill would be below grade (+0.3 m) are skipped (sloping sites).
export function banded(K, R, s0, s1, bands, storeys, o = {}) {
  const M = K.M; const depth = o.depth ?? 0.35; const pitch = o.pitch ?? 3.6, group = o.group ?? 2, w = o.w ?? 0.9, gap = o.gap ?? 0.28;
  const cs = centres(s0, s1, pitch, { margin: o.margin ?? 0.6 });
  const gAt = (s) => { const p = R.at(s, 0.5); return K.g(p[0], p[1]); };
  const ops = [];
  for (const st of storeys) for (const c of cs) {
    if (o.skip && o.skip(c, st)) continue;
    const gw = group * w + (group - 1) * gap; const y0 = st.y0 + (st.sill ?? o.sill ?? 0.8), y1 = Math.min(st.y1 - 0.3, y0 + (st.h ?? o.h ?? 1.8));
    if (y0 < gAt(c) + 0.35) continue;
    for (let k = 0; k < group; k++) { const a = c - gw / 2 + k * (w + gap); ops.push({ s0: a, s1: a + w, y0, y1, st, c, muntins: st.muntins ?? o.muntins ?? 2, mull: st.mull ?? o.mull ?? 1 }); }
  }
  for (const b of bands) {
    const bo = ops.filter((p) => p.y0 >= b.y0 - 0.01 && p.y1 <= b.y1 + 0.01);
    K.wall(R, b.mat, s0, s1, b.y0, b.y1, bo, depth);
    for (const p of bo) K.fill(R, { ...p, sill: o.sillMat ? undefined : false, sillMat: o.sillMat }, { rev: depth - 0.1, frame: o.frame || M.whitePaint, mull: p.mull, glass: o.glass });
  }
  // dark recessed surrounds behind each window group (proud frame) + belts between bands
  if (o.surround) for (const st of storeys) for (const c of cs) { const g0 = ops.filter((p) => p.c === c && p.st === st); if (!g0.length) continue; const a = Math.min(...g0.map((p) => p.s0)), b = Math.max(...g0.map((p) => p.s1));
    K.rbox(R, o.surround, a - 0.22, g0[0].y0 - 0.25, 0, b + 0.22, g0[0].y0 - 0.05, 0.06, { detail: true }); K.rbox(R, o.surround, a - 0.22, g0[0].y1 + 0.02, 0, b + 0.22, g0[0].y1 + 0.2, 0.06, { detail: true });
    K.rbox(R, o.surround, a - 0.22, g0[0].y0 - 0.25, 0, a - 0.04, g0[0].y1 + 0.2, 0.06, { detail: true }); K.rbox(R, o.surround, b + 0.04, g0[0].y0 - 0.25, 0, b + 0.22, g0[0].y1 + 0.2, 0.06, { detail: true }); }
  if (o.belt) for (let i = 1; i < bands.length; i++) K.rbox(R, o.belt, s0 - 0.05, bands[i].y0 - 0.12, -0.05, s1 + 0.05, bands[i].y0 + 0.14, o.beltOut ?? 0.12);
  return ops;
}
// Eave brackets / rafter tails under an overhang along a run
export function brackets(K, R, mat, s0, s1, yE, { ov = 1.0, pitch = 1.4, h = 0.35, w = 0.14 } = {}) {
  for (let s = s0 + pitch / 2; s < s1; s += pitch) K.rbox(R, mat, s - w / 2, yE - h, 0, s + w / 2, yE - 0.02, ov * 0.92, { detail: true });
}

// ---------- Spanish Colonial Revival (Clark Kerr campus) ----------
// One stucco wing: walls with deep-set multi-pane windows on the listed faces, red barrel-tile gable or hip roof
// with modest overhang and exposed rafter tails. storeys: [{y0,y1}] absolute; windows skipped below grade.
export function spanishWing(K, sp) {
  const M = K.M; const { u0, v0, u1, v1, eave } = sp; const wall = sp.wall || M.stuccoWhite; const frame = sp.frame || M.woodDark;
  const R = rectRuns(K, u0, v0, u1, v1); const yB = K.gMin(u0, v0, u1, v1, 6) - 1.2; const ov = sp.ov ?? 0.5;
  for (const f of (sp.faces ?? 'NSEW')) {
    const Rk = R[f]; const ops = [];
    const pitch = sp.pitch ?? 3.2; const n = Math.max(1, Math.round((Rk.L - 1.2) / pitch));
    for (const st of (sp.storeys || [])) for (let i = 0; i < n; i++) {
      const c = 0.6 + (Rk.L - 1.2) * (i + 0.5) / n; if (sp.skip && sp.skip(f, i, n, st)) continue;
      const w = st.w ?? sp.w ?? 1.1, h = st.h ?? sp.h ?? 1.7, y0 = st.y0 + (st.sill ?? sp.sill ?? 0.9);
      const p = Rk.at(c, 0.5); if (y0 < K.g(p[0], p[1]) + 0.35) continue;
      ops.push({ s0: c - w / 2, s1: c + w / 2, y0, y1: Math.min(st.y1 - 0.3, y0 + h), arch: st.arch, muntins: st.muntins ?? 2, mull: st.mull ?? 1, door: st.door });
    }
    K.wall(Rk, wall, 0, Rk.L, yB, eave, ops, sp.depth ?? 0.45);
    for (const o of ops) K.fill(Rk, { ...o, sill: sp.sill !== false ? undefined : false, sillMat: sp.sillMat || wall }, { rev: (sp.depth ?? 0.45) - 0.12, frame, mull: o.mull, kind: o.door ? 'door' : 'win', door: M.woodDark });
    if (sp.tails !== false) brackets(K, Rk, M.woodDark, 0, Rk.L, eave, { ov, pitch: 0.6, h: 0.18, w: 0.09 });
  }
  if (sp.core !== false) K.box(M.concreteDark, u0 + 0.6, yB, v0 + 0.6, u1 - 0.6, eave - 0.1, v1 - 0.6);
  const tile = sp.tile || M.redTile;
  if (sp.roof === 'hip') K.hip(tile, u0 - ov, v0 - ov, u1 + ov, v1 + ov, eave - 0.02, sp.slope ?? 0.45);
  else if (sp.roof === 'flat') { K.box(wall, u0, eave, v0, u1, eave + 0.6, v1); K.box(sp.cap || M.concreteDark, u0 - 0.05, eave + 0.6, v0 - 0.05, u1 + 0.05, eave + 0.7, v1 + 0.05); }
  else if (sp.roof === 'shed') { const g = polysGeo([[[u0 - ov, eave + sp.rise, v0], [u1 + ov, eave + sp.rise, v0], [u1 + ov, eave - 0.1, v1 + ov], [u0 - ov, eave - 0.1, v1 + ov]]]); K.add(tile, g, { uvMode: 'roof' }); }
  else K.gable(tile, u0, v0, u1, v1, eave, sp.rise ?? 2.5, sp.axis || 'u', { overhang: ov, wallMat: wall, thick: 0.2 });
  return { R, yB };
}
// Single-storey arcade/loggia along run R (columns at `pitch`, `depth` out from the wall), tile shed roof.
export function arcade(K, R, s0, s1, y0, y1, { depth = 3.0, pitch = 3.0, col, beam, tile, r = 0.22, ceiling, square = false, piers = false, pw = 0.6, pierEvery = 0, endPiers = 0 } = {}) {
  const M = K.M; col = col || M.stuccoWhite; beam = beam || col; tile = tile || M.redTile;
  const n = Math.max(1, Math.round((s1 - s0) / pitch));
  if (endPiers) { K.rbox(R, col, s0 - endPiers / 2, y0, depth - 0.75, s0 + endPiers / 2, y1 - 0.3, depth - 0.05); K.rbox(R, col, s1 - endPiers / 2, y0, depth - 0.75, s1 + endPiers / 2, y1 - 0.3, depth - 0.05); }
  for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; if (endPiers && (i === 0 || i === n)) continue; if ((piers && i < n) || (pierEvery && (i % pierEvery === 0 || i === n))) { K.rbox(R, col, s - pw / 2, y0, depth - pw - 0.05, s + pw / 2, y1 - 0.3, depth - 0.05); continue; } if (square && i % 2 === 0) { K.rbox(R, col, s - pw / 2, y0, depth - pw - 0.05, s + pw / 2, y1 - 0.3, depth - 0.05); continue; } const g = new THREE.CylinderGeometry(r * 0.88, r, y1 - y0 - 0.35, 12); g.translate(s, (y0 + y1 - 0.35) / 2, depth - r - 0.05); K.addRun(R, col, g); K.rbox(R, col, s - 0.25, y0, depth - r - 0.3, s + 0.25, y0 + 0.2, depth - r + 0.2); K.rbox(R, col, s - 0.26, y1 - 0.62, depth - r - 0.31, s + 0.26, y1 - 0.45, depth - r + 0.21); K.rbox(R, col, s - r * 1.4, y1 - 0.45, depth - r * 2.5, s + r * 1.4, y1 - 0.3, depth + 0.1); }
  K.rbox(R, beam, s0 - 0.2, y1 - 0.3, depth - 0.45, s1 + 0.2, y1 + 0.15, depth + 0.1);
  const L = depth + 0.5; const g = new THREE.BoxGeometry(s1 - s0 + 0.6, 0.12, Math.hypot(L, 0.9)); g.rotateX(Math.atan2(0.9, L)); g.translate((s0 + s1) / 2, y1 + 0.6, L / 2 - 0.25); K.addRun(R, tile, g, { uvMode: 'roof' });
  if (ceiling) K.rbox(R, ceiling, s0, y1 - 0.12, 0, s1, y1, depth - 0.3);
}
// Clock tower: square stucco shaft, large clock dials below an open post-and-lintel belfry, steep pyramidal tile roof.
export function clockTower(K, u, v, w, yB, yBel, yTop, { wall, tile, trim, dial } = {}) {
  const M = K.M; wall = wall || M.stuccoWhite; tile = tile || M.redTile; trim = trim || M.blackPaint; dial = dial || M.whitePaint;
  const h = w / 2; const yEave = yBel + 2.9; const yClock = yBel - 1.5;
  K.box(wall, u - h, yB, v - h, u + h, yBel, v + h);
  const R = rectRuns(K, u - h, v - h, u + h, v + h);
  for (const f of 'NSEW') {
    const Rk = R[f]; const c = Rk.L / 2;
    const dg = new THREE.CylinderGeometry(1.0, 1.0, 0.08, 32); dg.rotateX(Math.PI / 2); dg.translate(c, yClock, 0.05); K.addRun(Rk, dial, dg);
    const rg = new THREE.TorusGeometry(1.0, 0.06, 5, 32); rg.translate(c, yClock, 0.1); K.addRun(Rk, trim, rg);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; K.rbox(Rk, trim, c + Math.sin(a) * 0.8 - 0.04, yClock + Math.cos(a) * 0.8 - 0.11, 0.09, c + Math.sin(a) * 0.8 + 0.04, yClock + Math.cos(a) * 0.8 + 0.11, 0.12); }
    K.rbox(Rk, trim, c - 0.035, yClock - 0.02, 0.1, c + 0.035, yClock + 0.62, 0.13, { detail: true });
    const hg = new THREE.BoxGeometry(0.5, 0.07, 0.03); hg.rotateZ(-0.6); hg.translate(c + 0.2, yClock - 0.12, 0.12); K.addRun(Rk, trim, hg, { detail: true });
    // belfry: corner piers + 2 intermediate dark posts, sill and lintel bands
    K.rbox(Rk, trim, -0.1, yBel - 0.1, -0.1, Rk.L + 0.1, yBel + 0.3, 0.4);
    K.rbox(Rk, trim, -0.1, yEave - 0.35, -0.1, Rk.L + 0.1, yEave, 0.4);
    for (const sx of [0, Rk.L - 0.5]) K.rbox(Rk, wall, sx, yBel + 0.3, -0.6, sx + 0.5, yEave - 0.35, 0);
    for (const t of [1 / 3, 2 / 3]) K.rbox(Rk, trim, 0.5 + (Rk.L - 1.0) * t - 0.17, yBel + 0.3, -0.75, 0.5 + (Rk.L - 1.0) * t + 0.17, yEave - 0.35, -0.41);
    K.rbox(Rk, trim, -0.15, yB, -0.1, Rk.L + 0.15, yB + 0.6, 0.12);
    if (f === 'S') { K.rbox(Rk, M.woodDark, c - 0.55, yB + 0.6, 0.0, c + 0.55, yB + 2.8, 0.06); K.rbox(Rk, trim, c - 0.7, yB + 2.8, 0.0, c + 0.7, yB + 3.0, 0.12); }
    if (f === 'E' || f === 'W') { K.rbox(Rk, trim, Rk.L - 0.9, yB + 2.0, 0, Rk.L - 0.5, yB + 6.0, 0.03, { detail: true }); for (let q = 0; q < 16; q++) K.rbox(Rk, wall, Rk.L - 0.9, yB + 2.1 + q * 0.25, 0.03, Rk.L - 0.5, yB + 2.16 + q * 0.25, 0.06, { detail: true }); }
  }
  K.box(tint(M, 'whitePaint', '#101112', { roughness: 1.0 }), u - h + 1.3, yBel + 0.2, v - h + 1.3, u + h - 1.3, yEave - 0.3, v + h - 1.3); K.box(tint(M, 'whitePaint', '#3a3a38'), u - h + 0.5, yEave - 0.4, v - h + 0.5, u + h - 0.5, yEave - 0.3, v + h - 0.5);
  const o = 0.75; const yT = K.hip(tile, u - h - o, v - h - o, u + h + o, v + h + o, yEave, (yTop - yEave - 0.9) / (h + o));
  K.prism(trim, rect(u - h - o, v - h - o, u + h + o, v + h + o), yEave - 0.25, yEave, {}, [rect(u - h, v - h, u + h, v + h)]);
  K.cyl(trim, u, yT, v, 0.06, 0.03, 0.9, 6, { detail: true }); K.lathe(trim, [[0.001, 0], [0.12, 0.08], [0.001, 0.2]], u, yT + 0.25, v, 8, { detail: true });
}

// ---------- procedural panel-cladding material (stone / metal / fibre-cement panels with fine joints) ----------
// cols x rows panels per 2 m texture tile (boxUV maps 2 m to one repeat). Cached per key.
export function panelMat(key, { base = '#ddd3c2', joint = '#a59d90', cols = 2, rows = 3, vary = 0.05, jw = 3, roughness = 0.75, metalness = 0, noise = 0.03, span = 2 } = {}) {
  const k = 'panel|' + key; if (_cache.has(k)) return _cache.get(k);
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  const hx = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 }); // sRGB 0..1 (canvas space)
  const b = hx(base), j = hx(joint);
  const img = x.createImageData(N, N); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tones = []; for (let r = 0; r < rows; r++) { tones.push([]); for (let q = 0; q < cols; q++) tones[r].push(1 + (rnd() - 0.5) * 2 * vary); }
  const pw = N / cols, ph = N / rows;
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const q = Math.floor(px / pw), r = Math.floor(py / ph); const fx = px - q * pw, fy = py - r * ph;
    const isJ = fx < jw || fy < jw; const t = tones[r][q] * (1 + (rnd() - 0.5) * noise);
    const col = isJ ? j : b; const i = (py * N + px) * 4;
    img.data[i] = Math.min(255, col.r * 255 * (isJ ? 1 : t)); img.data[i + 1] = Math.min(255, col.g * 255 * (isJ ? 1 : t)); img.data[i + 2] = Math.min(255, col.b * 255 * (isJ ? 1 : t)); img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.repeat.set(2 / span, 2 / span);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness, metalness }); _cache.set(k, m); return m;
}
