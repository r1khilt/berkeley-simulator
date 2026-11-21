// The Law Building (formerly Boalt Hall), UC Berkeley School of Law. The 1951 stripped-classical hall (west wing) has
// blank end walls above recessed glazed entrance storeys, each carrying a dark stone panel with a quotation (Cardozo,
// Holmes), long sides lined with giant concrete piers, and a low hipped roof behind the parapet. Later concrete
// additions (library stacks, offices) step up to ~28 m around it toward Piedmont Avenue; a low skylit wing runs south
// to the 2011 South Law Building. Massing follows the 2021 LiDAR.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { modBlock, modFacade, paleGlass, campusLamp, drapeStrip, shrubRow, tint, textPanel } from './lib/b05a-kit.js';
import { castConcreteMat, inscriptionPanel } from './lib/reast-kit.js';

const CARDOZO = 'YOU WILL STUDY THE WISDOM OF THE PAST, FOR IN A WILDERNESS OF CONFLICTING COUNSELS A TRAIL HAS THERE BEEN BLAZED. YOU WILL STUDY THE LIFE OF MANKIND, FOR THIS IS THE LIFE YOU MUST ORDER, AND, TO ORDER WITH WISDOM, MUST KNOW. YOU WILL STUDY THE PRECEPTS OF JUSTICE, FOR THESE ARE THE TRUTHS THAT THROUGH YOU SHALL COME TO THEIR HOUR OF TRIUMPH. HERE IS THE HIGH EMPRISE, THE FINE ENDEAVOR, THE SPLENDID POSSIBILITY OF ACHIEVEMENT, TO WHICH I SUMMON YOU AND BID YOU WELCOME.\nCARDOZO';
const HOLMES = 'WHEN I THINK THUS OF THE LAW, I SEE A PRINCESS MIGHTIER THAN SHE WHO ONCE WROUGHT AT BAYEUX, ETERNALLY WEAVING INTO HER WEB DIM FIGURES OF THE EVER-LENGTHENING PAST, FIGURES TOO DIM TO BE NOTICED BY THE IDLE, TOO SYMBOLIC TO BE INTERPRETED EXCEPT BY HER PUPILS, BUT TO THE DISCERNING EYE DISCLOSING EVERY PAINFUL STEP AND EVERY WORLD-SHAKING CONTEST BY WHICH MANKIND HAS WORKED AND FOUGHT ITS WAY FROM SAVAGE ISOLATION TO ORGANIC SOCIAL LIFE.\nHOLMES';

export const info = {
  id: 'the-law-building',
  name: 'The Law Building',
  subtitle: 'Berkeley Law · 1951',
  blurb: 'Home of the UC Berkeley School of Law. Opened in 1951 as Boalt Hall, it was renamed the Law Building in 2020; quotations from Justices Cardozo and Holmes are carved over its entrances.',
  replaces: ['w/27293995'],
};

