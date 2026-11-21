// 2D polygon helpers on [x, z] arrays
export function signedArea(r) { let a = 0; for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
export function pointInRing(x, z, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; }
export function pointInPoly(x, z, outer, holes) { if (!pointInRing(x, z, outer)) return false; if (holes) for (const h of holes) if (pointInRing(x, z, h)) return false; return true; }
export function dedupe(r, eps = 0.05) {
  const out = [];
  for (const p of r) { const q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > eps) out.push(p); }
  while (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= eps) out.pop();
  // remove collinear points
  const res = [];
  for (let i = 0; i < out.length; i++) {
    const a = out[(i - 1 + out.length) % out.length], b = out[i], c = out[(i + 1) % out.length];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]);
    if (l > 0 && Math.abs(cr) / l < 0.01) continue;
    res.push(b);
  }
  return res.length >= 3 ? res : out;
}
// Offset a ring by d (positive = outward for the ring's orientation sign `orient` = sign(signedArea)), miter clamped
export function offsetRing(r, d) {
  const n = r.length, A = signedArea(r), s = A > 0 ? 1 : -1, out = [];
  for (let i = 0; i < n; i++) {
    const a = r[(i - 1 + n) % n], b = r[i], c = r[(i + 1) % n];
    let e1x = b[0] - a[0], e1z = b[1] - a[1], e2x = c[0] - b[0], e2z = c[1] - b[1];
    const l1 = Math.hypot(e1x, e1z) || 1, l2 = Math.hypot(e2x, e2z) || 1; e1x /= l1; e1z /= l1; e2x /= l2; e2z /= l2;
    // outward normal for CCW (A>0) ring in x,z is (e.z, -e.x)
    const n1x = e1z * s, n1z = -e1x * s, n2x = e2z * s, n2z = -e2x * s;
    let mx = n1x + n2x, mz = n1z + n2z; const ml = Math.hypot(mx, mz);
    if (ml < 1e-6) { mx = n1x; mz = n1z; } else { mx /= ml; mz /= ml; }
    const cos = mx * n1x + mz * n1z; const k = Math.min(1 / Math.max(cos, 0.25), 3);
    out.push([b[0] + mx * d * k, b[1] + mz * d * k]);
  }
  return out;
}
export function ringLength(r) { let L = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; L += Math.hypot(q[0] - p[0], q[1] - p[1]); } return L; }
export function segDist2(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az; const l = dx * dx + dz * dz; let t = l ? ((px - ax) * dx + (pz - az) * dz) / l : 0; t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx - px, z = az + t * dz - pz; return x * x + z * z;
}
