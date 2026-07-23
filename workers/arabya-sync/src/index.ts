/**
 * Arabya personal-data sync Worker (Cloudflare + D1).
 * Called only by the Next.js app after Auth.js verifies the session.
 */

export interface Env {
  DB: D1Database;
  ARABYA_SYNC_SECRET: string;
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

async function upsertUser(
  db: D1Database,
  email: string,
  name: string | null,
  image: string | null,
  role: string,
): Promise<string> {
  const id = userIdFromEmail(email);
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (id, email, name, image, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         image = excluded.image,
         role = excluded.role,
         updated_at = excluded.updated_at`,
    )
    .bind(id, id, name, image, role || "user", now, now)
    .run();
  return id;
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
    progress?.lastPage == null ? null : Math.min(604, Math.max(1, Number(progress.lastPage) || 1));
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

    let body: {
      email?: string;
      name?: string | null;
      image?: string | null;
      role?: string;
      bookmarks?: BookmarkRow[];
      notes?: NoteRow[];
      progress?: ProgressPayload;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return badRequest("invalid_json");
    }

    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) {
      return badRequest("email_required");
    }

    const userId = await upsertUser(
      env.DB,
      email,
      body.name ?? null,
      body.image ?? null,
      body.role || "user",
    );

    if (url.pathname === "/v1/pull") {
      const data = await pullAll(env.DB, userId);
      return json({ ok: true, userId, ...data });
    }

    if (url.pathname === "/v1/push") {
      await pushAll(
        env.DB,
        userId,
        Array.isArray(body.bookmarks) ? body.bookmarks : [],
        Array.isArray(body.notes) ? body.notes : [],
        body.progress || { lastPage: null, habit: {} },
      );
      const data = await pullAll(env.DB, userId);
      return json({ ok: true, userId, ...data });
    }

    return json({ ok: false, error: "not_found" }, 404);
  },
};
