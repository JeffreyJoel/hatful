// The landing illustration: names in the hat, with one more dropping in.
// Decorative only; the headline beside it carries the meaning.

const display = "font-display text-2xl font-extrabold text-ink";

function NameTag({
  name,
  className,
  style,
}: {
  name: string;
  className: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute z-[2] flex h-[66px] items-center justify-center gap-2 rounded-[14px] ${className}`}
      style={style}
    >
      <span className="size-2.5 rounded-full bg-spruce" />
      <span className={display}>{name}</span>
    </div>
  );
}

export function HatOfNames() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[236px] w-[342px] max-w-full shrink-0">
      <svg width="342" height="236" viewBox="0 0 342 236" className="absolute top-0 left-0 z-0">
        <path
          d="M60 118 L282 118 C 280 168 268 196 292 214 C 214 220 122 206 86 168 C 70 152 62 136 60 118 Z"
          fill="#D62F3A"
        />
        <path d="M86 168 C 120 200 200 214 292 214" fill="none" stroke="#A81F29" strokeWidth="3" />
        <circle cx="298" cy="216" r="16" fill="#FFFFFF" />
      </svg>
      {/* Priya sits behind, higher up, so every name stays readable. */}
      <NameTag name="Priya" className="w-[104px] bg-gold" style={{ left: 112, top: 4, rotate: "-4deg", zIndex: 1 }} />
      <NameTag name="Amara" className="w-[116px] bg-card" style={{ left: 54, top: 64, rotate: "-9deg" }} />
      <NameTag name="Leo" className="w-[90px] bg-card" style={{ left: 186, top: 66, rotate: "5deg" }} />
      <NameTag
        name="Tunde"
        className="tag-fall h-[62px]! w-[112px] bg-card shadow-[0_10px_0_var(--spruce-deep)]"
        style={{ left: 226, top: -4, rotate: "17deg" }}
      />
      <div className="absolute top-[112px] left-[44px] z-[3] h-[30px] w-[254px] rounded-[15px] bg-card" />
    </div>
  );
}
