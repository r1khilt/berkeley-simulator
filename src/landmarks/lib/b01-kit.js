// b01 (Lower Sproul batch) helpers for mid-century / modern campus buildings, built on the classic Kit
// (building frame u,v,y; runs with outward normals; merged per material).
import * as THREE from 'three';
import { polysGeo } from './classic-kit.js';

// ---------- small geometry utils ----------
export function signedArea(poly) { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
// orient so that K.run() normals point outward (negative signed area in (u,v))
export function outwardRing(poly) { return signedArea(poly) > 0 ? poly.slice().reverse() : poly.slice(); }
export function pointInPoly(poly, u, v) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) c = !c; } return c; }
// quad with explicit outward direction (handles winding)
export function quadGeo(P0, P1, P2, P3, out) {
  const a = new THREE.Vector3(...P0), b = new THREE.Vector3(...P1), c = new THREE.Vector3(...P2);
  const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
  const flip = n.dot(new THREE.Vector3(...out)) < 0;
  return flip ? [P3, P2, P1, P0] : [P0, P1, P2, P3];
}
// Ring of tiny vertical quads along a polyline following top(y) and bottom(y) functions
export function ribbon(K, mat, pts, yTop, yBot, out, opts) {
  const polys = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [u0, v0] = pts[i], [u1, v1] = pts[i + 1];
    const t0 = yTop(u0, v0), t1 = yTop(u1, v1), b0 = yBot(u0, v0), b1 = yBot(u1, v1);
    if (t0 == null || t1 == null || t0 <= b0 + 0.01 || t1 <= b1 + 0.01) continue;
    polys.push(quadGeo([u0, b0, v0], [u1, b1, v1], [u1, t1, v1], [u0, t0, v0], out));
  }
  if (polys.length) K.add(mat, polysGeo(polys), opts);
}

