// Melvin Calvin Laboratory (1964), "the Roundhouse": a cylindrical laboratory designed so that research groups would mix
// in one open circular space. Cream drum of three storeys over a recessed, glazed ground floor ringed by square piers,
// flat pilaster strips with stacked windows, and a low red-tile conical roof around a central light well.
// Massing from LiDAR: eaves ~14.5 m, roof ring ~18 m, central well ~14 m, diameter ~36 m.
import * as THREE from 'three';
import { Kit, tint, colFromXZ, glassTint } from './lib/b04-kit.js';

export const info = {
  id: 'calvin-laboratory',
  name: 'Calvin Laboratory',
  subtitle: 'The Roundhouse · 1964',
  blurb: 'Built for Melvin Calvin\'s chemical biodynamics group after his 1961 Nobel Prize for mapping the path of carbon in photosynthesis. The round plan was meant to keep researchers in constant contact.',
  replaces: ['w/24025046'],
};

export async function build(ctx) {
  const K = new Kit(ctx, 0); const M = ctx.M;
  const C = tint(M, 'stuccoWhite', 0xe9e1cc), Cd = tint(M, 'concrete', 0xcfc6b2), GL = glassTint(M, 0x2a3236);
  const colliders = [], walkables = [];
  const pts = ctx.footprints[0].outer; let cx = 0, cz = 0; for (const p of pts) { cx += p[0]; cz += p[1]; } cx /= pts.length; cz /= pts.length;
  let rr = 0; for (const p of pts) rr += Math.hypot(p[0] - cx, p[1] - cz); rr /= pts.length;
  const N = 32, rW = rr, y1 = 4.1, eave = 14.4;
  const P = (r, k) => { const a = (k / N) * Math.PI * 2; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; };
  for (let k = 0; k < N; k++) {
    // clockwise in (x,z) as seen from above with z south => building on the left
    const a = P(rW, k + 1), b = P(rW, k); const R = K.run(a, b); const L = R.L;
    // upper drum: wall with one tall window per chord per floor
    const ops = []; for (const [y0, h] of [[5.0, 2.3], [8.4, 2.3], [11.8, 1.9]]) ops.push({ s0: L / 2 - 0.65, s1: L / 2 + 0.65, y0, y1: y0 + h });
    K.wall(R, C, 0, L, y1, eave, ops, 0.4);
    for (const o of ops) K.fill(R, o, { rev: 0.3, mull: 0, tran: [o.y0 + (o.y1 - o.y0) * 0.75], frame: M.darkBronze, glass: GL });
    // pilaster strips at every other vertex
    if (k % 2 === 0) K.rbox(R, C, -0.4, y1, 0, 0.4, eave, 0.18);
    // band at the base of the drum and the eave fascia
    K.rbox(R, Cd, -0.05, y1 - 0.45, 0, L + 0.05, y1 + 0.05, 0.12);
    // recessed glazed ground floor
    const a2 = P(rW - 1.6, k + 1), b2 = P(rW - 1.6, k); const R2 = K.run(a2, b2);
    const g = new THREE.PlaneGeometry(R2.L, y1 - 0.5); g.translate(R2.L / 2, -0.5 + (y1 - 0.5) / 2 + 0.25, 0); K.addRun(R2, GL, g, { uvMode: 'keep' });
    K.rbox(R2, M.darkBronze, -0.04, -0.5, 0, 0.04, y1, 0.08, { detail: true }); K.rbox(R2, M.darkBronze, 0, 2.6, 0, R2.L, 2.68, 0.08, { detail: true });
    K.rbox(R2, Cd, 0, -1.5, -0.3, R2.L, -0.2, 0.0);
  }
  // ring of square piers carrying the drum (16)
  for (let k = 0; k < N; k += 2) { const p = P(rW - 0.35, k); K.box(C, p[0] - 0.35, -1.5, p[1] - 0.35, p[0] + 0.35, y1, p[1] + 0.35); colliders.push({ type: 'cyl', x: +p[0].toFixed(2), z: +p[1].toFixed(2), r: 0.45, y0: -1.5, y1 }); }
  // soffit + core
  const ring = (r) => { const out = []; for (let k = 0; k < N; k++) out.push(P(r, -k)); return out; };
  K.prism(Cd, ring(rW - 0.05), y1 - 0.45, y1);
  K.prism(M.concreteDark, ring(rW - 1.7), -1.5, y1 - 0.4);
  K.prism(M.concreteDark, ring(rW - 0.6), y1, eave);
  // eave cornice and low conical red-tile roof up to the light-well ring (~18 m), central well roof ~14 m
  K.loop(Cd, ring(rW), [[0.0, eave - 0.1], [0.55, eave + 0.05], [0.55, eave + 0.35], [0, eave + 0.35]]);
  const rIn = 10.2, yRing = 18.0;
  const prof = [[rIn, yRing], [rW + 0.6, eave + 0.3]].map(([r, y]) => new THREE.Vector2(r, y)).reverse();
  const cone = new THREE.LatheGeometry(prof, 48); cone.translate(cx, 0, cz); K.add(M.redTile, cone, { uvMode: 'roof' });
  const inner = new THREE.CylinderGeometry(rIn, rIn, yRing - 13.6, 48, 1, true); inner.translate(cx, (yRing + 13.6) / 2, cz); K.add(C, inner);
  K.lathe(Cd, [[rIn - 0.05, yRing - 0.05], [rIn + 0.35, yRing - 0.05], [rIn + 0.35, yRing + 0.25], [rIn - 0.05, yRing + 0.25]], cx, 0, cz, 48);
  const well = new THREE.CircleGeometry(rIn, 40); well.rotateX(-Math.PI / 2); well.translate(cx, 13.8, cz); K.add(M.concreteDark, well);
  // skylight lantern in the well
  K.cyl(GL, cx, 13.8, cz, 4.0, 3.4, 1.4, 24); K.cyl(Cd, cx, 15.2, cz, 3.5, 3.5, 0.2, 24);
  colliders.push(colFromXZ(pts, -2, eave + 1));
  const object3d = K.finish(); object3d.name = 'calvin-laboratory';
  return { object3d, colliders, walkables };
}
