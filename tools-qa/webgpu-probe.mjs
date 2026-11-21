import { chromium } from 'playwright';
const combos = {
  A: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  B: ['--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  C: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPUService', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  D: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
};
const which = process.argv[2] ? [process.argv[2]] : Object.keys(combos);
for (const k of which) {
  for (const headless of [true]) {
    let browser;
    try {
      browser = await chromium.launch({ headless, channel: process.argv[3] || undefined, args: combos[k] });
      const page = await browser.newPage();
      await page.goto('http://localhost:5174/dev/landmark.html').catch(()=>{});
      const r = await page.evaluate(async () => {
        if (!navigator.gpu) return 'no navigator.gpu';
        try {
          const a = await navigator.gpu.requestAdapter();
          if (!a) return 'adapter null';
          const info = a.info || {};
          const d = await a.requestDevice();
          return JSON.stringify({ vendor: info.vendor, arch: info.architecture, desc: info.description, device: info.device, fb: a.isFallbackAdapter, feats: [...a.features].slice(0, 30), maxTex: a.limits.maxTextureDimension2D, dev: !!d });
        } catch (e) { return 'err ' + e.message; }
      });
      console.log(k, headless ? 'headless' : 'headed', browser.version(), r);
    } catch (e) { console.log(k, 'launch err', e.message.slice(0, 300)); }
    if (browser) await browser.close();
  }
}
