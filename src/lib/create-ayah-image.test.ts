import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARABYA_SITE_HOST,
  ARABYA_BRAND_AR,
} from "@/lib/brand-export";
import { renderCreateAyahPng } from "@/lib/create-ayah-image";

function isPng(buf: Buffer): boolean {
  return (
    buf.length > 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

describe("renderCreateAyahPng branding", () => {
  it("embeds Arabya mark + site host on free watermark exports", async () => {
    const png = await renderCreateAyahPng({
      aspect: "1:1",
      surahTitle: "الفاتحة",
      verseLabel: "1",
      ayahText: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      watermark: true,
      locale: "ar",
    });

    expect(isPng(png)).toBe(true);
    expect(png.byteLength).toBeGreaterThan(8_000);

    const mark = await readFile(
      path.join(process.cwd(), "public/brand/arabya-mark-square.png"),
    );
    expect(png.byteLength).toBeGreaterThan(mark.byteLength / 4);
  });

  it("always includes brand even without free watermark flag", async () => {
    const png = await renderCreateAyahPng({
      aspect: "9:16",
      surahTitle: "Al-Fatihah",
      verseLabel: "1",
      ayahText: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      watermark: false,
      locale: "en",
      backgroundColor: "#0f766e",
    });
    expect(isPng(png)).toBe(true);
    expect(png.byteLength).toBeGreaterThan(8_000);
  });

  it("exposes site host constant used by exporters", () => {
    expect(ARABYA_SITE_HOST).toBe("arabya.org");
    expect(ARABYA_BRAND_AR).toBe("عربية");
  });
});
