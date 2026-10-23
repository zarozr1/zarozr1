import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../lib/theme";

// Every scene sits on this: a slow push-in plus a short entrance, so no
// frame is ever fully static (keyframes/02-timing.md, "never still").
export const Scene: React.FC<{ children: React.ReactNode; drift?: number }> = ({
  children,
  drift = 0.06,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.7 } });
  const push = interpolate(frame, [0, durationInFrames], [1, 1 + drift], {
    easing: Easing.inOut(Easing.quad),
  });
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${push * interpolate(enter, [0, 1], [1.08, 1])})`,
        opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const x = 50 + Math.sin(frame / 90) * 8;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${x}% 58%, ${theme.bgGlow} 0%, ${theme.bg} 62%)`,
      }}
    />
  );
};

// Pops a child in on `at` (frames, relative to the scene) — pair with beat().
export const Pop: React.FC<{
  at: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  from?: "scale" | "up" | "left";
}> = ({ at, children, style, from = "scale" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 13, mass: 0.6 } });
  const transform =
    from === "scale"
      ? `scale(${s})`
      : from === "up"
        ? `translateY(${(1 - s) * 120}px)`
        : `translateX(${(1 - s) * -160}px)`;
  return (
    <div style={{ ...style, opacity: Math.min(1, s * 1.4), transform: `${style?.transform ?? ""} ${transform}` }}>
      {children}
    </div>
  );
};

// Counts up to `value` starting on `at`, e.g. "35M" style stat reveals.
export const CountUp: React.FC<{
  at: number;
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  style?: React.CSSProperties;
}> = ({ at, value, suffix = "", decimals = 0, duration = 40, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div style={{ fontFamily: theme.font, fontWeight: 800, color: theme.text, ...style }}>
      {(value * p).toFixed(decimals)}
      {suffix}
    </div>
  );
};
