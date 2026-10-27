/**
 * Registry of the internal services that apps in this repo may call.
 * One small list is the minimum that lets the catalog, Service Health, and the App Creator agree on base URLs and API docs.
 * Owner: spvyerra. It is shared by several apps, so it cannot live in any one app folder.
 */
export type Service = {
  slug: string;
  name: string;
  baseUrl: string;
  apiDoc: string;
};

export const services: Service[] = [
  {
    slug: "feature-flags",
    name: "Feature Flags",
    baseUrl: process.env.FEATURE_FLAGS_URL ?? "http://localhost:4001",
    apiDoc: "docs/services/feature-flags.md",
  },
];
