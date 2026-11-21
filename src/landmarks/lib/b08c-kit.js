// Shared helpers for batch b08c (hill dorms): Spanish-Revival stucco blocks (International House), lettering panels,
// tile-capped chimneys, simple shed roofs and steps. Built on classic-kit's Kit (building frame u,v,y; merged per material).
import * as THREE from 'three';
import { classicBlock, polysGeo } from './classic-kit.js';
import { canvasTex } from './venue-util.js';

const _mats = new WeakMap();
// Local materials shared by this batch (created once per shared material library)
export function bmats(M) {
  if (_mats.has(M)) return _mats.get(M);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const tinted = (base, color, rough) => { const m = base.clone(); m.color = new THREE.Color(color); if (rough != null) m.roughness = rough; return m; };
  const o = {
    frameDark: std({ color: 0x4a4540, roughness: 0.6 }),         // dark steel/bronze-painted sash
    frameGrey: std({ color: 0x6f7377, roughness: 0.55 }),
    woodMauve: std({ color: 0x77706f, roughness: 0.8 }),         // painted Monterey gallery
    voidDark: std({ color: 0x1c1b1a, roughness: 0.95 }),         // deep openings (belfry)
    stuccoWarm: tinted(M.stuccoWhite, 0xfff1d6),                 // smooth warm cream stucco (I-House)
    stuccoDome: tinted(M.stuccoWhite, 0xfdf0da),
    stuccoShade: tinted(M.stucco, 0xe4dccd),
    brickPave: tinted(M.brick, 0xd8b0a0, 0.9),
    sternWall: tinted(M.stuccoWhite, 0xf0c862),                  // ochre-yellow stucco (Stern Hall)
    sternRed: tinted(M.stuccoWhite, 0xb4574a),                   // oxide-red accent volume
    sternRoof: tinted(M.concrete, 0x7d8a80),                     // grey-green low roof
    teal: std({ color: 0x5e8c7a, roughness: 0.6 }),              // thin eave fascias
    paleBlue: std({ color: 0x8fb0c9, roughness: 0.5 }),          // window frames
    gothWall: tinted(M.concrete, 0xd4d0c4),                         // board-formed concrete imitating ashlar (Bowles)
    gothTrim: tinted(M.concrete, 0xe2ddd0),
    tudorTile: tinted(M.shingle, 0xb05a44, 0.85),                  // variegated flat clay tile
  };
  _mats.set(M, o);
  return o;
}

// Spanish-Revival stucco block: storeys of punched windows, small stucco cornice, red tile hip roof.
// sp: {u0,u1,v0,v1, eave, ridge, faces, bay, fh, base, win:{w,h,mull,tran,arch}, topWin, frame, roof:'hip'|'flat'|false}
export function stuccoBlock(K, sp) {
  const M = K.M; const B = bmats(M);
  const gmin = K.gMin(sp.u0, sp.v0, sp.u1, sp.v1, 4);
  const y0 = sp.y0 ?? gmin - 1.5;
  const fh = sp.fh ?? 3.1;
  const base = sp.base ?? gmin + 0.15;
  const mat = sp.mat || B.stuccoWarm;
  const stories = [{ y0, y1: base + 0.6, mat }];
  const top = sp.eave - 0.5;
  let y = base + 0.6;
  const n = Math.max(1, Math.round((top - y) / fh));
  const h = (top - y) / n;
  const win = sp.win || { w: 1.15, h: 1.6, mull: 0, tran: 0.55 };
  for (let i = 0; i < n; i++) {
    const w = (i === n - 1 && sp.topWin) ? sp.topWin : (i === 0 && sp.groundWin) ? sp.groundWin : win;
    const hh = Math.min(w.h, h - 0.6);
    stories.push({ y0: y, y1: y + h, mat, win: { sill: w.sill ?? Math.max(0.35, (h - hh) * 0.55), h: hh, w: w.w, mull: w.mull ?? 0, tran: w.tran, arch: w.arch, muntins: w.muntins } });
    y += h;
  }
  if (y < sp.eave) stories.push({ y0: y, y1: sp.eave, mat });
  const ov = sp.overhang ?? 0.55;
  const span = Math.min(sp.u1 - sp.u0, sp.v1 - sp.v0) / 2 + ov;
  const slope = sp.ridge ? Math.max(0.05, (sp.ridge - sp.eave) / span) : 0.45;
  const roof = sp.roof === false ? null : sp.roof === 'flat' ? { type: 'flat', mat: sp.roofMat || M.concreteDark, parapet: sp.parapet ?? 0.6 }
    : sp.roof === 'gable' ? { type: 'gable', rise: (sp.ridge ?? sp.eave + 3) - sp.eave, axis: sp.axis || 'u', overhang: ov, mat: sp.roofMat || M.redTile, wallMat: mat }
    : { type: 'hip', slope, overhang: ov, mat: sp.roofMat || M.redTile, hipU: sp.hipU ?? true, hipV: sp.hipV ?? true };
  const runs = classicBlock(K, {
    u0: sp.u0, u1: sp.u1, v0: sp.v0, v1: sp.v1, y0, eave: sp.eave, stories, bay: sp.bay ?? 3.3, faces: sp.faces,
    frame: sp.frame || B.frameDark, depth: sp.depth ?? 0.4,
    cornice: sp.cornice === false ? { H: 0 } : { mat: sp.corniceMat || mat, P: sp.corniceP ?? 0.32, H: sp.corniceH ?? 0.42, frieze: false }, roof,
  });
  if (roof && roof.type === 'hip' && roof.hipU === false) { // gable end walls when the hip is suppressed along u
    // (not used by default)
  }
  return { runs, stories, gmin };
}

