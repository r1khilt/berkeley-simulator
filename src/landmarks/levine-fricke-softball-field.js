// Levine-Fricke Field: home of Cal Softball, in Strawberry Canyon beside Witter Rugby Field and the canyon pool.
// Home plate sits at the south apex of the OSM fan with the outfield opening north toward the wooded canyon wall.
// All-dirt softball infield and grass outfield painted on canvas, navy padded outfield wall with a gold cap and
// distance markers, yellow foul poles, black backstop netting, field-level dugouts, a concrete grandstand of blue
// chairback seats behind home with a press box, a video scoreboard in left-centre and steel light poles.
import * as THREE from 'three';
import { Kit, sportsMats, fieldsMats, fieldTexture, paintGrass, surfaceMat, drapePoly, fence, netWall, lightTower, scoreboard, signTex, signPanel, deg, pad, flagPole } from './lib/fields-kit.js';
import { paintDiamond, dugout, concreteStand } from './lib/b11-sports.js';

export const info = {
  id: 'levine-fricke-softball-field',
  name: 'Levine-Fricke Field',
  subtitle: 'Cal Softball · Strawberry Canyon',
  blurb: 'The home field of Cal Softball, tucked into Strawberry Canyon between Witter Rugby Field and the Strawberry Canyon pool.',
  replaces: ['w/69020840'],
};

