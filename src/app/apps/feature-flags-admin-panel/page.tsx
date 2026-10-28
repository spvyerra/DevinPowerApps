/**
 * Feature Flags Admin Panel: lists every flag with an on/off switch, and creates and deletes flags.
 * One server page with two server actions is the minimum that covers the four Feature Flags endpoints it uses.
 * Owner: sai@example.com. Each app is its own route, so it cannot share a file with the catalog.
 */
import { Suspense } from "react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { auth, canOpenApp } from "@/auth";
import { services } from "@/lib/services";
import { CreateFlagForm, FlagControls, type FlagState } from "./form";

type Flag = { key: string; description: string; enabled: boolean };

const appSlug = "feature-flags-admin-panel";
const appPath = `/apps/${appSlug}`;
const flagsUrl = services.find((service) => service.slug === "feature-flags")?.baseUrl;
const unreachable = "The Feature Flags service is not reachable.";

async function callFlags(path: string, init: RequestInit = {}): Promise<Response | null> {
  try {
    return await fetch(`${flagsUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return null;
  }
}

async function changeResult(response: Response | null): Promise<FlagState> {
  if (!response) return { error: unreachable };
  if (response.ok) return {};
  const body = await response.json().catch(() => null);
  return { error: body?.error ?? `The Feature Flags service returned ${response.status}.` };
}

async function canEdit(): Promise<boolean> {
  const email = (await auth())?.user?.email;
  return Boolean(email && canOpenApp(email, appSlug));
}

async function createFlag(_state: FlagState, formData: FormData): Promise<FlagState> {
  "use server";
  const values = { key: String(formData.get("key") ?? "").trim(), description: String(formData.get("description") ?? "").trim() };
  if (!(await canEdit())) return { error: "You do not have access to this app.", values };
  const result = await changeResult(await callFlags("/flags", { method: "POST", body: JSON.stringify(values) }));
  revalidatePath(appPath);
  return result.error ? { ...result, values } : {};
}

async function changeFlag(_state: FlagState, formData: FormData): Promise<FlagState> {
  "use server";
  if (!(await canEdit())) return { error: "You do not have access to this app." };
  const path = `/flags/${encodeURIComponent(String(formData.get("key") ?? ""))}`;
  const enabled = formData.get("enabled");
  let response: Response | null;
  if (formData.get("intent") === "delete") response = await callFlags(path, { method: "DELETE" });
  else if (enabled === "true" || enabled === "false") response = await callFlags(path, { method: "PATCH", body: JSON.stringify({ enabled: enabled === "true" }) });
  else return { error: "Unknown change." };
  const result = await changeResult(response);
  revalidatePath(appPath);
  return result;
}

async function listFlags(): Promise<Flag[] | null> {
  const response = await callFlags("/flags");
  return response?.ok ? ((await response.json()) as Flag[]) : null;
}

async function FlagList() {
  const flags = await listFlags();
  if (!flags) return <p className="error" role="alert">{unreachable}</p>;
  if (flags.length === 0) return <p>No flags yet.</p>;
  return (
    <ul className="list">
      {flags.map((flag) => (
        <li key={flag.key} className="row">
          <div>
            <strong>{flag.key}</strong>
            {flag.description && <p>{flag.description}</p>}
          </div>
          <FlagControls action={changeFlag} flagKey={flag.key} enabled={flag.enabled} />
        </li>
      ))}
    </ul>
  );
}

export default function FeatureFlagsAdminPanelPage() {
  return (
    <main className="page">
      <Link href="/">Back to catalog</Link>
      <h1>Feature Flags Admin Panel</h1>
      <section className="panel">
        <h2>New flag</h2>
        <p>New flags start off.</p>
        <CreateFlagForm action={createFlag} />
      </section>
      <h2>Flags</h2>
      <Suspense fallback={<p>Loading flags...</p>}>
        <FlagList />
      </Suspense>
    </main>
  );
}
