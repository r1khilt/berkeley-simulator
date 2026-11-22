// Shared PBR materials + procedural textures for Berkeley Simulator.
// Every hand-modelled landmark and the procedural city use these so the whole campus reads as one world.
// Conventions: world units are metres, +y up, +x east, +z south (north is -z).
// Textures assume box-projected UVs in metres (see boxUV): one texture repeat == TEX_M metres.
import * as THREE from 'three';
import { fbm, vnoise, hash2, mulberry32 } from './lib/noise.js';
import { adoptPBR, PBR_ENABLED } from './world/pbr.js'; // gfx-materials: real CC0 PBR sets for the masonry materials

export const TEX_M = 2.0; // metres covered by one texture tile (box-projected UVs are divided by this)

// Global uniforms shared by animated / time-of-day aware materials
export const U = {
  uTime: { value: 0 },
  uNight: { value: 0 },          // 0 = full day, 1 = full night (drives window glow, lamps)
  uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.2).normalize() },
  uWind: { value: 0.4 },
  uSkyZen: { value: new THREE.Color(0.2, 0.32, 0.55) },   // sky colours for fake reflections (set by SkySystem)
  uSkyHor: { value: new THREE.Color(0.65, 0.7, 0.75) },
};

const SIZE = 512;
function canvas(size = SIZE) {
  const c = document.createElement('canvas'); c.width = c.height = size; return c;
}
function toTexture(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}
// Build albedo + normal + roughness textures from a per-pixel function f(x,y) -> [r,g,b,height,rough]
function bake(fn, size = SIZE, normalStrength = 2.0) {
  const ca = canvas(size), cn = canvas(size), cr = canvas(size);
  const ia = ca.getContext('2d').createImageData(size, size);
  const ir = cr.getContext('2d').createImageData(size, size);
  const hgt = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = fn(x / size, y / size, x, y);
    const i = (y * size + x);
    ia.data[i * 4] = o[0]; ia.data[i * 4 + 1] = o[1]; ia.data[i * 4 + 2] = o[2]; ia.data[i * 4 + 3] = 255;
    hgt[i] = o[3] ?? 0.5;
    const r = Math.max(0, Math.min(255, (o[4] ?? 0.8) * 255));
    ir.data[i * 4] = r; ir.data[i * 4 + 1] = r; ir.data[i * 4 + 2] = r; ir.data[i * 4 + 3] = 255;
  }
  ca.getContext('2d').putImageData(ia, 0, 0);
  cr.getContext('2d').putImageData(ir, 0, 0);
  const inrm = cn.getContext('2d').createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xm = hgt[y * size + ((x - 1 + size) % size)], xp = hgt[y * size + ((x + 1) % size)];
    const ym = hgt[((y - 1 + size) % size) * size + x], yp = hgt[((y + 1) % size) * size + x];
    let nx = (xm - xp) * normalStrength, ny = (ym - yp) * normalStrength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * size + x) * 4;
    inrm.data[i] = (nx * 0.5 + 0.5) * 255; inrm.data[i + 1] = (ny * 0.5 + 0.5) * 255; inrm.data[i + 2] = (nz * 0.5 + 0.5) * 255; inrm.data[i + 3] = 255;
  }
  cn.getContext('2d').putImageData(inrm, 0, 0);
  return { map: toTexture(ca), normalMap: toTexture(cn, { srgb: false }), roughnessMap: toTexture(cr, { srgb: false }) };
}
const clamp255 = (v) => Math.max(0, Math.min(255, v));
const mix = (a, b, t) => a + (b - a) * t;
function tint(base, v) { return [clamp255(base[0] * v), clamp255(base[1] * v), clamp255(base[2] * v)]; }

