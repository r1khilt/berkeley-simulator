// Foothill La Loma 1 (William Turnbull Jr. & Associates, 1990–91): the U-shaped shingled block on La Loma Avenue at Hearst,
// with its tall corner tower. Massing from the 2021 LiDAR (frame -9°); Bay Region shingle style per lib/rn-a-foothill.js (refine-north: shingle, grouped windows, cross-gables, entries).
import { faBuild, faGableBay, faBoxBay } from './lib/rn-a-foothill.js';

export const info = {
  id: 'foothill-la-loma-1',
  name: 'Foothill · La Loma 1',
  subtitle: 'William Turnbull Jr. · 1991',
  blurb: 'Foothill’s shingled residence halls step up the hillside at Hearst and La Loma like a small village of linked houses, a Bay Region style design by William Turnbull Jr.',
  replaces: ['w/24024505', 'way/24024505'],
};

export async function build(ctx) {
  const blocks = [
    { u0: -17.0, u1: -5.0, v0: 13.5, v1: 22.6, g: 1.2, eave: 13.4, ridge: 16.1, axis: 'u', faces: { E: false } },
    { u0: -5.0, u1: 14.6, v0: 12.0, v1: 22.6, g: 3.2, eave: 16.2, ridge: 19.6, axis: 'u', faces: { W: false, E: false } },
    { u0: 14.6, u1: 26.5, v0: 10.3, v1: 23.9, g: 6.6, eave: 16.4, ridge: 19.4, axis: 'v' },
    { u0: -17.0, u1: 11.0, v0: -29.3, v1: -16.4, g: 3.3, eave: 16.0, ridge: 19.5, axis: 'u' },
    { u0: -22.4, u1: -13.0, v0: -25.5, v1: 13.6, g: 0.1, eave: 13.4, ridge: 16.0, axis: 'v', faces: {} },
    { u0: 16.8, u1: 25.0, v0: -11.6, v1: 10.3, g: 8.5, eave: 14.6, ridge: 18.7, axis: 'v', faces: { S: false } },
    { u0: -13.0, u1: -5.6, v0: -16.4, v1: -13.8, g: 2.5, eave: 13.8, ridge: 16.0, axis: 'u', roof: 'flat' },
  ];
  const { object3d, colliders, walkables } = faBuild(ctx, -9, blocks, (K, F) => {
    // court faces: cross-gabled bays
    faGableBay(K, F, K.run([-17.0, -16.4], [11.0, -16.4]), 14.0, 4.2, 3.3, 15.0, { d: 1.0 });
    faGableBay(K, F, K.run([14.6, 12.0], [-5.0, 12.0]), 9.8, 4.2, 3.2, 15.2, { d: 1.0 });
    // street (west) face on La Loma Avenue: two cross-gabled bays and a two-storey box bay between them
    const RW = K.run([-22.4, -25.5], [-22.4, 13.6]);
    faGableBay(K, F, RW, 7.5, 4.6, 0.2, 12.9, { d: 1.1 });
    faGableBay(K, F, RW, 31.5, 5.0, 0.2, 12.9, { d: 1.1 });
    faBoxBay(K, F, RW, 19.5, 3.4, 0.2 + 3.95, 2);
  }, { entries: 3, twoAll: true, twoN: 2 });
  object3d.name = 'foothill-la-loma-1';
  return { object3d, colliders, walkables };
}
