// California Memorial Stadium (1923, John Galen Howard; renovated 2010-12 by HNTB / STUDIOS).
// The seating bowl is terraced directly from the 2021 LiDAR surface: rows are offset curves of the field-edge
// (podium) wall, each tread at the measured height. Field markings are canvas-generated.
import * as THREE from 'three';
import { gridSampler, medianSampler, circSmooth, circMedian, pointInPoly, Geo, boxGeo, mergeUV, mergePlain, canvasTex, rasterWalkable } from './lib/venue-util.js';

export const info = {
  id: 'memorial-stadium',
  name: 'California Memorial Stadium',
  subtitle: '1923 · John Galen Howard · on the Hayward Fault',
  blurb: 'Built in 1923 as a memorial to Californians who died in World War I, with a neoclassical wall modeled on the Roman Colosseum. The Hayward Fault crosses both end zones diagonally, so the 2010-2012 retrofit split the bowl into separate blocks and hung a 375-foot press box over the west stands.',
  replaces: ['way/24025053', 'w/24025053', 'way/621412774', 'w/621412774'],
};

const D_ROW = 0.8;          // tread depth (m)
const NTH = 360;            // angular samples around the bowl
const AX = [0.66610, 0.74586], PX = [0.74586, -0.66610]; // field axis (toward SE end) and cross axis (toward east stands)
const FC = [-0.65, -0.40];  // field centre (from the goalposts in the LiDAR)

