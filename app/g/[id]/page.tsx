import { getGroup } from "@/lib/group";

// Placeholder until the lobby lands in build step 3.
export default async function GroupPage({ params }: PageProps<"/g/[id]">) {
  const { id } = await params;
  const { group, me } = await getGroup(id);

  return (
    <main className="min-h-dvh bg-snow text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-col gap-1 px-5 pt-[22px]">
          <h1 className="font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.02em]">
            {group.name}
          </h1>
          <p className="text-sm text-ink-soft">You&apos;re in, {me.display_name}.</p>
        </div>
      </div>
    </main>
  );
}
