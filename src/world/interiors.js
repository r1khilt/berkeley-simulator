// Furnished interiors behind every window (interior mapping).
// A virtual room is ray-traced per pixel behind the glass: the room shell (floor, ceiling, walls) plus a handful of
// analytic boxes for furniture, chosen by room type (office, classroom, lecture hall, lab, dorm, library stacks,
// café, shop, living room). Lights switch on per room with time of day, and blinds/curtains hang at random heights.
// Used by the procedural façade shader (buildings.js) and, via applyInteriorGlass(), by the hand-built landmarks'
// window glass, so both share one look. Everything is procedural: no textures, no extra draw calls.
import * as THREE from 'three';
import { U } from '../materials.js';

// building uses (packed into the façade attribute / landmark glass attribute)
export const USE = { academic: 0, office: 1, science: 2, residential: 3, library: 4, commercial: 5, house: 6, industrial: 7, assembly: 8 };

// GLSL. Requires the host to declare `uniform float uNight;` before this chunk.
export const INTERIOR_GLSL = /* glsl */`
#define IR_OFFICE 0
#define IR_CLASS 1
#define IR_LECTURE 2
#define IR_LAB 3
#define IR_DORM 4
#define IR_LIBRARY 5
#define IR_CAFE 6
#define IR_RETAIL 7
#define IR_LIVING 8
#define IM_WALL 0
#define IM_FLOOR 1
#define IM_CEIL 2
#define IM_WOOD 3
#define IM_DARK 4
#define IM_SCREEN 5
#define IM_FABRIC 6
#define IM_BOOKS 7
#define IM_METAL 8
#define IM_BED 9
#define IM_WHITE 10
#define IM_BENCH 11
#define IM_HOOD 12
#define IM_PERSON 13
#define IM_PLANT 14
#define IM_GOODS 15
#define IM_LAMP 16
#define IM_TV 17
#define IM_SEATS 18
#define IM_COUNTER 19
float flipSign(float x) { return x > 0.5 ? -1.0 : 1.0; }
float irH(vec2 p){ p = fract(p*vec2(233.34, 851.73)); p += dot(p, p+23.45); return fract(p.x*p.y); }
vec4 irH4(float s){ return fract(sin(vec4(s*12.9898+1.31, s*78.233+4.17, s*37.719+2.73, s*93.989+5.97)) * 43758.5453); }
// which kind of room fills a floor, from the building use (fl = floor index, 0 = street level)
int irFloorType(int use, float fl, float h, float hb) {
  if (use == 5) { if (fl < 0.5) return h < 0.55 ? IR_CAFE : IR_RETAIL; return hb < 0.6 ? (h < 0.65 ? IR_DORM : IR_LIVING) : IR_OFFICE; }
  if (use == 3) return h < 0.7 ? IR_DORM : IR_LIVING;
  if (use == 6) return h < 0.5 ? IR_DORM : IR_LIVING;
  if (use == 4) return h < 0.72 ? IR_LIBRARY : (h < 0.88 ? IR_OFFICE : IR_CLASS);
  if (use == 2) return h < 0.5 ? IR_LAB : (h < 0.82 ? IR_OFFICE : (h < 0.93 ? IR_CLASS : IR_LECTURE));
  if (use == 1) return h < 0.8 ? IR_OFFICE : IR_CLASS;
  if (use == 7) return h < 0.6 ? IR_LAB : IR_OFFICE;
  if (use == 8) return h < 0.55 ? IR_LECTURE : (h < 0.8 ? IR_OFFICE : IR_CLASS);
  if (fl < 0.5) return h < 0.3 ? IR_LECTURE : (h < 0.62 ? IR_CLASS : (h < 0.84 ? IR_OFFICE : IR_LAB));
  return h < 0.48 ? IR_OFFICE : (h < 0.7 ? IR_CLASS : (h < 0.88 ? IR_LAB : (h < 0.95 ? IR_LECTURE : IR_LIBRARY)));
}
float irSpanOf(int t, float h) { // façade bays per room
  if (t == IR_LECTURE) return 3.0;
  if (t == IR_LIBRARY || t == IR_CAFE || t == IR_RETAIL) return 2.0 + floor(h * 2.0);
  if (t == IR_CLASS || t == IR_LAB) return 2.0;
  if (t == IR_LIVING) return 1.0 + step(0.6, h);
  if (t == IR_OFFICE) return 1.0 + step(0.8, h);
  return 1.0;
}
float irDepthOf(int t, float h) {
  if (t == IR_LECTURE) return 9.0 + 2.0 * h;
  if (t == IR_LIBRARY || t == IR_CAFE || t == IR_RETAIL) return 7.0 + 2.0 * h;
  if (t == IR_CLASS || t == IR_LAB) return 6.0 + 1.5 * h;
  return 4.2 + 1.2 * h;
}
// lights on? (more rooms switch on at dusk and night; offices and libraries are lit by day too)
float irLitOf(int t, float h) {
  vec2 p = t == IR_OFFICE ? vec2(0.62, 0.52) : t == IR_CLASS ? vec2(0.5, 0.3) : t == IR_LECTURE ? vec2(0.55, 0.35)
         : t == IR_LAB ? vec2(0.72, 0.58) : t == IR_DORM ? vec2(0.1, 0.66) : t == IR_LIBRARY ? vec2(0.86, 0.8)
         : t == IR_CAFE ? vec2(0.96, 0.94) : t == IR_RETAIL ? vec2(0.95, 0.82) : vec2(0.12, 0.72);
  return step(h, mix(p.x, p.y, smoothstep(0.05, 0.85, uNight)));
}
vec3 irLampColor(int t, float h) {
  if (t == IR_DORM || t == IR_LIVING) return mix(vec3(1.0, 0.74, 0.47), vec3(1.0, 0.86, 0.68), h) * 1.05;
  if (t == IR_CAFE) return vec3(1.0, 0.72, 0.44) * 1.1;
  if (t == IR_LIBRARY) return mix(vec3(1.0, 0.86, 0.66), vec3(0.95, 0.97, 1.0), step(0.6, h));
  if (t == IR_RETAIL) return vec3(1.0, 0.95, 0.88) * 1.15;
  return mix(vec3(0.92, 0.96, 1.0), vec3(1.0, 0.9, 0.75), step(0.72, h)) * (0.92 + 0.16 * fract(h * 7.0));
}
vec3 irWallTint(float s) {
  vec4 r = irH4(s * 3.7 + 1.0);
  vec3 c = mix(vec3(0.84, 0.82, 0.77), vec3(0.80, 0.82, 0.83), r.x);
  if (r.y > 0.84) c = mix(c, vec3(0.70, 0.77, 0.66), 0.55);
  else if (r.y > 0.72) c = mix(c, vec3(0.90, 0.76, 0.58), 0.45);
  else if (r.y > 0.64) c = mix(c, vec3(0.60, 0.68, 0.80), 0.40);
  else if (r.y > 0.6) c = mix(c, vec3(0.80, 0.55, 0.50), 0.35);
  return c;
}
vec3 irPalette(float h) { // accent colours: posters, products
  vec3 c = 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67)));
  return mix(vec3(0.5), c, 0.62) * (0.55 + 0.45 * fract(h * 13.7));
}
vec3 irMuted(float h) { // fabrics, blankets, book spines: navy, burgundy, forest, mustard, grey, tan, teal, plum
  float k = floor(fract(h) * 8.0);
  vec3 c = k < 1.0 ? vec3(0.13, 0.17, 0.3) : k < 2.0 ? vec3(0.38, 0.11, 0.12) : k < 3.0 ? vec3(0.16, 0.27, 0.17) : k < 4.0 ? vec3(0.6, 0.45, 0.16)
         : k < 5.0 ? vec3(0.42, 0.42, 0.43) : k < 6.0 ? vec3(0.55, 0.45, 0.35) : k < 7.0 ? vec3(0.12, 0.33, 0.36) : vec3(0.3, 0.18, 0.3);
  return c * (0.85 + 0.3 * fract(h * 17.3));
}
// ---------- ray state ----------
vec3 irRO, irRD, irIRD, irPS, irNrm, irBLo, irBHi; float irT, irAO, irPx, irCamD; int irMat; bool irOnFloor;
void irTest(vec3 lo, vec3 hi, int m) {
  vec3 t0 = (lo - irRO) * irIRD, t1 = (hi - irRO) * irIRD;
  vec3 tn3 = min(t0, t1), tf3 = max(t0, t1);
  float tf = min(min(tf3.x, tf3.y), tf3.z);
  // entry face = axis with the largest entry distance (explicit compares: float equality is unreliable here)
  vec3 nn; float tn;
  if (tn3.x > tn3.y && tn3.x > tn3.z) { tn = tn3.x; nn = vec3(-sign(irRD.x), 0.0, 0.0); }
  else if (tn3.y > tn3.z) { tn = tn3.y; nn = vec3(0.0, -sign(irRD.y), 0.0); }
  else { tn = tn3.z; nn = vec3(0.0, 0.0, -sign(irRD.z)); }
  if (tn <= tf && tn > 0.0 && tn < irT) { irT = tn; irMat = m; irBLo = lo; irBHi = hi; irNrm = nn; }
  if (irOnFloor && lo.y < 0.05) { // soft contact shadow on the floor around furniture standing on it
    vec2 d = max(lo.xz - irPS.xz, irPS.xz - hi.xz);
    irAO *= 0.5 + 0.5 * smoothstep(-0.08, 0.45, max(d.x, d.y));
  }
}
// ---------- furniture layouts (room space: x across [0,W], y up from the floor, z depth from the glass [0,D]) ----------
void irPerson(vec3 c, float sit, float h) { // c = feet (or seat) centre
  float y0 = sit > 0.5 ? 0.45 : 0.0; float y1 = y0 + (sit > 0.5 ? 0.62 : 1.38 + 0.12 * h);
  irTest(vec3(c.x - 0.21, y0, c.z - 0.13), vec3(c.x + 0.21, y1, c.z + 0.13), IM_PERSON);
  irTest(vec3(c.x - 0.1, y1 + 0.02, c.z - 0.1), vec3(c.x + 0.1, y1 + 0.26, c.z + 0.11), IM_PERSON);
}
void irLayout(int t, vec3 R, float seed, float lit, float yF) {
  float W = R.x, H = R.y, D = R.z;
  vec4 a = irH4(seed + 0.37), b = irH4(seed + 5.11);
  bool flip = a.x > 0.5;
  bool who = lit > 0.5 && a.w < 0.3;   // someone is in (lit rooms only)
  if (t == IR_OFFICE) {
    if (b.w < 0.2 && W > 3.2) { // meeting room: long table, chairs both sides, screen on the back wall
      irTest(vec3(0.8, 0.71, 1.4), vec3(W - 0.8, 0.76, D - 1.3), IM_WOOD);
      irTest(vec3(W * 0.5 - 0.3, 0.0, 2.0), vec3(W * 0.5 + 0.3, 0.71, D - 1.9), IM_DARK);
      irTest(vec3(1.0, 0.45, 1.05), vec3(W - 1.0, 1.02, 1.12), IM_SEATS);
      irTest(vec3(1.0, 0.45, D - 1.0), vec3(W - 1.0, 1.02, D - 0.93), IM_SEATS);
      if (who) irPerson(vec3(W * 0.3 + a.y * W * 0.4, 0.0, D - 0.75), 1.0, a.z);
      return;
    }
    float dw = min(W - 0.8, 1.4 + 0.4 * a.y), dx = mix(0.4, W - 0.4 - dw, a.z);
    float mx = dx + dw * (0.38 + 0.24 * b.y);
    if (b.x < 0.55) { // desk against the back wall; chair (and person) facing it
      irTest(vec3(dx, 0.71, D - 0.75), vec3(dx + dw, 0.75, D - 0.02), IM_WOOD);
      float px0 = flip ? dx + 0.04 : dx + dw - 0.46;
      irTest(vec3(px0, 0.0, D - 0.72), vec3(px0 + 0.42, 0.71, D - 0.08), IM_METAL);
      irTest(vec3(mx - 0.29, 0.83, D - 0.42), vec3(mx + 0.29, 1.17, D - 0.39), IM_SCREEN);
      float cz = D - 1.15 - 0.15 * b.z;
      irTest(vec3(mx - 0.25, 0.44, cz - 0.23), vec3(mx + 0.25, 0.5, cz + 0.23), IM_FABRIC);
      irTest(vec3(mx - 0.23, 0.52, cz - 0.3), vec3(mx + 0.23, 1.12, cz - 0.24), IM_FABRIC);
      if (who) irPerson(vec3(mx, 0.0, cz), 1.0, a.z);
      float sx = flip ? W - 0.38 : 0.0;   // tall bookcase on a side wall
      irTest(vec3(sx, 0.0, D - 2.2), vec3(sx + 0.38, 2.0 + 0.15 * a.y, D - 1.15), IM_BOOKS);
    } else {          // desk facing the window; tall shelving along the back wall
      float dz = 0.5 + 0.5 * b.y;
      irTest(vec3(dx, 0.71, dz), vec3(dx + dw, 0.75, dz + 0.75), IM_WOOD);
      irTest(vec3(dx + 0.03, 0.12, dz + 0.04), vec3(dx + dw - 0.03, 0.71, dz + 0.08), IM_WOOD);
      irTest(vec3(mx - 0.29, 0.83, dz + 0.45), vec3(mx + 0.29, 1.17, dz + 0.49), IM_DARK);
      float cz = dz + 1.2;
      irTest(vec3(mx - 0.25, 0.44, cz - 0.23), vec3(mx + 0.25, 0.5, cz + 0.23), IM_FABRIC);
      irTest(vec3(mx - 0.23, 0.52, cz + 0.24), vec3(mx + 0.23, 1.12, cz + 0.3), IM_FABRIC);
      if (who) irPerson(vec3(mx, 0.0, cz), 1.0, a.z);
      irTest(vec3(W * 0.12, 0.0, D - 0.4), vec3(W * 0.12 + min(1.8, W * 0.55), 2.05, D - 0.02), IM_BOOKS);
    }
    if (a.w > 0.55) { float px = flip ? 0.2 : W - 0.62; irTest(vec3(px, 0.0, 0.25), vec3(px + 0.42, 1.15 + 0.45 * b.z, 0.67), IM_PLANT); }
  } else if (t == IR_CLASS) {
    for (int i = 0; i < 3; i++) {
      float z = 1.3 + float(i) * 1.3;
      irTest(vec3(0.7, 0.71, z), vec3(W - 0.7, 0.76, z + 0.5), IM_WOOD);
      irTest(vec3(0.8, 0.44, z - 0.5), vec3(W - 0.8, 0.92, z - 0.43), IM_SEATS);
    }
    irTest(vec3(W * 0.5 - 0.22, H - 0.42, D * 0.42), vec3(W * 0.5 + 0.22, H - 0.26, D * 0.42 + 0.36), IM_WHITE);   // ceiling projector
    irTest(vec3(W * 0.5 - 0.02, H - 0.26, D * 0.42 + 0.16), vec3(W * 0.5 + 0.02, H, D * 0.42 + 0.2), IM_DARK);
    irTest(vec3(W * 0.62, 0.0, D - 1.7), vec3(W * 0.62 + 1.3, 0.76, D - 1.1), IM_WOOD);
    if (who) irPerson(vec3(W * (0.25 + 0.3 * a.y), 0.0, D - 0.8), 0.0, a.z);
  } else if (t == IR_LECTURE) { // tiered rows stepping down toward a stage and screen at the back
    for (int i = 0; i < 5; i++) {
      float z0 = 0.4 + float(i) * 0.95, y = -0.3 * float(i);
      irTest(vec3(0.0, yF, z0), vec3(W, y, z0 + 0.95), IM_FLOOR);
      irTest(vec3(0.5, y, z0 + 0.5), vec3(W - 0.5, y + 0.82, z0 + 0.58), IM_SEATS);
    }
  } else if (t == IR_LAB) {
    irTest(vec3(0.9, 0.0, 1.9), vec3(W - 0.9, 0.92, 2.9), IM_BENCH);              // island bench
    irTest(vec3(1.1, 0.92, 2.36), vec3(W - 1.1, 1.8, 2.44), IM_METAL);              // reagent shelf spine
    irTest(vec3(1.1, 1.36, 2.15), vec3(W - 1.1, 1.4, 2.65), IM_GOODS);              // shelf with bottles
    float fx = flip ? 0.3 : W - 1.8;
    irTest(vec3(fx, 0.0, D - 0.85), vec3(fx + 1.5, 2.35, D), IM_HOOD);            // fume hood
    float sx = flip ? W - 0.75 : 0.0;
    irTest(vec3(sx, 0.0, 1.0), vec3(sx + 0.75, 0.92, D - 1.1), IM_BENCH);           // wall bench + cabinets above
    irTest(vec3(flip ? W - 0.38 : 0.0, 1.5, 1.0), vec3(flip ? W : 0.38, 2.3, D - 1.1), IM_GOODS);
    irTest(vec3(0.0, H - 0.4, D * 0.35), vec3(W, H - 0.05, D * 0.35 + 0.45), IM_METAL);  // duct
    if (who) irPerson(vec3(W * (0.35 + 0.3 * a.y), 0.0, 1.5), 0.0, a.z);
  } else if (t == IR_DORM) {
    float bx = flip ? W - 0.98 : 0.02; bool loft = b.x < 0.55;
    float by = loft ? 1.3 : 0.25;
    irTest(vec3(bx, by, D - 2.05), vec3(bx + 0.96, by + 0.26, D - 0.02), IM_BED);
    irTest(vec3(bx + 0.14, by + 0.26, D - 0.62), vec3(bx + 0.82, by + 0.4, D - 0.12), IM_WHITE);
    irTest(vec3(bx, 0.0, D - 2.07), vec3(bx + 0.96, by, D - 1.99), IM_WOOD);      // bed end / loft ladder end
    float dx = flip ? 0.25 : W - 1.3;
    if (loft) dx = bx + 0.02;                                                  // desk tucked under the loft
    irTest(vec3(dx, 0.72, D - 1.6), vec3(dx + 0.94, 0.76, D - 0.4), IM_WOOD);
    irTest(vec3(dx + 0.3, 0.76, D - 1.25), vec3(dx + 0.66, 0.98, D - 1.23), IM_SCREEN);
    irTest(vec3(flip ? 0.05 : W - 0.75, 0.0, 0.45), vec3(flip ? 0.75 : W - 0.05, 0.9 + 1.0 * step(0.5, b.y), 1.05), IM_WOOD);  // dresser / wardrobe
    if (who) irPerson(vec3(dx + 0.5, 0.0, D - 1.75), 1.0, a.z);
    else irTest(vec3(dx + 0.24, 0.44, D - 2.0), vec3(dx + 0.72, 0.95, D - 1.93), IM_FABRIC);   // chair back
  } else if (t == IR_LIVING) {
    float sz = D - 0.95;                        // sofa against the back wall, coffee table, bookcase, lamp
    irTest(vec3(W * 0.2, 0.0, sz), vec3(W * 0.8, 0.45, D - 0.05), IM_FABRIC);
    irTest(vec3(W * 0.2, 0.45, D - 0.27), vec3(W * 0.8, 0.92, D - 0.05), IM_FABRIC);
    irTest(vec3(W * 0.36, 0.0, sz - 1.05), vec3(W * 0.64, 0.42, sz - 0.5), IM_WOOD);
    float sx = flip ? W - 0.4 : 0.0;
    irTest(vec3(sx, 0.0, 1.0), vec3(sx + 0.4, 1.95, 2.3), IM_BOOKS);
    float lx = flip ? 0.25 : W - 0.45;
    irTest(vec3(lx, 0.0, D - 0.6), vec3(lx + 0.05, 1.45, D - 0.55), IM_DARK);
    irTest(vec3(lx - 0.15, 1.45, D - 0.72), vec3(lx + 0.2, 1.72, D - 0.42), IM_LAMP);
    if (who) irPerson(vec3(W * (0.35 + 0.3 * a.y), 0.0, sz + 0.4), 1.0, a.z);
  } else if (t == IR_LIBRARY) {
    if (b.x < 0.5) { // reading table by the window, stacks parallel to the glass (spines face out)
      irTest(vec3(0.5, 0.71, 0.9), vec3(W - 0.5, 0.76, 1.9), IM_WOOD);
      irTest(vec3(W * 0.5 - 0.12, 0.76, 1.3), vec3(W * 0.5 + 0.12, 1.02, 1.5), IM_LAMP);
      irTest(vec3(0.4, 0.0, 3.0), vec3(W - 0.4, 2.15, 3.55), IM_BOOKS);
      irTest(vec3(0.4, 0.0, 4.9), vec3(W - 0.4, 2.15, 5.45), IM_BOOKS);
      if (who) irPerson(vec3(W * (0.25 + 0.5 * a.y), 0.0, 2.2), 1.0, a.z);
    } else {          // stacks perpendicular to the glass: aisles
      for (int i = 0; i < 3; i++) { float x = W * (0.1 + 0.33 * float(i)) + 0.3 * a.z; irTest(vec3(x, 0.0, 1.5), vec3(x + 0.55, 2.2, D - 0.6), IM_BOOKS); }
      if (who) irPerson(vec3(W * (0.1 + 0.33 * floor(a.y * 2.99)) + 0.3 * a.z + 0.95, 0.0, 2.5 + 2.0 * a.y), 0.0, a.z);
    }
  } else if (t == IR_CAFE) {
    irTest(vec3(W * 0.25, 0.0, D - 2.3), vec3(W - 0.3, 1.02, D - 1.6), IM_COUNTER);
    irTest(vec3(W * 0.3, 0.0, D - 0.45), vec3(W - 0.3, 2.1, D), IM_GOODS);          // back bar shelves
    for (int i = 0; i < 2; i++) {
      float x = W * (0.2 + 0.45 * float(i)) + 0.3 * a.y, z = 1.0 + (0.6 + 0.6 * float(i)) * b.z;
      irTest(vec3(x - 0.36, 0.72, z - 0.36), vec3(x + 0.36, 0.76, z + 0.36), IM_WOOD);
      irTest(vec3(x - 0.05, 0.0, z - 0.05), vec3(x + 0.05, 0.72, z + 0.05), IM_DARK);
      irTest(vec3(x - 0.17, H - 1.05, z - 0.17), vec3(x + 0.17, H - 0.8, z + 0.17), IM_LAMP);   // pendant
    }
    if (a.w < 0.7) irPerson(vec3(W * (0.25 + 0.5 * a.y), 0.0, 1.9 + b.w), a.w < 0.35 ? 1.0 : 0.0, a.z);
    irPerson(vec3(W * (0.45 + 0.3 * b.y), 0.0, D - 1.25), 0.0, b.z);              // barista
  } else { // retail
    for (int i = 0; i < 2; i++) { float x = W * (0.2 + 0.4 * float(i)) + 0.2 * a.z; irTest(vec3(x, 0.0, 2.0), vec3(x + 0.7, 1.55, D - 1.5), IM_GOODS); }
    irTest(vec3(0.0, 0.0, D - 0.5), vec3(W, 2.2, D), IM_GOODS);
    irTest(vec3(W * 0.68, 0.0, 0.9), vec3(W * 0.68 + 1.2, 0.95, 1.5), IM_COUNTER);
    if (a.w < 0.6) irPerson(vec3(W * (0.3 + 0.4 * a.y), 0.0, 1.7), 0.0, a.z);
  }
}
// ---------- materials ----------
float irBand(float x, float w, float fw) { return smoothstep(-fw, fw, x) * (1.0 - smoothstep(w - fw, w + fw, x)); }
vec3 irBooks(vec2 q, float s, float fw) { // q: (along shelf, up) metres
  float sh = floor(q.y / 0.36); float fy = fract(q.y / 0.36) * 0.36;
  float bk = floor(q.x / 0.045 + irH(vec2(sh, s)) * 3.0); float hb = irH(vec2(bk, sh + s * 3.1));
  vec3 c = mix(irMuted(hb), vec3(0.85, 0.82, 0.74), step(0.82, fract(hb * 5.3)) * 0.7);
  float top = 0.22 + 0.1 * irH(vec2(bk + 9.1, sh));
  float isBook = step(0.03, fy) * (1.0 - step(top, fy)) * step(0.08, irH(vec2(bk * 1.7, sh + 2.0)));
  vec3 board = vec3(0.45, 0.33, 0.22);
  vec3 o = mix(vec3(0.07, 0.06, 0.05), c, isBook);
  o = mix(o, board, 1.0 - step(0.025, fy));
  float aa = smoothstep(0.012, 0.03, fw);
  return mix(o, vec3(0.32, 0.26, 0.21), aa);
}
vec3 irGoods(vec2 q, float s, float fw) {
  float sh = floor(q.y / 0.42); float fy = fract(q.y / 0.42) * 0.42;
  float it = floor(q.x / 0.16); float h = irH(vec2(it, sh + s));
  vec3 c = mix(irPalette(h), irMuted(h * 3.1), 0.4);
  float on = step(0.04, fy) * (1.0 - step(0.2 + 0.15 * h, fy)) * step(0.15, fract(q.x / 0.16));
  vec3 o = mix(vec3(0.85, 0.85, 0.83), c, on);
  return mix(o, vec3(0.6, 0.55, 0.5), smoothstep(0.02, 0.05, fw));
}
// radiance of the hit surface
vec3 irShade(int t, vec3 R, float yF, float seed, float lit, vec3 lampC) {
  vec3 p = irRO + irRD * irT, n = irNrm; int m = irMat;
  float W = R.x, H = R.y, D = R.z;
  vec4 a = irH4(seed + 0.37), b = irH4(seed + 5.11), c4 = irH4(seed + 9.77);
  float fw = irPx * (1.0 + irT / max(irCamD, 0.5));
  vec3 alb = vec3(0.8), em = vec3(0.0); float ao = 1.0;
  vec3 lo = irBLo, hi = irBHi;
  // face coordinates on boxes (along the face, up)
  vec2 fq = abs(n.x) > 0.5 ? vec2(p.z - lo.z, p.y - lo.y) : (abs(n.y) > 0.5 ? vec2(p.x - lo.x, p.z - lo.z) : vec2(p.x - lo.x, p.y - lo.y));
  if (m == IM_WALL) {
    alb = irWallTint(seed);
    vec2 q = abs(n.x) > 0.5 ? vec2(p.z, p.y - yF) : vec2(p.x, p.y - yF);
    alb *= 0.9 + 0.1 * step(0.1, q.y);                                        // skirting
    if (n.z < -0.5) { // back wall decals
      if (t == IR_CLASS || t == IR_LECTURE || (t == IR_OFFICE && b.w < 0.2)) {
        float bx0 = W * 0.18, bx1 = W * 0.82, by0 = 0.9 - yF * 0.0, by1 = 2.15;
        if (t == IR_LECTURE) { by0 = yF + 1.1; by1 = min(H - 0.3, yF + 3.4); }
        if (t == IR_OFFICE) { bx0 = W * 0.3; bx1 = W * 0.7; by0 = 1.05; by1 = 1.75; }
        float inB = irBand(q.x - bx0, bx1 - bx0, fw) * irBand(p.y - by0, by1 - by0, fw);
        float inF = irBand(q.x - bx0 + 0.05, bx1 - bx0 + 0.1, fw) * irBand(p.y - by0 + 0.05, by1 - by0 + 0.1, fw);
        if (t == IR_OFFICE) { alb = mix(alb, vec3(0.03), inF); em += vec3(0.25, 0.35, 0.55) * inB * lit * 0.6; }
        else {
          float scr = step(0.5, a.z) * step(t == IR_LECTURE ? 0.0 : 0.6, b.z);       // projector screen instead
          vec3 wb = vec3(0.93, 0.94, 0.95);
          float ink = step(0.62, irH(floor(vec2(q.x * 7.0, p.y * 9.0)) + seed)) * step(0.5, fract(p.y * 9.0)) * (1.0 - smoothstep(0.01, 0.03, fw));
          wb = mix(wb, vec3(0.2, 0.25, 0.5), ink * 0.6 * (1.0 - scr));
          alb = mix(alb, vec3(0.6), inF); alb = mix(alb, wb, inB);
          em += vec3(0.75, 0.8, 0.95) * inB * scr * lit * 0.7;
        }
      }
      if ((t == IR_CLASS || t == IR_LAB || t == IR_OFFICE) && c4.w < 0.5) { // wall clock
        vec2 cc = vec2(W * (0.25 + 0.5 * c4.z), min(H - 0.45, 2.35)); float d = length(vec2(q.x, p.y) - cc);
        alb = mix(alb, vec3(0.92), 1.0 - smoothstep(0.13 - fw, 0.13 + fw, d)); alb = mix(alb, vec3(0.08), irBand(d - 0.13, 0.025, fw));
      }
      if (t == IR_DORM || t == IR_LIVING) { // posters / art
        for (int i = 0; i < 2; i++) {
          vec4 r = irH4(seed + 3.3 * float(i) + 1.7);
          float px = W * (0.08 + 0.5 * float(i) + 0.2 * r.x), pw = 0.45 + 0.35 * r.y, ph = pw * (1.25 + 0.2 * r.z), py = 1.45 + 0.35 * r.w;
          float inP = irBand(q.x - px, pw, fw) * irBand(p.y - py, ph, fw);
          vec2 pq = vec2((q.x - px) / pw, (p.y - py) / ph);
          vec3 pc = mix(irPalette(r.x + r.w), irPalette(r.y * 3.1), step(0.5, fract(pq.y * (1.0 + floor(r.z * 3.0)) + pq.x * (r.w - 0.5))));
          alb = mix(alb, pc, inP);
        }
        if (t == IR_DORM && b.z < 0.6) { // fairy lights along the top of the wall
          float sy = H - 0.25 - 0.06 * sin(q.x * 3.0 + a.y * 6.0); vec2 dq = vec2(fract(q.x / 0.22) - 0.5, (p.y - sy) / 0.22);
          float dot_ = (1.0 - smoothstep(0.08, 0.2, length(dq))) * (1.0 - smoothstep(0.02, 0.05, fw));
          em += vec3(1.0, 0.62, 0.3) * dot_ * max(lit, uNight * 0.7) * 1.6;
        }
      }
      if (t == IR_CAFE) { // menu board above the counter
        float inM = irBand(q.x - W * 0.35, W * 0.5, fw) * irBand(p.y - 2.15, 0.7, fw);
        float txt = step(0.55, irH(floor(vec2(q.x * 14.0, p.y * 12.0)))) * step(0.4, fract(p.y * 12.0));
        alb = mix(alb, mix(vec3(0.05, 0.06, 0.05), vec3(0.9), txt * (1.0 - smoothstep(0.01, 0.03, fw)) * 0.8), inM);
      }
      if (t == IR_OFFICE && b.w >= 0.2) { // pinboard / framed print
        float inP = irBand(q.x - W * (0.15 + 0.4 * c4.x), 0.9, fw) * irBand(p.y - 1.3, 0.6, fw);
        alb = mix(alb, mix(vec3(0.62, 0.47, 0.3), irPalette(c4.y), step(0.5, c4.z)), inP);
      }
    } else if (abs(n.x) > 0.5) { // side walls: a door near the back on one side
      float dz0 = D - 1.45, inD = irBand(p.z - dz0, 0.95, fw) * irBand(q.y, 2.1, fw) * step(0.0, n.x * (flipSign(a.x)));
      alb = mix(alb, vec3(0.42, 0.3, 0.2) * (0.8 + 0.4 * a.y), inD);
    }
  } else if (m == IM_FLOOR) {
    vec2 q = p.xz;
    if (t == IR_OFFICE || t == IR_LECTURE || t == IR_LIBRARY) { // carpet tiles
      vec3 cc = t == IR_LIBRARY ? mix(vec3(0.35, 0.16, 0.14), vec3(0.18, 0.28, 0.24), step(0.5, b.y)) : mix(vec3(0.3, 0.32, 0.36), vec3(0.36, 0.32, 0.28), b.y);
      float tile = irH(floor(q / 0.5) + seed);
      alb = cc * (0.9 + 0.2 * mix(tile, 0.5, smoothstep(0.02, 0.08, fw)));
    } else if (t == IR_DORM || t == IR_LIVING || t == IR_CAFE) { // wood planks
      float pl = floor(q.x / 0.14); float tone = irH(vec2(pl, floor(q.y / 1.2 + irH(vec2(pl, 3.0)))));
      alb = mix(vec3(0.42, 0.28, 0.17), vec3(0.6, 0.44, 0.28), mix(tone, 0.5, smoothstep(0.02, 0.06, fw)));
      if (t == IR_LIVING) { float rug = irBand(q.x - W * 0.25, W * 0.5, fw) * irBand(q.y - D + 2.4, 1.6, fw); alb = mix(alb, irPalette(c4.w) * 0.8, rug); }
    } else { // vinyl tiles
      vec2 g = fract(q / 0.3); float tone = irH(floor(q / 0.3) + seed);
      alb = mix(vec3(0.66, 0.65, 0.6), vec3(0.74, 0.73, 0.68), mix(tone, 0.5, smoothstep(0.02, 0.06, fw)));
    }
  } else if (m == IM_CEIL) {
    alb = vec3(0.86);
    vec2 q = p.xz;
    if (t == IR_DORM || t == IR_LIVING) { // one round fixture
      float d = length(q - vec2(W * 0.5, D * 0.55)); float f = 1.0 - smoothstep(0.17 - fw, 0.17 + fw, d);
      em += lampC * lit * 2.6 * f; alb = mix(alb, vec3(0.95), f);
    } else if (t == IR_CAFE) { alb = vec3(0.16, 0.15, 0.14); }
    else { // acoustic grid + troffer panels
      vec2 g = abs(fract(q / 0.6) - 0.5);
      alb *= 1.0 - 0.25 * (1.0 - smoothstep(0.46, 0.5, max(g.x, g.y))) * 0.0 - 0.18 * smoothstep(0.47, 0.5, max(g.x, g.y)) * (1.0 - smoothstep(0.02, 0.05, fw));
      vec2 cell = vec2(2.4, 2.4); vec2 cq = mod(q - vec2(W * 0.5 - 0.3, 0.6), cell);
      float panel = irBand(cq.x, 0.6, fw) * irBand(cq.y, 1.2, fw);
      if (t == IR_LIBRARY || t == IR_LAB) panel = irBand(mod(q.x - W * 0.5 + 0.1, 2.0), 0.2, fw) * irBand(q.y - 0.6, D - 1.2, fw);
      em += lampC * lit * 2.4 * panel; alb = mix(alb, vec3(0.9), panel);
    }
  } else if (m == IM_WOOD) { alb = mix(vec3(0.48, 0.34, 0.22), vec3(0.62, 0.5, 0.36), a.y) * (abs(n.y) > 0.5 ? 1.0 : 0.8); if (t == IR_LAB || t == IR_CLASS) alb = mix(alb, vec3(0.72, 0.7, 0.66), 0.6); }
  else if (m == IM_DARK) { alb = vec3(0.06, 0.06, 0.065); }
  else if (m == IM_SCREEN) {
    alb = vec3(0.04);
    if (n.z < -0.5) { // screen faces the window
      float scr = irBand(fq.x - 0.02, hi.x - lo.x - 0.04, fw) * irBand(fq.y - 0.03, hi.y - lo.y - 0.05, fw);
      float on = max(lit, step(0.7, c4.x) * uNight);
      vec3 sc = mix(vec3(0.55, 0.7, 1.0), vec3(0.95, 0.95, 0.9), step(0.5, c4.y)) * mix(0.7, 1.0, step(0.5, fract(fq.y * 9.0 + c4.z)));
      em += sc * scr * on * 0.85; alb = mix(alb, vec3(0.02), scr);
    }
  } else if (m == IM_FABRIC) {
    alb = t == IR_LIVING || t == IR_DORM ? irMuted(c4.z + 0.5) : mix(vec3(0.1, 0.105, 0.115), irMuted(c4.w) * 0.8, step(0.6, c4.z));
  } else if (m == IM_BOOKS) {
    bool face = (hi.y - lo.y > 1.0) && (abs(n.z) > 0.5 ? (hi.x - lo.x > 0.5) : (hi.z - lo.z > 0.5));
    alb = face ? irBooks(fq, seed + floor(lo.x * 3.0 + lo.z * 7.0), fw) : vec3(0.45, 0.35, 0.25);
    if (t == IR_LIBRARY && !face && abs(n.z) > 0.5) alb = mix(vec3(0.5, 0.42, 0.32), vec3(0.85, 0.82, 0.72), irBand(fq.y - 1.6, 0.15, fw) * irBand(fq.x - 0.12, 0.3, fw));
  } else if (m == IM_METAL) { alb = vec3(0.62, 0.63, 0.64); if (abs(n.z) > 0.5) alb *= 0.85 + 0.15 * step(0.03, abs(fract(fq.y / 0.24) - 0.5) * 0.24); }
  else if (m == IM_BED) {
    alb = irMuted(c4.x) * 1.1;
    if (n.y < 0.5) alb *= 0.75;                                         // blanket drapes darker on the sides
    if (n.y > 0.5) alb = mix(alb, vec3(0.88, 0.87, 0.84), step(hi.z - lo.z - 0.55, fq.y) * 0.85);   // sheet fold by the pillow
  } else if (m == IM_WHITE) { alb = vec3(0.88, 0.88, 0.86); }
  else if (m == IM_BENCH) { alb = abs(n.y) > 0.5 ? vec3(0.08, 0.08, 0.085) : mix(vec3(0.82, 0.83, 0.8), vec3(0.6), step(0.88, p.y) + step(abs(fract((n.x != 0.0 ? p.z : p.x) / 0.6) - 0.5), 0.02) * 0.5); }
  else if (m == IM_HOOD) {
    alb = vec3(0.86, 0.87, 0.85);
    if (n.z < -0.5) {
      float sash = irBand(fq.x - 0.12, hi.x - lo.x - 0.24, fw) * irBand(fq.y - 0.95, 0.9, fw);
      alb = mix(alb, vec3(0.1, 0.12, 0.13), sash); em += vec3(0.85, 0.92, 1.0) * sash * lit * 0.55;
      alb *= 1.0 - 0.3 * irBand(fq.y - 0.88, 0.05, fw);
    }
  } else if (m == IM_PERSON) { alb = hi.y - lo.y < 0.3 ? vec3(0.32, 0.22, 0.17) * (0.6 + 0.8 * c4.y) : irMuted(c4.w * 3.7) * 0.55; }
  else if (m == IM_PLANT) { alb = p.y - lo.y < 0.35 ? vec3(0.45, 0.3, 0.22) : vec3(0.12, 0.3, 0.1) * (0.8 + 0.4 * irH(floor(p.xy * 12.0))); }
  else if (m == IM_GOODS) { alb = abs(n.y) > 0.5 ? vec3(0.7) : irGoods(fq, seed + floor(lo.x), fw); }
  else if (m == IM_LAMP) { alb = vec3(0.9); em += lampC * (lit * 1.8 + (t == IR_LIBRARY ? 0.0 : 0.0)) * (t == IR_LIBRARY ? vec3(0.4, 1.0, 0.55) * 0.9 : vec3(1.0)); }
  else if (m == IM_SEATS) {
    vec3 sc = t == IR_LECTURE ? mix(vec3(0.45, 0.1, 0.1), vec3(0.12, 0.2, 0.4), step(0.5, b.z)) : vec3(0.16, 0.17, 0.19);
    float gap = step(0.86, fract((p.x - lo.x) / 0.56)) * (1.0 - smoothstep(0.02, 0.06, fw));
    alb = mix(sc, vec3(0.04), gap);
  } else if (m == IM_COUNTER) { alb = abs(n.y) > 0.5 ? vec3(0.75, 0.73, 0.7) : mix(vec3(0.3, 0.2, 0.13), vec3(0.62, 0.62, 0.6), step(0.5, b.x)); }
  // ---- lighting
  vec3 L = vec3(W * 0.5, H - 0.1, D * 0.55) - p; float d2 = dot(L, L);
  float diff = max(dot(n, L * inversesqrt(max(d2, 1e-3))), 0.0);
  float lamp = m == IM_CEIL ? 0.42 : 0.26 + 0.75 * diff * (7.0 / (7.0 + d2));
  float day = (1.0 - uNight) * (0.5 + 0.5 * max(-n.z, 0.0) + 0.3 * max(n.y, 0.0) - 0.15 * max(-n.y, 0.0)) * (0.35 + 0.65 * exp(-p.z * 0.28));
  if (m == IM_WALL || m == IM_FLOOR || m == IM_CEIL) { // shell AO in the corners
    vec3 qd = min(p - vec3(0.0, yF, 0.0), vec3(W, H, D) - p);
    float e = abs(n.x) > 0.5 ? min(qd.y, qd.z) : (abs(n.y) > 0.5 ? min(qd.x, qd.z) : min(qd.x, qd.y));
    ao = 0.6 + 0.4 * smoothstep(0.0, 0.8, e);
  } else ao = 0.72 + 0.28 * smoothstep(0.0, 0.6, p.y - yF) + 0.1 * max(n.y, 0.0);
  ao *= irAO;
  return alb * (lit * lamp * lampC * 0.8 + day * vec3(0.4, 0.41, 0.43) + vec3(0.006)) * ao + em;
}
// approximate average room radiance (for tiny/far windows)
vec3 irAverage(int t, float seed, float lit, vec3 lampC) {
  vec3 base = irWallTint(seed) * 0.62;
  return base * (lit * lampC * 0.55 + (1.0 - uNight) * 0.2 + 0.006) + lampC * lit * (t == IR_DORM || t == IR_LIVING ? 0.06 : 0.18);
}
// blinds / roller shades / curtains hanging just behind the glass. win = (x0, y0, x1, y1) in room space.
vec4 irCover(int t, vec4 win, float wseed, float lit, vec3 lampC) {
  vec4 r = irH4(wseed + 19.7);
  bool resid = (t == IR_DORM || t == IR_LIVING);
  float pc = resid ? 0.5 : (t == IR_OFFICE ? 0.04 : 0.0);
  float pb = resid ? 0.28 : (t == IR_CAFE || t == IR_RETAIL ? 0.08 : (t == IR_LIBRARY ? 0.2 : 0.36));
  float ww = win.z - win.x, wh = win.w - win.y;
  if (r.x < pc) { // curtains drawn in from both sides
    float z = 0.14; float tt = (z - irRO.z) * irIRD.z; vec2 q = irRO.xy + irRD.xy * tt;
    float cl = (0.1 + 0.38 * r.y) * ww, cr = (0.1 + 0.38 * r.z) * ww;
    if (r.w > 0.85) { cl = ww * 0.52; cr = ww * 0.52; }
    float fwc = irPx * 1.2;
    float c = max(1.0 - smoothstep(win.x + cl - fwc, win.x + cl + fwc, q.x), smoothstep(win.z - cr - fwc, win.z - cr + fwc, q.x));
    c *= step(win.y - 0.3, q.y) * step(q.y, win.w + 0.4);
    vec3 cc = mix(vec3(0.78, 0.72, 0.6), irMuted(r.w * 7.3) * 1.2, step(0.5, fract(r.w * 13.0)));
    float fold = mix(0.78 + 0.22 * sin(q.x * 22.0 + r.y * 9.0), 0.86, smoothstep(0.02, 0.06, irPx));
    vec3 col = cc * fold * ((1.0 - uNight) * 0.16 + lampC * lit * 0.5 + 0.005);
    return vec4(col, c);
  }
  if (r.x < pc + pb) { // venetian blind or roller shade from the top down to a random height
    float z = 0.05; float tt = (z - irRO.z) * irIRD.z; vec2 q = irRO.xy + irRD.xy * tt;
    float bottom = win.w - (0.1 + 0.75 * r.y * r.y) * wh;
    if (r.y > 0.96) bottom = win.y - 0.2;
    float c = step(bottom, q.y) * step(win.x - 0.1, q.x) * step(q.x, win.z + 0.1);
    bool ven = r.z < 0.6;
    vec3 bc = ven ? mix(vec3(0.8, 0.79, 0.76), vec3(0.58, 0.6, 0.62), step(0.7, r.w)) : mix(vec3(0.74, 0.71, 0.64), vec3(0.32, 0.33, 0.35), step(0.6, r.w));
    float sl = 1.0;
    if (ven) { float f = fract(q.y / 0.07); sl = mix(0.5 + 0.5 * smoothstep(0.05, 0.25, f) * (1.0 - smoothstep(0.8, 0.97, f)), 0.78, smoothstep(0.008, 0.02, irPx)); }
    else sl = 0.92 + 0.08 * smoothstep(bottom, win.w, q.y);
    float rail = 1.0 - step(bottom + 0.045, q.y);
    vec3 col = bc * sl * ((1.0 - uNight) * 0.15 + lampC * lit * (ven ? 0.18 : 0.3) + 0.004) * (1.0 - 0.45 * rail);
    return vec4(col, c * (ven ? 0.95 : 1.0));
  }
  return vec4(0.0);
}
// Full room: ro/rd in room space (rd.z > 0), R = (W, H, D) with the floor at y = 0, win = window rect in room space.
// px = pixel footprint in metres at the glass, camD = camera distance to the glass. Returns radiance behind the glass.
vec3 irRoom(vec3 ro, vec3 rd, vec3 R, int t, float seed, float wseed, float lit, vec4 win, float px, float camD) {
  vec3 lampC = irLampColor(t, fract(seed * 0.618));
  rd.z = max(rd.z, 0.02);
  rd = vec3(abs(rd.x) < 1e-4 ? 1e-4 : rd.x, abs(rd.y) < 1e-4 ? 1e-4 : rd.y, rd.z);
  irRO = ro; irRD = rd; irIRD = 1.0 / rd; irPx = px; irCamD = camD; irAO = 1.0;
  vec4 cov = irCover(t, win, wseed, lit, lampC);
  if (cov.a > 0.99) return cov.rgb;
  float yF = t == IR_LECTURE ? -1.6 : 0.0;
  vec3 lo = vec3(0.0, yF, 0.0);
  // room shell (hit from inside)
  vec3 tw = (mix(lo, R, step(0.0, rd)) - ro) * irIRD;
  if (tw.x < tw.y && tw.x < tw.z) { irT = tw.x; irNrm = vec3(-sign(rd.x), 0.0, 0.0); }
  else if (tw.y < tw.z) { irT = tw.y; irNrm = vec3(0.0, -sign(rd.y), 0.0); }
  else { irT = tw.z; irNrm = vec3(0.0, 0.0, -1.0); }
  irMat = irNrm.y > 0.5 ? IM_FLOOR : (irNrm.y < -0.5 ? IM_CEIL : IM_WALL);
  irPS = ro + rd * irT; irOnFloor = irMat == IM_FLOOR; irBLo = lo; irBHi = R;
  irLayout(t, R, seed, lit, yF);
  if (win.y > 0.45 && t != IR_LECTURE && t != IR_CAFE && t != IR_RETAIL) { // interior sill + things people leave on it
    vec4 k = irH4(wseed + 3.7);
    irTest(vec3(win.x - 0.08, win.y - 0.04, 0.0), vec3(win.z + 0.08, win.y, 0.26), IM_WHITE);
    if (k.x < 0.22) { float x = mix(win.x + 0.1, win.z - 0.35, k.y);
      irTest(vec3(x, win.y, 0.05), vec3(x + 0.18, win.y + 0.15, 0.22), IM_COUNTER);
      irTest(vec3(x - 0.06, win.y + 0.15, 0.03), vec3(x + 0.24, win.y + 0.38 + 0.2 * k.z, 0.25), IM_PLANT); }
    if (k.w < 0.2) { float x = mix(win.x + 0.08, win.z - 0.4, fract(k.y + 0.5));
      irTest(vec3(x, win.y, 0.04), vec3(x + 0.32, win.y + 0.1 + 0.12 * k.z, 0.24), IM_GOODS); }
  }
  vec3 col = irShade(t, R, yF, seed, lit, lampC);
  return mix(col, cov.rgb, cov.a);
}
`;

