// MLK Jr. Student Union — Lower Sproul level interior (interiors-cafe branch): the student "dining room" in the
// two-storey west wing (food court counters named after the vendors on the façade signs, café tables with moulded
// plywood chairs, a window bar, teal lounge seating, thick round white columns, polished concrete floor) and the
// Cal Student Store's lower-level storefront set into the main block. Building frame of the MLK module (ANG -9°).
// The floor is a very gentle plane (~4%) fitted just above the LiDAR ground so it meets Lower Sproul flush.
import * as THREE from 'three';
import { Kit, polysGeo } from './classic-kit.js';
import { tinted, tone, TEXAVG, glassBand } from './b01-kit.js';
import { furnitureLib, Instancer, Atlas, signQuad, menuBoard, fitText, lightPools, glowMat, warmFill, gate } from './int-kit.js';

export const MLK_IN = { u0: -25.4, u1: -14.2, v0: -26.0, v1: 22.0, nU: -10.85, nV0: 9.5, nV1: 19.0, ceil: 4.5 };

export function fitFloor(K) { // y = c + b*u above the ground of the wing + store niche
  const S = []; for (let u = -25.1; u <= -10.8; u += 0.7) for (let v = -25.7; v <= 21.7; v += 1.0) { if (u > -13.9 && (v < 9.5 || v > 19)) continue; S.push([u, K.g(u, v)]); }
  const mu = S.reduce((a, s) => a + s[0], 0) / S.length, mg = S.reduce((a, s) => a + s[1], 0) / S.length;
  let num = 0, den = 0; for (const [u, gg] of S) { num += (u - mu) * (gg - mg); den += (u - mu) ** 2; }
  const b = Math.min(0.06, Math.max(0, num / den)); let c = -1e9; for (const [u, gg] of S) c = Math.max(c, gg - b * u + 0.04);
  return { b, c, at: (u) => c + b * u };
}

