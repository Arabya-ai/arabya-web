import { describe, expect, it } from "vitest";
import { loadTahfeezSession, TAHFEEZ_MAX_AYAHS } from "./load-session";

describe("loadTahfeezSession", () => {
  it("defaults to Fatiha ayah 1–7", async () => {
    const s = await loadTahfeezSession("ar", {});
    expect(s.surahId).toBe(1);
    expect(s.ayahFrom).toBe(1);
    expect(s.ayahTo).toBe(7);
    expect(s.verses.length).toBe(7);
    expect(s.catalog.length).toBe(114);
  });

  it("loads a Baqarah window without shipping the whole surah", async () => {
    const s = await loadTahfeezSession("ar", {
      surah: "2",
      from: "1",
      to: "20",
    });
    expect(s.surahId).toBe(2);
    expect(s.ayahFrom).toBe(1);
    expect(s.ayahTo).toBe(TAHFEEZ_MAX_AYAHS);
    expect(s.verses.length).toBe(TAHFEEZ_MAX_AYAHS);
    expect(s.ayahCount).toBeGreaterThan(100);
  });

  it("clamps invalid ids and respects max window", async () => {
    const s = await loadTahfeezSession("en", {
      surah: "999",
      from: "1",
      to: "100",
    });
    expect(s.surahId).toBe(114);
    expect(s.ayahTo - s.ayahFrom + 1).toBeLessThanOrEqual(TAHFEEZ_MAX_AYAHS);
  });
});
