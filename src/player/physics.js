// Collision world: vertical-prism walls (2D segments with y ranges), cylinders, and walkable surfaces above terrain.
export class Physics {
  constructor(heightAt) {
    this.heightAt = heightAt; this.cell = 8; this.segs = []; this.circles = []; this.walk = []; this.grid = new Map(); this.walkGrid = new Map(); this.holes = [];
  }
  _key(i, j) { return i * 73856093 ^ j * 19349663; }
  _cells(x0, z0, x1, z1, fn) {
    const c = this.cell; const i0 = Math.floor(x0 / c), i1 = Math.floor(x1 / c), j0 = Math.floor(z0 / c), j1 = Math.floor(z1 / c);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 4000) return;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) fn(this._key(i, j));
  }
  addRing(ring, y0, y1, tag) {
    for (let k = 0; k < ring.length; k++) { const a = ring[k], b = ring[(k + 1) % ring.length]; this.addSeg(a[0], a[1], b[0], b[1], y0, y1, tag); }
  }
  addSeg(ax, az, bx, bz, y0, y1, tag) {
    const s = { ax, az, bx, bz, y0, y1, tag }; const id = this.segs.length; this.segs.push(s);
    this._cells(Math.min(ax, bx) - 1, Math.min(az, bz) - 1, Math.max(ax, bx) + 1, Math.max(az, bz) + 1, (k) => { let l = this.grid.get(k); if (!l) this.grid.set(k, (l = [])); l.push(id); });
  }
  addCircle(x, z, r, y0, y1, tag) {
    const id = -1 - this.circles.length; this.circles.push({ x, z, r, y0, y1, tag });
    this._cells(x - r - 1, z - r - 1, x + r + 1, z + r + 1, (k) => { let l = this.grid.get(k); if (!l) this.grid.set(k, (l = [])); l.push(id); });
  }
  addHole(pts, tag) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); } this.holes.push({ pts, b: [x0, z0, x1, z1], tag }); }
  inHole(x, z) { for (const h of this.holes) { if (h.dead || x < h.b[0] || x > h.b[2] || z < h.b[1] || z > h.b[3]) continue; if (inRing(x, z, h.pts)) return true; } return false; }
  removeTag(tag) { for (const h of this.holes) if (h.tag === tag) h.dead = true; for (const s of this.segs) if (s.tag === tag) { s.y0 = Infinity; s.y1 = -Infinity; } for (const c of this.circles) if (c.tag === tag) { c.y0 = Infinity; c.y1 = -Infinity; } for (const w of this.walk) if (w.tag === tag) w.dead = true; }
  // new-buildings: switch a tag's wall/cylinder colliders off and back on (used to drop a procedural stand-in's walls while the
  // hand-built landmark that replaces it is loaded; removeTag() is permanent, this is reversible)
  suspendTag(tag, off) { for (const s of [...this.segs, ...this.circles]) { if (s.tag !== tag) continue; if (off && !s._sus) { s._sus = [s.y0, s.y1]; s.y0 = Infinity; s.y1 = -Infinity; } else if (!off && s._sus) { s.y0 = s._sus[0]; s.y1 = s._sus[1]; s._sus = null; } } }
  addBox(minx, miny, minz, maxx, maxy, maxz, tag) { this.addRing([[minx, minz], [maxx, minz], [maxx, maxz], [minx, maxz]], miny, maxy, tag); }
  // walkable: {type:'poly', pts, y} or {type:'fn', bounds:[x0,z0,x1,z1], heightAt}
  addWalkable(w) {
    const id = this.walk.length; this.walk.push(w);
    let b; if (w.type === 'poly') { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of w.pts) { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); } b = [x0, z0, x1, z1]; } else b = w.bounds;
    w._b = b;
    this._cells(b[0], b[1], b[2], b[3], (k) => { let l = this.walkGrid.get(k); if (!l) this.walkGrid.set(k, (l = [])); l.push(id); });
  }
  // highest surface at (x,z) that is <= maxY (feet + step). Returns {y, onWalk}
  groundAt(x, z, maxY = Infinity) {
    let y = this.holes.length && this.inHole(x, z) ? -1e9 : this.heightAt(x, z), on = null;
    const l = this.walkGrid.get(this._key(Math.floor(x / this.cell), Math.floor(z / this.cell)));
    if (l) for (const id of l) {
      const w = this.walk[id]; if (w.dead) continue; const b = w._b; if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
      let wy = null;
      if (w.type === 'poly') { if (inRing(x, z, w.pts)) wy = w.y; } else { wy = w.heightAt(x, z); }
      if (wy != null && wy <= maxY && wy > y) { y = wy; on = w; }
    }
    if (y < -1e8) y = this.heightAt(x, z) - 30; // inside a terrain hole with no walkable: fall-through guard
    return { y, on };
  }
  // push a cylinder (x,z,r) at height [y, y+h] out of walls. Returns corrected [x,z] and whether it collided.
  resolve(x, z, r, y, h) {
    let hit = false;
    for (let it = 0; it < 4; it++) {
      let moved = false;
      const i0 = Math.floor((x - r) / this.cell), i1 = Math.floor((x + r) / this.cell), j0 = Math.floor((z - r) / this.cell), j1 = Math.floor((z + r) / this.cell);
      const seen = new Set();
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const l = this.grid.get(this._key(i, j)); if (!l) continue;
        for (const id of l) {
          if (seen.has(id)) continue; seen.add(id);
          if (id >= 0) {
            const s = this.segs[id]; if (y + h < s.y0 || y + 0.35 > s.y1) continue;
            const dx = s.bx - s.ax, dz = s.bz - s.az, L = dx * dx + dz * dz;
            let t = L ? ((x - s.ax) * dx + (z - s.az) * dz) / L : 0; t = Math.max(0, Math.min(1, t));
            const cx = s.ax + t * dx, cz = s.az + t * dz; let ex = x - cx, ez = z - cz; const d = Math.hypot(ex, ez);
            if (d < r) { if (d < 1e-6) { ex = -dz; ez = dx; const l2 = Math.hypot(ex, ez) || 1; ex /= l2; ez /= l2; } else { ex /= d; ez /= d; } x = cx + ex * r; z = cz + ez * r; moved = hit = true; }
          } else {
            const c = this.circles[-1 - id]; if (y + h < c.y0 || y + 0.35 > c.y1) continue;
            let ex = x - c.x, ez = z - c.z; const d = Math.hypot(ex, ez), R = r + c.r;
            if (d < R) { if (d < 1e-6) { ex = 1; ez = 0; } else { ex /= d; ez /= d; } x = c.x + ex * R; z = c.z + ez * R; moved = hit = true; }
          }
        }
      }
      if (!moved) break;
    }
    return [x, z, hit];
  }
  // distance along a horizontal ray from (x,z) dir (dx,dz) until a wall at height y (for camera collision)
  rayWall(x, z, y, dx, dz, maxD) {
    let best = maxD; const steps = Math.ceil(maxD / this.cell) + 1; const seen = new Set();
    for (let k = 0; k <= steps; k++) {
      const px = x + dx * k * this.cell, pz = z + dz * k * this.cell;
      for (let oi = -1; oi <= 1; oi++) for (let oj = -1; oj <= 1; oj++) {
        const l = this.grid.get(this._key(Math.floor(px / this.cell) + oi, Math.floor(pz / this.cell) + oj)); if (!l) continue;
        for (const id of l) {
          if (id < 0 || seen.has(id)) continue; seen.add(id); const s = this.segs[id]; if (y < s.y0 || y > s.y1) continue;
          const t = segRay(x, z, dx, dz, s.ax, s.az, s.bx, s.bz); if (t != null && t < best) best = t;
        }
      }
    }
    return best;
  }
}
function segRay(ox, oz, dx, dz, ax, az, bx, bz) {
  const ex = bx - ax, ez = bz - az; const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) return null;
  const t = ((ax - ox) * ez - (az - oz) * ex) / den; const u = ((ax - ox) * dz - (az - oz) * dx) / den;
  return t >= 0 && u >= 0 && u <= 1 ? t : null;
}
export function inRing(x, z, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; }
