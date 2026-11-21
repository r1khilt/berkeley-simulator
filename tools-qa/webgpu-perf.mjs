// node gpu/perf.mjs "<query>" label  -> frame timings at spawn (SwiftShader: CPU-bound, use relative numbers only)
import { chromium } from 'playwright';
const q = process.argv[2] || ''; const label = process.argv[3] || 'run';
const browser = await chromium.launch({ channel: 'chromium', args: ['--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ozone-platform=headless', '--disable-gpu-watchdog'] });
const page = await browser.newPage({ viewport: { width: +(process.env.W || 960), height: +(process.env.H || 540) } });
page.setDefaultTimeout(600000);
const t0 = Date.now();
await page.goto(`http://localhost:5174/${q}`);
await page.waitForFunction(() => window.BSIM && (window.BSIM.ready || window.BSIM.error), null, { polling: 500 });
const readyMs = Date.now() - t0;
const res = await page.evaluate(async () => {
  const B = window.BSIM; B.pause(); B.setTime(14);
  const views = { spawn: [-156, 1.7, 246, -147, 3, 204], aerial: [-60, 90, 140, 0, 40, -40] };
  const sync = async () => { if (B.gpu) await B.renderer.backend.device.queue.onSubmittedWorkDone(); else { const gl = B.renderer.getContext(); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } };
  const out = {};
  for (const [name, v] of Object.entries(views)) {
    B.setView(...v, true);
    const tw = performance.now(); B.renderOnce(); await sync(); const first = performance.now() - tw; // includes pipeline/shader compile
    for (let i = 0; i < 2; i++) { B.renderOnce(); await sync(); }
    const cpu = [], tot = [];
    let info = null;
    for (let i = 0; i < 6; i++) { const a = performance.now(); B.renderOnce(); const b = performance.now(); await sync(); const c = performance.now(); cpu.push(b - a); tot.push(c - a); if (i === 0) info = { ...B.renderer.info.render }; }
    const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    out[name] = { firstFrameMs: Math.round(first), cpuMedMs: +med(cpu).toFixed(1), totalMedMs: +med(tot).toFixed(1), info };
  }
  out.mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB JS heap' : null;
  out.timing = B.timing;
  return out;
});
console.log(JSON.stringify({ label, readyMs, ...res }, null, 1));
await browser.close();
