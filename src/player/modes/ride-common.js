// Shared helpers for ride plugins: 2-bone limb IK for rider poses, procedural ride audio, and a ground-type sampler
// (asphalt / pavement masks from the terrain SDF, used to synthesise kerb bumps where road meets sidewalk).
import * as THREE from 'three';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
export const damp = (k, dt) => 1 - Math.exp(-k * dt);

// ---------------------------------------------------------------- rider IK
const _T = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _u = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4();
// Point a two-bone limb (root joint -> mid joint -> end) at a world-space target. Limbs hang along local -y at rest;
// the mid joint bends about its local x. `pole` (world direction) chooses the side the knee/elbow points to.
export function solveLimb(root, mid, L1, L2, target, pole) {
  const parent = root.parent; parent.updateWorldMatrix(true, false);
  _T.copy(target); parent.worldToLocal(_T);
  _d.subVectors(_T, root.position); let dist = _d.length(); if (dist < 1e-5) return; _d.divideScalar(dist);
  dist = clamp(dist, Math.abs(L1 - L2) + 0.02, L1 + L2 - 0.002);
  parent.getWorldQuaternion(_q).invert(); _p.copy(pole).applyQuaternion(_q);
  _p.addScaledVector(_d, -_p.dot(_d)); if (_p.lengthSq() < 1e-8) _p.set(0, 0, -1).addScaledVector(_d, -_d.z); _p.normalize();
  const a = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
  _u.copy(_d).multiplyScalar(Math.cos(a)).addScaledVector(_p, Math.sin(a)); // upper bone direction
  _y.copy(_u).negate(); _x.crossVectors(_u, _p).normalize(); _z.crossVectors(_x, _y);
  _m.makeBasis(_x, _y, _z); root.quaternion.setFromRotationMatrix(_m);
  const flex = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2), -1, 1));
  mid.rotation.set(-flex, 0, 0);
}
// orient a joint so its world rotation equals `worldQuat`
export function setWorldQuat(obj, worldQuat) { obj.parent.updateWorldMatrix(true, false); obj.parent.getWorldQuaternion(_q2).invert(); obj.quaternion.copy(_q2.multiply(worldQuat)); }

