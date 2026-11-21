// [gfx-webgpu] WebGPU replacements for sky.js: SkyMesh (TSL port of the Sky addon), cloud layer, night skyglow,
// environment dome + node PMREMGenerator, and the custom aerial-perspective fog.
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, vec4, uniform, texture, positionWorld, positionLocal, cameraPosition, normalize, mix, smoothstep, pow, max, dot, length, step, If } from 'three/tsl';
import { SkyMesh } from 'three/examples/jsm/objects/SkyMesh.js';

export function patchSky(sky, renderer, api) {
  const scene = sky.scene;
  // 1. physical sky: Sky (GLSL) -> SkyMesh (TSL) with identical defaults; keep the uniforms API sky.update() writes to
  const old = sky.sky; const u = old.material.uniforms;
  const sm = new SkyMesh();
  sm.scale.copy(old.scale); sm.frustumCulled = false; sm.renderOrder = old.renderOrder; sm.material.depthWrite = false;
  for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) sm[k].value = u[k].value;
  for (const k of ['cloudScale', 'cloudSpeed', 'cloudCoverage', 'cloudDensity', 'cloudElevation']) if (u[k] && sm[k]) sm[k].value = u[k].value;
  sm.material.uniforms = { turbidity: sm.turbidity, rayleigh: sm.rayleigh, mieCoefficient: sm.mieCoefficient, mieDirectionalG: sm.mieDirectionalG, sunPosition: sm.sunPosition, up: sm.upUniform };
  scene.remove(old); scene.add(sm); sky.sky = sm;
  // 2. cloud layer
  {
    const cu = sky.cloudUniforms; const NZ = texture(cu.uNoise.value);
    const uTime = uniform(0).onRenderUpdate(() => cu.uTime.value), uCover = uniform(0).onRenderUpdate(() => cu.uCover.value);
    const uSun = uniform(new THREE.Vector3()).onRenderUpdate(() => cu.uSun.value), uSunCol = uniform(new THREE.Color()).onRenderUpdate(() => cu.uSunCol.value), uAmb = uniform(new THREE.Color()).onRenderUpdate(() => cu.uAmb.value);
    const nm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    nm.colorNode = Fn(() => {
      const w = positionWorld.toVar();
      const p = w.xz.mul(0.00011).add(vec2(uTime.mul(0.0007), uTime.mul(0.0002))).toVar();
      const n = NZ.sample(p).r.mul(0.55).add(NZ.sample(p.mul(2.7).add(0.3)).g.mul(0.3)).add(NZ.sample(p.mul(7.1).add(0.7)).b.mul(0.15));
      const c = smoothstep(float(1.0).sub(uCover.mul(0.9)).sub(0.15), float(1.0).sub(uCover.mul(0.9)).add(0.25), n).toVar();
      const d = length(w.xz.sub(cameraPosition.xz));
      c.mulAssign(smoothstep(30000.0, 75000.0, d).oneMinus());
      const v = normalize(w.sub(cameraPosition));
      const sunF = pow(max(dot(v, uSun), 0.0), 6.0);
      const thick = smoothstep(0.4, 1.0, c);
      const col = mix(uSunCol.mul(0.9).add(uAmb.mul(0.6)), uAmb.mul(0.75), thick.mul(0.6)).add(uSunCol.mul(sunF).mul(0.6).mul(thick.oneMinus()));
      return vec4(col, c.mul(0.92));
    })();
    sky.clouds.material = nm;
  }
  // 3. night skyglow + twilight (additive)
  {
    const gu = sky.glowU;
    const uNight = uniform(0).onRenderUpdate(() => gu.uNight.value), uTwi = uniform(0).onRenderUpdate(() => gu.uTwi.value), uSun = uniform(new THREE.Vector3()).onRenderUpdate(() => gu.uSun.value);
    const nm = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: true, transparent: false, blending: THREE.AdditiveBlending, fog: false });
    nm.colorNode = Fn(() => {
      const vD = normalize(positionLocal).toVar(); const y = max(vD.y, 0.0);
      const glow = mix(vec3(0.16, 0.11, 0.075), vec3(0.016, 0.02, 0.04), pow(y, 0.35)).mul(uNight);
      const sh = normalize(vec3(uSun.x, 0.0, uSun.z));
      const twi = mix(vec3(0.20, 0.12, 0.10), vec3(0.03, 0.05, 0.12), pow(y, 0.5)).mul(uTwi).mul(pow(max(dot(vD, sh), 0.0), 3.0).mul(0.6).add(0.6));
      return vec4(glow.add(twi), 1.0);
    })();
    sky.glow.material = nm;
  }
  // 4. environment dome for PMREM (image-based ambient + reflections)
  {
    const eu = sky.envU;
    const uZen = uniform(new THREE.Color()).onRenderUpdate(() => eu.uZen.value), uHor = uniform(new THREE.Color()).onRenderUpdate(() => eu.uHor.value), uGnd = uniform(new THREE.Color()).onRenderUpdate(() => eu.uGnd.value);
    const uSun = uniform(new THREE.Vector3()).onRenderUpdate(() => eu.uSun.value), uSunGlow = uniform(new THREE.Color()).onRenderUpdate(() => eu.uSunGlow.value);
    const nm = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
    nm.colorNode = Fn(() => {
      const d = normalize(positionLocal).toVar(); const y = d.y;
      const c = vec3(0).toVar();
      If(y.greaterThan(0.0), () => { c.assign(mix(uHor, uZen, pow(y, 0.6))); }).Else(() => { c.assign(mix(uHor.mul(0.6).add(uGnd.mul(0.4)), uGnd, smoothstep(0.0, 0.25, y.negate()))); });
      c.addAssign(uSunGlow.mul(pow(max(dot(d, uSun), 0.0), 8.0)).mul(step(-0.05, y)));
      return vec4(c, 1.0);
    })();
    sky.envScene.children[0].material = nm;
    sky.pmrem = new THREE.PMREMGenerator(renderer);
  }
  // 5. fog
  api.installFog(scene, sky.fog);
  return sky;
}
