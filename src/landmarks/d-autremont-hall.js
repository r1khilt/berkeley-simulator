// d’Autremont Hall, Pacific School of Religion (Holy Hill): buff stucco wings with red-tile roofs harmonising with PSR’s
// 1920s buildings. No reliable photo was available; massing from the 2021 LiDAR (frame 6°).
import { hallBuild, chimney } from './lib/b08c-halls.js';

export const info = {
  id: 'd-autremont-hall',
  name: "d’Autremont Hall",
  subtitle: 'Pacific School of Religion',
  blurb: "A building of the Pacific School of Religion, the Protestant seminary on Holy Hill north of campus.",
  replaces: ['w/190391834', 'way/190391834'],
};

export async function build(ctx) {
  const M = ctx.M;
  const blocks = [
    { u0: -12.5, u1: 12.5, v0: -9.5, v1: 3.5, g: 3.4, eave: 10.3, ridge: 13.4, axis: 'u' },
    { u0: -14.5, u1: 3.0, v0: 3.5, v1: 9.5, g: 1.9, eave: 9.2, ridge: 10.6, axis: 'u', faces: { N: false } },
    { u0: 12.5, u1: 27.5, v0: -9.5, v1: -4.5, g: 5.6, eave: 10.2, ridge: 10.4, axis: 'u', roof: 'flat', faces: { W: false } },
    { u0: -17.5, u1: -5.5, v0: 11.0, v1: 15.0, g: 0.3, eave: 3.8, ridge: 4.6, axis: 'u', roof: 'flat' },
    { u0: -15.5, u1: -12.5, v0: -3.5, v1: 0.5, g: 4.0, eave: 13.0, ridge: 14.3, axis: 'v', faces: { E: false } },
  ];
  const { object3d, colliders } = hallBuild(ctx, 6, 'seminary', blocks, (K) => {

  });
  object3d.name = 'd-autremont-hall';
  return { object3d, colliders, walkables: [] };
}
