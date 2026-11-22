// r4-people3: build the Microsoft Rocketbox near-LOD avatars (MIT licence, github.com/microsoft/Microsoft-Rocketbox)
// into public/assets/people/rb/<id>.glb + manifest.json.
// Per avatar: Export/<Name>.fbx (the 81-bone "hipoly" mesh, ~8.7k tris: body + head + hair/lash cards) is converted
// with FBX2glTF, the 2048^2 TGA textures are downsized to WebP (body/head colour, opacity cards with alpha, body
// normal), vertex colours are dropped, the facial bones stay (rest pose), and geometry is quantized + meshopt-packed.
// Run from a scratch dir that has @gltf-transform/{core,extensions,functions}, sharp, meshoptimizer installed, plus
// FBX2glTF (github.com/facebookincubator/FBX2glTF releases) and python3 Pillow (TGA -> PNG):
//   node people_rb_build.mjs Female_Adult_08 Male_Adult_12 ...   (env OUT, SRC, SIZES=body,head,opacity,normal)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP, EXTMeshoptCompression, KHRMeshQuantization, KHRTextureBasisu } from '@gltf-transform/extensions';
import { prune, dedup, quantize, weld, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
import { execFileSync } from 'child_process';
const OUT = process.env.OUT || '/work/ucb/app/public/assets/people/rb';
const SRC = process.env.SRC || '/tmp/rbx/src';
const RAW = 'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/Assets/Avatars/';
const [SB, SH, SO, SN] = (process.env.SIZES || '1024,1024,512,512').split(',').map(Number);
// colour textures as KTX2 / ETC1S (GPU-compressed: ~7x less video memory than WebP -> RGBA8); normal map stays WebP.
// TOKTX = path to KTX-Software's toktx (github.com/KhronosGroup/KTX-Software releases); KTX=0 for all-WebP
const KTX = process.env.KTX !== '0', TOKTX = process.env.TOKTX || '/tmp/ktx/KTX-Software-4.3.2-Linux-x86_64/bin/toktx';
const tree = JSON.parse(fs.readFileSync(process.env.TREE || '/tmp/rbtree.json', 'utf8')).tree; // GitHub API tree listing (git/trees/master?recursive=1)
fs.mkdirSync(OUT, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptEncoder.ready;
const get = (url, dst) => { if (!fs.existsSync(dst)) execFileSync('curl', ['-fsS', '-o', dst, url]); return dst; };
// alpha cards (hair, scarves): bleed the colour of opaque texels into the transparent ones (premultiplied blur), so
// mipmaps / block compression don't pull white fringes into the cut-out edges
const BLEED = `
from PIL import Image, ImageFilter, ImageMath, ImageChops
def bleed(im):
    a = im.getchannel('A'); rgb = im.convert('RGB'); m = a.point(lambda v: 255 if v > 100 else 0)
    out = rgb
    for r in (2, 6, 16):
        ab = m.filter(ImageFilter.GaussianBlur(r)); ch = []
        for c in out.split():
            pb = ImageChops.multiply(c, m).filter(ImageFilter.GaussianBlur(r))
            ch.append(ImageMath.lambda_eval(lambda e: e['convert'](e['min'](e['p'] * 255 / e['max'](e['q'], 1), 255), 'L'), p=pb, q=ab))
        fill = Image.merge('RGB', ch); out = Image.composite(out, fill, m); m = ab.point(lambda v: 255 if v > 8 else 0)
    out = Image.composite(rgb, out, a.point(lambda v: 255 if v > 100 else 0)); out.putalpha(a); return out
`;
const tga2png = (src, dst, size, alpha) => { execFileSync('python3', ['-c', `${alpha ? BLEED : ''}
from PIL import Image; im=Image.open(${JSON.stringify(src)}); im=im.convert('${alpha ? 'RGBA' : 'RGB'}'); im=im.resize((${size},${size}), Image.LANCZOS)
${alpha ? 'im=bleed(im)' : ''}
im.save(${JSON.stringify(dst)})`]); return dst; };
const manifest = fs.existsSync(OUT + '/manifest.json') ? JSON.parse(fs.readFileSync(OUT + '/manifest.json', 'utf8')) : { avatars: [] };
for (const name of process.argv.slice(2)) {
  const ent = tree.filter((e) => e.type === 'blob' && e.path.includes('/' + name + '/'));
  const fbxE = ent.find((e) => e.path.endsWith('/Export/' + name + '.fbx')); if (!fbxE) { console.warn('no fbx for', name); continue; }
  const dir = `${SRC}/${name}`; fs.mkdirSync(dir, { recursive: true });
  const base = RAW.replace('Assets/Avatars/', '') ; const url = (p) => 'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/' + p.split('/').map(encodeURIComponent).join('/');
  const fbx = get(url(fbxE.path), `${dir}/${name}.fbx`);
  const tex = (suffix) => { const e = ent.find((x) => x.path.endsWith(suffix + '.tga') && x.path.includes('/Textures/')); return e ? get(url(e.path), `${dir}/${e.path.split('/').pop()}`) : null; };
  const T = { body: tex('_body_color'), head: tex('_head_color'), opacity: tex('_opacity_color'), normal: tex('_body_normal') };
  if (!fs.existsSync(`${dir}/${name}.glb`)) execFileSync('/tmp/rbx/FBX2glTF', ['--binary', '--input', fbx, '--output', `${dir}/${name}`], { stdio: 'ignore' });
  const doc = await io.read(`${dir}/${name}.glb`); const root = doc.getRoot();
  doc.createExtension(EXTTextureWebP).setRequired(true); if (KTX) doc.createExtension(KHRTextureBasisu).setRequired(true);
  const webp = async (file, size, alpha, q) => { const png = tga2png(file, file.replace(/\.tga$/, `_${size}.png`), size, alpha); return new Uint8Array(await sharp(png).webp({ quality: q, alphaQuality: 90, effort: 6 }).toBuffer()); };
  const ktx2 = (file, size, alpha) => { const png = tga2png(file, file.replace(/\.tga$/, `_${size}.png`), size, alpha); const out = png.replace(/\.png$/, '.ktx2');
    execFileSync(TOKTX, ['--t2', '--encode', 'etc1s', '--clevel', '4', '--qlevel', '200', '--genmipmap', '--assign_oetf', 'srgb', out, png], { env: { ...process.env, LD_LIBRARY_PATH: TOKTX.replace(/bin\/toktx$/, 'lib') } }); return new Uint8Array(fs.readFileSync(out)); };
  const mkTex = async (key, file, size, alpha, q) => { if (!file) return null; if (KTX && key !== 'normal') return doc.createTexture(key).setImage(ktx2(file, size, alpha)).setMimeType('image/ktx2').setURI(key + '.ktx2');
    return doc.createTexture(key).setImage(await webp(file, size, alpha, q)).setMimeType('image/webp').setURI(key + '.webp'); };
  for (const t of root.listTextures()) t.dispose(); // FBX2glTF's 1x1 placeholders
  const tBody = await mkTex('body', T.body, SB, false, 82), tHead = await mkTex('head', T.head, SH, false, 86), tOp = await mkTex('opacity', T.opacity, SO, true, 85), tN = SN ? await mkTex('normal', T.normal, SN, false, 88) : null;
  for (const m of root.listMaterials()) {
    const n = m.getName(); m.setMetallicFactor(0).setRoughnessFactor(0.75).setEmissiveFactor([0, 0, 0]).setEmissiveTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setBaseColorFactor([1, 1, 1, 1]);
    if (/_body$/.test(n)) { m.setBaseColorTexture(tBody); if (tN) m.setNormalTexture(tN); m.setName('rb:body'); }
    else if (/_head$/.test(n)) { m.setBaseColorTexture(tHead); m.setNormalTexture(null); m.setName('rb:head'); }
    else if (/_opacity$/.test(n)) { m.setBaseColorTexture(tOp); m.setNormalTexture(null); m.setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true); m.setName('rb:hair'); }
  }
  const look = await measureLook(root, name, { body: T.body && T.body.replace(/\.tga$/, `_${SB}.png`), head: T.head && T.head.replace(/\.tga$/, `_${SH}.png`), hair: T.opacity && T.opacity.replace(/\.tga$/, `_${SO}.png`) });
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) for (const s of p.listSemantics()) if (/COLOR_|TEXCOORD_[1-9]/.test(s)) p.setAttribute(s, null);
  for (const n of root.listNodes()) if (n.getName() === 'Bip01 Footsteps') n.dispose();
  for (const a of root.listAnimations()) a.dispose();
  await doc.transform(prune(), dedup(), weld(), reorder({ encoder: MeshoptEncoder }), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  const id = name.toLowerCase().replace(/_adult/, '').replace(/business_/, 'biz_');
  await io.write(`${OUT}/${id}.glb`, doc);
  // average colours of the clothes (top / bottom) and skin, sampled from the rendered preview-independent textures:
  // the far crowd wears these so the hand-off to this avatar doesn't change colours
  const tris = root.listMeshes()[0].listPrimitives().reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
  const size = fs.statSync(`${OUT}/${id}.glb`).size;
  const e = { id, name, sex: /female/i.test(name) ? 'f' : 'm', file: id + '.glb', tris, bytes: size, look };
  const i = manifest.avatars.findIndex((a) => a.id === id); if (i >= 0) manifest.avatars[i] = { ...manifest.avatars[i], ...e }; else manifest.avatars.push(e);
  console.log(id, tris, 'tris', (size / 1024).toFixed(0), 'KB');
}
fs.writeFileSync(OUT + '/manifest.json', JSON.stringify(manifest, null, 1));

// ---- crowd look (what campus life's far LOD wears for people dressed in this avatar): average linear colours of the
// clothes by body region (dominant joint per vertex), skin from the hands, hair from the hair cards (or the scalp),
// sleeve / trouser flags by comparing forearm / calf colour with the skin, height relative to the 1.75 m crowd figure.
async function measureLook(root, name, pngs) {
  const SKIN_P = [[0.92, 0.74, 0.62], [0.83, 0.62, 0.47], [0.70, 0.50, 0.36], [0.55, 0.37, 0.25], [0.40, 0.26, 0.17], [0.27, 0.17, 0.11]];
  const HAIR_P = [[0.035, 0.03, 0.028], [0.09, 0.06, 0.04], [0.2, 0.13, 0.07], [0.36, 0.24, 0.13], [0.62, 0.48, 0.28], [0.45, 0.44, 0.43], [0.42, 0.1, 0.07]];
  const SHOE_P = [[0.86, 0.86, 0.84], [0.06, 0.06, 0.065], [0.42, 0.42, 0.43], [0.12, 0.16, 0.3], [0.45, 0.33, 0.2], [0.62, 0.12, 0.1]];
  const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const nearest = (pal, c) => { let bi = 0, bd = 1e9; pal.forEach((p, i) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
  const N = 128; const img = {}; for (const [k, f] of Object.entries(pngs)) if (f && fs.existsSync(f)) img[k] = await sharp(f).resize(N, N).ensureAlpha().raw().toBuffer();
  const acc = {}; const add = (k, r, g, b, w = 1) => { const a = acc[k] || (acc[k] = [0, 0, 0, 0]); a[0] += r * w; a[1] += g * w; a[2] += b * w; a[3] += w; };
  const avg = (k) => { const a = acc[k]; return a && a[3] > 0 ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : null; };
  const skin = root.listSkins()[0]; const jn = skin ? skin.listJoints().map((j) => j.getName()) : [];
  let zmin = 1e9, zmax = -1e9; const t3 = [];
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) { const P = p.getAttribute('POSITION'); for (let i = 0; i < P.getCount(); i++) { const z = P.getElement(i, t3)[2]; zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); } }
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
    const mn = p.getMaterial() ? p.getMaterial().getName() : ''; const key = mn === 'rb:body' ? 'body' : mn === 'rb:head' ? 'head' : mn === 'rb:hair' ? 'hair' : null; const px = key && img[key]; if (!px) continue;
    const UV = p.getAttribute('TEXCOORD_0'), J = p.getAttribute('JOINTS_0'), W = p.getAttribute('WEIGHTS_0'), P = p.getAttribute('POSITION'); const u2 = [], j4 = [], w4 = [], p3 = [];
    for (let i = 0; i < UV.getCount(); i++) {
      UV.getElement(i, u2); const x = Math.min(N - 1, Math.max(0, Math.floor((u2[0] - Math.floor(u2[0])) * N))), y = Math.min(N - 1, Math.max(0, Math.floor((u2[1] - Math.floor(u2[1])) * N)));
      const o = (y * N + x) * 4; const r = s2l(px[o] / 255), g = s2l(px[o + 1] / 255), b = s2l(px[o + 2] / 255), al = px[o + 3] / 255;
      if (key === 'hair') { if (al > 0.6) add('hair', r, g, b); continue; }
      J.getElement(i, j4); W.getElement(i, w4); let bi = 0; for (let c = 1; c < 4; c++) if (w4[c] > w4[bi]) bi = c; const bn = jn[j4[bi]] || '';
      if (key === 'head') { P.getElement(i, p3); if (/Head$/.test(bn)) add('scalp', r, g, b, Math.max(0, p3[2] - (zmax - 0.06))); continue; }
      const k = /Spine|Clavicle|UpperArm/.test(bn) ? 'top' : /Forearm/.test(bn) ? 'farm' : /Hand|Finger/.test(bn) ? 'hand' : /Thigh|Pelvis/.test(bn) ? 'thigh' : /Calf/.test(bn) ? 'calf' : /Foot|Toe/.test(bn) ? 'foot' : null;
      if (k) add(k, r, g, b);
    }
  }
  const sk = avg('hand') || [0.4, 0.27, 0.18]; const tc = avg('top') || [0.1, 0.1, 0.1], bc = avg('thigh') || [0.1, 0.1, 0.1];
  const far = avg('farm') || tc, calf = avg('calf') || bc; const dS = (c) => Math.hypot(c[0] - sk[0], c[1] - sk[1], c[2] - sk[2]);
  let flags = 0; if (dS(far) > 0.05) flags |= 1; if (dS(calf) > 0.05) flags |= 2;
  const hc = avg('hair') || avg('scalp') || HAIR_P[1]; const H = zmax - zmin; const r3 = (c) => c.map((x) => +x.toFixed(4));
  return { fem: /female/i.test(name) ? 1 : 0, top: r3(tc), bot: r3(bc), skin: nearest(SKIN_P, sk), hairC: nearest(HAIR_P, hc), hair: /female/i.test(name) ? 2 : 1, flags, shoe: nearest(SHOE_P, avg('foot') || SHOE_P[1]), h: +(H > 1.3 && H < 2.1 ? H / 1.75 : 1).toFixed(3), w: 1, skinRGB: r3(sk), hairRGB: r3(hc) };
}
