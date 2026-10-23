# Keyframes Studio

Faceless, motion-designed explainer reels made entirely by Claude Code on
your Mac. You type a topic; Claude researches it, writes the script, records
the voice, animates every scene on its spoken word, reviews the render frame
by frame, and hands you an MP4.

This rebuilds the workflow from the "35 million views, never filmed a frame"
video: one folder of motion-design rules (`keyframes/`) plus a pipeline
Claude follows (`CLAUDE.md`).

## Setup (once, about 10 minutes)

1. Copy this `keyframes-studio` folder to your Mac (e.g. `~/keyframes-studio`).
2. In Terminal:
   ```bash
   cd ~/keyframes-studio
   bash setup-mac.sh
   ```
   This installs Homebrew, Node, ffmpeg and Claude Code if missing, installs
   packages, and renders the demo to `out/touchscreen.mp4`.
3. **Voice (recommended):** create an [ElevenLabs](https://elevenlabs.io)
   account, then put your API key and a voice ID in `.env`. ElevenLabs
   returns exact per-word timestamps, which make the sync tight. Without it,
   `--say` uses the built-in macOS voice with estimated timings.

## Make a video

```bash
cd ~/keyframes-studio
claude
```
Then just talk to it:
```
> make a video on how your phone's keyboard knows what you meant to type
```
Claude shows you the hook and script first. Approve it, or say what's off
("the hook talks too much"). It then builds, reviews, and gives you
`out/<slug>.mp4`. Give notes in plain words and it re-edits. Notes that
apply to every video get written into `keyframes/` so the style improves
over time.

Preview while it works: `npm run studio` opens a live timeline in your browser.

## Doing it by hand

```bash
npm run new headphones                  # scaffold src/videos/headphones/
# write src/videos/headphones/script.txt
npm run voice headphones                # ElevenLabs voice + word timings
npm run voice headphones -- --say       # free macOS voice instead
# build scenes in src/videos/headphones/Video.tsx (copy touchscreen/Video.tsx)
npm run review headphones               # render + review sheets
```

## Make it yours

- **Colors/fonts:** `src/lib/theme.ts`
- **House rules:** edit the four files in `keyframes/`. Claude reads them before every video.
- **Voice:** change `ELEVENLABS_VOICE_ID`; pick one in the ElevenLabs Voice Library.

## Costs

- Claude Pro or Max subscription (Claude Code is included).
- ElevenLabs: free tier for testing; Starter (~$5/mo) covers roughly 30 one-minute videos.
- Remotion is free for individuals and companies up to 3 people
  ([license](https://www.remotion.dev/license)).

## Notes

- The demo's `words.json` uses estimated timings and has no audio. Run
  `npm run voice touchscreen` to give it a real voice.
- View counts depend on topic, consistency and luck. This gives you the
  production half; picking topics people care about is still on you.
