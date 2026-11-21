// The Hillside Club, 2286 Cedar Street (John White, 1924, rebuilt after the 1923 Berkeley fire to Bernard Maybeck's
// spirit; the original 1906 clubhouse was Maybeck's). A dark, low, horizontal Arts & Crafts clubhouse: walls of
// dark-stained redwood shingles, very shallow grey-green roofs with long thin eaves, a tall central hall with one big
// multi-pane window facing Cedar Street, stepped side wings, and a small pale blue-grey entrance porch with scroll-cut
// brackets and pointed-arch double doors. Massing from the 2021 LiDAR (hall eaves ≈8 m, ridge ≈9.9 m).
import * as THREE from 'three';
import { Kit, pal, wing, roof, facade, chimney, porch, woodShingle } from './lib/b08a-kit.js';
import { coopMat } from './lib/coop-kit.js';
import { rectRuns, finishGround, shingleMat } from './lib/rn-b-ground.js';

export const info = {
  id: 'hillside-club',
  name: 'Hillside Club',
  subtitle: 'John White · 1924',
  blurb: 'Founded in 1898 to promote building in harmony with the Berkeley hills, the Hillside Club lost its 1906 Maybeck-designed clubhouse in the 1923 fire; the present shingled hall was designed by John White, Maybeck\'s brother-in-law.',
  replaces: ['w/134100561'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-7.9)); const M = ctx.M; const P = pal(ctx);
  const SH = shingleMat('hillside', { base: 0x5e4b3a }), RF = coopMat('roof', '#5b524a'), TR = coopMat('paint', '#6b6a55'), BG = P.trimBlueGrey; // dark-stained redwood shingle, weathered shingle roofs, dark stained trim
  const FASC = M.woodDark.clone(); FASC.color = new THREE.Color(0x5e4a3a);
  const Y0 = -1.5, G = 1.6; // floor level (Cedar St side ground ≈1.5)
  const colliders = [], walk = [];
  const win = (s, w, y0, h, mull = 1, mun = 2) => ({ s0: s - w / 2, s1: s + w / 2, y0, y1: y0 + h, mull, muntins: mun });
  // ---- main hall: tall double-height volume, very shallow gable parallel to the street ----
  const H = wing(K, { u0: -9.8, u1: 8.5, v0: -6.8, v1: 5.16, y0: Y0, y1: 8.3, mat: SH, depth: 0.3, frame: TR, sillMat: TR, trim: TR, trimW: 0.09,
    faces: {
      N: (R) => [{ s0: 9.6, s1: 13.6, y0: G + 1.6, y1: G + 6.1, mull: 4, muntins: 5, tran: 0.5 }, win(2.0, 1.1, G + 3.9, 1.2, 1, 1), win(4.6, 2.2, G + 1.0, 1.5, 3, 1), win(16.0, 1.6, G + 1.0, 1.5, 2, 1)],   // the great hall window (right of centre from Cedar St)
      S: (R) => [win(4, 1.6, G + 1.0, 2.2, 2, 2), win(9, 1.6, G + 1.0, 2.2, 2, 2), win(14, 1.6, G + 1.0, 2.2, 2, 2), win(9, 2.4, G + 3.9, 1.3, 3, 1)],
      E: false, W: (R) => [win(R.L / 2, 0.7, 6.6, 0.6, 0, 0)],
    } });
  roof(K, { type: 'gable', u0: -9.8, u1: 8.5, v0: -6.8, v1: 5.16, y: 8.3, rise: 1.9, axis: 'u', ov: 1.0, rake: 0.8, mat: RF, fascia: FASC, wallMat: SH, thick: 0.2, rafters: FASC, rafterStep: 0.6 }); // LiDAR: eaves ≈8.3, ridge ≈10.2
  
  colliders.push(K.colPoly([[-9.8, -6.8], [8.5, -6.8], [8.5, 5.16], [-9.8, 5.16]], -2, 10));
  // ---- west wing (far right from the street): lower, its own shallow gable running north–south ----
  wing(K, { u0: -15.83, u1: -9.8, v0: -6.8, v1: 9.6, y0: Y0, y1: 7.7, mat: SH, depth: 0.3, frame: TR, sillMat: TR, trim: TR,
    faces: { E: false, N: (R) => [{ s0: 1.2, s1: 2.3, y0: G + 0.5, y1: G + 3.1, kind: 'door', arch: true, door: BG, doorTop: G + 2.55, sill: false }, win(4.0, 0.6, G + 1.2, 0.8, 0, 1), win(5.0, 0.6, G + 1.2, 0.8, 0, 1), win(3.4, 1.4, G + 4.2, 1.3, 2, 1)], W: (R) => [win(3.0, 1.1, G + 0.9, 1.5, 1, 1), win(8.5, 1.1, G + 0.9, 1.5, 1, 1), win(13, 1.1, G + 0.9, 1.5, 1, 1), win(8.5, 1.8, G + 3.6, 1.2, 2, 1)],
      S: (R) => [win(R.L / 2, 1.2, G + 0.9, 1.4, 1, 1)] } });
  roof(K, { type: 'shed', u0: -15.83, u1: -9.8, v0: -6.8, v1: 9.6, y: 7.7, rise: 0.9, low: 'W', ov: 0.8, mat: RF, fascia: P.woodBeam, wallMat: SH, thick: 0.18 });
  { const R = K.run([-9.8, -6.8], [-15.83, -6.8]); const g = K.g(-11.5, -8); const n = Math.max(1, Math.round((G + 0.5 - g) / 0.17)); for (let k = 0; k < n; k++) K.rbox(R, P.concreteDark || M.concreteDark, 1.0, g - 0.5, (n - k - 1) * 0.3, 2.5, g + (G + 0.5 - g) * (k + 1) / n, (n - k) * 0.3);
    K.rbox(R, SH, 2.9, g - 0.5, 1.2, 6.4, g + 1.4, 1.6); K.rbox(R, P.concreteBuff, 2.85, g + 1.4, 1.15, 6.45, g + 1.5, 1.65); }
  colliders.push(K.colPoly([[-15.83, -6.8], [-9.8, -6.8], [-9.8, 9.6], [-15.83, 9.6]], -2, 9));
  // ---- east wing (left from the street): two storeys with a clerestory strip under the eave ----
  wing(K, { u0: 8.5, u1: 14.72, v0: -6.8, v1: 8.75, y0: Y0, y1: 7.0, mat: SH, depth: 0.3, frame: TR, sillMat: TR, trim: TR,
    faces: { W: false, N: (R) => [win(R.L / 2 + 0.1, 2.0, G + 3.6, 1.4, 2, 2), win(1.2, 0.5, G + 4.9, 0.5, 0, 0), win(R.L - 1.2, 0.5, G + 4.9, 0.5, 0, 0)],
      E: (R) => [win(3, 1.1, G + 0.9, 1.3, 1, 1), win(8, 1.1, G + 0.9, 1.3, 1, 1), win(12.5, 1.1, G + 0.9, 1.3, 1, 1), win(5, 1.1, G + 3.6, 1.2, 1, 1), win(10, 1.1, G + 3.6, 1.2, 1, 1)],
      S: (R) => [win(R.L / 2, 1.1, G + 0.9, 1.3, 1, 1), win(R.L / 2, 1.1, G + 3.6, 1.2, 1, 1)] } });
  roof(K, { type: 'gable', u0: 8.5, u1: 14.72, v0: -6.8, v1: 8.75, y: 7.0, rise: 0.5, axis: 'u', ov: 0.7, rake: 0.5, mat: RF, fascia: FASC, wallMat: SH, thick: 0.2, rafters: FASC, rafterStep: 0.6 });
  colliders.push(K.colPoly([[8.5, -6.8], [14.72, -6.8], [14.72, 8.75], [8.5, 8.75]], -2, 9));
  // ---- rear lean-tos filling the south side ----
  wing(K, { u0: -9.8, u1: -7.45, v0: 5.16, v1: 9.6, y0: Y0, y1: 5.2, mat: SH, depth: 0.3, frame: TR, faces: { N: false, E: (R) => [win(R.L / 2, 0.9, G + 0.9, 1.2, 1, 1)], W: false, S: [] } });
  roof(K, { type: 'shed', u0: -9.8, u1: -7.45, v0: 5.16, v1: 9.6, y: 5.2, rise: 0.8, low: 'S', ov: 0.5, mat: RF, fascia: FASC, wallMat: SH });
  wing(K, { u0: 3.6, u1: 8.5, v0: 5.16, v1: 8.73, y0: Y0, y1: 5.6, mat: SH, depth: 0.3, frame: TR, faces: { N: false, E: false, W: (R) => [win(R.L / 2, 0.9, G + 0.9, 1.2, 1, 1)], S: (R) => [win(R.L / 2, 1.6, G + 0.9, 1.3, 2, 1)] } });
  roof(K, { type: 'shed', u0: 3.6, u1: 8.5, v0: 5.16, v1: 8.73, y: 5.6, rise: 0.8, low: 'S', ov: 0.5, mat: RF, fascia: FASC, wallMat: SH });
  // ---- one-storey front range along Cedar Street (east half) with the entrance porch ----
  wing(K, { u0: 2.81, u1: 14.7, v0: -9.41, v1: -6.8, y0: Y0, y1: 4.0, mat: SH, depth: 0.3, frame: TR, sillMat: TR, trim: TR,
    faces: { S: false, N: (R) => [win(2.6, 1.3, G + 1.0, 1.3, 1, 1), win(R.L - 1.3, 1.6, G + 1.4, 1.0, 3, 1),
      { s0: 7.0, s1: 8.8, y0: G, y1: G + 2.6, kind: 'door', arch: true, door: BG, doorTop: G + 1.7, sill: false }], E: (R) => [win(R.L / 2, 0.8, G + 1.0, 1.0, 0, 1)], W: [] } });
  roof(K, { type: 'shed', u0: 2.81, u1: 14.7, v0: -9.41, v1: -6.8, y: 4.0, rise: 0.45, low: 'N', ov: 0.35, mat: RF, fascia: P.woodBeam, thick: 0.12 });
  colliders.push(K.colPoly([[2.81, -9.41], [14.7, -9.41], [14.7, -6.8], [2.81, -6.8]], -2, 5));
  // entrance porch: pale blue-grey posts, heavy lintel with scroll brackets, very low gable facing the street
  { const R = K.run([14.7, -9.41], [2.81, -9.41]); const s = 7.9; const g = K.g(...R.at(s, 1.5));
    K.rbox(R, RF, 9.6, G + 2.55, 0, 11.7, G + 2.62, 0.95); K.rbox(R, P.woodBeam, 9.6, G + 2.45, 0.9, 11.7, G + 2.62, 0.95);  // thin metal awning over the small window
    porch(K, R, { s, w: 4.5, d: 2.1, y0: Math.max(g, G - 0.05), y1: G + 2.65, postMat: BG, roofMat: RF, beamMat: BG, gable: true, rise: 0.45, post: 0.35, floor: P.concreteBuff });
    K.rbox(R, BG, s - 2.2, G + 0.85, 1.85, s + 2.2, G + 0.97, 2.0, { detail: true }); // porch rail
    for (const sx of [-1, 1]) { K.rbox(R, BG, s + sx * 2.07 - 0.12, G + 2.1, 1.6, s + sx * 2.07 + 0.12, G + 2.65, 2.3); K.rbox(R, BG, s + sx * 1.6 - 0.12, G + 2.3, 1.75, s + sx * 2.0, G + 2.65, 2.05); } // corbel brackets
    K.rbox(R, M.iron, s - 0.12, G + 2.2, 0.6, s + 0.12, G + 2.6, 0.84, { detail: true });                                        // hanging lantern
    K.rbox(R, M.lampGlow, s - 0.08, G + 2.25, 0.64, s + 0.08, G + 2.5, 0.8, { detail: true });
    const SIGN = M.whitePaint.clone(); SIGN.color = new THREE.Color(0x9a4a30);
    K.rbox(R, SIGN, s + 0.6, G + 2.0, 2.02, s + 1.45, G + 2.4, 2.06, { detail: true });                                         // HILLSIDE CLUB sign
    if (G - g > 0.15) { const n = Math.round((G - g) / 0.16); for (let k = 0; k < n; k++) K.rbox(R, P.concreteBuff, s - 1.2, g - 0.5, 2.0 + (n - k - 1) * 0.32, s + 1.2, g + (G - g) * (k + 1) / n, 2.0 + (n - k) * 0.32); }
  }
  // brick chimney on the upper east mass; low shingled garden wall at the west end of the frontage
  chimney(K, M.brick, 11.6, 6.2, 0.9, 0.7, 5.0, 9.6, P.concreteBuff);
  K.cyl(P.trimCream, 6.5, 9.0, -3.0, 0.12, 0.12, 1.4, 8);  // small metal flue
  { const R = K.run([14.72, -6.8], [8.5, -6.8]); K.rbox(R, M.brick, 0.3, G + 4.0, 0.0, 0.9, G + 5.5, 0.03); }
  { const R = K.run([-9.8, -6.8], [-16.5, -6.8]); const g = K.g(-13, -7.6); K.rbox(R, SH, -1.0, g - 0.6, 0.6, 7.6, g + 1.0, 0.95); K.rbox(R, FASC, -1.05, g + 1.0, 0.55, 7.65, g + 1.08, 1.0); }
  // foundation planting along the walls, a bike rack by the Cedar Street walk (rn-b-ground); the porch keeps its own steps
  { const runs = rectRuns(K, [{ u0: -9.8, u1: 8.5, v0: -6.8, v1: 5.16 }, { u0: -15.83, u1: -9.8, v0: -6.8, v1: 9.6 }, { u0: 8.5, u1: 14.72, v0: -6.8, v1: 8.75 }, { u0: -9.8, u1: -7.45, v0: 5.16, v1: 9.6 }, { u0: 3.6, u1: 8.5, v0: 5.16, v1: 8.73 }, { u0: 2.81, u1: 14.7, v0: -9.41, v1: -6.8 }].map((r) => ({ ...r, floor: G })));
    const front = runs.find((r) => r.f === 'N' && Math.abs(r.b.v0 + 9.41) < 0.01); if (front) front.extraSkip = [[4.8, 11.0]];
    const wn = runs.find((r) => r.f === 'N' && Math.abs(r.b.u0 + 15.83) < 0.01); if (wn) wn.extraSkip = [[-1, 4.2]];
    const Gd = finishGround(K, ctx, runs, { entries: [], props: front ? [{ run: front, s: 2.2, d: 2.0, n: 3 }] : [], plant: { h: 0.9, depth: 1.2 } });
    colliders.push(...Gd.colliders); walk.push(...Gd.walkables); }
  // copper downpipes on the hall front
  { const R = K.run([8.5, -6.8], [-9.8, -6.8]); for (const s of [0.3, 18.0]) K.rbox(R, P.woodBeam, s - 0.05, 0, 0.02, s + 0.05, 7.6, 0.12, { detail: true }); }
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: walk };
}
