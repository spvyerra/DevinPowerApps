/**
 * SQLite database for DevinPowerApps, holding who may open which app.
 * It uses the built-in `node:sqlite`, so no ORM or driver is needed for two small tables.
 * Owner: spvyerra.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbPath = process.env.APP_DB ?? "data/app.db";
let db: DatabaseSync | undefined;

function open(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS app_access (
    app_slug TEXT NOT NULL,
    email TEXT NOT NULL,
    PRIMARY KEY (app_slug, email)
  )`);
  return db;
}

/** Returns true when the email was granted the app. */
export function hasAccess(appSlug: string, email: string): boolean {
  return open().prepare("SELECT 1 FROM app_access WHERE app_slug = ? AND email = ?").get(appSlug, email) !== undefined;
}

/** Returns the emails granted the app, sorted. */
export function listAccess(appSlug: string): string[] {
  const rows = open().prepare("SELECT email FROM app_access WHERE app_slug = ? ORDER BY email").all(appSlug) as { email: string }[];
  return rows.map((row) => row.email);
}

/** Grants the app to the email; granting twice is a no-op. */
export function grantAccess(appSlug: string, email: string): void {
  open().prepare("INSERT OR IGNORE INTO app_access (app_slug, email) VALUES (?, ?)").run(appSlug, email);
}

/** Revokes the app from the email. */
export function revokeAccess(appSlug: string, email: string): void {
  open().prepare("DELETE FROM app_access WHERE app_slug = ? AND email = ?").run(appSlug, email);
}
