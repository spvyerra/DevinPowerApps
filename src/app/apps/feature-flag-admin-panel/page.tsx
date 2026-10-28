/**
 * Feature Flag Admin Panel: lists every flag with a toggle, and creates and deletes flags.
 * It follows the Service Health pattern, a manifest plus a server component, with server actions for the three writes.
 * Owner: sai@example.com. Each app is its own route, so it cannot share a file with another app.
 */
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { auth, canOpenApp } from "@/auth";
import { services } from "@/lib/services";
import { CreateFlagForm, type CreateFlagState } from "./form";

type Flag = { key: string; description: string; enabled: boolean };

const appSlug = "feature-flag-admin-panel";
const appPath = `/apps/${appSlug}`;
const baseUrl = services.find((service) => service.slug === "feature-flags")!.baseUrl;

async function requireAccess() {
  const email = (await auth())?.user?.email;
  if (!email || !canOpenApp(email, appSlug)) throw new Error("You do not have access to this app");
}

async function callService(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, { cache: "no-store", signal: AbortSignal.timeout(5000), ...init });
}

async function serviceError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.error ?? `Feature Flags service returned ${response.status}`;
}

function flagPath(formData: FormData): string {
  return `/flags/${encodeURIComponent(String(formData.get("key") ?? ""))}`;
}

async function createFlag(_state: CreateFlagState, formData: FormData): Promise<CreateFlagState> {
  "use server";
  await requireAccess();
  const values = { key: String(formData.get("key") ?? "").trim(), description: String(formData.get("description") ?? "").trim() };
  try {
    const response = await callService("/flags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) return { error: await serviceError(response), values };
  } catch {
    return { error: "Feature Flags service is not reachable", values };
  }
  revalidatePath(appPath);
  return {};
}

async function toggleFlag(formData: FormData) {
  "use server";
  await requireAccess();
  const response = await callService(flagPath(formData), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: formData.get("enabled") === "true" }),
  });
  if (!response.ok && response.status !== 404) throw new Error(await serviceError(response));
  revalidatePath(appPath);
}

async function deleteFlag(formData: FormData) {
  "use server";
  await requireAccess();
  const response = await callService(flagPath(formData), { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw new Error(await serviceError(response));
  revalidatePath(appPath);
}

async function loadFlags(): Promise<{ flags: Flag[] } | { error: string }> {
  try {
    const response = await callService("/flags");
    return response.ok ? { flags: await response.json() } : { error: await serviceError(response) };
  } catch {
    return { error: "Feature Flags service is not reachable." };
  }
}

async function FlagList() {
  await connection();
  const result = await loadFlags();
  if ("error" in result) return <p className="error">{result.error}</p>;
  const { flags } = result;
  if (flags.length === 0) return <p>No flags yet. Create one below.</p>;
  return (
    <ul className="list">
      {flags.map((flag) => (
        <li key={flag.key} className="row">
          <div>
            <strong>{flag.key}</strong>
            {flag.description && <p>{flag.description}</p>}
          </div>
          <div className="actions">
            <span className={flag.enabled ? "status up" : "status down"}>{flag.enabled ? "On" : "Off"}</span>
            <form action={toggleFlag}>
              <input type="hidden" name="key" value={flag.key} />
              <input type="hidden" name="enabled" value={String(!flag.enabled)} />
              <button type="submit" aria-label={`Turn ${flag.enabled ? "off" : "on"} ${flag.key}`}>{flag.enabled ? "Turn off" : "Turn on"}</button>
            </form>
            <form action={deleteFlag}>
              <input type="hidden" name="key" value={flag.key} />
              <button type="submit" className="secondary" aria-label={`Delete ${flag.key}`}>Delete</button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function FeatureFlagAdminPanelPage() {
  return (
    <main className="page">
      <Link href="/">Back to catalog</Link>
      <h1>Feature Flag Admin Panel</h1>
      <Suspense fallback={<p>Loading flags...</p>}>
        <FlagList />
      </Suspense>
      <section className="panel">
        <h2>New flag</h2>
        <p>New flags start off.</p>
        <CreateFlagForm action={createFlag} />
      </section>
    </main>
  );
}
