/**
 * Requests page listing app requests with the Devin prompt to paste into a new session.
 * Admins see every request and members see their own, so one page serves both.
 * Owner: spvyerra.
 */
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { auth, isAdmin } from "@/auth";
import { listRequests } from "@/lib/db";
import { CopyButton } from "./copy-button";

async function RequestList() {
  await connection();
  const email = (await auth())?.user?.email;
  if (!email) return null;
  const requests = listRequests(isAdmin(email) ? null : email);
  if (requests.length === 0) {
    return (
      <p>
        No requests yet. <Link href="/create">Create an app</Link>.
      </p>
    );
  }
  return (
    <ul className="list">
      {requests.map((request) => (
        <li key={request.id} className="panel">
          <h2>{request.name}</h2>
          <p className="meta">
            {request.requesterEmail} on {new Date(request.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC. Status: draft.
          </p>
          <p>Start a Devin session for this repo, paste the prompt, and attach the screenshot if there is one.</p>
          <div className="actions">
            <CopyButton text={request.prompt} />
            {request.screenshotPath && <a href={`/requests/${request.id}/screenshot`} download>Download screenshot</a>}
            <a href="https://app.devin.ai" target="_blank" rel="noreferrer">Open Devin</a>
          </div>
          <pre className="prompt">{request.prompt}</pre>
        </li>
      ))}
    </ul>
  );
}

export default function RequestsPage() {
  return (
    <main className="page">
      <h1>App requests</h1>
      <Suspense fallback={<p>Loading requests...</p>}>
        <RequestList />
      </Suspense>
    </main>
  );
}
