// Procedural models for rideables: Lime Gen4 and Veo Astro stand-up e-scooters, the Veo Cosmo seated scooter
// ("Veo e-bike"), and a Back-to-the-Future style hoverboard. Proportions and colours come from reference photos
// (Wikimedia Commons: "Bird Three and a Lime Gen4 electrics rental scooters", "Veo electric scooter in Foggy Bottom";
// veoride.com Astro VS4 product shots, used only as visual reference).
// Every vehicle is built from simple primitives into named buckets (body / steer / wheelF / wheelR / stand / lights) that
// share ONE material: vertex colours x a small decal atlas. Parked fleets merge all buckets into one geometry and instance it.
// Local frame: forward = -z, up = +y, right = +x; origin on the ground midway between the axles.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ---------------------------------------------------------------- decal atlas (512 x 256 canvas)
const AW = 512, AH = 256;
const REG = { // x, y, w, h in canvas pixels
  white: [0, 0, 16, 16],
  limeWord: [16, 0, 240, 64], limeMat: [256, 0, 256, 64], limeBadge: [0, 64, 64, 64],
  veoWord: [64, 64, 224, 56], veoId: [288, 64, 112, 56], qr: [400, 64, 64, 64], veoTower: [64, 128, 224, 56],
  cosmoText: [288, 128, 224, 40],
};
let atlas = null, sharedMat = null, lightMat = null;
function drawAtlas() {
  const c = document.createElement('canvas'); c.width = AW; c.height = AH; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, AW, AH);
  const font = (px, w = 800) => `${w} ${px}px "Arial Rounded MT Bold", "Nunito", "Varela Round", "Helvetica Neue", Arial, sans-serif`;
  const text = (t, cx, cy, px, col, w) => { x.font = font(px, w); x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, cx, cy); };
  // Lime wordmark (green on the white down tube)
  { const [rx, ry, rw, rh] = REG.limeWord; limeLogo(x, rx + 34, ry + rh / 2, 22, '#2fb12e', '#fff'); text('lime', rx + 140, ry + rh / 2 + 2, 50, '#2fb12e'); }
  // Lime deck mat: charcoal rubber with fine ribs, emblem + "Lime" in light grey
  { const [rx, ry, rw, rh] = REG.limeMat; x.fillStyle = '#38393b'; x.fillRect(rx, ry, rw, rh); x.fillStyle = 'rgba(255,255,255,0.05)'; for (let k = 0; k < rw; k += 6) x.fillRect(rx + k, ry, 2, rh);
    x.strokeStyle = '#c9cbcb'; x.lineWidth = 3; x.beginPath(); x.arc(rx + 52, ry + rh / 2, 17, 0, 7); x.stroke(); text('Lime', rx + 120, ry + rh / 2 + 2, 34, '#c9cbcb'); }
  // Lime badge (green disc with a white citrus wheel)
  { const [rx, ry, rw, rh] = REG.limeBadge; limeLogo(x, rx + rw / 2, ry + rh / 2, 28, '#2fb12e', '#fff'); }
  // veo wordmark: white "ve", teal ring "o", on matte black
  for (const key of ['veoWord', 'veoTower']) { const [rx, ry, rw, rh] = REG[key]; x.fillStyle = '#1a1a1a'; x.fillRect(rx, ry, rw, rh); text('ve', rx + 82, ry + rh / 2 + 1, 48, '#ffffff');
    x.strokeStyle = '#2ee6d6'; x.lineWidth = 8; x.beginPath(); x.arc(rx + 150, ry + rh / 2 + 4, 15, 0, 7); x.stroke(); }
  // fleet id on the stem front
  { const [rx, ry, rw, rh] = REG.veoId; x.fillStyle = '#1a1a1a'; x.fillRect(rx, ry, rw, rh); text('A934', rx + rw / 2, ry + rh / 2 + 1, 34, '#ffffff', 700); }
  // QR sticker: three finder squares + pseudo-random modules
  { const [rx, ry, rw, rh] = REG.qr; x.fillStyle = '#fff'; x.fillRect(rx, ry, rw, rh); const n = 15, cs = (rw - 8) / n; let s = 11;
    const finder = (i, j) => (i < 4 && j < 4) || (i > n - 5 && j < 4) || (i < 4 && j > n - 5);
    x.fillStyle = '#111';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { s = (s * 16807) % 2147483647; if (!finder(i, j) && s % 5 < 2) x.fillRect(rx + 4 + i * cs, ry + 4 + j * cs, cs + 0.3, cs + 0.3); }
    for (const [fi, fj] of [[0, 0], [n - 4, 0], [0, n - 4]]) { x.fillRect(rx + 4 + fi * cs, ry + 4 + fj * cs, cs * 4, cs * 4); x.fillStyle = '#fff'; x.fillRect(rx + 4 + (fi + 0.6) * cs, ry + 4 + (fj + 0.6) * cs, cs * 2.8, cs * 2.8); x.fillStyle = '#111'; x.fillRect(rx + 4 + (fi + 1.2) * cs, ry + 4 + (fj + 1.2) * cs, cs * 1.6, cs * 1.6); } }
  // Cosmo frame text
  { const [rx, ry, rw, rh] = REG.cosmoText; x.fillStyle = '#1ec6b2'; x.fillRect(rx, ry, rw, rh); text('veoride.com', rx + rw / 2, ry + rh / 2 + 1, 22, '#ffffff', 700); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function limeLogo(x, cx, cy, r, green, white) { // simplified citrus-slice wheel
  x.fillStyle = green; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  x.strokeStyle = white; x.lineWidth = Math.max(2, r * 0.13); x.beginPath(); x.arc(cx, cy, r * 0.62, 0, 7); x.stroke();
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62); x.stroke(); }
}
export function rideMaterial() {
  if (sharedMat) return sharedMat;
  atlas = typeof document !== 'undefined' ? drawAtlas() : null;
  sharedMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: atlas, roughness: 0.52, metalness: 0.06 });
  sharedMat.name = 'ride-shared';
  return sharedMat;
}
const LIGHT_COL = { lightF: 0xfff2dc, lightR: 0xff1a1a, lightU: 0x3a6bff };
export function rideLightMaterial(kind = 'lightF') { // headlight / tail light / underglow on the ridden vehicle; emissive scaled by the plugin
  lightMat = lightMat || {};
  if (lightMat[kind]) return lightMat[kind];
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0, emissive: LIGHT_COL[kind] || 0xffffff, emissiveIntensity: 0.0 });
  m.name = 'ride-' + kind; return (lightMat[kind] = m);
}
export function rideLightMaterials() { return Object.keys(LIGHT_COL).map((k) => rideLightMaterial(k)); }

