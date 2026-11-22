// Ludwig's Fountain, Sproul Plaza: the round pool beside the Student Union (opened 1960) that the Regents named
// in 1961 for Ludwig, a German short-haired pointer who waded in it daily. Outline from OSM (natural=water),
// rim height (~0.45 m above the plaza) from the 2021 LiDAR.
import * as THREE from 'three';
import { Bucket, lathe, instanced, trs } from './lib/campanile-kit.js';

export const info = {
  id: 'ludwigs-fountain',
  name: "Ludwig's Fountain",
  subtitle: 'Sproul Plaza · named 1961',
  blurb: "Named by the Regents in 1961 for Ludwig von Schwarenburg, a German short-haired pointer who spent his days wading in this fountain "
    + 'and chasing tennis balls thrown by students. It was the first place on campus named after an animal.',
  replaces: [],
};

function plaqueTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#5a4526'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#c9a76a'; g.lineWidth = 8; g.strokeRect(10, 10, 492, 236);
  g.fillStyle = '#e2c98f'; g.textAlign = 'center';
  const lines = [["LUDWIG'S FOUNTAIN", 34], ['IN HONOR OF', 20], ['LUDWIG VON SCHWARENBURG', 24], ['CAMPUS CANINE', 22], ['BY ACT OF THE BOARD OF REGENTS', 16], ['APRIL 24, 1961 · DEDICATED JUNE 13, 1968', 16]];
  let y = 56;
  for (const [t, s] of lines) { g.font = `bold ${s}px Georgia, serif`; g.fillText(t, 256, y); y += s + 14; }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function streakTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); const img = g.createImageData(64, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
    const s = 0.55 + 0.45 * Math.sin(y * 0.21 + Math.sin(x * 0.7) * 2.0) * Math.sin(y * 0.047 + x * 0.3);
    const v = Math.max(0, Math.min(255, s * 255));
    const i = (y * 64 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export async function build(ctx) {
  const { M, U, boxUV, groundAt, packet } = ctx;
  const root = new THREE.Group(); root.name = 'ludwigs-fountain';
  // pool outline from the OSM water polygon: centre + mean radius
  let cx = 0, cz = 0, R = 3.05;
  const water = (packet?.context || []).find((c) => c.tags && c.tags.natural === 'water' && c.pts && c.pts.some(([x, z]) => Math.hypot(x, z) < 6));
  if (water) {
    const P = water.pts.slice(0, water.pts.length - (water.pts[0][0] === water.pts.at(-1)[0] && water.pts[0][1] === water.pts.at(-1)[1] ? 1 : 0));
    cx = P.reduce((a, p) => a + p[0], 0) / P.length; cz = P.reduce((a, p) => a + p[1], 0) / P.length;
    R = P.reduce((a, p) => a + Math.hypot(p[0] - cx, p[1] - cz), 0) / P.length;
  }
  // refine-central: re-fitted to the 2021 LiDAR radial profile (rim crest r≈3.0–3.55 m, ~0.42 m above the plaza) and the
  // reference photos: a bench-height buff concrete ring with a flat, eased top ~0.5 m wide that students sit on, a shallow
  // pale basin seen through clear water, and a ring of 8 low white foaming jets (no nozzles or posts above the water).
  const gRim = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return groundAt(cx + (R + 0.5) * Math.cos(a), cz + (R + 0.5) * Math.sin(a)); }).reduce((a, b) => a + b, 0) / 16;
  const RIM_IN = R - 0.06, RIM_OUT = R + 0.5, RIM_TOP = gRim + 0.43, WATER_Y = RIM_TOP - 0.17, FLOOR_Y = RIM_TOP - 0.48;
  const gMin = Math.min(...Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return groundAt(cx + RIM_OUT * Math.cos(a), cz + RIM_OUT * Math.sin(a)); }));
  const gMax = Math.max(...Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return groundAt(cx + (RIM_OUT + 1.1) * Math.cos(a), cz + (RIM_OUT + 1.1) * Math.sin(a)); }));
  const main = new Bucket(boxUV);
  // r4-sweep: rim colour kept (a cool grey matched the photo but merged with the grey paving in-game)
  const rimMat = M.concrete.clone(); rimMat.color.set(0xd8cab2); rimMat.roughness = 0.88; rimMat.name = 'ludwigConcrete';
  const stainMat = M.concrete.clone(); stainMat.color.set(0xa99d89); stainMat.name = 'ludwigStain';
  // ring with eased (rounded) arrises on both top edges; outer face runs 1 m below grade so it never floats on the slope
  const e = 0.05;
  const rim = lathe([[RIM_IN, FLOOR_Y], [RIM_IN, RIM_TOP - e], [RIM_IN + e * 0.3, RIM_TOP - e * 0.3], [RIM_IN + e, RIM_TOP],
    [RIM_OUT - e, RIM_TOP], [RIM_OUT - e * 0.3, RIM_TOP - e * 0.3], [RIM_OUT, RIM_TOP - e], [RIM_OUT, gMin - 1.0]].reverse(), 96);
  main.add(rimMat, rim.translate(cx, 0, cz), { smooth: true });
  // darker water-stained band on the inner face just above the waterline
  main.add(stainMat, new THREE.CylinderGeometry(RIM_IN - 0.004, RIM_IN - 0.004, 0.09, 96, 1, true).translate(cx, WATER_Y + 0.04, cz), { smooth: true, uv: 'keep' });
  // exposed-aggregate apron ring flush with the plaza, with a thin joint ring
  const apron = new THREE.RingGeometry(RIM_OUT - 0.01, RIM_OUT + 1.1, 96, 1).rotateX(-Math.PI / 2);
  main.add(M.concreteDark, apron.translate(cx, gMax + 0.025, cz));
  // pale plastered basin floor with a shallow inner step at the wall foot
  const floorMat = M.concrete.clone(); floorMat.color.set(0xb4b3aa); floorMat.name = 'ludwigFloor';
  main.add(floorMat, new THREE.CircleGeometry(RIM_IN - 0.01, 72).rotateX(-Math.PI / 2).translate(cx, FLOOR_Y + 0.005, cz));
  main.add(floorMat, new THREE.RingGeometry(RIM_IN - 0.32, RIM_IN - 0.005, 72, 1).rotateX(-Math.PI / 2).translate(cx, FLOOR_Y + 0.08, cz));
  // flush bronze jet heads on the basin floor (below the water)
  const NJ = 8, RJ = RIM_IN - 0.75;
  for (let i = 0; i < NJ; i++) { const a = (i / NJ) * Math.PI * 2 + 0.2; main.add(M.darkBronze, new THREE.CylinderGeometry(0.04, 0.05, 0.05, 8).translate(cx + RJ * Math.cos(a), FLOOR_Y + 0.03, cz + RJ * Math.sin(a)), { smooth: true, uv: 'keep' }); }
  main.flush(root, null, { name: 'ludwig-' });

  // animated water surface: clear and pale so the basin floor shows through, with ripples spreading from each jet
  const waterMat = M.water.clone();
  // r4-sweep: deeper, more reflective water (photo: dark, mirrors sky and trees); the pale 0.62-opacity surface read as a
  // solid white floor from eye level. The basin floor still shows faintly near the rim.
  waterMat.name = 'ludwigWater'; waterMat.color.set(0x3e555b); waterMat.transparent = true; waterMat.opacity = 0.86; waterMat.depthWrite = false;
  waterMat.roughness = 0.07; waterMat.envMapIntensity = 0.65; // merged r4-campanile + r4-sweep tweaks: // the sky-only env map at grazing angles still mirrored the bright sky as a white sheet
  waterMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRipXZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRipXZ = position.xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec2 vRipXZ;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 g = vec2(0.0);
          for (int i = 0; i < ${NJ}; i++) { float a = float(i) * ${(Math.PI * 2 / NJ).toFixed(6)} + 0.2; vec2 c = vec2(cos(a), sin(a)) * ${RJ.toFixed(3)}; vec2 d = vRipXZ - c; float r = length(d);
            g += (d / max(r, 1e-3)) * cos(r * 16.0 - uTime * 7.0) * exp(-r * 1.8) * 0.16; }
          g += vec2(sin(vRipXZ.x * 3.1 + uTime * 1.3), cos(vRipXZ.y * 2.7 - uTime * 1.1)) * 0.03;
          normal = normalize(normal + (viewMatrix * vec4(g.x, 0.0, g.y, 0.0)).xyz); }`);
  };
  waterMat.customProgramCacheKey = () => 'ludwigWater3';
  const water2 = new THREE.Mesh(new THREE.CircleGeometry(RIM_IN + 0.01, 72).rotateX(-Math.PI / 2), waterMat);
  water2.position.set(cx, WATER_Y, cz); water2.name = 'ludwig-water'; water2.receiveShadow = true; water2.renderOrder = 1;
  root.add(water2);

  // ring of low, white, aerated jets: a foamy column that thickens as it falls back, plus a churned foam boil on the surface
  const streak = streakTexture(); streak.repeat.set(1, 2);
  const sprayMat = new THREE.MeshStandardMaterial({ color: 0xf4f7f6, emissive: 0x9aa4a6, emissiveIntensity: 0.25, roughness: 0.3, transparent: true, opacity: 0.6, alphaMap: streak, depthWrite: false, side: THREE.DoubleSide });
  sprayMat.name = 'ludwigSpray';
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xeef3f2, emissive: 0x8a9496, emissiveIntensity: 0.2, roughness: 0.6, transparent: true, opacity: 0.7, depthWrite: false });
  foamMat.name = 'ludwigFoam';
  const jets = new THREE.Group(); jets.userData.detail = true; jets.name = 'ludwig-jets';
  // r4-sweep: fatter, shorter aerated columns (thin 0.5 m spikes read as a ring of white candles)
  const jetGeo = new THREE.LatheGeometry([[0.12, 0], [0.095, 0.08], [0.07, 0.2], [0.055, 0.3], [0.065, 0.36], [0.04, 0.41], [0.001, 0.44]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
  const boilGeo = new THREE.SphereGeometry(0.16, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.35, 1);
  const jm2 = []; for (let i = 0; i < NJ; i++) { const a = (i / NJ) * Math.PI * 2 + 0.2; jm2.push(trs(cx + RJ * Math.cos(a), WATER_Y, cz + RJ * Math.sin(a))); }
  jets.add(instanced(jetGeo, sprayMat, jm2, null, { detail: true, shadow: false }));
  jets.add(instanced(boilGeo, foamMat, jm2, null, { detail: true, shadow: false }));
  jets.traverse((o) => { o.castShadow = false; o.renderOrder = 2; });
  root.add(jets);

  // small bronze dedication plaque set flush into the apron (south side)
  const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTexture(), metalness: 0.75, roughness: 0.42 });
  plaqueMat.name = 'ludwigPlaque';
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.012, 0.2), [M.darkBronze, M.darkBronze, plaqueMat, M.darkBronze, M.darkBronze, M.darkBronze]);
  const pr = RIM_OUT + 0.45;
  plaque.position.set(cx, gMax + 0.034, cz + pr); plaque.name = 'ludwig-plaque'; plaque.userData.detail = true;
  root.add(plaque);

  const walkables = [{
    type: 'fn', bounds: [cx - RIM_OUT, cz - RIM_OUT, cx + RIM_OUT, cz + RIM_OUT],
    heightAt: (x, z) => { const r = Math.hypot(x - cx, z - cz); if (r > RIM_OUT) return null; if (r >= RIM_IN) return RIM_TOP; return FLOOR_Y; },
  }];
  return {
    object3d: root, colliders: [], walkables, interactions: [],
    anchors: { water: [+cx.toFixed(3), WATER_Y, +cz.toFixed(3)] },
    update(dt) { streak.offset.y -= dt * 1.6; },
  };
}
