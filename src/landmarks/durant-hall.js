// Durant Hall (John Galen Howard, 1911): built as Boalt Hall of Law. A compact two-storey granite Beaux-Arts block on a
// plinth, crowned by a full entablature (Greek-key frieze, dentils, modillions) and a low red-tile hip roof.
// Long east/west façades: five bays (single / pair / pair / pair / single) divided by giant pilaster strips, the three
// central ground-floor windows with segmental pediments. The south end has the entrance: a deep doorway under a hood on
// scrolled consoles, flanked by a pair of Chinese guardian lions.
// LiDAR: eaves ~14.7 m above the lowest ground, flat roof deck ~18.3 m.
import * as THREE from 'three';
import { siteDress, baseShrubs } from './lib/rc-finish.js';
import { Kit, corniceProfile } from './lib/classic-kit.js';
import { campusLamp, drapeStrip, shrubRow, paleGlass } from './lib/b05a-kit.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { loadSculpt, sculptMaterial } from '../props/sculpt.js'; // r4-props: baked guardian lions

export const info = {
  id: 'durant-hall',
  name: 'Durant Hall',
  subtitle: 'John Galen Howard · 1911',
  blurb: 'Built in 1911 as Boalt Hall of Law, this granite Beaux-Arts hall was renamed for Henry Durant, the University\'s first president, after the law school moved out in 1951. A pair of Chinese guardian lions flanks its door.',
  replaces: ['w/24025026'],
};

