// Procedural buildings from OSM footprints + LiDAR-derived heights/roofs.
// Walls get a procedural façade shader (windows, floors, cornices, night lights); roofs get tile/shingle/membrane shaders.
import * as THREE from 'three';
let SkeletonBuilder = null; // loaded on demand (roof skeletons are normally pre-baked into roofs.json.gz)
import { signedArea, pointInRing, dedupe, offsetRing } from '../lib/geom2d.js';
import { noiseTexture } from './noiseTex.js';
import { U } from '../materials.js';

const CH = 512;
export const STYLE = { classical: 0, brick: 1, stucco: 2, concrete: 3, glass: 4, house: 5, apartment: 6, commercial: 7, industrial: 8, church: 9, brutal: 10, shingle: 11 };
let skelReady = null;
export function initSkeleton() { if (!skelReady) skelReady = import('straight-skeleton').then((SS) => { SkeletonBuilder = SS.SkeletonBuilder || (SS.default && SS.default.SkeletonBuilder); return SkeletonBuilder.init(); }); return skelReady; }

class Buf {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.f = []; }
  v(x, y, z, nx, ny, nz, u, vv, col, f) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, vv); this.c.push(col.r, col.g, col.b); this.f.push(f[0], f[1], f[2], f[3]); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aFac', new THREE.Float32BufferAttribute(this.f, 4));
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }
  get count() { return this.p.length / 3; }
}
const _c = new THREE.Color();
function hexColor(h) { return new THREE.Color('#' + h); }
// wall quad (possibly trapezoid) p0->p1 with outward normal n
function wall(B, x0, z0, x1, z1, yb, yt0, yt1, base, nx, nz, col, fac, u0 = 0) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  // decide winding so the face normal points along (nx, nz)
  const crossY = 0; // vertical wall
  const ex = x1 - x0, ez = z1 - z0; // (b-a) x (up) = (ez, 0, -ex) * h ; compare with n
  const cx = -ez, cz = ex; // (b-a) x (d-a) for d above a  -> (-(ez)*h, 0, ex*h)
  const flip = (cx * nx + cz * nz) < 0;
  const A = [x0, yb, z0, u0, yb - base], Bv = [x1, yb, z1, u0 + len, yb - base], C = [x1, yt1, z1, u0 + len, yt1 - base], D = [x0, yt0, z0, u0, yt0 - base];
  const tri = (a, b, c) => { for (const q of [a, b, c]) B.v(q[0], q[1], q[2], nx, 0, nz, q[3], q[4], col, fac); };
  if (!flip) { tri(A, Bv, C); tri(A, C, D); } else { tri(A, C, Bv); tri(A, D, C); }
}
function triUp(B, pts2, tris, y, col, fac, uvFn, ny = 1) {
  for (const t of tris) {
    let a = pts2[t[0]], b = pts2[t[1]], c = pts2[t[2]];
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if ((area > 0) === (ny > 0)) { const tmp = b; b = c; c = tmp; } // up-facing needs negative area in (x,z)
    for (const q of [a, b, c]) { const uvq = uvFn ? uvFn(q) : [q[0], q[1]]; B.v(q[0], typeof y === 'function' ? y(q) : y, q[1], 0, ny, 0, uvq[0], uvq[1], col, fac); }
  }
}
function triangulate(outer, holes) {
  const c = outer.map((p) => new THREE.Vector2(p[0], p[1]));
  const hs = (holes || []).map((h) => h.map((p) => new THREE.Vector2(p[0], p[1])));
  const tris = THREE.ShapeUtils.triangulateShape(c, hs);
  const all = [...outer]; for (const h of holes || []) all.push(...h);
  return { pts: all, tris };
}
// clip polygon (array of {x,z,t}) by t <= T (keepBelow) or t >= T
function clipT(poly, T, keepBelow) {
  const out = []; const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const ain = keepBelow ? a.t <= T : a.t >= T, bin = keepBelow ? b.t <= T : b.t >= T;
    if (ain) out.push(a);
    if (ain !== bin) { const k = (T - a.t) / (b.t - a.t); out.push({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, t: T }); }
  }
  return out;
}
function polyTris3(B, poly, yOf, col, fac, uvOf) {
  if (poly.length < 3) return;
  const pts = poly.map((p) => [p.x, p.z]);
  let tris;
  try { tris = THREE.ShapeUtils.triangulateShape(pts.map((p) => new THREE.Vector2(p[0], p[1])), []); } catch (e) { return; }
  for (const t of tris) {
    const a = poly[t[0]], b = poly[t[1]], c = poly[t[2]];
    const pa = [a.x, yOf(a), a.z], pb = [b.x, yOf(b), b.z], pc = [c.x, yOf(c), c.z];
    // normal
    const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2], vx = pc[0] - pa[0], vy = pc[1] - pa[1], vz = pc[2] - pa[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    let order = [a, b, c], P = [pa, pb, pc];
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; order = [a, c, b]; P = [pa, pc, pb]; }
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (let k = 0; k < 3; k++) { const uv = uvOf(order[k]); B.v(P[k][0], P[k][1], P[k][2], nx, ny, nz, uv[0], uv[1], col, fac); }
  }
}
function hash1(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

export function buildBuildings(data, { replaced = new Set(), standinIds = new Set(), heightAt, skel = null, record = null } = {}) {
  const chunks = new Map();
  const colliders = []; // {outer, holes, y0, y1, id}
  const named = [];
  const getChunk = (x, z) => { const k = Math.floor(x / CH) + ',' + Math.floor(z / CH); let c = chunks.get(k); if (!c) { c = { walls: new Buf(), roofs: new Buf() }; chunks.set(k, c); } return c; };
  const standins = new Map(); // osm -> {key, walls, roofs}
  let nParts = 0, nSkelFail = 0; const T = { sk: 0, tri: 0, geo: 0 }; const now = () => performance.now();
  for (const b of data.b) {
    const [osm, style, base, wallHex, roofHex, ni, levels, parts] = b;
    if (replaced.has(osm)) continue;
    const wallCol = hexColor(wallHex), roofCol = hexColor(roofHex);
    const seed = hash1(parseInt(osm.slice(2)) % 100000 + 0.5);
    const p0 = parts[0][5];
    let cx = 0, cz = 0; for (let i = 0; i < p0.length; i += 2) { cx += p0[i]; cz += p0[i + 1]; } cx /= p0.length / 2 * 10; cz /= p0.length / 2 * 10;
    let ch = getChunk(cx, cz);
    if (standinIds.has(osm)) { const k = Math.floor(cx / CH) + ',' + Math.floor(cz / CH); ch = { walls: new Buf(), roofs: new Buf() }; standins.set(osm, { key: k, walls: ch.walls, roofs: ch.roofs }); }
    const isRed = roofCol.r > roofCol.g + 0.06 && roofCol.r > roofCol.b + 0.1;
    let maxTop = 0;
    parts.forEach((part, pi) => {
      const [h, rt, ridge, pitch, ang, flat, holesFlat] = part;
      let outer = []; for (let i = 0; i < flat.length; i += 2) outer.push([flat[i] / 10, flat[i + 1] / 10]);
      outer = dedupe(outer); if (outer.length < 3) return;
      let holes = (holesFlat || []).map((hf) => { const r = []; for (let i = 0; i < hf.length; i += 2) r.push([hf[i] / 10, hf[i + 1] / 10]); return dedupe(r); }).filter((r) => r.length >= 3);
      if (signedArea(outer) < 0) outer.reverse();
      holes = holes.map((r) => (signedArea(r) > 0 ? r.reverse() : r));
      nParts++;
      const yb = base - 0.8;
      let top = base + Math.max(1.0, h);
      maxTop = Math.max(maxTop, base + Math.max(h, ridge || 0));
      const area = Math.abs(signedArea(outer));
      const fac = [style, seed + pi * 0.137, 0, Math.max(1.0, h)];
      if (pi === 0) colliders.push({ outer, holes, y0: yb, y1: base + Math.max(h, ridge || h), id: osm });
      // ---- roof decisions
      let roofType = rt;
      const parapet = rt === 0 && area > 120 && style !== STYLE.house && style !== STYLE.shingle && h > 4 ? 0.9 : 0;
      // ---- walls
      const rings = [[outer, true], ...holes.map((r) => [r, false])];
      if (roofType === 2) {
        // gable: ridge line through centroid along axis ang
        const ux = Math.cos(ang), uz = Math.sin(ang); // ridge direction
        let mx = 0, mz = 0; for (const p of outer) { mx += p[0]; mz += p[1]; } mx /= outer.length; mz /= outer.length;
        const sd = (x, z) => (x - mx) * (-uz) + (z - mz) * ux; // signed distance to ridge
        let halfW = 0; for (const p of outer) halfW = Math.max(halfW, Math.abs(sd(p[0], p[1])));
        const rise = Math.max(0.6, (ridge || h + 2) - h); const tanP = rise / Math.max(halfW, 0.5);
        const roofY = (x, z) => base + h + Math.max(0, halfW - Math.abs(sd(x, z))) * tanP;
        for (const [ring, isOuter] of rings) {
          const s = Math.sign(signedArea(ring)) * (isOuter ? 1 : -1);
          for (let i = 0; i < ring.length; i++) {
            const a = ring[i], c = ring[(i + 1) % ring.length];
            const ex = c[0] - a[0], ez = c[1] - a[1], L = Math.hypot(ex, ez); if (L < 0.05) continue;
            const nx = s * ez / L, nz = -s * ex / L;
            const da = sd(a[0], a[1]), dc = sd(c[0], c[1]);
            const f2 = [fac[0], fac[1], L, fac[3]];
            if (da * dc < 0) { const k = da / (da - dc); const mxp = a[0] + ex * k, mzp = a[1] + ez * k; const L1 = L * k;
              wall(ch.walls, a[0], a[1], mxp, mzp, yb, roofY(a[0], a[1]), roofY(mxp, mzp), base, nx, nz, wallCol, [fac[0], fac[1], L, fac[3]], 0);
              wall(ch.walls, mxp, mzp, c[0], c[1], yb, roofY(mxp, mzp), roofY(c[0], c[1]), base, nx, nz, wallCol, [fac[0], fac[1], L, fac[3]], L1);
            } else wall(ch.walls, a[0], a[1], c[0], c[1], yb, roofY(a[0], a[1]), roofY(c[0], c[1]), base, nx, nz, wallCol, f2, 0);
          }
        }
        // roof: split polygon by ridge line into two planar halves
        const half = (sign) => { // clip outer ring by sign*sd >= 0
          const poly = outer.map((p) => ({ x: p[0], z: p[1], t: sign * sd(p[0], p[1]) }));
          return clipT(poly, 0, false);
        };
        const rcol = roofCol; const rfac = [isRed ? 1 : 2, seed, 0, 0];
        for (const sg of [1, -1]) {
          const poly = half(sg);
          polyTris3(ch.roofs, poly, (p) => roofY(p.x, p.z), rcol, rfac, (p) => [(p.x - mx) * ux + (p.z - mz) * uz, (halfW - Math.abs(sd(p.x, p.z))) * Math.sqrt(1 + tanP * tanP)]);
        }
        return;
      }
      const wallTop = top + parapet;
      for (const [ring, isOuter] of rings) {
        const s = Math.sign(signedArea(ring)) * (isOuter ? 1 : -1);
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i], c = ring[(i + 1) % ring.length];
          const ex = c[0] - a[0], ez = c[1] - a[1], L = Math.hypot(ex, ez); if (L < 0.05) continue;
          wall(ch.walls, a[0], a[1], c[0], c[1], yb, wallTop, wallTop, base, s * ez / L, -s * ex / L, wallCol, [fac[0], fac[1], L, fac[3]], 0);
        }
      }
      if (roofType === 1) {
        // hip roof via straight skeleton, truncated at ridge height, with eave overhang
        const rise = Math.max(0.5, (ridge || h + 3) - h);
        const tanP = Math.tan(THREE.MathUtils.degToRad(Math.max(14, Math.min(50, pitch || 28))));
        const over = area < 30000 && outer.length < 80 ? 0.5 : 0;
        let ringO = over ? offsetRing(outer, over) : outer;
        let sk = null;
        const toRings = (o, hs) => [[...o, o[0]], ...hs.map((r) => [...r, r[0]])];
        const skKey = osm + ':' + pi;
        const pre = skel && skel[skKey];
        if (pre) { sk = pre.s; if (!pre.o) ringO = outer; }
        else if (skel && skel.__complete || !SkeletonBuilder) { sk = null; }
        else {
          const _t0 = now(); try { sk = SkeletonBuilder.buildFromPolygon(toRings(ringO, holes)); } catch (e) { sk = null; }
          let usedOver = !!over;
          if (!sk && over) { ringO = outer; usedOver = false; try { sk = SkeletonBuilder.buildFromPolygon(toRings(outer, holes)); } catch (e) { sk = null; } }
          T.sk += now() - _t0;
          if (record && sk) record[skKey] = { o: usedOver ? 1 : 0, v: sk.vertices.map((v) => [Math.round(v[0] * 100) / 100, Math.round(v[1] * 100) / 100, Math.round(v[2] * 1000) / 1000]), p: sk.polygons };
        }
        if (sk) {
          const T = rise / tanP; const rcol = roofCol; const rfac = [isRed ? 1 : (roofCol.getHSL({}).l < 0.25 ? 3 : 2), seed, 0, 0];
          const V = sk.vertices;
          for (const face of sk.polygons) {
            const poly = face.map((vi) => ({ x: V[vi][0], z: V[vi][1], t: V[vi][2] }));
            // base edge for uv
            const e0 = poly.findIndex((p) => p.t < 1e-5); let ex = 1, ez = 0, ox = poly[0].x, oz = poly[0].z;
            if (e0 >= 0) { const a = poly[e0]; let b = poly[(e0 + 1) % poly.length]; if (b.t > 1e-5) b = poly[(e0 - 1 + poly.length) % poly.length]; ex = b.x - a.x; ez = b.z - a.z; const l = Math.hypot(ex, ez) || 1; ex /= l; ez /= l; ox = a.x; oz = a.z; }
            const uvOf = (p) => [(p.x - ox) * ex + (p.z - oz) * ez, Math.min(p.t, T) / Math.cos(Math.atan(tanP))];
            const below = clipT(poly, T, true), above = clipT(poly, T, false);
            polyTris3(ch.roofs, below, (p) => top + p.t * tanP, rcol, rfac, uvOf);
            if (above.length >= 3) polyTris3(ch.roofs, above, () => top + T * tanP, rcol, [0, seed, 0, 0], (p) => [p.x, p.z]);
          }
          if (over) { // soffit (facing down) between wall ring and overhang ring
            for (let i = 0; i < outer.length; i++) {
              const a = outer[i], b2 = outer[(i + 1) % outer.length], c2 = ringO[(i + 1) % ringO.length], d2 = ringO[i];
              const quad = [a, b2, c2, d2];
              triUp(ch.roofs, quad, [[0, 1, 2], [0, 2, 3]], top - 0.02, _c.setRGB(0.55, 0.52, 0.48), [0, seed, 0, 0], null, -1);
            }
          }
          return;
        }
        nSkelFail++;
        top = base + h + rise * 0.5; // fallback flat at mid height
      }
      if (roofType === 3) { // canopy slab
        const tr = triangulate(outer, holes);
        triUp(ch.roofs, tr.pts, tr.tris, top, roofCol, [0, seed, 0, 0]);
        triUp(ch.roofs, tr.pts, tr.tris, top - 0.35, _c.setRGB(0.45, 0.45, 0.45), [0, seed, 0, 0], null, -1);
        return;
      }
      // flat roof + parapet
      const tr = triangulate(outer, holes);
      triUp(ch.roofs, tr.pts, tr.tris, top, roofCol, [0, seed, 0, 0]);
      if (parapet) {
        const inner = offsetRing(outer, -0.3);
        const s = Math.sign(signedArea(outer));
        for (let i = 0; i < outer.length; i++) {
          const a = inner[i], c = inner[(i + 1) % inner.length];
          const ex = c[0] - a[0], ez = c[1] - a[1], L = Math.hypot(ex, ez); if (L < 0.05) continue;
          wall(ch.walls, a[0], a[1], c[0], c[1], top, top + parapet, top + parapet, base, -s * ez / L, s * ex / L, wallCol, [style, seed, 0.1, 0], 0);
          const o0 = outer[i], o1 = outer[(i + 1) % outer.length];
          triUp(ch.walls, [o0, o1, c, a], [[0, 1, 2], [0, 2, 3]], top + parapet, wallCol, [style, seed, 0.1, 0]);
        }
      }
      // rooftop equipment on big flat roofs (deterministic)
      if (area > 500 && h > 6 && style !== STYLE.house) {
        let rs = Math.floor(seed * 1e6) + pi * 31; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
        const n = Math.min(14, Math.floor(area / 450));
        let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; for (const p of outer) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); }
        const ec = _c.setRGB(0.62, 0.62, 0.6).clone();
        for (let k = 0, tries = 0; k < n && tries < n * 8; tries++) {
          const x = minx + rnd() * (maxx - minx), z = minz + rnd() * (maxz - minz);
          const w = 1.5 + rnd() * 3.5, d = 1.2 + rnd() * 2.5, hh = 1.0 + rnd() * 1.8;
          const corners = [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]];
          if (!corners.every((p) => pointInRing(p[0], p[1], outer)) || holes.some((hr) => corners.some((p) => pointInRing(p[0], p[1], hr)))) continue;
          k++;
          for (let i = 0; i < 4; i++) { const a = corners[i], c = corners[(i + 1) % 4]; const ex = c[0] - a[0], ez = c[1] - a[1], L = Math.hypot(ex, ez); wall(ch.roofs, a[0], a[1], c[0], c[1], top, top + hh, top + hh, top, -ez / L, ex / L, ec, [0, seed, 0, 0], 0); }
          triUp(ch.roofs, corners, [[0, 1, 2], [0, 2, 3]], top + hh, ec, [0, seed, 0, 0]);
        }
      }
    });
    if (ni >= 0) named.push({ name: data.names[ni], c: [cx, cz], top: maxTop, osm });
  }
  const group = new THREE.Group(); group.name = 'buildings';
  const wallMat = makeWallMaterial(), roofMat = makeRoofMaterial();
  let tris = 0; const _tg = now();
  for (const [k, c] of chunks) {
    if (c.walls.count) { const m = new THREE.Mesh(c.walls.geometry(), wallMat); m.castShadow = m.receiveShadow = true; group.add(m); tris += c.walls.count / 3; }
    if (c.roofs.count) { const m = new THREE.Mesh(c.roofs.geometry(), roofMat); m.castShadow = m.receiveShadow = true; group.add(m); tris += c.roofs.count / 3; }
  }
  T.geo = now() - _tg;
  const standinMgr = new StandinManager(standins, wallMat, roofMat); group.add(standinMgr.group);
  return { group, colliders, named, standinMgr, stats: { parts: nParts, skelFail: nSkelFail, tris: Math.round(tris), chunks: chunks.size, ms: { sk: Math.round(T.sk), geo: Math.round(T.geo) } }, wallMat, roofMat };
}

