import type { TashkeelLevel } from "@/lib/lughawi/types";

/** Tiny lexicon for demo-quality local tashkeel when AI is unavailable. */
const LEXICON: Record<string, string> = {
  بسم: "بِسْمِ",
  الله: "اللَّهِ",
  الرحمن: "الرَّحْمَٰنِ",
  الرحيم: "الرَّحِيمِ",
  الحمد: "الْحَمْدُ",
  رب: "رَبِّ",
  العالمين: "الْعَالَمِينَ",
  أنا: "أَنَا",
  إلى: "إِلَى",
  على: "عَلَى",
  من: "مِنْ",
  في: "فِي",
  هذا: "هَذَا",
  هذه: "هَذِهِ",
  المدرسة: "الْمَدْرَسَةِ",
  لغة: "لُغَةٌ",
  العربية: "الْعَرَبِيَّةِ",
  كتاب: "كِتَابٌ",
  طالب: "طَالِبٌ",
};

function stripMarks(s: string): string {
  return s.replace(/[\u064B-\u065F\u0670]/g, "");
}

function endingsOnly(word: string, full: string): string {
  const bare = stripMarks(word);
  const marks = full.match(/[\u064B-\u065F\u0670]+$/);
  if (!marks) return bare;
  return bare + marks[0];
}

function mandatoryOnly(full: string): string {
  // Keep fatha/damma/kasra/shadda/sukun; drop tanween for "mandatory" feel
  return full.replace(/[\u064B\u064C\u064D]/g, "");
}

function partialOnly(full: string): string {
  // Keep shadda + tanween mainly
  const bare = stripMarks(full);
  const shaddaTanween = full.match(/[\u0651\u064B-\u064D]/g);
  if (!shaddaTanween) return bare;
  // naive: append collected marks at end
  return bare + shaddaTanween.join("");
}

export function applyLocalTashkeel(
  text: string,
  level: TashkeelLevel = "full",
): { result: string; covered: number; total: number } {
  const parts = text.split(/(\s+)/);
  let covered = 0;
  let total = 0;
  const out = parts.map((part) => {
    if (/^\s+$/.test(part) || !part) return part;
    total += 1;
    const key = stripMarks(part);
    const full = LEXICON[key];
    if (!full) return part;
    covered += 1;
    if (level === "full") return full;
    if (level === "endings") return endingsOnly(part, full);
    if (level === "mandatory") return mandatoryOnly(full);
    return partialOnly(full);
  });
  return { result: out.join(""), covered, total };
}
