import { HatLogo } from "@/components/icons";

export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <HatLogo />
      <span className="font-display text-2xl font-extrabold tracking-[-0.01em]">Hatful</span>
    </div>
  );
}
