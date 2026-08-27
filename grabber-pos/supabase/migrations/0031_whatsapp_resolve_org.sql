-- Resolve Meta phone_number_id → owning merchant org (never HQ by default).
-- Soft-launch: GRABBER.LK (+94 77 959 2288 / 101779492851300) belongs to anaz-store only.

create or replace function public.whatsapp_resolve_org(p_phone_number_id text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.org_id
  from public.app_documents d
  where d.key = 'whatsapp'
    and nullif(btrim(d.data->>'phoneNumberId'), '') is not null
    and btrim(d.data->>'phoneNumberId') = btrim(p_phone_number_id)
  limit 1;
$$;

revoke all on function public.whatsapp_resolve_org(text) from public;
grant execute on function public.whatsapp_resolve_org(text) to service_role;
grant execute on function public.whatsapp_resolve_org(text) to authenticated;

comment on function public.whatsapp_resolve_org(text) is
  'Maps WhatsApp Cloud phone_number_id to the org that owns that line in app_documents.whatsapp';
