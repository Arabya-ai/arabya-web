import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeArabicToken } from "@/lib/tahfeez/normalize";
import { getQuranWordsLexicon } from "@/lib/word-senses";
import { HADITH_PARTICLES } from "@/lib/hadith-particles";
import { HADITH_CORE_GLOSS } from "@/lib/hadith-core-gloss";
import { rhetoricForToken } from "@/lib/hadith-rhetoric";

export type HadithWordEnrichment = {
  matchStatus: "exact" | "particle" | "gloss" | "none";
  matchKind:
    | "quran-surface-analogy"
    | "closed-class-particle"
    | "hadith-core-gloss";
  root?: string | null;
  lemma?: string | null;
  pos?: string[];
  features?: string[];
  sense?: string | null;
  /** Short Arabic gloss for the translation tab */
  translationAr?: string | null;
  /** Short English gloss for the translation tab */
  translationEn?: string | null;
  rhetoricAr?: string | null;
  rhetoricEn?: string | null;
  lexiconText?: string | null;
  lexiconKey?: string | null;
  sampleWordId?: string | null;
  particleLabelAr?: string | null;
  particleLabelEn?: string | null;
  disclaimer: string;
  source: string;
};

type SurfaceEntry = {
  root?: string | null;
  lemma?: string | null;
  pos?: string[];
  features?: string[];
  sampleWordId?: string | null;
  sense?: string | null;
  lexiconKey?: string | null;
  freq?: number;
};

type SurfaceIndex = {
  disclaimer?: string;
  source?: string;
  entries: Record<string, SurfaceEntry>;
};

let indexPromise: Promise<SurfaceIndex | null> | null = null;

async function loadSurfaceIndex(): Promise<SurfaceIndex | null> {
  if (!indexPromise) {
    indexPromise = (async () => {
      try {
        const raw = await readFile(
          path.join(process.cwd(), "data", "hadith", "surface-index.json"),
          "utf8",
        );
        return JSON.parse(raw) as SurfaceIndex;
      } catch {
        return null;
      }
    })();
  }
  return indexPromise;
}

const DISCLAIMER =
  "الصرف والدلالة والترجمة المختصرة هنا بالقياس على أشكال قرآنية أو معجم حديث أساسي أو أدوات مغلقة — وليست إعرابًا خاصًا بسياق الحديث ولا ترجمة معتمدة لكل رواية.";

function attachRhetoric(
  surface: string,
  base: HadithWordEnrichment,
  fromGloss?: { rhetoricAr?: string; rhetoricEn?: string },
): HadithWordEnrichment {
  const note = rhetoricForToken(surface);
  return {
    ...base,
    rhetoricAr: fromGloss?.rhetoricAr || note?.ar || null,
    rhetoricEn: fromGloss?.rhetoricEn || note?.en || null,
  };
}

/** Candidate keys: strip ال, clitics, and light pronominal suffixes. */
function candidateKeys(norm: string): string[] {
  const keys: string[] = [];
  const push = (k: string) => {
    if (k && k.length >= 2 && !keys.includes(k)) keys.push(k);
  };
  push(norm);

  const stripPrefix = (s: string) => {
    push(s);
    if (s.startsWith("ال") && s.length > 3) push(s.slice(2));
    if (/^[وفبلسك]/.test(s) && s.length > 2) {
      const rest = s.slice(1);
      push(rest);
      if (rest.startsWith("ال") && rest.length > 3) push(rest.slice(2));
    }
  };
  stripPrefix(norm);

  const suffixRe = /(هما|هم|هن|كم|كن|نا|ني|ها|ه|ك|ي)$/;
  const m = norm.match(suffixRe);
  if (m && norm.length - m[1].length >= 2) {
    const base = norm.slice(0, -m[1].length);
    stripPrefix(base);
    if (base.endsWith("ت") && base.length > 3) {
      push(base.slice(0, -1) + "ه");
    }
  }

  return keys;
}

function lookupSurface(
  index: SurfaceIndex | null,
  norm: string,
): SurfaceEntry | null {
  if (!index?.entries || !norm) return null;
  for (const key of candidateKeys(norm)) {
    const hit = index.entries[key];
    if (hit) return hit;
  }
  return null;
}

function lookupCoreGloss(norm: string) {
  for (const key of candidateKeys(norm)) {
    const g = HADITH_CORE_GLOSS[key];
    if (g) return { key, g };
  }
  return null;
}

export async function enrichHadithToken(
  surface: string,
): Promise<HadithWordEnrichment> {
  const cleaned = String(surface || "").replace(
    /[\u060C\u061B\u061F\u06D4\u066A-\u066D\u06DD]/g,
    "",
  );
  const norm = normalizeArabicToken(cleaned);
  if (!norm) {
    return {
      matchStatus: "none",
      matchKind: "quran-surface-analogy",
      disclaimer: DISCLAIMER,
      source: "none",
    };
  }

  const particle = HADITH_PARTICLES[norm];
  if (particle) {
    return attachRhetoric(surface, {
      matchStatus: "particle",
      matchKind: "closed-class-particle",
      particleLabelAr: particle.labelAr,
      particleLabelEn: particle.labelEn,
      lemma: norm,
      sense: particle.labelAr,
      translationAr: particle.labelAr,
      translationEn: particle.labelEn,
      disclaimer: DISCLAIMER,
      source: "arabya-closed-class-particles",
    });
  }

  const index = await loadSurfaceIndex();
  const hit = lookupSurface(index, norm);
  if (hit) {
    let lexiconText: string | null = null;
    const lexiconKey = hit.lexiconKey || hit.root || null;
    if (lexiconKey) {
      const lex = await getQuranWordsLexicon();
      lexiconText = lex?.entries?.[lexiconKey]?.text?.trim() || null;
    }
    const sense = hit.sense ?? null;
    return attachRhetoric(surface, {
      matchStatus: "exact",
      matchKind: "quran-surface-analogy",
      root: hit.root ?? null,
      lemma: hit.lemma ?? null,
      pos: hit.pos ?? [],
      features: hit.features ?? [],
      sense,
      translationAr: sense,
      translationEn: hit.lemma
        ? `Lemma (Quran analogy): ${hit.lemma}`
        : hit.root
          ? `Root (Quran analogy): ${hit.root}`
          : null,
      lexiconKey,
      lexiconText,
      sampleWordId: hit.sampleWordId ?? null,
      disclaimer: index?.disclaimer || DISCLAIMER,
      source: index?.source || "quran-surface-analogy",
    });
  }

  const glossHit = lookupCoreGloss(norm);
  if (glossHit) {
    const { g } = glossHit;
    return attachRhetoric(
      surface,
      {
        matchStatus: "gloss",
        matchKind: "hadith-core-gloss",
        root: g.root ?? null,
        lemma: g.lemma ?? null,
        pos: g.pos ?? [],
        sense: g.senseAr,
        translationAr: g.senseAr,
        translationEn: g.senseEn,
        lexiconText: g.senseAr,
        lexiconKey: g.root ?? g.lemma ?? null,
        disclaimer: DISCLAIMER,
        source: "arabya-hadith-core-gloss",
      },
      { rhetoricAr: g.rhetoricAr, rhetoricEn: g.rhetoricEn },
    );
  }

  return attachRhetoric(surface, {
    matchStatus: "none",
    matchKind: "quran-surface-analogy",
    disclaimer: DISCLAIMER,
    source: index?.source || "quran-surface-index-missing",
  });
}
