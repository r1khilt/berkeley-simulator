// Small geometry kit shared by the Sather Tower, Sather Gate and Ludwig's Fountain modules.
// Everything is built in a landmark-aligned frame and baked into local coordinates at the end,
// so the returned root object keeps an identity transform (as the engine expects).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

// Collects triangle soups per material and merges them into one mesh per material.
export class Bucket {
  constructor(boxUV) { this.boxUV = boxUV; this.parts = new Map(); }
  // geom: any BufferGeometry in the build frame. uv:'box' projects metre UVs; uv:'keep' keeps its own UVs.
  // smooth:true keeps the geometry's own (smooth) normals; otherwise faces are flat-shaded.
  add(mat, geom, { uv = 'box', matrix = null, smooth = false } = {}) {
    let g = geom.index ? geom.toNonIndexed() : geom.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (uv === 'box' || !g.attributes.uv) { if (!smooth || !g.attributes.normal) g.deleteAttribute('normal'); g = this.boxUV(g); }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    return this;
  }
  // Merge into meshes, bake `frame` (Matrix4) and add them to `parent`.
  flush(parent, frame, { detail = false, name = '' } = {}) {
    const meshes = [];
    for (const [mat, list] of this.parts) {
      if (!list.length) continue;
      const g = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (frame) g.applyMatrix4(frame);
      g.computeBoundingBox(); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.name = name + (mat.name || '');
      if (detail) m.userData.detail = true;
      parent.add(m); meshes.push(m);
    }
    this.parts.clear();
    return meshes;
  }
}

// Triangle-soup writer that orients each face toward a hint direction (robust winding).
export class Soup {
  constructor() { this.p = []; }
  tri(a, b, c, hint) {
    if (hint) {
      _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _b.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      _c.crossVectors(_a, _b);
      if (_c.x * hint[0] + _c.y * hint[1] + _c.z * hint[2] < 0) { const t = b; b = c; c = t; }
    }
    this.p.push(...a, ...b, ...c);
  }
  quad(a, b, c, d, hint) { this.tri(a, b, c, hint); this.tri(a, c, d, hint); }
  poly(pts, hint) { for (let i = 1; i < pts.length - 1; i++) this.tri(pts[0], pts[i], pts[i + 1], hint); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.computeVertexNormals();
    return g;
  }
}

// Solid square "lathe": rings of half-widths [hx, hz] at heights y (bottom → top), closed with caps.
// profile: [[y, hw], ...] or [[y, hx, hz], ...]. cx/cz offset the centre.
export function squareLathe(profile, { cx = 0, cz = 0, capBottom = true, capTop = true } = {}) {
  const s = new Soup();
  const ring = (r) => { const y = r[0], hx = r[1], hz = r.length > 2 ? r[2] : r[1]; return [[cx - hx, y, cz - hz], [cx + hx, y, cz - hz], [cx + hx, y, cz + hz], [cx - hx, y, cz + hz]]; };
  const outs = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
  for (let k = 0; k < profile.length - 1; k++) {
    const A = ring(profile[k]), B = ring(profile[k + 1]);
    if (Math.abs(profile[k][0] - profile[k + 1][0]) < 1e-6 && Math.abs(profile[k][1] - profile[k + 1][1]) < 1e-6) continue;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const flat = Math.abs(profile[k][0] - profile[k + 1][0]) < 1e-6; // horizontal step (ledge / soffit)
      const hint = flat ? [0, (profile[k + 1][1] < profile[k][1]) ? 1 : -1, 0] : outs[i];
      s.quad(A[i], A[j], B[j], B[i], hint);
    }
  }
  if (capBottom) s.poly(ring(profile[0]), [0, -1, 0]);
  if (capTop) s.poly(ring(profile[profile.length - 1]), [0, 1, 0]);
  return s.geometry();
}

// Axis-aligned box from min/max corners.
export function boxMM(x0, y0, z0, x1, y1, z1) {
  return new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
// Box centred at (x,y,z) with size (w,h,d).
export function boxC(x, y, z, w, h, d) { return new THREE.BoxGeometry(w, h, d).translate(x, y, z); }

// Extrude a closed 2-D outline (in X/Y) along +Z by depth; holes allowed. Returns geometry with UVs dropped.
export function extrudeShape(outline, holes = [], depth = 0.1, curveSegments = 12) {
  const sh = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) sh.holes.push(h instanceof THREE.Path ? h : new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments });
}

// Round-arched opening outline (counter-clockwise), from sill y0 up to the crown, springing at ys.
export function archPts(x0, x1, y0, ys, segs = 10) {
  const r = (x1 - x0) / 2, cx = (x0 + x1) / 2, pts = [[x0, y0], [x1, y0], [x1, ys]];
  for (let i = 1; i < segs; i++) { const t = (i / segs) * Math.PI; pts.push([cx + r * Math.cos(t), ys + r * Math.sin(t)]); }
  pts.push([x0, ys]);
  return pts;
}

// Generic lathe from [radius, y] pairs.
export function lathe(profile, segs = 12) { return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), segs); }

// Classical baluster (vase) of height h, max radius r, centred on the origin at y=0..h.
export function baluster(h, r, segs = 8) {
  const P = [[0.0, 0], [r * 0.95, 0], [r * 0.95, 0.09], [r * 0.7, 0.13], [r * 0.62, 0.2], [r * 0.98, 0.38], [r * 0.9, 0.5], [r * 0.45, 0.68], [r * 0.38, 0.76], [r * 0.6, 0.8], [r * 0.6, 0.86], [r * 0.95, 0.9], [r * 0.95, 1.0], [0.0, 1.0]];
  return lathe(P.map(([a, b]) => [a, b * h]), segs);
}

// Instanced mesh helper: matrices are composed with an optional frame matrix.
export function instanced(geom, mat, matrices, frame, { detail = false, shadow = true } = {}) {
  const im = new THREE.InstancedMesh(geom, mat, matrices.length);
  const m = new THREE.Matrix4();
  matrices.forEach((mm, i) => { m.copy(mm); if (frame) m.premultiply(frame); im.setMatrixAt(i, m); });
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingBox?.(); im.computeBoundingSphere?.();
  if (detail) im.userData.detail = true;
  im.castShadow = shadow; im.receiveShadow = true;
  return im;
}

export const M4 = () => new THREE.Matrix4();
export function trs(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
  return m;
}

// Frame transform: rotate by `rotY` (radians, three.js convention) and translate to (x, 0, z).
export function frameMatrix(x, z, rotY, y = 0) {
  return new THREE.Matrix4().makeRotationY(rotY).setPosition(x, y, z);
}
// Map a frame-space point [u, y, v] to local [x, y, z].
export function toLocal(frame, u, y, v) { const p = new THREE.Vector3(u, y, v).applyMatrix4(frame); return [p.x, p.y, p.z]; }
// Map a frame-space rectangle (u0..u1, v0..v1) to a local-coordinate polygon [[x,z],...].
export function rectPoly(frame, u0, v0, u1, v1) {
  return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => { const p = toLocal(frame, u, 0, v); return [+p[0].toFixed(3), +p[2].toFixed(3)]; });
}
