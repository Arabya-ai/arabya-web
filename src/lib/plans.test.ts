import { describe, expect, it } from "vitest";
import {
  canCreatePremiumImage,
  canCreateVideo,
  FREE_IMAGE_ASPECT,
  imageSizeForAspect,
  normalizeUserPlan,
  resolveUserPlan,
} from "@/lib/plans";

describe("resolveUserPlan", () => {
  it("defaults to free", () => {
    expect(resolveUserPlan({ email: "a@b.com", role: "user" })).toBe("free");
  });

  it("honors cloud plus", () => {
    expect(
      resolveUserPlan({
        email: "a@b.com",
        role: "user",
        cloudPlan: "plus",
      }),
    ).toBe("plus");
  });

  it("grants plus to editors and admins", () => {
    expect(resolveUserPlan({ email: "e@x.com", role: "editor" })).toBe("plus");
    expect(resolveUserPlan({ email: "a@x.com", role: "admin" })).toBe("plus");
  });

  it("grants plus via allowlist", () => {
    expect(
      resolveUserPlan({
        email: "vip@example.com",
        role: "user",
        plusEmails: ["vip@example.com"],
      }),
    ).toBe("plus");
  });

  it("grants plus to owner emails", () => {
    expect(
      resolveUserPlan({ email: "egywebdev@gmail.com", role: "user" }),
    ).toBe("plus");
    expect(
      resolveUserPlan({ email: "arabyaaicom@gmail.com", role: "user" }),
    ).toBe("plus");
  });
});

describe("entitlements", () => {
  it("gates premium image and video to plus", () => {
    expect(canCreatePremiumImage("free")).toBe(false);
    expect(canCreatePremiumImage("plus")).toBe(true);
    expect(canCreateVideo("free")).toBe(false);
    expect(canCreateVideo("plus")).toBe(true);
  });

  it("allows studio MP4 for free with watermark flag", async () => {
    const { canExportStudioMp4, studioExportNeedsWatermark } = await import(
      "@/lib/plans"
    );
    expect(canExportStudioMp4("free")).toBe(true);
    expect(canExportStudioMp4("plus")).toBe(true);
    expect(studioExportNeedsWatermark("free")).toBe(true);
    expect(studioExportNeedsWatermark("plus")).toBe(false);
  });

  it("maps aspects to pixel sizes", () => {
    expect(FREE_IMAGE_ASPECT).toBe("1:1");
    expect(imageSizeForAspect("1:1")).toEqual({ width: 1080, height: 1080 });
    expect(imageSizeForAspect("9:16").height).toBeGreaterThan(
      imageSizeForAspect("9:16").width,
    );
  });
});

describe("normalizeUserPlan", () => {
  it("falls back to free", () => {
    expect(normalizeUserPlan("plus")).toBe("plus");
    expect(normalizeUserPlan("nope")).toBe("free");
  });
});
