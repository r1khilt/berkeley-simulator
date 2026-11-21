// [gfx-webgpu] TSL ports for the smaller custom materials (bay lights, pedestrians, grass, props, vegetation).
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, vec4, uniform, attribute, positionLocal, positionWorld, sin, mix } from 'three/tsl';

let warned = new Set();
export const extraHandlers = {
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
