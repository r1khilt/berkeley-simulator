// World queries for the grappling hook (see grapple.js).
// - castCoarse(): a cheap ray cast against the physics collision data (vertical wall prisms, cylinders, walkable decks,
//   solid building tops) plus the terrain heightfield. Tens of microseconds, so the crosshair can run it every frame.
// - refine(): an exact ray cast against the visible meshes of nearby landmarks / procedural buildings, only on fire.
// - A solid-prism index rebuilt from physics.segs lets the swing land on roofs and never leave the player inside a building.
import * as THREE from 'three';
import { inRing } from '../physics.js';

const CELL = 16; // prism grid cell (m)
const key = (i, j) => i * 73856093 ^ j * 19349663;
const _v = new THREE.Vector3(), _ray = new THREE.Ray();

export class GrappleWorld {
  constructor({ physics, scene, lm }) {
    this.ph = physics; this.scene = scene; this.lm = lm;
    this.prisms = []; this.pgrid = new Map(); this.nSeg = 0; this.lmVersion = ''; this.hidden = new Set();
    this.raycaster = new THREE.Raycaster(); this.bboxCache = new WeakMap(); this.bgroup = null;
    this._tmp = []; this._tmp2 = []; this._seen = new Set(); this._seenP = new Set(); this._seenW = new Set(); this._syncs = 0;
    this.sync();
  }
  // ---------------------------------------------------------------- prism index
  // physics.addRing() pushes one segment per edge, in order, so consecutive segments that chain back to their start form
  // one closed ring. Procedural buildings (tag = OSM id) group outer + hole rings into one prism (even-odd fill); each
  // landmark ring is its own prism.
  sync() {
    const segs = this.ph.segs, n = segs.length;
    let i = this.nSeg;
    while (i < n) {
      const s0 = segs[i]; const ring = [[s0.ax, s0.az]]; let j = i, closed = false;
      while (j < n) {
        const s = segs[j];
        if (s.bx === s0.ax && s.bz === s0.az) { closed = true; j++; break; }
        ring.push([s.bx, s.bz]);
        const t = segs[j + 1];
        if (!t || t.tag !== s0.tag || t.ax !== s.bx || t.az !== s.bz || t.y0 !== s0.y0 || t.y1 !== s0.y1) { j++; break; }
        j++;
      }
      if (closed && ring.length >= 3) this._addRing(ring, s0);
      i = Math.max(j, i + 1);
    }
    this.nSeg = n;
    // landmarks stream in and out; every so often drop the volumes of unloaded ones from the index
    if (++this._syncs % 900 === 0) { let dead = 0; for (const pr of this.prisms) if (pr.seg.y0 === Infinity) dead++; if (dead > 1500) this._compact(); }
    // landmark stand-ins: hidden OSM boxes whose colliders stay in physics; ignore them for roofs and inside tests
    const placed = this.lm ? this.lm.placed : [];
    const ver = placed.length + ':' + (placed.length ? placed[placed.length - 1].id : '');
    if (ver !== this.lmVersion) { this.lmVersion = ver; this.hidden = new Set(); for (const l of placed) for (const r of l.replaces || []) this.hidden.add(r); }
  }
  _addRing(ring, s0) {
    const tag = s0.tag, isLm = typeof tag === 'string' && tag.startsWith('lm:');
    const last = this.prisms[this.prisms.length - 1];
    if (!isLm && last && last.tag === tag && last.y0 === s0.y0 && last.y1 === s0.y1) { last.rings.push(ring); return; } // courtyard hole
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9, a = 0;
    for (let k = 0; k < ring.length; k++) { const p = ring[k], q = ring[(k + 1) % ring.length]; x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); a += p[0] * q[1] - q[0] * p[1]; }
    a = Math.abs(a / 2);
    const pr = { rings: [ring], tag, lm: isLm, y0: s0.y0, y1: s0.y1, b: [x0, z0, x1, z1], area: a, seg: s0, solid: true, idx: this.prisms.length };
    // landmark rings: only compact, tall rings are solid volumes (not stadium bowls, fences, kerbs or walled terraces)
    if (isLm) pr.solid = a >= 0.8 && a <= 6000 && s0.y1 - s0.y0 >= 2.5 && !this._hasWalkInside(pr);
    else pr.solid = a >= 1;
    this.prisms.push(pr);
    for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
      const k = key(i, j); let l = this.pgrid.get(k); if (!l) this.pgrid.set(k, (l = [])); l.push(pr.idx);
    }
  }
  _compact() {
    const keep = this.prisms.filter((pr) => pr.seg.y0 !== Infinity); this.prisms = []; this.pgrid = new Map();
    for (const pr of keep) { pr.idx = this.prisms.length; this.prisms.push(pr);
      for (let i = Math.floor(pr.b[0] / CELL); i <= Math.floor(pr.b[2] / CELL); i++) for (let j = Math.floor(pr.b[1] / CELL); j <= Math.floor(pr.b[3] / CELL); j++) { const k = key(i, j); let l = this.pgrid.get(k); if (!l) this.pgrid.set(k, (l = [])); l.push(pr.idx); } }
  }
  _hasWalkInside(pr) {
    for (const w of this.ph.walk) {
      if (w.dead || w.tag !== pr.tag) continue; const b = w._b; if (!b) continue;
      const cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2;
      const wy = w.type === 'poly' ? w.y : w.heightAt(cx, cz);
      if (wy != null && wy > pr.y0 + 0.5 && wy < pr.y1 - 0.5 && inRing(cx, cz, pr.rings[0])) return true;
    }
    return false;
  }
  alive(pr) { return pr.seg.y0 !== Infinity && !this.hidden.has(pr.tag); }
  inside(pr, x, z) {
    const b = pr.b; if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) return false;
    let c = false; for (const r of pr.rings) if (inRing(x, z, r)) c = !c; return c;
  }
  // solid prisms whose footprint contains (x,z)
  prismsAt(x, z, out = []) {
    out.length = 0; const l = this.pgrid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))); if (!l) return out;
    for (const id of l) { const pr = this.prisms[id]; if (pr.solid && this.alive(pr) && this.inside(pr, x, z)) out.push(pr); }
    return out;
  }
  // highest solid top within [yLo, yHi] under (x,z): roofs the swing can land on
  topIn(x, z, yLo, yHi) {
    let best = null; for (const pr of this.prismsAt(x, z, this._tmp)) if (pr.y1 >= yLo && pr.y1 <= yHi && (!best || pr.y1 > best.y1)) best = pr;
    return best;
  }
  // a solid prism the body span [yLo, yHi] is buried in (not just standing on its top)
  buriedIn(x, z, yLo, yHi, margin = 0.3) {
    for (const pr of this.prismsAt(x, z, this._tmp2)) if (yLo < pr.y1 - margin && yHi > pr.y0 + margin) return pr;
    return null;
  }
  // closest point just outside a prism's footprint (for un-sticking)
  exitPoint(pr, x, z, r) {
    let bd = Infinity, bx = x, bz = z;
    for (const ring of pr.rings) for (let k = 0; k < ring.length; k++) {
      const a = ring[k], b = ring[(k + 1) % ring.length]; const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
      let t = L ? ((x - a[0]) * dx + (z - a[1]) * dz) / L : 0; t = Math.max(0, Math.min(1, t));
      const cx = a[0] + t * dx, cz = a[1] + t * dz, d = Math.hypot(x - cx, z - cz);
      if (d < bd) {
        bd = d; const len = Math.sqrt(L) || 1; let nx = dz / len, nz = -dx / len; // edge normal, flipped to point outside
        if (this.inside(pr, cx + nx * 0.05, cz + nz * 0.05)) { nx = -nx; nz = -nz; }
        bx = cx + nx * (r + 0.1); bz = cz + nz * (r + 0.1);
      }
    }
    return [bx, bz, bd];
  }
  // nearest spot outside every solid volume for a body spanning [y0, y1]: the prism's own nearest edge first, then a
  // widening ring search (handles clusters of touching blocks)
  freePoint(pr, x, z, y0, y1, r) {
    const ok = (px, pz) => !this.buriedIn(px, pz, y0, y1) && !this.ph.resolve(px, pz, r, y0, y1 - y0)[2];
    const e = this.exitPoint(pr, x, z, r); if (ok(e[0], e[1])) return e;
    for (let d = 1; d <= 40; d += 1) for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (ok(px, pz)) return [px, pz, d]; }
    return e;
  }
  // ---------------------------------------------------------------- coarse ray cast
  // o, d: origin and unit direction (THREE.Vector3). Returns {t, p, n, kind, tag} or null.
  castCoarse(o, d, tMin, tMax) {
    const ph = this.ph; let best = tMax, hit = null;
    // terrain: adaptive march + bisection
    const hAt = ph.heightAt; let tPrev = tMin;
    if (o.y + d.y * tMin > hAt(o.x + d.x * tMin, o.z + d.z * tMin)) for (let t = tMin; t < best + 0.6;) {
      const tt = Math.min(t, best), dy = o.y + d.y * tt - hAt(o.x + d.x * tt, o.z + d.z * tt);
      if (dy <= 0) { let a = tPrev, b = tt; for (let k = 0; k < 10; k++) { const m = (a + b) / 2; if (o.y + d.y * m - hAt(o.x + d.x * m, o.z + d.z * m) > 0) a = m; else b = m; } best = b; hit = { t: b, kind: 'terrain', tag: 'terrain' }; break; }
      if (tt >= best) break;
      tPrev = tt; t = tt + Math.max(0.5, Math.min(4, dy * 0.5));
    }
    // walls + cylinders: grid walk over the physics cells (8 m)
    const seen = this._seen; seen.clear();
    this._dda(o, d, tMin, () => best, ph.cell, (ci, cj) => {
      const l = ph.grid.get(ph._key(ci, cj)); if (!l) return;
      for (const id of l) {
        if (seen.has(id)) continue; seen.add(id);
        if (id >= 0) {
          const s = ph.segs[id]; if (s.y1 < s.y0 || this.hidden.has(s.tag)) continue; // stand-ins hidden behind a landmark
          const ex = s.bx - s.ax, ez = s.bz - s.az, den = d.x * ez - d.z * ex; if (Math.abs(den) < 1e-9) continue;
          const t = ((s.ax - o.x) * ez - (s.az - o.z) * ex) / den, u = ((s.ax - o.x) * d.z - (s.az - o.z) * d.x) / den;
          if (t < tMin || t >= best || u < 0 || u > 1) continue;
          const y = o.y + d.y * t; if (y < s.y0 || y > s.y1) continue;
          let nx = ez, nz = -ex; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl; if (nx * d.x + nz * d.z > 0) { nx = -nx; nz = -nz; }
          best = t; hit = { t, kind: 'wall', tag: s.tag, n: [nx, 0, nz] };
        } else {
          const c = ph.circles[-1 - id]; if (c.y1 < c.y0 || c.tag === 'tree') continue;
          const fx = o.x - c.x, fz = o.z - c.z, A = d.x * d.x + d.z * d.z; if (A < 1e-12) continue;
          const Bq = 2 * (fx * d.x + fz * d.z), Cq = fx * fx + fz * fz - c.r * c.r, disc = Bq * Bq - 4 * A * Cq; if (disc < 0) continue;
          const t = (-Bq - Math.sqrt(disc)) / (2 * A); if (t < tMin || t >= best) continue;
          const y = o.y + d.y * t; if (y < c.y0 || y > c.y1) continue;
          const px = o.x + d.x * t - c.x, pz = o.z + d.z * t - c.z, pl = Math.hypot(px, pz) || 1;
          best = t; hit = { t, kind: 'cyl', tag: c.tag, n: [px / pl, 0, pz / pl] };
        }
      }
    });
    // tree crowns (the hook grabs a branch inside the canopy)
    if (this.tgrid) {
      const T = this.trees, c = this._c || (this._c = [0, 0, 0, 0]), seenT = this._seenT || (this._seenT = new Set()); seenT.clear();
      this._dda(o, d, tMin, () => best, CELL, (ci, cj) => {
        { const l = this.tgrid.get(key(ci, cj)); if (!l) return;
          for (const i of l) {
            if (seenT.has(i)) continue; seenT.add(i); this._crown(T, i, c);
            const fx = o.x - c[0], fy = o.y - c[1], fz = o.z - c[2], b = fx * d.x + fy * d.y + fz * d.z, cc = fx * fx + fy * fy + fz * fz - c[3] * c[3], disc = b * b - cc;
            if (disc < 0) continue; const t = -b - Math.sqrt(disc); if (t < tMin || t >= best) continue;
            best = t; hit = { t, kind: 'tree', tag: 'tree', n: [(o.x + d.x * t - c[0]) / c[3], (o.y + d.y * t - c[1]) / c[3], (o.z + d.z * t - c[2]) / c[3]], tree: i, centre: [c[0], c[1], c[2]] };
          }
        }
      });
    }
    // flat tops seen from above: solid roofs and walkable decks
    if (d.y < -1e-4) {
      const seenP = this._seenP; seenP.clear();
      this._dda(o, d, tMin, () => best, CELL, (ci, cj) => {
        const l = this.pgrid.get(key(ci, cj)); if (!l) return;
        for (const id of l) {
          if (seenP.has(id)) continue; seenP.add(id); const pr = this.prisms[id]; if (!pr.solid || !this.alive(pr)) continue;
          const t = (pr.y1 - o.y) / d.y; if (t < tMin || t >= best) continue;
          if (!this.inside(pr, o.x + d.x * t, o.z + d.z * t)) continue;
          best = t; hit = { t, kind: 'roof', tag: pr.tag, n: [0, 1, 0], prism: pr };
        }
      });
      const seenW = this._seenW; seenW.clear();
      this._dda(o, d, tMin, () => best, ph.cell, (ci, cj) => {
        const l = ph.walkGrid.get(ph._key(ci, cj)); if (!l) return;
        for (const id of l) {
          if (seenW.has(id)) continue; seenW.add(id); const w = ph.walk[id]; if (w.dead || w.type !== 'poly' || w.tag === 'grapple-perch') continue;
          const t = (w.y - o.y) / d.y; if (t < tMin || t >= best) continue;
          const x = o.x + d.x * t, z = o.z + d.z * t, b = w._b; if (x < b[0] || x > b[2] || z < b[1] || z > b[3] || !inRing(x, z, w.pts)) continue;
          best = t; hit = { t, kind: 'deck', tag: w.tag, n: [0, 1, 0] };
        }
      });
    }
    if (!hit) return null;
    hit.p = [o.x + d.x * hit.t, o.y + d.y * hit.t, o.z + d.z * hit.t];
    if (hit.kind === 'tree') for (let k = 0; k < 3; k++) hit.p[k] += (hit.centre[k] - hit.p[k]) * 0.45;
    if (!hit.n) { // terrain normal from central differences
      const e = 0.8, h0 = hAt(hit.p[0] - e, hit.p[2]), h1 = hAt(hit.p[0] + e, hit.p[2]), h2 = hAt(hit.p[0], hit.p[2] - e), h3 = hAt(hit.p[0], hit.p[2] + e);
      _v.set(h0 - h1, 2 * e, h2 - h3).normalize(); hit.n = [_v.x, _v.y, _v.z];
    }
    return hit;
  }
  // grid traversal (Amanatides & Woo) of the ray's xz projection; stops once the next cell starts beyond limit()
  _dda(o, d, tMin, limit, C, visit) {
    const x = o.x + d.x * tMin, z = o.z + d.z * tMin; let ci = Math.floor(x / C), cj = Math.floor(z / C);
    if (Math.hypot(d.x, d.z) < 1e-6) { visit(ci, cj); return; }
    const sx = d.x > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
    const tdx = d.x !== 0 ? Math.abs(C / d.x) : Infinity, tdz = d.z !== 0 ? Math.abs(C / d.z) : Infinity;
    let tmx = d.x !== 0 ? tMin + (d.x > 0 ? (ci + 1) * C - x : x - ci * C) / Math.abs(d.x) : Infinity;
    let tmz = d.z !== 0 ? tMin + (d.z > 0 ? (cj + 1) * C - z : z - cj * C) / Math.abs(d.z) : Infinity;
    let tEnter = tMin;
    for (let k = 0; k < 400 && tEnter <= limit(); k++) {
      visit(ci, cj);
      if (tmx < tmz) { tEnter = tmx; tmx += tdx; ci += sx; } else { tEnter = tmz; tmz += tdz; cj += sz; }
    }
  }
  // ---------------------------------------------------------------- exact refine against visible meshes
  // Runs progressively (a time budget per frame) while the hook is in the air, nearest candidates first, so firing never
  // stalls a frame even next to a 200k-triangle landmark.
  _buildings() { if (!this.bgroup || !this.bgroup.parent) this.bgroup = this.scene.getObjectByName('buildings'); return this.bgroup; }
  _worldBox(m) {
    let b = this.bboxCache.get(m); if (b) return b;
    if (m.isInstancedMesh) { if (!m.boundingBox) m.computeBoundingBox(); b = m.boundingBox.clone(); }
    else { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); b = m.geometry.boundingBox.clone(); }
    m.updateWorldMatrix(true, false); b.applyMatrix4(m.matrixWorld); this.bboxCache.set(m, b); return b;
  }
  // entry distance of the ray segment [tMin, tMax] into a box, or null
  _enter(job, b) {
    if (b.containsPoint(_v.copy(job.d).multiplyScalar(job.tMin).add(job.o))) return job.tMin;
    _ray.origin.copy(job.o); _ray.direction.copy(job.d);
    if (!_ray.intersectBox(b, _v)) return null; const t = _v.distanceTo(job.o); return t <= job.tMax ? Math.max(t, job.tMin) : null;
  }
  // background warm-up, a slice per frame until done: building chunk boxes, then the tree-crown index
  warm() {
    const bg = this._buildings();
    if (bg && !this._boxesDone) { const ms = bg.children; for (let k = 0; k < ms.length; k++) { const m = ms[k]; if (m.isMesh && !this.bboxCache.has(m)) { this._worldBox(m); return; } } this._boxesDone = true; }
    const T = window.BSIM && window.BSIM.trees; if (!T || !T.px) { this.warmDone = !!this._boxesDone; return; }
    if (!this._tg) this._tg = { grid: new Map(), i: 0 };
    const tg = this._tg, n = T.px.length, end = Math.min(n, tg.i + 6000);
    const c = [0, 0, 0, 0];
    for (let i = tg.i; i < end; i++) {
      const h = T.ht[i]; if (h < 7 || (T.hidden && T.hidden.has(i))) continue;
      this._crown(T, i, c); // register in every cell the crown overlaps
      for (let a = Math.floor((c[0] - c[3]) / CELL); a <= Math.floor((c[0] + c[3]) / CELL); a++) for (let b = Math.floor((c[2] - c[3]) / CELL); b <= Math.floor((c[2] + c[3]) / CELL); b++) {
        const k = key(a, b); let l = tg.grid.get(k); if (!l) tg.grid.set(k, (l = [])); l.push(i);
      }
    }
    tg.i = end; if (end >= n) { this.trees = T; this.tgrid = tg.grid; this.warmDone = true; }
  }
  // a tree crown as a sphere: centre near the top of the tree, radius from the crown size
  _crown(T, i, out) { const h = T.ht[i], rc = Math.max(1.0, Math.min(T.rad[i], h * 0.35) * 0.72); out[0] = T.px[i]; out[1] = T.py[i] + h - rc * 1.05; out[2] = T.pz[i]; out[3] = rc; return out; }
  startRefine(o, d, tMin, tMax) {
    const job = { o: o.clone(), d: d.clone(), tMin, tMax, list: [], best: null, done: false, ms: 0 };
    const hl = Math.hypot(d.x, d.z);
    if (this.lm) for (const l of this.lm.placed) {
      if (!l.obj) continue; // landmark bounding cylinder (anchor, r + margin) vs the ray's xz projection
      const r = (l.r || 25) + 25, fx = o.x - l.anchor.x, fz = o.z - l.anchor.z;
      let te = null;
      if (hl < 1e-6) { if (fx * fx + fz * fz <= r * r) te = tMin; }
      else { const A = d.x * d.x + d.z * d.z, Bq = 2 * (fx * d.x + fz * d.z), Cq = fx * fx + fz * fz - r * r, disc = Bq * Bq - 4 * A * Cq;
        if (disc >= 0) { const sq = Math.sqrt(disc), t0 = (-Bq - sq) / (2 * A), t1 = (-Bq + sq) / (2 * A); if (t1 >= tMin && t0 <= tMax) te = Math.max(t0, tMin); } }
      if (te != null) job.list.push({ t: te, lm: l });
    }
    const bg = this._buildings();
    if (bg) for (const m of bg.children) {
      if (m.isMesh) { const te = this._enter(job, this._worldBox(m)); if (te != null) job.list.push({ t: te, mesh: m }); }
      else if (m.visible) for (const s of m.children) if (s.isMesh && s.visible) { const te = this._enter(job, this._worldBox(s)); if (te != null) job.list.push({ t: te, mesh: s }); }
    }
    job.list.sort((a, b) => a.t - b.t);
    return job;
  }
  stepRefine(job, budgetMs = 2) {
    if (job.done) return true;
    const t0 = performance.now(), rc = this.raycaster;
    rc.ray.origin.copy(job.o); rc.ray.direction.copy(job.d); rc.near = job.tMin; rc.far = job.tMax;
    while (job.list.length) {
      const c = job.list[0];
      if (job.best && job.best.distance <= c.t) { job.list.length = 0; break; } // nothing nearer is left
      job.list.shift();
      if (c.lm) { // expand a landmark into its visible meshes
        if (!c.lm.obj) continue; const add = [];
        c.lm.obj.traverseVisible((m) => { if (m.isMesh && !m.userData.shadowProxy) { const te = this._enter(job, this._worldBox(m)); if (te != null) add.push({ t: te, mesh: m }); } });
        if (add.length) { job.list.push(...add); job.list.sort((a, b) => a.t - b.t); }
      } else {
        const hits = rc.intersectObject(c.mesh, false);
        for (const h of hits) { if (h.distance >= job.tMin && h.distance <= job.tMax) { if (!job.best || h.distance < job.best.distance) job.best = h; break; } }
      }
      if (performance.now() - t0 > budgetMs) break;
    }
    job.ms += performance.now() - t0;
    if (!job.list.length) job.done = true;
    return job.done;
  }
  result(job) {
    const h = job.best; if (!h) return null;
    const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    if (n.dot(job.d) > 0) n.negate();
    return { t: h.distance, p: h.point.toArray(), n: n.toArray(), kind: 'mesh', object: h.object };
  }
  // synchronous version (tests / tools)
  refine(o, d, tMin, tMax) { const job = this.startRefine(o, d, tMin, tMax); while (!this.stepRefine(job, 1e9)); return this.result(job); }
}
