// r4-moffitt: mown-lawn material for modelled grass (berms, beds) that sits next to the terrain's lawn shader.
// M.turf is a flat untextured green that reads neon in sun; this one matches the terrain lawn's tone (~#6b8448)
// with blotchy macro variation and fine blade speckle baked into a small tiling canvas (UVs in metres/2, boxUV).
import * as THREE from 'three';
let _lawn = null;
export function lawnMat() {
  if (_lawn) return _lawn;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#66803f'; g.fillRect(0, 0, S, S);
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 90; k++) { // soft blotches (drier / lusher patches), wrapped so the tile repeats seamlessly
    const x = rnd() * S, y = rnd() * S, r = 14 + rnd() * 40, lush = rnd() < 0.5;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, lush ? 'rgba(70,104,44,0.35)' : 'rgba(132,140,74,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r);
    }
  }
  for (let k = 0; k < 9000; k++) { const x = rnd() * S, y = rnd() * S, l = rnd(); g.fillStyle = l < 0.5 ? 'rgba(48,72,30,0.55)' : 'rgba(150,168,96,0.45)'; g.fillRect(x, y, 1, 1 + (rnd() < 0.3 ? 1 : 0)); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  _lawn = new THREE.MeshStandardMaterial({ color: 0xffffff, map: t, roughness: 1.0, metalness: 0 }); _lawn.name = 'r4Lawn';
  return _lawn;
}
