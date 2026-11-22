// Griffiths Hall — Residence Halls Unit 2, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'griffiths-hall',
  name: 'Griffiths Hall',
  subtitle: 'Residence Halls Unit 2',
  blurb: "One of the four original high-rise towers of Residence Halls Unit 2, the 1960s dormitory complex between Channing Way and Haste Street; like Unit 1 it groups its towers around a courtyard, and the towers later received exterior seismic bracing.",
  replaces: ['w/109192574'],
};

// r4-sweep-outer2: tints follow the value ladder (light pier frame, recessed spandrels ~10% darker, braces darker or rust)
// with colour-blocked end walls, from the 2022 Sather Tower photo of Units 1/2.
const P = { ...{"ang": -9.201, "u0": -21.77, "u1": 19.73, "v0": -3.74, "v1": 7.66, "roof": 29.8, "pent": {"u0": -16.02, "u1": -4.02, "v0": 1.21, "v1": 4.71, "top": 33.5}, "entrance": {"face": "N", "u": -13.33}, "style": "u12", "nb": 10, "floors": 8, "seed": "griffiths-hall", "ring": 31.0, "endWinEdge": false}, tint: { span: 0xb79f76, wall: 0xcdb388, base: 0x8a7a62, brace: 0xa86c45, end: 0xa9b3a1 } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'griffiths-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
