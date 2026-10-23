// Demo video: "How touchscreens work". Copy this pattern for new videos:
// script.txt -> words.json (npm run voice) -> scenes anchored to spoken words.
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CountUp, Pop, Scene } from "../../components/Motion";
import type { VideoDef } from "../../components/VoiceVideo";
import { theme } from "../../lib/theme";
import { beat, type SceneProps, type VoiceTrack } from "../../lib/words";
import words from "./words.json";

const track = words as VoiceTrack;
const CX = 540;
const CY = 1180;

// --- shared drawing pieces -------------------------------------------------

// Drawn at full size, then scaled into the Reels safe zone (y 585-1490).
const Phone: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} style={{ position: "absolute" }}>
    <g transform="translate(97 60) scale(0.82)">
    <rect x={250} y={640} width={580} height={1100} rx={80} fill="#0e1422" stroke="#2a3550" strokeWidth={6} />
    <rect x={285} y={690} width={510} height={1000} rx={50} fill="#05070c" />
    {children}
    </g>
  </svg>
);

const Grid: React.FC<{ progress: number; glow?: number; dip?: { x: number; y: number; r: number } }> = ({
  progress,
  glow = 0,
  dip,
}) => {
  const lines = [];
  for (let i = 0; i < 9; i++) {
    const x = 310 + i * 57.5;
    const y = 720 + i * 120;
    const k = Math.min(1, Math.max(0, progress * 9 - i));
    lines.push(
      <line key={`v${i}`} x1={x} y1={720} x2={x} y2={720 + 940 * k} stroke={theme.accent} strokeOpacity={0.35 + glow * 0.5} strokeWidth={3} />,
      <line key={`h${i}`} x1={310} y1={y} x2={310 + 460 * k} y2={y} stroke={theme.accent} strokeOpacity={0.35 + glow * 0.5} strokeWidth={3} />,
    );
  }
  return (
    <g>
      {lines}
      {dip ? <circle cx={dip.x} cy={dip.y} r={dip.r} fill={theme.highlight} fillOpacity={0.25} stroke={theme.highlight} strokeWidth={4} /> : null}
    </g>
  );
};

const Finger: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x={-70} y={-40} width={140} height={520} rx={70} fill="#e8b89a" />
    <ellipse cx={0} cy={10} rx={46} ry={34} fill="#f3d2c1" />
  </g>
);

