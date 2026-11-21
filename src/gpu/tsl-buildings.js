// [gfx-webgpu] TSL ports of buildings.js (procedural facade + roof), far.js skyline and midcity.js.
import * as THREE from 'three/webgpu';
import { Fn, float, int, vec2, vec3, vec4, uniform, uniformArray, texture, attribute, uv, positionWorld, positionLocal, normalWorldGeometry, normalLocal, cameraPosition, vertexColor,
  mix, smoothstep, clamp, fract, floor, step, abs, max, min, sin, cos, dot, length, normalize, fwidth, pow, atan, reflect, If, property, materialColor, select } from 'three/tsl';

const gmod = (x, y) => x.sub(floor(x.div(y)).mul(y));
const h21 = (p) => { const q = fract(p.mul(vec2(123.34, 456.21))).toVar(); q.addAssign(dot(q, q.add(45.32))); return fract(q.x.mul(q.y)); };
// style table: floorH, bayW, winW, winH | sill, groundH, frameW, kind
const STYLE_A = [[4.6, 3.8, 0.40, 0.56], [3.9, 3.0, 0.44, 0.55], [3.8, 3.5, 0.36, 0.50], [3.9, 2.9, 0.70, 0.48], [4.0, 1.55, 0.94, 0.80], [3.0, 4.2, 0.30, 0.46], [3.0, 3.4, 0.42, 0.48], [3.5, 3.6, 0.48, 0.50], [5.5, 6.0, 0.34, 0.22], [8.0, 4.8, 0.28, 0.62], [3.9, 3.3, 0.60, 0.44], [3.0, 4.4, 0.30, 0.45]];
const STYLE_B = [[0.24, 5.0, 0.10, 0], [0.28, 4.2, 0.08, 1], [0.30, 4.2, 0.06, 2], [0.34, 4.5, 0.03, 3], [0.10, 4.8, 0.02, 4], [0.32, 3.2, 0.06, 5], [0.32, 3.4, 0.05, 6], [0.30, 4.4, 0.05, 7], [0.60, 5.5, 0.03, 8], [0.25, 8.0, 0.06, 9], [0.36, 4.6, 0.12, 10], [0.32, 3.2, 0.07, 11]];

