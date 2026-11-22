// Berkeley Simulator — street furniture / campus props.
// Every builder returns { parts: [{ geometry, material, depthMaterial?, distanceMaterial? }], collider, size }.
// Units: metres. Origin at the ground centre of the object, +y up, the "front" faces +z.
// Geometry is merged per material, non-indexed, attributes: position / normal / uv (box-projected metres/2 for tiled
// shared materials). Parts with depthMaterial/distanceMaterial (the waving flag) need mesh.customDepthMaterial etc.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { materials, boxUV, U, nightGlow } from '../materials.js';
import { CAMPUS_MAP } from './campusMapData.js'; // r4-props2: real campus outline for the kiosk map

const TAU = Math.PI * 2;
export const PROP_NAMES = ['campusLamp', 'streetLight', 'bench', 'trashCan', 'recyclingBin', 'bikeRack', 'parkedBike', 'bollard',
  'fireHydrant', 'busShelter', 'picnicTable', 'drinkingFountain', 'utilityPole', 'trafficSignal', 'stopSign', 'streetNameSign',
  'newsRack', 'infoKiosk', 'flagpole', 'scooter'];

// ------------------------------------------------------------------ local materials
let _L = null;
function L() {
  if (_L) return _L;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  _L = {
    galv: std({ color: 0xa7abad, roughness: 0.5, metalness: 0.7, name: 'prop:galvanized' }), // r4-props: less blue
    steel: std({ color: 0xc9ccce, roughness: 0.3, metalness: 0.9, name: 'prop:stainless' }),
    charcoal: std({ color: 0x2c2f31, roughness: 0.55, metalness: 0.45, name: 'prop:charcoal' }),
    rubber: std({ color: 0x161616, roughness: 0.9, metalness: 0, name: 'prop:rubber' }),
    hydrant: std({ color: 0xe0b51e, roughness: 0.55, metalness: 0.15, name: 'prop:hydrantYellow' }),
    recycle: std({ color: 0x1d5ea6, roughness: 0.5, metalness: 0.1, name: 'prop:recycleBlue' }),
    poleWood: std({ color: 0x5e4c3b, roughness: 0.95, metalness: 0, name: 'prop:poleWood' }),
    ceramic: std({ color: 0x6e4a32, roughness: 0.25, metalness: 0, name: 'prop:insulator' }),
    signalYellow: std({ color: 0xd8b21c, roughness: 0.55, metalness: 0.2, name: 'prop:signalYellow' }),
    lime: std({ color: 0x35c84a, roughness: 0.45, metalness: 0.1, name: 'prop:limeGreen' }),
    bikePaint: std({ color: 0x7a2a2a, roughness: 0.35, metalness: 0.3, name: 'prop:bikePaint' }),
    newsRed: std({ color: 0xa42420, roughness: 0.45, metalness: 0.2, name: 'prop:newsRed' }),
    aluminium: std({ color: 0xd4d7d9, roughness: 0.35, metalness: 0.85, name: 'prop:aluminium' }),
    signBack: std({ color: 0x9a9fa3, roughness: 0.5, metalness: 0.6, name: 'prop:signBack' }),
  };
  return _L;
}

function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t;
}
const _tex = {};
const texCache = (key, f) => (_tex[key] ??= f());

// ------------------------------------------------------------------ geometry helpers
class Parts {
  constructor() { this.map = new Map(); }
  add(mat, geo, { uv = 'box' } = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (uv === 'box') g = boxUV(g);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g);
    return this;
  }
  build(extra = {}) {
    const parts = [];
    for (const [material, geos] of this.map) {
      const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      parts.push({ geometry, material, ...(extra[material.name] || {}) });
    }
    const b = new THREE.Box3(); for (const p of parts) b.union(p.geometry.boundingBox);
    return { parts, size: b.getSize(new THREE.Vector3()).toArray().map((v) => +v.toFixed(3)), bounds: { min: b.min.toArray(), max: b.max.toArray() } };
  }
}
// transform helper: t(geo, x, y, z, rx, ry, rz, sx, sy, sz)
function t(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  g.applyMatrix4(m); return g;
}
const box = (w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => t(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
// box standing on y0 (bottom face at y0)
const boxY = (w, h, d, x, y0, z, ry = 0) => t(new THREE.BoxGeometry(w, h, d), x, y0 + h / 2, z, 0, ry, 0);
const cyl = (rt, rb, h, seg, x = 0, y0 = 0, z = 0, open = false) => t(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), x, y0 + h / 2, z);
// cylinder between two points
function rod(a, b, r, seg = 6, r2 = r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const d = B.clone().sub(A); const len = d.length();
  const g = new THREE.CylinderGeometry(r2, r, len, seg, 1, false); g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  g.applyQuaternion(q); g.translate(A.x, A.y, A.z); return g;
}
const sphere = (r, ws, hs, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => t(new THREE.SphereGeometry(r, ws, hs), x, y, z, 0, 0, 0, sx, sy, sz);
const lathe = (pts, seg, x = 0, y = 0, z = 0) => t(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), x, y, z);
const torus = (R, r, rs, ts, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, arc = TAU) => t(new THREE.TorusGeometry(R, r, rs, ts, arc), x, y, z, rx, ry, rz);
function tubePath(points, r, segs, rs = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  return new THREE.TubeGeometry(curve, segs, r, rs, false);
}
function polyCurve(points) { // piecewise-linear curve (sharp corners) for tubes
  const cp = new THREE.CurvePath(); for (let i = 1; i < points.length; i++) cp.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i]))); return cp;
}
// flat panel facing +z with 0..1 UVs (for textured faces)
function panel(w, h, x, y, z, ry = 0, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
  const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  return t(g, x, y, z, 0, ry, 0);
}

// r4-props: soft contact shadow for small props (most scatters don't cast real shadows, for performance, so they
// looked pasted onto the ground): a radial-gradient decal quad just above the ground, shared by every prop that uses it.
function contactShadow(P, w, d, x = 0, z = 0, k = 0.55) {
  const Lm = L();
  const tex = texCache('contact', () => canvasTex(64, 64, (g, W, H) => { const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }, { srgb: false }));
  const m = Lm.contact || (Lm.contact = new THREE.MeshBasicMaterial({ color: 0x000000, map: tex, transparent: true, opacity: k, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, name: 'prop:contactShadow' }));
  P.add(m, t(new THREE.PlaneGeometry(w, d), x, 0.014, z, -Math.PI / 2, 0, 0), { uv: 'keep' });
}

// ------------------------------------------------------------------ props
export function campusLamp() { // r4-props: cast-iron post on a moulded bell base, fluted shaft with collars, acorn globe on a fitter, ~4.2 m
  const M = materials(), P = new Parts();
  // stepped plinth + bell base with mouldings (cast iron), 0.9 m
  P.add(M.lampGreen, lathe([[0, 0], [0.235, 0], [0.235, 0.05], [0.215, 0.07], [0.215, 0.12], [0.2, 0.15], [0.17, 0.2], [0.15, 0.3], [0.13, 0.46], [0.115, 0.6],
    [0.13, 0.63], [0.13, 0.67], [0.105, 0.7], [0.095, 0.82], [0.11, 0.85], [0.11, 0.89], [0.085, 0.92], [0, 0.92]], 14));
  const shaft = new THREE.CylinderGeometry(0.06, 0.075, 2.3, 24, 3, true); const p = shaft.attributes.position;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const k = 1 + 0.08 * Math.cos(12 * a); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  shaft.computeVertexNormals(); P.add(M.lampGreen, t(shaft, 0, 0.9 + 1.15, 0));
  P.add(M.lampGreen, lathe([[0.08, 1.55], [0.095, 1.57], [0.095, 1.62], [0.08, 1.64], [0, 1.64]], 12));       // mid collar
  P.add(M.lampGreen, lathe([[0.0, 3.16], [0.075, 3.16], [0.1, 3.2], [0.1, 3.24], [0.085, 3.27], [0.12, 3.3], [0.15, 3.36], [0.15, 3.41], [0, 3.41]], 14)); // capital + fitter
  for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + Math.PI / 4; P.add(M.lampGreen, torus(0.045, 0.012, 4, 8, Math.cos(a) * 0.13, 3.26, Math.sin(a) * 0.13, 0, -a, 0, Math.PI)); } // small scrolls under the fitter
  P.add(M.lampGlow, lathe([[0, 3.41], [0.12, 3.41], [0.18, 3.48], [0.215, 3.6], [0.215, 3.73], [0.18, 3.86], [0.11, 3.96], [0.0, 3.99]], 16));
  P.add(M.lampGreen, lathe([[0, 3.95], [0.08, 3.95], [0.1, 3.99], [0.06, 4.03], [0.025, 4.08], [0.04, 4.12], [0.0, 4.17]], 10));       // cap + finial
  return { ...P.build(), collider: { type: 'cyl', r: 0.24, h: 4.2 } };
}

