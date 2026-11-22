// r4-people3: build the Microsoft Rocketbox near-LOD avatars (MIT licence, github.com/microsoft/Microsoft-Rocketbox)
// into public/assets/people/rb/<id>.glb + manifest.json.
// Per avatar: Export/<Name>.fbx (the 81-bone "hipoly" mesh, ~8.7k tris: body + head + hair/lash cards) is converted
// with FBX2glTF, the 2048^2 TGA textures are downsized to WebP (body/head colour, opacity cards with alpha, body
// normal), vertex colours are dropped, the facial bones stay (rest pose), and geometry is quantized + meshopt-packed.
// Run from a scratch dir that has @gltf-transform/{core,extensions,functions}, sharp, meshoptimizer installed, plus
// FBX2glTF (github.com/facebookincubator/FBX2glTF releases) and python3 Pillow (TGA -> PNG):
//   node people_rb_build.mjs Female_Adult_08 Male_Adult_12 ...   (env OUT, SRC, SIZES=body,head,opacity,normal)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { prune, dedup, quantize, weld, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
import { execFileSync } from 'child_process';
const OUT = process.env.OUT || '/work/ucb/app/public/assets/people/rb';
const SRC = process.env.SRC || '/tmp/rbx/src';
const RAW = 'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/Assets/Avatars/';
const [SB, SH, SO, SN] = (process.env.SIZES || '1024,1024,512,512').split(',').map(Number);
const tree = JSON.parse(fs.readFileSync(process.env.TREE || '/tmp/rbtree.json', 'utf8')).tree; // GitHub API tree listing (git/trees/master?recursive=1)
fs.mkdirSync(OUT, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptEncoder.ready;
const get = (url, dst) => { if (!fs.existsSync(dst)) execFileSync('curl', ['-fsS', '-o', dst, url]); return dst; };
const tga2png = (src, dst, size, alpha) => { execFileSync('python3', ['-c', `from PIL import Image; im=Image.open(${JSON.stringify(src)}); im=im.convert('${alpha ? 'RGBA' : 'RGB'}'); im.resize((${size},${size}), Image.LANCZOS).save(${JSON.stringify(dst)})`]); return dst; };
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
  doc.createExtension(EXTTextureWebP).setRequired(true);
  const webp = async (file, size, alpha, q) => { const png = tga2png(file, file.replace(/\.tga$/, `_${size}.png`), size, alpha); return new Uint8Array(await sharp(png).webp({ quality: q, alphaQuality: 90, effort: 6 }).toBuffer()); };
  const mkTex = async (key, file, size, alpha, q) => { if (!file) return null; const t = doc.createTexture(key).setImage(await webp(file, size, alpha, q)).setMimeType('image/webp').setURI(key + '.webp'); return t; };
  for (const t of root.listTextures()) t.dispose(); // FBX2glTF's 1x1 placeholders
  const tBody = await mkTex('body', T.body, SB, false, 82), tHead = await mkTex('head', T.head, SH, false, 86), tOp = await mkTex('opacity', T.opacity, SO, true, 85), tN = SN ? await mkTex('normal', T.normal, SN, false, 88) : null;
  for (const m of root.listMaterials()) {
    const n = m.getName(); m.setMetallicFactor(0).setRoughnessFactor(0.75).setEmissiveFactor([0, 0, 0]).setEmissiveTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setBaseColorFactor([1, 1, 1, 1]);
    if (/_body$/.test(n)) { m.setBaseColorTexture(tBody); if (tN) m.setNormalTexture(tN); m.setName('rb:body'); }
    else if (/_head$/.test(n)) { m.setBaseColorTexture(tHead); m.setNormalTexture(null); m.setName('rb:head'); }
    else if (/_opacity$/.test(n)) { m.setBaseColorTexture(tOp); m.setNormalTexture(null); m.setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true); m.setName('rb:hair'); }
  }
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
  const e = { id, name, sex: /female/i.test(name) ? 'f' : 'm', file: id + '.glb', tris, bytes: size };
  const i = manifest.avatars.findIndex((a) => a.id === id); if (i >= 0) manifest.avatars[i] = { ...manifest.avatars[i], ...e }; else manifest.avatars.push(e);
  console.log(id, tris, 'tris', (size / 1024).toFixed(0), 'KB');
}
fs.writeFileSync(OUT + '/manifest.json', JSON.stringify(manifest, null, 1));
