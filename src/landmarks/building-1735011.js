// Redwood Gardens (1986), 2951 Derby Street: a 169-unit senior-housing complex built in Spanish Colonial Revival dress on
// the former California School for the Blind grounds (site of the school's kitchen/dining building), now ringed by
// UC Berkeley's Clark Kerr Campus. Three-storey cream-stucco wings with low red barrel-tile hip roofs and square stucco
// chimneys wrap a large garden courtyard (redwoods); a one-storey common-room wing with French doors faces the lawn.
// Massing from the 2021 LiDAR: eaves ~12.4–13.4 m (abs), ridges ~16–17 m, wings 15–17 m deep, roof rise/run ~0.45.
import * as THREE from 'three';
import { CKKit } from './lib/clarkkerr-kit.js';

export const info = {
  id: 'building-1735011',
  name: 'Redwood Gardens',
  subtitle: 'Senior apartments · 1986',
  blurb: 'A 169-unit senior housing complex in Spanish-style stucco and red tile at 2951 Derby Street, built in the 1980s on the grounds of the former California School for the Blind and surrounded by the Clark Kerr Campus.',
  replaces: ['r/1735011'],
};

export async function build(ctx) {
  const K = new CKKit(ctx, -3.7); const C = K.C;
  const med = (w) => { const a = []; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) a.push(K.g(w.u0 + (w.u1 - w.u0) * (0.15 + 0.7 * i / 4), w.v0 + (w.v1 - w.v0) * (0.15 + 0.7 * j / 4))); a.sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  const gmin = (w) => K.gMin(w.u0, w.v0, w.u1, w.v1, 8);
  const W = [
    { id: 'F', u0: 37.6, u1: 54.6, v0: -29.6, v1: 15.6, eave: 13.3, slope: 0.42 },
    { id: 'E', u0: 13.4, u1: 46.1, v0: -29.4, v1: -13.7, eave: 13.3, slope: 0.45, roof: { ends: { u1: 'open' } } },
    { id: 'G', u0: -4.4, u1: 37.6, v0: 11.0, v1: 26.4, eave: 13.3, slope: 0.45 },
    { id: 'D', u0: -22.0, u1: 13.4, v0: -25.3, v1: -7.5, eave: 12.6, slope: 0.45 },
    { id: 'C', u0: -48.0, u1: -22.0, v0: -19.5, v1: -2.9, eave: 12.6, slope: 0.45 },
    { id: 'A', u0: -51.5, u1: -38.2, v0: -10.2, v1: 15.2, eave: 12.6, slope: 0.45 },
    { id: 'H', u0: -38.2, u1: -4.4, v0: 15.4, v1: 31.0, eave: 12.6, slope: 0.45 },
    { id: 'SW', u0: -47.8, u1: -38.2, v0: 24.0, v1: 31.0, eave: 9.9, slope: 0.45 },
  ];
  for (const w of W) { w.FL = med(w) + 0.15; w.y0 = gmin(w) - 1.2; w.roof = { type: 'hip', ov: 0.55, ...(w.roof || {}) }; }
  // one-storey common-room wing on the courtyard side of the south range
  const H = W.find((w) => w.id === 'H');
  const K1 = { id: 'K1', u0: -36.0, u1: -8.0, v0: 9.6, v1: 15.4, slope: 0.45 };
  K1.FL = med(K1) + 0.1; K1.y0 = gmin(K1) - 1.0; K1.eave = K1.FL + 3.9; K1.roof = { type: 'hip', slope: 0.45, ov: 0.5 };
  W.push(K1);

  // façades: bronze aluminium sliders on three floors, glazed entries on the courtyard, arched stair windows at wing ends
  const face = (w, f, R, s0, s1) => {
    const L = s1 - s0; if (L < 1.2) return {};
    if (w.id === 'K1') {
      if (f === 'S') return false;
      const ops = K.bays(s0, s1, { bay: 3.3, edge: 0.7, floors: [{ y: w.FL + 0.05, h: 2.45, w: 1.8, kind: 'french', panes: [4, 5], sill: false }] });
      return { ops };
    }
    const span = w.eave - w.FL; const fh = Math.min(3.0, (span - 0.55) / 3);
    const floors = [0, 1, 2].map((k) => ({ y: w.FL + 0.9 + k * fh, h: 1.3, w: 1.65, kind: 'slider' }));
    const courtyard = (w.id === 'F' && f === 'W') || (w.id === 'E' && f === 'S') || (w.id === 'D' && f === 'S') || (w.id === 'C' && f === 'S') || (w.id === 'A' && f === 'E') || (w.id === 'H' && f === 'N') || (w.id === 'G' && f === 'N');
    const n = Math.max(1, Math.round((L - 1.6) / 3.9));
    const doors = [];
    if (courtyard && n >= 5) for (let i = 2; i < n - 1; i += 5) doors.push({ i, y: w.FL + 0.02, h: 2.5, w: 1.9, kind: 'glassdoor', transom: 2.2 });
    if (!courtyard && n >= 7 && (f === 'S' || f === 'E')) doors.push({ i: Math.floor(n / 2), y: w.FL + 0.02, h: 2.5, w: 1.9, kind: 'glassdoor', transom: 2.2 });
    const ops = K.bays(s0, s1, { n, edge: 0.8, floors, doors }); for (const o of ops) if (o.kind === 'slider') o.glass = C.glassBlind;
    // short end walls: arched stair window stack in the middle
    if (L < 19 && n >= 3) {
      const c = (s0 + s1) / 2; for (let k = ops.length - 1; k >= 0; k--) if (Math.abs((ops[k].s0 + ops[k].s1) / 2 - c) < 1.0) ops.splice(k, 1);
      ops.push({ s0: c - 0.55, s1: c + 0.55, y0: w.FL + 1.6 + fh, y1: w.FL + 1.6 + fh + 1.9, arch: true, kind: 'casement', panes: [2, 4] });
      ops.push({ s0: c - 0.95, s1: c + 0.95, y0: w.FL + 0.02, y1: w.FL + 2.5, kind: 'glassdoor', transom: 2.2, sill: false });
    }
    // water-table band and entry surrounds (side effects on the run)
    K.rbox(R, C.concDark, s0, w.FL - 0.35, -0.05, s1, w.FL + 0.05, 0.03);
    for (const o of ops) if (o.kind === 'glassdoor') { K.rbox(R, C.trim, o.s0 - 0.22, w.FL - 0.02, 0, o.s0, o.y1 + 0.22, 0.08); K.rbox(R, C.trim, o.s1, w.FL - 0.02, 0, o.s1 + 0.22, o.y1 + 0.22, 0.08); K.rbox(R, C.trim, o.s0 - 0.22, o.y1, 0, o.s1 + 0.22, o.y1 + 0.22, 0.08); }
    return { ops };
  };
  K.wingGroup(W, face);

  // chimneys on the ridges (square stucco stacks with tile caps; positions from LiDAR peaks)
  const chim = [['E', 26.0], ['D', -6.0], ['C', -33.0], ['H', -20.0], ['G', 14.0]];
  for (const [id, u] of chim) {
    const w = W.find((x) => x.id === id); const vm = (w.v0 + w.v1) / 2; const half = (w.v1 - w.v0) / 2 + 0.45;
    const yr = w.eave + 0.16 - 0.45 * w.slope + half * w.slope; K.chimney(u, vm - 1.6, yr - 2.5, yr + 1.5, { w: 1.3, d: 1.3 });
  }
  { const w = W.find((x) => x.id === 'F'); const um = (w.u0 + w.u1) / 2, half = (w.u1 - w.u0) / 2 + 0.45; const yr = w.eave + 0.16 - 0.45 * w.slope + half * w.slope; for (const v of [-4]) K.chimney(um + 1.6, v, yr - 2.5, yr + 1.5, { w: 1.3 }); }
  { const w = W.find((x) => x.id === 'A'); const um = (w.u0 + w.u1) / 2, half = (w.u1 - w.u0) / 2 + 0.45; const yr = w.eave + 0.16 - 0.45 * w.slope + half * w.slope; K.chimney(um - 1.6, 2.0, yr - 2.5, yr + 1.5, { w: 1.3 }); }

  // black steel railing along the common-room terrace + quarry-tile terrace
  {
    const y = K1.FL + 0.02; K.box(C.floor, K1.u0, y - 1.0, K1.v0 - 2.6, K1.u1, y, K1.v0);
    K.walkRect(K1.u0, K1.v0 - 2.6, K1.u1, K1.v0, y);
    const R = K.run([K1.u1, K1.v0 - 2.6], [K1.u0, K1.v0 - 2.6]);
    K.rbox(R, C.iron, 0, y + 0.95, -0.03, R.L, y + 1.0, 0.03, { detail: true });
    K.rbox(R, C.iron, 0, y + 0.08, -0.02, R.L, y + 0.12, 0.02, { detail: true });
    for (let s = 0.06; s < R.L; s += 0.13) if (Math.abs(s - R.L / 2) > 0.9) K.rbox(R, C.iron, s - 0.01, y + 0.1, -0.01, s + 0.01, y + 0.96, 0.01, { detail: true });
  }
  const object3d = K.finish();
  object3d.name = 'redwood-gardens';
  return { object3d, colliders: K.colliders, walkables: K.walkables };
}
