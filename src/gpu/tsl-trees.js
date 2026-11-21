// [gfx-webgpu] TSL port of vegetation/tree-shaders.js: per-instance wind sway + leaf flutter, leaf-card de-stretch,
// card fade, aerial-tint aware leaf colour ramp, bark UV rescale + sub-pixel twig cull, far-LOD blob colour.
// Instancing note: r187 applies the instance matrix before positionNode, so these nodes rebuild the position from
// positionGeometry and re-apply the instance matrix themselves (read via referenceAttribute('instanceMatrix')).
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, vec4, uniform, attribute, referenceAttribute, positionViewDirection, normalView, specularColor, specularColorBlended, specularF90, saturate, positionGeometry, positionView, cameraPosition, cameraProjectionMatrix, modelWorldMatrix,
  instanceColor, normalViewGeometry, diffuseColor, texture, uv, normalMap, mix, smoothstep, clamp, fract, sin, sqrt, pow, max, dot, length, normalize, abs } from 'three/tsl';

// don't let three multiply the albedo by instanceColor: the GLSL removed color_fragment and used it as a relative tint
export class TreeNodeMaterial extends THREE.MeshStandardNodeMaterial {
  static get type() { return 'TreeNodeMaterial'; }
  setupDiffuseColor(builder) { const o = builder.object, ic = o.instanceColor; o.instanceColor = null; try { super.setupDiffuseColor(builder); } finally { o.instanceColor = ic; } }
}
// GLSL RE_Direct_Leaf: back-light translucency + wrap lighting for every direct light (sun, moon, lamps)
class LeafLightingModel extends THREE.PhysicalLightingModel {
  constructor(trans) { super(); this.trans = trans; }
  direct(inputs, builder) {
    super.direct(inputs, builder);
    const { lightDirection, lightColor, reflectedLight } = inputs;
    const back = pow(saturate(dot(positionViewDirection.negate(), lightDirection)), 2.5);
    const wrap = saturate(dot(normalView, lightDirection).negate()).mul(0.65).add(0.35);
    reflectedLight.directDiffuse.addAssign(lightColor.mul(diffuseColor.rgb).mul(1 / Math.PI).mul(back.mul(this.trans.x).add(wrap.mul(this.trans.y))));
  }
}
class LeafNodeMaterial extends TreeNodeMaterial {
  static get type() { return 'LeafNodeMaterial'; }
  setupLightingModel() { return new LeafLightingModel(this._trans); }
  setupSpecular() { super.setupSpecular(); if (this._spec) { specularColor.mulAssign(this._spec); specularColorBlended.mulAssign(this._spec); specularF90.mulAssign(this._spec); } }
}
class BlobNodeMaterial extends TreeNodeMaterial {
  static get type() { return 'BlobNodeMaterial'; }
  setupSpecular() { super.setupSpecular(); if (this._spec) { specularColor.mulAssign(this._spec); specularColorBlended.mulAssign(this._spec); specularF90.mulAssign(this._spec); } }
}
const treeHash = (p) => { const p0 = fract(vec3(p.x, p.y, p.x).mul(0.1031)); const p3 = p0.add(dot(p0, p0.yzx.add(33.33))); return fract(p3.x.add(p3.y).mul(p3.z)); };
// WebGPU allows 8 vertex buffers; leaves use position/normal/uv/aAO/aRnd/aCardN/aPivot + instanceMatrix + instanceColor = 9.
// Pack aAO + aRnd into one vec2 attribute on first build (only attributes the shader references are bound).
const aoRnd = Fn((builder) => {
  const g = builder.geometry;
  if (g && !g.getAttribute('aAORnd') && g.getAttribute('aAO')) {
    const ao = g.getAttribute('aAO'), rn = g.getAttribute('aRnd'); const n = ao.count; const a = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { a[i * 2] = ao.getX(i); a[i * 2 + 1] = rn ? rn.getX(i) : 0.5; }
    g.setAttribute('aAORnd', new THREE.BufferAttribute(a, 2));
  }
  return attribute('aAORnd', 'vec2');
});

