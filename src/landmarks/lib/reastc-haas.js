// reastc-haas: shared palette + signature pieces for the Haas School of Business complex (Moore Ruble Yudell, 1995:
// Cheit Hall, the Bakar Faculty Building, the Student Services Building around O'Donnell Courtyard; plus Chou Hall, 2017).
// One palette so the four buildings read as a single complex: sand-beige stucco with a lighter cast-stone trim, grey-taupe
// horizontal siding on the upper storeys of the wings, dark blue-grey slate roofs with a copper-brown fascia,
// teal-green multi-pane steel windows (glass = the shared M.windowNight so the furnished-room window shader applies).
// Built on classic-kit's Kit runs (s along the run, y up, d outward).
import * as THREE from 'three';
import { boardTex } from './b05b-kit.js';
import { Kit } from './classic-kit.js';

const _cache = new WeakMap();
export function haasMats(M) {
  if (_cache.has(M)) return _cache.get(M);
  const clone = (base, hex, name, extra = {}) => { const m = M[base].clone(); m.color = new THREE.Color(hex); m.name = 'haas-' + name; Object.assign(m, extra); return m; };
  const b = boardTex();
  const siding = new THREE.MeshStandardMaterial({ color: 0xcfc6b8, roughness: 0.9, map: b.map, normalMap: b.normalMap }); siding.normalScale = new THREE.Vector2(0.45, 0.45); siding.name = 'haas-siding';
  const X = {
    stucco: clone('stuccoWhite', 0xebdabd, 'stucco'),       // smooth sand-beige render (~#D8C9AE)
    cast: clone('stuccoWhite', 0xf8eedb, 'cast'),          // lighter cast-stone trim, plinths, voussoirs (~#E3D5BC)
    siding,                                                  // grey-taupe horizontal siding (~#7B766E)
    roof: clone('slate', 0xb9a596, 'roof', { roughness: 0.8 }),  // dark charcoal-brown slate/concrete tile (~#3B3633)
    fascia: new THREE.MeshStandardMaterial({ color: 0x8a4a32, roughness: 0.55, metalness: 0.25, name: 'haas-fascia' }), // copper-brown eave band
    teal: new THREE.MeshStandardMaterial({ color: 0x4f7a63, roughness: 0.5, metalness: 0.15, name: 'haas-teal' }),      // window frames
    steel: new THREE.MeshStandardMaterial({ color: 0xbdbdb6, roughness: 0.45, metalness: 0.55, name: 'haas-steel' }),   // pergola / trellis
  };
  _cache.set(M, X); return X;
}

// Arch opening helpers for K.wall: the part of a semicircular-headed opening (centre s, width w, crown yTop) that lies in
// the band [y0, y1]. Returns null when the band misses the opening.
export function archPart(s, w, yTop, y0, y1) {
  const r = w / 2, spring = yTop - r;
  if (y0 >= yTop - 0.05 || y1 <= y0) return null;
  if (y0 < spring + 0.01) {
    if (y1 >= yTop) return { s0: s - r, s1: s + r, y0, y1: yTop, arch: true, noFill: true };
    return { s0: s - r, s1: s + r, y0, y1, noFill: true };          // band ends below the crown: square cut (archivolt covers the corners)
  }
  const dy = y0 - spring; const hc = Math.sqrt(Math.max(0.01, r * r - dy * dy));
  if (y1 >= yTop) return { s0: s - hc, s1: s + hc, y0, y1: yTop, arch: 'seg', rise: yTop - y0, noFill: true };
  return { s0: s - hc, s1: s + hc, y0, y1, noFill: true };
}

