// rse-finish: a "finished house" pass on top of greek-kit (batch refine-south-east: Piedmont / Channing / Warring Greek row).
// rseHouse(ctx, S, F) = greekHouse(ctx, S) + everyday details real Berkeley chapter houses have and the bare kit lacked:
//   gutters + downspouts on every pitched eave, basement windows / vents in tall slope plinths, stoops with handrails for doors
//   that would otherwise float, entry sconces (glow at night), an address plaque, a front walk to the street, foundation
//   planting with mulch beds, and Berkeley's black/green/blue carts in the side yard.
// Glazing uses the shared M.windowNight (the shared window material; its shader upgrade applies to these houses automatically).
// F (all optional): { number:'2723', gutter:'#d9d4c8', spouts:true, walk:true|false, plants:true, carts:true|false, stoops:true,
//   plinthWin:true, sconces:true, plaque:true, shrub:'#3f5a2e', bed:'#4a3a2c', walkMat, walkFrom:[u,v], walkTo:[u,v] }
import * as THREE from 'three';
import { greekHouse, hmat } from './greek-kit.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _m = new Map();
function cached(key, mk) { if (!_m.has(key)) _m.set(key, mk()); return _m.get(key); }
function propsMat() { return cached('props', () => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.05 }); m.name = 'rse-props'; return m; }); }
function foliageMat(hex) {
  return cached('fol:' + hex, () => {
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
    let s = 99; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, N, N);
    for (let k = 0; k < 1400; k++) { const v = 90 + r() * 165; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(r() * N, r() * N, 1.5 + r() * 3, 1 + r() * 2, r() * 3, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), map: t, roughness: 0.95, flatShading: true }); m.name = 'rse-foliage-' + hex; return m;
  });
}
function plaqueMat(text) {
  return cached('plq:' + text, () => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = '#1d1f22'; g.fillRect(0, 0, 256, 96); g.strokeStyle = '#b8a77a'; g.lineWidth = 5; g.strokeRect(6, 6, 244, 84);
    g.fillStyle = '#efe6cf'; g.font = 'bold 64px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 52);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }); m.name = 'rse-plaque-' + text; return m;
  });
}
const col = (hex) => new THREE.Color(hex);
// a box (building frame) with a flat vertex colour, for the merged props mesh
function cbox(list, c, u0, y0, v0, u1, y1, v1) {
  const g = new THREE.BoxGeometry(Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0)).toNonIndexed(); g.translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
  const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); list.push(g); return g;
}
function ccyl(list, c, u, y0, v, r, h, seg = 8, axis = 'y') {
  const g = new THREE.CylinderGeometry(r, r, h, seg).toNonIndexed();
  if (axis === 'u') g.rotateZ(Math.PI / 2); else if (axis === 'v') g.rotateX(Math.PI / 2);
  g.translate(u, axis === 'y' ? y0 + h / 2 : y0, v);
  const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); list.push(g); return g;
}

