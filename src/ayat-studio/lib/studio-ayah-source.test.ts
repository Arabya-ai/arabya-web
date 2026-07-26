import { describe, expect, it } from "vitest";
import { getSurah } from "@/lib/quran";
import { normalizeForHafsFont } from "@/lib/quran-text";

describe("studio ayah text source (QPC)", () => {
  it("returns distinct verses for Al-Fatiha, not only basmala", async () => {
    const surah = await getSurah(1);
    expect(surah).toBeTruthy();
    const texts: Record<number, string> = {};
    for (const v of surah!.verses) {
      if (v.verseNumber < 1 || v.verseNumber > 7) continue;
      texts[v.verseNumber] = v.words
        .filter((w) => !w.charType || w.charType === "word")
        .map((w) => normalizeForHafsFont(w.text))
        .join(" ");
    }
    expect(Object.keys(texts)).toHaveLength(7);
    expect(texts[1]).toBeTruthy();
    expect(texts[2]).toBeTruthy();
    expect(texts[2]).not.toEqual(texts[1]);
    // Verse 2 of Al-Fatiha is الحمد لله ... — not only basmala
    expect(texts[2]!.length).toBeGreaterThan(15);
  });
});