// ---------------------------------------------------------------- geometry helpers
const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);
const WHITE_UV = [(REG.white[0] + 8) / AW, 1 - (REG.white[1] + 8) / AH];
// Normalise a geometry for merging: indexed, exactly position/normal/uv/color; colour + atlas region applied.
function paint(g, hex, region) {
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.index) g = mergeVertices(g, 1e-5);
  const n = g.attributes.position.count; _c.set(hex);
  const col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const uv = new Float32Array(n * 2);
  if (region) { const [rx, ry, rw, rh] = REG[region]; const src = g.attributes.uv; for (let i = 0; i < n; i++) { const u = src.getX(i), v = src.getY(i); uv[i * 2] = (rx + 1 + u * (rw - 2)) / AW; uv[i * 2 + 1] = 1 - (ry + 1 + (1 - v) * (rh - 2)) / AH; } }
  else for (let i = 0; i < n; i++) { uv[i * 2] = WHITE_UV[0]; uv[i * 2 + 1] = WHITE_UV[1]; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
class Parts {
  constructor() { this.b = {}; }
  add(bucket, g, hex, region, xf) { if (xf) g.applyMatrix4(xf); (this.b[bucket] || (this.b[bucket] = [])).push(paint(g, hex, region)); return this; }
  // rod (cylinder) between points a and b
  rod(bucket, a, b, r, hex, seg = 8, r2) { const d = _v.subVectors(b, a); const L = d.length(); const g = new THREE.CylinderGeometry(r2 ?? r, r, L, seg, 1); _q.setFromUnitVectors(UP, d.clone().normalize()); _m.compose(a.clone().addScaledVector(d, 0.5), _q, _s); return this.add(bucket, g, hex, null, _m.clone()); }
  box(bucket, w, h, d, hex, pos, rot = [0, 0, 0], round = 0, region) { const g = round > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(round, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)) : new THREE.BoxGeometry(w, h, d); _m.compose(pos, _q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ')), _s); return this.add(bucket, g, hex, region, _m.clone()); }
  // decal plane (w x h) at pos facing `normal`, with the text running along `along`
  decal(bucket, w, h, region, pos, normal, along) { const g = new THREE.PlaneGeometry(w, h); const n = normal.clone().normalize(); const a = along.clone().addScaledVector(n, -along.dot(n)).normalize(); const up = new THREE.Vector3().crossVectors(n, a).normalize(); const basis = new THREE.Matrix4().makeBasis(a, up, n); basis.setPosition(pos); return this.add(bucket, g, '#ffffff', region, basis); }
  // side-profile extrusion: pts are [u (forward), v (up)], extruded symmetric across x by `width`
  side(bucket, pts, width, hex, bevel = 0.005, x0 = 0) { const sh = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v))); const depth = Math.max(0.001, width - 2 * bevel);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 }); g.rotateY(Math.PI / 2); g.translate(x0 - depth / 2, 0, 0); return this.add(bucket, g, hex); }
  // annulus sector in the side plane (fenders): centre (u,v), radii, angles measured from +u (forward) toward +v (up)
  arc(bucket, cu, cv, r0, r1, a0, a1, width, hex, seg = 14) { const pts = []; for (let i = 0; i <= seg; i++) { const a = a0 + (a1 - a0) * i / seg; pts.push([cu + Math.cos(a) * r1, cv + Math.sin(a) * r1]); } for (let i = seg; i >= 0; i--) { const a = a0 + (a1 - a0) * i / seg; pts.push([cu + Math.cos(a) * r0, cv + Math.sin(a) * r0]); } return this.side(bucket, pts, width, hex, 0.003); }
  wheel(bucket, r, tw, o) { // centred on the axle, axis = x
    const tyre = new THREE.TorusGeometry(r - tw * 0.48, tw * 0.5, 7, 22); tyre.rotateY(Math.PI / 2); tyre.scale(1.25, 1, 1); this.add(bucket, tyre, o.tyre || '#1b1b1b');
    if (o.ring) { const ring = new THREE.TorusGeometry(r - tw * 0.86, tw * 0.13, 4, 22); ring.rotateY(Math.PI / 2); for (const s of [-1, 1]) { const g = ring.clone(); g.translate(s * tw * 0.42, 0, 0); this.add(bucket, g, o.ring); } }
    const rr = r - tw * 0.95; const rim = new THREE.TorusGeometry(rr, tw * 0.16, 4, 20); rim.rotateY(Math.PI / 2); rim.scale(2.2, 1, 1); this.add(bucket, rim, o.rim || '#2a2a2a');
    const n = o.spokes ?? 5; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; const g = new THREE.BoxGeometry(tw * 0.32, rr * 0.92, rr * 0.16); g.translate(0, rr * 0.5, 0); g.rotateX(a); this.add(bucket, g, o.rim || '#2a2a2a'); }
    const hub = new THREE.CylinderGeometry(o.hubR || rr * 0.34, o.hubR || rr * 0.34, tw * (o.hubW || 1.05), 12); hub.rotateZ(Math.PI / 2); this.add(bucket, hub, o.hub || '#a5a9ac');
    if (o.disc) { const d = new THREE.CylinderGeometry(rr * 0.62, rr * 0.62, 0.004, 16); d.rotateZ(Math.PI / 2); d.translate(-tw * 0.62, 0, 0); this.add(bucket, d, '#9fa4a8'); }
    return this;
  }
  build() { const out = {}; for (const [k, list] of Object.entries(this.b)) out[k] = mergeGeometries(list, false); return out; }
}

