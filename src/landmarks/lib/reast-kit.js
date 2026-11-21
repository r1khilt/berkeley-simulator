// refine-east helpers (Rikhil's "more finished buildings" pass). Opt-in only; nothing here changes other modules.
import * as THREE from 'three';

let _ced = null;
// Weathered cedar shingles: ~0.18 m courses, 0.10-0.32 m random widths, soft tone variation (a few silvery ones),
// thin shadow line under each butt. 2 m tile for box-projected UVs (metres / 2).
export function cedarShingleTex() {
  if (_ced) return _ced;
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  const cn = document.createElement('canvas'); cn.width = cn.height = N; const gn = cn.getContext('2d');
  let seed = 23; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const rows = 11, rh = N / rows; gn.fillStyle = 'rgb(128,128,255)'; gn.fillRect(0, 0, N, N);
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 40; const y0 = r * rh;
    while (x < N) {
      const w = 26 + rnd() * 56; const silver = rnd() < 0.07; const v = 0.86 + rnd() * 0.26;
      const base = silver ? [190, 178, 162] : [205, 168, 132];
      g.fillStyle = `rgb(${base.map((q) => Math.min(255, (q * v) | 0)).join(',')})`; g.fillRect(x, y0, w, rh);
      for (let k = 0; k < 7; k++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '60,40,25' : '255,235,210'},${0.03 + rnd() * 0.05})`; g.fillRect(x + rnd() * w, y0, 1 + rnd() * 2, rh); }
      g.fillStyle = 'rgba(40,25,15,0.35)'; g.fillRect(x, y0, 1.2, rh); gn.fillStyle = 'rgb(110,128,245)'; gn.fillRect(x, y0, 1, rh);
      x += w;
    }
    const grd = g.createLinearGradient(0, y0 + rh - 7, 0, y0 + rh); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(25,14,8,0.6)');
    g.fillStyle = grd; g.fillRect(0, y0 + rh - 7, N, 7); gn.fillStyle = 'rgb(128,80,225)'; gn.fillRect(0, y0 + rh - 3, N, 3);
  }
  const mk = (cv, srgb) => { const tx = new THREE.CanvasTexture(cv); if (srgb) tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 8; return tx; };
  _ced = { map: mk(c, true), normalMap: mk(cn, false) };
  return _ced;
}
export function cedarShingleMat(color = 0xffffff) {
  const s = cedarShingleTex(); const m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, map: s.map, normalMap: s.normalMap });
  m.normalScale = new THREE.Vector2(0.8, 0.8); m.name = 'reastCedar'; return m;
}

let _pboard = null;
// Pale, warm board-formed concrete (Wurster Hall reads almost white in sun): 15 cm horizontal boards, low contrast.
export function paleBoardTex() {
  if (_pboard) return _pboard;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  const cn = document.createElement('canvas'); cn.width = cn.height = N; const gn = cn.getContext('2d');
  let seed = 19; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const nb = 13; const bh = N / nb; gn.fillStyle = 'rgb(128,128,255)'; gn.fillRect(0, 0, N, N);
  for (let i = 0; i < nb; i++) {
    const v = 0.96 + rnd() * 0.05; const base = [226 * v, 220 * v, 207 * v];
    g.fillStyle = `rgb(${base.map((x) => Math.min(255, x | 0)).join(',')})`; g.fillRect(0, i * bh, N, bh + 1);
    for (let k = 0; k < 70; k++) { const x = rnd() * N, w = 10 + rnd() * 50, y = i * bh + rnd() * bh; const d = (rnd() - 0.5) * 12; g.fillStyle = `rgba(${d > 0 ? '255,255,255' : '60,55,45'},${Math.abs(d) / 170})`; g.fillRect(x, y, w, 1 + rnd() * 1.5); }
    g.fillStyle = 'rgba(70,64,54,0.12)'; g.fillRect(0, i * bh, N, 1.0);
    gn.fillStyle = 'rgb(128,96,240)'; gn.fillRect(0, i * bh, N, 1.5); gn.fillStyle = 'rgb(128,160,240)'; gn.fillRect(0, i * bh + 1.5, N, 1.2);
  }
  // faint vertical weathering streaks
  for (let k = 0; k < 40; k++) { const x = rnd() * N, w = 2 + rnd() * 6; const grd = g.createLinearGradient(0, 0, 0, N); grd.addColorStop(0, 'rgba(90,84,72,0.07)'); grd.addColorStop(1, 'rgba(90,84,72,0)'); g.fillStyle = grd; g.fillRect(x, 0, w, N * (0.3 + rnd() * 0.7)); }
  const mk = (cv, srgb) => { const tx = new THREE.CanvasTexture(cv); if (srgb) tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 8; return tx; };
  _pboard = { map: mk(c, true), normalMap: mk(cn, false) };
  return _pboard;
}
export function paleBoardMat(color = 0xffffff) {
  const b = paleBoardTex(); const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, map: b.map, normalMap: b.normalMap });
  m.normalScale = new THREE.Vector2(0.35, 0.35); m.name = 'reastPaleBoard'; return m;
}

let _cast = null;
// Smooth cast-in-place concrete: warm grey, faint pour/lift lines every 1 m, soft vertical water staining (2 m tile).
export function castConcreteTex() {
  if (_cast) return _cast;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  let seed = 31; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  g.fillStyle = 'rgb(222,216,201)'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 2600; i++) { const v = rnd(); g.fillStyle = `rgba(${v < 0.5 ? '255,255,255' : '70,64,52'},${0.02 + rnd() * 0.035})`; g.fillRect(rnd() * N, rnd() * N, 2 + rnd() * 5, 2 + rnd() * 5); }
  for (const y of [0, N / 2]) { g.fillStyle = 'rgba(80,74,62,0.16)'; g.fillRect(0, y, N, 1.2); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, y + 1.2, N, 1); }
  for (let k = 0; k < 26; k++) { const x = rnd() * N, w = 3 + rnd() * 9; const grd = g.createLinearGradient(0, 0, 0, N); grd.addColorStop(0, 'rgba(95,88,74,0.10)'); grd.addColorStop(1, 'rgba(95,88,74,0)'); g.fillStyle = grd; g.fillRect(x, 0, w, N * (0.25 + rnd() * 0.75)); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 8;
  _cast = tx; return tx;
}
export function castConcreteMat(color = 0xffffff, rough = 0.9) { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, map: castConcreteTex() }); m.name = 'reastCast'; return m; }

// Carved-inscription panel: dark polished stone with light raised serif capitals, high-res canvas so it stays legible.
export function inscriptionPanel(K, R, s0, s1, y0, y1, d, text, { bg = '#2b323c', fg = '#d9dde1', font = 'Georgia, "Times New Roman", serif', px = 74, lineGap = 1.42, pad = 0.055, sig = null } = {}) {
  const W = 2048, H = Math.round(W * (y1 - y0) / (s1 - s0));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${0.012 + Math.random() * 0.02})`; g.fillRect(Math.random() * W, Math.random() * H, 3 + Math.random() * 10, 3 + Math.random() * 10); }
  g.textBaseline = 'top'; g.font = `600 ${px}px ${font}`;
  const maxW = W * (1 - 2 * pad); const words = String(text).split(' '); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; } lines.push(line);
  const lh = px * lineGap; let y = Math.max(H * pad, (H - (lines.length + (sig ? 1.2 : 0)) * lh) / 2);
  for (const L of lines) { const w = g.measureText(L).width; const x = (W - w) / 2; g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText(L, x + 3, y + 3); g.fillStyle = fg; g.fillText(L, x, y); y += lh; }
  if (sig) { g.font = `600 ${Math.round(px * 0.9)}px ${font}`; const w = g.measureText(sig).width; g.fillStyle = fg; g.fillText(sig, W * (1 - pad) - w, y + lh * 0.2); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.32, metalness: 0.08 });
  const geo = new THREE.PlaneGeometry(s1 - s0, y1 - y0); geo.translate((s0 + s1) / 2, (y0 + y1) / 2, d);
  K.addRun(R, mat, geo, { uvMode: 'keep' });
  return mat;
}
