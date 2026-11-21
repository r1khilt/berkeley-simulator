// Berkeley Simulator — refine-south-west site kit (Southside dorms, co-ops, Downtown).
// Everyday details that make a building read as finished and lived-in: name signs, paving aprons, planting beds with
// shrubs, bike racks, benches, pedestrian lamp posts, bins, fire-department connections, rooftop mechanical units.
// Works with classic-kit's Kit (building frame u,v; runs: s along the face, y up, d outward). Everything small is added
// with {detail:true} so the engine hides it beyond ~350 m. Shared materials (ctx.M) are used wherever possible.
import * as THREE from 'three';

const cache = new WeakMap();
function mc(M) { if (!cache.has(M)) cache.set(M, new Map()); return cache.get(M); }
export function siteMat(M, key, opts) { const c = mc(M); if (c.has(key)) return c.get(key); const m = new THREE.MeshStandardMaterial(opts); m.name = 'rsw-' + key; c.set(key, m); return m; }
// one vertex-coloured foliage material for every shrub / planter fill (keeps draw calls down)
export const shrubMat = (M) => siteMat(M, 'shrub', { color: 0xffffff, vertexColors: true, roughness: 0.95, flatShading: true });
export function tintGeo(g, hex) { const c = new THREE.Color(hex); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
// kits may set K.siteMats = {galv, dark} to reuse their own frame / fascia materials for furniture
const GALV = (K) => (K.siteMats && K.siteMats.galv) || galvMat(K.M);
const DARK = (K) => (K.siteMats && K.siteMats.dark) || charcoalMat(K.M);
export const galvMat = (M) => siteMat(M, 'galv', { color: 0x9da3a6, roughness: 0.45, metalness: 0.7 });
export const charcoalMat = (M) => siteMat(M, 'charcoal', { color: 0x34373a, roughness: 0.55, metalness: 0.35 });

// canvas sign texture, cached by text+style
const texCache = new Map();
export function signTex(text, { w = 1024, h = 160, bg = '#2f3336', fg = '#f2efe6', font = 'bold', size = 0.56, track = 0.08, align = 'center', border = null } = {}) {
  const key = [text, w, h, bg, fg, font, size, track, align, border].join('|'); if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } else g.clearRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = h * 0.05; g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1); }
  let fs = Math.floor(h * size); g.fillStyle = fg; g.textBaseline = 'middle';
  const sp = (t) => t.split('').join(String.fromCharCode(8202).repeat(Math.round(track * 10)));
  const txt = track > 0 ? sp(text) : text;
  g.font = `${font} ${fs}px Helvetica, Arial, sans-serif`; while (g.measureText(txt).width > w * 0.9 && fs > 10) { fs -= 2; g.font = `${font} ${fs}px Helvetica, Arial, sans-serif`; }
  g.textAlign = align; g.fillText(txt, align === 'left' ? w * 0.05 : align === 'right' ? w * 0.95 : w / 2, h * 0.54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; texCache.set(key, t); return t;
}
export function signMat(M, text, opts = {}) { const c = mc(M); const key = 'sign:' + text + JSON.stringify(opts); if (c.has(key)) return c.get(key);
  const m = new THREE.MeshStandardMaterial({ map: signTex(text, opts), roughness: opts.rough ?? 0.5, metalness: opts.metal ?? 0.2, transparent: !opts.bg && opts.bg !== undefined }); m.name = 'rsw-sign'; c.set(key, m); return m; }
// flat sign plate on a run face: centre s, bottom y, width w, height h, out at d (faces outward)
export function runSign(K, R, mat, s, y, w, h, d) {
  const g = new THREE.PlaneGeometry(w, h); g.translate(s, y + h / 2, d); K.addRun(R, mat, g, { uvMode: 'keep' });
}

// ---------- shrubs / planting ----------
export function blobGeo(r, seed) { return blob(r, seed); }
function blob(r, seed) { const g = new THREE.IcosahedronGeometry(r, 1); const p = g.attributes.position; let s = seed;
  for (let i = 0; i < p.count; i++) { s = (s * 16807) % 2147483647; const k = 0.82 + (s % 1000) / 1000 * 0.32; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); }
  g.computeVertexNormals(); return g; }
