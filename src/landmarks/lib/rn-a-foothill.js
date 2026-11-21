// Refine-north helper A: Foothill student housing (William Turnbull Jr. & Associates, 1990-91), refined Bay Region shingle kit.
// Replaces the look of lib/b08c-foothill.js for the refine-north Foothill modules without touching that shared kit:
// - weathered dark-brown cedar shingle (baked: random widths, butt shadow lines, grain, keyways), pale vertical board-and-batten
//   on some upper storeys / gables, board-formed concrete plinth, dark grey-green composition roof, dark green trim
// - windows grouped in pairs/triples (cream sashes, upper fixed lite over casement) inside one dark green surround, stacked in
//   vertical bays with plain shingle wall between; steep 40-49 degree gables with green bargeboards; pale vent chimney
// - projecting gabled bays (cross-gables) instead of the white diamond-fret balcony stacks
// - finished ground floor: entries where the packet's paths arrive (green portal, glazed doors, landing/steps, sconces,
//   brick-red accent panels, warm-wood + green-steel trellis), foundation planting, bike racks, lamps, benches
import * as THREE from 'three';
import { Kit, polysGeo } from './classic-kit.js';
import { fhBoxBay } from './b08c-foothill.js';
import { bakeMat, entry, planting, pathEntrances, bikes, furniture, propAt, rnMats, gRun } from './rn-kit.js';
import { fbm, vnoise, hash2 } from '../../lib/noise.js';

const C3 = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const wrap = (k, n) => ((k % n) + n) % n;

const _fm = new WeakMap();
export function faMats(M) {
  if (_fm.has(M)) return _fm.get(M);
  // weathered stained cedar shingles: 13 courses per 2 m (0.154 m exposure), 9 shingles per course per tile, random widths
  const S1 = C3(0x433d39), S2 = C3(0x4f4741), S3 = C3(0x38322f), S4 = C3(0x615850);
  const NC = 10, NW = 7;
  const shingle = bakeMat('fa:shingle6', (u, v) => {
    const cv = v * NC; const row = Math.floor(cv); const fv = cv - row; const r = wrap(row, NC);
    const x = u * NW + Math.floor(hash2(r, 3, 1) * NW) + 0.5 * (r % 2); let k = Math.floor(x);
    const jit = (kk) => (hash2(wrap(kk, NW), r, 2) - 0.5) * 0.7;
    if (x < k + jit(k)) k -= 1;
    const left = k + jit(k), right = k + 1 + jit(k + 1); const dm = Math.min(x - left, right - x) / NW * 2; // metres to nearest keyway
    const km = wrap(k, NW); const h = hash2(km, r, 7);
    const base = mix(S1, h < 0.5 ? S2 : S3, Math.abs(h - 0.5) * 0.6);
    const grain = 0.93 + 0.14 * vnoise(u * 256, r * 11 + fv * 1.5, 256, 4);
    const streak = 0.8 + 0.38 * vnoise(u * 28, 3.5, 28, 12) * (0.6 + 0.4 * fbm(u * 2, v * 2, 2, 2, 5)); // vertical weathering streaks
    let kk = grain * streak * (0.97 + 0.06 * (1 - fv));
    let ht = 0.3 + 0.7 * (1 - fv);
    if (fv > 0.86) kk *= 0.78 + (1 - fv) * 1.5; // soft shadow line under the next course butt // soft shadow under the next course butt
    if (dm < 0.004) { kk *= 0.94; ht = 0.2; } // faint keyway
    return [base[0] * kk, base[1] * kk, base[2] * kk, ht, 0.93];
  }, { size: 512, span: 2, normal: 3, rough: 0.93 });
  // pale grey-green vertical board-and-batten (0.25 m)
  const B0 = C3(0x9eaa9d);
  const board = bakeMat('fa:board', (u, v) => {
    const x = u * 8; const i = Math.floor(x); const f = x - i; const bat = f < 0.18; const edge = Math.abs(f - 0.18) < 0.025 || f > 0.975;
    const kk = (0.96 + 0.06 * hash2(i, 1, 3)) * (0.95 + 0.08 * fbm(u * 6, v * 6, 6, 3, 2)) * (bat ? 1.05 : 1) * (edge ? 0.7 : 1);
    return [B0[0] * kk, B0[1] * kk, B0[2] * kk, bat ? 0.9 : 0.4, 0.75];
  }, { size: 256, span: 2, normal: 3, rough: 0.75 });
  // board-formed concrete (0.154 m form boards)
  const P0 = C3(0xbab4a8);
  const plinth = bakeMat('fa:plinth', (u, v) => {
    const y = v * 13; const r = Math.floor(y); const f = y - r; const j = f < 0.05;
    const kk = (0.95 + 0.08 * hash2(wrap(r, 13), 5, 1)) * (0.9 + 0.16 * fbm(u * 10, v * 10, 10, 4, 3)) * (j ? 0.8 : 1) * (0.97 + 0.06 * vnoise(u * 64, r * 3, 64, 8));
    return [P0[0] * kk, P0[1] * kk, P0[2] * kk, j ? 0.2 : 0.55, 0.92];
  }, { size: 256, span: 2, normal: 2, rough: 0.92 });
  // dark grey-green composition shingle roof: 14 courses per 2 m, 3-tab slots, granules
  const R0 = C3(0x3c423d);
  const roof = bakeMat('fa:roof', (u, v) => {
    const y = v * 14; const r = Math.floor(y); const f = y - r; const x = u * 6 + (r % 2) * 0.5; const t = Math.floor(x); const fx = x - t;
    const slot = fx < 0.025 && f < 0.75; const sh = f > 0.86;
    const gran = 0.86 + 0.28 * hash2(Math.floor(u * 256), Math.floor(v * 256), 3);
    const kk = (0.9 + 0.18 * hash2(wrap(t, 6), wrap(r, 14), 4)) * gran * (sh ? 0.62 : 1) * (slot ? 0.6 : 1) * (0.94 + 0.12 * fbm(u * 4, v * 4, 4, 3, 6));
    return [R0[0] * kk, R0[1] * kk, R0[2] * kk, sh ? 0.2 : 0.3 + 0.6 * (1 - f), 0.88];
  }, { size: 256, span: 2, normal: 3, rough: 0.88 });
  const o = {
    shingle, board, plinth, roof,
    trim: new THREE.MeshStandardMaterial({ color: 0x263c30, roughness: 0.55, name: 'fa:trim' }),
    sash: new THREE.MeshStandardMaterial({ color: 0xddd5bf, roughness: 0.5, name: 'fa:sash' }),
    red: new THREE.MeshStandardMaterial({ color: 0x74302a, roughness: 0.75, name: 'fa:red' }),
    wood: new THREE.MeshStandardMaterial({ color: 0x9a5a36, roughness: 0.75, name: 'fa:wood' }),
    steel: new THREE.MeshStandardMaterial({ color: 0x2d4536, roughness: 0.45, metalness: 0.45, name: 'fa:steel' }),
  };
  _fm.set(M, o); return o;
}

