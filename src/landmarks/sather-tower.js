// Sather Tower (the Campanile), John Galen Howard, 1914. Hand-modelled for Berkeley Simulator.
// Sources: NRHP nomination (seven-story granite shaft with an indented central section, a slit window per
// floor and a clock at the top; observation loggia with balustrade and 3 open arches; entablature carrying a
// balustrade with 4 corner obelisks capped with bronze flames; a smaller tower element ending in a bronze
// spiked lantern), Engineering News 1914 (base ~33 ft 9 in square, tapering to 30 ft 6 in at 189 ft 6 in),
// UC Visitor Services (17 ft clock dials, bronze numerals, 61-bell carillon, deck at 200 ft, marble spire).
// Massing heights (cornice 70.2 m, balustrade 72.7 m, drum 75.9 m, spire, lantern) fitted to the 2021 LiDAR.
import * as THREE from 'three';
import { Bucket, Soup, squareLathe, boxMM, boxC, extrudeShape, archPts, lathe, baluster, instanced, trs, frameMatrix, toLocal, rectPoly } from './lib/campanile-kit.js';
import { buildInterior, LIFT } from './lib/campanile-interior.js'; // r4-campanile: lobby, elevator, 7th-floor landing, 38 steps
import { buildCarillon } from './lib/campanile-bells.js';           // r4-campanile: struck bells (clappers, hour hammer)

export const info = {
  id: 'sather-tower',
  name: 'Sather Tower',
  subtitle: 'The Campanile · 307 feet · 1914',
  blurb: "John Galen Howard's granite clock and bell tower, a gift of Jane K. Sather modelled on St. Mark's Campanile in Venice. "
    + 'An elevator rises to the open observation deck 200 feet up, which shares the belfry with a 61-bell carillon; the four clock dials are 17 feet across.',
  replaces: ['w/24024507', 'way/24024507'],
};

// ---- tower frame: origin at the shaft centre; frame -z is the north (entrance) face ----
const CX = 1.35, CZ = 0.0;                // shaft centre in local coords (fitted to the LiDAR crown; OSM outline sits ~1.3 m west)
const ROT = Math.atan2(2.78, 10.2);        // 15.25°: aligns the frame with the OSM footprint edges / campus grid
const HW0 = 5.15, HW1 = 4.65, Y_TAPER = 57.76;   // 33'9" base tapering to 30'6" at 189'6"
const K = (HW0 - HW1) / Y_TAPER;
const hwAt = (y) => (y >= Y_TAPER ? HW1 : HW0 - K * Math.max(0, y));
const REC_HW = 3.4, REC_D = 0.15, Y_REC0 = 1.4, Y_REC1 = 50.9;  // shallow indented central field between ~1.75 m corner piers
const DECK_Y = 61.0;                        // observation deck, 200 ft
const YC = 54.6, DIAL_R = 2.59;             // clock centre (photo-fitted: XII ~3 m under the shaft moulding), 17 ft dial
const ARCH_SPRING = 66.25, ARCH_R = 0.85;   // arches 61.0 → 67.1 (≈3.3:1, photo-fitted)
const OPENINGS = [[-2.9, -1.2], [-0.85, 0.85], [1.2, 2.9]]; // three arches on slender columns between wide corner piers
const ENT0 = 67.35;                          // base of the entablature
const IN_HW = 3.75;                          // inner face of the loggia walls

const FACES = [
  { key: 'N', n: [0, 0, -1], t: [-1, 0, 0] },
  { key: 'E', n: [1, 0, 0], t: [0, 0, -1] },
  { key: 'S', n: [0, 0, 1], t: [1, 0, 0] },
  { key: 'W', n: [-1, 0, 0], t: [0, 0, 1] },
];
// face frame: X = s (viewer's right), Y = height, Z = outward offset from the (battered) face plane
function faceMat(f, hw, k = 0) {
  const n = new THREE.Vector3(...f.n), t = new THREE.Vector3(...f.t);
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(n, -k);
  return new THREE.Matrix4().makeBasis(t, up, n).setPosition(n.clone().multiplyScalar(hw));
}
const battered = (f) => faceMat(f, HW0, K);
const belfry = (f) => faceMat(f, HW1, 0);

// closed (out, y) profile extruded along s; used for the plinth so the entrance can interrupt it
function profileSlab(profile, s0, s1) {
  const s = new Soup();
  let cy = 0, cz = 0; profile.forEach(([o, y]) => { cz += o; cy += y; }); cz /= profile.length; cy /= profile.length;
  for (let i = 0; i < profile.length; i++) {
    const [oa, ya] = profile[i], [ob, yb] = profile[(i + 1) % profile.length];
    const hint = [0, (ya + yb) / 2 - cy, (oa + ob) / 2 - cz];
    s.quad([s0, ya, oa], [s1, ya, oa], [s1, yb, ob], [s0, yb, ob], hint);
  }
  const tri = THREE.ShapeUtils.triangulateShape(profile.map(([o, y]) => new THREE.Vector2(o, y)), []);
  for (const [a, b, c] of tri) {
    const P = (k, x) => [x, profile[k][1], profile[k][0]];
    s.tri(P(a, s0), P(b, s0), P(c, s0), [-1, 0, 0]);
    s.tri(P(a, s1), P(b, s1), P(c, s1), [1, 0, 0]);
  }
  return s.geometry();
}

