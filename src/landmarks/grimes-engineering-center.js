// Grimes Engineering Center (2025 transformation of the 1980 Bechtel Engineering Center): the low hub at the heart of the
// College of Engineering, home of the Engineering Library and the Terrace Café. Mostly tucked under its own roof terrace, which
// serves as the engineering quad's main plaza: paved, planted and edged with glass rails, with a glazed pavilion rising through
// it; its exposed sides are light concrete and glass. LiDAR: terrace ~5.8 m, pavilion ~11.8 m above the lowest grade.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, inset, gAt, polyRuns, storefront, signText } from './lib/b03-kit.js';

export const info = {
  id: 'grimes-engineering-center',
  name: 'Grimes Engineering Center',
  subtitle: 'Engineering hub · 2025',
  blurb: 'The transformed former Bechtel Engineering Center, reopened in 2025 after a renovation funded entirely by philanthropy. It houses the Engineering Library and the Terrace Café, under the roof terrace at the heart of the engineering quad.',
  replaces: ['w/25079275'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-15.8);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const CON = B.offWhite, GL = B.glassBlue, FR = B.alumDark;
  const colliders = [], walkables = [];
  const poly = ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z));
  const TER = 5.8;
  const runs = massBlock(K, { poly, levels: [-1.5, 0.6, TER - 0.3], top: TER - 0.3, wall: CON, style: 'curtain', glass: GL, frame: FR, win: { mw: 2.0, spandrel: 0.5, tran: 2.8 }, roof: M.concreteDark, minEdge: 3.0 });
  // roof terrace: paving, glass rail with a light concrete cap, planters and trees boxes
  K.prism(M.paving, poly, TER - 0.3, TER);
  walkables.push({ type: 'poly', pts: ctx.footprints[0].outer.map(([x, z]) => [x, z]), y: TER });
  for (const R of runs) {
    if (R.L < 1) continue;
    K.rbox(R, CON, -0.05, TER - 0.9, -0.3, R.L + 0.05, TER, 0.12); // fascia
    K.rbox(R, M.glassLight, 0, TER, -0.25, R.L, TER + 1.05, -0.2);
    K.rbox(R, FR, -0.02, TER + 1.05, -0.3, R.L + 0.02, TER + 1.12, -0.15);
  }
  for (const [a, b, c, d] of [[10, 9, 26, 15], [-26.5, 3, -20.5, 18], [-24, -10, -8, -6], [12, -10, 28, -6]]) {
    K.box(CON, a, TER, b, c, TER + 0.6, d); K.box(B.planting, a + 0.2, TER + 0.6, b + 0.2, c - 0.2, TER + 0.85, d - 0.2, { detail: true });
  }
  // glazed pavilion rising through the terrace (LiDAR ~11.8 m)
  massBlock(K, { poly: rect(-12.5, 5.0, 0.5, 12.5), levels: [TER, 11.5], top: 11.5, wall: CON, style: 'curtain', glass: GL, frame: FR, win: { mw: 1.6, spandrel: 0.0, tran: 3.2 }, roof: CON, core: false });
  K.prism(CON, inset(rect(-12.5, 5.0, 0.5, 12.5), -0.8), 11.5, 11.85);
  // café / library entrance on the lower (south) side
  { const R = runs.reduce((a, r) => (r.n[1] > 0.8 && (!a || r.L > a.L) ? r : a), null); if (R) { const s = R.L * 0.5, gy = Math.max(gAt(K, R, s, 1.5), -1);
    K.rbox(R, CON, s - 4, TER - 1.6, 0, s + 4, TER - 1.2, 2.5);
    signText(K, R, 'GRIMES ENGINEERING CENTER', s, TER - 0.45, 0.34, { color: '#2e2e2e', metal: 0.3, d: 0.13, font: 'Helvetica, Arial, sans-serif', weight: '500' }); } }
  colliders.push({ type: 'poly', pts: ctx.footprints[0].outer.map(([x, z]) => [+x.toFixed(3), +z.toFixed(3)]), y0: -2, y1: TER - 0.05 });
  const object3d = K.finish(); object3d.name = 'grimes-engineering-center';
  return { object3d, colliders, walkables };
}
