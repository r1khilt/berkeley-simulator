// [r6-perf] Frame budget + adaptive quality for ordinary laptops (and software WebGL).
//  - probeGPU(): reads the unmasked renderer string from a throwaway context before the real renderer exists, so the
//    starting tier can be picked from the hardware (software / weak iGPU / laptop iGPU / discrete) and a failed or
//    software-only WebGL can be explained to the player.
//  - ShadowScheduler: cached cascades. The near cascade renders every frame (people, the player, wind); farther
//    cascades re-render every 2nd / 4th frame (staggered) or at once when the camera jumps or the sun moves. A stale
//    cascade keeps its own matrix, so its shadows stay put in world space; only its coverage lags by a few frames.
//    The far cascade only draws large casters (FAR_LAYER), not props, people or near-LOD trees whose shadows can't
//    reach it.
//  - GpuTimer: EXT_disjoint_timer_query_webgl2 frame timing where the browser exposes it.
//  - Governor: watches GPU time (or frame pacing) and walks a ladder of expensive-but-subtle knobs (shadow refresh,
//    shadow distance, tree LOD range, crowd/grass density, AO, bloom, MSAA) before it ever touches resolution; render
//    scale is the last rung and is upscaled with a bicubic filter in the post pass (src/render/post.js).
import * as THREE from 'three';

export const FAR_LAYER = 5;     // objects that also cast into the far shadow cascade (big casters)
export const PROXY_LAYER = 6;   // shadow-only proxies (merged landmark casters): drawn by shadow cameras, never by the main camera

// ---------------------------------------------------------------- GPU probe
const SOFT_RE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|warp|mesa offscreen|lavapipe/i;
export function probeGPU() {
  const out = { webgl2: false, webgl: false, renderer: '', vendor: '', software: false, caveat: false, cls: 'unknown' };
  const tryCtx = (type, attrs) => { try { const c = document.createElement('canvas'); c.width = c.height = 4; const gl = c.getContext(type, attrs); return gl; } catch (e) { return null; } };
  let gl = tryCtx('webgl2', { failIfMajorPerformanceCaveat: true, powerPreference: 'high-performance' });
  if (!gl) { gl = tryCtx('webgl2', { powerPreference: 'high-performance' }); if (gl) out.caveat = true; } // only a slow (software) context is available
  if (gl) out.webgl2 = true; else { gl = tryCtx('webgl'); out.webgl = !!gl; }
  if (gl) {
    try { const e = gl.getExtension('WEBGL_debug_renderer_info'); out.renderer = String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); out.vendor = String(e ? gl.getParameter(e.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)); } catch (e) {}
    out.software = out.caveat || SOFT_RE.test(out.renderer);
    out.cls = classify(out.renderer, out.software);
    try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch (e) {}
  }
  return out;
}
// coarse GPU class from the renderer string: 'sw' software, 'low' weak integrated, 'mid' laptop integrated (Apple M base,
// Iris Xe, Radeon iGPU), 'high' discrete / Apple Pro-Max, 'unknown'
export function classify(r, software) {
  if (software) return 'sw';
  const s = String(r || '').toLowerCase();
  if (!s) return 'unknown';
  if (/apple m\d+ (pro|max|ultra)/.test(s)) return 'high';
  if (/apple m\d|apple gpu/.test(s)) return 'mid';
  if (/nvidia|geforce|quadro|rtx|gtx|radeon rx|radeon pro|arc\(tm\)|intel\(r\) arc|\barc a\d/.test(s)) return 'high';
  if (/iris\(r\) xe|iris xe|radeon\(tm\) graphics|radeon graphics|radeon 7\d0m|radeon 6\d0m|vega/.test(s)) return 'mid';
  if (/intel|uhd|hd graphics|mali|adreno|powervr|iris/.test(s)) return 'low';
  return 'unknown';
}