export function mlkInterior(ctx, { ANG, floor, sGlass, frame, alu }) {
  const M = ctx.M; const K = new Kit(ctx, ANG);
  const colliders = [], walkables = [];
  const { u0, u1, v0, v1, nU, nV0, nV1, ceil } = MLK_IN; const fy = floor.at; const iu0 = u0 + 0.32, iu1 = -13.85, iv0 = v0 + 0.32, iv1 = v1 - 0.32;
  // ---- materials ----
  const conc = warmFill(tinted(M.whitePaint, 0xaeaaa2, { roughness: 0.32, metalness: 0.0 }), 0.24); // polished concrete: smooth, light grey
  const plaster = warmFill(tinted(M.whitePaint, 0xf4f2ee), 0.36); const ceilM = warmFill(tinted(M.whitePaint, 0xf6f4f0), 0.55);
  const walnut = warmFill(tone(M.wood, 0x8f5d38, TEXAVG.wood), 0.34);
  const ply = warmFill(tone(M.wood, 0xbf8a56, TEXAVG.wood), 0.36);
  const quartz = warmFill(tinted(M.whitePaint, 0xf1f1ee, { roughness: 0.3 }), 0.3);
  const white = warmFill(tinted(M.whitePaint, 0xf3f2ef), 0.3);
  const board = warmFill(tone(M.concrete, 0xa59e93, TEXAVG.concrete), 0.18);
  const chrome = tinted(M.iron, 0xd3d6d8, { metalness: 0.9, roughness: 0.22 });
  const black = tinted(M.blackPaint, 0x202020, { roughness: 0.5 });
  const steel = tinted(M.iron, 0xc2c6c9, { metalness: 0.85, roughness: 0.3 });
  const teal = warmFill(new THREE.MeshStandardMaterial({ color: 0x6f9599, roughness: 0.92 }), 0.2);
  const rugM = warmFill(new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 0.95 }), 0.18);
  const slate = warmFill(tinted(M.blackPaint, 0x3c4857, { roughness: 0.7 }), 0.18);
  const maple = warmFill(tone(M.wood, 0xd6bd92, TEXAVG.wood), 0.28);
  const caseGlass = tinted(M.glassLight, 0xc9dadd, { opacity: 0.22, depthWrite: false });
  const glow = glowMat(0xfff4e2, 0xffd9a8, 2.3), glowCool = glowMat(0xffffff, 0xfff1e0, 1.7);
  const vend = { asado: 0xa8432c, pi: 0x1f4f63, root: 0x4d7a3c };
  const mc = new Map(); const paint = (hex, k = 0.2) => { if (!mc.has(hex)) mc.set(hex, warmFill(tinted(M.whitePaint, hex, { roughness: 0.9 }), k)); return mc.get(hex); };
  // ---- floor (tilted plane) + ceiling ----
  const fpoly = [[iu0, iv0], [iu1, iv0], [iu1, nV0], [nU, nV0], [nU, nV1], [iu1, nV1], [iu1, iv1], [iu0, iv1]];
  { const pos = []; const tri = (a, b, c) => pos.push(a[0], fy(a[0]), a[1], b[0], fy(b[0]), b[1], c[0], fy(c[0]), c[1]);
    const q = (a0, b0, a1, b1) => { tri([a0, b0], [a0, b1], [a1, b1]); tri([a0, b0], [a1, b1], [a1, b0]); };
    for (let u = iu0; u < iu1 - 1e-6; u += (iu1 - iu0) / 6) for (let v = iv0; v < iv1 - 1e-6; v += (iv1 - iv0) / 12) q(u, v, Math.min(iu1, u + (iu1 - iu0) / 6), Math.min(iv1, v + (iv1 - iv0) / 12));
    q(iu1, nV0, nU, nV1);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); K.add(conc, g); }
  walkables.push(K.walkFn(iu0, iv0, nU, iv1, (u, v) => { if (u > iu1 && (v < nV0 || v > nV1)) return null; return fy(u) + 0.0; }));
  K.flat(ceilM, fpoly, ceil, [], true);
  // ---- north end: walnut slat feature wall; partition where the wing meets the main block ----
  K.box(walnut, iu0, fy(iu0) - 0.1, iv0, iu1, ceil, iv0 + 0.04);
  for (let u = iu0 + 0.05; u < iu1 - 0.05; u += 0.16) K.box(walnut, u, fy(u), iv0 + 0.04, u + 0.08, ceil - 0.02, iv0 + 0.12, { detail: true });
  // round white columns
  const colsUV = [[-20.4, -17.6], [-20.4, -8.6], [-20.4, 0.4], [-20.4, 9.4], [-20.4, 17.4]];
  for (const [u, v] of colsUV) { K.cyl(white, u, fy(u) - 0.05, v, 0.42, 0.42, ceil - fy(u) + 0.06, 20); colliders.push(K.colCyl(u, v, 0.46, -1, ceil)); }
  // ---- food court along the main block (counters face -u / west) ----
  const A = new Atlas(2048, 1024); const sg = [];
  const bays = [
    { key: 'asado', name: 'ASADO', sub: 'Mexican Grill', c: -19.0, items: ['Carne Asada Burrito', 'Al Pastor Tacos', 'Chicken Bowl', 'Veggie Quesadilla', 'Chips & Salsa'] },
    { key: 'pi', name: 'HOUSE OF PI', sub: 'Pizza by the Slice', c: -7.9, items: ['Cheese Slice', 'Pepperoni Slice', 'Margherita', 'BBQ Chicken', 'Garlic Knots'] },
    { key: 'root', name: 'ROOT 150', sub: 'Salads & Bowls', c: -1.6, items: ['Harvest Bowl', 'Kale Caesar', 'Poke Bowl', 'Falafel Plate', 'Fresh Juice'] },
  ];
  const FU = -16.25, BH = 3.35; // counter front line, bulkhead underside
  for (const b of bays) {
    const a0 = b.c - 2.9, a1 = b.c + 2.9; const col = vend[b.key]; const accent = '#' + new THREE.Color(col).getHexString();
    const vm = paint(col, 0.22);
    const yb = fy(FU);
    // back wall (tile-white), side partitions, bulkhead with the name, counter
    K.box(white, iu1 - 0.05, fy(iu1) - 0.1, a0, iu1, ceil, a1);
    for (const v of [a0, a1]) K.box(board, FU - 0.05, yb - 0.1, v - 0.08, iu1, ceil, v + 0.08);
    K.box(vm, FU - 0.15, BH, a0 - 0.08, iu1, ceil, a1 + 0.08);
    K.box(walnut, FU, yb - 0.05, a0 + 0.15, FU + 0.65, yb + 1.0, a1 - 0.15); K.box(quartz, FU - 0.06, yb + 1.0, a0 + 0.1, FU + 0.7, yb + 1.04, a1 - 0.1);
    K.box(caseGlass, FU + 0.1, yb + 1.34, a0 + 0.4, FU + 0.45, yb + 1.37, a1 - 0.4); for (const v of [a0 + 0.4, a1 - 0.43]) K.box(steel, FU + 0.1, yb + 1.04, v, FU + 0.13, yb + 1.37, v + 0.03);
    for (let v = a0 + 0.5; v < a1 - 0.6; v += 0.6) K.box(steel, FU + 0.12, yb + 1.0, v, FU + 0.5, yb + 1.08, v + 0.5); // food wells
    K.box(steel, iu1 - 0.7, fy(iu1), a0 + 0.3, iu1 - 0.05, fy(iu1) + 0.9, a1 - 0.3); // back counter
    if (b.key === 'pi') { K.box(steel, iu1 - 1.0, fy(iu1) + 0.9, b.c - 0.9, iu1 - 0.1, fy(iu1) + 1.75, b.c + 0.9); K.box(black, iu1 - 1.02, fy(iu1) + 1.1, b.c - 0.7, iu1 - 0.99, fy(iu1) + 1.5, b.c + 0.7); } // deck oven
    else if (b.key === 'asado') { K.box(black, iu1 - 0.75, fy(iu1) + 0.9, b.c - 1.2, iu1 - 0.1, fy(iu1) + 0.96, b.c + 0.6); K.box(steel, iu1 - 0.9, ceil - 1.4, b.c - 1.4, iu1 - 0.05, ceil - 1.0, b.c + 0.8); } // plancha + hood
    else { K.box(caseGlass, FU + 0.05, yb + 1.04, a0 + 0.4, FU + 0.6, yb + 1.5, a1 - 0.4); K.box(steel, iu1 - 0.6, fy(iu1) + 0.9, b.c + 0.8, iu1 - 0.1, fy(iu1) + 1.5, b.c + 1.6); }
    colliders.push(K.colPoly([[FU - 0.1, a0 - 0.1], [FU - 0.1, a1 + 0.1]], -1, 3));
    // menu boards on the back wall + name sign on the bulkhead
    const r1 = A.rect(560, 200, (c, w, h) => menuBoard(c, w, h, { title: b.sub.toUpperCase(), items: b.items, bg: '#17191c', accent }));
    sg.push(signQuad(r1, 2.5, 0.9, iu1 - 0.07, fy(iu1) + 2.55, b.c - 1.35, Math.PI)); 
    const r2 = A.rect(560, 200, (c, w, h) => menuBoard(c, w, h, { title: 'COMBOS & DRINKS', items: ['Meal Combo', 'Fountain Drink', 'Agua Fresca', 'Sparkling Water'], bg: '#17191c', accent }));
    sg.push(signQuad(r2, 2.5, 0.9, iu1 - 0.07, fy(iu1) + 2.55, b.c + 1.35, Math.PI));
    const r3 = A.rect(768, 128, (c, w, h) => { c.fillStyle = accent; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitText(c, b.name, w * 0.9, 84, 'bold', 'Georgia, serif'); c.fillText(b.name, w / 2, h / 2 + 3); });
    sg.push(signQuad(r3, 4.2, 0.7, FU - 0.17, (BH + ceil) / 2, b.c, Math.PI));
  }
  // between Asado and House of Pi: EATERIES sign wall, water + condiments station
  { const a0 = -16.1, a1 = -10.8; K.box(board, iu1 - 0.06, fy(iu1) - 0.1, a0, iu1, ceil, a1);
    const r = A.rect(768, 320, (c, w, h) => { c.fillStyle = '#e9e6df'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2a2a'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitText(c, 'EATERIES', w * 0.86, 170, '900', 'Georgia, serif'); c.fillText('EATERIES', w / 2, h * 0.42); c.font = '600 38px Helvetica Neue, Arial, sans-serif'; c.fillText('A T   S T U D E N T   U N I O N', w / 2, h * 0.8); });
    sg.push(signQuad(r, 4.2, 1.75, iu1 - 0.08, fy(iu1) + 2.75, (a0 + a1) / 2, Math.PI));
    K.box(walnut, iu1 - 0.65, fy(iu1), a0 + 0.6, iu1 - 0.06, fy(iu1) + 0.95, a1 - 0.6); K.box(quartz, iu1 - 0.68, fy(iu1) + 0.95, a0 + 0.55, iu1 - 0.06, fy(iu1) + 0.99, a1 - 0.55);
    colliders.push(K.colPoly([[iu1 - 0.7, a0 + 0.5], [iu1 - 0.7, a1 - 0.5]], -1, 2)); }
  // ---- Cal Student Store (lower level) storefront + shallow sales floor in the main block ----
  { const a0 = nV0, a1 = nV1, y0 = fy(iu1);
    K.box(plaster, iu1 - 0.06, y0 - 0.1, 1.45, iu1, ceil, a0 - 1.2); K.box(slate, iu1 - 0.06, y0 - 0.1, a0 - 1.2, iu1, ceil, a0); K.box(slate, iu1 - 0.06, 3.15, a0, iu1, ceil, a1);
    { const r = A.rect(900, 260, (c, w, h) => { c.fillStyle = '#f4f2ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#5d6168'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '600 46px Georgia, serif'; c.fillText('Associated Students of the', w / 2, h * 0.3); c.font = 'bold 76px Georgia, serif'; c.fillText('University of California', w / 2, h * 0.68); });
      sg.push(signQuad(r, 4.2, 1.2, iu1 - 0.08, y0 + 2.5, (1.45 + a0 - 1.2) / 2, Math.PI)); } K.box(slate, iu1 - 0.06, y0 - 0.1, a1, iu1, ceil, iv1);
    const r = A.rect(900, 200, (c, w, h) => { c.fillStyle = '#3c4857'; c.fillRect(0, 0, w, h); c.fillStyle = '#fdb515'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.font = 'italic bold 150px Georgia, serif'; c.fillText('Cal', 40, h * 0.52); c.font = 'bold 74px Georgia, serif'; c.fillText('STUDENT', 330, h * 0.3); c.fillText('STORE', 330, h * 0.76); });
    sg.push(signQuad(r, 4.6, 1.02, iu1 - 0.08, 3.85, (a0 + a1) / 2, Math.PI));
    // glazed storefront with a wide open entry in the middle
    const Rs = K.run([iu1, a1], [iu1, a0]); const L = a1 - a0; // faces -u... run from a1 to a0 has outward normal -u
    glassBand(K, Rs, 0, 2.6, y0, 3.15, { glass: caseGlass, frame: alu, pitch: 1.3 }); glassBand(K, Rs, L - 2.6, L, y0, 3.15, { glass: caseGlass, frame: alu, pitch: 1.3 });
    // niche: floor shared (tilted), walls, ceiling, merchandise
    K.box(maple, nU, fy(nU) - 0.1, a0, nU + 0.05, ceil, a1); K.box(white, iu1, fy(iu1) - 0.1, a0, nU, ceil, a0 + 0.05); K.box(white, iu1, fy(iu1) - 0.1, a1 - 0.05, nU, ceil, a1);
    colliders.push(K.colPoly([[iu1, a0], [nU + 0.05, a0]], -1, ceil), K.colPoly([[nU + 0.05, a0], [nU + 0.05, a1]], -1, ceil), K.colPoly([[nU + 0.05, a1], [iu1, a1]], -1, ceil), K.colPoly([[iu1 + 0.02, a0], [iu1 + 0.02, a0 + 2.6]], -1, 3.2), K.colPoly([[iu1 + 0.02, a1 - 2.6], [iu1 + 0.02, a1]], -1, 3.2));
    // slatwall towers with caps (navy/gold), apparel rails, jersey wall
    const capN = paint(0x0b2a55), capG = paint(0xf4b324, 0.25);
    for (const vt of [a0 + 1.6, a1 - 1.6]) { const ut = nU - 0.9; K.box(maple, ut - 0.3, fy(ut), vt - 0.3, ut + 0.3, fy(ut) + 2.1, vt + 0.3); colliders.push(K.colCyl(ut, vt, 0.45, -1, 3));
      for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { const y = fy(ut) + 0.55 + k * 0.32; for (let j = 0; j < 2; j++) K.box((k + j) % 2 ? capG : capN, ut + s * 0.3 + (s > 0 ? 0 : -0.14), y, vt - 0.22 + j * 0.24, ut + s * 0.3 + (s > 0 ? 0.14 : 0), y + 0.12, vt - 0.06 + j * 0.24, { detail: true }); } }
    const tees = [0x0b2a55, 0xf4b324, 0xffffff, 0x1d1d1d, 0x5a6b7c, 0x0b2a55];
    for (const vr of [12.55, 15.95]) { const ua = -13.25, ub = -11.65; // apparel rails along the depth, central aisle left open
      for (const u of [ua, ub - 0.04]) K.box(chrome, u, fy(u), vr - 0.02, u + 0.04, fy(u) + 1.4, vr + 0.02); K.box(chrome, ua, fy(ua) + 1.38, vr - 0.015, ub, fy(ua) + 1.41, vr + 0.015);
      for (let j = 0; j < 9; j++) { const u = ua + 0.12 + j * 0.16; const tm = paint(tees[(j + (vr > 14 ? 1 : 0)) % tees.length]); K.box(tm, u, fy(u) + 0.62, vr - 0.26, u + 0.04, fy(u) + 1.36, vr + 0.26, { detail: true }); }
      colliders.push(K.colPoly([[ua - 0.05, vr - 0.3], [ub + 0.05, vr - 0.3], [ub + 0.05, vr + 0.3], [ua - 0.05, vr + 0.3]], -1, 1.5)); }
    for (let j = 0; j < 6; j++) { const tm = paint(j % 2 ? 0xf4b324 : 0x0b2a55); K.box(tm, nU - 0.06, fy(nU) + 1.5, a0 + 1.2 + j * 1.2, nU - 0.02, fy(nU) + 2.3, a0 + 1.9 + j * 1.2, { detail: true }); }
    for (const v of [a0 + 2.0, (a0 + a1) / 2, a1 - 2.0]) K.box(glowCool, nU + 0.3, ceil - 0.12, v - 1.2, nU + 0.42, ceil - 0.08, v + 1.2); }
  // ---- window bar along the Lower Sproul glass (skip the doors) ----
  const doorsV = [[-13.8, -11.2], [4.2, 6.8]];
  const ledges = [[-25.3, -14.3], [-10.7, 3.7], [7.3, 21.4]];
  for (const [a, b] of ledges) { const u = iu0 + 0.05; K.box(walnut, u, fy(u) + 1.02, a, u + 0.45, fy(u) + 1.07, b); for (let v = a + 0.4; v < b; v += 2.0) K.box(chrome, u + 0.18, fy(u), v, u + 0.22, fy(u) + 1.02, v + 0.04); colliders.push(K.colPoly([[u + 0.5, a], [u + 0.5, b]], -1, 1.1)); }
  // ---- furniture ----
  const lib = furnitureLib(); const I = new Instancer(lib, ctx.boxUV); const pools = [];
  const near = (u, v, r) => colsUV.some(([cu, cv]) => Math.hypot(u - cu, v - cv) < r) || doorsV.some(([a, b]) => v > a - 0.9 && v < b + 0.9 && u < -17.5);
  const tbl = (u, v) => { I.add('roundTable', u, fy(u), v, 0); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const cu = u + Math.cos(a) * 0.66, cv = v + Math.sin(a) * 0.66; I.addFacing('shellChair', cu, fy(cu), cv, u, v); } colliders.push(K.colCyl(u, v, 0.45, -1, 1)); pools.push([u, fy(u) + 0.75, v, 0.65], [u, fy(u), v, 1.6]); };
  for (const u of [-22.5, -18.3]) for (let v = -24.2; v < 2.2; v += 2.25) if (!near(u, v, 1.75)) tbl(u, v);
  for (const [a, b] of ledges) for (let v = a + 0.45; v < b - 0.2; v += 0.85) { const u = iu0 + 0.85; I.add('barStool', u, fy(u), v, 0); }
  // living room: lounge clusters on rugs
  for (const [u, v] of [[-22.6, 12.2], [-22.6, 18.6], [-17.6, 15.2]]) {
    K.box(rugM, u - 1.6, fy(u - 1.6) + 0.005, v - 1.6, u + 1.6, fy(u + 1.6) + 0.012, v + 1.6);
    I.add('cubeTable', u, fy(u) + 0.012, v, 0);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const cu = u + Math.cos(a) * 1.0, cv = v + Math.sin(a) * 1.0; I.addFacing('lounge', cu, fy(cu) + 0.012, cv, u, v); }
    colliders.push(K.colCyl(u, v, 1.35, -1, 1)); pools.push([u, fy(u) + 0.02, v, 2.2]);
  }
  I.add('binStation', -15.3, fy(-15.3), 2.6, Math.PI / 2); colliders.push(K.colCyl(-15.3, 2.6, 0.6, -1, 1.2));
  // ---- light fixtures: linear pendants over the dining room, downlights elsewhere ----
  for (const u of [-22.5, -18.3]) for (let v = -24.0; v < 1.5; v += 4.5) { K.box(black, u - 0.06, 3.55, v - 1.4, u + 0.06, 3.6, v + 1.4); K.box(glow, u - 0.05, 3.535, v - 1.38, u + 0.05, 3.55, v + 1.38); for (const dv of [-1.2, 1.2]) K.box(black, u - 0.004, 3.6, v + dv - 0.004, u + 0.004, ceil, v + dv + 0.004, { detail: true }); }
  for (let u = -24.0; u < -15; u += 2.6) for (let v = 3.0; v < 21.5; v += 2.6) K.cyl(glowCool, u, ceil - 0.03, v, 0.1, 0.1, 0.03, 10);
  for (const b of bays) { K.box(glowCool, FU + 0.2, BH - 0.04, b.c - 2.4, FU + 0.35, BH - 0.01, b.c + 2.4); pools.push([FU + 0.3, fy(FU) + 1.04, b.c, 1.6], [FU - 1.0, fy(FU - 1.0), b.c, 2.2]); }
  for (let v = -24.5; v < 21; v += 3.0) pools.push([iu0 + 0.3, fy(iu0) + 1.07, v, 0.8]);
  // ---- signage atlas ----
  const tex = A.texture(); const atlasM = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.75, roughness: 0.55 });
  for (const q of sg) K.add(atlasM, q, { uvMode: 'keep' });
  // ---- assemble ----
  const fit = K.finish(); fit.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  const furn = new THREE.Group(); furn.rotation.y = -ANG;
  const tris = I.build(furn, { seat: ply, metal: chrome, top: white, white, fabric: teal, dark: black, barStool: { seat: walnut, metal: chrome } });
  const pm = lightPools(pools, { color: 0xffc98e, opacity: 0.4 }); furn.add(pm);
  const root = new THREE.Group(); root.name = 'mlk-interior'; root.add(fit, furn);
  const [cx, cz] = K.xz(-19.5, -2); 
  const update = gate({ group: root, centre: [ctx.anchor.x + cx, ctx.anchor.z + cz], showR: 170, glow: [glow, glowCool, atlasM], fills: [conc, plaster, ceilM, walnut, ply, quartz, white, board, teal, rugM, slate, maple, ...mc.values()], pools: [pm] });
  return { object3d: root, colliders, walkables, update, stats: { furniture: I.count(), furnTris: tris } };
}
