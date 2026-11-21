// rc-finish: ground-floor "finishing" helpers for refine-central buildings (works with classic-kit's Kit and every kit that
// re-exports it). Entrances with glazed doors, steps seated on the terrain, wall lanterns, building-name signs, bike racks,
// planters with shrubs, campus lamp posts, rooftop mechanical units and downspouts. All geometry goes through K.box/K.rbox/
// K.add so it merges per material; small pieces are flagged detail so the engine can drop them at distance.
// Glass uses the shared M.windowNight (so it picks up the shared window shader); lamps use M.lampGlow.
import * as THREE from 'three';

const _mats = new Map();
function local(key, make) { if (!_mats.has(key)) _mats.set(key, make()); return _mats.get(key); }
export function shrubMat() { return local('shrub', () => { const m = new THREE.MeshStandardMaterial({ color: 0x3f5f2e, roughness: 0.95, flatShading: true }); m.name = 'rc-shrub'; return m; }); }
export function shrubMat2() { return local('shrub2', () => { const m = new THREE.MeshStandardMaterial({ color: 0x55703a, roughness: 0.95, flatShading: true }); m.name = 'rc-shrub2'; return m; }); }
export function galvMat() { return local('galv', () => { const m = new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.45, metalness: 0.7 }); m.name = 'rc-galv'; return m; }); }
export function hvacMat() { return local('hvac', () => { const m = new THREE.MeshStandardMaterial({ color: 0xc9ccc9, roughness: 0.55, metalness: 0.35 }); m.name = 'rc-hvac'; return m; }); }
export function membraneMat() { return local('membrane', () => { const m = new THREE.MeshStandardMaterial({ color: 0x9c9a94, roughness: 0.95 }); m.name = 'rc-membrane'; return m; }); }
export function signMat(text, { bg = '#1f2a36', fg = '#f2efe6', w = 1024, h = 160, font = 'Georgia, serif', weight = '600', border = null } = {}) {
  return local('sign:' + text + bg + fg + w + h + font + weight + border, () => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = border; g.lineWidth = Math.max(3, h * 0.04); g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12); }
    let fs = h * 0.56; g.font = `${weight} ${fs}px ${font}`; let tw = g.measureText(text).width;
    if (tw > w * 0.9) { fs *= w * 0.9 / tw; g.font = `${weight} ${fs}px ${font}`; }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + fs * 0.04);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.1 }); m.name = 'rc-sign'; return m;
  });
}

// ground height under run position s at distance d in front of the face
export function gAt(K, R, s, d = 1.2) { const p = R.at(s, d); return K.g(p[0], p[1]); }

// Plain face-mounted sign panel (canvas lettering) on run R, centred at s, bottom at y.
export function sign(K, R, s, y, w, h, text, opts = {}) {
  const m = signMat(text, { w: 1024, h: Math.max(96, Math.round(1024 * h / w)), ...opts });
  const d = (opts.d ?? 0.0) + 0.06;
  const g = new THREE.PlaneGeometry(w, h); g.translate(s, y + h / 2, d + 0.004);
  K.addRun(R, m, g, { uvMode: 'keep' });
  K.rbox(R, opts.backMat || K.M.darkBronze, s - w / 2 - 0.03, y - 0.03, d - 0.06, s + w / 2 + 0.03, y + h + 0.03, d, { detail: true });
}

// Wall lantern (sconce) centred at s, height y, on run R.
export function wallLamp(K, R, s, y, { mat, style = 'lantern' } = {}) {
  const M = K.M; const fr = mat || M.iron;
  K.rbox(R, fr, s - 0.09, y - 0.14, 0, s + 0.09, y + 0.14, 0.04, { detail: true }); // back plate
  K.rbox(R, fr, s - 0.025, y - 0.02, 0.03, s + 0.025, y + 0.02, 0.24, { detail: true }); // arm
  if (style === 'lantern') {
    K.rbox(R, M.lampGlow, s - 0.11, y - 0.32, 0.2, s + 0.11, y + 0.02, 0.42, { detail: true });
    K.rbox(R, fr, s - 0.14, y + 0.02, 0.17, s + 0.14, y + 0.08, 0.45, { detail: true });
    K.rbox(R, fr, s - 0.06, y + 0.08, 0.25, s + 0.06, y + 0.16, 0.37, { detail: true });
    K.rbox(R, fr, s - 0.09, y - 0.36, 0.23, s + 0.09, y - 0.32, 0.39, { detail: true });
  } else { // modern cylinder up/down light
    K.rbox(R, fr, s - 0.07, y - 0.22, 0.05, s + 0.07, y + 0.22, 0.2, { detail: true });
    K.rbox(R, M.lampGlow, s - 0.05, y - 0.24, 0.07, s + 0.05, y - 0.22, 0.18, { detail: true });
  }
}

