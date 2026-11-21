// Foothill · Hillside 5 (William Turnbull Jr. & Associates, 1990–91), part of the Foothill hillside village of linked, shingled residence
// halls. Massing from the 2021 LiDAR; Bay Region shingle style per the shared Foothill kit (lib/b08c-foothill.js).
import { foothillBuild, fhBalconyBay, fhBoxBay } from './lib/b08c-foothill.js';

export const info = {
  id: 'foothill-hillside-5',
  name: 'Foothill · Hillside 5',
  subtitle: 'William Turnbull Jr. · 1991',
  blurb: 'Foothill’s shingled residence halls step up the hillside along Hearst Avenue and La Loma like a small village of linked houses, joined by bridges, stairs and courts; a Bay Region style design by William Turnbull Jr.',
  replaces: ['w/35894521', 'way/35894521'],
};

export async function build(ctx) {
  const blocks = [
    { u0: -10.5, u1: 10.5, v0: -6.0, v1: 6.0, g: 0.0, eave: 6.3, ridge: 9.2, axis: 'u' },
  ];
  const { object3d, colliders } = foothillBuild(ctx, 8, blocks, (K, F) => {
    fhBalconyBay(K, F, K.run([-10.5, 6.0], [10.5, 6.0]), 10.5, 4.0, 0.0, 6.3, { d: 1.6, floors: 1 });
  });
  object3d.name = 'foothill-hillside-5';
  return { object3d, colliders, walkables: [] };
}
