import {
  getIrab,
  getSurah,
  getTafsir,
  normalizeArabicSearch,
  searchAyahs,
} from "@/lib/quran";
import { makeWordId } from "@/lib/word-id";
import { shortIrabGlance } from "@/lib/irab-narrative";
import { narrativeIrab } from "@/lib/irab-narrative";
import { toArabicNumerals } from "@/lib/format";

export type StudyWord = {
  wordId: string;
  text: string;
  meaningAr?: string | null;
  meaning?: string;
  root?: string | null;
  lemma?: string | null;
  irab?: string | null;
  matched?: boolean;
};

export type StudyHit = {
  key: string;
  surahId: number;
  verse: number;
  page: number;
  text: string;
  nameAr: string;
  score: number;
  matchedWords: StudyWord[];
  words: StudyWord[];
  tafsirSnippet: string | null;
  explain: string;
  context?: string;
};

function clipText(text: string, max = 180): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function scoreHit(
  qNorm: string,
  hitTextNorm: string,
  matchedCount: number,
  wordCount: number,
): number {
  let score = matchedCount * 12;
  if (hitTextNorm.includes(` ${qNorm} `) || hitTextNorm.startsWith(`${qNorm} `)) {
    score += 40;
  } else if (hitTextNorm.includes(qNorm)) {
    score += 18;
  }
  if (wordCount > 0) {
    score += Math.round((matchedCount / wordCount) * 20);
  }
  return score;
}

function buildExplain(
  query: string,
  hit: { nameAr: string; verse: number; text: string },
  matched: StudyWord[],
  tafsirSnippet: string | null,
  locale: string,
): string {
  const parts: string[] = [];
  if (locale === "en") {
    parts.push(
      `In ${hit.nameAr} ayah ${hit.verse}: «${clipText(hit.text, 90)}»`,
    );
    if (matched.length) {
      const gloss = matched
        .slice(0, 4)
        .map((w) => {
          const sense = w.meaning || w.meaningAr || w.lemma || w.text;
          return `${w.text} ← ${sense}`;
        })
        .join("; ");
      parts.push(`Words linked to «${query}»: ${gloss}.`);
    } else {
      parts.push(`The phrase appears in the ayah text.`);
    }
    if (tafsirSnippet) {
      parts.push(`From Al-Muyassar tafsir: ${clipText(tafsirSnippet, 140)}`);
    }
  } else {
    parts.push(
      `في ${hit.nameAr} الآية ${hit.verse}: «${clipText(hit.text, 90)}»`,
    );
    if (matched.length) {
      const gloss = matched
        .slice(0, 4)
        .map((w) => {
          const sense = w.meaningAr || w.lemma || w.meaning || w.text;
          return `${w.text} ← ${sense}`;
        })
        .join("؛ ");
      parts.push(`كلمات مرتبطة بـ«${query}»: ${gloss}.`);
    } else {
      parts.push(`وردت العبارة ضمن نص الآية.`);
    }
    if (tafsirSnippet) {
      parts.push(`من التفسير الميسّر: ${clipText(tafsirSnippet, 140)}`);
    }
  }

  return parts.join(" ");
}

/**
 * Local study retrieval + brief explanation (no LLM).
 * Combines search hits, morphology, Arabic senses, and Muyassar snippet.
 */
