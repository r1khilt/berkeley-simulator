// b04-kit: shared helpers for the College of Chemistry / Physics / Life-Sciences buildings (batch b04-sciences).
// Mid-century concrete slabs, 1990s-2010s lab buildings, and a few historic piers-and-spandrel facades.
// Builds on classic-kit's Kit (author in a rotated building frame u/v, merge per material, bake once).
// Facades here are made of boxes (piers, spandrel bands, fins, slab edges) in front of one recessed glass plane per storey,
// which gives real relief in raking light for very few triangles.
import * as THREE from 'three';
import { Kit, polysGeo, roofUV, corniceProfile } from './classic-kit.js';
import { nightGlow } from '../../materials.js';
export { Kit, polysGeo, roofUV };

const CACHE = new WeakMap();
function cache(M) { let m = CACHE.get(M); if (!m) { m = new Map(); CACHE.set(M, m); } return m; }
// Tinted clone of a shared (textured) material, cached so every b04 building shares the same instance.
export function tint(M, base, hex, { rough, metal } = {}) {
  const key = `${base}|${hex}|${rough}|${metal}`; const c = cache(M);
  if (!c.has(key)) {
    const m = M[base].clone(); m.color = new THREE.Color(hex);
    if (rough != null) m.roughness = rough; if (metal != null) m.metalness = metal;
    m.name = 'b04-' + key; c.set(key, m);
  }
  return c.get(key);
}
// Plain (untextured) standard material, cached.
export function plain(M, hex, { rough = 0.6, metal = 0, key } = {}) {
  const k = key || `plain|${hex}|${rough}|${metal}`; const c = cache(M);
  if (!c.has(k)) { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal }); m.name = 'b04-' + k; c.set(k, m); }
  return c.get(k);
}
// Tinted lab/curtain-wall glass that still glows warm at night.
export function glassTint(M, hex, { glow = 0.8, rough = 0.08, metal = 0.25 } = {}) {
  const k = `glass|${hex}|${glow}`; const c = cache(M);
  if (!c.has(k)) {
    const m = nightGlow(new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal, envMapIntensity: 1.4, emissive: 0xffc77a, emissiveIntensity: 1.4 }), glow);
    m.name = 'b04-' + k; c.set(k, m);
  }
  return c.get(k);
}

