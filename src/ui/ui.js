// All DOM UI: title/loading, HUD (compass, location, minimap, clock), prompts, discovery toasts, big map, panels, touch.
import { LOOKS } from '../player/avatar.js';
const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export class UI {
  constructor(root) {
    this.root = root; this.state = 'title'; this.cb = {};
    this.boot = $('div', 'boot'); document.body.appendChild(this.boot);
    this.fadeEl = $('div', 'fade'); document.body.appendChild(this.fadeEl);
    // title
    this.title = $('div', 'title', `<div class="title-shade"></div><div class="title-mid">
      <h1>Berkeley <b>Simulator</b></h1><div class="sub">UC Berkeley · 1:1 · in your browser</div>
      <div class="bar"><b></b></div><div class="title-note">Loading the campus…</div>
      <nav class="menu hidden"><button class="btn solid" data-a="play">Play</button><button class="btn" data-a="look">Customize student</button><button class="btn" data-a="settings">Settings</button></nav></div>
      <div class="title-foot"><span class="tf-place"></span><span>© OpenStreetMap contributors · USGS LiDAR & NAIP</span></div>`);
    document.body.appendChild(this.title);
    this.titleBar = this.title.querySelector('.bar b'); this.titleNote = this.title.querySelector('.title-note'); this.menu = this.title.querySelector('.menu');
    this.title.addEventListener('click', (e) => { const a = e.target?.dataset?.a; if (a) this.cb[a]?.(); });
    // hud
    this.hud = $('div', 'hud off');
    this.hud.innerHTML = `<div class="compass glass"><div class="strip"></div><div class="needle"></div></div>
      <div class="loc"><div class="n"></div><div class="s"></div></div><div class="count"></div>
      <div class="chip glass" title="Time & weather (T)"><span class="clock"></span><span class="wx"></span></div>
      <div class="mm" title="Map (M)"><canvas width="380" height="380"></canvas></div>
      <div class="prompt glass off"><kbd>E</kbd><span></span></div>
      <div class="toast glass off"><div class="k">Discovered</div><div class="n"></div><div class="s"></div><div class="b"></div></div>
      <div class="keys glass"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Space</kbd> jump<br><kbd>B</kbd> bike &nbsp; <kbd>F</kbd> fly &nbsp; <kbd>V</kbd> view &nbsp; <kbd>M</kbd> map &nbsp; <kbd>T</kbd> time &nbsp; <kbd>H</kbd> help</div>
      <div class="reticle hidden"></div>`;
    document.body.appendChild(this.hud);
    const q = (s) => this.hud.querySelector(s);
    this.locN = q('.loc .n'); this.locS = q('.loc .s'); this.countEl = q('.count'); this.clockEl = q('.clock'); this.wxEl = q('.wx');
    this.promptEl = q('.prompt'); this.promptTxt = q('.prompt span'); this.toastEl = q('.toast'); this.keysEl = q('.keys'); this.reticle = q('.reticle');
    this.mmCanvas = q('.mm canvas'); this.mmCtx = this.mmCanvas.getContext('2d');
    q('.mm').addEventListener('click', () => this.cb.map?.());
    q('.chip').addEventListener('click', () => this.cb.time?.());
    this.strip = q('.compass .strip'); this.buildCompass();
    setTimeout(() => this.keysEl.classList.add('off'), 26000);
  }
  on(name, fn) { this.cb[name] = fn; }
  progress(f) { this.titleBar.style.transform = `scaleX(${Math.max(0, Math.min(1, f))})`; }
  note(t) { this.titleNote.textContent = t; }
  ready() { this.titleBar.parentElement.classList.add('hidden'); this.titleNote.textContent = ''; this.menu.classList.remove('hidden'); this.boot.classList.add('done'); setTimeout(() => this.boot.remove(), 1500); }
  titlePlace(t) { const e = this.title.querySelector('.tf-place'); if (e) e.textContent = t; }
  showTitle(on) { this.title.classList.toggle('off', !on); this.hud.classList.toggle('off', on); this.state = on ? 'title' : 'play'; }
  fade(cb, hold = 350) { this.fadeEl.classList.add('on'); setTimeout(() => { cb && cb(); setTimeout(() => this.fadeEl.classList.remove('on'), hold); }, 460); }
  buildCompass() {
    const marks = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]];
    this.ppd = 4; // px per degree
    let html = '';
    for (let rep = -1; rep <= 1; rep++) {
      for (let d = 0; d < 360; d += 15) {
        const m = marks.find((x) => x[1] === d);
        const x = (d + rep * 360) * this.ppd;
        html += `<span class="tick ${m && m[0].length === 1 ? 'major' : ''}" style="left:${x}px">${m ? m[0] : '·'}</span>`;
      }
    }
    this.strip.innerHTML = html;
  }
  compass(headingDeg) { const w = this.strip.parentElement.clientWidth; this.strip.style.transform = `translateX(${w / 2 - headingDeg * this.ppd}px)`; }
  location(n, s) { if (this._ln !== n) { this.locN.textContent = n || ''; this._ln = n; } if (this._ls !== s) { this.locS.textContent = s || ''; this._ls = s; } }
  count(found, total) { this.countEl.textContent = `${found} / ${total} places discovered`; }
  clock(t, wx) { this.clockEl.innerHTML = t; this.wxEl.textContent = wx || ''; }
  prompt(label) { if (label) { this.promptTxt.textContent = label; this.promptEl.classList.remove('off'); } else this.promptEl.classList.add('off'); }
  toast({ kind = 'Discovered', name, sub, blurb }, ms = 6500) {
    const t = this.toastEl; t.querySelector('.k').textContent = kind; t.querySelector('.n').textContent = name; t.querySelector('.s').textContent = sub || ''; t.querySelector('.b').textContent = blurb || '';
    t.classList.remove('off'); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.add('off'), ms);
  }
  reticleOn(on) { this.reticle.classList.toggle('hidden', !on); }
  hudOn(on) { this.hud.classList.toggle('off', !on); }
  // ---------- minimap
  setMap(map) { this.map = map; }
  minimap(px, pz, headingRad, north = false) {
    const m = this.map; if (!m) return; const c = this.mmCtx, W = this.mmCanvas.width, S = 1.9; // px per metre
    c.save(); c.fillStyle = '#e9e4d6'; c.fillRect(0, 0, W, W);
    c.translate(W / 2, W / 2); if (!north) c.rotate(headingRad); c.scale(S, S);
    c.drawImage(m.canvas, -(px - m.x0) * m.ppm, -(pz - m.z0) * m.ppm, m.canvas.width, m.canvas.height);
    // place dots
    c.restore();
    c.save(); c.translate(W / 2, W / 2);
    for (const p of m.places || []) {
      let dx = (p.p[0] - px) * S, dz = (p.p[1] - pz) * S;
      if (!north) { const cs = Math.cos(headingRad), sn = Math.sin(headingRad); const rx = dx * cs - dz * sn, rz = dx * sn + dz * cs; dx = rx; dz = rz; }
      if (dx * dx + dz * dz > (W / 2 - 10) ** 2) continue;
      c.fillStyle = p.found ? '#fdb515' : '#ffffff'; c.strokeStyle = '#003262'; c.lineWidth = 2;
      c.beginPath(); c.arc(dx, dz, p.landmark ? 6 : 4.5, 0, 7); c.fill(); c.stroke();
    }
    // player arrow
    c.rotate(north ? -headingRad : 0);
    c.fillStyle = '#003262'; c.strokeStyle = '#fff'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, -13); c.lineTo(9, 10); c.lineTo(0, 5); c.lineTo(-9, 10); c.closePath(); c.stroke(); c.fill();
    c.restore();
    // north marker
    if (!north) { c.save(); c.translate(W / 2, W / 2); c.rotate(headingRad); c.fillStyle = '#c4482e'; c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillText('N', 0, -W / 2 + 30); c.restore(); }
  }
  // ---------- big map
  openMap({ px, pz, heading, places, onTravel }) {
    if (this.bigmap) return this.closeMap();
    const m = this.map; const el = $('div', 'bigmap', `<canvas></canvas><div class="list glass"></div><button class="btn close">Close · M</button><div class="hint">Click a place or anywhere to travel · drag to pan · scroll to zoom</div>`);
    document.body.appendChild(el); this.bigmap = el;
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1);
    let W, H; const resize = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
    resize();
    let scale = Math.min(W / (m.canvas.width / m.ppm), H / (m.canvas.height / m.ppm)) * 1.6, cx = px, cz = pz; // px per metre, view centre
    const toScreen = (x, z) => [(x - cx) * scale + W / 2, (z - cz) * scale + H / 2];
    const toWorld = (sx, sy) => [(sx - W / 2) / scale + cx, (sy - H / 2) / scale + cz];
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#0d1a33'; ctx.fillRect(0, 0, W, H);
      const [ox, oy] = toScreen(m.x0, m.z0); ctx.imageSmoothingEnabled = scale < 2;
      ctx.drawImage(m.canvas, ox, oy, m.canvas.width / m.ppm * scale, m.canvas.height / m.ppm * scale);
      ctx.font = '600 12px system-ui'; ctx.textAlign = 'center';
      for (const p of places) {
        const [sx, sy] = toScreen(p.p[0], p.p[1]); if (sx < -50 || sy < -20 || sx > W + 50 || sy > H + 20) continue;
        ctx.fillStyle = p.found ? '#fdb515' : '#fff'; ctx.strokeStyle = '#003262'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(sx, sy, p.landmark ? 7 : 5, 0, 7); ctx.fill(); ctx.stroke();
        if (scale > 0.55 || p.landmark) { ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,20,40,.75)'; ctx.strokeText(p.name, sx, sy - 11); ctx.fillStyle = '#fff'; ctx.fillText(p.name, sx, sy - 11); }
      }
      const [qx, qy] = toScreen(px, pz);
      ctx.save(); ctx.translate(qx, qy); ctx.rotate(-heading); ctx.fillStyle = '#fdb515'; ctx.strokeStyle = '#003262'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(10, 11); ctx.lineTo(0, 6); ctx.lineTo(-10, 11); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
    };
    draw();
    const list = el.querySelector('.list');
    list.innerHTML = places.slice().sort((a, b) => (b.landmark ? 1 : 0) - (a.landmark ? 1 : 0) || a.name.localeCompare(b.name)).map((p) => `<div class="${p.found ? 'found' : ''}" data-id="${p.id}"><b>${p.name}</b><i>${p.found ? '✓' : ''}</i></div>`).join('');
    list.addEventListener('click', (e) => { const d = e.target.closest('[data-id]'); if (!d) return; const p = places.find((x) => x.id === d.dataset.id); if (p) { this.closeMap(); onTravel(p.p[0], p.p[1], p); } });
    let drag = null, moved = 0;
    cv.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY, cx, cz]; moved = 0; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; moved += Math.abs(dx) + Math.abs(dy); cx = drag[2] - dx / scale; cz = drag[3] - dy / scale; draw(); });
    cv.addEventListener('pointerup', (e) => {
      const was = drag; drag = null; if (!was || moved > 6) return;
      const r = cv.getBoundingClientRect(); const sx = e.clientX - r.left, sy = e.clientY - r.top;
      let hit = null, hd = 18; for (const p of places) { const [qx, qy] = toScreen(p.p[0], p.p[1]); const d = Math.hypot(qx - sx, qy - sy); if (d < hd) { hd = d; hit = p; } }
      const [wx, wz] = hit ? hit.p : toWorld(sx, sy);
      this.closeMap(); onTravel(wx, wz, hit);
    });
    cv.addEventListener('wheel', (e) => { const r = cv.getBoundingClientRect(); const [wx, wz] = toWorld(e.clientX - r.left, e.clientY - r.top); scale = Math.max(0.12, Math.min(8, scale * (e.deltaY > 0 ? 0.88 : 1.14))); const [nx, nz] = toWorld(e.clientX - r.left, e.clientY - r.top); cx += wx - nx; cz += wz - nz; draw(); }, { passive: true });
    el.querySelector('.close').addEventListener('click', () => this.closeMap());
    this._mapResize = () => { resize(); draw(); }; addEventListener('resize', this._mapResize);
    if (document.pointerLockElement) document.exitPointerLock();
  }
  closeMap() { if (!this.bigmap) return; this.bigmap.remove(); this.bigmap = null; removeEventListener('resize', this._mapResize); this.cb.mapClosed?.(); }
  // ---------- panels
  panel(html, onBind) {
    this.closePanel();
    const p = $('div', 'panel'); p.innerHTML = `<div class="sheet glass">${html}</div>`; document.body.appendChild(p); this.panelEl = p;
    p.addEventListener('click', (e) => { if (e.target === p) this.closePanel(); });
    if (document.pointerLockElement) document.exitPointerLock();
    onBind && onBind(p);
    return p;
  }
  closePanel() { if (this.panelEl) { this.panelEl.remove(); this.panelEl = null; this.cb.panelClosed?.(); } }
  help() {
    this.panel(`<h2>How to play</h2><div class="help-grid">
      <span><kbd>W A S D</kbd></span><span>Walk (arrow keys work too). Hold <kbd>Shift</kbd> to run.</span>
      <span><kbd>Mouse</kbd></span><span>Look around (click the world to lock the mouse; <kbd>Esc</kbd> releases it)</span>
      <span><kbd>Space</kbd></span><span>Jump</span><span><kbd>E</kbd></span><span>Interact, e.g. ride the Campanile elevator</span>
      <span><kbd>B</kbd></span><span>Hop on a bike</span><span><kbd>F</kbd></span><span>Fly like a drone (Space up, C down, Shift fast)</span>
      <span><kbd>V</kbd></span><span>First / third person</span><span><kbd>M</kbd></span><span>Campus map with fast travel</span>
      <span><kbd>T</kbd></span><span>Time of day & weather</span><span><kbd>P</kbd></span><span>Photo mode (hide the HUD)</span>
      <span><kbd>Esc</kbd></span><span>Pause & settings</span></div>
      <p style="opacity:.8;font-size:13px;line-height:1.6">Find all the places on the map. The Campanile's clock shows real Pacific time, and its bells strike on the hour. The sky and sun follow live Berkeley time and weather.</p>
      <div class="btns"><button class="btn solid" data-x="close">Got it</button></div>`, (p) => p.querySelector('[data-x=close]').onclick = () => this.closePanel());
  }
  settings(s, onChange) {
    const opt = (name, val, opts) => `<select data-k="${name}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(val) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    this.panel(`<h2>Settings</h2>
      <div class="row"><span>Graphics</span>${opt('quality', s.quality, [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra']])}</div>
      <div class="row"><span>Mouse sensitivity</span><input type="range" min="0.3" max="2.5" step="0.05" value="${s.sens}" data-k="sens"></div>
      <div class="row"><span>Invert look</span>${opt('invertY', s.invertY, [[false, 'Off'], [true, 'On']])}</div>
      <div class="row"><span>Field of view</span><input type="range" min="50" max="90" step="1" value="${s.fov}" data-k="fov"></div>
      <div class="row"><span>Sound</span><input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-k="volume"></div>
      <div class="row"><span>Minimap</span>${opt('north', s.north, [[false, 'Heading up'], [true, 'North up']])}</div>
      <div class="btns"><button class="btn solid" data-x="close">Resume</button><button class="btn" data-x="help">Controls</button></div>`, (p) => {
      p.querySelectorAll('[data-k]').forEach((el) => el.addEventListener('input', () => { let v = el.value; if (v === 'true') v = true; else if (v === 'false') v = false; else if (el.type === 'range') v = parseFloat(v); onChange(el.dataset.k, v); }));
      p.querySelector('[data-x=close]').onclick = () => this.closePanel(); p.querySelector('[data-x=help]').onclick = () => this.help();
    });
  }
  timePanel(st, onChange) {
    const fmt = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); const ap = hh >= 12 ? 'PM' : 'AM'; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`; };
    this.panel(`<h2>Time & weather</h2>
      <div class="row"><span>Clock</span><select data-k="live"><option value="live" ${st.live ? 'selected' : ''}>Live Berkeley time</option><option value="custom" ${!st.live ? 'selected' : ''}>Custom</option></select></div>
      <div class="row"><span>Time of day <b class="tv">${fmt(st.hour)}</b></span><input type="range" min="0" max="23.99" step="0.05" value="${st.hour}" data-k="hour" style="width:55%"></div>
      <div class="row"><span>Weather</span><select data-k="weather">${[['live', 'Live (Open-Meteo)'], ['clear', 'Clear'], ['cloudy', 'Partly cloudy'], ['overcast', 'Overcast'], ['fog', 'Karl the Fog']].map(([v, l]) => `<option value="${v}" ${st.weather === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="btns"><button class="btn solid" data-x="close">Done</button><button class="btn" data-x="sunset">Golden hour</button><button class="btn" data-x="night">Night</button></div>`, (p) => {
      const tv = p.querySelector('.tv'), hr = p.querySelector('[data-k=hour]'), lv = p.querySelector('[data-k=live]');
      hr.addEventListener('input', () => { tv.textContent = fmt(+hr.value); lv.value = 'custom'; onChange('hour', +hr.value); });
      lv.addEventListener('input', () => onChange('live', lv.value === 'live'));
      p.querySelector('[data-k=weather]').addEventListener('input', (e) => onChange('weather', e.target.value));
      p.querySelector('[data-x=close]').onclick = () => this.closePanel();
      p.querySelector('[data-x=sunset]').onclick = () => { lv.value = 'custom'; onChange('preset', 'sunset'); this.closePanel(); };
      p.querySelector('[data-x=night]').onclick = () => { lv.value = 'custom'; onChange('preset', 'night'); this.closePanel(); };
    });
  }
  customize(look, onChange) {
    const sw = (k, arr) => `<div class="swatches">${arr.map((c, i) => `<span class="sw ${look[k] === i ? 'on' : ''}" data-k="${k}" data-i="${i}" style="background:${c}"></span>`).join('')}</div>`;
    this.panel(`<h2>Your student</h2>
      <div class="row"><span>Skin</span>${sw('skin', LOOKS.skin)}</div>
      <div class="row"><span>Hair colour</span>${sw('hair', LOOKS.hair)}</div>
      <div class="row"><span>Hair style</span><select data-k="hairStyle">${LOOKS.hairStyle.map((h, i) => `<option value="${i}" ${look.hairStyle === i ? 'selected' : ''}>${h}</option>`).join('')}</select></div>
      <div class="row"><span>Hoodie</span>${sw('top', LOOKS.top)}</div>
      <div class="row"><span>Pants</span>${sw('pants', LOOKS.pants)}</div>
      <div class="row"><span>Backpack</span><select data-k="backpack"><option value="1" ${look.backpack ? 'selected' : ''}>Yes</option><option value="0" ${!look.backpack ? 'selected' : ''}>No</option></select></div>
      <div class="btns"><button class="btn solid" data-x="close">Done</button></div>`, (p) => {
      p.querySelectorAll('.sw').forEach((el) => el.addEventListener('click', () => { p.querySelectorAll(`.sw[data-k=${el.dataset.k}]`).forEach((x) => x.classList.remove('on')); el.classList.add('on'); onChange(el.dataset.k, +el.dataset.i); }));
      p.querySelectorAll('select').forEach((el) => el.addEventListener('input', () => onChange(el.dataset.k, el.dataset.k === 'backpack' ? el.value === '1' : +el.value)));
      p.querySelector('[data-x=close]').onclick = () => this.closePanel();
    });
  }
  // [mv-ride] minimal hook: movement plugins add touch buttons (no-op on desktop until touch controls exist)
  addTouchButton(label, fn) { (this._extraTouch = this._extraTouch || []).push([label, fn]); if (this.touchEl) this._touchBtn(label, fn); }
  _touchBtn(label, fn) { const b = document.createElement('button'); b.textContent = label; b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(b); }); this.touchEl.querySelector('.tbtns').appendChild(b); }
  // ---------- touch controls
  touchControls(player, actions) {
    const t = $('div', 'touch', `<div class="joy"><b></b></div><div class="tbtns"><button data-a="jump">JUMP</button><button data-a="run">RUN</button><button data-a="bike">BIKE</button><button data-a="use">USE</button><button data-a="map">MAP</button></div>`);
    document.body.appendChild(t); this.touchEl = t;
    for (const [l, fn] of this._extraTouch || []) this._touchBtn(l, fn); // [mv-ride] plugin buttons queued before touch UI existed
    const joy = t.querySelector('.joy'), knob = joy.querySelector('b');
    let jid = null; const R = 52;
    joy.addEventListener('pointerdown', (e) => { jid = e.pointerId; joy.setPointerCapture(jid); move(e); });
    const move = (e) => { if (e.pointerId !== jid) return; const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; player.touch.mx = dx / R; player.touch.my = dy / R; };
    joy.addEventListener('pointermove', move);
    const end = (e) => { if (e.pointerId !== jid) return; jid = null; knob.style.transform = ''; player.touch.mx = 0; player.touch.my = 0; };
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
    t.querySelector('.tbtns').addEventListener('pointerdown', (e) => { const a = e.target.dataset.a; if (!a) return; e.preventDefault(); actions[a]?.(e.target); });
    // look: drag anywhere on the canvas
    let lid = null, lx = 0, ly = 0; const cv = document.querySelector('canvas#c');
    cv.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; lid = e.pointerId; lx = e.clientX; ly = e.clientY; });
    cv.addEventListener('pointermove', (e) => { if (e.pointerId !== lid) return; player.lookDelta((e.clientX - lx) * 0.9, (e.clientY - ly) * 0.9); lx = e.clientX; ly = e.clientY; });
    cv.addEventListener('pointerup', (e) => { if (e.pointerId === lid) lid = null; });
  }
}
// Static map image (1 px per metre) from ground masks + buildings + trees + water.
export function buildMapCanvas({ sdf, nx, nz, step = 1, x0, z0, buildings, trees, water, landmarkFootprints, replaced }) {
  const cv = document.createElement('canvas'); cv.width = Math.round(nx * step); cv.height = Math.round(nz * step); const ctx = cv.getContext('2d');
  const base = document.createElement('canvas'); base.width = nx; base.height = nz; const bctx = base.getContext('2d');
  const img = bctx.createImageData(nx, nz); const d = img.data;
  const C = { base: [233, 228, 210], grass: [190, 214, 160], dirt: [214, 205, 176], paved: [246, 243, 236], asph: [214, 210, 202] };
  for (let i = 0, n = nx * nz; i < n; i++) {
    const a = sdf[i * 4], p = sdf[i * 4 + 1], g = sdf[i * 4 + 2], r = sdf[i * 4 + 3];
    let c = C.base; if (r > 128) c = C.dirt; if (g > 128) c = C.grass; if (p > 128) c = C.paved; if (a > 128) c = C.asph;
    d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
  }
  bctx.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(base, 0, 0, cv.width, cv.height);
  // tree canopies
  ctx.fillStyle = 'rgba(96,140,84,0.38)';
  for (let i = 0; i < trees.n; i++) { const x = trees.x[i] / 10 - x0, z = trees.z[i] / 10 - z0, r = trees.r[i] / 10; ctx.beginPath(); ctx.arc(x, z, Math.max(1.2, r * 0.85), 0, 7); ctx.fill(); }
  // water
  ctx.strokeStyle = '#8cc0da'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const w of water) { ctx.lineWidth = Math.max(2, w.w); ctx.beginPath(); w.pts.forEach(([x, z], k) => (k ? ctx.lineTo(x - x0, z - z0) : ctx.moveTo(x - x0, z - z0))); ctx.stroke(); }
  // buildings
  ctx.lineWidth = 1;
  for (const b of buildings.b) {
    const f = b[7][0][5]; const land = replaced && replaced.has(b[0]);
    ctx.fillStyle = land ? '#d8b25a' : '#bdb4a4'; ctx.strokeStyle = land ? '#9a7a2c' : '#978e7e';
    ctx.beginPath(); for (let k = 0; k < f.length; k += 2) { const x = f[k] / 10 - x0, z = f[k + 1] / 10 - z0; k ? ctx.lineTo(x, z) : ctx.moveTo(x, z); } ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  for (const fp of landmarkFootprints || []) { ctx.fillStyle = '#d8b25a'; ctx.strokeStyle = '#9a7a2c'; ctx.beginPath(); fp.forEach(([x, z], k) => (k ? ctx.lineTo(x - x0, z - z0) : ctx.moveTo(x - x0, z - z0))); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  return { canvas: cv, x0, z0, ppm: 1 };
}
