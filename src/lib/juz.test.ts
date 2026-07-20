import { describe, expect, it } from "vitest";
import { SURAH_START_JUZ, juzLabel } from "@/lib/juz";

describe("juzLabel", () => {
  it("returns the known label for a juz number", () => {
    expect(juzLabel(1)).toBe("الجزء الأول");
    expect(juzLabel(30)).toBe("الجزء الثلاثون");
  });

  it("falls back to a generic label for unknown juz numbers", () => {
    expect(juzLabel(99)).toBe("الجزء 99");
  });
});

describe("SURAH_START_JUZ", () => {
  it("is 1-indexed with a placeholder at index 0", () => {
    expect(SURAH_START_JUZ[0]).toBe(0);
  });

  it("gives every surah 1..114 a valid starting juz (1..30)", () => {
    for (let surah = 1; surah <= 114; surah += 1) {
      const juz = SURAH_START_JUZ[surah];
      expect(juz).toBeGreaterThanOrEqual(1);
      expect(juz).toBeLessThanOrEqual(30);
    }
  });

  it("maps boundary surahs to the expected starting juz", () => {
    expect(SURAH_START_JUZ[1]).toBe(1);
    expect(SURAH_START_JUZ[2]).toBe(1);
    expect(SURAH_START_JUZ[114]).toBe(30);
  });
});
