// Interior kit (interiors-cafe branch): enterable, furnished landmark interiors.
//  - Instancer: furniture pieces authored once (merged per material key) and drawn as one InstancedMesh per part.
//  - Atlas + signQuad: canvas-texture menu boards / signage in one emissive atlas material (one draw call).
//  - lightPools: additive radial "light pools" under fixtures — fake warm interior lighting at zero light cost
//    (real PointLights would change the scene light count and recompile every shader when a landmark streams in).
//  - gate(): per-frame distance gate — the interior group, its glow and pools only exist near the camera.
// Everything is authored in the Kit's BUILDING FRAME (u, y, v); put the group under a parent rotated by -K.a.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const bx = (w, h, d, x = 0, y = 0, z = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
export const cy = (r0, r1, h, x = 0, y = 0, z = 0, seg = 10) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(x, y + h / 2, z); return g; };
const clean = (g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); g.morphAttributes = {}; return g; };
export const mergeAll = (list) => mergeGeometries(list.map(clean), false);
const rotX = (g, a, y0 = 0, z0 = 0) => { g.translate(0, -y0, -z0); g.rotateX(a); g.translate(0, y0, z0); return g; };

// ---------- furniture library (local frame: origin on the floor, the sitter / user faces -z) ----------
export function furnitureLib() {
  const L = {};
  // moulded plywood shell chair on chrome legs (MLK dining room)
  L.shellChair = {
    seat: [bx(0.46, 0.025, 0.44, 0, 0.455, 0), rotX(bx(0.44, 0.3, 0.022, 0, 0.78, 0.215), -0.16, 0.6, 0.215)],
    metal: [-1, 1].flatMap((sx) => [-1, 1].map((sz) => cy(0.011, 0.011, 0.45, sx * 0.19, 0, sz * 0.18, 6))).concat([bx(0.4, 0.014, 0.014, 0, 0.2, 0.18), bx(0.4, 0.014, 0.014, 0, 0.2, -0.18)]),
  };
  // bistro chair: black steel frame, timber seat (café interior); patio variant uses a metal seat material key
  const bistroFrame = () => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => bx(0.022, 0.45, 0.022, sx * 0.19, 0.225, sz * 0.19)))
    .concat([-1, 1].map((sx) => rotX(bx(0.022, 0.42, 0.022, sx * 0.19, 0.67, 0.2), -0.1, 0.46, 0.2)), [rotX(bx(0.42, 0.07, 0.02, 0, 0.84, 0.215), -0.1, 0.46, 0.2), rotX(bx(0.42, 0.03, 0.02, 0, 0.66, 0.205), -0.1, 0.46, 0.2), bx(0.4, 0.016, 0.016, 0, 0.17, 0.19), bx(0.4, 0.016, 0.016, 0, 0.17, -0.19)]);
  L.bistroChair = { seat: [bx(0.43, 0.035, 0.43, 0, 0.465, 0)], metal: bistroFrame() };
  // round café table, white top on a chrome pedestal
  L.roundTable = { top: [cy(0.38, 0.38, 0.03, 0, 0.72, 0, 20)], metal: [cy(0.035, 0.035, 0.7, 0, 0.02, 0, 8), cy(0.24, 0.22, 0.025, 0, 0, 0, 14)] };
  // square two/four-top: timber top, black steel legs
  L.squareTable = { top: [bx(0.76, 0.035, 0.76, 0, 0.735, 0)], metal: [-1, 1].flatMap((sx) => [-1, 1].map((sz) => bx(0.035, 0.72, 0.035, sx * 0.33, 0.36, sz * 0.33))).concat([bx(0.7, 0.05, 0.03, 0, 0.69, 0.33), bx(0.7, 0.05, 0.03, 0, 0.69, -0.33)]) };
  // long communal table 2.4 x 0.9
  L.longTable = { top: [bx(2.4, 0.045, 0.9, 0, 0.735, 0)], metal: [-1, 1].flatMap((sx) => [bx(0.05, 0.71, 0.75, sx * 1.05, 0.355, 0), bx(0.05, 0.05, 0.8, sx * 1.05, 0.03, 0)]).concat([bx(2.1, 0.05, 0.05, 0, 0.68, 0)]) };
  // bar stool (counter ledges)
  L.barStool = { seat: [cy(0.18, 0.18, 0.05, 0, 0.74, 0, 14)], metal: [cy(0.025, 0.025, 0.72, 0, 0.02, 0, 6), cy(0.2, 0.18, 0.02, 0, 0, 0, 12), (() => { const t = new THREE.TorusGeometry(0.16, 0.01, 4, 14); t.rotateX(Math.PI / 2); t.translate(0, 0.3, 0); return t; })()] };
  // upholstered lounge armchair + white cube side table (MLK living room)
  L.lounge = { fabric: [bx(0.78, 0.2, 0.74, 0, 0.32, 0.02), bx(0.78, 0.46, 0.17, 0, 0.6, 0.31), bx(0.13, 0.3, 0.76, -0.36, 0.5, 0.02), bx(0.13, 0.3, 0.76, 0.36, 0.5, 0.02)], dark: [-1, 1].flatMap((sx) => [-1, 1].map((sz) => bx(0.03, 0.22, 0.03, sx * 0.34, 0.11, sz * 0.32))) };
  L.cubeTable = { white: [bx(0.45, 0.45, 0.45, 0, 0.225, 0)] };
  // patio table: round dark steel top on a pedestal
  L.patioTable = { top: [cy(0.4, 0.4, 0.025, 0, 0.72, 0, 18)], metal: [cy(0.03, 0.03, 0.7, 0, 0.02, 0, 6), cy(0.26, 0.24, 0.03, 0, 0, 0, 12)] };
  // tray-return / trash station, napkin cart
  L.binStation = { dark: [bx(1.2, 1.05, 0.6, 0, 0.525, 0)], white: [bx(1.22, 0.05, 0.62, 0, 1.075, 0)] };
  return L;
}

