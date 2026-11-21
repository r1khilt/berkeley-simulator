// Conference Center at the UC Botanical Garden (Strawberry Canyon), near the Tropical House and Julia Morgan Hall: a
// one-storey timber meeting hall in the garden's rustic redwood idiom (no reliable photo was found, so the treatment follows
// the neighbouring Julia Morgan Hall): dark-stained redwood shingle walls on a stone base, a light-grey shingled gable roof
// with deep eaves and exposed rafter tails, banks of tall glazed doors opening onto a timber deck. Massing from the 2021 LiDAR
// (eaves ~3.6 m, ridge ~6.0 m), frame 37°.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { rmats, gothRange } from './lib/reastb-kit.js';

export const info = {
  id: 'conference-center',
  name: "Conference Center",
  subtitle: 'UC Botanical Garden',
  blurb: "A garden meeting hall in the UC Botanical Garden in Strawberry Canyon, near Julia Morgan Hall.",
  replaces: ['w/153308474', 'way/153308474'],
};

export async function build(ctx) {
  const M = ctx.M; const R = rmats(M);
  const K = new Kit(ctx, THREE.MathUtils.degToRad(37));
  const colliders = [], walkables = [];
  const b = { u0: -4.6, u1: 4.6, v0: -9.6, v1: 9.6, eave: 3.6, ridge: 6.0, axis: 'v' };
  // walls: tall glazed door groups on the long (deck) side, smaller casement groups elsewhere
  gothRange(K, { mat: R.ccSiding, trim: R.jmTrim, sash: R.jmSash, plinth: M.graniteDark, hood: false, string: false, cornice: false, noTransom: true,
    panes: 2, mullW: 0.1, lightW: 0.55, winH: 2.1, topH: 2.1, fh: 3.0, depth: 0.28, ...b, ridge: 0, bay: 3.2,
    lights: (i, k, f) => (f === 'E' ? 4 : 3) });
  // gable roof with deep eaves, exposed rafter tails, dark fascia
  K.gable(R.jmRoof, b.u0, b.v0, b.u1, b.v1, b.eave, b.ridge - b.eave, 'v', { overhang: 0.9, wallMat: R.ccSiding });
  K.box(R.jmTrim, -0.18, b.ridge - 0.05, b.v0 - 0.9, 0.18, b.ridge + 0.12, b.v1 + 0.9); // ridge cap
  for (const u of [b.u0 - 0.9, b.u1 + 0.9]) for (let v = b.v0 - 0.6; v <= b.v1 + 0.6; v += 0.8) K.box(R.timber, Math.min(u, u + (u < 0 ? 0.9 : -0.9)), b.eave - 0.62, v - 0.06, Math.max(u, u + (u < 0 ? 0.9 : -0.9)), b.eave - 0.48, v + 0.06, { detail: true });
  // timber deck on the east side with a simple rail
  { const g = K.gMin(b.u1, -7.0, b.u1 + 3.0, 7.0); const yD = K.gMax(b.u1, -7.0, b.u1 + 3.0, 7.0) + 0.25;
    K.box(R.timber, b.u1, g - 0.6, -7.0, b.u1 + 3.0, yD, 7.0);
    walkables.push(K.walkPoly([[b.u1, -7.0], [b.u1 + 3.0, -7.0], [b.u1 + 3.0, 7.0], [b.u1, 7.0]], yD));
    for (let v = -7.0; v <= 7.01; v += 1.75) K.box(R.timber, b.u1 + 2.85, yD, v - 0.05, b.u1 + 2.95, yD + 1.0, v + 0.05, { detail: true });
    K.box(R.timber, b.u1 + 2.82, yD + 0.95, -7.0, b.u1 + 2.98, yD + 1.05, 7.0); }
  colliders.push(K.colPoly([[b.u0, b.v0], [b.u1, b.v0], [b.u1, b.v1], [b.u0, b.v1]], -2, b.ridge + 0.5));
  const object3d = K.finish();
  object3d.name = 'conference-center';
  return { object3d, colliders, walkables };
}
