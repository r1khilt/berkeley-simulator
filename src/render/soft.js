// [r6-fast] Cheap rendering path for software WebGL (SwiftShader / WARP / llvmpipe) and weak, fragment-bound GPUs,
// plus the opaque-canvas guard for every direct-to-canvas tier.
import * as THREE from 'three';

// three.js always creates its context with alpha:true (premultiplied). The direct (non-post) tiers draw straight into
// that buffer, and alpha-to-coverage foliage writes its coverage into alpha, so tree crowns came out partly transparent
// (dark page background bleeding through, washed-out readbacks). One alpha-only clear after the scene makes the canvas
// opaque whatever any material writes: ~1 ms on SwiftShader at 720p, effectively free on GPUs (on-chip on tilers).
export function opaqueCanvas(renderer) {
  const gl = renderer.getContext();
  gl.colorMask(false, false, false, true); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.colorMask(true, true, true, true);
  renderer.state.buffers.color.reset(); // three's cached colour mask / clear colour are stale now
}

// ---------------------------------------------------------------------------------------------------------------
// Soft tier shading (software WebGL). Measured on SwiftShader at 720p: the frame is dominated by fragment work, much of
// it quad overshading on sub-pixel terrain/landmark triangles, and every fragment pays for image-based lighting (PMREM
// cube-UV fetches), normal maps, the derivative TBN and six (usually dark) lamp point lights. installSoftShading() swaps
// three.js shader chunks once at boot, before anything compiles, so every MeshStandardMaterial (and all the onBeforeCompile
// hooks layered on top) keeps its colours, textures and custom code but loses those costs:
//  - BS_SOFT is #defined in every material (terrain / PBR helpers use it for cheaper variants);
//  - no environment map: the sky's ambient comes from the hemisphere light (sky.js sets it to the same irradiance the
//    PMREM dome gave) and a hemisphere lookup along the reflection vector stands in for the IBL specular;
//  - normal / bump maps are skipped (geometric normals);
//  - lamp point lights are skipped while they are off (uniform branch, so daytime pays nothing; night pools stay).
export function installSoftShading() {
  const C = THREE.ShaderChunk;
  if (C.common.startsWith('#define BS_SOFT')) return;
  C.common = '#define BS_SOFT\n' + C.common;
  C.lights_fragment_maps = C.lights_fragment_maps + /* glsl */`
#if !defined( USE_ENVMAP ) && defined( RE_IndirectSpecular ) && ( NUM_HEMI_LIGHTS > 0 )
	{ vec3 bsR = reflect( - geometryViewDir, geometryNormal ); float bsW = 0.5 * dot( bsR, hemisphereLights[ 0 ].direction ) + 0.5;
	  radiance += mix( hemisphereLights[ 0 ].groundColor, hemisphereLights[ 0 ].skyColor, bsW * bsW ) * RECIPROCAL_PI; } // [r6-fast] IBL stand-in
#endif`;
  C.normal_fragment_maps = '// [r6-fast] soft tier: no normal / bump maps\n';
  const loop = 'getPointLightInfo( pointLight, geometryPosition, directLight );';
  if (C.lights_fragment_begin.includes(loop)) {
    C.lights_fragment_begin = C.lights_fragment_begin
      .replace('pointLight = pointLights[ i ];', 'pointLight = pointLights[ i ];\n\t\tif ( pointLight.color.r + pointLight.color.g + pointLight.color.b > 0.0 ) { // [r6-fast] lamp off -> skip')
      .replace(/(RE_Direct\( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight \);\s*\n\s*}\s*\n\s*#pragma unroll_loop_end)/, (m) => m.replace('reflectedLight );', 'reflectedLight );\n\t\t}'));
  }
}

// Skinned meshes (player avatar, horse, crowd, Big Game figures) are created with frustumCulled = false because their bind-pose
// bounds don't follow the animation, so every one of them is skinned and shaded every frame even when it's behind the camera
// or 400 m away (~50 ms per avatar draw on SwiftShader). Give each a padded bounding sphere (bind-pose bounds x1.6, at least
// 2.5 m) and let three.js cull it. Called every ~90 frames on the direct (non-post) tiers so newly spawned people are caught.
const _bb = new THREE.Box3();
export function cullSkinned(root) {
  root.traverse((o) => {
    if (!o.isSkinnedMesh || o.frustumCulled || o.userData.bsCull) return;
    o.userData.bsCull = true;
    const g = o.geometry; if (!g || !g.attributes.position) return;
    if (!g.boundingBox) g.computeBoundingBox(); _bb.copy(g.boundingBox);
    const sph = new THREE.Sphere(); _bb.getBoundingSphere(sph); sph.radius = Math.max(2.5, sph.radius * 1.6);
    o.boundingSphere = sph; o.frustumCulled = true;
  });
}
