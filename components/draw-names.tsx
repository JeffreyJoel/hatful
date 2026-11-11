"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { drawNames } from "@/app/actions";
import { alertBox, primaryOnSnow, secondaryOnSnow } from "@/lib/ui";

// The organiser's one-time draw. It can't be undone, so it asks once before running.
export function DrawNames({ groupId, count }: { groupId: string; count: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (count < 3) {
    return (
      <p className="text-center text-[13px] leading-[1.45] text-ink-soft">
        You can draw names once 3 people are in. {count} so far.
      </p>
    );
  }

  async function draw() {
    setPending(true);
    setError(null);
    const result = await drawNames(groupId);
    if (!result.ok) {
      setError(result.message);
      setPending(false);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2.5">
        {error && (
          <p role="alert" className={alertBox}>
            {error}
          </p>
        )}
        <button type="button" onClick={() => setConfirming(true)} className={primaryOnSnow}>
          Draw names
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5" role="group" aria-label="Confirm the draw">
      <p className="text-[13px] leading-[1.45]">
        Draw names for all {count} people? Nobody can join after this, and it can&apos;t be undone.
      </p>
      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className={secondaryOnSnow}
        >
          Not yet
        </button>
        <button type="button" disabled={pending} onClick={draw} className={primaryOnSnow}>
          {pending ? "Drawing…" : "Draw now"}
        </button>
      </div>
    </div>
  );
}
