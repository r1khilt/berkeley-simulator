// b03 (north-side engineering) kit: modern / mid-century façade helpers on top of the classic Kit
// (Soda, Cory, Sutardja Dai, Evans, Etcheverry, Jacobs, Davis, McCone, North Gate ...).
// Authoring frame is the classic Kit's building frame: u along the street grid ("east"), v across ("south"), y up.
import * as THREE from 'three';
import { Kit, polysGeo, roofUV } from './classic-kit.js';
import { fbm, vnoise, hash2 } from '../../lib/noise.js';
export { Kit, polysGeo, roofUV };

// ---------------------------------------------------------------- procedural textures (baked once per page)
const SZ = 512; // one texture tile covers 2 m (box UVs are metres / 2)
function bake(fn, size = SZ, normalStrength = 2.0) {
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const ca = mk(), cn = mk(), cr = mk();
  const ia = ca.getContext('2d').createImageData(size, size), ir = cr.getContext('2d').createImageData(size, size), inn = cn.getContext('2d').createImageData(size, size);
  const hgt = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = fn(x / size, y / size, x, y); const i = y * size + x;
    ia.data[i * 4] = o[0]; ia.data[i * 4 + 1] = o[1]; ia.data[i * 4 + 2] = o[2]; ia.data[i * 4 + 3] = 255;
    hgt[i] = o[3] ?? 0.5; const r = Math.max(0, Math.min(255, (o[4] ?? 0.8) * 255));
    ir.data[i * 4] = ir.data[i * 4 + 1] = ir.data[i * 4 + 2] = r; ir.data[i * 4 + 3] = 255;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xm = hgt[y * size + ((x - 1 + size) % size)], xp = hgt[y * size + ((x + 1) % size)];
    const ym = hgt[((y - 1 + size) % size) * size + x], yp = hgt[((y + 1) % size) * size + x];
    const nx = (xm - xp) * normalStrength, ny = (ym - yp) * normalStrength, nz = 1; const l = Math.hypot(nx, ny, nz);
    const i = (y * size + x) * 4; inn.data[i] = (nx / l * 0.5 + 0.5) * 255; inn.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; inn.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; inn.data[i + 3] = 255;
  }
  ca.getContext('2d').putImageData(ia, 0, 0); cr.getContext('2d').putImageData(ir, 0, 0); cn.getContext('2d').putImageData(inn, 0, 0);
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true; return t; };
  return { map: tex(ca, true), normalMap: tex(cn, false), roughnessMap: tex(cr, false) };
}
const cl = (v) => Math.max(0, Math.min(255, v));
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const tint = (c, k) => [cl(c[0] * k), cl(c[1] * k), cl(c[2] * k)];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const recipes = {
  // Soda Hall: ~28 cm glazed ceramic tiles, stack bond, each tile its own mottled blue-grey / slate / grey-green glaze
  sodaTile: (u, v) => {
    // ~0.5 m glazed tiles; tone driven by clustered low-frequency mottling plus per-tile jitter (low contrast slate blue-green-grey)
    const N = 4; const bu = u * N, bv = v * N; const col = Math.floor(bu), row = Math.floor(bv); const fu = bu - col, fv = bv - row;
    const joint = fu < 0.02 || fv < 0.02;
    const pal = [[0x4c, 0x56, 0x58], [0x5c, 0x67, 0x69], [0x6b, 0x77, 0x78], [0x7a, 0x86, 0x85]];
    const cluster = vnoise((col + 0.5) * 0.5, (row + 0.5) * 0.5, N * 2 * 0.5, 7); // tileable: period in lattice units
    const t = Math.max(0, Math.min(0.999, cluster * 0.75 + hash2(col, row, 7) * 0.4 - 0.08));
    const base = pal[Math.floor(t * pal.length)];
    const n = fbm(u * 16, v * 16, 16, 3, 9); const glaze = 0.97 + 0.06 * (1 - fv);
    const c = joint ? [47, 54, 55] : tint(base, glaze * (0.97 + (n - 0.5) * 0.06));
    return [...c, joint ? 0.35 : 0.55, joint ? 0.9 : 0.42];
  },
  // green-grey quartzite slabs, 0.67 x 1.0 m stack bond with rust veining
  stoneGreen: (u, v) => {
    const bu = u * 3, bv = v * 2; const col = Math.floor(bu), row = Math.floor(bv); const fu = bu - col, fv = bv - row;
    const joint = fu < 0.006 || fv < 0.004;
    const n = fbm(u * 8, v * 8, 8, 5, 13); const vein = Math.abs(vnoise(u * 24 + n * 6, v * 6, 24, 17) - 0.5) < 0.025;
    let c = tint(hex(0x6c7a72), 0.88 + (hash2(col, row, 3) - 0.5) * 0.18 + (n - 0.5) * 0.3);
    if (vein) c = mixc(c, hex(0x9b6b4c), 0.55);
    return [...(joint ? [70, 76, 72] : c), joint ? 0.3 : 0.5 + n * 0.05, joint ? 0.9 : 0.5];
  },
  // Arts & Crafts redwood shingles: 0.2 m courses, random widths, deep brown
  shingle: (u, v) => {
    const C = 14; const bv = v * C; const row = Math.floor(bv); const fv = bv - row; // ~0.14 m courses
    const sw = u * 14 + hash2(row, 0, 5) * 7; const k = Math.floor(sw + Math.floor(hash2(Math.floor(sw), row, 9) * 2) * 0.5); const fu = sw - Math.floor(sw);
    const t = hash2(k, row, 21);
    const gap = fu < 0.03 && hash2(k, row, 22) > 0.35; const shadow = fv > 0.88;
    const grain = vnoise(u * 120, v * 8, 120, 23);
    const base = mixc([0x3b, 0x2a, 0x1e], [0x2e, 0x22, 0x19], t);
    const c = tint(base, (0.92 + (t - 0.5) * 0.25 + (grain - 0.5) * 0.15) * (shadow ? 0.72 : 1) * (gap ? 0.75 : 1));
    return [...c, shadow ? 0.35 : 0.55 + grain * 0.06, 0.92];
  },
  // large flush metal / fibre-cement panels 1.5 m x 1.33 m (Jacobs Hall)
  panelLg: (u, v) => {
    const bu = u * 1, bv = v * 2; const row = Math.floor(bv); const off = (row % 2) * 0.5; const cu = bu + off; const col = Math.floor(cu); const fu = cu - col, fv = bv - row;
    const joint = fu < 0.006 || fv < 0.006; const n = fbm(u * 8, v * 8, 8, 3, 81);
    return [...(joint ? [138, 144, 152] : tint([200, 205, 210], 0.96 + (hash2(col, row, 83) - 0.5) * 0.04 + (n - 0.5) * 0.03)), joint ? 0.3 : 0.55, joint ? 0.8 : 0.4];
  },
  // metal rainscreen panels (SDH / Jacobs): 1.0 m x 0.5 m with dark reveals
  panel: (u, v) => {
    const bu = u * 2, bv = v * 4; const col = Math.floor(bu), row = Math.floor(bv); const fu = bu - col, fv = bv - row;
    const joint = fu < 0.012 || fv < 0.025;
    const n = fbm(u * 8, v * 8, 8, 3, 31);
    const c = joint ? [70, 72, 74] : tint([214, 216, 216], 0.95 + (hash2(col, row, 33) - 0.5) * 0.05 + (n - 0.5) * 0.04);
    return [...c, joint ? 0.25 : 0.55, joint ? 0.9 : 0.45];
  },
  // precast / board-formed concrete with tie holes and lift lines (Evans, Etcheverry, Davis)
  precast: (u, v, x, y) => {
    const n = fbm(u * 8, v * 8, 8, 5, 41); const s = hash2(x, y, 43); const lift = (v * 4) % 1; const tie = (Math.hypot((u * 4) % 1 - 0.5, (v * 4) % 1 - 0.5) < 0.025);
    let k = 0.95 + (n - 0.5) * 0.18 - (lift < 0.012 ? 0.12 : 0) - (tie ? 0.25 : 0); if (s > 0.985) k *= 0.85;
    return [...tint([205, 202, 194], k), 0.5 + n * 0.08 - (tie ? 0.2 : 0) - (lift < 0.012 ? 0.1 : 0), 0.9];
  },
  // Sutardja Dai Hall: rosy-brown terracotta rainscreen with strong horizontal strata banding, 1.2 m staggered panels
  strata: (u, v) => {
    const bv = v * 3; const row = Math.floor(bv); const fv = bv - row; // 0.67 m panel courses
    const off = (row % 2) * 0.5; const cu = u * 1 + off; const col = Math.floor(cu); const fu = cu - col; // 2 m staggered panels
    const joint = fv < 0.012 || fu < 0.004;
    const band = Math.sin(v * Math.PI * 2 * 15 + vnoise(u * 4, v * 30, 4, 71) * 2.5) * 0.5 + 0.5; // horizontal strata
    const band2 = Math.sin(v * Math.PI * 2 * 4 + 1.3) * 0.5 + 0.5;
    const t = hash2(col, row, 73);
    const base = mixc(mixc([0xc2, 0xa1, 0x8c], [0xa3, 0x83, 0x70], band * 0.6 + band2 * 0.25), [0xd2, 0xb8, 0xa4], t * 0.3);
    const n = fbm(u * 8, v * 8, 8, 3, 75);
    return [...(joint ? [120, 96, 84] : tint(base, 0.96 + (n - 0.5) * 0.08)), joint ? 0.4 : 0.5 + band * 0.06, 0.7];
  },
  // painted horizontal siding (temporary buildings)
  siding: (u, v) => {
    const bv = v * 14; const fv = bv - Math.floor(bv); const n = fbm(u * 8, v * 8, 8, 3, 51);
    const k = 0.95 + (n - 0.5) * 0.06 - (fv < 0.12 ? 0.18 : 0);
    return [...tint([236, 232, 222], k), fv < 0.12 ? 0.3 : 0.55, 0.75];
  },
  // buff / tan face brick
  brickBuff: (u, v) => {
    const bu = u * 9, bv = v * 27; const row = Math.floor(bv); const off = (row % 2) * 0.5; const fu = ((bu + off) % 1 + 1) % 1, fv = bv - row; const col = Math.floor(bu + off);
    const mortar = fu < 0.045 || fv < 0.13; const t = hash2(col, row, 61); const n = fbm(u * 16, v * 16, 16, 3, 63);
    const base = t < 0.33 ? [196, 170, 132] : t < 0.66 ? [182, 156, 120] : [206, 182, 146];
    return [...(mortar ? [190, 184, 172] : tint(base, 0.92 + (n - 0.5) * 0.18)), mortar ? 0.25 : 0.55, 0.88];
  },
};
const texCache = {};
function tex(name) { if (!texCache[name]) texCache[name] = bake(recipes[name], SZ, name === 'shingle' ? 3.5 : name === 'sodaTile' ? 1.2 : 2.0); return texCache[name]; }
function std(opts, t) { const m = new THREE.MeshStandardMaterial(opts); if (t) { m.map = t.map; m.normalMap = t.normalMap; m.roughnessMap = t.roughnessMap; m.normalScale = new THREE.Vector2(0.6, 0.6); } return m; }
function glowGlass(M, color, rough = 0.05, metal = 0.3) {
  const m = M.windowNight.clone(); m.color = new THREE.Color(color); m.roughness = rough; m.metalness = metal; m.envMapIntensity = 1.6;
  m.onBeforeCompile = M.windowNight.onBeforeCompile; m.customProgramCacheKey = M.windowNight.customProgramCacheKey; m.userData = { ...M.windowNight.userData };
  return m;
}

