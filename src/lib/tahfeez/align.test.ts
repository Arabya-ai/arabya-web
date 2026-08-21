import { describe, expect, it } from "vitest";
import { alignRecitation } from "./align";
import { normalizeArabicToken, tokenizeHypothesis } from "./normalize";

describe("tahfeez normalize", () => {
  it("strips tashkeel and unifies alef", () => {
    expect(normalizeArabicToken("بِسْمِ")).toBe("بسم");
    expect(normalizeArabicToken("ٱلرحمن")).toBe("الرحمن");
  });

  it("tokenizes hypothesis", () => {
    expect(tokenizeHypothesis("بسم الله الرحمن")).toEqual([
      "بسم",
      "الله",
      "الرحمن",
    ]);
  });
});

describe("alignRecitation", () => {
  const fatiha = ["بِسْمِ", "ٱللَّهِ", "ٱلرَّحْمَٰنِ", "ٱلرَّحِيمِ"];

  it("marks correct words in order", () => {
    const { results, cursor, accuracy } = alignRecitation(
      fatiha,
      "بسم الله الرحمن الرحيم",
    );
    expect(cursor).toBe(4);
    expect(accuracy).toBe(100);
    expect(results.every((r) => r.status === "correct")).toBe(true);
  });

  it("flags wrong then continues", () => {
    const { results, cursor } = alignRecitation(
      fatiha,
      "بسم قمر الرحمن الرحيم",
    );
    expect(cursor).toBe(4);
    expect(results[0].status).toBe("correct");
    expect(results[1].status).toBe("wrong");
  });

  it("detects a skipped word", () => {
    const { results } = alignRecitation(fatiha, "بسم الرحمن الرحيم");
    expect(results[0].status).toBe("correct");
    expect(results[1].status).toBe("skipped");
  });

  it("keeps original word indexes when a token normalizes empty", () => {
    const words = ["بِسْمِ", "!!!", "ٱللَّهِ"];
    const { results, cursor } = alignRecitation(words, "بسم الله");
    expect(results).toHaveLength(3);
    expect(results[0].status).toBe("correct");
    expect(results[1].status).toBe("pending");
    expect(results[2].status).toBe("correct");
    expect(cursor).toBe(2);
  });

  it("resumes from cursor", () => {
    const { cursor } = alignRecitation(fatiha, "بسم الله", { cursor: 0 });
    expect(cursor).toBe(2);
    const next = alignRecitation(fatiha, "الرحمن الرحيم", { cursor: 2 });
    expect(next.cursor).toBe(4);
  });
});
