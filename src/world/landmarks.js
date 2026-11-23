// Streams hand-modelled landmark modules in and out by distance. Procedural stand-ins show until a landmark is built.
import * as THREE from 'three';
import { materials, U, boxUV } from '../materials.js';
import { loadJSON } from '../data.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { applyInteriorGlass } from './interiors.js'; // furnished rooms behind landmark window glass
import { weatherLandmark } from './pbr.js'; // r4-sweep-central2: consistent base grime on mixed façades
import { PROXY_LAYER } from '../render/perf.js'; // [r6-perf] shadow-only proxy layer
import { lodClassOf } from '../render/lod.js'; // [r7-lod] size classes for fine details
const modules = import.meta.glob('../landmarks/*.js');
export const normId = (s) => String(s).replace(/^way\//, 'w/').replace(/^relation\//, 'r/').replace(/^node\//, 'n/');
// [r6-load] module + packet fetches started ahead of _load: the boot landmarks while the world data downloads, and while
// streaming the next few nearest candidates. On a 40 ms RTT link each landmark used to cost its own sequential round
// trips before its build could start.
const _pre = new Map();
export function prefetchLandmark(id) {
  let p = _pre.get(id); if (p) return p;
  const imp = modules[`../landmarks/${id}.js`]; if (!imp) return null;
  p = Promise.all([imp(), loadJSON(`landmarks/${id}.json.gz`)]); _pre.set(id, p); p.catch(() => _pre.delete(id));
  return p;
}
export async function loadManifest() { try { return await loadJSON('landmarks/manifest.json'); } catch (e) { console.warn('no landmark manifest', e); return { landmarks: [] }; } }
export class LandmarkManager {
  constructor({ scene, physics, heightAt, manifest, standins, onLoaded, onUnloaded, setupMaterials, loadR = 430, unloadR = 680 }) {
    Object.assign(this, { scene, physics, heightAt, standins, onLoaded, onUnloaded, setupMaterials, loadR, unloadR });
    this.M = materials();
    this.items = manifest.landmarks.filter((l) => modules[`../landmarks/${l.id}.js`]).map((l) => ({ ...l, replaces: (l.replaces || []).map(normId), state: 'idle' }));
    this.byId = new Map(this.items.map((l) => [l.id, l]));
    this.busy = false; this.placed = []; this.interactions = [];
  }
  get loaded() { return this.items.filter((l) => l.state === 'ready'); }
  async loadNow(ids) { for (const id of ids) { const l = this.byId.get(id); if (l && l.state === 'idle') await this._load(l); } }
  update(camPos) {
    if (this.busy) return;
    let best = null, bd = Infinity; const cand = this._cand || (this._cand = []); cand.length = 0; // [r6-load] prefetch candidates
    for (const l of this.items) {
      const d = Math.hypot(l.anchor.x - camPos.x, l.anchor.z - camPos.z) - (l.r || 0);
      if (l.state === 'ready' && !l.always && d > this.unloadR) { this._unload(l); return; }
      if (l.state === 'idle' && (d < this.loadR || l.always) && d < bd) { bd = d; best = l; }
      if (l.state === 'idle') { if (d < this.loadR + 150 || l.always) { if (!_pre.has(l.id)) cand.push(l, d); } else if (d > this.loadR + 200 && _pre.has(l.id)) _pre.delete(l.id); } // drop stale prefetches
    }
    const now = performance.now();
    if (best && now - (this.lastLoad || 0) > 140) { this.busy = true; this.lastLoad = now; this._load(best).finally(() => { this.busy = false; this.lastLoad = performance.now(); }); }
    // [r6-load] keep up to 4 fetches ahead, nearest first (cand holds [item, distance] pairs flat)
    if (cand.length && _pre.size < 4) { const order = []; for (let i = 0; i < cand.length; i += 2) order.push(i); order.sort((a, b) => cand[a + 1] - cand[b + 1]);
      for (const i of order) { if (_pre.size >= 4) break; if (cand[i] !== best) prefetchLandmark(cand[i].id); } }
  }
  async _load(l) {
    l.state = 'loading'; const tl0 = performance.now(); // [r6-perf] load timing (l.loadMs)
    try {
      const pre = _pre.get(l.id); _pre.delete(l.id); // [r6-load] use a prefetch if one is in flight
      const [mod, packet] = await (pre || Promise.all([modules[`../landmarks/${l.id}.js`](), loadJSON(`landmarks/${l.id}.json.gz`)]));
      const a = packet.anchor; const heightAt = this.heightAt;
      const groundAt = (x, z) => heightAt(a.x + x, a.z + z) - a.y;
      const res = await mod.build({ THREE, M: this.M, U, boxUV, groundAt, footprints: packet.footprints, anchor: a, packet });
      const obj = res.object3d; obj.position.set(a.x, a.y, a.z); obj.name = 'landmark:' + l.id;
      if (this.ready) await yieldTask(); // [r6-load] after BSIM.ready: build, merge and material setup run as separate tasks (shorter hitches)
      if (!res.update) mergeStatic(obj);
      if (this.ready) await yieldTask();
      if (!/[?      try { applyInteriorGlass(obj,]nointerior/.test(location.search)) try { applyInteriorGlass(obj, { id: l.id, name: (mod.info && mod.info.name) || l.name, tag: packet.footprints && packet.footprints[0] && packet.footprints[0].tags && packet.footprints[0].tags.building, M: this.M }); } catch (e) { console.warn('interiors', l.id, e); } // window interiors
      obj.traverse((o) => { if (o.isMesh) { if (o.castShadow !== false) o.castShadow = true; o.receiveShadow = true; } });
      const details = []; obj.traverse((o) => { if (o.userData && o.userData.detail) { details.push(o); o.traverse((m) => { if (m.isMesh) m.castShadow = false; }); } });
      try { weatherLandmark(obj); } catch (e) { console.warn('weather', l.id, e); } // r4-sweep-central2: plain masonry gets base grime too
      this.setupMaterials && this.setupMaterials(obj);
      if (!res.update && !(window.BSIM && window.BSIM.gpu) && !/[?&]noproxy/.test(location.search)) try { const tp = performance.now(); l.proxyStats = buildShadowProxy(obj); l.proxyStats.ms = +(performance.now() - tp).toFixed(1); } catch (e) { console.warn('shadow proxy', l.id, e); } // [r6-perf]
      this.scene.add(obj);
      if (this.ready) await warmPrograms(obj, this.scene); // [r6-load] compile its shaders off the main thread before it is drawn
      const tag = 'lm:' + l.id, ph = this.physics;
      for (const c of res.colliders || []) {
        if (c.type === 'poly') ph.addRing(c.pts.map(([x, z]) => [x + a.x, z + a.z]), (c.y0 ?? -5) + a.y, (c.y1 ?? 100) + a.y, tag);
        else if (c.type === 'box') ph.addBox(c.min[0] + a.x, c.min[1] + a.y, c.min[2] + a.z, c.max[0] + a.x, c.max[1] + a.y, c.max[2] + a.z, tag);
        else if (c.type === 'cyl') ph.addCircle(c.x + a.x, c.z + a.z, c.r, (c.y0 ?? -5) + a.y, (c.y1 ?? 100) + a.y, tag);
      }
      for (const w of res.walkables || []) {
        if (w.type === 'poly') ph.addWalkable({ type: 'poly', pts: w.pts.map(([x, z]) => [x + a.x, z + a.z]), y: w.y + a.y, tag });
        else if (w.type === 'fn') { const f = w.heightAt; ph.addWalkable({ type: 'fn', tag, bounds: [w.bounds[0] + a.x, w.bounds[1] + a.z, w.bounds[2] + a.x, w.bounds[3] + a.z], heightAt: (x, z) => { const v = f(x - a.x, z - a.z); return v == null ? null : v + a.y; } }); }
      }
      for (const hpoly of res.terrainHoles || []) ph.addHole(hpoly.map(([x, z]) => [x + a.x, z + a.z]), tag);
      // [interiors] a landmark with walkable interiors (res.replacesColliders) supplies its own walls: switch off the
      // procedural footprint colliders of the buildings it replaces while it is loaded (restored on unload)
      // [interiors-doe] replacesColliders: now covered for every landmark by physics.suspendTag below (integration)
      l.inter = (res.interactions || []).map((it) => ({ ...it, landmark: l.id, pos: [it.pos[0] + a.x, it.pos[1] + a.y, it.pos[2] + a.z], teleport: it.teleport ? [it.teleport[0] + a.x, it.teleport[1] + a.y, it.teleport[2] + a.z] : null }));
      l.anchors = {}; for (const [k, v] of Object.entries(res.anchors || {})) if (Array.isArray(v)) l.anchors[k] = [v[0] + a.x, v[1] + a.y, v[2] + a.z];
      Object.assign(l, { obj, res, details, packetAnchor: a, info: mod.info || {} });
      this.standins && this.standins.setHidden(l.replaces, true);
      if (this.physics.suspendTag) for (const id of l.replaces) this.physics.suspendTag(id, true); // new-buildings: the hidden stand-in's walls go too
      l.state = 'ready'; this.placed.push(l); l.loadMs = Math.round(performance.now() - tl0);
      this.onLoaded && this.onLoaded(l);
    } catch (e) { console.warn('landmark failed', l.id, e); l.state = 'failed'; }
  }
  _unload(l) {
    this.scene.remove(l.obj);
    // [r6-load] free what this landmark alone owns. Before, only geometries were disposed, so every load/unload cycle leaked
    // its canvas textures (signs, interiors: 1-10 MB each), instance buffers and material programs on the GPU. During a
    // long walk or fly the GPU process kept growing until the tab crashed.
    try { disposeOwned(l.obj, this.scene, this._keep || (this._keep = keepSet(this.M))); } catch (e) { console.warn('landmark dispose', l.id, e); }
    if (l.res && typeof l.res.dispose === 'function') try { l.res.dispose(); } catch (e) { console.warn('landmark dispose', l.id, e); }
    this.physics.removeTag('lm:' + l.id);
    if (l.res && l.res.ownsCollision && this.physics.muteTag) for (const id of l.replaces) this.physics.muteTag(id, false); // interiors-cafe
    this.standins && this.standins.setHidden(l.replaces, false);
    if (this.physics.suspendTag) for (const id of l.replaces) this.physics.suspendTag(id, false);
    this.placed = this.placed.filter((x) => x !== l);
    l.state = 'idle'; l.obj = null; l.res = null; l.details = []; l._fine = null; l._lodObj = null; // [r7-lod x r6-load] drop the fine-part list too (it pinned the unloaded meshes' CPU arrays)
    this.onUnloaded && this.onUnloaded(l);
  }
  frame(dt, env) {
    const cp = env.camera.position;
    for (const l of this.placed) {
      const d = Math.hypot(l.anchor.x - cp.x, l.anchor.z - cp.z);
      const show = d < (this.detailR ?? 380) + (l.r || 0); // [r6-perf] governor may shorten the ornament range
      for (const o of l.details) o.visible = show;
      if (l.res && l.res.update && d < 2500) { try { l.res.update(dt, env); } catch (e) { l.res.update = null; console.warn(e); } }
    }
  }
}

// Merge static meshes that share a material (and attribute layout) to cut draw calls. Keeps instanced meshes,
// detail-tagged subtrees and anything named/animated untouched.
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map(); const remove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
    let p = o, skip = false; while (p && p !== root) { if (p.userData && (p.userData.detail || p.userData.keep)) { skip = true; break; } p = p.parent; }
    if (skip || o.morphTargetInfluences) return;
    const g = o.geometry; const sig = Object.keys(g.attributes).sort().join(',') + (g.index ? '|i' : '|n');
    const lc = lodClassOf(o, inv); // [r7-lod] tiny parts merge separately so they can drop out by projected size
    const key = o.material.uuid + '|' + sig + '|' + (o.castShadow ? 1 : 0) + '|' + lc;
    let L = groups.get(key); if (!L) groups.set(key, (L = { mat: o.material, cast: o.castShadow, items: [], lodSize: 0 }));
    L.items.push(o); L.lodSize = Math.max(L.lodSize, o.userData.lodSize || 0);
  });
  let saved = 0;
  for (const L of groups.values()) {
    if (L.items.length < 2) continue;
    const geos = [];
    for (const o of L.items) { const g = o.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); for (const k of Object.keys(g.morphAttributes || {})) delete g.morphAttributes[k]; geos.push(g); }
    let merged = null; try { merged = mergeGeometries(geos, false); } catch (e) { merged = null; }
    for (const g of geos) if (g !== merged) g.dispose();
    if (!merged) continue;
    const m = new THREE.Mesh(merged, L.mat); m.castShadow = L.cast; m.receiveShadow = true; m.userData.lodSize = L.lodSize; root.add(m); // [r7-lod]
    for (const o of L.items) remove.push(o); saved += L.items.length - 1;
  }
  for (const o of remove) { o.parent && o.parent.remove(o); }
  return saved;
}

