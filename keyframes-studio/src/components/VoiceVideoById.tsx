import React from "react";
import { videos } from "../videos/registry";
import { VoiceVideo } from "./VoiceVideo";

export const VoiceVideoById: React.FC<{ id: string }> = ({ id }) => {
  const def = videos.find((v) => v.id === id);
  if (!def) throw new Error(`No video registered with id "${id}"`);
  return <VoiceVideo def={def} />;
};
