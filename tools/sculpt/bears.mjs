// r4-props2: the campus bear statues as baked SDF sculpts (original procedural sculpts, no third-party meshes):
//   bear-hardy  Tom Hardy's gilded "Golden Bear" (1980) on its 18 ft pillar at Lower Sproul: a walking bear, right
//               foreleg lifted mid-stride, head raised and turned to its left; rough welded/hammered bronze.
//   bear-pucc   Raymond Puccinelli's granite "Grizzly Bear" (1955) by Strawberry Creek: smooth, pebble-like masses,
//               walking stance, mouth open in a growl.
//   bear-rear   Douglas Van Howd's 10 ft "California Golden Bear" (1996) at Memorial Stadium: rearing on its hind legs
//               on a rock-and-log base, forepaws up, head tilted back; clumpy modelled fur.
//   bear-mourn  Jo Mora's mourning bears on the Class of 1920 WWI memorial bench at Sather Tower: crouched, hunched,
//               head bowed over crossed forepaws (unit scale, ~0.95 m tall; the game scales it to ~0.4 m).
//   rock-slab   the weathered rock slab under the Puccinelli bear (also reused for plaque boulders).
// usage: cd /work/ucb/app && npm i --no-save meshoptimizer && node tools/sculpt/bears.mjs [--only bear-hardy]
import { abs, min, max, sin, cos, atan2, hypot, smin, smax, ell, rcone, rbox, sm, vnoise, fbm, rotYX, bake } from './lib.mjs';

// ---------------- head (own frame: origin skull centre, +z muzzle, +y up), scale s ----------------
function head(x, y, z, o) {
  const s = o.s || 1; x /= s; y /= s; z /= s;
  let d = ell(x, y, z, 0.15, 0.135, 0.16);                                                   // cranium
  d = smin(d, ell(x, y - 0.055, z - 0.065, 0.13, 0.058, 0.075), 0.045);                       // brow / forehead
  for (const sx of [-1, 1]) d = smin(d, ell(x - sx * 0.082, y + 0.035, z - 0.02, 0.09, 0.088, 0.1), 0.05); // jowls
  if (o.blunt) d = smin(d, rbox(x, y + 0.035, z - 0.17, 0.085, 0.07, 0.11, 0.05), 0.04);      // blunt, squared muzzle (Puccinelli)
  else d = smin(d, rcone(x, y, z, [0, -0.03, 0.08], [0, -0.04, 0.28], 0.095, 0.05), 0.045);   // long tapering muzzle (stop under the brow)
  d = smin(d, ell(x, y + 0.03, z - 0.305, 0.046, 0.034, 0.028), 0.016);                        // nose pad
  const oa = o.open || 0, ca = cos(oa), sa = sin(oa);                                          // lower jaw hinged under the ears
  const yr = y + 0.07, zr = z; const Y = yr * ca + zr * sa - 0.07, Z = -yr * sa + zr * ca;
  d = smin(d, rcone(x, Y, Z, [0, -0.078, 0.03], [0, -0.084, 0.22], 0.072, 0.038), 0.03);
  if (oa > 0.05) { // carve the mouth between the jaws (narrower than the head so the lips close the sides)
    const ry = y + 0.068, rz = z - 0.02; const a = atan2(ry, rz), rr = hypot(ry, rz);
    let gap = max(0.03 - rz, max((a + 0.02) * rr, (-oa * 0.92 - a) * rr)); gap = max(gap, abs(x) - 0.052); gap = max(gap, rz - 0.32);
    d = smax(d, -gap, 0.012);
  } else if (o.lip) { const lip = max(abs(y + 0.07 - (z - 0.1) * 0.08) - 0.003, max(abs(x) - 0.06, -(z - 0.1))); d = smax(d, -lip, 0.003); }
  for (const sx of [-1, 1]) {
    const ex = x - sx * 0.07, ey = y - 0.04, ez = z - 0.118;
    if (o.slitEyes) d = smax(d, -max(abs(ey + ex * sx * 0.25) - 0.004, hypot(ex, ez) - 0.022), 0.004);
    else { d = smax(d, -(hypot(ex, ey, ez) - 0.014), 0.006); d = smin(d, hypot(ex, ey, ez + 0.004) - 0.009, 0.003); }
    const ax = x - sx * 0.1, ay = y - 0.122, az = z + 0.05;                                    // ears on the skull corners, set back
    const ek = o.bigEars || 1; d = smin(d, ell(ax, ay, az, 0.05 * ek, 0.048 * ek, o.flatEars ? 0.018 : 0.026 * ek), 0.022);
    if (!o.flatEars) d = smax(d, -ell(ax * 1.1, ay * 1.1, az - 0.02, 0.03, 0.028, 0.014), 0.006);
  }
  return d * s;
}

