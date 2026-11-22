// Zellerbach Playhouse (DeMars & Hardison, 1968): the intimate theatre beside Zellerbach Hall. A low board-formed
// concrete block whose heavy fascia — scored with raked lines that echo the seating inside — cantilevers over a
// recessed, glazed lobby on square piers; a standing-seam metal roof rises behind the parapet and a concrete fly loft
// stands mid-block. Massing from the 2021 LiDAR: roof 12 m, fly loft 21.5 m, raked north end 6.5–12 m.
import * as THREE from 'three';
import { Kit, polysGeo } from './lib/classic-kit.js';
import { glassBand, pipeRail, tinted, tone } from './lib/b01-kit.js';
import { signText } from './lib/b03-kit.js';

export const info = {
  id: 'zellerbach-playhouse',
  name: 'Zellerbach Playhouse',
  subtitle: 'DeMars & Hardison · 1968',
  blurb: 'The Playhouse is the smaller theatre of the Zellerbach complex, used for Theater, Dance & Performance Studies productions and Cal Performances events.',
  replaces: ['w/24025431'],
};
export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9);
  const K = new Kit(ctx, ANG); const M = ctx.M; const g = (u, v) => K.g(u, v);
  const colliders = [], walkables = [];
  const conc = tone(M.concrete, 0x9a968f), concL = tone(M.concrete, 0xa6a39c), soffit = tone(M.concrete, 0x6e6b66);
  const metal = tinted(M.whitePaint, 0x7d8388, { metalness: 0.5, roughness: 0.4 });
  const frame = tinted(M.darkBronze, 0x2b2a28);
  const drape = tinted(M.stucco, 0x5a5148); // r4-sweep-central2: dim lobby behind the glass (a pale drape made the glazing read as a grey wall)
  const lglass = tinted(M.glassLight, 0x4f5a55, { opacity: 0.5 }), seam = tinted(M.iron, 0x8a9095), rail = tinted(M.iron, 0xb8bcbf, { metalness: 0.7 });
  const U0 = -12.9, U1 = 13.1, V0 = -28.8, V1 = 28.7, FT = 7.0, RT = 12.0;
  const GP = Math.max(g(U1 + 2, 0), g(0, V0 - 2)); const GT = GP + 3.8; // lobby glazing top
  // lobby core (recessed 3.5 m on the east and north), heavy fascia above
  K.box(M.concreteDark, U0 + 0.4, -1.5, V0 + 3.9, U1 - 3.9, FT - 0.2, V1 - 0.4);
  K.box(M.concreteDark, U1 - 3.9, GT, V0 + 0.4, U1 - 0.3, FT - 0.2, V1 - 0.4); K.box(M.concreteDark, U0 + 0.4, GT, V0 + 0.4, U1 - 3.9, FT - 0.2, V0 + 3.9);
  colliders.push(K.colPoly([[U0, V0 + 3.5], [U1 - 3.5, V0 + 3.5], [U1 - 3.5, V1], [U0, V1]], -2, RT));
  for (const [a, b, rk] of [[[U1, V1], [U1, V0], true], [[U1, V0], [U0, V0], false]]) {
    const R = K.run(a, b); const L = R.L;
    const Rg = K.run(...(rk ? [[U1 - 3.5, V1 - 0.4], [U1 - 3.5, V0 + 3.5]] : [[U1 - 3.5, V0 + 3.5], [U0 + 0.4, V0 + 3.5]]));
    glassBand(K, Rg, 0, Rg.L, GP - 0.5, GT, { glass: lglass, frame, pitch: 1.35, transoms: [GP + 2.4], doors: rk ? [{ s0: Rg.L - 9, s1: Rg.L - 7.2, h: 2.3 }, { s0: Rg.L - 7.1, s1: Rg.L - 5.3, h: 2.3 }] : [] });
    K.rbox(Rg, drape, 0.2, GP - 0.5, -0.5, Rg.L - 0.2, GT, -0.45);
    K.rbox(R, conc, -0.2, GT, -3.6, L + 0.2, FT, 0.0);        // fascia
    K.rbox(R, soffit, -0.2, GT - 0.02, -3.6, L + 0.2, GT, 0.0);
    // r4-sweep-central2: paved entry apron under the cantilever (lawn ran into the glass) and a row of soffit downlights
    K.rbox(R, concL, -0.2, GP - 1.6, -3.5, L + 0.2, GP - 0.47, 1.4);
    walkables.push(K.walkPoly(rk ? [[U1 - 3.5, V0], [U1 + 1.4, V0], [U1 + 1.4, V1], [U1 - 3.5, V1]] : [[U0, V0 - 1.4], [U1, V0 - 1.4], [U1, V0 + 3.5], [U0, V0 + 3.5]], GP - 0.47));
    for (let s = 1.8; s < L - 1; s += 3.6) K.rbox(R, M.lampGlow, s - 0.14, GT - 0.06, -1.9, s + 0.14, GT - 0.02, -1.62, { detail: true });
    for (let s = 3; s < L - 1; s += 7.2) { K.rbox(R, concL, s - 0.6, GP - 0.5, -3.5, s + 0.6, GT, -2.3); colliders.push(K.colCyl(...R.at(s, -2.9), 0.8, GP - 1, GT)); }
    for (let y = GT + 0.3; y < FT - 0.2; y += 0.3) K.rbox(R, M.concreteDark, 0, y - 0.01, 0.0, L, y + 0.01, 0.01, { detail: true });
    if (rk) for (let k = 0; k < 6; k++) { const y0 = GT + 0.3 + k * 0.42, len = L * 0.7; const gg = new THREE.BoxGeometry(len, 0.05, 0.04); gg.rotateZ(Math.atan2(1.2, len)); gg.translate(L * 0.15 + len / 2, y0 + 0.6, 0.01); K.addRun(R, M.concreteDark, gg, { detail: true }); } // raked reveals
  }
  // r4-sweep-central2: building name in thin dark-bronze capitals on the north fascia near the east corner (was a pixel-font
  // "ThePlayhouse" floating on a pier face)
  { const R2 = K.run([U1, V0], [U0, V0]); signText(K, R2, 'ZELLERBACH PLAYHOUSE', 7.6, GT + 0.75, 0.62, { font: 'Futura, "Century Gothic", "Trebuchet MS", Arial, sans-serif', weight: '500', spacing: 0.12, color: '#2f2a25', metal: 0.4, rough: 0.5, d: 0.03 }); }
  // west and south walls (board-formed concrete)
  for (const [a, b] of [[[U0, V0], [U0, V1]], [[U0, V1], [U1, V1]]]) { const R = K.run(a, b); K.rbox(R, conc, 0, Math.min(g(...a), g(...b)) - 0.6, -0.3, R.L, FT, 0.0); for (let y = 1; y < FT; y += 0.3) K.rbox(R, M.concreteDark, 0, y - 0.01, 0.0, R.L, y + 0.01, 0.01, { detail: true }); }
  K.box(conc, U0 - 0.1, FT - 0.05, V0 - 0.1, U1 + 0.1, FT + 0.5, V1 + 0.1);
  // standing-seam metal roof: flat top at 12 m over the theatre, raked down toward the north
  {
    const a0 = U0 + 1.0, a1 = U1 - 1.0, b0 = V0 + 1.0, b1 = V1 - 1.0, bk = -16.0;
    K.box(M.concreteDark, a0 + 0.2, FT, bk, a1 - 0.2, RT - 0.1, b1 - 0.2);
    K.box(metal, a0, RT - 0.12, bk, a1, RT, b1);
    const P = (u, v, y) => [u, y, v];
    K.add(metal, polysGeo([[P(a0, b0, FT + 0.5), P(a0, bk, RT), P(a1, bk, RT), P(a1, b0, FT + 0.5)]]), { uvMode: 'roof' });
    K.add(metal, polysGeo([[P(a0, b0, FT + 0.5), P(a1, b0, FT + 0.5), P(a1, bk, RT), P(a0, bk, RT)]]), { uvMode: 'roof' });
    for (const uu of [a0, a1]) K.add(conc, polysGeo([[P(uu, b0, FT + 0.5), P(uu, bk, FT + 0.5), P(uu, bk, RT)], [P(uu, b0, FT + 0.5), P(uu, bk, RT), P(uu, bk, FT + 0.5)]]));
    for (let u = a0 + 0.5; u < a1; u += 0.6) { K.box(seam, u - 0.02, RT, bk, u + 0.02, RT + 0.05, b1, { detail: true }); }
    // fly loft
    K.box(concL, U0 + 0.6, FT, 6.0, U1 - 0.6, 21.5, 15.5);
    for (let y = FT + 1.2; y < 21.5; y += 1.2) K.box(M.concreteDark, U0 + 0.58, y - 0.015, 5.98, U1 - 0.58, y + 0.015, 15.52, { detail: true });
  }
  pipeRail(K, rail, [[U1 - 0.3, 10], [U1 - 0.3, 26]], FT + 0.5, { h: 1.07 });
  const object3d = K.finish();
  object3d.name = 'zellerbach-playhouse';
  return { object3d, colliders, walkables };
}
