// Berkeley Simulator — photographic tree library built on EZ-Tree.
//
// Branch skeletons come from EZ-Tree (MIT License, (c) Daniel Greenheck, https://github.com/dgreenheck/ez-tree).
// ezSkeleton() below is a port of ez-tree/src/lib/tree.js generate() that consumes ez-tree's RNG in exactly the
// same order, so ez-tree presets reproduce. We port instead of importing Tree because tree.js imports
// textures.js, which loads all 20 of ez-tree's images at import time; here each photographic bark/leaf image is
// imported individually so the bundle only carries the ones used. (The package's "exports" map only exposes
// ".", so src/lib files are reached by relative path.)
//
// API (same as ./trees.js):
//   const lib = createTreeLibrary({ season: 'late-autumn', leafTexSize: 1024 });
//   lib.species.oak = { lods: [lod0, lod1, lod2], normHeight: 1, normRadius, crownBase, trunkRadius, typical, name }
//   lod = { parts: [{ geometry, material, depthMaterial, distanceMaterial, castShadow, receiveShadow, kind }], triangles }
//   lib.update(dt)  lib.setViewportHeight(px)  lib.ready (Promise: leaf textures decoded + far impostors baked)
// Geometry is normalised to height 1 with the trunk base at the origin; the engine instances it as
// T(x, ground, z) · Ry · S(crownR / normRadius, height, crownR / normRadius). Leaf cards are re-scaled uniformly
// about their twig attachment in the vertex shader, so non-uniform instance scales never stretch leaves.
// TINT_MODE = 'relative': instanceColor is a per-tree multiplier around 1.0 (aerial-photo tint relative to the
// species mean). Leaves use it (damped, mostly luminance); bark ignores it.
import * as THREE from 'three';
import { U } from '../materials.js';
import { TREE_WIND_DIR } from './tree-shaders.js';
import { createTreeLibrary as createProceduralLibrary } from './trees.js';
import RNG from '../../node_modules/@dgreenheck/ez-tree/src/lib/rng.js';
import P_OAK_L from '../../node_modules/@dgreenheck/ez-tree/src/lib/presets/oak_large.json';
import P_OAK_M from '../../node_modules/@dgreenheck/ez-tree/src/lib/presets/oak_medium.json';
import P_ASH_M from '../../node_modules/@dgreenheck/ez-tree/src/lib/presets/ash_medium.json';
import P_ASH_L from '../../node_modules/@dgreenheck/ez-tree/src/lib/presets/ash_large.json';
import P_ASPEN_M from '../../node_modules/@dgreenheck/ez-tree/src/lib/presets/aspen_medium.json';
import P_PINE_M from '../../node_modules/@dgreenheck/ez-tree/src/lib/presets/pine_medium.json';
import P_PINE_L from '../../node_modules/@dgreenheck/ez-tree/src/lib/presets/pine_large.json';
import P_BUSH_1 from '../../node_modules/@dgreenheck/ez-tree/src/lib/presets/bush_1.json';
import BARK_OAK_C from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/bark/oak_color_1k.jpg';
import BARK_OAK_N from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/bark/oak_normal_1k.jpg';
import BARK_PINE_C from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/bark/pine_color_1k.jpg';
import BARK_PINE_N from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/bark/pine_normal_1k.jpg';
import BARK_BIRCH_C from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/bark/birch_color_1k.jpg';
import BARK_BIRCH_N from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/bark/birch_normal_1k.jpg';
import BARK_WILLOW_C from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/bark/willow_color_1k.jpg';
import BARK_WILLOW_N from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/bark/willow_normal_1k.jpg';
import LEAF_OAK from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/leaves/oak_color.png';
import LEAF_ASH from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/leaves/ash_color.png';
import LEAF_ASPEN from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/leaves/aspen_color.png';
import LEAF_PINE from '../../node_modules/@dgreenheck/ez-tree/src/lib/assets/leaves/pine_color.png';

export const TINT_MODE = 'relative';
export const TREE_REF_TINT = new THREE.Color(1, 1, 1); // pass as TreeSystem refTint: instanceColor becomes a ~1.0 multiplier
export { TREE_WIND_DIR };

const BARK_SRC = { oak: [BARK_OAK_C, BARK_OAK_N], pine: [BARK_PINE_C, BARK_PINE_N], birch: [BARK_BIRCH_C, BARK_BIRCH_N], willow: [BARK_WILLOW_C, BARK_WILLOW_N] };
const LEAF_SRC = { oak: LEAF_OAK, ash: LEAF_ASH, aspen: LEAF_ASPEN, pine: LEAF_PINE };

// ------------------------------------------------------------------------------------------------ helpers
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) { const o = structuredClone(a); (function rec(t, s) { for (const k in s) { if (isObj(s[k]) && isObj(t[k])) rec(t[k], s[k]); else t[k] = structuredClone(s[k]); } })(o, b || {}); return o; }
function hash1(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function percentile(arr, q) { if (!arr.length) return 0; const a = Float32Array.from(arr).sort(); return a[Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))))]; }
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _Y = V3(0, 1, 0), _X = V3(1, 0, 0);
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linCol = (hex) => new THREE.Color(hex); // THREE.Color(hex) converts sRGB hex to linear working space

