import { describe, expect, it } from "vitest";
import {
  isAllowedStudioMediaUrl,
  studioMediaUrl,
} from "@/ayat-studio/lib/media-url";

describe("studioMediaUrl", () => {
  it("proxies Pexels CDN https URLs", () => {
    const src = "https://images.pexels.com/photos/1/a.jpeg";
    expect(isAllowedStudioMediaUrl(src)).toBe(true);
    expect(studioMediaUrl(src)).toBe(
      `/api/studio/media?url=${encodeURIComponent(src)}`,
    );
  });

  it("leaves data/blob/local URLs untouched", () => {
    expect(studioMediaUrl("data:image/png;base64,aa")).toBe(
      "data:image/png;base64,aa",
    );
    expect(studioMediaUrl("blob:https://x/1")).toBe("blob:https://x/1");
    expect(studioMediaUrl("/api/studio/media?url=x")).toBe(
      "/api/studio/media?url=x",
    );
  });

  it("rejects non-allowlisted hosts", () => {
    expect(isAllowedStudioMediaUrl("https://evil.example/a.mp4")).toBe(false);
    expect(studioMediaUrl("https://evil.example/a.mp4")).toBe(
      "https://evil.example/a.mp4",
    );
  });
});
