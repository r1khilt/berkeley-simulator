// All DOM UI: landing + loading, HUD (location, time & weather chip, map / settings / controls buttons, minimap with
// compass, movement modes, prompts, notices), full map with search and fast travel, time & weather popover,
// settings, controls, avatar and touch controls.
// Visual language: neutral translucent "material" panels, Inter, inline SVG icons (icons.js), Berkeley blue and gold
// used sparingly. Light/dark follows the scene's day/night unless Settings > Appearance says otherwise.
// Movement modes are generic: built-ins (walk/bike/fly) plus any player.plugins entry with a key, label or icon.
import { LOOKS } from '../player/avatar.js';
import { icon, LOGO } from './icons.js';
import { pacificHour } from '../time.js';
import { PRESETS, sunEvents, fmtHour, fmtDay, dayGradient, pacificDay, presetHour } from './timeofday.js';

const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = (s) => String(s || '').replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
const KEYS = { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt', BracketLeft: '[', BracketRight: ']', Backquote: '`', Minus: '-', Equal: '=', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", Backslash: '\\', Tab: 'Tab', Enter: 'Enter', Escape: 'Esc' };
export const keyName = (code) => (!code ? '' : KEYS[code] || String(code).replace(/^(Key|Digit|Numpad|Arrow)/, ''));
const kbd = (...k) => k.map((x) => `<kbd>${esc(x)}</kbd>`).join('');
const BUILTIN_MODES = [
  { id: 'walk', label: 'Walk', icon: 'walk', hint: 'Shift to run, Space to jump' },
  { id: 'bike', label: 'Bike', key: 'KeyB', icon: 'bike' },
  { id: 'fly', label: 'Fly', key: 'KeyF', icon: 'drone', hint: 'Space to climb, C to descend, Shift for speed' },
];
const WEATHER = [['live', 'Current', 'live', 'Current Berkeley weather'], ['clear', 'Clear', 'sun', 'Clear'], ['cloudy', 'Cloudy', 'cloudSun', 'Partly cloudy'], ['overcast', 'Overcast', 'overcast', 'Overcast'], ['fog', 'Fog', 'fog', 'Karl the Fog']];
const fillRange = (el) => el.style.setProperty('--p', `${((el.value - el.min) / (el.max - el.min)) * 100}%`);
// draw the part of a big canvas that falls inside a source rectangle (clamped), into a destination rectangle
function drawRegion(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
  const kx = dw / sw, ky = dh / sh, x0 = Math.max(0, sx), y0 = Math.max(0, sy), x1 = Math.min(img.width, sx + sw), y1 = Math.min(img.height, sy + sh);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0, dx + (x0 - sx) * kx, dy + (y0 - sy) * ky, (x1 - x0) * kx, (y1 - y0) * ky);
}
const P2D = {}; const path2d = (name) => (P2D[name] ||= (() => { const m = icon(name).match(/<svg[^>]*>(.*)<\/svg>/s); const p = new Path2D(); const re = /<(path|circle|rect)\s([^>]*)\/>/g; let x; while ((x = re.exec(m ? m[1] : ''))) { const a = Object.fromEntries([...x[2].matchAll(/([\w-]+)="([^"]*)"/g)].map((q) => [q[1], q[2]])); if (x[1] === 'path') p.addPath(new Path2D(a.d)); else if (x[1] === 'circle') { const s = new Path2D(); s.arc(+a.cx, +a.cy, +a.r, 0, Math.PI * 2); p.addPath(s); } else { const s = new Path2D(); s.roundRect ? s.roundRect(+a.x, +a.y, +a.width, +a.height, +(a.rx || 0)) : s.rect(+a.x, +a.y, +a.width, +a.height); p.addPath(s); } } return p; })());

export class UI {
  constructor(root) {
    this.root = root; this.state = 'title'; this.cb = {};
    this.isTouch = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
    this.units = /^en-(US|LR)|^my/i.test(navigator.language || 'en-US') ? 'imperial' : 'metric';
    this.themeMode = 'auto'; this.theme = ''; this.night = 0; this.found = 0; this.total = 0;
    this.setTheme('auto');
    document.documentElement.classList.toggle('touch-ui', this.isTouch);
    this.boot = $('div', 'boot'); document.body.appendChild(this.boot);
    this.fadeEl = $('div', 'fade'); document.body.appendChild(this.fadeEl);
    this._buildTitle(); this._buildHud();
    addEventListener('keydown', (e) => this._onKey(e));
    // a sheet or the map needs the cursor: if a late pointer-lock request lands while one is open, release it again
    document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement && (this.panelEl || this.bigmap)) document.exitPointerLock(); });
  }
  on(name, fn) { this.cb[name] = fn; }
  applySettings(s) { if (s.units) this.units = s.units; this.setTheme(s.theme || 'auto'); document.documentElement.classList.toggle('lowfx', s.quality === 'low' || this.isTouch); }
  // ---------- theme: light by day, dark at night (Settings > Appearance overrides)
  setTheme(mode) { this.themeMode = mode || 'auto'; this._applyTheme(); }
  setNight(v) { this.night = v; if (this.themeMode === 'auto') this._applyTheme(); }
  _applyTheme() {
    let t = this.themeMode;
    if (t === 'auto') t = this.theme === 'dark' ? (this.night > 0.4 ? 'dark' : 'light') : (this.night > 0.6 ? 'dark' : 'light');
    if (t !== this.theme) { this.theme = t; document.documentElement.dataset.theme = t; const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#16181d' : '#f2f2f4'; }
  }
  // ---------- landing / loading
  _buildTitle() {
    this.title = $('div', 'title', `<div class="title-scrim"></div>
      <section class="title-mid">
        <div class="brand">${LOGO}</div>
        <h1>Berkeley Simulator</h1>
        <p class="lede">Explore a detailed 3D model of UC Berkeley and the city around it, built from LiDAR, aerial imagery and OpenStreetMap.</p>
        <div class="loading"><div class="bar"><b></b></div><div class="loading-row"><span class="title-note">Loading the campus…</span><span class="pct">0%</span></div></div>
        <nav class="menu hidden">
          <button class="btn primary lg" data-a="play">Explore campus${icon('arrowRight')}</button>
          <button class="btn secondary lg" data-a="look">${icon('user')}Avatar</button>
          <button class="btn secondary lg" data-a="settings">${icon('gear')}Settings</button>
        </nav>
        <div class="title-time hidden"></div>
      </section>
      <footer class="title-foot"><span class="tf-place">${icon('pin')}<span></span></span><span class="tf-attr">© OpenStreetMap contributors · USGS 3DEP LiDAR · USDA NAIP</span></footer>`);
    document.body.appendChild(this.title);
    this.titleBar = this.title.querySelector('.bar b'); this.titleNote = this.title.querySelector('.title-note'); this.titlePct = this.title.querySelector('.pct');
    this.menu = this.title.querySelector('.menu'); this.titleTimeEl = this.title.querySelector('.title-time');
    this.title.addEventListener('click', (e) => { const a = e.target.closest('[data-a]')?.dataset.a; if (a) this.cb[a]?.(); });
  }
  progress(f) { f = Math.max(0, Math.min(1, f)); this.titleBar.style.transform = `scaleX(${f})`; this.titlePct.textContent = `${Math.round(f * 100)}%`; if (f >= 1 && !/^Could not/.test(this.titleNote.textContent)) this.titleNote.textContent = 'Starting…'; }
  note(t) { this.titleNote.textContent = t; if (/^Could not/.test(t)) this.title.classList.add('failed'); }
  ready() {
    this.title.querySelector('.loading').classList.add('hidden'); this.menu.classList.remove('hidden');
    if (this.titleTimeEl.innerHTML) { this.titleTimeEl.classList.remove('hidden'); this.titleTimeSeen = true; } this._readyAt = performance.now();
    this.boot.classList.add('done'); setTimeout(() => this.boot.remove(), 1500);
    this.title.classList.add('ready');
  }
  // one line under the landing buttons: when the visit starts and, if we moved it to daylight, why
  titleTime(st) {
    let html = typeof st === 'string' ? st : '';
    if (st && typeof st === 'object') {
      if (st.autoDay) html = `${icon('sun')}<span>Daylight view at ${fmtHour(st.hour)} · Berkeley time is ${fmtHour(pacificHour(st.autoDay))}. <button data-a="time">Change time</button></span>`;
      else if (!st.live) html = `${icon('clock')}<span>Opening at ${fmtHour(st.hour)}${st.date ? ` on ${fmtDay(st.date)}` : ''}. <button data-a="time">Change</button></span>`;
    }
    this.titleTimeEl.innerHTML = html; this.titleTimeEl.classList.toggle('hidden', !html || !this.title.classList.contains('ready'));
  }
  // true once the landing has shown the time note for a moment (so the HUD needn't repeat it)
  noteSeen() { return !!this.titleTimeSeen && performance.now() - (this._readyAt || 0) > 1500; }
  titlePlace(t) { const e = this.title.querySelector('.tf-place span'); if (e && e.textContent !== t) e.textContent = t; }
  showTitle(on) {
    this.title.classList.toggle('off', !on); this.hud.classList.toggle('off', on); this.state = on ? 'title' : 'play';
    let seen = false; try { seen = localStorage.getItem('bsim.hinted') === '1'; localStorage.setItem('bsim.hinted', '1'); } catch (e) {}
    if (!on && !this._hinted && !seen) { this._hinted = true; setTimeout(() => this.hint(this.isTouch ? 'Drag to look around · use the stick to move' : `${kbd('W', 'A', 'S', 'D')} Move <i></i> ${kbd('Shift')} Run <i></i> ${kbd('M')} Map <i></i> ${kbd('T')} Time <i></i> ${kbd('H')} Controls`, 8000), 900); }
  }
  fade(cb, hold = 300) { this.fadeEl.classList.add('on'); setTimeout(() => { cb && cb(); setTimeout(() => this.fadeEl.classList.remove('on'), hold); }, 380); }
  // ---------- HUD
  _buildHud() {
    this.hud = $('div', 'hud off', `
      <div class="loc material"><span class="loc-ic">${icon('pin')}</span><div class="loc-t"><div class="n"></div><div class="s hidden"></div></div></div>
      <div class="count sr-only"></div>
      <div class="hud-tr">
        <button class="chip material time-chip" data-h="time" title="Time & weather (T)"><span class="wxi">${icon('sun')}</span><span class="live-dot"></span><span class="clock"></span><span class="wx"></span>${icon('chevronDown', 'chev')}</button>
        <div class="btn-group material" role="toolbar" aria-label="Tools">
          <button data-h="map" title="Map (M)" aria-label="Map">${icon('map')}</button>
          <button data-h="settings" title="Settings" aria-label="Settings">${icon('gear')}</button>
          <button data-h="help" title="Controls (H)" aria-label="Controls">${icon('keyboard')}</button>
        </div>
      </div>
      <div class="mm"><canvas width="352" height="352" title="Open map (M)"></canvas><button class="mm-compass" title="Compass · click to switch north up / heading up" aria-label="Compass"><span class="needle"><i></i><b>N</b></span></button></div>
      <div class="modes material" role="radiogroup" aria-label="Movement mode"></div>
      <div class="prompt off"><kbd>E</kbd><span class="pt"></span></div>
      <div class="notice off"><span class="ni"></span><span class="nt"></span></div>
      <div class="toast material off"><div class="t-ic"></div><div class="t-body"><div class="k"></div><div class="n"></div><div class="s"></div><div class="b"></div></div></div>
      <div class="hint off"></div>
      <div class="reticle hidden"></div>`);
    document.body.appendChild(this.hud);
    const q = (s) => this.hud.querySelector(s);
    this.locN = q('.loc .n'); this.locS = q('.loc .s'); this.countEl = q('.count'); this.clockEl = q('.clock'); this.wxEl = q('.wx'); this.wxIcon = q('.wxi'); this.timeChip = q('.time-chip');
    this.promptEl = q('.prompt'); this.promptTxt = q('.prompt .pt'); this.toastEl = q('.toast'); this.noticeEl = q('.notice'); this.hintEl = q('.hint'); this.reticle = q('.reticle');
    this.mmEl = q('.mm'); this.mmCanvas = q('.mm canvas'); this.mmCtx = this.mmCanvas.getContext('2d'); this.needle = q('.mm-compass .needle'); this.modesEl = q('.modes');
    this.hud.addEventListener('click', (e) => {
      const btn = e.target.closest('button'); if (btn) btn.blur(); // keep Space/Enter for the game, not the focused button
      const h = e.target.closest('[data-h]'); if (h) { if (h.dataset.h === 'help') this.help(); else this.cb[h.dataset.h]?.(); return; }
      const md = e.target.closest('[data-mode]');
      if (md) { // touch: the bar is collapsed to the current mode; first tap expands it
        if (this.isTouch && !this.modesEl.classList.contains('open')) { this.modesEl.classList.add('open'); clearTimeout(this._mo); this._mo = setTimeout(() => this.modesEl.classList.remove('open'), 5000); return; }
        this.modesEl.classList.remove('open'); this._pickMode(md.dataset.mode);
      }
    });
    this.mmCanvas.addEventListener('click', () => this.cb.map?.());
    q('.mm-compass').addEventListener('click', (e) => { e.stopPropagation(); e.currentTarget.blur(); this.cb.toggleNorth?.(); });
    this._renderModes();
  }
  compass(headingDeg) { this._heading = headingDeg; const r = this.mmNorth ? 0 : -headingDeg; if (this._nr !== r) { this._nr = r; this.needle.style.transform = `rotate(${r.toFixed(1)}deg)`; } }
  location(n, s) {
    if (this._ln !== n) { this.locN.textContent = n || ''; this._ln = n; this.locN.parentElement.parentElement.classList.toggle('empty', !n); }
    if (this._ls !== s) { this.locS.textContent = s || ''; this.locS.classList.toggle('hidden', !s); this._ls = s; }
  }
  count(found, total) { this.found = found; this.total = total; this.countEl.textContent = `${found} / ${total} places discovered`; }
  clock(t, wx, st) {
    if (t !== this._clk) { this._clk = t; this.clockEl.innerHTML = String(t).replace(/<b>(AM|PM)<\/b>/, '<small>$1</small>'); }
    const short = wx ? (wx.match(/-?\d+°[FC]?/)?.[0] || wx) : '';
    if (short !== this._wx) { this._wx = short; this.wxEl.textContent = short; this.wxEl.classList.toggle('hidden', !short); }
    const ic = this._wxIconName(st); if (ic !== this._wxi) { this._wxi = ic; this.wxIcon.innerHTML = icon(ic); }
    const live = !!st?.live; if (live !== this._live) { this._live = live; this.timeChip.classList.toggle('live', live); }
    this.timeChip.title = `Time & weather (T)${wx ? ' · ' + wx : ''}${live ? ' · Live' : ''}`;
    if (this._timeRefresh && live && performance.now() - (this._trT || 0) > 1000) { this._trT = performance.now(); this._timeRefresh(); }
  }
  _wxIconName(st) {
    const night = this.night > 0.5; let w = st?.weather || 'clear';
    if (w === 'live') { const c = st?.wx?.weather_code, cc = st?.wx?.cloud_cover ?? 0; w = c == null ? 'clear' : (c === 45 || c === 48) ? 'fog' : c >= 51 ? 'rain' : (c === 3 || cc > 80) ? 'overcast' : (c >= 1 || cc > 30) ? 'cloudy' : 'clear'; }
    return { clear: night ? 'moon' : 'sun', cloudy: night ? 'cloudMoon' : 'cloudSun', overcast: 'overcast', fog: 'fog', rain: 'rain' }[w] || 'sun';
  }
  prompt(label) {
    if (label === this._pl) return; this._pl = label;
    if (label) { this.promptTxt.textContent = label; this.promptEl.classList.remove('off'); } else this.promptEl.classList.add('off');
  }
  toast({ kind = 'Discovered', name, sub, blurb, icon: ic } = {}, ms = 6500) {
    const t = this.toastEl, disc = kind === 'Discovered';
    t.querySelector('.k').textContent = disc ? '' : (kind || ''); t.querySelector('.k').classList.toggle('hidden', disc || !kind); t.querySelector('.n').textContent = name || ''; t.querySelector('.s').textContent = sub || ''; t.querySelector('.b').textContent = blurb || '';
    t.querySelector('.s').classList.toggle('hidden', !sub); t.querySelector('.b').classList.toggle('hidden', !blurb);
    t.querySelector('.t-ic').innerHTML = icon(ic || (disc ? 'landmark' : 'info'));
    t.classList.remove('off'); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.add('off'), ms);
  }
  // small transient notice (bottom centre), e.g. "Interface hidden" or "Opened in daylight"
  notify(text, { icon: ic = 'info', ms = 4200 } = {}) {
    const n = this.noticeEl; n.querySelector('.ni').innerHTML = icon(ic); n.querySelector('.nt').textContent = text;
    n.classList.remove('off'); clearTimeout(this._nt); this._nt = setTimeout(() => n.classList.add('off'), ms);
  }
  hint(html, ms = 6000) { const h = this.hintEl; if (!html) { h.classList.add('off'); return; } h.innerHTML = html; h.classList.remove('off'); clearTimeout(this._ht); this._ht = setTimeout(() => h.classList.add('off'), ms); }
  reticleOn(on) { this.reticle.classList.toggle('hidden', !on); }
  hudOn(on) { this.hud.classList.toggle('off', !on); }
  // ---------- movement modes (generic: built-ins + player.plugins with key / label / icon)
  bindPlayer(player) { this.player = player; this._modeSig = null; this.modes(); }
  _modeList() {
    const pl = (this.player && this.player.plugins) || {}, list = [];
    for (const b of BUILTIN_MODES) { const o = pl[b.id]; list.push(o ? { ...b, label: o.label || b.label, key: o.key || b.key, icon: o.icon || b.icon, hint: o.hint || b.hint } : b); }
    for (const [id, o] of Object.entries(pl)) {
      if (BUILTIN_MODES.some((b) => b.id === id) || !o || o.hidden || o.tool || !(o.key || o.label || o.icon)) continue;
      list.push({ id, label: o.label || cap(id), key: o.key, icon: o.icon || id, hint: o.hint });
    }
    return list;
  }
  _tools() { return Object.entries((this.player && this.player.plugins) || {}).filter(([, o]) => o && o.tool && !o.hidden).map(([id, o]) => ({ id, label: o.label || cap(id), key: o.key, icon: o.icon || id, hint: o.hint })); }
  _renderModes() {
    const list = this._modeList();
    this.modesEl.innerHTML = `<div class="seg-icons">${list.map((m) => `<button data-mode="${esc(m.id)}" role="radio" title="${esc(m.label)}${m.key ? ` (${esc(keyName(m.key))})` : ''}" aria-label="${esc(m.label)}">${icon(m.icon)}</button>`).join('')}</div><span class="mode-label"><b></b><small></small></span>`;
    this.modeLabel = this.modesEl.querySelector('.mode-label b'); this.modeSpeed = this.modesEl.querySelector('.mode-label small'); this._modeCur = null; this._spd = null;
  }
  modes() {
    const p = this.player; if (!p) return;
    const sig = Object.keys(p.plugins || {}).join(',');
    if (sig !== this._modeSig) { this._modeSig = sig; this._renderModes(); }
    if (p.mode !== this._modeCur) {
      this._modeCur = p.mode; let hit = false;
      this.modesEl.querySelectorAll('[data-mode]').forEach((b) => { const on = b.dataset.mode === p.mode; hit ||= on; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      const m = this._modeList().find((x) => x.id === p.mode); this.modeLabel.textContent = m ? m.label : cap(p.mode);
    }
    const sp = p.speed || 0, show = p.mode !== 'walk' ? sp > 0.6 : sp > 6.5, txt = show ? this.fmtSpeed(sp) : '';
    if (txt !== this._spd) { this._spd = txt; this.modeSpeed.textContent = txt; }
  }
  _pickMode(id) {
    const p = this.player; if (!p) return;
    const r = p.setMode(p.mode === id ? 'walk' : id);
    if (r === false) { const m = this._modeList().find((x) => x.id === id); this.notify(m && m.hint ? m.hint : `${m ? m.label : cap(id)} isn't available here`, { icon: m ? m.icon : 'info' }); }
    this.modes();
  }
  fmtSpeed(mps) { return this.units === 'metric' ? `${Math.round(mps * 3.6)} km/h` : `${Math.round(mps * 2.23694)} mph`; }
  fmtDist(m) {
    if (this.units === 'metric') return m < 950 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(m < 9500 ? 1 : 0)} km`;
    const ft = m * 3.28084; return ft < 800 ? `${Math.max(50, Math.round(ft / 50) * 50)} ft` : `${(ft / 5280).toFixed(ft < 52800 ? 1 : 0)} mi`;
  }
  // ---------- minimap (rounded square, heading-up or north-up; compass button in the corner)
  setMap(map) { this.map = map; }
  minimap(px, pz, headingRad, north = false) {
    const m = this.map; if (!m || this.hud.classList.contains('off')) return;
    if (north !== this.mmNorth) { this.mmNorth = north; this._nr = null; if (this._heading != null) this.compass(this._heading); }
    const c = this.mmCtx, W = this.mmCanvas.width, S = W / 200; // canvas px per metre: ~200 m across
    c.save(); c.fillStyle = '#ecebe5'; c.fillRect(0, 0, W, W);
    c.translate(W / 2, W / 2); if (!north) c.rotate(headingRad); c.scale(S, S);
    const R = (W / S) * 0.72; drawRegion(c, m.canvas, (px - R - m.x0) * m.ppm, (pz - R - m.z0) * m.ppm, 2 * R * m.ppm, 2 * R * m.ppm, -R, -R, 2 * R, 2 * R);
    c.restore();
    if (this.theme === 'dark') { c.fillStyle = 'rgba(14,17,24,.5)'; c.fillRect(0, 0, W, W); }
    c.save(); c.translate(W / 2, W / 2);
    const cs = Math.cos(headingRad), sn = Math.sin(headingRad), lim = W / 2 - 8;
    for (const p of m.places || []) {
      let dx = (p.p[0] - px) * S, dz = (p.p[1] - pz) * S;
      if (!north) { const rx = dx * cs - dz * sn, rz = dx * sn + dz * cs; dx = rx; dz = rz; }
      if (Math.abs(dx) > lim || Math.abs(dz) > lim) continue;
      c.beginPath(); c.arc(dx, dz, p.landmark ? 6 : 4.5, 0, Math.PI * 2);
      c.fillStyle = p.landmark ? '#003262' : p.found ? '#fdb515' : '#ffffff'; c.fill();
      c.lineWidth = 2; c.strokeStyle = p.landmark ? '#ffffff' : p.found ? '#b07a06' : '#8a8f98'; c.stroke();
    }
    if (north) c.rotate(-headingRad);
    const g = c.createRadialGradient(0, 0, 4, 0, 0, 70); g.addColorStop(0, 'rgba(37,113,226,.42)'); g.addColorStop(1, 'rgba(37,113,226,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 70, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); c.closePath(); c.fill();
    c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 6; c.fill(); c.shadowBlur = 0;
    c.beginPath(); c.arc(0, 0, 7.5, 0, Math.PI * 2); c.fillStyle = '#2571e2'; c.fill();
    c.restore();
  }
  // ---------- full map: search, place list, place card, fast travel
  openMap({ px, pz, heading = 0, places, onTravel, search = [] }) {
    if (this.bigmap) return this.closeMap();
    const m = this.map, ui = this;
    const el = $('div', 'bigmap', `<canvas></canvas>
      <aside class="mside material">
        <div class="ms-head"><div><h2>Map</h2><div class="ms-sub"></div></div></div>
        <label class="search">${icon('search')}<input type="search" placeholder="Search places and buildings" autocomplete="off" spellcheck="false" aria-label="Search places"><kbd class="slash">/</kbd></label>
        <div class="seg filters" role="tablist"><button data-f="all" class="on">All</button><button data-f="landmarks">Landmarks</button><button data-f="new">Not visited</button></div>
        <div class="list" role="listbox"></div>
      </aside>
      <div class="mcard material hidden"></div>
      <div class="mctl"><div class="btn-group material vertical"><button data-z="in" aria-label="Zoom in" title="Zoom in">${icon('plus')}</button><button data-z="out" aria-label="Zoom out" title="Zoom out">${icon('minus')}</button></div>
        <button class="iconbtn material" data-z="me" aria-label="Show my location" title="Show my location">${icon('locate')}</button></div>
      <button class="close iconbtn material" aria-label="Close map" title="Close (M)">${icon('x')}</button>
      <div class="mfoot"><span class="mscale"><i></i><span></span></span><span class="mattr">© OpenStreetMap contributors</span></div>`);
    document.body.appendChild(el); this.bigmap = el;
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    const listEl = el.querySelector('.list'), input = el.querySelector('.search input'), card = el.querySelector('.mcard');
    el.querySelector('.ms-sub').textContent = this.total ? `${this.found} of ${this.total} places visited` : 'UC Berkeley and surroundings';
    const names = new Set(places.map((p) => p.name.toLowerCase()));
    const extra = search.filter((b) => b && b.name && !names.has(b.name.toLowerCase()) && (names.add(b.name.toLowerCase()), true)).map((b, i) => ({ id: b.id || `bld-${i}`, name: b.name, sub: b.sub || 'Building', p: b.p, building: true }));
    const all = places.concat(extra); for (const p of all) p._d = Math.hypot(p.p[0] - px, p.p[1] - pz);
    let W, H; const resize = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
    resize();
    const side = () => (W > 760 ? 372 : 0); // map area starts right of the sidebar
    let scale = Math.max(0.35, Math.min(W - side(), H) / 900), cx = px, cz = pz; // css px per metre, view centre
    cx -= side() / 2 / scale;
    const toScreen = (x, z) => [(x - cx) * scale + W / 2, (z - cz) * scale + H / 2];
    const toWorld = (sx, sy) => [(sx - W / 2) / scale + cx, (sy - H / 2) / scale + cz];
    let sel = null, hover = null, filter = 'all', query = '', results = [], active = -1, raf = 0;
    const widths = new Map(); const tw = (s, f) => { const k = f + s; let w = widths.get(k); if (w == null) { ctx.font = f; w = ctx.measureText(s).width; widths.set(k, w); } return w; };
    const draw = () => {
      raf = 0; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#ecebe5'; ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = scale < 3; ctx.imageSmoothingQuality = 'medium';
      drawRegion(ctx, m.canvas, (cx - W / 2 / scale - m.x0) * m.ppm, (cz - H / 2 / scale - m.z0) * m.ppm, W / scale * m.ppm, H / scale * m.ppm, 0, 0, W, H);
      // markers, then labels with collision avoidance (selected > hovered > landmarks > others)
      const vis = [];
      for (const p of places) { const [sx, sy] = toScreen(p.p[0], p.p[1]); if (sx < -40 || sy < -40 || sx > W + 40 || sy > H + 40) continue; vis.push({ p, sx, sy }); }
      vis.sort((a, b) => (a.p.landmark ? 1 : 0) - (b.p.landmark ? 1 : 0));
      for (const v of vis) {
        const L = v.p.landmark, r = L ? 9 : 5.5;
        ctx.beginPath(); ctx.arc(v.sx, v.sy, r, 0, Math.PI * 2);
        ctx.fillStyle = L ? '#003262' : v.p.found ? '#fdb515' : '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 3; ctx.fill(); ctx.shadowBlur = 0;
        ctx.lineWidth = L ? 2 : 1.5; ctx.strokeStyle = L ? '#ffffff' : v.p.found ? '#b07a06' : '#7a7f87'; ctx.stroke();
        if (L) { ctx.save(); ctx.translate(v.sx - 5.5, v.sy - 5.5); ctx.scale(11 / 24, 11 / 24); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path2d('landmark')); ctx.restore(); if (v.p.found) { ctx.beginPath(); ctx.arc(v.sx + 7, v.sy - 7, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#fdb515'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); } }
      }
      const boxes = vis.map((v) => { const r = v.p.landmark ? 10 : 6.5; return [v.sx - r, v.sy - r, 2 * r, 2 * r]; }), hit = (b) => boxes.some((o) => b[0] < o[0] + o[2] && b[0] + b[2] > o[0] && b[1] < o[1] + o[3] && b[1] + b[3] > o[1]);
      const pri = (v) => (v.p === sel ? 0 : v.p === hover ? 1 : v.p.landmark ? 2 : 3);
      const order = vis.slice().sort((a, b) => pri(a) - pri(b) || a.p._d - b.p._d);
      ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; const named = [];
      for (const v of order) {
        if (named.some((o) => o.p.name === v.p.name && Math.hypot(o.sx - v.sx, o.sy - v.sy) < 140)) continue;
        const L = v.p.landmark, strong = v.p === sel || v.p === hover; if (!L && !strong && scale < 0.75) continue;
        const f = `${L || strong ? 600 : 500} ${L ? 12.5 : 12}px Inter, system-ui, sans-serif`, w = tw(v.p.name, f), r = L ? 9 : 5.5;
        const ok = (bb) => !hit(bb) && bb[0] > side() + 6 && bb[0] + bb[2] < W - 6 && bb[1] > 4 && bb[1] + bb[3] < H - 4 && !(bb[0] + bb[2] > W - 70 && (bb[1] < 70 || bb[1] + bb[3] > H - 190)); // keep clear of close / zoom controls
        let b = [v.sx + r + 4, v.sy - 8, w + 4, 16]; if (!ok(b)) { b = [v.sx - r - 8 - w, v.sy - 8, w + 4, 16]; if (!ok(b) && !strong) continue; }
        boxes.push(b); named.push(v); ctx.font = f; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.strokeText(v.p.name, b[0] + 2, v.sy); ctx.fillStyle = L ? '#0b2545' : '#33363b'; ctx.fillText(v.p.name, b[0] + 2, v.sy);
      }
      // selection pin
      if (sel) { const [sx, sy] = toScreen(sel.p[0], sel.p[1]); ctx.save(); ctx.translate(sx, sy - 6); ctx.fillStyle = '#e5484d'; ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-4, -8, -11, -12, -11, -21); ctx.arc(0, -21, 11, Math.PI, 0); ctx.bezierCurveTo(11, -12, 4, -8, 0, 0); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -21, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      // you are here: blue dot with heading cone
      { const [qx, qy] = toScreen(px, pz); ctx.save(); ctx.translate(qx, qy); ctx.rotate(heading); const g = ctx.createRadialGradient(0, 0, 3, 0, 0, 42); g.addColorStop(0, 'rgba(37,113,226,.38)'); g.addColorStop(1, 'rgba(37,113,226,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 42, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); ctx.closePath(); ctx.fill(); ctx.rotate(-heading);
        ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 5; ctx.fill(); ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fillStyle = '#2571e2'; ctx.fill(); ctx.restore(); }
      // scale bar
      const target = 110 / scale, unitM = ui.units === 'metric' ? 1 : 0.3048, steps = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
      let best = steps[0]; for (const s of steps) if (s * unitM <= target) best = s;
      const lenPx = best * unitM * scale; el.querySelector('.mscale i').style.width = `${Math.round(lenPx)}px`;
      el.querySelector('.mscale span').textContent = ui.units === 'metric' ? (best >= 1000 ? `${best / 1000} km` : `${best} m`) : (best >= 5280 ? `${(best / 5280).toFixed(1)} mi` : best >= 2000 ? `${(best / 5280).toFixed(2)} mi` : `${best} ft`);
    };
    const redraw = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const iconFor = (p) => (p.building ? 'building' : p.landmark ? 'landmark' : 'pin');
    const renderList = () => {
      const qq = query.trim().toLowerCase();
      let src = qq ? all : places;
      if (filter === 'landmarks') src = src.filter((p) => p.landmark); else if (filter === 'new') src = src.filter((p) => !p.found && !p.building);
      if (qq) {
        const score = (p) => { const n = p.name.toLowerCase(); return n.startsWith(qq) ? 0 : n.split(/[\s()/-]+/).some((w) => w.startsWith(qq)) ? 1 : n.includes(qq) ? 2 : (p.sub || '').toLowerCase().includes(qq) ? 3 : 9; };
        results = src.map((p) => [score(p), p]).filter((x) => x[0] < 9).sort((a, b) => a[0] - b[0] || (b[1].landmark ? 1 : 0) - (a[1].landmark ? 1 : 0) || a[1]._d - b[1]._d).map((x) => x[1]).slice(0, 80);
      } else results = src.slice().sort((a, b) => a._d - b._d);
      active = qq && results.length ? 0 : -1;
      listEl.innerHTML = results.length ? results.map((p, i) => `<div class="li${p.found ? ' found' : ''}${i === active ? ' active' : ''}" data-id="${esc(p.id)}" role="option"><span class="li-ic ${p.landmark ? 'lm' : p.building ? 'bd' : ''}">${icon(iconFor(p))}</span><span class="li-t"><b>${esc(p.name)}${p.found ? icon('check', 'ok') : ''}</b><small>${esc(p.sub || (p.landmark ? 'Landmark' : 'Place'))}</small></span><span class="li-d">${ui.fmtDist(p._d)}</span></div>`).join('') : `<div class="empty">No places match “${esc(query)}”</div>`;
    };
    const setActive = (i) => { const rows = listEl.querySelectorAll('.li'); if (!rows.length) return; active = (i + rows.length) % rows.length; rows.forEach((r, k) => r.classList.toggle('active', k === active)); rows[active].scrollIntoView({ block: 'nearest' }); };
    const find = (id) => all.find((x) => x.id === id);
    const travel = (p, x, z) => { ui.closeMap(); onTravel(x ?? p.p[0], z ?? p.p[1], p && !p.dropped ? p : null); };
    const showCard = (p) => {
      sel = p; if (!p) { card.classList.add('hidden'); redraw(); return; }
      card.innerHTML = `<div class="mc-ic ${p.landmark ? 'lm' : ''}">${icon(p.dropped ? 'pin' : iconFor(p))}</div><div class="mc-t"><b>${esc(p.name)}</b><small>${esc(p.sub || (p.landmark ? 'Landmark' : p.dropped ? '' : 'Place'))}${p.sub || !p.dropped ? ' · ' : ''}${ui.fmtDist(Math.hypot(p.p[0] - px, p.p[1] - pz))} away${p.found ? ' · Visited' : ''}</small>${p.blurb ? `<p>${esc(p.blurb)}</p>` : ''}</div><div class="mc-a"><button class="btn primary" data-go>${icon('navigate')}Travel here</button><button class="iconbtn" data-unsel aria-label="Close">${icon('x')}</button></div>`;
      card.classList.remove('hidden'); redraw();
    };
    const focusOn = (p) => { const [sx, sy] = toScreen(p.p[0], p.p[1]); const ox = side() / 2; if (sx < side() + 40 || sx > W - 40 || sy < 60 || sy > H - 160) { cx = p.p[0] - ox / scale; cz = p.p[1] + 40 / scale; } scale = Math.max(scale, 1.1); cx = p.p[0] - ox / scale; cz = p.p[1] + 40 / scale; showCard(p); };
    card.addEventListener('click', (e) => { if (e.target.closest('[data-go]') && sel) travel(sel.dropped ? null : sel, sel.p[0], sel.p[1]); if (e.target.closest('[data-unsel]')) showCard(null); });
    listEl.addEventListener('click', (e) => { const d = e.target.closest('[data-id]'); if (!d) return; const p = find(d.dataset.id); if (p) travel(p); });
    listEl.addEventListener('pointerover', (e) => { const d = e.target.closest('[data-id]'); const p = d ? find(d.dataset.id) : null; if (p !== hover) { hover = p; redraw(); } });
    listEl.addEventListener('pointerleave', () => { hover = null; redraw(); });
    input.addEventListener('input', () => { query = input.value; renderList(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') { const p = results[Math.max(0, active)]; if (p) { e.preventDefault(); if (e.shiftKey) focusOn(p); else travel(p); } }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (input.value) { input.value = ''; query = ''; renderList(); } else input.blur(); }
    });
    el.querySelector('.filters').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; el.querySelectorAll('.filters button').forEach((x) => x.classList.toggle('on', x === b)); renderList(); });
    const zoomAt = (k, sx = (W + side()) / 2, sy = H / 2) => { const [wx, wz] = toWorld(sx, sy); scale = Math.max(0.12, Math.min(10, scale * k)); const [nx, nz] = toWorld(sx, sy); cx += wx - nx; cz += wz - nz; redraw(); };
    el.querySelector('.mctl').addEventListener('click', (e) => { const z = e.target.closest('[data-z]')?.dataset.z; if (z === 'in') zoomAt(1.6); else if (z === 'out') zoomAt(1 / 1.6); else if (z === 'me') { scale = Math.max(scale, 1.2); cx = px - side() / 2 / scale; cz = pz; redraw(); } });
    // pan / pinch / click-to-select
    const pts = new Map(); let moved = 0, pinch = null, downT = 0;
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; downT = performance.now(); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: scale }; } cv.classList.add('grab'); });
    cv.addEventListener('pointermove', (e) => {
      const prev = pts.get(e.pointerId); if (!prev) return; const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const r = cv.getBoundingClientRect(); zoomAt((pinch.s * d / pinch.d) / scale, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); moved += 10; return; }
      moved += Math.abs(dx) + Math.abs(dy); if (moved > 4) { cx -= dx / scale; cz -= dy / scale; redraw(); }
    });
    const up = (e) => {
      const had = pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) cv.classList.remove('grab');
      if (!had || moved > 6 || e.type === 'pointercancel' || performance.now() - downT > 600) return;
      const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
      let best = null, bd = 16; for (const p of places) { const [qx, qy] = toScreen(p.p[0], p.p[1]); const d = Math.hypot(qx - sx, qy - sy); if (d < bd) { bd = d; best = p; } }
      if (!best) { const [wx, wz] = toWorld(sx, sy); best = { id: 'pin', name: 'Dropped pin', sub: '', p: [wx, wz], dropped: true }; }
      showCard(best);
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('dblclick', (e) => { const r = cv.getBoundingClientRect(); zoomAt(2, e.clientX - r.left, e.clientY - r.top); });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.0045), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    el.querySelector('.close').addEventListener('click', () => this.closeMap());
    this._mapKey = (e) => { if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); } };
    addEventListener('keydown', this._mapKey);
    this._mapResize = () => { resize(); redraw(); }; addEventListener('resize', this._mapResize);
    this._mapSel = () => sel; this._mapUnsel = () => showCard(null);
    renderList(); draw();
    if (document.pointerLockElement) document.exitPointerLock();
    requestAnimationFrame(() => el.classList.add('in'));
  }
  closeMap() { if (!this.bigmap) return; this.bigmap.remove(); this.bigmap = null; removeEventListener('resize', this._mapResize); removeEventListener('keydown', this._mapKey); this.cb.mapClosed?.(); }
  // ---------- sheets & popovers
  panel(html, onBind, opts = {}) {
    this.closePanel(true); // replacing a sheet is not "closing" it: don't let the game re-capture the mouse
    const p = $('div', `panel${opts.popover ? ' popover' : ''}${opts.cls ? ' ' + opts.cls : ''}`); p.innerHTML = `<div class="sheet material" role="dialog">${html}</div>`;
    document.body.appendChild(p); this.panelEl = p; this.hint(null);
    document.documentElement.classList.toggle('has-modal', !opts.popover);
    let downOut = false;
    p.addEventListener('pointerdown', (e) => { downOut = e.target === p; });
    p.addEventListener('click', (e) => { if (e.target === p && downOut) this.closePanel(); });
    p.querySelectorAll('[data-x=close]').forEach((b) => b.addEventListener('click', () => this.closePanel()));
    if (document.pointerLockElement) document.exitPointerLock();
    onBind && onBind(p);
    requestAnimationFrame(() => p.classList.add('in'));
    return p;
  }
  closePanel(replacing = false) { if (this.panelEl) { const p = this.panelEl; this.panelEl = null; this._timeRefresh = null; p.remove(); document.documentElement.classList.remove('has-modal'); if (!replacing) this.cb.panelClosed?.(); } }
  _onKey(e) {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (this.panelEl) { e.preventDefault(); this.closePanel(); } else if (this.bigmap) { e.preventDefault(); if (this._mapSel && this._mapSel()) this._mapUnsel(); else this.closeMap(); }
  }
  _head(title, sub) { return `<header class="sheet-h"><div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div><button class="iconbtn" data-x="close" aria-label="Close" title="Close (Esc)">${icon('x')}</button></header>`; }
  help() {
    const row = (keys, label, sub) => `<div class="sc-row"><span class="sc-l">${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="sc-k">${keys || '<span class="sc-none">Default</span>'}</span></div>`;
    const modes = this._modeList(), tools = this._tools();
    this.panel(`${this._head('Controls')}
      <div class="sc-grid">
        <section><h3>Move</h3>
          ${row(kbd('W', 'A', 'S', 'D'), 'Move', 'Arrow keys work too')}
          ${row(kbd('Shift'), 'Run')}${row(kbd('Space'), 'Jump')}
          ${row(kbd('Mouse'), 'Look around', 'Click the view to capture the mouse, or drag')}
          ${row(kbd('V'), 'First or third person')}
          ${row(kbd('Scroll'), 'Camera distance')}
        </section>
        <section><h3>Get around</h3>
          ${modes.map((m) => row(m.key ? kbd(keyName(m.key)) : '', `<span class="sc-mi">${icon(m.icon)}</span>${esc(m.label)}`, esc(m.id === 'walk' ? 'Press a mode key again to walk' : m.hint || ''))).join('')}
          ${tools.map((t) => row(t.key ? kbd(keyName(t.key)) : '<span class="sc-none">Always on</span>', `<span class="sc-mi">${icon(t.icon)}</span>${esc(t.label)}`, esc(t.hint || ''))).join('')}
        </section>
        <section><h3>Explore</h3>
          ${row(kbd('M'), 'Map, search and travel')}${row(kbd('T'), 'Time and weather')}${row(kbd('[', ']'), 'Earlier or later', '15 minutes at a time')}
          ${row(kbd('E'), 'Interact', 'For example, ride the Campanile elevator')}${row(kbd('P'), 'Hide the interface')}
          ${row(kbd('Shift', 'R'), 'Back to Sproul Plaza')}${row(kbd('Esc'), 'Release the mouse')}
        </section>
      </div>
      <p class="sheet-note">${icon('info')}<span>The Campanile clock and bells follow real Pacific time. With Live on, the sun, sky and weather match Berkeley right now.</span></p>
      <footer class="sheet-f"><button class="btn primary" data-x="close">Done</button></footer>`, null, { cls: 'wide' });
  }
  settings(s, onChange) {
    const seg = (k, val, opts) => `<div class="seg" data-k="${k}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const fmts = { sens: (v) => `${(+v).toFixed(2)}×`, fov: (v) => `${Math.round(v)}°`, volume: (v) => `${Math.round(v * 100)}%` };
    const range = (k, min, max, step, val) => `<div class="range"><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${k}"><output>${fmts[k](val)}</output></div>`;
    const sw = (k, on) => `<label class="switch"><input type="checkbox" data-k="${k}" ${on ? 'checked' : ''}><i></i></label>`;
    this.panel(`${this._head('Settings')}
      <section><h3>Graphics</h3>
        <div class="row"><span>Quality</span>${seg('quality', s.quality, [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra']])}</div>
        <p class="row-note">Changing quality reloads the page.</p></section>
      <section><h3>Controls</h3>
        <div class="row"><span>Look sensitivity</span>${range('sens', 0.3, 2.5, 0.05, s.sens)}</div>
        <div class="row"><span>Invert vertical look</span>${sw('invertY', s.invertY)}</div>
        <div class="row"><span>Field of view</span>${range('fov', 50, 90, 1, s.fov)}</div></section>
      <section><h3>Sound</h3><div class="row"><span>Volume</span>${range('volume', 0, 1, 0.05, s.volume)}</div></section>
      <section><h3>Display</h3>
        <div class="row"><span>Minimap</span>${seg('north', !!s.north, [[false, 'Heading up'], [true, 'North up']])}</div>
        <div class="row"><span>Appearance</span>${seg('theme', s.theme || 'auto', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}</div>
        <div class="row"><span>Units</span>${seg('units', s.units || this.units, [['imperial', 'Imperial'], ['metric', 'Metric']])}</div></section>
      <footer class="sheet-f"><button class="btn tertiary" data-x="help">${icon('keyboard')}Controls</button><button class="btn primary" data-x="close">Done</button></footer>`, (p) => {
      const parse = (v) => (v === 'true' ? true : v === 'false' ? false : v);
      const set = (k, v) => { if (k === 'theme') this.setTheme(v); if (k === 'units') this.units = v; onChange(k, v); };
      p.querySelectorAll('.seg[data-k]').forEach((g) => g.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b || b.classList.contains('on')) return; g.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); set(g.dataset.k, parse(b.dataset.v)); }));
      p.querySelectorAll('input[type=range][data-k]').forEach((el) => { const out = el.nextElementSibling; fillRange(el); el.addEventListener('input', () => { out.textContent = fmts[el.dataset.k](el.value); fillRange(el); set(el.dataset.k, parseFloat(el.value)); }); });
      p.querySelectorAll('input[type=checkbox][data-k]').forEach((el) => el.addEventListener('change', () => set(el.dataset.k, el.checked)));
      p.querySelector('[data-x=help]').onclick = () => this.help();
    });
  }
  // Time & weather popover (anchored under the HUD time chip). st = main's timeSt; onChange(k, v) mutates it:
  // 'hour' (custom time), 'live' (bool), 'preset' (id), 'date' ('YYYY-MM-DD' | null for today), 'weather' (id).
  timePanel(st, onChange) {
    this.panel(`${this._head('Time & weather', 'Berkeley, California')}
      <div class="tp-now"><div><div class="tp-time"></div><div class="tp-date"></div></div><label class="live" title="Follow real Berkeley time"><span class="live-dot"></span>Live<span class="switch"><input type="checkbox" data-k="live"><i></i></span></label></div>
      <div class="tp-slider"><div class="tp-track"></div><div class="tp-marks"></div><input type="range" min="0" max="23.9167" step="0.0833333" data-k="hour" aria-label="Time of day"></div>
      <div class="tp-scale"><span style="left:0">12 AM</span><span style="left:25%">6 AM</span><span style="left:50%">Noon</span><span style="left:75%">6 PM</span><span style="left:100%">12 AM</span></div>
      <div class="presets">${PRESETS.map((p) => `<button data-x="${p.id}" title="${p.label}">${icon(p.icon)}<span>${p.label}</span></button>`).join('')}</div>
      <div class="row tp-daterow"><span class="lbl">${icon('calendar')}Date</span><span class="tp-dctl"><button class="btn tertiary sm" data-x="today">Today</button><button class="iconbtn" data-x="prev" aria-label="Previous day" title="Previous day">${icon('chevronLeft')}</button><label class="tp-dpick" title="Pick a date"><span></span><input type="date" data-k="date" aria-label="Date"></label><button class="iconbtn" data-x="next" aria-label="Next day" title="Next day">${icon('chevronRight')}</button></span></div>
      <div class="tp-sun"><span>${icon('sunrise')}Sunrise <b class="rise"></b></span><span>${icon('sunset')}Sunset <b class="set"></b></span></div>
      <h3 class="h3-row">Weather<span class="wx-now"></span></h3>
      <div class="wx-seg">${WEATHER.map(([v, l, ic, t]) => `<button data-w="${v}" title="${t}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>
      <p class="tp-note hidden">${icon('info')}<span></span></p>`, (p) => {
      const $q = (s) => p.querySelector(s), hr = $q('[data-k=hour]'), lv = $q('[data-k=live]'), dt = $q('[data-k=date]');
      const refresh = () => {
        const day = st.live ? pacificDay() : (st.date || pacificDay()), ev = sunEvents(day), h = st.live ? pacificHour(new Date()) : st.hour;
        $q('.tp-time').innerHTML = fmtHour(h).replace(/ (AM|PM)$/, ' <small>$1</small>');
        $q('.tp-date').textContent = st.live ? 'Live · Berkeley time' : (st.date ? fmtDay(day) : 'Today');
        $q('.tp-dpick span').textContent = fmtDay(day); $q('[data-x=today]').classList.toggle('hidden', !st.date || st.live);
        if (document.activeElement !== hr) hr.value = h; fillRange(hr); lv.checked = !!st.live; p.querySelector('.live').classList.toggle('on', !!st.live);
        if (this._tday !== day) { this._tday = day; $q('.tp-track').style.background = dayGradient(day); $q('.tp-marks').innerHTML = [ev.rise, ev.set].map((x) => `<i style="left:${(x / 24) * 100}%"></i>`).join(''); }
        $q('.tp-sun .rise').textContent = fmtHour(ev.rise); $q('.tp-sun .set').textContent = fmtHour(ev.set);
        dt.value = st.date || pacificDay();
        p.querySelectorAll('.presets [data-x]').forEach((b) => b.classList.toggle('on', !st.live && Math.abs(presetHour(b.dataset.x, st.date) - st.hour) < 0.02));
        p.querySelectorAll('.wx-seg [data-w]').forEach((b) => b.classList.toggle('on', b.dataset.w === (st.weather || 'live')));
        const note = $q('.tp-note'); const msg = st.autoDay ? `Daylight view · Berkeley time is now ${fmtHour(pacificHour(new Date()))}` : '';
        const w = st.wx; $q('.wx-now').textContent = w && Number.isFinite(w.temperature_2m) ? `Berkeley now: ${this.units === 'metric' ? Math.round(w.temperature_2m) + '°C' : Math.round(w.temperature_2m * 9 / 5 + 32) + '°F'}` : '';
        note.classList.toggle('hidden', !msg); note.querySelector('span').textContent = msg; $q('.tp-sun').classList.toggle('hidden', !!msg);
      };
      this._tday = null; this._timeRefresh = refresh;
      hr.addEventListener('input', () => { onChange('hour', +hr.value); refresh(); });
      lv.addEventListener('change', () => { onChange('live', lv.checked); refresh(); });
      dt.addEventListener('change', () => { onChange('date', dt.value && dt.value !== pacificDay() ? dt.value : null); refresh(); });
      p.querySelector('.presets').addEventListener('click', (e) => { const b = e.target.closest('[data-x]'); if (!b) return; onChange('preset', b.dataset.x); refresh(); });  // data-x = morning|noon|golden|sunset|night
      $q('[data-x=today]').addEventListener('click', () => { onChange('date', null); refresh(); });
      const shift = (n) => { const d = new Date((st.date || pacificDay()) + 'T12:00:00-08:00'); d.setUTCDate(d.getUTCDate() + n); const v = pacificDay(d); onChange('date', v === pacificDay() ? null : v); refresh(); };
      $q('[data-x=prev]').addEventListener('click', () => shift(-1)); $q('[data-x=next]').addEventListener('click', () => shift(1));
      $q('.tp-dpick').addEventListener('click', (e) => { if (e.target === dt) return; e.preventDefault(); try { dt.showPicker(); } catch (er) { dt.focus(); } });
      p.querySelector('.wx-seg').addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (!b) return; onChange('weather', b.dataset.w); refresh(); });
      refresh();
    }, { popover: true, cls: 'time-pop' });
  }
  customize(look, onChange) {
    const sw = (k, arr) => `<div class="swatches" data-k="${k}">${arr.map((c, i) => `<button class="sw${look[k] === i ? ' on' : ''}" data-i="${i}" style="--c:${c}" aria-label="${k} ${i + 1}"></button>`).join('')}</div>`;
    this.panel(`${this._head('Avatar', 'How you appear in third person')}
      <section>
        <div class="row"><span>Skin tone</span>${sw('skin', LOOKS.skin)}</div>
        <div class="row"><span>Hair color</span>${sw('hair', LOOKS.hair)}</div>
        <div class="row"><span>Hair style</span><div class="seg" data-k="hairStyle">${LOOKS.hairStyle.map((h, i) => `<button data-v="${i}" class="${look.hairStyle === i ? 'on' : ''}">${cap(h)}</button>`).join('')}</div></div>
        <div class="row"><span>Top</span>${sw('top', LOOKS.top)}</div>
        <div class="row"><span>Pants</span>${sw('pants', LOOKS.pants)}</div>
        <div class="row"><span>Backpack</span><label class="switch"><input type="checkbox" data-k="backpack" ${look.backpack ? 'checked' : ''}><i></i></label></div>
      </section>
      <footer class="sheet-f"><button class="btn primary" data-x="close">Done</button></footer>`, (p) => {
      p.classList.add('side'); document.documentElement.classList.remove('has-modal');
      p.querySelectorAll('.swatches').forEach((g) => g.addEventListener('click', (e) => { const b = e.target.closest('.sw'); if (!b) return; g.querySelectorAll('.sw').forEach((x) => x.classList.toggle('on', x === b)); onChange(g.dataset.k, +b.dataset.i); }));
      p.querySelector('.seg[data-k=hairStyle]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; p.querySelectorAll('.seg[data-k=hairStyle] button').forEach((x) => x.classList.toggle('on', x === b)); onChange('hairStyle', +b.dataset.v); });
      p.querySelector('[data-k=backpack]').addEventListener('change', (e) => onChange('backpack', e.target.checked));
    });
  }
  // ---------- touch controls: joystick (left), jump / run / map (right); modes via the HUD mode bar; tap the prompt to interact
  touchControls(player, actions) {
    const t = $('div', 'touch', `<div class="joy"><b></b></div><div class="tbtns"><button data-a="jump" class="tb" aria-label="Jump">${icon('arrowUp')}</button><button data-a="run" class="tb" aria-label="Run">${icon('chevronsUp')}</button><button data-a="map" class="tb" aria-label="Map">${icon('map')}</button></div>`);
    document.body.appendChild(t); this.touchEl = t;
    const joy = t.querySelector('.joy'), knob = joy.querySelector('b'); let jid = null; const R = 48;
    const move = (e) => { if (e.pointerId !== jid) return; const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; player.touch.mx = dx / R; player.touch.my = dy / R; };
    joy.addEventListener('pointerdown', (e) => { jid = e.pointerId; joy.setPointerCapture(jid); joy.classList.add('on'); move(e); });
    joy.addEventListener('pointermove', move);
    const end = (e) => { if (e.pointerId !== jid) return; jid = null; joy.classList.remove('on'); knob.style.transform = ''; player.touch.mx = 0; player.touch.my = 0; };
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
    t.querySelector('.tbtns').addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; e.preventDefault(); actions[b.dataset.a]?.(b); if (b.dataset.a === 'run') { b.style.background = ''; b.classList.toggle('on', !!player.touch.run); } });
    this.promptEl.classList.add('tap'); this.promptEl.querySelector('kbd').innerHTML = icon('hand');
    this.promptEl.addEventListener('pointerdown', (e) => { e.preventDefault(); actions.use?.(); });
    let lid = null, lx = 0, ly = 0; const cv = document.querySelector('canvas#c');
    cv.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; lid = e.pointerId; lx = e.clientX; ly = e.clientY; });
    cv.addEventListener('pointermove', (e) => { if (e.pointerId !== lid) return; player.lookDelta((e.clientX - lx) * 0.9, (e.clientY - ly) * 0.9); lx = e.clientX; ly = e.clientY; });
    cv.addEventListener('pointerup', (e) => { if (e.pointerId === lid) lid = null; });
  }
}
// Static map image (1 px per metre) from ground masks + buildings + trees + water. Light, neutral palette.
export function buildMapCanvas({ sdf, nx, nz, step = 1, x0, z0, buildings, trees, water, landmarkFootprints, replaced }) {
  const cv = document.createElement('canvas'); cv.width = Math.round(nx * step); cv.height = Math.round(nz * step); const ctx = cv.getContext('2d');
  const base = document.createElement('canvas'); base.width = nx; base.height = nz; const bctx = base.getContext('2d');
  const img = bctx.createImageData(nx, nz); const d = img.data;
  const C = { base: [236, 235, 229], grass: [207, 227, 192], dirt: [231, 224, 206], paved: [250, 249, 246], asph: [255, 255, 255] };
  for (let i = 0, n = nx * nz; i < n; i++) {
    const a = sdf[i * 4], p = sdf[i * 4 + 1], g = sdf[i * 4 + 2], r = sdf[i * 4 + 3];
    let c = C.base; if (r > 128) c = C.dirt; if (g > 128) c = C.grass; if (p > 128) c = C.paved; if (a > 128) c = C.asph;
    d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
  }
  bctx.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(base, 0, 0, cv.width, cv.height);
  // tree canopies
  ctx.fillStyle = 'rgba(122,168,104,0.30)';
  for (let i = 0; i < trees.n; i++) { const x = trees.x[i] / 10 - x0, z = trees.z[i] / 10 - z0, r = trees.r[i] / 10; ctx.beginPath(); ctx.arc(x, z, Math.max(1.2, r * 0.85), 0, 7); ctx.fill(); }
  // water
  ctx.strokeStyle = '#a9d2ee'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const w of water) { ctx.lineWidth = Math.max(2, w.w); ctx.beginPath(); w.pts.forEach(([x, z], k) => (k ? ctx.lineTo(x - x0, z - z0) : ctx.moveTo(x - x0, z - z0))); ctx.stroke(); }
  // buildings (landmarks get a faint gold tint)
  ctx.lineWidth = 1;
  for (const b of buildings.b) {
    const f = b[7][0][5]; const land = replaced && replaced.has(b[0]);
    ctx.fillStyle = land ? '#eadcb8' : '#dcd8cf'; ctx.strokeStyle = land ? '#c2a462' : '#c3bdb1';
    ctx.beginPath(); for (let k = 0; k < f.length; k += 2) { const x = f[k] / 10 - x0, z = f[k + 1] / 10 - z0; k ? ctx.lineTo(x, z) : ctx.moveTo(x, z); } ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  for (const fp of landmarkFootprints || []) { ctx.fillStyle = '#eadcb8'; ctx.strokeStyle = '#c2a462'; ctx.beginPath(); fp.forEach(([x, z], k) => (k ? ctx.lineTo(x - x0, z - z0) : ctx.moveTo(x - x0, z - z0))); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  return { canvas: cv, x0, z0, ppm: 1 };
}
