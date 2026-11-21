// node gpu/snap.mjs "<query>" name [view ...]   (WebGPU-capable headless Chromium; same views as snap.mjs)
import { chromium } from 'playwright';
import fs from 'fs';
const q = process.argv[2] || ''; const name = process.argv[3] || 'snap';
const views = process.argv.slice(4);
// full Chromium (new headless) + Vulkan SwiftShader: the headless shell has no SharedImage backing for WebGPU canvases
const browser = await chromium.launch({ channel: 'chromium', args: ['--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ozone-platform=headless', '--disable-gpu-watchdog'] });
const page = await browser.newPage({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } });
page.setDefaultTimeout(400000);
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) || m.text().startsWith('BSIM') || m.text().startsWith('[webgpu]')) logs.push(m.type() + ': ' + m.text().slice(0, 600)); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message + ' ' + (e.stack || '').slice(0, 800)));
const t0 = Date.now();
await page.goto(`http://localhost:5174/${q}`, { waitUntil: 'load' });
try { await page.waitForFunction(() => window.BSIM && (window.BSIM.ready || window.BSIM.error), null, { polling: 500, timeout: 400000 }); } catch (e) { console.log('TIMEOUT waiting ready'); { const seen = new Set(); const out = []; for (const l of logs) { const k = l.slice(0, 160); if (seen.has(k)) continue; seen.add(k); out.push(l); } console.log(out.slice(0, 40).join('\n')); } await browser.close(); process.exit(1); }
console.log('ready in', Date.now() - t0, 'ms');
await page.evaluate(() => window.BSIM.pause && window.BSIM.pause());
const err = await page.evaluate(() => window.BSIM.error);
if (err) { console.log('ERROR', err); { const seen = new Set(); const out = []; for (const l of logs) { const k = l.slice(0, 160); if (seen.has(k)) continue; seen.add(k); out.push(l); } console.log(out.slice(0, 40).join('\n')); } await browser.close(); process.exit(1); }
fs.mkdirSync('/work/qa/shots', { recursive: true });
const list = views.length ? views : [null];
for (let i = 0; i < list.length; i++) {
  const v = list[i];
  const t1 = Date.now();
  const r = await page.evaluate(async (v) => {
    if (v) { const rel = v.startsWith('@'); const a = v.replace('@', '').split(',').map(Number); window.BSIM.setView(...a, rel); }
    window.BSIM.renderOnce(); // warm (pipelines/shadows)
    if (window.BSIM.gpu) await new Promise((r) => setTimeout(r, 50));
    window.BSIM.renderOnce();
    return window.BSIM.snapshot(32, 18);
  }, v);
  fs.writeFileSync(`/work/qa/shots/${name}${list.length > 1 ? '-' + i : ''}.jpg`, Buffer.from(r.url.split(',')[1], 'base64'));
  const px = r.px; let s = [0, 0, 0]; for (let k = 0; k < px.length; k += 4) { s[0] += px[k]; s[1] += px[k + 1]; s[2] += px[k + 2]; }
  console.log(`view ${i} ${v || ''} mean rgb ${s.map((x) => Math.round(x / (px.length / 4))).join(',')}  (${Date.now() - t1} ms)`);
}
const info = await page.evaluate(() => ({ timing: window.BSIM.timing, gpu: !!window.BSIM.gpu, fallback: window.BSIM.rendererFallback || null, conv: window.BSIM.gpu ? window.BSIM.gpu.conv.stats : null, render: window.BSIM.renderer.info.render }));
console.log(JSON.stringify(info));
{ const seen = new Set(); const out = []; for (const l of logs) { const k = l.slice(0, 160); if (seen.has(k)) continue; seen.add(k); out.push(l); } console.log(out.slice(0, 40).join('\n')); }
await browser.close();
