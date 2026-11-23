// Storefront signs (OSM shop/food names) with canvas-text atlas, plus canvas awnings.
import * as THREE from 'three';
import { nightGlow } from '../materials.js';
const PAL = {
  restaurant: [['#7a1f1f', '#f7efe2'], ['#1e2a24', '#e8d9a8'], ['#2b2b2b', '#f2c14e'], ['#0f3d3e', '#f1f1e6']],
  cafe: [['#2f4a35', '#efe6d2'], ['#3b2a20', '#f3e6cf'], ['#e9e3d6', '#2b2b2b']],
  fast_food: [['#c8102e', '#ffffff'], ['#f2b705', '#1a1a1a'], ['#0b3d91', '#ffffff']],
  bar: [['#151515', '#e6c56a'], ['#3a1430', '#f1d6e0']], pub: [['#1d3b2a', '#e8d49a']],
  default: [['#13294b', '#ffffff'], ['#f4f1ea', '#1c1c1c'], ['#5b1a1a', '#f2e9dc'], ['#1f1f1f', '#ffffff'], ['#2e4e3f', '#f6f1e6'], ['#b8860b', '#1b1b1b']],
};
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
export function buildSigns(signs) {
  const group = new THREE.Group(); group.name = 'signs';
  if (!signs || !signs.length) return { group };
  const CW = 512, CH = 64, COLS = 8, ROWS = Math.ceil(signs.length / COLS); const W = CW * COLS, H = Math.min(4096, ROWS * CH); // [r6-load] exact height (WebGL2 mips NPOT): 3648 px, not 4096
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const pos = [], uv = [], nor = [], aw = [], awc = [];
  const fonts = ['600 40px Georgia, serif', '700 38px "Helvetica Neue", Arial, sans-serif', '600 40px "Trebuchet MS", sans-serif', 'italic 600 40px Georgia, serif', '800 36px Arial Black, Arial, sans-serif'];
  signs.forEach((s, i) => {
    const col = i % COLS, row = Math.floor(i / COLS); if (row * CH >= H) return;
    const h = hash(s.n); const pal = PAL[s.k] || PAL.default; const [bg, fg] = pal[Math.floor(h * pal.length) % pal.length];
    const x0 = col * CW, y0 = row * CH;
    c.fillStyle = bg; c.fillRect(x0, y0, CW, CH);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 4; c.strokeRect(x0 + 2, y0 + 2, CW - 4, CH - 4);
    c.fillStyle = fg; c.font = fonts[Math.floor(h * 97) % fonts.length]; c.textAlign = 'center'; c.textBaseline = 'middle';
    let txt = s.n; let fs = 40; while (c.measureText(txt).width > CW - 30 && fs > 18) { fs -= 2; c.font = c.font.replace(/\d+px/, fs + 'px'); }
    c.fillText(txt, x0 + CW / 2, y0 + CH / 2 + 2);
    // quad
    const [x, y, z] = s.p, [nx, nz] = s.nrm; const tx = nz, tz = -nx; // viewer's right when facing the wall from the street
    const w = s.w, hh = Math.min(0.9, w / 8);
    const P = [[x - tx * w / 2, y - hh / 2, z - tz * w / 2], [x + tx * w / 2, y - hh / 2, z + tz * w / 2], [x + tx * w / 2, y + hh / 2, z + tz * w / 2], [x - tx * w / 2, y + hh / 2, z - tz * w / 2]];
    // winding so the quad faces the street (normal nx,nz): check cross
    const u0 = x0 / W, u1 = (x0 + CW) / W, v0 = 1 - (y0 + CH) / H, v1 = 1 - y0 / H;
    const cross = (P[1][0] - P[0][0]) * 0 - 0; // dummy
    const order = [0, 1, 2, 0, 2, 3]; const UV = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    // face direction of (P1-P0)x(P2-P0) = along -(t x up)... ensure it matches n; else mirror order & uv
    const ex = P[1][0] - P[0][0], ez = P[1][2] - P[0][2]; const fx = -ez, fz = ex; // normal of CCW quad viewed from front
    for (const k of order) { pos.push(...P[k]); uv.push(...UV[k]); nor.push(nx, 0, nz); }
    // awning under ~45% of signs
    if (h > 0.55 && w > 3) {
      const d = 1.25, drop = 0.55, yt = y - hh / 2 - 0.15;
      const A = [x - tx * w / 2, yt, z - tz * w / 2], B = [x + tx * w / 2, yt, z + tz * w / 2];
      const Cc = [B[0] + nx * d, yt - drop, B[2] + nz * d], D = [A[0] + nx * d, yt - drop, A[2] + nz * d];
      const ac = new THREE.Color(['#8c1c13', '#1f4e3d', '#14325c', '#3a3a3a', '#7a5c1e', '#5e2a4a'][Math.floor(h * 6.99)]);
      for (const q of [[A, B, Cc], [A, Cc, D], [A, Cc, B], [A, D, Cc]]) for (const p of q) { aw.push(...p); awc.push(ac.r, ac.g, ac.b); }
    }
  });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true;
  tex.onUpdate = () => { cv.width = cv.height = 1; }; // [r6-load] the 4096x3648 canvas (57 MB) is not needed once the atlas is on the GPU
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.computeBoundingSphere();
  const mat = nightGlow(new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.55, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), 0.8);
  const m = new THREE.Mesh(g, mat); m.name = 'shopSigns'; m.receiveShadow = true; group.add(m);
  if (aw.length) { const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.Float32BufferAttribute(aw, 3)); ag.setAttribute('color', new THREE.Float32BufferAttribute(awc, 3)); ag.computeVertexNormals(); const am = new THREE.Mesh(ag, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })); am.castShadow = true; am.receiveShadow = true; am.name = 'awnings'; group.add(am); }
  return { group };
}
