// [gfx-webgpu] Optional WebGPU rendering path: ?renderer=webgpu
// Loaded only on demand (dynamic import from main.js) so the default WebGL path is byte-for-byte unchanged.
// Strategy: the scene graph is still built by the normal WebGL-era modules. WebGPURenderer cannot run
// ShaderMaterial / onBeforeCompile GLSL, so we hook renderer.library.fromMaterial and translate every
// material into a TSL NodeMaterial at first use (see convert.js). Sky, CSM shadows, fog, tone mapping and
// post have WebGPU-specific replacements here.
import * as THREE from 'three/webgpu';
import { Fn, vec3, vec4, float, mix, clamp, dot, fog, positionView, reference, neutralToneMapping, pass, uniform, renderOutput, mrt, output, emissive } from 'three/tsl';
import { CSMShadowNode } from 'three/examples/jsm/csm/CSMShadowNode.js';
import { makeConverter } from './convert.js';
import { patchSky } from './tsl-sky.js';

// Returns { renderer, ... } on success, or { fail, canvas } when WebGPU is unavailable (caller falls back to WebGL).
export async function createWebGPU({ canvas, qs }) {
  const fail = (why) => { console.warn('[webgpu] unavailable, falling back to WebGL:', why); return { fail: why, canvas }; };
  if (!('gpu' in navigator) || !navigator.gpu) return fail('navigator.gpu missing (needs a secure context + WebGPU-capable browser)');
  let adapter = null;
  try { adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }); } catch (e) { return fail('requestAdapter threw: ' + e.message); }
  if (!adapter) return fail('no WebGPU adapter');
  let renderer;
  try {
    renderer = new THREE.WebGPURenderer({ canvas, antialias: true, powerPreference: 'high-performance', reversedDepthBuffer: !qs.get('nordb') });
    await renderer.init();
  } catch (e) {
    // the canvas may already hold a 'webgpu' context; hand back a fresh one so WebGL can start
    try { renderer && renderer.dispose(); } catch (e2) {}
    const c2 = canvas.cloneNode(false); canvas.replaceWith(c2);
    return { ...fail('init failed: ' + e.message), canvas: c2 };
  }
  if (!renderer.backend || !renderer.backend.isWebGPUBackend) { renderer.dispose(); const c2 = canvas.cloneNode(false); canvas.replaceWith(c2); return { ...fail('WebGPURenderer chose its WebGL2 backend'), canvas: c2 }; }
  // WebGLRenderer-compat shims used by main.js / debug hooks
  renderer.capabilities = { reversedDepthBuffer: renderer.reversedDepthBuffer, isWebGPU: true };
  // Same curve as grading.js CustomToneMapping (Neutral + 1.08 saturation + 1.05 contrast)
  renderer.library.addToneMapping(Fn(([color, exposure]) => {
    const c = neutralToneMapping(color, exposure).toVar();
    const l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c.assign(mix(vec3(l), c, 1.08));
    c.assign(c.sub(0.5).mul(1.05).add(0.5));
    return clamp(c, 0.0, 1.0);
  }), THREE.CustomToneMapping);
  const conv = makeConverter(renderer);
  const api = {
    renderer, isWebGPU: true, adapterInfo: adapter.info ? { vendor: adapter.info.vendor, architecture: adapter.info.architecture, description: adapter.info.description } : {},
    conv,
    // aerial-perspective fog matching grading.js (linear-exponential, not squared) driven by the existing FogExp2 object
    installFog(scene, fogObj) {
      const color = reference('color', 'color', fogObj);
      const density = reference('density', 'float', fogObj);
      const factor = Fn(() => {
        const d = positionView.z.negate();
        const f = float(1).sub(density.mul(d).negate().exp()).toVar();
        return f.mul(f).mul(float(3).sub(f.mul(2))).mul(0.35).add(f.mul(0.65));
      })();
      scene.fogNode = fog(color, factor);
    },
    patchSky: (sky) => patchSky(sky, renderer, api),
    // CSM via CSMShadowNode; mimics the subset of the WebGL CSM API that main.js uses
    makeCSM({ scene, camera, cascades = 3, maxFar = 1100, shadowMapSize = 2048, lightMargin = 400, lightNear = 1, lightFar = 6000, bias = -0.00025, normalBias = 0.07 }) {
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.castShadow = true;
      light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
      light.shadow.camera.near = lightNear; light.shadow.camera.far = lightFar;
      light.shadow.bias = bias; light.shadow.normalBias = normalBias;
      const node = new CSMShadowNode(light, { cascades, maxFar, mode: 'practical', lightMargin });
      node.fade = true;
      light.shadow.shadowNode = node;
      scene.add(light, light.target);
      const perCascade = { normalBias: [0.07, 0.22, 0.5, 0.9], bias: [-0.0003, -0.0006, -0.001, -0.0015] };
      let tuned = false;
      return {
        isWebGPUCSM: true, node, light, lights: [light], lightDirection: new THREE.Vector3(-0.5, -0.8, -0.3).normalize(), fade: true,
        setupMaterial() {}, // node materials pick up shadows automatically
        updateFrustums() { if (node.camera) node.updateFrustums(); },
        update() {
          const t = camera.position;
          light.target.position.copy(t); light.position.copy(t).addScaledVector(this.lightDirection, -1000);
          light.updateMatrixWorld(); light.target.updateMatrixWorld();
          if (!tuned && node.lights.length) { tuned = true; node.lights.forEach((l, i) => { l.shadow.normalBias = perCascade.normalBias[i] ?? 0.9; l.shadow.bias = perCascade.bias[i] ?? -0.0015; }); }
          for (const l of node.lights) { if (l.shadow) l.shadow.intensity = light.shadow.intensity; }
        },
      };
    },
    // Bloom post (TSL). Returns an object with render(night) or null.
    async makePost({ scene, camera, strength = 0.2, radius = 0.18, threshold = 0.95 }) {
      const { bloom } = await import('three/examples/jsm/tsl/display/BloomNode.js');
      const pipeline = new THREE.RenderPipeline(renderer);
      const scenePass = pass(scene, camera);
      const color = scenePass.getTextureNode('output');
      const b = bloom(color, strength, radius, threshold);
      pipeline.outputNode = color.add(b);
      return { pipeline, bloom: b, render(night) { b.strength.value = 0.03 + 0.35 * night; b.threshold.value = 0.99 - 0.14 * night; pipeline.render(); }, setSize() {} };
    },
  };
  return api;
}
