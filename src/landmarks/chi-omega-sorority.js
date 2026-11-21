// Kappa Alpha Order (ΚΑ), 2425 Piedmont Avenue. OSM labels this building "Chi Omega Sorority", but the university chapter list,
// the national KA magazine and tax records place Kappa Alpha Order here (house centennial 2024). Two-storey red-brick Georgian
// Revival: a side-gabled range on Piedmont (LiDAR eaves ~9.7 m, ridge ~13.3 m) with two hipped wings framing a rear court.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'chi-omega-sorority',
  name: "Kappa Alpha Order",
  subtitle: "ΚΑ · 2425 Piedmont Avenue",
  blurb: "The Kappa Alpha Order house on Piedmont Avenue (OpenStreetMap still labels it Chi Omega), a red-brick Georgian Revival house built around a court.",
  replaces: ['w/276665548'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -7.819, front: { block: 0, face: 'W', above: 0.8 }, storeyH: 3.3, ov: 0.45,
    wall: ['brick', '#a35a46'], trim: ['paint', '#f4f2ec'], roof: ['roof', '#3e3e40'], base: ['brick', '#7d3a2c'], door: ['paint', '#1f2a24'], shutters: ['paint', '#1f2a24'],
    win: { w: 0.95, h: 1.65, bay: 2.6, sill: 0.8, tran: 0.5, casing: 0.06, muntins: 2, sillMat: ['stone', '#d8d2c4'] },
    blocks: [
      { u0: -9.25, u1: 2.48, v0: -12.48, v1: 11.91, eave: 9.7, roof: { type: 'gable', axis: 'v', ridge: 13.3, gableWin: { w: 1.2, h: 1.0 } } },
      { u0: 2.48, u1: 10.77, v0: -12.48, v1: -5.38, eave: 9.4, roof: { type: 'hip', ridge: 11.6 } },
      { u0: 2.48, u1: 11.54, v0: 2.79, v1: 11.91, eave: 9.4, roof: { type: 'hip', ridge: 11.8 } },
    ],
    doors: [{ block: 0, face: 'W', s: 12.2, w: 1.4, h: 2.4, fan: true }],
    porches: [{ block: 0, face: 'W', s0: 10.0, s1: 14.4, depth: 2.2, cols: 4, colD: 0.36, top: 7.2, giant: true, colMat: ['paint', '#f4f2ec'], roofMat: ['roof', '#3e3e40'], letters: { text: 'ΚΑ', mat: ['metal', '#c9a74a'], h: 0.5 } }],
    dormers: [{ block: 0, side: 'W', s: 5.5, w: 1.6, h: 1.4, inset: 0.8 }, { block: 0, side: 'W', s: 18.9, w: 1.6, h: 1.4, inset: 0.8 }],
    chimneys: [{ u: -3.4, v: -12.1, w: 1.2, d: 0.7, top: 14.4, mat: ['brick', '#7d3a2c'] }, { u: -3.4, v: 11.5, w: 1.2, d: 0.7, top: 14.4, mat: ['brick', '#7d3a2c'] }],
  });
  r.object3d.name = 'chi-omega-sorority';
  return r;
}
