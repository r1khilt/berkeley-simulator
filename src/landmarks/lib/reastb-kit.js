// reastb-kit: helpers for the refine-east-b batch (Bowles Hall, I-House, LHS, hill dorms/co-ops, Botanical Garden halls).
// Built on classic-kit's Kit (building frame u,v,y; merged per material). Window glass always goes through Kit.fill so the
// shared M.windowNight / M.glass shaders apply.
import * as THREE from 'three';
import { canvasTex } from './venue-util.js';

const _mats = new WeakMap();
const hash = (i, j, s) => { const x = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return x - Math.floor(x); };

// Variegated flat clay tile (Bowles): 8 tiles across x 12 courses per 2 m tile, staggered, lapped shadow at each course.
function clayTileTex(palette) {
  return canvasTex(512, 512, (c, W, H) => {
    const nx = 8, ny = 12, tw = W / nx, th = H / ny;
    c.fillStyle = '#5a2c22'; c.fillRect(0, 0, W, H);
    for (let j = 0; j < ny; j++) for (let i = -1; i <= nx; i++) {
      const off = (j % 2) * tw * 0.5; const x = i * tw + off; const y = j * th;
      const k = hash(i, j, 3); const col = palette[Math.floor(k * palette.length) % palette.length];
      c.fillStyle = col; c.fillRect(x + 1.5, y + 1, tw - 3, th - 1);
      const g = c.createLinearGradient(0, y, 0, y + th); g.addColorStop(0, 'rgba(0,0,0,0.0)'); g.addColorStop(0.75, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.38)');
      c.fillStyle = g; c.fillRect(x + 1.5, y + 1, tw - 3, th - 1);
      c.fillStyle = `rgba(255,255,255,${0.04 + hash(i, j, 9) * 0.06})`; c.fillRect(x + 3, y + 2, tw - 6, th * 0.3);
    }
  }, { repeat: true });
}

// Running-bond brick with a custom palette (one 2 m tile = 9 bricks x 27 courses, like the shared brick).
function brickTex(palette, mortar) {
  return canvasTex(512, 512, (c, W, H) => {
    c.fillStyle = mortar; c.fillRect(0, 0, W, H);
    const nx = 9, ny = 27, bw = W / nx, bh = H / ny;
    for (let j = 0; j < ny; j++) for (let i = -1; i <= nx; i++) {
      const x = i * bw + (j % 2) * bw * 0.5, y = j * bh; const k = hash(i, j, 5);
      c.fillStyle = palette[Math.floor(k * palette.length) % palette.length]; c.fillRect(x + 1.2, y + 1.6, bw - 2.4, bh - 2.2);
      c.fillStyle = `rgba(0,0,0,${hash(i, j, 7) * 0.06})`; c.fillRect(x + 1.2, y + 1.6, bw - 2.4, bh - 2.2);
    }
  }, { repeat: true });
}

// Board-formed cast concrete: low-contrast warm grey with horizontal lift lines (0.67 m), faint board grain and grime streaks.
function castConcreteTex(base) {
  return canvasTex(512, 512, (c, W, H) => {
    c.fillStyle = base; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { const x = hash(i, 1, 2) * W, y = hash(i, 2, 3) * H; c.fillStyle = `rgba(${hash(i, 4, 5) > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + hash(i, 5, 6) * 0.04})`; c.fillRect(x, y, 1.5, 1.5); }
    for (let k = 0; k < 40; k++) { const y = (k / 40) * H; c.fillStyle = `rgba(0,0,0,${0.015 + hash(k, 7, 8) * 0.02})`; c.fillRect(0, y, W, 2); }
    for (let k = 0; k < 3; k++) { const y = (k / 3) * H; c.fillStyle = 'rgba(60,55,48,0.22)'; c.fillRect(0, y, W, 3); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, y + 3, W, 2); }
    for (let k = 0; k < 6; k++) { const x = hash(k, 9, 1) * W, w = 3 + hash(k, 9, 2) * 8, y0 = hash(k, 9, 4) * H; const g = c.createLinearGradient(0, y0, 0, y0 + H * 0.3); g.addColorStop(0, 'rgba(70,64,56,0.07)'); g.addColorStop(1, 'rgba(70,64,56,0.0)'); c.fillStyle = g; c.fillRect(x, y0, w, H * 0.3); }
  }, { repeat: true });
}