// ---------------------------------------------------------------------------------------------------------------
// Building use from name / OSM tag / procedural style. Shared by procedural buildings and landmarks.
const RX = {
  library: /librar|stacks|archive/i,
  residential: /dorm|residen|\bunit [0-9]|co-?op|cloyne|casa |lothlorien|stebbins|kingman|euclid hall|ridge house|kidd hall|hoyt|sherman hall|oscar wilde|davis house|wolf house|fenwick|rochdale|apartment|commons|village|manor|suites|foothill|clark kerr|bowles|stern hall|ida sproul|ehrman|cheney|christian hall|deutsch|freeborn|putnam|slottman|towle|davidson|griffiths|cunningham|norton|spens|priestley|cleary|blackwell|martinez|international house|graduate house|faculty house|frat|soror|acacia|alpha|beta |gamma|delta|epsilon|zeta|theta|kappa|lambda|sigma|omega|omicron|upsilon|\bpi\b|\bphi\b|\bchi\b|\bpsi\b|\bxi\b|\btau\b|\brho\b|channing|bowditch|anna head|hillegass|wesley|the standard|the edge|hotel|lofts/i,
  science: /lab(oratory)?\b|chemi|physic|science|bio|genetic|genomic|engineer|research|institute|tech|energy|health|optometry|computer|stanley|tan hall|latimer|pimentel|giauque|hildebrand|lewis hall|koshland|barker|li ka shing|etcheverry|cory|soda hall|sutardja|jacobs|donner|calvin|hesse|mccone|o.brien|davis hall|mining|birge|campbell|evans hall|grimes|weill|valley life|morgan hall|mulford|hilgard|wellman|giannini|bechtel|gilman|le ?conte|minor hall|bakar|greenhouse|oxford|gateway|way west|innovative/i,
  commercial: /caf[eé]|coffee|restaurant|food|dining|union|market|shop|store|retail|bank|plaza|pharmacy|bookstore|pizza|burger|deli|bar\b|grill|kitchen|bakery|tea\b|boba/i,
  assembly: /church|chapel|temple|theat|auditor|playhouse|zellerbach|hertz|pavilion|gym|stadium|arena|recreation|aquatic|museum|club\b/i,
  office: /office|admin|services|sproul hall|california hall|university hall|warren hall|tower|center|law|haas|chou|cheit|student services/i,
};
export function buildingUse({ name = '', tag = '', style = -1, h = 10, x = 0, z = 0, seed = 0 } = {}) {
  const n = String(name || ''), k = String(tag || '').toLowerCase();
  if (RX.library.test(n) || k === 'library') return USE.library;
  if (/dormitory|residential|apartments|house|detached|terrace/.test(k) && !RX.science.test(n)) return k === 'house' || k === 'detached' ? USE.house : USE.residential;
  if (RX.residential.test(n)) return USE.residential;
  if (RX.commercial.test(n) || /retail|commercial|supermarket|kiosk/.test(k)) return USE.commercial;
  if (RX.science.test(n)) return USE.science;
  if (RX.assembly.test(n) || /church|chapel|cathedral|temple|theatre|sports/.test(k)) return USE.assembly;
  if (RX.office.test(n) || /office|civic|government|public/.test(k)) return USE.office;
  if (/industrial|warehouse|garage|shed|greenhouse/.test(k)) return USE.industrial;
  // procedural style fallback (STYLE table in buildings.js)
  const campus = x > -720 && x < 470 && z > -580 && z < 390;   // rough central-campus box
  switch (style) {
    case 5: case 11: return USE.house;
    case 6: return USE.residential;
    case 7: return USE.commercial;
    case 8: return USE.industrial;
    case 9: return USE.assembly;
    default:
      if (campus || /university|college|school/.test(k)) return USE.academic;
      return seed < 0.6 ? USE.residential : USE.office;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Landmark glass: a MeshStandardMaterial that keeps the source glass surface and adds the furnished room behind it.
// Needs per-vertex window frames (aWinO, aWinE) written by prepareWindowGeometry(); without them it renders as plain glass.
const _irMats = new Map();
export function interiorGlassMaterial(src) {
  let m = _irMats.get(src.uuid); if (m) return m;
  m = new THREE.MeshStandardMaterial({ color: src.color ? src.color.clone() : new THREE.Color(0x1b242d), roughness: Math.min(src.roughness ?? 0.1, 0.25), metalness: src.metalness ?? 0.2, envMapIntensity: src.envMapIntensity ?? 1.0, side: src.side });
  // the room supplies the light behind the glass, so the base is a darker version of the source tint
  m.color.multiplyScalar(0.55);
  m.name = (src.name || 'glass') + ':interior'; m.userData.interiorGlass = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = U.uNight;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec4 aWinO; attribute vec4 aWinE; varying vec3 vIrP; varying vec3 vIrC; flat varying vec4 vIrI;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
 { mat4 Mw = modelMatrix;
   #ifdef USE_INSTANCING
   Mw = modelMatrix * instanceMatrix;
   #endif
   vec3 Ow = (Mw * vec4(aWinO.xyz, 1.0)).xyz;
   vec3 Ew = mat3(Mw) * vec3(aWinE.x, 0.0, aWinE.y), Hw = mat3(Mw) * vec3(0.0, aWinE.z, 0.0);
   float Wm = length(Ew), Hm = length(Hw);
   vec3 Tw = Ew / max(Wm, 1e-5), Uw = Hw / max(Hm, 1e-5), Nw = cross(Uw, Tw);
   vec3 dp = (Mw * vec4(transformed, 1.0)).xyz - Ow, dc = cameraPosition - Ow;
   vIrP = vec3(dot(dp, Tw), dot(dp, Uw), -dot(dp, Nw));
   vIrC = vec3(dot(dc, Tw), dot(dc, Uw), -dot(dc, Nw));
   vIrI = vec4(aWinO.w, aWinE.w, Wm, Hm); }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uNight; varying vec3 vIrP; varying vec3 vIrC; flat varying vec4 vIrI;
${INTERIOR_GLSL}
vec3 irGlass(float px) {
  float Wm = vIrI.z, Hm = vIrI.w;
  float code = vIrI.x; int use = int(mod(code, 16.0) + 0.5); float fl0 = mod(floor(code / 16.0 + 0.001), 16.0); float bs = floor(code / 256.0 + 0.001);
  float wseed = vIrI.y;
  vec3 p = vIrP; vec3 dv = vIrP - vIrC; float camD = length(dv); vec3 rd = dv / max(camD, 1e-4);
  vec3 ro, R; vec4 win; float fl, rs, ws;
  float bh = fract(bs * 0.1373 + 0.31);
  if (Wm > 5.2 || Hm > 8.0) { // curtain wall: a grid of rooms with slab edges between floors
    float nx = max(1.0, floor(Wm / 3.6 + 0.5)), ny = max(1.0, floor(Hm / 3.9 + 0.5));
    float cw = Wm / nx, ch = Hm / ny;
    float ci = clamp(floor(p.x / cw), 0.0, nx - 1.0), cj = clamp(floor(p.y / ch), 0.0, ny - 1.0);
    fl = fl0 + cj;
    float Hr = ch - 0.45;
    ro = vec3(p.x - ci * cw, p.y - cj * ch, max(p.z, 0.0));
    if (ro.y > Hr) return vec3(0.012, 0.013, 0.015) * (1.0 - uNight * 0.7);   // spandrel / slab edge
    rs = floor(irH(vec2(ci + wseed, cj * 3.7 + bs)) * 997.0) + fl * 13.0; ws = wseed + ci * 7.1 + cj * 13.3;
    win = vec4(0.0, 0.0, cw, Hr);
    R = vec3(cw, Hr, 0.0);
  } else { // punched window: the room is bigger than the opening
    float mx = max(0.35, (3.4 - Wm) * 0.5), sill = Hm > 2.6 ? 0.3 : 0.9;
    R = vec3(Wm + 2.0 * mx, Hm + sill + 0.45, 0.0);
    ro = vec3(p.x + mx, p.y + sill, max(p.z, 0.0));
    win = vec4(mx, sill, mx + Wm, sill + Hm);
    fl = fl0; rs = floor(fract(wseed * 0.0137) * 997.0) + fl * 13.0; ws = wseed;
  }
  int t = irFloorType(use, fl, irH(vec2(fl + 0.5, bs * 1.37)), bh);
  float rh = fract(rs * 0.618 + 0.11);
  float lit = irLitOf(t, rh);
  R.z = irDepthOf(t, fract(rs * 0.31));
  if (px * 8.0 > min(Wm, Hm)) return irAverage(t, rs, lit, irLampColor(t, fract(rs * 0.618)));
  return irRoom(ro, rd, R, t, rs, ws, lit, win, px, camD);
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 { float irPxL = max(length(fwidth(vIrP.xy)), 1e-4);
   if (vIrI.z > 0.01) {
     vec3 irE = irGlass(irPxL);
     float cosT = clamp(normalize(vIrP - vIrC).z, 0.0, 1.0);
     float F = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
     totalEmissiveRadiance = irE * (1.0 - F) * 0.88;
   } }`);
  };
  m.customProgramCacheKey = () => 'irglass-v1';
  _irMats.set(src.uuid, m);
  return m;
}

// Is this a (opaque) window-glass material? Shared glass, kit glass (nightGlow, dark, smooth, warm emissive) or named glass.
export function isWindowGlass(m, M) {
  if (!m || !m.isMeshStandardMaterial || m.userData.interiorGlass || m.userData.interior === false) return false;
  if (m.transparent && m.opacity < 0.95) return false;
  if (M && (m === M.glass || m === M.windowNight)) return true;
  if (m.roughness > 0.22 || m.map) return false;
  const nm = (m.name || '').toLowerCase();
  if (/glass|window|pane/.test(nm) && !/block|dome|sky|roof|rail|canopy|interior/.test(nm)) return true;
  const e = m.emissive; const c = m.color;
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return m.userData.nightStrength != null && !!e && e.r > 0.5 && e.r >= e.g && e.g >= e.b && lum < 0.35;
}

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

// Write per-vertex window frames (aWinO = bottom-left corner on the outer glass plane + use code, aWinE = width edge
// (x,z), height, seed) for a glass geometry. Triangles are grouped into coplanar islands (one per pane); panes split by
// thin mullions are merged into one window. Returns the geometry to use (may be de-indexed).
export function prepareWindowGeometry(geo, { use = USE.academic, bseed = 0, groundY = 0, toLocal = null, flFixed = -1 } = {}) {
  if (geo.userData.irDone) return geo;
  if (geo.index) geo = geo.toNonIndexed();
  const pos = geo.attributes.position; const nt = Math.floor(pos.count / 3);
  if (!nt) return geo;
  const tri = new Int32Array(nt).fill(-1); const nrm = new Float32Array(nt * 3); const area = new Float32Array(nt);
  const parent = new Int32Array(nt); for (let i = 0; i < nt; i++) parent[i] = i;
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a; };
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const vmap = new Map();
  for (let t = 0; t < nt; t++) {
    A.fromBufferAttribute(pos, t * 3); B.fromBufferAttribute(pos, t * 3 + 1); C.fromBufferAttribute(pos, t * 3 + 2);
    e1.subVectors(B, A); e2.subVectors(C, A); e1.cross(e2); const ar = e1.length() * 0.5; if (ar < 1e-6) continue;
    e1.normalize(); if (Math.abs(e1.y) > 0.4) continue;
    const hl = Math.hypot(e1.x, e1.z); const nx = e1.x / hl, nz = e1.z / hl;
    nrm[t * 3] = nx; nrm[t * 3 + 2] = nz; area[t] = ar; tri[t] = 1;
    const dk = Math.round(Math.atan2(nz, nx) * 30); const off = Math.round((A.x * nx + A.z * nz) * 20);
    for (const P of [A, B, C]) {
      const k = Math.round(P.x * 200) + ',' + Math.round(P.y * 200) + ',' + Math.round(P.z * 200) + '|' + dk + '|' + off;
      const o = vmap.get(k); if (o === undefined) vmap.set(k, t); else uni(o, t);
    }
  }
  // islands
  const isl = new Map();
  for (let t = 0; t < nt; t++) {
    if (tri[t] < 0) continue; const r = find(t); let I = isl.get(r);
    if (!I) isl.set(r, (I = { tris: [], nx: 0, nz: 0, a: 0 }));
    I.tris.push(t); I.nx += nrm[t * 3] * area[t]; I.nz += nrm[t * 3 + 2] * area[t]; I.a += area[t];
  }
  const list = [];
  for (const I of isl.values()) {
    const l = Math.hypot(I.nx, I.nz); if (l < 1e-6) continue; I.nx /= l; I.nz /= l;
    const tx = -I.nz, tz = I.nx; let s0 = Infinity, s1 = -Infinity, y0 = Infinity, y1 = -Infinity, d1 = -Infinity;
    for (const t of I.tris) for (let k = 0; k < 3; k++) {
      const i = t * 3 + k; const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const s = x * tx + z * tz, d = x * I.nx + z * I.nz;
      if (s < s0) s0 = s; if (s > s1) s1 = s; if (y < y0) y0 = y; if (y > y1) y1 = y; if (d > d1) d1 = d;
    }
    Object.assign(I, { s0, s1, y0, y1, d1, id: list.length }); list.push(I);
  }
  // merge panes separated by thin mullions/transoms (same plane, gap < 0.2 m, overlapping in the other axis)
  const P2 = new Int32Array(list.length); for (let i = 0; i < list.length; i++) P2[i] = i;
  const f2 = (i) => { while (P2[i] !== i) { P2[i] = P2[P2[i]]; i = P2[i]; } return i; };
  if (list.length < 3000) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.nx * b.nx + a.nz * b.nz < 0.995 || Math.abs(a.d1 - b.d1) > 0.08) continue;
      const gs = Math.max(a.s0, b.s0) - Math.min(a.s1, b.s1), gy = Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1);
      const ribbon = Math.abs(a.y0 - b.y0) < 0.12 && Math.abs(a.y1 - b.y1) < 0.12 && (a.y1 - a.y0) > 1.6;   // curtain-wall / ribbon panes
      if ((gs < (ribbon ? 0.45 : 0.2) && gy < -0.3) || (gy < 0.2 && gs < -0.3) || (gs < 0 && gy < 0)) { const ra = f2(i), rb = f2(j); if (ra !== rb) P2[rb] = ra; }
    }
  }
  const win = new Map();
  for (const I of list) {
    const r = f2(I.id); let Wd = win.get(r);
    if (!Wd) win.set(r, (Wd = { members: [], nx: 0, nz: 0, a: 0, s0: Infinity, s1: -Infinity, y0: Infinity, y1: -Infinity, d1: -Infinity }));
    Wd.members.push(I); Wd.nx += I.nx * I.a; Wd.nz += I.nz * I.a; Wd.a += I.a;
  }
  const aO = new Float32Array(pos.count * 4), aE = new Float32Array(pos.count * 4);
  const v = new THREE.Vector3();
  for (const Wd of win.values()) {
    const l = Math.hypot(Wd.nx, Wd.nz); const nx = Wd.nx / l, nz = Wd.nz / l, tx = -nz, tz = nx;
    for (const I of Wd.members) for (const t of I.tris) for (let k = 0; k < 3; k++) {
      const i = t * 3 + k; const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const s = x * tx + z * tz, d = x * nx + z * nz;
      if (s < Wd.s0) Wd.s0 = s; if (s > Wd.s1) Wd.s1 = s; if (y < Wd.y0) Wd.y0 = y; if (y > Wd.y1) Wd.y1 = y; if (d > Wd.d1) Wd.d1 = d;
    }
    const Wm = Wd.s1 - Wd.s0, Hm = Wd.y1 - Wd.y0;
    if (Wm < 0.3 || Hm < 0.3 || Wd.a < 0.15) continue;   // tiny lites: plain glass
    const ox = tx * Wd.s0 + nx * Wd.d1, oz = tz * Wd.s0 + nz * Wd.d1, oy = Wd.y0;
    v.set(ox, oy, oz); if (toLocal) v.applyMatrix4(toLocal);
    const fl = flFixed >= 0 ? flFixed : Math.max(0, Math.min(15, Math.floor((v.y - groundY + 0.6) / 3.9)));
    const code = use + 16 * fl + 256 * Math.floor(bseed * 63);
    const ws = Math.floor(hashStr(Math.round(v.x * 10) + ':' + Math.round(v.y * 10) + ':' + Math.round(v.z * 10)) * 1000) + 0.5;
    for (const I of Wd.members) for (const t of I.tris) for (let k = 0; k < 3; k++) {
      const i = (t * 3 + k) * 4;
      aO[i] = ox; aO[i + 1] = oy; aO[i + 2] = oz; aO[i + 3] = code;
      aE[i] = tx * Wm; aE[i + 1] = tz * Wm; aE[i + 2] = Hm; aE[i + 3] = ws;
    }
  }
  geo.setAttribute('aWinO', new THREE.BufferAttribute(aO, 4));
  geo.setAttribute('aWinE', new THREE.BufferAttribute(aE, 4));
  geo.userData.irDone = true;
  return geo;
}

// Give every window-glass mesh in a landmark furnished rooms. info: { id, name, tag, M } (call after merging).
export function applyInteriorGlass(root, info = {}) {
  const use = buildingUse({ name: (info.name || '') + ' ' + (info.id || '').replace(/-/g, ' '), tag: info.tag || '' });
  const bseed = hashStr(info.id || info.name || 'x');
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || !isWindowGlass(o.material, info.M)) return;
    const toLocal = o.isInstancedMesh ? null : new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    o.geometry = prepareWindowGeometry(o.geometry, { use, bseed, groundY: 0, toLocal, flFixed: o.isInstancedMesh ? 1 : -1 });
    o.material = interiorGlassMaterial(o.material); n++;
  });
  return n;
}
