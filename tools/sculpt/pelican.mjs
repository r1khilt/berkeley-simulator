// r4-props2: Frances Rich's "Laughing Pelican" (1958, bronze, 97 x 85 x 55 in) outside Anthony Hall, as a baked SDF sculpt.
// Crouched body on splayed webbed feet, wings flung up and back in a tall V (the near wing high, fingered primaries),
// S-curved neck, small crested head, very long open beak with the big hanging pouch. Original procedural sculpt.
// usage: cd /work/ucb/app && node tools/sculpt/pelican.mjs
import { abs, min, max, sin, cos, hypot, smin, smax, ell, rcone, sm, vnoise, nrm3, bake } from './lib.mjs';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// a wing: flat tapered blade from root R along span direction S (length L), chord toward C, with fingered primaries
function makeWing(R, tip, chordHint, w0, w1) {
  const sp = [tip[0] - R[0], tip[1] - R[1], tip[2] - R[2]]; const L = hypot(...sp); const S = sp.map((v) => v / L);
  let C = chordHint.map((v, i) => v - S[i] * dot(chordHint, S)); C = nrm3(C); const N = cross(S, C);
  return (x, y, z) => {
    const p = [x - R[0], y - R[1], z - R[2]]; const a = dot(p, S), b = dot(p, C), n = dot(p, N);
    if (a < -0.4 || a > L + 0.5 || abs(n) > 0.4 || b < -0.5 || b > w0 + 0.5) return 0.3;
    const t = a / L, w = w0 + (w1 - w0) * t;                                        // chord tapers toward the tip
    const lead = 0.06 * sin(Math.PI * t);                                            // slight forward bow of the leading edge
    let d = max(max(-a, a - L * 0.8), max(lead - b, b - w));                         // the inner wing blade
    d = max(d, abs(n) - 0.035 * (1 - 0.5 * t)) ;
    // primaries: 6 fingers fanning out past the blade
    for (let i = 0; i < 5; i++) { // long tapered primaries, overlapping like a fan (flat: n is squashed 3x)
      const bi = w * (0.12 + i * 0.2), a0 = L * 0.7, a1 = L + 0.3 - i * 0.09;
      const f = rcone(a, b, n * 3, [a0, bi, 0], [a1, bi + 0.03 + i * 0.07, 0], 0.085, 0.03) / 3;
      d = smin(d, f, 0.02);
    }
    // incised covert / secondary rows running diagonally across the wing
    if (d < 0.01 && a < L * 0.8) d += 0.004 * sm(0.6, 0.95, abs(sin(b * 20 + a * 6)));
    return d;
  };
}
function pelican() {
  const wingR = makeWing([0.24, 0.7, 0.08], [0.62, 2.2, -0.36], [0, -0.35, -1], 0.92, 0.46);  // near wing, flung high and forward, framing the neck  // near wing, flung high and forward, framing the neck
  const wingL = makeWing([-0.24, 0.68, 0.0], [-0.56, 1.7, -0.7], [0, -0.3, -1], 0.85, 0.42);  // far wing, lower
  const shoulder = (x, y, z) => min(ell(x - 0.22, y - 0.68, z - 0.04, 0.16, 0.2, 0.26), ell(x + 0.22, y - 0.66, z + 0.0, 0.16, 0.2, 0.26)); // wing roots  // far wing, lower
  return (x, y, z) => {
    let d = ell(x, y - 0.37, z + 0.12, 0.36, 0.3, 0.62);                                  // long, low crouched body, belly near the base
    d = smin(d, ell(x, y - 0.5, z - 0.26, 0.3, 0.3, 0.3), 0.14);                          // breast
    d = smin(d, rcone(x * 0.6, y, z, [0, 0.36, -0.6], [0, 0.05, -1.08], 0.14, 0.035), 0.08); // wedge tail dragging on the pad
    for (const sx of [-1, 1]) {                                                           // splayed webbed feet on the base
      d = smin(d, ell(x - sx * 0.19, y - 0.035, z - 0.3, 0.14, 0.035, 0.2), 0.05);
      for (let t = -1; t <= 1; t++) d = smin(d, rcone(x, y, z, [sx * 0.19, 0.05, 0.22], [sx * 0.19 + t * 0.09, 0.04, 0.52], 0.025, 0.015), 0.01);
    }
    // S-curved neck: dips forward, loops back, rises to the head
    const nk = [[0, 0.66, 0.34, 0.15], [0, 0.94, 0.52, 0.105], [0, 1.2, 0.4, 0.09], [0, 1.44, 0.44, 0.08]];
    for (let i = 0; i < nk.length - 1; i++) d = smin(d, rcone(x, y, z, nk[i].slice(0, 3), nk[i + 1].slice(0, 3), nk[i][3], nk[i + 1][3]), 0.05);
    d = smin(d, ell(x, y - 1.53, z - 0.5, 0.095, 0.1, 0.13), 0.05);                       // head
    for (let i = 0; i < 9; i++) { const a = i / 8; d = smin(d, rcone(x, y, z, [0, 1.6 - a * 0.08, 0.56 - a * 0.22], [0, 1.69 - a * 0.1, 0.5 - a * 0.28], 0.022, 0.006), 0.012); } // spiky crest
    d = smax(d, -(hypot(abs(x) - 0.075, y - 1.56, z - 0.58) - 0.014), 0.006);            // eyes
    // long beak, mandibles open, hooked tip
    d = smin(d, rcone(x, y, z, [0, 1.55, 0.6], [0, 1.62, 1.48], 0.045, 0.02), 0.03);
    d = smin(d, rcone(x, y, z, [0, 1.62, 1.48], [0, 1.575, 1.52], 0.02, 0.01), 0.008);
    d = smin(d, rcone(x, y, z, [0, 1.5, 0.6], [0, 1.44, 1.4], 0.035, 0.017), 0.03);
    // the pouch: a deep sack slung along the whole lower mandible, deepest toward the front, wavy lower edge
    { let p = rcone(x * 1.0, y, z, [0, 1.43, 0.66], [0, 1.27, 1.2], 0.05, 0.17);
      p = max(p, y - (1.47 - (z - 0.6) * 0.075));                                      // flat top on the lower mandible
      p = max(p, z - 1.36);
      p += 0.008 * sin(z * 20) * sm(1.2, 1.3, 1.45 - y);
      d = smin(d, p, 0.025); }
    d = smin(d, shoulder(x, y, z), 0.1); d = smin(d, wingR(x, y, z), 0.08); d = smin(d, wingL(x, y, z), 0.08);
    if (abs(d) < 0.02) d += 0.0015 * vnoise(x * 25, y * 25, z * 25);                      // faintly hammered, modelled surface
    return max(d, -y);
  };
}
await bake('pelican', pelican(), { bmin: [-0.8, 0, -1.15], bmax: [0.85, 2.75, 1.62], h: 0.011, tris: 14000, ao: 0.35 });
