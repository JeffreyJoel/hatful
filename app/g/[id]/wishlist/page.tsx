import Link from "next/link";
import { getGroup } from "@/lib/group";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { textLinkOnSnow } from "@/lib/ui";
import { WishlistEditor } from "@/components/wish-drawer";

export default async function WishlistPage({ params }: PageProps<"/g/[id]/wishlist">) {
  const { id } = await params;
  const { group, me } = await getGroup(id);
  const supabase = await createClient();
  const { data: wishes } = await supabase
    .from("wishes")
    .select("id, title, url, price_cents, note")
    .eq("member_id", me.id)
    .order("created_at");

  const seenMatch = group.status === "drawn" && me.unwrapped_at != null;

  return (
    // The dark ground shows around the page when the drawer scales it back.
    <div className="min-h-dvh bg-spruce-deep">
      <main data-vaul-drawer-wrapper="" className="min-h-dvh bg-snow text-ink">
        <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
          <div className="candy-stripe" aria-hidden="true" />
          <div className="flex flex-1 flex-col gap-3.5 px-5 pt-[22px] pb-6">
            <h1 className="font-display text-[30px] font-extrabold tracking-[-0.02em]">
              Your wishlist
            </h1>
            <p className="text-sm text-ink-soft">
              Your Santa sees this. You won&apos;t know who they are.
            </p>
            <WishlistEditor
              groupId={id}
              wishes={(wishes ?? []).map((w) => ({
                id: w.id,
                title: w.title,
                url: w.url,
                note: w.note,
                price: w.price_cents != null ? formatMoney(w.price_cents, group.currency) : null,
              }))}
              note={me.note ?? ""}
              budgetCents={group.budget_cents}
              currency={group.currency}
            />
            <Link href={seenMatch ? `/g/${id}/match` : `/g/${id}`} className={textLinkOnSnow}>
              {seenMatch ? "Back to my match" : `Back to ${group.name}`}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
