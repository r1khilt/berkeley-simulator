// Pacific-time helpers
const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
export function pacificParts(d) {
  const o = {}; for (const p of fmt.formatToParts(d)) if (p.type !== 'literal') o[p.type] = +p.value;
  if (o.hour === 24) o.hour = 0; return o;
}
export function pacificHour(d) { const p = pacificParts(d); return p.hour + p.minute / 60 + p.second / 3600; }
// Date for today's Pacific calendar day at hour h (fractional)
export function dateAtPacificHour(h, base = new Date()) {
  const p = pacificParts(base);
  // offset between UTC and Pacific for that day
  const guess = Date.UTC(p.year, p.month - 1, p.day, Math.floor(h), Math.round((h % 1) * 60));
  const q = pacificParts(new Date(guess));
  const diffH = (q.hour + q.minute / 60) - (Math.floor(h) + Math.round((h % 1) * 60) / 60);
  let dh = diffH; if (dh > 12) dh -= 24; if (dh < -12) dh += 24;
  return new Date(guess - dh * 3600000);
}
export function clockString(d) { const p = pacificParts(d); const ap = p.hour >= 12 ? 'PM' : 'AM'; return `${((p.hour + 11) % 12) + 1}:${String(p.minute).padStart(2, '0')} <b>${ap}</b>`; }
