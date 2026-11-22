// r4-props2: campus statues and memorials that players walk right past. Placed from OpenStreetMap tourism=artwork
// points and the UC Berkeley Library's bear walking tour; the figures are baked SDF sculpts (tools/sculpt/bears.mjs,
// loaded through ./sculpt.js), the stonework is plain geometry on the shared materials.
//   golden-bear      Tom Hardy's gilded walking bear (1980) on its 18 ft concrete pillar, Lower Sproul Plaza
//   grizzly-bear     Raymond Puccinelli's granite grizzly (1955) on a rock slab by Strawberry Creek
//   cal-bear         Douglas Van Howd's 10 ft bronze "California Golden Bear" (1996), outside Memorial Stadium
//   bench-1920       Class of 1920 WWI memorial bench by the Sather Tower entrance, Jo Mora's two mourning bears on its piers
//   bench-1955       Class of 1955 "Beneficiary to Benefactor" bench beside it
//   laughing-pelican Frances Rich's bronze "Laughing Pelican" (1958) outside Anthony Hall, the Pelican Building
//   mining-pool      the round pool at the centre of Hearst Mining Circle with Bruce Beasley's "Rondo II" (2013) on it
// installStatues() is called once from main.js; ?nostatues=1 skips it.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { materials, boxUV } from '../materials.js';
import { loadSculpt } from './sculpt.js';

// ------------------------------------------------------------------ small geometry kit
class Bag { // geometry merged per material
  constructor() { this.map = new Map(); }
  add(mat, g, { uv = true } = {}) {
    g = g.index ? g.toNonIndexed() : g;
    if (uv) g = boxUV(g);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g); return this;
  }
  flush(parent, { cast = true, name = 'statue' } = {}) {
    for (const [mat, list] of this.map) {
      const g = list.length > 1 ? mergeGeometries(list, false) : list[0]; g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = true; m.name = name + ':' + (mat.name || ''); parent.add(m);
    }
    this.map.clear(); return parent;
  }
}
const box = (w, h, d, x = 0, y0 = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y0 + h / 2, z); // bottom face at y0
const lathe = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
function extrudeX(shape, depth, x0 = 0) { // 2-D shape drawn in (z, y), extruded along +x from x0
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  g.rotateY(-Math.PI / 2); g.translate(x0 + depth, 0, 0); return g;
}
function extrudeZ(shape, depth, z0 = 0) { // 2-D shape drawn in (x, y), extruded along +z from z0
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, z0);
}
function textDecal(w, h, lines, { font = 'Georgia, serif', color = 'rgba(70,60,46,0.92)', px = 512, weight = 'bold', gap = 1.45, extra, scale } = {}) {
  const c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * h / w); const g = c.getContext('2d');
  if (extra) extra(g, c.width, c.height);
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  const fs = Math.min(c.height / (lines.length * gap + 0.5), c.width / 18) * (scale || 1);
  lines.forEach((t, i) => { g.font = `${weight} ${Math.round(fs * (t.s || 1))}px ${font}`; g.fillText(t.t ?? t, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * fs * gap); });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.35, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, name: 'statue:inscription' });
}

