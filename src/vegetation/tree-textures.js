// Procedural textures for the tree library: packed leaf-cluster atlases (canvas-drawn) and bark (albedo + normal).
// Leaf atlas channels (linear, not colour): R = shading, G = per-leaf random (drives colour ramps / autumn mix),
// B = twig mask, A = coverage. Each atlas is 2:1 with two square cells (u 0-0.5 and 0.5-1). In every cell the twig
// base sits at the bottom centre (v = 0) and the shoot grows toward v = 1, so a card whose base is placed on a branch
// tip looks attached. Each kind draws its leaves at real size for a cell of `cellM` metres (cards use that size, so
// texel density is ~1000 px/m at the default 2048 px atlas). For the palm, cell 1 is a dead (brown) frond.
import * as THREE from 'three';
import { hash2, mulberry32 } from '../lib/noise.js';

const TAU = Math.PI * 2;

// ---------- periodic noise ----------
export function pnoise(x, y, px, py, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const mx = (a) => ((a % px) + px) % px, my = (a) => ((a % py) + py) % py;
  const a = hash2(mx(xi), my(yi), seed), b = hash2(mx(xi + 1), my(yi), seed);
  const c = hash2(mx(xi), my(yi + 1), seed), d = hash2(mx(xi + 1), my(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function pfbm(x, y, px, py, oct = 4, seed = 0) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += amp * pnoise(x * f, y * f, px * f, py * f, seed + i * 17); n += amp; amp *= 0.5; f *= 2; }
  return s / n;
}
function pcell(x, y, px, py, seed) {
  const xi = Math.floor(x), yi = Math.floor(y); let d1 = 9, d2 = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j; const wx = ((cx % px) + px) % px, wy = ((cy % py) + py) % py;
    const fx = cx + hash2(wx, wy, seed), fy = cy + hash2(wx, wy, seed + 1);
    const d = Math.hypot(fx - x, fy - y);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return [d1, d2];
}
const cl = (v) => Math.max(0, Math.min(255, v));

// ---------- bark ----------
// One tile covers 1 m around the trunk (u) x 2 m along it (v). Returns sRGB [r,g,b] 0..255 and height 0..1.
const BARK = {
  oak: (u, v) => { // coast live oak: warm grey to grey-brown, blocky furrows low on the trunk, pale lichen patches
    const w = pfbm(u * 4, v * 4, 4, 4, 4, 5);
    const r = Math.abs(Math.sin(Math.PI * (u * 5 + w * 2.2)));
    const cross = pfbm(u * 5, v * 9, 5, 9, 3, 9);
    const h = Math.pow(r, 0.5) * (0.6 + 0.4 * cross) * (cross < 0.34 ? 0.55 : 1);
    const n = pfbm(u * 32, v * 32, 32, 32, 3, 13);
    const k = 0.55 + 0.45 * h + (n - 0.5) * 0.2;
    let c = [128 * k + 12, 117 * k + 10, 102 * k + 8];
    const li = pfbm(u * 5, v * 10, 5, 10, 4, 17);
    if (li > 0.6 && h > 0.35) { const t = Math.min(1, (li - 0.6) * 6); c = [c[0] + (168 - c[0]) * t, c[1] + (174 - c[1]) * t, c[2] + (146 - c[2]) * t]; }
    return [cl(c[0]), cl(c[1]), cl(c[2]), h * 0.85 + n * 0.15];
  },
  plane: (u, v) => { // London plane: smooth, camouflage patches of cream / olive / grey-brown
    const n1 = pfbm(u * 4, v * 8, 4, 8, 4, 21), n2 = pfbm(u * 6, v * 12, 6, 12, 3, 25);
    let c, h;
    if (n1 > 0.57) { c = [204, 194, 162]; h = 0.42; }       // fresh cream
    else if (n1 > 0.48) { c = [150, 146, 102]; h = 0.52; }  // olive-tan
    else { c = [106, 98, 82]; h = 0.6; } // (darker than before: the camouflage must read at 10 m)                   // older grey-brown
    if (n2 > 0.62) c = [c[0] * 0.9 + 14, c[1] * 0.9 + 12, c[2] * 0.9 + 4];
    const f = pfbm(u * 48, v * 48, 48, 48, 2, 27); const k = 0.92 + (f - 0.5) * 0.16;
    return [cl(c[0] * k), cl(c[1] * k), cl(c[2] * k), h + (f - 0.5) * 0.06];
  },
  redwood: (u, v) => { // redwood: thick fibrous vertical ridges, cinnamon red-brown
    const w = pfbm(u * 3, v * 2, 3, 2, 3, 31);
    const s = pfbm(u * 28 + w * 5, v * 3, 28, 3, 3, 33);
    const ridge = Math.pow(1 - Math.abs(s * 2 - 1), 1.4);
    const f = pnoise(u * 96, v * 6, 96, 6, 35);
    const k = 0.5 + 0.5 * ridge + (f - 0.5) * 0.22;
    return [cl(136 * k + 12), cl(80 * k + 8), cl(60 * k + 6), ridge * 0.8 + f * 0.2]; // r4-trees: a step less orange (read as a painted pole in sun)
  },
  euc: (u, v) => { // blue gum: smooth cream-grey with long tan strips peeling away
    const n = pfbm(u * 4, v * 8, 4, 8, 4, 41);
    const st = pfbm(u * 12, v * 2, 12, 2, 3, 43);
    const f = pfbm(u * 40, v * 8, 40, 8, 2, 45);
    let c, h;
    if (st > 0.65) { c = [156, 128, 96]; h = 0.75; }
    else if (st > 0.61) { c = [110, 92, 72]; h = 0.6; }
    else { c = n > 0.55 ? [176, 174, 160] : [194, 188, 172]; h = 0.4; } // weathered grey-cream; pure cream read as white in game
    const k = 0.93 + (f - 0.5) * 0.14;
    return [cl(c[0] * k), cl(c[1] * k), cl(c[2] * k), h + f * 0.05];
  },
  pine: (u, v) => { // Monterey pine: dark grey-brown plates split by deep black fissures
    const [d1, d2] = pcell(u * 6, v * 5, 6, 5, 51);
    const edge = Math.min(1, (d2 - d1) * 3.5);
    const n = pfbm(u * 24, v * 24, 24, 24, 3, 53);
    const k = edge < 0.22 ? 0.22 + edge * 1.2 : 0.62 + 0.38 * n;
    return [cl(98 * k + 12), cl(80 * k + 8), cl(68 * k + 6), Math.min(edge * 2, 1) * 0.8 + n * 0.2];
  },
  smooth: (u, v) => { // magnolia / bay / ginkgo / maple: fairly smooth grey-brown with lenticels
    const n = pfbm(u * 5, v * 10, 5, 10, 4, 61), f = pfbm(u * 40, v * 12, 40, 12, 2, 63);
    const len = pnoise(u * 30, v * 60, 30, 60, 65) > 0.84 ? 0.82 : 1;
    const k = (0.82 + (n - 0.5) * 0.3 + (f - 0.5) * 0.12) * len;
    return [cl(116 * k), cl(108 * k), cl(96 * k), n * 0.6 + f * 0.4];
  },
  palm: (u, v) => { // fan palm: grey-brown with tight horizontal leaf-scar rings and vertical cracks
    const ring = Math.abs(Math.sin(Math.PI * v * 16 + pnoise(u * 8, v * 4, 8, 4, 71) * 2.2));
    const fis = pfbm(u * 20, v * 3, 20, 3, 3, 73);
    const k = 0.55 + 0.32 * Math.pow(ring, 0.5) + (fis - 0.5) * 0.3;
    return [cl(130 * k), cl(118 * k), cl(100 * k), ring * 0.5 + fis * 0.5];
  },
};

// [r6-load] in the game, drop a texture's CPU copy (level 0 + mip chain) once it is on the GPU: ~2.7 MB per 1024x512
// atlas, ~80 MB over the tree library. createTreeLibrary draws every atlas at boot, before the first frame uploads them;
// a cache hit on a freed atlas rebuilds it (only harness pages ever do that).
const inGame = () => typeof window !== 'undefined' && !!(window.BSIM && window.BSIM.qs);
export function freeAfterUpload(t) { if (!inGame()) return t; const prev = t.onUpdate; t.onUpdate = function () { if (prev) prev.call(this, t); if (t.mipmaps) for (const m of t.mipmaps) m.data = null; if (t.image && t.image.data) t.image.data = null; t.userData.freed = true; }; return t; }
const live = (t) => t && !(t.userData && t.userData.freed);
const _bark = {};
export function barkTexture(kind) {
  if (_bark[kind] && live(_bark[kind].map) && live(_bark[kind].normalMap)) return _bark[kind];
  const W = 256, H = 512, f = BARK[kind];
  const col = new Uint8Array(W * H * 4), hg = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = f(x / W, y / H), i = y * W + x;
    col[i * 4] = o[0]; col[i * 4 + 1] = o[1]; col[i * 4 + 2] = o[2]; col[i * 4 + 3] = 255; hg[i] = o[3];
  }
  const nm = new Uint8Array(W * H * 4), S = kind === 'plane' || kind === 'euc' ? 2.5 : 5.0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const xm = hg[y * W + ((x - 1 + W) % W)], xp = hg[y * W + ((x + 1) % W)];
    const ym = hg[((y - 1 + H) % H) * W + x], yp = hg[((y + 1) % H) * W + x];
    let nx = (xm - xp) * S, ny = (ym - yp) * S, nz = 1; const l = Math.hypot(nx, ny, nz);
    const i = (y * W + x) * 4;
    nm[i] = (nx / l * 0.5 + 0.5) * 255; nm[i + 1] = (ny / l * 0.5 + 0.5) * 255; nm[i + 2] = (nz / l * 0.5 + 0.5) * 255; nm[i + 3] = 255;
  }
  const mk = (data, srgb) => {
    const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; return freeAfterUpload(t);
  };
  return (_bark[kind] = { map: mk(col, true), normalMap: mk(nm, false) });
}

