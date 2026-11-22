// Site ground paint (r4-moffitt). Some landmark sites have blobby OSM-derived ground masks (dirt blobs between
// paths, jagged paving). Before the terrain, grass and minimap are built, main.js calls paintSites() to stamp crisp,
// straight-edged surfaces into the decoded ground SDF (and clear brick/granite specials under them).
// Entry: { type: 'paved'|'lawn'|'dirt'|'natural', pts: [[x, z], ...] } in world metres; later entries win.
// 'lawn' only replaces dirt/natural ground (the existing paths and roads stay); the others overwrite everything.
// SDF channels: 0 asphalt, 1 paved, 2 grass, 3 dirt; byte = (d/6 + 0.5)*255, d = signed metres (+ inside).
const CH = { paved: 1, lawn: 2, dirt: 3 };

// local building frame (u along the long axis, v across) -> world, for sites laid out against a rotated landmark
const frame = (ax, az, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return (pts) => pts.map(([u, v]) => [ax + u * c - v * s, az + u * s + v * c]); };
// polyline -> band polygon of half-width hw (mitred joints)
function band(line, hw) {
  const L = [], R = [];
  for (let i = 0; i < line.length; i++) {
    const p = line[i], a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n;
    let k = hw;
    if (i > 0 && i < line.length - 1) { const d0x = p[0] - a[0], d0z = p[1] - a[1], m0 = Math.hypot(d0x, d0z) || 1; const cos = (d0x / m0) * dx + (d0z / m0) * dz; k = hw / Math.max(0.5, Math.sqrt((1 + cos) / 2)); }
    L.push([p[0] - dz * k, p[1] + dx * k]); R.push([p[0] + dz * k, p[1] - dx * k]);
  }
  return [...L, ...R.reverse()];
}

// ---- Moffitt Library site (anchor -265.33, -52.4; frame -16 deg), from the 2023 aerial + OSM footways + site photos
const MF = frame(-265.33, -52.4, -16);
const rect = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
export const SITES = [
  // irrigated lawns where the bake left forest-floor dirt and dry ground: east of the plaza deck (toward Memorial
  // Glade / Doe) and the lawn south of the main east-west walk
  { type: 'lawn', pts: MF([[51, -36], [84, -36], [84, 31], [51, 31]]) },
  { type: 'lawn', pts: MF([[-50, 43], [7, 45], [8, 84], [-50, 84]]) },
  // the planted west slope under the big trees and the west lawn (dirt bands along its walks), the strip along Doe's
  // west front and the strip east of California Hall: lawn instead of bare forest floor (paths stay)
  { type: 'lawn', pts: MF([[-84, -44], [-31.5, -44], [-31.5, 44], [-84, 44]]) },
  { type: 'lawn', pts: MF([[53, 31], [74, 31], [74, 96], [50, 96], [50, 62]]) },
  { type: 'lawn', pts: MF([[33.5, 46], [44, 46], [44, 112], [33.5, 112]]) },
  { type: 'lawn', pts: MF(rect(-31.5, 25.6, -6, 41)) }, // under the big tree south-west of the entrance
  // north-south promenade east of the deck (8 m), bending south-west into the plaza at the south-east corner
  { type: 'paved', pts: MF(band([[56, -40], [55.5, -8], [54.5, 20], [49, 34], [46, 48], [44, 62]], 4.0)) },
  { type: 'paved', pts: MF([[50.2, -18], [55, -18], [55, 12.5], [50.2, 12.5]]) }, // no lawn sliver against the deck edge / east steps
  // walk from the deck's broad east steps out to the Glade paths
  { type: 'paved', pts: MF(band([[50, 0], [62, 0], [72, -3]], 3.2)) },
  // the main east-west walk south of the building (OSM w/22016926), straightened
  { type: 'paved', pts: MF(band([[60, 34.5], [38.5, 36.4], [30, 39.6], [6.5, 42.2], [-18.4, 41.6], [-37.4, 39.6], [-50, 40]], 3.0)) },
  // entrance forecourt: one continuous plaza from the doors to the walk, and the plaza at the south-east corner
  { type: 'paved', pts: MF([[-6, 24.5], [17, 24.5], [17, 23.4], [30.2, 23.4], [30.2, 12], [53, 12], [53, 44], [30, 42.5], [-6, 41]]) }, // + café plaza under the deck edge
  // south-west and south footways (OSM w/24026038, w/38939533)
  { type: 'paved', pts: MF(band([[-6, 38], [-18.4, 42.1], [-23.7, 50], [-32.1, 60.8], [-37, 67]], 1.6)) },
  { type: 'paved', pts: MF(band([[6.5, 41], [7.1, 75], [8.1, 84]], 1.6)) },
  // lawn bed with the two big trees at the south-east corner, and mulched tree pits for the LiDAR trees that stand in
  // the paved plaza (they grew straight out of the concrete)
  { type: 'lawn', pts: MF(rect(17.5, 27.5, 31, 33.5)) },
  ...[[47, 16], [41, 16], [39, 42], [37, 45], [42, 48]].map(([u, v]) => ({ type: 'dirt', pts: MF(rect(u - 1.1, v - 1.1, u + 1.1, v + 1.1)) })),
  // [r5-sproul] Upper Sproul Plaza: brick-in-concrete-grid special (10) wherever the ground is already paved (lawns, beds and
  // Lower Sproul are untouched; terrain.js only shows specials on paved ground)
  { type: 'special', special: 10, pts: [[-160.5, 206.0], [-92.0, 206.0], [-92.0, 368.5], [-131.5, 369.0], [-133.5, 353.0], [-141.5, 293.5], [-157.0, 291.0], [-158.5, 272.5], [-160.5, 233.0]] },
  // [r5-sproul] Lower Sproul Plaza (rebuilt 2015): one paved field from Zellerbach to MLK and from the Chávez Center to
  // Eshleman, stamped with special id 9 (terrain.js draws the banded concrete) instead of the old red brick
  { type: 'paved', special: 9, pts: [[-233.5, 286.0], [-222.0, 283.5], [-216.8, 277.5], [-183.5, 272.0], [-174.6, 275.3], [-170.6, 298.5], [-180.5, 298.0], [-191.6, 299.7],
    [-190.5, 307.0], [-182.9, 354.4], [-192.6, 354.7], [-203.0, 355.5], [-226.1, 357.5], [-226.1, 348.0], [-233.1, 304.3]] },
  // [r5-sproul] the Sproul Plaza entrance from Bancroft/Telegraph is paving, not road: the OSM footway is tagged asphalt,
  // so the bake drew a street running on from Telegraph into the plaza (keeps any brick/granite special underneath)
  { type: 'paved', keepSpecial: true, pts: [[-131.5, 352.0], [-106.0, 348.0], [-106.0, 366.8], [-131.5, 369.2]] },
];