// box from A to B (building frame [u, y, v]) with w horizontal thickness and h depth hanging below the line
export function beam(K, mat, A, B, w, h, opts) {
  const a = new THREE.Vector3(...A), b = new THREE.Vector3(...B); const d = b.clone().sub(a); const L = d.length(); if (L < 1e-3) return;
  const g = new THREE.BoxGeometry(L, h, w); g.translate(L / 2, -h / 2, 0);
  const dir = d.normalize(); const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
  if (side.lengthSq() < 1e-6) side.set(0, 0, 1); side.normalize(); const up = new THREE.Vector3().crossVectors(side, dir);
  const m = new THREE.Matrix4().makeBasis(dir, up, side); m.setPosition(a); g.applyMatrix4(m); K.add(mat, g, opts);
}
const runPt = (R, s, y, d) => { const p = R.at(s, d); return [p[0], y, p[1]]; };

// window-bay pattern: groups of gs windows separated by gap blank bays, centred, with endBlank blank bays at each end
function winOn(nb, gs, gap, endBlank) {
  const on = new Array(nb).fill(false); const usable = nb - 2 * endBlank;
  if (usable < 1) { if (nb >= 1) on[Math.floor(nb / 2)] = true; return on; }
  const g = Math.min(gs, usable); const ng = Math.max(1, Math.floor((usable + gap) / (g + gap)));
  const used = ng * g + (ng - 1) * gap; const start = Math.floor((nb - used) / 2);
  for (let q = 0; q < ng; q++) for (let i = 0; i < g; i++) { const k = start + q * (g + gap) + i; if (k >= 0 && k < nb) on[k] = true; }
  return on;
}

