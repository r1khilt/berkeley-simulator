// Edwards Stadium (1932, Warren C. Perry & Stafford L. Jory): Cal's track & field stadium, home of Goldman Field (soccer).
// Two long concrete grandstands flank the 400 m oval (the running track and the pitch are their own modules,
// track-1548418 and goldman-field). Stand profiles are measured from the 2021 LiDAR: the field sits ~3.4 m above Fulton St,
// the west stand climbs 24 rows to ~10 m above the field with the board-and-batten press box ("EDWARDS STADIUM") on top,
// the east stand climbs ~30 rows; both step down at their ends. The Fulton Street wall is plain board-formed concrete with
// obelisk pylons at the south-west entrance.
import * as THREE from 'three';
import { Kit, sportsMats, concreteStand, fence, lightTower, scoreboard, signTex, signPanel, deg, canvasTex } from './lib/b11-sports.js';

export const info = {
  id: 'edwards-stadium',
  name: 'Edwards Stadium',
  subtitle: 'Track & field and soccer · 1932',
  blurb: 'Opened in 1932 and named for mathematics professor George C. Edwards, the concrete stadium has hosted NCAA championships and a string of track world records; Cal soccer plays on Goldman Field inside the oval.',
  replaces: ['w/664116639', 'way/664116639', 'w/109189909', 'way/109189909'],
};

