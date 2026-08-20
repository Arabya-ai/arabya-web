import {
  extractNarratorEnFromText,
  extractNarratorsFromArabic,
  HADITH_ENG_EDITION,
  hadithCdnEditionUrl,
} from "@/lib/hadith-isnad-parse";

export type HadithIsnadEntry = {
  narrators: string[];
  narratorEn?: string;
  source: string;
};

const engCache = new Map<string, string | null>();

async function fetchNarratorEnRemote(
  collection: string,
  number: number,
): Promise<string | undefined> {
  const edition = HADITH_ENG_EDITION[collection];
  if (!edition) return undefined;
  const key = `${edition}:${number}`;
  if (engCache.has(key)) {
    return engCache.get(key) ?? undefined;
  }
  const url = hadithCdnEditionUrl(edition, number);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "arabya-web-isnad-live",
      },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      engCache.set(key, null);
      return undefined;
    }
    const data = (await res.json()) as {
      hadiths?: { text?: string }[];
    };
    const text = data.hadiths?.[0]?.text ?? "";
    const narratorEn = extractNarratorEnFromText(text);
    engCache.set(key, narratorEn ?? null);
    return narratorEn;
  } catch {
    engCache.set(key, null);
    return undefined;
  }
}

/**
 * Build isnād fields live from the local Arabic matn + optional English
 * lead-in fetched from fawazahmed0 CDN (not vendored into Git).
 */
export async function getHadithIsnad(
  collection: string,
  number: number,
  arabic: string,
): Promise<HadithIsnadEntry | null> {
  const narrators = extractNarratorsFromArabic(arabic || "");
  const narratorEn = await fetchNarratorEnRemote(collection, number);
  if (!narrators.length && !narratorEn) return null;
  return {
    narrators,
    narratorEn,
    source: narrators.length
      ? "live-matn-parse+cdn-eng"
      : "cdn-eng",
  };
}
