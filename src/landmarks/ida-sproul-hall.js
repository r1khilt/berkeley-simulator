// Ida Sproul Hall — Residence Halls Unit 3, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'ida-sproul-hall',
  name: 'Ida Sproul Hall',
  subtitle: 'Residence Halls Unit 3',
  blurb: "One of the four high-rise towers of Residence Halls Unit 3 on Durant Avenue, the last of the Southside 'Units' of the 1960s; its residents eat at Cafe 3.",
  replaces: ['w/41746383'],
};

const P = { ...{"ang": 81.242, "u0": -20.36, "u1": 18.64, "v0": -6.53, "v1": 6.47, "roof": 31.9, "pent": {"u0": -14.61, "u1": -4.16, "v0": -0.53, "v1": 4.97, "top": 35.7}, "entrance": {"face": "N", "u": -11.7}, "style": "u3", "nb": 9, "floors": 9, "seed": "ida-sproul-hall", "endWinEdge": false}, tint: { span: 0xe5ddcc, wall: 0xd6cdbb, base: 0xbdb4a4 } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'ida-sproul-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
