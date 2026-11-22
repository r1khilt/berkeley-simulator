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

// A finished entrance on run R centred at s. Built PROUD of the wall face (works on solid walls and over window bays):
// a projecting surround (jambs + lintel + cap) frames glazed double doors set back `rec` from the surround face, with
// transom, push bars and kick plates; optional flat canopy, lanterns either side, building-name sign, and steps/landing
// seated on the terrain. y = door sill (finished floor). Returns { walk } (walkable for the steps, or null).
export function entry(K, R, s, y, {
  w = 2.4, h = 2.4, transom = 0.7, rec = 0.38, surround = null, surroundW = 0.45, frame = null, glass = null,
  canopy = null, canopyD = 1.6, lamps = 'lantern', lampMat = null, signText = null, signOpts = {}, steps = true, stepMat = null, cheek = null,
  leaves = 2, dp = 0.16, cap = true,
} = {}) {
  const M = K.M; frame = frame || M.darkBronze; glass = glass || M.windowNight; const sur = surround || M.concreteDark;
  const s0 = s - w / 2, s1 = s + w / 2, yT = y + h + transom; const D = dp + rec; const sw = surround ? surroundW : 0.22;
  // surround: jambs, lintel, cap (proud of the wall by D)
  K.rbox(R, sur, s0 - sw, y - 0.05, 0, s0, yT + sw * 0.9, D);
  K.rbox(R, sur, s1, y - 0.05, 0, s1 + sw, yT + sw * 0.9, D);
  K.rbox(R, sur, s0, yT, 0, s1, yT + sw * 0.9, D);
  if (surround && cap) K.rbox(R, sur, s0 - sw - 0.12, yT + sw * 0.9, 0, s1 + sw + 0.12, yT + sw * 0.9 + 0.16, D + 0.12);
  // glazed doors + transom at the back of the recess
  K.rbox(R, glass, s0, y, dp, s1, yT, dp + 0.04);
  const fw = 0.07, fd = 0.08, f0 = dp + 0.04;
  K.rbox(R, frame, s0, y, f0, s0 + fw, yT, f0 + fd); K.rbox(R, frame, s1 - fw, y, f0, s1, yT, f0 + fd);
  K.rbox(R, frame, s0, yT - fw, f0, s1, yT, f0 + fd); K.rbox(R, frame, s0, y + h - fw / 2, f0, s1, y + h + fw / 2, f0 + fd);
  K.rbox(R, frame, s0, y, f0, s1, y + 0.2, f0 + fd); // kick plates
  const lw = w / leaves;
  for (let i = 1; i < leaves; i++) K.rbox(R, frame, s0 + lw * i - 0.05, y, f0, s0 + lw * i + 0.05, y + h, f0 + fd);
  for (let i = 0; i < leaves; i++) K.rbox(R, galvMat(), s0 + lw * i + 0.14, y + 0.95, f0 + fd, s0 + lw * (i + 1) - 0.14, y + 1.0, f0 + fd + 0.05, { detail: true }); // push bars
  // threshold / landing slab
  K.rbox(R, stepMat || M.granite, s0 - sw, y - 0.35, 0, s1 + sw, y, D + 0.08);
  if (canopy) {
    const cy = yT + sw * 0.9 + (surround && cap ? 0.16 : 0) + 0.12;
    K.rbox(R, canopy, s0 - 0.7, cy, 0, s1 + 0.7, cy + 0.2, D + canopyD);
    K.rbox(R, M.lampGlow, s - 0.25, cy - 0.01, D + canopyD * 0.4, s + 0.25, cy, D + canopyD * 0.6, { detail: true });
    for (const ss of [s0 - 0.55, s1 + 0.55]) { const g = new THREE.BoxGeometry(0.03, 0.03, Math.hypot(canopyD + D, 1.1)); g.rotateX(Math.atan2(1.1, canopyD + D)); g.translate(ss, cy + 0.2 + 0.55, (canopyD + D) / 2); K.addRun(R, M.iron, g, { detail: true }); }
  }
  if (lamps) { const off = sw + 0.5; for (const ss of [s0 - off, s1 + off]) wallLamp(K, R, ss, y + 2.3, { style: lamps, mat: lampMat }); }
  if (signText) {
    const sw2 = signOpts.w ?? Math.min(Math.max(w + 1.0, signText.length * 0.24), w + 5), sh = signOpts.h ?? 0.42;
    const sy = canopy ? yT + sw * 0.9 + 0.55 : yT + sw * 0.9 + (surround && cap ? 0.3 : 0.15);
    sign(K, R, s, sy, sw2, sh, signText, { d: canopy ? 0 : (surround && cap ? D + 0.12 : D) - 0.06 + 0.02, ...signOpts });
  }
  let walk = null;
  if (steps) {
    const gg = gAt(K, R, s, D + 2.2);
    if (y - gg > 0.12) walk = frontSteps(K, R, s0 - sw, s1 + sw, y, { mat: stepMat || M.granite, cheek, d0: D + 0.08, land: 1.0 });
    else K.rbox(R, stepMat || M.granite, s0 - sw - 0.4, Math.min(gg, y) - 0.5, D + 0.08, s1 + sw + 0.4, y, D + 1.5); // apron slab
  }
  return { walk };
}

