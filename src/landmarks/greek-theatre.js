// Hearst Greek Theatre (1903, John Galen Howard with Julia Morgan; gift of William Randolph Hearst).
// Concentric concrete tiers cut into the hillside (heights from the 2021 LiDAR), a circular orchestra,
// a raised stage enclosed on three sides by a high wall with engaged Doric columns and a Doric entablature.
import * as THREE from 'three';
import { gridSampler, medianSampler, Geo, boxGeo, mergeUV, mergePlain, pointInPoly } from './lib/venue-util.js';

export const info = {
  id: 'greek-theatre',
  name: 'Hearst Greek Theatre',
  subtitle: '1903 · John Galen Howard · 8,500 seats',
  blurb: 'Modeled on the ancient theatre at Epidaurus and paid for by William Randolph Hearst, it was the first of John Galen Howard\'s campus buildings to be completed. Theodore Roosevelt gave the commencement address here in May 1903, before it was finished.',
  replaces: ['way/24025050', 'w/24025050', 'w/431122967', 'way/431122967', 'w/431122954', 'way/431122954'],
};

const C = [-9.77, 6.34];               // orchestra centre (aisle convergence)
const TA = -37 * Math.PI / 180;         // theatre axis (towards the seats, ENE)
const A = [Math.cos(TA), Math.sin(TA)], Pp = [-Math.sin(TA), Math.cos(TA)];

