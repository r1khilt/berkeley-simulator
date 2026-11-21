// Shader patches for instanced trees: wind sway (per-instance phase), aerial-tint aware leaf colouring,
// crown-centred normals without back-face flipping, translucency, and coverage-preserving alpha test.
import * as THREE from 'three';
import { U } from '../materials.js';

export const TREE_WIND_DIR = { value: new THREE.Vector2(0.92, 0.38).normalize() }; // world xz direction the wind blows toward
export const TREE_REF_TINT = new THREE.Color(0.28, 0.32, 0.22);                    // linear aerial tint treated as "neutral"
export const TREE_VIEW = { value: 1080 };                                            // viewport height (px) for thin-twig culling

const WIND = /* glsl */`
uniform float uTime;
uniform float uWind;
uniform vec2 uWindDir;
uniform vec4 uSwayP; // x: tip sway (m per m of height per unit wind), y: leaf flutter, z: sway base (0..1 height), w: flutter on/off
float treeHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
mat4 treeObjM() {
#ifdef USE_INSTANCING
  return modelMatrix * instanceMatrix;
#else
  return modelMatrix;
#endif
}
vec3 treeWind(vec3 p) {
  mat4 m = treeObjM();
  vec3 ip = m[3].xyz;
  float sx = max(length(m[0].xyz), 1e-4), sy = max(length(m[1].xyz), 1e-4), sz = max(length(m[2].xyz), 1e-4);
  vec3 wd = vec3(uWindDir.x, 0.0, uWindDir.y);
  vec2 ld = vec2(dot(m[0].xyz / sx, wd), dot(m[2].xyz / sz, wd));
  float ph = treeHash(ip.xz * 0.173) * 6.2832;
  float t = uTime;
  float gust = 0.7 + 0.3 * sin(t * 0.31 + ip.x * 0.011 + ip.z * 0.007) * sin(t * 0.17 + ph);
  float w = uWind * gust;
  float h = clamp((p.y - uSwayP.z) / max(1.0 - uSwayP.z, 0.05), 0.0, 1.5);
  float fr = 6.0 / sqrt(max(sy, 2.0));
  float osc = 0.55 + 0.4 * sin(t * fr + ph) + 0.12 * sin(t * fr * 2.3 + ph * 1.7);
  float amp = uSwayP.x * sy * w * osc * h * h;
  p.x += ld.x * amp / sx;
  p.z += ld.y * amp / sz;
  if (uSwayP.w > 0.0) {
    float k = dot(position, vec3(17.1, 31.7, 23.3));
    float f = sin(t * (5.0 + 3.0 * fract(k)) + k * 6.2832 + ph) * uSwayP.y * w * h;
    p += vec3(f, 0.5 * f, -0.7 * f);
  }
  return p;
}
`;

// leaf cards keep their real-world proportions under the engine's non-uniform instance scale: each card is scaled
// uniformly (geometric mean of the instance scale) about its pivot = the point where it attaches to its twig
const DESTRETCH = /* glsl */`
attribute vec3 aPivot;
vec3 treeDestretch(vec3 p) {
  mat4 m = treeObjM();
  vec3 s = max(vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz)), vec3(1e-5));
  float su = pow(s.x * s.y * s.z, 1.0 / 3.0);
  return aPivot + (p - aPivot) * (su / s);
}
`;

const MIPBOOST = /* glsl */`
#ifdef USE_MAP
float leafMipBoost(vec2 uv) {
  vec2 sz = vec2(textureSize(map, 0));
  vec2 dx = dFdx(uv * sz), dy = dFdy(uv * sz);
  float d = max(dot(dx, dx), dot(dy, dy));
  return 1.0 + 0.0 * d; // coverage is preserved in the baked mip chain (tree-textures.js)
}
#endif
`;

const RAMP = /* glsl */`
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec4 uRamp; // x,y: ramp thresholds A->B->C, z: per-tree spread, w: per-card spread
uniform vec3 uTwigCol;
uniform vec3 uTrans; // x: backlight translucency, y: wrap translucency, z: lod2 brightness
uniform float uLeafSpec; // scales leaf specular (sky sheen); glossy species higher
varying float vAO;
varying float vRnd;
varying float vInst;
varying vec3 vTint;
varying float vFade;
vec3 leafRamp(float q) {
  vec3 c = mix(uColA, uColB, smoothstep(uRamp.x - 0.12, uRamp.x + 0.12, q));
  return mix(c, uColC, smoothstep(uRamp.y - 0.12, uRamp.y + 0.12, q));
}
`;

