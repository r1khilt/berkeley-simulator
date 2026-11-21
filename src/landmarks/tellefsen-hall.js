// Tellefsen Hall, 1755 Le Roy Avenue: a historic Northside hillside residence (four levels stepping down the slope) in
// the Berkeley brown-shingle tradition, with a steep street gable. No reliable photo was available; massing from the
// 2021 LiDAR (frame -9°).
import { hallBuild, chimney } from './lib/b08c-halls.js';

export const info = {
  id: 'tellefsen-hall',
  name: "Tellefsen Hall",
  subtitle: '1755 Le Roy Avenue',
  blurb: "A university residence hall on Le Roy Avenue on Northside, long associated with the Cal Band.",
  replaces: ['w/826209422', 'way/826209422'],
};

export async function build(ctx) {
  const M = ctx.M;
  const blocks = [
    { u0: -11.0, u1: 10.0, v0: -6.6, v1: 5.6, g: 1.1, eave: 12.6, ridge: 15.9, axis: 'u', roof: 'gable' },
    { u0: 4.0, u1: 10.0, v0: 5.6, v1: 9.0, g: 0.1, eave: 11.6, ridge: 13.8, axis: 'v', roof: 'gable', faces: { N: false } },
  ];
  const { object3d, colliders } = hallBuild(ctx, -9, 'craftsman', blocks, (K) => {
    chimney(K, -6.5, -6.2, 11.0, 17.2, 1.1, 0.8, M.brick);
  });
  object3d.name = 'tellefsen-hall';
  return { object3d, colliders, walkables: [] };
}