// Signed area of a [u,v] polygon; Kit runs want the building on the left => negative area in (u,v).
export function area(poly) { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
export function orient(poly) { return area(poly) > 0 ? poly.slice().reverse() : poly; }
export function rect(u0, v0, u1, v1) { return [[u0, v1], [u1, v1], [u1, v0], [u0, v0]]; } // S, E, N, W edges in that order

// ---------- facades ----------
// Grid facade along run R, s in [s0,s1]. levels = floor lines [y0, y1, ..., yTop].
// o: { nb | bay, mat, pier (w), pierMat, pierOut, bandOut, sill, head, rec, glass, frame, mull, tran (fraction), fin:{w,d,mat,every},
//      ledge:{h,d,mat}, skip:[bay idx], solidLv:[storey idx], endPier (w at the run ends), bottomBand, topBand }
export function grid(K, R, s0, s1, levels, o = {}) {
  const M = K.M; const mat = o.mat || M.concrete; const pierMat = o.pierMat || mat;
  const L = s1 - s0; const nb = o.nb ?? Math.max(1, Math.round(L / (o.bay || 3.2)));
  const pier = o.pier ?? 0.45, endPier = o.endPier ?? pier, rec = o.rec ?? 0.3;
  const sill = o.sill ?? 0.9, head = o.head ?? 0.45;
  const pierOut = o.pierOut ?? 0.0, bandOut = o.bandOut ?? 0.0;
  const glass = o.glass || M.windowNight, frame = o.frame || M.darkBronze;
  const inner = L - 2 * endPier; // clear span between end piers
  const bw = (inner + pier) / nb; // pier centre spacing
  const pierS = []; for (let i = 0; i <= nb; i++) pierS.push(s0 + endPier - pier / 2 + bw * i);
  const nL = levels.length - 1;
  const yTop = levels[nL];
  for (let i = 0; i <= nb; i++) {
    const w = (i === 0 || i === nb) ? endPier : pier;
    const c = i === 0 ? s0 + endPier / 2 : i === nb ? s1 - endPier / 2 : pierS[i];
    if (w > 0.01) K.rbox(R, pierMat, c - w / 2, o.pierY0 ?? levels[0], -rec - 0.05, c + w / 2, o.pierY1 ?? yTop, pierOut);
    if (o.fin && i % (o.fin.every || 1) === 0 && !(o.fin.noEnds && (i === 0 || i === nb))) K.rbox(R, o.fin.mat || pierMat, c - o.fin.w / 2, o.fin.y0 ?? levels[0], pierOut, c + o.fin.w / 2, o.fin.y1 ?? yTop, pierOut + o.fin.d, o.fin.detail ? { detail: true } : undefined);
  }
  for (let k = 0; k <= nL; k++) {
    const y = levels[k];
    const ya = k === 0 ? (o.bottomBand ?? y) : y - head; const yb = k === nL ? y + (o.topBand ?? 0) : y + sill;
    if (yb - ya > 0.02) K.rbox(R, mat, s0, ya, -rec - 0.05, s1, yb, bandOut);
    if (o.ledge && k > 0 && k < nL) K.rbox(R, o.ledge.mat || mat, s0 - (o.ledge.ext ?? 0), y - o.ledge.h / 2, bandOut, s1 + (o.ledge.ext ?? 0), y + o.ledge.h / 2, bandOut + o.ledge.d);
  }
  for (let k = 0; k < nL; k++) {
    const gy0 = levels[k] + sill, gy1 = levels[k + 1] - head; if (gy1 - gy0 < 0.2) continue;
    const solid = o.solidLv?.includes(k);
    const g = new THREE.PlaneGeometry(L, gy1 - gy0); g.translate(s0 + L / 2, (gy0 + gy1) / 2, -rec);
    K.addRun(R, solid ? mat : glass, g, { uvMode: solid ? 'box' : 'keep' });
    if (solid) continue;
    for (let i = 0; i < nb; i++) {
      const a = (i === 0 ? s0 + endPier : pierS[i] + pier / 2), b = (i === nb - 1 ? s1 - endPier : pierS[i + 1] - pier / 2);
      if (o.skip?.includes(i)) { K.rbox(R, mat, a, gy0, -rec - 0.02, b, gy1, -rec + 0.12); continue; }
      const fw = 0.06, det = { detail: true };
      K.rbox(R, frame, a, gy0, -rec, b, gy0 + fw, -rec + 0.06, det);
      K.rbox(R, frame, a, gy1 - fw, -rec, b, gy1, -rec + 0.06, det);
      const mull = o.mull ?? 1;
      for (let m = 1; m <= mull; m++) { const s = a + (b - a) * m / (mull + 1); K.rbox(R, frame, s - 0.03, gy0, -rec, s + 0.03, gy1, -rec + 0.06, det); }
      if (o.tran) { const ty = gy0 + (gy1 - gy0) * o.tran; K.rbox(R, frame, a, ty - 0.03, -rec, b, ty + 0.03, -rec + 0.06, det); }
    }
  }
  return { pierS, bw, nb };
}

// Curtain wall: glass with a mullion grid (vertical every `mw` m, horizontal at floor lines + optional transom).
export function curtain(K, R, s0, s1, y0, y1, o = {}) {
  const M = K.M; const glass = o.glass || M.windowNight; const frame = o.frame || M.darkBronze;
  const rec = o.rec ?? 0.12; const L = s1 - s0;
  const g = new THREE.PlaneGeometry(L, y1 - y0); g.translate(s0 + L / 2, (y0 + y1) / 2, -rec); K.addRun(R, glass, g, { uvMode: 'keep' });
  const n = Math.max(1, Math.round(L / (o.mw || 1.5)));
  const fd = o.fd ?? 0.12, fwid = o.fw ?? 0.07;
  for (let i = 0; i <= n; i++) { const s = s0 + L * i / n; K.rbox(R, frame, s - fwid / 2, y0, -rec, s + fwid / 2, y1, -rec + fd, (i === 0 || i === n) ? undefined : { detail: o.detail ?? false }); }
  const ys = o.levels || [y0, y1];
  for (const y of ys) K.rbox(R, frame, s0, y - (o.hw ?? 0.09), -rec, s1, y + (o.hw ?? 0.09), -rec + fd);
  if (o.spandrel) for (const y of ys.slice(1, -1)) K.rbox(R, o.spandrel.mat || frame, s0, y - o.spandrel.h, -rec - 0.01, s1, y, -rec + 0.02);
  if (o.tran) for (let k = 0; k < ys.length - 1; k++) { const ty = ys[k] + o.tran; if (ty < ys[k + 1]) K.rbox(R, frame, s0, ty - 0.03, -rec, s1, ty + 0.03, -rec + fd * 0.8, { detail: true }); }
}

// Punched windows in a solid wall (real openings with reveals) - for older concrete/stucco buildings.
// rows: [{y0, h, w, mull, tran, arch}] ; cols: centres along the run.
export function punched(K, R, s0, s1, y0, y1, mat, cols, rows, o = {}) {
  const ops = [];
  for (const r of rows) for (const c of cols) ops.push({ s0: c - r.w / 2, s1: c + r.w / 2, y0: r.y0, y1: r.y0 + r.h, arch: r.arch, rise: r.rise, sill: r.sill ?? o.sill, sillMat: o.sillMat, muntins: r.muntins, _r: r });
  K.wall(R, mat, s0, s1, y0, y1, ops, o.depth ?? 0.4);
  for (const op of ops) K.fill(R, op, { rev: o.rev ?? 0.28, mull: op._r.mull ?? 1, tran: op._r.tran ? [op.y0 + (op.y1 - op.y0) * op._r.tran] : [], frame: o.frame || K.M.whitePaint, glass: o.glass });
  return ops;
}
export function cols(s0, s1, n, margin = 0) { const out = []; const w = (s1 - s0 - 2 * margin) / n; for (let i = 0; i < n; i++) out.push(s0 + margin + w * (i + 0.5)); return out; }

// Runs around an oriented polygon: returns [{R, i, a, b}] (edge i from poly[i] to poly[i+1]).
export function runsOf(K, poly) { poly = orient(poly); const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; out.push({ R: K.run(a, b), i, a, b }); } return out; }