// ---------------------------------------------------------------- cached / staggered shadow cascades
export class ShadowScheduler {
  constructor({ csm, camera }) {
    this.csm = csm; this.camera = camera; this.frame = 0; this.enabled = true;
    const n = csm.lights.length;
    this.intervals = n >= 3 ? [1, 2, 4] : n === 2 ? [1, 3] : [1];   // frames between refreshes per cascade (near -> far)
    this.scale = 1;                                                // governor stretches the far intervals (x2)
    this.last = csm.lights.map(() => ({ pos: new THREE.Vector3(1e9, 0, 0), dir: new THREE.Vector3(), q: new THREE.Quaternion(), age: 1e9 }));
    csm.lights.forEach((l, i) => {
      l.shadow.autoUpdate = false; l.shadow.needsUpdate = true;
      // shadow cameras: default objects + shadow-only proxies; the far cascade (when there are 2+) only big casters + proxies
      const far = n >= 2 && i === n - 1;
      l.shadow.camera.layers.mask = (far ? (1 << FAR_LAYER) : 1) | (1 << PROXY_LAYER);
    });
    this.forceAll = true;
  }
  invalidate() { this.forceAll = true; }
  update() {
    const lights = this.csm.lights, cam = this.camera; this.frame++;
    for (let i = 0; i < lights.length; i++) {
      const sh = lights[i].shadow, L = this.last[i];
      L.age++;
      let iv = this.intervals[i] ?? 4; if (i > 0) iv = Math.max(1, Math.round(iv * this.scale));
      // big jumps (teleport, map travel), a fast turn or a moving sun refresh at once
      const jump = cam.position.distanceToSquared(L.pos) > (i === 0 ? 25 : 400);
      const turned = i > 0 && cam.quaternion.angleTo(L.q) > (i === 1 ? 0.35 : 0.5);
      const sun = L.dir.dot(this.csm.lightDirection) < 0.99996; // ~0.5 deg
      const due = !this.enabled || iv <= 1 || L.age >= iv && ((this.frame + i) % iv === 0 || L.age >= iv * 2);
      if (this.forceAll || due || jump || turned || sun) {
        sh.needsUpdate = true; L.age = 0; L.pos.copy(cam.position); L.q.copy(cam.quaternion); L.dir.copy(this.csm.lightDirection);
      }
    }
    this.forceAll = false;
  }
}

// tag big shadow casters for the far cascade (call on any subtree that was added to the scene)
const _s = new THREE.Sphere();
export function tagFarCasters(root, minR = 3.5) {
  root.traverse((o) => {
    if (!o.isMesh || !o.castShadow || o.layers.isEnabled(FAR_LAYER) || o.userData.nearShadowOnly) return;
    if (o.isInstancedMesh || o.isSkinnedMesh) return;                     // props, trees, people: near cascades only
    const g = o.geometry; if (!g) return; if (!g.boundingSphere) g.computeBoundingSphere(); if (!g.boundingSphere) return;
    _s.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
    if (_s.radius >= minR) o.layers.enable(FAR_LAYER);
  });
}

// ---------------------------------------------------------------- GPU timer (EXT_disjoint_timer_query_webgl2)
export class GpuTimer {
  constructor(gl) {
    this.gl = gl; this.ext = null; this.pool = []; this.pending = []; this.ms = 0; this.samples = 0; this.active = null;
    try { this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2'); } catch (e) {}
    if (new URLSearchParams(location.search).get('gputimer') === '0') this.ext = null;
  }
  get ok() { return !!this.ext; }
  begin() { if (!this.ext || this.active || this.pending.length > 4) return; const q = this.pool.pop() || this.gl.createQuery(); this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q); this.active = q; }
  end() { if (!this.active) return; this.gl.endQuery(this.ext.TIME_ELAPSED_EXT); this.pending.push(this.active); this.active = null; }
  poll() { // returns the newest finished GPU frame time in ms (or null)
    if (!this.ext) return null; const gl = this.gl; let res = null;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    while (this.pending.length) {
      const q = this.pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT); this.pending.shift(); this.pool.push(q);
      if (!disjoint) { res = ns / 1e6; this.ms = res; this.samples++; }
    }
    return res;
  }
}

