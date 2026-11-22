// Doe Memorial Library (John Galen Howard, 1907–1911 north wing, 1914–1917 south block) + the attached
// Bancroft Library annex (Arthur Brown Jr., 1949). Massing fitted to the 2021 USGS LiDAR; façade per the
// 1982 NRHP nomination: rusticated base, 16 fluted engaged columns on the north front (paired at the corners
// and at the central bay), eleven bronze-framed arched windows of the North Reading Room, entablature with
// dentils and modillions, bronze anthemion cresting, tiled gable roof with pedimented east/west ends broken
// by great arched windows, and a portal approached by semicircular steps.
import * as THREE from 'three';
import { Kit, clipBelow } from './lib/beaux-kit.js';
import { buildDoeInterior, updateDoeInterior } from './lib/doe-interior.js';
import { signMat } from './lib/rc-finish.js'; // r5-east: Bancroft entrance lettering

export const info = {
  id: 'doe-library',
  name: 'Doe Memorial Library',
  subtitle: 'John Galen Howard · 1911 · with The Bancroft Library',
  blurb: 'Named for benefactor Charles Franklin Doe, whose 1904 bequest funded it, Howard\'s granite Beaux-Arts library faces Memorial Glade with sixteen engaged columns framing the arched windows of the North Reading Room. The Bancroft Library, the largest collection on the history of California and western North America, adjoins it on the east.',
  replaces: ['relation/21101411', 'way/24024508'],
};

const TH = -16.5; // campus grid rotation (deg) shared by both footprints

