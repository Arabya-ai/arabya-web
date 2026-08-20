/**
 * Eloquence / quality score — measurable signals only (honest, not marketing magic).
 * 0–100: higher = cleaner MSA surface form.
 */

export interface EloquenceBreakdown {
  score: number;
  signals: {
    spacing: number;
    punctuation: number;
    repetition: number;
    lengthBalance: number;
    editBurden: number;
  };
  summaryAr: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Score a text; optional editCount from latest proofread worsens editBurden. */
export function scoreEloquence(
  text: string,
  editCount = 0,
): EloquenceBreakdown {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      score: 0,
      signals: {
        spacing: 0,
        punctuation: 0,
        repetition: 0,
        lengthBalance: 0,
        editBurden: 0,
      },
      summaryAr: "لا نص للتقييم.",
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordN = words.length;

  // Spacing: penalize double spaces / leading-trailing oddities already trimmed
  const doubleSpaces = (trimmed.match(/ {2,}/g) ?? []).length;
  const spacing = clamp(100 - doubleSpaces * 18, 0, 100);

  // Punctuation: reward Arabic comma/period presence on longer texts; penalize Latin ? mixed oddly
  const hasArabicPunct = /[،؛؟.!…]/.test(trimmed);
  const latinQ = (trimmed.match(/\?/g) ?? []).length;
  const arabicQ = (trimmed.match(/؟/g) ?? []).length;
  let punctuation = wordN < 8 ? 80 : hasArabicPunct ? 92 : 55;
  if (latinQ > 0 && arabicQ === 0) punctuation -= 15;
  punctuation = clamp(punctuation, 0, 100);

  // Repetition: same token ≥3 times in short window
  const freq = new Map<string, number>();
  for (const w of words) {
    const k = w.replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, "");
    if (k.length < 2) continue;
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  let heavy = 0;
  for (const n of freq.values()) {
    if (n >= 4) heavy += 1;
  }
  const repetition = clamp(100 - heavy * 22, 0, 100);

  // Length balance: average sentence length (words)
  const sentences = trimmed.split(/[.!?؟۔]+/).filter((s) => s.trim());
  const avg =
    sentences.length > 0
      ? wordN / sentences.length
      : wordN;
  let lengthBalance = 90;
  if (avg > 40) lengthBalance = 55;
  else if (avg > 28) lengthBalance = 70;
  else if (avg < 3 && wordN > 12) lengthBalance = 65;
  lengthBalance = clamp(lengthBalance, 0, 100);

  // Edit burden from latest proofread (density)
  const density = wordN > 0 ? editCount / wordN : 0;
  const editBurden = clamp(100 - density * 220, 0, 100);

  const score = Math.round(
    spacing * 0.15 +
      punctuation * 0.2 +
      repetition * 0.2 +
      lengthBalance * 0.2 +
      editBurden * 0.25,
  );

  let summaryAr = "نص متماسك نسبيًا.";
  if (score >= 85) summaryAr = "جودة سطحية عالية — صقل خفيف إن وُجد.";
  else if (score >= 70) summaryAr = "جودة جيدة مع مجال لتحسين الأسلوب أو الترقيم.";
  else if (score >= 50) summaryAr = "تحتاج مراجعة: تكرار أو ترقيم أو أخطاء ملحوظة.";
  else summaryAr = "نص يحتاج تدقيقًا واضحًا قبل النشر.";

  return {
    score,
    signals: { spacing, punctuation, repetition, lengthBalance, editBurden },
    summaryAr,
  };
}
