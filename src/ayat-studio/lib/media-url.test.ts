import { describe, expect, it } from "vitest";
import {
  isAllowedStudioMediaRedirect,
  isAllowedStudioMediaUrl,
  studioMediaUrl,
} from "@/ayat-studio/lib/media-url";
import { pickBestVideoFile, type PexelsVideo } from "@/ayat-studio/lib/pexels";

describe("studioMediaUrl", () => {
  it("proxies Pexels image CDN https URLs", () => {
    const src = "https://images.pexels.com/photos/1/a.jpeg";
    expect(isAllowedStudioMediaUrl(src)).toBe(true);
    expect(studioMediaUrl(src)).toBe(
      `/api/studio/media?url=${encodeURIComponent(src)}`,
    );
  });

  it("proxies Pexels Vimeo external video URLs", () => {
    const src =
      "https://player.vimeo.com/external/342571552.hd.mp4?s=abc&profile_id=175";
    expect(isAllowedStudioMediaUrl(src)).toBe(true);
    expect(studioMediaUrl(src)).toContain("/api/studio/media?url=");
  });

  it("allows Vimeo CDN redirects after trusted start", () => {
    expect(
      isAllowedStudioMediaRedirect(
        "https://vod-progressive.akamaized.net/exp=1/vimeo-prod/video.mp4",
      ),
    ).toBe(true);
  });

  it("leaves data/blob/local URLs untouched", () => {
    expect(studioMediaUrl("data:image/png;base64,aa")).toBe(
      "data:image/png;base64,aa",
    );
    expect(studioMediaUrl("blob:https://x/1")).toBe("blob:https://x/1");
  });

  it("rejects non-allowlisted hosts as initial URLs", () => {
    expect(isAllowedStudioMediaUrl("https://evil.example/a.mp4")).toBe(false);
  });
});

describe("pickBestVideoFile", () => {
  it("picks a Vimeo external mp4 even without file_type", () => {
    const video = {
      id: 1,
      width: 1080,
      height: 1920,
      duration: 10,
      url: "",
      image: "",
      user: { name: "x", url: "" },
      video_pictures: [],
      video_files: [
        {
          id: 1,
          quality: "hd",
          file_type: "",
          width: 1080,
          height: 1920,
          link: "https://player.vimeo.com/external/1.hd.mp4?s=x",
        },
      ],
    } as PexelsVideo;
    expect(pickBestVideoFile(video, "portrait")?.link).toContain("player.vimeo.com");
  });
});
