// Run from a scratch dir with @gltf-transform/core,extensions,functions + sharp installed; UBC/UAL zips from quaternius.itch.io (CC0) unpacked into /tmp/q.
// Builds public/assets/people/*.glb from Quaternius CC0 packs (Universal Base Characters + Universal Animation Library).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { prune, dedup, resample, unpartition } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'fs';
const UBC = '/tmp/q/Universal Base Characters[Standard]';
const UAL = '/tmp/q/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';
const OUT = '/work/ucb/app/public/assets/people';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const png = (p) => fs.readFileSync(p);
async function webpify(doc, sizes) {
  doc.createExtension(EXTTextureWebP).setRequired(true);
  for (const t of doc.getRoot().listTextures()) {
    const name = t.getURI() || t.getName(); const s = sizes(name);
    if (!s) continue;
    const buf = await sharp(Buffer.from(t.getImage())).resize(s, s).webp({ quality: /Normal/i.test(name) ? 88 : 82 }).toBuffer();
    t.setImage(new Uint8Array(buf)).setMimeType('image/webp').setURI(name.replace(/\.png$/i, '.webp'));
  }
}
// ---- bodies
for (const [tag, file, light] of [['female', 'Superhero_Female_FullBody', 'T_Superhero_Female_Light_BaseColor.png'], ['male', 'Superhero_Male_FullBody', 'T_Superhero_Male_Ligh.png']]) {
  const doc = await io.read(`${UBC}/Base Characters/Godot - UE/${file}.gltf`);
  for (const m of doc.getRoot().listMaterials()) {
    const n = m.getName();
    if (/Superhero/i.test(n)) { m.getBaseColorTexture().setImage(png(`${UBC}/Base Characters/Textures/${light}`)); m.setMetallicRoughnessTexture(null); m.setNormalTexture(null); m.setRoughnessFactor(0.62); m.setMetallicFactor(0); }
    if (/Hair/i.test(n)) { m.setMetallicRoughnessTexture(null); }
  }
  // drop extra uv/color sets the shader never reads
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) for (const s of p.listSemantics()) if (/TEXCOORD_[1-9]|COLOR_/.test(s)) p.setAttribute(s, null);
  await doc.transform(prune(), dedup());
  await webpify(doc, (n) => (/Eye/i.test(n) ? 128 : /Superhero.*(Base|Ligh|Dark)/i.test(n) ? 1024 : /Superhero.*Normal/i.test(n) ? 1024 : /Hair/i.test(n) ? 256 : 512));
  await io.write(`${OUT}/${tag}.glb`, doc);
  console.log(tag, fs.statSync(`${OUT}/${tag}.glb`).size);
}
// ---- hair (static, model space at the source body's rest pose)
if (!process.env.ONLYBODIES) {
  const docs = []; const names = ['Hair_Buns', 'Hair_BuzzedFemale', 'Hair_Long', 'Hair_Buzzed', 'Hair_SimpleParted', 'Hair_Beard', 'Eyebrows_Female', 'Eyebrows_Regular'];
  const doc = await io.read(`${UBC}/Hairstyles/Origin at 0/glTF (Godot)/${names[0]}.gltf`);
  const { mergeDocuments } = await import('@gltf-transform/functions');
  for (const n of names.slice(1)) { const d = await io.read(`${UBC}/Hairstyles/Origin at 0/glTF (Godot)/${n}.gltf`); mergeDocuments(doc, d); }
  // one scene holding every hair node
  const root = doc.getRoot(); const scenes = root.listScenes(); const s0 = scenes[0];
  for (const s of scenes.slice(1)) { for (const c of s.listChildren()) s0.addChild(c); s.dispose(); }
  for (const m of root.listMaterials()) m.setMetallicRoughnessTexture(null);
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) for (const s of p.listSemantics()) if (/TEXCOORD_[1-9]|COLOR_/.test(s)) p.setAttribute(s, null);
  await doc.transform(prune(), dedup());
  await doc.transform(unpartition());
  await webpify(doc, (n) => 256);
  await io.write(`${OUT}/hair.glb`, doc);
  console.log('hair', fs.statSync(`${OUT}/hair.glb`).size, root.listNodes().map((n) => n.getName()).join(','));
}
// ---- animations
if (!process.env.ONLYBODIES) {
  const doc = await io.read(UAL);
  const keep = new Set(['Idle_Loop', 'Idle_Talking_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Sitting_Enter', 'Sitting_Exit', 'Hit_Chest', 'Interact', 'PickUp_Table', 'Crouch_Idle_Loop', 'Dance_Loop', 'Push_Loop', 'Driving_Loop']);
  const root = doc.getRoot();
  for (const a of root.listAnimations()) {
    if (!keep.has(a.getName())) { a.dispose(); continue; }
    for (const ch of a.listChannels()) {
      const node = ch.getTargetNode(), path = ch.getTargetPath(), nm = node ? node.getName() : '';
      if (path === 'scale' || (path === 'translation' && nm !== 'pelvis')) { const s = ch.getSampler(); ch.dispose(); s.dispose(); }
    }
  }
  for (const m of root.listMeshes()) m.dispose();
  for (const n of root.listNodes()) { n.setMesh(null); n.setSkin(null); }
  for (const s of root.listSkins()) s.dispose();
  await doc.transform(resample({ tolerance: 2e-4 }), prune({ keepLeaves: true }), dedup());
  await io.write(`${OUT}/anims.glb`, doc);
  console.log('anims', fs.statSync(`${OUT}/anims.glb`).size, root.listAnimations().map((a) => a.getName()).join(','));
}
