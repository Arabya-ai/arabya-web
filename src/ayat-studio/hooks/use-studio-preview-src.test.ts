import { describe, expect, it } from "vitest";
import { studioMediaUrl, isAllowedStudioMediaUrl } from "@/ayat-studio/lib/media-url";

describe("studio preview media resolution", () => {
  it("routes Pexels photo URLs through the authenticated proxy", () => {
    const url =
      "https://images.pexels.com/photos/158827/landscape-mountains-nature-lake-158827.jpeg";
    expect(isAllowedStudioMediaUrl(url)).toBe(true);
    expect(studioMediaUrl(url)).toMatch(/^\/api\/studio\/media\?url=/);
  });

  it("routes Pexels video CDN and Vimeo external URLs through the proxy", () => {
    const vimeo =
      "https://player.vimeo.com/external/342571552.hd.mp4?s=abc&profile_id=175";
    const pexels =
      "https://videos.pexels.com/video-files/2499611/2499611-hd_1080_1920_30fps.mp4";
    expect(studioMediaUrl(vimeo)).toContain("/api/studio/media?url=");
    expect(studioMediaUrl(pexels)).toContain("/api/studio/media?url=");
  });
});
