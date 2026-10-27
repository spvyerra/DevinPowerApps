/**
 * Feature Flag Admin Panel: lists every flag with an on/off toggle and creates and deletes flags through the Feature Flags service.
 * One server page with three server actions is the minimum, since only the forms need client state.
 * Owner: admin@example.com. Each app is its own route, so it cannot share a file with another app.
 */
import { Suspense } from "react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { auth, canOpenApp } from "@/auth";
import { services } from "@/lib/services";
import { CreateFlagForm, FlagActions, type FlagFormState } from "./form";

type Flag = {
  key: string;
  description: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const appSlug = "feature-flag-admin-panel";
const appPath = `/apps/${appSlug}`;
const baseUrl = services.find((service) => service.slug === "feature-flags")?.baseUrl;
const unavailable = "The Feature Flags service is unavailable. Try again in a moment.";

async function requireAccess() {
  const email = (await auth())?.user?.email;
  if (!email || !canOpenApp(email, appSlug)) throw new Error("You do not have access to this app");
}

async function callFlags(path: string, method = "GET", body?: unknown): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function errorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : `The Feature Flags service returned ${response.status}.`;
}

async function changeFlag(path: string, method: string, body?: unknown): Promise<FlagFormState> {
  let response: Response;
  try {
    response = await callFlags(path, method, body);
  } catch {
    return { error: unavailable };
  }
  if (!response.ok && response.status !== 404) return { error: await errorMessage(response) };
  revalidatePath(appPath);
  return {};
}

function flagPath(formData: FormData): string {
  return `/flags/${encodeURIComponent(String(formData.get("key") ?? ""))}`;
}

async function createFlag(_state: FlagFormState, formData: FormData): Promise<FlagFormState> {
  "use server";
  await requireAccess();
  const values = { key: String(formData.get("key") ?? "").trim(), description: String(formData.get("description") ?? "").trim() };
  let response: Response;
  try {
    response = await callFlags("/flags", "POST", values);
  } catch {
    return { error: unavailable, values };
  }
  if (!response.ok) return { error: await errorMessage(response), values };
  revalidatePath(appPath);
  return {};
}

async function setFlagEnabled(_state: FlagFormState, formData: FormData): Promise<FlagFormState> {
  "use server";
  await requireAccess();
  return changeFlag(flagPath(formData), "PATCH", { enabled: formData.get("enabled") === "true" });
}

async function deleteFlag(_state: FlagFormState, formData: FormData): Promise<FlagFormState> {
  "use server";
  await requireAccess();
  return changeFlag(flagPath(formData), "DELETE");
}

async function FlagList() {
  let flags: Flag[];
  try {
    const response = await callFlags("/flags");
    if (!response.ok) throw new Error(await errorMessage(response));
    flags = await response.json();
  } catch {
    return <p className="error" role="alert">{unavailable}</p>;
  }
  if (flags.length === 0) return <p>No flags yet. Create one above.</p>;
  return (
    <ul className="list">
      {flags.map((flag) => (
        <li key={flag.key} className="row">
          <div>
            <strong>{flag.key}</strong>
            {flag.description && <p>{flag.description}</p>}
          </div>
          <FlagActions flagKey={flag.key} enabled={flag.enabled} toggle={setFlagEnabled} remove={deleteFlag} />
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
      <p>Turn flags on or off, create new flags, and delete flags you no longer need.</p>
      <section className="panel">
        <h2>New flag</h2>
        <CreateFlagForm action={createFlag} />
      </section>
      <h2>Flags</h2>
      <Suspense fallback={<p>Loading flags...</p>}>
        <FlagList />
      </Suspense>
    </main>
  );
}