// Mono-pitch (shed) roof over [u0,u1]x[v0,v1]; high edge along `hi` side ('u0'|'u1'|'v0'|'v1') at yHi, low edge at yLo.
export function shedRoof(K, mat, u0, v0, u1, v1, yLo, yHi, hi, { thick = 0.18, rafters = 0, rafterMat = null } = {}) {
  const P = (u, v) => {
    let t; // 0 at low edge → 1 at high edge
    if (hi === 'u1') t = (u - u0) / (u1 - u0); else if (hi === 'u0') t = (u1 - u) / (u1 - u0);
    else if (hi === 'v1') t = (v - v0) / (v1 - v0); else t = (v1 - v) / (v1 - v0);
    return [u, yLo + (yHi - yLo) * t, v];
  };
  const top = [P(u0, v0), P(u0, v1), P(u1, v1), P(u1, v0)];
  K.add(mat, polysGeo([top]), { uvMode: 'roof' });
  const bot = top.map(([x, y, z]) => [x, y - thick, z]).reverse();
  K.add(mat, polysGeo([bot]), { uvMode: 'roof' });
  // edge fascia
  const e = (a, b) => [a, b, [b[0], b[1] - thick, b[2]], [a[0], a[1] - thick, a[2]]];
  K.add(mat, polysGeo([e(top[1], top[0]), e(top[2], top[1]), e(top[3], top[2]), e(top[0], top[3])]), { uvMode: 'roof' });
  if (rafters && rafterMat) { // exposed rafter tails along the low edge
    const along = hi === 'u0' || hi === 'u1' ? 'v' : 'u';
    const n = Math.floor(((along === 'v' ? v1 - v0 : u1 - u0)) / rafters);
    for (let i = 0; i <= n; i++) {
      const s = (along === 'v' ? v0 : u0) + i * rafters;
      const lowU = hi === 'u1' ? u0 : hi === 'u0' ? u1 : null, lowV = hi === 'v1' ? v0 : hi === 'v0' ? v1 : null;
      if (along === 'v') K.box(rafterMat, lowU - 0.05 - (hi === 'u1' ? 0 : -0.1) , yLo - thick - 0.16, s - 0.06, lowU + 0.05 + (hi === 'u1' ? 0.0 : 0.1), yLo - thick, s + 0.06, { detail: true });
      else K.box(rafterMat, s - 0.06, yLo - thick - 0.16, lowV - 0.05, s + 0.06, yLo - thick, lowV + 0.05, { detail: true });
    }
  }
}

// Stucco chimney with a small tile hip cap
export function chimney(K, u, v, yB, yT, w = 1.0, d = 0.7, mat = null) {
  const M = K.M; const m = mat || bmats(M).stuccoWarm;
  K.box(m, u - w / 2, yB, v - d / 2, u + w / 2, yT, v + d / 2);
  K.box(m, u - w / 2 - 0.08, yT, v - d / 2 - 0.08, u + w / 2 + 0.08, yT + 0.15, v + d / 2 + 0.08);
  // pierced vent openings suggested by dark slots + tile cap
  K.box(bmats(M).voidDark, u - w / 2 + 0.15, yT + 0.15, v - d / 2 + 0.1, u + w / 2 - 0.15, yT + 0.45, v + d / 2 - 0.1);
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box(m, u + a * (w / 2 - 0.07) - 0.07, yT + 0.15, v + b * (d / 2 - 0.07) - 0.07, u + a * (w / 2 - 0.07) + 0.07, yT + 0.45, v + b * (d / 2 - 0.07) + 0.07);
  K.hip(M.redTile, u - w / 2 - 0.18, v - d / 2 - 0.18, u + w / 2 + 0.18, v + d / 2 + 0.18, yT + 0.45, 0.5);
}

