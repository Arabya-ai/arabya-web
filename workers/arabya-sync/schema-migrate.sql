-- Run on existing arabya-user-data D1 (safe IF NOT EXISTS / ignore duplicate column errors)

ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN last_seen_at INTEGER;
ALTER TABLE users ADD COLUMN uid TEXT;
ALTER TABLE role_requests ADD COLUMN target_role TEXT NOT NULL DEFAULT 'editor';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uid ON users(uid);

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
