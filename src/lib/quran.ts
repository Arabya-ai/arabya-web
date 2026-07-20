import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  IrabSurah,
  SurahContent,
  SurahMeta,
  TafsirSource,
  TafsirSurah,
} from "./types";

const dataRoot = path.join(process.cwd(), "data");

export async function getSurahs(): Promise<SurahMeta[]> {
  const raw = await readFile(path.join(dataRoot, "surahs.json"), "utf8");
  return JSON.parse(raw) as SurahMeta[];
}

export async function getSurah(id: number): Promise<SurahContent | null> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "surahs", `${id}.json`),
      "utf8",
    );
    return JSON.parse(raw) as SurahContent;
  } catch {
    return null;
  }
}

export async function getSurahMeta(id: number): Promise<SurahMeta | undefined> {
  const surahs = await getSurahs();
  return surahs.find((s) => s.id === id);
}

export async function getIrab(id: number): Promise<IrabSurah | null> {
  try {
    const raw = await readFile(path.join(dataRoot, "irab", `${id}.json`), "utf8");
    return JSON.parse(raw) as IrabSurah;
  } catch {
    return null;
  }
}

export async function getTafsirSources(): Promise<TafsirSource[]> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "tafsirs", "index.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { sources: TafsirSource[] };
    return parsed.sources ?? [];
  } catch {
    return [];
  }
}

export async function getTafsir(
  slug: string,
  id: number,
): Promise<TafsirSurah | null> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "tafsirs", slug, `${id}.json`),
      "utf8",
    );
    return JSON.parse(raw) as TafsirSurah;
  } catch {
    return null;
  }
}
