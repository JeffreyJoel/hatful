export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <svg aria-hidden="true" width="34" height="34" viewBox="0 0 34 34">
        <path d="M6 25 C8 12 16 5 25 6 C22 12 25 18 28 25 Z" fill="#D62F3A" />
        <rect x="3" y="23" width="28" height="8" rx="4" fill="#FFFFFF" />
        <circle cx="26" cy="6" r="4" fill="#FFFFFF" />
      </svg>
      <span className="font-display text-2xl font-extrabold tracking-[-0.01em]">Hatful</span>
    </div>
  );
}
