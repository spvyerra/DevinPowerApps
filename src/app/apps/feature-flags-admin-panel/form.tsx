/**
 * Client forms for the Feature Flags Admin Panel that show service errors from its server actions.
 * `useActionState` and the delete confirmation need a client component, so they cannot live in the server page.
 * Owner: sai@example.com.
 */
"use client";
import { useActionState } from "react";

export type FlagState = {
  error?: string;
  values?: { key: string; description: string };
};

type Action = (state: FlagState, formData: FormData) => Promise<FlagState>;

/** Renders the create-flag form, keeping its input when the service rejects it. */
export function CreateFlagForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="form">
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <label>
        Key
        <input
          name="key"
          defaultValue={state.values?.key}
          required
          maxLength={64}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Lowercase letters, digits, and single dashes, for example new-checkout."
          placeholder="new-checkout"
        />
      </label>
      <label>
        Description (optional)
        <input name="description" defaultValue={state.values?.description} maxLength={500} placeholder="Turns on the new checkout flow" />
      </label>
      <button type="submit" disabled={pending}>{pending ? "Creating..." : "Create flag"}</button>
    </form>
  );
}

/** Renders the on/off switch and delete button for one flag. */
export function FlagControls({ action, flagKey, enabled }: { action: Action; flagKey: string; enabled: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="controls">
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <input type="hidden" name="key" value={flagKey} />
      <button type="submit" name="enabled" value={String(!enabled)} role="switch" aria-checked={enabled} aria-label={flagKey} className="switch" disabled={pending}>
        {enabled ? "On" : "Off"}
      </button>
      <button
        type="submit"
        name="intent"
        value="delete"
        className="secondary"
        aria-label={`Delete ${flagKey}`}
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm(`Delete flag ${flagKey}? This cannot be undone.`)) event.preventDefault();
        }}
      >
        Delete
      </button>
    </form>
  );
}
