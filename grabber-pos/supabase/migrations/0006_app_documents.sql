-- GRABBER POS Studio — runtime persistence for the module stores.
--
-- 0005 introduced `app_collections` (one row per record) plus two purpose-built
-- tables. In the runtime wiring the generic pair below turned out to cover every
-- module store, so this migration consolidates onto two mechanisms:
--
--   app_collections  — keyed records   (delivery orders, jobs, bookings, hire
--                      purchase, purchase orders, play sessions, reload log,
--                      restaurant orders, and every simple CRUD collection)
--   app_documents    — single documents (business settings, white-label brand +
--                      licence config)
--
-- `stock_documents` from 0005 stays: stock operations are not a blob, they pair
-- a document header with real ledger movements via adjust_stock().

-- ---------------------------------------------------------------------------
-- Single-document config, one row per (organization, key).
-- ---------------------------------------------------------------------------
create table app_documents (
  org_id     uuid not null default current_org_id() references organizations(id) on delete cascade,
  key        text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (org_id, key)
);

alter table app_documents enable row level security;

create policy app_documents_rw on app_documents
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create trigger app_documents_touch
  before update on app_documents
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Superseded by the generic tables above.
--   app_settings      -> app_documents where key = 'settings'
--   restaurant_orders -> app_collections where collection = 'restaurant-orders'
-- Neither had shipped to a live project, so no data migration is required.
-- ---------------------------------------------------------------------------
drop table if exists app_settings;
drop table if exists restaurant_orders;

-- ---------------------------------------------------------------------------
-- Licence visibility for the reseller.
--
-- RLS confines each organization to its own licence row, which is correct for
-- tenants but hides everything from the platform operator. This view is owned by
-- the definer and readable only via the service-role key the super-admin console
-- uses server-side, giving one cross-client licence + usage roll-up.
-- ---------------------------------------------------------------------------
create or replace view reseller_licences
with (security_invoker = false) as
select
  o.id            as org_id,
  o.name          as org_name,
  o.created_at    as onboarded_at,
  d.data->'brand'                        as brand,
  d.data->'license'->>'plan'             as plan,
  nullif(d.data->'license'->>'expiry','') as expiry,
  (select count(*) from branches b where b.org_id = o.id) as branches,
  (select count(*) from profiles p where p.org_id = o.id) as users,
  (select count(*) from sales s where s.org_id = o.id)    as sales_count,
  (select coalesce(sum(s.total), 0) from sales s where s.org_id = o.id) as sales_total
from organizations o
left join app_documents d on d.org_id = o.id and d.key = 'tenant';

revoke all on reseller_licences from anon, authenticated;
