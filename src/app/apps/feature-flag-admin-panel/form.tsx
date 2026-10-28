/**
 * Client form that creates a feature flag and shows the service error without losing input.
 * `useActionState` needs a client component, so the form cannot live in the server page.
 * Owner: sai@example.com.
 */
"use client";
import { useActionState } from "react";

export type CreateFlagState = { error?: string; values?: { key: string; description: string } };

type Props = { action: (state: CreateFlagState, formData: FormData) => Promise<CreateFlagState> };

/** Renders the create-flag form and its error message. */
export function CreateFlagForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="form narrow-form">
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <label>
        Key
        <input
          name="key"
          key={`key-${state.values?.key}`}
          defaultValue={state.values?.key}
          required
          maxLength={64}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Lowercase letters, digits, and single dashes"
          placeholder="new-checkout"
        />
      </label>
      <label>
        Description (optional)
        <input name="description" key={`description-${state.values?.description}`} defaultValue={state.values?.description} maxLength={500} placeholder="Turns on the new checkout flow" />
      </label>
      <div className="actions">
        <button type="submit" disabled={pending}>{pending ? "Creating..." : "Create flag"}</button>
      </div>
    </form>
  );
}
