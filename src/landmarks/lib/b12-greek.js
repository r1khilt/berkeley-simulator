// b12-greek-extra helpers on top of greek-kit: exposed rafter tails, garden/retaining walls, simple hedges and a
// block-roof sampler. Used from a greekHouse `extra` callback: extra: (api) => { rafters(api, 0, {...}); ... }
import * as THREE from 'three';

// Exposed rafter tails under the eaves of block bi. faces: subset of ['N','S','E','W'] (eave sides; default: the
// eave sides implied by the roof). spacing m, w x h section. Tails run from inside the wall line out to the fascia.
export function rafters(api, bi, { faces, spacing = 0.6, w = 0.08, h = 0.17, mat } = {}) {
  const { K, blocks, beam } = api; const b = blocks[bi]; const r = b.roof; const ov = r.ov ?? 0.6; const m = mat ? api.mat(mat) : api.trimM;
  const hw = (r.axis === 'u' ? b.v1 - b.v0 : b.u1 - b.u0) / 2; const rise = (b.ridgeY ?? b.eave + 2) - b.eave;
  const slope = r.type === 'hip' ? rise / (hw + ov) : rise / hw; const drop = ov * slope;
  const fs = faces || (r.type === 'hip' ? ['N', 'S', 'E', 'W'] : r.axis === 'u' ? ['N', 'S'] : ['E', 'W']);
  const yIn = b.eave - 0.2 - h / 2 - 0.12, yOut = b.eave - drop - 0.2 - h / 2;
  for (const f of fs) {
    const alongU = f === 'N' || f === 'S';
    const a0 = alongU ? b.u0 - ov + 0.15 : b.v0 - ov + 0.15, a1 = alongU ? b.u1 + ov - 0.15 : b.v1 + ov - 0.15;
    const n = Math.max(2, Math.round((a1 - a0) / spacing));
    for (let k = 0; k <= n; k++) {
      const a = a0 + (a1 - a0) * k / n;
      let p0, p1;
      if (f === 'S') { p0 = [a, yIn, b.v1 - 0.1]; p1 = [a, yOut, b.v1 + ov + 0.08]; }
      else if (f === 'N') { p0 = [a, yIn, b.v0 + 0.1]; p1 = [a, yOut, b.v0 - ov - 0.08]; }
      else if (f === 'E') { p0 = [b.u1 - 0.1, yIn, a]; p1 = [b.u1 + ov + 0.08, yOut, a]; }
      else { p0 = [b.u0 + 0.1, yIn, a]; p1 = [b.u0 - ov - 0.08, yOut, a]; }
      beam(m, p0, p1, w, h, { detail: true });
    }
  }
}

// Masonry garden / retaining wall along a polyline in the building frame (u,v), top `h` above local ground, `t` thick,
// with a coping course. Follows the terrain in steps of ~1.5 m.
export function gardenWall(api, pts, { h = 1.0, t = 0.35, mat = ['brick', '#8d4a3a'], cap, seg = 1.5 } = {}) {
  const { K, colliders } = api; const m = api.mat(mat); const cm = cap ? api.mat(cap) : m;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ua, va] = pts[i], [ub, vb] = pts[i + 1]; const L = Math.hypot(ub - ua, vb - va); const n = Math.max(1, Math.round(L / seg));
    for (let k = 0; k < n; k++) {
      const s0 = k / n, s1 = (k + 1) / n; const P0 = [ua + (ub - ua) * s0, va + (vb - va) * s0], P1 = [ua + (ub - ua) * s1, va + (vb - va) * s1];
      const R = K.run(P0, P1); const g = Math.max(K.g(P0[0], P0[1]), K.g(P1[0], P1[1])); const gl = Math.min(K.g(P0[0], P0[1]), K.g(P1[0], P1[1]));
      K.rbox(R, m, -0.01, gl - 0.6, -t / 2, R.L + 0.01, g + h, t / 2);
      K.rbox(R, cm, -0.03, g + h, -t / 2 - 0.05, R.L + 0.03, g + h + 0.1, t / 2 + 0.05);
    }
    colliders.push({ type: 'poly', pts: K.polyXZ([[ua, va], [ub, vb], [ub + 0.01 * (vb - va) / L, vb - 0.01 * (ub - ua) / L], [ua + 0.01 * (vb - va) / L, va - 0.01 * (ub - ua) / L]]), y0: -2, y1: 4 });
  }
}

