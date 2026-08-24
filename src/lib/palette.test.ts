import { describe, expect, it } from "vitest";
import {
  ARABYA_PALETTES,
  DEFAULT_PALETTE,
  isArabyaPalette,
} from "@/lib/palette";

describe("palette", () => {
  it("defaults to Arabya teal", () => {
    expect(DEFAULT_PALETTE).toBe("teal");
  });

  it("accepts known palette ids only", () => {
    expect(isArabyaPalette("teal")).toBe(true);
    expect(isArabyaPalette("warraq")).toBe(true);
    expect(isArabyaPalette("purple")).toBe(false);
    expect(isArabyaPalette(null)).toBe(false);
  });

  it("lists eight Warraq-style swatches", () => {
    expect(ARABYA_PALETTES).toHaveLength(8);
  });
});
