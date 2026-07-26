import { describe, expect, it } from "vitest";
import {
  brandLockupAnchor,
  brandPositionClass,
  normalizeBrandPosition,
} from "@/ayat-studio/lib/brand-position";

describe("brand position", () => {
  it("normalizes unknown values to bottom-left", () => {
    expect(normalizeBrandPosition(undefined)).toBe("bottom-left");
    expect(normalizeBrandPosition("top-right")).toBe("top-right");
  });

  it("anchors lockup inside the frame", () => {
    const topRight = brandLockupAnchor("top-right", 1080, 1920, 200, 40, 24);
    expect(topRight.x).toBeGreaterThan(800);
    expect(topRight.y).toBe(24);

    const center = brandLockupAnchor("center", 1080, 1920, 200, 40, 24);
    expect(center.x).toBe(Math.round((1080 - 200) / 2));
    expect(center.y).toBe(Math.round((1920 - 40) / 2));
  });

  it("maps positions to preview classes", () => {
    expect(brandPositionClass("top-left")).toContain("top-3");
    expect(brandPositionClass("bottom-right")).toContain("right-3");
  });
});