const FACADE_GLSL = /* glsl */`
uniform sampler2D uNoise; uniform float uNight; uniform vec3 uSkyZen, uSkyHor;
varying vec4 vFac; varying vec2 vUvF; varying vec3 vWPosF; varying vec3 vWNF;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
// style table: floorH, bayW, winW, winH | sill, groundH, frameW, kind
void styleParams(int s, out vec4 A, out vec4 B){
  if(s==0){A=vec4(4.6,3.8,0.40,0.56);B=vec4(0.24,5.0,0.10,0.0);}
  else if(s==1){A=vec4(3.9,3.0,0.44,0.55);B=vec4(0.28,4.2,0.08,1.0);}
  else if(s==2){A=vec4(3.8,3.5,0.36,0.50);B=vec4(0.30,4.2,0.06,2.0);}
  else if(s==3){A=vec4(3.9,2.9,0.70,0.48);B=vec4(0.34,4.5,0.03,3.0);}
  else if(s==4){A=vec4(4.0,1.55,0.94,0.80);B=vec4(0.10,4.8,0.02,4.0);}
  else if(s==5){A=vec4(3.0,4.2,0.30,0.46);B=vec4(0.32,3.2,0.06,5.0);}
  else if(s==6){A=vec4(3.0,3.4,0.42,0.48);B=vec4(0.32,3.4,0.05,6.0);}
  else if(s==7){A=vec4(3.5,3.6,0.48,0.50);B=vec4(0.30,4.4,0.05,7.0);}
  else if(s==8){A=vec4(5.5,6.0,0.34,0.22);B=vec4(0.60,5.5,0.03,8.0);}
  else if(s==9){A=vec4(8.0,4.8,0.28,0.62);B=vec4(0.25,8.0,0.06,9.0);}
  else if(s==10){A=vec4(3.9,3.3,0.60,0.44);B=vec4(0.36,4.6,0.12,10.0);}
  else {A=vec4(3.0,4.4,0.30,0.45);B=vec4(0.32,3.2,0.07,11.0);}
}
vec3 fCol; float fRough; float fMetal; vec3 fEmis; float fBump;
void facade(vec3 wallC){
  int s = int(vFac.x+0.5); float seed = vFac.y; float edgeLen = vFac.z; float topH = vFac.w;
  vec4 A, B; styleParams(s, A, B);
  float floorH=A.x, bayW=A.y, winW=A.z, winH=A.w, sill=B.x, groundH=B.y, frameW=B.z;
  float u = vUvF.x, v = vUvF.y;
  vec3 col = wallC * 0.86; float rough = 0.85; fMetal = 0.0; fEmis = vec3(0.0); fBump = 0.0;
  // wall surface texture
  vec4 nz = texture(uNoise, vec2(u, v)*0.21 + seed*7.0);
  vec4 nf = texture(uNoise, vec2(u, v)*1.3 + seed*3.0);
  float pxu = fwidth(u), pxv = fwidth(v);
  float detail = 1.0 - smoothstep(0.03, 0.12, max(pxu,pxv));
  col *= 0.9 + 0.16*nz.r + 0.06*(nf.b-0.5)*detail;
  if (s==1) { // brick courses
    float bv = v/0.075; float row=floor(bv); float bu = u/0.22 + mod(row,2.0)*0.5; float m = smoothstep(0.0,0.12,fract(bv))*smoothstep(0.0,0.06,fract(bu));
    col *= mix(1.0, mix(1.35, 0.92+0.16*h21(vec2(floor(bu),row)), m), detail);
  } else if (s==5) { float sv = fract(v/0.21); col *= mix(1.0, 0.88+0.12*smoothstep(0.0,0.15,sv), detail); }
  else if (s==11) { float sv = v/0.32; float row=floor(sv); float su=u/0.24+h21(vec2(row,1.0)); col = mix(col, col*(0.75+0.35*h21(vec2(floor(su),row))), detail)*mix(1.0,0.75+0.25*smoothstep(0.0,0.2,fract(sv)),detail); }
  else if (s==3 || s==10) { float pj = smoothstep(0.0,0.03,abs(fract(v/floorH)-0.5)*floorH-0.0) ; col *= mix(1.0, 0.9+0.1*smoothstep(0.02,0.05,abs(fract(u/1.5)-0.5)*1.5), detail*0.6); if(s==10) col *= 0.93+0.1*smoothstep(0.0,0.02,abs(fract(v/0.3)-0.5)*0.3)*detail; }
  else if (s==8) { col *= mix(1.0, 0.85+0.15*abs(sin(u*31.4)), detail); }
  if (s==0) { // rusticated base + cornice
    if (v < groundH) { float g = fract(v/0.6); col *= mix(1.0, 0.82+0.18*smoothstep(0.0,0.08,g)*smoothstep(1.0,0.92,g), detail); }
  }
  // plinth & cornice bands
  if (v < 0.55) col *= 0.82;
  if (topH > 6.0 && (s==0||s==1||s==2||s==7||s==9)) {
    float c0 = topH - 1.1, c1 = topH - 0.35;
    if (v > c0 && v < c1) { col *= 1.08; }
    if (v > c0 - 0.25 && v < c0) col *= 0.7;
  }
  // windows
  float nb = max(1.0, floor(edgeLen / bayW + 0.5)); float bw = edgeLen / nb;
  float lodW = smoothstep(0.25, 0.6, pxu / bw * 6.0);
  bool hasWin = edgeLen > 2.4 && v > 0.6 && v < topH - 0.6 && s != 12;
  float fi, fv, fh;
  if (v < groundH) { fi = 0.0; fh = groundH; fv = v/groundH; } else { fi = 1.0 + floor((v-groundH)/floorH); fh = floorH; fv = fract((v-groundH)/floorH); }
  float bi = floor(u / bw); float fu = fract(u / bw);
  float ww = winW, wh = winH, sl = sill;
  if (fi < 0.5) {
    if (s==7) { ww = 0.86; wh = 0.72; sl = 0.06; }            // storefront
    else if (s==0) { ww = 0.30; wh = 0.42; sl = 0.30; }
    else if (s==4) { ww = 0.94; wh = 0.85; sl = 0.04; }
  }
  float rnd = h21(vec2(bi + seed*91.0, fi + seed*17.0));
  if ((s==5||s==11||s==6) && rnd < 0.18) hasWin = false;         // irregular residential windows
  if (s==8 && rnd < 0.4) hasWin = false;
  // the upper floor must fit under the top
  float floorTop = (fi < 0.5) ? groundH : groundH + fi*floorH;
  if (floorTop > topH - 0.2 && fi > 0.5) hasWin = hasWin && (floorTop - fh*(1.0-sl-wh) < topH - 0.3);
  if (hasWin) {
    float hx = abs(fu-0.5)*bw, hwx = ww*bw*0.5;
    float y0 = sl*fh, y1 = (sl+wh)*fh, y = fv*fh;
    float ax = fwidth(u)*1.2, ay = fwidth(v)*1.2;
    float inX = 1.0 - smoothstep(hwx-ax, hwx+ax, hx);
    float inY = smoothstep(y0-ay, y0+ay, y) * (1.0 - smoothstep(y1-ay, y1+ay, y));
    // arched tops for classical & church
    if ((s==0 && fi > 0.5) || s==9) { float rr = hwx; float cy = y1 - rr; if (y > cy) { float d = length(vec2(hx, y-cy)); inY *= 1.0 - smoothstep(rr-ax, rr+ax, d); } }
    float win = inX*inY;
    float fw = frameW;
    float sideRev = smoothstep(hwx-0.14, hwx, hx) * step(0.5, fu); col = mix(col, col*0.62, sideRev*win*(1.0-lodW)*0.0);
    float inXf = 1.0 - smoothstep(hwx+fw-ax, hwx+fw+ax, hx), inYf = smoothstep(y0-fw-ay, y0-fw+ay, y)*(1.0-smoothstep(y1+fw-ay, y1+fw+ay, y));
    float frame = clamp(inXf*inYf - win, 0.0, 1.0);
    vec3 frameC = (s==3||s==4||s==10||s==8) ? vec3(0.16,0.17,0.18) : (s==1||s==5||s==11||s==0||s==2) ? vec3(0.86,0.85,0.8) : vec3(0.3);
    // glass: dark, slight blue, reflective; blinds variation; recess shadow at top
    float blind = h21(vec2(bi*3.1 + seed, fi*7.3));
    vec3 glass = mix(vec3(0.05,0.06,0.07), vec3(0.14,0.15,0.15), step(0.86, blind)*0.7);
    float rec = smoothstep(y1 - 0.35*fh*wh, y1, y);
    glass *= 1.0 - 0.35*rec;
    // interior mapping: a virtual room behind each window gives depth and parallax
    vec3 interior = vec3(0.0);
    if (lodW < 0.95 && abs(vWNF.y) < 0.5) {
      vec3 N = normalize(vec3(vWNF.x, 0.0, vWNF.z)); vec3 Tg = normalize(cross(vec3(0.0,1.0,0.0), N));
      vec3 V = normalize(vWPosF - cameraPosition);
      float vt = dot(V, Tg), vu = V.y, vn = max(1e-3, -dot(V, N));
      float px = fract(u / bw) * bw, py = fv * fh, depth = 3.2 + 1.5*h21(vec2(bi+3.0, fi+seed*5.0));
      float tx = vt > 0.0 ? (bw - px)/vt : -px/max(-vt,1e-4);
      float ty = vu > 0.0 ? (fh - py)/vu : -py/max(-vu,1e-4);
      float tz = depth / vn;
      float t = min(tx, min(ty, tz));
      vec3 roomTint = mix(vec3(0.85,0.78,0.66), vec3(0.72,0.78,0.82), step(0.5, h21(vec2(bi*7.0+seed, fi*3.0))));
      if (s==7 && fi < 0.5) roomTint = mix(vec3(0.95,0.9,0.8), vec3(0.85,0.88,0.9), h21(vec2(bi, seed)));   // bright shop interiors
      vec3 wallC;
      if (t == tz) wallC = roomTint * 0.9;                    // back wall
      else if (t == tx) wallC = roomTint * 0.65;              // side walls
      else wallC = vu > 0.0 ? vec3(0.92) : vec3(0.28,0.22,0.18); // ceiling / floor
      float hx2 = px + vt*t, hy2 = py + vu*t;
      // furniture-ish silhouettes near the floor of the back wall

      float blindCover = step(0.7, blind) * smoothstep(0.0, 0.02, (y1 - y) - (0.35 + 0.5*h21(vec2(bi, fi*1.3)))*(y1-y0));
      interior = mix(wallC, vec3(0.78,0.74,0.66), blindCover);
      interior = mix(interior, vec3(0.45,0.42,0.38), smoothstep(0.15, 0.6, pxu / bw * 8.0));   // filter tiny windows to their average
    }
    // mullions
    float mul = 0.0;
    if (s==4) { mul = 1.0 - smoothstep(0.0, ax*2.0+0.02, abs(fract(u/bw)-0.5)*bw - hwx + 0.04); }
    else if (ww*bw > 1.2) { float mu = abs(fract((hx/(hwx))*1.0 + 0.0)-0.0); mul = 1.0 - smoothstep(0.02, 0.02+ax, abs(hx - 0.0)); }
    float lit = (s==7 && fi < 0.5) ? 0.0 : step(s==3||s==4||s==10 ? 0.68 : 0.62, h21(vec2(bi*1.7 + seed*13.0, fi*2.3 + seed)));
    vec3 litC = mix(vec3(1.0,0.78,0.48), vec3(0.85,0.9,1.0), step(0.85, h21(vec2(bi, fi+3.0))));
    float wmask = win * (1.0 - lodW);
    col = mix(col, frameC, frame*(1.0-lodW));
    col = mix(col, glass, wmask);
    col = mix(col, frameC*0.6, mul*wmask);
    rough = mix(rough, 0.06, wmask); fMetal = mix(0.0, 0.35, wmask);
    // daytime: dim room seen through glass; night: lit rooms glow (with their interior detail)
    float dayInt = (s==7 && fi < 0.5 ? 0.32 : 0.16) * (1.0 - uNight) + (s==7 && fi < 0.5 ? 0.35 : 0.0) * uNight;
    // fake reflection of sky / street in the glass with Fresnel
    vec3 Nw = normalize(vec3(vWNF.x, 0.0, vWNF.z)); vec3 Vw = normalize(vWPosF - cameraPosition);
    vec3 Rf = reflect(Vw, Nw); float cosT = clamp(dot(-Vw, Nw), 0.0, 1.0);
    float F = 0.06 + 0.94 * pow(1.0 - cosT, 5.0);
    float cl = textureLod(uNoise, Rf.xz / max(0.3, Rf.y + 0.45) * 0.03 + seed, 2.0).r;
    vec3 skyR = mix(uSkyHor, uSkyZen, smoothstep(0.0, 0.6, Rf.y)) * (0.9 + 0.35 * smoothstep(0.55, 0.75, cl));
    float ang = atan(Rf.x, Rf.z); float skyline = 0.04 + 0.22 * texture(uNoise, vec2(ang * 0.8, seed)).g;
    vec3 streetR = mix(uSkyHor * 0.08, uSkyHor * 0.22, smoothstep(-0.4, 0.0, Rf.y)) * (0.75 + 0.5 * textureLod(uNoise, vec2(ang * 0.6, seed), 1.0).r);
    vec3 refl = Rf.y > skyline ? skyR : streetR;
    float wobble = (texture(uNoise, vec2(bi * 0.37 + seed, fi * 0.21)).b - 0.5) * 0.15;
    refl *= 1.0 + wobble;
    float kRefl = mix(0.25, 0.95, F);
    fEmis = interior * wmask * (dayInt + lit * uNight * 0.75) * vec3(1.0, 0.86, 0.66) * (1.0 - kRefl * 0.6) * (1.0 - rec*0.4) + refl * kRefl * wmask * 0.85 + litC * lit * wmask * uNight * 0.12;
    col = mix(col, vec3(0.02, 0.025, 0.03), wmask); rough = mix(rough, 0.4, wmask); fMetal = mix(fMetal, 0.0, wmask);
    // far LOD: average window coverage
    float cover = ww*wh;
    col = mix(col, mix(col, vec3(0.1,0.11,0.12), cover*0.8), lodW);
    fEmis += litC * lit * cover * 0.45 * uNight * lodW;
  }
  fCol = col; fRough = rough;
}`;

function makeWallMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.85, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNoise = { value: noiseTexture() }; sh.uniforms.uNight = U.uNight; sh.uniforms.uSkyZen = U.uSkyZen; sh.uniforms.uSkyHor = U.uSkyHor;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aFac; varying vec4 vFac; varying vec2 vUvF; varying vec3 vWPosF; varying vec3 vWNF;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vFac = aFac; vUvF = uv; vWPosF = (modelMatrix*vec4(transformed,1.0)).xyz; vWNF = normalize(mat3(modelMatrix)*normal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FACADE_GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\n facade(diffuseColor.rgb);\n diffuseColor.rgb = fCol;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = fRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = fMetal;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += fEmis;');
  };
  mat.customProgramCacheKey = () => 'facade-v4';
  return mat;
}
function makeRoofMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNoise = { value: noiseTexture() };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aFac; varying vec4 vFacR; varying vec2 vUvR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vFacR = aFac; vUvR = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D uNoise; varying vec4 vFacR; varying vec2 vUvR;
float h21r(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
 { int t = int(vFacR.x+0.5); vec2 uv = vUvR; float px = max(fwidth(uv.x), fwidth(uv.y)); float det = 1.0 - smoothstep(0.02, 0.09, px);
   vec4 n = texture(uNoise, uv*0.09 + vFacR.y*5.0); vec4 n2 = texture(uNoise, uv*0.8);
   vec3 c = diffuseColor.rgb * 0.82;
   if (t==0) { c *= 0.88 + 0.2*n.r + 0.08*(n2.b-0.5)*det; }
   else if (t==1) { // clay barrel tile: 0.25 m across, 0.33 m courses
     float bu = uv.x/0.25, bv = uv.y/0.33; float row = floor(bv); float barrel = sin(fract(bu)*3.14159);
     float lap = pow(fract(bv), 3.0); float tone = 0.88 + 0.24*h21r(vec2(floor(bu), row));
     c *= mix(0.95 + 0.1*n.g, tone*(0.74 + 0.36*barrel - 0.22*lap), det);
   } else if (t==2) { // asphalt shingles
     float bv = uv.y/0.2; float row=floor(bv); float bu = uv.x/0.34 + mod(row,2.0)*0.5;
     float tone = 0.85 + 0.25*h21r(vec2(floor(bu),row)); float g = smoothstep(0.85,1.0,fract(bv));
     c *= mix(0.95+0.1*n.g, tone*(1.0-0.3*g)*(0.9+0.2*n2.b), det);
   } else { // standing-seam metal / slate
     c *= mix(1.0, 0.9 + 0.1*smoothstep(0.0, 0.05, abs(fract(uv.x/0.45)-0.5)), det) * (0.92+0.12*n.r);
   }
   diffuseColor.rgb = c; }`);
  };
  mat.customProgramCacheKey = () => 'roof-v2';
  return mat;
}

// Procedural stand-ins for buildings that have a hand-modelled landmark module: shown until (and while) the landmark is not loaded.
class StandinManager {
  constructor(map, wallMat, roofMat) {
    this.map = map; this.wallMat = wallMat; this.roofMat = roofMat; this.hidden = new Set(); this.group = new THREE.Group(); this.group.name = 'standins';
    this.chunks = new Map(); for (const [osm, s] of map) { let c = this.chunks.get(s.key); if (!c) this.chunks.set(s.key, (c = { ids: [], meshes: [] })); c.ids.push(osm); }
    for (const k of this.chunks.keys()) this.rebuild(k);
  }
  setHidden(osmIds, hide) { const keys = new Set(); for (const id of osmIds) { const s = this.map.get(id); if (!s) continue; if (hide) this.hidden.add(id); else this.hidden.delete(id); keys.add(s.key); } for (const k of keys) this.rebuild(k); }
  rebuild(k) {
    const c = this.chunks.get(k); for (const m of c.meshes) { this.group.remove(m); m.geometry.dispose(); } c.meshes = [];
    for (const kind of ['walls', 'roofs']) {
      const B = new Buf(); const app = (a, b) => { for (let i = 0; i < b.length; i++) a.push(b[i]); }; for (const id of c.ids) { if (this.hidden.has(id)) continue; const s = this.map.get(id)[kind]; app(B.p, s.p); app(B.n, s.n); app(B.uv, s.uv); app(B.c, s.c); app(B.f, s.f); }
      if (!B.count) continue; const m = new THREE.Mesh(B.geometry(), kind === 'walls' ? this.wallMat : this.roofMat); m.castShadow = m.receiveShadow = true; this.group.add(m); c.meshes.push(m);
    }
  }
}
