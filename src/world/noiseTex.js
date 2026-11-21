import * as THREE from 'three';
import { fbm, vnoise } from '../lib/noise.js';
// 256x256 tileable RGBA noise: R = low-freq fbm, G = mid fbm, B = high-freq value noise, A = cellular-ish speckle
let _t = null;
export function noiseTexture() {
  if (_t) return _t;
  const N = 256, d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = (y * N + x) * 4;
    d[i] = fbm(u * 4, v * 4, 4, 5, 1) * 255;
    d[i + 1] = fbm(u * 16, v * 16, 16, 4, 2) * 255;
    d[i + 2] = vnoise(u * 64, v * 64, 64, 3) * 255;
    const s = vnoise(u * 128, v * 128, 128, 4); d[i + 3] = Math.pow(s, 3) * 255;
  }
  _t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  _t.wrapS = _t.wrapT = THREE.RepeatWrapping; _t.magFilter = THREE.LinearFilter; _t.minFilter = THREE.LinearMipmapLinearFilter;
  _t.generateMipmaps = true; _t.anisotropy = 8; _t.needsUpdate = true;
  return _t;
}
