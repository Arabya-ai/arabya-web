import { readFile } from "node:fs/promises";
import path from "node:path";
import { getImportedBooksRoot } from "@/lib/import-book/paths";
import type { IrabSourceMeta } from "@/lib/claims";

const dataRoot = path.join(process.cwd(), "data");

export type BookCatalogEntry = IrabSourceMeta & {
  title?: string;
  description?: string;
};

async function readCatalogFile(indexPath: string): Promise<BookCatalogEntry[]> {
  try {
    const raw = await readFile(indexPath, "utf8");
    const parsed = JSON.parse(raw) as { books?: BookCatalogEntry[] };
    return parsed.books ?? [];
  } catch {
    return [];
  }
}

export async function getBookCatalog(): Promise<BookCatalogEntry[]> {
  const gitBooks = await readCatalogFile(path.join(dataRoot, "books", "index.json"));
  const importedBooks = await readCatalogFile(
    path.join(getImportedBooksRoot(), "index.json"),
  );
  const byId = new Map<string, BookCatalogEntry>();
  for (const b of gitBooks) byId.set(b.id, b);
  for (const b of importedBooks) byId.set(b.id, b);
  return [...byId.values()];
}

export async function getBookMeta(
  slug: string,
): Promise<BookCatalogEntry | null> {
  const books = await getBookCatalog();
  return books.find((b) => b.id === slug) ?? null;
}
