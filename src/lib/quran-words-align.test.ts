import { describe, expect, it } from "vitest";
import {
  alignSurahWords,
  assignAyahNumbers,
  isAyahRow,
  isOrnamentRow,
  makeWordId,
  normalizeArabic,
} from "./quran-words-align";

describe("quran-words alignment", () => {
  it("makeWordId pads surah/verse/position", () => {
    expect(makeWordId(1, 1, 1)).toBe("W:001:001:001");
    expect(makeWordId(114, 6, 3)).toBe("W:114:006:003");
  });

  it("does not treat lexical آية as an ayah summary row", () => {
    expect(isAyahRow("ءَايَةٍ", "https://www.quran-words.com/كلمة/آية/1961")).toBe(
      false,
    );
    expect(isAyahRow("آية رقم ١٠٦", "https://www.quran-words.com/آية/2:106")).toBe(
      true,
    );
  });

  it("skips hizb ornaments", () => {
    expect(isOrnamentRow("۞")).toBe(true);
    expect(isOrnamentRow("بِسۡمِ")).toBe(false);
  });

  it("assigns ayah numbers from marker rows", () => {
    const rows = assignAyahNumbers([
      { word: "بِسۡمِ", url: "https://www.quran-words.com/كلمة/بسم/1" },
      { word: "ٱللَّهِ", url: "https://www.quran-words.com/كلمة/الله/2" },
      {
        word: "آية رقم ١",
        url: "https://www.quran-words.com/آية/1:1",
      },
      { word: "ٱلۡحَمۡدُ", url: "https://www.quran-words.com/كلمة/الحمد/6" },
      { word: "۞", url: "https://www.quran-words.com/كلمة/۞/99" },
      {
        word: "آية رقم ٢",
        url: "https://www.quran-words.com/آية/1:2",
      },
    ]);
    expect(rows.map((r) => [normalizeArabic(r.word), r.ayah])).toEqual([
      ["بسم", 1],
      ["الله", 1],
      ["الحمد", 2],
    ]);
  });

  it("aligns fatiha-sized sample to wordIds", () => {
    const arabyaWords = [
      { verse: 1, position: 1, text: "بِسۡمِ" },
      { verse: 1, position: 2, text: "ٱللَّهِ" },
      { verse: 2, position: 1, text: "ٱلۡحَمۡدُ" },
    ];
    const qwWords = assignAyahNumbers([
      {
        word: "بِسۡمِ",
        sense: "اسم",
        lexiconKey: "سمو",
        url: "https://www.quran-words.com/كلمة/بسم/1",
      },
      {
        word: "ٱللَّهِ",
        sense: "الله",
        lexiconKey: "اله",
        url: "https://www.quran-words.com/كلمة/الله/2",
      },
      { word: "آية رقم ١", url: "https://www.quran-words.com/آية/1:1" },
      {
        word: "ٱلۡحَمۡدُ",
        sense: "الحمد",
        lexiconKey: "حمد",
        url: "https://www.quran-words.com/كلمة/الحمد/6",
      },
      { word: "آية رقم ٢", url: "https://www.quran-words.com/آية/1:2" },
    ]);
    const { aligned, report } = alignSurahWords({
      surahId: 1,
      arabyaWords,
      qwWords,
    });
    expect(report.matched).toBe(3);
    expect(aligned[0]).toMatchObject({
      wordId: "W:001:001:001",
      sense: "اسم",
      lexiconKey: "سمو",
    });
    expect(aligned[2].wordId).toBe("W:001:002:001");
  });
});
