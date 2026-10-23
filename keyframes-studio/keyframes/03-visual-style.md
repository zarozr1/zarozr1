# Rule 3: Visual style

## Canvas

- 1080 × 1920, 60 fps, dark background (`theme.bg`).
- **Safe zone:** Instagram and TikTok cover the bottom ~22% (caption,
  username, buttons) and, in the lower half, the right ~12%
  (like/comment/share column). Keep everything important between
  **y 200 and y 1600**, and below y 960 keep it left of **x 950**.
  Captions live at the top (y ≈ 260).

## Palette (from `src/lib/theme.ts`)

- One background, one accent (`theme.accent`, gold), one highlight
  (`theme.highlight`, blue), plus `theme.danger` only for "wrong / no / blocked".
- Never add new colors per scene. Change the theme file to rebrand.

## Typography

- Inter for words, JetBrains Mono for labels, numbers and data readouts.
- Captions 92 px. Labels 40–44 px mono, uppercase, letter-spaced.
- Max ~6 words of non-caption text on screen at once.

## Composition

- One subject per scene, centered, filling 50–70% of the frame width.
- Show, don't write: prefer a diagram, object or animation over a sentence.
- Reuse objects across scenes (the same phone, the same finger) so the
  viewer tracks one story; transform them rather than replacing them.
- Diagrams are simple SVG shapes: rounded rects, lines, circles. Clean
  beats detailed. For real-world objects, use images in `public/<slug>/`.

## Motion

- Entrances: spring scale or slide 80–160 px. Exits: fast (≤ 8 frames) or
  move off-frame. Nothing fades slowly.
- Objects that leave must leave the frame completely; no half-visible
  stragglers at the edges.
- Elements must never overlap the captions band (y 200–520).
