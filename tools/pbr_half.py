#!/usr/bin/env python3
# [r6-load] Half-resolution copies of the PBR sets for the low/medium tiers, which only ever use them at 512 px
# (pbr.js used to download the 1024 px files and shrink them in the browser). Channels are resampled separately
# (alpha holds roughness/height data, not coverage) and re-encoded like tools/bake_pbr.py (q 78/72, alpha q 60).
# usage: python3 tools/pbr_half.py   (needs Pillow)  -> public/assets/pbr/512/*.webp
import glob, os
from PIL import Image
src = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'pbr')
out = os.path.join(src, '512'); os.makedirs(out, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, '*.webp'))):
    im = Image.open(f).convert('RGBA'); w, h = im.size
    ch = [c.resize((w // 2, h // 2), Image.Resampling.LANCZOS) for c in im.split()]
    q = 78 if f.endswith('_a.webp') else 72
    Image.merge('RGBA', ch).save(os.path.join(out, os.path.basename(f)), 'WEBP', quality=q, alpha_quality=60, method=6, exact=True)
    print(os.path.basename(f), os.path.getsize(f), '->', os.path.getsize(os.path.join(out, os.path.basename(f))))
