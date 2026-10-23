#!/usr/bin/env bash
# Renders a video and builds contact sheets for frame-by-frame review
# (keyframes/04-review.md). Claude reads the sheets with its Read tool.
#   out/<id>/review/hook.jpg       first 1.2s at 10 fps (is there motion on frame 0?)
#   out/<id>/review/sheet-NN.jpg   whole video, one frame every 0.5s, timestamped
# Usage: npm run review <id> [--no-render]
set -euo pipefail
id="${1:?Usage: npm run review <id> [--no-render]}"
cd "$(dirname "$0")/.."
[[ "${2:-}" == "--no-render" ]] || bash scripts/render.sh "$id"
video="out/$id.mp4"
dir="out/$id/review"
rm -rf "$dir" && mkdir -p "$dir"
stamp="drawtext=text='%{pts\:hms}':x=20:y=20:fontsize=44:fontcolor=yellow:box=1:boxcolor=black@0.7"
ffmpeg -v error -i "$video" -t 1.2 -vf "fps=10,$stamp,scale=270:-1,tile=6x2" -frames:v 1 "$dir/hook.jpg"
ffmpeg -v error -i "$video" -vf "fps=2,$stamp,scale=270:-1,tile=6x3" "$dir/sheet-%02d.jpg"
# Freeze detection: flags any stretch longer than 1.5s where the picture barely changes.
ffmpeg -v info -i "$video" -vf "freezedetect=n=0.003:d=1.5" -an -f null - 2>&1 \
  | grep -E "freeze_(start|duration)" > "$dir/freezes.txt" || true
echo "Review sheets in $dir:"; ls "$dir"
if [[ -s "$dir/freezes.txt" ]]; then
  echo "WARN frozen stretches found (see $dir/freezes.txt):"; cat "$dir/freezes.txt"
else
  echo "No frozen stretches over 1.5s."
fi