export async function build(ctx) {
  const { M } = ctx;
  const k = new Kit(ctx, TH);
  const colliders = [], walkables = [];

  // ---------- plan (frame coords: u east-ish, v south-ish) ----------
  const NW = { u0: -51.6, u1: 17.6, v0: -42.3, v1: -21.8 };     // north wing: North Reading Room
  const SB = { u0: -48.1, u1: 13.95, v0: -21.8, v1: 38.2 };     // south block (stacks, Loan Hall)
  const BA = { u0: 24.6, u1: 58.6, v0: -22.0, v1: 33.3 };       // Bancroft annex
  const stone = M.granite.clone(), rust = M.ashlar.clone(), dark = M.graniteDark, bronze = M.darkBronze;
  stone.color.setRGB(1.05, 1.06, 1.06); stone.name = 'doeGranite';
  rust.map = M.granite.map; rust.color.setRGB(1.0, 1.01, 1.01); rust.name = 'doeRustication';
  const skyGlass = new THREE.MeshStandardMaterial({ color: 0x7c8e98, roughness: 0.2, metalness: 0.3 }); skyGlass.name = 'doeSkylight';
  const verd = new THREE.MeshStandardMaterial({ color: 0x5f9686, roughness: 0.55, metalness: 0.25 }); verd.name = 'doeVerdigris';

  // ===================== NORTH WING =====================
  const gN = k.groundMin([[NW.u0, NW.v0], [NW.u1, NW.v0], [-17, NW.v0]]); // lowest ground along the north front
  const gP = k.ground(-17.06, NW.v0 - 0.6);                                   // terrace in front of the north portal (~2.35)
  const F1 = Math.max(gN + 0.85, gP + 0.32);                                  // interior: entrance floor (vestibule, lobby, Morrison)
  const yFound = -1.5;
  const yBase = 6.7, ySill = 7.25, yColTop = 16.5, yArch = 17.2, yFrieze = 18.05, yCorn = 19.3, yRidge = 24.9;
  const D = 0.95;
  // (the north wing is hollow: its rooms are built by lib/doe-interior.js)
  let nrrWins = [], morWinN = [];
  {
    const F = k.side('N', NW.v0);
    const s0 = F.s(NW.u1), s1 = F.s(NW.u0); // s runs west->east reversed; s0 < s1
    const cs = F.s(-17.06);                 // centre of the portal (where the Glade path arrives)
    // column centres: corner pairs, four singles each side, central pairs
    const half = (s1 - s0) / 2, cols = [];
    const inner = 3.5, pair = 1.55, corner = half - 1.25, bay = (corner - pair - (inner + pair)) / 5;
    for (const sg of [-1, 1]) {
      cols.push(cs + sg * inner, cs + sg * (inner + pair));
      for (let i = 1; i <= 4; i++) cols.push(cs + sg * (inner + pair + bay * i));
      cols.push(cs + sg * (corner - pair), cs + sg * corner);
    }
    cols.sort((a, b) => a - b);
    // window bays: between consecutive single/pair columns (skip the narrow gaps inside pairs)
    const bays = [];
    for (let i = 0; i < cols.length - 1; i++) { const w = cols[i + 1] - cols[i]; if (w > 2.5) bays.push([cols[i], cols[i + 1]]); }
    // rusticated base with basement windows + portal opening
    const baseOps = [];
    for (const [a, b] of bays) {
      const c = (a + b) / 2;
      if (Math.abs(c - cs) < 0.5) baseOps.push({ s0: cs - 1.55, s1: cs + 1.55, y0: F1, y1: 6.25 });
      else baseOps.push({ s0: c - 1.1, s1: c + 1.1, y0: 3.3, y1: 5.9 });
    }
    F.wall(rust, s0, s1, yFound, yBase, 0.8, baseOps);
    for (const op of baseOps) {
      if (op.y1 > 6) continue;
      F.window(op.s0, op.s1, op.y0, op.y1, { mullions: 1, transoms: [op.y0 + 1.4], depth: 0.45 });
      F.box(dark, op.s0 - 0.12, op.s1 + 0.12, op.y0 - 0.22, op.y0, 0, 0.12); // sill
    }
    // bolection moulding + sill (stylobate) carrying the columns
    F.moulding(stone, s0, s1, yBase - 0.35, [[0.2, 0.12], [0.25, 0.3], [0.12, 0.42]]);
    F.box(stone, s0 - 0.1, s1 + 0.1, yBase + 0.22, ySill, -0.3, 1.35);
    // upper wall with the eleven arched reading-room windows
    const winOps = bays.map(([a, b]) => { const c = (a + b) / 2, w = Math.abs(c - cs) < 0.5 ? 3.0 : Math.min(3.4, b - a - 1.75); return { s0: c - w / 2, s1: c + w / 2, y0: 9.7, y1: 15.4, arch: false }; });
    nrrWins = winOps.map((o) => [-o.s1, -o.s0]); morWinN = baseOps.filter((o) => o.y1 < 6.1).map((o) => [-o.s1, -o.s0]);
    F.wall(stone, s0, s1, ySill, yArch, 0.9, winOps);
    for (const op of winOps) {
      F.window(op.s0, op.s1, op.y0, op.y1, { mullions: 3, transoms: [11.1, 12.55, 14.0], depth: 0.55, frameMat: M.darkBronze });
      F.box(stone, op.s0 - 0.22, op.s0, op.y0, op.y1, 0, 0.1); F.box(stone, op.s1, op.s1 + 0.22, op.y0, op.y1, 0, 0.1);   // architrave
      F.box(stone, op.s0 - 0.22, op.s1 + 0.22, op.y1, op.y1 + 0.32, 0, 0.12);                                            // flat head
      F.box(stone, op.s0 - 0.4, op.s1 + 0.4, op.y1 + 0.32, op.y1 + 0.48, 0, 0.3);                                         // cornice
      F.box(stone, op.s0 - 0.15, op.s1 + 0.15, op.y0 - 0.25, op.y0, 0, 0.16);  // sill
      F.box(stone, op.s0 + 0.15, op.s1 - 0.15, ySill + 0.1, op.y0 - 0.85, 0, 0.06, { detail: true }); // spandrel panel
      F.box(stone, op.s0 - 0.12, op.s1 + 0.12, op.y0 - 0.72, op.y0 - 0.3, 0, 0.1);                     // fret band under the sill
      F.repeat(stone, op.s0, op.s1, 0.28, 0.1, op.y0 - 0.64, op.y0 - 0.38, 0.1, 0.15);
    }
    // garland panels between paired columns
    for (let i = 0; i < cols.length - 1; i++) if (cols[i + 1] - cols[i] < 2.5) {
      const c = (cols[i] + cols[i + 1]) / 2;
      F.box(stone, c - 0.22, c + 0.22, 8.4, 15.2, 0, 0.08, { detail: true });
      for (let y = 9.0; y < 15; y += 1.2) F.geom(stone, new THREE.SphereGeometry(0.14, 8, 6).scale(1, 1.3, 0.6).translate(c, y, 0.1), { detail: true });
    }
    // giant order
    for (const c of cols) F.column(stone, c, ySill, yColTop, D * 1.08, { tc: 0.72, style: 'composite' });
    // entablature: architrave, double-key frieze, dentils, modillion cornice
    F.moulding(stone, s0 - 0.3, s1 + 0.3, yColTop, [[0.25, 1.26], [0.25, 1.3], [0.2, 1.35]]);
    F.box(stone, s0 - 0.3, s1 + 0.3, yArch, yFrieze, -0.3, 1.26);
    F.repeat(stone, s0, s1, 0.9, 0.42, yArch + 0.25, yFrieze - 0.25, 1.26, 1.32); // key frieze blocks
    let y = F.moulding(stone, s0 - 0.3, s1 + 0.3, yFrieze, [[0.12, 1.4], [0.22, 1.48]]);
    F.repeat(stone, s0 - 0.2, s1 + 0.2, 0.26, 0.13, y, y + 0.2, 1.4, 1.62);         // dentils
    y = F.moulding(stone, s0 - 0.3, s1 + 0.3, y + 0.2, [[0.12, 1.65]]);
    F.repeat(stone, s0 - 0.2, s1 + 0.2, 0.9, 0.2, y, y + 0.22, 1.5, 2.15);          // modillions
    y = F.moulding(stone, s0 - 0.3, s1 + 0.3, y + 0.22, [[0.12, 2.25], [0.18, 2.35], [Math.max(0.05, yCorn - y - 0.52), 2.1]]);
    // bronze cresting of anthemions and palmettes
    F.box(verd, s0, s1, yCorn, yCorn + 0.22, 1.6, 1.82);
    for (let s = s0 + 0.3; s < s1; s += 0.6) { const a = new THREE.Shape(); a.moveTo(-0.22, 0); a.quadraticCurveTo(-0.28, 0.55, 0, 0.95); a.quadraticCurveTo(0.28, 0.55, 0.22, 0); a.lineTo(-0.22, 0); const g = new THREE.ExtrudeGeometry(a, { depth: 0.05, bevelEnabled: false }); g.translate(s, yCorn + 0.2, 1.68); F.geom(verd, g, { detail: true }); }
    {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const g2 = c.getContext('2d');
      g2.fillStyle = '#dcd6cb'; g2.fillRect(0, 0, 1024, 64); g2.fillStyle = '#6f6a60'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
      g2.font = "bold 44px Georgia, 'Times New Roman', serif"; g2.fillText('THE  UNIVERSITY  LIBRARY', 512, 35);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const insMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }); insMat.name = 'doeInscription';
      const iw = 9.6, gI = new THREE.PlaneGeometry(iw, iw / 16).translate(cs, (yArch + yFrieze) / 2, 1.275);
      F.geom(insMat, gI, { uvMode: 'keep' });
      for (const sx of [-1, 1]) { F.geom(stone, new THREE.CylinderGeometry(0.34, 0.34, 0.12, 16).rotateX(Math.PI / 2).scale(1.3, 1, 1).translate(cs + sx * (iw / 2 + 0.9), (yArch + yFrieze) / 2, 1.3), { detail: true }); }
    }
    // portal: architrave, inscribed lintel, broad flat hood on S-consoles, bronze doors, bust of Minerva
    const p0 = cs - 1.55, p1 = cs + 1.55, pt = F1;
    F.box(stone, p0 - 0.45, p0, pt, 6.25, 0, 0.22); F.box(stone, p1, p1 + 0.45, pt, 6.25, 0, 0.22);
    F.box(stone, p0 - 0.45, p1 + 0.45, 6.25, 7.0, 0, 0.26);
    F.box(bronze, p0 + 0.3, p1 - 0.3, 6.45, 6.8, 0.26, 0.28, { detail: true }); // inscription band
    F.box(verd, p0 - 0.75, p1 + 0.75, 7.0, 7.32, 0, 0.95);                    // hood (patinated bronze)
    for (const sx of [p0 - 0.6, p1 + 0.6]) { const cg = new THREE.Shape(); cg.moveTo(0, 0); cg.quadraticCurveTo(0.55, 0.1, 0.65, 0.75); cg.lineTo(0, 0.75); cg.lineTo(0, 0); const g = new THREE.ExtrudeGeometry(cg, { depth: 0.3, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(sx + 0.15, 6.25, 0.2); F.geom(stone, g); }
    F.window(p0, p1, pt + 3.0, 6.25, { mullions: 3, depth: 0.6, glassMat: M.windowNight, frameMat: M.bronze });   // transom light
    F.box(M.bronze, p0, p1, pt + 2.88, pt + 3.02, -0.68, -0.5);
    for (const [sa, sb] of [[p0 + 0.03, p0 + 0.11], [p1 - 0.11, p1 - 0.03]]) {   // bronze door leaves standing open inward
      F.box(M.darkBronze, sa, sb, pt + 0.01, pt + 2.86, -2.05, -0.62);
      for (const yy of [pt + 0.9, pt + 1.9]) F.box(M.darkBronze, sa - 0.015, sb + 0.015, yy, yy + 0.06, -1.95, -0.72, { detail: true });
    }
    F.geom(M.bronze, new THREE.SphereGeometry(0.32, 12, 10).scale(1, 1.25, 0.9).translate(cs, 7.75, 0.45), { detail: true });
    F.box(stone, cs - 0.4, cs + 0.4, 7.32, 7.45, 0.2, 0.7, { detail: true });
    // two Ionic columns flanking the central window
    for (const sx of [-1, 1]) F.column(stone, cs + sx * 1.85, 7.9, 13.9, 0.45, { tc: 0.0, fluted: false, style: 'ionic' });
    // semicircular steps from the Glade path up to the portal (broken flight: landing at the centre)
    const gS = Math.min(gP - 0.02, pt - 0.3), nSteps = Math.max(2, Math.round((pt - gS) / 0.16));
    for (let i = 0; i < nSteps; i++) {
      const r = 5.2 - i * 0.45, y0s = gS + (i * (pt - gS)) / nSteps, y1s = gS + ((i + 1) * (pt - gS)) / nSteps;
      const g = new THREE.CylinderGeometry(r, r, y1s - yFound + 0.0, 40, 1, false, Math.PI / 2, Math.PI);
      g.translate(cs, (y1s + yFound) / 2, 0); F.geom(dark, g);
    }
    const [ex, ez] = k.xz(-17.06, NW.v0);
    walkables.push({ type: 'fn', bounds: [ex - 6, ez - 6, ex + 6, ez + 6], heightAt: (x, z) => {
      const [u, v] = k.uv(x, z); const r = Math.hypot(u + 17.06, v - NW.v0); if (v > NW.v0 + 0.02 || r > 5.2) return null;
      const i = Math.min(nSteps - 1, Math.floor((5.2 - r) / 0.45)); return gS + ((i + 1) * (pt - gS)) / nSteps; } });
  }
  // pedimented east and west ends of the reading room
  for (const [name, at] of [['W', NW.u0], ['E', NW.u1]]) {
    const F = k.side(name, at);
    const s0 = Math.min(F.s(NW.v0), F.s(NW.v1)), s1 = Math.max(F.s(NW.v0), F.s(NW.v1)), sc = (s0 + s1) / 2;
    const wr = 3.4, win = { s0: sc - wr, s1: sc + wr, y0: 8.2, y1: 20.6, arch: true }; // great arched window (~40% of the end wall)
    F.wall(rust, s0, s1, yFound, yBase, 0.8, [{ s0: sc - 2.6, s1: sc - 1.0, y0: 3.55, y1: 5.65 }, { s0: sc + 1.0, s1: sc + 2.6, y0: 3.55, y1: 5.65 }]);
    for (const c of [sc - 1.8, sc + 1.8]) F.window(c - 0.8, c + 0.8, 3.55, 5.65, { mullions: 1, depth: 0.45 });
    F.moulding(stone, s0, s1, yBase - 0.35, [[0.2, 0.12], [0.25, 0.3], [0.12, 0.42]]);
    F.box(stone, s0 - 0.1, s1 + 0.1, yBase + 0.22, ySill, -0.3, 0.95);
    const yApex = yCorn + (s1 - s0) / 2 * ((yRidge - 0.3 - yCorn) / ((s1 - s0) / 2));
    F.wall(stone, s0, s1, ySill, yCorn, 0.9, [{ ...win, y1: Math.min(win.y1, yCorn) }].map((o) => ({ ...o, arch: false, y1: yCorn })));
    // tympanum with the arched window rising into it
    const tri = new THREE.Shape(); tri.moveTo(s0, yCorn); tri.lineTo(win.s0, yCorn); tri.lineTo(win.s0, win.y1 - wr); tri.absarc(sc, win.y1 - wr, wr, Math.PI, 0, true); tri.lineTo(win.s1, yCorn); tri.lineTo(s1, yCorn); tri.lineTo(sc, yApex); tri.lineTo(s0, yCorn);
    F.shape(stone, tri, -0.9, 0);
    F.window(win.s0, win.s1, win.y0, win.y1, { arch: true, mullions: 3, transoms: [11.0, 14.5], depth: 0.6 });
    const ring = new THREE.Shape(); ring.absarc(sc, win.y1 - wr, wr + 0.4, 0, Math.PI, false); ring.lineTo(sc - wr, win.y1 - wr); ring.absarc(sc, win.y1 - wr, wr, Math.PI, 0, true); ring.lineTo(sc + wr + 0.4, win.y1 - wr);
    F.shape(stone, ring, 0, 0.15, { detail: true });
    F.box(stone, sc - 0.3, sc + 0.3, win.y1 - 0.1, win.y1 + 0.6, 0, 0.22, { detail: true });
    // fluted pilasters either side, entablature returns broken by the window
    for (const c of [s0 + 1.0, s0 + 2.6, sc - wr - 1.1, sc + wr + 1.1, s1 - 2.6, s1 - 1.0]) F.column(stone, c, ySill, yColTop, D, { tc: -0.25, style: 'composite' });
    for (const [a, b] of [[s0 - 0.3, win.s0 - 0.4], [win.s1 + 0.4, s1 + 0.3]]) {
      F.moulding(stone, a, b, yColTop, [[0.7, 0.45], [0.85, 0.4], [0.3, 0.7], [0.3, 1.0], [Math.max(0.05, yCorn - yColTop - 2.15), 1.2]]);
    }
    // raking cornice
    const len = Math.hypot((s1 - s0) / 2 + 1.0, yApex - yCorn), ang = Math.atan2(yApex - yCorn, (s1 - s0) / 2 + 1.0);
    for (const sg of [-1, 1]) {
      const g = new THREE.BoxGeometry(len + 0.6, 0.55, 1.3).translate(-sg * (len / 2), 0.0, 0.55).rotateZ(sg * ang).translate(sc, yApex + 0.1, 0);   // slopes DOWN from the apex (sign was inverted)
      F.geom(stone, g);
    }
    F.box(stone, sc - 0.6, sc + 0.6, yApex + 0.35, yApex + 1.5, -0.2, 0.9);                 // acroteria
    F.geom(verd, new THREE.SphereGeometry(0.35, 10, 8).scale(1, 1.5, 1).translate(sc, yApex + 1.95, 0.35), { detail: true });
    for (const c of [s0 - 0.2, s1 + 0.2]) F.box(stone, c - 0.55, c + 0.55, yCorn + 0.2, yCorn + 1.2, -0.2, 0.9);
    F.balustrade(stone, win.s0 + 0.2, win.s1 - 0.2, ySill, 1.0, 0.25, 0.75);  // small balcony
    F.box(stone, win.s0 + 0.1, win.s1 - 0.1, ySill - 0.18, ySill, 0, 0.85);
  }
  // tiled gable roof over the reading room (ridge along u)
  k.gableRoof(M.redTile, NW.u0 - 0.8, NW.u1 + 0.8, NW.v0 - 0.05, NW.v1 + 0.3, yCorn, yRidge, 'u', { soffit: false });
  k.box(stone, NW.u0 - 0.8, NW.u0, yCorn - 0.05, yCorn, NW.v0 - 0.05, NW.v1 + 0.3); k.box(stone, NW.u1, NW.u1 + 0.8, yCorn - 0.05, yCorn, NW.v0 - 0.05, NW.v1 + 0.3);
  { // shadow caster just under the roof (single-sided roof planes only write back faces to the shadow map, and the wing is hollow now)
    const u0 = NW.u0 - 0.8, u1 = NW.u1 + 0.8, v0 = NW.v0 - 0.05, v1 = NW.v1 + 0.3, vm = (v0 + v1) / 2, yE = yCorn - 0.1, yR = yRidge - 0.1;
    const t = [[u0, yE, v0], [u1, yR, vm], [u0, yR, vm], [u0, yE, v0], [u1, yE, v0], [u1, yR, vm], [u0, yR, vm], [u1, yE, v1], [u0, yE, v1], [u0, yR, vm], [u1, yR, vm], [u1, yE, v1]];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(t.flat(), 3)); k.add(stone, g);
  }
  k.box(M.copper, NW.u0 - 0.8, NW.u1 + 0.8, yRidge - 0.05, yRidge + 0.22, (NW.v0 + NW.v1) / 2 - 0.25, (NW.v0 + NW.v1) / 2 + 0.25, { detail: true });
  {   // three low copper-framed glazed skylights on the north slope (lying on the slope, ~0.35 m proud)
    const vE = NW.v0 - 0.05, vR = (NW.v0 - 0.05 + NW.v1 + 0.3) / 2, th = Math.atan2(yRidge - yCorn, vR - vE);
    const yAt = (v) => yCorn + ((v - vE) / (vR - vE)) * (yRidge - yCorn);
    const va = vE + 3.2, vb = vR - 1.4, len = Math.hypot(vb - va, yAt(vb) - yAt(va)), vm = (va + vb) / 2;
    const slab = (mat, u0, u1, lift, thick, ext = 0, o) => k.add(mat, new THREE.BoxGeometry(u1 - u0, thick, len + ext).rotateX(-th).translate((u0 + u1) / 2, yAt(vm) + lift / Math.cos(th), vm), o);
    for (const [ua, ub] of [[-45.5, -28.5], [-22.6, -11.5], [-5.6, 11.4]]) {
      slab(skyGlass, ua, ub, 0.36, 0.06);
      slab(verd, ua - 0.18, ua + 0.02, 0.2, 0.42, 0.3); slab(verd, ub - 0.02, ub + 0.18, 0.2, 0.42, 0.3);
      for (let u = ua + 3.4; u < ub - 1.0; u += 3.4) slab(verd, u - 0.05, u + 0.05, 0.4, 0.06, 0, { detail: true });
      k.add(verd, new THREE.BoxGeometry(ub - ua + 0.36, 0.45, 0.2).translate((ua + ub) / 2, yAt(va) + 0.2, va - 0.1));
      k.add(verd, new THREE.BoxGeometry(ub - ua + 0.36, 0.3, 0.2).translate((ua + ub) / 2, yAt(vb) + 0.3, vb + 0.1));
    }
  }
  { const pa = -17.06 - 1.55, pb = -17.06 + 1.55;   // north wing shell, open at the north portal
    const seg = (a, b, y0, y1) => colliders.push({ type: 'poly', pts: k.polyLocal([a, b]), y0, y1 }); // (rings are closed by the loader: use 2-point segments)
    seg([NW.u0, NW.v1], [NW.u0, NW.v0], -3, yRidge); seg([NW.u0, NW.v0], [pa, NW.v0], -3, yRidge); seg([pb, NW.v0], [NW.u1, NW.v0], -3, yRidge); seg([NW.u1, NW.v0], [NW.u1, NW.v1], -3, yRidge);
    colliders.push({ type: 'poly', pts: k.polyLocal([[pa, NW.v0], [pb, NW.v0]]), y0: 6.2, y1: yRidge }); }

  // ===================== SOUTH BLOCK (1914–17) =====================
  const yCornS = 17.5, yDeck = 20.6;
  const SH = { u0: -22.0, u1: -12.1, v1: -14.25, y1: 14.2 };   // stair-hall void (its finishes come from the interior)
  k.box(stone, SB.u0 + 0.6, SH.u0, yFound, yCornS, SB.v0, SB.v1 - 0.6); k.box(stone, SH.u1, SB.u1 - 0.6, yFound, yCornS, SB.v0, SB.v1 - 0.6);
  k.box(stone, SH.u0, SH.u1, yFound, yCornS, SH.v1, SB.v1 - 0.6); k.box(stone, SH.u0, SH.u1, SH.y1, yCornS, SB.v0, SH.v1);
  const range = (F, s0, s1, opts = {}) => {
    const n = Math.max(1, Math.round((s1 - s0) / 4.6)), bw = (s1 - s0) / n;
    const ops1 = [], ops2 = [], ops3 = [];
    for (let i = 0; i < n; i++) {
      const c = s0 + (i + 0.5) * bw;
      ops1.push({ s0: c - 0.8, s1: c + 0.8, y0: 2.6, y1: 4.9 });
      ops2.push({ s0: c - 1.0, s1: c + 1.0, y0: 6.8, y1: 11.3, arch: !!opts.archUpper });
      ops3.push({ s0: c - 0.85, s1: c + 0.85, y0: 12.4, y1: 14.6 });
    }
    F.wall(rust, s0, s1, yFound, 6.0, 0.7, ops1);
    F.moulding(stone, s0, s1, 5.75, [[0.25, 0.25], [0.15, 0.35]]);
    F.wall(stone, s0, s1, 6.15, yCornS - 1.7, 0.7, [...ops2, ...ops3]);
    for (const o of ops1) F.window(o.s0, o.s1, o.y0, o.y1, { mullions: 1, depth: 0.4 });
    for (const o of ops2) { F.window(o.s0, o.s1, o.y0, o.y1, { arch: o.arch, mullions: 1, transoms: [9.6], depth: 0.4 }); F.box(stone, o.s0 - 0.15, o.s1 + 0.15, o.y0 - 0.2, o.y0, 0, 0.14); if (!o.arch) F.moulding(stone, o.s0 - 0.2, o.s1 + 0.2, o.y1, [[0.15, 0.12], [0.18, 0.3]], { detail: true }); }
    for (const o of ops3) F.window(o.s0, o.s1, o.y0, o.y1, { mullions: 1, depth: 0.4 });
    for (let i = 0; i <= n; i++) F.box(stone, s0 + i * bw - 0.35, s0 + i * bw + 0.35, 6.15, yCornS - 1.8, 0, 0.14); // pilaster strips
    let y = F.moulding(stone, s0, s1, yCornS - 1.8, [[0.35, 0.18], [0.6, 0.08]]);
    F.repeat(stone, s0, s1, 0.26, 0.13, y, y + 0.18, 0.08, 0.3);
    F.moulding(stone, s0, s1, y + 0.18, [[0.12, 0.45], [0.2, 0.75], [yCornS - y - 0.5, 0.6]]);
  };
  range(k.side('W', SB.u0), SB.v0 + 0.0, SB.v1, { archUpper: true });
  range(k.side('S', SB.v1), SB.u0, SB.u1);
  { const F = k.side('E', SB.u1); range(F, F.s(1.85), F.s(-12.4)); }
  k.hipRoof(M.redTile, SB.u0 - 0.6, SB.u1 + 0.6, SB.v0 - 10, SB.v1 + 0.6, yCornS, 0.54, yDeck, { soffit: stone, clip: clipBelow('v', -26.0), soffitClip: clipBelow('v', SB.v0) }); // clipped clear of the reading-room vault
  // central Loan Hall block with hipped roof and pyramidal skylight
  const CB = { u0: -33.8, u1: -0.4, v0: -9.5, v1: 24.5 };
  k.box(stone, CB.u0, CB.u1, yDeck - 0.5, 23.4, CB.v0, CB.v1);
  for (const [nm, at, a, b] of [['N', CB.v0, CB.u0, CB.u1], ['S', CB.v1, CB.u0, CB.u1], ['W', CB.u0, CB.v0, CB.v1], ['E', CB.u1, CB.v0, CB.v1]]) {
    const F = k.side(nm, at); const s0 = Math.min(F.s(a), F.s(b)), s1 = Math.max(F.s(a), F.s(b));
    F.moulding(stone, s0, s1, 22.9, [[0.2, 0.25], [0.3, 0.5]]);
    const n = Math.round((s1 - s0) / 3.4);
    for (let i = 0; i < n; i++) { const c = s0 + (i + 0.5) * (s1 - s0) / n; F.window(c - 0.7, c + 0.7, 21.0, 22.6, { depth: -0.02, mullions: 1, glassMat: M.windowNight }); }
  }
  k.hipRoof(M.redTile, CB.u0 - 0.3, CB.u1 + 0.3, CB.v0 - 0.3, CB.v1 + 0.3, 23.4, 0.42, 27.3, { soffit: stone });
  // glazed light slots between the Loan Hall block and the side ranges
  k.box(M.glass, -35.9, CB.u0 - 0.3, yDeck - 0.02, yDeck + 0.04, CB.v0, CB.v1); k.box(M.glass, CB.u1 + 0.3, 3.4, yDeck - 0.02, yDeck + 0.04, CB.v0, CB.v1);
  k.box(M.copper, -24.6, -8.4, 27.25, 27.55, -0.6, 15.6);
  k.pyramid(M.glass, -16.5, 7.5, 7.4, 7.4, 27.55, 3.0);
  for (let i = -3; i <= 3; i++) { // skylight glazing bars
    const d = i * 2.1; k.box(bronze, -16.5 + d - 0.05, -16.5 + d + 0.05, 27.55, 27.55 + 3.0 * (1 - Math.abs(d) / 7.4), 0.1, 14.9, { detail: true });
  }
  // raised stair-hall roof between the reading room and the Loan Hall
  k.box(stone, -21.5, -12.0, yDeck - 0.5, 22.7, -21.6, -14.5);
  k.box(M.glass, -20.5, -13.0, 22.7, 22.95, -20.8, -15.2);
  { const P = [[SH.u0 + 0.4, SB.v0], [SB.u0, SB.v0], [SB.u0, SB.v1], [SB.u1, SB.v1], [SB.u1, SB.v0], [SH.u1 - 0.4, SB.v0]]; // open at the stair hall
    for (let i = 0; i + 1 < P.length; i++) colliders.push({ type: 'poly', pts: k.polyLocal([P[i], P[i + 1]]), y0: -3, y1: 27 }); }

  // ===================== LINK (Doe–Bancroft) =====================
  for (const [u0, u1, v0, v1, h] of [[16.0, 21.2, -19.4, 24.0, 13.3], [16.0, 25.0, 24.0, 35.1, 7.5], [SB.u1 - 0.2, 16.0, -17.8, -12.4, 18.0], [SB.u1 - 0.2, 16.0, 1.85, 35.1, 18.0], [21.0, BA.u0 + 0.3, -14.5, 17.5, 18.7]]) {
    k.box(stone, u0, u1, yFound, h, v0, v1);
    k.box(stone, u0 - 0.25, u1 + 0.25, h - 0.5, h, v0 - 0.25, v1 + 0.25);
    colliders.push({ type: 'poly', pts: k.polyLocal([[u0, v0], [u1, v0], [u1, v1], [u0, v1]]), y0: -3, y1: h });
  }
  { // windows facing the AIDS Memorial Courtyard and Campanile Way
    const F = k.side('S', 35.1);
    for (const c of [15.6]) for (const y0 of [4.5, 9.0, 13.5]) F.window(c - 0.7, c + 0.7, y0, y0 + 2.4, { depth: -0.05, mullions: 1 });
  }

  // ===================== BANCROFT LIBRARY (1949) =====================
  const gBe = k.groundMin([[BA.u1, BA.v0], [BA.u1, BA.v1], [BA.u1, 5.2]]);
  const yCornB = 18.4, yAttic = 21.1, yDeckB = 24.8;
  k.box(stone, BA.u0 + 0.5, BA.u1 - 0.5, yFound, yCornB, BA.v0 + 0.5, BA.v1 - 0.5);
  const bancroftFace = (F, s0, s1, entry) => {
    const n = Math.max(1, Math.round((s1 - s0) / 3.9)), bw = (s1 - s0) / n;
    const lo = [], hi = [];
    for (let i = 0; i < n; i++) {
      const c = s0 + (i + 0.5) * bw;
      if (entry != null && Math.abs(c - entry) < bw * 0.6) continue;
      lo.push({ s0: c - 0.75, s1: c + 0.75, y0: 3.4, y1: 6.2 });
      hi.push({ s0: c - 0.95, s1: c + 0.95, y0: 8.4, y1: 15.6 });
    }
    if (entry != null) { lo.push({ s0: entry - 2.2, s1: entry + 2.2, y0: gBe + 0.75, y1: 7.6, arch: true }); hi.push({ s0: entry - 1.5, s1: entry + 1.5, y0: 9.0, y1: 15.6, arch: true }); }
    F.wall(rust, s0, s1, yFound, 7.4, 0.6, lo.filter((o) => o.y1 <= 7.4));
    if (entry != null) { F.wall(rust, entry - 2.2, entry + 2.2, 7.4, 8.0, 0.6, []); }
    F.moulding(stone, s0, s1, 7.4, [[0.2, 0.2], [0.25, 0.32], [0.15, 0.12]]);
    F.wall(stone, s0, s1, 8.0, yCornB - 1.4, 0.6, hi);
    for (const o of lo) F.window(o.s0, o.s1, o.y0, o.y1, { arch: o.arch, mullions: o.arch ? 3 : 1, transoms: o.arch ? [gBe + 3.4] : [], depth: 0.45, frameMat: o.arch ? M.bronze : bronze });
    for (const o of hi) { F.window(o.s0, o.s1, o.y0, o.y1, { arch: o.arch, mullions: 1, transoms: [11.4, 14.0], depth: 0.4 }); F.box(stone, o.s0 - 0.12, o.s1 + 0.12, o.y0 - 0.2, o.y0, 0, 0.12); }
    for (let i = 0; i <= n; i++) F.box(stone, s0 + i * bw - 0.3, s0 + i * bw + 0.3, 8.0, yCornB - 1.4, 0, 0.1);
    const y = F.moulding(stone, s0, s1, yCornB - 1.4, [[0.6, 0.06], [0.2, 0.3], [0.25, 0.55], [0.35, 0.8]]);
    F.box(stone, s0 + 1.2, s1 - 1.2, y, yAttic, -1.8, -1.1);  // attic set back behind the cornice
    if (entry != null) { const st = Math.max(2, Math.round(0.75 / 0.16)); for (let i = 0; i < st; i++) F.box(dark, entry - 3.0 - (st - i) * 0.3, entry + 3.0 + (st - i) * 0.3, yFound, gBe + (i + 1) * 0.75 / st, 0, (st - i) * 0.32); }
  };
  { const F = k.side('E', BA.u1); bancroftFace(F, F.s(BA.v1), F.s(BA.v0), F.s(5.2));
    // r5-east: the east entrance as photographed (Commons "The Bancroft Library, Berkeley, 2022"): incised "THE BANCROFT
    // LIBRARY" on the frieze band over the doorway, and a grey cast-metal lantern on a post beside the steps
    const e = F.s(5.2), lg = new THREE.PlaneGeometry(6.6, 0.56); if (F.m && F.m.determinant() < 0) lg.scale(-1, 1, 1); lg.translate(e, 8.38, 0.104); // mirrored side frames would cull/reverse the lettering
    F.box(stone, e - 3.45, e + 3.45, 8.04, 8.72, 0, 0.1); // raised frieze panel (clears the pilasters)
    F.geom(signMat('THE BANCROFT LIBRARY', { bg: '#d8d2c3', fg: '#46423a', font: 'Georgia, serif', weight: '500', w: 1536, h: 130 }), lg, { uvMode: 'keep' }); // r5-east2: keep the plane's UVs (box UVs hid the text)
    const lx = e + 4.6, ly = gBe + 0.02, metal = M.iron;
    F.box(metal, lx - 0.13, lx + 0.13, ly, ly + 0.35, 1.6, 1.86); F.box(metal, lx - 0.06, lx + 0.06, ly + 0.35, ly + 3.0, 1.67, 1.79);
    F.box(M.lampGlow || stone, lx - 0.2, lx + 0.2, ly + 3.0, ly + 3.62, 1.53, 1.93); F.box(metal, lx - 0.26, lx + 0.26, ly + 3.62, ly + 3.72, 1.47, 1.99); F.box(metal, lx - 0.12, lx + 0.12, ly + 3.72, ly + 3.92, 1.61, 1.85);
  }
  { const F = k.side('N', BA.v0); bancroftFace(F, F.s(BA.u1), F.s(BA.u0)); }
  { const F = k.side('S', BA.v1); bancroftFace(F, BA.u0, BA.u1); }
  k.hipRoof(M.redTile, BA.u0 + 0.5, BA.u1 - 1.2, BA.v0 + 1.2, BA.v1 - 1.2, yAttic, 0.56, yDeckB, { soffit: stone });
  k.box(stone, 37.6, 45.6, yDeckB - 0.5, 28.3, -9.5, 19.5);                    // stack tower penthouse
  k.box(stone, 37.4, 45.8, 27.9, 28.35, -9.7, 19.7);
  k.box(stone, 30.5, 34.6, yDeckB - 0.5, 27.9, -3.5, 13.5);                     // reading-room clerestory monitor
  { const F = k.side('W', 30.5); for (let v = -2.5; v < 13; v += 2.2) F.window(F.s(v) - 0.8, F.s(v) + 0.8, 25.4, 27.4, { depth: -0.03, mullions: 1 }); }
  k.box(stone, 30.3, 34.8, 27.6, 27.95, -3.7, 13.7);
  colliders.push({ type: 'poly', pts: k.polyLocal([[BA.u0, BA.v0], [BA.u1, BA.v0], [BA.u1, BA.v1], [BA.u0, BA.v1]]), y0: -3, y1: 28.3 });
  const [bx, bz] = k.xz(BA.u1 + 1.2, 5.2);
  walkables.push({ type: 'poly', pts: k.polyLocal([[BA.u1, 0.8], [BA.u1 + 1.9, 0.8], [BA.u1 + 1.9, 9.6], [BA.u1, 9.6]]), y: gBe + 0.75 });

  // ===================== INTERIORS =====================
  const ig = buildDoeInterior({ F1, F2: ySill, cs: -17.06, wins: nrrWins, morWinN, morWinW: [[-32.05 - 2.6, -32.05 - 1.0], [-32.05 + 1.0, -32.05 + 2.6]], endWin: { vc: -32.05, hw: 3.4, y0: 8.2, ys: 17.2 } });
  for (const c of ig.colliders) colliders.push({ type: 'poly', pts: k.polyLocal(c.pts), y0: c.y0, y1: c.y1 });
  for (const w of ig.walkables) {
    if (w.type === 'poly') { walkables.push({ type: 'poly', pts: k.polyLocal(w.pts), y: w.y }); continue; }
    const [a, b, c, d] = w.rect, cr = [k.xz(a, b), k.xz(c, b), k.xz(c, d), k.xz(a, d)];
    walkables.push({ type: 'fn', bounds: [Math.min(...cr.map((p) => p[0])), Math.min(...cr.map((p) => p[1])), Math.max(...cr.map((p) => p[0])), Math.max(...cr.map((p) => p[1]))],
      heightAt: (x, z) => { const [u, v] = k.uv(x, z); return u < a || u > c || v < b || v > d ? null : w.f(u, v); } });
  }
  const object3d = k.finish();
  for (const m of object3d.children) if (m.isMesh && m.material === M.windowNight) m.castShadow = false; // let daylight through the glass
  ig.group.rotation.y = k.phi; object3d.add(ig.group);
  ig.group.traverse((o) => { if (o.isMesh) o.frustumCulled = false; }); // compile once while loading, then cull
  const L = (u, y, v) => { const [x, z] = k.xz(u, v); return [x, y, z]; };
  const inf = ig.info, st = { hands: ig.hands, frames: 0 }, A = ctx.anchor;
  return {
    object3d, colliders, walkables, replacesColliders: true, // walkable interior: drop the procedural footprint walls
    interactions: [
      { id: 'doe-north-portal', pos: [ex0(k), 3.2, ez0(k)], radius: 4, label: 'Enter the North Reading Room', teleport: L(inf.cs, inf.F2 + 0.02, inf.nrr.vS - 1.6) },
      { id: 'doe-stair-up', pos: L(inf.cs, inf.F1 + 1, -23.2), radius: 2.2, label: 'Climb the stairs to the North Reading Room', teleport: L(inf.cs, inf.F2 + 0.02, inf.nrr.vS - 1.6) },
      { id: 'doe-nrr-down', pos: L(inf.cs, inf.F2 + 1, inf.nrr.vS - 1.0), radius: 1.6, label: 'Go down to the north entrance', teleport: L(inf.cs, inf.F1 + 0.02, -39.0) },
    ],
    update(dt, env) {
      st.frames++;
      const cp = env.camera.position, [u, v] = k.uv(cp.x - A.x, cp.z - A.z), ly = cp.y - A.y;
      // interior is visible only from inside the building or through the open north portal
      const near = ly < 40 && ((u > -53.5 && u < 19.5 && v > -44 && v < -13) || (Math.abs(u + 17.06) < 16 && v > -80 && v <= -44));
      if (st.frames === 4) ig.group.traverse((o) => { if (o.isMesh) o.frustumCulled = true; });
      ig.group.visible = st.frames < 4 || near;
      if (ig.group.visible) updateDoeInterior(st, env);
    },
  };
}
function ex0(k) { return k.xz(-17.06, -44.5)[0]; }
function ez0(k) { return k.xz(-17.06, -44.5)[1]; }
