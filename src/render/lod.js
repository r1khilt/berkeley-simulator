// [r7-lod] Screen-size level of detail, shared by terrain, mid-city, trees, props, fleets and landmark details.
// Everything here is driven by one number: K = pixels per metre at 1 m distance (drawing-buffer height / (2 tan(fov/2))),
// so a feature of size s metres at distance d covers about s * K / d pixels. Each system picks the coarsest
// representation whose error / size stays under its pixel threshold multiplied by LOD.bias:
//   bias = tier bias (soft 2, low 1.5, medium 1.25, high 1, ultra 0.75) x governor bias (1, or 1.6 when its 'lodBias' rung
//   is on). Larger bias = coarser sooner. ?lodbias=<k> overrides the tier bias for testing; ?lod=0 restores the old
//   fixed-distance behaviour everywhere (for A/B screenshots).
import * as THREE from 'three';
const qs = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const LOD = {
  on: qs.get('lod') !== '0',
  K: 600,            // px per metre at 1 m (updated every frame)
  tierBias: 1, govBias: 1,
  get bias() { return this.tierBias * this.govBias; },
  // per-tier defaults; call once at boot
  setTier(quality, soft) {
    this.tierBias = soft ? 2 : ({ low: 1.5, medium: 1.25, high: 1, ultra: 0.75 }[quality] ?? 1);
    if (qs.get('lodbias')) this.tierBias = +qs.get('lodbias') || this.tierBias;
    this.soft = !!soft; this.quality = quality;
  },
  // once per frame, before the systems update: effective drawing-buffer height (post render scale included)
  update(renderer, camera, scale = 1) {
    const h = renderer.domElement.height * scale;
    this.K = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
    this.U.uFacFarD.value = this.on ? this.distFor(5, 10) : 1e9;
  },
  // shared uniforms: uFacFarD = soft-tier facade split distance (a 5 m bay ~10 px: where the full facade has already faded
  // its windows to the averaged far look)
  U: { uFacFarD: { value: 1e9 } },
  // distance at which a feature of `size` metres shrinks to `px` pixels (x bias)
  distFor(size, px) { return (size * this.K) / (px * this.bias); },
};

// ---------------------------------------------------------------- landmark fine details
// Hand-built landmarks are merged per material at load (landmarks.js mergeStatic). [r7-lod] splits that merge by size
// class first, so the tiny parts land in their own meshes and can drop out by projected size:
//   class 2 'thin':    second-largest extent < 0.3 m and longest < 6 m (mullions, rails, rods, short mouldings);
//   class 1 'compact': every extent < 1.2 m (finials, urns, lamps, brackets, small ornaments);
//   class 0:           everything else (walls, roofs, cornices and long trims that carry the silhouette) never drops.
// A fine mesh hides once its size covers fewer than ~0.75 px (x LOD.bias) at the distance of its nearest point.
const _b = new THREE.Box3(), _m4 = new THREE.Matrix4(), _vp = new THREE.Vector3();
export function lodClassOf(o, inv) {
  const g = o.geometry; if (!g || !g.attributes.position) return 0;
  if (!g.boundingBox) g.computeBoundingBox(); if (!g.boundingBox || g.boundingBox.isEmpty()) return 0;
  _b.copy(g.boundingBox).applyMatrix4(inv ? _m4.multiplyMatrices(inv, o.matrixWorld) : o.matrixWorld);
  const e = [_b.max.x - _b.min.x, _b.max.y - _b.min.y, _b.max.z - _b.min.z].sort((a, b) => a - b);
  const c = e[1] < 0.3 && e[2] < 6 ? 2 : e[2] < 1.2 ? 1 : 0;
  o.userData.lodSize = c === 2 ? Math.max(e[1], 0.05) : c === 1 ? Math.max(e[2] * 0.5, 0.05) : 0; // visible size (m)
  return c;
}
LOD.landmarkDetail = function (placed, camera) {
  if (!this.on) return;
  const cp = camera.position, k = this.K / (0.75 * this.bias);
  for (const l of placed) {
    if (!l.obj) continue;
    if (l._lodObj !== l.obj) { // collect once per loaded object
      l._lodObj = l.obj; l._fine = [];
      l.obj.updateMatrixWorld(true);
      l.obj.traverse((o) => { if (o.isInstancedMesh && o.userData.lodSize === undefined && !l.res?.update) lodClassOf(o, null); // instanced parts: by instance size
        if (!o.isMesh || o.isSkinnedMesh || !(o.userData.lodSize > 0)) return; let p = o.parent; while (p && p !== l.obj) { if (p.userData && (p.userData.detail || p.userData.keep)) return; p = p.parent; }
        if (o.isInstancedMesh) { if (!o.boundingBox) o.computeBoundingBox(); } else if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const box = (o.isInstancedMesh ? o.boundingBox : o.geometry.boundingBox).clone().applyMatrix4(o.matrixWorld);
        l._fine.push({ o, box, s: o.userData.lodSize }); });
    }
    for (const f of l._fine) f.o.visible = f.s * k > f.box.distanceToPoint(_vp.copy(cp));
  }
};

