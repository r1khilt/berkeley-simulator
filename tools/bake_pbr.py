# Bake CC0 PBR sets into compact game textures:
#   NAME_a.webp : RGB albedo (sRGB, de-tiled, calibrated) + A roughness
#   NAME_n.webp : RGB OpenGL normal + A height
import numpy as np, json, os, subprocess, sys
from PIL import Image
S = int(os.environ.get('SIZE', '1024'))
def load(p, mode='RGB'):
    im = Image.open(p).convert(mode)
    if im.size != (S, S): im = im.resize((S, S), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255.0
def s2l(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def l2s(c): c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
def blur_wrap(x, sigma):
    # periodic gaussian blur via FFT (textures tile)
    n = x.shape[0]; f = np.fft.fftfreq(n)
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (f[:, None] ** 2 + f[None, :] ** 2))
    if x.ndim == 2: return np.real(np.fft.ifft2(np.fft.fft2(x) * g))
    return np.stack([np.real(np.fft.ifft2(np.fft.fft2(x[..., c]) * g)) for c in range(x.shape[2])], -1)
def lum(c): return c[..., 0] * 0.2126 + c[..., 1] * 0.7152 + c[..., 2] * 0.0722
def src(name):
    if name.startswith('acg:'):
        a = name[4:]; b = f'acg/{a}/{a}_1K-JPG_'
        return dict(diff=b + 'Color.jpg', nor=b + 'NormalGL.jpg', rough=b + 'Roughness.jpg', disp=b + 'Displacement.jpg', ao=None)
    b = f'src/{name}_'
    return dict(diff=b + 'diff.jpg', nor=b + 'nor.jpg', rough=b + 'rough.jpg', disp=b + 'disp.png' if os.path.exists(b + 'disp.png') else b + 'disp.jpg', ao=b + 'ao.jpg')
def bake(out, name, L=None, detile=0.7, sigma_frac=0.12, sat=1.0, tint=(1, 1, 1), rough=(0, 1), nstr=1.0, ao_k=0.5):
    p = src(name)
    a = s2l(load(p['diff']))
    if p.get('ao') and os.path.exists(p['ao']):
        ao = load(p['ao'], 'L'); a = a * (1 - ao_k + ao_k * ao)[..., None]
    l = lum(a)
    if detile > 0:  # remove low-frequency blotches so the repeat is invisible; macro variation is added in-shader
        low = blur_wrap(l, S * sigma_frac); m = l.mean()
        a = a * ((m / np.maximum(low, 1e-4)) ** detile)[..., None]
    l = lum(a)
    if sat != 1.0: a = l[..., None] + (a - l[..., None]) * sat
    a = a * np.array(tint, np.float32)
    if L is not None: a = a * (L / max(lum(a).mean(), 1e-4))
    r = load(p['rough'], 'L'); r = rough[0] + r * (rough[1] - rough[0])
    n = load(p['nor']) * 2 - 1
    if nstr != 1.0: n[..., :2] *= nstr; n = n / np.linalg.norm(n, axis=-1, keepdims=True)
    h = load(p['disp'], 'L'); h = (h - h.min()) / max(h.max() - h.min(), 1e-4)
    rgba = np.concatenate([l2s(a), r[..., None]], -1)
    nh = np.concatenate([n * 0.5 + 0.5, 0.5 + 0.5 * h[..., None]], -1)  # height in [0.5,1] so canvas premultiply can't eat the normal
    save(out + '_a', rgba, int(os.environ.get('QA','78'))); save(out + '_n', nh, int(os.environ.get('QN','72')))
    return dict(mean=[round(float(x), 4) for x in a.reshape(-1, 3).mean(0)], rough=round(float(r.mean()), 3))
def save(path, arr, q):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
    im.save('/tmp/_t.png')
    subprocess.run(['cwebp', '-quiet', '-q', str(q), '-alpha_q', os.environ.get('AQ','60'), '-sharp_yuv', '-exact', '-m', '6', '/tmp/_t.png', '-o', f'out/{path}.webp'], check=True)
M = {}
# name: (source, real tile size m, bake kwargs)
SETS = {
  'asphalt':  ('asphalt_02', 3.0, dict(L=0.13, sat=0.35, tint=(1.03, 1.0, 0.95), rough=(0.78, 1.0), detile=0.75)),
  'sidewalk': ('asphalt_04', 4.04, dict(L=0.38, sat=0.25, tint=(1.03, 1.0, 0.93), rough=(0.80, 0.98), detile=0.8)),
  'granite':  ('acg:Granite002A', 0.45, dict(L=0.40, sat=0.2, tint=(1.02, 1.0, 0.95), rough=(0.55, 0.85), detile=0.6, nstr=0.6)),
  'brick':    ('brick_wall_006', 3.0, dict(sat=0.95, rough=(0.80, 0.98), detile=0.6, sigma_frac=0.08)),
  'lawn':     ('leafy_grass', 2.0, dict(L=0.10, sat=0.3, tint=(0.72, 1.22, 0.48), rough=(0.85, 1.0), detile=0.7)),
  'drygrass': ('withered_grass', 2.0, dict(L=0.16, sat=0.9, tint=(1.06, 1.0, 0.78), rough=(0.85, 1.0), detile=0.7)),
  'litter':   ('forest_leaves_02', 3.0, dict(L=0.085, sat=0.55, rough=(0.85, 1.0), detile=0.6)),
  'dirt':     ('park_dirt', 3.0, dict(L=0.15, sat=0.55, rough=(0.88, 1.0), detile=0.7)),
  'stucco':   ('white_stucco', 1.2, dict(L=0.55, sat=0.6, tint=(1.0, 0.965, 0.88), rough=(0.85, 1.0), detile=0.8, nstr=0.7)),
  'boardconc':('wood_textured_concrete', 1.8, dict(L=0.27, sat=0.15, rough=(0.82, 1.0), detile=0.6)),
  'concrete': ('concrete_wall_004', 2.0, dict(L=0.30, sat=0.2, tint=(1.0, 0.99, 0.96), rough=(0.80, 0.98), detile=0.75)),
  'siding':   ('wood_plank_wall', 1.0, dict(L=0.30, sat=0.25, rough=(0.65, 0.9), detile=0.5)),
  'rooftile': ('roof_09', 4.0, dict(L=0.15, sat=1.0, tint=(1.25, 0.86, 0.66), rough=(0.7, 0.95), detile=0.5)),
}
only = sys.argv[1:]
for k, (s, size, kw) in SETS.items():
    if only and k not in only: continue
    M[k] = dict(src=s, size=size, **bake(k, s, **kw)); print(k, M[k], flush=True)
if not only: json.dump(M, open('out/manifest.json', 'w'), indent=1)
