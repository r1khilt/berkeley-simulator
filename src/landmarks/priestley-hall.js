// Priestley Hall — Residence Halls Unit 3, UC Berkeley. Built with the shared b07 Units tower kit (lib/units-kit.js);
// footprint, roof deck, roof ring and penthouse fitted to the OSM outline and the 2021 LiDAR. Façade pattern and colours from photos.
import { tower } from './lib/units-kit.js';

export const info = {
  id: 'priestley-hall',
  name: 'Priestley Hall',
  subtitle: 'Residence Halls Unit 3',
  blurb: "One of the four high-rise towers of Residence Halls Unit 3 on Durant Avenue, the last of the Southside 'Units' of the 1960s; its residents eat at Cafe 3.",
  replaces: ['w/41746395'],
};

const P = { ...{"ang": -8.578, "u0": -18.9, "u1": 18.92, "v0": -5.78, "v1": 6.72, "roof": 31.5, "pent": {"u0": -14.9, "u1": -4.4, "v0": -0.28, "v1": 4.72, "top": 35.1}, "entrance": {"face": "N", "u": -11.24}, "style": "u3", "nb": 9, "floors": 9, "seed": "priestley-hall", "endWinEdge": false}, tint: { span: 0xdcc7b9, wall: 0xcfb9aa, base: 0xb9a99c } };

export async function build(ctx) {
  const r = tower(ctx, P);
  r.object3d.name = 'priestley-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
