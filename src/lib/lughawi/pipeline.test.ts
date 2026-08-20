import { proofreadLocal } from "@/lib/lughawi/pipeline";
import { collectSpellingEdits } from "@/lib/lughawi/rules/spelling";
import { numberToArabicWords } from "@/lib/lughawi/engines/tafqeet";
import { describe, expect, it } from "vitest";

describe("lughawi spelling", () => {
  it("fixes common MSA spelling mistakes", () => {
    const text = "انا ذهبت الى المدرسه";
    const edits = collectSpellingEdits(text, "ar");
    const suggestions = edits.map((e) => e.suggestion);
    expect(suggestions).toContain("أنا");
    expect(suggestions).toContain("إلى");
    expect(suggestions).toContain("المدرسة");
  });
});

describe("lughawi pipeline", () => {
  it("returns explanations and applies result", () => {
    const res = proofreadLocal("انا ذهبت الى المدرسه", { locale: "ar" });
    expect(res.edits.length).toBeGreaterThan(0);
    expect(res.edits.every((e) => e.explanation.length > 0)).toBe(true);
    expect(res.result).toContain("أنا");
    expect(res.result).toContain("إلى");
    expect(res.result).toContain("المدرسة");
  });

  it("protects known quran openings from edits overlapping them", () => {
    const res = proofreadLocal("بسم الله الرحمن الرحيم انا هنا", { locale: "ar" });
    expect(res.protectedSpans.length).toBeGreaterThan(0);
    const protectedEdit = res.edits.find(
      (e) => e.start < (res.protectedSpans[0]?.end ?? 0),
    );
    expect(protectedEdit).toBeUndefined();
  });
});

describe("tafqeet", () => {
  it("converts numbers to Arabic words", () => {
    expect(numberToArabicWords(0)).toBe("صفر");
    expect(numberToArabicWords(15)).toBe("خمسة عشر");
    expect(numberToArabicWords(21)).toContain("عشرون");
  });
});
