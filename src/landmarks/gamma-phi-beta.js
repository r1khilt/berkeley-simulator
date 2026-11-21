// Gamma Phi Beta (ΓΦΒ), Eta chapter (installed at Berkeley 1894), 2732 Channing Way — the chapter's home since 1937.
// A restrained 1920s-30s Mediterranean / Georgian revival house in pale blush stucco: three storeys under a flat roof
// behind a plain parapet, a U-shaped front whose two wings frame a shallow court on Channing, white multi-pane windows,
// a tall round-headed stair window spanning the upper floors, and a stained wood door with sidelights under a slim flat
// canopy on thin white posts, the "Gamma Phi Beta" script in gold beside it and a clipped box hedge along the base.
// Plan from OSM; height from the LiDAR-derived model (~12.3 m); facade from the chapter's photos.
import * as THREE from 'three';
import { rseHouse } from './lib/rse-finish.js';

export const info = {
  id: 'gamma-phi-beta',
  name: 'Gamma Phi Beta',
  subtitle: 'ΓΦΒ · 2732 Channing Way',
  blurb: 'Home since 1937 of the Eta chapter of Gamma Phi Beta, installed at Berkeley in 1894: a pale stucco house whose two wings frame a small entrance court on Channing Way.',
  replaces: ['w/473598492'],
};

function scriptMat(text) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
  g.clearRect(0, 0, 1024, 256); g.fillStyle = '#c9a24a'; g.font = 'italic bold 150px "Brush Script MT", "Segoe Script", cursive, Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(40,30,10,0.55)'; g.shadowOffsetX = 3; g.shadowOffsetY = 4; g.fillText(text, 512, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, roughness: 0.35, metalness: 0.6 });
}

