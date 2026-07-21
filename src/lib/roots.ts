import { readFile } from "node:fs/promises";
import path from "node:path";
import type { RootEntry, RootOccurrence } from "@/lib/types";

export type LemmaSense = {
  sense: string;
  source: string;
  count?: number;
};

export type RootLemmaSummary = {
  lemma: string;
  count: number;
  sense: string | null;
  senseSource: string | null;
};

type LemmaSenseFile = {
  license?: string;
  attribution?: { morphology?: string; senses?: string };
  senses: Record<string, LemmaSense>;
};

let lemmaSenseCache: LemmaSenseFile | null | undefined;

export async function getLemmaSenseFile(): Promise<LemmaSenseFile | null> {
  if (lemmaSenseCache !== undefined) return lemmaSenseCache;
  try {
    const raw = await readFile(
      path.join(process.cwd(), "data", "sources", "lemma-sense-ar.json"),
      "utf8",
    );
    lemmaSenseCache = JSON.parse(raw) as LemmaSenseFile;
    return lemmaSenseCache;
  } catch {
    lemmaSenseCache = null;
    return null;
  }
}

/** Aggregate lemmas for a root from its concordance occurrences. */
export function summarizeRootLemmas(
  entry: RootEntry,
  senses: Record<string, LemmaSense> | null | undefined,
): RootLemmaSummary[] {
  const counts = new Map<string, number>();
  for (const occ of entry.occurrences) {
    const lemma = occ.lemma?.trim();
    if (!lemma) continue;
    counts.set(lemma, (counts.get(lemma) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([lemma, count]) => {
      const hit = senses?.[lemma];
      return {
        lemma,
        count,
        sense: hit?.sense ?? null,
        senseSource: hit?.source ?? null,
      };
    })
    .sort((a, b) => b.count - a.count || a.lemma.localeCompare(b.lemma, "ar"));
}

export function topRootsByCount(
  roots: RootEntry[],
  limit = 40,
): RootEntry[] {
  return [...roots].sort((a, b) => b.count - a.count).slice(0, limit);
}

export function occurrencePages(
  occurrences: RootOccurrence[],
  pageSize: number,
  page: number,
): { items: RootOccurrence[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(occurrences.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: occurrences.slice(start, start + pageSize),
    page: safePage,
    pageCount,
  };
}