// Positions s along run R where footpaths/steps from the data packet arrive at the facade (closest approach < maxD m).
export function pathArrivals(K, ctx, R, { maxD = 5, minGap = 6, kinds = ['footway', 'path', 'steps', 'pedestrian', 'service', 'cycleway'] } = {}) {
  const out = [];
  for (const c of ctx.packet?.context || []) {
    const t = c.tags || {}; if (!kinds.includes(t.highway)) continue; const P = c.pts || []; let best = null;
    for (let k = 0; k < P.length - 1; k++) {
      const [x0, z0] = P[k], [x1, z1] = P[k + 1]; const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5));
      for (let i = 0; i <= n; i++) { const [u, v] = K.uv(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n); const du = u - R.a[0], dv = v - R.a[1]; const ss = du * R.t[0] + dv * R.t[1], dd = du * R.n[0] + dv * R.n[1];
        if (ss > 2 && ss < R.L - 2 && dd > -0.5 && dd < maxD && (!best || dd < best.d)) best = { s: ss, d: dd }; }
    }
    if (best) out.push(best);
  }
  out.sort((a, b) => a.d - b.d); const keep = [];
  for (const o of out) if (!keep.some((k) => Math.abs(k.s - o.s) < minGap)) keep.push(o);
  return keep.map((o) => o.s);
}
// Run of a polygon facing a compass side in the building frame ('S' = +v, 'N' = -v, 'E' = +u, 'W' = -u); longest wins.
export function faceRun(runs, side) { const d = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[side]; let best = null; for (const R of runs) { const c = R.n[0] * d[0] + R.n[1] * d[1]; if (c > 0.85 && (!best || R.L > best.L)) best = R; } return best; }

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
// One low clipped shrub (flat-shaded icosahedron) at (u,v), base height y (default ground).
export function shrubAt(K, u, v, y = null, { size = 0.55, h = 0.8, i = 0 } = {}) {
  // [r4-ground] was a sphere sunk 8% into the ground ("blobs sunk into it"): now a lumpy clipped dome whose base is
  // draped onto the terrain (no burying on the uphill side, no floating downhill), over a dark mulch bed that also
  // follows the ground. With an explicit y (planters, terraces) the base stays flat at that height.
  const yc = y ?? K.g(u, v); const r = size * (0.85 + 0.3 * ((i * 7919) % 13) / 13);
  const gAt = y != null ? () => y : (x, z) => K.g(x, z);
  const g = new THREE.IcosahedronGeometry(r, 1); const P = g.attributes.position; const cache = new Map(); // detail 1: 80 tris (flat-shaded anyway)
  for (let k = 0; k < P.count; k++) { // deterministic lumps + flattened, flared base (local y from 0 at the base to ~h)
    const x = P.getX(k), yv = P.getY(k), z = P.getZ(k); const n = 1 + 0.1 * Math.sin(x * 9.1 + i * 1.3) * Math.cos(z * 8.3 - i) + 0.07 * Math.sin(yv * 11.7 + i * 2.1);
    const flare = yv < 0 ? 1.08 : 1; P.setXYZ(k, x * n * flare, ((yv < 0 ? yv * 0.32 : yv * n) + 0.32 * r) * h / (1.32 * r), z * n * flare);
  }
  g.scale(1.25, 1, 1.1); g.rotateY(i * 1.7); g.translate(u, 0, v);
  for (let k = 0; k < P.count; k++) { // drape: low vertices ride the ground under them, the crown stays level
    const x = P.getX(k), z = P.getZ(k), yl = P.getY(k); const key = Math.round(x * 50) + ',' + Math.round(z * 50);
    let gg = cache.get(key); if (gg == null) { gg = gAt(x, z); cache.set(key, gg); }
    const w = 1 - Math.min(1, Math.max(0, yl / (0.6 * h))); P.setY(k, yl - 0.05 + yc + (gg - yc) * w);
  }
  g.computeVertexNormals();
  K.add(i % 3 ? shrubMat() : shrubMat2(), g, { detail: true, uvMode: 'keep' });
  const m = new THREE.CircleGeometry(r * 1.4, 10); m.rotateX(-Math.PI / 2); m.scale(1.2, 1, 1.1); m.rotateY(i * 1.7); m.translate(u, 0, v);
  const Q = m.attributes.position; for (let k = 0; k < Q.count; k++) Q.setY(k, gAt(Q.getX(k), Q.getZ(k)) + 0.025);
  K.add(mulchMat(), m, { detail: true, uvMode: 'keep' });
}
export function mulchMat() { return local('mulch', () => { const m = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }); m.name = 'rc-mulch'; return m; }); }
// Low clipped shrubs filling a rectangle, at base height y (default ground).
export function shrubRow(K, u0, v0, u1, v1, y = null, { size = 0.55, h = 0.8 } = {}) {
  const L = Math.max(u1 - u0, v1 - v0); const along = (u1 - u0) >= (v1 - v0); const n = Math.max(1, Math.round(L / (size * 1.5)));
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; shrubAt(K, along ? u0 + (u1 - u0) * t : (u0 + u1) / 2, along ? (v0 + v1) / 2 : v0 + (v1 - v0) * t, y, { size, h, i }); }
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