// ---------- leaf atlases ----------
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// metres represented by one atlas cell (= card size) per leaf kind
export const LEAF_KINDS = {
  oak: { cellM: 1.0 }, shrub: { cellM: 0.5 }, bay: { cellM: 1.0 }, magnolia: { cellM: 1.3 }, plane: { cellM: 1.4 }, maple: { cellM: 1.2 },
  ginkgo: { cellM: 1.0 }, euc: { cellM: 1.8 }, needle: { cellM: 1.4 }, spray: { cellM: 1.3 }, tuft: { cellM: 1.4 }, scale: { cellM: 0.8 }, palm: { cellM: 2.0 },
};
// r4-trees2: hero-LOD sprigs (M = sprig card size in metres, o = broadleaf overrides: fewer shoots/sides so a sprig
// is one small twig carrying a dozen or two real-size leaves)
export const SPRIGS = {
  oak: { M: 0.85, o: { shoots: 5, sides: 9, sub: 2, fan: 0.85, len: 0.95 } },
  bay: { M: 0.5, o: { shoots: 2, sides: 4, sub: 1, fan: 0.6 } },
  shrub: { M: 0.3, o: { shoots: 2, sides: 4, sub: 1 } },
  magnolia: { M: 0.75, o: { shoots: 2, sides: 2, sub: 0, nodes: 6 } },
  plane: { M: 0.95, o: { shoots: 2, sides: 2, sub: 0, nodes: 5, fan: 0.55 } },
  maple: { M: 0.7, o: { shoots: 2, sides: 2, sub: 0, nodes: 6 } },
  ginkgo: { M: 0.6 }, euc: { M: 1.0, o: { shoots: 2, sides: 3, sub: 1, fan: 0.4 } },
  needle: { M: 0.7 }, spray: { M: 0.65 }, tuft: { M: 0.7 }, scale: { M: 0.45 }, palm: { M: 2.0 },
};
export function leafCellUV(cell) { const e = 0.003; return cell ? [0.5 + e, e, 1 - e, 1 - e] : [e, e, 0.5 - e, 1 - e]; }

