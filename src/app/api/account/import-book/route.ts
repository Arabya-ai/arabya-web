import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";
import {
  detectKindFromFilename,
  googleSheetCsvExportUrl,
} from "@/lib/import-book/parse-upload";
import { slugifyBookTitle } from "@/lib/import-book/slug";
import type { BookKind, ImportSourceKind } from "@/lib/import-book/types";
import {
  queueBookImportJob,
  type ReadingBookImportMeta,
} from "@/lib/import-book/process-job";
import { resolveGoogleDriveUrls } from "@/lib/library/google-drive";
import { getUserDb, isLocalUserSyncEnabled } from "@/lib/local-user-db";
import {
  getBookImportJob,
  listBookImportJobsForUser,
} from "@/lib/local-user-db/book-import-jobs";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireEditorial, requireSession } from "@/lib/require-role";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;

function userIdFromEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function GET(req: Request) {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  if (!isCloudSyncConfigured() || !isLocalUserSyncEnabled()) {
    return apiError("not_configured", 503);
  }
  const limited = enforceRateLimitKey("book-import-list", gate.email, 60);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const db = getUserDb();
  const userId = userIdFromEmail(gate.email);

  if (jobId) {
    const job = getBookImportJob(db, jobId, userId);
    if (!job) return apiError("not_found", 404);
    return NextResponse.json({ ok: true, job });
  }

  const jobs = listBookImportJobsForUser(db, userId, 25);
  return NextResponse.json({ ok: true, jobs });
}

function parseReadingMeta(form: FormData | Record<string, unknown>): ReadingBookImportMeta {
  const get = (key: string) => {
    const v =
      form instanceof FormData
        ? String(form.get(key) || "").trim()
        : String((form as Record<string, unknown>)[key] || "").trim();
    return v || undefined;
  };
  const pageRaw = form instanceof FormData ? form.get("pageCount") : (form as Record<string, unknown>).pageCount;
  const pageCount =
    pageRaw != null && String(pageRaw).trim()
      ? Number.parseInt(String(pageRaw), 10)
      : undefined;
  return {
    titleEn: get("titleEn"),
    author: get("author"),
    category: get("category"),
    description: get("description"),
    descriptionEn: get("descriptionEn"),
    publisher: get("publisher"),
    publishedAt: get("publishedAt"),
    license: get("license"),
    pageCount: Number.isFinite(pageCount) && (pageCount as number) > 0 ? pageCount : undefined,
  };
}

export async function POST(req: Request) {
  // Uploads/parsing are CPU+disk heavy — editors/admins only (not every member).
  const gate = await requireEditorial();
  if ("error" in gate) return gate.error;
  if (!isCloudSyncConfigured() || !isLocalUserSyncEnabled()) {
    return apiError("not_configured", 503);
  }
  const limited = enforceRateLimitKey("book-import-post", gate.email, 12);
  if (limited) return limited;

  const contentType = req.headers.get("content-type") || "";
  let title = "";
  let slug: string | undefined;
  let bookKind: BookKind = "irab";
  let googleSheetUrl: string | undefined;
  let googleDriveUrl: string | undefined;
  let buffer: Buffer | undefined;
  let filename = "upload";
  let sourceKind: ImportSourceKind | null = null;
  let readingMeta: ReadingBookImportMeta = {};

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    title = String(form.get("title") || "").trim();
    const slugRaw = String(form.get("slug") || "").trim();
    slug = slugRaw ? slugifyBookTitle(slugRaw, slugRaw) : undefined;
    const kindRaw = String(form.get("bookKind") || "").trim();
    if (kindRaw === "reading") bookKind = "reading";
    googleSheetUrl = String(form.get("googleSheetUrl") || "").trim() || undefined;
    googleDriveUrl = String(form.get("googleDriveUrl") || "").trim() || undefined;
    readingMeta = parseReadingMeta(form);
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) return apiError("payload_too_large", 413);
      buffer = Buffer.from(await file.arrayBuffer());
      filename = file.name || "upload";
      sourceKind = detectKindFromFilename(filename);
    }
  } else {
    let body: {
      title?: string;
      slug?: string;
      bookKind?: BookKind;
      googleSheetUrl?: string;
      googleDriveUrl?: string;
      titleEn?: string;
      author?: string;
      category?: string;
      description?: string;
      descriptionEn?: string;
      publisher?: string;
      publishedAt?: string;
      pageCount?: number;
      license?: string;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return apiError("invalid_json", 400);
    }
    title = String(body.title || "").trim();
    slug = body.slug ? slugifyBookTitle(body.slug) : undefined;
    if (body.bookKind === "reading") bookKind = "reading";
    googleSheetUrl = String(body.googleSheetUrl || "").trim() || undefined;
    googleDriveUrl = String(body.googleDriveUrl || "").trim() || undefined;
    readingMeta = parseReadingMeta(body);
    if (googleSheetUrl) sourceKind = "google_sheet";
    if (googleDriveUrl) sourceKind = "google_drive";
  }

  if (!title || title.length < 2) {
    return apiError("title_required", 400);
  }

  if (googleSheetUrl) {
    if (!googleSheetCsvExportUrl(googleSheetUrl)) {
      return apiError("invalid_google_sheet_url", 400);
    }
    sourceKind = "google_sheet";
  }

  if (googleDriveUrl) {
    if (!resolveGoogleDriveUrls(googleDriveUrl)) {
      return apiError("invalid_google_drive_url", 400);
    }
    sourceKind = "google_drive";
  }

  if (!sourceKind) {
    if (!buffer) return apiError("file_required", 400);
    sourceKind = detectKindFromFilename(filename);
  }

  if (!sourceKind) {
    return apiError("unsupported_file_type", 400);
  }

  if (bookKind === "reading") {
    if (googleSheetUrl) return apiError("reading_pdf_only", 400);
    if (sourceKind === "google_drive") {
      /* drive link only — no file required */
    } else if (!buffer || sourceKind !== "pdf") {
      return apiError("reading_pdf_only", 400);
    }
  } else if (!buffer && !googleSheetUrl) {
    return apiError("file_required", 400);
  }

  const { jobId, slug: finalSlug } = queueBookImportJob({
    email: gate.email,
    role: gate.role,
    title,
    slug,
    bookKind,
    buffer,
    filename,
    sourceKind,
    googleSheetUrl,
    googleDriveUrl,
    readingMeta,
  });

  return NextResponse.json({
    ok: true,
    jobId,
    slug: finalSlug,
    status: "processing",
  });
}
