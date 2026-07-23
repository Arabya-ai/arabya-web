-- Arabya user sync schema for Cloudflare D1
-- Database: arabya-user-data
-- Run once in Cloudflare Dashboard → D1 → Console

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

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
