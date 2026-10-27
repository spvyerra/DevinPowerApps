/**
 * App Creator: the form where a user requests a new app for Devin to build.
 * The page validates and stores the request in its server action, so the form, rules, and storage stay in one route.
 * Owner: spvyerra.
 */
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listApps } from "@/lib/catalog";
import { services } from "@/lib/services";
import { buildPrompt } from "@/lib/devin";
import { createRequest } from "@/lib/db";
import { CreateForm, type CreateState } from "./form";

const maxScreenshotBytes = 5 * 1024 * 1024;
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const uploadsDir = join("data", "uploads");
const sqliteUniqueViolation = 2067;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
}

function screenshotType(bytes: Uint8Array): "png" | "jpg" | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return null;
}

async function createApp(_state: CreateState, formData: FormData): Promise<CreateState> {
  "use server";
  const email = (await auth())?.user?.email;
  if (!email) return { error: "Sign in again to submit a request." };


  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const chosen = formData.getAll("services").map(String);
  const docLinks = String(formData.get("docLinks") ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
  const screenshot = formData.get("screenshot");
  const slug = slugify(name);
  const values = { name, description, services: chosen, docLinks: docLinks.join("\n") };
  const fail = (error: string): CreateState => ({ error, values });

  if (name.length < 3 || name.length > 60) return fail("App name must be 3 to 60 characters.");
  if (!slugPattern.test(slug)) return fail("App name must contain letters or digits.");
  if (listApps().some((app) => app.slug === slug)) return fail(`An app named "${slug}" already exists.`);
  if (description.length < 10 || description.length > 5000) return fail("Describe the UI in 10 to 5000 characters.");
  if (chosen.some((slug) => !services.some((service) => service.slug === slug))) return fail("Pick services from the list.");
  if (docLinks.length > 10) return fail("Add at most 10 doc links.");
  if (docLinks.some((link) => !URL.canParse(link) || !/^https?:$/.test(new URL(link).protocol))) {
    return fail("Doc links must be http or https URLs, one per line.");
  }

  let screenshotPath: string | null = null;
  if (screenshot instanceof File && screenshot.size > 0) {
    if (screenshot.size > maxScreenshotBytes) return fail("The screenshot must be 5 MB or smaller.");
    const bytes = new Uint8Array(await screenshot.arrayBuffer());
    const type = screenshotType(bytes);
    if (!type) return fail("The screenshot must be a PNG or JPEG image.");
    await mkdir(uploadsDir, { recursive: true });
    screenshotPath = join(uploadsDir, `${randomUUID()}.${type}`);
    await writeFile(screenshotPath, bytes);
  }

  const prompt = buildPrompt({ name, slug, description, requesterEmail: email, services: chosen, docLinks, hasScreenshot: screenshotPath !== null });
  try {
    createRequest({ requesterEmail: email, name, slug, description, screenshotPath, services: chosen, docLinks, prompt });
  } catch (error) {
    if (screenshotPath) await rm(screenshotPath, { force: true });
    if ((error as { errcode?: number }).errcode === sqliteUniqueViolation) return fail(`An app named "${slug}" is already requested.`);
    throw error;
  }
  redirect("/requests");
}

export default function CreatePage() {
  return (
    <main className="page narrow-form">
      <h1>Create an app</h1>
      <p>Describe the app you need. Devin builds it and opens a pull request.</p>
      <CreateForm action={createApp} services={services.map(({ slug, name }) => ({ slug, name }))} />
    </main>
  );
}
