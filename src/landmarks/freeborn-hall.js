// Freeborn Hall — Residence Halls Unit 1, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'freeborn-hall',
  name: 'Freeborn Hall',
  subtitle: 'Residence Halls Unit 1',
  blurb: "One of the four original high-rise towers of Residence Halls Unit 1, the 1960s dormitory complex on the block between Durant Avenue and Channing Way, grouped around a courtyard with a central dining commons.",
  replaces: ['w/40413745'],
};

// r4-sweep-outer2: tints follow the value ladder (light pier frame, recessed spandrels ~10% darker, braces darker or rust)
// with colour-blocked end walls, from the 2022 Sather Tower photo of Units 1/2.
const P = { ...{"ang": 80.401, "u0": -20.63, "u1": 20.63, "v0": -6.71, "v1": 5.19, "roof": 30.1, "pent": {"u0": 3.07, "u1": 14.37, "v0": -4.76, "v1": 0.04, "top": 33.9}, "entrance": {"face": "S", "u": 8.26}, "style": "u12", "nb": 10, "floors": 8, "seed": "freeborn-hall", "ring": 31.3, "endWinEdge": true}, tint: { span: 0xa9b0b3, wall: 0xbcc3c6, base: 0x8a8c8a, brace: 0xa2acb0, end: 0xc8cbcb } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'freeborn-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