const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
function strokeLine(g, pts, w, r, gg, b) { g.strokeStyle = rgb(r, gg, b); g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
const twig = (g, pts, w, shade = 105) => strokeLine(g, pts, w, shade, 0, 255);
function taperTwig(g, pts, w0, shade = 105, keep = 0.9) { // tapered, trimmed to `keep` of its length
  const n = Math.max(1, Math.floor((pts.length - 1) * keep));
  for (let i = 0; i < n; i++) strokeLine(g, [pts[i], pts[i + 1]], w0 * (1 - 0.65 * i / Math.max(1, n)), shade, 0, 255);
}

// ---- leaf outlines (local frame: petiole joins at (0,0), tip at (0,L), +x = right half) ----
function outline(shape, L, W, rnd) {
  const pts = [], N = 22;
  const side = (hw, cx = () => 0, teeth = 0, tooth = 0) => {
    const right = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N; let w = hw(t);
      if (teeth && i > 1 && i < N - 1 && i % 2 === 1) w += tooth * W * (0.6 + 0.4 * Math.sin(t * Math.PI));
      right.push([cx(t) + w, t * L]);
    }
    const left = right.map(([x, y], i) => [2 * cx(i / N) - x, y]).reverse();
    return [...right, ...left];
  };
  switch (shape) {
    case 'oak': { // oval, cupped; holly-like margin: 5-6 spine-tipped teeth per side with concave scallops between
      const hw = (t) => W / 2 * Math.pow(Math.sin(Math.PI * (0.04 + 0.92 * t)), 0.6) * (1 - 0.12 * t);
      const right = [[0, 0]], nT = 3 + (rnd() < 0.5 ? 1 : 0);
      for (let k = 0; k < nT; k++) {
        const t0 = 0.08 + 0.84 * k / nT, t1 = 0.08 + 0.84 * (k + 1) / nT, tm = (t0 + t1) / 2;
        right.push([hw(t0) * 0.97, t0 * L]);
        right.push([hw(tm) * 0.86, tm * L]);                          // scallop (concave)
        right.push([hw(t1) + W * (0.1 + 0.05 * rnd()), (t1 + 0.02) * L]); // spine tip
      }
      right.push([W * 0.04, L * 0.97]); right.push([0, L]);
      const left = right.slice(1, -1).map(([x, y]) => [-x * (0.94 + 0.12 * rnd()), y]).reverse();
      return [...right, ...left];
    }
    case 'shrub': return side((t) => W / 2 * Math.pow(Math.sin(Math.PI * t), 0.65));
    case 'lance': return side((t) => W / 2 * Math.pow(Math.sin(Math.PI * t), 0.85) * (1 - 0.3 * t));
    case 'ellip': return side((t) => W / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.02)), 0.55));
    case 'sickle': return side((t) => W / 2 * Math.pow(Math.sin(Math.PI * t), 0.9) * (1 - 0.2 * t), (t) => W * 1.6 * t * t);
    case 'fan': { // ginkgo: narrow wedge base with concave sides widening into a broad wavy top, central notch
      const out = [[0, 0]], top = L, wTop = L * 0.72;
      for (let i = 0; i <= 8; i++) { const t = i / 8; out.push([wTop * Math.pow(t, 1.8), top * (0.08 + 0.72 * t)]); }
      for (let i = 0; i <= 16; i++) { const u = 1 - i / 16; const x = wTop * u; const notch = u < 0.08 ? 0.86 + u * 1.5 : 1; out.push([x, top * (0.8 + 0.2 * Math.sqrt(1 - u * u * 0.9)) * notch + top * 0.012 * Math.sin(u * 9.0)]); }
      const right = out.slice(1); const left = right.map(([x, y]) => [-x, y]).reverse();
      return [[0, 0], ...right, ...left];
    }
    case 'plane': case 'maple': { // palmate: plane = broad shallow triangular lobes (sinus 1/3 deep), truncate base;
      const maple = shape === 'maple';  // maple = 5 deep, toothed, pointed lobes
      const lobes = maple ? [[-1.95, 0.55], [-1.05, 0.9], [0, 1.0], [1.05, 0.9], [1.95, 0.55]] : [[-2.05, 0.55], [-1.05, 0.97], [0, 1.0], [1.05, 0.97], [2.05, 0.55]];
      const sinus = maple ? 0.4 : 0.66, c = [0, L * (maple ? 0.38 : 0.34)], R = L * (maple ? 0.62 : 0.66), out = [[0, L * 0.02]];
      const P = (a, r) => [c[0] + Math.sin(a) * r, c[1] + Math.cos(a) * r];
      out.push(P(-2.6, R * (maple ? 0.32 : 0.42)));
      for (let k = 0; k < lobes.length; k++) {
        const [a, rr] = lobes[k];
        const aPrev = k ? (lobes[k - 1][0] + a) / 2 : a - 0.45, aNext = k < lobes.length - 1 ? (lobes[k + 1][0] + a) / 2 : a + 0.45;
        out.push(P(aPrev, R * sinus * (k ? 1 : 0.85)));
        const nT = maple ? 3 : 1;
        for (let j = 1; j <= nT; j++) { const f = j / (nT + 1); const aa = aPrev + (a - aPrev) * f; out.push(P(aa - 0.05, R * (sinus + (rr - sinus) * f) * 1.05)); out.push(P(aa + 0.03, R * (sinus + (rr - sinus) * f) * 0.97)); }
        out.push(P(a, R * rr));
        for (let j = nT; j >= 1; j--) { const f = j / (nT + 1); const aa = aNext + (a - aNext) * f; out.push(P(aa + 0.05, R * (sinus + (rr - sinus) * f) * 1.05)); out.push(P(aa - 0.03, R * (sinus + (rr - sinus) * f) * 0.97)); }
      }
      out.push(P(2.6, R * (maple ? 0.32 : 0.42))); out.push([0, L * 0.02]);
      return out;
    }
  }
  return side((t) => W / 2 * Math.sin(Math.PI * t));
}

