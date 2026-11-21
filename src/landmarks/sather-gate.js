// Sather Gate (John Galen Howard, 1910). NRHP: four granite-sheathed piers with beveled edges and moldings
// carrying glass globes in bronze bands; classical balustrades with newel posts flank the end piers; the two
// central piers are widely spaced for the Sather Road bridge over Strawberry Creek; bronze ornamental arches span the
// openings (segmental in the centre, with the "Fiat Lux" star cartouche wreathed in laurel, flat lintels at the sides);
// marble relief plaques on the front and back of each pier. Pier spacing fitted to the 2021 LiDAR; bronze portals,
// lettering band, pier proportions and the pale verdigris colour checked against Commons photographs.
import * as THREE from 'three';
import { Bucket, squareLathe, boxMM, boxC, extrudeShape, lathe, baluster, instanced, trs, frameMatrix, toLocal, rectPoly } from './lib/campanile-kit.js';

export const info = {
  id: 'sather-gate',
  name: 'Sather Gate',
  subtitle: 'John Galen Howard · 1910',
  blurb: 'Given by Jane K. Sather in memory of her husband Peder, this granite and bronze gate was once the formal southern entrance to campus. '
    + "Its eight marble reliefs by Earl Cummings were taken down over objections to their nudity and reinstalled in the 1970s; the gate framed the Free Speech Movement's 1964 protests.",
  replaces: [],
};

// gate frame: X runs along the gate (≈ east), +Z faces Sproul Plaza (≈ south); fitted to LiDAR (centre 1.4 m east of the path node)
const GX = 1.31, GZ = -0.63;
const ROT = Math.atan2(0.168, 0.9858);   // 9.7°: perpendicular to the Sather Road bridge axis
const PIERS = [-9.2, -5.0, 5.0, 9.2];
const PW = 0.66;                          // pier half-width (≈1.3 m shaft, photo-fitted)
const SPRING = 4.1;                       // springing of the central arch (photo: 4.1 m; crown soffit 5.7 m)

