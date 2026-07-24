-- Incremental migrate for arabya-user-data
-- Safe to re-run: uses IF NOT EXISTS. Skip ALTER lines that already applied.

CREATE TABLE IF NOT EXISTS study_entries (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  query TEXT,
  surah_id INTEGER,
  verse INTEGER,
  word_index INTEGER,
  snippet TEXT,
  notes TEXT NOT NULL DEFAULT '',
  href TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_study_entries_user ON study_entries(user_id);

CREATE TABLE IF NOT EXISTS source_uploads (
  id TEXT PRIMARY KEY,
  uploader_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'json',
  payload TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_source_uploads_created ON source_uploads(created_at);

-- Legacy (already applied on production — kept for fresh DBs via schema.sql)
-- ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
-- ALTER TABLE users ADD COLUMN last_seen_at INTEGER;
-- ALTER TABLE users ADD COLUMN uid TEXT;
-- ALTER TABLE role_requests ADD COLUMN target_role TEXT NOT NULL DEFAULT 'editor';
