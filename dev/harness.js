// Dev harness: renders one landmark module on its real terrain patch with LiDAR comparison tools.
// URL: /dev/landmark.html?id=sather-tower[&lidar=1]
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { materials, U, boxUV } from '../src/materials.js';

const qs = new URLSearchParams(location.search);
const id = qs.get('id') || 'sather-tower';
const info = document.getElementById('info');
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.__harness = { ready: false, errors };

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.2, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
// lighting matches the game (src/world/sky.js): sun ~ 1 PM in November from the SSW, gradient sky ambient
const sky = new Sky(); sky.scale.setScalar(4000); scene.add(sky);
const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(58), THREE.MathUtils.degToRad(-25));
sky.material.uniforms.sunPosition.value.copy(sun);
sky.material.uniforms.turbidity.value = 3.2; sky.material.uniforms.rayleigh.value = 1.4;
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { uSun: { value: sun } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 uSun; varying vec3 vD; void main(){ vec3 d=normalize(vD); float y=d.y; vec3 zen=vec3(0.16,0.30,0.62)*0.95, hor=vec3(0.62,0.70,0.80)*0.95, gnd=vec3(0.22,0.20,0.16)*0.9; vec3 c = y>0.0 ? mix(hor, zen, pow(y,0.6)) : mix(hor*0.6+gnd*0.4, gnd, smoothstep(0.0,0.25,-y)); c += vec3(1.0,0.94,0.86)*0.8*pow(max(dot(d,uSun),0.0),8.0); gl_FragColor=vec4(c,1.0);} ' })));
scene.environment = pmrem.fromScene(envScene, 0, 0.1, 1000).texture;
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x8a7a62, 0.0); scene.add(hemi);
const dl = new THREE.DirectionalLight(0xfff1e0, 3.2); dl.position.copy(sun).multiplyScalar(300);
dl.castShadow = true; dl.shadow.mapSize.set(4096, 4096);
const sc = dl.shadow.camera; sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160; sc.near = 1; sc.far = 1200;
dl.shadow.bias = -0.0004; dl.shadow.normalBias = 0.04;
scene.add(dl); scene.add(dl.target);
U.uSunDir.value.copy(sun);

const M = materials();
const pk = await (await fetch(`/dev-data/landmarks/${id}.json`)).json();

// terrain patch from packet ground grid
const g = pk.ground;
function groundAt(x, z) {
  const fx = (x - g.x0) / g.step, fz = (z - g.z0) / g.step;
  const i = Math.max(0, Math.min(g.nz - 2, Math.floor(fz))), j = Math.max(0, Math.min(g.nx - 2, Math.floor(fx)));
  const u = Math.max(0, Math.min(1, fx - j)), v = Math.max(0, Math.min(1, fz - i));
  const h = g.h;
  return h[i][j] * (1 - u) * (1 - v) + h[i][j + 1] * u * (1 - v) + h[i + 1][j] * (1 - u) * v + h[i + 1][j + 1] * u * v;
}
{
  const geo = new THREE.PlaneGeometry((g.nx - 1) * g.step, (g.nz - 1) * g.step, g.nx - 1, g.nz - 1);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k) + g.x0 + (g.nx - 1) * g.step / 2, z = p.getZ(k) + g.z0 + (g.nz - 1) * g.step / 2;
    p.setXYZ(k, x, groundAt(x, z), z);
  }
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x7d8f62, roughness: 1 }));
  ground.receiveShadow = true; ground.name = '__ground'; scene.add(ground);
  // footprint outlines
  for (const fp of pk.footprints) {
    const pts = fp.outer.map(([x, z]) => new THREE.Vector3(x, groundAt(x, z) + 0.05, z)); pts.push(pts[0].clone());
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xff2255 })));
  }
}
const mod = await import(`../src/landmarks/${id}.js`);
const t0 = performance.now();
const res = await mod.build({ M, U, THREE, boxUV, footprints: pk.footprints, groundAt, anchor: pk.anchor, packet: pk });
const buildMs = performance.now() - t0;
const obj = res.object3d;
obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
scene.add(obj);
// optional lidar point overlay
if (qs.get('lidar')) {
  const lt = pk.lidarTop; const pos = [];
  for (let i = 0; i < lt.nz; i++) for (let j = 0; j < lt.nx; j++) pos.push(lt.x0 + j * lt.step, lt.h[i][j], lt.z0 + i * lt.step);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xff00ff, size: 0.25 })));
}
const box = new THREE.Box3().setFromObject(obj);
const ctr = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3());
controls.target.copy(ctr);
camera.position.set(ctr.x + sz.length() * 0.9, ctr.y + sz.length() * 0.45, ctr.z + sz.length() * 0.9);
controls.update();

