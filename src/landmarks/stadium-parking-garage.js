// Stadium Parking Garage (Maxwell Garage), beside California Memorial Stadium. A two-level precast garage dug into the
// slope above Piedmont Avenue, whose roof carries Maxwell Family Field, the artificial-turf practice field used by Cal
// football, field hockey and lacrosse. Exposed ~8 m on the Piedmont (south-west) side, near grade on Gridiron Way.
// Massing from the 2021 LiDAR: field ~7.4 m above the low corner. Roof kit: football lines, gold soccer/lacrosse
// lines, goals, chain-link + windscreen fence, tall ball nets at the ends, floodlights, scoreboard, stair block.
import * as THREE from 'three';
import { GarageKit, matColor, plainMat } from './lib/b06p-garage.js';
import { canvasTex } from './lib/venue-util.js';

export const ROOF_FIELD = true; // b11-athletics also has `maxwell-family-field`; keep only one of the two fields

export const info = {
  id: 'stadium-parking-garage',
  name: 'Stadium Parking Garage',
  subtitle: 'Maxwell Garage · Maxwell Family Field on the roof',
  blurb: 'A two-level parking garage next to California Memorial Stadium. Its roof is Maxwell Family Field, an artificial-turf practice field for Cal football, field hockey and lacrosse.',
  replaces: ['w/1013176600'],
};

