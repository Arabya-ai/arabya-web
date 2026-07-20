import { describe, expect, it } from "vitest";
import { GET as getSearch } from "@/app/api/search/route";
import { GET as getTafsir } from "@/app/api/tafsir/[slug]/[surahId]/route";
import { normalizeArabicSearch } from "@/lib/quran";

describe("normalizeArabicSearch", () => {
  it("strips tashkeel and normalizes alef forms", () => {
    expect(normalizeArabicSearch("الْحَمْدُ")).toBe("الحمد");
    expect(normalizeArabicSearch("ٱلله")).toContain("الله".slice(0, 3));
  });
});

describe("GET /api/search", () => {
  it("returns empty hits for short queries", async () => {
    const res = await getSearch(new Request("http://localhost/api/search?q=ا"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { hits: unknown[] };
    expect(body.hits).toEqual([]);
  });

  it("finds ayahs for a common Arabic query", async () => {
    const res = await getSearch(
      new Request("http://localhost/api/search?q=الحمد"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      query: string;
      hits: { key: string; surahId: number; text: string }[];
    };
    expect(body.query).toBe("الحمد");
    expect(body.hits.length).toBeGreaterThan(0);
    expect(body.hits.some((h) => h.surahId === 1)).toBe(true);
  });
});

describe("GET /api/tafsir/[slug]/[surahId]", () => {
  it("returns 404 for unknown slug or invalid surah", async () => {
    const badSlug = await getTafsir(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "not-a-real-tafsir", surahId: "1" }),
    });
    expect(badSlug.status).toBe(404);

    const badSurah = await getTafsir(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "sadi", surahId: "999" }),
    });
    expect(badSurah.status).toBe(404);
  });

  it("returns tafsir JSON for sadi / surah 1", async () => {
    const res = await getTafsir(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "sadi", surahId: "1" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      surahId?: number;
      verses?: { verseKey: string; text: string }[];
    };
    expect(body.verses?.length).toBeGreaterThan(0);
    expect(body.verses?.[0]?.text?.length).toBeGreaterThan(0);
  });
});
