import { Suspense } from "react";
import { getGroup } from "@/lib/group";

export default function GroupLayout({ children, params }: LayoutProps<"/g/[id]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-snow" />}>
      <MembersOnly params={params}>{children}</MembersOnly>
    </Suspense>
  );
}

async function MembersOnly({
  params,
  children,
}: {
  params: LayoutProps<"/g/[id]">["params"];
  children: React.ReactNode;
}) {
  const { id } = await params;
  await getGroup(id);
  return children;
}
