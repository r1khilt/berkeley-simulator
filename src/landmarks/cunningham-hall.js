// Cunningham Hall — Residence Halls Unit 2, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'cunningham-hall',
  name: 'Cunningham Hall',
  subtitle: 'Residence Halls Unit 2',
  blurb: "One of the four original high-rise towers of Residence Halls Unit 2, the 1960s dormitory complex between Channing Way and Haste Street; like Unit 1 it groups its towers around a courtyard, and the towers later received exterior seismic bracing.",
  replaces: ['w/109192581'],
};

const P = { ...{"ang": -10.123, "u0": -20.47, "u1": 21.03, "v0": -5.94, "v1": 5.46, "roof": 32.0, "pent": {"u0": 3.78, "u1": 14.78, "v0": -4.49, "v1": 0.51, "top": 35.8}, "entrance": {"face": "S", "u": 7.34}, "style": "u12", "nb": 10, "floors": 8, "seed": "cunningham-hall", "ring": 33.2, "endWinEdge": true}, tint: { span: 0xd9d3a4, wall: 0xc3bf8e, base: 0x8e946a, brace: 0xb46a42 } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'cunningham-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
