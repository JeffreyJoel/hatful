"use client";

import { toast } from "sonner";
import { primaryOnSnow } from "@/lib/ui";

export function InviteLink({ code, groupName }: { code: string; groupName: string }) {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/join/${code}`;

  async function share() {
    // Phones get the share sheet; desktops copy to the clipboard.
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: `${groupName} Secret Santa`, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Invite link copied");
    } catch {
      toast("Couldn't copy. Select the link above instead.");
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="truncate rounded-2xl border-[1.5px] border-card-line bg-card px-3.5 py-3 text-[13px] text-ink-soft select-all">
        {url}
      </p>
      <button type="button" onClick={share} className={primaryOnSnow}>
        Share invite link
      </button>
    </div>
  );
}
