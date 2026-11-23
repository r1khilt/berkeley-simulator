// Procedural buildings from OSM footprints + LiDAR-derived heights/roofs.
// Walls get a procedural façade shader (windows, floors, cornices, night lights); roofs get tile/shingle/membrane shaders.
import * as THREE from 'three';
let SkeletonBuilder = null; // loaded on demand (roof skeletons are normally pre-baked into roofs.json.gz)
import { signedArea, pointInRing, dedupe, offsetRing } from '../lib/geom2d.js';
import { noiseTexture } from './noiseTex.js';
import { U } from '../materials.js';
import { INTERIOR_GLSL, buildingUse, IR } from './interiors.js'; // furnished window interiors
import { PBR_GLSL, GH_GLSL, pbrUniforms, ghUniforms } from './pbr.js'; // gfx-materials: PBR wall/roof surfaces
import { FACADE_PBR_GLSL, ROOF_PBR_GLSL } from './pbrFacade.js';

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
    const bUse = buildingUse({ name: ni >= 0 ? data.names[ni] : '', style, h: Math.max(...parts.map((q) => q[0])), x: cx, z: cz, seed }); // window interiors
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
      const fac = [style + 16 * bUse, seed + pi * 0.137, 0, Math.max(1.0, h)]; // use packed for interiors.js
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
uniform sampler2D uNoise; uniform float uNight; uniform vec3 uSkyZen, uSkyHor; uniform vec3 uSunDir;
flat varying vec4 vFac; varying vec2 vUvF; varying vec3 vWPosF; varying vec3 vWNF; // flat: per-wall constants are hashed, interpolation noise would scramble rooms
${INTERIOR_GLSL}
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
float fSunOcc = 1.0; float fAmbOcc = 1.0; float fNrmK = 1.0;   // r4-generic: window reveal sun shadow / recess AO / relief mask
void facade(vec3 wallC){
  // vFac.x packs style + 16*use (use drives the furnished interiors in interiors.js)
  int sAll = int(vFac.x+0.5); int s = sAll - (sAll/16)*16; int bUse = sAll/16; float seed = vFac.y; float edgeLen = vFac.z; float topH = vFac.w;
  vec4 A, B; styleParams(s, A, B);
  float floorH=A.x, bayW=A.y, winW=A.z, winH=A.w, sill=B.x, groundH=B.y, frameW=B.z;
  float u = vUvF.x, v = vUvF.y;
  vec3 col = wallC * 0.86; float rough = 0.85; fMetal = 0.0; fEmis = vec3(0.0); fBump = 0.0;
  // wall surface texture
  vec4 nz = texture(uNoise, vec2(u, v)*0.21 + seed*7.0);
  vec4 nf = texture(uNoise, vec2(u, v)*1.3 + seed*3.0);
  float pxu = fwidth(u), pxv = fwidth(v);
  float detail = 1.0 - smoothstep(0.03, 0.12, max(pxu,pxv));
  if (uPbrOn > 0.5) { wallPBR(s, wallC, u, v, seed, topH, edgeLen, floorH, bayW, winW, winH, sill, groundH, col, rough); } else { // gfx-materials: PBR wall surface, old procedural below
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
  } // gfx-materials
  // windows
  float nb = max(1.0, floor(edgeLen / bayW + 0.5)); float bw = edgeLen / nb;
  float lodW = smoothstep(0.25, 0.6, pxu / bw * 6.0);
  bool hasWin = edgeLen > 2.4 && v > 0.6 && v < topH - 0.6 && s != 12;
  float fi, fv, fh;
  if (v < groundH) { fi = 0.0; fh = groundH; fv = v/groundH; } else { fi = 1.0 + floor((v-groundH)/floorH); fh = floorH; fv = fract((v-groundH)/floorH); }
  float bi = floor(u / bw); float fu = fract(u / bw);
  float ww = winW, wh = winH, sl = sill;
  if (fi < 0.5) {
    if (s==7) { ww = 0.86; wh = 0.66; sl = 0.1; }             // storefront (r4-generic: 0.45 m bulkhead)
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
    bool arch = (s==0 && fi > 0.5) || s==9;
    if (arch) { float rr = hwx; float cy = y1 - rr; if (y > cy) { float d = length(vec2(hx, y-cy)); inY *= 1.0 - smoothstep(rr-ax, rr+ax, d); } }
    float win = inX*inY;
    float fw = frameW;
    float inXf = 1.0 - smoothstep(hwx+fw-ax, hwx+fw+ax, hx), inYf = smoothstep(y0-fw-ay, y0-fw+ay, y)*(1.0-smoothstep(y1+fw-ay, y1+fw+ay, y));
    float frame = clamp(inXf*inYf - win, 0.0, 1.0);
    vec3 frameC = (s==3||s==4||s==10||s==8) ? vec3(0.16,0.17,0.18) : (s==1||s==5||s==11||s==0||s==2) ? vec3(0.86,0.85,0.8) : vec3(0.3);
    // r4-generic: storefront ground floors (shops): bulkhead, transom bar, door bay, sign band
    bool shop = fi < 0.5 && (s == 7 || (bUse == 5 && s != 0 && s != 9 && s != 4));
    float gv = -9.0;   // local ground in wall v (sloping streets): ground-floor openings start above it
    if (fi < 0.5) { gv = groundAt(vWPosF.xz) - (vWPosF.y - v); float yMin = gv + (shop ? 0.45 : 0.6); if (y0 < yMin && yMin < y1 - 1.0) { y0 = yMin; inY = smoothstep(y0-ay, y0+ay, y) * (1.0 - smoothstep(y1-ay, y1+ay, y)); win = inX*inY; inYf = smoothstep(y0-fw-ay, y0-fw+ay, y)*(1.0-smoothstep(y1+fw-ay, y1+fw+ay, y)); frame = clamp(inXf*inYf - win, 0.0, 1.0); } }
    float bh = h21(vec2(seed * 41.0, 3.7));    // per-building dice
    vec3 wallBase = col;
    if (shop) {
      // sign band / fascia between the storefront head and the first floor
      float sb0 = y1 + 0.12, sb1 = groundH - 0.12;
      if (y > sb0 && y < sb1 && bh < 0.75) {
        vec3 sc = bh < 0.18 ? vec3(0.045, 0.043, 0.04) : bh < 0.34 ? vec3(0.6, 0.55, 0.45) : bh < 0.45 ? vec3(0.3, 0.07, 0.05) : bh < 0.55 ? vec3(0.08, 0.16, 0.1) : bh < 0.6 ? vec3(0.32, 0.22, 0.12) : wallBase * 0.62;
        float edge = smoothstep(sb0, sb0 + 0.06, y) * (1.0 - smoothstep(sb1 - 0.06, sb1, y));
        col = mix(col, sc, edge); rough = mix(rough, 0.5, edge);
      }
      // bulkhead (kick plate) under the glass: dark tile, stone or painted panel
      if (y < y0 && hx < hwx + 0.05 && !(nb >= 2.0 && bi == floor(h21(vec2(seed * 7.0 + edgeLen * 0.37, 1.3)) * nb) && abs((fu - 0.5) * bw) < 0.62)) {
        float kb = h21(vec2(seed * 13.0, 9.1));
        vec3 kc = kb < 0.38 ? vec3(0.035, 0.035, 0.037) : kb < 0.52 ? vec3(0.08, 0.13, 0.1) : kb < 0.64 ? vec3(0.22, 0.06, 0.05) : kb < 0.82 ? vec3(0.1, 0.09, 0.085) : vec3(0.5, 0.47, 0.42);
        float kIn = 1.0 - smoothstep(hwx + 0.05 - ax, hwx + 0.05 + ax, hx);
        col = mix(col, kc, kIn); rough = mix(rough, kb < 0.38 || (kb >= 0.64 && kb < 0.82) ? 0.25 : 0.6, kIn);
        float cap = smoothstep(y0 - 0.06 - ay, y0 - 0.06 + ay, y) * kIn;   // aluminium / stone cap on the bulkhead
        col = mix(col, vec3(0.55, 0.55, 0.53), cap);
      }
    }
    // shop entrance: one bay per wall gets a deep-set glazed door (replaces the bulkhead there)
    bool door = false;
    if (shop && nb >= 2.0 && bi == floor(h21(vec2(seed * 7.0 + edgeLen * 0.37, 1.3)) * nb) && abs((fu - 0.5) * bw) < 0.62 && y < max(0.0, gv) + 2.45) {
      door = true; hwx = 0.55; y0 = max(0.0, gv); y1 = y0 + 2.3;
      inX = 1.0 - smoothstep(hwx-ax, hwx+ax, hx); inY = 1.0 - smoothstep(y1-ay, y1+ay, y); win = inX * inY;
      inXf = 1.0 - smoothstep(hwx+0.06-ax, hwx+0.06+ax, hx); inYf = 1.0 - smoothstep(y1+0.06-ay, y1+0.06+ay, y);
      frame = clamp(inXf*inYf - win, 0.0, 1.0); frameC = vec3(0.06);
    }
    // ---- r4-generic: recessed glass. The glass sits dRev behind the wall; jambs, head and sill show with parallax
    // and cast sun shadow on the glass (fSunOcc scales direct light after the light loop).
    float dRev = s==4 ? 0.03 : (s==0||s==9) ? 0.3 : s==10 ? 0.34 : s==1 ? 0.22 : (s==5||s==11) ? 0.09 : s==6 ? 0.1 : 0.16;
    if (shop) dRev = door ? 0.55 : 0.12;
    vec3 Nw = normalize(vec3(vWNF.x, 0.0, vWNF.z)); vec3 Tw = vec3(-Nw.z, 0.0, Nw.x);   // Tw: direction of increasing u
    vec3 Vw = normalize(vWPosF - cameraPosition);
    vec3 rdW = vec3(dot(Vw, Tw), Vw.y, max(-dot(Vw, Nw), 0.04));   // window space: x along u, y up, +z into the wall
    float lx = (fu - 0.5) * bw;                                     // across the bay, 0 = opening centre
    float tG = dRev / rdW.z;
    float tX = (sign(rdW.x) * hwx - lx) / (abs(rdW.x) < 1e-4 ? 1e-4 : rdW.x);
    float tY = ((rdW.y > 0.0 ? y1 : y0) - y) / (abs(rdW.y) < 1e-4 ? 1e-4 : rdW.y);
    float tH = min(tG, min(max(tX, 0.0), max(tY, 0.0)));
    vec3 hp = vec3(lx, y, 0.0) + rdW * tH;                         // first surface hit inside the opening
    float onGlass = (tG <= tX && tG <= tY) ? 1.0 : 0.0;
    float revK = win * (1.0 - lodW) * (1.0 - onGlass);              // pixel shows a reveal surface
    vec3 jambN = (tX < tY) ? -sign(rdW.x) * Tw : vec3(0.0, rdW.y > 0.0 ? -1.0 : 1.0, 0.0);
    vec3 Ls = normalize(uSunDir); vec3 sW = vec3(dot(Ls, Tw), Ls.y, -dot(Ls, Nw));
    float sunOcc = 1.0;
    if (sW.z < -0.02) { vec2 q = hp.xy + sW.xy * (hp.z / -sW.z); float e = 0.015 + ax;
      sunOcc = (1.0 - smoothstep(hwx - e, hwx + e, abs(q.x))) * smoothstep(y0 - e, y0 + e, q.y) * (1.0 - smoothstep(y1 - e, y1 + e, q.y)); }
    // glass-plane coordinates for sash, mullions and the room behind
    float gx = hp.x, gy = hp.y;
    float sw = (s==5||s==11) ? 0.07 : (s==0||s==1||s==2||s==9) ? 0.06 : 0.045;
    float dEdge = min(hwx - abs(gx), min(gy - y0, y1 - gy));
    float bar = 1.0 - smoothstep(sw - ax, sw + ax, dEdge);
    bool oldSash = s==0||s==1||s==2||s==5||s==6||s==11;
    if (shop) {
      float tb = min(2.75, y1 - 0.5);
      bar = max(bar, 1.0 - smoothstep(0.03 - ay, 0.03 + ay, abs(gy - tb)));             // transom bar
      if (hwx > 1.2) bar = max(bar, 1.0 - smoothstep(0.03 - ax, 0.03 + ax, abs(gx)));    // centre mullion
    } else {
      if (oldSash && !arch && wh * fh > 1.1) bar = max(bar, 1.0 - smoothstep(0.035 - ay, 0.035 + ay, abs(gy - (y0 + y1) * 0.52)));   // meeting rail
      if (2.0 * hwx > 1.35 && s != 4) bar = max(bar, 1.0 - smoothstep(0.03 - ax, 0.03 + ax, abs(abs(gx) - (2.0 * hwx > 2.6 ? hwx / 3.0 : 0.0))));
    }
    if (s == 4) bar = max(bar, 1.0 - smoothstep(0.0, ax*2.0+0.02, abs(fract(u/bw)-0.5)*bw - hwx + 0.04));
    vec3 sashC = oldSash ? (bh < 0.7 ? vec3(0.82, 0.81, 0.77) : bh < 0.85 ? vec3(0.08, 0.1, 0.09) : vec3(0.3, 0.2, 0.14))
                         : (bh < 0.4 ? vec3(0.06, 0.06, 0.065) : bh < 0.7 ? vec3(0.17, 0.13, 0.1) : vec3(0.52, 0.52, 0.5));   // black / bronze / clear anodised
    // furnished interiors (interiors.js): floors share a room type; rooms span 1-4 bays; lights per room
    int rType = irFloorType(bUse, fi, h21(vec2(fi + 0.5, seed * 17.0)), fract(seed * 7.13));
    float span = min(irSpanOf(rType, h21(vec2(fi + 1.5, seed * 5.0))), nb);
    float ri = floor(bi / span);
    float rseed = floor(h21(vec2(ri + seed * 31.0, fi * 1.7 + seed * 7.0)) * 997.0) + fi * 13.0;
    float lit = irLitOf(rType, fract(rseed * 0.618 + 0.11));
    vec3 litC = irLampColor(rType, fract(rseed * 0.618));
    float wseed = h21(vec2(bi * 3.1 + seed, fi * 7.3)) * 911.0;
    vec3 interior = vec3(0.0);
    float farK = smoothstep(0.15, 0.6, pxu / bw * 8.0);   // tiny windows: average room colour, skip the trace
    vec4 cv = irCoverAvg(rType, wseed);                   // blinds / curtains (albedo, coverage)
    float covA = cv.a * 0.85; vec3 covAlb = cv.rgb;       // far: a blind covers part of the pane on average
    if (farK > 0.0 || uInteriors < 0.5) interior = irAverage(rType, rseed, lit, litC);
    if (lodW < 0.95 && abs(vWNF.y) < 0.5 && win > 0.001 && farK < 0.999 && uInteriors > 0.5) {
      float Wr = min(span, nb - ri * span) * bw, Hr = fh - 0.3;
      float bx = (bi - ri * span) * bw + bw * 0.5;
      vec3 ro = vec3(u - ri * span * bw + (gx - lx), min(gy, Hr - 0.01), 0.0);
      irSplit = true;
      vec3 rm = irRoom(ro, rdW, vec3(Wr, Hr, irDepthOf(rType, fract(rseed * 0.31))), rType, rseed,
                        wseed, lit, vec4(bx - hwx, y0, bx + hwx, y1), max(pxu, pxv), length(vWPosF - cameraPosition));
      irSplit = false;
      interior = mix(rm, interior, farK);
      covA = mix(irCovOut.a, covA, farK); covAlb = mix(irCovAlb, covAlb, farK);
    }
    covAlb = mix(covAlb, vec3(dot(covAlb, vec3(0.3, 0.55, 0.15))), 0.45);
    if (shop) { covA = 0.0; interior = interior / (1.0 + 0.4 * interior); }   // shops: no roller blinds by day; keep lit shop interiors from clipping at night   // sun-faded curtains: keep them from reading as coloured noise
    // ---- glass: Fresnel reflection of sky / opposite buildings / street over a dim room (daylight interiors are far
    // darker than the street). Each pane is tilted a hair differently so reflections break between panes.
    float ph = h21(vec2(bi * 7.1 + seed * 13.0 + step(0.0, gx) * 3.0, fi * 3.3 + step((y0 + y1) * 0.52, gy) * 1.7));
    vec3 Rf = reflect(Vw, Nw); Rf = normalize(Rf + (Tw * (ph - 0.5) * 0.06 + vec3(0.0, (fract(ph * 7.3) - 0.5) * 0.05, 0.0)) * (1.0 - farK));
    float cosT = clamp(-dot(Vw, Nw), 0.0, 1.0);
    float F0 = s == 4 ? 0.25 : shop ? 0.07 : 0.12;   // double glazing / coated curtain wall / clear shop glass
    float F = F0 + (1.0 - F0) * pow(1.0 - cosT, 5.0);
    float lumH = dot(uSkyHor, vec3(0.2126, 0.7152, 0.0722));
    float cl = textureLod(uNoise, Rf.xz / max(0.3, Rf.y + 0.45) * 0.03 + seed, 2.0).r;
    vec3 skyR = mix(uSkyHor, uSkyZen, smoothstep(0.02, 0.6, Rf.y)) * (0.9 + 0.35 * smoothstep(0.55, 0.75, cl));
    float ang = atan(Rf.x, Rf.z);
    float uo = u * 0.011;   // what a window reflects shifts along the street with the window
    float skyline = 0.08 + 0.34 * textureLod(uNoise, vec2(ang * 0.5 + uo, seed), 2.5).g;   // buildings / trees across the street
    float treeK = smoothstep(0.4, 0.56, textureLod(uNoise, vec2(ang * 1.3 + uo * 1.7, seed * 3.0 + 0.5), 2.0).r) * (1.0 - smoothstep(skyline - 0.14, skyline + 0.02, Rf.y) * 0.5);
    float bId = floor(ang * 7.0 + uo * 9.0 + seed * 5.0);   // building across
    float bTone = 0.22 + 0.85 * h21(vec2(bId, 2.7));   // sunlit or shaded facades
    float rows = 1.0 - 0.32 * (1.0 - farK) * smoothstep(0.15, 0.75, sin(Rf.y * 46.0 + bId * 1.7));   // window rows on the facades opposite
    float shopBand = 1.0 - 0.55 * (1.0 - smoothstep(0.02, 0.05, Rf.y));                         // their dark storefronts at eye level
    vec3 oppC = mix(vec3(0.66, 0.6, 0.52), vec3(0.6, 0.62, 0.64), h21(vec2(bId, 9.1))) * bTone * rows * shopBand;
    vec3 oppR = mix(oppC, vec3(0.12, 0.16, 0.1) * (0.7 + 0.6 * textureLod(uNoise, vec2(ang * 9.0, Rf.y * 8.0), 1.0).g), treeK) * lumH;
    vec3 streetR = vec3(0.42, 0.41, 0.4) * lumH * (0.45 + 0.4 * smoothstep(-0.5, 0.0, Rf.y));
    vec3 refl = mix(mix(streetR, oppR, smoothstep(-0.03, 0.005, Rf.y)), skyR, smoothstep(skyline - 0.012, skyline + 0.012, Rf.y));
    float dayK = mix(shop ? 0.42 : 0.3, 1.0, uNight);   // daylight rooms read dim behind glass (sun patches come via glassAlb)
    float paneK = win * (1.0 - lodW) * onGlass * (1.0 - bar);
    float sashK = win * (1.0 - lodW) * onGlass * bar;
    // compose: casing trim on the wall plane, reveal surfaces, sash, then glass (blind = lit albedo, room + reflection = emissive)
    col = mix(col, frameC, frame*(1.0-lodW));
    float wallShadow = 0.0, underSill = 0.0;   // extra sun shadow / AO on the wall plane (under sills / sign band)
    if (!shop && s != 4 && s != 3 && s != 10 && s != 8 && !arch) {
      float sx = hwx + (s==1 ? 0.09 : 0.06), sh0 = y0 - (s==1 ? 0.09 : 0.06);
      float inSx = 1.0 - smoothstep(sx - ax, sx + ax, hx);
      float sillM = inSx * smoothstep(sh0 - ay, sh0 + ay, y) * (1.0 - smoothstep(y0 - ay, y0 + ay, y));
      vec3 sillC = (s==1||s==0) ? vec3(0.7, 0.67, 0.61) : (s==2||s==5||s==11) ? frameC : min(wallBase * 1.25 + 0.06, vec3(0.75));
      col = mix(col, sillC, sillM * (1.0 - lodW)); rough = mix(rough, 0.7, sillM);
      float shH = sW.z < -0.02 ? 0.05 * sW.y / -sW.z : 0.0;      // the sill projects ~5 cm
      wallShadow = max(wallShadow, inSx * smoothstep(sh0 - shH - ay, sh0 - shH + ay, y) * (1.0 - smoothstep(sh0 - ay, sh0, y)));
      underSill = inSx * smoothstep(sh0 - 0.045 - ay, sh0 - 0.045 + ay, y) * (1.0 - smoothstep(sh0 - ay, sh0, y));   // contact shadow under the sill nose
      if (s == 1) {   // brick: stone lintel or soldier course over the opening
        float l1 = y1 + 0.2; float lin = (1.0 - smoothstep(sx - ax, sx + ax, hx)) * smoothstep(y1 - ay, y1 + ay, y) * (1.0 - smoothstep(l1 - ay, l1 + ay, y));
        col = mix(col, bh < 0.5 ? vec3(0.66, 0.63, 0.57) : wallBase * 0.8, lin * (1.0 - lodW));
      } else if (s == 5 || s == 11) {   // houses: a wider head casing over the window
        float h0 = y1 + fw, h1 = h0 + 0.09; float hd = (1.0 - smoothstep(hwx + fw + 0.03 - ax, hwx + fw + 0.03 + ax, hx)) * smoothstep(h0 - ay, h0 + ay, y) * (1.0 - smoothstep(h1 - ay, h1 + ay, y));
        col = mix(col, frameC * 0.95, hd * (1.0 - lodW));
      }
    }
    if (shop && bh < 0.75) {   // sign band: lighter cap flashing on top, cast shadow under its 8 cm projection
      float sb0 = y1 + 0.12, sb1 = groundH - 0.12;
      col = mix(col, vec3(0.5, 0.5, 0.48), smoothstep(sb1 - 0.06 - ay, sb1 - 0.06 + ay, y) * (1.0 - smoothstep(sb1 - ay, sb1 + ay, y)) * (1.0 - lodW));
      float shH = sW.z < -0.02 ? 0.08 * sW.y / -sW.z : 0.0;
      wallShadow = max(wallShadow, smoothstep(sb0 - shH - ay, sb0 - shH + ay, y) * (1.0 - smoothstep(sb0 - ay, sb0, y)));
    }
    col = mix(col, wallBase * 0.92, revK);                       // reveal returns: same material, lit with their own normal
    fNrm = mix(fNrm, jambN - Nw, revK);
    col = mix(col, sashC, sashK); rough = mix(rough, 0.5, sashK);
    vec3 glassAlb = (covAlb * covA * 0.8 + vec3(0.065, 0.06, 0.054) * (1.0 - covA) * (1.0 - uNight)) * (1.0 - F);
    col = mix(col, glassAlb, paneK);
    rough = mix(rough, 0.25, paneK * (1.0 - covA)); rough = mix(rough, 0.6, paneK * covA);
    fEmis = (refl * F + interior * dayK * vec3(0.9, 0.94, 0.94) * (1.0 - covA) * (1.0 - F) * 0.85 + covAlb * covA * litC * lit * 0.35 * uNight) * paneK;
    fSunOcc = mix(1.0, sunOcc, win * (1.0 - lodW)) * (1.0 - wallShadow * (1.0 - win) * (1.0 - lodW));
    fAmbOcc = mix(1.0, 0.72 + 0.28 * onGlass, win * (1.0 - lodW)) * (1.0 - 0.5 * underSill * (1.0 - lodW));
    fNrmK = mix(1.0, 0.0, paneK);
    // far LOD: average window coverage (glass darkens the wall, reflects the sky at grazing angles, lit rooms glow at night)
    float cover = ww*wh;
    float covF = cv.a * 0.6;
    col = mix(col, mix(col, mix(vec3(0.02, 0.022, 0.025), covAlb * 0.75, covF), cover * 0.85), lodW);
    fEmis += (refl * F + interior * dayK * 0.6) * cover * 0.85 * (1.0 - covF) * lodW;
    fEmis += litC * lit * cover * 0.45 * uNight * lodW;   // far LOD: lit rooms as a soft glow
  }
  fCol = col; fRough = rough;
}`;

export function makeWallMaterial() { // exported for QA hot-swap (tools)
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.85, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNoise = { value: noiseTexture() }; sh.uniforms.uNight = U.uNight; sh.uniforms.uSkyZen = U.uSkyZen; sh.uniforms.uSkyHor = U.uSkyHor; sh.uniforms.uSunDir = U.uSunDir; pbrUniforms(sh.uniforms); ghUniforms(sh.uniforms); // gfx-materials; r4-generic: uSunDir for window reveals
    sh.uniforms.uInteriors = IR.uInteriors; // interiors.js detail level
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aFac; flat varying vec4 vFac; varying vec2 vUvF; varying vec3 vWPosF; varying vec3 vWNF;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vFac = aFac; vUvF = uv; vWPosF = (modelMatrix*vec4(transformed,1.0)).xyz; vWNF = normalize(mat3(modelMatrix)*normal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + PBR_GLSL + GH_GLSL + FACADE_GLSL.replace('vec3 fCol; float fRough;', FACADE_PBR_GLSL + 'vec3 fCol; float fRough;')) // gfx-materials
      .replace('#include <color_fragment>', '#include <color_fragment>\n facade(diffuseColor.rgb);\n diffuseColor.rgb = fCol;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = fRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = fMetal;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += fEmis;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = normalize(normal + (viewMatrix * vec4(fNrm * fNrmK, 0.0)).xyz);') // gfx-materials: wall relief (not on glass); r4-generic: fNrmK mask, reveal normals
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n reflectedLight.directDiffuse *= fSunOcc; reflectedLight.directSpecular *= fSunOcc; reflectedLight.indirectDiffuse *= fAmbOcc;'); // r4-generic: window reveal shadow + recess AO
  };
  mat.customProgramCacheKey = () => 'facade-v6-r4-' + IR.level;
  return mat;
}
export function makeRoofMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNoise = { value: noiseTexture() }; pbrUniforms(sh.uniforms); // gfx-materials
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aFac; varying vec4 vFacR; varying vec2 vUvR; varying vec3 vWPosR, vNR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vFacR = aFac; vUvR = uv; vWPosR = (modelMatrix*vec4(transformed,1.0)).xyz; vNR = mat3(modelMatrix)*normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D uNoise; varying vec4 vFacR; varying vec2 vUvR;
float h21r(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
varying vec3 vWPosR, vNR;
` + PBR_GLSL + ROOF_PBR_GLSL) // gfx-materials
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
   if (uPbrOn > 0.5) roofPBR(t, uv, vFacR.y, c); // gfx-materials
   diffuseColor.rgb = c; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n if (fRoughR >= 0.0) roughnessFactor = fRoughR;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = normalize(normal + (viewMatrix * vec4(fNrmR, 0.0)).xyz);'); // gfx-materials
  };
  mat.customProgramCacheKey = () => 'roof-v2-pbr1';
  return mat;
}

// Procedural stand-ins for buildings that have a hand-modelled landmark module: shown until (and while) the landmark is not loaded.
class StandinManager {
  constructor(map, wallMat, roofMat) {
    // [r6-load] the stand-in source arrays live for the whole session (rebuilds on landmark load/unload): keep them as
    // Float32Array instead of JS number arrays, about a third of the heap
    for (const s of map.values()) for (const kind of ['walls', 'roofs']) { const b = s[kind]; if (b) for (const k of ['p', 'n', 'uv', 'c', 'f']) if (Array.isArray(b[k])) b[k] = Float32Array.from(b[k]); }
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