// ------------------------------------------------------------------------------------------------ species
// typical = median of the campus LiDAR trees of that class (height m, crown radius m); geometry is designed near
// those proportions so the median tree is instanced with a near-uniform scale.
// clump: foliage is grouped into clumps (voxel clusters of ez-tree's leaf placements, cell m); each clump is a ball
//   of outward-facing cards (LOD0) or a few big cards (LOD1). r = clump radius / cell, flat = vertical squash.
// leaf: tex = ez-tree leaf photo; card = LOD0 card size (m); stamp = twig-photo size as a fraction of a card;
//   pal = per-tree palette (sRGB), sec = share of cards in a second palette colour, vary = per-card brightness spread.
// shade: normal blend weights [crown, clump, card].
const SPECIES = {
  oak: {
    name: 'Coast live oak', typical: { height: 9.6, crownR: 6.2 },
    ez: merge(P_OAK_M, { seed: 4127, branch: { levels: 3, angle: { 1: 56, 2: 44, 3: 40 }, children: { 0: 6, 1: 7, 2: 5 },
      gnarliness: { 0: 0.04, 1: 0.1, 2: 0.16, 3: 0.12 }, length: { 0: 12, 1: 36, 2: 16, 3: 7 }, radius: { 0: 4.0, 1: 0.88, 2: 0.5, 3: 0.6 },
      sections: { 0: 4, 1: 8, 2: 5, 3: 3 }, segments: { 0: 14, 1: 10, 2: 5, 3: 3 }, start: { 1: 0.62, 2: 0.2, 3: 0.2 }, taper: { 0: 0.3, 1: 0.55, 2: 0.8, 3: 0.75 },
      twist: { 0: 0, 1: 0, 2: 0, 3: 0 }, force: { strength: -0.004 } }, leaves: { count: 12, size: 3.0, sizeVariance: 0.3, angle: 40, start: 0.0 } }),
    ezx: { noLeader: true, flare: 0.6, flatTop: [0.8, 0.65], elbow: { 1: 0.26, 2: 0.2 }, forceL: { 1: -0.005, 2: 0.003, 3: 0.004 }, noDown: true },
    clump: { cell: 1.5, r: 0.9, flat: 0.8, fill: 1.6, gap: 0.6, cone: 0.82, perMass: true, under: 0.3, minY: 3.8, skirt: 0.3, face: 0.35, lift: 0.15, inner: 0.12, radial: 0.12, clumpAO: 0.45 },
    bark: { tex: 'oak', tint: '#ffffff', sat: 0.15, bright: 1.7, tile: [0.9, 1.3] },
    leaf: { tex: 'aspen', card: 1.2, stamp: 0.2, layout: 'jumble', layers: 1.1, bb: true, bbTilt: 0.9, pal: ['#6c7a4c', '#768452', '#637048', '#808c5a'], sec: 0.3, vary: 0.22, keepHue: 0.15, tintK: 0.55, tintSat: 0.3, density: 1.0, rough: 0.42, spec: 0.5, wrap: 0.3, back: 0.55, fill: 0.04 },
    shade: [0.22, 0.5, 0.12, 0.25], crown: { mode: 'ellipsoid', aoMin: 0.42 }, sway: [0.005, 0.012], lodK: [0.85, 0.5, 0.8],
    lod0: { maxLevel: 3, minR: 0.035, segs: [12, 7, 4, 3], stride: [1, 1, 2, 1] }, lod1: { maxLevel: 1, minR: 0.06, segs: [7, 4, 3, 3], stride: [3, 3, 3, 3] },
  },
  plane: {
    name: 'London plane', typical: { height: 12, crownR: 4.8 },
    ez: merge(P_ASH_M, { seed: 2202, branch: { levels: 3, angle: { 1: 38, 2: 40, 3: 45 }, children: { 0: 6, 1: 5, 2: 4 }, length: { 0: 34, 1: 22, 2: 10, 3: 4 },
      radius: { 0: 1.9, 1: 0.62, 2: 0.55, 3: 0.6 }, start: { 1: 0.42, 2: 0.25, 3: 0.15 }, sections: { 0: 10, 1: 9, 2: 5, 3: 3 }, segments: { 0: 12, 1: 7, 2: 4, 3: 3 },
      gnarliness: { 0: 0.03, 1: 0.18, 2: 0.2, 3: 0.12 }, taper: { 0: 0.6, 1: 0.65, 2: 0.7, 3: 0.7 }, force: { strength: 0.01 } }, leaves: { count: 9, size: 3.0, sizeVariance: 0.35, angle: 45, start: 0.0 } }),
    ezx: { flare: 0.35 },
    clump: { cell: 1.6, r: 0.72, flat: 0.85, fill: 0.9, gap: 0.85, under: 0.4, minY: 4.2, skirt: 0.25, face: 0.45, lift: 0.1, inner: 0.25 },
    bark: { tex: 'birch', tint: '#c2bca6', sat: 0.6, tile: [0.8, 1.2], patches: 'plane' },
    leaf: { tex: 'oak', card: 1.15, stamp: 0.36, layers: 1.0, pal: ['#b89a52', '#a8884a', '#c4a860', '#9a7a44', '#b0985a'], sec: 0.4, vary: 0.3, keepHue: 0.08, tintK: 0.3, tintSat: 0.1, density: 0.45, rough: 0.85, spec: 0.15, wrap: 0.32, back: 0.7 },
    shade: [0.28, 0.4, 0.15, 0.21], crown: { mode: 'ellipsoid', aoMin: 0.57 }, sway: [0.007, 0.016], lodK: [0.85, 0.55, 0.85],
    lod0: { maxLevel: 3, minR: 0.006, segs: [12, 7, 4, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 2, minR: 0.04, segs: [6, 4, 3, 3], stride: [2, 3, 3, 3] },
  },
  redwood: {
    name: 'Coast redwood', typical: { height: 15, crownR: 2.8 },
    ez: merge(P_PINE_M, { seed: 4404, type: 'evergreen', branch: { levels: 2, angle: { 1: 100, 2: 38 }, children: { 0: 60, 1: 6 }, length: { 0: 60, 1: 17, 2: 6 },
      radius: { 0: 1.7, 1: 0.2, 2: 0.6 }, start: { 1: 0.12, 2: 0.12 }, sections: { 0: 14, 1: 5, 2: 3 }, segments: { 0: 12, 1: 4, 2: 3 },
      gnarliness: { 0: 0.01, 1: 0.1, 2: 0.12 }, force: { strength: -0.008 } }, leaves: { count: 5, size: 3.2, sizeVariance: 0.3, angle: 35, start: 0.05 } }),
    ezx: { flare: 0.55, whorls: 16 },
    clump: { mode: 'spray', minY: 3.4, alongK: 0.8, outK: 0.3, droop: 0.22, flat: 0.72, roll: 0.8 },
    bark: { tex: 'pine', tint: '#d99a7c', sat: 1.0, tile: [0.6, 2.2] },
    leaf: { tex: 'pine', card: 1.1, stamp: 0.26, layout: 'feather', pal: ['#3e5a30', '#486436', '#36502b', '#567038'], sec: 0.35, vary: 0.25, keepHue: 0.12, tintK: 0.5, tintSat: 0.3, density: 0.85, rough: 0.8, spec: 0.2, wrap: 0.32, back: 0.35 },
    shade: [0.45, 0.0, 0.55, 0.0], crown: { mode: 'cone', aoMin: 0.54 }, sway: [0.004, 0.01], lodK: [0.85, 0.55, 0.85], vary: [0.03, 0.2],
    lod0: { maxLevel: 2, minR: 0.012, segs: [12, 4, 3, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 1, minR: 0.05, segs: [6, 3, 3, 3], stride: [2, 2, 2, 2] },
  },
  eucalyptus: {
    name: 'Blue gum eucalyptus', typical: { height: 23, crownR: 7.0 },
    ez: merge(P_ASH_L, { seed: 5505, branch: { levels: 3, angle: { 1: 34, 2: 42, 3: 50 }, children: { 0: 7, 1: 4, 2: 4 }, length: { 0: 46, 1: 28, 2: 12, 3: 5 },
      radius: { 0: 2.4, 1: 0.5, 2: 0.6, 3: 0.7 }, start: { 1: 0.45, 2: 0.3, 3: 0.2 }, sections: { 0: 12, 1: 9, 2: 5, 3: 3 }, segments: { 0: 12, 1: 6, 2: 4, 3: 3 },
      gnarliness: { 0: 0.04, 1: 0.22, 2: 0.22, 3: 0.12 }, force: { strength: 0.004 } }, leaves: { count: 9, size: 4.0, sizeVariance: 0.35, angle: 150, start: 0.15 } }),
    ezx: { flare: 0.4 },
    clump: { cell: 2.2, r: 0.7, flat: 1.15, fill: 0.9, gap: 0.9, under: 0.8, minY: 7.0, skirt: 0.2, face: 0.2, lift: -0.45, inner: 0.25 },
    bark: { tex: 'birch', tint: '#e8dfcc', sat: 0.6, tile: [0.9, 1.5], rot: true, patches: 'euc' },
    leaf: { tex: 'ash', card: 1.3, stamp: 0.34, layers: 1.2, pal: ['#7a8f80', '#86998a', '#6e8476', '#8e9e84'], sec: 0.35, vary: 0.25, keepHue: 0.08, tintK: 0.5, tintSat: 0.3, density: 0.85, rough: 0.7, spec: 0.3, wrap: 0.32, back: 0.4 },
    shade: [0.24, 0.4, 0.15, 0.21], crown: { mode: 'ellipsoid', aoMin: 0.57 }, sway: [0.007, 0.02], lodK: [0.85, 0.55, 0.85],
    lod0: { maxLevel: 3, minR: 0.012, segs: [12, 6, 4, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 1, minR: 0.06, segs: [6, 4, 3, 3], stride: [2, 3, 3, 3] },
  },
  pine: {
    name: 'Monterey pine', typical: { height: 8.9, crownR: 3.2 },
    ez: merge(P_PINE_M, { seed: 6606, type: 'evergreen', branch: { levels: 2, angle: { 1: 78, 2: 38 }, children: { 0: 30, 1: 6 }, length: { 0: 40, 1: 24, 2: 8 },
      radius: { 0: 1.5, 1: 0.35, 2: 0.6 }, start: { 1: 0.22, 2: 0.25 }, sections: { 0: 12, 1: 6, 2: 3 }, segments: { 0: 11, 1: 5, 2: 3 },
      gnarliness: { 0: 0.03, 1: 0.14, 2: 0.15 }, force: { strength: 0.012 } }, leaves: { count: 8, size: 3.4, sizeVariance: 0.3, angle: 35, start: 0.25 } }),
    ezx: { flare: 0.35 },
    clump: { cell: 1.3, r: 0.72, flat: 0.75, fill: 1.1, gap: 0.8, under: 0.5, minY: 2.4, skirt: 0.3, face: 0.35, lift: 0.35, inner: 0.2 },
    bark: { tex: 'pine', tint: '#b8a69c', sat: 0.8, tile: [0.8, 1.2] },
    leaf: { tex: 'pine', card: 0.9, stamp: 0.32, layers: 1.5, pal: ['#3c5a30', '#466435', '#35522b'], sec: 0.35, vary: 0.22, keepHue: 0.12, tintK: 0.5, tintSat: 0.3, density: 1.0, rough: 0.8, spec: 0.25, wrap: 0.32, back: 0.3 },
    shade: [0.28, 0.4, 0.15, 0.21], crown: { mode: 'ellipsoid', aoMin: 0.50 }, sway: [0.005, 0.01], lodK: [0.85, 0.55, 0.85],
    lod0: { maxLevel: 2, minR: 0.012, segs: [11, 5, 3, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 1, minR: 0.05, segs: [6, 4, 3, 3], stride: [2, 2, 2, 2] },
  },
  cedar: {
    name: 'Deodar cedar', typical: { height: 12.4, crownR: 3.4 },
    ez: merge(P_PINE_M, { seed: 7707, type: 'evergreen', branch: { levels: 2, angle: { 1: 94, 2: 36 }, children: { 0: 40, 1: 7 }, length: { 0: 55, 1: 24, 2: 8 },
      radius: { 0: 1.5, 1: 0.25, 2: 0.6 }, start: { 1: 0.1, 2: 0.12 }, sections: { 0: 12, 1: 6, 2: 3 }, segments: { 0: 11, 1: 4, 2: 3 },
      gnarliness: { 0: 0.015, 1: 0.1, 2: 0.12 }, force: { strength: -0.005 } }, leaves: { count: 5, size: 3.0, sizeVariance: 0.3, angle: 30, start: 0.05 } }),
    ezx: { flare: 0.35, whorls: 13 },
    clump: { mode: 'spray', minY: 2.4, alongK: 0.8, outK: 0.3, droop: 0.4, flat: 0.7, roll: 0.8 },
    bark: { tex: 'pine', tint: '#a39890', sat: 0.45, tile: [0.8, 1.2] },
    leaf: { tex: 'pine', card: 1.15, stamp: 0.28, layout: 'feather', pal: ['#5a7062', '#647a6a', '#52685a'], sec: 0.35, vary: 0.22, keepHue: 0.06, tintK: 0.5, tintSat: 0.3, density: 0.85, rough: 0.8, spec: 0.25, wrap: 0.32, back: 0.25 },
    shade: [0.45, 0.0, 0.55, 0.0], crown: { mode: 'cone', aoMin: 0.54 }, sway: [0.004, 0.01], lodK: [0.85, 0.55, 0.85], vary: [0.04, 0.2],
    lod0: { maxLevel: 2, minR: 0.012, segs: [11, 4, 3, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 1, minR: 0.05, segs: [6, 3, 3, 3], stride: [2, 2, 2, 2] },
  },
  cypress: {
    name: 'Italian cypress', typical: { height: 12.5, crownR: 1.5 },
    ez: merge(P_PINE_M, { seed: 8808, type: 'evergreen', branch: { levels: 2, angle: { 1: 16, 2: 18 }, children: { 0: 64, 1: 4 }, length: { 0: 50, 1: 14, 2: 5 },
      radius: { 0: 1.0, 1: 0.3, 2: 0.6 }, start: { 1: 0.03, 2: 0.2 }, sections: { 0: 10, 1: 4, 2: 3 }, segments: { 0: 9, 1: 3, 2: 3 },
      gnarliness: { 0: 0.01, 1: 0.05, 2: 0.1 }, force: { strength: 0.02 } }, leaves: { count: 6, size: 3.2, sizeVariance: 0.3, angle: 15, start: 0.1 } }),
    clump: { cell: 0.8, r: 0.8, flat: 1.25, fill: 1.4, gap: 0.65, under: 0.8, minY: 0.6, skirt: 0, face: 0.6, lift: 0.4, inner: 0.15 },
    bark: { tex: 'pine', tint: '#a08a7c', sat: 0.7, tile: [0.6, 1.0] },
    leaf: { tex: 'pine', card: 0.7, stamp: 0.3, layers: 1.6, pal: ['#34502c', '#3c5a32', '#2f4a28'], sec: 0.35, vary: 0.2, keepHue: 0.08, tintK: 0.5, tintSat: 0.3, density: 1.0, rough: 0.85, spec: 0.2, wrap: 0.4, back: 0.2 },
    shade: [0.44, 0.4, 0.10, 0.14], crown: { mode: 'ellipsoid', aoMin: 0.52 }, sway: [0.004, 0.006], lodK: [0.85, 0.55, 0.85],
    lod0: { maxLevel: 2, minR: 0.015, segs: [9, 3, 3, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 0, minR: 0.05, segs: [6, 3, 3, 3], stride: [2, 2, 2, 2] },
  },
  deciduous: {
    name: 'Deciduous (maple / sweetgum / elm)', typical: { height: 8.3, crownR: 3.3 },
    ez: merge(P_ASH_M, { seed: 9909, branch: { levels: 3, angle: { 1: 42, 2: 46, 3: 45 }, children: { 0: 7, 1: 5, 2: 4 }, length: { 0: 28, 1: 18, 2: 9, 3: 4 },
      radius: { 0: 1.4, 1: 0.55, 2: 0.6, 3: 0.6 }, start: { 1: 0.35, 2: 0.25, 3: 0.15 }, sections: { 0: 10, 1: 8, 2: 5, 3: 3 }, segments: { 0: 11, 1: 6, 2: 4, 3: 3 },
      gnarliness: { 0: 0.04, 1: 0.16, 2: 0.2, 3: 0.1 }, force: { strength: 0.008 } }, leaves: { count: 9, size: 3.0, sizeVariance: 0.35, angle: 45, start: 0.0 } }),
    clump: { cell: 1.35, r: 0.75, flat: 0.85, fill: 1.2, gap: 0.75, under: 0.45, minY: 2.6, skirt: 0.3, face: 0.45, lift: 0.15, inner: 0.2 },
    bark: { tex: 'willow', tint: '#b0a89c', sat: 0.8, tile: [0.7, 1.1] },
    leaf: { tex: 'oak', card: 0.95, stamp: 0.32, layers: 1.35, pal: ['#d9b040', '#e08a35', '#b84a2e', '#8a9a40', '#c99a38', '#e8c450'], sec: 0.3, vary: 0.3, keepHue: 0.1, tintK: 0.3, tintSat: 0.15, density: 0.75, rough: 0.8, spec: 0.2, wrap: 0.32, back: 0.7 },
    shade: [0.28, 0.4, 0.15, 0.21], crown: { mode: 'ellipsoid', aoMin: 0.54 }, sway: [0.007, 0.016], lodK: [0.85, 0.55, 0.85],
    lod0: { maxLevel: 3, minR: 0.006, segs: [11, 6, 4, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 2, minR: 0.04, segs: [6, 4, 3, 3], stride: [2, 3, 3, 3] },
  },
  ginkgo: {
    name: 'Ginkgo', typical: { height: 8.9, crownR: 3.0 },
    ez: merge(P_ASPEN_M, { seed: 1010, branch: { levels: 3, angle: { 1: 38, 2: 40, 3: 40 }, children: { 0: 9, 1: 4, 2: 4 }, length: { 0: 34, 1: 15, 2: 7, 3: 3 },
      radius: { 0: 1.1, 1: 0.45, 2: 0.6, 3: 0.6 }, start: { 1: 0.28, 2: 0.25, 3: 0.15 }, sections: { 0: 10, 1: 7, 2: 4, 3: 3 }, segments: { 0: 10, 1: 5, 2: 4, 3: 3 },
      gnarliness: { 0: 0.02, 1: 0.12, 2: 0.15, 3: 0.1 }, taper: { 0: 0.8, 1: 0.6, 2: 0.7, 3: 0.7 }, force: { strength: 0.014 } }, leaves: { count: 8, size: 2.8, sizeVariance: 0.35, angle: 35, start: 0.05 } }),
    clump: { cell: 1.25, r: 0.72, flat: 0.9, fill: 1.1, gap: 0.8, under: 0.5, minY: 2.4, skirt: 0.2, face: 0.4, lift: 0.3, inner: 0.2 },
    bark: { tex: 'willow', tint: '#a39a8e', sat: 0.7, tile: [0.7, 1.1] },
    leaf: { tex: 'aspen', card: 0.9, stamp: 0.3, layers: 1.35, pal: ['#f5cc40', '#eebc30', '#f8da55', '#e4b830'], sec: 0.3, vary: 0.25, keepHue: 0.3, tintK: 0.25, tintSat: 0.1, density: 0.85, rough: 0.8, spec: 0.2, wrap: 0.32, back: 0.75 },
    shade: [0.28, 0.4, 0.15, 0.21], crown: { mode: 'ellipsoid', aoMin: 0.62 }, sway: [0.007, 0.016], lodK: [0.85, 0.55, 0.85],
    lod0: { maxLevel: 3, minR: 0.006, segs: [10, 5, 4, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 2, minR: 0.04, segs: [6, 4, 3, 3], stride: [2, 3, 3, 3] },
  },
  magnolia: {
    name: 'Southern magnolia', typical: { height: 8.6, crownR: 3.0 },
    ez: merge(P_OAK_M, { seed: 1111, branch: { levels: 3, angle: { 1: 55, 2: 48, 3: 45 }, children: { 0: 11, 1: 4, 2: 3 }, length: { 0: 34, 1: 14, 2: 7, 3: 3 },
      radius: { 0: 1.2, 1: 0.5, 2: 0.6, 3: 0.6 }, start: { 1: 0.12, 2: 0.25, 3: 0.15 }, sections: { 0: 10, 1: 6, 2: 4, 3: 3 }, segments: { 0: 10, 1: 5, 2: 3, 3: 3 },
      gnarliness: { 0: 0.02, 1: 0.1, 2: 0.15, 3: 0.1 }, taper: { 0: 0.85, 1: 0.6, 2: 0.7, 3: 0.7 }, force: { strength: 0.006 } }, leaves: { count: 9, size: 3.0, sizeVariance: 0.3, angle: 40, start: 0.05 } }),
    clump: { cell: 1.25, r: 0.8, flat: 0.9, fill: 1.4, gap: 0.65, under: 0.6, minY: 1.0, skirt: 0.3, face: 0.55, lift: 0.15, inner: 0.15 },
    bark: { tex: 'willow', tint: '#a09a91', sat: 0.6, tile: [0.7, 1.1] },
    leaf: { tex: 'aspen', card: 1.1, stamp: 0.42, layers: 1.6, pal: ['#3e5a2e', '#466435', '#4e6a38', '#3a5229'], sec: 0.3, vary: 0.25, keepHue: 0.08, tintK: 0.5, tintSat: 0.3, density: 1.0, rough: 0.4, spec: 0.55, wrap: 0.4, back: 0.2 },
    shade: [0.32, 0.4, 0.15, 0.17], crown: { mode: 'ellipsoid', aoMin: 0.50 }, sway: [0.005, 0.008], lodK: [0.85, 0.55, 0.85],
    lod0: { maxLevel: 3, minR: 0.012, segs: [10, 5, 3, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 1, minR: 0.05, segs: [6, 4, 3, 3], stride: [2, 3, 3, 3] },
  },
  bay: {
    name: 'California bay laurel', typical: { height: 12.6, crownR: 5.0 },
    ez: merge(P_OAK_M, { seed: 1212, branch: { levels: 3, angle: { 1: 40, 2: 46, 3: 45 }, children: { 0: 6, 1: 5, 2: 4 }, length: { 0: 18, 1: 26, 2: 10, 3: 4 },
      radius: { 0: 1.2, 1: 0.6, 2: 0.6, 3: 0.6 }, start: { 1: 0.25, 2: 0.25, 3: 0.15 }, sections: { 0: 7, 1: 8, 2: 5, 3: 3 }, segments: { 0: 9, 1: 6, 2: 4, 3: 3 },
      gnarliness: { 0: 0.05, 1: 0.14, 2: 0.18, 3: 0.1 }, force: { strength: 0.01 } }, leaves: { count: 9, size: 3.0, sizeVariance: 0.35, angle: 40, start: 0.05 } }),
    trunks: [{ x: 0, z: 0, tilt: 0.12, yaw: 0, seed: 0, s: 1 }, { x: 0.6, z: 0.4, tilt: 0.28, yaw: 2.2, seed: 17, s: 0.9 }, { x: -0.5, z: 0.5, tilt: 0.3, yaw: 4.1, seed: 33, s: 0.85 }],
    clump: { cell: 1.6, r: 0.8, flat: 0.85, fill: 1.3, gap: 0.7, under: 0.45, minY: 2.0, skirt: 0.4, face: 0.5, lift: 0.2, inner: 0.15 },
    bark: { tex: 'willow', tint: '#9e988e', sat: 0.6, tile: [0.7, 1.1] },
    leaf: { tex: 'ash', card: 1.0, stamp: 0.3, layers: 1.55, pal: ['#6b7a3a', '#748442', '#627036', '#7c8a48'], sec: 0.3, vary: 0.25, keepHue: 0.08, tintK: 0.55, tintSat: 0.35, density: 1.0, rough: 0.6, spec: 0.35, wrap: 0.32, back: 0.35 },
    shade: [0.28, 0.4, 0.15, 0.21], crown: { mode: 'ellipsoid', aoMin: 0.50 }, sway: [0.005, 0.01], lodK: [0.85, 0.55, 0.85],
    lod0: { maxLevel: 3, minR: 0.015, segs: [9, 6, 4, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 1, minR: 0.05, segs: [5, 4, 3, 3], stride: [2, 3, 3, 3] },
  },
  shrub: {
    name: 'Shrub / large bush', typical: { height: 3.8, crownR: 1.5 },
    ez: merge(P_BUSH_1, { seed: 1414, branch: { levels: 3, angle: { 1: 30, 2: 50, 3: 45 }, children: { 0: 10, 1: 4, 2: 3 }, length: { 0: 0.5, 1: 16, 2: 7, 3: 3 },
      radius: { 0: 0.6, 1: 0.7, 2: 0.6, 3: 0.6 }, start: { 1: 0.0, 2: 0.2, 3: 0.15 }, sections: { 0: 3, 1: 6, 2: 4, 3: 3 }, segments: { 0: 5, 1: 4, 2: 3, 3: 3 },
      gnarliness: { 0: 0.05, 1: 0.12, 2: 0.15, 3: 0.1 }, force: { strength: 0.0 } }, leaves: { count: 9, size: 2.6, sizeVariance: 0.3, angle: 45, start: 0.0 } }),
    clump: { cell: 0.7, r: 0.8, flat: 0.9, fill: 1.5, gap: 0.6, under: 0.8, minY: 0.12, skirt: 0, face: 0.55, lift: 0.2, inner: 0.15 },
    bark: { tex: 'willow', tint: '#8f857a', sat: 0.7, tile: [0.5, 0.8] },
    leaf: { tex: 'aspen', card: 0.55, stamp: 0.3, layers: 1.6, pal: ['#4e6e36', '#58783c', '#466430'], sec: 0.35, vary: 0.22, keepHue: 0.1, tintK: 0.55, tintSat: 0.35, density: 1.0, rough: 0.6, spec: 0.35, wrap: 0.32, back: 0.3 },
    shade: [0.36, 0.4, 0.15, 0.17], crown: { mode: 'ellipsoid', aoMin: 0.50 }, sway: [0.004, 0.01], lodK: [0.85, 0.55, 0.85],
    lod0: { maxLevel: 3, minR: 0.006, segs: [5, 4, 3, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 1, minR: 0.02, segs: [4, 3, 3, 3], stride: [2, 2, 2, 2] },
  },
};
// The Campanile Esplanade's pollarded planes: short trunk, a few stout limbs ending in knobbly fists, thin whips,
// almost bare in late November (built from the plane bark/leaf setup with a custom skeleton).
SPECIES.planePollard = {
  name: 'Pollarded London plane', typical: { height: 7.1, crownR: 3.0 }, pollard: { limbs: 5, trunkH: 2.6, limbLen: [1.6, 2.2], limbUp: [0.55, 0.85], knobR: 0.2, whips: 7, whipLen: [0.8, 1.8], limbR: 0.13, trunkR: 0.24 },
  clump: { cell: 0.5, r: 0.5, flat: 1, single: true, minY: 0 },
  bark: { ...SPECIES.plane.bark, tile: [0.6, 0.9] },
  leaf: { ...SPECIES.plane.leaf, card: 0.5, stamp: 0.8, pal: ['#b0904a', '#9c7c42', '#bc9e55', '#8c6c3c'], density: 1.0 },
  shade: [0.16, 0.4, 0.50, 0.00], crown: { mode: 'ellipsoid', aoMin: 0.72 }, sway: [0.004, 0.012], lodK: [0.9, 0.7, 0.9],
  lod0: { maxLevel: 3, minR: 0.004, segs: [10, 7, 4, 3], stride: [1, 1, 1, 1] }, lod1: { maxLevel: 2, minR: 0.02, segs: [6, 5, 3, 3], stride: [1, 2, 2, 2] },
};
export const TREE_SPECIES = [...Object.keys(SPECIES), 'palm'];

// ------------------------------------------------------------------------------------------------ EZ-Tree port
// Port of ez-tree's Tree.generate() (branch recursion, child placement, leaves). Output is a skeleton
// (rings + leaf placements) in ez-tree units instead of geometry, so each LOD can be meshed from one skeleton.
function ezSkeleton(o, x = {}) {
  const rng = new RNG(o.seed), b = o.branch, L = o.leaves, lv = b.levels;
  const deciduous = o.type === 'deciduous';
  const branches = [], leaves = [], knobs = [];
  const qForce = new THREE.Quaternion().setFromUnitVectors(_Y, V3().copy(b.force.direction ?? { x: 0, y: 1, z: 0 }));
  const queue = [{ o: V3(), e: new THREE.Euler(), len: b.length[0], r: b.radius[0], level: 0, nSec: b.sections[0], nSeg: b.segments[0], parent: -1 }];
  let curBr = -1;
  const leafAt = (origin, e, be) => { const s = L.size * (1 + rng.random(L.sizeVariance, -L.sizeVariance)); leaves.push({ o: origin.clone(), e: e.clone(), size: s, br: curBr, bd: V3(0, 1, 0).applyEuler(be || e) }); };
  const interp = (secs, t) => {
    const n = secs.length - 1, si = Math.floor(t * n), A = secs[si], B = si === n ? A : secs[si + 1];
    const alpha = (t - si / n) / (1 / n);
    const qA = new THREE.Quaternion().setFromEuler(A.e), qB = new THREE.Quaternion().setFromEuler(B.e);
    return { origin: V3().lerpVectors(A.o, B.o, alpha), e: new THREE.Euler().setFromQuaternion(qB.slerp(qA, alpha)), A, B, alpha };
  };
  const orient = (pe, deg, radial) => {
    const q1 = new THREE.Quaternion().setFromAxisAngle(_X, deg / (180 / Math.PI)), q2 = new THREE.Quaternion().setFromAxisAngle(_Y, radial);
    return new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromEuler(pe).multiply(q2.multiply(q1)));
  };
  const qTw = new THREE.Quaternion(), qS = new THREE.Quaternion(), step = V3();
  while (queue.length) {
    const br = queue.shift();
    const e = br.e.clone(), org = br.o.clone(), secLen = br.len / br.nSec, secs = [];
    for (let i = 0; i <= br.nSec; i++) {
      let r = br.r;
      if (i === br.nSec && br.level === lv) r = 0.001;
      else if (deciduous) r *= 1 - b.taper[br.level] * (i / br.nSec);
      else r *= 1 - i / br.nSec;
      secs.push({ o: org.clone(), e: e.clone(), r });
      org.add(step.set(0, secLen, 0).applyEuler(e));
      const g = Math.max(1, 1 / Math.sqrt(r)) * b.gnarliness[br.level];
      e.x += rng.random(g, -g); e.z += rng.random(g, -g);
      qS.setFromEuler(e).multiply(qTw.setFromAxisAngle(_Y, b.twist[br.level] ?? 0));
      qS.rotateTowards(qForce, (x.forceL?.[br.level] ?? b.force.strength) / r);
      if (x.elbow && x.elbow[br.level] && i % 2 === 1 && i < br.nSec) { // crooked limbs: alternate dips and rises about the branch's horizontal side axis
        const dir = step.set(0, 1, 0).applyQuaternion(qS), side = V3().crossVectors(dir, _Y);
        if (side.lengthSq() > 1e-6) { side.normalize(); const k = x.elbow[br.level] * ((i >> 1) % 2 ? 1 : -1) * (0.6 + 0.8 * hash1(branches.length * 7.3 + i)); qS.premultiply(qTw.setFromAxisAngle(side, k)); }
      }
      e.setFromQuaternion(qS);
    }
    const idx = branches.length; curBr = idx;
    branches.push({ level: br.level, secs, nSeg: br.nSeg, parent: br.parent });
    if (deciduous) {
      const last = secs[secs.length - 1];
      if (br.level < lv && !(x.noLeader && br.level === 0)) queue.push({ o: last.o, e: last.e, len: b.length[br.level + 1], r: last.r, level: br.level + 1, nSec: br.nSec, nSeg: br.nSeg, parent: idx });
      else if (br.level === lv) leafAt(last.o, last.e);
      else knobs.push({ c: last.o.clone(), r: last.r * 1.02 }); // capped trunk top (no central leader)
    }
    if (br.level === lv) {
      const ro = rng.random();
      for (let i = 0; i < L.count; i++) { const it = interp(secs, rng.random(1.0, L.start)); leafAt(it.origin, orient(it.e, L.angle, TAU * (ro + i / L.count)), it.e); }
    } else if (br.level < lv) {
      const count = b.children[br.level], level = br.level + 1, ro = rng.random();
      for (let i = 0; i < count; i++) {
        let t = rng.random(1.0, b.start[level]);
        if (x.whorls && br.level === 0) { const w = x.whorls, s0 = b.start[level]; t = s0 + Math.round((t - s0) / (1 - s0) * w) / w * (1 - s0) + (rng.random() - 0.5) * 0.012; t = clamp(t, s0, 0.995); }
        const it = interp(secs, t);
        const r = b.radius[level] * ((1 - it.alpha) * it.A.r + it.alpha * it.B.r);
        let ce = orient(it.e, b.angle[level], TAU * (ro + i / count));
        if (x.noDown && level >= 2) { const dv = V3(0, 1, 0).applyEuler(ce); if (dv.y < -0.1) { dv.y = 0.15 - dv.y * 0.4; dv.normalize(); ce = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(_Y, dv)); } }
        queue.push({ o: it.origin, e: ce, len: b.length[level] * (deciduous ? 1 : 1 - t), r, level, nSec: b.sections[level], nSeg: b.segments[level], parent: idx });
      }
    }
  }
  for (const lf of leaves) { let b2 = lf.br; while (b2 >= 0 && branches[b2].level > 1) b2 = branches[b2].parent; lf.limb = b2; }
  if (x.flatTop) { // squash everything above yFrac of the tree height (flatter, wind-sculpted crown tops)
    let top = 0; for (const br of branches) for (const q of br.secs) top = Math.max(top, q.o.y); for (const lf of leaves) top = Math.max(top, lf.o.y);
    const yk = top * x.flatTop[0], k = x.flatTop[1], f = (p) => { if (p.y > yk) p.y = yk + (p.y - yk) * k; };
    for (const br of branches) for (const q of br.secs) f(q.o); for (const lf of leaves) f(lf.o); for (const kn of knobs) f(kn.c);
  }
  return { branches, leaves, knobs, flare: x.flare || 0 };
}

// several stems (bay laurel): one ez-tree skeleton per stem, tilted and offset
function multiStem(d) {
  const all = { branches: [], leaves: [], knobs: [], flare: d.ezx?.flare || 0 };
  for (const t of d.trunks) {
    const sk = ezSkeleton(merge(d.ez, { seed: d.ez.seed + t.seed, branch: { length: { 0: d.ez.branch.length[0] * t.s } } }), d.ezx);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(t.tilt * Math.cos(t.yaw), 0, t.tilt * Math.sin(t.yaw)));
    const off = V3(t.x, 0, t.z).multiplyScalar(d.ez.branch.radius[0]);
    const xf = (p) => p.applyQuaternion(q).add(off);
    const xe = (e) => e.setFromQuaternion(q.clone().multiply(new THREE.Quaternion().setFromEuler(e)));
    const base = all.branches.length;
    for (const br of sk.branches) { for (const s of br.secs) { xf(s.o); xe(s.e); } if (br.parent >= 0) br.parent += base; all.branches.push(br); }
    for (const lf of sk.leaves) { xf(lf.o); xe(lf.e); lf.bd.applyQuaternion(q); lf.limb += base; lf.br += base; all.leaves.push(lf); }
    for (const k of sk.knobs) { xf(k.c); all.knobs.push(k); }
  }
  return all;
}

// pollarded plane: trunk -> 4-6 stout limbs -> knobbly fists -> thin whips (+ a few leaves). Units: metres.
function pollardSkeleton(d) {
  const P = d.pollard, rng = new RNG(3303), branches = [], leaves = [], knobs = [];
  const ring = (o, dir, r) => { const q = new THREE.Quaternion().setFromUnitVectors(_Y, dir.clone().normalize()); return { o, e: new THREE.Euler().setFromQuaternion(q), r }; };
  const path = (p0, dir0, len, n, r0, r1, bend, wig) => {
    const secs = []; const p = p0.clone(), dir = dir0.clone().normalize();
    for (let i = 0; i <= n; i++) {
      const t = i / n; secs.push(ring(p.clone(), dir, lerp(r0, r1, t)));
      dir.add(V3(rng.random(wig, -wig), bend, rng.random(wig, -wig))).normalize();
      p.addScaledVector(dir, len / n);
    }
    return secs;
  };
  const trunk = path(V3(0, 0, 0), V3(0.02, 1, 0.01), P.trunkH, 6, P.trunkR * 1.25, P.trunkR * 0.95, 0, 0.015);
  trunk[0].r = P.trunkR * 1.45;
  branches.push({ level: 0, secs: trunk, nSeg: 10, parent: -1 });
  const top = trunk[trunk.length - 1].o;
  // a crown "boss" where the limbs leave the trunk
  knobs.push({ c: top.clone().add(V3(0, 0.05, 0)), r: P.trunkR * 1.15 });
  const ro = rng.random();
  for (let i = 0; i < P.limbs; i++) {
    const a = TAU * (ro + i / P.limbs) + rng.random(0.3, -0.3);
    const up = lerp(P.limbUp[0], P.limbUp[1], rng.random());
    const dir = V3(Math.cos(a) * Math.cos(up), Math.sin(up), Math.sin(a) * Math.cos(up));
    const len = lerp(P.limbLen[0], P.limbLen[1], rng.random());
    const secs = path(top.clone().addScaledVector(dir, 0.1), dir, len, 5, P.limbR, P.limbR * 0.8, 0.06, 0.05);
    branches.push({ level: 1, secs, nSeg: 7, parent: 0 });
    const end = secs[secs.length - 1].o;
    const kr = P.knobR * (0.85 + rng.random(0.35));
    knobs.push({ c: end.clone().addScaledVector(dir, kr * 0.4), r: kr });
    // whips sprout from the fist, mostly upward
    const nW = P.whips + Math.floor(rng.random(3));
    for (let k = 0; k < nW; k++) {
      const wa = rng.random(TAU), wu = rng.random(1.45, 0.75);
      const wd = V3(Math.cos(wa) * Math.cos(wu), Math.sin(wu), Math.sin(wa) * Math.cos(wu)).addScaledVector(dir, 0.35).normalize();
      const p0 = end.clone().addScaledVector(dir, kr * 0.4).addScaledVector(wd, kr * 0.8);
      const wl = lerp(P.whipLen[0], P.whipLen[1], rng.random());
      const ws = path(p0, wd, wl, 3, 0.018, 0.004, 0.03, 0.12);
      branches.push({ level: 2, secs: ws, nSeg: 3, parent: branches.length - 1 });
      // a few late leaves near the whip tips
      for (let j = 0; j < 3; j++) {
        const t = rng.random(1, 0.4); const sec = ws[Math.min(ws.length - 1, Math.round(t * (ws.length - 1)))];
        const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromEuler(sec.e).multiply(new THREE.Quaternion().setFromAxisAngle(_X, rng.random(1.2, 0.4))).multiply(new THREE.Quaternion().setFromAxisAngle(_Y, rng.random(TAU))));
        leaves.push({ o: sec.o.clone(), e, size: 0.55 * (0.8 + rng.random(0.4)) });
      }
    }
  }
  return { branches, leaves, knobs, metric: true };
}

// ------------------------------------------------------------------------------------------------ crown model
function crownModel(pts, mode) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z);
  const x0 = percentile(xs, 0.03), x1 = percentile(xs, 0.97), y0 = percentile(ys, 0.02), y1 = percentile(ys, 0.99), z0 = percentile(zs, 0.03), z1 = percentile(zs, 0.97);
  const c = V3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const R = V3(Math.max((x1 - x0) / 2, 1e-3), Math.max((y1 - y0) / 2, 1e-3), Math.max((z1 - z0) / 2, 1e-3));
  return { c, R, mode, y0, y1 };
}
const _g = V3();
function crownNormal(cm, p, out = V3()) {
  if (cm.mode === 'cone') {
    const dx = p.x - cm.c.x, dz = p.z - cm.c.z, l = Math.hypot(dx, dz) || 1;
    return out.set(dx / l, cm.R.x / (2 * cm.R.y) + 0.15, dz / l).normalize();
  }
  return out.set((p.x - cm.c.x) / (cm.R.x * cm.R.x), (p.y - cm.c.y) / (cm.R.y * cm.R.y), (p.z - cm.c.z) / (cm.R.z * cm.R.z)).normalize();
}
function crownE(cm, p) { // 0 at the crown centre, ~1 on its surface
  if (cm.mode === 'cone') {
    const t = clamp((p.y - cm.y0) / Math.max(cm.y1 - cm.y0, 1e-3), 0, 1), rr = Math.max(cm.R.x * (1 - t) * 1.15, 1e-3);
    return Math.hypot(p.x - cm.c.x, p.z - cm.c.z) / rr;
  }
  return Math.hypot((p.x - cm.c.x) / cm.R.x, (p.y - cm.c.y) / cm.R.y, (p.z - cm.c.z) / cm.R.z);
}
function crownAO(cm, p, aoMin) {
  const e = crownE(cm, p);
  let ao = lerp(aoMin, 1, smooth(0.15, 1.0, e));
  ao *= lerp(0.72, 1, smooth(-1.0, 0.3, (p.y - cm.c.y) / cm.R.y));
  return ao;
}

// ------------------------------------------------------------------------------------------------ meshing
class Acc {
  constructor(attrs) { this.pos = []; this.nrm = []; this.uv = []; this.idx = []; this.ex = {}; for (const [k, n] of attrs) this.ex[k] = { n, a: [] }; }
  get count() { return this.pos.length / 3; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    for (const k in this.ex) g.setAttribute(k, new THREE.Float32BufferAttribute(this.ex[k].a, this.ex[k].n));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    return g;
  }
}
const _d = V3(), _p = V3();
// bark tubes for one LOD; units in -> same units out. uv in metres / tile (unitM converts skeleton units to m)
function meshBark(sk, spec, unitM, tile, cm, aoMin, segsImpostor) {
  const acc = new Acc([['aAO', 1]]); const segs = [];
  const minR = spec.minR / unitM;
  for (const br of sk.branches) {
    if (br.level > spec.maxLevel) continue;
    if (br.secs[0].r < minR) continue;
    const L = Math.min(br.level, 3);
    const m = Math.max(3, Math.min(br.nSeg, spec.segs[L]));
    const n = br.secs.length - 1, st = Math.max(1, spec.stride[L]);
    const rings = []; for (let i = 0; i < n; i += st) rings.push(i); rings.push(n);
    const uRep = Math.max(1, Math.round(TAU * br.secs[0].r * unitM / tile[0]));
    let acc0 = 0, prev = null; const base = acc.count;
    for (let k = 0; k < rings.length; k++) {
      const s = br.secs[rings[k]];
      if (prev) { acc0 += s.o.distanceTo(prev.o); if (segsImpostor) segsImpostor.push({ a: prev.o, b: s.o, ra: prev.r, rb: s.r, ao: crownBarkAO(cm, s.o, aoMin) }); }
      prev = s;
      const v = acc0 * unitM / tile[1], ao = crownBarkAO(cm, s.o, aoMin);
      const fl = br.level === 0 && br.parent < 0 && sk.flare ? 1 + sk.flare * (rings[k] === 0 ? 1 : rings[k] === 1 ? 0.25 : 0) : 1;
      for (let j = 0; j <= m; j++) {
        const a = TAU * j / m;
        _d.set(Math.cos(a), 0, Math.sin(a)).applyEuler(s.e);
        const rr = s.r * fl * (fl > 1 ? 1 + 0.12 * Math.sin(a * 5 + 1.3) : 1);
        acc.pos.push(s.o.x + _d.x * rr, s.o.y + _d.y * rr, s.o.z + _d.z * rr);
        acc.nrm.push(_d.x, _d.y, _d.z); acc.uv.push(uRep * j / m, v); acc.ex.aAO.a.push(ao);
      }
    }
    for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < m; j++) {
      const a = base + k * (m + 1) + j, b = a + 1, c = a + m + 1, dd = c + 1;
      acc.idx.push(a, c, b, b, c, dd);
    }
  }
  return acc;
}
function crownBarkAO(cm, p, aoMin) { const e = crownE(cm, p); return e > 1.15 ? 1 : lerp(Math.max(aoMin, 0.6), 1, smooth(0.3, 1.15, e)); }
// knobbly fists (pollard): squashed icospheres with a little noise
function meshKnobs(acc, knobs, unitM, tile, detail) {
  for (const k of knobs) {
    const g = new THREE.IcosahedronGeometry(k.r, detail); const p = g.attributes.position; const base = acc.count;
    for (let i = 0; i < p.count; i++) {
      _p.set(p.getX(i), p.getY(i), p.getZ(i)); const n = _p.clone().normalize();
      const w = 1 + 0.18 * Math.sin(n.x * 7.1 + n.y * 3.3) * Math.sin(n.z * 6.3 + 1.7) + 0.08 * Math.sin(n.y * 13.0);
      _p.multiplyScalar(w); _p.y *= 0.85;
      acc.pos.push(k.c.x + _p.x, k.c.y + _p.y, k.c.z + _p.z); acc.nrm.push(n.x, n.y, n.z);
      acc.uv.push((Math.atan2(n.z, n.x) / TAU + 0.5) * Math.max(1, Math.round(TAU * k.r * unitM / tile[0])), (k.c.y + _p.y) * unitM / tile[1]); acc.ex.aAO.a.push(0.85);
    }
    const ix = g.index ? g.index.array : null;
    if (ix) for (let i = 0; i < ix.length; i++) acc.idx.push(base + ix[i]); else for (let i = 0; i < p.count; i++) acc.idx.push(base + i);
    g.dispose();
  }
}
// ---- foliage clumps: voxel clusters of ez-tree's leaf placements (keeps ez-tree's crown layout, but turns
// scattered twigs into the dense, lumpy masses real crowns read as). Units: skeleton units.
function clumpify(leaves, cell, cfg, seed) {
  if (cfg.single) return leaves.map((lf, i) => ({ c: lf.o.clone(), r: lf.size * 0.5, n: 1, dir: V3(0, 1, 0).applyEuler(lf.e), i, lf }));
  const ox = hash1(seed) * cell, oy = hash1(seed + 1) * cell, oz = hash1(seed + 2) * cell, cy = cell * (cfg.flat ?? 1);
  const map = new Map();
  for (const lf of leaves) {
    const k = `${Math.floor((lf.o.x + ox) / cell)},${Math.floor((lf.o.y + oy) / cy)},${Math.floor((lf.o.z + oz) / cell)}`;
    let c = map.get(k); if (!c) map.set(k, (c = { sum: V3(), n: 0, dir: V3(), pts: [], limbs: {} }));
    c.sum.add(lf.o); c.n++; c.dir.add(V3(0, 1, 0).applyEuler(lf.e)); c.pts.push(lf.o); c.limbs[lf.limb ?? -1] = (c.limbs[lf.limb ?? -1] || 0) + 1;
  }
  const out = []; let i = 0;
  for (const c of map.values()) {
    const ctr = c.sum.divideScalar(c.n);
    let sp = 0; for (const p of c.pts) sp = Math.max(sp, p.distanceTo(ctr));
    const r = clamp(Math.max(sp * 0.75, cell * cfg.r), cell * 0.3, cell * 0.85) * clamp(0.55 + 0.12 * c.n, 0.6, 1) * (0.85 + 0.3 * hash1(i * 7.7 + seed));
    let mass = -1, best = -1; for (const k in c.limbs) if (c.limbs[k] > best) { best = c.limbs[k]; mass = +k; }
    out.push({ c: ctr, r, n: c.n, dir: c.dir.lengthSq() > 1e-6 ? c.dir.normalize() : V3(0, 1, 0), i: i++, mass });
  }
  return out;
}
// foliage masses (one per main limb): centre for the lumpy large-scale shading
function massCentres(clumps) {
  const m = new Map();
  for (const c of clumps) { let e = m.get(c.mass); if (!e) m.set(c.mass, (e = { s: V3(), n: 0 })); e.s.addScaledVector(c.c, c.r * c.r); e.n += c.r * c.r; }
  const out = new Map(); for (const [k, e] of m) out.set(k, e.s.divideScalar(e.n)); return out;
}
// fill holes in the crown: shell points inside the local envelope of the existing clumps get a clump when no clump is
// near, so the crown reads as one lumpy mass instead of separate puffs (the outline stays ez-tree's)
function fillClumps(clumps, cm, cellU, cfg, seed) {
  if (cfg.single || clumps.length < 6 || !(cfg.fill > 0)) return clumps;
  const out = clumps.slice(), gap2 = (cellU * (cfg.gap ?? 0.85)) ** 2;
  const groups = new Map(); for (const c of clumps) { const k = cfg.perMass ? c.mass : 0; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
  let gi = 0;
  for (const [mass, list] of groups) {
    if (list.length < 3) continue;
    const c0 = V3(); let wsum = 0; for (const c of list) { c0.addScaledVector(c.c, c.r); wsum += c.r; } c0.divideScalar(wsum || 1);
    const ext = list.map((cl) => { const v = cl.c.clone().sub(c0); const d = v.length(); return { dir: v.divideScalar(d || 1), d: d + cl.r * 0.6 }; });
    let R = 0; for (const x of ext) R = Math.max(R, x.d);
    const N = Math.round(clamp(4 * Math.PI * R * R / (cellU * cellU) * cfg.fill, 12, 500));
    for (let i = 0; i < N; i++) {
      const dir = _fib(i, N, V3());
      let e = 0; for (const x of ext) if (x.dir.dot(dir) > (cfg.cone ?? 0.9)) e = Math.max(e, x.d);
      if (!e) continue;
      if (dir.y < -0.35 && hash1(seed + gi * 31 + i * 9.1) > (cfg.under ?? 0.6)) continue;
      for (const depth of [lerp(0.74, 0.92, hash1(seed + gi * 17 + i)), 0.45]) {
        const p = c0.clone().addScaledVector(dir, e * depth);
        if (p.y < (cfg.minYAt ? cfg.minYAt(p) : cfg.minY)) continue;
        let near = Infinity; for (const cl of out) { const d2 = cl.c.distanceToSquared(p); if (d2 < near) near = d2; }
        if (near < gap2) continue;
        out.push({ c: p, r: cellU * cfg.r * (0.85 + 0.3 * hash1(seed + i * 3.7 + gi)), n: 1, dir: dir.clone(), i: out.length, filler: true, mass });
      }
    }
    gi++;
  }
  return out;
}
const _fib = (i, n, out) => { const y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.399963; return out.set(Math.cos(a) * r, y, Math.sin(a) * r); };
// cards of one clump. lod 0: many cards on the clump's outer shell, each facing out of the clump; lod 1: a few big
// cards facing out of the crown. Returns card records (centre, normal, up, size) in skeleton units.
function clumpCards(cl, n, cm, cfg, sizeU, lod, seed) {
  const cards = []; if (n <= 0) return cards;
  if (cfg.single && cl.lf) { // one twig card per placement, hanging off its twig like ez-tree's own leaves
    const up = V3(0, 1, 0).applyEuler(cl.lf.e), nn = V3(0, 0, 1).applyEuler(cl.lf.e);
    cards.push({ c: cl.c.clone().addScaledVector(up, sizeU * 0.45), n: nn, up, s: sizeU * (0.85 + 0.3 * hash1(seed)), cl, ao: crownAO(cm, cl.c, 0.6) }); return cards;
  }
  const q = new THREE.Quaternion().setFromAxisAngle(V3(hash1(seed) - 0.5, hash1(seed + 1) - 0.5, hash1(seed + 2) - 0.5).normalize(), hash1(seed + 3) * TAU);
  const out = crownNormal(cm, cl.c, V3()); const flat = cfg.flat ?? 1;
  const N = Math.max(n, Math.round(n * 1.6)), cand = [];
  for (let i = 0; i < N; i++) {
    const dir = _fib(i, N, V3()).applyQuaternion(q);
    let keep = 1; if (dir.y < -0.35) keep *= cfg.under ?? 0.6; if (dir.dot(out) < -0.2) keep *= 0.45;
    cand.push({ dir, p: keep * (0.55 + 0.45 * hash1(seed * 1.37 + i * 2.17)) });
  }
  cand.sort((a, b) => b.p - a.p);
  for (let k = 0; k < Math.min(n, cand.length); k++) {
    const dir = cand[k].dir, h = hash1(seed * 3.3 + k * 1.91), h2 = hash1(seed * 5.1 + k * 2.73), h3 = hash1(seed * 2.9 + k * 3.37);
    const s = sizeU * (0.85 + 0.3 * hash1(seed * 7.7 + k)) * (lod === 0 ? 1 : 1.1);
    const o = dir.clone().addScaledVector(out, cfg.face ?? 0.4).add(V3(h - 0.5, h3 - 0.5, h2 - 0.5).multiplyScalar(0.45)).normalize();
    let up, nn, c;
    if (hash1(seed * 9.1 + k * 4.3) < (cfg.radial ?? 1)) {
      // branchlet: stem near the clump centre, pointing outward (leafy, ragged edges)
      up = o.clone().add(V3(0, cfg.lift ?? 0.25, 0)).normalize();
      const base = lod === 0 ? lerp(0.05, 0.55, h) : lerp(0.0, 0.3, h);
      c = cl.c.clone().add(V3(dir.x * cl.r * base, dir.y * cl.r * base * flat, dir.z * cl.r * base)).addScaledVector(up, s * 0.5);
      nn = out.clone().addScaledVector(up, -out.dot(up)); if (nn.lengthSq() < 1e-4) nn.set(up.z, 0, -up.x); nn.normalize().applyAxisAngle(up, (h2 - 0.5) * (cfg.roll ?? 2.2));
    } else {
      // shell card: tangent to the clump surface (smooth, billowing crown surface)
      nn = o;
      up = V3(0, 1, 0).addScaledVector(nn, -nn.y); if (up.lengthSq() < 1e-4) up.set(1, 0, 0).addScaledVector(nn, -nn.x); up.normalize().applyAxisAngle(nn, (h2 - 0.5) * 1.4);
      const rad = lod === 0 ? lerp(0.55, 1.0, Math.sqrt(h)) : lerp(0.3, 0.6, h);
      c = cl.c.clone().add(V3(dir.x * cl.r * rad, dir.y * cl.r * rad * flat, dir.z * cl.r * rad));
    }
    const ao = crownAO(cm, cl.c, cfg.aoMin ?? 0.45) * lerp(cfg.clumpAO ?? 0.5, 1, Math.pow(dir.y * 0.5 + 0.5, 1.2)) * (lod === 0 ? lerp(0.8, 1, h) : 1);
    cards.push({ c, n: nn, up, s, cl, ao });
  }
  return cards;
}
// conifer sprays: one card per ez-tree leaf placement, laid along its branch as a tilted, drooping pad (tiers with sky
// between them instead of round clumps)
function sprayCards(leaves, cm, cfg, sizeU, seed, grow = 1) {
  const cards = [];
  leaves.forEach((lf, k) => {
    const h = hash1(seed + k * 1.37), h2 = hash1(seed + k * 2.71), h3 = hash1(seed + k * 3.93);
    const out = V3(lf.o.x - cm.c.x, 0, lf.o.z - cm.c.z); if (out.lengthSq() < 1e-8) out.set(h - 0.5, 0, h2 - 0.5); out.normalize();
    const lead = V3(0, 1, 0).applyEuler(lf.e);
    const along = lf.bd.clone().multiplyScalar(cfg.alongK ?? 0.7).addScaledVector(lead, 1 - (cfg.alongK ?? 0.7)).addScaledVector(out, cfg.outK ?? 0.4);
    along.y -= (cfg.droop ?? 0.2) * (0.6 + 0.8 * h3); along.normalize();
    const side = V3().crossVectors(along, V3(0, 1, 0)); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
    const up = V3().crossVectors(side, along).normalize(); // perpendicular to along, toward +y
    const nn = up.clone().multiplyScalar(cfg.flat ?? 0.55).addScaledVector(out, 1 - (cfg.flat ?? 0.55)); nn.addScaledVector(along, -nn.dot(along)).normalize();
    nn.applyAxisAngle(along, (h - 0.5) * (cfg.roll ?? 1.2));
    const s = lf.size * sizeU * grow * (0.85 + 0.3 * h2);
    const c = lf.o.clone().addScaledVector(along, s * 0.42);
    const ao = crownAO(cm, c, cfg.aoMin ?? 0.45) * lerp(0.82, 1, h3);
    cards.push({ c, n: nn, up: along, s, cl: { c: lf.o, r: s, mass: lf.limb ?? -1 }, ao });
  });
  return cards;
}
const _cs = V3(), _cu = V3(), _cv = V3(), _ck = V3(), _cc = V3(), _cm = V3();
function meshCards(cards, cm, shade, cardsOut, masses, atlas = false, bb = false) {
  if (bb) return meshBillboards(cards, cm, shade, cardsOut, masses, atlas);
  const acc = new Acc([['aPivot', 3], ['aInfo', 4], ['aCardN', 3]]);
  let k = 0;
  for (const cd of cards) {
    _cs.crossVectors(cd.up, cd.n).normalize(); _cu.crossVectors(cd.n, _cs).normalize();
    const hs = cd.s / 2, base = acc.count, r1 = hash1(k * 3.1 + cd.c.x * 7.3), r2 = hash1(k * 5.7 + cd.c.z * 3.9 + 1.3); k++;
    const corners = [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]], q = [];
    const cell = atlas ? Math.min(3, Math.floor(hash1(k * 7.31 + cd.c.y * 3.3) * 4)) : 0, u0 = atlas ? (cell % 2) * 0.5 : 0, v0 = atlas ? (cell >> 1) * 0.5 : 0, us = atlas ? 0.5 : 1;
    for (const [sx, sy, u, v] of corners) {
      _cv.copy(cd.c).addScaledVector(_cs, sx * hs).addScaledVector(_cu, sy * hs); q.push(_cv.clone());
      crownNormal(cm, _cv, _cc); _ck.copy(_cv).sub(cd.cl.c); if (_ck.lengthSq() < 1e-10) _ck.copy(cd.n); _ck.normalize();
      const mc = masses && masses.get(cd.cl.mass); if (mc) { _cm.copy(_cv).sub(mc); if (_cm.lengthSq() < 1e-10) _cm.copy(_cc); _cm.normalize(); } else _cm.copy(_cc);
      const w3 = shade[3] ?? 0, fn = cd.n.dot(_cc) < 0 ? -1 : 1;
      const nx = shade[0] * _cc.x + shade[1] * _ck.x + shade[2] * cd.n.x * fn + w3 * _cm.x, ny = shade[0] * _cc.y + shade[1] * _ck.y + shade[2] * cd.n.y * fn + w3 * _cm.y, nz = shade[0] * _cc.z + shade[1] * _ck.z + shade[2] * cd.n.z * fn + w3 * _cm.z, nl = Math.hypot(nx, ny, nz) || 1;
      acc.pos.push(_cv.x, _cv.y, _cv.z); acc.nrm.push(nx / nl, ny / nl, nz / nl); acc.uv.push(u0 + u * us, v0 + v * us);
      acc.ex.aPivot.a.push(cd.cl.c.x, cd.cl.c.y, cd.cl.c.z); acc.ex.aInfo.a.push(r1, r2, cd.ao, 1); acc.ex.aCardN.a.push(cd.n.x, cd.n.y, cd.n.z);
    }
    acc.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    if (cardsOut) cardsOut.push({ q, ao: cd.ao });
  }
  return acc;
}

// ------------------------------------------------------------------------------------------------ textures
function loadImage(url) { return new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => rej(new Error('image ' + url)); im.src = url; }); }
function placeholderTex() { const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); t.needsUpdate = true; return t; }
// camera-facing clump cards: every vertex sits at the card centre; the vertex shader spreads the corners in the
// camera's (or, in the shadow pass, the light's) view plane. Normal = crown/clump/mass blend at the centre.
function meshBillboards(cards, cm, shade, cardsOut, masses, atlas) {
  const acc = new Acc([['aPivot', 3], ['aInfo', 4], ['aCorner', 3]]);
  let k = 0;
  for (const cd of cards) {
    const base = acc.count, r1 = hash1(k * 3.1 + cd.c.x * 7.3), r2 = hash1(k * 5.7 + cd.c.z * 3.9 + 1.3);
    const cell = atlas ? Math.min(3, Math.floor(hash1(k * 7.31 + cd.c.y * 3.3) * 4)) : 0, u0 = atlas ? (cell % 2) * 0.5 : 0, v0 = atlas ? (cell >> 1) * 0.5 : 0, us = atlas ? 0.5 : 1;
    k++;
    crownNormal(cm, cd.c, _cc); _ck.copy(cd.c).sub(cd.cl.c); if (_ck.lengthSq() < 1e-10) _ck.copy(_cc); _ck.normalize();
    const mc = masses && masses.get(cd.cl.mass); if (mc) { _cm.copy(cd.c).sub(mc); if (_cm.lengthSq() < 1e-10) _cm.copy(_cc); _cm.normalize(); } else _cm.copy(_cc);
    const w3 = shade[3] ?? 0, nx = shade[0] * _cc.x + shade[1] * _ck.x + w3 * _cm.x, ny = shade[0] * _cc.y + shade[1] * _ck.y + w3 * _cm.y, nz = shade[0] * _cc.z + shade[1] * _ck.z + w3 * _cm.z, nl = Math.hypot(nx, ny, nz) || 1;
    for (const [sx, sy, u, v] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
      acc.pos.push(cd.c.x, cd.c.y, cd.c.z); acc.nrm.push(nx / nl, ny / nl, nz / nl); acc.uv.push(u0 + u * us, v0 + v * us);
      acc.ex.aPivot.a.push(cd.cl.c.x, cd.cl.c.y, cd.cl.c.z); acc.ex.aInfo.a.push(r1, r2, cd.ao, 1); acc.ex.aCorner.a.push(sx, sy, cd.s);
    }
    acc.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    if (cardsOut) cardsOut.push({ bb: true, c: cd.c.clone(), s: cd.s, roll: r1 * TAU, ao: cd.ao });
  }
  return acc;
}
function stampCanvas(img, size, stamps) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high';
  for (const s of stamps) {
    g.save(); g.translate(s.x * size, (1 - s.y) * size); g.rotate(s.rot || 0); g.scale(s.flip ? -s.s : s.s, s.s);
    if (s.b && s.b !== 1) g.filter = `brightness(${s.b})`;
    g.drawImage(img, -size / 2, -size, size, size); g.restore();
  }
  return c;
}
// RGBA8 (top-down rows) -> GL-ready mip chain: rows flipped to bottom-up, colour pushed into transparent texels
// (no dark fringes), alpha rescaled per level so alpha-tested coverage stays constant with distance.
function mipChain(src, w, h, alphaRef = 128) {
  const N = w * h, rgba = new Uint8ClampedArray(N * 4);
  for (let y = 0; y < h; y++) rgba.set(src.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  // push-pull colour fill
  const lv = []; { const c = new Float32Array(N * 3), wt = new Float32Array(N); for (let i = 0; i < N; i++) { const a = rgba[i * 4 + 3] / 255; wt[i] = a; c[i * 3] = rgba[i * 4]; c[i * 3 + 1] = rgba[i * 4 + 1]; c[i * 3 + 2] = rgba[i * 4 + 2]; } lv.push({ c, wt, w, h }); }
  while (lv[lv.length - 1].w > 1 || lv[lv.length - 1].h > 1) {
    const P = lv[lv.length - 1], nw = Math.max(1, P.w >> 1), nh = Math.max(1, P.h >> 1), c = new Float32Array(nw * nh * 3), wt = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      let sw = 0, r = 0, g = 0, b = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const sx = Math.min(P.w - 1, x * 2 + dx), sy = Math.min(P.h - 1, y * 2 + dy), i = sy * P.w + sx, ww = P.wt[i]; sw += ww; r += P.c[i * 3] * ww; g += P.c[i * 3 + 1] * ww; b += P.c[i * 3 + 2] * ww; }
      const o = y * nw + x; if (sw > 0) { c[o * 3] = r / sw; c[o * 3 + 1] = g / sw; c[o * 3 + 2] = b / sw; } wt[o] = Math.min(1, sw);
    }
    lv.push({ c, wt, w: nw, h: nh });
  }
  for (let l = lv.length - 2; l >= 0; l--) {
    const P = lv[l], Q = lv[l + 1];
    for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
      const i = y * P.w + x, ww = P.wt[i]; if (ww >= 1) continue;
      const j = Math.min(Q.h - 1, y >> 1) * Q.w + Math.min(Q.w - 1, x >> 1);
      for (let k = 0; k < 3; k++) P.c[i * 3 + k] = P.c[i * 3 + k] * ww + Q.c[j * 3 + k] * (1 - ww);
      P.wt[i] = 1;
    }
  }
  for (let i = 0; i < N; i++) if (rgba[i * 4 + 3] < 250) { rgba[i * 4] = lv[0].c[i * 3]; rgba[i * 4 + 1] = lv[0].c[i * 3 + 1]; rgba[i * 4 + 2] = lv[0].c[i * 3 + 2]; }
  // mips with coverage-preserving alpha
  let cov0 = 0; for (let i = 0; i < N; i++) if (rgba[i * 4 + 3] >= alphaRef) cov0++; cov0 /= N;
  const mips = [{ data: new Uint8Array(rgba.buffer), width: w, height: h }];
  let pw = w, ph = h, prev = new Float32Array(N * 4); for (let i = 0; i < N * 4; i++) prev[i] = rgba[i];
  while (pw > 1 || ph > 1) {
    const nw = Math.max(1, pw >> 1), nh = Math.max(1, ph >> 1), cur = new Float32Array(nw * nh * 4);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      const o = (y * nw + x) * 4; let a = 0, r = 0, g = 0, b = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const i = (Math.min(ph - 1, y * 2 + dy) * pw + Math.min(pw - 1, x * 2 + dx)) * 4; r += prev[i]; g += prev[i + 1]; b += prev[i + 2]; a += prev[i + 3]; }
      cur[o] = r / 4; cur[o + 1] = g / 4; cur[o + 2] = b / 4; cur[o + 3] = a / 4;
    }
    const M = nw * nh; let lo = 0.5, hi = 8;
    const covAt = (s) => { let c = 0; for (let i = 0; i < M; i++) if (cur[i * 4 + 3] * s >= alphaRef) c++; return c / M; };
    for (let it = 0; it < 14; it++) { const mid = (lo + hi) / 2; if (covAt(mid) < cov0) lo = mid; else hi = mid; }
    const sc = M <= 4 ? 1 : (lo + hi) / 2, out = new Uint8Array(M * 4);
    for (let i = 0; i < M; i++) { out[i * 4] = cur[i * 4]; out[i * 4 + 1] = cur[i * 4 + 1]; out[i * 4 + 2] = cur[i * 4 + 2]; out[i * 4 + 3] = Math.min(255, cur[i * 4 + 3] * sc); }
    mips.push({ data: out, width: nw, height: nh });
    prev = cur; pw = nw; ph = nh;
  }
  return { mips, rgba };
}
function dataTex(mips, srgb) {
  const t = new THREE.DataTexture(mips[0].data, mips[0].width, mips[0].height, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.mipmaps = mips; t.generateMipmaps = false; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4; t.flipY = false; t.needsUpdate = true;
  return t;
}
function coverage(rgba, n) { let c = 0; for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] >= 128) c++; return c / n; }
// boost alpha so at least `target` of the texels pass the alpha test (thickens leaves that went sub-texel)
function boostAlpha(data, n, target) {
  const hist = new Uint32Array(256); for (let i = 0; i < n; i++) hist[data[i * 4 + 3]]++;
  let acc = 0, a = 255; for (; a > 0; a--) { acc += hist[a]; if (acc >= target * n) break; }
  if (a >= 128 || a < 8) return 1;
  const k = 128 / a; for (let i = 0; i < n; i++) data[i * 4 + 3] = Math.min(255, data[i * 4 + 3] * k);
  return k;
}
function texStats(rgba, n) {
  let r = 0, g = 0, b = 0, l = 0, c = 0;
  for (let i = 0; i < n; i++) { if (rgba[i * 4 + 3] < 128) continue; const R = s2l(rgba[i * 4] / 255), G = s2l(rgba[i * 4 + 1] / 255), B = s2l(rgba[i * 4 + 2] / 255); r += R; g += G; b += B; l += 0.2126 * R + 0.7152 * G + 0.0722 * B; c++; }
  c = Math.max(c, 1); return new THREE.Vector4(r / c, g / c, b / c, l / c);
}
// dense leaf patch for clump cards: many small stamps of ez-tree's twig photo radiating from the card centre with a
// ragged edge. stamp = twig photo size as a fraction of the card (sets the leaf scale), count from coverage.
function patchCanvas(img, size, stamp, seed, layout = 'fan') {
  if (layout === 'feather') { // flat two-ranked spray: stamps alternate left/right along a central stem (redwood / cedar)
    const n = Math.round(clamp(0.55 / stamp, 4, 14)) * 2, st = [];
    for (let i = 0; i < n; i++) {
      const t = (Math.floor(i / 2) + 0.5) / (n / 2), side = i % 2 ? 1 : -1;
      st.push({ x: 0.5, y: 0.04 + t * 0.72, rot: side * (0.95 + (hash1(seed + i) - 0.5) * 0.3), s: stamp * (1.15 - 0.55 * t) * (0.9 + 0.2 * hash1(seed + i * 3.3)), b: 0.85 + 0.25 * hash1(seed + i * 7.1), flip: side > 0 });
    }
    st.push({ x: 0.5, y: 0.6, rot: 0, s: stamp * 0.8, b: 1 });
    return stampCanvas(img, size, st);
  }
  if (layout === 'jumble') { // dense jumble of small twigs inside a ragged disc (reads as a leaf mass, not sprays)
    const count = Math.round(clamp(1.3 / (stamp * stamp * 0.21), 8, 220)), st = [], rMax = Math.max(0.05, 0.46 - stamp * 0.8);
    for (let i = 0; i < count; i++) {
      const rr = Math.sqrt(hash1(seed + i * 3.1)) * rMax, a = hash1(seed + i * 5.3) * TAU;
      st.push({ x: 0.5 + Math.cos(a) * rr, y: 0.5 + Math.sin(a) * rr - stamp * 0.35, rot: hash1(seed + i * 7.9) * TAU, s: stamp * (0.7 + 0.6 * hash1(seed + i * 11.3)), b: 0.86 + 0.22 * hash1(seed + i * 13.7), flip: hash1(seed + i * 17.1) < 0.5 });
    }
    return stampCanvas(img, size, st);
  }
  // a branchlet: small twig stamps fanning out from a stem at the bottom centre (leaves fill the upper ~85%)
  const count = Math.round(clamp(0.95 / (stamp * stamp * 0.21), 6, 200)), st = [];
  for (let i = 0; i < count; i++) {
    const f = (i + 0.5) / count;
    const ang = (hash1(seed + i * 5.3) - 0.5) * 2.0;                 // fan angle from vertical (rad)
    const reach = lerp(0.06, 0.92 - stamp, Math.sqrt(hash1(seed + i * 3.1)));   // anchor distance from the stem base
    const x = 0.5 + Math.sin(ang) * reach * 0.62, y = 0.03 + Math.cos(ang) * reach;
    const rot = ang * 1.15 + (hash1(seed + i * 7.9) - 0.5) * 0.9;
    st.push({ x, y, rot, s: stamp * (0.75 + 0.5 * hash1(seed + i * 11.3)) * (1 - 0.25 * f), b: 0.78 + 0.34 * hash1(seed + i * 13.7), flip: hash1(seed + i * 17.1) < 0.5 });
  }
  return stampCanvas(img, size, st);
}

