import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../lib/theme";
import { toFrame, type VoiceTrack, type Word } from "../lib/words";

type Phrase = { words: (Word & { i: number })[]; start: number; end: number };

// Splits the voice into short on-screen phrases: max `maxWords` words, broken
// early on punctuation or a pause, so captions never turn into paragraphs.
function toPhrases(words: Word[], maxWords: number): Phrase[] {
  const phrases: Phrase[] = [];
  let cur: Phrase["words"] = [];
  words.forEach((w, i) => {
    cur.push({ ...w, i });
    const next = words[i + 1];
    const pause = next ? next.start - w.end > 0.28 : true;
    const punct = /[.,!?;:]$/.test(w.word);
    if (cur.length >= maxWords || pause || punct) {
      phrases.push({ words: cur, start: cur[0].start, end: w.end });
      cur = [];
    }
  });
  return phrases;
}

// Words to box-highlight (product names, numbers, the key noun of a line).
const isKeyword = (w: string, keywords: Set<string>) =>
  /\d/.test(w) || keywords.has(w.toLowerCase().replace(/[^a-z0-9']/g, ""));

export const Captions: React.FC<{
  track: VoiceTrack;
  keywords?: string[];
  maxWords?: number;
  top?: number;
}> = ({ track, keywords = [], maxWords = 3, top = 260 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phrases = useMemo(() => toPhrases(track.words, maxWords), [track, maxWords]);
  const keys = useMemo(() => new Set(keywords.map((k) => k.toLowerCase())), [keywords]);
  const t = frame / fps;

  // Hold the previous phrase through short gaps so the caption never blinks out.
  const phrase =
    [...phrases].reverse().find((p) => t >= p.start - 0.02) ?? null;
  if (!phrase || t > phrase.end + 0.6) return null;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 80,
        right: 80,
        textAlign: "center",
        fontFamily: theme.font,
        fontSize: 92,
        lineHeight: 1.15,
        letterSpacing: -1.5,
      }}
    >
      {phrase.words.map((w) => {
        const startF = toFrame(w.start);
        const spoken = frame >= startF;
        const current =
          spoken && (phrase.words.find((x) => x.i === w.i + 1)?.start ?? Infinity) > t;
        const pop = spring({ frame: frame - startF, fps, config: { damping: 14, mass: 0.5 } });
        const key = isKeyword(w.word, keys);
        return (
          <span
            key={w.i}
            style={{
              display: "inline-block",
              margin: "0 14px",
              fontWeight: current || key ? 800 : 600,
              color: spoken ? theme.text : theme.textDim,
              opacity: spoken ? 1 : 0.55,
              transform: `scale(${spoken ? interpolate(pop, [0, 1], [0.86, 1]) : 0.96})`,
              padding: key && spoken ? "0 12px" : 0,
              outline: key && spoken ? `3px solid ${theme.highlight}` : "none",
              background: key && spoken ? "rgba(91,140,255,0.16)" : "transparent",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