export function streetLight() { // galvanised pole with a cobra-head luminaire reaching toward +z (over the street)
  const M = materials(), Lm = L(), P = new Parts();
  P.add(M.concrete, cyl(0.3, 0.32, 0.18, 12, 0, -0.06, 0));
  P.add(Lm.galv, boxY(0.36, 0.03, 0.36, 0, 0.12, 0));
  P.add(Lm.galv, cyl(0.07, 0.11, 8.3, 12, 0, 0.15, 0));
  P.add(Lm.galv, tubePath([[0, 8.2, 0], [0, 8.55, 0.25], [0, 8.75, 1.0], [0, 8.85, 2.1]], 0.045, 10, 6));
  const hx = 0, hy = 8.82, hz = 2.45;
  P.add(Lm.signBack, sphere(1, 14, 8, hx, hy, hz, 0.22, 0.1, 0.45));
  P.add(Lm.signBack, cyl(0.05, 0.05, 0.12, 8, 0, 8.79, 2.07).rotateX(0));
  const lens = new THREE.CircleGeometry(1, 16); t(lens, hx, hy - 0.06, hz + 0.05, Math.PI / 2, 0, 0, 0.18, 0.32, 1);
  P.add(M.lampGlow, lens, { uv: 'keep' });
  return { ...P.build(), collider: { type: 'cyl', r: 0.15, h: 8.5 } };
}

export function bench() { // 1.8 m park bench: wooden slats on three cast-iron frames, back toward -z
  const M = materials(), P = new Parts();
  for (const x of [-0.82, 0, 0.82]) {
    P.add(M.iron, boxY(0.05, 0.43, 0.05, x, 0, 0.2));                                  // front leg
    P.add(M.iron, rod([x, 0, -0.24], [x, 0.9, -0.33], 0.026, 6));                     // rear leg + back support
    P.add(M.iron, box(0.05, 0.05, 0.5, x, 0.41, -0.02));                              // seat rail
    if (x !== 0) {
      P.add(M.iron, rod([x, 0.41, 0.2], [x, 0.66, 0.22], 0.022, 6));                  // arm post
      P.add(M.iron, box(0.06, 0.04, 0.44, x, 0.67, 0.02));                            // armrest
      P.add(M.iron, torus(0.035, 0.016, 5, 8, x, 0.635, 0.245, 0, Math.PI / 2));      // scroll end
    }
    P.add(M.iron, box(0.04, 0.04, 0.3, x, 0.08, -0.02));                              // stretcher
  }
  for (let i = 0; i < 4; i++) P.add(M.wood, box(1.8, 0.035, 0.085, 0, 0.452, 0.2 - i * 0.105));
  for (let i = 0; i < 3; i++) { const y = 0.56 + i * 0.12, z = -0.27 - i * 0.012; P.add(M.wood, box(1.8, 0.09, 0.03, 0, y, z, -0.18)); }
  contactShadow(P, 2.3, 0.95, 0, -0.04, 0.5); // r4-props
  return { ...P.build(), collider: { type: 'box', min: [-0.92, 0, -0.36], max: [0.92, 0.92, 0.26] } };
}

export function trashCan() { // r4-props: slatted steel receptacle (Victor Stanley style), solid bands, open funnel lid, 0.97 m
  const Lm = L(), M = materials(), P = new Parts();
  const n = 26, r = 0.3;
  for (let i = 0; i < n; i++) { const a = i / n * TAU; P.add(Lm.charcoal, box(0.044, 0.7, 0.012, Math.cos(a) * r, 0.47, Math.sin(a) * r, 0, -a + Math.PI / 2)); } // vertical bars
  const band = (y0, h) => lathe([[r - 0.012, y0], [r + 0.012, y0], [r + 0.014, y0 + 0.01], [r + 0.014, y0 + h - 0.01], [r + 0.012, y0 + h], [r - 0.012, y0 + h], [r - 0.012, y0]], 20);
  P.add(Lm.charcoal, band(0.0, 0.13));                                                    // base band (sits on the ground)
  P.add(Lm.charcoal, band(0.43, 0.035));                                                  // waist band
  P.add(Lm.charcoal, band(0.8, 0.075));                                                   // top band
  P.add(M.blackPaint, cyl(0.272, 0.265, 0.8, 16, 0, 0.06, 0, true));                       // liner seen through the bars
  // dome lid with a deep central opening (dark bag inside)
  P.add(Lm.charcoal, lathe([[0.15, 0.885], [0.15, 0.955], [0.175, 0.975], [0.23, 0.965], [0.285, 0.93], [0.318, 0.895], [0.318, 0.875], [0.0, 0.875]].reverse(), 20));
  P.add(M.blackPaint, cyl(0.15, 0.15, 0.01, 14, 0, 0.885, 0));                            // bag surface inside the opening
  contactShadow(P, 0.95, 0.95);
  return { ...P.build(), collider: { type: 'cyl', r: 0.32, h: 1.0 } };
}