// Steps from the ground up to floor level y, in front of run R between s0..s1 (climbing toward the wall), optional cheek walls
// and handrails. Returns a walkable (fn) for the player.
export function frontSteps(K, R, s0, s1, y, { mat, cheek = null, rail = true, riser = 0.16, tread = 0.34, land = 1.2, d0 = 0 } = {}) {
  const M = K.M; mat = mat || M.granite;
  const g = Math.min(gAt(K, R, s0, d0 + 2), gAt(K, R, s1, d0 + 2), gAt(K, R, (s0 + s1) / 2, d0 + 2));
  const H = y - g; const n = Math.max(0, Math.round(H / riser)); const r = n ? H / n : 0;
  // landing slab
  K.rbox(R, mat, s0, g - 0.6, d0, s1, y, d0 + land);
  for (let i = 0; i < n; i++) { const top = y - r * (i + 1); if (top <= g - 0.02) break; K.rbox(R, mat, s0, g - 0.6, d0 + land + tread * i, s1, top, d0 + land + tread * (i + 1)); }
  const D = d0 + land + tread * n;
  if (cheek && n > 1) for (const s of [s0 - 0.35, s1]) K.rbox(R, cheek, s, g - 0.6, d0, s + 0.35, y + 0.45, D);
  if (rail && n > 2) for (const s of [s0 + 0.25, s1 - 0.25]) { // sloped handrail approximated by posts + a top rail per flight
    for (let k = 0; k <= 2; k++) { const dd = d0 + land + (D - d0 - land) * k / 2; const yy = y - (H * k / 2); K.rbox(R, M.iron, s - 0.025, yy, dd - 0.025, s + 0.025, yy + 0.9, dd + 0.025, { detail: true }); }
    const len = Math.hypot(D - d0 - land, H); const gg = new THREE.BoxGeometry(0.05, 0.05, len); gg.rotateX(-Math.atan2(H, D - d0 - land)); gg.translate(s, y - H / 2 + 0.9, (d0 + land + D) / 2);
    K.addRun(R, M.iron, gg, { detail: true });
  }
  // walkable: linear ramp approximation of the stair
  const heightAtUV = (u, v) => {
    // project (u,v) into run coords
    const du = u - R.a[0], dv = v - R.a[1]; const s = du * R.t[0] + dv * R.t[1]; const d = du * R.n[0] + dv * R.n[1];
    if (s < s0 - 0.05 || s > s1 + 0.05 || d < d0 - 0.05 || d > D + 0.05) return null;
    if (d <= d0 + land) return y; const k = Math.min(n, Math.floor((d - d0 - land) / tread)); return y - r * (k + 1) + r;
  };
  const cs = [R.at(s0, d0), R.at(s1, d0), R.at(s1, D), R.at(s0, D)];
  const us = cs.map((c) => c[0]), vs = cs.map((c) => c[1]);
  return K.walkFn(Math.min(...us), Math.min(...vs), Math.max(...us), Math.max(...vs), heightAtUV);
}

