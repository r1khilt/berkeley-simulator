// r4-props2: shared SDF sculpt toolkit (factored out of guardian-lion.mjs so other statues can reuse the pipeline):
//   SDF primitives + value noise -> surface nets -> project onto the zero set -> meshoptimizer simplify (hi + lo LOD)
//   -> SDF-gradient normals + hemisphere/cavity AO baked per vertex -> quantised 'SCL1' binary, gzipped
//   (format read by src/props/sculpt.js).
import fs from 'fs';
import zlib from 'zlib';
import { MeshoptSimplifier } from 'meshoptimizer';

export const { sqrt, abs, min, max, sin, cos, atan2, PI, hypot, floor } = Math;
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const OUT = new URL('../../public/assets/sculpt/', import.meta.url).pathname;
export function smin(a, b, k) { if (k <= 0) return min(a, b); const h = max(k - abs(a - b), 0) / k; return min(a, b) - h * h * k * 0.25; }
export function smax(a, b, k) { return -smin(-a, -b, k); }
export function ell(x, y, z, rx, ry, rz) { // approximate ellipsoid distance, p relative to centre
  const k0 = sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2), k1 = sqrt((x / (rx * rx)) ** 2 + (y / (ry * ry)) ** 2 + (z / (rz * rz)) ** 2);
  return k1 < 1e-9 ? -min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
export function rcone(px, py, pz, a, b, r1, r2) { // round cone between points a (r1) and b (r2)
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
export function rbox(x, y, z, bx, by, bz, r) {
  const qx = abs(x) - bx + r, qy = abs(y) - by + r, qz = abs(z) - bz + r;
  return hypot(max(qx, 0), max(qy, 0), max(qz, 0)) + min(max(qx, max(qy, qz)), 0) - r;
}
export const sm = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
export const nrm3 = (v) => { const l = hypot(...v); return v.map((a) => a / l); };
// rotate p about the y axis (yaw) then the x axis (pitch); used to pose heads/limbs in local frames
export function rotYX(x, y, z, yaw, pitch) {
  const cy = cos(yaw), sy = sin(yaw); const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
  const cp = cos(pitch), sp = sin(pitch); return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
}
// ---------------- value noise (deterministic, [-1, 1]) ----------------
function hash3(i, j, k) { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h & 0xffff) / 32767.5 - 1; }
export function vnoise(x, y, z) {
  const i = floor(x), j = floor(y), k = floor(z); const fx = x - i, fy = y - j, fz = z - k;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash3(i, j, k), hash3(i + 1, j, k), ux), L(hash3(i, j + 1, k), hash3(i + 1, j + 1, k), ux), uy),
    L(L(hash3(i, j, k + 1), hash3(i + 1, j, k + 1), ux), L(hash3(i, j + 1, k + 1), hash3(i + 1, j + 1, k + 1), ux), uy), uz);
}
export function fbm(x, y, z, oct = 3) { let s = 0, a = 0.5, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += a * vnoise(x * f + o * 17.3, y * f - o * 9.1, z * f + o * 3.7); n += a; a *= 0.5; f *= 2.03; } return s / n; }

