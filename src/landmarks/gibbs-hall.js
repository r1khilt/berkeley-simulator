// Gibbs Hall, Church Divinity School of the Pacific (Holy Hill, Ridge Road): an interwar Tudor/Collegiate-Gothic
// seminary building in cream stucco with steep slate-grey gables and dark leaded casements. No reliable photo was
// available; massing from the 2021 LiDAR (frame -10°).
import { hallBuild, chimney } from './lib/b08c-halls.js';
import { crossGable } from './lib/b08c-kit.js';
import { rectRuns, finishGround } from './lib/rn-b-ground.js';

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
  let G = { colliders: [], walkables: [] };
  const { object3d, colliders } = hallBuild(ctx, -10, 'tudor', blocks, (K, st) => {
    G = finishGround(K, ctx, rectRuns(K, blocks.map((b) => ({ ...b, floor: b.g + 0.5 }))), { door: 'wood', n: 2, entry: { w: 1.7, h: 2.8, surround: st.corniceMat, sw: 0.38, sp: 0.3, doorMat: K.M.woodDark }, bikes: 2, plant: { h: 0.9, depth: 1.2 } });
    chimney(K, 3.2, 6.0, 9.0, 13.6, 1.0, 0.8, M.brick);
    // Tudor character: coped cross-gables breaking the long east and west eaves, a second brick stack
    const RE = K.run([5.0, 12.5], [5.0, -11.5]), RW = K.run([-4.5, -11.5], [-4.5, 12.5]);
    crossGable(K, RE, 12.0, 5.2, 8.6, 3.0, 2.2, st.roofMat, st.mat, st.corniceMat, { proud: 0.45 });
    crossGable(K, RW, 8.0, 5.2, 8.6, 3.0, 2.2, st.roofMat, st.mat, st.corniceMat, { proud: 0.45 });
    chimney(K, -2.0, -6.0, 9.0, 13.8, 1.0, 0.8, M.brick);
  });
  object3d.name = 'gibbs-hall';
  return { object3d, colliders: [...colliders, ...G.colliders], walkables: G.walkables };
}
