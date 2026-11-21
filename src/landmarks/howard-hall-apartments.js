// Howard Hall Apartments, 2330 Warring Street — a crisp mid-century apartment block on the steep Warring Street slope
// below Clark Kerr: three floors of flats over a board-formed concrete parking podium, smooth pale grey-white stucco,
// wide black-framed ribbon windows with flush Juliet rails, a flat roof with a thin parapet, a set-back penthouse and a
// black picket railing around the roof deck. Massing from the 2021 LiDAR (roof ≈11.9 m, penthouse ≈14.7 m).
import * as THREE from 'three';
import { Kit, pal, wing, roof, rail } from './lib/b08a-kit.js';

export const info = {
  id: 'howard-hall-apartments',
  name: 'Howard Hall Apartments',
  subtitle: '2330 Warring Street',
  blurb: 'A mid-century apartment building of eleven flats on Warring Street, between the south-side fraternity blocks and the Clark Kerr Campus.',
  replaces: ['w/473598541'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-8.8)); const M = ctx.M; const P = pal(ctx);
  const ST = M.stuccoWhite.clone(); ST.color = new THREE.Color(0xf5f7fb);
  const POD = M.stuccoWhite.clone(); POD.color = new THREE.Color(0xe9ebef);
  const FR = P.frameDark, BL = M.blackPaint; const colliders = [];
  const u0 = -6.25, u1 = 6.25, v0 = -12.37, v1 = 12.37, TOP = 11.9;
  const gS = Math.min(K.g(0, v1 + 0.5), K.g(u1 + 0.5, v1)), PODT = gS + 2.9; // podium top on the low (south) end
  const fl = [PODT, PODT + (TOP - 0.6 - PODT) / 3, PODT + 2 * (TOP - 0.6 - PODT) / 3];
  const ribbon = (L, centres, w = 3.2) => { const out = []; for (const c of centres) for (const y of fl) out.push({ s0: c - w / 2, s1: c + w / 2, y0: y + 0.75, y1: y + 2.45, mull: 3, juliet: true }); return out; };
  const runs = wing(K, { u0, u1, v0, v1, y0: gS - 1.5, y1: TOP, mat: ST, depth: 0.25, frame: FR, sillMat: ST,
    faces: { S: (R) => ribbon(R.L, [R.L * 0.27, R.L * 0.73]), N: (R) => ribbon(R.L, [R.L * 0.27, R.L * 0.73]),
      E: (R) => ribbon(R.L, [R.L * 0.14, R.L * 0.38, R.L * 0.62, R.L * 0.86], 2.8), W: (R) => ribbon(R.L, [R.L * 0.14, R.L * 0.38, R.L * 0.62, R.L * 0.86], 2.4) } });
  // board-formed concrete podium skin + garage opening on the south end
  for (const f of ['S', 'E', 'N', 'W']) { const R = runs[f];
    K.rbox(R, POD, -0.04, gS - 1.5, 0, R.L + 0.04, PODT, 0.06);
    for (let y = gS - 1.5 + 0.3; y < PODT; y += 0.3) K.rbox(R, POD, -0.04, y, 0.06, R.L + 0.04, y + 0.03, 0.075, { detail: true });
    // Juliet rails (horizontal black bars) at every ribbon window
    for (const y of fl) { const L = R.L; const cs = f === 'S' || f === 'N' ? [L * 0.27, L * 0.73] : [L * 0.14, L * 0.38, L * 0.62, L * 0.86]; const w = f === 'S' || f === 'N' ? 3.2 : f === 'E' ? 2.8 : 2.4;
      for (const c of cs) rail(K, R, BL, c - w / 2, c + w / 2, y + 0.05, 0.08, 1.0, 0.12, 'h'); }
  }
  { const R = runs.S; const a = R.L * 0.3, b = R.L * 0.3 + 5.0; // open garage mouth: dark void with yellow guard posts inside the jambs
    K.rbox(R, BL, a, gS - 0.3, 0.07, b, gS + 2.4, 0.09);
    for (const s of [a + 0.25, b - 0.25]) K.rbox(R, M.calGold, s - 0.08, gS - 0.3, 0.1, s + 0.08, gS + 1.0, 0.26, { detail: true }); }
  roof(K, { type: 'flat', u0, u1, v0, v1, y: TOP, parapet: { h: 0.45, mat: ST, t: 0.2, coping: P.trimWhite } });
  // set-back penthouse with glazing + roof-deck picket railing
  K.box(ST, -2.6, TOP - 0.3, -3.8, 4.0, 14.4, 5.0);   // plain stair / machine penthouse, set well back from the street faces
  { const R = K.run([-2.6, 5.0], [4.0, 5.0]); K.rbox(R, M.blackPaint, R.L / 2 - 0.5, TOP + 0.05, -0.02, R.L / 2 + 0.5, TOP + 2.2, 0.02); }
  for (const [a, b] of [[[u0 + 0.9, v1 - 0.9], [u1 - 0.9, v1 - 0.9]], [[u1 - 0.9, v1 - 0.9], [u1 - 0.9, v0 + 0.9]], [[u1 - 0.9, v0 + 0.9], [u0 + 0.9, v0 + 0.9]], [[u0 + 0.9, v0 + 0.9], [u0 + 0.9, v1 - 0.9]]]) { const R = K.run(a, b); rail(K, R, BL, 0, R.L, TOP, 0, 1.0, 0.13); }
  colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -3, 15));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [{ type: 'poly', pts: K.polyXZ([[u0 + 0.3, v0 + 0.3], [u1 - 0.3, v0 + 0.3], [u1 - 0.3, v1 - 0.3], [u0 + 0.3, v1 - 0.3]]), y: TOP }] };
}
