// Small-hall kit for batch b08c (Holy Hill seminary halls, Le Conte / Le Roy residence halls, Botanical Garden buildings).
// Style presets over stuccoBlock: 'craftsman' (redwood shingle, wide eaves, shingle roof), 'tudor' (cream stucco, steep
// slate-grey gables, dark casements, stone trim), 'midcentury' (putty stucco, low roofs or flat parapets, paired windows),
// 'seminary' (buff stucco, red tile). Blocks come from the footprint + LiDAR.
import * as THREE from 'three';
import { Kit } from './classic-kit.js';
import { bmats, stuccoBlock, chimney } from './b08c-kit.js';
import { fmats } from './b08c-foothill.js';

const _hm = new WeakMap();
function hmats(M) {
  if (_hm.has(M)) return _hm.get(M);
  const tint = (base, c, r) => { const m = base.clone(); m.color = new THREE.Color(c); if (r != null) m.roughness = r; return m; };
  const o = {
    woodRoof: tint(M.shingle, 0x7a6450, 0.9), slateRoof: tint(M.slate, 0x8a8682), compRoof: tint(M.shingle, 0x6e6c68, 0.9),
    cream: tint(M.stuccoWhite, 0xf0e4cc), putty: tint(M.stuccoWhite, 0xe2dbcc), buff: tint(M.stuccoWhite, 0xe3d3b4),
    trimBrown: new THREE.MeshStandardMaterial({ color: 0x4b3a2c, roughness: 0.7 }), trimWhite: new THREE.MeshStandardMaterial({ color: 0xece9e0, roughness: 0.55 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xb9bcbd, roughness: 0.35, metalness: 0.6 }),
  };
  _hm.set(M, o); return o;
}
export function style(M, name) {
  const H = hmats(M), F = fmats(M), B = bmats(M);
  if (name === 'craftsman') return { mat: F.cedar, roofMat: H.woodRoof, corniceMat: H.trimBrown, frame: H.trimWhite, overhang: 1.0, roof: 'gable', win: { w: 2.0, h: 1.6, mull: 2, tran: 0.7 }, fh: 3.2, plinth: M.graniteDark };
  if (name === 'tudor') return { mat: H.cream, roofMat: H.slateRoof, corniceMat: B.gothTrim, frame: B.frameDark, overhang: 0.35, roof: 'gable', win: { w: 1.5, h: 1.6, mull: 1, muntins: 2 }, fh: 3.1, plinth: B.gothTrim };
  if (name === 'seminary') return { mat: H.buff, roofMat: M.redTile, corniceMat: H.buff, frame: B.frameDark, overhang: 0.5, roof: 'hip', win: { w: 1.4, h: 1.7, mull: 1, tran: 0.7 }, fh: 3.2, plinth: M.concreteDark };
  return { mat: H.putty, roofMat: H.compRoof, corniceMat: H.trimWhite, frame: H.alu, overhang: 0.6, roof: 'hip', win: { w: 2.2, h: 1.4, mull: 1, tran: 0 }, fh: 3.0, plinth: M.concreteDark };
}
// blocks: [{u0,u1,v0,v1,g,eave,ridge,axis,roof?,faces?}], extras(K, st, M) optional
export function hallBuild(ctx, angDeg, styleName, blocks, extras) {
  const M = ctx.M; const st = style(M, styleName);
  const K = new Kit(ctx, THREE.MathUtils.degToRad(angDeg)); const colliders = [];
  for (const b of blocks) {
    const roof = b.roof || st.roof;
    stuccoBlock(K, { ...st, ...b, roof, base: b.g + 0.5, y0: b.g - 1.5, corniceP: 0.18, corniceH: 0.28, depth: 0.32, bay: b.bay ?? 3.2, parapet: 0.6 });
    K.box(st.plinth, b.u0 - 0.05, b.g - 1.5, b.v0 - 0.05, b.u1 + 0.05, b.g + 0.55, b.v1 + 0.05);
    colliders.push(K.colPoly([[b.u0, b.v0], [b.u1, b.v0], [b.u1, b.v1], [b.u0, b.v1]], -2, (b.ridge ?? b.eave) + 0.5));
  }
  if (extras) extras(K, st, M);
  return { object3d: K.finish(), colliders };
}
export { chimney };
