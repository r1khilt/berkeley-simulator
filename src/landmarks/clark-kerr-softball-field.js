// Golden Bear Recreation Center softball field on the Clark Kerr Campus: a grass softball diamond with a skinned
// infield, chain-link backstop, low outfield fence and player benches, set among the tall trees at the south end of the
// campus. Built from the OSM outline (the field is hidden under the canopy in the aerial imagery, so home plate is
// placed in the corner nearest the campus roads).
import { osmVenue } from './lib/fields-osm.js';

export const info = {
  id: 'clark-kerr-softball-field',
  name: 'Golden Bear Rec Center Softball Field',
  subtitle: 'Softball diamond · Clark Kerr Campus',
  blurb: 'A recreational softball field on the Clark Kerr Campus, part of the Golden Bear Recreation Center run by Cal Recreational Sports.',
  replaces: ['w/69020910'],
};

export async function build(ctx) {
  const fp = ctx.footprints[0].outer; let best = fp[0], bs = -1e9;
  for (const [x, z] of fp) { const sc = x * 0.35 + z; if (sc > bs) { bs = sc; best = [x, z]; } } // south(-east) corner
  let cx = 0, cz = 0; for (const [x, z] of fp) { cx += x / fp.length; cz += z / fp.length; }
  const d = Math.hypot(cx - best[0], cz - best[1]); const home = [best[0] + (cx - best[0]) / d * 5, best[1] + (cz - best[1]) / d * 5];
  const r = osmVenue(ctx, [{ osm: 'w/69020910', kind: 'diamond', softball: true, home, fenceH: 1.8, backstop: 5, seed: 53 }]);
  const I = r.items['w/69020910']; const [hx, hz] = I.K.xz(I.home[0], I.home[1]);
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables, interactions: [{ id: 'ck-softball-home', pos: [hx, I.level + 1, hz], radius: 4, label: 'Home plate, Clark Kerr softball field' }] };
}