export const FA_BAY = 1.02, FA_FH = 2.9, FA_UW = 0.82;
// grouped window in an opening o {s0,s1,y0,y1,k}: dark glass, cream centre mullion + transom per unit, green posts between
// units, one green surround (sill, head, jambs) around the group
export function faWin(K, F, R, o, rev = 0.15) {
  const k = o.k || 1; const pw = k > 1 ? ((o.s1 - o.s0) - k * FA_UW) / (k - 1) : 0; const uw = k > 1 ? FA_UW : o.s1 - o.s0; const h = o.y1 - o.y0;
  const gg = new THREE.PlaneGeometry(o.s1 - o.s0, h); gg.translate((o.s0 + o.s1) / 2, (o.y0 + o.y1) / 2, -rev); K.addRun(R, K.M.windowNight, gg, { uvMode: 'keep' });
  const ty = o.y0 + h * 0.68, fd = -rev + 0.06, fw = 0.09;
  K.rbox(R, F.sash, o.s0, o.y0, -rev, o.s1, o.y0 + 0.11, fd, { detail: true }); K.rbox(R, F.sash, o.s0, o.y1 - fw, -rev, o.s1, o.y1, fd, { detail: true });
  K.rbox(R, F.sash, o.s0, o.y0, -rev, o.s0 + fw, o.y1, fd, { detail: true }); K.rbox(R, F.sash, o.s1 - fw, o.y0, -rev, o.s1, o.y1, fd, { detail: true });
  K.rbox(R, F.sash, o.s0, ty - 0.045, -rev, o.s1, ty + 0.045, fd, { detail: true }); K.rbox(R, F.sash, o.s0, o.y0 + h * 0.34 - 0.025, -rev, o.s1, o.y0 + h * 0.34 + 0.025, fd - 0.01, { detail: true });
  for (let i = 0; i < k; i++) {
    const a = o.s0 + i * (uw + pw);
    K.rbox(R, F.sash, a + uw / 2 - 0.04, o.y0, -rev, a + uw / 2 + 0.04, ty, fd - 0.01, { detail: true });
    if (i < k - 1) K.rbox(R, F.sash, a + uw - 0.02, o.y0, -rev, a + uw + pw + 0.02, o.y1, fd + 0.02, { detail: true });
  }
  K.rbox(R, F.trim, o.s0 - 0.2, o.y0 - 0.14, -0.02, o.s1 + 0.2, o.y0, 0.08, { detail: true });
  K.rbox(R, F.trim, o.s0 - 0.15, o.y1, -0.02, o.s1 + 0.15, o.y1 + 0.15, 0.06, { detail: true });
  K.rbox(R, F.trim, o.s0 - 0.11, o.y0, -0.02, o.s0, o.y1, 0.05, { detail: true }); K.rbox(R, F.trim, o.s1, o.y0, -0.02, o.s1 + 0.11, o.y1, 0.05, { detail: true });
}

