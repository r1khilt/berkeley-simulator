// Time-of-day helpers for the UI and boot: Berkeley sun events, presets, the "never open at night" guard and
// the daylight gradient drawn behind the time slider. Pure functions (no DOM, no three.js state).
import { sunPosition } from '../world/sky.js';
import { pacificParts, pacificHour, dateAtPacificHour } from '../time.js';

export const DAY_DEFAULT = 13.5;    // 1:30 pm: what a visit opens at when live Berkeley time is dark
export const MORNING_CUTOFF = 7.5;  // before 7:30 am counts as "dark" for the default
const DEG = 180 / Math.PI;

// Calendar day (YYYY-MM-DD) in Berkeley.
export function pacificDay(d = new Date()) {
  const p = pacificParts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
// A Date on the given Berkeley day (noon PST is always the same calendar day), for dateAtPacificHour(h, base).
export function dayBase(day) { return day ? new Date(day + 'T12:00:00-08:00') : new Date(); }
export function dateFor(hour, day) { return dateAtPacificHour(hour, dayBase(day)); }
export const sunAltDeg = (hour, day) => sunPosition(dateFor(hour, day)).altitude * DEG;

// Sunrise / sunset (upper limb at the horizon, -0.83 deg), solar noon and the golden-hour start, in Berkeley hours.
const cache = new Map();
export function sunEvents(day) {
  const key = day || pacificDay();
  if (cache.has(key)) return cache.get(key);
  const step = 5 / 60, cross = (h, a0, a1, t) => h - step + step * (t - a0) / (a1 - a0);
  let prev = sunAltDeg(0, key), rise = 6.5, set = 17.5, noon = 12, maxA = -90, golden = null;
  for (let h = step; h <= 24.0001; h += step) {
    const a = sunAltDeg(Math.min(h, 23.999), key);
    if (a > maxA) { maxA = a; noon = h; }
    if (prev < -0.83 && a >= -0.83) rise = cross(h, prev, a, -0.83);
    if (prev >= -0.83 && a < -0.83) set = cross(h, prev, a, -0.83);
    if (prev >= 6 && a < 6) golden = cross(h, prev, a, 6);
    prev = a;
  }
  const ev = { rise, set, noon, golden: golden ?? set - 0.75, maxAlt: maxA };
  if (cache.size > 64) cache.clear();
  cache.set(key, ev);
  return ev;
}
// Presets (hours on the chosen day), rounded to 5 minutes so the readout looks intentional.
const r5 = (h) => Math.round(h * 12) / 12;
export const PRESETS = [
  { id: 'morning', label: 'Morning', icon: 'sunrise', hour: (ev) => r5(Math.max(9, ev.rise + 1.5)) },
  { id: 'noon', label: 'Noon', icon: 'sun', hour: (ev) => r5(ev.noon) },
  { id: 'golden', label: 'Golden hour', icon: 'sunDim', hour: (ev) => r5(ev.golden + 0.15) },
  { id: 'sunset', label: 'Sunset', icon: 'sunset', hour: (ev) => r5(ev.set - 0.2) },
  { id: 'night', label: 'Night', icon: 'moon', hour: (ev) => r5(Math.max(21.5, ev.set + 1.6)) },
];
export function presetHour(id, day) { const p = PRESETS.find((x) => x.id === id); return p ? p.hour(sunEvents(day)) : null; }

// "Dark" for the purposes of the default: before 7:30 am (or sunrise, if later) or after sunset on that day.
export function isDark(date) {
  const h = pacificHour(date), ev = sunEvents(pacificDay(date));
  return h < Math.max(MORNING_CUTOFF, ev.rise) || h >= ev.set;
}
export function isNightHour(hour, day) { const ev = sunEvents(day); return hour < ev.rise - 0.25 || hour > ev.set + 0.4; }

export function fmtHour(h, withPeriod = true) {
  h = ((h % 24) + 24) % 24; let hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  if (mm === 60) { hh = (hh + 1) % 24; mm = 0; }
  const t = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`;
  return withPeriod ? `${t} ${hh >= 12 ? 'PM' : 'AM'}` : t;
}
const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric' });
export function fmtDay(day) { return dayFmt.format(dayBase(day)); }

// CSS gradient for the slider track: the colour of the sky across 24 h on that day (night, twilight, gold, day).
const NIGHT = [24, 30, 50], TWI = [60, 56, 100], GLOW = [226, 128, 88], GOLD = [242, 182, 102], DAY = [140, 194, 238], NOON = [98, 166, 232];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));
function skyRGB(alt) {
  if (alt < -12) return NIGHT;
  if (alt < -6) return mix(NIGHT, TWI, (alt + 12) / 6);
  if (alt < -0.5) return mix(TWI, GLOW, (alt + 6) / 5.5);
  if (alt < 6) return mix(GLOW, GOLD, (alt + 0.5) / 6.5);
  if (alt < 14) return mix(GOLD, DAY, (alt - 6) / 8);
  return mix(DAY, NOON, (alt - 14) / 30);
}
export function dayGradient(day) {
  const stops = [];
  for (let i = 0; i <= 96; i++) { const h = i / 4, c = skyRGB(sunAltDeg(Math.min(h, 23.99), day)); stops.push(`rgb(${c.join(',')}) ${(h / 24 * 100).toFixed(2)}%`); }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
