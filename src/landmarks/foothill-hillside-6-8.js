// Foothill Hillside 6–8 (William Turnbull Jr. & Associates, 1990–91), part of the Foothill hillside village of linked, shingled residence
// halls. Massing from the 2021 LiDAR; Bay Region shingle style per the shared Foothill kit (lib/b08c-foothill.js).
// The long snake follows the contour in three straight runs (frames 24°, 46° and 75°), merged per material.
import { foothillBuild, fhBalconyBay, fhBoxBay, combine } from './lib/b08c-foothill.js';
import { rmats } from './lib/reastb-kit.js';

export const info = {
  id: 'foothill-hillside-6-8',
  name: 'Foothill · Hillside 6–8',
  subtitle: 'William Turnbull Jr. · 1991',
  blurb: 'Foothill’s shingled residence halls step up the hillside along Hearst Avenue and La Loma like a small village of linked houses, joined by bridges, stairs and courts; a Bay Region style design by William Turnbull Jr.',
  replaces: ['w/473599691', 'way/473599691'],
};

export async function build(ctx) {
  const RM = rmats(ctx.M); const look = { mats: { cedar: RM.fhCedar, roof: RM.fhRoof, fret: RM.fhFret }, stagger: 1.4, rise: 1.6, bay: 4.4 }; // refine-east-b look
  const a = foothillBuild(ctx, 24, [
    { u0: -91.5, u1: -26.5, v0: -24.0, v1: -12.0, g: 0.1, eave: 14.0, ridge: 18.2, axis: 'u' },
  ], (K, F) => { fhBalconyBay(K, F, K.run([-91.5, -12.0], [-26.5, -12.0]), 20.0, 4.6, 0.6, 14.0, { d: 1.8 }); fhBoxBay(K, F, K.run([-91.5, -12.0], [-26.5, -12.0]), 44.0, 3.4, 0.6 + 3.85, 2); }, look);
  const b = foothillBuild(ctx, 46, [
    { u0: -26.5, u1: 8.0, v0: -14.0, v1: -4.5, g: 2.4, eave: 16.6, ridge: 20.0, axis: 'u' },
    { u0: 8.0, u1: 38.0, v0: -14.0, v1: -4.5, g: 2.0, eave: 14.0, ridge: 17.0, axis: 'u' },
  ], (K, F) => { fhBalconyBay(K, F, K.run([-26.5, -4.5], [38.0, -4.5]), 33.0, 4.6, 2.2, 15.0, { d: 1.8 }); }, look);
  const c = foothillBuild(ctx, 75, [
    { u0: 29.0, u1: 59.5, v0: -31.0, v1: -24.0, g: 2.3, eave: 13.8, ridge: 16.7, axis: 'u' },
    { u0: 59.5, u1: 87.5, v0: -37.0, v1: -24.0, g: 2.3, eave: 13.4, ridge: 16.8, axis: 'u' },
    { u0: 87.5, u1: 92.0, v0: -37.0, v1: -24.0, g: 2.3, eave: 10.0, ridge: 12.4, axis: 'v', roof: 'flat' },
  ], (K, F) => { fhBoxBay(K, F, K.run([29.0, -24.0], [87.5, -24.0]), 18.0, 3.4, 2.3 + 3.85, 2); fhBalconyBay(K, F, K.run([29.0, -24.0], [87.5, -24.0]), 42.0, 4.6, 2.3, 13.4, { d: 1.8 }); }, look);
  const object3d = combine([a.object3d, b.object3d, c.object3d]);
  object3d.name = 'foothill-hillside-6-8';
  return { object3d, colliders: [...a.colliders, ...b.colliders, ...c.colliders], walkables: [] };
}
