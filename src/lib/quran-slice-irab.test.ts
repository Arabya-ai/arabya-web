import { describe, expect, it } from "vitest";
import { sliceIrabToVerseNumbers } from "@/lib/quran";
import type { IrabSurah } from "@/lib/types";

const sample: IrabSurah = {
  id: 2,
  source: "QAC",
  sourceUrl: "https://corpus.quran.com",
  verses: [
    {
      verseNumber: 1,
      words: [
        {
          position: 1,
          wordId: "W:002:001:001",
          segments: "INL",
          pos: ["INL"],
          features: [],
          irab: "حروف مقطعة",
        },
      ],
    },
    {
      verseNumber: 2,
      words: [
        {
          position: 1,
          wordId: "W:002:002:001",
          segments: "DEM",
          pos: ["DEM"],
          features: [],
          irab: "اسم إشارة",
        },
      ],
    },
    {
      verseNumber: 286,
      words: [
        {
          position: 1,
          wordId: "W:002:286:001",
          segments: "NEG",
          pos: ["NEG"],
          features: [],
          irab: "نافية",
        },
      ],
    },
  ],
};

describe("sliceIrabToVerseNumbers", () => {
  it("returns null when irab is null", () => {
    expect(sliceIrabToVerseNumbers(null, [1])).toBeNull();
  });

  it("keeps only requested verse numbers", () => {
    const sliced = sliceIrabToVerseNumbers(sample, new Set([1, 2]));
    expect(sliced?.verses.map((v) => v.verseNumber)).toEqual([1, 2]);
    expect(sliced?.id).toBe(2);
    expect(sliced?.source).toBe("QAC");
  });

  it("returns empty verses when nothing matches", () => {
    const sliced = sliceIrabToVerseNumbers(sample, [999]);
    expect(sliced?.verses).toEqual([]);
  });
});