export async function runStudyQuery(
  query: string,
  options: number | { limit?: number; locale?: string } = 10,
): Promise<{
  query: string;
  mode: string;
  note: string;
  brief: string;
  hits: StudyHit[];
  total: number;
}> {
  const limit =
    typeof options === "number"
      ? options
      : Math.max(1, Math.min(options.limit ?? 10, 100));
  const locale =
    typeof options === "number"
      ? "ar"
      : options.locale === "en"
        ? "en"
        : "ar";
  const q = query.trim();
  const qNorm = normalizeArabicSearch(q);
  const { hits: rawHits, total } = await searchAyahs(q, {
    limit: Math.min(Math.max(limit, 16), 100),
  });

  const enriched: StudyHit[] = [];

  for (const hit of rawHits) {
    const [surah, irab, tafsir] = await Promise.all([
      getSurah(hit.surahId),
      getIrab(hit.surahId),
      getTafsir("muyassar", hit.surahId),
    ]);

    const verse = surah?.verses.find((v) => v.verseNumber === hit.verse);
    const irabVerse = irab?.verses.find((v) => v.verseNumber === hit.verse);
    const tafsirVerse = tafsir?.verses.find((v) => v.verseNumber === hit.verse);
    const tafsirSnippet = tafsirVerse?.text
      ? clipText(tafsirVerse.text, 220)
      : null;

    const words: StudyWord[] =
      verse?.words
        .filter((w) => !w.charType || w.charType === "word")
        .map((w) => {
          const morph = irabVerse?.words.find((x) => x.position === w.position);
          const textNorm = normalizeArabicSearch(w.text);
          const senseNorm = normalizeArabicSearch(w.meaningAr || "");
          const lemmaNorm = normalizeArabicSearch(morph?.lemma || "");
          const matched =
            qNorm.length >= 2 &&
            (textNorm.includes(qNorm) ||
              senseNorm.includes(qNorm) ||
              lemmaNorm.includes(qNorm) ||
              (morph?.root && normalizeArabicSearch(morph.root).includes(qNorm)));

          return {
            wordId:
              morph?.wordId ??
              makeWordId(hit.surahId, hit.verse, w.position),
            text: w.text,
            meaningAr: w.meaningAr ?? null,
            meaning: w.meaning,
            root: morph?.root ?? null,
            lemma: morph?.lemma ?? null,
            irab:
              narrativeIrab(morph ?? null, locale) ||
              shortIrabGlance(morph ?? null, locale) ||
              null,
            matched: Boolean(matched),
          };
        }) ?? [];

    const matchedWords = words.filter((w) => w.matched);
    const hitTextNorm = ` ${normalizeArabicSearch(hit.text)} `;
    const score = scoreHit(qNorm, hitTextNorm, matchedWords.length, words.length);
    const explain = buildExplain(q, hit, matchedWords, tafsirSnippet, locale);

    enriched.push({
      ...hit,
      score,
      words,
      matchedWords,
      tafsirSnippet,
      explain,
      context: explain,
    });
  }

  enriched.sort((a, b) => b.score - a.score);
  const hits = enriched.slice(0, limit);

  const countLabel = locale === "en" ? String(total) : toArabicNumerals(total);
  const brief =
    hits.length === 0
      ? locale === "en"
        ? `No matching ayahs found for «${q}» in the local index.`
        : `لم يُعثر على آيات مطابقة لـ«${q}» في الفهرس المحلي.`
      : locale === "en"
        ? [
            `Study results for «${q}»: ${countLabel} matching ayahs.`,
            hits[0]
              ? `Closest match: ${hits[0].nameAr} ${hits[0].verse}.`
              : "",
            "Explanation uses Arabic word senses + short iʿrāb + an Al-Muyassar snippet — no language model.",
          ]
            .filter(Boolean)
            .join(" ")
        : [
            `نتائج دراسية لـ«${q}»: ${countLabel} آية مطابقة.`,
            hits[0]
              ? `أقرب مطابقة: ${hits[0].nameAr} ${hits[0].verse}.`
              : "",
            "الشرح مبني على المعنى العربي للكلمات + إعراب موجز + مقتطف من التفسير الميسّر — بلا نموذج لغوي.",
          ]
            .filter(Boolean)
            .join(" ");

  return {
    query: q,
    mode: "local-study-brief",
    note:
      locale === "en"
        ? "Local retrieval and explanation from Arabya data (sense + morphology + Al-Muyassar)."
        : "استرجاع وشرح محلي من بيانات عربْية (معنى + صرف + الميسّر).",
    brief,
    hits,
    total,
  };
}