// One shingled wing. b: {u0,u1,v0,v1,g,eave,ridge,axis, faces?, roof?:'gable'|'flat', two?:bool, chimney?:bool, blank?:{S:[[s0,s1]]...}}
export function faWing(K, b, F) {
  const span = (b.axis === 'u' ? b.v1 - b.v0 : b.u1 - b.u0) / 2;
  let eave = b.eave, ridge = b.ridge;
  if (b.roof !== 'flat') { const lo = span * 0.75, hi = span * 1.1; if (ridge - eave < lo) eave = ridge - lo; if (ridge - eave > hi) eave = ridge - hi; }
  eave = Math.max(eave, b.g + 3.9);
  if (b.roof !== 'flat' && ridge - eave < span * 0.6) ridge = eave + span * 0.75;
  const base = b.g + 0.5, y0 = b.g - 1.6, floor1 = base + 0.55;
  const top = eave - 0.35; const n = Math.max(1, Math.round((top - floor1) / FA_FH)); const h = (top - floor1) / n;
  const two = !!b.two;
  const stories = [{ y0, y1: floor1, mat: F.plinth }]; let y = floor1;
  for (let i = 0; i < n; i++) {
    const wh = Math.min(1.95, h - 0.7);
    stories.push({ y0: y, y1: y + h, mat: two && n > 1 && i === n - 1 ? F.board : F.shingle, win: { sill: Math.max(0.45, (h - wh) * 0.58), h: wh, w: FA_UW, mull: 1, tran: 0.66, noSill: true } });
    y += h;
  }
  if (y < eave - 0.01) stories.push({ y0: y, y1: eave, mat: two ? F.board : F.shingle });
  const defs = { S: [[b.u0, b.v1], [b.u1, b.v1]], E: [[b.u1, b.v1], [b.u1, b.v0]], N: [[b.u1, b.v0], [b.u0, b.v0]], W: [[b.u0, b.v0], [b.u0, b.v1]] };
  const faces = {}, groups = {};
  for (const f of ['S', 'E', 'N', 'W']) {
    if (b.faces?.[f] === false) { faces[f] = false; continue; }
    const [a, c] = defs[f]; const L = Math.hypot(c[0] - a[0], c[1] - a[1]); const nb = Math.max(1, Math.round(L / FA_BAY));
    const gableEnd = b.roof !== 'flat' && ((b.axis === 'u') === (f === 'E' || f === 'W'));
    const sd = Math.round(b.u0 * 7 + b.v0 * 13) + f.charCodeAt(0);
    const gs = hash2(sd, 1, 2) < 0.55 ? 2 : 3; const gp = gs === 3 ? 2 : (hash2(sd, 2, 2) < 0.45 ? 1 : 2);
    const on = gableEnd ? winOn(nb, nb >= 11 ? 3 : 2, 3, nb >= 6 ? 1 : 0) : winOn(nb, gs, gp, 1);
    for (const [s0, s1] of (b.blank?.[f] || [])) for (let i = 0; i < nb; i++) { const cc = L * (i + 0.5) / nb; if (cc > s0 - 0.5 && cc < s1 + 0.5) on[i] = false; }
    faces[f] = { nb, skip: on.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0) };
    groups[f] = { nb, on };
  }
  // walls: one opening per window group (units of FA_UW separated by green posts), real reveals
  const runs = {};
  for (const f of Object.keys(groups)) {
    const R = K.run(defs[f][0], defs[f][1]); runs[f] = R; const G = groups[f]; const bw = R.L / G.nb; const gap = (bw - FA_UW) / 2;
    const grp = []; for (let i = 0; i < G.nb;) { if (!G.on[i]) { i++; continue; } let j = i; while (j + 1 < G.nb && G.on[j + 1]) j++; grp.push([bw * i + gap, bw * (j + 1) - gap, j - i + 1]); i = j + 1; }
    for (const st of stories) {
      const ops = st.win ? grp.map(([s0, s1, k]) => ({ s0, s1, k, y0: st.y0 + st.win.sill, y1: st.y0 + st.win.sill + st.win.h })) : [];
      K.wall(R, st.mat, 0, R.L, st.y0, st.y1, ops, 0.3);
      for (const o of ops) faWin(K, F, R, o);
    }
    K.rbox(R, F.trim, -0.12, eave - 0.24, -0.02, R.L + 0.12, eave, 0.12); // eave fascia
    K.rbox(R, F.trim, -0.02, floor1 - 0.1, -0.02, 0.17, eave, 0.05); K.rbox(R, F.trim, R.L - 0.17, floor1 - 0.1, -0.02, R.L + 0.02, eave, 0.05); // corner boards
    K.rbox(R, F.trim, 0, floor1 - 0.12, 0, R.L, floor1 + 0.06, 0.06); // water table over the plinth
    if (two && n > 1) K.rbox(R, F.trim, -0.05, floor1 + h * (n - 1) - 0.1, -0.02, R.L + 0.05, floor1 + h * (n - 1) + 0.12, 0.11); // belt where shingle meets board
  }
  K.box(K.M.concreteDark, b.u0 + 0.5, y0, b.v0 + 0.5, b.u1 - 0.5, eave - 0.3, b.v1 - 0.5); // core behind the glass
  if (b.roof === 'flat') {
    K.box(F.roof, b.u0 + 0.15, eave - 0.3, b.v0 + 0.15, b.u1 - 0.15, eave - 0.05, b.v1 - 0.15);
    for (const f of Object.keys(runs)) K.rbox(runs[f], F.trim, -0.1, eave, -0.3, runs[f].L + 0.1, eave + 0.45, 0.06);
  } else K.gable(F.roof, b.u0, b.v0, b.u1, b.v1, eave, ridge - eave, b.axis, { overhang: 0.55, wallMat: two ? F.board : F.shingle, thick: 0.2 });
  // green bargeboards along the gable rakes
  if (b.roof !== 'flat') {
    const ov = 0.55, rise = ridge - eave;
    if (b.axis === 'u') {
      const vm = (b.v0 + b.v1) / 2, sl = ov * rise / ((b.v1 - b.v0) / 2);
      for (const uu of [b.u0 - ov - 0.03, b.u1 + ov + 0.03]) { beam(K, F.trim, [uu, eave - sl + 0.02, b.v0 - ov], [uu, ridge + 0.02, vm], 0.07, 0.34); beam(K, F.trim, [uu, ridge + 0.02, vm], [uu, eave - sl + 0.02, b.v1 + ov], 0.07, 0.34); }
    } else {
      const um = (b.u0 + b.u1) / 2, sl = ov * rise / ((b.u1 - b.u0) / 2);
      for (const vv of [b.v0 - ov - 0.03, b.v1 + ov + 0.03]) { beam(K, F.trim, [b.u0 - ov, eave - sl + 0.02, vv], [um, ridge + 0.02, vv], 0.07, 0.34); beam(K, F.trim, [um, ridge + 0.02, vv], [b.u1 + ov, eave - sl + 0.02, vv], 0.07, 0.34); }
    }
    // ridge cap
    if (b.axis === 'u') K.box(F.trim, b.u0 - ov, ridge - 0.02, (b.v0 + b.v1) / 2 - 0.09, b.u1 + ov, ridge + 0.1, (b.v0 + b.v1) / 2 + 0.09);
    else K.box(F.trim, (b.u0 + b.u1) / 2 - 0.09, ridge - 0.02, b.v0 - ov, (b.u0 + b.u1) / 2 + 0.09, ridge + 0.1, b.v1 + ov);
  }
  // pale shingled vent chimney rising through the ridge (replaces the old louvred cupola)
  if (b.chimney && b.roof !== 'flat') {
    const cu = b.axis === 'u' ? b.u0 + (b.u1 - b.u0) * 0.62 : (b.u0 + b.u1) / 2, cv = b.axis === 'u' ? (b.v0 + b.v1) / 2 : b.v0 + (b.v1 - b.v0) * 0.62;
    K.box(F.board, cu - 0.75, ridge - 2.2, cv - 0.75, cu + 0.75, ridge + 2.1, cv + 0.75);
    K.box(F.trim, cu - 0.9, ridge + 2.1, cv - 0.9, cu + 0.9, ridge + 2.32, cv + 0.9);
    K.box(F.trim, cu - 0.55, ridge + 2.32, cv - 0.55, cu + 0.55, ridge + 2.5, cv + 0.55);
  }
  return { eave, ridge, runs, stories, floor1, base, n, h };
}

