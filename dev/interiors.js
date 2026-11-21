// Test bench for window interiors (src/world/interiors.js): a synthetic street of procedural buildings of each style/use
// plus optional real landmark modules (?lm=sproul-hall,martin-luther-king-jr-student-union) placed beside it.
// URL: /dev/interiors.html?night=0&lm=sproul-hall   — window.__T.shot([px,py,pz,tx,ty,tz]) renders a view.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { materials, U, boxUV } from '../src/materials.js';
import { buildBuildings } from '../src/world/buildings.js';
import { applyInteriorGlass } from '../src/world/interiors.js';
import { installGrading } from '../src/world/grading.js';
installGrading();
const qs = new URLSearchParams(location.search);
const info = document.getElementById('info');
const errors = []; window.addEventListener('error', (e) => errors.push(String(e.message)));
window.__T = { ready: false, errors };
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.CustomToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.2, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
const night = parseFloat(qs.get('night') || '0'); U.uNight.value = night;
const dayK = 1 - night;
const zen = new THREE.Color(0.16, 0.30, 0.62).lerp(new THREE.Color(0.05, 0.07, 0.16), night), hor = new THREE.Color(0.62, 0.70, 0.80).lerp(new THREE.Color(0.85, 0.55, 0.4), Math.min(1, night * 1.6) * (1 - night)).lerp(new THREE.Color(0.06, 0.07, 0.12), night * night);
U.uSkyZen.value.copy(zen); U.uSkyHor.value.copy(hor);
scene.background = hor.clone();
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { uZ: { value: zen }, uH: { value: hor } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 uZ, uH; varying vec3 vD; void main(){ float y=normalize(vD).y; vec3 g=vec3(0.22,0.2,0.16)*0.6; vec3 c = y>0.0 ? mix(uH, uZ, pow(y,0.6)) : mix(uH*0.6+g*0.4, g, smoothstep(0.0,0.25,-y)); gl_FragColor=vec4(c,1.0);} ' })));
scene.environment = pmrem.fromScene(envScene, 0, 0.1, 1000).texture; scene.environmentIntensity = 0.68 * (0.15 + 0.85 * dayK);
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(58 + 30 * night), THREE.MathUtils.degToRad(-25));
const dl = new THREE.DirectionalLight(new THREE.Color(1, 0.94, 0.86).lerp(new THREE.Color(1, 0.6, 0.35), night), 3.2 * Math.max(0.02, 1 - night * 1.15)); dl.position.copy(sunDir).multiplyScalar(300);
dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); const sc = dl.shadow.camera; sc.left = -120; sc.right = 120; sc.top = 120; sc.bottom = -120; sc.far = 1000; dl.shadow.bias = -0.0004;
scene.add(dl, dl.target);
const M = materials();
// ground
const gnd = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), M.asphalt); gnd.receiveShadow = true; scene.add(gnd);
// synthetic procedural buildings: [style, name, width, depth, height, x, z, rotation]
const STY = { classical: 0, brick: 1, stucco: 2, concrete: 3, glass: 4, house: 5, apartment: 6, commercial: 7, industrial: 8, church: 9, brutal: 10, shingle: 11 };
const specs = [
  ['commercial', 'Telegraph Shops', 26, 16, 14, -60, 0], ['apartment', '', 22, 16, 13, -30, 0], ['concrete', 'Tan Hall', 30, 18, 20, 0, 0],
  ['brick', 'Doe Library Annex', 24, 18, 15, 34, 0], ['house', '', 10, 12, 8, 58, 0], ['glass', 'Office Tower', 24, 18, 26, 84, 0],
  ['stucco', 'Unit 1 Residence Hall', 26, 16, 18, -60, 50], ['classical', 'Sproul Hall', 30, 18, 16, -26, 50], ['brutal', 'Evans Hall', 30, 20, 24, 10, 50],
  ['commercial', 'Cafe Strada', 20, 14, 9, 44, 50],
];
const pal = { 0: 'ddd6cc', 1: '8f4c38', 2: 'ebdcc1', 3: 'c7c4bd', 4: 'cccccc', 5: 'b8c4b0', 6: 'd6cdbb', 7: 'd0c7b5', 8: 'b8b8b3', 9: 'e0d9c7', 10: 'a8a69e', 11: '6b4f38' };
const data = { names: [], b: [] };
specs.forEach(([st, name, w, d, h, x, z], i) => {
  const s = STY[st]; let ni = -1; if (name) { ni = data.names.length; data.names.push(name); }
  const ring = [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]];
  const flat = ring.flatMap(([a, b]) => [Math.round(a * 10), Math.round(b * 10)]);
  data.b.push([`w/${1000 + i * 7919}`, s, 0, pal[s], '7a6a5a', ni, 0, [[h, 0, 0, 0, 0, flat, []]]]);
});
const bres = buildBuildings(data, { heightAt: () => 0 });
// debug toggles: ?dbg=noblind,noint,norefl,nolod
const dbg = (qs.get('dbg') || '').split(',');
const REP = { noblind: ['vec4 cov = irCover(t, win, wseed, lit, lampC);', 'vec4 cov = vec4(0.0);'], noint: ['interior = mix(interior, irAverage(', 'interior = 0.0 * mix(interior, irAverage('],
  norefl: ['+ refl * kRefl * wmask * 0.85;', ';'], rox: ['vec3 col = irShade(t, R, yF, seed, lit, lampC);', 'vec3 col = vec3(fract(ro.x), fract(ro.y), 0.0) * 0.4;'],
  mat: ['vec3 col = irShade(t, R, yF, seed, lit, lampC);', 'vec3 col = (irMat <= 2 ? vec3(0.15) + 0.1 * vec3(irNrm.x, irNrm.y, -irNrm.z) : vec3(fract(float(irMat) * 0.37), fract(float(irMat) * 0.71), fract(float(irMat) * 0.13)) * 0.6);'],
  lab: ['int rType = irFloorType(bUse, fi,', 'int rType = IR_LAB + 0 * irFloorType(bUse, fi,'], office: ['int rType = irFloorType(bUse, fi,', 'int rType = IR_OFFICE + 0 * irFloorType(bUse, fi,'],
  rdx: ['vec3 col = irShade(t, R, yF, seed, lit, lampC);', 'vec3 col = (rd * 0.5 + 0.5) * 0.4;'], tdbg: ['vec3 col = irShade(t, R, yF, seed, lit, lampC);', 'vec3 col = vec3(fract(irT), fract(irT * 0.25), 0.0) * 0.4;'], flat: ['vec3 col = irShade(t, R, yF, seed, lit, lampC);', 'vec3 col = (irNrm * 0.5 + 0.5) * 0.3;'] };
