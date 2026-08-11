import { describe, expect, it } from "vitest";
import {
  frameAyahFontPx,
  frameAyahLineHeightPx,
  frameBrandBorderInsetPx,
  frameBrandMarkPx,
  frameOverlayYCenter,
  frameProgressBarTopPx,
  frameSurahLabelGapPx,
  frameSurahLabelPx,
  normalizeProgressBarStyle,
  normalizeReciterPosition,
  reciterX,
  STUDIO_TAFSIR_PREVIEW_MAX_CHARS,
} from "./frame-layout";

describe("frame-layout", () => {
  it("scales ayah font with frame width using export formula", () => {
    expect(frameAyahFontPx(48, 1080)).toBe(Math.round(1080 * 0.06));
    expect(frameAyahFontPx(48, 320)).toBe(Math.round(320 * 0.06));
  });

  it("scales surah label with project font size", () => {
    expect(frameSurahLabelPx(16, 1080)).toBe(Math.round(1080 * 0.025));
    expect(frameSurahLabelPx(32, 1080)).toBe(Math.round(2 * 1080 * 0.025));
  });

  it("gives ayah lines room for tashkeel", () => {
    expect(frameAyahLineHeightPx(48)).toBe(Math.round(48 * 1.95));
  });

  it("keeps a clear gap under the surah label", () => {
    expect(frameSurahLabelGapPx(20, 1920)).toBeGreaterThanOrEqual(27);
  });

  it("keeps brand mark proportional", () => {
    expect(frameBrandMarkPx(320)).toBe(Math.round(320 * 0.072));
    expect(frameBrandMarkPx(1080)).toBe(Math.round(1080 * 0.072));
  });

  it("normalizes reciter and progress defaults", () => {
    expect(normalizeReciterPosition(undefined)).toBe("bottom-left");
    expect(normalizeReciterPosition("hidden")).toBe("hidden");
    expect(normalizeProgressBarStyle(undefined)).toBe("none");
    expect(normalizeProgressBarStyle("glow")).toBe("glow");
  });

  it("places reciter on edges", () => {
    expect(reciterX("bottom-left", 1000)).toBe(40);
    expect(reciterX("bottom-right", 1000)).toBe(960);
    expect(reciterX("bottom-center", 1000)).toBe(500);
  });

  it("uses shared overlay anchors for preview and export", () => {
    expect(frameOverlayYCenter("center", 1000)).toBe(420);
    expect(frameOverlayYCenter("top", 800)).toBe(176);
    expect(frameBrandBorderInsetPx(1080)).toBe(Math.round(1080 * 0.02));
    expect(frameProgressBarTopPx(1000)).toBe(930);
    expect(STUDIO_TAFSIR_PREVIEW_MAX_CHARS).toBe(360);
  });
});
