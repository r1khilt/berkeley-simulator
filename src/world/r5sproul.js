// [r5-sproul] The steps between Upper and Lower Sproul Plaza (Lower Sproul redevelopment, Moore Ruble Yudell + CMG, 2015).
// The ~3 m drop from Upper Sproul (Ludwig's Fountain) down to Lower Sproul, between the Golden Bear Café terrace (north)
// and the MLK Student Union (south), is a terraced garden: two concrete stairs descend west in short flights with
// landings (OSM w/669491531+515+522 along the café terrace, w/26379541 along MLK), stepped planting beds retained by
// Corten steel and board-formed concrete sit between and beside them, stainless handrails run down both edges and the
// centre, and a long timber-topped seat wall faces Lower Sproul at the bottom.
// Refs: CMG landscape photos (UCB-2/3/7), MRY 385-UCB_0001/0058, ESRI aerial (planted bed with trees between the stairs).
// Before r5 the generic OSM stair pass laid two 2.6 m flights into the smooth LiDAR slope, which read as a ramp with
// railings ("the stairs going down to Lower Sproul are absent").
//   gradeSproulSteps()  terraces the 1 m heightfield (called from groundworks.gradeTerrain, before upload)
//   buildSproulSteps()  the geometry + colliders (called from groundworks.buildGroundworks)
//   sproulStepsCovers() lets the generic OSM stair pass skip the flights rebuilt here
// ?nosproulsteps=1 disables all three.
import * as THREE from 'three';
import { Kit } from '../landmarks/lib/classic-kit.js';
import { tinted, tone, pipeRail } from '../landmarks/lib/b01-kit.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { boxUV } from '../materials.js';

const OFF = typeof location !== 'undefined' && /[?&]nosproulsteps=1/.test(location.search);
// site frame = the Golden Bear Café frame (its terrace wall and both OSM stairs run at -9.7 deg): u east, v south
const O = { x: -206.79, z: 259.04 }, ANG = THREE.MathUtils.degToRad(-9.7), CA = Math.cos(ANG), SA = Math.sin(ANG);
const xz = (u, v) => [O.x + u * CA - v * SA, O.z + u * SA + v * CA];
const uv = (x, z) => { const lx = x - O.x, lz = z - O.z; return [lx * CA + lz * SA, -lx * SA + lz * CA]; };
const SITE = { u0: 29.6, u1: 47.2, v0: 21.9, v1: 44.6 }; // built area
const GRADE = { u0: 26.5, u1: 49.5, v0: 21.0, v1: 45.6 }; // graded area (blends outside SITE)
const TOP_U = 46.8; // top nosing of both stairs (Upper Sproul edge)
// stairs: v band and flights [uTop, uBot, share of the total rise]; landings sit between flights
const STAIRS = [
  { v0: 22.55, v1: 25.45, flights: [[TOP_U, 44.4, 0.3], [41.6, 38.8, 0.35], [34.2, 31.8, 0.35]] }, // north, along the café terrace
  { v0: 34.65, v1: 37.55, flights: [[TOP_U, 43.6, 0.4], [40.6, 37.8, 0.35], [34.0, 32.4, 0.25]] }, // south, along MLK
];
const BOT_U = 29.6; // bottom landing west edge

export function sproulStepsCovers(P) {
  if (OFF || !P || !P.length) return false;
  let x = 0, z = 0; for (const p of P) { x += p[0]; z += p[1]; } x /= P.length; z /= P.length;
  const [u, v] = uv(x, z); return u > SITE.u0 - 1 && u < SITE.u1 + 2 && v > SITE.v0 - 0.5 && v < SITE.v1;
}

