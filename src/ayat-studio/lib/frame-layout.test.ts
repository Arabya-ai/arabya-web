import { describe, expect, it } from "vitest";
import {
  brandAndReciterCollide,
  frameAyahFontPx,
  frameAyahLineHeightPx,
  frameBrandBorderInsetPx,
  frameBrandLockupBoxH,
  frameBrandMarkPx,
  frameOverlayYCenter,
  frameProgressBarTopPx,
  frameReciterBottomPx,
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

  it("detects brand/reciter bottom-zone collisions", () => {
    expect(brandAndReciterCollide("bottom-left", "bottom-left", true)).toBe(
      true,
    );
    expect(brandAndReciterCollide("bottom-left", "bottom-right", true)).toBe(
      false,
    );
    expect(brandAndReciterCollide("bottom-left", "bottom-center", true)).toBe(
      true,
    );
    expect(brandAndReciterCollide("top-left", "bottom-left", true)).toBe(false);
    expect(brandAndReciterCollide("bottom-left", "hidden", true)).toBe(false);
    expect(brandAndReciterCollide("bottom-left", "bottom-left", false)).toBe(
      false,
    );
  });

  it("lifts reciter above brand when they share a bottom corner", () => {
    const h = 1000;
    const boxH = frameBrandLockupBoxH(360);
    const pad = 10;
    const lifted = frameReciterBottomPx(h, {
      collideWithBrand: true,
      brandBoxH: boxH,
      brandPad: pad,
    });
    const base = frameReciterBottomPx(h);
    expect(lifted).toBeGreaterThan(base);
    expect(lifted).toBeGreaterThanOrEqual(pad + boxH + 6);
  });
});
