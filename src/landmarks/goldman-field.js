// Goldman Field: the natural-grass soccer pitch inside the Edwards Stadium oval (home of Cal men's and women's soccer).
// Canvas-painted mowing stripes, worn goalmouths, FIFA markings, the white throwing-sector lines that the track team
// paints across the north half, full-size goals with nets and corner flags.
import * as THREE from 'three';
import { Kit, sportsMats, fieldTexture, paintGrass, soccerLines, pen, ln, arc, surfaceMat, drapePoly, rectRing, fieldUV, soccerGoal, deg } from './lib/b11-sports.js';

export const info = {
  id: 'goldman-field',
  name: 'Goldman Field',
  subtitle: 'Cal soccer · inside Edwards Stadium',
  blurb: 'The grass soccer pitch inside the Edwards Stadium track, home of the Cal men\'s and women\'s soccer teams.',
  replaces: ['w/109189914', 'way/109189914'],
};

export async function build(ctx) {
  const { M } = ctx; const S = sportsMats(M);
  const K = new Kit(ctx, deg(-99.24));
  const [tu, tv] = K.uv(-2.04, 0.39); // track centre: the pitch is centred in the oval (the OSM outline sits ~2 m east)
  const cu = tu, cv = tv;
  const LU = 106, LV = 67, L = 103, W = 65;
  const yF = K.g(cu, cv); const Y = (u, v) => Math.max(K.g(u, v), yF - 0.15) + 0.07;
  const cageU = 84.45 / 2 + 17; // throwing circle (north D) in field coords
  const tex = fieldTexture(LU, LV, (P) => {
    paintGrass(P, { col: '#5b8a3c', alt: '#618f40', stripe: 6.5, seed: 21, blotch: 1, wear: [[-L / 2 + 6, 0, 7, 9, 0.45], [L / 2 - 6, 0, 7, 9, 0.45], [0, 0, 10, 6, 0.18]] });
    // throwing sector lines (34.92 deg) and distance arcs from the north cage, faint
    pen(P, 'rgba(244,244,239,0.5)', 0.07); const half = deg(34.92 / 2);
    for (const s of [-1, 1]) ln(P, cageU, 0, cageU - Math.cos(half) * 90, s * Math.sin(half) * 90);
    P.c.strokeStyle = 'rgba(244,244,239,0.3)'; for (let r = 40; r <= 70; r += 10) arc(P, cageU, 0, r, Math.PI - half, Math.PI + half);
    soccerLines(P, { L, W, lw: 0.12 });
  }, { pxm: 16 });
  const fm = surfaceMat(tex, { rough: 0.95 });
  drapePoly(K, fm, rectRing(cu - LU / 2, cv - LV / 2, cu + LU / 2, cv + LV / 2), { maxEdge: 4, yFn: Y, uvFn: fieldUV(cu, cv, LU, LV) });
  for (const s of [-1, 1]) soccerGoal(K, S, cu + s * L / 2, cv, { dirU: -s, y0: yF + 0.05 });
  // corner flags
  const flag = new THREE.MeshStandardMaterial({ color: 0xfdb515, side: THREE.DoubleSide, roughness: 0.7 });
  for (const su of [-1, 1]) for (const sv of [-1, 1]) { const u = cu + su * L / 2, v = cv + sv * W / 2; K.cyl(M.whitePaint, u, yF, v, 0.02, 0.02, 1.5, 6, { detail: true }); const g = new THREE.PlaneGeometry(0.45, 0.32); g.translate(0.23, 0, 0); g.rotateY(deg(30)); g.translate(u, yF + 1.32, v); K.add(flag, g, { uvMode: 'keep', detail: true }); }
  const colliders = []; for (const s of [-1, 1]) for (const t of [-1, 1]) colliders.push(K.colCyl(cu + s * L / 2, cv + t * 3.66, 0.1, yF - 1, yF + 2.4));
  const object3d = K.finish(); object3d.name = 'goldman-field';
  const c = K.xz(cu, cv);
  return { object3d, colliders, walkables: [], interactions: [{ id: 'goldman-centre', pos: [c[0], yF + 1, c[1]], radius: 8, label: 'Centre spot, Goldman Field' }] };
}
