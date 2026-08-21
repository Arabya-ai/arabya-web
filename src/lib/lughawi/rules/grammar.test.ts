import { collectGrammarEdits } from "@/lib/lughawi/rules/grammar";
import { describe, expect, it } from "vitest";

describe("lughawi grammar heuristics", () => {
  it("flags demonstrative disagreement", () => {
    const edits = collectGrammarEdits("هذا المدرسة جميلة", "ar");
    expect(edits.some((e) => e.suggestion === "هذه")).toBe(true);
  });

  it("flags إن + sound masculine plural nominative without diacritics", () => {
    const edits = collectGrammarEdits(
      "إن المعلمون يرفعون شأن الأمة",
      "ar",
    );
    expect(
      edits.some(
        (e) =>
          e.original === "المعلمون" &&
          e.suggestion === "المعلمين" &&
          e.ruleId === "inna-nasb",
      ),
    ).toBe(true);
  });
});
