# Hatful

A Secret Santa app. A group joins by invite link, names are drawn once on the server,
and each person unwraps their own match in private.

Stack: Next.js (App Router, TypeScript, Tailwind), Supabase (Auth magic link, Postgres
with RLS, Realtime), Motion, Sonner, Vaul. Deployed on Vercel.

## Status

Nothing is built yet. This repo holds the handover only:

- `supabase/migrations/` — schema, RLS policies and functions. Written but NOT yet run
  against a database. Test them first (build step 1).
- `docs/design/*.dc.html` — the five approved screens (Join, Lobby, Draw, Match,
  Wishlist). These are mockups written for a design-canvas runtime: `{{holes}}`,
  `<sc-if>`, `<sc-for>` and `./support.js` are that runtime's syntax. Do not run them.
  Read them for exact markup, copy, colours, sizes and animation timings, and rebuild
  each as React + Tailwind. `Draw.dc.html` contains the working logic for the
  hold-to-unwrap interaction.
- `docs/architecture.md` — the full architecture doc, if present (exported by the owner).

## Rules that must never be broken

1. The draw is computed once by `draw_names`. Never implement live, one-at-a-time picking.
2. `assignments` is readable only by the giver (own row) and writable only by the SQL
   functions. Never add a policy, view or query that lets anyone else read it.
3. Never use the Supabase service role key in the app. Everything runs as the signed-in user.
4. The draw page must not load the match on the server. The client calls
   `reveal_my_match` only when the hold completes.
5. `/g/[id]/match` redirects to `/g/[id]/draw` while `members.unwrapped_at` is null.
6. Realtime subscribes to `members` only, filtered by `group_id`.
7. Claims live in `wish_claims`, never on `wishes`, so a wish's owner cannot see them.

## Routes

```
app/
  page.tsx                 landing, "Start a group"
  new/page.tsx             create group form
  join/[code]/page.tsx     invite card, name + email            (design: Main)
  auth/confirm/route.ts    magic link callback, then join_group
  g/[id]/layout.tsx        loads group + my member row, 404 if not a member
  g/[id]/page.tsx          lobby                                 (design: Lobby)
  g/[id]/draw/page.tsx     hold to unwrap                        (design: Draw)
  g/[id]/match/page.tsx    receiver, note, wishlist              (design: Match)
  g/[id]/wishlist/page.tsx my wishes + add drawer                (design: Wishlist)
  actions.ts               createGroup, requestMagicLink, drawNames, revealMatch,
                           addWish, removeWish, toggleClaim
components/                lobby-live.tsx, unwrap.tsx, wish-drawer.tsx, gift-tag.tsx
lib/supabase/              server.ts, client.ts, middleware.ts  (@supabase/ssr)
```

Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.

## Design tokens

```css
:root {
  --spruce: #0E3A2D;  --spruce-deep: #0A2B21;  --spruce-line: #3C7361;
  --snow: #F4F7F5;    --card: #FFFFFF;         --card-line: #DCE6E1;
  --ink: #10231C;     --ink-soft: #40564D;     --on-spruce-soft: #C4DACF;
  --berry: #D62F3A;   --berry-text: #C22630;   --gold: #F4B83A;

  --ease-out:    cubic-bezier(.22, 1, .36, 1);     /* entrances, the lid */
  --ease-spring: cubic-bezier(.34, 1.56, .64, 1);  /* the name tag */
  --ease-drawer: cubic-bezier(.32, .72, 0, 1);     /* Vaul */
  --ease-burst:  cubic-bezier(.16, 1, .3, 1);      /* confetti */
}
```

Fonts: Bricolage Grotesque (700, 800) for display, DM Sans (400, 500, 700) for body,
both via `next/font/google`. Mobile-first at 390px wide; centre a 390px column on desktop.
Gold is a fill with ink text on it, never text on white. No emoji.

## Motion rules (Emil Kowalski's principles)

- Animate only `transform`, `opacity` and `clip-path`.
- Entrances ease out and finish under 300ms. Nothing eases in.
- Everything the user controls is interruptible: CSS transitions or Motion springs.
- Buttons press to `scale(0.97)` in 160ms.
- Nothing starts from `scale(0)`; start at 0.85 or higher with opacity.
- Frequently visited screens (Match) stay nearly still.
- Respect `prefers-reduced-motion`: keep fades, drop movement.
- Draw screen: hold fills via `clip-path` 1100ms linear; release snaps back 200ms
  ease-out; lid exits 500ms `--ease-out`; tag rises 600ms `--ease-spring` after 120ms;
  10 confetti pieces 800ms `--ease-burst` with 20ms stagger.
- Lobby: new member fades in with `translateY(8px)`, 250ms; Sonner toast on change.
- Wishlist: Vaul drawer, page behind scales to 0.96.

## Build order

1. Supabase project, run the migrations, and write a SQL test that runs a draw for
   3, 8 and 40 members and checks: no self-match, every member gives once and
   receives once, exclusions respected.
2. Scaffold Next.js; auth with magic link, `auth/confirm`, middleware, `join_group`.
3. Create group and the lobby, static first, then Realtime.
4. `draw_names` on the organiser's button, with house rules (exclusions).
5. Draw screen: `unwrap.tsx` and `reveal_my_match`.
6. Match screen, wishes and claims.
7. Wishlist drawer with Vaul.
8. Motion pass against the rules above, then a reduced-motion pass.
9. Deploy to Vercel; set the Supabase auth redirect URLs.

Not in v1: reminder emails, multiple rounds per group, real currency handling.

## Edge cases

- Joining after the draw is refused by `join_group`; say so on the invite page.
- Fewer than 3 members: disable Draw names and show why.
- Impossible house rules: `draw_names` raises; ask the organiser to remove a rule.
- Drop-out after the draw: `remove_member`; their Santa unwraps again.
