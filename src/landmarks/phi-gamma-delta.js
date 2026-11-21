// Phi Gamma Delta (ΦΓΔ, "Fiji"), Delta Xi chapter, 2395 Piedmont Avenue at the Channing Way traffic circle.
// Built 1928 as the Sigma Pi house (Frederick H. Reimers): a Mediterranean villa in dark red-brown brick with low hipped
// red-tile roofs. Toward Piedmont, a two-storey north range over a raised basement (with a projecting bay) sits behind a
// long brick retaining wall and a cream balustraded terrace; round-arched ground-floor windows throughout. The entrance bay
// sits on the diagonal facing the circle: a round-arched door in a cream stone surround under ΦΓΔ, paired small arched
// windows above and a wide stair down to the corner. The three-storey south wing along Channing has a tall two-storey
// arched corner window. Plan from OSM; heights from the LiDAR-derived model; facades from HALS CA-2 (2006-07) and photos.
import * as THREE from 'three';
import { rseHouse } from './lib/rse-finish.js';

export const info = {
  id: 'phi-gamma-delta',
  name: 'Phi Gamma Delta (Fiji)',
  subtitle: 'ΦΓΔ · 2395 Piedmont Avenue · Frederick H. Reimers, 1928',
  blurb: 'Brick Mediterranean-style chapter house at the Piedmont Avenue and Channing Way circle, designed by Frederick H. Reimers in 1928 as the Sigma Pi house and later home of Phi Gamma Delta\'s Delta Xi chapter.',
  replaces: ['w/473598572'],
};

const brick = ['brick', '#9a5139'], cream = ['paint', '#e8e1d2'], tile = ['tile', '#bf6a46'], frame = ['paint', '#efece4'], brown = ['paint', '#5a3a28'];
const WIN = { w: 1.0, h: 1.45, bay: 3.6, sill: 0.95, arch0: true, w0: 1.6, h0: 2.5, muntins: 2, casing: 0, tran: 0, st: [{ sill: 0.45 }] };

