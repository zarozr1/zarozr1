#!/usr/bin/env bash
# Renders one video to out/<id>.mp4.  Usage: npm run render <id>
set -euo pipefail
id="${1:?Usage: npm run render <id>}"
cd "$(dirname "$0")/.."
extra=()
[[ -n "${REMOTION_BROWSER:-}" ]] && extra+=(--browser-executable "$REMOTION_BROWSER")
npx remotion render src/index.ts "$id" "out/$id.mp4" --codec h264 --crf 18 "${extra[@]}"
echo "Rendered out/$id.mp4"
