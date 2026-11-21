// Foothill student housing kit (William Turnbull Jr., 1990–91): Bay Region shingle style hill village. Brown cedar shingle
// walls on a board-formed concrete plinth, dark green trim and casings around white sashes, dark composition-shingle gable
// roofs with tight eaves and louvred ridge ventilators, cantilevered balcony bays with white diamond-fret guards under steep
// front gables, and a few taller shingled towers. Blocks come from the footprint + LiDAR (frame u,v; eave/ridge absolute).
import * as THREE from 'three';
import { Kit, polysGeo } from './classic-kit.js';
import { bmats, stuccoBlock } from './b08c-kit.js';
import { canvasTex } from './venue-util.js';

const _fm = new WeakMap();
export function fmats(M) {
  if (_fm.has(M)) return _fm.get(M);
  const tint = (base, c, r) => { const m = base.clone(); m.color = new THREE.Color(c); if (r != null) m.roughness = r; return m; };
  const fret = canvasTex(256, 256, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.fillStyle = '#efeee8'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'destination-out';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = (x + 0.5) * W / 4, cy = (y + 0.5) * H / 4; c.beginPath(); c.moveTo(cx, cy - 22); c.lineTo(cx + 16, cy); c.lineTo(cx, cy + 22); c.lineTo(cx - 16, cy); c.closePath(); c.fill(); }
  }, { repeat: true });
  const o = {
    cedar: (() => { // weathered stained cedar shingles: random widths, 0.14 m courses with deep shadow lines
      const t = canvasTex(512, 512, (c, W, H) => {
        let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const rows = 9, rh = H / rows;
        for (let r = 0; r < rows; r++) {
          let x = -rnd() * 60;
          while (x < W) {
            const w = 30 + rnd() * 70; const k = 0.84 + rnd() * 0.22;
            c.fillStyle = `rgb(${Math.round(118 * k)},${Math.round(98 * k)},${Math.round(80 * k)})`;
            c.fillRect(x, r * rh, w, rh);
            c.fillStyle = 'rgba(40,28,20,0.35)'; c.fillRect(x + w - 1, r * rh + rh * 0.2, 1, rh * 0.8);
            x += w;
          }
          const gr = c.createLinearGradient(0, r * rh + rh * 0.55, 0, (r + 1) * rh);
          gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.85, 'rgba(28,18,12,0.45)'); gr.addColorStop(1, 'rgba(15,9,5,0.85)');
          c.fillStyle = gr; c.fillRect(0, r * rh + rh * 0.55, W, rh * 0.45);
        }
      }, { repeat: true });
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 });
    })(),
    roof: tint(M.shingle, 0x4a4746, 0.9),           // dark composition shingle
    trim: new THREE.MeshStandardMaterial({ color: 0x2e4a45, roughness: 0.6 }),
    sash: new THREE.MeshStandardMaterial({ color: 0xefeee6, roughness: 0.5 }),
    fret: new THREE.MeshStandardMaterial({ map: fret, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }),
    plinth: tint(M.concrete, 0xd9d4ca),
  };
  _fm.set(M, o); return o;
}

