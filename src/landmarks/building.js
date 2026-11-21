// Vista del Mar Girls' Residence (B-2, 1924): the first building completed for the separated California School for the
// Blind, facing Derby Street; now part of the Redwood Gardens complex (2951 Derby Street). Spanish Colonial Revival:
// a U-plan opening south to a garden court — two-storey north range and west wing under red barrel-tile hips, a lower
// one-storey east wing, cream stucco, steel multi-light casements, a round-arched loggia on the court side.
// Heights from the 2021 LiDAR (north ridge ~10 m, west ridge ~9 m, east wing ridge ~6.7 m, abs).
import * as THREE from 'three';
import { CKKit } from './lib/clarkkerr-kit.js';

export const info = {
  id: 'building',
  name: 'Vista del Mar',
  subtitle: 'California School for the Blind · 1924',
  blurb: 'Completed in 1924 as the Vista del Mar girls\u2019 residence, the first new building of the California School for the Blind after it separated from the School for the Deaf. It faces Derby Street and is now part of the Redwood Gardens senior housing complex.',
  replaces: ['w/128467238'],
};

export async function build(ctx) {
  const K = new CKKit(ctx, -3.4); const C = K.C;
  const FL = K.g(-5, 0) + 0.3; const y0 = K.gMin(-22.1, -10.4, 19.4, 12.8) - 1.3;
  const cas = (y, w, h, panes = [3, 4]) => ({ y, h, w, kind: 'casement', panes });
  const N = { u0: -22.1, u1: 12.5, v0: -8.1, v1: 3.3 }, W = { u0: -22.1, u1: -11.3, v0: -8.1, v1: 10.2 }, E1 = { u0: 12.5, u1: 19.4, v0: -10.4, v1: 12.8 }, E2 = { u0: 6.45, u1: 12.5, v0: -10.4, v1: -8.1 };
  const two = (w, f, R, s0, s1) => {
    const ops = K.bays(s0, s1, { bay: 3.2, edge: 0.8, floors: [cas(FL + 0.95, 1.1, 1.5), cas(FL + 3.9, 1.1, 1.35)] });
    return { ops };
  };
  K.wingGroup([
    { ...N, y0, eave: 7.55, slope: 0.4, roof: { type: 'hip', ov: 0.4 } },
    { ...W, y0, eave: 7.6, slope: 0.4, roof: { type: 'hip', ov: 0.4, ends: { v0: 'open' } } },
  ], (w, f, R, s0, s1) => {
    if (w === N && f === 'S') { // court side: ground floor behind the arcade, upper casements
      return { ops: [...K.bays(s0, s1, { bay: 3.2, edge: 0.8, floors: [cas(FL + 3.9, 1.1, 1.35)] }), ...K.bays(s0, s1, { bay: 3.2, edge: 0.8, floors: [{ y: FL + 0.02, h: 2.3, w: 1.3, kind: 'french', panes: [2, 5], sill: false }] }).filter((o, i) => i % 2 === 0)] };
    }
    if (w === W && f === 'S') { // street gable end toward Derby Street: arched entry + window above
      const c = (s0 + s1) / 2; return { ops: [{ s0: c - 0.9, s1: c + 0.9, y0: FL + 0.02, y1: FL + 2.9, arch: true, kind: 'door', transom: 2.1, rev: 0.35 }, { s0: c - 0.6, s1: c + 0.6, y0: FL + 3.9, y1: FL + 5.6, arch: true, kind: 'casement', panes: [3, 5] }, { s0: s0 + 1.2, s1: s0 + 2.3, y0: FL + 0.95, y1: FL + 2.45, kind: 'casement' }, { s0: s1 - 2.3, s1: s1 - 1.2, y0: FL + 0.95, y1: FL + 2.45, kind: 'casement' }] };
    }
    return two(w, f, R, s0, s1);
  });
  // one-storey east wing (and its north return), hip roofs
  K.wingGroup([
    { ...E1, y0, eave: 5.2, slope: 0.43, roof: { type: 'hip', ov: 0.35 } },
    { ...E2, y0, eave: 5.0, slope: 0.43, roof: { type: 'hip', ov: 0.35, ends: { u1: 'open' } } },
  ], (w, f, R, s0, s1) => {
    if (w === E2 && f === 'S') return false;
    if (w === E1 && f === 'W') return { ops: K.bays(s0, s1, { bay: 3.0, edge: 0.8, floors: [{ y: FL + 0.02, h: 2.3, w: 1.3, kind: 'french', panes: [2, 5], sill: false }] }) };
    return { ops: K.bays(s0, s1, { bay: 2.9, edge: 0.7, floors: [cas(FL + 0.95, 1.1, 1.45)] }) };
  });
  // round-arched loggia along the court side of the north range (between the wings)
  { const R = K.run([W.u1, N.v1], [7.4, N.v1]); K.loggia(R, 0.3, R.L - 0.2, { depth: 2.4, y: FL, h: 2.6, n: 7, arch: true, yHigh: 7.2 }); }
  // court-side lean-to porch on the east wing
  K.roofShed(7.6, 3.3, 12.5, 12.8, 3.4, 4.6, '-u', { ov: 0.3 });
  for (const v of [4.0, 8.0, 12.2]) K.box(C.wall, 7.75, FL, v - 0.18, 8.1, 3.3, v + 0.18);
  K.box(C.floor, 7.6, FL - 1, 3.3, 12.5, FL + 0.02, 12.8); K.walkRect(7.6, 3.3, 12.5, 12.8, FL + 0.02);
  // chimneys
  K.chimney(-6.0, -4.0, 7.5, 11.2, { w: 1.0 }); K.chimney(-17.0, 5.5, 7.5, 10.4, { w: 0.9 }); K.chimney(16.0, 2.0, 4.8, 7.6, { w: 0.8 });
  // garden wall + gate piers along the court opening (south)
  K.siteWall([[-11.0, 12.6], [-3.0, 12.6]], null, 0.9); K.siteWall([[1.5, 12.6], [7.4, 12.6]], null, 0.9);
  for (const u of [-3.0, 1.5]) K.box(C.wall, u - 0.3, K.g(u, 12.6) - 0.5, 12.3, u + 0.3, K.g(u, 12.6) + 1.6, 12.9);
  const object3d = K.finish();
  object3d.name = 'vista-del-mar';
  return { object3d, colliders: K.colliders, walkables: K.walkables };
}
