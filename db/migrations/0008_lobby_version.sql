-- The pulse version a lobby rendered with, so the live subscription can tell whether
-- anything changed in between. Members only; everyone else gets null.
create function lobby_version(g uuid) returns text
language sql stable security definer set search_path = public as $$
  select version::text from lobby_pulse where group_id = g and is_member(g);
$$;

revoke execute on function lobby_version from public, anon;
grant  execute on function lobby_version to authenticated;