// ------------------------------------------------------------------------------------------------ shaders
const COMMON = /* glsl */`
uniform float uTime;
uniform float uWind;
uniform vec2 uWindDir;
uniform vec4 uSway; // x: sway (m per m of height per unit wind), y: leaf flutter (m), z: sway base (0..1 height)
float ezHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
mat4 ezObj() {
#ifdef USE_INSTANCING
  return modelMatrix * instanceMatrix;
#else
  return modelMatrix;
#endif
}
vec3 ezScale(mat4 m) { return max(vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz)), vec3(1e-5)); }
uniform vec4 uVar; // x: lean (fraction of height at the top), y: crown twist (rad at the top)
vec3 ezWind(vec3 p, vec3 piv, float flut) {
  mat4 m = ezObj(); vec3 s = ezScale(m); vec3 ip = m[3].xyz;
  { // per-instance static lean + twist so instanced clones don't read as copies
    float a1 = ezHash(ip.xz * 0.731 + 3.1) * 6.2832, a2 = (ezHash(ip.xz * 0.413 + 7.7) - 0.5) * 2.0;
    float hh = max(p.y - uSway.z * 0.5, 0.0);
    float tw = a2 * uVar.y * hh; float ct = cos(tw), st = sin(tw);
    p.xz = vec2(ct * p.x - st * p.z, st * p.x + ct * p.z);
    float ln = uVar.x * (0.35 + 0.65 * ezHash(ip.xz * 0.917 + 1.3)) * hh * hh * s.y;
    p.x += cos(a1) * ln / s.x; p.z += sin(a1) * ln / s.z;
  }
  float ph = ezHash(ip.xz * 0.173) * 6.2832, t = uTime;
  float gust = 0.65 + 0.35 * sin(t * 0.37 + ip.x * 0.013 + ip.z * 0.009) * sin(t * 0.21 + ph);
  float w = uWind * gust;
  float h = clamp((p.y - uSway.z) / max(1.0 - uSway.z, 0.05), 0.0, 1.5);
  float fr = 5.0 / sqrt(max(s.y, 2.0));
  float osc = 0.6 + 0.4 * sin(t * fr + ph) + 0.15 * sin(t * fr * 2.3 + ph * 1.7);
  float amp = uSway.x * s.y * w * osc * h * h;
  vec3 wd = vec3(uWindDir.x, 0.0, uWindDir.y);
  p.x += dot(m[0].xyz / s.x, wd) * amp / s.x;
  p.z += dot(m[2].xyz / s.z, wd) * amp / s.z;
  if (flut > 0.0) {
    float k = dot(piv, vec3(17.1, 31.7, 23.3)) * 9.1;
    float f = sin(t * (3.5 + 2.5 * fract(k)) + k + ph) * uSway.y * w * flut * (0.3 + h);
    p += vec3(f / s.x, 0.4 * f / s.y, -0.7 * f / s.z);
  }
  return p;
}
vec3 ezDestretch(vec3 p, vec3 piv) { mat4 m = ezObj(); vec3 s = ezScale(m); float su = pow(s.x * s.y * s.z, 1.0 / 3.0); return piv + (p - piv) * (su / s); }
`;
// billboard corner spread (camera-facing in the colour pass, light-facing in the shadow pass)
const BB_V = /* glsl */`
attribute vec3 aCorner;
uniform float uBBTilt;
vec3 ezBillboard(vec3 p, out vec3 lo) {
  mat4 m = ezObj(); vec3 s = ezScale(m); float su = pow(s.x * s.y * s.z, 1.0 / 3.0);
  vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float a = aInfo.x * 6.2832, ca = cos(a), sa = sin(a);
  vec2 c = vec2(ca * aCorner.x - sa * aCorner.y, sa * aCorner.x + ca * aCorner.y);
  vec3 w = (camR * c.x + camU * c.y) * aCorner.z * 0.5 * su;
  lo = vec3(dot(w, m[0].xyz) / (s.x * s.x), dot(w, m[1].xyz) / (s.y * s.y), dot(w, m[2].xyz) / (s.z * s.z));
  return p + lo;
}
`;
const LEAFCOL_V = /* glsl */`
uniform vec3 uPal[6];
uniform float uPalN;
uniform vec4 uColK; // x: share of cards in a secondary palette colour, y: per-card brightness spread, z: aerial tint strength, w: tint saturation
varying vec3 vLeafCol;
varying float vAO;
vec3 ezLeafColor(float r1, float r2, float avg) {
  mat4 m = ezObj();
  float hi = ezHash(m[3].xz * 0.37 + 11.0);
  float i0 = min(floor(hi * uPalN), uPalN - 1.0);
  float i1 = mod(i0 + 1.0 + floor(r1 * max(uPalN - 1.0, 1.0)), uPalN);
  vec3 c0 = uPal[int(i0)], c1 = uPal[int(i1)];
  vec3 c = avg > 0.5 ? mix(c0, c1, uColK.x * 0.8) : mix(c0, c1, step(r2, uColK.x));
  c *= 1.0 + (r1 - 0.5) * uColK.y * (1.0 - avg);
  vec3 tint = vec3(1.0);
#ifdef USE_INSTANCING_COLOR
  vec3 ic = clamp(instanceColor.rgb, vec3(0.4), vec3(1.8));
  float il = dot(ic, vec3(0.299, 0.587, 0.114));
  tint = mix(vec3(1.0), mix(vec3(il), ic, uColK.w), uColK.z);
#endif
  return c * tint;
}
`;
const LEAF_LIGHT = /* glsl */`
#include <lights_physical_pars_fragment>
uniform vec4 uLeafLight; // x: wrap, y: back translucency, z: specular scale, w: sky fill
uniform float uDirK;     // direct-light factor: < 1 on the far LODs to stand in for the self-shadowing they lack
void RE_Direct_Leaf( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  float ndl = dot( geometryNormal, directLight.direction );
  float w = uLeafLight.x;
  float diff = saturate( ( ndl + w ) / ( 1.0 + w ) );
  float back = pow( saturate( dot( -geometryViewDir, directLight.direction ) ), 3.0 ) * uLeafLight.y * ( 0.35 + 0.65 * saturate( -ndl + 0.3 ) );
  reflectedLight.directDiffuse += directLight.color * material.diffuseContribution * RECIPROCAL_PI * ( diff + back ) * uDirK;
  reflectedLight.directSpecular += saturate( ndl ) * directLight.color * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material ) * uLeafLight.z;
}
#undef RE_Direct
#define RE_Direct RE_Direct_Leaf
`;
const NORMAL_NOFLIP = THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '');
const SPEC_SCALE = '#include <lights_physical_fragment>\n material.specularColor *= uLeafLight.z; material.specularColorBlended *= uLeafLight.z; material.specularF90 *= uLeafLight.z;';
const SKY_FILL_UNUSED = 0;
const SKY_FILL = '#include <lights_fragment_end>\n reflectedLight.indirectDiffuse *= mix( 1.0, vAO, 0.35 ); reflectedLight.indirectSpecular *= vAO * vAO * 0.5;\n reflectedLight.indirectDiffuse += material.diffuseContribution * vec3( 0.85, 0.95, 1.15 ) * uLeafLight.w * ( 1.0 - uNight );';

