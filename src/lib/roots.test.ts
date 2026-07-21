import { describe, expect, it } from "vitest";
import { summarizeRootLemmas, topRootsByCount } from "@/lib/roots";
import type { RootEntry } from "@/lib/types";

describe("summarizeRootLemmas", () => {
  it("aggregates lemmas and attaches curated senses", () => {
    const entry: RootEntry = {
      root: "رحم",
      count: 3,
      occurrences: [
        {
          wordId: "W:001:001:003",
          surahId: 1,
          verse: 1,
          position: 3,
          surface: "ٱلرَّحْمَٰنِ",
          lemma: "رَحْمٰن",
        },
        {
          wordId: "W:001:001:004",
          surahId: 1,
          verse: 1,
          position: 4,
          surface: "ٱلرَّحِيمِ",
          lemma: "رَحِيم",
        },
        {
          wordId: "W:001:003:001",
          surahId: 1,
          verse: 3,
          position: 1,
          surface: "ٱلرَّحْمَٰنِ",
          lemma: "رَحْمٰن",
        },
      ],
    };
    const lemmas = summarizeRootLemmas(entry, {
      رَحْمٰن: { sense: "الرحمن", source: "arabya-curated" },
      رَحِيم: { sense: "الرحيم", source: "arabya-curated" },
    });
    expect(lemmas[0]?.lemma).toBe("رَحْمٰن");
    expect(lemmas[0]?.count).toBe(2);
    expect(lemmas[0]?.sense).toBe("الرحمن");
    expect(lemmas).toHaveLength(2);
  });
});

describe("topRootsByCount", () => {
  it("returns highest frequency roots first", () => {
    const roots: RootEntry[] = [
      { root: "أ", count: 2, occurrences: [] },
      { root: "ب", count: 9, occurrences: [] },
      { root: "ج", count: 5, occurrences: [] },
    ];
    expect(topRootsByCount(roots, 2).map((r) => r.root)).toEqual(["ب", "ج"]);
  });
});
