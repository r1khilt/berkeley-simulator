// [r5-east] Photo-checked fixes for specific OSM flights and walls that groundworks.js builds generically.
// groundworks.js reads STAIR_FIX while planning stairs and calls balustrade() for walls listed in BALUSTRADE.
// Sources: Wikimedia Commons CC0 photos "UC-Berkeley-030/001 Campanile Way from base of Sather Tower" (view west from the
// tower terrace), the 2021 DTM (terrace ~98.4 m, Campanile Way ~95.4 m) and OSM ways 224038047 / 2359554xx.
//
// The Campanile terrace: Sather Tower stands on a brick terrace that drops ~3 m on its west side to Campanile Way.
// One broad flight (~7.5 m) descends west between granite cheek walls topped with vase balustrades; the terrace edge
// either side carries the same balustrade on its retaining wall. Black handrails run down both sides.

// OSM stair id -> overrides: pts (re-centred between its cheek walls), w (m), mat, rails (handrails at both edges)
const OFF = typeof location !== 'undefined' && /[?&]r5fix=0/.test(location.search); // ?r5fix=0: A/B without these fixes
export const STAIR_FIX = OFF ? {} : {
  224038047: { pts: [[-21.6, 8.25], [-11.2, 5.7]], w: 7.3, mat: 'granite', rails: true },
};
// OSM wall ids that carry a stone balustrade (cheek walls of the west stair + terrace-edge retaining walls)
export const BALUSTRADE = new Set(OFF ? [] : [235955418, 235955411, 235955415, 235955416]);
// freestanding balustraded walls use a lower solid base (the balusters make up the rest)
export const BAL_BASE_H = 0.32;

// sloped slab between plan points p -> q (half-width hw), bottom y0a/y0b, top y1a/y1b; quadB = box-projected uvs
function box(geo, p, q, hw, y0a, y0b, y1a, y1b, plain = false) {
  const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1; const tx = dx / l, tz = dz / l, nx = -tz, nz = tx;
  const A = [p[0] + nx * hw, p[1] + nz * hw], B = [q[0] + nx * hw, q[1] + nz * hw], Cc = [q[0] - nx * hw, q[1] - nz * hw], D = [p[0] - nx * hw, p[1] - nz * hw];
  const sl = (y1b - y1a) / l, tn = [-tx * sl, 1, -tz * sl], tl = Math.hypot(tn[0], 1, tn[2]);
  const Q = plain ? geo.quad.bind(geo) : geo.quadB.bind(geo);
  Q([D[0], y1a, D[1]], [Cc[0], y1b, Cc[1]], [B[0], y1b, B[1]], [A[0], y1a, A[1]], [tn[0] / tl, 1 / tl, tn[2] / tl]);
  Q([A[0], y0a, A[1]], [D[0], y0a, D[1]], [D[0], y1a, D[1]], [A[0], y1a, A[1]], [-tx, 0, -tz]);
  Q([Cc[0], y0b, Cc[1]], [B[0], y0b, B[1]], [B[0], y1b, B[1]], [Cc[0], y1b, Cc[1]], [tx, 0, tz]);
  Q([B[0], y0b, B[1]], [A[0], y0a, A[1]], [A[0], y1a, A[1]], [B[0], y1b, B[1]], [nx, 0, nz]);
  Q([D[0], y0a, D[1]], [Cc[0], y0b, Cc[1]], [Cc[0], y1b, Cc[1]], [D[0], y1a, D[1]], [-nx, 0, -nz]);
}

