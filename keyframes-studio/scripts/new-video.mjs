#!/usr/bin/env node
// Scaffolds src/videos/<slug>/ and registers it.  Usage: npm run new <slug>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error("Usage: npm run new <slug>   (lowercase, letters/numbers/dashes)");
  process.exit(1);
}
const dir = join(root, "src/videos", slug);
if (existsSync(dir)) {
  console.error(`${dir} already exists`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const ident = slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

writeFileSync(join(dir, "plan.md"), `# ${slug}\n\nTopic:\nHook (first sentence):\nViewer promise (what they learn):\n\n| # | Scene id | Anchor word | Visual | Beat words |\n|---|----------|-------------|--------|------------|\n| 1 | hook | (first word) | | |\n`);
writeFileSync(join(dir, "script.txt"), "Write the narration here. First sentence is the hook.\n");
writeFileSync(
  join(dir, "Video.tsx"),
  `import React from "react";
import { Pop, Scene } from "../../components/Motion";
import type { VideoDef } from "../../components/VoiceVideo";
import { theme } from "../../lib/theme";
import { beat, type SceneProps, type VoiceTrack } from "../../lib/words";
import words from "./words.json";

const track = words as VoiceTrack;

const Hook: React.FC<SceneProps> = ({ track, sceneStart }) => (
  <Scene>
    <Pop at={0} style={{ position: "absolute", top: 900, width: "100%", textAlign: "center" }}>
      <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 160, color: theme.accent }}>
        {track.words[0]?.word}
      </div>
    </Pop>
  </Scene>
);

export const video: VideoDef = {
  id: "${slug}",
  slug: "${slug}",
  track,
  keywords: [],
  scenes: [{ id: "hook", anchor: track.words[0]?.word ?? "", component: Hook }],
};
`,
);
writeFileSync(
  join(dir, "words.json"),
  JSON.stringify({ text: "", audio: null, duration: 3, words: [{ word: "Placeholder", start: 0.05, end: 0.6 }] }, null, 2) + "\n",
);

const regPath = join(root, "src/videos/registry.ts");
let reg = readFileSync(regPath, "utf8");
reg = reg.replace(/(\n)(\nexport const videos)/, `\nimport { video as ${ident} } from "./${slug}/Video";$1$2`);
reg = reg.replace(/\n\];/, `\n  ${ident},\n];`);
writeFileSync(regPath, reg);
console.log(`Created src/videos/${slug}/ (plan.md, script.txt, Video.tsx) and registered it.`);