export async function build(ctx) {
  const wall = ['stucco', '#cfc5bb'], trim = ['stucco', '#d8cfc6'], white = ['paint', '#f3f2ee'];
  const r = rseHouse(ctx, {
    ang: -8.6, front: { block: 1, face: 'N', above: 0.35 }, storeyH: 3.5, ov: 0.5, belt: true, frieze: false,
    wall, trim, frame: white, roof: ['roof', '#6a6460'], base: ['stucco', '#b8a69c'], door: ['wood', '#6e4226'],
    win: { w: 1.0, h: 1.45, bay: 2.9, sill: 0.9, tran: 0, muntins: 2, casing: 0, st: [{}, {}, { w: 1.1, h: 1.5, sill: 1.5 }] },
    blocks: [
      { u0: -17.1, u1: -9.85, v0: -14.0, v1: 2.6, eave: 11.7, storeys: 3, roof: { type: 'flat', parapet: 0.45, capMat: trim } },
      { u0: -9.85, u1: 4.25, v0: -9.9, v1: 2.6, eave: 11.7, storeys: 3, noWin: { N: [[5.7, 8.4]] }, roof: { type: 'flat', parapet: 0.45, capMat: trim } },
      { u0: 4.25, u1: 11.8, v0: -14.1, v1: 19.5, eave: 11.7, storeys: 3, roof: { type: 'flat', parapet: 0.45, capMat: trim } },
      { u0: -3.4, u1: 4.25, v0: 2.6, v1: 9.7, eave: 11.7, storeys: 3, roof: { type: 'flat', parapet: 0.45, capMat: trim } },
      { u0: 2.3, u1: 4.25, v0: 9.7, v1: 19.5, eave: 11.7, storeys: 3, roof: { type: 'flat', parapet: 0.45, capMat: trim } },
    ],
    doors: [{ block: 1, face: 'N', s: 10.75, w: 1.05, h: 2.25 }],
    extra: (api) => {
      const { K, blocks, faceRun, mat, glass } = api; const b = blocks[1]; const R = faceRun(b, 'N'); const F0 = b.f0; const H = 3.5;
      // sidelights beside the door
      for (const s of [10.75 - 0.95, 10.75 + 0.95]) { K.rbox(R, glass, s - 0.17, F0 + 0.2, -0.05, s + 0.17, F0 + 2.3, -0.02); K.rbox(R, mat(white), s - 0.24, F0 + 0.1, 0, s + 0.24, F0 + 0.2, 0.06); for (const ss of [s - 0.24, s + 0.17]) K.rbox(R, mat(white), ss, F0 + 0.1, 0, ss + 0.07, F0 + 2.36, 0.05); }
      // flat-headed stair window between the floor lines (split-level landing): 4 x 3 white grid with a transom band
      { const s = 7.05, w = 2.1, y0 = F0 + 2.85, y1 = F0 + 6.45, wm = mat(white);
        K.rbox(R, glass, s - w / 2, y0, 0.01, s + w / 2, y1, 0.03);
        for (const ss of [s - w / 2 - 0.08, s + w / 2]) K.rbox(R, wm, ss, y0 - 0.08, 0, ss + 0.08, y1 + 0.08, 0.1);
        K.rbox(R, wm, s - w / 2 - 0.08, y1, 0, s + w / 2 + 0.08, y1 + 0.08, 0.1); K.rbox(R, wm, s - w / 2 - 0.12, y0 - 0.12, 0, s + w / 2 + 0.12, y0, 0.16);
        for (let k = 1; k < 3; k++) K.rbox(R, wm, s - w / 2 + w * k / 3 - 0.025, y0, 0.02, s - w / 2 + w * k / 3 + 0.025, y1, 0.06, { detail: true });
        for (let k = 1; k < 4; k++) { const yy = y0 + (y1 - y0) * k / 4; K.rbox(R, wm, s - w / 2, yy - 0.025, 0.02, s + w / 2, yy + 0.025, 0.06, { detail: true }); }
        // ordinary window pair above it on the top floor
        const y2 = F0 + 2 * H + 1.45; K.rbox(R, glass, s - 1.1, y2, 0.01, s + 1.1, y2 + 1.4, 0.03); K.rbox(R, wm, s - 1.18, y2 - 0.1, 0, s + 1.18, y2, 0.14); K.rbox(R, wm, s - 1.18, y2 + 1.4, 0, s + 1.18, y2 + 1.48, 0.1); for (const ss of [s - 1.18, s - 0.04, s + 1.1]) K.rbox(R, wm, ss, y2, 0, ss + 0.08, y2 + 1.4, 0.1);
        // gold script centred under the stair window, lit by two small black lamps
        const g = new THREE.PlaneGeometry(2.8, 0.7); g.translate(s, F0 + 2.35, 0.04); g.applyMatrix4(R.m); K.add(scriptMat('Gamma Phi Beta'), g, { uvMode: 'keep' });
        for (const ss of [s - 0.9, s + 0.9]) { K.rbox(R, api.M.blackPaint, ss - 0.06, F0 + 2.72, 0, ss + 0.06, F0 + 2.84, 0.2, { detail: true }); } }
      // slim flat canopy over the door, sidelights already framed; wall lamps outside the sidelights
      K.rbox(R, mat(white), 10.75 - 1.35, F0 + 2.5, 0, 10.75 + 1.35, F0 + 2.57, 1.15); K.rbox(R, mat(white), 10.75 - 1.35, F0 + 2.42, 1.1, 10.75 + 1.35, F0 + 2.57, 1.15);
      for (const ss of [10.75 - 1.45, 10.75 + 1.45]) { K.rbox(R, api.M.blackPaint, ss - 0.07, F0 + 1.65, 0, ss + 0.07, F0 + 1.95, 0.16, { detail: true }); K.rbox(R, api.M.lampGlow, ss - 0.05, F0 + 1.68, 0.16, ss + 0.05, F0 + 1.92, 0.2, { detail: true }); }
      // clipped box hedges along the street wings
      for (const bi of [0, 2]) { const bb = blocks[bi]; const RR = faceRun(bb, 'N'); for (let s = 0.6; s < RR.L - 0.5; s += 0.9) { const q = RR.at(s, 0.55); const gy = K.g(q[0], q[1]); api.pbox('#3e5a2c', q[0] - 0.47, gy - 0.1, q[1] - 0.32, q[0] + 0.47, gy + 0.62 + ((s * 7) % 3) * 0.03, q[1] + 0.32); } }
    },
  }, { number: '2732', shrub: '#3f5b2d', sconces: false, plaque: false });
  r.object3d.name = 'gamma-phi-beta';
  return r;
}
