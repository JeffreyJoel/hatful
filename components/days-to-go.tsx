"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// Counts calendar days in the viewer's own timezone, so it only renders in the browser.
export function DaysToGo({ date }: { date: string }) {
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  if (!inBrowser) return <span className="h-[68px]" />;

  const [y, m, d] = date.split("-").map(Number);
  const now = new Date();
  const days = Math.round(
    (new Date(y, m - 1, d).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );
  if (days < 0) return null;

  return (
    <>
      <span className="font-display text-5xl leading-none font-extrabold text-gold tabular-nums">
        {days === 0 ? "Today" : days}
      </span>
      <span className="text-[13px] font-bold">
        {days === 0 ? "is swap day" : days === 1 ? "day to go" : "days to go"}
      </span>
    </>
  );
}
