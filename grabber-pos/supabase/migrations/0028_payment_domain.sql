-- 0028_payment_domain.sql
-- Canonical gateway payment lifecycle (intents + idempotent events).
-- Sale tender rows remain in payments (linked to sales via create_sale_internal).

do $$ begin
  create type public.payment_intent_status as enum (
    'created',
    'pending',
    'authorized',
    'paid',
    'failed',
    'cancelled',
    'refunded',
    'partially_refunded'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.payment_intents (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  branch_id       uuid references public.branches(id) on delete set null,
  reference       text not null,
  provider        text not null,
  currency        text not null default 'LKR',
  amount_minor    integer not null check (amount_minor >= 0),
  status          public.payment_intent_status not null default 'pending',
  sale_id         uuid references public.sales(id) on delete set null,
  client_uuid     uuid,
  description     text,
  customer_name   text,
  customer_email  text,
  provider_ref    text,
  source          text not null default 'storefront'
                  check (source in ('storefront', 'pos', 'licence', 'other')),
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, reference)
);

create index if not exists payment_intents_org_status_idx
  on public.payment_intents (org_id, status, created_at desc);
create index if not exists payment_intents_client_uuid_idx
  on public.payment_intents (org_id, client_uuid)
  where client_uuid is not null;

create table if not exists public.payment_events (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid references public.organizations(id) on delete cascade,
  payment_intent_id     uuid references public.payment_intents(id) on delete set null,
  provider              text not null,
  provider_event_id     text not null,
  provider_transaction_id text,
  status                text not null,
  amount_minor          integer,
  currency              text,
  payload               jsonb not null default '{}'::jsonb,
  received_at           timestamptz not null default now(),
  processed_at          timestamptz,
  unique (provider, provider_event_id)
);

create index if not exists payment_events_intent_idx
  on public.payment_events (payment_intent_id, received_at desc);

alter table public.payment_intents enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists payment_intents_read on public.payment_intents;
create policy payment_intents_read on public.payment_intents
  for select using (org_id = public.current_org_id());

drop policy if exists payment_events_read on public.payment_events;
create policy payment_events_read on public.payment_events
  for select using (
    org_id = public.current_org_id()
    or (
      payment_intent_id is not null
      and exists (
        select 1 from public.payment_intents i
        where i.id = payment_intent_id and i.org_id = public.current_org_id()
      )
    )
  );

-- Mutations via service role / DEFINER helpers only (no tenant INSERT/UPDATE/DELETE policies).

create or replace function public.touch_payment_intent_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists payment_intents_touch on public.payment_intents;
create trigger payment_intents_touch
  before update on public.payment_intents
  for each row execute function public.touch_payment_intent_updated_at();

-- Atomic claim of a webhook event. Returns true if this caller should process.
create or replace function public.claim_payment_event(
  p_provider text,
  p_provider_event_id text,
  p_org_id uuid,
  p_payment_intent_id uuid,
  p_status text,
  p_amount_minor integer default null,
  p_currency text default null,
  p_provider_transaction_id text default null,
  p_payload jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  insert into public.payment_events (
    org_id, payment_intent_id, provider, provider_event_id,
    provider_transaction_id, status, amount_minor, currency, payload
  ) values (
    p_org_id, p_payment_intent_id, p_provider, p_provider_event_id,
    p_provider_transaction_id, p_status, p_amount_minor, p_currency,
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (provider, provider_event_id) do nothing
  returning id into v_id;

  return v_id is not null;
end;
$$;

revoke all on function public.claim_payment_event(
  text, text, uuid, uuid, text, integer, text, text, jsonb
) from public;
grant execute on function public.claim_payment_event(
  text, text, uuid, uuid, text, integer, text, text, jsonb
) to service_role;

create or replace function public.mark_payment_event_processed(
  p_provider text,
  p_provider_event_id text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.payment_events
     set processed_at = now()
   where provider = p_provider
     and provider_event_id = p_provider_event_id
     and processed_at is null;
end;
$$;

revoke all on function public.mark_payment_event_processed(text, text) from public;
grant execute on function public.mark_payment_event_processed(text, text) to service_role;
