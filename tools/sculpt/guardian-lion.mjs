// Bakes the Durant Hall guardian lions (Qing-style shishi, a male with an embroidered ball and a female with a cub)
// from a signed-distance-field sculpt into compact meshes the game loads at runtime (public/assets/sculpt/*.bin).
//   SDF (smooth unions of ellipsoids / round cones + rows of spiral mane curls)
//   -> surface nets on a 7 mm grid, vertices projected onto the surface
//   -> meshoptimizer simplify -> SDF-gradient normals + SDF cavity AO (vertex colour) -> quantised binary, gzipped.
// Original procedural sculpt (no scanned or third-party mesh), so no licence strings attached.
// usage: cd /work/ucb/app && npm i --no-save meshoptimizer && node tools/sculpt/guardian-lion.mjs [--tris 9000] [--h 0.007]
import fs from 'fs';
import zlib from 'zlib';
import { MeshoptSimplifier } from 'meshoptimizer';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const H = arg('--h', 0.006), TRIS = arg('--tris', 18000);
const OUT = new URL('../../public/assets/sculpt/', import.meta.url).pathname;

// ---------------- SDF primitives (Inigo Quilez) ----------------
const { sqrt, abs, min, max, sin, cos, atan2, PI, hypot } = Math;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
function smin(a, b, k) { if (k <= 0) return min(a, b); const h = max(k - abs(a - b), 0) / k; return min(a, b) - h * h * k * 0.25; }
function smax(a, b, k) { return -smin(-a, -b, k); }
function ell(x, y, z, rx, ry, rz) { // approximate ellipsoid distance, p relative to centre
  const k0 = sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2), k1 = sqrt((x / (rx * rx)) ** 2 + (y / (ry * ry)) ** 2 + (z / (rz * rz)) ** 2);
  return k1 < 1e-9 ? -min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