// ---------------- surface finishes ----------------
const rough = (x, y, z) => { const a = 1 - abs(vnoise(x * 11, y * 2.8, z * 11)), b = 1 - abs(vnoise(x * 25 + 3, y * 6, z * 25)); return 0.62 * a * a + 0.38 * b * b - 0.45 + 0.15 * vnoise(x * 90, y * 90, z * 90); }; // welded strokes running down
function fur(x, y, z, f) { // ridged clumps, drawn out downward
  const a = 1 - abs(vnoise(x * f, y * f * 0.55, z * f)), b = 1 - abs(vnoise(x * f * 2.3 + 5, y * f * 1.2, z * f * 2.3));
  return 0.62 * a * a * a + 0.38 * b * b * b - 0.3;
}

// ---------------- quadruped (walking) ----------------
// body frame: +z forward (head), +y up, origin on the ground under the barrel; the bear's right side is -x.
function walkingBear(o) {
  const L = (a, b, c, r, paw) => ({ a, b, c, r, paw });
  const legs = o.legs;
  const Hc = o.headC, hy = o.headYaw || 0, hp = o.headPitch || 0;
  return (x, y, z) => {
    let d = ell(x, y - 0.68, z - 0.2, 0.3, 0.36, 0.42);                                         // deep chest + shoulders
    d = smin(d, ell(x, y - 0.62, z + 0.22, 0.285, 0.31, 0.4), 0.2);                             // barrel / hips
    d = smin(d, ell(x, y - 0.93, z - 0.25, 0.2, 0.15, 0.3), 0.16);                              // shoulder hump: the withers are the high point
    d = smin(d, ell(x, y - 0.64, z + 0.5, 0.25, 0.25, 0.2), 0.15);                              // rump
    d = smin(d, ell(x, y - 0.7, z + 0.69, 0.035, 0.035, 0.035), 0.02);                          // tail stub
    for (const sx of [-1, 1]) {
      d = smin(d, ell(x - sx * 0.16, y - 0.63, z - 0.32, 0.125, 0.25, 0.17), 0.08);            // shoulder blades
      d = smin(d, ell(x - sx * 0.16, y - 0.56, z + 0.38, 0.13, 0.25, 0.22), 0.08);             // haunches
    }
    d = smin(d, rcone(x, y, z, [0, 0.8, 0.4], [Hc[0] * 0.6, Hc[1] - 0.06, Hc[2] - 0.1], 0.22, 0.16), 0.08); // neck
    for (const l of legs) {
      let e = rcone(x, y, z, l.a, l.b, l.r[0], l.r[1]);
      e = smin(e, rcone(x, y, z, l.b, l.c, l.r[1] * 0.95, l.r[2]), 0.04);
      const p = l.paw;
      e = smin(e, ell(x - p.c[0], y - p.c[1], z - p.c[2], p.r[0], p.r[1], p.r[2]), 0.04);
      if (p.toes) for (let t = 0; t < 4; t++) { const an = (t - 1.5) * 0.36; const tx = p.c[0] + sin(an) * p.r[0] * 0.72, tz = p.c[2] + cos(an) * p.r[2] * 0.86; e = smin(e, ell(x - tx, y - p.c[1] + 0.006, z - tz, 0.026, p.r[1] * 0.75, 0.03), 0.01);
        if (p.claws) e = smin(e, rcone(x, y, z, [tx, p.c[1] + 0.005, tz + 0.02], [tx, p.c[1] - 0.03, tz + 0.075], 0.014, 0.004), 0.006); }
      d = smin(d, e, 0.05);
    }
    const [hx, hyy, hz] = rotYX(x - Hc[0], y - Hc[1], z - Hc[2], hy, hp);
    d = smin(d, head(hx, hyy, hz, o.head), 0.06);
    if (o.finish === 'rough' && abs(d) < 0.04) d -= 0.01 * rough(x, y, z);
    if (o.finish === 'fur' && abs(d) < 0.03) d -= 0.01 * fur(x, y, z, 9);
    return max(d, -y);                                                                           // flat bottoms on the base
  };
}
const fore = (sx, dz = 0, claws = false) => ({ a: [sx * 0.17, 0.68, 0.32], b: [sx * 0.18, 0.37, 0.33 + dz * 0.5], c: [sx * 0.17, 0.1, 0.36 + dz], r: [0.16, 0.11, 0.08],
  paw: { c: [sx * 0.17, 0.047, 0.42 + dz], r: [0.088, 0.05, 0.12], toes: true, claws } });
