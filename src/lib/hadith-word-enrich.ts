import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeArabicToken } from "@/lib/tahfeez/normalize";
import { getQuranWordsLexicon } from "@/lib/word-senses";
import { HADITH_PARTICLES } from "@/lib/hadith-particles";

export type HadithWordEnrichment = {
  matchStatus: "exact" | "particle" | "none";
  matchKind: "quran-surface-analogy" | "closed-class-particle";
  root?: string | null;
  lemma?: string | null;
  pos?: string[];
  features?: string[];
  sense?: string | null;
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
  "الصرف والدلالة هنا بالقياس على أشكال قرآنية مطابقة (أو أدوات مغلقة) — وليست إعرابًا خاصًا بسياق الحديث.";

/** Try exact key, then drop ال / common clitics once for better hadith coverage. */
function lookupSurface(
  index: SurfaceIndex | null,
  norm: string,
): SurfaceEntry | null {
  if (!index?.entries || !norm) return null;
  const tryKeys = [norm];
  if (norm.startsWith("ال") && norm.length > 3) {
    tryKeys.push(norm.slice(2));
  }
  // One-letter proclitics common in Arabic orthography
  if (/^[وفبلسك]/.test(norm) && norm.length > 2) {
    tryKeys.push(norm.slice(1));
    if (norm.length > 4 && norm.slice(1, 3) === "ال") {
      tryKeys.push(norm.slice(3));
    }
  }
  for (const key of tryKeys) {
    const hit = index.entries[key];
    if (hit) return hit;
  }
  return null;
}

export async function enrichHadithToken(
  surface: string,
): Promise<HadithWordEnrichment> {
  const norm = normalizeArabicToken(surface);
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
    return {
      matchStatus: "particle",
      matchKind: "closed-class-particle",
      particleLabelAr: particle.labelAr,
      particleLabelEn: particle.labelEn,
      lemma: norm,
      sense: particle.labelAr,
      disclaimer: DISCLAIMER,
      source: "arabya-closed-class-particles",
    };
  }

  const index = await loadSurfaceIndex();
  const hit = lookupSurface(index, norm);
  if (!hit) {
    return {
      matchStatus: "none",
      matchKind: "quran-surface-analogy",
      disclaimer: DISCLAIMER,
      source: index?.source || "quran-surface-index-missing",
    };
  }

  let lexiconText: string | null = null;
  const lexiconKey = hit.lexiconKey || hit.root || null;
  if (lexiconKey) {
    const lex = await getQuranWordsLexicon();
    lexiconText = lex?.entries?.[lexiconKey]?.text?.trim() || null;
  }

  return {
    matchStatus: "exact",
    matchKind: "quran-surface-analogy",
    root: hit.root ?? null,
    lemma: hit.lemma ?? null,
    pos: hit.pos ?? [],
    features: hit.features ?? [],
    sense: hit.sense ?? null,
    lexiconKey,
    lexiconText,
    sampleWordId: hit.sampleWordId ?? null,
    disclaimer: index?.disclaimer || DISCLAIMER,
    source: index?.source || "quran-surface-analogy",
  };
}
