import React from "react";
import { Composition } from "remotion";
import { VoiceVideoById } from "./components/VoiceVideoById";
import { FPS, totalFramesFor } from "./lib/words";
import { theme } from "./lib/theme";
import { videos } from "./videos/registry";

export const RemotionRoot: React.FC = () => (
  <>
    {videos.map((def) => (
      <Composition
        key={def.id}
        id={def.id}
        component={VoiceVideoById}
        // Props must be JSON-serializable, so pass the id and look the video up.
        defaultProps={{ id: def.id }}
        durationInFrames={totalFramesFor(def.track)}
        fps={FPS}
        width={theme.width}
        height={theme.height}
      />
    ))}
  </>
);
