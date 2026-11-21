// Haas School of Business — Student Services Building (Moore Ruble Yudell with Charles Moore, 1995): the long south range
// of the Haas complex, stepping up the hillside from Cheit Hall to Piedmont Avenue along O'Donnell Courtyard.
// Courtyard (north) front: a ground-floor loggia of square stucco piers with glazed storefronts behind and a light steel
// pergola, under two upper storeys of grey-taupe horizontal siding with tall paired teal-framed windows between
// projecting pier strips. Elsewhere sand-beige stucco with a cast-stone base and belt course. Dark slate hipped roofs on
// bracketed eaves with a copper-brown fascia, broad shed dormers, a louvred lantern at mid-roof and a tower at the east end.
// Massing from the 2021 LiDAR (frame -3.7°): west range eaves ~14.5 / ridge ~21 m, centre ~17 / 23 m (lantern ~27 m),
// east range ~16.5 / 20 m, lower flat-roofed strips on the south ~16.5 m; the site rises ~8 m to the east.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { hipRoof } from './lib/b05b-kit.js';
import { haasMats, loggia, discLamp } from './lib/reastc-haas.js';

export const info = {
  id: 'student-services-building',
  name: 'Haas Student Services Building',
  subtitle: 'Haas School of Business · Moore Ruble Yudell · 1995',
  blurb: 'Part of the Haas School of Business complex designed by Charles Moore with Moore Ruble Yudell, arranged around a hillside courtyard at the east edge of campus.',
  replaces: ['w/32224838'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-3.7);
  const K = new Kit(ctx, ANG); const M = ctx.M; const X = haasMats(M); const g = (u, v) => K.g(u, v);
  const colliders = [], walkables = [];
  const GF = 4.2, FH = 3.6; // ground storey (loggia) height, upper floor-to-floor
  // façade on run R: stepped per ~bay along the slope. opts: {loggia, siding, eave}
  function face(R, eave, { lg = false, siding = false, bay = 3.9 } = {}) {
    const L = R.L; const nb = Math.max(1, Math.round(L / bay)); const bw = L / nb;
    const gAt = (s) => { const p = R.at(Math.min(L, Math.max(0, s)), 1.0); return g(p[0], p[1]); };
    let gMin = Infinity; for (let k = 0; k <= nb * 2; k++) gMin = Math.min(gMin, gAt(L * k / (nb * 2)));
    const yB = gMin - 1.2;
    const up = siding ? X.siding : X.stucco;
    // per-bay floor levels (stepping with the grade); upper wall carries the windows
    const ops = []; const gb = [];
    for (let i = 0; i < nb; i++) { const c = bw * (i + 0.5); const gl = Math.min(gAt(bw * i + 0.3), gAt(c), gAt(bw * (i + 1) - 0.3)); gb.push(gl);
      for (let fy = gl + GF; fy + 2.6 <= eave - 0.7; fy += FH) for (const d of [-0.5, 0.5]) ops.push({ s0: c + d - 0.42, s1: c + d + 0.42, y0: fy + 0.55, y1: Math.min(fy + 2.95, eave - 0.9), mull: 0, muntins: 3, frame: X.teal, sillMat: X.cast }); }
    // ground storey: loggia bays, or tall windows / glazed doors punched into the stucco wall
    const gTop = Math.max(...gb) + GF;
    const yU = lg ? Math.min(...gb) + GF : yB;               // upper wall starts above the loggia
    const gops = [];
    if (!lg) for (let i = 0; i < nb; i++) { const c = bw * (i + 0.5), gl = gb[i]; if (c - 1.1 < 0.3 || c + 1.1 > L - 0.3) continue;
      gops.push(i % 3 === 1 && L > 12 ? { s0: c - 1.0, s1: c + 1.0, y0: gl + 0.12, y1: gl + 3.0, kind: 'door', doorTop: gl + 2.55, door: M.windowNight, sill: false } : { s0: c - 0.95, s1: c + 0.95, y0: gl + 0.8, y1: gl + 3.3, mull: 1, muntins: 3, sillMat: X.cast }); }
    const opsU = ops.filter((o) => o.y0 > yU + 0.2 && o.s0 > 0.1 && o.s1 < L - 0.1 && !gops.some((q) => q.s1 > o.s0 && q.s0 < o.s1 && q.y1 + 0.3 > o.y0));
    if (!lg && gb.length) { // lower stucco band carries the ground openings; siding/stucco above
      const yG = Math.min(...gb) + GF; const lowOps = gops.filter((o) => o.y1 < yG - 0.1);
      K.wall(R, X.stucco, 0, L, yB, yG, lowOps, 0.42); for (const o of lowOps) K.fill(R, o, { kind: o.kind || 'win', rev: 0.3, frame: X.teal, mull: o.mull ?? 1, door: o.door });
      const hiOps = [...opsU.filter((o) => o.y0 > yG + 0.15), ...gops.filter((o) => o.y0 > yG + 0.15)];
      K.wall(R, up, 0, L, yG, eave, hiOps, 0.42); for (const o of hiOps) K.fill(R, o, { kind: o.kind || 'win', rev: 0.3, frame: X.teal, mull: o.mull ?? 0, door: o.door });
      for (const o of gops.filter((q) => q.y0 < yG && q.y1 > yG - 0.1)) { /* straddling: skip (rare on steep runs) */ void o; }
      K.rbox(R, X.cast, -0.05, yG - 0.2, 0, L + 0.05, yG + 0.1, 0.12);
    } else {
      K.wall(R, up, 0, L, Math.min(yU, gTop), eave, opsU, 0.42);
      for (const o of opsU) K.fill(R, o, { rev: 0.3, frame: X.teal, mull: 0 });
    }
    if (lg) {
      for (let i = 0; i < nb; i++) { const s0 = bw * i, s1 = bw * (i + 1); const gl = gb[i];
        loggia(K, R, s0, s1, gl + 0.1, Math.max(3.4, yU - gl - 0.55), { X, pitch: bw, rec: 2.3, pier: 0.75, pd: 1.6, yBase: yB });
        if (yU - gl - 0.1 < GF - 0.1) K.rbox(R, X.stucco, s0, yU - 0.1, -2.3, s1, gl + GF, 0.02); }
      K.rbox(R, X.stucco, 0, yB, -2.9, L, Math.min(...gb) + 0.1, -2.3);
    }
    // pier strips between the window pairs (full height above the base), cast belt + frieze, brackets, fascia
    for (let i = 0; i <= nb; i++) { const s = Math.min(L - 0.3, Math.max(0.3, bw * i)); K.rbox(R, X.stucco, s - 0.3, lg ? yU : yB, 0, s + 0.3, eave - 0.5, 0.36); }
    K.rbox(R, X.cast, -0.05, eave - 0.55, 0, L + 0.05, eave - 0.25, 0.42);
    const nbr = Math.max(2, Math.round(L / 1.5)); for (let i = 0; i <= nbr; i++) { const s = 0.25 + (L - 0.5) * i / nbr; K.rbox(R, X.cast, s - 0.08, eave - 0.85, 0.42, s + 0.08, eave - 0.1, 0.85, { detail: true }); }
    if (!lg) K.rbox(R, X.cast, -0.05, yB, 0, L + 0.05, gMin + 0.6, 0.08);
    return { gMin, gb, nb, bw, yU };
  }
  // block: faces listed get the Haas façade; courtyard faces get the loggia + siding
  function block(u0, v0, u1, v1, eave, { faces = 'NSEW', court = '', slope = 0.55, roof = 'hip', ov = 0.85, yTop } = {}) {
    const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
    const gm = K.gMin(u0, v0, u1, v1, 6);
    for (const f of faces) { const R = K.run(...defs[f]); const lg = court.includes(f);
      face(R, eave, { lg, siding: lg });
    }
    K.box(M.concreteDark, u0 + 0.5, gm - 1.2, v0 + 0.5, u1 - 0.5, eave - 0.05, v1 - 0.5);
    if (roof === 'hip') { const top = hipRoof(K, X.roof, u0, v0, u1, v1, eave + 0.05, slope, ov, { soffit: X.cast, yTop: yTop ?? Infinity });
      K.loop(X.fascia, [[u0 - ov, v1 + ov], [u1 + ov, v1 + ov], [u1 + ov, v0 - ov], [u0 - ov, v0 - ov]], [[0.02, eave + 0.05 - ov * slope - 0.3], [0.02, eave + 0.05 - ov * slope + 0.02]]); void top; }
    else if (roof === 'flat') { K.box(M.concreteDark, u0 + 0.2, eave - 0.3, v0 + 0.2, u1 - 0.2, eave, v1 - 0.2); K.loop(X.cast, [[u0, v1], [u1, v1], [u1, v0], [u0, v0]], [[0.08, eave - 0.2], [0.08, eave + 0.7], [-0.3, eave + 0.7], [-0.3, eave + 0.5]]); }
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], gm - 1.2, eave + 5));
  }
  // broad shed dormer on the north (courtyard) slope of a hip roof
  function dormer(u, w, vEave, eave, slope, side = -1) {
    const d = 2.6; const vIn = vEave - side * d; const yb = eave + d * slope; const h = 1.9;
    const v0 = Math.min(vEave - side * 0.6, vIn), v1 = Math.max(vEave - side * 0.6, vIn);
    K.box(X.siding, u - w / 2, eave + 0.3, v0, u + w / 2, yb + h - 0.4, v1);
    const Rf = side < 0 ? K.run([u + w / 2, vEave - side * 0.6], [u - w / 2, vEave - side * 0.6], 0.01) : K.run([u - w / 2, vEave - side * 0.6], [u + w / 2, vEave - side * 0.6], 0.01);
    const n = Math.max(2, Math.round(w / 1.0)); const ops = []; for (let i = 0; i < n; i++) ops.push({ s0: 0.3 + (w - 0.6) * i / n + 0.05, s1: 0.3 + (w - 0.6) * (i + 1) / n - 0.05, y0: eave + 0.8, y1: yb + h - 0.75, muntins: 2, sill: false });
    K.wall(Rf, X.siding, 0, w, eave + 0.3, yb + h - 0.4, ops, 0.2); for (const o of ops) K.fill(Rf, o, { rev: 0.12, frame: X.teal, mull: 0 });
    K.box(X.roof, u - w / 2 - 0.3, yb + h - 0.4, v0 - 0.35, u + w / 2 + 0.3, yb + h - 0.22, v1 + 0.2);
    K.box(X.fascia, u - w / 2 - 0.3, yb + h - 0.5, side < 0 ? v0 - 0.37 : v1 + 0.2, u + w / 2 + 0.3, yb + h - 0.22, side < 0 ? v0 - 0.3 : v1 + 0.27);
  }

  // west range (hip end toward Cheit Hall)
  block(-43.0, -16.6, -21.0, 6.1, 14.5, { faces: 'NWS', court: 'N', slope: 0.6 });
  // centre range along the courtyard: two parts (the east part's courtyard wall is set back 2.7 m), one roof
  block(-21.0, -12.9, 6.2, 9.6, 17.0, { faces: 'N', court: 'N', slope: 0.55, roof: 'none' });
  block(6.2, -10.2, 26.7, 9.6, 17.0, { faces: 'N', court: 'N', slope: 0.55, roof: 'none' });
  { const ov = 0.85, slope = 0.55, eave = 17.0, u0 = -21.0, v0 = -12.9, u1 = 26.7, v1 = 9.6;
    hipRoof(K, X.roof, u0, v0, u1, v1, eave + 0.05, slope, ov, { soffit: X.cast });
    K.loop(X.fascia, [[u0 - ov, v1 + ov], [u1 + ov, v1 + ov], [u1 + ov, v0 - ov], [u0 - ov, v0 - ov]], [[0.02, eave + 0.05 - ov * slope - 0.3], [0.02, eave + 0.05 - ov * slope + 0.02]]);
    for (const u of [-15.5, -6.0, 11.0, 20.0]) dormer(u, 4.6, u < 6.2 ? -12.9 : -10.2, eave, slope, -1);
    // louvred lantern at mid-roof (LiDAR ~27 m)
    const lu = -6.8, lv = -0.8; K.box(X.stucco, lu - 2.2, 21.0, lv - 2.2, lu + 2.2, 25.2, lv + 2.2);
    for (const [a, b] of [[[lu - 2.2, lv + 2.2], [lu + 2.2, lv + 2.2]], [[lu + 2.2, lv + 2.2], [lu + 2.2, lv - 2.2]], [[lu + 2.2, lv - 2.2], [lu - 2.2, lv - 2.2]], [[lu - 2.2, lv - 2.2], [lu - 2.2, lv + 2.2]]]) {
      const R = K.run(a, b); for (let k = 0; k < 6; k++) K.rbox(R, X.teal, 0.5, 22.6 + k * 0.38, 0, 3.9, 22.7 + k * 0.38, 0.12, { detail: true }); K.rbox(R, M.concreteDark, 0.5, 22.4, -0.3, 3.9, 24.9, -0.02); }
    K.box(X.cast, lu - 2.45, 25.2, lv - 2.45, lu + 2.45, 25.45, lv + 2.45); K.hip(X.roof, lu - 2.6, lv - 2.6, lu + 2.6, lv + 2.6, 25.45, 0.75);
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, eave + 5)); }
  // centre range: south face (stucco, punched)
  { const R = K.run([-3.5, 9.6], [11.7, 9.6]); face(R, 17.0); }
  // lower flat-roofed strips on the south side
  block(-21.4, 9.6, -3.5, 13.1, 16.4, { faces: 'SEW', roof: 'flat' });
  block(11.7, 9.6, 26.7, 14.5, 17.0, { faces: 'SW', roof: 'flat' });
  // east range up to Piedmont Avenue
  block(26.7, -1.9, 50.7, 14.4, 16.5, { faces: 'NSE', court: 'N', slope: 0.45 });
  // east tower (LiDAR ~29 m) at the Piedmont end
  { const a0 = 46.6, b0 = -1.4, a1 = 50.7, b1 = 3.6; const gy = g(48.6, 1.0) - 1.2;
    K.box(X.stucco, a0, gy, b0, a1, 26.0, b1); K.box(X.cast, a0 - 0.2, 25.6, b0 - 0.2, a1 + 0.2, 26.0, b1 + 0.2); K.hip(X.roof, a0 - 0.5, b0 - 0.5, a1 + 0.5, b1 + 0.5, 26.0, 1.4);
    for (const [p, q] of [[[a0, b1], [a1, b1]], [[a1, b1], [a1, b0]], [[a1, b0], [a0, b0]], [[a0, b0], [a0, b1]]]) { const R = K.run(p, q, 0.01); const o = { s0: R.L / 2 - 0.8, s1: R.L / 2 + 0.8, y0: 21.6, y1: 25.0, muntins: 4, sill: false }; K.wall(R, X.stucco, 0.2, R.L - 0.2, 21.2, 25.4, [o], 0.2); K.fill(R, o, { rev: 0.12, frame: X.teal, mull: 1 }); } }
  // courtyard lighting
  for (const [u, v] of [[-12, -17.5], [4, -17.0], [20, -14.5]]) discLamp(K, u, g(u, v), v, 6.0, X);
  const object3d = K.finish();
  object3d.name = 'student-services-building';
  return { object3d, colliders, walkables };
}
