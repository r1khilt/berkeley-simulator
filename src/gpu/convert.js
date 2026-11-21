// [gfx-webgpu] Material translation: WebGL (ShaderMaterial / onBeforeCompile) -> TSL NodeMaterial.
// Hooked into renderer.library.fromMaterial so the scene graph and all world modules stay untouched.
// Each onBeforeCompile hook is run once against a dummy shader object to harvest its uniforms
// (textures and shared {value} objects), then a hand-written TSL equivalent is built from the
// material's customProgramCacheKey. Unknown hooks fall back to the plain node conversion.
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, vec4, ivec2, uniform, texture, positionWorld, mix, smoothstep, floor, If, property, materialColor, materialEmissive } from 'three/tsl';
import { U } from '../materials.js';
import { coreTerrainMaterial, ringMaterial, waterMaterial, creekMaterial } from './tsl-terrain.js';
import { facadeMaterial, roofMaterial, farCityMaterial, midCityMaterial } from './tsl-buildings.js';
import { extraHandlers } from './tsl-extra.js';

const BLACK = (() => { const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); t.needsUpdate = true; return t; })();

export function makeConverter(renderer) {
  const lib = renderer.library;
  const origFrom = lib.fromMaterial.bind(lib);
  const cache = new WeakMap();
  const stats = { byKey: {}, failed: [] };
  const baseOBC = THREE.Material.prototype.onBeforeCompile, baseKey = THREE.Material.prototype.customProgramCacheKey;
  const keyOf = (m) => { try { return m.customProgramCacheKey && m.customProgramCacheKey !== baseKey ? String(m.customProgramCacheKey()) : ''; } catch (e) { return ''; } };
  const grab = (m) => {
    const sh = { uniforms: {}, vertexShader: '', fragmentShader: '', defines: {} };
    if (m.onBeforeCompile && m.onBeforeCompile !== baseOBC) { try { m.onBeforeCompile(sh, renderer); } catch (e) { /* dummy shader: ignore */ } }
    if (m.isShaderMaterial && m.uniforms) Object.assign(sh.uniforms, m.uniforms);
    return sh.uniforms;
  };
  // helpers shared by the TSL ports
  const ctx = {
    renderer, origFrom, U, BLACK,
    // uniform node mirroring a shared {value} object every frame
    u: (obj, fallback = 0) => { const n = uniform(obj ? obj.value : fallback); if (obj) n.onRenderUpdate(() => obj.value); return n; },
    tex: (t) => texture(t && t.isTexture ? t : BLACK),
    // copy pipeline-relevant flags from the source material
    flags(nm, m) { for (const k of ['side', 'transparent', 'opacity', 'depthWrite', 'depthTest', 'blending', 'alphaTest', 'fog', 'toneMapped', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'shadowSide', 'name', 'visible', 'colorWrite', 'premultipliedAlpha', 'alphaToCoverage', 'forceSinglePass', 'flatShading', 'wireframe']) if (m[k] !== undefined) nm[k] = m[k]; nm.userData = m.userData; return nm; },
    // contact AO against the core heightfield (grading.js contactAO); returns { ao, k } property nodes after compute()
    cao(un) {
      if (!un.uAOH || !un.uAOH.value) return null;
      const H = texture(un.uAOH.value), core = uniform(un.uAOCore.value), size = uniform(un.uAOSize.value);
      const prop = property('float', 'gCAO');
      const compute = () => {
        prop.assign(1.0);
        const w = positionWorld.toVar();
        const f = w.xz.sub(core.xy).div(core.z).toVar();
        If(f.x.greaterThanEqual(0.0).and(f.y.greaterThanEqual(0.0)).and(f.x.lessThanEqual(size.x.sub(1.0))).and(f.y.lessThanEqual(size.y.sub(1.0))), () => {
          const fi = floor(f); const i = ivec2(fi); const t = f.sub(fi);
          const a = H.load(i).r, b = H.load(i.add(ivec2(1, 0))).r, c = H.load(i.add(ivec2(0, 1))).r, d = H.load(i.add(ivec2(1, 1))).r;
          const h = mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
          prop.assign(mix(0.5, 1.0, smoothstep(0.0, 2.2, w.y.sub(h))));
        });
        return prop;
      };
      return { prop, compute };
    },
    // apply AO the way the GLSL did: indirect *= ao, direct diffuse *= mix(1, ao, 0.35) (folded into albedo)
    applyAO(nm, colorFn, aoProp) {
      nm.colorNode = Fn(() => { const c = vec4(colorFn()).toVar(); return vec4(c.rgb.mul(mix(1.0, aoProp, 0.35)), c.a); })();
      nm.aoNode = aoProp.div(mix(1.0, aoProp, 0.35));
    },
  };
  const handlers = {
    'coreTerrain-v7': coreTerrainMaterial, 'ring': ringMaterial, 'rings': ringMaterial, 'bayWater': waterMaterial, 'creek': creekMaterial,
    'facade-v4': facadeMaterial, 'roof-v2': roofMaterial, 'farCity': farCityMaterial, 'midcity': midCityMaterial,
    ...extraHandlers,
  };
  function generic(m, un, key) {
    const nm = origFrom(m);
    if (!nm) return null;
    // lit windows / lamps: emissive follows U.uNight (materials.js nightGlow)
    const ns = m.userData && m.userData.nightStrength;
    if (ns != null) nm.emissiveNode = materialEmissive.mul(ctx.u(U.uNight)).mul(ns);
    if (key.includes('|cao') && nm.lights !== false) {
      const c = ctx.cao(un);
      if (c) ctx.applyAO(nm, () => { c.compute(); return materialColor; }, c.prop);
    }
    return nm;
  }
  function convert(m) {
    const key = keyOf(m);
    const base = key.split('|')[0];
    const un = (m.onBeforeCompile && m.onBeforeCompile !== baseOBC) || m.isShaderMaterial ? grab(m) : {};
    let h = handlers[base];
    if (!h) for (const k in handlers) if (k.endsWith('*') && base.startsWith(k.slice(0, -1))) { h = handlers[k]; break; }
    if (!h && m.isShaderMaterial) h = extraHandlers.__shader;
    let nm = null;
    if (h) nm = h(m, un, ctx, key);
    // Hand-written graphs capture per-material textures/uniforms as constants, so materials that share a GLSL
    // cache key (e.g. every species' 'tree-bark-5', the three 'rings') must not share a compiled pipeline.
    if (!nm) nm = generic(m, un, key);
    const tag = base || (m.isShaderMaterial ? 'ShaderMaterial?' : m.type);
    stats.byKey[tag] = (stats.byKey[tag] || 0) + 1;
    return nm;
  }
  // Hand-written graphs capture per-material textures/uniforms as constants, so materials that share a GLSL
  // cache key (every species' 'tree-bark-5', the three 'rings', ...) must not share a compiled pipeline:
  // make the renderer's program cache key unique per source material for anything a handler owns.
  const handled = (m, k) => { if (m.isShaderMaterial) return true; const b = k.split('|')[0]; return !!handlers[b]; };
  const nodesMgr = renderer._nodes;
  if (nodesMgr && nodesMgr.getCustomProgramCacheKey) {
    const origKey = nodesMgr.getCustomProgramCacheKey.bind(nodesMgr);
    nodesMgr.getCustomProgramCacheKey = (material, scene) => { const k = origKey(material, scene); return material && !material.isNodeMaterial && handled(material, String(k)) ? k + '|' + material.uuid : k; };
  } else console.warn('[webgpu] cannot scope program cache keys; custom materials may share pipelines');
  lib.fromMaterial = function (m) {
    if (!m || m.isNodeMaterial) return m;
    const c = cache.get(m);
    if (c && c.v === m.version) return c.nm;
    let nm = null;
    try { nm = convert(m); } catch (e) { console.error('[webgpu] material conversion failed for', keyOf(m) || m.type, e); stats.failed.push(keyOf(m) || m.type); }
    if (!nm) nm = origFrom(m);
    // the shadow pass reads position/mask nodes from the *source* material
    if (nm && nm.positionNode && m.positionNode !== nm.positionNode) m.positionNode = nm.positionNode;
    if (nm && nm.maskShadowNode && m.maskShadowNode !== nm.maskShadowNode) m.maskShadowNode = nm.maskShadowNode;
    cache.set(m, { v: m.version, nm });
    return nm;
  };
  return { stats, cache, handlers, ctx };
}
