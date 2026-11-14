"use client";

import { startTransition, useActionState, useState } from "react";
import { requestJoin, type FormState } from "@/app/actions";
import { CheckEmail } from "@/components/check-email";
import { alertBox, fieldOnSpruce as field, labelOnSpruce as label, primaryOnSpruce as primary } from "@/lib/ui";

export function JoinForm({
  code,
  organiser,
  signedInEmail,
}: {
  code: string;
  organiser: string;
  signedInEmail: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestJoin, {
    status: "idle",
  });
  const [retrying, setRetrying] = useState(false);
  // Resubmitted once the emailed code signs them in.
  const [submitted, setSubmitted] = useState<FormData | null>(null);

  if (state.status === "sent" && !retrying) {
    return (
      <CheckEmail
        email={state.email}
        outcome="your name goes in the hat"
        onSignedIn={() => submitted && startTransition(() => action(submitted))}
        onRetry={() => setRetrying(true)}
      />
    );
  }

  const error = state.status === "error" ? state.message : null;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        // Submitting here rather than via `action` stops React clearing the fields on an error.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setSubmitted(data);
        setRetrying(false);
        startTransition(() => action(data));
      }}
      className="flex flex-1 flex-col gap-[22px]"
    >
      <input type="hidden" name="code" value={code} />
      <div className="mt-[22px] flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="join-name" className={label}>
            Your name
          </label>
          <input
            id="join-name"
            name="name"
            type="text"
            required
            maxLength={40}
            autoComplete="given-name"
            className={field}
          />
        </div>
        {signedInEmail === null ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="join-email" className={label}>
              Email
            </label>
            <input
              id="join-email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              className={field}
            />
          </div>
        ) : (
          <p className="text-[13px] text-on-spruce-soft">
            Signed in as <span className="font-bold text-white">{signedInEmail}</span>
          </p>
        )}
      </div>

      <div className="flex-1" />

      {error && (
        <p role="alert" className={alertBox}>
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={primary}>
        {pending ? (signedInEmail === null ? "Sending your code…" : "Joining…") : "Join the draw"}
      </button>
      <p className="text-center text-[13px] leading-[1.45] text-on-spruce-soft">
        {signedInEmail === null ? "We'll email you a sign-in code. " : ""}
        Your match is visible only to you, not even to {organiser}.
      </p>
    </form>
  );
}
