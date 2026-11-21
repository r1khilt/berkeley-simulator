// Edwards Stadium running track (OSM relation 1548418): the 8-lane 400 m oval around Goldman Field, surfaced in the
// stadium's distinctive ochre/tan polyurethane, with the D-zones at both ends in the same material: a hammer/discus cage
// at the north end, the high-jump landing mat and a sand pit at the south end. Geometry fitted to the OSM outline.
import * as THREE from 'three';
import { Kit, sportsMats, trackOval, lanesTexture, surfaceMat, drapePoly, rectRing, fence, fieldTexture, canvasTex, deg } from './lib/b11-sports.js';

export const info = {
  id: 'track-1548418',
  name: 'Edwards Stadium track',
  subtitle: '400 m · 8 lanes',
  blurb: 'The oval at Edwards Stadium, where Cal track and field competes; the stadium hosted the NCAA championships and a run of world records in the 1960s and 70s.',
  replaces: ['r/1548418', 'relation/1548418'],
};

export async function build(ctx) {
  const { M } = ctx; const S = sportsMats(M);
  const K = new Kit(ctx, deg(-99.2));
  const [cu, cv] = K.uv(1.77, -1.27);
  const rIn = 36.41, straight = 84.45, lanes = 8, laneW = 1.245, Wd = lanes * laneW;
  const colliders = [];
  const yF = K.g(cu, cv);
  const Y = (u, v) => Math.max(K.g(u, v), yF - 0.15) + 0.05;
  const tex = lanesTexture(lanes, laneW, { col: '#c98a3e', tile: 8 });
  const tm = surfaceMat(tex, { rough: 0.92 });
  const { ringPt } = trackOval(K, tm, { cu, cv, straight, rIn, lanes, laneW, tile: 8, segC: 48, segS: 14, yFn: Y });
  // D-zones (same synthetic surface) between the oval and the pitch
  const tanTex = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#c98a3e'; c.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'; c.fillRect(Math.random() * w, Math.random() * h, 1, 1); } }, { repeat: true });
  const dm = surfaceMat(tanTex, { rough: 0.92 });
  const hole = []; for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + Math.PI * i / 24; hole.push([cu + straight / 2 + Math.cos(a) * rIn, cv + Math.sin(a) * rIn]); }
  for (let i = 0; i <= 24; i++) { const a = Math.PI / 2 + Math.PI * i / 24; hole.push([cu - straight / 2 + Math.cos(a) * rIn, cv + Math.sin(a) * rIn]); }
  const pitch = rectRing(cu - 53, cv - 33.5, cu + 53, cv + 33.5).reverse(); // goldman-field grass (centred in the oval)
  drapePoly(K, dm, hole, { holes: [pitch], maxEdge: 4, yFn: Y, uvFn: (u, v) => [u / 4, v / 4] });
  // inner kerb: low white aluminium curb around the inside edge
  const P = 2 * straight + 2 * Math.PI * rIn; const n = 120;
  for (let i = 0; i < n; i++) { const a = ringPt(P * i / n, -0.03), b = ringPt(P * (i + 1) / n % P, -0.03); const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const g = new THREE.BoxGeometry(L, 0.06, 0.06); g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0])); g.translate((a[0] + b[0]) / 2, Y(a[0], a[1]) + 0.03, (a[1] + b[1]) / 2); K.add(M.whitePaint, g, { detail: true }); }
  // finish line and lane numbers at the south end of the west (home) straight
  const fu = cu - straight / 2 + 0.6; const v0 = cv - rIn, v1 = cv - rIn - Wd;
  { const g = new THREE.PlaneGeometry(0.08, Wd); g.rotateX(-Math.PI / 2); g.translate(fu, yF + 0.075, (v0 + v1) / 2); K.add(M.whitePaint, g); }
  const nums = canvasTex(1024, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = `bold ${Math.round(h * 0.8)}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let k = 0; k < 8; k++) { c.save(); c.translate(w * (k + 0.5) / 8, h / 2); c.rotate(-Math.PI / 2); c.fillText(String(k + 1), 0, 0); c.restore(); } });
  { const mat = new THREE.MeshStandardMaterial({ map: nums, transparent: true, alphaTest: 0.4, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }); const g = new THREE.PlaneGeometry(Wd, 1.0); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2); g.translate(fu + 2.2, yF + 0.07, (v0 + v1) / 2); K.add(mat, g, { uvMode: 'keep' }); }
  // stagger marks for the 400 m start on the east straight
  for (let k = 0; k < lanes; k++) { const t = 2 * Math.PI * (rIn + laneW * (k + 0.5)) - 2 * Math.PI * (rIn + laneW * 0.5); const p = ringPt((straight * 0.3 + t * 0.5) % P, laneW * (k + 0.5)); const g = new THREE.PlaneGeometry(0.06, laneW - 0.1); g.rotateX(-Math.PI / 2); g.translate(p[0], yF + 0.072, p[1]); K.add(M.whitePaint, g, { detail: true }); }
  // north D: hammer / discus cage (black netting on tall poles, open toward the field) and throwing circle
  { const cu2 = cu + straight / 2 + 17, cv2 = cv; const g0 = Y(cu2, cv2);
    const pts = []; for (let i = 0; i <= 10; i++) { const a = deg(40) + deg(280) * i / 10; pts.push([cu2 + Math.cos(a) * 3.6, cv2 + Math.sin(a) * 3.6]); }
    fence(K, S, pts, { h: 7, mesh: S.netBlack, every: 2.6, y: () => g0 - 0.05, postR: 0.07, colliders });
    for (const s of [-1, 1]) { const a = deg(40) * s; const p = [cu2 + Math.cos(a) * 3.6, cv2 + Math.sin(a) * 3.6]; const q = [p[0] - 3.2, p[1] + s * 1.0]; fence(K, S, [p, q], { h: 9, mesh: S.netBlack, every: 3.2, y: () => g0 - 0.05, postR: 0.08 }); }
    K.cyl(M.concrete, cu2, g0 - 0.2, cv2, 1.35, 1.35, 0.25, 24); K.cyl(M.concreteDark, cu2, g0 - 0.2, cv2, 1.07, 1.07, 0.27, 24);
  }
  // south D: high-jump landing mat and long-jump sand pit
  { const hu = cu - straight / 2 - 18, hv = cv - 8; const g0 = Y(hu, hv); const blue = new THREE.MeshStandardMaterial({ color: 0x2f6db5, roughness: 0.8 });
    K.box(blue, hu - 2.5, g0, hv - 3, hu + 2.5, g0 + 0.7, hv + 3); K.box(S.navy, hu - 2.6, g0, hv - 3.1, hu + 2.6, g0 + 0.1, hv + 3.1);
    for (const s of [-1, 1]) { K.cyl(S.galv, hu + 2.9, g0, hv + s * 2.2, 0.03, 0.03, 2.4, 6, { detail: true }); }
    K.box(S.galv, hu + 2.88, g0 + 1.9, hv - 2.2, hu + 2.92, g0 + 1.93, hv + 2.2, { detail: true });
    const su = cu - straight / 2 - 9, sv = cv + 18; const gs = Y(su, sv); K.box(S.sand, su - 4.5, gs - 0.3, sv - 1.4, su + 4.5, gs + 0.02, sv + 1.4); K.box(M.whitePaint, su + 4.5, gs - 0.3, sv - 0.5, su + 4.62, gs + 0.03, sv + 0.5);
  }
  const object3d = K.finish(); object3d.name = 'edwards-track';
  return { object3d, colliders, walkables: [], interactions: [] };
}
