/**
 * Auth.js setup: generic OIDC sign-in when `OIDC_ISSUER` is set, and a dev login when `AUTH_DEV_LOGIN=true`.
 * It also holds the access rules, so the proxy, pages, and server actions share one source of truth.
 * Owner: spvyerra.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { hasAccess } from "@/lib/db";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const oidcEnabled = Boolean(process.env.OIDC_ISSUER);
export const devLoginEnabled = process.env.AUTH_DEV_LOGIN === "true";

/** Lowercases and trims an email, returning null when it is not a valid address. */
export function normalizeEmail(value: unknown): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  return email.length <= 254 && emailPattern.test(email) ? email : null;
}

/** Returns true when the email is listed in `ADMIN_EMAILS`. */
export function isAdmin(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .includes(email);
}

/** Returns true when the user may open the app: admins open every app, members only granted ones. */
export function canOpenApp(email: string, appSlug: string): boolean {
  return isAdmin(email) || hasAccess(appSlug, email);
}

const providers: Provider[] = [];
if (oidcEnabled) {
  providers.push({
    id: "oidc",
    name: process.env.OIDC_NAME ?? "SSO",
    type: "oidc",
    issuer: process.env.OIDC_ISSUER,
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
  });
}
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: { email: {}, name: {} },
      authorize(credentials) {
        const email = normalizeEmail(credentials.email);
        if (!email) return null;
        const name = String(credentials.name ?? "").trim().slice(0, 100) || email.split("@")[0];
        return { id: email, email, name };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    jwt({ token }) {
      if (token.email) token.email = token.email.trim().toLowerCase();
      return token;
    },
  },
  trustHost: true,
});
