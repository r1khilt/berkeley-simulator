// Helpers for the Grimes Engineering Center (SOM 2025): precast-panel concrete, white steel struts/rods,
// picket railings, louvre bands and signage. Built on classic-kit's Kit (building frame u,v; y up).
import * as THREE from 'three';
import { nightGlow, U } from '../../materials.js';

// Daylight bounce for white-painted steel and louvres: a small emissive lift that fades out at night (inverse of nightGlow),
// so the white structure and the louvre soffit read white in shade instead of grey.
function dayLift(mat, hex, key) {
  mat.emissive = new THREE.Color(hex);
  mat.onBeforeCompile = (sh) => { sh.uniforms.uNight = U.uNight; sh.fragmentShader = 'uniform float uNight;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= (1.0 - uNight);'); };
  mat.customProgramCacheKey = () => 'grimesDayLift' + key;
  return mat;
}

let _mats = null;
// Canvas texture of large precast concrete panels: one tile = 2 m x 2 m (boxUV maps metres/2), panels 2.0 x 1.0 m.
function panelTexture(base = [201, 194, 182], jointK = 0.66) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const img = g.createImageData(S, S); let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const n0 = []; for (let i = 0; i < 64 * 64; i++) n0.push(rnd());
  const noise = (x, y) => { const xi = Math.floor(x) & 63, yi = Math.floor(y) & 63, fx = x - Math.floor(x), fy = y - Math.floor(y); const a = n0[yi * 64 + xi], b = n0[yi * 64 + ((xi + 1) & 63)], cc = n0[((yi + 1) & 63) * 64 + xi], d = n0[((yi + 1) & 63) * 64 + ((xi + 1) & 63)]; return a + (b - a) * fx + (cc - a) * fy + (a - b - cc + d) * fx * fy; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const panel = (y < S / 2 ? 0 : 1); const tone = panel ? 0.985 : 1.012;
    const n = noise(x / 16, y / 16) * 0.5 + noise(x / 5, y / 5) * 0.3 + rnd() * 0.2;
    let k = tone * (0.93 + n * 0.1);
    const jx = Math.min(x, S - 1 - x) < 2, jy = Math.min(y, S - 1 - y) < 2 || Math.abs(y - S / 2) < 2;
    // faint form-tie dots
    const tie = ((Math.abs(x - S * 0.25) < 2 || Math.abs(x - S * 0.75) < 2) && (Math.abs(y - S * 0.25) < 2 || Math.abs(y - S * 0.75) < 2));
    if (jx || jy) k = jointK; else if (tie && jointK < 0.8) k *= 0.86;
    const i = (y * S + x) * 4; img.data[i] = Math.min(255, base[0] * k); img.data[i + 1] = Math.min(255, base[1] * k); img.data[i + 2] = Math.min(255, base[2] * k); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.repeat.set(2 / 3, 2 / 3); return t;
}
// Light grey board-formed concrete: 1.5 m lifts (dark joints) of ~0.19 m horizontal boards with faint grain (tile = 3 m)
function boardTexture(base = [198, 198, 195]) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const img = g.createImageData(S, S); let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const boards = 16, bh = S / boards; const tone = []; for (let i = 0; i < boards; i++) tone.push(0.965 + rnd() * 0.06);
  const grain = []; for (let i = 0; i < S; i++) grain.push(rnd());
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const b = Math.floor(y / bh); let k = tone[b] * (0.975 + grain[(x * 3 + b * 37) % S] * 0.03 + rnd() * 0.02);
    const yy = y % bh; if (yy < 1) k *= 0.9;                                       // board seam
    if (Math.min(y, S - 1 - y) < 2 || Math.abs(y - S / 2) < 2) k = 0.7;               // lift joints every 1.5 m
    if (Math.min(x, S - 1 - x) < 1) k *= 0.88;                                         // faint vertical form joint
    const i = (y * S + x) * 4; img.data[i] = Math.min(255, base[0] * k); img.data[i + 1] = Math.min(255, base[1] * k); img.data[i + 2] = Math.min(255, base[2] * k); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.repeat.set(2 / 3, 2 / 3); return t;
}
// Canopy soffit: white aluminium slats with thin shadow gaps (4 slats per texture tile, stripes along U)
function slatTexture() {
  const W = 256, H = 4, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#f7f8f8'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) { const x = i * 64; g.fillStyle = '#8d979e'; g.fillRect(x + 50, 0, 10, H); g.fillStyle = '#c3cacf'; g.fillRect(x + 46, 0, 4, H); g.fillRect(x + 60, 0, 4, H); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// Polished concrete / terrazzo floor with saw-cut joints every 1.5 m (tile = 2 m)
function floorTexture() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#c9c7c1'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '120,118,112' : '235,233,228'},0.25)`; g.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5); }
  g.fillStyle = 'rgba(110,108,104,0.55)'; g.fillRect(0, 0, S, 1); g.fillRect(0, 0, 1, S);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function grimesMats(M) {
  if (_mats) return _mats;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  _mats = {
    panel: std({ color: 0xffffff, map: boardTexture([200, 201, 199]), roughness: 0.92, name: 'grimes-board-concrete' }),
    whitePanel: std({ color: 0xffffff, map: panelTexture([243, 244, 244], 0.95), roughness: 0.6, metalness: 0.05, name: 'grimes-white-cladding' }),
    steel: dayLift(std({ color: 0xffffff, roughness: 0.45, metalness: 0.05, name: 'grimes-white-steel' }), 0x5e6062, 's'),
    louvre: dayLift(std({ color: 0xffffff, roughness: 0.6, metalness: 0.0, name: 'grimes-louvre' }), 0x5c6064, 'l'),
    slats: dayLift(std({ color: 0xffffff, map: slatTexture(), roughness: 0.7, metalness: 0.0, name: 'grimes-slat-soffit' }), 0x6a6e72, 'sl'),
    veil: dayLift(std({ color: 0xeef1f3, roughness: 0.8, metalness: 0.0, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, name: 'grimes-canopy-veil' }), 0x7a7f84, 'v'),
    metalPanel: dayLift(std({ color: 0xffffff, map: panelTexture([246, 247, 247], 0.94), roughness: 0.45, metalness: 0.05, name: 'grimes-white-panel' }), 0x4a4c4e, 'mp'),
    soffit: std({ color: 0xc9d0d4, roughness: 0.6, metalness: 0.2, name: 'grimes-soffit' }),
    rod: dayLift(std({ color: 0xf4f5f3, roughness: 0.4, metalness: 0.1, name: 'grimes-sma-rod' }), 0x5a5a58, 'r'),
    sleeve: std({ color: 0xd4d7d8, roughness: 0.3, metalness: 0.45, name: 'grimes-sma-sleeve' }),
    storeGlass: nightGlow(std({ color: 0x46709a, roughness: 0.05, metalness: 0.6, envMapIntensity: 1.8, emissive: 0xffd9a8, emissiveIntensity: 1.1, name: 'grimes-storefront-glass' }), 1.0),
    frame: dayLift(std({ color: 0xf6f7f7, roughness: 0.4, metalness: 0.2, name: 'grimes-mullion' }), 0x3c3e40, 'fr'),
    darkFrame: std({ color: 0x3a3d40, roughness: 0.45, metalness: 0.5, name: 'grimes-dark-frame' }),
    glass: std({ color: 0x5b8ab8, roughness: 0.03, metalness: 0.55, transparent: true, opacity: 0.62, envMapIntensity: 2.0, depthWrite: false, name: 'grimes-glass' }),
    deck: std({ color: 0xffffff, map: floorTexture(), roughness: 0.85, name: 'grimes-deck' }),
    slab: std({ color: 0xe2e3e1, roughness: 0.88, name: 'grimes-slab' }),
    ceiling: nightGlow(std({ color: 0xe6e2da, roughness: 0.8, emissive: 0xffd9a0, emissiveIntensity: 0.9, name: 'grimes-wood-ceiling' }), 1.0),
    interiorWall: nightGlow(std({ color: 0xf0efea, roughness: 0.9, emissive: 0xfff0d8, emissiveIntensity: 0.5, name: 'grimes-interior' }), 1.0),
    planting: std({ color: 0x4d6a36, roughness: 1.0, name: 'grimes-planting' }),
    mulch: std({ color: 0x6b5640, roughness: 1.0, name: 'grimes-mulch' }),
    brick: M.brick,
  };
  return _mats;
}

// Thin straight strut (round) between two building-frame points p=[u,y,v]
export function strut(K, mat, p0, p1, r, seg = 6, opts) {
  const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1); const d = new THREE.Vector3().subVectors(b, a); const L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg, 1, false); g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.applyQuaternion(q); g.translate(a.x, a.y, a.z);
  return K.add(mat, g, opts);
}
// Picket guardrail along segment a->b (building frame [u,v]) standing on y: top rail + bottom rail + pickets every `pitch`
export function pickets(K, mat, a, b, y, h = 1.1, pitch = 0.14, opts = { detail: true }) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.3) return; const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const ang = Math.atan2(t[1], t[0]);
  const rail = (yy, hh, ww) => { const g = new THREE.BoxGeometry(L, hh, ww); g.rotateY(-ang); g.translate((a[0] + b[0]) / 2, yy, (a[1] + b[1]) / 2); K.add(mat, g, opts); };
  rail(y + h - 0.03, 0.06, 0.07); rail(y + 0.1, 0.04, 0.04);
  const n = Math.max(1, Math.round(L / pitch)); const geos = [];
  for (let i = 0; i <= n; i++) { const s = L * i / n; const g = new THREE.BoxGeometry(0.022, h - 0.12, 0.022); g.translate(a[0] + t[0] * s, y + 0.1 + (h - 0.12) / 2, a[1] + t[1] * s); geos.push(g); }
  for (const g of geos) K.add(mat, g, opts);
  // posts every ~1.8 m
  const np = Math.max(1, Math.round(L / 1.8)); for (let i = 0; i <= np; i++) { const s = L * i / np; const g = new THREE.BoxGeometry(0.06, h, 0.06); g.translate(a[0] + t[0] * s, y + h / 2, a[1] + t[1] * s); K.add(mat, g, opts); }
}
// Sloped picket guard (stairs): rails from a=[u,y,v] to b=[u,y,v], pickets every `pitch`, posts every ~1.8 m
export function slopePickets(K, mat, a, b, h = 1.07, pitch = 0.14) {
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]); if (L < 0.3) return;
  strut(K, mat, [a[0], a[1] + h, a[2]], [b[0], b[1] + h, b[2]], 0.035, 6, { detail: true });
  strut(K, mat, [a[0], a[1] + 0.12, a[2]], [b[0], b[1] + 0.12, b[2]], 0.02, 4, { detail: true });
  const n = Math.max(1, Math.round(L / pitch));
  for (let i = 0; i <= n; i++) { const f = i / n, u = a[0] + (b[0] - a[0]) * f, v = a[2] + (b[2] - a[2]) * f, y = a[1] + (b[1] - a[1]) * f; const big = i % Math.max(1, Math.round(1.8 / pitch)) === 0; const w = big ? 0.07 : 0.032; K.box(mat, u - w / 2, y + 0.12, v - w / 2, u + w / 2, y + h, v + w / 2, { detail: true }); }
}
// Sign: canvas text on a plane facing the run's outward normal
export function sign(K, R, text, sMid, yMid, h, o = {}) {
  const fs = 128; const font = `${o.weight || '500'} ${fs}px ${o.font || 'Helvetica, Arial, sans-serif'}`;
  const c = document.createElement('canvas'); let g2 = c.getContext('2d'); g2.font = font;
  const sp = o.spacing ?? 0.12; let tw = 0; for (const ch of text) tw += g2.measureText(ch).width + sp * fs; c.width = Math.ceil(tw + 24); c.height = Math.ceil(fs * 1.3);
  g2 = c.getContext('2d'); g2.font = font; g2.fillStyle = o.color || '#d8d6d0'; g2.textBaseline = 'middle';
  let x = 12; for (const ch of text) { g2.fillText(ch, x, c.height / 2); x += g2.measureText(ch).width + sp * fs; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, roughness: 0.35, metalness: o.metal ?? 0.7, name: 'grimes-sign' });
  const w = h * c.width / c.height; const g = new THREE.PlaneGeometry(w, h); g.translate(sMid, yMid, o.d ?? 0.03);
  K.addRun(R, mat, g, { uvMode: 'keep', detail: true });
  return w;
}
