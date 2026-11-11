-- reveal_my_match only marks a member unwrapped once names are drawn. Before this,
-- an early call set unwrapped_at with nothing to show, so /match skipped the unwrap.
create or replace function reveal_my_match(g uuid)
returns table (receiver_id uuid, receiver_name text, receiver_note text)
language plpgsql security definer set search_path = public as $$
declare me uuid;
begin
  select m.id into me from members m where m.group_id = g and m.user_id = auth.uid();
  if me is null then raise exception 'You are not in this group'; end if;

  if not exists (select 1 from groups where id = g and status = 'drawn') then
    raise exception 'Names have not been drawn yet';
  end if;

  update members set unwrapped_at = coalesce(unwrapped_at, now()) where id = me;

  return query
    select m.id, m.display_name, m.note
      from assignments a
      join members m on m.id = a.receiver_id
     where a.group_id = g and a.giver_id = me;
end $$;
