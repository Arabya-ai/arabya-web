import { describe, expect, it } from "vitest";
import { scoreEloquence } from "@/lib/lughawi/eloquence";
import {
  filterDontCorrect,
  isDontCorrectTerm,
  resetDontCorrectCache,
} from "@/lib/lughawi/dont-correct";
import { applyTafqeet } from "@/lib/lughawi/engines/tafqeet";
import { collectGrammarEdits } from "@/lib/lughawi/rules/grammar";
import { proofreadLocal } from "@/lib/lughawi/pipeline";
import type { LughawiEdit } from "@/lib/lughawi/types";

describe("eloquence score", () => {
  it("scores empty text as 0", () => {
    expect(scoreEloquence("").score).toBe(0);
  });

  it("gives higher score to clean short MSA than noisy text", () => {
    const clean = scoreEloquence("ذهبت إلى المدرسة اليوم. كتبت رسالة قصيرة.");
    const noisy = scoreEloquence("انا   ذهبت؟؟ هناك يوجد مشكله مشكله مشكله مشكله");
    expect(clean.score).toBeGreaterThan(noisy.score);
  });
});

describe("dont-correct dictionary", () => {
  it("locks institutional brand terms", () => {
    resetDontCorrectCache();
    expect(isDontCorrectTerm("عربية")).toBe(true);
    expect(isDontCorrectTerm("لغوي")).toBe(true);
  });

  it("filters edits that touch locked terms", () => {
    resetDontCorrectCache();
    const edits: LughawiEdit[] = [
      {
        id: "1",
        start: 0,
        end: 5,
        type: "spelling",
        original: "عربية",
        suggestion: "عربيةً",
        explanation: "x",
        confidence: 0.9,
        source: "rules",
        status: "proposed",
      },
      {
        id: "2",
        start: 6,
        end: 9,
        type: "spelling",
        original: "انا",
        suggestion: "أنا",
        explanation: "x",
        confidence: 0.9,
        source: "rules",
        status: "proposed",
      },
    ];
    const filtered = filterDontCorrect(edits);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.original).toBe("انا");
  });
});

describe("grammar number agreement", () => {
  it("flags ثلاث كتاب → ثلاثة", () => {
    const edits = collectGrammarEdits("اشتريت ثلاث كتاب جديد");
    expect(edits.some((e) => e.ruleId === "num-agreement" && e.suggestion === "ثلاثة")).toBe(
      true,
    );
  });
});

describe("tafqeet gender", () => {
  it("uses feminine number form before feminine noun", () => {
    const { result } = applyTafqeet("عندي 3 مدرسة");
    expect(result).toContain("ثلاث");
    expect(result).toContain("مدرسة");
  });
});

describe("proofMode spelling-only", () => {
  it("skips grammar stages when proofMode is spelling", () => {
    const full = proofreadLocal("يجب ان نراجع هذا المدرسة", { proofMode: "full" });
    const spell = proofreadLocal("يجب ان نراجع هذا المدرسة", {
      proofMode: "spelling",
    });
    expect(spell.meta.eloquence?.score).toBeTypeOf("number");
    expect(full.edits.length).toBeGreaterThanOrEqual(spell.edits.length);
    expect(spell.edits.every((e) => e.type === "spelling" || e.type === "punctuation")).toBe(
      true,
    );
  });
});