function recycleLabelTex() { // r4-props: front label for the compactor: recycling arrows + RECYCLE
  return texCache('recycleLabel', () => canvasTex(256, 384, (g, w, h) => {
    g.fillStyle = '#1d5ea6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2f4f5'; g.fillRect(18, 150, w - 36, 200);
    g.strokeStyle = '#1d5ea6'; g.lineWidth = 14; g.lineCap = 'round';
    const cx = w / 2, cy = 228, R = 52;
    for (let k = 0; k < 3; k++) { const a0 = k * TAU / 3 - Math.PI / 2 + 0.35, a1 = a0 + TAU / 3 - 0.75; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
      const ax = cx + Math.cos(a1) * R, ay = cy + Math.sin(a1) * R, tx = -Math.sin(a1), ty = Math.cos(a1); g.fillStyle = '#1d5ea6'; g.beginPath(); g.moveTo(ax + tx * 22, ay + ty * 22); g.lineTo(ax + Math.cos(a1) * 20, ay + Math.sin(a1) * 20); g.lineTo(ax - Math.cos(a1) * 20, ay - Math.sin(a1) * 20); g.fill(); }
    g.fillStyle = '#1d5ea6'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.fillText('RECYCLE', cx, 330);
    g.fillStyle = '#e8eef4'; g.font = 'bold 22px Arial'; g.fillText('BOTTLES  CANS  PAPER', cx, 60);
  }));
}
export function recyclingBin() { // r4-props: solar compactor (BigBelly-style, as on Sproul Plaza): blue body, slanted solar lid, pull-down hopper
  const Lm = L(), M = materials(), P = new Parts();
  const W = 0.64, D = 0.66, H = 1.12;
  const sh = new THREE.Shape(); const rr = 0.06; // rounded-corner plan
  sh.moveTo(-W / 2 + rr, -D / 2); sh.lineTo(W / 2 - rr, -D / 2); sh.quadraticCurveTo(W / 2, -D / 2, W / 2, -D / 2 + rr); sh.lineTo(W / 2, D / 2 - rr); sh.quadraticCurveTo(W / 2, D / 2, W / 2 - rr, D / 2);
  sh.lineTo(-W / 2 + rr, D / 2); sh.quadraticCurveTo(-W / 2, D / 2, -W / 2, D / 2 - rr); sh.lineTo(-W / 2, -D / 2 + rr); sh.quadraticCurveTo(-W / 2, -D / 2, -W / 2 + rr, -D / 2);
  const body = new THREE.ExtrudeGeometry(sh, { depth: H - 0.06, bevelEnabled: false, curveSegments: 3 }); body.rotateX(-Math.PI / 2); body.translate(0, 0.06, 0);
  P.add(Lm.recycle, body);
  P.add(Lm.charcoal, boxY(W - 0.04, 0.06, D - 0.04, 0, 0, 0));                              // plinth
  // slanted lid (front low) with the solar panel
  const lid = new THREE.BufferGeometry(); const yb = H, yf = H + 0.05, yr = H + 0.2;
  const v = [[-W / 2, yb, D / 2], [W / 2, yb, D / 2], [W / 2, yb, -D / 2], [-W / 2, yb, -D / 2], [-W / 2, yf, D / 2], [W / 2, yf, D / 2], [W / 2, yr, -D / 2], [-W / 2, yr, -D / 2]];
  const q = (a, b, c, d) => [...v[a], ...v[b], ...v[c], ...v[a], ...v[c], ...v[d]];
  lid.setAttribute('position', new THREE.Float32BufferAttribute([...q(4, 5, 6, 7), ...q(0, 1, 5, 4), ...q(1, 2, 6, 5), ...q(2, 3, 7, 6), ...q(3, 0, 4, 7)], 3)); lid.computeVertexNormals();
  P.add(Lm.charcoal, lid);
  const pan = new THREE.PlaneGeometry(W - 0.1, Math.hypot(D - 0.1, yr - yf) * 0.9); pan.rotateX(-Math.PI / 2 + Math.atan2(yr - yf, D)); pan.translate(0, (yf + yr) / 2 + 0.004, 0);
  P.add(Lm.solar || (Lm.solar = new THREE.MeshStandardMaterial({ color: 0x1a2340, roughness: 0.25, metalness: 0.5, name: 'prop:solar' })), pan, { uv: 'keep' });
  // hopper door: recessed frame, handle bar, dark slot; label below
  P.add(Lm.charcoal, boxY(W - 0.12, 0.3, 0.02, 0, H - 0.4, D / 2 + 0.005));
  P.add(M.blackPaint, boxY(W - 0.2, 0.05, 0.012, 0, H - 0.17, D / 2 + 0.016));
  P.add(Lm.steel, t(new THREE.CylinderGeometry(0.016, 0.016, W - 0.24, 8), 0, H - 0.3, D / 2 + 0.06, 0, 0, Math.PI / 2));
  for (const x of [-(W - 0.26) / 2, (W - 0.26) / 2]) P.add(Lm.steel, box(0.02, 0.02, 0.06, x, H - 0.3, D / 2 + 0.035));
  const lm = Lm.recLabel || (Lm.recLabel = new THREE.MeshStandardMaterial({ map: recycleLabelTex(), roughness: 0.55, name: 'prop:recycleLabel' }));
  P.add(lm, panel(W - 0.12, 0.6, 0, 0.42, D / 2 + 0.004), { uv: 'keep' });
  contactShadow(P, W + 0.4, D + 0.4);
  return { ...P.build(), collider: { type: 'box', min: [-W / 2 - 0.02, 0, -D / 2 - 0.02], max: [W / 2 + 0.02, H + 0.22, D / 2 + 0.08] } };
}

export function bikeRack() { // r4-props: galvanised inverted-U, 0.75 m wide, 0.9 m tall, tight top bends, bolted base plates
  const Lm = L(), P = new Parts();
  const w = 0.375, top = 0.875, br = 0.13; const pts = [[-w, 0.0, 0], [-w, top - br, 0]];
  for (let i = 1; i < 6; i++) { const a = Math.PI - i / 6 * (Math.PI / 2); pts.push([-w + br + Math.cos(a) * br, top - br + Math.sin(a) * br, 0]); }
  pts.push([-w + br, top, 0], [w - br, top, 0]);
  for (let i = 1; i < 6; i++) { const a = Math.PI / 2 - i / 6 * (Math.PI / 2); pts.push([w - br + Math.cos(a) * br, top - br + Math.sin(a) * br, 0]); }
  pts.push([w, top - br, 0], [w, 0.0, 0]);
  P.add(Lm.galv, new THREE.TubeGeometry(polyCurve(pts), 30, 0.03, 8, false));
  for (const x of [-w, w]) {
    P.add(Lm.galv, boxY(0.15, 0.012, 0.15, x, 0, 0));
    for (const [dx, dz] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]]) P.add(Lm.galv, cyl(0.011, 0.011, 0.012, 6, x + dx, 0.012, dz));
  }
  contactShadow(P, 1.05, 0.35, 0, 0, 0.4);
  return { ...P.build(), collider: { type: 'box', min: [-0.41, 0, -0.08], max: [0.41, 0.93, 0.08] } };
}

export function parkedBike() { // city bike on its kickstand, front wheel toward +z
  const Lm = L(), M = materials(), P = new Parts();
  const R = 0.34, fz = 0.53, rz = -0.52, ay = R;
  for (const z of [fz, rz]) {
    P.add(Lm.rubber, torus(R - 0.018, 0.019, 6, 32, 0, ay, z, 0, Math.PI / 2));
    P.add(Lm.steel, torus(R - 0.045, 0.009, 4, 24, 0, ay, z, 0, Math.PI / 2));
    P.add(Lm.steel, cyl(0.025, 0.025, 0.1, 8, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, ay, z));
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; P.add(Lm.steel, rod([i % 2 ? 0.03 : -0.03, ay, z], [0, ay + Math.sin(a) * (R - 0.05), z + Math.cos(a) * (R - 0.05)], 0.0025, 3)); }
  }
  const BB = [0, 0.3, -0.02], seatTop = [0, 0.82, -0.2], head = [0, 0.86, 0.42], headLow = [0, 0.74, 0.45];
  const fr = 0.018;
  P.add(Lm.bikePaint, rod(BB, seatTop, fr, 8));                       // seat tube
  P.add(Lm.bikePaint, rod(seatTop, head, fr, 8));                     // top tube
  P.add(Lm.bikePaint, rod(BB, headLow, fr * 1.15, 8));                // down tube
  for (const x of [-0.05, 0.05]) {
    P.add(Lm.bikePaint, rod([x * 0.6, 0.3, -0.02], [x, ay, rz], 0.011, 6));          // chain stays
    P.add(Lm.bikePaint, rod([x * 0.4, 0.8, -0.19], [x, ay, rz], 0.009, 6));          // seat stays
    P.add(Lm.bikePaint, rod([x * 0.5, 0.74, 0.45], [x, ay, fz], 0.012, 6));          // fork blades
  }
  P.add(Lm.bikePaint, rod(headLow, head, 0.024, 8));                                   // head tube
  P.add(Lm.charcoal, rod(head, [0, 0.98, 0.38], 0.014, 6));                             // stem
  P.add(Lm.charcoal, rod([-0.3, 1.0, 0.33], [0.3, 1.0, 0.33], 0.012, 6));              // bars
  P.add(Lm.rubber, rod([-0.3, 1.0, 0.33], [-0.2, 1.0, 0.34], 0.017, 6));
  P.add(Lm.rubber, rod([0.2, 1.0, 0.34], [0.3, 1.0, 0.33], 0.017, 6));
  P.add(Lm.charcoal, rod(seatTop, [0, 0.93, -0.23], 0.013, 6));                         // seat post
  P.add(Lm.rubber, sphere(1, 10, 6, 0, 0.95, -0.21, 0.08, 0.03, 0.14));                // saddle
  P.add(Lm.steel, cyl(0.1, 0.1, 0.006, 20, 0, 0, 0).rotateZ(Math.PI / 2).translate(0.03, 0.3, -0.02)); // chainring
  P.add(Lm.charcoal, rod([0.04, 0.3, -0.02], [0.08, 0.17, 0.02], 0.01, 4));
  P.add(Lm.charcoal, rod([-0.04, 0.3, -0.02], [-0.08, 0.43, -0.06], 0.01, 4));
  P.add(Lm.rubber, box(0.09, 0.02, 0.05, 0.13, 0.17, 0.02)); P.add(Lm.rubber, box(0.09, 0.02, 0.05, -0.13, 0.43, -0.06));
  P.add(Lm.charcoal, rod([0.05, 0.3, -0.12], [0.16, 0.0, -0.22], 0.008, 4));          // kickstand
  P.add(Lm.bikePaint, torus(R + 0.01, 0.02, 3, 12, 0, ay, rz, 0, Math.PI / 2, 0, Math.PI * 0.55).rotateX(0)); // rear fender arc
  return { ...P.build(), collider: { type: 'box', min: [-0.32, 0, -0.9], max: [0.32, 1.05, 0.9] } };
}

