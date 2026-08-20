import { collectGrammarEdits } from "@/lib/lughawi/rules/grammar";
import { describe, expect, it } from "vitest";

describe("lughawi grammar heuristics", () => {
  it("flags demonstrative disagreement", () => {
    const edits = collectGrammarEdits("هذا المدرسة جميلة", "ar");
    expect(edits.some((e) => e.suggestion === "هذه")).toBe(true);
  });
});