// draw one leaf: gradient across the blade (curvature / fold), midrib + optional secondary veins
function drawLeaf(g, rnd, x, y, ang, L, W, shape, o = {}) {
  // ~o.under of the leaves show their paler underside: they get G in the top band (ramp stop C) and a lighter shade
  const under = rnd() < (o.under ?? 0);
  const sh = under ? Math.min(255, (o.hi ?? 245) * (0.85 + 0.15 * rnd())) : (o.lo ?? 105) + ((o.hi ?? 245) - (o.lo ?? 105)) * rnd();
  const rv = under ? 240 + rnd() * 15 : o.rv ?? rnd() * 215;
  g.save(); g.translate(x, y); g.rotate(ang);
  if (o.fore) g.scale(o.fore, 1); // foreshortened (leaf tilted away from the viewer)
  const pts = outline(shape, L, W, rnd);
  const span = shape === 'plane' || shape === 'maple' || shape === 'fan' ? L * 0.7 : W * 0.6;
  let gr;
  if (o.cupped) { // convex, cupped blade: bright crown along the midrib, darker rolled edges, a soft highlight
    gr = g.createRadialGradient(W * 0.08, L * 0.5, 0, 0, L * 0.5, Math.max(W, L) * 0.62);
    gr.addColorStop(0, rgb(Math.min(255, sh * 1.12), rv, 0)); gr.addColorStop(0.35, rgb(sh, rv, 0)); gr.addColorStop(1, rgb(sh * 0.62, rv, 0));
  } else {
    gr = g.createLinearGradient(-span, 0, span, 0);
    const lit = rnd() < 0.5;
    gr.addColorStop(0, rgb(sh * (lit ? 0.72 : 0.9), rv, 0)); gr.addColorStop(0.47, rgb(sh, rv, 0)); gr.addColorStop(0.53, rgb(sh * 0.93, rv, 0)); gr.addColorStop(1, rgb(sh * (lit ? 0.9 : 0.7), rv, 0));
  }
  g.fillStyle = gr; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill();
  g.clip(); // veins stay inside the blade
  const vein = (pp, w) => strokeLine(g, pp, w, sh * (shape === 'fan' ? 0.9 : 0.76), rv, 0);
  const vw = Math.max(0.0012, (shape === 'plane' || shape === 'maple' ? L : W) * 0.035);
  if (shape === 'plane' || shape === 'maple') { // palmate veins from the petiole junction
    const c = [0, L * 0.38]; for (const a of [-1.75, -0.9, 0, 0.9, 1.75]) vein([[0, L * 0.05], [c[0] + Math.sin(a) * L * 0.55, c[1] + Math.cos(a) * L * 0.55]], vw);
  } else if (shape === 'fan') { for (let i = -5; i <= 5; i++) vein([[0, L * 0.05], [Math.sin(i * 0.11) * L * 0.75, L * 0.1 + Math.cos(i * 0.11) * L * 0.66]], vw * 0.25); }
  else {
    const cx = shape === 'sickle' ? (t) => W * 1.6 * t * t : () => 0;
    vein([[0, 0], [cx(0.5), L * 0.5], [cx(0.92), L * 0.92]], vw);
    if (o.veins) for (let i = 1; i < 6; i++) { const t = i / 6.5; for (const s of [-1, 1]) vein([[cx(t), t * L], [cx(t) + s * W * 0.36, (t + 0.09) * L]], vw * 0.5); }
  }
  g.restore();
}

// A shoot: main twig from the bottom centre (v = 0) up the cell, alternate side twigs (optionally with their own
// sub-twigs); cb(x, y, angle, t, isMain, dx, dy) at each node, where foliage is attached.
function shoot(g, rnd, o, cb) {
  const n = o.nodes ?? 12, len = o.len ?? 0.9; let x = 0.5 + (o.x0 ?? 0), y = 0.0, a = (o.a0 ?? 0) + (rnd() - 0.5) * 0.25;
  const pts = [[x, y]];
  for (let i = 1; i <= n; i++) {
    a += (rnd() - 0.5) * 0.18 + (o.curl ?? 0); const nx = x + Math.sin(a) * len / n, ny = y + Math.cos(a) * len / n;
    if (nx < 0.05 || nx > 0.95 || ny > 0.95) break;
    x = nx; y = ny; pts.push([x, y]);
  }
  if (pts.length < 3) pts.push([x, y + 0.01], [x, y + 0.02]);
  const twigs = [];
  const branch = (p, count, sideLen, start, depth) => {
    const m = p.length - 1;
    for (let i = 0; i < count; i++) {
      const t = start + (0.95 - start) * (i + rnd() * 0.4) / count, k = Math.min(m - 1, Math.floor(t * m));
      const [bx, by] = p[k], dir = i % 2 ? 1 : -1;
      let sa = Math.atan2(p[k + 1][0] - bx, p[k + 1][1] - by) + dir * (o.sideAngle ?? 0.75) * (0.8 + rnd() * 0.4);
      const sl = sideLen * (1 - t * 0.5) * (0.75 + rnd() * 0.5), mm = 6, sp = [[bx, by]]; let cx = bx, cy = by;
      for (let j = 1; j <= mm; j++) {
        sa += (rnd() - 0.5) * 0.15 + (o.sideCurl ?? 0) * dir; const nx = cx + Math.sin(sa) * sl / mm, ny = cy + Math.cos(sa) * sl / mm;
        if (nx < 0.05 || nx > 0.95 || ny > 0.95 || ny < 0.01) break; // keep the shoot inside the frame
        cx = nx; cy = ny; sp.push([cx, cy]);
      }
      if (sp.length < 2) continue;
      twigs.push([sp, depth]);
      if (depth < 2 && o.sub) branch(sp, o.sub, sl * 0.45, 0.25, depth + 1);
    }
  };
  branch(pts, o.sides ?? 6, o.sideLen ?? 0.35, o.sideStart ?? 0.12, 1);
  if (o.twigW) { taperTwig(g, pts, o.twigW, 105, 0.85); for (const [sp, dep] of twigs) taperTwig(g, sp, o.twigW * (dep === 1 ? 0.6 : 0.4), 110, 0.72); }
  [[pts, 0], ...twigs].forEach(([p, dep]) => { for (let i = 1; i < p.length; i++) { const dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1]; cb(p[i][0], p[i][1], Math.atan2(dx, dy), i / (p.length - 1), dep === 0, dx, dy); } });
}
// a fan of shoots radiating from the base point (bottom centre of the cell)
function fan(g, rnd, n, spreadA, o, cb) {
  for (let b = 0; b < n; b++) {
    let f = n > 1 ? b / (n - 1) - 0.5 : 0; const irr = o.irregular ? (rnd() - 0.5) * 0.5 : 0; f += irr / Math.max(1, n - 1);
    shoot(g, rnd, { ...o, a0: f * 2 * spreadA, x0: f * 0.06, len: (o.len ?? 0.9) * (1 - Math.abs(f) * 0.35) * (o.irregular ? 0.7 + 0.35 * rnd() : 1) }, cb);
  }
}