// The shared textures are already coloured (brick and tile are red, wood is brown, asphalt shingle is mid grey), and greek-kit
// multiplies them by the spec colour, so ['brick', '#8e4a35'] rendered a near-black maroon. Convert every brick / tile / wood /
// roof spec in S to the tint that makes the textured result average to the hex the author asked for.
const TEX_AVG = { brick: [140, 64, 47], tile: [165, 80, 53], wood: [102, 71, 48], roof: [150, 150, 150] };
function normHex(kind, hex) {
  const a = TEX_AVG[kind]; const h = new THREE.Color(hex).getHexString(); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const k = (v, m) => Math.max(0, Math.min(255, Math.round(255 * v / m)));
  return '#' + [k(r, a[0]), k(g, a[1]), k(b, a[2])].map((v) => v.toString(16).padStart(2, '0')).join('');
}
export function normSpecs(o, seen = new Set()) {
  if (!o || typeof o !== 'object' || seen.has(o) || o.isMaterial) return o; seen.add(o);
  if (Array.isArray(o) && o.length === 2 && typeof o[0] === 'string' && typeof o[1] === 'string' && TEX_AVG[o[0]] && /^#/.test(o[1])) return [o[0], normHex(o[0], o[1])];
  if (Array.isArray(o)) return o.map((x) => normSpecs(x, seen));
  const out = {}; for (const [k, v] of Object.entries(o)) out[k] = typeof v === 'function' ? v : normSpecs(v, seen); return out;
}

export function rseHouse(ctx, S0, F = {}) {
  const S = F.rawColors ? S0 : normSpecs(S0);
  const S2 = Object.assign({}, S, {
    glass: S.glass || ctx.M.windowNight,
    extra: (api) => {
      const m0 = api.mat; api.mat = (s) => m0(Array.isArray(s) && !F.rawColors ? normSpecs(s) : s);
      const props = []; api.props = props;
      api.pbox = (hex, u0, y0, v0, u1, y1, v1) => cbox(props, col(hex), u0, y0, v0, u1, y1, v1); // vertex-coloured prop box (one draw call)
      api.pcyl = (hex, u, y0, v, r, h, seg, axis) => ccyl(props, col(hex), u, y0, v, r, h, seg, axis);
      if (S.extra) S.extra(api);
      try { finishPass(api, S, F); } catch (e) { console.warn('rse-finish failed', e); }
      if (props.length) { const g = mergeGeometries(props, false); if (g) { const m = new THREE.Mesh(g, propsMat()); m.castShadow = m.receiveShadow = true; m.userData.detail = true; api.K.extra.push(m); } }
    },
  });
  return greekHouse(ctx, S2);
}

function inBlocks(blocks, u, v, pad = 0, except = null, minTop = -Infinity) {
  return blocks.some((b) => b !== except && u > b.u0 - pad && u < b.u1 + pad && v > b.v0 - pad && v < b.v1 + pad && (b.ridgeY ?? b.eave) > minTop);
}

export function finishPass(api, S, F) {
  const { K, M, ctx, blocks, faceRun, colliders, walkables } = api;
  const props = api.props || [];
  const gutterHex = F.gutter || '#d8d3c6'; const gC = col(gutterHex);
  const gutM = cached('gut:' + gutterHex, () => { const m = new THREE.MeshStandardMaterial({ color: col(gutterHex), roughness: 0.45, metalness: 0.25 }); m.name = 'rse-gutter'; return m; });
  const porches = S.porches || []; const doors = S.doors || [];
  const onPorch = (bi, f, s) => porches.some((p) => p.block === bi && p.face === f && s > p.s0 - 0.6 && s < p.s1 + 0.6);
  // ---------------- gutters + downspouts ----------------
  if (F.spouts !== false) for (const b of blocks) {
    const r = b.roof; if (!r || r.type === 'flat') continue;
    const ov = r.ov ?? S.ov ?? 0.5; const yE = b.eave; const hw = (r.axis === 'u' ? b.v1 - b.v0 : b.u1 - b.u0) / 2;
    const rise = (b.ridgeY ?? yE + 2) - yE;
    const eaves = []; // [face, yGutter]
    if (r.type === 'hip') { for (const f of ['S', 'N', 'E', 'W']) eaves.push([f, yE - 0.2]); }
    else { const yF = yE - ov * rise / Math.max(0.5, hw); for (const f of (r.axis === 'u' ? ['S', 'N'] : ['E', 'W'])) eaves.push([f, yF - 0.22]); }
    for (const [f, yg] of eaves) {
      const R = faceRun(b, f); const ext = r.type === 'hip' ? ov : ov; // along-run extension past the wall corners
      // split the gutter where another (taller) block or the run's own neighbour covers it
      const segs = []; let cur = null; const step = 0.4;
      for (let s = -ext; s <= R.L + ext + 1e-6; s += step) {
        const q = R.at(Math.min(s, R.L + ext), ov + 0.08); const blocked = inBlocks(blocks, q[0], q[1], 0.05, b, yg);
        if (!blocked) { if (!cur) cur = [s, s]; cur[1] = Math.min(s, R.L + ext); } else if (cur) { segs.push(cur); cur = null; }
      }
      if (cur) segs.push(cur);
      for (const [a, z] of segs) {
        if (z - a < 1.0) continue;
        // K-style gutter: a box with a lip, just outside the fascia
        K.rbox(R, gutM, a, yg - 0.17, ov + 0.02, z, yg, ov + 0.17, { detail: true });
        K.rbox(R, gutM, a, yg - 0.01, ov + 0.15, z, yg + 0.025, ov + 0.2, { detail: true });
        // downspouts at the gutter ends that sit near a wall corner (and one mid-run on long eaves)
        const cand = [a + 0.25, z - 0.25]; if (z - a > 16) cand.push((a + z) / 2);
        for (let s of cand) {
          s = Math.max(0.15, Math.min(R.L - 0.15, s)); // bring it back onto the wall line
          const foot = R.at(s, 0.1); if (inBlocks(blocks, foot[0], foot[1], 0.05, b)) continue;
          if (onPorch(b.i, f, s)) continue;
          const gy = K.g(foot[0], foot[1]);
          if (yg - 0.6 - gy < 1.5) continue;
          K.rbox(R, gutM, s - 0.045, gy + 0.25, 0.04, s + 0.045, yg - 0.55, 0.13, { detail: true }); // pipe
          // offset (elbows) from the gutter back to the wall
          const g = new THREE.BoxGeometry(0.08, 0.08, Math.hypot(ov - 0.05, 0.4)); g.rotateX(Math.atan2(0.4, ov - 0.05)); g.translate(s, yg - 0.35, (ov + 0.1 + 0.085) / 2); K.addRun(R, gutM, g, { detail: true });
          K.rbox(R, gutM, s - 0.05, gy + 0.05, 0.04, s + 0.05, gy + 0.3, 0.32, { detail: true }); // kick-out shoe
          const sp = R.at(s, 0.55); cbox(props, col('#9b968c'), ...[sp[0] - 0.18, gy - 0.05, sp[1] - 0.25, sp[0] + 0.18, gy + 0.05, sp[1] + 0.25]); // splash block
          for (const yy of [gy + 1.2, (gy + yg) / 2, yg - 1.0]) if (yy < yg - 0.7) K.rbox(R, gutM, s - 0.06, yy, 0.0, s + 0.06, yy + 0.04, 0.15, { detail: true }); // straps
        }
      }
    }
  }
  // ---------------- basement windows / vents in tall plinths ----------------
  if (F.plinthWin !== false) {
    const bay = (S.win && S.win.bay) || 2.8; const frame = M.blackPaint;
    for (const b of blocks) {
      if (b.noWalls) continue;
      for (const f of ['S', 'E', 'N', 'W']) {
        const R = faceRun(b, f); const n = Math.floor(R.L / bay); if (n < 1) continue;
        for (let k = 0; k < n; k++) {
          const s = (k + 0.5) * R.L / n; const q = R.at(s, 0.5); if (inBlocks(blocks, q[0], q[1], 0.1, b)) continue;
          if (onPorch(b.i, f, s)) continue; if (doors.some((d) => d.block === b.i && d.face === f && Math.abs(d.s - s) < d.w / 2 + 1.2)) continue;
          const gl = Math.max(K.g(...R.at(s - 0.6, 0.3)), K.g(...R.at(s + 0.6, 0.3)));
          const top = b.f0 - 0.4, bot = Math.max(gl + 0.25, top - 0.85); if (top - bot < 0.45) continue;
          const w = top - bot > 0.7 ? 1.1 : 0.9;
          K.rbox(R, M.windowNight, s - w / 2, bot, 0.05, s + w / 2, top, 0.07);
          K.rbox(R, frame, s - w / 2 - 0.07, bot - 0.07, 0.06, s + w / 2 + 0.07, bot, 0.14); K.rbox(R, frame, s - w / 2 - 0.07, top, 0.06, s + w / 2 + 0.07, top + 0.07, 0.12);
          for (const ss of [s - w / 2 - 0.07, s + w / 2]) K.rbox(R, frame, ss, bot, 0.06, ss + 0.07, top, 0.12);
          K.rbox(R, frame, s - 0.02, bot, 0.07, s + 0.02, top, 0.1, { detail: true });
          if (top - bot > 0.6) for (let i = 1; i < 4; i++) K.rbox(R, frame, s - w / 2, bot + (top - bot) * i / 4 - 0.01, 0.075, s + w / 2, bot + (top - bot) * i / 4 + 0.01, 0.095, { detail: true }); // security bars
        }
      }
    }
  }
  // ---------------- stoops for doors that are above grade and not on a porch ----------------
  const stoneM = F.stoopMat ? api.mat(F.stoopMat) : M.concrete; const railM = M.iron;
  const entries = []; // [u,v,outward normal u,v, run, s, b]
  for (const d of doors) {
    const b = blocks[d.block]; const R = faceRun(b, d.face); const yD = d.y ?? b.f0;
    const porch = porches.find((p) => p.block === d.block && p.face === d.face && d.s > p.s0 - 0.2 && d.s < p.s1 + 0.2);
    if (porch) { const dp = porch.depth ?? 2.4; const st = porch.stepS ?? (porch.s0 + porch.s1) / 2; entries.push({ R, s: st, d0: dp, b, f: d.face, door: d, porch }); continue; }
    const gl = K.g(...R.at(d.s, 0.6)); const hgt = yD - gl;
    entries.push({ R, s: d.s, d0: hgt > 0.15 ? 1.3 + Math.max(1, Math.round(hgt / 0.17)) * 0.29 : 0.3, b, f: d.face, door: d });
    if (F.stoops === false || d.noStoop || hgt < 0.15) continue;
    const w = Math.max(1.5, d.w + 0.7), lw = 1.3; const n = Math.max(1, Math.round(hgt / 0.17)); const run = n * 0.29;
    K.rbox(R, stoneM, d.s - w / 2, gl - 0.6, 0, d.s + w / 2, yD - 0.02, lw); // landing
    walkables.push(K.walkPoly([R.at(d.s - w / 2, 0), R.at(d.s + w / 2, 0), R.at(d.s + w / 2, lw), R.at(d.s - w / 2, lw)], yD - 0.02));
    const A = R.at(d.s - w / 2 + 0.1, lw), B = R.at(d.s + w / 2 - 0.1, lw + run);
    const uu = [A[0], B[0]].sort((x, y) => x - y), vv = [A[1], B[1]].sort((x, y) => x - y);
    const dir = d.face === 'S' ? '-v' : d.face === 'N' ? '+v' : d.face === 'E' ? '-u' : '+u';
    walkables.push(K.stairs(stoneM, uu[0], vv[0], uu[1], vv[1], gl, yD - 0.02, dir, n));
    if (hgt > 0.5) for (const sx of [-1, 1]) { // cheek walls + iron handrails
      const s2 = d.s + sx * (w / 2 - 0.05); K.rbox(R, stoneM, s2 - 0.1, gl - 0.4, 0, s2 + 0.1, yD + 0.1, lw + run);
      const p0 = R.at(s2, 0.15), p1 = R.at(s2, lw), p2 = R.at(s2, lw + run);
      api.beam(railM, [p0[0], yD + 0.9, p0[1]], [p1[0], yD + 0.9, p1[1]], 0.045, 0.045, { detail: true });
      api.beam(railM, [p1[0], yD + 0.9, p1[1]], [p2[0], gl + 0.95, p2[1]], 0.045, 0.045, { detail: true });
      for (const [p, y0] of [[p1, yD + 0.1], [p2, gl + 0.15]]) K.box(railM, p[0] - 0.025, y0, p[1] - 0.025, p[0] + 0.025, y0 + 0.82, p[1] + 0.025, { detail: true });
    }
  }
  // ---------------- sconces + address plaque at the main entry ----------------
  const main = entries[0];
  if (main) {
    const d = main.door, R = main.R, b = main.b; const yD = d.y ?? b.f0; const lampM = M.lampGlow; const blk = M.blackPaint;
    if (F.sconces !== false) for (const sx of [-1, 1]) {
      const s = d.s + sx * (d.w / 2 + 0.42); const y = yD + 1.75;
      K.rbox(R, blk, s - 0.06, y - 0.05, 0.0, s + 0.06, y + 0.12, 0.08, { detail: true });
      K.rbox(R, lampM, s - 0.08, y - 0.22, 0.06, s + 0.08, y + 0.08, 0.22, { detail: true });
      K.rbox(R, blk, s - 0.1, y + 0.08, 0.04, s + 0.1, y + 0.13, 0.24, { detail: true });
      K.rbox(R, blk, s - 0.06, y - 0.27, 0.08, s + 0.06, y - 0.22, 0.2, { detail: true });
    }
    const num = F.number;
    if (num && F.plaque !== false) {
      const pm = plaqueMat(String(num)); const w = 0.18 * String(num).length + 0.16, h = 0.24;
      const s = d.s + d.w / 2 + 0.42; const y = yD + 1.15;
      const g = new THREE.PlaneGeometry(w, h); g.translate(s, y, 0.02); g.applyMatrix4(R.m); K.add(pm, g, { uvMode: 'keep' });
    }
  }
  // ---------------- front walk to the street ----------------
  const walkM = F.walkMat ? api.mat(F.walkMat) : M.concrete;
  const ctxWays = (ctx.packet && ctx.packet.context) || [];
  const toUV = (x, z) => K.uv(x, z);
  const roads = ctxWays.filter((c) => c.tags && /residential|tertiary|secondary|primary|unclassified|living_street|service/.test(c.tags.highway || '')).map((c) => ({ pts: c.pts.map(([x, z]) => toUV(x, z)), w: +(c.tags.width || 0) || (/(secondary|tertiary|primary)/.test(c.tags.highway) ? 12 : /service/.test(c.tags.highway) ? 5 : 9) }));
  const foot = ctxWays.filter((c) => c.tags && /footway|path|steps|pedestrian/.test(c.tags.highway || '')).map((c) => c.pts.map(([x, z]) => toUV(x, z)));
  function rayHit(o, dvec) { // nearest road crossing along ray o + t*d
    let best = null;
    for (const r of roads) for (let i = 0; i < r.pts.length - 1; i++) {
      const [a, c] = [r.pts[i], r.pts[i + 1]]; const ex = c[0] - a[0], ez = c[1] - a[1]; const den = dvec[0] * ez - dvec[1] * ex; if (Math.abs(den) < 1e-6) continue;
      const t = ((a[0] - o[0]) * ez - (a[1] - o[1]) * ex) / den, k = ((a[0] - o[0]) * dvec[1] - (a[1] - o[1]) * dvec[0]) / den;
      if (t > 0 && k >= 0 && k <= 1 && (!best || t < best.t)) best = { t, w: r.w };
    }
    return best;
  }
  function ribbon(mat, pts, w, lift = 0.035) { // draped strip along a polyline in building frame
    const P = []; for (let i = 0; i < pts.length - 1; i++) { const [a, c] = [pts[i], pts[i + 1]]; const L = Math.hypot(c[0] - a[0], c[1] - a[1]); const n = Math.max(1, Math.ceil(L / 0.6)); for (let k = 0; k < n; k++) P.push([a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n]); }
    P.push(pts[pts.length - 1]); if (P.length < 2) return;
    const pos = []; const side = (i) => { const a = P[Math.max(0, i - 1)], c = P[Math.min(P.length - 1, i + 1)]; const L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; return [-(c[1] - a[1]) / L * w / 2, (c[0] - a[0]) / L * w / 2]; };
    const Lp = [], Rp = []; for (let i = 0; i < P.length; i++) { const sd = side(i); const l = [P[i][0] + sd[0], P[i][1] + sd[1]], r = [P[i][0] - sd[0], P[i][1] - sd[1]]; Lp.push([l[0], K.g(l[0], l[1]) + lift, l[1]]); Rp.push([r[0], K.g(r[0], r[1]) + lift, r[1]]); }
    for (let i = 0; i < P.length - 1; i++) {
      const a = Lp[i], b = Rp[i], c = Rp[i + 1], d = Lp[i + 1];
      pos.push(...a, ...b, ...c, ...a, ...c, ...d); // top (wound for +y)
      for (const [p, q] of [[a, d], [c, b]]) pos.push(p[0], p[1], p[2], p[0], p[1] - 0.18, p[2], q[0], q[1] - 0.18, q[2], p[0], p[1], p[2], q[0], q[1] - 0.18, q[2], q[0], q[1], q[2]); // skirts
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    // make sure top faces point up
    const nrm = g.attributes.normal; let up = 0; for (let i = 0; i < 3; i++) up += nrm.getY(i); if (up < 0) { const p = g.attributes.position; for (let i = 0; i < p.count; i += 3) { const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1); p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, x, y, z); } g.computeVertexNormals(); }
    K.add(mat, g);
  }
  if (main && F.walk !== false) {
    const R = main.R; const st = F.walkFrom || R.at(main.s, main.d0); const dv = [R.n[0], R.n[1]];
    let end = F.walkTo || null;
    if (!end) { const h = rayHit(st, dv); const t = h ? Math.max(0, h.t - h.w / 2 - 2.2) : 5; end = [st[0] + dv[0] * t, st[1] + dv[1] * t]; }
    const len = Math.hypot(end[0] - st[0], end[1] - st[1]);
    const nearFoot = foot.some((pl) => pl.some((p) => { const t = ((p[0] - st[0]) * dv[0] + (p[1] - st[1]) * dv[1]); if (t < -1 || t > len + 1) return false; const q = [st[0] + dv[0] * t, st[1] + dv[1] * t]; return Math.hypot(p[0] - q[0], p[1] - q[1]) < 1.6; }));
    if (len > 0.8 && len < 45 && (!nearFoot || F.walk === true)) ribbon(walkM, [st, end], F.walkW || 1.4);
  }
  // ---------------- foundation planting along the front ----------------
  if (S.front && F.plants !== false) {
    const b = blocks[S.front.block ?? 0]; const f = S.front.face; const R = faceRun(b, f);
    const fm = foliageMat(F.shrub || '#4a6439');
    let seed = 17; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const busy = (s) => onPorch(b.i, f, s) || doors.some((d) => d.block === b.i && d.face === f && Math.abs(d.s - s) < d.w / 2 + 1.0) || (main && main.b === b && main.f === f && Math.abs(main.s - s) < 1.3);
    let s = 0.4; const spans = []; let cur = null;
    for (; s < R.L - 0.3; s += 0.5) { const q = R.at(s, 0.6); const ok = !busy(s) && !inBlocks(blocks, q[0], q[1], 0.05, b); if (ok) { if (!cur) cur = [s, s]; cur[1] = s; } else if (cur) { spans.push(cur); cur = null; } }
    if (cur) spans.push(cur);
    for (const [a, z] of spans) {
      if (z - a < 1.2) continue;
      { const p0 = R.at(a, 0.05), p1 = R.at(z, 1.05); const gy = Math.min(K.g(...R.at(a, 0.5)), K.g(...R.at(z, 0.5))); cbox(props, col(F.bed || '#3b2f25'), Math.min(p0[0], p1[0]), gy - 0.3, Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(K.g(...R.at(a, 0.5)), K.g(...R.at(z, 0.5))) + 0.06, Math.max(p0[1], p1[1])); }
      const n = Math.max(1, Math.round((z - a) / 1.25));
      for (let k = 0; k < n; k++) {
        const ss = a + (z - a) * (k + 0.5) / n + (rnd() - 0.5) * 0.3; const q = R.at(ss, 0.5 + rnd() * 0.15); const gy = K.g(q[0], q[1]);
        const rr = 0.38 + rnd() * 0.32; const hh = rr * (1.1 + rnd() * 0.7);
        const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { const j = 0.82 + 0.36 * (((i * 7919 + k * 104729) % 97) / 97); p.setXYZ(i, p.getX(i) * rr * j, Math.max(-0.35, p.getY(i)) * hh * j, p.getZ(i) * rr * j); }
        g.translate(q[0], gy + hh * 0.62, q[1]); K.add(fm, g, { detail: false });
      }
    }
  }
  // ---------------- carts in the side yard ----------------
  if (S.front && F.carts !== false) {
    const b = blocks[S.front.block ?? 0]; const f = S.front.face; const R = faceRun(b, f);
    const sideF = F.cartSide || ({ S: 'E', E: 'N', N: 'W', W: 'S' })[f]; const RS = faceRun(b, sideF);
    const sAt = RS.L - 1.6; const cs = ['#1f2326', '#2f6b3a', '#2a4f8f'];
    for (let k = 0; k < 3; k++) {
      const s = sAt - k * 0.72; const q = RS.at(s, 0.55); if (inBlocks(blocks, q[0], q[1], 0.1, b)) continue; const gy = K.g(q[0], q[1]);
      const c = col(cs[k]); const p0 = RS.at(s - 0.29, 0.25), p1 = RS.at(s + 0.29, 0.95);
      const uu = [p0[0], p1[0]].sort((x, y) => x - y), vv = [p0[1], p1[1]].sort((x, y) => x - y);
      cbox(props, c, uu[0], gy + 0.08, vv[0], uu[1], gy + 1.0, vv[1]);
      cbox(props, c.clone().multiplyScalar(0.8), uu[0] - 0.03, gy + 1.0, vv[0] - 0.03, uu[1] + 0.03, gy + 1.06, vv[1] + 0.03);
      cbox(props, col('#151515'), uu[0] + 0.02, gy, vv[0] + 0.02, uu[1] - 0.02, gy + 0.12, vv[1] - 0.02);
    }
  }
}
