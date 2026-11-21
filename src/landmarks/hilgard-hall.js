// Hilgard Hall (John Galen Howard, 1917). The agricultural group's showpiece: a long three-storey block on a banded podium
// whose east front (between two angled end wings embracing the lawn) has giant fluted pilasters, a polychrome sgraffito
// frieze of garlands and bulls' heads, and the attic inscription "TO RESCUE FOR HUMAN SOCIETY THE NATIVE VALUES OF RURAL
// LIFE"; red-tile hip roofs above. LiDAR: eaves ~13 m, ridges ~18.5 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect, hipPoly, orient } from './lib/b02-gen.js';
import { inscription } from './lib/b02-kit.js';
export const info = {
  id: 'hilgard-hall', name: 'Hilgard Hall', subtitle: 'John Galen Howard · 1917',
  blurb: 'Named for soil scientist Eugene W. Hilgard, it is famous for its colourful sgraffito frieze of agricultural motifs and the inscription "To rescue for human society the native values of rural life."',
  replaces: ['w/24025040', 'way/24025040'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.7)); const M = ctx.M;
  const ST = tint(M.stuccoWhite, 0xdcd7ca), BASE = tint(M.concrete, 0xcac4b6), FR = solid(0x5a2e22, 0.6, 0.1), SOF = tint(M.woodDark, 0x8a6f52);
  // sgraffito frieze texture: garlands + bucrania roundels in buff / blue-grey / ochre
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#d9cfb8'; g.fillRect(0, 0, 512, 64); g.strokeStyle = '#7d8c95'; g.lineWidth = 5;
  for (let x = 0; x < 512; x += 128) { g.beginPath(); g.arc(x + 64, 6, 52, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.fillStyle = '#b8874a'; g.beginPath(); g.arc(x + 4, 30, 17, 0, 2 * Math.PI); g.fill(); g.fillStyle = '#e8dfc8'; g.beginPath(); g.arc(x + 4, 30, 9, 0, 2 * Math.PI); g.fill(); g.fillStyle = '#9a6b3a'; g.fillRect(x + 50, 46, 28, 10); }
  g.fillStyle = '#8d5a3a'; g.fillRect(0, 0, 512, 4); g.fillRect(0, 60, 512, 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; const FZ = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const win = (k) => ({ w: 1.6, h: 2.1, sill: 0.9, mull: 1, muntins: 3 });
  const D = { mat: ST, baseMat: BASE, frame: FR, fl: 2.4, levels: [2.4, 6.6, 10.6], top: 13.0, bay: 3.45, winFn: win, baseWin: { w: 1.6, h: 1.0, sill: 0.5, mull: 1 }, beltAt: [2.4], cornice: { P: 0.6, H: 0.7 }, soffit: SOF };
  const parts = [
    { poly: rect(-14.0, -29.3, 6.4, 28.7), roof: 'hip', eave: 13.1, slope: 0.52, ov: 0.6 },
    { poly: [[-14.0, -29.3], [2.4, -43.8], [12.8, -45.6], [15.9, -27.5], [6.3, -21.0]], roof: 'hip', eave: 13.1, slope: 0.5, ov: 0.6 },
    { poly: [[-14.0, 28.7], [6.8, 42.2], [19.8, 39.6], [15.7, 19.0], [6.6, 17.3]], roof: 'hip', eave: 13.1, slope: 0.5, ov: 0.6 },
  ];
  const colliders = genParts(K, parts, D);
  // east front between the wings: giant pilasters, frieze, attic inscription
  const R = K.run([6.45, 17.2], [6.45, -20.4]); const nb = 11; const bw = R.L / nb;
  for (let i = 0; i <= nb; i++) { const s = i * bw; K.rbox(R, ST, s - 0.42, 2.4, 0, s + 0.42, 10.9, 0.32); K.rbox(R, ST, s - 0.55, 10.4, 0, s + 0.55, 10.95, 0.42); K.rbox(R, BASE, s - 0.5, 2.4, 0, s + 0.5, 3.0, 0.4); for (let k = -1; k <= 1; k++) K.rbox(R, BASE, s + k * 0.22 - 0.03, 3.2, 0.32, s + k * 0.22 + 0.03, 10.2, 0.36, { detail: true }); }
  const fg = new THREE.PlaneGeometry(R.L, 0.95); const uv = fg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * R.L / 5.5); fg.translate(R.L / 2, 11.5, 0.47); K.addRun(R, FZ, fg, { uvMode: 'keep' });
  K.rbox(R, ST, 0, 10.95, 0, R.L, 11.02, 0.46);
  K.rbox(R, ST, 0, 13.0, -0.4, R.L, 15.1, 0.25); // attic band
  inscription(K, R, 1.0, R.L - 1.0, 13.45, 14.6, 0.255, 'TO RESCUE FOR HUMAN SOCIETY THE NATIVE VALUES OF RURAL LIFE', { fg: '#6a6252', cut: true, spacing: 0.08 });
  K.rbox(R, ST, -0.1, 15.1, -0.4, R.L + 0.1, 15.4, 0.4);
  // entrance: bronze grille door, lamp standards, tile stair
  const sC = R.L / 2; K.rbox(R, M.darkBronze, sC - 1.0, 2.4, 0.05, sC + 1.0, 5.6, 0.12); K.rbox(R, BASE, sC - 1.4, 5.6, 0, sC + 1.4, 6.1, 0.3);
  const gL = K.g(...R.at(sC, 6)); const n = Math.max(3, Math.round((2.4 - gL) / 0.16));
  const walk = K.stairs(tint(M.brick, 0x9a4535), 6.45, -2.5 - 0.0 + (17.2 - sC) - 17.2 + 0, 6.45 + n * 0.34, 2.5 + (17.2 - sC) - 17.2, gL, 2.4, '-u', n);
  for (const dv of [-3.2, 3.2]) { const [u, v] = [6.45 + 0.6, (17.2 - sC) + dv]; K.cyl(M.iron, u, 2.4, v, 0.08, 0.06, 3.0, 8, { detail: true }); K.lathe(M.lampGlow, [[0.05, 0], [0.2, 0.15], [0.22, 0.5], [0.1, 0.68]], u, 5.4, v, 10, { detail: true }); }
  const object3d = K.finish(); object3d.name = 'hilgard-hall';
  return { object3d, colliders, walkables: [walk] };
}