let _B = null;
// Local material palette shared by all b03 modules (created once per page).
export function mats(ctx) {
  if (_B) return _B;
  const M = ctx.M; const T = (n) => tex(n);
  const texOf = (m) => (m && m.map ? { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap } : null);
  _B = {
    sodaTile: std({ color: 0xffffff, roughness: 0.45, metalness: 0.05 }, T('sodaTile')),
    sodaPale: std({ color: 0xd2d0c9, roughness: 0.8 }, texOf(M.concrete)),
    sodaGlass: glowGlass(M, 0x3f6670, 0.05, 0.4),
    darkTile: std({ color: 0x3a4244, roughness: 0.45 }),
    burgundy: std({ color: 0x4f2229, roughness: 0.4, metalness: 0.05 }),
    stoneGreen: std({ color: 0xffffff, roughness: 0.5 }, T('stoneGreen')),
    stoneDark: std({ color: 0x5a6364, roughness: 0.3, metalness: 0.05 }, texOf(M.concrete)),
    greyMetal: std({ color: 0x5a5f5e, roughness: 0.6, metalness: 0.3 }, T('panel')),
    greenSteel: std({ color: 0x3d5a4f, roughness: 0.5, metalness: 0.45 }),
    creamConc: std({ color: 0xd8d3c4, roughness: 0.85 }, texOf(M.concrete)),
    cream: std({ color: 0xe3dac0, roughness: 0.9 }, texOf(M.stucco)),
    shingle: std({ color: 0xffffff, roughness: 0.9 }, T('shingle')),
    panelLg: std({ color: 0xffffff, roughness: 0.4, metalness: 0.3 }, T('panelLg')),
    panel: std({ color: 0xffffff, roughness: 0.45, metalness: 0.35 }, T('panel')),
    panelDark: std({ color: 0x55585b, roughness: 0.5, metalness: 0.3 }, T('panel')),
    precast: std({ color: 0xffffff, roughness: 0.92 }, T('precast')),
    precastWarm: std({ color: 0xeee4d2, roughness: 0.92 }, T('precast')),
    precastGreen: std({ color: 0xcfd3c6, roughness: 0.92 }, T('precast')),
    siding: std({ color: 0xffffff, roughness: 0.8 }, T('siding')),
    brickBuff: std({ color: 0xffffff, roughness: 0.88 }, T('brickBuff')),
    alum: std({ color: 0xa3a8ac, roughness: 0.35, metalness: 0.8 }),
    alumDark: std({ color: 0x36393c, roughness: 0.4, metalness: 0.7 }),
    steelGrey: std({ color: 0x5e6d66, roughness: 0.55, metalness: 0.5 }),
    timber: std({ color: 0x9a8f80, roughness: 0.9 }, texOf(M.wood)),
    glassBlue: glowGlass(M, 0x2c4152, 0.05, 0.35),
    glassGreen: glowGlass(M, 0x2b3d3a, 0.06, 0.3),
    glassTeal: glowGlass(M, 0x2f3d3c, 0.06, 0.35),
    whiteDS: std({ color: 0xf2f0ea, roughness: 0.9, side: THREE.DoubleSide }),
    glassGrey: glowGlass(M, 0x252b30, 0.05, 0.35),
    tealPaint: std({ color: 0x3f6e6a, roughness: 0.6 }),
    strata: std({ color: 0xffffff, roughness: 0.75 }, T('strata')),
    louvre: std({ color: 0xa8a49c, roughness: 0.5, metalness: 0.4 }, T('panel')),
    offWhite: std({ color: 0xdcd6c4, roughness: 0.85 }, texOf(M.marble)),
    redPaint: std({ color: 0x9c2b23, roughness: 0.6 }),
    roofMembrane: std({ color: 0x9a978f, roughness: 0.95 }, texOf(M.concrete)),
    gravel: std({ color: 0x8c877d, roughness: 1.0 }, texOf(M.concrete)),
    planting: std({ color: 0x4f6b35, roughness: 1.0 }),
    stuccoTan: std({ color: 0xd9ccb0, roughness: 0.95 }, texOf(M.stucco)),
  };
  return _B;
}

