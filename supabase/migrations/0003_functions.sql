-- Every sensitive write goes through one of these four functions.

-- Add the caller to an open group by invite code.
create function join_group(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  select id into g from groups where join_code = p_code and status = 'open';
  if g is null then raise exception 'This invite is closed or does not exist'; end if;

  insert into members (group_id, user_id, display_name)
  values (g, auth.uid(), p_name)
  on conflict (group_id, user_id) do update set display_name = excluded.display_name;
  return g;
end $$;

-- Build one loop through all members and close the group, atomically.
-- ids[i] gifts ids[i % n + 1]; the last wraps round to the first.
create function draw_names(g uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ids     uuid[];
  n       int;
  attempt int := 0;
  ok      boolean;
begin
  perform 1 from groups
   where id = g and owner_id = auth.uid() and status = 'open'
     for update;                                  -- blocks a double click
  if not found then raise exception 'Not allowed, or names are already drawn'; end if;

  select count(*) into n from members where group_id = g;
  if n < 3 then raise exception 'A draw needs at least 3 people'; end if;

  loop
    attempt := attempt + 1;
    if attempt > 200 then
      raise exception 'These house rules make a draw impossible';
    end if;

    select array_agg(id order by random()) into ids
      from members where group_id = g;

    select not exists (
      select 1
        from generate_series(1, n) i
        join exclusions e
          on e.group_id = g
         and e.member_a = least(ids[i], ids[i % n + 1])
         and e.member_b = greatest(ids[i], ids[i % n + 1])
    ) into ok;
    exit when ok;
  end loop;

  insert into assignments (group_id, giver_id, receiver_id)
  select g, ids[i], ids[i % n + 1] from generate_series(1, n) i;

  update groups set status = 'drawn', drawn_at = now() where id = g;
end $$;

-- Return the caller's receiver and record that they unwrapped. Safe to call again.
create function reveal_my_match(g uuid)
returns table (receiver_id uuid, receiver_name text, receiver_note text)
language plpgsql security definer set search_path = public as $$
declare me uuid;
begin
  select m.id into me from members m where m.group_id = g and m.user_id = auth.uid();
  if me is null then raise exception 'You are not in this group'; end if;

  update members set unwrapped_at = coalesce(unwrapped_at, now()) where id = me;

  return query
    select m.id, m.display_name, m.note
      from assignments a
      join members m on m.id = a.receiver_id
     where a.group_id = g and a.giver_id = me;
end $$;

-- Organiser removes someone. After a draw, their Santa inherits their receiver,
-- so every other match stays intact.
create function remove_member(m uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g uuid; r uuid;
begin
  select group_id into g from members where id = m;
  perform 1 from groups where id = g and owner_id = auth.uid() for update;
  if not found then raise exception 'Only the organiser can remove someone'; end if;

  select receiver_id into r from assignments where giver_id = m;
  if r is not null then
    delete from assignments where giver_id = m;
    update members set unwrapped_at = null          -- their Santa gets a fresh reveal
     where id = (select giver_id from assignments where receiver_id = m);
    update assignments set receiver_id = r where receiver_id = m;
  end if;

  delete from members where id = m;
end $$;

revoke execute on function join_group, draw_names, reveal_my_match, remove_member from public, anon;
grant  execute on function join_group, draw_names, reveal_my_match, remove_member to authenticated;
