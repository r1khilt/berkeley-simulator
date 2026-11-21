// The Big C on Charter Hill (1905). A gold-painted concrete block letter laid flush on the steep west-facing
// grass slope above Memorial Stadium: a squared C with chamfered outer corners, an angled end on the upper arm and a
// small upturned spur on the lower one, about 22 m tall on the slope. No terrace or wall: just the slab in open grass
// (the LiDAR trees frame the clearing in game), a worn path climbing to it and the class-rush plaque on the lower arm.
// refine-east: rebuilt letterform (was a narrow 3-rectangle bracket) aligned to the measured fall line; removed the
// invented concrete terrace; textured, edge-worn gold paint; slab follows the terrain with real thickness.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { drapePoly } from './lib/b11-sports.js';

export const info = {
  id: 'big-c',
  name: 'The Big C',
  subtitle: 'Charter Hill · 1905',
  blurb: 'Built on March 23, 1905 by the classes of 1907 and 1908 to replace the dangerous freshman-sophomore "rush"; a plaque in the letter reads "In memory of the Rush, buried Charter Day 1905 by the classes of 1907 and 1908. Requiescat in pace." The freshmen then painted the concrete gold.',
  replaces: [],
};

const H = 22.0, WD = 16.0, S = 3.3, CO = 3.2, CI = 1.1, THICK = 0.2;

export async function build(ctx) {
  const { M, groundAt } = ctx;
  // fall line from the terrain (uphill direction), letter "up" = uphill so it reads from campus below
  const R0 = 8; const gx = (groundAt(R0, 0) - groundAt(-R0, 0)) / (2 * R0), gz = (groundAt(0, R0) - groundAt(0, -R0)) / (2 * R0);
  let ux = gx, uz = gz; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
  const rx = -uz, rz = ux; // to the right for a viewer looking uphill (the C opens this way)
  const kPlan = Math.cos(Math.atan(Math.hypot(gx, gz))); // slope length -> plan length
  const K = new Kit(ctx, 0);
  const b0 = -H / 2;
  const P = (a, b) => { const bp = (b0 + b) * kPlan; return [a * rx + bp * ux, a * rz + bp * uz]; };
  const inv = (x, z) => [x * rx + z * rz, (x * ux + z * uz) / kPlan - b0];
  // letter outline in letter space (a across, b up the slope)
  const L = -WD / 2, Rr = WD / 2, topEnd = L + WD * 0.86;
  const outline = [
    [L + CO, 0], [Rr, 0], [Rr, S + 0.75], [Rr - 1.1, S],               // lower arm with upturned spur
    [L + S + CI, S], [L + S, S + CI], [L + S, H - S - CI], [L + S + CI, H - S], // counter (inner bowl)
    [topEnd - 1.0, H - S], [topEnd, H],                                // upper arm, end cut on a slant
    [L + CO, H], [L, H - CO], [L, CO],                                 // chamfered outer corners
  ];
  const inside = (a, b) => { let c = false; for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) { const p = outline[i], q = outline[j]; if ((p[1] > b) !== (q[1] > b) && a < (q[0] - p[0]) * (b - p[1]) / (q[1] - p[1]) + p[0]) c = !c; } return c; };
  const ring = outline.map(([a, b]) => P(a, b));
  // gold paint over concrete: textured, slightly worn
  const gold = new THREE.MeshStandardMaterial({ color: 0xf6b41f, roughness: 0.82, map: M.concrete.map || null });
  const edge = new THREE.MeshStandardMaterial({ color: 0xc99a2e, roughness: 0.9, map: M.concrete.map || null, side: THREE.DoubleSide });
  drapePoly(K, gold, ring, { maxEdge: 0.9, off: THICK });
  // slab edges: vertical bands from below grade to the painted top, following the slope
  {
    const pos = [];
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i], q = ring[(i + 1) % ring.length]; const len = Math.hypot(q[0] - p[0], q[1] - p[1]); const n = Math.max(1, Math.ceil(len / 0.6));
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n; const a = [p[0] + (q[0] - p[0]) * t0, p[1] + (q[1] - p[1]) * t0], b = [p[0] + (q[0] - p[0]) * t1, p[1] + (q[1] - p[1]) * t1];
        const ga = groundAt(a[0], a[1]), gb = groundAt(b[0], b[1]);
        pos.push(a[0], ga - 0.3, a[1], b[0], gb - 0.3, b[1], b[0], gb + THICK, b[1], a[0], ga - 0.3, a[1], b[0], gb + THICK, b[1], a[0], ga + THICK, a[1]);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    K.add(edge, g);
  }
  // scuffed, sun-faded patches where people sit (slightly paler decals on the lower bowl and arms)
  {
    const pale = new THREE.MeshStandardMaterial({ color: 0xf3c95a, roughness: 0.9, map: M.concrete.map || null, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const [a0, b0_, a1, b1] of [[L + 0.4, 4.5, L + S - 0.5, 9], [L + 0.4, 12.5, L + S - 0.4, 17], [0.5, 0.5, 4.5, S - 0.6]]) {
      drapePoly(K, pale, [P(a0, b0_), P(a1, b0_), P(a1, b1), P(a0, b1)], { maxEdge: 0.9, off: THICK + 0.012, detail: true });
    }
  }
  // bronze class-rush plaque set into the lower arm
  {
    const [px, pz] = P(Rr - 4.2, S * 0.5); const y = groundAt(px, pz) + THICK + 0.02;
    const pl = new THREE.BoxGeometry(0.9, 0.05, 0.6); pl.rotateY(Math.atan2(ux, uz)); pl.translate(px, y, pz); K.add(M.bronze, pl, { detail: true });
  }
  // worn dirt path climbing from the fire trail below to the foot of the letter
  {
    const dirt = new THREE.MeshStandardMaterial({ color: 0x9a8a63, roughness: 1.0, map: M.concrete.map || null, polygonOffset: true, polygonOffsetFactor: -1 });
    const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([L + WD * 0.2 + Math.sin(t * 2.2) * 2.5, -1 - t * 26]); }
    const left = [], right = [];
    for (let k = 0; k < pts.length; k++) { const [a, b] = pts[k]; const w = 0.7 + 0.25 * Math.sin(k); left.push(P(a - w, b)); right.push(P(a + w, b)); }
    drapePoly(K, dirt, [...left, ...right.reverse()], { maxEdge: 1.2, off: 0.04 });
  }
  const object3d = K.finish(); object3d.name = 'big-c';
  const foot = P(0, -1.5);
  const walkables = [{ type: 'fn', bounds: [-16, -16, 16, 16], heightAt: (x, z) => { const [a, b] = inv(x, z); return inside(a, b) ? groundAt(x, z) + THICK : null; } }];
  const interactions = [{ id: 'big-c-view', pos: [foot[0], groundAt(foot[0], foot[1]) + 1, foot[1]], radius: 6, label: 'Look out over campus and the Bay from the Big C' }];
  return { object3d, colliders: [], walkables, interactions };
}
