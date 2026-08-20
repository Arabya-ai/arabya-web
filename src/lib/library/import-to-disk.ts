import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureImportedLibraryRoot } from "@/lib/library/paths";
import {
  generatePdfCoverThumbnail,
  libraryCoverFileName,
} from "@/lib/library/pdf-cover";
import type { LibraryWorkMeta } from "@/lib/library/types";

type ReadingBookMetaInput = {
  slug: string;
  title: string;
  titleEn?: string;
  author?: string;
  category?: string;
  description?: string;
  descriptionEn?: string;
  publisher?: string;
  publishedAt?: string;
  pageCount?: number;
  license?: string;
  publish?: boolean;
};

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
    externalSource?: LibraryWorkMeta["externalSource"];
    externalUrl?: string;
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

function buildMetaRecord(
  input: ReadingBookMetaInput & {
    pdfUrl: string;
    coverUrl?: string;
    status: string;
    externalSource?: LibraryWorkMeta["externalSource"];
    externalUrl?: string;
  },
) {
  return {
    id: input.slug,
    title: input.title,
    titleEn: input.titleEn,
    author: input.author,
    category: input.category || "education",
    description: input.description,
    descriptionEn: input.descriptionEn,
    publisher: input.publisher,
    publishedAt: input.publishedAt,
    status: input.status,
    pdfUrl: input.pdfUrl,
    coverUrl: input.coverUrl,
    pageCount: input.pageCount,
    license: input.license || "owner",
    externalSource: input.externalSource,
    externalUrl: input.externalUrl,
    importedAt: new Date().toISOString(),
  };
}

export async function importReadingBookToDisk(
  input: ReadingBookMetaInput & { pdfBuffer: Buffer },
): Promise<{ slug: string; pageCount?: number; coverUrl?: string }> {
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
  const meta = buildMetaRecord({
    ...input,
    status,
    pdfUrl,
    coverUrl,
    pageCount,
  });

  await writeFile(
    path.join(outDir, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf8",
  );

  await upsertImportedCatalog(input.slug, {
    id: input.slug,
    title: input.title,
    titleEn: input.titleEn,
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

export async function importReadingBookFromDrive(
  input: ReadingBookMetaInput & {
    previewUrl: string;
    shareUrl: string;
    thumbnailUrl: string;
  },
): Promise<{ slug: string; coverUrl?: string }> {
  const root = ensureImportedLibraryRoot();
  const outDir = path.join(root, input.slug);
  await mkdir(outDir, { recursive: true });

  let coverUrl: string | undefined = input.thumbnailUrl;
  try {
    const res = await fetch(input.thumbnailUrl, { cache: "no-store" });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 500) {
        await writeFile(path.join(outDir, libraryCoverFileName()), buf);
        coverUrl = `/api/library/${input.slug}/cover`;
      }
    }
  } catch {
    /* use remote thumbnail url */
  }

  const status = input.publish !== false ? "ready" : "pending_review";
  const meta = buildMetaRecord({
    ...input,
    status,
    pdfUrl: input.previewUrl,
    coverUrl,
    externalSource: "google_drive",
    externalUrl: input.shareUrl,
  });

  await writeFile(
    path.join(outDir, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf8",
  );

  await upsertImportedCatalog(input.slug, {
    id: input.slug,
    title: input.title,
    titleEn: input.titleEn,
    author: input.author,
    category: input.category || "education",
    description: input.description,
    status,
    pdfUrl: input.previewUrl,
    coverUrl,
    pageCount: input.pageCount,
    license: input.license || "owner",
    externalSource: "google_drive",
    externalUrl: input.shareUrl,
  });

  return { slug: input.slug, coverUrl };
}
