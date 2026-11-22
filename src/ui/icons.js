// Inline SVG icon set (24x24, 1.75 px strokes, currentColor). Mostly Lucide-derived (ISC licence) plus a few
// custom glyphs (walk, drone, scooter, hoverboard, horse, campanile). icon(name) returns an <svg> string.
const P = {
  search: '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  locate: '<path d="M2 12h3"/><path d="M19 12h3"/><path d="M12 2v3"/><path d="M12 19v3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/>',
  navigate: '<path d="M12 2.5 19 21l-7-4-7 4z"/>',
  map: '<path d="M3 6.5 9 3.5l6 3 6-3v14l-6 3-6-3-6 3z"/><path d="M9 3.5v14"/><path d="M15 6.5v14"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M6 9h.01"/><path d="M10 9h.01"/><path d="M14 9h.01"/><path d="M18 9h.01"/><path d="M7 12.5h.01"/><path d="M11 12.5h.01"/><path d="M15 12.5h.01"/><path d="M8 15.5h8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  sunrise: '<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
  sunset: '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
  sunDim: '<circle cx="12" cy="12" r="4"/><path d="M12 4h.01"/><path d="M20 12h.01"/><path d="M12 20h.01"/><path d="M4 12h.01"/><path d="M17.66 6.34h.01"/><path d="M17.66 17.66h.01"/><path d="M6.34 17.66h.01"/><path d="M6.34 6.34h.01"/>',
  haze: '<path d="m5.2 6.2 1.4 1.4"/><path d="M2 13h2"/><path d="M20 13h2"/><path d="m17.4 7.6 1.4-1.4"/><path d="M22 17H2"/><path d="M22 21H2"/><path d="M16 13a4 4 0 0 0-8 0"/><path d="M12 5V2.5"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  cloudSun: '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  cloudMoon: '<path d="M13 16a3 3 0 1 1 0 6H7a5 5 0 1 1 4.9-6Z"/><path d="M10.1 9A6 6 0 0 1 16 4a4.24 4.24 0 0 0 6 6 6 6 0 0 1-3 5.197"/>',
  overcast: '<path d="M17.5 21H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="M22 10a3 3 0 0 0-3-3h-2.207a5.502 5.502 0 0 0-10.702.5"/>',
  fog: '<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/><path d="M16 17H7"/><path d="M17 21H9"/>',
  rain: '<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>',
  live: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4"/><path d="M8 2.5v4"/><path d="M3 10h18"/>',
  pin: '<path d="M19.5 10c0 5.5-7.5 11.5-7.5 11.5S4.5 15.5 4.5 10a7.5 7.5 0 0 1 15 0Z"/><circle cx="12" cy="10" r="2.75"/>',
  landmark: '<path d="M3 21.5h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2.5 20 7.5H4z"/>',
  building: '<rect x="5" y="2.5" width="14" height="19" rx="1.5"/><path d="M9.5 21.5v-4h5v4"/><path d="M9 6.5h.01"/><path d="M15 6.5h.01"/><path d="M9 10.5h.01"/><path d="M15 10.5h.01"/><path d="M9 14h.01"/><path d="M15 14h.01"/>',
  user: '<circle cx="12" cy="8" r="4.5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12.5 5.5 6.5 6.5-6.5 6.5"/>',
  arrowUp: '<path d="m5.5 11.5 6.5-6.5 6.5 6.5"/><path d="M12 19V5"/>',
  chevronsUp: '<path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.25"/>',
  reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4.5"/><path d="M12 8h.01"/>',
  mouse: '<rect x="6" y="2.5" width="12" height="19" rx="6"/><path d="M12 6.5v4"/>',
  // movement modes (custom glyphs)
  walk: '<circle cx="13.5" cy="4" r="1.75"/><path d="M12.6 7.6 11 13.4"/><path d="m11 13.4-1.6 3.7-2 3.9"/><path d="m11 13.4 2.6 3 1 4.6"/><path d="m12.4 8.4-2.5 1.9-1.4 2.7"/><path d="m12.4 8.4 2 2.5 2.6 1"/>',
  bike: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  drone: '<rect x="8.5" y="11" width="7" height="4.5" rx="1.6"/><path d="M8.5 12.5H4.5"/><path d="M15.5 12.5h4"/><path d="M4.5 12.5V9.5"/><path d="M19.5 12.5V9.5"/><path d="M1.5 9.5h6"/><path d="M16.5 9.5h6"/><path d="m10 15.5-1.5 3"/><path d="m14 15.5 1.5 3"/>',
  scooter: '<circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M8 17.5h7.5"/><path d="M18.5 17.5 15 4"/><path d="M12.5 4h5"/>',
  hoverboard: '<path d="M2.5 11.5c0-.9.7-1.5 1.6-1.5h15.8c.9 0 1.6.6 1.6 1.5s-.7 1.5-1.6 1.5H4.1c-.9 0-1.6-.6-1.6-1.5Z"/><path d="M6 16.5h4"/><path d="M14 16.5h4"/><path d="M9.5 19.5h5"/>',
  horse: '<path d="M9 21c0-3 .5-5.5 1.6-7.4l5.9 2c1 .3 2 .1 2.5-.7.4-.6.3-1.4-.1-2L13.2 4.6l.4-2.6-2.1 2C7.9 4.6 5 8.2 5 13v8"/><path d="M13.6 8.6h.01"/><path d="M9.2 6.2C8 7.4 7.3 8.8 7 10.3"/>',
  hook: '<path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>',
  skate: '<path d="M2.5 13h19"/><path d="M4 13c0 1.5 1 2 2 2h12c1 0 2-.5 2-2"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>',
  car: '<path d="M5 17H3.5a1 1 0 0 1-1-1v-3.5l2.2-5A2 2 0 0 1 6.5 6.3h11a2 2 0 0 1 1.8 1.2l2.2 5V16a1 1 0 0 1-1 1H19"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/><path d="M3 12h18"/>',
  move: '<path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/>',
};
// Aliases so movement plugins can name an icon loosely (icon: 'lime', 'grapple', ...).
const ALIAS = { fly: 'drone', flying: 'drone', cycle: 'bike', bicycle: 'bike', lime: 'scooter', 'e-scooter': 'scooter', escooter: 'scooter', scooters: 'scooter', hover: 'hoverboard', board: 'hoverboard', horseback: 'horse', ride: 'horse', grapple: 'hook', grappling: 'hook', grapplinghook: 'hook', 'grappling-hook': 'hook', skateboard: 'skate', veo: 'scooter', drive: 'car', settings: 'gear', close: 'x' };
export function hasIcon(name) { const k = String(name || '').toLowerCase(); return !!(P[name] || P[k] || P[ALIAS[k]]); }
export function icon(name, cls = '') {
  if (typeof name === 'string' && name.trim().startsWith('<svg')) return /^\s*<svg[^>]*\sclass=/.test(name) ? name : name.replace(/^\s*<svg/, `<svg class="i ${cls}" aria-hidden="true"`); // plugin-supplied SVG (r5-controls: sized like the built-in icons)
  const k = String(name || '').toLowerCase();
  const body = P[name] || P[k] || P[ALIAS[k]] || P.move;
  return `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
export const ICON_NAMES = Object.keys(P);
// Brand mark: the Campanile in Berkeley gold on a Berkeley-blue tile.
export const LOGO = '<svg class="logo" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#003262"/><path d="M24 7.5 28 16.5H20z" fill="#FDB515"/><rect x="20.5" y="16.5" width="7" height="19" rx=".6" fill="#FDB515"/><rect x="22.6" y="19" width="2.8" height="4.2" rx="1.4" fill="#003262"/><rect x="17.5" y="35.5" width="13" height="3" rx="1" fill="#FDB515"/></svg>';
