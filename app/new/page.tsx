import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/wordmark";
import { NewGroupForm } from "./new-group-form";

export default function NewGroupPage({ searchParams }: PageProps<"/new">) {
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
          <h1 className="font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.02em]">
            Start a group
          </h1>
          <Suspense fallback={<div className="flex-1" />}>
            <Form searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/new">, "searchParams">) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const notice =
    error === "link"
      ? "That sign-in link has expired or was already used. Send yourself a new one."
      : error === "create"
        ? "You're signed in, but we couldn't create the group. Try again."
        : null;

  return <NewGroupForm signedInEmail={data?.claims ? (data.claims.email ?? "") : null} notice={notice} />;
}
