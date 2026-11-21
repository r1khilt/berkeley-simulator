// [gfx-webgpu] TSL ports for the smaller custom materials (bay lights, pedestrians, grass, props, vegetation).
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, vec4, mat3, uniform, attribute, referenceAttribute, positionLocal, positionGeometry, positionWorld, cameraPosition, cameraViewMatrix, modelWorldMatrix, instanceColor, materialColor,
  sin, cos, abs, mix, smoothstep, step, fract, distance, select, If } from 'three/tsl';
import { treeLeafMaterial, treeBarkMaterial, treeBlobMaterial, TreeNodeMaterial } from './tsl-trees.js';

let warned = new Set();
export const extraHandlers = {
  'tree-leaf-5': treeLeafMaterial, 'tree-bark-5': treeBarkMaterial, 'tree-blob-3': treeBlobMaterial, 'grass2': grassMaterial, 'peds': pedsMaterial,
  // unknown ShaderMaterial: draw nothing rather than the default white (and say so once)
  __shader(m, un, ctx) {
    const src = (m.vertexShader || '') + (m.fragmentShader || '');
    if (src.includes('gl_PointSize') && un.uNight && un.uTime) return bayLights(m, un, ctx);
    const id = m.name || src.slice(0, 60);
    if (!warned.has(id)) { warned.add(id); console.warn('[webgpu] no TSL port for ShaderMaterial; hidden:', id); }
    const nm = new THREE.MeshBasicNodeMaterial({ transparent: true, opacity: 0, depthWrite: false });
    return nm;
  },
};

// far.js Bay Lights: twinkling LED points (WebGPU points are 1 px; the GLSL used 2 px)
function bayLights(m, un, ctx) {
  const nm = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false });
  const uTime = ctx.u(un.uTime), uNight = ctx.u(un.uNight);
  const a = sin(positionLocal.x.mul(0.02).add(positionLocal.z.mul(0.017)).sub(uTime.mul(1.7))).mul(0.5).add(0.5).toVarying('vA');
  nm.colorNode = vec4(vec3(0.95, 0.97, 1.0).mul(a), a.mul(uNight));
  return ctx.flags(nm, m);
}

// grass.js: instanced blade clumps with distance fade + tip wind; normals forced up
function grassMaterial(m, un, ctx) {
  const nm = ctx.origFrom(m);
  const uTime = ctx.u(un.uTime), uWind = ctx.u(un.uWind), uR = ctx.u(un.uR, 26);
  const IM = referenceAttribute('instanceMatrix', 'mat4');
  const aTip = attribute('aTip', 'float');
  nm.positionNode = Fn(() => {
    const p = vec3(positionGeometry).toVar();
    const wpI = modelWorldMatrix.mul(IM).element(3).xyz.toVar();
    const fade = smoothstep(uR.mul(0.3), uR, distance(wpI.xz, cameraPosition.xz)).oneMinus();
    const w = sin(uTime.mul(1.8).add(wpI.x.mul(0.35)).add(wpI.z.mul(0.27))).mul(0.5).add(sin(uTime.mul(3.1).add(wpI.x.mul(1.3))).mul(0.25)).toVar();
    const q = vec3(p.x.add(aTip.mul(w).mul(0.05).mul(uWind.add(0.4))), p.y.mul(fade), p.z.add(aTip.mul(w).mul(0.03).mul(uWind.add(0.4))));
    return IM.mul(vec4(q, 1.0)).xyz;
  })();
  nm.colorNode = materialColor.mul(vec4(vec3(mix(0.75, 1.35, aTip)), 1.0));
  nm.normalNode = cameraViewMatrix.mul(vec4(0.0, 1.0, 0.0, 0.0)).xyz.normalize();
  return nm;
}

