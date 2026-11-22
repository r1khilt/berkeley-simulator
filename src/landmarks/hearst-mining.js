// Hearst Memorial Mining Building (John Galen Howard with Julia Morgan, 1902–1907).
// Massing fitted to the 2021 USGS LiDAR (the OSM outline follows the eave line, so walls sit ~1.6 m inside it):
// granite walls on a rusticated base, deep red-tile eaves on timber brackets, a tall central pavilion on the
// south front with three great arches (each with a pair of Tuscan columns, wreathed medallions between them,
// six corbel figures under the brackets), three skylit domes over the memorial vestibule, two narrow light
// courts, a north-south spine block, the roof's independent chimney stacks and the 1998–2003 north addition.
import * as THREE from 'three';
import { Kit } from './lib/beaux-kit.js';
import { rnMats } from './lib/rn-kit.js';

export const info = {
  id: 'hearst-mining',
  name: 'Hearst Memorial Mining Building',
  subtitle: 'John Galen Howard · 1907',
  blurb: 'Phoebe Apperson Hearst paid for this Beaux-Arts building in memory of her husband, Senator George Hearst, who made his fortune in mining; it was dedicated on August 23, 1907. Behind the three great arches of its south front, Guastavino-tiled domes 50 feet up light the memorial vestibule, and a 1998–2003 seismic retrofit set the whole building on an isolation platform that allows up to a metre of sideways travel.',
  replaces: ['way/24024353'],
};

const TH = -16.5;

