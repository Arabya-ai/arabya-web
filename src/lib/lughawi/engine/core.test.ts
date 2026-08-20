import {
  LUGHAWI_ENGINE_VERSION,
  runProofreadEngine,
} from "@/lib/lughawi/engine/core";
import { ENGINE_STAGE_META } from "@/lib/lughawi/engine/stages-meta";
import { collectGrammarEdits } from "@/lib/lughawi/rules/grammar";
import { collectStyleEdits } from "@/lib/lughawi/rules/style";
import { describe, expect, it } from "vitest";

describe("lughawi engine core", () => {
  it("exposes a versioned staged registry", () => {
    expect(LUGHAWI_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(ENGINE_STAGE_META.some((s) => s.id === "spelling")).toBe(true);
    expect(ENGINE_STAGE_META.some((s) => s.id === "grammar")).toBe(true);
    expect(ENGINE_STAGE_META.some((s) => s.id === "style")).toBe(true);
  });

  it("returns stage telemetry and ranked edits", () => {
    const res = runProofreadEngine(
      "انا ذهبت الى المدرسه ، ويجب ان اراجع هذا المدرسة?",
      { locale: "ar" },
    );
    expect(res.meta.version).toBe(LUGHAWI_ENGINE_VERSION);
    expect(res.meta.stages?.length).toBeGreaterThan(3);
    expect(res.edits.length).toBeGreaterThan(0);
    expect(res.edits.every((e) => e.confidence >= 0.5)).toBe(true);
    expect(res.result).toContain("أنا");
    expect(res.result).toContain("إلى");
  });

  it("flags an-masdar and demonstrative grammar", () => {
    const edits = collectGrammarEdits("يجب ان نراجع هذا المدرسة", "ar");
    expect(edits.some((e) => e.suggestion === "أن")).toBe(true);
    expect(edits.some((e) => e.suggestion === "هذه")).toBe(true);
  });

  it("normalizes Arabic punctuation via style stage", () => {
    const edits = collectStyleEdits("مرحبا, كيف الحال?", "ar");
    expect(edits.some((e) => e.suggestion === "،")).toBe(true);
    expect(edits.some((e) => e.suggestion === "؟")).toBe(true);
  });
});
