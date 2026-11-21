// Hearst Memorial Mining Building (John Galen Howard with Julia Morgan, 1902–1907).
// Massing fitted to the 2021 USGS LiDAR (the OSM outline follows the eave line, so walls sit ~1.6 m inside it):
// granite walls on a rusticated base, deep red-tile eaves on timber brackets, a tall central pavilion on the
// south front with three great arches (each with a pair of Tuscan columns, wreathed medallions between them,
// six corbel figures under the brackets), three skylit domes over the memorial vestibule, two narrow light
// courts, a north-south spine block, the roof's independent chimney stacks and the 1998–2003 north addition.
import * as THREE from 'three';
import { Kit } from './lib/beaux-kit.js';

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
  const stone = M.granite.clone(), rust = M.ashlar.clone(), dark = M.graniteDark, wood = M.woodDark, tile = M.redTile;
  stone.color.setRGB(1.06, 1.06, 1.05); stone.name = 'hearstGranite'; rust.map = M.granite.map; rust.color.setRGB(1.04, 1.04, 1.03); rust.name = 'hearstRustication';
  const OV = 1.6;                                                   // eave overhang (OSM traces the eaves)
  const R = { u0: -27.6, u1: 27.3, v0: -25.7, v1: 33.6 };           // roof outline of the historic block
  const W = { u0: R.u0 + OV, u1: R.u1 - OV, v0: R.v0 + OV, v1: R.v1 - OV }; // wall line
  const P = { u0: -13.0, u1: 11.65, v1: 32.8, v0: 19.0 };           // central pavilion walls
  const CTR = (P.u0 + P.u1) / 2;
  const yF = -1.5, yEave = 13.4, yBase = 5.0;
  const g0 = k.groundMin([[W.u0, W.v1], [W.u1, W.v1], [CTR, P.v1]]);

  // core volumes (closed boxes behind the façades)
  // (split around the two light courts so they stay open to the sky)
  for (const [u0, u1, v0, v1] of [[W.u0 + 0.5, -12.5, W.v0 + 0.5, W.v1 - 0.5], [12.5, W.u1 - 0.5, W.v0 + 0.5, W.v1 - 0.5], [-12.5, 12.5, W.v0 + 0.5, -4.5], [-12.5, 12.5, 11.5, W.v1 - 0.5], [-8.5, 9.5, -4.5, 11.5]])
    k.box(stone, u0, u1, yF, yEave - 0.2, v0, v1);

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
    F.wall(stone, s0, s1, yBase + 0.4, yEave, 0.7, [...hi1, ...hi2]);
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
      F.wall(M.brick, s0, s1, yF, 16.9, 0.5, ops);
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
  k.box(M.brick, -2.4, 0.6, 17.0, 25.5, -30.0, -27.5);
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
  k.box(stone, P.u0 + 0.5, P.u1 - 0.5, yF, yPE, P.v0, P.v1 - 0.5);
  {
    const F = k.side('S', P.v1);
    const aw = 5.3, pier = 1.9, arches = [-1, 0, 1].map((i) => CTR + i * (aw + pier));
    const ops = arches.map((c) => ({ s0: c - aw / 2, s1: c + aw / 2, y0: g0 + 0.7, y1: 13.4, arch: true }));
    F.wall(rust, P.u0, P.u1, yF, g0 + 3.2, 0.9, ops.map((o) => ({ ...o, arch: false, y1: g0 + 3.2 })));
    F.wall(stone, P.u0, P.u1, g0 + 3.2, yPE, 0.9, ops.map((o) => ({ ...o, y0: g0 + 3.2 })));
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
    for (const c of [arches[0] - aw / 2 - 0.7, (arches[0] + arches[1]) / 2, (arches[1] + arches[2]) / 2, arches[2] + aw / 2 + 0.7]) {
      const g = new THREE.TorusGeometry(0.55, 0.13, 6, 18); g.translate(c, 13.0, 0.12); F.geom(stone, g, { detail: true });
      F.geom(M.bronze, new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16).rotateX(Math.PI / 2).translate(c, 13.0, 0.06), { detail: true });
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
    const nS = Math.max(2, Math.round(0.7 / 0.15));
    for (let i = 0; i < nS; i++) F.box(dark, arches[0] - aw / 2 - 0.6, arches[2] + aw / 2 + 0.6, yF, g0 + ((i + 1) * 0.7) / nS, 0, (nS - i) * 0.35);
    walkables.push({ type: 'poly', pts: k.polyLocal([[arches[0] - aw / 2, P.v1 - 0.9], [arches[2] + aw / 2, P.v1 - 0.9], [arches[2] + aw / 2, P.v1 + 0.35], [arches[0] - aw / 2, P.v1 + 0.35]]), y: g0 + 0.7 });
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
  return { object3d: k.finish(), colliders, walkables, interactions: [{ id: 'hearst-vestibule', pos: [ix, g0 + 1.5, iz], radius: 5, label: 'Hearst Memorial Mining Building: memorial vestibule' }] };
}