// steering axis: passes through the front axle (0, R, -wb/2), raked back by `rake`
function axisAt(spec, y) { return V(0, y, -spec.wb / 2 + (y - spec.R) * Math.tan(spec.rake)); }

// ---------------------------------------------------------------- Lime Gen4
export const LIME = { id: 'lime', name: 'Lime scooter', brand: 'Lime', wb: 0.9, R: 0.1375, tw: 0.066, rake: 0.2, deckTop: 0.179, feet: [-0.11, 0.16], standVec: [-0.1, -0.112, 0.07], grips: 1.085, gripX: 0.255, vmax: 6.94, seated: false };
function buildLime(P) {
  const S = LIME, R = S.R, W = '#eceeed', G = '#4cc22e', K = '#1b1b1b', MAT = '#3a3d40';
  // deck (white shell) + ribbed charcoal mat with the Lime emblem
  P.side('body', roundRect(-0.3, 0.1, 0.205, 0.166, 0.026), 0.172, W, 0.007);
  P.side('body', [[-0.27, 0.166], [-0.335, 0.262], [-0.37, 0.262], [-0.35, 0.16], [-0.3, 0.115]], 0.085, K, 0.006); // rear fender mount
  P.box('body', 0.15, 0.005, 0.47, MAT, V(0, 0.1755, 0.04)).decal('body', 0.46, 0.145, 'limeMat', V(0, 0.1785, 0.04), V(0, 1, 0), V(0, 0, -1)); // shell top is 0.173 (bevel)
  // rear tail arms to the axle + chunky black rear fender (doubles as the foot brake) with the red light
  for (const s of [-1, 1]) P.box('body', 0.022, 0.04, 0.16, W, V(s * 0.047, 0.142, 0.39), [0.05, 0, 0], 0.008);
  P.arc('body', -0.45, R, R + 0.01, R + 0.046, 0.75, 2.95, 0.092, K);
  // gooseneck down tube: broad flat-sided beam from the deck up to the head collar
  const c0 = [0.06, 0.135], c1 = [0.383, 0.47]; const dx = c1[0] - c0[0], dy = c1[1] - c0[1], L = Math.hypot(dx, dy); const nx = -dy / L, ny = dx / L;
  const beam = [[c0[0] - nx * 0.06, c0[1] - ny * 0.06 - 0.02], [c1[0] - nx * 0.04, c1[1] - ny * 0.04], [c1[0] + nx * 0.045, c1[1] + ny * 0.045], [c0[0] + nx * 0.055 - 0.06, c0[1] + ny * 0.035]];
  P.side('body', beam, 0.074, W, 0.008);
  const ang = Math.atan2(dy, dx), mid = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2];
  const along = V(0, Math.sin(ang), -Math.cos(ang)); // up the beam, toward the front
  for (const s of [-1, 1]) P.decal('body', 0.2, 0.054, 'limeWord', V(s * 0.0395, mid[1] - 0.004, -(mid[0] - 0.004)), V(s, 0, 0), s > 0 ? along : along.clone().multiplyScalar(-1));
  // swappable battery on the upper/rear face of the down tube
  P.box('body', 0.05, 0.014, 0.25, '#a9adb0', V(0, mid[1] + ny * 0.05, -(mid[0] + nx * 0.05)), [ang, 0, 0], 0.005);
  // head collar on the steering axis, amber side reflectors, Lime badge
  const hc = axisAt(S, 0.5); P.rod('body', axisAt(S, 0.445), axisAt(S, 0.6), 0.036, W, 14);
  for (const s of [-1, 1]) { P.box('body', 0.004, 0.034, 0.024, '#f08a24', V(s * 0.037, 0.48, hc.z + 0.004)); P.decal('body', 0.034, 0.034, 'limeBadge', V(s * 0.0388, 0.42, -0.34), V(s, 0, 0), V(0, 0, -s)); }
  // kickstand (separate bucket, pivots at its top)
  P.rod('stand', V(0, 0, 0), V(-0.1, -0.112, 0.07), 0.009, K, 6).box('stand', 0.03, 0.008, 0.045, K, V(-0.1, -0.113, 0.07));
  // ---- steering assembly: white fork with black stanchions, black front fender, green stem + head unit, black bars
  const top = axisAt(S, 0.44);
  for (const s of [-1, 1]) { P.rod('steer', V(s * 0.043, top.y, top.z), V(s * 0.047, R, -S.wb / 2), 0.0135, W, 8); P.rod('steer', V(s * 0.043, top.y - 0.01, top.z - 0.0014), V(s * 0.044, top.y - 0.09, top.z - 0.0126), 0.0155, '#3a3c3e', 8); }
  P.box('steer', 0.11, 0.03, 0.05, W, V(0, top.y + 0.005, top.z), [-S.rake, 0, 0], 0.01);
  P.arc('steer', S.wb / 2, R, R + 0.01, R + 0.026, 1.1, 2.75, 0.06, K);
  P.rod('steer', axisAt(S, 0.6), axisAt(S, 1.04), 0.025, G, 14).rod('steer', axisAt(S, 0.598), axisAt(S, 0.61), 0.0275, '#202020', 14);
  const hu = axisAt(S, 1.065); const H = headFrame(V(0, hu.y, hu.z + 0.005), -0.32);
  P.box('steer', 0.17, 0.075, 0.105, G, V(0, hu.y, hu.z + 0.005), [-0.32, 0, 0], 0.016);
  P.box('steer', 0.09, 0.006, 0.055, '#1e2124', H.p(0, 0.0385, -0.008), [-0.32, 0, 0], 0.002);
  P.decal('steer', 0.03, 0.03, 'qr', H.p(0, 0, 0.0515), H.n(0, 0, 1), V(1, 0, 0));
  P.rod('steer', V(-S.gripX + 0.03, S.grips, hu.z + 0.03), V(S.gripX - 0.03, S.grips, hu.z + 0.03), 0.0145, '#1a1a1a', 8);
  for (const s of [-1, 1]) P.rod('steer', V(s * (S.gripX - 0.07), S.grips, hu.z + 0.03), V(s * (S.gripX + 0.055), S.grips, hu.z + 0.03), 0.02, '#151515', 8);
  for (const s of [-1, 1]) P.box('steer', 0.11, 0.01, 0.02, '#1c1c1c', V(s * (S.gripX - 0.01), S.grips - 0.01, hu.z - 0.014), [0, -s * 0.12, 0]);
  P.box('steer', 0.03, 0.012, 0.03, '#1c1c1c', V(S.gripX - 0.085, S.grips + 0.006, hu.z + 0.0), [0.4, 0, 0]);
  P.rod('steer', V(-0.075, S.grips + 0.012, hu.z + 0.02), V(-0.075, S.grips + 0.03, hu.z + 0.02), 0.014, '#b9bdc2', 10);
  // lights (separate buckets: emissive when ridden at night)
  P.rod('lightF', V(0, hu.y - 0.005, hu.z - 0.052), V(0, hu.y - 0.005, hu.z - 0.062), 0.018, '#f2f4f0', 12);
  P.box('lightR', 0.07, 0.034, 0.024, '#c8102e', V(0, R + 0.18 * Math.sin(2.75), 0.45 - 0.18 * Math.cos(2.75) + 0.012), [0.35, 0, 0], 0.006);
  // wheels: black airless tyres, charcoal 5-spoke rims; rear hub motor
  P.wheel('wheelF', R, S.tw, { rim: '#2a2a2a', spokes: 5, hub: '#a5a9ac' });
  P.wheel('wheelR', R, S.tw, { rim: '#222222', spokes: 5, hub: '#3b3d40', hubR: 0.05, hubW: 1.0 });
}