// row of shrubs along a run between s0..s1 at outward distance d, ground from groundFn(s,d)
export function shrubRow(K, R, s0, s1, d, groundFn, { r = 0.55, gap = 0.85, hex = 0x4f6b3a, seed = 7, hexes = null } = {}) {
  const M = K.M; let k = 0;
  for (let s = s0 + r; s <= s1 - r * 0.6; s += gap, k++) {
    const rr = r * (0.8 + ((k * 37 + seed) % 10) / 22); const hx = hexes ? hexes[(k + seed) % hexes.length] : hex;
    const g = tintGeo(blob(rr, 1 + k * 131 + seed * 17), hx); g.translate(s, groundFn(s, d) + rr * 0.55, d + (((k * 53) % 7) - 3) * 0.06);
    K.addRun(R, shrubMat(M), g, { detail: true, uvMode: 'keep' });
  }
}
// raised planter bed with concrete curb and shrubs (run frame): s0..s1, d0..d1 (outward), top y
export function planterBed(K, R, s0, s1, d0, d1, yGround, { curb = 0.45, mat = null, hexes = [0x4f6b3a, 0x5b7a3f, 0x445e33], seed = 3 } = {}) {
  const M = K.M; const m = mat || M.concrete; const y = yGround;
  K.rbox(R, m, s0, y - 0.6, d0, s1, y + curb, d0 + 0.18); K.rbox(R, m, s0, y - 0.6, d1 - 0.18, s1, y + curb, d1);
  K.rbox(R, m, s0, y - 0.6, d0, s0 + 0.18, y + curb, d1); K.rbox(R, m, s1 - 0.18, y - 0.6, d0, s1, y + curb, d1);
  { const g = tintGeo(new THREE.BoxGeometry(s1 - s0 - 0.36, curb + 0.32, d1 - d0 - 0.36), 0x4a3a2c); g.translate((s0 + s1) / 2, y - 0.4 + (curb + 0.32) / 2, (d0 + d1) / 2); K.addRun(R, shrubMat(M), g, { uvMode: 'keep' }); }
  shrubRow(K, R, s0 + 0.25, s1 - 0.25, (d0 + d1) / 2, () => y + curb - 0.15, { r: Math.min(0.6, (d1 - d0) / 2 - 0.1), gap: 0.9, hexes, seed });
}