// Adds a classical balustrade along polyline P (resampled ~1 m) to Geo `geo` (light granite).
//   yb(k)  base height at vertex k (top of the coping it stands on)
//   off(k) lateral offset of the balustrade axis from the polyline at vertex k, along the left normal (-dz, dx)
// Plinth 0.34 x 0.16 m, vase balusters every 0.28 m (0.56 m tall), rail 0.30 x 0.12 m, piers at ends and every ~3.2 m.
export function balustrade(geo, P, yb, off) {
  const n = P.length; if (n < 2) return 0;
  const C = [0]; for (let k = 1; k < n; k++) C.push(C[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
  const L = C[n - 1]; if (L < 0.6) return 0;
  // point on the offset axis at arc length s: [x, z, y, tx, tz]
  const at = (s) => {
    let k = 1; while (k < n - 1 && C[k] < s) k++;
    const a = P[k - 1], b = P[k], l = C[k] - C[k - 1] || 1, t = Math.max(0, Math.min(1, (s - C[k - 1]) / l));
    const tx = (b[0] - a[0]) / l, tz = (b[1] - a[1]) / l, o = off(k - 1) * (1 - t) + off(k) * t;
    return [a[0] + (b[0] - a[0]) * t - tz * o, a[1] + (b[1] - a[1]) * t + tx * o, yb(k - 1) * (1 - t) + yb(k) * t, tx, tz];
  };
  const PL = 0.16, BH = 0.56, RH = 0.12; // plinth, baluster, rail heights
  // plinth + rail in ~1 m pieces following the slope
  const seg = Math.max(1, Math.ceil(L / 1.0));
  for (let i = 0; i < seg; i++) {
    const A = at(L * i / seg), B = at(L * (i + 1) / seg), p = [A[0], A[1]], q = [B[0], B[1]];
    box(geo, p, q, 0.17, A[2] - 0.02, B[2] - 0.02, A[2] + PL, B[2] + PL);                                   // plinth
    box(geo, p, q, 0.15, A[2] + PL + BH, B[2] + PL + BH, A[2] + PL + BH + RH, B[2] + PL + BH + RH);         // rail
    box(geo, p, q, 0.115, A[2] + PL + BH - 0.04, B[2] + PL + BH - 0.04, A[2] + PL + BH, B[2] + PL + BH);   // rail soffit fillet
  }
  // vase balusters (8-sided lathe), skipping the pier zones
  const prof = [[0, 0.062], [0.06, 0.062], [0.075, 0.05], [0.2, 0.078], [0.3, 0.062], [0.4, 0.04], [0.47, 0.05], [0.5, 0.062], [0.56, 0.062]];
  const SIDES = 8;
  const piers = []; { const np = Math.max(1, Math.round(L / 3.2)); for (let i = 0; i <= np; i++) piers.push(L * i / np); }
  const nearPier = (s) => piers.some((q) => Math.abs(q - s) < 0.42);
  let nb = 0;
  for (let s = 0.14; s < L - 0.1; s += 0.28) {
    if (nearPier(s)) continue;
    const [x, z, y] = at(s); const y0 = y + PL;
    for (let r = 0; r < prof.length - 1; r++) {
      const [h0, r0] = prof[r], [h1, r1] = prof[r + 1];
      for (let k = 0; k < SIDES; k++) {
        const a0 = (k / SIDES) * Math.PI * 2, a1 = ((k + 1) / SIDES) * Math.PI * 2, am = (a0 + a1) / 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        const dr = r0 - r1, dh = h1 - h0, nl = Math.hypot(dr, dh) || 1; // facet normal tilts with the profile
        const nrm = [Math.cos(am) * dh / nl, dr / nl, Math.sin(am) * dh / nl];
        geo.quadB([x + c0 * r0, y0 + h0, z + s0 * r0], [x + c1 * r0, y0 + h0, z + s1 * r0], [x + c1 * r1, y0 + h1, z + s1 * r1], [x + c0 * r1, y0 + h1, z + s0 * r1], nrm);
      }
    }
    nb++;
  }
  // square piers with a projecting cap
  for (const s of piers) {
    const [x, z, y, tx, tz] = at(Math.max(0.25, Math.min(L - 0.25, s))); const top = y + PL + BH + RH + 0.1;
    box(geo, [x - tx * 0.26, z - tz * 0.26], [x + tx * 0.26, z + tz * 0.26], 0.26, y - 0.02, y - 0.02, top, top);
    box(geo, [x - tx * 0.32, z - tz * 0.32], [x + tx * 0.32, z + tz * 0.32], 0.32, top, top, top + 0.09, top + 0.09);
  }
  return nb;
}

// Handrail along a stair edge (black steel): posts at each line point, rail 0.9 m above the nosing line.
//   line: [[x, z, yNosing], ...] from bottom to top
export function stairRail(geo, line) {
  for (let k = 0; k < line.length; k++) {
    const [x, z, y] = line[k]; box(geo, [x - 0.025, z], [x + 0.025, z], 0.025, y, y, y + 0.9, y + 0.9, true);
    if (k) { const [px, pz, py] = line[k - 1]; box(geo, [px, pz], [x, z], 0.026, py + 0.85, y + 0.85, py + 0.9, y + 0.9, true); }
  }
}