// Projecting gabled bay (a cross-gable): shingled bay d deep on run R at s, grouped window pair per storey, steep front gable
// clad in pale board with a small attic window and green bargeboards.
export function faGableBay(K, F, R, s, w, g, eave, { d = 1.0, board = true } = {}) {
  const M = K.M; const base = g + 1.05; const top = eave + 0.15;
  const Rf = K.run(R.at(s - w / 2, d), R.at(s + w / 2, d));
  const n = Math.max(1, Math.round((eave - 0.35 - base) / FA_FH)); const h = (eave - 0.35 - base) / n;
  const k2 = w >= 2.8 ? 2 : 1; const gw = k2 * FA_UW + (k2 - 1) * 0.2; const ops = [];
  for (let k = 0; k < n; k++) {
    const wh = Math.min(1.95, h - 0.7); const wy0 = base + k * h + Math.max(0.5, (h - wh) * 0.58);
    ops.push({ s0: w / 2 - gw / 2, s1: w / 2 + gw / 2, y0: wy0, y1: wy0 + wh, k: k2 });
  }
  K.wall(Rf, F.shingle, 0, w, base - 0.1, top, ops, d + 0.3);
  K.rbox(Rf, F.plinth, -0.04, g - 1.6, -(d + 0.3), w + 0.04, base - 0.1, 0.04);
  for (const o of ops) faWin(K, F, Rf, o);
  for (const ss of [0, w]) K.rbox(Rf, F.trim, ss - 0.09, base - 0.1, -0.02, ss + 0.09, top, 0.05);
  // steep front gable
  const rise = (w / 2) * 1.2, yE = top, ov = 0.32, back = d + 1.4, sl = ov * 1.2;
  const P = (ss, yy, dd) => [ss, yy, dd];
  const q1 = [P(s - w / 2 - ov, yE - sl, d + ov), P(s, yE + rise, d + ov), P(s, yE + rise, d - back), P(s - w / 2 - ov, yE - sl, d - back)];
  const q2 = [P(s, yE + rise, d + ov), P(s + w / 2 + ov, yE - sl, d + ov), P(s + w / 2 + ov, yE - sl, d - back), P(s, yE + rise, d - back)];
  const rg = polysGeo([q1.slice().reverse(), q2.slice().reverse()]); rg.applyMatrix4(R.m); K.add(F.roof, rg, { uvMode: 'roof' });
  const ug = polysGeo([q1.map(([a, y, c]) => [a, y - 0.14, c]), q2.map(([a, y, c]) => [a, y - 0.14, c])]); ug.applyMatrix4(R.m); K.add(F.roof, ug, { uvMode: 'roof' });
  const tri = new THREE.Shape(); tri.moveTo(s - w / 2, yE); tri.lineTo(s + w / 2, yE); tri.lineTo(s, yE + rise - 0.05); tri.lineTo(s - w / 2, yE);
  const tg = new THREE.ShapeGeometry(tri); tg.translate(0, 0, d); K.addRun(R, board ? F.board : F.shingle, tg, { uvMode: 'box' });
  const tb = new THREE.ShapeGeometry(tri); tb.rotateY(Math.PI); tb.translate(2 * s, 0, d - 0.02); K.addRun(R, F.trim, tb, { uvMode: 'box' });
  K.rbox(R, F.trim, s - w / 2 - 0.05, yE - 0.12, d - 0.02, s + w / 2 + 0.05, yE + 0.06, d + 0.08); // belt under the gable
  const aw = Math.min(0.75, w * 0.18), ay = yE + rise * 0.22;
  K.rbox(R, M.windowNight, s - aw, ay, d - 0.02, s + aw, ay + aw * 1.6, d + 0.015);
  K.rbox(R, F.sash, s - 0.03, ay, d, s + 0.03, ay + aw * 1.6, d + 0.04, { detail: true });
  for (const [a0, a1, b0, b1] of [[s - aw - 0.1, s + aw + 0.1, ay - 0.12, ay], [s - aw - 0.1, s + aw + 0.1, ay + aw * 1.6, ay + aw * 1.6 + 0.12], [s - aw - 0.1, s - aw, ay, ay + aw * 1.6], [s + aw, s + aw + 0.1, ay, ay + aw * 1.6]]) K.rbox(R, F.trim, a0, b0, d, a1, b1, d + 0.05, { detail: true });
  const A = runPt(R, s - w / 2 - ov, yE - sl + 0.02, d + ov + 0.03), T = runPt(R, s, yE + rise + 0.02, d + ov + 0.03), B = runPt(R, s + w / 2 + ov, yE - sl + 0.02, d + ov + 0.03);
  beam(K, F.trim, A, T, 0.07, 0.32); beam(K, F.trim, T, B, 0.07, 0.32);
}

