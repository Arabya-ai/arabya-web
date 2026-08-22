/**
 * L2 flywheel SQLite — event log + pair tallies for لغوي crowd learning.
 * Path: LUGHAWI_FLYWHEEL_DB or Contabo /var/lib/arabya/lughawi-flywheel.sqlite
 */

import Database from "better-sqlite3";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type FlywheelPairRow = {
  from_text: string;
  to_text: string;
  rule_id: string | null;
  accepts: number;
  rejects: number;
  active: number;
  updated_at: string;
};

export type FlywheelEventInput = {
  from: string;
  to: string;
  decision: "accepted" | "rejected" | "custom";
  customTo?: string;
  ruleId?: string;
  tier?: string;
  source?: string;
  userEmailHash?: string;
};

let dbSingleton: Database.Database | null = null;

/** Test-only: close and reopen against a new LUGHAWI_FLYWHEEL_DB path. */
export function resetFlywheelDbForTests(): void {
  if (dbSingleton) {
    try {
      dbSingleton.close();
    } catch {
      /* ignore */
    }
    dbSingleton = null;
  }
}

export function resolveFlywheelDbPath(): string {
  const fromEnv = process.env.LUGHAWI_FLYWHEEL_DB?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    return "/var/lib/arabya/lughawi-flywheel.sqlite";
  }
  return join(process.cwd(), ".data", "lughawi-flywheel.sqlite");
}

