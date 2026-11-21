// Tellefsen Hall, 1755 Le Roy Avenue: a historic Northside hillside residence (four levels stepping down the slope) in
// the Berkeley brown-shingle tradition, with a steep street gable. No reliable photo was available; massing from the
// 2021 LiDAR (frame -9°).
import { hallBuild, chimney } from './lib/b08c-halls.js';
import { rectRuns, finishGround, shingleMat } from './lib/rn-b-ground.js';

export const info = {
  id: 'tellefsen-hall',
  name: "Tellefsen Hall",
  subtitle: '1755 Le Roy Avenue',
  blurb: "A university residence hall on Le Roy Avenue on Northside, long associated with the Cal Band.",
  replaces: ['w/826209422', 'way/826209422'],
};

export async function build(ctx) {
  const M = ctx.M;
  const SH = shingleMat('tellefsen', { base: 0x54473a });
  const blocks = [
    { u0: -11.0, u1: 10.0, v0: -6.6, v1: 5.6, g: 1.1, eave: 12.6, ridge: 15.9, axis: 'u', roof: 'gable' },
    { u0: 4.0, u1: 10.0, v0: 5.6, v1: 9.0, g: 0.1, eave: 11.6, ridge: 13.8, axis: 'v', roof: 'gable', faces: { N: false } },
  ];
  let G = { colliders: [], walkables: [] };
  for (const b of blocks) b.mat = SH; // split-redwood shingle walls
  const { object3d, colliders } = hallBuild(ctx, -9, 'craftsman', blocks, (K, st) => {
    G = finishGround(K, ctx, rectRuns(K, blocks.map((b) => ({ ...b, floor: b.g + 0.5 }))), { door: 'wood', n: 1, entry: { w: 1.8, h: 2.7, surround: st.corniceMat, canopy: { d: 1.8, t: 0.18, mat: st.corniceMat, posts: true, postMat: st.corniceMat } }, bikes: 4, plant: { hedge: true, h: 0.9, depth: 1.0 } });
    chimney(K, -6.5, -6.2, 11.0, 17.2, 1.1, 0.8, M.brick);
  });
  object3d.name = 'tellefsen-hall';
  return { object3d, colliders: [...colliders, ...G.colliders], walkables: G.walkables };
}
