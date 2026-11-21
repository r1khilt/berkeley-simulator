// b06p-garage.js: parametric open-deck parking-structure kit for the b06p batch (Ellsworth, Bancroft, Underhill,
// Lower Hearst, Upper Hearst, Stadium garage). Built on classic-kit's Kit: author in a building frame (u along the
// main axis, v across, y up), merged per material, rotated once into the landmark frame.
// Pieces: open façades (precast edge beams, guard panels, columns, real openings, screens/fins), interior decks with
// columns, ceiling lights and parked cars, stair/elevator towers, exterior steel stairs, roof parking, a turf field kit
// and a tennis-court kit, fences/ball nets, light poles and signs.
import * as THREE from 'three';
import { Kit, polysGeo } from './classic-kit.js';
import { canvasTex } from './venue-util.js';

export function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const pip = (u, v, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if (((P[i][1] > v) !== (P[j][1] > v)) && (u < (P[j][0] - P[i][0]) * (v - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c; } return c; };
export const inPoly = pip;
const area = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
// distance from point to polygon boundary
export function edgeDist(u, v, P) { let m = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; const dx = b[0] - a[0], dz = b[1] - a[1]; const L2 = dx * dx + dz * dz; let t = L2 ? ((u - a[0]) * dx + (v - a[1]) * dz) / L2 : 0; t = Math.max(0, Math.min(1, t)); m = Math.min(m, Math.hypot(u - a[0] - t * dx, v - a[1] - t * dz)); } return m; }
// miter offset of a simple polygon (d > 0 = inward for the kit's orientation)
export function offsetPoly(P, d) {
  const n = P.length, sgn = area(P) < 0 ? 1 : -1; const out = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
    const n1 = norm2([-(b[1] - a[1]), b[0] - a[0]]), n2 = norm2([-(c[1] - b[1]), c[0] - b[0]]);
    // kit orientation (area<0): inward is -n (n = (-tz, tx) is outward)
    const m = norm2([n1[0] + n2[0], n1[1] + n2[1]]); const cs = m[0] * n1[0] + m[1] * n1[1];
    const k = d / Math.max(0.3, cs);
    out.push([b[0] - sgn * m[0] * k, b[1] - sgn * m[1] * k]);
  }
  return out;
}
const dd0 = (S) => S.depth ?? 0.3;
function norm2(p) { const l = Math.hypot(p[0], p[1]) || 1; return [p[0] / l, p[1] / l]; }

// ---------- materials ----------
// see-through wire mesh (chain-link / ball net): a tiling diamond lattice on a transparent canvas
export function meshMat(hex, cellsPer2m = 6, alpha = 1.0, base = 0.0) {
  const tex = canvasTex(128, 128, (c, W, H) => {
    c.clearRect(0, 0, W, H); if (base) { c.fillStyle = `rgba(128,128,128,${base})`; c.fillRect(0, 0, W, H); }
    c.strokeStyle = `rgba(255,255,255,${alpha})`; c.lineWidth = 5;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(W, H); c.moveTo(W, 0); c.lineTo(0, H); c.moveTo(-W / 2, H / 2); c.lineTo(W / 2, -H / 2); c.moveTo(W / 2, H * 1.5); c.lineTo(W * 1.5, H / 2);
    c.moveTo(-W / 2, H / 2); c.lineTo(W / 2, H * 1.5); c.moveTo(W / 2, -H / 2); c.lineTo(W * 1.5, H / 2); c.stroke();
  }, { repeat: true, srgb: true });
  tex.repeat.set(cellsPer2m, cellsPer2m);
  return new THREE.MeshStandardMaterial({ color: hex, map: tex, transparent: true, alphaTest: 0.3, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false });
}
const cache = new WeakMap();
export function gmats(M) {
  if (cache.has(M)) return cache.get(M);
  const tint = (base, hex, extra = {}) => { const m = base.clone(); m.color = new THREE.Color(hex); Object.assign(m, extra); return m; };
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const m = {
    // smooth precast / cast-in-place concrete (untextured: garage concrete reads smooth and pale)
    precast: std({ color: 0xcfccc4, roughness: 0.9 }), precastDark: std({ color: 0xa9a59c, roughness: 0.92 }),
    slab: std({ color: 0xb9b7b1, roughness: 0.92 }), soffit: std({ color: 0x737476, roughness: 0.97 }),
    deck: std({ color: 0x8e8f8d, roughness: 0.95 }), roofDeck: tint(M.concrete, 0xa3a4a2), interior: std({ color: 0x47484b, roughness: 1 }),
    steel: std({ color: 0xbabec2, roughness: 0.5, metalness: 0.2 }),
    net: meshMat(0x8d9296, 6, 0.4, 0.0), perf: meshMat(0xe6e8ea, 10, 0.9, 0.35),
    chain: meshMat(0xc4c8cb, 4, 1.0, 0.0), netTex: meshMat(0x2a2d30, 3, 0.9, 0.0),
    wind: std({ color: 0x223529, roughness: 0.95, side: THREE.DoubleSide }),
    lineY: std({ color: 0xf2c200, roughness: 0.7 }), lineB: std({ color: 0x1f4fcc, roughness: 0.7 }),
    navyTurf: std({ color: 0x2c4560, roughness: 0.95 }), redTrack: std({ color: 0xa04a3a, roughness: 0.9 }),
    rubber: std({ color: 0x2a2b2d, roughness: 0.95 }), seat: std({ color: 0xc9ced1, roughness: 0.45, metalness: 0.15 }),
    turfArt: std({ color: 0x3f9a45, roughness: 0.95 }), courtB: std({ color: 0x3d5aa6, roughness: 0.85 }), courtG: std({ color: 0x5e8f63, roughness: 0.85 }),
  };
  cache.set(M, m); return m;
}
export function matColor(base, hex, extra) { const m = base.clone(); m.color = new THREE.Color(hex); if (extra) Object.assign(m, extra); return m; }
export function plainMat(hex, extra = {}) { return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, ...extra }); }

