/**
 * Alignment helpers shared with scripts/lib/quran-words-core.mjs (kept in sync).
 * Used by Vitest — the import scripts use the .mjs copy.
 */

export function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

export function makeWordId(
  surahId: number,
  verse: number,
  position: number,
): string {
  return `W:${pad3(surahId)}:${pad3(verse)}:${pad3(position)}`;
}

export function normalizeArabic(text: string): string {
  return String(text || "")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "")
    .trim();
}

export function isAyahRow(word: string, url = ""): boolean {
  const w = String(word || "").trim();
  if (/^آية\s*رقم/.test(w)) return true;
  try {
    const raw = decodeURIComponent(String(url || ""));
    if (/\/آية\/\d+:\d+/.test(raw)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function isOrnamentRow(word: string, quality = ""): boolean {
  const w = String(word || "").trim();
  if (!w) return true;
  if (w === "۞" || w === "۩" || /^[۞۩]+$/.test(w)) return true;
  if (quality === "sajda-marker") return true;
  return false;
}

export function parseAyahFromUrl(url: string): number | null {
  try {
    const raw = decodeURIComponent(String(url || ""));
    const m = raw.match(/آية\/\d+:(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

type QwRow = {
  word: string;
  url?: string;
  title?: string;
  sense?: string;
  lexiconKey?: string | null;
  quality?: string | null;
};

export function assignAyahNumbers(
  rows: QwRow[],
  { trustTitleAyah = false }: { trustTitleAyah?: boolean } = {},
): (QwRow & { ayah: number })[] {
  let current = 1;
  const out: (QwRow & { ayah: number })[] = [];
  for (const row of rows) {
    if (isAyahRow(row.word, row.url)) {
      const fromUrl = parseAyahFromUrl(row.url || "");
      if (fromUrl) current = fromUrl + 1;
      else current += 1;
      continue;
    }
    if (isOrnamentRow(row.word, row.quality || "")) continue;
    let ayah = current;
    if (trustTitleAyah && row.title) {
      const m = String(row.title).match(/آية\s*رقم\s*(\d+)/);
      if (m) {
        ayah = Number(m[1]);
        current = ayah;
      }
    }
    out.push({ ...row, ayah });
  }
  return out;
}

export function alignSurahWords(opts: {
  surahId: number;
  arabyaWords: { verse: number; position: number; text: string }[];
  qwWords: (QwRow & { ayah: number })[];
}): {
  aligned: {
    wordId: string;
    sense: string;
    lexiconKey: string | null;
    url: string | null;
  }[];
  report: { matched: number; mismatchCount: number };
} {
  const { surahId, arabyaWords, qwWords } = opts;
  const byAyah = new Map<number, typeof arabyaWords>();
  for (const w of arabyaWords) {
    if (!byAyah.has(w.verse)) byAyah.set(w.verse, []);
    byAyah.get(w.verse)!.push(w);
  }
  const qwByAyah = new Map<number, typeof qwWords>();
  for (const w of qwWords) {
    if (!qwByAyah.has(w.ayah)) qwByAyah.set(w.ayah, []);
    qwByAyah.get(w.ayah)!.push(w);
  }

  const aligned: {
    wordId: string;
    sense: string;
    lexiconKey: string | null;
    url: string | null;
  }[] = [];
  let matched = 0;
  let mismatchCount = 0;

  for (const [ayah, aWords] of byAyah) {
    const qWords = (qwByAyah.get(ayah) ?? []).filter(
      (w) => !isOrnamentRow(w.word, w.quality || ""),
    );
    const used = new Set<number>();
    for (const aw of aWords) {
      const target = normalizeArabic(aw.text);
      let bestIdx = -1;
      for (let i = 0; i < qWords.length; i++) {
        if (used.has(i)) continue;
        if (normalizeArabic(qWords[i].word) === target) {
          bestIdx = i;
          break;
        }
      }
      if (bestIdx === -1 && qWords.length === aWords.length) {
        const i = aw.position - 1;
        if (i >= 0 && i < qWords.length && !used.has(i)) bestIdx = i;
      }
      if (bestIdx === -1) {
        mismatchCount += 1;
        continue;
      }
      used.add(bestIdx);
      const qw = qWords[bestIdx];
      aligned.push({
        wordId: makeWordId(surahId, ayah, aw.position),
        sense: (qw.sense || "").trim(),
        lexiconKey: qw.lexiconKey ?? null,
        url: qw.url ?? null,
      });
      matched += 1;
    }
    if (qWords.length !== aWords.length) mismatchCount += 1;
  }

  return { aligned, report: { matched, mismatchCount } };
}
