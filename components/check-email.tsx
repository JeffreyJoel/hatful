export function CheckEmail({
  email,
  outcome,
  onRetry,
}: {
  email: string;
  outcome: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-[22px] flex flex-1 flex-col gap-3" aria-live="polite">
      <h2 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.02em]">
        Check your email
      </h2>
      <p className="text-[15px] leading-[1.45] text-on-spruce-soft">
        We sent a sign-in link to <span className="font-bold text-white">{email}</span>. Open it
        on any device and {outcome}.
      </p>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onRetry}
        className="press min-h-11 text-sm font-bold text-on-spruce-soft"
      >
        Use a different email
      </button>
    </div>
  );
}