// ---------- signs (canvas textures) ----------
export function signMesh(text, { w = 3, h = 1, bg = '#1f4e9a', fg = '#ffffff', sub = '', px = 512, P = true } = {}) {
  const W = px, H = Math.round(px * h / w);
  const tex = canvasTex(W, H, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H); c.strokeStyle = fg; c.lineWidth = H * 0.04; c.strokeRect(H * 0.05, H * 0.05, W - H * 0.1, H - H * 0.1);
    let x0 = H * 0.18;
    if (P) { c.fillStyle = fg; c.font = `bold ${Math.round(H * 0.72)}px Arial`; c.textBaseline = 'middle'; c.fillText('P', x0, H * 0.54); x0 += H * 0.62; }
    c.fillStyle = fg; c.textBaseline = 'middle';
    let fs = Math.round(H * (sub ? 0.34 : 0.42)); c.font = `bold ${fs}px Arial`;
    while (c.measureText(text).width > W - x0 - H * 0.15 && fs > 8) { fs -= 2; c.font = `bold ${fs}px Arial`; }
    c.fillText(text, x0, sub ? H * 0.38 : H * 0.53);
    if (sub) { let f2 = Math.round(H * 0.2); c.font = `${f2}px Arial`; while (c.measureText(sub).width > W - x0 - H * 0.15 && f2 > 8) { f2 -= 2; c.font = `${f2}px Arial`; } c.fillText(sub, x0, H * 0.74); }
  });
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.08 });
  const g = new THREE.PlaneGeometry(w, h);
  return new THREE.Mesh(g, mat);
}

