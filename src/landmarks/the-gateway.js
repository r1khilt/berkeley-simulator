// The Gateway: the Barbara and Gerson Bakar Gateway (College of Computing, Data Science, and Society), Hearst Ave at
// Oxford St, completed 2026 - after the 2021 LiDAR, so massing follows the OSM footprint and photos: a serpentine block
// whose concave glass façades wrap a lawn courtyard toward Hearst/Oxford and a terrace on the campus side; a dark recessed
// ground floor, upper floors of faceted curtain wall striped by dense satin-aluminium fins, a set-back glazed top floor
// under a thin floating roof plane, and a white disc canopy on slender columns over the round entry plaza.
// The site falls ~15 m from east to west; floor plates stay level, so the building reads taller toward Oxford St.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { polyRuns, curtain, inset, std } from './lib/b06-modern.js';
import { nightGlow } from '../materials.js';

export const info = {
  id: 'the-gateway',
  name: 'The Gateway',
  subtitle: 'Bakar Gateway · Computing, Data Science, and Society · 2026',
  blurb: 'The Barbara and Gerson Bakar Gateway gives the College of Computing, Data Science, and Society a home at the western edge of campus, at Hearst Avenue and Oxford Street.',
  replaces: ['w/1460048471'],
};

export async function build(ctx) {
  const K = new Kit(ctx, 0); const M = ctx.M;
  const fp = ctx.footprints[0].outer.map(([x, z]) => [x, z]);
  const fin = std(0xe2e4e6, 'gwFin', { rough: 0.35, metal: 0.6 });
  const band = std(0xdcdee0, 'gwBand', { rough: 0.4, metal: 0.4 });
  const roofM = std(0xe9e8e4, 'gwRoof', { rough: 0.6 });
  const glass = nightGlow(std(0xa8b3ba, 'gwGlass', { rough: 0.08, metal: 0.65, envMapIntensity: 1.9, emissive: 0xffd9a0, emissiveIntensity: 0.9 }), 1.0);
  const glassDark = nightGlow(std(0x2e3236, 'gwGlassDark', { rough: 0.06, metal: 0.5, emissive: 0xffd9a0, emissiveIntensity: 1.2 }), 1.0);
  const white = std(0xf2f2f0, 'gwWhite', { rough: 0.5 });
  const colliders = [];
  const floors = [7.0, 11.0, 15.0, 19.0, 23.0]; const yRoof = 27.3;
  const g0 = Math.min(...fp.map(([x, z]) => K.g(x, z))) - 1;
  K.prism(M.concreteDark, inset(fp, 1.6), g0, yRoof - 0.2);
  for (const { R } of polyRuns(K, fp)) {
    const gA = Math.min(K.g(...R.at(0.1, 1)), K.g(...R.at(R.L - 0.1, 1)));
    const fl = floors.filter((f) => f > gA + 3.2);
    const base = fl.length ? fl[0] : yRoof - 4.4;
    // dark recessed ground storey with slim columns
    K.rbox(R, glassDark, 0, g0, -1.45, R.L, base - 0.5, -1.4);
    if (R.L > 6) for (let s = 3; s < R.L - 1; s += 7.5) K.rbox(R, white, s - 0.2, g0, -1.1, s + 0.2, base, -0.7);
    K.rbox(R, band, -0.02, base - 0.6, -1.45, R.L + 0.02, base + 0.1, 0.05);
    // upper floors to the roof: curtain wall gridded by silver fins (1.5 m) and bright slab-edge bands at every floor
    curtain(K, R, 0, R.L, base + 0.1, yRoof, fl.slice(1), { glass, mull: 0, band: 0.35, bandMat: band, bandD: 0.15, recess: 0.05,
      fins: { pitch: 1.5, depth: 0.25, w: 0.1, mat: fin, skipBands: true, detail: false } });
    K.rbox(R, band, -0.05, yRoof - 0.05, -0.1, R.L + 0.05, yRoof + 0.3, 0.12); // thin silver coping
  }
  // roof: membrane with plant set well back, light grey
  K.prism(roofM, inset(fp, 0.1), yRoof - 0.3, yRoof);
  { const ph = std(0xbfc3c6, 'gwPlant', { rough: 0.6, metal: 0.3 }); K.box(ph, 10, yRoof, -22, 40, yRoof + 3.0, -8); K.box(ph, -62, yRoof, 8, -40, yRoof + 2.6, 26); }
  // round entry plaza and white disc canopy on slender columns in the Hearst-side courtyard (centre of the north curve)
  { const cx = -31.0, cz = -10.6, r = 7.2; const g = K.g(cx, cz);
    const disc = new THREE.CylinderGeometry(r, r, 0.5, 56); disc.translate(cx, g + 5.25, cz); K.add(white, disc);
    const cg = new THREE.CircleGeometry(r * 1.25, 40); cg.rotateX(-Math.PI / 2); cg.translate(cx, g + 0.04, cz); K.add(M.paving, cg);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const x = cx + Math.cos(a) * r * 0.75, z = cz + Math.sin(a) * r * 0.75; K.cyl(white, x, g - 0.5, z, 0.125, 0.125, 5.5 + 0.5, 10); colliders.push({ type: 'cyl', x, z, r: 0.2, y0: g - 1, y1: g + 5 }); }
    for (const rr of [r * 1.6, r * 2.1]) { const ring = new THREE.RingGeometry(rr, rr + 1.4, 48, 1, Math.PI * 0.05, Math.PI * 0.9); ring.rotateX(-Math.PI / 2); ring.translate(cx, g + 0.05, cz); K.add(M.concrete, ring); } }
  colliders.push({ type: 'poly', pts: fp, y0: g0, y1: yRoof + 1 });
  const object3d = K.finish(); object3d.name = 'the-gateway';
  return { object3d, colliders };
}
