# Rule 4: Review before the user sees it

Run `npm run review <slug>`, then open with the Read tool:

- `out/<slug>/review/hook.jpg`: the first 1.2 s at 10 fps
- `out/<slug>/review/sheet-NN.jpg`: one frame every 0.5 s, timestamped
- `out/<slug>/review/freezes.txt`: stretches over 1.5 s with no visual change

Go through this checklist for every sheet. Write down each failure with its
timestamp, fix all of them, re-render, and review again.

## Checklist

**Hook**
- [ ] Frame 0.0 already shows the subject and something moving
- [ ] The first word is on screen by 0.3 s
- [ ] The hook visual literally matches the hook sentence

**Sync**
- [ ] Every object appears on (or ≤ 2 frames before) the word that names it
- [ ] Every scene change lines up with a sentence or clause start
- [ ] Captions match the audio (spot-check 3 timestamps)

**Motion**
- [ ] `freezes.txt` is empty
- [ ] No two consecutive sheet frames (0.5 s apart) look identical for more than 3 frames in a row

**Layout**
- [ ] Nothing overlaps the captions band (y 200–520)
- [ ] Nothing important below y 1600, or right of x 950 in the lower half (platform UI)
- [ ] No object partly visible at a frame edge unless it is moving in or out
- [ ] No text cut off, no overlapping labels

**Content**
- [ ] Every on-screen number and claim is sourced in `plan.md`
- [ ] Ending answers the hook's question, CTA under 2 s

## Reporting

When the video passes, tell the user: runtime, number of scenes, and a
short list of what the review caught and fixed. If something could not be
fixed, say so.
