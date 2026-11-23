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