// Roman numeral built from stroke boxes, centred at origin, "up" = +Y, height h
function romanGeom(str, h) {
  const parts = [], sw = h * 0.12, d = 0.045, gap = h * 0.08;
  const W = { I: h * 0.18, V: h * 0.62, X: h * 0.62 };
  let total = 0; for (const ch of str) total += W[ch]; total += gap * (str.length - 1);
  let x = -total / 2;
  const stroke = (x0, y0, x1, y1, w) => {
    const len = Math.hypot(x1 - x0, y1 - y0), g = new THREE.BoxGeometry(w, len, d);
    g.rotateZ(Math.atan2(-(x1 - x0), y1 - y0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, d / 2); parts.push(g);
  };
  for (const ch of str) {
    const w = W[ch], c = x + w / 2;
    if (ch === 'I') stroke(c, -h / 2, c, h / 2, sw);
    else if (ch === 'V') { stroke(c - w / 2 + sw * 0.4, h / 2, c, -h / 2, sw); stroke(c + w / 2 - sw * 0.4, h / 2, c, -h / 2, sw * 0.6); }
    else { stroke(c - w / 2 + sw * 0.4, h / 2, c + w / 2 - sw * 0.4, -h / 2, sw); stroke(c + w / 2 - sw * 0.4, h / 2, c - w / 2 + sw * 0.4, -h / 2, sw * 0.6); }
    x += w + gap;
  }
  // serif rules top and bottom, as on Howard-era tower dials
  parts.push(new THREE.BoxGeometry(total + h * 0.1, h * 0.07, d).translate(0, h / 2, d / 2));
  parts.push(new THREE.BoxGeometry(total + h * 0.1, h * 0.07, d).translate(0, -h / 2, d / 2));
  return parts;
}


// pale weathered-copper patina of the spire (photos: clearly cooler/greener than the granite, far paler than fresh verdigris)
function spireMaterial() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d'); const img = g.createImageData(128, 128);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const col = Array.from({ length: 128 }, () => rnd());
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const st = 0.5 * col[x] + 0.3 * col[(x + 1) % 128] + 0.2 * col[(x + 127) % 128];
    const k = 0.95 + (st - 0.5) * 0.16 + (rnd() - 0.5) * 0.04;
    const i = (y * 128 + x) * 4;
    img.data[i] = Math.min(255, 176 * k); img.data[i + 1] = Math.min(255, 198 * k); img.data[i + 2] = Math.min(255, 187 * k); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.05 }); m.name = 'campanileSpire';
  return m;
}

