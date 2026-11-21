// Global look: aerial-perspective fog (linear-exponential, not squared), custom tone mapping with gentle grading,
// and a contact-AO hook that darkens anything near the terrain surface (buildings, landmarks, props, trees).
import * as THREE from 'three';
export const GRADE = { uSat: { value: 1.08 }, uContrast: { value: 1.06 }, uWarm: { value: 0.0 }, uLift: { value: 0.0 } };
export function installGrading() {
  THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * vFogDepth );
    fogFactor = fogFactor * fogFactor * (3.0 - 2.0 * fogFactor) * 0.35 + fogFactor * 0.65;
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
    'vec3 CustomToneMapping( vec3 color ) { return color; }',
    `vec3 CustomToneMapping( vec3 color ) {
  vec3 c = NeutralToneMapping( color );
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, 1.08);
  // gfx-trees: contrast in perceptual (gamma) space. Applied to linear values around 0.5 it clamped everything below
  // 0.024 linear (about 43/255 on screen) to pure black, which crushed tree canopies and every shadow to #000.
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c = (c - 0.5) * 1.05 + 0.5;
  c = pow(clamp(c, 0.0, 1.0), vec3(2.2));
  return c;
}`);
}
// contact AO hook: call with the core height texture info
export function contactAO(mat, heightTex, core) {
  const k0 = mat.customProgramCacheKey ? String(mat.customProgramCacheKey()) : '';   // capture before we wrap onBeforeCompile
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = function (sh, r) {
    if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev.call(this, sh, r);
    if (sh.vertexShader.includes('varying vec3 vWPAO')) return;   // already injected (cloned/shared hook chains)
    sh.uniforms.uAOH = { value: heightTex }; sh.uniforms.uAOCore = { value: core.v4 }; sh.uniforms.uAOSize = { value: core.size };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPAO;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
 { vec4 wpa = vec4(transformed, 1.0);
   #ifdef USE_INSTANCING
   wpa = instanceMatrix * wpa;
   #endif
   vWPAO = (modelMatrix * wpa).xyz; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWPAO; uniform sampler2D uAOH; uniform vec4 uAOCore; uniform vec2 uAOSize;
float aoH(vec2 w){ vec2 f=(w-uAOCore.xy)/uAOCore.z; if (f.x < 0.0 || f.y < 0.0 || f.x > uAOSize.x-1.0 || f.y > uAOSize.y-1.0) return -1e4; ivec2 i=ivec2(floor(f)); vec2 t=f-vec2(i);
 float a=texelFetch(uAOH,i,0).r, b=texelFetch(uAOH,i+ivec2(1,0),0).r, c=texelFetch(uAOH,i+ivec2(0,1),0).r, d=texelFetch(uAOH,i+ivec2(1,1),0).r; return mix(mix(a,b,t.x),mix(c,d,t.x),t.y); }`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
 { float hh = vWPAO.y - aoH(vWPAO.xz); float cao = mix(0.5, 1.0, smoothstep(0.0, 2.2, hh)); reflectedLight.indirectDiffuse *= cao; reflectedLight.indirectSpecular *= cao; reflectedLight.directDiffuse *= mix(1.0, cao, 0.35); }`);
  };
  mat.customProgramCacheKey = () => k0 + '|cao';
  mat.needsUpdate = true;
}
