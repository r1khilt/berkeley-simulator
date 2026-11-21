// Helpers for the Grimes Engineering Center (SOM 2025): precast-panel concrete, white steel struts/rods,
// picket railings, louvre bands and signage. Built on classic-kit's Kit (building frame u,v; y up).
import * as THREE from 'three';
import { nightGlow } from '../../materials.js';

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
    panel: std({ color: 0xffffff, map: panelTexture([206, 197, 181], 0.8), roughness: 0.9, name: 'grimes-precast' }),
    steel: std({ color: 0xf1f1ee, roughness: 0.45, metalness: 0.15, name: 'grimes-white-steel' }),
    louvre: std({ color: 0xe9ecec, roughness: 0.5, metalness: 0.25, name: 'grimes-louvre' }),
    metalPanel: std({ color: 0xffffff, map: panelTexture([240, 240, 236], 0.9), roughness: 0.5, metalness: 0.1, name: 'grimes-white-panel' }),
    soffit: std({ color: 0xc9d0d4, roughness: 0.6, metalness: 0.2, name: 'grimes-soffit' }),
    rod: std({ color: 0xdfe2e2, roughness: 0.3, metalness: 0.6, name: 'grimes-sma-rod' }),
    storeGlass: nightGlow(std({ color: 0x6d8fae, roughness: 0.04, metalness: 0.4, envMapIntensity: 1.5, emissive: 0xffd9a8, emissiveIntensity: 1.1, name: 'grimes-storefront-glass' }), 1.0),
    frame: std({ color: 0xe4e6e6, roughness: 0.4, metalness: 0.4, name: 'grimes-mullion' }),
    darkFrame: std({ color: 0x3a3d40, roughness: 0.45, metalness: 0.5, name: 'grimes-dark-frame' }),
    glass: std({ color: 0x7ea6cf, roughness: 0.03, metalness: 0.45, transparent: true, opacity: 0.56, envMapIntensity: 1.6, depthWrite: false, name: 'grimes-glass' }),
    deck: std({ color: 0xffffff, map: floorTexture(), roughness: 0.85, name: 'grimes-deck' }),
    slab: std({ color: 0xdcdad4, roughness: 0.9, name: 'grimes-slab' }),
    ceiling: nightGlow(std({ color: 0xb98a5a, roughness: 0.8, emissive: 0xffd9a0, emissiveIntensity: 0.9, name: 'grimes-wood-ceiling' }), 1.0),
    interiorWall: nightGlow(std({ color: 0xf0efea, roughness: 0.9, emissive: 0xfff0d8, emissiveIntensity: 0.5, name: 'grimes-interior' }), 1.0),
    planting: std({ color: 0x55703f, roughness: 1.0, name: 'grimes-planting' }),
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
