// Big Game easter egg: permanent anti-Stanford rivalry gags (always present, never date-gated).
//  1. "The Play" (Nov 20, 1982) loops on the Memorial Stadium field whenever you are nearby: Stanford's squib kick,
//     five laterals, the Stanford Band streaming on from the south end zone, Kevin Moen, and one flattened trombonist.
//     The video boards follow along ("THE BAND IS ON THE FIELD!").
//  2. The Stanford Tree dangles from the minute hand of the Campanile's south clock, Harold Lloyd style.
//  3. The Stanford Axe in a glass case on Lower Sproul by the MLK Student Union, where Cal displays it when Cal holds it.
// Hooked from main.js (installBigGame / BIG_GAME_PLACES). Geometry is merged or instanced, and nothing animates unless
// the camera is close. `?nobg=1` turns the whole thing off (for A/B screenshots and perf checks).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { materials, boxUV } from '../materials.js';

const YD = 0.9144, TAU = Math.PI * 2;
// Memorial Stadium frame: mirrors src/landmarks/memorial-stadium.js (anchor from the manifest, FC and AX constants).
const ST_ANCHOR = [624.57, 120.18], AX = [0.66610, 0.74586], PX = [0.74586, -0.66610];
const FCW = [ST_ANCHOR[0] - 0.65, ST_ANCHOR[1] - 0.40];
// Play coordinates: u = metres from midfield toward the south end zone (the one Cal attacked), w = metres to Cal's right.
const uw2xz = (u, w) => [FCW[0] + u * AX[0] - w * PX[0], FCW[1] + u * AX[1] - w * PX[1]];
const AXE = { x: -203.5, z: 318.5, yaw: -Math.PI / 2 }; // Lower Sproul, off the MLK Student Union's west side; front faces west
const TREE_SPOT = [16, 46];                            // viewing spot south of Sather Tower (map dot / fast travel)

export const BIG_GAME_PLACES = [
  { id: 'bg-the-play', name: 'The Play (1982)', sub: 'Memorial Stadium · Cal 25, Stanford 20', p: uw2xz(16 * YD, 27), r: 0.01,
    blurb: 'Four seconds left, five laterals, one trombone. The Stanford Band took the field early; Kevin Moen took it personally. Replayed here forever, by popular demand.',
    ach: { title: 'The Band Is on the Field', icon: 'ball' } },
  { id: 'bg-tree', name: 'The Stanford Tree (stranded)', sub: 'Sather Tower · south clock', p: TREE_SPOT, r: 0.01,
    blurb: 'Climbed the Campanile for a better view of a real university, then grabbed the minute hand. Facilities says it is on the list.',
    ach: { title: 'Safety Last!', icon: 'tree' } },
  { id: 'bg-axe', name: 'The Stanford Axe', sub: 'Lower Sproul · Cal custody', p: [AXE.x - 2.5, AXE.z], r: 6,
    blurb: 'The Big Game trophy since 1933. When Cal holds it, it lives by the MLK Student Union. In this simulator, Cal always holds it.',
    ach: { title: "Give 'em the Axe", icon: 'axe' } },
];

// ---------------------------------------------------------------- geometry helpers (non-indexed: position, normal, color)
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function paint(g, col) {
  g = g.index ? g.toNonIndexed() : g; if (g.attributes.uv) g.deleteAttribute('uv');
  const n = g.attributes.position.count, c = new Float32Array(n * 3), [r, gg, b] = Array.isArray(col) ? col : [col, col, col];
  for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = gg; c[i * 3 + 2] = b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
const tf = (g, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => g.applyMatrix4(_m4.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)));
const vbox = (w, h, d, x, y, z, col = 1, rx = 0, ry = 0, rz = 0) => paint(tf(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz), col);
const vsph = (r, x, y, z, col = 1, sx = 1, sy = 1, sz = 1, seg = 10) => paint(tf(new THREE.SphereGeometry(r, seg, Math.max(5, (seg * 0.7) | 0)), x, y, z, 0, 0, 0, sx, sy, sz), col);
const vcyl = (rt, rb, h, x, y, z, col = 1, seg = 8, rx = 0, ry = 0, rz = 0) => paint(tf(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, rx, ry, rz), col);
const vcone = (r, h, x, y, z, col, seg, rx = 0, ry = 0, rz = 0) => paint(tf(new THREE.CylinderGeometry(r * 0.12, r, h, seg, 1, true), x, y, z, rx, ry, rz), col);
function vlink(a, b, r0, r1, col, seg = 6) { // tapered cylinder from point a to point b
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(A.x, A.y, A.z); return paint(g, col);
}
const merge = (gs) => mergeGeometries(gs, false);
const hex = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// ================================================================ 1. THE PLAY
// Script from the play-by-play (Wikipedia, "The Play"): Harmon squib-kicks from the Stanford 25 (after a 15-yard
// penalty); Moen fields it at the Cal 45 and laterals left to Rodgers; Rodgers pitches back to Garner; Garner runs five
// yards into five tacklers and pitches back to Rodgers as the Stanford Band (waiting behind the south end zone) storms
// the field; Rodgers cuts right and pitches to Ford around the Stanford 45; Ford races right of the right hash into the
// band and, smothered at the 27, flips a blind lateral over his right shoulder to Moen, who runs through the band into
// the end zone and into trombonist Gary Tyrrell. Cal had only 10 men on the field, so we use 10.
const T0 = -2.5, T_END = 24.6;
const K = (a) => a.map(([t, u, w]) => [t, u * YD, w]);
const TRACK = {
  moen: K([[T0, -14, -2], [0, -14, -2], [1.2, -9, -1.5], [2.4, -5, -1], [3.0, -4.6, -0.2], [3.6, -4.4, 0.4], [5.0, -3, 2.5], [7.5, 2, 5], [10.2, 12, 8], [12.0, 19.5, 10], [12.75, 22, 10.5], [13.6, 29, 9.5], [14.4, 37, 7.6], [15.3, 46, 5.6], [16.15, 53, 4], [16.6, 55.5, 3.4], [17.4, 56.5, 3.2], [30, 56.5, 3.2]]),
  rodgers: K([[T0, -9, -8], [0, -9, -8], [2.4, -6.5, -8], [3.6, -5.6, -7.6], [3.95, -5.5, -7.5], [4.8, -4.5, -7], [5.8, -3, -6.5], [6.8, -1.6, -6], [7.15, -1, -6], [7.8, 0.5, -4], [8.7, 3, -1], [9.3, 5, 1], [10.5, 9, 2.5], [12.5, 16, 3], [15, 28, 3.5], [17, 40, 3], [19.5, 51, 1.5], [30, 51, 1.5]]),
  garner: K([[T0, -11, -3], [0, -11, -3], [3.0, -7.5, -3], [4.8, -5.6, -3], [5.15, -5.5, -3], [5.9, -3, -3.1], [6.6, -0.5, -3.2], [7.1, -0.2, -3.2], [10.0, -0.2, -3.2], [13, 8, -2], [16, 22, 0], [19.5, 41, 1], [30, 41, 1]]),
  ford: K([[T0, -10, 6], [0, -10, 6], [3, -6, 5], [6, -2, 4], [8.6, 1, 3.5], [9.3, 3.5, 3.2], [9.6, 4.5, 3.2], [10.4, 10, 6.5], [11.6, 18, 8.5], [12.45, 23.5, 8.6], [12.6, 23.8, 8.6], [14.8, 23.8, 8.6], [17, 32, 6], [19.5, 45, 4.5], [30, 45, 4.5]]),
};
const DOWN = { garner: [7.1, 10.0], ford: [12.6, 14.8] }; // [fall, get up]
const MOEN = 0, RODGERS = 1, GARNER = 2, FORD = 3;
const BALL = [ // who holds or throws the ball, in time order
  { t1: 0, type: 'tee' }, { t1: 2.4, type: 'kick' }, { t1: 3.6, type: 'hold', who: MOEN }, { t1: 3.95, type: 'pass', from: MOEN, to: RODGERS },
  { t1: 4.8, type: 'hold', who: RODGERS }, { t1: 5.15, type: 'pass', from: RODGERS, to: GARNER }, { t1: 6.8, type: 'hold', who: GARNER },
  { t1: 7.15, type: 'pass', from: GARNER, to: RODGERS }, { t1: 9.3, type: 'hold', who: RODGERS }, { t1: 9.6, type: 'pass', from: RODGERS, to: FORD },
  { t1: 12.45, type: 'hold', who: FORD }, { t1: 12.75, type: 'pass', from: FORD, to: MOEN }, { t1: 99, type: 'hold', who: MOEN },
];
const KICK_U = 25 * YD, GOAL_U = 50 * YD, T_BAND = 7.0;
const COL = {
  calJersey: hex(0x0d3b78), calPants: hex(0xe9b63a), calHelmet: hex(0xd9a623),
  stanJersey: hex(0xf3f1ec), stanPants: hex(0xf1efe9), stanHelmet: hex(0x8c1515),
  bandPants: hex(0x1d1d1f), skin: [hex(0xe9bf98), hex(0xc8936a), hex(0x8f5d3d), hex(0xf2cfae), hex(0xb07a52)],
};
function hermite(keys, t, out) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const h = k2[0] - k1[0], s = clamp((t - k1[0]) / h, 0, 1);
  const s2 = s * s, s3 = s2 * s, h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  for (let c = 1; c <= 2; c++) {
    const m1 = k2 === k1 ? 0 : (k2[c] - k0[c]) / Math.max(1e-3, k2[0] - k0[0]), m2 = (k3[c] - k1[c]) / Math.max(1e-3, k3[0] - k1[0]);
    out[c - 1] = h00 * k1[c] + h10 * h * m1 + h01 * k2[c] + h11 * h * m2;
  }
  return out;
}
function jersey(base, trim, pants) { // shoulder pads, TV numbers and a belt, coloured per team
  const g = [vbox(0.5, 0.6, 0.3, 0, 1.24, 0, base), vbox(0.72, 0.17, 0.42, 0, 1.5, 0, base), vbox(0.46, 0.09, 0.29, 0, 0.94, 0, pants),
    vbox(0.2, 0.2, 0.012, 0.0, 1.27, 0.156, trim), vbox(0.24, 0.26, 0.012, 0.0, 1.25, -0.156, trim), vbox(0.012, 0.08, 0.2, 0.361, 1.5, 0, trim), vbox(0.012, 0.08, 0.2, -0.361, 1.5, 0, trim)];
  return merge(g);
}
function buildFigureGeos() {
  const D = 0.12; // dark (gloves, shoes, facemask) — vertex colours multiply the per-instance colour
  const cardinal = hex(0x9e1b1b), white = hex(0xf2f0ea);
  return {
    torsoCal: jersey(hex(0x0d3b78), hex(0xf2b52a), hex(0xe9b63a)), torsoStan: jersey(hex(0xf3f1ec), hex(0x8c1515), hex(0xf1efe9)),
    helmet: merge([vsph(0.158, 0, 1.765, 0, 1, 1, 1.04, 1.12), vbox(0.22, 0.11, 0.05, 0, 1.70, 0.165, D), vbox(0.05, 0.08, 0.06, 0, 1.73, 0.15, D)]),
    blazer: merge([vbox(0.44, 0.6, 0.26, 0, 1.22, 0, cardinal), vbox(0.15, 0.36, 0.02, 0, 1.33, 0.13, white), vbox(0.46, 0.07, 0.27, 0, 0.94, 0, 0.1), vcyl(0.06, 0.07, 0.1, 0, 1.56, 0, hex(0xd8b08a))]),
    face: vsph(0.125, 0, 1.68, 0, 1, 1, 1.08, 1),
    hat: merge([vcyl(0.235, 0.235, 0.02, 0, 1.775, 0, white, 16), vcyl(0.125, 0.145, 0.13, 0, 1.845, 0, white, 14), vcyl(0.147, 0.147, 0.035, 0, 1.8, 0, cardinal, 14)]),
    leg: merge([vbox(0.19, 0.86, 0.22, 0, -0.43, 0), vbox(0.2, 0.09, 0.32, 0, -0.9, 0.05, D)]),
    arm: merge([vbox(0.14, 0.34, 0.15, 0, -0.17, 0), vbox(0.12, 0.3, 0.13, 0, -0.48, 0, 0.95), vbox(0.12, 0.1, 0.13, 0, -0.66, 0, D)]),
    trombone: merge([vbox(0.022, 0.022, 0.9, 0.03, 1.66, 0.55, 1), vbox(0.022, 0.022, 0.9, -0.03, 1.66, 0.55, 1), vbox(0.08, 0.022, 0.022, 0, 1.66, 1.0),
      vbox(0.02, 0.02, 0.42, 0.07, 1.74, 0.3), vcone(0.11, 0.3, 0.07, 1.74, 0.62, 1, 12, Math.PI / 2), vbox(0.02, 0.1, 0.02, 0.07, 1.7, 0.1)]),
    sousa: merge([paint(tf(new THREE.TorusGeometry(0.36, 0.07, 8, 20), 0, 1.32, 0.02, Math.PI / 2 - 0.4, 0, 0.55), 1), vcone(0.36, 0.45, 0.06, 2.12, 0.28, 1, 18, 1.25), vcyl(0.075, 0.075, 0.62, 0.06, 1.8, 0.04, 1, 8, 0.3), vbox(0.06, 0.06, 0.2, 0, 1.64, 0.12, 1)]),
    drum: merge([vcyl(0.24, 0.24, 0.28, 0, 1.0, 0.3, 1, 16), vcyl(0.245, 0.245, 0.04, 0, 1.13, 0.3, cardinal, 16), vcyl(0.245, 0.245, 0.04, 0, 0.87, 0.3, cardinal, 16)]),
    horn: merge([vbox(0.05, 0.05, 0.42, 0, 1.64, 0.32, 1), vcone(0.11, 0.18, 0, 1.64, 0.6, 1, 12, Math.PI / 2), vbox(0.09, 0.09, 0.16, 0, 1.58, 0.28, 1)]),
    ball: merge([paint(tf(new THREE.SphereGeometry(0.13, 12, 8), 0, 0, 0, 0, 0, 0, 1, 1, 1.65), hex(0x7a4321)), vbox(0.02, 0.012, 0.12, 0, 0.128, 0, 0.95)]),
    star: (() => { const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 0.1 : 0.24; k ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      return paint(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false }).translate(0, 0, -0.025), hex(0xffd84a)); })(),
    ring: paint(tf(new THREE.RingGeometry(1.0, 1.16, 40), 0, 0, 0, -Math.PI / 2), 1),
  };
}

