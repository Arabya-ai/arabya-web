import { after } from "next/server";
import { canAccessEditorialTools, isEnvAdminEmail, type UserRole } from "@/lib/roles";
import { countPayloadStats } from "@/lib/import-book/rows-to-payload";
import { importIrabBookToDisk } from "@/lib/import-book/import-to-disk";
import {
  fetchGoogleSheetPayload,
  parseUploadToPayload,
} from "@/lib/import-book/parse-upload";
import { slugifyBookTitle } from "@/lib/import-book/slug";
import type { BookKind, ImportSourceKind } from "@/lib/import-book/types";
import { getUserDb } from "@/lib/local-user-db";
import {
  createBookImportJob,
  updateBookImportJob,
} from "@/lib/local-user-db/book-import-jobs";
import { importReadingBookToDisk, importReadingBookFromDrive } from "@/lib/library/import-to-disk";
import { countPdfPages } from "@/lib/library/pdf-meta";
import { resolveGoogleDriveUrls } from "@/lib/library/google-drive";
import { normalizeLibraryCategory } from "@/lib/library/categories";

const ERROR_AR: Record<string, string> = {
  unsupported_file_type:
    "نوع الملف غير مدعوم. استخدم Word (.docx) أو Excel (.xlsx) أو CSV أو PDF أو JSON.",
  reading_pdf_only:
    "كتب القراءة التعليمية: ارفع ملف PDF فقط (مثل كتاب نحو أو صرف).",
  invalid_json: "ملف JSON غير صالح — راجع الدليل.",
  no_rows_parsed:
    "لم نستطع قراءة جدول الإعراب. تأكد من أعمدة: سورة · آية · wordId · إعراب.",
  doc_no_verse_structure:
    "لم نجد آيات بصيغة 1:1 في Word/PDF. جرّب Excel أو Google Sheets، أو اختر «كتاب تعليمي للقراءة» لرفع PDF.",
  empty_workbook: "ملف Excel فارغ.",
  empty_csv: "ملف CSV فارغ.",
  invalid_google_sheet_url: "رابط Google Sheets غير صحيح.",
  google_sheet_fetch_failed:
    "تعذّر جلب Google Sheets. اجعل الملف «أي شخص لديه الرابط».",
  invalid_google_drive_url:
    "رابط Google Drive غير صحيح. الصق رابط مشاركة ملف PDF.",
  payload_too_large: "الملف كبير جدًا (الحد 15 ميغابايت).",
};

