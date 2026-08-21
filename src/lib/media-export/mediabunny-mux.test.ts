import { describe, expect, it } from "vitest";
import {
  createMediabunnyMuxSession,
  mimeForContainer,
} from "@/lib/media-export/mediabunny-mux";

describe("mediabunny mux helper", () => {
  it("maps containers to MIME types", () => {
    expect(mimeForContainer("mp4")).toBe("video/mp4");
    expect(mimeForContainer("webm")).toBe("video/webm");
  });

  it("starts an MP4 mux session without deprecated muxers", async () => {
    const session = await createMediabunnyMuxSession({
      container: "mp4",
      frameRate: 30,
    });
    expect(typeof session.addVideoChunk).toBe("function");
    expect(typeof session.addAudioChunk).toBe("function");
    expect(typeof session.finalize).toBe("function");
  });

  it("starts a WebM mux session for VP9/Opus path", async () => {
    const session = await createMediabunnyMuxSession({
      container: "webm",
      frameRate: 30,
    });
    expect(typeof session.finalize).toBe("function");
  });
});