export function facadeMaterial(m, un, ctx, key) {
  const nm = new THREE.MeshStandardNodeMaterial({ color: m.color ? m.color.getHex() : 0xffffff, roughness: 0.85, metalness: 0 });
  const NZ = ctx.tex(un.uNoise && un.uNoise.value), uNight = ctx.u(un.uNight), uSkyZen = ctx.u(un.uSkyZen, new THREE.Color()), uSkyHor = ctx.u(un.uSkyHor, new THREE.Color());
  const SA = uniformArray(STYLE_A.map((a) => new THREE.Vector4(...a)), 'vec4'), SB = uniformArray(STYLE_B.map((a) => new THREE.Vector4(...a)), 'vec4');
  const aFac = attribute('aFac', 'vec4');
  const gRough = property('float', 'gFRough'), gMetal = property('float', 'gFMetal'), gEmis = property('vec3', 'gFEmis');
  const cao = key.includes('|cao') ? ctx.cao(un) : null;
  const facade = () => {
    const fac = aFac.toVar();
    const s = floor(fac.x.add(0.5)).toVar(); const seed = fac.y.toVar(), edgeLen = fac.z.toVar(), topH = fac.w.toVar();
    const si = int(clamp(s, 0.0, 11.0)).toVar();
    const A = SA.element(si).toVar(), B = SB.element(si).toVar();
    const floorH = A.x, bayW = A.y, winW = A.z, winH = A.w, sill = B.x, groundH = B.y, frameW = B.z;
    const UV = uv().toVar(); const u = UV.x, v = UV.y;
    const wallC = materialColor.rgb.mul(vertexColor().rgb);
    const col = wallC.mul(0.86).toVar(); const rough = float(0.85).toVar();
    gMetal.assign(0.0); gEmis.assign(vec3(0.0));
    const nz = NZ.sample(UV.mul(0.21).add(seed.mul(7.0))).toVar();
    const nf = NZ.sample(UV.mul(1.3).add(seed.mul(3.0))).toVar();
    const pxu = fwidth(u).toVar(), pxv = fwidth(v);
    const detail = smoothstep(0.03, 0.12, max(pxu, pxv)).oneMinus().toVar();
    col.mulAssign(float(0.9).add(nz.r.mul(0.16)).add(nf.b.sub(0.5).mul(0.06).mul(detail)));
    If(s.equal(1.0), () => { // brick courses
      const bv = v.div(0.075); const row = floor(bv); const bu = u.div(0.22).add(gmod(row, 2.0).mul(0.5));
      const mm = smoothstep(0.0, 0.12, fract(bv)).mul(smoothstep(0.0, 0.06, fract(bu)));
      col.mulAssign(mix(float(1.0), mix(float(1.35), h21(vec2(floor(bu), row)).mul(0.16).add(0.92), mm), detail));
    }).ElseIf(s.equal(5.0), () => { const sv = fract(v.div(0.21)); col.mulAssign(mix(float(1.0), smoothstep(0.0, 0.15, sv).mul(0.12).add(0.88), detail)); })
      .ElseIf(s.equal(11.0), () => {
        const sv = v.div(0.32); const row = floor(sv); const su = u.div(0.24).add(h21(vec2(row, 1.0)));
        col.assign(mix(col, col.mul(h21(vec2(floor(su), row)).mul(0.35).add(0.75)), detail).mul(mix(float(1.0), smoothstep(0.0, 0.2, fract(sv)).mul(0.25).add(0.75), detail)));
      }).ElseIf(s.equal(3.0).or(s.equal(10.0)), () => {
        col.mulAssign(mix(float(1.0), smoothstep(0.02, 0.05, abs(fract(u.div(1.5)).sub(0.5)).mul(1.5)).mul(0.1).add(0.9), detail.mul(0.6)));
        If(s.equal(10.0), () => { col.mulAssign(smoothstep(0.0, 0.02, abs(fract(v.div(0.3)).sub(0.5)).mul(0.3)).mul(0.1).mul(detail).add(0.93)); });
      }).ElseIf(s.equal(8.0), () => { col.mulAssign(mix(float(1.0), abs(sin(u.mul(31.4))).mul(0.15).add(0.85), detail)); });
    If(s.equal(0.0).and(v.lessThan(groundH)), () => { const g = fract(v.div(0.6)); col.mulAssign(mix(float(1.0), smoothstep(0.0, 0.08, g).mul(smoothstep(1.0, 0.92, g)).mul(0.18).add(0.82), detail)); });
    If(v.lessThan(0.55), () => { col.mulAssign(0.82); });
    If(topH.greaterThan(6.0).and(s.equal(0.0).or(s.equal(1.0)).or(s.equal(2.0)).or(s.equal(7.0)).or(s.equal(9.0))), () => {
      const c0 = topH.sub(1.1), c1 = topH.sub(0.35);
      If(v.greaterThan(c0).and(v.lessThan(c1)), () => { col.mulAssign(1.08); });
      If(v.greaterThan(c0.sub(0.25)).and(v.lessThan(c0)), () => { col.mulAssign(0.7); });
    });
    // windows
    const nb = max(1.0, floor(edgeLen.div(bayW).add(0.5))); const bw = edgeLen.div(nb).toVar();
    const lodW = smoothstep(0.25, 0.6, pxu.div(bw).mul(6.0)).toVar();
    const hasWin = edgeLen.greaterThan(2.4).and(v.greaterThan(0.6)).and(v.lessThan(topH.sub(0.6))).and(s.notEqual(12.0)).select(1.0, 0.0).toVar();
    const fi = float(0).toVar(), fv = float(0).toVar(), fh = float(0).toVar();
    If(v.lessThan(groundH), () => { fi.assign(0.0); fh.assign(groundH); fv.assign(v.div(groundH)); })
      .Else(() => { fi.assign(floor(v.sub(groundH).div(floorH)).add(1.0)); fh.assign(floorH); fv.assign(fract(v.sub(groundH).div(floorH))); });
    const bi = floor(u.div(bw)).toVar(); const fu = fract(u.div(bw)).toVar();
    const ww = float(winW).toVar(), wh = float(winH).toVar(), sl = float(sill).toVar();
    If(fi.lessThan(0.5), () => {
      If(s.equal(7.0), () => { ww.assign(0.86); wh.assign(0.72); sl.assign(0.06); })
        .ElseIf(s.equal(0.0), () => { ww.assign(0.30); wh.assign(0.42); sl.assign(0.30); })
        .ElseIf(s.equal(4.0), () => { ww.assign(0.94); wh.assign(0.85); sl.assign(0.04); });
    });
    const rnd = h21(vec2(bi.add(seed.mul(91.0)), fi.add(seed.mul(17.0)))).toVar();
    If(s.equal(5.0).or(s.equal(11.0)).or(s.equal(6.0)).and(rnd.lessThan(0.18)), () => { hasWin.assign(0.0); });
    If(s.equal(8.0).and(rnd.lessThan(0.4)), () => { hasWin.assign(0.0); });
    const floorTop = fi.lessThan(0.5).select(groundH, groundH.add(fi.mul(floorH))).toVar();
    If(floorTop.greaterThan(topH.sub(0.2)).and(fi.greaterThan(0.5)), () => {
      hasWin.mulAssign(floorTop.sub(fh.mul(float(1.0).sub(sl).sub(wh))).lessThan(topH.sub(0.3)).select(1.0, 0.0));
    });
    If(hasWin.greaterThan(0.5), () => {
      const hx = abs(fu.sub(0.5)).mul(bw).toVar(), hwx = ww.mul(bw).mul(0.5).toVar();
      const y0 = sl.mul(fh).toVar(), y1 = sl.add(wh).mul(fh).toVar(), y = fv.mul(fh).toVar();
      const ax = fwidth(u).mul(1.2).toVar(), ay = fwidth(v).mul(1.2).toVar();
      const inX = smoothstep(hwx.sub(ax), hwx.add(ax), hx).oneMinus().toVar();
      const inY = smoothstep(y0.sub(ay), y0.add(ay), y).mul(smoothstep(y1.sub(ay), y1.add(ay), y).oneMinus()).toVar();
      If(s.equal(0.0).and(fi.greaterThan(0.5)).or(s.equal(9.0)), () => { // arched tops
        const rr = hwx; const cy = y1.sub(rr);
        If(y.greaterThan(cy), () => { const d = length(vec2(hx, y.sub(cy))); inY.mulAssign(smoothstep(rr.sub(ax), rr.add(ax), d).oneMinus()); });
      });
      const win = inX.mul(inY).toVar();
      const fw = frameW;
      const inXf = smoothstep(hwx.add(fw).sub(ax), hwx.add(fw).add(ax), hx).oneMinus(), inYf = smoothstep(y0.sub(fw).sub(ay), y0.sub(fw).add(ay), y).mul(smoothstep(y1.add(fw).sub(ay), y1.add(fw).add(ay), y).oneMinus());
      const frame = clamp(inXf.mul(inYf).sub(win), 0.0, 1.0).toVar();
      const dark = s.equal(3.0).or(s.equal(4.0)).or(s.equal(10.0)).or(s.equal(8.0)), light = s.equal(1.0).or(s.equal(5.0)).or(s.equal(11.0)).or(s.equal(0.0)).or(s.equal(2.0));
      const frameC = dark.select(vec3(0.16, 0.17, 0.18), light.select(vec3(0.86, 0.85, 0.8), vec3(0.3))).toVar();
      const blind = h21(vec2(bi.mul(3.1).add(seed), fi.mul(7.3))).toVar();
      const glass = mix(vec3(0.05, 0.06, 0.07), vec3(0.14, 0.15, 0.15), step(0.86, blind).mul(0.7)).toVar();
      const rec = smoothstep(y1.sub(fh.mul(0.35).mul(wh)), y1, y).toVar();
      glass.mulAssign(rec.mul(0.35).oneMinus());
      const nW = normalWorldGeometry.toVar(); const wpos = positionWorld.toVar();
      const interior = vec3(0.0).toVar();
      If(lodW.lessThan(0.95).and(abs(nW.y).lessThan(0.5)), () => { // interior mapping
        const N = normalize(vec3(nW.x, 0.0, nW.z)).toVar(); const Tg = normalize(vec3(0.0, 1.0, 0.0).cross(N)).toVar();
        const V = normalize(wpos.sub(cameraPosition)).toVar();
        const vt = dot(V, Tg).toVar(), vu = V.y.toVar(), vn = max(1e-3, dot(V, N).negate()).toVar();
        const px = fract(u.div(bw)).mul(bw).toVar(), py = fv.mul(fh).toVar(), depth = h21(vec2(bi.add(3.0), fi.add(seed.mul(5.0)))).mul(1.5).add(3.2);
        const tx = vt.greaterThan(0.0).select(bw.sub(px).div(vt), px.negate().div(max(vt.negate(), 1e-4))).toVar();
        const ty = vu.greaterThan(0.0).select(fh.sub(py).div(vu), py.negate().div(max(vu.negate(), 1e-4))).toVar();
        const tz = depth.div(vn).toVar();
        const t = min(tx, min(ty, tz)).toVar();
        const roomTint = mix(vec3(0.85, 0.78, 0.66), vec3(0.72, 0.78, 0.82), step(0.5, h21(vec2(bi.mul(7.0).add(seed), fi.mul(3.0))))).toVar();
        If(s.equal(7.0).and(fi.lessThan(0.5)), () => { roomTint.assign(mix(vec3(0.95, 0.9, 0.8), vec3(0.85, 0.88, 0.9), h21(vec2(bi, seed)))); });
        const wallC2 = vec3(0.0).toVar();
        If(t.equal(tz), () => { wallC2.assign(roomTint.mul(0.9)); })
          .ElseIf(t.equal(tx), () => { wallC2.assign(roomTint.mul(0.65)); })
          .Else(() => { wallC2.assign(vu.greaterThan(0.0).select(vec3(0.92), vec3(0.28, 0.22, 0.18))); });
        const blindCover = step(0.7, blind).mul(smoothstep(0.0, 0.02, y1.sub(y).sub(h21(vec2(bi, fi.mul(1.3))).mul(0.5).add(0.35).mul(y1.sub(y0)))));
        interior.assign(mix(wallC2, vec3(0.78, 0.74, 0.66), blindCover));
        interior.assign(mix(interior, vec3(0.45, 0.42, 0.38), smoothstep(0.15, 0.6, pxu.div(bw).mul(8.0))));
      });
      // mullions
      const mul = float(0.0).toVar();
      If(s.equal(4.0), () => { mul.assign(smoothstep(0.0, ax.mul(2.0).add(0.02), abs(fract(u.div(bw)).sub(0.5)).mul(bw).sub(hwx).add(0.04)).oneMinus()); })
        .ElseIf(ww.mul(bw).greaterThan(1.2), () => { mul.assign(smoothstep(0.02, ax.add(0.02), abs(hx)).oneMinus()); });
      const litTh = s.equal(3.0).or(s.equal(4.0)).or(s.equal(10.0)).select(0.68, 0.62);
      const lit = s.equal(7.0).and(fi.lessThan(0.5)).select(0.0, step(litTh, h21(vec2(bi.mul(1.7).add(seed.mul(13.0)), fi.mul(2.3).add(seed))))).toVar();
      const litC = mix(vec3(1.0, 0.78, 0.48), vec3(0.85, 0.9, 1.0), step(0.85, h21(vec2(bi, fi.add(3.0))))).toVar();
      const wmask = win.mul(lodW.oneMinus()).toVar();
      col.assign(mix(col, frameC, frame.mul(lodW.oneMinus())));
      col.assign(mix(col, glass, wmask));
      col.assign(mix(col, frameC.mul(0.6), mul.mul(wmask)));
      rough.assign(mix(rough, 0.06, wmask)); gMetal.assign(mix(0.0, 0.35, wmask));
      const shop = s.equal(7.0).and(fi.lessThan(0.5));
      const dayInt = shop.select(0.32, 0.16).mul(uNight.oneMinus()).add(shop.select(0.35, 0.0).mul(uNight)).toVar();
      // fake sky / street reflection with Fresnel
      const Nw = normalize(vec3(nW.x, 0.0, nW.z)).toVar(); const Vw = normalize(wpos.sub(cameraPosition)).toVar();
      const Rf = reflect(Vw, Nw).toVar(); const cosT = clamp(dot(Vw.negate(), Nw), 0.0, 1.0);
      const F = pow(cosT.oneMinus(), 5.0).mul(0.94).add(0.06).toVar();
      const cl = NZ.sample(Rf.xz.div(max(0.3, Rf.y.add(0.45))).mul(0.03).add(seed)).level(2.0).r;
      const skyR = mix(uSkyHor, uSkyZen, smoothstep(0.0, 0.6, Rf.y)).mul(smoothstep(0.55, 0.75, cl).mul(0.35).add(0.9)).toVar();
      const ang = atan(Rf.x, Rf.z).toVar(); const skyline = NZ.sample(vec2(ang.mul(0.8), seed)).g.mul(0.22).add(0.04);
      const streetR = mix(uSkyHor.mul(0.08), uSkyHor.mul(0.22), smoothstep(-0.4, 0.0, Rf.y)).mul(NZ.sample(vec2(ang.mul(0.6), seed)).level(1.0).r.mul(0.5).add(0.75));
      const refl = Rf.y.greaterThan(skyline).select(skyR, streetR).toVar();
      const wobble = NZ.sample(vec2(bi.mul(0.37).add(seed), fi.mul(0.21))).b.sub(0.5).mul(0.15);
      refl.mulAssign(wobble.add(1.0));
      const kRefl = mix(0.25, 0.95, F).toVar();
      gEmis.assign(interior.mul(wmask).mul(dayInt.add(lit.mul(uNight).mul(0.75))).mul(vec3(1.0, 0.86, 0.66)).mul(kRefl.mul(0.6).oneMinus()).mul(rec.mul(0.4).oneMinus())
        .add(refl.mul(kRefl).mul(wmask).mul(0.85)).add(litC.mul(lit).mul(wmask).mul(uNight).mul(0.12)));
      col.assign(mix(col, vec3(0.02, 0.025, 0.03), wmask)); rough.assign(mix(rough, 0.4, wmask)); gMetal.assign(mix(gMetal, 0.0, wmask));
      const cover = ww.mul(wh);
      col.assign(mix(col, mix(col, vec3(0.1, 0.11, 0.12), cover.mul(0.8)), lodW));
      gEmis.addAssign(litC.mul(lit).mul(cover).mul(0.45).mul(uNight).mul(lodW));
    });
    gRough.assign(rough);
    return vec4(col, 1.0);
  };
  if (cao) ctx.applyAO(nm, () => { cao.compute(); return facade(); }, cao.prop);
  else nm.colorNode = Fn(facade)();
  nm.roughnessNode = gRough; nm.metalnessNode = gMetal; nm.emissiveNode = gEmis;
  ctx.flags(nm, m); nm.vertexColors = false; // vertex colour consumed inside facade()
  return nm;
}