// leaves at regular spacing (metres) along every twig: alternate (default) or opposite pairs; bare twig bases
function broadleaf(g, rnd, M, o, over) {
  if (over) o = { ...o, ...over }; // r4-trees2: sprig atlas overrides
  const m = (v) => v / M;
  const step = m(o.spacing ?? 0.02); let alt = 1;
  fan(g, rnd, o.shoots ?? 3, o.fan ?? 0.6, { irregular: o.irregular, twigW: m(o.twig ?? 0.005), sides: o.sides ?? 6, sideLen: o.sideLen ?? 0.36, sideStart: o.sideStart ?? 0.25, len: o.len ?? 0.9, nodes: o.nodes ?? 12, sub: o.sub ?? 0, sideAngle: o.sideAngle ?? 0.75 }, (x, y, a, t, main, dx, dy) => {
    if (main && t < (o.bare ?? 0.18)) return;
    const segL = Math.hypot(dx, dy), n = Math.max(1, Math.round(segL / step));
    for (let i = 0; i < n; i++) {
      if (rnd() < (o.skip ?? 0)) continue;
      const px0 = x - dx * i / n, py0 = y - dy * i / n;
      const sides = o.opposite ? [-1, 1] : [(alt = -alt)];
      for (const s of sides) {
        const L = m(o.L[0] + (o.L[1] - o.L[0]) * rnd()) * (main ? 1 : 0.92) * (1 - 0.2 * t * (o.taper ?? 1));
        const la = a + s * ((o.ang ?? 0.8) + (rnd() - 0.5) * (o.angJit ?? 0.4));
        const pet = m(o.petiole ?? 0) * (0.7 + rnd() * 0.6);
        let px = px0, py = py0;
        if (pet > 0) { px = px0 + Math.sin(la) * pet; py = py0 + Math.cos(la) * pet; twig(g, [[px0, py0], [px, py]], Math.max(0.0012, L * 0.035), 125); }
        drawLeaf(g, rnd, px, py, la, L, L * (o.aspect ?? 0.45), o.shape, { veins: o.veins, lo: o.lo, hi: o.hi, under: o.under, cupped: o.cupped, fore: o.fore ? 1 - o.fore * rnd() : 0 });
      }
    }
  });
}

