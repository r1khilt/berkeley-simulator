import json, sys, urllib.request, os, concurrent.futures as cf
assets = sys.argv[1:]
def get(url, path):
    if os.path.exists(path): return path
    req = urllib.request.Request(url, headers={'User-Agent': 'bsim-texture-fetch/1.0'})
    data = urllib.request.urlopen(req, timeout=60).read()
    open(path, 'wb').write(data); return path
def one(a):
    f = json.load(urllib.request.urlopen(urllib.request.Request(f'https://api.polyhaven.com/files/{a}', headers={'User-Agent': 'bsim-texture-fetch/1.0'}), timeout=30))
    out = []
    for key, short in [('Diffuse','diff'),('nor_gl','nor'),('Rough','rough'),('AO','ao'),('Displacement','disp')]:
        if key not in f: continue
        r = f[key].get('1k', {})
        e = r.get('jpg') or r.get('png')
        if not e: continue
        ext = 'jpg' if 'jpg' in r else 'png'
        p = f'src/{a}_{short}.{ext}'
        get(e['url'], p); out.append(short)
    return a, out
with cf.ThreadPoolExecutor(6) as ex:
    for a, out in ex.map(one, assets): print(a, out)
