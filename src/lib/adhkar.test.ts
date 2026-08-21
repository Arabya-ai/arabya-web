import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAdhkarCategories,
  getAdhkarCategory,
  getDuas,
  getTasbeehPhrases,
  isAdhkarToolSlug,
} from "@/lib/adhkar";
import {
  getTasbeehState,
  incrementTasbeeh,
  resetTasbeeh,
  setTasbeehPhrase,
} from "@/lib/adhkar-progress";

describe("adhkar loaders", () => {
  it("rejects tool slugs as categories", async () => {
    expect(isAdhkarToolSlug("duas")).toBe(true);
    expect(isAdhkarToolSlug("hisn")).toBe(true);
    expect(await getAdhkarCategory("duas")).toBeNull();
    expect(await getAdhkarCategory("tasbeeh")).toBeNull();
    expect(await getAdhkarCategory("hisn")).toBeNull();
  });

  it("loads expanded duas and categories", async () => {
    const duas = await getDuas();
    expect(duas.length).toBeGreaterThanOrEqual(200);
    expect(duas[0].textAr.length).toBeGreaterThan(8);
    expect(duas.every((d) => Boolean(d.categoryAr?.trim()))).toBe(true);
    const phrases = await getTasbeehPhrases();
    expect(phrases.some((p) => p.id === "subhanallah")).toBe(true);
    const sleep = await getAdhkarCategory("sleep");
    expect(sleep?.items.length).toBeGreaterThan(0);
    expect(sleep?.items[0].id).toBe("sleep-1");
  });

  it("loads Hisn al-Muslim categories", async () => {
    const { getHisnCategories } = await import("@/lib/adhkar");
    const cats = await getHisnCategories();
    expect(cats.length).toBeGreaterThan(50);
    expect(cats[0].items.length).toBeGreaterThan(0);
  });

  it("keeps category slugs unique from tools", async () => {
    const cats = await getAdhkarCategories();
    const slugs = cats.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.some(isAdhkarToolSlug)).toBe(false);
    expect(slugs).toContain("waking");
    expect(slugs).toContain("travel");
  });
});

describe("tasbeeh progress", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("increments, switches phrase, and resets", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    });

    expect(getTasbeehState()).toMatchObject({
      phraseId: "subhanallah",
      count: 0,
    });
    expect(incrementTasbeeh().count).toBe(1);
    expect(incrementTasbeeh().count).toBe(2);
    expect(setTasbeehPhrase("alhamdulillah")).toMatchObject({
      phraseId: "alhamdulillah",
      count: 2,
    });
    expect(resetTasbeeh()).toEqual({ phraseId: "alhamdulillah", count: 0 });
  });
});
