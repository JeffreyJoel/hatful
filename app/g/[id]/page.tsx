import Link from "next/link";
import { getGroup } from "@/lib/group";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatSwapDate } from "@/lib/format";
import { primaryOnSnow, textLinkOnSnow } from "@/lib/ui";
import { LobbyLive, type LobbyMember } from "@/components/lobby-live";
import { InviteLink } from "@/components/invite-link";
import { HouseRules } from "@/components/house-rules";
import { DrawNames } from "@/components/draw-names";

export default async function LobbyPage({ params }: PageProps<"/g/[id]">) {
  const { id } = await params;
  const { group, me, isOwner } = await getGroup(id);
  const supabase = await createClient();

  const [{ data: members }, { data: rules }] = await Promise.all([
    supabase
      .from("members")
      .select("id, user_id, display_name, unwrapped_at")
      .eq("group_id", id)
      .order("joined_at")
      .order("id"),
    supabase.from("exclusions").select("member_a, member_b").eq("group_id", id),
  ]);

  const list: LobbyMember[] = (members ?? []).map((m) => ({
    id: m.id,
    name: m.display_name,
    unwrapped: m.unwrapped_at != null,
    isOwner: m.user_id === group.owner_id,
    isMe: m.id === me.id,
  }));
  const owner = list.find((m) => m.isOwner)?.name ?? "The organiser";
  const drawn = group.status === "drawn";

  const facts = [
    "Secret Santa",
    group.budget_cents != null && `${formatMoney(group.budget_cents, group.currency)} limit`,
    group.swap_date && `Swap ${formatSwapDate(group.swap_date)}`,
  ].filter(Boolean);

  return (
    <main className="min-h-dvh bg-snow text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-4 px-5 pt-[22px] pb-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.02em]">
              {group.name}
            </h1>
            <p className="text-sm text-ink-soft">{facts.join(" · ")}</p>
          </div>

          <LobbyLive
            groupId={id}
            members={list}
            owner={owner}
            amOwner={isOwner}
            drawnAt={drawn ? group.drawn_at : null}
          />

          <HouseRules
            groupId={id}
            rules={(rules ?? []).map((r) => ({ a: r.member_a, b: r.member_b }))}
            people={list.map((m) => ({ id: m.id, name: m.name }))}
            editable={isOwner && !drawn}
          />

          <div className="flex-1" />

          {drawn ? (
            <Link
              href={me.unwrapped_at ? `/g/${id}/match` : `/g/${id}/draw`}
              className={primaryOnSnow}
            >
              {me.unwrapped_at ? "See my match" : "Unwrap my match"}
            </Link>
          ) : (
            <>
              <InviteLink
                code={group.join_code}
                groupName={group.name}
                secondary={isOwner && list.length >= 3}
              />
              {isOwner && <DrawNames groupId={id} count={list.length} />}
            </>
          )}
          <Link href={`/g/${id}/wishlist`} className={textLinkOnSnow}>
            Edit my wishlist
          </Link>
        </div>
      </div>
    </main>
  );
}
