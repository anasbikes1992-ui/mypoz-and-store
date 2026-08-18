-- HQ platform config. No tenant RLS: only service_role reads/writes.
-- Local/demo still uses data/hq-platform.json when this table is absent.

create table if not exists platform_settings (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table platform_settings enable row level security;

revoke all on table platform_settings from public, anon, authenticated;
grant select, insert, update, delete on table platform_settings to service_role;

comment on table platform_settings is
  'MyPoz HQ platform-wide config. Service role only — never expose via Data API to anon.';
