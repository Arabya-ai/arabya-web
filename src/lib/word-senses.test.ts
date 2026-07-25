import { describe, expect, it } from "vitest";
import { sliceWordSensesToVerseNumbers } from "./word-senses";
import type { WordSensesSurah } from "./types";

describe("sliceWordSensesToVerseNumbers", () => {
  const sample: WordSensesSurah = {
    id: 1,
    source: "quran-words.com",
    wordCount: 3,
    words: {
      "W:001:001:001": { sense: "اسم", lexiconKey: "سمو" },
      "W:001:002:001": { sense: "حمد", lexiconKey: "حمد" },
      "W:001:007:009": { sense: "ضال", lexiconKey: null },
    },
  };

  it("keeps only requested verses", () => {
    const sliced = sliceWordSensesToVerseNumbers(sample, [1, 7]);
    expect(sliced?.wordCount).toBe(2);
    expect(sliced?.words["W:001:001:001"]?.sense).toBe("اسم");
    expect(sliced?.words["W:001:007:009"]?.sense).toBe("ضال");
    expect(sliced?.words["W:001:002:001"]).toBeUndefined();
  });

  it("returns empty words for empty verse set", () => {
    const sliced = sliceWordSensesToVerseNumbers(sample, []);
    expect(sliced?.wordCount).toBe(0);
    expect(sliced?.words).toEqual({});
  });
});
