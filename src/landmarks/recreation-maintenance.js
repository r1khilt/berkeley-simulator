// Tilden Vocational Building (D-8, 1952; Fred Langhorst, Donald Kirby & Thomas Mulvin) for the California School for
// the Deaf — Clark Kerr Campus Building 23, now archives/maintenance (OSM: "Recreation Maintenance"). The first break from
// the campus's Spanish imagery: an industrial saw-tooth shop with glazed north-light monitors and partly metal-clad
// slopes, balanced by a low flat-roofed classroom wing with broad overhangs and long horizontal banks of French doors and
// casements opening onto terraces (Bay Region / Wright vocabulary). Heights from the 2021 LiDAR (teeth rise ~3.3 m).
import * as THREE from 'three';
import { CKKit } from './lib/clarkkerr-kit.js';

export const info = {
  id: 'recreation-maintenance',
  name: 'Tilden Vocational Building',
  subtitle: 'Langhorst, Kirby & Mulvin · 1952',
  blurb: 'Built in 1952 as the vocational shops of the California School for the Deaf, this saw-tooth-roofed building was the campus\u2019s first departure from its Spanish Colonial Revival style. It now serves the Clark Kerr Campus as archive and maintenance space.',
  replaces: ['w/128467267'],
};

export async function build(ctx) {
  const K = new CKKit(ctx, -31.5); const C = K.C; const M = ctx.M;
  const metal = M.concreteDark.clone(); metal.color = new THREE.Color(0x9a5a48); metal.roughness = 0.6; metal.metalness = 0.35;
  const gmin = (u0, v0, u1, v1) => K.gMin(u0, v0, u1, v1, 6);
  // ---------- low flat-roofed classroom wing (L: west range + north strip) ----------
  const Wr = { u0: -23.4, u1: -13.5, v0: -30.1, v1: 3.1 }, Nr = { u0: -13.5, u1: 0.8, v0: -30.1, v1: -25.4 };
  const topW = 4.85;
  for (const r of [Wr, Nr]) {
    const FL = gmin(r.u0, r.v0, r.u1, r.v1) + 0.35; r.FL = FL; const y0 = FL - 1.6;
    K.wingGroup([{ ...r, y0, eave: topW - 0.35, core: true, roof: { type: 'flat', parapet: 0, overhang: 1.4, edgeMat: C.trim } }], (w, f, R, s0, s1) => {
      if ((r === Wr && f === 'E') || (r === Nr && (f === 'W' || f === 'S'))) return { ops: [] };
      if (topW - 0.35 - FL < 2.6) return { ops: [] };
      // horizontal band: French doors alternating with casement groups
      const n = Math.max(1, Math.round((s1 - s0 - 1) / 2.2)); const bw = (s1 - s0 - 1) / n; const ops = [];
      for (let i = 0; i < n; i++) { const c = s0 + 0.5 + bw * (i + 0.5); const door = (f === 'W' || f === 'N') && i % 3 === 1; ops.push(door ? { s0: c - 0.8, s1: c + 0.8, y0: FL + 0.02, y1: FL + 2.3, kind: 'french', panes: [4, 5], sill: false } : { s0: c - bw / 2 + 0.12, s1: c + bw / 2 - 0.12, y0: FL + 0.9, y1: FL + 2.3, kind: 'casement', panes: [4, 4] }); }
      return { ops };
    });
    K.box(C.trim, r.u0 - 1.4, topW - 0.35, r.v0 - 1.4, r.u1 + 1.4, topW - 0.3, r.v1 + 1.4); // soffit board
  }
  // terraces with steps along the west range
  { const g = gmin(Wr.u0 - 3, Wr.v0, Wr.u0, Wr.v1); K.box(C.conc, Wr.u0 - 3.0, g - 1, Wr.v0 + 2, Wr.u0, Wr.FL + 0.02, Wr.v1 - 2); K.walkRect(Wr.u0 - 3.0, Wr.v0 + 2, Wr.u0, Wr.v1 - 2, Wr.FL + 0.02);
    const n = Math.max(1, Math.round((Wr.FL - g) / 0.16)); for (let k = 0; k < n; k++) K.box(C.conc, Wr.u0 - 3.0 - (n - k) * 0.32, g - 1, -14 - 1.6, Wr.u0 - 3.0 - (n - k - 1) * 0.32, g + (Wr.FL - g) * (k + 1) / n, -14 + 1.6); }

  // ---------- flat-roofed shop annexes (center + south) ----------
  const F1 = { u0: -14.4, u1: 0.8, v0: 1.0, v1: 25.4 }, F2 = { u0: -7.8, u1: 14.3, v0: 25.4, v1: 35.6 };
  for (const r of [F1, F2]) {
    const FL = gmin(r.u0, r.v0, r.u1, r.v1) + 0.25; const y0 = FL - 1.6; const top = 5.75;
    K.wingGroup([{ ...r, y0, eave: top, roof: { type: 'flat', parapet: 0.3 } }], (w, f, R, s0, s1) => {
      if ((r === F1 && f === 'E') || (r === F2 && f === 'N')) return false;
      const ops = K.bays(s0, s1, { bay: 4.0, edge: 1.0, floors: [{ y: Math.max(FL + 1.0, K.gMaxRun(R, s0, s1) + 0.6), h: 1.8, w: 2.8, kind: 'industrial', panes: [6, 4] }] }).filter((o) => o.y1 < top - 0.3);
      if (f === 'S' && r === F2) ops.push({ s0: R.L / 2 - 2.0, s1: R.L / 2 + 2.0, y0: FL + 0.02, y1: FL + 3.6, kind: 'industrial', panes: [6, 6], sill: false });
      return { ops };
    });
  }
  // ---------- saw-tooth shop ----------
  {
    const v0 = -25.4, v1 = 19.8;
    const teeth = [ // [u start (low), u end (high), y low, y high, v0, v1]
      [-13.5, -1.0, 5.85, 9.25, v0, 1.0],
      [-1.0, 13.6, 7.3, 10.6, v0, 25.4],
      [13.6, 21.2, 8.1, 9.6, v0, v1],
    ];
    const FL = gmin(-13, v0, 21, v1) + 0.2; const y0 = FL - 1.8;
    // side walls (north/south ends of the teeth) and the east/west walls
    const RW = K.run([-13.5, v0], [-13.5, 1.0]); // west face (only above the classroom roof is visible)
    K.facade(RW, 0, RW.L, { y0: 4.4, y1: 5.85, ops: [] });
    const RE = K.run([21.2, v1], [21.2, v0]); K.facade(RE, 0, RE.L, { y0, y1: 9.6, ops: K.bays(0, RE.L, { bay: 4.5, edge: 1.0, floors: [{ y: Math.max(FL + 1.2, K.gMaxRun(RE, 0, RE.L) + 0.5), h: 2.2, w: 3.2, kind: 'industrial', panes: [7, 5] }] }).filter((o) => o.y1 < 9.2) });
    // end walls of each tooth (north at tv0, south at tv1) following the saw-tooth profile, plus metal cladding
    for (const [ua, ub, yl, yh, tv0, tv1] of teeth) {
      for (const isN of [true, false]) {
        const R = isN ? K.run([ub, tv0], [ua, tv0]) : K.run([ua, tv1], [ub, tv1]);
        const L = R.L; const yAt = (s) => (isN ? yh + (yl - yh) * (s / L) : yl + (yh - yl) * (s / L));
        const gb = K.gMinRun(R, 0, L, 0.4) - 1.0;
        const sh = new THREE.Shape(); sh.moveTo(0, gb); sh.lineTo(L, gb); sh.lineTo(L, yAt(L)); sh.lineTo(0, yAt(0)); sh.lineTo(0, gb);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); g.translate(0, 0, -0.3); K.addRun(R, C.wall, g);
        const yb = Math.max(gb + 3.2, Math.min(yl, yh) - 1.6);
        const sh2 = new THREE.Shape(); sh2.moveTo(0.05, yb); sh2.lineTo(L - 0.05, yb); sh2.lineTo(L - 0.05, yAt(L - 0.05) - 0.04); sh2.lineTo(0.05, yAt(0.05) - 0.04); sh2.lineTo(0.05, yb);
        const g2 = new THREE.ExtrudeGeometry(sh2, { depth: 0.05, bevelEnabled: false }); K.addRun(R, metal, g2);
        // a big shop door / window pair low in each end wall
        const gl = K.gMaxRun(R, 0, L, 0.4);
        K.rbox(R, C.sash, L * 0.3 - 1.6, gl, 0.0, L * 0.3 + 1.6, gl + 3.2, 0.06);
        for (let k = 1; k < 6; k++) K.rbox(R, C.louver, L * 0.3 - 1.6, gl + k * 0.53, 0.06, L * 0.3 + 1.6, gl + k * 0.53 + 0.04, 0.08, { detail: true });
      }
    }
    // roof slopes + vertical glazed monitors facing +u
    for (const [ua, ub, yl, yh, tv0, tv1] of teeth) {
      K._poly(metal, [[ua, yl, tv0 - 0.3], [ub, yh, tv0 - 0.3], [ub, yh, tv1 + 0.3], [ua, yl, tv1 + 0.3]], true, { uvMode: 'roof' });
      // standing seams (detail)
      for (let v = tv0; v <= tv1; v += 0.6) { const L = Math.hypot(ub - ua, yh - yl); const g = new THREE.BoxGeometry(L, 0.05, 0.04); g.rotateZ(Math.atan2(yh - yl, ub - ua)); g.translate((ua + ub) / 2, (yl + yh) / 2 + 0.03, v); K.add(metal, g, { detail: true }); }
      // monitor glazing at the high edge (down to the next tooth's low line)
      const next = teeth.find((t) => Math.abs(t[0] - ub) < 0.01);
      const yBot = next ? next[2] : 6.0;
      if (yh - yBot > 0.6) {
        const R = K.run([ub, tv1], [ub, tv0]);
        const n = Math.max(1, Math.round(R.L / 3.0)); const ops = [];
        for (let i = 0; i < n; i++) { const s0 = R.L * i / n + 0.12, s1 = R.L * (i + 1) / n - 0.12; ops.push({ s0, s1, y0: yBot + 0.25, y1: yh - 0.2, kind: 'industrial', panes: [6, Math.max(2, Math.round((yh - yBot) / 0.5))], sill: false, rev: 0.12 }); }
        K.facade(R, 0, R.L, { y0: yBot - 0.02, y1: yh, ops, depth: 0.2, mat: metal });
      }
      K.box(C.concDark, ua + 0.2, y0, tv0 + 0.3, ub - 0.2, yl - 0.1, tv1 - 0.3);
    }
    K.colRect(-13.5, v0, 21.2, v1, y0, 11);
  }
  K.colRect(Wr.u0, Wr.v0, Wr.u1, Wr.v1, -2, topW + 0.5); K.colRect(Nr.u0, Nr.v0, Nr.u1, Nr.v1, -2, topW + 0.5);
  const object3d = K.finish();
  object3d.name = 'tilden-vocational';
  return { object3d, colliders: K.colliders, walkables: K.walkables };
}