// ---------------------------------------------------------------- far geometry by vertex clustering
// Rossignac-Borrel clustering: vertices snap to a grid of `cells` steps along each bounding-box axis (thin axes keep
// their own resolution, so a 15 cm pole keeps a square-ish section rather than collapsing), each cluster becomes one vertex
// (position averaged, normal re-normalised, other attributes from its first member) and triangles that collapse are
// dropped. Good for props that are a few dozen pixels tall or less; returns null when it would save < 35%.
export function clusterSimplify(geo, cells = 8) {
  const pos = geo.attributes.position; if (!pos || pos.count < 24) return null;
  if (!geo.boundingBox) geo.computeBoundingBox(); const bb = geo.boundingBox;
  const ext = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z]; const big = Math.max(...ext, 1e-4);
  const cs = ext.map((e) => Math.max(e / cells, 1e-4)); // per-axis: a thin pole keeps its own cross-section cells (grid splits at the box centre)
  const idx = geo.index ? geo.index.array : null, nTri = (idx ? idx.length : pos.count) / 3;
  const key = new Map(), remap = new Int32Array(pos.count), first = [], sum = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = Math.floor((x - bb.min.x) / cs[0]) + ',' + Math.floor((y - bb.min.y) / cs[1]) + ',' + Math.floor((z - bb.min.z) / cs[2]);
    let c = key.get(k); if (c === undefined) { c = first.length; key.set(k, c); first.push(i); sum.push([0, 0, 0, 0]); }
    const s = sum[c]; s[0] += x; s[1] += y; s[2] += z; s[3]++; remap[i] = c;
  }
  const out = [], seen = new Set();
  for (let t = 0; t < nTri; t++) {
    const a = remap[idx ? idx[t * 3] : t * 3], b = remap[idx ? idx[t * 3 + 1] : t * 3 + 1], c = remap[idx ? idx[t * 3 + 2] : t * 3 + 2];
    if (a === b || b === c || a === c) continue;
    const k = a < b && a < c ? a + ',' + b + ',' + c : b < c ? b + ',' + c + ',' + a : c + ',' + a + ',' + b; // same triangle, same winding
    if (seen.has(k)) continue; seen.add(k); out.push(a, b, c);
  }
  if (out.length / 3 > nTri * 0.65 || out.length < 3) return null;
  const n = first.length, g = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geo.attributes)) {
    if (attr.isInterleavedBufferAttribute) return null;
    const isz = attr.itemSize, arr = new (attr.array.constructor)(n * isz);
    for (let c = 0; c < n; c++) for (let j = 0; j < isz; j++) arr[c * isz + j] = attr.array[first[c] * isz + j];
    if (name === 'position') for (let c = 0; c < n; c++) { const s = sum[c]; arr[c * 3] = s[0] / s[3]; arr[c * 3 + 1] = s[1] / s[3]; arr[c * 3 + 2] = s[2] / s[3]; }
    g.setAttribute(name, new THREE.BufferAttribute(arr, isz, attr.normalized));
  }
  if (geo.attributes.normal) { // averaged normals of each cluster's members
    const nr = geo.attributes.normal, acc = new Float32Array(n * 3);
    for (let i = 0; i < pos.count; i++) { const c = remap[i]; acc[c * 3] += nr.getX(i); acc[c * 3 + 1] += nr.getY(i); acc[c * 3 + 2] += nr.getZ(i); }
    for (let c = 0; c < n; c++) { const l = Math.hypot(acc[c * 3], acc[c * 3 + 1], acc[c * 3 + 2]) || 1; acc[c * 3] /= l; acc[c * 3 + 1] /= l; acc[c * 3 + 2] /= l; }
    g.setAttribute('normal', new THREE.BufferAttribute(acc, 3));
  }
  g.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(out, 1) : new THREE.Uint16BufferAttribute(out, 1));
  g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.lodFrom = nTri; return g;
}

// [r7-lod] static far geometry that nothing reads back on the CPU (mid-city blocks, ring tiles): free the JS-side copies
// once WebGL has them (same pattern as the r6 shadow proxies). Bounds must already be computed; they are frozen.
export function gpuOnly(g) {
  if (!g.boundingSphere) g.computeBoundingSphere(); if (!g.boundingBox) g.computeBoundingBox();
  const free = function () { this.array = null; };
  for (const a of Object.values(g.attributes)) a.onUpload(free); if (g.index) g.index.onUpload(free);
  g.computeBoundingBox = g.computeBoundingSphere = () => {};
  return g;
}
