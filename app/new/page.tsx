import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/wordmark";
import { NewGroupForm } from "./new-group-form";

export default function NewGroupPage({ searchParams }: PageProps<"/new">) {
  return (
    <main className="min-h-dvh bg-spruce text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-[22px] px-6 pt-6 pb-7">
          <Wordmark />
          <div className="mt-4 flex flex-col gap-2">
            <h1 className="font-display text-[38px] leading-[1.02] font-extrabold tracking-[-0.02em]">
              Start a group
            </h1>
            <p className="text-[15px] leading-[1.45] text-on-spruce-soft">
              Name it, set a limit, and you&apos;ll get one link to send everyone.
            </p>
          </div>
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
