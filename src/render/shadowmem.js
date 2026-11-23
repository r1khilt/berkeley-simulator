// [r6-load] Shadow-map memory. three.js (r187) gives every PCF shadow map an RGBA8 colour texture next to the depth texture
// it actually samples, and nothing ever reads the colour. Creating the target ourselves with an R8 colour attachment
// (renderable in WebGL2) saves 75% of it: 12 MB per 2048² cascade (36 MB on high), 48 MB per 4096² one (144 MB on ultra).
// The depth texture, its compare mode and its filtering are exactly what WebGLShadowMap would have made.
// Call after the shadow-casting lights exist and before the first render. ?slimshadow=0 skips it.
import * as THREE from 'three';
export function slimShadowMaps(lights, renderer) {
  if (!renderer || !renderer.isWebGLRenderer || renderer.shadowMap.type !== THREE.PCFShadowMap) return 0;
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('slimshadow') === '0') return 0;
  const reversed = !!(renderer.state.buffers.depth.getReversed && renderer.state.buffers.depth.getReversed());
  let n = 0;
  for (const l of lights || []) {
    const s = l && l.shadow; if (!s || s.map || l.isPointLight || !l.castShadow) continue;
    const w = s.mapSize.x, h = s.mapSize.y;
    const rt = new THREE.WebGLRenderTarget(w, h, { format: THREE.RedFormat, type: THREE.UnsignedByteType, generateMipmaps: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    rt.texture.name = (l.name || 'light') + '.shadowColour';
    const dt = new THREE.DepthTexture(w, h, THREE.UnsignedIntType); dt.name = (l.name || 'light') + '.shadowMap'; dt.format = THREE.DepthFormat;
    dt.compareFunction = reversed ? THREE.GreaterEqualCompare : THREE.LessEqualCompare; dt.minFilter = THREE.LinearFilter; dt.magFilter = THREE.LinearFilter;
    // [r6-int] three sets shadow.camera._reversedDepth just before it creates a map and rebuilds the projection; with the map
    // made here it never rebuilds it, and CSM.update() doesn't either, so a reversed depth buffer got a standard-depth
    // shadow projection (every fragment read as shadowed: no sunlight) until the next csm.updateFrustums().
    s.camera._reversedDepth = reversed;
    rt.depthTexture = dt; s.map = rt; s.camera.updateProjectionMatrix(); n++;
  }
  return n;
}
