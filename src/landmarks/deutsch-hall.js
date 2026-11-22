// Deutsch Hall — Residence Halls Unit 1, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'deutsch-hall',
  name: 'Deutsch Hall',
  subtitle: 'Residence Halls Unit 1',
  blurb: "One of the four original high-rise towers of Residence Halls Unit 1, the 1960s dormitory complex on the block between Durant Avenue and Channing Way, grouped around a courtyard with a central dining commons.",
  replaces: ['w/41746106'],
};

// r4-sweep-outer2: tints follow the value ladder (light pier frame, recessed spandrels ~10% darker, braces darker or rust)
// with colour-blocked end walls, from the 2022 Sather Tower photo of Units 1/2.
const P = { ...{"ang": 80.544, "u0": -19.48, "u1": 21.52, "v0": -6.29, "v1": 5.11, "roof": 32.4, "pent": {"u0": -13.73, "u1": -2.73, "v0": -1.34, "v1": 4.16, "top": 36.1}, "entrance": {"face": "N", "u": -8.13}, "style": "u12", "nb": 10, "floors": 8, "seed": "deutsch-hall", "ring": 33.6, "endWinEdge": false}, tint: { span: 0x98a2a8, wall: 0xa9b3b9, base: 0x878b8e, brace: 0x84909a, end: 0xc9cccb } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'deutsch-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