function common(m, un, ctx, Cls = TreeNodeMaterial) {
  const nm = new Cls();
  for (const k in m) { if (k === 'onBeforeCompile' || k === 'customProgramCacheKey' || k === 'uuid' || k === 'id' || k === 'version' || typeof m[k] === 'function') continue; try { nm[k] = m[k]; } catch (e) {} }
  const u = (name, fb) => ctx.u(un[name], fb);
  const U = { uTime: u('uTime'), uWind: u('uWind'), uWindDir: u('uWindDir', new THREE.Vector2(1, 0)), uSwayP: u('uSwayP', new THREE.Vector4()),
    uColA: u('uColA', new THREE.Color()), uColB: u('uColB', new THREE.Color()), uColC: u('uColC', new THREE.Color()), uRamp: u('uRamp', new THREE.Vector4()), uTwigCol: u('uTwigCol', new THREE.Color()),
    uTrans: u('uTrans', new THREE.Vector3()), uRefTint: u('uRefTint', new THREE.Color(0.28, 0.32, 0.22)), uTintK: u('uTintK', 1), uTypH: u('uTypH', 10), uViewH: u('uViewH', 1080), uNight: ctx.u(ctx.U.uNight) };
  const IM = referenceAttribute('instanceMatrix', 'mat4');
  const M = modelWorldMatrix.mul(IM); // treeObjM()
  const cols = () => { const c0 = M.element(0).xyz, c1 = M.element(1).xyz, c2 = M.element(2).xyz; return { c0, c1, c2, ip: M.element(3).xyz, s: max(vec3(length(c0), length(c1), length(c2)), vec3(1e-4)) }; };
  const wind = (p) => {
    const { c0, c2, ip, s } = cols();
    const wd = vec3(U.uWindDir.x, 0.0, U.uWindDir.y);
    const ld = vec2(dot(c0.div(s.x), wd), dot(c2.div(s.z), wd));
    const ph = treeHash(ip.xz.mul(0.173)).mul(6.2832).toVar(); const t = U.uTime;
    const gust = sin(t.mul(0.31).add(ip.x.mul(0.011)).add(ip.z.mul(0.007))).mul(sin(t.mul(0.17).add(ph))).mul(0.3).add(0.7);
    const w = U.uWind.mul(gust).toVar();
    const h = clamp(p.y.sub(U.uSwayP.z).div(max(float(1.0).sub(U.uSwayP.z), 0.05)), 0.0, 1.5).toVar();
    const fr = float(6.0).div(sqrt(max(s.y, 2.0)));
    const osc = sin(t.mul(fr).add(ph)).mul(0.4).add(0.55).add(sin(t.mul(fr).mul(2.3).add(ph.mul(1.7))).mul(0.12));
    const amp = U.uSwayP.x.mul(s.y).mul(w).mul(osc).mul(h).mul(h);
    const q = p.add(vec3(ld.x.mul(amp).div(s.x), 0.0, ld.y.mul(amp).div(s.z))).toVar();
    const k = dot(positionGeometry, vec3(17.1, 31.7, 23.3));
    const f = sin(t.mul(fract(k).mul(3.0).add(5.0)).add(k.mul(6.2832)).add(ph)).mul(U.uSwayP.y).mul(w).mul(h).mul(U.uSwayP.w);
    return q.add(vec3(f, f.mul(0.5), f.mul(-0.7)));
  };
  const destretch = (p) => { const { s } = cols(); const piv = attribute('aPivot', 'vec3'); const su = pow(s.x.mul(s.y).mul(s.z), 1.0 / 3.0); return piv.add(p.sub(piv).mul(vec3(su).div(s))); };
  const instPos = (p) => IM.mul(vec4(p, 1.0)).xyz; // back to the (instanced) local space positionNode expects
  const vInst = Fn(() => treeHash(M.element(3).xz.mul(0.37).add(11.0)))().toVarying('vInstT');
  const vTint = mix(vec3(1.0), clamp(instanceColor.div(U.uRefTint), vec3(0.5), vec3(1.6)), U.uTintK);
  const ramp = (q) => { const c = mix(U.uColA, U.uColB, smoothstep(U.uRamp.x.sub(0.12), U.uRamp.x.add(0.12), q)); return mix(c, U.uColC, smoothstep(U.uRamp.y.sub(0.12), U.uRamp.y.add(0.12), q)); };
  const baseCol = uniform(m.color || new THREE.Color(1, 1, 1));
  return { nm, U, M, IM, cols, wind, destretch, instPos, vInst, vTint, ramp, baseCol };
}

