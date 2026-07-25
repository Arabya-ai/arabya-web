import { describe, expect, it } from "vitest";
import {
  canUseMediaSession,
  clearMediaSession,
  setMediaSessionPaused,
  setMediaSessionPlaying,
} from "@/lib/media-session";

describe("media-session", () => {
  it("no-ops safely when Media Session API is unavailable", () => {
    expect(canUseMediaSession()).toBe(false);
    expect(() =>
      setMediaSessionPlaying({ title: "test", artist: "عربية" }),
    ).not.toThrow();
    expect(() => setMediaSessionPaused()).not.toThrow();
    expect(() => clearMediaSession()).not.toThrow();
  });
});
