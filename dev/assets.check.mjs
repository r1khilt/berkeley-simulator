// Headless check for /dev/assets.html.  node dev/assets.check.mjs [--season=late-autumn] [--only=trees|props] [--shots] [--json]
import { chromium } from '/work/qa/node_modules/playwright/index.mjs';
import fs from 'fs';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const season = arg('season', 'late-autumn'), only = arg('only', ''), extra = arg('extra', ''), shots = process.argv.includes('--shots');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
// no Vite HMR client: other agents editing files must not reload the page mid-check
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'export function injectQuery(u){return u} export function createHotContext(){return {accept(){},dispose(){},on(){},prune(){},invalidate(){},data:{}}} export function updateStyle(){} export function removeStyle(){}' }));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
const t0 = Date.now();
await page.goto(`http://localhost:5173/dev/assets.html?season=${season}${only ? '&only=' + only : ''}${extra ? '&' + extra : ''}`, { waitUntil: 'load', timeout: 180000 });
try { await page.waitForFunction(() => window.__assets && (window.__assets.ready || window.__assets.errors.length), null, { timeout: 240000 }); } catch (e) { logs.push('timeout waiting for build'); }
await page.waitForTimeout(1500);
const out = await page.evaluate(() => { const a = window.__assets; if (!a.ready) return { errors: a.errors }; return { stats: a.stats(), errors: a.errors }; });
const s = out.stats;
const problems = [];
if (s) {
  console.log(`season ${s.season}  build ${s.buildMs} ms  load ${Date.now() - t0} ms  render:`, JSON.stringify(s.renderInfo));
  console.log('\nTREES  (normalised: height 1)                lod0   lod1   lod2   normR  crownBase  bbox lod0');
  for (const [id, t] of Object.entries(s.trees)) {
    const [a, b, c] = t.lods.map((l) => l.triangles);
    const bb = t.lods[0].bbox;
    const split = t.lods[0].parts.map((p) => p.kind[0] + p.triangles).join('/');
    console.log(`${id.padEnd(14)} ${t.name.padEnd(28)} ${String(a).padStart(6)} ${String(b).padStart(6)} ${String(c).padStart(6)}  ${t.normRadius.toFixed(3)}  ${t.crownBase.toFixed(3)}   y ${bb.min[1]}..${bb.max[1]}  x ${bb.min[0]}..${bb.max[0]}  ${split}`);
    if (a > 3000) problems.push(`${id} lod0 ${a} > 3000`); if (b > 400) problems.push(`${id} lod1 ${b} > 400`); if (c > 80) problems.push(`${id} lod2 ${c} > 80`);
    t.lods.forEach((l, i) => l.parts.forEach((p) => { if (p.winding !== null && p.winding < (p.kind === 'far' ? 0.95 : 0.97)) problems.push(`${id} lod${i} ${p.kind} winding ${p.winding}`); }));
    t.lods.forEach((l, i) => { if (Math.abs(l.bbox.max[1] - 1) > 0.02) problems.push(`${id} lod${i} top ${l.bbox.max[1]}`); if (l.bbox.min[1] < -0.035) problems.push(`${id} lod${i} min y ${l.bbox.min[1]}`); });
  }
  console.log('\nPROPS                    tris  parts  size (w x h x d)        materials');
  for (const [id, p] of Object.entries(s.props)) {
    const sz = p.bbox.max.map((v, i) => (v - p.bbox.min[i]).toFixed(2));
    console.log(`${id.padEnd(20)} ${String(p.triangles).padStart(6)}  ${String(p.parts).padStart(4)}   ${sz.join(' x ').padEnd(22)}  ${p.materials.join(', ')}`);
    p.winding.forEach((w, k) => { if (w < 0.97) problems.push(`${id} part ${k} (${p.materials[k]}) winding ${w}`); });
    const lim = id === 'parkedBike' ? 3000 : 1500; if (p.triangles > lim) problems.push(`${id} ${p.triangles} > ${lim}`);
    if (p.bbox.min[1] < -0.5) problems.push(`${id} min y ${p.bbox.min[1]}`);
  }
}
if (process.argv.includes('--json')) fs.writeFileSync('/tmp/assets-stats.json', JSON.stringify(s, null, 1));
const errs = [...logs, ...(out.errors || [])];
console.log('\n--- console errors/warnings:', errs.length); if (errs.length) console.log(errs.slice(0, 40).join('\n'));
console.log('--- budget/bbox problems:', problems.length); if (problems.length) console.log(problems.join('\n'));
if (process.argv.includes('--qa') && s) {
  console.log('\nQA per species: side colour lod0/lod1/lod2 (sRGB mean, coverage) | top colour | shadow coverage lod0/lod1 | wind');
  const qa = {};
  for (const id of Object.keys(s.trees)) {
    const r = await page.evaluate((id) => { const a = window.__assets; return { side: a.lodColors(id, 'side'), top: a.lodColors(id, 'top'), sh0: a.shadowCoverage(id, 0), sh1: a.shadowCoverage(id, 1), sh2: a.shadowCoverage(id, 2), wind: a.windTest(id, 0) }; }, id);
    const f = (x) => x.rgb ? `${x.rgb.join(',')}@${x.coverage}` : 'none';
    console.log(`${id.padEnd(13)} side ${r.side.map(f).join(' | ')}  top ${r.top.map(f).join(' | ')}  shadow ${r.sh0}/${r.sh1}/${r.sh2}  wind ${JSON.stringify(r.wind)}`);
    qa[id] = r;
  }
  fs.writeFileSync('/tmp/assets-qa.json', JSON.stringify(qa));
}
if (process.argv.includes('--shape') && s) {
  console.log('\nleaf atlas coverage (cells 0-2):', JSON.stringify(await page.evaluate(() => window.__assets.leafCoverage())));
  console.log('silhouettes (side view, width per height band, bottom -> top; aspect = max width / height)');
  const bar = (v) => ' .:-=+*#%@'[Math.min(9, Math.round(v * 9))];
  for (const id of Object.keys(s.trees)) {
    const r = await page.evaluate((id) => [0, 1, 2].map((l) => window.__assets.profile(id, l)), id);
    console.log(`${id.padEnd(13)} ` + r.map((p, l) => `lod${l} ${p.bands.map(bar).join('')} a=${p.aspect}`).join('   '));
  }
}
if (shots && s) {
  fs.mkdirSync('/work/qa/shots', { recursive: true });
  for (const id of Object.keys(s.trees)) { await page.evaluate((id) => window.__assets.focus('tree', id, 0), id); await page.waitForTimeout(250); await page.screenshot({ path: `/work/qa/shots/asset-tree-${id}.png` }); }
  for (const id of Object.keys(s.props)) { await page.evaluate((id) => window.__assets.focus('prop', id), id); await page.waitForTimeout(150); await page.screenshot({ path: `/work/qa/shots/asset-prop-${id}.png` }); }
  console.log('shots in /work/qa/shots (asset-*.png)');
}
await browser.close();
