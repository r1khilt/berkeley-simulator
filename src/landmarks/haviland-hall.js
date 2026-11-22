// Haviland Hall (John Galen Howard, 1924). Cream Beaux-Arts block on a raised basement: two main storeys under a deep
// dentilled cornice, an attic storey of small windows alternating with garland relief panels, low red-tile hip roofs.
// The west front is centred on a small Ionic portico (two fluted columns between responds) carrying an iron balcony,
// reached by a long brick stair. LiDAR: end wings ~15 m, central block eaves ~16.3 m, ridge ~21.5 m.
import * as THREE from 'three';
import { Kit, tint, solid, stoneBlock, hipPoly, rect, dentils, inscription, orient } from './lib/b02-kit.js';
import { ionicColumn, corniceProfile } from './lib/classic-kit.js';
import { ashlarMat, planting, rnMats } from './lib/rn-kit.js';

export const info = {
  id: 'haviland-hall',
  name: 'Haviland Hall',
  subtitle: 'John Galen Howard · 1924',
  blurb: 'Built for the School of Education, this cream Beaux-Arts hall with its small Ionic portico and red tile roofs now houses the School of Social Welfare.',
  replaces: ['w/24025038', 'way/24025038'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-17.2)); const M = ctx.M;
  const ST = ashlarMat('havilandStone', { bw: 1.2, ch: 0.6, span: 2.4, base: 0xdad4c5, joint: 0xbcb5a4, /* [r5a] a touch cooler/lower (photo #d8d1c0..#e2ddd0; render blew out) */ vary: 0.02, grain: 0.012 }), ORN = tint(M.stucco, 0xd8d0be), BASE = tint(M.granite, 0xb3a893), CU = tint(M.copper, 0x5f8f7e), FR = solid(0xede8dc, 0.5, 0.05);
  const BRICK = tint(M.brick, 0xb0604c);
  const colliders = [], walkables = [];
  const FL = 2.0, BWY = 0.52; // BWY: basement window sill (local y)
  const win = (k) => ({ w: 1.5, h: 2.6, sill: 0.8, mull: 2, muntins: 3 });
  const atticWin = { w: 1.0, h: 0.95, sill: 0.9, mull: 1, muntins: 1 };
  // one continuous block: raised basement, two storeys, dentilled cornice, attic with garland panels
  const P = rect(-11.0, -26.6, 11.0, 26.6); const EAVE = 16.0;
  const gB = K.g(0, 0) - 1.5; // [r5a] basement windows (iron grilles) sit just above the terrace, not buried below it
  const st = [{ y0: gB, y1: FL, mat: BASE, win: { w: 1.25, h: 0.95, sill: BWY - gB, mull: 1 } }, { y0: FL, y1: 6.2, mat: ST, win: win(0) }, { y0: 6.2, y1: 10.4, mat: ST, win: win(1) }, { y0: 10.4, y1: 11.3, mat: ST, win: null }, { y0: 11.3, y1: EAVE, mat: ST, win: { w: 1.05, h: 1.0, sill: 1.3, mull: 1, muntins: 1 } }];
  const runs = stoneBlock(K, { poly: P, FL, levels: [FL, 6.2, 10.4], eave: EAVE, mat: ST, baseMat: BASE, bay: 3.55, win, cornice: { P: 0.45, H: 0.55 },
    edge: (i, R) => ({ stories: st, skip: R.L > 40 ? [7] : [] }) });
  K.loop(ST, orient(P), corniceProfile(11.35, 0.85, 0.85)); dentils(K, P, ST, 10.55, { pitch: 0.32, size: 0.18, P: 0.22 });
  for (const [a, b] of [[[-11.0, -26.6], [-11.0, 26.6]], [[11.0, 26.6], [11.0, -26.6]], [[11.0, -26.6], [-11.0, -26.6]], [[-11.0, 26.6], [11.0, 26.6]]]) { const R = K.run(a, b); const nb = Math.round(R.L / 3.55); const bw = R.L / nb;
    for (let i = 0; i < nb - 1; i++) { const s = bw * (i + 1); K.rbox(R, ORN, s - 0.85, 12.3, 0, s + 0.85, 14.9, 0.07); const g = new THREE.TorusGeometry(0.62, 0.15, 6, 14, Math.PI); g.rotateZ(Math.PI); g.translate(s, 14.25, 0.1); K.addRun(R, ST, g, { detail: true }); { const c = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 14); c.rotateX(Math.PI / 2); c.scale(0.8, 1.15, 1); c.translate(s, 13.55, 0.11); K.addRun(R, ST, c, { detail: true }); } /* [r5a] fuller garland + cartouche */ for (const dx of [-0.62, 0.62]) K.rbox(R, ST, s + dx - 0.08, 13.0, 0.07, s + dx + 0.08, 14.2, 0.16, { detail: true }); } }
  K.loop(CU, orient(P), [[0.45, EAVE + 0.02], [0.52, EAVE + 0.02], [0.52, EAVE - 0.25], [0.45, EAVE - 0.25]]);
  K.loop(M.redTile, orient(P), [[0.5, EAVE], [-0.6, EAVE + 0.45], [-0.9, EAVE + 0.45]], { uvMode: 'roof' });
  K.flat(tint(M.concrete, 0xb9b4aa), rect(-10.6, -26.2, 10.6, 26.2), 15.5);
  hipPoly(K, rect(-10.2, -14.3, 10.2, 14.5), 16.0, 0.47, { ov: 0, soffit: false });
  // low tile hips over both end wings too (LiDAR ~13.5 m at the eaves rising to ~16-17 m), so no flat grey deck shows
  for (const [a, b] of [[-26.2, -13.6], [13.8, 26.2]]) hipPoly(K, rect(-10.6, a, 10.6, b), 15.6, 0.24, { ov: 0, soffit: false });
  colliders.push(K.colPoly(P, -2, 21));
  // ---- west portico + entrance stair ----
  // [r5a] re-done from the photos (Commons "Haviland Hall (Berkeley, CA).JPG", "Haviland Hall main entrance.JPG") and the
  // LiDAR: the door landing sits at terrace grade with the basement grilles flanking it at landing level; the two fluted
  // columns stand on ~0.9 m square pedestals; the 6 m arched doorway rises straight from the landing; one long straight
  // red-brick flight (~30 risers, LiDAR ramp u -25..-14) climbs the slope from the lower walk between sloped light-grey
  // concrete cheek walls with black pipe handrails, set into juniper planting. (Was: a raised granite platform at FL with
  // a short pale flight whose foot hung ~1.3 m above the walk.)
  {
    const uF = -11.0, uP = -13.4, v0 = -3.2, v1 = 3.2, yT = FL + 5.4;
    const yL = Math.max(K.g(-12.2, 0), K.g(-14.4, 0), K.g(-12.2, -2.6), K.g(-12.2, 2.6)) + 0.12; // landing: one low step above the terrace walk
    const LAND = tint(M.granite, 0xc8c0b0), CON = tint(M.concrete, 0xc9c4b8), BRK = tint(M.brick, 0x9a4636), NOSE = tint(M.concrete, 0xb48e7e), RAIL = solid(0x1b1b1b, 0.5, 0.6);
    K.box(LAND, uP - 0.6, yL - 0.9, v0 - 0.3, uF, yL, v1 + 0.3);
    walkables.push(K.walkPoly(rect(uP - 0.6, v0 - 0.3, uF, v1 + 0.3), yL));
    const yC = yL + 0.9; // pedestal top
    for (const v of [-1.35, 1.35]) {
      const uc = uP + 0.45;
      K.box(BASE, uc - 0.56, yL, v - 0.56, uc + 0.56, yL + 0.16, v + 0.56); K.box(ST, uc - 0.5, yL + 0.16, v - 0.5, uc + 0.5, yC - 0.12, v + 0.5); K.box(ST, uc - 0.57, yC - 0.12, v - 0.57, uc + 0.57, yC, v + 0.57);
      ionicColumn(K, ST, uc, yC, v, 0.62, yT - yC, { flutes: 20, rotV: 1 }); colliders.push(K.colCyl(uc, v, 0.6, yL - 1, yT));
    }
    for (const v of [v0 + 0.35, v1 - 0.35]) { K.box(ST, uP + 0.1, yL, v - 0.35, uF, yT, v + 0.35); K.box(ST, uP + 0.03, yC - 0.12, v - 0.42, uF, yC, v + 0.42); K.box(BASE, uP + 0.04, yL, v - 0.41, uF, yL + 0.16, v + 0.41); }
    K.box(ST, uP - 0.05, yT, v0 - 0.05, uF, yT + 0.95, v1 + 0.05);
    K.box(ST, uP - 0.25, yT + 0.95, v0 - 0.25, uF, yT + 1.25, v1 + 0.25);
    const RF = K.run([uP - 0.06, v0], [uP - 0.06, v1]);
    inscription(K, RF, 0.6, 5.8, yT + 0.25, yT + 0.75, 0.005, 'HAVILAND HALL', { fg: '#6a6252', cut: true });
    // doorway: 6 m round-arched opening from the landing, double doors under a tall gridded transom
    // (the frontispiece now stands 0.25 m proud of the façade: the recessed door used to sit behind the solid bay-7 wall face and never showed)
    const R = K.run([uF - 0.25, v0], [uF - 0.25, v1]); const o = { s0: 1.95, s1: 4.45, y0: yL, y1: yL + 5.9, doorTop: yL + 3.2 }; // rectangular opening (photo): arched wood doors under a tall gridded transom
    const WD = tint(M.woodDark, 0x8a5634);
    K.wall(R, ST, 0.3, 6.1, yL, yT, [o], 0.25); const DKG = M.glass.clone(); DKG.userData = { ...DKG.userData, interior: false }; DKG.name = 'r5a-dark-glass';
    K.fill(R, o, { kind: 'door', door: WD, glass: DKG, rev: 0.15 }); // dark glass: no lit interior behind the transom
    { const w = o.s1 - o.s0, rr = w / 2, cx = (o.s0 + o.s1) / 2, spring = o.y1 + 99; // gridded transom (photo: ~5 x 6 lights)
      { const ag = new THREE.TorusGeometry(rr - 0.08, 0.07, 5, 20, Math.PI); ag.translate(cx, o.doorTop - rr + 0.02, -0.12); K.addRun(R, WD, ag, { detail: true }); const tg = new THREE.Shape(); tg.moveTo(o.s0, o.doorTop); tg.lineTo(o.s0, o.doorTop - rr); tg.absarc(cx, o.doorTop - rr, rr, Math.PI, 0, true); tg.lineTo(o.s1, o.doorTop); tg.lineTo(o.s0, o.doorTop); const sg = new THREE.ShapeGeometry(tg, 8); sg.translate(0, 0, -0.135); K.addRun(R, tint(M.woodDark, 0x6e4228), sg, { detail: true }); } // arched head of the door leaves
      for (let k = 1; k < 5; k++) { const x = o.s0 + w * k / 5, dx = x - cx, top = Math.min(o.y1 - 0.02, spring + Math.sqrt(Math.max(0, rr * rr - dx * dx)) - 0.02); K.rbox(R, WD, x - 0.025, o.doorTop, -0.15, x + 0.025, top, -0.11, { detail: true }); }
      for (let j = 1; j < 6; j++) { const y = o.doorTop + (o.y1 - o.doorTop) * j / 6; const hw = y <= spring ? rr : Math.sqrt(Math.max(0, rr * rr - (y - spring) ** 2)); if (hw < 0.15) continue; K.rbox(R, WD, cx - hw + 0.02, y - 0.025, -0.15, cx + hw - 0.02, y + 0.025, -0.11, { detail: true }); }
      K.rbox(R, WD, o.s0, o.doorTop - 0.06, -0.16, o.s1, o.doorTop + 0.08, -0.08, { detail: true }); }
    // balcony railing on the portico roof: balusters, a large central seal medallion and two smaller roundels
    { const RB = K.run([uP - 0.2, v0 - 0.2], [uP - 0.2, v1 + 0.2]); K.rbox(RB, CU, 0, yT + 2.33, -0.05, RB.L, yT + 2.41, 0.05); K.rbox(RB, CU, 0, yT + 1.27, -0.04, RB.L, yT + 1.33, 0.04);
      for (let s = 0.12; s < RB.L; s += 0.12) { const c = RB.L / 2; if (Math.abs(s - c) < 0.5 || Math.abs(Math.abs(s - c) - 1.75) < 0.3) continue; K.rbox(RB, CU, s - 0.017, yT + 1.25, -0.017, s + 0.017, yT + 2.33, 0.017, { detail: true }); }
      for (const [dv, r] of [[0, 0.5], [-1.75, 0.3], [1.75, 0.3], [-0.95, 0.13], [0.95, 0.13], [-2.6, 0.13], [2.6, 0.13]]) { const g = new THREE.TorusGeometry(r, 0.035, 5, 18); g.rotateY(Math.PI / 2); g.translate(uP - 0.2, yT + 1.8, dv); K.add(CU, g, { detail: true });
        const d = new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.03, 14); d.rotateZ(Math.PI / 2); d.translate(uP - 0.2, yT + 1.8, dv); K.add(CU, d, { detail: true }); } }
    // one long straight red-brick flight from the lower walk up to the landing
    const uTop = uP - 0.6, TR = 0.39, RS = 0.155, sw = 2.3;
    let uFoot = uTop - 11.5, gF = K.g(uFoot - 0.6, 0);
    for (let it = 0; it < 3; it++) { const n0 = Math.max(3, Math.round((yL - gF) / RS)); uFoot = uTop - n0 * TR; gF = Math.min(K.g(uFoot - 0.7, 0), K.g(uFoot - 0.7, -1.6), K.g(uFoot - 0.7, 1.6)); }
    const n = Math.max(3, Math.round((yL - gF) / RS)); uFoot = uTop - n * TR; const rise = (yL - gF) / n;
    walkables.push(K.stairs(BRK, uFoot, -sw, uTop, sw, gF, yL, '+u', n, { foot: 1.8 }));
    for (let i = 0; i < n; i++) K.box(NOSE, uFoot + TR * i - 0.004, gF + rise * (i + 1) - 0.035, -sw + 0.01, uFoot + TR * i + 0.06, gF + rise * (i + 1) + 0.004, sw - 0.01, { detail: true }); // pale nosings
    const slope = (yL - gF) / (uTop - uFoot), yAt = (u) => gF + (u - uFoot) * slope; // nosing line
    const pipe = (mat, a, b, r) => { const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = d.length(); const g = new THREE.CylinderGeometry(r, r, L, 6); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a[0], a[1], a[2]); K.add(mat, g, { detail: true }); };
    for (const vs of [-1, 1]) {
      const vc = vs * (sw + 0.19);
      // sloped cheek wall with a smooth coping ~0.25 m above the nosings, square blocks at both ends
      const sh = new THREE.Shape(); sh.moveTo(uFoot - 0.3, gF - 1.8); sh.lineTo(uTop - 0.4, yL - 1.8); sh.lineTo(uTop - 0.4, yAt(uTop - 0.4) + 0.27); sh.lineTo(uFoot - 0.3, yAt(uFoot - 0.3) + 0.27); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.38, bevelEnabled: false }); g.translate(0, 0, vc - 0.19); K.add(CON, g);
      K.box(CON, uTop - 0.55, yL - 0.9, vc - 0.27, uTop, yL + 0.95, vc + 0.27); K.box(CON, uTop - 0.6, yL + 0.95, vc - 0.31, uTop + 0.05, yL + 1.03, vc + 0.31);
      colliders.push(K.colPoly(rect(uFoot - 0.3, vc - 0.2, uTop, vc + 0.2), gF - 1, yL + 1.0));
      // black steel pipe handrail on posts set into the coping
      const ua = uFoot + 0.15, ub = uTop - 0.75;
      pipe(RAIL, [ua, yAt(ua) + 0.95, vc], [ub, yAt(ub) + 0.95, vc], 0.025);
      pipe(RAIL, [ua - 0.3, yAt(ua) + 0.95, vc], [ua, yAt(ua) + 0.95, vc], 0.025);
      const np = Math.max(2, Math.round((ub - ua) / 1.5)); for (let k = 0; k <= np; k++) { const u = ua + (ub - ua) * k / np; pipe(RAIL, [u, yAt(u) + 0.25, vc], [u, yAt(u) + 0.95, vc], 0.02); }
      // spreading juniper masses on the slope beside the flight
      const X = rnMats(M);
      for (let k = 0; k < 10; k++) { const u = uFoot + 0.6 + (uTop - uFoot - 1.2) * (k + 0.5) / 10, v = vs * (sw + 2.0 + ((k * 7) % 3) * 0.5);
        const jg = new THREE.IcosahedronGeometry(1, 1); jg.scale(1.35 + (k % 2) * 0.4, 0.68, 1.15); jg.translate(u, Math.max(K.g(u, v), yAt(u) - 0.3) + 0.2, v); K.add(k % 3 ? X.leafA : X.leafC, jg, { detail: true });
        if (k % 2) { const jg2 = new THREE.IcosahedronGeometry(1, 1); jg2.scale(1.2, 0.6, 1.0); const v2 = v + vs * 2.0; jg2.translate(u + 0.4, Math.max(K.g(u + 0.4, v2), yAt(u) - 0.5) + 0.18, v2); K.add(X.leafA, jg2, { detail: true }); } }
    }
    { const X = rnMats(M); const RW = K.run([-11.0, -26.6], [-11.0, 26.6]); planting(K, RW, 1.0, RW.L - 1.0, { d0: 0.1, depth: 1.3, h: 0.9, skip: [[RW.L / 2 - 4.2, RW.L / 2 + 4.2]], seed: 61 }); }
    // black cast-iron campus lamp in the planting south of the flight
    { const lu = uFoot + 1.0, lv = sw + 1.25, lg = K.g(lu, lv); K.cyl(RAIL, lu, lg - 0.2, lv, 0.17, 0.14, 0.75); K.cyl(RAIL, lu, lg + 0.55, lv, 0.075, 0.055, 3.1, 8);
      K.lathe(RAIL, [[0.12, 0], [0.16, 0.06], [0.05, 0.12]], lu, lg + 3.62, lv, 8); K.lathe(M.lampGlow, [[0.1, 0], [0.19, 0.28], [0.17, 0.5], [0.06, 0.58]], lu, lg + 3.72, lv, 8);
      K.lathe(RAIL, [[0.2, 0], [0.12, 0.12], [0.02, 0.22]], lu, lg + 4.28, lv, 8); colliders.push(K.colCyl(lu, lv, 0.2, lg - 1, lg + 4.4)); }
    // the tall columnar cypress right (south) of the portico (photo)
    { const cu = -14.6, cv = 6.4, cg = K.g(cu, cv), X = rnMats(M); K.cyl(X.bark, cu, cg - 0.2, cv, 0.16, 0.12, 0.9, 6);
      const pr = [[0.05, 0], [0.62, 0.35], [0.88, 1.6], [0.9, 3.0], [0.8, 4.6], [0.6, 6.0], [0.36, 7.2], [0.12, 8.1], [0.02, 8.5]];
      K.lathe(X.leafA, pr, cu, cg + 0.5, cv, 10); colliders.push(K.colCyl(cu, cv, 0.5, cg - 1, cg + 6)); }
    // pendant lantern
    K.cyl(M.iron, uP + 1.2, yT - 0.9, 0, 0.01, 0.01, 0.9, 4, { detail: true }); K.lathe(M.lampGlow, [[0.05, 0], [0.18, 0.1], [0.2, 0.45], [0.08, 0.6]], uP + 1.2, yT - 1.5, 0, 8, { detail: true });
  }
  // [r5a] diaper-relief pier panels marking the centre block's outer bay divisions on the long fronts (photo: grey-beige
  // stamped lattice strips, #a9a391), and a fuller garland + cartouche on each attic panel so the reliefs read at distance
  { const PAN = tint(M.stucco, 0xa7a49a), DIA = tint(M.stucco, 0xc6c2b6);
    for (const [a, b] of [[[-11.0, -26.6], [-11.0, 26.6]], [[11.0, 26.6], [11.0, -26.6]]]) { const R = K.run(a, b); const bwid = R.L / Math.round(R.L / 3.55);
      for (const s of [bwid * 4, R.L - bwid * 4]) {
        K.rbox(R, PAN, s - 0.4, FL + 0.35, 0.0, s + 0.4, 10.15, 0.035);
        for (let y = FL + 0.6; y < 10.0; y += 0.42) for (const dx of [-0.17, 0.17]) { const g = new THREE.BoxGeometry(0.21, 0.21, 0.04); g.rotateZ(Math.PI / 4); g.translate(s + dx, y + (dx > 0 ? 0.21 : 0), 0.05); K.addRun(R, DIA, g, { detail: true }); }
      } } }
  // [r5a] black iron grilles over the basement windows (all round), as in the photos
  { const IRON = solid(0x202020, 0.55, 0.5);
    for (const R of runs || []) { const nb = Math.round(R.L / 3.55); const bw = R.L / nb;
      for (let i = 0; i < nb; i++) { if (R.L > 40 && i === 7) continue; const c = (i + 0.5) * bw;
        for (let k = 0; k <= 5; k++) { const s = c - 0.6 + 0.24 * k; K.rbox(R, IRON, s - 0.017, BWY - 0.02, 0.0, s + 0.017, BWY + 0.97, 0.05, { detail: true }); }
        for (const y of [BWY + 0.03, BWY + 0.92]) K.rbox(R, IRON, c - 0.64, y - 0.02, 0.0, c + 0.64, y + 0.02, 0.055, { detail: true }); } } }
  const object3d = K.finish(); object3d.name = 'haviland-hall';
  return { object3d, colliders, walkables };
}
