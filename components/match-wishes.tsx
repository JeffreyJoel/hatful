"use client";

import { useState } from "react";
import { toast } from "sonner";
import { setGiftBought, toggleClaim } from "@/app/actions";
import { CheckIcon } from "@/components/icons";
import { primaryOnSnow, secondaryOnSnow } from "@/lib/ui";

export type MatchWish = {
  id: string;
  title: string;
  url: string | null;
  price: string | null;
  note: string | null;
};

// The receiver's wishlist with "I'm getting this" ticks, and the bought button.
export function MatchWishes({
  groupId,
  receiver,
  wishes,
  claimed: initialClaimed,
  bought: initialBought,
}: {
  groupId: string;
  receiver: string;
  wishes: MatchWish[];
  claimed: string[];
  bought: boolean;
}) {
  const [claimed, setClaimed] = useState(() => new Set(initialClaimed));
  const [bought, setBought] = useState(initialBought);
  const [saving, setSaving] = useState(false);

  async function claim(id: string, on: boolean) {
    const flip = (to: boolean) =>
      setClaimed((prev) => {
        const next = new Set(prev);
        if (to) next.add(id);
        else next.delete(id);
        return next;
      });
    flip(on);
    const result = await toggleClaim(groupId, id, on);
    if (!result.ok) {
      flip(!on);
      toast(result.message);
    }
  }

  async function markBought(on: boolean) {
    setSaving(true);
    setBought(on);
    const result = await setGiftBought(groupId, on);
    if (!result.ok) {
      setBought(!on);
      toast(result.message);
    }
    setSaving(false);
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-extrabold">{receiver}&apos;s wishlist</h2>
        {wishes.length === 0 && (
          <p className="rounded-2xl border-[1.5px] border-dashed border-[#9DB5AA] px-3.5 py-3 text-[13px] leading-[1.4]">
            {receiver} hasn&apos;t added any wishes yet. Look again closer to the day.
          </p>
        )}
        {wishes.map((w) => {
          const mine = claimed.has(w.id);
          return (
            <label
              key={w.id}
              htmlFor={`wish-${w.id}`}
              className="flex min-h-14 items-center gap-3 rounded-2xl border-[1.5px] border-card-line bg-card px-3.5 py-2.5"
            >
              <input
                id={`wish-${w.id}`}
                type="checkbox"
                checked={mine}
                onChange={(e) => claim(w.id, e.target.checked)}
                className="size-[22px] shrink-0 accent-spruce focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-berry"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-bold [overflow-wrap:anywhere]">{w.title}</span>
                <span className="text-xs text-ink-soft [overflow-wrap:anywhere]">
                  {mine ? "You're getting this" : w.note}
                  {w.url && (
                    <>
                      {(mine || w.note) && " · "}
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-bold text-ink underline"
                      >
                        Open link
                      </a>
                    </>
                  )}
                </span>
              </span>
              {w.price && <span className="text-[13px] font-bold tabular-nums">{w.price}</span>}
            </label>
          );
        })}
      </div>

      <div className="flex-1" />

      {bought ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => markBought(false)}
          className={`${secondaryOnSnow} gap-2`}
        >
          <CheckIcon size={22} className="tick-draw text-spruce" />
          Gift bought
          <span className="font-sans text-[13px] font-medium text-ink-soft">Undo</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={saving}
          onClick={() => markBought(true)}
          className={primaryOnSnow}
        >
          Mark gift as bought
        </button>
      )}
    </>
  );
}
