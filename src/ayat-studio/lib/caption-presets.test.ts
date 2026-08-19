import { describe, expect, it } from "vitest";
import {
  CAPTION_PRESETS,
  captionPresetLabel,
  findCaptionPreset,
} from "@/ayat-studio/lib/caption-presets";

describe("caption-presets", () => {
  it("finds classic gold preset", () => {
    const p = findCaptionPreset("classic-gold");
    expect(p?.patch.fontSize).toBe(48);
    expect(p?.patch.progressBarStyle).toBe("line");
  });

  it("returns null for custom", () => {
    expect(findCaptionPreset("custom")).toBeNull();
  });

  it("labels presets", () => {
    const p = CAPTION_PRESETS[0]!;
    expect(captionPresetLabel(p, "ar")).toContain("ذهبي");
  });
});
