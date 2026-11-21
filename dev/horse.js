// Look-dev harness for the rideable horse: isolated scene, scripted gait/phase control for screenshots.
import * as THREE from 'three';
import { loadHorseRig } from '../src/player/modes/horse-rig.js';
import { Avatar } from '../src/player/avatar.js';
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#a9c3d9');
const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
scene.add(new THREE.HemisphereLight('#cfe3ff', '#5a4a32', 1.1));
const sun = new THREE.DirectionalLight('#fff3e0', 2.6); sun.position.set(6, 10, 4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6; scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#6f7a4c', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const H = (window.H = { ready: false });
loadHorseRig().then((rig) => {
  scene.add(rig.root); H.rig = rig;
  H.av = new Avatar({}); H.av.root.visible = false; scene.add(H.av.root);
  H.pose = (gaitW, phase, extra = {}) => { rig.phase = phase; rig.animate(0, { gaitW, cadence: 0, ...extra }); rig.root.updateMatrixWorld(true); };
  H.view = (px, py, pz, tx, ty, tz) => { cam.position.set(px, py, pz); cam.lookAt(tx, ty, tz); };
  H.shot = () => { renderer.render(scene, cam); return renderer.domElement.toDataURL('image/jpeg', 0.9); };
  H.ready = true; document.getElementById('info').textContent = 'ready';
}).catch((e) => { H.error = String(e.stack || e); document.getElementById('info').textContent = H.error; });