class ThePlay {
  constructor({ scene, setupMaterials, M, quality }) {
    this.root = new THREE.Group(); this.root.name = 'bigGame:thePlay'; this.root.visible = false; scene.add(this.root);
    this.setupMaterials = setupMaterials; this.ready = false; this.active = false; this.T = T0; this.events = []; this.lastFar = 0;
    const G = buildFigureGeos();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.02, name: 'bg:figure' });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf0c75a, roughness: 0.34, metalness: 0.65, name: 'bg:brass' });
    const drumM = new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xf4f2ee, roughness: 0.5, name: 'bg:drum' });
    const starM = new THREE.MeshBasicMaterial({ vertexColors: true, name: 'bg:star' });
    // cast: 4 scripted Cal ball carriers + 6 Cal blockers, 11 Stanford, 36 band members (one of them holds a trombone)
    const r = rng(1982); this.r = r;
    this.cal = []; this.stan = []; this.band = [];
    const N_BAND = 36;
    this.nP = 21; this.nB = N_BAND;
    const inst = (geo, material, n, shadow = true) => { const m = new THREE.InstancedMesh(geo, material, n); m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.root.add(m); return m; };
    this.mTorsoC = inst(G.torsoCal, mat, 10); this.mTorsoS = inst(G.torsoStan, mat, 11); this.mHelmet = inst(G.helmet, mat, this.nP);
    this.mBlazer = inst(G.blazer, mat, N_BAND); this.mFace = inst(G.face, mat, N_BAND); this.mHat = inst(G.hat, mat, N_BAND);
    this.mLeg = inst(G.leg, mat, 2 * (this.nP + N_BAND)); this.mArm = inst(G.arm, mat, 2 * (this.nP + N_BAND));
    this.mBall = new THREE.Mesh(G.ball, mat); this.mBall.castShadow = true; this.root.add(this.mBall);
    this.mStar = inst(G.star, starM, 3, false);
    // broadcast-style telestrator ring under whoever has the ball (it's a replay, after all)
    this.mRing = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xfdb515, transparent: true, opacity: 0.85, depthWrite: false, name: 'bg:ring', polygonOffset: true, polygonOffsetFactor: -4 })); this.mRing.renderOrder = 1; this.root.add(this.mRing);
    // figures
    const mk = (o) => Object.assign({ x: 0, z: 0, vx: 0, vz: 0, yaw: 0, ph: r() * TAU, state: 'stand', st: 0, fall: 1, speed: 0, look: null, eng: null, jump: r() * TAU }, o);
    for (const name of ['moen', 'rodgers', 'garner', 'ford']) this.cal.push(mk({ team: 'cal', track: TRACK[name], name }));
    const calB = [[13, -14], [13, -19], [13, 5], [13, 14], [3, -9], [3, 9]]; // blockers (u yards, w)
    calB.forEach(([u, w], k) => this.cal.push(mk({ team: 'cal', role: 'B' + (k + 1), x0: u * YD, z0: w })));
    const stW = [0, -8.5, -4, 4, 8.5, -13, 13, 17.5, 22, -17.5, -22];
    const stRole = ['K', 'G', 'G', 'G', 'G', 'G', 'F', 'F', 'F', 'B9', 'B10'];
    stW.forEach((w, k) => this.stan.push(mk({ team: 'stan', role: stRole[k], k, x0: KICK_U + (k === 0 ? 7.5 : 4.5), z0: k === 0 ? -0.5 : w, vmax: 6.4 + r() * 0.9 })));
    const instr = ['trombone', 'trombone', 'trombone', 'trombone', 'trombone', 'sousa', 'sousa', 'sousa', 'sousa', 'drum', 'drum', 'drum', 'drum', 'drum'];
    const COLS = [-15.75, -12.25, -8.75, -5.25, 5.25, 8.75, 12.25, 15.75];
    for (let k = 0; k < N_BAND; k++) {
      const row = Math.floor(k / 8), col = row < 4 ? k % 8 : 2 + (k % 8);
      this.band.push(mk({ team: 'band', k, x0: 57.8 + row * 1.8 + (r() - 0.5) * 0.4, z0: COLS[col] + (r() - 0.5) * 0.8, skin: COL.skin[(r() * COL.skin.length) | 0], instr: instr[k] || 'horn',
        tx: 27 + r() * 22, tz: -21 + r() * 42, delay: r() * 0.9, sp: 4.2 + r() * 1.4 }));
    }
    // shuffle instruments; Gary Tyrrell is the front-row trombonist nearest Moen's path (w ≈ +5)
    for (let k = this.band.length - 1; k > 0; k--) { const j = (r() * (k + 1)) | 0; const t = this.band[k].instr; this.band[k].instr = this.band[j].instr; this.band[j].instr = t; }
    let ty = this.band[0], bd = 1e9; for (const b of this.band) { const d = Math.hypot(b.x0 - 57.8, b.z0 - 5.25); if (d < bd) { bd = d; ty = b; } }
    const swap = this.band.find((b) => b.instr === 'trombone'); if (swap && swap !== ty) { swap.instr = ty.instr; } ty.instr = 'trombone'; ty.tyrrell = true; this.tyrrell = ty;
    const cnt = {}; for (const b of this.band) cnt[b.instr] = (cnt[b.instr] || 0) + 1;
    this.mInstr = { trombone: inst(G.trombone, gold, cnt.trombone), sousa: inst(G.sousa, gold, cnt.sousa || 1), horn: inst(G.horn, gold, cnt.horn || 1), drum: inst(G.drum, drumM, cnt.drum || 1) };
    for (const b of this.band) { b.slot = (this.mInstr[b.instr].userData.n = (this.mInstr[b.instr].userData.n || 0) + 1) - 1; }
    // instance colours
    const c = new THREE.Color(), setC = (m, i, rgb) => m.setColorAt(i, c.setRGB(rgb[0], rgb[1], rgb[2]));
    this.players = [...this.cal, ...this.stan]; this.all = [...this.players, ...this.band];
    this.players.forEach((f, i) => { const cal = f.team === 'cal'; setC(cal ? this.mTorsoC : this.mTorsoS, cal ? i : i - 10, [1, 1, 1]); setC(this.mHelmet, i, cal ? COL.calHelmet : COL.stanHelmet);
      for (const s of [0, 1]) { setC(this.mLeg, 2 * i + s, cal ? COL.calPants : COL.stanPants); setC(this.mArm, 2 * i + s, cal ? COL.calJersey : COL.stanJersey); } });
    this.band.forEach((b, j) => { const i = this.nP + j; setC(this.mBlazer, j, [1, 1, 1]); setC(this.mFace, j, b.skin); setC(this.mHat, j, [1, 1, 1]);
      for (const s of [0, 1]) { setC(this.mLeg, 2 * i + s, COL.bandPants); setC(this.mArm, 2 * i + s, hex(0x9e1b1b)); } });
    for (const m of [this.mStar]) for (let i = 0; i < 3; i++) setC(m, i, [1, 1, 1]);
    for (const m of [this.mTorsoC, this.mTorsoS, this.mHelmet, this.mBlazer, this.mFace, this.mHat, this.mLeg, this.mArm, this.mStar]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
    this.trombone = null; this.lowQ = quality === 'low';
    this.reset();
  }
  attach(st) { // st = the loaded memorial-stadium landmark record
    const a = st.packetAnchor, yF = (st.res && st.res.debug && Number.isFinite(st.res.debug.yF)) ? st.res.debug.yF : -1.42;
    this.root.position.set(FCW[0], a.y + yF, FCW[1]); this.root.rotation.y = -Math.atan2(AX[1], AX[0]);
    // replay video boards (16.6 x 9.4 m screens, centred 34.1 m above the stadium anchor like the stadium's own)
    this.ready = true; if (this.boardTex) return;
    this.boardTex = canvasTex(1024, 512, () => {}); this.boardCanvas = this.boardTex.image;
    const bm = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveMap: this.boardTex, emissiveIntensity: 0.95, roughness: 0.4, name: 'bg:board', polygonOffset: true, polygonOffsetFactor: -2 });
    // memorial-stadium.js's board slabs run along the field axis (17.6 m long, front end at |u| = 106.7), so the
    // replay screen is mounted on the slab's field end, facing the field.
    const frameM = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6, metalness: 0.3, name: 'bg:boardFrame' });
    for (const sgn of [1, -1]) {
      const g = new THREE.PlaneGeometry(16.6, 9.4); g.rotateY(sgn > 0 ? -Math.PI / 2 : Math.PI / 2);
      const m = new THREE.Mesh(g, bm); m.position.set(sgn * 114.5, 34.1 - yF, -0.6); /* integration: stadium boards fixed to face the field; screen face at |u| = 114.69 */ m.name = 'bigGame:board'; this.root.add(m);
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10.4, 17.6), frameM); f.position.set(sgn * 114.8, 34.1 - yF, -0.6); f.name = 'bigGame:boardFrame'; f.castShadow = true; this.root.add(f);
    }
    this.boardKey = ''; this.drawBoard('pre');
    this.root.updateMatrixWorld(true);
    this.setupMaterials && this.setupMaterials(this.root);
    this.ready = true;
  }
  reset() {
    this.T = T0; this.events.length = 0; this.fired = {}; this.tHit = null; this.tTD = null;
    for (const f of this.all) { f.x = f.x0 ?? 0; f.z = f.z0 ?? 0; f.vx = f.vz = 0; f.state = 'stand'; f.st = T0; f.eng = null; f.yaw = f.team === 'stan' || f.team === 'band' ? -Math.PI / 2 : Math.PI / 2; f.speed = 0; f.squash = 0; }
    for (const f of this.cal) if (f.track) { const p = hermite(f.track, T0, [0, 0]); f.x = p[0]; f.z = p[1]; }
    this.trombone = null;
  }
  seek(t) { this.reset(); const dt = 1 / 30; while (this.T < t - 1e-6) this.step(Math.min(dt, t - this.T), true); }
  laterals(T) { let n = 0; for (const b of BALL) if (b.type === 'pass' && T >= b.t1 - 0.3) n++; return n; }
  carrierAt(T) { // index of the Cal player who has (or is about to receive) the ball
    for (const b of BALL) if (T < b.t1) return b.type === 'hold' ? b.who : b.type === 'pass' ? b.to : MOEN;
    return MOEN;
  }
  step(dt, silent = false) {
    const T0_ = this.T, T = (this.T += dt);
    const cal = this.cal, stan = this.stan, band = this.band, moen = cal[MOEN];
    // --- scripted Cal ball carriers
    const tmp = [0, 0];
    for (let i = 0; i < 4; i++) {
      const f = cal[i]; hermite(f.track, T, tmp); const nx = tmp[0], nz = tmp[1];
      f.vx = (nx - f.x) / dt; f.vz = (nz - f.z) / dt; f.x = nx; f.z = nz;
      const dn = DOWN[f.name];
      if (dn && T >= dn[0] && T < dn[1]) { if (f.state !== 'down') { f.state = 'down'; f.st = T; f.fall = 1; } f.vx = f.vz = 0; }
      else if (T >= 16.4 && (i === MOEN || T > 17.2)) { if (f.state !== 'cheer') { f.state = 'cheer'; f.st = T; } }
      else if (f.state === 'down') { f.state = 'run'; f.st = T; } else f.state = T < 0.4 ? 'stand' : 'run';
    }
    const ci = this.carrierAt(T), car = cal[ci];
    const leadX = car.x + car.vx * 0.35, leadZ = car.z + car.vz * 0.35;
    // --- events
    const ev = (k, at) => { if (!this.fired[k] && T >= at) { this.fired[k] = true; if (!silent) this.events.push(k); } };
    ev('kick', 0); ev('band', T_BAND);
    if (this.tTD == null && moen.x >= GOAL_U && T > 12.8) { this.tTD = T; if (!silent) this.events.push('td'); }
    const ty = this.tyrrell;
    if (this.tHit == null && T > 15 && Math.hypot(moen.x - ty.x, moen.z - ty.z) < 0.95) {
      this.tHit = T; ty.state = 'flat'; ty.st = T; ty.yaw = Math.atan2(moen.vx, moen.vz) + Math.PI; if (!silent) this.events.push('flat');
      const fx = Math.sin(ty.yaw), fz = Math.cos(ty.yaw); // the trombone flies up and lands by his right hand
      this.trombone = { x: ty.x, y: 1.6, z: ty.z, vx: -fz * 1.5 - fx * 0.7, vy: 5.6, vz: fx * 1.5 - fz * 0.7, rx: 0, ry: ty.yaw, rz: 0, w: 9, landed: false };
    }
    // --- Cal blockers
    for (let i = 4; i < cal.length; i++) {
      const f = cal[i]; if (T < 0) { f.state = 'stand'; continue; }
      if (T >= (this.tTD ?? 99) + 0.6) { this.seekTo(f, moen.x - 2.5 + (i % 3) * 1.6, moen.z + ((i % 2) ? 2.6 : -2.6) * (1 + (i % 3) * 0.4), 6.5, dt, 1.0); f.state = f.speed < 0.6 ? 'cheer' : 'run'; continue; }
      if (f.eng) { this.pairStep(f, f.eng, dt, car); continue; }
      const tgt = f.role === 'B1' ? stan[9] : f.role === 'B2' ? stan[10] : null;
      if (tgt && T < (f.role === 'B1' ? 6.5 : 9.0) && tgt.state !== 'down') {
        this.seekTo(f, tgt.x, tgt.z, 7.0, dt, 0); if (Math.hypot(tgt.x - f.x, tgt.z - f.z) < 1.15) { f.eng = tgt; tgt.eng = f; f.state = tgt.state = 'block'; }
        continue;
      }
      const side = (f.role === 'B3' || f.role === 'B5') ? -1 : 1, far = (f.role === 'B5' || f.role === 'B6') ? 1 : 0;
      const ahead = T > 12.7 ? 7 + far * 4 : 4 + far * 2.5;
      this.seekTo(f, leadX + ahead, leadZ + side * (3 + far * 3), 7.2, dt, 0.4); f.state = 'run';
    }
    // --- Stanford coverage
    for (const f of stan) {
      if (f.state === 'down') { if (f.up && T >= f.up) { f.state = 'dejected'; f.st = T; } else { f.vx = f.vz = 0; continue; } }
      if (T < 0) { // jog up to the ball with the kicker
        const tx = KICK_U + (f.k === 0 ? 0.3 : 0.6), sp = f.k === 0 ? 3.0 : 1.6; this.seekTo(f, tx, f.z0, sp, dt, 0); f.state = 'run'; f.yaw = -Math.PI / 2; continue;
      }
      if (this.tTD != null && T > this.tTD + 0.3) { // too late
        if (f.state !== 'dejected') { f.state = 'dejected'; f.st = T; }
        this.seekTo(f, f.x + f.vx * 0.2, f.z + f.vz * 0.2, 1.2, dt, 0); continue;
      }
      if (f.role === 'B9' && T > 6.5 && !f.done) { f.done = true; if (f.eng) { f.eng.eng = null; f.eng.state = 'run'; f.eng = null; } f.state = 'down'; f.st = T; f.fall = -1; f.up = 99; continue; }
      if (f.eng) { if (f.role === 'B10' && T > 9.0) { const b = f.eng; f.eng = null; b.eng = null; f.state = 'run'; b.state = 'run'; } else continue; }
      let tx = leadX, tz = leadZ, vmax = f.vmax * (T < 2.5 ? 0.62 : 1), R = 0, ang = f.k * 2.1;
      if (f.role === 'K') {
        if (T < 13.45) { tx = leadX + 5.5; tz = clamp(leadZ, -20, 20); vmax = 5.6; }
        else if (!f.dove) { f.dove = true; f.state = 'dive'; f.st = T; const p = hermite(TRACK.moen, 13.95, [0, 0]); f.dx = p[0]; f.dz = p[1] - 1.1; }
        if (f.dove) { if (T - f.st > 0.38) { if (f.state !== 'down') { f.state = 'down'; f.st = T; f.fall = 1; f.up = 16.6; } continue; } tx = f.dx; tz = f.dz; vmax = 7.5; }
      } else if (f.role === 'G') {
        const victim = T < 5.15 ? null : cal[GARNER];
        R = victim ? 0.95 + 4.5 * (1 - sstep(5.2, 6.55, T)) : 5.5; if (victim) { tx = victim.x; tz = victim.z; }
        const gi = f.k - 1; ang = (gi - 2) * 0.88;
        if (T >= 7.1 && !f.done) { f.done = true; if (gi < 3) { f.state = 'down'; f.st = T + gi * 0.07; f.fall = 1; f.up = 10.6 + gi * 0.35; } else { f.state = 'party'; f.st = T; } }
        if (f.state === 'party') { if (T < 9.4) { f.vx *= 0.8; f.vz *= 0.8; continue; } f.state = 'run'; vmax = 5.2; R = 3; }
        if (f.state === 'dejected') { vmax = 4.4; R = 3.5; }
      } else if (f.role === 'F') {
        const victim = T < 9.6 ? null : cal[FORD]; const fi = f.k - 6; ang = (fi - 1) * 0.75;
        R = victim ? 0.8 + 5.2 * (1 - sstep(10.7, 12.25, T)) : 6; if (victim) { tx = victim.x + victim.vx * 0.15; tz = victim.z + victim.vz * 0.15; }
        if (T >= 12.55 + fi * 0.06 && !f.done) { f.done = true; f.state = 'down'; f.st = T; f.fall = 1; f.up = 15.6 + fi * 0.4; continue; }
        if (f.state === 'dejected') { vmax = 4.2; R = 4; }
      } else if (f.role === 'B9' || f.role === 'B10') { if (T > 12.75 && f.role === 'B10') { vmax = 7.55; tx = moen.x; tz = moen.z; } R = f.role === 'B9' ? 3 : 0; }
      const commit = (f.role === 'G' && T > 5.4 && T < 7.2) || (f.role === 'F' && T > 10.9 && T < 12.6);
      if (commit) { // close in from wherever you are: hit him from your own side of the pile
        const v = f.role === 'G' ? cal[GARNER] : cal[FORD], dx = f.x - v.x, dz = f.z - v.z, dd = Math.hypot(dx, dz) || 1;
        if (dd < 4.5) { const k = sstep(4.5, 1.0, dd); tx = v.x + v.vx * 0.12; tz = v.z + v.vz * 0.12; const rx = Math.cos(ang) * R * (1 - k) + dx / dd * 0.62 * k, rz = Math.sin(ang) * R * (1 - k) + dz / dd * 0.62 * k; this.seekTo(f, tx + rx, tz + rz, vmax * 1.1, dt, 0); }
        else this.seekTo(f, tx + Math.cos(ang) * R, tz + Math.sin(ang) * R, vmax * 1.1, dt, 0);
      } else this.seekTo(f, tx + Math.cos(ang) * R, tz + Math.sin(ang) * R, vmax, dt, 0.25);
      if (f.state !== 'dive' && f.state !== 'dejected') f.state = 'run';
      if (commit) { const v = f.role === 'G' ? cal[GARNER] : cal[FORD]; if (Math.hypot(v.x - f.x, v.z - f.z) < 1.7) { f.state = 'tackle'; f.look = v; } }
    }
    // --- band
    for (const b of band) {
      if (b.state === 'flat') { b.vx = b.vz = 0; continue; }
      if (T < T_BAND + b.delay) { b.state = 'play'; b.yaw = -Math.PI / 2; b.vx = b.vz = 0; continue; }
      if (b.tyrrell) { this.seekTo(b, 48.9, 3.9, 1.7, dt, 0); b.state = b.speed > 0.3 ? 'walk' : 'play'; if (b.speed <= 0.3) b.yaw = -Math.PI / 2; continue; }
      if (this.tTD != null && T > this.tTD + 0.4) { this.seekTo(b, b.x, b.z, 2, dt, 0); b.state = 'stand'; b.look = moen; continue; }
      const dx = b.x - moen.x, dz = b.z - moen.z, dm = Math.hypot(dx, dz);
      if (T > 12.6 && dm < 6.5 && (dx * moen.vx + dz * moen.vz) > -2) { // get out of the way
        const sp = Math.hypot(moen.vx, moen.vz) || 1, px = -moen.vz / sp, pz = moen.vx / sp, sgn = (dx * px + dz * pz) >= 0 ? 1 : -1;
        this.seekTo(b, b.x + px * sgn * 4, b.z + pz * sgn * 4, 6.0, dt, 0); b.state = 'flee'; continue;
      }
      this.seekTo(b, b.tx, b.tz, b.sp, dt, 0.4); b.state = b.speed > 0.5 ? 'rush' : 'cheer';
    }
    // --- separation (keeps the unscripted crowd from overlapping)
    const A = this.all;
    for (let i = 0; i < A.length; i++) {
      const a = A[i]; if (a.track || a.state === 'down' || a.state === 'flat') continue;
      for (let j = 0; j < A.length; j++) {
        if (i === j) continue; const b = A[j]; let bx = b.x, bz = b.z, rr = a.eng === b || a.state === 'tackle' ? 0.55 : 0.85;
        if (b.state === 'flat' || b.state === 'down') { const back = b.state === 'flat' ? -0.9 : 0.95; bx += Math.sin(b.yaw) * back; bz += Math.cos(b.yaw) * back; rr = b.state === 'flat' ? (a.track ? 0 : 1.9) : (a.team !== b.team && T - b.st < 1.2 ? 0.5 : 1.0); }
        const dx = a.x - bx, dz = a.z - bz, d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), push = (rr - d) * (b.track ? 1 : 0.5); a.x += dx / d * push; a.z += dz / d * push; }
      }
    }
    // trombone flight
    const tb = this.trombone;
    if (tb && !tb.landed) { tb.vy -= 9.8 * dt; tb.x += tb.vx * dt; tb.y += tb.vy * dt; tb.z += tb.vz * dt; tb.rx += tb.w * dt; tb.rz += tb.w * 0.6 * dt; if (tb.y <= 0.1 && tb.vy < 0) { tb.y = 0.1; tb.landed = true; tb.rx = 0; tb.rz = 1.45; tb.ry += 0.6; } }
    for (const f of A) { if (f.state === 'down' || f.state === 'flat') { f.speed = 0; continue; } f.speed = Math.hypot(f.vx, f.vz); f.ph += f.speed * dt * 2.6; if (f.state === 'tackle' && f.look) { const ty2 = Math.atan2(f.look.x - f.x, f.look.z - f.z); let dy = ty2 - f.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); f.yaw += dy * Math.min(1, dt * 12); } else if (f.speed > 0.4) { const ty2 = Math.atan2(f.vx, f.vz); let dy = ty2 - f.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); f.yaw += dy * Math.min(1, dt * 10); } else if (f.look) { const ty2 = Math.atan2(f.look.x - f.x, f.look.z - f.z); let dy = ty2 - f.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); f.yaw += dy * Math.min(1, dt * 4); } }
    if (T >= T_END) this.reset();
    return T0_;
  }
  seekTo(f, tx, tz, vmax, dt, slow) {
    const dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz);
    const want = d < 0.05 ? 0 : Math.min(vmax, d * (slow ? 2.2 : 6));
    const wx = d > 1e-4 ? dx / d * want : 0, wz = d > 1e-4 ? dz / d * want : 0;
    const k = Math.min(1, dt * 6); f.vx += (wx - f.vx) * k; f.vz += (wz - f.vz) * k; f.x += f.vx * dt; f.z += f.vz * dt;
  }
  pairStep(b, s, dt, car) { // a block: the pair drifts away from the ball carrier
    let dx = s.x - car.x, dz = s.z - car.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    const cx = (b.x + s.x) / 2 + dx * 0.9 * dt, cz = (b.z + s.z) / 2 + dz * 0.9 * dt;
    b.x = cx - dx * 0.5; b.z = cz - dz * 0.5; s.x = cx + dx * 0.5; s.z = cz + dz * 0.5; b.vx = s.vx = dx * 0.9; b.vz = s.vz = dz * 0.9;
    b.yaw = Math.atan2(dx, dz); s.yaw = b.yaw + Math.PI; b.state = s.state = 'block'; b.ph += dt * 5; s.ph += dt * 5;
  }
  // ---------------------------------------------------------------- pose → instance matrices
  pose(f, B) {
    const T = this.T, st = f.state;
    let y = 0, lean = 0, fallA = 0, legA = Math.min(0.9, f.speed * 0.13), armA = legA * 0.9, armUp = 0, spread = 0.08, squash = 0, armFwd = 0;
    if (st === 'run' || st === 'walk' || st === 'rush' || st === 'dejected') lean = Math.min(0.3, f.speed * 0.04);
    if (st === 'rush') { armUp = 0.9; spread = 0.3; armA *= 0.25; }
    if (st === 'dejected') { lean = 0.28; legA *= 0.6; armA *= 0.4; }
    if (st === 'cheer' || st === 'party') { y = Math.abs(Math.sin(T * 7 + f.jump)) * 0.32; armUp = 1; spread = 0.35 + 0.15 * Math.sin(T * 7 + f.jump); legA = 0.15; armA = 0; }
    if (st === 'flee') { armUp = 0.8; spread = 0.5 + 0.4 * Math.sin(T * 17 + f.jump); }
    if (st === 'block') { lean = 0.38; armFwd = 1; legA = 0.35; armA = 0; }
    if (st === 'tackle') { lean = 0.62; armFwd = 1; legA = 0.45; armA = 0.15; spread = 0.25; }
    if (st === 'stand' && f.team !== 'band') { lean = 0.16; y = -0.03; legA = 0.12; armFwd = 0.25; armA = 0; } // ready stance
    if (st === 'play') { y = 0; lean = -0.04 + 0.03 * Math.sin(T * 3.1 + f.jump); }
    if (st === 'dive') { lean = sstep(0, 0.38, T - f.st) * 1.2; armFwd = 1; }
    if (f.name === 'moen' && T > 11.9 && T < 12.8) { armFwd = 0.75; armA *= 0.3; spread = 0.3; }
    let kick = 0; if (f.role === 'K' && T > -0.12 && T < 0.45) { const k = Math.sin(clamp((T + 0.12) / 0.57, 0, 1) * Math.PI); lean = -0.12 * k; legA = 0; armA = 0; spread = 0.5 * k; armFwd = 0; kick = 1.35 * k; }
    if (st === 'down') { const k = sstep(0, 0.32, T - f.st); fallA = f.fall * k * Math.PI / 2; y = 0.16 * k; legA = 0; armA = 0; armFwd = f.fall > 0 ? 1 : 0; }
    if (st === 'flat') { const k = sstep(0, 0.22, T - f.st); fallA = -k * Math.PI / 2; y = 0.07 * k; squash = k; legA = 0; armA = 0; spread = 1.1 * k; f.splay = k; }
    // base: T(x,y,z) · Ry(yaw) · Rx(fall, about the feet) · T(0, lift) · Rx(lean about the hips) · S(squash)
    B.makeRotationY(f.yaw).setPosition(f.x, y, f.z);
    if (fallA) B.multiply(_m4.makeRotationX(fallA));
    if (lean) { B.multiply(_m4.makeTranslation(0, 0.95, 0)).multiply(_m4.makeRotationX(lean)).multiply(_m4.makeTranslation(0, -0.95, 0)); }
    if (squash) B.multiply(_m4.makeScale(1 + 0.9 * squash, 1 + 0.1 * squash, 1 - 0.83 * squash));
    const s = Math.sin(f.ph);
    return { legA: legA * s, armA: -armA * s, armUp, spread, armFwd, kick };
  }
  render() {
    const B = new THREE.Matrix4(), M = new THREE.Matrix4(), R = new THREE.Matrix4();
    const limb = (mesh, idx, B, x, y, swing, roll, up, fwd, yawIn = 0) => {
      M.copy(B).multiply(_m4.makeTranslation(x, y, 0));
      if (yawIn) M.multiply(R.makeRotationY(x > 0 ? -yawIn : yawIn));
      if (roll) M.multiply(R.makeRotationZ(up > 0.5 ? -roll : roll));
      const a = up ? -Math.PI + 0.25 + (1 - up) * 1.5 : fwd ? (-Math.PI / 2 + 0.15) * fwd : 0;
      M.multiply(R.makeRotationX(a - swing)); mesh.setMatrixAt(idx, M);
    };
    this.all.forEach((f, i) => {
      const p = this.pose(f, B), band = f.team === 'band';
      if (band) { const j = i - this.nP; this.mBlazer.setMatrixAt(j, B); this.mFace.setMatrixAt(j, B); this.mHat.setMatrixAt(j, B); }
      else { if (i < 10) this.mTorsoC.setMatrixAt(i, B); else this.mTorsoS.setMatrixAt(i - 10, B); this.mHelmet.setMatrixAt(i, B); }
      const sx = band ? 0.27 : 0.33, hx = 0.12;
      const lr = 0.04 + (f.splay || 0) * 0.45; limb(this.mLeg, 2 * i, B, hx, 0.95, p.legA, lr, 0, 0); limb(this.mLeg, 2 * i + 1, B, -hx, 0.95, p.kick ? p.kick : -p.legA, -lr, 0, 0);
      const playing = band && (f.state === 'play' || f.state === 'walk');
      if (band && f.state === 'stand') { limb(this.mArm, 2 * i, B, sx, 1.5, 0, 0.1, 0, 0.45); limb(this.mArm, 2 * i + 1, B, -sx, 1.5, 0, -0.1, 0, 0.45); }
      else if (playing) { limb(this.mArm, 2 * i, B, sx, 1.5, -0.12, 0, 0, 1, 0.42); limb(this.mArm, 2 * i + 1, B, -sx, 1.5, -0.12, 0, 0, 1, 0.42); }
      else { limb(this.mArm, 2 * i, B, sx, 1.5, p.armA, p.spread, p.armUp, p.armFwd); limb(this.mArm, 2 * i + 1, B, -sx, 1.5, -p.armA, -p.spread, p.armUp, p.armFwd); }
      if (band) { // instrument: at the mouth while playing, waved overhead when cheering, flying if you are Gary Tyrrell
        const im = this.mInstr[f.instr];
        if (f.tyrrell && this.trombone) { const t = this.trombone; M.compose(_v.set(t.x, t.y, t.z), _q.setFromEuler(_e.set(t.rx, t.ry, t.rz)), _s.set(1, 1, 1)).multiply(_m4.makeTranslation(0, -1.68, -0.5)); } // pivot on its middle
        else { M.copy(B); if (!playing && f.instr !== 'drum' && f.instr !== 'sousa') M.multiply(f.state === 'stand' ? _m4.makeTranslation(0, -0.62, -0.12) : _m4.makeTranslation(0, 0.62 + 0.08 * Math.sin(this.T * 7 + f.jump), -0.22)); }
        im.setMatrixAt(f.slot, M);
      }
    });
    // ball
    const T = this.T; let bx = 0, by = 0, bz = 0, byaw = 0, bpitch = 0;
    let seg = 0, tPrev = T0; while (seg < BALL.length - 1 && T >= BALL[seg].t1) { tPrev = BALL[seg].t1; seg++; }
    const b = BALL[seg], hand = (f) => { const up = f.state === 'cheer' ? 2.26 : 1.15; return [f.x + Math.sin(f.yaw) * 0.32, up, f.z + Math.cos(f.yaw) * 0.32]; };
    if (b.type === 'tee') { bx = KICK_U; by = 0.14; bz = 0; byaw = 0; bpitch = -Math.PI / 2 + 0.3; }
    else if (b.type === 'kick') { // squib: three skips from the kick to Moen's arms at the Cal 45
      const pts = [[KICK_U, 0.14, 0], [15 * YD, 0.12, -0.3], [5 * YD, 0.1, -0.6], [-5 * YD + 0.3, 1.0, -1]], hs = [1.5, 0.95, 0.75];
      const k = clamp((T - 0) / 2.4, 0, 0.9999) * 3, j = Math.floor(k), s = k - j, a = pts[j], c = pts[j + 1];
      bx = a[0] + (c[0] - a[0]) * s; bz = a[2] + (c[2] - a[2]) * s; by = a[1] + (c[1] - a[1]) * s + 4 * hs[j] * s * (1 - s); byaw = Math.PI / 2; bpitch = T * 14;
    } else if (b.type === 'hold') { const h = hand(this.cal[b.who]); bx = h[0]; by = h[1]; bz = h[2]; byaw = this.cal[b.who].yaw; }
    else { const a = hand(this.cal[b.from]), c = hand(this.cal[b.to]), s = clamp((T - tPrev) / (b.t1 - tPrev), 0, 1); bx = a[0] + (c[0] - a[0]) * s; bz = a[2] + (c[2] - a[2]) * s; by = a[1] + (c[1] - a[1]) * s + 2.0 * s * (1 - s); byaw = Math.atan2(c[0] - a[0], c[2] - a[2]); bpitch = s * 9; }
    this.mBall.position.set(bx, by, bz); this.mBall.rotation.set(bpitch, byaw, 0, 'YXZ');
    // cartoon stars over the flattened trombonist
    const ty = this.tyrrell, on = this.tHit != null && T - this.tHit > 0.35;
    for (let k = 0; k < 3; k++) {
      const a = T * 3.4 + k * TAU / 3, hx = ty.x - Math.sin(ty.yaw) * 1.9, hz = ty.z - Math.cos(ty.yaw) * 1.9;
      M.compose(_v.set(hx + Math.cos(a) * 0.55, on ? 0.95 + 0.12 * Math.sin(a * 2) : -50, hz + Math.sin(a) * 0.55), _q.setFromEuler(_e.set(0, a * 1.5, 0)), _s.set(1, 1, 1)); this.mStar.setMatrixAt(k, M);
    }
    // telestrator ring: under the ball carrier (or the receiver while a lateral is in the air) until the touchdown
    const ci = this.carrierAt(T), cf = this.cal[ci], showRing = T > 2.2 && (this.tTD == null || T < this.tTD + 1.0);
    this.mRing.visible = showRing; if (showRing) { this.mRing.position.set(cf.x, 0.04, cf.z); const s = 1 + 0.08 * Math.sin(T * 6); this.mRing.scale.set(s, 1, s); }
    for (const m of [this.mTorsoC, this.mTorsoS, this.mHelmet, this.mBlazer, this.mFace, this.mHat, this.mLeg, this.mArm, this.mStar, ...Object.values(this.mInstr)]) m.instanceMatrix.needsUpdate = true;
    this.updateBoard();
  }
  // ---------------------------------------------------------------- video boards
  updateBoard() {
    const T = this.T; let key;
    if (T < 0) key = 'pre';
    else if (T < 3.6) key = 'clock' + Math.max(0, Math.ceil(4 - T));
    else if (T < T_BAND) key = 'lat' + Math.max(1, this.laterals(T));
    else if (this.tTD == null || T < this.tTD) key = (((T * 2.8) | 0) % 2 ? 'bandA' : 'bandB') + this.laterals(T);
    else if (T < this.tTD + 2.4) key = ((T * 3) | 0) % 2 ? 'tdA' : 'tdB';
    else if (T < 21.0) key = 'final';
    else if (T < 23.6) key = 'beat';
    else key = 'replay';
    if (key !== this.boardKey) this.drawBoard(key);
  }
  drawBoard(key) {
    this.boardKey = key; const c = this.boardCanvas.getContext('2d'), w = 1024, h = 512;
    c.fillStyle = '#05080f'; c.fillRect(0, 0, w, h);
    const head = (txt, col = '#fdb515') => { c.fillStyle = '#0b2550'; c.fillRect(0, 0, w, 74); c.fillStyle = col; c.font = 'bold 44px Arial, Helvetica, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, w / 2, 39); };
    const score = (calS, stanS, sub) => {
      head('BIG GAME · NOVEMBER 20, 1982');
      c.textBaseline = 'middle'; c.font = 'bold 66px Arial, Helvetica, sans-serif';
      c.textAlign = 'left'; c.fillStyle = '#8c1515'; c.fillRect(40, 112, 460, 120); c.fillStyle = '#ffffff'; c.fillText('STANFORD', 66, 174);
      c.fillStyle = '#003262'; c.fillRect(40, 250, 460, 120); c.fillStyle = '#fdb515'; c.fillText('CAL', 66, 312);
      c.textAlign = 'right'; c.font = 'bold 150px "Courier New", monospace'; c.fillStyle = '#ffd34d'; c.fillText(String(stanS), 700, 178); c.fillText(String(calS), 700, 316);
      c.textAlign = 'center'; c.font = 'bold 54px Arial, Helvetica, sans-serif'; c.fillStyle = '#ffffff'; c.fillText(sub[0], 870, 150);
      c.font = 'bold 110px "Courier New", monospace'; c.fillStyle = sub[2] || '#ff5a3a'; c.fillText(sub[1], 870, 270);
    };
    const big = (l1, l2, fg, bg, sub) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fg;
      c.font = `bold ${l2 ? 112 : 150}px Arial, Helvetica, sans-serif`; c.fillText(l1, w / 2, l2 ? 180 : 230, w - 60); if (l2) c.fillText(l2, w / 2, 320, w - 60);
      if (sub) { c.font = 'bold 52px Arial, Helvetica, sans-serif'; c.globalAlpha = 0.9; c.fillText(sub, w / 2, 448, w - 80); c.globalAlpha = 1; } };
    if (key === 'pre') score(19, 20, ['4TH QTR', '0:04']);
    else if (key.startsWith('clock')) score(19, 20, ['4TH QTR', '0:0' + key.slice(5), key === 'clock0' ? '#ff3b2f' : '#ff5a3a']);
    else if (key.startsWith('lat')) { score(19, 20, ['4TH QTR', '0:00', '#ff3b2f']); c.fillStyle = '#fdb515'; c.fillRect(0, h - 104, w, 104); c.fillStyle = '#003262'; c.font = 'bold 64px Arial, Helvetica, sans-serif'; c.textAlign = 'center'; c.fillText('LATERAL #' + key.slice(3) + '!', w / 2, h - 50); }
    else if (key.startsWith('bandA')) big('THE BAND IS', 'ON THE FIELD!', '#ffd34d', '#8c1515', 'BALL STILL LIVE · LATERAL #' + key.slice(5));
    else if (key.startsWith('bandB')) big('THE BAND IS', 'ON THE FIELD!', '#8c1515', '#ffd34d', 'BALL STILL LIVE · LATERAL #' + key.slice(5));
    else if (key === 'tdA') big('TOUCHDOWN', 'CAL!', '#fdb515', '#003262');
    else if (key === 'tdB') big('TOUCHDOWN', 'CAL!', '#003262', '#fdb515');
    else if (key === 'final') { score(25, 20, ['FINAL', '0:00', '#ffd34d']); c.fillStyle = '#fdb515'; c.fillRect(0, h - 104, w, 104); c.fillStyle = '#003262'; c.font = 'bold 64px Arial, Helvetica, sans-serif'; c.textAlign = 'center'; c.fillText('THE BEARS HAVE WON!', w / 2, h - 50); }
    else if (key === 'beat') big('BEAT', 'STANFURD', '#fdb515', '#003262', 'GO BEARS');
    else big('INSTANT REPLAY', null, '#ffffff', '#0b2550', 'THE PLAY · 5 LATERALS · 1 TROMBONE');
    // LED grid
    c.fillStyle = 'rgba(0,0,0,0.28)'; for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 1, h); for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
    this.boardTex.needsUpdate = true;
  }
  update(dt, camPos) {
    if (!this.ready) return null;
    const d = Math.hypot(camPos.x - FCW[0], camPos.z - FCW[1]);
    const want = this.active ? d < 560 : d < 480;
    if (want !== this.active) { this.active = want; this.root.visible = want; if (want && performance.now() - this.lastFar > 20000) this.reset(); if (!want) this.lastFar = performance.now(); }
    if (!this.active) return d;
    const sh = d < 260 && !this.lowQ; if (sh !== this._sh) { this._sh = sh; for (const m of this.root.children) if (m.isMesh && !m.name.startsWith('bigGame:board')) m.castShadow = sh; }
    let left = Math.min(dt, 0.1); while (left > 1e-6) { const h = Math.min(left, 1 / 30); this.step(h); left -= h; }
    this.render();
    return d;
  }
}