export function treeLeafMaterial(m, un, ctx) {
  const c = common(m, un, ctx, LeafNodeMaterial); const { nm, U } = c;
  nm._trans = U.uTrans; nm._spec = ctx.u(un.uLeafSpec, 0.18);
  nm.positionNode = Fn(() => c.instPos(c.wind(c.destretch(positionGeometry))))();
  const vFade = Fn(() => { // fade leaf cards seen edge-on
    const { c0, c1, c2, s } = c.cols();
    const nW = normalize(c0.div(s.x).mul(attribute('aCardN', 'vec3').x).add(c1.div(s.y).mul(attribute('aCardN', 'vec3').y)).add(c2.div(s.z).mul(attribute('aCardN', 'vec3').z)));
    const wp = c.M.mul(vec4(c.wind(c.destretch(positionGeometry)), 1.0)).xyz;
    return smoothstep(0.12, 0.38, abs(dot(nW, normalize(cameraPosition.sub(wp)))));
  })().toVarying('vFadeT');
  const MAP = texture(m.map || ctx.BLACK);
  nm.colorNode = Fn(() => {
    const lt = MAP.sample(uv()).toVar();
    const ar = aoRnd().toVar();
    const q = lt.g.add(c.vInst.sub(0.5).mul(U.uRamp.z)).add(ar.y.sub(0.5).mul(U.uRamp.w));
    const lc = mix(c.ramp(q).mul(c.vTint), U.uTwigCol, lt.b);
    return vec4(c.baseCol.mul(lc).mul(lt.r).mul(ar.x), lt.a.mul(vFade));
  })();
  if (!m.normalMap) nm.normalNode = normalViewGeometry; // crown-centred normals, no back-face flip
  nm.emissiveNode = diffuseColor.rgb.mul(0.035).mul(U.uNight.oneMinus()); // unshadowed sky fill in crown interiors
  nm.map = null; // sampled manually (shadow pass still uses the source material's map alpha)
  return nm;
}

export function treeBarkMaterial(m, un, ctx) {
  const c = common(m, un, ctx); const { nm, U } = c;
  nm.positionNode = Fn(() => c.instPos(c.wind(positionGeometry)))();
  const kUV = Fn(() => { const { s } = c.cols(); return vec2(s.x.add(s.z).mul(0.5), pow(s.x.mul(s.y).mul(s.z), 1.0 / 3.0)).div(U.uTypH); })().toVarying('vBarkK');
  const UVk = uv().mul(kUV);
  if (m.map) nm.colorNode = texture(m.map, UVk).mul(c.baseCol);
  if (m.normalMap) nm.normalNode = normalMap(texture(m.normalMap, UVk), uniform(m.normalScale || new THREE.Vector2(1, 1)));
  nm.map = null; nm.normalMap = null;
  const vPx = Fn(() => { const { s } = c.cols(); const su = pow(s.x.mul(s.y).mul(s.z), 1.0 / 3.0); return attribute('aRad', 'float').mul(2.0).mul(su).mul(cameraProjectionMatrix.element(1).y).mul(0.5).mul(U.uViewH).div(max(positionView.z.negate(), 0.05)); })().toVarying('vPxT');
  nm.maskNode = vPx.greaterThanEqual(0.75); // sub-pixel twigs
  return nm;
}

export function treeBlobMaterial(m, un, ctx) {
  const c = common(m, un, ctx, BlobNodeMaterial); const { nm, U } = c;
  nm._spec = ctx.u(un.uLeafSpec, 0.18);
  nm.positionNode = Fn(() => c.instPos(c.wind(positionGeometry)))();
  nm.colorNode = Fn(() => {
    const q0 = c.vInst.sub(0.5).mul(U.uRamp.z).add(0.42).toVar();
    const bc = c.ramp(q0.sub(0.3)).add(c.ramp(q0)).add(c.ramp(q0.add(0.3))).mul(1.0 / 3.0).mul(c.vTint).mul(U.uTrans.z);
    return vec4(c.baseCol.mul(mix(U.uTwigCol, bc, attribute('aLeaf', 'float'))).mul(attribute('aAO', 'float')), 1.0);
  })();
  return nm;
}
