// r4-props2: close-up viewer for src/props/statues.js builders under game-like light.
// URL: /dev/statues.html?id=bench1920   window.__st.view(az, el, dist, targetY) then screenshot.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { materials, U } from '../src/materials.js';
import * as S from '../src/props/statues.js';
const qs = new URLSearchParams(location.search);
const id = qs.get('id') || 'goldenBear';
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 2000);
const sky = new Sky(); sky.scale.setScalar(1000); scene.add(sky);
const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(+(qs.get('sunel') ?? 50)), THREE.MathUtils.degToRad(+(qs.get('sunaz') ?? 200)));
sky.material.uniforms.sunPosition.value.copy(sun); sky.material.uniforms.turbidity.value = 4;
const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(sky.clone()); scene.environment = pm.fromScene(es).texture; scene.environmentIntensity = 0.35;
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x8a7a62, 0.35));
const dl = new THREE.DirectionalLight(0xfff1dd, 2.6); dl.position.copy(sun).multiplyScalar(30); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048);
Object.assign(dl.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 90 }); dl.shadow.bias = -0.0003; dl.shadow.normalBias = 0.02; scene.add(dl);
U.uSunDir && U.uSunDir.value.copy(sun);
const M = materials();
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), qs.get('grass') ? M.turf : M.paving); ground.receiveShadow = true; scene.add(ground);
const info = document.getElementById('info');
window.__st = { ready: false, errors: [] };
window.addEventListener('error', (e) => window.__st.errors.push(String(e.message)));
const obj = await S[id](); scene.add(obj);
let tris = 0; obj.traverse((o) => { if (o.isMesh && o.visible) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
info.textContent = id + '  tris(all levels) ' + Math.round(tris);
window.__st.view = (az, el, dist, ty = 1.0, tx = 0, tz = 0) => {
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  camera.position.set(tx + Math.sin(a) * Math.cos(e) * dist, ty + Math.sin(e) * dist, tz + Math.cos(a) * Math.cos(e) * dist); camera.lookAt(tx, ty, tz);
  obj.traverse((o) => { if (o.isLOD) o.update(camera); });
  renderer.render(scene, camera);
};
window.__st.view(30, 10, 6);
window.__st.ready = true;
