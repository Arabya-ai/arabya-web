import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { importReadingBookFromDrive, importReadingBookToDisk } from "@/lib/library/import-to-disk";
import { resolveGoogleDriveUrls } from "@/lib/library/google-drive";
import { deleteLibraryWork, updateLibraryWorkMeta } from "@/lib/library/manage";
import { countPdfPages } from "@/lib/library/pdf-meta";
import { requireEditorial } from "@/lib/require-role";
import type { LibraryWorkMeta } from "@/lib/library/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;

type RouteCtx = { params: Promise<{ slug: string }> };

function str(form: FormData, key: string): string | undefined {
  const v = String(form.get(key) || "").trim();
  return v || undefined;
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const gate = await requireEditorial();
  if ("error" in gate) return gate.error;
  const { slug } = await ctx.params;
  if (!slug) return apiError("not_found", 404);

  const contentType = req.headers.get("content-type") || "";
  let patch: Partial<LibraryWorkMeta> = {};
  let googleDriveUrl: string | undefined;
  let pdfBuffer: Buffer | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    patch = {
      title: str(form, "title"),
      titleEn: str(form, "titleEn"),
      author: str(form, "author"),
      category: str(form, "category"),
      description: str(form, "description"),
      descriptionEn: str(form, "descriptionEn"),
      publisher: str(form, "publisher"),
      publishedAt: str(form, "publishedAt"),
    };
    const pages = str(form, "pageCount");
    if (pages) {
      const n = Number.parseInt(pages, 10);
      if (Number.isFinite(n) && n > 0) patch.pageCount = n;
    }
    googleDriveUrl = str(form, "googleDriveUrl");
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) return apiError("payload_too_large", 413);
      pdfBuffer = Buffer.from(await file.arrayBuffer());
    }
  } else {
    try {
      patch = (await req.json()) as Partial<LibraryWorkMeta>;
      googleDriveUrl = typeof patch.externalUrl === "string" ? patch.externalUrl : undefined;
    } catch {
      return apiError("invalid_json", 400);
    }
  }

  if (googleDriveUrl) {
    const resolved = resolveGoogleDriveUrls(googleDriveUrl);
    if (!resolved) return apiError("invalid_google_drive_url", 400);
    await importReadingBookFromDrive({
      slug,
      title: patch.title || slug,
      titleEn: patch.titleEn,
      author: patch.author,
      category: patch.category,
      description: patch.description,
      publisher: patch.publisher,
      pageCount: patch.pageCount,
      previewUrl: resolved.previewUrl,
      shareUrl: googleDriveUrl,
      thumbnailUrl: resolved.thumbnailUrl,
      publish: true,
    });
  } else if (pdfBuffer) {
    const pageCount = patch.pageCount ?? (await countPdfPages(pdfBuffer));
    await importReadingBookToDisk({
      slug,
      title: patch.title || slug,
      titleEn: patch.titleEn,
      author: patch.author,
      category: patch.category,
      description: patch.description,
      publisher: patch.publisher,
      pdfBuffer,
      pageCount,
      publish: true,
    });
  } else {
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined && v !== ""),
    ) as Partial<LibraryWorkMeta>;
    await updateLibraryWorkMeta(slug, cleaned);
  }

  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const gate = await requireEditorial();
  if ("error" in gate) return gate.error;
  const { slug } = await ctx.params;
  if (!slug) return apiError("not_found", 404);
  await deleteLibraryWork(slug);
  return NextResponse.json({ ok: true });
}
