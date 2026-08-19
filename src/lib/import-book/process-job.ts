import { after } from "next/server";
import { canAccessEditorialTools, isEnvAdminEmail, type UserRole } from "@/lib/roles";
import { countPayloadStats } from "@/lib/import-book/rows-to-payload";
import { importIrabBookToDisk } from "@/lib/import-book/import-to-disk";
import {
  fetchGoogleSheetPayload,
  parseUploadToPayload,
} from "@/lib/import-book/parse-upload";
import { slugifyBookTitle } from "@/lib/import-book/slug";
import type { ImportSourceKind } from "@/lib/import-book/types";
import { getUserDb } from "@/lib/local-user-db";
import {
  createBookImportJob,
  updateBookImportJob,
} from "@/lib/local-user-db/book-import-jobs";

const ERROR_AR: Record<string, string> = {
  unsupported_file_type:
    "نوع الملف غير مدعوم. استخدم Word (.docx) أو Excel (.xlsx) أو CSV أو PDF أو JSON.",
  invalid_json: "ملف JSON غير صالح — راجع الدليل.",
  no_rows_parsed:
    "لم نستطع قراءة جدول الإعراب. تأكد من أعمدة: سورة · آية · wordId · إعراب.",
  doc_no_verse_structure:
    "لم نجد آيات بصيغة 1:1 في Word/PDF. جرّب Excel أو Google Sheets.",
  empty_workbook: "ملف Excel فارغ.",
  empty_csv: "ملف CSV فارغ.",
  invalid_google_sheet_url: "رابط Google Sheets غير صحيح.",
  google_sheet_fetch_failed:
    "تعذّر جلب Google Sheets. اجعل الملف «أي شخص لديه الرابط».",
  payload_too_large: "الملف كبير جدًا (الحد 15 ميغابايت).",
};

function userIdFromEmail(email: string): string {
  return email.trim().toLowerCase();
}

function canAutoPublish(role: string, email: string): boolean {
  const r = role as UserRole;
  return isEnvAdminEmail(email) || canAccessEditorialTools(r);
}

async function runImportJob(input: {
  jobId: string;
  userId: string;
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
  try {
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
  buffer?: Buffer;
  filename?: string;
  sourceKind: ImportSourceKind;
  googleSheetUrl?: string;
}): { jobId: string; slug: string } {
  const db = getUserDb();
  const userId = userIdFromEmail(input.email);
  const slug = input.slug || slugifyBookTitle(input.title);
  const job = createBookImportJob(db, {
    userId,
    title: input.title,
    slug,
    filename: input.filename ?? input.googleSheetUrl ?? null,
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
      buffer: input.buffer,
      filename: input.filename,
      sourceKind: input.sourceKind,
      googleSheetUrl: input.googleSheetUrl,
    });
  });

  return { jobId: job.id, slug };
}

export { ERROR_AR, canAutoPublish };
