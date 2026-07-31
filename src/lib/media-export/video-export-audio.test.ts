import { describe, expect, it } from "vitest";
import {
  buildAyahMedia,
  proxiedAyahAudioUrl,
} from "@/lib/media-export/video-export";

describe("create video audio proxy", () => {
  it("builds same-origin EveryAyah proxy URLs", () => {
    const url = proxiedAyahAudioUrl(1, 1, "alafasy");
    expect(url).toMatch(/^\/api\/create\/audio\?/);
    expect(url).toContain("folder=Alafasy_128kbps");
    expect(url).toContain("s=1");
    expect(url).toContain("v=1");
  });

  it("uses proxy URLs in ayah media list", () => {
    const media = buildAyahMedia({
      surahId: 1,
      surahName: "Al-Fatihah",
      ayahStart: 1,
      ayahEnd: 1,
      ayahTexts: { 1: "بِسْمِ ٱللَّهِ" },
      reciterId: "alafasy",
      ratio: "9:16",
      quality: "standard",
      textColor: "#fff",
      overlayOpacity: 40,
      overlayPosition: "center",
      fontSize: 40,
    });
    expect(media).toHaveLength(1);
    expect(media[0].audioUrl.startsWith("/api/create/audio?")).toBe(true);
    expect(media[0].audioUrl).not.toContain("everyayah.com");
  });
});
