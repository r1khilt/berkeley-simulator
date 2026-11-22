// Instanced trees: 28k LiDAR-detected trees, species-assigned, 3 LODs, per-instance aerial-photo tint.
import * as THREE from 'three';
export const SPECIES_IDS = ['oak', 'plane', 'planePollard', 'redwood', 'eucalyptus', 'pine', 'cedar', 'cypress', 'deciduous', 'ginkgo', 'magnolia', 'bay', 'palm', 'shrub'];
const CELL = 96;
export function decodeTrees(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const n = dv.getUint32(0, true); let o = 4;
  const take = (Type, bytes) => { const a = new Type(buf.buffer.slice(buf.byteOffset + o, buf.byteOffset + o + n * bytes)); o += n * bytes; return a; };
  const x = take(Int16Array, 2), z = take(Int16Array, 2), y = take(Uint16Array, 2), h = take(Uint16Array, 2), r = take(Uint8Array, 1), sp = take(Uint8Array, 1), cr = take(Uint8Array, 1), cg = take(Uint8Array, 1), cb = take(Uint8Array, 1);
  remapSpecies({ n, x, z, h, sp });
  return { n, x, z, y, h, r, sp, cr, cg, cb };
}
// gfx-trees: the bake assigns 'deciduous' to ~35% of interior campus trees at random, which made late-November
// campus read as a New England autumn. The real core is dominated by evergreens (coast live oak, bay, redwood), so
// part of the interior 'deciduous' class is re-labelled oak / bay (deterministic per tree;
// city street trees are left alone). Done at decode so the leaf-litter map and colliders agree with what is drawn.
function remapSpecies(t) {
  const DEC = 8, OAK = 0, BAY = 11;
  // r4-trees: the London planes lining Sproul Plaza (Sather Gate to Bancroft) are pollarded, like the Campanile esplanade's
  for (let i = 0; i < t.n; i++) { if (t.sp[i] !== 1) continue; const x = t.x[i] / 10, z = t.z[i] / 10; if (x >= -170 && x <= -95 && z >= 232 && z <= 334) t.sp[i] = 2; }
  for (let i = 0; i < t.n; i++) {
    if (t.sp[i] !== DEC) continue;
    const x = t.x[i] / 10, z = t.z[i] / 10;
    const core = x >= -660 && x <= 420 && z >= -330 && z <= 230, hills = x > 300; // campus core, and the oak/bay/eucalyptus hills
    if (!(core || hills) || t.h[i] < 400) continue; // trees over 4 m
    const u = ((Math.sin(i * 78.233 + x * 0.917 + z * 0.311) * 43758.5453) % 1 + 1) % 1;
    if (u < 0.5) t.sp[i] = OAK; else if (u < 0.65) t.sp[i] = BAY;
  }
}
const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
export class TreeSystem {
  constructor({ lib, trees, refTint, lodDistances = [120, 600], maxDist = 4500, heroK = 0.3 }) {
    this.lib = lib; this.t = trees; this.lod = lodDistances; this.maxDist = maxDist;
    // r4-trees2: species may carry a hero LOD in front (lods = [hero, near, mid, far]); it takes over inside
    // heroK x the near distance (115 m -> ~35 m on high). LOD switches cross-fade with a screen-space dither.
    this.heroD = lodDistances[0] * heroK;
    this.group = new THREE.Group(); this.group.name = 'trees';
    const n = trees.n;
    // precompute matrices & colours
    this.mat = new Float32Array(n * 16); this.col = new Float32Array(n * 3); this.px = new Float32Array(n); this.pz = new Float32Array(n); this.py = new Float32Array(n); this.ht = new Float32Array(n); this.rad = new Float32Array(n);
    let mr = 0, mg = 0, mb = 0;
    for (let i = 0; i < n; i++) { mr += s2l(trees.cr[i]); mg += s2l(trees.cg[i]); mb += s2l(trees.cb[i]); }
    mr /= n; mg /= n; mb /= n;
    const ref = refTint || new THREE.Color(0.28, 0.32, 0.22);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    this.speciesOf = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const sid = SPECIES_IDS[trees.sp[i]] || 'deciduous';
      const spc = lib.species[sid] || lib.species.deciduous;
      const x = trees.x[i] / 10, z = trees.z[i] / 10, y = trees.y[i] / 100, h = Math.max(1.5, trees.h[i] / 100), r = Math.max(0.6, trees.r[i] / 10);
      this.px[i] = x; this.pz[i] = z; this.py[i] = y; this.ht[i] = h; this.rad[i] = r;
      const rot = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * Math.PI * 2;
      q.setFromAxisAngle(up, rot);
      let rr = r; if (h / (2 * r) > 6) rr = h / 12; // keep very thin crowns plausible
      const sx = rr / spc.normRadius;
      pos.set(x, y - 0.15, z); scl.set(sx, h, sx);
      m4.compose(pos, q, scl); m4.toArray(this.mat, i * 16);
      const k = (v, m, rf) => Math.max(rf * 0.55, Math.min(rf * 1.6, (v / m) * rf));
      this.col[i * 3] = k(s2l(trees.cr[i]), mr, ref.r); this.col[i * 3 + 1] = k(s2l(trees.cg[i]), mg, ref.g); this.col[i * 3 + 2] = k(s2l(trees.cb[i]), mb, ref.b);
      this.speciesOf[i] = trees.sp[i];
    }
    // spatial cells per species
    this.cells = new Map();
    for (let i = 0; i < n; i++) {
      const key = Math.floor(this.px[i] / CELL) + ',' + Math.floor(this.pz[i] / CELL);
      let c = this.cells.get(key); if (!c) { c = { idx: [], box: new THREE.Box3() }; this.cells.set(key, c); }
      c.idx.push(i); c.box.expandByPoint(new THREE.Vector3(this.px[i] - this.rad[i], this.py[i], this.pz[i] - this.rad[i])); c.box.expandByPoint(new THREE.Vector3(this.px[i] + this.rad[i], this.py[i] + this.ht[i], this.pz[i] + this.rad[i]));
    }
    for (const c of this.cells.values()) c.idx = Uint32Array.from(c.idx);
    // instanced meshes per species x lod
    this.meshes = {}; // sid -> [lod0Meshes[], lod1Meshes[], lod2Meshes[]]
    const count = new Map(); for (let i = 0; i < n; i++) count.set(this.speciesOf[i], (count.get(this.speciesOf[i]) || 0) + 1);
    for (const [spIdx, cnt] of count) {
      const sid = SPECIES_IDS[spIdx]; const spc = lib.species[sid] || lib.species.deciduous;
      const nL = spc.lods.length, shadowL = nL > 3 ? 1 : 0; // hero and near LODs cast shadows
      this.meshes[spIdx] = spc.lods.map((lod, li) => lod.parts.map((p) => {
        const m = new THREE.InstancedMesh(p.geometry, p.material, cnt);
        if (p.depthMaterial) m.customDepthMaterial = p.depthMaterial; if (p.distanceMaterial) m.customDistanceMaterial = p.distanceMaterial;
        m.castShadow = li <= shadowL; m.receiveShadow = true; m.frustumCulled = false; m.count = 0;
        // r4-trees2: per-instance LOD cross-fade (0 = solid; t > 0 fading in, -t fading out; see tree-shaders.js)
        const fa = new THREE.InstancedBufferAttribute(new Float32Array(cnt), 1); fa.setUsage(THREE.DynamicDrawUsage); p.geometry.setAttribute('aLodFade', fa); m.userData.fade = fa;
        m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cnt * 3), 3);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
        m.name = `trees:${sid}:lod${li}`;
        this.group.add(m); return m;
      }));
    }
    this._fr = new THREE.Frustum(); this._pm = new THREE.Matrix4(); this.lastPos = new THREE.Vector3(1e9, 0, 0); this.lastQ = new THREE.Quaternion(); this.counts = [0, 0, 0];
    this.hidden = new Set();
  }
  hideInPolys(polys) { // hide trees whose trunk lies inside (or within 1 m of) a landmark footprint
    const inR = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; };
    for (const fp of polys) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of fp) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
      for (let i = 0; i < this.t.n; i++) { const x = this.px[i], z = this.pz[i]; if (x < x0 - 1 || x > x1 + 1 || z < z0 - 1 || z > z1 + 1) continue; if (inR(x, z, fp)) this.hidden.add(i); } }
  }
  hideNear(pts, radius) { // hide trees inside hand-modelled landmark footprints, etc.
    for (let i = 0; i < this.t.n; i++) for (const [x, z, r] of pts) { if ((this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2 < (r || radius) ** 2) { this.hidden.add(i); break; } }
  }
  update(camera, force = false) {
    const cp = camera.position;
    if (!force && cp.distanceToSquared(this.lastPos) < 1.0 && camera.quaternion.angleTo(this.lastQ) < 0.02) return;
    this.lastPos.copy(cp); this.lastQ.copy(camera.quaternion);
    this._pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); this._fr.setFromProjectionMatrix(this._pm);
    // r4-trees2: N LODs per species with dithered cross-fade bands around every switch distance
    const D4 = [this.heroD, this.lod[0], this.lod[1]], D3 = [this.lod[0], this.lod[1]], dm = this.maxDist ** 2, fadeK = this.fadeK ?? 0.12;
    const nearSq = this.lod[0] ** 2;
    const fill = {}; for (const k in this.meshes) fill[k] = this.meshes[k].map(() => 0);
    const counts = [0, 0, 0, 0];
    const put = (s, l, i, fv) => {
      const slot = fill[s][l]++;
      for (const m of this.meshes[s][l]) { m.instanceMatrix.array.set(this.mat.subarray(i * 16, i * 16 + 16), slot * 16); m.instanceColor.array.set(this.col.subarray(i * 3, i * 3 + 3), slot * 3); m.userData.fade.array[slot] = fv; }
      counts[l]++;
    };
    for (const c of this.cells.values()) {
      const b = c.box;
      const dx = Math.max(b.min.x - cp.x, 0, cp.x - b.max.x), dz = Math.max(b.min.z - cp.z, 0, cp.z - b.max.z);
      const cd = dx * dx + dz * dz; if (cd > dm) continue;
      const inView = this._fr.intersectsBox(b);
      if (!inView && cd > nearSq) continue; // keep near trees (shadow casters) even when off-screen
      const idx = c.idx;
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k]; if (this.hidden.has(i)) continue;
        const ddx = this.px[i] - cp.x, ddz = this.pz[i] - cp.z, ddy = (this.py[i] + this.ht[i] * 0.5 - cp.y) * 0.5;
        const d = Math.sqrt(ddx * ddx + ddz * ddz + ddy * ddy);
        const s = this.speciesOf[i], ms = this.meshes[s], D = ms.length > 3 ? D4 : D3, sh = ms.length > 3 ? 1 : 0;
        let l = 0; while (l < D.length && d >= D[l]) l++;
        if (!inView) { if (l > sh) continue; put(s, sh, i, 0); continue; } // off-screen: shadow-only, cheapest shadow LOD
        // cross-fade: inside +-w of a switch distance the tree is drawn in both LODs with complementary dither masks
        let faded = false;
        for (let j = Math.max(0, l - 1); j <= Math.min(D.length - 1, l); j++) {
          const w = Math.max(2.5, D[j] * fadeK), t = (d - (D[j] - w)) / (2 * w);
          if (t > 0 && t < 1) { put(s, j, i, -t); put(s, j + 1, i, Math.max(t, 1e-3)); faded = true; break; }
        }
        if (!faded) put(s, l, i, 0);
      }
    }
    for (const k in this.meshes) this.meshes[k].forEach((parts, l) => parts.forEach((m) => { m.count = fill[k][l]; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.userData.fade.needsUpdate = true; m.instanceMatrix.clearUpdateRanges?.(); }));
    this.counts = counts;
  }
}
