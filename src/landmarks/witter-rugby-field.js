// Witter Rugby Field: home of Cal Rugby, a natural-grass pitch in Strawberry Canyon below the east rim of Memorial
// Stadium. Pitch rectangle fitted to the OSM outline (axis -23.6 deg, ~124 x 76 m); striped grass with union markings,
// tall white H posts with navy pads, a low dark chain-link fence with windscreen along the road side, aluminium
// bleachers and team shelters on the touchlines, and the three ~28 m light masts the 2021 LiDAR shows at the corners.
import * as THREE from 'three';
import { Kit, sportsMats, fieldsMats, fieldBlock, pad, paintGrass, fence, lightTower, bleachers, signTex, signPanel, deg, flagPole } from './lib/fields-kit.js';
import { pen, ln, rect } from './lib/b11-sports.js';

export const info = {
  id: 'witter-rugby-field',
  name: 'Witter Rugby Field',
  subtitle: 'Cal Rugby · Strawberry Canyon',
  blurb: 'The home pitch of Cal Rugby, one of the most successful programs in college rugby, set in Strawberry Canyon just east of Memorial Stadium.',
  replaces: ['w/69020839'],
};

export async function build(ctx) {
  const { M } = ctx; const S = sportsMats(M); const F = fieldsMats(M);
  const ang = deg(-23.6); const K = new Kit(ctx, ang);
  const colliders = [], walkables = [];
  const [cu, cv] = K.uv(4.0, 1.0); const LU = 122, LV = 74;
  const hs = []; for (let i = -4; i <= 4; i++) for (let j = -3; j <= 3; j++) hs.push(K.g(cu + i * 12, cv + j * 9)); hs.sort((a, b) => a - b);
  const level = hs[Math.floor(hs.length * 0.4)];
  const Y = (u, v) => Math.max(K.g(u, v), level - 0.2) + 0.07;
  fieldBlock(K, { cu, cv, LU, LV, Y, pxm: 12, paint: (P) => {
    paintGrass(P, { col: '#76a046', alt: '#82ab50', stripe: 5, seed: 31, blotch: 0.6, wear: [[-50, 0, 8, 6, 0.3], [50, 0, 8, 6, 0.3], [0, 0, 12, 8, 0.15], [-22, -8, 6, 6, 0.12], [24, 6, 6, 6, 0.12]] });
    // union markings, kept sparse: touch/try/dead-ball lines, 22s and halfway solid; 10 m lines dashed; 5 m / 15 m dashes only where they cross the 22s, halfway and try lines
    { const L = 100, W = 68, ig = 10; pen(P, '#f4f4ef', 0.11); rect(P, -L / 2 - ig, -W / 2, L / 2 + ig, W / 2); for (const x of [-L / 2, -28, 0, 28, L / 2]) ln(P, x, -W / 2, x, W / 2);
      P.c.setLineDash([2 * P.s, 2.5 * P.s]); for (const x of [-10, 10]) ln(P, x, -W / 2, x, W / 2); P.c.setLineDash([]);
      for (const x of [-L / 2 + 5, -28, 0, 28, L / 2 - 5]) for (const y of [-W / 2 + 5, -W / 2 + 15, W / 2 - 15, W / 2 - 5]) ln(P, x - 0.5, y, x + 0.5, y); }
  } });
  // H posts on the try lines, corner and touch-in-goal flags
  for (const s of [-1, 1]) { const u = cu + s * 50, y0 = level + 0.05; for (const t of [-1, 1]) { K.cyl(F.trimWhite, u, y0 - 0.3, cv + t * 2.8, 0.11, 0.09, 13.3, 10); K.cyl(F.padNavy, u, y0, cv + t * 2.8, 0.34, 0.34, 2.0, 10); colliders.push(K.colCyl(u, cv + t * 2.8, 0.35, y0 - 1, y0 + 13)); }
    const bar = new THREE.CylinderGeometry(0.09, 0.09, 5.6, 10); bar.rotateX(Math.PI / 2); bar.translate(u, y0 + 3.0, cv); K.add(F.trimWhite, bar); }
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xfdb515, side: THREE.DoubleSide, roughness: 0.7 });
  for (const su of [-60, -50, -28, 28, 50, 60]) for (const sv of [-1, 1]) { const u = cu + su, v = cv + sv * 34.6; K.cyl(M.whitePaint, u, level, v, 0.025, 0.025, 1.4, 6, { detail: true }); const g = new THREE.PlaneGeometry(0.4, 0.3); g.translate(0.2, 0, 0); g.translate(u, level + 1.25, v); K.add(flagMat, g, { uvMode: 'keep', detail: true }); }
  // low dark chain-link with windscreen around the pitch (gaps at the north-west entrance)
  const m = 2.2; const r = [[cu - LU / 2 - m, cv - LV / 2 - m], [cu + LU / 2 + m, cv - LV / 2 - m], [cu + LU / 2 + m, cv + LV / 2 + m], [cu - LU / 2 - m, cv + LV / 2 + m]];
  fence(K, S, [r[3], r[0], [cu - 20, r[0][1]]], { h: 1.8, every: 3, y: Y, wind: { h: 1.6, mat: S.windGreen }, colliders });
  fence(K, S, [[cu - 14, r[0][1]], r[1], r[2], r[3]], { h: 1.8, every: 3, y: Y, wind: { h: 1.6, mat: S.windGreen }, colliders });
  const st = signTex('WITTER RUGBY FIELD', { w: 1024, h: 128, bg: '#003262', fg: '#fdb515', size: 0.55 });
  // aluminium bleachers along the north touchline, climbing away from the pitch
  for (const [a, b] of [[-24, -8], [8, 24]]) pad(K, M.concrete, cu + a - 0.5, r[0][1] - 1.0 - 4 * 0.75 - 0.6, cu + b + 0.5, r[0][1] - 0.6, level - 0.02);
  for (const [a, b] of [[-24, -8], [8, 24]]) walkables.push(bleachers(K, S, { u0: cu + a, u1: cu + b, v0: r[0][1] - 1.0, dir: -1, rows: 4, rise: 0.4, run: 0.75, y0: level }));
  // team shelters on the south touchline
  for (const s of [-1, 1]) {
    const u = cu + s * 12, v = r[2][1] - 1.4; const y = level + 0.05;
    K.box(S.benchGrey, u - 4, y + 0.42, v - 0.2, u + 4, y + 0.48, v + 0.25, { detail: true });
    K.box(F.canvasNavy, u - 4.3, y + 2.2, v - 1.0, u + 4.3, y + 2.28, v + 0.6);
    K.box(F.canvasNavy, u - 4.3, y + 0.6, v + 0.55, u + 4.3, y + 2.25, v + 0.6);
    for (const k of [-4.2, 0, 4.2]) K.box(F.postBlack, u + k - 0.04, y, v - 0.95, u + k + 0.04, y + 2.2, v - 0.87, { detail: true });
  }
  // flag poles behind the west in-goal
  for (const [k, mat] of [[-4, F.canvasNavy], [0, F.canvasGold], [4, F.canvasNavy]]) flagPole(K, F, M, cu - LU / 2 - 3.5, cv + k, Y(cu - LU / 2 - 3.5, cv + k) - 0.07, 9, mat);
  // light masts where the LiDAR shows them (~28 m above the field), aimed at the centre
  for (const [x, z] of [[38.0, -55.6], [-27.5, 72.9], [-70.0, -13.6]]) { const [u, v] = K.uv(x, z); const g0 = K.g(u, v); lightTower(K, S, M, u, v, { h: 28.5, y0: g0, face: Math.atan2(cv - v, cu - u), nx: 2, ny: 2, colliders }); }
  const object3d = K.finish(); object3d.name = 'witter-rugby-field';
  const c = K.xz(cu, cv);
  return { object3d, colliders, walkables, interactions: [{ id: 'witter-halfway', pos: [c[0], level + 1, c[1]], radius: 8, label: 'Halfway line, Witter Rugby Field' }] };
}