export async function build(ctx) {
  const K = new GarageKit(ctx, 49.5, 410); const M = ctx.M, G = K.G;
  const wall = plainMat(0xbcb8b0, { roughness: 0.93 }), ivy = plainMat(0x3c5a2e, { roughness: 1 }), turf = plainMat(0x14a85a, { roughness: 0.95 });
  const TOP = 7.4, LEV = [0.3, 3.85, TOP];
  const u0 = -59.4, u1 = 59.4, v0 = -29.1, v1 = 29.3;
  const P = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
  const runs = [];
  const fac = (a, b, opt = {}) => { const R = K.run(a, b); const f = K.facade(R, { levels: LEV, top: TOP, bay: 8.5, colW: 0.65, colProj: 0.3, guard: 1.4, slabT: 0.9, wallMat: wall, ...opt }); runs.push({ R, ...f }); return { R, f }; };
  const SW = fac([u0, v1], [u1, v1]);
  const SE = fac([u1, v1], [u1, v0]);
  const NE = fac([u1, v0], [u0, v0], { solid: [[0, 9.5]] });
  const NW = fac([u0, v0], [u0, v1], { ent: [{ s0: 3.5, s1: 11.5, level: 1 }] });
  K.decks(P, LEV, { core: 13, runs, skipTop: true, cars: 0.3, depth: 12 });
  K.prism(G.slab, [[u0 + 0.36, v1 - 0.36], [u1 - 0.36, v1 - 0.36], [u1 - 0.36, v0 + 0.36], [u0 + 0.36, v0 + 0.36]], TOP - 0.35, TOP - 0.06);
  // stair block at the east corner (the footprint notch), rising above the field with a glazed stair
  K.tower(50.3, v0 - 0.1, 58.8, v0 + 7.4, K.g(55, v0 - 2) - 1, TOP + 3.4, { mat: wall, glass: ['N', 'W'], glassMat: G.interior, door: { face: 'N', s: 4.2, y: K.g(55, v0 - 2) } });
  // planting strip along Piedmont

  if (ROOF_FIELD) {
    const blackNet = K.G.netTex;
    const iu0 = u0 + 0.4, iu1 = u1 - 0.4, iv0 = v0 + 0.4, iv1 = v1 - 0.4;
    K.box(turf, iu0, TOP - 0.06, iv0, iu1, TOP, iv1);
    // rubber track strip along the Piedmont side
    K.fieldMarkings(0, -1.0, TOP, { kind: 'football' });
    K.fieldMarkings(0, -1.0, TOP + 0.002, { kind: 'soccerNoCircle', L: 100, W: 50, mat: G.lineB, w: 0.08 });
    // gold script "Cal" at midfield (canvas decal lying on the turf)
    { const tex = canvasTex(1024, 512, (c, W, H) => { c.clearRect(0, 0, W, H); c.font = 'italic bold 380px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 26; c.strokeStyle = '#003262'; c.strokeText('Cal', W / 2, H * 0.55); c.fillStyle = '#FDB515'; c.fillText('Cal', W / 2, H * 0.55); });
      const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.35, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const pg = new THREE.PlaneGeometry(24, 12); pg.rotateX(-Math.PI / 2); pg.rotateY(-K.a); const pl = new THREE.Mesh(pg, mat);
      const [x, z] = K.xz(0, -1.0); pl.position.set(x, TOP + 0.02, z); pl.name = 'cal-logo'; K.signs.push(pl); }
    { const keep = K.G.net; K.G.net = blackNet; for (const s of [-1, 1]) K.goal(s * 52.5, -1.0, TOP, s < 0 ? 0 : Math.PI); K.G.net = keep; }
    // chain-link fence with windscreen, tall ball nets behind both ends
    const ring = [[iu0, iv1], [iu1, iv1], [iu1, iv0], [iu0, iv0]];
    // concrete parapet with a pipe rail all round; chain-link (6 m) only along Gridiron Way and the north-west end
    K.fence(ring, TOP, 1.2, { closed: true, mat: G.chain, pitch: 2.5, postR: 0.03 });
    // one tall black-netted backstop at the north-west end
    K.fence([[iu0 + 0.6, iv0 + 8], [iu0 + 0.6, iv1 - 8]], TOP, 10, { mat: blackNet, pitch: 7, postR: 0.12 });
    for (const [uu, vv, f] of [[-30, iv0 + 0.25, Math.PI / 2], [30, iv0 + 0.25, Math.PI / 2], [-30, iv1 - 0.25, -Math.PI / 2], [30, iv1 - 0.25, -Math.PI / 2]]) K.floodPole(uu, TOP, vv, 24, f, { n: 6 });
    // small concrete stair/elevator kiosk at the west corner (the steps from Piedmont arrive here)
    K.box(wall, iu0 + 0.3, TOP - 0.05, iv1 - 4.3, iu0 + 4.3, TOP + 3.0, iv1 - 0.3); K.box(wall, iu0 + 0.1, TOP + 3.0, iv1 - 4.5, iu0 + 4.5, TOP + 3.25, iv1 - 0.1);
    K.box(G.interior, iu0 + 4.31, TOP, iv1 - 3.1, iu0 + 4.36, TOP + 2.3, iv1 - 1.5);
    // scoreboard on the north-west end fence
    { const R = K.run([iu0 + 0.4, iv0 + 22], [iu0 + 0.4, iv0 + 32]); K.rbox(R, G.steel, 0, TOP + 2.8, -0.2, 10, TOP + 4.6, 0); for (const s of [1, 9]) K.rbox(R, M.iron, s - 0.1, TOP, -0.3, s + 0.1, TOP + 2.9, -0.1);
      K.sign(R, 5, TOP + 3.7, 0.02, 'MAXWELL FAMILY FIELD', { w: 9.6, h: 1.6, bg: '#0b2a4f', P: false, sub: 'CAL ATHLETICS' }); }
    K.walkables.push(K.walkPoly(ring, TOP));
    K.colliders.push(K.colPoly([[iu0 + 0.3, iv1 - 4.3], [iu0 + 4.3, iv1 - 4.3], [iu0 + 4.3, iv1 - 0.3], [iu0 + 0.3, iv1 - 0.3]], TOP - 0.5, TOP + 3.3));
  } else {
    K.box(G.deck, u0 + 0.36, TOP - 0.06, v0 + 0.36, u1 - 0.36, TOP, v1 - 0.36);
    K.walkables.push(K.walkPoly([[u0 + 0.4, v1 - 0.4], [u1 - 0.4, v1 - 0.4], [u1 - 0.4, v0 + 0.4], [u0 + 0.4, v0 + 0.4]], TOP));
  }
  // steps up from Gridiron Way to a field gate (north-east side, mid-length)
  { const gy = K.g(0, v0 - 3.6); const n = Math.max(2, Math.round((TOP - gy) / 0.16)); if (TOP - gy > 0.15) K.walkables.push(K.stairs(wall, -1.4, v0 - 3.5, 1.4, v0, gy, TOP, '+v', n)); }
  K.sign(NW.R, 7.5, LEV[1] + 2.5, 0.35, 'STADIUM GARAGE', { w: 5.0, h: 1.1 });
  const L2 = u1 - u0; K.perimeterColliders(P, -3, TOP + 1.1, { 2: [[L2 / 2 - 1.5, L2 / 2 + 1.5]] });
  K.colliders.push(K.colPoly([[50.3, v0 - 0.1], [58.8, v0 - 0.1], [58.8, v0 + 7.4], [50.3, v0 + 7.4]], -2, TOP + 3.8));
  K.interactions.push({ id: 'maxwell-stairs', pos: K.xz(54.5, v0 - 1.5).map((q, i) => q).reduce((a, q) => a, null) || [0, 0, 0], radius: 2.5, label: 'Take the stairs up to Maxwell Family Field', teleport: [0, 0, 0] });
  { const [x, z] = K.xz(54.5, v0 - 1.4); const [tx, tz] = K.xz(45, v0 + 4); K.interactions[0].pos = [x, K.g(54.5, v0 - 1.4) + 1, z]; K.interactions[0].teleport = [tx, TOP + 0.1, tz]; }
  const object3d = K.done('stadium-parking-garage');
  return { object3d, colliders: K.colliders, walkables: K.walkables, interactions: K.interactions };
}