// ------------------------------------------------------------------ materials
function chipTex() { // bark-mulch wood chips
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#3b2c22'; g.fillRect(0, 0, 256, 256);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) { const l = 40 + r() * 50; g.fillStyle = `hsl(${24 + r() * 12},${18 + r() * 18}%,${l * 0.4}%)`; g.save(); g.translate(r() * 256, r() * 256); g.rotate(r() * 6.3); g.fillRect(-4 - r() * 5, -1.2, 8 + r() * 9, 2.4 + r() * 2); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1.6); t.anisotropy = 4; return t;
}
let _m = null;
function mats() {
  if (_m) return _m;
  const M = materials();
  const tint = (base, color, o = {}) => { const m = base.clone(); m.color.set(color); Object.assign(m, o); return m; };
  const ao = (m) => { m.vertexColors = true; return m; }; // baked cavity AO rides in the sculpt's vertex colours
  _m = {
    pillar: tint(M.stucco, 0xd9c7a2, { name: 'statue:pillar', roughness: 0.92 }),
    joint: tint(M.stucco, 0xb9a887, { name: 'statue:pillarJoint', roughness: 0.95 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xdcaa4a, metalness: 1, roughness: 0.34, vertexColors: true, name: 'statue:goldLeaf' }),
    granite: ao(tint(M.granite, 0xb3b2ac, { name: 'statue:greyGranite', roughness: 0.92 })),
    plinth: tint(M.granite, 0xa9a8a3, { name: 'statue:plinth', roughness: 0.9 }),
    rock: ao(tint(M.granite, 0x9d9584, { name: 'statue:rock', roughness: 0.97 })),
    patina: new THREE.MeshStandardMaterial({ color: 0x5d4c37, metalness: 0.6, roughness: 0.52, vertexColors: true, name: 'statue:bronzePatina' }),
    travertine: tint(M.marble, 0xdfcdad, { name: 'statue:travertine', roughness: 0.85 }),
    travBear: ao(tint(M.marble, 0xd6c4a0, { name: 'statue:travertineBear', roughness: 0.88 })),
    castStone: tint(M.stucco, 0xcfcdc5, { name: 'statue:castStone', roughness: 0.9 }),
    coping: tint(M.granite, 0xbcb7ad, { name: 'statue:coping' }),
    pad: tint(M.concrete, 0xa29e96, { name: 'statue:pad' }),
    mulch: new THREE.MeshStandardMaterial({ map: chipTex(), roughness: 1, name: 'statue:mulch' }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc9ccce, metalness: 1, roughness: 0.2, name: 'statue:stainless' }),
    plaque: new THREE.MeshStandardMaterial({ color: 0x3d3326, metalness: 0.8, roughness: 0.45, name: 'statue:plaque' }),
    poolFloor: tint(M.concrete, 0x7d8a86, { name: 'statue:poolFloor' }),
    flag: tint(M.paving, 0xa8aca8, { name: 'statue:flagstones' }),
    verdigris: new THREE.MeshStandardMaterial({ color: 0x55695f, metalness: 0.45, roughness: 0.58, vertexColors: true, name: 'statue:verdigrisBronze' }),
    water: tint(M.water, 0x1d363b, { name: 'statue:poolWater', envMapIntensity: 0.9, roughness: 0.08 }),
  };
  return _m;
}

async function sculpt(name, mat, { s = 1, near = 30, far = 700, uvScale = 0.6, ao = 1 } = {}) { // hi/lo LOD pair of a baked sculpt
  const [hi, lo] = await Promise.all([loadSculpt(name, { uvScale }), loadSculpt(name + '-lo', { uvScale })]);
  if (ao !== 1) for (const g of [hi, lo]) { const c = g.attributes.color.array; for (let i = 0; i < c.length; i++) c[i] = 1 - ao * (1 - c[i]); } // gentler cavity AO (metals)
  const lod = new THREE.LOD(); lod.name = 'statue:' + name;
  const mk = (g) => { const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; m.scale.setScalar(s); return m; };
  lod.addLevel(mk(hi), 0); lod.addLevel(mk(lo), near); lod.addLevel(new THREE.Object3D(), far);
  return lod;
}

