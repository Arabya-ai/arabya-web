import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { slugifyBookTitle } from "@/lib/import-book/slug";
import {
  LIBRARY_CATEGORIES,
  type LibraryCategoryMeta,
} from "@/lib/library/categories";
import { ensureImportedLibraryRoot } from "@/lib/library/paths";

type CustomCategoryFile = { categories: LibraryCategoryMeta[] };

function categoriesPath(): string {
  return path.join(ensureImportedLibraryRoot(), "categories.json");
}

export async function loadCustomLibraryCategories(): Promise<LibraryCategoryMeta[]> {
  try {
    const raw = await readFile(categoriesPath(), "utf8");
    const parsed = JSON.parse(raw) as CustomCategoryFile;
    return (parsed.categories ?? []).filter((c) => c.id && c.labelAr);
  } catch {
    return [];
  }
}

export async function listAllLibraryCategories(): Promise<LibraryCategoryMeta[]> {
  const custom = await loadCustomLibraryCategories();
  const seen = new Set(LIBRARY_CATEGORIES.map((c) => c.id));
  const extras = custom.filter((c) => !seen.has(c.id));
  return [...LIBRARY_CATEGORIES, ...extras];
}

export async function addCustomLibraryCategory(input: {
  labelAr: string;
  labelEn?: string;
}): Promise<LibraryCategoryMeta> {
  const labelAr = input.labelAr.trim();
  if (labelAr.length < 2) throw new Error("category_required");
  const labelEn = (input.labelEn || labelAr).trim();
  const id = slugifyBookTitle(labelEn !== labelAr ? labelEn : labelAr, "cat");
  const all = await listAllLibraryCategories();
  const existing = all.find(
    (c) => c.id === id || c.labelAr === labelAr || c.labelEn.toLowerCase() === labelEn.toLowerCase(),
  );
  if (existing) return existing;

  const custom = await loadCustomLibraryCategories();
  const entry: LibraryCategoryMeta = { id, labelAr, labelEn };
  custom.push(entry);
  await writeFile(
    categoriesPath(),
    JSON.stringify({ categories: custom }, null, 2),
    "utf8",
  );
  return entry;
}
