// Residential kit for the Berkeley Student Cooperative houses (batch b10-coops).
// Builds on classic-kit's Kit (building frame u,v,y; runs; merged per material) and adds:
//  - procedural residential surface materials (cedar shingle, clapboard, stucco, concrete block, asphalt roofing),
//  - block massing: a building is a union of axis-aligned blocks (in the building frame) with storeys, window rhythm and roofs;
//    faces hidden by neighbouring blocks are skipped band by band so wings and main blocks join cleanly,
//  - residential details: cased windows (double-hung / casement / grouped), doors with stoops, porches, balconies, chimneys,
//    dormers, rafter tails, bay windows.
import * as THREE from 'three';
import { Kit, polysGeo } from './classic-kit.js';
import { textures, nightGlow } from '../../materials.js';

// ---------------- procedural textures (one tile = 2 m, like the shared library) ----------------
const TEXC = new Map();
function hash(a, b, s = 0) { let h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return ((h >>> 0) % 100000) / 100000; }
function bakeTex(key, size, fn, normalStrength = 2.5) {
  if (TEXC.has(key)) return TEXC.get(key);
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const ca = mk(), cn = mk(); const xa = ca.getContext('2d'), xn = cn.getContext('2d');
  const ia = xa.createImageData(size, size), inn = xn.createImageData(size, size); const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = fn(x / size, y / size, x, y); const i = y * size + x; H[i] = o[3] ?? 0;
    ia.data[i * 4] = Math.max(0, Math.min(255, o[0])); ia.data[i * 4 + 1] = Math.max(0, Math.min(255, o[1])); ia.data[i * 4 + 2] = Math.max(0, Math.min(255, o[2])); ia.data[i * 4 + 3] = 255;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hx = H[y * size + ((x + 1) % size)] - H[y * size + ((x - 1 + size) % size)];
    const hy = H[((y + 1) % size) * size + x] - H[((y - 1 + size) % size) * size + x];
    let nx = -hx * normalStrength, ny = hy * normalStrength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * size + x) * 4; inn.data[i] = (nx * 0.5 + 0.5) * 255; inn.data[i + 1] = (ny * 0.5 + 0.5) * 255; inn.data[i + 2] = (nz * 0.5 + 0.5) * 255; inn.data[i + 3] = 255;
  }
  xa.putImageData(ia, 0, 0); xn.putImageData(inn, 0, 0);
  const tx = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const out = { map: tx(ca, true), normalMap: tx(cn, false) }; TEXC.set(key, out); return out;
}
// UV v grows upward on walls (boxUV: v = y/2). Canvas y grows downward, so row r from the top of the canvas = top of the tile.
const RECIPES = {
  // cedar shingles: 12 courses per 2 m (~0.167 m exposure), irregular widths (0.1-0.32 m), butt shadow, vertical grain
  cedar: (() => {
    let rows = null; const NR = 8, PX = 512;
    const init = () => { rows = []; for (let r = 0; r < NR; r++) { const ws = []; let sum = 0, k = 0; while (sum < 1) { const w = 0.06 + hash(k, r, 41) * 0.12; ws.push(w); sum += w; k++; } const sc = 1 / sum; const idx = new Int16Array(PX), edge = new Uint8Array(PX); let acc = 0, j = 0; const off = Math.floor(hash(r, 3, 43) * PX); for (let x = 0; x < PX; x++) { const xx = (x + off) % PX; const t = x / PX; while (j < ws.length - 1 && t > acc + ws[j] * sc) { acc += ws[j] * sc; j++; } idx[xx] = j; edge[xx] = (t - acc < 1.6 / PX) ? 1 : 0; } rows.push({ idx, edge }); } };
    return (u, v, x, y) => {
      if (!rows) init();
      const rv = v * NR, row = Math.floor(rv) % NR, f = rv - Math.floor(rv); const R = rows[row]; const id = R.idx[x];
      const tone = 0.9 + hash(id, row, 11) * 0.16; const sd = hash(id, row, 13) * 100;
      const grain = 0.93 + 0.05 * Math.sin(x * 1.9 + sd) + 0.04 * Math.sin(x * 0.53 + sd * 2) + (hash(x, row, 17) - 0.5) * 0.05;
      const shade = f < 0.05 ? 0.6 : f < 0.12 ? 0.6 + (f - 0.05) / 0.07 * 0.34 : 0.94 + f * 0.08;
      const j = R.edge[x] ? 0.9 : 1; const c = 212 * tone * grain * shade * j;
      return [c, c * 0.96, c * 0.92, f * 1.2 - (R.edge[x] ? 0.25 : 0)];
    };
  })(),
  // painted lap siding: 12 boards per 2 m (~0.167 m exposure)
  clap: (u, v, x, y) => {
    const rows = 12, rv = v * rows, row = Math.floor(rv), f = rv - row;
    const n = 0.97 + hash(x, y, 17) * 0.05; const sh = f > 0.93 ? 0.62 : f > 0.88 ? 0.85 : 1;
    const c = 238 * n * sh; return [c, c, c, f];
  },
  // concrete block: 0.4 x 0.2 m, running bond, struck joints
  cmu: (u, v, x, y) => {
    const bu = u * 5, bv = v * 10, row = Math.floor(bv), off = (row % 2) * 0.5; const fu = ((bu + off) % 1 + 1) % 1, fv = bv - row;
    const joint = fu < 0.03 || fv < 0.06; const t = 0.93 + hash(Math.floor(bu + off), row, 23) * 0.1; const s = 0.95 + hash(x, y, 29) * 0.08;
    const c = joint ? 160 : 222 * t * s; return [c, c * 0.985, c * 0.96, joint ? 0 : 1];
  },
  // vertical board-and-batten / T1-11 style siding: battens every 0.3 m
  batten: (u, v, x, y) => {
    const bu = u * 6.667, fu = bu - Math.floor(bu); const bat = fu < 0.12; const n = 0.95 + hash(x >> 1, y >> 2, 31) * 0.08;
    const c = 230 * n * (fu > 0.12 && fu < 0.16 ? 0.75 : 1); return [c, c, c, bat ? 1 : 0];
  },
};
function surfTex(kind) { return bakeTex(kind, 512, RECIPES[kind], kind === 'cedar' ? 3.0 : 2.2); }

const MATC = new Map();
// coopMat(kind, hex): 'cedar' | 'clap' | 'cmu' | 'batten' | 'stucco' | 'paint' | 'roof' (asphalt shingle) | 'tile' (barrel) | 'metal'
export function coopMat(kind, hex, opts = {}) {
  const key = kind + ':' + hex + ':' + JSON.stringify(opts);
  if (MATC.has(key)) return MATC.get(key);
  const T = textures(); const col = new THREE.Color(hex);
  let m;
  const std = (o, t, ns = 0.6) => { const mm = new THREE.MeshStandardMaterial(o); if (t) { mm.map = t.map; mm.normalMap = t.normalMap; if (t.roughnessMap) mm.roughnessMap = t.roughnessMap; mm.normalScale = new THREE.Vector2(ns, ns); } return mm; };
  // texture mean brightness compensation so `hex` is roughly the perceived colour
  const comp = (c, mean) => { const k = 1 / mean; return new THREE.Color().setRGB(Math.min(1, c.r * k), Math.min(1, c.g * k), Math.min(1, c.b * k), THREE.SRGBColorSpace === undefined ? undefined : undefined); };
  if (kind === 'cedar') m = std({ color: comp(col, 0.74), roughness: 0.92 }, surfTex('cedar'), 0.9);
  else if (kind === 'clap') m = std({ color: comp(col, 0.9), roughness: 0.8 }, surfTex('clap'), 0.8);
  else if (kind === 'cmu') m = std({ color: comp(col, 0.84), roughness: 0.95 }, surfTex('cmu'), 0.7);
  else if (kind === 'batten') m = std({ color: comp(col, 0.88), roughness: 0.85 }, surfTex('batten'), 0.7);
  else if (kind === 'stucco') m = std({ color: comp(col, 0.92), roughness: 0.95 }, T.plain, 0.5);
  else if (kind === 'roof') m = std({ color: comp(col, 0.78), roughness: 0.95 }, T.shingle, 0.7);
  else if (kind === 'tile') m = std({ color: col, roughness: 0.8 }, T.tile, 0.6);
  else if (kind === 'metal') m = std({ color: col, roughness: 0.45, metalness: 0.5 });
  else m = std({ color: col, roughness: opts.rough ?? 0.78 });
  m.name = key; MATC.set(key, m); return m;
}

