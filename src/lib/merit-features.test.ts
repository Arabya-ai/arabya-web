import { describe, expect, it } from "vitest";
import { nearestPortalCity } from "@/lib/portal-cities";
import { getSurahStats } from "@/lib/quran";
import { getAdhkarCategories, getAdhkarCategory } from "@/lib/adhkar";
import { getReciterCatalog, getReciterCatalogEntry } from "@/lib/reciters-catalog";

describe("nearestPortalCity", () => {
  it("maps near Cairo to cairo", () => {
    expect(nearestPortalCity(30.05, 31.24).id).toBe("cairo");
  });

  it("maps near Makkah to makkah", () => {
    expect(nearestPortalCity(21.4, 39.85).id).toBe("makkah");
  });

  it("maps near Amman to amman", () => {
    expect(nearestPortalCity(31.95, 35.93).id).toBe("amman");
  });
});

describe("getSurahStats", () => {
  it("returns Fatiha counts", async () => {
    const stats = await getSurahStats(1);
    expect(stats).toMatchObject({
      surahId: 1,
      verses: 7,
      words: 29,
      letters: 139,
    });
  });
});

describe("adhkar data", () => {
  it("loads categories and morning items", async () => {
    const cats = await getAdhkarCategories();
    expect(cats.length).toBeGreaterThanOrEqual(5);
    expect(cats.some((c) => c.slug === "sleep")).toBe(true);
    expect(cats.every((c) => (c.itemCount ?? 0) > 0)).toBe(true);
    const morning = await getAdhkarCategory("morning");
    expect(morning?.items.length).toBeGreaterThan(0);
    expect(morning?.items[0].textAr.length).toBeGreaterThan(10);
  });
});

describe("reciter catalog", () => {
  it("lists reciters with meta fallbacks", async () => {
    const list = await getReciterCatalog();
    expect(list.length).toBeGreaterThan(20);
    const alafasy = await getReciterCatalogEntry("alafasy");
    expect(alafasy?.meta.riwayaAr).toBeTruthy();
    expect(alafasy?.meta.imageUrl).toMatch(/^https:\/\/static\.qurancdn\.com\//);
    expect(await getReciterCatalogEntry("no-such-reciter")).toBeNull();
  });
});