// ---------------------------------------------------------------- Veo Astro VS4
export const ASTRO = { id: 'veo', name: 'Veo scooter', brand: 'Veo', wb: 0.9, R: 0.127, tw: 0.062, rake: 0.23, deckTop: 0.146, feet: [-0.11, 0.16], standVec: [-0.1, -0.085, 0.07], grips: 1.1, gripX: 0.225, vmax: 6.94, seated: false };
function buildAstro(P) {
  const S = ASTRO, R = S.R, CH = '#262628', MATC = '#2e2e30', T = '#3cdcd2', K = '#1a1a1a';
  // slab deck with a kick-up tail
  P.side('body', [[-0.3, 0.062], [0.25, 0.062], [0.27, 0.085], [0.25, 0.132], [-0.3, 0.132], [-0.395, 0.185], [-0.42, 0.17], [-0.4, 0.13], [-0.33, 0.07]], 0.19, CH, 0.008);
  P.box('body', 0.17, 0.004, 0.53, MATC, V(0, 0.1415, 0.0)); // slab top is 0.140 (bevel)
  for (let k = 0; k < 9; k++) P.box('body', 0.15, 0.003, 0.012, '#4a4a4c', V(0, 0.1445, -0.2 + k * 0.05));
  // teal side bands along the deck, continuous with the neck swoop
  for (const s of [-1, 1]) P.box('body', 0.01, 0.042, 0.6, T, V(s * 0.1, 0.098, -0.01), [0, 0, 0], 0.004);
  const P0 = [0.22, 0.1], P1 = [0.4, 0.1], P2 = [0.355, 0.52]; const pts = [], sw = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([(1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]]); }
  const off = (i, sgn) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty); const w = 0.042 - i * 0.0014; return [pts[i][0] - sgn * ty / l * w, pts[i][1] + sgn * tx / l * w]; };
  for (let i = 0; i < pts.length; i++) sw.push(off(i, 1)); for (let i = pts.length - 1; i >= 0; i--) sw.push(off(i, -1));
  P.side('body', sw, 0.078, T, 0.008);
  P.side('body', [[0.2, 0.065], [0.36, 0.08], [0.36, 0.13], [0.2, 0.13]], 0.11, CH, 0.008);
  // head tube, rear fender, teal rear axle covers, red reflectors
  P.rod('body', axisAt(S, 0.43), axisAt(S, 0.57), 0.033, K, 12);
  P.arc('body', -0.45, R, R + 0.01, R + 0.026, 0.9, 2.95, 0.07, K);
  for (const s of [-1, 1]) { P.box('body', 0.014, 0.042, 0.2, T, V(s * 0.05, 0.13, 0.37), [0.12, 0, 0], 0.004); P.box('body', 0.004, 0.018, 0.03, '#d0302e', V(s * 0.0965, 0.1, -0.22)); P.box('body', 0.004, 0.016, 0.026, '#d0302e', V(s * 0.0965, 0.135, 0.33), [0.5, 0, 0]); }
  P.box('lightR', 0.06, 0.018, 0.008, '#ff2a2a', V(0, 0.17, 0.418), [0.6, 0, 0]);
  P.box('lightU', 0.09, 0.005, 0.44, '#3a6bff', V(0, 0.058, 0.0));
  P.rod('stand', V(0, 0, 0), V(-0.1, -0.085, 0.07), 0.009, K, 6).box('stand', 0.03, 0.008, 0.045, K, V(-0.1, -0.086, 0.07));
  // ---- steering: black telescopic fork with a red reflector arch, black fender, rectangular black stem, flared head
  const top = axisAt(S, 0.425);
  for (const s of [-1, 1]) { P.rod('steer', V(s * 0.042, top.y, top.z), V(s * 0.045, R, -S.wb / 2), 0.0135, K, 8); P.rod('steer', V(s * 0.042, top.y, top.z), V(s * 0.043, top.y - 0.12, top.z - 0.028), 0.017, '#2c2c2e', 8); }
  P.box('steer', 0.11, 0.03, 0.05, K, V(0, top.y, top.z), [-S.rake, 0, 0], 0.01);
  P.arc('steer', S.wb / 2, R, R + 0.01, R + 0.026, 0.55, 2.6, 0.062, K);
  P.box('steer', 0.07, 0.022, 0.012, '#d93a3a', V(0, R + 0.135, -S.wb / 2 - 0.035), [-0.5, 0, 0], 0.004);
  // stem: rounded rectangle column with the vertical veo wordmark + fleet id
  const s0 = axisAt(S, 0.57), s1 = axisAt(S, 1.04), sm = s0.clone().lerp(s1, 0.5); const sl = s0.distanceTo(s1);
  P.box('steer', 0.044, sl, 0.052, K, sm, [-S.rake, 0, 0], 0.014);
  const ax = s1.clone().sub(s0).normalize();
  for (const s of [-1, 1]) P.decal('steer', 0.17, 0.042, 'veoWord', s0.clone().lerp(s1, 0.6).add(V(s * 0.0232, 0, 0)), V(s, 0, 0), ax.clone().multiplyScalar(-1));
  P.decal('steer', 0.07, 0.032, 'veoId', s0.clone().lerp(s1, 0.82).add(V(0, 0, -0.0275)), V(0, Math.sin(S.rake), -Math.cos(S.rake)), ax.clone().multiplyScalar(-1));
  const hu = axisAt(S, 1.06); const H = headFrame(V(0, hu.y, hu.z + 0.01), -0.35);
  P.box('steer', 0.13, 0.055, 0.095, K, V(0, hu.y, hu.z + 0.01), [-0.35, 0, 0], 0.01);
  P.box('steer', 0.075, 0.005, 0.05, '#0f1214', H.p(0, 0.0285, -0.006), [-0.35, 0, 0], 0.002);
  P.decal('steer', 0.028, 0.028, 'qr', H.p(0, 0, 0.049), H.n(0, 0, 1), V(1, 0, 0));
  P.rod('steer', V(-S.gripX + 0.03, S.grips, hu.z + 0.03), V(S.gripX - 0.03, S.grips, hu.z + 0.03), 0.0145, K, 8);
  for (const s of [-1, 1]) P.rod('steer', V(s * (S.gripX - 0.065), S.grips, hu.z + 0.03), V(s * (S.gripX + 0.055), S.grips, hu.z + 0.03), 0.02, '#121212', 8);
  for (const s of [-1, 1]) P.box('steer', 0.1, 0.008, 0.016, '#1c1c1c', V(s * (S.gripX - 0.012), S.grips - 0.009, hu.z - 0.01), [0, -s * 0.12, 0]);
  P.rod('steer', V(0.07, S.grips + 0.012, hu.z + 0.02), V(0.07, S.grips + 0.03, hu.z + 0.02), 0.014, '#b9bdc2', 10);
  P.rod('lightF', V(0, hu.y - 0.004, hu.z - 0.046), V(0, hu.y - 0.004, hu.z - 0.056), 0.016, '#f2f4f0', 12);
  P.wheel('wheelF', R, S.tw, { rim: '#2a2a2a', spokes: 6, hub: '#a5a9ac', disc: true });
  P.wheel('wheelR', R, S.tw, { rim: '#262626', spokes: 6, hub: '#2a2a2a', hubR: 0.05 });
}