// ---------- the garage kit ----------
export class GarageKit extends Kit {
  constructor(ctx, angDeg, seed = 7) {
    super(ctx, THREE.MathUtils.degToRad(angDeg)); this.G = gmats(ctx.M); this.R = rng(seed);
    this.cars = []; this.colliders = []; this.walkables = []; this.interactions = []; this.signs = [];
  }
  // footprint (local x,z) -> building frame, oriented so the building is on the LEFT of each edge
  framePoly(outer) { let P = outer.map(([x, z]) => this.uv(x, z)); if (area(P) > 0) P = P.reverse(); return P; }
  // simplify: drop vertices on (nearly) straight runs and tiny jogs
  simplify(P, tolDeg = 4, minLen = 0.6) {
    let Q = P.slice();
    for (let pass = 0; pass < 3; pass++) {
      const out = [];
      for (let i = 0; i < Q.length; i++) {
        const a = Q[(i - 1 + Q.length) % Q.length], b = Q[i], c = Q[(i + 1) % Q.length];
        const a1 = Math.atan2(b[1] - a[1], b[0] - a[0]), a2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
        let d = Math.abs(a2 - a1); if (d > Math.PI) d = 2 * Math.PI - d;
        if (d * 180 / Math.PI < tolDeg || Math.hypot(c[0] - b[0], c[1] - b[1]) < minLen && Math.hypot(b[0] - a[0], b[1] - a[1]) < minLen) continue;
        out.push(b);
      }
      Q = out;
    }
    return Q;
  }
  gSamples(R, s0, s1, d = 0.6, n = 4) { const out = []; for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; const p = R.at(s, d); out.push(this.g(p[0], p[1])); } return out; }

  // Open parking façade on run R. o: {levels:[floor ys], top, bay, colW, guard, wallMat, panelMat, panelInset,
  //  beam (edge beam height above floor), screen:{type:'panel'|'mesh'|'fins', mat, levels:[k...], pitch}, lowMesh,
  //  ent:[{s0,s1,level}] grade openings, solid:[[s0,s1]] solid zones, noCols, cap}
  facade(R, o) {
    const G = this.G, M = this.M; const L = R.L;
    const top = o.top, guard = o.guard ?? 1.1, beam = o.beam ?? 0.3, colW = o.colW ?? 0.6, slabT = o.slabT ?? 0.55; const tg = o.topGuard ?? guard, capH = o.capH ?? 0.12;
    const nb = Math.max(1, Math.round(L / (o.bay ?? 8.5))); const bw = L / nb; const cs = []; for (let i = 0; i <= nb; i++) cs.push(i * bw);
    const gs = this.gSamples(R, 0, L, 0.8, Math.max(4, Math.ceil(L / 2)));
    const yBot = Math.min(...gs) - 1.5;
    const ops = [], panels = [], meshes = [];
    const lev = o.levels; const solid = o.solid || [];
    const inSolid = (a, b) => solid.some(([p, q]) => b > p && a < q);
    for (let i = 0; i < nb; i++) {
      const s0 = cs[i] + colW / 2, s1 = cs[i + 1] - colW / 2; if (s1 - s0 < 1.2) continue;
      const g = this.gSamples(R, s0, s1, 0.8, 3); const gMax = Math.max(...g), gMin = Math.min(...g);
      const solidBay = inSolid(s0, s1);
      for (let k = 0; k < lev.length; k++) {
        const isTop = k === lev.length - 1; const fl = lev[k];
        const ceil = isTop ? top + tg - capH : lev[k + 1] - slabT;
        const ent = (o.ent || []).find((e) => e.level === k && s1 > e.s0 && s0 < e.s1);
        if (isTop) { // parapet zone panels
          if (o.panelMat && !solidBay && top + beam > gMax + 0.2) { const y0 = top + beam, y1 = top + tg - capH; ops.push({ s0, s1, y0, y1 }); panels.push({ s0, s1, y0, y1, top: true }); }
          continue;
        }
        if (solidBay) continue;
        let y0 = ent ? gMin + 0.02 : fl + (o.panelMat ? beam : guard);
        if (!ent && gMax + 0.15 > y0) y0 = gMax + 0.15;
        if (ceil - y0 < 0.8) continue;
        ops.push({ s0, s1, y0, y1: ceil });
        if (!ent && o.panelMat && y0 < fl + guard - 0.2 && !(o.noPanelLevels || []).includes(k)) panels.push({ s0, s1, y0, y1: fl + guard });
        if (!ent && o.lowMesh && k === o.lowMesh.level) { const yb = o.lowMesh.fromFloor ? Math.max(y0, fl) : Math.max(y0, fl + guard); meshes.push({ s0, s1, y0: yb, y1: Math.min(ceil, yb + (o.lowMesh.h ?? 1.5)) }); }
        if (!ent && o.screen && o.screen.levels && o.screen.levels.includes(k)) meshes.push({ s0, s1, y0: o.screen.h ? Math.max(y0, ceil - o.screen.h) : Math.max(y0, fl + (o.panelMat ? guard : 0)), y1: ceil, screen: true });
      }
    }
    this.wall(R, o.wallMat || G.precast, 0, L, yBot, top + tg, ops, 0.35);
    // cap (precast coping)
    this.rbox(R, o.wallMat || G.precast, -0.05, top + tg - 0.02, -0.4, L + 0.05, top + tg + 0.1, 0.06);
    const pin = o.panelInset ?? 0.2;
    for (const p of panels) { const pi2 = p.top && o.topPanelInset != null ? o.topPanelInset : pin; this.rbox(R, p.top && o.topPanelMat ? o.topPanelMat : o.panelMat, p.s0, p.y0, -pi2 - 0.08, p.s1, p.y1, -pi2); }
    for (const p of meshes) {
      if (p.screen) {
        const S = o.screen;
        if (S.type === 'panel') { this.rbox(R, S.mat, p.s0 - 0.02, p.y0, -0.12, p.s1 + 0.02, p.y1, -0.04); }
        else if (S.type === 'mesh') { this.rbox(R, S.mat, p.s0, p.y0, -0.1, p.s1, p.y1, -0.08); }
      } else this.rbox(R, o.lowMesh.mat || G.chain, p.s0, p.y0, -0.1, p.s1, p.y1, -0.08);
    }
    // columns proud of the wall
    if (!o.noCols) for (const c of cs) if (!(o.solidNoCols && inSolid(c - 0.4, c + 0.4))) this.rbox(R, o.colMat || o.wallMat || G.precast, c - colW / 2, yBot, 0, c + colW / 2, top + tg + 0.1, o.colProj ?? 0.12);
    // fins: continuous vertical fins over the whole façade
    if (o.screen && o.screen.type === 'fins') {
      const S = o.screen; const pitch = S.pitch ?? 0.6; const n = Math.floor(L / pitch);
      const y1 = top + (S.over ?? guard); const y0f = S.y0 ?? (lev[1] ?? lev[0]) - 0.6;
      const fw = (S.w ?? 0.1) / 2; for (let i = 0; i <= n; i++) { const s = (L - n * pitch) / 2 + i * pitch; if (inSolid(s - 0.1, s + 0.1)) continue; const dd = S.depth ?? 0.3; const ya = Math.max(y0f, this.gSamples(R, s, s, 0.8, 1)[0] + 2.8); const major = S.major && Math.abs(((s + S.major / 2) % S.major) - S.major / 2) < pitch / 2; const w2 = major ? fw * 2.2 : fw; this.rbox(R, S.mat, s - w2, ya, 0.15, s + w2, y1, 0.15 + dd); }
      if (S.cap) this.rbox(R, S.cap, -0.1, y1 - 0.02, 0.1, L + 0.1, y1 + 0.18, 0.2 + dd0(S));
      // slab-edge bands proud of the fins
      for (let k = 1; k < lev.length; k++) { if (S.bandRecessed) this.rbox(R, S.band || o.wallMat || G.precast, -0.05, lev[k] - 0.27, 0.0, L + 0.05, lev[k] - 0.02, 0.2); else this.rbox(R, S.band || o.wallMat || G.precast, -0.1, lev[k] - 0.32, 0.12, L + 0.1, lev[k] + 0.02, 0.15 + (S.depth ?? 0.3) + 0.08); }
    }
    return { cs, ops, yBot, bw };
  }

  // floor slabs over the (inset) footprint and interior "depth" (columns, lights, cars, dark backdrop)
  decks(P, levels, { slabT = 0.3, mat, depth = 11, runs = [], cars = 0.4, lights = true, colRow = 8.5, skipTop = false, inset = 0.36, core = 0, beams = 0, corePolys = null } = {}) {
    const G = this.G; const Pi = inset ? offsetPoly(P, inset) : P;
    const n = skipTop ? levels.length - 1 : levels.length;
    for (let k = 0; k < n; k++) { this.prism(G.soffit, Pi, levels[k] - slabT, levels[k] - 0.012); this.flat(mat || G.deck, Pi, levels[k]); }
    this._terrainOK = (u, v, fl) => this.g(u, v) < fl - 0.05;
    if (corePolys) for (const C of corePolys) this.prism(G.interior, C, levels[0] - 0.01, levels[levels.length - 1] - slabT - 0.01);
    else if (core) { const C = offsetPoly(P, core); this.prism(G.interior, C, levels[0] - 0.01, levels[levels.length - 1] - slabT - 0.01); }
    const top = levels[levels.length - 1];
    for (const { R, cs, ops } of runs) {
      if (!ops.length) continue;
      const L = R.L;
      for (let k = 0; k < levels.length - 1; k++) {
        const fl = levels[k], ce = levels[k + 1] - slabT;
        const open = ops.some((o) => o.y1 > fl + 0.5 && o.y0 < ce - 0.3);
        if (!open) continue;
        // backdrop + interior column row + ceiling light strips + cars
        if (L > 2 * depth + 2) this.rbox(R, G.interior, depth, fl, -depth - 0.25, L - depth, ce, -depth);
        for (let i = 1; i < cs.length - 1; i++) { const p = R.at(cs[i], -colRow); if (pip(p[0], p[1], P) && edgeDist(p[0], p[1], P) > colRow - 0.5) this.rbox(R, G.precastDark, cs[i] - 0.3, fl, -colRow - 0.3, cs[i] + 0.3, ce, -colRow + 0.3); }
        if (beams) for (let i = 0; i < cs.length; i++) { const p = R.at(cs[i], -beams / 2); if (!pip(p[0], p[1], P)) continue; this.rbox(R, G.soffit, cs[i] - 0.22, ce - 0.6, -beams, cs[i] + 0.22, ce, -0.4); }
        if (lights) for (let i = 0; i < cs.length - 1; i++) { const sm = (cs[i] + cs[i + 1]) / 2; for (const dd of [-5.0]) { const p = R.at(sm, dd); if (!pip(p[0], p[1], P)) continue; this.rbox(R, this.M.lampGlow, sm - 0.7, ce - 0.08, dd - 0.08, sm + 0.7, ce - 0.02, dd + 0.08, { detail: true }); } }
        for (let i = 0; i < cs.length - 1; i++) {
          const a = cs[i] + 0.7, b = cs[i + 1] - 0.7; const nS = Math.floor((b - a) / 2.6);
          for (let j = 0; j < nS; j++) { if (this.R() > cars) continue; const s = a + (b - a) * (j + 0.5) / nS; const p = R.at(s, -3.0); if (!pip(p[0], p[1], P) || !this._terrainOK(p[0], p[1], fl)) continue; this.car(p[0], fl, p[1], Math.atan2(R.n[1], R.n[0]) + (this.R() < 0.5 ? 0 : Math.PI), P); }
        }
      }
    }
    return top;
  }

  // Wrap-around spandrel bands (cast-in-place decks with rounded noses) at every level above the lowest, plus the
  // parapet band at the top; round columns set back behind the bands. Returns pseudo-runs for decks().
  bandFacade(P, levels, { mat, h = 1.05, below = 0.45, out = 0.3, nose = true, colSet = 1.4, colR = 0.3, bay = 8.5, colMat, profile = null, colSeg = 12 } = {}) {
    const G = this.G; const m = mat || G.precast; const top = levels[levels.length - 1];
    for (let k = 1; k < levels.length; k++) {
      const y = levels[k];
      const prof = profile ? profile(y) : nose ? [[0, y - below], [out * 0.55, y - below], [out * 0.9, y - below + 0.1], [out, y - below + 0.32], [out, y + h - 0.28], [out * 0.88, y + h - 0.08], [out * 0.55, y + h], [0, y + h]]
        : [[0, y - below], [out, y - below], [out, y + h], [0, y + h]];
      this.smoothLoop(m, P, prof);
      // inner lip so the band reads solid from inside
      this.loop(m, P, [[0, y + h], [-0.12, y + h], [-0.12, y], [0, y]]);
    }
    const runs = [];
    for (let i = 0; i < P.length; i++) {
      const R = this.run(P[i], P[(i + 1) % P.length]); const L = R.L; if (L < 3) { runs.push({ R, cs: [0, L], ops: [] }); continue; }
      const nb = Math.max(1, Math.round(L / bay)); const cs = []; for (let j = 0; j <= nb; j++) cs.push(L * j / nb);
      const gs = this.gSamples(R, 0, L, 0.8, Math.max(2, nb * 2)); const yb = Math.min(...gs) - 1.0;
      // columns every `bay` metres of perimeter (so short curved segments get them too)
      this._perim = this._perim ?? 0; let acc = this._perim; const start = Math.ceil(acc / bay) * bay - acc;
      for (let sC = start; sC < L; sC += bay) { const p = R.at(sC, -colSet); if (pip(p[0], p[1], P) && edgeDist(p[0], p[1], P) > colSet - 0.25) this.cyl(colMat || G.precastDark, p[0], yb, p[1], colR, colR, top - 0.3 - yb, colSeg); }
      this._perim += L;
      const ops = [];
      for (let j = 0; j < nb; j++) { const g = this.gSamples(R, cs[j], cs[j + 1], 0.8, 2); const gMax = Math.max(...g);
        for (let k = 0; k < levels.length - 1; k++) { const y0 = Math.max(levels[k] + (k ? h : 0), gMax + 0.1), y1 = levels[k + 1] - below; if (y1 - y0 > 0.8) ops.push({ s0: cs[j], s1: cs[j + 1], y0, y1 }); } }
      runs.push({ R, cs, ops });
    }
    return runs;
  }
  // solid perimeter base wall from below grade up to y (closes the gap under the lowest deck)
  plinth(P, y, mat) { let gmin = Infinity; for (const [u, v] of P) gmin = Math.min(gmin, this.g(u, v)); this.loop(mat || this.G.precast, P, [[0.02, gmin - 1.5], [0.02, y]]); }
  car(u, y, v, yaw, P) {
    for (const c of this.cars) if (Math.abs(c[1] - y) < 0.5 && Math.hypot(c[0] - u, c[2] - v) < 2.4) return;
    if (P) { const du = Math.cos(yaw) * 2.3, dv = Math.sin(yaw) * 2.3; if (!pip(u + du, v + dv, P) || !pip(u - du, v - dv, P) || edgeDist(u + du, v + dv, P) < 0.45 || edgeDist(u - du, v - dv, P) < 0.45) return; }
    this.cars.push([u, y, v, yaw, Math.floor(this.R() * 1e6)]);
  }

  // painted stalls + parked cars + light poles on an open roof deck
  roofParking(P, y, { rows = 'u', margin = 1.4, occ = 0.45, poles = 26, lineMat, keep = () => true } = {}) {
    const M = this.M; const lm = lineMat || M.whitePaint;
    const us = P.map((p) => p[0]), vs = P.map((p) => p[1]);
    const [a0, a1] = rows === 'u' ? [Math.min(...vs), Math.max(...vs)] : [Math.min(...us), Math.max(...us)];
    const [b0, b1] = rows === 'u' ? [Math.min(...us), Math.max(...us)] : [Math.min(...vs), Math.max(...vs)];
    const at = (a, b) => (rows === 'u' ? [b, a] : [a, b]);
    const ok = (a, b) => { const [u, v] = at(a, b); return pip(u, v, P) && edgeDist(u, v, P) > margin && keep(u, v); };
    // module: stall 5.4 | aisle 7.2 | stall 5.4 ; double rows back to back
    const mod = 18.0; const startA = a0 + margin + 0.2;
    for (let a = startA; a + 5.4 <= a1 - margin; a += mod) {
      for (const [ra, rb, face] of [[a, a + 5.4, 1], [a + 12.6, a + 18.0, -1]]) {
        if (rb > a1 - margin) continue;
        for (let b = b0 + margin; b <= b1 - margin; b += 2.6) {
          if (!ok(ra + 0.2, b) || !ok(rb - 0.2, b)) continue;
          const [u0, v0] = at(ra, b); const [u1, v1] = at(rb, b);
          this.box(lm, Math.min(u0, u1) - (rows === 'u' ? 0.05 : 0), y + 0.004, Math.min(v0, v1) - (rows === 'u' ? 0 : 0.05), Math.max(u0, u1) + (rows === 'u' ? 0.05 : 0), y + 0.014, Math.max(v0, v1) + (rows === 'u' ? 0 : 0.05), { detail: true });
          if (ok(ra + 0.2, b + 2.6) && ok(rb - 0.2, b + 2.6) && this.R() < occ) { const [cu, cv] = at((ra + rb) / 2, b + 1.3); this.car(cu, y, cv, (rows === 'u' ? Math.PI / 2 : 0) + (face > 0 ? 0 : Math.PI)); }
        }
      }
    }
    // light poles along aisle centrelines
    for (let a = startA + 9.0; a <= a1 - margin; a += mod) for (let b = b0 + poles / 2; b <= b1 - 2; b += poles) { const [u, v] = at(a, b); if (pip(u, v, P) && edgeDist(u, v, P) > 3) this.lightPole(u, y, v, 7.5, rows === 'u' ? 0 : Math.PI / 2); }
  }
  lightPole(u, y, v, h = 7.5, rot = 0, { heads = 2, mat } = {}) {
    const M = this.M; const pm = mat || this.G.steel; this.cyl(pm, u, y, v, 0.13, 0.08, h, 8);
    this.box(M.concrete, u - 0.3, y - 0.05, v - 0.3, u + 0.3, y + 0.5, v + 0.3);
    for (let k = 0; k < heads; k++) { const a = rot + k * Math.PI; const du = Math.cos(a) * 0.6, dv = Math.sin(a) * 0.6; this.obox(pm, u + du / 2, y + h - 0.1, v + dv / 2, 1.2, 0.08, 0.1, a, { detail: true }); this.obox(M.lampGlow, u + du, y + h - 0.2, v + dv, 0.7, 0.12, 0.35, a); }
  }
  floodPole(u, y, v, h = 20, face = 0, { n = 6 } = {}) {
    const G = this.G; this.cyl(G.steel, u, y, v, 0.3, 0.14, h, 10);
    const cu = u + Math.cos(face) * 0.3, cv = v + Math.sin(face) * 0.3; this.obox(G.steel, (u + cu) / 2, y + h + 0.3, (v + cv) / 2, 0.45, 0.2, 0.2, face);
    this.obox(G.steel, cu, y + h + 0.3, cv, 0.12, 1.5, 2.4, face);
    for (let i = 0; i < n; i++) { const r = Math.floor(i / 3), c = i % 3; const off = (c - 1) * 0.8; this.obox(this.M.lampGlow, cu + Math.cos(face) * 0.22 - Math.sin(face) * off, y + h + 0.75 - r * 0.7, cv + Math.sin(face) * 0.22 + Math.cos(face) * off, 0.2, 0.55, 0.62, face); }
  }

  // enclosed stair/elevator tower (box), glazed strip on listed faces ('N','S','E','W' in building frame: N=-v)
  tower(u0, v0, u1, v1, y0, y1, { mat, glass = [], glassMat, roofOver = 0.3, door = null, penthouse = 0 } = {}) {
    const M = this.M; const m = mat || this.G.precast;
    this.box(m, u0, y0, v0, u1, y1, v1);
    this.box(m, u0 - roofOver, y1, v0 - roofOver, u1 + roofOver, y1 + 0.35, v1 + roofOver);
    if (penthouse) this.box(m, u0 + 0.6, y1 + 0.35, v0 + 0.6, u1 - 0.6, y1 + 0.35 + penthouse, v1 - 0.6);
    const faces = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
    for (const f of glass) {
      const R = this.run(faces[f][0], faces[f][1]); const w = Math.min(R.L - 1.0, 2.6); const s0 = (R.L - w) / 2;
      this.rbox(R, glassMat || M.glassLight, s0, y0 + 0.3, 0.0, s0 + w, y1 - 0.6, 0.06);
      for (let y = y0 + 3; y < y1 - 0.6; y += 3) this.rbox(R, M.iron, s0, y - 0.06, 0.05, s0 + w, y + 0.06, 0.1, { detail: true });
      for (const s of [s0, s0 + w / 2, s0 + w]) this.rbox(R, M.iron, s - 0.05, y0 + 0.3, 0.05, s + 0.05, y1 - 0.6, 0.1, { detail: true });
    }
    if (door) { const R = this.run(faces[door.face][0], faces[door.face][1]); const s = door.s ?? R.L / 2; const yd = door.y ?? y0; this.rbox(R, M.darkBronze || M.iron, s - 0.9, yd, 0, s + 0.9, yd + 2.3, 0.05); this.rbox(R, m, s - 1.3, yd + 2.45, 0, s + 1.3, yd + 2.7, 0.9); }
    return { u0, v0, u1, v1, y1 };
  }
  // exterior steel stair: zig-zag flights along run R between s0..s1, outward offset d0..d1, from y0 to y1
  steelStair(R, s0, s1, d0, d1, y0, y1, { flight = 1.6, mat } = {}) {
    const G = this.G; const m = mat || G.steel; const nF = Math.max(1, Math.round((y1 - y0) / flight)); const rise = (y1 - y0) / nF;
    const mid = (d0 + d1) / 2; const L = s1 - s0 - 2.4; const ang = Math.atan2(rise, L);
    for (let f = 0; f < nF; f++) {
      const ya = y0 + f * rise, yb = ya + rise; const dd = f % 2 ? [mid + 0.05, d1] : [d0, mid - 0.05];
      const g = new THREE.BoxGeometry(Math.hypot(L, rise), 0.12, dd[1] - dd[0]); g.rotateZ(f % 2 ? -ang : ang); g.translate(s0 + 1.2 + L / 2, (ya + yb) / 2, (dd[0] + dd[1]) / 2); this.addRun(R, m, g);
      for (const [s, sl] of [[s0, s0 + 1.2], [s1 - 1.2, s1]]) this.rbox(R, m, s, yb - 0.15, d0, sl, yb, d1);
      // stringer rails
      const r = new THREE.BoxGeometry(Math.hypot(L, rise), 0.05, 0.05); r.rotateZ(f % 2 ? -ang : ang); r.translate(s0 + 1.2 + L / 2, (ya + yb) / 2 + 1.0, dd[1]); this.addRun(R, m, r, { detail: true });
    }
    for (const s of [s0 + 0.1, s1 - 0.1]) for (const d of [d0 + 0.1, d1 - 0.1]) this.rbox(R, m, s - 0.1, Math.min(y0, this.gSamples(R, s, s, d, 1)[0]) - 0.3, d - 0.1, s + 0.1, y1 + 1.1, d + 0.1);
    this.rbox(R, G.chain, s0, y0 + 0.2, d1 - 0.02, s1, y1 + 1.1, d1); for (let y = y0 + 1.1; y < y1 + 1.2; y += rise * 2) this.rbox(R, m, s0, y - 0.04, d1 - 0.05, s1, y + 0.04, d1 + 0.02, { detail: true });
  }

  // fence along a polyline (building frame pts), height h; mat chain|net; posts every pitch
  fence(pts, y, h, { mat, postMat, pitch = 3.0, postR = 0.04, wind = 0, kick = 0, kickMat, base = 0, closed = false, top = true } = {}) {
    const G = this.G; const m = mat || G.chain; const pm = postMat || G.steel;
    const seg = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < seg; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
      const R = this.run(a, b); const yb = y + base;
      if (kick) this.rbox(R, kickMat || G.precastDark, 0, y, -0.08, L, y + kick, 0.08);
      this.rbox(R, m, 0, yb + kick, -0.01, L, yb + h, 0.01);
      if (wind) this.rbox(R, G.wind, 0, yb + kick + 0.05, 0.02, L, yb + kick + wind, 0.03);
      const n = Math.max(1, Math.round(L / pitch));
      for (let k = 0; k <= n; k++) { if (k === n && closed === false && i < seg - 1) continue; const p = R.at(L * k / n, 0); this.cyl(pm, p[0], y, p[1], postR, postR, h + base, 6); }
      if (top) this.rbox(R, pm, 0, yb + h - 0.04, -0.03, L, yb + h + 0.02, 0.03, { detail: true });
    }
  }

  // white (or given) paint line from (u0,v0) to (u1,v1), width w, at y
  line(u0, v0, u1, v1, y, w = 0.1, mat) { const L = Math.hypot(u1 - u0, v1 - v0); if (L < 0.01) return; const a = Math.atan2(v1 - v0, u1 - u0); this.obox(mat || this.M.whitePaint, (u0 + u1) / 2, y + 0.008, (v0 + v1) / 2, L, 0.014, w, a, { detail: true }); }
  arc(u, v, r, a0, a1, y, w = 0.1, mat, seg = 40) { // angles in building frame (0 = +u, pi/2 = +v)
    const g = new THREE.RingGeometry(r - w / 2, r + w / 2, seg, 1, -a1, a1 - a0); g.rotateX(-Math.PI / 2); g.translate(u, y + 0.012, v);
    this.add(mat || this.M.whitePaint, g, { detail: true, uvMode: 'keep' });
  }
  rectLines(u0, v0, u1, v1, y, w, mat) { this.line(u0, v0, u1, v0, y, w, mat); this.line(u1, v0, u1, v1, y, w, mat); this.line(u1, v1, u0, v1, y, w, mat); this.line(u0, v1, u0, v0, y, w, mat); }

  // soccer goal facing +dir (unit vector in u,v) at (u,v)
  goal(u, v, y, dirA, { w = 7.32, h = 2.44, d = 2.0, mat } = {}) {
    const M = this.M; const pm = mat || M.whitePaint; const ca = Math.cos(dirA), sa = Math.sin(dirA);
    const P = (s, back) => [u + (-sa) * s - ca * back, v + ca * s - sa * back];
    for (const s of [-w / 2, w / 2]) { const p = P(s, 0); this.cyl(pm, p[0], y, p[1], 0.06, 0.06, h, 8); }
    { const p = P(0, 0); this.obox(pm, p[0], y + h, p[1], 0.12, 0.12, w + 0.12, dirA); }
    const G = this.G; // net box (back + sides + top)
    { const p = P(0, d); this.obox(G.net, p[0], y + h * 0.4, p[1], 0.02, h * 0.8, w, dirA); }
    for (const s of [-w / 2, w / 2]) { const p = P(s, d / 2); this.obox(G.net, p[0], y + h / 2, p[1], d, h, 0.02, dirA); }
    { const p = P(0, d / 2); this.obox(G.net, p[0], y + h - 0.01, p[1], d, 0.02, w, dirA); }
  }

  // field-hockey + soccer markings on a field centred (cu,cv), long axis along u. L x W metres.
  fieldMarkings(cu, cv, y, { L = 91.4, W = 55, kind = 'hockey', mat, mat2, w = 0.075 } = {}) {
    const m = mat || this.M.whitePaint; const u0 = cu - L / 2, u1 = cu + L / 2, v0 = cv - W / 2, v1 = cv + W / 2;
    this.rectLines(u0, v0, u1, v1, y, w, m); this.line(cu, v0, cu, v1, y, w, m);
    if (kind === 'hockey') {
      for (const s of [-1, 1]) {
        const ue = s < 0 ? u0 : u1; const ui = ue - s * 22.9; this.line(ui, v0, ui, v1, y, w, m);
        // shooting circle: two quarter arcs r=14.63 centred on goal posts (+-1.83) joined by a straight 3.66 m line
        const r = 14.63; const uc = ue; this.line(ue - s * r, cv - 1.83, ue - s * r, cv + 1.83, y, w, m);
        if (s < 0) { this.arc(uc, cv - 1.83, r, -Math.PI / 2, 0, y, w, m, 24); this.arc(uc, cv + 1.83, r, 0, Math.PI / 2, y, w, m, 24); }
        else { this.arc(uc, cv - 1.83, r, Math.PI, 1.5 * Math.PI, y, w, m, 24); this.arc(uc, cv + 1.83, r, Math.PI / 2, Math.PI, y, w, m, 24); }
        this.arc(uc, cv, 1.0, 0, 0.01, y, 0.0001, m, 1);
      }
    } else if (kind === 'soccer' || kind === 'soccerNoCircle') {
      if (kind === 'soccer') this.arc(cu, cv, 9.15, 0, 2 * Math.PI, y, w, m, 48);
      for (const s of [-1, 1]) {
        const ue = s < 0 ? u0 : u1;
        this.line(ue, cv - 20.16, ue - s * 16.5, cv - 20.16, y, w, m); this.line(ue - s * 16.5, cv - 20.16, ue - s * 16.5, cv + 20.16, y, w, m); this.line(ue - s * 16.5, cv + 20.16, ue, cv + 20.16, y, w, m);
        this.line(ue, cv - 9.16, ue - s * 5.5, cv - 9.16, y, w, m); this.line(ue - s * 5.5, cv - 9.16, ue - s * 5.5, cv + 9.16, y, w, m); this.line(ue - s * 5.5, cv + 9.16, ue, cv + 9.16, y, w, m);
        const a = Math.acos(5.5 / 9.15); if (s < 0) this.arc(ue + 11, cv, 9.15, -a, a, y, w, m, 16); else this.arc(ue - 11, cv, 9.15, Math.PI - a, Math.PI + a, y, w, m, 16);
      }
    } else if (kind === 'football10') { // sidelines, end lines, goal lines and a line every 10 yards
      const yd = 0.9144; const fl = 120 * yd; const a0 = cu - fl / 2; const hw = 48.8 * yd / 2;
      for (let i = 0; i <= 12; i++) this.line(a0 + i * 10 * yd, cv - hw, a0 + i * 10 * yd, cv + hw, y, i === 1 || i === 11 ? 0.2 : 0.1, m);
      this.line(a0, cv - hw, a0 + fl, cv - hw, y, 0.15, m); this.line(a0, cv + hw, a0 + fl, cv + hw, y, 0.15, m);
    } else if (kind === 'football') {
      // yard lines every 5 yd over 100 yd + end zones (long axis along u)
      const yd = 0.9144; const fl = 120 * yd; const a0 = cu - fl / 2;
      for (let i = 0; i <= 24; i++) this.line(a0 + i * 5 * yd, cv - 48.8 * yd / 2, a0 + i * 5 * yd, cv + 48.8 * yd / 2, y, i === 2 || i === 22 ? 0.2 : 0.1, m);
      this.line(a0, cv - 26.65, a0 + fl, cv - 26.65, y, 0.1, m); this.line(a0, cv + 26.65, a0 + fl, cv + 26.65, y, 0.1, m);
      for (let i = 3; i < 22; i++) for (const off of [-6.1, 6.1]) this.line(a0 + i * 5 * yd - 0.3, cv + off, a0 + i * 5 * yd + 0.3, cv + off, y, 0.1, m);
    }
  }

  // tennis court block: nCourts side by side (courts' long axis along 'v' if axis='v'), centred (cu,cv)
  tennis(cu, cv, y, { n = 2, axis = 'v', surf, outer, line, run = 36.6, wide = 17.0, fence = 3.6, wind = 2.4 } = {}) {
    const G = this.G, M = this.M; const lm = line || M.whitePaint;
    const totW = n * wide; const A = axis === 'v';
    const toUV = (a, b) => (A ? [cu + a, cv + b] : [cu + b, cv + a]); // a: across courts, b: along court length
    const ru = (a0, b0, a1, b1, y0, y1, mat, opts) => { const p = toUV(a0, b0), q = toUV(a1, b1); this.box(mat, Math.min(p[0], q[0]), y0, Math.min(p[1], q[1]), Math.max(p[0], q[0]), y1, Math.max(p[1], q[1]), opts); };
    ru(-totW / 2, -run / 2, totW / 2, run / 2, y - 0.05, y, outer || G.courtG || M.turf);
    const ln = (a0, b0, a1, b1) => { const p = toUV(a0, b0), q = toUV(a1, b1); this.line(p[0], p[1], q[0], q[1], y + 0.012, 0.05, lm); };
    for (let i = 0; i < n; i++) {
      const ac = -totW / 2 + wide * (i + 0.5);
      ru(ac - 10.97 / 2 - 1.2, -23.77 / 2 - 2.0, ac + 10.97 / 2 + 1.2, 23.77 / 2 + 2.0, y, y + 0.012, surf || G.courtB);
      const hw = 10.97 / 2, hs = 8.23 / 2, hl = 23.77 / 2;
      ln(ac - hw, -hl, ac + hw, -hl); ln(ac - hw, hl, ac + hw, hl); ln(ac - hw, -hl, ac - hw, hl); ln(ac + hw, -hl, ac + hw, hl);
      ln(ac - hs, -hl, ac - hs, hl); ln(ac + hs, -hl, ac + hs, hl); ln(ac - hs, -6.4, ac + hs, -6.4); ln(ac - hs, 6.4, ac + hs, 6.4); ln(ac, -6.4, ac, 6.4);
      ln(ac, -hl, ac, -hl + 0.15); ln(ac, hl, ac, hl - 0.15);
      // net + posts
      const p0 = toUV(ac - hw - 0.9, 0), p1 = toUV(ac + hw + 0.9, 0);
      this.cyl(M.iron, p0[0], y, p0[1], 0.04, 0.04, 1.07, 6, { detail: true }); this.cyl(M.iron, p1[0], y, p1[1], 0.04, 0.04, 1.07, 6, { detail: true });
      ru(ac - hw - 0.9, -0.01, ac + hw + 0.9, 0.01, y + 0.05, y + 0.95, G.net, { detail: true });
      ru(ac - hw - 0.9, -0.03, ac + hw + 0.9, 0.03, y + 0.9, y + 0.97, M.whitePaint, { detail: true });
    }
    if (fence) { const c = [toUV(-totW / 2, -run / 2), toUV(totW / 2, -run / 2), toUV(totW / 2, run / 2), toUV(-totW / 2, run / 2)]; this.fence(c, y, fence, { closed: true, wind, pitch: 3.0, postMat: M.iron }); }
    return { totW, run };
  }

  // bleachers: rows stepping up along -dir from front edge (run R from s0..s1, front at d=0 facing outward n)
  bleachers(R, s0, s1, y, rows = 6, { tread = 0.8, rise = 0.42, mat } = {}) {
    const G0 = this.G;
    const G = this.G; const m = mat || G.seat;
    for (let r = 0; r < rows; r++) { const d0 = -r * tread; this.rbox(R, G.precastDark, s0, y, d0 - tread, s1, y + rise * (r + 1) - 0.05, d0 - tread + 0.05); this.rbox(R, m, s0, y + rise * (r + 1) - 0.06, d0 - tread + 0.02, s1, y + rise * (r + 1), d0 - 0.25); }
    for (let s = s0; s <= s1 + 0.01; s += Math.max(2, (s1 - s0) / Math.round((s1 - s0) / 4))) this.rbox(R, G.steel, s - 0.05, y, -rows * tread, s + 0.05, y + rise * rows, -0.1);
    this.rbox(R, G.steel, s0, y + rise * rows + 0.9, -rows * tread - 0.05, s1, y + rise * rows + 0.95, -rows * tread + 0.05, { detail: true });
  }

  smoothArc(P, i0, i1, stepDeg = 3) {
    const A = P[i0], B = P[Math.round((i0 + i1) / 2)], C = P[i1];
    const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1])); if (Math.abs(d) < 1e-6) return P;
    const ux = ((A[0] ** 2 + A[1] ** 2) * (B[1] - C[1]) + (B[0] ** 2 + B[1] ** 2) * (C[1] - A[1]) + (C[0] ** 2 + C[1] ** 2) * (A[1] - B[1])) / d;
    const uy = ((A[0] ** 2 + A[1] ** 2) * (C[0] - B[0]) + (B[0] ** 2 + B[1] ** 2) * (A[0] - C[0]) + (C[0] ** 2 + C[1] ** 2) * (B[0] - A[0])) / d;
    const r = Math.hypot(A[0] - ux, A[1] - uy); let a0 = Math.atan2(A[1] - uy, A[0] - ux), a1 = Math.atan2(C[1] - uy, C[0] - ux);
    const am = Math.atan2(B[1] - uy, B[0] - ux); // choose direction through B
    const norm = (x) => { while (x < 0) x += 2 * Math.PI; while (x >= 2 * Math.PI) x -= 2 * Math.PI; return x; };
    let span = norm(a1 - a0); if (norm(am - a0) > span) span = span - 2 * Math.PI;
    const n = Math.max(2, Math.ceil(Math.abs(span) * 180 / Math.PI / stepDeg)); const arc = [];
    for (let k = 0; k <= n; k++) { const a = a0 + span * k / n; arc.push([ux + Math.cos(a) * r, uy + Math.sin(a) * r]); }
    return [...P.slice(0, i0), ...arc, ...P.slice(i1 + 1)];
  }
  // closed moulding loop like Kit.loop but with smooth normals across the profile (rounded noses read round)
  smoothLoop(mat, poly, prof, opts = {}) {
    let area = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1]; }
    const sgn = area > 0 ? 1 : -1; const n = poly.length;
    const N = poly.map((p, i) => { const q = poly[(i + 1) % n]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; const tx = (q[0] - p[0]) / L, tz = (q[1] - p[1]) / L; return sgn > 0 ? [tz, -tx] : [-tz, tx]; });
    const off = (i, o) => { const n1 = N[(i - 1 + n) % n], n2 = N[i]; const dd = 1 + n1[0] * n2[0] + n1[1] * n2[1]; return [poly[i][0] + o * (n1[0] + n2[0]) / dd, poly[i][1] + o * (n1[1] + n2[1]) / dd]; };
    // 2D profile normals (out, y) per profile point, averaged from adjacent segments
    const segN = []; for (let k = 0; k < prof.length - 1; k++) { const dx = prof[k + 1][0] - prof[k][0], dy = prof[k + 1][1] - prof[k][1]; const l = Math.hypot(dx, dy) || 1; segN.push([dy / l, -dx / l]); }
    const pN = prof.map((_, k) => { const a = segN[Math.max(0, k - 1)], b = segN[Math.min(segN.length - 1, k)]; const x = a[0] + b[0], y = a[1] + b[1]; const l = Math.hypot(x, y) || 1; return [x / l, y / l]; });
    const pos = [], nor = [];
    for (let k = 0; k < prof.length - 1; k++) {
      const [o0, y0] = prof[k], [o1, y1] = prof[k + 1];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n; const A = off(i, o0), B = off(j, o0), C = off(j, o1), D = off(i, o1); const e = N[i];
        const n0 = [e[0] * pN[k][0], pN[k][1], e[1] * pN[k][0]], n1 = [e[0] * pN[k + 1][0], pN[k + 1][1], e[1] * pN[k + 1][0]];
        const P0 = [A[0], y0, A[1]], P1 = [B[0], y0, B[1]], P2 = [C[0], y1, C[1]], P3 = [D[0], y1, D[1]];
        if (sgn > 0) { pos.push(...P0, ...P2, ...P1, ...P0, ...P3, ...P2); nor.push(...n0, ...n1, ...n0, ...n0, ...n1, ...n1); }
        else { pos.push(...P0, ...P1, ...P2, ...P0, ...P2, ...P3); nor.push(...n0, ...n0, ...n1, ...n0, ...n1, ...n1); }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    this.add(mat, g, opts);
  }
  // gaps (per edge) where the outside ground is within tol of the roof deck: the roof is reachable on foot there
  autoGaps(P, top, tol = 0.55, step = 1.0) {
    const gaps = {};
    for (let i = 0; i < P.length; i++) { const R = this.run(P[i], P[(i + 1) % P.length]); let start = null; const list = [];
      for (let s = 0; s <= R.L + 1e-6; s += step) { const p = R.at(Math.min(s, R.L), 1.2); const ok = Math.abs(this.g(p[0], p[1]) - top) < tol; if (ok && start === null) start = s; if ((!ok || s + step > R.L) && start !== null) { if (s - start >= 2) list.push([start, ok ? R.L : s]); start = null; } }
      if (list.length) gaps[i] = list; }
    return gaps;
  }
  // colliders along polygon edges with gaps: gaps = {edgeIndex: [[s0,s1],...]}
  perimeterColliders(P, y0, y1, gaps = {}) {
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
      let segs = [[0, L]];
      for (const [g0, g1] of gaps[i] || []) { const ns = []; for (const [p, q] of segs) { if (g1 <= p || g0 >= q) { ns.push([p, q]); continue; } if (g0 > p) ns.push([p, g0]); if (g1 < q) ns.push([g1, q]); } segs = ns; }
      for (const [p, q] of segs) if (q - p > 0.05) this.colliders.push({ type: 'poly', pts: this.polyXZ([[a[0] + t[0] * p, a[1] + t[1] * p], [a[0] + t[0] * q, a[1] + t[1] * q]]), y0, y1 });
    }
  }

  // build everything: merged meshes + instanced cars + signs
  done(name) {
    const root = this.finish(); root.name = name;
    if (this.cars.length) root.add(this.carMesh());
    for (const s of this.signs) root.add(s);
    return root;
  }
  carMesh() {
    const g = carGeometry(); const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1, vertexColors: true });
    const im = new THREE.InstancedMesh(g, mat, this.cars.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    const pal = [0xe9e9e6, 0x1c1d20, 0x8a8f94, 0xb9bcbf, 0x3a4658, 0x5a2a2c, 0xdcdcd8, 0x2a2b2e, 0x6f747a, 0xc7c9cc, 0xa6a9ad, 0x44474c];
    const c = new THREE.Color(); const rot = this.a;
    this.cars.forEach(([u, y, v, yaw, rr], i) => {
      const [x, z] = this.xz(u, v); q.setFromAxisAngle(up, -(yaw + rot)); m4.compose(new THREE.Vector3(x, y, z), q, sc); im.setMatrixAt(i, m4);
      c.setHex(pal[rr % pal.length]); im.setColorAt(i, c);
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.name = 'cars';
    im.computeBoundingSphere && im.computeBoundingSphere();
    return im;
  }
  // sign placed on run R at s, height y, offset d, facing outward
  sign(R, s, y, d, text, opts = {}) {
    const mesh = signMesh(text, opts); const p = R.at(s, d); const [x, z] = this.xz(p[0], p[1]);
    const nrm = this.xz(R.n[0], R.n[1]); mesh.position.set(x, y, z); mesh.rotation.y = Math.atan2(nrm[0], nrm[1]) + (opts.blade ? Math.PI / 2 : 0);
    if (opts.blade) mesh.material.side = THREE.DoubleSide;
    this.signs.push(mesh); return mesh;
  }
}

// low-poly car (length along +x, ~4.5 x 1.8 x 1.45 m); vertex colours: body white (tinted per instance), glass dark, tyres black
let _car = null;
export function carGeometry() {
  if (_car) return _car;
  const parts = [];
  const add = (g, col) => { g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count; const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2]; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.deleteAttribute('uv'); parts.push(g); };
  const body = new THREE.BoxGeometry(4.5, 0.62, 1.78); body.translate(0, 0.62, 0); add(body, [1, 1, 1]);
  // cabin: trapezoid prism
  const s = new THREE.Shape(); s.moveTo(-1.55, 0); s.lineTo(1.05, 0); s.lineTo(0.45, 0.55); s.lineTo(-1.2, 0.55); s.lineTo(-1.55, 0);
  const cab = new THREE.ExtrudeGeometry(s, { depth: 1.5, bevelEnabled: false }); cab.translate(0, 0.93, -0.75); add(cab, [0.09, 0.1, 0.12]);
  const roof = new THREE.BoxGeometry(1.55, 0.06, 1.42); roof.translate(-0.37, 1.5, 0); add(roof, [1, 1, 1]);
  for (const x of [-1.45, 1.4]) for (const z of [-0.8, 0.8]) { const w = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 10); w.rotateX(Math.PI / 2); w.translate(x, 0.33, z); add(w, [0.05, 0.05, 0.05]); }
  const lamps = new THREE.BoxGeometry(0.04, 0.12, 1.5); lamps.translate(2.26, 0.75, 0); add(lamps, [0.9, 0.88, 0.8]);
  const tail = new THREE.BoxGeometry(0.04, 0.12, 1.5); tail.translate(-2.26, 0.78, 0); add(tail, [0.5, 0.05, 0.05]);
  const g = mergeAll(parts); g.computeVertexNormals(); _car = g; return g;
}
function mergeAll(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of list) { pos.set(g.attributes.position.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
export { polysGeo };