// ------------------------------------------------------------------ the statues (local frame: origin on the ground, +z = front)
export async function goldenBear() { // Lower Sproul: chamfered concrete pillar 5.5 m tall with a grooved face, thin cantilevered cap, gilded bear
  const K = mats(), B = new Bag(), g = new THREE.Group();
  const H = 5.5, a = 0.42, c = 0.1;
  const sh = new THREE.Shape(); sh.moveTo(-a + c, -a); sh.lineTo(a - c, -a); sh.lineTo(a, -a + c); sh.lineTo(a, a - c); sh.lineTo(a - c, a); sh.lineTo(-a + c, a); sh.lineTo(-a, a - c); sh.lineTo(-a, -a + c); sh.closePath();
  const shaft = new THREE.ExtrudeGeometry(sh, { depth: H - 0.45 + 0.6, bevelEnabled: false }); shaft.rotateX(-Math.PI / 2); shaft.translate(0, -0.6, 0);
  B.add(K.pillar, shaft);
  B.add(K.pillar, box(1.2, 0.34, 1.2, 0, -0.2, 0)); B.add(K.pillar, new THREE.CylinderGeometry(0.44 * Math.SQRT2, 0.6 * Math.SQRT2, 0.16, 4, 1).rotateY(Math.PI / 4).translate(0, 0.22, 0)); // chamfered base block
  // cap: 2.4 m square slab, 0.2 m at the edge, inverted-pyramid soffit down onto the shaft
  B.add(K.pillar, box(2.6, 0.22, 2.6, 0, H - 0.07, 0));
  B.add(K.pillar, new THREE.ConeGeometry(1.3 * Math.SQRT2, 0.55, 4, 1).rotateY(Math.PI / 4).rotateX(Math.PI).translate(0, H - 0.07 - 0.275, 0));
  for (const yy of [1.4, 2.8, 4.2]) B.add(K.joint, box(2 * a - 2 * c + 0.012, 0.014, 2 * a + 0.006, 0, yy, 0)), B.add(K.joint, box(2 * a + 0.006, 0.014, 2 * a - 2 * c + 0.012, 0, yy, 0)); // faint formwork lift joints
  B.flush(g, { name: 'golden-bear' });
  const bear = await sculpt('bear-hardy', K.gold, { s: 1.4, ao: 0.5 }); bear.position.set(0, H + 0.15, 0.0); g.add(bear);
  return g;
}

export async function grizzlyBear() { // by Strawberry Creek: smooth granite grizzly on a thin granite plinth on a rock slab
  const K = mats(), B = new Bag(), g = new THREE.Group();
  g.add(await sculpt('rock-slab', K.rock, { near: 40, uvScale: 0.35 }));
  B.add(K.plinth, box(1.32, 0.12, 0.58, 0, 0.32, 0)); B.flush(g, { name: 'grizzly-bear' });
  const bear = await sculpt('bear-pucc', K.granite, { s: 0.72 }); bear.position.set(0, 0.44, -0.1); g.add(bear);
  return g;
}

export async function calBear() { // Memorial Stadium: rearing bronze grizzly in a mulch bed with a concrete curb; plaque boulder in front
  const K = mats(), B = new Bag(), g = new THREE.Group();
  const W = 2.6, D = 2.0, r = 0.7; // bed half-size + corner radius
  const rr = (w, d, rad) => { const s = new THREE.Shape(); s.moveTo(-w + rad, -d); s.lineTo(w - rad, -d); s.absarc(w - rad, -d + rad, rad, -Math.PI / 2, 0); s.lineTo(w, d - rad); s.absarc(w - rad, d - rad, rad, 0, Math.PI / 2); s.lineTo(-w + rad, d); s.absarc(-w + rad, d - rad, rad, Math.PI / 2, Math.PI); s.lineTo(-w, -d + rad); s.absarc(-w + rad, -d + rad, rad, Math.PI, Math.PI * 1.5); return s; };
  const ring = rr(W + 0.16, D + 0.16, r + 0.16); ring.holes.push(rr(W, D, r));
  B.add(K.pad, new THREE.ExtrudeGeometry(ring, { depth: 0.53, bevelEnabled: false, curveSegments: 8 }).rotateX(-Math.PI / 2).translate(0, -0.45, 0)); // curb ~8 cm proud
  const bed = new THREE.ShapeGeometry(rr(W, D, r), 8).rotateX(-Math.PI / 2).translate(0, 0.05, 0);
  B.add(K.mulch, bed);
  B.flush(g, { name: 'cal-bear' });
  const bear = await sculpt('bear-rear', K.patina, { s: 1.22, near: 45, ao: 0.8 }); bear.position.set(0.12, 0.04, -0.15); g.add(bear);
  const stone = await sculpt('rock-slab', K.rock, { s: 0.42, near: 25 }); stone.position.set(0.2, 0, D + 1.1); stone.rotation.y = 0.15; g.add(stone);
  const pl = new THREE.Mesh(box(0.42, 0.03, 0.32, 0, -0.015), K.plaque); pl.rotation.x = 0.45; pl.position.set(0.2, 0.19, D + 1.12); pl.castShadow = true; g.add(pl);
  return g;
}

