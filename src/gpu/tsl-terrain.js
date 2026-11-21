// [gfx-webgpu] TSL ports of terrain.js: core LiDAR terrain (coreTerrain-v7), orthophoto rings, bay water; plus the creek.
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, vec4, ivec2, uniform, texture, attribute, positionLocal, positionWorld, cameraPosition, cameraViewMatrix,
  mix, smoothstep, clamp, fract, floor, step, abs, max, sin, cos, dot, length, normalize, fwidth, If, property } from 'three/tsl';

const gmod = (x, y) => x.sub(floor(x.div(y)).mul(y)); // GLSL mod (WGSL % truncates)
const aaStep = (d) => { const fw = max(fwidth(d), 1e-4); return smoothstep(fw.negate(), fw, d); };
const toViewN = (wN) => normalize(cameraViewMatrix.mul(vec4(wN, 0.0)).xyz);

export function coreTerrainMaterial(m, un, ctx) {
  const nm = new THREE.MeshStandardNodeMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
  const H = texture(un.uHeight.value), SDF = texture(un.uSdf.value), SP = texture(un.uSpecial.value), AUX = texture(un.uAux.value), NZ = texture(un.uNoise.value);
  const ORTHO = ctx.tex(un.uOrtho.value), LAMP = ctx.tex(un.uLamp.value), LEAF = ctx.tex(un.uLeaf.value);
  const uCore = uniform(un.uCore.value), uCoreSize = uniform(un.uCoreSize.value), uGround = uniform(un.uGround.value), uAuxRect = uniform(un.uAuxRect.value), uLampRect = uniform(un.uLampRect.value);
  const uNight = ctx.u(un.uNight);
  const coreH = (w) => {
    const f = clamp(w.sub(uCore.xy).div(uCore.z), vec2(0.0), uCoreSize.sub(1.001)).toVar();
    const fi = floor(f); const i = ivec2(fi).toVar(); const t = f.sub(fi).toVar();
    const a = H.load(i).r, b = H.load(i.add(ivec2(1, 0))).r, c = H.load(i.add(ivec2(0, 1))).r, d = H.load(i.add(ivec2(1, 1))).r;
    return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
  };
  const aSkirt = attribute('aSkirt', 'float');
  // positionLocal already includes the instance (chunk) offset in r187
  nm.positionNode = Fn(() => vec3(positionLocal.x, coreH(positionLocal.xz).sub(aSkirt.mul(4.0)), positionLocal.z))();
  const gRough = property('float', 'gRough'), gAO = property('float', 'gAO'), gBump = property('vec3', 'gBump'), gEmis = property('vec3', 'gEmis');
  nm.colorNode = Fn(() => {
    const w = positionWorld.xz.toVar();
    const dist = length(positionWorld.sub(cameraPosition)).toVar();
    const s = SDF.sample(w.sub(uGround.xy).div(uGround.zw)).toVar();
    const ax = AUX.sample(w.sub(uAuxRect.xy).div(uAuxRect.zw)).toVar();
    const sp = floor(SP.sample(w.sub(uGround.xy).div(uGround.zw)).r.mul(255.0).add(0.5)).toVar();
    const n0 = NZ.sample(w.mul(0.013)).toVar(), n1 = NZ.sample(w.mul(0.071)).toVar(), n2 = NZ.sample(w.mul(0.37)).toVar(), n3 = NZ.sample(w.mul(1.9)).toVar();
    const fade = clamp(dist.div(120.0), 0.0, 1.0).toVar();
    const edgeN = n1.g.sub(0.5).mul(0.9).add(n2.b.sub(0.5).mul(0.35)).toVar();
    const dA = s.r.sub(0.5).mul(6.0).toVar(), dP = s.g.sub(0.5).mul(6.0), dG = s.b.sub(0.5).mul(6.0), dD = s.a.sub(0.5).mul(6.0);
    const mA = aaStep(dA.add(0.05)).toVar(), mP = aaStep(dP.add(0.05).add(n2.b.sub(0.5).mul(0.06))).toVar(), mG = aaStep(dG.add(edgeN.mul(0.7))).toVar(), mD = aaStep(dD.add(edgeN)).toVar();
    const lush = ax.r, ao = ax.g;
    const dry = mix(vec3(0.44, 0.37, 0.22), vec3(0.58, 0.50, 0.31), n1.r).mul(n2.g.mul(0.3).add(0.85));
    const lushC = mix(vec3(0.16, 0.25, 0.08), vec3(0.24, 0.33, 0.11), n1.g).mul(n2.r.mul(0.3).add(0.85));
    const col = mix(dry, lushC, smoothstep(0.25, 0.85, lush)).toVar();
    const rough = float(0.97).toVar();
    // lawn
    const lawn = mix(vec3(0.12, 0.19, 0.06), vec3(0.20, 0.28, 0.09), n1.r.mul(0.6).add(n2.g.mul(0.4))).toVar();
    lawn.mulAssign(n0.g.mul(0.3).add(0.82));
    lawn.assign(mix(lawn, lawn.mul(vec3(1.12, 1.04, 0.82)), smoothstep(0.55, 0.8, n0.r).mul(0.6)));
    const mow = step(0.5, fract(dot(w, vec2(0.7071, 0.7071)).div(5.0)));
    lawn.mulAssign(mix(float(1.0), mow.mul(0.12).add(0.94), fade.oneMinus().mul(0.8)));
    lawn.mulAssign(n3.b.mul(0.36).mul(fade.mul(0.7).oneMinus()).add(0.82));
    lawn.assign(mix(lawn, vec3(0.36, 0.33, 0.17), smoothstep(0.55, 0.95, lush.oneMinus()).mul(0.5)));
    col.assign(mix(col, lawn, mG));
    // forest floor / dirt
    const litter = mix(vec3(0.11, 0.085, 0.06), vec3(0.19, 0.15, 0.10), n2.r).mul(n1.b.mul(0.4).add(0.8)).toVar();
    litter.assign(mix(litter, vec3(0.13, 0.16, 0.08), smoothstep(0.6, 0.85, n1.g).mul(0.5)));
    litter.assign(mix(litter, vec3(0.45, 0.36, 0.18), step(0.82, n3.a.add(n2.b.mul(0.3))).mul(0.6)));
    litter.mulAssign(n3.b.mul(0.4).mul(fade.mul(0.7).oneMinus()).add(0.8));
    col.assign(mix(col, litter, mD)); rough.assign(mix(rough, 1.0, mD));
    // pavement: scored concrete
    const conc = vec3(0.43, 0.42, 0.40).mul(float(0.86).add(n1.r.mul(0.2)).add(n0.g.mul(0.1)).add(n3.b.sub(0.5).mul(0.06).mul(fade.oneMinus()))).toVar();
    const jw = abs(fract(w.div(1.52)).sub(0.5));
    const jl = max(fwidth(w.x.div(1.52)), 1e-3);
    const joint = smoothstep(0.0, jl.mul(1.5), float(0.5).sub(max(jw.x, jw.y))).oneMinus().mul(smoothstep(0.08, 0.3, jl.mul(6.0)).oneMinus()).mul(fade.oneMinus());
    conc.mulAssign(joint.mul(0.25).oneMinus());
    const pav = vec3(conc).toVar();
    If(sp.greaterThan(3.5).and(sp.lessThan(4.5)), () => { // brick pavers
      const b0 = w.mul(vec2(4.5, 9.0)); const row = floor(b0.y);
      const b = vec2(b0.x.add(gmod(row, 2.0).mul(0.5)), b0.y).toVar(); const fb = fract(b);
      const lodB = smoothstep(0.05, 0.25, max(fwidth(b.x), fwidth(b.y))).oneMinus();
      const mm = mix(float(1.0), step(0.06, fb.x).mul(step(0.1, fb.y)), lodB);
      pav.assign(mix(vec3(0.34, 0.27, 0.24), vec3(0.50, 0.30, 0.24).mul(float(0.85).add(NZ.sample(floor(b).mul(0.13)).b.mul(0.3).mul(lodB))), mm));
    }).ElseIf(sp.greaterThan(4.5).and(sp.lessThan(5.5)), () => { // granite pavers
      const b = fract(w.div(0.9)); const mm = step(0.03, b.x).mul(step(0.03, b.y));
      pav.assign(mix(vec3(0.42), vec3(0.66, 0.64, 0.60).mul(n2.r.mul(0.2).add(0.9)), mm));
    });
    col.assign(mix(col, pav, mP)); rough.assign(mix(rough, 0.86, mP));
    // asphalt
    const asph = vec3(0.11, 0.11, 0.115).mul(n1.g.mul(0.36).add(0.82)).mul(n3.b.mul(0.1).mul(fade.oneMinus()).add(0.95)).toVar();
    asph.assign(mix(asph, vec3(0.16, 0.16, 0.165), smoothstep(0.62, 0.8, n0.r).mul(0.6)));
    const crack = smoothstep(0.0, 0.035, abs(n2.g.sub(0.5))).oneMinus().mul(fade.oneMinus()).mul(0.5);
    asph.mulAssign(crack.oneMinus());
    const curb = aaStep(dA).oneMinus().mul(aaStep(dA.add(0.28))).mul(mP);
    col.assign(mix(col, asph, mA)); rough.assign(mix(rough, 0.92, mA));
    col.assign(mix(col, vec3(0.66, 0.65, 0.62), curb));
    // special surfaces
    If(sp.greaterThan(0.5).and(sp.lessThan(1.5)), () => { col.assign(mix(vec3(0.42, 0.17, 0.12), vec3(0.50, 0.22, 0.15), n2.b)); rough.assign(0.9); })
      .ElseIf(sp.greaterThan(1.5).and(sp.lessThan(2.5)), () => { col.assign(mix(vec3(0.20, 0.34, 0.30), vec3(0.24, 0.38, 0.33), n1.g)); rough.assign(0.8); })
      .ElseIf(sp.greaterThan(2.5).and(sp.lessThan(3.5)), () => { col.assign(mix(vec3(0.66, 0.58, 0.44), vec3(0.74, 0.66, 0.50), n3.b)); rough.assign(1.0); })
      .ElseIf(sp.greaterThan(5.5).and(sp.lessThan(6.5)), () => { const stripe = step(0.5, fract(w.x.div(6.0))); col.assign(mix(vec3(0.16, 0.30, 0.09), vec3(0.19, 0.34, 0.11), stripe).mul(n2.r.mul(0.15).add(0.92))); rough.assign(0.95); });
    // late-autumn leaf litter
    const lf = LEAF.sample(w.sub(uLampRect.xy).div(uLampRect.zw)).toVar();
    If(lf.a.greaterThan(0.01), () => {
      const dens = clamp(lf.a.mul(3.0), 0.0, 0.9).mul(mA.mul(0.9).oneMinus()).toVar();
      const lc = w.mul(8.0).toVar(); const li = floor(lc); const lr = fract(lc).sub(0.5).toVar();
      const hh = fract(sin(dot(li, vec2(12.9898, 78.233))).mul(43758.5453)).toVar();
      const ang = hh.mul(6.283); const ca = cos(ang), sa = sin(ang);
      const rr = vec2(ca.mul(lr.x).sub(sa.mul(lr.y)), sa.mul(lr.x).add(ca.mul(lr.y)));
      const shape = smoothstep(0.18, 0.3, length(rr.mul(vec2(1.0, 1.9)))).oneMinus();
      const leaf = step(dens.oneMinus(), fract(hh.mul(7.13))).mul(shape).toVar();
      const lodL = smoothstep(0.03, 0.12, max(fwidth(lc.x), fwidth(lc.y)));
      leaf.assign(mix(leaf, dens.mul(0.3), lodL));
      const leafC = mix(mix(vec3(0.70, 0.50, 0.14), vec3(0.52, 0.28, 0.09), fract(hh.mul(3.7))), vec3(0.78, 0.66, 0.20), step(0.8, fract(hh.mul(5.3))));
      col.assign(mix(col, leafC, leaf)); rough.assign(mix(rough, 0.95, leaf));
    });
    // far: blend toward the aerial photo
    const farK = smoothstep(500.0, 1400.0, dist).toVar();
    If(farK.greaterThan(0.0), () => {
      const o = ORTHO.sample(w.sub(uAuxRect.xy).div(uAuxRect.zw)).rgb.toVar();
      o.assign(mix(o, vec3(dot(o, vec3(0.3, 0.59, 0.11))).mul(vec3(1.05, 0.98, 0.82)), 0.25));
      col.assign(mix(col, o.mul(0.95), farK.mul(0.65)));
    });
    gAO.assign(mix(1.0, ao, 0.9));
    const k = fade.oneMinus().mul(mG.mul(0.35).add(mD.mul(0.25)).add(mA.mul(0.12)).add(mP.mul(0.06)).add(max(max(mA, mP), max(mG, mD)).oneMinus().mul(0.2)));
    gBump.assign(vec3(n3.b.sub(0.5).mul(k), 0.0, n3.a.sub(0.5).mul(k)));
    gEmis.assign(LAMP.sample(w.sub(uLampRect.xy).div(uLampRect.zw)).rgb.mul(uNight).mul(col.mul(2.6).add(vec3(0.02, 0.016, 0.01))));
    gRough.assign(rough);
    return vec4(col.mul(mix(1.0, gAO, 0.35)), 1.0); // direct diffuse *= mix(1, ao, .35)
  })();
  nm.roughnessNode = gRough;
  nm.emissiveNode = gEmis;
  nm.aoNode = gAO.div(mix(1.0, gAO, 0.35));
  nm.normalNode = Fn(() => {
    const w = positionWorld.xz.toVar();
    const hL = coreH(w.sub(vec2(1.0, 0.0))), hR = coreH(w.add(vec2(1.0, 0.0))), hD = coreH(w.sub(vec2(0.0, 1.0))), hU = coreH(w.add(vec2(0.0, 1.0)));
    return toViewN(normalize(vec3(hL.sub(hR), 2.0, hD.sub(hU)).add(gBump)));
  })();
  return ctx.flags(nm, m);
}

