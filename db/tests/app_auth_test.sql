-- The app's own auth schema: its shape, the copied users, where the foreign keys
-- point, and that signed-in and anonymous roles cannot read it.
begin;
create extension if not exists pgtap;
select no_plan();

select has_table('app_auth', 'user', 'app_auth.user exists');
select has_table('app_auth', 'session', 'app_auth.session exists');
select has_table('app_auth', 'account', 'app_auth.account exists');
select has_table('app_auth', 'verification', 'app_auth.verification exists');
select has_table('app_auth', 'rateLimit', 'app_auth.rateLimit exists');
select col_type_is('app_auth', 'user', 'id', 'uuid', 'user ids are uuid');

select is((select count(*) from app_auth."user"),
          (select count(*) from neon_auth."user"), 'every user was copied');
select is((select count(*) from app_auth."user" a join neon_auth."user" n using (id, email)),
          (select count(*) from neon_auth."user"), 'ids and emails are unchanged');

select fk_ok('public', 'members', 'user_id', 'app_auth', 'user', 'id');
select fk_ok('public', 'groups', 'owner_id', 'app_auth', 'user', 'id');

set local role authenticated;
select throws_ok('select 1 from app_auth."user"', '42501');
select throws_ok('select 1 from app_auth.verification', '42501');
set local role anon;
select throws_ok('select 1 from app_auth."user"', '42501');
select throws_ok('select 1 from app_auth.verification', '42501');
reset role;

select * from finish();
rollback;