const DRAW = {
  oak: (g, rnd, cell, M, over) => broadleaf(g, rnd, M, { shape: 'oak', L: [0.03, 0.065], aspect: 0.7, spacing: 0.0075, shoots: 7, fan: 0.8, irregular: true, sides: 11, sub: 3, sideLen: 0.4, ang: 0.95, angJit: 1.3, fore: 0.45, cupped: true, twig: 0.005, lo: 80, hi: 225, under: 0.18 }, over),
  shrub: (g, rnd, cell, M, over) => broadleaf(g, rnd, M, { shape: 'shrub', L: [0.02, 0.04], aspect: 0.55, spacing: 0.007, shoots: 4, fan: 0.75, sides: 10, sub: 2, sideLen: 0.42, ang: 1.0, twig: 0.004, lo: 85, hi: 235, nodes: 14, under: 0.1 }, over),
  bay: (g, rnd, cell, M, over) => broadleaf(g, rnd, M, { shape: 'lance', L: [0.05, 0.095], aspect: 0.28, spacing: 0.012, shoots: 4, fan: 0.7, sides: 10, sub: 3, sideLen: 0.4, ang: 0.6, twig: 0.005, veins: true, lo: 100, hi: 240, under: 0.15 }, over),
  magnolia: (g, rnd, cell, M, over) => broadleaf(g, rnd, M, { shape: 'ellip', L: [0.12, 0.2], aspect: 0.42, spacing: 0.035, shoots: 3, fan: 0.6, sides: 6, sub: 1, sideLen: 0.34, ang: 0.75, twig: 0.01, petiole: 0.02, veins: true, lo: 95, hi: 255, nodes: 9, under: 0.2 }, over),
  plane: (g, rnd, cell, M, over) => broadleaf(g, rnd, M, { shape: 'plane', L: [0.16, 0.25], aspect: 1, spacing: 0.08, shoots: 3, fan: 0.65, sides: 6, sub: 1, sideLen: 0.36, ang: 0.7, twig: 0.006, petiole: 0.03, veins: true, lo: 105, hi: 245, nodes: 8, under: 0.12 }, over),
  maple: (g, rnd, cell, M, over) => broadleaf(g, rnd, M, { shape: 'maple', L: [0.1, 0.15], aspect: 1, spacing: 0.07, opposite: true, shoots: 3, fan: 0.6, sides: 6, sub: 1, sideLen: 0.36, ang: 0.85, twig: 0.005, petiole: 0.09, veins: true, lo: 105, hi: 245, nodes: 9, under: 0.12 }, over),
  ginkgo: (g, rnd, cell, M) => { // clusters of 3-5 fans on stubby spur shoots spaced along bare long shoots
    const m = (v) => v / M, step = m(0.05);
    fan(g, rnd, 3, 0.6, { twigW: m(0.008), sides: 5, sub: 1, sideLen: 0.4, sideStart: 0.25, sideAngle: 0.6, nodes: 10 }, (x, y, a, t, main, dx, dy) => {
      if (main && t < 0.2) return;
      const n = Math.max(1, Math.round(Math.hypot(dx, dy) / step));
      for (let i = 0; i < n; i++) {
        if (rnd() < 0.25) continue;
        const sx0 = x - dx * i / n, sy0 = y - dy * i / n, s = rnd() < 0.5 ? -1 : 1, sa = a + s * (0.6 + rnd() * 0.5);
        const sx = sx0 + Math.sin(sa) * m(0.012), sy = sy0 + Math.cos(sa) * m(0.012);
        twig(g, [[sx0, sy0], [sx, sy]], m(0.007), 95); // spur
        const k = 3 + Math.floor(rnd() * 2), rv = rnd() * 215, a0 = sa - 0.5 + rnd() * 0.3;
        for (let j = 0; j < k; j++) {
          const la = a0 + j * (0.95 / k) + (rnd() - 0.5) * 0.35, pet = m(0.035 + rnd() * 0.03), L = m(0.05 + rnd() * 0.03);
          const px = sx + Math.sin(la) * pet, py = sy + Math.cos(la) * pet; twig(g, [[sx, sy], [px, py]], m(0.0022), 125);
          drawLeaf(g, rnd, px, py, la, L, L, 'fan', { rv: Math.min(255, rv + rnd() * 30), lo: 125, hi: 250 });
        }
      }
    });
  },
  euc: (g, rnd, cell, M, over) => broadleaf(g, rnd, M, { shape: 'sickle', L: [0.12, 0.24], aspect: 0.15, spacing: 0.03, shoots: 4, fan: 0.65, sides: 9, sub: 2, sideLen: 0.36, ang: 0.3, twig: 0.005, petiole: 0.015, lo: 115, hi: 240, nodes: 9 }, over),
  needle: (g, rnd, cell, M) => { // Monterey pine: fascicles of 3 needles (10-15 cm) crowded toward the shoot tips
    const m = (v) => v / M;
    fan(g, rnd, 4, 0.6, { twigW: m(0.016), sides: 5, sub: 1, sideLen: 0.4, sideAngle: 0.7, nodes: 14 }, (x, y, a, t) => {
      const n = 6 + Math.floor(t * 6);
      for (let i = 0; i < n; i++) {
        const fa = a + (rnd() - 0.5) * 2.3, rv = rnd() * 255;
        for (let k = 0; k < 3; k++) { const na = fa + (k - 1) * 0.06, L = m(0.1 + rnd() * 0.05); strokeLine(g, [[x, y], [x + Math.sin(na) * L * 0.5 + Math.sin(fa) * 0.002, y + Math.cos(na) * L * 0.5], [x + Math.sin(na + 0.05) * L, y + Math.cos(na + 0.05) * L]], m(0.0016), 95 + rnd() * 150, rv, 0); }
      }
    });
  },
  spray: (g, rnd, cell, M) => { // coast redwood: flat sprays, needles 1-2.5 cm in two ranks along every twig
    const m = (v) => v / M;
    fan(g, rnd, 4, 0.65, { twigW: m(0.007), sides: 14, sub: 4, sideLen: 0.36, sideAngle: 0.95, nodes: 14 }, (x, y, a, t, main, dx, dy) => {
      const rv = rnd() * 255, seg = Math.hypot(dx, dy), steps = Math.max(2, Math.round(seg / m(0.006)));
      for (let i = 0; i < steps; i++) {
        const px = x - dx * i / steps, py = y - dy * i / steps;
        for (const s of [-1, 1]) { const na = a + s * (1.15 + (rnd() - 0.5) * 0.3), L = m(0.011 + rnd() * 0.013) * (1 - 0.35 * t); strokeLine(g, [[px, py], [px + Math.sin(na) * L, py + Math.cos(na) * L]], m(0.003), 105 + rnd() * 140, rv, 0); }
      }
    });
  },
  tuft: (g, rnd, cell, M) => { // deodar: rosettes of 15-30 needles (2.5-5 cm) on short spurs along drooping shoots
    const m = (v) => v / M;
    fan(g, rnd, 4, 0.65, { twigW: m(0.006), sides: 9, sub: 2, sideLen: 0.4, sideAngle: 0.7, sideCurl: 0.03, nodes: 12 }, (x, y, a) => {
      const n = 30, rv = rnd() * 255;
      for (let i = 0; i < n; i++) { const na = a + (rnd() - 0.5) * 3.8, L = m(0.025 + rnd() * 0.025); strokeLine(g, [[x, y], [x + Math.sin(na) * L, y + Math.cos(na) * L]], m(0.0022), 105 + rnd() * 140, rv, 0); }
    });
  },
  scale: (g, rnd, cell, M) => { // Italian cypress: dense cord-like scale sprays, branching in a plane
    const m = (v) => v / M;
    const grow = (x, y, a, L, w, depth) => {
      const x2 = x + Math.sin(a) * L, y2 = y + Math.cos(a) * L;
      strokeLine(g, [[x, y], [x2, y2]], w, 100 + rnd() * 145, rnd() * 255, 0);
      if (depth > 0) { for (const s of [-1, 1]) if (rnd() < 0.92) grow(x2, y2, a + s * (0.45 + rnd() * 0.3), L * 0.72, w * 0.85, depth - 1); if (rnd() < 0.65) grow(x2, y2, a + (rnd() - 0.5) * 0.3, L * 0.8, w * 0.9, depth - 1); }
    };
    twig(g, [[0.5, 0], [0.5, 0.1]], m(0.01));
    for (let b = 0; b < 16; b++) grow(0.5 + (rnd() - 0.5) * 0.4, 0.02 + rnd() * 0.1, (rnd() - 0.5) * 1.4, 0.2, m(0.005), 5);
  },
  palm: (g, rnd, cell) => { // fan palm frond: petiole from v=0, costapalmate fan of ~64 pleated segments
    const dead = cell === 1;
    const cx = 0.5, cy = 0.2, R = 0.46;
    twig(g, [[0.5, 0.0], [cx, cy]], 0.03, dead ? 120 : 140);
    const n = 64;
    for (let i = 0; i < n; i++) {
      const a = -2.25 + 4.5 * (i + 0.5) / n + (rnd() - 0.5) * 0.03;
      const L = R * (0.8 + 0.2 * Math.cos(a * 0.5)) * (0.94 + rnd() * 0.08);
      const sh = (i % 2 ? 165 : 235) * (0.85 + rnd() * 0.15), rv = dead ? 250 : rnd() * 200;
      g.save(); g.translate(cx, cy); g.rotate(-a);
      const gr = g.createLinearGradient(-0.02, 0, 0.02, 0); gr.addColorStop(0, rgb(sh * 0.8, rv, 0)); gr.addColorStop(0.5, rgb(sh, rv, 0)); gr.addColorStop(1, rgb(sh * 0.75, rv, 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(-0.007, 0.03); g.lineTo(0.007, 0.03);
      g.lineTo(0.02, L * 0.62); g.lineTo(0.006, L * (0.97 + rnd() * 0.05)); g.lineTo(0, L * 0.85); g.lineTo(-0.006, L * (0.95 + rnd() * 0.05)); g.lineTo(-0.02, L * 0.62); g.closePath(); g.fill();
      if (!dead && rnd() < 0.35) strokeLine(g, [[0.004, L * 0.9], [0.01 + rnd() * 0.02, L * 1.05]], 0.0025, sh * 0.8, rv, 0); // loose threads
      g.restore();
    }
    g.fillStyle = rgb(dead ? 110 : 150, dead ? 250 : 60, 0); g.beginPath(); g.arc(cx, cy, 0.045, 0, TAU); g.fill();
  },
};

function coverageAt(a, n, thr, scale) { let c = 0; const t = thr / scale; for (let i = 3; i < a.length; i += 4) if (a[i] >= t) c++; return c / n; }
function buildCoverageMips(level0, W, H, thr) {
  const T = thr * 255, mips = [{ data: level0, width: W, height: H }];
  const target = coverageAt(level0, W * H, T, 1);
  let src = level0, w = W, h = H;
  while (w > 1 || h > 1) {
    const nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1), dst = new Uint8Array(nw * nh * 4);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      const x0 = Math.min(w - 1, x * 2), x1 = Math.min(w - 1, x * 2 + 1), y0 = Math.min(h - 1, y * 2), y1 = Math.min(h - 1, y * 2 + 1);
      const i00 = (y0 * w + x0) * 4, i01 = (y0 * w + x1) * 4, i10 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4, o = (y * nw + x) * 4;
      // colour channels weighted by alpha (no dark halos), alpha averaged
      const a00 = src[i00 + 3], a01 = src[i01 + 3], a10 = src[i10 + 3], a11 = src[i11 + 3], as = a00 + a01 + a10 + a11;
      for (let c = 0; c < 3; c++) dst[o + c] = as > 0 ? (src[i00 + c] * a00 + src[i01 + c] * a01 + src[i10 + c] * a10 + src[i11 + c] * a11) / as : (src[i00 + c] + src[i01 + c] + src[i10 + c] + src[i11 + c]) / 4;
      dst[o + 3] = as / 4;
    }
    // find the alpha scale that restores the level-0 coverage (binary search), then bake it in
    let lo = 0.5, hi = 4;
    for (let it = 0; it < 14; it++) { const mid = (lo + hi) / 2; if (coverageAt(dst, nw * nh, T, mid) < target) lo = mid; else hi = mid; }
    const k = (lo + hi) / 2;
    const out = new Uint8Array(dst.length);
    for (let i = 0; i < dst.length; i += 4) { out[i] = dst[i]; out[i + 1] = dst[i + 1]; out[i + 2] = dst[i + 2]; out[i + 3] = Math.min(255, dst[i + 3] * k); }
    mips.push({ data: out, width: nw, height: nh });
    src = dst; w = nw; h = nh; // next level filters the unscaled alpha
  }
  return mips;
}

