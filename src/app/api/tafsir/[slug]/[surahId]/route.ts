import { NextResponse } from "next/server";
import { getTafsir, getTafsirSources } from "@/lib/quran";

type Params = { params: Promise<{ slug: string; surahId: string }> };

export async function GET(_req: Request, { params }: Params) {
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

  return NextResponse.json(tafsir, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
