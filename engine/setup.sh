#!/bin/bash
# Rebuilds the render toolchain in a fresh workspace (about 2 minutes).
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || { npm init -y >/dev/null; npm i -s puppeteer-core d3-geo topojson-client world-atlas@2 @fontsource/oswald @fontsource/inter >/dev/null; }
[ -x "$HOME/venv/bin/python" ] || { python3 -m venv "$HOME/venv"; "$HOME/venv/bin/pip" install -q kokoro-onnx soundfile numpy; }
mkdir -p "$HOME/kokoro"
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s "$HOME/kokoro/$f" ] || curl -sSL -o "$HOME/kokoro/$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
done
echo "engine ready"
