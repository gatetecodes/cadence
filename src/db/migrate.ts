import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Versioned migrations, tracked with SQLite's user_version pragma.
 * Append new entries; never edit a shipped one.
 */
const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS fasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id TEXT NOT NULL,
    goal_minutes INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    note TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS fasts_started_at ON fasts (started_at);
  CREATE UNIQUE INDEX IF NOT EXISTS fasts_one_active ON fasts ((ended_at IS NULL)) WHERE ended_at IS NULL;

  CREATE TABLE IF NOT EXISTS water_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount_ml INTEGER NOT NULL,
    logged_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS water_logged_at ON water_logs (logged_at);

  CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    earned_at INTEGER NOT NULL,
    fast_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export function migrate(db: SQLiteDatabase): void {
  db.execSync('PRAGMA journal_mode = WAL;');
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    db.withTransactionSync(() => {
      db.execSync(sql);
      db.execSync(`PRAGMA user_version = ${version + 1};`);
    });
    version++;
  }
}
