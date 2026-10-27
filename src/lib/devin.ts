/**
 * Builds the Devin prompt for an app request.
 * It is the one place that says how Devin should build an app, so the Creator and any later API call send the same text.
 * Owner: spvyerra.
 */
import { services } from "./services.ts";

export const repo = "spvyerra/DevinPowerApps";

export type PromptInput = {
  name: string;
  slug: string;
  description: string;
  requesterEmail: string;
  services: string[];
  docLinks: string[];
  hasScreenshot: boolean;
};

/** Returns the prompt that asks Devin to build the requested app in this repo and open a PR. */
export function buildPrompt(input: PromptInput): string {
  const chosen = services.filter((service) => input.services.includes(service.slug));
  const lines = [
    `Build a new internal app in the GitHub repo ${repo} and open a pull request.`,
    "",
    `App name: ${input.name}`,
    `Folder: src/app/apps/${input.slug}/`,
    `Requested by: ${input.requesterEmail}`,
    "",
    "What the app should do:",
    input.description,
    "",
    "Services to use:",
    ...(chosen.length
      ? chosen.map((service) => `- ${service.name} (slug "${service.slug}"): read the API doc at ${service.apiDoc}.`)
      : ["- None."]),
  ];
  if (input.docLinks.length) lines.push("", "Extra docs to read:", ...input.docLinks.map((link) => `- ${link}`));
  if (input.hasScreenshot) lines.push("", "A screenshot of the intended UI is attached. Match its layout.");
  lines.push(
    "",
    "How to build it:",
    "1. Read AGENTS.md and follow every rule in it.",
    "2. Copy the pattern of the reference app in src/app/apps/service-health/: a page.tsx plus an app.json manifest.",
    `3. In app.json set name, description, owner "${input.requesterEmail}", and services ${JSON.stringify(chosen.map((service) => service.slug))}.`,
    "4. Call services only from server code (server components or server actions), using the base URL from src/lib/services.ts.",
    "5. The route guard in src/proxy.ts already protects /apps/<slug>, so add no auth code.",
    "6. Add a smoke test under tests/ for the new app, and make npm run lint, npm run typecheck, npm test, and npm run build pass.",
    "7. Update README.md, then open a pull request.",
  );
  return lines.join("\n");
}