// ---------- texture recipes (each tile covers TEX_M metres) ----------
const P = 8; // noise period in lattice cells across the tile
const recipes = {
  granite: (u, v) => { // Sierra white granite: light warm grey with fine speckle
    const n = fbm(u * P, v * P, P, 4, 3);
    const s = hash2((u * 512) | 0, (v * 512) | 0, 9);
    let k = 0.93 + (n - 0.5) * 0.12;
    if (s > 0.96) k *= 0.85; else if (s > 0.9) k *= 0.93; else if (s < 0.03) k *= 1.04;
    const c = tint([200, 195, 186], k);
    return [...c, 0.5 + (s > 0.9 ? -0.03 : 0) + n * 0.05, 0.78];
  },
  ashlar: (u, v, x, y) => { // granite blocks 1.0 m x 0.5 m (4 courses per tile), staggered
    const bu = u * 2, bv = v * 4; const row = Math.floor(bv);
    const off = (row % 2) * 0.5; const fu = ((bu + off) % 1 + 1) % 1, fv = bv - row;
    const col = Math.floor(bu + off);
    const joint = Math.min(fu, 1 - fu) * 1.0 < 0.008 || Math.min(fv, 1 - fv) * 0.5 < 0.006;
    const blockTone = 0.94 + (hash2(col, row, 4) - 0.5) * 0.08;
    const n = fbm(u * P, v * P, P, 4, 5); const s = hash2(x, y, 11);
    let k = blockTone + (n - 0.5) * 0.08; if (s > 0.93) k *= 0.8;
    const c = joint ? [150, 146, 139] : tint([216, 211, 201], k);
    const edge = Math.min(Math.min(fu, 1 - fu) * 2, Math.min(fv, 1 - fv) * 1, 0.05) / 0.05;
    return [...c, joint ? 0.2 : 0.45 + 0.1 * Math.sqrt(edge) + n * 0.04, joint ? 0.95 : 0.75];
  },
  concrete: (u, v, x, y) => {
    const n = fbm(u * P, v * P, P, 5, 21); const s = hash2(x, y, 23);
    let k = 0.95 + (n - 0.5) * 0.16; if (s > 0.985) k *= 0.82;
    const c = tint([200, 197, 190], k);
    return [...c, 0.5 + n * 0.08 - (s > 0.985 ? 0.1 : 0), 0.88];
  },
  stucco: (u, v, x, y) => {
    const n = fbm(u * P * 2, v * P * 2, P * 2, 4, 31); const n2 = fbm(u * P, v * P, P, 3, 37);
    const c = tint([235, 222, 196], 0.94 + (n2 - 0.5) * 0.1 + (n - 0.5) * 0.06);
    return [...c, 0.5 + n * 0.12, 0.9];
  },
  brick: (u, v, x, y) => { // running bond: brick 0.222 x 0.074 m incl. mortar -> 9 x 27 per 2 m tile
    const bu = u * 9, bv = v * 27; const row = Math.floor(bv); const off = (row % 2) * 0.5;
    const fu = ((bu + off) % 1 + 1) % 1, fv = bv - row; const col = Math.floor(bu + off);
    const mortar = fu < 0.045 || fv < 0.13;
    const t = hash2(col, row, 41);
    const base = t < 0.33 ? [148, 66, 48] : t < 0.66 ? [132, 58, 42] : [160, 78, 56];
    const n = fbm(u * P * 2, v * P * 2, P * 2, 3, 43);
    const c = mortar ? [176, 168, 156] : tint(base, 0.9 + (n - 0.5) * 0.25);
    return [...c, mortar ? 0.25 : 0.55 + n * 0.08, mortar ? 0.95 : 0.85];
  },
  tile: (u, v, x, y) => { // terracotta barrel tiles: 8 across, 6 rows per 2 m (u along eave, v up-slope)
    const bu = u * 8, bv = v * 6; const row = Math.floor(bv); const fu = bu - Math.floor(bu), fv = bv - row;
    const col = Math.floor(bu);
    const barrel = Math.sin(fu * Math.PI);           // rounded profile
    const lap = Math.pow(fv, 3);                      // overlap shading toward the bottom of each course
    const t = hash2(col, row, 51);
    const base = [181 + (t - 0.5) * 30, 87 + (t - 0.5) * 22, 58 + (t - 0.5) * 16];
    const n = fbm(u * P * 2, v * P * 2, P * 2, 3, 53);
    const k = 0.72 + 0.32 * barrel - 0.18 * lap + (n - 0.5) * 0.12;
    return [...tint(base, k), 0.3 + 0.55 * barrel - 0.25 * lap, 0.7];
  },
  shingle: (u, v, x, y) => { // asphalt shingles for houses (neutral; tinted per material color)
    const bu = u * 6, bv = v * 14; const row = Math.floor(bv); const off = (row % 2) * 0.5;
    const fu = ((bu + off) % 1 + 1) % 1, fv = bv - row; const col = Math.floor(bu + off);
    const t = hash2(col, row, 61); const s = hash2(x, y, 63);
    const k = 0.85 + (t - 0.5) * 0.2 - (fv > 0.85 ? 0.25 : 0) - (fu < 0.03 ? 0.2 : 0) + (s - 0.5) * 0.15;
    const c = tint([200, 200, 200], k);
    return [...c, 0.5 - (fv > 0.85 ? 0.2 : 0) + s * 0.05, 0.92];
  },
  copper: (u, v, x, y) => { // verdigris patina with vertical streaks
    const n = fbm(u * P, v * P * 0.5, P, 5, 71); const st = vnoise(u * 64, v * 2, 64, 73);
    const k = 0.9 + (n - 0.5) * 0.25 + (st - 0.5) * 0.15;
    const c = [mix(86, 120, n) * k, mix(150, 175, n) * k, mix(128, 150, n) * k];
    return [...c, 0.5 + n * 0.1, 0.6];
  },
  wood: (u, v, x, y) => { // vertical planks 0.15 m
    const pu = u * 13; const pl = Math.floor(pu); const fu = pu - pl;
    const grain = vnoise(u * 13 * 4 + hash2(pl, 0, 81) * 10, v * 40, 52, 83);
    const t = hash2(pl, 1, 85);
    const c = tint([120, 84, 56], 0.85 + (t - 0.5) * 0.25 + (grain - 0.5) * 0.2 - (fu < 0.04 ? 0.3 : 0));
    return [...c, 0.5 + grain * 0.1 - (fu < 0.04 ? 0.25 : 0), 0.8];
  },
  paving: (u, v, x, y) => { // square concrete/granite pavers 0.5 m
    const bu = u * 4, bv = v * 4; const fu = bu - Math.floor(bu), fv = bv - Math.floor(bv);
    const joint = fu < 0.012 || fv < 0.012; const t = hash2(Math.floor(bu), Math.floor(bv), 91);
    const n = fbm(u * P, v * P, P, 4, 93);
    const c = joint ? [120, 118, 112] : tint([196, 190, 180], 0.92 + (t - 0.5) * 0.1 + (n - 0.5) * 0.1);
    return [...c, joint ? 0.3 : 0.5 + n * 0.05, 0.85];
  },
  slate: (u, v, x, y) => {
    const bu = u * 7, bv = v * 12; const row = Math.floor(bv); const off = (row % 2) * 0.5;
    const fu = ((bu + off) % 1 + 1) % 1, fv = bv - row; const t = hash2(Math.floor(bu + off), row, 101);
    const c = tint([78, 82, 90], 0.85 + (t - 0.5) * 0.3 - (fv > 0.88 ? 0.3 : 0) - (fu < 0.03 ? 0.25 : 0));
    return [...c, 0.5 - (fv > 0.88 ? 0.2 : 0), 0.7];
  },
  plain: (u, v, x, y) => { const n = fbm(u * P, v * P, P, 3, 111); const c = tint([235, 235, 235], 0.96 + (n - 0.5) * 0.06); return [...c, 0.5 + n * 0.03, 0.8]; },
};

