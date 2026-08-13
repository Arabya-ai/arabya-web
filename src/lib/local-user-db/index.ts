import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Bookmark } from "@/lib/bookmarks";
import type { AyahNote } from "@/lib/ayah-notes";
import type {
  AdminStats,
  AdminUserRow,
  CloudSiteAppearance,
  RoleRequestRow,
  SourceUploadRow,
  SyncPayload,
} from "@/lib/cloud-sync";
import type { StudyEntry } from "@/lib/study-archive";
import {
  isSuperAdminEmail,
  type UserRole,
} from "@/lib/roles";

type SqliteDb = Database.Database;

const SCHEMA_SQL = fs.readFileSync(
  path.join(process.cwd(), "src/lib/local-user-db/schema.sql"),
  "utf8",
);

const SITE_APPEARANCE_KEY = "appearance";
const DEFAULT_APPEARANCE: CloudSiteAppearance = {
  footerCreditAr: "© {year} منصة عربية · جميع الحقوق محفوظة لكل مسلم",
  footerCreditEn: "© {year} Arabya · All rights reserved for every Muslim",
};

type UserProfile = {
  email: string;
  name?: string | null;
  image?: string | null;
};

let dbSingleton: SqliteDb | null = null;

function truthyEnv(name: string): boolean {
  const raw = (process.env[name] || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function isLocalUserSyncEnabled(): boolean {
  return truthyEnv("ARABYA_USER_SYNC_ENABLED");
}

export function resolveUserDbPath(): string {
  const fromEnv = process.env.ARABYA_USER_DB_PATH?.trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "data", "user-data.sqlite");
}

export function getUserDb(): SqliteDb {
  if (dbSingleton) return dbSingleton;
  const dbPath = resolveUserDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  dbSingleton = db;
  return db;
}

/** Test helper — closes singleton and optionally removes file. */
export function resetUserDbForTests(options?: { deleteFile?: boolean }): void {
  if (dbSingleton) {
    dbSingleton.close();
    dbSingleton = null;
  }
  if (options?.deleteFile) {
    const dbPath = resolveUserDbPath();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
    if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
  }
}

function userIdFromEmail(email: string): string {
  return email.trim().toLowerCase();
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function makeUid(): string {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRole(role: unknown): UserRole {
  if (role === "admin" || role === "editor" || role === "creator") return role;
  return "member";
}

function isProtectedAdmin(email: string): boolean {
  return isSuperAdminEmail(email);
}

function upsertUserProfile(
  db: SqliteDb,
  email: string,
  name: string | null,
  image: string | null,
  fallbackRole: UserRole = "member",
): { id: string; role: UserRole; status: string } {
  const id = userIdFromEmail(email);
  const now = Date.now();
  const existing = db
    .prepare(`SELECT role, status, uid FROM users WHERE id = ?`)
    .get(id) as { role: string; status: string; uid: string | null } | undefined;

  if (existing) {
    if (!existing.uid) {
      db.prepare(
        `UPDATE users SET uid = ? WHERE id = ? AND (uid IS NULL OR uid = '')`,
      ).run(makeUid(), id);
    }
    db.prepare(
      `UPDATE users SET name = ?, image = ?, last_seen_at = ?, updated_at = ? WHERE id = ?`,
    ).run(name, image, now, now, id);
    return {
      id,
      role: normalizeRole(existing.role),
      status: existing.status || "active",
    };
  }

  const uid = makeUid();
  db.prepare(
    `INSERT INTO users (id, email, name, image, role, status, uid, last_seen_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
  ).run(id, id, name, image, fallbackRole, uid, now, now, now);
  return { id, role: fallbackRole, status: "active" };
}

function getUserRole(
  db: SqliteDb,
  email: string,
): { role: UserRole; status: string } | null {
  const id = userIdFromEmail(email);
  const row = db
    .prepare(`SELECT role, status FROM users WHERE id = ?`)
    .get(id) as { role: string; status: string } | undefined;
  if (!row) return null;
  return { role: normalizeRole(row.role), status: row.status || "active" };
}

function writeAudit(
  db: SqliteDb,
  userId: string,
  actorId: string | null,
  fromRole: string | null,
  toRole: string,
  reason: string | null,
) {
  db.prepare(
    `INSERT INTO role_audit (id, user_id, actor_id, from_role, to_role, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(newId("aud"), userId, actorId, fromRole, toRole, reason, Date.now());
}

function pullAll(db: SqliteDb, userId: string) {
  const bookmarks = db
    .prepare(
      `SELECT key, surah_id as surahId, verse, page, saved_at as savedAt
       FROM bookmarks WHERE user_id = ? ORDER BY saved_at DESC`,
    )
    .all(userId) as Bookmark[];

  const notes = db
    .prepare(
      `SELECT key, surah_id as surahId, verse, body as text, updated_at as updatedAt
       FROM ayah_notes WHERE user_id = ? ORDER BY updated_at DESC`,
    )
    .all(userId) as AyahNote[];

  const study = db
    .prepare(
      `SELECT id, kind, title, query, surah_id as surahId, verse,
              word_index as wordIndex, snippet, notes, href,
              created_at as createdAt, updated_at as updatedAt
       FROM study_entries WHERE user_id = ? ORDER BY updated_at DESC`,
    )
    .all(userId) as StudyEntry[];

  const progress = db
    .prepare(
      `SELECT last_page as lastPage, habit_json as habitJson, updated_at as updatedAt
       FROM reading_progress WHERE user_id = ?`,
    )
    .get(userId) as
    | { lastPage: number | null; habitJson: string; updatedAt: number }
    | undefined;

  let habit: unknown = {};
  if (progress?.habitJson) {
    try {
      habit = JSON.parse(progress.habitJson);
    } catch {
      habit = {};
    }
  }

  return {
    bookmarks,
    notes,
    study,
    progress: {
      lastPage: progress?.lastPage ?? null,
      habit,
      updatedAt: progress?.updatedAt ?? null,
    },
  };
}

function pushAll(db: SqliteDb, userId: string, payload: SyncPayload) {
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM bookmarks WHERE user_id = ?`).run(userId);
    const insertBookmark = db.prepare(
      `INSERT INTO bookmarks (user_id, key, surah_id, verse, page, saved_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const b of payload.bookmarks.slice(0, 200)) {
      if (!b?.key) continue;
      insertBookmark.run(
        userId,
        String(b.key),
        Number(b.surahId) || 0,
        Number(b.verse) || 0,
        Number(b.page) || 1,
        Number(b.savedAt) || Date.now(),
      );
    }

    db.prepare(`DELETE FROM ayah_notes WHERE user_id = ?`).run(userId);
    const insertNote = db.prepare(
      `INSERT INTO ayah_notes (user_id, key, surah_id, verse, body, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const n of payload.notes.slice(0, 300)) {
      if (!n?.key) continue;
      const text = String(n.text ?? "").trim().slice(0, 4000);
      if (!text) continue;
      insertNote.run(
        userId,
        String(n.key),
        Number(n.surahId) || 0,
        Number(n.verse) || 0,
        text,
        Number(n.updatedAt) || Date.now(),
      );
    }

    db.prepare(`DELETE FROM study_entries WHERE user_id = ?`).run(userId);
    const insertStudy = db.prepare(
      `INSERT INTO study_entries (
         user_id, id, kind, title, query, surah_id, verse, word_index,
         snippet, notes, href, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const s of payload.study.slice(0, 200)) {
      if (!s?.id || !s?.title) continue;
      const kind =
        s.kind === "word" || s.kind === "quick" || s.kind === "ayah"
          ? s.kind
          : "quick";
      insertStudy.run(
        userId,
        String(s.id).slice(0, 64),
        kind,
        String(s.title).slice(0, 300),
        s.query ? String(s.query).slice(0, 300) : null,
        s.surahId != null ? Number(s.surahId) || null : null,
        s.verse != null ? Number(s.verse) || null : null,
        s.wordIndex != null ? Number(s.wordIndex) || null : null,
        s.snippet ? String(s.snippet).slice(0, 500) : null,
        String(s.notes ?? "").slice(0, 4000),
        s.href ? String(s.href).slice(0, 400) : null,
        Number(s.createdAt) || Date.now(),
        Number(s.updatedAt) || Date.now(),
      );
    }

    const habitJson = JSON.stringify(payload.progress?.habit ?? {});
    const lastPage =
      payload.progress?.lastPage == null
        ? null
        : Math.min(604, Math.max(1, Number(payload.progress.lastPage) || 1));
    const now = Date.now();
    db.prepare(
      `INSERT INTO reading_progress (user_id, last_page, habit_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         last_page = excluded.last_page,
         habit_json = excluded.habit_json,
         updated_at = excluded.updated_at`,
    ).run(userId, lastPage, habitJson, now);
  });
  tx();
}

function ensureAdminRole(db: SqliteDb, email: string, role: UserRole) {
  if (isProtectedAdmin(email) && role !== "admin") {
    db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(
      userIdFromEmail(email),
    );
    writeAudit(db, userIdFromEmail(email), email, role, "admin", "ensure_admin");
    return "admin" as UserRole;
  }
  return role;
}

function syncUserContext(db: SqliteDb, user: UserProfile) {
  const email = user.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("email_required");
  const fallbackRole: UserRole = isProtectedAdmin(email) ? "admin" : "member";
  const { id: userId, role, status } = upsertUserProfile(
    db,
    email,
    user.name ?? null,
    user.image ?? null,
    fallbackRole,
  );
  if (status === "banned") throw new Error("account_banned");
  const finalRole = ensureAdminRole(db, email, role);
  return { userId, role: finalRole };
}

export function localFetchRoleStatus(email: string): {
  role: UserRole | null;
  banned: boolean;
} {
  const db = getUserDb();
  if (isProtectedAdmin(email)) {
    upsertUserProfile(db, email, null, null, "admin");
    db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(
      userIdFromEmail(email),
    );
    return { role: "admin", banned: false };
  }
  const info = getUserRole(db, email);
  return {
    role: info?.role ?? "member",
    banned: info?.status === "banned",
  };
}

export function localPullSync(user: UserProfile) {
  const db = getUserDb();
  const { userId, role } = syncUserContext(db, user);
  const data = pullAll(db, userId);
  const info = getUserRole(db, user.email);
  return {
    ok: true as const,
    userId,
    role: info?.role ?? role,
    ...data,
  };
}

export function localPushSync(user: UserProfile, payload: SyncPayload) {
  const db = getUserDb();
  const { userId, role } = syncUserContext(db, user);
  pushAll(db, userId, payload);
  const data = pullAll(db, userId);
  const info = getUserRole(db, user.email);
  return {
    ok: true as const,
    userId,
    role: info?.role ?? role,
    ...data,
  };
}

function sanitizeCreditText(raw: string, fallback: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.slice(0, 240);
}

export function localReadSiteAppearance(): CloudSiteAppearance {
  const db = getUserDb();
  try {
    const row = db
      .prepare(
        `SELECT value, updated_at as updatedAt, updated_by as updatedBy
         FROM site_settings WHERE key = ?`,
      )
      .get(SITE_APPEARANCE_KEY) as
      | { value: string; updatedAt: number; updatedBy: string | null }
      | undefined;
    if (!row?.value) return { ...DEFAULT_APPEARANCE };
    const parsed = JSON.parse(row.value) as Partial<CloudSiteAppearance>;
    return {
      footerCreditAr: sanitizeCreditText(
        String(parsed.footerCreditAr || ""),
        DEFAULT_APPEARANCE.footerCreditAr,
      ),
      footerCreditEn: sanitizeCreditText(
        String(parsed.footerCreditEn || ""),
        DEFAULT_APPEARANCE.footerCreditEn,
      ),
      updatedAt: row.updatedAt ?? null,
      updatedBy: row.updatedBy ?? null,
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function localWriteSiteAppearance(
  actorEmail: string,
  input: { footerCreditAr: string; footerCreditEn: string },
): CloudSiteAppearance {
  const db = getUserDb();
  const now = Date.now();
  const appearance: CloudSiteAppearance = {
    footerCreditAr: sanitizeCreditText(
      input.footerCreditAr,
      DEFAULT_APPEARANCE.footerCreditAr,
    ),
    footerCreditEn: sanitizeCreditText(
      input.footerCreditEn,
      DEFAULT_APPEARANCE.footerCreditEn,
    ),
    updatedAt: now,
    updatedBy: actorEmail,
  };
  db.prepare(
    `INSERT INTO site_settings (key, value, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
  ).run(SITE_APPEARANCE_KEY, JSON.stringify(appearance), now, actorEmail);
  return appearance;
}

export function localGetRoleRequest(email: string) {
  const db = getUserDb();
  const userId = userIdFromEmail(email);
  upsertUserProfile(db, email, null, null);
  const latest = db
    .prepare(
      `SELECT id, status, message, review_note as reviewNote,
              COALESCE(target_role, 'editor') as targetRole,
              created_at as createdAt, updated_at as updatedAt
       FROM role_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId) as RoleRequestRow | undefined;
  return { request: latest ?? null };
}

export function localCreateRoleRequest(
  user: UserProfile,
  message: string,
  targetRole: "editor" | "admin" = "editor",
) {
  const db = getUserDb();
  const { id: userId } = upsertUserProfile(
    db,
    user.email,
    user.name ?? null,
    user.image ?? null,
  );
  const info = getUserRole(db, user.email);
  const role = targetRole === "admin" ? "admin" : "editor";
  if (role === "editor" && info?.role !== "member") {
    throw new Error("already_elevated");
  }
  if (role === "admin" && info?.role !== "editor") {
    throw new Error("editor_required_for_admin_request");
  }
  const pending = db
    .prepare(
      `SELECT id FROM role_requests WHERE user_id = ? AND status = 'pending' LIMIT 1`,
    )
    .get(userId);
  if (pending) throw new Error("already_pending");

  const now = Date.now();
  const id = newId("req");
  db.prepare(
    `INSERT INTO role_requests (id, user_id, message, status, target_role, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
  ).run(id, userId, message.trim().slice(0, 500), role, now, now);
  return { id, status: "pending", targetRole: role };
}

export function localAdminStats(): AdminStats {
  const db = getUserDb();
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) as totalUsers,
         SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
         SUM(CASE WHEN role = 'editor' THEN 1 ELSE 0 END) as editors,
         SUM(CASE WHEN role = 'creator' THEN 1 ELSE 0 END) as creators,
         SUM(CASE WHEN role IN ('user', 'member') THEN 1 ELSE 0 END) as users
       FROM users`,
    )
    .get() as {
    totalUsers: number;
    admins: number;
    editors: number;
    creators: number;
    users: number;
  };

  const pending = db
    .prepare(`SELECT COUNT(*) as c FROM role_requests WHERE status = 'pending'`)
    .get() as { c: number };
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = db
    .prepare(
      `SELECT COUNT(*) as c FROM users WHERE last_seen_at IS NOT NULL AND last_seen_at >= ?`,
    )
    .get(weekAgo) as { c: number };
  const bookmarks = db
    .prepare(`SELECT COUNT(*) as c FROM bookmarks`)
    .get() as { c: number };
  const notes = db
    .prepare(`SELECT COUNT(*) as c FROM ayah_notes`)
    .get() as { c: number };

  return {
    totalUsers: Number(totals?.totalUsers || 0),
    admins: Number(totals?.admins || 0),
    editors: Number(totals?.editors || 0),
    creators: Number(totals?.creators || 0),
    users: Number(totals?.users || 0),
    pendingRoleRequests: Number(pending?.c || 0),
    activeLast7Days: Number(recent?.c || 0),
    totalBookmarks: Number(bookmarks?.c || 0),
    totalNotes: Number(notes?.c || 0),
  };
}

export function localAdminListUsers(opts: {
  q?: string;
  role?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getUserDb();
  const needle = (opts.q || "").trim().toLowerCase();
  const role = opts.role || "";
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const offset = Math.max(0, opts.offset ?? 0);

  let sql = `SELECT id, uid, email, name, image, role, status, last_seen_at as lastSeenAt,
                    created_at as createdAt, updated_at as updatedAt
             FROM users WHERE 1=1`;
  const binds: (string | number)[] = [];

  if (needle) {
    sql += ` AND (email LIKE ? OR IFNULL(name, '') LIKE ? OR IFNULL(uid, '') LIKE ? OR id LIKE ?)`;
    binds.push(`%${needle}%`, `%${needle}%`, `%${needle}%`, `%${needle}%`);
  }
  if (role === "member" || role === "user") {
    sql += ` AND role IN ('member', 'user')`;
  } else if (role === "creator" || role === "editor" || role === "admin") {
    sql += ` AND role = ?`;
    binds.push(role);
  }
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  binds.push(limit, offset);

  const users = db.prepare(sql).all(...binds) as AdminUserRow[];

  let countSql = `SELECT COUNT(*) as c FROM users WHERE 1=1`;
  const countBinds: (string | number)[] = [];
  if (needle) {
    countSql += ` AND (email LIKE ? OR IFNULL(name, '') LIKE ? OR IFNULL(uid, '') LIKE ? OR id LIKE ?)`;
    countBinds.push(`%${needle}%`, `%${needle}%`, `%${needle}%`, `%${needle}%`);
  }
  if (role === "member" || role === "user") {
    countSql += ` AND role IN ('member', 'user')`;
  } else if (role === "creator" || role === "editor" || role === "admin") {
    countSql += ` AND role = ?`;
    countBinds.push(role);
  }
  const total = db.prepare(countSql).get(...countBinds) as { c: number };

  return { users, total: Number(total?.c || 0), limit, offset };
}

export function localAdminGetUser(userId: string) {
  const db = getUserDb();
  const id = userIdFromEmail(userId);
  const user = db
    .prepare(
      `SELECT id, uid, email, name, image, role, status, last_seen_at as lastSeenAt,
              created_at as createdAt, updated_at as updatedAt
       FROM users WHERE id = ?`,
    )
    .get(id) as AdminUserRow | undefined;
  if (!user) return null;
  const bm = db
    .prepare(`SELECT COUNT(*) as c FROM bookmarks WHERE user_id = ?`)
    .get(id) as { c: number };
  const notes = db
    .prepare(`SELECT COUNT(*) as c FROM ayah_notes WHERE user_id = ?`)
    .get(id) as { c: number };
  return {
    user,
    bookmarkCount: Number(bm?.c || 0),
    noteCount: Number(notes?.c || 0),
  };
}

export function localStudioListUploads(): { uploads: SourceUploadRow[] } {
  const db = getUserDb();
  const uploads = db
    .prepare(
      `SELECT id, uploader_id as uploaderId, filename, kind, notes, status,
              created_at as createdAt, length(payload) as bytes
       FROM source_uploads ORDER BY created_at DESC LIMIT 50`,
    )
    .all() as SourceUploadRow[];
  return { uploads };
}

export function localStudioCreateUpload(
  actorEmail: string,
  input: { filename: string; payload: string; notes?: string; kind?: string },
) {
  const db = getUserDb();
  const actor = getUserRole(db, actorEmail);
  const elevated =
    isProtectedAdmin(actorEmail) ||
    actor?.role === "admin" ||
    actor?.role === "editor";
  if (!elevated || actor?.status === "banned") throw new Error("studio_required");

  const payload = String(input.payload || "");
  if (!payload || payload.length > 500_000) {
    throw new Error("payload_too_large_or_empty");
  }
  JSON.parse(payload);

  const id = newId("src");
  const now = Date.now();
  db.prepare(
    `INSERT INTO source_uploads (id, uploader_id, filename, kind, payload, notes, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(
    id,
    actorEmail,
    String(input.filename || "upload.json").slice(0, 200),
    String(input.kind || "json").slice(0, 40),
    payload,
    String(input.notes || "").slice(0, 500),
    now,
  );
  return { id, status: "pending" };
}

export function localAdminBanUser(
  actorEmail: string,
  userId: string,
  banned: boolean,
  reason?: string,
) {
  const db = getUserDb();
  const targetId = userIdFromEmail(userId);
  if (isProtectedAdmin(targetId) || isSuperAdminEmail(targetId)) {
    throw new Error("cannot_ban_protected_admin");
  }
  if (targetId === userIdFromEmail(actorEmail)) {
    throw new Error("cannot_ban_self");
  }
  const status = banned ? "banned" : "active";
  const now = Date.now();
  db.prepare(`UPDATE users SET status = ?, updated_at = ? WHERE id = ?`).run(
    status,
    now,
    targetId,
  );
  writeAudit(
    db,
    targetId,
    actorEmail,
    null,
    status,
    (reason || (banned ? "ban" : "unban")).slice(0, 300),
  );
  return { status };
}

export function localAdminSetRole(
  actorEmail: string,
  userId: string,
  role: UserRole | "user",
  reason?: string,
) {
  const db = getUserDb();
  const targetId = userIdFromEmail(userId);
  const toRole = role === "user" ? "member" : role;
  if (!isSuperAdminEmail(actorEmail)) {
    throw new Error("super_admin_required");
  }
  if (toRole === "admin" && !isSuperAdminEmail(targetId)) {
    throw new Error("admin_reserved_for_super_admin");
  }
  if (isProtectedAdmin(targetId) && toRole !== "admin") {
    throw new Error("cannot_change_protected_admin");
  }
  if (isSuperAdminEmail(targetId) && toRole !== "admin") {
    throw new Error("cannot_demote_super_admin");
  }
  if (
    userIdFromEmail(actorEmail) === targetId &&
    toRole !== "admin"
  ) {
    throw new Error("cannot_demote_self");
  }

  const existing = db
    .prepare(`SELECT role FROM users WHERE id = ?`)
    .get(targetId) as { role: string } | undefined;
  if (!existing) throw new Error("not_found");

  const fromRole = normalizeRole(existing.role);
  if (fromRole === toRole) return { role: toRole, fromRole, unchanged: true };

  const now = Date.now();
  db.prepare(`UPDATE users SET role = ?, updated_at = ? WHERE id = ?`).run(
    toRole,
    now,
    targetId,
  );
  writeAudit(
    db,
    targetId,
    actorEmail,
    fromRole,
    toRole,
    (reason || "admin_set_role").slice(0, 300),
  );

  if (toRole === "editor" || toRole === "admin") {
    db.prepare(
      `UPDATE role_requests SET status = 'approved', reviewed_by = ?, updated_at = ?
       WHERE user_id = ? AND status = 'pending'`,
    ).run(actorEmail, now, targetId);
  }

  return { role: toRole, fromRole };
}

export function localAdminDeleteUser(
  actorEmail: string,
  userId: string,
  reason?: string,
) {
  const db = getUserDb();
  const targetId = userIdFromEmail(userId);
  if (isProtectedAdmin(targetId)) throw new Error("cannot_delete_protected_admin");
  if (targetId === userIdFromEmail(actorEmail)) {
    throw new Error("cannot_delete_self");
  }
  writeAudit(
    db,
    targetId,
    actorEmail,
    null,
    "deleted",
    (reason || "admin_delete").slice(0, 300),
  );
  db.prepare(`DELETE FROM users WHERE id = ?`).run(targetId);
  return { deleted: targetId };
}

export function localAdminListRoleRequests(status = "pending") {
  const db = getUserDb();
  const requests = db
    .prepare(
      `SELECT r.id, r.user_id as userId, r.message, r.status, r.review_note as reviewNote,
              COALESCE(r.target_role, 'editor') as targetRole,
              r.created_at as createdAt, r.updated_at as updatedAt,
              u.name, u.email, u.image
       FROM role_requests r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE (? = 'all' OR r.status = ?)
       ORDER BY r.created_at DESC
       LIMIT 100`,
    )
    .all(status, status) as RoleRequestRow[];
  return { requests };
}

export function localAdminReviewRoleRequest(
  actorEmail: string,
  requestId: string,
  decision: "approved" | "rejected",
  reviewNote?: string,
) {
  const db = getUserDb();
  const req = db
    .prepare(
      `SELECT id, user_id as userId, status, COALESCE(target_role, 'editor') as targetRole
       FROM role_requests WHERE id = ?`,
    )
    .get(requestId) as
    | { id: string; userId: string; status: string; targetRole: string }
    | undefined;
  if (!req) throw new Error("not_found");
  if (req.status !== "pending") throw new Error("not_pending");
  if (req.targetRole === "admin" && decision === "approved") {
    throw new Error("admin_not_requestable");
  }

  const toRole: UserRole =
    req.targetRole === "creator" ? "creator" : "editor";
  const now = Date.now();
  const note = (reviewNote || "").trim().slice(0, 500);
  db.prepare(
    `UPDATE role_requests SET status = ?, reviewed_by = ?, review_note = ?, updated_at = ?
     WHERE id = ?`,
  ).run(decision, actorEmail, note, now, requestId);

  if (decision === "approved") {
    if (isProtectedAdmin(req.userId)) {
      throw new Error("cannot_change_protected_admin");
    }
    const existing = db
      .prepare(`SELECT role FROM users WHERE id = ?`)
      .get(req.userId) as { role: string } | undefined;
    const fromRole = normalizeRole(existing?.role);
    db.prepare(`UPDATE users SET role = ?, updated_at = ? WHERE id = ?`).run(
      toRole,
      now,
      req.userId,
    );
    writeAudit(db, req.userId, actorEmail, fromRole, toRole, note || "role_request");
  }

  return { decision };
}

export function localAdminListAudit() {
  const db = getUserDb();
  const entries = db
    .prepare(
      `SELECT id, user_id as userId, actor_id as actorId, from_role as fromRole,
              to_role as toRole, reason, created_at as createdAt
       FROM role_audit ORDER BY created_at DESC LIMIT 200`,
    )
    .all();
  return { entries };
}

export function localAdminGetPortfolio(actorEmail: string, userId: string) {
  if (!isSuperAdminEmail(actorEmail)) throw new Error("super_admin_required");
  const db = getUserDb();
  const targetId = userIdFromEmail(userId);
  const detail = localAdminGetUser(targetId);
  if (!detail) throw new Error("not_found");
  const data = pullAll(db, targetId);
  return {
    ...detail,
    bookmarks: data.bookmarks,
    notes: data.notes,
    study: data.study,
    progress: data.progress,
  };
}
