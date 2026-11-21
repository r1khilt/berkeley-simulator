// Gibbs Hall, Church Divinity School of the Pacific (Holy Hill, Ridge Road): an interwar Tudor/Collegiate-Gothic
// seminary building in cream stucco with steep slate-grey gables and dark leaded casements. No reliable photo was
// available; massing from the 2021 LiDAR (frame -10°).
import * as THREE from 'three';
import { hallBuild, chimney } from './lib/b08c-halls.js';
import { crossGable } from './lib/b08c-kit.js';
import { rectRuns, finishGround, gabledHood } from './lib/rn-b-ground.js';
import { flatTileMat } from './lib/rn-kit.js';

export const info = {
  id: 'gibbs-hall',
  name: "Gibbs Hall",
  subtitle: 'Church Divinity School of the Pacific',
  blurb: "Part of the Church Divinity School of the Pacific, the Episcopal seminary on Holy Hill north of campus.",
  replaces: ['w/190391838', 'way/190391838'],
};

export async function build(ctx) {
  const M = ctx.M;
  const blocks = [
    { u0: -4.5, u1: 5.0, v0: -11.5, v1: 12.5, g: -0.4, eave: 8.6, ridge: 12.4, axis: 'v' },
    { u0: -4.5, u1: 1.0, v0: -15.0, v1: -11.5, g: 0.3, eave: 8.4, ridge: 10.6, axis: 'u', faces: { S: false } },
  ];
  const SL = flatTileMat('gibbsSlate', { tw: 0.3, rh: 0.2, base: 0x6e6c6a, vary: 0.14 }); // coursed grey slate
  for (const b of blocks) b.roofMat = SL;
  let G = { colliders: [], walkables: [] };
  const { object3d, colliders } = hallBuild(ctx, -10, 'tudor', blocks, (K, st) => {
    G = finishGround(K, ctx, rectRuns(K, blocks.map((b) => ({ ...b, floor: b.g + 0.5 }))), { door: 'wood', n: 2, entry: { w: 1.7, h: 2.8, surround: st.corniceMat, sw: 0.38, sp: 0.3, doorMat: K.M.woodDark }, bikes: 2, plant: { h: 0.9, depth: 1.2 } });
    chimney(K, 3.2, 6.0, 9.0, 13.6, 1.0, 0.8, M.brick);
    for (const d of G.doors) gabledHood(K, d.R, d.s, 2.5, d.floor + 3.25, 1.4, { roofMat: SL, gableMat: st.mat, postMat: st.corniceMat, rise: 0.95, ov: 0.15 }); // gabled stone-trimmed hoods over the doors
    // Tudor character: coped cross-gables breaking the long east and west eaves, a second brick stack
    const RE = K.run([5.0, 12.5], [5.0, -11.5]), RW = K.run([-4.5, -11.5], [-4.5, 12.5]);
    crossGable(K, RE, 12.0, 5.2, 8.6, 3.0, 2.2, SL, st.mat, st.corniceMat, { proud: 0.45 });
    crossGable(K, RW, 8.0, 5.2, 8.6, 3.0, 2.2, SL, st.mat, st.corniceMat, { proud: 0.45 });
    chimney(K, -2.0, -6.0, 9.0, 13.8, 1.0, 0.8, M.brick);
    // Tudor half-timbering in the gables: dark oak studs and a bressumer beam over the cream render
    const TB = M.woodDark; // shared dark oak (merges with the door leaves)
    const halfTimber = (R, sc, w, yE, rise, d) => {
      K.rbox(R, TB, sc - w / 2 + 0.1, yE - 0.12, d, sc + w / 2 - 0.1, yE + 0.12, d + 0.07);
      for (let x = -w / 2 + 0.45; x <= w / 2 - 0.44; x += 0.62) { const top = yE + rise * (1 - Math.abs(x) / (w / 2)) - 0.25; if (top - yE < 0.5) continue; K.rbox(R, TB, sc + x - 0.07, yE + 0.12, d, sc + x + 0.07, top, d + 0.06); }
      for (const sg of [-1, 1]) { const L = Math.hypot(w / 2 - 0.3, rise * 0.82), a = Math.atan2(rise * 0.82, w / 2 - 0.3); const g = new THREE.BoxGeometry(L, 0.16, 0.06); g.rotateZ(sg * -a); g.translate(sc + sg * (w / 4 - 0.1), yE + rise * 0.41 + 0.05, d + 0.03); K.addRun(R, TB, g); }
    };
    halfTimber(RE, 12.0, 5.2, 8.6, 3.0, 0.46); halfTimber(RW, 8.0, 5.2, 8.6, 3.0, 0.46);
    halfTimber(K.run([-4.5, 12.5], [5.0, 12.5]), 4.75, 9.5, 8.6, 3.8, 0.02);
  });
  object3d.name = 'gibbs-hall';
  return { object3d, colliders: [...colliders, ...G.colliders], walkables: G.walkables };
}
