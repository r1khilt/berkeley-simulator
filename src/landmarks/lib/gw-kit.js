// gw-kit: helpers for The Gateway (Bakar Gateway, 2026): staggered metal-panel curtain wall, flush ribbon glazing,
// recessed colonnade base, draped ground surfaces, ring utilities. Built on classic-kit's Kit (u = x, v = z, run-local
// coords: x along the run, y up, z outward).
import * as THREE from 'three';

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
export function drape(K, mat, poly, lift = 0.04, maxEdge = 2.5, holes = [], { yFn = null, detail = false } = {}) {
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
    const P = cr > 0 ? [a, c, b] : [a, b, c];
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
  const W = o.module ?? 1.5, pw = o.panelW ?? 0.6, dep = o.panelD ?? 0.32; const L = s1 - s0; if (L < 0.4) return;
  K.rbox(R, mats.glass, s0, ya, -0.2, s1, yb, -0.14);
  K.rbox(R, mats.spandrel, s0, ya, -0.14, s1, ya + 0.8, -0.125);
  K.rbox(R, mats.band, s0 - 0.01, ya - 0.3, -0.16, s1 + 0.01, ya + 0.04, 0.04);
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
  K.rbox(R, mats.spandrel, s0 - 0.01, ya - 0.4, -0.07, s1 + 0.01, ya + 0.4, 0.0);
  K.rbox(R, mats.silver, s0 - 0.01, ya - 0.42, 0.0, s1 + 0.01, ya - 0.34, 0.06);
  const n = Math.max(1, Math.round(L / W)); const w = L / n;
  for (let i = 0; i <= n; i++) { const s = s0 + i * w; K.rbox(R, mats.silver, s - 0.04, ya + 0.4, -0.06, s + 0.04, yb - 0.4, 0.08, { detail: !(i === 0 || i === n) }); }
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

// Canvas-text sign material (brushed-aluminium letters on transparent background)
export function signMaterial(text, { w = 2048, h = 128, color = '#ecebe6', font = '600 80px Helvetica, Arial, sans-serif', spacing = 12 } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  g.clearRect(0, 0, w, h); g.fillStyle = color; g.font = font; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = spacing + 'px';
  const tw = g.measureText(text).width; g.fillText(text, (w - tw) / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, roughness: 0.35, metalness: 0.55, side: THREE.DoubleSide }); m.name = 'gwSign';
  return m;
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
    if (m > maxMiter || dd < 1e-3) { // bevel: two points along each edge normal
      out.push([p[0] - d * n1[0], p[1] - d * n1[1]], [p[0] - d * n2[0], p[1] - d * n2[1]]); continue;
    }
    out.push([p[0] - d * mx, p[1] - d * mz]);
  }
  return out;
}
