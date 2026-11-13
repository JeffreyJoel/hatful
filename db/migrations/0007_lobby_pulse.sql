-- What the lobby subscribes to with Neon Realtime: one counter per group, bumped
-- whenever the lobby would look different. Realtime refuses tables with RLS, so this
-- holds no names or ids beyond the group's; the lobby re-reads members on a bump.
create table lobby_pulse (
  group_id uuid primary key references groups(id) on delete cascade,
  version  bigint not null default 0
);
-- Only Realtime (via a query sealed by the server) and the triggers below touch it.
revoke all on lobby_pulse from authenticated, anon;

create function bump_lobby() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'groups' and tg_op = 'INSERT' then
    insert into lobby_pulse (group_id) values (new.id);
  else
    update lobby_pulse set version = version + 1
     where group_id = coalesce(new.group_id, old.group_id);
  end if;
  return null;
end $$;

create function bump_lobby_group() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update lobby_pulse set version = version + 1 where group_id = new.id;
  return null;
end $$;

create trigger lobby_new_group after insert on groups
  for each row execute function bump_lobby();
create trigger lobby_drawn after update of status on groups
  for each row when (old.status is distinct from new.status) execute function bump_lobby_group();

create trigger lobby_members after insert or delete on members
  for each row execute function bump_lobby();
create trigger lobby_member_change after update of display_name, unwrapped_at on members
  for each row when (old.display_name is distinct from new.display_name
                  or old.unwrapped_at is distinct from new.unwrapped_at)
  execute function bump_lobby();

create trigger lobby_rules after insert or delete on exclusions
  for each row execute function bump_lobby();
