import type { getUserDb } from "@/lib/local-user-db";

type SqliteDb = ReturnType<typeof getUserDb>;
import type {
  BookImportJobRow,
  BookImportJobStatus,
  BookKind,
  ImportSourceKind,
} from "@/lib/import-book/types";

function newJobId(): string {
  return `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapRow(row: Record<string, unknown>): BookImportJobRow {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? row.userId),
    title: String(row.title),
    slug: String(row.slug),
    filename: row.filename != null ? String(row.filename) : null,
    bookKind: (String(row.book_kind ?? row.bookKind ?? "irab") ||
      "irab") as BookKind,
    sourceKind: String(row.source_kind ?? row.sourceKind) as ImportSourceKind,
    status: String(row.status) as BookImportJobStatus,
    message: row.message != null ? String(row.message) : null,
    verseCount: Number(row.verse_count ?? row.verseCount) || 0,
    wordCount: Number(row.word_count ?? row.wordCount) || 0,
    published: Boolean(row.published),
    createdAt: Number(row.created_at ?? row.createdAt) || 0,
    updatedAt: Number(row.updated_at ?? row.updatedAt) || 0,
  };
}

export function createBookImportJob(
  db: SqliteDb,
  input: {
    userId: string;
    title: string;
    slug: string;
    filename?: string | null;
    bookKind?: BookKind;
    sourceKind: ImportSourceKind;
  },
): BookImportJobRow {
  const id = newJobId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO book_import_jobs (
       id, user_id, title, slug, filename, book_kind, source_kind, status,
       verse_count, word_count, published, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', 0, 0, 0, ?, ?)`,
  ).run(
    id,
    input.userId,
    input.title.slice(0, 200),
    input.slug.slice(0, 64),
    input.filename ? input.filename.slice(0, 200) : null,
    input.bookKind ?? "irab",
    input.sourceKind,
    now,
    now,
  );
  return mapRow(
    db.prepare(`SELECT * FROM book_import_jobs WHERE id = ?`).get(id) as Record<
      string,
      unknown
    >,
  );
}

export function updateBookImportJob(
  db: SqliteDb,
  id: string,
  patch: {
    status?: BookImportJobStatus;
    message?: string | null;
    verseCount?: number;
    wordCount?: number;
    published?: boolean;
  },
): BookImportJobRow | null {
  const row = db
    .prepare(`SELECT * FROM book_import_jobs WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const now = Date.now();
  db.prepare(
    `UPDATE book_import_jobs SET
       status = ?,
       message = ?,
       verse_count = ?,
       word_count = ?,
       published = ?,
       updated_at = ?
     WHERE id = ?`,
  ).run(
    patch.status ?? row.status,
    patch.message !== undefined ? patch.message : row.message,
    patch.verseCount ?? row.verse_count,
    patch.wordCount ?? row.word_count,
    patch.published !== undefined ? (patch.published ? 1 : 0) : row.published,
    now,
    id,
  );
  return mapRow(
    db.prepare(`SELECT * FROM book_import_jobs WHERE id = ?`).get(id) as Record<
      string,
      unknown
    >,
  );
}

export function listBookImportJobsForUser(
  db: SqliteDb,
  userId: string,
  limit = 20,
): BookImportJobRow[] {
  const rows = db
    .prepare(
      `SELECT * FROM book_import_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export function getBookImportJob(
  db: SqliteDb,
  id: string,
  userId?: string,
): BookImportJobRow | null {
  const row = userId
    ? (db
        .prepare(`SELECT * FROM book_import_jobs WHERE id = ? AND user_id = ?`)
        .get(id, userId) as Record<string, unknown> | undefined)
    : (db
        .prepare(`SELECT * FROM book_import_jobs WHERE id = ?`)
        .get(id) as Record<string, unknown> | undefined);
  return row ? mapRow(row) : null;
}

export function deleteBookImportJobsForUser(db: SqliteDb, userId: string): number {
  const result = db
    .prepare(`DELETE FROM book_import_jobs WHERE user_id = ?`)
    .run(userId);
  return result.changes;
}
