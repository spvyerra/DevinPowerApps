/**
 * Admin panel to grant or revoke app access by email.
 * Grants are per app, so one page listing every app is the smallest useful panel.
 * Owner: spvyerra.
 */
import { Suspense } from "react";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { auth, isAdmin, normalizeEmail } from "@/auth";
import { listApps } from "@/lib/catalog";
import { grantAccess, listAccess, revokeAccess } from "@/lib/db";

async function requireAdmin() {
  const email = (await auth())?.user?.email;
  if (!email || !isAdmin(email)) throw new Error("Only admins can change access");
}

function knownSlug(value: FormDataEntryValue | null): string {
  const slug = String(value ?? "");
  if (!listApps().some((app) => app.slug === slug)) throw new Error("Unknown app");
  return slug;
}

async function grant(formData: FormData) {
  "use server";
  await requireAdmin();
  const email = normalizeEmail(formData.get("email"));
  if (!email) return;
  grantAccess(knownSlug(formData.get("app")), email);
  revalidatePath("/admin/access");
}

async function revoke(formData: FormData) {
  "use server";
  await requireAdmin();
  const email = normalizeEmail(formData.get("email"));
  if (!email) return;
  revokeAccess(knownSlug(formData.get("app")), email);
  revalidatePath("/admin/access");
}

async function AccessList() {
  await connection();
  return (
    <ul className="list">
      {listApps().map((app) => {
        const emails = listAccess(app.slug);
        return (
          <li key={app.slug} className="panel">
            <h2>{app.name}</h2>
            {emails.length === 0 ? (
              <p>No members granted. Admins can always open it.</p>
            ) : (
              <ul className="list">
                {emails.map((email) => (
                  <li key={email} className="row">
                    <span>{email}</span>
                    <form action={revoke}>
                      <input type="hidden" name="app" value={app.slug} />
                      <input type="hidden" name="email" value={email} />
                      <button type="submit" className="secondary">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={grant} className="inline-form">
              <input type="hidden" name="app" value={app.slug} />
              <label className="visually-hidden" htmlFor={`grant-${app.slug}`}>Email to grant {app.name}</label>
              <input id={`grant-${app.slug}`} type="email" name="email" required placeholder="name@example.com" />
              <button type="submit">Grant access</button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

export default function AccessPage() {
  return (
    <main className="page">
      <h1>App access</h1>
      <p>Members can open only the apps granted to them here.</p>
      <Suspense fallback={<p>Loading access...</p>}>
        <AccessList />
      </Suspense>
    </main>
  );
}
