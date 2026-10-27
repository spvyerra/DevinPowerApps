/**
 * SQLite database for DevinPowerApps, holding who may open which app and the app requests.
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
  db.exec(`CREATE TABLE IF NOT EXISTS app_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_email TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL,
    screenshot_path TEXT,
    services TEXT NOT NULL,
    doc_links TEXT NOT NULL,
    prompt TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS app_requests_slug ON app_requests (slug)");
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

export type AppRequest = {
  id: number;
  requesterEmail: string;
  name: string;
  slug: string;
  description: string;
  screenshotPath: string | null;
  services: string[];
  docLinks: string[];
  prompt: string;
  createdAt: string;
};

type AppRequestRow = {
  id: number;
  requester_email: string;
  name: string;
  slug: string;
  description: string;
  screenshot_path: string | null;
  services: string;
  doc_links: string;
  prompt: string;
  created_at: string;
};

function toRequest(row: AppRequestRow): AppRequest {
  return {
    id: row.id,
    requesterEmail: row.requester_email,
    name: row.name,
    slug: row.slug,
    description: row.description,
    screenshotPath: row.screenshot_path,
    services: JSON.parse(row.services),
    docLinks: JSON.parse(row.doc_links),
    prompt: row.prompt,
    createdAt: row.created_at,
  };
}

/** Stores an app request and returns its id. */
export function createRequest(request: Omit<AppRequest, "id" | "createdAt">): number {
  const result = open()
    .prepare(
      `INSERT INTO app_requests (requester_email, name, slug, description, screenshot_path, services, doc_links, prompt, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      request.requesterEmail,
      request.name,
      request.slug,
      request.description,
      request.screenshotPath,
      JSON.stringify(request.services),
      JSON.stringify(request.docLinks),
      request.prompt,
      new Date().toISOString(),
    );
  return Number(result.lastInsertRowid);
}

/** Lists app requests, newest first: every request when `requesterEmail` is null, otherwise only that user's. */
export function listRequests(requesterEmail: string | null): AppRequest[] {
  const rows = (
    requesterEmail === null
      ? open().prepare("SELECT * FROM app_requests ORDER BY id DESC").all()
      : open().prepare("SELECT * FROM app_requests WHERE requester_email = ? ORDER BY id DESC").all(requesterEmail)
  ) as AppRequestRow[];
  return rows.map(toRequest);
}

/** Returns one app request, or undefined when the id is unknown. */
export function getRequest(id: number): AppRequest | undefined {
  const row = open().prepare("SELECT * FROM app_requests WHERE id = ?").get(id) as AppRequestRow | undefined;
  return row && toRequest(row);
}