function rcone(px, py, pz, a, b, r1, r2) { // round cone between points a (r1) and b (r2)
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
function rbox(x, y, z, bx, by, bz, r) {
  const qx = abs(x) - bx + r, qy = abs(y) - by + r, qz = abs(z) - bz + r;
  return hypot(max(qx, 0), max(qy, 0), max(qz, 0)) + min(max(qx, max(qy, qz)), 0) - r;
}
function torusY(x, y, z, R, r) { const q = hypot(x, z) - R; return hypot(q, y) - r; }
const sm = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

// ---------------- spiral curls (mane, tail, cub) ----------------
// a curl = a domed boss with a carved single-start spiral groove, oriented along its outward normal n
function makeCurl(c, n, r, opts = {}) {
  const nl = hypot(...n); n = n.map((v) => v / nl);
  let t1 = abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  // t1 = normalize(t1 - n (n.t1)); t2 = n x t1
  const d = t1[0] * n[0] + t1[1] * n[1] + t1[2] * n[2]; t1 = [t1[0] - n[0] * d, t1[1] - n[1] * d, t1[2] - n[2] * d];
  const l1 = hypot(...t1); t1 = t1.map((v) => v / l1);
  const t2 = [n[1] * t1[2] - n[2] * t1[1], n[2] * t1[0] - n[0] * t1[2], n[0] * t1[1] - n[1] * t1[0]];
  return { c, n, t1, t2, r, flat: opts.flat ?? 0.72, amp: opts.amp ?? r * 0.22, pitch: opts.pitch ?? r * 0.5, spin: opts.spin ?? 1, ph: opts.ph ?? 0 };
}
function curlSDF(C, x, y, z) {
  const qx = x - C.c[0], qy = y - C.c[1], qz = z - C.c[2];
  const h = qx * C.n[0] + qy * C.n[1] + qz * C.n[2];
  const a = qx * C.t1[0] + qy * C.t1[1] + qz * C.t1[2], b = qx * C.t2[0] + qy * C.t2[1] + qz * C.t2[2];
  // squashed dome: radius r across, r*flat tall
  let d = ell(a, h, b, C.r, C.r * C.flat, C.r);
  if (d > C.amp * 2) return d;
  const rr = hypot(a, b), th = atan2(b, a) * C.spin + C.ph;
  const ph = rr / C.pitch - th / (2 * PI);
  const g = 0.5 + 0.5 * cos(2 * PI * ph);         // 1 on the groove line
  const cap = sm(-0.2 * C.r * C.flat, 0.5 * C.r * C.flat, h) * sm(0.04 * C.r, 0.22 * C.r, rr); // keep the eye solid, groove the dome
  return d + C.amp * g * g * cap;
}

// ---------------- the lion ----------------
function torusAx(x, y, z, c, ax, R, r) { // torus around unit axis ax centred at c
  const qx = x - c[0], qy = y - c[1], qz = z - c[2]; const h = qx * ax[0] + qy * ax[1] + qz * ax[2];
  const rx = qx - ax[0] * h, ry = qy - ax[1] * h, rz = qz - ax[2] * h; return hypot(hypot(rx, ry, rz) - R, h) - r;
}
const nrm3 = (v) => { const l = hypot(...v); return v.map((a) => a / l); };
// local frame: origin at the base-slab bottom centre, +y up, +z forward (the way it faces), s = side of the raised paw (+1 = +x)
function lionSDF(kind, s) {
  const male = kind === 'm';
  const turn = -s * 0.14;                      // head turned slightly toward the door (away from the raised paw side)
  const ct = cos(turn), st = sin(turn);
  const curls = [];      // head-frame curls (turn with the head)
  const bodyCurls = [];  // body-frame curls
  // rows of curls over an ellipsoid shell; keep(az, e, y) filters by azimuth (0 = straight ahead) / elevation
  function shellRows(list, MC, MR, e0, e1, spacing, r, keep) {
    const Rm = (MR[0] + MR[2]) / 2; let row = 0;
    for (let e = e0; e <= e1 + 1e-6; e += spacing / MR[1], row++) {
      const ce = cos(e), se = sin(e); const n = Math.max(1, Math.floor((2 * PI * Rm * ce) / spacing));
      for (let i = 0; i < n; i++) {
        const az = ((i + (row % 2 ? 0.5 : 0)) * (2 * PI / n) + PI) % (2 * PI) - PI;
        const dx = sin(az) * ce, dy = se, dz = cos(az) * ce;
        const k = 1 / sqrt((dx / MR[0]) ** 2 + (dy / MR[1]) ** 2 + (dz / MR[2]) ** 2);
        const c = [MC[0] + dx * k, MC[1] + dy * k, MC[2] + dz * k];
        if (!keep(az, e, c)) continue;
        list.push(makeCurl(c, [dx / MR[0] ** 2, dy / MR[1] ** 2, dz / MR[2] ** 2], r * (1 - 0.15 * max(0, e - 1.0)), { spin: i % 2 ? 1 : -1, ph: i * 1.7 + row * 2.3 }));
      }
    }
  }
  // head mane: a helmet of snail curls from the brow back over the crown, framing the face
  const MC = [0, 1.275, -0.01], MR = [0.3, 0.31, 0.27];
  shellRows(curls, MC, MR, -0.3, 1.5, 0.09, 0.05, (az, e) => !((abs(az) < 0.88 && e < 0.56) || (abs(az) < 0.55 && e < 0.78)));
  // nape mane: rows continuing down the back and sides of the neck to the shoulders
  const NC = [0, 1.0, -0.12], NR = [0.265, 0.25, 0.25];
  shellRows(curls, NC, NR, -0.62, 0.5, 0.09, 0.05, (az, e, c) => abs(az) > 1.4 && c[1] > 0.8);
  // cheek / beard curls framing the face below the eyes, and a row under the jaw
  for (const sx of [-1, 1]) for (let j = 0; j < 3; j++)
    curls.push(makeCurl([sx * (0.212 - j * 0.014), 1.2 - j * 0.083, 0.232 - j * 0.012], [sx * 0.75, -0.1, 0.65], 0.045, { spin: sx, ph: j * 2.1 }));
  for (const x of [-0.11, 0, 0.11]) curls.push(makeCurl([x, 0.955, 0.252 - abs(x) * 0.3], [x * 1.5, -0.55, 0.8], 0.045, { ph: x * 30 }));
  // temple curls trailing off the brows
  for (const sx of [-1, 1]) curls.push(makeCurl([sx * 0.205, 1.385, 0.215], [sx * 0.8, 0.25, 0.55], 0.036, { spin: sx }));
  // haunch curl patches (outer thighs) and shoulder curls
  for (const sx of [-1, 1]) {
    bodyCurls.push(makeCurl([sx * 0.255, 0.86, 0.06], [sx * 0.9, 0.2, 0.3], 0.038, { spin: -sx }));
  }
  for (const [y, z] of [[0.93, -0.27], [0.86, -0.33], [0.79, -0.385]]) bodyCurls.push(makeCurl([0, y, z], [0, 0.6, -0.8], 0.045, { ph: y * 13 }));
  // tail: a broad fan of S-curled locks laid against the rump, ending in big curls
  const tailTips = [[0, 0.8, -0.455, 0.056], [-0.1, 0.74, -0.49, 0.05], [0.1, 0.74, -0.49, 0.05], [-0.16, 0.62, -0.535, 0.046], [0.16, 0.62, -0.535, 0.046]];
  for (const [x, y, z, r] of tailTips) bodyCurls.push(makeCurl([x, y, z], [x * 1.4, 0.45, -1], r, { spin: x >= 0 ? 1 : -1, ph: x * 20 + y * 9 }));
  // cub (female): little curls on its head
  if (!male) for (const [x, y, z] of [[0.02, 0.275, 0.47], [-0.035, 0.252, 0.425], [0.065, 0.247, 0.435]]) bodyCurls.push(makeCurl([s * (0.2 + x), y, z], [s * x * 4, 1, 0.3], 0.028, { ph: x * 50 }));
  function hashOf(list) {
    const CS = 0.1, grid = new Map();
    for (const C of list) {
      const R = C.r + 0.02;
      for (let i = Math.floor((C.c[0] - R) / CS); i <= Math.floor((C.c[0] + R) / CS); i++)
        for (let j = Math.floor((C.c[1] - R) / CS); j <= Math.floor((C.c[1] + R) / CS); j++)
          for (let k = Math.floor((C.c[2] - R) / CS); k <= Math.floor((C.c[2] + R) / CS); k++) {
            const key = i + ',' + j + ',' + k; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(C);
          }
    }
    return (x, y, z) => { const L = grid.get(Math.floor(x / CS) + ',' + Math.floor(y / CS) + ',' + Math.floor(z / CS)); if (!L) return 1; let d = 1; for (const C of L) d = smin(d, curlSDF(C, x, y, z), 0.008); return d; };
  }
  const headCurlField = hashOf(curls), bodyCurlField = hashOf(bodyCurls);
  // ---- fixed geometry
  const P = s; // raised paw side
  const ball = { c: [P * 0.19, 0.255, 0.37], r: 0.155 };
  const cub = { c: [P * 0.19, 0.18, 0.36] };
  const pawRaisedY = male ? ball.c[1] + ball.r * 0.84 : 0.292;
  const pawRaisedZ = male ? 0.33 : 0.345;
  const legs = [
    { a: [-P * 0.165, 0.8, 0.12], b: [-P * 0.17, 0.17, 0.265], r1: 0.112, r2: 0.074 },              // standing foreleg
    { a: [P * 0.17, 0.8, 0.12], b: [P * 0.185, 0.54, 0.205], r1: 0.112, r2: 0.09 },                 // raised foreleg: upper
    { a: [P * 0.185, 0.54, 0.205], b: [P * 0.19, pawRaisedY + 0.05, pawRaisedZ - 0.04], r1: 0.09, r2: 0.074 },
  ];
  const paws = [{ x: -P * 0.17, y: 0.1, z: 0.275, onBall: false }, { x: P * 0.19, y: pawRaisedY, z: pawRaisedZ, onBall: male }];
  const hind = [-1, 1].map((sx) => ({ a: [sx * 0.3, 0.36, -0.06], b: [sx * 0.322, 0.15, 0.08], r1: 0.088, r2: 0.06, paw: { x: sx * 0.33, y: 0.1, z: 0.13 } }));
  function paw(pw, x, y, z, big = 1) {
    const qx = x - pw.x, qy = y - pw.y, qz = z - pw.z;
    let d = ell(qx, qy - 0.044 * big, qz - 0.015, 0.084 * big, 0.056 * big, 0.1 * big);
    for (let t = 0; t < 4; t++) {
      const ox = (-0.056 + t * 0.0373) * big;
      let tc = [pw.x + ox, pw.y + 0.03 * big, pw.z + 0.1 * big];
      if (pw.onBall) { const v = nrm3([tc[0] - ball.c[0], tc[1] - 0.012 - ball.c[1], tc[2] + 0.015 - ball.c[2]]); tc = [ball.c[0] + v[0] * (ball.r + 0.022), ball.c[1] + v[1] * (ball.r + 0.022), ball.c[2] + v[2] * (ball.r + 0.022)]; }
      d = smin(d, ell(x - tc[0], y - tc[1], z - tc[2], 0.025 * big, 0.029 * big, 0.033 * big), 0.012);
      d = smin(d, rcone(x, y, z, [tc[0], tc[1] + 0.006, tc[2] + 0.024 * big], [tc[0], tc[1] - 0.016 * big, tc[2] + 0.044 * big], 0.011 * big, 0.003), 0.004); // claw
    }
    return d;
  }
  function head(x, y, z) {
    const lx = x * ct - (z - 0.05) * st, lz = x * st + (z - 0.05) * ct + 0.05; x = lx; z = lz; // turn about the neck axis
    const ax = abs(x);
    let d = ell(x, y - 1.285, z - 0.095, 0.245, 0.225, 0.215);                     // skull
    d = smin(d, ell(ax - 0.118, y - 1.16, z - 0.24, 0.12, 0.1, 0.105), 0.05);         // cheek pads
    d = smin(d, ell(x, y - 1.285, z - 0.3, 0.062, 0.085, 0.06), 0.04);               // nose bridge
    for (const [yy, zz] of [[1.262, 0.343], [1.29, 0.336], [1.318, 0.327]]) d = smin(d, rcone(x, y, z, [-0.042, yy, zz], [0.042, yy, zz], 0.009, 0.009), 0.008); // bridge wrinkles
    // broad three-lobed ("garlic") nose with drilled nostrils
    d = smin(d, ell(x, y - 1.218, z - 0.352, 0.06, 0.046, 0.042), 0.02);
    d = smin(d, ell(ax - 0.056, y - 1.202, z - 0.338, 0.043, 0.038, 0.036), 0.016);
    d = smax(d, -ell(ax - 0.05, y - 1.19, z - 0.37, 0.019, 0.015, 0.024), 0.006);
    // brows: two swelling arcs
    d = smin(d, rcone(ax, y, z, [0.03, 1.372, 0.316], [0.1, 1.392, 0.3], 0.033, 0.036), 0.025);
    d = smin(d, rcone(ax, y, z, [0.1, 1.392, 0.3], [0.178, 1.36, 0.244], 0.036, 0.026), 0.025);
    // bulging eyes set under the brows, with lids and drilled pupils
    d = smin(d, ell(ax - 0.09, y - 1.302, z - 0.295, 0.045, 0.043, 0.044), 0.01);
    d = smin(d, torusAx(ax, y, z, [0.09, 1.302, 0.306], [0.28, 0.08, 0.957], 0.045, 0.014), 0.008);
    d = smax(d, -ell(ax - 0.092, y - 1.3, z - 0.343, 0.017, 0.017, 0.016), 0.004);
    // wide open grimace: carve the cavity across the face, then rolled lips, jaw, teeth and a curled tongue
    d = smax(d, -ell(x, y - 1.068, z - 0.33, 0.14, 0.052, 0.1), 0.012);
    d = smin(d, ell(x, y - 1.11, z - 0.338, 0.152, 0.024, 0.07), 0.014);           // upper lip (overhangs, runs into the cheeks)
    d = smax(d, -ell(ax - 0.15, y - 1.07, z - 0.31, 0.022, 0.03, 0.03), 0.008);      // corner creases
    d = smin(d, ell(x, y - 1.008, z - 0.268, 0.136, 0.05, 0.11), 0.03);             // lower jaw
    d = smin(d, ell(x, y - 1.03, z - 0.33, 0.128, 0.02, 0.058), 0.012);             // lower lip
    d = smin(d, ell(x, y - 1.046, z - 0.31, 0.07, 0.017, 0.07), 0.01);              // tongue
    d = smin(d, ell(x, y - 1.056, z - 0.358, 0.045, 0.016, 0.018), 0.008);          // tongue tip curling up
    for (let t = -2; t <= 2; t++) {
      d = smin(d, rbox(x - t * 0.025, y - 1.094, z - 0.366 + abs(t) * 0.006, 0.011, 0.014, 0.011, 0.005), 0.003); // upper incisors
      d = smin(d, rbox(x - t * 0.025, y - 1.04, z - 0.358 + abs(t) * 0.006, 0.011, 0.013, 0.011, 0.005), 0.003); // lower incisors
    }
    d = smin(d, rcone(ax, y, z, [0.095, 1.106, 0.35], [0.095, 1.05, 0.358], 0.019, 0.008), 0.006); // upper fangs
    d = smin(d, rcone(ax, y, z, [0.08, 1.03, 0.348], [0.08, 1.075, 0.354], 0.016, 0.007), 0.006);  // lower fangs
    if (male) d = smin(d, ell(x, y - 1.07, z - 0.328, 0.034, 0.032, 0.034), 0.004);  // pearl in the mouth
    d = smin(d, ell(ax - 0.205, y - 1.398, z - 0.16, 0.06, 0.024, 0.045), 0.015);    // small folded ears
    // mane mass + curls
    let m = ell(x, y - MC[1], z - MC[2], MR[0] * 0.95, MR[1] * 0.95, MR[2] * 0.95);
    m = smin(m, ell(x, y - NC[1], z - NC[2], NR[0] * 0.95, NR[1] * 0.95, NR[2] * 0.95), 0.06);
    m = smin(m, headCurlField(x, y, z), 0.01);
    d = smin(d, m, 0.03);
    // collar: band with small bells, a big bell under the chin, a ribbon bow and two tassels
    {
      const cy = 0.975, cz = 0.06, tilt = 0.55;
      const yy = y - cy, zz = z - cz; const ry = yy * cos(tilt) - zz * sin(tilt), rz = yy * sin(tilt) + zz * cos(tilt);
      { const q = hypot(x, rz) - 0.222; d = smin(d, ell(q, ry, 0, 0.02, 0.034, 1), 0.01); } // flat strap
      for (const a of [0.75, 1.35, 1.95]) for (const sx of [-1, 1]) { // small bells along the band (front sides)
        const px = sx * sin(a) * 0.232, pz0 = cos(a) * 0.232; const py = cy + pz0 * sin(tilt), pz = cz + pz0 * cos(tilt);
        d = smin(d, hypot(x - px, y - py + 0.02, z - pz) - 0.022, 0.006);
      }
      const bx = x, by = y - 0.83, bz = z - 0.36;
      let b = ell(bx, by, bz, 0.066, 0.062, 0.058);
      b = smax(b, -rbox(bx, by + 0.014, bz - 0.052, 0.052, 0.006, 0.03, 0.003), 0.004);
      b = smin(b, torusY(bx, by - 0.072, bz, 0.024, 0.009), 0.006);
      d = smin(d, b, 0.01);
      for (const sx of [-1, 1]) {
        d = smin(d, ell(x - sx * 0.078, y - 0.885, z - 0.345, 0.048, 0.028, 0.016), 0.01); // bow loops
        d = smin(d, rcone(x, y, z, [sx * 0.065, 0.87, 0.352], [sx * 0.095, 0.69, 0.36], 0.015, 0.026), 0.01); // tassels
      }
    }
    return d;
  }
  return function sdf(x, y, z) {
    const ax = abs(x);
    let d = rbox(x, y - 0.05, z + 0.005, 0.43, 0.05, 0.61, 0.014);                   // base slab
    d = min(d, rbox(x, y - 0.104, z + 0.005, 0.405, 0.012, 0.585, 0.01));            // low cushion lip
    if (y > 1.8 || ax > 0.6 || abs(z) > 0.75) return d;
    let b = ell(x, y - 0.37, z + 0.29, 0.285, 0.27, 0.295);                          // rump
    b = smin(b, ell(ax - 0.215, y - 0.31, z + 0.19, 0.17, 0.22, 0.3), 0.035);        // haunches (crisper edge)
    b = smin(b, rcone(x, y, z, [0, 0.42, -0.22], [0, 0.8, 0.055], 0.245, 0.235), 0.08); // torso
    b = smin(b, ell(x, y - 0.77, z - 0.135, 0.285, 0.28, 0.225), 0.07);              // barrel chest
    b = smin(b, ell(ax - 0.17, y - 0.8, z - 0.1, 0.135, 0.16, 0.14), 0.05);           // shoulders
    b = smin(b, rcone(x, y, z, [0, 0.84, 0.02], [0, 1.1, 0.07], 0.2, 0.19), 0.06);   // neck
    for (const L of legs) b = smin(b, rcone(x, y, z, L.a, L.b, L.r1, L.r2), 0.045);
    for (const pw of paws) b = smin(b, paw(pw, x, y, z, 1.1), 0.025);
    // elbow tufts: flame locks curling back behind the forelegs
    for (const sx of [-1, 1]) for (let t = 0; t < 4; t++) {
      const y0 = 0.7 - t * 0.065;
      b = smin(b, rcone(x, y, z, [sx * 0.16, y0, 0.06], [sx * (0.19 + t * 0.008), y0 - 0.075, -0.05], 0.034, 0.013), 0.012);
      b = smin(b, hypot(x - sx * (0.19 + t * 0.008), y - (y0 - 0.06), z + 0.06) - 0.017, 0.008);
    }
    for (const L of hind) { b = smin(b, rcone(x, y, z, L.a, L.b, L.r1, L.r2), 0.05); b = smin(b, paw(L.paw, x, y, z, 0.82), 0.02); }
    // tail fan laid on the rump: a flat leaf of locks
    {
      const tilt = 0.42, yy = y - 0.56, zz = z + 0.52; const ry = yy * cos(tilt) + zz * sin(tilt), rz = -yy * sin(tilt) + zz * cos(tilt);
      b = smin(b, ell(x, ry, rz, 0.18, 0.25, 0.075), 0.05);
      for (const [tx, ty, tz] of tailTips) b = smin(b, rcone(x, y, z, [tx * 0.25, 0.3, -0.585], [tx, ty - 0.04, tz - 0.02], 0.03, 0.03), 0.02);
    }
    b = smin(b, bodyCurlField(x, y, z), 0.01);
    b = smin(b, head(x, y, z), 0.035);
    if (male) {
      const qx = x - ball.c[0], qy = y - ball.c[1], qz = z - ball.c[2];
      const r = hypot(qx, qy, qz); let bb = r - ball.r;
      if (bb < 0.04) { // brocade ball: three ribbon bands, rosette bosses where they cross, ribbon trailing onto the slab
        const ux = qx / (r + 1e-9), uy = qy / (r + 1e-9), uz = qz / (r + 1e-9);
        const band = (v) => 1 - sm(0.045, 0.075, abs(v)); const k3 = 0.57735;
        const g = max(band((ux + uy + uz) * k3), band((-ux + uy + uz) * k3), band((ux - uy + uz) * k3), band((ux + uy - uz) * k3));
        bb -= 0.007 * g;
      }
      b = smin(b, bb, 0.02);
    } else {
      const cx = cub.c[0], cy = cub.c[1], cz = cub.c[2];
      let c = ell(x - cx, y - cy, z - cz, 0.085, 0.07, 0.125);
      c = smin(c, ell(x - cx - P * 0.015, y - 0.215, z - 0.46, 0.068, 0.062, 0.062), 0.03);
      c = smin(c, ell(x - cx - P * 0.015, y - 0.2, z - 0.512, 0.035, 0.026, 0.026), 0.015);
      for (const sx of [-1, 1]) c = smin(c, rcone(x, y, z, [cx + sx * 0.05, 0.22, 0.38], [cx + sx * 0.075, 0.29, 0.43], 0.026, 0.02), 0.015);
      b = smin(b, c, 0.02);
    }
    return smin(d, b, 0.02);
  };
}

// ---------------- surface nets ----------------
function surfaceNets(f, bmin, bmax, h) {
  const nx = Math.ceil((bmax[0] - bmin[0]) / h) + 1, ny = Math.ceil((bmax[1] - bmin[1]) / h) + 1, nz = Math.ceil((bmax[2] - bmin[2]) / h) + 1;
  const F = new Float32Array(nx * ny * nz);
  const t0 = Date.now();
  // coarse pass to skip empty space: evaluate every 4th sample, only refine near the surface
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
    // x edge (i,j,k)-(i+1,j,k): cells sharing it vary in j,k
    if (i < nx - 1 && a !== (at(i + 1, j, k) < 0)) { const q = [V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k)]; quad(q, a); }
    if (j < ny - 1 && a !== (at(i, j + 1, k) < 0)) { const q = [V(i - 1, j, k - 1), V(i - 1, j, k), V(i, j, k), V(i, j, k - 1)]; quad(q, a); }
    if (k < nz - 1 && a !== (at(i, j, k + 1) < 0)) { const q = [V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k)]; quad(q, a); }
  }
  function quad(q, flip) {
    if (q.some((x) => x < 0)) return;
    if (flip) idx.push(q[0], q[1], q[2], q[0], q[2], q[3]); else idx.push(q[0], q[2], q[1], q[0], q[3], q[2]);
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

function gradLen(f, x, y, z, e = 0.002) { const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e); return max(0.3, hypot(gx, gy, gz) / (2 * e)); }
function grad(f, x, y, z, e = 0.0025) {
  const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
  const l = hypot(gx, gy, gz) || 1; return [gx / l, gy / l, gz / l];
}

