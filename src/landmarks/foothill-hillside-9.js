// Foothill · Hillside 9 (William Turnbull Jr. & Associates, 1990–91), part of the Foothill hillside village of linked, shingled residence
// halls. Massing from the 2021 LiDAR; Bay Region shingle style per the shared Foothill kit (lib/b08c-foothill.js).
import { foothillBuild, fhBalconyBay, fhBoxBay } from './lib/b08c-foothill.js';
import { rmats } from './lib/reastb-kit.js';

export const info = {
  id: 'foothill-hillside-9',
  name: 'Foothill · Hillside 9',
  subtitle: 'William Turnbull Jr. · 1991',
  blurb: 'Foothill’s shingled residence halls step up the hillside along Hearst Avenue and La Loma like a small village of linked houses, joined by bridges, stairs and courts; a Bay Region style design by William Turnbull Jr.',
  replaces: ['w/473599692', 'way/473599692'],
};

export async function build(ctx) {
  const RM = rmats(ctx.M); const look = { mats: { cedar: RM.fhCedar, roof: RM.fhRoof, fret: RM.fhFret }, stagger: 1.4, rise: 1.6, bay: 4.4 }; // refine-east-b look
  const blocks = [
    { u0: -11.5, u1: 11.5, v0: -6.5, v1: 6.5, g: 0.1, eave: 9.6, ridge: 12.8, axis: 'u', split: false },
  ];
  const { object3d, colliders } = foothillBuild(ctx, 46, blocks, (K, F) => {
    fhBalconyBay(K, F, K.run([-11.5, 6.5], [11.5, 6.5]), 6.0, 4.2, 0.1, 9.6, { d: 1.7 });
    fhBoxBay(K, F, K.run([-11.5, 6.5], [11.5, 6.5]), 16.5, 3.2, 0.1 + 3.85, 2);
  }, look);
  object3d.name = 'foothill-hillside-9';
  return { object3d, colliders, walkables: [] };
}
