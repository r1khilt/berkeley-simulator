// gw-kit: helpers for The Gateway (Bakar Gateway, 2026): staggered metal-panel curtain wall, flush ribbon glazing,
// recessed colonnade base, draped ground surfaces, ring utilities. Built on classic-kit's Kit (u = x, v = z, run-local
// coords: x along the run, y up, z outward).
import * as THREE from 'three';
import { U } from '../../materials.js';

export const lerp = (a, b, t) => a + (b - a) * t;
export const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

export function signedArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
export function inRing(x, z, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; }
export function distToRing(x, z, r) { let d = Infinity; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; const dx = b[0] - a[0], dz = b[1] - a[1]; const L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); d = Math.min(d, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return d; }

// Intersections of a ring with the line x = v (axis 'x') or z = v (axis 'z'): [{p:[x,z], i (edge index), t}]
export function ringHits(ring, axis, v) {
  const out = []; const k = axis === 'x' ? 0 : 1;
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; if ((a[k] - v) * (b[k] - v) > 0 || a[k] === b[k]) continue; const t = (v - a[k]) / (b[k] - a[k]); out.push({ p: [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], i, t }); }
  return out;
}
export function nearestHit(hits, near) { let best = null, bd = Infinity; for (const h of hits) { const d = Math.hypot(h.p[0] - near[0], h.p[1] - near[1]); if (d < bd) { bd = d; best = h; } } return best; }
// Walk the ring from hit A to hit B in index order: returns A, ring[A.i+1 .. B.i], B
export function ringPath(ring, A, B) {
  const n = ring.length; const out = [A.p]; let i = (A.i + 1) % n; let guard = 0;
  if (!(A.i === B.i && B.t > A.t)) { while (guard++ < n + 2) { out.push(ring[i]); if (i === B.i) break; i = (i + 1) % n; } }
  out.push(B.p); return out;
}

// Points on a parabolic sag between chord endpoints p0,p1, displaced by `sag` along unit normal nrm at mid-chord.
export function sagArc(p0, p1, sag, nrm, seg = 10) {
  const out = []; for (let i = 0; i <= seg; i++) { const t = i / seg; const k = 1 - (2 * t - 1) ** 2; out.push([lerp(p0[0], p1[0], t) + nrm[0] * sag * k, lerp(p0[1], p1[1], t) + nrm[1] * sag * k]); }
  return out;
}

