// African American Theme House ("Afro House"), Berkeley Student Cooperative, 2347 Prospect Street.
// A big brown-shingle house stepping up the steep slope east of Prospect Street: a tall three-storey street gable with
// a brick chimney, a flat-roofed entry porch on mustard-yellow posts carrying a shingled balcony parapet, green bargeboards
// and trim, and a long rear wing higher up the hill with a ribbon of narrow casements and a small railed balcony.
// Massing from the 2021 LiDAR (front ridge ≈11 m over the street; the ground rises ≈9 m toward the rear).
import * as THREE from 'three';
import { Kit, pal, house, roof, porch, chimney, rail, woodShingle, facade } from './lib/b08a-kit.js';

export const info = {
  id: 'african-american-theme-house',
  name: 'African American Theme House',
  subtitle: 'Berkeley Student Cooperative · 2347 Prospect St',
  blurb: 'Known as Afro House, this Berkeley Student Cooperative house is a theme house centred on African American culture and community.',
  replaces: ['w/185769351'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-8.7)); const M = ctx.M; const P = pal(ctx);
  const SH = woodShingle(0x7a5a46), GR = M.whitePaint.clone(); GR.color = new THREE.Color(0x3f7f4e);
  const OC = M.whitePaint.clone(); OC.color = new THREE.Color(0xd8a23a); const RR = M.whitePaint.clone(); RR.color = new THREE.Color(0xa8402f);
  const roofM = M.shingle.clone(); roofM.color = new THREE.Color(0xa58466); const colliders = [];
  // front block on Prospect Street (west end, gable to the street)
  const F = house(K, { u0: -14.75, u1: -1.0, v0: -5.85, v1: 5.85, g0: 0.6, y0: -1.5, eave: 6.2, storeys: 2, mat: SH, frame: P.trimCream, sillMat: GR, trim: GR, trimW: 0.07,
    faces: { W: { nb: 3, doors: [1], muntins: 2, up: [0, 2] }, N: { nb: 4, muntins: 1 }, S: { nb: 4, muntins: 1, wide: [1] }, E: false },
    roof: { type: 'gable', axis: 'u', rise: 5.3, ov: 0.5, rake: 0.45, mat: roofM, fascia: GR, rafters: GR, rafterStep: 0.7 } });
  // attic storey windows in the street gable
  { const R = F.runs.W; for (const sx of [-0.65, 0.65]) K.fill(R, { s0: R.L / 2 + sx - 0.4, s1: R.L / 2 + sx + 0.4, y0: 7.2, y1: 8.6 }, { rev: 0.18, frame: P.trimCream, mull: 0, tran: [] });
    K.addRun(R, SH, (() => { const sh = new THREE.Shape(); sh.moveTo(0.05, 6.2); sh.lineTo(R.L - 0.05, 6.2); sh.lineTo(R.L / 2, 11.4); sh.lineTo(0.05, 6.2);
      [ -0.65, 0.65 ].forEach((sx) => { const h = new THREE.Path(); h.moveTo(R.L / 2 + sx - 0.4, 7.2); h.lineTo(R.L / 2 + sx + 0.4, 7.2); h.lineTo(R.L / 2 + sx + 0.4, 8.6); h.lineTo(R.L / 2 + sx - 0.4, 8.6); h.lineTo(R.L / 2 + sx - 0.4, 7.2); sh.holes.push(h); });
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); g.translate(0, 0, -0.2); return g; })());
    // flat-roofed porch on mustard posts with a shingled balcony parapet (centre-right as seen from the street)
    const s = R.L / 2 + 0.9, w = 7.6, d = 2.3, y0 = 0.6, y1 = 3.0;
    for (let k = 0; k < 6; k++) { const ps = s - w / 2 + 0.15 + (w - 0.3) * k / 5; K.rbox(R, OC, ps - 0.08, y0, d - 0.23, ps + 0.08, y1, d - 0.07); K.rbox(R, P.concreteBuff, ps - 0.16, -1, d - 0.31, ps + 0.16, y0 + 0.35, d + 0.01); }
    K.rbox(R, GR, s - w / 2 - 0.1, y1, 0, s + w / 2 + 0.1, y1 + 0.18, d + 0.1);
    K.rbox(R, SH, s - w / 2 - 0.1, y1 + 0.18, d - 0.05, s + w / 2 + 0.1, y1 + 1.3, d + 0.1);
    for (const sx of [-1, 1]) K.rbox(R, SH, s + sx * (w / 2) - 0.08, y1 + 0.18, 0, s + sx * (w / 2) + 0.08, y1 + 1.3, d);
    K.rbox(R, GR, s - w / 2 - 0.12, y1 + 1.3, -0.05, s + w / 2 + 0.12, y1 + 1.36, d + 0.12);
    K.rbox(R, P.concreteBuff, s - w / 2, -1.2, 0, s + w / 2, y0, d);
    const sign = M.whitePaint.clone(); sign.color = new THREE.Color(0xd9772b); K.rbox(R, sign, s - w / 2 + 0.3, y1 + 0.55, d + 0.1, s - w / 2 + 1.5, y1 + 1.0, d + 0.14, { detail: true });
    chimney(K, M.brick, -14.75 - 0.45, -4.4, 0.9, 1.2, -1.0, 11.9, P.concreteBuff);
    // cross-gabled dormer on the south roof slope with a triple window
    roof(K, { type: 'gable', u0: -9.6, u1: -6.0, v0: 2.2, v1: 6.3, y: 8.2, rise: 1.6, axis: 'v', ov: 0.35, rake: 0.3, mat: roofM, fascia: GR, wallMat: SH });
    K.box(SH, -9.5, 6.0, 2.4, -6.1, 8.2, 5.6); { const RD = K.run([-9.5, 5.9], [-6.1, 5.9]); facade(K, RD, { s0: 0, s1: RD.L, y0: 6.0, y1: 8.2, mat: SH, depth: 0.3, frame: P.trimCream, ops: [{ s0: 0.4, s1: 3.0, y0: 6.7, y1: 7.8, mull: 2 }] }); }
  }
  colliders.push(K.colPoly([[-14.75, -5.85], [-1.0, -5.85], [-1.0, 5.85], [-14.75, 5.85]], -2, 12));
  // rear wing higher up the slope: two storeys over a raised floor, ribbon windows, cross gable and a small railed balcony
  const Rr = house(K, { u0: -1.0, u1: 14.76, v0: -5.86, v1: 5.86, g0: 5.0, y0: -1.0, eave: 11.6, storeys: 2, mat: SH, frame: OC, sillMat: GR, trim: GR,
    faces: { W: false, N: { nb: 5, muntins: 1, ww: 0.75, wh: 1.6 }, S: { nb: 6, muntins: 2, ww: 0.6, wh: 1.7 }, E: { nb: 3, doors: [1] } },
    roof: { type: 'gable', axis: 'u', rise: 3.2, ov: 0.55, rake: 0.5, mat: roofM, fascia: GR } });
  roof(K, { type: 'gable', u0: 5.0, u1: 9.5, v0: -6.6, v1: 6.6, y: 11.6, rise: 3.0, axis: 'v', ov: 0.5, rake: 0.45, mat: roofM, fascia: GR, wallMat: SH });
  { const R = Rr.runs.S; K.rbox(R, P.woodBeam, 9.5, 8.3, -0.1, 12.5, 8.45, 1.0); rail(K, R, RR, 9.55, 12.45, 8.45, 0.95, 1.0, 0.12); }
  colliders.push(K.colPoly([[-1.0, -5.86], [14.76, -5.86], [14.76, 5.86], [-1.0, 5.86]], -2, 16));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