// A finished entrance on run R centred at s: recessed opening through a surround, glazed double doors (aluminium or bronze
// frames, push bars), transom, optional canopy, lanterns either side, building-name sign above, steps down to the ground.
// y = door sill (finished floor). Returns { walk } (a walkable for the steps or null).
export function entry(K, R, s, y, {
  w = 2.4, h = 2.4, transom = 0.7, rec = 0.45, surround = null, surroundW = 0.45, surroundP = 0.12, frame = null, glass = null,
  canopy = null, canopyD = 1.6, lamps = 'lantern', lampMat = null, signText = null, signOpts = {}, steps = true, stepMat = null, cheek = null,
  leaves = 2, mat = null,
} = {}) {
  const M = K.M; frame = frame || M.darkBronze; glass = glass || M.windowNight;
  const s0 = s - w / 2, s1 = s + w / 2, yT = y + h + transom;
  // dark reveal box (the wall behind has no hole; we sit a recess box proud of it so it reads deep)
  if (surround) {
    K.rbox(R, surround, s0 - surroundW, y - 0.05, 0, s0, yT + surroundW * 0.8, surroundP);
    K.rbox(R, surround, s1, y - 0.05, 0, s1 + surroundW, yT + surroundW * 0.8, surroundP);
    K.rbox(R, surround, s0 - surroundW - 0.08, yT, 0, s1 + surroundW + 0.08, yT + surroundW * 0.8, surroundP + 0.04);
    K.rbox(R, surround, s0 - surroundW - 0.16, yT + surroundW * 0.8, 0, s1 + surroundW + 0.16, yT + surroundW * 0.8 + 0.14, surroundP + 0.14);
  }
  // reveal returns + soffit (shadowed)
  const rv = mat || M.concreteDark;
  K.rbox(R, rv, s0 - 0.02, y, -rec, s0 + 0.02, yT, surround ? surroundP : 0.02, { detail: true });
  K.rbox(R, rv, s1 - 0.02, y, -rec, s1 + 0.02, yT, surround ? surroundP : 0.02, { detail: true });
  // glass doors + transom
  K.rbox(R, glass, s0, y, -rec - 0.04, s1, yT, -rec);
  const fw = 0.07, fd = 0.08;
  K.rbox(R, frame, s0, y, -rec, s0 + fw, yT, -rec + fd); K.rbox(R, frame, s1 - fw, y, -rec, s1, yT, -rec + fd);
  K.rbox(R, frame, s0, yT - fw, -rec, s1, yT, -rec + fd); K.rbox(R, frame, s0, y + h - fw / 2, -rec, s1, y + h + fw / 2, -rec + fd);
  K.rbox(R, frame, s0, y, -rec, s1, y + 0.18, -rec + fd); // kick plates
  const lw = w / leaves;
  for (let i = 1; i < leaves; i++) K.rbox(R, frame, s0 + lw * i - 0.05, y, -rec, s0 + lw * i + 0.05, y + h, -rec + fd);
  for (let i = 0; i < leaves; i++) { const cxs = s0 + lw * (i + 0.5); const side = i % 2 ? -1 : 1; K.rbox(R, M.iron, cxs + side * lw * 0.28 - 0.02, y + 0.9, -rec + fd, cxs + side * lw * 0.28 + 0.02, y + 1.15, -rec + fd + 0.06, { detail: true }); }
  for (let i = 0; i < leaves; i++) K.rbox(R, galvMat(), s0 + lw * i + 0.12, y + 0.95, -rec + fd + 0.04, s0 + lw * (i + 1) - 0.12, y + 1.0, -rec + fd + 0.08, { detail: true }); // push bars
  // threshold
  K.rbox(R, stepMat || M.granite, s0 - 0.1, y - 0.3, -rec, s1 + 0.1, y, 0.05);
  if (canopy) {
    const cy = yT + (surround ? surroundW * 0.8 + 0.2 : 0.15);
    K.rbox(R, canopy, s0 - 0.6, cy, 0, s1 + 0.6, cy + 0.18, canopyD);
    K.rbox(R, M.lampGlow, s - 0.25, cy - 0.01, canopyD * 0.4, s + 0.25, cy, canopyD * 0.6, { detail: true });
    for (const ss of [s0 - 0.45, s1 + 0.45]) K.rbox(R, M.iron, ss - 0.015, cy + 0.18, 0, ss + 0.015, cy + 1.2, 0.03, { detail: true });
  }
  if (lamps) { const off = (surround ? surroundW : 0) + 0.45; for (const ss of [s0 - off, s1 + off]) wallLamp(K, R, ss, y + 2.2, { style: lamps, mat: lampMat }); }
  if (signText) {
    const sw = Math.min(Math.max(w + 1.2, signText.length * 0.26), w + 4), sh = signOpts.h ?? 0.42;
    const sy = canopy ? yT + (surround ? surroundW * 0.8 + 0.2 : 0.15) + 0.35 : yT + (surround ? surroundW * 0.8 + 0.3 : 0.2);
    sign(K, R, s, sy, signOpts.w ?? sw, sh, signText, { d: surround ? surroundP + 0.14 : 0, ...signOpts });
  }
  let walk = null;
  if (steps) {
    const gg = gAt(K, R, s, 2.2);
    if (y - gg > 0.12) walk = frontSteps(K, R, s0 - 0.5, s1 + 0.5, y, { mat: stepMat || M.granite, cheek, d0: surround ? surroundP : 0 });
    else K.rbox(R, stepMat || M.granite, s0 - 0.6, Math.min(gg, y) - 0.5, 0, s1 + 0.6, y, 1.4); // apron slab
  }
  return { walk };
}

