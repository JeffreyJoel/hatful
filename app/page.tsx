import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh bg-spruce text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-4 px-6 pt-6 pb-7">
          <span className="font-display text-2xl font-extrabold tracking-[-0.01em]">Hatful</span>
          <h1 className="mt-10 font-display text-[44px] leading-[1.02] font-extrabold tracking-[-0.02em]">
            Secret Santa, drawn fairly and kept secret.
          </h1>
          <p className="text-[15px] leading-[1.45] text-on-spruce-soft">
            Invite your group with one link. Names are drawn once, and each person unwraps
            their own match in private.
          </p>
          <div className="flex-1" />
          <Link
            href="/new"
            className="press flex h-[58px] items-center justify-center rounded-[18px] bg-berry font-display text-[19px] font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Start a group
          </Link>
        </div>
      </div>
    </main>
  );
}
