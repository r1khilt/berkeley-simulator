// Willard Park (Hardy Park) and the Willard Middle School courts: the park's dirt-and-grass ball field with a chain-link
// backstop, two fenced public tennis courts, the children's playground, and the school's two outdoor basketball courts
// across the block, all from the OSM outlines.
import { osmVenue } from './lib/fields-osm.js';

export const info = {
  id: 'willard-park-fields',
  name: 'Willard Park',
  subtitle: 'Ball field, tennis courts and playground · Derby Street',
  blurb: 'A neighbourhood park south of campus between Derby Street and Regent Street, with a ball field, public tennis courts and a playground next to Willard Middle School.',
  replaces: ['w/31776917', 'w/31776896', 'w/819914670', 'w/1087382564', 'w/120344993', 'w/120344994'],
};

export async function build(ctx) {
  const r = osmVenue(ctx, [
    { osm: 'w/31776917', kind: 'diamond', softball: true, home: [-42.5, 13.5], fence: false, backstop: 6, seed: 71 },
    { osm: 'w/31776896', kind: 'tennis', inCol: '#2f5f8e', outCol: '#3f7a54' },
    { osm: 'w/819914670', kind: 'tennis', inCol: '#2f5f8e', outCol: '#3f7a54' },
    { osm: 'w/1087382564', kind: 'playground', rubber: '#4a7d9a', rubber2: '#6b9a4f', structures: 2, fence: true },
    { osm: 'w/120344993', kind: 'basketball', seed: 13 },
    { osm: 'w/120344994', kind: 'basketball', seed: 14 },
  ]);
  const I = r.items['w/31776917']; const [hx, hz] = I.K.xz(I.home[0], I.home[1]);
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables, interactions: [{ id: 'willard-field', pos: [hx, I.level + 1, hz], radius: 5, label: 'Willard Park ball field' }] };
}
