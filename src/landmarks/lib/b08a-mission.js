// b08a Spanish Colonial Revival kit (Clark Kerr Campus, the former California School for the Deaf and Blind, 1920s–30s).
// White limewashed stucco, red clay barrel-tile gable/hip roofs with small overhangs and ridge caps, deep-set dark
// steel casements (4×4 lights), thin stucco hoods, arched entries, one-storey colonnaded verandas with round columns
// and shed tile roofs. Massing helpers read the packet LiDAR so each wing's eave/ridge follow the 2021 survey.
import * as THREE from 'three';
import { pal, wing, roof, facade, ridge, chimney, rail } from './b08a-kit.js';

// LiDAR statistics inside a building-frame rectangle: robust eave/ridge estimates (trees overhang some slices)
export function lidarRect(ctx, K, u0, v0, u1, v1, axis) {
  const lt = ctx.packet.lidarTop; const S = (x, z) => { const j = Math.round((x - lt.x0) / lt.step), i = Math.round((z - lt.z0) / lt.step); return (i >= 0 && i < lt.nz && j >= 0 && j < lt.nx) ? lt.h[i][j] : null; };
  axis = axis || (u1 - u0 >= v1 - v0 ? 'u' : 'v');
  const along = axis === 'u' ? [u0 + 0.8, u1 - 0.8] : [v0 + 0.8, v1 - 0.8], across = axis === 'u' ? [v0 + 0.4, v1 - 0.4] : [u0 + 0.4, u1 - 0.4];
  const maxs = [], edL = [], edR = [], gs = [];
  for (let a = along[0]; a <= along[1]; a += 0.5) {
    const col = [];
    for (let b = across[0]; b <= across[1] + 1e-6; b += 0.5) { const [u, v] = axis === 'u' ? [a, b] : [b, a]; const [x, z] = K.xz(u, v); const h = S(x, z); if (h != null) col.push([b, h]); }
    if (col.length < 3) continue;
    maxs.push(Math.max(...col.map((c) => c[1])));
    edL.push(Math.min(col[0][1], col[1][1])); edR.push(Math.min(col[col.length - 1][1], col[col.length - 2][1]));
  }
  for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1], [(u0 + u1) / 2, v0], [(u0 + u1) / 2, v1], [u0, (v0 + v1) / 2], [u1, (v0 + v1) / 2]]) { const [x, z] = K.xz(u, v); gs.push(ctx.groundAt(x, z)); }
  const med = (a) => { const s = a.slice().sort((p, q) => p - q); return s.length ? s[s.length >> 1] : 0; };
  const q = (a, t) => { const s = a.slice().sort((p, q) => p - q); return s.length ? s[Math.min(s.length - 1, Math.floor(t * s.length))] : 0; };
  const gmin = Math.min(...gs), gmax = Math.max(...gs);
  const eL = med(edL), eR = med(edR); let eave;
  if (Math.abs(eL - eR) < 1.5) eave = Math.min(eL, eR);
  else if (Math.min(eL, eR) < gmax + 2.0) eave = Math.max(eL, eR);
  else eave = Math.min(eL, eR);
  return { ridge: q(maxs, 0.4), eave, gmin, gmax, axis };
}