// Inverted-U bike rack row starting at (u,v) along angle rot (radians, building frame), n staples at 0.9 m.
export function bikeRack(K, u, v, rot, n = 4) {
  const M = K.M; const m = galvMat(); const ca = Math.cos(rot), sa = Math.sin(rot); const y0 = K.g(u, v);
  for (let i = 0; i < n; i++) {
    const cu = u + ca * 0.9 * i, cv = v + sa * 0.9 * i;
    // staple: two legs + top bar, perpendicular to the row
    const pu = -sa, pv = ca;
    for (const k of [-0.32, 0.32]) K.cyl(m, cu + pu * k, y0 - 0.2, cv + pv * k, 0.025, 0.025, 1.05, 6, { detail: true });
    K.obox(m, cu, y0 + 0.85, cv, 0.05, 0.05, 0.69, rot, { detail: true });
  }
  void M;
}

// Concrete planter (u0,v0)-(u1,v1) with soil and a row of low shrubs.
export function planter(K, u0, v0, u1, v1, { h = 0.55, mat = null, shrubs = true, y = null } = {}) {
  const M = K.M; mat = mat || M.concrete;
  const g = y ?? Math.min(K.g(u0, v0), K.g(u1, v1), K.g(u0, v1), K.g(u1, v0));
  const t = 0.15;
  K.box(mat, u0, g - 0.4, v0, u1, g + h, v0 + t); K.box(mat, u0, g - 0.4, v1 - t, u1, g + h, v1);
  K.box(mat, u0, g - 0.4, v0 + t, u0 + t, g + h, v1 - t); K.box(mat, u1 - t, g - 0.4, v0 + t, u1, g + h, v1 - t);
  K.box(M.soil, u0 + t, g - 0.4, v0 + t, u1 - t, g + h - 0.08, v1 - t);
  if (shrubs) shrubRow(K, u0 + t + 0.2, v0 + t + 0.2, u1 - t - 0.2, v1 - t - 0.2, g + h - 0.1);
}
// Low clipped shrubs filling a rectangle (flat-shaded icosahedra), at base height y (default ground).
export function shrubRow(K, u0, v0, u1, v1, y = null, { size = 0.55, h = 0.8 } = {}) {
  const L = Math.max(u1 - u0, v1 - v0); const along = (u1 - u0) >= (v1 - v0); const n = Math.max(1, Math.round(L / (size * 1.5)));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n; const u = along ? u0 + (u1 - u0) * t : (u0 + u1) / 2, v = along ? (v0 + v1) / 2 : v0 + (v1 - v0) * t;
    const yy = y ?? K.g(u, v); const r = size * (0.85 + 0.3 * ((i * 7919) % 13) / 13);
    const g = new THREE.IcosahedronGeometry(r, 1); g.scale(1.25, h / (2 * r), 1.1); g.translate(u, yy + h * 0.45, v);
    K.add(i % 3 ? shrubMat() : shrubMat2(), g, { detail: true, uvMode: 'keep' });
  }
}
// Campus lamp post (black/dark green pole, lantern head), at ground under (u,v).
export function lampPost(K, u, v, { h = 4.2, mat = null, style = 'lantern' } = {}) {
  const M = K.M; const m = mat || M.lampGreen; const y = K.g(u, v);
  K.cyl(m, u, y - 0.3, v, 0.16, 0.14, 0.9, 10, { detail: true });
  K.cyl(m, u, y + 0.6, v, 0.07, 0.055, h - 0.6, 8, { detail: true });
  if (style === 'lantern') {
    K.cyl(m, u, y + h, v, 0.14, 0.2, 0.08, 8, { detail: true });
    K.cyl(M.lampGlow, u, y + h + 0.08, v, 0.15, 0.2, 0.5, 8, { detail: true });
    K.cyl(m, u, y + h + 0.58, v, 0.24, 0.06, 0.22, 8, { detail: true });
  } else {
    K.box(m, u - 0.3, y + h, v - 0.12, u + 0.3, y + h + 0.12, v + 0.12, { detail: true });
    K.box(M.lampGlow, u - 0.25, y + h - 0.01, v - 0.09, u + 0.25, y + h, v + 0.09, { detail: true });
  }
}
// Rooftop packaged HVAC unit with louvres and a fan disc; (u,v) centre, y = roof deck.
export function rooftopUnit(K, u, v, y, { w = 2.4, d = 1.4, h = 1.2, rot = 0 } = {}) {
  const m = hvacMat(); const M = K.M;
  K.obox(m, u, y + h / 2, v, w, h, d, rot);
  K.obox(M.concreteDark, u, y + 0.08, v, w + 0.3, 0.16, d + 0.3, rot);
  const ca = Math.cos(rot), sa = Math.sin(rot);
  for (const k of [-0.5, 0.5]) { const fu = u + ca * k * w * 0.5, fv = v + sa * k * w * 0.5; K.cyl(M.iron, fu, y + h, fv, d * 0.32, d * 0.32, 0.12, 12, { detail: true }); }
  for (let i = 0; i < 6; i++) { const t = -0.4 + 0.8 * i / 5; K.obox(M.iron, u + ca * t * w, y + h * 0.45, v + sa * t * w, 0.03, h * 0.6, d + 0.02, rot, { detail: true }); }
}
// Lab exhaust stack / vent pipe
export function stack(K, u, v, y, { r = 0.3, h = 2.5, mat = null } = {}) { const m = mat || galvMat(); K.cyl(m, u, y, v, r, r, h, 12); K.cyl(K.M.iron, u, y + h, v, r * 1.05, r * 1.05, 0.08, 12, { detail: true }); }
// Downspout on run R at s from y1 down to ground
export function downspout(K, R, s, y1, { mat = null } = {}) { const g = gAt(K, R, s, 0.2); K.rbox(R, mat || K.M.iron, s - 0.06, g, 0.02, s + 0.06, y1, 0.14, { detail: true }); K.rbox(R, mat || K.M.iron, s - 0.09, g, 0.02, s + 0.09, g + 0.3, 0.3, { detail: true }); }
// Simple metal railing along a run (posts + top + mid rails) at base height y.
export function railing(K, R, s0, s1, y, { d = 0.1, h = 1.05, pitch = 1.5, mat = null, pickets = 0 } = {}) {
  const m = mat || K.M.iron; const n = Math.max(1, Math.round((s1 - s0) / pitch));
  for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, m, s - 0.025, y, d - 0.025, s + 0.025, y + h, d + 0.025, { detail: true }); }
  K.rbox(R, m, s0, y + h - 0.05, d - 0.03, s1, y + h, d + 0.03, { detail: true }); K.rbox(R, m, s0, y + h * 0.45, d - 0.015, s1, y + h * 0.45 + 0.03, d + 0.015, { detail: true });
  if (pickets) for (let s = s0 + pickets; s < s1; s += pickets) K.rbox(R, m, s - 0.01, y + 0.1, d - 0.01, s + 0.01, y + h - 0.05, d + 0.01, { detail: true });
}