let GLASS = null;
// daytime-reflective house glass that still glows warm at night
export function coopGlass() {
  if (!GLASS) { GLASS = nightGlow(new THREE.MeshStandardMaterial({ color: 0x34424f, roughness: 0.12, metalness: 0.45, envMapIntensity: 1.3, emissive: 0xffc77a, emissiveIntensity: 1.5 }), 1.0); GLASS.name = 'coopGlass'; }
  return GLASS;
}
// ---------------- kit ----------------
const FACES = ['S', 'E', 'N', 'W'];
export class CoopKit extends Kit {
  constructor(ctx, angDeg) {
    super(ctx, THREE.MathUtils.degToRad(angDeg));
    this.colliders = []; this.walkables = []; this.blocks = [];
  }
  faceRun(b, f) {
    const d = { S: [[b.u0, b.v1], [b.u1, b.v1]], E: [[b.u1, b.v1], [b.u1, b.v0]], N: [[b.u1, b.v0], [b.u0, b.v0]], W: [[b.u0, b.v0], [b.u0, b.v1]] }[f];
    return this.run(d[0], d[1]);
  }
  // run coordinate s on face f of block b for a building-frame coordinate c (u for S/N faces, v for E/W)
  sOf(b, f, c) { return f === 'S' ? c - b.u0 : f === 'N' ? b.u1 - c : f === 'E' ? b.v1 - c : c - b.v0; }
  // s-intervals of face f of block A hidden by other blocks for the band [y0,y1]
  covered(A, f, y0, y1) {
    const out = []; const ia = this.blocks.indexOf(A);
    for (const B of this.blocks) {
      if (B === A || B.noCover) continue;
      if (!(B.eave >= y1 - 0.05 && B.base <= y0 + 0.05)) continue;
      const ib = this.blocks.indexOf(B); let lo, hi, ok = false;
      if (f === 'S' || f === 'N') {
        const line = f === 'S' ? A.v1 : A.v0, sg = f === 'S' ? 1 : -1;
        const bNear = f === 'S' ? B.v0 : B.v1, bFar = f === 'S' ? B.v1 : B.v0;
        const outward = sg * (bNear - line) <= 0.03 && sg * (bFar - line) >= 0.12;
        const coplanar = Math.abs(bFar - line) < 0.06 && sg * (bNear - line) < 0 && ib < ia;
        if (outward || coplanar) { lo = Math.max(A.u0, B.u0); hi = Math.min(A.u1, B.u1); ok = hi > lo; }
        if (ok) out.push(f === 'S' ? [lo - A.u0, hi - A.u0] : [A.u1 - hi, A.u1 - lo]);
      } else {
        const line = f === 'E' ? A.u1 : A.u0, sg = f === 'E' ? 1 : -1;
        const bNear = f === 'E' ? B.u0 : B.u1, bFar = f === 'E' ? B.u1 : B.u0;
        const outward = sg * (bNear - line) <= 0.03 && sg * (bFar - line) >= 0.12;
        const coplanar = Math.abs(bFar - line) < 0.06 && sg * (bNear - line) < 0 && ib < ia;
        if (outward || coplanar) { lo = Math.max(A.v0, B.v0); hi = Math.min(A.v1, B.v1); ok = hi > lo; }
        if (ok) out.push(f === 'E' ? [A.v1 - hi, A.v1 - lo] : [lo - A.v0, hi - A.v0]);
      }
    }
    return out;
  }
  static subtract(L, cov) {
    let segs = [[0, L]];
    for (const [a, b] of cov) { const ns = []; for (const [p, q] of segs) { if (b <= p || a >= q) { ns.push([p, q]); continue; } if (a > p) ns.push([p, a]); if (b < q) ns.push([b, q]); } segs = ns; }
    return segs.filter(([p, q]) => q - p > 0.05);
  }
  // ground height under run R at s, offset d outward
  gR(R, s, d = 0.3) { const p = R.at(s, d); return this.g(p[0], p[1]); }