// Weathered cedar shingles (Foothill v2): irregular widths, 0.18 m exposure, soft shadow lines, per-shingle tone variation.
function cedarTex(base = [112, 80, 56], warmth = [22, 12, 6]) {
  return canvasTex(512, 512, (c, W, H) => {
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const rows = 11, rh = H / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 40;
      while (x < W) {
        const w = 22 + rnd() * 48; const k = 0.9 + rnd() * 0.14; const warm = rnd();
        c.fillStyle = `rgb(${Math.round((base[0] + warm * warmth[0]) * k)},${Math.round((base[1] + warm * warmth[1]) * k)},${Math.round((base[2] + warm * warmth[2]) * k)})`;
        c.fillRect(x, r * rh, w, rh);
        c.fillStyle = 'rgba(30,20,14,0.07)'; c.fillRect(x + w - 1, r * rh + rh * 0.4, 1, rh * 0.6);
        for (let g = 0; g < 3; g++) { c.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.04})`; c.fillRect(x + rnd() * w, r * rh, 1, rh); }
        x += w;
      }
      const gr = c.createLinearGradient(0, r * rh + rh * 0.55, 0, (r + 1) * rh);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,14,10,0.35)');
      c.fillStyle = gr; c.fillRect(0, r * rh + rh * 0.55, W, rh * 0.45);
      c.fillStyle = 'rgba(18,12,8,0.75)'; c.fillRect(0, (r + 1) * rh - 3, W, 3); // crisp butt-edge shadow of the course above
    }
  }, { repeat: true });
}

// Horizontal lap siding (stained redwood boards): 13 boards per 2 m, light-to-dark gradient per board, shadow line, faint grain.
function lapTex(base) {
  return canvasTex(512, 512, (c, W, H) => {
    const n = 13, bh = H / n;
    for (let j = 0; j < n; j++) {
      const k = 0.9 + hash(j, 3, 1) * 0.16; const y = j * bh;
      const g = c.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, `rgb(${Math.round(base[0] * k * 1.08)},${Math.round(base[1] * k * 1.08)},${Math.round(base[2] * k * 1.08)})`);
      g.addColorStop(0.85, `rgb(${Math.round(base[0] * k * 0.92)},${Math.round(base[1] * k * 0.92)},${Math.round(base[2] * k * 0.92)})`);
      g.addColorStop(1, `rgb(${Math.round(base[0] * 0.45)},${Math.round(base[1] * 0.45)},${Math.round(base[2] * 0.45)})`);
      c.fillStyle = g; c.fillRect(0, y, W, bh);
      for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(0,0,0,${0.03 + hash(i, j, 2) * 0.05})`; c.fillRect(hash(i, j, 4) * W, y + hash(i, j, 5) * bh * 0.8, 20 + hash(i, j, 6) * 120, 1); }
      for (let i = 0; i < 2; i++) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(hash(i, j, 8) * W, y, 1.5, bh); } // rare butt joints
    }
  }, { repeat: true });
}

