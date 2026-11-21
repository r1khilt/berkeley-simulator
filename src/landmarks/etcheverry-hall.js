// Etcheverry Hall (1964; Skidmore, Owings & Merrill): mechanical and nuclear engineering on Hearst Avenue.
// A long slab with an exposed buff concrete frame (piers + floor bands) infilled with grey-mauve brick, punched by projecting
// box window surrounds whose upper part is a square lattice sunscreen grille, three windows per bay in a syncopated rhythm;
// stacked cantilevered balconies with heavy timber rails on the Hearst end; two long rooftop penthouses.
// Massing follows the 2021 LiDAR: roof 24.2 m above the lowest grade, penthouses 29.5 m, centre plant 26.8 m.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, bays, gAt, signText } from './lib/b03-kit.js';

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
  const CON = B.precastWarm, GL = B.glassGrey, FR = M.darkBronze;
  const BRICK = new THREE.MeshStandardMaterial({ color: 0x958aa8, roughness: 0.9, map: B.brickBuff.map, normalMap: B.brickBuff.normalMap, roughnessMap: B.brickBuff.roughnessMap });
  const GRILLE = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.8 }); const BOX = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.75 });
  const colliders = [], walkables = [];
  const u0 = -12.6, u1 = 13.9, v0 = -38.6, v1 = 38.2, ROOF = 24.2;
  const levels = [-4.5, -0.3, 3.9, 8.0, 12.1, 16.2, 20.3, ROOF - 0.2];
  const WB = 6.2, WW = 1.4, OFF = 1.3;
  const runs = massBlock(K, {
    poly: rect(u0, v0, u1, v1), levels, top: ROOF - 0.2, wall: BRICK, style: 'punched', depth: 0.35, rev: 0.3, glass: GL, frame: FR,
    win: { w: WW, h: 1.45, sill: 0.75, bay: WB, mull: 1, off: OFF }, roof: B.roofMembrane, parapet: 0.8, pmat: CON,
    pier: { w: 0.6, p: 0.3, mat: CON, top: ROOF + 0.6, ends: true }, floorBand: { mat: CON, h: 0.7, p: 0.3 },
  });
  // projecting box surrounds with lattice sunscreen grilles above each window
  for (const R of runs) {
    const nb = Math.max(1, Math.round(R.L / WB)); const cs = bays(0, R.L, nb).map((c) => c + OFF);
    for (let k = 1; k < levels.length - 1; k++) {
      const fl = levels[k]; const y0 = fl + 0.75, y1 = fl + 0.75 + 1.45, yg = Math.min(levels[k + 1] - 0.35, y1 + 1.0);
      cs.forEach((c, i) => {
        if (y0 < gAt(K, R, c, 0.6) + 0.25) return;
        const a = c - WW / 2 - 0.2, b = c + WW / 2 + 0.2;
        K.rbox(R, BOX, a, y0 - 0.1, -0.02, a + 0.2, yg, 0.45); K.rbox(R, BOX, b - 0.2, y0 - 0.1, -0.02, b, yg, 0.45);
        K.rbox(R, BOX, a, yg, -0.02, b, yg + 0.2, 0.45); K.rbox(R, BOX, a, y0 - 0.2, -0.02, b, y0, 0.48);
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
      for (const [s0, s1] of [[0.8, sc - 0.6], [sc + 0.6, R.L - 0.8]]) {
        K.rbox(R, CON, s0, y - 0.4, 0, s1, y, 2.5);
        for (const s of [s0 + 0.2, (s0 + s1) / 2, s1 - 0.4]) K.rbox(R, CON, s, y - 0.9, 0, s + 0.3, y - 0.35, 2.0); // outrigger brackets
        K.rbox(R, M.wood, s0, y + 0.95, 2.0, s1, y + 1.25, 2.3); // timber top rail
        K.rbox(R, M.wood, s0, y + 0.5, 2.05, s1, y + 0.75, 2.3);
        for (let s = s0 + 0.1; s < s1; s += 2.4) K.rbox(R, M.wood, s, y, 2.05, s + 0.25, y + 0.95, 2.3);
      }
    }
    K.rbox(R, CON, sc - 0.6, levels[1], 0, sc + 0.6, ROOF + 0.6, 2.4); // central column
    signText(K, R, 'ETCHEVERRY HALL', 6.0, Math.max(gAt(K, R, 6, 1), levels[0]) + 2.2, 0.32, { color: '#3a3530', metal: 0.3, spacing: 0.08 });
  }
  // rooftop penthouses (LiDAR 29.5 m) and the central plant box (26.8 m), with exhaust stacks
  for (const [a, b, c, d, h] of [[-4.4, -37.0, 7.5, -15.0, 29.4], [-4.1, 15.0, 7.3, 37.3, 29.4], [-3.6, -4.0, 6.4, 1.2, 26.8]]) {
    massBlock(K, { poly: rect(a, b, c, d), levels: [ROOF, h], top: h, wall: CON, style: 'blank', depth: 0.35, roof: B.roofMembrane, core: true });
    for (let y = ROOF + 0.6; y < h - 0.4; y += 0.6) K.box(M.iron, a - 0.05, y, b + 2, a, y + 0.05, d - 2, { detail: true });
  }
  for (const [x, z] of [[-8, -30], [-8, -26], [10, 28]]) K.cyl(B.alum, x, ROOF, z, 0.35, 0.3, 4.5, 10);
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -5, ROOF + 1));
  const object3d = K.finish(); object3d.name = 'etcheverry-hall';
  return { object3d, colliders, walkables };
}
