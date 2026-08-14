import { NextResponse } from "next/server";
import { getTafsir, getTafsirSources } from "@/lib/quran";
import { enforceRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ slug: string; surahId: string }> };

/** Studio may request a verse range to avoid multi‑MB full-surah payloads. */
export async function GET(req: Request, { params }: Params) {
  const limited = enforceRateLimit(req, { prefix: "tafsir", limit: 60 });
  if (limited) return limited;
  const { slug, surahId: surahIdRaw } = await params;
  const surahId = Number(surahIdRaw);

  const sources = await getTafsirSources();
  const allowed = sources.some((s) => s.slug === slug);
  if (!allowed || !Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const tafsir = await getTafsir(slug, surahId);
  if (!tafsir) {
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

  const verses = (tafsir.verses || [])
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
    { ...tafsir, verses },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
