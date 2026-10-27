/**
 * Smoke tests for the DevinPowerApps service path, run by root `npm test`.
 * They boot the real dev server and hit it over HTTP, since that is the cheapest proof the app serves.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";

const port = 3100;
const baseUrl = `http://localhost:${port}`;
let server: ChildProcess;

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs} ms`);
}

before(async () => {
  server = spawn("npx", ["next", "dev", "--port", String(port)], { stdio: "ignore", detached: true });
  await waitForServer(baseUrl, 90_000);
});

after(() => {
  if (server.pid) process.kill(-server.pid, "SIGTERM");
});

test("home page renders the app name", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /DevinPowerApps/);
});
