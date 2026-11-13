import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { safeNext } from "@/lib/my-groups";
import { TagString } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
import { SignInForm } from "./sign-in-form";

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="min-h-dvh bg-spruce text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-4 px-6 pt-5 pb-6">
          <div className="flex items-center justify-between gap-3">
            <Wordmark />
            <Link
              href="/"
              className="flex min-h-11 items-center text-sm font-bold text-on-spruce-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Cancel
            </Link>
          </div>

          <div className="relative mt-[50px]">
            <TagString className="absolute left-5 -top-11" />
            <div className="tag-drop flex -rotate-3 flex-col gap-3 rounded-[22px] bg-card px-6 pt-[26px] pb-6 text-ink shadow-[0_18px_0_var(--spruce-deep)]">
              <p className="flex items-center gap-3 text-xs font-bold tracking-[0.12em] text-berry-text uppercase">
                <span aria-hidden="true" className="size-5 shrink-0 rounded-full bg-spruce" />
                Welcome back
              </p>
              <h1 className="font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.02em] text-balance">
                Find your name in the hat
              </h1>
              <p className="text-[15px] leading-[1.45] text-ink-soft">
                Use the email you joined with. We&apos;ll send you a 6&#8209;digit code.
              </p>
            </div>
          </div>

          {/* The landing's hat, empty and waiting under the tag. */}
          <svg aria-hidden="true" width="230" height="106" viewBox="40 108 276 128" className="mx-auto mt-3 max-w-full shrink-0">
            <path d="M60 118 L282 118 C 280 168 268 196 292 214 C 214 220 122 206 86 168 C 70 152 62 136 60 118 Z" fill="#D62F3A" />
            <path d="M86 168 C 120 200 200 214 292 214" fill="none" stroke="#A81F29" strokeWidth="3" />
            <circle cx="298" cy="216" r="16" fill="#FFFFFF" />
            <rect x="44" y="112" width="254" height="30" rx="15" fill="#FFFFFF" />
          </svg>

          <Suspense fallback={<div className="flex-1" />}>
            <Form searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const next = safeNext((await searchParams).next);
  const session = await getSession();
  if (session?.user) redirect(next ?? "/");
  return <SignInForm next={next} />;
}
