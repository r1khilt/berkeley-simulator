// Lawrence Hall of Science (1968), UC Berkeley's public science center on the hills above campus.
// Massing from the 2021 LiDAR: a broad octagonal plaza deck (~12 m above the downhill west edge) built over lower floors
// that open to the bay in horizontal window bands; south of it rise the building's signature monolithic, khaki board-formed
// concrete masses: vertical walls with steep facets to truncated tops (a central mass on the plaza with the main entrance,
// two splayed folded-plate exhibit halls, a flat-roofed spine and the tall polygonal lantern). The plaza carries the
// fountain, Pheena the life-size fin whale and the climbable DNA double helix, facing the bay.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { concreteMat, plainMat, facadeRing, frustum, offsetRing, glazing, bandWall, fascia } from './lib/b06c-kit.js';

export const info = {
  id: 'lawrence-hall-of-science',
  name: 'Lawrence Hall of Science',
  subtitle: 'Public science center · 1968',
  blurb: 'Named for Nobel laureate Ernest O. Lawrence, UC Berkeley\'s public science center opened in 1968 high in the hills above campus. Out on its plaza overlooking the bay, kids climb on Pheena, a life-size fin whale, and a giant DNA double helix.',
  replaces: ['w/24026035'],
};

export async function build(ctx) {
  const K = new Kit(ctx, 0); const M = ctx.M;
  const CON = concreteMat(0xc2b48e, 'board', { rough: 0.9 });   // monolithic board-formed concrete, warm buff
  const CONd = concreteMat(0x9c9277, 'smooth');    // slab edges, shadowed planes
  const PAVE = concreteMat(0xb4b3ad, 'smooth', { rough: 0.95, normal: 0.15 }); // light grey plaza concrete
  const FR = M.darkBronze, GL = M.windowNight;
  const PZ = 12.0;                                  // plaza / exhibit-hall floor level
  const colliders = [], walkables = [], interactions = [];
  const fp = facadeRing(ctx.footprints[0].outer.map(([x, z]) => [x, z]));

  // ---------- podium walls along the real footprint (two window bands where the hillside falls away) ----------
  const BANDS = [{ y0: 8.3, y1: 10.6 }, { y0: 4.2, y1: 6.5 }];
  const deckEdges = [];
  for (let i = 0; i < fp.length; i++) {
    const a = fp[i], b = fp[(i + 1) % fp.length]; const R = K.run(a, b); if (R.L < 0.3) continue;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let gMin = Infinity, gMax = -Infinity; for (let k = 0; k <= 8; k++) { const p = R.at(R.L * k / 8, 0.3); const g = K.g(p[0], p[1]); gMin = Math.min(gMin, g); gMax = Math.max(gMax, g); }
    const zone = mid[1] < 24.5 ? 'deck' : (mid[1] > 60.0 && Math.abs(mid[0]) < 23 ? 'lobe' : 'wing');
    const yt = zone === 'lobe' ? 18.0 : PZ;
    const bands = R.L > 3 ? BANDS.filter((bd) => bd.y0 > gMax + 0.5) : [];
    bandWall(K, R, CON, gMin - 1.5, yt, bands, { depth: 0.45, rev: 0.32, pitch: 1.55, margin: Math.min(1.2, R.L * 0.15), frame: FR, glass: GL });
    for (const bd of bands) fascia(K, R, CON, bd.y1, bd.y1 + 0.75, 0.5, { s0: 0, s1: R.L, back: 0.45 });
    if (zone === 'deck') { // parapet with coping around the plaza
      deckEdges.push(R);
      K.rbox(R, CON, 0, PZ, -0.4, R.L, PZ + 1.0, 0);
      K.rbox(R, CONd, -0.02, PZ + 1.0, -0.46, R.L + 0.02, PZ + 1.08, 0.06);
      colliders.push({ type: 'poly', pts: [R.at(0, 0), R.at(R.L, 0), R.at(R.L, -0.4), R.at(0, -0.4)].map((p) => p.map((q) => +q.toFixed(3))), y0: PZ - 1, y1: PZ + 1.1 });
    }
    if (zone === 'lobe') { K.rbox(R, CONd, -0.05, 17.5, -0.45, R.L + 0.05, 18.0, 0.3); }
  }
  // cubic piers on the parapet every ~16 m
  deckEdges.slice().sort((p, q) => q.L - p.L).slice(0, 4).forEach((R) => { const s = R.L / 2; K.rbox(R, CON, s - 1.0, PZ, -2.0, s + 1.0, PZ + 2.4, 0.05); });
  // plaza deck + podium collider + expansion-joint grid
  K.flat(PAVE, fp, PZ);
  {
    const inside = (x, z) => { let c = false; for (let i = 0, j = fp.length - 1; i < fp.length; j = i++) { const [xi, zi] = fp[i], [xj, zj] = fp[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
    const JM = concreteMat(0x8a877f, 'smooth', { rough: 0.95, normal: 0.2 }); const step = 4.5;
    for (let x = -42; x <= 42; x += step) for (let z = -66; z < 24; z += step) {
      if (inside(x, z + step / 2) && inside(x, z) && inside(x, z + step)) K.box(JM, x - 0.04, PZ, z, x + 0.04, PZ + 0.012, z + step, { detail: true });
      if (inside(x + step / 2, z) && inside(x, z) && inside(x + step, z)) K.box(JM, x, PZ, z - 0.04, x + step, PZ + 0.012, z + 0.04, { detail: true });
    }
  }
  colliders.push({ type: 'poly', pts: fp.map((p) => p.map((q) => +q.toFixed(3))), y0: -3, y1: PZ - 0.05 });
  walkables.push({ type: 'poly', pts: fp.map((p) => p.map((q) => +q.toFixed(3))), y: PZ });
  // ---------- monolithic faceted concrete masses: blind board-formed walls rising straight from the plaza, then steep
  // facets up to a truncated top (no eaves; same concrete for walls and facets) ----------
  const ring4 = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  const oct = (u0, v0, u1, v1, c) => [[u0 + c, v0], [u1 - c, v0], [u1, v0 + c], [u1, v1 - c], [u1 - c, v1], [u0 + c, v1], [u0, v1 - c], [u0, v0 + c]];
  const FAC = CON; // walls and roof facets read as one monolithic concrete mass (no eaves, same material)
  const mass = (ring, topInset, y0, yWall, yTop, holes = null) => {
    if (holes) { const r = facadeRing(ring); r.forEach((a, i) => { const b = r[(i + 1) % r.length]; const R = K.run(a, b); if (R.L <= 0.2) return; const ops = holes(a, b, R) || []; K.wall(R, CON, 0, R.L, y0, yWall, ops, 0.6); for (const o of ops) if (!o.door) { K.rbox(R, GL, o.s0, o.y0, -0.42, o.s1, o.y1, -0.38); K.rbox(R, CONd, o.s0 - 0.05, o.y0 - 0.1, -0.42, o.s1 + 0.05, o.y0, 0.05); } }); K.prism(CONd, offsetRing(ring, -0.6), y0, yWall - 0.02, {}); }
    else frustum(K, CON, ring, ring, y0, yWall, { cap: false, uvMode: 'box' });
    frustum(K, FAC, ring, offsetRing(ring, -topInset), yWall, yTop);
  };
  // slit windows: tall narrow recessed openings
  const slits = (R, y0, y1, every = 6.5, w = 0.55) => { const n = Math.floor(R.L / every); const out = []; for (let k = 0; k < n; k++) { const s = R.L * (k + 0.5) / n; out.push({ s0: s - w / 2, s1: s + w / 2, y0, y1 }); } return out; };
  // central mass on the plaza (main entrance at x = 0 where the plaza walk arrives)
  {
    const ring = oct(-14.0, -3.8, 16.0, 19.6, 3.4);
    let RN = null;
    mass(ring, 5.4, PZ - 0.1, 18.0, 21.0, (a, b, R) => {
      if (Math.abs(a[1] + 3.8) < 1e-6 && Math.abs(b[1] + 3.8) < 1e-6) { RN = R; const sc = a[0] - 0.0; return [{ s0: sc - 1.7, s1: sc + 1.7, y0: PZ, y1: PZ + 4.4, door: true }]; }
      return []; // blind board-formed walls apart from the entrance
    });
    // deep entrance recess lined in rust-orange, glass doors at the back
    const RED = plainMat(0xb5612e, { roughness: 0.8 });
    const sc = RN.at(0)[0] - 0.0; const s = Math.abs(RN.a[0] - 0); // run starts at the east end: x=0 is s
    K.rbox(RN, RED, s - 1.7, PZ, -2.6, s - 1.55, PZ + 4.4, -0.6); K.rbox(RN, RED, s + 1.55, PZ, -2.6, s + 1.7, PZ + 4.4, -0.6);
    K.rbox(RN, RED, s - 1.7, PZ + 4.25, -2.6, s + 1.7, PZ + 4.4, -0.6);
    K.rbox(RN, CONd, s - 1.7, PZ - 0.02, -2.6, s + 1.7, PZ + 0.03, 0);
    glazing(K, RN, s - 1.55, s + 1.55, PZ + 0.02, PZ + 4.25, { d: -2.5, pitch: 0.78, transoms: [PZ + 2.4], frame: FR, glass: GL });
    // small square inset panel high on the end face
    K.rbox(RN, GL, s - 0.7, 18.0, -0.95, s + 0.7, 19.4, -0.75);
    K.rbox(RN, CON, s - 0.9, 17.8, -1.0, s + 0.9, 18.0, -0.55);
    interactions.push({ id: 'lhs-entrance', pos: [0, PZ + 1, -5.5], radius: 3, label: 'Lawrence Hall of Science: main entrance' });
    colliders.push(K.colPoly(ring, PZ - 1, 21.2));
  }
  // slit-window fillers (dark glass at the back of every slit) are added by a light pass below
  // spine (flat roof, light slab edge) between the hall wings + the tall polygonal lantern
  {
    const su0 = -12.0, su1 = 13.0, sv0 = 18.3, sv1 = 59.8, yR = 18.0;
    K.box(CON, su0, PZ - 0.2, sv0, su1, yR - 0.6, sv1);
    K.box(CONd, su0 - 0.3, yR - 0.6, sv0 - 0.3, su1 + 0.3, yR, sv1);
    colliders.push(K.colPoly(ring4(su0, sv0, su1, sv1), PZ - 1, yR));
    const b = oct(-4.6, 31.2, 7.6, 46.8, 2.6);
    K.prism(CONd, offsetRing(b, 0.5), yR - 0.1, yR + 0.5);
    mass(b, 2.1, yR, 23.0, 25.0);
    colliders.push(K.colPoly(b, yR - 1, 25));
  }
  // the two splayed exhibit-hall wings (folded-plate halls): blind walls, low broad facets
  const wings = [
    [[-29.0, 25.4], [-11.5, 25.6], [-8.5, 60.0], [-26.4, 59.6], [-29.9, 48.6], [-35.3, 31.7]],
    [[11.5, 25.6], [28.9, 25.2], [35.6, 31.9], [31.0, 56.5], [26.0, 59.4], [8.5, 60.0]],
  ];
  for (const base of wings) {
    K.prism(CONd, offsetRing(base, 0.5), PZ - 0.2, PZ + 0.45); // ledge where the hall meets the podium roof
    // folded-plate exhibit hall: steep battered concrete faces rising straight off the plaza, a lower-pitched upper fold,
    // then a small vertical-sided crown box on the plateau (LiDAR: edge ~19 m, crown ~21.8–22.5 m)
    const r1 = offsetRing(base, -3.0), r2 = offsetRing(base, -6.2);
    frustum(K, CON, base, r1, PZ, 19.2, { cap: false, uvMode: "roof" });
    frustum(K, CON, r1, r2, 19.2, 21.6, { cap: true, uvMode: 'roof' });
    // crisp fold ribs down the hips (detail)
    for (let i = 0; i < base.length; i++) { const a = base[i], b = r1[i]; const L = Math.hypot(b[0] - a[0], 19.2 - PZ, b[1] - a[1]); const g = new THREE.BoxGeometry(0.28, 0.18, L); const m = new THREE.Matrix4().lookAt(new THREE.Vector3(a[0], PZ, a[1]), new THREE.Vector3(b[0], 19.2, b[1]), new THREE.Vector3(0, 1, 0)); g.applyMatrix4(m); g.translate((a[0] + b[0]) / 2, (PZ + 19.2) / 2, (a[1] + b[1]) / 2); K.add(CONd, g, { detail: true }); }
    colliders.push(K.colPoly(base, PZ - 1, 21.8));
  }
  // south stair/service blocks (flat roofs at the spine height)
  K.prism(CONd, [[-21.69, 59.9], [-21.69, 60.41], [-22.14, 62.84], [-22.47, 64.57], [-19.41, 65.84], [-6.6, 60.46], [-6.6, 59.9]], 17.2, 17.9);
  K.prism(CONd, [[6.71, 59.9], [6.71, 60.21], [18.4, 65.47], [22.19, 64.96], [20.88, 59.56], [20.88, 59.0]], 17.2, 17.9);

  // ---------- plaza furniture: stairs up from the hillside paths, fountain, Pheena the whale, DNA helix, lamps ----------
  // east stairs (paths from Centennial Drive / parking arrive at the plaza's east edge)
  for (const [zc, xe] of [[-36.6, 34.6], [-9.6, 35.3]]) {
    const g = K.g(xe + 7, zc); const n = Math.max(3, Math.round((PZ - g) / 0.16)); const run = Math.min(9, n * 0.3);
    walkables.push(K.stairs(M.paving, xe - 0.2, zc - 2.0, xe + run, zc + 2.0, g, PZ, '-u', n));
    for (const s of [-2.2, 2.2]) { K.box(CON, xe - 0.2, g - 1, zc + s - 0.2, xe + run, PZ + 0.9, zc + s + 0.2); colliders.push(K.colPoly(ring4(xe - 0.2, zc + s - 0.2, xe + run, zc + s + 0.2), g - 1, PZ + 0.9)); }
  }
  // fountain (from the OSM outline): curb + water + jets
  {
    const f = (ctx.packet?.context || []).find((c) => c.tags?.amenity === 'fountain');
    let ring = f ? (f.pts || f.outer).map(([x, z]) => [x, z]) : [[-5, -22], [-4, -26], [0, -28], [4, -26], [6, -22], [4, -18], [0, -17], [-4, -18]];
    if (ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop();
    K.loop(CON, ring, [[0.0, PZ], [0.0, PZ + 0.45], [-0.4, PZ + 0.45], [-0.4, PZ + 0.25]]);
    K.flat(M.water, ring, PZ + 0.3);
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const jetM = plainMat(0xeef4f6, { roughness: 0.2, transparent: true, opacity: 0.75 });
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const r = k === 0 ? 0 : 2.2; K.cyl(jetM, cx + Math.cos(a) * r * (k ? 1 : 0), PZ + 0.3, cz + Math.sin(a) * r * (k ? 1 : 0), 0.12, 0.03, k === 0 ? 2.6 : 1.5, 6, { detail: true }); }
    colliders.push({ type: 'poly', pts: ring.map((p) => p.map((q) => +q.toFixed(3))), y0: PZ - 1, y1: PZ + 0.45 });
  }
  // Pheena: life-size fin whale (~18 m), lying on the plaza along the west parapet
  {
    const WH = plainMat(0x3e4650, { roughness: 0.55 }), WB = plainMat(0xd9dcd8, { roughness: 0.6 });
    const L = 18, cx = -24.5, cz = -26, yaw = THREE.MathUtils.degToRad(-12); // head toward the north
    const prof = [[0.001, 0], [0.55, 0.02], [0.95, 0.06], [1.25, 0.13], [1.42, 0.24], [1.45, 0.34], [1.32, 0.5], [1.0, 0.66], [0.62, 0.8], [0.34, 0.9], [0.2, 0.97], [0.001, 1.0]];
    const body = new THREE.LatheGeometry(prof.map(([r, t]) => new THREE.Vector2(r, t * L)), 14);
    body.scale(1, 1, 0.78); body.rotateX(Math.PI / 2); body.translate(0, 1.15, -L / 2); // axis along +z (head at -z)
    const belly = new THREE.LatheGeometry(prof.slice(1, 9).map(([r, t]) => new THREE.Vector2(r * 0.97, t * L)), 14, Math.PI * 0.62, Math.PI * 0.76);
    belly.scale(1, 1, 0.79); belly.rotateX(Math.PI / 2); belly.translate(0, 1.13, -L / 2);
    const fluke = new THREE.BoxGeometry(5.2, 0.16, 1.3); fluke.translate(0, 1.15, L / 2 + 0.2);
    const dors = new THREE.ConeGeometry(0.55, 0.9, 4); dors.scale(0.3, 1, 1); dors.translate(0, 1.15 + 1.0, L * 0.22);
    const fl1 = new THREE.BoxGeometry(2.4, 0.12, 0.6); fl1.rotateY(0.5); fl1.rotateZ(-0.3); fl1.translate(1.6, 0.55, -L * 0.18);
    const fl2 = new THREE.BoxGeometry(2.4, 0.12, 0.6); fl2.rotateY(-0.5); fl2.rotateZ(0.3); fl2.translate(-1.6, 0.55, -L * 0.18);
    const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(cx, PZ, cz);
    for (const [g, mat] of [[body, WH], [belly, WB], [fluke, WH], [dors, WH], [fl1, WH], [fl2, WH]]) { g.applyMatrix4(m); K.add(mat, g); }
    colliders.push({ type: 'cyl', x: cx, z: cz, r: 1.3, y0: PZ, y1: PZ + 2.3 });
    for (const t of [-0.3, 0.3]) colliders.push({ type: 'cyl', x: cx + Math.sin(yaw) * t * L * -1, z: cz + Math.cos(yaw) * t * L, r: 1.2, y0: PZ, y1: PZ + 2.2 });
    interactions.push({ id: 'pheena', pos: [cx + 2.5, PZ + 1, cz], radius: 4, label: 'Pheena, the life-size fin whale' });
  }
  // giant DNA double helix ("horizontal ladder" kids climb through)
  {
    const BB = plainMat(0xf2f2ee, { roughness: 0.45 }), C1 = plainMat(0xd8402f, { roughness: 0.5 }), C2 = plainMat(0x2f74c0, { roughness: 0.5 }), C3 = plainMat(0xf2b62b, { roughness: 0.5 });
    const L = 10.5, R0 = 1.25, turns = 1.25, cx = -14, cz = -46, yaw = THREE.MathUtils.degToRad(70), yc = PZ + 1.55;
    const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(cx, yc, cz);
    for (const ph of [0, Math.PI]) {
      const pts = []; for (let i = 0; i <= 48; i++) { const t = i / 48; const a = ph + t * turns * Math.PI * 2; pts.push(new THREE.Vector3((t - 0.5) * L, Math.sin(a) * R0, Math.cos(a) * R0)); }
      const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.13, 6, false); tg.applyMatrix4(m); K.add(BB, tg);
    }
    const nR = 16;
    for (let i = 0; i < nR; i++) {
      const t = (i + 0.5) / nR; const a = t * turns * Math.PI * 2; const x = (t - 0.5) * L;
      for (const [sgn, mat] of [[1, [C1, C2, C3][i % 3]], [-1, [C3, C1, C2][i % 3]]]) {
        const g = new THREE.CylinderGeometry(0.075, 0.075, R0, 6); g.translate(0, R0 / 2, 0);
        g.applyMatrix4(new THREE.Matrix4().makeRotationX(-(a) + Math.PI / 2 * 0 ));
        g.rotateX(Math.PI / 2); // align with +z first
        g.applyMatrix4(new THREE.Matrix4().makeRotationX(0));
        const dir = new THREE.Vector3(0, Math.sin(a) * sgn, Math.cos(a) * sgn).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        const gg = new THREE.CylinderGeometry(0.075, 0.075, R0, 6); gg.rotateX(Math.PI / 2); gg.translate(0, 0, R0 / 2);
        gg.applyQuaternion(q); gg.translate(x, 0, 0); gg.applyMatrix4(m); K.add(mat, gg);
        g.dispose();
      }
    }
    // feet
    for (const x of [-L * 0.42, 0, L * 0.42]) { const p = new THREE.Vector3(x, 0, 0).applyMatrix4(new THREE.Matrix4().makeRotationY(yaw)); K.box(M.iron, cx + p.x - 0.1, PZ, cz + p.z - 0.1, cx + p.x + 0.1, yc - R0 + 0.1, cz + p.z + 0.1); }
    colliders.push({ type: 'cyl', x: cx, z: cz, r: 1.0, y0: PZ, y1: PZ + 3 });
    interactions.push({ id: 'dna', pos: [cx, PZ + 1, cz + 2], radius: 4, label: 'The giant DNA double helix' });
  }
  // lamp standards + square concrete kiosks/planters at the plaza edge
  for (const [x, z] of [[-6, -10], [8, -10], [-20, -40], [18, -40], [-28, -6], [26, -6]]) {
    K.cyl(M.blackPaint, x, PZ, z, 0.08, 0.06, 4.2, 8, { detail: true });
    K.box(M.lampGlow, x - 0.18, PZ + 4.2, z - 0.18, x + 0.18, PZ + 4.55, z + 0.18, { detail: true });
  }
  for (const [x, z] of [[-30, -48], [26, -50], [-36, -22], [35, -26]]) { K.box(CON, x - 1.5, PZ, z - 1.5, x + 1.5, PZ + 1.0, z + 1.5); K.box(M.soil, x - 1.3, PZ + 1.0, z - 1.3, x + 1.3, PZ + 1.03, z + 1.3); colliders.push(K.colPoly(ring4(x - 1.5, z - 1.5, x + 1.5, z + 1.5), PZ - 0.5, PZ + 1.0)); }

  const object3d = K.finish();
  object3d.name = 'lawrence-hall-of-science';
  return { object3d, colliders, walkables, interactions };
}