for (const mat of [bres.wallMat]) { const prev = mat.onBeforeCompile; mat.onBeforeCompile = (sh, r) => { prev(sh, r); for (const d of dbg) if (REP[d]) { if (!sh.fragmentShader.includes(REP[d][0])) console.warn('dbg pattern missing', d); sh.fragmentShader = sh.fragmentShader.replace(REP[d][0], REP[d][1]); } }; mat.customProgramCacheKey = () => 'facade-dbg-' + dbg.join('-'); }
scene.add(bres.group);
// landmark modules beside the street (packets from /dev-data)
const lms = (qs.get('lm') || '').split(',').filter(Boolean);
let lx = -40;
for (const id of lms) {
  const pk = await (await fetch(`/dev-data/landmarks/${id}.json`)).json();
  const mod = await import(`../src/landmarks/${id}.js`);
  const res = await mod.build({ THREE, M, U, boxUV, groundAt: () => 0, footprints: pk.footprints, anchor: pk.anchor, packet: pk });
  const obj = res.object3d; obj.position.set(lx, 0, -80); lx += 110;
  const n = applyInteriorGlass(obj, { id, name: mod.info && mod.info.name, tag: pk.footprints[0]?.tags?.building, M });
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(obj); console.log('landmark', id, 'glass meshes', n);
}
camera.position.set(-20, 1.7, 30); controls.target.set(-20, 6, 0); controls.update();
function render() { renderer.render(scene, camera); }
window.__T.shot = (v) => { if (v) { camera.position.set(v[0], v[1], v[2]); controls.target.set(v[3], v[4], v[5]); camera.lookAt(v[3], v[4], v[5]); } const t0 = performance.now(); render(); const gl = renderer.getContext(); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return { url: renderer.domElement.toDataURL('image/jpeg', 0.9), ms: performance.now() - t0 }; };
window.__T.setNight = (n) => { U.uNight.value = n; };
controls.addEventListener('change', render);
render();
info.textContent = 'interiors bench — night ' + night + (errors.length ? '\n' + errors.join('\n') : '');
window.__T.ready = true;
