-- The pieces of Supabase the later migrations rely on, rebuilt for Neon: the
-- `authenticated` and `anon` roles and `auth.uid()`. Run before 0001.

-- The app connects as the owner, which bypasses RLS, so lib/db.ts drops to one of
-- these roles inside every transaction. Neither can log in.
create role authenticated nologin;
create role anon nologin;
grant authenticated, anon to current_user with set true;

-- Same settings Supabase reads, so policies and tests are unchanged.
-- lib/db.ts sets request.jwt.claims from the Neon Auth session.
create schema auth;
create function auth.uid() returns uuid
language sql stable as $$
  select nullif(coalesce(
    current_setting('request.jwt.claim.sub', true),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  ), '')::uuid;
$$;

grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;

-- Supabase's default table grants; RLS and the revokes in 0002 narrow them.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