// ---------------------------------------------------------------- Veo Cosmo (seated; Berkeley's "Veo e-bike")
export const COSMO = { id: 'cosmo', name: 'Veo Cosmo', brand: 'Veo', wb: 1.0, R: 0.2, tw: 0.064, rake: 0.33, deckTop: 0.3, seatY: 0.775, seatZ: 0.13, feet: [-0.13, -0.11], standVec: [-0.12, -0.25, 0.08], grips: 1.07, gripX: 0.28, vmax: 6.94, seated: true };
function buildCosmo(P) {
  const S = COSMO, R = S.R, T = '#1ec6b2', K = '#1c1c1e', KK = '#181818';
  // swooping teal J frame: head tube -> steep drop -> long low beam -> rear swingarm
  const path = [[0.43, 0.6], [0.4, 0.5], [0.34, 0.37], [0.27, 0.3], [0.16, 0.27], [-0.1, 0.27], [-0.3, 0.29], [-0.5, 0.21]];
  const sw = []; const N = path.length; const nrm = (i) => { const a = path[Math.max(0, i - 1)], b = path[Math.min(N - 1, i + 1)]; const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty); return [-ty / l, tx / l]; };
  for (let i = 0; i < N; i++) { const [nx, ny] = nrm(i); sw.push([path[i][0] + nx * 0.032, path[i][1] + ny * 0.032]); }
  for (let i = N - 1; i >= 0; i--) { const [nx, ny] = nrm(i); sw.push([path[i][0] - nx * 0.032, path[i][1] - ny * 0.032]); }
  P.side('body', sw, 0.05, T, 0.01);
  for (const s of [-1, 1]) P.decal('body', 0.2, 0.034, 'cosmoText', V(s * 0.0262, 0.27, 0.02), V(s, 0, 0), V(0, 0, -s));
  // battery / seat tower with the vertical veo logo, saddle, footboards
  P.box('body', 0.1, 0.36, 0.14, K, V(0, 0.47, 0.1), [0.12, 0, 0], 0.025);
  for (const s of [-1, 1]) P.decal('body', 0.22, 0.05, 'veoTower', V(s * 0.0508, 0.47, 0.1), V(s, 0, 0), V(0, Math.cos(0.12), Math.sin(0.12)));
  P.box('body', 0.21, 0.07, 0.4, '#232325', V(0, 0.735, S.seatZ), [-0.04, 0, 0], 0.03);
  for (const s of [-1, 1]) P.box('body', 0.07, 0.012, 0.13, '#202022', V(s * 0.055, 0.3, -0.12), [0, 0, 0], 0.004);
  P.arc('body', -0.5, R, R + 0.012, R + 0.035, 0.6, 2.9, 0.075, KK);
  P.box('lightR', 0.07, 0.014, 0.01, '#d8262b', V(0, R + 0.2, 0.5 + 0.17), [0.9, 0, 0]);
  P.rod('body', axisAt(S, 0.52), axisAt(S, 0.7), 0.034, KK, 12);
  P.rod('stand', V(0, 0, 0), V(-0.12, -0.25, 0.08), 0.01, KK, 6);
  // steering: exposed black telescopic fork, black stem + chunky head
  const top = axisAt(S, 0.52);
  for (const s of [-1, 1]) { P.rod('steer', V(s * 0.05, top.y, top.z), V(s * 0.05, R, -S.wb / 2), 0.014, KK, 8); P.rod('steer', V(s * 0.05, top.y, top.z), V(s * 0.05, top.y - 0.16, top.z - 0.055), 0.02, '#2a2a2c', 8); }
  P.arc('steer', S.wb / 2, R, R + 0.012, R + 0.03, 0.5, 2.3, 0.07, KK);
  P.rod('steer', axisAt(S, 0.7), axisAt(S, 1.02), 0.02, KK, 10);
  const hu = axisAt(S, 1.04);
  const H = headFrame(V(0, hu.y, hu.z), -0.3);
  P.box('steer', 0.16, 0.065, 0.1, KK, V(0, hu.y, hu.z), [-0.3, 0, 0], 0.02).box('steer', 0.08, 0.005, 0.05, '#0f1214', H.p(0, 0.0335, -0.005), [-0.3, 0, 0]);
  P.rod('steer', V(-S.gripX + 0.03, S.grips, hu.z + 0.03), V(S.gripX - 0.03, S.grips, hu.z + 0.03), 0.012, KK, 8);
  for (const s of [-1, 1]) P.rod('steer', V(s * (S.gripX - 0.07), S.grips, hu.z + 0.03), V(s * (S.gripX + 0.05), S.grips, hu.z + 0.03), 0.018, '#121212', 8);
  P.rod('lightF', V(0, hu.y - 0.01, hu.z - 0.05), V(0, hu.y - 0.01, hu.z - 0.06), 0.022, '#f2f4f0', 12);
  P.wheel('wheelF', R, S.tw, { rim: '#202020', spokes: 5, hub: '#2a2a2a', ring: T, disc: true });
  P.wheel('wheelR', R, S.tw, { rim: '#202020', spokes: 5, hub: '#202020', hubR: 0.085, hubW: 1.1, ring: T });
}

