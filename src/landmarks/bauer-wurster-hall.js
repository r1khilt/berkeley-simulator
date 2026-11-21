// Bauer Wurster Hall (Vernon DeMars, Joseph Esherick & Donald Olsen, 1964), College of Environmental Design.
// Raw board-formed concrete brutalism: a ten-storey slab tower with a taller service block and cantilevered crown at its west
// end, rising over three- and four-storey wings that wrap a courtyard open to the east. The wings wear the signature
// egg-crate of projecting concrete window hoods on stub fins, with toothed beam-end corbels at the parapet; the ground floor
// of the courtyard faces is a shaded arcade behind piers.
// Massing follows the 2021 LiDAR (frame rotated -9° to the campus grid): wings 14–18 m, tower roof ~39.5 m, service block ~49 m.
import * as THREE from 'three';
import { Kit, deg, mats, openWall, lamp, boardMat } from './lib/b05b-kit.js';
import { paleBoardMat } from './lib/reast-kit.js';

export const info = {
  id: 'bauer-wurster-hall',
  name: 'Bauer Wurster Hall',
  subtitle: 'DeMars, Esherick & Olsen · 1964',
  blurb: 'Home of the College of Environmental Design, Wurster Hall is Berkeley\'s best-known brutalist building: board-formed concrete left raw, with a ten-storey tower over studio wings wrapped around a courtyard.',
  replaces: ['r/6415953'],
};

