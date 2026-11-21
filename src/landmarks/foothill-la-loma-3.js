// Foothill · La Loma 3 (William Turnbull Jr. & Associates, 1990–91), part of the Foothill hillside village of linked, shingled residence
// halls. Massing from the 2021 LiDAR; Bay Region shingle style per lib/rn-a-foothill.js (refine-north: shingle + board, grouped windows, cross-gables, entries).
import { faBuild, faGableBay, faBoxBay } from './lib/rn-a-foothill.js';

export const info = {
  id: 'foothill-la-loma-3',
  name: 'Foothill · La Loma 3',
  subtitle: 'William Turnbull Jr. · 1991',
  blurb: 'Foothill’s shingled residence halls step up the hillside along Hearst Avenue and La Loma like a small village of linked houses, joined by bridges, stairs and courts; a Bay Region style design by William Turnbull Jr.',
  replaces: ['w/38939707', 'way/38939707'],
};

export async function build(ctx) {
  const blocks = [
    { u0: -3.0, u1: 7.0, v0: -19.0, v1: -3.0, g: 1.5, eave: 11.5, ridge: 14.5, axis: 'v' },
    { u0: -3.0, u1: 7.0, v0: -3.0, v1: 19.0, g: 1.0, eave: 10.4, ridge: 13.0, axis: 'v', faces: { N: false } },
    { u0: -12.5, u1: -3.0, v0: 10.5, v1: 18.5, g: 0.0, eave: 9.8, ridge: 12.0, axis: 'u', faces: { E: false } },
    { u0: -13.0, u1: -3.0, v0: -17.0, v1: -11.0, g: 0.9, eave: 12.2, ridge: 14.6, axis: 'u', faces: { E: false } },
    { u0: 7.0, u1: 10.5, v0: 11.5, v1: 19.0, g: 3.2, eave: 10.0, ridge: 11.8, axis: 'v', roof: 'flat', faces: { W: false } },
  ];
  const { object3d, colliders, walkables } = faBuild(ctx, -9, blocks, (K, F) => {
    faGableBay(K, F, K.run([-12.5, 18.5], [-3.0, 18.5]), 4.8, 4.4, 0.0, 9.8, { d: 1.0 });
    faBoxBay(K, F, K.run([-3.0, -3.0], [-3.0, -19.0]), 8.0, 3.0, 1.5 + 3.95, 2);
  }, { entries: 2, twoAll: true, twoN: 2, ent: [{ block: 1, face: 'S', s: 5.0 }, { block: 0, face: 'N', s: 5.0 }] });
  object3d.name = 'foothill-la-loma-3';
  return { object3d, colliders, walkables };
}