export async function build(ctx) {
  const F = 2.0, H = 3.3;
  // ---- main house: north range (A) + its Piedmont bay (B) + rear block + south wing (C) ----
  const r = rseHouse(ctx, {
    ang: -8.6, floor: F, storeyH: H, ov: 0.6, belts: false, frieze: false,
    wall: brick, trim: brown, frame, roof: tile, base: ['brick', '#7a4030'], door: ['wood', '#4a2f1c'],
    win: WIN,
    blocks: [
      { u0: -14.6, u1: 2.2, v0: -8.6, v1: 1.2, eave: 8.7, storeys: 2, roof: { type: 'hip', ridge: 10.9 } },
      { u0: 2.2, u1: 11.3, v0: -10.0, v1: 3.7, eave: 9.4, storeys: 2, roof: { type: 'hip', ridge: 11.7 } },
      { u0: 1.0, u1: 10.7, v0: 3.7, v1: 15.1, eave: 11.9, storeys: 3, noWin: { S: [[0.2, 3.4]] }, roof: { type: 'hip', ridge: 14.3 } },
      { u0: -18.3, u1: -14.6, v0: -7.2, v1: -0.1, eave: 8.7, storeys: 2, win: { W: { nb: 3 } }, roof: { type: 'hip', ridge: 10.3 } },
    ],
    extra: (api) => {
      const { K, M, blocks, faceRun, mat, walkables, colliders } = api; const cm = mat(cream), bm = mat(brick);
      // brick corbel course under the eaves
      for (const b of blocks) for (const f of ['W', 'S', 'E', 'N']) { const R = faceRun(b, f); K.rbox(R, mat(['brick', '#5e3024']), -0.05, b.eave - 0.42, 0, R.L + 0.05, b.eave - 0.2, 0.12); }
      // tall two-storey arched window at the Channing corner of the south wing, with cream surround
      { const R = faceRun(blocks[2], 'S'); const s = 1.8, w = 2.0, y0 = F + 0.35, y1 = F + 5.6;
        K.rbox(R, api.glass, s - w / 2, y0, 0.02, s + w / 2, y1 - w / 2, 0.04); const fl = new THREE.CircleGeometry(w / 2, 14, 0, Math.PI); fl.translate(s, y1 - w / 2, 0.04); K.addRun(R, api.glass, fl);
        for (const ss of [s - w / 2 - 0.22, s + w / 2]) K.rbox(R, cm, ss, y0 - 0.1, 0, ss + 0.22, y1 - w / 2, 0.16);
        const a = new THREE.TorusGeometry(w / 2 + 0.11, 0.12, 6, 16, Math.PI); a.translate(s, y1 - w / 2, 0.08); K.addRun(R, cm, a);
        K.rbox(R, cm, s - w / 2 - 0.3, y0 - 0.22, 0, s + w / 2 + 0.3, y0 - 0.08, 0.2);
        for (let k = 1; k < 4; k++) K.rbox(R, mat(frame), s - w / 2, y0 + (y1 - w / 2 - y0) * k / 4 - 0.03, 0.04, s + w / 2, y0 + (y1 - w / 2 - y0) * k / 4 + 0.03, 0.07, { detail: true });
        K.rbox(R, mat(frame), s - 0.03, y0, 0.04, s + 0.03, y1, 0.07, { detail: true });
        K.rbox(R, mat(['paint', '#26221e']), 5.2, K.g(...R.at(6.4, 0.5)) + 0.0, 0.01, 7.6, F - 0.15, 0.03); } // dark basement opening
      // ---- raised front lawn terrace on Piedmont: brick retaining wall, cream balustrade, stair from the sidewalk ----
      const T0 = -22.4, Tv0 = -9.8, Tv1 = 2.4, Ty = F - 0.1, sv0 = -9.3, sv1 = -7.5;
      const gmin = Math.min(K.g(T0, Tv0), K.g(T0, Tv1), K.g(T0, -3.6)) - 0.6;
      K.box(bm, T0, gmin, Tv0, -14.5, Ty - 0.12, Tv1);
      K.box(mat(['paint', '#66733f']), T0 + 0.35, Ty - 0.12, Tv0 + 0.35, -18.35, Ty - 0.05, Tv1 - 0.35);
      K.box(cm, T0 - 0.05, Ty - 0.12, Tv0 - 0.05, T0 + 0.35, Ty, Tv1 + 0.05);
      walkables.push(K.walkPoly([[T0, Tv0], [-14.6, Tv0], [-14.6, Tv1], [T0, Tv1]], Ty - 0.05));
      const bal = (pts, y = Ty - 0.05) => {
        for (let i = 0; i < pts.length - 1; i++) {
          const RR = K.run(pts[i], pts[i + 1]);
          K.rbox(RR, cm, -0.02, y, -0.14, RR.L + 0.02, y + 0.14, 0.14); K.rbox(RR, cm, -0.04, y + 0.82, -0.17, RR.L + 0.04, y + 0.95, 0.17);
          for (let s = 0.2; s < RR.L - 0.1; s += 0.26) { const g = new THREE.CylinderGeometry(0.045, 0.07, 0.68, 6); g.translate(s, y + 0.48, 0); K.addRun(RR, cm, g, { detail: true }); }
          for (const s of [0, RR.L]) K.rbox(RR, cm, s - 0.22, y, -0.22, s + 0.22, y + 1.1, 0.22);
          colliders.push({ type: 'poly', pts: K.polyXZ([pts[i], pts[i + 1], [pts[i + 1][0] + 0.01, pts[i + 1][1] + 0.01], [pts[i][0] + 0.01, pts[i][1] + 0.01]]), y0: y - 1, y1: y + 1.1 });
        }
      };
      bal([[T0 + 0.15, sv1 + 0.1], [T0 + 0.15, Tv1 - 0.15]]); bal([[-14.8, Tv0 + 0.15], [-18.0, Tv0 + 0.15]]);
      const gs = K.g(T0 - 1.6, (sv0 + sv1) / 2); const n1 = Math.max(2, Math.round((Ty - gs) / 0.16));
      walkables.push(K.stairs(M.concrete, T0 - n1 * 0.32, sv0, T0, sv1, gs, Ty - 0.05, '+u', n1));
      K.box(cm, T0 - n1 * 0.32 - 0.1, gs - 0.5, sv1 + 0.02, T0 + 0.1, Ty + 0.15, sv1 + 0.45);
    },
  }, { walk: false, plants: false, cartSide: 'N', gutter: '#6f5240', sconces: false, plaque: false, stoops: false });

  // ---- entrance bay on the diagonal, facing the Piedmont/Channing circle (its own frame, rotated 45 degrees) ----
  const e = rseHouse(ctx, {
    ang: -54, floor: F, storeyH: H, ov: 0.6, belts: false, frieze: false,
    wall: brick, trim: brown, frame, roof: tile, base: ['brick', '#7a4030'], door: ['wood', '#3a2618'],
    win: { ...WIN, none: true },
    blocks: [{ u0: -3.95, u1: 0.6, v0: -2.15, v1: 5.25, eave: 9.9, storeys: 2, win: { N: { none: true }, S: { none: true }, E: { none: true } }, roof: { type: 'hip', ridge: 12.0 } }],
    doors: [{ block: 0, face: 'W', s: 3.7, w: 1.75, h: 2.75, arch: true, noStoop: true }],
    letters: [{ block: 0, face: 'W', s: 3.7, y: F + 4.55, h: 0.45, text: 'ΦΓΔ', mat: ['metal', '#3b3a32'], dep: 0.07 }],
    extra: (api) => {
      const { K, M, blocks, faceRun, mat, walkables } = api; const cm = mat(cream); const b = blocks[0]; const R = faceRun(b, 'W');
      // thick cream stone surround: piers, deep keyed arch, crest cartouche breaking above it
      for (const s of [3.7 - 0.875 - 0.62, 3.7 + 0.875]) K.rbox(R, cm, s, F - 0.05, 0, s + 0.62, F + 2.75, 0.22);
      const a = new THREE.TorusGeometry(1.2, 0.34, 6, 20, Math.PI); a.translate(3.7, F + 2.75, 0.14); K.addRun(R, cm, a);
      K.rbox(R, cm, 3.45, F + 3.75, 0, 3.95, F + 4.25, 0.36); // keystone
      K.rbox(R, cm, 3.0, F + 5.15, 0, 4.4, F + 5.9, 0.12); K.rbox(R, cm, 3.25, F + 5.9, 0, 4.15, F + 6.2, 0.1); // crest
      // paired round-arched windows above the portal
      for (const s of [3.7 - 1.15, 3.7 + 1.15]) { const w = 0.75, y0 = F + 5.0, hh = 1.25;
        K.rbox(R, api.glass, s - w / 2, y0, -0.16, s + w / 2, y0 + hh, -0.13); const fl = new THREE.CircleGeometry(w / 2, 12, 0, Math.PI); fl.translate(s, y0 + hh, -0.14); K.addRun(R, api.glass, fl);
        for (const ss of [s - w / 2 - 0.12, s + w / 2]) K.rbox(R, cm, ss, y0 - 0.1, 0, ss + 0.12, y0 + hh, 0.07);
        const a2 = new THREE.TorusGeometry(w / 2 + 0.06, 0.07, 5, 12, Math.PI); a2.translate(s, y0 + hh, 0.03); K.addRun(R, cm, a2); K.rbox(R, cm, s - w / 2 - 0.18, y0 - 0.18, 0, s + w / 2 + 0.18, y0 - 0.08, 0.14); }
      K.rbox(R, mat(['brick', '#6e3a2b']), -0.05, b.eave - 0.42, 0, R.L + 0.05, b.eave - 0.2, 0.12);
      // landing + stair running down along the facade toward Channing, behind a solid cream parapet
      const yL = F - 0.02; K.box(M.concrete, b.u0 - 1.9, K.g(b.u0 - 1, 3.5) - 0.6, 1.5, b.u0, yL, 5.9);
      walkables.push(K.walkPoly([[b.u0 - 1.9, 1.5], [b.u0, 1.5], [b.u0, 5.9], [b.u0 - 1.9, 5.9]], yL));
      const g1 = K.g(b.u0 - 1.0, 10.5); const n = Math.max(3, Math.round((yL - g1) / 0.165)); const v1 = 5.9 + n * 0.29;
      walkables.push(K.stairs(M.concrete, b.u0 - 1.75, 5.9, b.u0 - 0.25, v1, g1, yL, '-v', n));
      for (const [u0, u1] of [[b.u0 - 2.15, b.u0 - 1.8]]) { K.box(cm, u0, Math.min(g1, K.g(u0, 1.5)) - 0.5, 1.4, u1, yL + 0.95, 5.9); for (let k = 0; k < 6; k++) { const va = 5.9 + (v1 - 5.9) * k / 6, vb = 5.9 + (v1 - 5.9) * (k + 1) / 6; K.box(cm, u0, g1 - 0.5, va, u1, yL + 0.95 - (yL - g1) * (k + 0.5) / 6, vb); } }
      K.box(cm, b.u0 - 2.25, yL + 0.95, 1.3, b.u0 - 1.7, yL + 1.07, 5.9);
    },
  }, { number: '2395', walk: false, plants: false, carts: false, stoops: false });
  const g = new THREE.Group(); g.add(r.object3d, e.object3d); g.name = 'phi-gamma-delta';
  return { object3d: g, colliders: [...r.colliders, ...e.colliders], walkables: [...r.walkables, ...e.walkables] };
}
