"use client";

import { useActionState, useState } from "react";
import { requestMagicLink, type JoinState } from "@/app/actions";

const field =
  "h-[52px] rounded-[14px] border-[1.5px] border-spruce-line bg-spruce-deep px-4 text-base text-white placeholder:text-[#8FB0A2] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold";
const label = "text-[13px] font-medium text-on-spruce-soft";
const primary =
  "press flex h-[58px] items-center justify-center rounded-[18px] bg-berry font-display text-[19px] font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-70";

export function JoinForm({
  code,
  organiser,
  signedInEmail,
  linkExpired,
}: {
  code: string;
  organiser: string;
  signedInEmail: string | null;
  linkExpired: boolean;
}) {
  const [state, action, pending] = useActionState<JoinState, FormData>(requestMagicLink, {
    status: "idle",
  });
  const [retrying, setRetrying] = useState(false);

  if (state.status === "sent" && !retrying) {
    return (
      <div className="mt-[22px] flex flex-1 flex-col gap-3" aria-live="polite">
        <h2 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.02em]">
          Check your email
        </h2>
        <p className="text-[15px] leading-[1.45] text-on-spruce-soft">
          We sent a sign-in link to <span className="font-bold text-white">{state.email}</span>.
          Open it on any device and your name goes in the hat.
        </p>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setRetrying(true)}
          className="press min-h-11 text-sm font-bold text-on-spruce-soft"
        >
          Use a different email
        </button>
      </div>
    );
  }

  const error =
    state.status === "error"
      ? state.message
      : linkExpired && state.status === "idle"
        ? "That sign-in link has expired or was already used. Send yourself a new one."
        : null;

  return (
    <form action={(data) => { setRetrying(false); return action(data); }} className="flex flex-1 flex-col gap-[22px]">
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
        <p role="alert" className="rounded-xl bg-gold px-3 py-2.5 text-[13px] text-ink">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={primary}>
        {pending ? (signedInEmail === null ? "Sending your link…" : "Joining…") : "Join the draw"}
      </button>
      <p className="text-center text-[13px] leading-[1.45] text-on-spruce-soft">
        {signedInEmail === null ? "We'll email you a sign-in link. " : ""}
        Your match is visible only to you, not even to {organiser}.
      </p>
    </form>
  );
}
