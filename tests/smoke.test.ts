/**
 * Smoke tests for the DevinPowerApps service path, run by root `npm test`.
 * They boot the real feature-flag service and dev server and hit them over HTTP, since that is the cheapest end-to-end proof.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const webUrl = "http://localhost:3100";
const flagsUrl = "http://localhost:4100";
const dataDir = mkdtempSync(join(tmpdir(), "powerapps-test-"));
const children: ChildProcess[] = [];

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
  start("node", ["services/feature-flags/server.ts"], { FEATURE_FLAGS_PORT: "4100", FEATURE_FLAGS_DB: join(dataDir, "flags.db") });
  start("npx", ["next", "dev", "--port", "3100"], { FEATURE_FLAGS_URL: flagsUrl });
  await Promise.all([waitFor(`${flagsUrl}/health`, 10_000), waitFor(webUrl, 90_000)]);
});

after(() => {
  for (const child of children) if (child.pid) process.kill(-child.pid, "SIGTERM");
  rmSync(dataDir, { recursive: true, force: true });
});

test("feature-flag service creates, toggles, and deletes a flag", async () => {
  const created = await fetch(`${flagsUrl}/flags`, json("POST", { key: "new-checkout", description: "New flow" }));
  assert.equal(created.status, 201);
  assert.equal((await created.json()).enabled, false);

  assert.equal((await fetch(`${flagsUrl}/flags`, json("POST", { key: "new-checkout" }))).status, 409);
  assert.equal((await fetch(`${flagsUrl}/flags`, json("POST", { key: "Bad Key" }))).status, 400);

  const toggled = await fetch(`${flagsUrl}/flags/new-checkout`, json("PATCH", { enabled: true }));
  assert.equal((await toggled.json()).enabled, true);

  const listed = await (await fetch(`${flagsUrl}/flags`)).json();
  assert.deepEqual(listed.map((flag: { key: string }) => flag.key), ["new-checkout"]);

  assert.equal((await fetch(`${flagsUrl}/flags/new-checkout`, { method: "DELETE" })).status, 204);
  assert.equal((await fetch(`${flagsUrl}/flags/new-checkout`, { method: "DELETE" })).status, 404);
});

test("catalog lists the Service Health app", async () => {
  const response = await fetch(webUrl);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /App Catalog/);
  assert.match(html, /href="\/apps\/service-health"/);
});

test("Service Health shows the feature-flag service as up", async () => {
  const html = await (await fetch(`${webUrl}/apps/service-health`)).text();
  assert.match(html, /Feature Flags/);
  assert.match(html, />Up</);
});