// ---------- street furniture (run frame: s along, d outward from the face, y = ground) ----------
export function bikeRack(K, R, s, d, y, n = 4, { pitch = 0.9, along = true } = {}) {
  const m = GALV(K);
  for (let i = 0; i < n; i++) {
    const c = s + (i - (n - 1) / 2) * pitch; const path = new THREE.CurvePath();
    const h = 0.85, w = 0.6; const p0 = new THREE.Vector3(-w / 2, 0, 0), p1 = new THREE.Vector3(-w / 2, h - 0.2, 0), p2 = new THREE.Vector3(w / 2, h - 0.2, 0), p3 = new THREE.Vector3(w / 2, 0, 0);
    path.add(new THREE.LineCurve3(p0, p1)); path.add(new THREE.CubicBezierCurve3(p1, new THREE.Vector3(-w / 2, h + 0.05, 0), new THREE.Vector3(w / 2, h + 0.05, 0), p2)); path.add(new THREE.LineCurve3(p2, p3));
    const g = new THREE.TubeGeometry(path, 12, 0.025, 5, false); if (!along) g.rotateY(Math.PI / 2); g.translate(along ? c : s, y - 0.05, along ? d : d + (i - (n - 1) / 2) * pitch - (c - s));
    K.addRun(R, m, g, { detail: true, uvMode: 'keep' });
  }
}
export function bench(K, R, s, d, y, len = 1.8, { back = true, rot = 0 } = {}) {
  const M = K.M; const wood = M.wood, frame = DARK(K);
  const grp = []; const B = (mat, s0, y0, d0, s1, y1, d1) => { const g = new THREE.BoxGeometry(s1 - s0, y1 - y0, d1 - d0); g.translate((s0 + s1) / 2, (y0 + y1) / 2, (d0 + d1) / 2); grp.push([mat, g]); };
  for (let k = 0; k < 4; k++) B(wood, -len / 2, 0.42, -0.22 + k * 0.12, len / 2, 0.46, -0.13 + k * 0.12);
  if (back) for (let k = 0; k < 2; k++) B(wood, -len / 2, 0.58 + k * 0.14, -0.27, len / 2, 0.68 + k * 0.14, -0.23);
  for (const e of [-len / 2 + 0.15, len / 2 - 0.15]) { B(frame, e - 0.03, 0, -0.24, e + 0.03, 0.44, 0.22); if (back) B(frame, e - 0.03, 0.42, -0.3, e + 0.03, 0.9, -0.24); }
  for (const [mat, g] of grp) { g.rotateY(rot); g.translate(s, y, d); K.addRun(R, mat, g, { detail: true }); }
}
export function bins(K, R, s, d, y) {
  const body = DARK(K), lid = GALV(K);
  for (const off of [0, 0.62, 1.24]) { K.rbox(R, body, s + off - 0.27, y, d - 0.27, s + off + 0.27, y + 0.95, d + 0.27, { detail: true }); K.rbox(R, lid, s + off - 0.3, y + 0.95, d - 0.3, s + off + 0.3, y + 1.02, d + 0.3, { detail: true }); }
}
// pedestrian lamp post (building frame position)
export function lampPost(K, u, v, y, h = 4.2) {
  const M = K.M; const m = DARK(K);
  K.cyl(m, u, y - 0.3, v, 0.11, 0.07, h + 0.3, 8, { detail: true });
  K.cyl(m, u, y + h, v, 0.09, 0.26, 0.22, 10, { detail: true });
  K.cyl(M.lampGlow, u, y + h - 0.12, v, 0.2, 0.2, 0.12, 10, { detail: true });
}
// fire department connection: brass siamese on a short red-painted pipe at the wall
export function fdc(K, R, s, y) {
  K.rbox(R, DARK(K), s - 0.08, y, 0.0, s + 0.08, y + 0.75, 0.16, { detail: true });
  K.rbox(R, GALV(K), s - 0.28, y + 0.6, 0.12, s + 0.28, y + 0.82, 0.32, { detail: true });
}
// rooftop mechanical units in a building-frame rectangle (avoids `avoid` rects); rnd = () => [0,1)
export function rooftopUnits(K, rect, y, rnd, { n = 4, avoid = [], big = false } = {}) {
  const m = GALV(K); const dark = DARK(K);
  const [u0, v0, u1, v1] = rect; let placed = 0;
  for (let t = 0; t < n * 8 && placed < n; t++) {
    const w = big ? 2.4 + rnd() * 1.6 : 1.2 + rnd() * 1.8, d = big ? 1.6 + rnd() * 0.8 : 1.0 + rnd() * 1.2, h = big ? 1.3 + rnd() * 0.5 : 0.9 + rnd() * 0.8; const u = u0 + 0.8 + rnd() * (u1 - u0 - 1.6 - w), v = v0 + 0.8 + rnd() * (v1 - v0 - 1.6 - d);
    if (avoid.some(([a, b, c, e]) => u < c + 0.8 && u + w > a - 0.8 && v < e + 0.8 && v + d > b - 0.8)) continue;
    avoid.push([u, v, u + w, v + d]); placed++;
    K.box(m, u, y, v, u + w, y + h, v + d, { detail: true });
    K.cyl(dark, u + w * 0.5, y + h, v + d * 0.5, Math.min(w, d) * 0.32, Math.min(w, d) * 0.32, 0.12, 12, { detail: true }); // fan shroud
    K.box(dark, u - 0.05, y, v - 0.05, u + w + 0.05, y + 0.12, v + d + 0.05, { detail: true }); // curb
  }
}
// guard rail around a rectangle at height y (building frame)
export function roofRail(K, rect, y, { h = 1.07, post = 2.0 } = {}) {
  const m = GALV(K); const [u0, v0, u1, v1] = rect;
  const edges = [[u0, v0, u1, v0], [u1, v0, u1, v1], [u1, v1, u0, v1], [u0, v1, u0, v0]];
  for (const [a, b, c, d] of edges) { const L = Math.hypot(c - a, d - b); const n = Math.max(1, Math.round(L / post));
    for (const yy of [y + h, y + h * 0.5]) { const g = new THREE.BoxGeometry(L, 0.04, 0.04); g.rotateY(-Math.atan2(d - b, c - a)); g.translate((a + c) / 2, yy, (b + d) / 2); K.add(m, g, { detail: true }); }
    for (let i = 0; i <= n; i++) { const u = a + (c - a) * i / n, v = b + (d - b) * i / n; K.box(m, u - 0.025, y, v - 0.025, u + 0.025, y + h, v + 0.025, { detail: true }); } }
}
