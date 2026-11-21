// Gibbs Hall, Church Divinity School of the Pacific (Holy Hill, Ridge Road): an interwar Tudor/Collegiate-Gothic
// seminary building in cream stucco with steep slate-grey gables and dark leaded casements. No reliable photo was
// available; massing from the 2021 LiDAR (frame -10°).
import { hallBuild, chimney } from './lib/b08c-halls.js';

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
  const { object3d, colliders } = hallBuild(ctx, -10, 'tudor', blocks, (K) => {
    chimney(K, 3.2, 6.0, 9.0, 13.6, 1.0, 0.8, M.brick);
  });
  object3d.name = 'gibbs-hall';
  return { object3d, colliders, walkables: [] };
}
