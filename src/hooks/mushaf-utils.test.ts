import { describe, expect, it } from "vitest";
import {
  clampFontScale,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  wordMeaning,
} from "@/hooks/mushaf-utils";
import { missingCacheKeys } from "@/hooks/useMushafStudyCache";
import { getReciter, reciterHasWordSync } from "@/lib/audio";
import type { QuranWord } from "@/lib/types";

const sampleWord = {
  position: 1,
  text: "ٱلْحَمْدُ",
  meaning: "praise",
  meaningAr: "الحمد",
  meaningId: "pujian",
  meaningUr: "تعریف",
} as QuranWord;

describe("mushaf-utils", () => {
  it("clamps font scale to allowed range", () => {
    expect(clampFontScale(0.1)).toBe(FONT_SCALE_MIN);
    expect(clampFontScale(9)).toBe(FONT_SCALE_MAX);
    expect(clampFontScale(1.05)).toBe(1.1);
  });

  it("resolves word meanings by language with fallbacks", () => {
    expect(wordMeaning(sampleWord, "ar")).toBe("الحمد");
    expect(wordMeaning(sampleWord, "en")).toBe("praise");
    expect(wordMeaning(sampleWord, "id")).toBe("pujian");
    expect(wordMeaning(sampleWord, "ur")).toBe("تعریف");
    expect(wordMeaning({ ...sampleWord, meaningAr: undefined }, "ar")).toBe(
      "praise",
    );
  });
});

describe("missingCacheKeys", () => {
  it("returns only surahs not yet present in the cache", () => {
    expect(
      missingCacheKeys([1, 2, 3], { "sadi:1": null, "sadi:3": {} }, "sadi"),
    ).toEqual([2]);
    expect(missingCacheKeys([1], {}, "sadi")).toEqual([1]);
  });
});

describe("reciterHasWordSync", () => {
  it("is true only when Quran.com chapter reciter id is set", () => {
    expect(reciterHasWordSync("alafasy")).toBe(true);
    expect(reciterHasWordSync("husary")).toBe(false);
    expect(getReciter("alafasy").quranComChapterReciterId).toBe(7);
  });
});
