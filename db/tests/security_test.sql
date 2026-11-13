-- RLS and the SQL functions, run as signed-in users. Covers who can read an
-- assignment, who can write one, reveal, wishes and claims, joining late, and removal.
begin;
create extension if not exists pgtap;
select no_plan();

create schema tests;
grant usage on schema tests to authenticated, anon;

-- People are referred to by name: amara (organiser), tunde, priya, leo, sofia, and
-- outsider, who is signed in but not in the group.
create table tests.people (name text primary key, uid uuid not null);
grant select on tests.people to authenticated;

insert into tests.people
select n, gen_random_uuid() from unnest(array['amara','tunde','priya','leo','sofia','outsider']) n;
insert into neon_auth."user" (id, name, email, "emailVerified")
select uid, name, name || '@test.local', true from tests.people;

create function tests.uid(who text) returns uuid
language sql stable as $$ select uid from tests.people where name = who $$;

-- Signs in as `who` for the rest of the transaction, as PostgREST would.
create function tests.login(who text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', tests.uid(who), 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function tests.logout() returns void
language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

grant execute on all functions in schema tests to authenticated, anon;

insert into groups (id, name, owner_id, join_code)
values ('00000000-0000-0000-0000-00000000000a', 'Sunday Dinner Club', tests.uid('amara'), 'JOINME');

select tests.login('amara');  select join_group('JOINME', 'Amara');
select tests.login('tunde');  select join_group('JOINME', 'Tunde');
select tests.login('priya');  select join_group('JOINME', 'Priya');
select tests.login('leo');    select join_group('JOINME', 'Leo');
select tests.login('sofia');  select join_group('JOINME', 'Sofia');
select tests.logout();

create view tests.mem as
  select p.name, m.id from members m join tests.people p on p.uid = m.user_id;
grant select on tests.mem to authenticated;

-- Before the draw.
select tests.login('tunde');
select is((select count(*)::int from members), 5, 'a member sees all 5 members of their group');
select throws_ok($$ select * from reveal_my_match('00000000-0000-0000-0000-00000000000a') $$,
                 'Names have not been drawn yet', 'reveal before the draw is refused');
select tests.logout();
select is((select unwrapped_at from members m join tests.mem t using (id) where t.name = 'tunde'), null,
          'reveal before the draw does not mark the member as unwrapped');

select set_config('role', 'anon', true);
select results_eq($$ select name, organiser, member_count, is_open from group_invite('JOINME') $$,
                  $$ values ('Sunday Dinner Club', 'Amara', 5, true) $$,
                  'a signed-out visitor with the code sees the invite card');
select is_empty($$ select * from group_invite('WRONG') $$, 'a wrong code shows nothing');
select throws_ok($$ select * from groups $$, '42501', NULL, 'but they still cannot read groups');
select tests.logout();

select tests.login('outsider');
select is((select count(*)::int from groups), 0, 'an outsider cannot read the group');
select is((select count(*)::int from members), 0, 'an outsider cannot read its members');

select tests.login('tunde');
select is_empty($$ update groups set status = 'drawn' returning id $$,
                'a member cannot flip the group to drawn');
select tests.login('amara');
select throws_ok($$ update groups set status = 'drawn' $$, '42501', null,
                 'the organiser cannot flip the group to drawn by hand');
select throws_ok($$ insert into assignments
                    select '00000000-0000-0000-0000-00000000000a', a.id, b.id
                    from tests.mem a, tests.mem b where a.name = 'amara' and b.name = 'tunde' $$,
                 '42501', null, 'the organiser cannot write an assignment directly');

select draw_names('00000000-0000-0000-0000-00000000000a');
select tests.logout();

-- After the draw: each giver sees exactly their own row, nobody sees anyone else's.
select tests.login('amara');
select is((select count(*)::int from assignments), 1, 'the organiser sees only their own assignment');
select is((select giver_id from assignments), (select id from tests.mem where name = 'amara'),
          'and it is the one where they are the giver');

select tests.login('tunde');
select is((select count(*)::int from assignments), 1, 'a member sees only their own assignment');
select is((select count(*)::int from assignments where giver_id <> (select id from tests.mem where name = 'tunde')),
          0, 'a member cannot see anyone else''s assignment');
select is((select count(*)::int from assignments where receiver_id = (select id from tests.mem where name = 'tunde')),
          0, 'a member cannot find out who their Santa is');
select throws_ok($$ update assignments set receiver_id = giver_id $$, '42501', null,
                 'a member cannot update assignments');
select throws_ok($$ delete from assignments $$, '42501', null, 'a member cannot delete assignments');

select tests.login('outsider');
select is((select count(*)::int from assignments), 0, 'an outsider sees no assignments');

select tests.login('outsider');
select throws_ok($$ select join_group('JOINME', 'Late') $$, 'This invite is closed or does not exist',
                 'joining after the draw is refused');
select is((select is_open from group_invite('JOINME')), false, 'the invite card shows it is closed');
select throws_ok($$ select draw_names('00000000-0000-0000-0000-00000000000a') $$,
                 'Not allowed, or names are already drawn', 'an outsider cannot draw');
select throws_ok($$ select * from reveal_my_match('00000000-0000-0000-0000-00000000000a') $$,
                 'You are not in this group', 'an outsider cannot reveal');

-- Members cannot set their own unwrapped_at; only reveal_my_match does.
select tests.login('tunde');
select throws_ok($$ update members set unwrapped_at = now() $$, '42501', null,
                 'a member cannot set unwrapped_at directly');
select lives_ok($$ update members set note = 'No scented candles, please' $$, 'a member can edit their own note');

-- Reveal.
select tests.logout();
create temp table t_truth as
  select g.name giver, r.name receiver from assignments a
  join tests.mem g on g.id = a.giver_id join tests.mem r on r.id = a.receiver_id;
grant select on t_truth to authenticated;

select tests.login('tunde');
select is((select receiver_name from reveal_my_match('00000000-0000-0000-0000-00000000000a')),
          (select initcap(receiver) from t_truth where giver = 'tunde'),
          'reveal returns the caller''s own receiver');
select isnt((select unwrapped_at from members where user_id = tests.uid('tunde')), null,
            'reveal marks the caller as unwrapped');
select is((select count(*)::int from members where unwrapped_at is not null), 1,
          'and nobody else');

-- Wishes and claims. Tunde's receiver adds a wish; the person who is not their Santa adds one too.
select tests.logout();
create temp table t_who as select
  (select receiver from t_truth where giver = 'tunde') as tunde_receiver,
  (select name from tests.mem where name not in ('tunde', (select receiver from t_truth where giver = 'tunde'))
   order by name limit 1) as other;
grant select on t_who to authenticated;

select tests.login((select tunde_receiver from t_who));
select lives_ok($$ insert into wishes (member_id, title)
                   select id, 'Pour-over coffee kit' from tests.mem where name = (select tunde_receiver from t_who) $$,
                'a member can add a wish to their own list');
select throws_ok($$ insert into wishes (member_id, title)
                    select id, 'Forged' from tests.mem where name = (select other from t_who) $$,
                 '42501', null, 'a member cannot add a wish to someone else''s list');

select tests.login('tunde');
select is((select count(*)::int from wishes), 1, 'the giver sees their receiver''s wish');
select lives_ok($$ insert into wish_claims (wish_id, giver_id)
                   select w.id, m.id from wishes w, tests.mem m where m.name = 'tunde' $$,
                'the giver can claim their receiver''s wish');

select tests.login((select other from t_who));
select is((select count(*)::int from wishes
           where member_id = (select id from tests.mem where name = (select tunde_receiver from t_who))),
          0, 'another member cannot see wishes of someone they are not gifting');
select is((select count(*)::int from wish_claims), 0, 'another member cannot see the claim');

select tests.login((select tunde_receiver from t_who));
select is((select count(*)::int from wish_claims), 0, 'the wish owner cannot see that it was claimed');

select tests.logout();
create temp table t_wish as select id from wishes;
grant select on t_wish to authenticated;
select tests.login((select other from t_who));
select throws_ok($$ insert into wish_claims (wish_id, giver_id)
                    select w.id, m.id from t_wish w, tests.mem m where m.name = (select other from t_who) $$,
                 null, null, 'a member cannot claim a wish of someone they are not gifting');

-- remove_member after the draw: the leaver's Santa inherits the leaver's receiver.
select tests.logout();
create temp table t_before as select * from t_truth;
create temp table t_leaver as select receiver as name from t_truth where giver = 'tunde';
grant select on t_leaver, t_before to authenticated;

select tests.login('tunde');
select throws_ok($$ select remove_member((select id from tests.mem where name = 'leo')) $$,
                 'Only the organiser can remove someone', 'a member cannot remove someone');

select tests.login('amara');
select lives_ok($$ select remove_member((select id from tests.mem where name = (select name from t_leaver))) $$,
                'the organiser can remove a member after the draw');
select tests.logout();

select is((select r.name from assignments a join tests.mem g on g.id = a.giver_id
           join tests.mem r on r.id = a.receiver_id where g.name = 'tunde'),
          (select receiver from t_before where giver = (select name from t_leaver)),
          'the leaver''s Santa now gifts the leaver''s receiver');
select is((select unwrapped_at from members where user_id = tests.uid('tunde')), null,
          'and their Santa unwraps again');
select is((select count(*)::int from assignments where group_id = '00000000-0000-0000-0000-00000000000a'), 4,
          '4 assignments remain for 4 members');
select is((select count(*)::int from assignments a join t_before b
           on b.giver = (select name from tests.mem where id = a.giver_id)
          and b.receiver = (select name from tests.mem where id = a.receiver_id)), 3,
          'every other match is unchanged');

select * from finish();
rollback;
