import { ViewTransition } from "react";

const SIZES = {
  // Draw: the tag that rises out of the box.
  lg: {
    box: "h-[130px] w-[230px] rounded-[20px]",
    hole: "left-4 top-4 size-[18px]",
    label: "text-xs",
    name: [56, 44, 34, 26],
    steps: [6, 8, 11],
  },
  // Match: the same tag, smaller, in the header card.
  sm: {
    box: "h-[104px] w-[170px] rounded-[18px]",
    hole: "left-3 top-3 size-3.5",
    label: "text-[11px]",
    name: [44, 34, 26, 20],
    steps: [5, 7, 10],
  },
} as const;

// The white gift tag with a punched hole. Long names step down in size so they still fit.
export function GiftTag({ size, label, name }: { size: "lg" | "sm"; label: string; name: string }) {
  const s = SIZES[size];
  const step = s.steps.findIndex((max) => name.length <= max);
  const fontSize = s.name[step === -1 ? s.name.length - 1 : step];

  return (
    <ViewTransition name="match-tag" share="tag-morph" default="none">
      <div
        className={`relative flex shrink-0 flex-col items-center justify-center gap-0.5 bg-card px-3 ${s.box}`}
      >
        <span aria-hidden="true" className={`absolute rounded-full bg-spruce ${s.hole}`} />
        <span className={`font-bold tracking-[0.12em] text-berry-text uppercase ${s.label}`}>
          {label}
        </span>
        <span
          className="max-w-full overflow-hidden pb-1 font-display leading-[1.05] font-extrabold tracking-[-0.02em] text-ellipsis whitespace-nowrap text-ink"
          style={{ fontSize }}
        >
          {name}
        </span>
      </div>
    </ViewTransition>
  );
}