const VARY_VERT = /* glsl */`
uniform vec3 uRefTint;
uniform float uTintK;
varying float vAO;
varying float vRnd;
varying float vInst;
varying vec3 vTint;
varying float vFade;
`;
const VARY_VERT_MAIN = /* glsl */`
#ifdef TREE_CARDN
{
  mat4 cm = treeObjM();
  vec3 cs = max(vec3(length(cm[0].xyz), length(cm[1].xyz), length(cm[2].xyz)), vec3(1e-5));
  vec3 nW = normalize(mat3(cm[0].xyz / cs.x, cm[1].xyz / cs.y, cm[2].xyz / cs.z) * aCardN);
  vec4 wp = cm * vec4(transformed, 1.0);
  vec3 toCam = normalize(cameraPosition - wp.xyz);
  vFade = smoothstep(0.12, 0.38, abs(dot(nW, toCam)));
}
#endif
{
  mat4 tm = treeObjM();
  vInst = treeHash(tm[3].xz * 0.37 + 11.0);
  vTint = vec3(1.0);
#ifdef USE_INSTANCING_COLOR
  vTint = mix(vec3(1.0), clamp(instanceColor.rgb / uRefTint, vec3(0.5), vec3(1.6)), uTintK);
#endif
}
`;

const NORMAL_NOFLIP = THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '');

const TRANSLUCENT = /* glsl */`
#include <lights_physical_pars_fragment>
void RE_Direct_Leaf( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  float back = pow( saturate( dot( -geometryViewDir, directLight.direction ) ), 2.5 );
  float wrap = 0.35 + 0.65 * saturate( -dot( geometryNormal, directLight.direction ) );
  reflectedLight.directDiffuse += directLight.color * material.diffuseContribution * RECIPROCAL_PI * ( back * uTrans.x + wrap * uTrans.y );
}
#undef RE_Direct
#define RE_Direct RE_Direct_Leaf
`;

// uniforms shared by a species' bark, leaf, blob and shadow materials (so all of them sway identically)
export function makeTreeUniforms(o) {
  const c = (hex) => new THREE.Color(hex);
  return {
    uTime: U.uTime, uWind: U.uWind, uWindDir: TREE_WIND_DIR,
    uSwayP: { value: new THREE.Vector4(o.sway ?? 0.012, o.flutter ?? 0.0015, o.swayBase ?? 0.15, 0) },
    uSwayPLeaf: { value: new THREE.Vector4(o.sway ?? 0.012, o.flutter ?? 0.0015, o.swayBase ?? 0.15, 1) },
    uColA: { value: c(o.cols[0]) }, uColB: { value: c(o.cols[1]) }, uColC: { value: c(o.cols[2]) },
    uRamp: { value: new THREE.Vector4(...(o.ramp ?? [0.35, 0.7, 0.3, 0.2])) },
    uTwigCol: { value: c(o.twig ?? '#5a4a3c') },
    uTrans: { value: new THREE.Vector3(o.transBack ?? 0.6, o.transWrap ?? 0.25, o.blobK ?? 0.62) },
    uRefTint: { value: TREE_REF_TINT }, uTintK: { value: o.tintK ?? 1.0 },
    uLeafSpec: { value: o.leafSpec ?? 0.18 },
    uTypH: { value: o.typH ?? 10 }, uViewH: TREE_VIEW,
  };
}

function withUniforms(shader, uni, flutterOn) {
  for (const k in uni) shader.uniforms[k] = uni[k];
  shader.uniforms.uSwayP = flutterOn ? uni.uSwayPLeaf : uni.uSwayP; // leaves flutter, wood only sways
}

export function patchLeaf(mat, uni) {
  mat.onBeforeCompile = (sh) => {
    withUniforms(sh, uni, true);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n#define TREE_CARDN\n' + WIND + DESTRETCH + VARY_VERT + 'attribute float aAO;\nattribute float aRnd;\nattribute vec3 aCardN;\n')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = treeWind(treeDestretch(transformed));\nvAO = aAO; vRnd = aRnd;\n' + VARY_VERT_MAIN);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n#define TREE_CARDN\n' + RAMP)
      .replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\n' + MIPBOOST)
      .replace('#include <map_fragment>', /* glsl */`
#ifdef USE_MAP
  vec4 lt = texture2D( map, vMapUv );
  float q = lt.g + ( vInst - 0.5 ) * uRamp.z + ( vRnd - 0.5 ) * uRamp.w;
  vec3 lc = mix( leafRamp( q ) * vTint, uTwigCol, lt.b );
  diffuseColor.rgb *= lc * lt.r * vAO;
  diffuseColor.a *= lt.a * leafMipBoost( vMapUv );
#ifdef TREE_CARDN
  diffuseColor.a *= vFade;
#endif
#endif
`)
      .replace('#include <color_fragment>', '')
      .replace('#include <normal_fragment_begin>', NORMAL_NOFLIP)
      .replace('#include <lights_physical_pars_fragment>', TRANSLUCENT)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n material.specularColor *= uLeafSpec; material.specularColorBlended *= uLeafSpec; material.specularF90 *= uLeafSpec;')
      // small unshadowed sky fill so crown interiors (in the crown's own shadow) never go black; off at night
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n reflectedLight.indirectDiffuse += material.diffuseContribution * vec3(0.9, 1.0, 0.95) * 0.3 * (1.0 - uNight); // light transmitted through the canopy: shaded crown interiors stay readable green');
    sh.uniforms.uNight = U.uNight;
    sh.fragmentShader = 'uniform float uNight;\n' + sh.fragmentShader;
  };
  mat.customProgramCacheKey = () => 'tree-leaf-5';
  return mat;
}