// Great arched portal on run R (the wall itself must already have the arch hole, see archPart): stepped archivolt with
// impost blocks, a barrel-vaulted porch `depth` deep with glazed teal doors at the back, and an oriel bay above the crown
// carried on stepped corbels. g = floor level, s = centre, w = clear width, yTop = crown height.
export function archPortal(K, R, s, g, w, yTop, { depth = 4.0, X, oriel = { w: 5.2, h: 4.2, proj: 1.25, gap: 0.6 }, wallD = 0.4, through = false, gFar = null } = {}) {
  const M = K.M; const r = w / 2, spring = yTop - r;
  // archivolt: three stepped orders + keystone, impost bands and plinths
  for (const [r0, r1, d1] of [[r, r + 0.35, 0.12], [r + 0.35, r + 0.7, 0.24], [r + 0.7, r + 0.95, 0.34]]) {
    const sh = new THREE.Shape(); const n = 16;
    for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; const p = [s + Math.cos(a) * r1, spring + Math.sin(a) * r1]; i ? sh.lineTo(...p) : sh.moveTo(...p); }
    for (let i = n; i >= 0; i--) { const a = Math.PI * i / n; sh.lineTo(s + Math.cos(a) * r0, spring + Math.sin(a) * r0); }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: d1 + 0.02, bevelEnabled: false, curveSegments: 4 }); geo.translate(0, 0, -0.02); K.addRun(R, X.cast, geo);
  }
  K.rbox(R, X.cast, s - 0.45, yTop + 0.55, 0, s + 0.45, yTop + 1.05, 0.4); // keystone
  for (const sg of [-1, 1]) {
    const e = s + sg * r;
    K.rbox(R, X.cast, Math.min(e, e + sg * 1.2), g - 0.6, 0, Math.max(e, e + sg * 1.2), spring, 0.3);   // arch-flanking piers
    K.rbox(R, X.cast, Math.min(e - sg * 0.05, e + sg * 1.1), spring - 0.35, 0, Math.max(e - sg * 0.05, e + sg * 1.1), spring, 0.4); // impost
  }
  // porch: side walls, barrel vault, paving, back wall of glazed doors
  for (const sg of [-1, 1]) K.rbox(R, X.stucco, sg < 0 ? s - r - 0.3 : s + r, g - 0.6, -depth - wallD, sg < 0 ? s - r : s + r + 0.3, spring, -wallD + 0.01);
  { const vg = new THREE.CylinderGeometry(r, r, depth, 18, 1, true, Math.PI / 2, Math.PI); vg.rotateX(Math.PI / 2); vg.scale(-1, 1, 1); vg.translate(s, spring, -wallD - depth / 2); K.addRun(R, X.cast, vg); }
  if (through) { // open through-passage: level for the first third, then a broad flight down to the far side; doors in the side walls
    const gf = gFar ?? g; const d0 = Math.min(depth * 0.35, 6.0); const len = depth + wallD - d0; const n = Math.max(1, Math.round(Math.abs(g - gf) / 0.16));
    K.rbox(R, M.paving, s - r, Math.min(g, gf) - 0.6, -d0, s + r, g + 0.02, 0.0);
    for (let k = 0; k < n; k++) { const ya = g - (g - gf) * (k + 1) / n; K.rbox(R, M.paving, s - r, Math.min(g, gf) - 0.6, -d0 - len * (k + 1) / n, s + r, ya + 0.02, -d0 - len * k / n); }
    for (const sg of [-1, 1]) { const Rs = sg < 0 ? K.run(R.at(s - r, -wallD - 0.6), R.at(s - r, -wallD - 3.6)) : K.run(R.at(s + r, -wallD - 3.6), R.at(s + r, -wallD - 0.6));
      K.rbox(Rs, M.windowNight, 0.2, g + 0.05, 0.02, 2.8, g + 2.7, 0.04); for (const x of [0.2, 1.5, 2.8]) K.rbox(Rs, X.teal, x - 0.05, g + 0.05, 0.04, x + 0.05, g + 2.7, 0.1); K.rbox(Rs, X.teal, 0.2, g + 2.65, 0.04, 2.8, g + 2.75, 0.1); }
    K.rbox(R, M.lampGlow, s - 0.25, spring + r - 0.12, -wallD - 3.0, s + 0.25, spring + r - 0.02, -wallD - 2.5, { detail: true });
    K.rbox(R, M.lampGlow, s - 0.25, spring + r - 0.12, -wallD - depth + 3.0, s + 0.25, spring + r - 0.02, -wallD - depth + 3.5, { detail: true });
    K.rbox(R, M.bronze, s + r + 0.25, g + 1.5, 0.3, s + r + 0.85, g + 2.1, 0.33, { detail: true });
  } else K.rbox(R, M.paving, s - r, g - 0.3, -depth - wallD, s + r, g + 0.02, 0.0);
  const back = through ? null : K.run(R.at(s - r, -depth - wallD), R.at(s + r, -depth - wallD));
  if (back) {
  // glazed back wall filling the arch: storefront doors below a transom, a gridded fanlight above (reads as a lit passage)
  const bo = { s0: 0.05, s1: w - 0.05, y0: g, y1: yTop - 0.05, arch: true };
  K.wall(back, X.stucco, -0.3, w + 0.3, g - 0.6, yTop + 0.4, [bo], 0.3);
  { const sh = new THREE.Shape(); const pts = []; const n = 16; pts.push([bo.s0, g], [bo.s1, g]); for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; pts.push([w / 2 + Math.cos(a) * (w / 2 - 0.05), spring + Math.sin(a) * (w / 2 - 0.05)]); }
    sh.setFromPoints(pts.map(([a, b]) => new THREE.Vector2(a, b))); const gg = new THREE.ShapeGeometry(sh); gg.translate(0, 0, -0.2); K.addRun(back, M.windowNight, gg, { uvMode: 'keep' }); }
  const nm = Math.max(2, Math.round(w / 1.1)); for (let i = 1; i < nm; i++) { const x = w * i / nm; const top = spring + Math.sqrt(Math.max(0, (w / 2) ** 2 - (x - w / 2) ** 2)); K.rbox(back, X.teal, x - 0.05, g, -0.2, x + 0.05, top, -0.1); }
  for (const yy of [g + 2.7, spring]) { const half = Math.sqrt(Math.max(0, (w / 2) ** 2 - Math.max(0, yy - spring) ** 2)); K.rbox(back, X.teal, w / 2 - half, yy - 0.06, -0.2, w / 2 + half, yy + 0.06, -0.1); }
  K.rbox(R, M.lampGlow, s - 0.25, spring + r - 0.12, -wallD - depth * 0.5 - 0.25, s + 0.25, spring + r - 0.02, -wallD - depth * 0.5 + 0.25, { detail: true }); // pendant light in the vault
  K.rbox(R, M.bronze, s + r + 0.25, g + 1.5, 0.3, s + r + 0.85, g + 2.1, 0.33, { detail: true }); // name plaque on the right pier
  }
  // oriel bay over the crown on stepped corbels
  if (oriel) {
    const { w: ow, proj: op, gap } = oriel; const y0 = yTop + 1.05 + gap; const y1 = y0 + Math.min(oriel.h, (oriel.maxTop ?? Infinity) - y0);
    for (const c of [s - ow / 2 + 0.45, s, s + ow / 2 - 0.45]) for (let k = 0; k < 4; k++) K.rbox(R, X.cast, c - 0.34, y0 - 0.38 * (k + 1), 0, c + 0.34, y0 - 0.38 * k, op * (1 - k * 0.22));
    K.rbox(R, X.cast, s - ow / 2 - 0.1, y0 - 0.25, 0, s + ow / 2 + 0.1, y0, op + 0.12); // sill slab
    const ch = 0.7; // canted corners
    const A = R.at(s - ow / 2, 0), B = R.at(s - ow / 2 + ch, op), C = R.at(s + ow / 2 - ch, op), D = R.at(s + ow / 2, 0);
    for (const [p, q] of [[A, B], [B, C], [C, D]]) {
      const Rr = K.run(p, q); const L = Rr.L; const nm = Math.max(1, Math.round(L / 0.55));
      const o = { s0: 0.15, s1: L - 0.15, y0: y0 + 0.35, y1: y1 - 0.3, muntins: 4, sill: false };
      K.wall(Rr, X.stucco, 0, L, y0, y1, [o], 0.25);
      K.fill(Rr, o, { rev: 0.12, frame: X.teal, mull: nm - 1 });
    }
    // small hipped cap (slate) with the copper-brown fascia line, tucked under the main eave
    K.rbox(R, X.fascia, s - ow / 2 - 0.15, y1, -0.05, s + ow / 2 + 0.15, y1 + 0.22, op + 0.25);
    { const a = R.at(s - ow / 2 - 0.25, -0.3), b = R.at(s + ow / 2 + 0.25, op + 0.35); const ua = [Math.min(a[0], b[0]), Math.max(a[0], b[0])], va = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
      K.hip(X.roof, ua[0], va[0], ua[1], va[1], y1 + 0.22, 0.55); }
  }
}

