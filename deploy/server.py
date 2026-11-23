#!/usr/bin/env python3
"""Berkeley Simulator static server (stdlib only; Python 3.9+).

Replaces a plain SimpleHTTPRequestHandler. It sends no compression and no cache headers, so every visit re-downloads
~46 MB and the 2-4 MB of JS travels uncompressed. This server adds:
  * precompressed variants made by deploy/precompress.mjs: <file>.br, then <file>.gz, picked from Accept-Encoding.
    For data that is already gzipped (*.json.gz, *.bin.gz) the .br sibling holds brotli(raw payload). The browser
    decodes it natively off the main thread and src/data.js sees plain bytes (it checks the gzip magic), so a
    gzip-only client still gets the original .gz file unchanged.
  * on-the-fly gzip (cached in memory) for compressible files without a precompressed sibling;
  * Cache-Control: hashed Vite chunks (/assets/name-HASH.ext) are immutable for a year. Everything else is
    revalidated (no-cache + ETag/Last-Modified -> 304), so a repeat visit costs a round trip per file, not 46 MB;
  * HTTP/1.1 keep-alive, a thread per connection, sendfile for large bodies, correct MIME types (wasm, glb, ktx2).
usage: PORT=8080 python3 server.py [site_dir]   (site_dir defaults to $SITE_DIR, then this file's directory)
Kill switch: BSIM_IDENTITY=1 serves plain files only (no Content-Encoding).
"""
import email.utils
import gzip
import http.server
import os
import re
import socketserver
import sys
import threading
import urllib.parse

ROOT = os.path.realpath(sys.argv[1] if len(sys.argv) > 1 else os.environ.get('SITE_DIR') or os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('PORT', '8080'))
IDENTITY_ONLY = os.environ.get('BSIM_IDENTITY') == '1'
TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.ktx2': 'image/ktx2', '.webp': 'image/webp',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
    '.gz': 'application/gzip', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm',
}
COMPRESSIBLE = {'.html', '.js', '.mjs', '.css', '.json', '.wasm', '.svg', '.md', '.txt', '.bin', '.glb', '.gltf'}
HASHED = re.compile(r'^/assets/[^/]+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$')  # Vite output: name-HASH.ext directly under /assets
DENY = re.compile(r'(^|/)\.|\.py$|\.pyc$')
_gz_cache, _gz_lock, _gz_bytes = {}, threading.Lock(), [0]
GZ_CACHE_MAX = 96 * 1024 * 1024


def accepts(header, coding):
    for part in (header or '').split(','):
        p = part.strip().split(';')
        if p[0].strip().lower() == coding:
            q = 1.0
            for kv in p[1:]:
                kv = kv.strip()
                if kv.startswith('q='):
                    try:
                        q = float(kv[2:])
                    except ValueError:
                        q = 0.0
            return q > 0
    return False


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'bsim'
    sys_version = ''

    def log_message(self, fmt, *args):  # quiet: one line per error only
        pass

    def do_HEAD(self):
        self.serve(head=True)

    def do_GET(self):
        self.serve(head=False)

    def send_error_simple(self, code, msg):
        body = (msg + '\n').encode()
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def serve(self, head):
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        if '\x00' in path or DENY.search(path):
            return self.send_error_simple(404, 'not found')
        if path.endswith('/'):
            path += 'index.html'
        full = os.path.realpath(os.path.join(ROOT, path.lstrip('/')))
        if not (full == ROOT or full.startswith(ROOT + os.sep)) or not os.path.isfile(full):
            return self.send_error_simple(404, 'not found')
        st = os.stat(full)
        ext = os.path.splitext(full)[1].lower()
        ctype = TYPES.get(ext, 'application/octet-stream')
        if full.endswith('.json.gz') or full.endswith('.bin.gz'):
            ctype = 'application/gzip'
        ae = self.headers.get('Accept-Encoding', '')
        enc, body_path, body = None, full, None
        if not IDENTITY_ONLY:
            for coding, suffix in (('br', '.br'), ('gzip', '.gz')):
                if suffix == '.gz' and full.endswith('.gz'):
                    continue  # the file is gzip data itself: the client un-gzips it
                if accepts(ae, coding):
                    v = full + suffix
                    try:
                        vs = os.stat(v)
                        if vs.st_mtime >= st.st_mtime:
                            enc, body_path, st_body = coding, v, vs
                            break
                    except OSError:
                        pass
            if enc is None and ext in COMPRESSIBLE and st.st_size < 16 * 1024 * 1024 and accepts(ae, 'gzip'):
                body = self.gzip_cached(full, st)
                enc = 'gzip' if body is not None else None
        size = len(body) if body is not None else (st_body.st_size if enc and body_path != full else st.st_size)
        etag = '"%x-%x%s"' % (int(st.st_mtime * 1000), st.st_size, ('-' + enc) if enc else '')
        lastmod = email.utils.formatdate(st.st_mtime, usegmt=True)
        if HASHED.match(path):
            cache = 'public, max-age=31536000, immutable'
        else:
            cache = 'public, no-cache'  # revalidate (cheap 304) so a redeploy is picked up right away
        inm = self.headers.get('If-None-Match')
        ims = self.headers.get('If-Modified-Since')
        not_modified = False
        if inm is not None:
            not_modified = etag in [t.strip() for t in inm.split(',')] or inm.strip() == '*'
        elif ims:
            try:
                not_modified = int(st.st_mtime) <= email.utils.parsedate_to_datetime(ims).timestamp()
            except (TypeError, ValueError, IndexError, OverflowError):
                not_modified = False
        if not_modified:
            self.send_response(304)
            self.send_header('ETag', etag)
            self.send_header('Cache-Control', cache)
            self.send_header('Vary', 'Accept-Encoding')
            self.end_headers()
            return
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(size))
        self.send_header('Cache-Control', cache)
        self.send_header('ETag', etag)
        self.send_header('Last-Modified', lastmod)
        self.send_header('X-Content-Type-Options', 'nosniff')
        if ext in COMPRESSIBLE or enc or full.endswith('.gz'):
            self.send_header('Vary', 'Accept-Encoding')
        if enc:
            self.send_header('Content-Encoding', enc)
        self.end_headers()
        if head:
            return
        try:
            if body is not None:
                self.wfile.write(body)
            else:
                with open(body_path, 'rb') as f:
                    if size > 256 * 1024 and hasattr(self.connection, 'sendfile'):
                        self.wfile.flush()
                        self.connection.sendfile(f)
                    else:
                        self.wfile.write(f.read())
        except (BrokenPipeError, ConnectionResetError):
            self.close_connection = True

    def gzip_cached(self, full, st):
        key = (full, st.st_mtime, st.st_size)
        with _gz_lock:
            hit = _gz_cache.get(key)
        if hit is not None:
            return hit or None  # b'' marks 'not worth compressing'
        try:
            with open(full, 'rb') as f:
                raw = f.read()
        except OSError:
            return None
        z = gzip.compress(raw, 6)
        if len(z) > len(raw) * 0.95:
            z = None  # not worth it: remember that too
        with _gz_lock:
            if _gz_bytes[0] < GZ_CACHE_MAX:
                _gz_cache[key] = z if z is not None else b''
                _gz_bytes[0] += len(z) if z else 0
        return z


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 128


if __name__ == '__main__':
    print('bsim server: %s on :%d%s' % (ROOT, PORT, ' (identity only)' if IDENTITY_ONLY else ''), flush=True)
    Server(('0.0.0.0', PORT), Handler).serve_forever()
