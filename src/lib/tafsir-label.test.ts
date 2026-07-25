import { describe, expect, it } from "vitest";
import { orderTafsirSources, tafsirDisplayName } from "@/lib/tafsir-label";
import type { TafsirSource } from "@/lib/types";
import { getAsmaEn } from "@/lib/asma-meanings-en";
import { getAsmaAr } from "@/lib/asma-meanings-ar";

const sample: TafsirSource[] = [
  { slug: "muyassar", nameAr: "التفسير الميسر", nameEn: "Muyassar", lang: "ar", resourceId: 16 },
  { slug: "en-ibn-kathir", nameAr: "ابن كثير EN", nameEn: "Ibn Kathir", lang: "en", resourceId: 169 },
];

describe("tafsirDisplayName", () => {
  it("prefers nameEn on English locale", () => {
    expect(tafsirDisplayName(sample[1], "en")).toBe("Ibn Kathir");
    expect(tafsirDisplayName(sample[0], "ar")).toBe("التفسير الميسر");
  });
});

describe("orderTafsirSources", () => {
  it("puts English editions first for en locale", () => {
    expect(orderTafsirSources(sample, "en").map((s) => s.slug)).toEqual([
      "en-ibn-kathir",
      "muyassar",
    ]);
  });

  it("puts Arabic editions first for ar locale", () => {
    expect(orderTafsirSources(sample, "ar").map((s) => s.slug)).toEqual([
      "muyassar",
      "en-ibn-kathir",
    ]);
  });
});

describe("asma curated copy", () => {
  it("has matching AR/EN entries for all 99 names", () => {
    for (let n = 1; n <= 99; n += 1) {
      const ar = getAsmaAr(n);
      const en = getAsmaEn(n);
      expect(ar?.meaningAr.length).toBeGreaterThan(0);
      expect(ar?.explanationAr.length).toBeGreaterThan(0);
      expect(en?.meaningEn.length).toBeGreaterThan(0);
      expect(en?.explanationEn.length).toBeGreaterThan(0);
    }
  });
});
