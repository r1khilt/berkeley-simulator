// Dwinelle Hall (Weihe, Frick & Kruse, 1952; named for John W. Dwinelle). The campus's famously confusing humanities
// building: cream stucco ranges of punched steel windows under red-tile hip roofs, wrapped around a courtyard, with a
// tall central wing (offices) and the long south range facing Dwinelle Plaza. Massing from LiDAR: ranges ~20-24 m,
// central wing east half ~24 m with a lower west half ~16 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
import { autoEntries, entry, baseShrubs, lampPost, rooftopUnit, downspout, bikeRack } from './lib/rc-finish.js';
export const info = {
  id: 'dwinelle-hall', name: 'Dwinelle Hall', subtitle: '1952 · Humanities',
  blurb: 'Named for John W. Dwinelle, author of the 1868 act that created the University of California, this sprawling building of split levels and odd corridors is legendary for getting students lost.',
  replaces: ['r/18934', 'relation/18934'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16.5)); const M = ctx.M;
  // refine-central: smooth off-white stucco (the textured cream stucco tinted again read as tan brick), muted tile, larger
  // multi-light steel sash, real entrances where the footpaths arrive, foundation planting, lamps and rooftop plant.
  const ST = tint(M.stuccoWhite, 0xfdf3e3), BASE = tint(M.concrete, 0xd2c8b8), FR = solid(0xe4e1da, 0.5, 0.1), SOF = tint(M.woodDark, 0x9a8064);
  const TILE = tint(M.redTile, 0xfaece4);
  const win = { w: 1.6, h: 2.3, sill: 0.85, mull: 1, muntins: 3 };
  const lv = (top, h = 4.2) => { const a = [1.5]; while (a[a.length - 1] + h < top - 0.4) a.push(a[a.length - 1] + h); a.push(top - 0.3); return a; };
  const P = (poly, top, slope = 0.42, extra = {}) => ({ poly, levels: lv(top), top, roof: 'hip', eave: top + 0.1, slope: slope * 0.8, ov: 0.75, roofMat: TILE, ...extra });
  const allRuns = [];
  const D = { mat: ST, baseMat: BASE, frame: FR, fl: 1.5, bay: 3.4, win, cornice: { P: 0.32, H: 0.4 }, soffit: SOF, beltAt: [1.5], extra: (runs) => allRuns.push(...runs) };
  const colliders = genParts(K, [
    P(rect(-41.1, -61.0, 24.1, -47.6), 21.6, 0.45),
    P(rect(-41.0, -47.6, -27.8, -4.0), 21.6, 0.45),
    P(rect(2.8, -47.6, 16.7, -17.7), 19.8, 0.42),
    P(rect(-41.0, -17.7, 15.5, -4.5), 20.4, 0.42),
    P(rect(15.1, -21.9, 43.4, -2.2), 18.4, 0.36),
    P(rect(-15.6, -4.6, 7.0, 36.0), 14.6, 0.3),
    P(rect(7.0, -4.6, 20.6, 39.9), 22.4, 0.5),
    P([[-27.0, 38.8], [-28.9, 53.9], [37.6, 62.2], [39.2, 47.0], [19.0, 39.9]], 18.0, 0.36),
  ], D);
  // plaza-side balcony along the south range (second floor)
  const R = K.run([-28.9, 53.9], [37.6, 62.2]); const b0 = R.L * 0.17, b1 = R.L * 0.83;
  K.rbox(R, BASE, b0, 5.25, 0, b1, 5.45, 0.9); K.rbox(R, M.iron, b0, 6.4, 0.82, b1, 6.46, 0.88, { detail: true });
  for (let s = b0; s < b1; s += 0.14) K.rbox(R, M.iron, s, 5.45, 0.84, s + 0.025, 6.4, 0.865, { detail: true });
  // central plaza entrance under the balcony, plus entrances wherever campus footpaths reach the building
  const walkables = [];
  { const { walk } = entry(K, R, R.L * 0.5, Math.max(1.5, K.g(...R.at(R.L * 0.5, 2)) + 0.12), { w: 3.0, h: 2.6, transom: 0.6, surround: BASE, surroundW: 0.5, signText: 'DWINELLE HALL', signOpts: { bg: '#e9e1d2', fg: '#4a4036', h: 0.38 }, lamps: 'lantern' }); if (walk) walkables.push(walk); }
  walkables.push(...autoEntries(K, ctx, allRuns.filter((r) => r !== R), { y0: 1.5, max: 4, w: 2.2, h: 2.4, surround: BASE, surroundW: 0.35 }));
  // foundation planting along the plaza range, lamp posts and bike racks on the plaza
  baseShrubs(K, R, 2, R.L - 2, { skip: [[R.L * 0.5 - 4, R.L * 0.5 + 4]], d: 1.0 });
  for (const t of [0.12, 0.35, 0.65, 0.88]) { const [u, v] = R.at(R.L * t, 6.5); lampPost(K, u, v); }
  { const [u, v] = R.at(R.L * 0.28, 4.2); bikeRack(K, u, v, Math.atan2(R.t[1], R.t[0]), 6); }
  // downspouts at the plaza-range corners
  for (const t of [0.6, R.L - 0.6]) downspout(K, R, t, 17.6);
  const object3d = K.finish(); object3d.name = 'dwinelle-hall';
  return { object3d, colliders, walkables };
}
