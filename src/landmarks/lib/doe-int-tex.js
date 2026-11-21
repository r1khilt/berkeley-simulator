// Procedural canvas textures for the Doe Library interiors (coffered vault, laylight glazing, book spines, oak,
// marble, linoleum, Morrison panelling, Persian rugs, inscriptions, clock dial). Generated once and cached.
import * as THREE from 'three';

const cache = {};
const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, { srgb = true, repeat = true, aniso = 8 } = {}) => {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.needsUpdate = true; return t;
};
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hx = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
// per-pixel albedo + height -> map + normalMap
function pix(W, H, fn, nStrength = 2) {
  const ca = cv(W, H), ia = ca.getContext('2d').createImageData(W, H), hg = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = fn(x, y), i = y * W + x;
    ia.data[i * 4] = o[0]; ia.data[i * 4 + 1] = o[1]; ia.data[i * 4 + 2] = o[2]; ia.data[i * 4 + 3] = 255; hg[i] = o[3] ?? 0.5;
  }
  ca.getContext('2d').putImageData(ia, 0, 0);
  const cn = cv(W, H), inn = cn.getContext('2d').createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const xm = hg[y * W + (x - 1 + W) % W], xp = hg[y * W + (x + 1) % W], ym = hg[((y - 1 + H) % H) * W + x], yp = hg[((y + 1) % H) * W + x];
    let nx = (xm - xp) * nStrength, ny = (ym - yp) * nStrength, nz = 1; const l = Math.hypot(nx, ny, nz); const i = (y * W + x) * 4;
    inn.data[i] = (nx / l * 0.5 + 0.5) * 255; inn.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; inn.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; inn.data[i + 3] = 255;
  }
  cn.getContext('2d').putImageData(inn, 0, 0);
  return { map: tex(ca), normalMap: tex(cn, { srgb: false }) };
}
const mix = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
function noise2(seed) { const r = rng(seed); const g = new Float32Array(64 * 64); for (let i = 0; i < g.length; i++) g[i] = r(); return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; const a = g[((yi & 63) * 64) + (xi & 63)], b = g[((yi & 63) * 64) + ((xi + 1) & 63)], c = g[(((yi + 1) & 63) * 64) + (xi & 63)], d = g[(((yi + 1) & 63) * 64) + ((xi + 1) & 63)]; const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return mix(mix(a, b, sx), mix(c, d, sx), sy); }; }

