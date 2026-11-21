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

export function rmats(M) {
  if (_mats.has(M)) return _mats.get(M);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const tinted = (base, color, rough) => { const m = base.clone(); m.color = new THREE.Color(color); if (rough != null) m.roughness = rough; return m; };
  const o = {
    // Bowles Hall: board-formed concrete scored like ashlar, warm light grey-beige; smooth cast trim; variegated clay tile
    bowWall: tinted(M.ashlar, 0xebe5d9, 0.92),
    bowTrim: tinted(M.stuccoWhite, 0xd8d1c2, 0.9),
    bowShade: tinted(M.concrete, 0xc9c2b4, 0.95),
    clayTile: std({ map: clayTileTex(['#b5543d', '#c9714f', '#8e3e2e', '#a9583f', '#bf6446', '#9d4a35', '#b86a4c', '#a44b37']), roughness: 0.82 }),
    sash: std({ color: 0xe8e6df, roughness: 0.5 }),
    sashDark: std({ color: 0x2f2c29, roughness: 0.55 }),
    loggia: std({ color: 0x2a2724, roughness: 0.95 }),
    // I-House: bright smooth off-white stucco
    ihStucco: tinted(M.stuccoWhite, 0xf4efe3, 0.93),
    ihTrim: tinted(M.stuccoWhite, 0xe9e2d2, 0.9),
    rafter: std({ color: 0x4a3a2e, roughness: 0.8 }),
    brickRed: tinted(M.brick, 0xe0a898, 0.9),
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
    const gableEnd = (axis === 'u' && (f === 'E' || f === 'W')) || (axis === 'v' && (f === 'N' || f === 'S'));
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
        const n = gableEnd ? (bw > 4.2 ? 3 : 2) : (fo?.lights ? fo.lights(i, k) : (i % 3 === 1 ? 3 : 2));
        const lw = n === 3 ? 0.5 : 0.56; const w = n * lw + (n - 1) * 0.14;
        const sill = ly + (k === 0 ? 0.95 : 0.85); const h = top ? 1.45 : 1.65;
        const p = R.at(c, 0.6); const g = K.ctx.groundAt(...K.xz(p[0], p[1]));
        if (sill < g + 0.35) continue;
        const o = { s0: c - w / 2, s1: c + w / 2, y0: sill, y1: sill + h };
        ops.push(o); groups.push({ o, n, tran: !top && k > 0 ? sill + h * 0.68 : null });
      }
    }
    K.wall(R, W, 0, R.L, y0, eave, ops.filter((o) => !o.noWallCut), depth);
    for (const { o, n, tran } of groups) mullGroup(K, R, o, { n, stone: T, sash: sp.sash, tranAt: tran, panes: 1, depth });
    if (sp.after) sp.after(f, R, ops, levels);
    // plinth (where exposed) + string course over the ground floor
    K.rbox(R, T, -0.08, y0, 0, R.L + 0.08, base + 0.15, 0.1);
    if (nSt > 1) K.rbox(R, T, -0.05, levels[1] - 0.12, 0, R.L + 0.05, levels[1] + 0.06, 0.09, { detail: false });
    if (!gableEnd) K.mould(R, T, 0, R.L, [[0, eave - 0.42], [0.1, eave - 0.36], [0.2, eave - 0.18], [0.28, eave - 0.04], [0.28, eave], [0, eave]], { ret0: false, ret1: false });
  }
  if (sp.core !== false) K.box(M.concreteDark, u0 + 0.6, y0, v0 + 0.6, u1 - 0.6, eave - 0.2, v1 - 0.6);
  if (sp.ridge) K.gable(sp.roofMat, u0, v0, u1, v1, eave, sp.ridge - eave, axis, { overhang: sp.overhang ?? 0.32, wallMat: W });
  return { runs, levels, base, y0, gmin };
}

// Parapet gable end coping on run R (the gable wall spans 0..w along R): sloped copings, kneelers at the eaves, apex finial.
export function rakeCope(K, R, mat, yE, rise, w, { d0 = -0.55, d1 = 0.12, kneel = true } = {}) {
  const L = Math.hypot(w / 2, rise), a = Math.atan2(rise, w / 2);
  for (const sg of [-1, 1]) {
    const g = new THREE.BoxGeometry(L + 0.25, 0.32, d1 - d0); g.rotateZ(sg * -a); g.translate(w / 2 + sg * w / 4, yE + rise / 2 + 0.22, (d0 + d1) / 2); K.addRun(R, mat, g);
    if (kneel) { const s = sg < 0 ? -0.15 : w - 0.55; K.rbox(R, mat, s, yE - 0.55, d0, s + 0.7, yE + 0.25, d1 + 0.05); }
  }
  K.rbox(R, mat, w / 2 - 0.24, yE + rise, d0 + 0.05, w / 2 + 0.24, yE + rise + 0.75, d1);
}
