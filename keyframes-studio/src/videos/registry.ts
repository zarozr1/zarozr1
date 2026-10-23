// Every video is registered here. `npm run new <slug>` appends to this list.
import type { VideoDef } from "../components/VoiceVideo";
import { video as touchscreen } from "./touchscreen/Video";

export const videos: VideoDef[] = [
  touchscreen,
];