export function rmats(M) {
  if (_mats.has(M)) return _mats.get(M);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const tinted = (base, color, rough) => { const m = base.clone(); m.color = new THREE.Color(color); if (rough != null) m.roughness = rough; return m; };
  const o = {
    // Bowles Hall: board-formed concrete scored like ashlar, warm light grey-beige; smooth cast trim; variegated clay tile
    bowWall: std({ map: castConcreteTex('#a6a39b'), roughness: 0.88 }),
    bowTrim: tinted(M.stuccoWhite, 0xbdb9b0, 0.9),
    bowSash: std({ color: 0x9a968e, roughness: 0.6 }),
    bowShade: tinted(M.concrete, 0xc9c2b4, 0.95),
    clayTile: std({ map: clayTileTex(['#86402f', '#9a5136', '#6c3327', '#8c4934', '#7a3c2c', '#97573f', '#804532', '#904d37']), roughness: 0.86 }),
    sash: std({ color: 0xe8e6df, roughness: 0.5 }),
    sashDark: std({ color: 0x2f2c29, roughness: 0.55 }),
    loggia: std({ color: 0x2a2724, roughness: 0.95 }),
    // I-House: bright smooth off-white stucco
    ihStucco: std({ color: 0xe9ddc2, roughness: 0.9 }), // smooth warm-cream stucco
    ihTrim: tinted(M.stuccoWhite, 0xe9e2d2, 0.9),
    rafter: std({ color: 0x4a3a2e, roughness: 0.8 }),
    ihSash: std({ color: 0x6a4e3a, roughness: 0.6 }),
    ihTile: tinted(M.redTile, 0xfff2ea, 0.8), // bright orange terracotta barrel tile
    brickRed: tinted(M.brick, 0xe0a898, 0.9),
    // SLMath: flat, uniform warm orange-brown brick; dark bronze sash
    slBrick: std({ map: brickTex(['#9a5a3c', '#9d5d3e', '#97583b', '#a0603f', '#985a3d'], '#a88a76'), roughness: 0.9 }),
    bronze: std({ color: 0x2f2b27, roughness: 0.45, metalness: 0.5 }),
    davisBrick: std({ map: brickTex(['#b5583f', '#a8503a', '#bd6446', '#a14b36', '#b05a40'], '#c4b6a2'), roughness: 0.88 }),
    coping: std({ color: 0x6e5c50, roughness: 0.5, metalness: 0.4 }),
    concreteLight: tinted(M.concrete, 0xe3ded2, 0.95),
    // Foothill v2: weathered cedar shingle walls, warm dark composition-shingle roofs
    fhCedar: std({ map: cedarTex([98, 80, 64], [14, 8, 4]), roughness: 0.93 }),
    fhFret: (() => { const t = canvasTex(256, 256, (c, W, H) => { c.clearRect(0, 0, W, H); c.strokeStyle = '#f0efe9'; c.lineWidth = 18; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * W / 2, 0); c.lineTo(k * W / 2 + W, H); c.stroke(); c.beginPath(); c.moveTo(k * W / 2 + W, 0); c.lineTo(k * W / 2, H); c.stroke(); } c.lineWidth = 14; c.strokeRect(0, 0, W, H); }, { repeat: true }); return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }); })(), // white diagonal lattice
    fhRoof: tinted(M.shingle, 0x5e544c, 0.92),
    // Julia Morgan Hall / Botanical Garden halls: dark grey-brown stained redwood shingle, light grey composition roof
    jmShingle: std({ map: lapTex([74, 68, 62]), roughness: 0.88 }),
    jmRoof: tinted(M.shingle, 0xb8b9b6, 0.9),
    jmTrim: std({ color: 0x2f2c29, roughness: 0.7 }),
    jmSash: std({ color: 0x3a3632, roughness: 0.6 }),
    timber: std({ color: 0x4a3a2c, roughness: 0.8 }),
  };
  _mats.set(M, o);
  return o;
}