// ---------------------------------------------------------------- polygon helpers (building frame)
export function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
// mitred inset (d > 0 shrinks the polygon)
export function inset(poly, d) {
  const n = poly.length; const sgn = polyArea(poly) > 0 ? 1 : -1;
  const N = poly.map((p, i) => { const q = poly[(i + 1) % n]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; const tx = (q[0] - p[0]) / L, tz = (q[1] - p[1]) / L; return sgn > 0 ? [-tz, tx] : [tz, -tx]; });
  return poly.map((p, i) => { const n1 = N[(i - 1 + n) % n], n2 = N[i]; const dd = 1 + n1[0] * n2[0] + n1[1] * n2[1]; return [p[0] + d * (n1[0] + n2[0]) / dd, p[1] + d * (n1[1] + n2[1]) / dd]; });
}
export const rect = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
// façade runs for a rectangle, keyed S/E/N/W (outward normals correct for the classic Kit)
export function rectRuns(K, u0, v0, u1, v1, off = 0) {
  return { S: K.run([u0, v1], [u1, v1], off), E: K.run([u1, v1], [u1, v0], off), N: K.run([u1, v0], [u0, v0], off), W: K.run([u0, v0], [u0, v1], off) };
}
// runs around an arbitrary polygon in building frame (any winding); returns runs with outward normals
export function polyRuns(K, poly, off = 0) {
  const P = polyArea(poly) < 0 ? poly : poly.slice().reverse();
  return P.map((p, i) => K.run(p, P[(i + 1) % P.length], off));
}

