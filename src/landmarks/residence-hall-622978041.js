// Residence hall at 2479 Le Conte Avenue (Holy Hill): a three-storey mid-century residence block in pale stucco with a flat
// parapet roof and exterior walkways with metal railings. No reliable photo was available; massing from the 2021 LiDAR
// (frame -9°).
import { hallBuild, chimney } from './lib/b08c-halls.js';

export const info = {
  id: 'residence-hall-622978041',
  name: "2479 Le Conte Avenue",
  subtitle: 'Residence hall',
  blurb: "A three-storey residence hall at 2479 Le Conte Avenue on Holy Hill, north of campus.",
  replaces: ['w/622978041', 'way/622978041'],
};

export async function build(ctx) {
  const M = ctx.M;
  const blocks = [
    { u0: -6.0, u1: 6.0, v0: -15.0, v1: 9.0, g: 0.1, eave: 11.0, ridge: 11.7, axis: 'v', roof: 'flat' },
    { u0: -6.0, u1: 6.0, v0: 9.0, v1: 15.5, g: 0.5, eave: 8.0, ridge: 8.4, axis: 'v', roof: 'flat', faces: { N: false } },
  ];
  const { object3d, colliders } = hallBuild(ctx, -9, 'midcentury', blocks, (K) => {
    const g = K.gMin(6, -14, 8, 8);
    for (let y = g + 3.5; y < 10.5; y += 3.0) { K.box(M.concrete, 6.0, y - 0.2, -14.0, 7.6, y, 8.0); for (let v = -14; v <= 8; v += 0.2) K.box(M.iron, 7.5, y, v - 0.015, 7.56, y + 1.0, v + 0.015, { detail: true }); K.box(M.iron, 7.48, y + 1.0, -14.0, 7.6, y + 1.06, 8.0); }
    for (const v of [-13.8, -3.0, 7.8]) K.box(M.iron, 7.45, g, v - 0.06, 7.57, 10.4, v + 0.06);
  });
  object3d.name = 'residence-hall-622978041';
  return { object3d, colliders, walkables: [] };
}
