import { readFile } from "node:fs/promises";
import path from "node:path";
import { getAsmaAr } from "@/lib/asma-meanings-ar";
import { getAsmaEn } from "@/lib/asma-meanings-en";

export type AsmaEntry = {
  number: number;
  nameAr: string;
  transliteration: string;
  meaningAr: string;
  explanationAr: string;
  /** Curated short English meaning (preferred for UI). */
  meaningEn: string;
  /** Curated short English explanation (preferred for UI). */
  explanationEn: string;
  /** Longer English details from the JSON source (optional secondary). */
  detailsEn: string;
};

type RawFile = {
  names: {
    number: number;
    nameAr: string;
    transliteration: string;
    meaningEn?: string;
    detailsEn?: string;
    meaningAr?: string;
    explanationAr?: string;
  }[];
};

let cache: AsmaEntry[] | null = null;

export async function getAsmaNames(): Promise<AsmaEntry[]> {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "asma-al-husna.json");
  const raw = JSON.parse(await readFile(file, "utf8")) as RawFile;
  cache = (raw.names ?? [])
    .map((n) => {
      const ar = getAsmaAr(n.number);
      const en = getAsmaEn(n.number);
      return {
        number: n.number,
        nameAr: n.nameAr,
        transliteration: n.transliteration,
        meaningAr: ar?.meaningAr || n.meaningAr || "",
        explanationAr: ar?.explanationAr || n.explanationAr || "",
        meaningEn: en?.meaningEn || n.meaningEn || "",
        explanationEn: en?.explanationEn || "",
        detailsEn: n.detailsEn || "",
      };
    })
    .filter((n) => n.number >= 1 && n.nameAr);
  return cache;
}

export async function getAsmaByNumber(
  number: number,
): Promise<AsmaEntry | null> {
  const all = await getAsmaNames();
  return all.find((n) => n.number === number) ?? null;
}

export function todayAsmaIndex(total: number): number {
  if (total <= 0) return 0;
  return Math.floor(Date.now() / 86400000) % total;
}
