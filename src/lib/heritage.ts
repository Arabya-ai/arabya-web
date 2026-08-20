import { readFile } from "node:fs/promises";
import path from "node:path";

const dataRoot = path.join(process.cwd(), "data", "heritage");

export type HeritageWorkMeta = {
  slug: string;
  titleAr: string;
  titleEn: string;
  kind: string;
  descriptionAr?: string;
  descriptionEn?: string;
  passageCount?: number;
};

export type HeritagePassage = {
  id: string;
  titleAr: string;
  titleEn: string;
  textAr: string;
  meter?: string | null;
};

export type HeritageWork = HeritageWorkMeta & {
  source?: string;
  license?: string;
  passages: HeritagePassage[];
};

async function readJson<T>(rel: string): Promise<T | null> {
  try {
    const raw = await readFile(path.join(dataRoot, rel), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function listHeritageWorks(): Promise<HeritageWorkMeta[]> {
  const index = await readJson<{ works?: HeritageWorkMeta[] }>("index.json");
  const list = index?.works ?? [];
  return Promise.all(
    list.map(async (meta) => {
      const full = await getHeritageWork(meta.slug);
      return {
        ...meta,
        passageCount: full?.passages.length ?? meta.passageCount ?? 0,
      };
    }),
  );
}

export async function getHeritageWork(
  slug: string,
): Promise<HeritageWork | null> {
  const safe = slug.replace(/[^a-z0-9-]/gi, "");
  if (!safe) return null;
  const data = await readJson<HeritageWork>(`works/${safe}.json`);
  if (!data?.slug || !Array.isArray(data.passages)) return null;
  return data;
}
