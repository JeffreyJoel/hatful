import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { HatOfNames } from "@/components/hat-of-names";
import { primaryOnSpruce } from "@/lib/ui";

const STEPS = [
  "Send one invite link to the group",
  "Draw every name at once, when all are in",
  "Everyone holds to unwrap their own",
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-spruce text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-4 px-6 pt-[22px] pb-7">
          <Wordmark />
          <HatOfNames />
          <h1 className="font-display text-[40px] leading-[1.02] font-extrabold tracking-[-0.02em] text-balance">
            Put everyone&apos;s name in the hat.
          </h1>
          <p className="text-[15px] leading-[1.45] text-on-spruce-soft">
            Secret Santa for your group. Names are drawn once, fairly, and each person unwraps
            their own match in private.
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
          <p className="text-center text-[13px] text-on-spruce-soft">
            Got an invite? Open the link you were sent.
          </p>
        </div>
      </div>
    </main>
  );
}