// two-storey box bay (fhBoxBay geometry with this kit's materials)
export function faBoxBay(K, F, R, s, w, y0, floors = 2, o) {
  fhBoxBay(K, { cedar: F.shingle, trim: F.trim, sash: F.sash, roof: F.roof }, R, s, w, y0, floors, o);
}

// green-steel and warm-wood trellis (pergola) projecting from run R at s
export function faTrellis(K, F, R, s, w, y, d = 2.7, cols) {
  for (const sg of [-1, 1]) {
    const ss = s + sg * w / 2; const g2 = gRun(K, R, ss, d - 0.1);
    K.rbox(R, F.wood, ss - 0.12, Math.min(g2, y - 3) - 0.4, d - 0.26, ss + 0.12, y, d - 0.02);
    K.rbox(R, F.plinth, ss - 0.22, g2 - 0.4, d - 0.36, ss + 0.22, g2 + 0.25, d + 0.08);
    beam(K, F.steel, runPt(R, ss, y - 0.9, d - 0.14), runPt(R, ss - sg * 0.9, y + 0.02, d - 0.14), 0.08, 0.1, { detail: true });
    if (cols) { const p = R.at(ss, d - 0.14); cols.push(K.colCyl(p[0], p[1], 0.18, g2 - 0.5, y)); }
  }
  K.rbox(R, F.steel, s - w / 2 - 0.5, y, d - 0.22, s + w / 2 + 0.5, y + 0.28, d - 0.06, { detail: true });
  K.rbox(R, F.steel, s - w / 2 - 0.5, y, 0, s + w / 2 + 0.5, y + 0.28, 0.14, { detail: true });
  const ns = Math.round((w + 0.8) / 0.38);
  for (let i = 0; i <= ns; i++) { const x = s - w / 2 - 0.4 + (w + 0.8) * i / ns; K.rbox(R, F.steel, x - 0.035, y + 0.28, 0.0, x + 0.035, y + 0.46, d + 0.35, { detail: true }); }
}

