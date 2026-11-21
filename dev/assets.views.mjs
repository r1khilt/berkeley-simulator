// Render presentation views of trees to JPEG for visual review.  node dev/assets.views.mjs oak,plane [close,mid,under,far] [--lod=0]
import { chromium } from '/work/qa/node_modules/playwright/index.mjs';
import fs from 'fs';
const ids = (process.argv[2] || 'oak').split(','), modes = (process.argv[3] || 'close,mid').split(',');
const lod = +((process.argv.find((a) => a.startsWith('--lod=')) || '--lod=0').split('=')[1]);
const season = (process.argv.find((a) => a.startsWith('--season=')) || '--season=late-autumn').split('=')[1];
const lod0 = (process.argv.find((a) => a.startsWith('--lod0=')) || '--lod0=3000').split('=')[1];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'export function injectQuery(u){return u} export function createHotContext(){return {accept(){},dispose(){},on(){},prune(){},invalidate(){},data:{}}}' }));
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(`http://localhost:5173/dev/assets.html?only=trees&season=${season}&lod0=${lod0}&species=${ids.join(',')}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__assets && window.__assets.ready, null, { timeout: 200000 });
fs.mkdirSync('/work/qa/shots/trees', { recursive: true });
for (const id of ids) for (const m of modes) {
  await page.evaluate(([id, m, l]) => window.__assets.viewTree(id, m, l), [id, m, lod]);
  await page.waitForTimeout(300);
  const f = `/work/qa/shots/trees/${id}-${m}${lod ? '-lod' + lod : ''}${lod0 !== '3000' ? '-b' + lod0 : ''}.jpg`;
  await page.screenshot({ path: f, type: 'jpeg', quality: 85, timeout: 120000 }); console.log(f);
}
await browser.close();
