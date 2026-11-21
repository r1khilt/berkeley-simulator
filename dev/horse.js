// Look-dev harness for the rideable horse: isolated scene, the real Horse mode class on a flat mock world.
import * as THREE from 'three';
import { Horse } from '../src/player/modes/horse.js';
import { Avatar } from '../src/player/avatar.js';
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#a9c3d9');
const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
scene.add(new THREE.HemisphereLight('#cfe3ff', '#5a4a32', 1.1));
const sun = new THREE.DirectionalLight('#fff3e0', 2.6); sun.position.set(6, 10, 4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); for (const k of ['left', 'bottom']) sun.shadow.camera[k] = -6; for (const k of ['right', 'top']) sun.shadow.camera[k] = 6; scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#6f7a4c', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const physics = { groundAt: () => ({ y: 0, on: null }), resolve: (x, z) => [x, z, false], rayWall: (x, z, y, dx, dz, m) => m, addCircle() {}, addSeg() {} };
const av = new Avatar({}); scene.add(av.root);
const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, camYaw: 0, camera: cam, interactions: [], avatar: av, mode: 'walk', setMode() {}, view: 'third' };
const H = (window.H = { ready: false });
const horse = new Horse(player, { scene, physics, audio: null, setupMaterials: null });
horse.pos.set(0, 0, 0); horse.yaw = 0;
horse.ensure().then(() => {
  horse.pos.set(0, 0, 0); horse.yaw = 0; H.horse = horse; H.av = av;
  // ride state: set speed, step animation to a phase, pose rider
  H.ride = (speed, phase, { mount = 0, riderOn = true, jumpT = -1 } = {}) => {
    horse.state = riderOn ? 'ridden' : 'parked'; horse.speed = speed; horse.mountT = mount; horse.jumpT = jumpT; horse.jumpW = jumpT >= 0 ? 1 : 0;
    for (let i = 0; i < 40; i++) horse.animate(1 / 30, true);           // settle blend weights
    horse.rig.phase = phase; horse.rig.animate(0, { gaitW: horse.gw, cadence: 0, idleKind: 'idle', jumpT, jumpW: horse.jumpW });
    horse._place(1);
    av.root.visible = riderOn; if (riderOn) { av.animate(1 / 30, 0, true, 'horse'); horse.pose(av, 1 / 30); }
    horse.tack(av, riderOn, 1 / 30);
  };
  H.view = (px, py, pz, tx, ty, tz) => { cam.position.set(px, py, pz); cam.lookAt(tx, ty, tz); };
  H.shot = () => { renderer.render(scene, cam); return renderer.domElement.toDataURL('image/jpeg', 0.9); };
  H.ready = true; document.getElementById('info').textContent = 'ready';
}).catch((e) => { H.error = String(e.stack || e); document.getElementById('info').textContent = H.error; });
