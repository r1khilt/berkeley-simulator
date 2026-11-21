// Evans Diamond (Stu Gordon Stadium): home of Cal baseball since 1933, wedged between Edwards Stadium, Haas Pavilion and the RSF.
// Home plate sits in the north-east corner under the grandstand; right field runs along the back wall of Edwards Stadium
// (player banners, a row of flagpoles), left field along Haas Pavilion. Natural grass with clay infield, navy padded wall
// with distance markers, yellow foul poles, black backstop netting, field-level dugouts, a left-field scoreboard and
// six light towers placed where the LiDAR shows them.
import * as THREE from 'three';
import { Kit, sportsMats, fieldTexture, paintGrass, paintDiamond, surfaceMat, drapePoly, fence, netWall, lightTower, scoreboard, dugout, concreteStand, canvasTex, signPanel, signTex, deg } from './lib/b11-sports.js';

export const info = {
  id: 'evans-diamond',
  name: 'Evans Diamond',
  subtitle: 'Cal baseball · since 1933',
  blurb: 'Cal baseball has played at Evans Diamond since 1933; the field is named for Edwin Evans and the ballpark for longtime supporter Stu Gordon. Right field backs onto Edwards Stadium and left field onto Haas Pavilion.',
  replaces: ['w/24025441', 'way/24025441', 'w/109189907', 'way/109189907'],
};