const _leaf = {};
// r4-trees2: sprig = true draws the hero LOD's sprig atlas: the same channel encoding, but a small twig of real-size
// leaves for a cell of SPRIGS[kind].M metres (3D leaf clusters are built from many of these, see tree-hero.js)
export function leafTexture(kind, S = 2048, sprig = false) {
  const key = kind + ':' + S + (sprig ? ':sprig' : '');
  if (live(_leaf[key])) return _leaf[key];
  const SP = sprig ? SPRIGS[kind] ?? { M: (LEAF_KINDS[kind]?.cellM ?? 1) * 0.5 } : null;
  const W = S, H = S / 2, cs = S / 2, M = SP ? SP.M : LEAF_KINDS[kind]?.cellM ?? 1;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.clearRect(0, 0, W, H);
  const rnd = mulberry32(hashStr(kind));
  const pad = 0.01;
  for (let cell = 0; cell < 2; cell++) {
    g.save(); g.beginPath(); g.rect(cell * cs + 1, 1, cs - 2, cs - 2); g.clip();
    g.translate(cell * cs, 0); g.scale(cs, cs);
    // content is drawn at real size inside a uniformly inset frame so nothing is clipped at the cell edges
    const k = kind === 'palm' ? 1 - 2 * pad : SP ? 0.8 : 0.88; // r4-trees2: sprigs keep a wider margin (no clipped leaves)
    g.translate(0.5, 0); g.scale(k, k); g.translate(-0.5, 0);
    DRAW[kind](g, rnd, cell, M * k, SP?.o);
    g.restore();
  }
  const img = g.getImageData(0, 0, W, H); const d = img.data;
  let sr = 0, sg = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 220 && d[i + 2] < 128) { sr += d[i]; sg += d[i + 1]; n++; }
  const mr = n ? sr / n : 170, mg = n ? sg / n : 128;
  let cov = 0;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]; if (a > 115) cov++;
    if (a < 255) { const t = a / 255; d[i] = d[i] * t + mr * (1 - t); d[i + 1] = d[i + 1] * t + mg * (1 - t); d[i + 2] = d[i + 2] * t; }
  }
  const level0 = new Uint8Array(d.buffer.slice(0));
  const t = new THREE.DataTexture(level0, W, H, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  // Coverage-preserving mip chain: each level is box-filtered, then its alpha is rescaled so the fraction of texels
  // passing the alpha test matches level 0. Distant cards keep their leafy see-through structure instead of either
  // dissolving (plain mips) or closing into solid cut-out blobs (blanket alpha boost).
  t.mipmaps = buildCoverageMips(level0, W, H, 0.42);
  t.generateMipmaps = false;
  t.anisotropy = 8; t.needsUpdate = true;
  t.userData.coverage = cov / (d.length / 4); t.userData.meanShade = mr / 255; t.userData.cellM = M;
  return (_leaf[key] = freeAfterUpload(t));
}

