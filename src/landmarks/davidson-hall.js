// Davidson Hall — Residence Halls Unit 2, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'davidson-hall',
  name: 'Davidson Hall',
  subtitle: 'Residence Halls Unit 2',
  blurb: "One of the four original high-rise towers of Residence Halls Unit 2, the 1960s dormitory complex between Channing Way and Haste Street; like Unit 1 it groups its towers around a courtyard, and the towers later received exterior seismic bracing.",
  replaces: ['w/109192576'],
};

// r4-sweep-outer2: tints follow the value ladder (light pier frame, recessed spandrels ~10% darker, braces darker or rust)
// with colour-blocked end walls, from the 2022 Sather Tower photo of Units 1/2.
const P = { ...{"ang": 80.711, "u0": -21.4, "u1": 20.1, "v0": -6.4, "v1": 5.0, "roof": 29.8, "pent": {"u0": 2.85, "u1": 13.85, "v0": -4.95, "v1": 0.05, "top": 33.6}, "entrance": {"face": "S", "u": 7.44}, "style": "u12", "nb": 10, "floors": 8, "seed": "davidson-hall", "ring": 31.0, "endWinEdge": true}, tint: { span: 0xb59c72, wall: 0xcbb084, base: 0x8a7a62, brace: 0xa86c45, end: 0xdad0b0 } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'davidson-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
