// Carillon bells for Sather Tower (r4-campanile): 61 cast-bronze bells with a proper tuned-bell profile and crown, a clapper in
// each bell that strikes when the note plays (pulled toward the clavier, then sprung back), a shudder of the bell on impact,
// and the external hour hammer on the Great Bear Bell (bell 0). Carillon bells hang "dead" (they never swing); what you see
// is the clapper hitting the sound bow. Instanced, so ringing costs a few matrix updates per frame.
import * as THREE from 'three';

// unit-diameter bell (lip at y=0): inner and outer lathe profile of a tuned carillon bell (thick sound bow, waist, shoulder, crown)
function bellGeometry(segs) {
  const inner = [[0.0, 0.705], [0.2, 0.69], [0.28, 0.6], [0.305, 0.43], [0.36, 0.24], [0.425, 0.08], [0.452, 0.02]];
  const outer = [[0.5, 0.0], [0.495, 0.06], [0.45, 0.15], [0.38, 0.3], [0.345, 0.48], [0.332, 0.64], [0.3, 0.75], [0.2, 0.805], [0.0, 0.82]];
  const g = new THREE.LatheGeometry([...inner, ...outer].map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), segs);
  // cast bands: two thin raised rings on the waist and one above the sound bow
  const bands = [[0.465, 0.11, 0.009]].map(([r, y, t]) => new THREE.TorusGeometry(r, t, 4, segs).rotateX(Math.PI / 2).translate(0, y, 0));
  // crown: a cast loop (canon) the bell hangs from
  const crown = new THREE.TorusGeometry(0.07, 0.022, 6, 12).translate(0, 0.86, 0);
  const crownB = new THREE.CylinderGeometry(0.085, 0.1, 0.05, 12).translate(0, 0.835, 0);
  const parts = [g, ...bands, crown, crownB].map((p) => { p = p.index ? p.toNonIndexed() : p; for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'uv'].includes(k)) p.deleteAttribute(k); if (!p.attributes.uv) p.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2)); return p; });
  return mergeGeoms(parts); // keep each part's smooth normals
}
function mergeGeoms(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of list) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array.subarray(0, c * 2), o * 2); o += c; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return out;
}