// ---------------------------------------------------------------- ride audio (WebAudio; built lazily on the game's AudioContext)
export class RideSound {
  constructor(audio) { this.audio = audio; this.on = false; this.nodes = null; }
  get ctx() { return this.audio && this.audio.started ? this.audio.ctx : null; }
  // kind: 'motor' (e-scooter hub motor whine + tyre roar) | 'hover' (deep hum + air)
  start(kind) {
    const c = this.ctx; if (!c || this.nodes) return; this.kind = kind;
    const out = c.createGain(); out.gain.value = 0; out.connect(this.audio.master);
    const n = { out, oscs: [] };
    if (kind === 'motor') {
      const o1 = c.createOscillator(); o1.type = 'sawtooth'; const o2 = c.createOscillator(); o2.type = 'triangle';
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.5; bp.frequency.value = 900;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
      const g1 = c.createGain(); g1.gain.value = 0.0; const g2 = c.createGain(); g2.gain.value = 0.0;
      o1.connect(bp).connect(lp).connect(g1).connect(out); o2.connect(g2).connect(out);
      const tyre = c.createBufferSource(); tyre.buffer = this.audio.brown; tyre.loop = true; const tlp = c.createBiquadFilter(); tlp.type = 'lowpass'; tlp.frequency.value = 400; const tg = c.createGain(); tg.gain.value = 0;
      tyre.connect(tlp).connect(tg).connect(out);
      const hiss = c.createBufferSource(); hiss.buffer = this.audio.white; hiss.loop = true; const hbp = c.createBiquadFilter(); hbp.type = 'bandpass'; hbp.frequency.value = 2400; hbp.Q.value = 0.8; const hg = c.createGain(); hg.gain.value = 0;
      hiss.connect(hbp).connect(hg).connect(out);
      for (const o of [o1, o2, tyre, hiss]) o.start();
      Object.assign(n, { o1, o2, bp, g1, g2, tlp, tg, hg, oscs: [o1, o2, tyre, hiss] });
    } else {
      const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = 74; const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 74 * 1.503;
      const o3 = c.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 222;
      const lfo = c.createOscillator(); lfo.frequency.value = 5.3; const lg = c.createGain(); lg.gain.value = 0.18; const trem = c.createGain(); trem.gain.value = 0.82; lfo.connect(lg).connect(trem.gain);
      const g1 = c.createGain(); g1.gain.value = 0.55; const g3 = c.createGain(); g3.gain.value = 0.12; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      o1.connect(g1); o2.connect(g1); g1.connect(trem); o3.connect(g3).connect(trem); trem.connect(lp).connect(out);
      const air = c.createBufferSource(); air.buffer = this.audio.white; air.loop = true; const abp = c.createBiquadFilter(); abp.type = 'bandpass'; abp.frequency.value = 1400; abp.Q.value = 0.6; const ag = c.createGain(); ag.gain.value = 0;
      air.connect(abp).connect(ag).connect(out);
      for (const o of [o1, o2, o3, lfo, air]) o.start();
      Object.assign(n, { o1, o2, o3, lfo, abp, ag, oscs: [o1, o2, o3, lfo, air] });
    }
    out.gain.setTargetAtTime(1, c.currentTime, 0.15);
    this.nodes = n;
  }
  stop() {
    const c = this.ctx, n = this.nodes; if (!n) return; this.nodes = null;
    if (!c) return; const t = c.currentTime; n.out.gain.setTargetAtTime(0, t, 0.08);
    for (const o of n.oscs) { try { o.stop(t + 0.5); } catch (e) {} }
    setTimeout(() => { try { n.out.disconnect(); } catch (e) {} }, 800);
  }
  // per-frame: speed01 0..1, load 0..1 (throttle/accel), extra: { braking, surface: 'road'|'pave'|'rough', air, climb }
  update(speed01, load, ex = {}) {
    const c = this.ctx, n = this.nodes; if (!c || !n) return; const t = c.currentTime, k = 0.06;
    if (this.kind === 'motor') {
      const f = 210 + 1150 * speed01 + 60 * load;
      n.o1.frequency.setTargetAtTime(f, t, k); n.o2.frequency.setTargetAtTime(f * 0.5, t, k); n.bp.frequency.setTargetAtTime(f * 1.6, t, k);
      const whine = (0.010 + 0.05 * load) * Math.min(1, speed01 * 4 + load * 0.6);
      n.g1.gain.setTargetAtTime(whine, t, k); n.g2.gain.setTargetAtTime(whine * 0.5, t, k);
      const rough = ex.surface === 'pave' ? 1.5 : ex.surface === 'rough' ? 2.2 : 1;
      n.tg.gain.setTargetAtTime(Math.min(0.5, speed01 * 0.32 * rough), t, k); n.tlp.frequency.setTargetAtTime(180 + 520 * speed01 * rough, t, k);
      n.hg.gain.setTargetAtTime((ex.braking ? 0.03 : 0) + speed01 * speed01 * 0.012, t, k);
    } else {
      const f = 66 + 46 * speed01 + (ex.climb || 0) * 18 + (ex.air ? 14 : 0);
      n.o1.frequency.setTargetAtTime(f, t, 0.1); n.o2.frequency.setTargetAtTime(f * 1.503, t, 0.1); n.o3.frequency.setTargetAtTime(f * 3.01, t, 0.1);
      n.lfo.frequency.setTargetAtTime(4.5 + speed01 * 5, t, 0.2);
      n.out.gain.setTargetAtTime(ex.air ? 0.11 : 0.16, t, 0.12);
      n.ag.gain.setTargetAtTime(0.004 + speed01 * speed01 * 0.11, t, 0.1); n.abp.frequency.setTargetAtTime(900 + speed01 * 1800, t, 0.1);
    }
  }
  // one-shots ------------------------------------------------
  _noise(dur, f, q, g, type = 'bandpass', buf) { const c = this.ctx; if (!c) return; const t = c.currentTime; const s = c.createBufferSource(); s.buffer = buf || this.audio.white; const bf = c.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q; const gn = c.createGain(); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(bf).connect(gn).connect(this.audio.master); s.start(t, Math.random() * 1.2, dur + 0.05); }
  _tone(f0, f1, dur, g, type = 'sine', when = 0) { const c = this.ctx; if (!c) return; const t = c.currentTime + when; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); const gn = c.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(g, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gn).connect(this.audio.master); o.start(t); o.stop(t + dur + 0.05); }
  unlock() { this._tone(1320, 1320, 0.09, 0.06, 'square'); this._tone(1760, 1760, 0.12, 0.06, 'square', 0.11); this._noise(0.05, 3000, 2, 0.05); }
  lock() { this._tone(1760, 1760, 0.09, 0.05, 'square'); this._tone(1175, 1175, 0.16, 0.05, 'square', 0.11); this._noise(0.08, 1800, 1.5, 0.08); }
  kerb(strength = 1) { this._noise(0.07, 1300, 1.2, 0.16 * strength); this._tone(140, 60, 0.12, 0.22 * strength, 'sine'); }
  thud(strength = 1) { this._noise(0.16, 500, 0.9, 0.3 * strength, 'lowpass', this.audio.brown); this._tone(110, 45, 0.25, 0.35 * strength, 'sine'); this._noise(0.09, 2600, 1.5, 0.08 * strength); }
  whoosh() { const c = this.ctx; if (!c) return; const t = c.currentTime; const s = c.createBufferSource(); s.buffer = this.audio.white; const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.Q.value = 1.2; bf.frequency.setValueAtTime(600, t); bf.frequency.exponentialRampToValueAtTime(2600, t + 0.3); const gn = c.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.12, t + 0.06); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.38); s.connect(bf).connect(gn).connect(this.audio.master); s.start(t, Math.random(), 0.45); this._tone(160, 320, 0.3, 0.06, 'sine'); }
  land(strength = 1) { this._tone(90, 50, 0.2, 0.25 * strength, 'sine'); this._noise(0.12, 700, 0.8, 0.12 * strength, 'lowpass', this.audio.brown); }
  bell() { for (const [f, w] of [[2093, 0], [2637, 0.004]]) this._tone(f, f * 0.998, 0.9, 0.05, 'sine', w); this._tone(4186, 4180, 0.4, 0.015, 'sine'); }
}

// ---------------------------------------------------------------- ground type sampler (from window.BSIM.groundMask, set by main.js)
// mask = { sdf: Uint8Array RGBA (asphalt, paved, grass, dirt signed distances; 128 = edge, +-3 m), nx, nz, step, x0, z0 }
export function groundSampler() {
  const M = typeof window !== 'undefined' && window.BSIM && window.BSIM.groundMask; if (!M) return null;
  const { sdf, nx, nz, step, x0, z0 } = M;
  const at = (x, z, ch) => { // bilinear, metres (positive = inside)
    const fx = (x - x0) / step - 0.5, fz = (z - z0) / step - 0.5; const i = Math.floor(fx), j = Math.floor(fz); if (i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1) return -3;
    const tx = fx - i, tz = fz - j, k = (j * nx + i) * 4 + ch;
    const a = sdf[k], b = sdf[k + 4], c = sdf[k + nx * 4], d = sdf[k + nx * 4 + 4];
    const v = (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz; return (v / 255 - 0.5) * 6;
  };
  return { asphalt: (x, z) => at(x, z, 0), paved: (x, z) => at(x, z, 1), grass: (x, z) => at(x, z, 2), dirt: (x, z) => at(x, z, 3) };
}
