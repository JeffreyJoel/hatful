-- draw_names for 3, 8 and 40 members: no self-match, everyone gives once and
-- receives once, exclusions respected. Each size runs many times since the draw is random.
begin;
create extension if not exists pgtap;
select no_plan();

create schema tests;

-- Creates n users, a group owned by the first, and joins everyone through join_group.
-- rules is a flat list of 1-based member index pairs that must not draw each other.
create function tests.make_group(n int, rules int[] default '{}') returns uuid
language plpgsql as $$
declare
  g    uuid;
  uids uuid[] := '{}';
  mids uuid[] := '{}';
  u    uuid;
  i    int;
begin
  for i in 1..n loop
    u := gen_random_uuid();
    insert into app_auth."user" (id, name, email, "emailVerified")
    values (u, u::text, u || '@test.local', true);
    uids := uids || u;
  end loop;

  insert into groups (name, owner_id, join_code)
  values ('Group of ' || n, uids[1], md5(random()::text))
  returning id into g;

  for i in 1..n loop
    perform set_config('request.jwt.claims', json_build_object('sub', uids[i])::text, true);
    perform join_group((select join_code from groups where id = g), 'Member ' || i);
    mids := mids || (select id from members where group_id = g and user_id = uids[i]);
  end loop;

  for i in 1..coalesce(array_length(rules, 1), 0) / 2 loop
    insert into exclusions (group_id, member_a, member_b)
    values (g, least(mids[rules[2*i-1]], mids[rules[2*i]]),
               greatest(mids[rules[2*i-1]], mids[rules[2*i]]));
  end loop;
  return g;
end $$;

-- Calls draw_names as the signed-in owner, the way the app will.
create function tests.draw_as_owner(g uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select owner_id from groups where id = g), 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  perform draw_names(g);
  perform set_config('role', 'none', true);
end $$;

-- Every rule broken by the draw for group g; empty means the draw is valid.
create function tests.draw_problems(g uuid) returns text[]
language sql as $$
  select array_remove(array[
    case when (select status from groups where id = g) <> 'drawn'
      then 'group not marked drawn' end,
    case when (select count(*) from assignments where group_id = g)
           <> (select count(*) from members where group_id = g)
      then 'assignment count differs from member count' end,
    case when exists (select 1 from assignments where group_id = g and giver_id = receiver_id)
      then 'someone drew themselves' end,
    case when exists (select 1 from members m where m.group_id = g
                      and (select count(*) from assignments a where a.giver_id = m.id) <> 1)
      then 'a member does not give exactly once' end,
    case when exists (select 1 from members m where m.group_id = g
                      and (select count(*) from assignments a where a.receiver_id = m.id) <> 1)
      then 'a member does not receive exactly once' end,
    case when exists (select 1 from assignments a
                      left join members gm on gm.id = a.giver_id and gm.group_id = g
                      left join members rm on rm.id = a.receiver_id and rm.group_id = g
                      where a.group_id = g and (gm.id is null or rm.id is null))
      then 'assignment points outside the group' end,
    case when exists (select 1 from assignments a
                      join exclusions e on e.group_id = g
                       and e.member_a = least(a.giver_id, a.receiver_id)
                       and e.member_b = greatest(a.giver_id, a.receiver_id)
                      where a.group_id = g)
      then 'an exclusion was broken' end
  ], null);
$$;

-- Runs `trials` fresh draws and returns every distinct problem seen.
create function tests.trials(n int, rules int[], trials int) returns text[]
language plpgsql as $$
declare g uuid; found text[] := '{}'; i int;
begin
  for i in 1..trials loop
    g := tests.make_group(n, rules);
    perform tests.draw_as_owner(g);
    found := found || tests.draw_problems(g);
  end loop;
  return array(select distinct unnest(found) order by 1);
end $$;

-- The three sizes from the build order.
select is(tests.trials(3, '{}', 50), '{}', '3 members, 50 draws: all valid');
select is(tests.trials(8, '{1,2, 3,4, 5,6}', 50), '{}',
          '8 members, 3 house rules, 50 draws: all valid');
select is(tests.trials(40, '{1,2, 3,4, 5,6, 7,8, 9,10, 1,11, 12,40, 20,21}', 20), '{}',
          '40 members, 8 house rules, 20 draws: all valid');

-- A tight but satisfiable rule: member 1 may only sit next to 7 or 8 in the loop.
select is(tests.trials(8, '{1,2, 1,3, 1,4, 1,5, 1,6}', 20), '{}',
          '8 members, one person excluded from five others: all valid');

-- Refusals.
select throws_ok(
  $$ select tests.draw_as_owner(tests.make_group(3, '{1,2}')) $$,
  'These house rules make a draw impossible',
  '3 members with any rule cannot form a loop, so the draw refuses');

select throws_ok(
  $$ select tests.draw_as_owner(tests.make_group(2)) $$,
  'A draw needs at least 3 people',
  'fewer than 3 members is refused');

create temp table t_group as select tests.make_group(5) as id;
select lives_ok($$ select tests.draw_as_owner((select id from t_group)) $$, 'first draw works');
select throws_ok(
  $$ select tests.draw_as_owner((select id from t_group)) $$,
  'Not allowed, or names are already drawn',
  'drawing a second time is refused');
select is((select count(*)::int from assignments where group_id = (select id from t_group)), 5,
          'the refused second draw left the original 5 assignments untouched');

create temp table t_open as select tests.make_group(4) as id;
select throws_ok(
  $$
    select set_config('request.jwt.claims', json_build_object('sub',
      (select user_id from members where group_id = (select id from t_open)
       and user_id <> (select owner_id from groups where id = (select id from t_open)) limit 1))::text, true);
    select draw_names((select id from t_open));
  $$,
  'Not allowed, or names are already drawn',
  'a member who is not the organiser cannot draw');

select * from finish();
rollback;