export async function bench1920() { // travertine WWI memorial bench: square end piers, back slab, scrolled consoles, two mourning bears
  const K = mats(), B = new Bag(), g = new THREE.Group();
  const PX = 1.0, PZ = -0.15;
  for (const sx of [-1, 1]) {
    const x = sx * PX;
    B.add(K.travertine, box(0.42, 0.15, 0.42, x, 0, PZ));                 // stepped base
    B.add(K.travertine, box(0.34, 0.04, 0.34, x, 0.15, PZ));
    B.add(K.travertine, box(0.3, 1.04, 0.3, x, 0.19, PZ));                // shaft
    B.add(K.travertine, box(0.34, 0.04, 0.34, x, 1.23, PZ));              // cap mouldings
    B.add(K.travertine, box(0.4, 0.08, 0.4, x, 1.27, PZ));
  }
  B.add(K.travertine, box(1.72, 1.12, 0.12, 0, 0, PZ - 0.0));            // back slab
  B.add(K.travertine, box(1.74, 0.08, 0.2, 0, 1.1, PZ));                 // its moulded coping
  B.add(K.travertine, box(1.72, 0.03, 0.17, 0, 1.08, PZ));
  B.add(K.travertine, box(1.72, 0.07, 0.58, 0, 0.37, PZ + 0.35));        // seat slab
  B.add(K.travertine, new THREE.CylinderGeometry(0.035, 0.035, 1.72, 12).rotateZ(Math.PI / 2).translate(0, 0.405, PZ + 0.64)); // bullnose
  // S-scroll consoles under the seat front
  const con = new THREE.Shape(); con.moveTo(0, 0); con.lineTo(0.24, 0); con.lineTo(0.24, 0.06); con.quadraticCurveTo(0.08, 0.1, 0.12, 0.2); con.quadraticCurveTo(0.16, 0.3, 0.38, 0.3); con.lineTo(0.38, 0.37); con.lineTo(0, 0.37); con.closePath();
  for (const x of [-0.72, 0, 0.72]) {
    B.add(K.travertine, extrudeX(con, 0.1, x - 0.05).translate(0, 0, PZ + 0.06));
    for (const [zz, yy, rr] of [[0.34, 0.28, 0.06], [0.19, 0.07, 0.05]]) B.add(K.travertine, new THREE.CylinderGeometry(rr, rr, 0.12, 14).rotateZ(Math.PI / 2).translate(x, yy, PZ + 0.06 + zz));
  }
  B.add(K.pad, box(2.9, 0.5, 1.6, 0, -0.45, 0.2));                      // pad, deep enough to bridge a sloping site
  B.flush(g, { name: 'bench-1920' });
  const ins = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.42), textDecal(1.44, 0.42, ['THIS SEAT IS DEDICATED BY', 'THE CLASS OF 1920', 'TO THE SONS OF THE UNIVERSITY', 'WHO DIED IN THE GREAT WAR'], { color: 'rgba(120,104,80,0.75)' }));
  ins.position.set(0, 0.8, PZ + 0.061); g.add(ins);
  for (const sx of [-1, 1]) { const b = await sculpt('bear-mourn', K.travBear, { s: 0.44, near: 18, far: 300 }); b.position.set(sx * PX, 1.35, PZ - 0.0); b.rotation.y = -sx * 0.2; g.add(b); }
  return g;
}

