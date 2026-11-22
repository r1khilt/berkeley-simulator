// California Hall (John Galen Howard, 1905): the first building completed under the Hearst plan, built for the university
// administration and now home of the Chancellor's office. A 200 x 70 ft steel-framed block sheathed in local Raymond granite
// and roofed with red tile; Howard's "free study of modified classic forms" without columnar orders. Rusticated basement stopped
// by a bold bolection moulding, smooth granite above, frieze of rosette pateras and dentils, mutule cornice, tiled hip roof
// crowned by a long raised skylight with a copper frame and acroteria. Central entrance bay with five bays to either side.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { lawnMat } from './lib/r4-lawn.js'; // r4-moffitt
import { Kit, corniceProfile } from './lib/classic-kit.js';

export const info = {
  id: 'california-hall',
  name: 'California Hall',
  subtitle: 'John Galen Howard · 1905',
  blurb: 'The first building completed under the Phoebe Hearst campus plan, California Hall was built of Raymond granite with a red tile roof as a fireproof home for the university administration. Today it houses the Chancellor\'s office.',
  replaces: ['w/24024512', 'way/24024512'],
};

function inscription(text) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#d9d3c6'; g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#5e5850'; g.font = 'bold 84px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = '10px';
  g.fillText(text, 512, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
}

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.805);
  const K = new Kit(ctx, ANG); const M = ctx.M; const G = M.granite, GD = M.graniteDark, A = M.ashlar;
  const uW = -11.4, uE = 11.2, vN = -31.4, vS = 30.8, vMid = (vN + vS) / 2;
  const B = 2.6, F1 = 2.9, F2 = 7.7, ENT = 11.4, EAVE = 13.0;
  const colliders = [], walkables = [];
  const stories = [
    { y0: -1.2, y1: 0.35, mat: GD },
    { y0: 0.35, y1: B, win: { sill: 0.55, h: 1.3, w: 1.3, mull: 1 }, mat: G, rustic: 0.45 },
    { y0: B, y1: F2, win: { sill: 1.0, h: 3.3, w: 1.7, mull: 1, tran: 0.7, muntins: 2, fw: 0.1 }, mat: G, courses: true },
    { y0: F2, y1: ENT, win: { sill: 0.8, h: 1.9, w: 1.7, mull: 1, muntins: 1, fw: 0.1 }, mat: G, courses: true },
  ];
  // window dressings: flat moulded hoods on angled brackets (main floor), foliate frieze panels over the casements
  const dress = (R, cs) => {
    for (const c of cs) {
      const top = F1 + 1.25 + 3.0 - 0.3; // window head (main floor: y0 = B + sill)
      const head = B + 1.0 + 3.3;
      K.rbox(R, G, c - 1.12, head + 0.02, 0, c + 1.12, head + 0.36, 0.42);     // hood slab
      K.rbox(R, G, c - 1.18, head + 0.36, 0, c + 1.18, head + 0.46, 0.48);     // hood cap
      K.rbox(R, G, c - 1.0, B + 0.85, 0, c + 1.0, B + 1.0, 0.16);                // sill
      for (const k of [-1, 1]) { K.rbox(R, G, c + k * 0.96 - 0.11, B + 1.0, 0, c + k * 0.96 + 0.11, head - 0.5, 0.1);   // architrave jamb
        K.rbox(R, G, c + k * 0.96 - 0.13, head - 0.5, 0, c + k * 0.96 + 0.13, head + 0.02, 0.4); }                     // console bracket on the jamb
      K.rbox(R, G, c - 0.95, F2 + 0.8 + 1.9 + 0.12, 0, c + 0.95, ENT - 0.05, 0.06); // frieze panel
      K.rbox(R, GD, c - 0.75, F2 + 0.8 + 1.9 + 0.25, 0.06, c + 0.75, ENT - 0.18, 0.1, { detail: true }); // foliate relief
    }
  };
  const entab = (R, r0 = true, r1 = true) => {
    K.mould(R, G, 0, R.L, [[0, B - 0.12], [0.18, B - 0.05], [0.3, B + 0.12], [0.3, B + 0.28], [0.12, B + 0.42], [0, B + 0.45]], { ret0: r0, ret1: r1 }); // bolection
    K.rbox(R, G, 0, ENT, -0.4, R.L, ENT + 0.7, 0.06);                                 // frieze
    K.mould(R, G, 0, R.L, [[0, ENT + 0.7], [0.12, ENT + 0.72], [0.12, ENT + 0.9]], { ret0: r0, ret1: r1 }); // dentil band
    for (let s = 0.12; s < R.L - 0.1; s += 0.24) K.rbox(R, G, s - 0.07, ENT + 0.72, 0.1, s + 0.07, ENT + 0.88, 0.2, { detail: true });
    for (let s = 0.6; s < R.L - 0.3; s += 1.2) { const g = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 14); g.rotateX(Math.PI / 2); g.translate(s, ENT + 0.35, 0.1); K.addRun(R, G, g); }
    K.mould(R, G, 0, R.L, corniceProfile(EAVE, 1.1, EAVE - ENT - 0.85), { ret0: r0, ret1: r1 });
    for (let s = 0.3; s < R.L - 0.2; s += 0.6) K.rbox(R, G, s - 0.08, ENT + 1.12, 0.33, s + 0.08, ENT + 1.25, 0.92, { detail: true }); // mutules
  };
  const faces = [];
  const facade = (a, b, layout) => {
    const R = K.run(a, b); faces.push(R);
    // layout: array of bay widths with type 'w' (window bay) or 'e' (entrance bay) or 'd' (door bay at grade)
    let s = 0; const winC = []; const ent = [];
    for (const [w, t] of layout) { if (t === 'w') winC.push(s + w / 2); else ent.push([s, s + w, t]); s += w; }
    const sc = R.L / s; for (let i = 0; i < winC.length; i++) winC[i] *= sc; for (const e of ent) { e[0] *= sc; e[1] *= sc; }
    for (const st of stories) {
      const ops = st.win ? winC.map((c) => ({ s0: c - st.win.w / 2, s1: c + st.win.w / 2, y0: st.y0 + st.win.sill, y1: st.y0 + st.win.sill + st.win.h })) : [];
      // entrance bays get their own openings
      for (const [e0, e1, t] of ent) {
        const c = (e0 + e1) / 2;
        if (st.y0 === B) ops.push({ s0: c - 1.6, s1: c + 1.6, y0: (t === 'e' ? F1 : 0.15), y1: F1 + 4.6, door: true, t });
        if (st.y0 === 0.35 && t !== 'e') ops.push({ s0: c - 1.6, s1: c + 1.6, y0: 0.15, y1: B, door: true, t, lower: true });
        if (st.y0 === F2) for (const k of [-1, 0, 1]) ops.push({ s0: c + k * 1.3 - 0.42, s1: c + k * 1.3 + 0.42, y0: F2 + 1.75, y1: F2 + 2.85 });
      }
      const wallOps = ops.map((o) => o.door ? { s0: o.s0, s1: o.s1, y0: Math.max(o.y0, st.y0 + (st.y0 === -1.2 ? 0 : 0)), y1: Math.min(o.y1, st.y1) } : o).filter((o) => o.y1 > o.y0 + 0.01 && o.y0 >= st.y0 - 0.001);
      K.wall(R, st.mat, 0, R.L, st.y0, st.y1, wallOps, 0.5);
      for (const o of ops) if (!o.door) { if (st.win) { o.muntins = st.win.muntins; o.fw = st.win.fw; } K.fill(R, o, { mull: 1, tran: st.win?.tran ? [o.y0 + (o.y1 - o.y0) * st.win.tran] : [], rev: 0.4, frame: M.woodDark }); }
      if (st.rustic) K.rustic(R, 0, R.L, st.y0, st.y1, wallOps, st.rustic, G, 0.09, 0.045);
      if (st.courses) K.rustic(R, 0, R.L, st.y0 + 0.05, st.y1, wallOps, 0.85, G, 0.025, 0.06); // alternate broad/narrow courses
    }
    dress(R, winC);
    entab(R);
    // entrances: deep reveal, elaborate moulded frame, inscription panel, flat hood on brackets, oak doors with lattice glass
    for (const [e0, e1, t] of ent) {
      const c = (e0 + e1) / 2; const y0 = t === 'e' ? F1 : 0.15; const o = { s0: c - 1.6, s1: c + 1.6, y0, y1: F1 + 4.6, doorTop: y0 + 3.2, sill: false };
      K.rbox(R, G, c - 1.6, -1.2, -0.9, c + 1.6, y0, -0.5);   // threshold block inside the reveal
      // slightly projecting central bay framing the portal, up to the frieze
      K.rbox(R, G, e0 + 0.6, B + 0.45, 0, c - 2.9, ENT, 0.32); K.rbox(R, G, c + 2.9, B + 0.45, 0, e1 - 0.6, ENT, 0.32);
      K.rbox(R, G, c - 2.9, o.y1 + 1.8, 0, c + 2.9, ENT, 0.32);
      K.fill(R, o, { kind: 'door', rev: 0.85, door: M.wood, frame: M.woodDark });
      // lattice bars on the door glass (detail)
      for (let k = -3; k <= 3; k++) for (const sg of [-1, 1]) { const g = new THREE.BoxGeometry(0.03, 2.2, 0.03); g.rotateZ(sg * 0.6); g.translate(c + k * 0.42, y0 + 1.75, -0.8); K.addRun(R, M.bronze, g, { detail: true }); }
      for (const [w, p, h] of [[0.5, 0.18, 0.25], [0.26, 0.34, 0.12]]) {
        K.rbox(R, G, o.s0 - w, y0, 0, o.s0, o.y1 + w, p); K.rbox(R, G, o.s1, y0, 0, o.s1 + w, o.y1 + w, p); K.rbox(R, G, o.s0 - w, o.y1, 0, o.s1 + w, o.y1 + w, p);
      }
      K.rbox(R, G, c - 2.2, o.y1 + 0.55, 0, c + 2.2, o.y1 + 0.75, 0.3);
      if (insc) { const pg = new THREE.PlaneGeometry(3.6, 0.45); pg.translate(c, o.y1 + 1.05, 0.03); K.addRun(R, insc, pg, { uvMode: 'keep' }); }
      K.rbox(R, G, c - 2.8, o.y1 + 1.4, 0, c + 2.8, o.y1 + 1.75, 0.75);           // flat moulded hood
      for (const k of [-1, 1]) K.rbox(R, G, c + k * 2.25 - 0.17, o.y1 + 0.6, 0, c + k * 2.25 + 0.17, o.y1 + 1.4, 0.55); // brackets
      for (let s = c - 2.45; s <= c + 2.45; s += 0.35) K.rbox(R, G, s - 0.1, o.y1 + 1.28, 0.3, s + 0.1, o.y1 + 1.4, 0.62, { detail: true }); // modillions
    }
    return R;
  };
  const insc = inscription('CALIFORNIA HALL');
  const side = [5.2, 'w']; const longLayout = [side, side, side, side, side, [10.0, 'e'], side, side, side, side, side];
  const eastLayout = [side, side, side, side, side, [10.0, 'd'], side, side, side, side, side];
  facade([uW, vN], [uW, vS], longLayout);                 // west (principal) façade, N→S
  facade([uE, vS], [uE, vN], eastLayout);                 // east façade, S→N
  facade([uE, vN], [uW, vN], [[5.6, 'w'], [5.6, 'w'], [5.6, 'w'], [5.6, 'w']]); // north end
  facade([uW, vS], [uE, vS], [[5.0, 'w'], [5.0, 'w'], [5.0, 'd'], [5.0, 'w'], [5.0, 'w']].map(([w, t], i) => [i === 2 ? 4.6 : w, t])); // south end with entrance
  // core
  K.box(M.concreteDark, uW + 1.0, -1.2, vN + 1.0, uE - 1.0, EAVE - 0.3, vS - 1.0);
  colliders.push(K.colPoly([[uW, vN], [uE, vN], [uE, vS], [uW, vS]], -2, 20));

  // ---------- tiled hip roof with the long raised skylight (copper frame, acroteria) ----------
  const ov = 0.75; const um0 = (uW + uE) / 2;
  const ridge = K.hip(M.redTile, uW - ov, vN - ov, uE + ov, vS + ov, EAVE - 0.05, 0.52);
  // skylights dotting the roof slopes (copper-framed)
  for (const v of [vN + 8, vS - 8]) for (const sg of [-1, 1]) { const u = um0 + sg * 5.2; const y = EAVE - 0.05 + (Math.min(u - (uW - ov), (uE + ov) - u)) * 0.52; K.box(M.copper, u - 0.8, y - 0.2, v - 0.8, u + 0.8, y + 0.25, v + 0.8); K.box(M.glassLight, u - 0.7, y + 0.25, v - 0.7, u + 0.7, y + 0.32, v + 0.7, { detail: true }); }
  const um = (uW + uE) / 2, sv0 = vN + 13, sv1 = vS - 13;
  K.box(M.copper, um - 1.0, ridge - 0.6, sv0, um + 1.0, ridge + 0.15, sv1);
  // glazed monitor: sloped glass faces + copper ribs + ridge cap
  for (const sg of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.05, 1.05, sv1 - sv0); g.rotateZ(sg * 0.75); g.translate(um + sg * 0.42, ridge + 0.5, (sv0 + sv1) / 2); K.add(M.glassLight, g, { uvMode: 'keep' });
  }
  K.box(M.copper, um - 0.12, ridge + 0.82, sv0, um + 0.12, ridge + 0.98, sv1);
  for (let v = sv0; v <= sv1 + 0.01; v += (sv1 - sv0) / 18) {
    for (const sg of [-1, 1]) { const g = new THREE.BoxGeometry(0.08, 1.1, 0.08); g.rotateZ(sg * 0.75); g.translate(um + sg * 0.42, ridge + 0.5, v); K.add(M.copper, g, { detail: true }); }
  }
  // acroteria along the ridge + copper finials on the skylights
  for (let v = sv0; v <= sv1 + 0.01; v += (sv1 - sv0) / 6) { K.box(M.copper, um - 0.25, ridge + 0.95, v - 0.25, um + 0.25, ridge + 1.15, v + 0.25); K.lathe(M.copper, [[0.18, 0], [0.08, 0.2], [0.16, 0.45], [0.05, 0.75], [0.001, 0.95]], um, ridge + 1.15, v, 8, { detail: true }); }

  // ---------- west plinth berm and entrance steps; flagpole circle ----------
  {
    const c = vMid + 0.0; const sw = 6.0; const gw = K.g(uW - 7.5, c);
    const n = Math.round((F1 - gw) / 0.165);
    walkables.push(K.stairs(GD, uW - n * 0.36, c - sw / 2, uW, c + sw / 2, gw, F1, '+u', n));
    // cheek walls of the steps (granite), stepping down
    for (const v of [c - sw / 2 - 0.5, c + sw / 2]) { K.box(GD, uW - n * 0.36, -1.2, v, uW, F1 + 0.15, v + 0.5); colliders.push(K.colPoly([[uW - n * 0.36, v], [uW, v], [uW, v + 0.5], [uW - n * 0.36, v + 0.5]], -1.2, F1 + 0.2)); }
    // landing at the door
    K.box(GD, uW - 0.8, -1.2, c - sw / 2, uW + 0.05, F1, c + sw / 2);
    // grassy berm along the west façade (slopes from 1.5 m at the wall to grade)
    const berm = (v0, v1) => {
      const h0 = 1.5, w = 4.0;
      const pos = [];
      const P = (u, y, v) => [u, y, v];
      const a = P(uW, h0, v0), b = P(uW, h0, v1), cc = P(uW - w, -0.3, v1), d = P(uW - w, -0.3, v0);
      pos.push(...a, ...cc, ...b, ...a, ...d, ...cc);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      K.add(lawnMat(), g); // r4-moffitt: textured lawn instead of the flat neon M.turf
      for (const vv of [v0, v1]) { const s = [[uW, -0.5, vv], [uW, h0, vv], [uW - w, -0.5, vv]]; const gg = new THREE.BufferGeometry(); const q = vv === v0 ? [...s[0], ...s[2], ...s[1]] : [...s[0], ...s[1], ...s[2]]; gg.setAttribute('position', new THREE.Float32BufferAttribute(q, 3)); gg.computeVertexNormals(); K.add(lawnMat(), gg); }
      walkables.push(K.walkFn(uW - w, v0, uW, v1, (u, v) => (u < uW - w || u > uW || v < v0 || v > v1) ? null : Math.max(K.g(u, v), -0.3 + (h0 + 0.3) * (u - (uW - w)) / w)));
    };
    berm(vN + 0.5, c - sw / 2 - 0.5); berm(c + sw / 2 + 0.5, vS - 0.5);
    // flagpole in the gravel circle
    const fu = -21.2, fv = -1.0;
    K.cyl(M.paving, fu, K.g(fu, fv) - 0.3, fv, 1.2, 1.2, 0.45, 24);
    K.cyl(M.whitePaint, fu, K.g(fu, fv), fv, 0.12, 0.06, 18, 10);
    K.lathe(M.gold, [[0.001, 0], [0.16, 0.12], [0.16, 0.2], [0.001, 0.32]], fu, K.g(fu, fv) + 18, fv, 10, { detail: true });
    colliders.push(K.colCyl(fu, fv, 0.3, -1, 18));
  }
  // east and south doors at grade: small landings
  for (const [u0, v0, u1, v1] of [[uE, vMid - 1.8, uE + 1.0, vMid + 1.8], [-1.8 + (uW + uE) / 2, vS, 1.8 + (uW + uE) / 2, vS + 1.0]]) K.box(GD, u0, -1.2, v0, u1, 0.15, v1);

  // refine-central: foundation hedge, lamp posts and a bike rack where the paths arrive
  siteDress(K, ctx, [[uW, vS], [uE, vS], [uE, vN], [uW, vN]], { d: 1.1 });
  const object3d = K.finish();
  object3d.name = 'california-hall';
  return { object3d, colliders, walkables };
}
