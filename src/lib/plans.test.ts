import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canCreatePremiumImage,
  canCreateVideo,
  FREE_IMAGE_ASPECT,
  imageSizeForAspect,
  normalizeUserPlan,
  resolveUserPlan,
  studioExportNeedsWatermark,
} from "@/lib/plans";

beforeEach(() => {
  process.env.ARABYA_ADMIN_EMAILS = "super@example.com";
  process.env.ARABYA_PLUS_EMAILS = "plus-owner@example.com";
});

afterEach(() => {
  delete process.env.ARABYA_ADMIN_EMAILS;
  delete process.env.ARABYA_PLUS_EMAILS;
});

describe("resolveUserPlan", () => {
  it("maps roles to free / pro / plus", () => {
    expect(resolveUserPlan({ email: "a@b.com", role: "member" })).toBe("free");
    expect(resolveUserPlan({ email: "a@b.com", role: "creator" })).toBe("pro");
    expect(resolveUserPlan({ email: "a@b.com", role: "editor" })).toBe("plus");
    expect(resolveUserPlan({ email: "a@b.com", role: "admin" })).toBe("plus");
  });

  it("grants plus to env owner / super-admin emails", () => {
    expect(
      resolveUserPlan({ email: "plus-owner@example.com", role: "member" }),
    ).toBe("plus");
    expect(
      resolveUserPlan({ email: "super@example.com", role: "member" }),
    ).toBe("plus");
  });
});

describe("entitlements", () => {
  it("gates premium image and video", () => {
    expect(canCreatePremiumImage("free")).toBe(false);
    expect(canCreatePremiumImage("pro")).toBe(true);
    expect(canCreateVideo("free")).toBe(false);
    expect(canCreateVideo("pro")).toBe(true);
    expect(canCreateVideo("plus")).toBe(true);
  });

  it("requires brand for free/member", () => {
    expect(studioExportNeedsWatermark("free")).toBe(true);
    expect(studioExportNeedsWatermark("pro")).toBe(false);
    expect(studioExportNeedsWatermark("plus")).toBe(false);
    expect(
      studioExportNeedsWatermark({ plan: "free", role: "member" }),
    ).toBe(true);
    expect(
      studioExportNeedsWatermark({ plan: "free", role: "creator" }),
    ).toBe(false);
  });

  it("maps aspects", () => {
    expect(FREE_IMAGE_ASPECT).toBe("1:1");
    expect(imageSizeForAspect("1:1")).toEqual({ width: 1080, height: 1080 });
  });
});

describe("normalizeUserPlan", () => {
  it("accepts pro and plus", () => {
    expect(normalizeUserPlan("pro")).toBe("pro");
    expect(normalizeUserPlan("plus")).toBe("plus");
    expect(normalizeUserPlan("nope")).toBe("free");
  });
});
