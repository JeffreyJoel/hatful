"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestSignIn, type FormState } from "@/app/actions";
import { CheckEmail } from "@/components/check-email";
import { alertBox, fieldOnSpruce as field, labelOnSpruce as label, primaryOnSpruce as primary } from "@/lib/ui";

export function SignInForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(requestSignIn, {
    status: "idle",
  });
  const [retrying, setRetrying] = useState(false);

  if (state.status === "sent" && !retrying) {
    return (
      <CheckEmail
        email={state.email}
        outcome={next ? "you'll go straight back" : "you'll see your groups"}
        onSignedIn={() => {
          router.replace(next ?? "/");
          router.refresh();
        }}
        onRetry={() => setRetrying(true)}
      />
    );
  }

  const error = state.status === "error" ? state.message : null;

  return (
    <form
      onSubmit={(e) => {
        // Submitting here rather than via `action` stops React clearing the field on an error.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setRetrying(false);
        startTransition(() => action(data));
      }}
      className="flex flex-1 flex-col gap-[22px]"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sign-in-email" className={label}>
          Email
        </label>
        <input
          id="sign-in-email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          className={field}
        />
      </div>

      <div className="flex-1" />

      {error && (
        <p role="alert" className={alertBox}>
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Sending your code…" : "Send my code"}
      </button>
      <p className="-mt-2 text-center text-[13px] text-on-spruce-soft">
        New here?{" "}
        <Link
          href="/new"
          className="font-bold text-white underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Start a group
        </Link>
      </p>
    </form>
  );
}
