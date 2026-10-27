/**
 * Mock feature-flag service that stands in for an existing internal business service.
 * It is a single `node:http` file over `node:sqlite` so the demo needs no extra dependencies.
 * Owner: spvyerra. It runs as its own process, so it cannot live inside the Next.js app.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const port = Number(process.env.FEATURE_FLAGS_PORT ?? 4001);
const host = process.env.FEATURE_FLAGS_HOST ?? "127.0.0.1";
const dbPath = process.env.FEATURE_FLAGS_DB ?? "data/flags.db";
const maxBodyBytes = 16 * 1024;
const keyPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`CREATE TABLE IF NOT EXISTS flags (
  key TEXT PRIMARY KEY,
  description TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`);

type FlagRow = { key: string; description: string; enabled: number; created_at: string; updated_at: string };

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function toFlag(row: FlagRow) {
  return {
    key: row.key,
    description: row.description,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findFlag(key: string): FlagRow | undefined {
  return db.prepare("SELECT * FROM flags WHERE key = ?").get(key) as FlagRow | undefined;
}

function decodeKey(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    throw new HttpError(400, "Flag key in the URL is not valid percent-encoding");
  }
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new HttpError(413, "Request body is too large");
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new HttpError(400, "Request body must be a JSON object");
  }
}

function send(res: ServerResponse, status: number, body?: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  const flagKey = pathname.startsWith("/flags/") ? decodeKey(pathname.slice("/flags/".length)) : null;

  if (req.method === "GET" && pathname === "/health") return send(res, 200, { ok: true });

  if (req.method === "GET" && pathname === "/flags") {
    const rows = db.prepare("SELECT * FROM flags ORDER BY key").all() as FlagRow[];
    return send(res, 200, rows.map(toFlag));
  }

  if (req.method === "POST" && pathname === "/flags") {
    const { key, description = "" } = await readJson(req);
    if (typeof key !== "string" || !keyPattern.test(key) || key.length > 64) {
      throw new HttpError(400, "key must be 1-64 lowercase letters, digits, and single dashes");
    }
    if (typeof description !== "string" || description.length > 500) {
      throw new HttpError(400, "description must be a string of at most 500 characters");
    }
    if (findFlag(key)) throw new HttpError(409, `Flag ${key} already exists`);
    const now = new Date().toISOString();
    db.prepare("INSERT INTO flags (key, description, enabled, created_at, updated_at) VALUES (?, ?, 0, ?, ?)").run(key, description, now, now);
    return send(res, 201, toFlag(findFlag(key)!));
  }

  if (req.method === "PATCH" && flagKey) {
    const { enabled } = await readJson(req);
    if (typeof enabled !== "boolean") throw new HttpError(400, "enabled must be true or false");
    if (!findFlag(flagKey)) throw new HttpError(404, `Flag ${flagKey} not found`);
    db.prepare("UPDATE flags SET enabled = ?, updated_at = ? WHERE key = ?").run(enabled ? 1 : 0, new Date().toISOString(), flagKey);
    return send(res, 200, toFlag(findFlag(flagKey)!));
  }

  if (req.method === "DELETE" && flagKey) {
    if (!findFlag(flagKey)) throw new HttpError(404, `Flag ${flagKey} not found`);
    db.prepare("DELETE FROM flags WHERE key = ?").run(flagKey);
    return send(res, 204);
  }

  throw new HttpError(404, `No route for ${req.method} ${pathname}`);
}

createServer((req, res) => {
  route(req, res).catch((error: unknown) => {
    if (error instanceof HttpError) return send(res, error.status, { error: error.message });
    console.error(error);
    send(res, 500, { error: "Internal error" });
  });
}).listen(port, host, () => {
  console.log(`feature-flags service listening on http://${host}:${port}`);
});
