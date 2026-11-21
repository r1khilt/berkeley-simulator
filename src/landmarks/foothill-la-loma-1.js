// Foothill La Loma 1 (William Turnbull Jr. & Associates, 1990–91): the U-shaped shingled block on La Loma Avenue at Hearst,
// with its tall corner tower. Massing from the 2021 LiDAR (frame -9°); Bay Region shingle style per the shared Foothill kit.
import { foothillBuild, fhBalconyBay, fhBoxBay } from './lib/b08c-foothill.js';

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
  const { object3d, colliders } = foothillBuild(ctx, -9, blocks, (K, F, wings, cols) => {
    // balcony bays on the courtyard faces
    const RN = K.run([11.0, -16.4], [-17.0, -16.4]); // north wing, south face (faces the court)
    fhBalconyBay(K, F, RN.constructor ? K.run([-17.0, -16.4], [11.0, -16.4]) : RN, 14.0, 2.8, 3.3, 16.0);
    fhBalconyBay(K, F, K.run([14.6, 12.0], [-5.0, 12.0]), 9.8, 2.8, 3.2, 16.2);
    // street (west) face on La Loma Avenue: balcony stack under a steep gable + two-storey box bays
    const RW = K.run([-22.4, -25.5], [-22.4, 13.6]);
    fhBalconyBay(K, F, RW, 35.5, 5.0, 0.2, 13.4, { d: 1.9 });
    fhBoxBay(K, F, RW, 9.0, 3.4, 0.4 + 3.85, 2);
    fhBoxBay(K, F, RW, 33.5, 3.4, 0.4 + 3.85, 2);
  });
  object3d.name = 'foothill-la-loma-1';
  return { object3d, colliders, walkables: [] };
}