  // ---- residential window: opening list entries for K.wall + fill + casing ----
  // spec: {w, h, sill, pair (count in group), gap, mull, muntins, tran (fraction), casing (trim width), frame, sillMat, arch}
  winOps(cs, y0, spec) {
    const ops = []; const gap = spec.gap ?? 0.16, w = spec.w ?? 0.9;
    for (const [ci, c] of cs.entries()) {
      const n = spec.pattern ? spec.pattern[ci % spec.pattern.length] : (spec.pair || 1);
      const tot = n * w + (n - 1) * gap;
      for (let k = 0; k < n; k++) {
        const s0 = c - tot / 2 + k * (w + gap);
        ops.push({ s0, s1: s0 + w, y0: y0 + (spec.sill ?? 0.85), y1: y0 + (spec.sill ?? 0.85) + (spec.h ?? 1.5), arch: spec.arch, rise: spec.rise, grp: c, grpW: tot, sill: false, muntins: spec.muntins, fw: spec.fw ?? 0.06 });
      }
    }
    return ops;
  }
  fillWin(R, o, spec, trim) {
    const rev = spec.rev ?? 0.17;
    this.fill(R, o, { rev, frame: spec.frame || trim, glass: spec.glass || coopGlass(), mull: spec.mull ?? 0, tran: spec.tran ? [o.y0 + (o.y1 - o.y0) * spec.tran] : [] });
  }
  casing(R, ops, trim, cw = 0.12, proud = 0.055, { sill = true, head = true } = {}) {
    const groups = new Map(); for (const o of ops) { if (o.kind === 'door' || o.noCase) continue; const k = o.grp ?? o.s0; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); }
    for (const list of groups.values()) {
      const s0 = Math.min(...list.map((o) => o.s0)), s1 = Math.max(...list.map((o) => o.s1)), y0 = Math.min(...list.map((o) => o.y0)), y1 = Math.max(...list.map((o) => o.y1));
      const arch = list[0].arch;
      this.rbox(R, trim, s0 - cw, y0, 0, s0, arch ? y1 - (s1 - s0) / 2 : y1, proud, { detail: true });
      this.rbox(R, trim, s1, y0, 0, s1 + cw, arch ? y1 - (s1 - s0) / 2 : y1, proud, { detail: true });
      if (head && !arch) this.rbox(R, trim, s0 - cw - 0.03, y1, 0, s1 + cw + 0.03, y1 + cw * 1.2, proud + 0.02, { detail: true });
      if (sill) { this.rbox(R, trim, s0 - cw - 0.05, y0 - 0.07, -0.12, s1 + cw + 0.05, y0, proud + 0.09); this.rbox(R, trim, s0 - cw * 0.6, y0 - 0.2, 0, s1 + cw * 0.6, y0 - 0.05, proud * 0.7, { detail: true }); }
      for (let k = 1; k < list.length; k++) { const a = list[k - 1].s1, b = list[k].s0; this.rbox(R, trim, a, y0, 0, b, y1, proud * 0.8, { detail: true }); }
    }
  }

  // ---- block massing ----
  // b: {u0,u1,v0,v1, floors:[ground-floor level, ..., eave], base, wall (mat), wallMats:[per storey], trim, win:{...}, bay,
  //     faces:{S|E|N|W: false | {cs:[centres], nb, skip:[], win:{}, doors:[{s,w,h,door,steps}], none:true}}, roof:{...}, depth, skirt}
  block(b) {
    b.floors = b.floors || [0, 3, 6]; b.eave = b.eave ?? b.floors[b.floors.length - 1];
    b.base = b.base ?? (this.gMin(b.u0, b.v0, b.u1, b.v1, 5) - 1.2);
    this.blocks.push(b); return b;
  }
  buildBlocks() { for (const b of this.blocks) if (!b.built) { this._buildBlock(b); b.built = true; } }
  _buildBlock(b) {
    const M = this.M; const trim = b.trim || M.whitePaint; const depth = b.depth ?? 0.25;
    const bands = [];
    if (b.floors[0] > b.base + 0.05) bands.push({ y0: b.base, y1: b.floors[0], skirt: true, mat: b.skirt || b.wallMats?.[0] || b.wall });
    for (let i = 0; i < b.floors.length - 1; i++) bands.push({ y0: b.floors[i], y1: b.floors[i + 1], i, mat: b.wallMats?.[i + 1] ?? b.wallMats?.[i] ?? b.wall, win: (b.wins && b.wins[i] !== undefined) ? b.wins[i] : b.win });
    if (b.eave > b.floors[b.floors.length - 1] + 0.05) bands.push({ y0: b.floors[b.floors.length - 1], y1: b.eave, mat: b.wall });
    for (const f of FACES) {
      const fo = b.faces?.[f]; if (fo === false) continue;
      const R = this.faceRun(b, f); b['run' + f] = R;
      for (const band of bands) {
        const vis = CoopKit.subtract(R.L, this.covered(b, f, band.y0, band.y1));
        for (const [s0, s1] of vis) {
          let ops = [];
          const ws = band.win ? { ...band.win, ...(fo?.win || {}), ...((fo?.wins && fo.wins[band.i]) || {}) } : null;
          if (ws && !band.skirt && !fo?.none && !(fo?.noWinFloors || []).includes(band.i)) {
            let cs;
            if (fo?.cs) cs = fo.cs.filter((c) => c > s0 + 0.5 && c < s1 - 0.5);
            else {
              const len = s1 - s0, bay = fo?.bay ?? b.bay ?? 3.4; const nb = fo?.nb ?? Math.max(len > (ws.minLen ?? 1.6) ? 1 : 0, Math.round(len / bay));
              cs = []; for (let k = 0; k < nb; k++) cs.push(s0 + len * (k + 0.5) / nb);
              const skip = fo?.skip || []; cs = cs.filter((c, k) => !skip.includes(k));
            }
            if (fo?.skipS) cs = cs.filter((c) => !fo.skipS.some(([a, z]) => c > a && c < z));
            ops = this.winOps(cs, band.y0, ws).filter((o) => o.s0 > s0 + 0.15 && o.s1 < s1 - 0.15 && o.y1 < band.y1 - 0.08);
            // drop windows that would sit below grade
            ops = ops.filter((o) => { const gg = Math.max(this.gR(R, o.s0, 0.3), this.gR(R, o.s1, 0.3), this.gR(R, o.s0, 1.2), this.gR(R, o.s1, 1.2)); return o.y0 > gg + 0.45; });
          }
          // doors on the ground storey
          const doors = [];
          if (band.i === 0 && fo?.doors) for (const d of fo.doors) if (d.s - d.w / 2 > s0 && d.s + d.w / 2 < s1) {
            const dy = d.y ?? band.y0; const o = { s0: d.s - d.w / 2, s1: d.s + d.w / 2, y0: dy, y1: dy + (d.h ?? 2.3), kind: 'door', doorTop: dy + (d.leaf ?? (d.h ?? 2.3) - 0.45), sill: false, d };
            ops = ops.filter((w) => w.s1 < o.s0 - 0.2 || w.s0 > o.s1 + 0.2); doors.push(o);
          }
          this.wall(R, band.mat, s0, s1, band.y0, band.y1, [...ops, ...doors], depth);
          for (const o of ops) this.fillWin(R, o, ws, trim);
          if (ops.length && (ws.casing ?? 0.12) > 0) this.casing(R, ops, ws.casingMat || trim, ws.casing ?? 0.12);
          for (const o of doors) this.door(R, o, trim, b);
        }
      }
      // foundation plinth band (grounds the building on the slope)
      if (b.plinth !== false) {
        const pm = b.plinthMat || this.M.concreteDark; const ph = b.floors[0] + (b.plinthUp ?? 0.12);
        for (const [s0, s1] of CoopKit.subtract(R.L, this.covered(b, f, b.base, ph))) this.rbox(R, pm, s0 - 0.05, b.base, -0.1, s1 + 0.05, ph, 0.05);
      }
      // belt courses / floor-line trim
      if (b.belts) for (const y of b.belts) {
        const vis = CoopKit.subtract(R.L, this.covered(b, f, y - 0.1, y + 0.1));
        for (const [s0, s1] of vis) this.rbox(R, b.beltMat || trim, s0, y - 0.09, 0, s1, y + 0.09, 0.05);
      }
    }
    // corner boards
    if (b.corners) {
      const cw = b.corners === true ? 0.14 : b.corners;
      for (const [u, v, su, sv] of [[b.u0, b.v0, 1, 1], [b.u1, b.v0, -1, 1], [b.u1, b.v1, -1, -1], [b.u0, b.v1, 1, -1]]) {
        if (this.blocks.some((B) => B !== b && u > B.u0 - 0.05 && u < B.u1 + 0.05 && v > B.v0 - 0.05 && v < B.v1 + 0.05 && B.eave > b.floors[0] + 1)) continue;
        this.box(trim, u - (su > 0 ? 0.03 : cw - 0.03) * 1, b.floors[0] - 0.3, v - (sv > 0 ? 0.03 : cw - 0.03), u + (su > 0 ? cw - 0.03 : 0.03), b.eave - 0.02, v + (sv > 0 ? cw - 0.03 : 0.03), { detail: true });
      }
    }
    if (b.collide !== false) this.colliders.push(this.colPoly([[b.u0, b.v0], [b.u1, b.v0], [b.u1, b.v1], [b.u0, b.v1]], b.base, b.eave + 3));
    if (b.roof) this.roof(b, b.roof);
  }
  door(R, o, trim, b) {
    const d = o.d; const M = this.M;
    this.fill(R, o, { kind: 'door', rev: d.rev ?? 0.15, door: d.door || M.woodDark, frame: d.frame || trim });
    if (d.casing !== false) { const cw = 0.12; this.rbox(R, trim, o.s0 - cw, o.y0, 0, o.s0, o.y1, 0.04, { detail: true }); this.rbox(R, trim, o.s1, o.y0, 0, o.s1 + cw, o.y1, 0.04, { detail: true }); this.rbox(R, trim, o.s0 - cw - 0.04, o.y1, 0, o.s1 + cw + 0.04, o.y1 + 0.16, 0.07, { detail: true }); }
    // stoop + steps down to grade
    if (d.steps !== false) {
      const gl = Math.min(this.gR(R, o.s0, 1.2), this.gR(R, o.s1, 1.2), this.gR(R, (o.s0 + o.s1) / 2, 2.0));
      const top = o.y0; const sw = d.stepW ?? (o.s1 - o.s0 + 0.8);
      const landing = d.landing ?? 1.2; const cs = (o.s0 + o.s1) / 2;
      if (top - gl > 0.12) {
        const n = Math.max(1, Math.round((top - gl) / 0.18)); const tread = 0.28;
        this.rboxW(R, d.stepMat || M.concrete, cs - sw / 2, gl - 0.8, 0, cs + sw / 2, top - 0.02, landing);
        for (let k = 0; k < n; k++) { const yT = top - (k + 1) * (top - gl) / (n + 0) + (top - gl) / n * 0; const h = top - (top - gl) * (k + 1) / n; if (h <= gl + 0.01) break; this.rboxW(R, d.stepMat || M.concrete, cs - sw / 2, gl - 0.8, landing + k * tread, cs + sw / 2, h, landing + (k + 1) * tread); }
        const nAll = n, run = landing, y0g = gl;
        this.walkables.push(this.walkRun(R, cs - sw / 2, cs + sw / 2, 0, landing + n * tread, (ss, dd) => dd <= run ? top : Math.max(y0g, top - (top - y0g) * (Math.floor((dd - run) / tread) + 1) / nAll)));
      }
    }
    if (d.hood) { // small gabled / flat hood over the door
      const hw = (o.s1 - o.s0) + 0.9, cs = (o.s0 + o.s1) / 2;
      this.rbox(R, d.hoodMat || trim, cs - hw / 2, o.y1 + 0.25, 0, cs + hw / 2, o.y1 + 0.37, d.hood);
      for (const sx of [-1, 1]) this.rbox(R, trim, cs + sx * hw / 2 - 0.08 * (sx > 0 ? 1 : 0) - (sx < 0 ? 0 : 0), o.y1 - 0.2, 0, cs + sx * hw / 2 + (sx < 0 ? 0.08 : 0) - (sx > 0 ? 0 : 0), o.y1 + 0.25, d.hood * 0.6, { detail: true });
    }
  }
  // rbox in run coords allowing d ranges in front of the face (alias, for readability)
  rboxW(R, mat, s0, y0, d0, s1, y1, d1, opts) { return this.rbox(R, mat, s0, y0, d0, s1, y1, d1, opts); }

  // ---- roofs ----
  roof(b, r) {
    const M = this.M; const mat = r.mat || coopMat('roof', '#5f5852'); const ov = r.overhang ?? 0.6; const fasc = r.fascia || b.trim || M.whitePaint;
    const { u0, u1, v0, v1 } = b; const yE = b.eave;
    if (r.type === 'hip') {
      const slope = r.slope ?? 0.42; const yEdge = yE - ov * slope;
      const top = this.hip(mat, u0 - ov, v0 - ov, u1 + ov, v1 + ov, yEdge, slope, { yTop: r.yTop ?? Infinity, hipU: r.hipU ?? true, hipV: r.hipV ?? true });
      if (r.yTop != null && top >= r.yTop - 0.01) { /* flat deck covered by hip() */ }
      this.soffit(b, ov, yEdge, fasc, r);
      b.ridge = top; return top;
    }
    if (r.type === 'gable') {
      const axis = r.axis || (u1 - u0 >= v1 - v0 ? 'u' : 'v'); const half = axis === 'u' ? (v1 - v0) / 2 : (u1 - u0) / 2;
      const rise = r.rise ?? half * (r.slope ?? 0.6);
      const ovE = r.overhangGable ?? ov * 0.6;
      // build gable with eave overhang ov (across the slope) and rake overhang ovE (along the ridge)
      this.gable2(mat, u0, v0, u1, v1, yE, rise, axis, ov, ovE, r.gableWall === false ? null : (r.gableMat || b.wall), fasc, r.thick ?? 0.18);
      b.ridge = yE + rise; return yE + rise;
    }
    if (r.type === 'flat') {
      const par = r.parapet ?? 0.6; const cm = r.coping || b.trim || M.concrete;
      this.box(r.deck || M.concreteDark, u0 + 0.05, yE - 0.3, v0 + 0.05, u1 - 0.05, yE + 0.02, v1 - 0.05);
      if (par > 0) for (const f of FACES) {
        const R = this.faceRun(b, f); const vis = CoopKit.subtract(R.L, this.covered(b, f, yE, yE + par));
        for (const [s0, s1] of vis) { this.rbox(R, r.parapetMat || b.wall, s0, yE, -0.25, s1, yE + par, 0); this.rbox(R, cm, s0 - 0.03, yE + par, -0.3, s1 + 0.03, yE + par + 0.08, 0.04); }
      } else if (r.overhang) { // flat roof with projecting eave slab (mid-century); no overhang on sides shared with a neighbour
        const o2 = r.overhang; const sh = this.sharedSides(b, yE);
        this.box(r.eaveMat || fasc, u0 - (sh.W ? 0 : o2), yE, v0 - (sh.N ? 0 : o2), u1 + (sh.E ? 0 : o2), yE + (r.eaveH ?? 0.3), v1 + (sh.S ? 0 : o2));
      }
      b.ridge = yE + par; return yE + par;
    }
    if (r.type === 'shed') { // slope down toward face r.low ('S','N','E','W')
      const rise = r.rise ?? 1.0; const low = r.low || 'S'; const o = ov;
      const A = [u0 - o, v0 - o], B = [u1 + o, v0 - o], C = [u1 + o, v1 + o], D = [u0 - o, v1 + o];
      const hAt = (u, v) => { const t = low === 'S' ? (v1 + o - v) / (v1 - v0 + 2 * o) : low === 'N' ? (v - (v0 - o)) / (v1 - v0 + 2 * o) : low === 'E' ? (u1 + o - u) / (u1 - u0 + 2 * o) : (u - (u0 - o)) / (u1 - u0 + 2 * o); return yE - o * rise / ((low === 'S' || low === 'N') ? (v1 - v0) : (u1 - u0)) + t * rise * (1 + 2 * o / ((low === 'S' || low === 'N') ? (v1 - v0) : (u1 - u0))); };
      const P = (p) => [p[0], hAt(p[0], p[1]), p[1]];
      this.add(mat, polysGeo([[P(D), P(C), P(B), P(A)]]), { uvMode: 'roof' });
      this.add(fasc, polysGeo([[P(A), P(B), P(C), P(D)].map(([x, y, z]) => [x, y - 0.15, z])]), { uvMode: 'roof' });
      { const E4 = [P(A), P(B), P(C), P(D)]; for (let k = 0; k < 4; k++) { const p = E4[k], q = E4[(k + 1) % 4]; this.add(fasc, polysGeo([[[p[0], p[1] - 0.3, p[2]], [q[0], q[1] - 0.3, q[2]], [q[0], q[1] + 0.02, q[2]], [p[0], p[1] + 0.02, p[2]]]])); this.add(fasc, polysGeo([[[p[0], p[1] + 0.02, p[2]], [q[0], q[1] + 0.02, q[2]], [q[0], q[1] - 0.3, q[2]], [p[0], p[1] - 0.3, p[2]]]])); } }
      // side walls up to the sloped roof (triangles/trapezoids)
      for (const f of FACES) {
        const R = this.faceRun(b, f); const pa = R.a, pb = R.b; const ha = hAt(pa[0], pa[1]), hb = hAt(pb[0], pb[1]);
        if (Math.max(ha, hb) > yE + 0.05) { const vis = CoopKit.subtract(R.L, this.covered(b, f, yE, yE + rise)); if (vis.length) this.add(b.wall, polysGeo([[[pa[0], yE, pa[1]], [pb[0], yE, pb[1]], [pb[0], Math.max(yE, hb), pb[1]], [pa[0], Math.max(yE, ha), pa[1]]]])); }
      }
      b.ridge = yE + rise; return b.ridge;
    }
    return yE;
  }
  // which sides of block b touch another block (over >40% of the side) whose walls reach at least y - 0.6
  sharedSides(b, y) {
    const out = {}; const L = { S: b.u1 - b.u0, N: b.u1 - b.u0, E: b.v1 - b.v0, W: b.v1 - b.v0 };
    for (const f of FACES) {
      let cov = 0;
      for (const B of this.blocks) {
        if (B === b || B.eave < y - 0.6) continue;
        const t = 0.08;
        if (f === 'S' && B.v0 <= b.v1 + t && B.v1 > b.v1 - t) cov += Math.max(0, Math.min(b.u1, B.u1) - Math.max(b.u0, B.u0));
        if (f === 'N' && B.v1 >= b.v0 - t && B.v0 < b.v0 + t) cov += Math.max(0, Math.min(b.u1, B.u1) - Math.max(b.u0, B.u0));
        if (f === 'E' && B.u0 <= b.u1 + t && B.u1 > b.u1 - t) cov += Math.max(0, Math.min(b.v1, B.v1) - Math.max(b.v0, B.v0));
        if (f === 'W' && B.u1 >= b.u0 - t && B.u0 < b.u0 + t) cov += Math.max(0, Math.min(b.v1, B.v1) - Math.max(b.v0, B.v0));
      }
      out[f] = cov > 0.4 * L[f];
    }
    return out;
  }
  // soffit ring + fascia + optional rafter tails around a hipped/flat overhang
  soffit(b, ov, yEdge, fasc, r) {
    const { u0, u1, v0, v1 } = b; const sm = r.soffitMat || fasc;
    const outer = [[u0 - ov, v0 - ov], [u1 + ov, v0 - ov], [u1 + ov, v1 + ov], [u0 - ov, v1 + ov]];
    const inner = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    this.flatDown(sm, outer, yEdge - 0.01, [inner]);
    this.loop(fasc, outer, [[0.0, yEdge - (r.fasciaH ?? 0.2)], [0.0, yEdge + 0.04]]);
    if (r.tails) {
      const sp = r.tailSp ?? 0.6, tw = 0.07, th = 0.14;
      for (const f of FACES) {
        const R = this.faceRun(b, f); const n = Math.floor(R.L / sp);
        for (let k = 0; k <= n; k++) { const s = (R.L - n * sp) / 2 + k * sp; this.rbox(R, r.tailMat || fasc, s - tw / 2, yEdge - th, 0, s + tw / 2, yEdge - 0.01, ov - 0.04, { detail: true }); }
      }
    }
  }
  // gable roof with independent eave (ov) and rake (ovE) overhangs, closed underside, barge boards and fascia
  gable2(mat, u0, v0, u1, v1, yE, rise, axis, ov, ovE, wallMat, fasc, thick = 0.18) {
    const polys = [];
    if (axis === 'u') {
      const vm = (v0 + v1) / 2, yR = yE + rise, half = (v1 - v0) / 2, s = ov * rise / half;
      const a0 = u0 - ovE, a1 = u1 + ovE;
      polys.push([[a0, yE - s, v0 - ov], [a1, yE - s, v0 - ov], [a1, yR, vm], [a0, yR, vm]]);
      polys.push([[a1, yE - s, v1 + ov], [a0, yE - s, v1 + ov], [a0, yR, vm], [a1, yR, vm]]);
      this.add(mat, polysGeo(polys.map((p) => p.slice().reverse())), { uvMode: 'roof' });
      this.add(fasc, polysGeo(polys.map((p) => p.map(([x, y, z]) => [x, y - thick, z]))), { uvMode: 'roof' });
      if (wallMat) for (const uu of [u0, u1]) this.add(wallMat, polysGeo([uu === u0 ? [[uu, yE, v1], [uu, yR, vm], [uu, yE, v0]] : [[uu, yE, v0], [uu, yR, vm], [uu, yE, v1]]]));
      // barge boards along the rakes, fascia along the eaves
      const rl = Math.hypot(half + ov, rise + s), ang = Math.atan2(rise + s, half + ov);
      for (const uu of [a0, a1]) for (const sg of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.06, 0.24, rl); g.rotateX(sg * ang); g.translate(uu, (yE - s + yR) / 2 - 0.1, vm + sg * (half + ov) / 2);
        this.add(fasc, g);
      }
      for (const vv of [v0 - ov, v1 + ov]) this.box(fasc, a0, yE - s - thick - 0.04, vv - 0.03, a1, yE - s + 0.02, vv + 0.03);
      { const g = new THREE.BoxGeometry(a1 - a0, 0.12, 0.3); g.rotateX(Math.PI / 4); g.translate((a0 + a1) / 2, yR - 0.02, vm); this.add(mat, g, { uvMode: 'roof' }); }
    } else {
      const um = (u0 + u1) / 2, yR = yE + rise, half = (u1 - u0) / 2, s = ov * rise / half;
      const b0 = v0 - ovE, b1 = v1 + ovE;
      polys.push([[u0 - ov, yE - s, b1], [u0 - ov, yE - s, b0], [um, yR, b0], [um, yR, b1]]);
      polys.push([[u1 + ov, yE - s, b0], [u1 + ov, yE - s, b1], [um, yR, b1], [um, yR, b0]]);
      this.add(mat, polysGeo(polys.map((p) => p.slice().reverse())), { uvMode: 'roof' });
      this.add(fasc, polysGeo(polys.map((p) => p.map(([x, y, z]) => [x, y - thick, z]))), { uvMode: 'roof' });
      if (wallMat) for (const vv of [v0, v1]) this.add(wallMat, polysGeo([vv === v0 ? [[u0, yE, vv], [um, yR, vv], [u1, yE, vv]] : [[u1, yE, vv], [um, yR, vv], [u0, yE, vv]]]));
      const rl = Math.hypot(half + ov, rise + s), ang = Math.atan2(rise + s, half + ov);
      for (const vv of [b0, b1]) for (const sg of [-1, 1]) {
        const g = new THREE.BoxGeometry(rl, 0.24, 0.06); g.rotateZ(-sg * ang); g.translate(um + sg * (half + ov) / 2, (yE - s + yR) / 2 - 0.1, vv);
        this.add(fasc, g);
      }
      for (const uu of [u0 - ov, u1 + ov]) this.box(fasc, uu - 0.03, yE - s - thick - 0.04, b0, uu + 0.03, yE - s + 0.02, b1);
      { const g = new THREE.BoxGeometry(0.3, 0.12, b1 - b0); g.rotateZ(Math.PI / 4); g.translate(um, yR - 0.02, (b0 + b1) / 2); this.add(mat, g, { uvMode: 'roof' }); }
    }
  }
  // roof surface height over block b at (u,v) (hip/gable only); used to seat dormers and chimneys
  roofY(b, u, v) {
    const r = b.roof; if (!r) return b.eave;
    if (r.type === 'hip') { const sl = r.slope ?? 0.42; const d = Math.min(u - b.u0, b.u1 - u, v - b.v0, b.v1 - v); return Math.min(b.ridge ?? Infinity, b.eave + Math.max(0, d) * sl); }
    if (r.type === 'gable') { const axis = r.axis || (b.u1 - b.u0 >= b.v1 - b.v0 ? 'u' : 'v'); const half = axis === 'u' ? (b.v1 - b.v0) / 2 : (b.u1 - b.u0) / 2; const rise = r.rise ?? half * (r.slope ?? 0.6); const d = axis === 'u' ? half - Math.abs(v - (b.v0 + b.v1) / 2) : half - Math.abs(u - (b.u0 + b.u1) / 2); return b.eave + Math.max(0, d) / half * rise; }
    return b.eave + (r.parapet ?? 0);
  }
  // gabled dormer on face f of block b, centred at s, width w, front wall height h (window inside), set back `back` from the wall line
  dormer(b, f, s, w, { h = 1.6, back = 0.4, win = { w: 0.8, h: 1.0, sill: 0.3, pair: 1 }, rise = 0.9, wall, roof, trim, shed = false, depth } = {}) {
    const R = this.faceRun(b, f); const M = this.M; wall = wall || b.wall; trim = trim || b.trim || M.whitePaint; roof = roof || b.roof?.mat;
    const sl = b.roof?.type === 'hip' ? (b.roof.slope ?? 0.42) : b.roof?.type === 'gable' ? ((b.roof.rise ?? 2) / ((b.roof.axis === 'u' ? b.v1 - b.v0 : b.u1 - b.u0) / 2)) : 1;
    const depthIn = depth ?? Math.max(1.0, Math.min(3.0, (h + rise * 0.6) / Math.max(0.2, sl) - back)); const y0 = b.eave - 0.1; const y1 = y0 + h;
    // dormer front wall with window(s)
    const DR = this.run(R.at(s - w / 2, -back), R.at(s + w / 2, -back));
    const ops = this.winOps([w / 2], y0, win).filter((o) => o.s0 > 0.1 && o.s1 < w - 0.1);
    this.wall(DR, wall, 0, w, y0 - 0.6, y1, ops, 0.18); for (const o of ops) this.fillWin(DR, o, win, trim); this.casing(DR, ops, trim, 0.08);
    // cheeks
    for (const [sa, sb] of [[0, 0], [w, w]]) { const p = DR.at(sa, 0), q = DR.at(sa, -depthIn); const C = this.run(sa === 0 ? q : p, sa === 0 ? p : q); this.wall(C, wall, 0, depthIn, y0 - 0.6, y1, [], 0.12); }
    // roof
    if (shed) { const g = new THREE.BoxGeometry(w + 0.3, 0.12, depthIn + 0.4); g.rotateX(-Math.atan2(0.5, depthIn)); g.translate(w / 2, y1 + 0.3, -depthIn / 2 + 0.2); this.addRun(DR, roof, g, { uvMode: 'roof' }); }
    else {
      const half = w / 2 + 0.2; const pts = [];
      const rl = Math.hypot(half, rise); const ang = Math.atan2(rise, half);
      for (const sg of [-1, 1]) { const g = new THREE.BoxGeometry(rl, 0.1, depthIn + 0.35); g.rotateZ(sg * ang); g.translate(w / 2 - sg * half / 2, y1 + rise / 2 + 0.05, -depthIn / 2 + 0.17); this.addRun(DR, roof, g, { uvMode: 'roof' }); }
      const sh = new THREE.Shape(); sh.moveTo(0, y1); sh.lineTo(w, y1); sh.lineTo(w / 2, y1 + rise); sh.lineTo(0, y1);
      const tg = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false }); tg.translate(0, 0, -0.12); this.addRun(DR, wall, tg);
    }
  }
  chimney(u, v, w, d, yTop, mat, { cap = true } = {}) {
    const M = this.M; mat = mat || M.brick; const gb = this.gMin(u - w / 2, v - d / 2, u + w / 2, v + d / 2, 2) - 0.8;
    this.box(mat, u - w / 2, gb, v - d / 2, u + w / 2, yTop, v + d / 2);
    if (cap) { this.box(mat, u - w / 2 - 0.06, yTop - 0.25, v - d / 2 - 0.06, u + w / 2 + 0.06, yTop - 0.05, v + d / 2 + 0.06); this.box(M.concreteDark, u - w / 2 + 0.1, yTop - 0.05, v - d / 2 + 0.1, u + w / 2 - 0.1, yTop + 0.15, v + d / 2 - 0.1); }
  }
  // porch on face f of block b: deck at y, from s0..s1, depth dp, posts, roof (shed/flat/hip), steps at sStep
  porch(b, f, s0, s1, dp, y, { postH = 2.6, posts = 0, roof = 'shed', roofMat, deckMat, postMat, rail = true, steps = null, stepW = 1.6, beam = 0.3, sides = true } = {}) {
    const R = this.faceRun(b, f); const M = this.M; const trim = b.trim || M.whitePaint; postMat = postMat || trim; deckMat = deckMat || M.wood; roofMat = roofMat || b.roof?.mat || coopMat('roof', '#5f5852');
    const gl = Math.min(this.gR(R, s0, dp), this.gR(R, s1, dp), this.gR(R, (s0 + s1) / 2, dp));
    const gh = Math.max(this.gR(R, s0, 0.3), this.gR(R, s1, 0.3), this.gR(R, (s0 + s1) / 2, dp), this.gR(R, s0, dp), this.gR(R, s1, dp)); const yIn = y; y = Math.max(y, gh + 0.2);
    this.rbox(R, M.concreteDark, s0, gl - 0.8, 0, s1, y - 0.15, dp);
    this.rbox(R, deckMat, s0 - 0.05, y - 0.15, 0, s1 + 0.05, y, dp + 0.05);
    const np = posts || Math.max(2, Math.round((s1 - s0) / 2.6) + 1);
    const ps = []; for (let k = 0; k < np; k++) ps.push(s0 + 0.15 + (s1 - s0 - 0.3) * k / (np - 1));
    const yT = y + postH;
    for (const p of ps) { this.rbox(R, postMat, p - 0.1, y, dp - 0.3, p + 0.1, yT, dp - 0.1); this.colliders.push(this._colRun(R, p - 0.12, dp - 0.32, p + 0.12, dp - 0.08, y - 1, yT)); }
    this.rbox(R, trim, s0, yT, dp - 0.35, s1, yT + beam, dp - 0.05);
    if (rail) {
      const segs = []; for (let k = 0; k < ps.length - 1; k++) segs.push([ps[k] + 0.1, ps[k + 1] - 0.1]);
      const cut = steps != null ? [steps - stepW / 2 - 0.05, steps + stepW / 2 + 0.05] : null;
      for (const [a, z] of segs) {
        const parts = cut ? CoopKit.subtract(z - a, [[cut[0] - a, cut[1] - a]]).map(([p, q]) => [a + p, a + q]) : [[a, z]];
        for (const [p, q] of parts) if (q - p > 0.3) this._rail(R, p, q, dp - 0.2, y, trim);
      }
      if (sides) for (const s of [s0 + 0.12, s1 - 0.12]) { const S = this.run(R.at(s, 0.1), R.at(s, dp - 0.25)); this._rail(S, 0.05, S.L - 0.05, 0, y, trim); }
    }
    if (roof === 'shed') { const g = new THREE.BoxGeometry(s1 - s0 + 0.5, 0.12, dp + 0.4); const ang = Math.atan2(0.6, dp); g.rotateX(ang); g.translate((s0 + s1) / 2, yT + beam + 0.25, dp / 2 + 0.1); this.addRun(R, roofMat, g, { uvMode: 'roof' }); }
    else if (roof === 'flat') { this.rbox(R, trim, s0 - 0.2, yT + beam, -0.05, s1 + 0.2, yT + beam + 0.22, dp + 0.2); }
    // walkable deck
    this.walkables.push(this.walkRun(R, s0, s1, 0, dp, () => y));
    if (steps != null && y - gl > 0.15) {
      const n = Math.max(1, Math.round((y - gl) / 0.18)); const tr = 0.3;
      for (let k = 0; k < n; k++) { const h = y - (y - gl) * (k + 1) / n; if (h < gl + 0.02) break; this.rbox(R, M.concrete, steps - stepW / 2, gl - 0.6, dp + k * tr, steps + stepW / 2, h, dp + (k + 1) * tr); }
      this.walkables.push(this.walkRun(R, steps - stepW / 2, steps + stepW / 2, dp, dp + n * tr, (ss, dd) => Math.max(gl, y - (y - gl) * (Math.floor((dd - dp) / tr) + 1) / n)));
    }
    return { R, yT };
  }
  _rail(R, a, z, d, y, mat, h = 0.95) {
    this.rbox(R, mat, a, y + h - 0.08, d - 0.06, z, y + h, d + 0.06); this.rbox(R, mat, a, y + 0.08, d - 0.04, z, y + 0.16, d + 0.04, { detail: true });
    const n = Math.max(1, Math.floor((z - a) / 0.13)); for (let k = 0; k < n; k++) { const s = a + (z - a) * (k + 0.5) / n; this.rbox(R, mat, s - 0.022, y + 0.16, d - 0.022, s + 0.022, y + h - 0.08, d + 0.022, { detail: true }); }
  }
  _colRun(R, s0, d0, s1, d1, y0, y1) { return this.colPoly([R.at(s0, d0), R.at(s1, d0), R.at(s1, d1), R.at(s0, d1)], y0, y1); }
  // balcony slab + railing on face f of block b
  balcony(b, f, s0, s1, dp, y, { mat, rail, solid = false, brackets = true } = {}) {
    const R = this.faceRun(b, f); const M = this.M; mat = mat || M.concrete; rail = rail || M.iron;
    this.rbox(R, mat, s0, y - 0.18, 0, s1, y, dp);
    if (solid) { this.rbox(R, rail, s0, y, dp - 0.06, s1, y + 1.0, dp); for (const s of [s0, s1]) this.rbox(R, rail, s - (s === s1 ? 0.06 : 0), y, 0, s + (s === s0 ? 0.06 : 0), y + 1.0, dp); }
    else { this._rail(R, s0 + 0.05, s1 - 0.05, dp - 0.05, y, rail, 1.0); for (const s of [s0 + 0.05, s1 - 0.05]) { const S = this.run(R.at(s, 0), R.at(s, dp)); this._rail(S, 0.05, dp - 0.05, 0, y, rail, 1.0); } }
    if (brackets) for (const s of [s0 + 0.2, s1 - 0.2]) this.rbox(R, mat, s - 0.06, y - 0.6, 0, s + 0.06, y - 0.18, dp * 0.6, { detail: true });
  }
  // projecting bay (box bay) on face f: s0..s1, depth dp, from y0 to y1, windows on the front and sides
  bay(b, f, s0, s1, dp, y0, y1, { win, roofType = 'hip', wall, roofMat } = {}) {
    const R = this.faceRun(b, f); const M = this.M; wall = wall || b.wall; const trim = b.trim || M.whitePaint; win = win || { w: 0.9, h: 1.5, sill: 0.8, pair: 1 };
    const p = (s, d) => R.at(s, d);
    const runs = [this.run(p(s0, 0), p(s0, dp)), this.run(p(s0, dp), p(s1, dp)), this.run(p(s1, dp), p(s1, 0))];
    // fix orientation: runs must have outward normal away from the bay interior. run(a,b) normal = left of travel... use classic convention
    const bb = [this.run(p(s0, 0), p(s0, dp)), this.run(p(s0, dp), p(s1, dp)), this.run(p(s1, dp), p(s1, 0))];
    for (const [k, BR] of bb.entries()) {
      const L = BR.L; const ops = k === 1 ? this.winOps([L / 2 - (win.pair > 1 ? 0 : 0)], y0, { ...win, pair: Math.max(1, Math.floor((L - 0.3) / (win.w + 0.2))) }) : this.winOps([L / 2], y0, { ...win, w: Math.min(win.w, L - 0.4), pair: 1 });
      this.wall(BR, wall, 0, L, y0 - 0.5, y1, ops.filter((o) => o.s0 > 0.08 && o.s1 < L - 0.08), 0.18);
      for (const o of ops) if (o.s0 > 0.08 && o.s1 < L - 0.08) this.fillWin(BR, o, win, trim);
      this.casing(BR, ops.filter((o) => o.s0 > 0.08 && o.s1 < L - 0.08), trim, 0.08);
    }
    // roof cap
    const rm = roofMat || b.roof?.mat || coopMat('roof', '#5f5852');
    const g = new THREE.BoxGeometry(s1 - s0 + 0.3, 0.14, dp + 0.2); g.translate((s0 + s1) / 2, y1 + 0.07, dp / 2); this.addRun(R, rm, g);
    this.rbox(R, M.concreteDark, s0, y0 - 0.65, 0, s1, y0 - 0.5, dp);
  }
  // ---- data-driven massing: decompose the (near-orthogonal) OSM footprint into rectangles in the building frame and read each
  // rectangle's eave/ridge from the packet's LiDAR top surface. Returns [{u0,u1,v0,v1, top, edge, ridge, pitched, gmin, gmax}].
  lidarAt(x, z) { const L = this.ctx.packet?.lidarTop; if (!L) return null; const fx = (x - L.x0) / L.step, fz = (z - L.z0) / L.step; const i = Math.round(fx), j = Math.round(fz); if (i < 0 || j < 0 || i >= L.nx || j >= L.nz) return null; const v = L.h[j][i]; return v == null ? null : v; }
  lidarUV(u, v) { const [x, z] = this.xz(u, v); return this.lidarAt(x, z); }
  autoRects({ snap = 0.45, minDim = 1.0, fp = 0 } = {}) {
    const ring = this.ctx.footprints[fp].outer.map(([x, z]) => this.uv(x, z));
    const clus = (vals) => { const s = [...vals].sort((a, b) => a - b); const out = []; for (const v of s) { if (out.length && v - out[out.length - 1].last < snap) { const c = out[out.length - 1]; c.sum += v; c.n++; c.last = v; } else out.push({ sum: v, n: 1, last: v }); } return out.map((c) => c.sum / c.n); };
    const us = clus(ring.map((p) => p[0])), vs = clus(ring.map((p) => p[1]));
    const sn = (v, arr) => arr.reduce((b, a) => Math.abs(a - v) < Math.abs(b - v) ? a : b, arr[0]);
    const poly = ring.map(([u, v]) => [sn(u, us), sn(v, vs)]);
    const inside = (u, v) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > v) !== (zj > v) && u < (xj - xi) * (v - zi) / (zj - zi) + xi) c = !c; } return c; };
    const nu = us.length - 1, nv = vs.length - 1; const cell = []; for (let j = 0; j < nv; j++) { cell.push([]); for (let i = 0; i < nu; i++) cell[j].push(inside((us[i] + us[i + 1]) / 2, (vs[j] + vs[j + 1]) / 2) ? 1 : 0); }
    const rects = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      if (cell[j][i] !== 1) continue; let i2 = i; while (i2 + 1 < nu && cell[j][i2 + 1] === 1) i2++;
      let j2 = j; outer: while (j2 + 1 < nv) { for (let k = i; k <= i2; k++) if (cell[j2 + 1][k] !== 1) break outer; j2++; }
      for (let jj = j; jj <= j2; jj++) for (let k = i; k <= i2; k++) cell[jj][k] = 2;
      rects.push({ u0: us[i], u1: us[i2 + 1], v0: vs[j], v1: vs[j2 + 1] });
    }
    return rects.filter((r) => r.u1 - r.u0 >= minDim && r.v1 - r.v0 >= minDim);
  }
  // LiDAR statistics for a rectangle: median edge height (eave band), max of the central band (ridge), median overall
  rectStats(r, { band = 1.2, trees = 2.5 } = {}) {
    const all = [], edge = [], mid = []; const w = r.u1 - r.u0, d = r.v1 - r.v0; const long = w >= d ? 'u' : 'v';
    for (let u = r.u0 + 0.4; u <= r.u1 - 0.4; u += 0.5) for (let v = r.v0 + 0.4; v <= r.v1 - 0.4; v += 0.5) {
      const h = this.lidarUV(u, v); if (h == null) continue; all.push(h);
      const de = Math.min(u - r.u0, r.u1 - u, v - r.v0, r.v1 - v); if (de < band) edge.push(h);
      const dm = long === 'u' ? Math.abs(v - (r.v0 + r.v1) / 2) : Math.abs(u - (r.u0 + r.u1) / 2); if (dm < 0.8) mid.push(h);
    }
    const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const q = (a, f) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * f))]; };
    const e = q(edge, 0.4), m = q(mid, 0.6), a = med(all);
    return { edge: e, ridge: m, med: a, pitched: e != null && m != null && m - e > 1.1, long, gmin: this.gMin(r.u0, r.v0, r.u1, r.v1, 4), gmax: this.gMax(r.u0, r.v0, r.u1, r.v1, 4) };
  }
  // projecting horizontal fins / sunshade slabs along every visible face of block b at heights ys
  fins(b, ys, proj = 0.45, th = 0.18, mat, { wedge = false } = {}) {
    mat = mat || b.wall;
    for (const f of FACES) { if (b.faces?.[f] === false) continue; const R = this.faceRun(b, f);
      for (const y of ys) for (const [s0, s1] of CoopKit.subtract(R.L, this.covered(b, f, y - th, y))) {
        if (wedge) this.mould(R, mat, s0, s1, [[0, y - proj * 1.0], [proj, y - 0.02], [proj, y + 0.14], [0, y + 0.14]]);
        else this.rbox(R, mat, s0 - proj, y - th, -0.05, s1 + proj, y, proj);
      } }
  }
  // tilted solar panels on A-frame racks over a rectangle (building frame) at roof height y
  solar(u0, v0, u1, v1, y, { tilt = 0.6, rowD = 3.2, panel, frame } = {}) {
    const M = this.M; panel = panel || coopMat('metal', '#1f2c46'); frame = frame || M.iron;
    for (let v = v0 + 1; v < v1 - 0.5; v += rowD) {
      const L = 2.4, h = Math.sin(tilt) * L, d = Math.cos(tilt) * L, lift = 1.4;
      const g = new THREE.BoxGeometry(u1 - u0, 0.06, L); g.rotateX(tilt); g.translate((u0 + u1) / 2, y + lift + h / 2, v + d / 2); this.add(panel, g);
      for (let u = u0 + 0.3; u <= u1 - 0.2; u += 2.5) { this.box(frame, u - 0.05, y, v - 0.05, u + 0.05, y + lift + h, v + 0.05); this.box(frame, u - 0.05, y, v + d - 0.05, u + 0.05, y + lift, v + d + 0.05); const br = new THREE.BoxGeometry(0.06, 0.06, Math.hypot(d, lift + h)); br.rotateX(Math.atan2(lift + h, d) - Math.PI / 2 + Math.PI / 2 * 0); br.translate(u, y + (lift + h) / 2, v + d / 2); this.add(frame, br, { detail: true }); }
    }
  }
  // downward-facing flat polygon (Kit.flat(down) mirrors v)
  flatDown(mat, poly, y, holes = [], opts) {
    const sh = new THREE.Shape(); sh.setFromPoints(poly.map(([u, v]) => new THREE.Vector2(u, v)));
    for (const h of holes) { const p = new THREE.Path(); p.setFromPoints(h.map(([u, v]) => new THREE.Vector2(u, v))); sh.holes.push(p); }
    const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2); g.translate(0, y, 0); return this.add(mat, g, opts);
  }
  // walkable over a rectangle in run coords (s0..s1, d0..d1) with height fn(s, d)
  walkRun(R, s0, s1, d0, d1, fn) {
    const P = [R.at(s0, d0), R.at(s1, d0), R.at(s1, d1), R.at(s0, d1)].map(([u, v]) => this.xz(u, v));
    const xs = P.map((p) => p[0]), zs = P.map((p) => p[1]); const self = this;
    return { type: 'fn', bounds: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], heightAt: (x, z) => { const [u, v] = self.uv(x, z); const du = u - R.a[0], dv = v - R.a[1]; const s = du * R.t[0] + dv * R.t[1], d = du * R.n[0] + dv * R.n[1]; if (s < s0 || s > s1 || d < d0 || d > d1) return null; return fn(s, d); } };
  }
  done(name) {
    this.buildBlocks();
    const object3d = this.finish(); object3d.name = name;
    return { object3d, colliders: this.colliders, walkables: this.walkables };
  }
}

