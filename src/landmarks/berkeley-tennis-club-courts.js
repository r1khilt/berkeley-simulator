// Berkeley Tennis Club: the northern courts of the club on Tunnel Road, at the edge of the game area (the clubhouse and
// the rest of its courts lie further south). Two fenced pairs of hard courts in the OSM positions, green with a
// terracotta surround, 3.6 m galvanised fences with dark green windscreens, dark green net posts.
import { osmVenue } from './lib/fields-osm.js';

export const info = {
  id: 'berkeley-tennis-club-courts',
  name: 'Berkeley Tennis Club',
  subtitle: 'Tennis courts · Tunnel Road',
  blurb: 'Courts of the Berkeley Tennis Club, a private club on Tunnel Road near the Claremont that dates back to 1906.',
  replaces: ['w/280307531', 'w/1106801987', 'w/1106800113', 'w/1106800114'],
};

export async function build(ctx) {
  const r = osmVenue(ctx, [
    { osm: 'w/280307531', kind: 'tennis', group: 'A', inCol: '#3c6a4a', outCol: '#8b4b3b' }, { osm: 'w/1106801987', kind: 'tennis', group: 'A' },
    { osm: 'w/1106800113', kind: 'tennis', group: 'B', inCol: '#3c6a4a', outCol: '#8b4b3b' }, { osm: 'w/1106800114', kind: 'tennis', group: 'B' },
  ]);
  const I = r.items['w/280307531']; const [x, z] = I.K.xz(I.cu, I.cv);
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables, interactions: [{ id: 'btc-courts', pos: [x, I.level + 1, z], radius: 6, label: 'Berkeley Tennis Club courts' }] };
}
