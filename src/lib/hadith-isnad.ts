import { readFile } from "node:fs/promises";
import path from "node:path";

const dataRoot = path.join(process.cwd(), "data", "hadith");

export type HadithIsnadEntry = {
  narrators: string[];
  narratorEn?: string;
  chainHint?: string;
  source: string;
};

type OverlayFile = {
  collection: string;
  source?: string;
  method?: string;
  items?: Record<string, HadithIsnadEntry>;
};

const overlayCache = new Map<string, OverlayFile | null>();

async function readOverlay(slug: string): Promise<OverlayFile | null> {
  const safe = slug.replace(/[^a-z0-9-]/gi, "");
  if (!safe) return null;
  if (overlayCache.has(safe)) return overlayCache.get(safe) ?? null;
  try {
    const raw = await readFile(
      path.join(dataRoot, "isnad", `${safe}.json`),
      "utf8",
    );
    const parsed = JSON.parse(raw) as OverlayFile;
    overlayCache.set(safe, parsed);
    return parsed;
  } catch {
    overlayCache.set(safe, null);
    return null;
  }
}

export async function getHadithIsnad(
  collection: string,
  number: number,
): Promise<HadithIsnadEntry | null> {
  const overlay = await readOverlay(collection);
  if (!overlay?.items) return null;
  return overlay.items[String(number)] ?? null;
}