function bindUniforms(sh, uni) { for (const k in uni) sh.uniforms[k] = uni[k]; }
function leafMaterial(uni, opts, rough, bb = false) {
  const m = new THREE.MeshStandardMaterial({ map: placeholderTex(), alphaTest: 0.5, alphaToCoverage: !!opts.alphaToCoverage, side: THREE.DoubleSide, roughness: rough, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    bindUniforms(sh, uni);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + COMMON + LEAFCOL_V + 'attribute vec3 aPivot;\nattribute vec4 aInfo;\nvarying float vFade;\n' + (bb ? BB_V : 'attribute vec3 aCardN;\n'))
      .replace('#include <beginnormal_vertex>', bb ? `vec3 objectNormal = normal;
{ vec3 lo0; vec3 pc = ezBillboard(position, lo0); objectNormal = normalize(normal + normalize(lo0 + 1e-6) * uBBTilt); }
#ifdef USE_TANGENT
  vec3 objectTangent = vec3( tangent.xyz );
#endif` : '#include <beginnormal_vertex>')
      .replace('#include <begin_vertex>', bb ? `#include <begin_vertex>
transformed = ezWind(ezDestretch(transformed, aPivot), aPivot, aInfo.w);
{ vec3 lo; transformed = ezBillboard(transformed, lo); }
vLeafCol = ezLeafColor(aInfo.x, aInfo.y, 0.0); vAO = aInfo.z; vFade = 1.0;` : `#include <begin_vertex>
transformed = ezWind(ezDestretch(transformed, aPivot), aPivot, aInfo.w);
vLeafCol = ezLeafColor(aInfo.x, aInfo.y, 0.0); vAO = aInfo.z;
{ mat4 fm = ezObj(); vec3 fs = ezScale(fm); vec3 wn = normalize(mat3(fm) * (aCardN / (fs * fs))); vec3 wp = (fm * vec4(transformed, 1.0)).xyz;
  vFade = smoothstep(0.12, 0.42, abs(dot(wn, normalize(cameraPosition - wp)))); }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uTexStats;\nuniform vec4 uTexK;\nuniform float uNight;\nvarying vec3 vLeafCol;\nvarying float vAO;\nvarying float vFade;\n')
      .replace('#include <map_fragment>', /* glsl */`
#ifdef USE_MAP
  vec4 tx = texture2D( map, vMapUv );
  float tl = dot( tx.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  vec3 det = mix( vec3( tl / uTexStats.w ), tx.rgb / max( uTexStats.xyz, vec3( 1e-3 ) ), uTexK.x );
  diffuseColor.rgb *= vLeafCol * det * vAO;
  diffuseColor.a *= tx.a * vFade;
#endif`)
      .replace('#include <color_fragment>', '')
      .replace('#include <normal_fragment_begin>', NORMAL_NOFLIP)
      .replace('#include <lights_physical_pars_fragment>', LEAF_LIGHT)
      .replace('#include <lights_physical_fragment>', SPEC_SCALE)
      .replace('#include <lights_fragment_end>', SKY_FILL);
  };
  m.customProgramCacheKey = () => 'ez-leaf-2' + (bb ? 'bb' : '');
  return m;
}
function barkMaterial(uni, tex, d) {
  const m = new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normal, roughness: 0.92, metalness: 0, color: new THREE.Color(d.bark.tint) });
  m.normalScale.set(1, 1);
  const patch = d.bark.patches === 'plane' ? 1 : d.bark.patches === 'euc' ? 2 : 0;
  m.onBeforeCompile = (sh) => {
    bindUniforms(sh, uni);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + COMMON + 'attribute float aAO;\nvarying float vAO;\nvarying vec2 vBarkUv;\n')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = ezWind(transformed, transformed, 0.0);\nvAO = aAO; vBarkUv = uv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n' + (d.bark.rot ? '#ifdef USE_MAP\n vMapUv = vec2(vMapUv.y, vMapUv.x);\n#endif\n#ifdef USE_NORMALMAP\n vNormalMapUv = vec2(vNormalMapUv.y, vNormalMapUv.x);\n#endif\n' : ''));
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAO;\nvarying vec2 vBarkUv;\nfloat ezN(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5), b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5), c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5), e=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5); return mix(mix(a,b,f.x),mix(c,e,f.x),f.y); }\n')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
  vec4 bt = texture2D( map, vMapUv );
  bt.rgb = mix( vec3( dot( bt.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ), bt.rgb, ${(d.bark.sat ?? 1).toFixed(3)} );
  diffuseColor *= bt;
#endif`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n reflectedLight.indirectDiffuse += material.diffuseContribution * vec3(0.85, 0.95, 1.1) * ${(d.bark.fill ?? 0.06).toFixed(3)};`)
      .replace('#include <color_fragment>', /* glsl */`
  diffuseColor.rgb *= vAO * ${(d.bark.bright ?? 1).toFixed(3)};
#if ${patch} == 1
  { // London plane: camouflage patches of cream, olive and grey-brown
    vec2 q = vBarkUv * vec2(6.0, 4.5);
    float n = ezN(q) * 0.55 + ezN(q * 2.1 + 7.1) * 0.3 + ezN(q * 4.3 + 1.7) * 0.15;
    vec3 c = n < 0.4 ? vec3(0.55, 0.56, 0.42) : n < 0.52 ? vec3(0.78, 0.74, 0.62) : n < 0.66 ? vec3(1.02, 0.99, 0.88) : vec3(1.2, 1.16, 0.98);
    diffuseColor.rgb *= c;
  }
#elif ${patch} == 2
  { // blue gum: pale, with long grey-brown strips of old bark peeling away
    vec2 q = vBarkUv * vec2(3.0, 0.45);
    float n = ezN(q) * 0.65 + ezN(q * 2.7 + 3.1) * 0.35;
    diffuseColor.rgb *= n < 0.38 ? vec3(0.62, 0.55, 0.47) : n > 0.72 ? vec3(1.05, 1.0, 1.02) : vec3(0.95, 0.93, 0.88);
  }
#endif`);
  };
  m.customProgramCacheKey = () => 'ez-bark-2-' + patch + (d.bark.rot ? 'r' : '') + (d.bark.sat ?? 1) + '-' + (d.bark.bright ?? 1) + '-' + (d.bark.fill ?? 0.06);
  return m;
}
function impostorMaterial(uni, opts) {
  const m = new THREE.MeshStandardMaterial({ map: placeholderTex(), alphaTest: 0.5, alphaToCoverage: !!opts.alphaToCoverage, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    bindUniforms(sh, uni);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + COMMON + LEAFCOL_V + 'attribute vec3 aCardN;\nvarying float vFade;\n')
      .replace('#include <beginnormal_vertex>', /* glsl */`
vec3 objectNormal = normal;
{
  mat4 mm = ezObj(); vec3 ms = ezScale(mm);
  vec3 wp = ( mm * vec4( position, 1.0 ) ).xyz;
  vec3 wcn = normalize( mat3( mm ) * ( aCardN / ( ms * ms ) ) );
  float fd = dot( wcn, normalize( cameraPosition - wp ) );
  vFade = smoothstep( 0.55, 0.84, abs( fd ) );
  vec3 cn = fd < 0.0 ? -aCardN : aCardN;
  objectNormal = normalize( normal + cn * 0.75 );
}
#ifdef USE_TANGENT
  vec3 objectTangent = vec3( tangent.xyz );
#endif`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = ezWind(transformed, transformed, 0.0);\nvLeafCol = ezLeafColor(0.5, 0.5, 1.0); vAO = 1.0;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uBarkCol;\nuniform vec4 uImpK;\nuniform float uNight;\nvarying vec3 vLeafCol;\nvarying float vAO;\nvarying float vFade;\n')
      .replace('#include <map_fragment>', /* glsl */`
#ifdef USE_MAP
  vec4 tx = texture2D( map, vMapUv );
  diffuseColor.rgb *= mix( vLeafCol * uImpK.x, uBarkCol * uImpK.y, tx.g ) * tx.r * 2.0;
  diffuseColor.a *= tx.a * vFade;
#endif`)
      .replace('#include <color_fragment>', '')
      .replace('#include <normal_fragment_begin>', NORMAL_NOFLIP)
      .replace('#include <lights_physical_pars_fragment>', LEAF_LIGHT)
      .replace('#include <lights_physical_fragment>', SPEC_SCALE)
      .replace('#include <lights_fragment_end>', SKY_FILL);
  };
  m.customProgramCacheKey = () => 'ez-imp-1';
  return m;
}
// shadow pass: same wind (and leaf de-stretch); three copies map + alphaTest + side from the main material
function depthMaterials(uni, kind) {
  const patch = (m, key) => {
    m.onBeforeCompile = (sh) => {
      bindUniforms(sh, uni);
      const leafy = kind === 'leaf' || kind === 'bb';
      const head = '#include <common>\n' + COMMON + (leafy ? 'attribute vec3 aPivot;\nattribute vec4 aInfo;\n' : '') + (kind === 'bb' ? BB_V : '');
      const body = leafy ? 'transformed = ezWind(ezDestretch(transformed, aPivot), aPivot, aInfo.w);' + (kind === 'bb' ? '\n{ vec3 lo; transformed = ezBillboard(transformed, lo); }' : '') : 'transformed = ezWind(transformed, transformed, 0.0);';
      sh.vertexShader = sh.vertexShader.replace('#include <common>', head).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + body);
    };
    m.customProgramCacheKey = () => key;
    return m;
  };
  return { depth: patch(new THREE.MeshDepthMaterial(), 'ez-depth-' + kind), distance: patch(new THREE.MeshDistanceMaterial(), 'ez-dist-' + kind) };
}

