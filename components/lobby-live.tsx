"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export type LobbyMember = {
  id: string;
  name: string;
  unwrapped: boolean;
  isOwner: boolean;
  isMe: boolean;
};

const AVATARS = [
  "bg-berry text-white",
  "bg-gold text-ink",
  "bg-spruce text-white",
  "bg-ink text-white",
];

export function LobbyLive({
  groupId,
  members,
  owner,
  amOwner,
  drawnAt,
}: {
  groupId: string;
  members: LobbyMember[];
  owner: string;
  amOwner: boolean;
  drawnAt: string | null;
}) {
  const router = useRouter();
  // Members present on first paint don't animate; anyone who arrives later fades in.
  const [firstIds] = useState(() => new Set(members.map((m) => m.id)));

  // Toasts come from comparing each server refresh with the last, not from event
  // payloads: a removal before the draw sends no event we can receive.
  const previous = useRef(members);
  useEffect(() => {
    const before = new Map(previous.current.map((m) => [m.id, m]));
    const now = new Set(members.map((m) => m.id));
    for (const m of members) {
      const was = before.get(m.id);
      if (!was) toast(`${m.name} joined`);
      else if (!m.isMe && m.unwrapped && !was.unwrapped) toast(`${m.name} unwrapped their match`);
    }
    for (const m of previous.current) if (!now.has(m.id)) toast(`${m.name} left the group`);
    previous.current = members;
  }, [members]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    const refresh = () => router.refresh();

    // Join with the user's token, not anon; RLS would otherwise hide every event.
    supabase.auth.getSession().then(async ({ data }) => {
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled) return;
      channel = supabase
        .channel(`lobby:${groupId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "members", filter: `group_id=eq.${groupId}` },
          refresh,
        )
        .subscribe();
    });

    // Catches what Realtime can't send under rule 6: removals before the draw, and the draw.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [groupId, router]);

  const unwrapped = members.filter((m) => m.unwrapped).length;

  return (
    <>
      <section
        aria-live="polite"
        className="flex flex-col gap-3 rounded-[22px] bg-spruce p-5 text-white"
      >
        {drawnAt ? (
          <>
            <h2 className="font-display text-[34px] leading-none font-extrabold tracking-[-0.02em]">
              Names are drawn
            </h2>
            <p className="text-sm leading-[1.45] text-on-spruce-soft">
              {owner} shook the hat
              <DrawnTime iso={drawnAt} />.{" "}
              {members.find((m) => m.isMe)?.unwrapped
                ? "You've unwrapped yours."
                : "Yours is wrapped and waiting."}
            </p>
            <div className="flex items-center gap-2.5">
              <div aria-hidden="true" className="flex flex-wrap gap-1.5">
                {members.map((m) => (
                  <span
                    key={m.id}
                    className={`size-3 rounded-full ${m.unwrapped ? "bg-gold" : "bg-[#2F5F4E]"}`}
                  />
                ))}
              </div>
              <span className="shrink-0 text-[13px] font-bold tabular-nums">
                {unwrapped} of {members.length} unwrapped
              </span>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-[34px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
              {members.length} in the hat
            </h2>
            <p className="text-sm leading-[1.45] text-on-spruce-soft">
              {amOwner
                ? members.length < 3
                  ? "Send everyone the invite link. You can draw names once at least 3 people are in."
                  : "Send everyone the invite link, then draw names when the whole group is in."
                : `${owner} will draw names once everyone's in.`}
            </p>
          </>
        )}
      </section>

      <ul className="grid grid-cols-2 gap-2.5">
        {members.map((m, i) => (
          <li
            key={m.id}
            className={`flex items-center gap-2.5 rounded-2xl border-[1.5px] border-card-line bg-card px-3 py-2.5 ${firstIds.has(m.id) ? "" : "enter-up"}`}
          >
            <span
              aria-hidden="true"
              className={`flex size-9 shrink-0 items-center justify-center rounded-full font-display text-base font-extrabold ${AVATARS[i % AVATARS.length]}`}
            >
              {m.name.charAt(0).toUpperCase()}
            </span>
            <div className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-[15px] font-bold">{m.name}</span>
              <span className="truncate text-xs text-ink-soft">{status(m, drawnAt != null)}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function status(m: LobbyMember, drawn: boolean) {
  // One label per card, as in the design; "You" wins over "Organiser".
  const who = m.isMe ? ["You"] : m.isOwner ? ["Organiser"] : [];
  if (drawn) who.push(m.unwrapped ? "unwrapped" : "still wrapped");
  const text = who.join(" · ") || "In the hat";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const noop = () => () => {};

// The draw time in the viewer's own timezone, so it only renders in the browser.
function DrawnTime({ iso }: { iso: string }) {
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  if (!inBrowser) return null;

  const at = new Date(iso);
  const time = at
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
  const sameDay = at.toDateString() === new Date().toDateString();
  const day = at
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    .replace(",", "");
  return <>{sameDay ? ` at ${time}` : ` on ${day} at ${time}`}</>;
}
