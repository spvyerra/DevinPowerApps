/**
 * SQLite database for DevinPowerApps, holding who may open which app and the app requests.
 * It uses the built-in `node:sqlite`, so no ORM or driver is needed for two small tables.
 * Owner: spvyerra.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbPath = process.env.APP_DB ?? "data/app.db";
const sessionColumns = {
  status: "TEXT NOT NULL DEFAULT 'draft'",
  devin_session_id: "TEXT",
  devin_session_url: "TEXT",
  pr_url: "TEXT",
};

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
  const columns = new Set((db.prepare("PRAGMA table_info(app_requests)").all() as { name: string }[]).map((column) => column.name));
  for (const [name, type] of Object.entries(sessionColumns)) {
    if (!columns.has(name)) db.exec(`ALTER TABLE app_requests ADD COLUMN ${name} ${type}`);
  }
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
  status: string;
  sessionId: string | null;
  sessionUrl: string | null;
  prUrl: string | null;
};

export type RequestSession = Pick<AppRequest, "status" | "sessionId" | "sessionUrl" | "prUrl">;

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
  status: string;
  devin_session_id: string | null;
  devin_session_url: string | null;
  pr_url: string | null;
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
    status: row.status,
    sessionId: row.devin_session_id,
    sessionUrl: row.devin_session_url,
    prUrl: row.pr_url,
  };
}

/** Stores an app request and returns its id. */
export function createRequest(request: Omit<AppRequest, "id" | "createdAt" | keyof RequestSession>): number {
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

/** Records a request's Devin session, status, and pull request. */
export function updateRequest(id: number, session: RequestSession): void {
  open()
    .prepare("UPDATE app_requests SET status = ?, devin_session_id = ?, devin_session_url = ?, pr_url = ? WHERE id = ?")
    .run(session.status, session.sessionId, session.sessionUrl, session.prUrl, id);
}