// signed distance from (x, z) to polygon P (positive inside)
function sdPoly(P, x, z) {
  let inside = false, d2 = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, zi] = P[i], [xj, zj] = P[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
    const ex = xj - xi, ez = zj - zi, t = Math.max(0, Math.min(1, ((x - xi) * ex + (z - zi) * ez) / (ex * ex + ez * ez || 1)));
    const dx = x - xi - ex * t, dz = z - zi - ez * t; d2 = Math.min(d2, dx * dx + dz * dz);
  }
  const d = Math.sqrt(d2); return inside ? d : -d;
}
const enc = (d) => Math.max(0, Math.min(255, Math.round((d / 6 + 0.5) * 255)));

export function paintSites(sdf, gt, x0, z0, special = null, sites = SITES) {
  const st = gt.step, nx = gt.nx, nz = gt.nz;
  for (const s of sites) {
    const P = s.pts; let bx0 = Infinity, bz0 = Infinity, bx1 = -Infinity, bz1 = -Infinity;
    for (const [x, z] of P) { bx0 = Math.min(bx0, x); bz0 = Math.min(bz0, z); bx1 = Math.max(bx1, x); bz1 = Math.max(bz1, z); }
    const ch = CH[s.type] ?? -1;
    const j0 = Math.max(0, Math.floor((bx0 - 3 - x0) / st)), j1 = Math.min(nx - 1, Math.ceil((bx1 + 3 - x0) / st));
    const i0 = Math.max(0, Math.floor((bz0 - 3 - z0) / st)), i1 = Math.min(nz - 1, Math.ceil((bz1 + 3 - z0) / st));
    for (let i = i0; i <= i1 && s.type !== 'special'; i++) for (let j = j0; j <= j1; j++) { // [r5-sproul] type 'special' leaves the SDF alone
      const d = sdPoly(P, x0 + (j + 0.5) * st, z0 + (i + 0.5) * st); if (d < -3) continue;
      const k = (i * nx + j) * 4, ein = enc(d), eout = enc(-d);
      for (let c = 0; c < 4; c++) {
        if (c === ch) sdf[k + c] = Math.max(sdf[k + c], ein);
        else if (s.type !== 'lawn' || c === 3) sdf[k + c] = Math.min(sdf[k + c], eout); // lawn only replaces dirt: existing paths stay on top
      }
    }
    if (special && gt.snx && !s.keepSpecial) { // 1 m special ids (brick/granite pavers, turf) are cleared under painted surfaces
      const snx = gt.snx, snz = gt.snz;
      for (let z = Math.max(0, Math.floor(bz0 - z0)); z <= Math.min(snz - 1, Math.ceil(bz1 - z0)); z++) for (let x = Math.max(0, Math.floor(bx0 - x0)); x <= Math.min(snx - 1, Math.ceil(bx1 - x0)); x++) {
        const k = z * snx + x; const v = special[k];
        if (s.special) { if ((v === 0 || v === 4 || v === 5 || v === 9 || v === 10) && sdPoly(P, x0 + x + 0.5, z0 + z + 0.5) > 0) special[k] = s.special; continue; } // [r5-sproul] stamp a paving special id (9 Lower Sproul bands, 10 Upper Sproul brick); water/ivy/turf stay
        if (v >= 4 && v <= 6 && sdPoly(P, x0 + x + 0.5, z0 + z + 0.5) > 0) special[k] = 0;
      }
    }
  }
}
