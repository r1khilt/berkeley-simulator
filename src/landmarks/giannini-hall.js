// Giannini Hall (William C. Hays, 1930), agricultural economics. A three-storey cast-stone block with chamfered corners, a
// dentilled cornice and a low red-tile hip roof; its entrance front is a stripped-classical frontispiece of four flat piers
// capped by carved agricultural reliefs, with "GIANNINI HALL" cut in the lintel. The long wing runs obliquely between two
// end blocks set on the campus grid. LiDAR: eaves ~13.5 m, ridge ~17.5 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect, dentils } from './lib/b02-gen.js';
import { inscription } from './lib/b02-kit.js';
import { gAt } from './lib/b03-kit.js';
import { rnMats, planting, tube, blob, ashlarMat } from './lib/rn-kit.js';
export const info = {
  id: 'giannini-hall', name: 'Giannini Hall', subtitle: 'William C. Hays · 1930',
  blurb: 'Funded by Bank of Italy founder A. P. Giannini for the Giannini Foundation of Agricultural Economics, the hall closes the west side of the agricultural group.',
  replaces: ['w/24025042', 'way/24025042'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(62.6)); const M = ctx.M;
  const ST = ashlarMat('gianniniCast', { bw: 1.2, ch: 0.6, span: 2.4, base: 0xdad1be, joint: 0xb9b19e }), BASE = tint(M.concrete, 0xc9c2b2), FR = solid(0x1e2a24, 0.5, 0.3), SOF = tint(M.woodDark, 0x8a6f52);
  const win = (k) => (k === 0 ? { w: 1.8, h: 1.8, sill: 0.9, mull: 3, muntins: 2 } : k === 1 ? { w: 1.8, h: 2.8, sill: 0.6, mull: 3, muntins: 4 } : { w: 1.8, h: 2.3, sill: 0.45, mull: 3, muntins: 3 });
  const D = { mat: ST, baseMat: BASE, frame: FR, fl: 1.6, levels: [1.6, 5.6, 9.6, 12.9], top: 13.5, bay: 4.6, winFn: win, baseWin: { w: 1.6, h: 0.7, sill: 0.4, mull: 3 }, beltAt: [1.6], cornice: { P: 0.5, H: 0.6 }, dentils: true, soffit: SOF };
  const colliders = genParts(K, [
    { poly: [[-27.0, -14.4], [28.9, -14.4], [35.9, -4.2], [19.1, 6.2], [-22.8, 9.7], [-41.7, 0.9]], roof: 'hip', eave: 13.6, slope: 0.38, ov: 0.45 },
    { poly: [[-41.7, 0.9], [-22.8, 9.7], [-24.5, 18.1], [-44.3, 14.2]], roof: 'hip', eave: 13.6, slope: 0.36, ov: 0.45 },
    { poly: [[21.4, 10.0], [19.1, 6.2], [35.9, -4.2], [42.7, 5.7], [40.2, 18.9], [20.5, 15.2]], roof: 'hip', eave: 13.6, slope: 0.36, ov: 0.45 },
  ], D);
  // ---- entrance front (the concave west-south-west side, where the packet's central steps arrive at u≈-1): stripped-classical pavilion of four pylons, three-bay steel screen, "GIANNINI HALL"
  // frieze, central parapet with a semicircular cut-out; terrace behind a board-formed concrete retaining wall with buttress piers,
  // iron railings and three stair flights aligned with the pavilion bays. (refine-north rebuild from photos.)
  const R = K.run([-22.8, 9.7], [19.1, 6.2]); const sC = 21.9; const T = 1.6; const PV = 1.4; // terrace level, pavilion projection
  const PAV = tint(M.stuccoWhite, 0xece7da); const X = rnMats(M); const walkables = [];
  const RP = K.run(R.a, R.b, PV); // pavilion front face
  const piers = [[-7.55, 1.4, 11.2], [-2.55, 1.2, 12.4], [2.55, 1.2, 12.4], [7.55, 1.4, 11.2]]; // centre offset, width, top
  // pavilion body (returns + parapets) and the pylons proud of it
  K.rbox(R, PAV, sC - 8.25, -1.5, 0, sC + 8.25, T, PV);
  for (const [ds, w, top] of piers) {
    K.rbox(R, PAV, sC + ds - w / 2, -1.5, 0, sC + ds + w / 2, top, PV + 0.25);
    K.rbox(R, PAV, sC + ds - w / 2 - 0.08, top, -0.1, sC + ds + w / 2 + 0.08, top + 0.18, PV + 0.33); // cap
    const rh = w < 1.3 ? 2.0 : 1.0; K.rbox(R, BASE, sC + ds - 0.4, top - 0.35 - rh, PV + 0.25, sC + ds + 0.4, top - 0.35, PV + 0.36, { detail: true }); // carved relief tablet
  }
  // side bays: tall steel-sash windows over plain spandrels; centre bay: double doors + gridded transom under a coffered soffit
  const bay = (c, w, y0, y1, grid, door) => {
    K.rbox(R, M.concreteDark, c - w / 2, y0, PV - 0.3, c + w / 2, y1, PV - 0.25);
    K.rbox(R, M.windowNight, c - w / 2, y0, PV - 0.25, c + w / 2, y1, PV - 0.22);
    const [nx, ny] = grid; for (let i = 0; i <= nx; i++) { const s = c - w / 2 + w * i / nx; K.rbox(R, FR, s - (i % nx ? 0.018 : 0.05), y0, PV - 0.22, s + (i % nx ? 0.018 : 0.05), y1, PV - 0.17, { detail: true }); }
    for (let j = 0; j <= ny; j++) { const y = y0 + (y1 - y0) * j / ny; K.rbox(R, FR, c - w / 2, y - (j % ny ? 0.018 : 0.05), PV - 0.22, c + w / 2, y + (j % ny ? 0.018 : 0.05), PV - 0.17, { detail: true }); }
    if (door) { K.rbox(R, FR, c - 0.06, y0, PV - 0.22, c + 0.06, y0 + 3.0, PV - 0.14); K.rbox(R, FR, c - w / 2, y0 + 3.0 - 0.06, PV - 0.22, c + w / 2, y0 + 3.06, PV - 0.12); for (const sx of [c - 0.25, c + 0.25]) K.rbox(R, M.bronze, sx - 0.02, y0 + 0.95, PV - 0.17, sx + 0.02, y0 + 1.3, PV - 0.1, { detail: true }); }
  };
  bay(sC, 2.4, T + 0.02, T + 4.3, [3, 6], true); // doors 3.0 m + transom
  K.rbox(R, PAV, sC - 1.35, T + 4.3, PV - 0.3, sC + 1.35, T + 4.45, PV); // door head
  for (const ds of [-5.05, 5.05]) { K.rbox(R, PAV, sC + ds - 1.6, T, 0, sC + ds + 1.6, T + 1.0, PV - 0.25); bay(sC + ds, 2.6, T + 1.0, T + 5.0, [4, 5], false); K.rbox(R, PAV, sC + ds - 1.8, T + 5.0, 0, sC + ds + 1.8, 11.6 - 1.5, PV - 0.1); }
  // central bay above the door: frieze with the inscription, upper window with balconette, parapet with a semicircular cut-out
  K.rbox(R, PAV, sC - 1.95, T + 4.45, 0, sC + 1.95, 11.6, PV - 0.1);
  inscription(K, RP, sC - 1.85, sC + 1.85, T + 4.75, T + 5.25, -0.08, 'GIANNINI HALL', { fg: '#5d5546', cut: true });
  bay(sC, 1.6, T + 6.2, T + 8.6, [4, 4], false);
  for (let x = sC - 0.9; x <= sC + 0.9; x += 0.12) K.rbox(R, M.iron, x - 0.012, T + 6.2, PV + 0.0, x + 0.012, T + 7.1, PV + 0.03, { detail: true });
  K.rbox(R, M.iron, sC - 0.95, T + 7.1, PV - 0.02, sC + 0.95, T + 7.16, PV + 0.06, { detail: true }); K.rbox(R, PAV, sC - 1.05, T + 6.1, PV - 0.1, sC + 1.05, T + 6.2, PV + 0.3);
  { const sh = new THREE.Shape(); const y0 = 11.6, y1 = 12.4, r = 1.5; sh.moveTo(sC - 1.95, y0); sh.lineTo(sC + 1.95, y0); sh.lineTo(sC + 1.95, y1); sh.lineTo(sC + r, y1); sh.absarc(sC, y1, r, 0, Math.PI, true); sh.lineTo(sC - 1.95, y1); sh.lineTo(sC - 1.95, y0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: PV - 0.1, bevelEnabled: false, curveSegments: 12 }); K.addRun(R, PAV, g); }
  // finials on the central pylons
  for (const ds of [-2.55, 2.55]) { const p = R.at(sC + ds, PV / 2 + 0.1); K.lathe(PAV, [[0.3, 0], [0.36, 0.14], [0.22, 0.5], [0.32, 0.8], [0.14, 1.1], [0.001, 1.25]], p[0], 12.58, p[1], 12, { detail: true }); }
  // terrace, retaining wall with buttress piers, railings, three flights
  const WD = 4.8; const sA = 1.0, sB = R.L - 1.0; let gLawn = Infinity; for (let i = 0; i <= 16; i++) gLawn = Math.min(gLawn, gAt(K, R, sA + (sB - sA) * i / 16, WD + 1.5)); gLawn = Math.min(gLawn, T - 1.25); // retaining wall reads at least ~1.25 m
  K.rbox(R, M.paving, sA, -1.5, 0, sB, T, WD); walkables.push(K.walkPoly([R.at(sA, 0), R.at(sB, 0), R.at(sB, WD), R.at(sA, WD)], T));
  const CONC = tint(M.concrete, 0x8a9282); const flights = [[sC - 2.5, sC + 2.5], [sC - 7.05, sC - 3.05], [sC + 3.05, sC + 7.05]];
  if (true) {
    const nP = 9; const pierAt = Array.from({ length: nP }, (_, i) => sA + (sB - sA) * i / (nP - 1));
    const cut = (a, b) => { let segs = [[a, b]]; for (const [p, q] of flights) segs = segs.flatMap(([x, z]) => (q <= x || p >= z) ? [[x, z]] : [[x, p], [q, z]].filter(([m, n]) => n - m > 0.05)); return segs; };
    for (const [a, b] of cut(sA, sB)) { K.rbox(R, CONC, a, gLawn - 1.0, WD, b, T + 0.15, WD + 0.4); K.rbox(R, CONC, a - 0.02, T + 0.15, WD - 0.03, b + 0.02, T + 0.32, WD + 0.45);
      colliders.push(K.colPoly([R.at(a, WD), R.at(b, WD), R.at(b, WD + 0.45), R.at(a, WD + 0.45)], gLawn - 1, T + 1.3));
      for (let x = a + 0.1; x < b - 0.05; x += 0.12) K.rbox(R, M.iron, x - 0.01, T + 0.32, WD + 0.2, x + 0.01, T + 1.3, WD + 0.22, { detail: true });
      K.rbox(R, M.iron, a, T + 1.26, WD + 0.17, b, T + 1.32, WD + 0.25, { detail: true }); }
    for (const s of pierAt) { if (flights.some(([p, q]) => s > p - 0.8 && s < q + 0.8)) continue; const w = (s === sA || s === sB) ? 2.5 : 1.4; K.rbox(R, CONC, s - w / 2, gLawn - 1.0, WD - 0.1, s + w / 2, T + 0.62, WD + 0.85); }
    for (const [p, q] of flights) { const n = Math.max(3, Math.round((T - gLawn) / 0.155)); const tr = 0.35; const rr = (T - gLawn) / n;
      for (let i = 0; i < n; i++) K.rbox(R, M.graniteDark, p, gLawn - 0.8, WD - 0.4 + tr * i, q, T - rr * (i + 1) + 0.0, WD - 0.4 + tr * (i + 1));
      const d0 = WD - 0.4, d1 = d0 + tr * n; const cs = [R.at(p, d0), R.at(q, d0), R.at(q, d1), R.at(p, d1)].map(([u, v]) => K.xz(u, v));
      walkables.push({ type: 'fn', bounds: [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))],
        heightAt: (x, z) => { const [u, v] = K.uv(x, z); const du = u - R.a[0], dv = v - R.a[1]; const ss = du * R.t[0] + dv * R.t[1], dd = du * R.n[0] + dv * R.n[1]; if (ss < p - 0.05 || ss > q + 0.05 || dd < d0 - 0.05 || dd > d1 + 0.05) return null; const i = Math.min(n - 1, Math.max(0, Math.floor((dd - d0) / tr))); return T - rr * (i + 1); } });
      for (const sx of [p + 0.15, q - 0.15]) tube(K, R, M.iron, [sx, T + 0.9, d0], [sx, gLawn + 0.9, d1 + 0.3], 0.025); }
  }
  // columnar cypresses at the corners and planting along the terrace foot
  for (const s of [sA + 0.8, sB - 0.8]) { const p = R.at(s, WD + 2.4); const g = K.g(p[0], p[1]); K.cyl(X.bark, p[0], g, p[1], 0.18, 0.12, 2.0, 7, { detail: true }); blob(K, X.leafA, p[0], g + 6.0, p[1], 1.25, 5.2, 1.25, Math.round(s)); }
  planting(K, R, sA, sB, { d0: WD + 0.85, depth: 1.2, h: 0.8, skip: flights.map(([p, q]) => [p - 0.6, q + 0.6]), seed: 6 });
  const object3d = K.finish(); object3d.name = 'giannini-hall';
  return { object3d, colliders, walkables };
}
