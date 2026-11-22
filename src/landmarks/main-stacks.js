// Main (Gardner) Stacks (Esherick Homsey Dodge & Davis, 1994). The library's main collection lives in four levels
// underground between Doe and Moffitt; above ground only its landscaped roof shows: lawn and planting beds over the
// stacks, paved walks, low concrete retaining walls with light-well skylights. LiDAR: terrace ~5 m.
// [r5-audit-central] Rebuilt from photos of the terrace (Commons "Doe Library north side", "Doe Memorial Library north
// entrance courtyard 1/2") + the 2021 LiDAR: a red-brick paver field gridded by light concrete bands, a concrete walk
// with cast-stone slab benches along Doe's north front, a planter band by the facade, two hipped glass skylight
// pavilions on cast-stone curbs (LiDAR: ~7x8 m and ~7x7 m, apex ~3.4 m), dark-green lamps on square pedestals, a
// balustraded parapet (turned balusters between solid dies) on the Glade sides over a panelled cast-stone retaining wall
// with a juniper bank at its foot, and the missing north-east stair up from the Glade path (OSM 910274557).
import * as THREE from 'three';
import { Kit, tint, solid, rect, orient, inPoly } from './lib/b02-kit.js';
import { balustrade } from './lib/classic-kit.js';
import { band, basketweave } from './lib/r5-site.js';
export const info = {
  id: 'main-stacks', name: 'Main Stacks', subtitle: 'Esherick Homsey Dodge & Davis · 1994',
  blurb: 'The Gardner (Main) Stacks hold most of the library\'s collection in four storeys built underground between Doe and Moffitt libraries; the roof is a landscaped terrace.',
  replaces: ['r/21101300', 'relation/21101300'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16)); const M = ctx.M;
  const STONE = tint(M.stuccoWhite, 0xe4dfd4), STONE_D = tint(M.concrete, 0xc4beb3), BRICK = basketweave(), BANDM = tint(M.concrete, 0xc9c2b6);
  const WALK = tint(M.concrete, 0xc2bdb3), GLASS = solid(0x8e9ba6, 0.12, 0.65), FRAME = solid(0xb9bcbe, 0.4, 0.6), LAMP = solid(0x2f4a3c, 0.5, 0.3);
  const JUNIPER = solid(0x587553, 0.95, 0), JUNIPER2 = solid(0x6f8a5e, 0.95, 0), SOIL = tint(M.soil, 0x5a4634); // bluish sage juniper
  const fp = ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z));
  const poly = orient(fp); const Y = 4.9; const n = poly.length;
  const g0 = Math.min(...poly.map(([u, v]) => K.g(u, v))) - 1.5;
  K.prism(STONE_D, poly, g0, Y - 0.35);
  K.flat(BRICK, poly, Y - 0.02);
  const colliders = [{ type: 'poly', pts: K.polyXZ(poly), y0: g0, y1: Y - 0.05 }];
  const walkables = [{ type: 'poly', pts: K.polyXZ(poly), y: Y }];
  // ---- edges: outward runs; Glade sides (north/west, not against Doe) get the balustrade, panelled wall and junipers
  const edges = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.5) continue;
    let R = K.run(a, b); const m = R.at(L / 2, 0.3); if (inPoly(m[0], m[1], poly)) R = K.run(b, a);
    const doe = Math.min(a[1], b[1]) > 16.5; // the south edge abuts Doe / Bancroft
    const gOut = Math.min(...[0.15, 0.5, 0.85].map((t) => { const p = R.at(R.L * t, 2.0); return K.g(p[0], p[1]); }));
    // opening in the east parapet where the north-east stair's landing joins the terrace (v -19.8..-16.8)
    let gap = null; if (R.n[0] > 0.5 && Math.min(a[1], b[1]) < -19 && Math.max(a[1], b[1]) > -16) { const sAt = (v) => ((19 - R.a[0]) * R.t[0] + (v - R.a[1]) * R.t[1]); const g1 = sAt(-19.8), g2 = sAt(-16.8); gap = [Math.min(g1, g2), Math.max(g1, g2)]; }
    edges.push({ R, L, doe, glade: !doe, gOut, gap }); // every outward (non-Doe) edge carries the balustrade
  }
  for (const e of edges) {
    const { R, L } = e; if (e.doe) continue;
    // panelled cast-stone retaining wall face (+ cap) and joint reveals every ~3.2 m
    K.rbox(R, STONE, 0, g0, -0.02, L, Y - 0.2, 0.04);
    if (Y - e.gOut > 1.0 && L > 2) for (let s = 3.2; s < L - 1; s += 3.2) K.rbox(R, STONE_D, s - 0.09, e.gOut - 0.3, 0.04, s + 0.09, Y - 0.38, 0.1, { detail: true }); // panel pilaster strips
    if (Y - e.gOut > 1.6 && L > 2) { K.rbox(R, STONE_D, 0, Y - 1.1, 0.04, L, Y - 0.92, 0.12, { detail: true }); K.rbox(R, STONE, -0.05, Y - 0.38, 0.04, L + 0.05, Y - 0.2, 0.16); } // panel head band + coping under the parapet
    // parapet: balustrade panels between solid dies on the Glade sides, solid coped parapet elsewhere
    if (e.glade && L > 3) {
      for (const [r0, r1] of e.gap ? [[0, e.gap[0]], [e.gap[1], L]] : [[0, L]]) {
        const RL = r1 - r0; if (RL < 1.3) { if (RL > 0.2) K.rbox(R, STONE, r0, Y - 0.2, -0.55, r1, Y + 1.12, 0.02); continue; }
        const nP = Math.max(1, Math.round(RL / 4.2)), pw = RL / nP;
        for (let k = 0; k < nP; k++) {
          const s0 = r0 + k * pw, s1 = r0 + (k + 1) * pw;
          K.rbox(R, STONE, s0, Y - 0.2, -0.55, s0 + 0.6, Y + 1.12, 0.02); K.rbox(R, STONE, s0 - 0.04, Y + 1.12, -0.59, s0 + 0.64, Y + 1.2, 0.06);
          balustrade(K, R, STONE, s0 + 0.6, s1, Y - 0.05, 1.05, { d: -0.26, pitch: 0.3 });
        }
        K.rbox(R, STONE, r1 - 0.6, Y - 0.2, -0.55, r1, Y + 1.12, 0.02); K.rbox(R, STONE, r1 - 0.64, Y + 1.12, -0.59, r1 + 0.04, Y + 1.2, 0.06);
      }
    } else {
      for (const [s0, s1] of e.gap ? [[0, e.gap[0]], [e.gap[1], L]] : [[0, L]]) { if (s1 - s0 < 0.2) continue;
        K.rbox(R, STONE, s0, Y - 0.2, -0.45, s1, Y + 0.85, 0.02); K.rbox(R, STONE, s0 - 0.03, Y + 0.85, -0.5, s1 + 0.03, Y + 0.95, 0.07); }
    }
    for (const [s0, s1] of e.gap ? [[0, e.gap[0]], [e.gap[1], L]] : [[0, L]]) if (s1 - s0 > 0.2) colliders.push(K.colPoly([R.at(s0, 0.05), R.at(s1, 0.05), R.at(s1, -0.5), R.at(s0, -0.5)], Y - 0.3, Y + 1.15));
    // juniper bank at the foot of the tall Glade-side walls: a 3.5 m wedge of low spreading juniper rising ~1.1 m
    if (e.glade && Y - e.gOut > 2.0 && L > 2.5) {
      const A0 = R.at(0, 0.02), A1 = R.at(L, 0.02), B0 = R.at(0, 5.0), B1 = R.at(L, 5.0);
      const gA0 = K.g(A0[0], A0[1]) + 1.15, gA1 = K.g(A1[0], A1[1]) + 1.15, gB0 = K.g(B0[0], B0[1]) - 0.05, gB1 = K.g(B1[0], B1[1]) - 0.05;
      const geo = new THREE.BufferGeometry(); const P = [A0[0], gA0, A0[1], B0[0], gB0, B0[1], B1[0], gB1, B1[1], A0[0], gA0, A0[1], B1[0], gB1, B1[1], A1[0], gA1, A1[1]];
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.computeVertexNormals();
      if (geo.attributes.normal.getY(0) < 0) { const q = geo.attributes.position.array; for (let t = 0; t < q.length; t += 9) for (let c = 0; c < 3; c++) { const tmp = q[t + 3 + c]; q[t + 3 + c] = q[t + 6 + c]; q[t + 6 + c] = tmp; } geo.computeVertexNormals(); }
      K.add(JUNIPER, geo);
      let q = 0; for (let s = 0.8; s < L - 0.6; s += 1.25) for (const d of [0.8, 2.0, 3.2, 4.3]) { q++; const jit = ((q * 7919) % 13) / 13; const dd = d + (jit - 0.5) * 0.9 + (d > 4 ? jit * 0.9 : 0); const p = R.at(s + jit * 0.9, dd); const gy = K.g(p[0], p[1]) + 1.15 * Math.max(0, 1 - dd / 5.0); const r = 0.8 + jit * 0.55; K.add(q % 3 ? JUNIPER : JUNIPER2, new THREE.SphereGeometry(r, 7, 5).scale(1.4, 0.38 + jit * 0.12, 1.15).translate(p[0], gy + 0.1, p[1]), { detail: true }); }
    }
  }
  // ---- paving: concrete bands on a ~6 m grid over the brick field (clipped to the terrace), walk strip along Doe
  const clip = (fixed, isU, lo, hi) => { // inside-polygon intervals of an axis line
    const xs = []; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; const fa = isU ? a[0] : a[1], fb = isU ? b[0] : b[1];
      if ((fa > fixed) !== (fb > fixed)) { const t = (fixed - fa) / (fb - fa); xs.push(isU ? a[1] + (b[1] - a[1]) * t : a[0] + (b[0] - a[0]) * t); } }
    xs.sort((p, q) => p - q); const out = []; for (let k = 0; k + 1 < xs.length; k += 2) { const p0 = Math.max(lo, xs[k] + 0.5), p1 = Math.min(hi, xs[k + 1] - 0.5); if (p1 > p0) out.push([p0, p1]); } return out;
  };
  for (let u = -24; u <= 16; u += 6) for (const [v0, v1] of clip(u, true, -21, 14.2)) band(K, BANDM, [u, v0], [u, v1], Y - 0.02, 0.18);
  for (let v = -17; v <= 13; v += 6) for (const [u0, u1] of clip(v, false, -26.5, 18.5)) band(K, BANDM, [u0, v], [u1, v], Y - 0.02, 0.18);
  for (const [u0, u1] of [[-26.6, -14.5], [-11.6, 18.6]]) K.box(WALK, u0, Y - 0.04, 14.4, u1, Y + 0.005, 17.3); // (the footprint has a notch at u -14.2..-11.9)
  // planter band by the facade (LiDAR: shrubs ~1.5-2 m along v 12-14.5)
  K.box(STONE, -6, Y - 0.1, 12.0, 17.5, Y + 0.45, 14.2); K.box(SOIL, -5.8, Y + 0.45, 12.2, 17.3, Y + 0.46, 14.0);
  for (let u = -5.2; u < 17; u += 1.15) K.add(solid(0x40573a, 0.9, 0), new THREE.SphereGeometry(0.62, 7, 5).scale(1, 1.25, 0.95).translate(u, Y + 1.05, 13.1), { detail: true });
  colliders.push(K.colPoly([[-6, 12.0], [17.5, 12.0], [17.5, 14.2], [-6, 14.2]], Y - 0.1, Y + 1.6));
  // cast-stone slab benches along the walk, cylindrical bins
  for (let u = -24; u < 17; u += 5.5) { if (u > -15.6 && u < -10.6) continue; K.box(STONE, u - 0.9, Y + 0.33, 14.85, u + 0.9, Y + 0.45, 15.35, { detail: true }); for (const k of [-0.6, 0.6]) K.box(STONE, u + k - 0.12, Y, 14.95, u + k + 0.12, Y + 0.33, 15.25, { detail: true }); }
  for (const [u, v] of [[-14.5, 15.0], [9.2, 15.0], [12.5, -18.6]]) K.cyl(STONE, u, Y, v, 0.3, 0.3, 0.9, 12, { detail: true });
  // ---- skylight pavilions: cast-stone curb + low hipped glass roof with aluminium hips and frames
  for (const [u0, v0, u1, v1] of [[-8.5, -16.5, -1.5, -8.5], [-1.5, 4.8, 5.5, 11.8]]) {
    const yC = Y + 1.2, rise = Math.min(u1 - u0, v1 - v0) / 2 * 0.5;
    K.box(STONE, u0, Y - 0.1, v0, u1, yC, v1); K.box(STONE, u0 - 0.08, yC, v0 - 0.08, u1 + 0.08, yC + 0.1, v1 + 0.08);
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], Y - 0.1, yC + rise + 0.2));
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, hw = (u1 - u0) / 2, hd = (v1 - v0) / 2, r0 = Math.min(hw, hd);
    const yb = yC + 0.1, yt = yb + rise; const ru = hw - r0, rv = hd - r0; // ridge half-lengths
    const C = [[cu - hw, cv - hd], [cu + hw, cv - hd], [cu + hw, cv + hd], [cu - hw, cv + hd]], Rg = [[cu - ru, cv - rv], [cu + ru, cv - rv], [cu + ru, cv + rv], [cu - ru, cv + rv]];
    const pos = [];
    for (let i = 0; i < 4; i++) { const a = C[i], b = C[(i + 1) % 4], ra = Rg[i], rb = Rg[(i + 1) % 4]; pos.push(a[0], yb, a[1], ra[0], yt, ra[1], b[0], yb, b[1], b[0], yb, b[1], ra[0], yt, ra[1], rb[0], yt, rb[1]); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.computeVertexNormals();
    if (gg.attributes.normal.getY(0) < 0) { const q = gg.attributes.position.array; for (let t = 0; t < q.length; t += 9) for (let c = 0; c < 3; c++) { const tmp = q[t + 3 + c]; q[t + 3 + c] = q[t + 6 + c]; q[t + 6 + c] = tmp; } gg.computeVertexNormals(); }
    K.add(GLASS, gg, { uvMode: 'roof' });
    for (let i = 0; i < 4; i++) { const a = C[i], ra = Rg[i]; const L = Math.hypot(ra[0] - a[0], yt - yb, ra[1] - a[1]); const g = new THREE.BoxGeometry(0.08, 0.08, L); g.lookAt(new THREE.Vector3(ra[0] - a[0], yt - yb, ra[1] - a[1])); g.translate((a[0] + ra[0]) / 2, (yb + yt) / 2, (a[1] + ra[1]) / 2); K.add(FRAME, g, { detail: true }); }
    for (let i = 0; i < 4; i++) { const a = C[i], b = C[(i + 1) % 4], ra = Rg[i], rb = Rg[(i + 1) % 4]; // glazing bars (rafters) on each roof face
      for (let t = 0.2; t < 0.85; t += 0.2) { const p0 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], p1 = [ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t];
        const L = Math.hypot(p1[0] - p0[0], yt - yb, p1[1] - p0[1]); const g = new THREE.BoxGeometry(0.05, 0.05, L); g.lookAt(new THREE.Vector3(p1[0] - p0[0], yt - yb, p1[1] - p0[1])); g.translate((p0[0] + p1[0]) / 2, (yb + yt) / 2 + 0.03, (p0[1] + p1[1]) / 2); K.add(FRAME, g, { detail: true }); } }
    if (ru > 0.05 || rv > 0.05) K.box(FRAME, cu - ru - 0.05, yt - 0.03, cv - rv - 0.05, cu + ru + 0.05, yt + 0.05, cv + rv + 0.05, { detail: true });
  }
  // ---- dark-green lamps on square cast-stone pedestals: a row along the walk and one inside the north parapet
  const lampAt = (u, v) => { K.box(STONE, u - 0.42, Y, v - 0.42, u + 0.42, Y + 0.9, v + 0.42); K.box(STONE, u - 0.48, Y + 0.9, v - 0.48, u + 0.48, Y + 0.98, v + 0.48);
    K.cyl(LAMP, u, Y + 0.98, v, 0.09, 0.065, 3.1, 8, { detail: true }); K.cyl(M.lampGlow, u, Y + 4.05, v, 0.12, 0.2, 0.5, 8, { detail: true }); K.cyl(LAMP, u, Y + 4.55, v, 0.22, 0.04, 0.25, 8, { detail: true });
    colliders.push(K.colCyl(u, v, 0.5, Y, Y + 1.0)); };
  for (let u = -21.5; u < 17; u += 11) lampAt(u, 16.3);
  for (let u = -7.5; u < 12; u += 11) lampAt(u, -18.6);
  // ---- north-east stair from the Glade path up to the terrace (OSM 910274557: one flight rising south along u ~ 21.3)
  {
    const u0 = 19.6, u1 = 23.0, vTop = -19.6; const gF = Math.min(K.g(21.3, -28), K.g(u0, -27.5), K.g(u1, -27.5));
    const H = Y - gF, nR = Math.max(3, Math.round(H / 0.155)), run = nR * 0.31, vBot = vTop - run;
    if (H > 0.4) {
      walkables.push(K.stairs(STONE, u0, vBot, u1, vTop, gF, Y, '+v', nR, { foot: 1.2 }));
      K.box(STONE, 18.9, gF - 1.2, vTop, u1, Y, -16.8); K.box(BRICK, 18.9, Y, vTop, u1, Y + 0.01, -16.8); walkables.push(K.walkPoly([[18.9, vTop], [u1, vTop], [u1, -16.8], [18.9, -16.8]], Y));
      K.box(STONE, u1, Y - 0.2, vTop, u1 + 0.45, Y + 0.95, -16.8); colliders.push(K.colPoly([[u1, vTop], [u1 + 0.45, vTop], [u1 + 0.45, -16.8], [u1, -16.8]], Y - 0.2, Y + 0.95)); // landing parapet
      for (const [a, b] of [[u0 - 0.45, u0], [u1, u1 + 0.45]]) { // stepped cheek walls with a lamp on the lower block
        for (let k = 0; k < 4; k++) { const va = vBot + run * k / 4, vb = vBot + run * (k + 1) / 4; const yTop = gF + H * (k + 1) / 4 + 0.6; K.box(STONE, a, gF - 1.2, va, b, yTop, vb); }
        colliders.push(K.colPoly([[a, vBot], [b, vBot], [b, vTop], [a, vTop]], gF - 1.2, Y + 0.6));
        K.box(STONE, a - 0.2, gF - 1.2, vBot - 1.1, b + 0.2, gF + 1.2, vBot); K.cyl(LAMP, (a + b) / 2, gF + 1.2, vBot - 0.55, 0.08, 0.06, 2.9, 8, { detail: true }); K.cyl(M.lampGlow, (a + b) / 2, gF + 4.1, vBot - 0.55, 0.12, 0.2, 0.5, 8, { detail: true });
      }
    }
  }
  const object3d = K.finish(); object3d.name = 'main-stacks';
  return { object3d, colliders, walkables };
}
