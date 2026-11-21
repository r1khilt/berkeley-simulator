// BAMPFA: Berkeley Art Museum and Pacific Film Archive (Diller Scofidio + Renfro, 2016), built into the 1939 UC Printing
// Plant at Center St & Oxford St. Massing from the 2021 LiDAR: the white Art Deco plant along Oxford St (three storeys,
// ~13.5 m) and its low north wing on Center St; the original press hall behind it still shows its north-light sawtooth roof
// (three teeth, 7 -> 11 m); the new stainless-steel shell rises from the press hall to a ridge (~18 m) behind the Oxford block
// and bulges out, lifted off the ground, at the Addison end; a rounded steel box (the café) sits on the Center St wing.
// The west wall carries the big outdoor LED screen.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { polyRuns, std, inset } from './lib/b06-modern.js';
import { nightGlow } from '../materials.js';

export const info = {
  id: 'berkeley-art-museum-pacific-film-archive',
  name: 'Berkeley Art Museum & Pacific Film Archive',
  subtitle: 'Diller Scofidio + Renfro · 2016',
  blurb: 'BAMPFA moved downtown in 2016 into the 1939 UC Printing Plant, wrapped by a new stainless-steel volume designed by Diller Scofidio + Renfro, with a large outdoor LED screen for films and video art.',
  replaces: ['w/396383943'],
};

function seamTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#c9d0d6'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) { const x = i * 64; const sh = 0.94 + 0.06 * ((i * 7) % 3) / 2; g.fillStyle = `rgb(${201 * sh | 0},${208 * sh | 0},${214 * sh | 0})`; g.fillRect(x + 2, 0, 60, 256); g.fillStyle = '#8f979e'; g.fillRect(x, 0, 2, 256); }
  for (let i = 0; i < 4; i++) { g.fillStyle = '#9aa2a8'; g.fillRect(i * 64, ((i * 97) % 256), 64, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function screenTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 512, 320); gr.addColorStop(0, '#1d3b6b'); gr.addColorStop(0.5, '#a23b52'); gr.addColorStop(1, '#f0a23a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 320);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = 'bold 64px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('BAMPFA', 256, 180);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function letterTex(text) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 96; const g = c.getContext('2d');
  g.clearRect(0, 0, 2048, 96); g.fillStyle = '#3a3d40'; g.font = 'bold 62px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 1024, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export async function build(ctx) {
  const ANG = -0.157; const K = new Kit(ctx, ANG); const M = ctx.M;
  const white = M.stuccoWhite.clone(); white.color.set(0xffffff); white.roughness = 0.8; white.name = 'bampfaWhite';
  const steel = new THREE.MeshStandardMaterial({ map: seamTex(), color: 0xffffff, metalness: 0.8, roughness: 0.32, envMapIntensity: 1.4, side: THREE.DoubleSide }); steel.name = 'bampfaSteel';
  const frame = std(0x2c2f33, 'bampfaFrame', { rough: 0.5, metal: 0.5 });
  const orange = std(0xe2531e, 'bampfaOrange', { rough: 0.6, emissive: 0x401204 });
  const scr = nightGlow(new THREE.MeshStandardMaterial({ map: screenTex(), color: 0x666666, roughness: 0.35, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0.0 }), 1.0); scr.name = 'bampfaScreen';
  scr.emissiveMap = scr.map; scr.emissiveIntensity = 1.6;
  const glass = M.windowNight;
  const colliders = [];
  const g = (u, v) => K.g(u, v);

  // ---------- 1939 press hall with the north-light sawtooth roof ----------
  const HALL = [[-34.0, -7.5], [10.5, -7.5], [10.5, 29.9], [-35.4, 29.9]];
  { const g0 = Math.min(...HALL.map(([u, v]) => g(u, v))) - 1;
    K.prism(M.concreteDark, inset(HALL, 0.5), g0, 6.8);
    for (const { R } of polyRuns(K, HALL)) {
      const isWest = R.n[0] < -0.8; const top = isWest ? 12.6 : 8.0;
      const gA = Math.max(g(...R.a), 0);
      if (isWest) {
        K.rbox(R, white, 0, g0, -0.4, R.L, top, 0);
        // the outdoor LED screen high on the west wall, with a steel surround and a canopy over the entry below
        const s0 = R.L * 0.18, s1 = R.L * 0.18 + 15.5;
        K.rbox(R, steel, s0 - 0.5, 3.6, 0, s1 + 0.5, 12.0, 0.35);
        const pg = new THREE.PlaneGeometry(15.5, 8.0); pg.translate((s0 + s1) / 2, 7.9, 0.37); K.addRun(R, scr, pg, { uvMode: 'keep' });
        K.rbox(R, frame, s0 - 0.2, 3.0, 0, s1 + 0.2, 3.25, 2.4);
        K.rbox(R, glass, s0, gA + 0.05, -0.45, s1, 2.95, -0.4); for (let s = s0; s <= s1; s += 1.55) K.rbox(R, frame, s - 0.04, gA, -0.45, s + 0.04, 3.0, -0.3);
      } else {
        // white concrete with Deco pilasters and steel multi-pane windows
        const nb = Math.max(1, Math.round(R.L / 3.8)); const ops = [];
        for (let i = 0; i < nb; i++) { const c = (i + 0.5) * R.L / nb; ops.push({ s0: c - 0.75, s1: c + 0.75, y0: gA + 1.0, y1: Math.min(top - 1.2, gA + 4.2) }); }
        K.wall(R, white, 0, R.L, g0, top, ops, 0.35);
        for (const o of ops) K.fill(R, o, { mull: 2, tran: [o.y0 + (o.y1 - o.y0) * 0.33, o.y0 + (o.y1 - o.y0) * 0.66], rev: 0.25, frame, glass });
        for (let i = 0; i <= nb; i++) K.rbox(R, white, i * R.L / nb - 0.3, g0, 0, i * R.L / nb + 0.3, top + 0.2, 0.22);
      }
    }
    // sawtooth teeth: vertical north-light glazing at the ridge, roof sloping down to the south
    const teeth = [[-7.5, 4.5], [4.5, 16.8], [16.8, 29.9]];
    for (const [va, vb] of teeth) {
      const yLo = 7.0, yHi = 11.0, uA = -34.0, uB = 10.5;
      const pos = [uA, yHi, va, uB, yLo, vb, uB, yHi, va, uA, yHi, va, uA, yLo, vb, uB, yLo, vb];
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.computeVertexNormals(); K.add(M.concreteDark, rg, { uvMode: 'roof' });
      K.box(glass, uA, yLo - 0.1, va - 0.08, uB, yHi - 0.15, va); // clerestory glazing (faces north)
      for (let u = uA; u <= uB; u += 2.2) K.box(frame, u - 0.05, yLo - 0.1, va - 0.12, u + 0.05, yHi, va + 0.02, { detail: true });
      K.box(white, uA - 0.3, yHi - 0.15, va - 0.25, uB + 0.3, yHi + 0.1, va + 0.15);
      // gable-end infill on east/west walls
      for (const uu of [uA - 0.2, uB + 0.2]) { const tri = uu > 0 ? [uu, 8.0, va, uu, yHi, va, uu, 8.0, vb] : [uu, 8.0, va, uu, 8.0, vb, uu, yHi, va]; const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3)); tg.computeVertexNormals(); K.add(white, tg); }
    }
    colliders.push({ type: 'poly', pts: K.polyXZ(HALL), y0: g0, y1: 12 });
  }

  // ---------- Center Street wing (low, white, with the museum lettering) ----------
  const NWING = [[-15.6, -32.0], [10.2, -32.0], [10.2, -39.6], [21.5, -39.8], [21.5, -7.5], [-15.6, -7.5]];
  { const g0 = Math.min(...NWING.map(([u, v]) => g(u, v))) - 1; const top = 9.2;
    K.prism(M.concreteDark, inset(NWING, 0.5), g0, top - 0.2);
    for (const { R } of polyRuns(K, NWING)) {
      if (R.n[1] > 0.8) continue; // south side is inside the hall
      const gA = Math.max(g(...R.a), g(...R.b));
      const nb = Math.max(1, Math.round(R.L / 4.2)); const ops = [];
      for (let i = 0; i < nb; i++) { const c = (i + 0.5) * R.L / nb; ops.push({ s0: c - 1.3, s1: c + 1.3, y0: gA + 0.4, y1: gA + 4.6 }); }
      K.wall(R, white, 0, R.L, g0, top, ops, 0.4);
      for (const o of ops) { K.fill(R, o, { mull: 2, tran: [o.y0 + 2.2], rev: 0.3, frame, glass }); for (let y = o.y0 + 2.4; y < o.y1 - 0.1; y += 0.22) K.rbox(R, frame, o.s0, y, -0.28, o.s1, y + 0.04, -0.24, { detail: true }); }
      for (let i = 0; i <= nb; i++) K.rbox(R, white, i * R.L / nb - 0.35, g0, 0, i * R.L / nb + 0.35, top + 0.25, 0.2);
      K.rbox(R, white, -0.1, top - 0.3, 0, R.L + 0.1, top + 0.3, 0.3);
      if (R.n[1] < -0.8 && R.L > 20) { const lg = new THREE.PlaneGeometry(R.L * 0.92, R.L * 0.92 * 96 / 2048); lg.translate(R.L / 2, top - 1.1, 0.42); const lm = new THREE.MeshStandardMaterial({ map: letterTex('BERKELEY ART MUSEUM · PACIFIC FILM ARCHIVE'), transparent: true, roughness: 0.6 }); lm.name = 'bampfaLetters'; K.addRun(R, lm, lg, { uvMode: 'keep' }); }
    }
    K.prism(M.concreteDark, inset(NWING, 0.2), top - 0.25, top);
    colliders.push({ type: 'poly', pts: K.polyXZ(NWING), y0: g0, y1: top });
  }

  // ---------- Oxford Street block (three storeys, Art Deco pilasters + steel windows) ----------
  const EAST = [[21.5, -40.0], [29.4, -40.0], [24.7, 29.8], [21.5, 29.8]];
  { const g0 = Math.min(...EAST.map(([u, v]) => g(u, v))) - 1; const top = 13.6; const fl = [5.2, 9.3];
    K.prism(M.concreteDark, inset(EAST, 0.5), g0, top - 0.2);
    for (const { R } of polyRuns(K, EAST)) {
      if (R.n[0] < -0.8) continue; // west side is under the steel shell
      const gA = Math.max(g(...R.a), g(...R.b));
      const nb = Math.max(1, Math.round(R.L / 4.5));
      const st = [{ y0: g0, y1: fl[0] }, { y0: fl[0], y1: fl[1] }, { y0: fl[1], y1: top }];
      for (const [k, s] of st.entries()) {
        const ops = []; for (let i = 0; i < nb; i++) { const c = (i + 0.5) * R.L / nb; const w = 1.35; ops.push({ s0: c - w / 2, s1: c + w / 2, y0: k === 0 ? gA + 1.0 : s.y0 + 1.0, y1: k === 0 ? Math.min(fl[0] - 0.8, gA + 3.6) : Math.min(s.y1 - 0.9, s.y0 + 3.0) }); }
        K.wall(R, white, 0, R.L, s.y0, s.y1, ops, 0.35);
        for (const o of ops) { K.fill(R, o, { mull: 1, tran: [o.y0 + (o.y1 - o.y0) * 0.33, o.y0 + (o.y1 - o.y0) * 0.66], rev: 0.3, frame, glass }); K.rbox(R, white, o.s0 - 0.6, o.y1 + 0.1, -0.12, o.s1 + 0.6, o.y1 + 0.9, -0.05); }
      }
      for (let i = 0; i <= nb; i++) K.rbox(R, white, i * R.L / nb - 0.32, g0, 0, i * R.L / nb + 0.32, top + 0.35, 0.25);
      K.rbox(R, white, -0.1, top - 0.35, 0, R.L + 0.1, top + 0.4, 0.32);
      for (const f of fl) K.rbox(R, white, 0, f - 0.12, 0, R.L, f + 0.12, 0.1);
      if (R.n[0] > 0.8) { // main entrance "2120" with a slim canopy near the north end
        const s = R.L * 0.12; K.rbox(R, frame, s - 2.0, gA + 3.3, 0, s + 2.0, gA + 3.5, 1.6); K.rbox(R, glass, s - 1.2, gA, -0.5, s + 1.2, gA + 3.2, -0.45); }
    }
    K.box(M.concreteDark, 21.7, top - 0.25, -39.8, 26.0, top, 29.6);
    colliders.push({ type: 'poly', pts: K.polyXZ(EAST), y0: g0, y1: top });
  }

  // ---------- new stainless-steel shell: rises from the hall to a ridge behind the Oxford block ----------
  {
    const uW = 10.5, uR = 21.5, uE = 24.0, v0 = -8.0, v1 = 29.8;
    const roofH = (u) => (u <= uR ? 12.0 + 6.0 * (1 - Math.pow(1 - (u - uW) / (uR - uW), 1.6)) : 18.0 - 4.4 * Math.pow((u - uR) / (uE - uR), 0.8));
    const bulge = (y, gy) => 3.0 * Math.sin(Math.PI * Math.min(1, Math.max(0, (y - gy) / 16)));
    const NU = 16, NV = 12; const pos = [];
    const vEnd = (u, y) => v1 + bulge(y, 1.5);
    const P = (i, j) => { const u = uW + (uE - uW) * i / NU; const y = roofH(u); const v = v0 + (vEnd(u, y) - v0) * j / NV; return [u, y, v]; };
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1); pos.push(...a, ...c, ...b, ...a, ...d, ...c); }
    // west face over the hall roof: steel wall from the hall roof up to the shell eave
    for (let j = 0; j < NV; j++) { const va = v0 + (v1 - v0) * j / NV, vb = v0 + (v1 - v0) * (j + 1) / NV; pos.push(uW, 6.8, va, uW, 6.8, vb, uW, 12.0, vb, uW, 6.8, va, uW, 12.0, vb, uW, 12.0, va); }
    // south end: warped bulging face, lifted 0.6 m off the sidewalk
    const NY = 10; for (let i = 0; i < NU; i++) for (let k = 0; k < NY; k++) {
      const ua = uW + (uE - uW) * i / NU, ub = uW + (uE - uW) * (i + 1) / NU; const gy = g(ua, v1) + 0.6;
      const ya0 = gy + (roofH(ua) - gy) * k / NY, ya1 = gy + (roofH(ua) - gy) * (k + 1) / NY, yb0 = gy + (roofH(ub) - gy) * k / NY, yb1 = gy + (roofH(ub) - gy) * (k + 1) / NY;
      const A = [ua, ya0, v1 + bulge(ya0, gy)], B = [ub, yb0, v1 + bulge(yb0, gy)], C = [ub, yb1, v1 + bulge(yb1, gy)], D = [ua, ya1, v1 + bulge(ya1, gy)];
      pos.push(...A, ...B, ...C, ...A, ...C, ...D);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.computeVertexNormals(); K.add(steel, sg);
    K.prism(M.concreteDark, [[uW + 0.4, v0], [uE - 0.4, v0], [uE - 0.4, v1 - 0.3], [uW + 0.4, v1 - 0.3]], g(16, 10) - 1, 11.5);
    // glazed wedge seam where the steel peels away from the old block (orange interior behind)
    K.box(orange, 20.6, g(22, 29) + 0.2, 27.0, 21.2, 12.5, 29.0);
    const wg = [21.4, g(22, 30), 29.85, 24.6, g(22, 30), 29.85, 21.9, 15.8, 29.85]; const wgg = new THREE.BufferGeometry(); wgg.setAttribute('position', new THREE.Float32BufferAttribute(wg, 3)); wgg.computeVertexNormals(); K.add(M.glass, wgg);
    for (const [a, b] of [[21.4, 21.9], [23.0, 22.8]]) K.box(frame, a - 0.05, g(22, 30), 29.8, a + 0.05, 14.5, 29.95, { detail: true });
    colliders.push({ type: 'poly', pts: K.polyXZ([[uW, v0], [uE, v0], [uE, v1 + 2.5], [uW, v1 + 2.5]]), y0: g(16, 30) + 1.2, y1: 18 });
    colliders.push({ type: 'poly', pts: K.polyXZ([[uW, v0], [uE, v0], [uE, v1], [uW, v1]]), y0: -2, y1: 18 });
  }
  // ---------- the café: faceted stainless tube on the Center St wing, cantilevered west past the wing, glazed ends ----------
  {
    const uA = 1.5, uB = 24.5, yb = 9.3; const topA = 13.9, topB = 15.3; const ch = 2.0;
    const sec = (u) => { const t = (u - uA) / (uB - uA); const yt = topA + (topB - topA) * t; const va = -36.0 - 3.6 * t, vb = -25.5 + 2.5 * t; const y0 = yb - 0.6 * (1 - t) * (1 - t); return [[va, y0], [vb, y0], [vb, yt - ch], [vb - ch, yt], [va + ch, yt], [va, yt - ch]]; };
    const va = -39.6, vb = -23.0;
    const N = 12; const pos = [];
    for (let i = 0; i < N; i++) { const u0 = uA + (uB - uA) * i / N, u1 = uA + (uB - uA) * (i + 1) / N; const S0 = sec(u0), S1 = sec(u1);
      for (let k = 0; k < S0.length; k++) { const k2 = (k + 1) % S0.length; const A = [u0, S0[k][1], S0[k][0]], B = [u0, S0[k2][1], S0[k2][0]], C = [u1, S1[k2][1], S1[k2][0]], D = [u1, S1[k][1], S1[k][0]];
        pos.push(...A, ...C, ...B, ...A, ...D, ...C); } }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.computeVertexNormals(); K.add(steel, tg);
    for (const [uu, sgn] of [[uA, -1], [uB, 1]]) { const S = sec(uu); const fp = []; for (let k = 1; k < S.length - 1; k++) fp.push(uu, S[0][1], S[0][0], uu, S[k][1], S[k][0], uu, S[k + 1][1], S[k + 1][0]);
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.computeVertexNormals(); K.add(M.glass, fg);
      for (let v = va + 1.5; v < vb; v += 1.5) K.box(frame, uu - 0.06, yb, v - 0.04, uu + 0.06, sec(uu)[3][1] - 0.2, v + 0.04, { detail: true });
      K.box(orange, uu - sgn * 1.2, yb + 0.2, va + 0.6, uu - sgn * 1.1, yb + 3.6, vb - 0.6); }
    colliders.push({ type: 'poly', pts: K.polyXZ([[uA, va], [uB, va], [uB, vb], [uA, vb]]), y0: yb, y1: topB });
  }
  // ---------- triangular-section steel prow cantilevered over the south sidewalk (the footprint jut), big triangular window ----------
  {
    const u0 = 6.9, u1 = 13.8, vA = 26.0, vB = 34.4, yb = 6.2, yt = 13.6; const um = (u0 + u1) / 2;
    const tri = (v) => [[u0, yb, v], [u1, yb, v], [um + 1.2, yt, v]];
    const A = tri(vA), B = tri(vB); const pos = [];
    for (let k = 0; k < 3; k++) { const k2 = (k + 1) % 3; pos.push(...A[k], ...B[k], ...B[k2], ...A[k], ...B[k2], ...A[k2]); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.computeVertexNormals();
    const steel2 = steel; K.add(steel2, pg);
    const wpos = [...B[0], ...B[1], ...B[2]].map((v, i) => (i % 3 === 2 ? v + 0.02 : v)); const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3)); wg.computeVertexNormals(); K.add(M.glass, wg);
    K.box(orange, u0 + 1.0, yb + 0.2, vB - 1.4, u1 - 1.0, yb + 3.0, vB - 1.3);
    for (const f of [0.33, 0.66]) K.box(frame, u0 + (um + 1.2 - u0) * f - 0.05, yb, vB - 0.02, u0 + (um + 1.2 - u0) * f + 0.05, yb + (yt - yb) * f, vB + 0.06);
  }
  // ---------- brushed-aluminium BAMPFA letters on the lawn in front of the screen (west) ----------
  { const lm = std(0xc9cdd0, 'bampfaLetterAl', { rough: 0.35, metal: 0.8 }); const R = K.run([-41.5, 18.0], [-41.5, 2.0]); const gA = K.g(-41.5, 10);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const cg = cv.getContext('2d'); cg.fillStyle = '#fff'; cg.font = 'bold 120px Helvetica, Arial, sans-serif'; cg.textBaseline = 'middle'; cg.fillText('BAMPFA', 14, 66);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const am = new THREE.MeshStandardMaterial({ map: tx, alphaTest: 0.5, transparent: false, roughness: 0.35, metalness: 0.8, color: 0xc9cdd0, side: THREE.DoubleSide }); am.name = 'bampfaLettersAl';
    const g = new THREE.PlaneGeometry(6.0, 1.5); g.translate(8.0, gA + 0.8, 0); K.addRun(R, am, g, { uvMode: 'keep' });
    K.rbox(R, M.soil, 4.5, gA - 0.3, -1.2, 11.5, gA + 0.12, 1.2); void lm; }
  const object3d = K.finish(); object3d.name = 'bampfa';
  return { object3d, colliders };
}