const hind = (sx, dz = 0) => ({ a: [sx * 0.18, 0.62, -0.4], b: [sx * 0.19, 0.38, -0.33 + dz * 0.5], c: [sx * 0.18, 0.12, -0.45 + dz], r: [0.18, 0.115, 0.08],
  paw: { c: [sx * 0.18, 0.045, -0.37 + dz], r: [0.09, 0.047, 0.14], toes: true } });
// Hardy: right fore (-x) lifted mid-stride; left hind back, right hind forward; head raised and turned to its left (+x)
const hardy = walkingBear({ finish: 'rough', headC: [0.06, 0.99, 0.72], headYaw: 0.45, headPitch: 0.5, head: { s: 1.22 },
  legs: [fore(1, -0.06, true), { a: [-0.17, 0.68, 0.32], b: [-0.18, 0.47, 0.5], c: [-0.17, 0.33, 0.68], r: [0.16, 0.11, 0.078], paw: { c: [-0.17, 0.27, 0.74], r: [0.085, 0.11, 0.065] } },
    hind(1, -0.12), hind(-1, 0.1)] });
// Puccinelli: smooth, mouth open; near (left) fore a touch forward, far hind stepping back, head level and slightly raised
function loafBear() {
  const Hc = [0, 0.66, 0.7];
  const legs = [[0.2, 0.38 + 0.06, 0.13], [-0.2, 0.38, 0.13], [0.2, -0.42, 0.17], [-0.2, -0.42 - 0.08, 0.17]]; // [x, z, paw half-length]
  return (x, y, z) => {
    let t = ell(x, y - 0.52, z, 0.36, 0.34, 0.58);                                               // body
    t = smin(t, ell(x, y - 0.71, z - 0.16, 0.27, 0.17, 0.32), 0.2);                              // hump behind the shoulders
    t = smin(t, ell(x, y - 0.5, z + 0.44, 0.3, 0.28, 0.24), 0.2);                                // rounded rump
    t = smax(t, -ell(x, y + 0.02, z, 0.55, 0.26, 0.3), 0.08);                                    // clean concave underbelly arch
    let d = t;
    for (const [lx, lz, pl] of legs) {
      let e = rcone(x, y, z, [lx, 0.44, lz], [lx, 0.08, lz + 0.03], 0.16, 0.13);                 // short thick columns
      e = smin(e, ell(x - lx, y - 0.05, z - lz - 0.07, 0.13, 0.055, pl), 0.04);                  // broad flat paw
      for (const g of [-0.045, 0, 0.045]) e = smax(e, -max(abs(x - lx - g) - 0.005, max(-(z - lz - 0.07 - pl * 0.55), y - 0.075)), 0.004); // toe grooves
      d = smin(d, e, 0.09);
    }
    d = smin(d, rcone(x, y, z, [0, 0.62, 0.38], [0, 0.66, 0.6], 0.25, 0.2), 0.12);               // thick short neck
    const [hx, hy, hz] = rotYX(x - Hc[0], y - Hc[1], z - Hc[2], 0, 0.1);
    d = smin(d, head(hx, hy, hz, { s: 1.42, open: 0.36, slitEyes: true, flatEars: true, blunt: true }), 0.08);
    return max(d, -y);
  };
}
const pucc = loafBear();
const puccOld = walkingBear({ finish: 'smooth', headC: [0, 0.86, 0.74], headYaw: 0, headPitch: 0.1, head: { s: 1.15, open: 0.32, slitEyes: true, flatEars: true },
  legs: [fore(1, 0.07), fore(-1, -0.03), hind(1, 0.02), hind(-1, -0.12)] });

