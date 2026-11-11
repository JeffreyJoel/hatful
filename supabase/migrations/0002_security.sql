-- Row level security. A giver can read exactly one assignment row, their own.
-- Nobody else can, including the organiser. No client writes to assignments.

alter table groups       enable row level security;
alter table members      enable row level security;
alter table exclusions   enable row level security;
alter table assignments  enable row level security;
alter table wishes       enable row level security;
alter table wish_claims  enable row level security;

-- Helpers run as definer so policies on members do not recurse.
create function is_member(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where group_id = g and user_id = auth.uid());
$$;

create function my_member_id(g uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from members where group_id = g and user_id = auth.uid();
$$;

create function is_open_owner(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups
                 where id = g and owner_id = auth.uid() and status = 'open');
$$;

-- groups
create policy groups_read   on groups for select using (is_member(id) or owner_id = auth.uid());
create policy groups_create on groups for insert with check (owner_id = auth.uid());
create policy groups_edit   on groups for update
  using (owner_id = auth.uid() and status = 'open')
  with check (owner_id = auth.uid() and status = 'open');  -- cannot flip to 'drawn' by hand

-- members
create policy members_read on members for select using (is_member(group_id));
create policy members_edit on members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update, delete on members from authenticated;
grant  update (display_name, note) on members to authenticated;

-- exclusions
create policy exclusions_read  on exclusions for select using (is_member(group_id));
create policy exclusions_write on exclusions for all
  using (is_open_owner(group_id)) with check (is_open_owner(group_id));

-- assignments: one read policy, no write policies
create policy assignments_read on assignments for select
  using (giver_id = my_member_id(group_id));
revoke insert, update, delete on assignments from authenticated;

-- wishes: the owner, and the one giver assigned to them.
-- The subquery is itself filtered by assignments_read, so it only matches my receiver.
create policy wishes_read on wishes for select using (
  member_id in (select id from members where user_id = auth.uid())
  or exists (select 1 from assignments a where a.receiver_id = wishes.member_id)
);
create policy wishes_write on wishes for all
  using (member_id in (select id from members where user_id = auth.uid()))
  with check (member_id in (select id from members where user_id = auth.uid()));

-- wish_claims
create policy claims_all on wish_claims for all
  using (giver_id in (select id from members where user_id = auth.uid()))
  with check (
    giver_id in (select id from members where user_id = auth.uid())
    and exists (select 1 from wishes w
                join assignments a on a.receiver_id = w.member_id
                where w.id = wish_id and a.giver_id = wish_claims.giver_id)
  );
