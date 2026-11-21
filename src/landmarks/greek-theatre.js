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
  const yOrch = -1.72, rOrch = 10.0;
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
    const im = new THREE.InstancedMesh(boxUV(stepG.toNonIndexed()), M.concrete, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m)); root.add(im);
    // marble chairs
    const chair = mergePlain([boxGeo(0.7, 0.45, 0.6, 0, 0.225, 0), boxGeo(0.7, 0.75, 0.14, 0, 0.8, 0.26), boxGeo(0.12, 0.3, 0.6, -0.31, 0.6, 0), boxGeo(0.12, 0.3, 0.6, 0.31, 0.6, 0)]);
    const cm = []; const R = rings[0];
    for (let k = 0; k < 28; k++) {
      const a = (-80 + 160 * (k + 0.5) / 28) * Math.PI / 180; const p = polar(R.r0 + 0.9, a);
      cm.push(new THREE.Matrix4().compose(new THREE.Vector3(p[0], R.y, p[1]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(Math.cos(TA + a), Math.sin(TA + a))), new THREE.Vector3(1, 1, 1)));
    }
    const ic = new THREE.InstancedMesh(chair, M.marble, cm.length); cm.forEach((m, i) => ic.setMatrixAt(i, m)); detail.add(ic);
  }

  // ---------- stage + skene with Doric colonnade ----------
  const STG = { front: -8.5, back: -16.6, half: 20.0, lc: 1.0, y: 0.0 };
  const WALL = { y: 12.85, t: 3.4 };
  const stone = [], trim = [], dark = [], cols = [];
  const boxAL = (a0, a1, l0, l1, y0, y1) => { const [cx, cz] = W((a0 + a1) / 2, (l0 + l1) / 2); return boxGeo(Math.abs(l1 - l0), y1 - y0, Math.abs(a1 - a0), cx, (y0 + y1) / 2, cz, Math.atan2(Pp[0], Pp[1]) + Math.PI / 2 - Math.PI / 2 + 0); };
  // NOTE: boxGeo rotates about Y so that local x -> lateral (Pp) and local z -> axis (A)
  const rotY = Math.atan2(A[0], A[1]);
  const BX = (a0, a1, l0, l1, y0, y1) => { const [cx, cz] = WS((a0 + a1) / 2, (l0 + l1) / 2); const g = new THREE.BoxGeometry(Math.abs(l1 - l0), y1 - y0, Math.abs(a1 - a0)); g.rotateY(rotY); g.translate(cx, (y0 + y1) / 2, cz); return g; };
  // stage platform (podium) with front face
  stone.push(BX(STG.back, STG.front, -STG.half, STG.half, yOrch - 0.5, STG.y));
  // back wall and side walls
  const bw0 = STG.back - WALL.t, bw1 = STG.back;
  stone.push(BX(bw0, bw1, -STG.half - 2.6, STG.half + 2.6, -1.0, WALL.y - 2.6));
  stone.push(BX(-19.6, -7.0, -STG.half - 2.6, -STG.half, -1.0, WALL.y - 2.6));
  stone.push(BX(-19.6, -7.0, STG.half, STG.half + 2.6, -1.0, WALL.y - 2.6));
  // square end piers
  for (const s of [-1, 1]) stone.push(BX(-7.6, -5.8, s * STG.half - (s > 0 ? 0 : 2.8) + (s > 0 ? 0 : 0), s * STG.half + (s > 0 ? 2.8 : 0), -1.0, WALL.y - 0.4));
  // Doric entablature on the three walls (architrave / frieze / cornice)
  const ent = (a0, a1, l0, l1, inward) => {
    trim.push(BX(a0, a1, l0, l1, WALL.y - 2.6, WALL.y - 1.75));          // architrave
    stone.push(BX(a0, a1, l0, l1, WALL.y - 1.75, WALL.y - 0.75));         // frieze
    trim.push(BX(a0 - inward[0], a1 + inward[1], l0 - inward[2], l1 + inward[3], WALL.y - 0.75, WALL.y)); // cornice
  };
  ent(bw0, bw1 + 1.05, -STG.half - 2.6, STG.half + 2.6, [0, 0.45, 0.3, 0.3]);
  stone.push(BX(bw0 - 1.2, bw0, -6, 6, -1.0, WALL.y));
  ent(-19.6, -7.0, -STG.half - 2.6, -STG.half + 1.05, [0, 0.4, 0.3, 0.45]);
  ent(-19.6, -7.0, STG.half - 1.05, STG.half + 2.6, [0, 0.4, 0.45, 0.3]);
  // triglyphs on the frieze facing the stage
  const tri = [];
  for (let l = -STG.half + 1; l <= STG.half - 1; l += 1.75) tri.push(BX(bw1 + 1.05, bw1 + 1.17, l - 0.3, l + 0.3, WALL.y - 1.7, WALL.y - 0.8));
  // engaged Doric columns (shaft + echinus/abacus) on the inner faces
  const colH = WALL.y - 2.6 - STG.y, colR = 0.62;
  const shaft = new THREE.CylinderGeometry(colR * 0.82, colR, colH - 0.7, 20, 1, false); shaft.translate(0, (colH - 0.7) / 2, 0);
  const ech = new THREE.CylinderGeometry(colR * 1.12, colR * 0.84, 0.35, 20); ech.translate(0, colH - 0.7 + 0.175, 0);
  const abac = new THREE.BoxGeometry(colR * 2.5, 0.35, colR * 2.5); abac.translate(0, colH - 0.175, 0);
  const colGeo = mergePlain([shaft, ech, abac]);
  const colPos = [];
  for (let k = 0; k <= 10; k++) { const l = -STG.half + 1.4 + k * (2 * STG.half - 2.8) / 10; if (k === 5) continue; colPos.push(WS(bw1 + 0.45, l)); }
  for (const s of [-1, 1]) for (const a of [-14.6, -11.0]) colPos.push(WS(a, s * (STG.half - 0.15)));
  const cmats = colPos.map(([x, z]) => new THREE.Matrix4().makeTranslation(x, STG.y, z));
  const colMesh = new THREE.InstancedMesh(boxUV(colGeo), M.concrete, cmats.length); cmats.forEach((m, i) => colMesh.setMatrixAt(i, m)); root.add(colMesh);
  // central doorway: aedicule with entablature on consoles + dark opening; secondary doors
  dark.push(BX(bw1 - 0.3, bw1 + 0.02, -1.6, 1.6, STG.y, STG.y + 5.2));
  trim.push(BX(bw1, bw1 + 0.35, -2.3, -1.6, STG.y, STG.y + 5.8)); trim.push(BX(bw1, bw1 + 0.35, 1.6, 2.3, STG.y, STG.y + 5.8));
  trim.push(BX(bw1, bw1 + 0.6, -2.7, 2.7, STG.y + 5.8, STG.y + 6.5)); trim.push(BX(bw1, bw1 + 0.85, -3.0, 3.0, STG.y + 6.5, STG.y + 6.85));
  for (const s of [-1, 1]) trim.push(BX(bw1, bw1 + 0.5, s * 2.45 - 0.18, s * 2.45 + 0.18, STG.y + 5.1, STG.y + 5.8)); // consoles
  for (const s of [-1, 1]) dark.push(BX(bw1 - 0.3, bw1 + 0.02, s * 10.6 - 1.1, s * 10.6 + 1.1, STG.y, STG.y + 3.6));
  // stage steps down to the orchestra at the centre
  for (let k = 0; k < 5; k++) { const y = yOrch + (STG.y - yOrch) * (k + 1) / 6; stone.push(BX(STG.front, STG.front + 0.35 * (5 - k), -3.5, 3.5, yOrch - 0.3, y)); }
  root.add(new THREE.Mesh(mergeUV(stone, boxUV), M.concrete));
  root.add(new THREE.Mesh(mergeUV(trim, boxUV), M.concrete));
  root.add(new THREE.Mesh(mergeUV(dark, boxUV), M.blackPaint));
  const triM = new THREE.Mesh(mergeUV(tri, boxUV), M.concreteDark); detail.add(triM);

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
  colliders.push({ type: 'poly', pts: poly(bw0, bw1, -STG.half - 2.6, STG.half + 2.6), y0: -2, y1: WALL.y });
  colliders.push({ type: 'poly', pts: poly(-19.6, -7.0, -STG.half - 2.6, -STG.half), y0: -2, y1: WALL.y });
  colliders.push({ type: 'poly', pts: poly(-19.6, -7.0, STG.half, STG.half + 2.6), y0: -2, y1: WALL.y });
  for (const [x, z] of colPos) colliders.push({ type: 'cyl', x, z, r: colR, y0: STG.y, y1: STG.y + colH });
  // stage front (except the central steps)
  colliders.push({ type: 'poly', pts: poly(STG.front - 0.2, STG.front, -STG.half, -3.6), y0: yOrch - 1, y1: STG.y - 0.45 });
  colliders.push({ type: 'poly', pts: poly(STG.front - 0.2, STG.front, 3.6, STG.half), y0: yOrch - 1, y1: STG.y - 0.45 });

  // ---------- walkable: orchestra + stage + tiers ----------
  const angOf = (x, z) => { const dx = x - C[0], dz = z - C[1]; let a = Math.atan2(dz, dx) - TA; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return [Math.hypot(dx, dz), a * 180 / Math.PI]; };
  const heightAt = (x, z) => {
    const dx = x - C[0], dz = z - C[1]; const along = dx * A[0] + dz * A[1], lat = dx * Pp[0] + dz * Pp[1];
    if (along <= STG.front && along >= STG.back && Math.abs(lat) <= STG.half) {
      if (along > STG.front - 2.0 && Math.abs(lat) < 3.5) { const t = (along - (STG.front - 1.75)) / 1.75; return t <= 0 ? STG.y : STG.y + (yOrch - STG.y) * Math.min(1, t); }
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
