// Artwork from docs/design, one place. Decorative: callers label meaning in text.

type Props = { size?: number; className?: string };

export function HatLogo({ size = 34, className }: Props) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 34 34" className={className}>
      <path d="M6 25 C8 12 16 5 25 6 C22 12 25 18 28 25 Z" fill="#D62F3A" />
      <rect x="3" y="23" width="28" height="8" rx="4" fill="#FFFFFF" />
      <circle cx="26" cy="6" r="4" fill="#FFFFFF" />
    </svg>
  );
}

// The gold string the invite tag hangs from (Join).
export function TagString({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="120" height="60" viewBox="0 0 120 60" className={className}>
      <path
        d="M22 58 C10 30 40 10 110 2"
        fill="none"
        stroke="#F4B83A"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Stroke({ size = 20, className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

// House rules (Lobby).
export function NoEntryIcon(props: Props) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </Stroke>
  );
}

// "Only you can see this screen" (Match).
export function LockIcon({ size = 16, ...props }: Props) {
  return (
    <Stroke size={size} {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Stroke>
  );
}

// Budget notice (Wishlist).
export function InfoIcon({ size = 16, ...props }: Props) {
  return (
    <Stroke size={size} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16.5v.01" />
    </Stroke>
  );
}