// npcs.js: walking pedestrians (limb swing by part id) with per-person skin/hair/clothes
function pedsMaterial(m, un, ctx) {
  const nm = new TreeNodeMaterial(); // suppress automatic instanceColor multiply; instance colour = shirt
  nm.roughness = 0.85; nm.metalness = 0;
  const uTime = ctx.u(un.uTime);
  const IM = referenceAttribute('instanceMatrix', 'mat4');
  const aPart = attribute('aPart', 'float'), aAnim = attribute('aAnim', 'vec3');
  const rotX = (a) => { const c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, s.negate(), c); };
  nm.positionNode = Fn(() => {
    const t = vec3(positionGeometry).toVar();
    const ph = uTime.mul(aAnim.y).mul(6.2831).add(aAnim.x.mul(6.2831)).toVar(); const sw = sin(ph).mul(aAnim.z).toVar();
    If(aPart.greaterThan(2.5).and(aPart.lessThan(4.5)), () => { const sg = select(aPart.lessThan(3.5), 1.0, -1.0); const piv = vec3(0.0, 0.92, 0.0); t.assign(piv.add(rotX(sw.mul(0.55).mul(sg)).mul(t.sub(piv)))); });
    If(aPart.greaterThan(7.9), () => { const sg = select(aPart.lessThan(8.25), 1.0, -1.0); const piv = vec3(0.0, 0.92, 0.0); t.assign(piv.add(rotX(sw.mul(0.55).mul(sg)).mul(t.sub(piv)))); });
    If(aPart.greaterThan(4.5).and(aPart.lessThan(6.5)), () => { const sg = select(aPart.lessThan(5.5), -1.0, 1.0); const piv = vec3(0.0, 1.42, 0.0); t.assign(piv.add(rotX(sw.mul(0.45).mul(sg)).mul(t.sub(piv)))); });
    t.y.addAssign(abs(cos(ph)).mul(0.03).mul(aAnim.z));
    return IM.mul(vec4(t, 1.0)).xyz;
  })();
  const hs = (n) => fract(sin(n.mul(91.345)).mul(47453.1));
  const pick = (k, arr) => { let r = vec3(...arr[arr.length - 1]); for (let i = arr.length - 2; i >= 0; i--) r = select(k.lessThan(i + 1), vec3(...arr[i]), r); return r; };
  nm.colorNode = Fn(() => {
    const id = aAnim.x.mul(1000.0).toVar(); const part = aPart;
    const skin = pick(hs(id).mul(3.99), [[0.86, 0.66, 0.52], [0.70, 0.50, 0.36], [0.48, 0.32, 0.22], [0.95, 0.78, 0.64]]).toVar();
    const pants = pick(hs(id.add(3.0)).mul(5.99), [[0.09, 0.13, 0.24], [0.05, 0.05, 0.06], [0.42, 0.37, 0.27], [0.22, 0.25, 0.17], [0.28, 0.28, 0.30], [0.16, 0.22, 0.36]]);
    const hair = mix(vec3(0.05, 0.04, 0.03), vec3(0.35, 0.22, 0.12), hs(id.add(5.0)));
    const c = vec3(instanceColor).toVar();
    If(part.greaterThan(0.5).and(part.lessThan(1.5)), () => { c.assign(skin); })
      .ElseIf(part.greaterThan(1.5).and(part.lessThan(2.5)), () => { c.assign(hair); })
      .ElseIf(part.greaterThan(2.5).and(part.lessThan(4.5)), () => { c.assign(pants); })
      .ElseIf(part.greaterThan(6.5).and(part.lessThan(7.5)), () => { c.assign(select(hs(id.add(7.0)).greaterThan(0.45), mix(vec3(0.08, 0.1, 0.14), vec3(0.3, 0.08, 0.06), hs(id.add(8.0))), c)); })
      .ElseIf(part.greaterThan(7.9), () => { c.assign(vec3(0.85, 0.85, 0.82).mul(hs(id.add(11.0))).add(0.08)); });
    If(part.greaterThan(4.5).and(part.lessThan(6.5)), () => { c.assign(mix(c, skin, step(0.75, hs(id.add(13.0))))); });
    return vec4(c, 1.0);
  })();
  return ctx.flags(nm, m);
}
