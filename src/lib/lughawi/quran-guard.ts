import { normalizeArabicForMatch, stripTashkeel } from "@/lib/lughawi/normalize";
import type { ProtectedSpan } from "@/lib/lughawi/types";

/**
 * Short, well-known ayah openings used for local protection without loading
 * the full mushaf into the proofreader hot path. Expand later via /data index.
 */
const KNOWN_AYAHS: { surah: number; ayah: number; text: string }[] = [
  { surah: 1, ayah: 1, text: "بسم الله الرحمن الرحيم" },
  { surah: 1, ayah: 2, text: "الحمد لله رب العالمين" },
  { surah: 1, ayah: 5, text: "إياك نعبد وإياك نستعين" },
  { surah: 2, ayah: 255, text: "الله لا إله إلا هو الحي القيوم" },
  { surah: 112, ayah: 1, text: "قل هو الله أحد" },
  { surah: 112, ayah: 2, text: "الله الصمد" },
  { surah: 113, ayah: 1, text: "قل أعوذ برب الفلق" },
  { surah: 114, ayah: 1, text: "قل أعوذ برب الناس" },
  { surah: 36, ayah: 1, text: "يس" },
  { surah: 55, ayah: 13, text: "فبأي آلاء ربكما تكذبان" },
];

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function searchKnownAyahs(query: string): {
  surah: number;
  ayah: number;
  text: string;
  href: string;
}[] {
  const q = normalizeArabicForMatch(query);
  if (q.length < 2) return [];
  return KNOWN_AYAHS.filter((a) =>
    normalizeArabicForMatch(a.text).includes(q),
  ).map((a) => ({
    ...a,
    href: `/ayah/${a.surah}/${a.ayah}`,
  }));
}

/** Find protected Quran spans in original text (display offsets). */
export function findProtectedQuranSpans(text: string): ProtectedSpan[] {
  const spans: ProtectedSpan[] = [];
  const plain = stripTashkeel(text);
  const plainNorm = normalizeArabicForMatch(plain);

  for (const ayah of KNOWN_AYAHS) {
    const needle = normalizeArabicForMatch(ayah.text);
    if (needle.length < 2) continue;
    let from = 0;
    while (from < plainNorm.length) {
      const idx = plainNorm.indexOf(needle, from);
      if (idx < 0) break;
      // Map approx: use stripTashkeel index on `plain` then project to `text`
      const plainIdx = mapNormToPlain(plain, plainNorm, idx);
      const start = mapPlainToOriginal(text, plainIdx);
      const end = mapPlainToOriginal(text, plainIdx + stripTashkeel(ayah.text).length);
      if (
        start >= 0 &&
        end > start &&
        !spans.some((s) => overlaps(s.start, s.end, start, end))
      ) {
        spans.push({
          start,
          end,
          reason: "quran",
          surah: ayah.surah,
          ayah: ayah.ayah,
          href: `/ayah/${ayah.surah}/${ayah.ayah}`,
        });
      }
      from = idx + needle.length;
    }
  }

  return spans.sort((a, b) => a.start - b.start);
}

export function isInsideProtected(
  start: number,
  end: number,
  spans: ProtectedSpan[],
): boolean {
  return spans.some((s) => overlaps(s.start, s.end, start, end));
}

function mapNormToPlain(plain: string, plainNorm: string, normIdx: number): number {
  // plainNorm is derived from plain with char folding; lengths usually match
  // after strip — walk plain chars counting normalized length.
  let n = 0;
  for (let i = 0; i < plain.length; i++) {
    if (n === normIdx) return i;
    const ch = plain[i]!;
    const folded = normalizeArabicForMatch(ch);
    if (folded.length) n += folded.length;
  }
  return Math.min(normIdx, plain.length);
}

function mapPlainToOriginal(original: string, plainOffset: number): number {
  let plainCount = 0;
  for (let i = 0; i < original.length; i++) {
    if (plainCount === plainOffset) return i;
    const ch = original[i]!;
    if (!/[\u064B-\u065F\u0670\u0640]/.test(ch)) plainCount += 1;
  }
  return original.length;
}
