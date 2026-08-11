/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  hardStopMedia,
  playClipToEnd,
  unlockAudioElement,
} from "./quran-audio-playback";

describe("quran-audio-playback", () => {
  let audio: HTMLAudioElement;

  beforeEach(() => {
    audio = new Audio();
    vi.spyOn(audio, "play").mockResolvedValue(undefined);
    vi.spyOn(audio, "pause").mockImplementation(() => undefined);
    vi.spyOn(audio, "load").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hardStopMedia clears src and pauses", () => {
    audio.src = "https://example.com/a.mp3";
    hardStopMedia(audio);
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.getAttribute("src")).toBeNull();
  });

  it("unlockAudioElement calls play then pause", () => {
    unlockAudioElement(audio);
    expect(audio.play).toHaveBeenCalled();
    expect(audio.pause).toHaveBeenCalled();
  });

  it("playClipToEnd returns stopped when shouldStop is true upfront", async () => {
    const result = await playClipToEnd(audio, "https://example.com/a.mp3", {
      shouldStop: () => true,
    });
    expect(result).toBe("stopped");
  });
});
