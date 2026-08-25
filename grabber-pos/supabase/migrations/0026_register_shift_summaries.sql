create table if not exists shift_summaries (
  shift_id          uuid primary key references shifts(id) on delete cascade,
  org_id            uuid not null default current_org_id() references organizations(id) on delete cascade,
  opened_by_label   text not null default 'cashier',
  closed_by_label   text,
  note              text,
  sale_ids          jsonb not null default '[]'::jsonb,
  cash_sales_total  numeric(12,2) not null default 0,
  card_sales_total  numeric(12,2) not null default 0,
  void_total        numeric(12,2) not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists shift_summaries_org_idx on shift_summaries (org_id, created_at desc);

alter table shift_summaries enable row level security;

create policy shift_summaries_rw on shift_summaries
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create trigger shift_summaries_touch
  before update on shift_summaries
  for each row execute function set_updated_at();