// ---------------- rearing bear (Van Howd) ----------------
function rearingBear() {
  const Hc = [-0.04, 2.5, 0.16];
  const arms = [ // right arm swung wide and across, left lower and out with the paw open
    { a: [-0.36, 1.98, 0.02], b: [-0.7, 1.82, 0.12], c: [-0.82, 2.02, 0.4], paw: [-0.84, 2.06, 0.48] },
    { a: [0.37, 1.95, 0.02], b: [0.3, 1.6, 0.36], c: [-0.12, 1.72, 0.56], paw: [-0.2, 1.74, 0.62] },
  ];
  const legs = [
    { a: [-0.26, 1.2, -0.05], b: [-0.32, 0.84, 0.24], c: [-0.26, 0.46, -0.02], foot: [-0.26, 0.37, 0.1] },
    { a: [0.27, 1.2, -0.05], b: [0.33, 0.9, 0.27], c: [0.28, 0.57, 0.02], foot: [0.28, 0.49, 0.14] },
  ];
  // upper-body lean: 0.22 rad forward and 0.16 rad to the bear's left, pivoting at the hips
  const LX = 0.24, LZ = -0.2, TW = -0.32, cx = cos(LX), sx_ = sin(LX), cz = cos(LZ), sz = sin(LZ), ct = cos(TW), st = sin(TW);
  return (x, y, z) => {
    let base = rbox(x, y - 0.15, z - 0.05, 0.6, 0.15, 0.42, 0.1);
    if (base < 0.06) base += 0.035 * fbm(x * 4, y * 4, z * 4, 3);
    let log = rcone(x, y, z, [-0.56, 0.33, 0.32], [0.52, 0.36, 0.2], 0.1, 0.085);
    if (log < 0.03) log += 0.008 * vnoise(x * 3, y * 30, z * 30);
    base = smin(base, log, 0.03);
    // lower body in the world frame
    let d = ell(x, y - 1.2, z, 0.46, 0.44, 0.38);                                                // broad belly / pelvis
    d = smin(d, ell(x, y - 1.0, z + 0.22, 0.32, 0.22, 0.2), 0.12);                               // rump
    for (const l of legs) {
      d = smin(d, ell(x - l.a[0], y - 1.0, z - 0.02, 0.22, 0.32, 0.27), 0.1);                    // thigh mass
      let e = rcone(x, y, z, l.a, l.b, 0.21, 0.15); e = smin(e, rcone(x, y, z, l.b, l.c, 0.14, 0.11), 0.05);
      e = smin(e, ell(x - l.foot[0], y - l.foot[1], z - l.foot[2], 0.13, 0.07, 0.24), 0.05);
      for (let t = 0; t < 5; t++) { const an = (t - 2) * 0.3; e = smin(e, ell(x - l.foot[0] - sin(an) * 0.1, y - l.foot[1] + 0.01, z - l.foot[2] - cos(an) * 0.22, 0.032, 0.045, 0.04), 0.012); }
      d = smin(d, e, 0.07);
    }
    // upper body in the leaned frame (inverse-rotate the sample point about the hip pivot)
    let ux = x, uy = y - 1.15, uz = z;
    { const y1 = uy * cx + uz * sx_, z1 = -uy * sx_ + uz * cx; uy = y1; uz = z1; }
    { const x1 = ux * cz + uy * sz, y1 = -ux * sz + uy * cz; ux = x1; uy = y1; }
    { const x1 = ux * ct - uz * st, z1 = ux * st + uz * ct; ux = x1; uz = z1; }                 // twist toward its right
    uy += 1.15;
    let u = ell(ux, uy - 1.74, uz + 0.02, 0.45, 0.43, 0.35);                                     // chest
    u = smin(u, ell(ux, uy - 2.1, uz + 0.12, 0.42, 0.24, 0.3), 0.16);                            // pronounced shoulder hump
    u = smin(u, rcone(ux, uy, uz, [0, 2.12, 0.0], [Hc[0], Hc[1] - 0.1, Hc[2] - 0.06], 0.29, 0.21), 0.1); // neck
    for (const A of arms) {
      u = smin(u, ell(ux - A.a[0] * 0.9, uy - A.a[1] + 0.12, uz - A.a[2], 0.17, 0.27, 0.21), 0.1);
      let e = rcone(ux, uy, uz, A.a, A.b, 0.17, 0.135); e = smin(e, rcone(ux, uy, uz, A.b, A.c, 0.135, 0.105), 0.05);
      e = smin(e, ell(ux - A.paw[0], uy - A.paw[1], uz - A.paw[2], 0.12, 0.13, 0.09), 0.05);
      for (let t = 0; t < 5; t++) { const px = A.paw[0] + (t - 2) * 0.048, py = A.paw[1] + 0.03, pz = A.paw[2] + 0.07; e = smin(e, rcone(ux, uy, uz, [px, py, pz], [px * 1.04, py - 0.06, pz + 0.07], 0.02, 0.006), 0.01); }
      u = smin(u, e, 0.07);
    }
    const [hx, hy, hz] = rotYX(ux - Hc[0], uy - Hc[1], uz - Hc[2], -0.4, 0.68);
    u = smin(u, head(hx, hy, hz, { s: 1.58 }), 0.09);
    d = smin(d, u, 0.18);
    if (abs(d) < 0.05) d -= 0.016 * fur(x, y, z, 7.5);
    return min(smin(d, base, 0.05), max(base, -y));
  };
}

