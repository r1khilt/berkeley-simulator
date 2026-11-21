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
