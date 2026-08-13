import { describe, expect, it } from "vitest";
import {
  brandAndReciterCollide,
  frameAyahFontPx,
  frameAyahLineHeightPx,
  frameBrandBorderInsetPx,
  frameBrandLockupBoxH,
  frameBrandMarkPx,
  frameLayerStackGapPx,
  frameOverlayYCenter,
  frameProgressBarTopPx,
  frameReciterBottomPx,
  frameSurahLabelGapPx,
  frameSurahLabelPx,
  normalizeProgressBarStyle,
  normalizeReciterPosition,
  reciterX,
  resolveStudioExportSize,
  STUDIO_AYAH_MAX_LINES,
  STUDIO_AYAH_WIDTH_RATIO,
  STUDIO_KENBURNS_ZOOM,
  STUDIO_LAYER_WIDTH_RATIO,
  STUDIO_TAFSIR_MAX_LINES,
  STUDIO_TAFSIR_PREVIEW_MAX_CHARS,
  STUDIO_TRANSLATION_MAX_LINES,
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

  it("shares wrap caps, column ratios, and kenburns zoom", () => {
    expect(STUDIO_AYAH_MAX_LINES).toBe(6);
    expect(STUDIO_TRANSLATION_MAX_LINES).toBe(4);
    expect(STUDIO_TAFSIR_MAX_LINES).toBe(5);
    expect(STUDIO_AYAH_WIDTH_RATIO).toBe(0.85);
    expect(STUDIO_LAYER_WIDTH_RATIO).toBe(0.82);
    expect(STUDIO_KENBURNS_ZOOM).toBe(0.08);
    expect(frameLayerStackGapPx(40)).toBe(14);
  });

  it("resolves export pixel size from quality ladder for all platforms", () => {
    expect(resolveStudioExportSize(1080, 1920, "high")).toEqual({
      scale: 1,
      width: 1080,
      height: 1920,
    });
    expect(resolveStudioExportSize(1080, 1920, "standard")).toEqual({
      scale: 0.5,
      width: 540,
      height: 960,
    });
    expect(resolveStudioExportSize(1920, 1080, "ultra")).toEqual({
      scale: 1.5,
      width: 2880,
      height: 1620,
    });
    // Odd intermediate sizes stay even for encoders.
    expect(resolveStudioExportSize(1080, 1350, "standard").width % 2).toBe(0);
    expect(resolveStudioExportSize(1080, 1350, "standard").height % 2).toBe(0);
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
