import { Suspense } from "react";
import { redirect } from "next/navigation";
import { asUser } from "@/lib/db";
import { getSession } from "@/lib/auth/server";
import { formatMoney, formatSwapDate, inviteTitle } from "@/lib/format";
import { TagString } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
import { JoinForm } from "./join-form";

export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  return (
    <main className="min-h-dvh bg-spruce text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-[22px] px-6 pt-6 pb-7">
          <Wordmark />
          <Suspense fallback={<div className="h-[290px]" />}>
            <Invite params={params} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

type InviteCard = {
  name: string;
  organiser: string | null;
  member_count: number;
  budget_cents: number | null;
  currency: string;
  swap_date: string | null;
  is_open: boolean;
};

async function Invite({ params }: Pick<PageProps<"/join/[code]">, "params">) {
  const { code } = await params;
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  const { mine, invite } = await asUser(userId, async (db) => {
    // Already in this group: the invite link takes them home instead.
    const member = userId
      ? await db.query<{ group_id: string }>(
          `select m.group_id from members m join groups g on g.id = m.group_id
            where m.user_id = $1 and g.join_code = $2`,
          [userId, code],
        )
      : null;
    const card = await db.query<InviteCard>("select * from group_invite($1)", [code]);
    return { mine: member?.rows[0], invite: card.rows[0] };
  });
  if (mine) redirect(`/g/${mine.group_id}`);

  if (!invite) {
    return (
      <Notice
        title="This invite link doesn't work"
        body="Check you have the whole link from whoever sent it. Invite links look like hatful.app/join/ followed by a code."
      />
    );
  }

  const title = inviteTitle(invite.name);
  const organiser = invite.organiser ?? "the organiser";

  return (
    <>
      <div className="relative mt-[26px]">
        <TagString className="absolute left-5 -top-11" />
        <div className="tag-drop flex -rotate-3 flex-col gap-3.5 rounded-[22px] bg-card px-6 pt-[26px] pb-6 text-ink shadow-[0_18px_0_var(--spruce-deep)]">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="size-5 shrink-0 rounded-full bg-spruce" />
            <span className="text-xs font-bold tracking-[0.12em] text-berry-text uppercase">
              You&apos;re invited
            </span>
          </div>
          <h1 className="font-display text-[38px] leading-[1.02] font-extrabold tracking-[-0.02em]">
            {title}
          </h1>
          <p className="text-[15px] text-ink-soft">
            {invite.organiser ? `${invite.organiser} is organising. ` : ""}
            {invite.is_open ? "Put your name in the hat." : "Names have already been drawn."}
          </p>
          <ul className="flex flex-wrap gap-2">
            <Chip>
              {invite.member_count} {invite.member_count === 1 ? "person" : "people"}
            </Chip>
            {invite.budget_cents != null && (
              <Chip>{formatMoney(invite.budget_cents, invite.currency)} limit</Chip>
            )}
            {invite.swap_date && <Chip gold>Swap {formatSwapDate(invite.swap_date)}</Chip>}
          </ul>
        </div>
      </div>

      {invite.is_open ? (
        <JoinForm
          code={code}
          organiser={organiser}
          signedInEmail={session?.user ? session.user.email : null}
        />
      ) : (
        <p className="mt-[22px] text-[15px] leading-[1.45] text-on-spruce-soft">
          The hat closed when names were drawn, so nobody new can join this round. If you
          should be in it, ask {organiser}.
        </p>
      )}
    </>
  );
}

function Chip({ children, gold = false }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <li
      className={`rounded-full px-3 py-[7px] text-[13px] font-bold text-ink ${gold ? "bg-gold" : "bg-[#E3EEE9]"}`}
    >
      {children}
    </li>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-[26px] flex flex-col gap-2">
      <h1 className="font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.02em]">
        {title}
      </h1>
      <p className="text-[15px] leading-[1.45] text-on-spruce-soft">{body}</p>
    </div>
  );
}