export async function build(ctx) {
  const { M } = ctx; const S = sportsMats(M); const F = fieldsMats(M);
  const ang = deg(-78.5); const K = new Kit(ctx, ang);
  const colliders = [], walkables = [];
  const fp = ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z));
  const [hu, hv] = K.uv(-6.4, 33.4);
  const lv = []; for (let a = -40; a <= 40; a += 10) for (const d of [15, 30, 45]) lv.push(K.g(hu + Math.cos(deg(a)) * d, hv + Math.sin(deg(a)) * d)); lv.sort((a, b) => a - b);
  const yF = lv[Math.floor(lv.length / 2)]; const Y = (u, v) => Math.max(K.g(u, v), yF - 0.3) + 0.06;
  // outfield fence: footprint vertices > 45 m from home, pulled 1 m in, plus the foul-line ends
  const far = fp.map(([u, v]) => ({ u, v, d: Math.hypot(u - hu, v - hv), a: Math.atan2(v - hv, u - hu) })).filter((p) => p.d > 45).sort((p, q) => p.a - q.a);
  const fenceLine = far.map((p) => { const k = (p.d - 1.2) / p.d; return [hu + (p.u - hu) * k, hv + (p.v - hv) * k]; });
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const [u, v] of fp) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  u0 -= 14; const LU = u1 - u0 + 2, LV = v1 - v0 + 2, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2; const toF = (u, v) => [u - cu, v - cv];
  const tex = fieldTexture(LU, LV, (P) => {
    paintGrass(P, { col: '#4d8a3a', alt: '#579643', stripe: 4.5, seed: 41, blotch: 0.6, angle: deg(45) });
    paintDiamond(P, { home: toF(hu, hv), dir: 0, softball: true, base: 18.29, rubber: 13.11, arcR: 18.29, fence: fenceLine.map(([u, v]) => toF(u, v)), track: 3.0, dirt: '#c0794e', dirtDark: '#b06d45', lineTo: 70, homeR: 3.5 });
    // dirt foul territory behind home and along the lines
    const c = P.c; c.save(); c.fillStyle = '#c0794e'; const H = toF(hu, hv);
    c.beginPath(); c.arc(P.X(H[0]), P.Y(H[1]), 9.5 * P.s, Math.PI * 0.5, Math.PI * 1.5); c.fill(); c.restore();
  }, { pxm: 16 });
  const fm = surfaceMat(tex, { rough: 0.95 });
  drapePoly(K, fm, fp, { maxEdge: 2.5, yFn: Y, uvFn: (u, v) => [(u - cu + LU / 2) / LU, 1 - (v - cv + LV / 2) / LV] });
  // pitcher's circle rubber + raised home plate area are painted; add bases as small solids
  for (const [a, b] of [[18.29 / Math.SQRT2, -18.29 / Math.SQRT2], [18.29 * Math.SQRT2, 0], [18.29 / Math.SQRT2, 18.29 / Math.SQRT2]]) K.box(F.trimWhite, hu + a - 0.19, Y(hu + a, hv + b) - 0.02, hv + b - 0.19, hu + a + 0.19, Y(hu + a, hv + b) + 0.08, hv + b + 0.19, { detail: true });
  // outfield wall: navy pad 1.83 m with gold cap, chain-link along the lines
  const wallH = 1.83; const capMat = new THREE.MeshStandardMaterial({ color: 0xf7c843, roughness: 0.55 });
  for (let i = 0; i < fenceLine.length - 1; i++) {
    const a = fenceLine[i], b = fenceLine[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const an = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const mu = (a[0] + b[0]) / 2, mv = (a[1] + b[1]) / 2; const g0 = Math.min(Y(a[0], a[1]), Y(b[0], b[1]));
    K.obox(F.padNavy, mu, g0 + wallH / 2 - 0.4, mv, L + 0.2, wallH + 0.8, 0.3, an);
    K.obox(capMat, mu, g0 + wallH + 0.03, mv, L + 0.22, 0.07, 0.34, an);
    colliders.push(K.colPoly([[a[0], a[1]], [b[0], b[1]], [b[0] + 0.01, b[1] + 0.3], [a[0] + 0.01, a[1] + 0.3]], g0 - 1, g0 + wallH));
  }
  // tall black ball-stop netting on poles above the outfield wall
  fence(K, S, fenceLine, { h: 5.5, mesh: S.netBlack, every: 8, y: (u, v) => Y(u, v) + wallH, rail: true, postR: 0.09 });
  const pR = fenceLine[0], pL = fenceLine[fenceLine.length - 1];
  for (const p of [pR, pL]) fence(K, S, [[hu + (p[0] - hu) * 0.18, hv + (p[1] - hv) * 0.18], p], { h: 1.2, every: 3, y: Y, wind: { h: 1.2, mat: S.windBlue }, colliders });
  // distance markers on the wall
  const mk = (p, txt) => { const an = Math.atan2(p[1] - hv, p[0] - hu); const d = Math.hypot(p[0] - hu, p[1] - hv) - 0.2; const u = hu + Math.cos(an) * d, v = hv + Math.sin(an) * d; signPanel(K, signTex(txt, { w: 256, h: 128, bg: null, fg: '#ffffff', size: 0.8 }), u, Y(u, v) + 1.0, v, 1.4, 0.7, an + Math.PI, { transparent: true, emissive: 0.08 }); };
  const ft = (p) => String(Math.round(Math.hypot(p[0] - hu, p[1] - hv) / 0.3048 / 5) * 5);
  mk(pR, ft(pR)); mk(pL, ft(pL)); const mid = fenceLine[Math.floor(fenceLine.length / 2)]; mk(mid, ft(mid));
  // foul poles
  for (const p of [pR, pL]) { const g0 = Y(p[0], p[1]); K.cyl(S.goalYellow, p[0], g0 - 0.5, p[1], 0.11, 0.08, 10.5, 8); K.obox(S.goalYellow, p[0], g0 + 7, p[1], 0.04, 6, 0.45, Math.atan2(p[1] - hv, p[0] - hu) + Math.PI / 2, { detail: true }); colliders.push(K.colCyl(p[0], p[1], 0.2, g0 - 1, g0 + 10)); }
  // backstop netting + padded wall behind home
  { const pts = []; for (let i = 0; i <= 10; i++) { const a = Math.PI - deg(52) + deg(104) * i / 10; pts.push([hu + Math.cos(a) * 9.5, hv + Math.sin(a) * 9.5]); }
    netWall(K, S, pts, { h: 8, every: 6, y: Y, colliders });
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; K.obox(F.padNavy, (a[0] + b[0]) / 2, Y(a[0], a[1]) + 0.55, (a[1] + b[1]) / 2, Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.1, 1.1, 0.25, Math.atan2(b[1] - a[1], b[0] - a[0])); } }
  // dugouts on both lines
  for (const s of [-1, 1]) { const a = s * deg(45), t = 11, off = 5.2; const n = a + s * Math.PI / 2; const u = hu + Math.cos(a) * t + Math.cos(n) * off, v = hv + Math.sin(a) * t + Math.sin(n) * off; dugout(K, S, M, u, v, { face: a - s * Math.PI / 2, len: 11, depth: 2.4, colliders }); }
  // grandstand behind home: rows parallel to the backstop, climbing away from the field (sub-frame)
  const G = new Kit(ctx, ang + Math.PI / 2);
  { const [gx, gz] = K.xz(hu - 10.5, hv); const [gu, gv] = G.uv(gx, gz);
    const yS = Math.max(G.g(gu, gv), yF - 0.3);
    pad(G, F.concLight, gu - 16, gv - 0.6, gu + 16, gv + 8 * 0.85 + 1.5, yS + 0.02);
    const res = concreteStand(G, S, { u0: gu - 15, u1: gu + 15, vFront: gv, dir: 1, rows: 8, run: 0.85, rise: 0.38, y0: yS, frontWall: 0.9, benchMat: F.seatBlue, backWall: 1.0, aisleEvery: 10, aisleW: 1.2, taper: [0.5, 0.5] });
    walkables.push(res.walk);
    const yt = res.yTop, vb = res.vB;
    G.box(F.trimWhite, gu - 5, yt, vb - 2.6, gu + 5, yt + 2.7, vb - 0.2);
    G.box(F.glassDark, gu - 4.6, yt + 1.0, vb - 2.65, gu + 4.6, yt + 2.3, vb - 2.6);
    G.box(S.navy, gu - 5.4, yt + 2.7, vb - 3.0, gu + 5.4, yt + 2.95, vb + 0.2);
    const sg = signTex('LEVINE-FRICKE FIELD', { w: 1024, h: 128, bg: '#003262', fg: '#fdb515', size: 0.55 });
    signPanel(G, sg, gu, yt + 3.35, vb - 2.9, 9, 0.8, -Math.PI / 2, { emissive: 0.08 });
    for (let k = 0; k <= 12; k++) G.box(F.postBlack, gu - 15 + k * 2.5 - 0.03, yS + 0.9, gv - 0.05, gu - 15 + k * 2.5 + 0.03, yS + 1.95, gv + 0.01, { detail: true });
    G.box(F.postBlack, gu - 15, yS + 1.92, gv - 0.05, gu + 15, yS + 1.97, gv + 0.01, { detail: true });
  }
  // wing stands along both baselines (rows parallel to the line, climbing away from the field)
  const wings = [];
  for (const s of [-1, 1]) {
    const W = new Kit(ctx, ang + s * Math.PI / 4); const [hx, hz] = K.xz(hu, hv); const [wu, wv] = W.uv(hx, hz);
    const dir = s < 0 ? -1 : 1; const vF = wv + dir * 8.2; const yS = Math.max(W.g(wu + 15, vF), yF - 0.3);
    pad(W, F.concLight, wu + 3, Math.min(vF - dir * 0.4, vF + dir * 7.6), wu + 27, Math.max(vF - dir * 0.4, vF + dir * 7.6), yS + 0.02);
    const res = concreteStand(W, S, { u0: wu + 4, u1: wu + 26, vFront: vF, dir, rows: 7, run: 0.85, rise: 0.38, y0: yS, frontWall: 0.9, benchMat: F.seatBlue, backWall: 1.0, aisleEvery: 11, aisleW: 1.2, taper: [0.3, 0.8] });
    walkables.push(res.walk); wings.push(W);
    for (let k = 0; k <= 9; k++) W.box(F.postBlack, wu + 4 + k * 2.4 - 0.03, yS + 0.9, vF - 0.03, wu + 4 + k * 2.4 + 0.03, yS + 1.9, vF + 0.03, { detail: true });
  }
  // light poles behind the wing stands and beyond the outfield corners
  for (const [aD, d, h] of [[-73, 37, 21], [73, 37, 21], [-34, 80, 23], [34, 80, 23]]) { const a = deg(aD); const u = hu + Math.cos(a) * d, v = hv + Math.sin(a) * d; const g0 = K.g(u, v); lightTower(K, S, M, u, v, { h: h + Math.max(0, yF - g0), y0: g0, face: Math.atan2(hv - v, hu + 30 - u), nx: 3, ny: 3, colliders }); }
  // video scoreboard in left-centre beyond the wall, facing home
  { const a = deg(8); let d = 70; for (const p of fenceLine) { const an = Math.atan2(p[1] - hv, p[0] - hu); if (Math.abs(an - a) < deg(12)) d = Math.max(d, Math.hypot(p[0] - hu, p[1] - hv)); } d += 2.5; const u = hu + Math.cos(a) * d, v = hv + Math.sin(a) * d; scoreboard(K, S, u, v, { face: Math.atan2(hv - v, hu - u), w: 9, h: 6, y: 2.2 + Math.max(0, yF - K.g(u, v)), legs: 2, colliders, draw: (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a2a5c'); gr.addColorStop(1, '#03142e'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fdb515'; c.font = `italic bold ${Math.round(h * 0.3)}px Georgia, serif`; c.textAlign = 'center'; c.fillText('Cal', w * 0.3, h * 0.42);
      c.fillStyle = '#ffffff'; c.font = `bold ${Math.round(h * 0.11)}px Arial`; c.fillText('SOFTBALL', w * 0.3, h * 0.58);
      c.font = `bold ${Math.round(h * 0.1)}px Arial`; c.textAlign = 'left'; c.fillText('VISITOR  0', w * 0.58, h * 0.32); c.fillText('CAL      3', w * 0.58, h * 0.48);
      c.fillStyle = '#fdb515'; c.fillRect(0, h * 0.8, w, h * 0.2); c.fillStyle = '#003262'; c.textAlign = 'center'; c.fillText('BALL 1  STRIKE 2  OUT 1', w / 2, h * 0.94);
    } }); }
  const root = new THREE.Group(); root.add(K.finish(), G.finish(), ...wings.map((W) => W.finish())); root.name = 'levine-fricke-softball-field';
  const hp = K.xz(hu, hv);
  return { object3d: root, colliders, walkables, interactions: [{ id: 'lf-home', pos: [hp[0], yF + 1, hp[1]], radius: 4, label: 'Home plate, Levine-Fricke Field' }] };
}
