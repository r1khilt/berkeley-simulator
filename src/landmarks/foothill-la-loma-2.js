// Foothill · La Loma 2 (William Turnbull Jr. & Associates, 1990–91), part of the Foothill hillside village of linked, shingled residence
// halls. Massing from the 2021 LiDAR; Bay Region shingle style per the shared Foothill kit (lib/b08c-foothill.js).
import { foothillBuild, fhBalconyBay, fhBoxBay } from './lib/b08c-foothill.js';

export const info = {
  id: 'foothill-la-loma-2',
  name: 'Foothill · La Loma 2',
  subtitle: 'William Turnbull Jr. · 1991',
  blurb: 'Foothill’s shingled residence halls step up the hillside along Hearst Avenue and La Loma like a small village of linked houses, joined by bridges, stairs and courts; a Bay Region style design by William Turnbull Jr.',
  replaces: ['w/38939695', 'way/38939695'],
};

export async function build(ctx) {
  const blocks = [
    { u0: -26.0, u1: -14.0, v0: -6.0, v1: 7.5, g: 0.5, eave: 13.4, ridge: 16.0, axis: 'v' },
    { u0: -14.0, u1: 0.0, v0: -6.0, v1: 7.5, g: 1.6, eave: 15.0, ridge: 18.8, axis: 'u', faces: { W: false } },
    { u0: 0.0, u1: 11.5, v0: -6.0, v1: 7.5, g: 4.2, eave: 17.6, ridge: 21.4, axis: 'v' },
    { u0: 11.5, u1: 27.0, v0: -6.0, v1: 2.0, g: 6.9, eave: 18.2, ridge: 21.6, axis: 'u', faces: { W: false } },
  ];
  const { object3d, colliders } = foothillBuild(ctx, -1, blocks, (K, F) => {
    fhBalconyBay(K, F, K.run([-26.0, 7.5], [-14.0, 7.5]), 6.0, 4.6, 0.5, 13.4, { d: 1.8 });
    fhBoxBay(K, F, K.run([-14.0, 7.5], [0.0, 7.5]), 7.0, 3.4, 1.6 + 3.85, 2);
  });
  object3d.name = 'foothill-la-loma-2';
  return { object3d, colliders, walkables: [] };
}
