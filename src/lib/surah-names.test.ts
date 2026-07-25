import { describe, expect, it } from "vitest";
import {
  getSurahDisplayName,
  getSurahEnglishName,
} from "@/lib/surah-names";

describe("getSurahEnglishName", () => {
  it("matches the English index labels for key surahs", () => {
    expect(getSurahEnglishName(1)).toBe("Fatiha");
    expect(getSurahEnglishName(2)).toBe("Baqarah");
    expect(getSurahEnglishName(3)).toBe("Al Imran");
    expect(getSurahEnglishName(36)).toBe("Yasin");
    expect(getSurahEnglishName(114)).toBe("An Nas");
  });

  it("covers all 114 surahs", () => {
    for (let id = 1; id <= 114; id += 1) {
      expect(getSurahEnglishName(id).length).toBeGreaterThan(0);
      expect(getSurahEnglishName(id)).not.toMatch(/^Surah /);
    }
  });
});

describe("getSurahDisplayName", () => {
  it("uses English labels on en locale and Arabic chip names on ar", () => {
    expect(getSurahDisplayName(1, "en")).toBe("Fatiha");
    expect(getSurahDisplayName(1, "ar")).toMatch(/فَاتِحَة|الفاتحة|فَاتِحَةُ/);
  });
});
