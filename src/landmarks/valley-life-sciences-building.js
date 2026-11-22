// Valley Life Sciences Building (George W. Kelham, 1930; originally the Life Sciences Building). A vast Art Deco
// cast-concrete block: long north and south façades of giant fluted pilasters framing three-storey window strips with dark
// metal spandrels, over a podium with a frieze of roundels, under an inscribed entablature, a windowed attic and a cresting
// of palmette antefixes. Slightly projecting corner pavilions, two interior courts split by a central range (the west court
// infilled with the 1990s atrium/library), lower three-storey end wings to the east and west.
// Massing from the 2021 LiDAR: ranges ~24.6 m, central attic strip and penthouses ~29 m, end wings ~15 m.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, corniceProfile, tint, solid, flatRoof, courtWalls, polyWalls, inscription, rect } from './lib/b02-kit.js';

export const info = {
  id: 'valley-life-sciences-building',
  name: 'Valley Life Sciences Building',
  subtitle: 'George W. Kelham · 1930',
  blurb: 'Opened in 1930 as the Life Sciences Building, this enormous Art Deco block is decorated with friezes of plants and animals. Renovated and renamed for Wayne and Gladys Valley in the 1990s, it houses the UC Museum of Paleontology, whose T. rex cast stands in the atrium.',
  replaces: ['r/94099', 'relation/94099'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.5);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const ST = tint(M.stuccoWhite, 0xede3cf), STD = tint(M.stuccoWhite, 0xdbd1bd), ROOF = tint(M.concrete, 0xc4c1b9); // [r5a] warmer cream/buff cast stone (photo #e4dfd2 in sun; read cool grey in shade)
  const STEP = tint(M.concrete, 0xd9d3c5), NOSE = solid(0x8f897d, 0.9, 0.0); // [r5a] steps: concrete treads with a dark shadow line under each nosing so flights read as steps, not ramps
  const SP = solid(0x1d1e20, 0.6, 0.3), FR = solid(0x1b1c1e, 0.45, 0.5), LV = solid(0x8c8a84, 0.8, 0.2), DOOR = solid(0x2b2a27, 0.4, 0.6);
  const GL = M.windowNight;
  const colliders = [], walkables = [];
  const FL = 5.3, CT = 18.0, EN = 20.9, AT = 24.2, TOP = 25.3;
  const SOUTH_Y = 4.5; // [r5a] south entrance landing/doors (LiDAR ~4.5 m; OSM flight only ~4 m long from Campanile Way)
  const PW = 1.85; // pilaster width

  // clip a line (through p with direction dir) to the rectangle [a,b]x[y0,y1] (run coords) -> segment or null
  const clip = (px, py, dx, dy, a, b, y0, y1) => {
    let t0 = -1e9, t1 = 1e9;
    for (const [p, d, lo, hi] of [[px, dx, a, b], [py, dy, y0, y1]]) {
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; continue; }
      let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    }
    return t1 - t0 > 0.05 ? [px + dx * t0, py + dy * t0, px + dx * t1, py + dy * t1] : null;
  };
  const bar = (R, mat, x0, y0, x1, y1, d, w = 0.06, th = 0.06, opts = { detail: true }) => {
    const L = Math.hypot(x1 - x0, y1 - y0); const g = new THREE.BoxGeometry(L, w, th); g.rotateZ(Math.atan2(y1 - y0, x1 - x0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, d); K.addRun(R, mat, g, opts);
  };
  // palmette antefix template (in run coords, facing +z), 0.75 m tall
  const palm = (() => { const s = new THREE.Shape(); s.moveTo(-0.16, 0); s.lineTo(0.16, 0); s.lineTo(0.1, 0.18);
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.1 + 0.8 * i / 8); const r = i % 2 ? 0.5 : 0.62; s.lineTo(-Math.cos(a) * r * 0.62, 0.18 + Math.sin(a) * r); }
    s.lineTo(-0.1, 0.18); s.lineTo(-0.16, 0); return s; })();
  const antefix = (R, s, y, d) => { const g = new THREE.ExtrudeGeometry(palm, { depth: 0.16, bevelEnabled: false, curveSegments: 2 }); g.scale(1.35, 1.35, 1); g.translate(s, y, d - 0.08); K.addRun(R, ST, g); };

  // [r5a] basement-window bottom just above the local grade (max of three samples 1 m out), or null if under 0.4 m would show
  const lowY = (R, sc, hw) => { let gl = -1e9; for (const ds of [-hw, 0, hw]) gl = Math.max(gl, K.g(...R.at(sc + ds, 1.0))); const y0 = Math.max(0.0, gl + 0.3); return 2.4 - y0 >= 0.75 ? y0 : null; };
  const bwY = (R, sc, hw, y0n, y1n) => { let gl = -1e9; for (const ds of [-hw, 0, hw]) gl = Math.max(gl, K.g(...R.at(sc + ds, 1.0))); const y0 = Math.max(y0n, gl + 0.18); return y1n - y0 >= 0.4 ? y0 : null; };
  // ---------- the giant-order zone: pilasters + window strips (+ entrance bays) ----------
  // o: {top (cornice top), ct (capital top), floors:[spandrel y's], attic:bool, crest:bool, entrance:[bay idx], lattice, text}
  function giant(R, s0, s1, nb, o) {
    const p = (s1 - s0) / nb; const ct = o.ct ?? CT, en = o.en ?? EN, top = o.top ?? TOP;
    const gmin = Math.min(K.g(...R.at(s0, 1)), K.g(...R.at(s1, 1)), K.g(...R.at((s0 + s1) / 2, 1)));
    // podium (proud) with small basement windows, roundel frieze
    const RP = K.run(R.at(s0, 0.2), R.at(s1, 0.2));
    // [r5a] basement windows sit just above the local grade (were dropped wherever the lawn rose past 2.5 m, leaving long blank plinths)
    const bw = []; for (let i = 0; i < nb; i++) { const c = (i + 0.5) * p; if ((o.entrance || []).includes(i)) continue; const y0 = bwY(R, s0 + c, 0.65, 2.75, 3.85); if (y0 != null) bw.push({ s0: c - 0.65, s1: c + 0.65, y0, y1: 3.85 });
      const yl = lowY(R, s0 + c, 0.65); if (yl != null) bw.push({ s0: c - 0.65, s1: c + 0.65, y0: yl, y1: 2.4 }); } // + a lower row where the slope exposes the sub-basement
    K.wall(RP, STD, 0, s1 - s0, gmin - 1.5, 4.05, bw, 0.8);
    for (const w of bw) K.fill(RP, w, { mull: 1, rev: 0.3, frame: FR });
    // [r5a] o.doorY < FL (south front: LiDAR landing ~4.5 m): the water table and frieze band stop at the entrance bays so the doors drop to the landing
    const dY = o.doorY ?? FL, ents = o.entrance || [], lowDoor = dY < FL - 0.01 && ents.length;
    const spans = lowDoor ? [[s0, s0 + Math.min(...ents) * p + PW / 2], [s0 + (Math.max(...ents) + 1) * p - PW / 2, s1]] : [[s0, s1]];
    for (const [x0, x1] of spans) { K.rbox(R, STD, x0, 4.0, -0.6, x1, 4.18, 0.3); K.rbox(R, ST, x0, 4.18, -0.6, x1, FL, 0.12); } // water table + base frieze band
    if (lowDoor) for (const i of ents) for (const x of [s0 + i * p, s0 + (i + 1) * p]) { if (x <= spans[0][1] + 0.01 || x >= spans[1][0] - 0.01) continue; K.rbox(R, ST, x - PW / 2, dY - 0.05, -0.6, x + PW / 2, FL, 0.12); } // pier bases between the doors
    for (let i = 0; i < nb; i++) { const c = s0 + (i + 0.5) * p; if (lowDoor && ents.includes(i)) continue; // roundel + paired stems
      const g = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16); g.rotateX(Math.PI / 2); g.translate(c, 4.74, 0.18); K.addRun(R, ST, g, { detail: true });
      const g2 = new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12); g2.rotateX(Math.PI / 2); g2.translate(c, 4.74, 0.26); K.addRun(R, STD, g2, { detail: true });
      for (const dx of [-1.15, -0.95, 0.95, 1.15]) K.rbox(R, ST, c + dx - 0.05, 4.28, 0.12, c + dx + 0.05, 5.2, 0.2, { detail: true });
    }
    // pilasters
    for (let i = 0; i <= nb; i++) {
      const sc = s0 + i * p; const a = Math.max(s0, sc - PW / 2), b = Math.min(s1, sc + PW / 2);
      K.rbox(R, STD, a - (i ? 0.07 : 0), FL, -0.6, b + (i < nb ? 0.07 : 0), FL + 0.65, 0.09);
      K.rbox(R, ST, a, FL + 0.65, -0.6, b, ct - 0.95, 0);
      K.rbox(R, ST, a - (i ? 0.05 : 0), ct - 1.35, -0.6, b + (i < nb ? 0.05 : 0), ct - 0.9, 0.08); // capital necking
      K.rbox(R, ST, a - (i ? 0.12 : 0), ct - 0.9, -0.6, b + (i < nb ? 0.12 : 0), ct - 0.45, 0.16);
      K.rbox(R, ST, a - (i ? 0.24 : 0), ct - 0.45, -0.6, b + (i < nb ? 0.24 : 0), ct, 0.26); // flared abacus
      for (let k = 1; k <= 5; k++) { const x = a + (b - a) * k / 6; K.rbox(R, STD, x - 0.06, FL + 0.95, -0.02, x + 0.06, ct - 1.5, 0.0, { detail: true }); K.rbox(R, ST, x - 0.03, FL + 0.95, 0, x + 0.03, ct - 1.5, 0.04, { detail: true }); }
      for (let k = 0; k < 4; k++) { const x = a + (b - a) * (k + 0.5) / 4; K.rbox(R, STD, x - 0.1, ct - 0.85, 0.16, x + 0.1, ct - 0.5, 0.22, { detail: true }); K.rbox(R, ST, x - 0.07, ct - 1.3, 0.08, x + 0.07, ct - 0.9, 0.13, { detail: true }); }
    }
    // strips
    for (let i = 0; i < nb; i++) {
      const a = s0 + i * p + PW / 2, b = s0 + (i + 1) * p - PW / 2; const ent = (o.entrance || []).includes(i);
      if (!(lowDoor && ent)) K.rbox(R, ST, a, FL, -0.62, b, FL + 0.32, -0.28); // sill ledge
      K.rbox(R, FR, a, ct - 0.18, -0.62, b, ct, -0.5); // head
      K.rbox(R, GL, a, FL + 0.32, -0.66, b, ct - 0.18, -0.6);
      if (ent) {
        // [r5a] glazed bronze double doors (were flat black slabs): frame, two glass leaves, centre stile, push bars, gridded transom
        K.rbox(R, DOOR, a + 0.25, dY, -0.66, b - 0.25, FL + 2.8, -0.6); if (lowDoor) K.rbox(R, STD, a, dY - 0.1, -0.8, b, FL + 0.4, -0.66); // backing below the strip glass
        { const m = (a + b) / 2; for (const [x0, x1] of [[a + 0.42, m - 0.1], [m + 0.1, b - 0.42]]) { K.rbox(R, GL, x0, dY + 0.25, -0.6, x1, FL + 2.05, -0.585, { uvMode: 'keep' }); K.rbox(R, FR, x0 + 0.08, dY + 1.0, -0.585, x1 - 0.08, dY + 1.06, -0.55, { detail: true }); }
          K.rbox(R, GL, a + 0.42, FL + 2.18, -0.6, b - 0.42, FL + 2.68, -0.585, { uvMode: 'keep' }); for (let k = 1; k < 4; k++) { const x = a + 0.42 + (b - a - 0.84) * k / 4; K.rbox(R, FR, x - 0.03, FL + 2.18, -0.585, x + 0.03, FL + 2.68, -0.56, { detail: true }); } }
        K.rbox(R, FR, (a + b) / 2 - 0.05, dY, -0.585, (a + b) / 2 + 0.05, FL + 2.75, -0.53, { detail: true });
        K.rbox(R, FR, a - 0.05, FL + 2.85, -0.6, b + 0.05, FL + 3.45, 0.95); // marquee canopy
        // diamond lattice grille over the rest of the strip
        const y0 = FL + 3.5, y1 = ct - 0.18, step = 0.58; // [r5a] finer, denser lattice (photo), was 0.9 m with 0.11 bars
        for (let k = -Math.ceil((y1 - y0) / step) - 1; k <= Math.ceil((b - a + y1 - y0) / step) + 1; k++) for (const sg of [1, -1]) { const seg = clip(a + k * step, y0, 1, sg, a, b, y0, y1); if (seg) bar(R, FR, ...seg, -0.4, 0.075, 0.08); }
        for (const x of [a + 0.05, b - 0.05]) K.rbox(R, FR, x - 0.06, y0, -0.6, x + 0.06, y1, -0.38);
        K.rbox(R, SP, a, y0 - 0.05, -0.6, b, y0 + 0.05, -0.52, { detail: true });
      } else {
        for (const y of o.floors) K.rbox(R, SP, a, y, -0.62, b, y + 0.4, -0.55);
        for (let k = 1; k <= 3; k++) { const x = a + (b - a) * k / 4; K.rbox(R, FR, x - 0.04, FL + 0.32, -0.62, x + 0.04, ct - 0.18, -0.56); }
        const ys = [FL + 0.32, ...o.floors.flatMap((y) => [y, y + 0.4]), ct - 0.18];
        for (let j = 0; j < ys.length; j += 2) { const ya = ys[j], yb = ys[j + 1]; const n = Math.max(1, Math.round((yb - ya) / 0.95)); for (let k = 1; k < n; k++) { const y = ya + (yb - ya) * k / n; K.rbox(R, FR, a, y - 0.03, -0.62, b, y + 0.03, -0.57, { detail: true }); } }
      }
    }
    // entablature
    K.rbox(R, ST, s0, ct, -0.6, s1, ct + 0.5, 0.13);
    K.rbox(R, ST, s0, ct + 0.5, -0.6, s1, en - 0.8, 0.05);
    const fm = (ct + 0.5 + en - 0.8) / 2;
    const tw = o.text ? Math.min(o.text.length * 0.75 + 2, (s1 - s0) * 0.5) : 0; const tc = (s0 + s1) / 2;
    for (let x = s0 + 0.9; x < s1 - 0.6; x += 1.25) { if (o.text && Math.abs(x - tc) < tw / 2 + 0.5) continue; K.rbox(R, STD, x - 0.19, fm - 0.19, 0.05, x + 0.19, fm + 0.19, 0.11, { detail: true }); K.rbox(R, ST, x - 0.08, fm - 0.08, 0.11, x + 0.08, fm + 0.08, 0.15, { detail: true }); }
    if (o.text) inscription(K, R, tc - tw / 2, tc + tw / 2, ct + 0.62, en - 0.98, 0.056, o.text, { fg: '#5a5246', cut: true });
    for (let x = s0 + 0.2; x < s1 - 0.2; x += 0.42) K.rbox(R, ST, x, en - 0.98, 0.05, x + 0.2, en - 0.8, 0.2, { detail: true }); // dentils
    K.mould(R, ST, s0, s1, corniceProfile(en, 0.85, 0.8), { ret0: o.ret0 ?? true, ret1: o.ret1 ?? true });
    if (o.attic) {
      const ops = []; for (let i = 0; i < nb; i++) { const c = s0 + (i + 0.5) * p; ops.push({ s0: c - 1.0, s1: c + 1.0, y0: en + 0.55, y1: en + 2.45, sill: false }); }
      K.wall(R, ST, s0, s1, en, AT, ops, 0.5);
      for (const w of ops) { K.fill(R, w, { mull: 2, tran: [w.y0 + 1.0], rev: 0.32, frame: FR }); K.rbox(R, ST, w.s0 - 0.24, w.y0 - 0.24, 0, w.s1 + 0.24, w.y0, 0.09); K.rbox(R, ST, w.s0 - 0.24, w.y1, 0, w.s1 + 0.24, w.y1 + 0.24, 0.09); K.rbox(R, ST, w.s0 - 0.24, w.y0, 0, w.s0, w.y1, 0.09); K.rbox(R, ST, w.s1, w.y0, 0, w.s1 + 0.24, w.y1, 0.09); }
      K.rbox(R, ST, s0, AT, -0.5, s1, AT + 0.6, 0.06);
      for (let x = s0 + 0.2, k = 0; x < s1 - 0.4; x += 0.5, k++) K.rbox(R, STD, x, AT + (k % 2 ? 0.1 : 0.3), 0.06, x + 0.26, AT + (k % 2 ? 0.32 : 0.5), 0.09, { detail: true });
      K.mould(R, ST, s0, s1, corniceProfile(top, 0.4, 0.5), { ret0: o.ret0 ?? true, ret1: o.ret1 ?? true });
    } else K.rbox(R, ST, s0, en, -0.5, s1, top, 0.0);
    // cresting
    K.rbox(R, ST, s0, top, -0.4, s1, top + 0.28, -0.06);
    for (let x = s0 + p / 4; x < s1; x += p / 2) antefix(R, x, top + 0.28, -0.22);
  }
  // punched-window zone (corner pavilions, short returns): proud wall with paired tall windows, blind attic
  function punched(R, s0, s1, nb, o) {
    const d0 = o.d0 ?? 0; const top = o.top ?? TOP, ct = o.ct ?? CT, en = o.en ?? EN;
    const RP = K.run(R.at(s0, d0), R.at(s1, d0)); const L = s1 - s0; const p = L / nb;
    const gmin = Math.min(K.g(...R.at(s0, 1)), K.g(...R.at(s1, 1)));
    const floorYs = o.floorYs || [FL, FL + 4.4, FL + 8.8, ct];
    const ops = []; for (let i = 0; i < nb; i++) { const c = (i + 0.5) * p; for (let f = 0; f < floorYs.length - 1; f++) { if (f === 0 && (o.door || []).includes(i)) continue; ops.push({ s0: c - 0.75, s1: c + 0.75, y0: floorYs[f] + 0.75, y1: floorYs[f + 1] - 0.7 }); } }
    const dops = (o.door || []).map((i) => ({ s0: (i + 0.5) * p - 1.05, s1: (i + 0.5) * p + 1.05, y0: FL, y1: FL + 3.2, doorTop: FL + 2.45 })); // [r5a] pavilion side entrance
    const bops = []; for (let i = 0; i < nb; i++) { const c = (i + 0.5) * p; if ((o.door || []).includes(i)) continue; const y0 = bwY(RP, c, 0.5, 2.75, 3.75); if (y0 != null) bops.push({ s0: c - 0.5, s1: c + 0.5, y0, y1: 3.75 });
      const yl = lowY(RP, c, 0.5); if (yl != null) bops.push({ s0: c - 0.5, s1: c + 0.5, y0: yl, y1: 2.4 }); } // [r5a] grade-following
    K.wall(RP, STD, 0, L, gmin - 1.5, 4.05, bops, 0.6); for (const w of bops) K.fill(RP, w, { mull: 1, rev: 0.3, frame: FR });
    K.wall(RP, ST, 0, L, 4.05, ct, [...ops, ...dops], 0.6);
    for (const w of dops) { K.fill(RP, w, { kind: 'door', door: DOOR, rev: 0.45, frame: FR }); K.rbox(RP, FR, w.s0 - 0.35, w.y1 + 0.12, -0.05, w.s1 + 0.35, w.y1 + 0.5, 1.15); } // door + flat dark canopy
    for (const w of ops) { K.fill(RP, w, { mull: 1, tran: [w.y1 - 0.8], rev: 0.4, frame: FR }); K.rbox(RP, ST, w.s0 - 0.18, w.y1, 0, w.s1 + 0.18, w.y1 + 0.3, 0.12, { detail: true }); }
    K.rbox(RP, STD, 0, 4.0, -0.6, L, 4.18, 0.12);
    for (const [a, b] of [[0, 0.32], [L - 0.32, L]]) K.rbox(RP, ST, a, gmin - 1.5, -0.6, b, ct, 0.1); // corner strips
    K.rbox(RP, ST, 0, ct, -0.6, L, ct + 0.5, 0.13); K.rbox(RP, ST, 0, ct + 0.5, -0.6, L, en - 0.8, 0.05);
    if (o.text) inscription(K, RP, L / 2 - Math.min(L * 0.42, o.text.length * 0.6) , L / 2 + Math.min(L * 0.42, o.text.length * 0.6), ct + 0.62, en - 0.98, 0.056, o.text, { fg: '#5a5246', cut: true });
    K.mould(RP, ST, 0, L, corniceProfile(en, 0.85, 0.8));
    if (o.attic !== false) { K.rbox(RP, ST, 0, en, -0.6, L, AT, 0); K.rbox(RP, ST, 0, AT, -0.6, L, AT + 0.6, 0.06); K.mould(RP, ST, 0, L, corniceProfile(top, 0.4, 0.5)); }
    else K.rbox(RP, ST, 0, en, -0.6, L, top, 0);
    K.rbox(RP, ST, 0, top, -0.4, L, top + 0.28, -0.06);
    for (let x = p / 4; x < L; x += p / 2) antefix(RP, x, top + 0.28, -0.22);
    if (d0 > 0.3) { for (const [a, b] of [[s0, s0 + 0.6], [s1 - 0.6, s1]]) K.rbox(R, ST, a, gmin - 1.5, -0.6, b, top + 0.28, d0 - 0.3); }
  }

  // ---------- main block ----------
  const U0 = -52.7, U1 = 54.6, V0 = -37.0, V1 = 36.6, PAV = 11.7;
  const floors = [FL + 3.85, FL + 8.05];
  const RN = K.run([U1, V0], [U0, V0]); // north façade (east→west): main entrance at the centre
  const RS = K.run([U0, V1], [U1, V1]); // south façade (west→east), on Campanile Way
  for (const [R, txt] of [[RN, 'THE · LIFE · SCIENCES'], [RS, null]]) {
    punched(R, 0, PAV, 2, { d0: 0.7, text: R === RN ? 'BACTERIOLOGY' : null, door: R === RN ? [1] : [] });
    giant(R, PAV, R.L - PAV, 17, { floors, attic: true, entrance: [7, 8, 9], text: txt, ret0: false, ret1: false, doorY: R === RS ? SOUTH_Y : FL });
    punched(R, R.L - PAV, R.L, 2, { d0: 0.7, door: R === RN ? [0] : [] }); // [r5a] north corner pavilions: side entrances (OSM steps ~u=+-43, LiDAR terraces at ~5.3 m)
  }
  // short returns of the main block east and west of the end wings
  for (const [a, b] of [[[U0, V0], [U0, -21.0]], [[U0, 21.0], [U0, V1]], [[U1, V1], [U1, 21.0]], [[U1, -21.0], [U1, V0]]]) punched(K.run(a, b), 0, Math.hypot(b[0] - a[0], b[1] - a[1]), 3, {});
  // roof deck with two courts
  const CW = rect(-30.0, -21.0, -4.8, 21.0), CE = rect(7.6, -21.0, 33.0, 21.0);
  K.flat(ROOF, rect(U0 + 0.3, V0 + 0.3, U1 - 0.3, V1 - 0.3), TOP - 0.05, [CW, CE]);
  // court façades: plain cast stone with punched windows
  const courtSt = (y0) => { const st = []; for (let y = y0; y < TOP - 1; y += 4.0) st.push({ y0: y, y1: Math.min(TOP, y + 4.0), mat: ST, win: { w: 1.5, h: 2.3, sill: 0.9, mull: 1 } }); st[st.length - 1].y1 = TOP; return st; };
  courtWalls(K, CW, { stories: courtSt(14.4), bay: 3.9 });
  courtWalls(K, CE, { stories: courtSt(4.6), bay: 3.9 });
  for (const C of [CW, CE]) K.loop(ST, C.slice().reverse(), [[0.3, TOP - 0.05], [0.3, TOP + 0.8], [0, TOP + 0.8], [0, TOP - 0.3]]);
  // west court infill (atrium / library): 15 m deck with two taller blocks
  K.box(STD, -30.0, -1, -21.0, -4.8, 14.6, 21.0); K.flat(ROOF, rect(-30, -21, -4.8, 21), 14.7);
  for (let u = -27; u < -7; u += 4.5) K.box(GL, u, 14.7, -5.5, u + 2.6, 15.3, 5.5); // skylights
  for (const [v0, v1] of [[-21.0, -10.0], [7.5, 21.0]]) {
    polyWalls(K, rect(-20.0, v0, -6.0, v1), { stories: [{ y0: 15.0, y1: 18.5, mat: ST, win: { w: 1.4, h: 2.0, sill: 0.8 } }, { y0: 18.5, y1: 22.0, mat: ST, win: { w: 1.4, h: 2.0, sill: 0.8 } }], bay: 3.8, edge: (i, R) => (R.L > 13 ? {} : {}) });
    flatRoof(K, rect(-20.0, v0, -6.0, v1), 22.0, { mat: ST, parapet: 0.5, deck: ROOF });
  }
  // east court: podium deck at ~5 m with two infill blocks
  K.box(STD, 7.6, -1, -21.0, 33.0, 4.9, 21.0); K.flat(ROOF, rect(7.6, -21, 33, 21), 5.0);
  for (const [v0, v1] of [[-21.0, -10.0], [8.5, 21.0]]) {
    polyWalls(K, rect(7.6, v0, 21.0, v1), { stories: [5.0, 8.6, 12.2, 15.8].map((y) => ({ y0: y, y1: y + 3.6, mat: ST, win: { w: 1.4, h: 2.0, sill: 0.8 } })), bay: 3.8 });
    flatRoof(K, rect(7.6, v0, 21.0, v1), 19.4, { mat: ST, parapet: 0.5, deck: ROOF });
  }
  // central attic strip and rooftop penthouses (LiDAR ~29 m), tall west penthouse (~32 m)
  const pent = (u0, v0, u1, v1, y1, lv = false) => { K.box(ST, u0, TOP - 0.2, v0, u1, y1, v1); if (lv) K.box(LV, u0 - 0.03, y1 - 1.4, v0 - 0.03, u1 + 0.03, y1 - 0.6, v1 + 0.03); K.box(ST, u0 - 0.2, y1, v0 - 0.2, u1 + 0.2, y1 + 0.22, v1 + 0.2); };
  pent(-4.6, -34.0, 6.2, 33.6, 28.8);
  pent(-40.0, -31.0, -33.0, -23.5, 28.6); pent(35.5, -31.0, 46.5, -23.5, 28.6); pent(-40.0, 22.5, -33.0, 30.0, 28.6); pent(36.0, 22.5, 43.0, 30.0, 28.6);
  pent(-49.0, -20.5, -41.0, 6.5, 31.6); pent(-4.6, -8.5, 6.2, 5.5, 32.6, true); pent(-36.5, 7.5, -29.5, 13.0, 30.4);

  // ---------- end wings (three storeys, ~15 m) ----------
  const wingT = 14.9, wct = 12.4, wen = 14.2;
  const wing = (u0, u1, east) => {
    const RE = east ? K.run([u1, 21.0], [u1, -21.0]) : K.run([u0, -21.0], [u0, 21.0]);
    giant(RE, 0, RE.L, 8, { floors: [FL + 3.7], ct: wct, en: wen, top: wingT, attic: false, entrance: east ? [] : [], text: null });
    for (const R of [K.run([u0, 21.0], [u1, 21.0]), K.run([u1, -21.0], [u0, -21.0])]) giant(R, 0, R.L, 3, { floors: [FL + 3.7], ct: wct, en: wen, top: wingT, attic: false });
    K.flat(ROOF, rect(u0 + 0.3, -20.7, u1 - 0.3, 20.7), wingT - 0.05);
    K.box(SP, u0 + 0.5, wingT - 0.4, -20.5, u1 - 0.5, wingT - 0.1, 20.5);
  };
  wing(-70.9, U0, false); wing(U1, 73.3, true);
  // east entrance block (one storey) in front of the east wing
  {
    const P = rect(73.3, -8.0, 77.1, 8.2);
    polyWalls(K, P, { stories: [{ y0: K.g(76, 0) - 1.5, y1: 4.6, mat: ST, win: null }, { y0: 4.6, y1: 7.6, mat: ST, win: { w: 2.2, h: 2.0, sill: 0.5, mull: 2 } }], bay: 4.0 });
    flatRoof(K, P, 7.6, { mat: ST, parapet: 0.6, deck: ROOF });
    for (const [a, b] of [[[73.3, 8.2], [73.3, 20.8]], [[73.3, -21.0], [73.3, -8.0]]]) { /* wing face already built */ }
  }

  // ---------- entrance stairs (north and south) ----------
  // [r5a] photo-matched (Commons "VLSB exterior 1/3", "VLSB, UC Berkeley (6377)"): one flight centred on the three entrance
  // bays (bay 8 sits at u = 0.95, not 0), rising to a ~2.5 m landing; the two bottom treads run wider past the stepped cheek
  // blocks; four galvanised pipe rails (two on the pilaster lines between the doors, one inside each cheek).
  const RAIL = solid(0xa7abae, 0.38, 0.7);
  const pipe = (a, b, r = 0.024) => { const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = d.length(); const g = new THREE.CylinderGeometry(r, r, L, 6); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a[0], a[1], a[2]); K.add(RAIL, g, { detail: true }); };
  // handrail along a flight: foot (vA, yA) -> top (vB, yB) at u, 0.9 m above the nosing line, posts every ~1.6 m, 0.3 m runouts
  const railV = (u, vA, yA, vB, yB) => { const H = 0.92, sg = Math.sign(vB - vA); pipe([u, yA + H, vA], [u, yB + H, vB]); pipe([u, yA + H, vA - sg * 0.3], [u, yA + H, vA]); pipe([u, yB + H, vB], [u, yB + H, vB + sg * 0.3]);
    const np = Math.max(1, Math.round(Math.abs(vB - vA) / 1.6)); for (let k = 0; k <= np; k++) { const t = k / np; pipe([u, yA + (yB - yA) * t - 0.02, vA + (vB - vA) * t], [u, yA + (yB - yA) * t + H, vA + (vB - vA) * t], 0.02); } };
  // flight along v: foot edge vFoot -> top edge vTop (either direction), concrete treads + a dark line under each nosing
  const stairV = (uA, uB, vFoot, vTop, yLo, yHi, n) => { const sg = Math.sign(vTop - vFoot), T = Math.abs(vTop - vFoot) / n, rise = (yHi - yLo) / n;
    for (let i = 0; i < n; i++) { const e = vFoot + sg * T * i, top = yLo + rise * (i + 1); K.box(NOSE, uA + 0.01, top - 0.075, Math.min(e - sg * 0.012, e + sg * 0.004), uB - 0.01, top - 0.04, Math.max(e - sg * 0.012, e + sg * 0.004), { detail: true }); }
    return K.stairs(STEP, uA, Math.min(vFoot, vTop), uB, Math.max(vFoot, vTop), yLo, yHi, sg > 0 ? '+v' : '-v', n); };
  const UC = (U0 + U1) / 2;
  for (const [sgn, vF] of [[-1, V0], [1, V1]]) {
    const FLs = sgn < 0 ? FL : SOUTH_Y;
    const uA = UC - 7.5, uB = UC + 7.5; const g0 = Math.min(K.g(UC, vF + sgn * 9), K.g(UC - 6, vF + sgn * 8), K.g(UC + 6, vF + sgn * 8));
    const land0 = vF + sgn * 1.9, land1 = vF - sgn * 0.62;
    K.box(STD, uA, g0 - 1, Math.min(land0, land1), uB, FLs, Math.max(land0, land1));
    walkables.push(K.walkPoly(rect(uA, Math.min(land0, land1), uB, Math.max(land0, land1)), FLs));
    const n = Math.max(3, Math.round((FLs - g0) / 0.16)); const T = 0.34, len = n * T, rise = (FLs - g0) / n;
    const va = sgn < 0 ? land0 - len : land0, vb = sgn < 0 ? land0 : land0 + len; const vFoot = sgn < 0 ? va : vb;
    walkables.push(stairV(uA, uB, vFoot, sgn < 0 ? vb : va, g0, FLs, n));
    // the two bottom treads run 1.6 m wider each side
    for (let i = 0; i < 2; i++) { const p0 = vFoot - sgn * T * i, p1 = vFoot - sgn * T * (i + 1); const y = g0 + rise * (i + 1);
      for (const [x0, x1] of [[uA - 1.6, uA], [uB, uB + 1.6]]) { K.box(STEP, x0, g0 - 1, Math.min(p0, p1), x1, y, Math.max(p0, p1)); walkables.push(K.walkPoly(rect(x0, Math.min(p0, p1), x1, Math.max(p0, p1)), y)); } }
    // stepped cheek blocks: full height beside the landing, then three blocks stepping down the flight, stopping two treads short
    const vTopF = sgn < 0 ? vb : va, vStop = vFoot - sgn * T * 2; // flight top edge, cheek end
    for (const u of [uA - 1.2, uB]) {
      K.box(ST, u, g0 - 1, Math.min(land0, land1), u + 1.2, FLs + 0.75, Math.max(land0, land1));
      K.box(ST, u - 0.06, FLs + 0.75, Math.min(land0, land1) - 0.06, u + 1.26, FLs + 0.85, Math.max(land0, land1) + 0.06);
      for (let k = 0; k < 3; k++) { const f0 = k / 3, f1 = (k + 1) / 3; const pa = vTopF + (vStop - vTopF) * f0, pb = vTopF + (vStop - vTopF) * f1;
        const yb = FLs - (FLs - g0) * (f1 * (len - 2 * T) / len) + 0.75; K.box(ST, u, g0 - 1, Math.min(pa, pb), u + 1.2, yb, Math.max(pa, pb)); }
      colliders.push(K.colPoly(rect(u, Math.min(vStop, land1), u + 1.2, Math.max(vStop, land1)), g0 - 1, FLs + 0.9));
    }
    // [r5a] north: raised semicircular concrete forecourt, one low step above the lawn, where the walk meets the flight (photo 00)
    if (sgn < 0) { const ya = g0 + 0.02, Rr = 6.8; const sh = new THREE.Shape(); sh.moveTo(UC - Rr, vFoot); for (let k = 0; k <= 24; k++) { const t = Math.PI * k / 24; sh.lineTo(UC - Math.cos(t) * Rr, vFoot - Math.sin(t) * Rr); } sh.lineTo(UC - Rr, vFoot);
      const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.55, bevelEnabled: false, curveSegments: 1 }); ag.rotateX(Math.PI / 2); ag.translate(0, ya, 0); K.add(STEP, ag);
      const cg = new THREE.TorusGeometry(Rr, 0.07, 4, 32, Math.PI); cg.rotateX(Math.PI / 2); cg.scale(1, 1, -1); cg.translate(UC, ya - 0.05, vFoot); K.add(STD, cg, { detail: true });
      walkables.push({ type: 'poly', pts: K.polyXZ(Array.from({ length: 25 }, (_, k) => { const t = Math.PI * k / 24; return [UC - Math.cos(t) * Rr, vFoot - Math.sin(t) * Rr]; })), y: ya }); }
    // four pipe rails
    for (const u of [uA + 0.3, UC - 2.47, UC + 2.47, uB - 0.3]) railV(u, vFoot - sgn * 0.15, g0 + rise * 0.5, vTopF + sgn * 0.05, FLs);
  }
  // [r5a] north corner-pavilion side entrances: landing at the floor in front of the pavilion door, two short flights with a
  // half landing down to the north walk (LiDAR: ramp ~v -47.5 -> -40 with a level at v ~-43.5), blocky cheek walls, pipe rails.
  for (const uc of [-43.9, 45.8]) {
    const vF = V0 - 0.7, hw = 1.8, vL = vF - 2.3, T = 0.36, LM = 1.3;
    const gW = Math.min(K.g(uc, vL - 8.0), K.g(uc - 1.5, vL - 8.0), K.g(uc + 1.5, vL - 8.0));
    if (FL - gW < 0.4) continue;
    const n = Math.max(2, Math.round((FL - gW) / 0.155)), n2 = Math.ceil(n / 2), n1 = n - n2, rise = (FL - gW) / n, yMid = gW + rise * n1;
    const gl = Math.min(K.g(uc, vL), K.g(uc - hw, vL), K.g(uc + hw, vL));
    K.box(STD, uc - hw - 0.55, gl - 1, vL, uc + hw + 0.55, FL, vF); walkables.push(K.walkPoly(rect(uc - hw - 0.55, vL, uc + hw + 0.55, vF), FL));
    const vU = vL - n2 * T; walkables.push(stairV(uc - hw, uc + hw, vU, vL, yMid, FL, n2));
    const vM = vU - LM; if (n1 > 0) { K.box(STD, uc - hw, gW - 1, vM, uc + hw, yMid, vU); walkables.push(K.walkPoly(rect(uc - hw, vM, uc + hw, vU), yMid)); }
    const vB = n1 > 0 ? vM - n1 * T : vU; if (n1 > 0) walkables.push(stairV(uc - hw, uc + hw, vB, vM, gW, yMid, n1));
    for (const [x0, x1] of [[uc - hw - 0.55, uc - hw], [uc + hw, uc + hw + 0.55]]) { // blocky cheek walls stepping down with the flights
      K.box(ST, x0, gl - 1, vL, x1, FL + 0.95, vF);
      K.box(ST, x0, gW - 1, vU, x1, yMid + (FL - yMid) * 0.5 + 0.95, vL);
      if (n1 > 0) { K.box(ST, x0, gW - 1, vM, x1, yMid + 0.95, vU); K.box(ST, x0, gW - 1, vB, x1, gW + (yMid - gW) * 0.5 + 0.95, vM); }
      colliders.push(K.colPoly(rect(x0, vB, x1, vF), gW - 1, FL + 1.0));
    }
    for (const u of [uc - hw + 0.18, uc + hw - 0.18]) { railV(u, vU + 0.1, yMid + rise * 0.5, vL - 0.05, FL); if (n1 > 0) railV(u, vB + 0.1, gW + rise * 0.5, vM - 0.05, yMid); }
  }
  // inscription on the north centre canopy
  {
    const p = (RN.L - 2 * PAV) / 17; const a = PAV + 8 * p + PW / 2 - 0.05, b = PAV + 9 * p - PW / 2 + 0.05;
    inscription(K, RN, a, b, FL + 2.92, FL + 3.38, 0.96, 'VALLEY LIFE SCIENCES BUILDING', { bg: '#2b2623', fg: '#d8cfb8', font: 'Arial, sans-serif', weight: '700', spacing: 0.05 });
  }

  // colliders: the real outline
  for (const fp of ctx.footprints) colliders.push({ type: 'poly', pts: fp.outer.map(([x, z]) => [x, z]), y0: -2, y1: 30 });
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'valley-life-sciences-building';
  return { object3d, colliders, walkables };
}