async function bake(name, f) {
  console.log('baking', name);
  const bmin = [-0.48, -0.004, -0.66], bmax = [0.48, 1.68, 0.66];
  let { pos, idx } = surfaceNets(f, bmin, bmax, H);
  console.log(`  nets: ${pos.length / 3} verts, ${idx.length / 3} tris`);
  // project vertices onto the zero set (two Newton steps)
  for (let v = 0; v < pos.length; v += 3) for (let it = 0; it < 2; it++) {
    const d = f(pos[v], pos[v + 1], pos[v + 2]); const g = grad(f, pos[v], pos[v + 1], pos[v + 2], 0.002);
    pos[v] -= g[0] * d; pos[v + 1] -= g[1] * d; pos[v + 2] -= g[2] * d;
  }
  await MeshoptSimplifier.ready;
  for (const [suffix, tris] of [['', TRIS], ['-lo', Math.round(TRIS / 7)]]) {
    const [sidx, err] = MeshoptSimplifier.simplify(idx, pos, 3, tris * 3, 0.05, ['Prune']);
    console.log(`  simplified to ${sidx.length / 3} tris (err ${err.toFixed(4)})`);
    write(name + suffix, f, pos, sidx);
  }
}
function write(name, f, pos, sidx) {
  // compact
  const remap = new Int32Array(pos.length / 3).fill(-1); const P = []; const I = new Uint32Array(sidx.length);
  for (let t = 0; t < sidx.length; t++) { const o = sidx[t]; if (remap[o] < 0) { remap[o] = P.length / 3; P.push(pos[o * 3], pos[o * 3 + 1], pos[o * 3 + 2]); } I[t] = remap[o]; }
  const nv = P.length / 3;
  // drop triangles fully on the slab underside
  const keep = [];
  for (let t = 0; t < I.length; t += 3) { const ys = [P[I[t] * 3 + 1], P[I[t + 1] * 3 + 1], P[I[t + 2] * 3 + 1]]; if (Math.max(...ys) < 0.004) continue; keep.push(I[t], I[t + 1], I[t + 2]); }
  // normals from the SDF gradient; cavity AO by marching along the normal
  const N = new Float32Array(nv * 3), AO = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const n = grad(f, x, y, z); N.set(n, v * 3);
    // hemisphere occlusion: sphere-trace 14 cosine-distributed rays out to 0.3 m (robust to the SDF under-estimating
    // distance inside smooth blends), plus a short-range cavity term normalised by the local gradient length
    let t1 = abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; { const dd = t1[0] * n[0] + t1[1] * n[1] + t1[2] * n[2]; t1 = nrm3([t1[0] - n[0] * dd, t1[1] - n[1] * dd, t1[2] - n[2] * dd]); }
    const t2 = [n[1] * t1[2] - n[2] * t1[1], n[2] * t1[0] - n[0] * t1[2], n[0] * t1[1] - n[1] * t1[0]];
    let hit = 0, tot = 0; const NR = 14;
    for (let r = 0; r < NR; r++) {
      const u1 = (r + 0.5) / NR, u2 = (r * 0.618034 + v * 0.1373) % 1; const rad = sqrt(u1), phi = 2 * PI * u2, cz = sqrt(1 - u1);
      const dx = t1[0] * rad * cos(phi) + t2[0] * rad * sin(phi) + n[0] * cz, dy = t1[1] * rad * cos(phi) + t2[1] * rad * sin(phi) + n[1] * cz, dz = t1[2] * rad * cos(phi) + t2[2] * rad * sin(phi) + n[2] * cz;
      let t = 0.012, occl = 0;
      for (let k = 0; k < 40 && t < 0.3; k++) { const dist = f(x + dx * t, y + dy * t, z + dz * t); if (dist < 0.002) { occl = 1 - t / 0.3; break; } t += max(dist * 0.9, 0.004); }
      hit += occl; tot++;
    }
    let ao = 1 - 0.85 * hit / tot;
    { const gl = gradLen(f, x, y, z); let occ = 0, w = 1; for (const t of [0.008, 0.016, 0.028]) { occ += w * max(0, t - max(0, f(x + n[0] * t, y + n[1] * t, z + n[2] * t)) / gl) / t; w *= 0.7; } ao *= clamp(1 - 0.3 * occ, 0.5, 1); }
    ao = clamp(ao, 0.2, 1);
    ao *= 0.9 + 0.1 * sm(0.0, 0.25, y);              // soil splash / grime near the base
    ao *= 1 - 0.05 * max(0, -n[1]);                    // undersides a touch darker
    AO[v] = ao;
  }
  { const hist = new Array(10).fill(0); for (let v = 0; v < nv; v++) hist[min(9, Math.floor(AO[v] * 10))]++; console.log('  AO histogram', hist.join(' ')); }
  // quantise + write
  const bb0 = [Infinity, Infinity, Infinity], bb1 = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < nv; v++) for (let c = 0; c < 3; c++) { bb0[c] = min(bb0[c], P[v * 3 + c]); bb1[c] = max(bb1[c], P[v * 3 + c]); }
  const size = bb1.map((b, c) => b - bb0[c]);
  const ni = keep.length;
  const head = 4 + 4 + 4 + 24;
  const offP = head, offN = offP + nv * 6, offA = offN + nv * 3, offI0 = offA + nv; const offI = (offI0 + 3) & ~3;
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
  console.log(`  ${name}: ${nv} verts, ${ni / 3} tris, ${(buf.length / 1024).toFixed(0)} KB raw, ${(gz.length / 1024).toFixed(0)} KB gz`);
}

const which = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
// Durant Hall: the male (ball) stands on the west side, the female (cub) on the east; raised paws on the outer sides.
if (!which || which === 'm') await bake('lion-m', lionSDF('m', -1));
if (!which || which === 'f') await bake('lion-f', lionSDF('f', 1));
