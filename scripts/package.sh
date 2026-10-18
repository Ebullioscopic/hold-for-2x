#!/usr/bin/env bash
# Builds the release zip: dist/hold-for-2x-v<version>.zip containing a hold-for-2x/ folder
# with only the files Chrome needs, plus README, LICENSE and font licenses.
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python -c "import json;print(json.load(open('manifest.json'))['version'])")
out="dist/hold-for-2x-v${version}.zip"
stage=$(mktemp -d)
mkdir -p "$stage/hold-for-2x" dist
cp -r manifest.json src icons fonts README.md LICENSE "$stage/hold-for-2x/"
rm -f "$out"
(cd "$stage" && python -c "import shutil;shutil.make_archive('pkg','zip','.','hold-for-2x')")
mv "$stage/pkg.zip" "$out"
rm -rf "$stage"
echo "$out"
