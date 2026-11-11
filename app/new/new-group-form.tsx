"use client";

import { startTransition, useActionState, useState } from "react";
import { createGroup, type FormState } from "@/app/actions";
import { CheckEmail } from "@/components/check-email";
import { alertBox, fieldOnSpruce as field, labelOnSpruce as label, primaryOnSpruce } from "@/lib/ui";

export function NewGroupForm({
  signedInEmail,
  notice,
}: {
  signedInEmail: string | null;
  notice: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createGroup, {
    status: "idle",
  });
  const [retrying, setRetrying] = useState(false);

  if (state.status === "sent" && !retrying) {
    return (
      <CheckEmail
        email={state.email}
        outcome="your group is ready to share"
        onRetry={() => setRetrying(true)}
      />
    );
  }

  const error = state.status === "error" ? state.message : state.status === "idle" ? notice : null;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        // Submitting here rather than via `action` stops React clearing the fields on an error.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setRetrying(false);
        startTransition(() => action(data));
      }}
      className="flex flex-1 flex-col gap-[22px]"
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-group" className={label}>
            Group name
          </label>
          <input
            id="new-group"
            name="group"
            type="text"
            required
            maxLength={60}
            placeholder="Sunday Dinner Club"
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-name" className={label}>
            Your name
          </label>
          <input
            id="new-name"
            name="name"
            type="text"
            required
            maxLength={40}
            autoComplete="given-name"
            className={field}
          />
        </div>
        <div className="flex gap-2.5">
          <div className="flex w-[120px] shrink-0 flex-col gap-1.5">
            <label htmlFor="new-budget" className={label}>
              Limit (optional)
            </label>
            <input
              id="new-budget"
              name="budget"
              type="text"
              inputMode="decimal"
              placeholder="$30"
              className={field}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="new-date" className={label}>
              Swap day (optional)
            </label>
            <input id="new-date" name="date" type="date" className={`${field} [color-scheme:dark]`} />
          </div>
        </div>
        {signedInEmail === null ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-email" className={label}>
              Your email
            </label>
            <input
              id="new-email"
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
      <button type="submit" disabled={pending} className={primaryOnSpruce}>
        {pending ? (signedInEmail === null ? "Sending your link…" : "Creating…") : "Create group"}
      </button>
      <p className="text-center text-[13px] leading-[1.45] text-on-spruce-soft">
        You&apos;ll run the draw, and your own match stays hidden until you unwrap it.
      </p>
    </form>
  );
}