function stats() {
  let tris = 0, meshes = 0, mats = new Set();
  obj.traverse((o) => { if (o.isMesh) { meshes++; const gg = o.geometry; tris += (gg.index ? gg.index.count : gg.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m.uuid)); } });
  return { id, buildMs: Math.round(buildMs), triangles: Math.round(tris), meshes, materials: mats.size, bbox: { min: box.min.toArray().map((v) => +v.toFixed(2)), max: box.max.toArray().map((v) => +v.toFixed(2)) }, colliders: (res.colliders || []).length, walkables: (res.walkables || []).length, interactions: (res.interactions || []).length };
}
// Compare model top surface with LiDAR inside the footprints (or within radius for node landmarks)
function lidarCompare(step = 1.0) {
  const lt = pk.lidarTop; const rc = new THREE.Raycaster(); const down = new THREE.Vector3(0, -1, 0);
  const inside = (x, z) => {
    if (!pk.footprints.length) return Math.hypot(x, z) < 12;
    return pk.footprints.some((fp) => { let c = false; const p = fp.outer; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if (((p[i][1] > z) !== (p[j][1] > z)) && (x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0])) c = !c; } return c; });
  };
  obj.updateMatrixWorld(true);
  let n = 0, sae = 0, rows = [];
  const bb = box;
  for (let z = Math.floor(bb.min.z); z <= bb.max.z; z += step) {
    let row = '';
    for (let x = Math.floor(bb.min.x); x <= bb.max.x; x += step) {
      if (!inside(x, z)) { row += ' '; continue; }
      rc.set(new THREE.Vector3(x, 400, z), down); rc.far = 1000;
      const hit = rc.intersectObject(obj, true)[0];
      const mh = hit ? hit.point.y : groundAt(x, z);
      const fi = Math.round((z - lt.z0) / lt.step), fj = Math.round((x - lt.x0) / lt.step);
      if (fi < 0 || fj < 0 || fi >= lt.nz || fj >= lt.nx) { row += ' '; continue; }
      const lh = lt.h[fi][fj]; const d = mh - lh; n++; sae += Math.abs(d);
      row += Math.abs(d) < 1 ? '.' : d > 0 ? (d < 3 ? '+' : '#') : (d > -3 ? '-' : '=');
    }
    rows.push(row);
  }
  return { cells: n, meanAbsErr: +(sae / Math.max(1, n)).toFixed(2), legend: ". |d|<1m, + model 1-3m higher, # >3m higher, - model 1-3m lower, = >3m lower (north up)", map: rows.join('\n') };
}
function setView(azDeg, elDeg, dist, tx, ty, tz) {
  const t = new THREE.Vector3(tx ?? ctr.x, ty ?? ctr.y, tz ?? ctr.z);
  controls.target.copy(t);
  const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
  camera.position.set(t.x + dist * Math.cos(el) * Math.sin(az), t.y + dist * Math.sin(el), t.z + dist * Math.cos(el) * Math.cos(az));
  camera.lookAt(t); controls.update(); renderer.render(scene, camera);
}
function setNight(n) { U.uNight.value = n; dl.intensity = 3.2 * (1 - n) + 0.1; scene.environmentIntensity = 1 - n * 0.9; renderer.render(scene, camera); }
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(); const dt = (now - last) / 1000; last = now; U.uTime.value += dt;
  if (res.update) res.update(dt, { time: new Date(), night: U.uNight.value, camera });
  controls.update(); renderer.render(scene, camera);
});
Object.assign(window.__harness, { ready: true, stats, lidarCompare, setView, setNight, scene, camera, obj, res, THREE });
info.textContent = JSON.stringify(stats(), null, 1);
