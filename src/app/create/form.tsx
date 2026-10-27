/**
 * Client form for the App Creator, showing validation errors from the server action without losing input.
 * `useActionState` needs a client component, so the form cannot live in the server page.
 * Owner: spvyerra.
 */
"use client";
import { useActionState } from "react";

export type CreateState = {
  error?: string;
  values?: { name: string; description: string; services: string[]; docLinks: string };
};

type Props = {
  action: (state: CreateState, formData: FormData) => Promise<CreateState>;
  services: { slug: string; name: string }[];
  maxScreenshotBytes: number;
};

/** Renders the create-app form and its error message. */
export function CreateForm({ action, services, maxScreenshotBytes }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="form">
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <label>
        App name
        <input name="name" defaultValue={state.values?.name} required minLength={3} maxLength={60} placeholder="Feature Flags Admin" />
      </label>
      <label>
        What should the UI do?
        <textarea name="description" defaultValue={state.values?.description} required minLength={10} maxLength={5000} rows={6} placeholder="List every flag with a toggle, and a form to create a new flag." />
      </label>
      <label>
        Screenshot or mockup (optional, PNG or JPEG, up to 5 MB)
        <input
          type="file"
          name="screenshot"
          key={state.error}
          accept="image/png,image/jpeg"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.setCustomValidity(file && file.size > maxScreenshotBytes ? "The screenshot must be 5 MB or smaller." : "");
            event.currentTarget.reportValidity();
          }}
        />
      </label>
      <fieldset>
        <legend>Services to use</legend>
        {services.map((service) => (
          <label key={service.slug} className="check">
            <input type="checkbox" name="services" value={service.slug} defaultChecked={state.values?.services.includes(service.slug)} />
            {service.name}
          </label>
        ))}
      </fieldset>
      <label>
        Doc links (optional, one per line)
        <textarea name="docLinks" defaultValue={state.values?.docLinks} rows={3} placeholder="https://wiki.example.com/feature-flags" />
      </label>
      <button type="submit" disabled={pending}>{pending ? "Submitting..." : "Submit request"}</button>
    </form>
  );
}