export async function build(ctx) {
  const M = ctx.M;
  const K = new Kit(ctx, Math.atan2(-50.0 + 40.4, 41.5 + 16.4));
  const C = castConcreteMat(0xf2ede3);   // refine-east: smooth warm-grey cast concrete with pour lines and staining
  const CD = castConcreteMat(0xd3cbbb);  // shadowed / older concrete
  const FR = M.darkBronze; const GL = M.windowNight; // refine-east: shared window material
  const SL = new THREE.MeshStandardMaterial({ color: 0x47525c, roughness: 0.35, metalness: 0.1 }); // dark slate panels
  const colliders = [], walkables = [];
  const box = (m, u0, y0, v0, u1, y1, v1, o) => K.box(m, u0, y0, v0, u1, y1, v1, o);

  // ---------- west wing: the 1951 hall ----------
  const wu0 = -57.0, wu1 = -32.6, wv0 = -17.6, wv1 = 39.0;
  const gN = K.g(-44.8, wv0 - 3), gS = K.g(-44.8, wv1 + 1.5);
  const FL = Math.max(gN, gS, K.g(wu0 + 1, 10), K.g(wu1 - 1, 10)) + 0.45; // ground-floor level
  const EAVE = 14.2;
  {
    // end façades (N, S): recessed glazed ground storey, projecting band, blank wall with an inscription panel
    for (const f of ['N', 'S']) {
      const R = f === 'N' ? K.run([wu1, wv0], [wu0, wv0]) : K.run([wu0, wv1], [wu1, wv1]);
      const L = R.L, gs = FL + 4.1;
      K.wall(R, C, 0, L, gs, EAVE, [], 0.5);
      K.wall(R, C, 0, 1.6, -2, gs, [], 0.5); K.wall(R, C, L - 1.6, L, -2, gs, [], 0.5);
      // recessed storefront between square piers
      const n = 6; const bw = (L - 3.2) / n;
      K.rbox(R, CD, 1.6, -2, -1.85, L - 1.6, FL, -0.1);
      for (let i = 0; i < n; i++) {
        const s0 = 1.6 + i * bw, s1 = s0 + bw; const mid = i === 2 || i === 3;
        const o = { s0: s0 + 0.45, s1: s1 - 0.45, y0: FL, y1: gs - 0.35 };
        const R2 = K.run(R.at(0, -1.65), R.at(L, -1.65));
        if (mid) K.fill(R2, { ...o, doorTop: FL + 2.5, sill: false }, { kind: 'door', rev: 0.02, door: GL, frame: M.bronze });
        else { K.rbox(R2, CD, o.s0, FL, -0.4, o.s1, FL + 0.6, 0.0); K.fill(R2, { ...o, y0: FL + 0.6 }, { glass: GL, frame: FR, mull: 1, tran: [FL + 2.9], rev: 0.02, sill: false }); }
        if (i > 0) K.rbox(R, C, s0 - 0.5, -1.5, -1.8, s0 + 0.5, gs, 0.12);
      }
      K.rbox(R, C, 1.6, gs - 0.35, -1.8, L - 1.6, gs, 0.0); // head beam / soffit over the recessed storefront
      K.rbox(R, CD, 1.6, gs - 0.42, -1.8, L - 1.6, gs - 0.35, -0.05);
      K.rbox(R, C, -0.25, gs, -0.2, L + 0.25, gs + 0.5, 0.4); // projecting fascia band
      // dark stone inscription panel with raised lines of lettering
      const pw = 8.6, ph = 6.4, py = gs + 1.6;
      K.rbox(R, SL, L / 2 - pw / 2 - 0.12, py - 0.12, 0, L / 2 + pw / 2 + 0.12, py + ph + 0.12, 0.08);
      inscriptionPanel(K, R, L / 2 - pw / 2, L / 2 + pw / 2, py, py + ph, 0.085, f === 'S' ? CARDOZO : HOLMES, { px: 66, lineGap: 1.38, sig: f === 'S' ? 'CARDOZO' : 'HOLMES' });
      K.rbox(R, C, -0.1, EAVE, -0.3, L + 0.1, EAVE + 0.15, 0.08); // coping
      // entrance steps
      const gE = K.g(...(f === 'N' ? [-44.8, wv0 - 3] : [-44.8, wv1 + 2]));
      const ns = Math.max(2, Math.round((FL - gE) / 0.16));
      if (FL - gE > 0.2) {
        const sd = ns * 0.33;
        walkables.push(f === 'N' ? K.stairs(CD, -50.5, wv0 - sd, -39.0, wv0, gE, FL, '+v', ns) : K.stairs(CD, -50.5, wv1, -39.0, wv1 + sd, gE, FL, '-v', ns));
      }
      // tube handrails
      for (const uu of [-48.2, -44.8, -41.3]) { const vA = f === 'N' ? wv0 - 0.2 : wv1 + 0.2, vB = f === 'N' ? wv0 - ns * 0.33 : wv1 + ns * 0.33; const g = new THREE.CylinderGeometry(0.03, 0.03, Math.abs(vB - vA), 6); g.rotateX(Math.PI / 2); g.translate(uu, (FL + gE) / 2 + 0.95, (vA + vB) / 2); K.add(M.iron, g, { detail: true }); }
    }
    // long façades (E, W): giant piers carrying a deep entablature slab; tall windows above, smaller below
    for (const f of ['W', 'E']) {
      const R = f === 'W' ? K.run([wu0, wv0], [wu0, wv1]) : K.run([wu1, wv1], [wu1, wv0]);
      const L = R.L; const n = 14; const bw = L / n; const yA = FL + 4.4;
      const ops = [];
      for (let i = 0; i < n; i++) { const c = bw * (i + 0.5); ops.push({ s0: c - 0.45, s1: c + 0.45, y0: FL + 0.9, y1: FL + 3.3 }, { s0: c - 0.7, s1: c + 0.7, y0: yA + 0.4, y1: EAVE - 1.5 }); }
      if (f === 'W') { ops.splice(12, 1, { s0: bw * 6.5 - 0.9, s1: bw * 6.5 + 0.9, y0: FL, y1: FL + 3.2, door: true }); }
      K.wall(R, C, 0, L, -2, EAVE - 1.0, ops, 0.4);
      for (const o of ops) o.door ? K.fill(R, { ...o, doorTop: FL + 2.4, sill: false }, { kind: 'door', rev: 0.3, door: GL, frame: M.bronze }) : K.fill(R, o, { glass: GL, frame: FR, mull: o.y1 - o.y0 > 3 ? 1 : 0, tran: o.y1 - o.y0 > 3 ? [o.y0 + 1.2, o.y0 + 2.4] : [o.y0 + 1.5], rev: 0.28, sillMat: C });
      for (let i = 0; i <= n; i++) { const s = bw * i; if (i === 0 || i === n) continue; K.rbox(R, C, s - 0.3, FL - 0.2, 0, s + 0.3, EAVE - 1.0, 1.1); }
      K.rbox(R, CD, 0.3, FL - 0.6, 0, L - 0.3, FL + 0.05, 1.3); // bench plinth along the base
      K.rbox(R, C, -0.2, EAVE - 1.0, -0.2, L + 0.2, EAVE + 0.15, 1.25);  // flat overhanging slab over the piers
    }
    box(M.concreteDark, wu0 + 0.6, -2, wv0 + 2.0, wu1 - 0.6, EAVE - 0.05, wv1 - 2.0); // core (kept behind the recessed storefronts)
    box(M.concreteDark, wu0 + 0.6, FL + 4.1, wv0 + 0.6, wu1 - 0.6, EAVE - 0.05, wv1 - 0.6);
    // low hipped roof behind the parapet (LiDAR ridge ~17.5 m)
    K.hip(tint(K, M.concrete, 0x9a958b, 'lawRoof'), wu0 + 1.2, wv0 + 1.2, wu1 - 1.2, wv1 - 1.2, EAVE + 0.1, 0.16); // low roof, hidden behind the parapet
    for (const [a, b] of [[[wu0, wv0], [wu0, wv1]], [[wu0, wv1], [wu1, wv1]], [[wu1, wv1], [wu1, wv0]], [[wu1, wv0], [wu0, wv0]]]) { const Rp = K.run(a, b); K.rbox(Rp, C, -0.25, EAVE + 0.1, -0.35, Rp.L + 0.25, EAVE + 1.05, 0.05); K.rbox(Rp, M.iron, -0.27, EAVE + 1.05, -0.38, Rp.L + 0.27, EAVE + 1.12, 0.08, { detail: true }); }
    colliders.push(K.colPoly([[wu0, wv0], [wu1, wv0], [wu1, wv1], [wu0, wv1]], -2, 18));
  }
  // ---------- later additions (flat-roofed concrete) ----------
  const floorsTo = (y0, top, h = 3.6) => { const out = []; for (let y = y0; y + h <= top - 0.8; y += h) out.push({ y0: y, y1: y + h }); return out; };
  const add = (u0, u1, v0, v1, top, faces, opts = {}) => {
    const fl = floorsTo(Math.max(-1.5, K.gMin(u0, v0, u1, v1, 4)) + 0.3, top, opts.fh || 3.6);
    modBlock(K, { u0, u1, v0, v1, y0: -2.5, top, wall: C, frame: FR, glass: GL, floors: fl, bay: 3.2, kind: 'grid', win: { w: 0.5, h: 2.1, sill: 0.9, mull: 1 }, parapet: 0.8, faces, ...opts });
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2.5, top));
  };
  // connector east of the hall (three storeys, pier-screened)
  add(-32.6, -9.5, -13.0, 11.9, 17.6, { W: { kind: 'piers', pier: { w: 0.55, p: 0.5 }, win: { h: 2.6, sill: 0.5 } }, E: false, N: { kind: 'piers', pier: { w: 0.55, p: 0.5 } } });
  // north stack block (library addition) — tall, regular punched windows
  add(-9.6, 10.0, -42.5, -28.0, 23.6, { S: false, E: false });
  add(10.0, 37.0, -42.5, -28.0, 22.4, { S: false, W: false });
  add(37.0, 49.2, -42.5, -20.2, 24.4, { W: false });
  // link (lower) between the north block and the central block; its west end rises with the central stacks
  add(-9.6, 1.0, -28.0, -20.2, 25.4, { N: false, E: false, S: false });
  add(1.0, 37.0, -28.0, -20.2, 17.4, { N: false, W: false, E: false }, { kind: 'ribbon', win: { h: 1.6, sill: 1.0 } });
  // central tall block (library stacks)
  add(-9.5, 20.0, -20.2, 0.0, 27.2, { E: false, N: false }, { kind: 'piers', pier: { w: 0.5, p: 0.4 }, win: { h: 2.4, sill: 0.6 } });
  modBlock(K, { u0: 1.0, u1: 12.0, v0: -15.0, v1: -7.0, y0: 26.0, top: 29.8, wall: CD, floors: [], kind: 'blank', parapet: 0.3 }); // mechanical penthouse
  // east offices
  add(20.0, 49.5, -20.2, 0.0, 21.2, { W: false, N: false });
  // south band (faces the courtyards)
  add(-17.1, 26.2, 0.0, 16.0, 19.6, { N: false }, { kind: 'piers', pier: { w: 0.45, p: 0.35 }, win: { h: 2.3, sill: 0.7 } });
  add(26.2, 49.9, 0.0, 12.2, 20.2, { N: false, W: false }, { kind: 'piers', pier: { w: 0.45, p: 0.35 }, win: { h: 2.3, sill: 0.7 } });
  add(49.9, 57.8, -0.2, 12.2, 18.4, { W: false });
  // low skylit wing running south to the South Law Building
  {
    const u0 = -17.5, u1 = 25.4, v0 = 16.0, v1 = 41.0, top = 9.6;
    const fl = [{ y0: Math.max(-1.5, K.gMin(u0, v0, u1, v1, 4)) + 0.3, y1: top - 1.2 }];
    modBlock(K, { u0, u1, v0, v1, y0: -2.5, top, wall: C, frame: FR, glass: GL, floors: fl, bay: 3.4, kind: 'ribbon', win: { h: 3.2, sill: 0.6 }, mullion: 1.7, parapet: 0.8, faces: { N: false } });
    for (const [a, b, c, d] of [[-1.0, 3.0, 17.5, 29.5], [4.2, 8.2, 17.5, 29.5], [-12.5, -8.8, 21.0, 35.5]]) { // skylight monitors
      box(GL, a, top - 0.8, c, b, top + 2.7, d);
      box(C, a - 0.25, top + 2.7, c - 0.3, b + 0.25, top + 3.0, d + 0.3);
    }
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2.5, top));
  }
  // site: paving apron along the hall's entrance fronts and a few lamps
  drapeStrip(K, [[wu0, wv0], [wu1, wv0]], -3.5, M.paving, { closed: false });
  drapeStrip(K, [[wu1, wv1], [wu0, wv1]], -2.5, M.paving, { closed: false });
  {
    const gS2 = K.g(-34.5, wv1 + 4.5); const Lw = 9.5;
    box(C, -37.5, gS2 - 0.6, wv1 + 4.2, -37.5 + Lw, gS2 + 1.35, wv1 + 4.6);                      // "BerkeleyLaw" sign wall
    box(SL, -36.6, gS2 + 0.75, wv1 + 4.6, -30.2, gS2 + 1.1, wv1 + 4.64, { detail: true });       // raised lettering band
    box(M.bronze, -35.4, gS2 + 0.35, wv1 + 4.6, -31.4, gS2 + 0.55, wv1 + 4.63, { detail: true }); // university plate
    const hedge = tint(K, M.turf, 0x3e5a2c, 'hedge');
    box(hedge, -37.5, gS2 + 1.35, wv1 + 4.2, -37.5 + Lw, gS2 + 2.6, wv1 + 5.4);
    colliders.push(K.colPoly([[-37.5, wv1 + 4.2], [-28, wv1 + 4.2], [-28, wv1 + 5.4], [-37.5, wv1 + 5.4]], gS2 - 0.6, gS2 + 2.6));
    const blue = new THREE.MeshStandardMaterial({ color: 0x2e7fd0, roughness: 0.8, side: THREE.DoubleSide });
    for (const [u, v] of [[-53.5, wv1 + 4.5], [-49.0, wv1 + 5.0]]) {
      const g0 = K.g(u, v); K.cyl(M.iron, u, g0, v, 0.03, 0.03, 2.5, 6, { detail: true });
      const cg = new THREE.ConeGeometry(1.5, 0.55, 10, 1, true); cg.translate(u, g0 + 2.5, v); K.add(blue, cg, { detail: true });
      K.cyl(M.whitePaint, u, g0 + 0.72, v, 0.45, 0.45, 0.04, 12, { detail: true }); K.cyl(M.iron, u, g0, v, 0.05, 0.05, 0.72, 6, { detail: true });
    }
    for (const [u, v] of [[-56.0, wv1 + 6.0], [-33.0, wv0 - 5.0]]) { const g0 = K.g(u, v); K.cyl(M.iron, u, g0, v, 0.08, 0.06, 4.4, 8, { detail: true }); K.cyl(M.lampGlow, u, g0 + 4.4, v, 0.45, 0.3, 0.12, 14, { detail: true }); }
    drapeStrip(K, [[wu0 - 4, wv1], [wu1 + 6, wv1]], 6.5, M.paving, { closed: false });
  }
  shrubRow(K, [wu0 - 0.3, wv1 - 2], [wu0 - 0.3, wv0 + 2], 0.0, { h: 0.9 });

  const object3d = K.finish(); object3d.name = 'the-law-building';
  return { object3d, colliders, walkables };
}