// ---------------------------------------------------------------- governor (adaptive quality)
// ctx: { renderer, csm, sched, trees, lm, life, grass, post, Q, setScale(s), dprMax }
// Rungs are applied cumulatively: level k = rungs[0..k-1] active. Ordered from least to most visible.
export class Governor {
  constructor(ctx) {
    this.ctx = ctx; this.level = 0; this.rungs = makeRungs(ctx).filter(Boolean); this.max = this.rungs.length;
    this.win = []; this.lastChange = performance.now(); this.blocked = new Map(); this.enabled = true; this.hist = [];
    this.target = 16.7; // ms: 60 fps
  }
  setLevel(k, why = '') {
    k = Math.max(0, Math.min(this.max, k)); if (k === this.level) return;
    const up = k > this.level;
    if (up) for (let i = this.level; i < k; i++) this.rungs[i].on(); else for (let i = this.level - 1; i >= k; i--) this.rungs[i].off();
    this.hist.push({ t: Math.round(performance.now() / 1000), from: this.level, to: k, why }); if (this.hist.length > 40) this.hist.shift();
    this.level = k; this.lastChange = performance.now(); this.win.length = 0;
  }
  // one sample per frame: cost = GPU ms when known, else frame interval
  sample(cost) {
    if (!this.enabled || !(cost > 0)) return;
    this.win.push(Math.min(cost, 200));
    const now = performance.now();
    if (this.win.length < 45 || now - this.lastChange < 1200) return;
    const s = this.win.slice().sort((a, b) => a - b); const p75 = s[Math.floor(s.length * 0.75)], p50 = s[s.length >> 1];
    this.win.length = 0; this.p75 = p75;
    const T = this.target;
    if (p75 > T * 1.12) { // over budget: step down 1 (2 when far over)
      this.blocked.set(this.level, now + 30000); // the level we just failed at is not retried for 30 s
      this.setLevel(this.level + (p75 > T * 1.8 ? 2 : 1), `p75 ${p75.toFixed(1)} ms`);
    } else if (p50 < T * 0.62 && this.level > 0 && now - this.lastChange > 4000) { // comfortably under: step up 1
      const k = this.level - 1; if ((this.blocked.get(k) || 0) < now) this.setLevel(k, `p50 ${p50.toFixed(1)} ms`);
    }
  }
  state() { return { level: this.level, max: this.max, rungs: this.rungs.slice(0, this.level).map((r) => r.name), p75: this.p75, hist: this.hist.slice(-8) }; }
}