const Pen: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y}) rotate(-28)`}>
    <polygon points="0,0 -22,-70 22,-70" fill="#d9d9d9" />
    <rect x={-22} y={-560} width={44} height={490} rx={8} fill="#3b5bdb" />
  </g>
);

const useSpring = (at: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping: 15, mass: 0.6 } });
};

const Label: React.FC<{ at: number; color?: string; children: React.ReactNode; y?: number }> = ({
  at,
  color = theme.accent,
  children,
  y = 1560,
}) => (
  <Pop at={at} from="up" style={{ position: "absolute", top: y, width: "100%", textAlign: "center" }}>
    <span style={{ fontFamily: theme.mono, fontSize: 40, color, letterSpacing: 4, textTransform: "uppercase" }}>
      {children}
    </span>
  </Pop>
);

// --- scenes ----------------------------------------------------------------

// Hook: finger taps (reacts), pen presses hard (nothing). Motion from frame 0.
const Hook: React.FC<SceneProps> = ({ track, sceneStart }) => {
  const frame = useCurrentFrame();
  const tap = beat(track, "brush", sceneStart);
  const pen = beat(track, "pen", sceneStart);
  const fingerIn = useSpring(0);
  const press = useSpring(tap);
  const penIn = useSpring(pen - 8);
  const ripple = Math.max(0, frame - tap);
  const fingerY = interpolate(fingerIn, [0, 1], [1700, 1260]) + press * 40 + penIn * 1600;
  return (
    <Scene>
      <Phone>
        <circle cx={CX} cy={CY} r={ripple * 9} fill="none" stroke={theme.accent} strokeWidth={6} strokeOpacity={Math.max(0, 1 - ripple / 35)} />
        <circle cx={CX} cy={CY} r={ripple * 5} fill="none" stroke={theme.accent} strokeWidth={4} strokeOpacity={Math.max(0, 1 - ripple / 30)} />
        <Finger x={CX} y={fingerY} />
        <Pen x={CX + 10 + (1 - penIn) * 900} y={CY + 30 - (1 - penIn) * 900} />
      </Phone>
      <Label at={tap}>reacts</Label>
      <Label at={pen + 10} color={theme.danger} y={1620}>ignored</Label>
    </Scene>
  );
};

const Question: React.FC<SceneProps> = ({ track, sceneStart }) => {
  const frame = useCurrentFrame();
  const at = beat(track, "feeling", sceneStart);
  return (
    <Scene>
      <Pop at={0} style={{ position: "absolute", top: 760, width: "100%", textAlign: "center" }}>
        <div
          style={{
            fontFamily: theme.font,
            fontWeight: 800,
            fontSize: 620,
            color: theme.accent,
            transform: `rotate(${Math.sin(frame / 12) * 6}deg) scale(${1 + (frame >= at ? 0.08 : 0)})`,
          }}
        >
          ?
        </div>
      </Pop>
    </Scene>
  );
};

const Wires: React.FC<SceneProps> = ({ track, sceneStart }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [0, 50], [0, 1], { extrapolateRight: "clamp" });
  const charged = beat(track, "charged", sceneStart);
  const glow = frame >= charged ? 0.5 + 0.5 * Math.sin((frame - charged) / 4) : 0;
  return (
    <Scene>
      <Phone>
        <Grid progress={draw} glow={glow} />
      </Phone>
      <Label at={beat(track, "grid", sceneStart)}>wire grid · under the glass</Label>
    </Scene>
  );
};

const Water: React.FC<SceneProps> = ({ track, sceneStart }) => {
  const frame = useCurrentFrame();
  const pulls = beat(track, "pulls", sceneStart);
  const drops = Array.from({ length: 14 }, (_, i) => {
    const t = Math.max(0, frame - pulls - i * 3);
    const angle = (i / 14) * Math.PI * 2;
    const dist = Math.max(0, 260 - t * 9);
    return (
      <circle key={i} cx={CX + Math.cos(angle) * dist} cy={CY + Math.sin(angle) * dist} r={10} fill={theme.highlight} opacity={t > 0 && dist > 0 ? 1 : 0} />
    );
  });
  return (
    <Scene>
      <Phone>
        <Grid progress={1} glow={0.6} />
        {drops}
        <Finger x={CX} y={CY + 60} />
      </Phone>
      <Label at={beat(track, "water", sceneStart)}>finger ≈ 60% water</Label>
    </Scene>
  );
};

const Locate: React.FC<SceneProps> = ({ track, sceneStart }) => {
  const frame = useCurrentFrame();
  const at = beat(track, "exact", sceneStart);
  const lock = useSpring(at);
  const x = interpolate(lock, [0, 1], [360, 598]);
  const y = interpolate(lock, [0, 1], [820, 1240]);
  return (
    <Scene>
      <Phone>
        <Grid progress={1} dip={{ x: 598, y: 1240, r: 40 + Math.sin(frame / 5) * 6 }} />
        <line x1={x} y1={700} x2={x} y2={1680} stroke={theme.text} strokeWidth={2} />
        <line x1={295} y1={y} x2={785} y2={y} stroke={theme.text} strokeWidth={2} />
      </Phone>
      <Pop at={at} style={{ position: "absolute", top: 1560, width: "100%", textAlign: "center" }}>
        <span style={{ fontFamily: theme.mono, fontSize: 44, color: theme.accent }}>
          x <CountUp at={at} value={412} style={{ display: "inline", fontFamily: theme.mono, fontSize: 44, color: theme.accent }} />
          {"  "}y <CountUp at={at} value={1180} style={{ display: "inline", fontFamily: theme.mono, fontSize: 44, color: theme.accent }} />
        </span>
      </Pop>
    </Scene>
  );
};

const PlasticPen: React.FC<SceneProps> = ({ track, sceneStart }) => {
  const frame = useCurrentFrame();
  const nothing = beat(track, "nothing", sceneStart);
  const press = 1 + Math.sin(frame / 6) * 0.5;
  return (
    <Scene>
      <Phone>
        <Grid progress={1} />
        <Pen x={CX} y={CY + press * 12} />
      </Phone>
      <Pop at={nothing} style={{ position: "absolute", top: 860, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 360, color: theme.danger }}>✕</span>
      </Pop>
      <Label at={beat(track, "plastic", sceneStart)} color={theme.danger}>plastic · steals no charge</Label>
    </Scene>
  );
};

const Cta: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  return (
    <Scene>
      <Pop at={4} style={{ position: "absolute", top: 1100, width: "100%", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: theme.font,
            fontWeight: 800,
            fontSize: 72,
            color: "#fff",
            background: theme.highlight,
            padding: "28px 120px",
            borderRadius: 28,
            transform: `scale(${1 + Math.sin(frame / 8) * 0.04})`,
          }}
        >
          Follow
        </div>
      </Pop>
    </Scene>
  );
};

export const video: VideoDef = {
  id: "touchscreen",
  slug: "touchscreen",
  track,
  keywords: ["finger", "pen", "grid", "water", "plastic", "nothing", "follow"],
  scenes: [
    { id: "hook", anchor: "Your", component: Hook },
    { id: "question", anchor: "So", component: Question },
    { id: "wires", anchor: "Under", component: Wires },
    { id: "water", anchor: "Your", component: Water },
    { id: "locate", anchor: "The", component: Locate },
    { id: "pen", anchor: "A", component: PlasticPen },
    { id: "cta", anchor: "Follow", component: Cta },
  ],
};