export async function build(ctx) {
  const { M, boxUV, groundAt } = ctx;
  const root = new THREE.Group(); root.name = 'sather-tower';
  const detailG = new THREE.Group(); detailG.userData.detail = true; root.add(detailG);
  const F = frameMatrix(CX, CZ, ROT);
  const bUV = (g) => { g = boxUV(g, 1 / 2.6); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.65); return g; }; // long low courses (~2 m x 0.65 m blocks)
  const main = new Bucket(bUV), fine = new Bucket(bUV);
  const L = (u, y, v) => toLocal(F, u, y, v);
  const gAt = (u, v) => { const p = L(u, 0, v); return groundAt(p[0], p[2]); };
  const ashlar = M.ashlar.clone(); ashlar.map = M.granite.map; ashlar.normalScale = new THREE.Vector2(0.9, 0.9); ashlar.color.setRGB(1.05, 1.1, 1.18); ashlar.name = 'campanileAshlar';   // pale granite, joints only in relief
  const granite = M.granite.clone(); granite.color.setRGB(1.05, 1.1, 1.18); granite.name = 'campanileGranite';
  const handMat = new THREE.MeshStandardMaterial({ color: 0x587a6c, roughness: 0.5, metalness: 0.45 }); handMat.name = 'campanileBronze';
  const slitMat = new THREE.MeshStandardMaterial({ color: 0x131518, roughness: 0.95 }); slitMat.name = 'campanileSlit';
  const spireMat = spireMaterial();
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0x5f786b, roughness: 0.5, metalness: 0.35 }); lanternMat.name = 'campanileLantern';
  // one-sided dark screen behind each belfry grille: the arches read as dark slots from outside, but stay see-through from the deck
  const voidMat = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.95, transparent: true, opacity: 0.68, depthWrite: false }); voidMat.name = 'campanileBelfryShadow';

  // ---------- shaft: plain ashlar corner piers framing the shallow indented panel ----------
  {
    const rows = [[-1.2, 0], [Y_REC1, 0]];
    const s = new Soup();
    for (const [sx, sz] of [[1, -1], [1, 1], [-1, 1], [-1, -1]]) {
      const pts = rows.map(([y, e]) => {
        const hw = hwAt(y), h2 = hw - e, inn = hw - REC_D - 0.05;
        return { R0: [sx * REC_HW, y, sz * inn], P0: [sx * REC_HW, y, sz * h2], P1: [sx * h2, y, sz * h2], P2: [sx * h2, y, sz * REC_HW], R2: [sx * inn, y, sz * REC_HW] };
      });
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        s.quad(a.R0, a.P0, b.P0, b.R0, [-sx, 0, 0]);
        s.quad(a.P0, a.P1, b.P1, b.P0, [0, 0, sz]);
        s.quad(a.P1, a.P2, b.P2, b.P1, [sx, 0, 0]);
        s.quad(a.P2, a.R2, b.R2, b.P2, [0, 0, -sz]);
      }
    }
    main.add(ashlar, s.geometry());
  }
  // ---------- indented central panels with slit windows (and the entrance on the north face) ----------
  const SLITS = [5.6, 12.9, 20.2, 27.5, 34.8, 42.1, 49.4], SW = 0.18, SH = 0.75;   // 7 small deep slits per face
  const doorY0 = Math.max(0.0, gAt(0, -HW0 - 0.3)), doorY1 = 3.9, DOOR_HW = 1.2;
  for (const f of FACES) {
    const Fm = battered(f), isN = f.key === 'N';
    const y0 = isN ? -0.6 : Y_REC0;
    const holes = SLITS.map((yc) => [[-SW, yc - SH], [SW, yc - SH], [SW, yc + SH], [-SW, yc + SH]]);
    if (isN) holes.push([[-DOOR_HW, doorY0], [DOOR_HW, doorY0], [DOOR_HW, doorY1], [-DOOR_HW, doorY1]]);
    const shape = new THREE.Shape([[-REC_HW - 0.03, y0], [REC_HW + 0.03, y0], [REC_HW + 0.03, Y_REC1], [-REC_HW - 0.03, Y_REC1]].map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    main.add(ashlar, new THREE.ShapeGeometry(shape).translate(0, 0, -REC_D), { matrix: Fm });
    // reveals + glass + sills
    const rev = new Soup();
    const reveal = (x0, x1, ya, yb, za, zb) => {
      rev.quad([x0, ya, za], [x0, yb, za], [x0, yb, zb], [x0, ya, zb], [1, 0, 0]);
      rev.quad([x1, ya, za], [x1, yb, za], [x1, yb, zb], [x1, ya, zb], [-1, 0, 0]);
      rev.quad([x0, ya, za], [x1, ya, za], [x1, ya, zb], [x0, ya, zb], [0, 1, 0]);
      rev.quad([x0, yb, za], [x1, yb, za], [x1, yb, zb], [x0, yb, zb], [0, -1, 0]);
    };
    for (const yc of SLITS) {
      reveal(-SW, SW, yc - SH, yc + SH, -REC_D, -REC_D - 0.6);
      main.add(slitMat, new THREE.PlaneGeometry(2 * SW, 2 * SH).translate(0, yc, -REC_D - 0.55), { matrix: Fm });
      main.add(granite, boxC(0, yc - SH - 0.06, -REC_D + 0.03, 2 * SW + 0.3, 0.12, 0.1), { matrix: Fm });
    }
    if (isN) {
      reveal(-DOOR_HW, DOOR_HW, doorY0, doorY1, -REC_D, -REC_D - 0.75);
      // bronze door leaves: animated (they swing open as you approach), built with the interior below; transom stays
      main.add(M.darkBronze, boxC(0, 3.1, -REC_D - 0.62, 2.4, 0.12, 0.14), { matrix: Fm });
      main.add(M.windowNight, new THREE.PlaneGeometry(2.4, 0.74).translate(0, 3.53, -REC_D - 0.7), { matrix: Fm });
      for (const sx of [-0.6, 0, 0.6]) fine.add(M.darkBronze, boxC(sx, 3.53, -REC_D - 0.66, 0.05, 0.74, 0.05), { matrix: Fm });
      main.add(M.graniteDark, boxC(0, doorY0 - 0.04, -REC_D - 0.35, 2.4, 0.12, 0.8), { matrix: Fm });
      // granite architrave around the door and a cornice head
      main.add(granite, boxC(-DOOR_HW - 0.17, (doorY0 + doorY1) / 2, -REC_D + 0.05, 0.34, doorY1 - doorY0, 0.18), { matrix: Fm });
      main.add(granite, boxC(DOOR_HW + 0.17, (doorY0 + doorY1) / 2, -REC_D + 0.05, 0.34, doorY1 - doorY0, 0.18), { matrix: Fm });
      main.add(granite, boxC(0, doorY1 + 0.2, -REC_D + 0.05, 2 * DOOR_HW + 0.68, 0.4, 0.18), { matrix: Fm });
      main.add(granite, boxC(0, doorY1 + 0.48, -REC_D + 0.1, 2 * DOOR_HW + 0.9, 0.16, 0.3), { matrix: Fm });
    } else {
      // plain lower face below the indent + sill ledge
      const s = new Soup();
      s.quad([-REC_HW, -1.2, 0], [REC_HW, -1.2, 0], [REC_HW, Y_REC0, 0], [-REC_HW, Y_REC0, 0], [0, 0, 1]);
      s.quad([-REC_HW, Y_REC0, 0], [REC_HW, Y_REC0, 0], [REC_HW, Y_REC0, -REC_D], [-REC_HW, Y_REC0, -REC_D], [0, 1, 0]);
      main.add(ashlar, s.geometry(), { matrix: Fm });
    }
    main.add(ashlar, rev.geometry(), { matrix: Fm });
    // head of the indent: a shallow corbelled lintel
    main.add(granite, boxC(0, Y_REC1 - 0.2, -REC_D + 0.03, 2 * REC_HW, 0.4, 0.06), { matrix: Fm });
  }
  // plinth (interrupted by the entrance)
  {
    const prof = [[0.32, -1.2], [0.32, 0.7], [0.27, 0.78], [0.27, 0.86], [0.2, 0.96], [0.12, 1.1], [0.06, 1.26], [0.0, 1.4], [-0.3, 1.4], [-0.3, -1.2]];
    for (const f of FACES) {
      const Fm = faceMat(f, HW0), full = f.key === 'N' || f.key === 'S';
      const ext = full ? HW0 + 0.32 : HW0 - 0.05;
      const spans = f.key === 'N' ? [[-ext, -REC_HW], [REC_HW, ext]] : [[-ext, ext]];
      for (const [a, b] of spans) main.add(M.graniteDark, profileSlab(prof, a, b), { matrix: Fm });
    }
  }
  // upper shaft block with the clocks
  main.add(ashlar, squareLathe([[Y_REC1, hwAt(Y_REC1)], [57.6, hwAt(57.6)]], { capTop: false })); // r4: no internal caps (landing room)
  // crowning moulding of the shaft
  main.add(granite, squareLathe([[57.6, hwAt(57.6)], [57.68, 4.72], [57.8, 4.78], [57.95, 4.84], [58.12, 4.84], [58.12, HW1]], { capBottom: false, capTop: false }));
  // belfry pedestal with its frieze of rosettes, then the projecting sill course
  main.add(ashlar, squareLathe([[58.12, HW1], [60.5, HW1]], { capBottom: false, capTop: false }));
  main.add(granite, squareLathe([[58.3, HW1], [58.38, HW1 + 0.06], [59.12, HW1 + 0.06], [59.2, HW1]], { capBottom: false, capTop: false }));
  main.add(granite, squareLathe([[60.5, HW1], [60.5, 4.72], [60.62, 4.8], [61.0, 4.8], [61.0, HW1]], { capBottom: false, capTop: false }));
  {
    const ros = new THREE.CylinderGeometry(0.2, 0.2, 0.07, 12).rotateX(Math.PI / 2);
    const boss = new THREE.SphereGeometry(0.09, 8, 6);
    for (const f of FACES) {
      const Fm = faceMat(f, HW1 + 0.06);
      for (let i = 0; i < 15; i++) {
        const sx = -4.2 + (i * 8.4) / 14;
        fine.add(granite, ros.clone().translate(sx, 58.75, 0.035), { matrix: Fm });
        fine.add(granite, boss.clone().scale(1, 1, 0.6).translate(sx, 58.75, 0.08), { matrix: Fm });
      }
    }
  }
  // ---------- clocks: bronze numerals and hands set straight onto the granite inside a square moulded panel (no dial plate) ----------
  const handM = [], handH = [];
  {
    for (const f of FACES) {
      const D = faceMat(f, hwAt(YC), 0).multiply(new THREE.Matrix4().makeTranslation(0, YC, 0));
      const P = 2.95, T = 0.2;
      main.add(granite, boxC(0, P, 0.04, 2 * P + T, T, 0.08), { matrix: D });
      main.add(granite, boxC(0, -P, 0.04, 2 * P + T, T, 0.08), { matrix: D });
      main.add(granite, boxC(-P, 0, 0.04, T, 2 * P - T, 0.08), { matrix: D });
      main.add(granite, boxC(P, 0, 0.04, T, 2 * P - T, 0.08), { matrix: D });
      const NUM = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      NUM.forEach((str, k) => {
        const a = (k / 12) * Math.PI * 2;
        for (const g of romanGeom(str, 0.6)) { g.rotateZ(-a); g.translate(2.12 * Math.sin(a), 2.12 * Math.cos(a), 0.01); main.add(handMat, g, { matrix: D }); }
      });
      main.add(handMat, new THREE.CylinderGeometry(0.15, 0.17, 0.3, 16).rotateX(Math.PI / 2).translate(0, 0, 0.15), { matrix: D });
      handM.push(D.clone()); handH.push(D.clone());
    }
  }
  // ---------- loggia (observation level) ----------
  // r4: deck slab in four pieces around the stair well (u ±0.55, v -1.37..1.45, inside the carillonist's cabin)
  for (const [u0, v0, u1, v1] of [[-IN_HW - 0.1, -IN_HW - 0.1, IN_HW + 0.1, -1.37], [-IN_HW - 0.1, 1.45, IN_HW + 0.1, IN_HW + 0.1], [-IN_HW - 0.1, -1.37, -0.55, 1.45], [0.55, -1.37, IN_HW + 0.1, 1.45]]) main.add(M.paving, boxMM(u0, 60.7, v0, u1, DECK_Y, v1));
  const balPos = [], barMats = [];
  const colGeo = lathe([[0.0, 0], [0.24, 0], [0.24, 0.1], [0.2, 0.16], [0.17, 0.24], [0.15, 4.69], [0.17, 4.75], [0.17, 4.81], [0.0, 4.81]], 12);
  const capGeo = lathe([[0.0, 0], [0.16, 0], [0.2, 0.12], [0.27, 0.26], [0.3, 0.32], [0.0, 0.32]], 8);
  for (const f of FACES) {
    const Fm = belfry(f), full = f.key === 'N' || f.key === 'S';
    const ext = full ? HW1 : IN_HW;
    const outline = [[-ext, 60.95], [ext, 60.95], [ext, ENT0 + 0.02], [-ext, ENT0 + 0.02]];
    const holes = OPENINGS.map(([a, b]) => archPts(a, b, DECK_Y, ARCH_SPRING, 12));
    main.add(ashlar, extrudeShape(outline, holes, HW1 - IN_HW, 12).translate(0, 0, -(HW1 - IN_HW)), { matrix: Fm });
    const zc = -(HW1 - IN_HW) / 2;
    for (const [a, b] of OPENINGS) {
      const cx = (a + b) / 2, w = b - a;
      // archivolt + keystone
      const ring = [];
      for (let i = 0; i <= 14; i++) { const t = Math.PI * (1 - i / 14); ring.push([cx + (ARCH_R + 0.17) * Math.cos(t), ARCH_SPRING + (ARCH_R + 0.17) * Math.sin(t)]); }
      for (let i = 14; i >= 0; i--) { const t = Math.PI * (1 - i / 14); ring.push([cx + ARCH_R * Math.cos(t), ARCH_SPRING + ARCH_R * Math.sin(t)]); }
      main.add(granite, extrudeShape(ring, [], 0.07, 12), { matrix: Fm });
      main.add(granite, extrudeShape([[cx - 0.11, ARCH_SPRING + ARCH_R - 0.05], [cx + 0.11, ARCH_SPRING + ARCH_R - 0.05], [cx + 0.15, ENT0], [cx - 0.15, ENT0]], [], 0.11), { matrix: Fm });
      // low balustrade within the reveal
      main.add(granite, boxC(cx, DECK_Y + 0.09, zc, w, 0.18, 0.5), { matrix: Fm });
      main.add(granite, boxC(cx, DECK_Y + 1.06, zc, w, 0.16, 0.56), { matrix: Fm });
      for (let i = 0; i < 5; i++) balPos.push(Fm.clone().multiply(trs(a + (i + 0.5) * (w / 5), DECK_Y + 0.18, zc)));
      // dark bronze grille filling the arch above the balustrade
      const nb = 12;
      for (let i = 0; i < nb; i++) {
        const sx = a + (i + 0.5) * (w / nb), dx = sx - cx;
        const top = ARCH_SPRING + Math.sqrt(Math.max(0, ARCH_R * ARCH_R - dx * dx)) - 0.02, bot = DECK_Y + 1.14;
        barMats.push(Fm.clone().multiply(trs(sx, (top + bot) / 2, zc - 0.12, 0, 1, top - bot, 1)));
      }
      for (const yy of [63.2, 65.0, ARCH_SPRING]) fine.add(M.iron, boxC(cx, yy, zc - 0.12, w, 0.05, 0.05), { matrix: Fm });
      main.add(voidMat, new THREE.ShapeGeometry(new THREE.Shape(archPts(a, b, DECK_Y + 1.14, ARCH_SPRING, 12).map(([x, y]) => new THREE.Vector2(x, y)))).translate(0, 0, zc - 0.2), { matrix: Fm, uv: 'keep' });
    }
    // slender columns between the arches, and responds against the corner piers
    for (const sx of [-2.98, -1.025, 1.025, 2.98]) {
      main.add(granite, colGeo.clone().translate(sx, DECK_Y, 0.02), { matrix: Fm, smooth: true });
      main.add(granite, capGeo.clone().translate(sx, DECK_Y + 4.81, 0.02), { matrix: Fm, smooth: true });
      main.add(granite, boxC(sx, ARCH_SPRING - 0.06, 0.02, 0.62, 0.12, 0.62), { matrix: Fm });
    }
    // wide corner piers: impost band and shallow sunk panels
    for (const side of [-1, 1]) {
      const x0 = Math.min(side * 3.22, side * 4.38), x1 = Math.max(side * 3.22, side * 4.38);
      main.add(granite, boxC(side * 3.87, ARCH_SPRING - 0.06, 0.04, 1.56, 0.14, 0.08), { matrix: Fm });
      for (const [y0, y1] of [[61.45, 65.95], [66.5, 67.15]]) {
        main.add(granite, boxMM(x0, y0, 0, x1, y0 + 0.1, 0.05), { matrix: Fm });
        main.add(granite, boxMM(x0, y1 - 0.1, 0, x1, y1, 0.05), { matrix: Fm });
        main.add(granite, boxMM(x0, y0 + 0.1, 0, x0 + 0.1, y1 - 0.1, 0.05), { matrix: Fm });
        main.add(granite, boxMM(x1 - 0.1, y0 + 0.1, 0, x1, y1 - 0.1, 0.05), { matrix: Fm });
      }
    }
  }
  const balGeo = baluster(0.88, 0.1, 8);
  detailG.add(instanced(balGeo, granite, balPos, F, { detail: true }));
  detailG.add(instanced(new THREE.CylinderGeometry(0.016, 0.016, 1, 6), M.iron, barMats, F, { detail: true, shadow: false })); // r4: slimmer round bars
  // ceiling over the loggia + lamps
  main.add(M.concreteDark, boxMM(-IN_HW - 0.05, ENT0, -IN_HW - 0.05, IN_HW + 0.05, ENT0 + 0.3, IN_HW + 0.05));
  for (const [u, v] of [[0, -2.6], [2.6, 0], [0, 2.6], [-2.6, 0]]) fine.add(M.lampGlow, boxC(u, ENT0 - 0.04, v, 0.3, 0.08, 0.3));
  // ---------- entablature: fasciae, garlanded frieze, dentils and corona ----------
  main.add(granite, squareLathe([[ENT0, 4.68], [67.7, 4.68], [67.7, 4.72], [68.0, 4.72], [68.0, 4.66], [69.0, 4.66], [69.0, 4.72], [69.25, 4.86], [69.52, 4.86], [69.52, 5.3], [69.95, 5.33], [70.05, 5.4], [70.2, 5.45]]));
  {
    const swag = new THREE.TorusGeometry(0.4, 0.075, 5, 10, Math.PI).rotateZ(Math.PI);
    const ros = new THREE.SphereGeometry(0.12, 8, 6).scale(1, 1, 0.6);
    for (const f of FACES) {
      const Fm = faceMat(f, 4.66);
      for (let sx = -4.56; sx <= 4.57; sx += 0.24) fine.add(granite, boxC(sx, 69.4, 0.3, 0.12, 0.2, 0.2), { matrix: Fm });
      for (let i = 0; i < 10; i++) {
        const sx = -4.05 + i * 0.9;
        fine.add(granite, ros.clone().translate(sx, 68.72, 0.04), { matrix: Fm });
        if (i < 9) fine.add(granite, swag.clone().translate(sx + 0.45, 68.78, 0.04), { matrix: Fm });
      }
    }
  }
  // ---------- solid parapet with three carved panels per face, corner pedestals and obelisks ----------
  main.add(granite, squareLathe([[70.2, 4.0], [72.2, 4.0]], { capBottom: false }));
  main.add(granite, squareLathe([[70.2, 4.36], [70.44, 4.36], [70.44, 4.3]], { capBottom: false, capTop: false }));
  {
    const disc = new THREE.TorusGeometry(0.34, 0.05, 6, 20);
    const fan = lathe([[0, 0], [0.07, 0.04], [0.1, 0.25], [0.13, 0.5], [0.09, 0.78], [0.0, 0.95]], 6);
    const leaf = new THREE.TorusGeometry(0.16, 0.04, 5, 8, Math.PI * 1.2);
    for (const f of FACES) {
      const Fm = faceMat(f, 4.09), full = f.key === 'N' || f.key === 'S';
      const ext = full ? 4.3 : 3.88;
      main.add(granite, boxC(0, 71.3, 0, 2 * ext, 1.72, 0.42), { matrix: Fm });
      main.add(granite, boxC(0, 72.3, 0.02, 2 * ext + 0.08, 0.24, 0.5), { matrix: Fm });
      main.add(granite, boxC(0, 72.47, 0, 2 * ext - 0.1, 0.1, 0.42), { matrix: Fm });
      for (const [a, b] of [[-3.3, -1.37], [-0.97, 0.97], [1.37, 3.3]]) {
        const cx = (a + b) / 2;
        main.add(granite, boxMM(a, 70.62, 0.21, b, 70.74, 0.27), { matrix: Fm });
        main.add(granite, boxMM(a, 71.86, 0.21, b, 71.98, 0.27), { matrix: Fm });
        main.add(granite, boxMM(a, 70.74, 0.21, a + 0.12, 71.86, 0.27), { matrix: Fm });
        main.add(granite, boxMM(b - 0.12, 70.74, 0.21, b, 71.86, 0.27), { matrix: Fm });
        fine.add(granite, disc.clone().translate(cx, 71.22, 0.24), { matrix: Fm });
        fine.add(granite, fan.clone().scale(1, 1, 0.35).translate(cx, 70.82, 0.25), { matrix: Fm });
        fine.add(granite, leaf.clone().rotateZ(-0.3).translate(cx + 0.14, 71.42, 0.25), { matrix: Fm });
        fine.add(granite, leaf.clone().rotateZ(Math.PI + 0.3 - Math.PI * 0.2).scale(-1, 1, 1).translate(cx - 0.14, 71.42, 0.25), { matrix: Fm });
      }
      for (const sx of [-1.17, 1.17]) main.add(granite, boxC(sx, 71.3, 0.25, 0.36, 1.5, 0.1), { matrix: Fm });
    }
    const bud = lathe([[0.0, 0], [0.14, 0], [0.14, 0.08], [0.08, 0.12], [0.14, 0.2], [0.17, 0.36], [0.14, 0.55], [0.08, 0.72], [0.0, 0.86]], 10);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const cx = sx * 3.8, cz = sz * 3.8;
      main.add(granite, squareLathe([[70.2, 0.52], [72.55, 0.52], [72.55, 0.58], [72.75, 0.58], [72.95, 0.5]], { cx, cz }));
      main.add(granite, squareLathe([[72.95, 0.44], [73.25, 0.44], [73.25, 0.38], [76.3, 0.24], [76.42, 0.24], [76.42, 0.0]], { cx, cz }));
      main.add(lanternMat, bud.clone().scale(1.15, 1.0, 1.15).translate(cx, 76.42, cz), { smooth: true, uv: 'keep' });
    }
  }
  // ---------- set-back drum under the spire (mostly hidden behind the parapet from the ground) ----------
  main.add(ashlar, squareLathe([[72.2, 2.4], [73.75, 2.4]], { capBottom: false }));
  main.add(granite, squareLathe([[73.75, 2.4], [73.75, 2.48], [73.95, 2.52], [73.95, 2.4]]));
  for (const f of FACES) {
    const Fm = faceMat(f, 2.4);
    
  }
  // ---------- pyramidal spire: smooth pale-green weathered copper with hip rolls and inset fillets ----------
  const SP0 = 73.95, SP1 = 75.3, SPH1 = 2.6, SPT = 84.6, SPTH = 0.72;   // eave just above the parapet, as seen from the ground
  main.add(spireMat, squareLathe([[SP0, 2.45], [SP0 + 0.1, 3.0], [SP0 + 0.25, 3.0], [SP1, SPH1], [SPT, SPTH]]));
  {
    const rod = (a, b, r) => {
      const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
      const g = new THREE.CylinderGeometry(r, r, d.length(), 6, 1);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
      return g.translate((va.x + vb.x) / 2, (va.y + vb.y) / 2, (va.z + vb.z) / 2);
    };
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { main.add(spireMat, rod([sx * 3.0, SP0 + 0.26, sz * 3.0], [sx * SPH1, SP1, sz * SPH1], 0.07), { smooth: true }); main.add(spireMat, rod([sx * SPH1, SP1, sz * SPH1], [sx * SPTH, SPT, sz * SPTH], 0.07), { smooth: true }); }
    const slope = (SPH1 - SPTH) / (SPT - SP1);
    for (const f of FACES) {
      for (const side of [-1, 1]) {
        const p = (y) => { const hw = SPH1 - (y - SP1) * slope, sx = side * (hw - 0.2), o = hw + 0.03; return [f.n[0] * o + f.t[0] * sx, y, f.n[2] * o + f.t[2] * sx]; };
        fine.add(spireMat, rod(p(SP1 + 0.2), p(SPT - 0.4), 0.03));
      }
    }
  }
  // ---------- stepped plinth and the slender bronze spiked lantern ----------
  main.add(spireMat, squareLathe([[SPT - 0.1, 0.8], [SPT + 0.12, 0.8], [SPT + 0.12, 0.66], [SPT + 0.9, 0.62], [SPT + 1.0, 0.66], [SPT + 1.1, 0.66], [SPT + 1.1, 0.44]]));
  const LB = SPT + 1.1, LT = 88.3;
  main.add(lanternMat, squareLathe([[LB, 0.24], [LT, 0.24]], { capBottom: false }));
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) main.add(lanternMat, boxC(sx * 0.44, (LB + LT) / 2, sz * 0.44, 0.12, LT - LB, 0.12));
  for (const f of FACES) {
    const Fm = faceMat(f, 0.44);
    const fr = [];
    for (let i = 0; i <= 12; i++) { const t = Math.PI * (1 - i / 12); fr.push([0.38 * Math.cos(t), 88.0 + 0.38 * Math.sin(t)]); }
    for (let i = 12; i >= 0; i--) { const t = Math.PI * (1 - i / 12); fr.push([0.31 * Math.cos(t), 88.0 + 0.31 * Math.sin(t)]); }
    main.add(lanternMat, extrudeShape(fr, [], 0.08).translate(0, 0, -0.04), { matrix: Fm });
    main.add(lanternMat, boxC(0, LB + 0.5, 0, 0.8, 0.06, 0.08), { matrix: Fm });
  }
  main.add(lanternMat, squareLathe([[LT, 0.58], [LT + 0.2, 0.58], [LT + 0.2, 0.5], [88.9, 0.46], [89.3, 0.38], [89.65, 0.27], [89.95, 0.15], [90.1, 0.06]]));
  main.add(lanternMat, new THREE.SphereGeometry(0.17, 14, 10).translate(0, 90.3, 0), { smooth: true, uv: 'keep' });
  main.add(lanternMat, new THREE.CylinderGeometry(0.008, 0.04, 3.1, 8).translate(0, 92.05, 0), { smooth: true, uv: 'keep' });
  main.add(lanternMat, new THREE.TorusGeometry(0.07, 0.025, 6, 12).rotateX(Math.PI / 2).translate(0, 90.52, 0), { smooth: true, uv: 'keep' });
  {
    const spike = new THREE.ConeGeometry(0.03, 0.42, 6).translate(0, 0.21, 0);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      main.add(lanternMat, spike.clone().rotateZ(-Math.PI / 2 + 0.35).rotateY(a).translate(0.58 * Math.cos(a), LT + 0.1, -0.58 * Math.sin(a)), { smooth: true, uv: 'keep' });
    }
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) main.add(lanternMat, new THREE.ConeGeometry(0.045, 0.55, 6).translate(sx * 0.52, LT + 0.45, sz * 0.52), { smooth: true, uv: 'keep' });
  }
  // ---------- carillon: cabin, frame and 61 bells ----------
  let carillon = null;
  {
    // r4: the cabin is hollow now (buildInterior): the 38 steps arrive inside it and you leave by its south doorway
    main.add(M.iron, boxMM(-1.6, 63.3, -1.6, 1.6, 63.45, 1.6));
    for (const f of FACES) {
      const Fm = faceMat(f, 1.45);
      for (const sx of (f.key === 'S' ? [-0.95, 0.95] : [-0.8, 0.8])) main.add(M.windowNight, boxC(sx, 62.35, 0.01, f.key === 'S' ? 0.6 : 0.9, 0.8, 0.02), { matrix: Fm });
    }
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) main.add(M.iron, boxC(sx * 1.45, 65.4, sz * 1.45, 0.22, 3.9, 0.22));
    for (const y of [65.4, 67.05]) {
      main.add(M.iron, squareLathe([[y - 0.12, 2.68], [y + 0.12, 2.68]]));
      main.add(M.iron, squareLathe([[y - 0.11, 1.48], [y + 0.11, 1.48]]));
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        main.add(M.iron, boxMM(Math.min(sx * 1.45, sx * IN_HW), y - 0.1, sz * 1.45 - 0.08, Math.max(sx * 1.45, sx * IN_HW), y + 0.1, sz * 1.45 + 0.08));
        main.add(M.iron, boxMM(sx * 1.45 - 0.08, y - 0.1, Math.min(sz * 1.45, sz * IN_HW), sx * 1.45 + 0.08, y + 0.1, Math.max(sz * 1.45, sz * IN_HW)));
      }
    }
    main.add(M.iron, boxMM(-1.5, 67.2, -0.08, 1.5, 67.35, 0.08));
    main.add(M.iron, boxMM(-0.08, 67.2, -1.5, 0.08, 67.35, 1.5));
    // bell diameters: Great Bear Bell (10,500 lb) ≈ 2.1 m down to the 19 lb treble ≈ 0.24 m
    const D = Array.from({ length: 61 }, (_, i) => 2.1 * Math.pow(2, -(i / 12) * 0.62));
    const slots = [];
    for (const [u, v] of [[-0.78, -0.78], [0.78, 0.78], [0.78, -0.78], [-0.78, 0.78]]) slots.push([u, 67.05, v]);
    const ring = (hw, n, y) => { const out = []; for (let i = 0; i < n; i++) { const t = (i + 0.5) / n * 4; const side = Math.floor(t), f = (t - side) * 2 - 1; const p = [[f * hw, -hw], [hw, f * hw], [-f * hw, hw], [-hw, -f * hw]][side]; out.push([p[0], y, p[1]]); } return out; };
    slots.push(...ring(2.62, 12, 65.3));
    slots.push(...ring(2.62, 16, 66.95));
    for (let i = 0; i < 29; i++) { const gx = i % 6, gz = Math.floor(i / 6); slots.push([-1.5 + gx * 0.6, 67.2, -1.2 + gz * 0.6 + (gx % 2) * 0.15]); }
    const yokeM = [];
    D.forEach((d, i) => {
      const [u, yh, v] = slots[i];
      yokeM.push(trs(u, yh - 0.05, v, 0, d * 0.45, 0.1, d * 0.2));
    });
    carillon = buildCarillon(M, F, slots, D, { quality: ctx.quality || (typeof window !== 'undefined' && window.BSIM && window.BSIM.settings && window.BSIM.settings.quality) || 'high' }); // r4: clappers + hour hammer
    for (const o of carillon.objects) detailG.add(o);
    detailG.add(instanced(new THREE.BoxGeometry(1, 1, 1), M.iron, yokeM, F, { detail: true }));
  }
  // ---------- 1960s steel-framed entrance canopy (Gardner Dailey) ----------
  {
    const v0 = -HW0 + 0.05, v1 = -10.45, u0 = -3.0, u1 = 3.0;
    main.add(M.concrete, boxMM(u0, 2.74, v1, u1, 2.98, v0));
    main.add(M.concrete, boxMM(u0 - 0.04, 2.7, v1 - 0.04, u0 + 0.06, 3.02, v0));
    main.add(M.concrete, boxMM(u1 - 0.06, 2.7, v1 - 0.04, u1 + 0.04, 3.02, v0));
    main.add(M.concrete, boxMM(u0 - 0.04, 2.7, v1 - 0.04, u1 + 0.04, 3.02, v1 + 0.06));
    for (const [u, v] of [[-2.8, -10.2], [2.8, -10.2], [-2.8, -7.7], [2.8, -7.7]]) {
      const g0 = gAt(u, v) - 0.3;
      main.add(M.iron, new THREE.CylinderGeometry(0.06, 0.06, 2.74 - g0, 10).translate(u, (2.74 + g0) / 2, v), { smooth: true });
    }
  }
  // ---------- r4-campanile: walk-in lobby, elevator, seventh-floor landing and the 38 steps (lib/campanile-interior.js) ----------
  const innerG = new THREE.Group(); innerG.name = 'campanile-interior'; innerG.visible = false; root.add(innerG);
  const fg = new THREE.Group(); fg.name = 'campanile-interior-anim'; fg.matrixAutoUpdate = false; fg.matrix.copy(F); innerG.add(fg);
  let FL = doorY0 + 0.05; for (let u = -3.6; u <= 3.61; u += 0.9) for (let v = -3.6; v <= 3.61; v += 0.9) FL = Math.max(FL, gAt(u, v) + 0.03);
  const TL = DECK_Y - 38 * 0.18, CEIL = FL + 4.25;           // the elevator stops 38 steps (6.84 m) below the deck
  const inner = new Bucket(bUV), innerFine = new Bucket(bUV);   // interior-only geometry, drawn only near the tower
  const ix = buildInterior(M, { inner, innerFine, outer: main }, fg, { HW0, DECK_Y, FL, TL, CEIL, doorY1 });
  // bronze entrance leaves hinged at the jambs; they swing into the lobby when someone comes near (see update)
  const leaves = [-1, 1].map((side) => {
    const g = new THREE.Group(); g.position.set(side * DOOR_HW, 0, -4.30); fg.add(g);
    const w = DOOR_HW, x0 = side < 0 ? 0 : -w;
    g.add(new THREE.Mesh(boxMM(x0, doorY0, -0.04, x0 + w, 3.05, 0.04), M.darkBronze));
    for (const yy of [0.95, 2.2]) for (const z of [-0.05, 0.05]) g.add(new THREE.Mesh(boxC(x0 + w / 2, doorY0 + yy, z, 0.8, 0.9, 0.02), M.bronze));
    g.userData.open = side < 0 ? -Math.PI / 2 : Math.PI / 2; return g;
  });
  // the clavier's batons go down with each note (driven from carillon strikes)
  const batons = new Map(), bm4 = new THREE.Matrix4();
  if (carillon) { const strike0 = carillon.strike; carillon.strike = (i, vel = 1) => { strike0(i, vel); if (i >= 0 && i < ix.batonBase.length) batons.set(i, 0); }; }
  // ---------- assemble ----------
  main.flush(root, F, { name: 'campanile-' });
  fine.flush(detailG, F, { detail: true, name: 'campanile-detail-' });
  inner.flush(innerG, F, { name: 'campanile-in-' }); innerFine.flush(innerG, F, { name: 'campanile-in-fine-' });
  // clock hands (instanced so update() can sweep them cheaply)
  const hourShape = [[-0.09, -0.42], [0.09, -0.42], [0.075, 0], [0.05, 1.12], [0.17, 1.28], [0.0, 1.62], [-0.17, 1.28], [-0.05, 1.12], [-0.075, 0]];
  const minShape = [[-0.075, -0.6], [0.075, -0.6], [0.06, 0], [0.035, 1.95], [0.12, 2.05], [0.0, 2.36], [-0.12, 2.05], [-0.035, 1.95], [-0.06, 0]];
  const hourMesh = new THREE.InstancedMesh(extrudeShape(hourShape, [], 0.05), handMat, 4);
  const minMesh = new THREE.InstancedMesh(extrudeShape(minShape, [], 0.05), handMat, 4);
  hourMesh.name = 'campanile-hour-hands'; minMesh.name = 'campanile-minute-hands';
  for (const m of [hourMesh, minMesh]) { m.frustumCulled = false; m.castShadow = true; root.add(m); }
  const tmp = new THREE.Matrix4(), rz = new THREE.Matrix4();
  const zH = new THREE.Matrix4().makeTranslation(0, 0, 0.12), zM = new THREE.Matrix4().makeTranslation(0, 0, 0.19);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  let offS = null, offAt = -Infinity;
  const secondsOfDay = (date) => {
    const t = date.getTime();
    if (offS === null || Math.abs(t - offAt) > 60000) {
      let h = 0, m = 0, s = 0;
      for (const p of fmt.formatToParts(date)) { if (p.type === 'hour') h = +p.value % 24; else if (p.type === 'minute') m = +p.value; else if (p.type === 'second') s = +p.value; }
      const utc = date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds();
      offS = ((((h * 3600 + m * 60 + s) - utc) % 86400) + 86400 + 43200) % 86400 - 43200; offAt = t;
    }
    return (((t / 1000 + offS) % 86400) + 86400) % 86400;
  };
  const setHands = (date) => {
    const sec = secondsOfDay(date);
    const aM = ((sec / 3600) % 1) * Math.PI * 2, aH = ((sec / 43200) % 1) * Math.PI * 2;
    for (let i = 0; i < 4; i++) {
      tmp.copy(F).multiply(handH[i]).multiply(zH).multiply(rz.makeRotationZ(-aH)); hourMesh.setMatrixAt(i, tmp);
      tmp.copy(F).multiply(handM[i]).multiply(zM).multiply(rz.makeRotationZ(-aM)); minMesh.setMatrixAt(i, tmp);
    }
    hourMesh.instanceMatrix.needsUpdate = true; minMesh.instanceMatrix.needsUpdate = true;
  };
  setHands(new Date());

  // ---------- gameplay data (local coordinates) ----------
  const poly = (u0, v0, u1, v1) => rectPoly(F, u0, v0, u1, v1);
  const colliders = [
    // r4: walk-in lobby: solid wall slabs (with the door gap) up to the lobby ceiling, then the solid shaft up to the deck
    ...ix.lobby.walls.map(([u0, v0, u1, v1]) => ({ type: 'poly', pts: poly(u0, v0, u1, v1), y0: -2, y1: CEIL + 0.2 })),
    { type: 'poly', pts: poly(-HW0 - 0.02, -HW0 - 0.02, HW0 + 0.02, HW0 + 0.02), y0: CEIL + 0.2, y1: DECK_Y - 0.35 },
    // loggia walls / balustrades / bars keep players on the deck
    { type: 'poly', pts: poly(-HW1, -HW1, HW1, -IN_HW), y0: DECK_Y - 0.35, y1: 70.2 },
    { type: 'poly', pts: poly(-HW1, IN_HW, HW1, HW1), y0: DECK_Y - 0.35, y1: 70.2 },
    { type: 'poly', pts: poly(IN_HW, -IN_HW, HW1, IN_HW), y0: DECK_Y - 0.35, y1: 70.2 },
    { type: 'poly', pts: poly(-HW1, -IN_HW, -IN_HW, IN_HW), y0: DECK_Y - 0.35, y1: 70.2 },
    // carillonist's cabin in the middle of the deck
    { type: 'poly', pts: poly(-1.5, -1.5, 1.5, 1.5), y0: DECK_Y - 0.1, y1: 63.45 },
    { type: 'poly', pts: poly(-5.45, -5.45, 5.45, 5.45), y0: 70.2, y1: 93.6 },
  ];
  for (const [u, v] of [[-2.8, -10.2], [2.8, -10.2], [-2.8, -7.7], [2.8, -7.7]]) { const p = L(u, 0, v); colliders.push({ type: 'cyl', x: +p[0].toFixed(3), z: +p[2].toFixed(3), r: 0.12, y0: -1, y1: 2.8 }); }
  const walkables = [{ type: 'poly', pts: poly(-IN_HW, -IN_HW, IN_HW, IN_HW), y: DECK_Y }, ...ix.lobby.floor.map(([u0, v0, u1, v1]) => ({ type: 'poly', pts: poly(u0, v0, u1, v1), y: FL }))];
  const r3 = (p) => p.map((v) => +v.toFixed(3));
  // r4: `action` is run by src/props/campanile.js (the scripted ride: lift, landing, 38 steps); `teleport` is the fallback
  const interactions = [
    { id: 'campanile-lift-up', action: 'campanile-up', pos: r3(L(0, FL + 1.0, 1.5)), radius: 1.5, label: 'Ride the elevator to the observation deck', teleport: r3(L(0, DECK_Y, 2.5)) },
    { id: 'campanile-lift-down', action: 'campanile-down', pos: r3(L(0, DECK_Y + 1.0, 2.2)), radius: 1.3, label: 'Head back down: 38 steps and the elevator', teleport: r3(L(0, FL, 0.6)) },
  ];
  let doorW = null, doorOpen = 0, rootW = null;
  const BSIM_FORCE_INNER = () => typeof window !== 'undefined' && window.BSIM && window.BSIM.campanileRide === true; // the ride keeps it on
  return {
    object3d: root, colliders, walkables, interactions,
    anchors: { bells: r3(L(0, 65.6, 0)), deck: r3(L(0, DECK_Y, 0)), clock: r3(L(0, YC, -HW0)), lobby: r3(L(0, FL, 0)) },
    // r4-campanile: handles for src/props/campanile.js (ride director + bells)
    campanile: { frame: F, ix, carillon, consts: { FL, TL, DECK_Y, CEIL, HW0, LIFT }, root },
    update(dt, env) {
      setHands(env && env.time instanceof Date ? env.time : new Date());
      // entrance doors swing open when the camera comes within ~8 m; the interior is drawn only within ~32 m
      if (env && env.camera) {
        if (!rootW) { root.updateMatrixWorld(); rootW = new THREE.Vector3().setFromMatrixPosition(root.matrixWorld); }
        const cp = env.camera.position; innerG.visible = Math.hypot(cp.x - rootW.x, cp.z - rootW.z) < 32 || BSIM_FORCE_INNER();
        if (!doorW) { root.updateMatrixWorld(); doorW = new THREE.Vector3(...L(0, 1.5, -4.3)).applyMatrix4(root.matrixWorld); }
        const want = env.camera.position.distanceTo(doorW) < 8 ? 1 : 0;
        if (Math.abs(want - doorOpen) > 1e-3) { doorOpen += Math.sign(want - doorOpen) * Math.min(Math.abs(want - doorOpen), dt * 0.9); const e = doorOpen * doorOpen * (3 - 2 * doorOpen); for (const g of leaves) g.rotation.y = g.userData.open * e; }
      }
      if (carillon) carillon.update(dt);
      if (batons.size) { for (const [i, t] of batons) { const t2 = t + dt; const dn = t2 < 0.05 ? t2 / 0.05 : Math.max(0, 1 - (t2 - 0.05) / 0.2); bm4.copy(ix.batonBase[i]).multiply(new THREE.Matrix4().makeRotationZ(-0.12 * dn)); ix.clavier.setMatrixAt(i, bm4); if (t2 > 0.3) { ix.clavier.setMatrixAt(i, ix.batonBase[i]); batons.delete(i); } else batons.set(i, t2); } ix.clavier.instanceMatrix.needsUpdate = true; }
    },
  };
}
