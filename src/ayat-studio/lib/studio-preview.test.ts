import { describe, expect, it } from "vitest";
import { pickBestVideoFile, type PexelsVideo } from "@/ayat-studio/lib/pexels";
import {
  isAllowedStudioMediaUrl,
  studioMediaUrl,
} from "@/ayat-studio/lib/media-url";
import {
  ayahIndexAtTime,
  clampAyahPreviewIndex,
  fitAspectBox,
  measurePreviewFrame,
} from "@/ayat-studio/lib/studio-preview";

describe("studio ayah preview helpers", () => {
  it("clamps preview index", () => {
    expect(clampAyahPreviewIndex(-1, 3)).toBe(0);
    expect(clampAyahPreviewIndex(9, 3)).toBe(2);
    expect(clampAyahPreviewIndex(1, 0)).toBe(0);
  });

  it("maps playback time to ayah segment", () => {
    const segs = [
      { start: 0, end: 2 },
      { start: 2, end: 5 },
      { start: 5, end: 8 },
    ];
    expect(ayahIndexAtTime(segs, 0.5)).toBe(0);
    expect(ayahIndexAtTime(segs, 2.1)).toBe(1);
    expect(ayahIndexAtTime(segs, 7.9)).toBe(2);
    expect(ayahIndexAtTime(segs, 99)).toBe(2);
  });

  it("holds previous ayah across tiny gaps instead of snapping to 0", () => {
    const segs = [
      { start: 0, end: 2 },
      { start: 2.05, end: 5 },
    ];
    expect(ayahIndexAtTime(segs, 2.02)).toBe(0);
    expect(ayahIndexAtTime(segs, 2.06)).toBe(1);
  });

  it("fits portrait aspect inside wide container by height", () => {
    const box = fitAspectBox(800, 600, 9, 16);
    expect(box.height).toBe(600);
    expect(box.width).toBeCloseTo(337.5, 1);
  });

  it("fits portrait aspect inside narrow container by width", () => {
    const box = fitAspectBox(200, 600, 9, 16);
    expect(box.width).toBe(200);
    expect(box.height).toBeCloseTo(355.56, 1);
  });

  it("sizes stacked mobile preview to a screen-friendly box", () => {
    const box = measurePreviewFrame({
      stageW: 360,
      stageH: 200,
      aspectW: 9,
      aspectH: 16,
      viewportH: 800,
      stacked: true,
      stackedViewportRatio: 0.48,
      stackedWidthRatio: 0.72,
    });
    // softMaxW = 259.2, softMaxH = 384 → height-limited for 9:16
    expect(box.height).toBeLessThanOrEqual(384 + 0.5);
    expect(box.width).toBeLessThanOrEqual(259.2 + 0.5);
    expect(box.width / box.height).toBeCloseTo(9 / 16, 3);
    expect(box.height).toBeGreaterThan(280);
  });

  it("soft-caps stacked portrait when full-width height exceeds viewport budget", () => {
    const box = measurePreviewFrame({
      stageW: 400,
      stageH: 100,
      aspectW: 9,
      aspectH: 16,
      viewportH: 600,
      stacked: true,
      stackedViewportRatio: 0.48,
      stackedWidthRatio: 0.72,
    });
    // softMaxH = 288, softMaxW = 288 → height-limited
    expect(box.height).toBe(288);
    expect(box.width).toBeCloseTo(162, 0);
  });

  it("keeps desktop preview inside stage + viewport height", () => {
    const box = measurePreviewFrame({
      stageW: 500,
      stageH: 700,
      aspectW: 9,
      aspectH: 16,
      viewportH: 900,
      stacked: false,
      desktopViewportRatio: 0.68,
    });
    // height capped at 0.68 * 900 = 612
    expect(box.height).toBeLessThanOrEqual(612 + 0.5);
    expect(box.width / box.height).toBeCloseTo(9 / 16, 3);
  });
});

describe("pexels video pick for studio", () => {
  it("selects vimeo external mp4 for portrait projects", () => {
    const video = {
      id: 1,
      width: 1080,
      height: 1920,
      duration: 12,
      url: "",
      image: "https://images.pexels.com/x.jpg",
      user: { name: "a", url: "" },
      video_pictures: [],
      video_files: [
        {
          id: 1,
          quality: "hd",
          file_type: "video/mp4",
          width: 1080,
          height: 1920,
          link: "https://player.vimeo.com/external/1.hd.mp4?s=x",
        },
      ],
    } as PexelsVideo;
    const file = pickBestVideoFile(video, "portrait");
    expect(file?.link).toContain("player.vimeo.com");
    expect(isAllowedStudioMediaUrl(file!.link)).toBe(true);
    expect(studioMediaUrl(file!.link)).toContain("/api/studio/media");
  });
});