export function bollard() { // r4-props2: 0.95 m steel pipe bollard: embedded sleeve collar, slight taper, chamfered dome cap, two reflective bands
  const M = materials(), P = new Parts();
  P.add(M.blackPaint, lathe([[0, 0.0], [0.1, 0.0], [0.1, 0.02], [0.098, 0.4], [0.094, 0.8], [0.096, 0.81], [0.096, 0.83], [0.088, 0.85], [0.07, 0.895], [0.04, 0.925], [0, 0.935]], 20));
  P.add(M.whitePaint, cyl(0.0985, 0.0965, 0.045, 20, 0, 0.66, 0, true));
  P.add(M.whitePaint, cyl(0.0968, 0.0955, 0.025, 20, 0, 0.74, 0, true));
  P.add(M.iron, lathe([[0, 0], [0.14, 0], [0.14, 0.012], [0.125, 0.025], [0, 0.025]], 20));         // embedded sleeve collar
  contactShadow(P, 0.42, 0.42, 0, 0, 0.45);
  return { ...P.build(), collider: { type: 'cyl', r: 0.1, h: 0.95 } };
}

export function fireHydrant() { // California wet-barrel hydrant: two hose outlets (±x) and a pumper outlet (+z)
  const Lm = L(), P = new Parts();
  P.add(Lm.hydrant, cyl(0.16, 0.17, 0.05, 12, 0, 0, 0));
  P.add(Lm.hydrant, cyl(0.115, 0.125, 0.52, 14, 0, 0.05, 0));
  P.add(Lm.hydrant, torus(0.12, 0.014, 4, 14, 0, 0.42, 0, Math.PI / 2));
  P.add(Lm.hydrant, lathe([[0.125, 0], [0.13, 0.03], [0.11, 0.08], [0.06, 0.12], [0, 0.13]], 14, 0, 0.57, 0));
  P.add(Lm.steel, cyl(0.025, 0.03, 0.04, 5, 0, 0.69, 0));
  for (const s of [-1, 1]) {
    P.add(Lm.hydrant, cyl(0.045, 0.05, 0.1, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(s * 0.15, 0.36, 0));
    P.add(Lm.steel, cyl(0.05, 0.05, 0.035, 6, 0, 0, 0).rotateZ(Math.PI / 2).translate(s * 0.215, 0.36, 0));
  }
  P.add(Lm.hydrant, cyl(0.07, 0.075, 0.1, 12, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 0.3, 0.15));
  P.add(Lm.steel, cyl(0.075, 0.075, 0.04, 6, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 0.3, 0.22));
  return { ...P.build(), collider: { type: 'cyl', r: 0.17, h: 0.72 } };
}

function posterTex() { // r4-props2: a Cal Performances season poster instead of a blue card with a gold dot
  return texCache('poster', () => canvasTex(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w * 0.4, h); gr.addColorStop(0, '#1b1530'); gr.addColorStop(0.55, '#5a1f3d'); gr.addColorStop(1, '#c2462e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // a dancer silhouette in a pool of light
    const sp = g.createRadialGradient(w * 0.55, h * 0.42, 6, w * 0.55, h * 0.42, w * 0.55); sp.addColorStop(0, 'rgba(255,214,150,0.85)'); sp.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = sp; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16101f'; g.beginPath(); g.ellipse(w * 0.56, h * 0.25, 13, 15, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(w * 0.53, h * 0.28); g.quadraticCurveTo(w * 0.36, h * 0.2, w * 0.22, h * 0.12); g.lineTo(w * 0.24, h * 0.15); g.quadraticCurveTo(w * 0.4, h * 0.27, w * 0.5, h * 0.33);
    g.lineTo(w * 0.48, h * 0.47); g.quadraticCurveTo(w * 0.4, h * 0.6, w * 0.3, h * 0.66); g.lineTo(w * 0.33, h * 0.68); g.quadraticCurveTo(w * 0.47, h * 0.62, w * 0.56, h * 0.5);
    g.quadraticCurveTo(w * 0.68, h * 0.58, w * 0.8, h * 0.62); g.lineTo(w * 0.8, h * 0.6); g.quadraticCurveTo(w * 0.7, h * 0.5, w * 0.62, h * 0.45); g.lineTo(w * 0.6, h * 0.31);
    g.quadraticCurveTo(w * 0.74, h * 0.24, w * 0.86, h * 0.17); g.lineTo(w * 0.84, h * 0.15); g.quadraticCurveTo(w * 0.72, h * 0.2, w * 0.59, h * 0.28); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.font = 'bold 26px Georgia, serif'; g.fillText('Cal', 18, h * 0.76); g.fillText('Performances', 18, h * 0.76 + 28);
    g.fillStyle = '#fdb515'; g.fillRect(18, h * 0.84, w - 36, 3);
    g.fillStyle = '#f2e6d8'; g.font = '15px sans-serif'; g.fillText('2026–27 SEASON · ZELLERBACH HALL', 18, h * 0.89); g.fillText('calperformances.org', 18, h * 0.93);
  }));
}
export function busShelter() { // r4-props2: AC Transit-style shelter: three rear posts, curved cantilevered perforated-metal roof, fritted
  // back glass + side wing, perforated bench, lit ad/map panel at one end and a bus-stop flag pole; open side toward +z
  const M = materials(), Lm = L(), P = new Parts();
  const W = 3.8, D = 1.5, H = 2.5, zb = -D / 2 + 0.08;
  const roofM = Lm.roofPerf || (Lm.roofPerf = new THREE.MeshStandardMaterial({ color: 0x80878b, roughness: 0.5, metalness: 0.65, side: THREE.DoubleSide, name: 'prop:shelterRoof' }));
  // roof: a shallow arch (r = 2.6 m) spanning front to back, tilted up toward the street; posts, braces and beams meet its underside
  const Rr = 2.6, th = (D + 0.4) / Rr, tilt = 0.1, yOff = H + 0.06 - Rr, zOff = 0.1;
  const arc = (phi) => { const y = Rr * Math.cos(phi), z = Rr * Math.sin(phi); return [y * Math.cos(tilt) + z * Math.sin(tilt) + yOff, -y * Math.sin(tilt) + z * Math.cos(tilt) + zOff]; };
  const roofY = (zq) => { let b = arc(0); for (let i = 0; i <= 120; i++) { const p = arc(-th / 2 + th * i / 120); if (Math.abs(p[1] - zq) < Math.abs(b[1] - zq)) b = p; } return b[0] - 0.02; };
  const yb = roofY(zb), yk = roofY(zb + 0.6);
  for (const x of [-W / 2 + 0.15, 0, W / 2 - 0.15]) {
    P.add(Lm.charcoal, boxY(0.1, yb, 0.1, x, 0, zb));                                         // posts up to the roof
    P.add(Lm.charcoal, rod([x, yb - 0.45, zb + 0.05], [x, yk, zb + 0.6], 0.035, 6));             // knee brace under the cantilever
    P.add(Lm.charcoal, boxY(0.2, 0.012, 0.2, x, 0, zb));                                     // base plate
  }
  const roof = new THREE.CylinderGeometry(Rr, Rr, W + 0.2, 20, 1, true, -th / 2, th);
  roof.rotateZ(Math.PI / 2); roof.rotateX(-Math.PI / 2 - tilt); roof.translate(0, yOff, zOff); // axis along x, arch on top
  P.add(roofM, roof);
  const fe = arc(th / 2), be = arc(-th / 2);
  P.add(Lm.charcoal, box(W + 0.24, 0.1, 0.05, 0, fe[0] - 0.03, fe[1]));                      // street-side fascia on the front edge
  P.add(Lm.charcoal, box(W + 0.24, 0.06, 0.04, 0, be[0] - 0.02, be[1]));                     // rear edge trim
  P.add(Lm.charcoal, box(W + 0.2, 0.08, 0.08, 0, yb - 0.04, zb));                           // rear beam under the roof
  // glazing: back wall in two panes + a side wing at the -x end, white frit band at eye level
  for (const [x0, x1] of [[-W / 2 + 0.2, -0.05], [0.05, W / 2 - 0.2]]) P.add(M.glassLight, box(x1 - x0, 1.95, 0.012, (x0 + x1) / 2, 0.22 + 0.975, zb + 0.06));
  P.add(M.glassLight, box(0.012, 1.95, D * 0.6, -W / 2 + 0.15, 0.22 + 0.975, zb + 0.06 + D * 0.3));
  P.add(Lm.charcoal, box(0.04, 2.0, 0.04, -W / 2 + 0.15, 0.2 + 1.0, zb + 0.06 + D * 0.6));                  // side-wing edge mullion
  P.add(Lm.charcoal, box(0.04, 0.04, D * 0.6, -W / 2 + 0.15, 0.2, zb + 0.06 + D * 0.3));
  const fritM = texCache('frit', () => new THREE.MeshStandardMaterial({ map: canvasTex(256, 32, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(245,245,240,0.85)'; for (let x = 4; x < w; x += 8) for (let y = 4; y < h; y += 8) { g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); } }, { repeat: true }), transparent: true, alphaTest: 0.3, roughness: 0.6, side: THREE.DoubleSide, name: 'prop:frit' }));
  for (const [x0, x1] of [[-W / 2 + 0.2, -0.05], [0.05, W / 2 - 0.2]]) P.add(fritM, panel(x1 - x0, 0.12, (x0 + x1) / 2, 1.42, zb + 0.07, 0, 0, 0, (x1 - x0) * 4, 1), { uv: 'keep' });
  P.add(Lm.charcoal, boxY(W - 0.3, 0.05, 0.05, 0, 0.17, zb + 0.06));                        // bottom rail
  // perforated steel bench on two brackets, lean rail above
  P.add(Lm.charcoal, boxY(1.7, 0.035, 0.38, -0.65, 0.44, zb + 0.27));
  for (const x of [-1.35, 0.05]) { P.add(Lm.charcoal, boxY(0.05, 0.44, 0.05, x, 0, zb + 0.34)); P.add(Lm.charcoal, box(0.05, 0.05, 0.3, x, 0.42, zb + 0.2)); }
  P.add(Lm.steel, cyl(0.022, 0.022, W / 2 - 0.3, 8, 0, 0, 0).rotateZ(Math.PI / 2).translate(-(W / 2 - 0.15) / 2, 0.82, zb + 0.13)); // lean rail between two posts
  for (const x of [-W / 2 + 0.2, -0.05]) P.add(Lm.charcoal, box(0.04, 0.04, 0.09, x, 0.82, zb + 0.09));             // its brackets
  // illuminated ad / route-map panel at the +x end, in a slim frame
  P.add(Lm.charcoal, boxY(0.14, 1.95, 1.3, W / 2 - 0.15, 0.25, -0.05));
  const adMat = texCache('adMat', () => nightGlow(new THREE.MeshStandardMaterial({ map: posterTex(), emissiveMap: posterTex(), emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.25, name: 'prop:adPanel' }), 1.0));
  P.add(adMat, panel(1.15, 1.75, W / 2 - 0.15 - 0.071, 1.225, -0.05, -Math.PI / 2), { uv: 'keep' });
  P.add(adMat, panel(1.15, 1.75, W / 2 - 0.15 + 0.071, 1.225, -0.05, Math.PI / 2), { uv: 'keep' });
  // bus-stop flag on its own pole at the street-side corner
  const fx = W / 2 + 0.35, fz = D / 2 + 0.2;
  P.add(Lm.galv, cyl(0.03, 0.03, 3.0, 8, fx, 0, fz));
  const stopMat = texCache('acStop', () => new THREE.MeshStandardMaterial({ map: canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#00843d'; g.fillRect(0, 0, w, 64);
    g.fillStyle = '#ffffff'; g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.fillText('AC', w / 2, 30); g.font = 'bold 20px Arial'; g.fillText('TRANSIT', w / 2, 55);
    g.fillStyle = '#111'; g.font = 'bold 26px Arial'; g.fillText('BUS', w / 2, 100); g.fillText('STOP', w / 2, 128);
    g.fillStyle = '#00843d'; for (const [i, t] of ['6', '51B', '79', 'F'].entries()) { g.fillRect(10 + (i % 2) * 58, 150 + Math.floor(i / 2) * 50, 50, 40); g.fillStyle = '#fff'; g.font = 'bold 22px Arial'; g.fillText(t, 35 + (i % 2) * 58, 178 + Math.floor(i / 2) * 50); g.fillStyle = '#00843d'; }
  }), roughness: 0.5, name: 'prop:acTransitSign' }));
  P.add(Lm.signBack, box(0.31, 0.61, 0.012, fx, 2.6, fz + 0.04));            // blade clamped to the pole
  P.add(stopMat, panel(0.3, 0.6, fx, 2.6, fz + 0.04 + 0.0075, 0), { uv: 'keep' });
  P.add(stopMat, panel(0.3, 0.6, fx, 2.6, fz + 0.04 - 0.0075, Math.PI), { uv: 'keep' });
  contactShadow(P, W + 0.6, D + 0.5, 0, 0, 0.35);
  return { ...P.build(), collider: { type: 'box', min: [-W / 2, 0, -D / 2], max: [W / 2, H + 0.15, D / 2] } };
}

export function picnicTable() { // standard 6 ft picnic table with attached benches
  const M = materials(), P = new Parts();
  const Lx = 1.83;
  for (let i = 0; i < 4; i++) P.add(M.wood, box(Lx, 0.045, 0.17, 0, 0.74, -0.27 + i * 0.18));
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) P.add(M.wood, box(Lx, 0.045, 0.13, 0, 0.44, s * (0.55 + i * 0.14)));
  for (const x of [-0.65, 0.65]) {
    P.add(M.woodDark, box(0.09, 0.045, 1.55, x, 0.395, 0));                      // seat support
    P.add(M.woodDark, box(0.09, 0.045, 0.7, x, 0.695, 0));                       // top cleat
    for (const s of [-1, 1]) P.add(M.woodDark, rod([x, 0, s * 0.68], [x, 0.72, s * 0.12], 0.045, 4));
    P.add(M.woodDark, rod([x, 0.4, 0], [0, 0.71, 0], 0.03, 4));                   // brace to centre
  }
  return { ...P.build(), collider: { type: 'box', min: [-0.92, 0, -0.84], max: [0.92, 0.77, 0.84] } };
}

export function drinkingFountain() { // concrete pedestal with a stainless bowl
  const M = materials(), Lm = L(), P = new Parts();
  P.add(M.concrete, lathe([[0, 0], [0.2, 0], [0.2, 0.06], [0.15, 0.1], [0.13, 0.8], [0.16, 0.86], [0, 0.86]], 14));
  P.add(Lm.steel, lathe([[0.0, 0.0], [0.05, 0.0], [0.12, 0.02], [0.19, 0.07], [0.2, 0.1], [0.19, 0.11], [0.17, 0.065], [0.11, 0.04], [0.0, 0.035]], 18, 0, 0.84, 0));
  P.add(Lm.steel, rod([0, 0.9, 0.12], [0, 0.97, 0.02], 0.012, 6));
  P.add(Lm.steel, cyl(0.025, 0.025, 0.03, 10, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 0.7, 0.14));
  return { ...P.build(), collider: { type: 'cyl', r: 0.2, h: 0.95 } };
}

export function utilityPole() { // wooden distribution pole, crossarm with three pin insulators, transformer
  const Lm = L(), P = new Parts();
  P.add(Lm.poleWood, cyl(0.11, 0.15, 11.4, 10, 0, -0.4, 0));
  P.add(Lm.poleWood, box(2.44, 0.1, 0.12, 0, 10.35, 0.12));
  for (const s of [-1, 1]) P.add(Lm.galv, rod([0, 9.6, 0.13], [s * 0.7, 10.3, 0.13], 0.012, 4));
  for (const x of [-1.05, -0.35, 1.05]) {
    P.add(Lm.galv, cyl(0.012, 0.012, 0.1, 5, x, 10.4, 0.12));
    P.add(Lm.ceramic, lathe([[0.0, 0], [0.04, 0], [0.075, 0.03], [0.05, 0.06], [0.07, 0.09], [0.045, 0.12], [0.055, 0.15], [0.03, 0.18], [0, 0.19]], 10, x, 10.48, 0.12));
  }
  P.add(Lm.ceramic, lathe([[0, 0], [0.05, 0], [0.07, 0.04], [0.045, 0.08], [0.06, 0.12], [0.03, 0.16], [0, 0.17]], 10, 0, 11.0, 0));
  P.add(Lm.signBack, cyl(0.24, 0.24, 0.85, 14, 0, 8.3, -0.38));              // transformer can (behind the pole)
  P.add(Lm.signBack, cyl(0.25, 0.25, 0.05, 14, 0, 9.15, -0.38));
  P.add(Lm.galv, box(0.1, 0.4, 0.2, 0, 8.75, -0.2));                          // bracket
  for (let i = 0; i < 6; i++) P.add(Lm.galv, rod([0, 2.6 + i * 0.45, 0], [(i % 2 ? 1 : -1) * 0.22, 2.6 + i * 0.45, 0], 0.01, 4)); // step bolts
  return { ...P.build(), collider: { type: 'cyl', r: 0.15, h: 11 } };
}

// traffic lights cycle on their own: 60 s loop, phase from the instance position (green 0-27 s, amber 27-31, red 31-60)
function signalLens(color, win) {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.25), emissive: color, emissiveIntensity: 3.0, roughness: 0.2, name: 'prop:signal-' + win.join('-') });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWin = { value: new THREE.Vector2(...win) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec2 uWin; varying float vOn;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        #ifdef USE_INSTANCING
          vec3 ip = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #else
          vec3 ip = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        float ph = fract(sin(dot(floor(ip.xz * 0.05), vec2(12.9898, 78.233))) * 43758.5453) * 60.0;
        float tc = mod(uTime + ph, 60.0);
        vOn = step(uWin.x, tc) * step(tc, uWin.y);
      }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vOn;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= mix(0.04, 1.0, vOn);');
  };
  m.customProgramCacheKey = () => 'signalLens';
  return m;
}
let _sig = null;
const signalMats = () => (_sig ??= { red: signalLens(0xff2a1a, [31, 60]), amber: signalLens(0xffa316, [27, 31]), green: signalLens(0x22ff88, [0, 27]) });
function signalHead(P, x, y, z, ry = 0) { // 3-section head, centre (x, y, z), faces +z rotated by ry
  const Lm = L(), M = materials(), S = signalMats();
  const rot = (g) => { g.rotateY(ry); g.translate(x, y, z); return g; };
  P.add(Lm.signalYellow, rot(box(0.34, 1.02, 0.24, 0, 0, 0)));
  P.add(M.blackPaint, rot(box(0.5, 1.18, 0.02, 0, 0, -0.13)));                       // backplate
  [['red', 0.32], ['amber', 0], ['green', -0.32]].forEach(([c, dy]) => {
    P.add(S[c], rot(t(new THREE.CircleGeometry(0.105, 16), 0, dy, 0.122)), { uv: 'keep' });
    const visor = new THREE.CylinderGeometry(0.13, 0.13, 0.22, 12, 1, true, -Math.PI / 2 - 0.9, Math.PI + 1.8); visor.rotateX(Math.PI / 2);
    P.add(M.blackPaint, rot(t(visor, 0, dy, 0.23)));
  });
}
export function trafficSignal() { // mast-arm signal: pole at origin, arm over the road toward -x, heads face +z
  const Lm = L(), M = materials(), P = new Parts();
  P.add(M.concrete, cyl(0.42, 0.45, 0.2, 12, 0, -0.08, 0));
  P.add(Lm.galv, cyl(0.12, 0.17, 6.5, 12, 0, 0.12, 0));
  P.add(Lm.galv, cyl(0.06, 0.06, 0.12, 8, 0, 6.62, 0));
  P.add(Lm.galv, rod([0, 5.9, 0], [-7.0, 6.15, 0], 0.11, 10, 0.065));
  P.add(Lm.galv, rod([0, 5.3, 0], [-1.5, 5.95, 0], 0.03, 6));
  signalHead(P, -3.4, 5.35, 0.02); signalHead(P, -6.4, 5.4, 0.02);
  signalHead(P, 0.0, 3.4, 0.32);                                                         // pole-mounted near-side head
  P.add(M.blackPaint, box(0.32, 0.32, 0.2, -0.27, 2.75, 0.02));                         // pedestrian head
  const ped = texCache('pedMat', () => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff7a1a, emissiveIntensity: 1.5, roughness: 0.3, name: 'prop:pedSignal' }));
  P.add(ped, panel(0.2, 0.2, -0.27, 2.75, 0.122), { uv: 'keep' });
  P.add(M.blackPaint, boxY(0.12, 0.22, 0.1, 0.0, 1.05, 0.2));                           // push button box
  // street name sign on the arm
  const sign = streetSignMat('Bancroft Way', 'Telegraph Av');
  P.add(sign.edge, box(1.9, 0.42, 0.03, -1.9, 6.42, 0));
  P.add(sign.mat, panel(1.86, 0.38, -1.9, 6.42, 0.016, 0, 0, 0.5, 1, 1), { uv: 'keep' });
  P.add(sign.mat, panel(1.86, 0.38, -1.9, 6.42, -0.016, Math.PI, 0, 0.5, 1, 1), { uv: 'keep' });
  return { ...P.build(), collider: { type: 'cyl', r: 0.17, h: 6.6 } };
}

