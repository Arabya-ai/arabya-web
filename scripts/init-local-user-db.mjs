#!/usr/bin/env node
/**
 * Initialize SQLite user-data file on Contabo (or local dev).
 * Usage:
 *   ARABYA_USER_DB_PATH=/var/lib/arabya/user-data.sqlite node scripts/init-local-user-db.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath =
  process.env.ARABYA_USER_DB_PATH?.trim() ||
  path.join(root, "data", "user-data.sqlite");
const schemaPath = path.join(root, "src/lib/local-user-db/schema.sql");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const schema = fs.readFileSync(schemaPath, "utf8");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(schema);
db.close();

console.log(`User DB ready: ${dbPath}`);