// Ground-floor loggia on run R between s0..s1: square stucco piers on the wall line, glazed storefront `rec` behind,
// a light steel pergola (beams + slats) projecting `pd` in front at the pier tops. g = floor, h = loggia height.
export function loggia(K, R, s0, s1, g, h, { X, pitch = 4.2, rec = 2.4, pier = 0.8, pd = 1.8, pergola = true, yBase } = {}) {
  const M = K.M; const L = s1 - s0; const n = Math.max(1, Math.round(L / pitch)); const bw = L / n;
  const yb = yBase ?? g - 0.8;
  for (let i = 0; i <= n; i++) { const c = Math.min(s1 - pier / 2, Math.max(s0 + pier / 2, s0 + bw * i)); K.rbox(R, X.stucco, c - pier / 2, yb, -pier, c + pier / 2, g + h, 0.02); K.rbox(R, X.cast, c - pier / 2 - 0.06, g + h - 0.35, -pier - 0.04, c + pier / 2 + 0.06, g + h - 0.1, 0.08); }
  K.rbox(R, X.cast, s0, g + h, -rec, s1, g + h + 0.45, 0.06);                       // lintel band over the piers
  K.rbox(R, X.cast, s0, g + h - 0.02, -rec, s1, g + h + 0.02, -0.2);                // soffit
  K.rbox(R, X.cast, s0, yb, -rec, s1, g - 0.1, 0.03);                                // plinth under the loggia floor
  K.rbox(R, M.paving, s0, g - 0.1, -rec, s1, g + 0.02, 0.0);                          // loggia floor
  // storefront: glass + teal mullions every ~1.4 m, a transom bar, door pairs at every other bay
  K.rbox(R, M.windowNight, s0, g, -rec - 0.04, s1, g + h, -rec);
  const nm = Math.max(1, Math.round(L / 1.4)); for (let i = 0; i <= nm; i++) { const s = s0 + L * i / nm; K.rbox(R, X.teal, s - 0.04, g, -rec, s + 0.04, g + h, -rec + 0.1, { detail: i > 0 && i < nm }); }
  K.rbox(R, X.teal, s0, g + 2.6, -rec, s1, g + 2.7, -rec + 0.1, { detail: true });
  K.rbox(R, X.stucco, s0, yb, -rec - 0.6, s1, g + 0.0, -rec); // base under the storefront
  if (pergola) { // light steel pergola: outriggers at every pier, an edge beam and slats (chunky enough to read at distance)
    const yP = g + h + 0.1;
    for (let i = 0; i <= n; i++) { const c = Math.min(s1 - 0.2, Math.max(s0 + 0.2, s0 + bw * i)); K.rbox(R, X.steel, c - 0.1, yP, 0.02, c + 0.1, yP + 0.32, pd); }
    K.rbox(R, X.steel, s0, yP + 0.04, pd - 0.18, s1, yP + 0.32, pd);
    const ns = Math.max(1, Math.round(L / 0.6)); for (let i = 0; i <= ns; i++) { const s = s0 + L * i / ns; K.rbox(R, X.steel, s - 0.05, yP + 0.32, 0.05, s + 0.05, yP + 0.46, pd, { detail: true }); }
  }
}