// entrance on run R at s for a wing whose ground floor is at floor1
export function faEntry(K, F, R, s, floor1, { trellis = true, cols = [], walks = [] } = {}) {
  const gy = gRun(K, R, s, 1.4);
  const fl = floor1 > gy && floor1 - gy < 2.4 ? floor1 : gy + 0.15;
  const r = entry(K, R, s, { w: 1.9, h: 2.5, floor: fl, grade: gy, surround: F.trim, sw: 0.17, sp: 0.15, frame: F.trim, door: 'glass', stepMat: F.plinth, landing: 1.3, canopy: false, lamps: true });
  walks.push(...r.walkables); cols.push(...r.colliders);
  for (const sg of [-1, 1]) K.rbox(R, F.red, s + sg * 1.12, fl, -0.01, s + sg * 1.72, fl + 2.85, 0.035);
  if (trellis) faTrellis(K, F, R, s, 5.6, fl + 3.4, 3.1, cols);
  return r;
}

// Build a whole Foothill building from LiDAR-fitted blocks.
// extras(K, F, wings, colliders, walkables) adds bays/towers. o: { entries: max count, bikes: true, ent: manual [{block, face, s}] }
export function faBuild(ctx, angDeg, blocks, extras, o = {}) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(angDeg)); const F = faMats(ctx.M); const X = rnMats(ctx.M);
  const colliders = [], walkables = []; const segs = [];
  let longest = null, lmax = 0;
  for (const b of blocks) { const L = b.axis === 'u' ? b.u1 - b.u0 : b.v1 - b.v0; if (b.roof !== 'flat' && L > lmax) { lmax = L; longest = b; } }
  blocks.forEach((b, bi) => {
    const L = b.axis === 'u' ? b.u1 - b.u0 : b.v1 - b.v0; const n = b.split === false ? 1 : Math.max(1, Math.round(L / 12.5));
    for (let i = 0; i < n; i++) {
      const a0 = (b.axis === 'u' ? b.u0 : b.v0) + L * i / n, a1 = (b.axis === 'u' ? b.u0 : b.v0) + L * (i + 1) / n;
      const odd = n > 1 && i % 2 === 1; const e = odd ? 0.35 : 0; const dy = odd ? 0.9 : 0;
      const seg = b.axis === 'u' ? { ...b, u0: a0, u1: a1, v0: b.v0 - e, v1: b.v1 + e } : { ...b, v0: a0, v1: a1, u0: b.u0 - e, u1: b.u1 + e };
      seg.eave = b.eave + dy; seg.ridge = b.ridge + dy; seg.chimney = b === longest && i === Math.floor(n / 2) && b.roof !== 'flat';
      seg.two = b.two ?? ((bi + i) % 3 === 1); seg.faces = { ...(b.faces || {}) }; seg.blank = {}; seg.bi = bi;
      if (n > 1 && !odd) { if (b.axis === 'u') { if (i > 0) seg.faces.W = false; if (i < n - 1) seg.faces.E = false; } else { if (i > 0) seg.faces.N = false; if (i < n - 1) seg.faces.S = false; } }
      segs.push(seg);
    }
    colliders.push(K.colPoly([[b.u0, b.v0], [b.u1, b.v0], [b.u1, b.v1], [b.u0, b.v1]], -2, b.ridge + 1.5));
  });
  const inside = (u, v, m = 0.3, skipBi = -1) => blocks.some((b, bi) => bi !== skipBi && u > b.u0 - m && u < b.u1 + m && v > b.v0 - m && v < b.v1 + m);
  const defs = (b) => ({ S: [[b.u0, b.v1], [b.u1, b.v1]], E: [[b.u1, b.v1], [b.u1, b.v0]], N: [[b.u1, b.v0], [b.u0, b.v0]], W: [[b.u0, b.v0], [b.u0, b.v1]] });
  const ext = []; // exterior face runs (for entrances and planting)
  for (const seg of segs) for (const f of ['S', 'E', 'N', 'W']) { if (seg.faces[f] === false) continue; const [a, c] = defs(seg)[f]; ext.push({ R: K.run(a, c), seg, f }); }
  let ents = [];
  if (o.ent) ents = o.ent.map((e) => { const x = ext.find((r) => r.seg.bi === e.block && r.f === e.face && e.s >= 0); return x ? { R: x.R, s: e.s, seg: x.seg, f: x.f } : null; }).filter(Boolean);
  else {
    const cand = pathEntrances(K, ctx, ext.map((r) => r.R), { maxDist: 4.5, merge: 10 });
    for (const c of cand) {
      const x = ext.find((r) => r.R === c.R); const p = c.R.at(c.s, 1.5);
      if (inside(p[0], p[1], 0.1)) continue; if (c.s < 2.4 || c.s > c.R.L - 2.4) continue;
      if (ents.some((e) => Math.hypot(e.R.at(e.s)[0] - c.R.at(c.s)[0], e.R.at(e.s)[1] - c.R.at(c.s)[1]) < 12)) continue;
      ents.push({ R: c.R, s: c.s, seg: x.seg, f: x.f }); if (o.debug) console.log('fa entry', x.seg.bi, x.f, c.s.toFixed(1), c.kind, c.n); if (ents.length >= (o.entries ?? 2)) break;
    }
  }
  for (const e of ents) (e.seg.blank[e.f] = e.seg.blank[e.f] || []).push([e.s - 2.2, e.s + 2.2]);
  const wings = segs.map((seg) => faWing(K, seg, F));
  // ground floor: entrances, planting, bikes, lamps
  const entSpans = new Map();
  ents.forEach((e, k) => {
    const w = wings[segs.indexOf(e.seg)]; const R = w.runs[e.f];
    faEntry(K, F, R, e.s, w.floor1, { cols: colliders, walks: walkables });
    if (!entSpans.has(e.seg)) entSpans.set(e.seg, []);
    entSpans.get(e.seg).push([e.f, e.s - 3.4, e.s + 3.4]);
    const lp = R.at(e.s + 3.6, 2.4); colliders.push(propAt(K, 'campusLamp', lp[0], lp[1], 0));
    if (k === 0 && o.bikes !== false) { colliders.push(...bikes(K, R, e.s - 5.6, 2.2, 4, 0)); }
    if (k === 1) colliders.push(furniture(K, R, 'bench', e.s + 5.2, 1.9, Math.PI));
  });
  let seed = 1;
  if (o.planting !== false) for (const x of ext) {
    const w = wings[segs.indexOf(x.seg)]; const R = w.runs[x.f]; if (!R) continue;
    const skip = (entSpans.get(x.seg) || []).filter((q) => q[0] === x.f).map((q) => [q[1], q[2]]);
    // spans of the run that are clear of other blocks
    let a = null; const step = 0.5; const spans = [];
    for (let s = 0.4; s <= R.L - 0.4 + 1e-6; s += step) { const p = R.at(s, 1.0); const free = !inside(p[0], p[1], 0.05, x.seg.bi); if (free && a === null) a = s; if ((!free || s + step > R.L - 0.4) && a !== null) { spans.push([a, free ? s : s - step]); a = null; } }
    for (const [s0, s1] of spans) if (s1 - s0 > 2) for (let q = s0; q < s1 - 0.5; q += 3) { const q1 = Math.min(s1, q + 3); const gq = Math.min(gRun(K, R, q, 1.4), gRun(K, R, q1, 1.4)); K.rbox(R, F.plinth, q, gq - 0.5, 1.28, q1, gq + 0.5, 1.46, { detail: true }); }
    for (const [s0, s1] of spans) if (s1 - s0 > 2) planting(K, R, s0, s1, { d0: 0.08, depth: 1.2, h: 0.85, w: 1.5, gap: 0.6, curb: false, skip, seed: seed++, mats: [X.leafA, X.leafB] });
  }
  if (extras) extras(K, F, wings, colliders, walkables);
  return { K, object3d: K.finish(), colliders: colliders.filter(Boolean), walkables, wings, ents };
}
