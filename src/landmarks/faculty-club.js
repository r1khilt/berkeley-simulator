// The Faculty Club (Bernard Maybeck, 1902; additions by John Galen Howard and others through the 1920s).
// A long, rambling Mission/Arts-and-Crafts clubhouse beside Faculty Glade: cream stucco walls under low red barrel-tile
// roofs, Maybeck's Great Hall rising as a steep cross-gable, a dark redwood half-timbered upper storey on brackets over
// the west wing, a continuous ribbon of small casements under the eaves of the east range, round-arched doorways and a big
// teal-muntined arched window, teal ground-floor window frames and stepped stucco garden walls toward the glade.
// Massing follows the 2021 LiDAR (frame rotated -25.5° to the OSM outline).
import * as THREE from 'three';
import { Kit, deg, mats, openWall, hipRoof, gableEnd, polysGeo, lamp, shingleMat } from './lib/b05b-kit.js';

export const info = {
  id: 'faculty-club',
  name: 'The Faculty Club',
  subtitle: 'Bernard Maybeck · 1902',
  blurb: 'Bernard Maybeck designed the original clubhouse, with its timber-trussed Great Hall, in 1902; the club has grown in stages since, a cream stucco and red-tile cluster tucked among the trees of Faculty Glade by Strawberry Creek.',
  replaces: ['w/24025448'],
};

