// Shared helpers for batch b05a (southeast campus: Kroeber, Law, Durant, Moses, Old Art Gallery, Anthony, Goldman...).
// Built on classic-kit's Kit (building frame u/v, merged per material).
import * as THREE from 'three';

// Campus lamp standard (black cast iron, glass lantern) at (u,v) on the terrain.
export function campusLamp(K, u, v, { h = 3.6, mat } = {}) {
  const M = K.M; const g0 = K.g(u, v); const I = mat || M.iron;
  K.cyl(I, u, g0, v, 0.17, 0.13, 0.55, 10, { detail: true });
  K.cyl(I, u, g0 + 0.55, v, 0.075, 0.055, h - 0.6, 8, { detail: true });
  K.lathe(M.lampGlow, [[0.05, 0], [0.2, 0.12], [0.24, 0.4], [0.18, 0.62], [0.001, 0.7]], u, g0 + h, v, 10, { detail: true });
  K.cyl(I, u, g0 + h + 0.66, v, 0.08, 0.02, 0.18, 8, { detail: true });
}

// A paved / planted strip draped over the terrain along a polyline of building-frame points (closed if `closed`).
// width extends outward to the LEFT normal convention of runs (outside of a footprint walked like classicBlock faces).
export function drapeStrip(K, pts, width, mat, { closed = true, lift = 0.04, step = 1.5, inner = 0 } = {}) {
  const pos = [];
  const n = pts.length, segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; const nn = [-t[1], t[0]];
    const k = Math.max(1, Math.ceil(L / step));
    for (let j = 0; j < k; j++) {
      const s0 = (L * j) / k, s1 = (L * (j + 1)) / k;
      const P = (s, d) => { const u = a[0] + t[0] * s + nn[0] * d, v = a[1] + t[1] * s + nn[1] * d; return [u, K.g(u, v) + lift, v]; };
      const A = P(s0, inner), B = P(s1, inner), C = P(s1, width), D = P(s0, width);
      pos.push(...A, ...C, ...B, ...A, ...D, ...C);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  // make sure faces point up
  const p = g.attributes.position; const nr = g.attributes.normal;
  if (nr.getY(0) < 0) { for (let i = 0; i < p.count; i += 3) { const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1); p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, x, y, z); } g.computeVertexNormals(); }
  K.add(mat, g);
}

// Low clipped shrubs (lumpy boxes) along a run-like segment in building frame, offset outward by d.
export function shrubRow(K, a, b, d, { h = 0.9, w = 1.1, gap = 0.2, mat } = {}) {
  const M = K.M; const S = mat || K.shrubMat || (K.shrubMat = (() => { const m = M.turf.clone(); m.color.set(0x3f5f2c); return m; })());
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; const nn = [-t[1], t[0]];
  const k = Math.max(1, Math.floor(L / (w + gap)));
  for (let i = 0; i < k; i++) {
    const s = (L * (i + 0.5)) / k; const u = a[0] + t[0] * s + nn[0] * d, v = a[1] + t[1] * s + nn[1] * d; const g0 = K.g(u, v);
    const gg = new THREE.SphereGeometry(w * 0.55, 7, 5); gg.scale(1, h / (w * 1.1) * 1.3, 0.9); gg.translate(u, g0 + h * 0.45, v);
    K.add(S, gg, { detail: true });
  }
}

// Recessed window with frame/mullions/transom using Kit.fill, plus optional flat surround.
export function surround(K, R, mat, o, w = 0.16, p = 0.07) {
  K.rbox(R, mat, o.s0 - w, o.y0 - 0.05, 0, o.s0, o.y1 + w, p);
  K.rbox(R, mat, o.s1, o.y0 - 0.05, 0, o.s1 + w, o.y1 + w, p);
  K.rbox(R, mat, o.s0 - w, o.y1, 0, o.s1 + w, o.y1 + w, p);
}

// Local material variant (clone a shared material and tint it) — cached on the kit.
export function tint(K, base, hex, key) {
  K._tints = K._tints || {}; const k = key || (base.uuid + hex);
  if (!K._tints[k]) { const m = base.clone(); m.color = new THREE.Color(hex); K._tints[k] = m; }
  return K._tints[k];
}

