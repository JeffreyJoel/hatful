"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { addWish, removeWish, saveNote } from "@/app/actions";
import { formatMoney, parseMoney } from "@/lib/format";
import { CloseIcon, InfoIcon } from "@/components/icons";
import { fieldOnSnow as field, labelOnSnow as label, primaryOnSnow, secondaryOnSnow } from "@/lib/ui";

export type MyWish = {
  id: string;
  title: string;
  url: string | null;
  price: string | null;
  note: string | null;
};

const EMPTY = { title: "", url: "", price: "", note: "" };

// The member's own wishlist: the list, their note, and the "Add a wish" drawer.
export function WishlistEditor({
  groupId,
  wishes,
  note: savedNote,
  budgetCents,
  currency,
}: {
  groupId: string;
  wishes: MyWish[];
  note: string;
  budgetCents: number | null;
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(savedNote);
  const [noteSaved, setNoteSaved] = useState(savedNote);
  // Wishes on first paint sit still; ones saved later grow into the list.
  const [first] = useState(() => new Set(wishes.map((w) => w.id)));

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const price = parseMoney(draft.price);
  const limit = budgetCents != null ? formatMoney(budgetCents, currency) : null;
  const budgetNotice =
    budgetCents == null || typeof price !== "number" || price < budgetCents
      ? null
      : price === budgetCents
        ? `Right at the ${limit} limit for this group.`
        : `Over the ${limit} limit for this group.`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await addWish(groupId, draft);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    setDraft(EMPTY);
    setError(null);
    router.refresh();
  }

  async function remove(id: string) {
    const result = await removeWish(id);
    if (!result.ok) toast(result.message);
    router.refresh();
  }

  async function keepNote() {
    const result = await saveNote(groupId, note);
    if (!result.ok) {
      toast(result.message);
      return;
    }
    setNoteSaved(note);
    toast("Note saved");
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} shouldScaleBackground setBackgroundColorOnScale={false}>
      {wishes.length === 0 ? (
        <p className="rounded-2xl border-[1.5px] border-dashed border-[#9DB5AA] px-3.5 py-3 text-[13px] leading-[1.4]">
          Nothing here yet. Add a few ideas so your Santa isn&apos;t guessing.
        </p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {wishes.map((w) => (
            <li key={w.id} className={first.has(w.id) ? "" : "grow-in"}>
              <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-card-line bg-card py-1.5 pr-1.5 pl-3.5">
                <span className="flex min-w-0 flex-1 flex-col py-1.5">
                  <span className="text-[15px] font-bold [overflow-wrap:anywhere]">{w.title}</span>
                  {w.note && (
                    <span className="text-xs text-ink-soft [overflow-wrap:anywhere]">{w.note}</span>
                  )}
                </span>
                {w.price && <span className="text-[13px] font-bold tabular-nums">{w.price}</span>}
                <button
                  type="button"
                  onClick={() => remove(w.id)}
                  aria-label={`Remove ${w.title}`}
                  className="press flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-soft focus-visible:outline-3 focus-visible:outline-berry"
                >
                  <CloseIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="my-note" className={label}>
          A note for your Santa
        </label>
        <textarea
          id="my-note"
          rows={2}
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="No scented candles, please"
          className={`${field} h-auto resize-none bg-card py-3`}
        />
        {note.trim() !== noteSaved.trim() && (
          <button type="button" onClick={keepNote} className={`${secondaryOnSnow} h-11 text-[15px]`}>
            Save note
          </button>
        )}
      </div>

      <div className="flex-1" />

      <Drawer.Trigger className={primaryOnSnow}>Add a wish</Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-[rgba(10,43,33,0.6)]" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-[390px] flex-col rounded-t-[28px] bg-card text-ink outline-none">
          <form
            onSubmit={submit}
            className="flex flex-col gap-3.5 overflow-y-auto px-5 pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))]"
          >
            <span aria-hidden="true" className="h-[5px] w-11 shrink-0 self-center rounded-full bg-[#B7C7BF]" />
            <Drawer.Title className="mt-1 font-display text-[26px] font-extrabold tracking-[-0.02em]">
              Add a wish
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Your Santa sees this. You won&apos;t know who they are.
            </Drawer.Description>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="wish-what" className={label}>
                What would you like?
              </label>
              <input
                id="wish-what"
                type="text"
                required
                maxLength={80}
                value={draft.title}
                onChange={set("title")}
                className={field}
              />
            </div>
            <div className="flex gap-2.5">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor="wish-link" className={label}>
                  Link (optional)
                </label>
                <input
                  id="wish-link"
                  type="text"
                  inputMode="url"
                  autoCapitalize="none"
                  placeholder="https://"
                  value={draft.url}
                  onChange={set("url")}
                  className={field}
                />
              </div>
              <div className="flex w-[104px] shrink-0 flex-col gap-1.5">
                <label htmlFor="wish-price" className={label}>
                  About
                </label>
                <input
                  id="wish-price"
                  type="text"
                  inputMode="decimal"
                  placeholder={limit ?? "$30"}
                  value={draft.price}
                  onChange={set("price")}
                  className={field}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="wish-note" className={label}>
                Note for your Santa
              </label>
              <textarea
                id="wish-note"
                rows={2}
                maxLength={200}
                placeholder="Sizes, colours, things to avoid"
                value={draft.note}
                onChange={set("note")}
                className={`${field} h-auto resize-none py-3`}
              />
            </div>

            {budgetNotice && (
              <div className="flex items-center gap-2 rounded-xl bg-[#FFF1CF] px-3 py-2.5 text-[13px]">
                <InfoIcon className="shrink-0" />
                <span>{budgetNotice}</span>
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-gold px-3 py-2.5 text-[13px]">
                {error}
              </p>
            )}

            <button type="submit" disabled={saving} className={`${primaryOnSnow} shrink-0`}>
              {saving ? "Adding…" : "Add to wishlist"}
            </button>
            <Drawer.Close className="flex min-h-11 shrink-0 items-center justify-center text-sm font-bold underline focus-visible:outline-3 focus-visible:outline-berry">
              Cancel
            </Drawer.Close>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
