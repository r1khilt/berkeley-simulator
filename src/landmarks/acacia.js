// Acacia (Berkeley chapter), 2340 Piedmont Avenue. Mid-century modern chapter house: a white stucco flat-roofed box on
// Piedmont whose street front is a deep white frame — five full-height piers tied by a thick top beam under the roof-deck
// railing — with grey spandrel panels between the floors, mustard-yellow panels either side of the entry bay, wide
// picture windows below and paired white casements above, and the crest over a wood door. Orange-red brick front wall
// rising toward the north end carries the chapter name. A taller rear block steps down the slope behind.
// LiDAR: street block ~10.5 m (railing), rear block ~12-13 m.
import * as THREE from 'three';
import { greekHouse } from './lib/greek-kit.js';
import { hedge, latinLetters, railing } from './lib/b12-greek.js';
import { nightGlow } from '../materials.js';

export const info = {
  id: 'acacia',
  name: 'Acacia',
  subtitle: 'Acacia · 2340 Piedmont Avenue',
  blurb: 'Chapter house of the Acacia fraternity on Piedmont Avenue, a white mid-century modern house with a deep framed street front and a roof deck.',
  replaces: ['w/473598552'],
};

export async function build(ctx) {
  const white = ['stucco', '#f4f4f2'], paintW = ['paint', '#ffffff'], grey = ['paint', '#a8aaae'], mustard = ['paint', '#d9b95a'], brick = ['brick', '#d8784e'];
  const glass = nightGlow(new THREE.MeshStandardMaterial({ color: 0x6f7f88, roughness: 0.08, metalness: 0.4, envMapIntensity: 1.8, emissive: 0xffc77a, emissiveIntensity: 1.6 }), 1.0);
  const F = 2.6, H = 3.3, TOP = 9.6;
  const r = greekHouse(ctx, {
    ang: -9.075, floor: F, storeyH: H, ov: 0.0, glass,
    wall: white, trim: paintW, frame: paintW, roof: ['roof', '#7a7a7a'], base: ['stucco', '#e4e3de'], door: ['wood', '#9c6b3e'],
    win: { w: 1.6, h: 1.4, bay: 3.4, sill: 0.9, tran: 0, casing: 0, mull: 1 }, belt: false, frieze: false,
    blocks: [
      { u0: 2.5, u1: 12.43, v0: -6.58, v1: 7.46, eave: TOP, storeys: 2,
        win: { E: { nb: 4, st: [{ w: 2.4, h: 1.8, sill: 0.45, mull: 1, skip: [1] }, { w: 0.85, h: 1.2, pair: true, sill: 1.25, tran: 0.72 }] } },
        roof: { type: 'flat', parapet: 0.0 } },
      { u0: -8.12, u1: 2.5, v0: -6.59, v1: 7.46, eave: 11.7, floor: F - H, storeys: 4, roof: { type: 'flat', parapet: 0.3 } },
      { u0: -14.52, u1: -8.12, v0: -6.59, v1: 2.0, eave: 11.7, floor: F - H, storeys: 4, roof: { type: 'flat', parapet: 0.3 } },
    ],
    doors: [{ block: 0, face: 'E', s: 5.25, w: 1.0, h: 2.3 }],
    extra: (api) => {
      const { K, blocks, faceRun, mat } = api; const b = blocks[0]; const R = faceRun(b, 'E'); const L = R.L;
      const piers = [0.3, 3.67, 7.0, 10.37, L - 0.3];
      // deep white frame: piers 0.5 proud, thick top beam flush with their faces, returns on the side walls
      for (const s of piers) K.rbox(R, mat(white), s - 0.25, F - 0.7, 0, s + 0.25, TOP + 0.05, 0.5);
      K.rbox(R, mat(white), -0.05, TOP - 0.55, 0, L + 0.05, TOP + 0.05, 0.5);
      for (const f of ['N', 'S']) { const RS = faceRun(b, f); const a = f === 'N' ? 0 : RS.L - 2.0; K.rbox(RS, mat(white), a, TOP - 0.55, 0, a + 2.0, TOP + 0.05, 0.12); }
      // grey spandrel panels between the floors in each bay, mustard panels either side of the entry bay
      for (let k = 0; k < 4; k++) { const a = piers[k] + 0.25, c = piers[k + 1] - 0.25; if (k === 1) continue; K.rbox(R, mat(grey), a, F + 2.45, 0, c, F + H + 1.1, 0.04); }
      K.rbox(R, mat(grey), 4.75, F + 2.6, 0, 5.75, F + H + 1.1, 0.04);
      for (const [a, c] of [[3.92, 4.72], [5.78, 6.75]]) K.rbox(R, mat(mustard), a, F - 0.05, 0, c, TOP - 0.55, 0.06);
      // wood door with a sidelight, crest shield above
      K.rbox(R, api.glass, 5.78 - 0.02, F, -0.05, 5.78 + 0.0, F + 2.3, 0.0);
      { const sh = new THREE.Shape(); sh.moveTo(-0.4, 0.45); sh.lineTo(0.4, 0.45); sh.lineTo(0.4, -0.05); sh.quadraticCurveTo(0.35, -0.35, 0, -0.5); sh.quadraticCurveTo(-0.35, -0.35, -0.4, -0.05); sh.lineTo(-0.4, 0.45);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }); g.translate(5.25, F + 3.05, 0.05); K.addRun(R, mat(['paint', '#24427a']), g);
        const g2 = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }); g2.scale(0.55, 0.55, 1); g2.translate(5.25, F + 3.08, 0.11); K.addRun(R, mat(['metal', '#c9a24a']), g2); }
      // railed roof deck behind the beam
      railing(api, [[b.u0 + 0.5, b.v0 + 0.35], [b.u1 - 0.35, b.v0 + 0.35], [b.u1 - 0.35, b.v1 - 0.35], [b.u0 + 0.5, b.v1 - 0.35]], TOP + 0.05, { closed: true });
      // continuous orange-red brick front wall, top sloping up to a taller north section with the chapter name
      { const u = 16.0, vs = [9.2, 6.5, 3.8, 1.2, -1.2, -3.4, -6.0, -8.8]; const hs = [1.0, 1.0, 1.05, 1.15, 1.3, 1.5, 1.5, 1.5];
        for (let k = 0; k < vs.length - 1; k++) { const RW = K.run([u, vs[k]], [u, vs[k + 1]]); const g = Math.min(K.g(u, vs[k]), K.g(u, vs[k + 1])); const gt = Math.max(K.g(u, vs[k]), K.g(u, vs[k + 1]));
          if (k === 3) continue; // ramp / path gap at the entry
          K.rbox(RW, mat(brick), -0.01, g - 0.5, -0.18, RW.L + 0.01, gt + hs[k], 0.18); api.colliders.push({ type: 'box', min: [Math.min(...[K.xz(u - 0.2, vs[k])[0], K.xz(u + 0.2, vs[k + 1])[0]]), -2, Math.min(K.xz(u - 0.2, vs[k])[1], K.xz(u + 0.2, vs[k + 1])[1])], max: [Math.max(K.xz(u - 0.2, vs[k])[0], K.xz(u + 0.2, vs[k + 1])[0]), gt + hs[k], Math.max(K.xz(u - 0.2, vs[k])[1], K.xz(u + 0.2, vs[k + 1])[1])] }); }
        const RW = K.run([u + 0.19, -3.4], [u + 0.19, -8.8]); const g = Math.max(K.g(u, -3.4), K.g(u, -8.8));
        latinLetters(K, RW, mat(['metal', '#d8cfc0']), 'ACACIA', RW.L / 2, g + 0.6, 0.42, { dep: 0.04 });
        const RP = K.run([u + 0.19, 9.0], [u + 0.19, 6.8]); K.rbox(RP, mat(['stucco', '#d9cdb4']), 0.5, K.g(u, 8) + 0.3, 0, 1.7, K.g(u, 8) + 0.8, 0.03); }
      hedge(api, [[14.8, 8.5], [14.8, 2.0]], { h: 0.8, t: 0.7, color: '#4a6a34' });
    },
  });
  r.object3d.name = 'acacia';
  return r;
}
