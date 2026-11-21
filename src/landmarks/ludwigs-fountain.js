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
  // photo-fitted: plain vertical concrete wall ~0.42 m high with a flat, slightly chamfered coping; dark apron ring;
  // shallow dark water ~0.18 m under the coping with a ring of small vertical jets (no central spire)
  const RIM_IN = R - 0.2, RIM_OUT = R + 0.18, RIM_TOP = 0.42, WATER_Y = 0.24, FLOOR_Y = -0.12;
  const gMin = Math.min(...Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return groundAt(cx + RIM_OUT * Math.cos(a), cz + RIM_OUT * Math.sin(a)); }));
  const gMax = Math.max(...Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return groundAt(cx + (RIM_OUT + 1.2) * Math.cos(a), cz + (RIM_OUT + 1.2) * Math.sin(a)); }));
  const main = new Bucket(boxUV);
  const rimMat = M.concrete.clone(); rimMat.color.setRGB(1.0, 0.96, 0.9); rimMat.name = 'ludwigConcrete';
  const rim = lathe([[0.0, FLOOR_Y], [RIM_IN - 0.02, FLOOR_Y], [RIM_IN, FLOOR_Y + 0.02], [RIM_IN, RIM_TOP - 0.02], [RIM_IN + 0.02, RIM_TOP],
    [RIM_OUT - 0.02, RIM_TOP], [RIM_OUT, RIM_TOP - 0.02], [RIM_OUT, gMin - 1.0]].reverse(), 72);
  main.add(rimMat, rim.translate(cx, 0, cz), { smooth: true });
  // dark apron ring flush with the plaza
  const apron = new THREE.RingGeometry(RIM_OUT - 0.01, RIM_OUT + 1.25, 72, 1).rotateX(-Math.PI / 2);
  main.add(M.concreteDark, apron.translate(cx, Math.max(gMax, 0) + 0.02, cz));
  // basin floor (dark, plastered)
  main.add(M.concreteDark, new THREE.CircleGeometry(RIM_IN - 0.01, 64).rotateX(-Math.PI / 2).translate(cx, FLOOR_Y + 0.005, cz));
  // ring of small bronze nozzles
  const NJ = 10, RJ = RIM_IN - 0.4;
  for (let i = 0; i < NJ; i++) { const a = (i / NJ) * Math.PI * 2; main.add(M.darkBronze, new THREE.CylinderGeometry(0.03, 0.05, WATER_Y - FLOOR_Y + 0.04, 8).translate(cx + RJ * Math.cos(a), (WATER_Y + FLOOR_Y) / 2 + 0.02, cz + RJ * Math.sin(a)), { smooth: true, uv: 'keep' }); }
  main.flush(root, null, { name: 'ludwig-' });

  // animated water surface (dark, low ripple)
  const waterMat = M.water.clone();
  waterMat.name = 'ludwigWater'; waterMat.color.set(0x3f4c4a);
  waterMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRipXZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRipXZ = position.xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec2 vRipXZ;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 g = vec2(0.0);
          for (int i = 0; i < 10; i++) { float a = float(i) * 0.6283185; vec2 c = vec2(cos(a), sin(a)) * ${RJ.toFixed(3)}; vec2 d = vRipXZ - c; float r = length(d);
            g += (d / max(r, 1e-3)) * cos(r * 14.0 - uTime * 6.0) * exp(-r * 2.2) * 0.12; }
          g += vec2(sin(vRipXZ.x * 3.1 + uTime * 1.3), cos(vRipXZ.y * 2.7 - uTime * 1.1)) * 0.025;
          normal = normalize(normal + (viewMatrix * vec4(g.x, 0.0, g.y, 0.0)).xyz); }`);
  };
  waterMat.customProgramCacheKey = () => 'ludwigWater2';
  const water2 = new THREE.Mesh(new THREE.CircleGeometry(RIM_IN + 0.01, 64).rotateX(-Math.PI / 2), waterMat);
  water2.position.set(cx, WATER_Y, cz); water2.name = 'ludwig-water'; water2.receiveShadow = true;
  root.add(water2);

  // ring of thin vertical jets with scrolling translucent streaks
  const streak = streakTexture(); streak.repeat.set(1, 2);
  const sprayMat = new THREE.MeshStandardMaterial({ color: 0xeef6fa, roughness: 0.15, transparent: true, opacity: 0.6, alphaMap: streak, depthWrite: false, side: THREE.DoubleSide });
  sprayMat.name = 'ludwigSpray';
  const jets = new THREE.Group(); jets.userData.detail = true; jets.name = 'ludwig-jets';
  const jetGeo = new THREE.CylinderGeometry(0.018, 0.03, 0.45, 8, 1, true).translate(0, 0.225, 0);
  const capGeo = new THREE.SphereGeometry(0.06, 8, 6).scale(1, 0.6, 1).translate(0, 0.45, 0);
  const jm = [];
  for (let i = 0; i < NJ; i++) { const a = (i / NJ) * Math.PI * 2; jm.push(trs(cx + RJ * Math.cos(a), WATER_Y, cz + RJ * Math.sin(a))); }
  jets.add(instanced(jetGeo, sprayMat, jm, null, { detail: true, shadow: false }));
  jets.add(instanced(capGeo, sprayMat, jm, null, { detail: true, shadow: false }));
  jets.traverse((o) => { o.castShadow = false; });
  root.add(jets);

  // small bronze dedication plaque set flush into the apron (south side)
  const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTexture(), metalness: 0.75, roughness: 0.42 });
  plaqueMat.name = 'ludwigPlaque';
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.012, 0.2), [M.darkBronze, M.darkBronze, plaqueMat, M.darkBronze, M.darkBronze, M.darkBronze]);
  const pr = RIM_OUT + 0.45;
  plaque.position.set(cx, Math.max(groundAt(cx, cz + pr), 0) + 0.028, cz + pr); plaque.name = 'ludwig-plaque'; plaque.userData.detail = true;
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