// [r6-perf] Shadow proxy: the static, opaque shadow casters of a landmark merged into one position-only mesh per shadow
// side, drawn only by the shadow cameras (PROXY_LAYER). Each cascade then draws a landmark in 1-2 calls instead of one
// per material (about 1,600 -> 400 shadow draw calls at Sproul). The visible meshes stop casting. Alpha-tested,
// transparent, multi-material, instanced, skinned, custom-depth and detail/keep parts keep casting themselves, and
// animated landmarks (res.update) are skipped. Vertex data lives on the GPU only (freed from JS after upload).
const _pv = new THREE.Vector3();
function buildShadowProxy(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), m4 = new THREE.Matrix4();
  const sides = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.castShadow || o.customDepthMaterial || o.morphTargetInfluences || Array.isArray(o.material)) return;
    let p = o; while (p && p !== root) { if (!p.visible || (p.userData && (p.userData.detail || p.userData.keep))) return; p = p.parent; }
    const m = o.material, g = o.geometry;
    if (!m || !m.visible || m.transparent || m.alphaTest > 0 || m.alphaMap || m.alphaToCoverage || m.displacementMap || (m.clippingPlanes && m.clippingPlanes.length)) return;
    if (!g || !g.attributes.position || g.drawRange.start > 0 || g.drawRange.count !== Infinity) return;
    const side = m.shadowSide != null ? m.shadowSide : m.side === THREE.FrontSide ? THREE.BackSide : m.side === THREE.BackSide ? THREE.FrontSide : THREE.DoubleSide;
    let L = sides.get(side); if (!L) sides.set(side, (L = []));
    L.push(o);
  });
  let casters = 0, tris = 0;
  for (const [side, list] of sides) {
    let nv = 0, ni = 0; for (const o of list) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    if (!nv || !ni) continue;
    const pos = new Float32Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vb = 0, ib = 0;
    for (const o of list) {
      const g = o.geometry, pa = g.attributes.position; m4.multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < pa.count; i++) { _pv.fromBufferAttribute(pa, i).applyMatrix4(m4); pos[(vb + i) * 3] = _pv.x; pos[(vb + i) * 3 + 1] = _pv.y; pos[(vb + i) * 3 + 2] = _pv.z; }
      if (g.index) { const ia = g.index.array; for (let k = 0; k < g.index.count; k++) idx[ib + k] = ia[k] + vb; ib += g.index.count; }
      else { for (let k = 0; k < pa.count; k++) idx[ib + k] = vb + k; ib += pa.count; }
      vb += pa.count; o.castShadow = false; casters++;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    const free = function () { this.array = null; }; geo.attributes.position.onUpload(free); geo.index.onUpload(free);
    geo.computeBoundingBox = geo.computeBoundingSphere = () => {}; // bounds are final; never recompute from the freed arrays (grapple refine, culling)
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, shadowSide: side }));
    mesh.castShadow = true; mesh.receiveShadow = false; mesh.layers.set(PROXY_LAYER); mesh.name = 'shadowProxy'; mesh.userData.shadowProxy = true; mesh.raycast = () => {};
    root.add(mesh); tris += ni / 3;
  }
  return { casters, tris: Math.round(tris), proxies: sides.size };
}

