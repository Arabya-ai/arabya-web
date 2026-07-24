-- Arabya user sync schema for Cloudflare D1
-- Database: arabya-user-data
-- Run once in Cloudflare Dashboard → D1 → Console
-- For existing DBs, also run schema-migrate.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  uid TEXT UNIQUE,
  last_seen_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uid ON users(uid);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  surah_id INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  page INTEGER NOT NULL,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

CREATE TABLE IF NOT EXISTS ayah_notes (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  surah_id INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  body TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ayah_notes_user ON ayah_notes(user_id);

CREATE TABLE IF NOT EXISTS reading_progress (
  user_id TEXT PRIMARY KEY,
  last_page INTEGER,
  habit_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS role_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  target_role TEXT NOT NULL DEFAULT 'editor',
  reviewed_by TEXT,
  review_note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_requests_user ON role_requests(user_id);

CREATE TABLE IF NOT EXISTS role_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_id TEXT,
  from_role TEXT,
  to_role TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_role_audit_user ON role_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_created ON role_audit(created_at);

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