export async function build(ctx) {
  const { M } = ctx; const S = sportsMats(M);
  const K = new Kit(ctx, deg(-99.2));            // u: along the oval toward the north end, v: toward the east stand
  const [cu, cv] = K.uv(-1.0, -8.5);             // centre of the track
  const R = (u, v) => [cu + u, cv + v];
  const colliders = [], walkables = [];
  const yF = K.g(cu, cv);                        // field / track level
  const conc = S.standConc;
  const benchGold = new THREE.MeshStandardMaterial({ color: 0xc9a54e, roughness: 0.55, metalness: 0.25 });
  const benchBlue = new THREE.MeshStandardMaterial({ color: 0xc4d0db, roughness: 0.55, metalness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.9 });
  const wallBuff = M.concrete.clone(); wallBuff.color = new THREE.Color(0xd8cfbd);
  const cream = M.stuccoWhite.clone(); cream.color = new THREE.Color(0xeee2c0);
  const soffit = M.wood.clone(); soffit.color = new THREE.Color(0xb89a6c);
  const tan = new THREE.MeshStandardMaterial({ color: 0xc98a3e, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 });

  // ---------- grandstands ----------
  const stands = [
    { side: -1, vF: -47.6, rows: 24, rise: 0.385, uS: -100, uN: 71, taper: [1.25, 0.95], bench: benchGold, alt: benchBlue, benchSpan: [-200, 200], vomRow: 15 },
    { side: 1, vF: 49.5, rows: 30, rise: 0.368, uS: -92, uN: 68, taper: [0.63, 0.5], bench: benchBlue, alt: null, benchSpan: [-200, 200], vomRow: 17 },
  ];
  const standInfo = [];
  for (const st of stands) {
    const [u0, vF] = R(st.uS, st.vF); const u1 = cu + st.uN; const dir = st.side;
    const res = concreteStand(K, S, { u0, u1, vFront: vF, dir, rows: st.rows, run: 0.8, rise: st.rise, y0: yF, taper: st.taper, frontWall: 1.0, benchMat: null, backWall: 0, aisleEvery: 16, aisleW: 1.4 });
    standInfo.push({ ...st, res, u0, u1, vF, dir });
    walkables.push(res.walk);
    // benches (painted planks on brackets) in bays between aisle stairs; vomitories interrupt them
    const vomU = []; for (let u = u0 + 20; u < u1 - 18; u += 16) vomU.push(u + 8);
    for (let k = 0; k < st.rows; k++) {
      const s0 = res.uS(k) + 0.6, s1 = res.uN(k) - 0.6; if (s1 - s0 < 2) continue;
      const b = res.vv(k + 1), top = res.yk(k + 1);
      for (let u = u0; u < s1; u += 16) {
        let p = Math.max(s0, u + 1.4), q = Math.min(s1, u + 16); if (q - p < 1) continue;
        const inGold = (p - cu) > st.benchSpan[0] && (q - cu) < st.benchSpan[1];
        const bay = Math.round((u - u0) / 16); const mat = !inGold ? null : (st.alt && bay % 2 === 1 ? st.alt : st.bench); if (!mat) continue;
        const vomHere = k >= st.vomRow - 1 && k <= st.vomRow + 2;
        const segs = vomHere ? [[p, (p + q) / 2 - 1.6], [(p + q) / 2 + 1.6, q]] : [[p, q]];
        for (const [a, c] of segs) if (c - a > 0.8) K.box(mat, a, top + 0.36, Math.min(b - dir * 0.46, b - dir * 0.12), c, top + 0.42, Math.max(b - dir * 0.46, b - dir * 0.12));
      }
    }
    // aisle handrails (detail)
    for (let u = u0; u < u1; u += 16) { const ua = u + 0.7; if (ua < res.uS(0) || ua > res.uN(st.rows - 1)) continue; for (let k = 0; k < st.rows; k += 2) { const y = res.yk(k + 1) + 0.95; K.box(S.galv, ua - 0.025, y - 0.02, Math.min(res.vv(k), res.vv(k + 2)), ua + 0.025, y + 0.02, Math.max(res.vv(k), res.vv(k + 2)), { detail: true }); } }
    // vomitories: dark tunnel mouths in a row at mid-height with concrete cheek walls
    const kv = st.vomRow;
    for (let u = u0 + 8; u < u1 - 8; u += 16) {
      const um = u + 8; if (um - 2 < res.uS(kv + 3) || um + 2 > res.uN(kv + 3)) continue;
      const va = res.vv(kv), vb = res.vv(kv + 3); const lo = Math.min(va, vb), hi = Math.max(va, vb);
      const yT = res.yk(kv + 3) + 0.05;
      K.box(dark, um - 1.25, res.yk(kv) - 0.1, Math.min(va, va + dir * 0.05), um + 1.25, yT, Math.max(va, va + dir * 0.05));
      K.box(dark, um - 1.25, res.yk(kv) + 0.02, lo, um + 1.25, res.yk(kv) + 0.05, hi);
      for (const s of [-1, 1]) K.box(conc, um + s * 1.25 + (s < 0 ? -0.3 : 0), res.yk(kv), lo, um + s * 1.25 + (s < 0 ? 0 : 0.3), yT + 0.1, hi);
      K.box(S.galv, um - 1.3, yT + 0.95, (lo + hi) / 2 - 0.02, um + 1.3, yT + 1.0, (lo + hi) / 2 + 0.02, { detail: true });
    }
    // track-side apron (tan synthetic) and front-wall rail
    const vt = cv + st.side * 46.35; const [a0, a1] = [Math.min(vt, vF), Math.max(vt, vF)];
    if (a1 - a0 > 0.2) { const g = new THREE.PlaneGeometry(u1 - u0 - 8, a1 - a0); g.rotateX(-Math.PI / 2); g.translate((u0 + u1) / 2, yF + 0.055, (a0 + a1) / 2); K.add(tan, g); }
    K.box(S.galv, u0 + 2, yF + 1.95, Math.min(vF, vF - dir * 0.15) + 0.0, u1 - 2, yF + 2.0, Math.max(vF, vF - dir * 0.15), { detail: true });
    // colliders: the front wall (players reach the seats via the aisle stairs at the ends) and the stand body
    colliders.push(K.colPoly([[u0, vF - dir * 0.3], [u1, vF - dir * 0.3], [u1, vF], [u0, vF]].map(([a, b]) => [a, b]), yF - 2, yF + 1.0));
  }

  // ---------- west stand: top promenade, outer wall on Fulton Street, press box ----------
  const W = standInfo[0]; const wTopV = W.res.vB; const wOutV = cv - 71.3; const yTopW = W.res.yTop;
  {
    const uA = W.res.uS(W.rows - 1), uB = W.res.uN(W.rows - 1);
    K.box(conc, uA, yTopW - 0.4, wOutV + 0.5, uB, yTopW + 0.25, wTopV); // promenade deck
    walkables.push(K.walkPoly([[uA, wOutV + 0.5], [uB, wOutV + 0.5], [uB, wTopV], [uA, wTopV]], yTopW + 0.25));
    // outer wall: full height from Fulton St grade, stepping down with the stand ends
    const wallTop = yTopW + 1.55; const segs = 26;
    for (let i = 0; i < segs; i++) {
      const ua = W.u0 + (W.u1 - W.u0) * i / segs, ub = W.u0 + (W.u1 - W.u0) * (i + 1) / segs; const um = (ua + ub) / 2;
      // height follows the stepped ends of the bowl
      let kmax = W.rows; while (kmax > 0 && (um < W.res.uS(kmax - 1) || um > W.res.uN(kmax - 1))) kmax--;
      const top = kmax >= W.rows ? wallTop : W.res.yk(kmax) + 0.3;
      const gg = Math.min(K.g(ua, wOutV - 0.4), K.g(ub, wOutV - 0.4));
      K.box(wallBuff, ua, gg - 1.0, wOutV, ub, top, wOutV + 0.55);
      if (kmax < W.rows) K.box(conc, ua, yF, wOutV + 0.55, ub, W.res.yk(Math.max(1, kmax)) - 0.2, wTopV);
    }
    K.box(wallBuff, uA, wallTop, wOutV - 0.15, uB, wallTop + 0.22, wOutV + 0.7); // coping
    K.box(conc, uA - 0.3, yTopW + 0.25, wTopV - 0.2, uA, yTopW + 1.5, wOutV + 0.5);
    K.box(conc, uB, yTopW + 0.25, wTopV - 0.2, uB + 0.3, yTopW + 1.5, wOutV + 0.5);
    // board-form texture lines: shallow pilaster strips every 8 m on the Fulton wall
    for (let u = W.u0 + 6; u < W.u1 - 4; u += 6) { const gg = K.g(u, wOutV - 0.4); let kmax = W.rows; while (kmax > 0 && (u < W.res.uS(kmax - 1) || u > W.res.uN(kmax - 1))) kmax--; const top = kmax >= W.rows ? wallTop : W.res.yk(kmax) + 0.3; K.box(wallBuff, u - 0.45, gg - 0.5, wOutV - 0.18, u + 0.45, top, wOutV); }
    colliders.push(K.colPoly([[W.u0, wOutV], [W.u1, wOutV], [W.u1, wTopV], [W.u0, wTopV]], -5, yTopW - 0.6));
    // press box: board-and-batten cabin with a dark window band and a cantilevered flat roof
    const p0 = cu - 39, p1 = cu + 19, pv0 = wTopV - 0.2, pv1 = wOutV + 0.6; const yb = yTopW + 0.25;
    K.box(cream, p0, yb, pv1, p1, yb + 4.6, pv0 - 0.0); // body (front face at pv0)
    K.box(M.windowNight, p0 + 0.5, yb + 1.2, pv0 - 0.12, p1 - 0.5, yb + 2.6, pv0 + 0.02);
    for (let u = p0 + 0.5; u <= p1 - 0.4; u += 1.8) K.box(M.whitePaint, u - 0.05, yb + 1.2, pv0 - 0.02, u + 0.05, yb + 2.6, pv0 + 0.05, { detail: true });
    K.box(M.whitePaint, p0 + 0.5, yb + 1.12, pv0 - 0.02, p1 - 0.5, yb + 1.2, pv0 + 0.12, { detail: true });
    for (let u = p0 + 0.3; u < p1; u += 0.6) { K.box(cream, u - 0.04, yb + 2.65, pv0 - 0.02, u + 0.04, yb + 4.55, pv0 + 0.05, { detail: true }); K.box(cream, u - 0.04, yb + 0.05, pv0 - 0.02, u + 0.04, yb + 1.1, pv0 + 0.05, { detail: true }); K.box(cream, u - 0.04, yb + 0.05, pv1 - 0.05, u + 0.04, yb + 4.55, pv1 + 0.02, { detail: true }); }
    for (let u = p0 + 2; u < p1 - 1; u += 5) K.box(M.windowNight, u - 0.8, yb + 1.6, pv1 - 0.05, u + 0.8, yb + 2.8, pv1 + 0.03);
    const yR = yb + 4.6; K.box(M.whitePaint, p0 - 0.6, yR, pv1 - 0.3, p1 + 0.6, yR + 0.3, pv0 + 2.4); // roof slab
    K.box(soffit, p0 - 0.5, yR - 0.06, pv0, p1 + 0.5, yR, pv0 + 2.3); // timber soffit
    for (let u = p0 + 1; u < p1; u += 4.8) { const g = new THREE.BoxGeometry(0.16, 0.2, 2.6); g.rotateX(-0.6); g.translate(u, yR - 0.75, pv0 + 1.0); K.add(soffit, g, { detail: true }); }
    K.box(S.galv, p0 - 0.6, yR + 1.0, pv1 - 0.3, p1 + 0.6, yR + 1.05, pv1 - 0.25, { detail: true });
    // "EDWARDS STADIUM" in navy serif capitals across the press box front
    const t = signTex('EDWARDS STADIUM', { w: 2048, h: 160, bg: '#f0e4c2', fg: '#1e2f63', family: "Georgia, 'Times New Roman', serif", size: 0.72 });
    signPanel(K, t, cu - 10, yb + 3.55, pv0 + 0.03, 30, 2.3, Math.PI / 2, { emissive: 0.05 });
    colliders.push(K.colPoly([[p0, pv1], [p1, pv1], [p1, pv0], [p0, pv0]], yb - 0.5, yR + 0.3));
  }
  // ---------- east stand: back wall onto the Evans Diamond side ----------
  {
    const E = standInfo[1]; const vB = E.res.vB; const uA = E.res.uS(E.rows - 1), uB = E.res.uN(E.rows - 1);
    for (let i = 0; i < 24; i++) {
      const ua = E.u0 + (E.u1 - E.u0) * i / 24, ub = E.u0 + (E.u1 - E.u0) * (i + 1) / 24, um = (ua + ub) / 2;
      let kmax = E.rows; while (kmax > 0 && (um < E.res.uS(kmax - 1) || um > E.res.uN(kmax - 1))) kmax--;
      const top = kmax >= E.rows ? E.res.yTop + 1.2 : E.res.yk(kmax) + 0.3;
      const vb = E.res.vv(Math.max(1, kmax)); const gg = Math.min(K.g(ua, vb + 0.6), K.g(ub, vb + 0.6));
      K.box(wallBuff, ua, gg - 1.0, Math.min(vb, vb + 0.5), ub, top, Math.max(vb, vb + 0.5));
      if (kmax < E.rows) K.box(conc, ua, yF, E.res.vv(Math.max(1, kmax)) - 0.01, ub, E.res.yk(Math.max(1, kmax)) - 0.2, vB);
    }
    K.box(S.galv, uA, E.res.yTop + 1.15, vB + 0.2, uB, E.res.yTop + 1.2, vB + 0.3, { detail: true });
    colliders.push(K.colPoly([[E.u0, vB + 0.5], [E.u1, vB + 0.5], [E.u1, vB], [E.u0, vB]], -5, E.res.yTop + 1.2));
  }

  // ---------- south-west entrance: obelisk pylons on the Fulton corner ----------
  {
    const ob = (u, v, H, w) => {
      const g0 = K.g(u, v);
      K.box(wallBuff, u - w * 0.8, g0 - 0.8, v - w * 0.8, u + w * 0.8, g0 + 2.2, v + w * 0.8);           // pedestal
      K.box(wallBuff, u - w * 0.88, g0 + 2.2, v - w * 0.88, u + w * 0.88, g0 + 2.6, v + w * 0.88);
      for (let k = 0; k < 8; k++) { const d = -w * 0.7 + (1.4 * w) * (k + 0.5) / 8; for (const [du, dv] of [[d, -w * 0.62], [d, w * 0.62], [-w * 0.62, d], [w * 0.62, d]]) K.box(wallBuff, u + du - 0.06, g0 + 2.75, v + dv - 0.06, u + du + 0.06, g0 + 2.9, v + dv + 0.06, { detail: true }); }
      K.box(wallBuff, u - w * 0.7, g0 + 2.6, v - w * 0.7, u + w * 0.7, g0 + 3.4, v + w * 0.7);             // decorative band
      for (const [du, dv] of [[0, -w * 0.71], [0, w * 0.71], [-w * 0.71, 0], [w * 0.71, 0]]) K.cyl(M.concreteDark, u + du, g0 + 2.8, v + dv, 0.22, 0.22, 0.42, 10, { detail: true });
      const sh = new THREE.CylinderGeometry(w * 0.42, w * 0.6, H - 3.4, 4, 1); sh.rotateY(Math.PI / 4); sh.translate(u, g0 + 3.4 + (H - 3.4) / 2, v); K.add(wallBuff, sh);
      const cap = new THREE.ConeGeometry(w * 0.42 * Math.SQRT2 * 0.72, 1.1, 4); cap.rotateY(Math.PI / 4); cap.translate(u, g0 + H + 0.55, v); K.add(wallBuff, cap);
      colliders.push(K.colCyl(u, v, w * 0.85, g0 - 1, g0 + H));
    };
    const [su, sv] = R(-103.5, -62); ob(su, sv, 15.5, 2.0); ob(su + 1.2, sv - 5.2, 11.5, 1.5); ob(su - 1.2, sv + 5.2, 11.5, 1.5);
    // entrance wall connecting the pylons to the stand end
    const g0 = K.g(su, sv); K.box(wallBuff, su - 0.4, g0 - 1, sv - 9, su + 0.4, g0 + 4.2, sv - 6.4); K.box(wallBuff, su - 0.4, g0 - 1, sv + 6.4, su + 0.4, g0 + 4.2, sv + 9);
    // flagpole with the Cal flag
    const [fu, fv] = R(-96, -78); const gf = K.g(fu, fv);
    K.cyl(M.whitePaint, fu, gf - 0.5, fv, 0.09, 0.05, 15.5, 8); K.lathe(M.gold, [[0.001, 0], [0.16, 0.06], [0.16, 0.2], [0.001, 0.32]], fu, gf + 15, fv, 10);
    const flag = canvasTex(256, 160, (c, w, h) => { c.fillStyle = '#1f2a6b'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2b71f'; c.font = `italic bold ${Math.round(h * 0.62)}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Cal', w / 2, h * 0.55); });
    const fm = new THREE.MeshStandardMaterial({ map: flag, side: THREE.DoubleSide, roughness: 0.8 });
    const fg = new THREE.PlaneGeometry(2.6, 1.6, 6, 1); const pp = fg.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, Math.sin((pp.getX(i) + 1.3) * 2.2) * 0.12 * (pp.getX(i) + 1.3) / 2.6); fg.computeVertexNormals();
    fg.translate(1.35, 0, 0); fg.rotateY(deg(30)); fg.translate(fu, gf + 13.9, fv); K.add(fm, fg, { uvMode: 'keep' });
  }
  // ---------- lights and scoreboard ----------
  { const [lu, lv] = R(-92, -66); lightTower(K, S, M, lu, lv, { h: 17, face: deg(35), nx: 2, ny: 2, colliders }); }
  { const [su, sv] = R(86, 32); const ang = Math.atan2(cv - sv, cu - su);
    scoreboard(K, S, su, sv, { face: ang, w: 9, h: 3.6, y: 3.2, colliders, draw: (c, w, h) => {
      c.fillStyle = '#fdb515'; c.font = `bold ${Math.round(h * 0.16)}px Arial`; c.textAlign = 'center'; c.fillText('CALIFORNIA', w * 0.25, h * 0.2); c.fillText('VISITOR', w * 0.75, h * 0.2);
      c.fillStyle = '#ff4d2e'; c.font = `bold ${Math.round(h * 0.34)}px 'Courier New', monospace`; c.fillText('2', w * 0.25, h * 0.58); c.fillText('1', w * 0.75, h * 0.58);
      c.fillStyle = '#ffd34d'; c.font = `bold ${Math.round(h * 0.2)}px 'Courier New', monospace`; c.fillText('78:21', w * 0.5, h * 0.9);
      c.fillStyle = '#ffffff'; c.font = `bold ${Math.round(h * 0.11)}px Arial`; c.fillText('EDWARDS STADIUM · GOLDMAN FIELD', w * 0.5, h * 0.7);
    } }); }
  // perimeter fence at the north curve (toward the tennis centre) and south end
  {
    const pts = []; for (let i = 0; i <= 14; i++) { const a = -Math.PI / 2 + Math.PI * i / 14; pts.push(R(42.2 + Math.cos(a) * 49.5, Math.sin(a) * 49.5)); }
    fence(K, S, pts, { h: 2.4, gapAt: [7], colliders });
  }
  const object3d = K.finish(); object3d.name = 'edwards-stadium';
  const pxz = K.xz(cu - 10, wTopV - 1.5); const fxz = K.xz(cu, cv);
  const interactions = [{ id: 'edwards-press', pos: [pxz[0], yTopW + 1.2, pxz[1]], radius: 6, label: 'Top of the west stand, Edwards Stadium' }, { id: 'edwards-field', pos: [fxz[0], yF + 1, fxz[1]], radius: 10, label: 'Goldman Field at Edwards Stadium' }];
  return { object3d, colliders, walkables, interactions };
}
