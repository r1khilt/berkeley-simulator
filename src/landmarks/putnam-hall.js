// Putnam Hall — Residence Halls Unit 1, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'putnam-hall',
  name: 'Putnam Hall',
  subtitle: 'Residence Halls Unit 1',
  blurb: "One of the four original high-rise towers of Residence Halls Unit 1, the 1960s dormitory complex on the block between Durant Avenue and Channing Way, grouped around a courtyard with a central dining commons.",
  replaces: ['w/40413752'],
};

const P = { ...{"ang": -9.233, "u0": -19.04, "u1": 22.46, "v0": -5.62, "v1": 5.78, "roof": 31.3, "pent": {"u0": -12.79, "u1": -1.29, "v0": -0.67, "v1": 4.33, "top": 35.1}, "entrance": {"face": "N", "u": -7.05}, "style": "u12", "nb": 10, "floors": 8, "seed": "putnam-hall", "ring": 32.5, "endWinEdge": false}, tint: { span: 0xd6d4cb, wall: 0xc0beb5, base: 0x7f817c, brace: 0xd6d4cb } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'putnam-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
