-- lobby_pulse: bumps when the lobby would change, stays still otherwise, and is
-- unreadable to signed-in users (Realtime reads it through a server-sealed query).
begin;
create extension if not exists pgtap;
select no_plan();

create temp table people (name text primary key, uid uuid not null default gen_random_uuid());
insert into people (name) values ('amara'), ('tunde'), ('priya');
insert into app_auth."user" (id, name, email, "emailVerified")
select uid, name, name || '@test.local', true from people;

create function pg_temp.login(who text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select uid from people where name = who))::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin perform set_config('role', 'none', true); end $$;
create function pg_temp.v() returns bigint language sql as $$
  select version from lobby_pulse where group_id = '00000000-0000-0000-0000-0000000000b1' $$;

insert into groups (id, name, owner_id, join_code)
values ('00000000-0000-0000-0000-0000000000b1', 'Pulse', (select uid from people where name = 'amara'), 'PULSE');
select is(pg_temp.v(), 0::bigint, 'a new group gets a pulse row at 0');

grant select on people to authenticated;
select pg_temp.login('amara');  select join_group('PULSE', 'Amara');  select pg_temp.logout();
select pg_temp.login('tunde');  select join_group('PULSE', 'Tunde');  select pg_temp.logout();
select pg_temp.login('priya');  select join_group('PULSE', 'Priya');  select pg_temp.logout();
select is(pg_temp.v(), 3::bigint, 'each join bumps the pulse');

select pg_temp.login('tunde');
select throws_ok($$ select * from lobby_pulse $$, '42501', null, 'a signed-in user cannot read lobby_pulse');
update members set note = 'No candles' where user_id = auth.uid();
select pg_temp.logout();
select is(pg_temp.v(), 3::bigint, 'changing a note does not bump the pulse');

select pg_temp.login('amara');  select draw_names('00000000-0000-0000-0000-0000000000b1');  select pg_temp.logout();
select is(pg_temp.v(), 4::bigint, 'the draw bumps the pulse once');

select pg_temp.login('tunde');
select * from reveal_my_match('00000000-0000-0000-0000-0000000000b1');
select * from reveal_my_match('00000000-0000-0000-0000-0000000000b1');
select pg_temp.logout();
select is(pg_temp.v(), 5::bigint, 'unwrapping bumps the pulse, and unwrapping again does not');

select pg_temp.login('tunde');
select is(lobby_version('00000000-0000-0000-0000-0000000000b1'), '5', 'a member reads the lobby version');
select pg_temp.logout();
insert into people (name) values ('outsider');
insert into app_auth."user" (id, name, email, "emailVerified")
select uid, name, name || '@test.local', true from people where name = 'outsider';
select pg_temp.login('outsider');
select is(lobby_version('00000000-0000-0000-0000-0000000000b1'), null, 'an outsider gets no version');
select pg_temp.logout();

select * from finish();
rollback;
