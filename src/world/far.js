// Distant Bay Area: San Francisco skyline (OSM heights), Golden Gate Bridge, Bay Bridge (with the Bay Lights at night).
import * as THREE from 'three';
import { U } from '../materials.js';
function cityMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xc9c6bf, roughness: 0.6, metalness: 0.15 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = U.uNight;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWC; varying vec3 vNC;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWC=(modelMatrix*vec4(transformed,1.0)).xyz; vNC = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uNight; varying vec3 vWC; varying vec3 vNC;
float hc(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
 float fl = floor(vWC.y/3.6); float band = step(0.45, fract(vWC.y/3.6));
 float side = abs(vNC.y) < 0.5 ? 1.0 : 0.0;
 float tone = 0.75 + 0.35*hc(vec2(floor(vWC.x/40.0), floor(vWC.z/40.0)));
 diffuseColor.rgb *= tone * mix(1.0, mix(0.55, 1.0, band), side);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 float cell = floor((vWC.x+vWC.z)/3.0);
 float lit = step(0.62, hc(vec2(cell, fl))) * (1.0 - step(0.45, fract(vWC.y/3.6))) * (abs(vNC.y) < 0.5 ? 1.0 : 0.0);
 totalEmissiveRadiance += vec3(1.0, 0.82, 0.55) * lit * uNight * 2.5;`);
  };
  m.customProgramCacheKey = () => 'farCity';
  return m;
}
export function buildSkyline(list, heightAt) {
  const pos = [];
  for (const [h, mh, pyr, flat] of list) {
    const pts = []; for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
    if (pts.length < 3) continue;
    let cx = 0, cz = 0; for (const p of pts) { cx += p[0]; cz += p[1]; } cx /= pts.length; cz /= pts.length;
    const base = Math.max(0.5, heightAt(cx, cz)) - 2; const y0 = base + mh, y1 = base + h;
    // orientation
    let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    if (a < 0) pts.reverse();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      if (pyr) { // pyramid (Transamerica): taper to apex
        pos.push(p[0], y0, p[1], cx, y1, cz, q[0], y0, q[1]);
      } else { pos.push(p[0], y0, p[1], q[0], y0, q[1], q[0], y1, q[1], p[0], y0, p[1], q[0], y1, q[1], p[0], y1, p[1]); }
    }
    if (!pyr) { for (let i = 1; i < pts.length - 1; i++) pos.push(pts[0][0], y1, pts[0][1], pts[i + 1][0], y1, pts[i + 1][1], pts[i][0], y1, pts[i][1]); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  // fix winding-independent normals for walls (flat shading)
  const ng = g.toNonIndexed(); ng.computeVertexNormals();
  const m = new THREE.Mesh(ng, cityMaterial()); m.name = 'skyline'; m.frustumCulled = true; return m;
}
function tube(a, b, r, seg = 6) { const d = new THREE.Vector3().subVectors(b, a); const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1); g.translate(0, d.length() / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g.toNonIndexed(); }
function box(cx, cy, cz, sx, sy, sz, yaw) { const g = new THREE.BoxGeometry(sx, sy, sz); g.rotateY(yaw); g.translate(cx, cy, cz); return g.toNonIndexed(); }
function merge(list) { let n = 0; for (const g of list) n += g.attributes.position.count; const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0; for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.computeBoundingSphere(); return g; }
// suspension bridge between deck ends A->B (x,z), towers at fractions, heights above water
function suspension({ A, B, towers, towerH, deckH, deckW = 27, sag = 0.85, color, anchorsAt = [0, 1] }) {
  const a = new THREE.Vector3(A[0], 0, A[1]), b = new THREE.Vector3(B[0], 0, B[1]); const dir = b.clone().sub(a); const L = dir.length(); dir.normalize();
  const yaw = Math.atan2(dir.x, dir.z); const side = new THREE.Vector3(dir.z, 0, -dir.x);
  const at = (t) => a.clone().addScaledVector(dir, t * L);
  const parts = [];
  // deck (box segments)
  const segN = Math.ceil(L / 60);
  for (let i = 0; i < segN; i++) { const p = at((i + 0.5) / segN); parts.push(box(p.x, deckH - 3, p.z, 30, 6, L / segN + 0.5, yaw).clone()); }
  // towers: two legs + portals
  const tps = towers.map((t) => at(t));
  for (const tp of tps) {
    for (const s of [-1, 1]) { const leg = tp.clone().addScaledVector(side, s * deckW / 2); parts.push(box(leg.x, towerH / 2, leg.z, 9, towerH, 11, yaw)); }
    for (const h of [deckH + 25, towerH * 0.62, towerH * 0.82, towerH - 6]) parts.push(box(tp.x, h, tp.z, deckW + 6, 6, 7, yaw + Math.PI / 2 * 0).clone().applyMatrix4(new THREE.Matrix4()));
  }
  // main cables: catenary-ish between towers, straight to anchorages
  const cable = [];
  for (const s of [-1, 1]) {
    const off = side.clone().multiplyScalar(s * deckW / 2);
    const pts = [];
    const ends = [at(anchorsAt[0]).add(off).setY(deckH + 2), ...tps.map((t) => t.clone().add(off).setY(towerH - 3)), at(anchorsAt[1]).add(off).setY(deckH + 2)];
    for (let k = 0; k < ends.length - 1; k++) {
      const p0 = ends[k], p1 = ends[k + 1]; const span = k > 0 && k < ends.length - 2; const n = span ? 24 : 6;
      for (let i = 0; i <= n; i++) { const t = i / n; const p = p0.clone().lerp(p1, t); if (span) p.y = p.y - (towerH - deckH - 6) * sag * (1 - (2 * t - 1) ** 2); pts.push(p); }
    }
    for (let i = 0; i < pts.length - 1; i++) cable.push(tube(pts[i], pts[i + 1], 1.4, 5));
    // vertical suspenders every ~30 m (thin; visible as texture at distance)
  }
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.3 });
  const g = merge([...parts.map((p) => (p.attributes.normal ? p : (p.computeVertexNormals(), p))), ...cable]);
  const mesh = new THREE.Mesh(g, mat);
  // night lights along the deck & tower tops
  const lp = [];
  for (let i = 0; i <= 60; i++) { const p = at(i / 60); for (const s of [-1, 1]) { const q = p.clone().addScaledVector(side, s * 14); lp.push(q.x, deckH + 3, q.z); } }
  const red = []; for (const tp of tps) red.push(tp.x, towerH + 2, tp.z);
  return { mesh, lights: lp, red, at, dir, side, L, yaw };
}
export function buildBridges() {
  const group = new THREE.Group(); group.name = 'bridges';
  const gg = suspension({ A: [-19245, 7106], B: [-19604, 4436], towers: [0.30, 0.775], towerH: 227, deckH: 67, color: 0xc0362c, sag: 0.9, anchorsAt: [0.17, 0.9] });
  group.add(gg.mesh);
  const bw1 = suspension({ A: [-9630, 7104], B: [-10661, 8318], towers: [0.22, 0.78], towerH: 158, deckH: 58, color: 0x9aa3a8, sag: 0.85 });
  const bw2 = suspension({ A: [-10661, 8318], B: [-11692, 9532], towers: [0.22, 0.78], towerH: 158, deckH: 58, color: 0x9aa3a8, sag: 0.85 });
  group.add(bw1.mesh, bw2.mesh);
  // East span: self-anchored suspension tower + skyway viaduct
  const parts = []; const A = new THREE.Vector3(-9028, 0, 6403), B = new THREE.Vector3(-6152, 0, 5537); const d = B.clone().sub(A); const L = d.length(); const dir = d.clone().normalize(); const yaw = Math.atan2(dir.x, dir.z);
  for (let i = 0; i < 48; i++) { const t = (i + 0.5) / 48; const p = A.clone().addScaledVector(dir, t * L); const h = t < 0.22 ? 48 : 48 - (t - 0.22) / 0.78 * 38; parts.push(box(p.x, h, p.z, 52, 4, L / 48 + 1, yaw)); parts.push(box(p.x, h / 2, p.z, 6, h, 6, yaw)); }
  const tp = A.clone().addScaledVector(dir, 0.08 * L);
  parts.push(box(tp.x, 80, tp.z, 8, 160, 8, yaw));
  for (let k = -6; k <= 6; k++) { if (!k) continue; const p = A.clone().addScaledVector(dir, (0.08 + k * 0.012) * L); parts.push(tube(new THREE.Vector3(tp.x, 150, tp.z), new THREE.Vector3(p.x, 50, p.z), 0.8, 4)); }
  for (const p of parts) if (!p.attributes.normal) p.computeVertexNormals();
  const east = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.5, metalness: 0.2 })); group.add(east);
  // lights
  const lp = [...gg.lights, ...bw1.lights, ...bw2.lights];
  for (let i = 0; i <= 60; i++) { const t = i / 60; const p = A.clone().addScaledVector(dir, t * L); const h = t < 0.22 ? 50 : 50 - (t - 0.22) / 0.78 * 38; lp.push(p.x, h + 2, p.z); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const lmat = new THREE.PointsMaterial({ color: 0xffe2a8, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const lights = new THREE.Points(lg, lmat); group.add(lights);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute([...gg.red, ...bw1.red, ...bw2.red, tp.x, 162, tp.z], 3));
  const rmat = new THREE.PointsMaterial({ color: 0xff2a1a, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const red = new THREE.Points(rg, rmat); group.add(red);
  // The Bay Lights: LED points on the West Span's vertical cables
  const bl = []; for (const s of [bw1, bw2]) { for (let i = 0; i <= 160; i++) { const t = i / 160; const p = s.at(t); for (let y = 0; y < 6; y++) bl.push(p.x, 62 + y * 12 * (1 - Math.abs(2 * ((t * 2) % 1) - 1)), p.z); } }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bl, 3));
  const bmat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: U.uTime, uNight: U.uNight }, vertexShader: 'uniform float uTime; varying float vA; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = 2.0; vA = 0.5+0.5*sin(position.x*0.02 + position.z*0.017 - uTime*1.7); }', fragmentShader: 'uniform float uNight; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.95,0.97,1.0)*vA, vA*uNight); }' });
  const bayLights = new THREE.Points(bg, bmat); group.add(bayLights);
  return { group, update(night) { lmat.opacity = night; rmat.opacity = Math.max(0.15, night) * (0.6 + 0.4 * Math.sin(performance.now() * 0.004)); } };
}