function letterTexture(text, w, h, bg, fg) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `bold ${Math.round(h * 0.72)}px Georgia, 'Times New Roman', serif`;
  const sp = text.split('').join(String.fromCharCode(8202));
  g.fillText(sp, w / 2, h * 0.54);
  g.strokeStyle = fg; g.lineWidth = Math.max(2, h * 0.05); g.strokeRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export async function build(ctx) {
  const { M, boxUV, groundAt } = ctx;
  const root = new THREE.Group(); root.name = 'sather-gate';
  const detailG = new THREE.Group(); detailG.userData.detail = true; root.add(detailG);
  const F = frameMatrix(GX, GZ, ROT);
  const main = new Bucket(boxUV), fine = new Bucket(boxUV);
  const L = (x, y, z) => toLocal(F, x, y, z);
  const gAt = (x, z) => { const p = L(x, 0, z); return groundAt(p[0], p[2]); };
  // weathered cast bronze: pale verdigris in sun
  const bronze = new THREE.MeshStandardMaterial({ color: 0x93c8b2, roughness: 0.6, metalness: 0.2 }); bronze.name = 'satherVerdigris';
  const granite = M.granite.clone(); granite.color.setRGB(1.08, 1.07, 1.03); granite.name = 'satherGranite';
  const colliders = [];

  // ---------- piers ----------
  const globeMat = new THREE.MeshStandardMaterial({ color: 0xeef3f2, roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.6, emissive: 0xfff1d6, emissiveIntensity: 0.0 });
  globeMat.name = 'satherGlobe';
  const bev = 0.12;
  const octo = [[-PW + bev, -PW], [PW - bev, -PW], [PW, -PW + bev], [PW, PW - bev], [PW - bev, PW], [-PW + bev, PW], [-PW, PW - bev], [-PW, -PW + bev]];
  const lampBase = lathe([[0.0, 0], [0.3, 0], [0.3, 0.06], [0.21, 0.11], [0.13, 0.19], [0.12, 0.25], [0.17, 0.31], [0.24, 0.36], [0.2, 0.39], [0.0, 0.39]], 16);
  const finial = lathe([[0.0, 0], [0.12, 0], [0.09, 0.07], [0.05, 0.12], [0.08, 0.17], [0.07, 0.24], [0.02, 0.3], [0.012, 0.52], [0.0, 0.56]], 10);
  const figure = (g, cx, cy, z, sz) => {   // low-relief reclining figure for the marble plaques
    const parts = [
      new THREE.SphereGeometry(0.06, 8, 6).scale(1, 1.15, 0.4).translate(cx - 0.3, cy + 0.06, z),
      new THREE.CapsuleGeometry(0.07, 0.3, 3, 8).scale(1, 1, 0.35).rotateZ(Math.PI / 2 - 0.25).translate(cx - 0.08, cy + 0.0, z),
      new THREE.CapsuleGeometry(0.045, 0.32, 3, 6).scale(1, 1, 0.35).rotateZ(Math.PI / 2 + 0.12).translate(cx + 0.22, cy - 0.06, z),
      new THREE.CapsuleGeometry(0.035, 0.24, 3, 6).scale(1, 1, 0.35).rotateZ(0.5).translate(cx - 0.2, cy + 0.13, z),
    ];
    for (const p of parts) g.add(M.marble, p, { smooth: true });
  };
  for (const px of PIERS) {
    const g = Math.min(gAt(px - 0.9, -0.9), gAt(px + 0.9, -0.9), gAt(px - 0.9, 0.9), gAt(px + 0.9, 0.9));
    const y0 = Math.max(g, -0.6);
    main.add(M.graniteDark, squareLathe([[g - 1.0, 0.87], [y0 + 0.27, 0.87], [y0 + 0.33, 0.81], [y0 + 0.38, 0.75], [y0 + 0.38, PW]], { cx: px }));
    main.add(granite, extrudeShape(octo, [], 4.46).rotateX(-Math.PI / 2).translate(px, y0 + 0.38, 0));        // bevelled shaft
    main.add(granite, squareLathe([[y0 + 4.84, 0.69], [y0 + 5.15, 0.69], [y0 + 5.19, 0.76], [y0 + 5.29, 0.84], [y0 + 5.41, 0.91], [y0 + 5.5, 0.91], [y0 + 5.5, 0.4]], { cx: px }));
    main.add(granite, squareLathe([[y0 + 4.78, PW], [y0 + 4.84, 0.76], [y0 + 4.86, 0.69]], { cx: px, capBottom: false, capTop: false }));
    // globe lamp: stepped bronze base, ribbed glass globe, ball-and-spike finial
    const yc = y0 + 5.5, gy = yc + 0.39 + 0.44;
    main.add(bronze, lampBase.clone().translate(px, yc, 0), { smooth: true, uv: 'keep' });
    main.add(globeMat, new THREE.SphereGeometry(0.44, 24, 16).translate(px, gy, 0), { smooth: true, uv: 'keep' });
    for (let k = 0; k < 4; k++) fine.add(bronze, new THREE.TorusGeometry(0.445, 0.016, 5, 32).rotateY((k * Math.PI) / 4).translate(px, gy, 0), { smooth: true, uv: 'keep' });
    fine.add(bronze, new THREE.TorusGeometry(0.45, 0.02, 5, 32).rotateX(Math.PI / 2).translate(px, gy, 0), { smooth: true, uv: 'keep' });
    main.add(bronze, finial.clone().translate(px, gy + 0.4, 0), { smooth: true, uv: 'keep' });
    // marble relief plaques (front and back) just under the cap
    for (const sz of [-1]) {
      const z = sz * PW;
      main.add(granite, boxC(px, y0 + 4.42, z + sz * 0.02, 1.15, 0.85, 0.04));
      main.add(M.marble, boxC(px, y0 + 4.42, z + sz * 0.03, 0.95, 0.65, 0.04));
      figure(fine, px, y0 + 4.42, z + sz * 0.06, sz);
    }
    // inscriptions on the Sproul-side faces of the two inner piers
    if (Math.abs(px) < 6) {
      const z = PW + 0.012;
      for (const [dy, w] of [[0.1, 0.56], [-0.02, 0.62], [-0.13, 0.4]]) fine.add(M.concreteDark, boxC(px, y0 + 1.85 + dy, z - 0.006, w, 0.045, 0.02));
      fine.add(granite, boxC(px, y0 + 1.85, z - 0.004, 0.74, 0.4, 0.012));
    }
    colliders.push({ type: 'poly', pts: rectPoly(F, px - 0.9, -0.9, px + 0.9, 0.9), y0: g - 1, y1: gy + 0.6 });
  }

  // ---------- bronze portals ----------
  const bar = (x0, y0, x1, y1, w = 0.1, d = 0.12, z = 0) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    return new THREE.BoxGeometry(len, w, d).rotateZ(Math.atan2(y1 - y0, x1 - x0)).translate((x0 + x1) / 2, (y0 + y1) / 2, z);
  };
  const ringGeo = (r) => new THREE.TorusGeometry(r, Math.max(0.018, r * 0.18), 5, 14);
  const rosette = (bk, x, y, r) => { bk.add(bronze, ringGeo(r).translate(x, y, 0), { smooth: true, uv: 'keep' }); bk.add(bronze, new THREE.SphereGeometry(r * 0.42, 8, 6).scale(1, 1, 0.7).translate(x, y, 0), { smooth: true, uv: 'keep' }); };
  // openwork lattice post: frame, ties and a ring in every cell
  const latticePost = (x0, x1, y0, y1) => {
    const d = 0.26, w = x1 - x0;
    main.add(bronze, boxMM(x0, y0 - 0.3, -d / 2 - 0.03, x1, y0 + 0.22, d / 2 + 0.03));                 // plinth
    for (const xs of [x0, x1 - 0.07]) main.add(bronze, boxMM(xs, y0 + 0.22, -d / 2, xs + 0.07, y1, d / 2));
    const n = Math.max(3, Math.round((y1 - y0 - 0.22) / 0.55));
    const ch = (y1 - y0 - 0.22) / n, cx = (x0 + x1) / 2, hw = (w - 0.14) / 2;
    for (const yy of [y0 + 0.22, y1 - 0.05]) main.add(bronze, boxMM(x0 + 0.07, yy - 0.03, -d / 2 + 0.03, x1 - 0.07, yy + 0.05, d / 2 - 0.03));
    for (let i = 0; i < n; i++) {
      const ya = y0 + 0.22 + i * ch, ym = ya + ch / 2, yc2 = ya + ch;
      for (const z of [-d / 2 + 0.05, d / 2 - 0.05]) {
        main.add(bronze, bar(cx, ya, cx + hw, ym, 0.035, 0.035, z)); main.add(bronze, bar(cx + hw, ym, cx, yc2, 0.035, 0.035, z));
        main.add(bronze, bar(cx, ya, cx - hw, ym, 0.035, 0.035, z)); main.add(bronze, bar(cx - hw, ym, cx, yc2, 0.035, 0.035, z));
      }
      rosette(fine, cx, ym, Math.min(hw, ch / 2) * 0.42);
    }
    colliders.push({ type: 'poly', pts: rectPoly(F, x0 - 0.05, -0.2, x1 + 0.05, 0.2), y0: y0 - 1, y1 });
  };
  const yb = Math.max(gAt(0, 0), -0.6);
  // --- central segmental arch on its own lattice posts, against the inner piers
  const XI = 5.0 - PW, PWD = 0.68, XA = XI - PWD;     // pier face, post width, intrados springing
  for (const s of [-1, 1]) latticePost(Math.min(s * XA, s * XI), Math.max(s * XA, s * XI), yb, yb + SPRING);
  const RISE = 1.63, R0 = (XA * XA + RISE * RISE) / (2 * RISE), CY = yb + SPRING + RISE - R0;
  const arcY = (x, dr) => CY + Math.sqrt(Math.max(0, (R0 + dr) * (R0 + dr) - x * x));
  const lowEdge = (x, dr) => Math.max(arcY(x, dr), yb + SPRING + dr * 0.9);
  const N = 32;
  const DR1 = 0.3, DR2 = 0.6;                        // lettering register, then the pierced rosette register (band ≈0.6 m)
  for (let i = 0; i < N; i++) {
    const x0 = -XI + (2 * XI * i) / N, x1 = -XI + (2 * XI * (i + 1)) / N;
    main.add(bronze, bar(x0, lowEdge(x0, 0) + 0.05, x1, lowEdge(x1, 0) + 0.05, 0.12, 0.24));
    main.add(bronze, bar(x0, lowEdge(x0, DR1) + 0.04, x1, lowEdge(x1, DR1) + 0.04, 0.09, 0.22));
    main.add(bronze, bar(x0, arcY(x0, DR2) - 0.06, x1, arcY(x1, DR2) - 0.06, 0.13, 0.26));
    main.add(bronze, bar(x0, arcY(x0, DR2) + 0.03, x1, arcY(x1, DR2) + 0.03, 0.05, 0.3));
  }
  // lettering register: solid plate, "SATHER GATE" on the Sproul (south) face
  {
    const tex = letterTexture('SATHER GATE', 2048, 96, '#55806e', '#a9d3be');
    const letterMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.25 }); letterMat.name = 'satherLettering';
    const pos = [], uv = [], NN = 48;
    for (let i = 0; i < NN; i++) {
      const xa = -XI + (2 * XI * i) / NN, xb = -XI + (2 * XI * (i + 1)) / NN;
      const a0 = lowEdge(xa, 0) + 0.1, a1 = lowEdge(xb, 0) + 0.1, b0 = lowEdge(xa, DR1) - 0.005, b1 = lowEdge(xb, DR1) - 0.005;
      const ua = i / NN, ub = (i + 1) / NN, z = 0.04;
      pos.push(xa, a0, z, xb, a1, z, xb, b1, z, xa, a0, z, xb, b1, z, xa, b0, z);
      uv.push(ua, 0, ub, 0, ub, 1, ua, 0, ub, 1, ua, 1);
    }
    const gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gp.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gp.computeVertexNormals();
    main.add(letterMat, gp, { uv: 'keep' });
    const back = gp.clone(); back.scale(1, 1, -1); back.translate(0, 0, 0);
    const bi = back.index ? back.toNonIndexed() : back; const p = bi.attributes.position;
    for (let k = 0; k < p.count; k += 3) { const ax = p.getX(k + 1), ay = p.getY(k + 1), az = p.getZ(k + 1); p.setXYZ(k + 1, p.getX(k + 2), p.getY(k + 2), p.getZ(k + 2)); p.setXYZ(k + 2, ax, ay, az); }
    bi.deleteAttribute('uv'); bi.computeVertexNormals();
    main.add(bronze, bi);
  }
  // pierced rosette register
  {
    const n = 25, rr = 0.1;
    for (let i = 0; i < n; i++) {
      const x = -XI + 0.3 + ((2 * XI - 0.6) * (i + 0.5)) / n;
      const y = (lowEdge(x, DR1) + 0.08 + arcY(x, DR2) - 0.12) / 2;
      rosette(fine, x, y, rr);
      if (i > 0) { const xm = -XI + 0.3 + ((2 * XI - 0.6) * i) / n; main.add(bronze, bar(xm, lowEdge(xm, DR1) + 0.08, xm, arcY(xm, DR2) - 0.12, 0.035, 0.08)); }
    }
  }
  // square rosette blocks where the arch ends drop over the posts
  for (const s of [-1, 1]) {
    const cx = s * (XA + XI) / 2;
    main.add(bronze, boxC(cx, yb + SPRING + 0.3, 0, PWD, 0.6, 0.18));
    rosette(fine, cx, yb + SPRING + 0.3, 0.17);
    for (const z of [-0.1, 0.1]) fine.add(bronze, boxC(cx, yb + SPRING + 0.3, z, 0.46, 0.46, 0.02));
  }
  // continuous acanthus cresting along the top of the band, tallest at the crown and tapering down the shoulders
  {
    const leafC = new THREE.SphereGeometry(1, 8, 6);
    for (const sd of [-1, 1]) for (let k = 0; k < 12; k++) {
      const x = sd * (0.45 + k * 0.2), h = 0.55 * (1 - k / 12) + 0.06;
      const y = arcY(x, DR2) + 0.02;
      fine.add(bronze, leafC.clone().scale(0.11, h * 0.5, 0.05).rotateZ(-sd * (0.35 + k * 0.05)).translate(x + sd * 0.05, y + h * 0.42, 0), { smooth: true, uv: 'keep' });
      if (k % 2 === 0) fine.add(bronze, new THREE.TorusGeometry(0.07 + h * 0.12, 0.022, 5, 10, Math.PI * 1.3).rotateZ(sd > 0 ? 0.3 : Math.PI - 0.3 - Math.PI * 0.3).translate(x + sd * 0.12, y + h * 0.75, 0), { smooth: true, uv: 'keep' });
    }
  }
  // crown cartouche: openwork oval with the five-point star and rays ("Fiat Lux"), bead border, ribbon tie, laurel sprays
  {
    const cy = arcY(0, DR2) + 0.62;
    main.add(bronze, new THREE.TorusGeometry(0.5, 0.065, 6, 36).scale(0.9, 1.3, 1).translate(0, cy, 0), { smooth: true, uv: 'keep' });
    main.add(bronze, new THREE.TorusGeometry(0.42, 0.03, 5, 36).scale(0.9, 1.3, 1).translate(0, cy, 0), { smooth: true, uv: 'keep' });
    const bead = new THREE.SphereGeometry(0.035, 6, 4);
    for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; fine.add(bronze, bead.clone().translate(0.9 * 0.59 * Math.cos(a), cy + 1.3 * 0.59 * Math.sin(a), 0), { smooth: true, uv: 'keep' }); }
    const star = []; for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 0.065 : 0.16; star.push([r * Math.cos(a), r * Math.sin(a)]); }
    main.add(bronze, extrudeShape(star, [], 0.07).translate(0, cy + 0.2, -0.035));
    for (let k = 0; k < 11; k++) {
      const a = -Math.PI / 2 + ((k - 5) / 5) * 1.25, len = 0.32 + (k === 5 ? 0.12 : 0) - Math.abs(k - 5) * 0.02;
      fine.add(bronze, bar(0.18 * Math.cos(a), cy + 0.2 + 0.18 * Math.sin(a), (0.18 + len) * Math.cos(a), cy + 0.2 + (0.18 + len) * Math.sin(a), 0.025, 0.04));
    }
    main.add(bronze, boxC(0, cy - 0.12, 0, 0.5, 0.1, 0.05));                         // "FIAT LUX" scroll
    main.add(bronze, new THREE.TorusGeometry(0.1, 0.04, 5, 10).scale(1.4, 0.8, 1).translate(0, cy - 0.78, 0), { smooth: true, uv: 'keep' });   // ribbon tie
    const leaf = new THREE.SphereGeometry(0.075, 6, 4).scale(1.0, 0.42, 0.45);
    for (const s of [-1, 1]) for (let k = 0; k < 13; k++) {
      const t = -0.95 + (k / 12) * 2.1, rx = 0.62, ry = 0.86;
      const x = s * rx * Math.cos(t * 0.75 - 0.25) , y = cy - 0.05 + ry * Math.sin(t * 0.75 - 0.25) * 0.95;
      const off = k % 2 ? 0.07 : -0.07;
      fine.add(bronze, leaf.clone().rotateZ(s * (t * 0.75 + 1.3)).translate(x * (1 + off), y, 0), { smooth: true, uv: 'keep' });
    }
  }
  // --- side portals: lattice posts and a deep lintel (rosette frieze over a scroll band) with a thin cornice
  for (const s of [-1, 1]) {
    const xa = s * (5.0 + PW), xb = s * (9.2 - PW);
    const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
    const ys = Math.max(gAt((xa + xb) / 2, 0), -0.6);
    latticePost(lo, lo + 0.42, ys, ys + 3.45);
    latticePost(hi - 0.42, hi, ys, ys + 3.45);
    const y0 = ys + 3.45;
    main.add(bronze, boxMM(lo, y0, -0.13, hi, y0 + 0.08, 0.13));
    main.add(bronze, boxMM(lo, y0 + 0.48, -0.12, hi, y0 + 0.54, 0.12));
    main.add(bronze, boxMM(lo, y0 + 0.92, -0.14, hi, y0 + 1.0, 0.14));
    main.add(bronze, boxMM(lo - 0.04, y0 + 1.0, -0.18, hi + 0.04, y0 + 1.07, 0.18));    // cornice lip
    main.add(bronze, boxMM(lo, y0 + 0.08, -0.03, hi, y0 + 0.48, 0.03));               // scroll band ground
    const n = 7;
    for (let i = 0; i < n; i++) rosette(fine, lo + ((hi - lo) * (i + 0.5)) / n, y0 + 0.73, 0.12);
    const sc = new THREE.TorusGeometry(0.11, 0.025, 5, 12, Math.PI * 1.5);
    for (let i = 0; i < 9; i++) fine.add(bronze, sc.clone().rotateZ(i % 2 ? 0.8 : 2.4).translate(lo + ((hi - lo) * (i + 0.5)) / 9, y0 + 0.28, 0.05), { smooth: true, uv: 'keep' });
  }

  // ---------- balustrades flanking the end piers ----------
  const balM = [];
  for (const s of [-1, 1]) {
    const x0 = s * (9.2 + PW + 0.05), x1 = s * 14.3, xn = s * 14.6, xm = s * 11.85;
    const ys = Math.max(Math.min(gAt(x0, 0), gAt(x1, 0), gAt(xn, 0)), -0.8);
    const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    main.add(M.graniteDark, boxMM(lo, ys - 1.0, -0.28, hi, ys + 0.22, 0.28));
    main.add(granite, boxMM(lo, ys + 0.86, -0.25, hi, ys + 1.04, 0.25));
    main.add(granite, boxMM(lo, ys + 1.04, -0.2, hi, ys + 1.08, 0.2));
    for (const xx of [xm]) main.add(granite, squareLathe([[ys - 1.0, 0.26], [ys + 1.04, 0.26], [ys + 1.1, 0.3], [ys + 1.2, 0.3]], { cx: xx }));
    const nb = Math.round((hi - lo) / 0.33);
    for (let i = 0; i < nb; i++) { const x = lo + ((hi - lo) * (i + 0.5)) / nb; if (Math.abs(x - xm) > 0.32) balM.push(trs(x, ys + 0.22, 0)); }
    main.add(granite, squareLathe([[ys - 1.0, 0.32], [ys + 1.05, 0.32], [ys + 1.1, 0.36], [ys + 1.22, 0.36], [ys + 1.3, 0.26]], { cx: xn }));
    colliders.push({ type: 'poly', pts: rectPoly(F, Math.min(x0, xn) - 0.36, -0.36, Math.max(x0, xn) + 0.36, 0.36), y0: ys - 1, y1: ys + 1.3 });
  }
  detailG.add(instanced(baluster(0.64, 0.09, 8), granite, balM, F, { detail: true }));

  main.flush(root, F, { name: 'sather-gate-' });
  fine.flush(detailG, F, { detail: true, name: 'sather-gate-detail-' });
  return {
    object3d: root, colliders, walkables: [], interactions: [],
    anchors: { center: L(0, 3, 0).map((v) => +v.toFixed(3)) },
    update(dt, env) { globeMat.emissiveIntensity = 2.2 * (env && typeof env.night === 'number' ? env.night : 0); },
  };
}
