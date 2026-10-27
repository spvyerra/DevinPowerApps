/**
 * Serves a request's screenshot to its requester or an admin, so it can be attached to the Devin session.
 * Uploads live outside `public/` to keep them private, so they need this handler.
 * Owner: spvyerra.
 */
import { readFile } from "node:fs/promises";
import { auth, isAdmin } from "@/auth";
import { getRequest } from "@/lib/db";

export async function GET(_request: Request, { params }: RouteContext<"/requests/[id]/screenshot">) {
  const email = (await auth())?.user?.email;
  const request = getRequest(Number((await params).id));
  if (!email || !request?.screenshotPath || (request.requesterEmail !== email && !isAdmin(email))) {
    return new Response("Not found", { status: 404 });
  }
  const type = request.screenshotPath.endsWith(".png") ? "image/png" : "image/jpeg";
  return new Response(await readFile(request.screenshotPath), {
    headers: { "content-type": type, "cache-control": "private, no-store", "content-disposition": `attachment; filename="${request.slug}${request.screenshotPath.slice(-4)}"` },
  });
}