function headFrame(c, rx) { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)); return { p: (x, y, z) => V(x, y, z).applyQuaternion(q).add(c), n: (x, y, z) => V(x, y, z).applyQuaternion(q) }; }
function roundRect(u0, v0, u1, v1, r) { const pts = []; const seg = 4; const c = [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, Math.PI / 2], [u0 + r, v0 + r, Math.PI], [u1 - r, v0 + r, Math.PI * 1.5]];
  for (const [cu, cv, a0] of c) for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push([cu + Math.cos(a) * r, cv + Math.sin(a) * r]); } return pts; }

const BUILDERS = { lime: buildLime, veo: buildAstro, cosmo: buildCosmo };
export const SPECS = { lime: LIME, veo: ASTRO, cosmo: COSMO };
const cache = {};
// raw bucket geometries for a vehicle type
export function vehicleParts(type) { if (cache[type]) return cache[type]; const P = new Parts(); BUILDERS[type](P); return (cache[type] = P.build()); }
// standard positions of moving parts in the local frame
export function rig(type) { const S = SPECS[type]; return { steerPivot: V(0, S.R, -S.wb / 2), steerAxis: V(0, Math.cos(S.rake), Math.sin(S.rake)), wheelR: V(0, S.R, S.wb / 2), standPivot: S.seated ? V(-0.05, 0.26, 0.05) : V(-0.065, S.deckTop - 0.05, -0.1) }; }
export const PARK_STEER = 0.32;
function steerMatrix(r, angle) { return new THREE.Matrix4().makeTranslation(r.steerPivot.x, r.steerPivot.y, r.steerPivot.z).multiply(new THREE.Matrix4().makeRotationAxis(r.steerAxis, angle)).multiply(new THREE.Matrix4().makeTranslation(-r.steerPivot.x, -r.steerPivot.y, -r.steerPivot.z)); }
// one merged geometry of the whole parked vehicle (kickstand down, bars flopped toward the stand)
export function parkedGeometry(type) {
  const key = type + ':parked'; if (cache[key]) return cache[key];
  const p = vehicleParts(type), r = rig(type), list = [];
  const add = (g, m) => { if (!g) return; const c = g.clone(); c.applyMatrix4(m); list.push(c); };
  const I = new THREE.Matrix4();
  add(p.body, I); add(p.lightR, I); add(p.lightU, I);
  add(p.stand, new THREE.Matrix4().makeTranslation(r.standPivot.x, r.standPivot.y, r.standPivot.z));
  const sM = steerMatrix(r, PARK_STEER);
  add(p.steer, sM); add(p.lightF, sM);
  add(p.wheelF, sM.clone().multiply(new THREE.Matrix4().makeTranslation(r.steerPivot.x, r.steerPivot.y, r.steerPivot.z)));
  add(p.wheelR, new THREE.Matrix4().makeTranslation(r.wheelR.x, r.wheelR.y, r.wheelR.z));
  const g = mergeGeometries(list, false); g.computeBoundingSphere(); return (cache[key] = g);
}
// rideable rig: { root, body, steer (pivot group), wheelF, wheelR, stand, lights[], grips[] (steer-local) }
export function buildRig(type) {
  const p = vehicleParts(type), r = rig(type), M = rideMaterial();
  const root = new THREE.Group(); root.name = 'ride:' + type; root.rotation.order = 'YXZ';
  const mesh = (g, m = M) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; };
  root.add(mesh(p.body));
  const lights = [];
  for (const k of ['lightR', 'lightU']) if (p[k]) { const o = mesh(p[k], rideLightMaterial(k)); o.castShadow = false; root.add(o); lights.push(o); }
  const stand = new THREE.Group(); stand.position.copy(r.standPivot); stand.add(mesh(p.stand)); root.add(stand);
  const steer = new THREE.Group(); steer.position.copy(r.steerPivot); root.add(steer);
  const sm = mesh(p.steer); sm.position.copy(r.steerPivot).negate(); steer.add(sm);
  if (p.lightF) { const o = mesh(p.lightF, rideLightMaterial('lightF')); o.castShadow = false; o.position.copy(r.steerPivot).negate(); steer.add(o); lights.push(o); }
  const wheelF = new THREE.Group(); wheelF.add(mesh(p.wheelF)); steer.add(wheelF);
  const wheelR = new THREE.Group(); wheelR.position.copy(r.wheelR); wheelR.add(mesh(p.wheelR)); root.add(wheelR);
  const S = SPECS[type]; const hu = axisAt(S, S.seated ? 1.04 : 1.065);
  const grips = [-1, 1].map((s) => V(s * (S.gripX - 0.005), S.grips, hu.z + 0.03).sub(r.steerPivot));
  const sv = V(...S.standVec).normalize(); const stow = new THREE.Quaternion().setFromUnitVectors(sv, V(-0.12, S.seated ? -0.12 : 0.02, 1).normalize());
  return { root, steer, wheelF, wheelR, stand, lights, axis: r.steerAxis.clone(), grips, spec: S, standStow: stow };
}

