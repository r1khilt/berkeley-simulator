// Anthropology and Art Practice Building (Kroeber Hall, 1959; unnamed 2021): the Phoebe A. Hearst Museum of Anthropology
// and the art practice studios at Bancroft Way and the College Avenue walk. [r5-east2] Photo-modelled from the UC Berkeley
// map photo (College Ave side), the art.berkeley.edu "Spaces" photo (looking along the balconied façade) and Berkeley News
// 2021 photos (entrance, lettering): a long flat-roofed concrete slab building whose off-white full-height piers (~3.66 m
// bays) frame beige exposed-aggregate panels; one tall 2-over-2 steel window per bay per upper floor, staggered left/right
// floor to floor; small cantilevered pipe-rail balconies on the second floor; a glazed ground floor; a thin roof slab that
// overhangs ~1.1 m on a ribbed soffit; the north wing's east end is a blank wall beside the recessed glazed entrance.
// Massing from the 2021 LiDAR (frame -9.1°): north studio wing roof +20.8 m, east wing +19.5 m with four skylight
// monitors, the lower museum block on Bancroft +12.8 m, a canopy (+8.7 m) along its College Ave side and a raised
// plaza on Bancroft. Grade: College Ave walk and north path +5.1 m; the courtyard by the parking structure +0.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { tint, paleGlass, shrubRow, drapeStrip } from './lib/b05a-kit.js';

export const info = {
  id: 'anthropology-and-art-practice-building',
  name: 'Anthropology and Art Practice Building',
  subtitle: 'Kroeber Hall · 1959',
  blurb: 'Home of the Phoebe A. Hearst Museum of Anthropology, the Department of Anthropology and the Department of Art Practice. Built in 1959 as Kroeber Hall, it was unnamed in 2021 because of anthropologist Alfred Kroeber\'s role in the collection of Native American remains.',
  replaces: ['w/24025043'],
};

const BAY = 3.66;          // pier spacing (m)
const YE = 5.1;            // entrance floor (College Ave walk / north path)
const FL = [YE, YE + 4.5, YE + 8.5]; // floor levels above the entrance floor (ground floor taller: studios/galleries)
const SB_U1 = 14.51;      // east face of the museum block

