/**
 * Auth.js route handler for sign-in callbacks, CSRF, and session endpoints.
 * Auth.js needs this catch-all route, so it cannot live in `src/auth.ts`.
 * Owner: spvyerra.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
