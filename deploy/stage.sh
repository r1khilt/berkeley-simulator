#!/bin/bash
# Stage the public site: production build without dev-data, precompressed variants, and the caching server.
# usage: bash deploy/stage.sh <out-dir>     then: cd <out-dir> && PORT=8080 python3 server.py
set -e
cd "$(dirname "$0")/.."
OUT="${1:?usage: deploy/stage.sh <out-dir>}"
npx vite build --outDir "$OUT" --emptyOutDir
rm -rf "$OUT/dev-data"
node deploy/precompress.mjs "$OUT"
cp deploy/server.py "$OUT/server.py"
du -sh "$OUT"
