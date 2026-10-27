/**
 * Smoke tests for the DevinPowerApps service path, run by root `npm test`.
 * They boot the real feature-flag service and dev server and hit them over HTTP, since that is the cheapest end-to-end proof.
 * Owner: spvyerra.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";

const webUrl = "http://localhost:3100";
const flagsUrl = "http://localhost:4100";
const dataDir = mkdtempSync(join(tmpdir(), "powerapps-test-"));
const appDb = join(dataDir, "app.db");
const children: ChildProcess[] = [];
const devinEnv = { DEVIN_API_URL: "http://localhost:4200", DEVIN_API_KEY: "cog_test", DEVIN_ORG_ID: "org-test" };
const devinCalls: string[] = [];
let devinSessionBody: { attachment_urls?: string[]; prompt?: string } = {};
const fakeDevin = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    devinCalls.push(`${request.method} ${request.url}`);
    const reply = (status: number, value: unknown) => response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(value));
    if (request.headers.authorization !== "Bearer cog_test") return reply(401, { detail: "bad key" });
    const session = { session_id: "devin-test", url: "https://app.devin.ai/sessions/test", status: "new", pull_requests: [] as { pr_url: string }[] };
    if (request.method === "POST" && request.url === "/v3/organizations/org-test/attachments") return reply(200, { attachment_id: "a1", name: "shot.png", url: "https://example.com/shot.png" });
    if (request.method === "POST" && request.url === "/v3/organizations/org-test/sessions") {
      devinSessionBody = JSON.parse(body);
      return reply(200, session);
    }
    if (request.method === "GET" && request.url === "/v3/organizations/org-test/sessions/devin-test") {
      return reply(200, { ...session, status: "running", pull_requests: [{ pr_url: "https://github.com/spvyerra/DevinPowerApps/pull/99", pr_state: "open" }] });
    }
    reply(404, { detail: "not found" });
  });
});

async function signIn(email: string): Promise<string> {
  const csrf = await fetch(`${webUrl}/api/auth/csrf`);
  const { csrfToken } = await csrf.json();
  const csrfCookie = csrf.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
  const response = await fetch(`${webUrl}/api/auth/callback/dev`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email, callbackUrl: "/" }),
  });
  const session = response.headers.getSetCookie().find((cookie) => cookie.startsWith("authjs.session-token="));
  assert.ok(session, `dev login for ${email} set no session cookie`);
  return session.split(";")[0];
}

function get(path: string, cookie?: string): Promise<Response> {
  return fetch(`${webUrl}${path}`, { redirect: "manual", headers: cookie ? { cookie } : {} });
}

function start(command: string, args: string[], env: Record<string, string>): void {
  children.push(spawn(command, args, { stdio: "ignore", detached: true, env: { ...process.env, ...env } }));
}

async function waitFor(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`${url} did not become ready within ${timeoutMs} ms`);
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

before(async () => {
  await new Promise<void>((resolve) => fakeDevin.listen(4200, "127.0.0.1", resolve));
  start("node", ["services/feature-flags/server.ts"], { FEATURE_FLAGS_PORT: "4100", FEATURE_FLAGS_DB: join(dataDir, "flags.db") });
  start("npx", ["next", "dev", "--port", "3100"], {
    FEATURE_FLAGS_URL: flagsUrl,
    APP_DB: appDb,
    AUTH_SECRET: "smoke-test-secret",
    AUTH_DEV_LOGIN: "true",
    ADMIN_EMAILS: "admin@example.com",
    OIDC_ISSUER: "",
    ...devinEnv,
  });
  await Promise.all([waitFor(`${flagsUrl}/health`, 10_000), waitFor(`${webUrl}/signin`, 90_000)]);
});

after(() => {
  fakeDevin.close();
  for (const child of children) if (child.pid) process.kill(-child.pid, "SIGTERM");
  rmSync(dataDir, { recursive: true, force: true });
});

test("feature-flag service creates, toggles, and deletes a flag", async () => {
  const created = await fetch(`${flagsUrl}/flags`, json("POST", { key: "new-checkout", description: "New flow" }));
  assert.equal(created.status, 201);
  assert.equal((await created.json()).enabled, false);

  assert.equal((await fetch(`${flagsUrl}/flags`, json("POST", { key: "new-checkout" }))).status, 409);
  assert.equal((await fetch(`${flagsUrl}/flags`, json("POST", { key: "Bad Key" }))).status, 400);
  assert.equal((await fetch(`${flagsUrl}/flags/%`, { method: "DELETE" })).status, 400);

  const toggled = await fetch(`${flagsUrl}/flags/new-checkout`, json("PATCH", { enabled: true }));
  assert.equal((await toggled.json()).enabled, true);

  const listed = await (await fetch(`${flagsUrl}/flags`)).json();
  assert.deepEqual(listed.map((flag: { key: string }) => flag.key), ["new-checkout"]);

  assert.equal((await fetch(`${flagsUrl}/flags/new-checkout`, { method: "DELETE" })).status, 204);
  assert.equal((await fetch(`${flagsUrl}/flags/new-checkout`, { method: "DELETE" })).status, 404);
});

test("signed-out visitors are sent to sign-in", async () => {
  const response = await get("/apps/service-health");
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") ?? "", /\/signin\?callbackUrl=%2Fapps%2Fservice-health/);
  assert.equal((await get("/signin")).status, 200);
});

test("admin sees the catalog and opens Service Health with the service up", async () => {
  const admin = await signIn("Admin@Example.com");
  const catalog = await (await get("/", admin)).text();
  assert.match(catalog, /href="\/apps\/service-health"/);
  const health = await get("/apps/service-health", admin);
  assert.equal(health.status, 200);
  assert.match(await health.text(), />Up</);
  assert.equal((await get("/admin/access", admin)).status, 200);
});

test("members open only granted apps and never the admin panel", async () => {
  const member = await signIn("member@example.com");
  const denied = await get("/apps/service-health", member);
  assert.equal(denied.status, 307);
  assert.match(denied.headers.get("location") ?? "", /\/no-access\?app=service-health/);
  assert.match(await (await get("/", member)).text(), /Locked/);
  assert.equal((await get("/admin/access", member)).status, 307);

  const db = new DatabaseSync(appDb);
  db.prepare("INSERT INTO app_access (app_slug, email) VALUES (?, ?)").run("service-health", "member@example.com");
  db.close();
  assert.equal((await get("/apps/service-health", member)).status, 200);
});

test("an app request stores a prompt naming the service doc and reference app", async () => {
  process.env.APP_DB = appDb;
  const { buildPrompt } = await import("../src/lib/devin.ts");
  const { createRequest } = await import("../src/lib/db.ts");
  const input = {
    name: "Feature Flags Admin",
    slug: "feature-flags-admin",
    description: "List, create, toggle, and delete true/false flags.",
    requesterEmail: "member@example.com",
    services: ["feature-flags"],
    docLinks: [],
    hasScreenshot: false,
  };
  const prompt = buildPrompt(input);
  assert.match(prompt, /src\/app\/apps\/feature-flags-admin\//);
  assert.match(prompt, /docs\/services\/feature-flags\.md/);
  assert.match(prompt, /src\/app\/apps\/service-health\//);
  createRequest({ ...input, screenshotPath: null, prompt });
  assert.throws(() => createRequest({ ...input, screenshotPath: null, prompt }), /constraint failed/);

  const mine = await (await get("/requests", await signIn("member@example.com"))).text();
  assert.match(mine, /Feature Flags Admin/);
  assert.match(mine, /docs\/services\/feature-flags\.md/);
  assert.doesNotMatch(await (await get("/requests", await signIn("other@example.com"))).text(), /Feature Flags Admin/);
  assert.match(await (await get("/requests", await signIn("admin@example.com"))).text(), /Feature Flags Admin/);
  assert.equal((await get("/create", await signIn("other@example.com"))).status, 200);
});

test("with a Devin key, a request starts a Devin session and the requests page shows its pull request", async () => {
  process.env.APP_DB = appDb;
  Object.assign(process.env, devinEnv);
  const { startSession } = await import("../src/lib/devin.ts");
  const { createRequest, updateRequest } = await import("../src/lib/db.ts");
  const screenshot = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "shot.png", { type: "image/png" });
  const session = await startSession("Build the Session App.", "App request: Session App", screenshot);
  assert.equal(session.sessionId, "devin-test");
  assert.deepEqual(devinSessionBody.attachment_urls, ["https://example.com/shot.png"]);
  assert.equal(devinSessionBody.prompt, "Build the Session App.");

  const id = createRequest({
    requesterEmail: "member@example.com",
    name: "Session App",
    slug: "session-app",
    description: "Checks the Devin session flow.",
    screenshotPath: null,
    services: [],
    docLinks: [],
    prompt: "Build the Session App.",
  });
  updateRequest(id, { status: session.status, sessionId: session.sessionId, sessionUrl: session.url, prUrl: session.prUrl });
  const page = await (await get("/requests", await signIn("member@example.com"))).text();
  assert.match(page, /https:\/\/github\.com\/spvyerra\/DevinPowerApps\/pull\/99/);
  assert.match(page, /https:\/\/app\.devin\.ai\/sessions\/test/);
  assert.match(page, /Devin is working/);
  assert.ok(devinCalls.includes("GET /v3/organizations/org-test/sessions/devin-test"));
});
