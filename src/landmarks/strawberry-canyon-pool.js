// Strawberry Canyon Recreational Area pool: the outdoor pool in the wooded canyon above campus, between Levine-Fricke
// Field and the Haas Clubhouse. Water body follows the OSM outline (a 25-yard lap section with a rounded deep end),
// tiled walls and floor seen through the water, white coping, painted lane stripes and T-marks, a 1 m diving board,
// lifeguard stands, loungers and canvas umbrellas on a broom-finished concrete deck, all inside a galvanised fence.
import * as THREE from 'three';
import { Kit, sportsMats, fieldsMats, fieldTexture, surfaceMat, drapePoly, fence, deg, umbrella, lounger, lifeguardChair, canvasTex, signTex, signPanel, pad } from './lib/fields-kit.js';

export const info = {
  id: 'strawberry-canyon-pool',
  name: 'Strawberry Canyon Pool',
  subtitle: 'Strawberry Canyon Recreational Area',
  blurb: 'The outdoor pool of the Strawberry Canyon Recreational Area, set among redwoods and eucalyptus in the canyon east of Memorial Stadium, next to the Haas Clubhouse.',
  replaces: ['w/69020841'],
};

export async function build(ctx) {
  const { M } = ctx; const S = sportsMats(M); const F = fieldsMats(M);
  const ang = deg(47); const K = new Kit(ctx, ang);
  const colliders = [], walkables = [];
  const poolXZ = ctx.footprints[0].outer; const pool = poolXZ.map(([x, z]) => K.uv(x, z));
  const deckXZ = [[-38, -11], [18, -26], [29, -3], [36, 16], [-27, 33]]; const deck = deckXZ.map(([x, z]) => K.uv(x, z));
  const gs = poolXZ.map(([x, z]) => ctx.groundAt(x, z)).sort((a, b) => a - b); const yd = gs[gs.length - 1] + 0.45; const yw = yd - 0.2, yb = yd - 2.0; // deck raised so the water sits above the terrain
  // deck slab (concrete, slight warm tone) with the pool as a hole; sides read as a low retaining edge on the slope
  const deckTex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#ddd6c8'; c.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c.strokeStyle = 'rgba(90,80,70,0.35)'; c.lineWidth = 2; for (let k = 0; k <= 4; k++) { c.beginPath(); c.moveTo(k * w / 4, 0); c.lineTo(k * w / 4, h); c.stroke(); c.beginPath(); c.moveTo(0, k * h / 4); c.lineTo(w, k * h / 4); c.stroke(); } }, { repeat: true });
  const deckMat = surfaceMat(deckTex, { rough: 0.9 });
  drapePoly(K, deckMat, deck, { holes: [pool], maxEdge: 3, yFn: (u, v) => Math.max(yd, K.g(u, v) + 0.05), uvFn: (u, v) => [u / 8, v / 8] });
  let du0 = 1e9, du1 = -1e9, dv0 = 1e9, dv1 = -1e9; for (const [u, v] of deck) { du0 = Math.min(du0, u); du1 = Math.max(du1, u); dv0 = Math.min(dv0, v); dv1 = Math.max(dv1, v); }
  // deck edge wall following the deck outline
  for (let i = 0; i < deck.length; i++) { const a = deck[i], b = deck[(i + 1) % deck.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const an = Math.atan2(b[1] - a[1], b[0] - a[0]); const gm = Math.min(K.g(a[0], a[1]), K.g(b[0], b[1]), K.g((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)); K.obox(M.concrete, (a[0] + b[0]) / 2, (gm - 0.6 + yd) / 2, (a[1] + b[1]) / 2, L + 0.3, yd - gm + 0.6, 0.3, an); }
  walkables.push(K.walkPoly(deck, yd));
  // pool basin: tiled walls + floor, coping
  let pu0 = 1e9, pu1 = -1e9, pv0 = 1e9, pv1 = -1e9; for (const [u, v] of pool) { pu0 = Math.min(pu0, u); pu1 = Math.max(pu1, u); pv0 = Math.min(pv0, v); pv1 = Math.max(pv1, v); }
  const PL = pu1 - pu0, PW = pv1 - pv0, pcu = (pu0 + pu1) / 2, pcv = (pv0 + pv1) / 2;
  const floorTex = fieldTexture(PL, PW, (P) => {
    const c = P.c; c.fillStyle = '#7fc8dc'; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    for (let i = 0; i < 2500; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,60,90,0.06)'; c.fillRect(Math.random() * c.canvas.width, Math.random() * c.canvas.height, 4, 4); }
    c.fillStyle = 'rgba(20,40,90,0.85)'; const lanes = 6, lw = 2.3; const v0 = -PW / 2 + 1.0;
    for (let k = 0; k < lanes; k++) { const v = v0 + lw * (k + 0.5); if (v > PW / 2 - 0.8) break; c.fillRect(P.X(-PL / 2 + 2), P.Y(v - 0.13), (PL - 4) * P.s, 0.26 * P.s); for (const e of [-1, 1]) c.fillRect(P.X(e * (PL / 2 - 2) - 0.5), P.Y(v - 0.5), 1.0 * P.s, 1.0 * P.s); }
  }, { pxm: 12, maxPx: 1024 });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 });
  drapePoly(K, floorMat, pool, { maxEdge: 6, yFn: () => yb, uvFn: (u, v) => [(u - pu0) / PL, 1 - (v - pv0) / PW] });
  const tileTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#9fd6e6'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2; for (let k = 0; k <= 8; k++) { c.beginPath(); c.moveTo(k * w / 8, 0); c.lineTo(k * w / 8, h); c.stroke(); c.beginPath(); c.moveTo(0, k * h / 8); c.lineTo(w, k * h / 8); c.stroke(); } c.fillStyle = '#1d4f8a'; c.fillRect(0, 0, w, h * 0.12); }, { repeat: true });
  const tileMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.4, side: THREE.DoubleSide });
  const area = pool.reduce((s, p, i) => { const q = pool[(i + 1) % pool.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  for (let i = 0; i < pool.length; i++) {
    const a = pool[i], b = pool[(i + 1) % pool.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
    const pos = [a[0], yb, a[1], b[0], yb, b[1], b[0], yd - 0.05, b[1], a[0], yb, a[1], b[0], yd - 0.05, b[1], a[0], yd - 0.05, a[1]];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, L / 2, 0, L / 2, (yd - yb) / 2, 0, 0, L / 2, (yd - yb) / 2, 0, (yd - yb) / 2], 2)); g.computeVertexNormals(); K.add(tileMat, g, { uvMode: 'keep' });
    const an = Math.atan2(b[1] - a[1], b[0] - a[0]); const n = area > 0 ? an - Math.PI / 2 : an + Math.PI / 2; const off = 0.2;
    K.obox(F.trimWhite, (a[0] + b[0]) / 2 + Math.cos(n) * off, yd - 0.02, (a[1] + b[1]) / 2 + Math.sin(n) * off, L + 0.4, 0.1, 0.4, an);
  }
  const water = new THREE.MeshStandardMaterial({ map: floorTex, color: 0xcfefff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.93, envMapIntensity: 1.3 });
  drapePoly(K, water, pool, { maxEdge: 8, yFn: () => yw, uvFn: (u, v) => [(u - pu0) / PL, 1 - (v - pv0) / PW] });
  colliders.push(K.colPoly(pool, yb - 1, yw - 0.6));
  // lane ropes in the lap section (along u), between the stripes
  { const lanes = 6, lw = 2.3; const v0 = pv0 + 1.0; const ropeMat = [S.navy, S.goalWhite, S.gold];
    for (let k = 1; k < lanes; k++) { const v = v0 + lw * k; if (v > pv1 - 1) break; const ins = []; for (let i = 0; i < pool.length; i++) { const a = pool[i], b = pool[(i + 1) % pool.length]; if ((a[1] - v) * (b[1] - v) < 0) ins.push(a[0] + (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1])); } ins.sort((p, q) => p - q); if (ins.length < 2) continue; const ua = ins[0] + 0.3, ub = Math.min(ins[1], ua + 22.86) - 0.3; const n = Math.round((ub - ua) / 0.9); for (let i = 0; i < n; i++) K.box(ropeMat[i % 3], ua + (ub - ua) * i / n, yw - 0.04, v - 0.06, ua + (ub - ua) * (i + 0.8) / n, yw + 0.06, v + 0.06, { detail: true }); } }
  // diving board at the deep (rounded) end
  { const endV = pool.filter((p) => p[0] > pu1 - 5); const v = endV.reduce((a, p) => a + p[1], 0) / endV.length; const u = pu1 + 1.0; K.box(M.concrete, u - 0.3, yd, v - 0.5, u + 1.5, yd + 0.5, v + 0.5); const g = new THREE.BoxGeometry(4.8, 0.08, 0.5); g.translate(u - 1.9, yd + 0.95, v); K.add(F.chairBlue, g); K.box(F.postBlack, u + 0.2, yd + 0.5, v - 0.05, u + 0.4, yd + 0.95, v + 0.05); }
  // lifeguard stands, loungers, umbrellas
  lifeguardChair(K, S, F, pu0 - 2.0, pcv, yd, 0);
  lifeguardChair(K, S, F, pcu + 3, pv1 + 2.2, yd, -Math.PI / 2);
  const umbs = [F.canvasNavy, F.canvasGold, F.canvasWhite, F.canvasTeal];
  let k = 0;
  for (let u = du0 + 4; u < du1 - 4; u += 4.2) for (const side of [-1, 1]) {
    const v = side < 0 ? pv0 - 4.5 : pv1 + 5.5; const inDeck = (x, y) => { let c = false; for (let i = 0, j = deck.length - 1; i < deck.length; j = i++) { const [xi, yi] = deck[i], [xj, yj] = deck[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    if (!inDeck(u, v) || !inDeck(u + 2, v + side * 1.5)) continue; let near = false; for (let i = 0; i < pool.length; i++) if (Math.hypot(pool[i][0] - u, pool[i][1] - v) < 2) near = true; if (near) continue;
    lounger(K, F, u, v, yd, Math.PI / 2, k % 3 === 0 ? F.chairBlue : F.chairWhite); lounger(K, F, u + 1.0, v, yd, Math.PI / 2, F.chairWhite);
    if (k % 2 === 0) umbrella(K, F, u + 0.5, v + side * 1.4, yd, umbs[(k / 2) % umbs.length]);
    k++;
  }
  // galvanised fence around the deck, gate toward the clubhouse path
  fence(K, S, deck, { h: 2.4, every: 3, y: () => yd, closed: true, gapAt: [2], colliders });
  const sg = signTex('STRAWBERRY CANYON POOL', { w: 1024, h: 128, bg: '#003262', fg: '#fdb515', size: 0.5 });
  { const a = deck[2], b = deck[3]; const an = Math.atan2(b[1] - a[1], b[0] - a[0]); signPanel(K, sg, (a[0] + b[0]) / 2, yd + 2.9, (a[1] + b[1]) / 2, 7, 0.85, an - Math.PI / 2, { emissive: 0.06 }); }
  const object3d = K.finish(); object3d.name = 'strawberry-canyon-pool';
  const c = K.xz(pcu, pv1 + 3);
  return { object3d, colliders, walkables, interactions: [{ id: 'scp-deck', pos: [c[0], yd + 1, c[1]], radius: 5, label: 'Pool deck, Strawberry Canyon' }] };
}