// Clipped hedge / shrub row along a polyline (box segments, slightly varied heights)
export function hedge(api, pts, { h = 1.2, t = 0.9, color = '#3f5a2c' } = {}) {
  const { K } = api; const m = api.mat(['ivy', color]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ua, va] = pts[i], [ub, vb] = pts[i + 1]; const L = Math.hypot(ub - ua, vb - va); const n = Math.max(1, Math.round(L / 1.2));
    for (let k = 0; k < n; k++) {
      const P0 = [ua + (ub - ua) * k / n, va + (vb - va) * k / n], P1 = [ua + (ub - ua) * (k + 1) / n, va + (vb - va) * (k + 1) / n];
      const R = K.run(P0, P1); const g = Math.min(K.g(P0[0], P0[1]), K.g(P1[0], P1[1])); const hh = h * (0.85 + 0.3 * (((i * 7 + k * 13) % 5) / 5));
      K.rbox(R, m, -0.05, g - 0.3, -t / 2, R.L + 0.05, g + hh, t / 2);
    }
  }
}

// Simple gabled entrance hood over a door on a block face: span s0..s1 along the face, projecting dp, eave at y.
export function hood(api, bi, face, s0, s1, dp, y, { rise = 0.9, mat, roofMat, brackets = true } = {}) {
  const { K, blocks, faceRun, beam } = api; const b = blocks[bi]; const R = faceRun(b, face); const tm = mat ? api.mat(mat) : api.trimM; const rm = roofMat ? api.mat(roofMat) : api.roofM;
  const P = [R.at(s0, 0), R.at(s1, dp)]; const uu = [P[0][0], P[1][0]].sort((a, c) => a - c), vv = [P[0][1], P[1][1]].sort((a, c) => a - c);
  const axisAway = (face === 'S' || face === 'N') ? 'v' : 'u';
  K.gable(rm, uu[0], vv[0], uu[1], vv[1], y, rise, axisAway, { overhang: 0.25, wallMat: tm, thick: 0.12 });
  if (brackets) for (const s of [s0 + 0.1, s1 - 0.1]) { const a = R.at(s, 0), c = R.at(s, dp); beam(tm, [a[0], y - 0.9, a[1]], [c[0], y - 0.05, c[1]], 0.14, 0.14); beam(tm, [a[0], y - 0.12, a[1]], [c[0], y - 0.12, c[1]], 0.16, 0.2); }
}

// Latin capitals for signage (stroke font, unit height) — only the letters the batch needs.
const ell = (cx, cy, rx, ry, a0, a1, n = 12) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
const LAT = {
  A: [0.7, [[[0, 0], [0.35, 1], [0.7, 0]], [[0.16, 0.36], [0.54, 0.36]]]],
  C: [0.62, [ell(0.36, 0.5, 0.36, 0.5, Math.PI * 0.25, Math.PI * 1.75, 14)]],
  I: [0.0, [[[0, 0], [0, 1]]]],
  S: [0.56, [[[0.56, 0.86], [0.42, 1], [0.12, 1], [0, 0.86], [0, 0.62], [0.12, 0.52], [0.44, 0.48], [0.56, 0.38], [0.56, 0.14], [0.44, 0], [0.12, 0], [0, 0.14]]]],
  G: [0.66, [ell(0.36, 0.5, 0.36, 0.5, Math.PI * 0.25, Math.PI * 1.85, 14), [[0.7, 0.32], [0.7, 0.45], [0.42, 0.45]]]],
};
export function latinLetters(K, R, mat, text, s, y, h, { dep = 0.05, d0 = 0, stroke = 0.14, gap = 0.28 } = {}) {
  const chars = [...text].filter((c) => LAT[c]); const t = stroke * h;
  const widths = chars.map((c) => LAT[c][0] * h + t); const total = widths.reduce((a, b) => a + b, 0) + gap * h * (chars.length - 1);
  let x = s - total / 2;
  for (let k = 0; k < chars.length; k++) {
    for (const pl of LAT[chars[k]][1]) for (let i = 0; i < pl.length - 1; i++) {
      const a = [x + t / 2 + pl[i][0] * h, y + t / 2 + pl[i][1] * (h - t)], b = [x + t / 2 + pl[i + 1][0] * h, y + t / 2 + pl[i + 1][1] * (h - t)];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-4) continue;
      const g = new THREE.BoxGeometry(L + t * 0.9, t, dep); g.rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0])); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d0 + dep / 2);
      K.addRun(R, mat, g);
    }
    x += widths[k] + gap * h;
  }
  return total;
}

// Simple metal picket railing along a closed or open polyline (u,v) at height y0, h tall.
export function railing(api, pts, y0, { h = 1.05, mat = ['metal', '#1e1e1e'], step = 0.14, closed = false } = {}) {
  const { K } = api; const m = api.mat(mat); const P = closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i < P.length - 1; i++) {
    const R = K.run(P[i], P[i + 1]); K.rbox(R, m, 0, y0 + h - 0.05, -0.03, R.L, y0 + h, 0.03); K.rbox(R, m, 0, y0 + 0.08, -0.02, R.L, y0 + 0.12, 0.02, { detail: true });
    const n = Math.floor(R.L / step); for (let k = 0; k <= n; k++) { const s = k * R.L / Math.max(1, n); K.rbox(R, m, s - 0.012, y0, -0.012, s + 0.012, y0 + h, 0.012, { detail: true }); }
  }
}