// Grouped casement window filling opening o ({s0,s1,y0,y1}) on run R: n lights split by stone mullions, optional stone
// transom (abs y), light sash frames with small panes, a stone sill and a hood mould (label) with drops.
export function mullGroup(K, R, o, { n = 2, stone, sash, rev = 0.3, tranAt = null, panes = 1, hood = true, depth = 0.42, mw = 0.14, sill = true } = {}) {
  const w = o.s1 - o.s0; const lw = (w - (n - 1) * mw) / n;
  for (let i = 0; i < n; i++) {
    const a = o.s0 + i * (lw + mw), b = a + lw;
    K.fill(R, { s0: a, s1: b, y0: o.y0, y1: o.y1, sill: false, muntins: panes, fw: 0.055 }, { rev, frame: sash, mull: lw > 0.5 ? 1 : 0, tran: [] });
    if (i < n - 1) K.rbox(R, stone, b, o.y0, -depth + 0.02, b + mw, o.y1, -0.05);
  }
  if (tranAt != null) K.rbox(R, stone, o.s0, tranAt - 0.07, -depth + 0.02, o.s1, tranAt + 0.07, -0.06);
  if (sill) K.rbox(R, stone, o.s0 - 0.1, o.y0 - 0.14, -depth + 0.02, o.s1 + 0.1, o.y0, 0.09);
  if (hood) {
    K.rbox(R, stone, o.s0 - 0.2, o.y1 + 0.05, 0, o.s1 + 0.2, o.y1 + 0.21, 0.12);
    for (const s of [o.s0 - 0.2, o.s1 + 0.05]) K.rbox(R, stone, s, o.y1 - 0.32, 0, s + 0.15, o.y1 + 0.05, 0.11);
  }
}

// Gabled Collegiate-Gothic range: walls with grouped mullioned windows per storey, plinth, string course, eave cornice,
// gable roof (ridge along `axis`) with wall-material gable triangles. Windows are skipped where they would sit in the ground.
// sp: {u0,u1,v0,v1, eave, ridge, axis:'u'|'v', faces:{S,E,N,W: false|{...}}, mat, trim, roofMat, sash, base, fh, bay,
//      depth, core:true, ops(face, R, storeyIndex, y0, y1) -> extra openings, skip(face, s, k) -> bool}
export function gothRange(K, sp) {
  const M = K.M; const { u0, u1, v0, v1, eave } = sp;
  const W = sp.mat, T = sp.trim, depth = sp.depth ?? 0.42;
  const gmin = K.gMin(u0, v0, u1, v1, 5);
  const y0 = gmin - 1.5;
  const base = sp.base ?? gmin + 0.35;
  const fh = sp.fh ?? 3.25;
  const nSt = Math.max(1, Math.floor((eave - 0.7 - base) / fh));
  const levels = []; for (let k = 0; k < nSt; k++) levels.push(base + k * fh);
  const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
  const runs = {};
  const axis = sp.axis || 'u';
  for (const f of ['S', 'E', 'N', 'W']) {
    const fo = sp.faces?.[f]; if (fo === false) continue;
    const R = K.run(defs[f][0], defs[f][1]); runs[f] = R;
    const gableEnd = sp.hipped ? false : (axis === 'u' && (f === 'E' || f === 'W')) || (axis === 'v' && (f === 'N' || f === 'S'));
    const bay = fo?.bay ?? sp.bay ?? 3.4;
    const nb = gableEnd ? Math.max(1, Math.round((R.L - 1.5) / 4.6)) : Math.max(1, Math.round(R.L / bay));
    const bw = R.L / nb;
    const ops = [], groups = [];
    for (let k = 0; k < nSt; k++) {
      const ly = levels[k]; const top = k === nSt - 1;
      const extra = sp.ops ? sp.ops(f, R, k, ly, ly + fh) : null;
      if (extra) { for (const e of extra) ops.push(e); }
      for (let i = 0; i < nb; i++) {
        const c = bw * (i + 0.5);
        if (sp.skip && sp.skip(f, c, k)) continue;
        if (extra && extra.some((e) => e.s1 > c - 1.2 && e.s0 < c + 1.2 && e.y1 > ly + 0.5 && e.y0 < ly + fh - 0.5)) continue;
        const n = gableEnd ? (bw > 4.2 ? 4 : 3) : (fo?.lights ? fo.lights(i, k) : (sp.lights ? sp.lights(i, k, f) : (i % 3 === 1 ? 3 : 2)));
        const lw = sp.lightW ?? (n === 3 ? 0.5 : 0.56); const w = n * lw + (n - 1) * 0.14;
        const sill = ly + (k === 0 ? 0.9 : 0.8); const h = top ? (sp.topH ?? 1.45) : (sp.winH ?? 1.65);
        const p = R.at(c, 0.6); const g = K.ctx.groundAt(...K.xz(p[0], p[1]));
        if (sill < g + 0.35) continue;
        const o = { s0: c - w / 2, s1: c + w / 2, y0: sill, y1: sill + h };
        ops.push(o); groups.push({ o, n, tran: !top && k > 0 ? sill + h * 0.68 : null });
      }
    }
    K.wall(R, W, 0, R.L, y0, eave, ops.filter((o) => !o.noWallCut), depth);
    for (const { o, n, tran } of groups) mullGroup(K, R, o, { n, stone: T, sash: sp.sash, tranAt: sp.noTransom ? null : tran, panes: sp.panes ?? 1, depth, hood: sp.hood ?? true, mw: sp.mullW ?? 0.14 });
    if (sp.after) sp.after(f, R, ops, levels);
    // plinth (where exposed) + string course over the ground floor
    K.rbox(R, sp.plinth || T, -0.08, y0, 0, R.L + 0.08, base + 0.15, 0.1);
    if (nSt > 1 && sp.string !== false) K.rbox(R, T, -0.05, levels[1] - 0.12, 0, R.L + 0.05, levels[1] + 0.06, 0.09, { detail: false });
    if (!gableEnd && sp.cornice !== false) {
      const gaps = (sp.corniceGaps && sp.corniceGaps[f]) || []; let segs = [[0, R.L]];
      for (const [g0, g1] of gaps) segs = segs.flatMap(([a0, a1]) => (g1 <= a0 || g0 >= a1 ? [[a0, a1]] : [[a0, g0], [g1, a1]].filter(([x0, x1]) => x1 - x0 > 0.2)));
      for (const [a0, a1] of segs) K.mould(R, T, a0, a1, [[0, eave - 0.42], [0.1, eave - 0.36], [0.2, eave - 0.18], [0.28, eave - 0.04], [0.28, eave], [0, eave]], { ret0: false, ret1: false });
    }
  }
  if (sp.core !== false) K.box(M.concreteDark, u0 + 0.6, y0, v0 + 0.6, u1 - 0.6, eave - 0.2, v1 - 0.6);
  if (sp.ridge) K.gable(sp.roofMat, u0, v0, u1, v1, eave, sp.ridge - eave, axis, { overhang: sp.overhang ?? 0.32, wallMat: W });
  return { runs, levels, base, y0, gmin };
}

