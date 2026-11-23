// Precompress a staged build for deploy/server.py: writes <file>.br (brotli) and <file>.gz (gzip -9) next to each
// compressible file when that saves at least 5%. Already-gzipped data (*.json.gz, *.bin.gz) gets a .br holding
// brotli(raw payload): served with Content-Encoding: br, the browser hands src/data.js the plain bytes.
// usage: node deploy/precompress.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) { console.error('usage: node deploy/precompress.mjs <dir>'); process.exit(1); }
const EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.wasm', '.svg', '.md', '.txt', '.bin', '.glb', '.gltf', '.ktx2']);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
let nIn = 0, bIn = 0, bBr = 0, nOut = 0;
const t0 = Date.now();
for (const f of walk(dir)) {
  if (f.endsWith('.br') || /\.(py|pyc)$/.test(f)) continue;
  const isGzData = f.endsWith('.json.gz') || f.endsWith('.bin.gz');
  const ext = path.extname(f).toLowerCase();
  if (!isGzData && !EXT.has(ext)) continue;
  if (!isGzData && f.endsWith('.gz')) continue;
  const src = fs.readFileSync(f); const st = fs.statSync(f);
  let raw = src; if (isGzData) { try { raw = zlib.gunzipSync(src); } catch (e) { continue; } }
  if (raw.length < 512) continue;
  nIn++; bIn += src.length;
  const br = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: raw.length > 4e6 ? 9 : 11, [zlib.constants.BROTLI_PARAM_LGWIN]: 24, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } });
  const write = (p, buf) => { fs.writeFileSync(p, buf); fs.utimesSync(p, st.atime, new Date(Math.max(st.mtimeMs, Date.now()))); nOut++; };
  if (br.length <= src.length * 0.95) { write(f + '.br', br); bBr += br.length; } else { bBr += src.length; try { fs.unlinkSync(f + '.br'); } catch (e) {} }
  if (!isGzData) { const gz = zlib.gzipSync(raw, { level: 9 }); if (gz.length <= src.length * 0.95) write(f + '.gz', gz); else try { fs.unlinkSync(f + '.gz'); } catch (e) {} }
}
console.log(`precompress: ${nIn} files, ${(bIn / 1048576).toFixed(1)} MB -> ${(bBr / 1048576).toFixed(1)} MB as brotli, ${nOut} variants written in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
