# Hatful

A Secret Santa app. A group joins by invite link, names are drawn once on the server,
and each person unwraps their own match in private.

Stack: Next.js (App Router, TypeScript, Tailwind), Neon (Postgres with RLS, Neon Auth
magic link, Neon Realtime), Motion, Sonner, Vaul. Deployed on Vercel.

## Status

Build steps 1 to 7 are done. Steps 8 (motion and reduced-motion pass) and 9 (deploy) remain.

- Every screen in the design canvas is built: Landing, Start a group, Join, Lobby
  (with the organiser's Draw names and house rules), Draw, Match and Wishlist.
- `db/migrations/` holds 0000 to 0008, applied to the Neon `production` branch and tested
  with pgTAP (`db/tests/`). `db/run.sh migrate|test [branch]` runs them. 0000 rebuilds the
  Supabase pieces the rest rely on: the `authenticated`/`anon` roles and `auth.uid()`.
  0007/0008 add `lobby_pulse`, the counter the lobby subscribes to.
- `neon.ts` declares Auth and Realtime (with its allowed origins); `neon deploy` applies it.
- `docs/design/canvas.json` — the design canvas index: board order, titles and the motion
  notes for each screen.
- `docs/design/*.dc.html` — the seven approved screens. These are mockups written for a
  design-canvas runtime: `{{holes}}`, `<sc-if>`, `<sc-for>` and `./support.js` are that
  runtime's syntax. Do not run them. Read them for exact markup, copy, colours, sizes and
  animation timings when changing a screen.
- `docs/architecture.md` — the full architecture doc, if present (exported by the owner).

## Rules that must never be broken

1. The draw is computed once by `draw_names`. Never implement live, one-at-a-time picking.
2. `assignments` is readable only by the giver (own row) and writable only by the SQL
   functions. Never add a policy, view or query that lets anyone else read it.
3. Every query goes through `asUser()` in `lib/db.ts`, which drops to `authenticated` or
   `anon` and sets the user for `auth.uid()`. `DATABASE_URL`'s owner role bypasses RLS, so
   never query the pool directly.
4. The draw page must not load the match on the server. The client calls
   `reveal_my_match` only when the hold completes.
5. `/g/[id]/match` redirects to `/g/[id]/draw` while `members.unwrapped_at` is null.
6. Realtime subscribes to `lobby_pulse` only, one group's row, sealed by the server after a
   membership check (`lib/realtime.ts`). Realtime refuses RLS tables, so never give it
   another table or add columns to `lobby_pulse` beyond the counter.
7. Claims live in `wish_claims`, never on `wishes`, so a wish's owner cannot see them.

## Routes

```
app/
  page.tsx                 landing, names in the hat; signed in: your groups (design: Landing)
  new/page.tsx             create group form + invite preview      (design: NewGroup)
  join/[code]/page.tsx     invite card, name + email            (design: Main)
  sign-in/page.tsx         email + code for returning members, ?next= back to /g/ or /join/
  auth/confirm/route.ts    magic link landing (session already set), then join/create
  api/auth/[...path]       Neon Auth proxy
  api/lobby/[id]/live      renews the lobby's sealed Realtime query
  g/[id]/layout.tsx        loads group + my member row, 404 if not a member
  g/[id]/page.tsx          lobby                                 (design: Lobby)
  g/[id]/draw/page.tsx     hold to unwrap                        (design: Draw)
  g/[id]/match/page.tsx    receiver, note, wishlist              (design: Match)
  g/[id]/wishlist/page.tsx my wishes + add drawer                (design: Wishlist)
  actions.ts               createGroup, requestMagicLink, drawNames, revealMatch,
                           addRule, removeRule, addWish, removeWish, saveNote,
                           toggleClaim, setGiftBought
components/                lobby-live.tsx, draw-names.tsx, house-rules.tsx, unwrap.tsx,
                           gift-tag.tsx, match-wishes.tsx, days-to-go.tsx,
                           wish-drawer.tsx, hat-of-names.tsx, icons.tsx (all artwork
                           from the designs: hat logo, tag string, no-entry, lock, info)
lib/db.ts                  pg pool + asUser(); the only way to Postgres
lib/auth/server.ts         Neon Auth (createNeonAuth), getSession, currentUserId, sendMagicLink
lib/realtime.ts            seals the lobby_pulse query
lib/my-groups.ts           the signed-in user's groups for the landing page; safeNext()
components/lobby-pulse.tsx subscribes to it and refreshes the lobby on change
proxy.ts                   Next 16's middleware: auth.middleware(), only /g/* is private;
                           signed-out /g/* goes to /sign-in?next=
```

Next 16 runs with `cacheComponents`: anything reading cookies, `params` or `searchParams`
must sit inside `<Suspense>` or the build fails. Read `node_modules/next/dist/docs/` first.

Magic links come from Neon Auth. Magic Link must be enabled on the branch (Console only)
and production needs custom SMTP; the shared sender doesn't guarantee links. Trusted
domains: `neon neon-auth domain list`.

Env: `neon deploy` writes `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_REALTIME_URL`,
`NEON_REALTIME_SECRET`. Also set `NEON_AUTH_COOKIE_SECRET` (32+ chars),
`NEXT_PUBLIC_NEON_REALTIME_URL` (same as `NEON_REALTIME_URL`) and `NEXT_PUBLIC_SITE_URL`.

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
- Join: the invite tag drops in once on load, 400ms ease-out, rotate -8deg to -3deg,
  opacity 0 to 1. Nothing animates while typing.
- Lobby: new member fades in with `translateY(8px)`, 250ms ease-out, 40ms stagger per
  batch. Counters swap digits with a short blur crossfade. Sonner toast on change
  ("Leo unwrapped theirs").
- Match: the name tag carries over from the Draw screen as a shared element (Motion
  `layoutId`); the tick draws in 150ms.
- Wishlist: Vaul drawer follows the finger, dismisses on velocity, settles in 500ms on
  `--ease-drawer`; the page behind scales to 0.96. A saved wish grows into the list by height.

These come from the sticky notes in `docs/design/canvas.json` (the design canvas index).
Three of them knowingly break the general rules above; they are design decisions, keep them:
the Join tag runs 400ms (over 300ms), the Lobby counter animates `filter: blur`, and a new
wish animates height. Reduced motion drops the movement and blur and keeps the fades.

## Build order

1. Database project, run the migrations, and write a SQL test that runs a draw for
   3, 8 and 40 members and checks: no self-match, every member gives once and
   receives once, exclusions respected.
2. Scaffold Next.js; auth with magic link, `auth/confirm`, middleware, `join_group`.
3. Create group and the lobby, static first, then Realtime.
4. `draw_names` on the organiser's button, with house rules (exclusions).
5. Draw screen: `unwrap.tsx` and `reveal_my_match`.
6. Match screen, wishes and claims.
7. Wishlist drawer with Vaul.
8. Motion pass against the rules above, then a reduced-motion pass.
9. Deploy to Vercel with the env above; add the domain to Neon Auth trusted domains and
   Realtime allowed origins.

Not in v1: reminder emails, multiple rounds per group, real currency handling.

## Edge cases

- Joining after the draw is refused by `join_group`; say so on the invite page.
- Fewer than 3 members: disable Draw names and show why.
- Impossible house rules: `draw_names` raises; ask the organiser to remove a rule.
- Drop-out after the draw: `remove_member`; their Santa unwraps again.
