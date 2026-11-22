// r4-props: viewer for baked sculptures (public/assets/sculpt/*.bin) under game-like light.
// URL: /dev/sculpt.html?names=lion-m,lion-f   window.__sc.view(az, el, dist, targetY) then screenshot.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { materials, U } from '../src/materials.js';
import { loadSculpt, sculptMaterial } from '../src/props/sculpt.js';
const qs = new URLSearchParams(location.search);
const names = (qs.get('names') || 'lion-m,lion-f').split(',');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 2000);
const sky = new Sky(); sky.scale.setScalar(1000); scene.add(sky);
const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(+(qs.get('sunel') ?? 50)), THREE.MathUtils.degToRad(+(qs.get('sunaz') ?? 200)));
sky.material.uniforms.sunPosition.value.copy(sun); sky.material.uniforms.turbidity.value = 4;
const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(sky.clone()); scene.environment = pm.fromScene(es).texture; scene.environmentIntensity = 0.3;
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x8a7a62, 0.35));
const dl = new THREE.DirectionalLight(0xfff1dd, 2.6); dl.position.copy(sun).multiplyScalar(20); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048);
Object.assign(dl.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 60 }); dl.shadow.bias = -0.0003; dl.shadow.normalBias = 0.01; scene.add(dl);
U.uSunDir && U.uSunDir.value.copy(sun);
const M = materials();
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), M.paving); ground.receiveShadow = true; scene.add(ground);
const info = document.getElementById('info');
window.__sc = { ready: false, errors: [] };
window.addEventListener('error', (e) => window.__sc.errors.push(String(e.message)));
const group = new THREE.Group(); scene.add(group);
let tris = 0;
const geos = await Promise.all(names.map((n) => loadSculpt(n)));
geos.forEach((g, i) => {
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.5), M.granite); plinth.position.set((i - (geos.length - 1) / 2) * 2.2, 0.5, 0); plinth.castShadow = plinth.receiveShadow = true; group.add(plinth);
  const m = new THREE.Mesh(g, qs.get('ao') ? new THREE.MeshBasicMaterial({ vertexColors: true }) : sculptMaterial(M.granite, { color: 0xd9d5cc })); m.position.set(plinth.position.x, 1.0, 0); m.castShadow = m.receiveShadow = true; group.add(m);
  tris += g.attributes.position.count / 3;
});
info.textContent = names.join(', ') + '  tris ' + tris;
window.__sc.view = (az, el, dist, ty = 1.8, tx = 0) => {
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  camera.position.set(tx + Math.sin(a) * Math.cos(e) * dist, ty + Math.sin(e) * dist, Math.cos(a) * Math.cos(e) * dist); camera.lookAt(tx, ty, 0);
  renderer.render(scene, camera);
};
window.__sc.view(20, 8, 6);
window.__sc.ready = true;