// Daylight-readable window glass (grey-blue with sky reflection) that still glows warm at night like M.windowNight.
import { nightGlow } from '../../materials.js';
let _pale = null, _paleDark = null;
export function paleGlass() {
  if (!_pale) _pale = nightGlow(new THREE.MeshStandardMaterial({ color: 0x5b6a75, roughness: 0.1, metalness: 0.35, envMapIntensity: 1.4, emissive: 0xffc77a, emissiveIntensity: 1.5 }), 1.0);
  return _pale;
}
export function curtainGlass() { // darker tinted curtain-wall glass (modern buildings)
  if (!_paleDark) _paleDark = nightGlow(new THREE.MeshStandardMaterial({ color: 0x33414c, roughness: 0.06, metalness: 0.5, envMapIntensity: 1.6, emissive: 0xffd9a0, emissiveIntensity: 1.2 }), 1.0);
  return _paleDark;
}

// ---------------------------------------------------------------------------------------------------------------
// Modern flat-roofed block on a building-frame rectangle with façade presets.
// sp: {u0,u1,v0,v1, y0 (foundation), top (roof/parapet top), wall, frame, glass, roofMat, parapet (h), coping (proj),
//      floors:[{y0,y1}], bay, kind:'grid'|'ribbon'|'piers'|'blank'|'curtain', win:{w (fraction or m), h, sill},
//      faces:{S,E,N,W: false | overrides}, pier:{w,p,mat}, core:true}
// Returns runs {S,E,N,W}.
export function modBlock(K, sp) {
  const M = K.M; const { u0, u1, v0, v1 } = sp; const y0 = sp.y0 ?? -1.5; const top = sp.top;
  const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
  const runs = {};
  for (const f of ['S', 'E', 'N', 'W']) {
    const fo0 = sp.faces?.[f]; if (fo0 === false) continue;
    const fo = { ...sp, ...(fo0 || {}) };
    const R = K.run(defs[f][0], defs[f][1]); runs[f] = R;
    modFacade(K, R, 0, R.L, y0, top - (sp.parapet ?? 0.9), fo);
  }
  const ci = sp.coreInset ?? 0.7; const roofY = top - (sp.parapet ?? 0.9);
  if (sp.core !== false) K.box(M.concreteDark, u0 + ci, y0, v0 + ci, u1 - ci, roofY - 0.05, v1 - ci);
  K.box(sp.roofMat || M.concreteDark, u0 + 0.05, roofY - 0.25, v0 + 0.05, u1 - 0.05, roofY, v1 - 0.05);
  // parapet with coping
  const pm = sp.parapetMat || sp.wall || M.concrete, cp = sp.coping ?? 0.08;
  for (const f of Object.keys(runs)) { const R = runs[f]; K.rbox(R, pm, 0, roofY, -0.3, R.L, top, 0); K.rbox(R, sp.copingMat || pm, -cp, top, -0.35, R.L + cp, top + 0.12, cp); }
  return runs;
}
// One façade run segment [s0,s1] from y0 (foundation) to yTop (roof line) with a preset fenestration.
export function modFacade(K, R, s0, s1, y0, yTop, fo) {
  const M = K.M; const wall = fo.wall || M.concrete; const frame = fo.frame || M.darkBronze; const glass = fo.glass || paleGlass();
  const floors = fo.floors || []; const kind = fo.kind || 'grid'; const dep = fo.depth ?? 0.4;
  const L = s1 - s0; const nb = Math.max(1, Math.round(L / (fo.bay || 3.0))); const bw = L / nb;
  const m0 = fo.margin ?? 0; // blank margin at both ends
  const cs = []; { const n2 = Math.max(1, Math.round((L - 2 * m0) / (fo.bay || 3.0))); const b2 = (L - 2 * m0) / n2; for (let i = 0; i < n2; i++) cs.push(s0 + m0 + b2 * (i + 0.5)); }
  const b2 = cs.length > 1 ? cs[1] - cs[0] : L - 2 * m0;
  if (kind === 'blank' || !floors.length) { K.wall(R, wall, s0, s1, y0, yTop, [], dep); return cs; }
  // wall bands between floors
  let yPrev = y0; const ops = [];
  for (const fl of floors) {
    const w = fo.win?.w ? (fo.win.w <= 1 ? b2 * fo.win.w : fo.win.w) : b2 * 0.55;
    const sill = fo.win?.sill ?? 0.9; const h = Math.min(fl.y1 - fl.y0 - sill - 0.2, fo.win?.h ?? 2.0);
    if (kind === 'grid') for (const c of cs) ops.push({ s0: c - w / 2, s1: c + w / 2, y0: fl.y0 + sill, y1: fl.y0 + sill + h, mull: fo.win?.mull ?? 1, tran: fo.win?.tran });
    else if (kind === 'ribbon' || kind === 'piers' || kind === 'curtain') {
      const sy0 = kind === 'curtain' ? fl.y0 + 0.05 : fl.y0 + sill, sy1 = kind === 'curtain' ? fl.y1 - 0.05 : fl.y0 + sill + h;
      ops.push({ s0: s0 + m0 + (fo.ribbonInset ?? 0.3), s1: s1 - m0 - (fo.ribbonInset ?? 0.3), y0: sy0, y1: sy1, ribbon: true });
    }
  }
  K.wall(R, wall, s0, s1, y0, yTop, ops, dep);
  for (const o of ops) {
    if (o.ribbon) {
      const n = Math.max(1, Math.round((o.s1 - o.s0) / (fo.mullion ?? 1.5)));
      K.fill(R, o, { glass, frame, mull: n - 1, tran: fo.ribbonTran ? [o.y0 + (o.y1 - o.y0) * fo.ribbonTran] : [], rev: dep - 0.12, sillMat: fo.sillMat || wall });
    } else K.fill(R, o, { glass, frame, mull: o.mull, tran: o.tran ? [o.y0 + (o.y1 - o.y0) * o.tran] : [], rev: dep - 0.12, sillMat: fo.sillMat || wall });
  }
  if (kind === 'piers') { // vertical piers proud of the face at every bay line
    const pw = fo.pier?.w ?? 0.45, pp = fo.pier?.p ?? 0.35, pm = fo.pier?.mat || wall;
    for (let i = 0; i <= cs.length; i++) { const s = s0 + m0 + b2 * i; if (s < s0 + 0.01 || s > s1 - 0.01) continue; K.rbox(R, pm, s - pw / 2, floors[0].y0, 0, s + pw / 2, yTop, pp); }
  }
  if (fo.spandrel) for (const fl of floors) K.rbox(R, fo.spandrel.mat || wall, s0, fl.y0 - 0.1, 0, s1, fl.y0 + (fo.spandrel.h ?? 0.3), fo.spandrel.p ?? 0.12);
  return cs;
}
// Polygon walls (vertical extrusion of an outline's edges, outer face on the outline) + flat roof slab; for odd shapes.
export function polyMass(K, poly, y0, y1, mat, { roofMat, cap = 0.12, capMat } = {}) {
  const M = K.M; K.prism(mat, poly, y0, y1);
  K.prism(roofMat || M.concreteDark, poly, y1, y1 + 0.02);
  if (cap) K.loop(capMat || mat, poly, [[0.06, y1 - 0.15], [0.06, y1 + cap]]);
}

