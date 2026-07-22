import { describe, expect, it } from "vitest";
import { sanitizeSearchQuery } from "@/lib/api-query";
import { GET as getSearch } from "@/app/api/search/route";
import { GET as getStudy } from "@/app/api/study/route";
import { GET as getTafsir } from "@/app/api/tafsir/[slug]/[surahId]/route";
import { findRootByQuery, normalizeArabicSearch, expandSearchQueryVariants } from "@/lib/quran";

describe("sanitizeSearchQuery", () => {
  it("rejects short or empty input", () => {
    expect(sanitizeSearchQuery("")).toBeNull();
    expect(sanitizeSearchQuery("ا")).toBeNull();
    expect(sanitizeSearchQuery("  ا  ")).toBeNull();
  });

  it("strips control characters and caps length", () => {
    expect(sanitizeSearchQuery("الحمد\u0000لله")).toBe("الحمدلله");
    const long = "ا".repeat(200);
    expect(sanitizeSearchQuery(long)?.length).toBe(120);
  });
});

describe("normalizeArabicSearch", () => {
  it("strips tashkeel and normalizes alef forms", () => {
    expect(normalizeArabicSearch("الْحَمْدُ")).toBe("الحمد");
    expect(normalizeArabicSearch("ٱلله")).toContain("الله".slice(0, 3));
  });

  it("maps Uthmani Ibrahim orthography to plain ابراهيم", () => {
    expect(normalizeArabicSearch("إِبۡرَٰهِـۧمَ")).toBe("ابراهيم");
    expect(normalizeArabicSearch("ابراهيم")).toBe("ابراهيم");
  });
});

describe("expandSearchQueryVariants", () => {
  it("adds or strips ال carefully", () => {
    expect(expandSearchQueryVariants("الحمد")).toEqual(
      expect.arrayContaining(["الحمد", "حمد"]),
    );
    expect(expandSearchQueryVariants("حمد")).toEqual(
      expect.arrayContaining(["حمد", "الحمد"]),
    );
  });

  it("does not strip ال from short stems", () => {
    expect(expandSearchQueryVariants("ال")).toEqual(["ال"]);
    expect(expandSearchQueryVariants("الى")).toEqual(
      expect.arrayContaining(["الى"]),
    );
  });
});

describe("findRootByQuery", () => {
  it("resolves a known triliteral root", async () => {
    const entry = await findRootByQuery("رحم");
    expect(entry?.root).toBe("رحم");
    expect(entry?.count).toBeGreaterThan(0);
  });
});

describe("GET /api/search", () => {
  it("returns empty hits for short queries", async () => {
    const res = await getSearch(new Request("http://localhost/api/search?q=ا"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { hits: unknown[]; root: unknown };
    expect(body.hits).toEqual([]);
    expect(body.root).toBeNull();
  });

  it("finds ayahs for a common Arabic query", async () => {
    const res = await getSearch(
      new Request("http://localhost/api/search?q=الحمد"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      query: string;
      hits: { key: string; surahId: number; text: string }[];
      total: number;
    };
    expect(body.query).toBe("الحمد");
    expect(body.hits.length).toBeGreaterThan(0);
    expect(body.total).toBeGreaterThanOrEqual(body.hits.length);
    expect(body.hits.some((h) => h.surahId === 1)).toBe(true);
  });

  it("matches ابراهيم in ayah text, not every verse of Surah Ibrahim", async () => {
    const res = await getSearch(
      new Request("http://localhost/api/search?q=ابراهيم&all=1"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      hits: { key: string; surahId: number; text: string }[];
      total: number;
    };
    expect(body.total).toBeGreaterThan(10);
    expect(body.hits.some((h) => h.key === "2:124")).toBe(true);
    const onlySurah14 = body.hits.every((h) => h.surahId === 14);
    expect(onlySurah14).toBe(false);
    expect(body.hits.filter((h) => h.surahId === 14).length).toBeLessThan(10);
  });

  it("defaults to a short preview of results", async () => {
    const res = await getSearch(
      new Request("http://localhost/api/search?q=ابراهيم"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      hits: unknown[];
      total: number;
    };
    expect(body.hits.length).toBeLessThanOrEqual(10);
    expect(body.total).toBeGreaterThan(body.hits.length);
  });

  it("includes a root match when the query is a known root", async () => {
    const res = await getSearch(
      new Request("http://localhost/api/search?q=رحم"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      root: { root: string; count: number; href: string } | null;
    };
    expect(body.root?.root).toBe("رحم");
    expect(body.root?.href).toBe(`/root/${encodeURIComponent("رحم")}`);
  });
});

describe("GET /api/study", () => {
  it("returns 400 for short queries", async () => {
    const res = await getStudy(new Request("http://localhost/api/study?q=ا"));
    expect(res.status).toBe(400);
  });

  it("returns a local study brief for a valid query", async () => {
    const res = await getStudy(
      new Request("http://localhost/api/study?q=الحمد"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      hits: unknown[];
      brief: string;
      total: number;
    };
    expect(body.hits.length).toBeGreaterThan(0);
    expect(body.hits.length).toBeLessThanOrEqual(10);
    expect(body.total).toBeGreaterThan(0);
    expect(body.brief.length).toBeGreaterThan(0);
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
