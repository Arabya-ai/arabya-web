/**
 * Shared helpers for importing quran-words.com scrapes into Arabya word-senses.
 */

export function pad3(n) {
  return String(n).padStart(3, "0");
}

export function makeWordId(surahId, verse, position) {
  return `W:${pad3(surahId)}:${pad3(verse)}:${pad3(position)}`;
}

/** Strip tashkeel / tatweel for alignment compares. */
export function normalizeArabic(text) {
  return String(text || "")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "")
    .trim();
}

export function isAyahRow(word, url = "") {
  const w = String(word || "").trim();
  // Summary rows look like «آية رقم ١٠٦» (not the lexical token آية).
  if (/^آية\s*رقم/.test(w)) return true;
  // Word rows can be lemma «آية» with URL /كلمة/آية/123 — only treat true
  // ayah summary links: /آية/{surah}:{verse}
  try {
    const raw = decodeURIComponent(String(url || ""));
    if (/\/آية\/\d+:\d+/.test(raw)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** Hizb/sajda ornaments and other non-token rows in the quran-words table. */
export function isOrnamentRow(word, quality = "") {
  const w = String(word || "").trim();
  if (!w) return true;
  if (w === "۞" || w === "۩" || /^[۞۩]+$/.test(w)) return true;
  if (quality === "sajda-marker") return true;
  return false;
}

export function parseAyahFromTitle(title) {
  const m = String(title || "").match(/آية\s*رقم\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

export function parseAyahFromUrl(url) {
  const raw = decodeURIComponent(String(url || ""));
  const m = raw.match(/آية\/\d+:(\d+)/) || raw.match(/\/(\d+):(\d+)\s*$/);
  if (!m) return null;
  return Number(m[1] ?? m[2]);
}

export function parseLemmaFromUrl(url) {
  const raw = decodeURIComponent(String(url || ""));
  const m = raw.match(/\/كلمة\/([^/]+)\/(\d+)/);
  if (!m) return null;
  return { lemma: m[1], siteId: Number(m[2]) };
}

export function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Assign ayah numbers to word rows using titles/URLs and ayah-marker rows.
 * @param {{ word: string, url?: string, title?: string }[]} rows
 */
/**
 * Assign ayah numbers using marker rows (`آية رقم ن` / `/آية/s:v`).
 * Optional per-row `title` ayah is used only when `trustTitleAyah` is true
 * (owner scrape has occurrence-specific titles; shared lemma fetches do not).
 */
export function assignAyahNumbers(rows, { trustTitleAyah = false } = {}) {
  let current = 1;
  const out = [];
  for (const row of rows) {
    if (isAyahRow(row.word, row.url)) {
      const fromUrl = parseAyahFromUrl(row.url);
      if (fromUrl) current = fromUrl + 1;
      else current += 1;
      continue;
    }
    if (isOrnamentRow(row.word, row.quality)) continue;
    let ayah = current;
    if (trustTitleAyah) {
      const fromTitle = parseAyahFromTitle(row.title);
      if (fromTitle) {
        ayah = fromTitle;
        current = fromTitle;
      }
    }
    out.push({ ...row, ayah });
  }
  return out;
}

/**
 * Align quran-words word rows to Arabya surah words.
 * Returns { aligned: [{ wordId, sense, lexiconKey, url, quality }], report }
 */
export function alignSurahWords({
  surahId,
  arabyaWords,
  qwWords,
  preferredQualities = null,
}) {
  const byAyah = new Map();
  for (const w of arabyaWords) {
    if (!byAyah.has(w.verse)) byAyah.set(w.verse, []);
    byAyah.get(w.verse).push(w);
  }

  const qwByAyah = new Map();
  for (const w of qwWords) {
    if (!qwByAyah.has(w.ayah)) qwByAyah.set(w.ayah, []);
    qwByAyah.get(w.ayah).push(w);
  }

  const aligned = [];
  const mismatches = [];
  let matched = 0;
  let skippedQuality = 0;

  for (const [ayah, aWords] of byAyah) {
    const qWords = (qwByAyah.get(ayah) ?? []).filter(
      (w) => !isOrnamentRow(w.word, w.quality),
    );
    const used = new Set();

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
      // Soft match: ignore hamza / small orthography diffs
      if (bestIdx === -1) {
        const softTarget = target.replace(/[ءؤئ]/g, "");
        for (let i = 0; i < qWords.length; i++) {
          if (used.has(i)) continue;
          const soft = normalizeArabic(qWords[i].word).replace(/[ءؤئ]/g, "");
          if (soft && soft === softTarget) {
            bestIdx = i;
            break;
          }
        }
      }
      // fallback: same relative index when lengths match
      if (bestIdx === -1 && qWords.length === aWords.length) {
        const i = aw.position - 1;
        if (i >= 0 && i < qWords.length && !used.has(i)) bestIdx = i;
      }

      if (bestIdx === -1) {
        mismatches.push({
          surahId,
          ayah,
          position: aw.position,
          arabya: aw.text,
          reason: "no-qw-candidate",
        });
        continue;
      }

      used.add(bestIdx);
      const qw = qWords[bestIdx];
      if (
        preferredQualities &&
        qw.quality &&
        !preferredQualities.has(qw.quality)
      ) {
        skippedQuality += 1;
        continue;
      }

      const textMatch =
        normalizeArabic(qw.word) === normalizeArabic(aw.text);
      if (!textMatch) {
        mismatches.push({
          surahId,
          ayah,
          position: aw.position,
          arabya: aw.text,
          qw: qw.word,
          reason: "text-mismatch-fallback",
        });
      }

      aligned.push({
        wordId: makeWordId(surahId, ayah, aw.position),
        sense: (qw.sense || "").trim(),
        lexiconKey: qw.lexiconKey || null,
        url: qw.url || null,
        quality: qw.quality || null,
      });
      matched += 1;
    }

    if (qWords.length !== aWords.length) {
      mismatches.push({
        surahId,
        ayah,
        reason: "count-diff",
        arabyaCount: aWords.length,
        qwCount: qWords.length,
      });
    }
  }

  return {
    aligned,
    report: {
      surahId,
      arabyaCount: arabyaWords.length,
      qwCount: qwWords.length,
      matched,
      skippedQuality,
      mismatchCount: mismatches.length,
      mismatches: mismatches.slice(0, 40),
    },
  };
}

export function lexiconKeyFromEtymology(etymology, lemma) {
  const m = String(etymology || "").match(
    /التفسير الاشتقاقي لجذر الكلمة\s*[«"“]?([^»"”\n]+)[»"”]?/,
  );
  if (m) return m[1].trim();
  const m2 = String(etymology || "").match(/^([^\s:：]+)[:：]/);
  if (m2 && m2[1].length <= 12) return m2[1].trim();
  return lemma || null;
}

export function stripEtymologyHeading(etymology) {
  return String(etymology || "")
    .replace(/^التفسير الاشتقاقي لجذر الكلمة[^\n]*\n?/u, "")
    .trim();
}
