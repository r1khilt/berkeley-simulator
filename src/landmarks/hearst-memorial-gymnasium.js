// Hearst Memorial Gymnasium for Women (Bernard Maybeck & Julia Morgan, 1927).
// Buff reinforced concrete in a giant classical order: paired fluted pilasters frame full-height bronze window walls with
// relief spandrels, a deep plain frieze, cornice and plain attic parapet over flat roofs. Two tall pavilions project north
// toward the field and frame the raised pool terrace (main pool + a smaller pool, balustrades and urns); the gymnasium
// halls fill the south half along Bancroft Way, with three higher pavilions and two screened light courts.
// Massing follows the 2021 LiDAR (frame rotated -16.6° to the OSM outline): pavilions ~15.5 m, wings 12.5–13 m, terrace deck ~7 m.
import * as THREE from 'three';
import { Kit, deg, mats, openWall, flatRoof, lamp } from './lib/b05b-kit.js';
import { corniceProfile, balustrade, urn } from './lib/classic-kit.js';

export const info = {
  id: 'hearst-memorial-gymnasium',
  name: 'Hearst Memorial Gymnasium',
  subtitle: 'Bernard Maybeck & Julia Morgan · 1927',
  blurb: 'Built as the Hearst Gymnasium for Women in memory of Phoebe Apperson Hearst, Maybeck and Morgan\'s buff concrete temple of exercise wraps its gyms around raised outdoor terrace pools, ringed with balustrades and urns.',
  replaces: ['r/1734951'],
};

