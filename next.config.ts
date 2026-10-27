/**
 * Next.js config for the DevinPowerApps web app.
 * It only disables the AGENTS.md block that `next dev` injects, because that block breaks the repo's no-em-dash rule.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  agentRules: false,
};

export default nextConfig;
