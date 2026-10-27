/**
 * Sign-in page offering the OIDC provider and, in development, the dev login.
 * Auth.js redirects here for every unauthenticated request, so it is its own route.
 * Owner: spvyerra.
 */
import { Suspense } from "react";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, oidcEnabled, devLoginEnabled } from "@/auth";

function safeCallbackUrl(value: FormDataEntryValue | string | string[] | undefined | null): string {
  const url = typeof value === "string" ? value : "/";
  return url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

async function signInWithDev(formData: FormData) {
  "use server";
  const redirectTo = safeCallbackUrl(formData.get("callbackUrl"));
  try {
    await signIn("dev", { email: formData.get("email"), name: formData.get("name"), redirectTo });
  } catch (error) {
    if (error instanceof AuthError) redirect(`/signin?error=invalid&callbackUrl=${encodeURIComponent(redirectTo)}`);
    throw error;
  }
}

async function signInWithOidc(formData: FormData) {
  "use server";
  await signIn("oidc", { redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
}

async function SignInForms({ searchParams }: { searchParams: PageProps<"/signin">["searchParams"] }) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  return (
    <>
      {params.error && <p className="error" role="alert">Enter a valid email address.</p>}
      {oidcEnabled && (
        <form action={signInWithOidc} className="form">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <button type="submit">Sign in with {process.env.OIDC_NAME ?? "SSO"}</button>
        </form>
      )}
      {devLoginEnabled && (
        <form action={signInWithDev} className="form">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label>
            Email
            <input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
          </label>
          <label>
            Name
            <input type="text" name="name" autoComplete="name" maxLength={100} />
          </label>
          <button type="submit">Sign in with dev login</button>
        </form>
      )}
      {!oidcEnabled && !devLoginEnabled && (
        <p className="error" role="alert">No sign-in method is configured. Set `OIDC_ISSUER` or `AUTH_DEV_LOGIN=true`.</p>
      )}
    </>
  );
}

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <main className="page narrow">
      <h1>Sign in</h1>
      <p>Sign in to open apps in the catalog.</p>
      <Suspense fallback={null}>
        <SignInForms searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