export async function build(ctx) {
  const M = ctx.M; const THREE_ = THREE;
  const ANG = Math.atan2(-15.1 + 9.5, 6.6 + 13.4); // north wall direction (west→east)
  const K = new Kit(ctx, ANG);
  const fp = ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z));
  const u0 = Math.min(...fp.map((p) => p[0])), u1 = Math.max(...fp.map((p) => p[0]));
  const v0 = Math.min(...fp.map((p) => p[1])), v1 = Math.max(...fp.map((p) => p[1]));
  const G = M.marble, GD = M.graniteDark, A = M.marble, FR = M.whitePaint;
  const FL = 2.4, F2 = 7.3, TOP = 12.2, EAVE = 14.6;
  const colliders = [], walkables = [];
  // r4-props: baked lion sculpts [[male, female] hi, [male, female] lo]; null -> old primitive lions
  const lionGeo = await Promise.all([['lion-m', 'lion-f'], ['lion-m-lo', 'lion-f-lo']].map((l) => Promise.all(l.map((n) => loadSculpt(n, { uvScale: 0.5 }))))).catch((e) => { console.warn('durant lions:', e.message); return null; });

  // façade runs (outer face on the footprint line)
  const runs = {
    S: K.run([u0, v1], [u1, v1]), E: K.run([u1, v1], [u1, v0]), N: K.run([u1, v0], [u0, v0]), W: K.run([u0, v0], [u0, v1]),
  };
  const DEP = 0.55;
  const win = (s, y0, y1, w) => ({ s0: s - w / 2, s1: s + w / 2, y0, y1 });

  function storey(R, mat, y0, y1, ops) {
    K.wall(R, mat, 0, R.L, y0, y1, ops, DEP);
  }
  function glaze(R, o, opts = {}) {
    K.fill(R, o, { frame: FR, glass: paleGlass(), mull: 1, tran: [o.y0 + (o.y1 - o.y0) * 0.68], rev: 0.42, ...opts });
    // flat moulded architrave surround
    if (!opts.noSurround) {
      const w = 0.16, p = 0.07;
      K.rbox(R, G, o.s0 - w, o.y0 - 0.05, 0, o.s0, o.y1 + w, p);
      K.rbox(R, G, o.s1, o.y0 - 0.05, 0, o.s1 + w, o.y1 + w, p);
      K.rbox(R, G, o.s0 - w, o.y1, 0, o.s1 + w, o.y1 + w, p);
    }
  }
  // segmental pediment over a ground-floor window (frieze panel + cornice + segmental cap)
  function pediment(R, o) {
    const cx = (o.s0 + o.s1) / 2, w = o.s1 - o.s0 + 0.5;
    K.rbox(R, G, cx - w / 2, o.y1 + 0.16, 0, cx + w / 2, o.y1 + 0.62, 0.16);          // frieze panel
    for (const sx of [-1, 1]) K.rbox(R, G, cx + sx * (w / 2) - 0.14, o.y1 - 0.5, 0, cx + sx * (w / 2) + 0.14, o.y1 + 0.62, 0.26); // consoles
    K.rbox(R, G, cx - w / 2 - 0.18, o.y1 + 0.62, 0, cx + w / 2 + 0.18, o.y1 + 0.8, 0.4); // cornice
    // segmental cap as an extruded arc slab
    const sh = new THREE_.Shape(); const r = w * 0.7, rise = 0.6; const cy = o.y1 + 0.8 + rise - r;
    const a0 = Math.asin((w / 2 + 0.18) / r);
    sh.moveTo(cx - (w / 2 + 0.18), o.y1 + 0.8);
    for (let i = 0; i <= 10; i++) { const a = -a0 + (2 * a0) * i / 10; sh.lineTo(cx + Math.sin(a) * r * 1.0, cy + Math.cos(a) * r); }
    sh.lineTo(cx + (w / 2 + 0.18), o.y1 + 0.8);
    const g = new THREE_.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false, curveSegments: 4 });
    K.addRun(R, G, g);
  }
  // ---------- long façades (E, W): single / pair / pair / pair / single ----------
  for (const f of ['E', 'W']) {
    const R = runs[f]; const L = R.L; const pier = 1.6; const inner = L - 2 * pier;
    const endW = inner * 0.16, midW = (inner - 2 * endW) / 3;
    const centres = [pier + endW / 2, pier + endW + midW / 2, pier + endW + midW * 1.5, pier + endW + midW * 2.5, L - pier - endW / 2];
    const gf = [], uf = [];
    centres.forEach((c, i) => {
      if (i === 0 || i === 4) { gf.push(win(c, FL + 0.95, FL + 3.75, 1.35)); uf.push(win(c, F2 + 0.95, F2 + 3.75, 1.35)); }
      else { gf.push({ ...win(c, FL + 0.8, FL + 3.85, 1.5), ped: true }); uf.push(win(c - 0.95, F2 + 0.95, F2 + 3.75, 1.3), win(c + 0.95, F2 + 0.95, F2 + 3.75, 1.3)); }
    });
    // basement windows in the plinth where the ground falls away
    const bs = centres.map((c) => win(c, 0.35, 1.75, 1.2)).filter((o) => K.g(...R.at((o.s0 + o.s1) / 2, 0.5)) < 0.15);
    if (f === 'W') bs.push({ s0: 6.0, s1: 7.3, y0: Math.max(-0.2, K.g(...R.at(6.6, 0.5)) - 0.05), y1: 2.15, door: true });
    storey(R, G, -1.5, FL, bs); for (const o of bs) K.fill(R, o.door ? { ...o, doorTop: o.y1 } : o, o.door ? { kind: 'door', rev: 0.4, door: M.woodDark, frame: M.darkBronze } : { frame: FR, mull: 1, rev: 0.4, sill: false }); K.rustic(R, 0, R.L, -0.6, FL - 0.25, bs, 0.55, G);
    storey(R, A, FL, F2, gf); storey(R, A, F2, TOP, uf);
    for (const o of gf) { glaze(R, o); if (o.ped) pediment(R, o); }
    for (const o of uf) glaze(R, o);
    // giant pilaster strips between the central bays (water table to architrave)
    for (const s of [pier + endW, pier + endW + midW, pier + endW + midW * 2, pier + endW + midW * 3]) {
      K.rbox(R, G, s - 0.42, FL + 0.25, 0, s + 0.42, TOP, 0.14);
      K.rbox(R, G, s - 0.5, TOP - 0.35, 0, s + 0.5, TOP, 0.2); // capital block
      K.rbox(R, G, s - 0.5, FL + 0.25, 0, s + 0.5, FL + 0.65, 0.2); // base block
    }
  }
  // ---------- short façades (N, S): three bays of paired windows upstairs ----------
  for (const f of ['N', 'S']) {
    const R = runs[f]; const L = R.L; const pier = 1.7; const bw = (L - 2 * pier) / 3;
    const cs = [0, 1, 2].map((i) => pier + bw * (i + 0.5));
    const uf = []; cs.forEach((c) => uf.push(win(c - 0.95, F2 + 0.95, F2 + 3.75, 1.3), win(c + 0.95, F2 + 0.95, F2 + 3.75, 1.3)));
    for (let i = 0; i <= 3; i++) { const s = pier + bw * i; K.rbox(R, G, s - 0.4, F2 + 0.7, 0, s + 0.4, TOP, 0.3); }
    const gf = [];
    const door = { s0: L / 2 - (f === 'S' ? 1.2 : 1.0), s1: L / 2 + (f === 'S' ? 1.2 : 1.0), y0: FL, y1: FL + (f === 'S' ? 4.5 : 3.4), doorTop: FL + (f === 'S' ? 3.1 : 2.5), sill: false };
    if (f === 'N') { gf.push(win(cs[0], FL + 0.95, FL + 3.75, 1.35), win(cs[2], FL + 0.95, FL + 3.75, 1.35)); }
    storey(R, G, -1.5, FL, []); K.rustic(R, 0, R.L, -0.6, FL - 0.25, [], 0.55, G); storey(R, A, FL, F2, [...gf, door]); storey(R, A, F2, TOP, uf);
    for (const o of gf) glaze(R, o); for (const o of uf) glaze(R, o);
    K.fill(R, door, { kind: 'door', rev: 0.5, door: M.woodDark, frame: M.darkBronze });
    // moulded door surround
    const pp = f === 'S' ? 0.5 : 0.12; // portal projects from the wall: deep reveal
    K.rbox(R, G, door.s0 - 0.5, FL, 0, door.s0, door.y1 + 0.45, pp); K.rbox(R, G, door.s1, FL, 0, door.s1 + 0.5, door.y1 + 0.45, pp);
    K.rbox(R, G, door.s0 - 0.5, door.y1, 0, door.s1 + 0.5, door.y1 + 0.45, pp);
    if (f === 'S') { K.rbox(R, G, door.s0 - 0.62, FL, pp, door.s0 - 0.38, door.y1 + 0.45, pp + 0.06); K.rbox(R, G, door.s1 + 0.38, FL, pp, door.s1 + 0.62, door.y1 + 0.45, pp + 0.06); }
    if (f === 'S') {
      // cornice hood on two scrolled consoles
      K.rbox(R, G, door.s0 - 1.0, door.y1 + 0.45, 0, door.s1 + 1.0, door.y1 + 0.85, 1.05);
      K.rbox(R, G, door.s0 - 1.15, door.y1 + 0.85, 0, door.s1 + 1.15, door.y1 + 1.15, 1.2);
      for (const s of [door.s0 - 0.75, door.s1 + 0.75]) {
        K.rbox(R, G, s - 0.2, door.y1 - 1.2, pp, s + 0.2, door.y1 + 0.45, pp + 0.35);
        const g = new THREE_.CylinderGeometry(0.26, 0.26, 0.4, 12); g.rotateZ(Math.PI / 2); g.translate(s, door.y1 + 0.1, pp + 0.5); K.addRun(R, G, g);
        const g2 = new THREE_.CylinderGeometry(0.15, 0.15, 0.4, 10); g2.rotateZ(Math.PI / 2); g2.translate(s, door.y1 - 1.1, pp + 0.3); K.addRun(R, G, g2);
      }
    }
  }
  // ---------- horizontal mouldings and the entablature (all four sides) ----------
  for (const R of Object.values(runs)) {
    K.mould(R, G, 0, R.L, [[0, FL - 0.25], [0.2, FL - 0.2], [0.2, FL + 0.05], [0.1, FL + 0.18], [0, FL + 0.25]]); // water table
    K.mould(R, G, 0, R.L, [[0, F2 + 0.55], [0.1, F2 + 0.58], [0.26, F2 + 0.72], [0.26, F2 + 0.9], [0, F2 + 0.92]]);              // belt course / upper sill band
    K.rbox(R, G, -0.12, TOP, -0.2, R.L + 0.12, TOP + 0.5, 0.12);   // architrave (two fasciae)
    K.rbox(R, G, -0.16, TOP + 0.5, -0.2, R.L + 0.16, TOP + 0.62, 0.16);
    K.rbox(R, G, -0.05, TOP + 0.62, -0.2, R.L + 0.05, TOP + 1.42, 0.05); // frieze
    // Greek-key fret in relief along the frieze (detail)
    const n = Math.floor(R.L / 0.9);
    for (let i = 0; i < n; i++) {
      const s = (R.L - n * 0.9) / 2 + i * 0.9; const y = TOP + 0.76, h = 0.52;
      for (const [a0, b0, a1, b1] of [[0, 0, 0.72, 0.08], [0.64, 0, 0.72, h], [0.18, h - 0.08, 0.72, h], [0.18, 0.18, 0.26, h], [0.18, 0.18, 0.5, 0.26]])
        K.rbox(R, G, s + a0, y + b0, 0.05, s + b1 - (b1 - a1) + (a1 - a0) + 0 * b1, y + b1, 0.11, { detail: true });
    }
    // bed mould, dentils, modillions and a deep corona
    K.rbox(R, G, -0.24, TOP + 1.42, -0.2, R.L + 0.24, TOP + 1.52, 0.24);
    const nd = Math.floor(R.L / 0.3);
    for (let i = 0; i < nd; i++) { const s = (R.L - nd * 0.3) / 2 + i * 0.3 + 0.06; K.rbox(R, G, s, TOP + 1.52, 0.1, s + 0.17, TOP + 1.74, 0.36, { detail: true }); }
    K.rbox(R, G, -0.42, TOP + 1.74, -0.2, R.L + 0.42, TOP + 1.82, 0.42);
    const nm = Math.floor(R.L / 0.62);
    for (let i = 0; i < nm; i++) { const s = (R.L - nm * 0.62) / 2 + i * 0.62 + 0.2; K.rbox(R, G, s, TOP + 1.82, 0.3, s + 0.22, TOP + 2.08, 1.12, { detail: true }); }
    K.mould(R, G, 0, R.L, [[0, TOP + 1.82], [0.42, TOP + 1.82], [0.42, TOP + 2.08], [1.2, TOP + 2.08], [1.2, TOP + 2.36], [1.26, TOP + 2.4], [1.32, TOP + 2.55], [1.32, EAVE + 0.15], [0, EAVE + 0.15]]);
    K.rbox(R, G, 0.3, EAVE + 0.15, -0.6, R.L - 0.3, EAVE + 0.55, -0.1); // low blocking course behind the cornice
  }
  // core
  K.box(M.concreteDark, u0 + 0.7, -1.5, v0 + 0.7, u1 - 0.7, EAVE - 0.05, v1 - 0.7);
  // low red-tile hip roof rising behind the cornice to a flat deck (LiDAR deck ~18.3 m)
  const ri = 1.9; const deck = K.hip(M.redTile, u0 + ri, v0 + ri, u1 - ri, v1 - ri, EAVE + 0.3, 0.46, { yTop: 18.2 });
  const ins = ri + (deck - EAVE - 0.3) / 0.46;
  K.box(M.concreteDark, u0 + ins - 0.02, deck - 0.03, v0 + ins - 0.02, u1 - ins + 0.02, deck + 0.02, v1 - ins + 0.02);
  K.box(M.concreteDark, u0 + 0.3, EAVE - 0.05, v0 + 0.3, u1 - 0.3, EAVE + 0.32, v1 - 0.3);
  colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -1.5, EAVE + 3));

  // ---------- south entrance: steps, guardian lions, lamps ----------
  {
    const R = runs.S; const L = R.L; const sm = L / 2;
    const gl = K.g(0, v1 + 2.5);
    const n = Math.max(2, Math.round((FL - gl) / 0.16));
    const depth = n * 0.34;
    walkables.push(K.stairs(GD, -2.6, v1, 2.6, v1 + depth, gl, FL, '-v', n));
    // landing in front of the door
    K.box(GD, -2.6, FL - 1.2, v1 - 0.05, 2.6, FL, v1 + 0.02);
    // r4-props: guardian-lion pedestals rebuilt after photos: a moulded lower block with a sunk panel, and a waisted
    // xumizuo-style upper tier (cyma mouldings top and bottom). The lions themselves are baked sculpts (see lions below).
    for (const sx of [-1, 1]) {
      const u = sx * 3.9, v = v1 + 1.3; const g0 = K.g(u, v); const P = M.granite;
      K.box(P, u - 0.765, g0 - 0.5, v - 0.915, u + 0.765, g0 + 0.12, v + 0.915);              // plinth band
      K.box(P, u - 0.72, g0 + 0.12, v - 0.87, u + 0.72, g0 + 0.68, v + 0.87);                 // die
      K.loop(P, [[u - 0.72, v - 0.87], [u + 0.72, v - 0.87], [u + 0.72, v + 0.87], [u - 0.72, v + 0.87]], [[0, 0.64 + g0], [0.03, 0.665 + g0], [0.06, 0.68 + g0]]); // bed mould
      K.box(P, u - 0.8, g0 + 0.68, v - 0.95, u + 0.8, g0 + 0.79, v + 0.95);                   // cap
      // sunk panels with a raised fillet on the three visible faces
      for (const [a0, a1, face] of [[u - 0.56, u + 0.56, 'S'], [v - 0.7, v + 0.7, 'E'], [v - 0.7, v + 0.7, 'W']]) {
        const y0 = g0 + 0.22, y1 = g0 + 0.58, w = 0.05, d = 0.018;
        if (face === 'S') { for (const [b0, b1, c0, c1] of [[a0, a1, y0, y0 + w], [a0, a1, y1 - w, y1], [a0, a0 + w, y0, y1], [a1 - w, a1, y0, y1]]) K.box(P, b0, c0, v + 0.87, b1, c1, v + 0.87 + d, { detail: true }); }
        else { const uu = face === 'E' ? u + 0.72 : u - 0.72 - d; for (const [b0, b1, c0, c1] of [[a0, a1, y0, y0 + w], [a0, a1, y1 - w, y1], [a0, a0 + w, y0, y1], [a1 - w, a1, y0, y1]]) K.box(P, uu, c0, b0, uu + d, c1, b1, { detail: true }); }
      }
      // waisted upper tier
      const T = g0 + 0.79; const core = [[u - 0.5, v - 0.62], [u + 0.5, v - 0.62], [u + 0.5, v + 0.62], [u - 0.5, v + 0.62]];
      K.box(P, u - 0.62, T, v - 0.74, u + 0.62, T + 0.07, v + 0.74);
      K.box(P, u - 0.5, T + 0.07, v - 0.62, u + 0.5, T + 0.32, v + 0.62);
      K.loop(P, core, [[0.12, T + 0.07], [0.11, T + 0.095], [0.085, T + 0.125], [0.05, T + 0.15], [0, T + 0.165]]);
      K.loop(P, core, [[0, T + 0.235], [0.05, T + 0.25], [0.085, T + 0.275], [0.1, T + 0.3]]);
      K.box(P, u - 0.6, T + 0.3, v - 0.72, u + 0.6, T + 0.39, v + 0.72);
      if (!lionGeo) lion(u, T + 0.39, v, sx); // fallback when the baked sculpt failed to load
      colliders.push(K.colPoly([[u - 0.8, v - 0.95], [u + 0.8, v - 0.95], [u + 0.8, v + 0.95], [u - 0.8, v + 0.95]], g0 - 0.5, g0 + 3));
    }
    if (lionGeo) { // r4-props: baked SDF sculpts (tools/sculpt/guardian-lion.mjs): male with the ball west, female with the cub east
      const lod = new THREE_.LOD(); lod.name = 'guardian-lions'; lod.userData.keep = true; // keep: mergeStatic must not fuse the LOD levels
      const mat = sculptMaterial(M.granite, { color: 0xd9d5cc }); // same Sierra granite as the pedestals, a shade darker against the wall
      for (const [lvl, dist] of [[0, 0], [1, 45]]) {
        const parts = [-1, 1].map((sx) => { const u = sx * 3.9, v = v1 + 1.3; const g = lionGeo[lvl][sx < 0 ? 0 : 1].clone(); g.scale(1.08, 1.08, 1.08); g.translate(u, K.g(u, v) + 1.18, v); return g; });
        const mesh = new THREE_.Mesh(mergeGeometries(parts, false), mat); mesh.castShadow = mesh.receiveShadow = true; lod.addLevel(mesh, dist);
      }
      K.extra.push(lod);
    }
    campusLamp(K, u0 - 4.5, v1 + 4.5, { h: 4.2 }); campusLamp(K, u1 + 4.5, v0 - 4.0, { h: 4.2 });
    const ring = [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    drapeStrip(K, ring, -2.6, M.asphalt, { lift: 0.05 });
    shrubRow(K, [u0, v0 + 1.5], [u0, v1 - 1.5], -0.9, { h: 0.8 }); shrubRow(K, [u1, v1 - 1.5], [u1, v0 + 1.5], -0.9, { h: 0.8 });
  }
  // north door: a few steps up to the floor
  {
    const gl = K.g(-0.0, v0 - 2.0); const n = Math.max(2, Math.round((FL - gl) / 0.16));
    if (FL - gl > 0.25) walkables.push(K.stairs(GD, -2.0, v0 - n * 0.32, 2.0, v0, gl, FL, '+v', n));
  }
  function lion(u, y, v, sx) { // seated Chinese guardian lion (on its haunches, front legs straight), facing south (+v)
    const S = M.granite;
    const ell = (cx, cy, cz, rx, ry, rz, seg = 10, det = false) => { const g = new THREE_.SphereGeometry(1, seg, Math.max(6, seg - 3)); g.scale(rx, ry, rz); g.translate(cx, cy, cz); K.add(S, g, { detail: det }); };
    K.box(S, u - 0.48, y, v - 0.72, u + 0.48, y + 0.14, v + 0.62);           // carved base slab
    ell(u, y + 0.42, v - 0.28, 0.44, 0.36, 0.42);                              // haunches
    ell(u, y + 0.86, v - 0.02, 0.34, 0.5, 0.3);                                // upright torso / chest
    for (const lx of [-0.17, 0.17]) { K.cyl(S, u + lx, y + 0.14, v + 0.24, 0.1, 0.085, 0.72, 8); K.box(S, u + lx - 0.11, y + 0.14, v + 0.2, u + lx + 0.11, y + 0.26, v + 0.46); }
    ell(u, y + 1.5, v + 0.08, 0.4, 0.38, 0.36, 12);                            // big head
    ell(u, y + 1.52, v - 0.08, 0.47, 0.44, 0.34, 10, true);                    // curled mane mass
    for (let k = 0; k < 7; k++) { const a = Math.PI * (0.15 + 0.7 * k / 6); ell(u + Math.cos(a) * 0.42, y + 1.2 + Math.sin(a) * 0.5, v - 0.12, 0.11, 0.11, 0.11, 6, true); } // mane curls
    K.box(S, u - 0.22, y + 1.32, v + 0.3, u + 0.22, y + 1.52, v + 0.5);        // broad muzzle
    K.box(M.iron, u - 0.15, y + 1.3, v + 0.42, u + 0.15, y + 1.36, v + 0.51, { detail: true }); // open mouth shadow
    ell(u - 0.14, y + 1.62, v + 0.4, 0.07, 0.07, 0.05, 6, true); ell(u + 0.14, y + 1.62, v + 0.4, 0.07, 0.07, 0.05, 6, true); // bulging eyes
    ell(u - sx * 0.3, y + 0.32, v + 0.36, 0.17, 0.17, 0.17, 8);                 // ball under the raised paw
  }
  function lamp(u, v) {
    const g0 = K.g(u, v);
    K.cyl(M.iron, u, g0, v, 0.16, 0.12, 0.6, 10, { detail: true });
    K.cyl(M.iron, u, g0 + 0.6, v, 0.07, 0.055, 3.0, 8, { detail: true });
    K.lathe(M.lampGlow, [[0.05, 0], [0.2, 0.12], [0.24, 0.4], [0.18, 0.62], [0.001, 0.7]], u, g0 + 3.55, v, 10, { detail: true });
    K.cyl(M.iron, u, g0 + 4.2, v, 0.08, 0.02, 0.18, 8, { detail: true });
  }
  // refine-central: planted beds, lamps and a bike rack where the paths arrive
  siteDress(K, ctx, [[u0, v1], [u1, v1], [u1, v0], [u0, v0]], { d: 1.0, skipSides: ['S'] });
  { // r4-props2: the south (entrance) face is planted here instead, so the foundation shrubs stop short of the stairs and the lion pedestals (|u| < 6.3)
    const R = K.run([u0, v1], [u1, v1]); baseShrubs(K, R, 1.2, R.L - 1.2, { skip: [[-u0 - 6.3, -u0 + 6.3]], d: 1.0 });
  }
  const object3d = K.finish(); object3d.name = 'durant-hall';
  return { object3d, colliders, walkables };
}