export class Instancer {
  constructor(lib, boxUV) { this.lib = lib; this.boxUV = boxUV; this.geo = new Map(); this.inst = new Map(); }
  add(name, u, y, v, yaw = 0) { if (!this.inst.has(name)) this.inst.set(name, []); this.inst.get(name).push([u, y, v, yaw]); }
  // chair facing a point (tu, tv) in the building frame
  addFacing(name, u, y, v, tu, tv) { this.add(name, u, y, v, Math.atan2(-(tu - u), -(tv - v))); }
  count() { let n = 0; for (const l of this.inst.values()) n += l.length; return n; }
  // one InstancedMesh per piece type: parts merged with baked vertex colours (colors[piece]?.[key] ?? colors[key]) under one material
  buildVC(parent, mat, colors) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(); let tris = 0;
    for (const [name, list] of this.inst) {
      const def = this.lib[name]; if (!def) continue; const parts = [];
      for (const key of Object.keys(def)) { const hex = (colors[name] && colors[name][key]) ?? colors[key]; if (hex == null) continue; const c = new THREE.Color(hex);
        for (const g0 of def[key]) { let g = clean(g0.clone()); const n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); parts.push(g); } }
      let g = mergeGeometries(parts, false); if (this.boxUV) { const c = g.attributes.color; g = this.boxUV(g); if (!g.attributes.color) g.setAttribute('color', c); }
      const im = new THREE.InstancedMesh(g, mat, list.length); im.name = 'furn:' + name;
      list.forEach(([u, y, v, yaw], i) => { q.setFromEuler(e.set(0, yaw, 0)); m4.compose(p.set(u, y, v), q, s); im.setMatrixAt(i, m4); });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true; im.userData.keep = true; parent.add(im); tris += (g.attributes.position.count / 3) * list.length;
    }
    return tris;
  }
  build(parent, mats) { // mats: {key: material} with optional per-piece overrides mats[piece] = {key: material}
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    let tris = 0;
    for (const [name, list] of this.inst) {
      const def = this.lib[name]; if (!def) continue;
      for (const key of Object.keys(def)) {
        const gk = name + '|' + key; let g = this.geo.get(gk);
        if (!g) { g = mergeAll(def[key].map((x) => x.clone())); if (this.boxUV) g = this.boxUV(g); this.geo.set(gk, g); }
        const mat = (mats[name] && mats[name][key]) || mats[key]; if (!mat) continue;
        const im = new THREE.InstancedMesh(g, mat, list.length); im.name = 'furn:' + gk;
        list.forEach(([u, y, v, yaw], i) => { q.setFromEuler(e.set(0, yaw, 0)); m4.compose(p.set(u, y, v), q, s); im.setMatrixAt(i, m4); });
        im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true; im.userData.keep = true;
        parent.add(im); tris += (g.attributes.position.count / 3) * list.length;
      }
    }
    return tris;
  }
}