let _tex = null;
export function textures() {
  if (_tex) return _tex;
  _tex = {};
  for (const [k, f] of Object.entries(recipes)) _tex[k] = bake(f, SIZE, k === 'tile' ? 4 : k === 'brick' || k === 'ashlar' ? 3 : 2);
  // gfx-materials: the procedural bakes above stay as the placeholder/fallback; pbr.js swaps in real CC0 photo sets
  // (normalised to the same mean colour so authored tints still hold). asphalt/soil get their own sets.
  if (PBR_ENABLED) {
    _tex.asphalt = bake(recipes.concrete, 64, 2); _tex.soil = bake(recipes.concrete, 64, 2);
    const up = { granite: ['granite', [202, 200, 195]], ashlar: ['granite', [205, 203, 198]], concrete: ['concrete', [190, 187, 180]], stucco: ['stucco', [222, 210, 186]],
      brick: ['brick', [142, 74, 57]], tile: ['rooftile', [162, 82, 55]], asphalt: ['asphalt', [92, 92, 94]], soil: ['dirt', [110, 94, 74]] };
    for (const [k, [src, col]] of Object.entries(up)) adoptPBR(k, _tex[k], col, TEX_M, src);
  }
  return _tex;
}

// Hook a material so its emissive glow follows U.uNight (lit windows, lamps).
export function nightGlow(mat, strength = 1.0) {
  mat.userData.nightStrength = strength;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = U.uNight;
    sh.fragmentShader = 'uniform float uNight;\n' + sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>\n totalEmissiveRadiance *= uNight * ${strength.toFixed(3)};`);
  };
  mat.customProgramCacheKey = () => 'nightGlow' + strength;
  return mat;
}

let _M = null;
// M: the shared material library. Colours are sRGB hex.
export function materials() {
  if (_M) return _M;
  const T = textures();
  const std = (opts, tex) => {
    const m = new THREE.MeshStandardMaterial(opts);
    if (tex) { m.map = tex.map; m.normalMap = tex.normalMap; m.roughnessMap = tex.roughnessMap; m.normalScale = new THREE.Vector2(0.6, 0.6); }
    return m;
  };
  _M = {
    granite: std({ color: 0xffffff, roughness: 0.85 }, T.granite),            // light Sierra granite (Howard's buildings)
    graniteDark: std({ color: 0xd2ccc2, roughness: 0.85 }, T.granite),         // plinths, bases, steps
    ashlar: std({ color: 0xffffff, roughness: 0.85 }, T.ashlar),               // jointed granite blocks
    marble: std({ color: 0xf4f1ea, roughness: 0.5 }, T.plain),
    concrete: std({ color: 0xffffff, roughness: 0.95 }, T.concrete),
    concreteDark: std({ color: 0xbdb8ae, roughness: 0.95 }, T.concrete),
    stucco: std({ color: 0xffffff, roughness: 0.95 }, T.stucco),               // cream Mediterranean stucco
    stuccoWhite: std({ color: 0xf2f0ea, roughness: 0.95 }, T.plain),
    brick: std({ color: 0xffffff, roughness: 0.9 }, T.brick),                  // red brick (South Hall etc.)
    redTile: std({ color: 0xffffff, roughness: 0.8 }, T.tile),                 // terracotta barrel tile roofs
    shingle: std({ color: 0x5d5a57, roughness: 0.95 }, T.shingle),
    slate: std({ color: 0xffffff, roughness: 0.75 }, T.slate),
    copper: std({ color: 0xffffff, roughness: 0.6, metalness: 0.15 }, T.copper), // verdigris
    bronze: std({ color: 0x6b5634, roughness: 0.42, metalness: 0.9 }),
    darkBronze: std({ color: 0x3b3022, roughness: 0.5, metalness: 0.85 }),
    gold: std({ color: 0xd9b15a, roughness: 0.28, metalness: 1.0 }),
    iron: std({ color: 0x26282b, roughness: 0.55, metalness: 0.6 }),        // railings, lamp posts
    lampGreen: std({ color: 0x24352c, roughness: 0.5, metalness: 0.5 }),
    glass: std({ color: 0x1b242d, roughness: 0.06, metalness: 0.2, envMapIntensity: 1.4 }),
    glassLight: std({ color: 0x5d7486, roughness: 0.1, metalness: 0.1, envMapIntensity: 1.2, transparent: true, opacity: 0.55 }),
    windowNight: nightGlow(std({ color: 0x1b242d, roughness: 0.08, metalness: 0.2, emissive: 0xffc77a, emissiveIntensity: 1.6 }), 1.0),
    lampGlow: nightGlow(std({ color: 0xfff4dd, roughness: 0.3, emissive: 0xffdca8, emissiveIntensity: 4.0 }), 1.0),
    wood: std({ color: 0xffffff, roughness: 0.85 }, T.wood),
    woodDark: std({ color: 0x7a6650, roughness: 0.85 }, T.wood),
    paving: std({ color: 0xffffff, roughness: 0.9 }, T.paving),
    asphalt: T.asphalt ? std({ color: 0x9a9a9c, roughness: 0.95 }, T.asphalt) : std({ color: 0x45474a, roughness: 0.95 }, T.concrete), // gfx-materials
    whitePaint: std({ color: 0xf3f1ec, roughness: 0.6 }),
    blackPaint: std({ color: 0x18191b, roughness: 0.5 }),
    turf: Object.assign(std({ color: 0x52663a, roughness: 0.95 }), { userData: { groundTurf: true } }), // r4-ground: lawn-matched colour; world-space lawn texture via pbr.js turfWorld (was flat 0x4c7a33 'neon')
    calBlue: std({ color: 0x003262, roughness: 0.7 }),     // Berkeley Blue
    calGold: std({ color: 0xfdb515, roughness: 0.6 }),     // California Gold
    seatBlue: std({ color: 0x0b3a6e, roughness: 0.6 }),
    water: std({ color: 0x2d4e5c, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.5 }),
    soil: T.soil ? std({ color: 0xc8beb0, roughness: 1.0 }, T.soil) : std({ color: 0x6b5a45, roughness: 1.0 }, T.concrete), // gfx-materials
  };
  return _M;
}

// Box-project UVs in metres (divided by TEX_M) using each face's dominant axis.
// Vertical faces get u along the horizontal axis and v = height, so brick/ashlar courses stay level.
export function boxUV(geom, scale = 1 / TEX_M, offset = [0, 0, 0]) {
  geom = geom.index ? geom.toNonIndexed() : geom;
  const pos = geom.attributes.position; const n = pos.count;
  const uv = new Float32Array(n * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    nn.subVectors(c, b).cross(a.clone().sub(b)).normalize();
    const ax = Math.abs(nn.x), ay = Math.abs(nn.y), az = Math.abs(nn.z);
    for (let k = 0; k < 3; k++) {
      const p = k === 0 ? a : k === 1 ? b : c;
      const x = p.x + offset[0], y = p.y + offset[1], z = p.z + offset[2];
      let u, v;
      if (ay >= ax && ay >= az) { u = x; v = z; }
      else if (ax >= az) { u = nn.x > 0 ? -z : z; v = y; }
      else { u = nn.z > 0 ? x : -x; v = y; }
      uv[(i + k) * 2] = u * scale; uv[(i + k) * 2 + 1] = v * scale;
    }
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (!geom.attributes.normal) geom.computeVertexNormals();
  return geom;
}