// Lettering panel: a plane with canvas text (alpha) placed on run R at s-centre `s`, baseline y, width w, height h, offset d.
export function letterPanel(K, R, text, s, y, w, h, d = 0.03, { color = '#8a7f6a', font = 'bold 120px Georgia, serif', spacing = 0.18, shadow = '#5e5546' } = {}) {
  const tex = canvasTex(2048, 256, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
    if ('letterSpacing' in c) c.letterSpacing = `${Math.round(spacing * 100)}px`;
    c.fillStyle = shadow; c.fillText(text, W / 2 + 4, H / 2 + 5);
    c.fillStyle = color; c.fillText(text, W / 2, H / 2);
  });
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.35, roughness: 0.9 });
  const g = new THREE.PlaneGeometry(w, h); g.translate(s, y + h / 2, d);
  g.applyMatrix4(R.m);
  const mesh = new THREE.Mesh(g, mat); mesh.userData.detail = true;
  K.extra.push(mesh);
  return mesh;
}

// Straight flight of steps (wraps Kit.stairs) — returns a walkable
export function steps(K, mat, u0, v0, u1, v1, yLo, yHi, dir, rise = 0.16) {
  const n = Math.max(2, Math.round((yHi - yLo) / rise));
  return K.stairs(mat, u0, v0, u1, v1, yLo, yHi, dir, n);
}

// ---------- Collegiate Gothic helpers (Bowles Hall) ----------
// Parapet cross-gable on façade run R centred at s: gable wall (with an attic window) rising from yE to yE+rise,
// slightly proud of the face, stone coping on the rakes, and a small gable roof running `back` metres into the main roof.
export function crossGable(K, R, s, w, yE, rise, back, roofMat, wallMat, copeMat, { win = true, proud = 0.25, glass = null, frame = null } = {}) {
  const sh = new THREE.Shape(); sh.moveTo(s - w / 2, yE - 0.4); sh.lineTo(s + w / 2, yE - 0.4); sh.lineTo(s + w / 2, yE); sh.lineTo(s, yE + rise); sh.lineTo(s - w / 2, yE); sh.lineTo(s - w / 2, yE - 0.4);
  const wo = win ? { s0: s - Math.min(0.75, w * 0.18), s1: s + Math.min(0.75, w * 0.18), y0: yE + 0.25, y1: yE + Math.min(rise * 0.55, 2.0) } : null;
  if (wo) { const h = new THREE.Path(); h.moveTo(wo.s0, wo.y0); h.lineTo(wo.s1, wo.y0); h.lineTo(wo.s1, wo.y1); h.lineTo(wo.s0, wo.y1); h.lineTo(wo.s0, wo.y0); sh.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: false }); g.translate(0, 0, proud - 0.7);
  K.addRun(R, wallMat, g);
  if (wo) K.fill(R, wo, { glass, frame: frame || bmats(K.M).frameDark, mull: 1, rev: 0.45 - proud, tran: [wo.y0 + (wo.y1 - wo.y0) * 0.6] });
  // copings
  const L = Math.hypot(w / 2, rise), a = Math.atan2(rise, w / 2);
  for (const sg of [-1, 1]) {
    const bg = new THREE.BoxGeometry(L + 0.35, 0.28, 0.85); bg.rotateZ(sg * -a); bg.translate(s + sg * w / 4, yE + rise / 2 + 0.12, proud - 0.32);
    K.addRun(R, copeMat, bg);
    K.rbox(R, copeMat, s + sg * w / 2 - (sg > 0 ? 0.55 : -0.0) - (sg < 0 ? 0 : 0), yE - 0.5, proud - 0.75, s + sg * w / 2 + (sg < 0 ? 0.55 : 0), yE + 0.1, proud + 0.08);
  }
  K.rbox(R, copeMat, s - 0.22, yE + rise - 0.1, proud - 0.7, s + 0.22, yE + rise + 0.45, proud + 0.02);
  // small roof behind the gable
  const ov = 0.1, yR = yE + rise - 0.25;
  const P = (x, y, z) => [x, y, z];
  const q1 = [P(s - w / 2 + 0.05, yE - 0.05, proud - 0.6), P(s, yR, proud - 0.6), P(s, yR, -back), P(s - w / 2 + 0.05, yE - 0.05, -back)];
  const q2 = [P(s, yR, proud - 0.6), P(s + w / 2 - 0.05, yE - 0.05, proud - 0.6), P(s + w / 2 - 0.05, yE - 0.05, -back), P(s, yR, -back)];
  const rg = polysGeo([q1.slice().reverse(), q2.slice().reverse()]); rg.applyMatrix4(R.m); K.add(roofMat, rg, { uvMode: 'roof' });
  void ov;
}
// Battlemented parapet along run R: solid parapet to y0+h0 then merlons of width mw at pitch.
export function battlement(K, R, mat, s0, s1, y0, h0 = 0.8, mh = 0.7, mw = 0.7, pitch = 1.3, d0 = -0.45, d1 = 0.1) {
  K.rbox(R, mat, s0, y0, d0, s1, y0 + h0, d1);
  const n = Math.max(1, Math.round((s1 - s0) / pitch));
  for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; const a = Math.max(s0, s - mw / 2), b = Math.min(s1, s + mw / 2); K.rbox(R, mat, a, y0 + h0, d0, b, y0 + h0 + mh, d1); }
}