export async function build(ctx) {
  const { M } = ctx;
  const k = new Kit(ctx, TH);
  const colliders = [], walkables = [];
  const stone = M.granite.clone(), rust = M.ashlar.clone(), dark = M.graniteDark, wood = M.woodDark, tile = M.redTile.clone();
  tile.color.setRGB(0.93, 0.88, 0.86); // slightly less saturated terracotta
  const hedge = rnMats(M).leafA;
  stone.color.setRGB(1.06, 1.06, 1.05); stone.name = 'hearstGranite'; rust.map = M.granite.map; rust.color.setRGB(1.04, 1.04, 1.03); rust.name = 'hearstRustication';
  const OV = 1.6;                                                   // eave overhang (OSM traces the eaves)
  const R = { u0: -27.6, u1: 27.3, v0: -25.7, v1: 33.6 };           // roof outline of the historic block
  const W = { u0: R.u0 + OV, u1: R.u1 - OV, v0: R.v0 + OV, v1: R.v1 - OV }; // wall line
  const P = { u0: -13.0, u1: 11.65, v1: 32.8, v0: 19.0 };           // central pavilion walls
  const CTR = (P.u0 + P.u1) / 2;
  const yF = -1.5, yEave = 13.4, yBase = 5.0;
  const g0 = k.groundMin([[W.u0, W.v1], [W.u1, W.v1], [CTR, P.v1]]);
  // [r5-audit-north] entrance floor: photos show the three-arch portal raised ~1.5 m on its podium above the Mining Circle
  // forecourt, up a broad flight of ~9-10 granite steps (it was g0 + 0.7, which read as doors at grade behind one step)
  const EF = Math.max(g0 + 0.7, k.ground(CTR, P.v1 + 6.0) + 1.5);

  // core volumes (closed boxes behind the façades)
  // (split around the two light courts so they stay open to the sky)
  for (const [u0, u1, v0, v1] of [[W.u0 + 0.5, -12.5, W.v0 + 0.5, W.v1 - 0.5], [12.5, W.u1 - 0.5, W.v0 + 0.5, W.v1 - 0.5], [-12.5, 12.5, W.v0 + 0.5, -4.5], [-12.5, 12.5, 11.5, W.v1 - 0.5], [-8.5, 9.5, -4.5, 11.5]])
    k.box(stone, u0, u1, yF, yEave - 0.2, v0, v1);

  // Side.wall() can't take openings stacked in the same column (the later one's left filler box swaps into a solid block that
  // fills the column), so split stacked windows into horizontal bands, one wall slab per row of openings. (refine-north fix:
  // the wings were rendering with blind upper storeys.)
  const bandWall = (F, mat, s0, s1, y0, y1, thick, ops) => {
    const rows = []; for (const o of ops.slice().sort((a, b) => a.y0 - b.y0)) { const r = rows.find((q) => Math.abs(q.y0 - o.y0) < 0.05 && Math.abs(q.y1 - o.y1) < 0.05); if (r) r.ops.push(o); else rows.push({ y0: o.y0, y1: o.y1, ops: [o] }); }
    if (rows.length <= 1) { F.wall(mat, s0, s1, y0, y1, thick, ops); return; }
    let lo = y0; rows.forEach((r, i) => { const hi = i === rows.length - 1 ? y1 : (r.y1 + rows[i + 1].y0) / 2; F.wall(mat, s0, s1, lo, hi, thick, r.ops); lo = hi; });
  };
  // ---------- generic wing façade: rusticated base + two window storeys + bracketed eave ----------
  const wingFace = (F, s0, s1, { courts = [] } = {}) => {
    const n = Math.max(1, Math.round((s1 - s0) / 3.7)), bw = (s1 - s0) / n;
    const lo = [], hi1 = [], hi2 = [];
    for (let i = 0; i < n; i++) {
      const c = s0 + (i + 0.5) * bw;
      lo.push({ s0: c - 0.75, s1: c + 0.75, y0: 2.5, y1: 4.4, arch: true });
      hi1.push({ s0: c - 0.85, s1: c + 0.85, y0: 6.0, y1: 8.9 });
      hi2.push({ s0: c - 0.85, s1: c + 0.85, y0: 9.9, y1: 12.1 });
    }
    F.wall(rust, s0, s1, yF, yBase, 0.7, lo);
    F.moulding(stone, s0, s1, yBase, [[0.18, 0.2], [0.22, 0.32]]);
    bandWall(F, stone, s0, s1, yBase + 0.4, yEave, 0.7, [...hi1, ...hi2]);
    for (const o of lo) F.window(o.s0, o.s1, o.y0, o.y1, { arch: true, mullions: 1, depth: 0.4 });
    for (const o of [...hi1, ...hi2]) { F.window(o.s0, o.s1, o.y0, o.y1, { mullions: 1, transoms: [o.y1 - 0.8], depth: 0.4 }); F.box(stone, o.s0 - 0.12, o.s1 + 0.12, o.y0 - 0.18, o.y0, 0, 0.12); }
    F.moulding(stone, s0, s1, 9.25, [[0.12, 0.08], [0.18, 0.16]]);          // string course
    F.box(stone, s0, s1, 12.45, 12.75, -0.3, 0.16);                          // frieze band under the eave
    F.repeat(wood, s0 + 0.3, s1 - 0.3, 1.25, 0.24, 12.75, yEave, 0.0, OV - 0.15); // timber eave brackets
    F.repeat(wood, s0 + 0.3, s1 - 0.3, 1.25, 0.24, 12.35, 12.8, 0.0, 0.55);
  };
  // west + east (full length), north (corners), south wings (either side of the pavilion)
  { const F = k.side('W', W.u0); wingFace(F, F.s(W.v0), F.s(W.v1)); }
  { const F = k.side('E', W.u1); wingFace(F, F.s(W.v1), F.s(W.v0)); }
  { const F = k.side('S', W.v1); wingFace(F, W.u0, P.u0 - 0.2); wingFace(F, P.u1 + 0.2, W.u1); }
  { const F = k.side('N', W.v0); wingFace(F, F.s(W.u1), F.s(21.2)); wingFace(F, F.s(-18.8), F.s(W.u0)); }

  // ---------- roofs: perimeter wings with hips, light courts left open ----------
  const COURTS = [[-12.5, -8.5], [9.5, 12.5]], CV = [-4.5, 11.5];
  k.hipRoof(tile, R.u0, -12.5, R.v0, R.v1, yEave, 0.5, 17.3, { soffit: wood });
  k.hipRoof(tile, 12.5, R.u1, R.v0, R.v1, yEave, 0.5, 17.3, { soffit: wood });
  k.hipRoof(tile, R.u0, R.u1, R.v0, CV[0], yEave, 0.5, 16.9, { soffit: wood });
  k.hipRoof(tile, R.u0, R.u1, CV[1], R.v1, yEave + 0.2, 0.45, 17.5, { soffit: wood });
  // light-court walls (rise to the deck so the courts read as deep slots)
  for (const [a, b] of COURTS) {
    for (const [nm, at, s0f, s1f] of [['E', a, CV[1], CV[0]], ['W', b, CV[0], CV[1]], ['S', CV[0], a, b], ['N', CV[1], b, a]]) {
      const F = k.side(nm, at); const s0 = Math.min(F.s(s0f), F.s(s1f)), s1 = Math.max(F.s(s0f), F.s(s1f));
      const n = Math.max(1, Math.round((s1 - s0) / 3.2)), ops = [];
      for (let i = 0; i < n; i++) { const c = s0 + (i + 0.5) * (s1 - s0) / n; for (const y0 of [3.0, 7.0, 11.0]) ops.push({ s0: c - 0.6, s1: c + 0.6, y0, y1: y0 + 2.2 }); }
      bandWall(F, M.brick, s0, s1, yF, 16.9, 0.5, ops);
      for (const o of ops) F.window(o.s0, o.s1, o.y0, o.y1, { mullions: 1, depth: 0.3 });
    }
  }
  // N–S spine between the courts: gable roof with a ridge skylight
  k.box(stone, -8.0, 9.0, yEave - 1, 14.3, -14.0, 19.0);
  k.gableRoof(tile, -8.4, 9.4, -14.0, 19.0, 14.3, 19.0, 'v', { soffit: wood });
  k.gableRoof(M.glass, -0.6, 1.6, -12.0, 17.0, 18.6, 19.4, 'v', { soffit: stone });
  // north spine block + ridge monitor + chimney
  k.box(stone, -8.0, 9.0, yF, 18.0, -36.0, -14.0);
  k.box(stone, -8.3, 9.3, 18.0, 18.6, -36.3, -14.0);
  k.gableRoof(tile, -3.0, 5.0, -36.3, -16.0, 18.6, 21.6, 'v', { soffit: stone });
  for (const [nm, at] of [['N', -36.3], ['S', -16.0]]) { const F = k.side(nm, at); const tri = new THREE.Shape(); tri.moveTo(-4, 18.6); tri.lineTo(4, 18.6); tri.lineTo(0, 21.6); tri.lineTo(-4, 18.6); const g = new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false }); g.translate(nm === 'N' ? -1.0 : 1.0, 0, -0.3); F.geom(stone, g); }
  k.box(stone, -2.4, 0.6, 17.0, 25.5, -30.0, -27.5);
  k.box(stone, -2.6, 0.8, 25.1, 25.5, -30.2, -27.3);
  // 1998–2003 north addition (aluminium-clad, flat roof)
  for (const [u0, u1] of [[-18.8, -8.0], [9.0, 21.15]]) {
    k.box(M.concrete, u0, u1, yF, 13.3, -36.4, W.v0);
    const F = k.side('N', -36.4); const s0 = F.s(u1), s1 = F.s(u0);
    for (const y0 of [3.0, 7.2, 10.6]) F.box(M.glass, s0 + 0.6, s1 - 0.6, y0, y0 + 1.8, 0, 0.04);
    for (let s = s0 + 0.6; s <= s1 - 0.5; s += 1.5) F.box(M.iron, s - 0.05, s + 0.05, 2.5, 12.8, 0, 0.12, { detail: true });
  }
  colliders.push({ type: 'poly', pts: k.polyLocal([[-18.8, -36.4], [21.15, -36.4], [21.15, W.v0], [-18.8, W.v0]]), y0: -3, y1: 22 });

  // ---------- chimney stacks on the wings ("vents and chimneys built independent of the shell") ----------
  // stair/vent towers at the north ends of the light courts (LiDAR ~19 m)
  for (const [u0, u1] of [[-13.5, -7.2], [8.2, 14.5]]) { k.box(stone, u0, u1, yEave - 1, 18.6, -11.2, -4.6); k.box(stone, u0 - 0.2, u1 + 0.2, 18.6, 18.95, -11.4, -4.4); }
  const stacks = [];
  for (const v of [-6, 6.5]) for (const [u0, u1] of [[-22.4, -20.4], [19.2, 21.2]]) stacks.push([u0, u1, v - 0.6, v + 0.6, 18.4]);
  
  for (const [u0, u1, v0, v1, h] of stacks) {
    k.box(stone, u0, u1, 15.0, h, v0, v1);
    k.box(stone, u0 - 0.15, u1 + 0.15, h, h + 0.4, v0 - 0.15, v1 + 0.15);
  }

  // ---------- central pavilion: memorial vestibule ----------
  const yPE = 16.6;
  k.box(stone, P.u0 + 0.5, P.u1 - 0.5, yF, yPE, P.v0, P.v1 - 1.25); // core sits behind the arch glazing (0.8 m) and doors (0.85 m)
  k.box(M.concreteDark, P.u0 + 0.9, P.u1 - 0.9, yF, yPE - 0.4, P.v1 - 1.3, P.v1 - 1.2); // dark vestibule back face seen through the glass
  {
    const F = k.side('S', P.v1);
    const aw = 5.3, pier = 1.9, arches = [-1, 0, 1].map((i) => CTR + i * (aw + pier));
    const ops = arches.map((c) => ({ s0: c - aw / 2, s1: c + aw / 2, y0: EF, y1: 13.4, arch: true }));
    F.wall(rust, P.u0, P.u1, yF, EF + 2.5, 0.9, ops.map((o) => ({ ...o, arch: false, y1: EF + 2.5 })));
    F.wall(stone, P.u0, P.u1, EF + 2.5, yPE, 0.9, ops.map((o) => ({ ...o, y0: EF + 2.5 })));
    for (const o of ops) {
      const c = (o.s0 + o.s1) / 2, r = aw / 2, ys = o.y1 - r;
      // golden-oak doors under a transom, glazing above, framed by a pair of Tuscan columns carrying a lintel
      F.box(M.wood, o.s0 + 1.1, o.s1 - 1.1, o.y0, o.y0 + 3.3, -0.85, -0.75);
      F.box(wood, c - 0.04, c + 0.04, o.y0, o.y0 + 3.3, -0.75, -0.7, { detail: true });
      F.window(o.s0, o.s1, o.y0 + 4.3, o.y1, { arch: true, mullions: 3, transoms: [o.y0 + 6.5, ys], depth: 0.8 });
      for (const sx of [o.s0 + 0.55, o.s1 - 0.55]) F.column(stone, sx, o.y0, o.y0 + 3.9, 0.55, { tc: -0.3, fluted: false, style: 'tuscan' });
      F.box(stone, o.s0, o.s1, o.y0 + 3.9, o.y0 + 4.3, -0.9, -0.05);           // lintel / entablature
      const ring = new THREE.Shape(); ring.absarc(c, ys, r + 0.45, 0, Math.PI, false); ring.lineTo(c - r, ys); ring.absarc(c, ys, r, Math.PI, 0, true); ring.lineTo(c + r + 0.45, ys);
      F.shape(stone, ring, 0, 0.14, { detail: true });                          // archivolt
      F.box(stone, c - 0.35, c + 0.35, o.y1 - 0.2, o.y1 + 0.75, 0, 0.25, { detail: true }); // keystone
    }
    // wreathed medallions in the spandrels
    for (const c of [arches[0] - aw / 2 - 0.95, arches[2] + aw / 2 + 0.95]) { // two large carved roundels on the outer spandrels
      const g = new THREE.TorusGeometry(0.72, 0.16, 8, 28); g.translate(c, 12.6, 0.14); F.geom(stone, g, { detail: true });
      F.geom(stone, new THREE.CylinderGeometry(0.58, 0.58, 0.16, 28).rotateX(Math.PI / 2).translate(c, 12.6, 0.08), { detail: true });
      const w = new THREE.TorusGeometry(0.95, 0.09, 6, 28); w.translate(c, 12.6, 0.1); F.geom(stone, w, { detail: true }); // wreath ring
    }
    // frieze, six corbel figures under the eave brackets, deep timber eave
    F.box(stone, P.u0 - 0.2, P.u1 + 0.2, 14.4, 15.3, -0.3, 0.2);
    for (const c of [P.u0 + 0.9, arches[0] + aw / 2 + 0.95, arches[1] - aw / 2 - 0.95, arches[1] + aw / 2 + 0.95, arches[2] - aw / 2 - 0.95, P.u1 - 0.9]) {
      F.box(stone, c - 0.45, c + 0.45, 13.6, 15.6, 0, 0.55);                                    // corbel block
      F.geom(stone, new THREE.SphereGeometry(0.3, 10, 8).translate(c, 15.25, 0.6), { detail: true }); // figure's head
      F.geom(stone, new THREE.CylinderGeometry(0.32, 0.18, 1.3, 10).translate(c, 14.4, 0.62), { detail: true });
      F.box(wood, c - 0.22, c + 0.22, 15.6, yPE + 0.7, 0, OV + 0.2);                          // great bracket
    }
    F.repeat(wood, P.u0 + 0.2, P.u1 - 0.2, 0.9, 0.2, 15.6, yPE + 0.7, 0, OV - 0.1);
    // entrance steps across the arcade
    // broad granite stair across the arcade (refine-north: deeper treads, cheek blocks with lamp standards, brick apron)
    const sA = arches[0] - aw / 2 - 1.2, sB = arches[2] + aw / 2 + 1.2; const gF = Math.min(k.ground(CTR, P.v1 + 6.0), g0); const top = EF;
    const nS = Math.max(3, Math.round((top - gF) / 0.155)); const tr = 0.38; const D0 = 1.2;
    F.box(dark, sA, sB, yF, top, 0, D0);
    for (let i = 0; i < nS; i++) F.box(dark, sA, sB, gF - 1.0, top - ((i + 1) * (top - gF)) / nS, D0 + i * tr, D0 + (i + 1) * tr);
    const D1 = D0 + nS * tr;
    for (const [a0, a1] of [[sA - 1.3, sA], [sB, sB + 1.3]]) { F.box(stone, a0, a1, gF - 1.0, top + 0.95, 0, D1); F.box(stone, a0 - 0.08, a1 + 0.08, top + 0.95, top + 1.12, -0.08, D1 + 0.08);
      const c = (a0 + a1) / 2; F.geom(M.lampGreen, new THREE.CylinderGeometry(0.07, 0.09, 3.0, 10).translate(c, top + 1.12 + 1.5, D1 - 0.65), { detail: true });
      F.geom(M.lampGlow, new THREE.SphereGeometry(0.24, 12, 8).scale(1, 1.25, 1).translate(c, top + 1.12 + 3.25, D1 - 0.65), { detail: true }); }
    { // [r5-audit-north] forecourt apron: bright rust-red brick paving with light concrete edge bands (photos), not the dark wall brick
      const pave = new THREE.MeshStandardMaterial({ color: 0xf2cbb8, roughness: 0.9, map: M.brick.map, normalMap: M.brick.normalMap, roughnessMap: M.brick.roughnessMap });
      // laid in 1 m strips that follow the forecourt's grade (a flat slab at the stair foot sank under the rising lawn)
      for (let t = D1; t < D1 + 6.99; t += 1.0) { const gy = Math.max(gF, k.ground(CTR, P.v1 + t + 0.5)), t1 = Math.min(D1 + 7.0, t + 1.0);
        F.box(pave, sA - 4, sB + 4, gy - 0.4, gy + 0.04, t, t1);
        for (const [a0, a1] of [[sA - 4.45, sA - 4], [sB + 4, sB + 4.45]]) F.box(M.concrete, a0, a1, gy - 0.4, gy + 0.06, t, t1, { detail: true }); }
      { const gy = Math.max(gF, k.ground(CTR, P.v1 + D1 + 7.2)); F.box(M.concrete, sA - 4.45, sB + 4.45, gy - 0.4, gy + 0.06, D1 + 7.0, D1 + 7.45, { detail: true }); } }
    walkables.push({ type: 'poly', pts: k.polyLocal([[sA, P.v1 - 0.9], [sB, P.v1 - 0.9], [sB, P.v1 + D0], [sA, P.v1 + D0]]), y: top });
    { const steps = (x, z) => { const [u, v] = k.uv(x, z); if (u < sA || u > sB || v < P.v1 + D0 - 0.05 || v > P.v1 + D1 + 0.05) return null; const i = Math.min(nS - 1, Math.max(0, Math.floor((v - P.v1 - D0) / tr))); return top - ((i + 1) * (top - gF)) / nS; };
      const cs = [[sA, P.v1 + D0], [sB, P.v1 + D0], [sB, P.v1 + D1], [sA, P.v1 + D1]].map(([u, v]) => k.xz(u, v)); walkables.push({ type: 'fn', bounds: [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))], heightAt: steps }); }
    for (const [a0, a1] of [[sA - 1.3, sA], [sB, sB + 1.3]]) colliders.push({ type: 'poly', pts: k.polyLocal([[a0, P.v1], [a1, P.v1], [a1, P.v1 + D1], [a0, P.v1 + D1]]), y0: gF - 1, y1: top + 1.1 });
    // clipped box hedges along the base of both south wings
    for (const [a0, a1] of [[W.u0 + 0.6, P.u0 - 0.6], [P.u1 + 0.6, W.u1 - 0.6]]) for (let u = a0; u < a1 - 0.4; u += 1.9) {
      const u2 = Math.min(a1, u + 1.8); const gy = k.ground((u + u2) / 2, W.v1 + 1.0); k.box(hedge, u, u2, gy - 0.2, gy + 0.95, W.v1 + 0.45, W.v1 + 1.5, { detail: true }); }
  }
  for (const [nm, at, a, b] of [['W', P.u0, P.v0, P.v1], ['E', P.u1, P.v1, P.v0]]) { // pavilion flanks above the wing roofs
    const F = k.side(nm, at); const s0 = Math.min(F.s(a), F.s(b)), s1 = Math.max(F.s(a), F.s(b));
    F.wall(stone, s0, s1, yEave, yPE, 0.6, [{ s0: s0 + 3, s1: s0 + 4.4, y0: 14.0, y1: 16.0 }, { s0: s1 - 4.4, s1: s1 - 3, y0: 14.0, y1: 16.0 }]);
    F.repeat(wood, s0 + 0.4, s1 - 0.4, 0.9, 0.2, 15.6, yPE + 0.7, 0, OV - 0.1);
  }
  // pavilion roof: tiled slopes to south and north, flat crown carrying three skylit domes, gable fire walls
  const pr = { u0: P.u0 - OV, u1: P.u1 + OV, vs: P.v1 + OV, vn: P.v0 - 0.5 }, yTop = 21.5, yPEv = yPE + 0.8;
  const v25 = pr.vs - (yTop - yPEv) / 0.45, vN = 21.2;
  const tris = [[pr.u0, yPEv, pr.vs], [pr.u1, yPEv, pr.vs], [pr.u1, yTop, v25], [pr.u0, yPEv, pr.vs], [pr.u1, yTop, v25], [pr.u0, yTop, v25],
    [pr.u0, yTop, vN], [pr.u1, yTop, vN], [pr.u1, 19.2, pr.vn], [pr.u0, yTop, vN], [pr.u1, 19.2, pr.vn], [pr.u0, 19.2, pr.vn]];
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3)); rg.computeVertexNormals();
  k.add(tile, rg, { uvMode: 'slope' });
  k.box(M.copper, pr.u0, pr.u1, yTop - 0.3, yTop, vN, v25);
  k.box(wood, pr.u0, pr.u1, yPEv - 0.12, yPEv, P.v1, pr.vs);                       // eave soffit
  for (const u of [-13.2, 14.0]) {
    const F = k.side('W', u);
    const sh = new THREE.Shape(); sh.moveTo(F.s(pr.vs - 0.4), yPE - 0.5); sh.lineTo(F.s(pr.vs - 0.4), yPEv + 0.3); sh.lineTo(F.s(v25), yTop + 1.5); sh.lineTo(F.s(vN), yTop + 1.5); sh.lineTo(F.s(pr.vn), 19.5); sh.lineTo(F.s(pr.vn), yPE - 0.5); sh.lineTo(F.s(pr.vs - 0.4), yPE - 0.5);
    F.shape(stone, sh, -0.55, 0.55);
  }
  const vD = (vN + v25) / 2;
  for (const du of [-8.3, 0, 8.3]) {                                           // three skylit domes
    const cu = CTR + du;
    k.add(M.copper, new THREE.CylinderGeometry(2.25, 2.35, 0.55, 24).translate(cu, yTop + 0.27, vD));
    k.add(M.glassLight, new THREE.SphereGeometry(2.2, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).translate(cu, yTop + 0.55, vD), { uvMode: 'keep' });
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; k.add(M.copper, new THREE.TorusGeometry(2.2, 0.035, 4, 24, Math.PI / 2).scale(1, 0.55, 1).rotateZ(Math.PI / 2).rotateY(a).translate(cu, yTop + 0.55, vD), { detail: true }); }
    k.add(M.copper, new THREE.SphereGeometry(0.22, 10, 8).translate(cu, yTop + 1.75, vD), { detail: true });
  }
  colliders.push({ type: 'poly', pts: k.polyLocal([[W.u0, W.v0], [W.u1, W.v0], [W.u1, W.v1], [P.u1, W.v1], [P.u1, P.v1], [P.u0, P.v1], [P.u0, W.v1], [W.u0, W.v1]]), y0: -3, y1: 22 });

  const [ix, iz] = k.xz(CTR, P.v1 + 3);
  return { object3d: k.finish(), colliders, walkables, interactions: [{ id: 'hearst-vestibule', pos: [ix, EF + 0.8, iz], radius: 5, label: 'Hearst Memorial Mining Building: memorial vestibule' }] };
}
