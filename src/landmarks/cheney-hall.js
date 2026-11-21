// Cheney Hall — Residence Halls Unit 1, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'cheney-hall',
  name: 'Cheney Hall',
  subtitle: 'Residence Halls Unit 1',
  blurb: "One of the four original high-rise towers of Residence Halls Unit 1, the 1960s dormitory complex on the block between Durant Avenue and Channing Way, grouped around a courtyard with a central dining commons.",
  replaces: ['w/40413757'],
};

const P = { ...{"ang": -9.192, "u0": -19.33, "u1": 21.67, "v0": -5.28, "v1": 6.12, "roof": 32.9, "pent": {"u0": 4.92, "u1": 15.92, "v0": -4.33, "v1": 1.17, "top": 36.6}, "entrance": {"face": "S", "u": 10.08}, "style": "u12", "nb": 10, "floors": 8, "seed": "cheney-hall", "ring": 34.1, "endWinEdge": true}, tint: { span: 0xdcdcd8, wall: 0xc8c9c6, base: 0x8c8c88, brace: 0xdcdcd8 } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'cheney-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
