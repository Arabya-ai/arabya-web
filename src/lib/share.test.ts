import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  buildListenUrl,
  buildMushafShareUrl,
  socialShareLinks,
  shareOgImageUrl,
} from "@/lib/share";

describe("share helpers", () => {
  it("builds distinct mushaf share kinds", () => {
    expect(
      buildMushafShareUrl({ page: 1, kind: "page" }),
    ).toBe("/mushaf/1?share=page");
    expect(
      buildMushafShareUrl({
        page: 1,
        kind: "ayah",
        verse: "1:1",
        surahId: 1,
      }),
    ).toBe("/mushaf/1?share=ayah&v=1%3A1&sid=1#s1-v-1");
    expect(
      buildMushafShareUrl({
        page: 1,
        kind: "surah",
        surahId: 1,
      }),
    ).toBe("/mushaf/1?share=surah&sid=1");
    expect(
      buildMushafShareUrl({
        page: 1,
        kind: "listen-surah",
        verse: "1:1",
        surahId: 1,
        reciter: "alafasy",
      }),
    ).toBe(
      "/mushaf/1?share=listen-surah&v=1%3A1&sid=1&listen=surah&reciter=alafasy",
    );
  });

  it("keeps listen helper compatible", () => {
    expect(
      buildListenUrl({
        path: "/mushaf/1",
        listen: "ayah",
        reciter: "alafasy",
        verse: "1:1",
      }),
    ).toContain("share=listen-ayah");
  });

  it("keeps absolute URLs absolute", () => {
    expect(absoluteUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(absoluteUrl("/mushaf/2").endsWith("/mushaf/2")).toBe(true);
  });

  it("returns social destinations including telegram", () => {
    const links = socialShareLinks({
      kind: "page",
      title: "t",
      text: "body",
      url: "https://www.arabyaai.com/mushaf/1?share=page",
    });
    expect(links.map((l) => l.id)).toEqual([
      "whatsapp",
      "telegram",
      "x",
      "facebook",
    ]);
    expect(links.find((l) => l.id === "telegram")?.href).toContain("t.me/share");
  });

  it("builds dynamic OG urls per kind", () => {
    expect(
      shareOgImageUrl({ kind: "ayah", page: 1, verse: "1:1", surahId: 1 }),
    ).toBe("/api/og?kind=ayah&page=1&v=1%3A1&sid=1");
  });
});