// levels from the (already kerb/denoise-graded) terrain: Upper Sproul at the top, Lower Sproul at the foot
function plan(G) {
  const mean = (u, vs) => vs.reduce((s, v) => s + G.at(...xz(u, v)), 0) / vs.length;
  const yU = mean(48.6, [24, 30, 36]), yB = mean(28.2, [24, 30, 36]);
  const rise = yU - yB; const nTot = Math.max(9, Math.round(rise / 0.155)); const r = rise / nTot;
  const stairs = STAIRS.map((s) => {
    let left = nTot; const fl = s.flights.map(([a, b, w], i) => { const n = i === s.flights.length - 1 ? left : Math.round(nTot * w); left -= n; return { uTop: a, uBot: b, n }; });
    let y = yU; for (const f of fl) { f.yHi = y; f.yLo = y - f.n * r; f.t = (f.uTop - f.uBot) / f.n; y = f.yLo; }
    return { ...s, fl, vc: (s.v0 + s.v1) / 2 };
  });
  return { yU, yB, r, nTot, stairs };
}
// walking height along a stair at u (tread tops), or the smooth bed under the treads
function stairY(p, st, u, bed = false) {
  if (u >= st.fl[0].uTop) return p.yU;
  for (let i = 0; i < st.fl.length; i++) {
    const f = st.fl[i];
    if (u >= f.uBot) { if (bed) return f.yLo + (f.yHi - f.yLo) * (u - f.uBot) / (f.uTop - f.uBot); const k = Math.min(f.n - 1, Math.max(0, Math.floor((u - f.uBot) / f.t))); return f.yLo + p.r * (k + 1); }
    const nx = st.fl[i + 1]; if (!nx || u >= nx.uTop) return f.yLo; // landing below this flight
  }
  return p.yB;
}
// cheek-wall coping: 0.45 m above the nosing line, level over landings
const cheekY = (p, st, u) => stairY(p, st, Math.min(u + 0.2, TOP_U + 1), true) + 0.45;
// terraced beds: cuts = terrace edges (west -> east); soil sits just under the lowest coping around it
const BEDS = {
  mid: { v0: 25.75, v1: 34.35, cuts: [30.0, 33.2, 38.0, 43.4, 47.2], st: [0, 1] },
  south: { v0: 37.85, v1: 44.6, cuts: [30.0, 36.4, 42.2, 47.2], st: [1] },
};
function bedSoil(p, bed, i) { const ua = bed.cuts[i]; let y = Infinity; for (const k of bed.st) y = Math.min(y, cheekY(p, p.stairs[k], ua)); return i === 0 ? Math.min(y, p.yB + 0.5) : y - 0.12; }

let PLAN = null;
export function gradeSproulSteps(G, heights) {
  if (OFF) return null;
  const p = PLAN = plan(G);
  const [ax, az] = xz(GRADE.u0, GRADE.v0), [bx, bz] = xz(GRADE.u1, GRADE.v0), [cx, cz] = xz(GRADE.u1, GRADE.v1), [dx, dz] = xz(GRADE.u0, GRADE.v1);
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let n = 0;
  G.each(Math.min(ax, bx, cx, dx), Math.min(az, bz, cz, dz), Math.max(ax, bx, cx, dx), Math.max(az, bz, cz, dz), (x, z, k) => {
    const [u, v] = uv(x, z); if (u < GRADE.u0 || u > GRADE.u1 || v < GRADE.v0 || v > GRADE.v1) return;
    // walking surface of the nearest stair band; beds and cheeks sit over the lower neighbour (hidden under them)
    const [N, S] = p.stairs; let y;
    if (v < N.v1 + 0.1) y = stairY(p, N, u, true);
    else if (v > S.v0 - 0.1) y = stairY(p, S, u, true);
    else y = Math.min(stairY(p, N, u, true), stairY(p, S, u, true)) - 0.25; // under the middle bed
    y -= 0.05;
    // blend back to the existing ground outside the built area (top: Upper Sproul, foot: Lower Sproul, sides: buildings)
    const w = sm(GRADE.u0, SITE.u0, u) * (1 - sm(SITE.u1 + 0.4, GRADE.u1, u)) * sm(GRADE.v0, SITE.v0 + 0.2, v) * (1 - sm(SITE.v1, GRADE.v1, v));
    if (w <= 0) return;
    heights[k] += (y - heights[k]) * w; n++;
  });
  console.log('R5 sproul steps grade', JSON.stringify({ yU: +p.yU.toFixed(2), yB: +p.yB.toFixed(2), risers: p.nTot, r: +p.r.toFixed(3), pts: n }));
  return p;
}

