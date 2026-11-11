-- Hatful schema. Run in order: 0001, 0002, 0003.

create table groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  owner_id     uuid not null references auth.users(id),
  join_code    text not null unique,
  budget_cents int,
  currency     text not null default 'USD',
  swap_date    date,
  status       text not null default 'open' check (status in ('open','drawn')),
  drawn_at     timestamptz,
  created_at   timestamptz not null default now()
);

create table members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups(id) on delete cascade,
  user_id      uuid not null references auth.users(id),
  display_name text not null,
  note         text,                 -- "No scented candles, please"
  unwrapped_at timestamptz,          -- set by reveal_my_match only
  joined_at    timestamptz not null default now(),
  unique (group_id, user_id)
);

create table exclusions (            -- pairs that must not draw each other
  group_id uuid not null references groups(id) on delete cascade,
  member_a uuid not null references members(id) on delete cascade,
  member_b uuid not null references members(id) on delete cascade,
  primary key (group_id, member_a, member_b),
  check (member_a < member_b)        -- store each pair once
);

create table assignments (
  group_id    uuid not null references groups(id) on delete cascade,
  giver_id    uuid not null references members(id) on delete cascade,
  receiver_id uuid not null references members(id) on delete cascade,
  primary key (group_id, giver_id),
  unique (group_id, receiver_id),
  check (giver_id <> receiver_id)
);

create table wishes (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  title       text not null,
  url         text,
  price_cents int,
  note        text,
  created_at  timestamptz not null default now()
);

create table wish_claims (           -- "I'm getting this", visible to the giver only
  wish_id  uuid primary key references wishes(id) on delete cascade,
  giver_id uuid not null references members(id) on delete cascade
);

create index on members (user_id);
create index on wishes (member_id);

alter publication supabase_realtime add table members;
