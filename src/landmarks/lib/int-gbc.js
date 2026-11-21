// Golden Bear Café interior (interiors-cafe branch): the dining room behind the Upper Sproul glass, under the
// exposed concrete umbrella soffits, plus patio furniture. Built in the café module's building frame (u east-ish,
// v south-ish, y up; FL = café floor). Fixed fit-out goes through its own Kit (merged per material); furniture is
// instanced; menus/signs share one canvas atlas; warm light is emissive fixtures + additive pools (no real lights).
import * as THREE from 'three';
import { Kit } from './classic-kit.js';
import { ribbon, tinted, tone, TEXAVG } from './b01-kit.js';
import { furnitureLib, Instancer, Atlas, signQuad, menuBoard, fitText, lightPools, glowMat, warmFill, gate, furnMat, sidePred } from './int-kit.js';

function tileTexture() { // white subway tile, 7.5 x 15 cm, for the service-line backsplash (box UVs: 1 repeat = 2 m)
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#c9c6bf'; g.fillRect(0, 0, 512, 512);
  const tw = 512 / 13.33, th = 512 / 26.67;
  for (let r = 0; r < 27; r++) for (let k = -1; k < 14; k++) { const x = k * tw + (r % 2) * tw / 2, y = r * th; const l = 238 + ((r * 7 + k * 13) % 9); g.fillStyle = `rgb(${l},${l},${l - 3})`; g.fillRect(x + 1.2, y + 1.2, tw - 2.4, th - 2.4); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function cafeInterior(ctx, { ANG, F, FL, uK, TH, frame }) {
  const M = ctx.M; const K = new Kit(ctx, ANG); const g = (u, v) => K.g(u, v);
  const colliders = [], walkables = []; const fillsExtra = [];
  const F0 = FL + 0.02; // finished floor
  // ---- materials ----
  const floorM = warmFill(tone(M.concrete, 0x9a948a, TEXAVG.concrete, { roughness: 0.55 }), 0.32);
  const plaster = warmFill(tone(M.stucco, 0xf1ebdf, TEXAVG.stucco), 0.42);
  const tile = warmFill(new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.25, metalness: 0.0 }), 0.28);
  const navy = warmFill(tinted(M.calBlue, 0x1d2a3c, { roughness: 0.6 }), 0.2);
  const oak = warmFill(tone(M.wood, 0xb27c4c, TEXAVG.wood), 0.3);
  const oakDark = warmFill(tone(M.wood, 0x6e4a2e, TEXAVG.wood), 0.24);
  const quartz = warmFill(tinted(M.whitePaint, 0xf2f0eb, { roughness: 0.3 }), 0.28);
  const steel = tinted(M.iron, 0xc4c8cb, { metalness: 0.85, roughness: 0.3 });
  const black = tinted(M.blackPaint, 0x1c1c1d, { roughness: 0.5 });
  const colW = quartz;
  const caseGlass = tinted(M.glassLight, 0xc9dadd, { opacity: 0.22, depthWrite: false });
  const glow = glowMat(0xfff4e0, 0xffd7a0, 2.4), glowCool = glow;
  const pastry = oak;
  const leaf = warmFill(new THREE.MeshStandardMaterial({ color: 0x4f8a3e, roughness: 0.75, flatShading: true }), 0.25); const pot = black;
  // ---- room geometry ----
  const room = [[uK, -5.83], [41.3, -5.83], [41.3, -9.15], [42.0, -9.15], [42.0, 10.15], [38.1, 10.15], [38.1, 12.5], [uK, 12.5]];
  K.flat(floorM, room, F0); walkables.push(K.walkPoly(room, F0));
  const soffit = (u, v) => { // umbrella soffit height; across the slots between units take the higher neighbour so walls close up
    let h = F.top(u, v); if (h == null) for (const [du, dv] of [[0, 0.16], [0, -0.16], [0.16, 0], [-0.16, 0], [0.16, 0.16], [-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16]]) { const t = F.top(u + du, v + dv); if (t != null) h = Math.max(h ?? -1e9, t); }
    return h == null ? 10.4 : h - TH - 0.03; };
  // kitchen / service-line wall (faces +u): tile, navy menu band, plaster to the umbrella soffit (aisle: to its ceiling)
  K.box(tile, uK, FL, -5.83, uK + 0.05, FL + 2.4, 12.5);
  K.box(navy, uK, FL + 2.4, -5.83, uK + 0.05, FL + 4.0, 7.8);
  K.box(plaster, uK, FL + 2.4, 7.8, uK + 0.05, 9.85, 12.5);
  { const pts = []; for (let v = -5.83; v <= 7.8 + 1e-6; v += (7.8 + 5.83) / 40) pts.push([uK + 0.05, v]); // the wall stands in the slot between umbrella strips: close it up to the rims
    const rim = (u, v) => { let h = -1e9; for (const du of [-0.18, 0.18]) for (const dv of [0, 0.15, -0.15]) { const t = F.top(u + du, v + dv); if (t != null) h = Math.max(h, t); } return h > 0 ? h + 0.18 : 10.4; };
    ribbon(K, plaster, pts, rim, () => FL + 4.0, [1, 0, 0]); }
  colliders.push(K.colPoly([[uK + 0.05, 7.6], [uK + 0.05, 12.5]], FL - 1, FL + 4));
  // high-room south edge (v = 7.8) and its step at u = 39.7: glazed clerestory above the aisle roof up to the soffits
  { const pts = []; for (let u = uK; u <= 39.7 + 1e-6; u += (39.7 - uK) / 16) pts.push([u, 7.8]);
    ribbon(K, caseGlass, pts, (u, v) => soffit(u, v), () => 11.15, [0, 0, -1]);
    const p2 = []; for (let v = 7.8; v <= 10.15 + 1e-6; v += 0.6) p2.push([39.7, Math.min(v, 10.15)]);
    ribbon(K, caseGlass, p2, (u, v) => soffit(u, v), () => 11.15, [1, 0, 0]); }
  K.box(plaster, uK, 9.85, 7.8, 39.7, 10.05, 10.42); // aisle roof between the high room and the south wing roof
  // inner faces of the precast south walls (hide the slot backing) — and close the band up to the clerestory sill
  K.box(plaster, uK, FL, 12.13, 38.1 - 0.31, 9.85, 12.19);
  K.box(plaster, 38.1 + 0.31, FL, 9.78, 42.0 - 0.2, 10.45, 9.84);
  K.box(plaster, 38.1 + 0.25, FL, 9.84, 38.1 + 0.31, 9.85, 12.5); // short return at the aisle's east stub
  // round umbrella columns inside the room (strip u 32.05-39.7: centres v -3.57 / 4.14)
  const cols = F.units.filter((q) => q.cu > uK + 0.5 && q.cu < 41.5 && q.cv > -5.5 && q.cv < 10);
  for (const q of cols) { const yc = q.yTop - q.depth - 0.4; K.cyl(colW, q.cu, FL, q.cv, 0.3, 0.3, yc - FL + 0.05, 16); K.cyl(colW, q.cu, yc - 0.18, q.cv, 0.3, 0.4, 0.2, 16); colliders.push(K.colCyl(q.cu, q.cv, 0.36, FL - 1, yc)); }
  // painted soffit lining under the umbrellas over the room (reads as the white folded concrete ceiling), and the
  // glazed skylight slots between umbrella units
  { const soffA = warmFill(tinted(M.whitePaint, 0xf4f2ed), 0.2), soffB = warmFill(tinted(M.whitePaint, 0xd2ccc0), 0.12); const pA = [], pB = []; const gp = 0.11;
    for (const q of F.units) {
      if (q.u1 < uK + 0.2 || q.u0 > 42.0 || q.v1 < -6 || q.v0 > 10.2) continue;
      const a0 = q.u0 + gp, a1 = q.u1 - gp, b0 = q.v0 + gp, b1 = q.v1 - gp, t = TH + 0.012, tc = 0.412;
      const yT = q.yTop - t, yM = q.yTop - q.dip - t, yO = q.yTop - q.depth - tc;
      const NW = [a0, yT, b0], NE = [a1, yT, b0], SE = [a1, yT, b1], SW = [a0, yT, b1], Em = [a1, yM, q.cv], Wm = [a0, yM, q.cv], O = [q.cu, yO, q.cv];
      [[NW, NE], [NE, Em], [Em, SE], [SE, SW], [SW, Wm], [Wm, NW]].forEach(([p1, p2], k) => (k % 3 ? pB : pA).push([p1, p2, O])); // unitTris winding faces down; folded E/W facets darker
    }
    for (const [mat, polys] of [[soffA, pA], [soffB, pB]]) { const geo = new THREE.BufferGeometry(); const pos = []; for (const P of polys) pos.push(...P[0], ...P[1], ...P[2]); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals(); K.add(mat, geo); }
    fillsExtra.push(soffA, soffB); }
  // aisle ceiling downlights
  for (let u = 32.6; u < 38; u += 1.8) for (const v of [9.0, 11.3]) K.cyl(glowCool, u, 9.82, v, 0.09, 0.09, 0.03, 10);

  // ---- service line ----
  const cv0 = -5.6, cv1 = 7.4, cu0 = 33.5, cu1 = 34.2; // counter (customers on +u side)
  K.box(oakDark, cu0, FL, cv0, cu1 - 0.06, FL + 0.9, cv1);
  for (let v = cv0 + 0.06; v < cv1 - 0.02; v += 0.11) K.box(oak, cu1 - 0.06, FL + 0.12, v, cu1, FL + 0.9, v + 0.07); // vertical oak battens
  K.box(black, cu1 - 0.12, FL, cv0, cu1 - 0.05, FL + 0.12, cv1); // recessed toe kick
  K.box(quartz, cu0 - 0.08, FL + 0.9, cv0 - 0.05, cu1 + 0.1, FL + 0.95, cv1 + 0.05);
  K.box(oakDark, cu0 - 0.6, FL, cv1 - 0.05, cu1, FL + 0.95, cv1 + 0.05); // end return
  colliders.push(K.colPoly([[cu1 + 0.08, -5.83], [cu1 + 0.08, cv1 + 0.1], [uK, cv1 + 0.1]], FL - 1, FL + 3));
  // back counter + equipment along the tiled wall
  K.box(steel, uK + 0.05, FL, cv0, uK + 0.75, FL + 0.9, cv1); K.box(steel, uK + 0.05, FL + 0.9, cv0, uK + 0.78, FL + 0.93, cv1);
  const eq = (v0, v1, h, d = 0.6, mat = steel) => K.box(mat, uK + 0.1, FL + 0.93, v0, uK + 0.1 + d, FL + 0.93 + h, v1);
  eq(5.0, 5.9, 0.5, 0.6); K.box(black, uK + 0.62, FL + 1.08, 5.1, uK + 0.71, FL + 1.38, 5.8); eq(6.1, 6.45, 0.62, 0.35, black); eq(6.6, 7.2, 0.7, 0.45); // espresso machine, grinder, brewer
  eq(1.4, 3.6, 0.06, 0.65, black); K.box(steel, uK + 0.05, FL + 2.0, 1.2, uK + 0.85, FL + 2.45, 3.8); // flat-top griddle + hood
  eq(-2.0, -0.4, 0.38, 0.55); eq(-0.2, 0.6, 0.5, 0.5, black); eq(-4.6, -3.2, 0.55, 0.6); // prep fridge, soda tower, toaster oven
  // sneeze guard over the deli/bowl station, pastry case at the north end, registers
  K.box(caseGlass, cu0 + 0.2, FL + 1.3, -2.6, cu0 + 0.62, FL + 1.33, 1.0); K.box(steel, cu0 + 0.18, FL + 0.95, -2.6, cu0 + 0.22, FL + 1.33, -2.56); K.box(steel, cu0 + 0.18, FL + 0.95, 0.96, cu0 + 0.22, FL + 1.33, 1.0);
  for (let v = -2.4; v < 0.9; v += 0.55) K.box(steel, cu0 + 0.05, FL + 0.93, v, cu0 + 0.55, FL + 1.0, v + 0.45); // hotel pans
  K.box(caseGlass, cu0 + 0.02, FL + 0.95, -5.4, cu1 + 0.05, FL + 1.55, -3.0); K.box(black, cu0, FL + 1.53, -5.42, cu1 + 0.07, FL + 1.58, -2.98);
  for (const y of [FL + 1.05, FL + 1.3]) { K.box(glow, cu0 + 0.1, y, -5.3, cu1 - 0.05, y + 0.012, -3.1); for (let v = -5.2; v < -3.2; v += 0.24) K.box(pastry, cu0 + 0.25 + ((v * 7) % 0.2), y + 0.012, v, cu0 + 0.43 + ((v * 7) % 0.2), y + 0.07, v + 0.16); }
  for (const v of [-1.2, 3.9]) { K.box(black, cu0 + 0.3, FL + 0.95, v, cu0 + 0.55, FL + 1.0, v + 0.35); K.obox(black, cu0 + 0.52, FL + 1.15, v + 0.175, 0.03, 0.26, 0.34, 0); }

  // ---- grab & go cooler on the aisle wall ----
  const gu0 = 32.3, gu1 = 37.7, gv1 = 12.13, gv0 = 11.4;
  K.box(black, gu0, FL, gv1 - 0.05, gu1, FL + 2.1, gv1); // back panel (open front faces the room, -v)
  K.box(black, gu0, FL, gv0 + 0.05, gu1, FL + 0.3, gv1); K.box(black, gu0, FL + 1.95, gv0 + 0.05, gu1, FL + 2.1, gv1);
  for (const u of [gu0, (gu0 + gu1) / 2, gu1 - 0.05]) K.box(black, u, FL, gv0, u + 0.05, FL + 2.1, gv1);
  for (let k = 0; k < 4; k++) { const y = FL + 0.55 + k * 0.36; K.box(glowCool, gu0 + 0.05, y, gv0 + 0.1, gu1 - 0.05, y + 0.015, gv1); }
  colliders.push(K.colPoly([[gu0, gv0 - 0.05], [gu1, gv0 - 0.05], [gu1, gv1], [gu0, gv1]], FL - 1, FL + 2.2));
  // ---- window counter along the front glass ----
  const ledges = [[-5.5, 0.9], [4.7, 9.75]];
  for (const [a, b] of ledges) { K.box(oak, 41.2, FL + 1.0, a, 41.72, FL + 1.05, b); for (let v = a + 0.3; v < b; v += 1.8) K.box(black, 41.62, FL, v, 41.68, FL + 1.0, v + 0.05); colliders.push(K.colPoly([[41.15, a], [41.15, b]], FL - 1, FL + 1.05)); }
  // potted plants in the north alcove and by the entrance
  for (const [u, v, s] of [[41.6, -8.6, 1.0], [41.55, -6.3, 0.8]]) {
    K.lathe(pot, [[0.18, 0], [0.26, 0.05], [0.28, 0.5], [0.001, 0.5]], u, F0, v, 12);
    const fg = new THREE.IcosahedronGeometry(0.42 * s, 1); fg.scale(1, 1.5, 1); fg.translate(u, F0 + 0.5 + 0.6 * s, v); K.add(leaf, fg);
    colliders.push(K.colCyl(u, v, 0.35, FL - 1, FL + 1.5));
  }

  // ---- menu boards + signage (one atlas) ----
  const A = new Atlas(2048, 1024); const sg = []; const face = 0; // boards face +u
  const boards = [
    { v: -4.15, title: 'BAKERY & BREAKFAST', items: ['Breakfast Burrito', 'Bagel & Schmear', 'Blueberry Muffin', 'Croissant', 'Fruit Cup'] },
    { v: -0.9, title: 'DELI & BOWLS', items: ['Turkey Pesto Panini', 'Chicken Caesar Wrap', 'Teriyaki Bowl', 'Falafel Bowl', 'Soup of the Day'] },
    { v: 2.4, title: 'GRILL', items: ['Golden Bear Burger', 'Crispy Chicken Sandwich', 'Veggie Burger', 'Garlic Fries', 'Bulgogi Fries'] },
    { v: 5.65, title: 'COFFEE & ESPRESSO', items: ['Drip Coffee', 'Latte', 'Cappuccino', 'Cold Brew', 'Chai Latte', 'Matcha Latte'] },
  ];
  for (const b of boards) { const r = A.rect(640, 216, (c, w, h) => menuBoard(c, w, h, { title: b.title, items: b.items, bg: '#16202d', accent: '#fdb515' })); sg.push(signQuad(r, 2.75, 0.93, uK + 0.07, FL + 2.97, b.v, face)); }
  { const r = A.rect(1024, 96, (c, w, h) => { c.fillStyle = '#1d2a3c'; c.fillRect(0, 0, w, h); c.fillStyle = '#fdb515'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitText(c, 'THE  GOLDEN  BEAR  CAFÉ', w * 0.92, 64, 'bold', 'Georgia, serif'); c.fillText('THE  GOLDEN  BEAR  CAFÉ', w / 2, h / 2 + 2); });
    sg.push(signQuad(r, 5.4, 0.48, uK + 0.07, FL + 3.72, 0.75, face)); }
  { const r = A.rect(512, 96, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#fdb515'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitText(c, 'GRAB & GO', w * 0.85, 64); c.fillText('GRAB & GO', w / 2, h / 2 + 2); });
    sg.push(signQuad(r, 2.2, 0.4, (gu0 + gu1) / 2, FL + 2.35, gv0 - 0.02, -Math.PI / 2)); }
  // cooler product facings (bottles, sandwiches, salads) on each shelf
  { const r = A.rect(1024, 128, (c, w, h) => { c.fillStyle = '#20252a'; c.fillRect(0, 0, w, h); const cols = ['#e9412e', '#f6c343', '#3a8d3f', '#ffffff', '#2c6db5', '#f08a24', '#8e3b8f', '#d8e8c8'];
      for (let x = 4, k = 0; x < w - 20; k++) { const bw = 14 + ((k * 7) % 4) * 6, bh = 60 + ((k * 13) % 5) * 12; c.fillStyle = cols[(k * 5) % cols.length]; c.fillRect(x, h - bh - 4, bw, bh); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x + 2, h - bh, 3, bh - 10); x += bw + 4; } });
    for (let k = 0; k < 4; k++) { const y = FL + 0.55 + k * 0.36; sg.push(signQuad(r, gu1 - gu0 - 0.15, 0.3, (gu0 + gu1) / 2, y + 0.17, gv0 + 0.4, -Math.PI / 2)); } }
  const atlasTex = A.texture();
  const atlasM = new THREE.MeshStandardMaterial({ map: atlasTex, emissiveMap: atlasTex, emissive: 0xffffff, emissiveIntensity: 0.75, roughness: 0.55 });
  for (const q of sg) K.add(atlasM, q, { uvMode: 'keep' });

  // ---- furniture ----
  const lib = furnitureLib(); lib.patioChair = { seat: lib.bistroChair.seat, metal: lib.bistroChair.metal };
  const I = new Instancer(lib, ctx.boxUV); const pools = [], pendants = [];
  const four = (u, v, n = 4) => { I.add('squareTable', u, F0, v, 0); const o = [[0.66, 0], [-0.66, 0], [0, 0.66], [0, -0.66]]; for (let k = 0; k < n; k++) I.addFacing('bistroChair', u + o[k][0], F0, v + o[k][1], u, v); colliders.push(K.colCyl(u, v, 0.5, FL - 1, FL + 1)); pendants.push([u, v]); };
  four(37.1, -4.3); four(39.6, -4.3); four(37.1, -1.2, 3); four(39.6, -1.2); four(37.3, 6.1); four(39.7, 6.1, 3); four(34.9, 9.2, 2);
  { const u = 38.3, v = 8.75; I.add('longTable', u, F0, v, 0); for (const s of [-0.85, 0, 0.85]) for (const sd of [-1, 1]) I.addFacing('bistroChair', u + s, F0, v + sd * 0.72, u + s, v); colliders.push(K.colPoly([[u - 1.25, v - 0.5], [u + 1.25, v - 0.5], [u + 1.25, v + 0.5], [u - 1.25, v + 0.5]], FL - 1, FL + 0.8)); pendants.push([u - 0.8, v], [u + 0.8, v]); }
  for (const [a, b] of ledges) for (let v = a + 0.45; v < b - 0.2; v += 0.82) I.add('barStool', 40.85, F0, v, 0);
  I.add('binStation', 35.0, F0, 7.75, -Math.PI / 2);
  // patio: tables under the existing parasols (north patio over the creek, SE terrace) + café-front podium
  const patio = [[41.4, -11.6], [44.6, -11.9], [47.8, -11.3], [42.8, -14.8], [46.4, -15.2], [45.6, -8.7], [47.6, -5.3], [45.9, -4.2]];
  const terrace = [[30, 17], [34.5, 18.5], [39, 16.5], [42.5, 19]];
  for (const [u, v] of patio.concat(terrace)) { const y = (v > 12.4 ? FL - 0.02 : FL - 0.03) + 0.0; I.add('patioTable', u, y, v, 0); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; I.addFacing('patioChair', u + Math.cos(a) * 0.68, y, v + Math.sin(a) * 0.68, u, v); } colliders.push(K.colCyl(u, v, 0.45, FL - 1, FL + 1)); }
  // ---- pendant lights + pools ----
  const lampG = new THREE.Group();
  for (const [u, v] of pendants) { K.lathe(glow, [[0.001, -0.16], [0.12, -0.12], [0.165, 0], [0.12, 0.12], [0.03, 0.17]], u, FL + 2.75, v, 12); const top = soffit(u, v); K.box(black, u - 0.006, FL + 2.9, v - 0.006, u + 0.006, top, v + 0.006); pools.push([u, F0 + 0.75, v, 0.75], [u, F0, v, 1.7]); }
  for (const v of [-3.6, -0.3, 3.0, 6.2]) { K.box(black, 33.73, FL + 2.3, v - 1.12, 33.92, FL + 2.36, v + 1.12); K.box(glow, 33.75, FL + 2.285, v - 1.1, 33.9, FL + 2.3, v + 1.1); for (const dv of [-0.9, 0.9]) K.box(black, 33.82, FL + 2.36, v + dv - 0.004, 33.83, soffit(33.8, v + dv), v + dv + 0.004); pools.push([33.85, FL + 0.95, v, 1.15], [35.0, F0, v, 1.6]); }
  for (let u = 32.6; u < 38; u += 1.8) for (const v of [9.0, 11.3]) pools.push([u, F0, v, 1.1]);
  for (const v of [-4.5, -2.2, 0.0, 6.0, 8.2]) pools.push([41.45, FL + 1.05, v, 0.7]);
  // ---- assemble ----
  const fit = K.finish(); fit.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  const furn = new THREE.Group(); furn.rotation.y = -ANG; const fm = furnMat();
  const tris = I.buildVC(furn, fm, { seat: 0xb07a48, metal: 0x1e1e1f, top: 0xa8743f, white: 0xeeeeea, dark: 0x262626, patioChair: { seat: 0x24272a, metal: 0x24272a }, patioTable: { top: 0x24272a, metal: 0x24272a } });
  const pm = lightPools(pools, { color: 0xffc88a, opacity: 0.5 }); furn.add(pm);
  const root = new THREE.Group(); root.name = 'gbc-interior'; root.add(fit, furn);
  const [cx, cz] = K.xz(37, 2);
  const update = gate({ group: root, centre: [ctx.anchor.x + cx, ctx.anchor.z + cz], showR: 170, side: sidePred(ctx.anchor, ANG, (u, v) => u > 29 || v < -7 || v > 13), glow: [glow, glowCool, atlasM], fills: [floorM, plaster, tile, navy, oak, oakDark, quartz, ...fillsExtra], pools: [pm] });
  return { object3d: root, colliders, walkables, update, stats: { furniture: I.count(), furnTris: tris } };
}