// ================================================================ 2. THE STANFORD TREE (Harold Lloyd, "Safety Last!", 1923)
class StanfordTree {
  constructor({ scene, setupMaterials }) {
    this.root = new THREE.Group(); this.root.name = 'bigGame:stanfordTree'; this.root.visible = false; scene.add(this.root);
    this.setupMaterials = setupMaterials; this.ready = false; this.hand = null;
    const r = rng(1891), S = 2.0; // cartoon scale: about 6.5 m from branch-tips to sneakers, so it reads from the ground
    const greens = [hex(0x2e8a2c), hex(0x41a035), hex(0x267a26), hex(0x58b340)], brown = hex(0x6b4a2e), white = hex(0xf4f2ec), red = hex(0xc8102e), cardinal = hex(0x8c1515);
    const blob = (x, y, z, rad) => { const g = new THREE.IcosahedronGeometry(rad, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (r() - 0.5) * 0.28; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.translate(x, y, z); return paint(g, greens[(r() * greens.length) | 0]); };
    const tier = (y0, y1, rad, z, col) => { // a lumpy cone tier with a ragged hem
      const g = new THREE.ConeGeometry(rad, y1 - y0, 11, 2, false); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y < -(y1 - y0) * 0.45 ? 1 + (r() - 0.35) * 0.3 : 1 + (r() - 0.5) * 0.12; p.setXYZ(i, p.getX(i) * k, y + (y < -(y1 - y0) * 0.45 ? (r() - 0.5) * 0.12 : 0), p.getZ(i) * k * 0.82); }
      g.translate(0, (y0 + y1) / 2, z); return paint(g, col); };
    const parts = [
      tier(-1.25, -0.42, 0.42, 0.3, greens[3]), tier(-1.75, -0.85, 0.62, 0.3, greens[1]), tier(-2.3, -1.3, 0.8, 0.3, greens[0]), tier(-2.55, -1.85, 0.9, 0.3, greens[2]),
      blob(0, -1.5, 0.38, 0.42), blob(0, -1.95, 0.36, 0.5),
      vsph(0.075, 0.09, 0.0, -0.01, brown, 1, 1, 1, 10), vsph(0.075, -0.09, 0.0, -0.01, brown, 1, 1, 1, 10), // fists around the minute hand
      // branch arms reaching up to the minute hand, with twiggy fingers
      vlink([0.4, -1.1, 0.3], [0.1, -0.04, 0.02], 0.1, 0.065, brown), vlink([-0.4, -1.1, 0.3], [-0.1, -0.04, 0.02], 0.1, 0.065, brown),
      vlink([0.1, -0.04, 0.02], [0.2, 0.1, -0.06], 0.035, 0.02, brown), vlink([0.1, -0.04, 0.02], [0.03, 0.12, -0.08], 0.035, 0.02, brown),
      vlink([-0.1, -0.04, 0.02], [-0.2, 0.1, -0.06], 0.035, 0.02, brown), vlink([-0.1, -0.04, 0.02], [-0.03, 0.12, -0.08], 0.035, 0.02, brown),
      // googly eyes and a big goofy grin
      vsph(0.175, 0.19, -1.3, 0.74, white, 1, 1, 0.7, 16), vsph(0.175, -0.19, -1.3, 0.74, white, 1, 1, 0.7, 16),
      vbox(0.2, 0.04, 0.05, 0.2, -1.08, 0.78, hex(0x1a1a1a), 0, 0, -0.25), vbox(0.2, 0.04, 0.05, -0.2, -1.08, 0.78, hex(0x1a1a1a), 0, 0, 0.25), // worried eyebrows
      paint(tf(new THREE.TorusGeometry(0.22, 0.05, 6, 16, Math.PI), 0, -1.58, 0.84, 0, 0, Math.PI), red),
      vsph(0.075, 0.03, -1.72, 0.84, hex(0xe8708a), 1, 0.7, 0.6, 10), // tongue
      paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.09, 0.11], [0.0, 0.15], [-0.09, 0.1], [-0.06, 0.02], [0.06, -0.03], [0.1, -0.1], [0.0, -0.16], [-0.1, -0.11]].map(([x, y]) => new THREE.Vector3(x * 1.3, -2.05 + y * 1.3, 0.87 - Math.abs(x) * 0.4))), 24, 0.034, 6), cardinal),
    ];
    const bodyG = merge(parts.map((g) => { g.scale(S, S, S); return g; }));
    const legG = merge([vcyl(0.1, 0.09, 0.7, 0, -0.35, 0, brown, 8), vbox(0.19, 0.12, 0.3, 0, -0.74, 0.06, white), vbox(0.192, 0.035, 0.302, 0, -0.8, 0.06, red)]); legG.scale(S, S, S);
    const pupG = vsph(0.08, 0, 0, 0, 0.05, 1, 1, 1, 10); pupG.scale(S, S, S);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, name: 'bg:tree' });
    const smooth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, name: 'bg:treeParts' });
    this.swing = new THREE.Group(); this.root.add(this.swing);
    this.body = new THREE.Mesh(bodyG, mat); this.body.castShadow = true; this.body.receiveShadow = true; this.swing.add(this.body);
    this.legs = new THREE.InstancedMesh(legG, smooth, 2); this.pupils = new THREE.InstancedMesh(pupG, smooth, 2);
    for (const m of [this.legs, this.pupils]) { m.frustumCulled = false; m.castShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.swing.add(m); }
    this.S = S; this.t = 0; this.pos = new THREE.Vector3(); this.normal = new THREE.Vector3(0, 0, 1);
  }
  attach(tower) {
    const hand = tower.obj && tower.obj.getObjectByName('campanile-minute-hands');
    if (!hand) { console.warn('[bg] Campanile minute hands not found; Stanford Tree stays home'); this.ready = 'none'; return; }
    tower.obj.updateMatrixWorld(true); this.hand = hand; this.ready = true; this.root.visible = true;
    this.setupMaterials && this.setupMaterials(this.root);
  }
  update(dt, camPos) {
    if (this.ready !== true) return;
    const d = Math.hypot(camPos.x - this.pos.x, camPos.z - this.pos.z);
    this.root.visible = !(d > 1400);
    if (!this.root.visible) return;
    const sh = d < 260; if (sh !== this._sh) { this._sh = sh; this.body.castShadow = this.legs.castShadow = this.pupils.castShadow = sh; }
    const mi = _m4; this.hand.getMatrixAt(2, mi); const mw = new THREE.Matrix4().multiplyMatrices(this.hand.matrixWorld, mi); // south face
    const tip = new THREE.Vector3(0, 1.93, 0.03).applyMatrix4(mw), n = new THREE.Vector3(0, 0, 1).transformDirection(mw); n.y = 0; n.normalize();
    this.normal.copy(n); this.pos.copy(tip).addScaledVector(n, 0.3);
    this.root.position.copy(this.pos); this.root.rotation.set(0, Math.atan2(n.x, n.z), 0);
    if (d > 420) return; // too far to see the wiggles
    this.t += dt; const t = this.t, S = this.S;
    const kick = sstep(0, 0.25, (t % 6.5)) * (1 - sstep(1.2, 1.6, t % 6.5)); // a panicky flail every few seconds
    this.swing.rotation.set(0.05 * Math.sin(t * 1.1 + 1), 0, 0.09 * Math.sin(t * 1.6) + kick * 0.05 * Math.sin(t * 9));
    for (const s of [0, 1]) {
      const a = (s ? 1 : -1) * (0.12 + kick * 0.7) * Math.sin(t * (kick > 0.1 ? 11 : 2.3) + s * 1.3);
      _m4.compose(_v.set((s ? 0.2 : -0.2) * S, -2.45 * S, 0.3 * S), _q.setFromEuler(_e.set(a + 0.15, 0, (s ? 0.08 : -0.08))), _s.set(1, 1, 1)); this.legs.setMatrixAt(s, _m4);
      const ja = t * 7 + s * 2, jr = 0.045 * S * (0.6 + 0.4 * Math.sin(t * 3.3 + s));
      _m4.makeTranslation((s ? 0.19 : -0.19) * S + Math.cos(ja) * jr, -1.3 * S + Math.sin(ja) * jr - 0.03 * S, 0.83 * S); this.pupils.setMatrixAt(s, _m4);
    }
    this.legs.instanceMatrix.needsUpdate = true; this.pupils.instanceMatrix.needsUpdate = true;
  }
  inView(camera) { // is the Tree on screen, close enough, and seen from in front of the clock face?
    if (this.ready !== true || !camera) return false;
    const c = camera.position, toT = _v.copy(this.pos).add(_s.set(0, -1.6 * this.S, 0)).sub(c), d = toT.length();
    if (d > 170 || toT.dot(this.normal) > -5) return false;
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); return f.dot(toT.normalize()) > Math.cos(THREE.MathUtils.degToRad(9));
  }
}