// ---------------- surface nets ----------------
export function surfaceNets(f, bmin, bmax, h) {
  const nx = Math.ceil((bmax[0] - bmin[0]) / h) + 1, ny = Math.ceil((bmax[1] - bmin[1]) / h) + 1, nz = Math.ceil((bmax[2] - bmin[2]) / h) + 1;
  const F = new Float32Array(nx * ny * nz);
  const t0 = Date.now();
  const C = 4, cx = Math.ceil(nx / C) + 1, cy = Math.ceil(ny / C) + 1, cz = Math.ceil(nz / C) + 1;
  const coarse = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++)
    coarse[i + cx * (j + cy * k)] = f(bmin[0] + i * C * h, bmin[1] + j * C * h, bmin[2] + k * C * h);
  const lim = C * h * 1.8;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const ci = Math.round(i / C), cj = Math.round(j / C), ck = Math.round(k / C);
    const dc = coarse[min(ci, cx - 1) + cx * (min(cj, cy - 1) + cy * min(ck, cz - 1))];
    F[i + nx * (j + ny * k)] = abs(dc) > lim ? dc : f(bmin[0] + i * h, bmin[1] + j * h, bmin[2] + k * h);
  }
  console.log(`  field ${nx}x${ny}x${nz} in ${Date.now() - t0} ms`);
  const vid = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const at = (i, j, k) => F[i + nx * (j + ny * k)];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0; const v = [];
    for (let c = 0; c < 8; c++) { const val = at(i + corners[c][0], j + corners[c][1], k + corners[c][2]); v.push(val); if (val < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t; sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t; sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t; n++;
    }
    vid[i + nx * (j + ny * k)] = pos.length / 3;
    pos.push(bmin[0] + (i + sx / n) * h, bmin[1] + (j + sy / n) * h, bmin[2] + (k + sz / n) * h);
  }
  const idx = [];
  const V = (i, j, k) => vid[i + nx * (j + ny * k)];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = at(i, j, k) < 0;
    if (a !== (at(i + 1, j, k) < 0)) quad([V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k)], a);
    if (a !== (at(i, j + 1, k) < 0)) quad([V(i - 1, j, k - 1), V(i - 1, j, k), V(i, j, k), V(i, j, k - 1)], a);
    if (a !== (at(i, j, k + 1) < 0)) quad([V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k)], a);
  }
  function quad(q, flip) {
    if (q.some((x) => x < 0)) return;
    if (flip) idx.push(q[0], q[1], q[2], q[0], q[2], q[3]); else idx.push(q[0], q[2], q[1], q[0], q[3], q[2]);
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}
export function gradLen(f, x, y, z, e = 0.002) { const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e); return max(0.3, hypot(gx, gy, gz) / (2 * e)); }
export function grad(f, x, y, z, e = 0.0025) {
  const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
  const l = hypot(gx, gy, gz) || 1; return [gx / l, gy / l, gz / l];
}
// bake(name, f, { bmin, bmax, h, tris, lo, ao }) -> writes <name>.bin and <name>-lo.bin
//   ao: hemisphere ray length (m) — ~0.3 for a life-size figure; cavity probe distances scale with it.
export async function bake(name, f, { bmin, bmax, h, tris, lo = 7, ao = 0.3, grime = 0.25, keepBelow = false }) {
  console.log('baking', name);
  const { pos, idx } = surfaceNets(f, bmin, bmax, h);
  console.log(`  nets: ${pos.length / 3} verts, ${idx.length / 3} tris`);
  const e = h * 0.35;
  for (let v = 0; v < pos.length; v += 3) for (let it = 0; it < 2; it++) {
    const d = f(pos[v], pos[v + 1], pos[v + 2]); const g = grad(f, pos[v], pos[v + 1], pos[v + 2], e);
    pos[v] -= g[0] * d; pos[v + 1] -= g[1] * d; pos[v + 2] -= g[2] * d;
  }
  await MeshoptSimplifier.ready;
  for (const [suffix, t] of [['', tris], ['-lo', Math.round(tris / lo)]]) {
    const [sidx, err] = MeshoptSimplifier.simplify(idx, pos, 3, t * 3, 0.05, ['Prune']);
    console.log(`  simplified to ${sidx.length / 3} tris (err ${err.toFixed(4)})`);
    write(name + suffix, f, pos, sidx, { ao, h, grime, keepBelow, y0: bmin[1] });
  }
}
function write(name, f, pos, sidx, { ao: AOL, h, grime, keepBelow, y0 }) {
  const remap = new Int32Array(pos.length / 3).fill(-1); const P = []; const I = new Uint32Array(sidx.length);
  for (let t = 0; t < sidx.length; t++) { const o = sidx[t]; if (remap[o] < 0) { remap[o] = P.length / 3; P.push(pos[o * 3], pos[o * 3 + 1], pos[o * 3 + 2]); } I[t] = remap[o]; }
  const nv = P.length / 3;
  const keep = [];
  for (let t = 0; t < I.length; t += 3) { const ys = [P[I[t] * 3 + 1], P[I[t + 1] * 3 + 1], P[I[t + 2] * 3 + 1]]; if (!keepBelow && Math.max(...ys) < y0 + h * 0.7) continue; keep.push(I[t], I[t + 1], I[t + 2]); }
  const N = new Float32Array(nv * 3), AO = new Float32Array(nv);
  const ge = max(0.0015, h * 0.4), s = AOL / 0.3;
  for (let v = 0; v < nv; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const n = grad(f, x, y, z, ge); N.set(n, v * 3);
    let t1 = abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; { const dd = t1[0] * n[0] + t1[1] * n[1] + t1[2] * n[2]; t1 = nrm3([t1[0] - n[0] * dd, t1[1] - n[1] * dd, t1[2] - n[2] * dd]); }
    const t2 = [n[1] * t1[2] - n[2] * t1[1], n[2] * t1[0] - n[0] * t1[2], n[0] * t1[1] - n[1] * t1[0]];
    let hit = 0, tot = 0; const NR = 14;
    for (let r = 0; r < NR; r++) {
      const u1 = (r + 0.5) / NR, u2 = (r * 0.618034 + v * 0.1373) % 1; const rad = sqrt(u1), phi = 2 * PI * u2, cz = sqrt(1 - u1);
      const dx = t1[0] * rad * cos(phi) + t2[0] * rad * sin(phi) + n[0] * cz, dy = t1[1] * rad * cos(phi) + t2[1] * rad * sin(phi) + n[1] * cz, dz = t1[2] * rad * cos(phi) + t2[2] * rad * sin(phi) + n[2] * cz;
      let t = 0.012 * s, occl = 0;
      for (let k = 0; k < 40 && t < AOL; k++) { const dist = f(x + dx * t, y + dy * t, z + dz * t); if (dist < 0.002 * s) { occl = 1 - 0.6 * sm(0.4 * AOL, AOL, t); break; } t += max(dist * 0.9, 0.004 * s); }
      hit += occl; tot++;
    }
    let ao = (1 - 0.92 * hit / tot) ** 2;
    { const gl = gradLen(f, x, y, z, ge); let occ = 0, w = 1; for (const t0 of [0.008, 0.016, 0.028]) { const t = t0 * s; occ += w * max(0, t - max(0, f(x + n[0] * t, y + n[1] * t, z + n[2] * t)) / gl) / t; w *= 0.7; } ao *= clamp(1 - 0.45 * occ, 0.4, 1); }
    ao = clamp(ao, 0.12, 1);
    ao *= 0.9 + 0.1 * sm(y0, y0 + grime, y);
    ao *= 1 - 0.05 * max(0, -n[1]);
    AO[v] = ao;
  }
  { const hist = new Array(10).fill(0); for (let v = 0; v < nv; v++) hist[min(9, Math.floor(AO[v] * 10))]++; console.log('  AO histogram', hist.join(' ')); }
  const bb0 = [Infinity, Infinity, Infinity], bb1 = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < nv; v++) for (let c = 0; c < 3; c++) { bb0[c] = min(bb0[c], P[v * 3 + c]); bb1[c] = max(bb1[c], P[v * 3 + c]); }
  const size = bb1.map((b, c) => b - bb0[c]);
  const ni = keep.length;
  const offP = 36, offN = offP + nv * 6, offA = offN + nv * 3, offI = (offA + nv + 3) & ~3;
  const buf = Buffer.alloc(offI + ni * (nv < 65536 ? 2 : 4));
  buf.write('SCL1', 0, 'ascii'); buf.writeUInt32LE(nv, 4); buf.writeUInt32LE(ni, 8);
  for (let c = 0; c < 3; c++) { buf.writeFloatLE(bb0[c], 12 + c * 4); buf.writeFloatLE(size[c], 24 + c * 4); }
  for (let v = 0; v < nv; v++) {
    for (let c = 0; c < 3; c++) buf.writeUInt16LE(Math.round(((P[v * 3 + c] - bb0[c]) / size[c]) * 65535), offP + v * 6 + c * 2);
    for (let c = 0; c < 3; c++) buf.writeInt8(Math.round(clamp(N[v * 3 + c], -1, 1) * 127), offN + v * 3 + c);
    buf.writeUInt8(Math.round(AO[v] * 255), offA + v);
  }
  for (let t = 0; t < ni; t++) { if (nv < 65536) buf.writeUInt16LE(keep[t], offI + t * 2); else buf.writeUInt32LE(keep[t], offI + t * 4); }
  fs.mkdirSync(OUT, { recursive: true });
  const gz = zlib.gzipSync(buf, { level: 9 });
  fs.writeFileSync(OUT + name + '.bin', gz);
  console.log(`  ${name}: ${nv} verts, ${ni / 3} tris, ${(gz.length / 1024).toFixed(0)} KB gz  size ${size.map((v) => v.toFixed(2)).join('x')}`);
}