export async function build(ctx) {
  const M = ctx.M; const K = new Kit(ctx, Math.atan2(-10.4, 64.7));
  const PIER = tint(K, M.stuccoWhite, 0xf0eee8, 'kr-pier');     // smooth bright piers, fascia, balcony slabs
  const PANEL = tint(K, M.stuccoWhite, 0xd8d3c6, 'kr-panel');   // pale cream-grey infill panels (smooth, faint joints)
  const BLANK = tint(K, M.stuccoWhite, 0xdedad0, 'kr-blank');   // smooth light end walls
  const SOFF = tint(K, M.concrete, 0xd9d3c6, 'kr-soff');
  const ROOF = tint(K, M.concreteDark, 0x9c9a94, 'kr-roof');
  const FR = new THREE.MeshStandardMaterial({ color: 0x8e9592, roughness: 0.45, metalness: 0.55 }); // grey steel/aluminium sash
  const DOOR = new THREE.MeshStandardMaterial({ color: 0x2f5446, roughness: 0.45, metalness: 0.4 }); // green entrance frames
  const RAIL = new THREE.MeshStandardMaterial({ color: 0xa9adb0, roughness: 0.45, metalness: 0.6 }); // light grey pipe rails (photos)
  const SKY = new THREE.MeshStandardMaterial({ color: 0x7f9a92, roughness: 0.15, metalness: 0.5 }); // greenish skylight glass
  const GL = paleGlass().clone(); GL.color = new THREE.Color(0x7d8f9a); // lighter, sky-reflecting glass (photos)
  const colliders = [], walkables = [];

  // ---- one façade: piers + panels with staggered windows. R faces outward; s in [s0,s1]; top = soffit height
  // o: { glazed: glazed entrance floor, balc: balconies on the 2nd floor, lowWin: windows in the exposed lower storey,
  //      blank: no windows, blankBays: [i...] bays without windows, doorBay: index of a glazed door bay, floors }
  const face = (R, s0, s1, top, o = {}) => {
    const L = s1 - s0, nb = Math.max(1, Math.round(L / BAY)), bw = L / nb;
    let gmin = Infinity; for (let s = s0; s <= s1 + 0.01; s += 1) { const [u, v] = R.at(Math.min(s, s1), 0.6); gmin = Math.min(gmin, K.g(u, v)); }
    const yB = Math.min(gmin, 0) - 1.2; const floors = o.floors || FL;
    const ops = [];
    for (let i = 0; i < nb; i++) {
      const b0 = s0 + i * bw, b1 = b0 + bw; if (o.blank || (o.blankBays || []).includes(i)) continue;
      const [gu, gv] = R.at((b0 + b1) / 2, 0.6); const gl = K.g(gu, gv);
      // exposed lower storey (courtyard side): one window per bay
      if (o.lowWin && gl < YE - 2.6) ops.push({ s0: b0 + bw * 0.25, s1: b1 - bw * 0.25, y0: Math.max(gl + 0.9, 0.9), y1: YE - 0.7, mull: 1, sill: false });
      floors.forEach((fy, k) => {
        if (k === 0 && o.glazed) { if (gl < fy + 0.3) ops.push({ s0: b0 + 0.3, s1: b1 - 0.3, y0: fy + (i === o.doorBay ? 0.02 : 0.45), y1: fy + 3.75, mull: 2, tran: [fy + 2.55], door: i === o.doorBay, sill: false }); return; }
        if (gl > fy + 0.6) return;                         // floor below grade on this bay
        if (o.skip && o.skip(b0, b1, fy)) return;          // e.g. hidden behind a lower block
        const left = (i + k) % 2 === 0, c = b0 + bw * (left ? 0.32 : 0.68);
        const bal = o.balc && k === 1 && i % 2 === 0;      // 2nd-floor balconies on alternate bays: the window runs down to the floor as a door
        ops.push({ s0: c - 0.7, s1: c + 0.7, y0: fy + (bal ? 0.05 : 0.75), y1: fy + 3.3, mull: 1, tran: [fy + (bal ? 2.1 : 2.05)], bal, c, bc: (b0 + b1) / 2, fy, sill: false });
      });
    }
    K.wall(R, PANEL, s0, s1, yB, top, ops, 0.32);
    for (const op of ops) {
      K.fill(R, op, { glass: GL, frame: op.door ? DOOR : FR, mull: op.mull, tran: op.tran || [], rev: 0.2 });
      if (!op.door) K.rbox(R, PIER, op.s0 - 0.05, op.y0 - 0.08, 0, op.s1 + 0.05, op.y0, 0.05, { detail: true }); // sill
      if (op.bal) { // cantilevered slab + pipe rail (top, mid, bars) on three sides, centred in the bay
        const a = op.bc - 1.25, b = op.bc + 1.25, y = op.fy, D = 1.1;
        K.rbox(R, PIER, a, y - 0.25, 0, b, y, D);
        K.rbox(R, RAIL, a, y + 1.0, D - 0.05, b, y + 1.05, D, { detail: true }); K.rbox(R, RAIL, a, y + 0.5, D - 0.04, b, y + 0.53, D - 0.01, { detail: true });
        for (const e of [a + 0.02, b - 0.02]) { K.rbox(R, RAIL, e - 0.025, y + 1.0, 0.02, e + 0.025, y + 1.05, D, { detail: true }); K.rbox(R, RAIL, e - 0.025, y, D - 0.05, e + 0.025, y + 1.0, D, { detail: true }); }
        for (let s = a + 0.13; s < b - 0.08; s += 0.13) K.rbox(R, RAIL, s - 0.012, y, D - 0.035, s + 0.012, y + 1.0, D - 0.01, { detail: true });
        for (const e of [a + 0.02, b - 0.02]) for (let dd = 0.15; dd < D - 0.1; dd += 0.13) K.rbox(R, RAIL, e - 0.012, y, dd - 0.012, e + 0.012, y + 1.0, dd + 0.012, { detail: true });
      }
    }
    // full-height piers at every bay line + faint floor joints on the panels
    for (let i = 0; i <= nb; i++) { const s = s0 + i * bw; K.rbox(R, PIER, s - (i === 0 ? 0 : 0.18), yB, 0, s + (i === nb ? 0 : 0.18), top, 0.5); }
    if (!o.blank) for (const fy of floors.slice(1)) K.rbox(R, PANEL, s0, fy - 0.03, 0, s1, fy - 0.01, 0.012, { detail: true }); // faint floor reveal
    return { nb, bw };
  };
  // ---- flat roof slab with ~1.1 m overhang, white fascia and a ribbed soffit (ribs every 0.7 m across the overhang)
  const roof = (u0, v0, u1, v1, y, ov = 1.6, ribsOn = { S: 1, E: 1, N: 1, W: 1 }) => {
    K.box(SOFF, u0 - ov, y - 0.27, v0 - ov, u1 + ov, y - 0.05, v1 + ov);
    K.box(ROOF, u0 - ov + 0.25, y - 0.05, v0 - ov + 0.25, u1 + ov - 0.25, y, v1 + ov - 0.25);
    const runs = { S: K.run([u0 - ov, v1 + ov], [u1 + ov, v1 + ov]), E: K.run([u1 + ov, v1 + ov], [u1 + ov, v0 - ov]), N: K.run([u1 + ov, v0 - ov], [u0 - ov, v0 - ov]), W: K.run([u0 - ov, v0 - ov], [u0 - ov, v1 + ov]) };
    for (const f in runs) {
      const R = runs[f]; K.rbox(R, PIER, -0.02, y - 0.29, 0, R.L + 0.02, y + 0.03, 0.05); // thin white fascia (~0.3 m)
      if (!ribsOn[f]) continue;
      for (let s = ov + 0.3; s < R.L - ov; s += 0.6) K.rbox(R, SOFF, s - 0.05, y - 0.27 - 0.2, -ov, s + 0.05, y - 0.27, -0.02, { detail: true });
    }
  };

  // ================= north studio wing (u -43.94..22.2, v -35.43..-17.5), roof +20.8 =================
  const NW = { u0: -43.94, u1: 22.2, v0: -35.43, v1: -17.5, y: 20.8 };
  const topN = NW.y - 0.42;
  face(K.run([NW.u1, NW.v0], [NW.u0, NW.v0]), 0, NW.u1 - NW.u0, topN, { balc: true, glazed: true, lowWin: true });   // north (path side)
  face(K.run([NW.u0, NW.v1], [NW.u1, NW.v1]), 0, -5.8 - NW.u0, topN, { floors: [YE - 4.6, ...FL] });     // south (courtyard), west of the east wing
  { const R = K.run([NW.u0, NW.v0], [NW.u0, NW.v1]); K.wall(R, BLANK, 0, R.L, -1.2, topN, [], 0.4);                 // west end: blank wall
    for (const s of [0.18, R.L - 0.18]) K.rbox(R, PIER, s - 0.18, -1.2, 0, s + 0.18, topN, 0.3); }
  { const R = K.run([NW.u1, NW.v1 - 0.3], [NW.u1, NW.v0]); K.wall(R, BLANK, 0, R.L, -1.2, topN, [], 0.4);             // east end: blank wall facing College Ave
    for (const s of [0.18, R.L - 0.18]) K.rbox(R, PIER, s - 0.18, -1.2, 0, s + 0.18, topN, 0.3); }
  { const R = K.run([19.75, -17.8], [22.2, -17.8]); K.wall(R, BLANK, 0, R.L, YE - 1.2, topN, [], 0.4); }               // notch north side
  roof(NW.u0, NW.v0, NW.u1, NW.v1, NW.y, 1.6, { S: 1, E: 1, N: 1, W: 1 });
  K.box(M.concreteDark, NW.u0 + 0.5, -1.2, NW.v0 + 0.5, NW.u1 - 0.5, topN, NW.v1 - 0.2);
  colliders.push(K.colPoly([[NW.u0, NW.v0], [NW.u1, NW.v0], [NW.u1, NW.v1], [NW.u0, NW.v1]], -5, NW.y + 1));

  // ================= east wing (u -5.8..25.3, v -14.5..25.65 + connector), roof +19.5 =================
  const EW = { u0: -5.8, u1: 25.3, v0: -14.5, v1: 25.65, y: 19.5 };
  const topE = EW.y - 0.42;
  face(K.run([EW.u1, EW.v1], [EW.u1, EW.v0]), 0, EW.v1 - EW.v0, topE, { glazed: true, balc: true, doorBay: 5 });    // east: College Ave walk
  face(K.run([EW.u0, EW.v0 - 3.0], [EW.u0, EW.v1]), 0, EW.v1 - EW.v0 + 3.0, topE, { floors: [YE - 4.6, ...FL] }); // west (courtyard)
  face(K.run([EW.u0, EW.v1], [EW.u1, EW.v1]), 0, EW.u1 - EW.u0, topE, { floors: FL, skip: (b0, b1, fy) => b1 < SB_U1 - EW.u0 + 0.5 && fy < 13.2 }); // south: above the museum block / canopy
  // the recessed entrance in the notch (faces east, u = 19.75, v -17.8..-14.5): green-framed glazed vestibule + canopy lip
  { const R = K.run([19.75, -14.5], [19.75, -17.8]); const o = { s0: 0.25, s1: R.L - 0.25, y0: YE + 0.02, y1: YE + 3.6 };
    K.wall(R, BLANK, 0, R.L, YE - 1.2, topE, [o], 0.3); K.fill(R, { ...o, sill: false }, { glass: GL, frame: DOOR, mull: 2, tran: [YE + 2.5], rev: 0.15 });
    const Rn = K.run([EW.u1, EW.v0], [19.75, EW.v0]); K.wall(Rn, PANEL, 0, Rn.L, YE - 1.2, topE, [], 0.3); // notch south side
    K.box(PIER, 19.75, YE + 3.9, -17.8, 22.2, YE + 4.15, -14.5); }
  roof(EW.u0, EW.v0, EW.u1, EW.v1, EW.y, 1.6, { S: 0, E: 1, N: 0, W: 1 });
  K.box(M.concreteDark, EW.u0 + 0.5, -1.2, EW.v0 - 2.8, EW.u1 - 0.5, topE, EW.v1 - 0.5);
  // four skylight monitors (east-west strips over the galleries/studios), glazed slope facing north
  for (const v of [-9.5, -3.5, 2.5, 8.5]) {
    const u0 = 1.0, u1 = 17.0, y0 = EW.y;
    K.box(PIER, u0, y0, v - 1.2, u1, y0 + 0.5, v + 1.2);
    const g = new THREE.BufferGeometry(); const P = [[u0, y0 + 0.5, v - 1.2], [u1, y0 + 0.5, v - 1.2], [u1, y0 + 1.6, v + 1.2], [u0, y0 + 1.6, v + 1.2]];
    g.setAttribute('position', new THREE.Float32BufferAttribute([...P[0], ...P[2], ...P[1], ...P[0], ...P[3], ...P[2]], 3)); g.computeVertexNormals();
    K.add(SKY, g); K.box(PIER, u0, y0 + 0.5, v + 1.05, u1, y0 + 1.62, v + 1.2);
    for (const uu of [u0, u1]) { const t = new THREE.BufferGeometry(); const a = uu === u0 ? [[uu, y0 + 0.5, v + 1.2], [uu, y0 + 1.6, v + 1.2], [uu, y0 + 0.5, v - 1.2]] : [[uu, y0 + 0.5, v - 1.2], [uu, y0 + 1.6, v + 1.2], [uu, y0 + 0.5, v + 1.2]]; t.setAttribute('position', new THREE.Float32BufferAttribute(a.flat(), 3)); t.computeVertexNormals(); K.add(PIER, t); }
  }
  // rooftop plant boxes
  K.box(M.concreteDark, 0, EW.y, 16, 4, EW.y + 1.2, 19);
  colliders.push(K.colPoly([[EW.u0, EW.v0 - 3], [19.75, EW.v0 - 3], [19.75, EW.v0], [EW.u1, EW.v0], [EW.u1, EW.v1], [EW.u0, EW.v1]], -5, EW.y + 1));

  // ================= museum block on Bancroft (u -15..14.51, v 25.65..49.5), roof +12.8 =================
  const SB = { u0: -15.0, u1: 14.51, v0: 25.65, v1: 49.5, y: 12.8 };
  const topS = SB.y - 0.42;
  { // south: piers, blank panels, a glazed lobby in the middle bays at plaza level, sign band above
    const R = K.run([SB.u0, SB.v1], [SB.u1, SB.v1]);
    const r = face(R, 0, R.L, topS, { floors: [YE], glazed: true, blankBays: [0, 1, 2, 5, 6, 7] });
    const s0 = 2 * r.bw - 0.3, s1 = 6 * r.bw + 0.3; K.rbox(R, BLANK, s0 - 0.1, YE + 5.0, 0.3, s1 + 0.1, YE + 6.3, 0.56);
    signPanel(K, R, s0, s1, YE + 5.1, YE + 6.2, 0.575, 'PHOEBE A. HEARST MUSEUM OF ANTHROPOLOGY');
  }
  face(K.run([SB.u0, SB.v0], [SB.u0, SB.v1]), 0, SB.v1 - SB.v0, topS, { blank: true });                                      // west (blank museum wall)
  face(K.run([SB.u1, SB.v1], [SB.u1, SB.v0]), 0, SB.v1 - SB.v0, topS, { floors: [YE], glazed: true, blankBays: [0, 5, 6] });  // east (under the canopy)
  face(K.run([EW.u0, SB.v0], [SB.u0, SB.v0]), 0, EW.u0 - SB.u0, topS, { blank: true });                                      // north stub west of the east wing
  roof(SB.u0, SB.v0, SB.u1, SB.v1, SB.y, 1.3, { S: 1, E: 0, N: 1, W: 1 });
  K.box(M.concreteDark, SB.u0 + 0.5, -1.2, SB.v0 + 0.3, SB.u1 - 0.5, topS, SB.v1 - 0.5);
  colliders.push(K.colPoly([[SB.u0, SB.v0], [SB.u1, SB.v0], [SB.u1, SB.v1], [SB.u0, SB.v1]], -5, SB.y + 1));

  // canopy along the museum's College Ave side (OSM roof layer 1): thin slab on slender steel columns
  { const u0 = SB.u1, u1 = 22.6, v0 = EW.v1, v1 = 60.8, y = 8.7;
    K.box(SOFF, u0, y - 0.3, v0, u1, y, v1); K.box(ROOF, u0 + 0.2, y, v0 + 0.2, u1 - 0.2, y + 0.04, v1 - 0.2);
    const R = K.run([u1, v1], [u1, v0]); K.rbox(R, PIER, 0, y - 0.38, 0, R.L, y + 0.05, 0.05);
    for (let v = v0 + 4; v < v1 - 0.5; v += 5.2) { const g = K.g(u1 - 0.6, v); K.box(FR, u1 - 0.72, g - 0.3, v - 0.1, u1 - 0.52, y - 0.3, v + 0.1); colliders.push(K.colCyl(u1 - 0.62, v, 0.15, g - 1, y)); } }

  // raised plaza on Bancroft (v 49.5..60.8) behind a retaining/seat wall, steps down to the sidewalk at its east end
  { const u0 = -14.2, u1 = 14.3, v0 = SB.v1, v1 = 60.8, y = YE;
    K.box(M.paving, u0, y - 0.6, v0, u1, y, v1);
    walkables.push(K.walkPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], y));
    const WALL = BLANK, st0 = 6.5, st1 = 11.0;
    const wallRun = (a, b, skip) => { const R = K.run(a, b); let gmin = Infinity; for (let s = 0; s <= R.L; s += 1) { const [uu, vv] = R.at(s, 0.5); gmin = Math.min(gmin, K.g(uu, vv)); }
      const segs = skip ? [[0, skip[0]], [skip[1], R.L]] : [[0, R.L]];
      for (const [a0, a1] of segs) { K.rbox(R, WALL, a0, gmin - 1, -0.4, a1, y + 0.45, 0); K.rbox(R, PIER, a0 - 0.03, y + 0.45, -0.45, a1 + 0.03, y + 0.52, 0.05); } return R; };
    wallRun([u0, v1], [u1, v1], [st0 - u0, st1 - u0]); wallRun([u0, v0], [u0, v1]);
    colliders.push(K.colPoly([[u0, v1 - 0.4], [st0, v1 - 0.4], [st0, v1], [u0, v1]], -5, y + 0.5), K.colPoly([[st1, v1 - 0.4], [u1, v1 - 0.4], [u1, v1], [st1, v1]], -5, y + 0.5), K.colPoly([[u0, v0], [u0 + 0.4, v0], [u0 + 0.4, v1], [u0, v1]], -5, y + 0.5));
    const gS = K.g((st0 + st1) / 2, v1 + 2.4); const n = Math.max(2, Math.round((y - gS) / 0.16));
    if (y - gS > 0.25) walkables.push(K.stairs(M.paving, st0, v1, st1, v1 + n * 0.32, gS, y, '-v', n));
  }
  // paved apron along the College Ave façade and into the entrance recess (concrete with brick bands, photos)
  { const BR = tint(K, M.brick, 0xa35a4c, 'kr-brick');
    drapeStrip(K, [[EW.u1, EW.v1 + 2], [EW.u1, -18.2]], 4.4, M.paving, { closed: false, lift: 0.05 });
    drapeStrip(K, [[19.75, -14.5], [19.75, -17.8]], 5.55, M.paving, { closed: false, lift: 0.05 }); // entrance recess floor
    for (const v of [-16.2, 4.8, 24.0]) drapeStrip(K, [[EW.u1, v + 0.25], [EW.u1, v - 0.25]], 4.4, BR, { closed: false, lift: 0.07 }); }
  // planting bed + benches along the College Ave façade (agapanthus-type strap-leaf beds)
  { const PL = tint(K, M.turf, 0x3d5c33, 'kr-plant');
    for (const [va, vb] of [[-12.6, 3.0], [8.2, 24.6]]) { K.box(PIER, EW.u1 + 0.3, YE - 0.4, va, EW.u1 + 1.65, YE + 0.42, vb); shrubRow(K, [EW.u1 + 0.98, vb], [EW.u1 + 0.98, va], 0, { h: 1.15, w: 1.0, gap: 0.1, mat: PL }); }
    for (const va of [-8, 12, 18]) K.box(M.concreteDark, EW.u1 + 2.2, YE, va, EW.u1 + 2.75, YE + 0.45, va + 2.4); }

  const object3d = K.finish();
  return { object3d, colliders, walkables };
}

// sans-serif bronze lettering on a light ground (canvas texture plane) at outward offset d on run R
function signPanel(K, R, s0, s1, y0, y1, d, text) {
  const W = 2048, H = Math.max(64, Math.round(W * (y1 - y0) / (s1 - s0)));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#d7d0c1'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#4a4d4b'; g.textBaseline = 'middle'; let px = Math.round(H * 0.62); g.font = `600 ${px}px Helvetica, Arial, sans-serif`;
  while (g.measureText(text).width > W * 0.94 && px > 10) { px -= 2; g.font = `600 ${px}px Helvetica, Arial, sans-serif`; }
  const w = g.measureText(text).width; g.fillText(text, (W - w) / 2, H / 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  const geo = new THREE.PlaneGeometry(s1 - s0, y1 - y0); geo.translate((s0 + s1) / 2, (y0 + y1) / 2, d);
  K.addRun(R, mat, geo, { uvMode: 'keep' });
}
