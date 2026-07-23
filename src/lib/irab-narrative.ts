import type { IrabWord } from "@/lib/types";
import { formatPosLabels, labelPosCode } from "@/lib/morph-labels";

const CASE_LABEL: Record<string, string> = {
  NOM: "مرفوع",
  ACC: "منصوب",
  GEN: "مجرور",
};

const TENSE_LABEL: Record<string, string> = {
  PERF: "ماضٍ",
  IMPF: "مضارع",
  IMPV: "أمر",
};

const MOOD_LABEL: Record<string, string> = {
  "MOOD:IND": "مرفوع",
  "MOOD:SUBJ": "منصوب",
  "MOOD:JUS": "مجزوم",
  IND: "مرفوع",
  SUBJ: "منصوب",
  JUS: "مجزوم",
};

const FORM_LABEL: Record<string, string> = {
  ACT_PCPL: "اسم فاعل",
  PASS_PCPL: "اسم مفعول",
  VN: "مصدر",
};

/**
 * Richer Arabic iʿrāb prose from morphology features.
 * Template expansion of open corpus tags — Arabya study wording.
 */
export function narrativeIrab(morph: IrabWord | null | undefined): string {
  if (!morph) return "—";
  const existing = (morph.irab || morph.irabText || "").trim();
  const feats = morph.features ?? [];
  const pos = morph.pos ?? [];
  const surface = morph.surface || morph.segments || "";

  const bits: string[] = [];

  const posLabel = formatPosLabels(pos, feats);
  if (posLabel) bits.push(`تصنيفها النحوي: ${posLabel}`);

  for (const f of feats) {
    if (CASE_LABEL[f]) {
      bits.push(
        `${CASE_LABEL[f]}؛ وعلامة الإعراب ظاهرة أو مقدّرة بحسب آخر الكلمة والسياق`,
      );
    }
    if (TENSE_LABEL[f]) bits.push(`زمن الفعل: ${TENSE_LABEL[f]}`);
    if (MOOD_LABEL[f]) bits.push(`إعراب المضارع: ${MOOD_LABEL[f]}`);
    if (FORM_LABEL[f]) bits.push(`الصيغة: ${FORM_LABEL[f]}`);
    if (f === "PASS") bits.push("مبني للمجهول");
    if (f === "ACT") bits.push("مبني للمعلوم");
    if (f === "ADJ") bits.push("يأتي نعتًا في السياق");
    if (f === "DET" || f.startsWith("LEM:ال")) bits.push("معرّف بأل");
  }

  if (morph.lemma) bits.push(`مادتها المعجمية: ${morph.lemma}`);
  if (morph.root) bits.push(`جذرها: ${morph.root}`);

  const person = feats.find((f) => /^[123]/.test(f));
  if (person) {
    const map: Record<string, string> = {
      "1": "متكلم",
      "2": "مخاطب",
      "3": "غائب",
    };
    const p = person[0];
    const gender = person.includes("F")
      ? "مؤنث"
      : person.includes("M")
        ? "مذكر"
        : "";
    const number = person.includes("P")
      ? "جمع"
      : person.includes("D")
        ? "مثنى"
        : "مفرد";
    bits.push(
      `الإسناد: ${[map[p], gender, number].filter(Boolean).join("، ")}`,
    );
  }

  const generated = bits.length
    ? `${surface ? `الكلمة «${surface}» — ` : ""}${bits.join(" · ")}`
    : "";

  if (existing && generated && !existing.includes(morph.lemma ?? "___")) {
    return `${existing} | تفصيل دراسي: ${generated}`;
  }
  if (existing.length >= generated.length) return existing || generated || "—";
  return generated || existing || "—";
}

export function shortIrabGlance(morph: IrabWord | null | undefined): string {
  if (!morph) return "";
  const pos = formatPosLabels(morph.pos, morph.features);
  const feats = morph.features ?? [];
  const cse = feats.map((f) => CASE_LABEL[f]).find(Boolean);
  const tense = feats.map((f) => TENSE_LABEL[f]).find(Boolean);
  return [morph.lemma, pos, tense && `فعل ${tense}`, cse]
    .filter(Boolean)
    .join(" · ");
}

/** Expand POS codes for lexicon card. */
export function lexiconCardLines(morph: IrabWord | null | undefined): string[] {
  if (!morph) return [];
  const lines: string[] = [];
  if (morph.lemma) lines.push(`المادة: ${morph.lemma}`);
  if (morph.root) lines.push(`الجذر: ${morph.root}`);
  if (morph.pos?.length) {
    lines.push(
      `التصنيف: ${morph.pos.map((p) => labelPosCode(p)).join(" · ")}`,
    );
  }
  return lines;
}