// ---------------------------------------------------------------- façade helpers
// ground along a run at station s, d metres out from the face (relative to y0 = 0)
export function gAt(K, R, s, d = 0.5) { const p = R.at(s, d); return K.g(p[0], p[1]); }
export function gMinRun(K, R, s0, s1, d = 0.8) { let m = Infinity; for (let i = 0; i <= 8; i++) m = Math.min(m, gAt(K, R, s0 + (s1 - s0) * i / 8, d)); return m; }
export function gMaxRun(K, R, s0, s1, d = 0.8) { let m = -Infinity; for (let i = 0; i <= 8; i++) m = Math.max(m, gAt(K, R, s0 + (s1 - s0) * i / 8, d)); return m; }
// evenly spaced bay centres
export function bays(s0, s1, nb) { const w = (s1 - s0) / nb; return Array.from({ length: nb }, (_, i) => s0 + w * (i + 0.5)); }
// wall slab with punched windows (real holes, glass + frames); windows buried by the terrain are dropped
// opts: depth (wall thickness), rev (glass recess), frame, glass, mull, tran (fraction of height), sill (material | false)
export function punched(K, R, mat, s0, s1, y0, y1, ops, opts = {}) {
  const depth = opts.depth ?? 0.4; const rev = opts.rev ?? Math.max(0.12, depth - 0.12);
  const keep = opts.terrain === false ? ops : ops.filter((o) => o.kind === 'door' || o.y0 > gAt(K, R, (o.s0 + o.s1) / 2, 0.6) + 0.25);
  K.wall(R, mat, s0, s1, y0, y1, keep, depth);
  for (const o of keep) {
    if (o.noFill) continue;
    const sillMat = opts.sill || null;
    const oo = { ...o, sill: sillMat ? undefined : false, sillMat: sillMat || undefined };
    K.fill(R, oo, { rev, glass: o.glass || opts.glass, frame: o.frame || opts.frame, kind: o.kind || 'win', mull: o.mull ?? opts.mull ?? 1, tran: o.tran ?? (opts.tran ? [o.y0 + (o.y1 - o.y0) * opts.tran] : []), door: opts.door });
  }
  return keep;
}
// repeat punched windows over several storeys: levels = [[y0,y1], ...]; win = {w, h, sill}; cs = bay centres
export function storeyGrid(K, R, mat, s0, s1, levels, cs, win, opts = {}) {
  for (const [a, b] of levels) {
    const y0 = a + (win.sill ?? 0.9); const y1 = Math.min(b - 0.2, y0 + win.h);
    punched(K, R, mat, s0, s1, a, b, cs.map((c) => ({ s0: c - win.w / 2, s1: c + win.w / 2, y0, y1 })), opts);
  }
}
// glazed curtain wall: glass recessed `depth`, vertical mullions every mw, transoms at `rows` (abs y), opaque spandrels [[ya,yb],...]
export function curtain(K, R, s0, s1, y0, y1, o = {}) {
  const M = K.M; const glass = o.glass || M.windowNight; const fr = o.frame || M.iron; const d = -(o.depth ?? 0.12);
  K.rbox(R, glass, s0, y0, d - 0.04, s1, y1, d);
  const n = Math.max(1, Math.round((s1 - s0) / (o.mw ?? 1.5))); const mwr = (s1 - s0) / n; const mullD = o.mullD ?? 0.14, mullW = o.mullW ?? 0.06;
  for (let i = 0; i <= n; i++) { const s = s0 + mwr * i; K.rbox(R, fr, s - mullW, y0, d, s + mullW, y1, d + mullD, { detail: i > 0 && i < n }); }
  for (const y of (o.rows || [])) K.rbox(R, fr, s0, y - mullW * 0.8, d, s1, y + mullW * 0.8, d + mullD * 0.8, { detail: true });
  for (const [ya, yb] of (o.spandrels || [])) K.rbox(R, o.spandrelMat || fr, s0, ya, d, s1, yb, d + 0.03);
  K.rbox(R, fr, s0, y0 - 0.08, d, s1, y0, d + mullD); K.rbox(R, fr, s0, y1, d, s1, y1 + 0.08, d + mullD);
}
// vertical fins / piers along a run (n evenly from s0 to s1 inclusive)
export function fins(K, R, mat, s0, s1, y0, y1, n, w, p, opts) { for (let i = 0; i < n; i++) { const s = n === 1 ? (s0 + s1) / 2 : s0 + (s1 - s0) * i / (n - 1); K.rbox(R, mat, s - w / 2, y0, -0.05, s + w / 2, y1, p, opts); } }
// horizontal band / sunshade along a run
export function band(K, R, mat, s0, s1, y0, y1, p = 0.05, d0 = -0.05, opts) { K.rbox(R, mat, s0, y0, d0, s1, y1, p, opts); }
// flat roof deck with optional parapet ring over polygon (building frame)
export function roofDeck(K, poly, y, o = {}) {
  const M = K.M; K.prism(o.deck || M.concreteDark, poly, y - (o.thick ?? 0.35), y);
  if (o.parapet) { const pt = o.pt ?? 0.3; K.prism(o.pmat || M.concrete, poly, y - 0.05, y + o.parapet, undefined, [inset(poly, pt)]); if (o.coping) K.loop(o.coping, poly, [[0.06, y + o.parapet], [0.06, y + o.parapet + 0.08], [-pt - 0.04, y + o.parapet + 0.08]]); }
}
// solid prism core (keeps the inside opaque behind window glass)
export function core(K, poly, y0, y1, mat, ins = 0.6) { K.prism(mat || K.M.concreteDark, inset(poly, ins), y0, y1); }
// rooftop mechanical box with louvre bands
export function mech(K, u0, v0, u1, v1, y0, h, mat, louvre) {
  K.box(mat || K.M.concrete, u0, y0, v0, u1, y0 + h, v1);
  if (louvre) for (let y = y0 + 0.4; y < y0 + h - 0.3; y += 0.3) K.box(louvre, u0 - 0.04, y, v0 - 0.04, u1 + 0.04, y + 0.06, v1 + 0.04, { detail: true });
}
// steps climbing along '+u' | '-u' | '+v' | '-v'; returns a walkable
export function steps(K, mat, u0, v0, u1, v1, yLo, yHi, dir) { const n = Math.max(2, Math.round(Math.abs(yHi - yLo) / 0.16)); return K.stairs(mat, u0, v0, u1, v1, yLo, yHi, dir, n); }
// aluminium storefront (glazed doors / lobby glass) set flush in an opening
export function storefront(K, R, s0, s1, y0, y1, o = {}) {
  const M = K.M; const fr = o.frame || M.iron; const d = -(o.rev ?? 0.25);
  K.rbox(R, o.glass || M.windowNight, s0, y0, d - 0.04, s1, y1, d);
  const n = Math.max(1, Math.round((s1 - s0) / (o.mw ?? 1.2)));
  for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, fr, s - 0.05, y0, d, s + 0.05, y1, d + 0.1); }
  K.rbox(R, fr, s0, y0, d, s1, y0 + 0.1, d + 0.1); K.rbox(R, fr, s0, y1 - 0.08, d, s1, y1, d + 0.1);
  if (o.transom) K.rbox(R, fr, s0, o.transom - 0.05, d, s1, o.transom + 0.05, d + 0.1);
  for (let i = 0; i < n; i++) { const s = s0 + (s1 - s0) * (i + 0.5) / n; K.rbox(R, M.iron, s - 0.02, y0 + 0.95, d + 0.1, s + 0.02, y0 + 1.15, d + 0.16, { detail: true }); }
}
// foundation plinth under a polygon from below the lowest ground up to yTop
export function plinth(K, poly, yTop, mat) { let gmin = Infinity; for (const [u, v] of poly) gmin = Math.min(gmin, K.g(u, v)); K.prism(mat || K.M.concreteDark, poly, gmin - 1.2, yTop); }
// convert footprint ring (local x,z) to building frame
export function toUV(K, ring) { return ring.map(([x, z]) => K.uv(x, z).map((q) => +q.toFixed(3))); }
// metal lettering on a façade (canvas texture, alpha-tested plane); sMid/yMid in run coords, h = cap height band
export function signText(K, R, text, sMid, yMid, h, o = {}) {
  const fs = 128; const font = `${o.weight || '600'} ${fs}px ${o.font || 'Georgia, "Times New Roman", serif'}`;
  const c = document.createElement('canvas'); let g2 = c.getContext('2d'); g2.font = font;
  const tw = g2.measureText(text).width + (o.spacing || 0) * fs * text.length; c.width = Math.ceil(tw + 24); c.height = Math.ceil(fs * 1.25);
  g2 = c.getContext('2d'); g2.font = font; g2.fillStyle = o.color || '#c9c9c4'; g2.textBaseline = 'middle';
  if (o.spacing) { let x = 12; for (const ch of text) { g2.fillText(ch, x, c.height / 2); x += g2.measureText(ch).width + o.spacing * fs; } } else g2.fillText(text, 12, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, roughness: o.rough ?? 0.35, metalness: o.metal ?? 0.6, side: THREE.FrontSide });
  const w = h * c.width / c.height; const g = new THREE.PlaneGeometry(w, h); g.translate(sMid, yMid, o.d ?? 0.025);
  K.addRun(R, mat, g, { uvMode: 'keep', detail: true });
  return w;
}