export async function bench1955() { // cast-stone "Beneficiary to Benefactor" bench: arched back, scroll arms, squat baluster pedestals
  const K = mats(), B = new Bag(), g = new THREE.Group();
  B.add(K.castStone, box(2.12, 0.11, 0.58, 0, 0.34, 0.08));               // seat (front corners proud of the arms)
  B.add(K.castStone, new THREE.CylinderGeometry(0.04, 0.04, 2.12, 10).rotateZ(Math.PI / 2).translate(0, 0.405, 0.37));
  const back = new THREE.Shape(); back.moveTo(-0.92, 0.42); back.lineTo(0.92, 0.42); back.lineTo(0.92, 0.8); back.quadraticCurveTo(0, 0.92, -0.92, 0.8); back.closePath();
  B.add(K.castStone, extrudeZ(back, 0.12, -0.3));
  const rim = new THREE.Shape(); rim.moveTo(-0.92, 0.79); rim.quadraticCurveTo(0, 0.91, 0.92, 0.79); rim.lineTo(0.92, 0.83); rim.quadraticCurveTo(0, 0.95, -0.92, 0.83); rim.closePath();
  B.add(K.castStone, extrudeZ(rim, 0.15, -0.315));                        // rounded-over top edge
  // arm (side profile in z/y): rises from the back, sweeps forward in a concave curve, ends in a scroll over the seat front
  const arm = new THREE.Shape(); arm.moveTo(-0.3, 0.44); arm.lineTo(-0.3, 0.9); arm.quadraticCurveTo(0.0, 0.8, 0.26, 0.94); arm.quadraticCurveTo(0.38, 0.88, 0.3, 0.8); arm.quadraticCurveTo(0.12, 0.68, 0.16, 0.44); arm.closePath();
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? 0.9 : -1.05;
    B.add(K.castStone, extrudeX(arm, 0.15, x0));
    B.add(K.castStone, new THREE.CylinderGeometry(0.085, 0.085, 0.05, 20).rotateZ(Math.PI / 2).translate(x0 + 0.075 + sx * 0.09, 0.86, 0.24)); // volute boss on the outer face
    B.add(K.castStone, new THREE.TorusGeometry(0.05, 0.013, 6, 20).rotateY(Math.PI / 2).translate(x0 + 0.075 + sx * 0.115, 0.86, 0.24));
    B.add(K.castStone, new THREE.TorusGeometry(0.022, 0.01, 6, 14).rotateY(Math.PI / 2).translate(x0 + 0.075 + sx * 0.118, 0.86, 0.24));
    B.add(K.castStone, box(0.26, 0.05, 0.4, sx * 0.8, 0, 0.08));        // foot block
    B.add(K.castStone, lathe([[0, 0.05], [0.11, 0.05], [0.115, 0.075], [0.085, 0.12], [0.07, 0.17], [0.095, 0.24], [0.12, 0.3], [0.125, 0.34], [0, 0.34]], 20).scale(1, 1, 1.4).translate(sx * 0.8, 0, 0.08));
  }
  B.add(K.pad, box(2.6, 0.5, 1.3, 0, -0.45, 0.05));
  B.flush(g, { name: 'bench-1955' });
  const panels = (gx, w, h) => { gx.strokeStyle = 'rgba(90,90,84,0.6)'; gx.lineWidth = 6; const y0 = h * 0.06, y1 = h * 0.96; for (const [a, b] of [[0.02, 0.3], [0.34, 0.66], [0.7, 0.98]]) gx.strokeRect(w * a, y0, w * (b - a), y1 - y0); };
  const ins = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 0.36), textDecal(1.76, 0.36, ['BENEFICIARY', 'TO', 'BENEFACTOR', { t: 'CLASS OF 1955', s: 0.9 }], { font: 'Helvetica, Arial, sans-serif', color: 'rgba(100,100,94,0.8)', px: 1024, gap: 1.18, scale: 0.72, extra: panels }));
  ins.position.set(0, 0.6, -0.179); g.add(ins);
  return g;
}

