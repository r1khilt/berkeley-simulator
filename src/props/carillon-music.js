// Carillon repertoire for Sather Tower recitals (r4-campanile). Public-domain tunes arranged the way carillonists play them:
// melody in the upper bells with a bass line, long upper notes rolled (tremolo) because bells die away. Plus seeded
// "preludes" (broken-chord improvisations) so each recital differs. Notes are MIDI; the carillon spans G2 (43) to G7 (103).
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(tok) { const m = /^([A-G])(#|b)?(-?\d)$/.exec(tok); if (!m) throw new Error('note ' + tok); return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); }
// "E5 D#5:0.5 r:1 A4+A2:3" -> [{b, d, m:[..]}]; default duration `def` beats; '+' joins simultaneous notes
function voice(src, def = 1, tr = 0) {
  const out = []; let b = 0;
  for (const tok of src.trim().split(/[\s|]+/)) { if (!tok) continue; const [n, d0] = tok.split(':'); const d = d0 ? +d0 : def; if (n !== 'r') out.push({ b, d, m: n.split('+').map((x) => midi(x) + tr) }); b += d; }
  return { notes: out, beats: b };
}
// a piece: voices with velocities; returns timed events {t, m, v} and duration (s)
function piece(name, bpm, voices) {
  const spb = 60 / bpm, ev = []; let beats = 0;
  for (const { src, def = 1, tr = 0, vel = 0.8, roll = false } of voices) {
    const v = voice(src, def, tr); beats = Math.max(beats, v.beats);
    for (const n of v.notes) for (const m of n.m) {
      const t = n.b * spb, dur = n.d * spb; ev.push({ t, m, v: vel * (0.92 + 0.08 * Math.random()) });
      if (roll && dur >= 0.75 && m >= 72) for (let k = 0.16; k < dur - 0.08; k += 0.15) ev.push({ t: t + k, m, v: vel * 0.42 }); // tremolo
    }
  }
  ev.sort((a, b) => a.t - b.t);
  return { name, events: ev, dur: beats * spb + 2.5 };
}

const ODE = () => piece('Ode to Joy', 108, [
  { roll: true, vel: 0.95, tr: 12, src: `E5 E5 F5 G5 | G5 F5 E5 D5 | C5 C5 D5 E5 | E5:1.5 D5:0.5 D5:2 |
    E5 E5 F5 G5 | G5 F5 E5 D5 | C5 C5 D5 E5 | D5:1.5 C5:0.5 C5:2 |
    D5 D5 E5 C5 | D5 E5:0.5 F5:0.5 E5 C5 | D5 E5:0.5 F5:0.5 E5 D5 | C5 D5 G4:2 |
    E5 E5 F5 G5 | G5 F5 E5 D5 | C5 C5 D5 E5 | D5:1.5 C5:0.5 C5:2` },
  { vel: 0.5, tr: 12, def: 2, src: `G4:4 | G4:4 | E4:4 | F4:4 | G4:4 | G4:4 | E4:4 | F4 E4 | B3 C4 | B3 C4 | B3 B3 | C4 B3 | G4:4 | G4:4 | E4:4 | F4 E4` },
  { vel: 0.7, def: 2, src: `C3 E3 | G2 B2 | C3 E3 | G2 G2 | C3 E3 | G2 B2 | C3 E3 | G2 C3 | G2 C3 | G2 C3 | G2 C3 | C3 G2 | C3 E3 | G2 B2 | C3 E3 | G2 C3` },
]);
const GREENSLEEVES = () => piece('Greensleeves', 132, [
  { roll: true, vel: 0.9, tr: 12, src: `r:2 A4 | C5:2 D5 | E5:1.5 F5:0.5 E5 | D5:2 B4 | G4:1.5 A4:0.5 B4 | C5:2 A4 | A4:1.5 G#4:0.5 A4 | B4:2 G#4 | E4:2 A4 |
    C5:2 D5 | E5:1.5 F5:0.5 E5 | D5:2 B4 | G4:1.5 A4:0.5 B4 | C5:1.5 B4:0.5 A4 | G#4:1.5 F#4:0.5 G#4 | A4:3 | A4:3 |
    G5:3 | G5:1.5 F#5:0.5 E5 | D5:2 B4 | G4:1.5 A4:0.5 B4 | C5:2 A4 | A4:1.5 G#4:0.5 A4 | B4:2 G#4 | E4:3 |
    G5:3 | G5:1.5 F#5:0.5 E5 | D5:2 B4 | G4:1.5 A4:0.5 B4 | C5:1.5 B4:0.5 A4 | G#4:1.5 F#4:0.5 G#4 | A4:3 | A4:3` },
  { vel: 0.65, def: 3, src: `r:3 | A2 | C3 | G2 | E3 | A2 | E3 | E3 | A2 | A2 | C3 | G2 | E3 | A2 | E3 | A2 | A2 |
    C3 | E3 | G2 | E3 | A2 | E3 | E3 | E3 | C3 | E3 | G2 | E3 | A2 | E3 | A2 | A2` },
  { vel: 0.45, def: 3, tr: 12, src: `r:3 | E4 | E4 | D4 | B3 | E4 | E4 | D4 | C4 | E4 | E4 | D4 | B3 | E4 | D4 | C4 | C4 |
    E4 | B3 | D4 | B3 | E4 | E4 | D4 | B3 | E4 | B3 | D4 | B3 | E4 | D4 | C4 | C4` },
]);
const ELISE = () => {
  const a = `E5:1 D#5 | E5 D#5 E5 B4 D5 C5 | A4+A2 E3 A3 C4 E4 A4 | B4+E2 E3 G#3 E4 G#4 B4 | C5+A2 E3 A3 E4 E5 D#5 |
    E5 D#5 E5 B4 D5 C5 | A4+A2 E3 A3 C4 E4 A4 | B4+E2 E3 G#3 E4 C5 B4 | A4+A2 E3 A3 r:3`;
  return piece('Für Elise', 340, [{ vel: 0.85, tr: 12, src: a + ' ' + a }]);
};
const CANON = () => piece('Canon in D', 66, [
  { vel: 0.7, def: 2, src: Array(6).fill('D3 A2 B2 F#3 G2 D3 G2 A2').join(' ') },
  { vel: 0.85, roll: true, tr: 12, def: 2, src: `r:16 | F#4 E4 D4 C#4 B3 A3 B3 C#4 | D4 C#4 B3 A3 G3 F#3 G3 E3 |
    D3:1 F#3:1 A3:1 G3:1 F#3:1 D3:1 F#3:1 E3:1 D3:1 B2:1 D3:1 A3:1 G3:1 B3:1 A3:1 G3:1 |
    F#4 E4 D4 C#4 B3 A3 B3 C#4 | D4:1 C#4:1 B3:1 A3:1 G3:1 F#3:1 G3:1 E3:1 F#3:1 E3:1 D3:1 E3:1 F#3:1 D3:1 E3:1 C#3:1` },
  { vel: 0.5, tr: 12, def: 2, src: `r:32 | A3 A3 F#3 C#3 D3 D3 D3 E3 | r:16 | D3 C#3 B2 A2 B2 A2 B2 C#3` },
]);
// seeded broken-chord prelude in G or D major: bass on the beat, arpeggio in the middle bells, a pentatonic tune on top
function prelude(seed) {
  let s = seed >>> 0 || 7; const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const key = rnd() < 0.5 ? 55 : 50; // G3 or D3
  const prog = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14], [0, 4, 7], [9, 12, 16], [2, 5, 9], [7, 11, 14], [5, 9, 12], [7, 11, 14], [4, 7, 11], [9, 12, 16], [5, 9, 12], [7, 11, 14], [0, 4, 7], [0, 4, 7]];
  const bpm = 84 + Math.floor(rnd() * 16), spb = 60 / bpm, ev = []; const penta = [0, 2, 4, 7, 9];
  let mel = key + 24 + 4;
  prog.forEach((ch, i) => {
    const t0 = i * 2 * spb, root = key + ch[0];
    ev.push({ t: t0, m: root - 12 >= 43 ? root - 12 : root, v: 0.7 });
    for (let k = 0; k < 4; k++) ev.push({ t: t0 + k * spb * 0.5, m: key + 12 + ch[k % 3] + (k === 3 ? 12 : 0), v: 0.42 });
    const pat = rnd() < 0.5 ? [0, 1] : [0, 0.5, 1, 1.5];
    for (const p of pat) {
      const opts = []; for (let o = 24; o <= 36; o += 12) for (const pc of penta) { const m = key + o + pc; if (Math.abs(m - mel) <= 5) opts.push(m); }
      const cands = opts.filter((m) => ch.some((c) => (m - key - c) % 12 === 0)); const pick = (cands.length && rnd() < 0.7 ? cands : opts);
      mel = pick[Math.floor(rnd() * pick.length)] || mel; ev.push({ t: t0 + p * spb, m: mel, v: 0.85 });
    }
  });
  ev.push({ t: prog.length * 2 * spb, m: key + 24, v: 0.9 }, { t: prog.length * 2 * spb, m: key, v: 0.75 }, { t: prog.length * 2 * spb, m: key + 16, v: 0.6 });
  return { name: 'Prelude', events: ev.sort((a, b) => a.t - b.t), dur: (prog.length * 2 + 4) * spb + 3 };
}

// Build a recital program lasting `seconds` (seeded per day and slot): returns [{t, m, v}] and the piece list.
export function recitalProgram(seed, seconds) {
  let s = (seed >>> 0) || 1; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pool = [ODE, GREENSLEEVES, CANON, ELISE];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const events = [], list = []; let t = 1.0, k = 0, pi = 0;
  while (t < seconds - 20) {
    // each tune once per recital (a fresh seeded prelude between them and once the tunes run out)
    const p = k % 2 === 0 || pi >= pool.length ? prelude(Math.floor(rnd() * 1e9)) : pool[pi++]();
    if (t + p.dur > seconds + 5) break;
    for (const e of p.events) events.push({ t: t + e.t, m: Math.max(43, Math.min(103, e.m)), v: e.v });
    list.push({ name: p.name, t }); t += p.dur + 6 + rnd() * 6; k++;
  }
  return { events, list };
}
// Danny Deever is played at noon on the last day of instruction; we don't have the tune, so that day's noon recital is
// the regular program and the carillon then stays silent through RRR week and finals (see campanile.js).