// Entrances wherever packet footpaths reach the facades of `runs` (closest first, at most `max`). y0 = ground-floor level;
// a door on rising ground is lifted to sit just above the terrain in front of it. Returns walkables for the steps.
export function autoEntries(K, ctx, runs, { y0 = 0.3, max = 3, minLen = 8, exclude = null, ...opts } = {}) {
  const cand = [];
  for (const R of runs) { if (R.L < minLen || (exclude && exclude(R))) continue; for (const s of pathArrivals(K, ctx, R)) cand.push({ R, s, d: 0 }); }
  const walks = []; const placed = [];
  for (const c of cand) {
    if (placed.length >= max) break;
    const p = c.R.at(c.s, 0); if (placed.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 10)) continue;
    const s = Math.min(Math.max(c.s, 2.2), c.R.L - 2.2);
    const g = gAt(K, c.R, s, 1.6); const y = Math.max(y0, g + 0.12);
    if (y - g > 2.6) continue; // too high above the ground here (basement side): skip rather than build a tall stair
    const { walk } = entry(K, c.R, s, y, opts); if (walk) walks.push(walk); placed.push(p);
  }
  return walks;
}
// Foundation planting along the base of a run (gaps where `skip` s-ranges are given, e.g. doors).
export function baseShrubs(K, R, s0, s1, { skip = [], d = 0.9, size = 0.5, clear = [] } = {}) {
  let segs = [[s0, s1]];
  for (const [a, b] of skip) { const ns = []; for (const [p, q] of segs) { if (b <= p || a >= q) { ns.push([p, q]); continue; } if (a > p) ns.push([p, a]); if (b < q) ns.push([b, q]); } segs = ns; }
  let i = 0; for (const [p, q] of segs) { if (q - p < 1.5) continue; const n = Math.max(1, Math.round((q - p) / (size * 1.6))); for (let k = 0; k < n; k++) { const [u, v] = R.at(p + (q - p) * (k + 0.5) / n, d); if (clear.some(([cu, cv, cr]) => (u - cu) ** 2 + (v - cv) ** 2 < cr * cr) || (K._stairs || []).some(([a0, b0, a1, b1]) => u > a0 - 0.8 && u < a1 + 0.8 && v > b0 - 0.8 && v < b1 + 0.8)) continue; shrubAt(K, u, v, null, { size, h: size * 1.5, i: i++ }); } }
}

// Finish a rectangular/polygonal building's surroundings: foundation planting along every face (gaps where packet paths
// arrive), campus lamp posts and a bike rack near the busiest arrival. poly: building-frame outline (any orientation).
export function siteDress(K, ctx, poly, { shrubs = true, lamps = 2, racks = true, d = 1.0, gap = 3.2, skipSides = [], clear = [] } = {}) { // clear: [[u, v, r]] keep-out discs for planting
  let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; }
  const P = a > 0 ? poly.slice().reverse() : poly.slice(); const arrivals = [];
  for (let i = 0; i < P.length; i++) {
    const R = K.run(P[i], P[(i + 1) % P.length]); if (R.L < 4) continue;
    const side = Math.abs(R.n[0]) > Math.abs(R.n[1]) ? (R.n[0] > 0 ? 'E' : 'W') : (R.n[1] > 0 ? 'S' : 'N'); if (skipSides.includes(side)) continue;
    const hits = pathArrivals(K, ctx, R, { maxD: 6, minGap: 5 }); for (const s of hits) arrivals.push({ R, s });
    if (shrubs) baseShrubs(K, R, 1.2, R.L - 1.2, { skip: hits.map((s) => [s - gap, s + gap]), d, clear });
  }
  arrivals.slice(0, lamps).forEach(({ R, s }, k) => { for (const sg of [-1, 1]) { const [u, v] = R.at(Math.min(R.L - 1, Math.max(1, s + sg * (gap + 1.2))), 3.2); if (k < lamps) lampPost(K, u, v); } });
  if (racks && arrivals.length) { const { R, s } = arrivals[0]; const ss = Math.min(R.L - 6, s + gap + 3); if (ss > 1) { const [u, v] = R.at(ss, 2.6); bikeRack(K, u, v, Math.atan2(R.t[1], R.t[0]), 5); } }
  return arrivals.length;
}
