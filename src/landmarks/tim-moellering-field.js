// Tim Moellering Field: Berkeley High School's baseball diamond at Derby Street and Martin Luther King Jr. Way, with the
// neighbouring grass soccer field and an outdoor basketball court in the same city sports block. Built from the OSM
// outlines: grass outfield and skinned infield (home plate in the south-east corner, where the 2021 aerial shows the
// dirt), tall chain-link backstop, outfield fence with green windscreen, player benches and foul poles.
import { osmVenue } from './lib/fields-osm.js';
import { sportsMats } from './lib/fields-kit.js';

export const info = {
  id: 'tim-moellering-field',
  name: 'Tim Moellering Field',
  subtitle: 'Berkeley High baseball · Derby Street',
  blurb: 'The home diamond of Berkeley High School baseball, beside a grass soccer field and an outdoor basketball court on Derby Street in south-west Berkeley.',
  replaces: ['w/314041320', 'w/314041321', 'w/314041322'],
};

export async function build(ctx) {
  const S = sportsMats(ctx.M);
  const r = osmVenue(ctx, [
    { osm: 'w/314041321', kind: 'soccer', margin: 3, seed: 61 },
    { osm: 'w/314041322', kind: 'basketball', key: '#8e3a2e' },
    { osm: 'w/314041320', kind: 'diamond', softball: false, home: [69.5, 17.5], homeDir: null, fenceH: 2.6, wind: S.windGreen, backstop: 7, dugoutRoof: true, seed: 47 },
  ]);
  const I = r.items['w/314041320']; const [hx, hz] = I.K.xz(I.home[0], I.home[1]);
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables, interactions: [{ id: 'tmf-home', pos: [hx, I.level + 1, hz], radius: 4, label: 'Home plate, Tim Moellering Field' }] };
}