// ================================================================ 3. THE STANFORD AXE
function buildAxe(M) {
  const root = new THREE.Group(); root.name = 'bigGame:axe';
  const add = (geos, mat, name, uv = true) => { const g = merge(geos.map((x) => { x = x.index ? x.toNonIndexed() : x; for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv'].includes(k)) x.deleteAttribute(k); return uv ? boxUV(x) : x; })); const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = true; m.receiveShadow = true; root.add(m); return m; };
  const box = (w, h, d, x, y, z, ry = 0) => tf(new THREE.BoxGeometry(w, h, d), x, y, z, 0, ry, 0);
  const W = 1.25, D = 0.8, PH = 0.95, GH = 1.3; // plinth width/depth/height, glass height
  add([box(W + 0.16, 0.1, D + 0.16, 0, 0.05 - 0.3, 0), box(W + 0.16, 0.42, D + 0.16, 0, -0.12, 0), box(W, PH - 0.1, D, 0, 0.1 + (PH - 0.1) / 2, 0), box(W + 0.08, 0.06, D + 0.08, 0, PH - 0.03, 0)], M.graniteDark, 'axe:plinth');
  // bronze frame of the vitrine
  const fr = [], e = 0.035, y0 = PH, y1 = PH + GH;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) fr.push(box(e, GH, e, sx * W / 2, (y0 + y1) / 2, sz * D / 2));
  for (const sz of [-1, 1]) for (const y of [y0 + e / 2, y1 - e / 2]) fr.push(box(W, e, e, 0, y, sz * D / 2));
  for (const sx of [-1, 1]) for (const y of [y0 + e / 2, y1 - e / 2]) fr.push(box(e, e, D, sx * W / 2, y, 0));
  // stanchions with Cal-blue velvet rope
  const posts = [[-1.1, 1.1], [1.1, 1.1], [1.1, -0.75], [-1.1, -0.75]];
  for (const [x, z] of posts) { fr.push(tf(new THREE.CylinderGeometry(0.03, 0.03, 0.92, 10), x, 0.46, z)); fr.push(tf(new THREE.CylinderGeometry(0.14, 0.16, 0.04, 16), x, 0.02, z)); fr.push(tf(new THREE.SphereGeometry(0.05, 10, 8), x, 0.95, z)); }
  add(fr, M.gold, 'axe:brass', false);
  const ropeM = new THREE.MeshStandardMaterial({ color: 0x0e2f63, roughness: 0.9, name: 'bg:velvet' });
  const ropes = [];
  for (const k of [1, 2, 3]) { const [ax, az] = posts[k], [bx, bz] = posts[(k + 1) % 4]; const pts = []; for (let i = 0; i <= 12; i++) { const s = i / 12; pts.push(new THREE.Vector3(ax + (bx - ax) * s, 0.88 - 0.13 * Math.sin(Math.PI * s), az + (bz - az) * s)); } ropes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.022, 6)); }
  add(ropes, ropeM, 'axe:rope', false);
  // the plaque: dark walnut, rows of brass score plates, the axe head mounted in the middle
  const plaqueTex = canvasTex(512, 640, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#3a2414'); g.addColorStop(0.5, '#4b2e19'); g.addColorStop(1, '#341f11'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.globalAlpha = 0.12; for (let i = 0; i < 90; i++) { c.strokeStyle = i % 2 ? '#1c0f06' : '#6b4426'; c.lineWidth = 1 + (i % 3); c.beginPath(); const x = (i * 37) % w; c.moveTo(x, 0); c.bezierCurveTo(x + 14, h * 0.3, x - 10, h * 0.6, x + 6, h); c.stroke(); } c.globalAlpha = 1;
    c.fillStyle = '#c9a24e'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center'; c.fillText('THE STANFORD AXE', w / 2, 52);
    let yr = 1933; c.font = '9px Arial'; c.textBaseline = 'middle';
    for (let row = 0; row < 15; row++) for (let col = 0; col < 6; col++) {
      if (row >= 4 && row <= 10 && col >= 1 && col <= 4) continue; // room for the axe head
      const x = 22 + col * 79, y = 84 + row * 36; c.fillStyle = '#b8913f'; c.fillRect(x, y, 70, 26); c.fillStyle = '#e2c271'; c.fillRect(x, y, 70, 3); c.fillStyle = '#5a3f12'; c.fillText(String(yr++), x + 35, y + 14);
    }
  });
  const plaqueM = new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.55, name: 'bg:plaque' });
  const shape = new THREE.Shape(); const pw = 0.82, ph = 1.02; shape.moveTo(-pw / 2, 0); shape.lineTo(pw / 2, 0); shape.lineTo(pw / 2, ph - 0.12); shape.quadraticCurveTo(pw / 2, ph, pw / 2 - 0.12, ph); shape.lineTo(-pw / 2 + 0.12, ph); shape.quadraticCurveTo(-pw / 2, ph, -pw / 2, ph - 0.12); shape.closePath();
  const pg = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 2 });
  { const p = pg.attributes.position, uv = pg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + pw / 2) / pw, p.getY(i) / ph); }
  tf(pg, 0, PH + 0.12, -0.12, -0.08); const plaque = new THREE.Mesh(pg, plaqueM); plaque.castShadow = true; root.add(plaque);
  // easel behind it
  add([box(0.05, 0.9, 0.05, 0, PH + 0.45, -0.28, 0), box(0.6, 0.05, 0.06, 0, PH + 0.03, -0.12)], M.woodDark, 'axe:easel');
  // axe head: broad blade with a curved edge, steel, on a short handle stub
  // single-bit axe head in profile: square poll, the eye, a narrowing cheek, then a flared, curved bit; tapered to a wedge
  const blade = new THREE.Shape(); blade.moveTo(-0.07, 0.04); blade.lineTo(0.03, 0.04); blade.quadraticCurveTo(0.09, 0.035, 0.13, 0.06); blade.quadraticCurveTo(0.17, 0.09, 0.2, 0.115);
  blade.quadraticCurveTo(0.235, 0.0, 0.2, -0.115); blade.quadraticCurveTo(0.17, -0.09, 0.13, -0.06); blade.quadraticCurveTo(0.09, -0.035, 0.03, -0.04); blade.lineTo(-0.07, -0.04); blade.closePath();
  const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 10 }); bg.translate(0, 0, -0.025);
  { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), k = x < 0.02 ? 1 : Math.max(0.1, 1 - (x - 0.02) / 0.2); p.setZ(i, p.getZ(i) * k); } bg.computeVertexNormals(); }
  const steel = new THREE.MeshStandardMaterial({ color: 0xc6cacd, roughness: 0.24, metalness: 0.95, name: 'bg:steel' });
  const axe = new THREE.Group(); axe.position.set(0.04, PH + 0.12 + 0.5, -0.07); axe.rotation.set(-0.08, 0, -0.5); axe.scale.setScalar(1.25); root.add(axe);
  const bm = new THREE.Mesh(bg, steel); bm.castShadow = true; axe.add(bm);
  axe.add(new THREE.Mesh(merge([tf(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8), -0.035, 0, -0.045, Math.PI / 2), tf(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8), 0.13, 0, -0.045, Math.PI / 2), // brass pegs and straps
    tf(new THREE.BoxGeometry(0.08, 0.02, 0.085), -0.035, -0.22, -0.012), tf(new THREE.BoxGeometry(0.02, 0.11, 0.085), 0.065, 0, -0.012)].map((g) => g.toNonIndexed())), M.gold));
  const hg = tf(new THREE.CylinderGeometry(0.019, 0.022, 0.36, 10, 1), -0.035, -0.12, 0, 0, 0, 0); const hm = new THREE.Mesh(hg, M.woodDark); hm.castShadow = true; axe.add(hm); // handle stub through the eye
  // glass
  const glassM = new THREE.MeshStandardMaterial({ color: 0xd4e6ee, transparent: true, opacity: 0.2, roughness: 0.03, metalness: 0.35, depthWrite: false, side: THREE.DoubleSide, name: 'bg:glass' });
  const gl = merge([box(W - 0.02, GH - 0.02, 0.01, 0, (y0 + y1) / 2, D / 2), box(W - 0.02, GH - 0.02, 0.01, 0, (y0 + y1) / 2, -D / 2), box(0.01, GH - 0.02, D - 0.02, W / 2, (y0 + y1) / 2, 0), box(0.01, GH - 0.02, D - 0.02, -W / 2, (y0 + y1) / 2, 0), box(W, 0.01, D, 0, y1, 0)].map((g) => g.toNonIndexed()));
  const glass = new THREE.Mesh(gl, glassM); glass.renderOrder = 2; root.add(glass);
  // brass placard on the plinth front
  const tag = canvasTex(768, 384, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e7cc7f'); g.addColorStop(0.5, '#c9a24e'); g.addColorStop(1, '#a8822f'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#6e5216'; c.lineWidth = 8; c.strokeRect(14, 14, w - 28, h - 28);
    c.fillStyle = '#2b1d06'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 60px Georgia, serif'; c.fillText('THE STANFORD AXE', w / 2, 86);
    c.font = 'italic 30px Georgia, serif'; c.fillText('Big Game trophy since 1933', w / 2, 150);
    c.font = '28px Georgia, serif'; c.fillText('Custodian: the UC Rally Committee', w / 2, 204);
    c.font = 'bold 32px Georgia, serif'; c.fillText('PLEASE DO NOT RETURN TO PALO ALTO', w / 2, 290);
  });
  const tg = new THREE.PlaneGeometry(0.86, 0.43); tg.translate(0, 0.55, D / 2 + 0.004);
  root.add(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: tag, roughness: 0.35, metalness: 0.6, name: 'bg:placard' })));
  const ban = canvasTex(256, 600, (c, w, h) => {
    c.fillStyle = '#003262'; c.fillRect(0, 0, w, h); c.fillStyle = '#fdb515'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fdb515'; c.font = 'bold 50px Arial, Helvetica, sans-serif'; c.fillText("GIVE", w / 2, 96); c.fillText("'EM", w / 2, 156); c.fillText('THE', w / 2, 216); c.font = 'bold 74px Arial, Helvetica, sans-serif'; c.fillText('AXE', w / 2, 296);
    c.save(); c.translate(70, 505); c.rotate(0.45); c.scale(1.15, 1.15); c.fillStyle = '#fdb515'; c.fillRect(-7, -150, 14, 150); // handle, then poll, cheek and a flared bit
    c.beginPath(); c.moveTo(-16, -150); c.lineTo(4, -150); c.quadraticCurveTo(20, -150, 30, -160); c.quadraticCurveTo(44, -170, 56, -178); c.quadraticCurveTo(66, -146, 56, -114); c.quadraticCurveTo(44, -122, 30, -132); c.quadraticCurveTo(20, -140, 4, -136); c.lineTo(-16, -136); c.closePath(); c.fill(); c.restore();
    c.font = '600 22px Arial, Helvetica, sans-serif'; c.fillStyle = '#f6f2ea'; c.fillText('BIG GAME · GO BEARS', w / 2, 540);
  });
  const bw = 0.85, bh = 2.0, banner = new THREE.Group(); banner.position.set(1.95, 0, -0.1); banner.rotation.y = -0.25; root.add(banner);
  const bp = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh).translate(0, 0.12 + bh / 2, 0), new THREE.MeshStandardMaterial({ map: ban, roughness: 0.8, side: THREE.DoubleSide, name: 'bg:banner' })); bp.castShadow = true; banner.add(bp);
  const stand = merge([box(bw + 0.08, 0.1, 0.24, 0, 0.05, 0), box(0.025, bh + 0.05, 0.025, 0, 0.1 + bh / 2, -0.03), box(bw, 0.025, 0.03, 0, bh + 0.13, 0)].map((g) => g.toNonIndexed()));
  const sm = new THREE.Mesh(stand, M.iron); sm.castShadow = true; banner.add(sm);
  root.traverse((o) => { if (!o.isMesh) return; if (o.material !== glassM) o.receiveShadow = true; o.castShadow = /axe:plinth|bg:banner|bg:steel|bg:plaque/.test(o.name + ' ' + o.material.name) || o === bp; });
  return root;
}

