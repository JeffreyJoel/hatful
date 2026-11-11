// "$30" rather than "$30.00"; cents only when there are some.
export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

// "Sat 19 Dec". Dates are calendar days, so format in UTC to avoid an off-by-one.
export function formatSwapDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(",", "");
}

// Accepts "30", "$30", "29.50". Empty means no amount; anything else is "bad".
export function parseMoney(raw: string): number | null | "bad" {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return "bad";
  const cents = Math.round(Number(cleaned) * 100);
  return cents > 0 && cents <= 100_000_00 ? cents : "bad";
}

// The invite card's title: "Sunday Dinner Club Secret Santa", unless the name already says it.
export function inviteTitle(name: string) {
  return /secret santa/i.test(name) ? name : `${name} Secret Santa`;
}