function stopTex() {
  return texCache('stop', () => canvasTex(512, 512, (g, w, h) => {
    const oct = (r) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } g.closePath(); };
    g.fillStyle = '#ffffff'; oct(w / 2); g.fill(); g.fillStyle = '#c1121f'; oct(w / 2 * 0.92); g.fill();
    g.fillStyle = '#ffffff'; g.font = `bold ${Math.round(w * 0.27)}px Helvetica, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('STOP', w / 2, h / 2 + w * 0.01);
  }));
}
export function stopSign() { // 0.75 m (30") octagon, bottom edge at 2.1 m, square galvanised post
  const Lm = L(), P = new Parts();
  P.add(Lm.galv, boxY(0.05, 2.9, 0.05, 0, -0.3, -0.03));
  const front = texCache('stopMat', () => new THREE.MeshStandardMaterial({ map: stopTex(), roughness: 0.45, metalness: 0.0, name: 'prop:stopSign' }));
  const r = 0.375 / Math.cos(Math.PI / 8); const cy = 2.1 + 0.375;
  const face = new THREE.CircleGeometry(r, 8, Math.PI / 8); t(face, 0, cy, 0.003);
  P.add(front, face, { uv: 'keep' });
  const back = new THREE.CircleGeometry(r, 8, Math.PI / 8); t(back, 0, cy, -0.003, 0, Math.PI, 0);
  P.add(Lm.signBack, back);
  const rim = new THREE.CylinderGeometry(r, r, 0.006, 8, 1, true, Math.PI / 8 + Math.PI / 2); rim.rotateX(Math.PI / 2); t(rim, 0, cy, 0);
  P.add(Lm.signBack, rim);
  for (const y of [cy - 0.25, cy + 0.25]) P.add(Lm.galv, cyl(0.012, 0.012, 0.04, 6, 0, 0, 0).rotateX(Math.PI / 2).translate(0, y, -0.01));
  return { ...P.build(), collider: { type: 'box', min: [-0.04, 0, -0.06], max: [0.04, 2.9, 0.01] } };
}

const _signMats = {};
function streetSignMat(a, b) { // canvas with two names: top half = a, bottom half = b (MUTCD green, white legend)
  const key = a + '|' + b;
  if (_signMats[key]) return _signMats[key];
  const tex = canvasTex(1024, 256, (g, w, h) => {
    for (const [i, name] of [[0, a], [1, b]]) {
      const y0 = i * h / 2; g.fillStyle = '#ffffff'; g.fillRect(0, y0, w, h / 2); g.fillStyle = '#006b3f'; g.fillRect(6, y0 + 6, w - 12, h / 2 - 12);
      g.fillStyle = '#ffffff'; g.font = `bold ${Math.round(h * 0.3)}px Helvetica, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(name, w / 2, y0 + h / 4 + 2);
    }
  });
  return (_signMats[key] = { mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, name: 'prop:streetSign:' + key }), edge: L().signBack });
}
export function streetNameSign({ names = ['Bancroft Way', 'Telegraph Av'] } = {}) { // post with two crossed blades at ~3 m
  const Lm = L(), P = new Parts();
  P.add(Lm.galv, cyl(0.03, 0.035, 3.6, 8, 0, -0.3, 0));
  P.add(Lm.galv, cyl(0.04, 0.04, 0.06, 8, 0, 3.3, 0));
  const S = streetSignMat(names[0], names[1]);
  // blade A along x (readable from ±z) at 3.12 m; blade B along z (readable from ±x) at 3.36 m
  P.add(S.edge, box(0.92, 0.22, 0.012, 0, 3.12, 0));
  P.add(S.mat, panel(0.9, 0.2, 0, 3.12, 0.0065, 0, 0, 0.5, 1, 1), { uv: 'keep' });
  P.add(S.mat, panel(0.9, 0.2, 0, 3.12, -0.0065, Math.PI, 0, 0.5, 1, 1), { uv: 'keep' });
  P.add(S.edge, box(0.012, 0.22, 0.92, 0, 3.36, 0));
  P.add(S.mat, panel(0.9, 0.2, 0.0065, 3.36, 0, Math.PI / 2, 0, 0, 1, 0.5), { uv: 'keep' });
  P.add(S.mat, panel(0.9, 0.2, -0.0065, 3.36, 0, -Math.PI / 2, 0, 0, 1, 0.5), { uv: 'keep' });
  P.add(Lm.galv, cyl(0.045, 0.045, 0.05, 8, 0, 3.47, 0));
  return { ...P.build(), collider: { type: 'cyl', r: 0.04, h: 3.5 } };
}

