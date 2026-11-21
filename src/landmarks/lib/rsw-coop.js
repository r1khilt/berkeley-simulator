// Berkeley Simulator — refine-south-west helpers for the Southside co-op garden apartments (Rochdale Village, Fenwick).
// Built on coop-kit's CoopKit (does not modify it): entry doors onto the walkway-balconies (with porch lights and unit
// numbers), an open steel stair at one end of each walkway run, and foundation planting along the exposed bases.
import * as THREE from 'three';
import { CoopKit } from './coop-kit.js';
import { shrubRow, bikeRack, bins } from './rsw-site.js';

// bay centres along a visible face segment, mirroring CoopKit._buildBlock's window layout
function bayCentres(s0, s1, bay) { const len = s1 - s0; const nb = Math.max(len > 1.6 ? 1 : 0, Math.round(len / bay)); const cs = []; for (let k = 0; k < nb; k++) cs.push(s0 + len * (k + 0.5) / nb); return cs; }

// Mark door bays on walkway faces before gardenApartments() builds: every `every`-th bay skips its windows
export function doorBays(rects, { every = 3, offset = 1 } = {}) {
  const skip = []; for (let k = 0; k < 40; k++) if ((k + offset) % every === 0) skip.push(k); // CoopKit's per-face window `skip` list
  return rects.map((r) => (r.walk ? { ...r, faces: { ...(r.faces || {}), [r.walk]: { ...((r.faces || {})[r.walk] || {}), skip } } } : r));
}

// After gardenApartments(): doors at the skipped bays (all floors), lights, stairs, planting, bikes/bins.
export function coopFinish(K, blocks, style, opts = {}) {
  const M = K.M; const door = opts.door || M.woodDark; const trim = style.trim || M.whitePaint; const bay = style.bay ?? 3.4;
  const every = opts.every ?? 3, offset = opts.offset ?? 1;
  const stairMat = opts.stair || style.rail || M.iron;
  for (const b of blocks) {
    if (!b.walk) continue;
    const f = b.walk; const R = K.faceRun(b, f);
    for (let i = 0; i < b.floors.length - 1; i++) {
      const y = b.floors[i];
      const vis = CoopKit.subtract(R.L, K.covered(b, f, y + 0.2, y + 2.4));
      for (const [s0, s1] of vis) {
        const cs = bayCentres(s0, s1, bay);
        cs.forEach((c, k) => {
          if ((k + offset) % every !== 0) return;
          const w = 0.95, h = 2.15; const a = c - w / 2, z = c + w / 2;
          if (y < K.gR(R, c, 0.8) + 0.05 && i === 0) return;
          K.rbox(R, trim, a - 0.1, y, 0.0, z + 0.1, y + h + 0.1, 0.05);           // casing
          K.rbox(R, door, a, y + 0.01, 0.05, z, y + h, 0.09);                      // leaf
          K.rbox(R, M.iron, z - 0.17, y + 0.95, 0.09, z - 0.12, y + 1.05, 0.13, { detail: true }); // handle
          K.rbox(R, M.lampGlow, z + 0.2, y + 2.0, 0.05, z + 0.32, y + 2.18, 0.14, { detail: true }); // porch light
          if (i === 0) { const gl = K.gR(R, c, 1.0); if (y - gl > 0.08) K.rbox(R, M.concrete, a - 0.4, gl - 0.5, 0.0, z + 0.4, y, 1.1); }
        });
      }
    }
    // open stair at the walkway's far end: straight flights along the face, outside the walkway depth
    if (opts.stairs === true && b.floors.length > 2) { // experimental, off by default
      const dp = style.walkDepth ?? 1.4; const vis0 = CoopKit.subtract(R.L, K.covered(b, f, b.floors[1] - 0.2, b.floors[1] + 1.0));
      const seg = vis0.find(([p, q]) => q - p >= 3); if (seg) {
        const sEnd = seg[1]; const yTop = b.floors[b.floors.length - 2]; const g0 = K.gR(R, sEnd + 1.2, dp * 0.5);
        const rise = yTop - g0; const n = Math.max(4, Math.round(rise / 0.18)); const tr = 0.27; const runL = n * tr;
        if (runL < 9 && sEnd + 0.2 + 1.15 < R.L + 6) {
          // a stair tower of short flights beside the walkway end, perpendicular-free: zig-zag in place (2 flights per storey)
          const sx = sEnd + 0.15, w = 1.1;
          const stCount = b.floors.length - 2;
          for (let st = 0; st < stCount; st++) {
            const ya = st === 0 ? g0 : b.floors[st], yb = b.floors[st + 1]; const m = Math.max(3, Math.round((yb - ya) / 0.18)); const half = Math.ceil(m / 2);
            for (let k = 0; k < m; k++) { const yy = ya + (yb - ya) * (k + 1) / m; const dd = k < half ? dp - (k + 1) * (dp / half) : (k - half) * (dp / (m - half)); 
              K.rbox(R, stairMat, sx, yy - 0.05, Math.max(0.05, dd - 0.15), sx + w, yy, Math.max(0.2, dd + 0.15), { detail: true }); }
            K.rbox(R, style.slab || M.concrete, sx, yb - 0.2, 0.0, sx + w, yb, dp);
          }
          for (const dd of [0.05, dp - 0.05]) K.rbox(R, stairMat, sx + w - 0.05, g0 - 0.2, dd - 0.04, sx + w + 0.03, yTop + 1.05, dd + 0.04);
          K.rbox(R, stairMat, sx + w - 0.02, yTop + 1.0, 0.05, sx + w + 0.02, yTop + 1.06, dp, { detail: true });
        }
      }
    }
  }
  // foundation planting on exposed faces that are near grade (not the walkway faces)
  if (opts.plant !== false) {
    let seed = 1;
    for (const b of blocks) for (const f of ['N', 'E', 'S', 'W']) {
      if (f === b.walk) continue; const R = b['run' + f] || K.faceRun(b, f);
      const vis = CoopKit.subtract(R.L, K.covered(b, f, b.floors[0], b.floors[0] + 1.0));
      for (const [s0, s1] of vis) { if (s1 - s0 < 2.5) continue; seed++;
        if (seed % 3 === 0) continue; // leave some faces bare (paths, utility access)
        const gfn = (s, d) => K.gR(R, s, d);
        if (Math.abs(gfn((s0 + s1) / 2, 0.8) - b.floors[0]) > 1.4) continue;
        shrubRow(K, R, s0 + 0.4, s1 - 0.4, 0.75, gfn, { r: 0.5, gap: 0.95, seed, hexes: opts.shrubHexes || [0x4f6b3a, 0x5d7a40, 0x46613a, 0x6a7d48] });
      }
    }
  }
  // bikes + bins by the first walkway block's stair end
  if (opts.bikes !== false) { const b = blocks.find((x) => x.walk); if (b) { const R = K.faceRun(b, b.walk); const s = Math.min(R.L - 2.5, 3.0); const gl = K.gR(R, s, 2.6); bikeRack(K, R, s, 2.6, gl, 4, { pitch: 0.85 }); bins(K, R, s + 3.2, 2.2, K.gR(R, s + 3.2, 2.2)); } }
}
