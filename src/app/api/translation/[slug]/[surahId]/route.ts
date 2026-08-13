import { NextResponse } from "next/server";
import {
  getVerseTranslation,
  getVerseTranslationEditions,
} from "@/lib/quran";

type Params = { params: Promise<{ slug: string; surahId: string }> };

/** Studio may request a verse range to keep preview payloads small. */
export async function GET(req: Request, { params }: Params) {
  const { slug, surahId: surahIdRaw } = await params;
  const surahId = Number(surahIdRaw);

  const editions = await getVerseTranslationEditions();
  const allowed = editions.some((e) => e.slug === slug);
  if (!allowed || !Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const translation = await getVerseTranslation(slug, surahId);
  if (!translation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const from = Number(url.searchParams.get("from") || "0");
  const to = Number(url.searchParams.get("to") || "0");
  const maxChars = Number(url.searchParams.get("maxChars") || "2000");
  const clip =
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    from >= 1 &&
    to >= from;

  const verses = (translation.verses || [])
    .filter((v) => !clip || (v.verseNumber >= from && v.verseNumber <= to))
    .map((v) => {
      const text = String(v.text || "");
      const clipped =
        Number.isFinite(maxChars) && maxChars > 0 && text.length > maxChars
          ? `${text.slice(0, maxChars)}…`
          : text;
      return { ...v, text: clipped };
    });

  return NextResponse.json(
    { ...translation, verses },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
