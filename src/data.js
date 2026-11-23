// Data loading: fetch + gunzip (DecompressionStream) + predictor decoding, with progress reporting.
const BASE = (import.meta.env.BASE_URL || '/') + 'data/';
const VERSION = '1';
let total = 0, loaded = 0; const listeners = new Set();
export function onProgress(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const f of listeners) f(total ? loaded / total : 0); }

async function fetchBytes(name, expectGz = true) {
  const res = await fetch(BASE + name + '?v=' + VERSION);
  if (!res.ok) throw new Error('Failed to load ' + name + ' (' + res.status + ')');
  const len = +res.headers.get('content-length') || 0;
  total += len || 1e6;
  let body = res.body;
  // count compressed bytes as they arrive. [r6-load] With Content-Encoding (deploy/server.py serves brotli) the stream
  // carries decoded bytes, larger than content-length: count them at an assumed ~4:1 ratio, capped at len.
  const coded = !!res.headers.get('content-encoding') && len > 0; let got = 0;
  const counter = new TransformStream({ transform(chunk, ctl) { if (coded) { const add = Math.min(len - got, chunk.byteLength / 4); got += add; loaded += add; } else loaded += chunk.byteLength; emit(); ctl.enqueue(chunk); } });
  body = body.pipeThrough(counter);
  // if the server already decoded (content-encoding gzip), the stream is plain; detect by magic bytes
  const reader = body.getReader(); const chunks = []; let size = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); size += value.byteLength; }
  let buf = new Uint8Array(size); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
  if (!len) { total += size - 1e6; emit(); } else if (coded && got < len) { loaded += len - got; emit(); }
  if (expectGz && buf[0] === 0x1f && buf[1] === 0x8b) {
    const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    buf = new Uint8Array(await new Response(ds).arrayBuffer());
  }
  return buf;
}
export async function loadJSON(name) {
  const b = await fetchBytes(name, name.endsWith('.gz'));
  return JSON.parse(new TextDecoder().decode(b));
}
export async function loadBin(name) { return fetchBytes(name, true); }
export async function loadImage(name) {
  const res = await fetch(BASE + name + '?v=' + VERSION);
  const len = +res.headers.get('content-length') || 0; total += len; emit();
  const blob = await res.blob(); loaded += len || blob.size; emit();
  return await createImageBitmap(blob, { imageOrientation: 'flipY' === 'x' ? 'flipY' : 'none' });
}
// planar predictor decode: r -> a, where p = left + up - upleft
export function decodePlanar(res, nx, nz, out = new Float32Array(nx * nz), scale = 1) {
  const a = new Int32Array(nx * nz);
  for (let i = 0; i < nz; i++) {
    const row = i * nx;
    for (let j = 0; j < nx; j++) {
      const k = row + j;
      let p;
      if (i === 0 && j === 0) p = 0;
      else if (i === 0) p = a[k - 1];
      else if (j === 0) p = a[k - nx];
      else p = a[k - 1] + a[k - nx] - a[k - nx - 1];
      a[k] = res[k] + p;
      out[k] = a[k] * scale;
    }
  }
  return out;
}
export const dataBase = BASE;
