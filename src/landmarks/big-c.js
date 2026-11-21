// The Big C on Charter Hill (1905). A six-inch concrete slab letter on the steep west-facing slope above
// Memorial Stadium, painted gold, with the class-rush plaque in its lower arm and a small flat viewing area.
import * as THREE from 'three';
import { Geo, boxGeo, mergeUV } from './lib/venue-util.js';

export const info = {
  id: 'big-c',
  name: 'The Big C',
  subtitle: 'Charter Hill · 1905',
  blurb: 'Built on March 23, 1905 by the classes of 1907 and 1908 to replace the dangerous freshman-sophomore "rush"; a plaque in the letter reads "In memory of the Rush, buried Charter Day 1905 by the classes of 1907 and 1908. Requiescat in pace." The freshmen then painted the concrete gold.',
  replaces: [],
};

const FT = 0.3048;
const HGT = 60 * FT, WID = 26 * FT, STROKE = 8 * FT, THICK = 0.15; // letter 60 ft tall on the slope, 26 ft wide

export async function build(ctx) {
  const { M, boxUV, groundAt } = ctx;
  const root = new THREE.Group(); root.name = 'big-c';
  const detail = new THREE.Group(); detail.userData.detail = true; root.add(detail);
  // in-plan "up" of the letter points away from campus (campus centre lies to the west-southwest)
  const anchor = ctx.anchor || { x: 723, z: -277 };
  let ux = anchor.x, uz = anchor.z; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul; // from campus origin towards the hill
  const rx = -uz, rz = ux; // right-hand direction for a viewer looking up the hill
  // slope along U to convert slope length to plan length
  const s0 = groundAt(-ux * 6, -uz * 6), s1 = groundAt(ux * 6, uz * 6); const slope = (s1 - s0) / 12; const kPlan = Math.cos(Math.atan(slope));
  const b0 = -HGT / 2; // letter centred on the anchor
  const P = (a, b) => { const bp = (b0 + b) * kPlan; return [a * rx + bp * ux, a * rz + bp * uz]; };
  // block C as union of rectangles in letter space (a across, b up the slope)
  const rects = [[-WID / 2, -WID / 2 + STROKE, 0, HGT], [-WID / 2 + STROKE, WID / 2, 0, STROKE], [-WID / 2 + STROKE, WID / 2, HGT - STROKE, HGT]];
  const inC = (a, b) => rects.some(([a0, a1, c0, c1]) => a >= a0 && a <= a1 && b >= c0 && b <= c1);
  const top = new Geo(), side = new Geo();
  const STEP = 0.5;
  const V = (a, b, dy) => { const [x, z] = P(a, b); return [x, groundAt(x, z) + dy, z]; };
  for (const [a0, a1, c0, c1] of rects) {
    const na = Math.max(1, Math.round((a1 - a0) / STEP)), nb = Math.max(1, Math.round((c1 - c0) / STEP));
    for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) {
      const aa = a0 + (a1 - a0) * i / na, ab = a0 + (a1 - a0) * (i + 1) / na, ba = c0 + (c1 - c0) * j / nb, bb = c0 + (c1 - c0) * (j + 1) / nb;
      top.quad(V(aa, ba, THICK), V(ab, ba, THICK), V(ab, bb, THICK), V(aa, bb, THICK));
    }
    // edges (only where the neighbour is outside the letter)
    const edge = (pa, pb, outA, outB) => {
      const n = Math.max(1, Math.round(Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) / STEP));
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n; const qa = [pa[0] + (pb[0] - pa[0]) * t0, pa[1] + (pb[1] - pa[1]) * t0], qb = [pa[0] + (pb[0] - pa[0]) * t1, pa[1] + (pb[1] - pa[1]) * t1];
        const mid = [(qa[0] + qb[0]) / 2 + outA, (qa[1] + qb[1]) / 2 + outB]; if (inC(mid[0], mid[1])) continue;
        side.quad(V(qa[0], qa[1], -0.35), V(qb[0], qb[1], -0.35), V(qb[0], qb[1], THICK), V(qa[0], qa[1], THICK));
      }
    };
    edge([a0, c0], [a1, c0], 0, -0.05); edge([a1, c0], [a1, c1], 0.05, 0); edge([a1, c1], [a0, c1], 0, 0.05); edge([a0, c1], [a0, c0], -0.05, 0);
  }
  // make side faces outward-facing regardless of winding: render double sided
  const goldMat = M.calGold.clone(); goldMat.color = new THREE.Color(0xf2b01e); goldMat.roughness = 0.75;
  const sideMat = goldMat.clone(); sideMat.side = THREE.DoubleSide;
  root.add(new THREE.Mesh(mergeUV([top.geometry()], boxUV), goldMat));
  root.add(new THREE.Mesh(mergeUV([side.geometry()], boxUV), sideMat));
  // bronze plaque in the lower arm
  {
    const [px, pz] = P(WID / 2 - 1.2, STROKE / 2); const y = groundAt(px, pz) + THICK + 0.03;
    const pl = boxGeo(0.9, 0.06, 0.6, px, y, pz, Math.atan2(ux, uz)); detail.add(new THREE.Mesh(boxUV(pl.toNonIndexed()), M.bronze));
  }
  // flat viewing area at the foot of the letter (level terrace with a low retaining wall on the downhill side)
  const vw = 9, vd = 4.5; const [vcx, vcz] = P(0, -3.2);
  const corners = [[-vw / 2, -vd / 2], [vw / 2, -vd / 2], [vw / 2, vd / 2], [-vw / 2, vd / 2]].map(([a, d]) => [vcx + a * rx + d * ux, vcz + a * rz + d * uz]);
  let ty = -1e9; for (const [x, z] of corners) ty = Math.max(ty, groundAt(x, z) - 0.05);
  ty = Math.min(ty, groundAt(vcx, vcz) + 0.6);
  const terrace = [];
  { // slab: thick box from well below ground to the walking level
    const depth = ty - Math.min(...corners.map(([x, z]) => groundAt(x, z))) + 0.8;
    terrace.push(boxGeo(vw, depth, vd, vcx, ty - depth / 2, vcz, Math.atan2(ux, uz)));
  }
  const ang = Math.atan2(ux, uz);
  // low wall along the downhill edge + two benches
  const wallC = [vcx - ux * (vd / 2 - 0.15), vcz - uz * (vd / 2 - 0.15)];
  terrace.push(boxGeo(vw, 0.55, 0.3, wallC[0], ty + 0.275, wallC[1], ang));
  for (const s of [-2.4, 2.4]) { const bx = vcx + rx * s + ux * 0.7, bz = vcz + rz * s + uz * 0.7; terrace.push(boxGeo(1.8, 0.45, 0.45, bx, ty + 0.225, bz, ang)); }
  root.add(new THREE.Mesh(mergeUV(terrace, boxUV), M.concreteDark));
  const colliders = [{ type: 'poly', pts: [[-vw / 2, -vd / 2], [vw / 2, -vd / 2], [vw / 2, -vd / 2 + 0.3], [-vw / 2, -vd / 2 + 0.3]].map(([a, d]) => [vcx + a * rx + d * ux, vcz + a * rz + d * uz]), y0: ty - 3, y1: ty + 0.55 }];
  // walkables: the letter surface (climbable slab) and the level terrace
  const inv = (x, z) => { const a = x * rx + z * rz; const bp = x * ux + z * uz; return [a, bp / kPlan - b0]; };
  const walkables = [
    { type: 'poly', pts: corners, y: ty },
    { type: 'fn', bounds: [-15, -15, 15, 15], heightAt: (x, z) => { const [a, b] = inv(x, z); return inC(a, b) ? groundAt(x, z) + THICK : null; } },
  ];
  const interactions = [{ id: 'big-c-view', pos: [vcx, ty + 1, vcz], radius: 5, label: 'Look out over campus and the Bay from the Big C' }];
  return { object3d: root, colliders, walkables, interactions };
}