// ------------------------------------------------------------------------------------------------ impostor
// Far LOD: three vertical cards (0/60/120 deg) + one horizontal card, textured with orthographic paintings of the
// LOD1 tree made on a 2D canvas (each leaf card is an affine sprite blit, bark tubes are quads). Texture channels:
// R = brightness (leaf luminance x AO, 0.5 = species mean), G = bark mask, A = coverage. Colour comes from the same
// per-tree palette pick as the leaves.
const IMP_VIEWS = [0, Math.PI / 3, 2 * Math.PI / 3];
const IMP_M = 0.04; // gutter inside each atlas cell (no bleeding between views in the mip chain)
function impostorGeometry(W, yTop) {
  const pos = [], nrm = [], uv = [], cn = [], idx = [], M = IMP_M, S = 1 - 2 * IMP_M;
  const cell = (k) => [(k % 2) * 0.5, k < 2 ? 0.5 : 0.0]; // canvas cell k (row-major, top row first) -> GL uv origin
  IMP_VIEWS.forEach((th, k) => {
    const h = V3(Math.cos(th), 0, Math.sin(th)), n = V3(-Math.sin(th), 0, Math.cos(th)), [u0, v0] = cell(k), b = pos.length / 3;
    for (const [a, y] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) {
      pos.push(h.x * a * W, y, h.z * a * W);
      nrm.push(h.x * a * 0.8, (y - 0.55) * 1.1, h.z * a * 0.8); cn.push(n.x, n.y, n.z);
      uv.push(u0 + (M + S * (a + 1) / 2) * 0.5, v0 + (M + S * y) * 0.5);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  { const [u0, v0] = cell(3), b = pos.length / 3;
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { pos.push(x * W, yTop, z * W); nrm.push(x * 0.5, 0.2, z * 0.5); cn.push(0, 1, 0); uv.push(u0 + (M + S * (x + 1) / 2) * 0.5, v0 + (1 - M - S * (z + 1) / 2) * 0.5); }
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aCardN', new THREE.Float32BufferAttribute(cn, 3)); g.setIndex(idx);
  return g;
}
function impostorSprites(clumpCanvas, meanLum) {
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high';
  g.drawImage(clumpCanvas, 0, 0, S, S); const src = g.getImageData(0, 0, S, S);
  const levels = [0.35, 0.5, 0.62, 0.75, 0.88, 1.0];
  return levels.map((ao) => {
    const cc = document.createElement('canvas'); cc.width = cc.height = S; const gg = cc.getContext('2d'); const im = gg.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const l = 0.2126 * s2l(src.data[i * 4] / 255) + 0.7152 * s2l(src.data[i * 4 + 1] / 255) + 0.0722 * s2l(src.data[i * 4 + 2] / 255);
      im.data[i * 4] = clamp(0.5 * (l / meanLum) * ao, 0, 1) * 255; im.data[i * 4 + 1] = 0; im.data[i * 4 + 2] = 0; im.data[i * 4 + 3] = src.data[i * 4 + 3];
    }
    gg.putImageData(im, 0, 0); return { ao, c: cc };
  });
}
function bakeImpostor(cards, segs, W, yTop, sprites, size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d', { willReadFrequently: true });
  const C = size / 2;
  const spriteFor = (ao) => { let best = sprites[0]; for (const s of sprites) if (Math.abs(s.ao - ao) < Math.abs(best.ao - ao)) best = s; return best.c; };
  const paint = (cx0, cy0, proj, depth, sx, sy) => {
    const items = [];
    for (const cd of cards) { const ctr = cd.bb ? cd.c : cd.q[0].clone().add(cd.q[2]).multiplyScalar(0.5); items.push({ d: depth(ctr), cd }); }
    for (const s of segs) items.push({ d: depth(s.a.clone().add(s.b).multiplyScalar(0.5)), s });
    items.sort((a, b) => a.d - b.d);
    for (const it of items) {
      if (it.cd && it.cd.bb) {
        const P = proj(it.cd.c), hsx = it.cd.s * 0.5 * sx, hsy = it.cd.s * 0.5 * sy;
        g.setTransform(1, 0, 0, 1, cx0 + P[0], cy0 + P[1]); g.rotate(it.cd.roll); g.drawImage(spriteFor(it.cd.ao), -hsx, -hsy, hsx * 2, hsy * 2);
      } else if (it.cd) {
        const q = it.cd.q.map((p) => proj(p)); const P0 = q[0], P2 = q[2], P3 = q[3];
        g.setTransform(P2[0] - P3[0], P2[1] - P3[1], P0[0] - P3[0], P0[1] - P3[1], cx0 + P3[0], cy0 + P3[1]);
        g.drawImage(spriteFor(it.cd.ao), 0, 0, 1, 1);
      } else {
        const s = it.s, A = proj(s.a), B = proj(s.b); let dx = B[0] - A[0], dy = B[1] - A[1]; const L = Math.hypot(dx, dy);
        const kx = C * (1 - 2 * IMP_M) / (2 * W), ra = Math.max(0.6, s.ra * kx), rb = Math.max(0.5, s.rb * kx);
        g.setTransform(1, 0, 0, 1, cx0, cy0);
        const v = Math.round(clamp(0.5 * 0.55 * s.ao, 0, 1) * 255); g.fillStyle = `rgb(${v},255,0)`;
        if (L < 0.5) { g.beginPath(); g.arc(A[0], A[1], ra, 0, TAU); g.fill(); continue; }
        dx /= L; dy /= L; const px = -dy, py = dx;
        g.beginPath(); g.moveTo(A[0] + px * ra, A[1] + py * ra); g.lineTo(B[0] + px * rb, B[1] + py * rb); g.lineTo(B[0] - px * rb, B[1] - py * rb); g.lineTo(A[0] - px * ra, A[1] - py * ra); g.closePath(); g.fill();
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  };
  IMP_VIEWS.forEach((th, k) => {
    const h = V3(Math.cos(th), 0, Math.sin(th)), n = V3(-Math.sin(th), 0, Math.cos(th));
    const cx0 = (k % 2) * C, cy0 = k < 2 ? 0 : C;
    g.save(); g.beginPath(); g.rect(cx0, cy0, C, C); g.clip();
    paint(cx0, cy0, (p) => [(IMP_M + (1 - 2 * IMP_M) * (p.dot(h) + W) / (2 * W)) * C, (IMP_M + (1 - 2 * IMP_M) * (1 - p.y)) * C], (p) => p.dot(n), C * (1 - 2 * IMP_M) / (2 * W), C * (1 - 2 * IMP_M));
    g.restore();
  });
  g.save(); g.beginPath(); g.rect(C, C, C, C); g.clip();
  paint(C, C, (p) => [(IMP_M + (1 - 2 * IMP_M) * (p.x + W) / (2 * W)) * C, (IMP_M + (1 - 2 * IMP_M) * (p.z + W) / (2 * W)) * C], (p) => p.y, C * (1 - 2 * IMP_M) / (2 * W), C * (1 - 2 * IMP_M) / (2 * W));
  g.restore();
  return c;
}

// ------------------------------------------------------------------------------------------------ species build
function triCount(g) { return (g.index ? g.index.count : g.attributes.position.count) / 3; }
function scaleGeo(g, k) {
  g.scale(k, k, k);
  const pv = g.attributes.aPivot; if (pv) { for (let i = 0; i < pv.count; i++) pv.setXYZ(i, pv.getX(i) * k, pv.getY(i) * k, pv.getZ(i) * k); pv.needsUpdate = true; }
}
function buildSpray(id, d, ctx, sk, unitM, t0, C) {
  const L = d.leaf, seed = d.ez.seed;
  const leavesAll = sk.leaves.filter((l, i) => l.o.y > C.minY && hash1(i * 1.618 + 0.37) < (L.density ?? 1));
  const cm = crownModel(leavesAll.length ? leavesAll.map((l) => l.o) : [V3(0, 1, 0)], d.crown.mode);
  const B0 = ctx.lod0Budget, B1 = ctx.lod1Budget, aoMin = d.crown.aoMin;
  let spec0 = { ...d.lod0 }, bark0 = meshBark(sk, spec0, unitM, d.bark.tile, cm, aoMin); meshKnobs(bark0, sk.knobs, unitM, d.bark.tile, 2);
  for (let g = 0; bark0.idx.length / 3 > B0 * 0.42 && g < 8; g++) { spec0 = { ...spec0, minR: spec0.minR * 1.5 }; bark0 = meshBark(sk, spec0, unitM, d.bark.tile, cm, aoMin); meshKnobs(bark0, sk.knobs, unitM, d.bark.tile, 2); }
  const room0 = Math.floor((B0 - bark0.idx.length / 3) / 2);
  let list0 = leavesAll, g0 = 1;
  if (list0.length > room0) { list0 = leavesAll.filter((l, i) => hash1(i * 2.71 + 0.11) < room0 / leavesAll.length).slice(0, room0); g0 = Math.min(1.4, Math.sqrt(leavesAll.length / list0.length)); }
  const cardU = L.card / unitM / Math.max(1e-3, d.ez.leaves.size);
  const cards0 = sprayCards(list0, cm, C, cardU, seed, g0);
  const imp0 = [];
  const leaf0 = meshCards(cards0, cm, d.shade, imp0, null, L.stamp > 0);
  const segs1 = [], bark1 = meshBark(sk, d.lod1, unitM, d.bark.tile, cm, aoMin, segs1); meshKnobs(bark1, sk.knobs, unitM, d.bark.tile, 0);
  const room1 = Math.floor((B1 - bark1.idx.length / 3) / 2);
  const list1 = leavesAll.filter((l, i) => hash1(i * 3.33 + 0.71) < room1 / Math.max(1, leavesAll.length)).slice(0, room1);
  const cards1 = sprayCards(list1, cm, C, cardU, seed + 9, clamp(Math.sqrt(leavesAll.length / Math.max(1, list1.length)) * 0.95, 1, 3));
  const leaf1 = meshCards(cards1, cm, d.shade, null, null, L.stamp > 0);
  return finishSpecies(id, d, ctx, { sk, cm, bark0, leaf0, bark1, leaf1, imp0, segs1, unitM, t0, stats: { leaves: leavesAll.length, cards0: cards0.length, cards1: cards1.length } });
}
function buildSpecies(id, d, ctx) {
  const t0 = performance.now();
  const sk = d.pollard ? pollardSkeleton(d) : d.trunks ? multiStem(d) : ezSkeleton(d.ez, d.ezx);
  sk.knobs = sk.knobs || [];
  // raw extent (skeleton units) -> metres
  let rawTop = 0; for (const br of sk.branches) for (const s of br.secs) rawTop = Math.max(rawTop, s.o.y + s.r);
  for (const lf of sk.leaves) rawTop = Math.max(rawTop, lf.o.y + lf.size * 0.8);
  const unitM = d.typical.height / rawTop;
  const L = d.leaf, C = { ...d.clump, aoMin: d.crown.aoMin }, dens = L.density ?? 1, seed = (d.ez?.seed ?? 3303);
  // ---- foliage clumps (+ late-season thinning: fewer clumps, sparser clumps)
  C.minY = (C.minY ?? 1.2) / unitM;
  // prune foliage-less low branches (conifer skirts of bare spikes): side branches entirely below the crown base
  if (C.prune !== false) {
    const top = sk.branches.map((br) => br.secs.reduce((m, q) => Math.max(m, q.o.y), -1e9));
    for (let i = sk.branches.length - 1; i >= 0; i--) { const pi = sk.branches[i].parent; if (pi >= 0) top[pi] = Math.max(top[pi], top[i]); }
    const keep = sk.branches.map((br, i) => !(br.level >= 1 && top[i] < C.minY * 0.92));
    const remap = []; let n = 0; sk.branches.forEach((br, i) => { remap[i] = keep[i] ? n++ : -1; });
    sk.branches = sk.branches.filter((br, i) => keep[i]).map((br) => ({ ...br, parent: br.parent >= 0 ? remap[br.parent] : -1 }));
  }
  if (C.mode === 'spray') return buildSpray(id, d, ctx, sk, unitM, t0, C);
  let clumps = clumpify(sk.leaves.filter((l) => C.single || l.o.y > C.minY * 0.8), C.cell / unitM, C, seed);
  const minYAt = (p, Rx) => C.minY * (1 - (C.skirt ?? 0) * smooth(0.35, 1.0, Math.hypot(p.x, p.z) / Rx));
  if (!C.single) { let Rx = 0; for (const c of clumps) Rx = Math.max(Rx, Math.hypot(c.c.x, c.c.z)); C.minYAt = (p) => minYAt(p, Rx || 1); clumps = clumps.filter((c) => c.c.y > C.minYAt(c.c)); }
  const cmPts = clumps.length > 8 ? clumps.map((c) => c.c) : sk.leaves.map((l) => l.o).concat(sk.knobs.map((k) => k.c));
  const cm = crownModel(cmPts.length ? cmPts : [V3(0, rawTop * 0.6, 0)], d.crown.mode);
  clumps = fillClumps(clumps, cm, C.cell / unitM, C, seed + 5);
  if (dens < 1 && !C.single) clumps = clumps.filter((c) => hash1(c.i * 1.618 + 0.37) < 0.3 + 0.7 * dens);
  if (clumps.length > 8) { const mr = clumps.reduce((a, c) => a + c.r, 0) / clumps.length; cm.R.addScalar(mr * 0.7); cm.y1 += mr * 0.7; cm.y0 -= mr * 0.5; }
  const aoMin = d.crown.aoMin;
  // ---- LOD0: bark within budget, then foliage cards (density-driven, capped by the budget)
  const B0 = ctx.lod0Budget, B1 = ctx.lod1Budget;
  const mk0 = (spec) => { const a = meshBark(sk, spec, unitM, d.bark.tile, cm, aoMin); meshKnobs(a, sk.knobs, unitM, d.bark.tile, 2); return a; };
  let spec0 = { ...d.lod0 }, bark0 = mk0(spec0);
  for (let guard = 0; bark0.idx.length / 3 > B0 * (clumps.length ? 0.42 : 0.9) && guard < 8; guard++) { spec0 = { ...spec0, minR: spec0.minR * 1.5 }; bark0 = mk0(spec0); }
  const room0 = Math.max(0, Math.floor((B0 - bark0.idx.length / 3) / 2));
  const cardU0 = L.card / unitM;
  const layers = (L.layers ?? 1.5) * (dens < 1 ? 0.45 + 0.55 * dens : 1);
  const want = clumps.map((c) => C.single ? 1 : Math.max(2, (4 * Math.PI * c.r * c.r) / (cardU0 * cardU0) * layers * ((C.inner ?? 0.25) + (1 - (C.inner ?? 0.25)) * smooth(0.25, 0.9, crownE(cm, c.c)))));
  const tot = want.reduce((a, b) => a + b, 0), kf = tot > room0 ? room0 / tot : 1;
  const n0 = want.map((w) => Math.max(1, Math.floor(w * kf + 0.5)));
  let cards0 = []; clumps.forEach((cl, i) => { cards0.push(...clumpCards(cl, n0[i], cm, C, cardU0 * (kf < 1 ? Math.min(1.35, 1 / Math.sqrt(kf)) : 1), 0, seed * 31 + i * 17)); });
  if (cards0.length > room0) cards0 = cards0.slice(0, room0);
  const imp0 = [];
  const masses = massCentres(clumps), atlas = !C.single && L.stamp > 0, bb = !!L.bb && !C.single;
  const leaf0 = meshCards(cards0, cm, d.shade, imp0, masses, atlas, bb);
  // ---- LOD1: trunk + main limbs, a few big cards per clump
  const spec1 = d.lod1, segs1 = [];
  const bark1 = meshBark(sk, spec1, unitM, d.bark.tile, cm, aoMin, segs1); meshKnobs(bark1, sk.knobs, unitM, d.bark.tile, 0);
  const room1 = Math.max(0, Math.floor((B1 - bark1.idx.length / 3) / 2));
  const tot0 = n0.reduce((a, b) => a + b, 0), k1 = Math.min(1, room1 / Math.max(1, tot0));
  let cards1 = [];
  clumps.forEach((cl, i) => {
    const n1 = C.single ? 1 : Math.max(1, Math.round(n0[i] * k1));
    const grow = C.single ? 1.2 : clamp(Math.sqrt(n0[i] / n1) * 1.0, 1, 2.8);
    cards1.push(...clumpCards(cl, n1, cm, C, cardU0 * grow, C.single ? 0 : 1, seed * 53 + i * 29));
  });
  if (cards1.length > room1) cards1 = cards1.filter((c, i) => hash1(i * 4.4) < room1 / cards1.length).slice(0, room1);
  const leaf1 = meshCards(cards1, cm, d.shade, null, masses, atlas, bb);
  return finishSpecies(id, d, ctx, { sk, cm, bark0, leaf0, bark1, leaf1, imp0, segs1, unitM, t0, stats: { clumps: clumps.length, cards0: cards0.length, cards1: cards1.length } });
}
function finishSpecies(id, d, ctx, o) {
  const { sk, cm, bark0, leaf0, bark1, leaf1, imp0, segs1, unitM, t0 } = o, L = d.leaf, C = d.clump, dens = L.density ?? 1, seed = (d.ez?.seed ?? 3303);
  // ---- geometries + normalisation (height 1 from LOD0's top)
  const g0b = bark0.geometry(), g0l = leaf0.count ? leaf0.geometry() : null, g1b = bark1.geometry(), g1l = leaf1.count ? leaf1.geometry() : null;
  let H = 0; for (const g of [g0b, g0l]) if (g) { g.computeBoundingBox(); H = Math.max(H, g.boundingBox.max.y); }
  for (const g of [g0b, g0l, g1b, g1l]) if (g) scaleGeo(g, 1 / H);
  const inv = 1 / H;
  for (const cd of imp0) { if (cd.bb) { cd.c.multiplyScalar(inv); cd.s *= inv; } else for (const q of cd.q) q.multiplyScalar(inv); }
  for (const s of segs1) { s.a = s.a.clone().multiplyScalar(inv); s.b = s.b.clone().multiplyScalar(inv); s.ra *= inv; s.rb *= inv; }
  const fol = g0l || g0b, fp = fol.attributes.position, rad = [], ys = [];
  for (let i = 0; i < fp.count; i++) { rad.push(Math.hypot(fp.getX(i), fp.getZ(i))); ys.push(fp.getY(i)); }
  const normRadius = percentile(rad, 0.95), crownBase = g0l ? percentile(ys, 0.03) : 0.4;
  // impostor extent covers LOD0's cards
  let W = 0; for (const cd of imp0) { if (cd.bb) W = Math.max(W, Math.hypot(cd.c.x, cd.c.z) + cd.s * 0.5); else for (const q of cd.q) W = Math.max(W, Math.hypot(q.x, q.z)); }
  W = Math.max(W, normRadius) * 1.02;
  const yTop = clamp(cm.c.y / H, 0.3, 0.8);
  const g2 = impostorGeometry(W, yTop);
  for (const g of [g0b, g0l, g1b, g1l, g2]) if (g) { g.computeBoundingBox(); g.computeBoundingSphere(); }
  // ---- materials
  const pal = L.pal.slice(0, 6).map(linCol); while (pal.length < 6) pal.push(pal[pal.length - 1].clone());
  const uni = {
    uTime: U.uTime, uWind: U.uWind, uWindDir: TREE_WIND_DIR, uNight: U.uNight,
    uSway: { value: new THREE.Vector4(d.sway[0], d.sway[1], clamp(crownBase * 0.6, 0.02, 0.6), 0) },
    uVar: { value: new THREE.Vector4(d.vary?.[0] ?? 0.06, d.vary?.[1] ?? 0.35, 0, 0) },
    uPal: { value: pal }, uPalN: { value: Math.min(6, L.pal.length) },
    uColK: { value: new THREE.Vector4(L.sec, L.vary, L.tintK, L.tintSat) },
    uTexK: { value: new THREE.Vector4(L.keepHue, 0, 0, 0) },
    uLeafLight: { value: new THREE.Vector4(L.wrap, L.back, L.spec, L.fill ?? 0.07) }, uBBTilt: { value: L.bbTilt ?? 0.8 },
    uBarkCol: { value: linCol(d.bark.tint).multiplyScalar(0.3) }, uImpK: { value: new THREE.Vector4(d.lodK?.[2] ?? 0.9, 1, 0, 0) },
  };
  const uni0 = { ...uni, uDirK: { value: 1 }, uTexStats: { value: new THREE.Vector4(0.12, 0.2, 0.06, 0.17) } }, uni1 = { ...uni, uDirK: { value: d.lodK?.[0] ?? 0.85 }, uTexStats: { value: uni0.uTexStats.value.clone() } };
  const uniI = { ...uni, uDirK: { value: d.lodK?.[1] ?? 0.55 } };
  const barkMat = barkMaterial(uni, ctx.bark(d.bark.tex), d);
  const bbm = !!L.bb && !C.single && C.mode !== 'spray';
  const leafMat0 = leafMaterial(uni0, ctx.opts, L.rough, bbm), leafMat1 = leafMaterial(uni1, ctx.opts, L.rough, bbm), impMat = impostorMaterial(uniI, ctx.opts);
  barkMat.name = `ez:${id}:bark`; leafMat0.name = `ez:${id}:leaves0`; leafMat1.name = `ez:${id}:leaves1`; impMat.name = `ez:${id}:far`;
  const dl = depthMaterials(uni, bbm ? 'bb' : 'leaf'), db = depthMaterials(uni, 'bark');
  const P = (geometry, material, kind, dm) => ({ geometry, material, kind, depthMaterial: dm ? dm.depth : null, distanceMaterial: dm ? dm.distance : null, castShadow: true, receiveShadow: true });
  const lod = (parts) => ({ parts, triangles: parts.reduce((s, p) => s + triCount(p.geometry), 0) });
  const lods = [
    lod([P(g0b, barkMat, 'bark', db), ...(g0l ? [P(g0l, leafMat0, 'leaves', dl)] : [])]),
    lod([P(g1b, barkMat, 'bark', db), ...(g1l ? [P(g1l, leafMat1, 'leaves', dl)] : [])]),
    lod([P(g2, impMat, 'far', null)]),
  ];
  // leaf textures + far impostor arrive asynchronously (the leaf photo has to decode first)
  const size0 = clamp(Math.min(ctx.opts.leafTexSize, 512), 128, 512);
  const plain = C.single || !(L.stamp > 0), lay = L.layout || 'fan';
  const ready = Promise.all([ctx.leafTex(L.tex, plain ? 0 : L.stamp, size0, seed, lay), ctx.leafTex(L.tex, plain ? 0 : L.stamp * (lay === 'feather' ? 1 : 0.75), size0, seed + 1, lay)]).then(([t0x, t1x]) => {
    const ti = performance.now();
    leafMat0.map.dispose(); leafMat0.map = t0x.tex; uni0.uTexStats.value.copy(t0x.stats);
    leafMat1.map.dispose(); leafMat1.map = t1x.tex; uni1.uTexStats.value.copy(t1x.stats);
    const sprites = impostorSprites(t0x.cell0, t0x.stats.w);
    const canvas = bakeImpostor(imp0, segs1, W, yTop, sprites, ctx.impSize);
    const id2 = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const { mips } = mipChain(id2.data, canvas.width, canvas.height);
    impMat.map.dispose(); impMat.map = dataTex(mips, false);
    if (ctx.debugCanvas) ctx.debugCanvas[id] = { imp: canvas, leaf0: t0x.canvas, leaf1: t1x.canvas };
    ctx.timing['imp:' + id] = Math.round(performance.now() - ti);
  });
  const trunkR = (sk.branches[0]?.secs[1]?.r ?? 0.3) / H;
  return {
    id, name: d.name, lods, normHeight: 1, normRadius, crownBase, trunkRadius: trunkR,
    typical: { ...d.typical }, season: ctx.opts.season, leafDensity: dens, uniforms: uni, materials: [barkMat, leafMat0, leafMat1, impMat],
    ready, buildMs: performance.now() - t0, debug: ctx.opts.debugSkeleton ? { sk, cm } : undefined,
    stats: { lod0: lods[0].triangles, lod1: lods[1].triangles, lod2: lods[2].triangles, ...o.stats, bark0: bark0.idx.length / 3, unitM: +unitM.toFixed(4) },
  };
}

// ------------------------------------------------------------------------------------------------ public API
export function createTreeLibrary(opts = {}) {
  opts = { season: 'late-autumn', leafTexSize: 1024, alphaToCoverage: true, lod0Budget: 7800, lod1Budget: 1180, only: null, ...opts };
  const t0 = performance.now();
  const loader = new THREE.TextureLoader();
  const barkCache = {}, kindCache = {}, imgCache = {}, timing = {};
  const ctx = {
    timing,
    opts, lod0Budget: opts.lod0Budget, lod1Budget: opts.lod1Budget, impSize: opts.impostorSize ?? 512, debugCanvas: opts.debugCanvas || null,
    bark(kind) {
      if (barkCache[kind]) return barkCache[kind];
      const [c, n] = BARK_SRC[kind];
      const map = loader.load(c); map.colorSpace = THREE.SRGBColorSpace; const normal = loader.load(n);
      for (const t of [map, normal]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
      return (barkCache[kind] = { map, normal });
    },
    leafTex(kind, stamp, size, seed, layout = 'fan') {
      const key = `${kind}|${stamp.toFixed(3)}|${size}|${layout}`;
      if (kindCache[key]) return kindCache[key];
      if (!imgCache[kind]) imgCache[kind] = loadImage(LEAF_SRC[kind]);
      return (kindCache[key] = imgCache[kind].then((img) => {
        const tk = performance.now();
        let cv, cell0;
        if (stamp > 0) { // 2x2 atlas of different compositions (cards pick one at random -> less visible repetition)
          cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d', { willReadFrequently: true }); const h2 = size >> 1;
          for (let k = 0; k < 4; k++) { const c = patchCanvas(img, h2, stamp, seed + k * 101, layout); if (!k) cell0 = c; g.drawImage(c, (k % 2) * h2, (k >> 1) * h2); }
        } else cv = cell0 = stampCanvas(img, size, [{ x: 0.5, y: 0, rot: 0, s: 1 }]);
        const raw = cv.getContext('2d').getImageData(0, 0, size, size);
        const cov0 = coverage(raw.data, size * size), boost = stamp > 0 ? boostAlpha(raw.data, size * size, 0.5) : 1;
        if (boost !== 1) cv.getContext('2d').putImageData(raw, 0, 0);
        const a = mipChain(raw.data, size, size);
        timing['leaf:' + key] = Math.round(performance.now() - tk) + ` cov ${cov0.toFixed(2)}->${coverage(a.rgba, size * size).toFixed(2)}`;
        return { tex: dataTex(a.mips, true), stats: texStats(a.rgba, size * size), canvas: cv, cell0 };
      }));
    },
  };
  const species = {};
  for (const [id, d] of Object.entries(SPECIES)) { if (opts.only && !opts.only.includes(id)) continue; species[id] = buildSpecies(id, d, ctx); }
  // Mexican fan palm: EZ-Tree has no palms, so it comes from the procedural library (re-referenced to relative tint)
  let proc = null;
  if (!opts.only || opts.only.includes('palm')) {
    proc = createProceduralLibrary({ season: opts.season, leafTexSize: Math.min(1024, opts.leafTexSize), alphaToCoverage: opts.alphaToCoverage, only: ['palm'] });
    const palm = proc.species.palm; palm.uniforms.uRefTint.value = new THREE.Color(1, 1, 1);
    species.palm = palm;
  }
  const buildMs = performance.now() - t0;
  let lastTime = U.uTime.value;
  const ready = Promise.all(Object.values(species).map((s) => s.ready).filter(Boolean)).then(() => { lib.readyMs = performance.now() - t0; });
  const lib = {
    species, season: opts.season, buildMs, ready, TINT_MODE, timing,
    update(dt) {
      if (proc) proc.update(dt);
      else { if (U.uTime.value === lastTime) U.uTime.value += dt; lastTime = U.uTime.value; }
    },
    setViewportHeight(px) { proc?.setViewportHeight?.(px); },
    stats() { const o = {}; for (const [k, s] of Object.entries(species)) o[k] = s.stats || { lod0: s.lods[0].triangles, lod1: s.lods[1].triangles, lod2: s.lods[2].triangles }; return o; },
    dispose() {
      for (const sp of Object.values(species)) { for (const l of sp.lods) for (const p of l.parts) { p.geometry.dispose(); p.depthMaterial?.dispose(); p.distanceMaterial?.dispose(); } for (const m of sp.materials || []) { m.map?.dispose?.(); m.dispose(); } }
      for (const b of Object.values(barkCache)) { b.map.dispose(); b.normal.dispose(); }
    },
  };
  return lib;
}
