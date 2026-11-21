// b04-howard: John Galen Howard's Beaux-Arts science buildings (LeConte/Physics North 1924, Gilman 1917).
// Vocabulary: banded-rusticated ground storey on a plinth, stringcourse, giant Ionic order (engaged columns or pilasters)
// over two floors of paired multi-pane windows with sunk spandrel panels, full entablature with dentils, pedimented end
// pavilions with triple windows. All authored on classic-kit runs (s along the face, y up, d outward).
import * as THREE from 'three';
import { corniceProfile } from './classic-kit.js';

// H = howard(K, { W, S, RU, PL, FR, GL, OAK, lv:{pl, sc0, sc1, ent, cor}, walkables })
export function howard(K, o) {
  const M = K.M; const det = { detail: true };
  const { W, S, RU, PL } = o; const FR = o.FR || M.whitePaint; const GL = o.GL; const OAK = o.OAK || M.woodDark;
  const lv = o.lv; const walkables = o.walkables;
  const H = {};
  H.fill = (R, ops, rev = 0.36) => { for (const op of ops) K.fill(R, op, { rev, mull: op.mull ?? 1, tran: op.tran ? [op.y0 + (op.y1 - op.y0) * op.tran] : [], frame: FR, glass: GL }); };
  // plinth + banded rusticated storey with openings + stringcourse
  H.podium = (R, s0, s1, ops, { plinth = true, y1 = lv.sc0 } = {}) => {
    if (plinth) K.rbox(R, PL, s0 - 0.12, -2.0, -0.5, s1 + 0.12, lv.pl, 0.14);
    K.wall(R, RU, s0, s1, lv.pl, y1, ops, 0.5);
    K.rustic(R, s0, s1, lv.pl, y1, ops, 0.5, RU, 0.07, 0.045);
    K.rbox(R, S, s0 - 0.1, y1, -0.5, s1 + 0.1, lv.sc1, 0.22);
  };
  // sunk spandrel panel with a carved swag between two window tiers (top of panel at y)
  H.spandrel = (R, c, w, y0, y1) => {
    K.rbox(R, PL, c - w / 2, y0, -0.08, c + w / 2, y1, -0.02);
    const ym = (y0 + y1) / 2;
    K.rbox(R, S, c - w * 0.32, ym - 0.12, -0.06, c + w * 0.32, ym + 0.05, 0.04, det);
    K.rbox(R, S, c - 0.14, ym - 0.2, -0.06, c + 0.14, ym + 0.22, 0.08, det);
    K.rbox(R, S, c - w / 2 - 0.06, y0 - 0.06, -0.02, c + w / 2 + 0.06, y0 + 0.02, 0.04, det);
  };
  // architrave (two fasciae), frieze, dentil course, moulded cornice; top of cornice at lv.cor
  H.entab = (R, s0, s1, { ret0 = true, ret1 = true, back = 0.5, P = 0.85, CH = 1.15 } = {}) => {
    const e = lv.ent;
    K.rbox(R, S, s0, e, -back, s1, e + 0.35, 0.06);
    K.rbox(R, S, s0, e + 0.35, -back, s1, e + 0.72, 0.12);
    K.rbox(R, S, s0, e + 0.72, -back, s1, lv.cor - CH, 0.04);
    K.mould(R, S, s0, s1, corniceProfile(lv.cor, P, CH), { ret0, ret1 });
    const n = Math.floor((s1 - s0) / 0.36);
    for (let i = 0; i < n; i++) { const s = s0 + 0.18 + i * (s1 - s0 - 0.36) / Math.max(1, n - 1); K.rbox(R, S, s - 0.08, lv.cor - CH * 0.75, 0.1, s + 0.08, lv.cor - CH * 0.6, P * 0.36, det); }
  };
  // flat giant pilaster with base and simple Ionic-ish capital block
  H.pilaster = (R, s, w, y0, y1, p = 0.16) => {
    K.rbox(R, S, s - w / 2 - 0.08, y0, -0.1, s + w / 2 + 0.08, y0 + 0.45, p + 0.06);
    K.rbox(R, S, s - w / 2, y0 + 0.45, -0.1, s + w / 2, y1 - 0.5, p);
    K.rbox(R, S, s - w / 2 - 0.1, y1 - 0.5, -0.1, s + w / 2 + 0.1, y1 - 0.12, p + 0.08);
    for (const sx of [-1, 1]) { const g = new THREE.CylinderGeometry(0.12, 0.12, p + 0.14, 10); g.rotateX(Math.PI / 2); g.translate(s + sx * (w / 2 - 0.02), y1 - 0.3, (p + 0.04) / 2); K.addRun(R, S, g, det); }
    K.rbox(R, S, s - w / 2 - 0.16, y1 - 0.12, -0.1, s + w / 2 + 0.16, y1, p + 0.14);
  };
  // monumental oak doorway: glazed transom, raised-panel leaves, stone architrave with bosses, hood on consoles
  H.doorway = (R, c, y0, w = 2.3, h = 4.1, { bosses = true } = {}) => {
    const op = { s0: c - w / 2, s1: c + w / 2, y0, y1: y0 + h }; const dt = y0 + Math.min(2.9, h * 0.72);
    K.rbox(R, GL || M.windowNight, op.s0, dt, -0.62, op.s1, op.y1, -0.58);
    for (const k of [1, 2, 3]) K.rbox(R, OAK, op.s0 + w * k / 4 - 0.035, dt, -0.6, op.s0 + w * k / 4 + 0.035, op.y1, -0.52, det);
    K.rbox(R, OAK, op.s0, dt - 0.15, -0.62, op.s1, dt + 0.03, -0.48);
    for (const sx of [0, 1]) {
      const a = op.s0 + sx * w / 2, b = a + w / 2;
      K.rbox(R, OAK, a + 0.02, y0, -0.66, b - 0.02, dt - 0.15, -0.6);
      const hh = dt - 0.15 - y0;
      for (const [p0, p1] of [[0.09, 0.27], [0.34, 0.74], [0.8, 0.94]]) K.rbox(R, OAK, a + 0.16, y0 + hh * p0, -0.6, b - 0.16, y0 + hh * p1, -0.55, det);
    }
    K.rbox(R, M.bronze, c - 0.08, y0 + 1.0, -0.55, c - 0.03, y0 + 1.5, -0.48, det); K.rbox(R, M.bronze, c + 0.03, y0 + 1.0, -0.55, c + 0.08, y0 + 1.5, -0.48, det);
    for (const s of [op.s0 + 0.09, op.s1 - 0.09]) K.rbox(R, OAK, s - 0.09, y0, -0.5, s + 0.09, op.y1, -0.38);
    for (const [a, b] of [[op.s0 - 0.42, op.s0], [op.s1, op.s1 + 0.42]]) K.rbox(R, S, a, y0 - 0.05, -0.05, b, op.y1 + 0.42, 0.12);
    K.rbox(R, S, op.s0 - 0.42, op.y1, -0.05, op.s1 + 0.42, op.y1 + 0.42, 0.12);
    if (bosses) for (let y = y0 + 0.3; y < op.y1 + 0.2; y += 0.48) for (const s of [op.s0 - 0.21, op.s1 + 0.21]) K.rbox(R, S, s - 0.07, y - 0.07, 0.12, s + 0.07, y + 0.07, 0.18, det);
    K.rbox(R, S, op.s0 - 0.7, op.y1 + 0.42, -0.05, op.s1 + 0.7, op.y1 + 0.62, 0.5);
    K.rbox(R, S, op.s0 - 0.6, op.y1 + 0.62, -0.05, op.s1 + 0.6, op.y1 + 0.72, 0.42);
    for (const s of [op.s0 - 0.55, op.s1 + 0.55]) K.rbox(R, S, s - 0.12, op.y1 - 0.2, 0.0, s + 0.12, op.y1 + 0.42, 0.38);
    return op;
  };
  // straight flight climbing toward the wall to yHi (brick or stone treads, cheek walls, black rails)
  H.stoop = (R, c, w, yHi, { mat = M.brick, cheek = PL } = {}) => {
    const gl = K.g(...R.at(c, 1.5)); if (yHi - gl < 0.12) return;
    const n = Math.max(1, Math.round((yHi - gl) / 0.165)); const run = n * 0.31;
    const p0 = R.at(c - w / 2, 0.14), p1 = R.at(c + w / 2, 0.14 + run);
    const uu = [p0[0], p1[0]].sort((a, b) => a - b), vv = [p0[1], p1[1]].sort((a, b) => a - b);
    const nn = R.n; const dir = Math.abs(nn[0]) > Math.abs(nn[1]) ? (nn[0] > 0 ? '-u' : '+u') : (nn[1] > 0 ? '-v' : '+v');
    walkables.push(K.stairs(mat, uu[0], vv[0], uu[1], vv[1], gl, yHi, dir, n));
    for (const s of [c - w / 2 - 0.3, c + w / 2]) {
      K.rbox(R, cheek, s, gl - 0.8, 0.14, s + 0.3, yHi + 0.15, 0.14 + run);
      K.rbox(R, M.iron, s + 0.12, yHi + 0.95, 0.14, s + 0.18, yHi + 1.0, 0.14 + run, det);
      for (let d = 0.3; d < run; d += 0.6) K.rbox(R, M.iron, s + 0.13, yHi + 0.15 - (d / run) * (yHi - gl), d, s + 0.17, yHi + 0.98, d + 0.04, det);
    }
  };
  // pediment on a face (run R), spanning s0..s1, base at y, rise; tympanum + raking cornices
  H.pediment = (R, s0, s1, y, rise, { roofMat, depthBack = 7.0 } = {}) => {
    const sm = (s0 + s1) / 2, half = (s1 - s0) / 2 + 0.4;
    const tri = new THREE.Shape(); tri.moveTo(s0 - 0.25, y); tri.lineTo(s1 + 0.25, y); tri.lineTo(sm, y + rise - 0.22); tri.lineTo(s0 - 0.25, y);
    const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.5, bevelEnabled: false }); tg.translate(0, 0, -0.4); K.addRun(R, S, tg);
    const rl = Math.hypot(half, rise), ra = Math.atan2(rise, half);
    for (const sg of [-1, 1]) { const g = new THREE.BoxGeometry(rl + 0.25, 0.4, 1.0); g.rotateZ(sg * -ra); g.translate(sm + sg * half / 2, y + rise / 2 + 0.03, 0.25); K.addRun(R, S, g); }
    if (roofMat) { // short gable of roofing running back from the pediment
      const g = new THREE.BufferGeometry(); const b = -depthBack, f = 0.6;
      const P = (s, yy, d) => [s, yy, d];
      const A = P(s0 - 0.55, y + 0.15, f), B = P(sm, y + rise + 0.05, f), C = P(s1 + 0.55, y + 0.15, f), A2 = P(s0 - 0.55, y + 0.15, b), B2 = P(sm, y + rise + 0.05, b), C2 = P(s1 + 0.55, y + 0.15, b);
      const pos = [...A, ...B, ...B2, ...A, ...B2, ...A2, ...B, ...C, ...C2, ...B, ...C2, ...B2];
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      K.addRun(R, roofMat, g, { uvMode: 'roof' });
    }
  };
  return H;
}