export function newsRack() { // coin-op newspaper box on a pedestal
  const Lm = L(), M = materials(), P = new Parts();
  P.add(Lm.charcoal, boxY(0.3, 0.38, 0.3, 0, 0, -0.02));
  P.add(Lm.charcoal, boxY(0.46, 0.03, 0.42, 0, 0, -0.02));
  P.add(Lm.newsRed, boxY(0.5, 0.62, 0.44, 0, 0.38, 0));
  P.add(Lm.newsRed, boxY(0.52, 0.04, 0.46, 0, 1.0, 0));
  P.add(M.glass, box(0.36, 0.26, 0.01, 0, 0.83, 0.222));
  P.add(Lm.newsRed, box(0.42, 0.33, 0.02, 0, 0.83, 0.215));
  P.add(Lm.steel, box(0.3, 0.03, 0.03, 0, 0.66, 0.24));                                 // handle
  P.add(Lm.steel, box(0.09, 0.14, 0.05, 0.15, 1.08, 0.12));                             // coin mechanism
  return { ...P.build(), collider: { type: 'box', min: [-0.26, 0, -0.24], max: [0.26, 1.15, 0.24] } };
}

function mapTex() { // r4-props2: drawn from the real campus outline (CAMPUS_MAP) instead of random blobs
  return texCache('map', () => canvasTex(512, 640, (g, w, h) => {
    g.fillStyle = '#f2ecd9'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#003262'; g.fillRect(0, 0, w, 86);
    g.fillStyle = '#fdb515'; g.fillRect(0, 86, w, 8);
    g.fillStyle = '#ffffff'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'left'; g.fillText('UC Berkeley', 22, 44); g.font = '22px Georgia, serif'; g.fillText('Campus Map', 22, 74);
    const S = 0.6, X0 = -470, Z0 = -470, top = 100; const P = ([x, z]) => [(x - X0) * S, top + (z - Z0) * S];
    const poly = (pts) => { g.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
    const line = (pts) => { g.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); };
    g.save(); g.beginPath(); g.rect(0, top, w, h - top - 46); g.clip();
    g.fillStyle = '#bcd59e'; for (const l of CAMPUS_MAP.l) { poly(l); g.fill(); }
    g.strokeStyle = '#ffffff'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 4; for (const l of CAMPUS_MAP.w) { line(l); g.stroke(); }
    g.strokeStyle = '#6aa7d8'; g.lineWidth = 3; for (const l of CAMPUS_MAP.c) { line(l); g.stroke(); }
    g.fillStyle = '#b3a48e'; g.strokeStyle = '#7d6f5c'; g.lineWidth = 1; for (const b of CAMPUS_MAP.b) { poly(b); g.fill(); g.stroke(); }
    const [cx, cy] = P([2, 2]); g.fillStyle = '#003262'; g.beginPath(); g.arc(cx, cy, 6, 0, TAU); g.fill(); // Sather Tower
    g.fillStyle = '#1d2a3c'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center';
    for (const [t, x, z] of [['Sather Tower', 2, 18], ['Memorial Glade', -136, -112], ['Sproul Plaza', -123, 300], ['Evans Hall', 0, -150], ['Faculty Glade', 118, 96], ['Strawberry Creek', -300, 175], ['Doe Library', -150, -40]]) { const [px, py] = P([x, z]); g.fillText(t, px, py); }
    g.restore();
    // footer: north arrow, scale bar, legend
    g.fillStyle = '#003262'; g.fillRect(0, h - 46, w, 46);
    g.fillStyle = '#ffffff'; g.font = '15px sans-serif'; g.textAlign = 'left'; g.fillText('Visitor Services  ·  Restrooms  ·  Bike Parking', 16, h - 18);
    g.beginPath(); g.moveTo(w - 30, h - 38); g.lineTo(w - 38, h - 12); g.lineTo(w - 22, h - 12); g.closePath(); g.fillStyle = '#fdb515'; g.fill();
  }));
}

