import { describe, expect, it } from "vitest";
import {
  canCreatePremiumImage,
  canCreateVideo,
  FREE_IMAGE_ASPECT,
  imageSizeForAspect,
  normalizeUserPlan,
  resolveUserPlan,
  studioExportNeedsWatermark,
} from "@/lib/plans";

describe("resolveUserPlan", () => {
  it("defaults to free", () => {
    expect(resolveUserPlan({ email: "a@b.com", role: "member" })).toBe("free");
  });

  it("honors cloud plus", () => {
    expect(
      resolveUserPlan({
        email: "a@b.com",
        role: "member",
        cloudPlan: "plus",
      }),
    ).toBe("plus");
  });

  it("grants plus to creators, editors and admins", () => {
    expect(resolveUserPlan({ email: "c@x.com", role: "creator" })).toBe("plus");
    expect(resolveUserPlan({ email: "e@x.com", role: "editor" })).toBe("plus");
    expect(resolveUserPlan({ email: "a@x.com", role: "admin" })).toBe("plus");
  });

  it("grants plus via allowlist", () => {
    expect(
      resolveUserPlan({
        email: "vip@example.com",
        role: "member",
        plusEmails: ["vip@example.com"],
      }),
    ).toBe("plus");
  });

  it("grants plus to owner emails", () => {
    expect(
      resolveUserPlan({ email: "egywebdev@gmail.com", role: "member" }),
    ).toBe("plus");
    expect(
      resolveUserPlan({ email: "arabyaaicom@gmail.com", role: "member" }),
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

  it("requires brand lockup for members; not for elevated roles", () => {
    expect(studioExportNeedsWatermark("free")).toBe(true);
    expect(studioExportNeedsWatermark("plus")).toBe(false);
    expect(
      studioExportNeedsWatermark({ plan: "free", role: "member" }),
    ).toBe(true);
    expect(
      studioExportNeedsWatermark({ plan: "free", role: "creator" }),
    ).toBe(false);
    expect(
      studioExportNeedsWatermark({ plan: "free", role: "editor" }),
    ).toBe(false);
    expect(
      studioExportNeedsWatermark({
        plan: "free",
        role: "member",
        email: "egywebdev@gmail.com",
      }),
    ).toBe(false);
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