function makeRungs(c) {
  const R = [];
  // 1. refresh the far shadow cascades half as often (invisible)
  if (c.sched && c.csm.lights.length > 1) R.push({ name: 'shadowCache', on() { c.sched.scale = 2; }, off() { c.sched.scale = 1; } });
  // [r7-lod] 1b. screen-size LOD bias x1.6 (terrain error, mid-city / prop / fleet / tree far LODs and landmark fine parts switch sooner; all sub-pixel to ~2 px)
  if (c.lod) R.push({ name: 'lodBias', on() { c.lod.govBias = 1.6; }, off() { c.lod.govBias = 1; } });
  // 2. tree LOD ranges x0.8 (hero/near meshes hand over a little sooner; same cross-fade)
  if (c.trees) { const base = c.trees.lod.slice(), heroK = c.trees.heroD / base[0]; R.push({ name: 'treeLod', on() { c.trees.lod = base.map((d) => d * 0.8); c.trees.heroD = c.trees.lod[0] * heroK; c.trees.update(c.camera, true); }, off() { c.trees.lod = base.slice(); c.trees.heroD = base[0] * heroK; c.trees.update(c.camera, true); } }); }
  // 3. shadow distance x0.75
  if (c.csm && c.csm.maxFar) { R.push({ name: 'shadowFar', on() { c.farMul.v = 0.75; }, off() { c.farMul.v = 1; } }); }
  // 4. MSAA 4x -> 2x in the HDR target
  if (c.post && c.post.cfg.msaa > 2) R.push({ name: 'msaa2', on() { c.post.setSamples(2); }, off() { c.post.setSamples(c.post.cfg.msaa); } });
  // 6. landmark ornament range 380 -> 220 m
  if (c.lm) { const b = c.lm.detailR ?? 380; R.push({ name: 'lmDetail', on() { c.lm.detailR = Math.min(b, 220); }, off() { c.lm.detailR = b; } }); } // [r6-fast] restore the tier's own range
  // 7. ambient occlusion off (biggest post pass)
  if (c.post && c.post.cfg.ao) R.push({ name: 'ao', on() { c.post.U.uUseAO.value = 0; c.post.aoOff = true; }, off() { c.post.U.uUseAO.value = 1; c.post.aoOff = false; } });
  // 8. shadow distance x0.55, far shadows refresh x3
  if (c.csm && c.csm.maxFar) R.push({ name: 'shadowFar2', on() { c.farMul.v = 0.55; if (c.sched) c.sched.scale = 3; }, off() { c.farMul.v = 0.75; if (c.sched) c.sched.scale = 2; } });
  // 9. bloom off (day bloom is very subtle)
  if (c.post && c.post.cfg.bloom) R.push({ name: 'bloom', on() { c.post.bloomOff = true; c.post.U.uUseBloom.value = 0; }, off() { c.post.bloomOff = false; c.post.U.uUseBloom.value = 1; } });
  // 10-11. last resort: render scale 0.85 / 0.72 (bicubic upscale in the post pass; HUD stays crisp)
  const ms = c.minScale ?? 0.72;
  if (c.setScale && ms <= 0.85) R.push({ name: 'scale85', on() { c.setScale(0.85); }, off() { c.setScale(1); } });
  if (c.setScale && ms <= 0.72) R.push({ name: 'scale72', on() { c.setScale(0.72); }, off() { c.setScale(0.85); } });
  return R;
}

// ---------------------------------------------------------------- notices
const NOTE_CSS = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:60;max-width:min(560px,92vw);background:rgba(20,22,26,.92);color:#f2f2f2;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;padding:14px 16px 12px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.35);';
export function softwareNotice(info, switched = true) {
  try { if (localStorage.getItem('bsim.swNotice') === '1') return; localStorage.setItem('bsim.swNotice', '1'); } catch (e) {}
  const d = document.createElement('div'); d.setAttribute('role', 'status'); d.style.cssText = NOTE_CSS;
  const mac = /Mac/.test(navigator.platform || navigator.userAgent);
  d.innerHTML = `<b style="display:block;margin-bottom:4px">Graphics acceleration is off</b>Your browser is drawing the campus on the CPU${info && info.renderer ? ` (${String(info.renderer).replace(/[<>&]/g, '').slice(0, 60)})` : ''}${switched ? ", so we've switched to a lighter look" : ''}. For smooth, full-quality graphics, open <code style="background:#ffffff1a;padding:1px 5px;border-radius:4px">chrome://settings/system</code>, turn on <i>Use graphics acceleration when available</i>, then relaunch ${mac ? 'Chrome' : 'the browser'}.<div style="text-align:right;margin-top:8px"><button style="font:inherit;color:#111;background:#f2f2f2;border:0;border-radius:7px;padding:5px 14px;cursor:pointer">Got it</button></div>`;
  d.querySelector('button').onclick = () => d.remove(); document.body.appendChild(d); setTimeout(() => d.isConnected && d.remove(), 30000);
}
export function noWebGLMessage(info) {
  const mac = /Mac/.test(navigator.platform || navigator.userAgent), win = /Win/.test(navigator.platform || navigator.userAgent);
  return `3D graphics aren't available in this browser right now${info && info.caveat === false && !info.webgl2 ? '' : ''}. Berkeley Simulator needs WebGL 2, and current Chrome no longer draws WebGL in software when graphics acceleration is off. ` +
    `Open chrome://settings/system, turn on "Use graphics acceleration when available" and relaunch${win ? '' : mac ? ' Chrome' : ''}. If it's already on, check chrome://gpu: your graphics driver may be blocked or need an update.`;
}
