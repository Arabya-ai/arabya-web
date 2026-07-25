import type { IrabWord } from "@/lib/types";
import { formatPosLabels, labelPosCode } from "@/lib/morph-labels";

type Locale = "ar" | "en";

function asLocale(locale?: string): Locale {
  return locale === "en" ? "en" : "ar";
}

const CASE_LABEL: Record<string, { ar: string; en: string }> = {
  NOM: { ar: "مرفوع", en: "nominative" },
  ACC: { ar: "منصوب", en: "accusative" },
  GEN: { ar: "مجرور", en: "genitive" },
};

const TENSE_LABEL: Record<string, { ar: string; en: string }> = {
  PERF: { ar: "ماضٍ", en: "perfect" },
  IMPF: { ar: "مضارع", en: "imperfect" },
  IMPV: { ar: "أمر", en: "imperative" },
};

const MOOD_LABEL: Record<string, { ar: string; en: string }> = {
  "MOOD:IND": { ar: "مرفوع", en: "indicative" },
  "MOOD:SUBJ": { ar: "منصوب", en: "subjunctive" },
  "MOOD:JUS": { ar: "مجزوم", en: "jussive" },
  IND: { ar: "مرفوع", en: "indicative" },
  SUBJ: { ar: "منصوب", en: "subjunctive" },
  JUS: { ar: "مجزوم", en: "jussive" },
};

const FORM_LABEL: Record<string, { ar: string; en: string }> = {
  ACT_PCPL: { ar: "اسم فاعل", en: "active participle" },
  PASS_PCPL: { ar: "اسم مفعول", en: "passive participle" },
  VN: { ar: "مصدر", en: "verbal noun" },
};

function pick(
  entry: { ar: string; en: string } | undefined,
  locale: Locale,
): string {
  if (!entry) return "";
  return entry[locale] || entry.ar;
}

/**
 * Richer iʿrāb prose from morphology features.
 * Template expansion of open corpus tags — Arabya study wording.
 */
