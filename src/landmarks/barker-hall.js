// Barker Hall (1964), a seven-storey cast-concrete laboratory block at the north-west corner of campus (molecular and cell
// biology labs and the Helen Wills Neuroscience Institute). A plain 1960s lab slab: a structural grid of deep concrete fins at
// ~3.2 m bays, pairs of tall lab windows with dark bronze glass between flush spandrels, a recessed ground storey with a glass
// storefront, a timber pergola on round concrete columns at the main (south) entrance, low board-formed planter benches, and a
// concrete-clad penthouse with lab exhaust stacks. LiDAR: roof ~30.5 m, penthouse ~35 m.
// (refine-north rebuild: the previous version read as a neoclassical masonry block with dense slots.)
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, gAt, storefront, signText } from './lib/b03-kit.js';
import { pathEntrances, planting, bikes, furniture, rnMats, tube } from './lib/rn-kit.js';

export const info = {
  id: 'barker-hall', name: 'Barker Hall', subtitle: '1964 · Life sciences labs',
  blurb: 'A 1960s concrete laboratory tower named for UC regent Warren Barker, now home to molecular and cell biology research and the Helen Wills Neuroscience Institute.',
  replaces: ['w/24024683', 'way/24024683'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-5)); const M = ctx.M; const B = mats(ctx); const X = rnMats(M);
  const C = new THREE.MeshStandardMaterial({ color: 0xc9cbc7, roughness: 0.92, map: B.precast.map, normalMap: B.precast.normalMap, roughnessMap: B.precast.roughnessMap });
  const FR = new THREE.MeshStandardMaterial({ color: 0x3a342d, roughness: 0.45, metalness: 0.6 }); const GL = M.windowNight;
  const colliders = [], walkables = [];
  const u0 = -20.1, u1 = 20.0, v0 = -15.15, v1 = 15.15, TOP = 30.6;
  const levels = [-1.5, 4.6]; for (let k = 1; k <= 6; k++) levels.push(4.6 + k * 4.1); levels[levels.length - 1] = TOP;
  // lab storeys: pairs of tall windows per 3.2 m bay, deep fins on every bay line; the ground storey is recessed glass (below)
  const runs = massBlock(K, { poly: rect(u0, v0, u1, v1), levels, top: TOP, wall: C, style: 'punched', depth: 0.45, rev: 0.4, glass: GL, frame: FR,
    win: { w: 2.3, h: 2.55, sill: 0.8, bay: 3.2, mull: 1 }, winAt: (k) => (k === 0 ? { w: 2.7, h: 3.4, sill: 0.3, mull: 2 } : null),
    pier: { w: 0.4, p: 0.6, mat: C, top: TOP + 0.75, ends: true }, roof: B.roofMembrane, parapet: 0.75, pmat: C, coping: C });
  // penthouse + louvres + lab exhaust stacks
  massBlock(K, { poly: rect(-7, -4.5, 5, 4.5), levels: [TOP, 35.0], top: 35.0, wall: C, style: 'blank', depth: 0.35, roof: B.roofMembrane, core: true, parapet: 0.3, pmat: C });
  for (const [a, b, c, d, h] of [[-16, 7, -3, 12, 33.4], [6, -12, 15, -7, 33.0]]) { K.box(C, a, TOP, b, c, h, d); for (let y = TOP + 0.5; y < h - 0.3; y += 0.3) K.box(M.iron, a - 0.04, y, b - 0.04, c + 0.04, y + 0.06, d + 0.04, { detail: true }); }
  for (const [u, v] of [[-12, -10], [-9, -10], [-6, -10], [-3, -10], [8, 3], [11, 3], [14, 3], [8, 8], [11, 8]]) K.cyl(B.alum, u, TOP, v, 0.32, 0.3, 3.2, 10);
  // south entrance: storefront, board-formed wall, round concrete columns carrying a timber pergola, planter benches, lettering
  {
    const R = runs.find((r) => r.n[1] > 0.9) || runs[0]; const sc = R.L / 2; const g = Math.max(gAt(K, R, sc, 2), levels[0] + 0.2);
    K.rbox(R, M.concreteDark, sc - 6.4, g, 0.0, sc + 6.4, g + 3.9, 0.47);
    storefront(K, R, sc - 6.2, sc + 6.2, g + 0.03, g + 3.8, { glass: GL, frame: FR, rev: -0.5, transom: g + 2.6, mw: 1.55 });
    K.rbox(R, C, sc + 6.4, g - 0.5, 0, sc + 14.4, g + 3.9, 0.9); // board-formed wall beside the doors
    signText(K, R, 'HELEN WILLS NEUROSCIENCE INSTITUTE', sc + 10.4, g + 2.5, 0.24, { d: 0.912, color: '#2b2620', metal: 0.5, rough: 0.5, font: 'Helvetica, Arial, sans-serif', weight: '600', spacing: 0.06 });
    signText(K, R, 'BARKER HALL', sc + 10.4, g + 3.2, 0.34, { d: 0.912, color: '#2b2620', metal: 0.5, rough: 0.5, font: 'Helvetica, Arial, sans-serif', weight: '600', spacing: 0.1 });
    const PD = 4.2, PH = g + 3.6; const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.75, map: M.wood.map, normalMap: M.wood.normalMap });
    for (const ds of [-6.0, -2.0, 2.0, 6.0]) { const p = R.at(sc + ds, PD - 0.3); const gg = gAt(K, R, sc + ds, PD - 0.3); K.cyl(C, p[0], gg - 0.5, p[1], 0.3, 0.3, PH - gg + 0.5, 16); colliders.push(K.colCyl(p[0], p[1], 0.32, gg - 1, PH)); }
    K.rbox(R, WOOD, sc - 6.5, PH, PD - 0.45, sc + 6.5, PH + 0.32, PD - 0.15); K.rbox(R, WOOD, sc - 6.5, PH, 0.0, sc + 6.5, PH + 0.32, 0.25);
    for (let s = sc - 6.4; s <= sc + 6.41; s += 0.6) K.rbox(R, WOOD, s - 0.1, PH + 0.32, 0.0, s + 0.1, PH + 0.62, PD + 0.3, { detail: true });
    K.rbox(R, M.paving, sc - 10, g - 0.3, 0.45, sc + 11, g + 0.03, PD + 1.5);
    for (const [a, b] of [[sc - 13.5, sc - 7.5], [sc + 14.8, sc + 18.5]]) { K.rbox(R, C, a, g - 0.4, PD + 0.4, b, g + 0.45, PD + 1.3); K.rbox(R, X.mulch, a + 0.1, g + 0.45, PD + 0.5, b - 0.1, g + 0.47, PD + 1.2, { detail: true }); colliders.push(K.colPoly([R.at(a, PD + 0.4), R.at(b, PD + 0.4), R.at(b, PD + 1.3), R.at(a, PD + 1.3)], g - 0.5, g + 0.45)); }
    walkables.push(K.walkPoly([R.at(sc - 10, 0.45), R.at(sc + 11, 0.45), R.at(sc + 11, PD + 1.5), R.at(sc - 10, PD + 1.5)], g + 0.03));
    colliders.push(...bikes(K, R, sc - 10.5, 2.4, 5, 3));
    planting(K, R, 0.8, R.L - 0.8, { d0: 0.5, depth: 1.2, h: 0.85, skip: [[sc - 14, sc + 16]], seed: 91 });
  }
  // other doors where the packet's paths arrive (north / east / west)
  for (const e of pathEntrances(K, ctx, runs.filter((r) => r.n[1] <= 0.9)).slice(0, 2)) {
    const R = e.R; const s = Math.min(R.L - 3, Math.max(3, e.s)); const g = Math.max(gAt(K, R, s, 1.5), levels[0] + 0.2);
    if (g > levels[2]) continue;
    K.rbox(R, C, s - 2.3, g - 0.5, 0, s + 2.3, g + 3.6, 0.65); storefront(K, R, s - 1.6, s + 1.6, g + 0.03, g + 3.0, { glass: GL, frame: FR, rev: -0.66, transom: g + 2.4, mw: 1.6 });
    K.rbox(R, C, s - 2.8, g + 3.6, 0, s + 2.8, g + 3.85, 1.8);
  }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -2, TOP + 1));
  const object3d = K.finish(); object3d.name = 'barker-hall';
  return { object3d, colliders: colliders.filter(Boolean), walkables };
}