export async function laughingPelican() { // Anthony Hall: Frances Rich's bronze pelican on a low pad of laid flagstones
  const K = mats(), B = new Bag(), g = new THREE.Group();
  const pad = new THREE.Shape(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = 1 + 0.08 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 7); const p = [Math.cos(a) * 1.55 * r, Math.sin(a) * 1.05 * r]; i ? pad.lineTo(...p) : pad.moveTo(...p); }
  B.add(K.flag, new THREE.ExtrudeGeometry(pad, { depth: 0.38, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 4 }).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).translate(0, -0.3, 0.1));
  B.flush(g, { name: 'pelican' });
  const bird = await sculpt('pelican', K.verdigris, { near: 35, ao: 0.85 }); bird.position.y = 0.11; g.add(bird);
  return g;
}

export async function miningPool(R = 7.5) { // granite-coped round pool, dark water, Beasley's intertwined stainless rings
  const K = mats(), B = new Bag(), g = new THREE.Group();
  const top = 0.32, e = 0.03;
  const CW = 0.6, e2 = 0.06; B.add(K.coping, lathe([[R, -0.25], [R, top - e2], [R + e2 * 0.3, top - e2 * 0.3], [R + e2, top], [R + CW - e2, top], [R + CW - e2 * 0.3, top - e2 * 0.3], [R + CW, top - e2], [R + CW, -1.2]].reverse(), 128));
  B.add(K.poolFloor, new THREE.CircleGeometry(R, 64).rotateX(-Math.PI / 2).translate(0, -0.25, 0));
  B.flush(g, { name: 'mining-pool' });
  const water = new THREE.Mesh(new THREE.CircleGeometry(R + 0.01, 96).rotateX(-Math.PI / 2).translate(0, top - 0.12, 0), K.water);
  water.name = 'mining-pool:water'; water.receiveShadow = true; g.add(water); // plain still water; the water pass can restyle meshes named *:water
  // Rondo II: four polished stainless rings intertwined, resting just on the surface (hi/lo LOD: the rings are most of the tris)
  const y = top - 0.12, rings = [[0.0, 0.0, 1.9], [Math.PI / 2, 0.55, 1.9], [0.9, 1.45, 1.75], [-0.7, 2.4, 1.75]];
  const lod = new THREE.LOD(); lod.name = 'statue:rondo-ii';
  for (const [rs, ts, dist] of [[12, 96, 0], [6, 40, 60]]) {
    const S = new Bag(), lvl = new THREE.Group();
    for (const [rx, ry, Rr] of rings) {
      const t = new THREE.TorusGeometry(Rr, 0.075, rs, ts); t.rotateX(rx); t.rotateY(ry); t.rotateZ(0.35);
      t.computeBoundingBox(); t.translate(0, y - t.boundingBox.min.y - 0.12, 0); S.add(K.steel, t, { uv: false }); // dips just under the surface
    }
    S.flush(lvl, { name: 'rondo-ii' }); lod.addLevel(lvl, dist);
  }
  lod.addLevel(new THREE.Object3D(), 700); g.add(lod);
  return g;
}

