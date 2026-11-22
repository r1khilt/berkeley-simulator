// Run from a scratch dir with @gltf-transform/core,extensions,functions + sharp installed; UBC/UAL zips from quaternius.itch.io (CC0) unpacked into /tmp/q.
// Extract selected UAL clips into a compact custom file: [u32 jsonLen][json][pad to 4][f32 times...][i16 quats... / f32 vec3...]
import fs from 'fs';
const f = fs.readFileSync('/tmp/q/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb');
const jl = f.readUInt32LE(12); const J = JSON.parse(f.subarray(20, 20 + jl).toString());
const binOff = 20 + jl + 8; const bin = f.subarray(binOff);
const acc = (i) => { const a = J.accessors[i]; const bv = J.bufferViews[a.bufferView]; const n = a.count * { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type]; const o = (bv.byteOffset || 0) + (a.byteOffset || 0); return new Float32Array(bin.buffer.slice(bin.byteOffset + o, bin.byteOffset + o + n * 4)); };
const keep = (process.env.KEEP || 'Idle_Loop,Idle_Talking_Loop,Walk_Loop,Walk_Formal_Loop,Jog_Fwd_Loop,Sitting_Idle_Loop,Sitting_Talking_Loop,Sitting_Enter,Sitting_Exit,Hit_Chest,Interact,Crouch_Idle_Loop,Dance_Loop,Driving_Loop,PickUp_Table').split(',');
const clips = []; const times = []; const quats = []; const vecs = [];
let tCount = 0, qCount = 0, vCount = 0;
for (const a of J.animations) {
  if (!keep.includes(a.name)) continue;
  const clip = { name: a.name, tracks: [], duration: 0 };
  for (const ch of a.channels) {
    const node = J.nodes[ch.target.node].name, path = ch.target.path; if (path === 'scale') continue; if (path === 'translation' && node !== 'pelvis') continue;
    const s = a.samplers[ch.sampler]; let T = acc(s.input), V = acc(s.output); const W = path === 'rotation' ? 4 : 3;
    // drop keys that linear interpolation of neighbours reproduces (tolerance)
    const keepK = [0]; for (let k = 1; k < T.length - 1; k++) { const p = keepK[keepK.length - 1]; let err = 0; const u = (T[k] - T[p]) / (T[k + 1] - T[p]); for (let c = 0; c < W; c++) { const lin = V[p * W + c] + (V[(k + 1) * W + c] - V[p * W + c]) * u; err = Math.max(err, Math.abs(lin - V[k * W + c])); } if (err > (W === 4 ? 6e-4 : 1e-3)) keepK.push(k); } if (T.length > 1) keepK.push(T.length - 1);
    const n = keepK.length; clip.duration = Math.max(clip.duration, T[T.length - 1]);
    const tr = { b: node, p: path === 'rotation' ? 'q' : 'v', n, t: tCount, o: W === 4 ? qCount : vCount };
    for (const k of keepK) times.push(T[k]); tCount += n;
    if (W === 4) { for (const k of keepK) { let q = [V[k * 4], V[k * 4 + 1], V[k * 4 + 2], V[k * 4 + 3]]; for (const c of q) quats.push(Math.round(c * 32767)); } qCount += n * 4; }
    else { for (const k of keepK) for (let c = 0; c < 3; c++) vecs.push(V[k * 3 + c]); vCount += n * 3; }
    clip.tracks.push(tr);
  }
  clips.push(clip);
}
const head = Buffer.from(JSON.stringify({ clips, nt: tCount, nq: qCount, nv: vCount }));
const pad = (4 - ((4 + head.length) % 4)) % 4;
const out = Buffer.concat([Buffer.from(new Uint32Array([head.length + pad]).buffer), head, Buffer.alloc(pad, 32), Buffer.from(new Float32Array(times).buffer), Buffer.from(new Float32Array(vecs).buffer), Buffer.from(new Int16Array(quats).buffer)]);
fs.writeFileSync('/work/ucb/app/public/assets/people/anims.bin', out);
console.log('anims.bin', out.length, clips.map((c) => c.name + ':' + c.duration.toFixed(2)).join(' '));
