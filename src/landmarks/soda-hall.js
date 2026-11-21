// Soda Hall (1994; Edward Larrabee Barnes / John M.Y. Lee with Anshen + Allen): the computer science building at Hearst and Le Roy.
// Signature look: a skin of small mottled slate / grey-green / charcoal glazed tiles, pale ledges with thin maroon stripes at the
// floor lines, a lighter green-grey stone base lettered "SODA HALL", loosely gridded punched windows (single and paired) with dark
// frames, a top-floor arcade of big open round arches along Hearst in front of a roofed loggia, the long concrete-lattice pergola
// on dark posts between Soda and Etcheverry, and a north side that steps down in planted terraces one storey at a time toward
// Jacobs Hall. Massing follows the 2021 LiDAR: roof 20.5 m (parapet 21.8), Hearst arcade band 21.6 / 22.5 m, terraces at
// 16.4 / 12.3 / 8.2 / 4.2 m, penthouse 24.5 m, and the pergola at ~4.2 m over the west walk.
import * as THREE from 'three';
import { Kit, mats, punched, bays, roofDeck, rect, gAt, storefront, signText } from './lib/b03-kit.js';

export const info = {
  id: 'soda-hall',
  name: 'Soda Hall',
  subtitle: 'Computer Science · 1994',
  blurb: 'Home of computer science in Berkeley EECS, opened in 1994 and named for the Soda family whose foundation funded it. Its mottled glazed-tile skin, maroon stripes and top-floor arcade of open arches facing Hearst Avenue make it one of the most distinctive buildings on the north side.',
  replaces: ['w/280300979'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9.35);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const TILE = B.sodaTile, BUR = B.burgundy, STONE = B.stoneDark, PALE = B.sodaPale, CREAM = B.cream;
  const GL = B.sodaGlass, FR = B.alumDark;
  const colliders = [], walkables = [];
  const u0 = -18.15, u1 = 18.15, v0 = -27.76, v1 = 27.76;
  const LV = [0, 4.2, 8.2, 12.3, 16.4, 20.5]; // floor levels; storey k spans LV[k-1]..LV[k]
  const PAR = 21.8, PAR_S = 22.6, BAND_ROOF = 22.2, ATOP = 21.85;
  const vStart = [v0, v0, -21.1, -14.1, -9.1, -4.3]; // north edge of storey k (terraces step down to the north)
  const AD = 4.8; // depth of the Hearst arcade band (storeys 4-5)
  const AK = 5; // the arcade storey
  const BASE_TOP = 3.55;
  const winOpts = { glass: GL, frame: FR, mull: 1, depth: 0.45, rev: 0.2 };

  const cut = (segs, spans) => { for (const [p, q] of spans) segs = segs.flatMap(([x, z]) => (q <= x || p >= z) ? [[x, z]] : [[x, p], [q, z]].filter(([m, n]) => n - m > 0.05)); return segs; };
  // pale ledge with a maroon stripe beneath it, at a floor line
  const ledge = (R, s0, s1, y) => {
    const stripe = Math.abs(y - LV[1]) < 0.01 || Math.abs(y - LV[3]) < 0.01 || Math.abs(y - LV[5]) < 0.01;
    K.rbox(R, PALE, s0 - 0.1, y - 0.1, -0.1, s1 + 0.1, y + 0.15, 0.35);
    if (stripe) K.rbox(R, BUR, s0, y - 0.36, -0.05, s1, y - 0.24, 0.02);
  };
  // windows from a run's bay grid inside [s0,s1]: alternating single wide windows and pairs (loose rhythm)
  const winsIn = (cs, s0, s1, y0, y1, k = 0, mode = 'mix') => {
    const out = [];
    cs.forEach((c, i) => {
      const pair = mode === 'pair'; const w = mode === 'single' ? 2.8 : (i % 3 === 1 ? 1.8 : 2.4);
      const parts = pair ? [[c - 2.1, c - 0.4], [c + 0.4, c + 2.1]] : [[c - w / 2, c + w / 2]];
      if (parts[0][0] < s0 + 0.9 || parts[parts.length - 1][1] > s1 - 0.9) return;
      for (const [a, b] of parts) out.push({ s0: a, s1: b, y0, y1, mull: b - a > 2.8 ? 2 : b - a > 2 ? 1 : 0 });
    });
    return out;
  };
  // one tiled storey (k = 2..5) on run R between s0..s1, minus skipped spans
  const INS = [0, 0.6, 0.4, 0.2, 0, 0]; // each storey steps out a little over the one below (pale ledge at the step)
  const tileStorey = (R0, cs, k, s0, s1, skip = []) => {
    const a = LV[k - 1], b = LV[k]; const R = INS[k] ? K.run(R0.a, R0.b, -INS[k]) : R0; s0 += INS[k]; s1 -= INS[k];
    for (const [x, z] of cut([[s0, s1]], skip)) {
      punched(K, R, TILE, x, z, a, b, winsIn(cs, x, z, a + 1.1, a + 2.7, k), winOpts);
      ledge(R, x, z, a);
    }
  };
  // stone base storey; windows only where above the terrain
  const baseStorey = (R0, cs, s0, s1, holes = []) => {
    const R = K.run(R0.a, R0.b, -INS[1]); s0 += INS[1]; s1 -= INS[1];
    const ops = winsIn(cs, s0, s1, 0.95, 2.75, 0, 'single').filter((o) => !holes.some((e) => e.s1 > o.s0 - 0.4 && e.s0 < o.s1 + 0.4));
    punched(K, R, STONE, s0, s1, -1.6, BASE_TOP, [...ops, ...holes], { ...winOpts, sill: M.graniteDark });
    K.rbox(R, BUR, s0, BASE_TOP, -0.45, s1, BASE_TOP + 0.2, 0.03);
    K.wall(R, PALE, s0, s1, BASE_TOP + 0.2, LV[1], [], 0.42);
  };
  const parapet = (R, s0, s1, y0, y1, d = 0.42) => {
    K.wall(R, TILE, s0, s1, y0, y1, [], d);
    K.rbox(R, PALE, s0 - 0.03, y1, -d - 0.05, s1 + 0.03, y1 + 0.1, 0.06);
    ledge(R, s0, s1, y0);
  };

  // ---------- runs: S (Hearst, W→E), E (Le Roy, S→N), W (N→S); north step faces (E→W)
  const RS = K.run([u0, v1], [u1, v1]);
  const RE = K.run([u1, v1], [u1, v0]);
  const RW = K.run([u0, v0], [u0, v1]);
  const sE = (v) => v1 - v, sW = (v) => v - v0;
  const csNS = bays(0, RS.L, 5); const csWin = bays(0, RS.L, 6);
  const BW = 6.94; const csE = Array.from({ length: 8 }, (_, i) => 3.47 + BW * i); const csW = csE.map((c) => RW.L - c);

  // ---- south façade (Hearst): lettered base, storeys 2-4, top-floor arcade
  baseStorey(RS, csWin, 0, RS.L);
  signText(K, RS, 'SODA HALL', csNS[0] + 0.2, 3.1, 0.42, { spacing: 0.12, color: '#c6c7c2' });
  for (let k = 2; k < AK; k++) tileStorey(RS, csWin, k, 0, RS.L);
  // ---- east (Le Roy) and west façades: each storey runs from its terrace edge to Hearst; the arcade band takes the south AD m of storey 5
  const westDoor = { s0: sW(17.0) - 2.4, s1: sW(17.0) + 2.4, y0: Math.max(-1.0, gAt(K, RW, sW(17.0), 1.2)) + 0.03, y1: 3.3, noFill: true };
  for (const [R, sOf, isE, cs] of [[RE, sE, true, csE], [RW, sW, false, csW]]) {
    const span = (k) => isE ? [0, sOf(vStart[k])] : [sOf(vStart[k]), R.L];
    baseStorey(R, cs, ...span(1), isE ? [] : [westDoor]);
    for (let k = 2; k <= 5; k++) tileStorey(R, cs, k, ...span(k), k >= AK ? (isE ? [[0, AD]] : [[R.L - AD, R.L]]) : []);
    { const [a, b] = span(5); if (isE) parapet(R, AD, b, LV[5], PAR); else parapet(R, a, b - AD, LV[5], PAR); }
  }
  // main entrance on the pergola walk (west), near Hearst
  storefront(K, RW, westDoor.s0, westDoor.s1, westDoor.y0, 3.25, { glass: GL, frame: FR, rev: 0.35, transom: westDoor.y0 + 2.45, mw: 1.2 });
  // ---- north faces of each terrace step (E→W): storey k's north wall stands at vStart[k]
  for (let k = 1; k <= 5; k++) {
    const R = K.run([u1, vStart[k]], [u0, vStart[k]]);
    if (k === 1) baseStorey(R, csWin, 0, R.L); else tileStorey(R, csWin, k, 0, R.L);
    if (k === 5) parapet(R, 0, R.L, LV[5], PAR);
  }

  // ---------- Hearst arcade: open round arches in a thick tiled screen, roofed loggia behind (storey 5)
  {
    const y0 = LV[AK - 1], scrD = 0.75;
    const archOps = (R, cs, w) => cs.map((c) => ({ s0: c - w / 2, s1: c + w / 2, y0: y0 + 0.1, y1: ATOP, arch: true }));
    const sArches = archOps(RS, csNS, 4.6);
    K.wall(RS, TILE, 0, RS.L, y0, PAR_S, sArches, scrD);
    for (const o of sArches) { const cx = (o.s0 + o.s1) / 2, r = (o.s1 - o.s0) / 2, cy = o.y1 - r;
      const sh = new THREE.Shape(); sh.moveTo(cx + r + 0.55, cy); sh.absarc(cx, cy, r + 0.55, 0, Math.PI, false); sh.lineTo(cx - r, cy); sh.absarc(cx, cy, r, Math.PI, 0, true); sh.lineTo(cx + r + 0.55, cy);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false, curveSegments: 14 }); K.addRun(RS, B.darkTile, g); }
    // side arches (one on each end face within the band)
    const eArch = archOps(RE, [AD / 2], 2.8), wArch = archOps(RW, [RW.L - AD / 2], 2.8);
    K.wall(RE, TILE, 0, AD, y0, PAR_S, eArch, scrD); K.wall(RW, TILE, RW.L - AD, RW.L, y0, PAR_S, wArch, scrD);
    for (const [R, s0, s1, ops] of [[RS, 0, RS.L, sArches], [RE, 0, AD, eArch], [RW, RW.L - AD, RW.L, wArch]]) {
      K.rbox(R, PALE, s0 - 0.03, PAR_S, -scrD - 0.05, s1 + 0.03, PAR_S + 0.1, 0.06);
      ledge(R, s0, s1, y0);
      // maroon stripe at the arch springing, split around the openings
      const spring = ops[0].y1 - (ops[0].s1 - ops[0].s0) / 2;
      for (const [p, q] of cut([[s0, s1]], ops.map((o) => [o.s0 - 0.02, o.s1 + 0.02]))) K.rbox(R, BUR, p, spring - 0.1, -0.05, q, spring + 0.08, 0.03);
      // tiled jamb planters at the arch feet
      for (const o of ops) K.rbox(R, PALE, o.s0 - 0.05, o.y0 - 0.08, -scrD - 0.05, o.s1 + 0.05, o.y0, 0.12); // sill cap
      ledge(R, s0, s1, LV[4]);
    }
    // loggia: paved floor, glazed back wall, white ceiling vaults, solid ends
    const vb = v1 - AD;
    K.box(M.paving, u0 + 0.6, y0 - 0.3, vb, u1 - 0.6, y0 + 0.02, v1 - scrD);
    walkables.push(K.walkPoly(rect(u0 + 0.8, vb + 0.2, u1 - 0.8, v1 - scrD - 0.1), y0 + 0.02));
    const Rb = K.run([u0, vb], [u1, vb]);
    const bOps = csNS.map((c) => ({ s0: c - 2.2, s1: c + 2.2, y0: y0 + 0.05, y1: y0 + 3.6 }));
    punched(K, Rb, B.darkTile, 0.8, Rb.L - 0.8, y0, BAND_ROOF - 0.3, bOps, { glass: B.glassGrey, frame: FR, mull: 3, depth: 0.3, terrain: false });
    K.box(M.whitePaint, u0 + 0.6, ATOP + 0.05, vb, u1 - 0.6, ATOP + 0.15, v1 - scrD);
    for (const c of csNS) { const r = 2.3; const g = new THREE.CylinderGeometry(r, r, AD - scrD, 16, 1, true, Math.PI / 2, Math.PI); g.rotateX(Math.PI / 2); g.translate(u0 + c, ATOP - r, vb + (AD - scrD) / 2); K.add(B.whiteDS, g); }
  }

  // ---------- interior cores, terraces, roofs
  for (let k = 1; k <= 4; k++) {
    const vs = vStart[k], ve = vStart[k + 1], top = LV[k];
    K.box(M.concreteDark, u0 + 1.1, -1.6, vs + 1.1, u1 - 1.1, top - 0.1, ve);
    K.box(M.paving, u0 + 0.3, top - 0.1, vs + 0.3, u1 - 0.3, top + 0.05, ve);
    // terrace parapet (tile with pale cap) along the north and side edges
    const ph = 0.8;
    K.box(TILE, u0, top, vs, u1, top + ph, vs + 0.4); K.box(PALE, u0 - 0.03, top + ph, vs - 0.05, u1 + 0.03, top + ph + 0.08, vs + 0.45);
    for (const [ua, ub] of [[u0, u0 + 0.4], [u1 - 0.4, u1]]) { K.box(TILE, ua, top, vs + 0.4, ub, top + ph, ve); K.box(PALE, ua - 0.03, top + ph, vs + 0.4, ub + 0.03, top + ph + 0.08, ve); }
    K.box(B.planting, u0 + 1.0, top + 0.05, vs + 0.7, u1 - 1.0, top + 0.65, vs + 1.8, { detail: true });
    for (let u = u0 + 3; u < u1 - 2; u += 6) K.box(TILE, u, top + 0.05, ve - 2.2, u + 2.2, top + 0.5, ve - 1.4, { detail: true });
    walkables.push(K.walkPoly(rect(u0 + 0.6, vs + 0.6, u1 - 0.6, ve), top + 0.05));
  }
  K.box(M.concreteDark, u0 + 1.1, -1.6, vStart[5] + 1.1, u1 - 1.1, LV[5] - 0.3, v1 - AD);
  K.box(M.concreteDark, u0 + 1.1, -1.6, v1 - AD, u1 - 1.1, LV[AK - 1] - 0.3, v1 - 1.1);
  roofDeck(K, rect(u0 + 0.3, vStart[5] + 0.3, u1 - 0.3, v1 - AD), LV[5], { deck: B.roofMembrane, thick: 0.3 });
  K.box(M.concreteDark, u0 + 0.3, ATOP + 0.15, v1 - AD, u1 - 0.3, BAND_ROOF - 0.3, v1 - 0.75);
  K.box(B.roofMembrane, u0 + 0.3, BAND_ROOF - 0.3, v1 - AD, u1 - 0.3, BAND_ROOF, v1 - 0.3);
  K.box(TILE, u0 + 0.3, LV[5], v1 - AD - 0.3, u1 - 0.3, BAND_ROOF, v1 - AD); // step face between roof and band
  // penthouse (LiDAR 24.5 m): dark metal-clad mechanical enclosure set well back from the edges
  {
    const pu0 = -12.3, pu1 = 13.3, pv0 = 9.0, pv1 = 18.5, top = 24.5;
    K.box(B.greyMetal, pu0, LV[5], pv0, pu1, top - 0.15, pv1);
    K.box(PALE, pu0 - 0.05, top - 0.15, pv0 - 0.05, pu1 + 0.05, top, pv1 + 0.05);
    for (let y = LV[5] + 0.6; y < top - 0.6; y += 0.32) { K.box(B.alumDark, pu0 - 0.06, y, pv0 + 1, pu0, y + 0.1, pv1 - 1, { detail: true }); K.box(B.alumDark, pu1, y, pv0 + 1, pu1 + 0.06, y + 0.1, pv1 - 1, { detail: true }); }
    for (const [cu, cv] of [[-6, 0], [-3, 0], [0.5, 0], [13.5, -1], [15.5, 3]]) K.cyl(B.alum, cu, LV[5], cv, 0.35, 0.35, 1.2, 10, { detail: true });
    // perimeter guard rail on the main roof
  }

  // ---------- pergola over the walk between Soda and Etcheverry (LiDAR ~4.2 m): cream concrete slats on deep green steel girders,
  // carried on chunky tile-clad piers with slender round steel columns between
  {
    const pu0 = -29.5, pu1 = -18.7, pv0 = 6.0, pv1 = 29.5, top = 4.25;
    const lines = [-28.6, -19.6];
    for (const pu of lines) for (let v = pv0 + 1.5, i = 0; v <= pv1 - 0.5; v += 7.6, i++) {
      const g = K.g(pu, v);
      if (true) { K.box(TILE, pu - 0.6, g - 0.6, v - 0.6, pu + 0.6, top - 0.75, v + 0.6); K.box(PALE, pu - 0.65, top - 0.8, v - 0.65, pu + 0.65, top - 0.7, v + 0.65); colliders.push(K.colCyl(pu, v, 0.7, g - 1, top)); }
      else { K.cyl(B.greenSteel, pu, g - 0.4, v, 0.14, 0.14, top - 0.8 - g + 0.4, 10); colliders.push(K.colCyl(pu, v, 0.2, g - 1, top)); }
    }
    for (const pu of lines) K.box(B.greenSteel, pu - 0.25, top - 0.7, pv0, pu + 0.25, top - 0.05, pv1); // deep girders
    for (let v = pv0; v <= pv1; v += 1.0) K.box(B.creamConc, pu0, top - 0.05, v - 0.16, pu1, top + 0.3, v + 0.16); // heavy concrete cross-beams
    K.box(B.planting, pu1 - 3.0, top + 0.22, pv0 + 2, pu1 - 0.2, top + 0.5, pv1 - 8, { detail: true });
    { const pu = -21.2, pv = 27.6, g = K.g(pu, pv); K.box(TILE, pu - 0.7, g - 0.6, pv - 0.7, pu + 0.7, top - 0.05, pv + 0.7); colliders.push(K.colCyl(pu, pv, 1.0, g - 1, top)); }
    // planter strip along the base of the west façade
    for (let v = -24; v < pv1 - 9; v += 9) { const g = K.g(u0 - 1, v); K.box(M.concrete, u0 - 1.6, g - 0.5, v, u0 - 0.05, g + 0.55, v + 6); K.box(B.planting, u0 - 1.5, g + 0.55, v + 0.1, u0 - 0.15, g + 0.85, v + 5.9, { detail: true }); }
  }
  // stair tower on the west face near Hearst: slightly proud tiled bay with a tall vertical glazed slot
  {
    const sc = sW(9.5), half = 3.0, d = 0.35;
    K.rbox(RW, TILE, sc - half, LV[1], 0, sc + half, PAR + 0.4, d);
    K.rbox(RW, PALE, sc - half - 0.05, PAR + 0.4, -0.05, sc + half + 0.05, PAR + 0.5, d + 0.06);
    K.rbox(RW, GL, sc - 0.6, LV[1] + 0.6, d + 0.0, sc + 0.6, LV[5] - 0.4, d + 0.01);
    for (let y = LV[1] + 0.6; y < LV[5] - 0.3; y += 1.3) K.rbox(RW, FR, sc - 0.62, y, d, sc + 0.62, y + 0.06, d + 0.06, { detail: true });
    for (const x of [sc - 0.62, sc + 0.56]) K.rbox(RW, FR, x, LV[1] + 0.6, d, x + 0.06, LV[5] - 0.4, d + 0.06, { detail: true });
    for (let k = 2; k <= 5; k++) K.rbox(RW, BUR, sc - half, LV[k - 1] - 0.34, d, sc + half, LV[k - 1] - 0.23, d + 0.025);
  }
  // board-formed concrete planter / retaining wall along Hearst at the lettered corner
  {
    const g = Math.min(gAt(K, RS, 1, 2.5), gAt(K, RS, 14, 2.5));
    K.box(M.concrete, u0 - 0.3, g - 0.8, v1 + 1.4, u0 + 14, g + 0.9, v1 + 1.8);
    K.box(B.planting, u0 - 0.2, g - 0.2, v1 + 0.05, u0 + 13.9, g + 0.75, v1 + 1.4, { detail: true });
    colliders.push(K.colPoly(rect(u0 - 0.3, v1 + 0.0, u0 + 14, v1 + 1.8), g - 1, g + 0.9));
  }
  // Le Roy entrance: glazed vestibule at the second-floor level (the street is ~4 m up the slope) with a canopy
  {
    const vc = 6.5, half = 2.4, ge = K.g(u1 + 1.5, vc);
    const fl = Math.max(ge, LV[1] - 0.3);
    K.box(M.graniteDark, u1, fl - 1.0, vc - half - 0.6, u1 + 2.6, fl + 0.05, vc + half + 0.6);
    const Rv = K.run([u1 + 2.2, vc + half], [u1 + 2.2, vc - half]);
    storefront(K, Rv, 0, Rv.L, fl + 0.05, fl + 3.0, { glass: GL, frame: FR, rev: 0.0, transom: fl + 2.4 });
    for (const vv of [vc - half, vc + half]) K.box(FR, u1, fl + 0.05, vv - 0.06, u1 + 2.2, fl + 3.0, vv + 0.06);
    K.box(B.alum, u1, fl + 3.0, vc - half - 0.8, u1 + 3.2, fl + 3.3, vc + half + 0.8);
    walkables.push(K.walkPoly(rect(u1, vc - half - 0.6, u1 + 2.6, vc + half + 0.6), fl + 0.05));
  }

  // ---------- colliders follow the terraced massing
  for (let k = 1; k <= 4; k++) colliders.push(K.colPoly(rect(u0, vStart[k], u1, vStart[k + 1]), -2, LV[k] - 0.05));
  colliders.push(K.colPoly(rect(u0, vStart[5], u1, v1), -2, PAR_S));

  const object3d = K.finish();
  object3d.name = 'soda-hall';
  return { object3d, colliders, walkables };
}