export async function build(ctx) {
  const { M, boxUV, groundAt, packet } = ctx;
  const lid = gridSampler(packet.lidarTop), lidMed = medianSampler(packet.lidarTop, 0.6);
  const root = new THREE.Group(); root.name = 'greek-theatre';
  const detail = new THREE.Group(); detail.userData.detail = true; root.add(detail);
  const W = (along, lat) => [C[0] + A[0] * along + Pp[0] * lat, C[1] + A[1] * along + Pp[1] * lat];
  const WS = (along, lat) => W(along, lat + 1.0); // stage frame (stage centred 1 m south of the seating axis)
  const polar = (r, phi) => { const t = TA + phi; return [C[0] + Math.cos(t) * r, C[1] + Math.sin(t) * r]; };
  const rot = Math.atan2(A[0], A[1]); // rotation that maps local +z onto the axis
  const colliders = [], walkables = [];

  // ---------- tiers: radii and level heights from the LiDAR ----------
  const rOrch = 10.0; let yOrch = -1.72;
  { const v = []; for (let r = 1; r < rOrch; r += 1.5) for (let d = 0; d < 360; d += 15) { const t = d * Math.PI / 180; v.push(groundAt(C[0] + Math.cos(t) * r, C[1] + Math.sin(t) * r)); } v.sort((a, b) => a - b); yOrch = Math.max(yOrch, v[v.length - 1] + 0.03); }
  const rings = []; // {r0, r1, y}
  // lower terrace (orchestra apron with the 28 carved chairs) then 19 concrete bench rows
  const lowR = [10.0, 12.5, 15.0, 17.5, 20.0, 23.2];
  const ringMed = (r) => { const v = []; for (let d = -95; d <= 85; d += 3) { const p = polar(r, d * Math.PI / 180); v.push(lidMed(p[0], p[1])); } v.sort((a, b) => a - b); return v[v.length >> 1]; };
  for (let k = 0; k < lowR.length - 1; k++) rings.push({ r0: lowR[k], r1: lowR[k + 1], y: ringMed((lowR[k] + lowR[k + 1]) / 2) });
  const ROWS = 19, rs0 = 23.2, rs1 = 40.6, dr = (rs1 - rs0) / ROWS;
  for (let k = 0; k < ROWS; k++) rings.push({ r0: rs0 + k * dr, r1: rs0 + (k + 1) * dr, y: ringMed(rs0 + (k + 0.6) * dr), bench: true });
  rings.push({ r0: rs1, r1: 43.0, y: ringMed(41.8), top: true });
  for (let k = 1; k < rings.length; k++) rings[k].y = Math.max(rings[k].y, rings[k - 1].y + (rings[k].bench ? 0.38 : 0.08));
  // angular extent of each ring (contiguous region matching the ring height)
  for (const R of rings) {
    const rm = (R.r0 + R.r1) / 2; let lo = 0, hi = 0;
    const okAt = (d) => { const p = polar(rm, d * Math.PI / 180); return Math.abs(lidMed(p[0], p[1]) - R.y) < 1.3; };
    let miss = 0; for (let d = 0; d <= 120; d++) { if (okAt(d)) { hi = d; miss = 0; } else if (++miss > 4) break; }
    miss = 0; for (let d = 0; d >= -120; d--) { if (okAt(d)) { lo = d; miss = 0; } else if (++miss > 4) break; }
    R.lo = Math.max(lo, -104); R.hi = Math.min(hi, 98);
  }
  // smooth extents between rows
  for (let pass = 0; pass < 2; pass++) for (let k = 1; k < rings.length - 1; k++) { rings[k].lo = Math.round((rings[k - 1].lo + 2 * rings[k].lo + rings[k + 1].lo) / 4); rings[k].hi = Math.round((rings[k - 1].hi + 2 * rings[k].hi + rings[k + 1].hi) / 4); }
  for (const R of rings) { R.lo = Math.min(R.lo, -86); R.hi = Math.max(R.hi, 80); }
  // refine-east: the game terrain (1 m DTM) smooths the steps, so treads set from the LiDAR median ended up partly
  // buried. Lift each tier just above the terrain under it (90th percentile along the band), keep risers monotonic,
  // and stop a tier's arc where the hillside rises well above it instead of sinking it into the slope.
  const bandP = (r0, r1, lo, hi, pct) => { const v = []; for (let d = lo; d <= hi; d += 2) for (let f = 0.15; f < 1; f += 0.35) { const p = polar(r0 + (r1 - r0) * f, d * Math.PI / 180); v.push(groundAt(p[0], p[1])); } v.sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * pct))] : -1e9; };
  const backP = (r, lo, hi, pct) => { const v = []; for (let d = lo; d <= hi; d += 1.5) { const p = polar(r, d * Math.PI / 180); v.push(groundAt(p[0], p[1])); } v.sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * pct))] : -1e9; };
  for (const R of rings) R.y = Math.max(R.y, bandP(R.r0, R.r1, R.lo, R.hi, 0.9) + 0.04, backP(R.r1 - 0.06, R.lo + 3, R.hi - 3, 0.93) + 0.05);
  for (let k = 1; k < rings.length; k++) rings[k].y = Math.max(rings[k].y, rings[k - 1].y + (rings[k].bench ? 0.36 : 0.06));
  for (const R of rings) {
    const rm = (R.r0 + R.r1) / 2; const over = (d) => { const p = polar(rm, d * Math.PI / 180); return groundAt(p[0], p[1]) > R.y + 0.35; };
    for (let d = 0; d <= R.hi; d++) if (over(d) && over(d + 1) && over(d + 2)) { R.hi = Math.max(d - 1, 30); break; }
    for (let d = 0; d >= R.lo; d--) if (over(d) && over(d - 1) && over(d - 2)) { R.lo = Math.min(d + 1, -30); break; }
  }

  // ---------- seating mesh ----------
  const gT = new Geo(), gR = new Geo(), gE = new Geo();
  const seg = (lo, hi) => Math.max(8, Math.round((hi - lo) / 1.5));
  for (let k = 0; k < rings.length; k++) {
    const R = rings[k], prevY = k > 0 ? rings[k - 1].y : yOrch;
    const n = seg(R.lo, R.hi);
    for (let q = 0; q < n; q++) {
      const a0 = (R.lo + (R.hi - R.lo) * q / n) * Math.PI / 180, a1 = (R.lo + (R.hi - R.lo) * (q + 1) / n) * Math.PI / 180;
      const p00 = polar(R.r0, a0), p01 = polar(R.r1, a0), p10 = polar(R.r0, a1), p11 = polar(R.r1, a1);
      gT.quad([p00[0], R.y, p00[1]], [p01[0], R.y, p01[1]], [p11[0], R.y, p11[1]], [p10[0], R.y, p10[1]]);
      gR.quad([p00[0], prevY - 0.05, p00[1]], [p00[0], R.y, p00[1]], [p10[0], R.y, p10[1]], [p10[0], prevY - 0.05, p10[1]]);
    }
    // end walls of each tier down to ground
    for (const a of [R.lo, R.hi]) {
      const t = a * Math.PI / 180; const p0 = polar(R.r0, t), p1 = polar(R.r1, t);
      const g0 = Math.min(groundAt(p0[0], p0[1]), groundAt(p1[0], p1[1])) - 0.8;
      if (R.y - g0 > 0.1) { if (a === R.lo) gE.quad([p0[0], g0, p0[1]], [p1[0], g0, p1[1]], [p1[0], R.y, p1[1]], [p0[0], R.y, p0[1]]); else gE.quad([p1[0], g0, p1[1]], [p0[0], g0, p0[1]], [p0[0], R.y, p0[1]], [p1[0], R.y, p1[1]]); }
    }
  }
  // orchestra disc (cut by the stage front)
  const gO = new Geo();
  { const n = 72; for (let q = 0; q < n; q++) { const a0 = q / n * Math.PI * 2, a1 = (q + 1) / n * Math.PI * 2; const p0 = polar(rOrch + 0.02, a0), p1 = polar(rOrch + 0.02, a1); gO.tri([C[0], yOrch, C[1]], [p1[0], yOrch, p1[1]], [p0[0], yOrch, p0[1]]); } }
  const tierMat = M.concrete;
  root.add(new THREE.Mesh(mergeUV([gT.geometry()], boxUV), tierMat));
  root.add(new THREE.Mesh(mergeUV([gR.geometry(), gE.geometry()], boxUV), M.concreteDark));
  root.add(new THREE.Mesh(mergeUV([gO.geometry()], boxUV), M.paving));

  // aisles: 11 radial stairs with half-steps; 28 carved stone chairs on the lowest terrace
  {
    const stepG = boxGeo(1.1, 1, 1, 0, 0.5, 0); const mats = [];
    const aisles = []; for (let k = 0; k < 11; k++) aisles.push((-96.5 + k * 19.3) * Math.PI / 180);
    for (const a of aisles) for (let k = 1; k < rings.length; k++) {
      const R = rings[k]; if (!R.bench) continue; const deg = a * 180 / Math.PI; if (deg < R.lo || deg > R.hi) continue;
      const prevY = rings[k - 1].y; const h = (R.y - prevY) / 2; const rr = R.r0 + dr * 0.25; const p = polar(rr, a);
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(p[0], prevY, p[1]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(Math.cos(TA + a), Math.sin(TA + a))), new THREE.Vector3(1, h, dr * 0.5)));
    }
    const im = new THREE.InstancedMesh(boxUV(stepG.index ? stepG.toNonIndexed() : stepG), M.concrete, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m)); root.add(im);
    // (refine-east) the ring of 28 marble chairs was removed: not in the real theatre and read as a fountain rim
  }

  // ---------- stage + skene (refine-east rework) ----------
  // Back wall with 12 engaged, fluted Doric columns (6 each side of a wider central door bay) standing on pedestals over a
  // continuous dado; recessed panels between them; a full Doric entablature (architrave with taenia and guttae, triglyph
  // frieze, mutuled cornice); two engaged columns on each side return; solid end pylons framing the stage with the
  // entablature wrapped round them and a wreath on the frieze. Central doorway: eared moulded frame, consoles and a
  // projecting cornice cap; two small plain side doors in the third bay out. Buff concrete, darker stage front.
  const STG = { front: -8.5, back: -16.6, half: 20.0, lc: 1.0, y: 0.0 };
  const WALL = { y: 12.85, t: 3.4 };
  const SK = M.stuccoWhite.clone(); SK.color = new THREE.Color(0xeadcc2); SK.name = 'gtSkene';      // buff skene concrete
  const SKL = M.stuccoWhite.clone(); SKL.color = new THREE.Color(0xf3e9d6); SKL.name = 'gtPanel';
  const TG = M.stuccoWhite.clone(); TG.color = new THREE.Color(0xd8c9ae); TG.name = 'gtTriglyph';
  const FN = M.stuccoWhite.clone(); FN.color = new THREE.Color(0xbfb19a); FN.name = 'gtGroove';    // lighter recessed panels
  const SKD = M.concreteDark.clone(); SKD.color = new THREE.Color(0xa9a397); SKD.name = 'gtStageFront';
  const stone = [], trim = [], dark = [], cols = [], panel = [], sfront = [], wood = [], fine = [], tglyph = [];
  const rotY = Math.atan2(A[0], A[1]);
  const BX = (a0, a1, l0, l1, y0, y1) => { const [cx, cz] = WS((a0 + a1) / 2, (l0 + l1) / 2); const g = new THREE.BoxGeometry(Math.abs(l1 - l0), y1 - y0, Math.abs(a1 - a0)); g.rotateY(rotY); g.translate(cx, (y0 + y1) / 2, cz); return g; };
  const bw0 = STG.back - WALL.t, bw1 = STG.back;          // back wall (inner face at bw1, audience side = +along)
  const PL0 = 19.6, PL1 = 24.8, PA0 = -9.4, PA1 = -5.6;     // pylons (lateral |l| PL0..PL1, along PA0..PA1)
  const RW = 2.6;                                            // side return wall thickness
  const DADO = 1.9, ARCH0 = 9.1, FRZ0 = 10.1, COR0 = 11.1;   // heights above the stage floor
  const colR = 0.62, colH = ARCH0 - (DADO + 0.05);
  // stage podium: medium-grey floor, darker plain front with a thin coping
  stone.push(BX(STG.back, STG.front - 0.3, -STG.half, STG.half, yOrch - 0.5, STG.y - 0.05));
  sfront.push(BX(STG.front - 0.3, STG.front, -STG.half, STG.half, yOrch - 0.5, STG.y - 0.12));
  trim.push(BX(STG.front - 0.35, STG.front + 0.06, -STG.half, STG.half, STG.y - 0.14, STG.y + 0.02));
  dark.push(BX(STG.back, STG.front - 0.35, -STG.half, STG.half, STG.y - 0.05, STG.y));
  // back wall body and side returns (full height; flat roof at the cornice)
  stone.push(BX(bw0, bw1, -PL1, PL1, -1.0, WALL.y - 0.1));
  for (const s of [-1, 1]) stone.push(BX(bw1, PA0, s > 0 ? PL0 : -PL0 - RW, s > 0 ? PL0 + RW : -PL0, -1.0, WALL.y - 0.1));
  stone.push(BX(bw0 - 1.2, bw0, -6, 6, -1.0, WALL.y)); // rear stair/door block
  // column positions on the back wall: centre bay 5.8 m, then 3.0 m bays
  const lats = []; for (let k = 0; k < 6; k++) { lats.push(2.9 + k * 3.0); lats.push(-(2.9 + k * 3.0)); }
  lats.sort((a, b) => a - b);
  const colPos = [], colDir = [];
  const backCols = lats.map((l) => [bw1 + 0.3, l]);
  const sideCols = []; for (const s of [-1, 1]) for (const a of [-14.0, -11.6]) sideCols.push([a, s * (PL0 - 0.3), s]);
  // dado band + pedestals (back wall), broken at the doors
  const doorC = { l0: -1.3, l1: 1.3, top: 5.4 }; const sideDoors = [-10.4, 10.4];
  const gaps = [[doorC.l0 - 0.45, doorC.l1 + 0.45], ...sideDoors.map((l) => [l - 0.85, l + 0.85])];
  const spans = (a, b) => { let segs = [[a, b]]; for (const [g0, g1] of gaps) { const ns = []; for (const [p, q] of segs) { if (g1 <= p || g0 >= q) { ns.push([p, q]); continue; } if (g0 > p) ns.push([p, g0]); if (g1 < q) ns.push([g1, q]); } segs = ns; } return segs; };
  for (const [l0, l1] of spans(-PL0, PL0)) { stone.push(BX(bw1, bw1 + 0.35, l0, l1, STG.y - 0.02, DADO - 0.15)); trim.push(BX(bw1, bw1 + 0.47, l0, l1, DADO - 0.15, DADO)); }
  for (const [, l] of backCols) { stone.push(BX(bw1, bw1 + 1.05, l - 0.68, l + 0.68, STG.y, DADO - 0.12)); trim.push(BX(bw1, bw1 + 1.15, l - 0.76, l + 0.76, DADO - 0.12, DADO + 0.05)); }
  for (const s of [-1, 1]) { const li = s > 0 ? PL0 : -PL0; const lo = li - s * 0.35, lo2 = li - s * 0.47;
    stone.push(BX(bw1, PA0, Math.min(li, lo), Math.max(li, lo), STG.y - 0.02, DADO - 0.15)); trim.push(BX(bw1, PA0, Math.min(li, lo2), Math.max(li, lo2), DADO - 0.15, DADO));
    for (const a of [-14.0, -11.6]) { const l1 = li - s * 1.05, l2 = li - s * 1.15; stone.push(BX(a - 0.68, a + 0.68, Math.min(li, l1), Math.max(li, l1), STG.y, DADO - 0.12)); trim.push(BX(a - 0.76, a + 0.76, Math.min(li, l2), Math.max(li, l2), DADO - 0.12, DADO + 0.05)); } }
  // recessed panels between the back-wall columns (raised frame strips around a lighter field)
  const bayEdges = [-PL0 + 0.3, ...lats, PL0 - 0.3];
  for (let i = 0; i < bayEdges.length - 1; i++) {
    let l0 = bayEdges[i] + 0.85, l1 = bayEdges[i + 1] - 0.85; if (l1 - l0 < 0.8) continue;
    if (l0 < doorC.l1 + 0.6 && l1 > doorC.l0 - 0.6) continue; // central door bay handled separately
    const isSide = sideDoors.some((l) => l > l0 && l < l1);
    const y0 = isSide ? 3.9 : DADO + 0.6, y1 = ARCH0 - 0.7;
    panel.push(BX(bw1, bw1 + 0.03, l0, l1, y0, y1));
    for (const [a, b, c, d] of [[l0 - 0.14, l1 + 0.14, y1, y1 + 0.14], [l0 - 0.14, l1 + 0.14, y0 - 0.14, y0], [l0 - 0.14, l0, y0, y1], [l1, l1 + 0.14, y0, y1]]) trim.push(BX(bw1, bw1 + 0.09, a, b, c, d));
  }
  // entablature on the back wall and side returns, wrapping round the pylons
  const entab = (a0, a1, l0, l1, face) => { // face: '+a' (faces audience), '+l'/'-l' (faces lateral)
    const ext = (d) => face === '+a' ? [a0, a1 + d, l0, l1] : face === '+l' ? [a0, a1, l0, l1 + d] : [a0, a1, l0 - d, l1];
    const B = (d, y0, y1, arr) => { const [p, q, r, s] = ext(d); arr.push(BX(p, q, r, s, y0, y1)); };
    B(0.98, ARCH0, FRZ0 - 0.1, stone); B(1.05, FRZ0 - 0.1, FRZ0, trim);   // architrave + taenia
    B(0.9, FRZ0, COR0, stone);                                             // frieze
    B(1.55, COR0, COR0 + 0.55, trim); B(1.7, COR0 + 0.55, COR0 + 1.2, trim); B(1.5, COR0 + 1.2, WALL.y, stone); // cornice
  };
  entab(bw1, bw1, -PL0, PL0, '+a');
  for (const s of [-1, 1]) entab(bw1 + 0.98, PA0, s > 0 ? PL0 : -PL0, s > 0 ? PL0 : -PL0, s > 0 ? '-l' : '+l');
  // triglyphs over each column and mid-bay (proud of the frieze), guttae under the taenia, mutules under the corona
  const trigs = [];
  for (let i = 0; i < lats.length; i++) { trigs.push(lats[i]); if (i < lats.length - 1) trigs.push((lats[i] + lats[i + 1]) / 2); }
  trigs.push(-PL0 + 0.6, PL0 - 0.6);
  { const tsorted = trigs.slice().sort((a, b) => a - b); for (let i = 0; i < tsorted.length - 1; i++) { const lm = (tsorted[i] + tsorted[i + 1]) / 2; if (tsorted[i + 1] - tsorted[i] < 1.0) continue; const [px, pz] = WS(bw1 + 0.92, lm); const dg = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 14); dg.rotateX(Math.PI / 2); dg.rotateY(rotY); dg.translate(px, (FRZ0 + COR0) / 2, pz); tglyph.push(dg); } }
  for (const l of trigs) {
    tglyph.push(BX(bw1 + 0.9, bw1 + 1.0, l - 0.36, l + 0.36, FRZ0 + 0.02, COR0 - 0.02));
    
    fine.push(BX(bw1 + 0.98, bw1 + 1.08, l - 0.33, l + 0.33, FRZ0 - 0.24, FRZ0 - 0.1));
    fine.push(BX(bw1 + 1.05, bw1 + 1.6, l - 0.36, l + 0.36, COR0 + 0.48, COR0 + 0.56));
  }
  // engaged fluted Doric columns (instanced): 20 flutes, entasis, echinus + abacus
  {
    const seg = 60, hs = 6; const pos = [];
    const rAt = (t, th) => { const r = colR * (1 - 0.18 * t - 0.04 * Math.sin(Math.PI * t)); const fl = 0.955 + 0.045 * Math.abs(Math.cos(10 * th)); return r * fl; };
    for (let j = 0; j < hs; j++) for (let i = 0; i < seg; i++) {
      const t0 = j / hs, t1 = (j + 1) / hs, a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2; const h0 = t0 * (colH - 0.62), h1 = t1 * (colH - 0.62);
      const P = (t, a, h) => [Math.cos(a) * rAt(t, a), h, Math.sin(a) * rAt(t, a)];
      const p00 = P(t0, a0, h0), p01 = P(t0, a1, h0), p10 = P(t1, a0, h1), p11 = P(t1, a1, h1);
      pos.push(...p00, ...p10, ...p01, ...p01, ...p10, ...p11);
    }
    const shaft = new THREE.BufferGeometry(); shaft.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); shaft.computeVertexNormals();
    const rt = colR * 0.82;
    const nk = new THREE.CylinderGeometry(rt * 1.02, rt * 1.02, 0.12, 24); nk.translate(0, colH - 0.62 + 0.06, 0);
    const ech = new THREE.CylinderGeometry(colR * 1.2, rt * 1.02, 0.3, 24); ech.translate(0, colH - 0.5 + 0.15, 0);
    const abac = new THREE.BoxGeometry(colR * 2.6, 0.3, colR * 2.6); abac.translate(0, colH - 0.15, 0);
    const colGeo = mergePlain([shaft, nk, ech, abac]);
    const mats = [];
    for (const [a, l] of backCols) { const [x, z] = WS(a, l); colPos.push([x, z]); mats.push(new THREE.Matrix4().makeTranslation(x, DADO + 0.05, z)); }
    for (const [a, l] of sideCols) { const [x, z] = WS(a, l); colPos.push([x, z]); mats.push(new THREE.Matrix4().makeTranslation(x, DADO + 0.05, z)); }
    const colMesh = new THREE.InstancedMesh(boxUV(colGeo), SK, mats.length); mats.forEach((m, i) => colMesh.setMatrixAt(i, m)); colMesh.castShadow = true; root.add(colMesh);
  }
  // pylons: solid blocks framing the stage, edge strips, entablature bands wrapped round, wreath on the frieze
  for (const s of [-1, 1]) {
    const l0 = s > 0 ? PL0 : -PL1, l1 = s > 0 ? PL1 : -PL0;
    stone.push(BX(PA0, PA1, l0, l1, -1.0, WALL.y - 0.05));
    trim.push(BX(PA0 - 0.1, PA1 + 0.25, l0 - 0.1, l1 + 0.1, -0.6, 0.9));                       // base course
    trim.push(BX(PA0 - 0.1, PA1 + 0.12, l0 - 0.1, l1 + 0.1, FRZ0 - 0.1, FRZ0));                 // taenia line
    trim.push(BX(PA0 - 0.25, PA1 + 0.45, l0 - 0.25, l1 + 0.25, COR0 + 0.55, COR0 + 1.25));      // cornice
    trim.push(BX(PA0 - 0.12, PA1 + 0.3, l0 - 0.12, l1 + 0.12, COR0 + 1.25, WALL.y));
    for (const e of [l0 + 0.3, l1 - 0.3]) trim.push(BX(PA1, PA1 + 0.08, e - 0.3, e + 0.3, 0.9, FRZ0 - 0.1)); // edge strips
    // wreath (rosette) on the audience face of the frieze
    const [wx, wz] = WS(PA1 + 0.1, (l0 + l1) / 2); const tg = new THREE.TorusGeometry(0.42, 0.11, 8, 20); tg.rotateY(rotY); tg.translate(wx, (FRZ0 + COR0) / 2, wz); trim.push(tg);
    const dg = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12); dg.rotateX(Math.PI / 2); dg.rotateY(rotY); dg.translate(wx, (FRZ0 + COR0) / 2, wz); trim.push(dg);
  }
  // central doorway: dark recess, panelled double doors, transom, eared moulded frame, consoles + cornice cap
  {
    const { l0, l1, top } = doorC;
    dark.push(BX(bw1 - 0.6, bw1 - 0.55, l0, l1, STG.y, top));
    for (const [a, b] of [[l0 + 0.05, -0.02], [0.02, l1 - 0.05]]) { wood.push(BX(bw1 - 0.55, bw1 - 0.47, a, b, STG.y, top - 1.3)); for (const yy of [0.5, 2.2]) fine.push(BX(bw1 - 0.47, bw1 - 0.42, a + 0.15, b - 0.15, STG.y + yy, STG.y + yy + 1.4)); }
    trim.push(BX(bw1 - 0.6, bw1 + 0.02, l0 - 0.02, l1 + 0.02, top - 1.32, top - 1.2));
    trim.push(BX(bw1 - 0.6, bw1 + 0.02, l0 - 0.4, l0, STG.y, top + 0.02)); trim.push(BX(bw1 - 0.6, bw1 + 0.02, l1, l1 + 0.4, STG.y, top + 0.02));
    for (const [a, b] of [[l0 - 0.55, l0 - 0.02], [l1 + 0.02, l1 + 0.55]]) { trim.push(BX(bw1, bw1 + 0.5, a, b, STG.y, top + 0.45)); tglyph.push(BX(bw1 + 0.5, bw1 + 0.56, a + 0.08, b - 0.08, STG.y + 0.3, top + 0.35)); }    // jambs (architrave) with a fascia
    trim.push(BX(bw1, bw1 + 0.5, l0 - 0.85, l1 + 0.85, top + 0.05, top + 0.55));                                            // lintel with ears
    for (const sl of [l0 - 0.72, l1 + 0.72]) trim.push(BX(bw1, bw1 + 0.75, sl - 0.18, sl + 0.18, top - 0.6, top + 0.55));     // consoles
    stone.push(BX(bw1, bw1 + 0.5, l0 - 0.85, l1 + 0.85, top + 0.55, top + 1.1));                                            // frieze
    trim.push(BX(bw1, bw1 + 0.95, l0 - 1.1, l1 + 1.1, top + 1.1, top + 1.45));                                               // cornice cap
    trim.push(BX(bw1, bw1 + 0.8, l0 - 1.0, l1 + 1.0, top + 1.45, top + 1.62));
  }
  // side doors: small, plain, thin surround
  for (const l of sideDoors) {
    dark.push(BX(bw1 - 0.35, bw1 - 0.3, l - 0.65, l + 0.65, STG.y, 2.7));
    wood.push(BX(bw1 - 0.3, bw1 - 0.24, l - 0.62, l + 0.62, STG.y, 2.62));
    for (const [a, b, c, d] of [[l - 0.8, l - 0.65, STG.y, 2.85], [l + 0.65, l + 0.8, STG.y, 2.85], [l - 0.8, l + 0.8, 2.7, 2.85]]) trim.push(BX(bw1, bw1 + 0.1, a, b, c, d));
  }
  // high windows on the side returns near the pylons
  for (const s of [-1, 1]) { const li = s > 0 ? PL0 : -PL0; dark.push(BX(-10.3, -9.6, Math.min(li, li - s * 0.05), Math.max(li, li - s * 0.05), 6.0, 7.6)); }
  // stage steps down to the orchestra at the centre
  // eaves line seen from behind: flat roof slab with a low coping
  stone.push(BX(bw0 - 0.05, bw1 + 0.02, -PL1, PL1, WALL.y - 0.1, WALL.y + 0.05));
  root.add(new THREE.Mesh(mergeUV(stone, boxUV), SK));
  root.add(new THREE.Mesh(mergeUV(trim, boxUV), SK));
  root.add(new THREE.Mesh(mergeUV(panel, boxUV), SKL));
  root.add(new THREE.Mesh(mergeUV(sfront, boxUV), SKD));
  root.add(new THREE.Mesh(mergeUV(dark, boxUV), M.blackPaint));
  root.add(new THREE.Mesh(mergeUV(wood, boxUV), M.woodDark));
  root.add(new THREE.Mesh(mergeUV(tglyph, boxUV), TG));
  { const fm = new THREE.Mesh(mergeUV(fine, boxUV), FN); detail.add(fm); }
  // low parapet between the lower terrace and the upper bench rows, broken at each aisle
  {
    const wallG = []; const rW = 23.2, hW = 0.85;
    const aisleDeg = []; for (let k = 0; k < 11; k++) aisleDeg.push(-96.5 + k * 19.3);
    const R = rings.find((q) => q.bench) || rings[5]; const yb = rings[4] ? rings[4].y : yOrch;
    for (const [d0r, d1r] of [[R.lo + 1, -1.6], [1.6, R.hi - 1]]) {
      const d0 = d0r, d1 = d1r; if (d1 - d0 < 4) continue;
      const n = Math.max(2, Math.round((d1 - d0) / 2));
      for (let q = 0; q < n; q++) {
        const a0 = (d0 + (d1 - d0) * q / n) * Math.PI / 180, a1 = (d0 + (d1 - d0) * (q + 1) / n) * Math.PI / 180;
        const p0 = polar(rW - 0.3, a0), p1 = polar(rW - 0.3, a1), m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); const g = new THREE.BoxGeometry(len + 0.05, hW + 0.6, 0.35);
        g.rotateY(-Math.atan2(p1[1] - p0[1], p1[0] - p0[0])); g.translate(m[0], yb - 0.6 + (hW + 0.6) / 2, m[1]); wallG.push(g);
      }
    }
    if (wallG.length) root.add(new THREE.Mesh(mergeUV(wallG, boxUV), M.concreteDark));
  }
  // backstage (1957 Ernest Born additions) from the OSM parts, roof heights from LiDAR
  {
    const parts = [];
    const bp = (packet.context || []).find((c) => c.osm === 'w/431122954');
    if (bp) {
      const pts = bp.pts.slice(0, -1); let ys = [];
      for (let q = 0; q < 200; q++) { const i = q % pts.length; const j = (i + 1) % pts.length; const t = (q * 0.37) % 1; const x = pts[i][0] * (1 - t) + pts[j][0] * t, z = pts[i][1] * (1 - t) + pts[j][1] * t; const cx = x * 0.8 + C[0] * 0.2, cz = z * 0.8 + C[1] * 0.2; if (pointInPoly(cx, cz, pts)) ys.push(lid(cx, cz)); }
      ys.sort((a, b) => a - b); const yr = ys.length ? Math.min(6, Math.max(2.5, ys[ys.length >> 1])) : 4;
      const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      const eg = new THREE.ExtrudeGeometry(shape, { depth: yr + 1.5, bevelEnabled: false }); eg.rotateX(-Math.PI / 2); eg.translate(0, -1.5, 0);
      parts.push(eg);
      colliders.push({ type: 'poly', pts, y0: -2, y1: yr });
    }
    if (parts.length) root.add(new THREE.Mesh(mergeUV(parts, boxUV), M.stucco));
  }

  // ---------- colliders ----------
  const poly = (a0, a1, l0, l1) => [WS(a0, l0), WS(a1, l0), WS(a1, l1), WS(a0, l1)];
  colliders.push({ type: 'poly', pts: poly(bw0, bw1 + 0.4, -PL1, PL1), y0: -2, y1: WALL.y });
  colliders.push({ type: 'poly', pts: poly(bw1, PA0, -PL0 - RW, -PL0 + 0.4), y0: -2, y1: WALL.y });
  colliders.push({ type: 'poly', pts: poly(bw1, PA0, PL0 - 0.4, PL0 + RW), y0: -2, y1: WALL.y });
  for (const s of [-1, 1]) colliders.push({ type: 'poly', pts: poly(PA0, PA1 + 0.25, s > 0 ? PL0 : -PL1, s > 0 ? PL1 : -PL0), y0: -2, y1: WALL.y + 0.4 });
  for (const [x, z] of colPos) colliders.push({ type: 'cyl', x, z, r: colR, y0: STG.y, y1: DADO + colH });
  // stage front (except the central steps)
  colliders.push({ type: 'poly', pts: poly(STG.front - 0.2, STG.front, -STG.half + 2.5, STG.half - 2.5), y0: yOrch - 1, y1: STG.y - 0.45 });

  // ---------- walkable: orchestra + stage + tiers ----------
  const angOf = (x, z) => { const dx = x - C[0], dz = z - C[1]; let a = Math.atan2(dz, dx) - TA; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return [Math.hypot(dx, dz), a * 180 / Math.PI]; };
  const heightAt = (x, z) => {
    const dx = x - C[0], dz = z - C[1]; const along = dx * A[0] + dz * A[1], lat = dx * Pp[0] + dz * Pp[1];
    if (along <= STG.front && along >= STG.back && Math.abs(lat) <= STG.half) {
      return STG.y;
    }
    const [r, deg] = angOf(x, z);
    if (r < rOrch && along > STG.front) return yOrch;
    for (let k = 0; k < rings.length; k++) { const R = rings[k]; if (r >= R.r0 && r < R.r1 && deg >= R.lo && deg <= R.hi) { const nx = rings[k + 1]; const t = (r - (R.r1 - 0.12)) / 0.12; return t > 0 && nx && deg >= nx.lo && deg <= nx.hi ? R.y + (nx.y - R.y) * t : R.y; } }
    return null;
  };
  walkables.push({ type: 'fn', bounds: [C[0] - 45, C[1] - 45, C[0] + 45, C[1] + 45], heightAt });
  const interactions = [{ id: 'greek-stage', pos: [W(-12, 0)[0], STG.y + 1, W(-12, 0)[1]], radius: 6, label: 'Center stage, Hearst Greek Theatre' }];
  root.userData.debug = { rings: rings.map((R) => [+R.r0.toFixed(1), +R.y.toFixed(2), R.lo, R.hi]) };
  return { object3d: root, colliders, walkables, interactions, debug: root.userData.debug };
}