// Flat roof with parapet/coping on a polygon block: roof deck + parapet ring.
export function flatRoof(K, poly, y, o = {}) {
  const M = K.M; poly = orient(poly);
  K.prism(o.deckMat || M.concreteDark, poly, y - 0.35, y);
  if (o.parapet !== 0) {
    const ph = o.parapet ?? 0.9, t = o.t ?? 0.3, out = o.out ?? 0.05;
    K.loop(o.mat || M.concrete, poly, [[out, y - 0.4], [out, y + ph], [-t, y + ph], [-t, y - 0.4]]);
    if (o.coping) K.loop(o.coping, poly, [[out + 0.06, y + ph], [out + 0.06, y + ph + 0.08], [-t - 0.04, y + ph + 0.08], [-t - 0.04, y + ph]]);
  }
}
// Rooftop mechanical penthouse / box with optional louvres
export function penthouse(K, u0, v0, u1, v1, y0, y1, o = {}) {
  const M = K.M; const mat = o.mat || M.concreteDark;
  K.box(mat, u0, y0 - 0.3, v0, u1, y1, v1);
  if (o.cap !== false) K.box(o.cap || M.concrete, u0 - 0.1, y1, v0 - 0.1, u1 + 0.1, y1 + 0.15, v1 + 0.1);
  if (o.louvre) for (const [a, b] of [[[u0, v1], [u1, v1]], [[u1, v0], [u0, v0]]]) { const R = K.run(a, b); for (let y = y0 + 0.6; y < y1 - 0.4; y += 0.3) K.rbox(R, M.iron, 0.4, y, 0, R.L - 0.4, y + 0.07, 0.07, { detail: true }); }
}
// Glazed entrance on a run: dark glass doors with frames, surround and a flat canopy
export function entrance(K, R, s, y, o = {}) {
  const M = K.M; const w = o.w ?? 3.2, h = o.h ?? 3.0, rec = o.rec ?? 0.5;
  if (o.surround !== false) K.rbox(R, o.surround || M.concrete, s - w / 2 - 0.25, y + h, -0.05, s + w / 2 + 0.25, y + h + 0.3, 0.06);
  // recess box: dark reveal so the doors sit back from the face
  K.rbox(R, M.concreteDark, s - w / 2, y - 0.05, -rec - 0.05, s + w / 2, y + 0.02, 0.0);
  const g = new THREE.PlaneGeometry(w, h); g.translate(s, y + h / 2, -rec + 0.02); K.addRun(R, o.glass || M.windowNight, g, { uvMode: 'keep' });
  const f = o.frame || M.darkBronze; const det = { detail: true };
  for (const x of [s - w / 2, s - w / 6, s + w / 6, s + w / 2]) K.rbox(R, f, x - 0.04, y, -rec, x + 0.04, y + h, -rec + 0.08, det);
  K.rbox(R, f, s - w / 2, y + 2.3, -rec, s + w / 2, y + 2.38, -rec + 0.08, det);
  if (o.canopy) K.rbox(R, o.canopyMat || M.concrete, s - w / 2 - 0.6, y + h + 0.3, 0, s + w / 2 + 0.6, y + h + 0.55, o.canopy);
}
// Steps from ground up to a door (climbing toward the wall)
export function stepsTo(K, R, s, w, yLo, yHi, mat, walkables) {
  if (yHi - yLo < 0.12) return;
  const n = Math.max(1, Math.round((yHi - yLo) / 0.16)); const run = n * 0.32;
  const p0 = R.at(s - w / 2, 0), p1 = R.at(s + w / 2, run);
  const uu = [p0[0], p1[0]].sort((a, b) => a - b), vv = [p0[1], p1[1]].sort((a, b) => a - b);
  const n0 = R.n; let dir;
  if (Math.abs(n0[0]) > Math.abs(n0[1])) dir = n0[0] > 0 ? '-u' : '+u'; else dir = n0[1] > 0 ? '-v' : '+v';
  walkables.push(K.stairs(mat, uu[0], vv[0], uu[1], vv[1], yLo, yHi, dir, n));
}
// footprint (local x,z) -> building frame, and collider straight from the OSM outline
export function toUV(K, pts) { return pts.map(([x, z]) => K.uv(x, z).map((q) => +q.toFixed(3))); }
export function colFromXZ(pts, y0, y1) { return { type: 'poly', pts: pts.map(([x, z]) => [+x.toFixed(3), +z.toFixed(3)]), y0, y1 }; }

