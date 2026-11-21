// Conference Center at the UC Botanical Garden (Strawberry Canyon), beside Julia Morgan Hall: a one-storey timber hall in
// a Craftsman-sympathetic style, redwood shingle under a deep-eaved gable, with big glazed doors to a deck.
// No reliable photo was available; massing from the 2021 LiDAR (frame 37°).
import { hallBuild, chimney } from './lib/b08c-halls.js';

export const info = {
  id: 'conference-center',
  name: "Conference Center",
  subtitle: 'UC Botanical Garden',
  blurb: "A garden meeting hall in the UC Botanical Garden in Strawberry Canyon, next to Julia Morgan Hall.",
  replaces: ['w/153308474', 'way/153308474'],
};

export async function build(ctx) {
  const M = ctx.M;
  const blocks = [
    { u0: -4.6, u1: 4.6, v0: -9.6, v1: 9.6, g: 0.0, eave: 3.6, ridge: 6.0, axis: 'v', roof: 'gable', bay: 2.6, win: { w: 1.9, h: 2.2, mull: 2, tran: 0.82 } },
  ];
  const { object3d, colliders } = hallBuild(ctx, 37, 'craftsman', blocks, (K) => {
    const g = K.gMin(4.6, -6, 7.5, 6); K.box(M.woodDark, 4.6, g - 0.8, -6.0, 7.4, g + 0.4, 6.0);
  });
  object3d.name = 'conference-center';
  return { object3d, colliders, walkables: [] };
}