// slots[i] = [u, yHang, v] (frame space), D[i] = diameter. F = tower frame. Returns { objects, strike(i, vel), hammer(), update(dt) }.
export function buildCarillon(M, F, slots, D, { quality = 'high' } = {}) {
  const segs = quality === 'low' ? 12 : quality === 'medium' ? 16 : quality === 'ultra' ? 28 : 20;
  const bellMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48, metalness: 0.82 }); bellMat.name = 'campanileBellBronze';
  const N = D.length;
  const bells = new THREE.InstancedMesh(bellGeometry(segs), bellMat, N); bells.name = 'campanile-bells';
  const clapGeo = mergeGeoms([new THREE.CylinderGeometry(0.012, 0.014, 0.46, 6).translate(0, -0.28, 0), new THREE.SphereGeometry(0.06, 10, 8).scale(1, 1.25, 1).translate(0, -0.53, 0), new THREE.CylinderGeometry(0.02, 0.02, 0.05, 6).translate(0, -0.03, 0)].map((p) => p.toNonIndexed()));
  const clappers = new THREE.InstancedMesh(clapGeo, M.iron, N); clappers.name = 'campanile-clappers';
  const col = new THREE.Color();
  // per-bell state; the clapper swings in the vertical plane toward the tower axis (where the clavier wires run)
  const st = D.map((d, i) => {
    const [u, yh, v] = slots[i]; const h = 0.82 * d;
    let ax = -u, az = -v; const l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
    const axis = new THREE.Vector3(az, 0, -ax);            // rotate about this to swing the clapper toward (ax, az)
    const tone = 0.85 + ((i * 7919) % 13) / 13 * 0.25, green = ((i * 104729) % 7) / 7;
    col.setRGB(0.58 * tone * (1 - 0.18 * green), 0.43 * tone * (1 + 0.05 * green), 0.27 * tone * (1 + 0.25 * green)); bells.setColorAt(i, col);
    return { u, yh, v, d, h, axis, t: 9, vel: 0, shake: 0, hit: Math.asin(Math.min(0.95, (0.4 - 0.065) / 0.55)) };
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), tmp = new THREE.Matrix4();
  const setBell = (i, e) => {
    const b = st[i]; q.setFromAxisAngle(b.axis, e * 0.012 * Math.sin(b.t * 70)); // shudder: a few millimetres at the lip
    tmp.compose(p3.set(b.u, b.yh, b.v), q, s3.set(1, 1, 1));
    m4.makeTranslation(0, -0.07 - b.h, 0).premultiply(tmp); m4.multiply(new THREE.Matrix4().makeScale(b.d, b.d, b.d)); m4.premultiply(F); bells.setMatrixAt(i, m4);
  };
  const setClapper = (i, ang) => {
    const b = st[i]; q.setFromAxisAngle(b.axis, ang);
    m4.compose(p3.set(b.u, b.yh - 0.07 - b.h + 0.66 * b.d, b.v), q, s3.set(b.d, b.d, b.d)); m4.premultiply(F); clappers.setMatrixAt(i, m4);
  };
  for (let i = 0; i < N; i++) { setBell(i, 0); setClapper(i, st[i].hit * 0.55); }
  bells.instanceMatrix.needsUpdate = true; clappers.instanceMatrix.needsUpdate = true; if (bells.instanceColor) bells.instanceColor.needsUpdate = true;
  bells.castShadow = true; bells.receiveShadow = true; clappers.castShadow = false; clappers.frustumCulled = false; bells.frustumCulled = false;
  // external hour hammer on the Great Bear Bell (bell 0): a lever pivoting above the bell's shoulder, head at the sound bow
  const b0 = st[0];
  const out = new THREE.Vector3(-b0.u, 0, -b0.v).normalize().multiplyScalar(-1);   // away from the tower axis
  const hammer = new THREE.Group(); hammer.name = 'campanile-hour-hammer';
  const R0 = 0.5 * b0.d + 0.09, L0 = 0.87 * b0.d;            // head touches the sound bow when the arm hangs plumb
  const pivot = new THREE.Vector3(b0.u + out.x * R0, b0.yh - 0.07 - b0.h + 0.95 * b0.d, b0.v + out.z * R0);
  hammer.position.copy(pivot);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, L0, 0.06).translate(0, -L0 / 2, 0), M.iron); hammer.add(arm);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 10).rotateX(Math.PI / 2).translate(0, -L0, 0), M.iron); hammer.add(head);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8).rotateZ(Math.PI / 2), M.iron); hammer.add(axle);
  hammer.lookAt(pivot.clone().add(out)); // local +z points outward
  const hamQ0 = hammer.quaternion.clone(), hamAxis = new THREE.Vector3(1, 0, 0);
  const hamGroup = new THREE.Group(); hamGroup.matrixAutoUpdate = false; hamGroup.matrix.copy(F); hamGroup.add(hammer);
  let ham = { t: 9, lift: 0 };
  const setHammer = (a) => { hammer.quaternion.copy(hamQ0).multiply(new THREE.Quaternion().setFromAxisAngle(hamAxis, a)); };
  setHammer(-0.05);
  const active = new Set();
  return {
    objects: [bells, clappers, hamGroup],
    strike(i, vel = 1) { if (i < 0 || i >= N) return; const b = st[i]; b.t = 0; b.vel = vel; active.add(i); },
    hammer() { ham.t = 0; },
    update(dt) {
      let dirty = false;
      for (const i of active) {
        const b = st[i]; b.t += dt;
        // clapper: fast pull to the bow (40 ms), short dwell, sprung return; bell shudder decays over ~0.4 s
        const a = b.t < 0.04 ? b.t / 0.04 : Math.exp(-(b.t - 0.04) / 0.11);
        setClapper(i, b.hit * (0.55 + 0.45 * a));
        setBell(i, b.t > 0.04 ? b.vel * Math.exp(-(b.t - 0.04) / 0.12) : 0);
        if (b.t > 1.0) { setClapper(i, b.hit * 0.55); setBell(i, 0); active.delete(i); }
        dirty = true;
      }
      if (ham.t < 3) { ham.t += dt; const t = ham.t; const a = t < 0.7 ? -0.05 - 0.45 * Math.sin((t / 0.7) * Math.PI / 2) : t < 0.8 ? -0.5 + 0.5 * ((t - 0.7) / 0.1) : -0.05 * Math.min(1, (t - 0.8) / 0.4); setHammer(a); if (t >= 0.8 && t - dt < 0.8) this.strike(0, 1.4); }
      if (dirty) { bells.instanceMatrix.needsUpdate = true; clappers.instanceMatrix.needsUpdate = true; }
    },
  };
}
