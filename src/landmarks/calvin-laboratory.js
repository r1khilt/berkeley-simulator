// Melvin Calvin Laboratory (1963–64), "the Roundhouse": a cylindrical laboratory designed so that Calvin's research
// groups would mix in one open circular space (today home of the Simons Institute for the Theory of Computing).
// A cream rendered drum: a solid ground floor with tall punched windows under a thin cantilevered ring canopy carried
// on slim rectangular piers at its edge; above it two storeys of single windows between flat pilaster strips, each pilaster
// ending in a stepped corbel under a projecting eave; a scalloped terracotta barrel-tile ring rises gently inward to a
// light-well ring around a central court.
// Massing from the 2021 LiDAR: drum Ø ~36.5 m, canopy ring top ~5 m out to r ~21 m, eaves ~14 m, tile ring rising to ~18 m
// at r ~9.8 m, central well roof ~14 m.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { colFromXZ } from './lib/b04-kit.js';
import { lamp } from './lib/b05b-kit.js';
import { sign } from './lib/b06a-kit.js';

export const info = {
  id: 'calvin-laboratory',
  name: 'Calvin Laboratory',
  subtitle: 'The Roundhouse · 1964',
  blurb: 'Built for Melvin Calvin\'s chemical biodynamics group after his 1961 Nobel Prize for mapping the path of carbon in photosynthesis. The round plan was meant to keep researchers in constant contact; today it houses the Simons Institute for the Theory of Computing.',
  replaces: ['w/24025046'],
};

