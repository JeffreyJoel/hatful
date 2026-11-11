import { redirect } from "next/navigation";
import { getGroup } from "@/lib/group";
import { formatSwapDate } from "@/lib/format";
import { Unwrap } from "@/components/unwrap";

// The match is never loaded here. Unwrap fetches it only when the hold completes.
export default async function DrawPage({ params }: PageProps<"/g/[id]/draw">) {
  const { id } = await params;
  const { group, me } = await getGroup(id);
  if (group.status !== "drawn") redirect(`/g/${id}`);

  return (
    <Unwrap
      groupId={id}
      groupName={group.name}
      myName={me.display_name}
      swapDate={group.swap_date ? formatSwapDate(group.swap_date) : null}
    />
  );
}
