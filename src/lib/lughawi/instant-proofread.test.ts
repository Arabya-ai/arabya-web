import { describe, expect, it } from "vitest";
import { instantProofreadLocal } from "@/lib/lughawi/instant-proofread";

describe("instantProofreadLocal", () => {
  it("returns spelling edits for common errors without server", () => {
    const edits = instantProofreadLocal("ذهبت الى المدرسة", { proofMode: "full" });
    expect(edits.length).toBeGreaterThan(0);
    expect(edits.some((e) => e.original === "الى" && e.suggestion === "إلى")).toBe(true);
  });

  it("returns empty for blank text", () => {
    expect(instantProofreadLocal("   ")).toEqual([]);
  });

  it("respects spelling-only mode", () => {
    const full = instantProofreadLocal("يجب ان نراجع هذا المدرسة", { proofMode: "full" });
    const spell = instantProofreadLocal("يجب ان نراجع هذا المدرسة", {
      proofMode: "spelling",
    });
    expect(spell.every((e) => e.type === "spelling")).toBe(true);
    expect(full.length).toBeGreaterThanOrEqual(spell.length);
  });
});