// Carved/inscribed panel: a canvas-texture plane (procedural text) on run R spanning [s0,s1] x [y0,y1], at outward offset d.
export function textPanel(K, R, s0, s1, y0, y1, d, text, { bg = '#47525c', fg = '#b9c1c8', font = 'Times New Roman, serif', px = 40, align = 'center', weight = '600', pad = 0.06, lineGap = 1.35, emissive = false } = {}) {
  const W = 1024, H = Math.round(1024 * (y1 - y0) / (s1 - s0));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // subtle stone mottling
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${0.025 + Math.random() * 0.03})`; g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 6, 2 + Math.random() * 6); }
  g.fillStyle = fg; g.textBaseline = 'top'; g.font = `${weight} ${px}px ${font}`;
  const maxW = W * (1 - 2 * pad); const paras = String(text).split('\n'); const lines = [];
  for (const p of paras) { const words = p.split(' '); let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; } lines.push(line); }
  const lh = px * lineGap; let y = Math.max(H * pad, (H - lines.length * lh) / 2);
  for (const L of lines) { const w = g.measureText(L).width; const x = align === 'center' ? (W - w) / 2 : W * pad; g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillText(L, x + 2, y + 2); g.fillStyle = fg; g.fillText(L, x, y); y += lh; }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05 });
  if (emissive) { mat.emissive = new THREE.Color(0xffffff); mat.emissiveMap = tex; mat.emissiveIntensity = 0.15; }
  const geo = new THREE.PlaneGeometry(s1 - s0, y1 - y0); geo.translate((s0 + s1) / 2, (y0 + y1) / 2, d);
  K.addRun(R, mat, geo, { uvMode: 'keep' });
  return mat;
}

// Procedural canvas "mosaic" panel (WPA-style figurative mural impression): gold ground, robed figures, tree, border.
export function mosaicPanel(K, R, s0, s1, y0, y1, d, seed = 1) {
  const W = 512, H = Math.round(512 * (y1 - y0) / (s1 - s0));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const pal = ['#c08a2e', '#b5562c', '#3e6a9a', '#6f8580', '#e3d7a6', '#a8673f', '#2a2422', '#edeae0'];
  g.fillStyle = '#d9c78a'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#e8dcb0'; g.fillRect(0, 0, W, H * 0.45); // sky
  g.fillStyle = '#6f8580'; for (let i = 0; i < 4; i++) { const x = rnd() * W, w = 40 + rnd() * 70, h = 60 + rnd() * 110; g.fillRect(x, H * 0.45 - h, w, h); }
  g.fillStyle = '#7c8f7a'; g.fillRect(0, H * 0.78, W, H * 0.22);
  // tree
  g.fillStyle = '#5b4632'; g.fillRect(W * 0.47, H * 0.35, W * 0.05, H * 0.45); g.fillStyle = '#4f6b45'; g.beginPath(); g.ellipse(W * 0.5, H * 0.32, W * 0.16, H * 0.14, 0, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 18; i++) { g.fillStyle = '#edeae0'; g.beginPath(); g.arc(W * (0.38 + rnd() * 0.24), H * (0.22 + rnd() * 0.2), 5, 0, 7); g.fill(); }
  // robed figures
  const figs = [0.14, 0.28, 0.72, 0.86];
  figs.forEach((fx, i) => { const col = pal[[0, 1, 2, 5][i]]; g.fillStyle = col; g.beginPath(); g.moveTo(W * fx - 26, H * 0.82); g.lineTo(W * fx + 26, H * 0.82); g.lineTo(W * fx + 12, H * 0.5); g.lineTo(W * fx - 12, H * 0.5); g.fill(); g.fillStyle = '#a8673f'; g.beginPath(); g.arc(W * fx, H * 0.46, 12, 0, 7); g.fill(); g.fillStyle = '#2a2422'; g.fillRect(W * fx - 12, H * 0.43, 24, 6); g.fillStyle = '#c08a2e'; g.fillRect(W * fx - 16, H * 0.52, 32, 7); });
  // tesserae grain + border
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},0.07)`; g.fillRect((rnd() * W) | 0, (rnd() * H) | 0, 3, 3); }
  for (let x = 0; x < W; x += 16) { g.fillStyle = pal[(x / 16) % 3 === 0 ? 2 : (x / 16) % 3 === 1 ? 0 : 5]; g.fillRect(x, H - 16, 14, 14); g.fillRect(x, 2, 14, 14); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.05 });
  const geo = new THREE.PlaneGeometry(s1 - s0, y1 - y0); geo.translate((s0 + s1) / 2, (y0 + y1) / 2, d);
  K.addRun(R, mat, geo, { uvMode: 'keep' });
}
// Corbelled round-arch (Lombard) brick frieze along run R between s0..s1 at height y (arches ~0.36 m), with a corbelled cornice above.
export function lombardFrieze(K, R, mat, s0, s1, y, { w = 0.38, p = 0.12 } = {}) {
  const n = Math.max(1, Math.floor((s1 - s0) / w)); const ww = (s1 - s0) / n;
  for (let i = 0; i < n; i++) {
    const a = s0 + i * ww; const sh = new THREE.Shape(); sh.moveTo(a, y); sh.lineTo(a + ww, y); sh.lineTo(a + ww, y + 0.42); sh.lineTo(a + ww - 0.06, y + 0.42);
    sh.absarc(a + ww / 2, y + 0.42 - (ww / 2 - 0.06) * 0.0, ww / 2 - 0.06, 0, Math.PI, false); sh.lineTo(a, y + 0.42); sh.lineTo(a, y);
    const hole = new THREE.Path(); hole.moveTo(a + 0.07, y); hole.lineTo(a + ww - 0.07, y); hole.lineTo(a + ww - 0.07, y + 0.3); hole.absarc(a + ww / 2, y + 0.3, ww / 2 - 0.07, 0, Math.PI, false); hole.lineTo(a + 0.07, y); sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth: p, bevelEnabled: false, curveSegments: 5 }); K.addRun(R, mat, g, { detail: true });
    K.rbox(R, mat, a + ww - 0.06, y - 0.18, 0, a + ww + 0.06, y + 0.05, p * 0.9, { detail: true }); // corbel
  }
  K.rbox(R, mat, s0, y + 0.42, 0, s1, y + 0.75, p); K.rbox(R, mat, s0 - 0.05, y + 0.75, 0, s1 + 0.05, y + 0.95, p + 0.12); K.rbox(R, mat, s0 - 0.1, y + 0.95, 0, s1 + 0.1, y + 1.1, p + 0.24);
}
