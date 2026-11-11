"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addRule, removeRule } from "@/app/actions";
import { CloseIcon, NoEntryIcon } from "@/components/icons";

type Person = { id: string; name: string };

const select =
  "h-11 min-w-0 flex-1 rounded-xl border-[1.5px] border-[#9DB5AA] bg-card px-2.5 text-sm text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-berry";

// Pairs who can't draw each other. Everyone sees them; the organiser edits them until the draw.
export function HouseRules({
  groupId,
  rules,
  people,
  editable,
}: {
  groupId: string;
  rules: { a: string; b: string }[];
  people: Person[];
  editable: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const nameOf = new Map(people.map((p) => [p.id, p.name]));

  async function run(action: Promise<{ ok: true } | { ok: false; message: string }>) {
    const result = await action;
    if (!result.ok) {
      toast(result.message);
      return false;
    }
    router.refresh();
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await run(addRule(groupId, a, b))) {
      setAdding(false);
      setA("");
      setB("");
    }
  }

  return (
    <>
      {rules.map((r) => (
        <div
          key={`${r.a}-${r.b}`}
          className="flex items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-[#9DB5AA] py-1 pr-1 pl-3.5"
        >
          <NoEntryIcon className="shrink-0 text-ink" />
          <span className="flex-1 py-2 text-[13px] leading-[1.4]">
            House rule: {nameOf.get(r.a)} and {nameOf.get(r.b)} can&apos;t draw each other.
          </span>
          {editable && (
            <button
              type="button"
              onClick={() => run(removeRule(groupId, r.a, r.b))}
              aria-label={`Remove the rule for ${nameOf.get(r.a)} and ${nameOf.get(r.b)}`}
              className="press flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-soft focus-visible:outline-3 focus-visible:outline-berry"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      ))}

      {editable && people.length >= 2 && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="press min-h-11 self-start text-sm font-bold underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-berry"
        >
          Add a house rule
        </button>
      )}

      {editable && adding && (
        <form
          onSubmit={add}
          className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-dashed border-[#9DB5AA] p-3.5"
        >
          <p className="text-[13px] leading-[1.4]">These two can&apos;t draw each other:</p>
          <div className="flex items-center gap-2">
            <select
              aria-label="First person"
              required
              value={a}
              onChange={(e) => setA(e.target.value)}
              className={select}
            >
              <option value="">Choose</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="text-[13px]">and</span>
            <select
              aria-label="Second person"
              required
              value={b}
              onChange={(e) => setB(e.target.value)}
              className={select}
            >
              <option value="">Choose</option>
              {people
                .filter((p) => p.id !== a)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="press h-11 flex-1 rounded-xl border-[1.5px] border-ink bg-card text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-berry"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="press h-11 flex-1 rounded-xl bg-ink text-sm font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-berry"
            >
              Add rule
            </button>
          </div>
        </form>
      )}
    </>
  );
}