// ---------------- mid-century garden-apartment helper (Rochdale Village, Fenwick, etc.) ----------------
// rects: [{u0,u1,v0,v1, top, floors?, roof?: 'flat'|'gable'|'shed', rise, walk?: 'S'|'N'|'E'|'W', mat?}] in the building frame.
// style: {wall, alt, trim, fascia, rail, roofMat, fh (floor height), win, overhang}
export function gardenApartments(K, rects, style) {
  const M = K.M; const fh = style.fh ?? 2.9;
  const blocks = [];
  for (const r of rects) {
    const g0 = K.gMin(r.u0, r.v0, r.u1, r.v1, 4); const gmax = K.gMax(r.u0, r.v0, r.u1, r.v1, 4);
    const top = r.top; const f0 = r.f0 ?? Math.max(g0 + 0.25, Math.min(gmax + 0.15, g0 + 0.6));
    const n = r.floors ?? Math.max(1, Math.round((top - 0.5 - f0) / fh));
    const eave = r.roof === 'gable' || r.roof === 'hip' || r.roof === 'shed' ? top - (r.rise ?? 2.5) : top - (style.parapet ?? 0.25);
    const floors = []; for (let i = 0; i < n; i++) floors.push(+(f0 + (eave - f0) * i / n).toFixed(2)); floors.push(+eave.toFixed(2));
    const roof = r.roof === 'gable' ? { type: 'gable', rise: r.rise ?? 2.5, axis: r.axis, overhang: style.overhang ?? 0.8, mat: style.roofMat, fascia: style.fascia }
      : r.roof === 'hip' ? { type: 'hip', slope: r.slope ?? 0.35, overhang: style.overhang ?? 0.8, mat: style.roofMat, fascia: style.fascia, soffitMat: style.fascia }
        : r.roof === 'shed' ? { type: 'shed', rise: r.rise ?? 2.5, low: r.low || 'W', overhang: style.overhang ?? 0.7, mat: style.roofMat, fascia: style.fascia }
        : { type: 'flat', parapet: 0, overhang: style.overhang ?? 0.7, eaveMat: style.fascia, eaveH: 0.28, deck: M.concreteDark };
    const b = K.block({ u0: r.u0, u1: r.u1, v0: r.v0, v1: r.v1, floors, wall: r.mat || style.wall, trim: style.trim, win: r.win || style.win, bay: r.bay ?? style.bay ?? 3.3, depth: 0.22, roof, faces: r.faces });
    b.walk = r.walk; blocks.push(b);
  }
  K.buildBlocks();
  // cantilevered walkway-balconies with wood railings on the chosen face, at every upper floor; open stairs at one end
  for (const b of blocks) {
    if (!b.walk) continue; const R = K.faceRun(b, b.walk); const dp = style.walkDepth ?? 1.4;
    const vis = (y) => CoopKit.subtract(R.L, K.covered(b, b.walk, y - 0.2, y + 1.0));
    for (let i = 1; i < b.floors.length - 1; i++) {
      const y = b.floors[i];
      for (const [s0, s1] of vis(y)) { if (s1 - s0 < 3) continue;
        K.rbox(R, style.slab || M.concrete, s0 + 0.1, y - 0.22, 0, s1 - 0.1, y, dp);
        K._rail(R, s0 + 0.15, s1 - 0.15, dp - 0.06, y, style.rail || M.wood, 1.05);
        for (const s of [s0 + 0.15, s1 - 0.15]) { const S = K.run(R.at(s, 0), R.at(s, dp)); K._rail(S, 0.05, dp - 0.1, 0, y, style.rail || M.wood, 1.05); }
        K.walkables.push(K.walkRun(R, s0 + 0.1, s1 - 0.1, 0, dp, () => y));
      }
    }
    // posts carrying the walkways
    const yTop = b.floors[b.floors.length - 2];
    for (const [s0, s1] of vis(b.floors[1] || b.floors[0])) { if (s1 - s0 < 3) continue; const np = Math.max(2, Math.round((s1 - s0) / 4) + 1); for (let k = 0; k < np; k++) { const s = s0 + 0.3 + (s1 - s0 - 0.6) * k / (np - 1); const g = K.gR(R, s, dp - 0.2); K.rbox(R, style.post || style.fascia || M.woodDark, s - 0.08, g - 0.3, dp - 0.25, s + 0.08, yTop, dp - 0.09); } }
  }
  return blocks;
}
