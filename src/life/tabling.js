// Campus life: Sproul Plaza tabling. Student-org folding tables with draped cloths and printed banners, some pop-up
// canopies and A-frame boards, lined up along both edges of the walkway from Sather Gate to Bancroft. Static merged
// geometry (vertex colours + one banner atlas); `core` tables also appear on weekends, `extra` ones on weekdays only.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// [name, sub line, background, text colour] (fictional-but-plausible Berkeley student orgs)
const CLUBS = [
  ['CAL HIKING', '& Outdoor Society', '#2f5d3a', '#f4efe2'], ['BERKELEY MOCK TRIAL', 'join us!', '#1d2f5c', '#fdb515'], ['BOBA CLUB', 'free tasting today', '#f2c6d4', '#5a2340'],
  ['CAL ROCKETRY', 'build. launch. repeat.', '#151a24', '#ff7a3d'], ['DATA SCIENCE SOCIETY', 'info session 7pm', '#003262', '#ffffff'], ['CAL BHANGRA', 'auditions open', '#f0a018', '#2a1408'],
  ['HABITAT FOR HUMANITY', 'Cal Chapter', '#0d5c8f', '#ffffff'], ['PRE-MED SOCIETY', 'MCAT study groups', '#7b1e2b', '#f6e7d0'], ['CAL SKI & BOARD', 'Tahoe trips', '#e8eef4', '#103a6b'],
  ['ASUC ELECTIONS', 'VOTE', '#fdb515', '#003262'], ['TAIKO', 'drum with us', '#b01c1c', '#fff4e0'], ['WOMEN IN CS', 'mentorship', '#5b2a86', '#ffffff'],
  ['CHESS CLUB', 'all levels', '#e9e4d8', '#1b1b1b'], ['CLIMATE ACTION', 'Bay Area', '#2e7d4f', '#eaf7ec'], ['FORMULA RACING', 'Berkeley FSAE', '#111111', '#e8c547'], ['DANCE MARATHON', 'For The Kids', '#e94e77', '#ffffff'],
  ['CAL ANIME', 'weekly screenings', '#283a9e', '#ffd84a'], ['FILM SOCIETY', 'shoot your story', '#2b2b2b', '#e5e1d8'], ['CAL TRIATHLON', 'swim bike run', '#0a6e8a', '#ffffff'], ['COFFEE CLUB', 'free pour-over', '#5c3b26', '#f3e3c8'],
];
function atlasTexture() {
  const W = 1024, H = 640, cw = 256, ch = 128; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  CLUBS.forEach(([name, sub, bg, fg], i) => {
    const x = (i % 4) * cw, y = Math.floor(i / 4) * ch;
    g.fillStyle = bg; g.fillRect(x, y, cw, ch);
    g.strokeStyle = fg; g.globalAlpha = 0.5; g.lineWidth = 3; g.strokeRect(x + 7, y + 7, cw - 14, ch - 14); g.globalAlpha = 1;
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 54; g.font = `bold ${fs}px Helvetica, Arial, sans-serif`; while (g.measureText(name).width > cw - 22 && fs > 16) { fs -= 2; g.font = `bold ${fs}px Helvetica, Arial, sans-serif`; }
    g.fillText(name, x + cw / 2, y + ch * 0.4);
    g.font = `italic bold 22px Georgia, serif`; g.fillText(sub, x + cw / 2, y + ch * 0.77);
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t;
}
const hex = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
class MB { // merge builder: vertex colours, optional uv
  constructor() { this.parts = []; }
  add(g, col) { g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count; const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.set(col, i * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2)); this.parts.push(g); }
  build() { return this.parts.length ? mergeGeometries(this.parts) : null; }
}
const place = (g, x, y, z, yaw) => { g.rotateY(yaw); g.translate(x, y, z); return g; };
// pleated cloth panel (w wide, h tall, n folds) hanging in the x-y plane, facing -z; bottom edge flares out by `flare`
function pleat(w, h, n, depth, flare) {
  const pos = [], idx = []; const cols = n * 2;
  for (let i = 0; i <= cols; i++) for (let j = 0; j <= 1; j++) { const x = -w / 2 + (w * i) / cols, yy = j * h; const zz = (i % 2 ? depth : -depth) * (1 - j * 0.6) - (1 - j) * flare; pos.push(x, yy, zz); }
  for (let i = 0; i < cols; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const rot = (lx, lz, yaw) => [lx * Math.cos(yaw) + lz * Math.sin(yaw), -lx * Math.sin(yaw) + lz * Math.cos(yaw)];

// line: Sproul centreline [[x,z]...]; heightAt; ok(x,z,r) -> bool site test (paved, clear of trees/footprints)
export function buildTabling({ line, heightAt, ok, rand = Math.random }) {
  const atlas = atlasTexture();
  const fabric = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, name: 'life:tablecloth' }); // double-sided: canopy roofs are seen from below
  const metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.6, name: 'life:tablemetal' });
  const banner = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.85, metalness: 0, name: 'life:banner' });
  const sets = { core: { f: new MB(), m: new MB(), b: new MB() }, extra: { f: new MB(), m: new MB(), b: new MB() } };
  const tables = [];
  // walk the centreline
  const segs = []; let S = 0; for (let k = 0; k < line.length - 1; k++) { const [x0, z0] = line[k], [x1, z1] = line[k + 1]; const L = Math.hypot(x1 - x0, z1 - z0); segs.push({ x0, z0, dx: (x1 - x0) / L, dz: (z1 - z0) / L, s0: S, L }); S += L; }
  const at = (s) => { for (const g of segs) if (s <= g.s0 + g.L) { const u = s - g.s0; return [g.x0 + g.dx * u, g.z0 + g.dz * u, g.dx, g.dz]; } const g = segs[segs.length - 1]; return [g.x0 + g.dx * g.L, g.z0 + g.dz * g.L, g.dx, g.dz]; };
  let club = Math.floor(rand() * CLUBS.length);
  for (let s = 9; s < S - 6; s += 2.42) {
    const [cx, cz, dx, dz] = at(s); const rx = -dz, rz = dx; // right of travel (heading south: west side is +right? right = (-dz, dx))
    for (const side of [-1, 1]) {
      if (rand() < 0.2) continue; // natural gaps
      // offset: upper plaza tables line the walk at ~5 m; lower plaza: push toward the building edge if there's room
      let off = 4.15 + rand() * 0.3;
      if (cz > 292) off = 5.2 + rand() * 0.5; // lower plaza: rows along the walk, clear of the MLK / Sproul Hall tree lines
      // nudge along the walk / outward until the spot clears trees, side paths and buildings
      let x = 0, z = 0, found = false;
      for (const [ds, dof] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.45], [0.9, 0], [-0.9, 0], [0.5, 0.45], [-0.5, 0.45], [0, -0.35]]) {
        const [qx, qz] = at(s + ds); x = qx + rx * side * (off + dof); z = qz + rz * side * (off + dof);
        if (ok(x, z, 1.05) && !tables.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 2.05 * 2.05)) { found = true; break; }
      }
      if (!found) continue;
      const yaw = Math.atan2(-rx * side, -rz * side) + (rand() - 0.5) * 0.06; // local -z (front, banner side) faces the walkway
      const core = rand() < 0.45; const set = sets[core ? 'core' : 'extra'];
      const c = CLUBS[club % CLUBS.length], ci = club % CLUBS.length; club += 1 + Math.floor(rand() * 3);
      const y = heightAt(x, z), clothCol = hex(c[2]);
      // folding table 1.83 x 0.76 x 0.74 with a cloth draped to 8 cm off the ground at the front and sides
      set.f.add(place(new THREE.BoxGeometry(1.86, 0.03, 0.79), x, y + 0.745, z, yaw), clothCol);
      set.f.add(place(pleat(1.86, 0.68, 16, 0.012, 0.025).translate(0, 0.07, -0.397), x, y, z, yaw), clothCol);
      for (const sx of [-1, 1]) { const sd = pleat(0.79, 0.68, 6, 0.01, 0.02); sd.rotateY(sx * Math.PI / 2); sd.translate(sx * 0.932, 0.07, 0); set.f.add(place(sd, x, y, z, yaw), clothCol); }
      for (const [lx, lz] of [[-0.85, 0.33], [0.85, 0.33]]) { const leg = new THREE.CylinderGeometry(0.014, 0.014, 0.73, 5); leg.translate(lx, 0.365, lz); set.m.add(place(leg, x, y, z, yaw), hex('#8d9196')); }
      // printed banner taped over the cloth front (atlas cell ci)
      const cell = (g2) => { const u0 = (ci % 4) / 4, v1 = 1 - Math.floor(ci / 4) * (128 / 640), v0 = v1 - 128 / 640; const uv = g2.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * 0.25, v0 + uv.getY(i) * (v1 - v0)); return g2; };
      const bg = cell(new THREE.PlaneGeometry(1.62, 0.53)); bg.rotateY(Math.PI); bg.translate(0, 0.44, -0.43);
      set.b.add(place(bg, x, y, z, yaw), [1, 1, 1]);
      // table-top clutter: flyer stacks, a candy bowl, sometimes a tri-fold board or laptop
      for (let k = 0; k < 3; k++) { const a = (rand() - 0.5) * 0.4, fx0 = -0.6 + k * 0.42 + rand() * 0.1, fz0 = -0.17 + rand() * 0.08; const fl = new THREE.BoxGeometry(0.22, 0.02, 0.28); fl.rotateY(a); fl.translate(fx0, 0.77, fz0); set.f.add(place(fl, x, y, z, yaw), hex('#f2efe8'));
        const top = cell(new THREE.PlaneGeometry(0.28, 0.2)); top.rotateX(-Math.PI / 2); top.rotateY(a + Math.PI / 2 * (k === 1 ? 0 : 1)); top.translate(fx0, 0.781, fz0); if (k !== 1) top.scale(1, 1, 1); set.b.add(place(top, x, y, z, yaw), [1, 1, 1]); }
      if (rand() < 0.55) { const bowl = new THREE.CylinderGeometry(0.11, 0.07, 0.08, 8); bowl.translate(0.55, 0.8, 0.05); set.f.add(place(bowl, x, y, z, yaw), hex(['#e04b3a', '#f1c232', '#3b7dd8'][Math.floor(rand() * 3)])); }
      if (rand() < 0.5) { // tri-fold poster board on one end of the table (printed with the club's artwork)
        const bx = rand() < 0.5 ? -0.5 : 0.5;
        for (const [px, a] of [[-0.3, 0.5], [0, 0], [0.3, -0.5]]) { const pb = new THREE.BoxGeometry(0.3, 0.45, 0.008); pb.rotateY(a); pb.translate(bx + px * 0.95, 0.99, 0.2 - Math.abs(px) * 0.18); set.f.add(place(pb, x, y, z, yaw), hex('#f4f1ea'));
          const pp = cell(new THREE.PlaneGeometry(0.27, 0.2)); pp.rotateY(Math.PI); pp.translate(0, 0.04, -0.006); pp.rotateY(a); pp.translate(bx + px * 0.95, 0.99, 0.2 - Math.abs(px) * 0.18); set.b.add(place(pp, x, y, z, yaw), [1, 1, 1]); }
      } else if (rand() < 0.4) { const lb = new THREE.BoxGeometry(0.34, 0.015, 0.24); lb.translate(-0.1, 0.77, 0.12); set.m.add(place(lb, x, y, z, yaw), hex('#b9bcc0')); const ls = new THREE.BoxGeometry(0.34, 0.23, 0.012); ls.rotateX(-0.25); ls.translate(-0.1, 0.885, 0.235); set.m.add(place(ls, x, y, z, yaw), hex('#2a2c30')); }
      // 10x10 ft pop-up canopy over some tables
      const canopy = rand() < (cz > 292 ? 0.38 : 0.22);
      if (canopy) {
        const cc = rand() < 0.5 ? clothCol : hex(['#ffffff', '#1d4f91', '#c62828', '#2e7d32', '#fdb515', '#3b3b3b'][Math.floor(rand() * 6)]);
        const H = 2.25, hw = 1.5, oz = 0.35;
        for (const [lx, lz] of [[-hw, -hw], [hw, -hw], [-hw, hw], [hw, hw]]) { const p = new THREE.BoxGeometry(0.035, H, 0.035); p.translate(lx, H / 2, lz + oz); set.m.add(place(p, x, y, z, yaw), hex('#b5b8bc')); }
        const roof = new THREE.ConeGeometry(hw * Math.SQRT2, 0.6, 4, 1, true); roof.rotateY(Math.PI / 4); roof.translate(0, H + 0.3, oz); set.f.add(place(roof, x, y, z, yaw), cc);
        for (const [lx, lz, a] of [[0, -hw, 0], [0, hw, 0], [-hw, 0, Math.PI / 2], [hw, 0, Math.PI / 2]]) { const v = new THREE.BoxGeometry(hw * 2, 0.22, 0.01); v.rotateY(a); v.translate(lx, H - 0.08, lz + oz); set.f.add(place(v, x, y, z, yaw), cc); }
        const cb = cell(new THREE.PlaneGeometry(1.3, 0.5)); cb.rotateY(Math.PI); cb.translate(0, H - 0.45, -hw + oz - 0.012); set.b.add(place(cb, x, y, z, yaw), [1, 1, 1]); // club banner hung from the front valance
      }
      // A-frame sandwich board out in front of a third of the tables
      if (rand() < 0.33) {
        const ax = (rand() - 0.5) * 1.2, az = -1.25; const [wx, wz] = rot(ax, az, yaw);
        const ay = yaw + (rand() < 0.5 ? 0 : Math.PI / 2);
        for (const a of [0.2, -0.2]) { const p = new THREE.BoxGeometry(0.6, 0.85, 0.02); p.translate(0, 0.42, 0); p.rotateX(a); p.translate(0, 0, a > 0 ? -0.17 : 0.17); set.f.add(place(p, x + wx, y, z + wz, ay), hex(c[2]));
          const face = cell(new THREE.PlaneGeometry(0.56, 0.36)); if (a > 0) face.rotateY(Math.PI); face.translate(0, 0.52, a > 0 ? -0.012 : 0.012); face.rotateX(a); face.translate(0, 0, a > 0 ? -0.17 : 0.17); set.b.add(place(face, x + wx, y, z + wz, ay), [1, 1, 1]); }
      }
      let chair = null;
      if (rand() < 0.4) { // folding chair behind the table for a seated tabler
        const lx = rand() < 0.5 ? -0.45 : 0.45, cz0 = 0.68; const ch = hex('#3c3f44');
        const seat = new THREE.BoxGeometry(0.42, 0.03, 0.4); seat.translate(lx, 0.45, cz0); set.m.add(place(seat, x, y, z, yaw), ch);
        const back = new THREE.BoxGeometry(0.42, 0.3, 0.025); back.rotateX(-0.1); back.translate(lx, 0.75, cz0 + 0.2); set.m.add(place(back, x, y, z, yaw), ch);
        for (const [px, pz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.2], [0.19, 0.2]]) { const lg = new THREE.CylinderGeometry(0.011, 0.011, 0.45, 4); lg.translate(lx + px, 0.225, cz0 + pz); set.m.add(place(lg, x, y, z, yaw), hex('#9a9da1')); }
        chair = { lx, lz: cz0 };
      }
      tables.push({ x, z, y, yaw, core, canopy, club: c[0], chair });
    }
  }
  const group = new THREE.Group(); group.name = 'life:tabling';
  const out = { group, tables, core: new THREE.Group(), extra: new THREE.Group() };
  for (const k of ['core', 'extra']) {
    const g = out[k]; g.name = 'tabling:' + k; group.add(g);
    const st = sets[k];
    for (const [mb, mat, cast] of [[st.f, fabric, true], [st.m, metal, true], [st.b, banner, false]]) { const geo = mb.build(); if (!geo) continue; geo.computeBoundingSphere(); const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; g.add(m); }
  }
  return out;
}
