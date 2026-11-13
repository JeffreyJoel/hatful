"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { alertBox, fieldOnSpruce as field, labelOnSpruce as label, primaryOnSpruce as primary } from "@/lib/ui";

// After a code is emailed: sign in with it, then hand back so the form resubmits
// itself signed in and joins or creates the group.
export function CheckEmail({
  email,
  name,
  outcome,
  onSignedIn,
  onRetry,
}: {
  email: string;
  name: string;
  outcome: string;
  onSignedIn: () => void;
  onRetry: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    const otp = code.replace(/\D/g, "");
    if (otp.length !== 6) return setError("Enter the 6 digits from the email.");
    setPending(true);
    setError(null);
    // `name` names the account if this email is new.
    const { error } = await authClient.signIn.emailOtp({ email, otp, name });
    if (error) {
      setPending(false);
      setError(
        error.status === 429
          ? "Too many tries. Wait a minute and try again."
          : "That code didn't work. Check it, or send yourself a new one.",
      );
      return;
    }
    onSignedIn();
  }

  return (
    <form onSubmit={signIn} className="mt-[22px] flex flex-1 flex-col gap-[22px]" aria-live="polite">
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.02em]">
          Check your email
        </h2>
        <p className="text-[15px] leading-[1.45] text-on-spruce-soft">
          We sent a 6-digit code to <span className="font-bold text-white">{email}</span>. Enter it
          here and {outcome}.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sign-in-code" className={label}>
          Code
        </label>
        <input
          id="sign-in-code"
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${field} tracking-[0.3em] tabular-nums`}
        />
      </div>
      {error && (
        <p role="alert" className={alertBox}>
          {error}
        </p>
      )}
      <div className="flex-1" />
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={onRetry}
        className="press -mt-3 min-h-11 text-sm font-bold text-on-spruce-soft"
      >
        Use a different email
      </button>
    </form>
  );
}
