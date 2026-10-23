#!/usr/bin/env bash
# One-time setup on macOS. Run from this folder:  bash setup-mac.sh
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v brew >/dev/null; then
  echo "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"
fi

command -v node >/dev/null || brew install node
command -v ffmpeg >/dev/null || brew install ffmpeg
command -v claude >/dev/null || npm install -g @anthropic-ai/claude-code

npm install
[[ -f .env ]] || cp .env.example .env

echo
echo "Rendering the demo video to check everything works..."
npm run review touchscreen

echo
echo "Done. Next:"
echo "  1. Put your ElevenLabs key + voice id in .env (optional; '--say' works without it)"
echo "  2. Watch out/touchscreen.mp4"
echo "  3. Run:  claude"
echo "     then type:  make a video on how noise-cancelling headphones work"