export function infoKiosk() { // r4-props2: UC Berkeley wayfinding monolith: Berkeley Blue frame, gold cap band, "UC Berkeley" header, lit map both faces
  const M = materials(), Lm = L(), P = new Parts();
  const W = 1.2, H = 2.3, T = 0.16;
  P.add(Lm.charcoal, boxY(W + 0.12, 0.08, T + 0.14, 0, 0, 0));                                // plinth
  P.add(M.calBlue, boxY(0.07, H - 0.08, T, -W / 2 + 0.035, 0.08, 0)); P.add(M.calBlue, boxY(0.07, H - 0.08, T, W / 2 - 0.035, 0.08, 0)); // side stiles
  P.add(M.calBlue, boxY(W, 0.5, T, 0, 0.08, 0));                                               // base panel
  P.add(M.calBlue, boxY(W, 0.3, T, 0, H - 0.3, 0));                                            // header block
  P.add(M.calBlue, boxY(W - 0.14, 1.42, T * 0.55, 0, 0.58, 0));                                 // map backer (maps sit in a shallow reveal)
  P.add(M.calGold, boxY(W + 0.02, 0.035, T + 0.02, 0, H - 0.035, 0));                            // gold cap band
  P.add(Lm.charcoal, boxY(W + 0.04, 0.02, T + 0.04, 0, H, 0));
  const mapMat = texCache('mapMat', () => nightGlow(new THREE.MeshStandardMaterial({ map: mapTex(), emissiveMap: mapTex(), emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.35, name: 'prop:campusMap' }), 1.0));
  P.add(mapMat, panel(W - 0.16, 1.4, 0, 0.59 + 0.7, T * 0.275 + 0.002), { uv: 'keep' });
  P.add(mapMat, panel(W - 0.16, 1.4, 0, 0.59 + 0.7, -T * 0.275 - 0.002, Math.PI), { uv: 'keep' });
  const hdr = texCache('kioskHdr', () => new THREE.MeshStandardMaterial({ map: canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#003262'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = 'bold 54px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('UC Berkeley', w / 2, h * 0.44); g.fillStyle = '#fdb515'; g.fillRect(w * 0.3, h * 0.78, w * 0.4, 5); }), roughness: 0.6, name: 'prop:kioskHeader' }));
  P.add(hdr, panel(W - 0.04, 0.27, 0, H - 0.16, T / 2 + 0.002), { uv: 'keep' });
  P.add(hdr, panel(W - 0.04, 0.27, 0, H - 0.16, -T / 2 - 0.002, Math.PI), { uv: 'keep' });
  contactShadow(P, W + 0.5, 0.7, 0, 0, 0.45);
  return { ...P.build(), collider: { type: 'box', min: [-0.66, 0, -0.15], max: [0.66, 2.32, 0.15] } };
}

function flagTex() {
  return texCache('flag', () => canvasTex(512, 270, (g, w, h) => { // US flag, 19:10
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#b22234'; g.fillRect(0, i * h / 13, w, h / 13 + 1); }
    const cw = w * 0.4, ch = h * 7 / 13; g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, cw, ch);
    g.fillStyle = '#ffffff';
    for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) { const x = cw * ((c * 2 + (r % 2 ? 2 : 1)) / 12), y = ch * ((r + 1) / 10); g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); }
  }));
}
function flagWave(mat) { // vertex wave along the fly; same code in the depth material so the shadow waves too
  const code = `
  {
    float u = clamp(position.x / 1.52, 0.0, 1.0);
    float w = 0.35 + uWind;
    transformed.z += sin(u * 7.0 - uTime * 4.5 * (0.6 + 0.4 * w) + position.y * 1.3) * 0.11 * u * w;
    transformed.x -= (1.0 - min(w, 1.0)) * u * u * 0.25;
    transformed.y -= (1.0 - min(w, 1.0)) * u * u * 0.35;
  }`;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind;').replace('#include <begin_vertex>', '#include <begin_vertex>' + code);
  };
  mat.customProgramCacheKey = () => 'flagWave';
  return mat;
}
export function flagpole() { // 12 m aluminium pole, gold ball, US flag that waves with U.uWind
  const M = materials(), Lm = L(), P = new Parts();
  P.add(M.concrete, cyl(0.45, 0.48, 0.15, 14, 0, -0.05, 0));
  P.add(M.bronze, lathe([[0.0, 0], [0.16, 0], [0.16, 0.3], [0.12, 0.38], [0.09, 0.45], [0, 0.45]], 14, 0, 0.1, 0));
  P.add(Lm.aluminium, cyl(0.045, 0.08, 11.6, 12, 0, 0.3, 0));
  P.add(Lm.aluminium, cyl(0.06, 0.06, 0.08, 10, 0, 11.9, 0));
  P.add(M.gold, sphere(0.1, 12, 8, 0, 12.07, 0));
  P.add(Lm.steel, box(0.03, 0.12, 0.05, 0.07, 1.2, 0));                                  // cleat
  const fw = 1.52, fh = 0.8;
  const flagMat = texCache('flagMat', () => flagWave(new THREE.MeshStandardMaterial({ map: flagTex(), side: THREE.DoubleSide, roughness: 0.8, name: 'prop:flag' })));
  const flag = new THREE.PlaneGeometry(fw, fh, 14, 6); flag.translate(fw / 2, 0, 0);
  // keep position.x = distance from the pole for the shader, place via translate after
  const fg = flag.toNonIndexed(); fg.translate(0.065, 11.45, 0);
  // the shader uses object-space x/y: undo the vertical offset in the shader input by baking it relative to the hoist
  P.add(flagMat, fg, { uv: 'keep' });
  const res = P.build();
  const fpart = res.parts.find((p) => p.material === flagMat);
  const dm = texCache('flagDepth', () => flagWave(new THREE.MeshDepthMaterial({ side: THREE.DoubleSide })));
  const dd = texCache('flagDist', () => flagWave(new THREE.MeshDistanceMaterial({ side: THREE.DoubleSide })));
  fpart.depthMaterial = dm; fpart.distanceMaterial = dd;
  return { ...res, collider: { type: 'cyl', r: 0.16, h: 12 } };
}