// [r6-load] ---- disposal helpers for _unload
const TEX_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap', 'displacementMap', 'lightMap', 'specularMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenColorMap', 'sheenRoughnessMap', 'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap', 'anisotropyMap', 'specularIntensityMap', 'specularColorMap', 'gradientMap', 'matcap'];
function matTextures(m, out) {
  for (const k of TEX_SLOTS) { const t = m[k]; if (t && t.isTexture) out.add(t); }
  if (m.uniforms) for (const u of Object.values(m.uniforms)) { const v = u && u.value; if (v && v.isTexture) out.add(v); }
}
function forMats(o, fn) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m) fn(m); }
// the shared palette (materials.js) and its textures are never disposed
function keepSet(M) { const mats = new Set(), tex = new Set(); for (const m of Object.values(M || {})) if (m && m.isMaterial) { mats.add(m); matTextures(m, tex); } return { mats, tex }; }
// a texture is only disposed if three.js could upload it again (a later reload reusing a module-cached texture)
function reuploadable(t) {
  if (t.isRenderTargetTexture || t.isDepthTexture || t.isVideoTexture || t.isFramebufferTexture || (t.userData && t.userData.keep)) return false;
  const img = t.image; if (!img) return false;
  if (t.isDataTexture || t.isDataArrayTexture || t.isData3DTexture) return !!img.data;
  if (t.isCompressedTexture) return !!(t.mipmaps && t.mipmaps.length && t.mipmaps[0].data);
  if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) return img.width > 0; // closed bitmaps report 0
  return true; // canvas / image element
}
function disposeOwned(root, scene, keep) {
  const geos = new Set(), mats = new Set(), texs = new Set(), inst = [];
  root.traverse((o) => { if (o.geometry) geos.add(o.geometry); if (o.material) forMats(o, (m) => { mats.add(m); matTextures(m, texs); }); if (o.isInstancedMesh || o.isBatchedMesh) inst.push(o); });
  // what the rest of the scene still uses (root is already out of the scene): one traversal per unload
  const liveG = new Set(), liveM = new Set(), liveT = new Set();
  scene.traverse((o) => { if (o.geometry) liveG.add(o.geometry); if (o.material) forMats(o, (m) => { liveM.add(m); matTextures(m, liveT); }); });
  if (scene.environment && scene.environment.isTexture) liveT.add(scene.environment);
  if (scene.background && scene.background.isTexture) liveT.add(scene.background);
  for (const g of geos) if (!liveG.has(g)) g.dispose();
  for (const o of inst) if (o.dispose) o.dispose(); // instance matrix / colour buffers
  for (const m of mats) if (!liveM.has(m) && !keep.mats.has(m)) m.dispose();
  for (const t of texs) if (!liveT.has(t) && !keep.tex.has(t) && reuploadable(t)) t.dispose();
}

// [r6-load] streaming helpers. yieldTask lets a frame render between the heavy steps of a landmark load.
const yieldTask = () => new Promise((r) => setTimeout(r, 0));
// With KHR_parallel_shader_compile, compile a new landmark's programs in the background while it stays hidden (its
// stand-ins keep showing), so the first frame that draws it doesn't block on shader links. Without the extension
// three.js would compile synchronously anyway, so skip it then.
async function warmPrograms(obj, scene) {
  const B = typeof window !== 'undefined' && window.BSIM; const R = B && B.renderer, cam = B && B.camera;
  if (!R || !R.isWebGLRenderer || !cam || !R.compileAsync || !R.extensions || !R.extensions.has('KHR_parallel_shader_compile')) return;
  const vis = obj.visible; obj.visible = false;
  try { await Promise.race([R.compileAsync(obj, cam, scene), new Promise((r) => setTimeout(r, 5000))]); } catch (e) { /* draw it anyway */ } finally { obj.visible = vis; }
}
