// r4-people3: pack a few Microsoft Rocketbox mocap clips (MIT, github.com/microsoft/Microsoft-Rocketbox
// Assets/Animations, same 3ds Max Biped rig as the avatars, so no retargeting) into public/assets/people/rb/anims.bin,
// same layout as tools/people_anims.mjs: [u32 jsonLen][json][f32 times][f32 vec3][i16 quats].
// Only bone rotations are kept (+ the Bip01 hip translation, horizontal drift removed); every Biped shares the bone
// axes, so local rotations transfer between avatars; the hips are rescaled per avatar by leg length at load.
// Needs FBX2glTF at /tmp/rbx/FBX2glTF. Run with plain node (no deps).
import fs from 'fs';
import { execFileSync } from 'child_process';
const RAW = 'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/Assets/Animations/';
const OUT = process.env.OUT || '/work/ucb/app/public/assets/people/rb/anims.bin';
const TMP = '/tmp/rbanim'; fs.mkdirSync(TMP, { recursive: true });
// role (the clip name character.js plays) -> source take per sex
const ROLES = {
  Walk_Loop: { m: 'xy/m_walk_neutral_01', f: 'xy/f_walk_neutral_01' },
  Walk_Formal_Loop: { m: 'xy/m_walk_neutral_02', f: 'xy/f_walk_neutral_02' },
  Jog_Fwd_Loop: { m: 'xy/m_run_slow_01', f: 'xy/f_run_slow_01' },
  Idle_Loop: { m: 'static/m_idle_neutral_01', f: 'static/f_idle_neutral_01' },
  Idle_Talking_Loop: { m: 'static/m_gestic_talk_neutral_01', f: 'static/f_gestic_talk_neutral_01' },
};
const san = (n) => n.replace(/\s/g, '_').replace(/[\[\]\.:\/]/g, '');
const SKIP = /Footsteps|Eye|Jaw|Lip|Tongue|Mouth|Masseter|Caninus|Cheek|Brow|Nose|Upperlip|Nub|Ponytail/;
const clips = [], times = [], vecs = [], quats = []; let tC = 0, qC = 0, vC = 0;
for (const [role, per] of Object.entries(ROLES)) for (const [sex, src] of Object.entries(per)) {
  const [dir, base] = src.split('/'); const fbx = `${TMP}/${base}.fbx`;
  if (!fs.existsSync(fbx)) execFileSync('curl', ['-fsS', '-o', fbx, `${RAW}all_animations_max_motextr_${dir}/${base}.max.fbx`]);
  if (!fs.existsSync(`${TMP}/${base}.glb`)) execFileSync('/tmp/rbx/FBX2glTF', ['--binary', '--input', fbx, '--output', `${TMP}/${base}`], { stdio: 'ignore' });
  const f = fs.readFileSync(`${TMP}/${base}.glb`); const jl = f.readUInt32LE(12); const J = JSON.parse(f.subarray(20, 20 + jl).toString()); const bin = f.subarray(20 + jl + 8);
  const acc = (i) => { const a = J.accessors[i]; const bv = J.bufferViews[a.bufferView]; const n = a.count * { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type]; const o = (bv.byteOffset || 0) + (a.byteOffset || 0); return new Float32Array(bin.buffer.slice(bin.byteOffset + o, bin.byteOffset + o + n * 4)); };
  const node = (n) => J.nodes.find((x) => x.name === n); const len = (n) => Math.hypot(...(node(n).translation || [0, 0, 0]));
  const leg = len('Bip01 L Calf') + len('Bip01 L Foot');
  const A = J.animations[0]; const clip = { name: `${sex}:${role}`, duration: 0, leg: +leg.toFixed(4), tracks: [] };
  for (const ch of A.channels) {
    const nm = J.nodes[ch.target.node].name; const path = ch.target.path; if (SKIP.test(nm)) continue;
    if (path === 'scale' || (path === 'translation' && nm !== 'Bip01')) continue;
    const s = A.samplers[ch.sampler]; const T = acc(s.input), V = acc(s.output); const W = path === 'rotation' ? 4 : 3; const n = T.length;
    clip.duration = Math.max(clip.duration, T[n - 1]);
    if (W === 3) { // hips: keep the bob and sway, drop the forward drift (linear fit) so the clip stays in place
      const m = [0, 1, 2].map((c) => { let a = 0; for (let k = 0; k < n; k++) a += V[k * 3 + c]; return a / n; });
      for (let k = 0; k < n; k++) { V[k * 3] = V[k * 3] - m[0]; V[k * 3 + 2] = V[k * 3 + 2] - m[2]; } }
    // drop keys that linear interpolation of their neighbours reproduces (mocap is dense: 24 fps on every bone)
    const tolQ = /Finger/.test(nm) ? 4e-3 : 1.2e-3, tolV = 1.5e-3; const keepK = [0];
    for (let k = 1; k < n - 1; k++) { const p = keepK[keepK.length - 1]; const u = (T[k] - T[p]) / (T[k + 1] - T[p]); let err = 0; for (let c = 0; c < W; c++) { const lin = V[p * W + c] + (V[(k + 1) * W + c] - V[p * W + c]) * u; err = Math.max(err, Math.abs(lin - V[k * W + c])); } if (err > (W === 4 ? tolQ : tolV)) keepK.push(k); }
    if (n > 1) keepK.push(n - 1);
    const tr = { b: san(nm), p: W === 4 ? 'q' : 'v', n: keepK.length, t: tC, o: W === 4 ? qC : vC };
    for (const k of keepK) times.push(T[k]); tC += keepK.length;
    if (W === 4) { for (const k of keepK) { const d = V[k * 4] * V[keepK[0] * 4] >= 0 ? 1 : 1; for (let c = 0; c < 4; c++) quats.push(Math.round(V[k * 4 + c] * 32767 * d)); } qC += keepK.length * 4; } else { for (const k of keepK) for (let c = 0; c < 3; c++) vecs.push(V[k * 3 + c]); vC += keepK.length * 3; }
    clip.tracks.push(tr);
  }
  clips.push(clip); console.log(clip.name, base, clip.duration.toFixed(2) + 's', clip.tracks.length, 'tracks, leg', clip.leg);
}
const head = Buffer.from(JSON.stringify({ clips, nt: tC, nq: qC, nv: vC }));
const pad = (4 - ((4 + head.length) % 4)) % 4;
const out = Buffer.concat([Buffer.from(new Uint32Array([head.length + pad]).buffer), head, Buffer.alloc(pad, 32), Buffer.from(new Float32Array(times).buffer), Buffer.from(new Float32Array(vecs).buffer), Buffer.from(new Int16Array(quats).buffer)]);
fs.writeFileSync(OUT, out); console.log('anims.bin', out.length);
