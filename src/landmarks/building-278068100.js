// ΔΣ, 2311 Prospect Street (OSM: 5 levels). Tall Spanish Colonial Revival house on the steep hillside: cream stucco, a red-tile
// hipped main roof (LiDAR ridge ~21.8 m), a lower flat-roofed section with a parapet-edged roof terrace (~13 m) and a
// low west wing; deep recessed entry under a segmental arch on scalloped corbels.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'building-278068100',
  name: "Delta Sigma",
  subtitle: "ΔΣ · 2311 Prospect Street",
  blurb: "Chapter house on Prospect Street, a tall cream stucco Spanish Colonial building on the hillside with tile roofs and a rooftop terrace.",
  replaces: ['w/278068100'],
};

export async function build(ctx) {
  const r = rseHouse(ctx, {
    ang: -8.425, front: { block: 0, face: 'W', above: 0.6 }, storeyH: 3.1, ov: 0.6,
    wall: ['stucco', '#ede6d6'], trim: ['paint', '#2b2b2b'], frame: ['paint', '#2b2b2b'], roof: ['tile', '#c0603f'], base: ['stucco', '#d6cdb9'], door: ['wood', '#5a2e1e'],
    win: { w: 0.85, h: 1.45, bay: 2.6, sill: 0.9, tran: 0.6, casing: 0 }, belt: false, frieze: false,
    blocks: [
      { u0: -10.16, u1: 11.47, v0: -15.2, v1: -1.0, eave: 16.6, floor: 1.4, roof: { type: 'hip', ridge: 21.8 } },
      { u0: -10.16, u1: 3.2, v0: -1.0, v1: 14.19, eave: 17.0, floor: 1.4, roof: { type: 'hip', ridge: 20.4 } },
      { u0: 3.2, u1: 11.47, v0: 5.8, v1: 14.19, eave: 18.2, floor: 1.4, roof: { type: 'hip', ridge: 19.8 } },
      { u0: 3.2, u1: 11.47, v0: -1.0, v1: 5.8, eave: 12.4, floor: 1.4, roof: { type: 'flat', parapet: 0.9 } },
      { u0: -13.27, u1: -10.16, v0: -2.15, v1: 13.39, eave: 7.5, floor: 1.0, storeys: 2, roof: { type: 'flat', parapet: 0.5 } },
    ],
    doors: [{ block: 4, face: 'W', s: 8.0, w: 1.6, h: 2.4, arch: 'seg' }],
    letters: [{ block: 4, face: 'W', s: 8.0, y: 4.3, h: 0.45, text: 'ΔΣ', mat: ['paint', '#1a1a1a'] }],
  }, { number: '2311' });
  r.object3d.name = 'building-278068100';
  return r;
}
