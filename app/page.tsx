import { Suspense } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { HatOfNames } from "@/components/hat-of-names";
import { currentUserId } from "@/lib/auth/server";
import { getMyGroups, groupHref, type MyGroup } from "@/lib/my-groups";
import { primaryOnSpruce } from "@/lib/ui";

const STEPS = [
  "Send one invite link to the group",
  "Draw every name at once, when all are in",
  "Everyone holds to unwrap their own",
];

const focusGold = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold";

export default function Home() {
  return (
    <main className="min-h-dvh bg-spruce text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-4 px-6 pt-[22px] pb-7">
          <Wordmark />
          {/* Blank while the session loads, so signed-in visitors never flash the intro. */}
          <Suspense fallback={<div className="flex-1" />}>
            <ForVisitor />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function ForVisitor() {
  const userId = await currentUserId();
  if (!userId) return <Intro />;
  const groups = await getMyGroups(userId);
  if (groups.length === 0) return <Intro signedIn />;

  return (
    <>
      <div className="mt-2 flex flex-col gap-1.5">
        <p className="text-xs font-bold tracking-[0.12em] text-gold uppercase">
          Welcome back, {groups[0].display_name}
        </p>
        <h1 className="font-display text-[38px] leading-[1.02] font-extrabold tracking-[-0.02em]">
          Your hats
        </h1>
      </div>
      <ul className="flex flex-col gap-[30px] pt-7">
        {groups.map((g, i) => (
          <li key={g.id} className="enter-up" style={{ "--stagger": `${i * 40}ms` } as React.CSSProperties}>
            <GroupTag group={g} tilt={i % 2 === 0 ? "-rotate-2" : "rotate-[1.5deg]"} />
          </li>
        ))}
      </ul>
      <div className="flex-1" />
      <Link href="/new" className={`${primaryOnSpruce} mt-4`}>
        Start another group
      </Link>
    </>
  );
}

function Intro({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <>
      <HatOfNames />
      <h1 className="font-display text-[40px] leading-[1.02] font-extrabold tracking-[-0.02em] text-balance">
        Put everyone&apos;s name in the hat.
      </h1>
      <p className="text-[15px] leading-[1.45] text-on-spruce-soft">
        Secret Santa for your group. Names are drawn once, fairly, and each person unwraps their
        own match in private.
      </p>
      <ol className="mt-1 flex flex-col gap-2.5">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-[15px]">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold font-display text-[15px] font-extrabold text-ink">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div className="flex-1" />
      <Link href="/new" className={primaryOnSpruce}>
        Start a group
      </Link>
      <div className="flex flex-col items-center gap-1 text-center text-[13px] text-on-spruce-soft">
        <p>Got an invite? Open the link you were sent.</p>
        {!signedIn && (
          <Link href="/sign-in" className={`font-bold text-white underline ${focusGold}`}>
            Already in a group? Sign in
          </Link>
        )}
      </div>
    </>
  );
}

// A group as a gift tag on a gold string. Gold when a match is waiting to be unwrapped.
function GroupTag({ group: g, tilt }: { group: MyGroup; tilt: string }) {
  const waiting = g.status === "drawn" && !g.unwrapped;
  const eyebrow = g.is_owner ? "You're organising" : g.status === "drawn" ? "Names drawn" : "You're in";
  const people = `${g.member_count} ${g.member_count === 1 ? "person" : "people"}`;
  const state = g.status === "open" ? " · Waiting for the draw" : waiting ? " · Your match is waiting" : "";

  return (
    <Link href={groupHref(g)} className={`group relative block rounded-[20px] ${focusGold}`}>
      <svg aria-hidden="true" width="60" height="40" viewBox="0 0 60 40" className="absolute -top-[30px] left-[22px]">
        <path d="M8 38 C2 20 20 6 56 2" fill="none" stroke="#F4B83A" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div
        className={`relative grid grid-cols-[1fr_auto] items-center gap-3 rounded-[20px] p-[18px] text-ink shadow-[0_12px_0_var(--spruce-deep)] transition-[rotate,translate] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:rotate-0 group-active:rotate-0 ${tilt} ${waiting ? "bg-gold" : "bg-card"}`}
      >
        <div className="min-w-0">
          <p
            className={`mb-1.5 flex items-center gap-2.5 text-[11px] font-bold tracking-[0.12em] uppercase ${waiting ? "text-ink" : "text-berry-text"}`}
          >
            <span aria-hidden="true" className="size-3.5 shrink-0 rounded-full bg-spruce" />
            {eyebrow}
          </p>
          <p className="font-display text-[22px] leading-[1.08] font-extrabold tracking-[-0.01em] [overflow-wrap:anywhere]">
            {g.name}
          </p>
          <p className={`mt-1 text-[13px] ${waiting ? "text-ink" : "text-ink-soft"}`}>
            {people}
            {state}
          </p>
        </div>
        {g.unwrapped && (
          <span className="absolute -top-[13px] right-[18px] rotate-6 rounded-lg bg-berry px-2.5 py-[5px] font-display text-xs font-extrabold tracking-[0.08em] text-white uppercase shadow-[0_3px_0_var(--spruce-deep)]">
            Unwrapped
          </span>
        )}
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-spruce text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
