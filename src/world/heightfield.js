// Terrain height sampling across three nested grids: core (1 m LiDAR), mid (10 m), far (200 m).
export class Grid {
  constructor(data, x0, z0, step, nx, nz) { Object.assign(this, { data, x0, z0, step, nx, nz }); this.x1 = x0 + (nx - 1) * step; this.z1 = z0 + (nz - 1) * step; }
  contains(x, z, m = 0) { return x >= this.x0 + m && x <= this.x1 - m && z >= this.z0 + m && z <= this.z1 - m; }
  sample(x, z) {
    let fx = (x - this.x0) / this.step, fz = (z - this.z0) / this.step;
    fx = Math.max(0, Math.min(this.nx - 1.0001, fx)); fz = Math.max(0, Math.min(this.nz - 1.0001, fz));
    const j = Math.floor(fx), i = Math.floor(fz), u = fx - j, v = fz - i, k = i * this.nx + j, d = this.data;
    return (d[k] * (1 - u) + d[k + 1] * u) * (1 - v) + (d[k + this.nx] * (1 - u) + d[k + this.nx + 1] * u) * v;
  }
  normal(x, z, out, e = this.step) {
    const hx = this.sample(x + e, z) - this.sample(x - e, z), hz = this.sample(x, z + e) - this.sample(x, z - e);
    out.set(-hx, 2 * e, -hz).normalize(); return out;
  }
}
export class HeightField {
  constructor(core, mid, far) { this.core = core; this.mid = mid; this.far = far; this.blend = 40; }
  heightAt(x, z) {
    const c = this.core;
    if (c.contains(x, z)) {
      // blend into mid grid near the core border so the seam is continuous
      const d = Math.min(x - c.x0, c.x1 - x, z - c.z0, c.z1 - z);
      const hc = c.sample(x, z);
      if (d >= this.blend || !this.mid) return hc;
      return hc; // core is authoritative; the mid mesh samples core values along the seam
    }
    if (this.mid && this.mid.contains(x, z)) return this.mid.sample(x, z);
    if (this.far) return this.far.sample(x, z);
    return 0;
  }
}
