import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fonts ship in public/fonts so renders never depend on the network.
const fonts: [string, string, string][] = [
  ["Inter", "inter-latin-400-normal.woff2", "400"],
  ["Inter", "inter-latin-600-normal.woff2", "600"],
  ["Inter", "inter-latin-800-normal.woff2", "800"],
  ["JetBrains Mono", "jetbrains-mono-latin-400-normal.woff2", "400"],
  ["JetBrains Mono", "jetbrains-mono-latin-700-normal.woff2", "700"],
];
for (const [family, file, weight] of fonts) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, format: "woff2" });
}

// One background, one accent, one highlight. Change these per brand; keep
// the count the same (see keyframes/03-visual-style.md).
export const theme = {
  bg: "#07090f",
  bgGlow: "#121a2b",
  text: "#ffffff",
  textDim: "rgba(255,255,255,0.42)",
  accent: "#f2c14e",
  accentSoft: "rgba(242,193,78,0.18)",
  highlight: "#5b8cff",
  danger: "#ff6b4a",
  font: "Inter, sans-serif",
  mono: "'JetBrains Mono', monospace",
  width: 1080,
  height: 1920,
};