// One shingled wing. b: {u0,u1,v0,v1,g,eave,ridge,axis, faces?, roof?:'gable'|'hip'|'flat', vent?:bool}
export function fhWing(K, b, F, opt = {}) {
  const M = K.M; const B = bmats(M);
  const span = (b.axis === 'u' ? b.v1 - b.v0 : b.u1 - b.u0) / 2;
  let eave = b.eave, ridge = b.ridge;
  if (b.roof !== 'flat') { const minRise = span * 0.6, maxRise = span * 1.0; if (ridge - eave < minRise) eave = ridge - minRise; if (ridge - eave > maxRise) eave = ridge - maxRise; }
  eave = Math.max(eave, b.g + 3.5);
  const base = b.g + 0.9;
  const res = stuccoBlock(K, {
    u0: b.u0, u1: b.u1, v0: b.v0, v1: b.v1, eave, ridge, axis: b.axis, faces: b.faces, mat: F.cedar, roof: b.roof || 'gable', roofMat: F.roof,
    corniceMat: F.trim, corniceP: 0.12, corniceH: 0.22, frame: F.sash, overhang: 0.32, fh: 2.95, base, y0: b.g - 1.6, depth: 0.3,
    win: { w: 2.5, h: 1.6, mull: 2, tran: 0.6 }, groundWin: { w: 2.5, h: 1.7, mull: 2, tran: 0.6 }, bay: opt.bay ?? 3.6, hipU: b.hipU, hipV: b.hipV,
  });
  // concrete plinth
  K.box(F.plinth, b.u0 - 0.06, b.g - 1.6, b.v0 - 0.06, b.u1 + 0.06, base + 0.15, b.v1 + 0.06);
  // green casings around windows + corner boards
  for (const [f, R] of Object.entries(res.runs)) {
    const nb = Math.max(1, Math.round(R.L / (opt.bay ?? 3.6))); const bw = R.L / nb;
    for (const st of res.stories) {
      if (!st.win) continue;
      for (let i = 0; i < nb; i++) {
        const c = bw * (i + 0.5), w = st.win.w, y0 = st.y0 + st.win.sill, y1 = y0 + st.win.h;
        K.rbox(R, F.trim, c - w / 2 - 0.12, y0 - 0.1, 0, c + w / 2 + 0.12, y0, 0.05, { detail: true });
        K.rbox(R, F.trim, c - w / 2 - 0.12, y1, 0, c + w / 2 + 0.12, y1 + 0.12, 0.05, { detail: true });
        K.rbox(R, F.trim, c - w / 2 - 0.16, y0, 0, c - w / 2, y1, 0.05, { detail: true });
        K.rbox(R, F.trim, c + w / 2, y0, 0, c + w / 2 + 0.16, y1, 0.05, { detail: true });
      }
    }
    K.rbox(R, F.trim, -0.02, base, -0.02, 0.14, eave, 0.04); K.rbox(R, F.trim, R.L - 0.14, base, -0.02, R.L + 0.02, eave, 0.04);
  }
  // louvred ridge ventilator
  const L = b.axis === 'u' ? b.u1 - b.u0 : b.v1 - b.v0;
  if (b.roof !== 'flat' && b.vent === true) {
    const cu = (b.u0 + b.u1) / 2, cv = (b.v0 + b.v1) / 2;
    K.cyl(F.trim, cu, ridge - 0.3, cv, 0.75, 0.75, 1.3, 6);
    K.cyl(B.voidDark, cu, ridge + 0.2, cv, 0.77, 0.77, 0.5, 6, { detail: true });
    K.lathe(F.roof, [[1.0, 0], [0.001, 1.1]], cu, ridge + 1.0, cv, 6);
  }
  return { eave, ridge, runs: res.runs };
}

// Square shingled tower with a steep pyramid roof (top = absolute height of the apex)
export function fhTower(K, F, u0, v0, u1, v1, g, top, { roofH = null } = {}) {
  const w = Math.min(u1 - u0, v1 - v0); const rh = roofH ?? w * 0.9; const eave = top - rh;
  const res = stuccoBlock(K, { u0, u1, v0, v1, eave, mat: F.cedar, roof: false, corniceMat: F.trim, corniceP: 0.15, corniceH: 0.25, frame: F.sash, fh: 2.95, base: g + 0.9, y0: g - 1.6, depth: 0.3, win: { w: 0.8, h: 1.4, mull: 0, tran: 0.6 }, bay: w });
  K.box(F.plinth, u0 - 0.06, g - 1.6, v0 - 0.06, u1 + 0.06, g + 1.05, v1 + 0.06);
  K.hip(F.roof, u0 - 0.35, v0 - 0.35, u1 + 0.35, v1 + 0.35, eave, rh / (w / 2 + 0.35));
  K.cyl(F.trim, (u0 + u1) / 2, top - 0.1, (v0 + v1) / 2, 0.05, 0.03, 1.2, 6, { detail: true });
  return res;
}

