/**
 * Root layout shared by the catalog, the creator, and every internal app.
 * It only sets document metadata and global styles so pages stay self-contained.
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevinPowerApps",
  description: "Internal App Catalog and App Creator powered by Devin",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