// ---------- r4-trees: leaf-cluster "puff" atlas ----------
// Volumetric crowns are built from camera-facing leaf puffs (tree-shaders.js patchPuff). Each puff cell is a round
// ball of the species' own shoots (copies of the leaf atlas cells, at real size for a ball `ballM` metres across,
// pointing outward from the centre; back layers darker = self-shadowed core), so a puff carries exactly the same
// channel encoding as the leaf cards (R shade, G per-leaf random, B twig mask, A coverage) and colours identically.
// 2:1 atlas, two variants (u 0-0.5, 0.5-1); the ball fills a disc of radius ~0.49 cell around the cell centre.
const _puff = {};
export function puffTexture(kind, S = 1024, ballM = 3, srcS = S) {
  const key = kind + ':' + S + ':' + ballM;
  if (live(_puff[key])) return _puff[key];
  // source = the (cached) leaf atlas the cards already use, so no second atlas is drawn
  const src = leafTexture(kind, srcS); const W = S, H = S / 2, cs = S / 2, M = LEAF_KINDS[kind]?.cellM ?? 1, ss = srcS / 2;
  const sc = document.createElement('canvas'); sc.width = srcS; sc.height = srcS / 2;
  sc.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(src.image.data.buffer.slice(0)), srcS, srcS / 2), 0, 0);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  const rnd = mulberry32(hashStr('puff:' + kind));
  const w = cs * Math.min(0.62, M / ballM); // drawn shoot cell size (px): real-size leaves for a ball ballM wide
  const reach = w * 0.88;                     // shoot length (px)
  const n = Math.round(Math.min(70, Math.max(12, 3.0 * Math.pow(cs * 0.49 / (reach * 0.7), 2))));
  for (let cell = 0; cell < 2; cell++) {
    g.save(); g.beginPath(); g.rect(cell * cs + 1, 1, cs - 2, cs - 2); g.clip();
    const cx = cell * cs + cs / 2, cy = cs / 2, R = cs * 0.49;
    const ph = [rnd() * TAU, rnd() * TAU], lobe = (a) => 0.8 + 0.12 * Math.sin(3 * a + ph[0]) + 0.08 * Math.sin(5 * a + ph[1]); // lumpy, not circular
    for (const [frac, dark] of [[0.45, 0.6], [0.35, 0.8], [0.45, 1]]) { // back, middle, front layers
      const cnt = Math.round(n * frac);
      for (let k = 0; k < cnt; k++) {
        // the leafy middle of each shoot lands uniformly inside the ball; shoots point outward (inner ones any way),
        // so the centre is solid and the rim thins out into individual leaves instead of a hard circle
        const a = rnd() * TAU, u = Math.sqrt(rnd()), rr = u * R * 0.66 * lobe(a);
        const out = Math.atan2(Math.sin(a), Math.cos(a)), th = (u < 0.35 ? rnd() * TAU : out + (rnd() - 0.5) * 1.2) - Math.PI / 2;
        const bx = cx + Math.cos(a) * rr - Math.cos(th + Math.PI / 2) * reach * 0.5, by = cy + Math.sin(a) * rr - Math.sin(th + Math.PI / 2) * reach * 0.5;
        g.save(); g.translate(bx, by); g.rotate(th);
        const ww = w * (0.85 + 0.3 * rnd());
        g.drawImage(sc, (k + cell) % 2 * ss, 0, ss, ss, -ww / 2, -ww * 0.04, ww, ww);
        g.restore();
      }
      if (dark < 1) { // darken what is drawn so far (deeper layers = self-shadowed core); alpha untouched
        g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(0,0,0,${1 - (dark < 0.7 ? 0.75 : 0.85)})`; g.fillRect(cell * cs, 0, cs, cs); g.restore();
      }
    }
    g.restore();
  }
  const img = g.getImageData(0, 0, W, H); const d = img.data;
  // lobed round silhouette: fade alpha out past a wavy rim radius, so clipped shoot-cell edges never show as straight
  // lines and every puff reads as a ball (rim leaves thin out over the last ~15%)
  for (let cell = 0; cell < 2; cell++) {
    const p0 = rnd() * TAU, p1 = rnd() * TAU, p2 = rnd() * TAU, ccx = cell * cs + cs / 2, ccy = cs / 2, R = cs * 0.485;
    for (let y = 0; y < H; y++) for (let x = cell * cs; x < (cell + 1) * cs; x++) {
      const dx = x + 0.5 - ccx, dy = y + 0.5 - ccy, th = Math.atan2(dy, dx), r = Math.hypot(dx, dy) / R;
      const rl = 0.86 + 0.07 * Math.sin(3 * th + p0) + 0.05 * Math.sin(5 * th + p1) + 0.03 * Math.sin(9 * th + p2);
      const m = r <= rl * 0.84 ? 1 : r >= rl ? 0 : 1 - (r - rl * 0.84) / (rl * 0.16);
      const i = (y * W + x) * 4 + 3; d[i] = d[i] * m * m;
    }
  }
  let sr = 0, sgr = 0, nn = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 220 && d[i + 2] < 128) { sr += d[i]; sgr += d[i + 1]; nn++; }
  const mr = nn ? sr / nn : 170, mg = nn ? sgr / nn : 128;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 255) { const t = a / 255; d[i] = d[i] * t + mr * (1 - t); d[i + 1] = d[i + 1] * t + mg * (1 - t); d[i + 2] = d[i + 2] * t; }
  }
  const level0 = new Uint8Array(d.buffer.slice(0));
  const t = new THREE.DataTexture(level0, W, H, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.mipmaps = buildCoverageMips(level0, W, H, 0.42); t.generateMipmaps = false;
  t.anisotropy = 4; t.needsUpdate = true;
  t.userData.ballM = ballM;
  return (_puff[key] = freeAfterUpload(t));
}