// ================================================================ achievements (toast + chime)
const ICONS = {
  ball: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="12" ry="7.5" transform="rotate(-35 16 16)" fill="#003262"/><path d="M11.5 20.5l9-9M13.4 15.4l3.2 3.2M15.4 13.4l3.2 3.2M17.4 11.4l3.2 3.2" stroke="#fdb515" stroke-width="1.6" stroke-linecap="round"/></svg>',
  tree: '<svg viewBox="0 0 32 32"><path d="M16 3l7 9h-3.5l5 7h-4l4.5 6H7l4.5-6h-4l5-7H9z" fill="#003262"/><rect x="14.5" y="25" width="3" height="4.5" rx="1" fill="#003262"/></svg>',
  axe: '<svg viewBox="0 0 32 32"><path d="M8 26.5L21.5 13" stroke="#003262" stroke-width="2.6" stroke-linecap="round"/><path d="M17.5 6.5c3.5-1.2 7.6.4 9.3 3.7-2.3.4-4.4 1.8-5.4 4l-3.9-3.9c.6-1.3.6-2.6 0-3.8z" fill="#003262"/></svg>',
};
const CSS = `.bg-ach{position:absolute;left:50%;top:calc(64px + env(safe-area-inset-top,0px));transform:translate(-50%,-12px);opacity:0;display:flex;gap:14px;align-items:flex-start;width:min(460px,86vw);padding:14px 18px 14px 14px;
background:rgba(10,18,36,.86);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border:1px solid rgba(253,181,21,.5);border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08);
color:#f6f2ea;transition:opacity .45s,transform .45s cubic-bezier(.2,.8,.2,1);pointer-events:none;z-index:3}
.bg-ach.on{opacity:1;transform:translate(-50%,0)}
.bg-ach .ic{flex:none;width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe08a,#fdb515 58%,#c98a00);display:grid;place-items:center;box-shadow:0 0 0 3px rgba(253,181,21,.16)}
.bg-ach .ic svg{width:27px;height:27px}.bg-ach .tx{min-width:0}
.bg-ach .k{font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:#fdb515}
.bg-ach .n{font-size:19px;font-weight:600;margin-top:3px;line-height:1.25}
.bg-ach .s{font-size:11px;letter-spacing:.13em;text-transform:uppercase;opacity:.75;margin-top:3px}
.bg-ach .b{font-size:13px;line-height:1.5;opacity:.92;margin-top:7px}`;
function makeToaster(ui) {
  let el = null, tt = 0;
  return (p, n, total) => {
    if (!el) {
      const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      el = document.createElement('div'); el.className = 'bg-ach'; el.innerHTML = '<div class="ic"></div><div class="tx"><div class="k"></div><div class="n"></div><div class="s"></div><div class="b"></div></div>';
      (ui && ui.hud ? ui.hud : document.body).appendChild(el);
    }
    ui && ui.toastEl && ui.toastEl.classList.add('off'); // don't stack on a discovery card
    el.querySelector('.ic').innerHTML = ICONS[p.ach.icon] || ICONS.ball;
    el.querySelector('.k').textContent = `Achievement unlocked · Big Game ${n}/${total}`;
    el.querySelector('.n').textContent = p.ach.title; el.querySelector('.s').textContent = `${p.name} · ${p.sub}`; el.querySelector('.b').textContent = p.blurb;
    el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), 8000);
  };
}

