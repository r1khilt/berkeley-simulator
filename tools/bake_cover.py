#!/usr/bin/env python3
"""r4-ground-surface: land-cover clean-up for the shipped ground layers (no raw data needed).

The original bake (/work/ucb/tools/bake_ground.py) labelled everything under tree canopy that OSM did not call
lawn as 'dirt', and left unmapped open ground as 'natural' (rendered as dry golden grass). On a maintained campus
that reads as bare brown dirt everywhere. This post-process re-labels the ground from the shipped layers:

  * wild zones (named natural areas, Strawberry Creek banks, the hills east of Gayley/Piedmont) keep the old labels;
  * everywhere else: canopy over lawn -> lawn; unmapped open ground -> lawn; the rest of the canopy ground ->
    planted bed (special id 8 = mulch + groundcover, see pbrGround.js); lawn is extended under paving so lawn
    meets the path edge directly (no dry fringe); bed/lawn shapes are smoothed and specks removed.

Inputs come from the r4base git tag by default (so the script is idempotent); outputs overwrite
public/data/ground_sdf.bin.gz and ground_special.bin.gz in the same format (no loader change).
usage: python3 tools/bake_cover.py [--preview out.png]
"""
import gzip, json, subprocess, sys, io, os
import numpy as np, cv2
from scipy import ndimage as ndi

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = APP + '/public/data/'
BASE = os.environ.get('COVER_BASE', 'r4base')

def blob(name):
    return subprocess.run(['git', '-C', APP, 'show', f'{BASE}:public/data/{name}'], capture_output=True, check=True).stdout

meta = json.loads(blob('meta_core.json'))
c, gt, ax = meta['core'], meta['groundTex'], meta['aux']
X0, Z0 = c['x0'], c['z0']
NX, NZ, ST = gt['nx'], gt['nz'], gt['step']           # SDF grid (1.6 m)
R = 0.8                                                # working resolution (m)
WX, WZ = NX * 2, NZ * 2

def planar(r, nx, nz): return np.cumsum(np.cumsum(r.reshape(nz, nx).astype(np.int64), 0), 1)

# ---- decode originals
b = np.frombuffer(gzip.decompress(blob('ground_sdf.bin.gz')), np.int8)
N = NX * NZ
sdf0 = np.zeros((4, NZ, NX), np.float32)
for ch in range(4):
    q = np.cumsum(b[ch * N:(ch + 1) * N].reshape(NZ, NX).astype(np.int32), 1)
    sdf0[ch] = (np.minimum(255, np.round(q * 4.0476)) / 255.0 - 0.5) * 6.0      # metres, + inside
special0 = np.frombuffer(gzip.decompress(blob('ground_special.bin.gz')), np.uint8).reshape(gt['snz'], gt['snx']).copy()
ab = np.frombuffer(gzip.decompress(blob('ground_aux.bin.gz')), np.int8); NA = ax['nx'] * ax['nz']
lush2 = np.minimum(255, planar(ab[:NA], ax['nx'], ax['nz']) * 4.05) / 255.0
up = lambda a: cv2.resize(a.astype(np.float32), (WX, WZ), interpolation=cv2.INTER_LINEAR)
dA, dP, dG, dD = [up(sdf0[k]) for k in range(4)]
lush = cv2.resize(lush2.astype(np.float32), (WX, WZ), interpolation=cv2.INTER_LINEAR)
print('decoded', dA.shape)

# ---- helpers: world <-> working pixels
def px(x, z): return ((np.asarray(x) - X0) / R - 0.5, (np.asarray(z) - Z0) / R - 0.5)
SH = 3
def fill(mask, ring, val=1):
    u, v = px([p[0] for p in ring], [p[1] for p in ring])
    pts = (np.stack([u, v], -1) * (1 << SH)).round().astype(np.int32)
    cv2.fillPoly(mask, [pts], val, shift=SH)
def polyline(mask, pts, width, val=1):
    u, v = px([p[0] for p in pts], [p[1] for p in pts])
    a = (np.stack([u, v], -1) * (1 << SH)).round().astype(np.int32)
    cv2.polylines(mask, [a], False, val, thickness=max(1, int(round(width / R))), shift=SH)