export async function build(ctx) {
  const K = new Kit(ctx, deg(-9)); const M = ctx.M; const X = mats(M);
  const C = paleBoardMat(0xffffff), CD = paleBoardMat(0xc9c2b4); /* refine-east: pale warm board-formed concrete */ const ROOF = new THREE.MeshStandardMaterial({ color: 0xb5b3ab, roughness: 0.95, map: M.concrete.map });
  const GL = M.windowNight; // refine-east: shared window material (interior shader upgrade)
  const FR = X.frameDark;
  const colliders = [], walkables = [];
  const FL = 3.8;

  // ---------- egg-crate wing façade on run R (s0..s1), floors from ground gs to roof top ----------
  function eggFace(R, s0, s1, top, { bay = 3.8, arcade = false, corbels = true, startY = null, pylons = true } = {}) {
    const L = s1 - s0; let gs = Infinity; for (let k = 0; k <= 6; k++) { const p = R.at(s0 + L * k / 6, 1.0); gs = Math.min(gs, ctx.groundAt(p[0], p[1])); }
    const y0 = startY ?? gs; const nF = Math.max(1, Math.floor((top - y0 - 0.9) / FL));
    const nb = Math.max(1, Math.round((L - 1.2) / bay)); const bw = (L - 1.2) / nb; const a0 = s0 + 0.6;
    const ops = [];
    for (let f = 0; f < nF; f++) {
      const fy = y0 + f * FL; if (arcade && f === 0) continue;
      for (let i = 0; i < nb; i++) { const c = a0 + bw * (i + 0.5); ops.push({ s0: c - bw / 2 + 0.28, s1: c + bw / 2 - 0.28, y0: fy + 0.95, y1: fy + 3.2, noFill: true }); }
    }
    K.wall(R, C, s0, s1, arcade ? y0 + FL : gs - 1.2, top + 0.9, ops, 0.5);
    for (const o of ops) {
      K.rbox(R, GL, o.s0, o.y0, -0.45, o.s1, o.y1, -0.42);
      const w = o.s1 - o.s0; for (const t of [0.25, 0.5, 0.75]) { const s = o.s0 + w * t; K.rbox(R, FR, s - 0.03, o.y0, -0.45, s + 0.03, o.y1, -0.4, { detail: true }); }
      K.rbox(R, FR, o.s0, o.y0 + 1.1, -0.45, o.s1, o.y0 + 1.16, -0.4, { detail: true });
    }
    // continuous sun shelves at every floor line + vertical fins at ~1.5 m pitch (deep egg-crate)
    for (let f = (arcade ? 1 : 0); f <= nF; f++) { const fy = y0 + f * FL; if (fy > top - 0.3) break; K.rbox(R, C, s0 + 0.1, fy + 0.42, 0, s1 - 0.1, fy + 0.92, 1.0); K.rbox(R, C, s0 + 0.1, fy + 0.18, 0.84, s1 - 0.1, fy + 0.42, 1.0); }
    for (let i = 0; i <= nb; i++) { const s = a0 + bw * i;
      K.rbox(R, C, s - 0.24, arcade ? y0 + FL : gs - 1.2, 0, s + 0.24, Math.min(top - 0.1, y0 + nF * FL + 0.92), 1.25);
      for (let f = (arcade ? 1 : 0); f <= nF; f++) { const fy = y0 + f * FL; if (fy > top - 0.3) break; K.rbox(R, C, s - 0.3, fy + 0.3, 1.0, s + 0.3, fy + 0.95, 1.45); } }
    for (const o of ops) { const w = o.s1 - o.s0; for (const t of [0.5]) { const sm = o.s0 + w * t; K.rbox(R, FR, sm - 0.04, o.y0, -0.46, sm + 0.04, o.y1, -0.4, { detail: true }); } }
    // ground-floor arcade: recessed glass wall behind square piers
    if (arcade) {
      K.rbox(R, GL, s0 + 0.3, y0, -2.6, s1 - 0.3, y0 + FL - 0.4, -2.55);
      for (let i = 0; i <= nb * 2; i++) { const s = a0 + (bw / 2) * i; K.rbox(R, FR, s - 0.05, y0, -2.55, s + 0.05, y0 + FL - 0.4, -2.45, { detail: true }); }
      K.rbox(R, C, s0, y0 + FL - 0.45, -2.6, s1, y0 + FL, 0);
      K.rbox(R, M.paving, s0, y0 - 0.3, -2.6, s1, y0 + 0.02, 0);
    }
    // parapet band + toothed beam-end corbels
    K.rbox(R, C, s0, top - 0.1, -0.4, s1, top + 1.0, 0.12);
    if (corbels) for (let i = 0; i <= nb; i++) { const s = a0 + bw * i; K.rbox(R, C, s - 0.3, top - 0.7, 0.12, s + 0.3, top + 0.05, 0.8); K.rbox(R, C, s - 0.3, top - 0.95, 0.12, s + 0.3, top - 0.7, 0.45); }
    if (pylons) for (const s of [s0 + 0.5, s1 - 0.5]) K.rbox(R, C, s - 0.5, gs - 1.2, 0, s + 0.5, top + 1.2, 0.95);
    return { gs, nF };
  }
  // ---------- rectangular wing ----------
  function wing(u0, u1, v0, v1, top, faces = {}) {
    const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
    for (const f of ['S', 'E', 'N', 'W']) { const fo = faces[f]; if (fo === false) continue; const R = K.run(defs[f][0], defs[f][1]); eggFace(R, fo?.s0 ?? 0, fo?.s1 ?? R.L, top, fo || {}); }
    const gm = K.gMin(u0, v0, u1, v1);
    K.box(CD, u0 + 0.45, gm - 1.2, v0 + 0.45, u1 - 0.45, top - 0.05, v1 - 0.45);
    K.box(ROOF, u0 + 0.3, top - 0.3, v0 + 0.3, u1 - 0.3, top, v1 - 0.3);
    if ((u1 - u0) * (v1 - v0) > 900) { const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2; K.box(CD, cu - 4, top, cv - 3, cu + 4, top + 3.2, cv + 3); }
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], gm - 1.2, top + 1));
  }
  // north studio block (3 storeys over the slope), west and south wings, small south-east block
  wing(-39.2, 31.2, -42.0, -6.2, 15.1, { S: { s0: 0, s1: 35.9 }, E: { s0: 0, s1: 12.7 } });
  wing(-21.6, -3.3, -6.2, 26.4, 14.2, { N: false, S: false, E: { arcade: true } });
  wing(-21.6, 29.5, 26.4, 52.6, 18.2, { N: { arcade: true, s0: 0, s1: 32.8 } });
  wing(16.5, 36.3, 18.5, 26.4, 10.2, { S: false, W: false });
  // rooftop penthouses on the south wing
  for (const [u0, u1, v0, v1] of [[-14, -4, 31, 37], [21, 29, 30, 35]]) { K.box(C, u0, 18.2, v0, u1, 22.6, v1); K.rbox(K.run([u0, v1], [u1, v1]), CD, 0, 22.0, 0, u1 - u0, 22.7, 0.2); }

  // ---------- tower slab ----------
  const tu0 = -3.3, tu1 = 40.4, tv0 = -29.3, tv1 = -6.2, tTop = 39.6;
  {
    const yBase = 15.1; // above the north block roof on the north; the south face comes down to the courtyard
    const faces = [[[tu1, tv1], [tu0, tv1].map((x, i) => i ? x : tu0)], [[tu0, tv0], [tu1, tv0]]];
    // long faces (refine-east): the same deep egg-crate as the studio wings, wide recessed window bays under heavy
    // concrete hoods at every floor, carried on fins at the bay pitch; courtyard arcade at the foot of the south face
    // north face: mostly blank board-formed wall; a central bay of stacked recessed balcony slots with railings, two small
    // square windows over each, and a few scattered small windows on the flanking volumes (per photos; the egg-crate is
    // only on the low wings and the courtyard face)
    {
      const R = K.run([tu1, tv0], [tu0, tv0]); const L = R.L, mid = L * 0.42; const ops = [], slots = [];
      for (let f = 0; f < 7; f++) {
        const fy = yBase + 0.4 + f * 3.55; if (fy + 3.0 > tTop) break;
        slots.push({ s0: mid - 3.6, s1: mid + 3.6, y0: fy + 0.2, y1: fy + 1.75, noFill: true });
        for (const dx of [-1.5, 1.5]) ops.push({ s0: mid + dx - 0.42, s1: mid + dx + 0.42, y0: fy + 2.15, y1: fy + 3.0, mull: 0, frame: FR, sill: false });
        for (const sx of [5.0 + (f % 3) * 1.7, L - 6.5 - ((f + 1) % 3) * 2.1, L * 0.72 + ((f * 7) % 5) - 2]) ops.push({ s0: sx - 0.4, s1: sx + 0.4, y0: fy + 1.5, y1: fy + 2.4, mull: 0, frame: FR, sill: false });
      }
      openWall(K, R, C, 0, L, yBase, tTop + 1.3, [...ops, ...slots], { depth: 1.3, rev: 0.25, frame: FR, glass: GL, sill: false });
      for (const o of slots) {
        K.rbox(R, GL, o.s0, o.y0, -1.25, o.s1, o.y1, -1.2);
        K.rbox(R, M.iron, o.s0, o.y0 + 1.0, -0.25, o.s1, o.y0 + 1.06, -0.15, { detail: true });
        for (let k = 0; k <= 12; k++) { const x = o.s0 + (o.s1 - o.s0) * k / 12; K.rbox(R, M.iron, x - 0.02, o.y0, -0.24, x + 0.02, o.y0 + 1.0, -0.2, { detail: true }); }
      }
      K.rbox(R, C, -0.1, tTop + 0.3, -0.45, L + 0.1, tTop + 1.3, 0.25); // blunt parapet
      // stub fins (small cantilevered ledges) stacked up the west edge
      for (let f = 0; f < 7; f++) { const fy = yBase + 0.4 + f * 3.55 + 3.2; if (fy > tTop) break; K.rbox(R, C, L - 2.6, fy, 0, L - 0.4, fy + 0.25, 1.2); }
    }
    { const r = eggFace(K.run([tu0, tv1], [tu1, tv1]), 0, tu1 - tu0, tTop, { arcade: true, bay: 3.6, corbels: false, pylons: true }); void r; }
    // east end: blank board-formed wall with scattered small windows, stacked recessed balcony slots in the middle
    {
      const R = K.run([tu1, tv1], [tu1, tv0]); const gs = K.g(tu1 + 1, (tv0 + tv1) / 2); const mid = R.L / 2;
      const ops = []; for (let f = 1; f < 10; f++) { const fy = gs + f * 3.6; ops.push({ s0: mid - 2.0, s1: mid + 2.0, y0: fy + 0.4, y1: fy + 3.0, noFill: true });
        for (const s of [3 + (f % 3), R.L - 3.5 - ((f + 1) % 3)]) ops.push({ s0: s - 0.35, s1: s + 0.35, y0: fy + 1.5, y1: fy + 2.2, mull: 0, frame: FR, sill: false }); }
      openWall(K, R, C, 0, R.L, gs - 1.2, tTop + 1.3, ops, { depth: 1.3, rev: 0.25, frame: FR, sill: false });
      for (const o of ops.filter((x) => x.noFill)) { K.rbox(R, GL, o.s0, o.y0, -1.25, o.s1, o.y1 - 0.4, -1.2); K.rbox(R, M.iron, o.s0, o.y0 + 1.0, -0.3, o.s1, o.y0 + 1.06, -0.2, { detail: true }); for (let k = 0; k <= 8; k++) K.rbox(R, M.iron, o.s0 + 4 * k / 8 - 0.02, o.y0, -0.28, o.s0 + 4 * k / 8 + 0.02, o.y0 + 1.0, -0.24, { detail: true }); }
    }
    // west end above the north block (mostly hidden behind the service block): plain wall
    { const R = K.run([tu0, tv0], [tu0, tv1]); K.wall(R, C, 0, R.L, yBase, tTop + 1.3, [], 0.45); }
    K.box(CD, tu0 + 0.5, K.gMin(tu0, tv0, tu1, tv1) - 1.2, tv0 + 0.5, tu1 - 0.5, tTop + 0.3, tv1 - 0.5);
    colliders.push(K.colPoly([[tu0, tv0], [tu1, tv0], [tu1, tv1], [tu0, tv1]], -2, tTop + 2));
    // east stair core with high parapet
    K.box(C, 27.5, tTop, tv0 + 0.2, 33.5, 43.0, tv0 + 5.0);
    K.box(CD, 9, tTop + 0.3, -21, 24, tTop + 2.4, -15.5); // mechanical penthouse (concrete)
    // thin steel flue
    K.cyl(M.iron, 12, tTop + 0.3, -20, 0.18, 0.18, 3.6, 10);
  }
  // ---------- west service block + cantilevered crown ----------
  {
    const s0 = -14.5, s1 = -1.0, w0 = -26.0, w1 = -12.5, top = 49.4;
    K.box(C, s0, 15.0, w0, s1, 42.6, w1); K.box(CD, s0 + 1.9, 42.6, w0 + 1.9, s1 - 1.9, 45.6, w1 - 1.9);
    // slot windows up the service block faces

    // crown: deep recessed slot (open loggia) under a box cantilevering beyond the shaft on all sides
    const sy0 = 42.6, sy1 = 45.6;
    K.box(GL, s0 + 1.8, sy0, w0 + 1.8, s1 - 1.8, sy1, w1 - 1.8);
    for (const [uu, vv] of [[s0 + 1.0, w0 + 1.0], [s1 - 1.0, w0 + 1.0], [s0 + 1.0, w1 - 1.0], [s1 - 1.0, w1 - 1.0]]) K.box(C, uu - 0.6, sy0, vv - 0.6, uu + 0.6, sy1, vv + 0.6);
    for (const vv of [w0 + 1.6, w1 - 1.6]) K.box(M.iron, s0 + 1.6, sy0 + 1.0, vv - 0.03, s1 - 1.6, sy0 + 1.06, vv + 0.03, { detail: true });
    K.box(C, s0 - 1.4, sy1, w0 - 1.4, s1 + 1.4, top, w1 + 1.4);
    K.box(CD, s0 - 1.5, sy1 - 0.35, w0 - 1.5, s1 + 1.5, sy1, w1 + 1.5);
    // the slab's lower crown band (LiDAR ~43–45 m) wrapping the shaft
    K.box(C, -17.0, 39.6, -24.5, 6.0, 43.0, -13.5);
    K.box(GL, -16.6, 40.3, -24.0, 5.6, 42.4, -14.0);
    { const R = K.run([s0, w0], [s0, w1]); for (let f = 0; f < 7; f++) { const y = 16.5 + f * 3.6; K.rbox(R, GL, R.L / 2 - 0.4, y, -0.05, R.L / 2 + 0.4, y + 1.2, 0.02); K.rbox(R, C, R.L / 2 - 0.6, y - 0.15, 0, R.L / 2 + 0.6, y, 0.3); } }
    colliders.push(K.colPoly([[s0, w0], [s1, w0], [s1, w1], [s0, w1]], 14, top));
  }
  // ---------- courtyard: paving, steps toward the east, lamps ----------
  {
    const g = K.g(14, 6);
    K.box(M.paving, -3.0, g - 0.6, -6.0, 31.0, g + 0.02, 18.3);
    for (const [u, v] of [[4, 2], [20, 2], [4, 14], [20, 14]]) lamp(K, u, g, v, 4.0);
    for (const [u, v] of [[8, 9], [16, 9]]) { K.box(C, u - 2.5, g, v - 1.2, u + 2.5, g + 0.6, v + 1.2); }
  }

  const object3d = K.finish();
  object3d.name = 'bauer-wurster-hall';
  return { object3d, colliders, walkables };
}