export async function build(ctx) {
  const K = new Kit(ctx, deg(-16.6)); const M = ctx.M; const X = mats(M);
  const W = new THREE.MeshStandardMaterial({ color: 0xdad6c7, roughness: 0.85, map: M.marble.map, normalMap: M.marble.normalMap, normalScale: new THREE.Vector2(0.3, 0.3) });                                                  // buff concrete
  // r4-sweep: the window walls read as flat dark-green slabs (dark-green muntins on near-black custom glass, no interiors).
  // Lighter verdigris bronze so the muntin grid reads, and the shared window glass (rooms behind it, lit at night).
  const BR = new THREE.MeshStandardMaterial({ color: 0x5d6f61, roughness: 0.45, metalness: 0.5 }); // verdigris bronze
  const GL = M.windowNight;
  const GLS = new THREE.MeshStandardMaterial({ color: 0x2b3436, roughness: 0.18, metalness: 0.3, envMapIntensity: 0.8 }); // roof skylights keep the plain glass
  const VOID = new THREE.MeshStandardMaterial({ color: 0x1d201f, roughness: 0.95 });
  const PIL = new THREE.MeshStandardMaterial({ color: 0xe6e2d4, roughness: 0.85, map: M.marble.map, normalMap: M.marble.normalMap, normalScale: new THREE.Vector2(0.3, 0.3) });
  const FLUTE = new THREE.MeshStandardMaterial({ color: 0xb9b19e, roughness: 0.9 });
  const PLINTH = new THREE.MeshStandardMaterial({ color: 0xc8c4b6, roughness: 0.9, map: M.marble.map });
  const TILE = new THREE.MeshStandardMaterial({ color: 0x8fd0d6, roughness: 0.35 });
  const WATER = new THREE.MeshStandardMaterial({ color: 0x4f93a3, roughness: 0.04, metalness: 0.15, envMapIntensity: 1.3 });
  const colliders = [], walkables = [];
  const DECK = 7.0;

  // ---------- one bronze window wall in opening o on run R ----------
  function bronzeBay(R, o) {
    const d = -0.38, w = o.s1 - o.s0, h = o.y1 - o.y0;
    K.rbox(R, GL, o.s0, o.y0, d - 0.03, o.s1, o.y1, d);
    const ySp0 = o.y0 + h * 0.47, ySp1 = ySp0 + Math.min(1.3, h * 0.17);
    // spandrel relief panel (bronze, proud) with a Greek-key border strip
    K.rbox(R, BR, o.s0, ySp0, d, o.s1, ySp1, d + 0.14);
    K.rbox(R, BR, o.s0 + 0.15, ySp0 + 0.12, d + 0.14, o.s1 - 0.15, ySp1 - 0.12, d + 0.2, { detail: true });
    for (const s of [o.s0 + 0.45, o.s1 - 0.45]) K.rbox(R, BR, s - 0.22, ySp0 + 0.2, d + 0.2, s + 0.22, ySp1 - 0.2, d + 0.27, { detail: true }); // cartouches
    { const n = 4, a = o.s0 + 0.8, b = o.s1 - 0.8; for (let i = 0; i < n; i++) { const cx = a + (b - a) * (i + 0.5) / n, r = (b - a) / n / 2; const g = new THREE.TorusGeometry(r * 0.8, 0.05, 4, 10, Math.PI); g.rotateZ(Math.PI); g.translate(cx, ySp1 - 0.3, d + 0.22); K.addRun(R, BR, g, { detail: true }); } }
    // frame + mullion grid: 3 columns (centre wider), small panes
    const cols = [o.s0, o.s0 + w * 0.3, o.s0 + w * 0.7, o.s1];
    for (const s of cols) K.rbox(R, BR, s - 0.06, o.y0, d, s + 0.06, o.y1, d + 0.1);
    K.rbox(R, BR, o.s0, o.y1 - 0.12, d, o.s1, o.y1, d + 0.1);
    for (let y = o.y0 + 0.45; y < o.y1 - 0.2; y += 0.45) { if (y > ySp0 - 0.1 && y < ySp1 + 0.1) continue; K.rbox(R, BR, o.s0, y - 0.03, d, o.s1, y + 0.03, d + 0.06); }
    for (let k = 0; k < 3; k++) { const a = cols[k], b = cols[k + 1]; const nn = Math.max(1, Math.round((b - a) / 0.34)); for (let i = 1; i < nn; i++) { const s = a + (b - a) * i / nn; K.rbox(R, BR, s - 0.03, o.y0, d, s + 0.03, o.y1, d + 0.05); } }
    // candelabrum posts on the two inner mullion lines: square base, tapered shaft, urn knops
    for (const s of [cols[1], cols[2]]) {
      const [u, v] = (() => { const p = R.at(s, d + 0.22); return p; })();
      K.box(BR, u - 0.17, o.y0, v - 0.17, u + 0.17, o.y0 + 0.5, v + 0.17, { detail: true });
      K.cyl(BR, u, o.y0 + 0.5, v, 0.11, 0.08, ySp0 - o.y0 - 0.5, 8, { detail: true });
      K.cyl(BR, u, ySp1, v, 0.08, 0.06, o.y1 - ySp1 - 0.1, 8, { detail: true });
    }
    // stone threshold
    K.rbox(R, M.graniteDark, o.s0 - 0.05, o.y0 - 0.22, d - 0.05, o.s1 + 0.05, o.y0, 0.12);
  }
  // ---------- giant fluted pilaster with a stylised Corinthian capital ----------
  function pilaster(R, s, y0, y1, w = 1.1, p = 0.4) {
    K.rbox(R, PIL, s - w / 2 - 0.1, y0, 0, s + w / 2 + 0.1, y0 + 0.3, p + 0.1);                      // plinth block
    K.rbox(R, PIL, s - w / 2 - 0.05, y0 + 0.3, 0, s + w / 2 + 0.05, y0 + 0.45, p + 0.05);           // torus
    K.rbox(R, PIL, s - w / 2, y0 + 0.45, 0, s + w / 2, y1 - 1.2, p);                                // shaft
    for (let i = 1; i < 6; i++) { const x = s - w / 2 + w * i / 6; K.rbox(R, FLUTE, x - 0.04, y0 + 0.75, p, x + 0.04, y1 - 1.45, p + 0.01, { detail: true }); }
    // Corinthian capital: astragal, bell, two tiers of acanthus, corner volutes, concave abacus with rosette
    const c0 = y1 - 1.2;
    K.rbox(R, PIL, s - w / 2 - 0.03, c0, 0, s + w / 2 + 0.03, c0 + 0.1, p + 0.04);
    K.rbox(R, PIL, s - w / 2 + 0.04, c0 + 0.1, 0, s + w / 2 - 0.04, c0 + 1.0, p + 0.02);
    for (const [y, hh, n, wd, tilt] of [[c0 + 0.12, 0.42, 3, 0.3, 0.25], [c0 + 0.42, 0.45, 2, 0.34, 0.35]]) {
      for (let i = 0; i < n; i++) { const x = s - w / 2 + w * (i + 0.5) / n; const g = new THREE.BoxGeometry(w * wd, hh, 0.12); g.translate(0, hh / 2, 0); g.rotateX(-tilt); g.translate(x, y, p + 0.08); K.addRun(R, PIL, g); }
      for (const sx of [-1, 1]) { const g = new THREE.BoxGeometry(0.12, hh, w * 0.25); g.translate(0, hh / 2, 0); g.rotateZ(sx * tilt); g.translate(s + sx * (w / 2 + 0.02), y, p * 0.55); K.addRun(R, PIL, g); }
    }
    for (const sx of [-1, 1]) { const g = new THREE.CylinderGeometry(0.15, 0.15, p + 0.3, 12); g.rotateX(Math.PI / 2); g.translate(s + sx * (w / 2 + 0.05), c0 + 0.88, (p + 0.3) / 2); K.addRun(R, PIL, g);
      const t = new THREE.TorusGeometry(0.1, 0.03, 4, 10); t.translate(s + sx * (w / 2 + 0.05), c0 + 0.88, p + 0.31); K.addRun(R, FLUTE, t, { detail: true }); }
    K.rbox(R, PIL, s - w / 2 - 0.22, c0 + 1.0, 0, s + w / 2 + 0.22, c0 + 1.2, p + 0.3);
    K.cyl(PIL, ...(() => { const q = R.at(s, p + 0.32); return [q[0], c0 + 0.62, q[1]]; })(), 0.12, 0.12, 0.3, 10, { detail: true });
  }
  // ---------- a classical block (rectangle in frame) ----------
  // faces: {S,E,N,W: false | {bays:n | 'auto', small:true}}; top = roof level (LiDAR); attic parapet rises 0.9 above
  function block(sp) {
    const { u0, u1, v0, v1, top } = sp;
    const gMin = K.gMin(u0, v0, u1, v1), gMax = K.gMax(u0, v0, u1, v1);
    const base = gMin - 1.2, gb = sp.floor ?? Math.max(gMin, (gMin + gMax) / 2);
    const yPl = gb + 1.1, atticTop = top + 1.7, corn = top - 0.6, frieze0 = corn - 1.25;
    const capTop = frieze0 - 0.12;
    const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
    for (const f of ['S', 'E', 'N', 'W']) {
      const fo = sp.faces?.[f]; if (fo === false) continue;
      const R = K.run(defs[f][0], defs[f][1]); const L = R.L;
      let gs = 0; for (let k = 0; k <= 8; k++) { const p = R.at(L * k / 8, 1.0); gs += ctx.groundAt(p[0], p[1]); } gs /= 9;
      const yPl = Math.min(gb + 1.1, gs + 0.35);
      const cp = fo?.corner ?? 2.4, winW = fo?.winW ?? 3.0, pilW = 1.0, unit = winW + 2 * pilW;
      const inner = L - 2 * cp; let n = fo?.bays ?? Math.max(0, Math.floor((inner + 3.0) / (unit + 3.0)));
      if (n * unit > inner) n = Math.max(0, Math.floor(inner / unit));
      const gap = n > 1 ? (inner - n * unit) / (n - 1) : 0;
      const centres = []; for (let i = 0; i < n; i++) centres.push(n === 1 ? L / 2 : cp + unit / 2 + i * (unit + gap));
      if (fo?.style === 'tiered') {
        const nb = Math.max(2, Math.round(L / 5.6)); const bw = L / nb; const ops2 = [];
        for (let i = 0; i < nb; i++) { const c = bw * (i + 0.5);
          if (i === 0 || i === nb - 1) ops2.push({ s0: c - 0.45, s1: c + 0.45, y0: yPl + 0.7, y1: yPl + 1.6, mull: 1, frame: BR, sill: false });
          else ops2.push({ s0: c - 1.35, s1: c + 1.35, y0: yPl + 0.3, y1: capTop - 0.45, noFill: true }); }
        openWall(K, R, W, 0, L, base, atticTop, ops2, { depth: 0.55, rev: 0.36, frame: BR, sill: false });
        for (const o of ops2) if (o.noFill) bronzeBay(R, o);
        for (let i = 0; i <= nb; i++) pilaster(R, Math.min(L - 0.65, Math.max(0.65, bw * i)), yPl, capTop);
        K.rbox(R, PLINTH, -0.15, base, 0, L + 0.15, yPl - 0.12, 0.14);
        K.mould(R, W, 0, L, [[0, yPl - 0.3], [0.2, yPl - 0.25], [0.2, yPl - 0.12], [0.08, yPl], [0, yPl]]);
        K.rbox(R, W, -0.02, frieze0 - 0.12, 0, L + 0.02, frieze0, 0.06);
        K.mould(R, W, 0, L, corniceProfile(corn + 0.6, 0.6, 0.65));
        K.mould(R, W, 0, L, [[0, atticTop - 0.22], [0.12, atticTop - 0.18], [0.14, atticTop], [0, atticTop]]);
        continue;
      }
      const winTop = Math.min(capTop - 0.35, yPl + (fo?.winH ?? 99));
      const ops = centres.map((c) => ({ s0: c - winW / 2, s1: c + winW / 2, y0: yPl, y1: winTop, noFill: true }));
      // small square windows in wide blank panels (two stacked)
      const smalls = [];
      const panels = [[0, centres.length ? centres[0] - unit / 2 : L]];
      for (let i = 0; i < centres.length - 1; i++) panels.push([centres[i] + unit / 2, centres[i + 1] - unit / 2]);
      if (centres.length) panels.push([centres[centres.length - 1] + unit / 2, L]);
      for (const [a, b] of panels) {
        if (b - a < 2.6 || fo?.small === false) continue;
        const c = (a + b) / 2; const isEnd = a === 0 || b === L;
        if (isEnd && b - a < 5.5) continue;
        for (const [yy, hh] of [[yPl + 1.3, 1.4], [(yPl + capTop) / 2 + 0.9, 1.6]]) if (yy + hh < frieze0 - 0.3) smalls.push({ s0: c - 0.6, s1: c + 0.6, y0: yy, y1: yy + hh, mull: 1, frame: BR, tran: [yy + hh * 0.5], muntins: 2 });
      }
      openWall(K, R, W, 0, L, base, atticTop, [...ops, ...smalls], { depth: 0.55, rev: 0.32, frame: BR, sill: true, sillMat: PIL });
      for (const o of ops) { bronzeBay(R, o); pilaster(R, o.s0 - pilW / 2, yPl, capTop); pilaster(R, o.s1 + pilW / 2, yPl, capTop); }
      // plinth / water table
      K.rbox(R, PLINTH, -0.15, base, 0, L + 0.15, yPl - 0.12, 0.14);
      K.mould(R, W, 0, L, [[0, yPl - 0.3], [0.2, yPl - 0.25], [0.2, yPl - 0.12], [0.08, yPl], [0, yPl]]);
      // frieze fillet, cornice, attic coping
      K.rbox(R, W, -0.02, frieze0 - 0.12, 0, L + 0.02, frieze0, 0.06);
      K.mould(R, W, 0, L, corniceProfile(corn + 0.6, 0.6, 0.65));
      K.mould(R, W, 0, L, [[0, atticTop - 0.22], [0.12, atticTop - 0.18], [0.14, atticTop], [0, atticTop]]);
      if (fo?.extra) fo.extra(R, { yPl, frieze0, corn, atticTop, base, centres, gb });
    }
    K.box(M.concreteDark, u0 + 0.55, base, v0 + 0.55, u1 - 0.55, top - 0.02, v1 - 0.55);
    K.box(M.concreteDark, u0 + 0.3, top - 0.25, v0 + 0.3, u1 - 0.3, top, v1 - 0.3);
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], base, atticTop));
    return { yPl, atticTop, gb, base };
  }

  // ===== north pavilions (project toward the field) =====
  block({ u0: -53.9, u1: -27.3, v0: -37.9, v1: -26.3, top: 13.0, faces: { N: { style: 'tiered' }, S: { bays: 0, small: false }, E: { corner: 2.0 } } });
  block({ u0: 28.2, u1: 53.5, v0: -37.6, v1: -25.5, top: 13.2, faces: { N: { style: 'tiered' }, S: { bays: 0, small: false }, W: { corner: 2.0 } } });
  // ===== side wings along the pool terrace =====
  block({ u0: -45.0, u1: -36.0, v0: -26.3, v1: 3.2, top: 12.2, faces: { N: false, S: false, E: { winH: 99, corner: 3.0 }, W: { corner: 3.5 } } });
  block({ u0: 36.4, u1: 45.7, v0: -25.5, v1: 3.2, top: 12.5, faces: { N: false, S: false, W: { corner: 3.0 }, E: { corner: 3.5 } } });
  // ===== south block: gym halls (three pavilions + two middles) =====
  const pav = (u0, u1, v1, extraS) => block({ u0, u1, v0: 3.2, v1, top: 15.6, faces: { S: { corner: 2.6, extra: extraS }, N: { corner: 2.4 }, E: u1 > 40 ? { corner: 3 } : false, W: u0 < -40 ? { corner: 3 } : false } });
  pav(-49.9, -28.6, 30.9);
  pav(28.4, 50.0, 30.1);
  // central pavilion: north face carries the arched aedicule over the terrace
  const cen = block({ u0: -10.4, u1: 7.4, v0: 3.2, v1: 29.9, top: 16.4, faces: { E: { bays: 0, small: false }, W: { bays: 0, small: false }, S: { corner: 2.2, bays: 1, winW: 4.0 }, N: { bays: 0, small: false, extra: (R, z) => aedicule(R, z) } } });
  const mid = (u0, u1) => {
    block({ u0, u1, v0: 3.2, v1: 25.0, top: 12.6, faces: { E: false, W: false, N: { corner: 1.6, winW: 2.6 }, S: { corner: 1.5 } } });
  };
  mid(-28.6, -10.4); mid(7.4, 28.4);
  for (const [u0, u1, v0, v1, y] of [[-46, -32, 10, 24, 15.6], [31, 46, 10, 24, 15.6], [-25, -14, 11, 21, 12.6], [11, 24, 11, 21, 12.6], [-6, 3, 12, 24, 16.4]]) { K.box(M.concreteDark, u0, y, v0, u1, y + 0.9, v1); K.box(GLS, u0 + 0.3, y + 0.9, v0 + 0.3, u1 - 0.3, y + 1.25, v1 - 0.3); }

  function aedicule(R, z) {
    const c = R.L / 2, yb = DECK + 1.6; const w = 3.6, h = 6.0;
    const o = { s0: c - w / 2, s1: c + w / 2, y0: yb, y1: yb + h, arch: true };
    // recessed arched niche (bronze door below a fanlight) framed by pilasters and a pediment-like cap
    K.rbox(R, W, c - w / 2 - 2.3, yb - 1.6, 0, c + w / 2 + 2.3, yb + h + 1.4, 0.35); K.rbox(R, W, c - w / 2 - 0.35, yb - 0.2, 0, c + w / 2 + 0.35, yb + h - w / 2, 0.42);
    K.rbox(R, M.windowNight, o.s0, yb, 0.33, o.s1, yb + h - w / 2, 0.36);
    const arch = new THREE.Shape(); arch.absarc(0, 0, w / 2, 0, Math.PI, false); arch.lineTo(w / 2, 0);
    const ag = new THREE.ShapeGeometry(arch, 10); ag.translate(c, yb + h - w / 2, 0.36); K.addRun(R, M.windowNight, ag, { uvMode: 'keep' });
    for (let k = 1; k < 4; k++) K.rbox(R, BR, o.s0 + w * k / 4 - 0.03, yb, 0.36, o.s0 + w * k / 4 + 0.03, yb + h - 0.2, 0.42, { detail: true }); for (let y = yb + 0.5; y < yb + h - 0.4; y += 0.55) K.rbox(R, BR, o.s0, y - 0.03, 0.36, o.s1, y + 0.03, 0.42, { detail: true });
    for (const s of [c - w / 2 - 0.85, c - w / 2 - 1.75, c + w / 2 + 0.85, c + w / 2 + 1.75]) pilaster(R, s, yb - 0.6, yb + h + 0.6, 0.7, 0.55);
    K.rbox(R, W, c - w / 2 - 2.5, yb + h + 0.6, 0, c + w / 2 + 2.5, yb + h + 1.2, 0.8);
    // segmental cap
    const cap = new THREE.Shape(); cap.moveTo(-w / 2 - 2.5, 0); cap.lineTo(w / 2 + 2.5, 0); cap.quadraticCurveTo(0, 2.2, -w / 2 - 2.5, 0);
    const cg = new THREE.ExtrudeGeometry(cap, { depth: 0.8, bevelEnabled: false }); cg.translate(c, yb + h + 1.2, 0); K.addRun(R, W, cg);
    // balustrades either side on the lower range roofs are handled by the deck balustrade
  }

  // ===== raised pool terrace =====
  const tu0 = -36.0, tu1 = 36.4, tv0 = -26.1, tv1 = 3.2;
  const P1 = [-15.8, -19.3, 14.5, -4.1];     // main pool (u0,v0,u1,v1)
  const P2 = [-34.2, -21.0, -26.8, -5.2];    // smaller west pool
  const gT = K.gMin(tu0, tv0, tu1, tv1) - 1.2;
  // podium in strips around the pools
  const podium = (u0, v0, u1, v1) => { if (u1 - u0 > 0.05 && v1 - v0 > 0.05) { K.box(W, u0, gT, v0, u1, DECK - 0.1, v1); K.box(M.paving, u0, DECK - 0.1, v0, u1, DECK, v1); } };
  podium(tu0, tv0, tu1, P2[1]); podium(tu0, P1[3], tu1, tv1);
  podium(tu0, P2[1], P2[0], P1[3]); podium(P2[2], P2[1], P1[0], P1[3]); podium(P1[2], P1[1], tu1, P1[3]);
  podium(P1[0], P2[1], P1[2], P1[1]); podium(P2[0], P2[3], P2[2], P1[3]);
  for (const [u0, v0, u1, v1, wl] of [[...P1, DECK - 0.35], [...P2, DECK - 0.35]]) {
    K.box(TILE, u0, gT, v0, u1, wl - 1.6, v1);                       // basin floor
    for (const [a0, b0, a1, b1] of [[u0, v0, u1, v0 + 0.25], [u0, v1 - 0.25, u1, v1], [u0, v0, u0 + 0.25, v1], [u1 - 0.25, v0, u1, v1]]) K.box(TILE, a0, wl - 1.6, b0, a1, DECK - 0.02, b1);
    K.box(WATER, u0 + 0.25, wl - 0.04, v0 + 0.25, u1 - 0.25, wl, v1 - 0.25);
    K.box(M.whitePaint, u0 - 0.35, DECK, v0 - 0.35, u1 + 0.35, DECK + 0.08, v0); K.box(M.whitePaint, u0 - 0.35, DECK, v1, u1 + 0.35, DECK + 0.08, v1 + 0.35);
    K.box(M.whitePaint, u0 - 0.35, DECK, v0, u0, DECK + 0.08, v1); K.box(M.whitePaint, u1, DECK, v0, u1 + 0.35, DECK + 0.08, v1);
    // lane lines on the main pool
    if (u1 - u0 > 20) for (let k = 1; k < 6; k++) { const vv = v0 + (v1 - v0) * k / 6; K.box(M.calBlue, u0 + 1.5, wl - 1.58, vv - 0.12, u1 - 1.5, wl - 1.56, vv + 0.12, { detail: true }); }
  }
  walkables.push({ type: 'fn', bounds: (() => { const cs = [K.xz(tu0, tv0), K.xz(tu1, tv0), K.xz(tu1, tv1), K.xz(tu0, tv1)]; return [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))]; })(),
    heightAt: (x, z) => { const [u, v] = K.uv(x, z); if (u < tu0 || u > tu1 || v < tv0 || v > tv1) return null; for (const P of [P1, P2]) if (u > P[0] && u < P[2] && v > P[1] && v < P[3]) return DECK - 0.35; return DECK; } });
  // north terrace front over the field: square piers with recessed dark lattice/grille panels and a slim metal railing
  {
    const R = K.run([28.2, tv0], [-27.3, tv0]); const n = 12;
    K.rbox(R, VOID, 0, gT, -1.4, R.L, DECK - 0.3, -1.0);
    for (let i = 0; i < n; i++) { const a = R.L * i / n + 0.25, b = R.L * (i + 1) / n - 0.25; for (let k = 1; k < 12; k++) { const s2 = a + (b - a) * k / 12; K.rbox(R, M.iron, s2 - 0.025, 4.3, -0.55, s2 + 0.025, DECK - 0.3, -0.5, { detail: true }); } K.rbox(R, M.iron, a, 4.25, -0.58, b, 4.35, -0.45); K.rbox(R, M.iron, a, DECK - 0.4, -0.58, b, DECK - 0.3, -0.45); }
    for (let i = 0; i <= n; i++) { const s2 = R.L * i / n; K.rbox(R, PIL, s2 - 0.25, gT, -1.4, s2 + 0.25, DECK + 0.25, 0.05); K.rbox(R, PIL, s2 - 0.32, DECK + 0.25, -0.1, s2 + 0.32, DECK + 0.38, 0.12); }
    K.rbox(R, W, -0.1, gT, -1.4, R.L + 0.1, 4.25, 0.0);
    K.rbox(R, W, -0.05, DECK - 0.3, -1.4, R.L + 0.05, DECK + 0.1, 0.05);
    for (let i = 0; i <= Math.round(R.L / 2.3); i++) { const s2 = R.L * i / Math.round(R.L / 2.3); K.rbox(R, M.iron, s2 - 0.03, DECK + 0.1, -0.2, s2 + 0.03, DECK + 1.15, -0.14, { detail: true }); }
    K.rbox(R, M.iron, 0, DECK + 1.1, -0.21, R.L, DECK + 1.16, -0.13, { detail: true }); K.rbox(R, M.iron, 0, DECK + 0.55, -0.2, R.L, DECK + 0.59, -0.14, { detail: true });
    colliders.push(K.colPoly([[-27.3, tv0 - 0.1], [28.2, tv0 - 0.1], [28.2, tv0 + 0.9], [-27.3, tv0 + 0.9]], gT, DECK + 1.2));
    // pier blocks at the north corners of the terrace (stair landings)
    for (const [a, b] of [[-27.3, -18.4], [17.4, 28.2]]) { K.box(W, a, gT, -28.5, b, DECK + 0.1, tv0); K.box(M.paving, a, DECK + 0.1, -28.5, b, DECK + 0.12, tv0); const R2 = K.run([b, -28.5], [a, -28.5]); balustrade(K, R2, W, 0.3, R2.L - 0.3, DECK + 0.1, 1.05, { d: -0.3 }); colliders.push(K.colPoly([[a, -28.6], [b, -28.6], [b, tv0], [a, tv0]], gT, DECK + 0.1)); }
  }
  // balustrades + urns around the main pool deck edges, and a Doric colonnade screening the west pool
  {
    for (const [a, b] of [[[P1[0] - 1.2, P1[1] - 1.2], [P1[2] + 1.2, P1[1] - 1.2]]]) { const R = K.run(a, b); for (let i = 0; i <= 6; i++) { const p = R.at(R.L * i / 6, 0); urn(K, W, p[0], DECK, p[1], 1.5); } }
    // low pool house on the east side of the deck (dressing rooms), plain buff walls with small windows
    const lu0 = 23.0, lu1 = 36.4, lv0 = -22.0, lv1 = -1.0, ly = DECK + 3.6;
    const R = K.run([lu0, lv0], [lu0, lv1]);
    openWall(K, R, W, 0, R.L, DECK, ly, [0.25, 0.5, 0.75].map((t) => ({ s0: R.L * t - 0.9, s1: R.L * t + 0.9, y0: DECK + 1.4, y1: DECK + 2.6, frame: BR, mull: 2 })), { depth: 0.45, rev: 0.3, frame: BR });
    K.mould(R, W, 0, R.L, corniceProfile(ly + 0.35, 0.45, 0.5));
    for (const [a2, b2] of [[[lu1, lv0], [lu0, lv0]], [[lu0, lv1], [lu1, lv1]]]) { const R2 = K.run(a2, b2); K.wall(R2, W, 0, R2.L, DECK, ly, [], 0.45); K.mould(R2, W, 0, R2.L, corniceProfile(ly + 0.35, 0.45, 0.5)); }
    K.box(M.concreteDark, lu0 + 0.3, ly - 0.3, lv0 + 0.3, lu1, ly + 0.25, lv1 - 0.3);
    colliders.push(K.colPoly([[lu0, lv0], [lu1, lv0], [lu1, lv1], [lu0, lv1]], DECK, ly + 0.4));
    for (const [u, v] of [[P1[0] - 1.2, P1[3] + 1.2], [P1[2] + 1.2, P1[3] + 1.2]]) urn(K, W, u, DECK, v, 1.5);
  }
  // ===== Bancroft light courts: low screen walls with balustrade + urns =====
  for (const [u0, u1, vS] of [[-32.7, -8.2, 34.8], [7.1, 31.9, 35.1]]) {
    const R = K.run([u0, vS], [u1, vS]); const gb = K.gMin(u0, vS - 3, u1, vS); const top = gb + 3.2;
    const ops = []; const n = 5; for (let i = 0; i < n; i++) { const c = R.L * (i + 0.5) / n; ops.push({ s0: c - 1.2, s1: c + 1.2, y0: gb + 0.6, y1: gb + 2.6, arch: true, noFill: true }); }
    K.wall(R, W, 0, R.L, gb - 1.2, top, ops, 2.9);
    for (const o of ops) K.rbox(R, M.iron, o.s0, o.y0, -1.5, o.s1, o.y1, -1.45, { detail: true });
    balustrade(K, R, W, 0.3, R.L - 0.3, top, 0.95, { d: -1.45, piers: [R.L / 3, (2 * R.L) / 3] });
    for (const s of [0.6, R.L / 3, (2 * R.L) / 3, R.L - 0.6]) { const p = R.at(s, -1.45); urn(K, W, p[0], top + 1.05, p[1], 1.3); }
    // side walls of the court return to the pavilions
    const vN = vS - 2.9; colliders.push(K.colPoly([[u0, vN], [u1, vN], [u1, vS], [u0, vS]], gb - 1.2, top + 1));
    K.box(M.paving, u0 + 0.5, gb - 0.2, 25.0, u1 - 0.5, gb + 0.02, vN);
  }
  // central recessed Bancroft entrance: broad steps up to the bronze doors
  {
    const gS = K.g(-1.5, 31.5); const n = 4;
    walkables.push(K.stairs(M.graniteDark, -7.6, 29.9, 6.6, 31.9, gS, gS + 0.64, '-v', n));
    for (const u of [-9.5, 8.5]) lamp(K, u, gS, 31.4, 3.6);
  }
  // terrace lamps

  const object3d = K.finish();
  object3d.name = 'hearst-memorial-gymnasium';
  return { object3d, colliders, walkables };
}
