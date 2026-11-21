// Streams hand-modelled landmark modules in and out by distance. Procedural stand-ins show until a landmark is built.
import * as THREE from 'three';
import { materials, U, boxUV } from '../materials.js';
import { loadJSON } from '../data.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { applyInteriorGlass } from './interiors.js'; // furnished rooms behind landmark window glass
const modules = import.meta.glob('../landmarks/*.js');
export const normId = (s) => String(s).replace(/^way\//, 'w/').replace(/^relation\//, 'r/').replace(/^node\//, 'n/');
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
    let best = null, bd = Infinity;
    for (const l of this.items) {
      const d = Math.hypot(l.anchor.x - camPos.x, l.anchor.z - camPos.z) - (l.r || 0);
      if (l.state === 'ready' && !l.always && d > this.unloadR) { this._unload(l); return; }
      if (l.state === 'idle' && (d < this.loadR || l.always) && d < bd) { bd = d; best = l; }
    }
    const now = performance.now();
    if (best && now - (this.lastLoad || 0) > 140) { this.busy = true; this.lastLoad = now; this._load(best).finally(() => { this.busy = false; this.lastLoad = performance.now(); }); }
  }
  async _load(l) {
    l.state = 'loading';
    try {
      const [mod, packet] = await Promise.all([modules[`../landmarks/${l.id}.js`](), loadJSON(`landmarks/${l.id}.json.gz`)]);
      const a = packet.anchor; const heightAt = this.heightAt;
      const groundAt = (x, z) => heightAt(a.x + x, a.z + z) - a.y;
      const res = await mod.build({ THREE, M: this.M, U, boxUV, groundAt, footprints: packet.footprints, anchor: a, packet });
      const obj = res.object3d; obj.position.set(a.x, a.y, a.z); obj.name = 'landmark:' + l.id;
      if (!res.update) mergeStatic(obj);
      if (!/[?      try { applyInteriorGlass(obj,]nointerior/.test(location.search)) try { applyInteriorGlass(obj, { id: l.id, name: (mod.info && mod.info.name) || l.name, tag: packet.footprints && packet.footprints[0] && packet.footprints[0].tags && packet.footprints[0].tags.building, M: this.M }); } catch (e) { console.warn('interiors', l.id, e); } // window interiors
      obj.traverse((o) => { if (o.isMesh) { if (o.castShadow !== false) o.castShadow = true; o.receiveShadow = true; } });
      const details = []; obj.traverse((o) => { if (o.userData && o.userData.detail) { details.push(o); o.traverse((m) => { if (m.isMesh) m.castShadow = false; }); } });
      this.setupMaterials && this.setupMaterials(obj);
      this.scene.add(obj);
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
      l.inter = (res.interactions || []).map((it) => ({ ...it, landmark: l.id, pos: [it.pos[0] + a.x, it.pos[1] + a.y, it.pos[2] + a.z], teleport: it.teleport ? [it.teleport[0] + a.x, it.teleport[1] + a.y, it.teleport[2] + a.z] : null }));
      l.anchors = {}; for (const [k, v] of Object.entries(res.anchors || {})) if (Array.isArray(v)) l.anchors[k] = [v[0] + a.x, v[1] + a.y, v[2] + a.z];
      Object.assign(l, { obj, res, details, packetAnchor: a, info: mod.info || {} });
      this.standins && this.standins.setHidden(l.replaces, true);
      if (this.physics.suspendTag) for (const id of l.replaces) this.physics.suspendTag(id, true); // new-buildings: the hidden stand-in's walls go too
      l.state = 'ready'; this.placed.push(l);
      this.onLoaded && this.onLoaded(l);
    } catch (e) { console.warn('landmark failed', l.id, e); l.state = 'failed'; }
  }
  _unload(l) {
    this.scene.remove(l.obj);
    l.obj.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { o.geometry && o.geometry.dispose(); } });
    this.physics.removeTag('lm:' + l.id);
    if (l.res && l.res.ownsCollision && this.physics.muteTag) for (const id of l.replaces) this.physics.muteTag(id, false); // interiors-cafe
    this.standins && this.standins.setHidden(l.replaces, false);
    if (this.physics.suspendTag) for (const id of l.replaces) this.physics.suspendTag(id, false);
    this.placed = this.placed.filter((x) => x !== l);
    l.state = 'idle'; l.obj = null; l.res = null; l.details = [];
    this.onUnloaded && this.onUnloaded(l);
  }
  frame(dt, env) {
    const cp = env.camera.position;
    for (const l of this.placed) {
      const d = Math.hypot(l.anchor.x - cp.x, l.anchor.z - cp.z);
      const show = d < 380 + (l.r || 0);
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
    const key = o.material.uuid + '|' + sig + '|' + (o.castShadow ? 1 : 0);
    let L = groups.get(key); if (!L) groups.set(key, (L = { mat: o.material, cast: o.castShadow, items: [] }));
    L.items.push(o);
  });
  let saved = 0;
  for (const L of groups.values()) {
    if (L.items.length < 2) continue;
    const geos = [];
    for (const o of L.items) { const g = o.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); for (const k of Object.keys(g.morphAttributes || {})) delete g.morphAttributes[k]; geos.push(g); }
    let merged = null; try { merged = mergeGeometries(geos, false); } catch (e) { merged = null; }
    for (const g of geos) if (g !== merged) g.dispose();
    if (!merged) continue;
    const m = new THREE.Mesh(merged, L.mat); m.castShadow = L.cast; m.receiveShadow = true; root.add(m);
    for (const o of L.items) remove.push(o); saved += L.items.length - 1;
  }
  for (const o of remove) { o.parent && o.parent.remove(o); }
  return saved;
}
