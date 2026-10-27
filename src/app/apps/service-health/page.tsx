/**
 * Service Health app: shows whether each registered internal service answers `GET /health`.
 * It is the reference pattern for new apps: a manifest, a server component, and server-side service calls.
 * Owner: spvyerra. Each app is its own route, so it cannot share a file with the catalog.
 */
import { Suspense } from "react";
import Link from "next/link";
import { services, type Service } from "@/lib/services";

async function isUp(service: Service): Promise<boolean> {
  try {
    const response = await fetch(`${service.baseUrl}/health`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function HealthList() {
  const results = await Promise.all(services.map(async (service) => ({ service, up: await isUp(service) })));
  return (
    <ul className="list">
      {results.map(({ service, up }) => (
        <li key={service.slug} className="row">
          <div>
            <strong>{service.name}</strong>
            <p>{service.baseUrl}</p>
          </div>
          <span className={up ? "status up" : "status down"}>{up ? "Up" : "Down"}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ServiceHealthPage() {
  return (
    <main className="page">
      <Link href="/">Back to catalog</Link>
      <h1>Service Health</h1>
      <Suspense fallback={<p>Checking services...</p>}>
        <HealthList />
      </Suspense>
    </main>
  );
}