// Cantilevered balcony bay on run R at s: white diamond-fret guards at each floor, green posts, steep front gable with lattice.
export function fhBalconyBay(K, F, R, s, w, g, eave, { d = 1.3, floors = null } = {}) {
  const fh = 2.95, base = g + 0.9; const n = floors ?? Math.max(1, Math.floor((eave - base - 1.5) / fh));
  for (let k = 1; k <= n; k++) {
    const y = base + k * fh;
    K.rbox(R, F.trim, s - w / 2, y - 0.25, 0, s + w / 2, y, d);              // deck slab
    const fg = new THREE.PlaneGeometry(w - 0.1, 1.0); fg.translate(s, y + 0.5, d - 0.05); K.addRun(R, F.fret, fg, { uvMode: 'box', detail: true });
    for (const sg of [-1, 1]) { const fg2 = new THREE.PlaneGeometry(d - 0.1, 1.0); fg2.rotateY(Math.PI / 2); fg2.translate(s + sg * (w / 2 - 0.05), y + 0.5, d / 2); K.addRun(R, F.fret, fg2, { uvMode: 'box', detail: true }); }
    K.rbox(R, F.sash, s - w / 2, y + 1.0, d - 0.12, s + w / 2, y + 1.08, d, { detail: true });
  }
  for (const sg of [-1, 1]) K.rbox(R, F.trim, s + sg * (w / 2 - 0.08) - 0.06, base, d - 0.14, s + sg * (w / 2 - 0.08) + 0.06, eave + 0.3, d - 0.02);
  // steep front gable roof over the bay
  const rise = w * 0.75, yE = eave + 0.2;
  const L = d + 0.6;
  const q1 = [[s - w / 2 - 0.2, yE, d + 0.15], [s, yE + rise, d + 0.15], [s, yE + rise, -L + d], [s - w / 2 - 0.2, yE, -L + d]];
  const q2 = [[s, yE + rise, d + 0.15], [s + w / 2 + 0.2, yE, d + 0.15], [s + w / 2 + 0.2, yE, -L + d], [s, yE + rise, -L + d]];
  const rg = polysGeo([q1.slice().reverse(), q2.slice().reverse()]); rg.applyMatrix4(R.m); K.add(F.roof, rg, { uvMode: 'roof' });
  const tri = new THREE.Shape(); tri.moveTo(s - w / 2, yE); tri.lineTo(s + w / 2, yE); tri.lineTo(s, yE + rise - 0.1); tri.lineTo(s - w / 2, yE);
  const tg = new THREE.ShapeGeometry(tri); tg.translate(0, 0, d); K.addRun(R, F.fret, tg, { uvMode: 'box', detail: true });
  const tb = new THREE.ShapeGeometry(tri); tb.translate(0, 0, d - 0.4); K.addRun(R, F.trim, tb, { uvMode: 'box' });
}

// Build a whole Foothill building from blocks; extras(K, F, wings) may add towers/bays. Returns {object3d, colliders}
// opts (optional, refine-east-b): {mats: {cedar, roof, ...} overrides, stagger (plan offset of alternate segments, default 0.35),
// rise (height offset of alternate segments, default 0.9), bay (window bay, default 3.6)}. Defaults keep the original output.
export function foothillBuild(ctx, angDeg, blocks, extras, opts = {}) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(angDeg)); const F = opts.mats ? { ...fmats(ctx.M), ...opts.mats } : fmats(ctx.M);
  const colliders = []; const wings = [];
  let longest = null, lmax = 0;
  for (const b of blocks) { const L = b.axis === 'u' ? b.u1 - b.u0 : b.v1 - b.v0; if (b.roof !== 'flat' && L > lmax) { lmax = L; longest = b; } }
  for (const b of blocks) {
    const L = b.axis === 'u' ? b.u1 - b.u0 : b.v1 - b.v0; const n = b.split === false ? 1 : Math.max(1, Math.round(L / 12.5));
    for (let i = 0; i < n; i++) {
      const a0 = (b.axis === 'u' ? b.u0 : b.v0) + L * i / n, a1 = (b.axis === 'u' ? b.u0 : b.v0) + L * (i + 1) / n;
      const odd = n > 1 && i % 2 === 1; const e = odd ? (opts.stagger ?? 0.35) : 0; const dy = odd ? (opts.rise ?? 0.9) : 0;
      const seg = b.axis === 'u' ? { ...b, u0: a0, u1: a1, v0: b.v0 - e, v1: b.v1 + e } : { ...b, v0: a0, v1: a1, u0: b.u0 - e, u1: b.u1 + e };
      seg.eave = b.eave + dy; seg.ridge = b.ridge + dy; seg.vent = b === longest && i === Math.floor(n / 2);
      seg.faces = { ...(b.faces || {}) };
      if (n > 1 && !odd) { if (b.axis === 'u') { if (i > 0) seg.faces.W = false; if (i < n - 1) seg.faces.E = false; } else { if (i > 0) seg.faces.N = false; if (i < n - 1) seg.faces.S = false; } }
      wings.push(fhWing(K, seg, F, opts.bay ? { bay: opts.bay } : {}));
    }
    colliders.push(K.colPoly([[b.u0, b.v0], [b.u1, b.v0], [b.u1, b.v1], [b.u0, b.v1]], -2, b.ridge + 1.5));
  }
  if (extras) extras(K, F, wings, colliders);
  return { K, object3d: K.finish(), colliders };
}

