// Legends Aquatic Center: Berkeley High School's outdoor 50-metre pool on the Milvia Street side of the campus, used by
// the school teams and the city. Pool basin from the OSM outline with lane stripes and ropes, starting blocks, a
// diving board, lifeguard chairs, a broom-finished concrete deck over the facility outline and a perimeter fence.
import * as THREE from 'three';
import { osmVenue } from './lib/fields-osm.js';
import { sportsMats, fieldsMats } from './lib/fields-kit.js';

export const info = {
  id: 'legends-aquatic-center',
  name: 'Legends Aquatic Center',
  subtitle: 'Berkeley High School pool',
  blurb: 'An outdoor 50-metre pool at Berkeley High School, shared by the school\'s swim and water polo teams and the community.',
  replaces: ['w/545790158', 'w/545790159'],
};

export async function build(ctx) {
  const S = sportsMats(ctx.M); const F = fieldsMats(ctx.M);
  const r = osmVenue(ctx, [
    { osm: 'w/545790159', kind: 'deck', perimeter: { h: 2.4, m: -0.6, wind: true, windH: 2.0, gaps: [1] } },
    { osm: 'w/545790158', kind: 'pool', lanes: 8, deck: 2.0, guards: true },
  ], { before: (res) => { // 1 m springboard at the deep end
    const I = res.items['w/545790158']; const K = I.K; const y = I.yd; const u = I.cu + I.L / 2 + 0.6, v = I.cv - 5;
    K.box(F.concLight, u, y, v - 0.5, u + 2.0, y + 0.9, v + 0.5); const g = new THREE.BoxGeometry(4.8, 0.08, 0.5); g.translate(u - 1.6, y + 1.0, v); K.add(F.trimWhite, g); } });
  const I = r.items['w/545790158']; const K = I.K; const y = I.yd; const object3d = r.object3d;
  const [x, z] = K.xz(I.cu, I.cv);
  return { object3d, colliders: r.colliders, walkables: r.walkables, interactions: [{ id: 'legends-pool', pos: [x, y + 1, z], radius: 8, label: 'Legends Aquatic Center pool' }] };
}
