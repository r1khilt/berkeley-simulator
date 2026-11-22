// Campus life: bikes and rental e-scooters for riders. Geometry is merged per vehicle with vertex colours; parts flagged
// `paint` take the per-instance colour, `glow` parts (head/tail lights) light up at night. Forward is -z, ground at y=0.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { U } from '../materials.js';

const DARK = [0.035, 0.035, 0.038], METAL = [0.55, 0.56, 0.58], GRIP = [0.06, 0.06, 0.06];
class VB { // vehicle builder
  constructor() { this.parts = []; }
  add(g, col, paint = 0, glow = 0) {
    g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count;
    const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.set(col, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.setAttribute('aPaint', new THREE.BufferAttribute(new Float32Array(n).fill(paint), 1));
    g.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(n).fill(glow), 1));
    if (g.attributes.uv) g.deleteAttribute('uv');
    this.parts.push(g);
  }
  tube(a, b, r, col, paint = 0, seg = 6) {
    const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(Bv, A);
    const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
    g.translate(A.x + d.x / 2, A.y + d.y / 2, A.z + d.z / 2); this.add(g, col, paint);
  }
  build() { const g = mergeGeometries(this.parts); g.computeBoundingSphere(); return g; }
}
function wheel(V, z, R, tire, rimCol, spokes = 6) {
  const t = new THREE.TorusGeometry(R, tire, 6, 22); t.rotateY(Math.PI / 2); t.translate(0, R, z); V.add(t, DARK);
  const rim = new THREE.TorusGeometry(R - tire * 1.4, tire * 0.45, 4, 22); rim.rotateY(Math.PI / 2); rim.translate(0, R, z); V.add(rim, rimCol);
  for (let k = 0; k < spokes; k++) { const a = (k / spokes) * Math.PI; const s = new THREE.BoxGeometry(0.006, 2 * (R - tire * 1.6), 0.006); s.rotateX(a); s.translate(0, R, z); V.add(s, METAL); }
  const hub = new THREE.CylinderGeometry(0.022, 0.022, 0.09, 8); hub.rotateZ(Math.PI / 2); hub.translate(0, R, z); V.add(hub, METAL);
}
export function bikeGeometry() {
  const V = new VB(); const R = 0.34;
  wheel(V, 0.52, R, 0.02, METAL, 8); wheel(V, -0.52, R, 0.02, METAL, 8);
  const bb = [0, 0.3, 0], seat = [0, 0.84, 0.2], ht = [0, 0.86, -0.36], hb = [0, 0.72, -0.4], ra = [0, R, 0.52], fa = [0, R, -0.52];
  V.tube(bb, seat, 0.018, [1, 1, 1], 1); V.tube(seat, ht, 0.016, [1, 1, 1], 1); V.tube(bb, hb, 0.02, [1, 1, 1], 1); V.tube(ht, hb, 0.022, [1, 1, 1], 1);
  for (const s of [-1, 1]) { V.tube([s * 0.035, 0.3, 0], [s * 0.05, R, 0.52], 0.01, [1, 1, 1], 1); V.tube([s * 0.02, 0.82, 0.21], [s * 0.05, R, 0.52], 0.009, [1, 1, 1], 1);
    V.tube([s * 0.03, 0.72, -0.4], [s * 0.05, R, -0.52], 0.011, METAL); }
  V.tube(seat, [0, 0.92, 0.23], 0.012, METAL);
  const saddle = new THREE.BoxGeometry(0.13, 0.05, 0.25); saddle.translate(0, 0.945, 0.25); V.add(saddle, DARK);
  V.tube(ht, [0, 1.0, -0.38], 0.014, METAL); V.tube([-0.26, 1.03, -0.4], [0.26, 1.03, -0.4], 0.013, GRIP);
  for (const s of [-1, 1]) { V.tube([s * 0.07, 0.3, 0], [s * 0.08, 0.3 + 0.17 * s, 0.0], 0.012, METAL); const ped = new THREE.BoxGeometry(0.09, 0.02, 0.06); ped.translate(s * 0.12, 0.3 + 0.17 * s, 0); V.add(ped, DARK); }
  const ring = new THREE.TorusGeometry(0.1, 0.008, 4, 16); ring.rotateY(Math.PI / 2); ring.translate(0.055, 0.3, 0); V.add(ring, METAL);
  for (const s of [-1, 1]) { const fen = new THREE.TorusGeometry(R + 0.03, 0.012, 3, 12, Math.PI * 0.55); fen.rotateY(Math.PI / 2); fen.rotateX(s < 0 ? -0.15 : -Math.PI * 0.55 + 0.15 + Math.PI); fen.translate(0, R, s * 0.52); }
  const lamp = new THREE.BoxGeometry(0.06, 0.05, 0.05); lamp.translate(0, 0.95, -0.44); V.add(lamp, [0.9, 0.9, 0.85], 0, 1);
  const tail = new THREE.BoxGeometry(0.05, 0.035, 0.02); tail.translate(0, 0.86, 0.36); V.add(tail, [0.7, 0.05, 0.04], 0, 2);
  return V.build();
}
export function scooterGeometry() {
  const V = new VB(); const R = 0.115;
  wheel(V, 0.43, R, 0.03, DARK, 0); wheel(V, -0.43, R, 0.03, DARK, 0);
  const deck = new THREE.BoxGeometry(0.17, 0.045, 0.78); deck.translate(0, 0.11, 0.0); V.add(deck, [0.09, 0.09, 0.1]);
  for (const s of [-1, 1]) { const side = new THREE.BoxGeometry(0.012, 0.05, 0.74); side.translate(s * 0.087, 0.105, 0.0); V.add(side, [1, 1, 1], 1); }
  V.tube([0, 0.13, -0.38], [0, 1.06, -0.47], 0.028, [1, 1, 1], 1, 8);
  V.tube([0, 0.24, -0.43], [0, R, -0.43], 0.02, DARK);
  V.tube([-0.25, 1.08, -0.47], [0.25, 1.08, -0.47], 0.016, GRIP);
  const disp = new THREE.BoxGeometry(0.1, 0.03, 0.08); disp.translate(0, 1.09, -0.46); V.add(disp, DARK);
  const fen = new THREE.BoxGeometry(0.1, 0.02, 0.24); fen.rotateX(-0.25); fen.translate(0, 0.22, 0.46); V.add(fen, [1, 1, 1], 1);
  const lamp = new THREE.BoxGeometry(0.07, 0.05, 0.04); lamp.translate(0, 0.98, -0.5); V.add(lamp, [0.9, 0.9, 0.85], 0, 1);
  const tail = new THREE.BoxGeometry(0.08, 0.025, 0.02); tail.translate(0, 0.25, 0.58); V.add(tail, [0.7, 0.05, 0.04], 0, 2);
  return V.build();
}
export function vehicleMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.25 });
  m.name = 'life:vehicle';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = U.uNight;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aPaint; attribute float aGlow; varying float vGlow;')
      .replace('#include <color_vertex>', `#if defined( USE_COLOR )
  vColor = vec3( 1.0 ); vColor.xyz *= color.xyz;
#endif
#ifdef USE_INSTANCING_COLOR
  vColor.xyz = mix(vColor.xyz, instanceColor.xyz, aPaint);
#endif
  vGlow = aGlow;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight; varying float vGlow;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  if (vGlow > 0.5) totalEmissiveRadiance += (vGlow < 1.5 ? vec3(1.0, 0.95, 0.85) * 6.0 : vec3(1.0, 0.06, 0.03) * 3.0) * uNight;`);
  };
  m.customProgramCacheKey = () => 'life-vehicle-v1';
  return m;
}
export class VehicleMesh {
  constructor(geo, mat, max, name) {
    this.mesh = new THREE.InstancedMesh(geo, mat, max); this.mesh.name = name; this.mesh.count = 0; this.max = max;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3); this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false; this.n = 0;
  }
  begin() { this.n = 0; }
  push(m, col) { if (this.n >= this.max) return; const i = this.n++; this.mesh.instanceMatrix.array.set(m, i * 16); this.mesh.instanceColor.array.set(col, i * 3); }
  end() { this.mesh.count = this.n; for (const a of [this.mesh.instanceMatrix, this.mesh.instanceColor]) { a.clearUpdateRanges(); a.addUpdateRange(0, this.n * a.itemSize); a.needsUpdate = true; } }
}
// plain meshes for the dev lineup page
export function makeBike(col = [0.0, 0.2, 0.38]) { const g = bikeGeometry(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 })); recolour(g, col); m.castShadow = true; return m; }
export function makeScooter(col = [0.2, 0.75, 0.2]) { const g = scooterGeometry(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 })); recolour(g, col); m.castShadow = true; return m; }
function recolour(g, col) { const c = g.attributes.color, p = g.attributes.aPaint; for (let i = 0; i < c.count; i++) if (p.getX(i) > 0.5) c.setXYZ(i, col[0], col[1], col[2]); }
