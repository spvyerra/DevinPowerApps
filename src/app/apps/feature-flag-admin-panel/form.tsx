/**
 * Client forms for the Feature Flag Admin Panel: create a flag, and toggle or delete one row.
 * `useActionState` needs a client component to show service errors inline and keep typed input, so the forms cannot live in the server page.
 * Owner: admin@example.com.
 */
"use client";
import { useActionState } from "react";

export type FlagFormState = {
  error?: string;
  values?: { key: string; description: string };
};

type FlagAction = (state: FlagFormState, formData: FormData) => Promise<FlagFormState>;

/** Renders the create-flag form and the service's error message. */
export function CreateFlagForm({ action }: { action: FlagAction }) {
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
          title="Lowercase letters, digits, and single dashes, for example new-checkout"
          placeholder="new-checkout"
        />
      </label>
      <label>
        Description (optional)
        <input name="description" defaultValue={state.values?.description} maxLength={500} placeholder="Turns on the new checkout flow" />
      </label>
      <div className="actions">
        <button type="submit" disabled={pending}>{pending ? "Creating..." : "Create flag"}</button>
      </div>
    </form>
  );
}

/** Renders the on/off switch and delete button for one flag, with any error from the service. */
export function FlagActions({ flagKey, enabled, toggle, remove }: { flagKey: string; enabled: boolean; toggle: FlagAction; remove: FlagAction }) {
  const [toggleState, toggleAction, toggling] = useActionState(toggle, {});
  const [removeState, removeAction, removing] = useActionState(remove, {});
  const error = toggleState.error ?? removeState.error;
  return (
    <div className="flag-actions">
      {error && <p className="error" role="alert">{error}</p>}
      <form action={toggleAction}>
        <input type="hidden" name="key" value={flagKey} />
        <input type="hidden" name="enabled" value={String(!enabled)} />
        <button type="submit" role="switch" aria-checked={enabled} aria-label={`${flagKey} enabled`} className="switch" disabled={toggling} />
      </form>
      <span className="switch-label" aria-hidden="true">{enabled ? "On" : "Off"}</span>
      <form
        action={removeAction}
        onSubmit={(event) => {
          if (!confirm(`Delete the flag ${flagKey}?`)) event.preventDefault();
        }}
      >
        <input type="hidden" name="key" value={flagKey} />
        <button type="submit" className="secondary" disabled={removing}>{removing ? "Deleting..." : "Delete"}</button>
      </form>
    </div>
  );
}
