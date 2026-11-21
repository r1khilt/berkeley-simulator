// Giannini Hall (William C. Hays, 1930), agricultural economics. A three-storey cast-stone block with chamfered corners, a
// dentilled cornice and a low red-tile hip roof; its entrance front is a stripped-classical frontispiece of four flat piers
// capped by carved agricultural reliefs, with "GIANNINI HALL" cut in the lintel. The long wing runs obliquely between two
// end blocks set on the campus grid. LiDAR: eaves ~13.5 m, ridge ~17.5 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect, dentils } from './lib/b02-gen.js';
import { inscription } from './lib/b02-kit.js';
export const info = {
  id: 'giannini-hall', name: 'Giannini Hall', subtitle: 'William C. Hays · 1930',
  blurb: 'Funded by Bank of Italy founder A. P. Giannini for the Giannini Foundation of Agricultural Economics, the hall closes the west side of the agricultural group.',
  replaces: ['w/24025042', 'way/24025042'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(62.6)); const M = ctx.M;
  const ST = tint(M.stuccoWhite, 0xe6dfd1), BASE = tint(M.concrete, 0xc9c2b2), FR = solid(0x1e2a24, 0.5, 0.3), SOF = tint(M.woodDark, 0x8a6f52);
  const win = (k) => ({ w: 1.15, h: k === 2 ? 1.5 : 1.9, sill: 0.9, mull: 2, muntins: 3 });
  const D = { mat: ST, baseMat: BASE, frame: FR, fl: 1.6, levels: [1.6, 5.6, 9.6, 12.9], top: 13.5, bay: 3.3, winFn: win, baseWin: { w: 1.1, h: 0.7, sill: 0.4, mull: 2 }, beltAt: [1.6], cornice: { P: 0.5, H: 0.6 }, dentils: true, soffit: SOF };
  const colliders = genParts(K, [
    { poly: [[-27.0, -14.4], [28.9, -14.4], [35.9, -4.2], [19.1, 6.2], [-22.8, 9.7], [-41.7, 0.9]], roof: 'hip', eave: 13.6, slope: 0.38, ov: 0.45 },
    { poly: [[-41.7, 0.9], [-22.8, 9.7], [-24.5, 18.1], [-44.3, 14.2]], roof: 'hip', eave: 13.6, slope: 0.36, ov: 0.45 },
    { poly: [[21.4, 10.0], [19.1, 6.2], [35.9, -4.2], [42.7, 5.7], [40.2, 18.9], [20.5, 15.2]], roof: 'hip', eave: 13.6, slope: 0.36, ov: 0.45 },
  ], D);
  // frontispiece on the long south-west face (v = -14.4 side faces... the -v side)
  const R = K.run([28.9, -14.4], [-27.0, -14.4]); const sC = R.L / 2;
  for (const ds of [-4.6, -1.6, 1.6, 4.6]) { K.rbox(R, ST, sC + ds - 0.55, 1.6, 0, sC + ds + 0.55, 12.9, 0.55); K.rbox(R, BASE, sC + ds - 0.62, 11.2, 0.55, sC + ds + 0.62, 12.6, 0.68, { detail: true }); }
  K.rbox(R, ST, sC - 5.3, 12.9, 0, sC + 5.3, 13.6, 0.7);
  K.rbox(R, M.windowNight, sC - 1.0, 1.6, 0.05, sC + 1.0, 4.4, 0.1); K.rbox(R, FR, sC - 1.05, 4.4, 0.05, sC + 1.05, 4.55, 0.14);
  inscription(K, R, sC - 2.9, sC + 2.9, 4.75, 5.35, 0.56, 'GIANNINI HALL', { fg: '#625a4c', cut: true });
  K.rbox(R, ST, sC - 1.1, 4.6, 0, sC + 1.1, 5.5, 0.555);
  for (const ds of [-3.1, 3.1]) { K.rbox(R, M.windowNight, sC + ds - 0.85, 2.0, 0.05, sC + ds + 0.85, 9.0, 0.1); for (let y = 2.8; y < 9; y += 0.8) K.rbox(R, FR, sC + ds - 0.85, y - 0.03, 0.1, sC + ds + 0.85, y + 0.03, 0.14, { detail: true }); }
  for (let s = sC - 0.9; s <= sC + 0.9; s += 0.15) K.rbox(R, M.iron, s - 0.015, 9.8, 0.6, s + 0.015, 10.7, 0.63, { detail: true });
  const gL = K.g(...R.at(sC, 5)); const n = Math.max(3, Math.round((1.6 - gL) / 0.16));
  const p0 = R.at(sC - 2.0, 0), p1 = R.at(sC + 2.0, n * 0.34);
  const walk = K.stairs(BASE, Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1]), gL, 1.6, '+v', n);
  const object3d = K.finish(); object3d.name = 'giannini-hall';
  return { object3d, colliders, walkables: [walk] };
}
