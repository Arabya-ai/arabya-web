import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SurahContent, SurahMeta } from "./types";

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
