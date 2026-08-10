import { readFile } from "node:fs/promises";
import path from "node:path";

const dataRoot = path.join(process.cwd(), "data", "adhkar");

export type AdhkarCategoryMeta = {
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
};

export type AdhkarItem = {
  id: string;
  textAr: string;
  repeat: number;
  source?: string;
  fadlAr?: string;
  fadlEn?: string;
};

export type AdhkarCategory = AdhkarCategoryMeta & {
  items: AdhkarItem[];
};

export async function getAdhkarCategories(): Promise<AdhkarCategoryMeta[]> {
  try {
    const raw = await readFile(path.join(dataRoot, "index.json"), "utf8");
    const parsed = JSON.parse(raw) as { categories?: AdhkarCategoryMeta[] };
    return parsed.categories ?? [];
  } catch {
    return [];
  }
}

export async function getAdhkarCategory(
  slug: string,
): Promise<AdhkarCategory | null> {
  const categories = await getAdhkarCategories();
  const meta = categories.find((c) => c.slug === slug);
  if (!meta) return null;
  try {
    const raw = await readFile(path.join(dataRoot, `${slug}.json`), "utf8");
    const parsed = JSON.parse(raw) as { items?: AdhkarItem[] };
    return { ...meta, items: parsed.items ?? [] };
  } catch {
    return { ...meta, items: [] };
  }
}
