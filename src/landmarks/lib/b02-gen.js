// Parts-based generic builder for b02 buildings: each part = polygon (building frame) + storeys + roof.
import * as THREE from 'three';
import { Kit, orient, polyWalls, flatRoof, hipPoly, belt, cornice, tint, solid, rect, curtain, dentils } from './b02-kit.js';
export { Kit, orient, polyWalls, flatRoof, hipPoly, belt, cornice, tint, solid, rect, curtain, dentils };

// part: {poly, fl (base top), levels:[y..] storey boundaries from fl to wall top, top (wall top), win|winFn(k), baseWin, bay,
//        mat, baseMat, roof:'flat'|'hip'|'none', eave, slope, ov, parapet, cornice:{P,H}|false, beltAt:[y], edge}
export function genParts(K, parts, defaults = {}) {
  const M = K.M; const colliders = [];
  for (const p0 of parts) {
    const p = { ...defaults, ...p0 }; const poly = orient(p.poly);
    const g0 = Math.min(...poly.map(([u, v]) => K.g(u, v))) - 1.5;
    const st = [{ y0: g0, y1: p.fl, mat: p.baseMat || p.mat, win: p.baseWin || null }];
    const lv = p.levels; for (let k = 0; k < lv.length - 1; k++) st.push({ y0: lv[k], y1: lv[k + 1], mat: p.mat, win: p.winFn ? p.winFn(k) : p.win });
    if (lv[lv.length - 1] < p.top - 0.05) st.push({ y0: lv[lv.length - 1], y1: p.top, mat: p.topMat || p.mat, win: null });
    const runs = polyWalls(K, poly, { stories: st, bay: p.bay || 3.6, frame: p.frame, edge: p.edge, depth: p.depth ?? 0.45 });
    if (p.beltAt) for (const y of p.beltAt) belt(K, poly, p.beltMat || p.baseMat || p.mat, y, 0.12, 0.28);
    if (p.cornice) cornice(K, poly, p.cornice.mat || p.mat, p.top, p.cornice.P ?? 0.5, p.cornice.H ?? 0.6);
    if (p.dentils) dentils(K, poly, p.cornice?.mat || p.mat, p.top - (p.cornice?.H ?? 0.6));
    let yMax = p.top;
    if (p.roof === 'flat') { flatRoof(K, poly, p.top, { mat: p.parMat || p.mat, parapet: p.parapet ?? 0.8, deck: p.deck, coping: p.coping }); yMax += (p.parapet ?? 0.8); }
    else if (p.roof === 'hip') { const P = hipPoly(K, p.hipPoly || poly, p.eave ?? p.top, p.slope ?? 0.42, { ov: p.ov ?? 0.7, soffit: p.soffit, yTop: p.yTop ?? Infinity, gables: p.gables || [] }); yMax += 8; }
    if (p.extra) p.extra(runs, p);
    if (p.collide !== false) colliders.push(K.colPoly(poly, g0, yMax));
  }
  return colliders;
}
