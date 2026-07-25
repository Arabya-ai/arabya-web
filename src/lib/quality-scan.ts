import { access, readFile } from "fs/promises";
import path from "path";

export type QualityQueueItem = {
  id: string;
  title: string;
  titleEn: string;
  priority: "high" | "medium" | "low";
  surahHint: string;
  note: string;
  noteEn: string;
};

export type QualityCoverage = {
  totalWords: number;
  wordsWithMeaningAr: number;
  meaningArPct: number;
  irabSurahsPresent: number;
  irabVerseAlignIssues: number;
  irabMissingWordIds: number;
  worstMeaningSurahs: {
    id: number;
    missing: number;
    total: number;
    pct: number;
  }[];
};

export type QualityScanResult = {
  items: QualityQueueItem[];
  coverage: QualityCoverage;
};

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * فحص حقيقي لسلامة بيانات القرآن — نفس منطق validate-data تقريبًا.
 * يُستخدم في الاستوديو بدون عناصر وهمية.
 */
export async function scanQualityIssues(
  dataRoot = path.join(process.cwd(), "data"),
): Promise<QualityScanResult> {
  const items: QualityQueueItem[] = [];
  let seq = 0;
  const push = (
    priority: QualityQueueItem["priority"],
    title: string,
    titleEn: string,
    surahHint: string,
    note: string,
    noteEn: string,
  ) => {
    seq += 1;
    items.push({
      id: `qs_${seq}_${Date.now().toString(36)}`,
      title,
      titleEn,
      priority,
      surahHint,
      note,
      noteEn,
    });
  };

  let totalWords = 0;
  let wordsWithMeaningAr = 0;
  let irabSurahsPresent = 0;
  let irabVerseAlignIssues = 0;
  let irabMissingWordIds = 0;
  const meaningBySurah: {
    id: number;
    missing: number;
    total: number;
    pct: number;
  }[] = [];

  for (let id = 1; id <= 114; id++) {
    const surahPath = path.join(dataRoot, "surahs", `${id}.json`);
    const irabPath = path.join(dataRoot, "irab", `${id}.json`);
    if (!(await exists(surahPath))) {
      push(
        "high",
        `سورة ${id} مفقودة`,
        `Surah ${id} missing`,
        `سورة ${id}`,
        "ملف surahs غير موجود",
        "surahs file is missing",
      );
      continue;
    }
    if (!(await exists(irabPath))) {
      push(
        "high",
        `إعراب سورة ${id} مفقود`,
        `Iʿrāb for surah ${id} missing`,
        `سورة ${id}`,
        "ملف irab غير موجود",
        "irab file is missing",
      );
      continue;
    }
    irabSurahsPresent += 1;

    const surah = JSON.parse(await readFile(surahPath, "utf8")) as {
      verses?: {
        verseNumber: number;
        words?: { meaningAr?: string; charType?: string }[];
      }[];
    };
    const irab = JSON.parse(await readFile(irabPath, "utf8")) as {
      verses?: {
        verseNumber: number;
        words?: { wordId?: string }[];
      }[];
    };

    const surahVerses = new Map(
      (surah.verses ?? []).map((v) => [
        v.verseNumber,
        (v.words ?? []).filter((w) => !w.charType || w.charType === "word"),
      ]),
    );
    const irabVerses = new Map(
      (irab.verses ?? []).map((v) => [v.verseNumber, v.words ?? []]),
    );

    let missingMeaning = 0;
    let surahWordTotal = 0;
    let missingWordId = 0;

    for (const [vn, words] of surahVerses) {
      const iw = irabVerses.get(vn);
      if (!iw) {
        irabVerseAlignIssues += 1;
        push(
          "high",
          `آية بلا إعراب`,
          `Ayah without iʿrāb`,
          `${id}:${vn}`,
          `سورة ${id} آية ${vn} غير موجودة في ملف الإعراب`,
          `Surah ${id} ayah ${vn} is missing from the iʿrāb file`,
        );
        continue;
      }
      if (iw.length !== words.length) {
        irabVerseAlignIssues += 1;
        push(
          "medium",
          `اختلاف عدد الكلمات`,
          `Word count mismatch`,
          `${id}:${vn}`,
          `سورة=${words.length} · إعراب=${iw.length}`,
          `surah=${words.length} · iʿrāb=${iw.length}`,
        );
      }
      for (const w of words) {
        surahWordTotal += 1;
        totalWords += 1;
        if (w.meaningAr) {
          wordsWithMeaningAr += 1;
        } else {
          missingMeaning += 1;
        }
      }
      for (const w of iw) {
        if (!w.wordId) {
          missingWordId += 1;
          irabMissingWordIds += 1;
        }
      }
    }

    if (surahWordTotal > 0) {
      meaningBySurah.push({
        id,
        missing: missingMeaning,
        total: surahWordTotal,
        pct: Math.round((missingMeaning / surahWordTotal) * 1000) / 10,
      });
    }

    if (missingMeaning > 0) {
      const missingPct =
        surahWordTotal > 0 ? missingMeaning / surahWordTotal : 0;
      push(
        missingPct > 0.3 ? "medium" : "low",
        `كلمات بلا meaningAr`,
        `Words without meaningAr`,
        `سورة ${id}`,
        `${missingMeaning} كلمة بدون معنى عربي دراسي`,
        `${missingMeaning} words without Arabic study gloss`,
      );
    }
    if (missingWordId > 0) {
      push(
        "high",
        `كلمات إعراب بلا wordId`,
        `Iʿrāb words without wordId`,
        `سورة ${id}`,
        `${missingWordId} كلمة في الإعراب بدون wordId`,
        `${missingWordId} iʿrāb words missing wordId`,
      );
    }
  }

  const mushafPath = path.join(dataRoot, "mushaf-index.json");
  if (!(await exists(mushafPath))) {
    push(
      "high",
      "فهرس المصحف مفقود",
      "Mushaf index missing",
      "mushaf",
      "mushaf-index.json غير موجود",
      "mushaf-index.json is missing",
    );
  } else {
    const mushaf = JSON.parse(await readFile(mushafPath, "utf8")) as {
      totalPages?: number;
    };
    if (mushaf.totalPages !== 604) {
      push(
        "high",
        "عدد صفحات المصحف غير 604",
        "Mushaf page count is not 604",
        "mushaf",
        `totalPages=${mushaf.totalPages}`,
        `totalPages=${mushaf.totalPages}`,
      );
    }
  }

  for (const name of ["search-index.json", "roots-index.json"] as const) {
    if (!(await exists(path.join(dataRoot, name)))) {
      push(
        "medium",
        `ملف فهرس مفقود`,
        `Index file missing`,
        name,
        `${name} غير موجود`,
        `${name} is missing`,
      );
    }
  }

  const meaningArPct =
    totalWords > 0
      ? Math.round((wordsWithMeaningAr / totalWords) * 1000) / 10
      : 0;

  const worstMeaningSurahs = meaningBySurah
    .filter((s) => s.missing > 0)
    .sort((a, b) => b.pct - a.pct || b.missing - a.missing)
    .slice(0, 10);

  return {
    items,
    coverage: {
      totalWords,
      wordsWithMeaningAr,
      meaningArPct,
      irabSurahsPresent,
      irabVerseAlignIssues,
      irabMissingWordIds,
      worstMeaningSurahs,
    },
  };
}
