// Golden Bear Recreation Center (Clark Kerr Campus): the field & track, plus the centre's tennis courts, beach volleyball
// courts and outdoor pool. The track oval is fitted to the OSM relation (inner straights ~107 m at 41.7 deg, inner radius
// ~31 m, six lanes) in a red-brown all-weather surface; the infield is natural grass with soccer markings and goals.
// Tennis (OSM w/1413413593-94) and sand volleyball (w/274306043-44) courts and the Golden Bear Pool (w/128467271) sit
// in their own frames around it.
import * as THREE from 'three';
import { Kit, sportsMats, fieldsMats, fieldBlock, paintGrass, fence, deg, tennisBlock, levelY, pad, signTex, signPanel, umbrella, lounger, lifeguardChair, bleachers } from './lib/fields-kit.js';
import { trackOval, lanesTexture, soccerLines, soccerGoal, pool, surfaceMat } from './lib/b11-sports.js';

export const info = {
  id: 'golden-bear-recreation-center-field-and-',
  name: 'Golden Bear Recreation Center',
  subtitle: 'Field, track and courts · Clark Kerr Campus',
  blurb: 'The recreation fields of the Clark Kerr Campus: a running track around a grass field, tennis and sand volleyball courts and an outdoor pool, run by Cal Recreational Sports.',
  replaces: ['r/1735009', 'w/1413413593', 'w/1413413594', 'w/274306043', 'w/274306044', 'w/128467271'],
};

