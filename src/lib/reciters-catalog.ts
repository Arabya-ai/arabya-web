import { readFile } from "node:fs/promises";
import path from "node:path";
import { RECITERS, type Reciter } from "@/lib/audio";

export type ReciterMeta = {
  countryAr?: string;
  countryEn?: string;
  riwayaAr?: string;
  riwayaEn?: string;
  bioAr?: string;
  bioEn?: string;
  /** Absolute URL to a public profile still (optional). */
  imageUrl?: string;
};

export type ReciterCatalogEntry = Reciter & {
  meta: ReciterMeta;
};

let metaCache: Record<string, ReciterMeta> | null = null;

async function loadMetaMap(): Promise<Record<string, ReciterMeta>> {
  if (metaCache) return metaCache;
  try {
    const raw = await readFile(
      path.join(process.cwd(), "data", "reciters-meta.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { reciters?: Record<string, ReciterMeta> };
    metaCache = parsed.reciters ?? {};
  } catch {
    metaCache = {};
  }
  return metaCache;
}

function fallbackRiwaya(reciter: Reciter): { ar: string; en: string } {
  if (reciter.style === "ورش") {
    return { ar: "ورش عن نافع", en: "Warsh ʿan Nāfiʿ" };
  }
  return { ar: "حفص عن عاصم", en: "Hafs ʿan ʿĀṣim" };
}

function withMeta(
  reciter: Reciter,
  metaMap: Record<string, ReciterMeta>,
): ReciterCatalogEntry {
  const meta = { ...(metaMap[reciter.id] ?? {}) };
  if (!meta.riwayaAr || !meta.riwayaEn) {
    const fb = fallbackRiwaya(reciter);
    meta.riwayaAr = meta.riwayaAr ?? fb.ar;
    meta.riwayaEn = meta.riwayaEn ?? fb.en;
  }
  return { ...reciter, meta };
}

export async function getReciterCatalog(): Promise<ReciterCatalogEntry[]> {
  const metaMap = await loadMetaMap();
  return RECITERS.map((r) => withMeta(r, metaMap));
}

export async function getReciterCatalogEntry(
  id: string,
): Promise<ReciterCatalogEntry | null> {
  const exact =
    RECITERS.find((r) => r.id === id) ||
    RECITERS.find((r) => r.folder === id) ||
    null;
  if (!exact) return null;
  const metaMap = await loadMetaMap();
  return withMeta(exact, metaMap);
}
