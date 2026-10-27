/**
 * App Catalog: the home page listing every internal app from its manifest.
 * Manifests are read at build time, which is enough because a new app always arrives through a merged PR.
 * Owner: spvyerra.
 */
import Link from "next/link";
import { listApps } from "@/lib/catalog";

export default function Catalog() {
  const apps = listApps();
  return (
    <main className="page">
      <h1>App Catalog</h1>
      <p>Internal apps built with Devin.</p>
      <ul className="grid">
        {apps.map((app) => (
          <li key={app.slug}>
            <Link href={`/apps/${app.slug}`} className="card">
              <strong>{app.name}</strong>
              <p>{app.description}</p>
              <p className="meta">Owner: {app.owner}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
