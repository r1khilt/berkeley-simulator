// Global look (gfx-post): physically based fog applied in linear light BEFORE tone mapping, AgX tone mapping with a
// photographic look matched to real Berkeley photos, and a contact-AO hook that darkens anything near the terrain surface.
// The same LOOK numbers drive the in-material path (low/medium) and the post pipeline (high/ultra, src/render/post.js).
import * as THREE from 'three';
export const GRADE = { uSat: { value: 1.08 }, uContrast: { value: 1.06 }, uWarm: { value: 0.0 }, uLift: { value: 0.0 } };   // legacy (unused)
// LOOK: slope/power/sat = ASC-CDL style look inside AgX's log domain (Blender "Punchy" is power 1.35 sat 1.4);
// flare = veiling glare added in exposed scene-linear units (lifts blacks like a real lens); satOut/warm/tint = display grade.
export const LOOK = { contrast: 1.42, slope: 1.0, power: 1.05, sat: 1.2, flare: 0.003, satOut: 1.0, satKnee: 0.15, warm: 0.012, shadowCool: 0.02 };
export const AOU = { uCAOMin: { value: 0.5 } };   // contact-AO floor (raised when screen-space AO is on)
const f = (x) => Number(x).toFixed(5);
// GLSL: tone map an already-exposed scene-linear colour to display-linear sRGB. `U` = use uniforms (post) instead of constants.
export function toneGLSL(U) {
  const v = (k) => (U ? `uLook_${k}` : f(LOOK[k]));
  return /* glsl */`
${U ? 'uniform float uLook_contrast, uLook_slope, uLook_power, uLook_sat, uLook_flare, uLook_satOut, uLook_satKnee, uLook_warm, uLook_shadowCool;' : ''}
vec3 bsAgxContrast(vec3 x){ vec3 x2 = x*x; vec3 x4 = x2*x2; return 15.5*x4*x2 - 40.14*x4*x + 31.96*x4 - 6.868*x2*x + 0.4298*x2 + 0.1191*x - 0.00232; }
vec3 bsimTonemap(vec3 color){
  const mat3 S2R = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
  const mat3 R2S = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
  const mat3 Ins = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
  const mat3 Out = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
  color = max(color, 0.0) + vec3(${v('flare')});
  color = Ins * (S2R * color);
  color = (log2(max(color, 1e-10)) + 12.47393) / 16.5;
  // contrast around middle grey in AgX log space, with a protected toe (slope 1 below ~-2.5 EV) so dusk/night stay readable
  { vec3 hi = 0.60606 + (color - 0.60606) * ${v('contrast')}; float x0 = 0.45; float y0 = 0.60606 + (x0 - 0.60606) * ${v('contrast')};
    color = clamp(mix(y0 + (color - x0), hi, step(x0, color)), 0.0, 1.0); }
  color = bsAgxContrast(color);
  // look (Blender AgX look: slope -> power -> saturation)
  float l0 = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = pow(max(color * ${v('slope')}, 0.0), vec3(${v('power')}));
  float l1 = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = l1 + ${v('sat')} * (color - l1);
  color = Out * color;
  color = pow(max(color, 0.0), vec3(2.2));
  color = clamp(R2S * color, 0.0, 1.0);
  // display grade: saturation trim, gentle warm white balance, cool shadows / neutral highlights
  float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
  // soft chroma knee: tames neon foliage/paint while leaving the sky and skin-tone range alone
  float mx = max(color.r, max(color.g, color.b)), mn = min(color.r, min(color.g, color.b));
  float sat = (mx - mn) / max(mx, 1e-4);
  float k = ${v('satOut')} * (1.0 - ${v('satKnee')} * smoothstep(0.5, 1.0, sat));
  color = max(vec3(0.0), l + k * (color - l));
  color *= vec3(1.0 + ${v('warm')}, 1.0, 1.0 - ${v('warm')});
  float sh = 1.0 - smoothstep(0.0, 0.25, l);
  color *= vec3(1.0 - ${v('shadowCool')} * sh, 1.0, 1.0 + ${v('shadowCool')} * sh);
  return clamp(color, 0.0, 1.0);
}`;
}
export function installGrading() {
  // fog moves into the tone-mapping chunk so it is mixed in linear scene light (before tone mapping), with
  // wavelength-dependent Rayleigh extinction (near haze is blue, far haze converges to the horizon sky colour).
  THREE.ShaderChunk.fog_fragment = '';
  THREE.ShaderChunk.tonemapping_fragment = /* glsl */`
#ifdef USE_FOG
  #ifdef FOG_EXP2
  { vec3 bsExt = (vec3(5.802e-6, 13.558e-6, 33.1e-6) + vec3(fogDensity)) * step(1e-12, fogDensity);
    vec3 bsT = exp(-bsExt * vFogDepth);
    gl_FragColor.rgb = gl_FragColor.rgb * bsT + fogColor * (1.0 - bsT); }
  #else
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(fogNear, fogFar, vFogDepth));
  #endif
#endif
#if defined( TONE_MAPPING )
  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`;
  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
    'vec3 CustomToneMapping( vec3 color ) { return color; }',
    `${toneGLSL(false)}
vec3 CustomToneMapping( vec3 color ) { return bsimTonemap( color * toneMappingExposure ); }`);
}
// contact AO hook: call with the core height texture info. Also writes the ambient fraction of the final colour into
// alpha (opaque materials only) so the screen-space AO in post.js darkens only sky/bounce light, never direct sun.
export function contactAO(mat, heightTex, core) {
  const k0 = mat.customProgramCacheKey ? String(mat.customProgramCacheKey()) : '';   // capture before we wrap onBeforeCompile
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = function (sh, r) {
    if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev.call(this, sh, r);
    if (sh.vertexShader.includes('varying vec3 vWPAO')) return;   // already injected (cloned/shared hook chains)
    sh.uniforms.uAOH = { value: heightTex }; sh.uniforms.uAOCore = { value: core.v4 }; sh.uniforms.uAOSize = { value: core.size }; sh.uniforms.uCAOMin = AOU.uCAOMin;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPAO;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
 { vec4 wpa = vec4(transformed, 1.0);
   #ifdef USE_INSTANCING
   wpa = instanceMatrix * wpa;
   #endif
   vWPAO = (modelMatrix * wpa).xyz; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWPAO; uniform sampler2D uAOH; uniform vec4 uAOCore; uniform vec2 uAOSize; uniform float uCAOMin;
float aoH(vec2 w){ vec2 f=(w-uAOCore.xy)/uAOCore.z; if (f.x < 0.0 || f.y < 0.0 || f.x > uAOSize.x-1.0 || f.y > uAOSize.y-1.0) return -1e4; ivec2 i=ivec2(floor(f)); vec2 t=f-vec2(i);
 float a=texelFetch(uAOH,i,0).r, b=texelFetch(uAOH,i+ivec2(1,0),0).r, c=texelFetch(uAOH,i+ivec2(0,1),0).r, d=texelFetch(uAOH,i+ivec2(1,1),0).r; return mix(mix(a,b,t.x),mix(c,d,t.x),t.y); }`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
 { float hh = vWPAO.y - aoH(vWPAO.xz); float cao = mix(uCAOMin, 1.0, smoothstep(0.0, 2.2, hh)); reflectedLight.indirectDiffuse *= cao; reflectedLight.indirectSpecular *= cao; reflectedLight.directDiffuse *= mix(1.0, cao, 0.35 * (1.0 - uCAOMin) / 0.5); }`)
      .replace('#include <opaque_fragment>', AMB_ALPHA);
  };
  mat.customProgramCacheKey = () => k0 + '|cao2';
  mat.needsUpdate = true;
}
// ambient fraction of the final colour -> alpha in [0, 0.49] (opaque materials only; alpha-to-coverage foliage keeps its
// coverage alpha, which post.js reads as 'unknown'). post.js darkens only this fraction with GTAO.
const AMB_ALPHA = `#include <opaque_fragment>
 #ifdef OPAQUE
 { float bsTot = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)) + 1e-5;
   float bsAmb = dot(reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular, vec3(0.2126, 0.7152, 0.0722));
   gl_FragColor.a = 0.49 * clamp(bsAmb / bsTot, 0.0, 1.0); }
 #endif`;
// same alpha encoding for opaque standard materials that skip contactAO (terrain, rings, water)
export function ambAlpha(mat) {
  const k0 = mat.customProgramCacheKey ? String(mat.customProgramCacheKey()) : '';
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = function (sh, r) {
    if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev.call(this, sh, r);
    if (sh.fragmentShader.includes('bsAmb')) return;
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', AMB_ALPHA);
  };
  mat.customProgramCacheKey = () => k0 + '|amba';
  mat.needsUpdate = true;
}