// Tall stucco chimney / exhaust stack with a cast-stone cap (building frame u,v).
export function stack(K, u, v, y0, y1, X, { w = 1.4, d = 1.0 } = {}) {
  K.box(X.stucco, u - w / 2, y0, v - d / 2, u + w / 2, y1, v + d / 2);
  K.box(X.cast, u - w / 2 - 0.12, y1, v - d / 2 - 0.12, u + w / 2 + 0.12, y1 + 0.3, v + d / 2 + 0.12);
  K.box(X.fascia, u - w / 2 + 0.15, y1 + 0.3, v - d / 2 + 0.15, u + w / 2 - 0.15, y1 + 0.55, v + d / 2 - 0.15);
}

// Slender modern courtyard pole light (silver-grey pole, flat disc luminaire), building frame u,v at ground y.
export function discLamp(K, u, y, v, h = 6.0, X) {
  K.cyl(X.steel, u, y - 0.3, v, 0.08, 0.06, h + 0.3, 8, { detail: true });
  K.cyl(X.steel, u, y + h, v, 0.36, 0.36, 0.1, 14, { detail: true });
  K.cyl(K.M.lampGlow, u, y + h - 0.04, v, 0.3, 0.3, 0.04, 14, { detail: true });
}

// Projecting arcade in front of an existing wall on run R (s0..s1): square stucco piers on the outer line `dep` out,
// a cast lintel + thin roof slab back to the wall, paving, and an optional steel pergola above. g = walk level.
export function arcade(K, R, s0, s1, g, h, { X, pitch = 4.0, dep = 2.4, pier = 0.7, pergola = true, yBase } = {}) {
  const M = K.M; const L = s1 - s0; const n = Math.max(1, Math.round(L / pitch)); const bw = L / n; const yb = yBase ?? g - 1.0;
  for (let i = 0; i <= n; i++) { const c = Math.min(s1 - pier / 2, Math.max(s0 + pier / 2, s0 + bw * i)); K.rbox(R, X.stucco, c - pier / 2, yb, dep - pier, c + pier / 2, g + h, dep); K.rbox(R, X.cast, c - pier / 2 - 0.06, g + h - 0.35, dep - pier - 0.06, c + pier / 2 + 0.06, g + h - 0.12, dep + 0.06); }
  K.rbox(R, X.cast, s0, g + h, 0, s1, g + h + 0.5, dep + 0.05);
  K.rbox(R, X.fascia, s0, g + h + 0.5, 0, s1, g + h + 0.62, dep + 0.12);
  K.rbox(R, X.cast, s0, yb, 0, s1, g - 0.1, dep + 0.03); K.rbox(R, M.paving, s0, g - 0.1, 0, s1, g + 0.03, dep);
  if (pergola) { const yP = g + h + 0.62; const ns = Math.max(1, Math.round(L / 0.6));
    for (let i = 0; i <= ns; i++) { const s = s0 + L * i / ns; K.rbox(R, X.steel, s - 0.05, yP, 0.1, s + 0.05, yP + 0.16, dep + 1.2, { detail: true }); }
    K.rbox(R, X.steel, s0, yP, dep + 1.05, s1, yP + 0.2, dep + 1.2, { detail: true }); }
}

// A Kit authoring in its own rotated frame (angle a, Kit convention) that merges into the main kit's material buckets.
// (Frame -> main-frame rotation is rotY(main.a - a), so that main.finish()'s rotY(-main.a) yields rotY(-a) overall.)
export class FrameKit extends Kit {
  constructor(main, a) { super(main.ctx, a); this.buckets = main.buckets; this.detail = main.detail; this.extra = main.extra; this.pre = new THREE.Matrix4().makeRotationY(main.a - a); }
  add(mat, geo, opts) { const g = super.add(mat, geo, opts); g.applyMatrix4(this.pre); return g; }
}
