-- What the invite card shows, for anyone holding the code. Non-members cannot read
-- groups under RLS, so this returns only the card's fields and never ids or emails.
create function group_invite(p_code text)
returns table (name text, organiser text, member_count int, budget_cents int,
               currency text, swap_date date, is_open boolean)
language sql stable security definer set search_path = public as $$
  select g.name,
         (select display_name from members where group_id = g.id and user_id = g.owner_id),
         (select count(*)::int from members where group_id = g.id),
         g.budget_cents, g.currency, g.swap_date, g.status = 'open'
    from groups g
   where g.join_code = p_code;
$$;

revoke execute on function group_invite from public;
grant  execute on function group_invite to anon, authenticated;
