import type React from "react";

// Word-level timing is the backbone of every video: scenes, captions and
// visual beats are all placed on the frame where a spoken word starts.

export type Word = { word: string; start: number; end: number };

export type VoiceTrack = {
  text: string;
  // File name inside public/<slug>/, or null when there is no audio yet.
  audio: string | null;
  duration: number;
  words: Word[];
};

export const FPS = 60;

export const toFrame = (seconds: number) => Math.round(seconds * FPS);

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");

// Finds the n-th spoken occurrence of `needle` (case/punctuation-insensitive),
// searching from word index `after`. Throws so a typo in a plan never
// silently drifts a scene onto the wrong word.
export function findWord(
  track: VoiceTrack,
  needle: string,
  opts: { after?: number; occurrence?: number } = {},
): number {
  const target = clean(needle);
  let seen = 0;
  for (let i = opts.after ?? 0; i < track.words.length; i++) {
    if (clean(track.words[i].word) === target) {
      seen++;
      if (seen === (opts.occurrence ?? 1)) return i;
    }
  }
  throw new Error(`Anchor word "${needle}" not found in voice track`);
}

export type SceneSpec<P = Record<string, unknown>> = {
  id: string;
  // The scene starts on this spoken word (first match after the previous anchor).
  anchor: string;
  component: React.FC<P & SceneProps>;
  props?: P;
};

export type SceneProps = {
  track: VoiceTrack;
  // Absolute frame of the scene start (useful for syncing beats to words).
  sceneStart: number;
};

export type PlacedScene = SceneSpec & { from: number; durationInFrames: number };

// Converts anchor words into frame ranges. Each scene runs until the next
// scene's anchor; the last one runs to the end of the video.
export function placeScenes(
  track: VoiceTrack,
  scenes: SceneSpec<any>[],
  totalFrames: number,
): PlacedScene[] {
  let cursor = 0;
  const starts = scenes.map((s, i) => {
    if (i === 0) return 0; // the hook always starts on frame 0
    const idx = findWord(track, s.anchor, { after: cursor });
    cursor = idx + 1;
    return toFrame(track.words[idx].start);
  });
  return scenes.map((s, i) => ({
    ...s,
    from: starts[i],
    durationInFrames: Math.max(1, (starts[i + 1] ?? totalFrames) - starts[i]),
  }));
}

// Absolute frame at which a word is spoken, relative to a scene start.
// Use inside scenes to make an element appear exactly on its word.
export function beat(
  track: VoiceTrack,
  needle: string,
  sceneStart: number,
  occurrence = 1,
): number {
  const after = track.words.findIndex((w) => toFrame(w.start) >= sceneStart);
  const idx = findWord(track, needle, { after: Math.max(0, after), occurrence });
  return toFrame(track.words[idx].start) - sceneStart;
}

export const totalFramesFor = (track: VoiceTrack, tailSeconds = 0.6) =>
  toFrame(track.duration + tailSeconds);