export async function build(ctx) {
  const { M } = ctx; const S = sportsMats(M); const F = fieldsMats(M);
  const colliders = [], walkables = []; const parts = [];
  // ---- track + field ----
  const K = new Kit(ctx, deg(41.7)); parts.push(K);
  const [cu, cv] = K.uv(-1.2, -1.0); const straight = 107.3, rIn = 31.25, lanes = 6, laneW = 1.07;
  const hs = []; for (let i = -4; i <= 4; i++) for (let j = -2; j <= 2; j++) hs.push(K.g(cu + i * 12, cv + j * 12)); hs.sort((a, b) => a - b); const level = hs[Math.floor(hs.length / 2)];
  const Y = (u, v) => Math.max(K.g(u, v), level - 0.2) + 0.07;
  const tmat = surfaceMat(lanesTexture(lanes, laneW, { col: '#a4513b' }), { rough: 0.9 });
  trackOval(K, tmat, { cu, cv, straight, rIn, lanes, laneW, yFn: Y, segC: 36, segS: 14 });
  const LU = straight + 2 * rIn - 2, LV = 2 * rIn - 1.5;
  fieldBlock(K, { cu, cv, LU, LV, Y: (u, v) => Y(u, v) - 0.01, pxm: 10, ring: (() => { const r = []; for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + Math.PI * i / 24; r.push([cu + straight / 2 + Math.cos(a) * (rIn - 0.05), cv + Math.sin(a) * (rIn - 0.05)]); } for (let i = 0; i <= 24; i++) { const a = Math.PI / 2 + Math.PI * i / 24; r.push([cu - straight / 2 + Math.cos(a) * (rIn - 0.05), cv + Math.sin(a) * (rIn - 0.05)]); } return r; })(), paint: (P) => {
    paintGrass(P, { col: '#527f37', alt: '#5c8b3e', stripe: 6, seed: 51, blotch: 1.5, wear: [[-48, 0, 6, 8, 0.4], [48, 0, 6, 8, 0.4], [0, 0, 9, 6, 0.2]] });
    soccerLines(P, { L: 100, W: 58, lw: 0.11 });
  } });
  for (const s of [-1, 1]) soccerGoal(K, S, cu + s * 50, cv, { dirU: -s, y0: level + 0.06 });
  // perimeter fence just outside the track, aluminium bleachers on the north-west straight
  const fr = []; const R = rIn + lanes * laneW + 2.0; for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + Math.PI * i / 20; fr.push([cu + straight / 2 + Math.cos(a) * R, cv + Math.sin(a) * R]); } for (let i = 0; i <= 20; i++) { const a = Math.PI / 2 + Math.PI * i / 20; fr.push([cu - straight / 2 + Math.cos(a) * R, cv + Math.sin(a) * R]); }
  fence(K, S, fr, { h: 1.2, every: 3.5, y: Y, closed: true, gapAt: [10, 31], colliders });
  pad(K, M.concrete, cu - 22, cv - R - 5.2, cu + 22, cv - R + 0.4, level - 0.02);
  walkables.push(bleachers(K, S, { u0: cu - 20, u1: cu + 20, v0: cv - R - 0.4, dir: -1, rows: 6, rise: 0.4, run: 0.75, y0: level }));
  // ---- tennis courts (frame along the row of two courts) ----
  const T = new Kit(ctx, deg(67.5 - 90)); parts.push(T);
  { const cs = [[-115.4, 64.0], [-101.9, 58.5]].map(([x, z]) => T.uv(x, z)); const lv = Math.max(...cs.map(([u, v]) => T.g(u, v)));
    const ua = Math.min(cs[0][0], cs[1][0]) - 5.5 - 3.8, ub = Math.max(cs[0][0], cs[1][0]) + 5.5 + 3.8, vm = (cs[0][1] + cs[1][1]) / 2;
    tennisBlock(T, S, M, F, { u0: ua, v0: vm - 18.3, u1: ub, v1: vm + 18.3, courts: cs.map(([u, v]) => [u, v, Math.PI / 2]), level: lv, inCol: '#5e7a62', outCol: '#8a9a8c', windMat: S.windGreen, colliders }); }
  // ---- sand volleyball ----
  const V = new Kit(ctx, deg(62.5)); parts.push(V);
  for (const [x, z] of [[25.2, 119.3], [-0.6, 123.0]]) { const [u, v] = V.uv(x, z); const g = V.gMax(u - 9, v - 5, u + 9, v + 5, 4);
    V.box(S.sand, u - 11, g - 0.6, v - 6, u + 11, g + 0.12, v + 6); V.box(M.woodDark, u - 11.3, g - 0.5, v - 6.3, u + 11.3, g + 0.2, v - 6.0); V.box(M.woodDark, u - 11.3, g - 0.5, v + 6.0, u + 11.3, g + 0.2, v + 6.3); V.box(M.woodDark, u - 11.3, g - 0.5, v - 6.3, u - 11.0, g + 0.2, v + 6.3); V.box(M.woodDark, u + 11.0, g - 0.5, v - 6.3, u + 11.3, g + 0.2, v + 6.3);
    for (const s of [-1, 1]) V.cyl(F.postBlack, u, g - 0.3, v + s * 5.0, 0.05, 0.05, 2.75, 8);
    const ng = new THREE.PlaneGeometry(10, 1.0); ng.rotateY(-Math.PI / 2); ng.translate(u, g + 1.95, v); V.add(S.netBlack, ng, { uvMode: 'keep', detail: true }); V.box(F.netBand, u - 0.03, g + 2.4, v - 5, u + 0.03, g + 2.46, v + 5);
    for (const [a, b] of [[-8, -4], [8, -4], [-8, 4], [8, 4]]) V.box(F.trimWhite, u + a - 0.025, g + 0.121, v - 4 + 0 * b, u + a + 0.025, g + 0.125, v + 4, { detail: true }); }
  // ---- Golden Bear Pool ----
  const P = new Kit(ctx, deg(74.5)); parts.push(P);
  { const [u, v] = P.uv(-108.0, -12.9); const g = P.gMax(u - 13, v - 8, u + 13, v + 8, 4);
    const res = pool(P, S, M, { u0: u - 11.4, u1: u + 11.4, v0: v - 6.25, v1: v + 6.25, lanes: 5, along: 'u', deck: 4.5, deckH: 0.35, blocks: 'u0', y: g, colliders, walkables });
    lifeguardChair(P, S, F, u + 2, v + 8.0, res.yd, -Math.PI / 2);
    for (let k = 0; k < 4; k++) lounger(P, F, u - 9 + k * 3.2, v - 8.5, res.yd, Math.PI / 2, k % 2 ? F.chairBlue : F.chairWhite);
    umbrella(P, F, u - 7.5, v - 9.6, res.yd, F.canvasNavy); umbrella(P, F, u + 1.5, v - 9.6, res.yd, F.canvasGold);
    fence(P, S, [[u - 16.2, v - 11], [u + 16.2, v - 11], [u + 16.2, v + 11], [u - 16.2, v + 11]], { h: 2.0, every: 3, y: () => res.yd, closed: true, gapAt: [3], colliders }); }
  const root = new THREE.Group(); for (const k of parts) root.add(k.finish()); root.name = 'golden-bear-recreation-center-field-and-';
  const c = K.xz(cu, cv);
  return { object3d: root, colliders, walkables, interactions: [{ id: 'gbrc-field', pos: [c[0], level + 1, c[1]], radius: 8, label: 'Golden Bear Recreation Center field' }] };
}