// ---------- inverted-pyramid umbrella roof (DeMars & Hardison, 1960) ----------
// strips: [{u0,u1,vN,vS,n?, yTop?, depth?, dip?}] — each strip of square-ish units runs north→south.
// Unit = 6 planar facets: level north/south rims, east/west rims folded down to a V at mid-side (dip), centre low (depth).
function unitTris(q, g = 0) {
  const a0 = q.u0 + g, a1 = q.u1 - g, b0 = q.v0 + g, b1 = q.v1 - g, yT = q.yTop, yM = q.yTop - q.dip, yO = q.yTop - q.depth;
  const NW = [a0, yT, b0], NE = [a1, yT, b0], SE = [a1, yT, b1], SW = [a0, yT, b1], Em = [a1, yM, q.cv], Wm = [a0, yM, q.cv], O = [q.cu, yO, q.cv];
  return [[NW, NE, O], [NE, Em, O], [Em, SE, O], [SE, SW, O], [SW, Wm, O], [Wm, NW, O]]; // first two vertices = outer edge
}
export function umbrellaField(strips, { yTop, depth, dip = 0, gap = 0.1 }) {
  const units = [];
  for (const s of strips) {
    const n = s.n ?? Math.max(1, Math.round((s.vS - s.vN) / 7.35)); const L = (s.vS - s.vN) / n;
    for (let k = 0; k < n; k++) { const v0 = s.vN + k * L, v1 = v0 + L; const q = { u0: s.u0, u1: s.u1, v0, v1, cu: (s.u0 + s.u1) / 2, cv: (v0 + v1) / 2, yTop: s.yTop ?? yTop, depth: s.depth ?? depth, dip: s.dip ?? dip, strip: s }; q.tris = unitTris(q); units.push(q); }
  }
  const find = (u, v) => units.find((q) => u >= q.u0 - 1e-6 && u <= q.u1 + 1e-6 && v >= q.v0 - 1e-6 && v <= q.v1 + 1e-6);
  const hAt = (q, u, v) => {
    for (const [A, B, C] of q.tris) {
      const d = (B[2] - C[2]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[2] - C[2]); if (Math.abs(d) < 1e-9) continue;
      const l1 = ((B[2] - C[2]) * (u - C[0]) + (C[0] - B[0]) * (v - C[2])) / d, l2 = ((C[2] - A[2]) * (u - C[0]) + (A[0] - C[0]) * (v - C[2])) / d, l3 = 1 - l1 - l2;
      if (l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6) return l1 * A[1] + l2 * B[1] + l3 * C[1];
    }
    return q.yTop;
  };
  return { units, find, hAt, gap, top: (u, v) => { const q = find(u, v); return q ? hAt(q, u, v) : null; } };
}
export function buildUmbrellas(K, F, { top, soffit, soffit2 = null, fascia, col, thick = 0.2, thickC = 0.35, colR = 0.25, colBase = null, skipCol = () => false, rimUp = 0, rimW = 0.15, lamp = null, aoSoffit = 0 }) {
  const tp = [], bp = [], bp2 = [], fp = [];
  const area = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[2] - q[0] * p[2]; } return a; };
  for (const q of F.units) {
    let fi = 0;
    for (const tri of unitTris(q, F.gap / 2)) {
      const ew = fi++ % 3 !== 0; // facets 1,2,4,5 are the folded east/west ones
      const up = area(tri) > 0 ? tri.slice().reverse() : tri; // negative (u,v) area => normal up
      tp.push(up.map((p) => [p[0], p[1] + 0.0, p[2]]));
      const dn = up.slice().reverse().map((p, j) => [p[0], p[1] - (p === tri[2] ? thickC : thick), p[2]]);
      (ew && soffit2 ? bp2 : bp).push(dn);
      const [A, B, O] = tri; const out = [(A[0] + B[0]) / 2 - O[0], 0, (A[2] + B[2]) / 2 - O[2]];
      const ru = rimUp || 0.02;
      fp.push(quadGeo([A[0], A[1] - thick, A[2]], [B[0], B[1] - thick, B[2]], [B[0], B[1] + ru, B[2]], [A[0], A[1] + ru, A[2]], out));
      if (rimUp) { // upturned rim: top + inner face, inset rimW toward the centre
        const L = Math.hypot(out[0], out[2]); const ix = -out[0] / L * rimW, iz = -out[2] / L * rimW;
        const A2 = [A[0] + ix, A[1], A[2] + iz], B2 = [B[0] + ix, B[1], B[2] + iz];
        fp.push(quadGeo([A[0], A[1] + ru, A[2]], [B[0], B[1] + ru, B[2]], [B2[0], B2[1] + ru, B2[2]], [A2[0], A2[1] + ru, A2[2]], [0, 1, 0]));
        fp.push(quadGeo([A2[0], A2[1] - 0.01, A2[2]], [B2[0], B2[1] - 0.01, B2[2]], [B2[0], B2[1] + ru, B2[2]], [A2[0], A2[1] + ru, A2[2]], [-out[0], 0, -out[2]]));
      }
    }
    if (col && colBase && !skipCol(q)) {
      const y0 = colBase(q.cu, q.cv); const ycc = q.yTop - q.depth - thickC;
      if (y0 != null && ycc - y0 > 0.8) {
        K.cyl(col, q.cu, y0 - 0.4, q.cv, colR, colR, ycc - y0 + 0.45, 14);
        K.cyl(col, q.cu, ycc - 0.18, q.cv, colR, colR * 1.35, 0.2, 14); // small collar at the soffit
        if (lamp) { K.lathe(lamp, [[0.001, -0.17], [0.14, -0.12], [0.17, 0], [0.14, 0.12], [0.001, 0.17]], q.cu + colR + 0.18, y0 + 3.0, q.cv, 10, { detail: true }); K.box(col, q.cu + colR - 0.02, y0 + 2.97, q.cv - 0.03, q.cu + colR + 0.1, y0 + 3.03, q.cv + 0.03, { detail: true }); }
      }
    }
  }
  K.add(top, polysGeo(tp), { uvMode: 'roof' }); K.add(fascia, polysGeo(fp));
  if (!aoSoffit) { K.add(soffit, polysGeo(bp), { uvMode: 'box' }); if (bp2.length) K.add(soffit2, polysGeo(bp2), { uvMode: 'box' }); return; }
  // [r5-sproul] the soffits are the umbrellas' readable face from the plaza, but under one ambient term every facet came out
  // the same flat grey ("reads as flat slabs"). Bake the photo look into vertex colours: bright where bounce light reaches
  // the rim, darkening toward the column head by `aoSoffit`, and the folded east/west facets a shade darker so the creases
  // from the column to the edge mid-points read.
  for (const [list, mat, k] of [[bp, soffit, 1.0], [bp2, soffit2 || soffit, 0.95]]) {
    if (!list.length) continue;
    const g = polysGeo(list); const p = g.attributes.position; const c = new Float32Array(p.count * 3);
    let yMin = Infinity, yMax = -Infinity; for (let i = 0; i < p.count; i++) { yMin = Math.min(yMin, p.getY(i)); yMax = Math.max(yMax, p.getY(i)); }
    for (let i = 0; i < p.count; i += 3) { // per triangle: the lowest vertex is the column head
      let lo = i; for (let j = 1; j < 3; j++) if (p.getY(i + j) < p.getY(lo)) lo = i + j;
      for (let j = 0; j < 3; j++) { const v = (i + j === lo ? 1 - aoSoffit : 1) * k; c[(i + j) * 3] = c[(i + j) * 3 + 1] = c[(i + j) * 3 + 2] = v; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const mesh = new THREE.Mesh(K.boxUV(g.index ? g.toNonIndexed() : g), Object.assign(mat.clone(), { vertexColors: true }));
    if (mat.onBeforeCompile) { mesh.material.onBeforeCompile = mat.onBeforeCompile; mesh.material.customProgramCacheKey = mat.customProgramCacheKey; }
    mesh.castShadow = mesh.receiveShadow = true; mesh.name = 'umbrella-soffit'; K.extra.push(mesh);
  }
}
// clerestory glass band from yBot up to the umbrella soffit along a wall polyline (closed ring, outward oriented)
export function clerestory(K, F, ring, yBot, glass, frame, { thick = 0.2, step = 0.5, mullion = 1.5, inset = 0.12, cap = Infinity, skip = () => false } = {}) {
  const R = outwardRing(ring);
  for (let i = 0; i < R.length; i++) {
    const a = R[i], b = R[(i + 1) % R.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
    const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-t[1], t[0]];
    if (skip(a, b, n)) continue;
    const pts = []; const N = Math.max(1, Math.ceil(L / step));
    for (let k = 0; k <= N; k++) { const s = L * k / N; pts.push([a[0] + t[0] * s - n[0] * inset, a[1] + t[1] * s - n[1] * inset]); }
    const yT = (u, v) => { const h = F.top(u, v); return h == null ? null : Math.min(cap, h - thick - 0.03); };
    ribbon(K, glass, pts, yT, () => yBot, [n[0], 0, n[1]]);
    // mullions
    const nm = Math.max(1, Math.round(L / mullion));
    for (let k = 1; k < nm; k++) { const s = L * k / nm; const u = a[0] + t[0] * s, v = a[1] + t[1] * s; const h = yT(u, v); if (h == null || h < yBot + 0.2) continue; const g = new THREE.BoxGeometry(0.07, h - yBot, 0.08); g.rotateY(-Math.atan2(t[1], t[0])); g.translate(u - n[0] * (inset - 0.04), (h + yBot) / 2, v - n[1] * (inset - 0.04)); K.add(frame, g, { detail: true }); }
  }
}

// ---------- façade bands on a run (R from K.run, outward normal) ----------
// Curtain wall / storefront: glass plane recessed `rec`, mullions every `pitch`, transoms at abs heights
export function glassBand(K, R, s0, s1, y0, y1, { glass, frame, pitch = 1.5, transoms = [], rec = 0.15, mw = 0.08, md = 0.12, sill = true, doors = [] } = {}) {
  K.rbox(R, glass, s0, y0, -rec - 0.02, s1, y1, -rec);
  const n = Math.max(1, Math.round((s1 - s0) / pitch));
  for (let k = 0; k <= n; k++) { const s = s0 + (s1 - s0) * k / n; K.rbox(R, frame, s - mw / 2, y0, -rec, s + mw / 2, y1, -rec + md, { detail: k > 0 && k < n }); }
  for (const ty of transoms) K.rbox(R, frame, s0, ty - mw / 2, -rec, s1, ty + mw / 2, -rec + md, { detail: true });
  if (sill) K.rbox(R, frame, s0, y0, -rec, s1, y0 + 0.1, -rec + md);
  K.rbox(R, frame, s0, y1 - 0.1, -rec, s1, y1, -rec + md);
  for (const d of doors) { // dark door leaves with push bars
    K.rbox(R, frame, d.s0, y0, -rec + 0.01, d.s1, y0 + d.h, -rec + 0.06);
    K.rbox(R, glass, d.s0 + 0.1, y0 + 0.12, -rec + 0.06, d.s1 - 0.1, y0 + d.h - 0.1, -rec + 0.07);
    K.rbox(R, frame, (d.s0 + d.s1) / 2 - 0.03, y0, -rec + 0.06, (d.s0 + d.s1) / 2 + 0.03, y0 + d.h, -rec + 0.08, { detail: true });
  }
}
// Precast panel band with a checkerboard of vertical slot windows (real holes) and a dark backing behind
export function slotBand(K, R, s0, s1, y0, y1, { mat, back, slotW = 0.2, slotH = 0.8, pitch = 1.0, row = 1.05, depth = 0.25, joint = 2.4, jointMat = null, margin = 0.35 } = {}) {
  const ops = []; const nr = Math.max(1, Math.floor((y1 - y0 - margin) / row));
  const yy0 = y0 + (y1 - y0 - nr * row) / 2 + (row - slotH) / 2;
  for (let r = 0; r < nr; r++) {
    const off = (r % 2) * pitch / 2; const ys = yy0 + r * row;
    for (let s = s0 + margin + off + pitch / 2; s < s1 - margin - slotW; s += pitch) ops.push({ s0: s - slotW / 2, s1: s + slotW / 2, y0: ys, y1: ys + slotH });
  }
  K.wall(R, mat, s0, s1, y0, y1, ops, depth);
  K.rbox(R, back, s0, y0, -depth - 0.06, s1, y1, -depth);
  if (joint && jointMat) { const nj = Math.round((s1 - s0) / joint); for (let k = 1; k < nj; k++) { const s = s0 + (s1 - s0) * k / nj; K.rbox(R, jointMat, s - 0.015, y0, -0.01, s + 0.015, y1, 0.005, { detail: true }); } }
}
// Pipe railing along a polyline (building frame), posts every `pitch`
export function pipeRail(K, mat, pts, y, { h = 1.07, pitch = 1.8, r = 0.025, mid = true } = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [u0, v0] = pts[i], [u1, v1] = pts[i + 1]; const L = Math.hypot(u1 - u0, v1 - v0); if (L < 0.05) continue;
    const ang = Math.atan2(v1 - v0, u1 - u0);
    const yA = typeof y === 'function' ? y(u0, v0) : y, yB = typeof y === 'function' ? y(u1, v1) : y;
    for (const hh of mid ? [h, h * 0.5] : [h]) {
      const g = new THREE.CylinderGeometry(r, r, Math.hypot(L, yB - yA), 6); g.rotateZ(Math.PI / 2); g.rotateZ(Math.atan2(yB - yA, L)); g.rotateY(-ang);
      g.translate((u0 + u1) / 2, (yA + yB) / 2 + hh, (v0 + v1) / 2); K.add(mat, g, { detail: true });
    }
    const n = Math.max(1, Math.round(L / pitch));
    for (let k = 0; k <= n; k++) { if (k === n && i < pts.length - 2) continue; const t = k / n; const yy = yA + (yB - yA) * t; K.cyl(mat, u0 + (u1 - u0) * t, yy, v0 + (v1 - v0) * t, r * 1.2, r * 1.2, h, 6, { detail: true }); }
  }
}
// Café umbrella (market parasol)
export function parasol(K, canvas, pole, u, y, v, { r = 1.4, h = 2.4 } = {}) {
  K.cyl(pole, u, y, v, 0.03, 0.03, h, 6, { detail: true });
  K.lathe(canvas, [[0.03, 0], [r, -0.38], [r * 0.98, -0.42], [0.001, -0.05]].map(([a, b]) => [a, b + 0.42]), u, y + h - 0.35, v, 8, { detail: true });
}
// target-colour tint for textured shared materials (texture averages: concrete ~190,187,180; plain ~226; stucco ~221,209,184)
export const TEXAVG = { concrete: [190, 187, 180], plain: [226, 226, 226], stucco: [221, 209, 184], wood: [200, 170, 130] };
export function tone(base, targetHex, avg = TEXAVG.concrete, extra) { const c = new THREE.Color(targetHex); const r = [c.r, c.g, c.b].map((x, i) => Math.min(1, (Math.pow(x, 1 / 2.2) * 255) / avg[i])); const col = new THREE.Color().setRGB(Math.pow(r[0], 2.2), Math.pow(r[1], 2.2), Math.pow(r[2], 2.2)); return tinted(base, col.getHex(), extra); }
// local material helper: clone a shared material with a tint
export function tinted(base, hex, extra = {}) { const m = base.clone(); m.color = new THREE.Color(hex); Object.assign(m, extra); if (base.onBeforeCompile) { m.onBeforeCompile = base.onBeforeCompile; m.customProgramCacheKey = base.customProgramCacheKey; } return m; }
