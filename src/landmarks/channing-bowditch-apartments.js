// Channing-Bowditch Apartments (Pyatok, 2003). Four-storey student apartments in the Berkeley brown-shingle idiom, built
// around the 1890s Anna Head School: stained cedar shingle over an ochre stucco ground storey, white trim, grey-green
// lap-siding bays, and dark asphalt hip roofs with deep eaves (Pyatok project photos; UC housing photo 2022).
// Massing: 1 m raster fitted to the 2021 LiDAR inside the OSM footprint (lib/units-blocks.js). r4-sweep-outer2: the raster's
// three levels trace pitched roofs (ridges ~17 m, eaves ~12.5 m), so the walls stop at a 4-storey eave (3 for the low south
// block) and hip roofs are rebuilt per wing from the raster; was a flat-roofed brown/cream paint box.
import * as THREE from 'three';
import { blocks } from './lib/units-blocks.js';
import { polysGeo } from './lib/classic-kit.js';
import { shingleMat } from './lib/rsw-site.js';
import { coopMat } from './lib/coop-kit.js';
import { stuccoTint, paintTint } from './lib/units-kit.js';

export const info = {
  id: 'channing-bowditch-apartments',
  name: "Channing-Bowditch Apartments",
  subtitle: "Student apartments",
  blurb: "University student apartments at Channing Way and Bowditch Street, built around the historic Anna Head School buildings.",
  replaces: ['w/109192946'],
};

const S = {"ang": -9.41, "u0": -34.12, "v0": -15.102, "res": 1.0, "nu": 71, "nv": 34, "lev": [12.2, 15.15, 16.92], "grid": "1111111111111111111111111111111111111111111111111111111111111111000000.1111111111111111111111111111111111111111111111111111111111111111000000.1111111111111111111111111111111111111111111111111111111111111111000000.1111222221111111111111221111111111111111111111111111221111111111000000.1111222222222222222222222222222222222222222222222222222222211111100000.1111222222222222222222222222222222222222222222222222222222211111100000.1111222222222222222222222222222222222222222222222222222222211111000000.1111222222222222222222222222222222222222222222222222222222211111000000.1111222222222222222222222222222222222222222222222222222222211111000000.1111222222222222222222222222222212222222222222222222222222211111000000.1111222222222222211111111111111111222222222111111111111111111111000000.1111222222222222211111111111111111122222222111111111111111111111000000.1111222222222222211111111111111111122222222111111111111111111111000000.1111222222222222211111111111111111122222222111......000001111111000000.1111222222222222211100111111100111122222222111......000001111111000000.11112222222222222111..........0111122222222111......000001111111000000.11112222222222222111...........111122222222111......000000111111000000.11112222222222222110...........111122222222111......000000122211000000.11112222222222222111.........11111222222222111......000000122210000000.11112222222222222111.........11111222222222111......000000111110000000.11112222222222222111.........11111122122111111......000000111110000000.11112222222222222111.........11111111111111111......000000000000000000.11112222222222222111.........11111111111111111......000000000000000000.11112222222222222111.........11111111111111111......000000000000000000.11112222222222222111.........11111111111111111......000000000000000000.11112222222222222111..........0000001111100000......000000000000000000.11112222222222222111..........0000001111100000......000000000000000000.11112222222222221111.........00000000111100000.......0000000000000.....11111222222222221111.........00000000111000000.............00..........11111222222222221111.........00000000000000000.........................11111222222222221111.........00000000000000000.........................11111111111111111111.........00000000000000000.........................01111111111111111111.........00000000000000000.........................01111111111111111111..................................................."};

// Roof over a rectangle with the ridge along `axis`; each end is hipped (true) or left as a gable buried in the
// neighbouring roof (false). Same winding as Kit.hip. Returns the ridge height.
function roofRect(K, mat, u0, v0, u1, v1, yE, slope, yTop, axis, hipA = true, hipB = true) {
  const r = (axis === 'u' ? v1 - v0 : u1 - u0) / 2; const h = Math.min(r * slope, yTop - yE); const ins = h / slope; const yT = yE + h;
  const eA = hipA ? ins : 0, eB = hipB ? ins : 0;
  const A = [u0, yE, v0], B = [u1, yE, v0], C = [u1, yE, v1], D = [u0, yE, v1];
  const [a, b, c, d] = axis === 'u'
    ? [[u0 + eA, yT, v0 + ins], [u1 - eB, yT, v0 + ins], [u1 - eB, yT, v1 - ins], [u0 + eA, yT, v1 - ins]]
    : [[u0 + ins, yT, v0 + eA], [u1 - ins, yT, v0 + eA], [u1 - ins, yT, v1 - eB], [u0 + ins, yT, v1 - eB]];
  K.add(mat, polysGeo([[A, a, b, B], [B, b, c, C], [C, c, d, D], [D, d, a, A]]), { uvMode: 'roof' });
  if (b[0] - a[0] > 0.01 && d[2] - a[2] > 0.01) K.add(mat, polysGeo([[d, c, b, a]]), { uvMode: 'roof' });
  return yT;
}