// ================================================================ sound (procedural, through the game's audio graph)
function sfx(audio, kind, dist) {
  const c = audio && audio.ctx; if (!c || !audio.master) return;
  const t = c.currentTime, att = clamp(70 / (dist + 25), 0.04, 1);
  if (kind === 'roar' && audio.white) {
    const s = c.createBufferSource(); s.buffer = audio.white; s.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.5;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const g = c.createGain(); const v = 0.22 * att; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.4); g.gain.setTargetAtTime(v * 0.55, t + 1.4, 1.2); g.gain.setTargetAtTime(0.0001, t + 4.5, 1.4);
    s.connect(bp).connect(lp).connect(g).connect(audio.master); s.start(t); s.stop(t + 10);
  } else if (kind === 'trombone') { // wah, wah, wah, waaah
    const notes = [233.08, 220.0, 207.65, 196.0], dur = [0.42, 0.42, 0.42, 1.5]; let tt = t + 0.25;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.Q.value = 3; const out = c.createGain(); out.gain.value = 0.16 * att; lp.connect(out).connect(audio.master);
    notes.forEach((f, i) => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.03, tt); o.frequency.exponentialRampToValueAtTime(f, tt + 0.08);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(1, tt + 0.05); g.gain.setTargetAtTime(0.0001, tt + dur[i] - 0.12, 0.06);
      if (i === 3) { const l = c.createOscillator(); l.frequency.value = 5.5; const lg = c.createGain(); lg.gain.value = 5; l.connect(lg).connect(o.frequency); l.start(tt + 0.3); l.stop(tt + dur[i]); }
      o.connect(g).connect(lp); o.start(tt); o.stop(tt + dur[i] + 0.1); tt += dur[i];
    });
  } else if (kind === 'whistle') {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 2900; const l = c.createOscillator(); l.frequency.value = 38; const lg = c.createGain(); lg.gain.value = 140; l.connect(lg).connect(o.frequency);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * att, t + 0.03); g.gain.setTargetAtTime(0.0001, t + 0.5, 0.05); o.connect(g).connect(audio.master); o.start(t); l.start(t); o.stop(t + 0.8); l.stop(t + 0.8);
  }
}

