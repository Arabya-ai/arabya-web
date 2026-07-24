/**
 * Arabya personal-data + admin sync Worker (Cloudflare + D1).
 * Called only by the Next.js app after Auth.js verifies the session.
 */

export interface Env {
  DB: D1Database;
  ARABYA_SYNC_SECRET: string;
  ARABYA_ADMIN_EMAILS?: string;
}

type BookmarkRow = {
  key: string;
  surahId: number;
  verse: number;
  page: number;
  savedAt: number;
};

type NoteRow = {
  key: string;
  surahId: number;
  verse: number;
  text: string;
  updatedAt: number;
};

type ProgressPayload = {
  lastPage: number | null;
  habit: unknown;
};

type UserRole = "user" | "editor" | "admin";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

function unauthorized(): Response {
  return json({ ok: false, error: "unauthorized" }, 401);
}

function forbidden(message = "forbidden"): Response {
  return json({ ok: false, error: "forbidden", message }, 403);
}

function badRequest(message: string): Response {
  return json({ ok: false, error: "bad_request", message }, 400);
}

function authorize(request: Request, env: Env): boolean {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return Boolean(env.ARABYA_SYNC_SECRET) && token === env.ARABYA_SYNC_SECRET;
}

function userIdFromEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseAdminEmails(raw: string | undefined): string[] {
  return (raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isProtectedAdmin(email: string, env: Env): boolean {
  if (isSuperAdmin(email)) return true;
  return parseAdminEmails(env.ARABYA_ADMIN_EMAILS).includes(
    email.trim().toLowerCase(),
  );
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRole(role: unknown): UserRole {
  if (role === "admin" || role === "editor" || role === "user") return role;
  return "user";
}

function isSuperAdmin(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e === "egywebdev@gmail.com" || e === "arabyaaicom@gmail.com";
}

function makeUid(): string {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Upsert profile without overwriting an existing role (D1 is role source of truth). */
async function upsertUserProfile(
  db: D1Database,
  email: string,
  name: string | null,
  image: string | null,
  fallbackRole: UserRole = "user",
): Promise<{ id: string; role: UserRole; status: string }> {
  const id = userIdFromEmail(email);
  const now = Date.now();
  const existing = await db
    .prepare(`SELECT role, status, uid FROM users WHERE id = ?`)
    .bind(id)
    .first<{ role: string; status: string; uid: string | null }>();

  if (existing) {
    if (!existing.uid) {
      await db
        .prepare(`UPDATE users SET uid = ? WHERE id = ? AND (uid IS NULL OR uid = '')`)
        .bind(makeUid(), id)
        .run();
    }
    await db
      .prepare(
        `UPDATE users SET
           name = ?,
           image = ?,
           last_seen_at = ?,
           updated_at = ?
         WHERE id = ?`,
      )
      .bind(name, image, now, now, id)
      .run();
    return {
      id,
      role: normalizeRole(existing.role),
      status: existing.status || "active",
    };
  }

  const uid = makeUid();
  await db
    .prepare(
      `INSERT INTO users (id, email, name, image, role, status, uid, last_seen_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
    )
    .bind(id, id, name, image, fallbackRole, uid, now, now, now)
    .run();
  return { id, role: fallbackRole, status: "active" };
}

async function getUserRole(
  db: D1Database,
  email: string,
): Promise<{ role: UserRole; status: string } | null> {
  const id = userIdFromEmail(email);
  const row = await db
    .prepare(`SELECT role, status FROM users WHERE id = ?`)
    .bind(id)
    .first<{ role: string; status: string }>();
  if (!row) return null;
  return { role: normalizeRole(row.role), status: row.status || "active" };
}

async function writeAudit(
  db: D1Database,
  userId: string,
  actorId: string | null,
  fromRole: string | null,
  toRole: string,
  reason: string | null,
) {
  await db
    .prepare(
      `INSERT INTO role_audit (id, user_id, actor_id, from_role, to_role, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(newId("aud"), userId, actorId, fromRole, toRole, reason, Date.now())
    .run();
}

async function pullAll(db: D1Database, userId: string) {
  const bookmarks = await db
    .prepare(
      `SELECT key, surah_id as surahId, verse, page, saved_at as savedAt
       FROM bookmarks WHERE user_id = ? ORDER BY saved_at DESC`,
    )
    .bind(userId)
    .all<BookmarkRow>();

  const notes = await db
    .prepare(
      `SELECT key, surah_id as surahId, verse, body as text, updated_at as updatedAt
       FROM ayah_notes WHERE user_id = ? ORDER BY updated_at DESC`,
    )
    .bind(userId)
    .all<NoteRow>();

  const progress = await db
    .prepare(
      `SELECT last_page as lastPage, habit_json as habitJson, updated_at as updatedAt
       FROM reading_progress WHERE user_id = ?`,
    )
    .bind(userId)
    .first<{ lastPage: number | null; habitJson: string; updatedAt: number }>();

  let habit: unknown = {};
  if (progress?.habitJson) {
    try {
      habit = JSON.parse(progress.habitJson);
    } catch {
      habit = {};
    }
  }

  return {
    bookmarks: bookmarks.results ?? [],
    notes: notes.results ?? [],
    progress: {
      lastPage: progress?.lastPage ?? null,
      habit,
      updatedAt: progress?.updatedAt ?? null,
    },
  };
}

async function pushAll(
  db: D1Database,
  userId: string,
  bookmarks: BookmarkRow[],
  notes: NoteRow[],
  progress: ProgressPayload,
) {
  const stmts: D1PreparedStatement[] = [];

  stmts.push(db.prepare(`DELETE FROM bookmarks WHERE user_id = ?`).bind(userId));
  for (const b of bookmarks.slice(0, 200)) {
    if (!b?.key) continue;
    stmts.push(
      db
        .prepare(
          `INSERT INTO bookmarks (user_id, key, surah_id, verse, page, saved_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          userId,
          String(b.key),
          Number(b.surahId) || 0,
          Number(b.verse) || 0,
          Number(b.page) || 1,
          Number(b.savedAt) || Date.now(),
        ),
    );
  }

  stmts.push(db.prepare(`DELETE FROM ayah_notes WHERE user_id = ?`).bind(userId));
  for (const n of notes.slice(0, 300)) {
    if (!n?.key) continue;
    const text = String(n.text ?? "").trim().slice(0, 4000);
    if (!text) continue;
    stmts.push(
      db
        .prepare(
          `INSERT INTO ayah_notes (user_id, key, surah_id, verse, body, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          userId,
          String(n.key),
          Number(n.surahId) || 0,
          Number(n.verse) || 0,
          text,
          Number(n.updatedAt) || Date.now(),
        ),
    );
  }

  const habitJson = JSON.stringify(progress?.habit ?? {});
  const lastPage =
    progress?.lastPage == null
      ? null
      : Math.min(604, Math.max(1, Number(progress.lastPage) || 1));
  const now = Date.now();
  stmts.push(
    db
      .prepare(
        `INSERT INTO reading_progress (user_id, last_page, habit_json, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           last_page = excluded.last_page,
           habit_json = excluded.habit_json,
           updated_at = excluded.updated_at`,
      )
      .bind(userId, lastPage, habitJson, now),
  );

  await db.batch(stmts);
}

async function adminStats(db: D1Database) {
  const totals = await db
    .prepare(
      `SELECT
         COUNT(*) as totalUsers,
         SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
         SUM(CASE WHEN role = 'editor' THEN 1 ELSE 0 END) as editors,
         SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as users
       FROM users`,
    )
    .first<{
      totalUsers: number;
      admins: number;
      editors: number;
      users: number;
    }>();

  const pending = await db
    .prepare(
      `SELECT COUNT(*) as c FROM role_requests WHERE status = 'pending'`,
    )
    .first<{ c: number }>();

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = await db
    .prepare(
      `SELECT COUNT(*) as c FROM users WHERE last_seen_at IS NOT NULL AND last_seen_at >= ?`,
    )
    .bind(weekAgo)
    .first<{ c: number }>();

  const bookmarks = await db
    .prepare(`SELECT COUNT(*) as c FROM bookmarks`)
    .first<{ c: number }>();
  const notes = await db
    .prepare(`SELECT COUNT(*) as c FROM ayah_notes`)
    .first<{ c: number }>();

  return {
    totalUsers: Number(totals?.totalUsers || 0),
    admins: Number(totals?.admins || 0),
    editors: Number(totals?.editors || 0),
    users: Number(totals?.users || 0),
    pendingRoleRequests: Number(pending?.c || 0),
    activeLast7Days: Number(recent?.c || 0),
    totalBookmarks: Number(bookmarks?.c || 0),
    totalNotes: Number(notes?.c || 0),
  };
}

async function listUsers(
  db: D1Database,
  q: string,
  role: string,
  limit: number,
  offset: number,
) {
  const needle = q.trim().toLowerCase();
  let sql = `SELECT id, uid, email, name, image, role, status, last_seen_at as lastSeenAt,
                    created_at as createdAt, updated_at as updatedAt
             FROM users WHERE 1=1`;
  const binds: (string | number)[] = [];

  if (needle) {
    sql += ` AND (email LIKE ? OR IFNULL(name, '') LIKE ? OR IFNULL(uid, '') LIKE ? OR id LIKE ?)`;
    binds.push(`%${needle}%`, `%${needle}%`, `%${needle}%`, `%${needle}%`);
  }
  if (role === "user" || role === "editor" || role === "admin") {
    sql += ` AND role = ?`;
    binds.push(role);
  }
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  binds.push(limit, offset);

  const rows = await db
    .prepare(sql)
    .bind(...binds)
    .all();

  const countSql = needle
    ? `SELECT COUNT(*) as c FROM users WHERE (email LIKE ? OR IFNULL(name, '') LIKE ? OR IFNULL(uid, '') LIKE ? OR id LIKE ?)${
        role === "user" || role === "editor" || role === "admin"
          ? " AND role = ?"
          : ""
      }`
    : `SELECT COUNT(*) as c FROM users${
        role === "user" || role === "editor" || role === "admin"
          ? " WHERE role = ?"
          : ""
      }`;

  const countBinds: (string | number)[] = [];
  if (needle) {
    countBinds.push(`%${needle}%`, `%${needle}%`, `%${needle}%`, `%${needle}%`);
  }
  if (role === "user" || role === "editor" || role === "admin") {
    countBinds.push(role);
  }
  const total = await db
    .prepare(countSql)
    .bind(...countBinds)
    .first<{ c: number }>();

  return {
    users: rows.results ?? [],
    total: Number(total?.c || 0),
    limit,
    offset,
  };
}

async function getUserDetail(db: D1Database, userId: string) {
  const user = await db
    .prepare(
      `SELECT id, uid, email, name, image, role, status, last_seen_at as lastSeenAt,
              created_at as createdAt, updated_at as updatedAt
       FROM users WHERE id = ?`,
    )
    .bind(userId)
    .first();
  if (!user) return null;

  const bm = await db
    .prepare(`SELECT COUNT(*) as c FROM bookmarks WHERE user_id = ?`)
    .bind(userId)
    .first<{ c: number }>();
  const notes = await db
    .prepare(`SELECT COUNT(*) as c FROM ayah_notes WHERE user_id = ?`)
    .bind(userId)
    .first<{ c: number }>();

  return {
    user,
    bookmarkCount: Number(bm?.c || 0),
    noteCount: Number(notes?.c || 0),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return json({ ok: true });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "arabya-sync", hasDb: Boolean(env.DB) });
    }

    if (!authorize(request, env)) {
      return unauthorized();
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return badRequest("invalid_json");
    }

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    // --- Role lookup (no profile mutation required beyond read) ---
    if (url.pathname === "/v1/role") {
      if (!email || !email.includes("@")) return badRequest("email_required");
      const row = await env.DB.prepare(`SELECT role, status FROM users WHERE id = ?`)
        .bind(userIdFromEmail(email))
        .first<{ role: string; status: string }>();
      if (row?.status === "banned") {
        return json({ ok: true, role: "user", banned: true });
      }
      const ensureAdmin =
        body.ensureAdmin === true || isProtectedAdmin(email, env);
      if (ensureAdmin) {
        await upsertUserProfile(env.DB, email, null, null, "admin");
        await env.DB.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`)
          .bind(userIdFromEmail(email))
          .run();
        return json({ ok: true, role: "admin" as UserRole, banned: false });
      }
      const info = await getUserRole(env.DB, email);
      return json({
        ok: true,
        role: info?.role ?? "user",
        banned: info?.status === "banned",
      });
    }

    // --- Personal sync ---
    if (url.pathname === "/v1/pull" || url.pathname === "/v1/push") {
      if (!email || !email.includes("@")) return badRequest("email_required");

      const ensureAdmin =
        body.ensureAdmin === true || isProtectedAdmin(email, env);
      const fallbackRole: UserRole = ensureAdmin ? "admin" : "user";
      const { id: userId, role, status } = await upsertUserProfile(
        env.DB,
        email,
        (body.name as string | null) ?? null,
        (body.image as string | null) ?? null,
        fallbackRole,
      );

      if (status === "banned") {
        return forbidden("account_banned");
      }

      if (ensureAdmin && role !== "admin") {
        await env.DB.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`)
          .bind(userId)
          .run();
        if (role !== "admin") {
          await writeAudit(env.DB, userId, email, role, "admin", "ensure_admin");
        }
      }

      if (url.pathname === "/v1/pull") {
        const data = await pullAll(env.DB, userId);
        const info = await getUserRole(env.DB, email);
        return json({ ok: true, userId, role: info?.role ?? role, ...data });
      }

      await pushAll(
        env.DB,
        userId,
        Array.isArray(body.bookmarks) ? (body.bookmarks as BookmarkRow[]) : [],
        Array.isArray(body.notes) ? (body.notes as NoteRow[]) : [],
        (body.progress as ProgressPayload) || { lastPage: null, habit: {} },
      );
      const data = await pullAll(env.DB, userId);
      const info = await getUserRole(env.DB, email);
      return json({
        ok: true,
        userId,
        role: info?.role ?? role,
        ...data,
      });
    }

    // --- Role request (subscriber) ---
    if (url.pathname === "/v1/role-request") {
      if (!email || !email.includes("@")) return badRequest("email_required");
      const { id: userId } = await upsertUserProfile(
        env.DB,
        email,
        (body.name as string | null) ?? null,
        (body.image as string | null) ?? null,
      );

      const action = String(body.action || "get");
      if (action === "get") {
        const latest = await env.DB.prepare(
          `SELECT id, status, message, review_note as reviewNote,
                  COALESCE(target_role, 'editor') as targetRole,
                  created_at as createdAt, updated_at as updatedAt
           FROM role_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        )
          .bind(userId)
          .first();
        return json({ ok: true, request: latest ?? null });
      }

      if (action === "create") {
        const info = await getUserRole(env.DB, email);
        const targetRole =
          String(body.targetRole || "editor") === "admin" ? "admin" : "editor";
        if (targetRole === "editor" && info?.role !== "user") {
          return badRequest("already_elevated");
        }
        if (targetRole === "admin" && info?.role !== "editor") {
          return badRequest("editor_required_for_admin_request");
        }
        const pending = await env.DB.prepare(
          `SELECT id FROM role_requests WHERE user_id = ? AND status = 'pending' LIMIT 1`,
        )
          .bind(userId)
          .first();
        if (pending) return badRequest("already_pending");

        const now = Date.now();
        const id = newId("req");
        const message = String(body.message || "")
          .trim()
          .slice(0, 500);
        await env.DB.prepare(
          `INSERT INTO role_requests (id, user_id, message, status, target_role, created_at, updated_at)
           VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
        )
          .bind(id, userId, message, targetRole, now, now)
          .run();
        return json({ ok: true, id, status: "pending", targetRole });
      }

      return badRequest("unknown_action");
    }

    // --- Admin APIs (Next.js must verify admin before calling) ---
    const actorEmail = String(body.actorEmail || "")
      .trim()
      .toLowerCase();
    if (!actorEmail || !actorEmail.includes("@")) {
      return badRequest("actor_email_required");
    }
    if (!isProtectedAdmin(actorEmail, env)) {
      const actorInfo = await getUserRole(env.DB, actorEmail);
      if (actorInfo?.role !== "admin" || actorInfo.status === "banned") {
        return forbidden("admin_required");
      }
    }

    if (url.pathname === "/v1/admin/stats") {
      return json({ ok: true, stats: await adminStats(env.DB) });
    }

    if (url.pathname === "/v1/admin/users") {
      const q = String(body.q || "");
      const role = String(body.role || "");
      const limit = Math.min(100, Math.max(1, Number(body.limit) || 50));
      const offset = Math.max(0, Number(body.offset) || 0);
      const result = await listUsers(env.DB, q, role, limit, offset);
      return json({ ok: true, ...result });
    }

    if (url.pathname === "/v1/admin/user") {
      const userId = userIdFromEmail(String(body.userId || body.email || ""));
      if (!userId) return badRequest("user_required");
      const detail = await getUserDetail(env.DB, userId);
      if (!detail) return json({ ok: false, error: "not_found" }, 404);
      return json({ ok: true, ...detail });
    }

    if (url.pathname === "/v1/admin/set-role") {
      const targetId = userIdFromEmail(String(body.userId || body.email || ""));
      const toRole = normalizeRole(body.role);
      if (!targetId) return badRequest("user_required");
      if (toRole === "admin" && !isSuperAdmin(actorEmail)) {
        return forbidden("super_admin_required_for_admin_role");
      }
      if (isProtectedAdmin(targetId, env) && toRole !== "admin") {
        return forbidden("cannot_change_protected_admin");
      }

      const existing = await env.DB.prepare(
        `SELECT role FROM users WHERE id = ?`,
      )
        .bind(targetId)
        .first<{ role: string }>();
      if (!existing) return json({ ok: false, error: "not_found" }, 404);

      const fromRole = normalizeRole(existing.role);
      if (fromRole === toRole) {
        return json({ ok: true, role: toRole, unchanged: true });
      }

      const now = Date.now();
      await env.DB.prepare(
        `UPDATE users SET role = ?, updated_at = ? WHERE id = ?`,
      )
        .bind(toRole, now, targetId)
        .run();
      await writeAudit(
        env.DB,
        targetId,
        actorEmail,
        fromRole,
        toRole,
        String(body.reason || "admin_set_role").slice(0, 300),
      );

      if (toRole === "editor" || toRole === "admin") {
        await env.DB.prepare(
          `UPDATE role_requests SET status = 'approved', reviewed_by = ?, updated_at = ?
           WHERE user_id = ? AND status = 'pending'`,
        )
          .bind(actorEmail, now, targetId)
          .run();
      }

      return json({ ok: true, role: toRole, fromRole });
    }

    if (url.pathname === "/v1/admin/ban-user") {
      const targetId = userIdFromEmail(String(body.userId || body.email || ""));
      if (!targetId) return badRequest("user_required");
      if (isProtectedAdmin(targetId, env) || isSuperAdmin(targetId)) {
        return forbidden("cannot_ban_protected_admin");
      }
      if (targetId === actorEmail) return forbidden("cannot_ban_self");
      const banned = body.banned !== false;
      const status = banned ? "banned" : "active";
      const now = Date.now();
      await env.DB.prepare(
        `UPDATE users SET status = ?, updated_at = ? WHERE id = ?`,
      )
        .bind(status, now, targetId)
        .run();
      await writeAudit(
        env.DB,
        targetId,
        actorEmail,
        null,
        status,
        String(body.reason || (banned ? "ban" : "unban")).slice(0, 300),
      );
      return json({ ok: true, status });
    }

    if (url.pathname === "/v1/admin/portfolio") {
      if (!isSuperAdmin(actorEmail)) {
        return forbidden("super_admin_required");
      }
      const targetId = userIdFromEmail(String(body.userId || body.email || ""));
      if (!targetId) return badRequest("user_required");
      const detail = await getUserDetail(env.DB, targetId);
      if (!detail) return json({ ok: false, error: "not_found" }, 404);
      const data = await pullAll(env.DB, targetId);
      return json({
        ok: true,
        ...detail,
        bookmarks: data.bookmarks,
        notes: data.notes,
        progress: data.progress,
      });
    }

    if (url.pathname === "/v1/admin/delete-user") {
      const targetId = userIdFromEmail(String(body.userId || body.email || ""));
      if (!targetId) return badRequest("user_required");
      if (isProtectedAdmin(targetId, env)) {
        return forbidden("cannot_delete_protected_admin");
      }
      if (targetId === actorEmail) return forbidden("cannot_delete_self");

      await writeAudit(
        env.DB,
        targetId,
        actorEmail,
        null,
        "deleted",
        String(body.reason || "admin_delete").slice(0, 300),
      );
      await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(targetId).run();
      return json({ ok: true, deleted: targetId });
    }

    if (url.pathname === "/v1/admin/role-requests") {
      const action = String(body.action || "list");
      if (action === "list") {
        const status = String(body.status || "pending");
        const rows = await env.DB.prepare(
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
          .bind(status, status)
          .all();
        return json({ ok: true, requests: rows.results ?? [] });
      }

      if (action === "review") {
        const requestId = String(body.requestId || "");
        const decision = String(body.decision || "");
        if (!requestId || (decision !== "approved" && decision !== "rejected")) {
          return badRequest("invalid_review");
        }
        const req = await env.DB.prepare(
          `SELECT id, user_id as userId, status, COALESCE(target_role, 'editor') as targetRole
           FROM role_requests WHERE id = ?`,
        )
          .bind(requestId)
          .first<{ id: string; userId: string; status: string; targetRole: string }>();
        if (!req) return json({ ok: false, error: "not_found" }, 404);
        if (req.status !== "pending") return badRequest("not_pending");

        const toRole = req.targetRole === "admin" ? "admin" : "editor";
        if (toRole === "admin" && !isSuperAdmin(actorEmail)) {
          return forbidden("super_admin_required_for_admin_role");
        }

        const now = Date.now();
        const note = String(body.reviewNote || "").trim().slice(0, 500);
        await env.DB.prepare(
          `UPDATE role_requests SET status = ?, reviewed_by = ?, review_note = ?, updated_at = ?
           WHERE id = ?`,
        )
          .bind(decision, actorEmail, note, now, requestId)
          .run();

        if (decision === "approved") {
          if (isProtectedAdmin(req.userId, env) && toRole !== "admin") {
            return forbidden("cannot_change_protected_admin");
          }
          const existing = await env.DB.prepare(
            `SELECT role FROM users WHERE id = ?`,
          )
            .bind(req.userId)
            .first<{ role: string }>();
          const fromRole = normalizeRole(existing?.role);
          await env.DB.prepare(
            `UPDATE users SET role = ?, updated_at = ? WHERE id = ?`,
          )
            .bind(toRole, now, req.userId)
            .run();
          await writeAudit(
            env.DB,
            req.userId,
            actorEmail,
            fromRole,
            toRole,
            note || "role_request_approved",
          );
        }

        return json({ ok: true, decision });
      }

      return badRequest("unknown_action");
    }

    if (url.pathname === "/v1/admin/audit") {
      const rows = await env.DB.prepare(
        `SELECT id, user_id as userId, actor_id as actorId, from_role as fromRole,
                to_role as toRole, reason, created_at as createdAt
         FROM role_audit ORDER BY created_at DESC LIMIT 100`,
      ).all();
      return json({ ok: true, entries: rows.results ?? [] });
    }

    return json({ ok: false, error: "not_found" }, 404);
  },
};
