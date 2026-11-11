"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { revealMatch } from "@/app/actions";
import { GiftTag } from "@/components/gift-tag";

const HOLD_MS = 1100;

// x, y, rotation and colour of each confetti piece once the box is open.
const CONFETTI: [number, number, number, string][] = [
  [-150, -150, 40, "var(--gold)"],
  [-110, -40, -30, "#fff"],
  [-165, 40, 80, "var(--berry)"],
  [150, -160, -50, "#fff"],
  [120, -50, 25, "var(--gold)"],
  [165, 30, -70, "var(--berry)"],
  [-60, -205, 15, "var(--berry)"],
  [70, -210, -20, "var(--gold)"],
  [-140, 120, 60, "#fff"],
  [145, 125, -35, "var(--gold)"],
];

// wrapped -> holding (finger down) -> opening (asking the server) -> revealed.
type Phase = "wrapped" | "holding" | "opening" | "revealed";

export function Unwrap({
  groupId,
  groupName,
  myName,
  swapDate,
}: {
  groupId: string;
  groupName: string;
  myName: string;
  swapDate: string | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("wrapped");
  const [name, setName] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchHref = `/g/${groupId}/match`;

  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  function start() {
    if (phase !== "wrapped") return;
    setPhase("holding");
    timer.current = setTimeout(async () => {
      // The match is fetched here and nowhere earlier: only a finished hold reveals it.
      setPhase("opening");
      const result = await revealMatch(groupId);
      if (!result.ok) {
        toast(result.message);
        setPhase("wrapped");
        return;
      }
      setName(result.name);
      setPhase("revealed");
      router.prefetch(matchHref);
    }, HOLD_MS);
  }

  function cancel() {
    if (phase !== "holding") return;
    clearTimeout(timer.current ?? undefined);
    setPhase("wrapped");
  }

  const held = phase === "holding" || phase === "opening";
  const open = phase === "revealed";

  return (
    <main className="min-h-dvh bg-spruce text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col overflow-x-clip">
        <div className="candy-stripe" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-3.5 px-6 pt-[22px] pb-7">
          <p className="text-[13px] font-bold tracking-[0.12em] text-gold uppercase">{groupName}</p>

          <div className="flex min-h-[132px] flex-col gap-2" aria-live="polite">
            <h1 className="font-display text-[38px] leading-[1.02] font-extrabold tracking-[-0.02em]">
              {open ? `You're gifting ${name}.` : `Your match is in here, ${myName}.`}
            </h1>
            <p className="text-[15px] leading-[1.45] text-on-spruce-soft">
              {open
                ? `Only you can see this. Keep it quiet${swapDate ? ` until ${swapDate}` : ""}.`
                : "Check nobody is looking over your shoulder first."}
            </p>
          </div>

          <div className="relative h-[clamp(320px,48dvh,400px)] shrink-0">
            <div aria-hidden="true">
              {CONFETTI.map(([x, y, turn, colour], i) => (
                <span
                  key={i}
                  className="absolute bottom-[154px] left-1/2 z-[1] -ml-[5px] h-4 w-2.5 rounded-[3px]"
                  style={{
                    background: colour,
                    opacity: open ? 1 : 0,
                    transform: open
                      ? `translate(${x}px, ${y}px) rotate(${turn}deg)`
                      : "translate(0, 0) rotate(0deg) scale(0.5)",
                    transition: open
                      ? `transform 800ms var(--ease-burst) ${100 + i * 20}ms, opacity 200ms ease-out ${100 + i * 20}ms`
                      : "transform 150ms ease-out, opacity 100ms ease-out",
                  }}
                />
              ))}
            </div>

            <div
              aria-hidden="true"
              className="absolute top-[30px] left-1/2 z-[1] -ml-[115px]"
              style={{
                opacity: open ? 1 : 0,
                transform: open
                  ? "translateY(0) rotate(-4deg) scale(1)"
                  : "translateY(210px) rotate(0deg) scale(0.85)",
                transition: open
                  ? "transform 600ms var(--ease-spring) 120ms, opacity 200ms ease-out 120ms"
                  : "transform 200ms ease-out, opacity 120ms ease-out",
              }}
            >
              {name && <GiftTag size="lg" label="To" name={name} />}
            </div>

            <div
              aria-hidden="true"
              className="absolute bottom-0 left-1/2 z-[2] -ml-[110px] h-[170px] w-[220px] overflow-hidden rounded-[6px_6px_18px_18px] bg-berry"
            >
              <span className="absolute inset-y-0 left-1/2 -ml-[19px] w-[38px] bg-gold" />
              <span className="absolute inset-x-0 top-0 h-3.5 bg-[#A81F29]" />
            </div>

            <div
              aria-hidden="true"
              className="absolute bottom-[160px] left-1/2 z-[3] -ml-[124px] h-[54px] w-[248px] rounded-xl bg-berry-text"
              style={{
                opacity: open ? 0 : 1,
                transform: open
                  ? "translate(70px, -150px) rotate(24deg)"
                  : held
                    ? "translateY(-6px) rotate(-2deg)"
                    : "none",
                transition: open
                  ? "transform 500ms var(--ease-out), opacity 400ms ease-out 100ms"
                  : held
                    ? `transform ${HOLD_MS}ms ease-in, opacity 150ms ease-out`
                    : "transform 200ms ease-out, opacity 150ms ease-out",
              }}
            >
              <span className="absolute inset-y-0 left-1/2 -ml-[19px] w-[38px] bg-gold" />
              <span className="absolute -top-[30px] left-1/2 -ml-11 size-10 -rotate-[8deg] rounded-[50%_50%_6px_50%] bg-gold" />
              <span className="absolute -top-[30px] left-1/2 ml-1 size-10 rotate-[8deg] rounded-[50%_50%_50%_6px] bg-gold" />
              <span className="absolute -top-3 left-1/2 -ml-2.5 size-5 rounded-md bg-[#D9A02B]" />
            </div>
          </div>

          <div className="flex-1" />

          {open ? (
            <>
              <Link
                href={matchHref}
                className="press flex h-16 items-center justify-center rounded-[20px] bg-berry px-4 text-center font-display text-[19px] font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <span className="truncate">See {name}&apos;s wishlist</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setPhase("wrapped");
                  // Let the tag sink back into the box before the name leaves the page.
                  timer.current = setTimeout(() => setName(""), 200);
                }}
                className="press h-11 text-sm font-bold text-on-spruce-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Wrap it back up
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onPointerDown={start}
                onPointerUp={cancel}
                onPointerLeave={cancel}
                onPointerCancel={cancel}
                onBlur={cancel}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if (e.repeat || (e.key !== " " && e.key !== "Enter")) return;
                  e.preventDefault();
                  start();
                }}
                onKeyUp={cancel}
                className="press relative h-16 cursor-pointer touch-none overflow-hidden rounded-[20px] border-[1.5px] border-spruce-line bg-spruce-deep font-display text-[19px] font-bold text-white select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <span>Hold to unwrap</span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gold text-ink"
                  style={{
                    clipPath: held ? "inset(0)" : "inset(0 100% 0 0)",
                    transition: held
                      ? `clip-path ${HOLD_MS}ms linear`
                      : "clip-path 200ms ease-out",
                  }}
                >
                  {phase === "opening" ? "Unwrapping…" : "Keep holding"}
                </span>
              </button>
              <p className="text-center text-[13px] text-on-spruce-soft">
                Let go any time to keep it wrapped.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