// Subdivided, terrain-draped polygon (holes ok); lift above ground; maxEdge controls tessellation.
export function drape(K, mat, poly, lift = 0.04, maxEdge = 2.5, holes = [], { yFn = null, detail = false, down = false } = {}) {
  const s = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, z)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, z))));
  const sg = new THREE.ShapeGeometry(s); const pos = sg.attributes.position; const idx = sg.index ? sg.index.array : null;
  let tris = []; const nT = idx ? idx.length / 3 : pos.count / 3;
  for (let t = 0; t < nT; t++) { const v = [0, 1, 2].map((k) => { const j = idx ? idx[t * 3 + k] : t * 3 + k; return [pos.getX(j), pos.getY(j)]; }); tris.push(v); }
  for (let pass = 0; pass < 10; pass++) {
    const nt = []; let split = false;
    for (const [a, b, c] of tris) {
      const ab = Math.hypot(a[0] - b[0], a[1] - b[1]), bc = Math.hypot(b[0] - c[0], b[1] - c[1]), ca = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const m = Math.max(ab, bc, ca);
      if (m <= maxEdge) { nt.push([a, b, c]); continue; } split = true;
      if (m === ab) { const p = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; nt.push([a, p, c], [p, b, c]); }
      else if (m === bc) { const p = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2]; nt.push([a, b, p], [a, p, c]); }
      else { const p = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2]; nt.push([a, b, p], [p, b, c]); }
    }
    tris = nt; if (!split) break;
  }
  const out = []; const Y = yFn || ((x, z) => K.ctx.groundAt(x, z) + lift);
  for (const [a, b, c] of tris) {
    // decide winding so the face points up
    const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const P = (cr > 0) !== down ? [a, c, b] : [a, b, c];
    for (const p of P) out.push(p[0], Y(p[0], p[1]), p[1]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  const uv = new Float32Array(out.length / 3 * 2); for (let i = 0; i < out.length / 3; i++) { uv[i * 2] = out[i * 3] * 0.5; uv[i * 2 + 1] = out[i * 3 + 2] * 0.5; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals();
  return K.add(mat, g, { uvMode: 'keep', detail });
}

// Bowed (convex) vertical metal panel in run-local coords: width w centred at s, from y0..y1, base plane d0, crown d0+dep.
// Smooth normals across the bow so it catches raking light like the real anodised panels.
export function bowPanel(s, w, y0, y1, d0, dep, seg = 4) {
  const P = [], N = []; const A = Math.PI * 0.42;
  for (let i = 0; i <= seg; i++) { const t = i / seg; const a = (t - 0.5) * 2 * A; const x = s + Math.sin(a) / Math.sin(A) * w / 2; const z = d0 + (Math.cos(a) - Math.cos(A)) / (1 - Math.cos(A)) * dep; P.push([x, z]); N.push([Math.sin(a), Math.cos(a)]); }
  const pos = [], nor = [], uv = [];
  for (let i = 0; i < seg; i++) {
    const [x0, z0] = P[i], [x1, z1] = P[i + 1], [n0x, n0z] = N[i], [n1x, n1z] = N[i + 1];
    pos.push(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y0, z0, x1, y1, z1, x0, y1, z0);
    nor.push(n0x, 0, n0z, n1x, 0, n1z, n1x, 0, n1z, n0x, 0, n0z, n1x, 0, n1z, n0x, 0, n0z);
    const u0 = i / seg * 0.3, u1 = (i + 1) / seg * 0.3; uv.push(u0, y0 * 0.5, u1, y0 * 0.5, u1, y1 * 0.5, u0, y0 * 0.5, u1, y1 * 0.5, u0, y1 * 0.5);
  }
  for (const [yy, up] of [[y0, -1], [y1, 1]]) for (let i = 1; i < seg; i++) {
    const a = P[0], b = P[i], c = P[i + 1];
    if (up > 0) pos.push(a[0], yy, a[1], c[0], yy, c[1], b[0], yy, b[1]); else pos.push(a[0], yy, a[1], b[0], yy, b[1], c[0], yy, c[1]);
    nor.push(0, up, 0, 0, up, 0, 0, up, 0); uv.push(0, 0, 0.1, 0, 0.05, 0.1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// Subtract [a,b] intervals from [s0,s1]
export function cutRanges(s0, s1, cuts) { let segs = [[s0, s1]]; for (const [a, b] of cuts) { const ns = []; for (const [p, q] of segs) { if (b <= p || a >= q) { ns.push([p, q]); continue; } if (a > p) ns.push([p, a]); if (b < q) ns.push([b, q]); } segs = ns; } return segs.filter(([p, q]) => q - p > 0.05); }

// The Gateway's signature outer wall for one storey [ya, yb] (floor line at ya): vision glass, etched spandrel at the sill,
// a dark slab band, and bowed champagne-aluminium panels on a 1.5 m module, shifted half a module on alternate floors
// (with occasional doubled panels): "alternating metal panels and glazing", about half glass.
export function panelStorey(K, R, s0, s1, ya, yb, k, mats, o = {}) {
  const W = o.module ?? 1.5, pw = o.panelW ?? 0.42, dep = o.panelD ?? 0.36; const L = s1 - s0; if (L < 0.4) return;
  K.rbox(R, mats.glass, s0, ya, -0.2, s1, yb, -0.14);
  K.rbox(R, mats.spandrel, s0, ya, -0.14, s1, ya + 0.55, -0.125);
  K.rbox(R, mats.band, s0 - 0.01, ya - 0.22, -0.16, s1 + 0.01, ya + 0.03, 0.03);
  K.rbox(R, mats.mull, s0, ya + (yb - ya) * 0.74 - 0.04, -0.14, s1, ya + (yb - ya) * 0.74 + 0.04, -0.08, { detail: true });
  const n = Math.max(1, Math.round(L / W)); const w = L / n; const off = (k % 2) ? 0.5 : 0.0;
  const g = [];
  for (let i = -1; i < n + 1; i++) {
    const s = s0 + (i + off + 0.25) * w; if (s - pw / 2 < s0 - 0.01 || s + pw / 2 > s1 + 0.01) continue;
    const h = hash(i + Math.round(R.a[0] * 7), k + Math.round(R.a[1] * 3));
    g.push(bowPanel(s, pw, ya + 0.08, yb - 0.32, -0.15, dep));
    if (h > 0.8 && s + pw * 1.6 < s1) g.push(bowPanel(s + pw + 0.05, pw, ya + 0.08, yb - 0.32, -0.15, dep));
    if (o.mullions !== false) K.rbox(R, mats.mull, s + w / 2 - 0.03, ya + 0.08, -0.14, s + w / 2 + 0.03, yb - 0.42, -0.09, { detail: true });
  }
  for (const gg of g) K.addRun(R, mats.metal, gg, { uvMode: 'keep' });
}

// Flush ribbon curtain wall (courtyard faces): glass, silver mullion caps on the module, dark spandrel band at each slab.
export function ribbonStorey(K, R, s0, s1, ya, yb, mats, o = {}) {
  const W = o.module ?? 1.5; const L = s1 - s0; if (L < 0.3) return;
  K.rbox(R, mats.glass, s0, ya, -0.12, s1, yb, -0.06);
  K.rbox(R, mats.spandrel, s0 - 0.01, ya - 0.25, -0.07, s1 + 0.01, ya + 0.25, 0.0);
  K.rbox(R, mats.silver, s0 - 0.01, ya - 0.27, 0.0, s1 + 0.01, ya - 0.21, 0.05);
  const n = Math.max(1, Math.round(L / W)); const w = L / n;
  for (let i = 0; i <= n; i++) { const s = s0 + i * w; K.rbox(R, mats.silver, s - 0.04, ya + 0.25, -0.06, s + 0.04, yb - 0.25, 0.08, { detail: !(i === 0 || i === n) }); }
  K.rbox(R, mats.silver, s0, ya + (yb - ya) * 0.72 - 0.03, -0.06, s1, ya + (yb - ya) * 0.72 + 0.03, 0.03, { detail: true });
}

// Recessed full-height storefront base between yBot..yTop, glass at depth -rec, mullions on the module, soffit strip, optional columns.
export function storefront(K, R, s0, s1, yBot, yTop, mats, o = {}) {
  const rec = o.rec ?? 1.9; const W = o.module ?? 1.5; const L = s1 - s0; if (L < 0.3) return [];
  K.rbox(R, o.glass || mats.glassLow, s0, yBot, -rec - 0.08, s1, yTop, -rec);
  const n = Math.max(1, Math.round(L / W)); const w = L / n;
  for (let i = 0; i <= n; i++) { const s = s0 + i * w; K.rbox(R, mats.frame, s - 0.04, yBot, -rec, s + 0.04, yTop, -rec + 0.1, { detail: !(i === 0 || i === n) }); }
  for (const ty of o.transoms || []) if (ty > yBot + 0.3 && ty < yTop - 0.3) K.rbox(R, mats.frame, s0, ty - 0.05, -rec, s1, ty + 0.05, -rec + 0.1);
  if (rec > 0.3) { const g = new THREE.PlaneGeometry(L, rec); g.rotateX(Math.PI / 2); g.translate((s0 + s1) / 2, yTop, -rec / 2); K.addRun(R, mats.soffit, g); }
  const cols = [];
  if (o.colPitch) {
    const nc = Math.max(1, Math.round(L / o.colPitch)); const cw = L / nc;
    for (let i = 0; i <= nc; i++) { if ((i === 0 && o.skipStart) || (i === nc && o.skipEnd)) continue; const s = s0 + i * cw; const cg = new THREE.CylinderGeometry(0.24, 0.24, yTop - yBot, 14); cg.translate(s, (yTop + yBot) / 2, -0.55); K.addRun(R, mats.column, cg); cols.push(R.at(s, -0.55)); }
  }
  return cols;
}

// Simple young street/courtyard tree (trunk + two-lobed crown), local coords
export function youngTree(K, mats, x, y, z, h = 6, r = 2.0, seed = 0) {
  K.cyl(mats.trunk, x, y - 0.3, z, 0.13, 0.09, h * 0.55 + 0.3, 6);
  const a = new THREE.IcosahedronGeometry(r, 1); a.scale(1, 0.85, 1); a.translate(x, y + h - r * 0.9, z); K.add(mats.leaf, a, { uvMode: 'keep' });
  const b = new THREE.IcosahedronGeometry(r * 0.7, 1); b.translate(x + (hash(seed, 1) - 0.5) * r, y + h - r * 1.5, z + (hash(seed, 2) - 0.5) * r); K.add(mats.leaf, b, { uvMode: 'keep' });
}

// Canvas-text sign material: light brushed-aluminium letters on the dark fascia colour (opaque, so no alpha dropout)
export function signMaterial(text, { w = 2048, h = 100, bg = '#4a4642', color = '#f3f2ec', font = '700 70px Helvetica, Arial, sans-serif', spacing = 9 } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = color; g.font = font; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = spacing + 'px';
  const tw = g.measureText(text).width; g.fillText(text, (w - tw) / 2, h / 2 + 3);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.35, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12 }); m.name = 'gwSign';
  return m;
}

// Ground-level hardscape sits on the terrain: opt it out of the engine's contact-AO (which halves indirect light within ~2 m of
// the terrain and is meant for walls), using the same cache-key exclusion the engine applies to its own ground materials.
export function groundMat(m) { const k = m.name || 'gw'; m.customProgramCacheKey = () => k + '|ground-ring'; return m; }

// Irregular young tree crown (jittered icospheres) on a slim trunk
export function youngTree2(K, mats, x, y, z, h = 6, r = 2.0, seed = 0) {
  K.cyl(mats.trunk, x, y - 0.3, z, 0.12, 0.08, h * 0.6 + 0.3, 6);
  const lobes = [[0, h - r * 0.85, 0, r], [r * 0.45, h - r * 1.25, r * 0.2, r * 0.7], [-r * 0.4, h - r * 1.2, -r * 0.3, r * 0.72], [r * 0.1, h - r * 0.45, -r * 0.35, r * 0.6]];
  lobes.forEach(([dx, dy, dz, rr], li) => {
    const g = new THREE.IcosahedronGeometry(rr, 1); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const j = 0.82 + 0.36 * hash(i + li * 31 + seed * 7, seed + li); p.setXYZ(i, p.getX(i) * j, p.getY(i) * j * 0.9, p.getZ(i) * j); }
    g.computeVertexNormals(); g.translate(x + dx, y + dy, z + dz); K.add(li % 2 ? mats.leaf2 || mats.leaf : mats.leaf, g, { uvMode: 'keep' });
  });
}

// Offset a simple polygon by d (>0 inward, <0 outward) with mitre clamping (no spikes at sharp corners).
export function offsetPoly(poly, d, maxMiter = 2.0) {
  const n = poly.length; const sgn = signedArea(poly) > 0 ? 1 : -1;
  const N = poly.map((p, i) => { const q = poly[(i + 1) % n]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; const tx = (q[0] - p[0]) / L, tz = (q[1] - p[1]) / L; return sgn > 0 ? [tz, -tx] : [-tz, tx]; });
  const out = [];
  for (let i = 0; i < n; i++) {
    const n1 = N[(i - 1 + n) % n], n2 = N[i]; const p = poly[i];
    const dd = 1 + n1[0] * n2[0] + n1[1] * n2[1];
    let mx = (n1[0] + n2[0]) / Math.max(dd, 1e-6), mz = (n1[1] + n2[1]) / Math.max(dd, 1e-6);
    const m = Math.hypot(mx, mz);
    if (dd < 1e-3) { mx = n1[0]; mz = n1[1]; } else if (m > maxMiter) { mx *= maxMiter / m; mz *= maxMiter / m; } // clamp long mitres
    out.push([p[0] - d * mx, p[1] - d * mz]);
  }
  return out;
}

// Horizontal polygon at height y facing down (soffits), exact x/z (no mirroring)
export function flatDown(K, mat, poly, y, opts = {}) { return drape(K, mat, poly, 0, 1000, [], { yFn: () => y, down: true, ...opts }); }

// Campus trees from the engine's own procedural tree library (same look as the rest of campus) when running in the game;
// returns null in the harness (caller falls back to simple crowns). spec: [{x, y, z, h, r, sp, rot}] in local coords.
export function engineTrees(spec) {
  const lib = globalThis.BSIM && globalThis.BSIM.treeLib; if (!lib || !lib.species) return null;
  const group = new THREE.Group(); group.name = 'gw-trees'; const by = {};
  for (const t of spec) (by[t.sp] = by[t.sp] || []).push(t);
  for (const [sp, list] of Object.entries(by)) {
    const S = lib.species[sp] || lib.species.deciduous || Object.values(lib.species)[0]; if (!S) continue;
    const lod = S.lods[0]; const nr = S.normRadius || 0.5;
    for (const p of lod.parts) {
      const m = new THREE.InstancedMesh(p.geometry, p.material, list.length); m.name = 'gwTree:' + (p.material.name || sp);
      if (p.depthMaterial) m.customDepthMaterial = p.depthMaterial; if (p.distanceMaterial) m.customDistanceMaterial = p.distanceMaterial;
      m.castShadow = p.castShadow !== false; m.receiveShadow = true;
      list.forEach((t, i) => { const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot || 0); m.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(t.r / nr, t.h, t.r / nr))); m.setColorAt(i, new THREE.Color(t.tint || 0x4f6a35).convertSRGBToLinear()); });
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere();
      group.add(m);
    }
  }
  return group;
}

