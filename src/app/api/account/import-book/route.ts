import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";
import {
  detectKindFromFilename,
  googleSheetCsvExportUrl,
} from "@/lib/import-book/parse-upload";
import { slugifyBookTitle } from "@/lib/import-book/slug";
import type { ImportSourceKind } from "@/lib/import-book/types";
import { queueBookImportJob } from "@/lib/import-book/process-job";
import { getUserDb, isLocalUserSyncEnabled } from "@/lib/local-user-db";
import {
  getBookImportJob,
  listBookImportJobsForUser,
} from "@/lib/local-user-db/book-import-jobs";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";

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

export async function POST(req: Request) {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  if (!isCloudSyncConfigured() || !isLocalUserSyncEnabled()) {
    return apiError("not_configured", 503);
  }
  const limited = enforceRateLimitKey("book-import-post", gate.email, 12);
  if (limited) return limited;

  const contentType = req.headers.get("content-type") || "";
  let title = "";
  let slug: string | undefined;
  let googleSheetUrl: string | undefined;
  let buffer: Buffer | undefined;
  let filename = "upload";
  let sourceKind: ImportSourceKind | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    title = String(form.get("title") || "").trim();
    const slugRaw = String(form.get("slug") || "").trim();
    slug = slugRaw ? slugifyBookTitle(slugRaw, slugRaw) : undefined;
    googleSheetUrl = String(form.get("googleSheetUrl") || "").trim() || undefined;
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
      googleSheetUrl?: string;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return apiError("invalid_json", 400);
    }
    title = String(body.title || "").trim();
    slug = body.slug ? slugifyBookTitle(body.slug) : undefined;
    googleSheetUrl = String(body.googleSheetUrl || "").trim() || undefined;
    if (googleSheetUrl) sourceKind = "google_sheet";
  }

  if (!title || title.length < 2) {
    return apiError("title_required", 400);
  }

  if (googleSheetUrl) {
    if (!googleSheetCsvExportUrl(googleSheetUrl)) {
      return apiError("invalid_google_sheet_url", 400);
    }
    sourceKind = "google_sheet";
  } else if (!buffer) {
    return apiError("file_required", 400);
  }

  if (!sourceKind) {
    return apiError("unsupported_file_type", 400);
  }

  const { jobId, slug: finalSlug } = queueBookImportJob({
    email: gate.email,
    role: gate.role,
    title,
    slug,
    buffer,
    filename,
    sourceKind,
    googleSheetUrl,
  });

  return NextResponse.json({
    ok: true,
    jobId,
    slug: finalSlug,
    status: "processing",
  });
}
