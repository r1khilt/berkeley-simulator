// Sather Tower experiences (r4-campanile), installed from main.js:
//  1. The ride: walk into the lobby, press E at the elevator, ride up with the operator's dial and the cab indicator
//     counting floors, step out on the seventh-floor landing (glass cases: north clock motor, Bacon Hall's hour-strike
//     machinery), climb the 38 steps through the carillonist's cabin and walk out onto the observation deck. And back.
//     A hidden player mode ('campanileRide') drives the first-person camera; E skips; the mouse can glance around.
//  2. The bells: the Great Bear Bell tolls the hour 8 am-10 pm every day (Wikipedia, Sather Tower); 10-minute recitals
//     Mon-Sat at 7:50 am, noon and 6 pm and a 45-minute recital Sundays at 2 pm during the semesters (Berkeley Carillon
//     Guild, bells.berkeley.edu, Nov 2026). Synthesized tuned-bell partials (hum, prime, minor-third tierce, quint,
//     nominal...) rendered once into buffers; spatialized from the belfry with distance falloff, air absorption, the
//     speed-of-sound delay and a little campus reverb. Each note strikes its bell's clapper (lib/campanile-bells.js).
//  The schedule follows real Pacific time. ?carillon=1 starts a recital as soon as you press Play (BSIM.campanile.recital()).
import * as THREE from 'three';
import { pacificParts } from '../time.js';
import { recitalProgram } from './carillon-music.js';

