import Link from "next/link";
import { redirect } from "next/navigation";
import { getGroup } from "@/lib/group";
import { asUser } from "@/lib/db";
import { currentUserId } from "@/lib/auth/server";
import { formatMoney, formatSwapDate } from "@/lib/format";
import { textLinkOnSnow } from "@/lib/ui";
import { GiftTag } from "@/components/gift-tag";
import { DaysToGo } from "@/components/days-to-go";
import { LockIcon } from "@/components/icons";
import { MatchWishes } from "@/components/match-wishes";

export default async function MatchPage({ params }: PageProps<"/g/[id]/match">) {
  const { id } = await params;
  const { group, me } = await getGroup(id);
  if (group.status !== "drawn") redirect(`/g/${id}`);
  // Nobody skips the unwrap by typing the URL.
  if (!me.unwrapped_at) redirect(`/g/${id}/draw`);

  const userId = await currentUserId();
  const data = await asUser(userId, async (db) => {
    // RLS returns only the caller's own assignment row.
    const { rows: [mine] } = await db.query<{ receiver_id: string; bought_at: string | null }>(
      "select receiver_id, bought_at from assignments where group_id = $1 and giver_id = $2",
      [id, me.id],
    );
    if (!mine) return null;
    const receiver = await db.query<{ display_name: string; note: string | null }>(
      "select display_name, note from members where id = $1",
      [mine.receiver_id],
    );
    const wishes = await db.query<{
      id: string; title: string; url: string | null; price_cents: number | null; note: string | null;
    }>(
      "select id, title, url, price_cents, note from wishes where member_id = $1 order by created_at",
      [mine.receiver_id],
    );
    const claims = await db.query<{ wish_id: string }>(
      "select wish_id from wish_claims where giver_id = $1",
      [me.id],
    );
    return { mine, receiver: receiver.rows[0], wishes: wishes.rows, claims: claims.rows };
  });
  if (!data) redirect(`/g/${id}`);
  const { mine, receiver, wishes, claims } = data;
  if (!receiver) redirect(`/g/${id}`);

  const name = receiver.display_name;
  const facts = [
    group.swap_date && formatSwapDate(group.swap_date),
    group.budget_cents != null && `${formatMoney(group.budget_cents, group.currency)} limit`,
  ].filter(Boolean);

  return (
    <main className="min-h-dvh bg-snow text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-4 px-5 pt-[22px] pb-6">
          <h1 className="sr-only">You&apos;re gifting {name}</h1>
          <div className="flex items-center justify-between gap-3.5 rounded-[22px] bg-spruce px-5 py-[22px] text-white">
            <div className="-rotate-[4deg]" aria-hidden="true">
              <GiftTag size="sm" label="You're gifting" name={name} />
            </div>
            <div className="flex min-w-0 flex-col items-end gap-0.5 text-right">
              {group.swap_date && <DaysToGo date={group.swap_date} />}
              <span className="text-xs text-on-spruce-soft">{facts.join(" · ")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[13px] text-ink-soft">
            <LockIcon className="shrink-0" />
            <span>Only you can see this screen.</span>
          </div>

          {receiver.note && (
            <div className="flex flex-col gap-1.5 rounded-[18px] border-[1.5px] border-card-line bg-card p-4">
              <span className="text-xs font-bold tracking-[0.12em] text-ink-soft uppercase">
                A note from {name}
              </span>
              <p className="font-display text-xl leading-[1.2] font-bold [overflow-wrap:anywhere]">
                {receiver.note}
              </p>
            </div>
          )}

          <MatchWishes
            groupId={id}
            receiver={name}
            wishes={(wishes ?? []).map((w) => ({
              id: w.id,
              title: w.title,
              url: w.url,
              note: w.note,
              price: w.price_cents != null ? formatMoney(w.price_cents, group.currency) : null,
            }))}
            claimed={(claims ?? []).map((c) => c.wish_id)}
            bought={mine.bought_at != null}
          />
          <Link href={`/g/${id}/wishlist`} className={textLinkOnSnow}>
            Edit my own wishlist
          </Link>
        </div>
      </div>
    </main>
  );
}
