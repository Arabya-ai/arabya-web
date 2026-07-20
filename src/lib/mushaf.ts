import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Ayah, MushafIndex, MushafPageVerse, SurahMeta } from "./types";
import { getSurah, getSurahMeta, getSurahs } from "./quran";

const dataRoot = path.join(process.cwd(), "data");

export async function getMushafIndex(): Promise<MushafIndex> {
  const raw = await readFile(path.join(dataRoot, "mushaf-index.json"), "utf8");
  return JSON.parse(raw) as MushafIndex;
}

export function getFirstMushafPage(surahId: number, index: MushafIndex): number {
  return index.surahFirstPage[String(surahId)] ?? 1;
}

export type MushafPageBlock = {
  surahId: number;
  meta: SurahMeta;
  verses: Ayah[];
};

export type MushafPageContent = {
  page: number;
  totalPages: number;
  juz: number;
  blocks: MushafPageBlock[];
};

export async function getMushafPage(pageNum: number): Promise<MushafPageContent | null> {
  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 604) return null;

  const index = await getMushafIndex();
  const refs = index.pages[String(pageNum)];
  if (!refs?.length) return null;

  const metaList = await getSurahs();
  const metaById = new Map(metaList.map((m) => [m.id, m]));

  const bySurah = new Map<number, MushafPageVerse[]>();
  for (const ref of refs) {
    const list = bySurah.get(ref.surahId) ?? [];
    list.push(ref);
    bySurah.set(ref.surahId, list);
  }

  const blocks: MushafPageBlock[] = [];

  for (const [surahId, pageRefs] of bySurah) {
    const content = await getSurah(surahId);
    const meta = metaById.get(surahId) ?? (await getSurahMeta(surahId));
    if (!content || !meta) continue;

    const verseNumbers = new Set(pageRefs.map((r) => r.verseNumber));
    const verses = content.verses.filter((v) => verseNumbers.has(v.verseNumber));
    if (!verses.length) continue;

    blocks.push({ surahId, meta, verses });
  }

  if (!blocks.length) return null;

  return {
    page: pageNum,
    totalPages: index.totalPages,
    juz: refs[0].juz,
    blocks,
  };
}

export function getAdjacentMushafPages(current: number, total = 604) {
  return {
    prev: current > 1 ? current - 1 : null,
    next: current < total ? current + 1 : null,
  };
}

export async function getSurahMushafPages(surahId: number): Promise<number[]> {
  const index = await getMushafIndex();
  return index.surahPages[String(surahId)] ?? [];
}