export function scooter() { // rental e-scooter parked upright, front toward +z
  const Lm = L(), M = materials(), P = new Parts();
  P.add(Lm.lime, boxY(0.17, 0.06, 0.72, 0, 0.09, -0.03));                               // deck
  P.add(Lm.rubber, boxY(0.15, 0.006, 0.6, 0, 0.15, -0.05));                              // grip tape
  P.add(Lm.lime, rod([0, 0.13, 0.34], [0, 1.12, 0.42], 0.022, 8));                       // stem
  P.add(Lm.charcoal, rod([0, 0.13, 0.34], [0, 0.1, 0.45], 0.02, 6));                      // fork
  P.add(Lm.charcoal, rod([-0.27, 1.12, 0.42], [0.27, 1.12, 0.42], 0.013, 6));            // bars
  P.add(Lm.rubber, rod([-0.27, 1.12, 0.42], [-0.18, 1.12, 0.42], 0.018, 6)); P.add(Lm.rubber, rod([0.18, 1.12, 0.42], [0.27, 1.12, 0.42], 0.018, 6));
  P.add(M.blackPaint, box(0.1, 0.03, 0.08, 0, 1.15, 0.4));                               // display
  P.add(Lm.lime, box(0.13, 0.03, 0.18, 0, 0.27, -0.42, 0.5));                            // rear fender
  for (const z of [0.45, -0.38]) {
    P.add(Lm.rubber, torus(0.085, 0.032, 6, 18, 0, 0.117, z, 0, Math.PI / 2));
    P.add(Lm.steel, cyl(0.05, 0.05, 0.05, 10, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 0.117, z));
  }
  P.add(Lm.charcoal, rod([0.06, 0.1, -0.1], [0.14, 0.0, -0.16], 0.008, 4));            // kickstand
  P.add(M.lampGlow, t(new THREE.CircleGeometry(0.025, 10), 0, 0.98, 0.442, -0.1, 0, 0), { uv: 'keep' }); // headlight
  return { ...P.build(), collider: { type: 'box', min: [-0.28, 0, -0.5], max: [0.28, 1.2, 0.56] } };
}

export const PROPS = Object.fromEntries(PROP_NAMES.map((n) => [n, (o) => ({ campusLamp, streetLight, bench, trashCan, recyclingBin, bikeRack, parkedBike, bollard, fireHydrant, busShelter, picnicTable, drinkingFountain, utilityPole, trafficSignal, stopSign, streetNameSign, newsRack, infoKiosk, flagpole, scooter })[n](o)]));
export function buildAllProps() { const out = {}; for (const n of PROP_NAMES) out[n] = PROPS[n](); return out; }