// ================================================================ install
export function installBigGame({ scene, lm, physics, heightAt, setupMaterials, audio, ui, places, quality = 'high' }) {
  const M = materials();
  const play = new ThePlay({ scene, setupMaterials, M, quality });
  const tree = new StanfordTree({ scene, setupMaterials });
  // the Axe: placed on the plaza, with a collider so you can't walk through the case
  const axe = buildAxe(M); const gy = heightAt(AXE.x, AXE.z); axe.position.set(AXE.x, gy, AXE.z); axe.rotation.y = AXE.yaw; scene.add(axe); setupMaterials && setupMaterials(axe);
  physics && physics.addCircle(AXE.x, AXE.z, 1.3, gy - 1, gy + 2.4, 'bigGame:axe');
  const toast = makeToaster(ui);
  let camera = null, witnessed = false, camPos = new THREE.Vector3();
  const mine = places.filter((p) => p.id && p.id.startsWith('bg-'));
  const byId = Object.fromEntries(mine.map((p) => [p.id, p]));
  if (byId['bg-the-play']) byId['bg-the-play'].test = () => witnessed;
  if (byId['bg-tree']) byId['bg-tree'].test = () => tree.inView(camera);
  let pending = 0;
  const api = {
    play, tree, axe,
    seek: (t) => play.seek(t),
    achievement(p) { // called by the HUD the first time one of our places is found
      const n = mine.filter((q) => q.found).length;
      setTimeout(() => toast(p, n, mine.length), 120 + 3500 * pending++); setTimeout(() => { pending = Math.max(0, pending - 1); }, 3600);
      if (audio && audio.ctx) { audio.bell(783.99, 0.0, 0.16, 30, 0); audio.bell(1046.5, 0.14, 0.16, 30, 0); audio.bell(1318.5, 0.28, 0.16, 30, 0); }
    },
    update(dt, env) {
      camera = env.camera; camPos.copy(env.camera.position);
      const st = lm.byId.get('memorial-stadium'), tw = lm.byId.get('sather-tower');
      if (!play.ready) { if (st && st.state === 'ready') play.attach(st); } else if (!st || st.state !== 'ready') { play.ready = play.active = false; play.root.visible = false; }
      if (tree.ready === false) { if (tw && tw.state === 'ready') tree.attach(tw); } else if (tree.ready === true && (!tw || tw.state !== 'ready')) { tree.ready = false; tree.root.visible = false; }
      const d = play.update(dt, camPos);
      for (const e of play.events) {
        if (e === 'td' && env.player && d != null && d < 170) witnessed = true;
        if (!audio || !audio.started || d == null || d > 330) continue;
        if (e === 'kick') sfx(audio, 'whistle', d);
        if (e === 'td') sfx(audio, 'roar', d);
        if (e === 'flat') sfx(audio, 'trombone', Math.hypot(camPos.x - play.root.position.x, camPos.z - play.root.position.z));
      }
      play.events.length = 0;
      tree.update(dt, camPos);
      axe.visible = Math.hypot(camPos.x - AXE.x, camPos.z - AXE.z) < 260;
    },
  };
  return api;
}