function openDb(): Database.Database {
  if (dbSingleton) return dbSingleton;
  const path = resolveFlywheelDbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS flywheel_pairs (
      from_text TEXT NOT NULL,
      to_text TEXT NOT NULL,
      rule_id TEXT,
      accepts INTEGER NOT NULL DEFAULT 0,
      rejects INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (from_text, to_text)
    );
    CREATE TABLE IF NOT EXISTS flywheel_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      from_text TEXT NOT NULL,
      to_text TEXT NOT NULL,
      custom_to TEXT,
      decision TEXT NOT NULL,
      rule_id TEXT,
      tier TEXT,
      source TEXT,
      user_email_hash TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_flywheel_events_created
      ON flywheel_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_flywheel_pairs_active
      ON flywheel_pairs(active);
  `);
  dbSingleton = db;
  migrateJsonIfNeeded(db);
  return db;
}

/** One-time import from legacy .data/lughawi-learning.json */
function migrateJsonIfNeeded(db: Database.Database) {
  const count = (
    db.prepare(`SELECT COUNT(*) AS n FROM flywheel_pairs`).get() as { n: number }
  ).n;
  if (count > 0) return;

  const jsonPath =
    process.env.LUGHAWI_LEARNING_PATH?.trim() ||
    join(process.cwd(), ".data", "lughawi-learning.json");
  if (!existsSync(jsonPath)) return;
  try {
    const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as {
      pairs?: Array<{
        from: string;
        to: string;
        ruleId?: string;
        accepts: number;
        rejects: number;
        active?: boolean;
        updatedAt?: string;
      }>;
    };
    if (!Array.isArray(raw.pairs) || raw.pairs.length === 0) return;
    const insert = db.prepare(`
      INSERT OR REPLACE INTO flywheel_pairs
        (from_text, to_text, rule_id, accepts, rejects, active, updated_at)
      VALUES (@from_text, @to_text, @rule_id, @accepts, @rejects, @active, @updated_at)
    `);
    const tx = db.transaction(() => {
      for (const p of raw.pairs!) {
        if (!p.from || !p.to) continue;
        insert.run({
          from_text: p.from,
          to_text: p.to,
          rule_id: p.ruleId ?? null,
          accepts: p.accepts ?? 0,
          rejects: p.rejects ?? 0,
          active: p.active ? 1 : 0,
          updated_at: p.updatedAt ?? new Date().toISOString(),
        });
      }
    });
    tx();
  } catch {
    /* ignore corrupt legacy file */
  }
}

export function listFlywheelPairs(): FlywheelPairRow[] {
  return openDb()
    .prepare(
      `SELECT from_text, to_text, rule_id, accepts, rejects, active, updated_at
       FROM flywheel_pairs`,
    )
    .all() as FlywheelPairRow[];
}

export function upsertFlywheelPair(row: {
  from: string;
  to: string;
  ruleId?: string;
  accepts: number;
  rejects: number;
  active: boolean;
}): FlywheelPairRow {
  const updatedAt = new Date().toISOString();
  openDb()
    .prepare(
      `INSERT INTO flywheel_pairs
         (from_text, to_text, rule_id, accepts, rejects, active, updated_at)
       VALUES (@from_text, @to_text, @rule_id, @accepts, @rejects, @active, @updated_at)
       ON CONFLICT(from_text, to_text) DO UPDATE SET
         rule_id = COALESCE(excluded.rule_id, flywheel_pairs.rule_id),
         accepts = excluded.accepts,
         rejects = excluded.rejects,
         active = excluded.active,
         updated_at = excluded.updated_at`,
    )
    .run({
      from_text: row.from,
      to_text: row.to,
      rule_id: row.ruleId ?? null,
      accepts: row.accepts,
      rejects: row.rejects,
      active: row.active ? 1 : 0,
      updated_at: updatedAt,
    });
  return openDb()
    .prepare(
      `SELECT from_text, to_text, rule_id, accepts, rejects, active, updated_at
       FROM flywheel_pairs WHERE from_text = ? AND to_text = ?`,
    )
    .get(row.from, row.to) as FlywheelPairRow;
}

export function getFlywheelPair(
  from: string,
  to: string,
): FlywheelPairRow | undefined {
  return openDb()
    .prepare(
      `SELECT from_text, to_text, rule_id, accepts, rejects, active, updated_at
       FROM flywheel_pairs WHERE from_text = ? AND to_text = ?`,
    )
    .get(from, to) as FlywheelPairRow | undefined;
}

export function insertFlywheelEvent(ev: FlywheelEventInput): void {
  openDb()
    .prepare(
      `INSERT INTO flywheel_events
         (created_at, from_text, to_text, custom_to, decision, rule_id, tier, source, user_email_hash)
       VALUES (@created_at, @from_text, @to_text, @custom_to, @decision, @rule_id, @tier, @source, @user_email_hash)`,
    )
    .run({
      created_at: new Date().toISOString(),
      from_text: ev.from,
      to_text: ev.to,
      custom_to: ev.customTo ?? null,
      decision: ev.decision,
      rule_id: ev.ruleId ?? null,
      tier: ev.tier ?? null,
      source: ev.source ?? null,
      user_email_hash: ev.userEmailHash ?? null,
    });
}

export function countFlywheelEvents(): number {
  return (
    openDb().prepare(`SELECT COUNT(*) AS n FROM flywheel_events`).get() as {
      n: number;
    }
  ).n;
}

/** Recent accepted/custom corrections for future MoA few-shot (L3). */
export function listRecentAcceptedCorrections(limit = 5): Array<{
  from: string;
  to: string;
  createdAt: string;
}> {
  const rows = openDb()
    .prepare(
      `SELECT from_text, COALESCE(custom_to, to_text) AS corrected, created_at
       FROM flywheel_events
       WHERE decision IN ('accepted', 'custom')
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    from_text: string;
    corrected: string;
    created_at: string;
  }>;
  return rows.map((r) => ({
    from: r.from_text,
    to: r.corrected,
    createdAt: r.created_at,
  }));
}

/** Exact cache: active learned replacement for a token. */
export function lookupExactLearnedCorrection(from: string): string | null {
  const row = openDb()
    .prepare(
      `SELECT to_text FROM flywheel_pairs
       WHERE from_text = ? AND active = 1
       ORDER BY accepts DESC
       LIMIT 1`,
    )
    .get(from.trim()) as { to_text: string } | undefined;
  return row?.to_text ?? null;
}
