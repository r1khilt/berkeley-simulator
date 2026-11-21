// Berkeley Arts Magnet School yard (Virginia Street at Martin Luther King Jr. Way): the painted running loop on the
// asphalt yard with a kickball diamond and a small turf field inside it, a basketball court, funnel-ball circles and a
// mini soccer pitch on the west yard, and two play structures, all from the OSM outlines.
import { osmVenue, paintAsphalt } from './lib/fields-osm.js';
import { pen, arc, rect, ln, dot } from './lib/fields-kit.js';

export const info = {
  id: 'berkeley-arts-magnet-schoolyard',
  name: 'Berkeley Arts Magnet School yard',
  subtitle: 'School yard and running loop · Virginia Street',
  blurb: 'The play yard of Berkeley Arts Magnet, a public elementary school west of campus, with a painted running loop, kickball diamond, courts and play structures.',
  replaces: ['w/560275208', 'w/560275207', 'w/560275224', 'w/560275227', 'w/560275220', 'w/560275206', 'w/560275204', 'w/311856618', 'w/1068363178'],
};

export async function build(ctx) {
  const funnel = (P) => { pen(P, '#f2d23a', 0.08); arc(P, 0, 0, 2.4); arc(P, 0, 0, 0.6); dot(P, 0, 0, 0.12); };
  const mini = (P, I) => { pen(P, '#f1f1ea', 0.08); rect(P, -I.L / 2 + 0.5, -I.W / 2 + 0.5, I.L / 2 - 0.5, I.W / 2 - 0.5); ln(P, 0, -I.W / 2 + 0.5, 0, I.W / 2 - 0.5); arc(P, 0, 0, 1.5); };
  const r = osmVenue(ctx, [
    { osm: 'w/560275208', kind: 'atrack', lanes: 3 },
    { osm: 'w/560275207', kind: 'kickball', off: 0.1, skirt: false },
    { osm: 'w/560275227', kind: 'turf', off: 0.12, skirt: false },
    { osm: 'w/560275224', kind: 'basketball', key: '#7d3b32' },
    { osm: 'w/560275220', kind: 'asphalt', paint: mini },
    { osm: 'w/560275206', kind: 'asphalt', col: '#9d9b95', paint: funnel, skirt: false },
    { osm: 'w/560275204', kind: 'asphalt', col: '#9d9b95', paint: funnel, skirt: false },
    { osm: 'w/311856618', kind: 'playground', rubber: '#3f6f8a', rubber2: '#c0703f', structures: 2 },
    { osm: 'w/1068363178', kind: 'playground', structures: 1, swings: false },
  ]);
  const I = r.items['w/560275208']; const [x, z] = I.K.xz(I.cu, I.cv);
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables, interactions: [{ id: 'bam-yard', pos: [x, I.level + 1, z], radius: 8, label: 'Berkeley Arts Magnet school yard' }] };
}