// One coffer per tile: cream ribs, stepped moulding, recess, dark sunflower rosette with gilt tips.
export function cofferTex() {
  if (cache.coffer) return cache.coffer;
  const S = 256, rib = [218, 205, 178], rec = [200, 186, 154], ros = [74, 62, 44], gilt = [176, 146, 84];
  cache.coffer = pix(S, S, (x, y) => {
    const u = (x + 0.5) / S - 0.5, v = (y + 0.5) / S - 0.5, d = Math.max(Math.abs(u), Math.abs(v));
    let c, h;
    if (d > 0.4) { c = rib; h = 1; }
    else if (d > 0.37) { c = [232, 220, 196]; h = 0.85; }      // lit bevel
    else if (d > 0.34) { c = [184, 170, 140]; h = 0.65; }      // shadowed fillet
    else if (d > 0.31) { c = [214, 200, 170]; h = 0.55; }
    else { c = rec; h = 0.35; }
    const r = Math.hypot(u, v), a = Math.atan2(v, u);
    if (r < 0.22) {
      const pet = 0.5 + 0.5 * Math.cos(a * 16), edge = 0.14 + 0.07 * pet;
      if (r < 0.05) { c = [206, 184, 132]; h = 0.75; }
      else if (r < 0.075) { c = [92, 78, 52]; h = 0.55; }
      else if (r < edge) { const t = (r - 0.075) / (edge - 0.075); c = mixc(ros, gilt, t * t * pet); h = 0.5 + 0.2 * (1 - t); }
    }
    return [c[0], c[1], c[2], h];
  }, 3);
  return cache.coffer;
}
// Laylight glazing: 5x4 big squares (each 2x2 frosted panes) separated by narrow strips, dark bronze muntins.
export function laylightTex() {
  if (cache.lay) return cache.lay;
  const W = 512, H = 512, c = cv(W, H), g = c.getContext('2d');
  g.fillStyle = '#2a2622'; g.fillRect(0, 0, W, H);
  const nx = 5, ny = 4, sx = W / (nx + (nx + 1) * 0.25), sy = H / (ny + (ny + 1) * 0.25);
  const r = rng(7);
  const pane = (x, y, w, h, base) => { const k = 0.93 + r() * 0.1; g.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`; g.fillRect(x + 2, y + 2, w - 4, h - 4); };
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const x0 = i * sx * 1.25, y0 = j * sy * 1.25;
    pane(x0, y0, sx * 0.25, sy * 0.25, [214, 222, 216]);                         // strip crossing
    if (i < nx) pane(x0 + sx * 0.25, y0, sx, sy * 0.25, [222, 229, 224]);       // horizontal strip
    if (j < ny) pane(x0, y0 + sy * 0.25, sx * 0.25, sy, [222, 229, 224]);       // vertical strip
    if (i < nx && j < ny) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) pane(x0 + sx * 0.25 + a * sx / 2, y0 + sy * 0.25 + b * sy / 2, sx / 2, sy / 2, [236, 240, 234]);
  }
  const t = tex(c, { repeat: false }); cache.lay = t;
  // globe fixtures at the strip crossings (6 x 5), drawn on black for an additive layer
  const c2 = cv(W, H), g2 = c2.getContext('2d'); g2.fillStyle = '#000'; g2.fillRect(0, 0, W, H);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const x = i * sx * 1.25 + sx * 0.125, y = j * sy * 1.25 + sy * 0.125;
    const gr = g2.createRadialGradient(x, y, 0, x, y, 16); gr.addColorStop(0, 'rgba(255,240,205,1)'); gr.addColorStop(0.45, 'rgba(255,214,150,0.9)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
    g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, 16, 0, 7); g2.fill();
  }
  cache.globes = tex(c2, { repeat: false });
  return cache.lay;
}
export function globesTex() { laylightTex(); return cache.globes; }

// Book spines on six shelves; tiles horizontally every 1.6 m. v=0 bottom of case, v=1 top.
export function booksTex() {
  if (cache.books) return cache.books;
  const W = 512, H = 512, c = cv(W, H), g = c.getContext('2d'), r = rng(42);
  g.fillStyle = '#2b1b10'; g.fillRect(0, 0, W, H);
  const pal = [0x6b2a22, 0x7a3b26, 0x4a2a1c, 0x2f3a4d, 0x3c4a35, 0x8a6a3c, 0x5b1f24, 0x2c2c30, 0x9a8460, 0x6d5a3a, 0x1f3046, 0x7e2f2a, 0xb59d6a, 0x45311f, 0x3e2b46];
  const rows = 6, rowH = H / rows;
  for (let k = 0; k < rows; k++) {
    const y1 = H - k * rowH - 10, top = y1 - rowH + 26; // shelf board at y1..y1+10
    let x = 0;
    while (x < W) {
      const w = 6 + r() * 14 | 0, hh = (rowH - 30) * (0.72 + r() * 0.28), col = hx(pal[(r() * pal.length) | 0]), k2 = 0.75 + r() * 0.4;
      if (r() < 0.04) { x += w * 2; continue; }
      g.fillStyle = `rgb(${col[0] * k2 | 0},${col[1] * k2 | 0},${col[2] * k2 | 0})`;
      const ww = Math.min(w, W - x); g.fillRect(x, y1 - hh, ww - 1, hh);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + ww - 2, y1 - hh, 1, hh);
      if (r() < 0.5) { g.fillStyle = 'rgba(214,180,100,0.65)'; g.fillRect(x + 1, y1 - hh * 0.82, ww - 3, 2); g.fillRect(x + 1, y1 - hh * 0.3, ww - 3, 1); }
      x += w;
    }
    g.fillStyle = '#3b2616'; g.fillRect(0, y1, W, 10); g.fillStyle = 'rgba(255,220,170,0.12)'; g.fillRect(0, y1, W, 2);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, top - 20, W, 14);
  }
  cache.books = tex(c); return cache.books;
}
// Quarter-sawn oak (grain along u), for tables / chairs / desks.
export function oakTex() {
  if (cache.oak) return cache.oak;
  const S = 256, n = noise2(3), base = [176, 126, 70];
  cache.oak = pix(S, S, (x, y) => {
    const w = n(x * 0.03, y * 0.6) * 0.6 + n(x * 0.11, y * 2.1) * 0.4, fleck = n(x * 0.5, y * 0.08) > 0.78 ? 0.12 : 0;
    const k = 0.78 + w * 0.32 + fleck; return [base[0] * k, base[1] * k, base[2] * k, w * 0.3];
  }, 1);
  return cache.oak;
}
// Polished warm linoleum with faint mottling.
export function linoTex() {
  if (cache.lino) return cache.lino;
  const S = 256, n = noise2(11), base = [168, 118, 80];
  cache.lino = pix(S, S, (x, y) => { const k = 0.92 + (n(x * 0.06, y * 0.06) - 0.5) * 0.12 + (n(x * 0.3, y * 0.3) - 0.5) * 0.05; return [base[0] * k, base[1] * k, base[2] * k, 0.5]; }, 0.5);
  return cache.lino;
}
// Cream marble with soft grey veining.
export function marbleTex(seed = 5, base = [232, 226, 212]) {
  const key = 'marble' + seed; if (cache[key]) return cache[key];
  const S = 512, n = noise2(seed), n2 = noise2(seed + 9);
  cache[key] = pix(S, S, (x, y) => {
    const t = n(x * 0.012, y * 0.012) * 3 + n2(x * 0.04, y * 0.04) * 0.6, vein = Math.pow(Math.abs(Math.sin(t * 4.5 + x * 0.004)), 18);
    const k = 0.97 + (n2(x * 0.1, y * 0.1) - 0.5) * 0.05; const c = mixc([base[0] * k, base[1] * k, base[2] * k], [150, 146, 140], vein * 0.6);
    return [c[0], c[1], c[2], 0.5];
  }, 0.3);
  return cache[key];
}
// Morrison panelling: raised panels 3 wide x 2 high per tile (tile = 1.8 m x 1.2 m), dark oak.
export function panelTex() {
  if (cache.panel) return cache.panel;
  const W = 384, H = 256, n = noise2(21), base = [96, 62, 38];
  cache.panel = pix(W, H, (x, y) => {
    const pw = W / 3, ph = H / 2, px = (x % pw) / pw, py = (y % ph) / ph, d = Math.min(px, 1 - px, py * (ph / pw), (1 - py) * (ph / pw));
    let h = 0.5, k = 1;
    if (d < 0.06) { h = 1; k = 1.06; } else if (d < 0.1) { h = 0.3; k = 0.72; } else if (d < 0.16) { h = 0.3 + (d - 0.1) * 8; k = 0.88 + (d - 0.1) * 2; } else { h = 0.78; k = 1.0; }
    const gr = 0.85 + n(x * 0.02, y * 0.5) * 0.25; return [base[0] * k * gr, base[1] * k * gr, base[2] * k * gr, h];
  }, 2.5);
  return cache.panel;
}
// Jacobean strapwork plaster ceiling (Morrison): octagon/cross grid, one motif per 2.4 m tile.
export function strapTex() {
  if (cache.strap) return cache.strap;
  const S = 256;
  cache.strap = pix(S, S, (x, y) => {
    const u = x / S - 0.5, v = y / S - 0.5, au = Math.abs(u), av = Math.abs(v);
    const oct = Math.max(au, av, (au + av) * 0.72);                 // octagon around the centre
    const corner = Math.max(Math.abs(au - 0.5), Math.abs(av - 0.5)); // small squares at the corners
    let h = 0.4, c = [226, 214, 190];
    const rib = Math.abs(oct - 0.33) < 0.025 || Math.abs(corner - 0.1) < 0.02 || (Math.abs(au - av) < 0.02 && oct > 0.36 && corner > 0.12);
    if (rib) { h = 1; c = [240, 230, 208]; } else if (oct < 0.31) { h = 0.3; c = [212, 198, 168]; }
    const r = Math.hypot(u, v); if (r < 0.07) { h = 0.8; c = [222, 206, 172]; }
    return [c[0], c[1], c[2], h];
  }, 3);
  return cache.strap;
}
// Persian rugs (two designs). Returned as a map with repeat off.
export function rugTex(kind = 0) {
  const key = 'rug' + kind; if (cache[key]) return cache[key];
  const W = 256, H = 384, c = cv(W, H), g = c.getContext('2d'), r = rng(100 + kind);
  const field = kind ? '#8a2738' : '#c9b48a', border = kind ? '#4f1820' : '#6b1f28', guard = '#d8c9a2', navy = '#2c3550';
  g.fillStyle = border; g.fillRect(0, 0, W, H);
  g.fillStyle = guard; g.fillRect(14, 14, W - 28, H - 28); g.fillStyle = navy; g.fillRect(18, 18, W - 36, H - 36);
  g.fillStyle = border; g.fillRect(24, 24, W - 48, H - 48);
  for (let i = 0; i < 60; i++) { g.fillStyle = ['#c2a25c', '#d8c9a2', '#7e8a5c', '#b56a6a'][i % 4]; const t = i / 60; const p = t * 2 * (W + H - 96); let x, y; if (p < W - 48) { x = 24 + p; y = 32; } else if (p < W + H - 96) { x = W - 32; y = 24 + p - (W - 48); } else if (p < 2 * W + H - 144) { x = W - 24 - (p - (W + H - 96)); y = H - 32; } else { x = 32; y = H - 24 - (p - (2 * W + H - 144)); } g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
  g.fillStyle = field; g.fillRect(38, 38, W - 76, H - 76);
  if (kind === 0) { // garden compartments
    for (let j = 0; j < 7; j++) for (let i = 0; i < 4; i++) { const x = 44 + i * (W - 88) / 4, y = 44 + j * (H - 88) / 7, w = (W - 88) / 4 - 6, h = (H - 88) / 7 - 6; g.fillStyle = ['#9a3a33', '#7e8a5c', '#c2a25c', '#b56a6a'][(i + j) % 4]; g.fillRect(x, y, w, h); g.fillStyle = '#d9cba4'; g.fillRect(x + w / 2 - 3, y + 4, 6, h - 8); g.fillRect(x + 4, y + h / 2 - 3, w - 8, 6); }
  } else { // central medallion + all-over florals
    for (let i = 0; i < 140; i++) { g.fillStyle = ['#d9cba4', '#c2a25c', '#2c3550', '#5c1a24'][i % 4]; g.beginPath(); g.arc(44 + r() * (W - 88), 44 + r() * (H - 88), 2 + r() * 3, 0, 7); g.fill(); }
    g.fillStyle = '#2c3550'; g.beginPath(); g.ellipse(W / 2, H / 2, 52, 80, 0, 0, 7); g.fill(); g.fillStyle = '#c2a25c'; g.beginPath(); g.ellipse(W / 2, H / 2, 36, 60, 0, 0, 7); g.fill(); g.fillStyle = '#8a2738'; g.beginPath(); g.ellipse(W / 2, H / 2, 18, 30, 0, 0, 7); g.fill();
  }
  cache[key] = tex(c, { repeat: false }); return cache[key];
}
// Carved / gilt inscription on stone or bronze.
export function textTex(text, { w = 1024, h = 96, bg = '#d8cdb6', fg = '#3a332a', font = 'bold 54px Georgia, "Times New Roman", serif', spacing = 0.18, lines = null } = {}) {
  const key = 'txt:' + text + w + h + bg + fg; if (cache[key]) return cache[key];
  const c = cv(w, h), g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font;
  const L = lines || [text];
  L.forEach((s, i) => { const t = s.split('').join(String.fromCharCode(8202).repeat(Math.round(spacing * 10))); g.fillText(t, w / 2, h * (i + 0.55) / L.length); });
  cache[key] = tex(c, { repeat: false }); return cache[key];
}
export function clockTex() {
  if (cache.clock) return cache.clock;
  const S = 256, c = cv(S), g = c.getContext('2d');
  g.fillStyle = '#2b241b'; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.fill();
  g.fillStyle = '#efe6cf'; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 14, 0, 7); g.fill();
  g.strokeStyle = '#2b241b'; g.lineWidth = 2; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 30, 0, 7); g.stroke();
  g.fillStyle = '#2b241b'; g.font = 'bold 26px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.save(); g.translate(S / 2 + Math.sin(a) * (S / 2 - 50), S / 2 - Math.cos(a) * (S / 2 - 50)); g.rotate(a); g.fillText(R[i], 0, 0); g.restore(); }
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = S / 2 - 30, r1 = r0 - (i % 5 ? 5 : 10); g.lineWidth = i % 5 ? 1.5 : 3; g.beginPath(); g.moveTo(S / 2 + Math.sin(a) * r0, S / 2 - Math.cos(a) * r0); g.lineTo(S / 2 + Math.sin(a) * r1, S / 2 - Math.cos(a) * r1); g.stroke(); }
  cache.clock = tex(c, { repeat: false }); return cache.clock;
}
// Soft radial pool of lamplight (white on black, for additive decals).
export function poolTex() {
  if (cache.pool) return cache.pool;
  const S = 128, c = cv(S), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); cache.pool = tex(c, { repeat: false, srgb: false }); return cache.pool;
}