export function roofMaterial(m, un, ctx, key) {
  const nm = new THREE.MeshStandardNodeMaterial({ color: m.color ? m.color.getHex() : 0xffffff, roughness: 0.9, metalness: 0 });
  const NZ = ctx.tex(un.uNoise && un.uNoise.value);
  const aFac = attribute('aFac', 'vec4');
  const cao = key.includes('|cao') ? ctx.cao(un) : null;
  const roof = () => {
    const t = floor(aFac.x.add(0.5)).toVar(); const UV = uv().toVar();
    const px = max(fwidth(UV.x), fwidth(UV.y)); const det = smoothstep(0.02, 0.09, px).oneMinus().toVar();
    const n = NZ.sample(UV.mul(0.09).add(aFac.y.mul(5.0))).toVar(); const n2 = NZ.sample(UV.mul(0.8)).toVar();
    const c = materialColor.rgb.mul(vertexColor().rgb).mul(0.82).toVar();
    If(t.equal(0.0), () => { c.mulAssign(n.r.mul(0.2).add(0.88).add(n2.b.sub(0.5).mul(0.08).mul(det))); })
      .ElseIf(t.equal(1.0), () => { // clay barrel tile
        const bu = UV.x.div(0.25), bv = UV.y.div(0.33); const row = floor(bv); const barrel = sin(fract(bu).mul(3.14159));
        const lap = pow(fract(bv), 3.0); const tone = h21(vec2(floor(bu), row)).mul(0.24).add(0.88);
        c.mulAssign(mix(n.g.mul(0.1).add(0.95), tone.mul(float(0.74).add(barrel.mul(0.36)).sub(lap.mul(0.22))), det));
      }).ElseIf(t.equal(2.0), () => { // asphalt shingles
        const bv = UV.y.div(0.2); const row = floor(bv); const bu = UV.x.div(0.34).add(gmod(row, 2.0).mul(0.5));
        const tone = h21(vec2(floor(bu), row)).mul(0.25).add(0.85); const g = smoothstep(0.85, 1.0, fract(bv));
        c.mulAssign(mix(n.g.mul(0.1).add(0.95), tone.mul(g.mul(0.3).oneMinus()).mul(n2.b.mul(0.2).add(0.9)), det));
      }).Else(() => { // standing seam / slate
        c.mulAssign(mix(float(1.0), smoothstep(0.0, 0.05, abs(fract(UV.x.div(0.45)).sub(0.5))).mul(0.1).add(0.9), det).mul(n.r.mul(0.12).add(0.92)));
      });
    return vec4(c, 1.0);
  };
  if (cao) ctx.applyAO(nm, () => { cao.compute(); return roof(); }, cao.prop);
  else nm.colorNode = Fn(roof)();
  ctx.flags(nm, m); nm.vertexColors = false;
  return nm;
}