// One Spanish-revival residence wing: stucco box with casement grid on each face + tile roof (LiDAR-fitted unless given)
// sp: {u0,u1,v0,v1, axis, roof:'gable'|'hip'|'shed'|'flat', eave, ridge, floorH, faces:{S,E,N,W:false|{skip,nb,doors,blank}}, ov, rake,
//      low (shed low side), ground (floor-0 level), win:{w,h}, hoods, chim:[[u,v]], storeys}
export function ckWing(K, ctx, sp) {
  const M = ctx.M, P = pal(ctx);
  const L = lidarRect(ctx, K, sp.u0, sp.v0, sp.u1, sp.v1, sp.axis);
  const axis = sp.axis || L.axis;
  const g0 = sp.ground ?? Math.max(L.gmin, Math.min(L.gmax, L.gmin + 0.6)) ;
  let eave = sp.eave ?? L.eave; let rdg = sp.ridge ?? L.ridge;
  if (rdg < eave + 0.6) rdg = eave + 0.6;
  const rtype = sp.roof || 'gable';
  const fh = sp.floorH ?? 3.25;
  const nFl = sp.storeys ?? Math.max(1, Math.round((eave - 0.3 - g0) / fh));
  const fl = []; const h0 = (eave - 0.35 - g0) / nFl; for (let k = 0; k < nFl; k++) fl.push(g0 + 0.15 + k * h0);
  const W = sp.win || {}; const ww = W.w ?? 1.25, wh = Math.min(W.h ?? 1.85, h0 - 1.25);
  const mk = (f) => (R) => {
    const fo = sp.faces?.[f] || {}; if (fo.blank) return [];
    const nb = fo.nb ?? Math.max(1, Math.round(R.L / (fo.bay ?? 3.1))); const bw = R.L / nb; const ops = [];
    for (let i = 0; i < nb; i++) { if (fo.skip?.includes(i)) continue; const c = bw * (i + 0.5);
      fl.forEach((y, k) => {
        if (k === 0 && fo.doors?.includes(i)) { ops.push({ s0: c - 0.6, s1: c + 0.6, y0: y - 0.12, y1: y + 2.55, kind: 'door', arch: fo.arch ? true : undefined, doorTop: y + 2.1, sill: false }); return; }
        if (fo.skipFloor?.includes(k)) return;
        if (k > 0 && fo.up && !fo.up.includes(i)) return;
        if (k === 0 && fo.french) { ops.push({ s0: c - 0.55, s1: c + 0.55, y0: y + 0.05, y1: y + 2.55, mull: 1, muntins: 4, arch: true, sill: false }); return; }
        const wide = (fo.wide?.includes(i)) ? 1.6 : (sp.vary !== false && i % 3 === 1 ? 1.22 : 1);
        ops.push({ s0: c - ww * wide / 2, s1: c + ww * wide / 2, y0: y + 0.85, y1: y + 0.85 + wh, mull: wide > 1.3 ? 2 : 1, muntins: 2, arch: (k === 0 && fo.archGround) ? true : undefined });
      }); }
    return ops;
  };
  const runs = wing(K, { u0: sp.u0, u1: sp.u1, v0: sp.v0, v1: sp.v1, y0: Math.min(L.gmin, g0) - 1.2, y1: eave, mat: sp.mat || P.stuccoWhite,
    faces: { S: sp.faces?.S === false ? false : mk('S'), E: sp.faces?.E === false ? false : mk('E'), N: sp.faces?.N === false ? false : mk('N'), W: sp.faces?.W === false ? false : mk('W') },
    depth: 0.4, frame: sp.frame || P.frameCK, door: sp.door, core: sp.core, sillMat: P.stuccoWhite, plinth: { h: g0 + 0.15, mat: P.concreteBuff, out: 0.04 } });
  // entry details: tile hoods on timber brackets over each door, wrought-iron balconettes on some upper windows
  for (const f of ['S', 'E', 'N', 'W']) {
    const R = runs[f]; const fo = sp.faces?.[f]; if (!R || !fo || fo.blank) continue;
    const nb = fo.nb ?? Math.max(1, Math.round(R.L / (fo.bay ?? 3.1))); const bw = R.L / nb;
    for (const i of fo.doors || []) { const c = bw * (i + 0.5), y = fl[0] + 2.75;
      const gd = K.g(...R.at(c, 0.6)); if (gd > fl[0] + 0.35) continue;
      const hg = new THREE.BoxGeometry(1.9, 0.09, 0.95); hg.rotateX(0.32); hg.translate(c, y + 0.18, 0.45); K.addRun(R, P.tileCK, hg, { uvMode: 'roof' });
      for (const sx of [-0.8, 0.8]) K.rbox(R, P.woodBeam, c + sx - 0.06, y - 0.25, 0, c + sx + 0.06, y + 0.05, 0.8, { detail: true });
      K.rbox(R, P.stuccoWhite, c - 0.78, fl[0] - 0.12, 0, c - 0.62, y - 0.2, 0.08); K.rbox(R, P.stuccoWhite, c + 0.62, fl[0] - 0.12, 0, c + 0.78, y - 0.2, 0.08);
      if (fl[0] - gd > 0.12) { const n = Math.round((fl[0] - gd) / 0.16); for (let k = 0; k < n; k++) K.rbox(R, P.concreteBuff, c - 0.9, gd - 0.5, 0.1 + (n - k - 1) * 0.3, c + 0.9, gd + (fl[0] - gd) * (k + 1) / n, 0.1 + (n - k) * 0.3); }
    }
    if (fl.length > 1 && sp.balconettes !== false) for (let i = 1; i < nb; i += 3) { if (fo.skip?.includes(i)) continue; const c = bw * (i + 0.5), y = fl[1] + 0.82;
      K.rbox(R, P.stuccoWhite, c - 0.75, y - 0.16, 0, c + 0.75, y, 0.32);
      rail(K, R, K.M.iron, c - 0.7, c + 0.7, y, 0.28, 0.85, 0.1); }
  }
  const ov = sp.ov ?? 0.55, rake = sp.rake ?? 0.3;
  const tileOpts = { mat: P.tileCK, fascia: sp.fascia || P.stuccoWhite, soffit: sp.soffit || P.trimCream, ridgeCap: P.tileCK, wallMat: sp.mat || P.stuccoWhite, thick: 0.14 };
  if (rtype === 'gable') roof(K, { type: 'gable', u0: sp.u0, u1: sp.u1, v0: sp.v0, v1: sp.v1, y: eave, rise: rdg - eave, axis, ov, rake, ...tileOpts });
  else if (rtype === 'hip') { const half = Math.min(sp.u1 - sp.u0, sp.v1 - sp.v0) / 2; roof(K, { type: 'hip', u0: sp.u0, u1: sp.u1, v0: sp.v0, v1: sp.v1, y: eave, slope: Math.min(1.1, (rdg - eave) / half), ov, ...tileOpts, wallMat: undefined }); }
  else if (rtype === 'shed') roof(K, { type: 'shed', u0: sp.u0, u1: sp.u1, v0: sp.v0, v1: sp.v1, y: eave, rise: rdg - eave, low: sp.low || 'W', ov, ...tileOpts });
  else roof(K, { type: 'flat', u0: sp.u0, u1: sp.u1, v0: sp.v0, v1: sp.v1, y: eave, parapet: { h: 0.6, mat: sp.mat || P.stuccoWhite, coping: M.redTile } });
  if (rtype === 'gable' && sp.vents !== false) { // louvred gable vents
    const yv = eave + (rdg - eave) * 0.55;
    if (axis === 'v') for (const vv of [sp.v0 - 0.01, sp.v1 + 0.01]) { const um = (sp.u0 + sp.u1) / 2; K.box(P.frameCK, um - 0.35, yv - 0.3, vv - 0.03, um + 0.35, yv + 0.3, vv + 0.03); for (let k = 0; k < 4; k++) K.box(P.stuccoWhite, um - 0.33, yv - 0.25 + k * 0.15, vv - 0.05, um + 0.33, yv - 0.22 + k * 0.15, vv + 0.05, { detail: true }); }
    else for (const uu of [sp.u0 - 0.01, sp.u1 + 0.01]) { const vm = (sp.v0 + sp.v1) / 2; K.box(P.frameCK, uu - 0.03, yv - 0.3, vm - 0.35, uu + 0.03, yv + 0.3, vm + 0.35); for (let k = 0; k < 4; k++) K.box(P.stuccoWhite, uu - 0.05, yv - 0.25 + k * 0.15, vm - 0.33, uu + 0.05, yv - 0.22 + k * 0.15, vm + 0.33, { detail: true }); }
  }
  for (const [u, v] of sp.chim || []) chimney(K, sp.mat || P.stuccoWhite, u, v, 0.95, 0.7, eave - 1, rdg + 1.0, P.tileCK);
  return { eave, ridge: rdg, g0, floors: fl, runs };
}

