// PBR ground shading for CoreTerrain (gfx-materials). Same inputs/outputs as groundShade() in terrain.js:
// writes gCol (linear albedo), gRough, gBumpN (world-space normal offset), gAO, gEmis.
// Real CC0 texture sets (see pbr.js) for asphalt, concrete sidewalks, granite and brick pavers, lawn, dry grass, leaf
// litter and dirt; macro variation + rotated second taps so nothing visibly repeats; procedural decals for slab joints,
// expansion joints, kerbs, gutters, cracks, sealant, utility patches, oil and gum stains.
export const GROUND_PBR_GLSL = /* glsl */`
float hq12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 cityGrid(vec2 w) { return vec2(0.98776 * w.x + 0.15600 * w.y, -0.15600 * w.x + 0.98776 * w.y); } // Berkeley grid ~9 deg off north
PS pbrFarPS(float Lr) { PS s; s.c = PBR_MEAN[int(Lr + 0.5)]; s.r = 0.93; s.g = vec2(0.0); s.h = 0.5; return s; }
// ground tap: world xz -> uv = w/size (+u east, +v south); g returned in world xz
PS gTap(vec2 w, float size, float Lr, float k, float near) {
  if (near <= 0.0) return pbrFarPS(Lr);
  PS s = pbrIso(w, size, Lr, k);
  if (near < 1.0) { PS f = pbrFarPS(Lr); s.c = mix(f.c, s.c, near); s.g *= near; }
  return s;
}
// structured (pavers/brick): no rotation; per-cell uv offset is applied by the caller
PS gTapS(vec2 uv, float Lr, float near) {
  if (near <= 0.0) return pbrFarPS(Lr);
  PS s = pbrTap(uv, Lr);
  if (near < 1.0) { PS f = pbrFarPS(Lr); s.c = mix(f.c, s.c, near); s.g *= near; }
  return s;
}
// r4-ground: geometric (heightfield) normal, unnormalised with y = 2 like the lighting normal; set by terrain.js
// before groundShade*(). Used for slope-aware texturing so banks and berms are not stretched/striped.
vec3 gGeoNr = vec3(0.0, 2.0, 0.0);
// slope-aware tap for natural surfaces: blends in side projections (x-facing / z-facing) on steep ground
PS gTapT(vec2 w, vec3 wp, float sc, float size, float Lr, float k, float near) {
  PS s = gTap(w * sc, size, Lr, k, near);
  vec3 nn = normalize(gGeoNr);
  float st = smoothstep(0.92, 0.74, nn.y);                 // ~23 deg .. ~42 deg
  if (st <= 0.0 || near <= 0.0) return s;
  vec2 a = nn.xz * nn.xz + 1e-5; a /= (a.x + a.y);
  vec3 c = vec3(0.0); float r = 0.0, h = 0.0, ws = 0.0;
  if (a.x > 0.08) { PS t = gTap(vec2(wp.z, -wp.y) * sc, size, Lr, k, near); c += t.c * a.x; r += t.r * a.x; h += t.h * a.x; ws += a.x; }
  if (a.y > 0.08) { PS t = gTap(vec2(wp.x, -wp.y) * sc, size, Lr, k, near); c += t.c * a.y; r += t.r * a.y; h += t.h * a.y; ws += a.y; }
  s.c = mix(s.c, c / ws, st); s.r = mix(s.r, r / ws, st); s.h = mix(s.h, h / ws, st); s.g *= 1.0 - st;
  return s;
}
// anti-aliased thin line from a signed distance-like value d (units of its own gradient)
float aaLine(float d, float wdt) { float fw = max(fwidth(d), 1e-5); float ww = max(wdt, fw * 0.75); return (1.0 - smoothstep(ww - fw * 0.5, ww + fw * 0.5, abs(d))) * (wdt / ww); }
// joint mask from distance-to-joint jd (metres) and half-width jw: sub-pixel joints get wider but fainter instead of dashed
float jointAA(float jd, float jw) { float fw = max(fwidth(jd), 1e-5); float ww = max(jw, fw * 0.75); return (1.0 - smoothstep(ww - fw * 0.5, ww + fw * 0.5, jd)) * (jw / ww); }

void groundShadePBR(vec2 w, float dist) {
  vec4 s = texture(uSdf, (w - uGround.xy) / uGround.zw);
  vec2 ax = texture(uAux, (w - uAuxRect.xy) / uAuxRect.zw).rg;
  vec4 n0 = texture(uNoise, w * 0.013); vec4 n1 = texture(uNoise, w * 0.071); vec4 n2 = texture(uNoise, w * 0.37);
  float sp = floor(texture(uSpecial, (w + (vec2(n2.r, n1.g) - 0.5) * 1.4 - uGround.xy) / uGround.zw).r * 255.0 + 0.5);
  float fade = clamp(dist / 120.0, 0.0, 1.0);
  float near = 1.0 - (uPbrHQ > 0.5 ? smoothstep(180.0, 280.0, dist) : smoothstep(110.0, 170.0, dist));
  float det = 1.0 - smoothstep(25.0, 90.0, dist);         // small decals (joints, cracks, gum)
  float edgeN = (n1.g - 0.5) * 0.9 + (n2.b - 0.5) * 0.35;
  float dA = (s.r - 0.5) * 6.0, dP = (s.g - 0.5) * 6.0, dG = (s.b - 0.5) * 6.0, dD = (s.a - 0.5) * 6.0;
  // r4-ground: maintained beds (special id 8) get a crisp, clean edge; natural areas keep the organic wobble
  float bedK = step(abs(sp - 8.0), 0.5);
  vec3 gWP = vec3(w.x, vWPos.y, w.y);
  float mA = aaStep(dA + 0.05), mP = aaStep(dP + 0.05 + (n2.b - 0.5) * 0.06), mG = aaStep(dG + edgeN * 0.7 * (1.0 - bedK)), mD = aaStep(dD + mix(edgeN, (n2.b - 0.5) * 0.05, bedK));
  float lush = ax.r, ao = ax.g;
  float kIso = n1.r;
  // final layer weights (same stacking order as the procedural shader: natural < lawn < dirt < pavement < asphalt)
  float wA = mA, wP = mP * (1.0 - mA), wD = mD * (1.0 - mP) * (1.0 - mA), wG = mG * (1.0 - mD) * (1.0 - mP) * (1.0 - mA);
  float wN = max(0.0, 1.0 - wA - wP - wD - wG);
  vec3 col = vec3(0.0); float rough = 0.0; vec2 g = vec2(0.0); float bump = 0.0;
  vec2 gq = cityGrid(w);

  // ---- natural ground: dry golden November grass, greener where irrigated / lush
  if (wN > 0.001) {
    float kl = smoothstep(0.25, 0.85, lush + (n1.g - 0.5) * 0.25);
    PS d = gTapT(w, gWP, 1.0, 2.0, L_DRYGRASS, kIso, near);
    if (kl > 0.01) { PS l = gTapT(w, gWP, 1.03, 2.0, L_LAWN, 1.0 - kIso, near); d = pbrMix(d, l, smoothstep(0.0, 1.0, kl + (l.h - d.h) * 0.3)); }
    d.c *= 0.86 + 0.28 * n0.g;
    col += wN * d.c; rough += wN * mix(d.r, 0.97, 0.5); g += wN * d.g * 0.9; bump += wN;
  }
  // ---- lawn: irrigated turf with dry patches and faint mowing stripes
  if (wG > 0.001) {
    PS l = gTapT(w, gWP, 1.0, 2.0, L_LAWN, kIso, near);
    // r4-ground: late-November irrigated lawn: only broad, soft dry areas. The old height-driven term stamped the 2 m
    // dry-grass texture pattern as repeated brown blotches wherever lushness was low (most re-labelled lawn).
    float dryP = smoothstep(0.62, 0.9, n0.r + (n1.b - 0.5) * 0.2) * 0.3 + smoothstep(0.75, 1.0, 1.0 - lush) * 0.12 * n0.g;
    if (dryP > 0.02) { PS d = gTapT(w, gWP, 0.97, 2.0, L_DRYGRASS, 1.0 - kIso, near); l = pbrMix(l, d, clamp(dryP * (1.0 + (d.h - l.h) * 1.2), 0.0, 1.0)); }
    l.c *= (0.84 + 0.3 * n0.g) * (0.9 + 0.2 * n2.r);   // r4-ground: + ~0.7 m clumping so mid-distance turf isn't a flat carpet
    float mow = step(0.5, fract(dot(w, vec2(0.7071, 0.7071)) / 5.0)); l.c *= mix(1.0, 0.95 + 0.1 * mow, (1.0 - fade) * 0.7);
    // r4-ground: crisp edges. A thin spade-cut line where lawn meets a planted bed and a faint shadow line along paving
    float cut = bedK * (1.0 - smoothstep(0.04, 0.12, -dD)) * step(dD, 0.0) * det;
    float pe = (1.0 - smoothstep(0.06, 0.16, -dP)) * step(dP, 0.0) * det;
    l.c *= (1.0 - 0.65 * cut) * (1.0 - 0.22 * pe);
    col += wG * l.c; rough += wG * l.r; g += wG * l.g; bump += wG;
  }
  // ---- forest floor / dirt: eucalyptus + oak litter over packed dirt
  if (wD > 0.001) {
    PS a;
    if (bedK > 0.5) {
      // r4-ground: maintained planting bed = dense low evergreen groundcover (ivy / star jasmine) with dark bark mulch
      // showing in the gaps and along a clean cut edge, instead of bare brown dirt
      PS mu = gTapT(w, gWP, 1.0, 3.0, L_LITTER, kIso, near);
      float lmu = dot(mu.c, vec3(0.2126, 0.7152, 0.0722));
      mu.c = mix(vec3(lmu), mu.c, 0.45) * vec3(0.95, 0.72, 0.55) * 0.62;          // darker, redder, flatter bark mulch
      mu.c = mix(vec3(0.05, 0.032, 0.022), mu.c, 0.55);
      PS gc = gTapT(w, gWP, 0.33, 2.0, L_LAWN, 1.0 - kIso, near);                  // leafy set at 3x scale -> broad leaves
      vec3 gm = vec3(0.0743, 0.1139, 0.0376);
      // dark, glossy, high-contrast ivy so a bed never reads as a darker (or worn) patch of lawn
      gc.c = gm * pow(clamp(gc.c / gm, 0.0, 3.0), vec3(2.0)) * vec3(0.4, 0.52, 0.42) * (0.8 + 0.35 * n1.r);
      gc.r = mix(gc.r, 0.55, 0.6);
      float cov = n1.g * 0.45 + n2.r * 0.35 + n0.g * 0.2 + (gc.h - mu.h) * 0.25;
      float kc = smoothstep(0.2, 0.28, cov) * smoothstep(0.05, 0.35, dD);          // ~95 % cover; clean mulch strip at the edge
      mu.c *= 0.75 + 0.25 * (1.0 - smoothstep(0.2, 0.32, cov));                    // gaps sit in the plants' shade
      a = pbrMix(mu, gc, kc);
      a.c *= 0.92 + 0.16 * n0.b;
    } else {
      a = gTapT(w, gWP, 1.0, 3.0, L_LITTER, kIso, near);
      float kd = smoothstep(0.5, 0.7, n1.g + (n2.r - 0.5) * 0.3);
      if (kd > 0.01) { PS b = gTapT(w, gWP, 1.01, 3.0, L_DIRT, 1.0 - kIso, near); b.c = mix(vec3(dot(b.c, vec3(0.2126, 0.7152, 0.0722))), b.c, 0.75); a = pbrMix(a, b, clamp(kd + (b.h - a.h) * 0.5, 0.0, 1.0)); }
      a.c *= 0.85 + 0.3 * n0.b;
    }
    col += wD * a.c; rough += wD * a.r; g += wD * a.g; bump += wD;
  }
  // ---- pavement
  if (wP > 0.001) {
    PS p; float jointDark = 0.0;
    if (sp > 3.5 && sp < 4.5) { // brick pavers (running bond, laid on the city grid)
      vec2 uv = gq / vec2(3.0, 2.0);  // 3 m texture -> pavers ~2:1 instead of wall-brick 3:1
      vec2 reg = floor(gq / 9.0);
      p = gTapS(uv + vec2(hq12(reg), hq12(reg + 3.1)), L_BRICK, near);
      p.g = vec2(0.98776 * p.g.x - 0.15600 * p.g.y, 0.15600 * p.g.x + 0.98776 * p.g.y) * vec2(1.0, 1.5);
      p.c = mix(vec3(dot(p.c, vec3(0.2126, 0.7152, 0.0722))), p.c, 0.6) * vec3(1.05, 0.95, 0.95) * (0.85 + 0.3 * n1.r) * (0.9 + 0.2 * hq12(reg + 7.0));
      p.r = mix(p.r, 0.9, 0.3);
    } else if (sp > 4.5 && sp < 5.5) { // granite pavers: 0.9 m squares, each with its own crop of the stone and tone
      vec2 cq = gq / 0.9; vec2 ci = floor(cq), cf = fract(cq);
      p = gTapS(gq / 0.45 + vec2(hq12(ci), hq12(ci + 5.3)) * 3.0, L_GRANITE, near);
      p.g = vec2(0.98776 * p.g.x - 0.15600 * p.g.y, 0.15600 * p.g.x + 0.98776 * p.g.y);
      p.c *= 0.88 + 0.2 * hq12(ci + 9.1);
      float jd = min(min(cf.x, 1.0 - cf.x), min(cf.y, 1.0 - cf.y)) * 0.9;  // metres to the joint
      float jt = jointAA(jd, 0.004) * det;
      jointDark = jt; p.r = mix(p.r, 0.95, jt);
      // slight edge bevel
      float bv = (1.0 - smoothstep(0.004, 0.02, jd)) * det;
      vec2 gn = vec2(cf.x < 0.5 ? -1.0 : 1.0, cf.y < 0.5 ? -1.0 : 1.0) * vec2(step(min(cf.x, 1.0 - cf.x), min(cf.y, 1.0 - cf.y)), step(min(cf.y, 1.0 - cf.y), min(cf.x, 1.0 - cf.x)));
      p.g += vec2(0.98776 * gn.x - 0.15600 * gn.y, 0.15600 * gn.x + 0.98776 * gn.y) * bv * 0.6;
      p.c *= 1.0 - 0.32 * jt;
    } else if (sp > 8.5 && sp < 9.5) { // [r5-sproul] Lower Sproul (CMG 2015): "barcode" concrete bands across the plaza (cream/tan
      // field in the middle, greys along MLK and Zellerbach), thin dark dividers, scored joints, two charcoal diagonals (cf. terrain.js)
      vec2 rel = w - vec2(-208.0, 325.0); float pc = dot(rel, vec2(0.988, -0.156)), pa = dot(rel, vec2(0.156, 0.988));
      vec2 ci = floor(vec2(pc / 1.2, pa / 2.4));
      p = gTap(vec2(pc, pa) + vec2(hq12(ci), hq12(ci + 2.7)) * 4.0, 4.04, L_SIDEWALK, kIso, near);
      float bh = hq12(vec2(floor(pa / 2.4), 4.1)), warm = 1.0 - smoothstep(7.5, 9.5, abs(pc));
      vec3 tw = bh < 0.4 ? vec3(1.24, 1.15, 0.96) : (bh < 0.75 ? vec3(1.12, 0.9, 0.6) : vec3(0.98, 0.97, 0.94));
      vec3 tg = bh < 0.35 ? vec3(1.0, 0.99, 0.96) : (bh < 0.7 ? vec3(0.78, 0.78, 0.78) : (bh < 0.86 ? vec3(1.22, 1.14, 0.96) : vec3(0.52, 0.52, 0.53)));
      p.c *= mix(tg, tw, warm) * (0.94 + 0.1 * hq12(ci + 1.3));
      float fa = fract(pa / 2.4) * 2.4, fc = fract(pc / 7.2) * 7.2, fj = fract(pc / 1.2) * 1.2;
      float dv = max(jointAA(min(fa, 2.4 - fa), 0.07), jointAA(min(fc, 7.2 - fc), 0.06)) * mix(0.75, 1.0, det);
      float jt = jointAA(min(fj, 1.2 - fj), 0.004) * det; jointDark = jt;
      float dd = dot(rel, vec2(0.934, 0.359)); float dg = max(jointAA(abs(dd), 0.3), jointAA(abs(dd + 22.0), 0.3));
      p.c *= 1.0 - 0.35 * jt;
      p.c = mix(p.c, vec3(0.12, 0.125, 0.13) * (0.9 + 0.2 * n1.r), dv);
      p.c = mix(p.c, vec3(0.07, 0.072, 0.075) * (0.9 + 0.2 * n1.r), dg); p.r = mix(p.r, 0.8, dg);
    } else if (sp > 9.5 && sp < 10.5) { // [r5-sproul] Upper Sproul: clay brick pavers inside a grid of 0.35 m light concrete bands
      // at 45 deg to the plaza axis, ~7 m modules (cf. terrain.js)
      vec2 rel = w - vec2(-140.0, 280.0); float pa = dot(rel, vec2(0.14, 0.99)), pc = dot(rel, vec2(0.99, -0.14));
      vec2 bq = vec2(pc, pa); vec2 reg = floor(bq / 9.0);
      p = gTapS(bq / vec2(3.0, 2.0) + vec2(hq12(reg), hq12(reg + 3.1)), L_BRICK, near);
      p.c = mix(vec3(dot(p.c, vec3(0.2126, 0.7152, 0.0722))), p.c, 0.62) * vec3(1.0, 0.9, 0.88) * 0.9 * (0.85 + 0.3 * n1.r) * (0.9 + 0.2 * hq12(reg + 7.0)); // weathered red-brown, not salmon
      { PS bf = pbrFarPS(L_BRICK); bf.c = mix(vec3(dot(bf.c, vec3(0.2126, 0.7152, 0.0722))), bf.c, 0.62) * vec3(1.0, 0.9, 0.88) * 0.9; p.c = mix(bf.c, p.c, 0.45 + 0.55 * det); } // calm the far field (moire)
      p.r = mix(p.r, 0.9, 0.3);
      float d1 = (pa + pc) * 0.7071, d2 = (pa - pc) * 0.7071; float f1 = fract(d1 / 7.0) * 7.0, f2 = fract(d2 / 7.0) * 7.0;
      float band = max(jointAA(min(f1, 7.0 - f1), 0.175), jointAA(min(f2, 7.0 - f2), 0.175));
      PS cb = gTap(w + 3.3, 4.04, L_SIDEWALK, kIso, near); cb.c *= vec3(1.05, 1.02, 0.97);
      p = pbrMix(p, cb, band);
    } else { // poured concrete sidewalk: 1.52 m scored slabs on the city grid, expansion joints every 4th line
      vec2 cq = gq / 1.52; vec2 ci = floor(cq), cf = fract(cq);
      p = gTap(gq + vec2(hq12(ci), hq12(ci + 2.7)) * 4.0, 4.04, L_SIDEWALK, kIso, near);
      p.g = vec2(0.98776 * p.g.x - 0.15600 * p.g.y, 0.15600 * p.g.x + 0.98776 * p.g.y);
      float tone = 0.9 + 0.16 * hq12(ci + 1.3) + 0.08 * (n0.g - 0.5);
      p.c *= tone * vec3(1.0, 0.995, 0.985);
      vec2 dj = min(cf, 1.0 - cf) * 1.52;                     // metres to the scored lines
      float jd = min(dj.x, dj.y);
      float exp4 = step(mod(ci.x + (cf.x > 0.5 ? 1.0 : 0.0), 4.0), 0.5) * step(dj.x, dj.y) + step(mod(ci.y + (cf.y > 0.5 ? 1.0 : 0.0), 4.0), 0.5) * step(dj.y, dj.x);
      float jwid = mix(0.004, 0.009, clamp(exp4, 0.0, 1.0));
      float jt = jointAA(jd, jwid) * det;
      float jdirt = (1.0 - smoothstep(0.0, 0.06, jd)) * 0.12 * det;  // grime collects along joints
      jointDark = jt;
      p.c *= (1.0 - 0.38 * jt) * (1.0 - jdirt);
      // groove normal (both sides of the joint slope into it)
      vec2 gn = vec2(cf.x < 0.5 ? 1.0 : -1.0, cf.y < 0.5 ? 1.0 : -1.0) * vec2(step(dj.x, dj.y), step(dj.y, dj.x));
      p.g -= vec2(0.98776 * gn.x - 0.15600 * gn.y, 0.15600 * gn.x + 0.98776 * gn.y) * (1.0 - smoothstep(jwid, jwid + 0.01, jd)) * 0.5 * det;
      // the odd cracked slab
      float hc = hq12(ci + 4.4);
      if (hc > 0.86) { float cl = dot(cf - 0.5, normalize(vec2(hq12(ci + 8.0) - 0.5, 0.5))) + (texture(uNoise, w * 0.9).g - 0.5) * 0.12; p.c *= 1.0 - 0.45 * aaLine(cl, 0.002) * det; }
      // gum spots and drip stains (Telegraph classics)
      vec2 gc = w * 3.0; vec2 gi = floor(gc); float hg = hq12(gi + 0.7);
      if (hg > 0.965) { float gr = length(fract(gc) - 0.5 - (vec2(hq12(gi + 1.0), hq12(gi + 2.0)) - 0.5) * 0.4); p.c *= 1.0 - 0.35 * (1.0 - smoothstep(0.035, 0.06, gr)) * det; p.r = mix(p.r, 0.7, (1.0 - smoothstep(0.035, 0.06, gr)) * det); }
      p.c *= 1.0 - 0.1 * smoothstep(0.6, 0.85, n0.b) * (0.5 + 0.5 * n1.b);
    }
    col += wP * p.c; rough += wP * p.r; g += wP * p.g; bump += wP;
  }
  // ---- asphalt
  if (wA > 0.001) {
    PS a = gTap(w, 3.0, L_ASPHALT, kIso, near);
    float age = smoothstep(0.25, 0.8, n0.r);                     // weathered grey (old) vs dark (recent overlay)
    a.c *= mix(0.85, 1.2, age) * (0.92 + 0.16 * n1.g);
    // utility-cut patches: rectangles on the city grid, darker & smoother with a tar seam
    vec2 pc = gq / vec2(11.0, 7.0); vec2 pi = floor(pc), pf = fract(pc);
    if (hq12(pi + 17.0) > 0.7) {
      vec2 r0 = vec2(0.1, 0.15) + vec2(hq12(pi + 3.0), hq12(pi + 5.0)) * vec2(0.4, 0.35);
      vec2 r1 = r0 + vec2(0.15, 0.2) + vec2(hq12(pi + 7.0), hq12(pi + 9.0)) * vec2(0.3, 0.3);
      vec2 dd = min(pf - r0, r1 - pf) * vec2(11.0, 7.0); float din = min(dd.x, dd.y);
      float inR = smoothstep(-0.01, 0.01, din);
      a.c = mix(a.c, a.c * 0.68, inR * (0.6 + 0.4 * hq12(pi + 11.0))); a.r = mix(a.r, 0.82, inR);
      float seam = (1.0 - smoothstep(0.02, 0.05, abs(din))) * det; a.c = mix(a.c, vec3(0.018), seam * 0.85); a.r = mix(a.r, 0.45, seam);
    }
    // crack network (two scales of noise iso-lines) in the older surface, plus black sealant "tar snakes"
    vec2 wr = vec2(0.8 * w.x - 0.6 * w.y, 0.6 * w.x + 0.8 * w.y);
    float c1 = 0.6 * (texture(uNoise, wr * 0.061).g - 0.5) + 0.4 * (texture(uNoise, w * 0.0437 + 0.21).g - 0.5), c2 = texture(uNoise, wr * 0.157 + 0.37).g - 0.5;
    float crk = max(aaLine(c1, 0.0015), aaLine(c2, 0.002) * 0.7) * age * det;
    float seal = (1.0 - smoothstep(0.006, 0.011, abs(c1))) * step(0.62, n1.r) * (1.0 - fade);
    a.c *= 1.0 - 0.55 * crk; a.c = mix(a.c, vec3(0.016, 0.016, 0.017), seal * 0.9); a.r = mix(a.r, 0.38, seal);
    // oil drips and tyre polish (large blotches: reuse the macro noise instead of another fetch)
    float oil = smoothstep(0.66, 0.86, n0.b) * (0.4 + 0.6 * n2.g);
    a.c *= 1.0 - 0.35 * oil; a.r = mix(a.r, 0.6, oil * 0.6);
    // gutter: darker, dirtier band along the kerb where pavement meets the road
    float gut = aaStep(dA) * (1.0 - smoothstep(0.0, 0.5, dA)) * smoothstep(-1.0, -0.2, dP);
    a.c = mix(a.c, a.c * 0.7 + vec3(0.01, 0.009, 0.007), gut * 0.8);
    col += wA * a.c; rough += wA * a.r; g += wA * a.g * 1.2; bump += wA;
  }
  // kerb: concrete band just outside the asphalt where there is pavement
  float curb = (1.0 - aaStep(dA)) * aaStep(dA + 0.28) * mP;
  if (curb > 0.001) {
    PS k = gTap(w * 1.1, 4.04, L_SIDEWALK, 0.5, near);
    float kd = smoothstep(-0.28, 0.0, dA);                  // toward the road edge: grime + worn arris
    vec3 kc = k.c * 1.12 * (1.0 - 0.25 * kd) * (0.92 + 0.12 * n1.r);
    col = mix(col, kc, curb); rough = mix(rough, k.r, curb); g = mix(g, k.g, curb);
  }
  // special surfaces keep their simple shading
  if (sp > 0.5 && sp < 1.5) { col = mix(vec3(0.42, 0.17, 0.12), vec3(0.50, 0.22, 0.15), n2.b); rough = 0.9; g = vec2(0.0); }
  else if (sp > 1.5 && sp < 2.5) { col = mix(vec3(0.20, 0.34, 0.30), vec3(0.24, 0.38, 0.33), n1.g); rough = 0.8; g = vec2(0.0); }
  else if (sp > 2.5 && sp < 3.5) { PS d = gTap(w, 3.0, L_DIRT, kIso, near); col = mix(vec3(0.66, 0.58, 0.44), vec3(0.74, 0.66, 0.50), n2.r) * (0.75 + 0.5 * d.h); rough = 1.0; g = d.g * 0.5; }
  else if (sp > 5.5 && sp < 6.5) { float stripe = step(0.5, fract(w.x / 6.0)); PS l = gTap(w, 2.0, L_LAWN, kIso, near); col = mix(vec3(0.16, 0.30, 0.09), vec3(0.19, 0.34, 0.11), stripe) * (0.65 + 0.35 * l.c.g / 0.0912); rough = 0.95; g = l.g * 0.6; }
  // late-autumn leaf litter under deciduous trees
  vec4 lf = texture(uLeaf, (w - uLampRect.xy) / uLampRect.zw);
  if (lf.a > 0.01) {
    // r4-ground: campus grounds are blown/raked: sparse leaves on lawns and walks (the old 90 % carpet read as brown
    // mud discs from a distance), a bit more in beds and natural ground
    float dens = clamp(lf.a * 1.8, 0.0, 0.6) * (1.0 - mA * 0.9) * (1.0 - 0.45 * wG - 0.35 * wP);
    vec2 lc = w * 8.0; vec2 li = floor(lc); vec2 lr = fract(lc) - 0.5;
    float hh = fract(sin(dot(li, vec2(12.9898, 78.233))) * 43758.5453);
    float ang = hh * 6.283; vec2 rr = vec2(cos(ang) * lr.x - sin(ang) * lr.y, sin(ang) * lr.x + cos(ang) * lr.y);
    float shape = 1.0 - smoothstep(0.18, 0.3, length(rr * vec2(1.0, 1.9)));
    float leaf = step(1.0 - dens, fract(hh * 7.13)) * shape;
    float lodL = smoothstep(0.03, 0.12, max(fwidth(lc.x), fwidth(lc.y)));
    leaf = mix(leaf, dens * 0.3, lodL);
    vec3 leafC = mix(mix(vec3(0.70, 0.50, 0.14), vec3(0.52, 0.28, 0.09), fract(hh * 3.7)), vec3(0.78, 0.66, 0.20), step(0.8, fract(hh * 5.3)));
    leafC = mix(vec3(dot(leafC, vec3(0.2126, 0.7152, 0.0722))), leafC, 0.8) * 0.85;   // r4-ground: less orange, a bit darker
    col = mix(col, leafC, leaf); rough = mix(rough, 0.95, leaf); g *= 1.0 - leaf;
  }
  // far: blend toward the real aerial photo colour
  float farK = smoothstep(500.0, 1400.0, dist);
  if (farK > 0.0) {
    vec3 o = texture(uOrtho, (w - uAuxRect.xy) / uAuxRect.zw).rgb;
    o = mix(o, vec3(dot(o, vec3(0.3, 0.59, 0.11))) * vec3(1.05, 0.98, 0.82), 0.25);
    col = mix(col, o * 0.95, farK * 0.65);
  }
  gCol = col; gRough = clamp(rough, 0.3, 1.0); gAO = mix(1.0, ao, 0.9);
  // texture slope -> world-space normal offset (heightfield normal has y = 2, so scale by 2)
  float bk = (1.0 - smoothstep(60.0, 220.0, dist)) * 1.6;
  gBumpN = vec3(g.x, 0.0, g.y) * bk;
  gEmis = texture(uLamp, (w - uLampRect.xy) / uLampRect.zw).rgb * uNight * (col * 2.6 + vec3(0.02, 0.016, 0.01));
}
`;