export function patchBark(mat, uni) {
  mat.onBeforeCompile = (sh) => {
    withUniforms(sh, uni, false);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + WIND + 'attribute float aRad;\nuniform float uTypH;\nuniform float uViewH;\nvarying float vPx;\n')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = treeWind(transformed);\n')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
      {
        // geometry UVs are metres at the species' typical size: rescale to this instance so bark keeps ~1 m tiles
        mat4 bm = treeObjM();
        float bsx = length(bm[0].xyz), bsy = length(bm[1].xyz), bsz = length(bm[2].xyz);
        vec2 k = vec2(0.5 * (bsx + bsz), pow(bsx * bsy * bsz, 1.0 / 3.0)) / uTypH;
        #ifdef USE_MAP
          vMapUv *= k;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv *= k;
        #endif
      }`)
      .replace('#include <project_vertex>', `#include <project_vertex>
      {
        mat4 bm2 = treeObjM();
        float su = pow(length(bm2[0].xyz) * length(bm2[1].xyz) * length(bm2[2].xyz), 1.0 / 3.0);
        vPx = 2.0 * aRad * su * projectionMatrix[1][1] * 0.5 * uViewH / max(-mvPosition.z, 0.05);
      }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vPx;\n')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n if (vPx < 0.75) discard; // sub-pixel twig')
      .replace('#include <color_fragment>', ''); // bark ignores the foliage tint
  };
  mat.customProgramCacheKey = () => 'tree-bark-5';
  return mat;
}

// far LOD: untextured, vertex attributes aLeaf (1 crown / 0 trunk) and aAO; colour from the same ramp as the leaves
export function patchBlob(mat, uni) {
  mat.onBeforeCompile = (sh) => {
    withUniforms(sh, uni, false);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + WIND + VARY_VERT + 'attribute float aAO;\nattribute float aLeaf;\nvarying float vLeaf;\n')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAO = aAO; vRnd = 0.5; vLeaf = aLeaf; vFade = 1.0;\n' + VARY_VERT_MAIN);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + RAMP + 'varying float vLeaf;\n')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n material.specularColor *= uLeafSpec; material.specularColorBlended *= uLeafSpec; material.specularF90 *= uLeafSpec;')
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n reflectedLight.indirectDiffuse += material.diffuseContribution * vec3(0.9, 1.0, 0.95) * 0.3 * vLeaf * (1.0 - uNight);')
      .replace('#include <color_fragment>', /* glsl */`
  float q0 = 0.42 + ( vInst - 0.5 ) * uRamp.z; // mean of the atlas' per-leaf values
  vec3 bc = ( leafRamp( q0 - 0.3 ) + leafRamp( q0 ) + leafRamp( q0 + 0.3 ) ) * ( 1.0 / 3.0 ) * vTint * uTrans.z;
  diffuseColor.rgb *= mix( uTwigCol, bc, vLeaf ) * vAO;
`);
    sh.uniforms.uNight = U.uNight; sh.fragmentShader = 'uniform float uNight;\n' + sh.fragmentShader;
  };
  mat.customProgramCacheKey = () => 'tree-blob-4';
  return mat;
}

// shadow-pass materials: same wind; alpha test with the same coverage boost (map/alphaTest are copied from
// the main material by three's shadow renderer)
export function makeDepthMaterials(uni, leafy) {
  const patch = (m, key) => {
    m.onBeforeCompile = (sh) => {
      withUniforms(sh, uni, leafy);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + WIND + (leafy ? DESTRETCH : ''))
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = treeWind(' + (leafy ? 'treeDestretch(transformed)' : 'transformed') + ');\n');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <alphatest_pars_fragment>', '#include <alphatest_pars_fragment>\n' + MIPBOOST)
        .replace('#include <alphatest_fragment>', '#if defined( USE_ALPHATEST ) && defined( USE_MAP )\n diffuseColor.a *= leafMipBoost( vMapUv );\n#endif\n#include <alphatest_fragment>');
    };
    m.customProgramCacheKey = () => key;
    return m;
  };
  return {
    depth: patch(new THREE.MeshDepthMaterial(), leafy ? 'tree-depth-leaf-4' : 'tree-depth-4'),
    distance: patch(new THREE.MeshDistanceMaterial(), leafy ? 'tree-dist-leaf-4' : 'tree-dist-4'),
  };
}