export async function build(ctx) {
  const K = new Kit(ctx, deg(-25.5)); const M = ctx.M; const X = mats(M);
  const ST = M.stucco, TILE = M.redTile, TIM = X.redwoodDark;
  const TEAL = new THREE.MeshStandardMaterial({ color: 0x4f8c7e, roughness: 0.6 });
  // r5-east: Maybeck's Great Hall is all dark redwood shingle under a dark shingle roof (photos from the glade), not stucco + tile
  const SHG = shingleMat(0x4f3b2d), SHROOF = X.cedarRoof.clone(); SHROOF.color = new THREE.Color(0x4a4038);
  const colliders = [];
  const g0 = K.gMin(-41, -33, 24, 32);
  // windows helpers
  const casement = (s, y0, w = 0.9, h = 1.2, frame = TIM) => ({ s0: s - w / 2, s1: s + w / 2, y0, y1: y0 + h, mull: 1, muntins: 2, frame, fw: 0.08 });
  const french = (s, y0, w = 1.2, h = 2.4) => ({ s0: s - w / 2, s1: s + w / 2, y0, y1: y0 + h, mull: 2, muntins: 3, frame: TEAL, fw: 0.08 });
  // generic stucco range: rectangle in frame, walls with per-face window lists, roof
  function range(sp) {
    const { u0, u1, v0, v1, eave } = sp; const gm = K.gMin(u0, v0, u1, v1); const base = gm - 1.0;
    const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
    const runs = {};
    for (const f of ['S', 'E', 'N', 'W']) {
      const fo = sp.faces?.[f]; if (fo === false) continue;
      const R = K.run(defs[f][0], defs[f][1]); runs[f] = R;
      let gs = Infinity; for (let k = 0; k <= 6; k++) { const p = R.at(R.L * k / 6, 1); gs = Math.min(gs, ctx.groundAt(p[0], p[1])); }
      const fl = sp.floor ?? gs + 0.45;
      let ops = fo?.ops ? fo.ops(R.L, fl) : [];
      if (!fo?.ops) { const n = Math.max(1, Math.round(R.L / 3.6)); for (let i = 0; i < n; i++) { const c = R.L * (i + 0.5) / n; ops.push(french(c, fl + 0.2, 1.1, 2.2)); if (eave - fl > 5) ops.push(casement(c, fl + 3.9, 1.0, 1.3)); } }
      openWall(K, R, sp.wallMat || ST, 0, R.L, base, eave, ops, { depth: 0.4, rev: 0.22, sill: true, sillMat: sp.wallMat ? TIM : ST }); // r5-east: wallMat
      K.rbox(R, M.concreteDark, -0.04, base, 0, R.L + 0.04, fl - 0.1, 0.06); // darker stucco base
      if (fo?.extra) fo.extra(R, fl);
    }
    K.box(M.concreteDark, u0 + 0.45, base, v0 + 0.45, u1 - 0.45, eave, v1 - 0.45);
    const r = sp.roof;
    const RM = sp.roofMat || TILE, GM = sp.wallMat || ST, VG = r.verge ?? 0.5; // r5-east: roof/gable materials, verge overhang
    if (r.type === 'hip') hipRoof(K, RM, u0, v0, u1, v1, eave, r.slope ?? 0.42, r.ov ?? 0.7, { soffit: TIM });
    else { // gable with dark rafter tails; gable end walls in stucco
      const ov = r.ov ?? 0.9;
      K.gable(RM, u0 - (r.axis === 'u' ? VG : 0), v0 - (r.axis === 'v' ? VG : 0), u1 + (r.axis === 'u' ? VG : 0), v1 + (r.axis === 'v' ? VG : 0), eave, r.rise, r.axis, { overhang: ov, thick: 0.2 });
      if (r.axis === 'u') { for (const [a, b] of [[[u0, v0], [u0, v1]], [[u1, v1], [u1, v0]]]) gableEnd(K, K.run(a, b), GM, eave, r.rise, 0.4, r.gableWin ? [{ s0: (v1 - v0) / 2 - 0.5, s1: (v1 - v0) / 2 + 0.5, y0: eave + 0.6, y1: eave + 1.6, mull: 1, frame: TIM }] : []); }
      else { for (const [a, b] of [[[u0, v1], [u1, v1]], [[u1, v0], [u0, v0]]]) gableEnd(K, K.run(a, b), GM, eave, r.rise, 0.4, r.gableWin ? [{ s0: (u1 - u0) / 2 - 0.5, s1: (u1 - u0) / 2 + 0.5, y0: eave + 0.6, y1: eave + 1.6, mull: 1, frame: TIM }] : []); }
      // rafter tails along the eaves
      const along = r.axis === 'u' ? [u0, u1] : [v0, v1]; const n = Math.round((along[1] - along[0]) / 0.9);
      for (let i = 0; i <= n; i++) { const a = along[0] + (along[1] - along[0]) * i / n; for (const sd of [-1, 1]) {
        if (r.axis === 'u') { const v = sd < 0 ? v0 : v1; K.box(TIM, a - 0.06, eave - 0.3, Math.min(v, v + sd * ov), a + 0.06, eave - 0.12, Math.max(v, v + sd * ov), { detail: true }); }
        else { const u = sd < 0 ? u0 : u1; K.box(TIM, Math.min(u, u + sd * ov), eave - 0.3, a - 0.06, Math.max(u, u + sd * ov), eave - 0.12, a + 0.06, { detail: true }); } } }
    }
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], base, eave + 3));
    return runs;
  }

  // ===== A. west wing (Maybeck's original range) with the jettied half-timbered upper storey on its glade side =====
  const wFl = K.gMin(-40.3, -7.3, -12, 4.6) + 0.45;
  range({ u0: -40.3, u1: -21.0, v0: -7.3, v1: 4.6, eave: 6.7, floor: wFl, roof: { type: 'gable', axis: 'u', rise: 2.9, ov: 1.0 },
    faces: { E: false, S: { ops: (L, fl) => [0.2, 0.42, 0.64, 0.86].map((t) => french(L * t, fl + 0.15, 1.2, 2.4)), extra: (R, fl) => timberBand(R, fl) },
      W: { ops: (L, fl) => [{ s0: L / 2 - 1.5, s1: L / 2 + 1.5, y0: fl + 0.6, y1: fl + 2.6, mull: 5, muntins: 3, frame: TEAL }, { s0: L / 2 - 0.3, s1: L / 2 + 0.3, y0: fl - 0.35, y1: fl + 0.25, arch: true, mull: 0, frame: TIM, sill: false }, casement(L / 2, fl + 3.9, 1.0, 1.2)] } } });
  function timberBand(R, fl) { // dark redwood upper storey projecting on carved brackets, small casement groups
    const y0 = fl + 3.35, y1 = 6.7;
    K.rbox(R, TIM, 0, y0, 0, R.L, y1, 0.32);
    // r5-east: a near-continuous ribbon of small-paned casements with dark green frames (photos), not 4 sparse cream-framed pairs
    for (const t of [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94]) for (const dx of [-0.36, 0.36]) { const s = R.L * t + dx; K.rbox(R, M.windowNight, s - 0.32, y0 + 0.75, 0.32, s + 0.32, y0 + 1.95, 0.34); K.rbox(R, X.trimGreen, s - 0.35, y0 + 0.7, 0.33, s + 0.35, y0 + 0.78, 0.38, { detail: true }); for (const yy of [y0 + 1.15, y0 + 1.55]) K.rbox(R, X.trimGreen, s - 0.32, yy - 0.02, 0.34, s + 0.32, yy + 0.02, 0.37, { detail: true }); K.rbox(R, X.trimGreen, s - 0.02, y0 + 0.75, 0.34, s + 0.02, y0 + 1.95, 0.37, { detail: true }); }
    for (let i = 0; i <= 10; i++) { const s = 0.2 + (R.L - 0.4) * i / 10; K.rbox(R, TIM, s - 0.09, y0 - 0.55, 0, s + 0.09, y0, 0.3); K.rbox(R, TIM, s - 0.07, y0 + 0.1, 0.32, s + 0.07, y1 - 0.1, 0.4, { detail: true }); }
    K.rbox(R, TIM, -0.1, y0 - 0.12, 0, R.L + 0.1, y0 + 0.08, 0.45);
  }
  // ===== B. Maybeck's Great Hall: steep cross-gable =====
  // r5-east: the hall's glade gable is dark redwood shingle with a deep verge, exposed purlin/ridge ends and one big grouped
  // multi-light window high in the gable wall over three teal French doors (was stucco with Tudor-like half-timbering)
  range({ u0: -21.0, u1: -12.0, v0: -7.3, v1: 4.6, eave: 7.4, floor: wFl, wallMat: SHG, roofMat: SHROOF, roof: { type: 'gable', axis: 'v', rise: 4.8, ov: 0.8, verge: 1.15 },
    faces: { E: false, W: false,
      S: { ops: (L, fl) => [...[-2.3, 0, 2.3].map((d) => french(L / 2 + d, fl + 0.15, 1.15, 2.35)), { s0: L / 2 - 2.3, s1: L / 2 + 2.3, y0: fl + 3.25, y1: fl + 6.15, mull: 5, muntins: 4, frame: TIM, fw: 0.1 }],
        extra: (R, fl) => { K.rbox(R, TIM, -0.1, fl + 2.75, 0, R.L + 0.1, fl + 2.95, 0.3); for (const s of [0.25, R.L - 0.25]) K.rbox(R, TIM, s - 0.17, 0.3, 0, s + 0.17, 7.4, 0.28); } },
      N: { ops: (L, fl) => [casement(L / 2 - 2, fl + 1.6, 1.2, 2.0), casement(L / 2 + 2, fl + 1.6, 1.2, 2.0)] } } });
  { // purlin and ridge-beam ends under the deep verge of the glade gable (frame: u across the hall, v toward the glade)
    const yE = 7.4, cu = -16.5, hw = 4.5, rise = 4.8, v1 = 4.6 + 1.15;
    for (const f of [0.28, 0.62]) for (const sd of [-1, 1]) { const u = cu + sd * hw * (1 - f), y = yE + rise * f - 0.35; K.box(TIM, u - 0.13, y - 0.16, 4.3, u + 0.13, y + 0.16, v1 + 0.15, { detail: true }); }
    K.box(TIM, cu - 0.16, yE + rise - 0.55, 4.3, cu + 0.16, yE + rise - 0.15, v1 + 0.2, { detail: true });
  }
  // chimney on the hall's north side (r5-east: brick, as in the hall's brick fireplace; was stucco)
  K.box(M.brick || ST, -17.6, 4.0, -8.6, -15.6, 14.6, -7.0); K.box(M.concreteDark, -17.75, 14.6, -8.75, -15.45, 14.8, -6.85);
  // ===== C. centre range =====
  range({ u0: -12.0, u1: 8.4, v0: -7.4, v1: 17.2, eave: 7.2, roof: { type: 'hip', slope: 0.36, ov: 0.7 }, faces: { N: false } });
  // ===== D. north wing (gable along v) =====
  range({ u0: -6.2, u1: 11.6, v0: -32.6, v1: -7.4, eave: 7.4, roof: { type: 'gable', axis: 'v', rise: 4.6, ov: 0.8, gableWin: true }, faces: { S: false } });
  // ===== E. east range with the ribbon of casements under the eave =====
  const ribbon = (L, fl, arches = false) => { const ops = []; const n = Math.max(3, Math.round(L / 1.25)); for (let i = 0; i < n; i++) ops.push(casement(0.6 + (L - 1.2) * (i + 0.5) / n, 5.6 - 1.25 + 0.05, 0.82, 1.2)); return ops; };
  range({ u0: 11.8, u1: 23.6, v0: -6.8, v1: 17.8, eave: 7.6, roof: { type: 'gable', axis: 'v', rise: 4.3, ov: 0.7 }, faces: { W: false,
    E: { ops: (L, fl) => [...ribbon(L, fl), ...[0.25, 0.5, 0.75].map((t) => french(L * t, fl + 0.2, 1.1, 2.0))] } } });
  range({ u0: 11.9, u1: 17.2, v0: -20.0, v1: -6.8, eave: 5.8, roof: { type: 'hip', slope: 0.42, ov: 0.6 }, faces: { S: false } });
  // ===== F. south-east range facing the glade: casement ribbon, arched door, big arched teal window =====
  range({ u0: 8.4, u1: 24.0, v0: 17.8, v1: 32.0, eave: 7.4, roof: { type: 'hip', slope: 0.38, ov: 0.65 }, faces: { N: false,
    S: { ops: (L, fl) => [...ribbon(L, fl), { s0: 2.2, s1: 3.8, y0: fl, y1: fl + 3.0, arch: true, kind: 'door', doorTop: fl + 2.2, door: TEAL, frame: TEAL, sill: false },
      french(6.5, fl + 0.5, 1.0, 1.6), french(8.4, fl + 0.5, 1.0, 1.6), { s0: L - 4.6, s1: L - 2.2, y0: fl + 0.7, y1: fl + 3.6, arch: true, mull: 3, muntins: 4, frame: TEAL }] } } });
  // ===== stepped stucco garden walls and terrace toward the glade (south of the west wing) =====
  for (const [u0, u1, v, h] of [[-38, -28, 7.6, 0.95], [-28, -18, 8.2, 0.9], [-18, -12.2, 8.8, 0.85]]) { // r5-east: was 1.3/1.2/1.1 m
    const R = K.run([u0, v], [u1, v]); const gb = K.gMin(u0, v - 0.3, u1, v + 0.3);
    K.rbox(R, ST, 0, gb - 0.6, -0.35, R.L, gb + h, 0); K.rbox(R, M.concreteDark, -0.05, gb + h, -0.42, R.L + 0.05, gb + h + 0.08, 0.07);
    colliders.push(K.colPoly([[u0, v - 0.35], [u1, v - 0.35], [u1, v], [u0, v]], gb - 0.6, gb + h + 0.1));
    for (const [a, b] of [[u0, v]]) K.box(ST, a - 0.18, gb - 0.6, 4.6, a + 0.18, gb + h, v);
  }
  K.box(M.paving, -38, K.gMin(-38, 4.6, -12, 8) + 0.35, 4.7, -12.2, K.gMin(-38, 4.6, -12, 8) + 0.4, 7.25);
  lamp(K, -10.5, K.g(-10.5, 20), 20, 3.6); lamp(K, 6, K.g(6, 34), 34, 3.6);

  const object3d = K.finish();
  object3d.name = 'faculty-club';
  return { object3d, colliders };
}
