// Berkeley High School athletic fields (Milvia Street at Derby): Jacket Stadium's synthetic-turf gridiron with the
// all-weather track around it, the gold-and-black Yellowjackets midfield mark, red and gold multi-sport lines,
// home bleachers with a press box, light poles, the two outdoor basketball courts and the grass softball diamond.
import { osmVenue } from './lib/fields-osm.js';
import { pen, text, arc, fillPoly } from './lib/fields-kit.js';
import { fitRect } from './lib/b11-sports.js';

export const info = {
  id: 'berkeley-high-athletic-fields',
  name: 'Jacket Stadium',
  subtitle: 'Berkeley High School · football, soccer, lacrosse and track',
  blurb: 'The stadium of the Berkeley High Yellowjackets: a synthetic-turf field inside a running track, used for football, soccer and lacrosse, beside the school\'s softball diamond and outdoor courts.',
  replaces: ['w/545787104', 'w/128461076', 'w/1547127367', 'w/1460857323', 'w/314739300'],
};

export async function build(ctx) {
  const turf = ctx.footprints.find((f) => f.osm === 'w/128461076'); const fr = fitRect(turf.outer);
  const mid = (P) => { const c = P.c; c.save(); c.fillStyle = '#f5b21b'; c.beginPath(); c.arc(P.X(0), P.Y(0), 4.6 * P.s, 0, 7); c.fill(); c.lineWidth = 0.35 * P.s; c.strokeStyle = '#111111'; c.stroke(); c.restore(); text(P, 'B', 0, 0, 5.2, { col: '#c8102e', stroke: '#111111', sw: 0.25 }); };
  const r = osmVenue(ctx, [
    { osm: 'w/545787104', kind: 'track', lanes: 6, laneW: 1.22, center: [fr.cx, fr.cz], col: '#b1503d', infieldTurf: true, railGaps: [3, 24],
      bleachers: [{ side: -1, u0: -32, u1: 32, rows: 10, gap: 1.0, pressBox: true }], lights: { n: 4, h: 22, m: 6, nx: 3, ny: 2 } },
    { osm: 'w/128461076', kind: 'football', soccer: '#f2c230', ez: '#1a1a1a', ezText: 'JACKETS', ezTextCol: '#f5b21b', mid, off: 0.09, skirt: false },
    { osm: 'w/1547127367', kind: 'basketball', key: '#9e2a2a', seed: 21 },
    { osm: 'w/1460857323', kind: 'basketball', key: '#9e2a2a', seed: 22 },
    { osm: 'w/314739300', kind: 'diamond', softball: true, home: [89.5, 68.5], fenceH: 2.0, backstop: 6, seed: 37 },
  ]);
  // the stadium bleachers sit on the west side of the track (toward Milvia Street) in the stadium frame; flip if needed
  const T = r.items['w/545787104']; const [x, z] = T.K.xz(T.track.tu, T.track.tv);
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables, interactions: [{ id: 'bhs-midfield', pos: [x, T.level + 1, z], radius: 8, label: 'Midfield, Jacket Stadium' }] };
}
