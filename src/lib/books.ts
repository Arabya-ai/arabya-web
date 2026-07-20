import { readFile } from "node:fs/promises";
import path from "node:path";
import type { IrabSourceMeta } from "@/lib/claims";

const dataRoot = path.join(process.cwd(), "data");

export type BookCatalogEntry = IrabSourceMeta & {
  title?: string;
  description?: string;
};

export async function getBookCatalog(): Promise<BookCatalogEntry[]> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "books", "index.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { books?: BookCatalogEntry[] };
    return parsed.books ?? [];
  } catch {
    return [];
  }
}

export async function getBookMeta(
  slug: string,
): Promise<BookCatalogEntry | null> {
  const books = await getBookCatalog();
  return books.find((b) => b.id === slug) ?? null;
}
