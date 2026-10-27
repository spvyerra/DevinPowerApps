/**
 * Next.js config for the DevinPowerApps web app.
 * It disables the AGENTS.md block that `next dev` injects, because that block breaks the repo's no-em-dash rule.
 * It raises the server action body limit to fit a 5 MB screenshot upload on the App Creator form.
 * Owner: spvyerra.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  agentRules: false,
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