// ---------------------------------------------------------------- hoverboard (a nod to Back to the Future Part II)
let hoverTex = null;
function hoverTexture() {
  if (hoverTex || typeof document === 'undefined') return hoverTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, '#ee4f98'); g.addColorStop(0.5, '#ff6aab'); g.addColorStop(1, '#ee4f98'); x.fillStyle = g; x.fillRect(0, 0, 512, 160);
  // lime-green and yellow chevrons at nose and tail
  for (const [x0, dir] of [[14, 1], [498, -1]]) {
    for (const [o, col] of [[0, '#b8f03c'], [40, '#ffd52e']]) { x.fillStyle = col; x.beginPath(); x.moveTo(x0 + dir * o, 18); x.lineTo(x0 + dir * (o + 58), 80); x.lineTo(x0 + dir * o, 142); x.lineTo(x0 + dir * (o + 18), 142); x.lineTo(x0 + dir * (o + 76), 80); x.lineTo(x0 + dir * (o + 18), 18); x.fill(); }
  }
  // grip pad with yellow foot outlines
  x.fillStyle = '#26262b'; roundRectPath(x, 150, 24, 212, 112, 18); x.fill();
  x.strokeStyle = '#ffd52e'; x.lineWidth = 4; for (const fx of [196, 316]) { x.beginPath(); x.ellipse(fx, 80, 24, 42, 0, 0, 7); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (hoverTex = t);
}
function roundRectPath(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
export const HOVER = { len: 0.84, wid: 0.25, thick: 0.034 };
export function buildHoverboard() {
  const root = new THREE.Group(); root.name = 'hoverboard'; root.rotation.order = 'YXZ';
  const L = HOVER.len, W = HOVER.wid, Tk = HOVER.thick;
  // plan outline: long rounded lozenge; long axis along z (forward = -z)
  const sh = new THREE.Shape(); const N = 44;
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2; const cx = Math.cos(a), sy = Math.sin(a); const x = Math.sign(cx) * Math.pow(Math.abs(cx), 0.42) * W / 2, z = Math.sign(sy) * Math.pow(Math.abs(sy), 0.85) * L / 2; i ? sh.lineTo(x, z) : sh.moveTo(x, z); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: Tk - 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 3, curveSegments: 4, steps: 1 });
  g.rotateX(Math.PI / 2); // shape (x, y) -> (x, z) lying flat; extrusion goes down
  g.translate(0, Tk - 0.006, 0);
  const pos = g.attributes.position; // kick nose and tail upward
  for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i), a = Math.max(0, Math.abs(z) - L * 0.3) / (L * 0.2); pos.setY(i, pos.getY(i) + a * a * 0.045); }
  g.computeVertexNormals();
  const uv = g.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 - pos.getZ(i) / L, 0.5 + pos.getX(i) / W);
  const top = new THREE.MeshStandardMaterial({ map: hoverTexture(), roughness: 0.38, metalness: 0.05 });
  const deck = new THREE.Mesh(g, top); deck.castShadow = true; deck.receiveShadow = true; root.add(deck);
  // underside: dark chassis with two glowing hover pads
  const under = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.45, metalness: 0.4 });
  const glowM = new THREE.MeshStandardMaterial({ color: 0x9ff3ff, emissive: 0x38d8ff, emissiveIntensity: 1.6, roughness: 0.4 });
  for (const z of [-0.24, 0.24]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.03, 20), under); pod.position.set(0, -0.012, z); pod.castShadow = true; root.add(pod);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), glowM); pad.rotation.x = Math.PI / 2; pad.position.set(0, -0.028, z); root.add(pad);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, L * 0.62), under); rail.position.y = -0.006; root.add(rail);
  // soft additive ground glow (placed on the ground under the board by the plugin)
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gx = gc.getContext('2d'); const rg = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(120,230,255,0.85)'); rg.addColorStop(0.45, 'rgba(80,190,255,0.28)'); rg.addColorStop(1, 'rgba(60,160,255,0)'); gx.fillStyle = rg; gx.fillRect(0, 0, 64, 64);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2; glow.renderOrder = 2; glow.name = 'hover-glow';
  return { root, deck, glow, glowMat: glowM };
}