export function ringMaterial(m, un, ctx, key) {
  const seasonal = key.startsWith('rings');
  const nm = new THREE.MeshStandardNodeMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const T = ctx.tex(un.uTex && un.uTex.value), rect = uniform(un.uTexRect ? un.uTexRect.value : new THREE.Vector4(0, 0, 1, 1));
  nm.colorNode = Fn(() => {
    const o = T.sample(positionWorld.xz.sub(rect.xy).div(rect.zw)).rgb.toVar();
    if (seasonal) {
      const lum = dot(o, vec3(0.3, 0.59, 0.11)).toVar();
      const green = o.g.sub(max(o.r, o.b));
      const golden = vec3(lum.mul(1.25), lum.mul(1.08), lum.mul(0.62));
      o.assign(mix(o, golden, smoothstep(0.02, 0.10, green).mul(smoothstep(0.18, 0.32, lum)).mul(0.75)));
      o.mulAssign(0.92);
    }
    return vec4(o, 1.0);
  })();
  return ctx.flags(nm, m);
}

export function waterMaterial(m, un, ctx) {
  const nm = ctx.origFrom(m);
  const NZ = ctx.tex(un.uNoise && un.uNoise.value), uTime = ctx.u(un.uTime);
  nm.normalNode = Fn(() => {
    const p = positionWorld.xz.toVar(); const d = length(positionWorld.sub(cameraPosition)); const k = float(1.0).div(d.mul(0.0015).add(1.0)).toVar(); const t = uTime;
    const a = NZ.sample(p.mul(0.004).add(vec2(t.mul(0.004), t.mul(0.002)))).g.sub(NZ.sample(p.mul(0.0043).sub(vec2(t.mul(0.003), t.mul(-0.0045)))).g).toVar();
    const b = NZ.sample(p.mul(0.017).add(vec2(t.mul(-0.01), t.mul(0.007)))).b.sub(NZ.sample(p.mul(0.019).add(vec2(t.mul(0.012), t.mul(0.006)))).b).toVar();
    return toViewN(normalize(vec3(a.mul(0.35).mul(k).add(b.mul(0.18).mul(k)), 1.0, b.mul(0.35).mul(k).sub(a.mul(0.18).mul(k)))));
  })();
  return nm;
}

// streetscape.js creek: animated ripples (approximation of the GLSL normal perturbation)
export function creekMaterial(m, un, ctx) {
  const nm = ctx.origFrom(m);
  const NZ = ctx.tex(un.uNoise && un.uNoise.value), uTime = ctx.u(un.uTime);
  nm.normalNode = Fn(() => {
    const p = positionWorld.xz.toVar(); const t = uTime;
    const a = NZ.sample(p.mul(0.09).add(vec2(t.mul(0.03), t.mul(0.05)))).g.sub(0.5);
    const b = NZ.sample(p.mul(0.23).sub(vec2(t.mul(0.04), t.mul(-0.02)))).b.sub(0.5);
    return toViewN(normalize(vec3(a.mul(0.25), 1.0, b.mul(0.25))));
  })();
  return nm;
}
