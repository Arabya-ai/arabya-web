import { NextResponse } from "next/server";
import {
  getIrabClaimsForAyah,
  getIrabClaimsForWord,
} from "@/lib/irab-claims";
import { parseWordId } from "@/lib/word-id";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wordId = url.searchParams.get("wordId")?.trim();
  const surahRaw = url.searchParams.get("surah");
  const verseRaw = url.searchParams.get("verse");

  if (wordId) {
    if (!parseWordId(wordId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid wordId" },
        { status: 400 },
      );
    }
    const claims = await getIrabClaimsForWord(wordId);
    return NextResponse.json({ ok: true, wordId, claims });
  }

  if (surahRaw != null && verseRaw != null) {
    const surahId = Number(surahRaw);
    const verse = Number(verseRaw);
    if (
      !Number.isInteger(surahId) ||
      surahId < 1 ||
      surahId > 114 ||
      !Number.isInteger(verse) ||
      verse < 1
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid surah or verse" },
        { status: 400 },
      );
    }
    const bundle = await getIrabClaimsForAyah(surahId, verse);
    const words: Record<string, typeof bundle.byWordId extends Map<string, infer V> ? V : never> =
      {};
    for (const [id, list] of bundle.byWordId) {
      words[id] = list;
    }
    return NextResponse.json({
      ok: true,
      surahId,
      verse,
      words,
      ayahLevel: bundle.ayahLevel,
    });
  }

  return NextResponse.json(
    { ok: false, error: "Provide wordId or surah+verse" },
    { status: 400 },
  );
}
