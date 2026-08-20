/**
 * Pure isnād helpers — parse Arabic matn / English lead-in without storing
 * multi‑MB overlay dumps in Git.
 */

const TASHKEEL =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08FF]/g;

export function stripIsnadDiacritics(t: string): string {
  return String(t || "")
    .replace(TASHKEEL, "")
    .replace(/\u0640/g, "");
}

function cleanName(s: string): string {
  let t = stripIsnadDiacritics(s).trim();
  t = t.replace(/\s*رض[يى]\s*الله\s*عنه[ما]*\s*/g, " ");
  t = t.replace(/\s*عليه\s*السلام\s*/g, " ");
  t = t.replace(/\s*صلى\s*الله\s*عليه\s*.*$/g, "");
  t = t.replace(/\s*قال\s*:?\s*"?\s*$/g, "");
  t = t.replace(/\s*على\s+المنبر.*$/g, "");
  t = t.replace(/\s*في\s+المسجد.*$/g, "");
  t = t.replace(/[،,;؛:«»"']/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/\s*صلى\s*الله\s*عليه\s*و?سلم\s*$/g, "").trim();
  return t;
}

function isNoiseName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 80) return true;
  if (/^(قال|قالت|أن|ان|انه|انها)$/.test(name)) return true;
  if (/رسول\s*الله/.test(name)) return true;
  if (/^النبي/.test(name)) return true;
  if (/صلى\s*الله/.test(name)) return true;
  if (/^الله$/.test(name)) return true;
  return false;
}

/** Ordered narrator names from Arabic matn (transmission verbs / عن…). */
export function extractNarratorsFromArabic(arabic: string): string[] {
  const clean = stripIsnadDiacritics(arabic).replace(/<[^>]+>/g, " ");
  const verb =
    /(?:^|[\s،,])(?:حدثنا|حدثني|حدثه|اخبرنا|اخبرني|انبانا|انباني|سمعت|سمعنا)\s+/g;
  if (!verb.test(clean)) {
    const m = clean.match(
      /^عن\s+(.+?)\s+(?:رضي|قال|قالت|ان|أنه|أنها|أنه)/,
    );
    if (m) {
      const name = cleanName(m[1]);
      return !isNoiseName(name) ? [name] : [];
    }
    return [];
  }

  const parts = clean.split(
    /(?:^|[\s،,])(?:حدثنا|حدثني|حدثه|اخبرنا|اخبرني|انبانا|انباني|سمعت|سمعنا|عن)\s+/,
  );
  const names: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    let chunk = part.split(
      /(?:يقول|يقوله|أن رسول|ان رسول|أن النبي|ان النبي|قال رسول|قال النبي|سمعت رسول)/,
    )[0];
    chunk = chunk.split(/،|,/)[0];
    const name = cleanName(chunk);
    if (isNoiseName(name)) continue;
    if (!names.includes(name)) names.push(name);
    if (names.length >= 8) break;
  }
  return names;
}

export function extractNarratorEnFromText(engText: string): string | undefined {
  const t = String(engText || "").trim();
  const m =
    /^(?:Narrated|It is narrated on the authority of)\s+(.+?)\s*:/i.exec(t);
  if (!m) return undefined;
  return m[1]
    .replace(/\s*\(ra\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** fawazahmed0 CDN edition names for English lead-in (not stored in Git). */
export const HADITH_ENG_EDITION: Record<string, string> = {
  bukhari: "eng-bukhari",
  muslim: "eng-muslim",
  abudawud: "eng-abudawud",
  tirmidhi: "eng-tirmidhi",
  nasai: "eng-nasai",
  ibnmajah: "eng-ibnmajah",
  malik: "eng-malik",
  nawawi: "eng-nawawi",
};

export function hadithCdnEditionUrl(
  edition: string,
  number: number,
): string {
  return `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${edition}/${number}.json`;
}
