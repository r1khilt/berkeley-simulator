// Hoverboard (a nod to Back to the Future Part II): press X anywhere to hop on.
// Floats ~0.3 m on a spring-damper over a look-ahead max of ground samples, so it glides up and down stairs and slopes.
// Momentum-based carving with a little drift, lean into turns, hover bob, Space to ollie, light air control, Shift to boost.
import * as THREE from 'three';
import { buildHoverboard, HOVER } from './ride-models.js';
import { solveLimb, setWorldQuat, RideSound, clamp, angDiff, damp } from './ride-common.js';
import { resetPose } from './scooter.js';

const KEY = 'KeyX';
const HOVER_H = 0.3, G = 11.5, VMAX = 10.5, VBOOST = 15.5;
const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _q = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _pole = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _up = new THREE.Vector3(0, 1, 0);

export function install(player, ctx) {
  const { scene, audio, ui, setupMaterials } = ctx;
  const ph = ctx.physics || player.ph;
  const sound = new RideSound(audio);
  let board = null;
  const getBoard = () => { if (board) return board; board = buildHoverboard(); board.root.visible = false; board.glow.visible = false; scene.add(board.root, board.glow); setupMaterials && setupMaterials(board.root); return board; };
  const st = { on: false };
  let lastPos = new THREE.Vector3();
  // highest ground under the board footprint, with look-ahead along the velocity (anticipates steps)
  const groundUnder = (x, z, yaw, vx, vz, maxY) => {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw); let g = -1e9, gc = 0;
    const sp = Math.hypot(vx, vz), la = Math.min(1.4, sp * 0.12);
    for (const f of [0, 0.38, -0.38]) { const y = ph.groundAt(x + fx * f, z + fz * f, maxY).y; if (f === 0) gc = y; g = Math.max(g, y); }
    if (la > 0.05) { const y = ph.groundAt(x + vx / sp * la, z + vz / sp * la, maxY).y; g = Math.max(g, y - 0.1); }
    return { g, gc };
  };
  const plugin = {
    key: KEY, label: 'Hoverboard', icon: '🛹',
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 13c2 1.5 16 1.5 18 0"/><path d="M6 17h2M11 18h2M16 17h2" opacity=".6"/></svg>',
    hint: 'W/S speed · A/D carve · Space ollie · Shift boost · X off',
    canEnter() { return true; },
    enter(p) {
      const b = getBoard(); const hs = Math.hypot(p.vel.x, p.vel.z);
      const g0 = ph.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.7).y;
      Object.assign(st, { on: true, x: p.pos.x, z: p.pos.z, y: g0 + 0.05, vy: 2.2, yaw: hs > 0.5 ? Math.atan2(-p.vel.x, -p.vel.z) : p.yaw, vx: p.vel.x, vz: p.vel.z, roll: 0, pitch: 0, air: true, t: 0, steer: 0, crouch: 0.15, crouchV: 0, bobT: Math.random() * 10, ollieCD: 0, yawRate: 0, airT: 0, lastCam: p.camYaw, camIdle: 0, land: 0 });
      b.root.visible = true; b.glow.visible = true; p.jumpReq = false; lastPos.copy(p.pos);
      sound.start('hover'); sound.whoosh();
      this._place(p);
    },
    exit(p) {
      if (!st.on) return; st.on = false; const b = getBoard(); b.root.visible = false; b.glow.visible = false; sound.stop();
      const teleported = p.pos.distanceToSquared(lastPos) > 9;
      if (!teleported) { const g = ph.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.5).y; p.pos.y = Math.max(g, p.pos.y - 0.2); p.vel.set(st.vx * 0.6, Math.max(0, st.vy), st.vz * 0.6); p.onGround = p.pos.y - g < 0.05; }
      p.avatar.root.rotation.order = 'XYZ'; resetPose(p.avatar);
    },
    _place(p) {
      const b = board; const top = HOVER.thick;
      b.root.position.set(st.x, st.y, st.z); b.root.rotation.set(st.pitch, st.yaw, st.roll, 'YXZ'); b.root.updateMatrixWorld(true);
      _v.set(0, top, 0).applyMatrix4(b.root.matrixWorld); p.pos.copy(_v); p.yaw = st.yaw;
      const gy = ph.groundAt(st.x, st.z, st.y + 0.2).y; b.glow.position.set(st.x, gy + 0.03, st.z); b.glow.rotation.set(-Math.PI / 2, 0, st.yaw);
      const h = st.y - gy; const k = clamp(1.25 - h * 0.9, 0, 1); b.glow.material.opacity = 0.55 * k; b.glow.scale.setScalar(0.8 + h * 0.5);
    },
    update(p, dt, inp) {
      if (!st.on) { p.setMode('walk'); return 0; }
      if (p.pos.distanceToSquared(lastPos) > 9) { // teleported (map travel / respawn): bring the board along
        st.x = p.pos.x; st.z = p.pos.z; st.y = ph.groundAt(st.x, st.z, p.pos.y + 1).y + HOVER_H; st.vx = st.vz = st.vy = 0;
      }
      st.t += dt; st.ollieCD -= dt;
      const fx = -Math.sin(st.yaw), fz = -Math.cos(st.yaw), rx = -fz, rz = fx; // forward and right
      let vf = st.vx * fx + st.vz * fz, vr = st.vx * rx + st.vz * rz;
      const boost = inp.sprint, vmax = boost ? VBOOST : VMAX;
      // ---- thrust / brake (ground has more authority than air)
      const auth = st.air ? 0.25 : 1;
      if (inp.f > 0) vf += clamp(vmax * inp.f - vf, 0, (boost ? 7 : 5.2) * dt * auth * (1 - Math.max(0, vf) / (vmax * 1.15)) * 1.6);
      else if (inp.f < 0) vf = vf > 0 ? Math.max(0, vf - 7 * dt * auth) : Math.max(-3.2, vf - 3 * dt * auth);
      vf -= (0.12 * vf + 0.01 * vf * Math.abs(vf)) * dt; // light air drag
      // ---- carving: yaw rate falls off with speed; lateral slip decays (grip) -> slight drift
      const sIn = -inp.s; const sp = Math.hypot(vf, vr);
      const rateMax = st.air ? 1.4 : 2.7 - Math.min(1.3, sp * 0.085);
      st.steer += (sIn - st.steer) * damp(st.air ? 4 : 9, dt);
      const yawRate = st.steer * rateMax * (vf < -0.2 ? -1 : 1); st.yaw += yawRate * dt; st.yawRate = yawRate;
      vr -= vr * damp(st.air ? 0.5 : 4.2, dt);
      // ---- slope assist: hovering downhill speeds you up a little
      const gAhead = ph.groundAt(st.x + fx * 0.6, st.z + fz * 0.6, st.y + 0.6).y, gBack = ph.groundAt(st.x - fx * 0.6, st.z - fz * 0.6, st.y + 0.6).y;
      const slope = clamp((gAhead - gBack) / 1.2, -0.8, 0.8);
      if (!st.air) vf -= 9.81 * slope * 0.45 * dt;
      // recombine with the new heading
      const nfx = -Math.sin(st.yaw), nfz = -Math.cos(st.yaw), nrx = -nfz, nrz = nfx;
      st.vx = nfx * vf + nrx * vr; st.vz = nfz * vf + nrz * vr;
      // ---- move + walls (bounce off with a little restitution)
      let nx = st.x + st.vx * dt, nz = st.z + st.vz * dt;
      const res = ph.resolve(nx, nz, 0.42, st.y, 1.7);
      if (res[2]) { const px = res[0] - nx, pz = res[1] - nz, pl = Math.hypot(px, pz); if (pl > 1e-6) { const n0 = px / pl, n1 = pz / pl; const vn = st.vx * n0 + st.vz * n1; if (vn < 0) { st.vx -= 1.35 * vn * n0; st.vz -= 1.35 * vn * n1; if (vn < -3) sound.thud(Math.min(1, -vn / 9)); } } nx = res[0]; nz = res[1]; }
      // ---- hover: spring-damper toward ground + HOVER_H (+ bob); free fall when high above it
      const { g } = groundUnder(nx, nz, st.yaw, st.vx, st.vz, st.y + 0.95);
      st.bobT += dt; const bob = Math.sin(st.bobT * 2.3) * 0.022 + Math.sin(st.bobT * 5.1) * 0.006;
      const target = g + HOVER_H + bob - st.crouch * 0.25; const h = st.y - target;
      if (p.jumpReq) { p.jumpReq = false; if ((!st.air || st.airT < 0.15) && st.ollieCD <= 0) { st.vy = 5.4 + Math.min(1.2, sp * 0.06); st.air = true; st.airT = 0.2; st.ollieCD = 0.35; st.crouchV = -2.2; sound.whoosh(); } }
      if (h > 0.55 || (st.air && st.vy > 0 && st.airT > 0)) { st.vy -= G * dt; st.air = true; st.airT += dt; } // ballistic while rising after an ollie
      else { const kS = 95, cS = 15; st.vy += (-kS * h - cS * st.vy) * dt - (h > 0 ? G * 0.15 * dt : 0); if (st.air && st.airT > 0.25) { const s = clamp((-st.vy + 1) / 6, 0.15, 1); sound.land(s); st.crouchV += 2.5 * s; } st.air = false; st.airT = 0; }
      let ny = st.y + st.vy * dt; if (ny < g + 0.06) { ny = g + 0.06; if (st.vy < 0) st.vy *= -0.2; }
      // ---- board attitude: lean into the carve, pitch with slope / acceleration / vertical speed
      const rollT = clamp(yawRate * Math.max(2, sp) * 0.06, -0.5, 0.5) + Math.sin(st.bobT * 3.7) * 0.015;
      st.roll += (rollT - st.roll) * damp(st.air ? 3 : 8, dt);
      const pitchT = st.air ? clamp(st.vy * 0.05, -0.3, 0.3) : Math.atan(slope) * 0.85 + clamp(inp.f * 0.05, -0.05, 0.05) + Math.sin(st.bobT * 2.9) * 0.012;
      st.pitch += (pitchT - st.pitch) * damp(st.air ? 3 : 7, dt);
      // crouch spring (absorbs landings, compresses for ollies)
      st.crouchV += ((st.air ? 0.28 : 0.12 + (inp.down ? 0.18 : 0)) - st.crouch) * 60 * dt - st.crouchV * 9 * dt; st.crouch = clamp(st.crouch + st.crouchV * dt, 0.02, 0.38);
      st.x = nx; st.z = nz; st.y = ny;
      this._place(p); lastPos.copy(p.pos);
      p.vel.set(st.vx, st.vy, st.vz); p.onGround = !st.air;
      sound.update(clamp(sp / VBOOST, 0, 1.2), Math.max(0, inp.f), { air: st.air, climb: clamp(st.vy * 0.3, -1, 1) });
      // chase camera when the mouse is idle
      if (Math.abs(angDiff(st.lastCam, p.camYaw)) > 1e-5) st.camIdle = 0; else st.camIdle += dt;
      if (st.camIdle > 1.0 && sp > 2) p.camYaw += angDiff(p.camYaw, Math.atan2(-st.vx, -st.vz)) * damp(0.35 + sp * 0.08, dt);
      st.lastCam = p.camYaw;
      return sp;
    },
    pose(p, av) {
      if (p.mode !== 'hoverboard' || !st.on) return;
      const P = av.p, b = board; b.root.getWorldQuaternion(_q);
      // surf stance: regular (left foot forward) -> body faces the board's right side
      _e.set(0, st.yaw - Math.PI / 2, 0, 'YXZ'); av.root.rotation.copy(_e);
      // lean with the board's roll (toe/heel side) by tilting the hips
      P.hips.position.set(0, 0.94 - st.crouch, 0); P.hips.rotation.set(st.roll * 0.6, 0, 0);
      P.spine.rotation.set(-0.18 - st.crouch * 0.4, 0.3, st.pitch * 0.3); P.head.rotation.set(0.1, 0.8, 0);
      av.root.updateMatrixWorld(true);
      for (const s of [-1, 1]) { // s=-1 left foot at the nose
        _a.set(s * 0.02, HOVER.thick, s * 0.21);
        _qb.setFromAxisAngle(_up, -Math.PI / 2 + (s < 0 ? 0.25 : -0.1)); const back = _v.set(0, 0.072, 0.05).applyQuaternion(_qb); _a.add(back).applyMatrix4(b.root.matrixWorld);
        _pole.set(1, 0.3, 0).applyQuaternion(_q); // knees toward the toe edge
        solveLimb(P['hip' + s], P['kn' + s], 0.45, 0.44, _a, _pole);
        setWorldQuat(P['ft' + s], _q.clone().multiply(_qb));
      }
      // arms out for balance; they swing with the carve
      const c = clamp(st.steer, -1, 1), air = st.air ? 1 : 0;
      for (const s of [-1, 1]) { P['sh' + s].rotation.set(0.2 * s * c + 0.15, 0, s * (0.9 + 0.25 * air) + 0.2 * c); P['el' + s].rotation.set(-0.5 - 0.2 * air, 0, 0); }
    },
  };
  player.registerMode('hoverboard', plugin);
  if (ui && ui.addTouchButton) ui.addTouchButton('HOVER', () => player.setMode(player.mode === 'hoverboard' ? 'walk' : 'hoverboard'));
  if (typeof window !== 'undefined' && window.BSIM) window.BSIM.hoverboard = { plugin, state: st };
  return plugin;
}