export function narrativeIrab(
  morph: IrabWord | null | undefined,
  locale: string = "ar",
): string {
  const loc = asLocale(locale);
  if (!morph) return "—";
  const existing = (morph.irab || morph.irabText || "").trim();
  const feats = morph.features ?? [];
  const pos = morph.pos ?? [];
  const surface = morph.surface || morph.segments || "";

  const bits: string[] = [];

  const posLabel = formatPosLabels(pos, feats, loc);
  if (posLabel) {
    bits.push(
      loc === "en"
        ? `Grammatical class: ${posLabel}`
        : `تصنيفها النحوي: ${posLabel}`,
    );
  }

  for (const f of feats) {
    if (CASE_LABEL[f]) {
      bits.push(
        loc === "en"
          ? `${pick(CASE_LABEL[f], loc)}; case ending may be overt or implied by context`
          : `${pick(CASE_LABEL[f], loc)}؛ وعلامة الإعراب ظاهرة أو مقدّرة بحسب آخر الكلمة والسياق`,
      );
    }
    if (TENSE_LABEL[f]) {
      bits.push(
        loc === "en"
          ? `Verb tense: ${pick(TENSE_LABEL[f], loc)}`
          : `زمن الفعل: ${pick(TENSE_LABEL[f], loc)}`,
      );
    }
    if (MOOD_LABEL[f]) {
      bits.push(
        loc === "en"
          ? `Imperfect mood: ${pick(MOOD_LABEL[f], loc)}`
          : `إعراب المضارع: ${pick(MOOD_LABEL[f], loc)}`,
      );
    }
    if (FORM_LABEL[f]) {
      bits.push(
        loc === "en"
          ? `Form: ${pick(FORM_LABEL[f], loc)}`
          : `الصيغة: ${pick(FORM_LABEL[f], loc)}`,
      );
    }
    if (f === "PASS") {
      bits.push(loc === "en" ? "Passive voice" : "مبني للمجهول");
    }
    if (f === "ACT") {
      bits.push(loc === "en" ? "Active voice" : "مبني للمعلوم");
    }
    if (f === "ADJ") {
      bits.push(
        loc === "en"
          ? "May function as an adjective in context"
          : "يأتي نعتًا في السياق",
      );
    }
    if (f === "DET" || f.startsWith("LEM:ال")) {
      bits.push(loc === "en" ? "Definite with al-" : "معرّف بأل");
    }
  }

  if (morph.lemma) {
    bits.push(
      loc === "en"
        ? `Lexical lemma: ${morph.lemma}`
        : `مادتها المعجمية: ${morph.lemma}`,
    );
  }
  if (morph.root) {
    bits.push(
      loc === "en" ? `Root: ${morph.root}` : `جذرها: ${morph.root}`,
    );
  }

  const person = feats.find((f) => /^[123]/.test(f));
  if (person) {
    const map: Record<string, { ar: string; en: string }> = {
      "1": { ar: "متكلم", en: "1st person" },
      "2": { ar: "مخاطب", en: "2nd person" },
      "3": { ar: "غائب", en: "3rd person" },
    };
    const p = person[0];
    const gender = person.includes("F")
      ? loc === "en"
        ? "feminine"
        : "مؤنث"
      : person.includes("M")
        ? loc === "en"
          ? "masculine"
          : "مذكر"
        : "";
    const number = person.includes("P")
      ? loc === "en"
        ? "plural"
        : "جمع"
      : person.includes("D")
        ? loc === "en"
          ? "dual"
          : "مثنى"
        : loc === "en"
          ? "singular"
          : "مفرد";
    const personLabel = pick(map[p], loc);
    bits.push(
      loc === "en"
        ? `Agreement: ${[personLabel, gender, number].filter(Boolean).join(", ")}`
        : `الإسناد: ${[personLabel, gender, number].filter(Boolean).join("، ")}`,
    );
  }

  const generated = bits.length
    ? loc === "en"
      ? `${surface ? `The word «${surface}» — ` : ""}${bits.join(" · ")}`
      : `${surface ? `الكلمة «${surface}» — ` : ""}${bits.join(" · ")}`
    : "";

  // Corpus iʿrāb text stays Arabic; on EN UI still surface generated study prose first when richer.
  if (existing && generated && !existing.includes(morph.lemma ?? "___")) {
    return loc === "en"
      ? `${generated}${existing ? ` | Corpus note (AR): ${existing}` : ""}`
      : `${existing} | تفصيل دراسي: ${generated}`;
  }
  if (loc === "en" && generated) return generated;
  if (existing.length >= generated.length) return existing || generated || "—";
  return generated || existing || "—";
}

export function shortIrabGlance(
  morph: IrabWord | null | undefined,
  locale: string = "ar",
): string {
  if (!morph) return "";
  const loc = asLocale(locale);
  const pos = formatPosLabels(morph.pos, morph.features, loc);
  const feats = morph.features ?? [];
  const cse = feats.map((f) => pick(CASE_LABEL[f], loc)).find(Boolean);
  const tense = feats.map((f) => pick(TENSE_LABEL[f], loc)).find(Boolean);
  const tenseBit =
    tense &&
    (loc === "en" ? `verb (${tense})` : `فعل ${tense}`);
  return [morph.lemma, pos, tenseBit, cse].filter(Boolean).join(" · ");
}

/** Expand POS codes for lexicon card. */
export function lexiconCardLines(
  morph: IrabWord | null | undefined,
  locale: string = "ar",
): string[] {
  if (!morph) return [];
  const loc = asLocale(locale);
  const lines: string[] = [];
  if (morph.lemma) {
    lines.push(
      loc === "en" ? `Lemma: ${morph.lemma}` : `المادة: ${morph.lemma}`,
    );
  }
  if (morph.root) {
    lines.push(
      loc === "en" ? `Root: ${morph.root}` : `الجذر: ${morph.root}`,
    );
  }
  if (morph.pos?.length) {
    lines.push(
      loc === "en"
        ? `Class: ${morph.pos.map((p) => labelPosCode(p, loc)).join(" · ")}`
        : `التصنيف: ${morph.pos.map((p) => labelPosCode(p, loc)).join(" · ")}`,
    );
  }
  return lines;
}
