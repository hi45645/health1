import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openStore(path) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS content (
      locale TEXT PRIMARY KEY CHECK(locale IN ('en', 'kn')),
      draft TEXT NOT NULL,
      published TEXT,
      approved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS appointments (
      reference TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      locale TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  if (!db.prepare("SELECT name FROM pragma_table_info('appointments') WHERE name = 'status'").get()) {
    db.exec("ALTER TABLE appointments ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed'))");
  }
  return db;
}
