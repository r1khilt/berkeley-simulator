// Etcheverry Hall (1964; Skidmore, Owings & Merrill): mechanical and nuclear engineering on Hearst Avenue.
// A long slab with an exposed buff concrete frame (piers + floor bands) infilled with grey-mauve brick, punched by projecting
// box window surrounds whose upper part is a square lattice sunscreen grille, three windows per bay in a syncopated rhythm;
// stacked cantilevered balconies with heavy timber rails on the Hearst end; two long rooftop penthouses.
// Massing follows the 2021 LiDAR: roof 24.2 m above the lowest grade, penthouses 29.5 m, centre plant 26.8 m.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, bays, gAt, signText, storefront } from './lib/b03-kit.js';
import { pathEntrances, planter, planting, bikes, furniture, rnMats } from './lib/rn-kit.js';

export const info = {
  id: 'etcheverry-hall',
  name: 'Etcheverry Hall',
  subtitle: 'Skidmore, Owings & Merrill · 1964',
  blurb: 'Named for Bernard Etcheverry, a pioneer of irrigation engineering, this long concrete-and-brick slab on Hearst Avenue houses mechanical and nuclear engineering and, for decades, the campus research reactor.',
  replaces: ['w/24024292'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9.3);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const CON = new THREE.MeshStandardMaterial({ color: 0xd2c0a6, roughness: 0.9, map: B.precast.map, normalMap: B.precast.normalMap, roughnessMap: B.precast.roughnessMap }); const GL = M.windowNight, FR = M.darkBronze;
  const BRICK = new THREE.MeshStandardMaterial({ color: 0x8e8286, roughness: 0.9, map: B.brickBuff.map, normalMap: B.brickBuff.normalMap, roughnessMap: B.brickBuff.roughnessMap });
  const GRILLE = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.8 }); const BOX = new THREE.MeshStandardMaterial({ color: 0x6e4e3a, roughness: 0.75 });
  const colliders = [], walkables = [];
  const u0 = -12.6, u1 = 13.9, v0 = -38.6, v1 = 38.2, ROOF = 24.2;
  const levels = [-4.5, -0.3, 3.9, 8.0, 12.1, 16.2, 20.3, ROOF - 0.2];
  const WB = 6.2, WW = 1.9, OFF = 1.3;
  const runs = massBlock(K, {
    poly: rect(u0, v0, u1, v1), levels, top: ROOF - 0.2, wall: BRICK, style: 'punched', depth: 0.35, rev: 0.3, glass: GL, frame: FR,
    win: { w: WW, h: 1.85, sill: 0.75, bay: WB, mull: 1, off: OFF }, roof: B.roofMembrane, parapet: 0.8, pmat: CON,
    pier: { w: 0.6, p: 0.3, mat: CON, top: ROOF + 0.6, ends: true }, floorBand: { mat: CON, h: 0.7, p: 0.3 },
  });
  // projecting box surrounds with lattice sunscreen grilles above each window
  for (const R of runs) {
    const nb = Math.max(1, Math.round(R.L / WB)); const cs = bays(0, R.L, nb).map((c) => c + OFF);
    for (let k = 1; k < levels.length - 1; k++) {
      const fl = levels[k]; const y0 = fl + 0.75, y1 = fl + 0.75 + 1.85, yg = Math.min(levels[k + 1] - 0.3, y1 + 1.1);
      cs.forEach((c, i) => {
        if (y0 < gAt(K, R, c, 0.6) + 0.25) return;
        const a = c - WW / 2 - 0.2, b = c + WW / 2 + 0.2;
        K.rbox(R, BOX, a, y0 - 0.1, -0.02, a + 0.2, yg, 0.55); K.rbox(R, BOX, b - 0.2, y0 - 0.1, -0.02, b, yg, 0.55);
        K.rbox(R, BOX, a, yg, -0.02, b, yg + 0.2, 0.55); K.rbox(R, BOX, a, y0 - 0.2, -0.02, b, y0, 0.58);
        K.rbox(R, GRILLE, a + 0.2, y1 + 0.05, 0.22, b - 0.2, yg, 0.26);
        for (let g = 1; g < 8; g++) { const x = a + 0.2 + (b - a - 0.4) * g / 8; K.rbox(R, BOX, x - 0.025, y1 + 0.05, 0.26, x + 0.025, yg, 0.3, { detail: true }); }
        for (let g = 1; g < 7; g++) { const y = y1 + 0.05 + (yg - y1 - 0.05) * g / 7; K.rbox(R, BOX, a + 0.2, y - 0.025, 0.26, b - 0.2, y + 0.025, 0.3, { detail: true }); }
      });
    }
  }
  // stacked cantilevered balconies with heavy timber rails on the Hearst (south) end, split by a central column
  {
    const R = K.run([u0, v1], [u1, v1]); const sc = R.L * 0.62;
    for (let k = 2; k < levels.length - 1; k++) {
      const y = levels[k];
      for (const [s0, s1] of [[0.8, sc - 0.6]]) { // the stacked balconies sit on the western part of the end only
        K.rbox(R, CON, s0, y - 0.35, 0, s1, y, 2.8);
        for (const s of [s0 + 0.5, s1 - 0.8]) K.rbox(R, CON, s, y - 1.0, 0, s + 0.3, y - 0.3, 2.6); // two outrigger brackets
        K.rbox(R, M.woodDark, s0, y + 0.55, 2.35, s1, y + 1.1, 2.7); // heavy timber parapet beam
        for (const s of [s0 + 0.5, (s0 + s1) / 2, s1 - 0.8]) K.rbox(R, M.woodDark, s, y, 2.4, s + 0.25, y + 0.55, 2.65);
      }
    }
    K.rbox(R, CON, sc - 0.6, levels[1], 0, sc - 0.3, ROOF + 0.6, 0.6); // end pier where the balconies stop
    signText(K, R, 'ETCHEVERRY HALL', 6.0, Math.max(gAt(K, R, 6, 1), levels[0]) + 2.2, 0.32, { color: '#3a3530', metal: 0.3, spacing: 0.08 });
  }
  // rooftop penthouses (LiDAR 29.5 m) and the central plant box (26.8 m), with exhaust stacks
  for (const [a, b, c, d, h] of [[-4.4, -37.0, 7.5, -15.0, 29.4], [-4.1, 15.0, 7.3, 37.3, 29.4], [-3.6, -4.0, 6.4, 1.2, 26.8]]) {
    massBlock(K, { poly: rect(a, b, c, d), levels: [ROOF, h], top: h, wall: CON, style: 'blank', depth: 0.35, roof: B.roofMembrane, core: true });
    for (let y = ROOF + 0.6; y < h - 0.4; y += 0.6) K.box(M.iron, a - 0.05, y, b + 2, a, y + 0.05, d - 2, { detail: true });
  }
  for (const [x, z] of [[-8, -30], [-8, -26], [10, 28]]) K.cyl(B.alum, x, ROOF, z, 0.35, 0.3, 4.5, 10);
  // ground floor: glazed lobby entrances where the paths arrive (east walk under Soda's pergola, Hearst end), planters, bikes
  { const X = rnMats(M); const ents = pathEntrances(K, ctx, runs).slice(0, 3);
    for (const e of ents) { const R = e.R; const s = Math.min(R.L - 4, Math.max(4, e.s)); const g = Math.max(gAt(K, R, s, 1.5), levels[0]);
      if (g > levels[2]) continue;
      K.rbox(R, CON, s - 3.4, g - 0.5, 0, s + 3.4, g + 3.7, 0.5); K.rbox(R, M.concreteDark, s - 2.9, g + 0.02, 0.5, s + 2.9, g + 3.2, 0.52);
      storefront(K, R, s - 2.8, s + 2.8, g + 0.03, g + 3.15, { glass: GL, frame: FR, rev: -0.53, transom: g + 2.4, mw: 1.4 });
      K.rbox(R, CON, s - 4.0, g + 3.7, 0, s + 4.0, g + 3.95, 2.4); // slab canopy
      for (const ds of [-5.6, 5.6]) colliders.push(planter(K, R, s + ds, 0.4, 2.2, 1.4, 0.9, { mat: CON }));
      K.rbox(R, M.paving, s - 3.5, g - 0.3, 0.5, s + 3.5, g + 0.03, 3.0); }
    for (const R of runs) if (R.L > 50) planting(K, R, 2, R.L - 2, { d0: 0.2, depth: 1.3, h: 0.85, skip: ents.filter((e) => e.R === R).map((e) => [e.s - 7.5, e.s + 7.5]), seed: 12 });
    const RS = runs.find((r) => r.n[1] > 0.9); if (RS) colliders.push(...bikes(K, RS, RS.L * 0.25, 4.2, 6, 3)); }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -5, ROOF + 1));
  const object3d = K.finish(); object3d.name = 'etcheverry-hall';
  return { object3d, colliders: colliders.filter(Boolean), walkables };
}