// ---------------------------------------------------------------- generic modern mass from a polygon
// spec: { poly: [[u,v]...] (building frame), holes: [[...]], top, levels: [y...] (floor lines from the lowest storey up, last = top of
//   the highest storey), wall, style: 'punched'|'ribbon'|'curtain'|'grid'|'blank', win: {w, h, sill, bay, mull, tran, muntins},
//   depth, rev, glass, frame, pier: {w, p, mat}, parapet: h, pmat, coping, roof: mat, coreMat, skipEdges: [i...], edgeOpts: {i: {...}},
//   bandMat (spandrel/floor band material for ribbon/curtain), minEdge }
export function massBlock(K, sp) {
  const M = K.M; const runsOut = [];
  const rings = [{ pts: sp.poly, hole: false }, ...(sp.holes || []).map((h) => ({ pts: h, hole: true }))];
  const levels = sp.levels; const top = sp.top ?? levels[levels.length - 1];
  const yBot = sp.y0 ?? -2;
  for (const ring of rings) {
    let P = ring.pts; const cw = polyArea(P) < 0; // runs need the building on the run's left (negative area order)
    if (ring.hole ? cw : !cw) P = P.slice().reverse();
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.3) continue;
      const R = K.run(a, b); runsOut.push(R);
      const eo = (sp.edgeOpts && sp.edgeOpts[(ring.hole ? 'h' : '') + i]) || {};
      const style = eo.style || ((sp.skipEdges || []).includes(i) && !ring.hole ? 'blank' : sp.style);
      const wall = eo.wall || sp.wall; const depth = sp.depth ?? 0.4;
      const win0 = { ...(sp.win || {}), ...(eo.win || {}) };
      const bay = win0.bay ?? 3.6; const nb = Math.max(1, Math.round(L / bay)); const cs = bays(0, L, nb);
      const gLo = gMinRun(K, R, 0, L, 0.8);
      const y0 = Math.min(yBot, gLo - 1.0);
      // storey bands
      const lv = [y0, ...levels.slice(1)];
      if (L < (sp.minEdge ?? 2.2) || style === 'blank') { K.wall(R, wall, 0, L, y0, top, [], depth); }
      else for (let k = 0; k < lv.length - 1; k++) {
        const a0 = lv[k], a1 = lv[k + 1]; const fl = levels[k];
        if (a1 < gLo + 0.3) { K.wall(R, wall, 0, L, a0, a1, [], depth); continue; }
        if (style === 'curtain') {
          const win = win0; const spd = win.spandrel ?? 0.9;
          if (fl + spd > a0 + 0.02) K.wall(R, sp.bandMat || wall, 0, L, a0, fl + spd, [], depth);
          curtain(K, R, 0.05, L - 0.05, Math.max(a0, fl + spd), a1, { glass: sp.glass, frame: sp.frame, mw: win.mw ?? 1.5, depth: 0.12, rows: win.tran ? [Math.max(a0, fl) + win.tran] : [] });
          continue;
        }
        let ops = []; const win = sp.winAt ? { ...win0, ...(sp.winAt(k, fl) || {}) } : win0;
        if (style === 'ribbon') {
          const e = win.edge ?? 0.8; if (L - 2 * e > 1.2) ops = [{ s0: e, s1: L - e, y0: fl + (win.sill ?? 0.9), y1: Math.min(a1 - 0.3, fl + (win.sill ?? 0.9) + (win.h ?? 1.5)), mull: Math.max(0, Math.round((L - 2 * e) / (win.mw ?? 1.5)) - 1) }];
        } else if (style === 'grid') {
          const pw = win.pierW ?? 0.6; const sh = win.spandrel ?? 1.0;
          ops = cs.map((c) => ({ s0: c - (L / nb) / 2 + pw / 2, s1: c + (L / nb) / 2 - pw / 2, y0: fl + sh, y1: a1 - (win.head ?? 0.25), mull: win.mull ?? 1 }));
        } else {
          const w = Math.min(win.w ?? 1.6, L / nb - 0.6);
          ops = cs.map((c) => c + (win.off ?? 0)).map((c) => ({ s0: c - w / 2, s1: c + w / 2, y0: fl + (win.sill ?? 0.9), y1: Math.min(a1 - 0.25, fl + (win.sill ?? 0.9) + (win.h ?? 1.8)), mull: win.mull, muntins: win.muntins }));
        }
        ops = ops.filter((o) => o.y1 - o.y0 > 0.5 && o.y0 > a0 + 0.05);
        punched(K, R, wall, 0, L, a0, a1, ops, { depth, rev: sp.rev ?? depth - 0.1, glass: sp.glass, frame: sp.frame, mull: win.mull ?? 1, tran: win.tran, sill: sp.sillMat || null });
        if (sp.floorBand) K.rbox(R, sp.floorBand.mat, 0, a1 - sp.floorBand.h / 2, -0.05, L, a1 + sp.floorBand.h / 2, sp.floorBand.p ?? 0.06);
      }
      // piers / fins at bay boundaries
      if (sp.pier && style !== 'blank' && L >= (sp.minEdge ?? 2.2)) {
        const pr = sp.pier; const n = nb + 1;
        for (let j = 0; j < n; j++) { const s = (L / nb) * j; if ((j === 0 || j === nb) && !pr.ends) continue; K.rbox(R, pr.mat || wall, s - pr.w / 2, Math.max(y0, gLo - 0.5, pr.from ?? -99), -0.05, s + pr.w / 2, pr.top ?? top, pr.p); }
      }
      // parapet
      if (sp.parapet) { K.wall(R, sp.pmat || wall, 0, L, top, top + sp.parapet, [], Math.min(depth, 0.35)); if (sp.coping) K.rbox(R, sp.coping, -0.02, top + sp.parapet, -0.42, L + 0.02, top + sp.parapet + 0.08, 0.05); }
    }
  }
  // roof slab + core
  K.prism(sp.roof || M.concreteDark, sp.poly, top - 0.35, top, undefined, sp.holes || []);
  if (sp.core !== false) {
    try { K.prism(sp.coreMat || M.concreteDark, inset(sp.poly, (sp.depth ?? 0.4) + 0.3), yBot - 1, top - 0.3, undefined, (sp.holes || []).map((h) => inset(h, -((sp.depth ?? 0.4) + 0.3)))); } catch (e) { /* degenerate inset */ }
  }
  return runsOut;
}
// collider prism for a building-frame polygon
export function colPolyUV(K, poly, y0, y1) { return K.colPoly(poly, y0, y1); }
// LiDAR-driven helper: footprint ring (local x,z) -> building frame polygon
export function ringUV(K, ring) { return ring.map(([x, z]) => K.uv(x, z)); }
