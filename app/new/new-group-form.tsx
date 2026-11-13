"use client";

import { startTransition, useActionState, useState } from "react";
import { createGroup, type FormState } from "@/app/actions";
import { CheckEmail } from "@/components/check-email";
import { alertBox, fieldOnSpruce as field, labelOnSpruce as label, primaryOnSpruce } from "@/lib/ui";
import { formatMoney, formatSwapDate, inviteTitle, parseMoney } from "@/lib/format";

export function NewGroupForm({
  signedInEmail,
}: {
  signedInEmail: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createGroup, {
    status: "idle",
  });
  const [retrying, setRetrying] = useState(false);
  // Resubmitted once the emailed code signs them in.
  const [submitted, setSubmitted] = useState<FormData | null>(null);
  // Drive the preview card; the form still submits these fields by name.
  const [group, setGroup] = useState("");
  const [budget, setBudget] = useState("");
  const [date, setDate] = useState("");

  if (state.status === "sent" && !retrying) {
    return (
      <CheckEmail
        email={state.email}
        name={String(submitted?.get("name") ?? "")}
        outcome="your group is ready to share"
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
      className="flex flex-1 flex-col gap-4"
    >
      <InvitePreview group={group} budget={budget} date={date} />

      <div className="mt-1 flex flex-col gap-3">
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
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className={field}
          />
        </div>
        <div className="flex gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
          <div className="flex w-[104px] shrink-0 flex-col gap-1.5">
            <label htmlFor="new-budget" className={label}>
              Limit
            </label>
            <input
              id="new-budget"
              name="budget"
              type="text"
              inputMode="decimal"
              placeholder="$30"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className={field}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-date" className={label}>
            Swap day
          </label>
          <input
            id="new-date"
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${field} [color-scheme:dark]`}
          />
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
        {pending ? (signedInEmail === null ? "Sending your code…" : "Creating…") : "Create group"}
      </button>
      <p className="text-center text-[13px] leading-[1.45] text-on-spruce-soft">
        You&apos;ll run the draw. Your own match stays hidden from you too, until you unwrap it.
      </p>
    </form>
  );
}

// The same card invitees see on the Join screen, updating as the organiser types.
function InvitePreview({ group, budget, date }: { group: string; budget: string; date: string }) {
  const cents = parseMoney(budget);
  const limit = typeof cents === "number" ? formatMoney(cents, "USD") : null;
  const swap = /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatSwapDate(date) : null;

  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      <span className="text-[13px] text-on-spruce-soft">Your invite will look like this</span>
      <div className="flex -rotate-[1.5deg] flex-col gap-2 rounded-[18px] bg-card px-[18px] py-4 text-ink shadow-[0_10px_0_var(--spruce-deep)]">
        <div className="flex items-center gap-2.5">
          <span className="size-3.5 shrink-0 rounded-full bg-spruce" />
          <span className="text-[11px] font-bold tracking-[0.12em] text-berry-text uppercase">
            You&apos;re invited
          </span>
        </div>
        <span className="font-display text-[25px] leading-[1.05] font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere]">
          {inviteTitle(group.trim() || "Your group")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {limit && (
            <span className="rounded-full bg-[#E3EEE9] px-2.5 py-[5px] text-xs font-bold">
              {limit} limit
            </span>
          )}
          {swap && (
            <span className="rounded-full bg-gold px-2.5 py-[5px] text-xs font-bold">Swap {swap}</span>
          )}
          {!limit && !swap && (
            <span className="text-xs text-ink-soft">
              Add a limit or swap day and they&apos;ll show here.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
