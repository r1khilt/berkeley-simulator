// Parsons Hall, Church Divinity School of the Pacific: a long mid-century seminary dormitory in putty stucco under a
// low roof, with projecting stair/lounge bays along its north side. No reliable photo was available; massing from the
// 2021 LiDAR (frame -9°).
import { hallBuild, chimney } from './lib/b08c-halls.js';

export const info = {
  id: 'parsons-hall',
  name: "Parsons Hall",
  subtitle: 'Church Divinity School of the Pacific',
  blurb: "A residence hall of the Church Divinity School of the Pacific, the Episcopal seminary on Holy Hill.",
  replaces: ['w/190395142', 'way/190395142'],
};

export async function build(ctx) {
  const M = ctx.M;
  const blocks = [
    { u0: -35.5, u1: 35.5, v0: -3.0, v1: 3.6, g: 0.1, eave: 12.2, ridge: 13.7, axis: 'u' },
    { u0: -29.0, u1: -22.0, v0: -6.0, v1: -3.0, g: 0.2, eave: 12.2, ridge: 12.8, axis: 'u', roof: 'flat', faces: { S: false } },
    { u0: -16.5, u1: -9.0, v0: -6.0, v1: -3.0, g: 0.0, eave: 12.2, ridge: 12.8, axis: 'u', roof: 'flat', faces: { S: false } },
    { u0: -3.0, u1: 3.5, v0: -6.0, v1: -3.0, g: 0.2, eave: 12.2, ridge: 12.8, axis: 'u', roof: 'flat', faces: { S: false } },
    { u0: 10.0, u1: 16.5, v0: -6.0, v1: -3.0, g: 0.0, eave: 12.2, ridge: 12.8, axis: 'u', roof: 'flat', faces: { S: false } },
    { u0: 22.5, u1: 29.5, v0: -6.0, v1: -3.0, g: 0.0, eave: 12.2, ridge: 12.8, axis: 'u', roof: 'flat', faces: { S: false } },
  ];
  const { object3d, colliders } = hallBuild(ctx, -9, 'midcentury', blocks, (K) => {

  });
  object3d.name = 'parsons-hall';
  return { object3d, colliders, walkables: [] };
}