// ---------- canvas atlas for menu boards and signage ----------
export class Atlas {
  constructor(w = 2048, h = 1024) { this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h; this.g = this.c.getContext('2d'); this.x = 0; this.y = 0; this.row = 0; this.W = w; this.H = h; }
  rect(pw, ph, draw) {
    if (this.x + pw > this.W) { this.x = 0; this.y += this.row + 2; this.row = 0; }
    const x = this.x, y = this.y; this.x += pw + 2; this.row = Math.max(this.row, ph);
    const g = this.g; g.save(); g.beginPath(); g.rect(x, y, pw, ph); g.clip(); g.translate(x, y); draw(g, pw, ph); g.restore();
    return [x / this.W, 1 - (y + ph) / this.H, (x + pw) / this.W, 1 - y / this.H];
  }
  texture() { const t = new THREE.CanvasTexture(this.c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t; }
}
// vertical quad centred at (u, y, v), w wide, h tall, facing outward normal angle `face` (radians in the u-v plane; 0 = +u)
export function signQuad(rect, w, h, u, y, v, face) {
  const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; const [u0, v0, u1, v1] = rect;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
  g.rotateY(Math.PI / 2 - face); g.translate(u, y, v); return g;
}
// text helpers for canvas boards
export function fitText(g, txt, maxW, px, font = 'bold', fam = 'Helvetica Neue, Arial, sans-serif') { let s = px; do { g.font = `${font} ${s}px ${fam}`; s -= 2; } while (g.measureText(txt).width > maxW && s > 8); }
export function menuBoard(g, w, h, { title, items = [], bg = '#1d1f22', fg = '#f4efe4', accent = '#fdb515', prices = true } = {}) {
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, bg); grd.addColorStop(1, shade(bg, -0.25)); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = accent; g.fillRect(0, h * 0.2, w, 3);
  g.textBaseline = 'middle'; g.fillStyle = accent; fitText(g, title, w * 0.9, Math.round(h * 0.13)); g.textAlign = 'center'; g.fillText(title, w / 2, h * 0.11);
  const n = Math.max(1, items.length), rh = (h * 0.74) / n; g.textAlign = 'left';
  items.forEach((it, i) => {
    const y = h * 0.25 + rh * (i + 0.5); g.fillStyle = fg; fitText(g, it, w * 0.66, Math.round(Math.min(rh * 0.55, h * 0.075)), '600'); g.fillText(it, w * 0.06, y);
    if (prices) { g.textAlign = 'right'; g.fillStyle = accent; g.fillText((7 + ((i * 37 + it.length * 13) % 90) / 10).toFixed(2), w * 0.94, y); g.textAlign = 'left'; }
  });
}
export function shade(hex, k) { const c = new THREE.Color(hex); if (k < 0) c.multiplyScalar(1 + k); else c.lerp(new THREE.Color(1, 1, 1), k); return '#' + c.getHexString(); }

// ---------- fake warm light: additive radial pools on floors / tables ----------
let _poolTex = null;
function poolTex() {
  if (_poolTex) return _poolTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.55)'); r.addColorStop(0.7, 'rgba(255,255,255,0.15)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); _poolTex = new THREE.CanvasTexture(c); _poolTex.colorSpace = THREE.SRGBColorSpace; return _poolTex;
}
// pools: [[u, y, v, radius], ...] horizontal; returns an InstancedMesh (additive, no depth write)
export function lightPools(pools, { color = 0xffc98a, opacity = 0.32 } = {}) {
  const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: poolTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const im = new THREE.InstancedMesh(g, mat, Math.max(1, pools.length)); const m4 = new THREE.Matrix4();
  pools.forEach(([u, y, v, r], i) => { m4.makeScale(r, 1, r); m4.setPosition(u, y + 0.012, v); im.setMatrixAt(i, m4); });
  im.count = pools.length; im.computeBoundingSphere(); im.renderOrder = 2; im.name = 'lightPools'; im.userData.keep = true; im.userData.baseOpacity = opacity;
  return im;
}
// warm emissive fixture material (always on — these are indoor lights in business hours)
export function furnMat() { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.55, metalness: 0.1, emissive: 0x2e2620 }); m.userData.fill = 1; return m; }
export function glowMat(color = 0xfff1d8, emissive = 0xffd29a, intensity = 2.2) { return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.4 }); }
// interior surface: clone of a (tinted) shared material with a faint self-lit warm fill, so rooms under a deep roof read lit
export function warmFill(mat, k = 0.18, warm = 0xffe2bf) {
  const m = mat.clone(); if (mat.onBeforeCompile) { m.onBeforeCompile = mat.onBeforeCompile; m.customProgramCacheKey = mat.customProgramCacheKey; }
  m.emissive = new THREE.Color(mat.color).multiply(new THREE.Color(warm)); m.emissiveMap = mat.map || null; m.emissiveIntensity = k; m.userData.fill = k; return m;
}

// ---------- distance gate ----------
// group: interior Group (in the landmark root); centre: [x, z] world; mats: emissive mats to scale; pools: lightPools meshes
export function gate({ group, centre, showR = 150, glow = [], fills = [], pools = [], side = null }) {
  const base = glow.map((m) => m.emissiveIntensity);
  let lastN = -1, lastVis = null;
  return (dt, env) => {
    const c = env.camera.position; const d = Math.hypot(c.x - centre[0], c.z - centre[1]);
    const vis = d < showR && (!side || side(c.x, c.z)); if (vis !== lastVis) { group.visible = vis; lastVis = vis; }
    if (!vis) return;
    const n = Math.round((env.night || 0) * 20) / 20; if (n === lastN) return; lastN = n;
    glow.forEach((m, i) => { m.emissiveIntensity = base[i] * (0.75 + 0.35 * n); });
    fills.forEach((m) => { m.emissiveIntensity = m.userData.fill * (0.8 + 1.1 * n); });
    pools.forEach((p) => { p.material.opacity = p.userData.baseOpacity * (0.7 + 0.9 * n); });
  };
}

// camera-side predicate in a Kit building frame: fn(u, v) -> bool
export function sidePred(anchor, ang, fn) { const ca = Math.cos(ang), sa = Math.sin(ang); return (x, z) => { const dx = x - anchor.x, dz = z - anchor.z; return fn(dx * ca + dz * sa, -dx * sa + dz * ca); }; }
