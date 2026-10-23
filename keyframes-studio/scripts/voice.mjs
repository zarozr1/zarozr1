#!/usr/bin/env node
// Turns src/videos/<slug>/script.txt into:
//   public/<slug>/voice.mp3          the narration
//   src/videos/<slug>/words.json     word-level timings every scene syncs to
//
// Usage:
//   node scripts/voice.mjs <slug>              ElevenLabs (exact timestamps, best voice)
//   node scripts/voice.mjs <slug> --say        macOS `say` (free, estimated timings)
//   node scripts/voice.mjs <slug> --estimate   no audio, estimated timings (layout drafts)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [slug, mode = "--elevenlabs"] = process.argv.slice(2);
if (!slug) {
  console.error("Usage: node scripts/voice.mjs <slug> [--say|--estimate]");
  process.exit(1);
}

loadEnv(join(root, ".env"));

const videoDir = join(root, "src/videos", slug);
const publicDir = join(root, "public", slug);
const scriptPath = join(videoDir, "script.txt");
if (!existsSync(scriptPath)) {
  console.error(`Missing ${scriptPath}. Write the narration there first.`);
  process.exit(1);
}
const text = readFileSync(scriptPath, "utf8").replace(/\s+/g, " ").trim();
mkdirSync(publicDir, { recursive: true });

let track;
if (mode === "--estimate") {
  const words = estimate(text, estimateDuration(text));
  track = { text, audio: null, duration: words.at(-1).end, words };
} else if (mode === "--say") {
  const aiff = join(publicDir, "voice.aiff");
  const mp3 = join(publicDir, "voice.mp3");
  const voice = process.env.SAY_VOICE || "Samantha";
  execFileSync("say", ["-v", voice, "-r", "185", "-o", aiff, text]);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", aiff, "-b:a", "192k", mp3]);
  rmSync(aiff);
  const duration = probeDuration(mp3);
  track = { text, audio: "voice.mp3", duration, words: estimate(text, duration) };
} else {
  track = await elevenlabs(text, publicDir);
}

writeFileSync(join(videoDir, "words.json"), JSON.stringify(track, null, 2) + "\n");
report(track);

// ---------------------------------------------------------------------------

async function elevenlabs(text, outDir) {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voiceId) {
    console.error("Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env (see .env.example),");
    console.error("or run with --say (free, macOS) / --estimate (no audio).");
    process.exit(1);
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
      }),
    },
  );
  if (!res.ok) {
    console.error(`ElevenLabs error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const data = await res.json();
  writeFileSync(join(outDir, "voice.mp3"), Buffer.from(data.audio_base64, "base64"));
  const a = data.alignment;
  const words = [];
  let cur = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = { word: "", start: a.character_start_times_seconds[i], end: 0 };
    cur.word += ch;
    cur.end = a.character_end_times_seconds[i];
  });
  if (cur) words.push(cur);
  const duration = probeDuration(join(outDir, "voice.mp3"));
  return { text, audio: "voice.mp3", duration, words: words.map(round) };
}

// Spreads words across `duration`, weighting by length and adding pauses at
// punctuation. Good enough to lay out scenes; ElevenLabs gives exact times.
function estimate(text, duration) {
  const tokens = text.split(" ");
  const weight = (w) => 1.2 + w.replace(/[^\w]/g, "").length * 0.55;
  const pause = (w) => (/[.!?]$/.test(w) ? 5 : /[,;:]$/.test(w) ? 2.2 : 0);
  const total = tokens.reduce((s, w) => s + weight(w) + pause(w), 0);
  const unit = (duration - 0.1) / total;
  let t = 0.05;
  return tokens.map((w) => {
    const start = t;
    const end = t + weight(w) * unit;
    t = end + pause(w) * unit;
    return round({ word: w, start, end });
  });
}

function estimateDuration(text) {
  return text.split(" ").length / 2.7; // ~162 words per minute, typical reel pace
}

function probeDuration(file) {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file,
  ]);
  return Math.round(parseFloat(out.toString()) * 1000) / 1000;
}

function round(w) {
  return { word: w.word, start: +w.start.toFixed(3), end: +w.end.toFixed(3) };
}

// Prints the checks from keyframes/02-timing.md so problems show up before rendering.
function report(t) {
  const w = t.words;
  console.log(`\n${slug}: ${w.length} words, ${t.duration.toFixed(2)}s, audio: ${t.audio ?? "none"}`);
  const warn = [];
  if (w[0].start > 0.3) warn.push(`First word starts at ${w[0].start}s; the hook must start before 0.3s.`);
  w.forEach((x, i) => {
    const gap = (w[i + 1]?.start ?? x.end) - x.end;
    if (gap > 0.7) warn.push(`Dead air ${gap.toFixed(2)}s after "${x.word}" (${x.end}s).`);
  });
  const firstSentence = t.text.split(/(?<=[.!?])\s/)[0].split(" ").length;
  if (firstSentence > 22) warn.push(`Hook sentence is ${firstSentence} words; keep it under 22.`);
  if (t.duration > 75) warn.push(`Runtime ${t.duration.toFixed(0)}s; aim for 30-60s.`);
  console.log(warn.length ? warn.map((s) => "  WARN " + s).join("\n") : "  Timing checks passed.");
}

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
