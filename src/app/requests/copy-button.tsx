"use client";
/**
 * Button that copies a request's Devin prompt to the clipboard.
 * Clipboard access needs a client component, so it cannot live in the server page.
 * Owner: spvyerra.
 */
import { useState } from "react";

/** Copies `text` to the clipboard and briefly confirms. */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : "Copy prompt"}
    </button>
  );
}
