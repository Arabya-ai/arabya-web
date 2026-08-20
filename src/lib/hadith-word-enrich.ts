import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeArabicToken } from "@/lib/tahfeez/normalize";
import { getQuranWordsLexicon } from "@/lib/word-senses";
import { HADITH_PARTICLES } from "@/lib/hadith-particles";
import { HADITH_CORE_GLOSS } from "@/lib/hadith-core-gloss";
import { HADITH_NAMES } from "@/lib/hadith-names";
import { rhetoricForToken } from "@/lib/hadith-rhetoric";
import { candidateKeys } from "@/lib/hadith-token-keys";

export type HadithWordEnrichment = {
  matchStatus: "exact" | "particle" | "gloss" | "name" | "none";
  matchKind:
    | "quran-surface-analogy"
    | "closed-class-particle"
    | "hadith-core-gloss"
    | "hadith-name-label";
  root?: string | null;
  lemma?: string | null;
  pos?: string[];
  features?: string[];
  sense?: string | null;
  translationAr?: string | null;
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
  "الصرف والدلالة والترجمة المختصرة هنا بالقياس على أشكال قرآنية أو معجم حديث أساسي أو أدوات/أسماء إسناد شائعة — وليست إعرابًا خاصًا بسياق الحديث ولا ترجمة معتمدة لكل رواية.";

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
// candidateKeys imported from hadith-token-keys

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

function lookupParticle(norm: string) {
  for (const key of candidateKeys(norm)) {
    const p = HADITH_PARTICLES[key];
    if (p) return { key, p };
  }
  return null;
}

function lookupName(norm: string) {
  for (const key of candidateKeys(norm)) {
    const n = HADITH_NAMES[key];
    if (n) return { key, n };
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

  const particleHit = lookupParticle(norm);
  if (particleHit) {
    const { p } = particleHit;
    return attachRhetoric(surface, {
      matchStatus: "particle",
      matchKind: "closed-class-particle",
      particleLabelAr: p.labelAr,
      particleLabelEn: p.labelEn,
      lemma: particleHit.key,
      sense: p.labelAr,
      translationAr: p.labelAr,
      translationEn: p.labelEn,
      disclaimer: DISCLAIMER,
      source: "arabya-closed-class-particles",
    });
  }

  const nameHit = lookupName(norm);
  if (nameHit) {
    const { n } = nameHit;
    return attachRhetoric(surface, {
      matchStatus: "name",
      matchKind: "hadith-name-label",
      lemma: nameHit.key,
      sense: n.labelAr,
      translationAr: n.labelAr,
      translationEn: n.labelEn,
      particleLabelAr: n.labelAr,
      particleLabelEn: n.labelEn,
      disclaimer: DISCLAIMER,
      source: "arabya-hadith-name-labels",
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
