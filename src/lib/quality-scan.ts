import { access, readFile } from "fs/promises";
import path from "path";

export type QualityQueueItem = {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  surahHint: string;
  note: string;
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
): Promise<QualityQueueItem[]> {
  const items: QualityQueueItem[] = [];
  let seq = 0;
  const push = (
    priority: QualityQueueItem["priority"],
    title: string,
    surahHint: string,
    note: string,
  ) => {
    seq += 1;
    items.push({
      id: `qs_${seq}_${Date.now().toString(36)}`,
      title,
      priority,
      surahHint,
      note,
    });
  };

  for (let id = 1; id <= 114; id++) {
    const surahPath = path.join(dataRoot, "surahs", `${id}.json`);
    const irabPath = path.join(dataRoot, "irab", `${id}.json`);
    if (!(await exists(surahPath))) {
      push("high", `سورة ${id} مفقودة`, `سورة ${id}`, "ملف surahs غير موجود");
      continue;
    }
    if (!(await exists(irabPath))) {
      push("high", `إعراب سورة ${id} مفقود`, `سورة ${id}`, "ملف irab غير موجود");
      continue;
    }

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
    let missingWordId = 0;

    for (const [vn, words] of surahVerses) {
      const iw = irabVerses.get(vn);
      if (!iw) {
        push(
          "high",
          `آية بلا إعراب`,
          `${id}:${vn}`,
          `سورة ${id} آية ${vn} غير موجودة في ملف الإعراب`,
        );
        continue;
      }
      if (iw.length !== words.length) {
        push(
          "medium",
          `اختلاف عدد الكلمات`,
          `${id}:${vn}`,
          `سورة=${words.length} · إعراب=${iw.length}`,
        );
      }
      for (const w of words) {
        if (!w.meaningAr) missingMeaning += 1;
      }
      for (const w of iw) {
        if (!w.wordId) missingWordId += 1;
      }
    }

    if (missingMeaning > 0) {
      push(
        "low",
        `كلمات بلا meaningAr`,
        `سورة ${id}`,
        `${missingMeaning} كلمة بدون معنى عربي دراسي`,
      );
    }
    if (missingWordId > 0) {
      push(
        "high",
        `كلمات إعراب بلا wordId`,
        `سورة ${id}`,
        `${missingWordId} كلمة في الإعراب بدون wordId`,
      );
    }
  }

  const mushafPath = path.join(dataRoot, "mushaf-index.json");
  if (!(await exists(mushafPath))) {
    push("high", "فهرس المصحف مفقود", "mushaf", "mushaf-index.json غير موجود");
  } else {
    const mushaf = JSON.parse(await readFile(mushafPath, "utf8")) as {
      totalPages?: number;
    };
    if (mushaf.totalPages !== 604) {
      push(
        "high",
        "عدد صفحات المصحف غير 604",
        "mushaf",
        `totalPages=${mushaf.totalPages}`,
      );
    }
  }

  for (const name of ["search-index.json", "roots-index.json"] as const) {
    if (!(await exists(path.join(dataRoot, name)))) {
      push("medium", `ملف فهرس مفقود`, name, `${name} غير موجود`);
    }
  }

  return items;
}
