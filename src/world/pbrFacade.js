// PBR façade + roof surfaces for the procedural buildings (gfx-materials). Injected into buildings.js shaders.
// Wall surfaces only: windows/frames/glass stay with the window shader. Writes col/rough and a world-space
// normal offset (fNrm). Weathering: splash-zone grime at the base, drip streaks under sills, runoff under
// cornices/parapets, large-scale tone drift. Needs PBR_GLSL + GH_GLSL (pbr.js) and FACADE_GLSL helpers (h21, uNoise).
export const FACADE_PBR_GLSL = /* glsl */`
vec3 fNrm = vec3(0.0);
// texture-space uv for walls: +u along the wall, image-up = world-up (t = -v)
PS wallTap(vec2 uvm, float size, float Lr, float seed) { return pbrTap(vec2(uvm.x, -uvm.y) / size + seed * vec2(3.17, 1.73), Lr); }
void wallPBR(int s, vec3 wallC, float u, float v, float seed, float topH, float edgeLen, float floorH, float bayW, float winW, float winH, float sill, float groundH, inout vec3 col, inout float rough) {
  vec3 N = normalize(vec3(vWNF.x, 0.0, vWNF.z));
  float dist = length(vWPosF - cameraPosition);
  float det = 1.0 - smoothstep(40.0, 160.0, dist);
  vec2 uvm = vec2(u, v);
  float Lr; float size; float tintK = 1.0;  // tintK: 1 = texture is pure detail on wallC, 0 = texture colour as-is
  if (s == 1) { Lr = L_BRICK; size = 3.0; tintK = 0.35; }
  else if (s == 0 || s == 9) { Lr = L_GRANITE; size = 0.45; }
  else if (s == 10) { Lr = L_BOARDCONC; size = 1.8; }
  else if (s == 3 || s == 4 || s == 8) { Lr = L_CONCRETE; size = 2.0; }
  else if (s == 5 || s == 11) { Lr = L_SIDING; size = 1.0; }
  else { Lr = L_STUCCO; size = 1.2; }
  vec3 mean = PBR_MEAN[int(Lr + 0.5)];
  PS t;
  if (s == 0 || s == 9) {
    // ashlar: 1.2 x 0.6 m staggered blocks (rusticated deeper below the ground-floor line), own stone crop per block
    float ch = v < groundH ? 0.6 : 0.6, cw = 1.2;
    float row = floor(v / ch); float ub = u / cw + mod(row, 2.0) * 0.5; float col0 = floor(ub);
    vec2 bf = vec2(fract(ub), fract(v / ch));
    t = wallTap(uvm, size, Lr, h21(vec2(col0, row) + seed));
    vec2 dj = min(bf, 1.0 - bf) * vec2(cw, ch); float jd = min(dj.x, dj.y);
    float jw = v < groundH ? 0.012 : 0.004;
    float fwj = max(fwidth(jd), 1e-5); float wwj = max(jw, fwj * 0.75); float jt = (1.0 - smoothstep(wwj - fwj * 0.5, wwj + fwj * 0.5, jd)) * (jw / wwj) * det;
    t.c *= (0.97 + 0.05 * h21(vec2(col0 + 5.0, row + seed))) * (1.0 - 0.18 * jt);
    vec2 gn = vec2(bf.x < 0.5 ? -1.0 : 1.0, bf.y < 0.5 ? -1.0 : 1.0) * vec2(step(dj.x, dj.y), step(dj.y, dj.x));
    float bv = (1.0 - smoothstep(jw, jw + (v < groundH ? 0.05 : 0.015), jd)) * det;
    t.g += vec2(gn.x, -gn.y) * bv * (v < groundH ? 0.9 : 0.5);   // g is in texture space (+v_tex = down)
  } else if (s == 3 || s == 8) {
    t = wallTap(uvm, size, Lr, seed);
    // formwork panels 2.4 x 1.2 m with tie-rod holes
    vec2 pf = fract(uvm / vec2(2.4, 1.2)); vec2 dp = min(pf, 1.0 - pf) * vec2(2.4, 1.2); float pj = min(dp.x, dp.y);
    t.c *= 1.0 - 0.18 * (1.0 - smoothstep(0.003, 0.003 + max(fwidth(pj) * 1.5, 0.003), pj)) * det;
    t.c *= 0.95 + 0.1 * h21(floor(uvm / vec2(2.4, 1.2)) + seed);
    vec2 th = fract(uvm / vec2(0.6, 0.6) + 0.5) - 0.5; float tr = length(th * 0.6);
    t.c *= 1.0 - 0.35 * (1.0 - smoothstep(0.012, 0.02, tr)) * det;
    if (s == 8) t.c *= mix(1.0, 0.86 + 0.14 * abs(sin(u * 31.4)), det);
  } else if (s == 11) {
    // cedar shingles: 0.32 m courses, random widths, wood grain from the siding set
    float sv = v / 0.32; float row = floor(sv); float su = u / 0.24 + h21(vec2(row, 1.0)); float ci = floor(su);
    t = wallTap(vec2(u * 0.6 + h21(vec2(ci, row)) * 3.0, v * 1.7), size, Lr, seed);
    t.c *= (0.72 + 0.4 * h21(vec2(ci, row))) * (0.72 + 0.28 * smoothstep(0.0, 0.18, fract(sv)));
    t.g.y += (1.0 - smoothstep(0.0, 0.12, fract(sv))) * 0.8 * det;
  } else {
    t = wallTap(uvm, size, Lr, seed);
  }
  // colour: texture detail around the building's own colour (keeps per-building OSM colours), brick keeps its own hue
  vec3 ratio = t.c / max(mean, vec3(1e-3));
  vec3 detailC = wallC * 0.86 * mix(vec3(dot(ratio, vec3(0.2126, 0.7152, 0.0722))), ratio, 0.35);
  vec3 ownC = t.c * mix(vec3(1.0), wallC / max(vec3(dot(wallC, vec3(0.333))), vec3(1e-3)), 0.25) * (0.8 + 0.4 * dot(wallC, vec3(0.333)));
  vec3 c = mix(ownC, detailC, tintK);
  // large-scale tone drift + faint rain streaks
  vec4 nz = texture(uNoise, uvm * vec2(0.05, 0.03) + seed * 7.0);
  float streak = 0.6 * texture(uNoise, vec2(u * 0.3, v * 0.02) + seed * 3.0).g + 0.4 * texture(uNoise, vec2(u * 0.113, v * 0.013) + seed * 5.0).g;  // ~0.2 m wide, metres long, non-repeating
  c *= 0.92 + 0.14 * nz.r;
  c *= 1.0 - 0.05 * smoothstep(0.55, 0.85, streak);
  // runoff under the top edge (parapet/cornice)
  float fromTop = topH - v;
  c *= 1.0 - 0.08 * (1.0 - smoothstep(0.3, 1.5 + 2.0 * streak, fromTop)) * smoothstep(0.45, 0.75, streak);
  // drip streaks below window sills (same bay/floor layout as the window shader)
  float nb = max(1.0, floor(edgeLen / bayW + 0.5)); float bw = edgeLen / nb;
  float st = 0.6 * texture(uNoise, vec2(u * 0.8, 0.37 + seed)).g + 0.4 * texture(uNoise, vec2(u * 0.29, 0.71 + seed)).g;
  if (edgeLen > 2.4 && v > groundH && det > 0.0) {
    float fi = 1.0 + floor((v - groundH) / floorH); float fv = fract((v - groundH) / floorH);
    float bi = floor(u / bw); float hx = abs(fract(u / bw) - 0.5) * bw; float hwx = winW * bw * 0.5;
    float y = fv * floorH, y0 = sill * floorH;
    float rnd = h21(vec2(bi + seed * 91.0, fi + seed * 17.0));
    bool win = !((s == 5 || s == 11 || s == 6) && rnd < 0.18) && !(s == 8 && rnd < 0.4);
    if (win && y < y0 && hx < hwx + 0.05) {
      float below = y0 - y;
      float drip = (1.0 - smoothstep(0.05, 0.5 + 1.1 * st, below)) * smoothstep(0.35, 0.7, st) * (1.0 - smoothstep(hwx - 0.1, hwx + 0.05, hx));
      c *= 1.0 - 0.12 * drip * det;
    }
  }
  // splash-zone grime at the foot of the wall (true height above the local ground)
  float hg = vWPosF.y - groundAt(vWPosF.xz);
  float gN = texture(uNoise, vec2(u * 0.35, 0.5) + seed).r;
  float grime = 1.0 - smoothstep(0.05, 0.45 + 0.7 * gN, hg);
  c = mix(c, c * vec3(0.62, 0.58, 0.52) + vec3(0.012, 0.010, 0.007), grime * 0.75);
  col = c;
  rough = clamp(mix(t.r, 0.97, grime * 0.5), 0.4, 1.0);
  // normal detail (fades with distance)
  vec2 uvT = vec2(uvm.x, -uvm.y);
  float nK = (s == 2 || s == 6 || s == 7) ? 0.45 : 0.9;  // stucco: gentle relief
  fNrm = (pbrPerturb(N, vWPosF, uvT, t.g, nK * (1.0 - smoothstep(30.0, 140.0, dist))) - N);
}
`;
// roof surfaces: t 0 flat membrane, 1 clay tile, 2 asphalt shingle, 3 metal/slate. Writes c (inout), fNrmR.
export const ROOF_PBR_GLSL = /* glsl */`
vec3 fNrmR = vec3(0.0); float fRoughR = -1.0;
void roofPBR(int t, vec2 uv, float seed, inout vec3 c) {
  float dist = length(vWPosR - cameraPosition);
  float det = 1.0 - smoothstep(40.0, 200.0, dist);
  vec3 base = c / 0.82;  // undo the procedural darkening (vertex roof colour)
  vec2 uvT; PS s;
  if (t == 1) {
    uvT = vec2(uv.x, -uv.y) / 4.0 + seed * vec2(5.1, 3.3);
    s = pbrTap(uvT, L_ROOFTILE);
    vec3 m = PBR_MEAN[int(L_ROOFTILE + 0.5)];
    vec3 hueB = base / max(dot(base, vec3(0.333)), 1e-3), hueM = m / dot(m, vec3(0.333));
    c = s.c * mix(vec3(1.0), hueB / hueM, 0.3);
    c *= 0.9 + 0.2 * texture(uNoise, uv * 0.05 + seed).r;
  } else if (t == 0) {
    uvT = uv / 4.04 + seed * 7.0;
    s = pbrTap(uvT, L_SIDEWALK);
    vec3 m = PBR_MEAN[int(L_SIDEWALK + 0.5)];
    c = base * 0.8 * mix(vec3(1.0), s.c / m, 0.8);
    c *= 0.86 + 0.24 * texture(uNoise, uv * 0.04 + seed).r;                       // membrane sheets / repairs
    c *= 1.0 - 0.18 * smoothstep(0.62, 0.85, texture(uNoise, uv * 0.11 + seed * 3.0).g); // ponding stains
  } else if (t == 2) {
    uvT = uv / 3.0 + seed * 4.0;
    s = pbrTap(uvT, L_ASPHALT);
    float bv = uv.y / 0.2; float row = floor(bv); float bu = uv.x / 0.34 + mod(row, 2.0) * 0.5;
    float tone = 0.85 + 0.25 * h21r(vec2(floor(bu), row)); float g = smoothstep(0.85, 1.0, fract(bv));
    c = base * 0.82 * tone * (1.0 - 0.3 * g * det) * (0.75 + 0.5 * s.c.g / 0.075);
    s.g.y -= g * 0.8;
  } else {
    return;
  }
  fRoughR = s.r;
  vec3 N = normalize(vNR);
  fNrmR = pbrPerturb(N, vWPosR, uvT, s.g, 0.9 * det) - N;
}
`;