// Two-storey cantilevered box bay (gridded white sashes in a heavy green frame, flared shingle skirt below)
export function fhBoxBay(K, F, R, s, w, y0, floors = 2, { d = 0.8 } = {}) {
  const M = K.M; const h = floors * 2.95 - 0.4; const y1 = y0 + h;
  K.rbox(R, F.cedar, s - w / 2, y0, 0, s + w / 2, y1, d);
  for (let k = 0; k < floors; k++) {
    const yy = y0 + 0.5 + k * 2.95;
    K.rbox(R, M.windowNight, s - w / 2 + 0.25, yy, d, s + w / 2 - 0.25, yy + 1.8, d + 0.02);
    for (let i = 0; i <= 4; i++) { const x = s - w / 2 + 0.25 + (w - 0.5) * i / 4; K.rbox(R, F.trim, x - 0.06, yy, d, x + 0.06, yy + 1.8, d + 0.06, { detail: true }); }
    K.rbox(R, F.sash, s - w / 2 + 0.25, yy + 1.15, d, s + w / 2 - 0.25, yy + 1.2, d + 0.05, { detail: true });
    K.rbox(R, F.trim, s - w / 2 + 0.15, yy - 0.12, d, s + w / 2 - 0.15, yy, d + 0.08);
    K.rbox(R, F.trim, s - w / 2 + 0.15, yy + 1.8, d, s + w / 2 - 0.15, yy + 1.94, d + 0.08);
  }
  for (let k = 0; k < 3; k++) K.rbox(R, F.cedar, s - w / 2 + 0.15 * (k + 1), y0 - 0.25 * (k + 1), 0, s + w / 2 - 0.15 * (k + 1), y0 - 0.25 * k, d * (1 - 0.3 * (k + 1)));
  K.rbox(R, F.roof, s - w / 2 - 0.1, y1, 0, s + w / 2 + 0.1, y1 + 0.2, d + 0.15);
}

// Merge several Kit outputs (e.g. wings built in different frames) into one group, one mesh per material (+ detail group).
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export function combine(objs) {
  const base = new Map(), det = new Map(), extra = [];
  for (const o of objs) {
    o.updateMatrixWorld(true);
    o.traverse((m) => {
      if (!m.isMesh) return;
      let isDet = false; for (let p = m; p; p = p.parent) if (p.userData && p.userData.detail) { isDet = true; break; }
      if (m.material.map && m.material.transparent) { extra.push(m); return; }
      const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld);
      const map = isDet ? det : base; if (!map.has(m.material)) map.set(m.material, []); map.get(m.material).push(g);
    });
  }
  const root = new THREE.Group(); const dg = new THREE.Group(); dg.userData.detail = true; dg.name = 'detail';
  for (const [map, parent] of [[base, root], [det, dg]]) for (const [mat, list] of map) { const g = mergeGeometries(list, false); if (!g) continue; g.computeBoundingSphere(); const mesh = new THREE.Mesh(g, mat); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); }
  root.add(dg); for (const e of extra) root.add(e);
  return root;
}