// One-storey colonnaded veranda along a wing: round white columns on the outer edge, flat beam, shed tile roof sloping out.
// sp: {u0,u1,v0,v1, side:'W'|'E'|'N'|'S' (outer edge), yLow, yHigh, g (floor level), step}
export function veranda(K, ctx, sp) {
  const M = ctx.M, P = pal(ctx); const { u0, u1, v0, v1 } = sp; const g = sp.g;
  const step = sp.step ?? 3.1; const side = sp.side;
  const isV = side === 'W' || side === 'E'; // edge runs along v
  const edge = side === 'W' ? u0 + 0.25 : side === 'E' ? u1 - 0.25 : side === 'N' ? v0 + 0.25 : v1 - 0.25;
  const a0 = isV ? v0 : u0, a1 = isV ? v1 : u1; const n = Math.max(1, Math.round((a1 - a0) / step));
  const colTop = sp.yLow - 0.45;
  const cols = [];
  for (let i = 0; i <= n; i++) { const a = a0 + 0.25 + (a1 - a0 - 0.5) * i / n; const [u, v] = isV ? [edge, a] : [a, edge];
    K.cyl(P.stuccoWhite, u, g + 0.2, v, 0.2, 0.17, colTop - g - 0.42, 16);                                   // Tuscan shaft (slight entasis)
    K.lathe(P.stuccoWhite, [[0.27, 0], [0.27, 0.06], [0.22, 0.1], [0.2, 0.2]], u, g, v, 16);                  // base
    K.lathe(P.stuccoWhite, [[0.17, 0], [0.19, 0.04], [0.25, 0.12], [0.25, 0.14]], u, colTop - 0.22, v, 16);   // echinus
    K.box(P.stuccoWhite, u - 0.29, colTop - 0.08, v - 0.29, u + 0.29, colTop, v + 0.29);                      // abacus
    cols.push([u, v]); }
  // beam along the edge
  if (isV) K.box(P.stuccoWhite, edge - 0.25, colTop, v0, edge + 0.25, sp.yLow - 0.05, v1); else K.box(P.stuccoWhite, u0, colTop, edge - 0.25, u1, sp.yLow - 0.05, edge + 0.25);
  // floor slab (red quarry-tile paving)
  K.box(P.concreteBuff, u0, g - 1.2, v0, u1, g - 0.02, v1); K.flat(P.tileFloor || P.concreteBuff, K.polyXZ ? [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] : [], g);
  // shed tile roof falling toward the outer edge
  roof(K, { type: 'shed', u0, u1, v0, v1, y: sp.yLow - 0.05, rise: sp.yHigh - sp.yLow, low: side, ov: 0.4, mat: P.tileCK, fascia: P.stuccoWhite, soffit: P.trimCream, thick: 0.1 });
  // exposed rafters under the roof (detail)
  const N2 = Math.round((a1 - a0) / 0.7);
  for (let i = 0; i <= N2; i++) { const a = a0 + (a1 - a0) * i / N2;
    if (isV) K.box(P.woodBeam, u0, sp.yLow - 0.32, a - 0.04, u1, sp.yLow - 0.18, a + 0.04, { detail: true }); else K.box(P.woodBeam, a - 0.04, sp.yLow - 0.32, v0, a + 0.04, sp.yLow - 0.18, v1, { detail: true }); }
  return { cols, walk: { type: 'poly', pts: K.polyXZ([[u0, v0], [u1, v0], [u1, v1], [u0, v1]]), y: g } };
}