# ---- buildings (OSM footprints + landmark footprints)
bj = json.loads(gzip.decompress(blob('buildings.json.gz')))
bm = np.zeros((WZ, WX), np.uint8)
for e in bj['b']:
    for part in e[7]:
        f = part[5]; ring = [(f[i] / 10, f[i + 1] / 10) for i in range(0, len(f) - 1, 2)]
        if len(ring) >= 3: fill(bm, ring)
        for h in (part[6] if len(part) > 6 and isinstance(part[6], list) else []):   # courtyards stay open ground
            if isinstance(h, list) and len(h) >= 6: fill(bm, [(h[i] / 10, h[i + 1] / 10) for i in range(0, len(h) - 1, 2)], 0)
man = json.loads(blob('landmarks/manifest.json'))
for l in man['landmarks']:
    for fp in l.get('footprints') or []:
        if len(fp) >= 3: fill(bm, fp)
bm = bm > 0

# ---- wild zones: keep the original natural look there
vec = json.loads(gzip.decompress(blob('vectors.json.gz')))
wild = np.zeros((WZ, WX), np.uint8)
for n in vec['named']:
    if n['kind'] in ('wood', 'nature_reserve', 'scrub', 'heath', 'forest') and len(n['poly']) >= 3: fill(wild, n['poly'])
for w in vec['water']:
    if w['type'] in ('stream', 'river'): polyline(wild, w['pts'], 8.0)           # creek banks only (~4 m each side)
# hills east of Gayley Road / Piedmont Avenue (stadium, Strawberry Canyon, Panoramic Hill)
gz_ = np.array([-2000, -382, -226, -161, -52, 31, 275, 300]); gx_ = np.array([89, 89, 199, 240, 360, 438, 497, 497])
zz = Z0 + (np.arange(WZ) + 0.5) * R; xx = X0 + (np.arange(WX) + 0.5) * R
east = np.interp(zz, gz_, gx_)
hills = (xx[None, :] > east[:, None] + 8) & (zz[:, None] < 300)
wild = (wild > 0) | hills
maint = ~wild

# ---- original layer masks (shader stacking: natural < lawn < dirt < paved < asphalt)
mA = dA > 0; mP = (dP > 0) & ~mA; hard = mA | mP
mD = (dD > 0) & ~hard; mG = (dG > 0) & ~mD & ~hard; mN = ~(hard | mD | mG)
open_ = ~hard & ~bm

# lawn seed: mapped/NDVI lawn plus unmapped ground with some green in it
seed = (mG | (mN & (lush > 0.22))) & open_
def frac(mask, sig):
    num = ndi.gaussian_filter(mask.astype(np.float32), sig); den = ndi.gaussian_filter(open_.astype(np.float32), sig)
    return num / np.maximum(den, 1e-3)
f6 = frac(seed, 6.0 / R)              # lawn share of the open ground within ~6 m
lawn = seed.copy()
# trees standing in lawn: canopy ground becomes lawn where the open ground around it is mostly lawn
lawn |= mD & (f6 > 0.32)
# unmapped open ground (dry 'natural'): lawn unless it is a narrow leftover strip in a mostly-bed area
lawn |= mN & open_ & (f6 > 0.15)
bed = open_ & ~lawn & maint
# smooth the lawn/bed boundary into clean landscaped curves and drop specks (beds < ~25 m^2, lawn holes < ~20 m^2)
disk = lambda r: (np.hypot(*np.mgrid[-r:r + 1, -r:r + 1]) <= r)
sm = ndi.binary_opening(bed, structure=disk(2))                 # remove thin slivers (< ~3 m)
sm = ndi.binary_closing(sm, structure=disk(2))
sm = ndi.gaussian_filter(sm.astype(np.float32), 2.0 / R) > 0.5
lab, nl = ndi.label(sm); sizes = ndi.sum(sm, lab, range(1, nl + 1)) * R * R
sm &= np.isin(lab, 1 + np.nonzero(sizes >= 25.0)[0])
holes = ~sm & open_; lab, nl = ndi.label(holes); sizes = ndi.sum(holes, lab, range(1, nl + 1)) * R * R
sm |= np.isin(lab, 1 + np.nonzero(sizes < 20.0)[0]) & open_
bed = sm & maint
# foundation planting: a ~1.5 m bed along building walls where the ground is lawn (the band continues under the building
# so the 1.6 m SDF keeps a clean edge; the building covers the inside)
dist_b = ndi.distance_transform_edt(~bm) * R
found = maint & (bm | (open_ & (dist_b <= 1.5)))
print('foundation beds', float((found & open_ & ~bed).mean()))
bed = bed | found
lawn_new = maint & ~bed                              # everything else in the maintained zone is lawn ...
# ... including under the paving, so the visible lawn edge is the (vector, crisp) paving edge: no dry fringe
G_new = np.where(maint, lawn_new, mG | (dG > 0))
D_new = np.where(maint, bed, mD | (dD > 0) & ~hard)

