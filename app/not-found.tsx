import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-snow text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-col gap-2 px-5 pt-[22px]">
          <h1 className="font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.02em]">
            Nothing in this hat
          </h1>
          <p className="text-sm text-ink-soft">
            This page doesn&apos;t exist, or it belongs to a group you&apos;re not in.
          </p>
          <Link href="/" className="mt-2 min-h-11 text-sm font-bold underline">
            Go to Hatful
          </Link>
        </div>
      </div>
    </main>
  );
}
