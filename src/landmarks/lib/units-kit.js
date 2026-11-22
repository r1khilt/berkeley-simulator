// Berkeley Simulator — b07 Units kit.
// Parametric model of the Southside residence-hall towers of Units 1, 2 and 3 (Warnecke & Warnecke, 1959-64):
// ~41 x 12.5 m reinforced-concrete slabs, a tall recessed ground storey, eight residential floors, and
//  * long faces: nine bays between projecting full-height piers; each floor is a spandrel panel under a wide window band;
//  * Units 1 & 2: an exterior seismic retrofit of X-braces (each X spans two floors) over five bays, a stack of balconies
//    on alternate floors over the entrance, and a thin flat roof ring floating on the piers above an open band;
//  * Unit 3: recessed loggia bays with balconies at one end and a plain parapet crowned by the pier caps;
//  * end walls: near-blank precast panels with a scatter of small square and slot windows and one stack of room windows;
//  * an off-centre mechanical penthouse (position and height taken from the 2021 LiDAR).
import * as THREE from 'three';
import { Kit } from './classic-kit.js';
import { nightGlow } from '../../materials.js';
import { siteMat, signMat, runSign, planterBed, bikeRack, bench, bins, lampPost, fdc, rooftopUnits, roofRail, charcoalMat } from './rsw-site.js';

const matCache = new WeakMap();
// tinted copy of a shared textured material; base = average sRGB colour of that texture (so the result averages `hex`)
export function tinted(M, baseName, hex, base) {
  if (!matCache.has(M)) matCache.set(M, new Map());
  const c = matCache.get(M); const key = baseName + ':' + hex.toString(16);
  if (c.has(key)) return c.get(key);
  const m = M[baseName].clone();
  const t = new THREE.Color(hex), b = new THREE.Color().setRGB(base[0] / 255, base[1] / 255, base[2] / 255, THREE.SRGBColorSpace);
  m.color = new THREE.Color(Math.min(1.35, t.r / b.r), Math.min(1.35, t.g / b.g), Math.min(1.35, t.b / b.b));
  c.set(key, m); return m;
}
export function plainMat(M, key, opts) {
  if (!matCache.has(M)) matCache.set(M, new Map());
  const c = matCache.get(M); if (c.has(key)) return c.get(key);
  const m = new THREE.MeshStandardMaterial(opts); c.set(key, m); return m;
}
export const CONCRETE_BASE = [200, 197, 190];
export const STUCCO_BASE = [235, 222, 196];
export const concreteTint = (M, hex) => tinted(M, 'concrete', hex, CONCRETE_BASE);
export const PAINT_BASE = [226, 226, 226];
export const paintTint = (M, hex) => tinted(M, 'stuccoWhite', hex, PAINT_BASE); // smooth painted concrete / render
export function glassMat(M, hex = 0x56626b) { if (!matCache.has(M)) matCache.set(M, new Map()); const c = matCache.get(M); const k = 'glass:' + hex; if (c.has(k)) return c.get(k);
  const m = nightGlow(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.12, metalness: 0.3, emissive: 0xffc77a, emissiveIntensity: 1.5 }), 1.0); c.set(k, m); return m; }
export function curtainMat(M, hex = 0xe7e1d2) { if (!matCache.has(M)) matCache.set(M, new Map()); const c = matCache.get(M); const k = 'curtain:' + hex; if (c.has(k)) return c.get(k);
  const m = nightGlow(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, emissive: 0xffd49a, emissiveIntensity: 0.9 }), 1.0); c.set(k, m); return m; }
export const stuccoTint = (M, hex) => tinted(M, 'stucco', hex, STUCCO_BASE);

// small deterministic RNG
export function rng(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }

// oriented bar in a run's plane from (s0,y0) to (s1,y1), width w, depth d0..d1
export function bar(K, R, mat, s0, y0, s1, y1, w, d0, d1, opts) {
  const L = Math.hypot(s1 - s0, y1 - y0); const g = new THREE.BoxGeometry(L, w, d1 - d0);
  g.rotateZ(Math.atan2(y1 - y0, s1 - s0)); g.translate((s0 + s1) / 2, (y0 + y1) / 2, (d0 + d1) / 2);
  return K.addRun(R, mat, g, opts);
}

