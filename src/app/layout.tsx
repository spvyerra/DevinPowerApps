/**
 * Root layout shared by the catalog, the creator, and every internal app.
 * It sets metadata, global styles, and the signed-in user bar, so pages stay self-contained.
 * Owner: spvyerra.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { auth, isAdmin, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevinPowerApps",
  description: "Internal App Catalog and App Creator powered by Devin",
};

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/signin" });
}

async function UserBar() {
  await connection();
  const user = (await auth())?.user;
  if (!user?.email) return null;
  return (
    <header className="topbar">
      <nav>
        <Link href="/">App Catalog</Link>
        <Link href="/create">Create app</Link>
        <Link href="/requests">Requests</Link>
        {isAdmin(user.email) && <Link href="/admin/access">Access</Link>}
      </nav>
      <div className="user">
        <span>
          {user.email}
          {isAdmin(user.email) && " (admin)"}
        </span>
        <form action={signOutAction}>
          <button type="submit" className="secondary">Sign out</button>
        </form>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <UserBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
