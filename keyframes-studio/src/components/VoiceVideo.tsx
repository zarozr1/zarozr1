import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Captions } from "./Captions";
import { Background } from "./Motion";
import { placeScenes, totalFramesFor, type SceneSpec, type VoiceTrack } from "../lib/words";

export type VideoDef = {
  id: string; // composition id, e.g. "touchscreen"
  slug: string; // folder name in src/videos and public/
  track: VoiceTrack;
  scenes: SceneSpec<any>[];
  keywords?: string[]; // words that get the highlight box in captions
};

export const VoiceVideo: React.FC<{ def: VideoDef }> = ({ def }) => {
  const total = totalFramesFor(def.track);
  const placed = placeScenes(def.track, def.scenes, total);
  return (
    <AbsoluteFill>
      <Background />
      {placed.map((s) => {
        const C = s.component;
        return (
          <Sequence key={s.id} name={s.id} from={s.from} durationInFrames={s.durationInFrames}>
            <C {...(s.props ?? {})} track={def.track} sceneStart={s.from} />
          </Sequence>
        );
      })}
      <Captions track={def.track} keywords={def.keywords} />
      {def.track.audio ? <Audio src={staticFile(`${def.slug}/${def.track.audio}`)} /> : null}
    </AbsoluteFill>
  );
};
