/**
 * Page shown when a signed-in member opens an app they were not granted.
 * The proxy redirects here, so it needs its own route.
 * Owner: spvyerra.
 */
import { Suspense } from "react";
import Link from "next/link";
import { listApps } from "@/lib/catalog";

async function Message({ searchParams }: { searchParams: PageProps<"/no-access">["searchParams"] }) {
  const { app } = await searchParams;
  const manifest = listApps().find((entry) => entry.slug === app);
  if (!manifest) return <p>You do not have access to that app.</p>;
  return (
    <p>
      You do not have access to <strong>{manifest.name}</strong>. Ask its owner, {manifest.owner}, or an admin to grant it.
    </p>
  );
}

export default function NoAccessPage({ searchParams }: PageProps<"/no-access">) {
  return (
    <main className="page">
      <h1>No access</h1>
      <Suspense fallback={null}>
        <Message searchParams={searchParams} />
      </Suspense>
      <Link href="/">Back to catalog</Link>
    </main>
  );
}
