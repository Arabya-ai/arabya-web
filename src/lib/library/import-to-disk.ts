import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureImportedLibraryRoot } from "@/lib/library/paths";
import {
  generatePdfCoverThumbnail,
  libraryCoverFileName,
} from "@/lib/library/pdf-cover";

async function upsertImportedCatalog(
  slug: string,
  entry: {
    id: string;
    title: string;
    titleEn?: string;
    author?: string;
    category?: string;
    description?: string;
    status: string;
    pdfUrl: string;
    coverUrl?: string;
    pageCount?: number;
    license?: string;
  },
) {
  const root = ensureImportedLibraryRoot();
  const indexPath = path.join(root, "index.json");
  let index: { works: typeof entry[] } = { works: [] };
  try {
    index = JSON.parse(await readFile(indexPath, "utf8"));
  } catch {
    /* new */
  }
  const works = index.works ?? [];
  const existing = works.find((w) => w.id === slug);
  if (existing) Object.assign(existing, entry);
  else works.push(entry);
  await writeFile(indexPath, JSON.stringify({ works }, null, 2), "utf8");
}

export async function importReadingBookToDisk(input: {
  slug: string;
  title: string;
  pdfBuffer: Buffer;
  author?: string;
  category?: string;
  description?: string;
  pageCount?: number;
  license?: string;
  publish?: boolean;
}): Promise<{ slug: string; pageCount?: number; coverUrl?: string }> {
  const root = ensureImportedLibraryRoot();
  const outDir = path.join(root, input.slug);
  await mkdir(outDir, { recursive: true });

  await writeFile(path.join(outDir, "book.pdf"), input.pdfBuffer);

  let coverUrl: string | undefined;
  const coverPng = await generatePdfCoverThumbnail(input.pdfBuffer);
  if (coverPng) {
    await writeFile(path.join(outDir, libraryCoverFileName()), coverPng);
    coverUrl = `/api/library/${input.slug}/cover`;
  }

  const pageCount = input.pageCount;
  const status = input.publish !== false ? "ready" : "pending_review";
  const pdfUrl = `/api/library/${input.slug}/file`;

  await writeFile(
    path.join(outDir, "meta.json"),
    JSON.stringify(
      {
        id: input.slug,
        title: input.title,
        author: input.author,
        category: input.category || "education",
        description: input.description,
        status,
        pdfUrl,
        coverUrl,
        pageCount,
        license: input.license || "owner",
        importedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );

  await upsertImportedCatalog(input.slug, {
    id: input.slug,
    title: input.title,
    author: input.author,
    category: input.category || "education",
    description: input.description,
    status,
    pdfUrl,
    coverUrl,
    pageCount,
    license: input.license || "owner",
  });

  return { slug: input.slug, pageCount, coverUrl };
}