export async function build(ctx) {
  const M = ctx.M;
  // walls stop at the eave: 4 storeys (B) for the north bar and the west/middle wings, 3 storeys (A) for the low south block
  // and the Bowditch-side east block (LiDAR ~12 m there)
  const EA = 9.9, EB = 12.9; const nu = S.nu, nv = S.nv; // eaves above the F0 = 0.8 ground floor (the site rises ~2 m to the east)
  let grid = '';
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const ch = S.grid[j * nu + i]; grid += ch === '.' ? '.' : ((j >= 25 && i >= 28 && i <= 46) || (i >= 52 && j >= 13) || i >= 64 ? '0' : '1'); }
  const S2 = { ...S, grid, lev: [EA, EB] };
  const U = (i) => S.u0 + i * S.res, V = (j) => S.v0 + j * S.res;
  const shingle = shingleMat(M, 0x5b4a3d), stucco = stuccoTint(M, 0xc49253);
  const roof = coopMat('roof', '#505358'), soffit = paintTint(M, 0xe6e1d3);
  const style = { winMat: 'shared', site: { name: 'Channing-Bowditch' }, seed: 'cba', sh: 3.0, win: { w: 0.95, h: 1.5, sill: 0.9, gap: 3.3, pair: true }, F0: 0.8,
    palette: [shingle], ground: false, baseHex: 0x8a8378,
    coping: 0xe8e3d5, frameHex: 0xece8dc, glassHex: 0x2c3438, parapet: 0.05, sill: false, roofMat: roof,
    base2: { mat: stucco, h: 3.0 }, trim: 0xece8da,
    extra: (K) => {
      const OV = 1.0; // deep eave overhang
      // [i0, j0, i1, j1, eave, slope, ridge cap, axis, hip at the low end, hip at the high end]
      const R = [
        [0, 0, 64, 13, EB, 0.72, 17.4, 'u', true, true],      // north bar along the Durant side lot (LiDAR ridge band rows 4-9)
        [64, 0, 70, 13, EA, 0.55, 12.9, 'v', true, true],     // narrow north-east return (LiDAR ~12 m: three storeys)
        [0, 13, 20, 34, EB, 0.72, 17.4, 'v', false, true],    // west wing (ridge cols 4-16), runs into the north bar
        [29, 13, 46, 25, EB, 0.72, 17.2, 'v', false, true],   // middle wing (ridge cols 34-42)
        [28, 25, 46, 34, EA, 0.62, 13.0, 'u', true, true],    // low south block on Channing Way
        [52, 13, 70, 28, EA, 0.55, 14.6, 'v', true, true],    // east block on Bowditch (three storeys, ridge ~14)
      ];
      for (const [i0, j0, i1, j1, yE, sl, cap, ax, hA, hB] of R) {
        let u0 = U(i0) - OV, v0 = V(j0) - OV, u1 = U(i1) + OV, v1 = V(j1) + OV;
        // a gable end that meets the north bar runs on to the bar's ridge so the valleys close
        if (!hA) { if (ax === 'v') v0 = V(6.5); else u0 = U(i0 - 3); }
        if (!hB) { if (ax === 'v') v1 = V(j1); else u1 = U(i1); }
        roofRect(K, roof, u0, v0, u1, v1, yE + 0.14, sl, cap, ax, hA, hB);
        // white fascia board + flat soffit under the eave overhang (closes the wall head to the roof from below)
        K.box(soffit, U(i0) - OV + 0.02, yE - 0.12, V(j0) - OV + 0.02, U(i1) + OV - 0.02, yE + 0.14, V(j1) + OV - 0.02);
      }
      // brick chimneys (photo: one on the far block)
      const brick = M.brick; for (const [cu, cv] of [[U(10), V(3)], [U(44), V(9)]]) K.box(brick, cu - 0.5, EB - 1, cv - 0.6, cu + 0.5, 18.6, cv + 0.6);
    } };
  const r = blocks(ctx, S2, style);
  r.object3d.name = 'channing-bowditch-apartments';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
