import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatSwapDate } from "@/lib/format";
import { JoinForm } from "./join-form";

export default function JoinPage({ params, searchParams }: PageProps<"/join/[code]">) {
  return (
    <main className="min-h-dvh bg-spruce text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-[22px] px-6 pt-6 pb-7">
          <Wordmark />
          <Suspense fallback={<div className="h-[290px]" />}>
            <Invite params={params} searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function Invite({
  params,
  searchParams,
}: Pick<PageProps<"/join/[code]">, "params" | "searchParams">) {
  const { code } = await params;
  const { error: linkError } = await searchParams;
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  // Already in this group: the invite link takes them home instead.
  if (userId) {
    const { data: mine } = await supabase
      .from("members")
      .select("group_id, groups!members_group_id_fkey!inner(join_code)")
      .eq("user_id", userId)
      .eq("groups.join_code", code)
      .maybeSingle();
    if (mine) redirect(`/g/${mine.group_id}`);
  }

  const { data: invite } = await supabase.rpc("group_invite", { p_code: code }).maybeSingle<{
    name: string;
    organiser: string | null;
    member_count: number;
    budget_cents: number | null;
    currency: string;
    swap_date: string | null;
    is_open: boolean;
  }>();

  if (!invite) {
    return (
      <Notice
        title="This invite link doesn't work"
        body="Check you have the whole link from whoever sent it. Invite links look like hatful.app/join/ followed by a code."
      />
    );
  }

  const title = /secret santa/i.test(invite.name) ? invite.name : `${invite.name} Secret Santa`;
  const organiser = invite.organiser ?? "the organiser";

  return (
    <>
      <div className="relative mt-[26px]">
        <svg
          aria-hidden="true"
          width="120"
          height="60"
          viewBox="0 0 120 60"
          className="absolute left-5 -top-11"
        >
          <path
            d="M22 58 C10 30 40 10 110 2"
            fill="none"
            stroke="#F4B83A"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div className="flex -rotate-3 flex-col gap-3.5 rounded-[22px] bg-card px-6 pt-[26px] pb-6 text-ink shadow-[0_18px_0_var(--spruce-deep)]">
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
          signedInEmail={userId ? (claims?.claims.email ?? "") : null}
          linkExpired={linkError === "link"}
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

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <svg aria-hidden="true" width="34" height="34" viewBox="0 0 34 34">
        <path d="M6 25 C8 12 16 5 25 6 C22 12 25 18 28 25 Z" fill="#D62F3A" />
        <rect x="3" y="23" width="28" height="8" rx="4" fill="#FFFFFF" />
        <circle cx="26" cy="6" r="4" fill="#FFFFFF" />
      </svg>
      <span className="font-display text-2xl font-extrabold tracking-[-0.01em]">Hatful</span>
    </div>
  );
}
