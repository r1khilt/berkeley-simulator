// Spens-Black Hall — Residence Halls Unit 3, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'spens-black-hall',
  name: 'Spens-Black Hall',
  subtitle: 'Residence Halls Unit 3',
  blurb: "One of the four high-rise towers of Residence Halls Unit 3 on Durant Avenue, the last of the Southside 'Units' of the 1960s; its residents eat at Cafe 3.",
  replaces: ['w/41746363'],
};

const P = { ...{"ang": -9.163, "u0": -19.25, "u1": 19.75, "v0": -7.0, "v1": 5.5, "roof": 29.8, "pent": {"u0": -13.5, "u1": -3.0, "v0": -5.0, "v1": 0.0, "top": 33.6}, "entrance": {"face": "S", "u": -9.46}, "style": "u3", "nb": 9, "floors": 9, "seed": "spens-black-hall", "endWinEdge": false}, tint: { span: 0xd9d5cc, wall: 0xcbc2b2, base: 0xb8afa0 } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'spens-black-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
