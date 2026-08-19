import { describe, expect, it } from "vitest";
import {
  buildCaptionCues,
  cuesToSrt,
  cuesToVtt,
  formatSrtTime,
} from "./caption-export";

describe("caption-export", () => {
  it("formats SRT timestamps", () => {
    expect(formatSrtTime(0)).toBe("00:00:00,000");
    expect(formatSrtTime(65.5)).toBe("00:01:05,500");
  });

  it("builds cues from segments and translation", () => {
    const cues = buildCaptionCues({
      ayahNumbers: [1, 2],
      segments: [
        { start: 0, end: 3 },
        { start: 3, end: 7 },
      ],
      arabicTexts: ["بسم الله", "الحمد لله"],
      translationMap: { 1: "In the name", 2: "Praise" },
    });
    expect(cues).toHaveLength(2);
    expect(cues[0]?.text).toContain("بسم الله");
    expect(cues[0]?.text).toContain("In the name");
  });

  it("exports SRT and VTT", () => {
    const cues = buildCaptionCues({
      ayahNumbers: [1],
      segments: [{ start: 0, end: 2.5 }],
      arabicTexts: ["test"],
    });
    expect(cuesToSrt(cues)).toContain("00:00:00,000 --> 00:00:02,500");
    expect(cuesToVtt(cues)).toContain("WEBVTT");
    expect(cuesToVtt(cues)).toContain("00:00:02.500");
  });
});
