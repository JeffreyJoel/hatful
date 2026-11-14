-- Better Auth's tables, run by the app itself. They live in their own schema because
-- Neon owns neon_auth and can drop it. Shape is Better Auth 1.7's default with uuid ids.
begin;

create schema app_auth;

create table app_auth."user" (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null unique,
  "emailVerified" boolean not null,
  image           text,
  "createdAt"     timestamptz not null default current_timestamp,
  "updatedAt"     timestamptz not null default current_timestamp
);

create table app_auth.session (
  id          uuid primary key default gen_random_uuid(),
  "expiresAt" timestamptz not null,
  token       text not null unique,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId"    uuid not null references app_auth."user"(id) on delete cascade
);
create index "session_userId_idx" on app_auth.session ("userId");

create table app_auth.account (
  id                      uuid primary key default gen_random_uuid(),
  "accountId"             text not null,
  "providerId"            text not null,
  "userId"                uuid not null references app_auth."user"(id) on delete cascade,
  "accessToken"           text,
  "refreshToken"          text,
  "idToken"               text,
  "accessTokenExpiresAt"  timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope                   text,
  password                text,
  "createdAt"             timestamptz not null default current_timestamp,
  "updatedAt"             timestamptz not null
);
create index "account_userId_idx" on app_auth.account ("userId");

create table app_auth.verification (
  id          uuid primary key default gen_random_uuid(),
  identifier  text not null,
  value       text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);
create index "verification_identifier_idx" on app_auth.verification (identifier);

create table app_auth."rateLimit" (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  count         integer not null,
  "lastRequest" bigint not null
);

-- Ids are kept so groups.owner_id, members.user_id and auth.uid() keep matching.
-- Sessions, accounts and pending codes are not copied; people sign in once more.
insert into app_auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
select id, name, email, "emailVerified", image, "createdAt", "updatedAt" from neon_auth."user"
on conflict (id) do nothing;

alter table groups  drop constraint groups_owner_id_fkey,
                    add constraint groups_owner_id_fkey
                      foreign key (owner_id) references app_auth."user"(id);
alter table members drop constraint members_user_id_fkey,
                    add constraint members_user_id_fkey
                      foreign key (user_id) references app_auth."user"(id);

-- Only the owner role (Better Auth's own pool) may touch auth data.
revoke all on schema app_auth from public, authenticated, anon;
revoke all on all tables in schema app_auth from public, authenticated, anon;

commit;
