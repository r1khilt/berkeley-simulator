// Ehrman Hall — Residence Halls Unit 2, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'ehrman-hall',
  name: 'Ehrman Hall',
  subtitle: 'Residence Halls Unit 2',
  blurb: "One of the four original high-rise towers of Residence Halls Unit 2, the 1960s dormitory complex between Channing Way and Haste Street; like Unit 1 it groups its towers around a courtyard, and the towers later received exterior seismic bracing.",
  replaces: ['w/109192575'],
};

const P = { ...{"ang": 80.54, "u0": -17.18, "u1": 23.82, "v0": -4.83, "v1": 6.57, "roof": 32.3, "pent": {"u0": -11.93, "u1": 0.07, "v0": 0.12, "v1": 4.12, "top": 36.08}, "entrance": {"face": "N", "u": -3.37}, "style": "u12", "nb": 10, "floors": 8, "seed": "ehrman-hall", "ring": 33.5, "endWinEdge": false}, tint: { span: 0xd0d4bb, wall: 0xb9bea4, base: 0x7f866c, brace: 0xb46a42 } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'ehrman-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
