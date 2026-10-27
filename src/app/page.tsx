/**
 * App Catalog: the home page listing every internal app from its manifest.
 * Every app is listed, and apps the user was not granted show who to ask instead of a link.
 * Owner: spvyerra.
 */
import { Suspense } from "react";
import Link from "next/link";
import { auth, canOpenApp } from "@/auth";
import { listApps } from "@/lib/catalog";

async function AppGrid() {
  const email = (await auth())?.user?.email ?? "";
  return (
    <ul className="grid">
      {listApps().map((app) => {
        const body = (
          <>
            <strong>{app.name}</strong>
            <p>{app.description}</p>
            <p className="meta">Owner: {app.owner}</p>
          </>
        );
        return (
          <li key={app.slug}>
            {canOpenApp(email, app.slug) ? (
              <Link href={`/apps/${app.slug}`} className="card">{body}</Link>
            ) : (
              <div className="card locked">
                {body}
                <p className="meta">Locked. Ask {app.owner} or an admin for access.</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Catalog() {
  return (
    <main className="page">
      <h1>App Catalog</h1>
      <p>Internal apps built with Devin.</p>
      <Suspense fallback={<p>Loading apps...</p>}>
        <AppGrid />
      </Suspense>
    </main>
  );
}
