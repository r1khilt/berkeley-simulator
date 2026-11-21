// Procedural audio: Campanile bells (spatial), ambient birds & breeze, footsteps, bike, UI chimes.
export class Audio {
  constructor() { this.ctx = null; this.volume = 0.7; this.started = false; }
  start() {
    if (this.started) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.started = true;
    this.master = this.ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(this.ctx.destination);
    this.amb = this.ctx.createGain(); this.amb.gain.value = 0.0; this.amb.connect(this.master);
    // noise buffer
    const n = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } this.brown = b;
    const wb = this.ctx.createBuffer(1, n, this.ctx.sampleRate), wd = wb.getChannelData(0); for (let i = 0; i < n; i++) wd[i] = Math.random() * 2 - 1; this.white = wb;
    // breeze bed
    const src = this.ctx.createBufferSource(); src.buffer = this.brown; src.loop = true;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; this.breezeLP = lp;
    const g = this.ctx.createGain(); g.gain.value = 0.16; this.breezeG = g;
    src.connect(lp).connect(g).connect(this.amb); src.start();
    // bike hum
    const bs = this.ctx.createBufferSource(); bs.buffer = this.white; bs.loop = true; const bf = this.ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 900; bf.Q.value = 0.7;
    this.bikeG = this.ctx.createGain(); this.bikeG.gain.value = 0; bs.connect(bf).connect(this.bikeG).connect(this.master); bs.start();
    this.amb.gain.setTargetAtTime(1, this.ctx.currentTime, 2);
    this.nextBird = this.ctx.currentTime + 2;
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  // inharmonic bell partials (hum, prime, tierce, quint, nominal, superquint)
  bell(freq, when = 0, gainV = 0.5, dist = 50, pan = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + when;
    const att = Math.min(1, 140 / Math.max(30, dist)) * gainV;
    const out = c.createGain(); out.gain.value = att; const p = c.createStereoPanner ? c.createStereoPanner() : null; if (p) { p.pan.value = Math.max(-0.8, Math.min(0.8, pan)); out.connect(p).connect(this.master); } else out.connect(this.master);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(1200, 9000 - dist * 6); lp.connect(out);
    const parts = [[0.5, 0.5, 9], [1, 0.9, 6], [1.183, 0.45, 4.5], [1.5, 0.35, 3.5], [2, 0.6, 3], [2.51, 0.22, 2], [3, 0.18, 1.6], [4.07, 0.08, 1.0]];
    for (const [r, a, dec] of parts) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq * r * (1 + (Math.random() - 0.5) * 0.002);
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * 0.25, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dec * 1.4);
      o.connect(g).connect(lp); o.start(t); o.stop(t + dec * 1.5);
    }
  }
  strikeHour(hour, dist, pan) { const n = ((hour + 11) % 12) + 1; for (let i = 0; i < n; i++) this.bell(98, 1.2 + i * 2.6, 0.9, dist, pan); }
  quarter(q, dist, pan) { // short Cambridge-style quarter phrase on the carillon
    const notes = [[392, 349.2, 329.6, 261.6], [329.6, 392, 349.2, 261.6], [329.6, 349.2, 392, 329.6], [261.6, 392, 349.2, 329.6]];
    let k = 0; for (let r = 0; r < q; r++) for (const f of notes[(r + q) % 4]) this.bell(f, 0.2 + k++ * 0.62, 0.35, dist, pan);
  }
  carillon(dist, pan, seconds = 40) { // gentle improvised pentatonic recital
    const scale = [392, 440, 523.25, 587.33, 659.25, 784, 880, 1046.5]; let t = 0.5, i = 3;
    while (t < seconds) { i = Math.max(0, Math.min(scale.length - 1, i + Math.round((Math.random() - 0.5) * 4))); this.bell(scale[i], t, 0.28, dist, pan); if (Math.random() < 0.3) this.bell(scale[Math.max(0, i - 3)] / 2, t, 0.2, dist, pan); t += Math.random() < 0.2 ? 0.9 : 0.45; }
  }
  step(kind = 'ground', speed = 4) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.white; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = kind === 'stone' ? 2400 : 900 + Math.random() * 300; f.Q.value = kind === 'stone' ? 2.2 : 1.1;
    const g = c.createGain(); const v = (kind === 'stone' ? 0.11 : 0.08) * (0.6 + Math.min(1, speed / 8));
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'stone' ? 0.06 : 0.09));
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * 1.5, 0.12);
  }
  chime() { if (!this.ctx) return; this.bell(784, 0, 0.12, 30, 0); this.bell(1046.5, 0.18, 0.12, 30, 0); }
  bird() {
    const c = this.ctx, t = c.currentTime; const o = c.createOscillator(); o.type = 'sine'; const g = c.createGain(); const p = c.createStereoPanner ? c.createStereoPanner() : null;
    const f0 = 2600 + Math.random() * 2400, n = 2 + Math.floor(Math.random() * 4);
    g.gain.value = 0; for (let k = 0; k < n; k++) { const tt = t + k * (0.09 + Math.random() * 0.06); o.frequency.setValueAtTime(f0 * (1 + Math.random() * 0.2), tt); o.frequency.exponentialRampToValueAtTime(f0 * (0.7 + Math.random() * 0.5), tt + 0.07); g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.025 + Math.random() * 0.02, tt + 0.01); g.gain.linearRampToValueAtTime(0, tt + 0.075); }
    if (p) { p.pan.value = Math.random() * 1.6 - 0.8; o.connect(g).connect(p).connect(this.amb); } else o.connect(g).connect(this.amb);
    o.start(t); o.stop(t + n * 0.2 + 0.1);
  }
  update(dt, { night = 0, wind = 0.4, bikeSpeed = 0, nearTrees = 0.5 } = {}) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.breezeG.gain.setTargetAtTime(0.06 + wind * 0.22, t, 1.5); this.breezeLP.frequency.setTargetAtTime(260 + wind * 600, t, 1.5);
    this.bikeG.gain.setTargetAtTime(Math.min(0.12, bikeSpeed * 0.008), t, 0.2);
    if (t > this.nextBird) { if (night < 0.6 && Math.random() < 0.4 + nearTrees * 0.5) this.bird(); this.nextBird = t + 1.2 + Math.random() * (night > 0.6 ? 12 : 5); }
  }
}