const hc = (p) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453));
export function farCityMaterial(m, un, ctx) {
  const nm = ctx.origFrom(m); const uNight = ctx.u(un.uNight);
  const side = abs(normalLocal.y).lessThan(0.5).select(1.0, 0.0);
  nm.colorNode = Fn(() => {
    const w = positionWorld.toVar(); const band = step(0.45, fract(w.y.div(3.6)));
    const tone = hc(vec2(floor(w.x.div(40.0)), floor(w.z.div(40.0)))).mul(0.35).add(0.75);
    return vec4(materialColor.rgb.mul(tone).mul(mix(float(1.0), mix(float(0.55), float(1.0), band), side)), 1.0);
  })();
  nm.emissiveNode = Fn(() => {
    const w = positionWorld.toVar(); const fl = floor(w.y.div(3.6)); const cell = floor(w.x.add(w.z).div(3.0));
    const lit = step(0.62, hc(vec2(cell, fl))).mul(step(0.45, fract(w.y.div(3.6))).oneMinus()).mul(side);
    return vec3(1.0, 0.82, 0.55).mul(lit).mul(uNight).mul(2.5);
  })();
  return nm;
}

export function midCityMaterial(m, un, ctx) {
  const nm = ctx.origFrom(m); const uNight = ctx.u(un.uNight);
  const hm = (p) => fract(sin(dot(p, vec2(41.3, 289.1))).mul(43758.5));
  const winMask = Fn(() => {
    const w = positionLocal; const side = step(abs(normalLocal.y), 0.5); const fl = fract(w.y.div(3.2)); const along = fract(w.x.add(w.z).div(3.0));
    return side.mul(step(0.35, fl)).mul(step(fl, 0.8)).mul(step(0.25, along)).mul(step(along, 0.75));
  });
  nm.colorNode = Fn(() => vec4(mix(materialColor.rgb, vec3(0.08, 0.09, 0.1), winMask().mul(0.7)), 1.0))();
  nm.emissiveNode = Fn(() => {
    const w = positionLocal; const lit = step(0.7, hm(vec2(floor(w.x.add(w.z).div(3.0)), floor(w.y.div(3.2))))).mul(winMask());
    return vec3(1.0, 0.8, 0.55).mul(lit).mul(uNight).mul(1.6);
  })();
  return nm;
}