export async function build(ctx) {
  const { M, boxUV, groundAt, packet } = ctx;
  const lid = gridSampler(packet.lidarTop);
  const lidMed = medianSampler(packet.lidarTop, 0.8);
  const fp = packet.footprints[0].outer;
  const root = new THREE.Group(); root.name = 'memorial-stadium';
  const detail = new THREE.Group(); detail.userData.detail = true; root.add(detail);
  const dirOf = (th) => [Math.cos(th) * AX[0] + Math.sin(th) * PX[0], Math.cos(th) * AX[1] + Math.sin(th) * PX[1]];
  const toUS = (x, z) => [(x - FC[0]) * AX[0] + (z - FC[1]) * AX[1], (x - FC[0]) * PX[0] + (z - FC[1]) * PX[1]];
  const fromUS = (u, s) => [FC[0] + u * AX[0] + s * PX[0], FC[1] + u * AX[1] + s * PX[1]];

  // ---------- field level ----------
  let gmax = -99; for (let u = -60; u <= 60; u += 4) for (let s = -26; s <= 26; s += 4) { const [x, z] = fromUS(u, s); gmax = Math.max(gmax, groundAt(x, z)); }
  const yF = Math.max(gmax + 0.06, -1.42);

  // ---------- 1. field-edge (podium) curve r0(theta) from the LiDAR ----------
  const r0raw = new Float64Array(NTH);
  for (let i = 0; i < NTH; i++) {
    const th = (i / NTH) * Math.PI * 2, d = dirOf(th);
    const h = (r) => lid(FC[0] + d[0] * r, FC[1] + d[1] * r);
    let found = 95;
    for (let r = 30; r < 95; r += 0.5) {
      if (h(r) > yF + 1.2 && h(r + 1.5) > yF + 1.5 && h(r + 6) > yF + 2.5 && h(r + 10) > yF + 3.5 && h(r + 10) > h(r) + 0.8) { found = r; break; }
    }
    r0raw[i] = found;
  }
  const r0 = circSmooth(circMedian(r0raw, 6), 2.5);
  // curve points and outward normals
  const P0 = [], N0 = [];
  for (let i = 0; i < NTH; i++) { const th = (i / NTH) * Math.PI * 2, d = dirOf(th); P0.push([FC[0] + d[0] * r0[i], FC[1] + d[1] * r0[i]]); }
  for (let i = 0; i < NTH; i++) {
    const a = P0[(i + NTH - 1) % NTH], b = P0[(i + 1) % NTH];
    let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz); tx /= l; tz /= l;
    let nx = tz, nz = -tx; const rx = P0[i][0] - FC[0], rz = P0[i][1] - FC[1];
    if (nx * rx + nz * rz < 0) { nx = -nx; nz = -nz; }
    N0.push([nx, nz]);
  }
  const at = (i, rho) => [P0[i][0] + N0[i][0] * rho, P0[i][1] + N0[i][1] * rho];

  // ray (from P0 along normal) to footprint distance
  function rayFoot(i) {
    const o = P0[i], d = N0[i]; let best = null;
    for (let k = 0; k < fp.length; k++) {
      const a = fp[k], b = fp[(k + 1) % fp.length];
      const ex = b[0] - a[0], ez = b[1] - a[1];
      const den = d[0] * (-ez) - d[1] * (-ex);
      if (Math.abs(den) < 1e-9) continue;
      const qx = a[0] - o[0], qz = a[1] - o[1];
      const t = (qx * (-ez) - qz * (-ex)) / den, s = (d[0] * qz - d[1] * qx) / den;
      if (t > 0 && s >= 0 && s <= 1) best = best === null ? t : Math.min(best, t);
    }
    return best ?? 30;
  }

  // ---------- 2. seating extent, rim and outer wall per angle ----------
  const rhoFoot = new Float64Array(NTH), rhoMaxRaw = new Float64Array(NTH), pressFront = new Float64Array(NTH).fill(-1);
  for (let i = 0; i < NTH; i++) {
    rhoFoot[i] = rayFoot(i);
    const h = (rho) => { const p = at(i, rho); return lid(p[0], p[1]); };
    let end = rhoFoot[i] - 1.5;
    for (let rho = 3; rho < rhoFoot[i] - 1.0; rho += 0.5) {
      const h0 = h(rho), h1 = h(rho + 1.0);
      if (h1 - h0 > 3.0 && h(rho + 3) - h0 > 3.0) { // structure rising above the bowl (press box / video board)
        if (h(rho + 3) > 24 && (h(rho + 8) > 24)) pressFront[i] = rho + 0.5;
        end = rho; break;
      }
      if (h0 - h1 > 2.5) { end = rho - 0.5; break; } // outer drop
      if (rho > 12 && Math.abs(h(rho + 4) - h0) < 0.35 && Math.abs(h(rho + 2) - h0) < 0.25) { end = rho; break; } // flat concourse
    }
    rhoMaxRaw[i] = end;
  }
  // press box sector: seats continue under the box up to the concourse level (~16.5 m)
  const isPress = new Uint8Array(NTH); for (let i = 0; i < NTH; i++) isPress[i] = pressFront[i] > 0 ? 1 : 0;
  { const m = circMedian(Float64Array.from(isPress), 4); for (let i = 0; i < NTH; i++) isPress[i] = m[i] > 0.5 ? 1 : 0; }
  let rhoMax = circSmooth(circMedian(rhoMaxRaw, 5), 1.5);

  // north tunnel corridor (open trench near the field, covered beyond) - along the field axis
  const TUN = { s0: -0.5, w: 7.0, open: 13.5 };
  const tunInCorridor0 = (x, z, pad = 0) => { const [u, s] = toUS(x, z); return Math.abs(s - TUN.s0) < TUN.w / 2 + pad && u < -60; };
  // row heights from the LiDAR (median across tread, smoothed along the row)
  const KMAX = Math.ceil(Math.max(...rhoFoot) / D_ROW) + 1;
  const H = []; const EXC = []; // H[k][i]
  for (let k = 0; k < KMAX; k++) {
    const row = new Float64Array(NTH); const exc = new Uint8Array(NTH); EXC.push(exc);
    for (let i = 0; i < NTH; i++) {
      const rho = (k + 0.55) * D_ROW;
      if (rho > rhoMax[i] + 0.4 || rho > rhoFoot[i]) { row[i] = NaN; continue; }
      const p = at(i, rho);
      if (tunInCorridor0(p[0], p[1], 2.0)) { row[i] = NaN; exc[i] = 1; continue; }
      row[i] = lidMed(p[0], p[1]);
    }
    H.push(row);
  }
  // fill NaN by neighbours along the row, smooth, then enforce monotonic risers
  const riserMin = 0.14;
  for (let k = 0; k < KMAX; k++) {
    const row = H[k]; const ok = []; for (let i = 0; i < NTH; i++) if (!Number.isNaN(row[i])) ok.push(i);
    if (!ok.length) { row.fill(NaN); continue; }
    const filled = Float64Array.from(row);
    for (let i = 0; i < NTH; i++) if (Number.isNaN(row[i])) {
      let best = null, bd = 1e9; for (const j of ok) { const dd = Math.min(Math.abs(j - i), NTH - Math.abs(j - i)); if (dd < bd) { bd = dd; best = j; } }
      filled[i] = row[best];
    }
    const sm = circSmooth(circMedian(filled, 2), 1.6);
    for (let i = 0; i < NTH; i++) row[i] = Number.isNaN(row[i]) && !EXC[k][i] ? NaN : sm[i];
  }
  // seat height function with monotonic enforcement and extrapolation under the press box
  const seatTop = new Float64Array(NTH); // height of last seat row
  const nRows = new Int32Array(NTH);
  const Hs = []; for (let k = 0; k < KMAX; k++) Hs.push(new Float64Array(NTH).fill(NaN));
  for (let i = 0; i < NTH; i++) {
    let prev = yF + 0.9, lastSlope = 0.42, n = 0;
    const pf = isPress[i] ? (pressFront[i] > 0 ? pressFront[i] : rhoMax[i]) : 1e9;
    for (let k = 0; k < KMAX; k++) {
      const rho1 = (k + 1) * D_ROW;
      let v = H[k][i];
      const underPress = isPress[i] && (k + 0.5) * D_ROW > pf - 1.0;
      if (underPress) v = prev + lastSlope * D_ROW;
      if (Number.isNaN(v)) break;
      if (k > 0 && v > prev + 0.75) v = prev + lastSlope * D_ROW; // video board / tree / light pole contamination
      if (isPress[i] && underPress && v > 16.6) break;
      if (!isPress[i] && rho1 > rhoMax[i] + 0.4) break;
      if (rho1 > rhoFoot[i] - 1.6) break;
      v = Math.max(v, prev + (k === 0 ? 0 : riserMin));
      if (k > 0) lastSlope = Math.min(0.6, Math.max(0.25, 0.8 * lastSlope + 0.2 * (v - prev) / D_ROW));
      Hs[k][i] = v; prev = v; n = k + 1;
    }
    nRows[i] = n; seatTop[i] = prev;
  }
  // smooth row counts so the rim edge is clean
  { const nr = circSmooth(circMedian(Float64Array.from(nRows), 3), 1.0); for (let i = 0; i < NTH; i++) nRows[i] = Math.max(1, Math.min(nRows[i] + 1, Math.round(nr[i]))); }
  for (let i = 0; i < NTH; i++) { // re-extend if smoothing increased count
    for (let k = 1; k < nRows[i]; k++) if (Number.isNaN(Hs[k][i])) Hs[k][i] = Hs[k - 1][i] + 0.35;
    seatTop[i] = Hs[nRows[i] - 1][i];
  }

  // rim deck: embedded (terrain at rim level) vs walled
  const walled = new Uint8Array(NTH), rhoEnd = new Float64Array(NTH), deckH = new Float64Array(NTH);
  for (let i = 0; i < NTH; i++) {
    const rs = nRows[i] * D_ROW;
    const dh = seatTop[i] + 0.25;
    const pOut = at(i, Math.min(rhoFoot[i] + 2.5, rs + 6)); const gOut = groundAt(pOut[0], pOut[1]);
    if (gOut > dh - 1.2 && !isPress[i]) { walled[i] = 0; rhoEnd[i] = rs + 1.5; deckH[i] = dh; }
    else { walled[i] = 1; rhoEnd[i] = Math.max(rs + 1.2, rhoFoot[i] - 1.0); deckH[i] = dh; }
  }
  { const w = circMedian(Float64Array.from(walled), 3); for (let i = 0; i < NTH; i++) walled[i] = w[i] > 0.5 ? 1 : 0; }
  for (let i = 0; i < NTH; i++) { const rs = nRows[i] * D_ROW; rhoEnd[i] = walled[i] ? Math.max(rs + 1.2, rhoFoot[i] - 1.0) : rs + 1.5; }
  { const de = circSmooth(deckH, 1.5); for (let i = 0; i < NTH; i++) deckH[i] = Math.max(de[i], seatTop[i] + 0.15); }

  // tunnel (north end, along the field axis) and aisles
  const thN = Math.PI; const iN = Math.round(thN / (2 * Math.PI) * NTH) % NTH;
  const tunMouthU = -(r0[iN]);
  const tunInCorridor = (x, z) => { const [u, s] = toUS(x, z); return Math.abs(s - TUN.s0) < TUN.w / 2 && u < tunMouthU + 1.0; };
  const tunOpen = (x, z) => { const [u, s] = toUS(x, z); return Math.abs(s - TUN.s0) < TUN.w / 2 && u < tunMouthU + 1.0 && u > tunMouthU - TUN.open; };
  const aisle = new Uint8Array(NTH);
  { let acc = 0; for (let i = 0; i < NTH; i++) { const a = P0[i], b = P0[(i + 1) % NTH]; acc += Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc > 13.5) { aisle[i] = 1; acc = 0; } } }
  const stairTh = [Math.PI / 2, 3 * Math.PI / 2].map((t) => Math.round(t / (2 * Math.PI) * NTH) % NTH);

  // ---------- 3. bowl mesh ----------
  const gTread = new Geo(), gRiser = new Geo(), gGold = new Geo(), gBlue = new Geo(), gBench = new Geo(), gDeck = new Geo();
  const hAt = (k, i) => (k < nRows[i] ? Hs[k][i] : deckH[i]);
  const rhoK = (k, i) => Math.min(k * D_ROW, rhoEnd[i]);
  const V = (i, rho, y) => { const p = at(i, rho); return [p[0], y, p[1]]; };
  const KM = Math.max(...Array.from(nRows)) + 2;
  for (let i0 = 0; i0 < NTH; i0++) {
    const i1 = (i0 + 1) % NTH;
    const inAisle = aisle[i0] === 1;
    for (let k = 0; k <= KM; k++) {
      { const pm = at(i0, (k + 0.5) * D_ROW), pm1 = at(i1, (k + 0.5) * D_ROW); const mx = (pm[0] + pm1[0]) / 2, mz = (pm[1] + pm1[1]) / 2; if (tunOpen(mx, mz)) continue; }
      const ra0 = rhoK(k, i0), ra1 = rhoK(k, i1);
      const rb0 = k < KM ? rhoK(k + 1, i0) : rhoEnd[i0], rb1 = k < KM ? rhoK(k + 1, i1) : rhoEnd[i1];
      const h0 = hAt(k, i0), h1 = hAt(k, i1);
      const p0 = k > 0 ? hAt(k - 1, i0) : yF - 0.05, p1 = k > 0 ? hAt(k - 1, i1) : yF - 0.05;
      const seatRow = k < nRows[i0] && k < nRows[i1];
      // riser at ra (front face looking inward)
      if (Math.abs(h0 - p0) > 0.01 || Math.abs(h1 - p1) > 0.01) {
        if (k === 0) {
          const midP = at(i0, 0); const tunnelHere = tunInCorridor(midP[0], midP[1]) || tunInCorridor(at(i1, 0)[0], at(i1, 0)[1]);
          const isStair = stairTh.some((s) => Math.min(Math.abs(s - i0), NTH - Math.abs(s - i0)) <= 1);
          if (tunnelHere) continue;
          const y0a = isStair ? h0 - 0.25 : p0, y0b = isStair ? h1 - 0.25 : p1;
          if (h0 - 0.25 > y0a || h1 - 0.25 > y0b) gBlue.quad(V(i0, ra0, y0a), V(i0, ra0, Math.max(y0a, h0 - 0.25)), V(i1, ra1, Math.max(y0b, h1 - 0.25)), V(i1, ra1, y0b));
          gGold.quad(V(i0, ra0, Math.max(y0a, h0 - 0.25)), V(i0, ra0, h0), V(i1, ra1, h1), V(i1, ra1, Math.max(y0b, h1 - 0.25)));
        } else {
          const g = inAisle && seatRow ? gGold : gRiser;
          g.quad(V(i0, ra0, p0), V(i0, ra0, h0), V(i1, ra1, h1), V(i1, ra1, p1));
        }
      }
      // tread
      if (rb0 - ra0 > 0.005 || rb1 - ra1 > 0.005) {
        const g = (k >= nRows[i0] && k >= nRows[i1]) ? gDeck : gTread;
        g.quad(V(i0, ra0, h0), V(i0, rb0, h0), V(i1, rb1, h1), V(i1, ra1, h1));
      }
      // bench (aluminium plank on the back of the tread)
      if (seatRow && !inAisle && !isPress[i0] || (seatRow && !inAisle && isPress[i0] && !(k * D_ROW > 0 && false))) {
        if (seatRow && !inAisle && rb0 - ra0 > 0.6 && !(isPress[i0] && isPress[i1] && club(i0, k))) {
          const f0 = ra0 + 0.42, f1 = ra1 + 0.42, b0 = ra0 + 0.74, b1 = ra1 + 0.74;
          const t0 = h0 + 0.42, t1 = h1 + 0.42;
          gBench.quad(V(i0, f0, t0), V(i0, b0, t0), V(i1, b1, t1), V(i1, f1, t1));
          gBench.quad(V(i0, f0, t0 - 0.1), V(i0, f0, t0), V(i1, f1, t1), V(i1, f1, t1 - 0.1));
        }
      }
    }
  }
  function club(i, k) { // blue chairback club seats: west lower bowl between the 20s
    const th = (i / NTH) * 360; return th > 243 && th < 297 && k < 30;
  }
  // outer skirt / wall inner face at rhoEnd
  const gWall = new Geo();
  for (let i0 = 0; i0 < NTH; i0++) {
    const i1 = (i0 + 1) % NTH;
    if (walled[i0] && walled[i1]) continue; // handled by the arcade wall
    const a0 = at(i0, rhoEnd[i0]), a1 = at(i1, rhoEnd[i1]);
    const g0 = groundAt(a0[0], a0[1]) - 1.0, g1 = groundAt(a1[0], a1[1]) - 1.0;
    gWall.quad([a0[0], deckH[i0], a0[1]], [a0[0], g0, a0[1]], [a1[0], g1, a1[1]], [a1[0], deckH[i1], a1[1]]);
  }

  // aluminium + local materials
  const alu = new THREE.MeshStandardMaterial({ color: 0xc3c7cb, metalness: 0.65, roughness: 0.42 });
  const stadiumConcrete = M.concrete.clone(); stadiumConcrete.color = new THREE.Color(0xeee3cf);
  const tunnelMat = M.concreteDark.clone(); tunnelMat.side = THREE.DoubleSide;
  const addMesh = (geo, mat, parent = root, name) => { if (!geo) return null; const m = new THREE.Mesh(geo, mat); if (name) m.name = name; parent.add(m); return m; };
  addMesh(mergeUV([gTread.geometry(), gDeck.geometry()], boxUV), M.concrete, root, 'treads');
  addMesh(mergeUV([gRiser.geometry(), gWall.geometry()], boxUV), M.concreteDark, root, 'risers');
  addMesh(mergeUV([gGold.geometry()], boxUV), M.calGold, root, 'gold');
  addMesh(mergeUV([gBlue.geometry()], boxUV), M.calBlue, root, 'blue');
  addMesh(mergeUV([gBench.geometry()], boxUV), alu, root, 'benches');

  // club seats (instanced chairbacks)
  {
    const seatG = mergePlain([boxGeo(0.46, 0.06, 0.42, 0, 0.44, -0.02), boxGeo(0.46, 0.5, 0.06, 0, 0.7, 0.2)]);
    const mats = [];
    for (let i = 0; i < NTH; i++) {
      if (!isPress[i] || aisle[i]) continue;
      const i1 = (i + 1) % NTH;
      for (let k = 0; k < nRows[i] && k < nRows[i1]; k++) {
        if (!club(i, k)) continue;
        const a = at(i, k * D_ROW + 0.5), b = at(i1, k * D_ROW + 0.5);
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.floor(len / 0.5);
        const ang = Math.atan2(N0[i][0], N0[i][1]);
        for (let q = 0; q < n; q++) {
          const t = (q + 0.5) / n; const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
          const y = Hs[k][i] * (1 - t) + Hs[k][i1] * t;
          mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang), new THREE.Vector3(1, 1, 1)));
        }
      }
    }
    if (mats.length) { const im = new THREE.InstancedMesh(seatG, M.seatBlue, mats.length); mats.forEach((m, k) => im.setMatrixAt(k, m)); im.name = 'clubSeats'; root.add(im); }
  }

  // ---------- 4. field turf with canvas markings ----------
  {
    const L = 140, W = 74; // texture covers L x W metres centred on the field
    const yd = 0.9144;
    const tex = canvasTex(2048, 1024, (c, w, h) => {
      const sx = w / L, sy = h / W; // px per metre
      const X = (m) => (m + L / 2) * sx, Y = (m) => (m + W / 2) * sy;
      c.fillStyle = '#3f7a2e'; c.fillRect(0, 0, w, h);
      // mowing stripes every 5 yards
      for (let k = -12; k < 12; k++) { if (k % 2) continue; c.fillStyle = 'rgba(255,255,255,0.045)'; c.fillRect(X(k * 5 * yd), 0, 5 * yd * sx, h); }
      const fl = 60 * yd, fw = 26.667 * yd; // half length incl end zones, half width
      // end zones (gold) with "California" script
      for (const sgn of [-1, 1]) {
        const x0 = sgn < 0 ? X(-fl) : X(50 * yd), ww = 10 * yd * sx;
        c.fillStyle = '#e7a713'; c.fillRect(x0, Y(-fw), ww, 2 * fw * sy);
        c.save(); c.translate(x0 + ww / 2, Y(0)); c.rotate(sgn < 0 ? -Math.PI / 2 : Math.PI / 2);
        c.font = `italic bold ${Math.round(6.2 * sx)}px Georgia, 'Times New Roman', serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 0.5 * sx; c.strokeStyle = '#ffffff'; c.strokeText('California', 0, 0); c.fillStyle = '#003262'; c.fillText('California', 0, 0);
        c.restore();
      }
      // white border (6 ft) around the field
      c.fillStyle = '#f4f4f0'; const bw = 1.83;
      c.fillRect(X(-fl - bw), Y(-fw - bw), (2 * fl + 2 * bw) * sx, bw * sy);
      c.fillRect(X(-fl - bw), Y(fw), (2 * fl + 2 * bw) * sx, bw * sy);
      c.fillRect(X(-fl - bw), Y(-fw - bw), bw * sx, (2 * fw + 2 * bw) * sy);
      c.fillRect(X(fl), Y(-fw - bw), bw * sx, (2 * fw + 2 * bw) * sy);
      // yard lines, hash marks, ticks
      const lw = Math.max(2, 0.1 * sx);
      for (let yv = -50; yv <= 50; yv += 5) { c.fillStyle = '#f4f4f0'; c.fillRect(X(yv * yd) - lw / 2, Y(-fw), lw, 2 * fw * sy); }
      const hash = 12.19 / 2; // college hashes 40 ft apart
      for (let yv = -49; yv <= 49; yv++) {
        if (yv % 5 === 0) continue; const x = X(yv * yd) - lw / 2; c.fillStyle = '#f4f4f0';
        for (const s of [-fw, fw - 0.61, -hash - 0.3, hash - 0.3]) c.fillRect(x, Y(s), lw, 0.61 * sy);
      }
      // numbers (6 ft tall, tops 9 yards from sidelines) with direction arrows
      c.fillStyle = '#f4f4f0'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold ${Math.round(1.83 * sy * 1.12)}px Arial, Helvetica, sans-serif`;
      for (let yv = -40; yv <= 40; yv += 10) {
        const lab = String(50 - Math.abs(yv));
        for (const side of [-1, 1]) {
          const cy = side * (fw - 9 * yd - 0.915);
          c.save(); c.translate(X(yv * yd), Y(cy)); c.rotate(side < 0 ? Math.PI : 0);
          c.fillText(lab[0] + '\u2009\u2009' + (lab[1] || ''), 0, 0);
          if (yv !== 0) { const dir = (yv < 0 ? -1 : 1) * (side < 0 ? -1 : 1); c.beginPath(); const ax0 = dir * 2.2 * sx; c.moveTo(ax0 + dir * 0.55 * sx, -0.85 * sy); c.lineTo(ax0 + dir * 1.25 * sx, -0.55 * sy); c.lineTo(ax0 + dir * 0.55 * sx, -0.25 * sy); c.closePath(); c.fill(); }
          c.restore();
        }
      }
      // goal lines slightly wider
      c.fillRect(X(-50 * yd) - lw, Y(-fw), 2 * lw, 2 * fw * sy); c.fillRect(X(50 * yd) - lw, Y(-fw), 2 * lw, 2 * fw * sy);
      // midfield Cal script logo
      c.save(); c.translate(X(0), Y(0)); c.rotate(-Math.PI / 2 + Math.PI / 2);
      c.font = `italic bold ${Math.round(9.5 * sx)}px 'Brush Script MT', 'Segoe Script', Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineJoin = 'round'; c.lineWidth = 1.2 * sx; c.strokeStyle = '#003262'; c.strokeText('Cal', 0, 0);
      c.lineWidth = 0.45 * sx; c.strokeStyle = '#ffffff'; c.strokeText('Cal', 0, 0);
      c.fillStyle = '#fdb515'; c.fillText('Cal', 0, 0); c.restore();
    });
    tex.anisotropy = 16;
    // turf polygon: fan inside P0
    const pos = [], uv = [];
    const uvOf = (x, z) => { const [u, s] = toUS(x, z); return [(u + L / 2) / L, 1 - (s + W / 2) / W]; };
    for (let i = 0; i < NTH; i++) {
      const a = P0[i], b = P0[(i + 1) % NTH];
      for (const p of [[FC[0], FC[1]], b, a]) { pos.push(p[0], yF, p[1]); const t = uvOf(p[0], p[1]); uv.push(t[0], t[1]); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const turfMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, color: 0xffffff });
    addMesh(g, turfMat, root, 'field');
  }
  // goal posts (end lines) - gold
  {
    const parts = [];
    for (const sgn of [-1, 1]) {
      const u = sgn * 54.86; const [x, z] = fromUS(u + sgn * 1.6, 0); const [xp, zp] = fromUS(u, 0);
      const rot = Math.atan2(AX[0], AX[1]);
      parts.push(new THREE.CylinderGeometry(0.17, 0.2, 3.0, 10).translate(x, yF + 1.5, z));
      // gooseneck
      const gn = new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8); gn.rotateZ(Math.PI / 2); gn.rotateY(rot + Math.PI / 2); gn.translate((x + xp) / 2, yF + 3.0, (z + zp) / 2); parts.push(gn);
      const cb = new THREE.CylinderGeometry(0.1, 0.1, 5.64, 8); cb.rotateZ(Math.PI / 2); cb.rotateY(rot); cb.translate(xp, yF + 3.05, zp); parts.push(cb);
      for (const s of [-2.82, 2.82]) { const [ux, uz] = fromUS(u, s); parts.push(new THREE.CylinderGeometry(0.06, 0.08, 9.15, 8).translate(ux, yF + 3.05 + 4.57, uz)); }
    }
    addMesh(mergeUV(parts, boxUV), M.calGold, detail, 'goalposts');
  }

  // ---------- 5. outer wall: Roman arcade along the OSM outline ----------
  const wallParts = [], wallDark = [], wallStone = [], colliders = [], gates = [];
  const deckAtXZ = (x, z) => { // deck height at the nearest angular sample
    const [u, s] = toUS(x, z); let th = Math.atan2(s, u); if (th < 0) th += 2 * Math.PI; const i = Math.round(th / (2 * Math.PI) * NTH) % NTH; return { h: deckH[i], walled: walled[i], i };
  };
  const BAY = 7.2, T = 1.1;
  // gate angles (deg) where paths meet the wall: north tunnel, west entrance (Goldman / Gattis plazas), south gate
  const gateTh = [180, 247, 270, 322, 345];
  const thOfXZ = (x, z) => { const [u, s] = toUS(x, z); let t = Math.atan2(s, u) * 180 / Math.PI; return (t + 360) % 360; };
  const archShape = (w, H, ow, spring) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, H); s.lineTo(-w / 2, H); s.lineTo(-w / 2, 0);
    const hole = new THREE.Path(); const r = ow / 2; hole.moveTo(-r, 0.0); hole.lineTo(r, 0.0); hole.lineTo(r, spring); hole.absarc(0, spring, r, 0, Math.PI, false); hole.lineTo(-r, 0.0);
    s.holes.push(hole); return s;
  };
  const wallRuns = []; let run = [];
  for (let k = 0; k < fp.length; k++) {
    const a = fp[k], b = fp[(k + 1) % fp.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.max(1, Math.round(len / BAY));
    for (let q = 0; q < n; q++) {
      const t0 = q / n, t1 = (q + 1) / n;
      const pA = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], pB = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
      const cx = (pA[0] + pB[0]) / 2, cz = (pA[1] + pB[1]) / 2; const w = len / n;
      const dk = deckAtXZ(cx, cz);
      const gmin = Math.min(groundAt(pA[0], pA[1]), groundAt(pB[0], pB[1]), groundAt(cx, cz));
      const top = dk.h + 1.1; const Hw = top - gmin;
      // direction & outward normal
      let tx = (pB[0] - pA[0]) / w, tz = (pB[1] - pA[1]) / w; let nx = tz, nz = -tx;
      if (nx * (cx - FC[0]) + nz * (cz - FC[1]) < 0) { nx = -nx; nz = -nz; }
      const rotY = Math.atan2(-tz, tx); // local +x along wall
      const ic = [cx - nx * T / 2, cz - nz * T / 2]; // wall centreline (outer face on the OSM line)
      const thb = thOfXZ(cx, cz);
      const isGate = gateTh.some((g) => Math.abs(((thb - g + 540) % 360) - 180) < 2.6) && Hw > 6;
      const openGate = isGate && Math.abs(((thb - 180 + 540) % 360) - 180) < 2.6; // only the north tunnel passes through; other gates are grilled
      const tallEnough = Hw > 9.5 && dk.walled;
      const m4 = new THREE.Matrix4().makeRotationY(rotY).setPosition(ic[0], 0, ic[1]);
      if (tallEnough || isGate) {
        const ow = isGate ? 4.6 : 3.7, spring = isGate ? 5.6 : 5.2, Ha = Math.min(Hw - 0.5, 9.0);
        const eg = new THREE.ExtrudeGeometry(archShape(w + 0.02, Ha, ow, spring), { depth: T * 0.55, bevelEnabled: false, curveSegments: 10 });
        eg.translate(0, gmin, T / 2 - T * 0.55); eg.applyMatrix4(m4); wallParts.push(eg);
        if (!openGate) { // recessed infill (dark iron grille) behind blind arches and closed gates
          const back = boxGeo(ow + 0.1, spring + ow / 2, T * 0.45, 0, gmin + (spring + ow / 2) / 2, -T / 2 + T * 0.225); back.applyMatrix4(m4); wallDark.push(back);
          const back2 = boxGeo(w + 0.02, Ha, T * 0.45, 0, gmin + Ha / 2, -T / 2 + T * 0.225); // inner leaf behind (solid)
          back2.applyMatrix4(m4); wallParts.push(back2);
        } else gates.push({ x: cx, z: cz, th: thb, g: gmin, w });
        // upper wall
        if (top - (gmin + Ha) > 0.05) { const up = boxGeo(w + 0.02, top - (gmin + Ha), T, 0, gmin + Ha + (top - gmin - Ha) / 2, 0); up.applyMatrix4(m4); wallParts.push(up); }
        // keystone + archivolt band + string course
        const ks = boxGeo(0.7, 1.0, 0.25, 0, gmin + spring + ow / 2 + 0.1, T / 2 + 0.1); ks.applyMatrix4(m4); wallStone.push(ks);
        const sc = boxGeo(w + 0.04, 0.45, 0.3, 0, gmin + Ha, T / 2 + 0.12); sc.applyMatrix4(m4); wallStone.push(sc);
        // pilaster at bay start
        const pl = boxGeo(0.9, Ha, 0.28, -w / 2, gmin + Ha / 2, T / 2 + 0.12); pl.applyMatrix4(m4); wallStone.push(pl);
        // upper panel recess look: framed panel above arcade
        if (top - gmin - Ha > 5) { const pn = boxGeo(w * 0.62, (top - gmin - Ha) * 0.45, 0.12, 0, gmin + Ha + (top - gmin - Ha) * 0.45, T / 2 + 0.04); pn.applyMatrix4(m4); wallStone.push(pn); }
      } else if (Hw > 0.4) {
        const bx = boxGeo(w + 0.02, Hw + 1.0, T, 0, gmin - 1.0 + (Hw + 1.0) / 2, 0); bx.applyMatrix4(m4); wallParts.push(bx);
      }
      if (Hw > 0.4) {
        const cor = boxGeo(w + 0.06, 0.55, T + 0.5, 0, top - 0.3, 0.1); cor.applyMatrix4(m4); wallStone.push(cor); // cornice / coping
        const pli = boxGeo(w + 0.04, 1.3, 0.22, 0, gmin + 0.15, T / 2 + 0.08); pli.applyMatrix4(m4); wallStone.push(pli); // plinth
      }
      // colliders: wall runs broken at gates and where the wall is low
      const blocks = Hw > 1.2 && !openGate;
      if (blocks) run.push([pA, pB, nx, nz, gmin, top]); else if (run.length) { wallRuns.push(run); run = []; }
    }
  }
  if (run.length) wallRuns.push(run);
  for (const r of wallRuns) {
    const outer = r.map((s) => s[0]).concat([r[r.length - 1][1]]);
    const inner = outer.map((p, k) => { const s = r[Math.min(k, r.length - 1)]; return [p[0] - s[2] * T, p[1] - s[3] * T]; });
    const y0 = Math.min(...r.map((s) => s[4])) - 1, y1 = Math.max(...r.map((s) => s[5])) + 0.5;
    colliders.push({ type: 'poly', pts: outer.concat(inner.reverse()), y0, y1 });
  }
  addMesh(mergeUV(wallParts, boxUV), stadiumConcrete, root, 'outerWall');
  addMesh(mergeUV(wallStone, boxUV), M.concrete, root, 'wallTrim');
  addMesh(mergeUV(wallDark, boxUV), M.iron, root, 'archInfill');

  // ---------- 7. press box (two-level steel/glass box over the west stands) ----------
  let pressInfo = null;
  {
    const pb = (packet.context || []).find((c) => c.osm === 'w/621412774');
    // inner (field-side) edge from LiDAR: per u, the first s (from the field going west) where height > 24
    const us = []; for (let u = -60; u <= 60; u += 2) {
      let sIn = null, sOut = null;
      for (let s = -55; s > -110; s -= 0.5) { const [x, z] = fromUS(u, s); const h = lid(x, z); if (h > 26.5) { if (sIn === null) sIn = s; sOut = s; } else if (sIn !== null && s < sOut - 3) break; }
      if (sIn !== null && sIn - sOut > 8) us.push([u, sIn, sOut]);
    }
    if (us.length > 6) {
      let roof = []; for (const [u, a, b] of us) for (let s = a - 2; s > b + 2; s -= 2) { const [x, z] = fromUS(u, s); roof.push(lid(x, z)); }
      roof.sort((p, q) => p - q); const roofH = roof[Math.floor(roof.length * 0.5)];
      const u0 = us[0][0] - 1, u1 = us[us.length - 1][0] + 1;
      const sInSm = us.map((r) => r[1]), sOutSm = us.map((r) => r[2]);
      const med = (arr) => [...arr].sort((p, q) => p - q)[arr.length >> 1];
      const sIn = med(sInSm), sOut = med(sOutSm);
      const yBot = 19.6, yMid = 24.6, yTop = roofH - 0.4;
      pressInfo = { u0, u1, sIn, sOut, roofH };
      const P = (u, s, y) => { const [x, z] = fromUS(u, s); return [x, y, z]; };
      const rot = Math.atan2(AX[0], AX[1]);
      const boxUS = (ua, ub, sa, sb, ya, yb) => { const [cx, cz] = fromUS((ua + ub) / 2, (sa + sb) / 2); return boxGeo(sb - sa, yb - ya, ub - ua, cx, (ya + yb) / 2, cz, rot); };
      // structure: floor slabs, roof, ends (white steel), glass volumes
      const white = [], glassG = [], darkG = [];
      white.push(boxUS(u0, u1, sOut, sIn, yBot - 0.9, yBot)); // underside slab
      white.push(boxUS(u0, u1, sOut, sIn + 0.6, yMid - 0.35, yMid + 0.15)); // mid floor edge
      white.push(boxUS(u0 - 0.4, u1 + 0.4, sOut - 0.4, sIn + 0.8, yTop, yTop + 0.7)); // roof fascia
      glassG.push(boxUS(u0 + 0.4, u1 - 0.4, sOut + 0.5, sIn - 1.6, yBot, yMid - 0.35)); // lower level glass (set back)
      glassG.push(boxUS(u0 + 0.2, u1 - 0.2, sOut + 0.2, sIn - 0.2, yMid + 0.15, yTop)); // upper level glass
      // balcony toward campus (25 ft cantilever)
      white.push(boxUS(u0 + 12, u1 - 12, sOut - 7.6, sOut, yMid - 0.4, yMid + 0.1));
      // mullions on the field side (every 3 m)
      const mul = [];
      for (let u = u0 + 1.5; u < u1 - 1; u += 3) { mul.push(boxUS(u - 0.08, u + 0.08, sIn - 0.25, sIn + 0.05, yMid + 0.15, yTop)); mul.push(boxUS(u - 0.08, u + 0.08, sIn - 1.85, sIn - 1.55, yBot, yMid - 0.35)); }
      // cores
      const cores = [];
      for (const uc of [-0.72, -0.24, 0.24, 0.72].map((f) => f * (u1 - u0) / 2 + (u0 + u1) / 2)) {
        const sc = (sIn + sOut) / 2 - 2; const [cx, cz] = fromUS(uc, sc);
        cores.push(boxUS(uc - 3, uc + 3, sc - 3, sc + 3, 10, yBot - 0.9));
        colliders.push({ type: 'box', min: [cx - 4.3, 0, cz - 4.3], max: [cx + 4.3, yBot, cz + 4.3] });
      }
      // railing on balcony and on the roof
      for (const [ua, ub] of [[u0 + 12, u1 - 12]]) darkG.push(boxUS(ua, ub, sOut - 7.6, sOut - 7.5, yMid + 0.1, yMid + 1.15));
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe9ecee, roughness: 0.5, metalness: 0.2 });
      addMesh(mergeUV(white, boxUV), whiteMat, root, 'pressFrame');
      addMesh(mergeUV(glassG, boxUV), M.windowNight, root, 'pressGlass');
      addMesh(mergeUV(cores, boxUV), M.concrete, root, 'pressCores');
      addMesh(mergeUV(mul, boxUV), whiteMat, detail, 'pressMullions');
      addMesh(mergeUV(darkG, boxUV), M.glassLight, detail, 'pressRail');
      const c4 = [fromUS(u0, sIn), fromUS(u1, sIn), fromUS(u1, sOut), fromUS(u0, sOut)];
      colliders.push({ type: 'poly', pts: c4, y0: yBot - 1, y1: yTop + 1 });
    }
  }

  // ---------- 8. video boards at both ends + rim light standards ----------
  {
    const frame = [], screens = [];
    const scrTex = canvasTex(1024, 512, (c, w, h) => {
      c.fillStyle = '#04101e'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#003262'; c.fillRect(0, 0, w, h * 0.22); c.fillRect(0, h * 0.78, w, h * 0.22);
      c.fillStyle = '#fdb515'; c.font = "italic bold 230px 'Brush Script MT', Georgia, serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Cal', w / 2, h / 2 + 6);
      c.font = 'bold 64px Arial'; c.fillStyle = '#ffffff'; c.fillText('GO BEARS', w / 2, h * 0.89); c.fillText('CALIFORNIA MEMORIAL STADIUM', w / 2, h * 0.11);
    });
    const scrMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveMap: scrTex, emissiveIntensity: 0.9, roughness: 0.4 });
    for (const sgn of [1, -1]) {
      const iE = sgn > 0 ? 0 : Math.round(NTH / 2);
      const rim = deckH[iE];
      const uB = sgn * 115.5, rot = Math.atan2(AX[0], AX[1]);
      const [cx, cz] = fromUS(uB, 0.6);
      const legs = [-5.5, 5.5].map((s) => { const [lx, lz] = fromUS(uB + sgn * 0.8, 0.6 + s); return boxGeo(0.9, 39.3 - 10 - rim, 0.9, lx, rim + (39.3 - 10 - rim) / 2, lz, rot); });
      frame.push(...legs);
      frame.push(boxGeo(17.6, 10.4, 1.6, cx, 39.3 - 5.2, cz, rot + Math.PI / 2));
      const sg = new THREE.PlaneGeometry(16.6, 9.4); sg.rotateY(sgn > 0 ? -Math.PI / 2 : Math.PI / 2); sg.rotateY(rot); // face the field
      const [fx, fz] = fromUS(uB - sgn * 0.81, 0.6); sg.translate(fx, 39.3 - 5.2, fz); screens.push(sg);
      colliders.push({ type: 'cyl', x: cx, z: cz, r: 1.2, y0: rim - 1, y1: 39.3 });
    }
    addMesh(mergeUV(frame, boxUV), M.blackPaint, root, 'boardFrames');
    addMesh(mergePlain(screens), scrMat, root, 'boardScreens');
    // light standards along the rim
    const poleG = mergePlain([new THREE.CylinderGeometry(0.16, 0.22, 6.5, 8).translate(0, 3.25, 0), boxGeo(1.6, 1.1, 0.5, 0, 6.8, -0.1)]);
    const headG = boxGeo(1.4, 0.9, 0.08, 0, 6.8, -0.38);
    const mats = [];
    for (let th = 0; th < 360; th += 7.5) {
      const ok = (th > 312 && th < 352) || (th > 188 && th < 232) || (th > 28 && th < 152);
      if (!ok) continue; const i = Math.round(th / 360 * NTH) % NTH;
      const rho = Math.max(nRows[i] * D_ROW + 0.6, rhoEnd[i] - 0.6); const p = at(i, rho);
      const ang = Math.atan2(N0[i][0], N0[i][1]);
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(p[0], deckH[i], p[1]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang), new THREE.Vector3(1, 1, 1)));
    }
    const ip = new THREE.InstancedMesh(poleG, M.iron, mats.length), ih = new THREE.InstancedMesh(headG, M.lampGlow, mats.length);
    mats.forEach((m, k) => { ip.setMatrixAt(k, m); ih.setMatrixAt(k, m); }); ip.name = 'lightPoles'; detail.add(ip); detail.add(ih);
  }

  // ---------- 9. field-access stairs at the 50s (cut in the podium wall) ----------
  const stairs = [];
  {
    const sg = [];
    for (const i of stairTh) {
      const h0 = Hs[0][i]; const rise = h0 - yF; const n = Math.max(2, Math.ceil(rise / 0.18)); const run = 0.3;
      const ang = Math.atan2(N0[i][0], N0[i][1]);
      for (let q = 0; q < n; q++) {
        const y = yF + rise * (q + 1) / n; const rho = -(n - q) * run; const p = at(i, rho + run / 2);
        sg.push(boxGeo(1.8, y - yF + 0.05, run, p[0], yF + (y - yF) / 2, p[1], ang));
      }
      stairs.push({ i, n, run, h0 });
    }
    addMesh(mergeUV(sg, boxUV), M.concrete, root, 'fieldStairs');
  }
  // podium wall colliders (field edge), broken at the stairs and the tunnel mouth
  {
    let runP = [];
    const flush = () => { if (runP.length > 1) { const outer = runP.map((i) => at(i, 0.35)), inner = runP.map((i) => at(i, -0.05)).reverse(); colliders.push({ type: 'poly', pts: outer.concat(inner), y0: yF - 1, y1: yF + 1.6 }); } runP = []; };
    for (let i = 0; i <= NTH; i++) {
      const ii = i % NTH; const p = at(ii, 0);
      const gap = tunInCorridor(p[0], p[1]) || stairTh.some((s) => Math.min(Math.abs(s - ii), NTH - Math.abs(s - ii)) <= 1);
      if (gap) flush(); else { runP.push(ii); if (runP.length > 40) { flush(); runP.push(ii); } }
    }
    flush();
  }

  // ---------- 10. walkable raster (field + stairs + seating + rim deck) ----------
  const RS = 0.5; let bx0 = 1e9, bz0 = 1e9, bx1 = -1e9, bz1 = -1e9; for (const [x, z] of fp) { bx0 = Math.min(bx0, x); bz0 = Math.min(bz0, z); bx1 = Math.max(bx1, x); bz1 = Math.max(bz1, z); }
  bx0 -= 2; bz0 -= 2; bx1 += 2; bz1 += 2;
  const nx = Math.ceil((bx1 - bx0) / RS) + 1, nz = Math.ceil((bz1 - bz0) / RS) + 1;
  const data = new Float32Array(nx * nz).fill(NaN);
  const stairInfo = stairs;
  let guess = -1;
  // bowl surface height at (x,z) (ignores the tunnel); null outside the structure
  function surfAt(x, z, useGuess = false) {
    const [u, s] = toUS(x, z); let th = Math.atan2(s, u); if (th < 0) th += 2 * Math.PI;
    const ip = Math.round(th / (2 * Math.PI) * NTH) % NTH; const rr = Math.hypot(u, s);
    if (rr < r0[ip] - 1.0) return yF;
    let g0 = useGuess && guess >= 0 ? guess : ip, best = 1e18, bi = g0, bt = 0;
    const span = useGuess && guess >= 0 ? 10 : 50;
    for (let q = -span; q <= span; q++) {
      const i0 = ((g0 + q) % NTH + NTH) % NTH, i1 = (i0 + 1) % NTH; const A = P0[i0], B = P0[i1];
      const ex = B[0] - A[0], ez = B[1] - A[1]; const l2 = ex * ex + ez * ez;
      let t = ((x - A[0]) * ex + (z - A[1]) * ez) / l2; t = Math.max(0, Math.min(1, t));
      const dx = x - (A[0] + ex * t), dz = z - (A[1] + ez * t); const d2 = dx * dx + dz * dz;
      if (d2 < best) { best = d2; bi = i0; bt = t; }
    }
    if (useGuess) guess = bi;
    const i0 = bi, i1 = (bi + 1) % NTH; const A = P0[i0];
    const nnx = N0[i0][0] * (1 - bt) + N0[i1][0] * bt, nnz = N0[i0][1] * (1 - bt) + N0[i1][1] * bt;
    const side = (x - (A[0] + (P0[i1][0] - A[0]) * bt)) * nnx + (z - (A[1] + (P0[i1][1] - A[1]) * bt)) * nnz;
    const rho = side >= 0 ? Math.sqrt(best) : -Math.sqrt(best);
    if (rho < 0) {
      let y = yF;
      for (const st of stairInfo) { // stairs from field up to row 0
        const dI = Math.min(Math.abs(st.i - i0), NTH - Math.abs(st.i - i0));
        if (dI <= 1 && rho > -st.n * st.run) { const q = Math.floor((rho + st.n * st.run) / st.run); y = yF + (st.h0 - yF) * Math.min(1, (q + 1) / st.n); }
      }
      return y;
    }
    const re = rhoEnd[i0] * (1 - bt) + rhoEnd[i1] * bt;
    if (rho > re) return null;
    const k = Math.floor(rho / D_ROW);
    const n0 = nRows[i0], n1 = nRows[i1];
    const h = (kk, ii) => (kk < nRows[ii] ? Hs[kk][ii] : deckH[ii]);
    let y = h(k, i0) * (1 - bt) + h(k, i1) * bt;
    if (!walled[i0] && k >= Math.min(n0, n1)) { // embedded rim: ramp onto the terrain
      const p = at(i0, rhoEnd[i0]); const gEnd = groundAt(p[0], p[1]);
      const rs = Math.min(n0, n1) * D_ROW; const t = Math.max(0, Math.min(1, (rho - rs) / Math.max(0.5, re - rs)));
      y = y * (1 - t) + Math.max(gEnd, y - 2) * t;
    }
    return y;
  }
  for (let a = 0; a < nz; a++) {
    guess = -1;
    for (let b = 0; b < nx; b++) {
      const x = bx0 + b * RS, z = bz0 + a * RS;
      if (!pointInPoly(x, z, fp)) { guess = -1; continue; }
      const y = surfAt(x, z, true);
      if (y !== null) data[a * nx + b] = y;
    }
  }

  // ---------- 6. north tunnel (open trench at the field, covered under the north stands) ----------
  const tunnel = { uMouth: tunMouthU, uOut: 0, yOut: 0 };
  {
    let uOut = tunMouthU; for (let u = tunMouthU; u > -140; u -= 0.5) { const [x, z] = fromUS(u, TUN.s0); if (!pointInPoly(x, z, fp)) { uOut = u; break; } }
    tunnel.uOut = uOut; const [ox, oz] = fromUS(uOut - 1.5, TUN.s0); tunnel.yOut = groundAt(ox, oz);
    const g = new Geo(); const n = 24; const ceil = 4.2;
    const sl = TUN.s0 - TUN.w / 2, sr = TUN.s0 + TUN.w / 2;
    const P = (u, s, y) => { const [x, z] = fromUS(u, s); return [x, y, z]; };
    const floorAt = (u) => yF + (tunnel.yOut - yF) * Math.max(0, Math.min(1, (u - tunMouthU) / (uOut - tunMouthU)));
    const edgeTop = (u, s) => { const [x, z] = fromUS(u, s); const v = surfAt(x, z); return v === null ? floorAt(u) + ceil : v; };
    const uCov = tunMouthU - TUN.open;
    for (let q = 0; q < n; q++) {
      const ua = tunMouthU + (uOut - tunMouthU) * q / n, ub = tunMouthU + (uOut - tunMouthU) * (q + 1) / n;
      const ya = floorAt(ua), yb = floorAt(ub);
      g.quad(P(ua, sl, ya), P(ua, sr, ya), P(ub, sr, yb), P(ub, sl, yb)); // floor
      const covered = (ua + ub) / 2 < uCov;
      const tl0 = covered ? ya + ceil : edgeTop(ua, sl - 0.3), tl1 = covered ? yb + ceil : edgeTop(ub, sl - 0.3);
      const tr0 = covered ? ya + ceil : edgeTop(ua, sr + 0.3), tr1 = covered ? yb + ceil : edgeTop(ub, sr + 0.3);
      g.quad(P(ua, sl, ya - 0.3), P(ub, sl, yb - 0.3), P(ub, sl, tl1), P(ua, sl, tl0));
      g.quad(P(ua, sr, ya - 0.3), P(ua, sr, tr0), P(ub, sr, tr1), P(ub, sr, yb - 0.3));
      if (covered) g.quad(P(ua, sl, ya + ceil), P(ub, sl, yb + ceil), P(ub, sr, yb + ceil), P(ua, sr, ya + ceil));
      else { // parapet caps on the trench walls
        g.quad(P(ua, sl - 0.35, tl0), P(ua, sl, tl0), P(ub, sl, tl1), P(ub, sl - 0.35, tl1));
        g.quad(P(ua, sr, tr0), P(ua, sr + 0.35, tr0), P(ub, sr + 0.35, tr1), P(ub, sr, tr1));
      }
    }
    // portal face where the stands cover the tunnel
    const yc = floorAt(uCov) + ceil; const top = Math.max(edgeTop(uCov - 0.6, TUN.s0 - TUN.w / 2 - 0.5), edgeTop(uCov - 0.6, TUN.s0 + TUN.w / 2 + 0.5)) + 0.2;
    g.quad(P(uCov, sl, yc), P(uCov, sr, yc), P(uCov, sr, top), P(uCov, sl, top));
    addMesh(mergeUV([g.geometry()], boxUV), tunnelMat, root, 'tunnel');
    for (const [a, b] of [[sl - 0.45, sl], [sr, sr + 0.45]]) {
      const pts = [fromUS(tunMouthU + 0.3, a), fromUS(uOut + 0.8, a), fromUS(uOut + 0.8, b), fromUS(tunMouthU + 0.3, b)];
      colliders.push({ type: 'poly', pts, y0: yF - 1, y1: yF + ceil + 0.2 });
    }
    // raster: open trench cells get the floor height
    for (let a = 0; a < nz; a++) for (let b = 0; b < nx; b++) {
      const x = bx0 + b * RS, z = bz0 + a * RS; const [u, s] = toUS(x, z);
      if (Math.abs(s - TUN.s0) < TUN.w / 2 && u <= tunMouthU + 0.5 && u > uCov) data[a * nx + b] = floorAt(u);
    }
  }
  const seatFn = rasterWalkable(bx0, bz0, RS, nx, nz, data);
  const tunnelFn = (x, z) => {
    const [u, s] = toUS(x, z);
    if (Math.abs(s - TUN.s0) > TUN.w / 2 || u > tunnel.uMouth + 0.2 || u < tunnel.uOut - 1.0) return null;
    const t = Math.max(0, Math.min(1, (u - tunnel.uMouth) / (tunnel.uOut - tunnel.uMouth)));
    return yF + (tunnel.yOut - yF) * t;
  };
  const walkables = [
    { type: 'fn', bounds: [bx0, bz0, bx1, bz1], heightAt: seatFn },
    { type: 'fn', bounds: [Math.min(...[fromUS(tunnel.uMouth, -4), fromUS(tunnel.uOut - 1, -4), fromUS(tunnel.uMouth, 4), fromUS(tunnel.uOut - 1, 4)].map((p) => p[0])), Math.min(...[fromUS(tunnel.uMouth, -4), fromUS(tunnel.uOut - 1, -4), fromUS(tunnel.uMouth, 4), fromUS(tunnel.uOut - 1, 4)].map((p) => p[1])), Math.max(...[fromUS(tunnel.uMouth, -4), fromUS(tunnel.uOut - 1, -4), fromUS(tunnel.uMouth, 4), fromUS(tunnel.uOut - 1, 4)].map((p) => p[0])), Math.max(...[fromUS(tunnel.uMouth, -4), fromUS(tunnel.uOut - 1, -4), fromUS(tunnel.uMouth, 4), fromUS(tunnel.uOut - 1, 4)].map((p) => p[1]))], heightAt: tunnelFn, name: 'north tunnel floor (below the seats)' },
  ];
  // goal post colliders
  for (const sgn of [-1, 1]) { const [x, z] = fromUS(sgn * 56.4, 0); colliders.push({ type: 'cyl', x, z, r: 0.35, y0: yF, y1: yF + 3.2 }); }

  const midW = fromUS(0, -30); const tunOut = fromUS(tunnel.uOut - 4, TUN.s0);
  const interactions = [
    { id: 'stadium-field', pos: [FC[0], yF + 1, FC[1]], radius: 8, label: 'Midfield, California Memorial Stadium' },
  ];
  root.userData.debug = { yF, r0: Array.from(r0).filter((_, i) => i % 15 === 0).map((v) => +v.toFixed(1)), nRows: Array.from(nRows).filter((_, i) => i % 15 === 0), walled: Array.from(walled).filter((_, i) => i % 15 === 0), deckH: Array.from(deckH).filter((_, i) => i % 15 === 0).map((v) => +v.toFixed(1)), press: pressInfo, tunnel, gates: gates.map((g) => Math.round(g.th)) };
  return { object3d: root, colliders, walkables, interactions, debug: root.userData.debug };
}
