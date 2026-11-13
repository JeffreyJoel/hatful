-- "Mark gift as bought" on the Match screen. It lives on the giver's own assignment
-- row, which only the giver can read, so the receiver never learns of it.
alter table assignments add column bought_at timestamptz;

create function set_gift_bought(g uuid, p_bought boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid;
begin
  select id into me from members where group_id = g and user_id = auth.uid();
  if me is null then raise exception 'You are not in this group'; end if;

  update assignments
     set bought_at = case when p_bought then coalesce(bought_at, now()) end
   where group_id = g and giver_id = me;
end $$;

revoke execute on function set_gift_bought from public, anon;
grant  execute on function set_gift_bought to authenticated;

-- A Santa who inherits a new receiver has not bought for them yet.
create or replace function remove_member(m uuid) returns void
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
    update assignments set receiver_id = r, bought_at = null where receiver_id = m;
  end if;

  delete from members where id = m;
end $$;
