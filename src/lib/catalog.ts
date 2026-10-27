/**
 * Reads the `app.json` manifest of every internal app under `src/app/apps/`.
 * Folder-per-app manifests let each Devin PR add an app without editing a shared registry file.
 * Owner: spvyerra. Phase 2 access checks also read manifests, so it cannot live in the catalog page.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type AppManifest = {
  slug: string;
  name: string;
  description: string;
  owner: string;
  services: string[];
};

const appsDir = join(process.cwd(), "src", "app", "apps");

/** Returns every app manifest, sorted by app name. */
export function listApps(): AppManifest[] {
  return readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(appsDir, entry.name, "app.json")))
    .map((entry) => {
      const manifest = JSON.parse(readFileSync(join(appsDir, entry.name, "app.json"), "utf8"));
      return { ...manifest, slug: entry.name } as AppManifest;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