// ---------------------------------------------------------------- calendar
const TOLL_HOURS = [8, 22];                                        // 8 am .. 10 pm inclusive
function dayKind(p) {                                              // 'semester' | 'summer' | 'quiet'
  const md = p.month * 100 + p.day;
  const nov1 = new Date(Date.UTC(p.year, 10, 1)).getUTCDay(), thanks = 1 + ((4 - nov1 + 7) % 7) + 21;   // 4th Thursday
  if (p.month === 11 && p.day >= thanks && p.day <= thanks + 3) return 'quiet';                      // Thanksgiving break
  if ((md >= 826 && md <= 1204) || (md >= 120 && md <= 508)) return 'semester';                       // instruction (approx.)
  if (md >= 522 && md <= 825) return 'summer';                                                         // "occasionally"
  return 'quiet';                                                                                      // RRR, finals, winter break
}
// recital windows for a Pacific calendar day: [{start (s of day), dur, slot}]
export function recitalsFor(p) {
  const kind = dayKind(p), dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  if (kind === 'quiet') return [];
  if (kind === 'summer') return dow >= 1 && dow <= 5 ? [{ start: 12 * 3600, dur: 600, slot: 'noon' }] : [];
  if (dow === 0) return [{ start: 14 * 3600, dur: 2700, slot: 'sunday' }];
  return [{ start: 7 * 3600 + 50 * 60, dur: 600, slot: 'morning' }, { start: 12 * 3600, dur: 600, slot: 'noon' }, { start: 18 * 3600, dur: 600, slot: 'evening' }];
}
function nextRecitalText(p) {
  const sod = p.hour * 3600 + p.minute * 60 + p.second;
  const fmt = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`; };
  const today = recitalsFor(p).find((w) => w.start + w.dur > sod);
  if (today) return today.start <= sod ? 'The carillon is playing now' : `Next carillon recital today at ${fmt(today.start)}`;
  return 'Carillon recitals Mon-Sat 7:50 am, noon, 6 pm · Sun 2 pm';
}

// ---------------------------------------------------------------- bell synthesis
const BASES = [[43, 13], [50, 9.5], [57, 7], [64, 5.2], [71, 4], [78, 3.1], [86, 2.4], [94, 2], [101, 1.6]];   // [midi, seconds]
function renderBell(c, base, dur, SR, seed) {
  const f = 440 * Math.pow(2, (base - 69) / 12), n = Math.floor(dur * SR);
  const buf = c.createBuffer(1, n, SR), out = buf.getChannelData(0);
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const T = 9.5 * Math.pow(98 / f, 0.55);                          // strike-note decay (s to -60 dB): big bells ring longest
  // tuned carillon bell partials: [ratio, amplitude, decay x T]
  const P = [[0.5, 0.5, 1.5], [1.0, 0.42, 1.0], [1.2, 0.55, 0.75], [1.5, 0.2, 0.5], [2.0, 0.85, 0.45], [2.51, 0.26, 0.28], [2.66, 0.14, 0.24], [3.01, 0.2, 0.2], [4.05, 0.12, 0.13], [5.07, 0.06, 0.09], [6.1, 0.04, 0.07]];
  for (const [r, a, dk] of P) {
    const fr = f * r; if (fr > SR * 0.45) continue;
    const t60 = Math.max(0.15, T * dk), dec = Math.exp(-6.9078 / (t60 * SR)), beat = 0.25 + rnd() * 1.4;
    for (const df of [-beat / 2, beat / 2]) {                      // doublets: slight asymmetry makes partials beat
      const w = (2 * Math.PI * (fr + df)) / SR, cw = Math.cos(w), sw = Math.sin(w);
      let x = Math.sin(rnd() * 6.283), y = Math.cos(rnd() * 6.283), amp = a * 0.5;
      const L = Math.min(n, Math.ceil(t60 * 1.3 * SR));
      for (let i = 0; i < L; i++) { out[i] += amp * x; const nx = x * cw + y * sw; y = y * cw - x * sw; x = nx; amp *= dec; }
    }
  }
  // strike transient: the clapper's clank (short, bright, filtered noise)
  let lp = 0; const tn = Math.floor(0.03 * SR);
  for (let i = 0; i < tn; i++) { lp += 0.35 * ((rnd() * 2 - 1) - lp); out[i] += lp * 0.5 * Math.exp(-i / (0.004 * SR)); }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
  const g = 0.9 / (pk || 1); for (let i = 0; i < n; i++) out[i] *= g * (i < 48 ? i / 48 : 1);
  return buf;
}
function impulse(c, sec) {                                         // diffuse outdoor-ish reverb tail (stereo noise, exp decay)
  const n = Math.floor(sec * c.sampleRate), b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < n; i++) { lp += 0.5 * ((Math.random() * 2 - 1) - lp); d[i] = lp * Math.pow(1 - i / n, 2.2) * (i < c.sampleRate * 0.02 ? i / (c.sampleRate * 0.02) : 1); } }
  return b;
}
class BellAudio {
  constructor(audio) { this.audio = audio; this.ok = false; this.buffers = new Map(); this.pending = BASES.slice(); }
  ensure() {
    const a = this.audio; if (this.ok) return true; if (!a || !a.ctx || !a.master) return false;
    const c = a.ctx; this.c = c;
    this.input = c.createGain(); this.input.gain.value = 0.55;
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 5; this.comp.knee.value = 8; this.comp.attack.value = 0.002; this.comp.release.value = 0.3;
    this.delay = c.createDelay(4); this.air = c.createBiquadFilter(); this.air.type = 'lowpass'; this.air.frequency.value = 16000; this.air.Q.value = 0.5;
    this.occl = c.createGain();
    this.pan = c.createPanner(); Object.assign(this.pan, { panningModel: 'equalpower', distanceModel: 'inverse', refDistance: 22, rolloffFactor: 1.1, maxDistance: 20000 });
    this.wet = c.createGain(); this.wet.gain.value = 0.15; this.rev = c.createConvolver(); this.rev.buffer = impulse(c, 2.8);
    this.input.connect(this.comp).connect(this.delay).connect(this.air).connect(this.occl).connect(this.pan).connect(a.master);
    this.occl.connect(this.rev).connect(this.wet).connect(a.master);
    this.ok = true; this._bake(); return true;
  }
  _bake() { // render one register per tick so the first notes don't hitch the frame
    if (!this.pending.length) return;
    const [m, d] = this.pending.shift(); const SR = Math.min(32000, this.c.sampleRate);
    try { this.buffers.set(m, renderBell(this.c, m, d, SR, 1000 + m * 31)); } catch (e) { console.warn('bell render', e); }
    if (this.pending.length) setTimeout(() => this._bake(), 30);
  }
  note(m, when, vel = 0.8) {
    if (!this.ok) return; const c = this.c;
    let best = null, bd = 99; for (const [b] of BASES) { if (!this.buffers.has(b)) continue; const d = Math.abs(m - b); if (d < bd) { bd = d; best = b; } }
    if (best == null) return;
    const src = c.createBufferSource(); src.buffer = this.buffers.get(best); src.playbackRate.value = Math.pow(2, (m - best) / 12);
    const g = c.createGain(); g.gain.value = vel * (m < 55 ? 1.0 : 0.75);
    src.connect(g).connect(this.input); src.start(Math.max(c.currentTime, when));
    src.onended = () => { try { g.disconnect(); } catch (e) {} };
  }
  place(cam, bp, inside) {
    if (!this.ok) return; const c = this.c, t = c.currentTime, L = c.listener;
    const p = cam.position, f = _v.set(0, 0, -1).applyQuaternion(cam.quaternion), u = _u.set(0, 1, 0).applyQuaternion(cam.quaternion);
    if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z; }
    else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
    if (this.pan.positionX) { this.pan.positionX.value = bp[0]; this.pan.positionY.value = bp[1]; this.pan.positionZ.value = bp[2]; } else this.pan.setPosition(bp[0], bp[1], bp[2]);
    const d = Math.hypot(bp[0] - p.x, bp[1] - p.y, bp[2] - p.z);
    this.delay.delayTime.setTargetAtTime(Math.min(3.9, d / 343), t, 0.25);
    this.air.frequency.setTargetAtTime(inside ? 650 : Math.max(1800, Math.min(16000, 16000 * Math.exp(-d / 650))), t, 0.2);
    this.occl.gain.setTargetAtTime(inside ? 0.3 : 1, t, 0.2);
    this.wet.gain.setTargetAtTime(inside ? 0.05 : 0.1 + 0.3 * Math.min(1, d / 500), t, 0.3);
    this.dist = d;
  }
}
const _v = new THREE.Vector3(), _u = new THREE.Vector3();

// ---------------------------------------------------------------- the director
export function installCampanile({ lm, player, audio, ui, camera, qs }) {
  const bellsA = new BellAudio(audio);
  const clock = () => performance.now() / 1000;                   // master clock; converted to audio time when a note is sent
  const tower = () => { const l = lm.byId.get('sather-tower'); return l && l.res && l.res.campanile ? l : null; };
  // ---- bell events: {t (clock), m, v, hammer?}; visual strikes fire when t passes, audio is scheduled ~0.3 s ahead
  let queue = [], qa = 0, qv = 0, recital = null, lastToll = '', lastDay = '', forced = qs && qs.get('carillon') === '1';
  const pushEvents = (evs) => { queue = queue.slice(Math.min(qa, qv)).concat(evs).sort((a, b) => a.t - b.t); qa = qv = 0; }; // flags stop repeats
  const toll = (hour, at) => { const n = ((hour + 11) % 12) + 1, ev = []; for (let k = 0; k < n; k++) ev.push({ t: at + 0.8 + k * 3.2, m: 43, v: 1.0, hammerAt: at + k * 3.2 }); pushEvents(ev); return n * 3.2 + 3; };
  const startRecital = (seed, seconds, offset = 0, delay = 0) => {
    const prog = recitalProgram(seed, seconds); const t0 = clock() + delay - offset;
    pushEvents(prog.events.filter((e) => e.t >= offset - 0.05).map((e) => ({ t: t0 + e.t, m: e.m, v: e.v })));
    recital = { until: t0 + seconds, list: prog.list, t0 };
  };
  const scheduleFrom = (now) => {
    const p = pacificParts(now), sod = p.hour * 3600 + p.minute * 60 + p.second, dayKey = `${p.year}-${p.month}-${p.day}`;
    // hourly toll on the Great Bear Bell
    const tk = `${dayKey}-${p.hour}`;
    let tollDur = 0;
    if (p.minute === 0 && p.second < 3 && lastToll !== tk && p.hour >= TOLL_HOURS[0] && p.hour <= TOLL_HOURS[1]) { lastToll = tk; tollDur = toll(p.hour, clock() + 0.2); }
    // recitals (join mid-way if the window is already running)
    if (!recital || clock() > recital.until) {
      recital = recital && clock() > recital.until ? null : recital;
      for (const w of recitalsFor(p)) {
        const key = `${dayKey}-${w.slot}`; if (key === lastDay) continue;
        const into = sod - w.start;
        if (into >= 0 && into < w.dur - 20) {
          lastDay = key; const seed = p.year * 10000 + p.month * 100 + p.day + w.start;
          const lead = w.start % 3600 === 0 && p.hour >= TOLL_HOURS[0] && p.hour <= TOLL_HOURS[1] ? (((p.hour + 11) % 12) + 1) * 3.2 + 4 : 2; // the toll comes first on the hour
          if (into < lead) startRecital(seed, w.dur - lead, 0, lead - into + (tollDur ? 0 : 0)); else startRecital(seed, w.dur - lead, into - lead, 0);
        }
      }
    }
  };
  // ---- ride (hidden player mode)
  const ride = { on: false, segs: [], i: 0, t: 0, view: 'third', glance: 0, glanceP: 0, lastYaw: 0, lastPitch: 0, dir: 'up', stepAcc: 0 };
  const W = new THREE.Vector3(), M4 = new THREE.Matrix4();
  const toWorld = (T, u, y, v) => { const c = T.res.campanile; M4.multiplyMatrices(c.root.matrixWorld, c.frame); return W.set(u, y, v).applyMatrix4(M4).clone(); };
  const yawOf = (T, du, dv) => { const c = T.res.campanile; M4.multiplyMatrices(c.root.matrixWorld, c.frame); const d = new THREE.Vector3(du, 0, dv).transformDirection(M4); return Math.atan2(-d.x, -d.z); };
  const angLerp = (a, b, k) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };
  const ease = (k) => k * k * (3 - 2 * k);
  function buildPath(T, dir) {
    const C = T.res.campanile, k = C.consts, P = C.ix.path, LV = k.LIFT.v, FL = k.FL, TL = k.TL, D = k.DECK_Y;  // frame space
    const S = [];
    // seg: {to:[u,y,v], dur, face:[du,dv]|null, pitch, kind, on?:fn(at start), tick?:fn(k)}
    const walk = (to, dur, face, pitch = -0.05, extra = {}) => S.push({ kind: 'walk', to, dur, face, pitch, ...extra });
    const stairs = (to, dur, face, pitch) => S.push({ kind: 'stairs', to, dur, face, pitch });
    const hold = (dur, extra = {}) => S.push({ kind: 'hold', dur, ...extra });
    const lift = (fromY, toY, dur) => S.push({ kind: 'lift', fromY, toY, dur });
    const doors = (level, open, dur) => S.push({ kind: 'doors', level, open, dur });
    if (dir === 'up') {
      walk([0, FL, 1.45], 0.9, [0, 1]);
      doors('lobby', 1, 0.9);
      walk([0, FL, LV + 0.4], 1.1, [0, 1]);
      walk([0, FL, LV + 0.4], 0.9, [0, -1]);
      doors('lobby', 0, 1.1);
      lift(FL, TL, 8.0);
      hold(0.5, { on: () => chime() });
      doors('top', 1, 1.0);
      walk([0, TL, 1.4], 1.2, [0, -1], -0.1);
      walk([0.6, TL, 1.3], 0.9, [1, -0.3], -0.15);                                         // glance at Bacon Hall's machinery
      walk([P.F1u, TL, P.F1v0 + 0.15], 1.5, [0, -1], 0);
      stairs([P.F1u, P.LAND, P.F2v0 + 0.1], 19 * 0.27, [-0.45, -1], 0.22);   // look a little into the stairwell
      walk([0, P.LAND, P.F2v0 - 0.3], 1.4, [-1, 0], 0.05);
      walk([0, P.LAND, P.F2v0 - 0.3], 0.6, [0, 1], 0.1);
      stairs([0, D, 1.25], 19 * 0.27, [0, 1], 0.25);
      walk([0, D, 2.45], 1.1, [0, 1], 0.02, { light: true });
    } else {
      walk([0, D, 1.25], 1.1, [0, -1], -0.05);
      walk([0, D, 1.25], 0.7, [0, -1], -0.35);
      stairs([0, P.LAND, P.F2v0], 19 * 0.27, [0, -1], -0.4);
      walk([P.F1u, P.LAND, P.F2v0 - 0.35], 1.4, [1, 0], -0.15);
      walk([P.F1u, P.LAND, P.F2v0 - 0.35], 0.6, [0, 1], -0.35);
      stairs([P.F1u, TL, P.F1v0 + 0.3], 19 * 0.27, [0, 1], -0.38);
      walk([0, TL, 1.5], 1.4, [0, 1], -0.05);
      doors('top', 1, 0.9);
      walk([0, TL, LV + 0.4], 1.1, [0, 1]);
      walk([0, TL, LV + 0.4], 0.9, [0, -1]);
      doors('top', 0, 1.1);
      lift(TL, FL, 8.0);
      hold(0.5, { on: () => chime() });
      doors('lobby', 1, 1.0);
      walk([0, FL, 0.7], 1.3, [0, -1]);
    }
    return S;
  }
  let hum = null;
  const chime = () => { if (audio && audio.ctx) { audio.bell(1318.5, 0, 0.12, 4, 0); audio.bell(1046.5, 0.35, 0.12, 4, 0); } };
  const humOn = (on) => {
    const c = audio && audio.ctx; if (!c) return;
    if (on && !hum) { const s = c.createBufferSource(); s.buffer = audio.brown; s.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180; const g = c.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(audio.master); s.start(); g.gain.setTargetAtTime(0.35, c.currentTime, 0.6); hum = { s, g }; }
    if (!on && hum) { const h = hum; hum = null; h.g.gain.setTargetAtTime(0, c.currentTime, 0.4); setTimeout(() => { try { h.s.stop(); } catch (e) {} }, 1500); }
  };
  const plugin = {
    hidden: true, grapple: false, label: 'Campanile',
    enter(pl) { pl.vel.set(0, 0, 0); },
    exit(pl) { },
    onKey(e, pl) { if (pl.mode === 'campanileRide' && e.code === 'KeyE' && !e.repeat && ride.on && ride.t + ride.elapsed > 1.5) skip(); },
    update(pl, dt) {
      const T = tower(); if (!ride.on || !T) { finish(pl); return 0; }
      const C = T.res.campanile; ride.elapsed += dt;
      // the player's mouse moves become a glance offset that eases back
      ride.glance += pl.camYaw - ride.lastYaw; ride.glanceP += pl.camPitch - ride.lastPitch;
      ride.glance *= Math.exp(-dt * 1.2); ride.glanceP *= Math.exp(-dt * 1.2);
      let seg = ride.segs[ride.i];
      while (seg && ride.t >= seg.dur) { endSeg(seg, T); ride.t -= seg.dur; ride.i++; seg = ride.segs[ride.i]; if (seg) startSeg(seg, T); }
      if (!seg) { finish(pl); return 0; }
      ride.t += dt; const k = Math.min(1, ride.t / seg.dur);
      let pos = ride.pos;
      if (seg.kind === 'walk' || seg.kind === 'stairs') {
        const kk = seg.kind === 'walk' ? ease(k) : k; pos = ride.from.map((v, j) => v + (seg.to[j] - v) * kk);
        if (seg.kind === 'stairs') { const n = 19, st = Math.min(n, Math.floor(k * n + 0.5)); pos[1] = ride.from[1] + (seg.to[1] - ride.from[1]) * (st / n) + Math.sin(k * n * Math.PI) ** 2 * 0.03; }
        ride.stepAcc += dt; if (audio && ride.stepAcc > (seg.kind === 'stairs' ? 0.27 : 0.5) && Math.hypot(seg.to[0] - ride.from[0], seg.to[2] - ride.from[2]) > 0.2) { ride.stepAcc = 0; audio.step('stone', 4); }
      } else if (seg.kind === 'lift') {
        const y = seg.fromY + (seg.toY - seg.fromY) * (k < 0.15 ? (k / 0.15) ** 2 * 0.075 : k > 0.85 ? 1 - ((1 - k) / 0.15) ** 2 * 0.075 : 0.075 + (k - 0.15) / 0.7 * 0.85);
        pos = [ride.pos[0], y, ride.pos[2]];
        C.ix.cab.position.y = y;
        const fl = Math.max(0, Math.min(7, Math.round((y - C.consts.FL) / (C.consts.TL - C.consts.FL) * 7)));
        C.ix.setFloor(fl === 0 ? 'L' : String(fl));                                       // dial pointer: L at left, 7 at right
        C.ix.pointer.rotation.z = Math.PI / 2 - ((y - C.consts.FL) / (C.consts.TL - C.consts.FL)) * Math.PI;
      } else if (seg.kind === 'doors') { C.ix.setDoors(seg.level, seg.open ? ease(k) : 1 - ease(k)); }
      ride.pos = pos;
      // face: blend toward the segment's facing
      if (seg.face) ride.yaw = angLerp(ride.yaw, yawOf(T, seg.face[0], seg.face[1]), Math.min(1, dt * 4));
      if (seg.pitch != null) ride.pitch += (seg.pitch - ride.pitch) * Math.min(1, dt * 3);
      const w = toWorld(T, pos[0], pos[1], pos[2]);
      pl.pos.copy(w); pl.vel.set(0, 0, 0); pl.onGround = true;
      pl.camYaw = ride.yaw + ride.glance; pl.camPitch = Math.max(-1.2, Math.min(1.0, ride.pitch + ride.glanceP)); pl.yaw = ride.yaw;
      ride.lastYaw = pl.camYaw; ride.lastPitch = pl.camPitch;
      return 0;
    },
  };
  function startSeg(seg, T) {
    ride.from = ride.pos.slice(); seg.on && seg.on();
    if (seg.kind === 'lift') humOn(true);
  }
  function endSeg(seg, T) {
    const C = T.res.campanile;
    if (seg.kind === 'walk' || seg.kind === 'stairs') ride.pos = seg.to.slice();
    if (seg.kind === 'doors') C.ix.setDoors(seg.level, seg.open ? 1 : 0);
    if (seg.kind === 'lift') { humOn(false); C.ix.cab.position.y = seg.toY; }
  }
  function begin(dir) {
    const T = tower(); if (!T || ride.on) return false;
    const C = T.res.campanile; C.root.updateMatrixWorld(true);
    ride.segs = buildPath(T, dir); ride.i = 0; ride.t = 0; ride.elapsed = 0; ride.on = true; ride.dir = dir; ride.stepAcc = 0;
    // the player's position in frame space
    M4.multiplyMatrices(C.root.matrixWorld, C.frame); const inv = M4.clone().invert(); const lp = player.pos.clone().applyMatrix4(inv);
    ride.pos = [lp.x, lp.y, lp.z]; ride.from = ride.pos.slice();
    ride.yaw = player.camYaw; ride.pitch = 0; ride.glance = 0; ride.glanceP = 0; ride.lastYaw = player.camYaw; ride.lastPitch = player.camPitch;
    C.ix.cab.position.y = dir === 'up' ? C.consts.FL : C.consts.TL;
    ride.view = player.view; player.view = 'first'; window.BSIM && (window.BSIM.campanileRide = true);
    for (const it of player.interactions) if (it.landmark === 'sather-tower') { it._r = it._r ?? it.radius; it.radius = 0; }
    player.setMode('campanileRide'); startSeg(ride.segs[0], T);
    ui && ui.hint && ui.hint(dir === 'up' ? 'Riding up the Campanile · press E to skip' : 'Heading down · press E to skip', 4000);
    return true;
  }
  function finish(pl) {
    if (!ride.on && pl.mode !== 'campanileRide') return;
    const wasUp = ride.dir === 'up';
    ride.on = false; humOn(false); pl.view = ride.view || 'third'; window.BSIM && (window.BSIM.campanileRide = false);
    for (const it of pl.interactions) if (it.landmark === 'sather-tower' && it._r != null) { it.radius = it._r; }
    const T = tower(); if (T) { const C = T.res.campanile; C.ix.setDoors('lobby', 0); C.ix.setDoors('top', 0); C.ix.cab.position.y = wasUp ? C.consts.TL : C.consts.FL; }
    if (pl.mode === 'campanileRide') pl.setMode('walk');
    pl.vel.set(0, 0, 0); pl.camPitch = 0;
    if (wasUp && ui && ui.hint) ui.hint(nextRecitalText(pacificParts(new Date())), 5000);
  }
  function skip() {
    const T = tower(); if (!T) return;
    const go = () => { const last = ride.segs[ride.segs.length - 1]; const C = T.res.campanile; ride.pos = last.to ? last.to.slice() : ride.pos; const w = toWorld(T, ...ride.pos); player.pos.copy(w); const f = last.face || [0, 1]; ride.yaw = yawOf(T, f[0], f[1]); player.camYaw = ride.yaw; ride.i = ride.segs.length; finish(player); player.camYaw = ride.yaw; };
    if (ui && ui.fade) ui.fade(go); else go();
  }
  player.registerMode('campanileRide', plugin);
  // route the tower's interactions here (main.js keeps its teleport fallback for anything else)
  const prev = player.onInteract;
  player.onInteract = (it) => { if (it && it.action === 'campanile-up' && begin('up')) return; if (it && it.action === 'campanile-down' && begin('down')) return; prev && prev(it); };

  return {
    ride: (dir = 'up') => begin(dir), skip, get riding() { return ride.on; },
    // force a recital now (QA / ?carillon=1): `seconds` long
    recital(seconds = 600) { startRecital((Math.random() * 1e9) | 0, seconds, 0, 0.5); },
    toll(hour = 3) { toll(hour, clock() + 0.2); },
    note(m, v = 0.9) { pushEvents([{ t: clock() + 0.05, m, v }]); },
    schedule: recitalsFor, nextRecitalText: () => nextRecitalText(pacificParts(new Date())),
    update(dt, { camera: cam, started }) {
      const T = tower(); const now = new Date();
      if (started) { bellsA.ensure(); if (forced) { forced = false; this.recital(600); } }
      scheduleFrom(now);
      const tnow = clock();
      // audio: send notes ~0.3 s ahead (the delay node adds the sound's travel time from the belfry)
      const actx = bellsA.ok ? bellsA.c : null;
      while (qa < queue.length && queue[qa].t < tnow + 0.3) { const e = queue[qa]; if (!e.sent) { e.sent = true; if (actx && e.t > tnow - 0.25) bellsA.note(e.m, actx.currentTime + Math.max(0, e.t - tnow), e.v); } qa++; }
      // visuals at the belfry: hammer lifts, clapper strikes, clavier batons
      const car = T && T.res.campanile.carillon;
      while (qv < queue.length) {
        const e = queue[qv];
        if (e.hammerAt != null && !e.ham && e.hammerAt <= tnow) { e.ham = true; car && car.hammer(); }
        if (e.t > tnow) break;
        if (!e.vis) { e.vis = true; if (car && e.hammerAt == null && e.t > tnow - 0.5) car.strike(e.m - 43, e.v); }
        qv++;
      }
      if (qa > 400 && qv > 400) { const k = Math.min(qa, qv); queue = queue.slice(k); qa -= k; qv -= k; }
      if (T && bellsA.ok) {
        const bp = T.anchors && T.anchors.bells; const C = T.res.campanile;
        if (bp) {
          const inside = Math.hypot(cam.position.x - bp[0], cam.position.z - bp[2]) < 4.6 && cam.position.y < bp[1] - 5;
          bellsA.place(cam, bp, inside);
        }
      }
    },
  };
}
