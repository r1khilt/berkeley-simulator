// Foothill · Hillside 4 (William Turnbull Jr. & Associates, 1990–91), part of the Foothill hillside village of linked, shingled residence
// halls. Massing from the 2021 LiDAR; Bay Region shingle style per lib/rn-a-foothill.js (refine-north: shingle + board, grouped windows, cross-gables, entries).
import { faBuild, faGableBay, faBoxBay } from './lib/rn-a-foothill.js';

export const info = {
  id: 'foothill-hillside-4',
  name: 'Foothill · Hillside 4',
  subtitle: 'William Turnbull Jr. · 1991',
  blurb: 'Foothill’s shingled residence halls step up the hillside along Hearst Avenue and La Loma like a small village of linked houses, joined by bridges, stairs and courts; a Bay Region style design by William Turnbull Jr.',
  replaces: ['w/24907719', 'way/24907719'],
};

export async function build(ctx) {
  const blocks = [
    { u0: -22.5, u1: -10.5, v0: -14.0, v1: 0.0, g: 1.7, eave: 13.2, ridge: 16.6, axis: 'u' },
    { u0: -10.5, u1: 15.5, v0: -14.0, v1: 0.0, g: 2.7, eave: 14.8, ridge: 18.6, axis: 'u' },
    { u0: 15.5, u1: 37.0, v0: -14.0, v1: 0.0, g: 5.7, eave: 16.0, ridge: 19.5, axis: 'u' },
    { u0: -19.0, u1: -6.0, v0: 0.0, v1: 12.0, g: 2.8, eave: 12.6, ridge: 15.0, axis: 'v', faces: { N: false } },
    { u0: -19.0, u1: -6.0, v0: 12.0, v1: 28.0, g: 0.5, eave: 10.4, ridge: 13.0, axis: 'v', faces: { N: false } },
    { u0: -6.0, u1: 6.5, v0: 0.0, v1: 4.5, g: 3.9, eave: 13.6, ridge: 15.1, axis: 'u', roof: 'flat', faces: { N: false } },
    { u0: -22.0, u1: -6.0, v0: -17.5, v1: -14.0, g: 0.9, eave: 12.3, ridge: 13.2, axis: 'u', roof: 'flat', faces: { S: false } },
    { u0: -22.5, u1: -19.0, v0: 0.0, v1: 13.5, g: 2.5, eave: 12.1, ridge: 12.9, axis: 'v', roof: 'flat', faces: { E: false } },
  ];
  const { object3d, colliders, walkables } = faBuild(ctx, -10, blocks, (K, F) => {
    faGableBay(K, F, K.run([-19.0, 28.0], [-6.0, 28.0]), 6.5, 4.6, 0.5, 10.4, { d: 1.0 });
    faGableBay(K, F, K.run([37.0, -14.0], [-22.5, -14.0]), 14.0, 4.6, 5.7, 16.0, { d: 1.0 });
    faBoxBay(K, F, K.run([37.0, -14.0], [-22.5, -14.0]), 30.0, 3.0, 2.7 + 3.95, 2);
    faBoxBay(K, F, K.run([-6.0, 4.5], [6.5, 4.5]), 6.2, 3.0, 3.9 + 3.95, 2);
  }, { entries: 2 });
  object3d.name = 'foothill-hillside-4';
  return { object3d, colliders, walkables };
}
