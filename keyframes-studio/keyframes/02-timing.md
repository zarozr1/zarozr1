# Rule 2: Timing (picture lands on the word)

The voice is the clock. Every visual event is placed on the frame where a
spoken word starts, using `words.json` timings. Never time anything by hand
in seconds when a word exists to anchor it.

## Must

- **Scenes start on words.** Each scene's `anchor` is the word that
  introduces its idea. The scene appears on the frame that word starts.
- **Elements appear on their word.** When the voice says "pen", the pen
  appears on that frame: `beat(track, "pen", sceneStart)`. Up to 2 frames
  early is fine (the eye leads the ear). Late is never fine.
- **Something changes at least every 1.5 s.** A new element, a camera move,
  a highlight or a counter. `<Scene>` adds a slow push-in so nothing is ever
  perfectly still, but the push-in alone does not count as a change.
- **A new scene every 2–4 s.** One idea per scene. If a scene runs longer
  than 5 s, split it or add a beat inside it.
- **60 fps.** Motion uses springs (`Pop`, `spring()`), never linear slides,
  except deliberate mechanical motion like scanning lines.
- **No dead air.** Pauses in the voice longer than 0.7 s are cut (the voice
  script warns about them). Fix the script punctuation or regenerate.

## Captions

- Word-by-word: upcoming words dim, spoken words white, keywords
  box-highlighted (product names, numbers, the key noun of each sentence).
- Max 3 words on screen at a time. Captions break at punctuation and pauses.
- Highlight at most one keyword per phrase; if everything is highlighted,
  nothing is.

## Pacing

- 150–175 spoken words per minute. Reels sweet spot: 30–60 s total.
- Front-load: the first 3 seconds have the fastest cuts in the video.
- Before the payoff, slow down for a single beat (one held scene, about 1 s)
  so the answer feels like a release.
