// Weill Hall (the former Life Sciences Addition, renamed Weill Hall): six-level molecular & cell biology
// laboratory on the west side of campus beside the Valley Life Sciences Building and the Eucalyptus Grove.
// A long buff concrete block (≈93 × 32 m) with banded (rusticated) walls, one tall deep-set window per bay with a small
// perforated vent panel above it, an attic frieze of round oculi and a clay-tile hipped roof following the plan. The two
// chamfered corners (NE and SW) are entrance pavilions: a full-height open concrete grid standing proud of a recessed
// glazed atrium, with paired round columns at the base. Massing from the 2021 LiDAR: eaves ≈29 m, hips rising to a
// mechanical deck at ≈34.5 m.
import * as THREE from 'three';
import { Kit, pal, polyHip, rail } from './lib/b08a-kit.js';

export const info = {
  id: 'weill-hall',
  name: 'Weill Hall',
  subtitle: 'Molecular & Cell Biology',
  blurb: 'Built as the Life Sciences Addition and part of a major campus drive to improve facilities for biology, the six-story Weill Hall houses 46 laboratory suites for advanced biological research.',
  replaces: ['w/24024679'],
};

let _band = null;
function bandMat(M) { // smooth pale precast with horizontal rustication grooves every 0.5 m (UVs are metres/2 → 4 grooves per tile)
  if (_band) return _band;
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d');
  g.fillStyle = '#abaca6'; g.fillRect(0, 0, N, N); // [r5a] cool mid-grey precast (photo #a9aaa4), was a pale cream
  for (let i = 0; i < 2600; i++) { const x = Math.random() * N, y = Math.random() * N, a = Math.random() * 0.05; g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '90,85,75'},${a})`; g.fillRect(x, y, 2 + Math.random() * 6, 1 + Math.random() * 3); }
  for (let k = 0; k < 4; k++) { const y = k * N / 4; g.fillStyle = '#7f7f7a'; g.fillRect(0, y, N, 4); g.fillStyle = '#c0c0ba'; g.fillRect(0, y + 4, N, 2); } // [r5a] fine, subtle grooves (read as siding before)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  _band = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  return _band;
}

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(73.6);
  const K = new Kit(ctx, ANG); const M = ctx.M; const P = pal(ctx);
  const BAND = bandMat(M);                                                     // banded precast concrete
  const C = M.stuccoWhite.clone(); C.color = new THREE.Color(0xc3c3bc);         // smooth concrete (frame, mouldings) [r5a] greyer
  const CD = M.stuccoWhite.clone(); CD.color = new THREE.Color(0xa8a69e);       // plinth / shadowed concrete [r5a] greyer
  const TILE = M.redTile;                                                       // [r5a] red Mission clay tile (photo: #b85a3e sunlit), was a grey-mauve slate tint
  const FR = P.trimWhite, GL = M.windowNight;
  const DKG = M.glass.clone(); DKG.userData = { ...DKG.userData, interior: false }; DKG.name = 'r5a-dark-glass'; DKG.color = new THREE.Color(0x1e2a2a); // [r5a] atrium curtain wall: no furnished rooms behind it
  const colliders = [], walkables = [];
  let poly = ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z));
  const simp = []; for (let i = 0; i < poly.length; i++) { const a = poly[(i - 1 + poly.length) % poly.length], b = poly[i], c = poly[(i + 1) % poly.length];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(cr) > 0.6) simp.push(b); }
  poly = simp;
  let area = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1]; }
  if (area > 0) poly.reverse();

  const Y0 = -1.5, FL = 2.6, TOP = 26.0, EAVE = 29.0;
  const floors = [FL, 7.0, 10.8, 14.6, 18.4, 22.2, TOP];
  const gAt = (R, s, d = 0.8) => { const p = R.at(s, d); return K.g(p[0], p[1]); };
  const frieze = (R, mat, s0, s1, y0, y1, holes, depth = 0.45) => {
    const sh = new THREE.Shape(); sh.moveTo(s0, y0); sh.lineTo(s1, y0); sh.lineTo(s1, y1); sh.lineTo(s0, y1); sh.lineTo(s0, y0);
    for (const h of holes) { const p = new THREE.Path();
      if (h.r) { p.absarc(h.s, h.y, h.r, 0, Math.PI * 2, true); } else { p.moveTo(h.s0, h.y0); p.lineTo(h.s1, h.y0); p.lineTo(h.s1, h.y1); p.lineTo(h.s0, h.y1); p.lineTo(h.s0, h.y0); }
      sh.holes.push(p);
      if (h.r) { const dg = new THREE.CircleGeometry(h.r + 0.02, 20); dg.translate(h.s, h.y, -depth + 0.06); K.addRun(R, M.blackPaint, dg, { uvMode: 'keep' }); /* [r5a] dark, so oculi read as openings */
        const tg = new THREE.TorusGeometry(h.r + 0.1, 0.14, 6, 20); tg.translate(h.s, h.y, 0.04); K.addRun(R, C, tg); }
      else { K.rbox(R, GL, h.s0, h.y0, -depth + 0.04, h.s1, h.y1, -depth + 0.07, { uvMode: 'keep' }); K.rbox(R, C, h.s0 - 0.1, h.y0 - 0.14, -0.1, h.s1 + 0.1, h.y0, 0.08); }
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -depth); K.addRun(R, mat, g);
    K.rbox(R, M.concreteDark, s0, y0, -depth - 0.2, s1, y1, -depth + 0.02);
  };
  const oculus = (R, c, y, r = 0.5, d0 = 0) => {
    const tg = new THREE.TorusGeometry(r + 0.07, 0.1, 6, 20); tg.translate(c, y, d0 + 0.05); K.addRun(R, C, tg);
    const dg = new THREE.CircleGeometry(r, 20); dg.translate(c, y, d0 - 0.38); K.addRun(R, M.glass, dg, { uvMode: 'keep' });
    const hg = new THREE.CylinderGeometry(r, r, 0.42, 20, 1, true); hg.rotateX(Math.PI / 2); hg.translate(c, y, d0 - 0.17); hg.scale(1, 1, 1); K.addRun(R, CD, hg.toNonIndexed().scale(1,1,1));
  };

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]; const R = K.run(a, b); const L = R.L;
    const isCh = Math.abs(R.t[0]) > 0.35 && Math.abs(R.t[1]) > 0.35;
    if (isCh) { // ---------- entrance pavilion: open concrete grid over a recessed glazed atrium ----------
      const D = 4.2; const e = 0.7; // recess depth, solid end strips
      K.wall(R, BAND, 0, L, Y0, EAVE, [{ s0: e, s1: L - e, y0: FL - 0.3, y1: TOP }], 0.45);
      K.rbox(R, CD, e, Y0, -D - 0.3, L - e, TOP, -D);                                                     // atrium back
      K.rbox(R, DKG, e + 0.05, FL - 0.3, -D + 0.01, L - e - 0.05, TOP - 0.1, -D + 0.04, { uvMode: 'keep' }); // curtain wall [r5a] dark green-black glazing deep behind the frame (photo #1e2a2a)
      const nm = Math.round((L - 2 * e) / 1.5); for (let k = 1; k < nm; k++) { const s = e + (L - 2 * e) * k / nm; K.rbox(R, FR, s - 0.04, FL - 0.3, -D + 0.04, s + 0.04, TOP - 0.1, -D + 0.12, { detail: true }); }
      for (const s of [e, L - e]) K.rbox(R, BAND, s - (s === e ? 0.0 : 0.45) , Y0, -D - 0.3, s + (s === e ? 0.45 : 0), TOP, 0);
      const px = [e + 0.3, e + (L - 2 * e) / 3, e + 2 * (L - 2 * e) / 3, L - e - 0.3];
      for (const s of px) K.rbox(R, C, s - 0.32, FL - 0.3, -0.5, s + 0.32, TOP, 0.75);                    // square piers (projecting frame) [r5a] slimmer
      // [r5a] (chevron bracing and zig-zag stair flights removed: not on the real pavilions, they read as stray diagonals)
      for (let f = 1; f < floors.length; f++) {
        const y = floors[f];
        if (f === 1) continue;                                                                             // double-height base
        K.rbox(R, C, e - 0.2, y - 0.38, -0.5, L - e + 0.2, y + 0.22, 0.75);                                   // slab-edge beams [r5a] thinner
        if (f < floors.length - 1) { K.rbox(R, CD, e, y - 0.3, -D, L - e, y + 0.05, -0.4); rail(K, R, P.frameDark, e + 0.1, L - e - 0.1, y + 0.35, -0.6, 1.0, 0.14); }
      }
      // paired round columns carrying the double-height entrance bay
      const mid = (px[1] + px[2]) / 2;
      for (const sx of [0]) { const g = new THREE.CylinderGeometry(0.52, 0.52, floors[2] - FL + 0.3, 24); g.translate(mid + sx * 1.5, (FL - 0.3 + floors[2]) / 2, 0.0); K.addRun(R, C, g); colliders.push((() => { const p = R.at(mid + sx * 1.5, 0); const [x, z] = K.xz(p[0], p[1]); return { type: 'cyl', x, z, r: 0.55, y0: FL - 1, y1: floors[2] }; })()); } // [r5a] one free-standing round column (photo), was a pair
      // attic over the pavilion: central oculus flanked by square windows
      K.rbox(R, C, -0.1, TOP - 0.1, 0, L + 0.1, TOP + 0.4, 0.4);
      { const yc = (TOP + 0.4 + EAVE) / 2; frieze(R, C, -0.05, L + 0.05, TOP + 0.4, EAVE, [{ s: L / 2, y: yc, r: 0.65 }, { s0: L / 2 - 3.4 - 0.5, s1: L / 2 - 3.4 + 0.5, y0: yc - 0.5, y1: yc + 0.5 }, { s0: L / 2 + 3.4 - 0.5, s1: L / 2 + 3.4 + 0.5, y0: yc - 0.5, y1: yc + 0.5 }]); }

      // forecourt + steps from the path to the atrium floor
      const g0 = Math.max(gAt(R, L / 2, 2), gAt(R, e + 1, 1), gAt(R, L - e - 1, 1)) + 0.08;
      K.rbox(R, P.concreteBuff, e, Y0, -D, L - e, g0, 2.0);
      walkables.push({ type: 'poly', pts: [R.at(e, -D), R.at(L - e, -D), R.at(L - e, 2.0), R.at(e, 2.0)].map(([u, v]) => K.xz(u, v)), y: g0 });
      if (g0 < FL - 0.35) { K.rbox(R, DKG, e + 0.05, g0, -D + 0.01, L - e - 0.05, FL - 0.3, -D + 0.04, { uvMode: 'keep' }); } // [r5a] glazing runs down to the forecourt
      { const m = L / 2; K.rbox(R, FR, m - 1.6, g0, -D + 0.04, m + 1.6, g0 + 2.75, -D + 0.12); for (const [x0, x1] of [[m - 1.5, m - 0.04], [m + 0.04, m + 1.5]]) K.rbox(R, DKG, x0, g0 + 0.06, -D + 0.12, x1, g0 + 2.6, -D + 0.14, { uvMode: 'keep' }); } // entrance doors
      // [r5a] where the grade falls away in front of the pavilion (the SW corner drops ~2 m toward the grove), a full-width
      // flight runs down from the forecourt edge to the path instead of leaving a bare slab edge standing above the lawn
      { const T = 0.36, d0 = 2.0; const gFoot = (dd) => { const a = [gAt(R, e + 1, dd), gAt(R, L / 2, dd), gAt(R, L - e - 1, dd)].sort((x, y) => x - y); return a[1]; };
        let gF = gFoot(4.0); for (let it = 0; it < 3; it++) { const nn = Math.min(12, Math.max(2, Math.round((g0 - gF) / 0.155))); gF = Math.max(gFoot(d0 + nn * T + 0.4), g0 - 12 * 0.155); } // foot lands on the grade it meets (median across the width), max 12 risers
        const rise = g0 - gF;
        if (rise > 0.3) { const n = Math.max(2, Math.round(rise / 0.155)), r = rise / n;
          for (let k = 0; k < n - 1; k++) { K.rbox(R, P.concreteBuff, e, gF - 0.8, d0 + k * T, L - e, g0 - r * (k + 1), d0 + (k + 1) * T); K.rbox(R, CD, e, g0 - r * (k + 1) - 0.06, d0 + k * T - 0.01, L - e, g0 - r * (k + 1) - 0.03, d0 + k * T + 0.002, { detail: true }); }
          for (const sx of [e - 0.45, L - e]) { const dE = d0 + (n - 1) * T; const sh = new THREE.Shape(); sh.moveTo(-0.2, gF - 0.8); sh.lineTo(-0.2, g0 + 0.9); sh.lineTo(d0, g0 + 0.9); sh.lineTo(dE, gF + r + 0.75); sh.lineTo(dE, gF - 0.8); sh.closePath(); // sloped cheek walls following the flight
            const g = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(sx + 0.45, 0, 0); K.addRun(R, C, g); }
          const cs = [R.at(e, d0), R.at(L - e, d0), R.at(L - e, d0 + (n - 1) * T), R.at(e, d0 + (n - 1) * T)].map(([u, v]) => K.xz(u, v));
          walkables.push({ type: 'fn', bounds: [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))],
            heightAt: (x, z) => { const [u, v] = K.uv(x, z); const du = u - R.a[0], dv = v - R.a[1]; const ss = du * R.t[0] + dv * R.t[1], dd = du * R.n[0] + dv * R.n[1];
              if (ss < e || ss > L - e || dd < d0 || dd > d0 + (n - 1) * T) return null; return g0 - r * (Math.floor((dd - d0) / T) + 1); } }); } }
      continue;
    }
    // ---------- regular banded façade ----------
    const nb = Math.max(1, Math.round(L / 2.1)); const bw = L / nb;
    const cs = []; for (let k = 0; k < nb; k++) cs.push(bw * (k + 0.5));
    const ops = [];
    const endFace = L < 30; // [r5a] the short end walls flanking the corner pavilions read mostly solid, with sparse small square windows (photo)
    for (const [k, c] of cs.entries()) {
      if (endFace) { if (k % 2 === 0 || c < 2.5 || c > L - 2.5) continue; for (let f = 1; f < 6; f++) ops.push({ s0: c - 0.5, s1: c + 0.5, y0: floors[f] + 1.15, y1: floors[f] + 2.25, mull: 0, tran: 0.0 }); continue; }
      if (k % 2) continue; // [r5a] long fronts: a window every other bay, squarer (photo: mostly solid banded wall, sparse punched windows)
      ops.push({ s0: c - 0.5, s1: c + 0.5, y0: FL + 0.9, y1: FL + 3.1, mull: 0, tran: 0.7 });             // ground-floor window
      for (let f = 1; f < 6; f++) ops.push({ s0: c - 0.5, s1: c + 0.5, y0: floors[f] + 0.95, y1: floors[f] + 2.3, mull: 0, tran: 0.0, vent: true });
    }
    K.wall(R, BAND, 0, L, Y0, TOP, ops, 0.6);
    for (const o of ops) {
      K.fill(R, o, { rev: 0.45, glass: GL, frame: FR, mull: o.mull, tran: o.tran ? [o.y0 + (o.y1 - o.y0) * o.tran] : [] });
      if (o.vent) { const c = (o.s0 + o.s1) / 2; // perforated vent panel above the window: dark recess with a 3×2 grid
        K.rbox(R, M.blackPaint, c - 0.33, o.y1 + 0.2, -0.12, c + 0.33, o.y1 + 0.62, -0.1);
        for (const sx of [-0.11, 0.11]) K.rbox(R, C, c + sx - 0.03, o.y1 + 0.2, -0.12, c + sx + 0.03, o.y1 + 0.62, 0.0, { detail: true });
        K.rbox(R, C, c - 0.33, o.y1 + 0.39, -0.12, c + 0.33, o.y1 + 0.43, 0.0, { detail: true }); }
    }
    K.rbox(R, CD, -0.06, Y0, 0, L + 0.06, FL + 0.25, 0.1);                       // plinth

    K.rbox(R, C, -0.12, TOP - 0.15, 0, L + 0.12, TOP + 0.4, 0.42);                // attic string course
    frieze(R, C, 0, L, TOP + 0.4, EAVE, cs.filter((c, k) => k % 4 === 1 && c > 1.2 && c < L - 1.2).map((c) => ({ s: c, y: (TOP + 0.4 + EAVE) / 2 - 0.05, r: 0.72 }))); // [r5a] fewer, larger oculi (over every other blank bay)    // attic frieze with real oculi
    K.rbox(R, C, -0.08, EAVE - 0.25, 0, L + 0.08, EAVE, 0.18);
    // entrance doors where paths reach the long west side and the north end
  }
  // core
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cv = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  const coreP = poly.map(([u, v]) => { const du = u - cx, dv = v - cv; const L = Math.hypot(du, dv); return [u - du / L * 4.2, v - dv / L * 1.4]; });
  K.prism(M.concreteDark, coreP, Y0, EAVE - 0.05);
  // west door (path arrives at u ≈ -31.5) and north-end door (v ≈ -1.3)
  const door = (R, s) => { const g = gAt(R, s); const y = Math.max(g, FL - 0.2);
    { const gO = Math.min(gAt(R, s - 1.0, 2.2), gAt(R, s + 1.0, 2.2)); const rise = y - gO; // [r5a] steps + landing where the door sits above the walk (was a door floating over the lawn)
      if (rise > 0.1) { const n = Math.max(1, Math.round(rise / 0.155)), r = rise / n, T = 0.34; K.rbox(R, P.concreteBuff, s - 1.5, gO - 0.6, 0, s + 1.5, y, 1.3);
        walkables.push({ type: 'poly', pts: [R.at(s - 1.5, 0), R.at(s + 1.5, 0), R.at(s + 1.5, 1.3), R.at(s - 1.5, 1.3)].map(([u, v]) => K.xz(u, v)), y });
        for (let k = 0; k < n; k++) { const yy = y - r * (k + 1); if (yy <= gO + 0.02) break; K.rbox(R, P.concreteBuff, s - 1.5, gO - 0.6, 1.3 + k * T, s + 1.5, yy, 1.3 + (k + 1) * T); walkables.push({ type: 'poly', pts: [R.at(s - 1.5, 1.3 + k * T), R.at(s + 1.5, 1.3 + k * T), R.at(s + 1.5, 1.3 + (k + 1) * T), R.at(s - 1.5, 1.3 + (k + 1) * T)].map(([u, v]) => K.xz(u, v)), y: yy }); } } }
    K.rbox(R, M.glass, s - 1.1, y, 0.02, s + 1.1, y + 2.8, 0.06, { uvMode: 'keep' });
    K.rbox(R, FR, s - 1.2, y, 0.02, s + 1.2, y + 2.9, 0.1, { detail: true });
    K.rbox(R, C, s - 1.8, y + 3.2, 0, s + 1.8, y + 3.45, 1.4); };
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const R = K.run(a, b);
    if (Math.abs(R.t[1]) < 0.2 && a[1] > 10) { const s = Math.abs(a[0] - (-31.4)); if (s > 2 && s < R.L - 2) door(R, s); }
    if (Math.abs(R.t[0]) < 0.2 && a[0] < -40) { const s = Math.abs(-1.3 - a[1]); if (s > 2 && s < R.L - 2) door(R, s); } }
  // roof: clay-tile hip over the whole plan (hips follow the chamfers) with a flat mechanical deck
  polyHip(K, TILE, poly, EAVE, 0.5, { ov: 0.6, yTop: 34.0, deck: M.concreteDark, fascia: C });
  colliders.push({ type: 'poly', pts: K.polyXZ(poly), y0: Y0, y1: EAVE + 5 });
  const object3d = K.finish(); object3d.name = 'weill-hall';
  return { object3d, colliders, walkables };
}
