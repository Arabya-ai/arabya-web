import { describe, expect, it } from "vitest";
import {
  getHadithCollection,
  listHadithCollections,
  searchHadith,
} from "@/lib/hadith";
import { getHeritageWork, listHeritageWorks } from "@/lib/heritage";
import {
  upcomingHijriEvents,
  listHijriEvents,
  formatHijriEventDate,
} from "@/lib/hijri-events";
import { searchAyahs } from "@/lib/quran";

describe("hadith catalog", () => {
  it("lists collections with items", async () => {
    const list = await listHadithCollections();
    expect(list.length).toBeGreaterThanOrEqual(10);
    const bukhari = await getHadithCollection("bukhari");
    expect(bukhari?.items.length).toBeGreaterThan(1000);
    expect(bukhari?.items[0]?.id).toMatch(/^H:bukhari:/);
    const ahmad = await getHadithCollection("ahmad");
    expect(ahmad?.items.length).toBeGreaterThan(1000);
  });

  it("searches arabic matn", async () => {
    const withArticle = await searchHadith("النيات", { limit: 10 });
    expect(withArticle.total).toBeGreaterThan(0);
    expect(withArticle.hits[0]?.id).toMatch(/^H:/);
    expect(withArticle.hits[0]?.arabic.length).toBeGreaterThan(20);
    const withoutArticle = await searchHadith("نيات", { limit: 10 });
    expect(withoutArticle.total).toBeGreaterThan(0);
  });
});

describe("heritage catalog", () => {
  it("loads prosody and poetry works", async () => {
    const works = await listHeritageWorks();
    expect(works.length).toBeGreaterThanOrEqual(5);
    expect(works.some((w) => w.slug === "qafiyah-intro")).toBe(true);
    expect(works.some((w) => w.slug === "imru-al-qays")).toBe(true);
    const work = await getHeritageWork("mutanabbi-samples");
    expect(work?.passages.length).toBeGreaterThan(0);
    expect(work?.passages[0]?.id).toMatch(/^TW:/);
  });
});

describe("hijri events", () => {
  it("orders upcoming from a reference day", async () => {
    const events = await listHijriEvents();
    expect(events.length).toBeGreaterThan(3);
    const next = upcomingHijriEvents(events, 9, 1, 3);
    expect(next[0]?.month).toBe(9);
    expect(formatHijriEventDate(next[0]!, "ar")).toMatch(/رمضان|1/);
  });
});

describe("search surah facet", () => {
  it("limits ayah hits to one surah", async () => {
    const all = await searchAyahs("الله", { limit: 50 });
    const filtered = await searchAyahs("الله", { limit: 50, surahId: 1 });
    expect(filtered.total).toBeLessThanOrEqual(all.total);
    expect(filtered.hits.every((h) => h.surahId === 1)).toBe(true);
  });

  it("limits ayah hits to one juz", async () => {
    const filtered = await searchAyahs("الله", { limit: 40, juzId: 30 });
    expect(filtered.total).toBeGreaterThan(0);
    expect(filtered.hits.every((h) => h.page >= 582)).toBe(true);
  });
});
