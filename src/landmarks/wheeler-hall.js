// Wheeler Hall (John Galen Howard, 1917). Classical Revival, steel frame sheathed in granite.
// South façade: rusticated base with 9 arched entrances, a two-storey giant Ionic colonnaded gallery (7 bays, 6 columns)
// framed by projecting end bays with paired Ionic pilasters and arched windows, an attic set back above the entablature
// with 6 urns over the columns; secondary blocks with tiled hip roofs and quoins. Square plan broken by projecting end bays
// on the east and west elevations; Wheeler Auditorium occupies the low central block (LiDAR: ~10–12 m roof inside a 20 m ring).
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, ionicColumn, pilaster, urn, corniceProfile, balustrade } from './lib/classic-kit.js';

export const info = {
  id: 'wheeler-hall',
  name: 'Wheeler Hall',
  subtitle: 'John Galen Howard · 1917',
  blurb: 'Named for university president Benjamin Ide Wheeler, this granite Classical Revival hall houses Wheeler Auditorium, the largest lecture hall on campus, where Ernest O. Lawrence received his 1939 Nobel Prize in Physics in February 1940.',
  replaces: ['w/1410826203', 'way/1410826203'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.122);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const G = M.granite, GD = M.graniteDark;
  // shaded granite for the deep gallery recess (fakes the ambient occlusion of the loggia)
  const GS = M.granite.clone(); GS.color = new THREE.Color(0x9c978e);
  const FL = 1.4;            // ground-floor / terrace level
  const r5cols = []; // [r5-audit-central] planter colliders (pushed after the main collider list is built)
  const NOSE = new THREE.MeshStandardMaterial({ color: 0x5f5c57, roughness: 0.9 }); NOSE.name = 'wheelerNosingShadow'; // [r5-audit-central]
  const PLANTER = M.concrete, AGA = new THREE.MeshStandardMaterial({ color: 0x3f6a33, roughness: 0.9 }), AGAF = new THREE.MeshStandardMaterial({ color: 0x6f86d6, roughness: 0.7 }), DRYG = new THREE.MeshStandardMaterial({ color: 0xb8a878, roughness: 1 });
  const EAVE = 17.0, DECK = 20.0;
  // outline calibrated to the 2021 LiDAR (the OSM way is offset ~1 m west/north of the real walls)
  const vN = -27.2, vS = 27.7;
  // outer outline (building frame), clockwise in plan as needed by runs (S: W→E, E: S→N, N: E→W, W: N→S)
  const uWp = -30.6, uWc = -28.1, uWs = -30.5, uEs = 32.35, uEc = 29.8, uEn = 32.2;
  const vWn = -17.37, vWs = 16.19, vEs = 13.99, vEn = -18.28;
  const outline = [[uWs, vS], [-22.0, vS], [23.0, vS], [uEs, vS], [uEs, vEs], [uEc, vEs], [uEc, vEn], [uEn, vEn], [uEn, vN], [uWp, vN], [uWp, vWn], [uWc, vWn], [uWc, vWs], [uWs, vWs]];
  // court (auditorium) region
  const cU0 = -14.4, cU1 = 16.2, cV0 = -14.5, cV1 = 16.3;

  // ---------- plinth / foundation ----------
  K.loop(GD, outline, [[0.35, -1.5], [0.35, FL - 0.05], [0.2, FL + 0.15], [0, FL + 0.15]]);

  // window story spec for plain façades
  const plainStories = (rusticBase = true) => [
    { y0: -1.0, y1: FL + 0.4, mat: GD },
    { y0: FL + 0.4, y1: 6.0, win: { sill: 0.8, h: 2.5, w: 1.45, mull: 1, tran: 0.72, muntins: 2, fw: 0.1 }, rustic: rusticBase ? 0.58 : 0, mat: G },
    { y0: 6.0, y1: 10.2, win: { sill: 0.85, h: 2.7, w: 1.45, mull: 1, tran: 0.75, muntins: 2, fw: 0.1 }, mat: G },
    { y0: 10.2, y1: 13.9, win: { sill: 0.8, h: 2.35, w: 1.45, mull: 1, muntins: 2, fw: 0.1 }, mat: G },
    { y0: 13.9, y1: EAVE - 1.05, win: { sill: 0.45, h: 1.35, w: 1.2, mull: 1, muntins: 1, fw: 0.1 }, mat: G },
  ];
  const cornice = (R, s0, s1, r0 = true, r1 = true) => {
    K.mould(R, G, s0, s1, [[0, 5.85], [0.25, 5.9], [0.25, 6.15], [0, 6.2]], { ret0: r0, ret1: r1 });      // belt course over base
    K.rbox(R, G, s0, EAVE - 1.05, -0.45, s1, EAVE - 0.55, 0.02);                                       // frieze
    K.mould(R, G, s0, s1, corniceProfile(EAVE, 0.74, 0.75), { ret0: r0, ret1: r1 });
  };
  const quoins = (R, s, side) => { // side: +1 quoins extend toward +s from corner at s, -1 toward -s
    for (let y = FL + 0.45, i = 0; y < EAVE - 1.3; y += 0.62, i++) { const w = i % 2 ? 0.7 : 1.1; const a = side > 0 ? s : s - w, b = side > 0 ? s + w : s; K.rbox(R, G, a, y + 0.03, 0, b, y + 0.59, 0.07); }
  };
  const runs = [];
  const facade = (a, b, nb, opts = {}) => {
    const R = K.run(a, b); runs.push(R);
    K.bands(R, 0, R.L, nb, plainStories(opts.rustic !== false), { skip: opts.skip || [] });
    cornice(R, 0, R.L, opts.r0 !== false, opts.r1 !== false);
    if (opts.q0) quoins(R, 0, +1); if (opts.q1) quoins(R, R.L, -1);
    return R;
  };

  // ---------- east and west elevations (projecting end bays) ----------
  // west: NW pavilion face (N→S), recessed centre, SW pavilion
  facade([uWp, vN], [uWp, vWn], 3, { q0: true, q1: true });
  K.wall(K.run([uWp, vWn], [uWc, vWn], 0.015), G, 0, uWc - uWp, -1, EAVE - 1.05, [], 0.45); cornice(K.run([uWp, vWn], [uWc, vWn], 0.015), 0, uWc - uWp, false, false);
  facade([uWc, vWn], [uWc, vWs], 9, { r0: false, r1: false });
  K.wall(K.run([uWc, vWs], [uWs, vWs], 0.015), G, 0, uWc - uWs, -1, EAVE - 1.05, [], 0.45); cornice(K.run([uWc, vWs], [uWs, vWs], 0.015), 0, uWc - uWs, false, false);
  facade([uWs, vWs], [uWs, vS], 3, { q0: true, q1: true });
  // east (S→N)
  facade([uEs, vS], [uEs, vEs], 4, { q0: true, q1: true });
  K.wall(K.run([uEs, vEs], [uEc, vEs], 0.015), G, 0, uEs - uEc, -1, EAVE - 1.05, [], 0.45); cornice(K.run([uEs, vEs], [uEc, vEs], 0.015), 0, uEs - uEc, false, false);
  facade([uEc, vEs], [uEc, vEn], 9, { r0: false, r1: false });
  K.wall(K.run([uEc, vEn], [uEn, vEn], 0.015), G, 0, uEn - uEc, -1, EAVE - 1.05, [], 0.45); cornice(K.run([uEc, vEn], [uEn, vEn], 0.015), 0, uEn - uEc, false, false);
  facade([uEn, vEn], [uEn, vN], 3, { q0: true, q1: true });
  // north (E→W): 16 bays, entrance where the footpath arrives (u≈17.4)
  const RN = facade([uEn, vN], [uWp, vN], 16, { q0: true, q1: true });
  {
    const s = uEn - 17.4; // door bay
    const o = { s0: s - 1.1, s1: s + 1.1, y0: FL + 0.15, y1: FL + 3.9, arch: true, sill: false, doorTop: FL + 2.75 };
    K.rbox(RN, G, o.s0 - 0.6, FL + 0.15, 0, o.s1 + 0.6, FL + 4.5, 0.25); // surround (proud)
    K.wall(RN, G, o.s0 - 0.6, o.s1 + 0.6, FL + 0.15, FL + 4.5, [o], 0.3);
    K.fill(RN, o, { kind: 'door', rev: 0.5 });
    // steps down to the path
    const g0 = K.g(17.4, vN - 2.5);
    K.stairs(GD, 15.8, vN - 0.25 - Math.max(1, Math.round((FL + 0.15 - g0) / 0.16)) * 0.35, 19.0, vN - 0.25, g0, FL + 0.15, '+v', Math.max(1, Math.round((FL + 0.15 - g0) / 0.16)));
  }

  // ---------- south elevation ----------
  const uE0 = -22.0, uC0 = -13.8, uC1 = 14.8, uE1 = 23.0; // pavilions | end bay | colonnade | end bay | pavilion
  const vEB = 29.0, vGal = 26.4, vCol = 28.3;
  // secondary blocks (pavilions) on the south face
  { const R = K.run([uWs, vS], [uE0, vS]); K.bands(R, 0, R.L, 2, plainStories()); cornice(R, 0, R.L, true, false); quoins(R, 0, +1); runs.push(R); }
  { const R = K.run([uE1, vS], [uEs, vS]); K.bands(R, 0, R.L, 2, plainStories()); cornice(R, 0, R.L, false, true); quoins(R, R.L, -1); runs.push(R); }
  // projecting end bays (u ranges) with paired Ionic pilasters around an arched window
  const endBay = (u0, u1) => {
    // side returns
    K.wall(K.run([u0, vS], [u0, vEB], 0.015), G, 0, vEB - vS, -1, 20.3, [], 0.4);
    K.wall(K.run([u1, vEB], [u1, vS], 0.015), G, 0, vEB - vS, -1, 20.3, [], 0.4);
    const R = K.run([u0, vEB], [u1, vEB]); const L = u1 - u0, c = L / 2;
    const door = { s0: c - 1.4, s1: c + 1.4, y0: FL + 0.15, y1: 5.65, arch: true, sill: false, doorTop: FL + 2.9 };
    K.wall(R, G, 0, L, -1, 6.0, [door], 0.9); K.fill(R, door, { kind: 'door', rev: 0.8, door: M.wood });
    K.rustic(R, 0, L, FL + 0.4, 5.85, [door], 0.58, G);
    K.rbox(R, GD, 0, -1, 0, L, FL + 0.4, 0.12);
    const win = { s0: c - 1.25, s1: c + 1.25, y0: 6.9, y1: 13.4, arch: true };
    win.muntins = 4; win.fw = 0.1; K.wall(R, G, 0, L, 6.0, 14.6, [win], 0.7); K.fill(R, win, { mull: 1, tran: [10.3], rev: 0.6 });
    balustrade(K, R, G, win.s0 - 0.3, win.s1 + 0.3, 6.9, 0.85, { d: 0.32 });
    K.rbox(R, G, win.s0 - 0.25, 6.6, 0, win.s1 + 0.25, 6.9, 0.18); // balconette sill
    for (const s of [0.55, 1.65, L - 1.65, L - 0.55]) pilaster(K, R, G, s, 0.8, 6.2, 14.6, 0.3);
    K.mould(R, G, 0, L, [[0, 5.85], [0.32, 5.9], [0.32, 6.2], [0, 6.25]]);
    // entablature + cornice + attic flush with the bay
    K.rbox(R, G, 0, 14.6, -0.4, L, 15.9, 0.32);
    K.mould(R, G, 0, L, corniceProfile(16.8, 0.75, 0.9));
    K.wall(R, G, 0, L, 16.8, 19.8, [{ s0: c - 0.9, s1: c + 0.9, y0: 17.5, y1: 19.1 }], 0.4); K.fill(R, { s0: c - 0.9, s1: c + 0.9, y0: 17.5, y1: 19.1, muntins: 1, fw: 0.1 }, { mull: 1, rev: 0.3 });
    for (const s of [0.55, 1.65, L - 1.65, L - 0.55]) K.rbox(R, G, s - 0.4, 16.8, 0, s + 0.4, 19.8, 0.18);
    K.mould(R, G, 0, L, [[0, 19.8], [0.2, 19.85], [0.45, 20.1], [0.45, 20.35], [0, 20.4]]);
    K.box(M.concreteDark, u0, 20.1, vS - 6, u1, 20.3, vEB - 0.05);
  };
  endBay(uE0, uC0); endBay(uC1, uE1);
  // colonnade section
  {
    const L = uC1 - uC0, nb = 7, bw = L / nb;
    // rusticated base: 7 deeply recessed arched entrances
    const R = K.run([uC0, vEB], [uC1, vEB]);
    const arches = []; for (let i = 0; i < nb; i++) { const c = bw * (i + 0.5); arches.push({ s0: c - 1.35, s1: c + 1.35, y0: FL + 0.15, y1: 5.55, arch: true, sill: false, doorTop: FL + 2.8 }); }
    K.wall(R, G, 0, L, -1, 6.0, arches, 1.2); for (const o of arches) K.fill(R, o, { kind: 'door', rev: 1.1, door: M.wood });
    K.rustic(R, 0, L, FL + 0.4, 5.9, arches, 0.58, G);
    for (const o of arches) K.rbox(R, G, (o.s0 + o.s1) / 2 - 0.3, o.y1 - 0.15, 0, (o.s0 + o.s1) / 2 + 0.3, o.y1 + 0.55, 0.12); // keystones
    K.rbox(R, GD, 0, -1, 0, L, FL + 0.4, 0.12);
    // gallery floor + inner wall with two storeys of windows
    K.box(G, uC0, 5.7, vGal, uC1, 6.2, vEB + 0.2);
    const RG = K.run([uC0, vGal], [uC1, vGal]);
    const ops = []; for (let i = 0; i < nb; i++) { const c = bw * (i + 0.5); ops.push({ s0: c - 0.95, s1: c + 0.95, y0: 6.9, y1: 9.7 }, { s0: c - 0.95, s1: c + 0.95, y0: 10.9, y1: 13.6 }); }
    for (const o of ops) { o.muntins = 2; o.fw = 0.1; }
    K.wall(RG, GS, 0, L, 6.2, 14.6, ops, 0.45); for (const o of ops) K.fill(RG, o, { mull: 1, tran: [o.y0 + 2.0], rev: 0.35 });
    // balustrades between the columns at gallery-floor level
    { const RB = K.run([uC0, vCol + 0.05], [uC1, vCol + 0.05]); for (let k = 0; k < nb; k++) balustrade(K, RB, G, bw * k + 0.62, bw * (k + 1) - 0.62, 6.2, 1.0); }
    for (let i = 0; i < nb; i++) { const c = bw * (i + 0.5); K.rbox(RG, G, c - 1.05, 10.0, 0, c + 1.05, 10.7, 0.06); } // spandrel panels
    // giant Ionic columns
    for (let k = 1; k < nb; k++) ionicColumn(K, G, uC0 + bw * k, 6.2, vCol, 1.05, 8.4, { flutes: 24, volute: 1.3 });
    // responds (half pilasters) at the ends
    for (const s of [0.3, L - 0.3]) pilaster(K, RG, G, s, 0.6, 6.2, 14.6, 0.35, { ionic: true });
    // entablature spanning the colonnade
    K.box(G, uC0, 14.6, vGal, uC1, 15.3, vCol + 0.62);            // architrave
    K.box(G, uC0, 15.3, vGal, uC1, 16.0, vCol + 0.55);            // frieze
    const RE = K.run([uC0, vCol + 0.55], [uC1, vCol + 0.55]);
    K.mould(RE, G, 0, L, corniceProfile(16.8, 0.55, 0.8), { ret0: false, ret1: false });
    K.box(M.concreteDark, uC0, 16.55, vGal - 0.2, uC1, 16.75, vCol + 0.6);
    // soffit of the gallery ceiling coffers (simple beams)
    for (let k = 0; k <= nb; k++) K.box(G, uC0 + bw * k - 0.25, 13.9, vGal, uC0 + bw * k + 0.25, 14.6, vCol + 0.3);
    K.box(GS, uC0, 14.45, vGal, uC1, 14.6, vCol + 0.3);  // gallery ceiling (in shadow)
    // attic set back, with fluted pilasters, molded cornice and blank frieze
    const vAt = 26.9;
    const RA = K.run([uC0, vAt], [uC1, vAt]);
    const aw = []; for (let i = 0; i < nb; i++) { const c = bw * (i + 0.5); aw.push({ s0: c - 0.8, s1: c + 0.8, y0: 17.4, y1: 19.0 }); }
    K.wall(RA, M.ashlar, 0, L, 16.6, 19.8, aw, 0.4); for (const o of aw) K.fill(RA, o, { mull: 1, rev: 0.3 });
    for (let k = 0; k <= nb; k++) pilaster(K, RA, G, bw * k, 0.62, 16.8, 19.15, 0.16, { ionic: false, flutes: 4 });
    K.rbox(RA, G, 0, 19.15, -0.3, L, 19.8, 0.2);                 // blank frieze
    K.mould(RA, G, 0, L, [[0, 19.8], [0.22, 19.85], [0.4, 20.1], [0.4, 20.35], [0, 20.4]], { ret0: false, ret1: false });
    K.box(M.concreteDark, uC0, 20.1, vAt - 6, uC1, 20.3, vAt);
    // six monumental urns over the columns
    for (let k = 1; k < nb; k++) urn(K, G, uC0 + bw * k, 16.75, vCol, 2.3);
    // attic side returns down to the entablature (between attic and end bays already closed by end bays)
  }

  // ---------- main mass, ring roof, court, auditorium ----------
  // solid core (hidden behind façades) up to the eave
  // core volumes kept >0.6 m behind every façade plane so window glass and doors stay visible
  const CI = 0.65, cH = [[cU0 - CI, cV0 - CI], [cU1 + CI, cV0 - CI], [cU1 + CI, cV1 + CI], [cU0 - CI, cV1 + CI]];
  K.prism(M.concreteDark, [[uWc + CI, vN + CI], [uEc - CI, vN + CI], [uEc - CI, 25.7], [uWc + CI, 25.7]], -1, EAVE - 0.6, {}, [cH]);
  for (const [u0, v0, u1, v1] of [[uWs + CI, 25.6, uC0, vS - CI], [uC1, 25.6, uEs - CI, vS - CI], [uWp + CI, vN + CI, uWc + CI + 0.1, vWn - CI], [uWs + CI, vWs + CI, uWc + CI + 0.1, vS - CI],
    [uEc - CI - 0.1, vN + CI, uEn - CI, vEn - CI], [uEc - CI - 0.1, vEs + CI, uEs - CI, vS - CI], [uE0, 25.6, uC0, vEB - 1.3], [uC1, 25.6, uE1, vEB - 1.3]]) K.box(M.concreteDark, u0, -1, v0, u1, EAVE - 0.6, v1);
  K.box(M.concreteDark, uC0, -1, 25.6, uC1, 5.7, vEB - 1.3);  // under the gallery floor, behind the arched entrances
  K.prism(M.concreteDark, [[cU0, cV0], [cU1, cV0], [cU1, cV1], [cU0, cV1]], -1, 9.0);
  // tiled hip band around the outer outline: eave 17 → deck 20
  K.loop(M.redTile, outline, [[0.6, EAVE - 0.05], [-4.6, DECK]], { uvMode: 'roof', skipEdges: [1] });
  K.box(M.concreteDark, uC0, DECK - 0.2, vS - 6.2, uC1, DECK, 26.45);  // flat roof behind the central attic
  // tiled hip roofs of the south secondary blocks rise toward the ring
  // flat roof deck (built-up roofing) inside the tile band, with the court opening
  const IN = 4.2;
  K.flat(M.concreteDark, [[uWc + IN, vN + IN], [uEc - IN, vN + IN], [uEc - IN, vS - IN], [uWc + IN, vS - IN]], DECK, [[[cU0, cV0], [cU0, cV1], [cU1, cV1], [cU1, cV0]]]);
  for (const [u0, v0, u1, v1] of [[uWp + IN, vN + IN, uWc + IN, vWn - IN], [uWs + IN, vWs + IN, uWc + IN, vS - IN], [uEc - IN, vN + IN, uEn - IN, vEn - IN], [uEc - IN, vEs + IN, uEs - IN, vS - IN]])
    if (u1 > u0 && v1 > v0) K.flat(M.concreteDark, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], DECK);
  // court walls (facing the auditorium roof), with windows
  const courtRuns = [K.run([cU0, cV0], [cU1, cV0]).L ? null : null];
  const cw = [[[cU1, cV0], [cU0, cV0]], [[cU0, cV0], [cU0, cV1]], [[cU0, cV1], [cU1, cV1]], [[cU1, cV1], [cU1, cV0]]];
  // runs must have outward normals pointing INTO the court: walk court edges counter to the outer rule
  for (const [a, b] of [[[cU0, cV0], [cU1, cV0]], [[cU1, cV0], [cU1, cV1]], [[cU1, cV1], [cU0, cV1]], [[cU0, cV1], [cU0, cV0]]]) {
    const R = K.run(a, b); const nb = Math.max(2, Math.round(R.L / 3.6));
    K.bands(R, 0, R.L, nb, [{ y0: 9.5, y1: 13.2, win: { sill: 0.9, h: 2.0, w: 1.2, mull: 1 }, mat: M.stucco }, { y0: 13.2, y1: DECK, win: { sill: 0.9, h: 2.2, w: 1.2, mull: 1 }, mat: M.stucco }]);
    K.mould(R, M.stucco, 0, R.L, [[0, DECK - 0.3], [0.25, DECK - 0.2], [0.25, DECK + 0.15], [0, DECK + 0.15]], { ret0: false, ret1: false });
  }
  // north strip of lower roof between the ring and the auditorium (LiDAR ~16 m, 17 m parapet line)
  K.box(M.stucco, cU0, 9.0, cV0, cU1, 16.3, -11.0);
  K.box(M.concreteDark, cU0, 16.3, cV0, cU1, 16.35, -11.0);
  K.box(M.stucco, cU0, 16.3, -11.6, cU1, 17.1, -11.0);
  // auditorium block: low gable roof running east–west (LiDAR 10 m eaves → 12 m ridge band)
  K.box(M.stucco, cU0, 9.0, -11.0, cU1, 9.8, cV1);
  K.hip(M.redTile, cU0, -11.0, cU1, cV1, 9.8, 0.21, { yTop: 12.4, hipU: false });
  for (const uu of [cU0 + 0.02, cU1 - 0.02]) K.box(M.stucco, uu - 0.01, 9.8, -11, uu + 0.01, 12.4, cV1);
  // skylight monitor on the auditorium roof
  K.box(M.copper, -9, 12.25, 1.5, 10, 12.6, 6.5);
  K.box(M.glassLight, -8.6, 12.6, 2.0, 9.6, 13.1, 6.0, { detail: true });
  // roof penthouses seen in the LiDAR (stair/elevator housings ~22 m)
  for (const [u0, v0, u1, v1] of [[-15.8, -13.6, -12.2, -6.4], [13.2, -13.6, 19.5, -6.4], [-14.4, 12.4, -12.4, 16.3], [11.5, 12.4, 16.2, 16.3], [10, -19.5, 15, -16], [17.5, 2, 20.5, 6]]) {
    K.box(M.stucco, u0, 9.0, v0, u1, 22.2, v1); K.box(M.redTile, u0 - 0.3, 22.2, v0 - 0.3, u1 + 0.3, 22.45, v1 + 0.3);
  }

  // ---------- south terrace (partial plinth) and steps running into the slope ----------
  const tV0 = vEB, tV1 = 33.2, tU0 = -24.5, tU1 = 25.0;
  K.box(GD, tU0, -1.5, vS - 0.2, tU1, FL + 0.15, tV1);
  K.box(M.paving, tU0, FL + 0.15, vEB, tU1, FL + 0.17, tV1, {});
  const walkables = [K.walkPoly([[tU0, vEB], [tU1, vEB], [tU1, tV1], [tU0, tV1]], FL + 0.17)];
  // [r5-audit-central] the plaza falls ~2.3 m from east to west along the front (LiDAR: +1.25 at the east end, -1.0 at the
  // west), so the single flight loses risers eastward and dies into the grade; read the plaza where the flight lands
  // (~6.5 m out at the west end) instead of 2.5 m out, so the lowest tread meets the paving instead of stopping on a hump.
  const segW = 2.45;
  for (let u = tU0; u < tU1 - 0.01; u += segW) {
    const u1 = Math.min(tU1, u + segW); let gl = Infinity;
    for (const vv of [2.5, 4.5, 6.5]) { const gg = Math.min(K.g(u, tV1 + vv), K.g(u1, tV1 + vv), K.g((u + u1) / 2, tV1 + vv)); const nn = Math.round((FL + 0.17 - gg) / 0.155); if (tV1 + nn * 0.38 >= tV1 + vv - 1.2) gl = Math.min(gl, gg); }
    if (!Number.isFinite(gl)) gl = Math.min(K.g(u, tV1 + 2.5), K.g(u1, tV1 + 2.5));
    const n = Math.round((FL + 0.17 - gl) / 0.155); if (n < 1) continue;
    walkables.push(K.stairs(GD, u, tV1, u1, tV1 + n * 0.38, gl, FL + 0.17, '-v', n));
    // [r5-audit-central] crisp step lines: a dark shadow strip under every nosing (seen from the plaza the flight
    // otherwise reads as a smooth wedge in flat sun)
    const rise = (FL + 0.17 - gl) / n;
    for (let i = 0; i < n; i++) { const top = gl + rise * (i + 1), vf = tV1 + n * 0.38 - 0.38 * i; K.box(NOSE, u, top - 0.05, vf - 0.002, u1, top - 0.012, vf + 0.006, { detail: true }); }
  }
  // [r5-audit-central] one massive plain ashlar cheek block at the WEST end only (photos: ~1.6 m wide, running the full
  // depth of the flight, ~2.7 m above the low plaza; LiDAR top +1.75); at the east end the flight simply runs out into the
  // rising plaza, so the old thin east cheek wall is gone.
  { const u0 = tU0 - 1.6, u1 = tU0, v1 = tV1 + 6.6, yTop = FL + 0.35;
    K.box(GD, u0, -2.0, tV1, u1, yTop, v1); K.box(G, u0 - 0.06, yTop, tV1 - 0.06, u1 + 0.06, yTop + 0.16, v1 + 0.06); // the block beside the flight
    K.box(GD, u0, -2.0, vS, u1, FL + 0.5, tV1); // lower parapet along the terrace end
    for (const y of [FL - 0.55, FL - 1.55]) K.box(GD, u0 - 0.02, y - 0.02, tV1, u1 + 0.02, y + 0.02, v1 + 0.02, { detail: true }); // ashlar courses
    // raised board-formed concrete planters on the plaza: agapanthus + shrubs in front of the block, dry grasses to the east
    for (const [pu0, pv0, pu1, pv1, kind] of [[-27.6, 41.6, -21.8, 44.8, 'aga'], [15.5, 43.2, 21.5, 46.0, 'grass']]) {
      const gp = Math.min(K.g(pu0, pv0), K.g(pu1, pv0), K.g(pu0, pv1), K.g(pu1, pv1)), yP = Math.max(K.g(pu0, pv0), K.g(pu1, pv0), K.g(pu0, pv1), K.g(pu1, pv1)) + 0.62;
      K.box(PLANTER, pu0, gp - 0.4, pv0, pu1, yP, pv1); K.box(M.soil, pu0 + 0.18, yP - 0.08, pv0 + 0.18, pu1 - 0.18, yP - 0.06, pv1 - 0.18);
      r5cols.push(K.colPoly([[pu0, pv0], [pu1, pv0], [pu1, pv1], [pu0, pv1]], gp - 0.4, yP));
      for (let pu = pu0 + 0.55; pu < pu1 - 0.3; pu += 0.75) for (let pv = pv0 + 0.55; pv < pv1 - 0.3; pv += 0.7) {
        const j = ((pu * 13.7 + pv * 7.3) % 1 + 1) % 1;
        K.add(kind === 'aga' ? AGA : DRYG, new THREE.SphereGeometry(0.34 + j * 0.12, 6, 4).scale(1, kind === 'aga' ? 0.8 : 1.3, 1).translate(pu, yP + 0.18, pv), { detail: true });
        if (kind === 'aga' && j > 0.45) K.add(AGAF, new THREE.SphereGeometry(0.11, 5, 3).translate(pu + 0.1, yP + 0.72, pv), { detail: true });
      }
    }
  }

  // ---------- colliders ----------
  const colliders = [K.colPoly(outline, -2, 21)];
  colliders.push(...r5cols);
  colliders.push(K.colPoly([[uE0, vS], [uC0, vS], [uC0, vEB], [uE0, vEB]], -2, 21));
  colliders.push(K.colPoly([[uC1, vS], [uE1, vS], [uE1, vEB], [uC1, vEB]], -2, 21));
  colliders.push(K.colPoly([[uC0, vS], [uC1, vS], [uC1, vEB], [uC0, vEB]], -2, 21));
  colliders.push(K.colPoly([[tU0 - 1.6, vS], [tU0, vS], [tU0, tV1 + 6.6], [tU0 - 1.6, tV1 + 6.6]], -2.0, FL + 0.51)); // [r5-audit-central] west cheek block

  // refine-central: foundation planting, lamp posts and bike racks where the paths arrive
  siteDress(K, ctx, outline, { d: 1.2, lamps: 3, clear: [29, 32, 35, 38, 41].map((v) => [-25.3, v, 1.9]) }); // [r5-audit-central] no shrubs poking through the west cheek block
  const object3d = K.finish();
  object3d.name = 'wheeler-hall';
  return { object3d, colliders, walkables };
}
