// Hellman Tennis Complex (Cal men's and women's tennis), Oxford St at Bancroft, on the north side of Edwards Stadium.
// Six blue hard courts with green surrounds in one long row (OSM courts w/1068362910-915), a 3.6 m galvanised fence with
// navy windscreens carrying CAL TENNIS lettering, net posts in dark green, aluminium bleachers along the south side,
// court-side shade benches and a scoreboard at the west end. The court pad is retained above Oxford Street.
import * as THREE from 'three';
import { Kit, sportsMats, fieldsMats, tennisBlock, pad, bleachers, signTex, signPanel, scoreboard, polePair, canvasTex, deg, text, lightTower, umbrella } from './lib/fields-kit.js';
import { concreteStand } from './lib/b11-sports.js';

export const info = {
  id: 'hellman-tennis-center',
  name: 'Hellman Tennis Complex',
  subtitle: 'Cal Tennis · six courts beside Edwards Stadium',
  blurb: 'Home courts of the Cal men\'s and women\'s tennis teams: a row of six hard courts at the corner of Oxford Street and Bancroft Way, next to Edwards Stadium.',
  replaces: ['w/24025447', 'w/1068362916'],
};

export async function build(ctx) {
  const { M } = ctx; const S = sportsMats(M); const F = fieldsMats(M);
  const K = new Kit(ctx, deg(-9.5));
  const colliders = [], walkables = [];
  const courtXZ = [[-38.9, 6.2], [-23.3, 3.7], [-7.5, 1.1], [7.8, -1.3], [23.7, -3.9], [39.2, -6.5]];
  const courts = courtXZ.map(([x, z]) => { const [u, v] = K.uv(x, z); return [u, v, Math.PI / 2]; });
  const lv = courts.map(([u, v]) => K.g(u, v)).sort((a, b) => a - b); const level = lv[Math.floor(lv.length / 2)];
  const u0 = -49.6, u1 = 49.6, v0 = -18.4, v1 = 18.4;
  const windMat = new THREE.MeshStandardMaterial({ color: 0x17264a, roughness: 0.9, side: THREE.DoubleSide });
  tennisBlock(K, S, M, F, { u0, v0, u1, v1, courts, level, inCol: '#3e6fa8', outCol: '#4f8f5a', windMat, windH: 2.1, gaps: [], colliders, pxm: 12 });
  // windscreen lettering on the north and south fences (faces outward)
  const wt = signTex('CALIFORNIA  TENNIS', { w: 1024, h: 96, bg: null, fg: '#fdb515', size: 0.7 });
  for (const uc of [-25, 25]) { signPanel(K, wt, uc, level + 1.3, v0 + 0.1, 8, 0.75, -Math.PI / 2, { transparent: true, emissive: 0.05 }); }
  // court-side shade benches between courts (navy canopies)
  for (let i = 0; i < courts.length - 1; i++) {
    const u = (courts[i][0] + courts[i + 1][0]) / 2, v = (courts[i][1] + courts[i + 1][1]) / 2;
    K.box(F.postGreen, u - 0.25, level + 0.42, v - 1.1, u + 0.25, level + 0.48, v + 1.1); K.box(F.postGreen, u + 0.2, level + 0.48, v - 1.1, u + 0.25, level + 0.95, v + 1.1);
    for (const s of [-1, 1]) K.box(F.postBlack, u - 0.2, level, v + s * 1.0 - 0.03, u + 0.2, level + 0.44, v + s * 1.0 + 0.03, { detail: true });
    umbrella(K, F, u - 0.6, v, level + 0.07, F.canvasNavy, { r: 1.1, h: 2.2 });
  }
  // aluminium bleachers along the south fence (between the courts and Edwards Stadium)
  pad(K, F.concLight, -47, v1 - 0.1, 35, v1 + 4.6, level + 0.05);
  for (const [a, b] of [[-46, -3], [3, 34]]) { const res = concreteStand(K, S, { u0: a, u1: b, vFront: v1 + 0.9, dir: 1, rows: 3, run: 0.85, rise: 0.42, y0: level + 0.05, frontWall: 0.6, benchMat: F.seatNavy, backWall: 1.0, aisleEvery: 0, endWalls: true }); walkables.push(res.walk); }
  // navy pipe rail along the front of the terrace
  K.box(S.navy, -46, level + 1.1, v1 + 0.82, 34, level + 1.15, v1 + 0.88, { detail: true });
  // galvanised light poles along both long fences, four heads each
  for (const uu of [-40, -15, 15, 40]) for (const s of [-1, 1]) { const vv = s < 0 ? v0 - 0.6 : v1 + 4.9; lightTower(K, S, M, uu, vv, { h: 13.5, y0: K.g(uu, vv), face: s < 0 ? Math.PI / 2 : -Math.PI / 2, nx: 2, ny: 2, colliders }); }
  colliders.push(K.colPoly([[-46, v1 + 0.8], [34, v1 + 0.8], [34, v1 + 5.3], [-46, v1 + 5.3]], level - 1, level + 0.3));
  // west-end scoreboard facing the courts, and the complex sign facing Oxford Street
  scoreboard(K, S, u0 + 2.2, 0, { face: 0, w: 4.5, h: 1.8, y: 2.2, depth: 0.35, legs: 2, colliders, draw: (c, w, h) => {
    c.fillStyle = '#003262'; c.fillRect(0, 0, w, h * 0.26); c.fillStyle = '#fdb515'; c.font = `bold ${Math.round(h * 0.17)}px Arial`; c.textAlign = 'center'; c.fillText('HELLMAN TENNIS COMPLEX', w / 2, h * 0.19);
    c.font = `bold ${Math.round(h * 0.14)}px Arial`; c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.fillText('CAL', w * 0.06, h * 0.5); c.fillText('VISITOR', w * 0.06, h * 0.78);
    c.fillStyle = '#ffb000'; c.font = `bold ${Math.round(h * 0.18)}px 'Courier New', monospace`; c.textAlign = 'center'; c.fillText('6  4  2', w * 0.66, h * 0.52); c.fillText('3  6  1', w * 0.66, h * 0.8);
  } });
  const st = signTex('HELLMAN TENNIS COMPLEX', { w: 1024, h: 128, bg: '#003262', fg: '#fdb515', size: 0.5 });
  signPanel(K, st, u0 - 0.1, level + 3.0, -8, 9, 1.1, Math.PI, { emissive: 0.08 });
  const object3d = K.finish(); object3d.name = 'hellman-tennis-center';
  const c = K.xz(courts[2][0], courts[2][1] + 7);
  return { object3d, colliders, walkables, interactions: [{ id: 'hellman-court', pos: [c[0], level + 1, c[1]], radius: 6, label: 'Court 3, Hellman Tennis Complex' }] };
}
