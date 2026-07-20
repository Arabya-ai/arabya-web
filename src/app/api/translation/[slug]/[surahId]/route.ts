import { NextResponse } from "next/server";
import {
  getVerseTranslation,
  getVerseTranslationEditions,
} from "@/lib/quran";

type Params = { params: Promise<{ slug: string; surahId: string }> };

export async function GET(_req: Request, { params }: Params) {
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

  return NextResponse.json(translation, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