export async function build(ctx) {
  const K = new Kit(ctx, 0); const M = ctx.M;
  // rendered cream drum, slightly whiter canopy/piers, warm terracotta tile
  const C = M.stuccoWhite.clone(); C.color = new THREE.Color(0xfffaed); C.name = 'calvin-render';
  const CW = M.stuccoWhite.clone(); CW.color = new THREE.Color(0xfffdf6); CW.name = 'calvin-trim';
  const ROOFM = M.concrete.clone(); ROOFM.color = new THREE.Color(0xc9c6bf); ROOFM.name = 'calvin-roof'; // low grey roof membrane behind the tile skirt
  const TILE = M.redTile.clone(); TILE.color = new THREE.Color(0xc0705a); TILE.name = 'calvin-tile';
  const SASH = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5, metalness: 0.2 }); SASH.name = 'calvin-sash';
  const colliders = [], walkables = [];
  const pts = ctx.footprints[0].outer; let cx = 0, cz = 0; for (const p of pts) { cx += p[0]; cz += p[1]; } cx /= pts.length; cz /= pts.length;
  let rr = 0; for (const p of pts) rr += Math.hypot(p[0] - cx, p[1] - cz); rr /= pts.length;
  const N = 28;                       // bays around the drum (~4.1 m each)
  const rW = rr + 0.1;                // upper drum face
  const rG = rW - 0.6;                // ground-floor wall (set back under the canopy)
  const yC0 = 4.45, yC1 = 4.75;       // canopy slab underside / top (thin cantilevered ring)
  const eave = 13.6;                  // top of the drum wall (cornice above)
  const rCan = rG + 3.1, rPier = rG + 2.6;
  const yRing = 18.0, rIn = 9.8;      // light-well ring
  const ang = (k) => (k / N) * Math.PI * 2 + Math.PI / N * 0.5;
  const P = (r, k) => { const a = ang(k); return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; };
  const ring = (r, n = N, off = 0) => { const out = []; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + off; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } return out; };
  let gMin = Infinity, gMax = -Infinity; for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; const g = ctx.groundAt(cx + Math.cos(a) * (rW + 2), cz + Math.sin(a) * (rW + 2)); gMin = Math.min(gMin, g); gMax = Math.max(gMax, g); }
  const yF = Math.max(0, gMax) + 0.15; // ground-floor finished level
  const yB = gMin - 1.2;               // foundations
  // entrances where the footpaths meet the drum (compass 334° NNW and 155° SSE): bay index nearest to that bearing
  const bayAt = (compass) => { const th = THREE.MathUtils.degToRad(compass); const a = Math.atan2(-Math.cos(th), Math.sin(th)); let best = 0, bd = 9; for (let k = 0; k < N; k++) { const am = ang(k + 0.5); let d = Math.abs(Math.atan2(Math.sin(am - a), Math.cos(am - a))); if (d < bd) { bd = d; best = k; } } return best; };
  const doors = new Set([bayAt(334), bayAt(155)]);

  for (let k = 0; k < N; k++) {
    // runs go clockwise in (x,z) seen from above (z south) => building on the left, normal outward
    const a = P(rW, k + 1), b = P(rW, k); const R = K.run(a, b); const L = R.L; const sm = L / 2;
    // ---- upper drum: plain render, one tall white-framed window per bay per floor (upper row shorter) ----
    const w2 = { s0: sm - 0.58, s1: sm + 0.58, y0: 5.6, y1: 8.05, mull: 0, muntins: 3, sillMat: CW, fw: 0.05 };
    const w3 = { s0: sm - 0.58, s1: sm + 0.58, y0: 9.55, y1: 11.4, mull: 0, muntins: 2, sillMat: CW, fw: 0.05 };
    K.wall(R, C, 0, L, yC1, eave, [w2, w3], 0.34);
    for (const o of [w2, w3]) K.fill(R, o, { rev: 0.25, frame: SASH, mull: 0 });
    // thick flat pier on every bay line, ending in one scrolled console bracket under the soffit
    K.rbox(R, CW, -0.3, yC1, -0.05, 0.3, eave - 0.05, 0.4);
    K.rbox(R, CW, -0.2, eave - 0.55, 0.4, 0.2, eave - 0.05, 0.95);
    K.rbox(R, CW, -0.2, eave - 0.9, 0.4, 0.2, eave - 0.55, 0.6);
    { const g = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 12); g.rotateZ(Math.PI / 2); g.translate(0, eave - 0.92, 0.62); K.addRun(R, CW, g); }
    // ---- ground floor: solid render with tall punched windows / entrance doors, recessed under the canopy ----
    const ag = P(rG, k + 1), bg = P(rG, k); const RG = K.run(ag, bg); const Lg = RG.L; const sg = Lg / 2;
    if (doors.has(k)) {
      const d = { s0: sg - 0.7, s1: sg + 0.7, y0: yF, y1: yF + 3.3, doorTop: yF + 2.5, sill: false };
      K.wall(RG, C, 0, Lg, yB, yC0 + 0.05, [d], 0.35);
      K.fill(RG, d, { kind: 'door', rev: 0.22, frame: M.darkBronze, door: M.windowNight });
      K.rbox(RG, M.darkBronze, d.s0 - 0.08, yF, -0.25, d.s0, d.y1, 0.02); K.rbox(RG, M.darkBronze, d.s1, yF, -0.25, d.s1 + 0.08, d.y1, 0.02);
      K.rbox(RG, M.wood, sg - 0.66, yF, -0.2, sg + 0.66, yF + 2.48, -0.16); // light timber door with two large glazed panels
      K.rbox(RG, M.windowNight, sg - 0.52, yF + 1.3, -0.16, sg + 0.52, yF + 2.3, -0.15); K.rbox(RG, M.windowNight, sg - 0.52, yF + 0.2, -0.16, sg + 0.52, yF + 1.15, -0.15);
      K.rbox(RG, CW, sg - 0.7, yF + 2.5, -0.2, sg + 0.7, yF + 2.72, -0.12); // white band under the transom
      // bronze letters beside the door
      const R2 = K.run(RG.at(0, 0.02), RG.at(Lg, 0.02));
      if (k === bayAt(334)) sign(K, R2, 'MELVIN CALVIN LABORATORY', sg + 1.75, yF + 1.7, 0.2, { color: '#3a3a3a', d: 0.0 });
    } else {
      const wg = { s0: sg - 0.6, s1: sg + 0.6, y0: yF + 0.8, y1: yF + 3.3, mull: 0, muntins: 2, sillMat: CW };
      K.wall(RG, C, 0, Lg, yB, yC0 + 0.05, [wg], 0.35);
      K.fill(RG, wg, { rev: 0.22, frame: SASH, mull: 0 });
      K.rbox(RG, CW, -0.25, yF, 0, 0.25, yC0, 0.14); // bay-defining strip
    }
    K.rbox(RG, CW, 0, yB, -0.05, Lg, yF + 0.12, 0.06); // plinth
  }
  // ring canopy: thin cantilevered slab with a crisp fascia, carried on slim rectangular piers at its edge
  K.prism(CW, ring(rCan, 56), yC0, yC1, {}, [ring(rG - 0.1, 56).slice().reverse()]);
  const NP = 16;
  for (let i = 0; i < NP; i++) {
    const a = ang(i * 2); const x = cx + Math.cos(a) * rPier, z = cz + Math.sin(a) * rPier;
    const gy = ctx.groundAt(x, z);
    K.obox(CW, x, (gy - 0.6 + yC0) / 2, z, 0.5, yC0 - gy + 0.6, 0.5, a);
    colliders.push({ type: 'cyl', x: +x.toFixed(2), z: +z.toFixed(2), r: 0.45, y0: gy - 1, y1: yC0 });
  }
  // cores (behind the glass)
  K.prism(M.concreteDark, ring(rW - 0.62), yC0, eave + 0.2);
  K.prism(M.concreteDark, ring(rG - 0.55), yB, yC0 + 0.1);
  // eave: plain soffit + fascia, then the scalloped barrel-tile ring rising gently to the light-well ring
  K.loop(CW, ring(rW, N), [[0.0, eave - 0.1], [1.05, eave - 0.05], [1.05, eave + 0.3], [0.0, eave + 0.3]]);
  const rSk = rW - 0.6, ySk = eave + 0.42 + (rW + 0.85 - rSk) * (yRing - eave - 0.42) / (rW + 0.85 - rIn);
  const skirt = new THREE.LatheGeometry([[rW + 1.1, eave + 0.2], [rW + 0.85, eave + 0.42], [rSk, ySk]].map(([r, y]) => new THREE.Vector2(r, y)), 64); skirt.translate(cx, 0, cz); K.add(TILE, skirt, { uvMode: 'roof' });
  const cone = new THREE.LatheGeometry([[rSk, ySk], [rIn, yRing]].map(([r, y]) => new THREE.Vector2(r, y)), 64); cone.translate(cx, 0, cz); K.add(ROOFM, cone, { uvMode: 'roof' });
  // scalloped tile ends along the eave (detail)
  { const n = 140; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const r = rW + 1.11; const g = new THREE.CylinderGeometry(0.11, 0.11, 0.5, 6, 1, false, 0, Math.PI); g.rotateZ(Math.PI / 2); g.rotateY(-a + Math.PI / 2); g.translate(cx + Math.cos(a) * (r - 0.2), eave + 0.31, cz + Math.sin(a) * (r - 0.2)); K.add(TILE, g, { detail: true, uvMode: 'keep' }); } }
  // light-well ring: inner cylinder wall, coping, well roof and a low skylight lantern
  const inner = new THREE.CylinderGeometry(rIn, rIn, yRing - 13.6, 56, 1, true); inner.translate(cx, (yRing + 13.6) / 2, cz); K.add(C, inner);
  K.lathe(TILE, [[rIn - 0.05, yRing - 0.05], [rIn + 0.25, yRing - 0.05], [rIn + 0.25, yRing + 0.1], [rIn - 0.05, yRing + 0.1]], cx, 0, cz, 56);
  K.prism(M.concreteDark, ring(rIn - 0.02, 40), 13.5, 13.8);
  K.cyl(M.glass, cx, 13.8, cz, 3.8, 3.2, 1.3, 24); K.cyl(CW, cx, 15.1, cz, 3.3, 3.3, 0.18, 24);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; K.box(M.concreteDark, cx + Math.cos(a) * 6.5 - 0.9, 13.8, cz + Math.sin(a) * 6.5 - 0.7, cx + Math.cos(a) * 6.5 + 0.9, 15.2, cz + Math.sin(a) * 6.5 + 0.7); }
  { const k = bayAt(334); const a = ang(k + 0.5) - 0.085; const x = cx + Math.cos(a) * (rG + 0.55), z = cz + Math.sin(a) * (rG + 0.55); const gy = ctx.groundAt(x, z); K.obox(M.woodDark, x, gy + 0.45, z, 0.5, 0.06, 1.8, a, { detail: true }); K.obox(M.iron, x, gy + 0.21, z, 0.4, 0.42, 1.6, a, { detail: true }); }
  // two lamp standards flanking the main (NNW) entrance at the canopy edge
  { const k = bayAt(334); const a = ang(k + 0.5); for (const da of [-0.13, 0.13]) { const x = cx + Math.cos(a + da) * (rCan + 0.8), z = cz + Math.sin(a + da) * (rCan + 0.8); lamp(K, x, ctx.groundAt(x, z), z, 3.9); } }
  colliders.push(colFromXZ(pts, yB, eave + 1));
  const object3d = K.finish(); object3d.name = 'calvin-laboratory';
  return { object3d, colliders, walkables };
}