// Rectangular block with punched windows on every face, plinth, cornice, core and roof (hip / flat).
// sp: { y0, eave, mat, frame, glass, bay, margin, rows:[{y0,h,w,mull,tran,muntins,arch}], faces:{S|E|N|W: false | {nb, skip:[], rows, extra(R, cs)}},
//       plinth:{h, mat, out}, belt:[y...], cornice:{P,H,mat} | false, roof:{type:'hip'|'flat', slope, mat, yTop, overhang, parapet} }
export function punchedBlock(K, u0, v0, u1, v1, sp) {
  const M = K.M; const mat = sp.mat || M.stucco;
  const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
  const runs = {};
  for (const f of ['S', 'E', 'N', 'W']) {
    const fo = sp.faces?.[f]; if (fo === false) continue;
    const R = K.run(defs[f][0], defs[f][1]); runs[f] = R;
    const nb = fo?.nb ?? Math.max(1, Math.round((R.L - 2 * (sp.margin ?? 0.8)) / (sp.bay || 3.4)));
    const cs = cols(0, R.L, nb, sp.margin ?? 0.8).filter((c, i) => !(fo?.skip || []).includes(i));
    const rows = fo?.rows || sp.rows;
    punched(K, R, 0, R.L, sp.y0, sp.eave, mat, cs, rows, { frame: sp.frame, glass: sp.glass, depth: sp.depth ?? 0.4, rev: sp.rev ?? 0.28, sillMat: sp.sillMat });
    if (sp.plinth) K.rbox(R, sp.plinth.mat || mat, -(sp.plinth.out ?? 0.1), sp.y0, 0, R.L + (sp.plinth.out ?? 0.1), sp.plinth.h, sp.plinth.out ?? 0.1);
    for (const y of sp.belt || []) K.rbox(R, sp.beltMat || mat, -0.08, y - 0.12, 0, R.L + 0.08, y + 0.12, 0.08);
    if (sp.cornice !== false) { const c = sp.cornice || {}; K.mould(R, c.mat || mat, 0, R.L, corniceProfile(sp.eave + (c.H ?? 0.7), c.P ?? 0.6, c.H ?? 0.7)); }
    if (fo?.extra) fo.extra(R, cs);
  }
  if (sp.core !== false) K.box(M.concreteDark, u0 + 0.6, sp.y0, v0 + 0.6, u1 - 0.6, sp.eave, v1 - 0.6);
  const r = sp.roof || { type: 'flat' }; const top = sp.eave + (sp.cornice === false ? 0 : (sp.cornice?.H ?? 0.7));
  if (r.type === 'hip') { const ov = r.overhang ?? 0.5; K.hip(r.mat || M.redTile, u0 - ov, v0 - ov, u1 + ov, v1 + ov, top - 0.05, r.slope ?? 0.35, { yTop: r.yTop ?? Infinity }); K.box(M.concreteDark, u0, top - 0.3, v0, u1, top, v1); if (sp.parapetHip) for (const f of Object.keys(runs)) K.rbox(runs[f], mat, -0.05, top - 0.2, -0.3, runs[f].L + 0.05, top + sp.parapetHip, 0.02); }
  else { K.box(r.mat || M.concreteDark, u0 + 0.2, top - 0.4, v0 + 0.2, u1 - 0.2, top - 0.1, v1 - 0.2); if (r.parapet) for (const f of Object.keys(runs)) K.rbox(runs[f], mat, -0.1, top - 0.2, -0.35, runs[f].L + 0.1, top + r.parapet, 0.02); }
  return runs;
}