// ---------------------------------------------------------------------------------------------
// tower(ctx, P) → {object3d, colliders, walkables}
// P: {ang (deg), u0,u1,v0,v1, roof (roof deck y, LiDAR), ring (Units 1/2 roof-ring top y), pent:{u0,u1,v0,v1,top},
//     entrance:{face:'S'|'N', u}, style:'u12'|'u3', tint:{wall,span,base}, nb, floors, seed, endWinEdge}
export function tower(ctx, P) {
  const THREE_ = THREE; const M = ctx.M;
  const K = new Kit(ctx, THREE_.MathUtils.degToRad(P.ang));
  const { u0, u1, v0, v1 } = P; const nb = P.nb ?? 9; const NF = P.floors ?? 8; const u3 = P.style === 'u3';
  const rnd = rng(P.seed || 'unit');
  const T = P.tint || {};
  // r4-sweep-outer2: Units 1/2 surfaces were flat paint (untextured), so the towers read as pale boxes. Their concrete now
  // uses the shared concrete texture (photo PBR when on), and the module tints step the recessed spandrels below the pier /
  // brace frame so the structure reads at distance. Unit 3 keeps paint; P.flatPaint restores the old surfaces.
  const surf = (u3 || P.flatPaint) ? paintTint : concreteTint;
  const mWall = surf(M, T.wall ?? 0xd8d0b8), mSpan = surf(M, T.span ?? 0xe0d9c6);
  // refine-south-west: windows use the shared M.windowNight (the furnished-room window shader upgrade lands there);
  // P.sharedGlass === false restores the old local glass.
  const mGlass = P.sharedGlass === false ? glassMat(M) : M.windowNight, mCurt = curtainMat(M), mFrame = plainMat(M, 'units-frame', { color: 0xc9c6b2, roughness: 0.5, metalness: 0.2 }), mRail = charcoalMat(M);
  // r4-sweep-outer2: the end walls are colour-blocked on the real towers (slate blue, pale grey, sand, grey-green); T.end
  // paints the end-wall panels (joints a shade darker) while the corner piers stay the frame colour.
  const mEnd = T.end != null ? surf(M, T.end) : mWall;
  const mEndJ = T.end != null ? surf(M, new THREE.Color(T.end).multiplyScalar(0.84).getHex()) : mSpan;
  const mBrace = T.brace != null ? surf(M, T.brace) : mWall; // seismic frame colour (Unit 2 braces are a contrasting terracotta)
  const mGround = concreteTint(M, T.ground ?? 0xa9a59b); // recessed ground storey: plain board-formed concrete
  const mBase = mGround;
  const mFas = charcoalMat(M); const mPave = concreteTint(M, 0x9f998e); // warmer, darker apron paving (light concrete in tower shadow read as sky-blue in-game)
  K.siteMats = { galv: mFrame, dark: mFas };
  const NAME = (P.name || String(P.seed || '').replace(/-/g, ' ')).toUpperCase();
  const mRoof = M.concreteDark, mRing = surf(M, T.ring ?? T.wall ?? 0xe4dcc4);
  const colliders = [], walkables = [];
  // entrance level & vertical grid
  const eFace = P.entrance?.face || 'S'; const eU = P.entrance?.u ?? (u0 + u1) / 2;
  const eV = eFace === 'S' ? v1 : v0;
  const F0 = Math.max(K.g(eU, eV + (eFace === 'S' ? 1.2 : -1.2)), K.g(eU, eV)) + 0.12; // ground-floor level
  const deck = P.roof; const GH = 3.7; // ground storey height
  const FH = (deck - 0.25 - (F0 + GH)) / NF; // residential floor-to-floor
  const fy = (i) => F0 + GH + i * FH; // floor level of residential floor i (0..NF-1); fy(NF) = roof structure
  const gLow = Math.min(K.gMin(u0, v0, u1, v1, 8), F0) - 1.5;
  const PW = u3 ? 0.36 : 0.55, PP = u3 ? 1.05 : 0.5; // pier width, projection beyond the spandrel face
  const L = u1 - u0, W = v1 - v0;
  const bw = L / nb;

  // ---- core volume (keeps the inside closed) ----
  K.box(M.concreteDark, u0 + 0.7, gLow, v0 + 0.7, u1 - 0.7, deck - 0.05, v1 - 0.7);
  // roof deck
  K.box(mRoof, u0 + 0.05, deck - 0.3, v0 + 0.05, u1 - 0.05, deck, v1 - 0.05);
  // basement / plinth under everything (exposed where the ground falls away)
  K.box(mBase, u0 + 0.35, gLow, v0 + 0.35, u1 - 0.35, F0, v1 - 0.35);
  K.box(M.concreteDark, u0 + 0.25, F0 - 0.02, v0 + 0.25, u1 - 0.25, F0 + 0.05, v1 - 0.25);

  // ---- façade runs ----
  const runS = K.run([u0, v1], [u1, v1]), runN = K.run([u1, v0], [u0, v0]);
  const runE = K.run([u1, v1], [u1, v0]), runW = K.run([u0, v0], [u0, v1]);
  // bay roles along u (index from u0): 'brace' | 'balc' | 'plain' | 'loggia'
  const roles = new Array(nb).fill('plain');
  const eBayU = Math.min(nb - 1, Math.max(0, Math.floor((eU - u0) / bw)));
  if (!u3) {
    if (eBayU >= nb / 2) { roles[eBayU] = roles[eBayU - 1] = 'balc'; for (let i = 0; i <= eBayU - 2; i++) roles[i] = 'brace'; }
    else { roles[eBayU] = roles[eBayU + 1] = 'balc'; for (let i = eBayU + 2; i < nb; i++) roles[i] = 'brace'; }
  } else {
    const near = eBayU >= nb / 2 ? nb - 1 : 0; roles[near] = 'loggia';
  }
  const longFace = (R, isS) => {
    // s along the run; bay j in run order corresponds to u-bay index
    const bayU = (j) => (isS ? j : nb - 1 - j);
    // piers
    for (let j = 0; j <= nb; j++) {
      const s = j * bw; const a = Math.max(0, s - PW / 2), b = Math.min(L, s + PW / 2);
      const top = u3 ? deck + 0.68 : (P.ring ?? deck + 1.2) - 0.3;
      K.rbox(R, mWall, a, F0 - 0.2, -0.2, b, top, PP);
      
    }
    for (let j = 0; j < nb; j++) {
      const role = roles[bayU(j)]; const sA = j * bw + PW / 2, sB = (j + 1) * bw - PW / 2; const w = sB - sA;
      const isEnt = bayU(j) === eBayU && ((eFace === 'S') === isS);
      // ground storey: recessed, darker
      const gr = -0.55; // recess of the ground-storey glazing (must stay in front of the 0.7 m core inset)
      const gKind = isEnt ? 'ent' : role === 'balc' ? 'lobby' : (j === 0 || j === nb - 1) ? 'solid' : (((j * 7 + (isS ? 3 : 5) + (P.seed || '').length) % 5) < 3 ? 'lounge' : 'solid');
      if (gKind === 'ent' || gKind === 'lobby' || gKind === 'lounge') {
        // glazed lobby / lounge bay: aluminium storefront on a low concrete upstand, mullions ~1.2 m, transom bar
        K.rbox(R, mGround, sA, F0 - 0.05, gr - 0.3, sB, F0 + (gKind === 'ent' ? 0.02 : 0.45), gr);
        const g0 = F0 + (gKind === 'ent' ? 0.02 : 0.45), g1 = F0 + GH - 0.5;
        K.rbox(R, mGlass, sA, g0, gr - 0.1, sB, g1, gr - 0.06);
        const nm = Math.max(2, Math.round(w / 1.2));
        for (let k = 0; k <= nm; k++) { const sm = sA + w * k / nm; K.rbox(R, mFrame, sm - 0.05, g0, gr - 0.06, sm + 0.05, g1, gr + 0.03, { detail: k > 0 && k < nm }); }
        for (const yy of [g0 + 0.03, F0 + 2.55, g1 - 0.04]) K.rbox(R, mFrame, sA, yy - 0.04, gr - 0.06, sB, yy + 0.04, gr + 0.03, { detail: true });
        K.rbox(R, mGround, sA, g1, gr - 0.3, sB, F0 + GH, gr);
        // soffit over the recess
        K.rbox(R, mSpan, sA, F0 + GH - 0.32, gr - 0.02, sB, F0 + GH - 0.28, 0.0);
        if (gKind === 'lounge') { // a few blinds half down
          for (let k = 0; k < nm; k++) if (rnd() < 0.45) { const a = sA + w * k / nm + 0.06, b = sA + w * (k + 1) / nm - 0.06; const bh = (g1 - F0 - 2.6) + rnd() * 1.2; K.rbox(R, mCurt, a, g1 - bh, gr - 0.05, b, g1 - 0.02, gr - 0.045); }
        }
        if (gKind === 'ent') {
          // pair of glass doors with heavy stiles, push bars and a transom, centred in the bay
          const dc = (sA + sB) / 2;
          for (const sg of [-1, 1]) {
            const a = dc + sg * 0.02, b = dc + sg * 0.92; const lo = Math.min(a, b), hi = Math.max(a, b);
            K.rbox(R, mFrame, lo, F0 + 0.02, gr - 0.04, lo + 0.11, F0 + 2.3, gr + 0.06); K.rbox(R, mFrame, hi - 0.11, F0 + 0.02, gr - 0.04, hi, F0 + 2.3, gr + 0.06);
            K.rbox(R, mFrame, lo, F0 + 0.02, gr - 0.04, hi, F0 + 0.25, gr + 0.06); K.rbox(R, mFrame, lo, F0 + 2.2, gr - 0.04, hi, F0 + 2.3, gr + 0.06);
            K.rbox(R, mFas, lo + 0.15, F0 + 1.0, gr + 0.06, hi - 0.15, F0 + 1.06, gr + 0.12, { detail: true });
          }
          K.rbox(R, mFrame, dc - 0.95, F0 + 2.3, gr - 0.05, dc + 0.95, F0 + 2.42, gr + 0.05);
          // card reader on a post beside the doors
          K.rbox(R, mFas, dc + 1.25, F0, gr + 0.1, dc + 1.37, F0 + 1.15, gr + 0.22, { detail: true });
          K.rbox(R, mGlass, dc + 1.23, F0 + 1.0, gr + 0.22, dc + 1.39, F0 + 1.22, gr + 0.25, { detail: true });
        }
      } else {
        // solid bay: board-formed concrete with a high strip window (bathrooms / service rooms)
        const ops = [{ s0: sA + 0.4, s1: sB - 0.4, y0: F0 + 2.05, y1: F0 + 2.95 }];
        K.wall(R, mGround, sA, sB, F0, F0 + GH, ops, 0.3);
        for (const o of ops) K.fill(R, o, { rev: 0.16, glass: mGlass, frame: mFrame, mull: 2, sill: false });
        // shallow form-tie grid / panel joints for texture
        for (const yy of [F0 + 0.95, F0 + 1.9]) K.rbox(R, mGround, sA + 0.05, yy - 0.02, 0.0, sB - 0.05, yy + 0.02, 0.025, { detail: true });
        K.rbox(R, mGround, sA, F0 - 0.05, 0.0, sB, F0 + 0.35, 0.06); // base course
      }
      // exposed basement wall where the ground falls away (drawn as a plain face in the recess plane)
      const gHere = Math.min(K.g(...(() => { const p = R.at((sA + sB) / 2, 0.5); return p; })()), F0);
      if (F0 - gHere > 0.6) K.rbox(R, mBase, sA, gHere - 0.6, gr - 0.3, sB, F0, gr);
      // slab edge over the ground storey
      K.rbox(R, mSpan, sA, F0 + GH - 0.3, -0.25, sB, F0 + GH, 0.04);
      // residential floors
      for (let f = 0; f < NF; f++) {
        const y = fy(f), y2 = fy(f + 1);
        if (role === 'loggia') {
          // recessed loggia: slab edge + railing at the pier line, glazed back wall 1.6 m in
          K.rbox(R, mSpan, sA, y - 0.22, -1.7, sB, y, 0.05);
          K.rbox(R, mGlass, sA, y, -1.62, sB, y2 - 0.22, -1.56);
          K.rbox(R, mSpan, sA, y2 - 0.22, -1.7, sB, y2 - 0.02, -1.5);
          K.rbox(R, mRail, sA, y + 1.0, -0.05, sB, y + 1.06, 0.03, { detail: true });
          for (let k = 0; k <= Math.round(w / 0.5); k++) { const s = sA + k * w / Math.round(w / 0.5); K.rbox(R, mRail, s - 0.015, y, -0.03, s + 0.015, y + 1.0, 0.0, { detail: true }); }
          for (const s of [sA + w / 2]) K.rbox(R, mFrame, s - 0.04, y, -1.56, s + 0.04, y2 - 0.22, -1.5, { detail: true });
          continue;
        }
        const balcF = role === 'balc' && f % 2 === 1;
        const c1 = sA + w * 0.27, c2 = sB - w * 0.27; const ww = Math.min(1.35, w * 0.36);
        const ops = u3 ? [{ s0: sA + w * 0.22, s1: sB - w * 0.22, y0: y + 0.9, y1: y + 2.35, sill: false }] : balcF ? [{ s0: c1 - ww / 2 - 0.1, s1: c1 + ww / 2 + 0.1, y0: y + 0.02, y1: y + 2.3, sill: false }, { s0: c2 - ww / 2 - 0.1, s1: c2 + ww / 2 + 0.1, y0: y + 0.02, y1: y + 2.3, sill: false }]
          : [{ s0: c1 - ww / 2, s1: c1 + ww / 2, y0: y + 0.95, y1: y + 2.45, sill: false }, { s0: c2 - ww / 2, s1: c2 + ww / 2, y0: y + 0.95, y1: y + 2.45, sill: false }];
        K.wall(R, mSpan, sA, sB, y, y2, ops, 0.3);
        for (const o of ops) {
          K.fill(R, o, { rev: 0.24, glass: mGlass, frame: mFrame, mull: balcF || u3 ? 1 : 0, tran: balcF ? [] : [o.y0 + 0.45], sill: false }); // Unit 3: paired sashes
          const r = rnd();
          if (r < 0.26) { // roller / venetian blind lowered from the head to a random height
            const bh = (o.y1 - o.y0) * (0.12 + 0.48 * rnd()); K.rbox(R, mCurt, o.s0 + 0.05, o.y1 - 0.06 - bh, -0.235, o.s1 - 0.05, o.y1 - 0.06, -0.229);
          } else if (r < 0.42) { // curtain drawn to one side
            const cw = (o.s1 - o.s0) * (0.2 + 0.3 * rnd()); const left = rnd() < 0.5;
            K.rbox(R, mCurt, left ? o.s0 + 0.04 : o.s1 - 0.04 - cw, o.y0 + 0.05, -0.235, left ? o.s0 + 0.04 + cw : o.s1 - 0.04, o.y1 - 0.06, -0.228);
          }
          if (!balcF) K.rbox(R, mFrame, o.s0 - 0.03, o.y0 - 0.05, -0.25, o.s1 + 0.03, o.y0 + 0.01, 0.05, { detail: true }); // aluminium sill flashing
        }
        if (balcF) {
          // cantilevered balcony slab with a dark picket railing
          K.rbox(R, mSpan, sA - PW / 2, y - 0.2, 0.0, sB + PW / 2, y + 0.02, 1.5);
          K.rbox(R, mRail, sA - PW / 2, y + 1.05, 1.43, sB + PW / 2, y + 1.11, 1.49, { detail: true });
          for (const sd of [sA - PW / 2 + 0.03, sB + PW / 2 - 0.03]) { const jb = Math.round((sd - (sd < sA ? -PW / 2 : PW / 2)) / bw); const other = sd < sA ? jb - 1 : jb; const oj = isS ? other : nb - 1 - other; if (other >= 0 && other < nb && roles[oj] === 'balc') continue; K.rbox(R, mRail, sd - 0.025, y + 0.02, PP, sd + 0.025, y + 1.11, 1.49, { detail: true }); }
          const n = Math.round((w + PW) / 0.14); for (let k = 0; k <= n; k++) { const s = sA - PW / 2 + k * (w + PW) / n; K.rbox(R, mRail, s - 0.012, y + 0.02, 1.44, s + 0.012, y + 1.05, 1.47, { detail: true }); }
        }
      }
      // top spandrel/roof edge band of the bay
      K.rbox(R, mSpan, sA, fy(NF) - 0.18, -0.3, sB, deck + (u3 ? 0.55 : 0.0), 0.0);
      // seismic X-braces over pairs of floors
      if (role === 'brace') {
        const s0 = j * bw + PW / 2, s1 = (j + 1) * bw - PW / 2;
        // bracing frame columns on the pier faces
        for (const sp of [j * bw, (j + 1) * bw]) K.rbox(R, mBrace, sp - PW / 2 - 0.05, fy(0) - 0.2, PP, sp + PW / 2 + 0.05, fy(NF) + 0.1, PP + 0.42);
        for (let f = 0; f + 1 < NF + 0.5; f += 2) {
          const ya = fy(f), yb = fy(Math.min(NF, f + 2));
          bar(K, R, mBrace, s0 - PW / 2, ya, s1 + PW / 2, yb, 0.4, PP + 0.02, PP + 0.42);
          bar(K, R, mBrace, s0 - PW / 2, yb, s1 + PW / 2, ya, 0.4, PP + 0.04, PP + 0.4);
          K.rbox(R, mBrace, s0 - PW / 2, yb - 0.2, PP + 0.02, s1 + PW / 2, yb + 0.2, PP + 0.42);
          // cast node where the diagonals cross, and gusset blocks at the beam-column joints
          const xm = (s0 + s1) / 2, ym = (ya + yb) / 2; K.rbox(R, mBrace, xm - 0.42, ym - 0.42, PP + 0.0, xm + 0.42, ym + 0.42, PP + 0.5);
          for (const xs of [s0 - PW / 2, s1 + PW / 2]) for (const yy of [ya, yb]) K.rbox(R, mBrace, xs - 0.32, yy - 0.32, PP + 0.0, xs + 0.32, yy + 0.32, PP + 0.47, { detail: true });
        }
        K.rbox(R, mBrace, s0 - PW / 2, fy(0) - 0.2, PP + 0.02, s1 + PW / 2, fy(0) + 0.2, PP + 0.42);
      }
    }
  };
  longFace(runS, true); longFace(runN, false);

  // ---- end walls: precast panels, scattered small windows, one stack of room windows ----
  const endWall = (R, edge) => {
    const ops = []; const Wd = R.L;
    const col = edge ? [Wd - 2.6, Wd - 1.0] : [1.0, 2.6];
    for (let f = 0; f < NF; f++) {
      const y = fy(f);
      ops.push({ s0: col[0], s1: col[1], y0: y + 1.1, y1: y + 2.55, big: true });
      // scattered smalls (avoid the window column)
      const n = u3 ? 7 + Math.floor(rnd() * 3) : 4 + Math.floor(rnd() * 3);
      const used = [];
      for (let k = 0; k < n; k++) {
        const slot = rnd() < 0.45; const w = slot ? 0.42 : 0.5, h = slot ? 0.8 + rnd() * 0.6 : 0.45;
        for (let tries = 0; tries < 10; tries++) {
          const s = 1.2 + rnd() * (Wd - 2.4 - w);
          if (s + w > Math.min(...col) - 0.4 && s < Math.max(...col) + 0.4) continue;
          if (used.some((q) => s < q + 0.55 && s + w > q - 0.55)) continue;
          used.push(s); const yy = y + (slot ? 0.9 : 1.5 + rnd() * 0.4);
          ops.push({ s0: s, s1: s + w, y0: yy, y1: yy + h }); break;
        }
      }
    }
    const top = u3 ? deck + 0.55 : deck;
    K.wall(R, mEnd, 0.0, Wd, F0 + GH, top, ops, 0.4);
    for (const o of ops) K.fill(R, o, { rev: o.big ? 0.25 : 0.32, glass: o.big ? mGlass : M.windowNight, frame: mFrame, mull: o.big ? 1 : 0, sill: false });
    // panel joints (staggered) as shallow grooves
    for (let f = 0; f <= NF; f++) K.rbox(R, mEndJ, 0.05, fy(f) - 0.03, -0.02, Wd - 0.05, fy(f) + 0.03, 0.015, { detail: true });
    for (let f = 0; f < NF; f++) for (let q = 0; q < 2; q++) { const s = 1.5 + ((f * 0.37 + q * 0.5 + 0.13) % 1) * (Wd - 3); K.rbox(R, mEndJ, s - 0.03, fy(f), -0.02, s + 0.03, fy(f + 1), 0.015, { detail: true }); }
    // ground storey: recessed dark wall
    K.wall(R, mBase, 0.0, Wd, F0, F0 + GH, [{ s0: Wd * 0.4, s1: Wd * 0.6, y0: F0 + 1.2, y1: F0 + 2.7 }], 0.3);
    K.fill(R, { s0: Wd * 0.4, s1: Wd * 0.6, y0: F0 + 1.2, y1: F0 + 2.7 }, { rev: 0.18, frame: mFrame, mull: 1, sill: false });
    // corner piers wrap the ends
    for (const s of [0, Wd]) K.rbox(R, mWall, s - (s ? PW / 2 : 0), F0 - 0.2, -0.2, s + (s ? 0 : PW / 2), u3 ? deck + 0.75 : (P.ring ?? deck + 1.2) - 0.3, PP);
    const gE = Math.min(K.g(...R.at(Wd / 2, 0.6)), F0); if (F0 - gE > 0.5) K.rbox(R, mBase, 0, gE - 0.6, -0.4, Wd, F0, -0.1);
  };
  endWall(runE, P.endWinEdge ?? true); endWall(runW, !(P.endWinEdge ?? true));

  // ---- roof crown ----
  if (!u3) {
    // thin flat roof ring floating on the piers above an open band
    const yT = P.ring ?? deck + 1.2; const oE = 1.0, oS = 0.8, ins = 1.5;
    const outer = [u0 - oE, v0 - oS, u1 + oE, v1 + oS];
    const pieces = [[outer[0], outer[1], outer[2], v0 + ins], [outer[0], v1 - ins, outer[2], outer[3]], [outer[0], v0 + ins, u0 + ins, v1 - ins], [u1 - ins, v0 + ins, outer[2], v1 - ins]];
    for (const [a, b, c, d] of pieces) K.box(mRing, a, yT - 0.28, b, c, yT, d);
    // parapet of the real roof behind the open band
    for (const R of [runS, runN, runE, runW]) K.rbox(R, mSpan, 0.2, deck - 0.05, -0.6, R.L - 0.2, deck + 0.12, -0.3);
  } else {
    // flat parapet coping
    for (const R of [runS, runN, runE, runW]) K.rbox(R, mSpan, -0.05, deck + 0.55, -0.45, R.L + 0.05, deck + 0.68, 0.06);
    // thin roof slab overhanging the fins (reads as the flat lid in the 2021 LiDAR)
    K.box(mRing, u0 - 0.6, deck + 0.68, v0 - PP - 0.1, u1 + 0.6, deck + 0.95, v1 + PP + 0.1);
    { // a deeper fascia band around the lid's edge (the heavy cornice read of the Unit 3 towers)
      const a = u0 - 0.6, b = v0 - PP - 0.1, c = u1 + 0.6, d = v1 + PP + 0.1, t = 0.28, y0 = deck + 0.38, y1 = deck + 0.7;
      K.box(mRing, a, y0, b, c, y1, b + t); K.box(mRing, a, y0, d - t, c, y1, d); K.box(mRing, a, y0, b + t, a + t, y1, d - t); K.box(mRing, c - t, y0, b + t, c, y1, d - t);
    }
  }
  // penthouse
  if (P.pent) {
    const p = P.pent; const top = p.top;
    K.box(mWall, p.u0, deck - 0.1, p.v0, p.u1, top - 0.3, p.v1);
    K.box(mRing, p.u0 - 0.3, top - 0.3, p.v0 - 0.3, p.u1 + 0.3, top, p.v1 + 0.3);
    // louvres + a door on the long sides
    const RP = K.run([p.u0, p.v1], [p.u1, p.v1]), RQ = K.run([p.u1, p.v0], [p.u0, p.v0]);
    for (const R of [RP, RQ]) {
      for (let k = 0; k < 6; k++) K.rbox(R, mFrame, 1.2, deck + 0.8 + k * 0.28, 0, 3.4, deck + 0.9 + k * 0.28, 0.08, { detail: true });
      K.rbox(R, mFrame, R.L - 2.4, deck + 0.05, 0, R.L - 1.4, deck + 2.2, 0.05);
    }
    // vents / flues on the roof
    for (let k = 0; k < 4; k++) { const uu = u0 + 3 + rnd() * (L - 6), vv = v0 + 2 + rnd() * (W - 4); if (uu > p.u0 - 1 && uu < p.u1 + 1 && vv > p.v0 - 1 && vv < p.v1 + 1) continue; K.cyl(mFrame, uu, deck, vv, 0.18, 0.18, 1.1, 8, { detail: true }); }
    // rooftop mechanical plant (condensers / exhaust fans) beside the penthouse, a guard rail and a ladder up to its roof
    rooftopUnits(K, [u0 + 1.6, v0 + 1.6, u1 - 1.6, v1 - 1.6], deck, rnd, { n: 3, big: true, avoid: [[p.u0 - 0.5, p.v0 - 0.5, p.u1 + 0.5, p.v1 + 0.5]] });
    roofRail(K, [p.u0 - 0.15, p.v0 - 0.15, p.u1 + 0.15, p.v1 + 0.15], top);
    { const RL = K.run([p.u1, p.v1], [p.u1, p.v0]); for (const ss of [1.0, 1.45]) RL && K.rbox(RL, mFrame, ss - 0.03, deck, 0.18, ss + 0.03, top + 1.0, 0.22, { detail: true }); for (let y = deck + 0.3; y < top; y += 0.3) K.rbox(RL, mFrame, 1.0, y - 0.015, 0.18, 1.45, y + 0.015, 0.22, { detail: true }); }
  }
  // ---- entrance: deep canopy with the hall's name on a dark metal fascia, downlights, steel columns, steps; site details ----
  const walkPolys = [];
  {
    const R = eFace === 'S' ? runS : runN;
    const sc = (eFace === 'S' ? eBayU + 0.5 : nb - 1 - eBayU + 0.5) * bw; // centre of the entrance bay along the run
    const cw = 2.7, cy = F0 + 3.15, cd = 3.4;
    K.rbox(R, mRing, sc - cw, cy, -0.3, sc + cw, cy + 0.32, cd);
    K.rbox(R, mFrame, sc - cw - 0.04, cy - 0.06, cd - 0.02, sc + cw + 0.04, cy + 0.5, cd + 0.06);
    for (const sg of [-1, 1]) K.rbox(R, mFrame, sc + sg * (cw + 0.04) - 0.04, cy - 0.06, -0.3, sc + sg * (cw + 0.04) + 0.04, cy + 0.5, cd);
    runSign(K, R, signMat(M, NAME, { bg: '#2c2f32', fg: '#efe8d8', size: 0.6, track: 0.12 }), sc, cy + 0.03, Math.min(4.4, 0.3 * NAME.length + 0.5), 0.38, cd + 0.065);
    for (const ds of [-1.6, 0, 1.6]) K.rbox(R, M.lampGlow, sc + ds - 0.13, cy - 0.025, cd * 0.55 - 0.13, sc + ds + 0.13, cy, cd * 0.55 + 0.13, { detail: true });
    for (const ds of [-cw + 0.3, cw - 0.3]) { const [cu, cv] = R.at(sc + ds, cd - 0.35); K.cyl(mFas, cu, Math.min(F0, K.g(cu, cv)) - 0.3, cv, 0.11, 0.11, cy - Math.min(F0, K.g(cu, cv)) + 0.3, 10); }
    // landing under the canopy, steps down to the path where the ground is lower
    const gE = K.g(...R.at(sc, cd + 1.2));
    K.rbox(R, M.concrete, sc - cw, Math.min(gE, F0) - 1.0, -0.3, sc + cw, F0, cd + 0.2);
    walkPolys.push([[R.at(sc - cw, -0.3), R.at(sc + cw, -0.3), R.at(sc + cw, cd + 0.2), R.at(sc - cw, cd + 0.2)], F0]);
    if (F0 - gE > 0.2) {
      const n = Math.max(2, Math.round((F0 - gE) / 0.16)); const tr = 0.3;
      for (let i = 0; i < n; i++) K.rbox(R, M.concrete, sc - 2.0, gE - 1.0, cd + 0.2 + (n - 1 - i) * tr, sc + 2.0, gE + (F0 - gE) * (i + 1) / n, cd + 0.2 + (n - i) * tr);
      for (const sg of [-1, 1]) { const x = sc + sg * 1.85; K.rbox(R, mFas, x - 0.02, F0 + 0.88, cd + 0.2, x + 0.02, F0 + 0.92, cd + 0.2 + n * tr, { detail: true }); }
    }
    // everyday details: bike racks, bench, bins, lamp posts, fire-department connection
    if (P.site !== false) {
      const gS = (ss, dd) => K.g(...R.at(ss, dd));
      const bs = sc + cw + 2.6; if (bs + 2.5 < R.L) bikeRack(K, R, bs, cd + 0.4, gS(bs, cd + 0.4), 5, { pitch: 0.85 });
      const bn = sc - cw - 2.4; if (bn - 1 > 0) bench(K, R, bn, cd - 0.2, gS(bn, cd - 0.2), 1.9);
      bins(K, R, sc + cw + 0.4, 0.9, Math.max(F0, gS(sc + cw + 0.4, 0.9)) - 0.0);
      for (const sg of [-1, 1]) { const [lu, lv] = R.at(sc + sg * (cw + 1.0), cd + 1.6); lampPost(K, lu, lv, K.g(lu, lv), 4.2); }
      fdc(K, R, sc - cw - 0.6, F0);
    }
  }
  // paving apron along the long faces (flat segments that step with the terrain) + planting beds against the base
  if (P.site !== false) {
    const AP = 2.2;
    for (const [R, isS] of [[runS, true], [runN, false]]) {
      const isEntF = (eFace === 'S') === isS;
      for (let j = 0; j < nb; j++) {
        const s0 = j * bw, s1 = (j + 1) * bw; const d0 = PP, d1 = PP + AP;
        let gmax = -Infinity, gmin = Infinity; for (let k = 0; k <= 4; k++) for (const dd of [d0, d1]) { const gg = K.g(...R.at(s0 + (s1 - s0) * k / 4, dd)); gmax = Math.max(gmax, gg); gmin = Math.min(gmin, gg); }
        if (gmax - gmin > 1.2) continue; // too steep: leave the terrain
        const top = Math.min(F0 - 0.02, gmax + 0.06);
        if (F0 - top > 1.5) continue;
        K.rbox(R, mPave, s0, gmin - 0.4, d0, s1, top, d1);
        for (let k = 1; k < 4; k++) K.rbox(R, mGround, s0 + (s1 - s0) * k / 4 - 0.01, top, d0, s0 + (s1 - s0) * k / 4 + 0.01, top + 0.004, d1, { detail: true });
        walkPolys.push([[R.at(s0, d0), R.at(s1, d0), R.at(s1, d1), R.at(s0, d1)], top]);
        const role = roles[isS ? j : nb - 1 - j];
        if (!isEntF && role !== 'balc' && j % 3 === 1 && Math.abs(top - F0) < 0.5) planterBed(K, R, s0 + 0.25, s1 - 0.25, d1 + 0.05, d1 + 1.25, top, { seed: j + (isS ? 11 : 29) });
      }
    }
  }
  colliders.push(K.colPoly([[u0 - PP, v0 - PP], [u1 + PP, v0 - PP], [u1 + PP, v1 + PP], [u0 - PP, v1 + PP]], gLow, deck + 4));
  const object3d = K.finish();
  for (const [poly, y] of walkPolys) walkables.push(K.walkPoly(poly, y));
  return { object3d, colliders, walkables, F0, FH };
}