// ---------------- mourning bear (Jo Mora), unit scale, sits on y = 0 ----------------
function mourningBear() { // seated on its haunches, hunched forward, forelegs straight down and crossed, head bowed over them
  const Hc = [0, 0.6, 0.33];
  return (x, y, z) => {
    let d = ell(x, y - 0.32, z + 0.08, 0.27, 0.3, 0.27);                                         // lower body
    d = smin(d, ell(x, y - 0.62, z - 0.03, 0.25, 0.3, 0.24), 0.14);                              // chest, leaning forward
    d = smin(d, ell(x, y - 0.86, z + 0.03, 0.21, 0.14, 0.2), 0.12);                              // hunched shoulders
    for (const sx of [-1, 1]) {
      d = smin(d, ell(x - sx * 0.17, y - 0.22, z + 0.12, 0.15, 0.22, 0.24), 0.1);                // haunches
      d = smin(d, ell(x - sx * 0.2, y - 0.05, z - 0.12, 0.08, 0.05, 0.14), 0.05);                // hind feet
    }
    d = smin(d, rcone(x, y, z, [0.14, 0.7, 0.12], [-0.03, 0.08, 0.33], 0.1, 0.07), 0.05);        // left foreleg, crossing to the right
    d = smin(d, ell(x + 0.03, y - 0.05, z - 0.37, 0.085, 0.05, 0.11), 0.03);
    d = smin(d, rcone(x, y, z, [-0.14, 0.7, 0.12], [0.03, 0.13, 0.37], 0.1, 0.07), 0.05);        // right foreleg over it
    d = smin(d, ell(x - 0.03, y - 0.1, z - 0.41, 0.085, 0.05, 0.11), 0.03);
    d = smin(d, rcone(x, y, z, [0, 0.82, 0.06], [0, 0.71, 0.23], 0.15, 0.12), 0.07);             // neck
    const [hx, hy, hz] = rotYX(x - Hc[0], y - Hc[1], z - Hc[2], 0.04, -0.95);
    d = smin(d, head(hx, hy, hz, { s: 1.15, blunt: true, bigEars: 1.45 }), 0.05);
    if (abs(d) < 0.03) d -= 0.008 * fur(x, y, z, 14);
    return max(d, -y);
  };
}
// ---------------- weathered rock slab (Puccinelli base; plaque boulders) ----------------
function rockSlab() {
  return (x, y, z) => {
    const wob = 0.08 * vnoise(x * 1.3 + 7, 0, z * 1.3);
    let d = rbox(x, y - 0.12, z, 1.18 + wob, 0.24, 0.58 - wob, 0.06);
    if (d < 0.12) { const r = 1 - abs(vnoise(x * 2.2, y * 1.4, z * 2.2)); d += 0.045 * fbm(x * 1.5, y * 1.2, z * 1.5, 2) - 0.03 * r * r + 0.01 * fbm(x * 8, y * 8, z * 8, 2); } // fractured, eroded edges
    d = max(d, y - 0.36 - 0.012 * vnoise(x * 3, 0, z * 3));                                      // flat weathered top
    return max(d, -(y + 0.08));
  };
}

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const jobs = {
  'bear-hardy': () => bake('bear-hardy', hardy, { bmin: [-0.42, 0, -0.98], bmax: [0.42, 1.24, 1.28], h: 0.0075, tris: 14000, ao: 0.3 }),
  'bear-pucc': () => bake('bear-pucc', pucc, { bmin: [-0.42, 0, -0.98], bmax: [0.42, 1.24, 1.26], h: 0.0075, tris: 10000, ao: 0.3 }),
  'bear-rear': () => bake('bear-rear', rearingBear(), { bmin: [-1.08, 0, -0.6], bmax: [0.8, 2.95, 0.95], h: 0.012, tris: 16000, ao: 0.4, grime: 0.5 }),
  'bear-mourn': () => bake('bear-mourn', mourningBear(), { bmin: [-0.4, 0, -0.45], bmax: [0.4, 1.06, 0.66], h: 0.005, tris: 7000, ao: 0.22 }),
  'rock-slab': () => bake('rock-slab', rockSlab(), { bmin: [-1.32, -0.08, -0.72], bmax: [1.32, 0.56, 0.72], h: 0.016, tris: 3500, ao: 0.35, keepBelow: false }),
};
for (const [k, f] of Object.entries(jobs)) if (!only || only.split(',').includes(k)) { const t0 = Date.now(); await f(); console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