// Procedural "interior behind glass" map: per 1.5 m module, lit ceiling band, random blinds, darker room depth and furniture.
// UVs are boxUV metres/2; one tile = 4 modules (6 m) x one storey (floorH m), aligned to floor lines at y0.
export function interiorMap(floorH, y0, { seed = 1, blinds = 0.5 } = {}) {
  const W = 512, H = 448, NM = 8; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = '#b9bcbd'; g.fillRect(0, 0, W, H);
  for (let f = 0; f < 2; f++) {
    const yy = (m) => H - (f * floorH + m) / (2 * floorH) * H; // metres above this floor -> px
    for (let i = 0; i < NM; i++) {
      const x0 = i * W / NM, w = W / NM; const r = (k) => hash(i * 13 + f * 101 + seed * 7, k);
      const grd = g.createLinearGradient(0, yy(floorH - 0.6), 0, yy(0));
      const d = 138 + Math.floor(r(1) * 40); grd.addColorStop(0, `rgb(${d + 44},${d + 46},${d + 46})`); grd.addColorStop(0.35, `rgb(${d},${d + 3},${d + 6})`); grd.addColorStop(1, `rgb(${d - 34},${d - 31},${d - 28})`);
      g.fillStyle = grd; g.fillRect(x0, yy(floorH - 0.6), w, yy(0) - yy(floorH - 0.6));
      g.fillStyle = '#f4f2ec'; g.fillRect(x0, yy(floorH - 0.55), w, 6);
      if (r(2) < blinds) { const bh = 0.5 + r(3) * 2.4; g.fillStyle = r(4) < 0.5 ? '#e2e1dc' : '#cfd0cc'; g.fillRect(x0 + 2, yy(floorH - 0.6), w - 4, yy(floorH - 0.6 - bh) - yy(floorH - 0.6)); }
      if (r(5) < 0.55) { g.fillStyle = 'rgba(58,56,54,0.5)'; const fw = w * (0.3 + r(6) * 0.5); g.fillRect(x0 + r(7) * (w - fw), yy(1.0), fw, yy(0.75) - yy(1.0) + 2); }
      if (r(8) < 0.18 * (blinds > 0.4 ? 1 : 0)) { g.fillStyle = 'rgba(176,150,112,0.3)'; g.fillRect(x0 + w * 0.15, yy(2.3), w * 0.7, yy(0.9) - yy(2.3)); }
    }
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  tex.repeat.set(1 / 6, 1 / floorH); tex.offset.set(0, -(y0 * 0.5) / floorH);
  return tex;
}

// Like materials.nightGlow, but with a daytime floor so lit interiors read through the glass by day too.
export function dayNightGlow(mat, day = 0.15, night = 1.0) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = U.uNight;
    sh.fragmentShader = 'uniform float uNight;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>\n totalEmissiveRadiance *= (${day.toFixed(3)} + uNight * ${night.toFixed(3)});`);
  };
  mat.customProgramCacheKey = () => 'gwDayNight' + day + '_' + night;
  return mat;
}
