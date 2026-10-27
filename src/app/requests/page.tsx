/**
 * Requests page listing app requests with their Devin session, pull request, and prompt.
 * Admins see every request and members see their own, so one page serves both.
 * Owner: spvyerra.
 */
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { auth, isAdmin } from "@/auth";
import { listRequests, updateRequest, type AppRequest } from "@/lib/db";
import { devinEnabled, getSession } from "@/lib/devin";
import { CopyButton } from "./copy-button";

const statusLabels: Record<string, string> = {
  draft: "draft",
  failed: "could not confirm a Devin session",
  new: "Devin is starting",
  claimed: "Devin is starting",
  running: "Devin is working",
  resuming: "Devin is resuming",
  suspended: "Devin is paused",
  exit: "Devin finished",
  error: "Devin hit an error",
};

const doneStatuses = new Set(["exit", "error"]);

async function refresh(request: AppRequest): Promise<AppRequest> {
  if (!request.sessionId || (doneStatuses.has(request.status) && request.prUrl) || !devinEnabled()) return request;
  try {
    const session = await getSession(request.sessionId);
    const fields = { status: session.status, sessionId: session.sessionId, sessionUrl: session.url, prUrl: session.prUrl };
    updateRequest(request.id, fields);
    return { ...request, ...fields };
  } catch (error) {
    console.error(error);
    return request;
  }
}

async function RequestList() {
  await connection();
  const email = (await auth())?.user?.email;
  if (!email) return null;
  const requests = await Promise.all(listRequests(isAdmin(email) ? null : email).map(refresh));
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
            {request.requesterEmail} on {new Date(request.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC. Status: {statusLabels[request.status] ?? request.status}.
          </p>
          {request.status === "failed" && (
            <p>
              The Devin API call failed, so a session may or may not exist. Look for a session titled &quot;App request: {request.name}&quot; in Devin before
              starting a new one.
            </p>
          )}
          {!request.sessionId && <p>Start a Devin session for this repo, paste the prompt, and attach the screenshot if there is one.</p>}
          <div className="actions">
            {request.sessionUrl && <a href={request.sessionUrl} target="_blank" rel="noreferrer">Open Devin session</a>}
            {request.prUrl && <a href={request.prUrl} target="_blank" rel="noreferrer">Open pull request</a>}
            <CopyButton text={request.prompt} />
            {request.screenshotPath && <a href={`/requests/${request.id}/screenshot`} download>Download screenshot</a>}
            {!request.sessionId && <a href="https://app.devin.ai" target="_blank" rel="noreferrer">Open Devin</a>}
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