// ------------------------------------------------------------------ placement
// Sather Tower frame (matches src/landmarks/sather-tower.js: anchor + shaft centre offset, frame rotated 15.25°)
const TOWER = { x: 0.66 + 1.35, z: 2.1, rot: Math.atan2(2.78, 10.2), hw: 5.15 + 0.32 };
const towerPt = (u, v) => [TOWER.x + u * Math.cos(TOWER.rot) + v * Math.sin(TOWER.rot), TOWER.z - u * Math.sin(TOWER.rot) + v * Math.cos(TOWER.rot)];
export const PLACEMENTS = [
  { id: 'golden-bear', build: goldenBear, x: -223.2, z: 305.1, face: [-205, 326], r: 0.45, clearTrees: 1.6, col: (P, x, y, z) => P.addBox(x - 0.4, y - 1, z - 0.4, x + 0.4, y + 5.5, z + 0.4, 'statue') },
  { id: 'grizzly-bear', build: grizzlyBear, x: -241.7, z: 236.1, rot: Math.PI / 2, r: 1.1, col: (P, x, y, z, rot) => obb(P, x, y, z, rot, 1.2, 0.62, 1.3) },
  { id: 'cal-bear', build: calBear, x: 464.5, z: 54.5, face: [440, 54], r: 1.4, clearTrees: 2.6, col: (P, x, y, z) => P.addCircle(x, z, 0.9, y - 1, y + 3, 'statue') },
  // "the stone bench at the Campanile entrance": north face, beside the 1960s canopy
  { id: 'bench-1920', build: bench1920, at: towerPt(4.35, -TOWER.hw - 0.75), rot: TOWER.rot + Math.PI, r: 1.2, level: 'max', clearTrees: 1.8, col: (P, x, y, z, rot) => obb(P, x, y, z, rot, 1.2, 0.3, 1.4, -0.08) },
  { id: 'bench-1955', build: bench1955, at: towerPt(-TOWER.hw - 0.75, 0.5), rot: Math.atan2(-Math.cos(TOWER.rot), Math.sin(TOWER.rot)), r: 1.1, level: 'max', clearTrees: 1.6, col: (P, x, y, z, rot) => obb(P, x, y, z, rot, 1.08, 0.36, 0.95) },
  { id: 'laughing-pelican', build: laughingPelican, x: -25.2, z: 164.7, rot: 1.99, r: 1.2, clearTrees: 1.6, col: (P, x, y, z) => P.addCircle(x, z, 1.0, y - 1, y + 2.4, 'statue') },
  { id: 'mining-pool', build: () => miningPool(7.0), x: 75.0, z: -178.2, rot: 0, r: 7.6, level: 'max', clearTrees: 7.8, col: (P, x, y, z) => P.addCircle(x, z, 7.5, y - 1, y + 0.32, 'statue') },
];
function obb(P, x, y, z, rot, hx, hz, h, oz = 0) { // oriented box collider (local half-sizes hx, hz, centred oz along local z)
  const c = Math.cos(rot), s = Math.sin(rot); const pt = (u, v) => [x + u * c + v * s, z - u * s + v * c];
  P.addRing([pt(-hx, oz - hz), pt(hx, oz - hz), pt(hx, oz + hz), pt(-hx, oz + hz)], y - 1, y + h, 'statue');
}
export async function installStatues({ scene, physics, heightAt, setupMaterials, trees }) {
  const root = new THREE.Group(); root.name = 'statues'; scene.add(root);
  const out = { root, items: [] };
  await Promise.all(PLACEMENTS.map(async (p) => {
    try {
      const [x, z] = p.at || [p.x, p.z];
      const rot = p.rot ?? (p.face ? Math.atan2(p.face[0] - x, p.face[1] - z) : 0);
      // settle on the lowest ground under the footprint (pools: the highest, so the coping never dips under the lawn)
      const hs = [heightAt(x, z)]; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; hs.push(heightAt(x + Math.cos(a) * p.r, z + Math.sin(a) * p.r)); }
      const y = p.level === 'max' ? Math.max(...hs) : Math.min(...hs);
      const obj = await p.build(); obj.name = 'statue:' + p.id;
      obj.position.set(x, y, z); obj.rotation.y = rot; root.add(obj); obj.updateMatrixWorld(true);
      if (setupMaterials) setupMaterials(obj);
      if (physics && p.col) p.col(physics, x, y, z, rot);
      if (trees && p.clearTrees) trees.hideNear([[x, z, p.clearTrees]]);
      out.items.push({ id: p.id, x, y, z, rot });
    } catch (e) { console.warn('statue ' + p.id + ' failed', e); }
  }));
  return out;
}
