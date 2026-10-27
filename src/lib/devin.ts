/**
 * Builds the Devin prompt for an app request and starts and reads Devin sessions through the Devin v3 API.
 * It is the one place that talks to Devin, so the Creator and the requests page send and read the same shapes.
 * Owner: spvyerra.
 */
import { services } from "./services.ts";

export const repo = "spvyerra/DevinPowerApps";

export type PromptInput = {
  name: string;
  slug: string;
  description: string;
  requesterEmail: string;
  services: string[];
  docLinks: string[];
  hasScreenshot: boolean;
};

/** Returns the prompt that asks Devin to build the requested app in this repo and open a PR. */
export function buildPrompt(input: PromptInput): string {
  const chosen = services.filter((service) => input.services.includes(service.slug));
  const lines = [
    `Build a new internal app in the GitHub repo ${repo} and open a pull request.`,
    "",
    `App name: ${input.name}`,
    `Folder: src/app/apps/${input.slug}/`,
    `Requested by: ${input.requesterEmail}`,
    "",
    "What the app should do:",
    input.description,
    "",
    "Services to use:",
    ...(chosen.length
      ? chosen.map((service) => `- ${service.name} (slug "${service.slug}"): read the API doc at ${service.apiDoc}.`)
      : ["- None."]),
  ];
  if (input.docLinks.length) lines.push("", "Extra docs to read:", ...input.docLinks.map((link) => `- ${link}`));
  if (input.hasScreenshot) lines.push("", "A screenshot of the intended UI is attached. Match its layout.");
  lines.push(
    "",
    "How to build it:",
    "1. Read AGENTS.md and follow every rule in it.",
    "2. Copy the pattern of the reference app in src/app/apps/service-health/: a page.tsx plus an app.json manifest.",
    `3. In app.json set name, description, owner "${input.requesterEmail}", and services ${JSON.stringify(chosen.map((service) => service.slug))}.`,
    "4. Call services only from server code (server components or server actions), using the base URL from src/lib/services.ts.",
    "5. The route guard in src/proxy.ts already protects /apps/<slug>, so add no auth code.",
    "6. Add a smoke test under tests/ for the new app, and make npm run lint, npm run typecheck, npm test, and npm run build pass.",
    "7. Update README.md, then open a pull request.",
  );
  return lines.join("\n");
}

export type DevinSession = { sessionId: string; url: string; status: string; prUrl: string | null };

type SessionBody = { session_id: string; url: string; status: string; pull_requests?: { pr_url: string }[] };

/** Returns true when `DEVIN_API_KEY` and `DEVIN_ORG_ID` are set, so requests go straight to Devin. */
export function devinEnabled(): boolean {
  return Boolean(process.env.DEVIN_API_KEY && process.env.DEVIN_ORG_ID);
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = process.env.DEVIN_API_URL ?? "https://api.devin.ai";
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${process.env.DEVIN_API_KEY}`);
  const response = await fetch(`${base}/v3/organizations/${process.env.DEVIN_ORG_ID}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(`Devin API ${init.method ?? "GET"} ${path} returned ${response.status}`);
  return (await response.json()) as T;
}

function toSession(body: SessionBody): DevinSession {
  return { sessionId: body.session_id, url: body.url, status: body.status, prUrl: body.pull_requests?.[0]?.pr_url ?? null };
}

/** Starts a Devin session with the prompt, uploading the screenshot first so the session gets it as an attachment. */
export async function startSession(prompt: string, title: string, screenshot: File | null): Promise<DevinSession> {
  const attachmentUrls: string[] = [];
  if (screenshot) {
    const form = new FormData();
    form.append("file", screenshot);
    attachmentUrls.push((await call<{ url: string }>("/attachments", { method: "POST", body: form })).url);
  }
  const body = JSON.stringify({ prompt, title, attachment_urls: attachmentUrls, tags: ["devin-powerapps"] });
  return toSession(await call<SessionBody>("/sessions", { method: "POST", headers: { "content-type": "application/json" }, body }));
}

/** Reads a Devin session's current status and pull request. */
export async function getSession(sessionId: string): Promise<DevinSession> {
  return toSession(await call<SessionBody>(`/sessions/${encodeURIComponent(sessionId)}`));
}
