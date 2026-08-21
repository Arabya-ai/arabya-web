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

  it("fixes hamza, في, علي name, and ta-marbuta in a short sentence", () => {
    const text = "احمد قابل على فى المدرسه";
    const edits = collectSpellingEdits(text, "ar");
    const map = Object.fromEntries(
      edits.map((e) => [e.original, e.suggestion]),
    );
    expect(map["احمد"]).toBe("أحمد");
    expect(map["على"]).toBe("علي");
    expect(map["فى"]).toBe("في");
    expect(map["المدرسه"]).toBe("المدرسة");
    const res = proofreadLocal(text, { locale: "ar" });
    expect(res.result).toBe("أحمد قابل علي في المدرسة");
  });

  it("fixes بقرة / تقرأ / كتابًا in a short nonsense sentence", () => {
    const text = "بقره تقرا كتاب";
    const res = proofreadLocal(text, { locale: "ar" });
    const map = Object.fromEntries(
      res.edits.map((e) => [e.original, e.suggestion]),
    );
    expect(map["بقره"]).toBe("بقرة");
    expect(map["تقرا"]).toBe("تقرأ");
    expect(map["كتاب"]).toBe("كتابًا");
    expect(res.result).toBe("بقرة تقرأ كتابًا");
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
