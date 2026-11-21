// Julia Morgan Hall (Julia Morgan, 1911; originally Girton Hall, the senior women’s hall on central campus, moved to the UC
// Botanical Garden in Strawberry Canyon). A low, rustic redwood-shingled Arts and Crafts hall under a broad shingled gable
// with deep eaves, banks of small-paned windows and a big masonry chimney. Massing from the 2021 LiDAR (frame 38°).
import * as THREE from 'three';
import { hallBuild, chimney, style } from './lib/b08c-halls.js';
import { fmats } from './lib/b08c-foothill.js';

export const info = {
  id: 'julia-morgan-hall',
  name: "Julia Morgan Hall",
  subtitle: 'Julia Morgan · 1911',
  blurb: "Designed by Julia Morgan in 1911 as Girton Hall, a gathering place for Berkeley’s women students, this redwood Arts and Crafts hall was moved from central campus to the UC Botanical Garden, where it is now Julia Morgan Hall.",
  replaces: ['w/36985262', 'way/36985262'],
};

export async function build(ctx) {
  const M = ctx.M;
  const F = fmats(M); const dark = F.cedar.clone(); dark.color = new THREE.Color(0x6e5f55);
  const roofMat = style(M, 'midcentury').roofMat; const trim = new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 0.7 });
  const common = { mat: dark, roofMat, corniceMat: trim, frame: trim, overhang: 1.2, roof: 'hip' };
  const blocks = [
    { ...common, u0: -6.4, u1: 7.5, v0: -5.3, v1: 3.8, g: 0.1, eave: 4.3, ridge: 6.4, axis: 'u', bay: 1.75, win: { w: 1.25, h: 1.9, mull: 1, muntins: 3, sill: 1.6 } },
    { ...common, u0: -11.0, u1: -6.4, v0: -3.7, v1: 5.2, g: 0.1, eave: 3.0, ridge: 4.5, axis: 'v', bay: 2.4, win: { w: 1.4, h: 1.4, mull: 1, muntins: 2 }, faces: { E: false } },
    { ...common, u0: 7.5, u1: 11.0, v0: -3.4, v1: 5.5, g: 0.1, eave: 3.0, ridge: 4.6, axis: 'v', bay: 2.4, win: { w: 1.4, h: 1.4, mull: 1, muntins: 2 }, faces: { W: false } },
  ];
  const { object3d, colliders } = hallBuild(ctx, 38, 'craftsman', blocks, (K) => {
    chimney(K, -9.6, 4.6, 1.5, 7.6, 1.2, 0.9, M.brick);
    // recessed entry porch with posts and a fieldstone planter wall between the hall and the east wing
    const g = K.gMin(4.0, 3.8, 7.5, 6.6);
    K.box(M.woodDark, 4.0, g - 0.6, 3.8, 7.5, g + 0.35, 6.4);
    for (const u of [4.2, 7.3]) K.box(trim, u - 0.1, g + 0.35, 6.2, u + 0.1, 3.4, 6.4);
    K.box(M.graniteDark, 0.0, g - 0.6, 6.4, 4.0, g + 0.7, 7.0);
    // small ridge vent (gablet) on the main hall
    K.box(dark, 0.0, 6.0, -0.9, 1.6, 6.8, 0.0); K.hip(roofMat, -0.2, -1.1, 1.8, 0.2, 6.8, 0.6);
  });
  object3d.name = 'julia-morgan-hall';
  return { object3d, colliders, walkables: [] };
}