// Parapet gable end coping on run R (the gable wall spans 0..w along R): sloped copings, kneelers at the eaves, apex finial.
export function rakeCope(K, R, mat, yE, rise, w, { d0 = -0.55, d1 = 0.12, kneel = true, lift = 0, wallMat = null } = {}) {
  const L = Math.hypot(w / 2, rise), a = Math.atan2(rise, w / 2);
  for (const sg of [-1, 1]) {
    const g = new THREE.BoxGeometry(L + 0.25, 0.32, d1 - d0); g.rotateZ(sg * -a); g.translate(w / 2 + sg * w / 4, yE + rise / 2 + 0.22 + lift, (d0 + d1) / 2); K.addRun(R, mat, g);
    if (lift > 0) { const pw = new THREE.BoxGeometry(L, lift + 0.1, 0.5); pw.rotateZ(sg * -a); pw.translate(w / 2 + sg * w / 4, yE + rise / 2 + lift / 2 + 0.05, -0.25); K.addRun(R, wallMat || mat, pw); }
    if (kneel) { const s = sg < 0 ? -0.15 : w - 0.55; K.rbox(R, mat, s, yE - 0.55, d0, s + 0.7, yE + 0.25, d1 + 0.05); }
  }
  K.rbox(R, mat, w / 2 - 0.24, yE + rise + lift, d0 + 0.05, w / 2 + 0.24, yE + rise + lift + 0.75, d1);
}
