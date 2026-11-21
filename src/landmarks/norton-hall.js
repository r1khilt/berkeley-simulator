// Norton Hall — Residence Halls Unit 3, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'norton-hall',
  name: 'Norton Hall',
  subtitle: 'Residence Halls Unit 3',
  blurb: "One of the four high-rise towers of Residence Halls Unit 3 on Durant Avenue, the last of the Southside 'Units' of the 1960s; its residents eat at Cafe 3.",
  replaces: ['w/41746358'],
};

const P = { ...{"ang": -8.89, "u0": -20.68, "u1": 20.68, "v0": -6.56, "v1": 5.94, "roof": 31.4, "pent": {"u0": 3.82, "u1": 14.32, "v0": -4.56, "v1": 0.44, "top": 35.1}, "entrance": {"face": "S", "u": 8.06}, "style": "u3", "nb": 9, "floors": 9, "seed": "norton-hall", "endWinEdge": true}, tint: { span: 0xd9d5cc, wall: 0xcbc2b2, base: 0xb8afa0 } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'norton-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