export type ReadingBookImportMeta = {
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

function userIdFromEmail(email: string): string {
  return email.trim().toLowerCase();
}

function canAutoPublish(role: string, email: string): boolean {
  const r = role as UserRole;
  return isEnvAdminEmail(email) || canAccessEditorialTools(r);
}

async function runReadingImport(input: {
  jobId: string;
  title: string;
  slug: string;
  buffer?: Buffer;
  googleDriveUrl?: string;
  meta: ReadingBookImportMeta;
  publish: boolean;
}) {
  const db = getUserDb();
  const shared = {
    slug: input.slug,
    title: input.title,
    titleEn: input.meta.titleEn,
    author: input.meta.author,
    category: normalizeLibraryCategory(input.meta.category),
    description: input.meta.description,
    descriptionEn: input.meta.descriptionEn,
    publisher: input.meta.publisher,
    publishedAt: input.meta.publishedAt,
    license: input.meta.license,
    publish: input.publish,
  };

  if (input.googleDriveUrl) {
    const resolved = resolveGoogleDriveUrls(input.googleDriveUrl);
    if (!resolved) throw new Error("invalid_google_drive_url");
    await importReadingBookFromDrive({
      ...shared,
      previewUrl: resolved.previewUrl,
      shareUrl: input.googleDriveUrl.trim(),
      thumbnailUrl: resolved.thumbnailUrl,
      pageCount: input.meta.pageCount,
    });
    updateBookImportJob(db, input.jobId, {
      status: input.publish ? "ready" : "pending_review",
      message: input.publish
        ? "تم النشر — عرض من Google Drive"
        : "تم الحفظ — بانتظار مراجعة المدير (Google Drive)",
      verseCount: input.meta.pageCount ?? 0,
      wordCount: 0,
      published: input.publish,
    });
    return;
  }

  if (!input.buffer) throw new Error("reading_pdf_only");
  const pageCount =
    input.meta.pageCount ?? (await countPdfPages(input.buffer));
  await importReadingBookToDisk({
    ...shared,
    pdfBuffer: input.buffer,
    pageCount,
  });
  updateBookImportJob(db, input.jobId, {
    status: input.publish ? "ready" : "pending_review",
    message: input.publish
      ? `تم النشر في المكتبة${pageCount ? ` — ${pageCount} صفحة` : ""}`
      : `تم حفظ PDF — بانتظار مراجعة المدير${pageCount ? ` (${pageCount} صفحة)` : ""}`,
    verseCount: pageCount ?? 0,
    wordCount: 0,
    published: input.publish,
  });
}

async function runIrabImport(input: {
  jobId: string;
  email: string;
  role: string;
  title: string;
  slug: string;
  buffer?: Buffer;
  filename?: string;
  sourceKind: ImportSourceKind;
  googleSheetUrl?: string;
}) {
  const db = getUserDb();
  const { payload, kind } = input.googleSheetUrl
    ? await fetchGoogleSheetPayload(input.googleSheetUrl, input.title)
    : await parseUploadToPayload({
        buffer: input.buffer!,
        filename: input.filename || "upload",
        title: input.title,
        kind: input.sourceKind,
      });

  const stats = countPayloadStats(payload);
  const publish = canAutoPublish(input.role, input.email);

  if (publish) {
    await importIrabBookToDisk(input.slug, payload, { writeClaims: true });
    updateBookImportJob(db, input.jobId, {
      status: "ready",
      message: `تم النشر — ${stats.verseCount} آية · ${stats.wordCount} كلمة`,
      verseCount: stats.verseCount,
      wordCount: stats.wordCount,
      published: true,
    });
  } else {
    updateBookImportJob(db, input.jobId, {
      status: "pending_review",
      message: `تم التحويل (${kind}) — بانتظار مراجعة المدير (${stats.verseCount} آية)`,
      verseCount: stats.verseCount,
      wordCount: stats.wordCount,
      published: false,
    });
  }
}

async function runImportJob(input: {
  jobId: string;
  userId: string;
  email: string;
  role: string;
  title: string;
  slug: string;
  bookKind: BookKind;
  buffer?: Buffer;
  filename?: string;
  sourceKind: ImportSourceKind;
  googleSheetUrl?: string;
  googleDriveUrl?: string;
  readingMeta?: ReadingBookImportMeta;
}) {
  const db = getUserDb();
  try {
    const publish = canAutoPublish(input.role, input.email);

    if (input.bookKind === "reading") {
      if (input.sourceKind === "google_drive" && input.googleDriveUrl) {
        await runReadingImport({
          jobId: input.jobId,
          title: input.title,
          slug: input.slug,
          googleDriveUrl: input.googleDriveUrl,
          meta: input.readingMeta ?? {},
          publish,
        });
        return;
      }
      if (input.sourceKind !== "pdf" || !input.buffer) {
        throw new Error("reading_pdf_only");
      }
      await runReadingImport({
        jobId: input.jobId,
        title: input.title,
        slug: input.slug,
        buffer: input.buffer,
        meta: input.readingMeta ?? {},
        publish,
      });
      return;
    }

    await runIrabImport({
      jobId: input.jobId,
      email: input.email,
      role: input.role,
      title: input.title,
      slug: input.slug,
      buffer: input.buffer,
      filename: input.filename,
      sourceKind: input.sourceKind,
      googleSheetUrl: input.googleSheetUrl,
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "import_failed";
    updateBookImportJob(db, input.jobId, {
      status: "failed",
      message: ERROR_AR[code] || code,
      published: false,
    });
  }
}

export function queueBookImportJob(input: {
  email: string;
  role: string;
  title: string;
  slug?: string;
  bookKind?: BookKind;
  buffer?: Buffer;
  filename?: string;
  sourceKind: ImportSourceKind;
  googleSheetUrl?: string;
  googleDriveUrl?: string;
  readingMeta?: ReadingBookImportMeta;
}): { jobId: string; slug: string } {
  const db = getUserDb();
  const userId = userIdFromEmail(input.email);
  const slug = input.slug || slugifyBookTitle(input.title);
  const bookKind = input.bookKind ?? "irab";
  const job = createBookImportJob(db, {
    userId,
    title: input.title,
    slug,
    filename: input.filename ?? input.googleDriveUrl ?? input.googleSheetUrl ?? null,
    bookKind,
    sourceKind: input.sourceKind,
  });

  after(async () => {
    await runImportJob({
      jobId: job.id,
      userId,
      email: input.email,
      role: input.role,
      title: input.title,
      slug,
      bookKind,
      buffer: input.buffer,
      filename: input.filename,
      sourceKind: input.sourceKind,
      googleSheetUrl: input.googleSheetUrl,
      googleDriveUrl: input.googleDriveUrl,
      readingMeta: input.readingMeta,
    });
  });

  return { jobId: job.id, slug };
}

export { ERROR_AR, canAutoPublish };