export function buildSproulSteps({ heightAt, physics, M }) {
  const p = PLAN; if (OFF || !p) return null;
  const K = new Kit({ M, boxUV, groundAt: (x, z) => heightAt(O.x + x, O.z + z) }, ANG);
  // light broom-finished concrete treads/landings, dark anti-slip nosings, board-formed cheek walls, weathering-steel
  // bed walls, stainless rails, ipe seat tops, dark mulch
  const tread = tone(M.concrete, 0xd2cec5), nose = tinted(M.blackPaint, 0x3c3e40, { roughness: 0.7 }), cheek = tone(M.concrete, 0xb9b4a9), cope = tone(M.concrete, 0xc6c1b6);
  const riser = tone(M.concrete, 0x8f8b84); // risers a shade darker (shadowed, weathered) so flights read as steps, not ramps
  const corten = tinted(M.iron, 0x6c3a24, { metalness: 0.1, roughness: 0.9 }), steel = tinted(M.iron, 0xb9bdc0, { metalness: 0.85, roughness: 0.3 });
  const ipe = tinted(M.wood || M.concrete, 0x9a6438, { roughness: 0.7 }), mulch = tinted(M.soil || M.concreteDark, 0xb49c80, { roughness: 1 });
  const base = (u, v) => K.g(u, v) - 0.4;
  const colls = [];
  for (const st of p.stairs) {
    const { v0, v1, fl, vc } = st;
    // flights: one solid block per step (riser on the step's west edge) + a dark nosing strip
    for (const f of fl) {
      for (let i = 0; i < f.n; i++) {
        const ua = f.uBot + i * f.t, ub = f.uBot + (i + 1) * f.t, y = f.yLo + p.r * (i + 1);
        K.box(tread, ua - 0.02, Math.min(base(ua, vc), y - 0.5), v0, ub, y, v1);
        K.box(nose, ua - 0.025, y - 0.004, v0 + 0.06, ua + 0.07, y + 0.006, v1 - 0.06);
        K.box(riser, ua - 0.032, y - p.r + 0.01, v0 + 0.02, ua - 0.022, y - 0.02, v1 - 0.02, { detail: true });
      }
    }
    // landings between flights, the top apron and the foot landing
    for (let i = 0; i + 1 < fl.length; i++) K.box(tread, fl[i + 1].uTop, fl[i].yLo - 0.5, v0, fl[i].uBot, fl[i].yLo, v1);
    K.box(tread, TOP_U, p.yU - 0.5, v0, SITE.u1 + 0.3, p.yU + 0.01, v1);
    const last = fl[fl.length - 1]; K.box(tread, BOT_U, p.yB - 0.5, v0, last.uBot, p.yB, v1);
    // stainless handrails along both edges and down the centre (flights only)
    for (const f of fl) {
      const yN = (u) => f.yLo + (f.yHi - f.yLo) * (Math.max(f.uBot, Math.min(f.uTop, u)) - f.uBot) / (f.uTop - f.uBot);
      pipeRail(K, steel, [[f.uBot - 0.25, vc], [f.uTop + 0.25, vc]], (u) => yN(u), { h: 0.9, pitch: 1.6, mid: false, r: 0.022 });
      for (const ve of [v0 + 0.12, v1 - 0.12]) pipeRail(K, steel, [[f.uBot - 0.3, ve], [f.uTop + 0.3, ve]], (u) => yN(u), { h: 0.86, pitch: 2.2, mid: false, r: 0.02 });
    }
  }
  // cheek walls (board-formed concrete) along both edges of each stair, coping 0.45 m over the nosing line
  const cheekRun = (st, va, vb) => {
    const us = [BOT_U]; for (const f of st.fl) us.push(f.uBot, f.uTop); us.push(SITE.u1); us.sort((a, b) => a - b);
    for (let i = 0; i + 1 < us.length; i++) {
      const ua = us[i], ub = us[i + 1]; if (ub - ua < 0.05) continue;
      const ya = cheekY(p, st, ua + 0.01), yb = cheekY(p, st, ub - 0.01);
      slopedBox(K, cheek, ua, ub, va, vb, Math.min(base(ua, va), ya - 1.4), ya, yb);
      slopedBox(K, cope, ua, ub, va - 0.03, vb + 0.03, ya - 0.06, ya + 0.02, yb + 0.02, { detail: true }); // coping
    }
  };
  const [N, S] = p.stairs;
  cheekRun(N, SITE.v0 + 0.05, N.v0); cheekRun(N, N.v1, N.v1 + 0.3); cheekRun(S, S.v0 - 0.3, S.v0); cheekRun(S, S.v1, S.v1 + 0.3);
  // terraced planting beds: corten walls on each terrace's downhill face, mulch, shrubs and grasses (vertex-coloured blobs)
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // planting palette from the photos: dark evergreen shrubs, olive grasses, a few red-leaved shrubs (photinia/barberry)
  const greens = [0x34502a, 0x3e5c2e, 0x2f4626, 0x4d6634, 0x5d6a38, 0x44582c, 0x6b3b2c]; const shrubs = [];
  for (const bed of Object.values(BEDS)) {
    const { v0, v1, cuts } = bed;
    for (let i = 0; i + 1 < cuts.length; i++) {
      const ua = cuts[i], ub = cuts[i + 1], ys = bedSoil(p, bed, i);
      K.box(mulch, ua, Math.min(base(ua, (v0 + v1) / 2), ys - 1.2), v0, ub, ys, v1);
      const yLow = i === 0 ? p.yB : bedSoil(p, bed, i - 1);
      K.box(corten, ua - 0.05, Math.min(yLow, base(ua, v0)) - 0.3, v0, ua + 0.05, ys + 0.22, v1);
      for (let u = ua + 0.7; u < ub - 0.45; u += 1.15) for (let v = v0 + 0.6; v < v1 - 0.45; v += 1.15) {
        if (rnd() < 0.22) continue;
        const r0 = 0.32 + rnd() * 0.36, hx = greens[Math.floor(rnd() * (rnd() < 0.9 ? greens.length - 1 : greens.length))];
        shrubs.push(...shrubClump(rnd, u + (rnd() - 0.5) * 0.4, ys - 0.05, v + (rnd() - 0.5) * 0.4, r0, hx));
      }
    }
    // top edge along Upper Sproul: a low concrete seat wall closing the beds
    K.box(cheek, SITE.u1 - 0.3, Math.min(base(SITE.u1, v0), p.yU - 1), v0, SITE.u1 + 0.05, p.yU + 0.45, v1);
    K.box(cope, SITE.u1 - 0.34, p.yU + 0.43, v0 - 0.02, SITE.u1 + 0.09, p.yU + 0.5, v1 + 0.02, { detail: true });
    colls.push([[cuts[0] - 0.1, v0 - 0.3], [SITE.u1 + 0.05, v0 - 0.3], [SITE.u1 + 0.05, v1 + 0.3], [cuts[0] - 0.1, v1 + 0.3]]);
  }
  // seat wall with an ipe top facing Lower Sproul at the foot of the middle bed (+ a broad seat step in front)
  { const { v0, v1 } = BEDS.mid; const ys = p.yB + 0.46;
    K.box(cheek, 28.95, p.yB - 0.4, v0 - 0.3, 29.95, p.yB + 0.18, v1 + 0.3);
    K.box(cheek, 29.55, p.yB - 0.4, v0 - 0.3, 30.05, ys - 0.06, v1 + 0.3);
    for (let v = v0 - 0.25; v < v1 + 0.25; v += 0.13) K.box(ipe, 29.6, ys - 0.06, v, 30.0, ys, Math.min(v1 + 0.3, v + 0.1), { detail: true });
    colls.push([[29.55, v0 - 0.3], [30.1, v0 - 0.3], [30.1, v1 + 0.3], [29.55, v1 + 0.3]]); }
  // north cheek strip against the café terrace wall
  colls.push([[BOT_U, SITE.v0 + 0.05], [SITE.u1, SITE.v0 + 0.05], [SITE.u1, N.v0], [BOT_U, N.v0]]);
  if (shrubs.length) { const mg = mergeGeometries(shrubs, false); if (mg) { const m = new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, name: 'r5-shrubs' })); m.userData.detail = true; m.castShadow = true; m.receiveShadow = true; K.extra.push(m); } }
  const obj = K.finish(); obj.position.set(O.x, 0, O.z); obj.name = 'r5:sproul-steps';
  obj.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; if (o.parent && o.parent.userData.detail) o.castShadow = false; } });
  // colliders: beds and cheeks are solid; the stairs are walked on the graded bed (like the other groundworks flights)
  if (physics) for (const c of colls) physics.addRing(c.map(([u, v]) => xz(u, v)), p.yB - 3, p.yU + 0.5, 'r5-sproul-steps');
  return obj;
}
// shrub clump: 2-4 overlapping noisy spheres, smooth-shaded, vertex colours darker underneath (fake contact AO)
function shrubClump(rnd, u, y, v, r, hex) {
  const out = []; const base = new THREE.Color(hex); const n = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const rr = r * (0.55 + rnd() * 0.45); const g = new THREE.IcosahedronGeometry(rr, 2); const p = g.attributes.position; const col = new Float32Array(p.count * 3);
    const ox = (rnd() - 0.5) * r * 0.9, oz = (rnd() - 0.5) * r * 0.9, sq = 0.62 + rnd() * 0.2;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), yy = p.getY(k), z = p.getZ(k); const nn = 0.86 + 0.28 * Math.abs(Math.sin(x * 7.1 + z * 5.3 + yy * 9.7 + i));
      p.setXYZ(k, x * nn, yy * nn * sq, z * nn);
      const t = Math.max(0, Math.min(1, (yy / rr + 1) / 2)); const shade = 0.55 + 0.55 * t; const var_ = 0.92 + 0.16 * Math.abs(Math.sin(k * 1.7));
      col[k * 3] = base.r * shade * var_; col[k * 3 + 1] = base.g * shade * var_; col[k * 3 + 2] = base.b * shade * var_;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv'); g.computeVertexNormals();
    g.translate(u + ox, y + rr * sq * 0.55, v + oz); out.push(g);
  }
  return out;
}
// a box whose top slopes from ya (at u0) to yb (at u1), across v0..v1, bottom at y0 (building frame u, y, v)
function slopedBox(K, mat, u0, u1, v0, v1, y0, ya, yb, opts) {
  const P = [[u0, y0, v0], [u1, y0, v0], [u1, yb, v0], [u0, ya, v0], [u0, y0, v1], [u1, y0, v1], [u1, yb, v1], [u0, ya, v1]];
  const F = [[0, 3, 2, 1], [4, 5, 6, 7], [3, 7, 6, 2], [0, 1, 5, 4], [0, 4, 7, 3], [1, 2, 6, 5]];
  const pos = []; for (const f of F) { const [a, b, c, d] = f.map((i) => P[i]); pos.push(...a, ...b, ...c, ...a, ...c, ...d); }
  // outward winding: flip any triangle whose normal points toward the box centre
  const cx = (u0 + u1) / 2, cy = (y0 + Math.max(ya, yb)) / 2, cz = (v0 + v1) / 2;
  for (let i = 0; i < pos.length; i += 9) {
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2], wx = pos[i + 6] - pos[i], wy = pos[i + 7] - pos[i + 1], wz = pos[i + 8] - pos[i + 2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const mx = (pos[i] + pos[i + 3] + pos[i + 6]) / 3 - cx, my = (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3 - cy, mz = (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3 - cz;
    if (nx * mx + ny * my + nz * mz < 0) for (let j = 0; j < 3; j++) { const t = pos[i + 3 + j]; pos[i + 3 + j] = pos[i + 6 + j]; pos[i + 6 + j] = t; }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); K.add(mat, g, opts);
}
