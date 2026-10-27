/**
 * ESLint config for DevinPowerApps, using the Next.js core-web-vitals and TypeScript presets.
 * It only adds the build-output ignores, because the presets already cover the rules this repo needs.
 * Owner: spvyerra.
 */
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