def sdf_from(mask):
    m = mask.astype(bool)
    din = ndi.distance_transform_edt(m) * R; dout = ndi.distance_transform_edt(~m) * R
    d = np.where(m, din - R * 0.5, -(dout - R * 0.5))
    return d
def down2(a): return (a[0::2, 0::2] + a[1::2, 0::2] + a[0::2, 1::2] + a[1::2, 1::2]) * 0.25
newG = down2(sdf_from(G_new)); newD = down2(sdf_from(D_new))
# keep the original (vector-derived) SDF exactly in the wild zone so nothing changes there
wild16 = down2(wild.astype(np.float32)) > 0.999
newG = np.where(wild16, sdf0[2], newG); newD = np.where(wild16, sdf0[3], newD)
out = np.stack([sdf0[0], sdf0[1], newG, newD], 0)

# ---- encode like bake_ground.py: 0..255 (127.5 = edge, +-3 m), quantised to 64 levels, row-delta int8
tex = np.clip(0.5 + np.clip(out, -3, 3) / 6.0, 0, 1)
tq = np.round(tex * 63).astype(np.int32)
enc = np.stack([np.diff(tq[k], axis=1, prepend=0) for k in range(4)], 0).astype(np.int8)
with gzip.open(D + 'ground_sdf.bin.gz', 'wb', compresslevel=9) as f: f.write(enc.tobytes())

# ---- special: 8 = maintained planting bed (mulch + groundcover) where the bed label lives; 1 m grid
sp = special0.copy()
bed1 = cv2.resize(ndi.binary_dilation(D_new & maint, iterations=2).astype(np.uint8), (gt['snx'], gt['snz']), interpolation=cv2.INTER_NEAREST) > 0
sp[(sp == 0) & bed1] = 8
with gzip.open(D + 'ground_special.bin.gz', 'wb', compresslevel=9) as f: f.write(sp.tobytes())
print('maintained frac', float(maint.mean()), 'bed', float((bed).mean()), 'lawn', float((lawn_new & ~hard).mean()))

if '--preview' in sys.argv:
    o = sys.argv[sys.argv.index('--preview') + 1]
    x0, x1, z0, z1 = -720, 480, -560, 480
    j0, j1, i0, i1 = int((x0 - X0) / R), int((x1 - X0) / R), int((z0 - Z0) / R), int((z1 - Z0) / R)
    img = np.zeros((i1 - i0, j1 - j0, 3), np.uint8); img[:] = (90, 160, 190)
    sl = (slice(i0, i1), slice(j0, j1))
    img[G_new[sl] & ~hard[sl]] = (60, 150, 60); img[D_new[sl] & ~hard[sl]] = (40, 70, 110)
    img[mP[sl]] = (200, 200, 200); img[mA[sl]] = (60, 60, 60); img[bm[sl]] = (120, 80, 160)
    img[wild[sl] & ~hard[sl] & ~bm[sl] & (img.sum(-1) == 440)] = (100, 190, 210)
    cv2.imwrite(o, img)
