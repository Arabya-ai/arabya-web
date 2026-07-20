import { NextResponse } from "next/server";
import { getIrab, getSurah, searchAyahs } from "@/lib/quran";
import { makeWordId } from "@/lib/word-id";

/**
 * Lightweight retrieval for future RAG / study assistant.
 * Returns relevant ayahs + optional morphology snippets from local JSON.
 * No LLM calls — pure retrieval over Git-hosted data.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json(
      { error: "query too short", hits: [] },
      { status: 400 },
    );
  }

  const hits = await searchAyahs(q, 8);
  const enriched = await Promise.all(
    hits.map(async (hit) => {
      const surah = await getSurah(hit.surahId);
      const irab = await getIrab(hit.surahId);
      const verse = surah?.verses.find((v) => v.verseNumber === hit.verse);
      const irabVerse = irab?.verses.find((v) => v.verseNumber === hit.verse);
      const words =
        verse?.words.map((w) => {
          const morph = irabVerse?.words.find((x) => x.position === w.position);
          return {
            wordId:
              morph?.wordId ??
              makeWordId(hit.surahId, hit.verse, w.position),
            text: w.text,
            meaningAr: w.meaningAr ?? null,
            meaning: w.meaning,
            root: morph?.root ?? null,
            lemma: morph?.lemma ?? null,
            irab: morph?.irab ?? null,
          };
        }) ?? [];

      return {
        ...hit,
        words,
        context:
          `آية ${hit.key}: ${hit.text}` +
          (words[0]?.irab ? ` | إعراب أول كلمة: ${words[0].irab}` : ""),
      };
    }),
  );

  return NextResponse.json(
    {
      query: q,
      mode: "local-retrieval",
      note: "Retrieval only — attach an LLM later for full RAG answers.",
      hits: enriched,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    },
  );
}