export async function build(ctx) {
  const { M, packet } = ctx; const S = sportsMats(M);
  const HOME = [30.0, -45.0], AX = deg(143.5);          // home plate and the direction to centre field (local x/z)
  const K = new Kit(ctx, AX);                            // u: home -> centre field, v: toward the third-base (left-field) side
  const [hu, hv] = K.uv(HOME[0], HOME[1]);
  const colliders = [], walkables = [];
  const fp = packet.footprints[0].outer.map(([x, z]) => K.uv(x, z));
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const [u, v] of fp) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const LU = u1 - u0 + 2, LV = v1 - v0 + 2, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  const yF = K.g(hu + 40, hv); const Y = (u, v) => Math.max(K.g(u, v), yF - 0.4) + 0.05;
  // outfield fence = footprint vertices beyond ~70 m from home, ordered along the outfield
  const far = fp.map(([u, v]) => ({ u, v, d: Math.hypot(u - hu, v - hv), a: Math.atan2(v - hv, u - hu) })).filter((p) => p.d > 70 && Math.abs(p.a) < deg(50)).sort((p, q) => p.a - q.a);
  const fenceUV = far.map((p) => { const k = (p.d - 1.5) / p.d; return [hu + (p.u - hu) * k, hv + (p.v - hv) * k]; });
  // extend the fence to the foul lines
  const lineHit = (s) => { const dir = [Math.cos(s * deg(45)), Math.sin(s * deg(45))]; let best = null; for (let i = 0; i < fp.length; i++) { const a = fp[i], b = fp[(i + 1) % fp.length]; const ex = b[0] - a[0], ez = b[1] - a[1]; const den = dir[0] * ez - dir[1] * ex; if (Math.abs(den) < 1e-9) continue; const qx = a[0] - hu, qz = a[1] - hv; const t = (qx * ez - qz * ex) / den, w = (qx * dir[1] - qz * dir[0]) / den; if (t > 20 && w >= 0 && w <= 1) best = best === null ? t : Math.min(best, t); } return (best ?? 98) - 1.5; };
  const tR = lineHit(-1), tL = lineHit(1);
  const pR = [hu + Math.cos(-deg(45)) * tR, hv + Math.sin(-deg(45)) * tR], pL = [hu + Math.cos(deg(45)) * tL, hv + Math.sin(deg(45)) * tL];
  const fenceLine = [pR, ...fenceUV.filter((p) => { const a = Math.atan2(p[1] - hv, p[0] - hu); return a > -deg(44) && a < deg(44); }), pL];
  const toF = (u, v) => [u - cu, v - cv];
  const tex = fieldTexture(LU, LV, (P) => {
    paintGrass(P, { col: '#558f3e', alt: '#5c9743', stripe: 4.5, angle: deg(45), seed: 5, blotch: 0.5 });
    const P2 = P; // diagonal checkerboard: second set of stripes
    P2.c.save(); P2.c.globalAlpha = 0.5; paintGrassOverlay(P2); P2.c.restore();
    paintDiamond(P, { home: toF(hu, hv), dir: 0, fence: fenceLine.map(([u, v]) => toF(u, v)), track: 4.6, dirt: '#c49a72', dirtDark: '#b38a63', grassIn: '#5c9343', lineTo: 140 });
  }, { pxm: 14 });
  function paintGrassOverlay(P) { const c = P.c; c.save(); c.translate(P.X(0), P.Y(0)); c.rotate(-deg(45)); const R = Math.hypot(P.LU, P.LV) * P.s; c.fillStyle = 'rgba(95,154,69,0.18)'; for (let k = -40; k < 40; k += 2) c.fillRect(k * 4.5 * P.s, -R, 4.5 * P.s, 2 * R); c.restore(); }
  const fm = surfaceMat(tex, { rough: 0.95 });
  drapePoly(K, fm, fp, { maxEdge: 4, yFn: Y, uvFn: (u, v) => [(u - cu + LU / 2) / LU, 1 - (v - cv + LV / 2) / LV] });
  // mound and bases (raised)
  { const m = [hu + 18.0, hv]; K.cyl(new THREE.MeshStandardMaterial({ color: 0xb38a63, roughness: 1 }), m[0], Y(m[0], m[1]) - 0.1, m[1], 2.74, 1.0, 0.35, 20); }
  // outfield wall: navy padding with gold cap and distance markers
  const wallH = 2.4; const pad = []; for (const p of fenceLine) pad.push(p);
  for (let i = 0; i < pad.length - 1; i++) {
    const a = pad[i], b = pad[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const mu = (a[0] + b[0]) / 2, mv = (a[1] + b[1]) / 2; const g0 = Math.min(Y(a[0], a[1]), Y(b[0], b[1]));
    K.obox(S.padBlue, mu, g0 + wallH / 2 - 0.5, mv, L + 0.25, wallH + 1.0, 0.35, ang);
    K.obox(S.gold, mu, g0 + wallH + 0.04, mv, L + 0.27, 0.09, 0.38, ang);
    colliders.push(K.colPoly([[a[0], a[1] - 0.2], [b[0], b[1] - 0.2], [b[0], b[1] + 0.2], [a[0], a[1] + 0.2]].map(([u, v]) => [u, v]), g0 - 1, g0 + wallH));
  }
  // chain-link above the wall + windscreen along the foul lines
  fence(K, S, fenceLine, { h: 1.8, y: (u, v) => Y(u, v) + wallH, rail: true, every: 4 });
  // distance markers
  const marks = [[-45, '320'], [-22, '365'], [0, '395'], [22, '365'], [45, '320']];
  for (const [aDeg, txt] of marks) {
    const a = deg(aDeg); let best = null;
    for (let i = 0; i < fenceLine.length - 1; i++) { const p = fenceLine[i], q = fenceLine[i + 1]; const dir = [Math.cos(a), Math.sin(a)]; const ex = q[0] - p[0], ez = q[1] - p[1]; const den = dir[0] * ez - dir[1] * ex; if (Math.abs(den) < 1e-9) continue; const qx = p[0] - hu, qz = p[1] - hv; const t = (qx * ez - qz * ex) / den, w = (qx * dir[1] - qz * dir[0]) / den; if (t > 10 && w >= -0.01 && w <= 1.01) best = { t, ang: Math.atan2(ez, ex) }; }
    if (!best) continue; const t = best.t - 0.2; const u = hu + Math.cos(a) * t, v = hv + Math.sin(a) * t;
    const tx = signTex(txt, { w: 256, h: 128, bg: null, fg: '#ffffff', size: 0.8 });
    signPanel(K, tx, u, Y(u, v) + 1.3, v, 1.8, 0.9, best.ang + Math.PI / 2 + Math.PI, { transparent: true, emissive: 0.1 });
  }
  // foul poles
  for (const p of [pR, pL]) { const g0 = Y(p[0], p[1]); K.cyl(S.goalYellow, p[0], g0 - 0.5, p[1], 0.16, 0.12, 21, 8); K.obox(S.goalYellow, p[0], g0 + 14, p[1] - 0.0, 0.05, 12, 0.6, Math.atan2(p[1] - hv, p[0] - hu) + Math.PI / 2, { detail: true }); colliders.push(K.colCyl(p[0], p[1], 0.25, g0 - 1, g0 + 21)); }
  // backstop netting around home plate and partway down the lines
  { const pts = []; for (let i = 0; i <= 12; i++) { const a = Math.PI - deg(70) + deg(140) * i / 12; pts.push([hu + Math.cos(a) * 17.5, hv + Math.sin(a) * 17.5]); }
    netWall(K, S, pts, { h: 10, every: 7, y: Y, colliders });
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); K.obox(S.padBlue, (a[0] + b[0]) / 2, Y(a[0], a[1]) + 0.6, (a[1] + b[1]) / 2, L + 0.1, 1.2, 0.3, Math.atan2(b[1] - a[1], b[0] - a[0])); }
  }
  // dugouts along each line (~20 m from home)
  for (const s of [-1, 1]) { const a = s * deg(45), t = 24, off = 8.5; const n = a + s * Math.PI / 2; const u = hu + Math.cos(a) * t + Math.cos(n) * off, v = hv + Math.sin(a) * t + Math.sin(n) * off; dugout(K, S, M, u, v, { face: a - s * Math.PI / 2, len: 16, depth: 2.6, colliders }); }
  // grandstand behind home (OSM bleachers polygon): concrete rows of grey-blue benches climbing away from the field
  {
    // stand along the first-base side and behind home: build in a rotated sub-frame (rows parallel to the OSM front edge)
    const G = new Kit(ctx, Math.atan2(-62.8 + 54.0, 30.8 + 24.6));
    const [a0, b0] = G.uv(-24.6, -54.0), [a1] = G.uv(30.8, -62.8);
    const res = concreteStand(G, S, { u0: Math.min(a0, a1) - 2, u1: Math.max(a0, a1) + 8, vFront: b0 - 0.8, dir: -1, rows: 11, run: 0.85, rise: 0.33, y0: G.g((a0 + a1) / 2, b0 - 2), frontWall: 1.1, benchMat: new THREE.MeshStandardMaterial({ color: 0x8c9aa8, roughness: 0.6 }), backWall: 1.2, aisleEvery: 12, aisleW: 1.3, taper: [0, 0.6] });
    walkables.push(res.walk);
    const yt = res.yTop; const vb = res.vB; const ua = Math.min(a0, a1) - 2, ub = Math.max(a0, a1) + 8;
    // press box on top and navy rail
    G.box(M.stucco, (ua + ub) / 2 - 5, yt, vb - 3.0, (ua + ub) / 2 + 5, yt + 2.6, vb - 0.4);
    G.box(M.windowNight, (ua + ub) / 2 - 4.5, yt + 1.0, vb - 0.35, (ua + ub) / 2 + 4.5, yt + 2.2, vb - 0.33);
    G.box(S.navy, (ua + ub) / 2 - 5.4, yt + 2.6, vb - 3.4, (ua + ub) / 2 + 5.4, yt + 2.8, vb + 0.3);
    G.box(S.navy, ua, yF + 1.1 + 0.9, b0 - 0.85, ub, yF + 1.1 + 0.95, b0 - 0.8, { detail: true });
    const obj = G.finish(); K.extra.push(obj); obj.rotation.y = 0; // G already bakes its own rotation; undo K's bake below
    obj.userData.ownFrame = true;
  }
  // light towers where the LiDAR shows them (heights above field)
  const poles = [[-20.7, -66.3, 27], [13.8, -71.8, 24], [-58.7, -10.8, 27], [-52.7, 30.2, 27], [-10.2, 59.7, 27], [27.3, 54.7, 27]];
  for (const [x, z, h] of poles) { const [u, v] = K.uv(x, z); const face = Math.atan2((hv + 0) - v, (hu + 60) - u); lightTower(K, S, M, u, v, { h, face, nx: 4, ny: 3, colliders }); }
  // scoreboard in left-centre beyond the wall, facing home
  { const [su, sv] = [hu + 92, hv + 42]; scoreboard(K, S, su, sv, { face: Math.atan2(hv - sv, hu - su), w: 12, h: 5, y: 4, legs: 2, colliders, draw: (c, w, h) => {
      c.fillStyle = '#003262'; c.fillRect(0, 0, w, h * 0.2); c.fillStyle = '#fdb515'; c.font = `italic bold ${Math.round(h * 0.16)}px Georgia, serif`; c.textAlign = 'center'; c.fillText('Cal', w * 0.12, h * 0.16); c.font = `bold ${Math.round(h * 0.11)}px Arial`; c.fillText('EVANS DIAMOND', w * 0.55, h * 0.15);
      c.font = `bold ${Math.round(h * 0.09)}px Arial`; c.fillStyle = '#ffffff'; for (let i = 1; i <= 9; i++) c.fillText(String(i), w * (0.18 + i * 0.065), h * 0.33); c.fillText('R  H  E', w * 0.9, h * 0.33);
      c.fillStyle = '#ffb000'; c.font = `bold ${Math.round(h * 0.1)}px 'Courier New', monospace`; for (let r = 0; r < 2; r++) { for (let i = 1; i <= 6; i++) c.fillText(String((i * 7 + r * 3) % 3), w * (0.18 + i * 0.065), h * (0.5 + r * 0.17)); c.fillText(r ? '3 7 1' : '5 9 0', w * 0.9, h * (0.5 + r * 0.17)); }
      c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.fillText('STANFORD', w * 0.02, h * 0.5); c.fillText('CAL', w * 0.02, h * 0.67); c.fillStyle = '#1b2a46'; c.fillRect(0, h * 0.8, w, h * 0.2); c.fillStyle = '#fdb515'; c.textAlign = 'center'; c.fillText('BALL 2  STRIKE 1  OUT 2', w / 2, h * 0.94);
    } }); }
  // player banners along the right-field (Edwards) wall
  { const bt = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#003262'; c.fillRect(0, 0, w, h); c.fillStyle = '#fdb515'; c.fillRect(0, h * 0.86, w, h * 0.14); c.fillStyle = '#5a6f8f'; c.beginPath(); c.arc(w / 2, h * 0.32, w * 0.22, 0, Math.PI * 2); c.fill(); c.fillRect(w * 0.22, h * 0.48, w * 0.56, h * 0.36); c.fillStyle = '#ffffff'; c.font = `italic bold ${Math.round(h * 0.09)}px Georgia, serif`; c.textAlign = 'center'; c.fillText('Cal', w / 2, h * 0.95); });
    for (let k = 0; k < 5; k++) { const x = -61.0 + k * 9.2 * 0.165, z = -8 + k * 9.2; const [u, v] = K.uv(x, z); signPanel(K, bt, u, yF + 8.0, v, 3.8, 7.6, Math.atan2(hv - v, hu + 60 - u), { emissive: 0.05 }); }
  }
  const object3d = K.finish();
  // the grandstand group was baked in its own frame; K.finish rotated it again, undo that
  for (const o of object3d.children) if (o.userData.ownFrame) { o.rotation.set(0, 0, 0); o.position.set(0, 0, 0); o.updateMatrix(); }
  object3d.name = 'evans-diamond';
  const hp = K.xz(hu, hv);
  return { object3d, colliders, walkables, interactions: [{ id: 'evans-home', pos: [hp[0], yF + 1, hp[1]], radius: 4, label: 'Home plate, Evans Diamond' }] };
}
