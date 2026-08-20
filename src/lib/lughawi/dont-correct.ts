/**
 * Institutional «don't correct» dictionary — skip suggestions for locked terms.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LughawiEdit } from "@/lib/lughawi/types";

interface DontCorrectFile {
  entries?: Array<{ text?: string; reason?: string }>;
}

let cache: Set<string> | null = null;

function loadSet(): Set<string> {
  if (cache) return cache;
  const paths = [
    join(process.cwd(), "data/lughawi/dont-correct.json"),
    join(process.cwd(), ".data/lughawi-dont-correct.json"),
  ];
  const set = new Set<string>();
  for (const path of paths) {
    try {
      if (!existsSync(path)) continue;
      const raw = JSON.parse(readFileSync(path, "utf8")) as DontCorrectFile;
      for (const e of raw.entries ?? []) {
        const t = e.text?.trim();
        if (t) set.add(t.toLowerCase());
      }
    } catch {
      /* ignore */
    }
  }
  cache = set;
  return set;
}

/** Test helper — clear memo between cases. */
export function resetDontCorrectCache(): void {
  cache = null;
}

export function isDontCorrectTerm(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return loadSet().has(t);
}

/** Drop edits that touch locked institutional terms (original span). */
export function filterDontCorrect(edits: LughawiEdit[]): LughawiEdit[] {
  const locked = loadSet();
  if (locked.size === 0) return edits;
  return edits.filter((e) => {
    const orig = e.original.trim().toLowerCase();
    if (locked.has(orig)) return false;
    // Also skip if suggestion would rewrite a locked multi-word phrase inside original
    for (const term of locked) {
      if (term.length >= 3 && orig.includes(term)) return false;
    }
    return true;
  });
}
