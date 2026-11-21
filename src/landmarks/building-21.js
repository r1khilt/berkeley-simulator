// The Old Gymnasium (B-9, 1914; Clark Kerr Campus Building 22, now archive storage): the California School for the
// Blind's gym, the oldest building on the Blind school site. A long brick hall painted cream: broad corner piers,
// a five-bay clerestory gallery of steel sash between turned colonnettes over a corbelled brick frieze with lozenge
// panels, a round-arched entrance with stepped brick archivolts, deep boxed eaves and a dark hipped roof with a
// skylit flat crown (LiDAR: eaves ~10.7 m, crown ~13.5 m, roof rise/run ~0.52).
import * as THREE from 'three';
import { CKKit } from './lib/clarkkerr-kit.js';

export const info = {
  id: 'building-21',
  name: 'Old Gymnasium (Building 22)',
  subtitle: 'California School for the Blind · 1914',
  blurb: 'Built in 1914 as the gymnasium of the California School for the Blind, this cream-painted brick hall is a contributor to the Clark Kerr Campus historic district and now serves as archive storage.',
  replaces: ['w/128467247'],
};

export async function build(ctx) {
  const K = new CKKit(ctx, -3.1); const C = K.C; const B = C.paintedBrick;
  const u0 = -7.6, u1 = 9.6, v0 = -20.6, v1 = 21.6; const E = 10.95; const FL = Math.max(K.g(0, 0), K.g(1, 20)) + 0.25; const y0 = K.gMin(u0, v0, u1, v1) - 1.2;
  const fr = (R, s0, s1, y) => { // gallery sill shelf on a stepped corbel table, lozenge panels in relief below
    K.rbox(R, B, s0, y + 0.95, 0, s1, y + 1.2, 0.35);
    for (let s = s0 + 0.3; s < s1 - 0.15; s += 0.6) { K.rbox(R, B, s - 0.15, y + 0.45, 0, s + 0.15, y + 0.95, 0.2); K.rbox(R, B, s - 0.15, y + 0.7, 0.2, s + 0.15, y + 0.95, 0.3); }
    K.rbox(R, B, s0, y - 0.35, 0, s1, y - 0.2, 0.08);
    for (let s = s0 + 0.9; s < s1 - 0.6; s += 1.8) { const g = new THREE.BoxGeometry(0.42, 0.42, 0.05); g.rotateZ(Math.PI / 4); g.translate(s, y + 0.1, 0.05); K.addRun(R, B, g, { detail: true }); }
  };
  const colonnette = (R, s, ya, yb) => { // turned colonnette between clerestory openings
    const [u, v] = R.at(s, 0.12); const h = yb - ya;
    const prof = [[0.24, 0], [0.24, 0.14], [0.18, 0.22], [0.2, 0.32], [0.15, 0.48], [0.15, h * 0.42], [0.22, h * 0.47], [0.22, h * 0.53], [0.15, h * 0.58], [0.14, h - 0.42], [0.19, h - 0.32], [0.25, h - 0.16], [0.27, h], [0.001, h]];
    K.lathe(C.trim, prof, u, ya, v, 10);
  };
  // ---------- end elevations (south = entrance, north similar without door) ----------
  for (const [a, b, entrance] of [[[u0, v1], [u1, v1], true], [[u1, v0], [u0, v0], false]]) {
    const R = K.run(a, b); const L = R.L; const pw = 2.6;
    const gy = 6.6; // gallery sill
    const ops = [];
    const gw = (L - 2 * pw) / 5;
    for (let i = 0; i < 5; i++) { const c = pw + gw * (i + 0.5); ops.push({ s0: c - gw / 2 + 0.18, s1: c + gw / 2 - 0.18, y0: gy, y1: gy + 2.9, kind: 'industrial', panes: [4, 6], sill: false, rev: 0.8 }); }
    if (entrance) {
      ops.push({ s0: L / 2 - 1.4, s1: L / 2 + 1.4, y0: FL + 0.02, y1: FL + 4.2, arch: true, kind: 'boarded', transom: 2.6, rev: 1.2, tympanum: B });
      ops.push({ s0: L / 2 - 3.6, s1: L / 2 - 3.0, y0: FL + 1.9, y1: FL + 3.7, kind: 'blind', mat: B, rev: 0.15 }); ops.push({ s0: L / 2 + 3.1, s1: L / 2 + 3.45, y0: FL + 2.3, y1: FL + 3.9, kind: 'blind', mat: B, rev: 0.15 });
    } else ops.push({ s0: L / 2 - 1.0, s1: L / 2 + 1.0, y0: FL + 0.02, y1: FL + 2.7, kind: 'door', rev: 0.3 });
    K.facade(R, 0, L, { y0, y1: E, ops, mat: B, depth: 1.25 });
    // corner piers proud of the wall, plinth
    for (const [s, t] of [[0, pw], [L - pw, L]]) K.rbox(R, B, s, y0 + 0.5, 0, t, E - 0.05, 0.5);
    K.rbox(R, C.wall, -0.05, y0 + 0.5, 0, L + 0.05, FL + 0.7, 0.36);
    fr(R, pw, L - pw, gy - 1.25);
    for (let i = 0; i <= 5; i++) colonnette(R, pw + gw * i, gy - 0.05, gy + 2.95);
    K.rbox(R, B, pw, gy + 2.95, 0, L - pw, gy + 3.25, 0.16);
    if (entrance) { // stepped brick archivolts around the portal + raised panel
      const cx = L / 2, cy = FL + 4.1 - 1.25;
      for (const [r0, r1, d] of [[1.25, 1.5, 0.12], [1.5, 1.75, 0.08]]) {
        const sh = new THREE.Shape(); const n = 12;
        for (let k = 0; k <= n; k++) { const t = Math.PI * k / n; const p = [cx + Math.cos(t) * r1, cy + Math.sin(t) * r1]; k ? sh.lineTo(...p) : sh.moveTo(...p); }
        for (let k = n; k >= 0; k--) { const t = Math.PI * k / n; sh.lineTo(cx + Math.cos(t) * r0, cy + Math.sin(t) * r0); }
        const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 4 }); K.addRun(R, B, g);
      }
      K.rbox(R, B, cx - 2.1, FL + 0.7, 0, cx - 1.75, cy, 0.1); K.rbox(R, B, cx + 1.75, FL + 0.7, 0, cx + 2.1, cy, 0.1);
      K.rbox(R, B, cx - 2.3, cy + 1.75, 0, cx + 2.3, cy + 2.05, 0.1);
      // steps + cheek wall + ramp landing
      const gl = K.g(...R.at(cx, 2.5));
      const n = Math.max(1, Math.round((FL - gl) / 0.16));
      for (let k = 0; k < n; k++) K.rbox(R, C.conc, cx - 1.8, gl - 0.6, 0.1 + (n - k - 1) * 0.32, cx + 1.8, gl + (FL - gl) * (k + 1) / n, 0.1 + (n - k) * 0.32);
      for (let k = 0; k < 4; k++) K.rbox(R, C.conc, cx - 4.4 + k * 0.3, gl - 0.6, 0.1, cx - 4.1 + k * 0.3, gl + 0.17 * (k + 1), 1.8);
      K.rbox(R, C.conc, cx + 1.8, gl - 0.6, 0.1, L - 0.5, FL + 0.02, 1.8);
      K.rbox(R, C.conc, cx + 1.8, FL, 1.6, L - 0.5, FL + 1.1, 1.8);
      K.walkables.push(K.walkPoly([R.at(cx - 1.8, 0.1), R.at(L - 0.5, 0.1), R.at(L - 0.5, 1.8), R.at(cx - 1.8, 1.8)].map(([u, v]) => K.toMain(u, v)), FL + 0.02));
      // gooseneck lamp on the left pier
      const [lu, lv] = R.at(1.3, 0.35); K.cyl(C.iron, lu, 5.0, lv, 0.03, 0.03, 0.6, 6, { detail: true }); K.lathe(C.iron, [[0.02, 0], [0.18, -0.12], [0.2, -0.18], [0.001, -0.18]], lu, 5.7, lv + 0.35, 10, { detail: true });
    }
  }
  // ---------- long sides: pilasters, clerestory band of steel sash, few low windows ----------
  for (const [a, b] of [[[u1, v1], [u1, v0]], [[u0, v0], [u0, v1]]]) {
    const R = K.run(a, b); const L = R.L; const nb = 10; const bw = (L - 2 * 2.6) / nb; const gy = 6.6;
    const ops = [];
    for (let i = 0; i < nb; i++) { const c = 2.6 + bw * (i + 0.5); ops.push({ s0: c - 1.25, s1: c + 1.25, y0: gy, y1: gy + 2.9, kind: 'industrial', panes: [6, 7], sill: false, rev: 0.25, frame: C.white }); if (i % 3 === 1) ops.push({ s0: c - 0.55, s1: c + 0.55, y0: FL + 1.6, y1: FL + 3.4, kind: 'casement', panes: [3, 5] }); }
    K.facade(R, 0, L, { y0, y1: E, ops, mat: B, depth: 0.4 });
    for (const [s, t] of [[0, 2.6], [L - 2.6, L]]) K.rbox(R, B, s, y0 + 0.5, 0, t, E - 0.05, 0.3);
    for (let i = 1; i < nb; i++) K.rbox(R, B, 2.6 + bw * i - 0.3, FL + 0.7, 0, 2.6 + bw * i + 0.3, E - 0.05, 0.18);
    K.rbox(R, C.wall, -0.05, y0 + 0.5, 0, L + 0.05, FL + 0.7, 0.36);
    fr(R, 2.6, L - 2.6, gy - 1.25);
    K.rbox(R, B, 2.6, gy + 2.95, 0, L - 2.6, gy + 3.25, 0.16);
  }
  K.box(C.concDark, u0 + 0.45, y0 + 0.3, v0 + 0.45, u1 - 0.45, E - 0.05, v1 - 0.45);
  // ---------- roof: dark composition hip with deep boxed eaves and a skylit flat crown ----------
  const yTop = 13.5;
  K.roofHip(u0, v0, u1, v1, E, 0.52, { ov: 1.25, yTop, tile: C.shingle, caps: false, fascia: 0.3, deck: C.membrane });
  // skylights along the crown
  const cu = (u0 + u1) / 2 + 0.1;
  for (let v = v0 + 9; v <= v1 - 9; v += 4.1) { K.box(C.louver, cu - 1.0, yTop - 0.05, v - 1.2, cu + 1.0, yTop + 0.12, v + 1.2); K.box(C.glassBlock, cu - 0.85, yTop + 0.12, v - 1.05, cu + 0.85, yTop + 0.2, v + 1.05); }
  // ridge-line vents at both ends of the crown
  for (const v of [v0 + 6.2, v1 - 6.2]) K.box(C.louver, cu - 0.4, yTop - 0.1, v - 0.4, cu + 0.4, yTop + 0.6, v + 0.4);
  K.colRect(u0, v0, u1, v1, y0, yTop + 1);
  const object3d = K.finish();
  object3d.name = 'old-gymnasium';
  return { object3d, colliders: K.colliders, walkables: K.walkables };
}
