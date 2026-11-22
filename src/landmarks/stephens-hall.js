// Stephens Hall (John Galen Howard, 1923): built as the Stephens Memorial Union, the campus's first student union, and named
// for history professor Henry Morse Stephens. Collegiate Gothic in cream-painted reinforced concrete: Tudor-arched window groups,
// buttresses, crenellated parapets, a tall tower block with a stair turret, and a large arched breezeway through the centre.
// Massing follows the 2021 LiDAR (flat roofs behind parapets: west wing ~16–19 m, tower ~28 m, hall ~24 m, east wing ~20 m)
// on ground that falls ~6 m from the north-west toward Strawberry Creek.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { sign, wallLamp, downspout, baseShrubs } from './lib/rc-finish.js';
import { tint } from './lib/b02-kit.js';

export const info = {
  id: 'stephens-hall',
  name: 'Stephens Hall',
  subtitle: 'John Galen Howard · 1923',
  blurb: 'Opened in 1923 as the Stephens Memorial Union, the first student union on campus, this Collegiate Gothic building beside Strawberry Creek is named for history professor Henry Morse Stephens and now houses International & Area Studies and the Academic Senate.',
  replaces: ['w/24025424', 'way/24025424'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.657);
  // refine-central: smooth pale buff painted concrete (not textured cream stucco), plain coped parapets (no battlements),
  // wide flat-headed multi-light steel casements in pairs/triples with grey-green frames, the STEPHENS HALL inscription and
  // lanterns at the breezeway, downspouts and planting.
  const K = new Kit(ctx, ANG); const M = ctx.M; const S = tint(M.stuccoWhite, 0xebe6d3), SD = M.concreteDark; // r5-east: cooler, paler cream paint (was 0xece2b8, read butter-yellow)
  K.curveSeg = 3; // flat Tudor arches need few segments (keeps the many grouped windows within budget)
  const colliders = [], walkables = [];
  const frame = tint(M.whitePaint, 0xc4cac3); // r5-east: light grey steel casements as in the photos (was 0x7f8c8a)

  // crenellated parapet along a run at deck height yD, top yP
  const parapet = (R, yD, yP, s0 = 0, s1 = R.L) => {
    K.rbox(R, S, s0, yD - 0.5, -0.35, s1, yP - 0.55, 0.0);
    K.mould(R, S, s0, s1, [[0, yD - 0.55], [0.18, yD - 0.5], [0.18, yD - 0.3], [0, yD - 0.25]], { ret0: false, ret1: false });
    if (false) { // (refine-central) the real parapets are plain and coped; battlements removed
      const n = Math.max(1, Math.round((s1 - s0) / 1.6));
      for (let i = 0; i < n; i++) { const a = s0 + (s1 - s0) * (i + 0.2) / n, b = a + (s1 - s0) / n * 0.6; K.rbox(R, S, a, yP - 0.45, -0.35, b, yP, 0.02); }
      K.rbox(R, S, s0, yP - 0.52, -0.38, s1, yP - 0.45, 0.06);
    } else { K.rbox(R, S, s0, yP - 0.55, -0.35, s1, yP - 0.1, 0.02); K.rbox(R, S, s0 - 0.04, yP - 0.1, -0.4, s1 + 0.04, yP, 0.08); }
  };
  // gothic façade: storeys of grouped Tudor-arched windows between buttresses
  const face = (a, b, { nb, stories, yBase, yD, yP, buttress = true, doors = [], skipBays = [] }) => {
    const R = K.run(a, b); const bw = R.L / nb;
    // ground along the face
    let gmax = -Infinity, gmin = Infinity; for (let i = 0; i <= 12; i++) { const p = R.at(R.L * i / 12, 1.0); const g = K.g(p[0], p[1]); gmax = Math.max(gmax, g); gmin = Math.min(gmin, g); }
    const y0 = Math.min(yBase, gmin) - 1.2;
    const ops = [];
    for (const st of stories) {
      for (let i = 0; i < nb; i++) {
        if (skipBays.includes(i)) continue;
        const c = bw * (i + 0.5);
        const p = R.at(c, 1.0); const gl = K.g(p[0], p[1]);
        if (st.y0 < gl + 0.6) continue; // below grade here
        const n = Math.min(2, st.lights ?? 2), gap = 0.22, lw = Math.min(1.25, (bw - 1.1 - (n - 1) * gap) / n); const tot = n * lw + (n - 1) * gap;
        for (let k = 0; k < n; k++) { const s0 = c - tot / 2 + k * (lw + gap); ops.push({ s0, s1: s0 + lw, y0: st.y0, y1: st.y1, sill: k === 0 ? undefined : false, muntins: Math.max(2, Math.round((st.y1 - st.y0) / 0.6)), st }); }
      }
    }
    for (const d of doors) ops.push({ ...d, door: true });
    K.wall(R, S, 0, R.L, y0, yD - 0.5, ops, 0.45);
    for (const o of ops) {
      if (o.door) K.fill(R, o, { kind: 'door', rev: 0.4, door: M.woodDark, frame });
      else K.fill(R, o, { mull: 1, rev: 0.35, frame, tran: o.y1 - o.y0 > 1.9 ? [o.y0 + (o.y1 - o.y0) * 0.62] : [], sill: false });
    }
    // hood moulds over window groups + continuous sills
    for (const st of stories) for (let i = 0; i < nb; i++) {
      if (skipBays.includes(i)) continue; const c = bw * (i + 0.5); const p = R.at(c, 1.0); if (st.y0 < K.g(p[0], p[1]) + 0.6) continue;
      const n = Math.min(2, st.lights ?? 2), lw = Math.min(1.25, (bw - 1.1 - (n - 1) * 0.22) / n), tot = n * lw + (n - 1) * 0.22;
      K.rbox(R, S, c - tot / 2 - 0.25, st.y1 + 0.08, 0, c + tot / 2 + 0.25, st.y1 + 0.26, 0.16);
      for (const k of [-1, 1]) K.rbox(R, S, c + k * (tot / 2 + 0.17) - 0.08, st.y1 - 0.45, 0, c + k * (tot / 2 + 0.17) + 0.08, st.y1 + 0.26, 0.16);
      K.rbox(R, S, c - tot / 2 - 0.12, st.y0 - 0.14, 0, c + tot / 2 + 0.12, st.y0, 0.14);
    }
    if (buttress) for (let i = 0; i <= nb; i++) {
      const s = Math.min(R.L - 0.3, Math.max(0.3, bw * i)); const p = R.at(s, 0.6); const gl = K.g(p[0], p[1]);
      K.rbox(R, S, s - 0.3, gl - 1, 0, s + 0.3, yD - 2.2, 0.55);
      const g = new THREE.BoxGeometry(0.6, 1.0, 0.55); g.translate(0, 0.5, -0.275); g.rotateX(-0.5); g.translate(s, yD - 2.2, 0.55); K.addRun(R, S, g);
    }
    parapet(R, yD, yP);
    K.mould(R, S, 0, R.L, [[0, gmax + 0.55], [0.12, gmax + 0.6], [0.12, gmax + 0.75], [0, gmax + 0.8]], { ret0: false, ret1: false });
    return R;
  };
  // rectangular gothic block with flat roof behind parapets
  const block = (u0, v0, u1, v1, yD, yP, stories, { faces = 'NESW', bay = 3.4, doors = {}, skip = {} } = {}) => {
    const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
    const gmin = K.gMin(u0, v0, u1, v1);
    for (const f of faces) { const [a, b] = defs[f]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); face(a, b, { nb: Math.max(1, Math.round(L / bay)), stories, yBase: gmin, yD, yP, doors: doors[f] || [], skipBays: skip[f] || [] }); }
    K.box(SD, u0 + 0.65, gmin - 1.2, v0 + 0.65, u1 - 0.65, yD - 0.3, v1 - 0.65);
    K.box(SD, u0, yD - 0.35, v0, u1, yD - 0.25, v1);
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], gmin - 2, yP));
  };
  const st3 = (g) => [{ y0: g + 1.2, y1: g + 3.6, lights: 3, lw: 0.66 }, { y0: g + 5.0, y1: g + 7.4, lights: 3, lw: 0.66 }, { y0: g + 8.8, y1: g + 11.0, lights: 3, lw: 0.66 }, { y0: g + 12.2, y1: g + 14.0, lights: 3, lw: 0.55 }];

  // ---------- west wing: pieces follow the LiDAR (parapeted flat roofs 16–19 m, a pitched section, a lower courtyard aisle) ----------
  const wU0 = -16.4, wU1 = -2.4;
  const gDoor = K.g(wU0 - 1, -1.8);
  block(wU0, -10.8, wU1, -2.2, 16.0, 18.0, st3(2.8), { faces: 'NW', bay: 3.5 });
  block(-12.4, -6.2, -5.0, 3.0, 18.3, 19.3, st3(2.4).slice(3), { faces: 'NE', bay: 3.5 });
  block(-5.1, -2.4, wU1, 2.9, 16.2, 17.6, st3(2.4), { faces: '', bay: 3.5 });
  block(-13.4, 2.9, wU1, 13.6, 16.2, 17.6, st3(2.0), { faces: 'W', bay: 3.5 });
  face([-12.4, -2.2], [-12.4, 2.9], { nb: 2, stories: st3(2.4).slice(1), yBase: 2.4, yD: 18.3, yP: 19.3 });
  // two-storey aisle along the Class of 1925 Courtyard with an open Tudor arcade at ground level
  {
    const a0 = -2.2, a1 = 13.0, top = 8.0;
    const R = K.run([wU0, a0], [wU0, a1]); const g0 = K.gMin(wU0, a0, -12.4, a1);
    // northern half of the aisle is a storey taller (LiDAR ~12–13 m between v≈5.5 and 13)
    { const a2 = a1; const R2 = K.run([wU0, 5.5], [wU0, a2]); const nb2 = 2, bw2 = R2.L / nb2; const w2 = [];
      for (let i = 0; i < nb2; i++) { const c = bw2 * (i + 0.5); w2.push({ s0: c - 0.9, s1: c - 0.15, y0: 9.4, y1: 11.3, arch: 'gothic', rise: 0.25 }, { s0: c + 0.15, s1: c + 0.9, y0: 9.4, y1: 11.3, arch: 'gothic', rise: 0.25 }); }
      K.wall(R2, S, 0, R2.L, top - 0.5, 12.0, w2, 0.5); for (const o of w2) K.fill(R2, o, { mull: 0, rev: 0.4, frame, sill: false });
      parapet(R2, 12.4, 13.2); K.box(SD, wU0 + 0.65, top - 0.6, 5.6 + 0.65, -13.5, 12.1, a2 - 0.65); K.box(SD, wU0, 12.05, 5.5, -13.4, 12.15, a2);
      const R3 = K.run([-13.4, 5.5], [wU0, 5.5]); K.wall(R3, S, 0, R3.L, top - 0.5, 12.0, [], 0.4); parapet(R3, 12.4, 13.2);
      const R4 = K.run([wU0, a2], [-13.4, a2]); K.wall(R4, S, 0, R4.L, top - 0.5, 12.0, [], 0.4); parapet(R4, 12.4, 13.2); }
    // lower continuation of the aisle to the south (LiDAR ~8–9 m)
    block(wU0, a1 - 0.1, -13.3, 20.0, 8.0, 9.0, [{ y0: 2.6, y1: 4.8, lights: 2 }, { y0: 5.4, y1: 7.2, lights: 2, lw: 0.55 }], { faces: 'WS', bay: 3.4 });
    const nb = 6, bw = R.L / nb; const ops = [], wins = [];
    for (let i = 0; i < nb; i++) { const c = bw * (i + 0.5); const gl = K.g(wU0 - 0.5, a0 + c);
      if (i === 0 || i === 3) ops.push({ s0: c - 0.8, s1: c + 0.8, y0: gl + 0.05, y1: gl + 3.0, arch: 'gothic', rise: 0.55, doorTop: gl + 2.3, sill: false });
      else for (const k of [-1, 0, 1]) wins.push({ s0: c + k * 0.82 - 0.33, s1: c + k * 0.82 + 0.33, y0: gl + 1.2, y1: gl + 3.4, arch: 'gothic', rise: 0.22 });
      for (const k of [-1, 0, 1]) wins.push({ s0: c + k * 0.82 - 0.33, s1: c + k * 0.82 + 0.33, y0: gl + 4.6, y1: gl + 6.6, arch: 'gothic', rise: 0.22 }); }
    K.wall(R, S, 0, R.L, g0 - 1.2, top - 0.5, [...ops, ...wins], 0.5);
    for (const o of wins) K.fill(R, o, { mull: 0, rev: 0.4, frame, sill: false, tran: [o.y0 + (o.y1 - o.y0) * 0.62] });
    for (const o of ops) K.fill(R, o, { kind: 'door', rev: 0.4, frame });
    colliders.push(K.colPoly([[wU0, a0], [-12.4, a0], [-12.4, a1], [wU0, a1]], g0 - 2, top + 1));
    { const R1 = K.run([wU0, a0], [wU0, 5.5]); parapet(R1, top, 9.0); }
    { const RR = K.run([-12.4, a0], [wU0, a0]); K.wall(RR, S, 0, RR.L, g0 - 1.2, top - 0.5, [], 0.5); parapet(RR, top, 9.0); }
    K.box(SD, wU0 + 0.65, g0 - 1.2, a0 + 0.3, -12.4, top - 0.3, a1 - 0.3);
    K.box(SD, wU0 + 0.2, top - 0.35, a0 + 0.2, -12.4, top - 0.25, a1 - 0.2);
  }
  // pitched-roof section (LiDAR eaves ~16.5 m, ridge ~19.3 m running north–south)
  {
    const u0 = -13.4, u1 = 0.25, v0 = 13.6, v1 = 19.9;
    block(u0, v0, u1, v1, 18.0, 19.3, st3(1.6), { faces: 'NWSE', bay: 3.3 });
  }
  block(wU0, 19.9, wU1, 24.6, 18.0, 19.3, st3(1.4), { faces: 'WSE', bay: 3.5 });
  block(wU0, 24.4, wU1, 27.75, 16.0, 17.6, st3(1.4), { faces: 'WSE', bay: 3.5 });
  // east face of the west wing above the low wing
  face([wU1, 13.6], [wU1, 3.0], { nb: 3, stories: [{ y0: 9.6, y1: 11.6 }, { y0: 12.6, y1: 14.6, lw: 0.55 }], yBase: 2, yD: 16.2, yP: 17.6, buttress: false });
  face([wU1, 3.0], [wU1, -2.5], { nb: 2, stories: [{ y0: 9.6, y1: 11.6 }, { y0: 12.6, y1: 14.6, lw: 0.55 }], yBase: 2, yD: 18.3, yP: 19.3, buttress: false });
  // west oriel bay (semi-octagonal), full height
  {
    const pts = [[wU0, -9.23], [-19.19, -9.25], [-20.35, -7.77], [-20.33, -4.89], [-19.46, -3.91], [wU0, -3.9]];
    const g0 = K.gMin(-20.4, -9.3, -16.4, -3.9);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]; const R = K.run(a, b);
      const ops = []; const c = R.L / 2;
      if (R.L > 1.5) for (const [y0, y1] of [[g0 + 1.4, g0 + 3.9], [g0 + 5.0, g0 + 7.6], [g0 + 8.8, g0 + 11.2], [g0 + 12.2, g0 + 14.1]]) ops.push({ s0: c - 0.5, s1: c + 0.5, y0, y1, arch: 'gothic', rise: 0.25 });
      K.wall(R, S, 0, R.L, g0 - 1.2, 16.3, ops, 0.35); for (const o of ops) K.fill(R, o, { mull: 0, rev: 0.25, frame });
      parapet(R, 16.8, 18.2);
    }
    K.prism(SD, pts, 16.3, 16.5);
    colliders.push(K.colPoly(pts, g0 - 2, 18.2));
  }
  // south-west turret / stair tower (LiDAR ~21 m)
  block(-4.87, 27.75, -0.31, 33.63, 19.8, 21.2, [{ y0: 2.4, y1: 4.6, lights: 1, lw: 0.7 }, { y0: 6.5, y1: 8.7, lights: 1, lw: 0.7 }, { y0: 10.6, y1: 12.8, lights: 1, lw: 0.7 }, { y0: 14.6, y1: 16.8, lights: 1, lw: 0.7 }],
    { faces: 'ESW', bay: 4.6, doors: { E: [{ s0: 1.1, s1: 2.4, y0: K.g(0.5, 31) + 0.05, y1: K.g(0.5, 31) + 2.9, arch: 'gothic', rise: 0.45, doorTop: K.g(0.5, 31) + 2.2, sill: false }] } });
  // south extension (LiDAR ~16–18 m)
  block(-2.4, 20.0, 5.9, 27.9, 16.6, 18.0, st3(1.2), { faces: 'NES', bay: 3.4 });
  // low two-storey wing in the middle (building:part, LiDAR ~8–9 m)
  block(-2.3, -2.5, 5.8, 13.6, 8.2, 9.2, [{ y0: 3.4, y1: 5.6, lights: 3 }], { faces: 'E', bay: 3.6 });
  block(0.25, 13.6, 5.8, 20.0, 8.2, 9.2, [{ y0: 3.0, y1: 5.2, lights: 3 }], { faces: 'E', bay: 3.2 });

  // ---------- tower block (LiDAR parapets ~28 m) with stair turret ----------
  const tU0 = -2.9, tU1 = 6.7, tV0 = -18.9, tV1 = -2.5;
  const tStories = [{ y0: 6.2, y1: 8.6 }, { y0: 9.8, y1: 12.2 }, { y0: 13.4, y1: 20.6, lights: 3, lw: 0.75 }, { y0: 22.0, y1: 24.6, lights: 3, lw: 0.6 }];
  block(tU0, tV0, tU1, tV1, 25.4, 28.0, tStories, { faces: 'NWSE', bay: 4.2 });
  // ---------- hall block with the great arched breezeway (LiDAR ~24 m) ----------
  const hU0 = 6.7, hU1 = 15.7, hU1n = 12.9, hV0 = -15.5, hV1 = -2.4; const pU0 = 8.2, pU1 = 10.9;
  const gS = K.g((pU0 + pU1) / 2, hV1 + 1), gN = K.g((pU0 + pU1) / 2, hV0 - 1);
  const hStories = [{ y0: 10.2, y1: 12.4, lights: 2 }, { y0: 13.8, y1: 20.4, lights: 3, lw: 0.75 }];
  // south and north faces carry the breezeway arch; east face plain
  const hFace = (a, b, gl, pass) => {
    const R = K.run(a, b);
    const ps0 = Math.min(Math.abs(pU0 - a[0]), Math.abs(pU1 - a[0])), ps1 = Math.max(Math.abs(pU0 - a[0]), Math.abs(pU1 - a[0]));
    const arch = { s0: ps0, s1: ps1, y0: gl - 0.5, y1: gl + 6.6, arch: 'gothic', rise: 1.6, sill: false };
    const ops = [arch];
    const bw = R.L / 3; for (let i = 0; i < 3; i++) for (const st of hStories) { const c = bw * (i + 0.5); const n = st.lights, lw = st.lw ?? 0.62, tot = n * lw + (n - 1) * 0.16; for (let k = 0; k < n; k++) { const s0 = c - tot / 2 + k * (lw + 0.16); ops.push({ s0, s1: s0 + lw, y0: st.y0, y1: st.y1, arch: 'gothic', rise: lw * 0.35 }); } }
    K.wall(R, S, 0, R.L, gl - 1.2, 23.0, ops, 0.6);
    for (const o of ops.slice(1)) K.fill(R, o, { mull: 0, rev: 0.45, frame, tran: o.y1 - o.y0 > 3 ? [o.y0 + (o.y1 - o.y0) * 0.6] : [], sill: false });
    // archivolt mouldings around the breezeway arch
    K.rbox(R, S, ps0 - 0.5, gl - 1, 0, ps0, gl + 5.2, 0.25); K.rbox(R, S, ps1, gl - 1, 0, ps1 + 0.5, gl + 5.2, 0.25);
    K.rbox(R, S, ps0 - 0.6, gl + 6.75, 0, ps1 + 0.6, gl + 7.1, 0.3);
    parapet(R, 23.5, 24.4);
    if (pass) { sign(K, R, (ps0 + ps1) / 2, gl + 7.25, Math.max(4.2, ps1 - ps0 + 1.6), 0.5, 'STEPHENS HALL', { bg: '#e2d8b0', fg: '#6b6248', d: 0.24, backMat: S }); for (const ss of [ps0 - 0.95, ps1 + 0.95]) wallLamp(K, R, ss, gl + 3.0); }
    return R;
  };
  hFace([hU0, hV1], [hU1, hV1], gS, true);   // south (W→E)
  hFace([hU1n, hV0], [hU0, hV0], gN, true);  // north (E→W)
  face([hU1, hV1], [hU1, -10.4], { nb: 2, stories: hStories, yBase: 2, yD: 23.5, yP: 24.4, buttress: false });
  { const R = K.run([hU1, -10.4], [hU1n, -10.4]); K.wall(R, S, 0, R.L, 18.5, 23.0, [], 0.45); parapet(R, 23.5, 24.4); }
  { const R = K.run([hU1n, -10.4], [hU1n, hV0]); K.wall(R, S, 0, R.L, 18.5, 23.0, [{ s0: 1.6, s1: 2.4, y0: 20.2, y1: 22.2, arch: 'gothic', rise: 0.3 }, { s0: 2.9, s1: 3.7, y0: 20.2, y1: 22.2, arch: 'gothic', rise: 0.3 }], 0.45); parapet(R, 23.5, 24.4);
    K.fill(R, { s0: 1.6, s1: 2.4, y0: 20.2, y1: 22.2, arch: 'gothic', rise: 0.3 }, { mull: 0, rev: 0.35, frame }); K.fill(R, { s0: 2.9, s1: 3.7, y0: 20.2, y1: 22.2, arch: 'gothic', rise: 0.3 }, { mull: 0, rev: 0.35, frame }); }
  // core split around the passage; passage lining, vault and floor ramp
  const g0H = Math.min(gS, gN) - 1.2;
  K.box(SD, hU0, g0H, hV0 + 0.65, pU0, 23.0, hV1 - 0.65); K.box(SD, pU1, g0H, -10.4, hU1 - 0.65, 23.0, hV1 - 0.65); K.box(SD, pU1, g0H, hV0 + 0.65, hU1n - 0.65, 23.0, -10.3);
  K.box(SD, pU0, Math.max(gS, gN) + 6.6, hV0 + 0.6, pU1, 23.0, hV1 - 0.6);
  K.box(SD, hU0 + 0.2, 22.65, -10.6, hU1 - 0.2, 22.75, hV1 - 0.2); K.box(SD, hU0 + 0.2, 22.65, hV0 + 0.2, hU1n - 0.2, 22.75, -10.6);
  for (const u of [pU0, pU1]) K.box(S, u - 0.05, g0H, hV0, u + 0.05, Math.max(gS, gN) + 6.6, hV1);
  K.box(S, pU0, Math.max(gS, gN) + 5.6, hV0, pU1, Math.max(gS, gN) + 6.65, hV1);
  {
    const n = 18; const pos = [];
    for (let i = 0; i < n; i++) {
      const va = hV1 + (hV0 - hV1) * i / n, vb = hV1 + (hV0 - hV1) * (i + 1) / n; const ya = gS + (gN - gS) * i / n, yb = gS + (gN - gS) * (i + 1) / n;
      K.box(M.paving, pU0 + 0.05, Math.min(ya, yb) - 1.0, vb, pU1 - 0.05, (ya + yb) / 2, va);
    }
    walkables.push(K.walkFn(pU0, hV0 - 0.3, pU1, hV1 + 0.3, (u, v) => (u < pU0 || u > pU1 || v < hV0 - 0.3 || v > hV1 + 0.3) ? null : gS + (gN - gS) * Math.min(1, Math.max(0, (hV1 - v) / (hV1 - hV0)))));
  }
  colliders.push(K.colPoly([[hU0, hV0], [pU0, hV0], [pU0, hV1], [hU0, hV1]], g0H - 1, 24.4));
  colliders.push(K.colPoly([[pU1, hV0], [hU1n, hV0], [hU1n, -10.4], [hU1, -10.4], [hU1, hV1], [pU1, hV1]], g0H - 1, 24.4));

  // ---------- east wing (LiDAR parapets ~20 m) ----------
  block(11.7, -31.0, 24.8, -10.3, 19.6, 20.4, [{ y0: 7.6, y1: 9.8 }, { y0: 11.2, y1: 13.4 }, { y0: 14.8, y1: 17.0, lw: 0.55 }], { faces: 'NES', bay: 3.4 });
  // west face of the east wing north of the hall
  face([11.7, -31.0], [11.7, -15.5], { nb: 4, stories: [{ y0: 7.6, y1: 9.8 }, { y0: 11.2, y1: 13.4 }, { y0: 14.8, y1: 17.0, lw: 0.55 }], yBase: 5, yD: 19.6, yP: 20.4 });
  // fill between the tower and the east wing on the north side
  block(6.7, -18.9, 11.7, -15.5, 19.0, 20.3, [{ y0: 8.0, y1: 10.2 }, { y0: 11.6, y1: 13.8 }], { faces: 'N', bay: 2.5 });

  const object3d = K.finish();
  object3d.name = 'stephens-hall';
  return { object3d, colliders, walkables };
}
